# Migrasi Supabase — Project Lama → Project Baru (Nol Error)

Tujuan: total egress 4GB/bulan (2 project × 2GB). Cocok untuk free plan yang sudah 85% penuh.

## Tahapan

### 1. Buat Project Baru

Di https://supabase.com/dashboard → **New Project**:
- Name: `sicerdas-2` (atau bebas)
- Database password: **pakai yang kuat, simpan baik-baik**
- Region: **sama** dengan project lama

Setelah ready (~2 menit), catat:
- **Reference ID** (Settings → General)
- **URL + anon key** (Settings → API)

### 2. Setup Schema di Project Baru

Di project BARU → SQL Editor → New Query, jalankan **berurutan**:

1. `supabase/migrations/0001_secure_admin_auth.sql`
2. `supabase/migrations/0003_work_calendar_days.sql` (0002 opsional, password di-import terpisah)
3. `supabase/migrations/0004_dashboard_stats_rpc.sql`

### 3. Export Data dari Project Lama

Tambahkan `SUPABASE_SERVICE_ROLE_KEY` di `.env` lokal (Settings → API → **service_role** — JANGAN commit):
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   <-- untuk export, bypass RLS
```

```bash
node scripts/export-data.cjs
```

Output: `backup/data-export.json` (semua data tanpa `password_hash`).

### 4. Test Import (Dry Run)

```bash
$env:NEW_VITE_SUPABASE_URL="https://<PROJECT_ID_BARU>.supabase.co"
$env:NEW_VITE_SUPABASE_SERVICE_KEY="<SERVICE_ROLE_KEY>"

node scripts/import-data.cjs --dry-run
```

Akan menampilkan apa yang akan di-import tanpa menulis apa-apa.

### 5. Import ke Project Baru

```bash
node scripts/import-data.cjs
```

Idempotent: kalau dijalankan 2x, hanya insert yang baru. Skip yang sudah ada (by `id` atau `username`).

### 6. Test Aplikasi

Edit `.env` lokal:
```
VITE_SUPABASE_URL=https://<PROJECT_ID_BARU>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY_BARU>
```

```bash
npm run dev
```

Test:
- Login admin_disdik (password dari `0002_reset_admin_passwords.sql`)
- Lihat dashboard
- Status page
- Approval flow

### 7. Hapus Data Project Lama (Opsional)

```sql
truncate public.leave_requests cascade;
truncate public.admin_users cascade;
truncate public.work_calendar_days cascade;
```

Egress project lama langsung drop ke ~0.

### 8. Build & Deploy

```bash
npm run build
```

Upload `dist/` ke cPanel.

## Scripts

### `scripts/export-data.cjs`
Export 3 tabel ke `backup/data-export.json`:
- `admin_users` (password_hash di-strip)
- `work_calendar_days`
- `leave_requests`

Verifikasi: cek tabel ada sebelum export, batch pagination, error per-range.

### `scripts/import-data.cjs`
Import JSON ke project baru. Options:
- `--dry-run` — tampilkan tanpa tulis
- `--clean` — truncate project baru sebelum import

Fitur:
- Validasi schema dulu (cek tabel exists)
- Idempotent (skip by id/username)
- Progress per batch
- Fallback one-by-one kalau batch gagal
- Verifikasi count setelah import

## Tips Anti-Error

- **Backup file** selalu dicek dulu via `--dry-run` sebelum import
- **Service role key** wajib untuk import (anon key tidak punya izin write ke tabel dengan RLS)
- **Foreign keys** — admin_users di-import duluan (acuan untuk permission check)
- **Password** — `password_hash` di-skip, perlu `admin_set_password` setelah import, atau re-apply migration 0002
- **Rollback** — kalau ada masalah, tinggal kembalikan `.env` ke project lama

## Troubleshooting

| Error | Solusi |
|-------|--------|
| `relation "public.x" does not exist` | Schema belum dibuat, apply migrations dulu |
| `permission denied for table x` | Pakai service_role key untuk export (`SUPABASE_SERVICE_ROLE_KEY`), atau login admin di SQL Editor dan pakai `select * from admin_users` lalu copy manual |
| `duplicate key value violates unique constraint` | Idempotent aktif, data sudah ada di project baru |
| `null value in column "x" violates not-null` | Ada field required yang null di data export, cek schema |
| `Could not find the function public.exec_sql` | Tidak apa-apa, script fallback ke DELETE |
