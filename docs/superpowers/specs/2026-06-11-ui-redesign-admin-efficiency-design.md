# UI Redesign Admin Efficiency Design

**Tanggal:** 2026-06-11

**Status:** Pemeriksaan akhir selesai; siap untuk persetujuan pengguna dan pembuatan implementation plan.

**Referensi visual:** `public/ui-redesign-preview-v3.html`

## Tujuan

Merapikan tampilan seluruh aplikasi CUTIDISDIK agar lebih konsisten, responsif, dan mudah dipakai oleh admin untuk mengelola pengajuan cuti. Desain mengadaptasi referensi v3, tetapi prioritas utamanya adalah efisiensi kerja admin, kejelasan data, dan kemudahan aksi tanpa mengurangi fitur yang sudah ada.

## Prinsip Desain

- Desktop-first responsif: admin paling sering memakai laptop/desktop, tetapi tampilan tetap nyaman untuk pengecekan lewat ponsel.
- Fitur tetap dipertahankan: persetujuan, penolakan, revisi, unggah/unduh dokumen, ekspor, pagination, filter, kalender kerja, dan hak akses per peran tidak boleh hilang.
- Aksi utama harus dekat dengan data: tombol lihat detail, setujui, tolak, unduh, unggah surat, dan salin/kelola link harus mudah ditemukan.
- Data padat tetap rapi: tabel dipertahankan di desktop, sementara mobile memakai kartu ringkas dengan menu aksi.
- Bahasa visual konsisten: warna, kartu, tombol, tab, modal, tabel, filter, dan notifikasi memakai pola yang sama di seluruh aplikasi.

## Arah Visual

Adaptasi dari referensi v3:

- Header putih, sticky, bersih, dengan border bawah halus.
- Latar aplikasi `slate-50`, kartu putih, border `slate-200`, shadow ringan.
- Warna utama indigo/biru untuk navigasi dan aksi primer.
- Warna status konsisten:
  - Menunggu: amber.
  - Disetujui Korwil/SMP/SKB: orange.
  - Disetujui Dinas / terbit dokumen: emerald.
  - Ditolak: rose.
  - Netral / draft / arsip: slate.
- Spasi lebih lega pada halaman publik, lebih padat tetapi terstruktur pada panel admin.
- Ikon tetap memakai `lucide-react` agar konsisten dengan aplikasi saat ini.

## Strategi Versi V2 Tanpa Menghapus UI Lama

Redesign dibuat sebagai `UI v2`, bukan mengganti semua file lama sekaligus. Tujuannya agar tampilan lama tetap aman sebagai referensi dan fallback selama proses migrasi.

Pendekatan yang dipakai:

- Komponen lama tetap dipertahankan sampai `UI v2` selesai diuji.
- Komponen baru ditempatkan dalam folder khusus `src/components/v2/`.
- Aplikasi lama dipertahankan sebagai `AppV1`, sedangkan tampilan baru dirakit sebagai `AppV2`.
- `src/App.tsx` menjadi pemilih versi dan tidak memuat kedua UI secara bersamaan.
- `AppV1` dan `AppV2` dimuat melalui dynamic import/`React.lazy` agar browser hanya mengunduh kode UI yang sedang dipakai.
- Versi default ditentukan melalui `VITE_DEFAULT_UI_VERSION` dengan nilai `v1` atau `v2`.
- Query URL menjadi override untuk pengujian dan fallback:
  - `?ui=v2` membuka tampilan baru.
  - `?ui=v1` membuka tampilan lama.
- Selama implementasi dan QA, versi default tetap `v1`. Default baru dipindahkan ke `v2` setelah semua tahap disetujui.
- Komponen dasar v2 seperti `PageShell`, `SectionCard`, `StatCard`, `AdminToolbar`, dan `ResponsiveDataView` dibuat terpisah dari komponen lama.
- Halaman lama boleh membungkus atau memakai komponen v2 secara bertahap, tetapi tidak langsung dihapus.
- Logika bisnis, hook data, tipe, validasi, dan utilitas yang sudah ada harus digunakan bersama oleh v1 dan v2. V2 tidak membuat salinan aturan cuti atau akses role.
- V2 tidak boleh membuat instance Supabase baru. Semua akses data dan autentikasi memakai modul layanan yang sudah tersedia.
- Gaya khusus v2 ditempatkan di `src/styles/v2.css` dan seluruh selector khusus berada di bawah root `.ui-v2`. Perubahan global di `src/index.css` dibatasi agar tidak mengubah tampilan v1.
- Peralihan ke v2 dilakukan dari level yang aman:
  - Tahap awal: halaman publik memakai wrapper/desain v2.
  - Tahap berikutnya: panel admin memakai komponen v2 per bagian.
  - Tahap akhir: komponen lama yang sudah tidak dipakai baru bisa dipertimbangkan untuk dibersihkan setelah semua alur lolos QA.
