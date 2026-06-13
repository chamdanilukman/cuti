const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('usercuti.xlsx');
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

const esc = (s) => String(s).trim().replace(/'/g, "''");
const seen = new Set();
const dups = [];
const lines = [];

for (const r of rows) {
  const u = String(r.Username || '').trim();
  const p = String(r.Password || '').trim();
  if (!u || !p) continue;
  if (seen.has(u)) dups.push(u);
  seen.add(u);
  lines.push(`select public.admin_set_password('${esc(u)}', '${esc(p)}');`);
}

const header =
  `-- Reset password admin ke bcrypt (generated dari usercuti.xlsx)\n` +
  `-- Jalankan SETELAH menjalankan 0001_secure_admin_auth.sql.\n` +
  `-- Total akun: ${lines.length}\n\n`;

fs.writeFileSync(
  'supabase/migrations/0002_reset_admin_passwords.sql',
  header + lines.join('\n') + '\n'
);

console.log('Total rows:', rows.length);
console.log('SQL lines :', lines.length);
console.log('Duplikat  :', dups.length ? dups.join(', ') : 'tidak ada');
