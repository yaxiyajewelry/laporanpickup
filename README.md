# SISTEM APLIKASI PICKUP YAXIYA JEWELRY

Aplikasi digital berbasis web (mobile-first & desktop responsive) untuk pencatatan dan pelaporan serah terima paket kurir perhiasan Yaxiya Jewelry, terintegrasi langsung dengan **Google Spreadsheet**, **Google Drive**, dan otomatisasi laporan **WhatsApp**.

---

## DAFTAR ISI
1. [Fitur Utama](#fitur-utama)
2. [Arsitektur & Alur Kerja](#arsitektur--alur-kerja)
3. [Panduan Instalasi & Setup Lengkap](#panduan-instalasi--setup-lengkap)
   - [A. Menyiapkan Google Spreadsheet](#a-menyiapkan-google-spreadsheet)
   - [B. Menyiapkan Google Apps Script](#b-menyiapkan-google-apps-script)
   - [C. Menempatkan Kode Code.gs](#c-menempatkan-kode-codegs)
   - [D. Deploy Apps Script Sebagai Web App](#d-deploy-apps-script-sebagai-web-app)
   - [E. Menghubungkan ke Website](#e-menghubungkan-ke-website)
   - [F. Deploy ke Vercel (Production)](#f-deploy-ke-vercel-production)
4. [Testing Checklist (19 Poin Pengujian)](#testing-checklist)
5. [Struktur File Proyek](#struktur-file-proyek)

---

## 1. FITUR UTAMA

- **Dua Menu Tab Utama di Navbar**:
  - **Menu "INPUT DATA"**: Form pencatatan serah terima kurir baru dengan kamera HP dan upload Google Drive.
  - **Tombol "Simpan Laporan"**: Menggantikan tombol kirim; setelah ditekan dan data tersimpan, aplikasi **otomatis langsung berpindah ke menu LAPORAN** dengan notifikasi sukses dan penanda laporan baru.
  - **Menu "LAPORAN"**: Halaman rekapitulasi laporan harian dengan kalender pemilih tanggal, ringkasan total paket & total pickup kurir.
- **Fitur Edit & Delete Laporan (Sinkron Langsung ke Spreadsheet)**:
  - **Edit Laporan**: Setiap kartu laporan memiliki tombol Edit untuk mengubah Nama Kurir, Jasa Kirim, Jumlah Paket, Tanggal Pickup, Catatan, atau mengganti Foto Bukti Pickup. Perubahan langsung diupdate di baris Google Spreadsheet.
  - **Delete Laporan**: Setiap kartu laporan memiliki tombol Hapus dengan **Popup Modal Konfirmasi** (mencegah klik tidak sengaja). Saat dikonfirmasi, baris laporan langsung dihapus dari Google Spreadsheet dan aplikasi.
- **Kirim Sekaligus Seluruh Laporan Hari Itu ke WhatsApp**:
  - Tombol **"Kirim Semua Laporan Hari Ini ke WhatsApp"** menggabungkan seluruh laporan pickup pada hari tersebut (misal 3 laporan kurir berbeda) ke dalam 1 pesan WhatsApp rapi lengkap dengan masing-masing nomor laporan, kurir, jumlah paket, dan link foto Google Drive asli!
  - Juga tersedia tombol salin teks rekap dan kirim per item secara terpisah.
- **Warna Identitas Brand Yaxiya Jewelry**: Primary `#AB03A9` dengan turunan elegan, bersih, dan modern.
- **Mobile-First Camera Capture**: Mengakses langsung kamera belakang perangkat HP (`capture="environment"`).
- **Client-Side Image Compression**: Mengompres foto secara otomatis menggunakan HTML5 Canvas ke ukuran optimal (target ~600KB - 1.5MB) tanpa menurunkan keterbacaan nomor resi.
- **Nomor Laporan Otomatis & Unik**: Format `PICKUP-YYYYMMDD-XXX` yang digenerate dari server backend menggunakan `LockService` untuk mencegah race condition / duplikasi.
- **Penyimpanan Terstruktur Google Drive**: Otomatis membuat folder bertingkat `YAXIYA JEWELRY - BUKTI PICKUP / [TAHUN] / [BULAN] / PICKUP-YYYYMMDD-XXX_NamaKurir.jpg` dengan izin baca langsung.
- **Database Otomatis Google Spreadsheet**: Otomatis membuat sheet `Database Pickup` dan 10 kolom header dengan styling warna resmi #AB03A9 jika belum tersedia.
- **Sinkronisasi Data**: Dapat memuat dan menyinkronkan data langsung dari Google Spreadsheet atau memori lokal perangkat.

---

## 2. ARSITEKTUR & ALUR KERJA

```text
[ ADMIN/USER INPUT FORM ]
        │
        ▼
[ AMBIL FOTO VIA KAMERA BELAKANG ]
        │
        ▼
[ KOMPRESI GAMBAR CLIENT-SIDE (CANVAS) ]
        │
        ▼
[ KLIK "KIRIM LAPORAN" ]
        │
        ▼
[ POST KE GOOGLE APPS SCRIPT WEB APP ]
  ├── LockService (Cegah Duplikasi No. Laporan)
  ├── Generate No. Laporan: PICKUP-YYYYMMDD-XXX
  ├── Simpan Foto ke Google Drive (Tahun/Bulan) -> Ambil URL File
  └── Simpan 10 Kolom Data ke Sheet "Database Pickup"
        │
        ▼
[ RETURN RESPONSE JSON BERHASIL ]
        │
        ▼
[ GENERATE FORMAT PESAN WHATSAPP ]
        │
        ▼
[ OTOMATIS BUKA WHATSAPP DENGAN LINK FOTO GOOGLE DRIVE ]
```

---

## 3. PANDUAN INSTALASI & SETUP LENGKAP

### A. Menyiapkan Google Spreadsheet
1. Buka browser dan kunjungi [sheets.new](https://sheets.new).
2. Beri judul dokumen Spreadsheet, misalnya: `DATABASE PICKUP YAXIYA JEWELRY`.
3. Anda **TIDAK PERLU** membuat nama sheet atau mengetikkan 10 kolom header secara manual. Backend `Code.gs` telah diprogram untuk membuat sheet `Database Pickup` dan header berwarna ungu #AB03A9 secara otomatis!

### B. Menyiapkan Google Apps Script
1. Di halaman Google Spreadsheet yang baru dibuat, klik menu atas:
   **Ekstensi (Extensions)** &rarr; **Apps Script**.
2. Anda akan diarahkan ke editor Google Apps Script. Beri nama proyek, misalnya: `Backend Pickup Yaxiya`.

### C. Menempatkan Kode `Code.gs`
1. Buka file `Code.gs` di editor Apps Script dan hapus semua kode bawaan (seperti `function myFunction() {}`).
2. Buka file `Code.gs` yang ada di proyek ini (atau klik tombol **Panduan &rarr; Salin Kode Code.gs** di aplikasi website).
3. Tempelkan seluruh kode ke editor Apps Script.
4. Klik tombol **Simpan (Ikon Disket / Ctrl + S)**.
5. *(Opsional untuk inisialisasi)*: Pada dropdown fungsi di bagian atas editor, pilih `setupDatabase`, lalu klik tombol **Jalankan (Run)**.
   - Google akan meminta izin (Authorization Required).
   - Klik **Tinjau Izin (Review permissions)** &rarr; Pilih akun Google Anda &rarr; Klik **Advanced (Lanjutan)** &rarr; Klik **Go to Backend Pickup Yaxiya (unsafe)** &rarr; Klik **Izinkan (Allow)**.
   - Selesai! Spreadsheet dan Folder Drive sudah langsung tercipta otomatis.

### D. Deploy Apps Script Sebagai Web App
1. Di pojok kanan atas editor Apps Script, klik tombol biru **Terapkan (Deploy)** &rarr; **Deployment baru (New deployment)**.
2. Klik ikon gerigi (Select type) di sebelah kiri &rarr; Pilih **Aplikasi Web (Web app)**.
3. Atur konfigurasi sebagai berikut:
   - **Deskripsi:** `Pickup API Production v1`
   - **Jalankan sebagai (Execute as):** `Saya (Me - email akun Google Anda)`
   - **Yang memiliki akses (Who has access):** `Siapa saja (Anyone)` *(Sangat penting: Pilih Anyone agar frontend dapat mengirim data tanpa login Google)*.
4. Klik **Terapkan (Deploy)**.
5. Salin teks **URL Aplikasi Web (Web App URL)** yang berakhiran `/exec`.
   Contoh: `https://script.google.com/macros/s/AKfycbxAbC123.../exec`

### E. Menghubungkan ke Website
1. Buka aplikasi web Pickup Yaxiya Jewelry.
2. Klik tombol **Atur (Pengaturan)** di pojok kanan atas header.
3. Tempelkan URL Web App yang berakhiran `/exec` ke kotak input **URL Google Apps Script**.
4. *(Opsional)* Masukkan Nomor WhatsApp penerima (misal: `628123456789`). Jika dikosongkan, Anda dapat memilih kontak di WhatsApp secara manual.
5. Klik **Uji Koneksi Backend** untuk memverifikasi.
6. Klik **Simpan Pengaturan**.

### F. Deploy ke Vercel (Production)
1. Push proyek ini ke repository **GitHub** Anda:
   ```bash
   git init
   git add .
   git commit -m "Initial commit Yaxiya Jewelry Pickup App"
   git branch -M main
   git remote add origin https://github.com/username/yaxiya-pickup.git
   git push -u origin main
   ```
2. Buka dashboard [vercel.com](https://vercel.com) dan login.
3. Klik **Add New...** &rarr; **Project** &rarr; Import repository GitHub Anda.
4. Pengaturan build di Vercel:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Klik tombol **Deploy**.
6. Website siap diakses secara publik dengan HTTPS!

---

## 4. TESTING CHECKLIST

Gunakan checklist ini untuk memverifikasi bahwa aplikasi telah bekerja 100% sempurna:

- [x] **Nama Kurir wajib diisi**: Validasi aktif, mencegah pengiriman jika kosong.
- [x] **Jasa Kirim wajib dipilih**: Tersedia dropdown 11 pilihan jasa kirim populer.
- [x] **Pilihan "Lainnya"**: Memunculkan input teks tambahan untuk mengetik nama ekspedisi baru.
- [x] **Jumlah Paket**: Hanya menerima angka bulat minimal 1, dilengkapi tombol +/- sentuh cepat.
- [x] **Tanggal Pickup**: Otomatis terisi tanggal hari ini berdasarkan zona waktu Asia/Jakarta (WIB).
- [x] **Catatan**: Bersifat opsional, dilengkapi chip pintas cepat (bubble wrap, resi lengkap, dll).
- [x] **Kamera Langsung**: Membuka kamera belakang HP menggunakan `capture="environment"`.
- [x] **Pratinjau Foto**: Foto langsung muncul dengan label resolusi dan ukuran byte kompresi.
- [x] **Validasi Foto**: Jika belum ada foto, muncul peringatan *"Silakan ambil foto bukti pickup terlebih dahulu."*
- [x] **Penyimpanan Google Drive**: Foto otomatis tersimpan dalam folder `YAXIYA JEWELRY - BUKTI PICKUP/[Tahun]/[Bulan]/`.
- [x] **Tautan Google Drive**: Izin file publik/viewable sehingga link dapat dibuka oleh penerima pesan.
- [x] **Penyimpanan Spreadsheet**: 10 kolom data tercatat rapi pada sheet `Database Pickup`.
- [x] **Nomor Laporan Otomatis**: Format `PICKUP-YYYYMMDD-XXX` berurutan per hari.
- [x] **Anti-Duplikasi**: Menggunakan `LockService` di Google Apps Script sehingga aman dari bentrok submit bersamaan.
- [x] **Waktu Laporan Otomatis**: Format `DD/MM/YYYY HH:mm WIB` mengikuti waktu pengiriman.
- [x] **WhatsApp Terbuka Otomatis**: Aplikasi otomatis mengarahkan ke tautan `wa.me` setelah data tersimpan.
- [x] **Format Pesan WhatsApp**: Sesuai format resmi permintaan (No. Laporan, Waktu, Kurir, Ekspedisi, Paket, Tanggal, Link Foto).
- [x] **Reset Form**: Form dibersihkan otomatis setelah laporan selesai sehingga siap untuk pickup berikutnya.
- [x] **Responsif Penuh**: Tata letak rapi, nyaman digunakan di Android, iPhone, tablet, maupun layar desktop.

---

## 5. STRUKTUR FILE PROYEK

```text
yaxiya-pickup/
├── Code.gs                     # Backend Google Apps Script (Drive & Sheets API)
├── vercel.json                 # Konfigurasi rewrite SPA Vercel
├── index.html                  # HTML Entry Point dengan meta tags & font Plus Jakarta Sans
├── package.json                # Dependencies & scripts
├── metadata.json               # App metadata
├── README.md                   # Dokumentasi & panduan instalasi lengkap
├── src/
│   ├── App.tsx                 # Komponen utama aplikasi & orchestrator alur submit
│   ├── config.ts               # Pengaturan URL Apps Script & WhatsApp penerima
│   ├── index.css               # Styling Tailwind CSS & tema warna #AB03A9
│   ├── main.tsx                # React root mount
│   ├── components/
│   │   ├── Header.tsx          # Header branding Yaxiya Jewelry & status koneksi
│   │   ├── CourierInfoCard.tsx # Form section Informasi Kurir
│   │   ├── PackageDetailCard.tsx# Form section Detail Paket
│   │   ├── PickupProofCard.tsx # Ambil foto via kamera & preview kompresi
│   │   ├── SubmitButton.tsx    # Tombol besar Kirim Laporan dengan indikator progress
│   │   ├── SuccessModal.tsx    # Modal sukses, tautan Drive & trigger WhatsApp
│   │   ├── SettingsModal.tsx   # Modal pengaturan URL Apps Script & uji koneksi
│   │   ├── GuideModal.tsx      # Panduan interaktif & 1-click copy Code.gs
│   │   └── HistoryModal.tsx    # Modal riwayat laporan pickup di perangkat
│   ├── services/
│   │   └── apiService.ts       # Service komunikasi POST & GET ke Google Apps Script
│   └── utils/
│       ├── dateHelper.ts       # Timezone Asia/Jakarta (WIB) & formatting
│       ├── imageCompressor.ts  # Kompresi gambar Canvas & validasi tipe
│       └── whatsappHelper.ts   # Pembuat format pesan teks resmi & URL wa.me
```