- Jika ada masalah pada v2, komponen lama masih bisa dijadikan pembanding perilaku.

Dengan strategi ini, implementasi tidak boleh menghapus fitur atau file lama hanya karena tampilannya sudah diganti. Penghapusan hanya boleh dilakukan pada tahap cleanup terpisah setelah pengguna menyetujui hasil v2.

### Aturan Pemilihan Versi

Urutan pemilihan UI:

1. Gunakan query `ui` jika nilainya tepat `v1` atau `v2`.
2. Jika query tidak ada, gunakan `VITE_DEFAULT_UI_VERSION`.
3. Jika konfigurasi tidak valid atau kosong, gunakan `v1`.

Pemilihan versi tidak mengubah data, sesi admin, atau struktur database. Perpindahan versi hanya mengganti lapisan tampilan.

## Struktur Navigasi

### Navigasi Utama Aplikasi

Menu utama tetap:

- Beranda.
- Pengajuan Cuti.
- Status Pengajuan.
- Administrator.
- Tata Cara Penggunaan.

Perubahan yang direncanakan:

- Header mengikuti gaya referensi v3.
- Desktop memakai tombol navigasi horizontal.
- Mobile tetap memakai kontrol ringkas, tetapi tampilannya disesuaikan dengan desain baru.
- Area konten memakai layout wrapper konsisten: `max-w-7xl`, padding responsif, dan jarak antar bagian seragam.

### Navigasi Panel Admin

Panel admin disusun berdasarkan pekerjaan:

- Dasbor: ringkasan beban kerja dan status cepat.
- Persetujuan: daftar pengajuan yang perlu diproses.
- Riwayat/Data Cuti: daftar semua data sesuai hak akses.
- Laporan: ekspor dan rekap.
- Analitik: grafik dan ringkasan kinerja.
- Kalender: khusus Admin Dinas untuk libur nasional dan cuti bersama.

Untuk Admin Dinas, `Kalender` tetap hanya muncul pada role `admin_disdik`.

## Perbaikan Per Halaman

### Beranda / Dashboard Publik

- Mengikuti layout referensi v3: sambutan, ringkasan statistik, grafik tren, dan grafik jenis cuti.
- Kartu statistik dibuat seragam dengan angka besar, label jelas, dan ikon kecil.
- Loading dan error dibuat lebih rapi agar tidak terasa seperti tampilan mentah.

### Form Pengajuan Cuti

- Form dibagi menjadi beberapa blok visual:
  - Data pegawai.
  - Detail cuti.
  - Lampiran.
  - Pratinjau kuota dan validasi.
- Pada desktop, field dua kolom tetap dipakai untuk efisiensi.
- Pada mobile, semua field menjadi satu kolom. Tombol submit berada di akhir form dan boleh dibuat sticky hanya jika tidak menutup pesan validasi atau pratinjau kuota.
- Informasi kuota cuti tahunan dibuat lebih jelas: kuota tersedia, hari efektif pengajuan, sisa sebelum pengajuan, dan sumber akumulasi.

### Status Pengajuan

- Desktop memakai tabel yang lebih rapi dengan status badge, tanggal, jenis cuti, dan aksi.
- Mobile memakai kartu per pengajuan agar tidak melebar.
- Pencarian NIP dibuat lebih menonjol karena ini jalur utama pengguna mengecek status.
- Tombol perbaiki pengajuan ditampilkan jelas hanya saat status memungkinkan.

### Halaman Administrator / Login

- Pilihan role admin dibuat seperti kartu akses yang lebih informatif.
- Login modal dirapikan agar fokus pada username/password dan pesan error.
- Setelah login, banner identitas admin dibuat lebih ringkas: nama, role, wilayah/sekolah yang dikelola, dan tombol keluar.

### Admin Dinas

Prioritas tertinggi karena panel paling lengkap.

- Dasbor:
  - Kartu statistik dirapikan.
  - Shortcut kerja cepat ke Persetujuan, Laporan, Analitik, dan Kalender.
  - Informasi beban kerja hari ini/menunggu diprioritaskan.
