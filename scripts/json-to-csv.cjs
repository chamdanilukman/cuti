#!/usr/bin/env node
/**
 * Convert data-export.json ke 3 file CSV siap upload ke Supabase Table Editor
 *
 * Usage:
 *   node scripts/json-to-csv.cjs
 *
 * Output: backup/csv/admin_users.csv
 *         backup/csv/leave_requests.csv
 *         backup/csv/work_calendar_days.csv
 */
const fs = require('fs');
const path = require('path');

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return '"' + JSON.stringify(val).replace(/"/g, '""') + '"';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCSV(rows) {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const body = rows.map(r => keys.map(k => escapeCSV(r[k])).join(',')).join('\n');
  return header + '\n' + body;
}

const dataFile = path.join(__dirname, '..', 'backup', 'data-export.json');
const outDir = path.join(__dirname, '..', 'backup', 'csv');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

for (const [table, rows] of Object.entries(data.tables)) {
  const csv = toCSV(rows);
  const outFile = path.join(outDir, `${table}.csv`);
  fs.writeFileSync(outFile, csv, 'utf8');
  console.log(`${table}.csv: ${rows.length} rows, ${(fs.statSync(outFile).size / 1024).toFixed(2)} KB`);
}

console.log('\nFile CSV siap di: backup/csv/');
console.log('Upload via Supabase Dashboard:');
console.log('  Table Editor -> <table> -> Insert -> Import data from CSV');
