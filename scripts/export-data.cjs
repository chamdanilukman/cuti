#!/usr/bin/env node
/**
 * Export semua data dari Supabase lama ke file JSON
 * Usage: node scripts/export-data.js
 *
 * Output: backup/data-export.json
 * - user_nips, leave_requests (full data)
 * - admin_users (termasuk password_hash bcrypt)
 * - work_calendar_days
 */
const fs = require('fs');
const path = require('path');

// Try to load .env from project root
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (_) {}

const supabaseModule = require('@supabase/supabase-js');
const { createClient } = supabaseModule;

// Untuk export, service_role bypass RLS (anon tidak bisa baca admin_users)
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error('ERROR: VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set di .env');
  console.error('Tambahkan baris ini di .env (Settings -> API -> service_role):');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  process.exit(1);
}

const supabase = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select('*').limit(0);
  if (error && error.code === '42P01') return false;
  return true;
}

async function exportTable(tableName, pageSize = 1000) {
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      // RLS-blocked tables: try RPC for admin_users
      if (tableName === 'admin_users' && (error.code === '42501' || error.message.includes('permission denied'))) {
        throw new Error(`RLS-blocked. Untuk admin_users, gunakan service_role key:\n  $env:NEW_VITE_SUPABASE_SERVICE_KEY="..."  (untuk export project baru)\nAtau setup project dengan service_role key di .env export.`);
      }
      throw new Error(`Export ${tableName} gagal di range ${from}: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    from += pageSize;
    hasMore = data.length === pageSize;
  }

  return allData;
}

async function main() {
  const outDir = path.join(__dirname, '..', 'backup');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`Connecting to: ${URL}\n`);

  // Verify tables exist
  const tables = ['admin_users', 'work_calendar_days', 'user_nips', 'leave_requests'];
  const existence = {};
  for (const t of tables) {
    existence[t] = await tableExists(t);
    console.log(`  ${t}: ${existence[t] ? 'EXISTS' : 'NOT FOUND'}`);
  }

  const result = {
    exported_at: new Date().toISOString(),
    source_url: URL,
    tables: {},
  };

  for (const table of tables) {
    if (!existence[table]) {
      console.log(`\n  SKIP ${table} (tidak ada di project sumber)`);
      result.tables[table] = [];
      continue;
    }
    process.stdout.write(`\nExporting ${table}... `);
    const rows = await exportTable(table);
    console.log(`${rows.length} rows`);
    result.tables[table] = rows;
  }

  // KEEP password_hash (bcrypt) — project sudah pakai bcrypt
  // Tidak di-strip agar admin bisa langsung login di project baru

  const outFile = path.join(outDir, 'data-export.json');
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));

  console.log(`\n=== EXPORT SELESAI ===`);
  console.log(`File: ${outFile}`);
  console.log(`Size: ${(fs.statSync(outFile).size / 1024).toFixed(2)} KB`);
  console.log(`admin_users: ${result.tables.admin_users.length} rows`);
  console.log(`work_calendar_days: ${result.tables.work_calendar_days.length} rows`);
  console.log(`leave_requests: ${result.tables.leave_requests.length} rows`);
  console.log(`\nNext: set env project BARU, lalu jalankan:`);
  console.log(`  $env:NEW_VITE_SUPABASE_URL="..."`);
  console.log(`  $env:NEW_VITE_SUPABASE_SERVICE_KEY="..."`);
  console.log(`  node scripts/import-data.js`);
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