- Persetujuan:
  - Filter status, pencarian, tanggal, page size, ekspor, dan refresh disusun sebagai toolbar.
  - Tabel desktop memakai sticky header untuk daftar panjang. Jika tabel berada dalam container horizontal scroll, sticky header harus tetap sejajar dengan kolom.
  - Aksi massal tetap dipertahankan dan dibuat sebagai bar yang muncul saat ada data dipilih.
  - Aksi per baris tetap ada: detail, setujui, tolak/revisi, dokumen, lampiran, link drive.
- Laporan:
  - Form ekspor dan ringkasan dibuat lebih mudah dibaca.
  - Tabel rekap dirapikan dengan pola tabel yang sama.
- Analitik:
  - Kartu metrik dan grafik mengikuti gaya dashboard.
  - Hindari grafik terlalu penuh pada mobile.
- Kalender:
  - Daftar libur/cuti bersama dibuat seperti tabel desktop dan kartu mobile.
  - Form tambah/edit tanggal diberi pemisahan jelas antara tahun, tanggal, jenis, dan keterangan.

### Admin Korwil, SMP, dan SKB

- Mengikuti sistem visual yang sama dengan Admin Dinas.
- Tetap menggunakan hak akses yang sudah ada:
  - Korwil melihat kecamatan yang diizinkan.
  - SMP melihat sekolah/jenjang yang diizinkan.
  - SKB tetap mengikuti filter SKB.
- Persetujuan jenjang pertama menjadi fokus utama.
- Riwayat dan laporan tetap tersedia, tetapi tidak lebih menonjol dari pekerjaan persetujuan.

### Modal Detail Pengajuan

- Modal detail dibuat lebih mudah dipindai:
  - Identitas pegawai.
  - Informasi cuti.
  - Alur status.
  - Kuota cuti tahunan jika relevan.
  - Dokumen dan lampiran.
- Pada mobile, modal menjadi full-screen sheet agar nyaman dibaca.

## Komponen Reusable yang Perlu Dibuat

Komponen ini dipakai untuk mengurangi pengulangan dan menyamakan tampilan:

- `PageShell`: wrapper halaman dengan title, subtitle, dan action area.
- `SectionCard`: kartu standar untuk blok konten.
- `StatCard`: kartu angka statistik.
- `AdminToolbar`: pencarian, filter, tanggal, refresh, ekspor, dan page size.
- `ResponsiveDataView`: tabel desktop dan kartu mobile dari data yang sama.
- `ActionButtonGroup`: kumpulan aksi row/card.
- `EmptyState`: tampilan kosong yang konsisten.
- `LoadingState`: tampilan memuat data.
- `ErrorState`: tampilan error dengan tombol coba lagi.
- `AdminIdentityBanner`: ringkasan admin login.

## Paritas Fitur Wajib

V2 dinyatakan setara hanya jika fungsi berikut tersedia dan dapat digunakan:

### Pengguna Umum

- Melihat dashboard dan statistik.
- Membuat pengajuan cuti beserta validasi dan lampiran PDF.
- Melihat pratinjau hari efektif serta kuota tahunan.
- Mencari status berdasarkan NIP.
- Melihat detail, mengunduh surat, dan memperbaiki pengajuan yang ditolak.

### Admin Dinas

- Login, pemulihan sesi, dan logout.
- Filter, pencarian, rentang tanggal, pagination server, dan page size.
- Lihat detail, setujui, tolak, revisi persetujuan, dan aksi massal.
- Unduh dokumen, unduh lampiran, unggah surat final, dan kelola tautan Drive.
- Ekspor Excel, laporan, analitik, serta kalender kerja.

### Admin Korwil, SMP, dan SKB

- Login, pemulihan sesi, dan logout.
- Filter data sesuai kecamatan, sekolah, dan jenjang yang diizinkan.
- Persetujuan dan penolakan jenjang pertama.
- Riwayat, detail pengajuan, lampiran, laporan, dan ekspor.

Checklist ini menjadi dasar tes regresi dan pemeriksaan manual. Suatu halaman v2 tidak boleh dijadikan default jika fungsi terkait belum setara dengan v1.

## Responsif

### Desktop / Laptop

- Tabel tetap menjadi tampilan utama.
- Toolbar filter berada di atas tabel.
- Aksi massal muncul saat checkbox dipilih.
- Modal detail tetap centered dengan ukuran besar.

### Tablet

- Tabel boleh tetap dipakai jika lebar cukup.
- Filter dapat menjadi dua baris.
- Kartu statistik menjadi dua kolom.

### Ponsel

- Tabel penting berubah menjadi kartu.
- Filter ditempatkan dalam panel ringkas atau bagian yang bisa dibuka/tutup.
- Tombol aksi utama dibuat besar dan mudah ditekan.
- Modal detail memakai tampilan hampir full-screen.
- Navigasi admin memakai tab horizontal scroll atau dropdown ringkas.
- Halaman tidak boleh menyebabkan horizontal scroll pada viewport 390 px. Komponen lebar seperti grafik dan tabel harus mengecil, berubah bentuk, atau memiliki scroll di dalam containernya sendiri.

