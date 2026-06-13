# Panduan Migrasi V1 → V2

Dokumen ini menjelaskan langkah-langkah upgrade dari CUTIDISDIK V1 ke V2 untuk operator/administrator sistem.

---

## Overview

V2 menambahkan:
- Dashboard publik dengan grafik batang bulanan (Chart.js)
- Modul Kalender Kerja (kelola libur nasional & cuti bersama)
- Kuota Cuti Tahunan dengan carry-over (12 + min(sisa, 6), maks 18)

**Semua fitur V1 tetap tersedia** sebagai fallback (`?ui=v1`). Tidak ada perubahan pada struktur database selain migration tambahan. Tidak ada data yang hilang atau perlu dimigrasi manual.

---

## Prasyarat

Sebelum migrasi, pastikan:

- [ ] Supabase migrations **0001–0004** sudah dijalankan (via Supabase Dashboard SQL Editor atau `supabase migration up`)
- [ ] Build Vite berhasil: `npm run build` tanpa error
- [ ] File `.env` sudah dikonfigurasi dengan Supabase URL & Anon Key

---

## Langkah Migrasi

### 1. Set Environment Variable

Di file `.env` (development) atau di panel environment hosting (production), tambahkan:

```
VITE_DEFAULT_UI_VERSION=v2
```

Jika variabel ini **tidak** diset, aplikasi akan default ke V2 (sesuai fallback di `App.tsx`). Tapi untuk kejelasan, set secara eksplisit.

### 2. Build Ulang

```bash
npm run build
```

Output akan muncul di folder `dist/`. Pastikan tidak ada error.

### 3. Deploy

Upload seluruh isi folder `dist/` ke server hosting (cPanel, shared hosting, atau static hosting).

**Untuk cPanel:**
1. Buka File Manager → `public_html/` (atau subdomain folder)
2. Upload file dari `dist/` (overwrite file lama)
3. Pastikan `.htaccess` sudah dikonfigurasi untuk SPA fallback (semua route mengarah ke `index.html`)

**Contoh `.htaccess` untuk Apache:**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### 4. Smoke Test

Buka aplikasi di browser dan verifikasi:

- [ ] Root URL menampilkan **dashboard V2** (grafik batang bulanan, statistik)
- [ ] `?ui=v1` menampilkan **UI V1** (navigasi section-based)
- [ ] `?ui=v2` menampilkan **UI V2**
- [ ] Login dan alur persetujuan berfungsi normal
- [ ] Download surat .docx berfungsi
- [ ] Export Excel berfungsi

---

## Rollback

Jika terjadi masalah dan perlu kembali ke V1:

1. Ubah environment variable:
   ```
   VITE_DEFAULT_UI_VERSION=v1
   ```
2. Build ulang: `npm run build`
3. Deploy ulang folder `dist/`

Pengguna yang sudah di V2 bisa tetap mengakses lewat `?ui=v2` meskipun default sudah V1.

---

## Breaking Changes

**Tidak ada.** Seluruh API, struktur database, dan alur bisnis tetap sama. V2 hanya mengubah lapisan presentasi (UI).

---

## Verification Checklist

| # | Cek | Hasil |
|---|---|---|
| 1 | `VITE_DEFAULT_UI_VERSION=v2` ter-set | ☐ |
| 2 | `npm run build` sukses (0 error) | ☐ |
| 3 | Root URL menampilkan dashboard V2 | ☐ |
| 4 | `?ui=v1` menampilkan UI lama | ☐ |
| 5 | Grafik dashboard merender tanpa horizontal scroll di HP | ☐ |
| 6 | Download surat berfungsi (dari detail modal & tombol bulk) | ☐ |
| 7 | Export Excel berfungsi (admin & korwil) | ☐ |
| 8 | Kolom DURASI di Excel sesuai work calendar | ☐ |
| 9 | Kalender Kerja bisa diakses Admin Dinas | ☐ |
| 10 | Alur persetujuan (korwil → admin) berfungsi normal | ☐ |
