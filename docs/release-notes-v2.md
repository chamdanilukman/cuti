# Release Notes — CUTIDISDIK v2.0.0

**Tanggal Rilis:** 13 Juni 2026

---

## Ringkasan

CUTIDISDIK v2 membawa pembaruan besar pada tampilan dan logika bisnis. UI baru berbasis React Router dengan dashboard grafik publik, modul kalender kerja untuk perhitungan hari efektif guru, dan sistem kuota cuti tahunan dengan akumulasi carry-over. Semua fitur V1 tetap tersedia sebagai fallback.

---

## Fitur Baru

### Dashboard Publik
- Grafik batang bulanan menampilkan tren pengajuan cuti sepanjang tahun.
- Responsif — tidak menyebabkan horizontal overflow di ponsel.
- Didukung Chart.js dengan 5 jenis grafik: tren bulanan, distribusi status, jenis cuti, jenjang, dan kecamatan.

### Kalender Kerja
- Admin Dinas dapat mengelola tanggal libur nasional dan cuti bersama via tab **Kalender**.
- Kalender bawaan mencakup tahun 2024–2026 (85+ tanggal).
- Perhitungan hari efektif otomatis mengecualikan: Minggu, libur nasional, dan cuti bersama.
- Hari Sabtu tetap dihitung sebagai hari efektif.

### Kuota Cuti Tahunan dengan Carry-Over
- Kuota dasar: 12 hari per tahun.
- Sisa kuota tahun sebelumnya dapat dibawa ke tahun berikutnya, maksimal 6 hari.
- Kuota maksimal: 18 hari (12 + 6).
- Pengajuan lintas tahun dibebankan proporsional ke tahun masing-masing.

### UI Version Toggle
- `?ui=v1` — UI lama (navigasi section-based, tanpa grafik).
- `?ui=v2` — UI baru (React Router, dashboard grafik, kalender).
- Default diatur via environment variable `VITE_DEFAULT_UI_VERSION`.

### Dokumen & Export
- Generate surat izin cuti .docx otomatis dari template dengan pengisian variabel.
- Export Excel rekap pengajuan per bulan, unit kerja, atau status.

---

## Bug Fixes

- **Hari Minggu** tidak lagi mengurangi kuota cuti tahunan.
- **Libur nasional & cuti bersama** tidak lagi mengurangi kuota.
- **Cuti Gol. IV Tahunan** sekarang menggunakan kuota yang sama dengan Cuti Tahunan.
- **Status `document_issued`** tetap menahan kuota (tidak double-count).
- **Pengajuan ditolak** tidak mengurangi kuota.
- **Pengajuan lintas tahun** dibebankan ke tahun masing-masing (tidak double-deduct).
- **Pagination server-side** di Admin Dinas — tidak lagi memuat seluruh arsip.
- **Konsistensi perhitungan hari** — semua tempat (status page, export Excel, dokumen surat, tabel admin, tabel korwil) sekarang menggunakan work calendar yang sama (`countEffectiveLeaveDays`).

---

## Catatan Teknis

- **39 tes otomatis** lulus (work calendar, kuota tahunan, validasi).
- **Supabase RPC** untuk statistik dashboard (count-only, tanpa fetch data baris).
- **Row Level Security** pada tabel `work_calendar_days`.
- **Build size**: ~268 kB (AppV2 chunk), ~607 kB (AboutPage chunk).
- **ESLint**: 0 error, beberapa warning lama (pre-existing, tidak memblokir).

---

## Known Limitations

- **UI V1 dibekukan** — tidak menerima fitur baru. Seluruh pengembangan ke depan hanya di V2.
- **Supabase Service Role Key** saat ini ada di `.env` frontend (seharusnya hanya di backend). Tidak memengaruhi fungsi aplikasi, tapi jadi catatan keamanan untuk perbaikan ke depan.