## Aksesibilitas Dasar

- Semua input tetap memiliki label yang dapat dibaca pembaca layar.
- Input memakai `name`, `type`, `inputMode`, dan `autocomplete` yang sesuai.
- Tombol ikon memiliki nama aksesibel atau teks bantu.
- Fokus keyboard terlihat jelas pada tombol, link, input, tab, dan kontrol modal.
- Modal dapat ditutup dengan tombol yang jelas dan tombol Escape, fokus tetap berada di dalam modal, lalu kembali ke pemicu saat modal ditutup.
- Warna status tidak menjadi satu-satunya pembeda; badge tetap memuat teks.
- Target sentuh utama di ponsel minimal sekitar 44 x 44 px.
- Kontras teks dan tombol mengikuti standar WCAG AA sejauh dapat diterapkan pada desain.
- Loading, validasi, upload, dan hasil aksi async diumumkan melalui area `aria-live="polite"`.
- Halaman menyediakan jalur keyboard yang logis dan tautan lewati ke konten utama.

## Interaksi dan State

- Hindari `transition-all`; animasikan hanya properti yang diperlukan seperti warna, opacity, atau transform.
- Hormati `prefers-reduced-motion` dengan mengurangi atau menonaktifkan animasi non-esensial.
- Aksi destruktif seperti hapus kalender, tolak massal, dan revisi persetujuan harus meminta konfirmasi yang menyebut dampaknya.
- Tab admin, status filter, pagination, dan page size disinkronkan ke query URL agar reload/back browser mempertahankan konteks kerja.
- Nilai sensitif seperti NIP, alasan cuti, dan isi pencarian bebas tidak disimpan dalam query URL.
- Konten panjang seperti nama unit kerja, alasan, dan nama berkas menggunakan `min-w-0`, wrapping, truncate, atau line clamp sesuai konteks.
- Grafik harus responsif. Pada ponsel, grafik bulanan boleh memakai scroll di dalam kartu, tetapi tidak boleh memperlebar halaman.

## Urutan Implementasi yang Disarankan

### Tahap 1: Fondasi Tampilan

- Pindahkan aplikasi saat ini tanpa perubahan perilaku menjadi `AppV1`.
- Tambahkan pemilih versi pada `src/App.tsx`.
- Buat `AppV2` dan root `.ui-v2`.
- Tambahkan token warna, shadow, radius, dan scrollbar terisolasi di `src/styles/v2.css`.
- Buat komponen reusable dasar di area `v2`.
- Buat versi v2 untuk `Header`, `Footer`, wrapper halaman, dan loading/error global.
- Verifikasi halaman masih berpindah normal.
- Verifikasi `?ui=v1` tetap menampilkan tampilan lama dan `?ui=v2` menampilkan tampilan baru.

### Tahap 2: Halaman Publik

- Redesain `Dashboard`.
- Redesain `LeaveForm`.
- Redesain `StatusPage`.
- Redesain `AboutPage`.
- Pastikan preview kuota cuti tahunan tetap memakai aturan terbaru.

### Tahap 3: Kerangka Admin

- Redesain `RolePage` dan `AdminLogin`.
- Buat banner identitas admin yang konsisten.
- Samakan tab admin untuk Dinas, Korwil, SMP, dan SKB.

### Tahap 4: Admin Dinas

- Refactor bertahap `EnhancedAdminPanel` karena file ini paling besar.
- Ekstrak bagian visual ke komponen `v2` tanpa menghapus logika lama.
- Pertahankan server-side pagination.
- Rapikan dashboard, persetujuan, laporan, analitik, dan kalender.
- Pastikan aksi massal tetap berfungsi.

### Tahap 5: Admin Korwil/SMP/SKB

- Rapikan `CoordinatorPanel`.
- Pertahankan filter hak akses per role.
- Samakan tabel/kartu mobile dengan Admin Dinas.

### Tahap 6: Modal dan Dokumen

- Rapikan `LeaveRequestDetailModal`.
- Rapikan modal penolakan, upload surat, preview PDF, link drive, dan ekspor Excel.
- Pastikan alur dokumen tidak berubah.

### Tahap 7: QA Responsif dan Regresi

