# CUTIDISDIK — Sistem Informasi Cuti Dinas Pendidikan Grobogan

Aplikasi web untuk manajemen pengajuan cuti Aparatur Sipil Negara (ASN) di lingkungan Dinas Pendidikan Kabupaten Grobogan. Mendukung alur persetujuan dua tingkat (Koordinator Wilayah → Admin Dinas), pembuatan dokumen surat otomatis, dan export rekap Excel.

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | React 18, TypeScript, TailwindCSS, Vite 5 |
| **Routing** | React Router 7 |
| **Charts** | Chart.js + react-chartjs-2 |
| **Backend / DB** | Supabase (PostgreSQL + Row Level Security) |
| **Dokumen** | docxtemplater + PizZip (generate .docx) |
| **Export** | SheetJS / xlsx |

## Getting Started

```bash
# 1. Clone atau salin project
cd CUTIDISDIK

# 2. Salin environment template
cp .env.example .env

# 3. Isi Supabase URL & Anon Key di .env
#    (dapat dari Supabase Dashboard → Project Settings → API)

# 4. Install dependencies
npm install

# 5. Jalankan Supabase migrations (0001–0004)
#    via Supabase Dashboard SQL Editor atau supabase CLI:
#    supabase migration up

# 6. Jalankan dev server
npm run dev
#    Buka http://127.0.0.1:5173/
```

## Fitur Utama V2

- **Dashboard publik** — grafik batang bulanan (Chart.js) menampilkan tren pengajuan cuti, responsif untuk desktop dan ponsel.
- **Kalender Kerja** — Admin Dinas dapat mengelola libur nasional dan cuti bersama. Perhitungan hari efektif otomatis exclude Minggu + libur + cuti bersama.
- **Kuota Cuti Tahunan** — Akumulasi carry-over dari tahun sebelumnya: kuota = 12 + min(sisa tahun lalu, 6), maksimal 18 hari. Lintas tahun dihitung proporsional.
- **Dokumen Surat Otomatis** — Generate surat izin cuti .docx dari template, dengan pengisian variabel otomatis via docxtemplater.
- **Export Excel** — Rekap pengajuan per bulan, unit kerja, atau status, dengan kolom lengkap.
- **UI Version Toggle** — `?ui=v1` untuk UI lama, `?ui=v2` untuk UI baru. Default diatur via `VITE_DEFAULT_UI_VERSION`.

## Deployment

```bash
# Build produksi
npm run build

# Upload folder dist/ ke cPanel / shared hosting
# Pastikan environment variable diset di panel hosting:
#   VITE_DEFAULT_UI_VERSION=v2
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...
```

## Dokumentasi

- [CHANGELOG](./CHANGELOG.md) — Riwayat perubahan
- [Panduan Migrasi V1 → V2](./docs/migration-v1-to-v2.md) — Langkah upgrade untuk operator
- [Release Notes V2](./docs/release-notes-v2.md) — Berita rilis untuk stakeholder
- [Emergency Plan](./docs/egress-emergency-plan.md) — Prosedur darurat
- [Supabase Migration Notes](./docs/migrate-supabase.md) — Catatan migrasi database
