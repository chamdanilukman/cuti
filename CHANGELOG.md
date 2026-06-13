# Changelog

Semua perubahan penting pada aplikasi CUTIDISDIK dicatat dalam dokumen ini.

## [Unreleased]

### Diperbaiki

- Konsistensi perhitungan hari cuti: semua tempat sekarang pakai `countEffectiveLeaveDays`
  (exclude Minggu + libur nasional + cuti bersama), tidak ada lagi `Math.ceil + 1`:
  - `StatusPage.tsx` — tampilan durasi di halaman status pengajuan
  - `excelExport.ts` — kolom DURASI (HARI) di export Excel
  - `documentGenerator.ts` — field `lama_cuti` di dokumen surat .docx
  - `EnhancedAdminPanel.tsx` — tampilan durasi di tabel admin dinas
  - `CoordinatorPanel.tsx` — tampilan durasi di tabel koordinator wilayah

## [2.0.0] - 2026-06-13

### Ditambahkan

- Fondasi UI v2 yang dapat dibuka lewat `?ui=v2` tanpa menghapus UI v1.
- Fallback eksplisit `?ui=v1` untuk kembali ke UI lama.
- Dashboard publik v2 dengan grafik bulanan (Chart.js) responsif.
- Modul kalender kerja untuk menghitung hari efektif guru.
- Kalender bawaan libur nasional dan cuti bersama tahun 2024-2026.
- Cuti bersama 24 Desember 2026.
- Perhitungan akumulasi kuota cuti tahunan dari satu tahun sebelumnya:
  - Kuota dasar tahun berjalan: 12 hari.
  - Sisa tahun sebelumnya dapat dibawa maksimal 6 hari.
  - Kuota maksimal: 18 hari.
- Tab **Kalender** pada panel Admin Dinas.
- Pengelolaan tanggal libur nasional dan cuti bersama untuk tahun berikutnya.
- Migration Supabase `0003_work_calendar_days.sql`.
- Tes otomatis (39 test) untuk kalender kerja dan kuota cuti tahunan.
- Variabel `VITE_DEFAULT_UI_VERSION` untuk mengatur UI default via environment.

### Diperbaiki

- Pratinjau form dan validasi akhir sekarang memakai perhitungan hari yang sama.
- Hari Minggu tidak lagi mengurangi kuota cuti tahunan.
- Libur nasional dan cuti bersama tidak lagi mengurangi kuota.
- Hari Sabtu biasa tetap dihitung sebagai hari efektif guru.
- `Cuti Gol. IV Tahunan` sekarang menggunakan kuota yang sama dengan `Cuti Tahunan`.
- Status `document_issued` tetap mengurangi atau menahan kuota.
- Pengajuan berstatus `rejected` tidak mengurangi kuota.
- Pengajuan lintas tahun dibebankan ke tahun masing-masing.
- Tampilan detail menunjukkan kuota tersedia, pemakaian, sisa, dan sumber akumulasi.
- Admin Dinas tidak lagi memuat seluruh arsip pengajuan karena sudah menggunakan pagination server.
- Tampilan grafik dashboard responsif (tidak menyebabkan horizontal overflow di ponsel).

### Aturan Kuota

```text
Kuota tahun berjalan =
12
+ min(sisa tahun sebelumnya, 6)
```

Contoh:

```text
Pemakaian 2025: 10 hari -> sisa 2 -> dibawa 2 hari
Kuota 2026: 12 + 2 = 14 hari
Kuota maksimal: 12 + 6 = 18 hari
```

### Verifikasi

- Seluruh 39 tes otomatis lulus.
- Build produksi Vite berhasil.
- ESLint selesai tanpa error; warning lama yang tidak memblokir masih tersedia.
- Dev server berhasil dijalankan di `http://127.0.0.1:5173/`.
- Migration Supabase berhasil dijalankan.