- Jalankan tes otomatis.
- Build produksi.
- Bandingkan checklist paritas fitur v1 dan v2.
- Verifikasi fallback `?ui=v1` tetap berfungsi setelah build produksi.
- Cek manual pada viewport 390 x 844, 768 x 1024, dan 1280 x 720.
- Pastikan `document.documentElement.scrollWidth` tidak melebihi lebar viewport pada halaman yang tidak secara khusus membutuhkan horizontal scroll.
- Cek navigasi keyboard, focus ring, label form, nama tombol ikon, dan perilaku modal.
- Cek `prefers-reduced-motion`, area `aria-live`, dan konfirmasi aksi destruktif.
- Cek alur utama:
  - Ajukan cuti.
  - Cek status.
  - Login admin.
  - Setujui/tolak.
  - Upload/unduh dokumen.
  - Ekspor laporan.
  - Kelola kalender.

## Risiko dan Mitigasi

- Risiko: `EnhancedAdminPanel` terlalu besar sehingga perubahan visual rawan mengganggu logika.
  - Mitigasi: pecah UI bertahap ke komponen kecil tanpa mengubah aturan data terlebih dahulu.
- Risiko: tampilan mobile tabel menjadi sulit dipakai.
  - Mitigasi: gunakan kartu mobile khusus, bukan tabel yang dipaksa mengecil.
- Risiko: fitur admin tersembunyi setelah desain dirapikan.
  - Mitigasi: daftar aksi lama dijadikan checklist saat implementasi.
- Risiko: perubahan desain mengubah perilaku validasi cuti.
  - Mitigasi: pertahankan helper validasi yang sudah ada dan jalankan tes regresi.
- Risiko: v2 belum stabil tetapi file lama sudah terlanjur dihapus.
  - Mitigasi: bangun v2 paralel di folder khusus dan tunda cleanup sampai semua alur utama disetujui.
- Risiko: CSS v2 mengubah tampilan v1.
  - Mitigasi: scope gaya khusus di bawah `.ui-v2` dan hindari perubahan global yang tidak diperlukan.
- Risiko: perbaikan aturan bisnis hanya diterapkan pada salah satu versi.
  - Mitigasi: kedua versi memakai hook, utilitas, tipe, dan layanan data yang sama; tidak ada salinan aturan bisnis di komponen v2.
- Risiko: kedua versi masuk ke bundle awal dan memperlambat aplikasi.
  - Mitigasi: gunakan dynamic import/`React.lazy` pada pemilih versi.

## Baseline Sebelum Implementasi

Hasil pemeriksaan pada 2026-06-11:

- Seluruh 34 tes otomatis lulus.
- Build produksi Vite berhasil.
- ESLint tidak memiliki error dan mencatat 30 warning lama.
- Dev server berjalan di `http://127.0.0.1:5173/`.
- Halaman v1 tidak mengalami horizontal overflow pada viewport desktop 1280 px.
- Dashboard v1 mengalami horizontal overflow pada viewport ponsel 390 px karena grafik tren bulanan melebar hingga sekitar 473 px.
- Konsol browser tidak mencatat error, tetapi memiliki warning lama tentang lebih dari satu instance `GoTrueClient` Supabase.

Implementasi v2 tidak wajib menyelesaikan warning Supabase lama sebagai bagian redesign, tetapi tidak boleh menambah instance Supabase atau warning baru. Horizontal overflow ponsel wajib diselesaikan pada v2.

## Kriteria Selesai

- Semua halaman utama tampil konsisten dengan gaya referensi v3.
- Admin Dinas, Korwil, SMP, dan SKB bisa bekerja lebih cepat melalui toolbar, tab, tabel, kartu mobile, dan aksi yang jelas.
- Tidak ada fitur lama yang hilang.
- Tampilan desktop rapi dan padat; tampilan ponsel tetap bisa dipakai untuk pengecekan dan aksi ringan.
- Tes otomatis lulus.
- Build produksi berhasil.
- Lint tidak menambah error baru.
- UI lama belum dihapus selama fase implementasi v2; cleanup dilakukan sebagai pekerjaan terpisah setelah approval.
- `?ui=v1` dan `?ui=v2` dapat digunakan untuk membandingkan kedua versi.
- Konfigurasi yang kosong atau salah selalu kembali ke v1.
- Tidak ada horizontal overflow halaman pada viewport ponsel 390 px.
- Kontrol utama dapat digunakan dengan keyboard dan memiliki fokus yang terlihat.

## Catatan Implementasi

Belum ada perubahan kode tampilan pada tahap dokumen ini. Implementasi baru dimulai setelah desain ini disetujui. Strategi implementasi yang dipakai adalah `UI v2` paralel agar desain lama tidak hilang sebelum versi baru benar-benar siap.
