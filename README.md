# SisaGuna — Website (HTML + CSS + JavaScript)

Marketplace B2B daur ulang limbah industri Batang–Pekalongan.
Kodenya mengikuti desain Figma versi web (halaman 3): warna biru-putih, font Plus Jakarta Sans, dan 3 peran (Penghasil Limbah, Mitra Pengolah, Mitra Logistik).

## Struktur folder
```
sisaguna-web/
├── index.html            ← file utama (buka ini)
├── README.md
├── SUPABASE.md           ← panduan menyambungkan database
├── supabase/schema.sql   ← tabel, keamanan & storage (tempel di Supabase)
├── supabase/update-1-peta-jemput.sql ← tambahan untuk proyek yang sudah jalan
├── supabase/update-2-admin-jejak.sql ← admin verifikasi, OCR, Jejak Limbah, lokasi driver
└── assets/
    ├── css/style.css     ← semua desain (warna, tombol, kartu, layout)
    ├── js/icons.js       ← ikon SVG
    ├── js/data.js        ← data contoh (listing, kategori, pesanan, menu tiap peran)
    ├── js/db.js          ← koneksi database Supabase (isi 2 kunci di sini)
    ├── js/geo.js         ← peta interaktif & koordinat Batang–Pekalongan
    ├── js/pdf.js         ← pembuat file PDF & CSV
    ├── js/app.js         ← semua halaman, router, dan interaksi
    └── img/
        ├── logo.svg
        └── img_*.jpg     ← 21 foto dari Figma
```

## 1. Buka di VS Code
1. Ekstrak ZIP, lalu di VS Code pilih **File → Open Folder… → sisaguna-web**.
2. Pasang ekstensi **Live Server** (Ritwick Dey) dari tab Extensions.
3. Klik kanan `index.html` → **Open with Live Server**. Browser terbuka di `http://127.0.0.1:5500`.
   Setiap kali kamu menyimpan file, halaman otomatis dimuat ulang.

## 2. Foto
Semua 21 foto dari frame **"Asset Gambar (Foto)"** di Figma sudah ada di `assets/img/` (format JPG, lebar maks. 900 px). Untuk mengganti foto, timpa file dengan nama yang sama.

## 3. Alur coba (prototipe)
Landing → **Daftar Gratis** → Masuk → OTP → **Pilih Peran**. Peran yang kamu pilih menentukan form verifikasi dan dashboard yang terbuka:
- **Penghasil Limbah** → `#/beranda`: posting limbah 3 langkah (form berubah sesuai kategori; model Jual / Jasa Olah / Tender menuju tujuan yang berbeda), jelajah, peta, detail, ajukan penawaran (pilih tanggal, jam, metode jemput, lalu pop-up), pesanan, jejak limbah, bayar rekber (QRIS / Saldo / VA), ulasan, dompet, dampak, profil, bantuan.
- **Mitra Pengolah** → `#/p/beranda`: penawaran saya, gudang & produksi.
- **Mitra Logistik** → `#/l/beranda`: order tersedia, tugas aktif (4 langkah), pendapatan & tarik dana.
- Menu **Keluar** kembali ke landing.

## 4. Peta, PDF & CSV
- **Peta** memakai Leaflet + OpenStreetMap: bisa digeser, di-zoom, dan ada tombol **Lokasiku**. Rute jalan dihitung lewat server OSRM publik; kalau gagal, rute ditampilkan sebagai garis putus-putus perkiraan. Tanpa internet, peta berubah menjadi gambar sederhana.
- **PDF** (laporan ESG per periode, laporan bulanan, sertifikat, dokumen tender RKS/spesifikasi, manifest kontrak) dibuat langsung di browser oleh `assets/js/pdf.js` lalu diunduh sebagai file asli.
- **Ekspor CSV** pesanan bisa langsung dibuka di Excel (pemisah titik koma).

## 4b. Jemput Cepat
Awalnya kosong ("Belum ada penjemputan aktif"). Pengguna mengisi jenis limbah, berat, waktu, armada, dan titik jemput di peta, lalu mengirim permintaan.
- **Mode demo:** armada otomatis "ditemukan" dalam beberapa detik, lalu statusnya berjalan sendiri.
- **Mode database:** permintaan muncul di **Order Tersedia** milik Mitra Logistik. Logistik bisa **Ambil Order → Limbah Sudah Dimuat → Selesai Diantar**, dan pemohon mendapat notifikasi di setiap tahap.

## 4c. Verifikasi, Jejak Limbah & lokasi driver
- **OCR dokumen:** saat foto NIB/izin/STNK diunggah di form verifikasi, teksnya dibaca otomatis (Tesseract.js) lalu dicocokkan dengan NIB, nama usaha, atau nomor plat yang diisi.
- **Verifikasi Mitra (admin):** admin membuka dokumen, melihat hasil OCR, lalu menyetujui atau menolak dengan catatan. Di mode demo halaman ini berisi contoh.
- **Jejak Limbah (mode database):** pesanan berjalan dari bayar rekber (simulasi) → dijemput → ditimbang & difoto → diterima → bukti pengolahan. Setiap tahap tercatat dan memberi notifikasi.
- **Lokasi driver:** pengangkut menekan **Bagikan Lokasi Langsung**; posisinya tampil di peta pemesan dan diperbarui tiap 15 detik selama halaman terbuka.

## 4d. Database
Website bisa langsung dicoba tanpa database (mode demo). Untuk menyimpan data sungguhan (akun, verifikasi, listing, foto, penawaran), ikuti **SUPABASE.md**.

## 5. Deploy gratis
**GitHub Pages**
1. Buat repo baru di GitHub, lalu unggah seluruh isi folder `sisaguna-web` (pastikan `index.html` ada di root).
2. Buka **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
3. Situs aktif di `https://<username>.github.io/<nama-repo>/`.

**Vercel**
1. Masuk ke vercel.com dengan akun GitHub → **Add New → Project** → pilih repo tadi.
2. Framework: **Other**, tanpa build command → **Deploy**.

Router memakai `#/` sehingga semua halaman tetap jalan di hosting statis tanpa pengaturan tambahan.

## 6. Mengubah isi
- Warna dan ukuran: variabel di bagian atas `assets/css/style.css` (`--primary`, `--sky`, dan lainnya).
- Data listing, kecamatan, dan menu: `assets/js/data.js`.
- Tampilan tiap halaman: fungsi `V.namaHalaman` di `assets/js/app.js`.
