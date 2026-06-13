#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const supabaseModule = require('@supabase/supabase-js');
const { createClient } = supabaseModule;

const args = process.argv.slice(2);
const CLEAN = args.includes('--clean');
const DRY_RUN = args.includes('--dry-run');

const NEW_URL = process.env.NEW_VITE_SUPABASE_URL;
const NEW_KEY = process.env.NEW_VITE_SUPABASE_SERVICE_KEY || process.env.NEW_VITE_SUPABASE_ANON_KEY;

if (!NEW_URL || !NEW_KEY) {
  console.error('Set env dulu: NEW_VITE_SUPABASE_URL dan NEW_VITE_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(NEW_URL, NEW_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select('*').limit(0);
  if (error && (error.code === '42P01' || error.code === 'PGRST205')) return false;
  return true;
}

async function getCount(tableName) {
  const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
  if (error) return -1;
  return count;
}

async function cleanTable(tableName) {
  if (DRY_RUN) { console.log(`  [DRY-RUN] TRUNCATE ${tableName}`); return; }
  console.log(`  TRUNCATE ${tableName}...`);
  const { error } = await supabase.rpc('exec_sql', { sql: `TRUNCATE public.${tableName} CASCADE` }).catch(() => ({ error: { message: 'no exec_sql RPC' } }));
  if (error) {
    console.log(`  Fallback: DELETE FROM ${tableName}...`);
    const { error: delErr } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) throw new Error(`Gagal truncate ${tableName}: ${delErr.message}`);
  }
}

async function getExistingIds(tableName, idColumn = 'id') {
  const existing = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(tableName).select(idColumn).range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    data.forEach((row) => existing.add(String(row[idColumn])));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return existing;
}

async function getExistingUsernames(tableName) {
  const existing = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(tableName).select('username').range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    data.forEach((row) => existing.add(row.username));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return existing;
}

async function importAdminUsers(rows) {
  if (rows.length === 0) { console.log('  0 rows, skip'); return { inserted: 0, skipped: 0 }; }
  const existing = DRY_RUN ? new Set() : await getExistingUsernames('admin_users');
  const toInsert = rows.filter((r) => !existing.has(r.username));
  const skipped = rows.length - toInsert.length;
  if (toInsert.length === 0) { console.log(`  ${rows.length} rows, semua sudah ada`); return { inserted: 0, skipped }; }
  console.log(`  ${rows.length} rows, ${skipped} sudah ada, insert ${toInsert.length}`);
  if (DRY_RUN) return { inserted: 0, skipped };
  let inserted = 0;
  for (const row of toInsert) {
    const { id, ...rest } = row;
    const { error } = await supabase.from('admin_users').insert({ ...rest, id: id || undefined });
    if (error) console.error(`  ! ${row.username}: ${error.message}`);
    else inserted++;
  }
  return { inserted, skipped };
}

async function importById(tableName, rows, idColumn = 'id') {
  if (rows.length === 0) { console.log('  0 rows, skip'); return { inserted: 0, skipped: 0 }; }
  const existing = DRY_RUN ? new Set() : await getExistingIds(tableName, idColumn);
  const toInsert = rows.filter((r) => !existing.has(String(r[idColumn])));
  const skipped = rows.length - toInsert.length;
  if (toInsert.length === 0) { console.log(`  ${rows.length} rows, semua sudah ada`); return { inserted: 0, skipped }; }
  console.log(`  ${rows.length} rows, ${skipped} sudah ada, insert ${toInsert.length}`);
  if (DRY_RUN) return { inserted: 0, skipped };
  const batchSize = 200;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).insert(batch);
    if (error) {
      console.error(`  ! Batch ${i}: ${error.message}`);
      for (const row of batch) {
        const { error: oneErr } = await supabase.from(tableName).insert(row);
        if (!oneErr) inserted++;
        else console.error(`    ! ${row[idColumn]}: ${oneErr.message}`);
      }
    } else {
      inserted += batch.length;
    }
    if ((i + batchSize) % 1000 === 0) console.log(`  Progress: ${Math.min(i + batchSize, toInsert.length)}/${toInsert.length}`);
  }
  return { inserted, skipped };
}

async function main() {
  const dataFile = path.join(__dirname, '..', 'backup', 'data-export.json');
  if (!fs.existsSync(dataFile)) { console.error('File backup tidak ditemukan'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  console.log(`=== IMPORT KE PROJECT BARU ===`);
  console.log(`URL: ${NEW_URL}`);
  console.log(`Source: ${data.exported_at}\n`);
  if (DRY_RUN) console.log('DRY-RUN\n');

  const tables = ['admin_users', 'work_calendar_days', 'user_nips', 'leave_requests'];
  for (const t of tables) {
    if (!(await tableExists(t))) { console.error(`Tabel ${t} tidak ada`); process.exit(1); }
  }
  console.log('Schema OK\n');

  if (CLEAN && !DRY_RUN) {
    for (const t of ['leave_requests', 'user_nips', 'work_calendar_days', 'admin_users']) await cleanTable(t);
    console.log();
  }

  console.log('Import admin_users...');
  const adminResult = await importAdminUsers(data.tables.admin_users || []);
  console.log('\nImport work_calendar_days...');
  const calResult = await importById('work_calendar_days', data.tables.work_calendar_days || []);
  console.log('\nImport user_nips...');
  const nipsResult = await importById('user_nips', data.tables.user_nips || [], 'nip');
  console.log('\nImport leave_requests...');
  const leaveResult = await importById('leave_requests', data.tables.leave_requests || []);

  console.log('\n=== VERIFIKASI ===');
  for (const t of tables) {
    const c = await getCount(t);
    console.log(`  ${t}: ${c} rows`);
  }

  console.log('\n=== SELESAI ===');
  console.log(`admin_users: +${adminResult.inserted} (${adminResult.skipped} skipped)`);
  console.log(`work_calendar_days: +${calResult.inserted} (${calResult.skipped} skipped)`);
  console.log(`user_nips: +${nipsResult.inserted} (${nipsResult.skipped} skipped)`);
  console.log(`leave_requests: +${leaveResult.inserted} (${leaveResult.skipped} skipped)`);
  if (adminResult.inserted > 0) console.log('\nPassword admin di-preserve (bcrypt), login pakai password lama.');
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
