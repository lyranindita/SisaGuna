# Menyambungkan SisaGuna ke Database (Supabase)

Selama kunci di `assets/js/db.js` masih kosong, website berjalan dalam **mode demo**: data contoh, dan isian pengguna hanya tersimpan di browser.
Ikuti langkah di bawah (± 15 menit) supaya data tersimpan sungguhan dan bisa dilihat pengguna lain.

---

## 1. Buat proyek Supabase
1. Buka **https://supabase.com** → **Start your project** → masuk dengan akun GitHub.
2. Klik **New project**:
   - **Name:** `sisaguna`
   - **Database Password:** buat sendiri lalu simpan (jangan dibagikan)
   - **Region:** pilih **Southeast Asia (Singapore)** supaya cepat dari Indonesia
3. Klik **Create new project** dan tunggu sampai selesai dibuat (± 2 menit).

## 2. Buat tabel database
1. Di menu kiri, buka **SQL Editor** → **New query**.
2. Buka file `supabase/schema.sql` di VS Code, salin **semua** isinya, lalu tempel ke SQL Editor.
3. Klik **Run**. Kalau muncul *Success*, berarti sudah jadi. File ini aman dijalankan ulang.
4. Cek di **Table Editor**: harus ada tabel `profiles`, `listings`, `offers`, `orders`, `pickups`, `reviews`, `messages`, dan `notifications`.
   Di **Storage** harus ada bucket `foto-limbah` dan `dokumen`.

### 2b. Sudah pernah menjalankan schema.sql sebelum ada fitur Peta & Jemput Cepat?
Jalankan juga file **`supabase/update-1-peta-jemput.sql`** di SQL Editor (New query → tempel → Run).
File ini menambah kolom lokasi listing dan tabel `pickup_requests`. Proyek baru yang menjalankan `schema.sql` terbaru tidak perlu langkah ini.

## 3. Login lewat email (tidak perlu diatur)
Email login memakai template bawaan Supabase, jadi **tidak ada yang perlu diubah**.
Pengguna mengisi email, lalu menerima email **"Your sign-in link"**. Setelah link **Sign in** diklik, pengguna otomatis masuk ke SisaGuna.

> Link di email bisa dibuka dari browser mana pun, tapi hanya berlaku sekali dan cepat kedaluwarsa. Kalau gagal, minta link baru.
> Pengirim email bawaan Supabase dibatasi beberapa email per jam. Untuk uji coba sudah cukup.
> (Opsional) Kalau nanti memasang SMTP sendiri (Brevo/Resend) di **Authentication → Emails → SMTP Settings**, template bisa diubah menjadi kode 6 digit dengan `{{ .Token }}`. Website tetap bisa menerima kode itu di halaman yang sama.

## 4. Atur alamat website
Buka **Authentication → URL Configuration**:
- **Site URL:** `http://127.0.0.1:5500` (alamat Live Server)
- **Redirect URLs:** tambahkan `http://127.0.0.1:5500/**`. Setelah deploy, tambahkan juga alamat GitHub Pages/Vercel kamu, misalnya `https://username.github.io/sisaguna/**`.

## 5. Tempel kunci ke website
1. Buka **Project Settings → API Keys**. Untuk *Project URL*, lihat **Project Settings → Data API**, atau tombol **Connect** di bagian atas dashboard.
2. Salin **Project URL** dan kunci **anon / publishable** (yang boleh dipakai di browser).
3. Buka `assets/js/db.js`, lalu isi:
   ```js
   const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOi...';   // atau sb_publishable_...
   ```
> ⚠️ **Jangan pernah** memakai kunci **service_role / secret** di website. Kunci itu bisa melewati semua aturan keamanan.

## 6. Coba
1. Jalankan **Live Server** → klik **Masuk** → isi email → **Kirim Link Masuk** → buka email (cek juga folder spam) → klik **Sign in**.
2. Pilih peran → isi form verifikasi → **Kirim Verifikasi**. Datanya muncul di **Table Editor → profiles**.
3. Sebagai Penghasil: **Posting Limbah** (bisa dengan foto). Data masuk ke `listings`, fotonya ke Storage `foto-limbah`.
4. Keluar, lalu masuk dengan **email lain** sebagai Mitra Pengolah. Buka **Cari Bahan Baku**, pilih limbah tadi, lalu **Ajukan Penawaran**.
5. Masuk lagi sebagai Penghasil: buka **Notifikasi** dan **Penawaran Masuk** → **Terima**. Otomatis dibuat baris baru di `orders`.

**Menandai usaha terverifikasi** (dilakukan admin): **Table Editor → profiles** → ubah kolom `terverifikasi` menjadi `true`.
Pengguna tidak bisa mengubah kolom ini sendiri.

---

## Apa saja yang sudah tersambung ke database
| Fitur | Status |
|---|---|
| Masuk/daftar lewat link email, Google (opsional) | ✅ Tersambung |
| Form verifikasi 3 peran + unggah dokumen (bucket privat `dokumen`) | ✅ Tersambung |
| Profil penghasil (ubah & simpan) | ✅ Tersambung |
| Nama & sapaan di sidebar, topbar, dan beranda | ✅ Dari tabel `profiles` |
| Posting limbah 3 langkah + foto (maks. 4) | ✅ Tersambung |
| Jelajah limbah (filter kategori, halaman), detail limbah, limbah terbaru di beranda | ✅ Tersambung |
| Ajukan penawaran (harga, jumlah, tanggal, jam, metode, catatan; total dihitung otomatis) | ✅ Tersambung |
| Penawaran Masuk (terima/tolak → membuat pesanan) & Penawaran Saya (batalkan) | ✅ Tersambung |
| Notifikasi penawaran baru (otomatis dari database) | ✅ Tersambung |
| Titik lokasi listing (dipilih di peta saat posting) & Peta Limbah | ✅ Tersambung |
| Jemput Cepat: buat permintaan → diambil Mitra Logistik → dimuat → selesai (+ notifikasi) | ✅ Tersambung |
| Pesanan, jejak limbah, pembayaran rekber, ulasan, chat, dompet, dashboard dampak, tugas logistik, tender, kalender panen | 🟡 Masih data contoh. Tabelnya (`orders`, `pickups`, `reviews`, `messages`) sudah disiapkan untuk tahap berikutnya |

Saat database aktif:
- halaman aplikasi hanya bisa dibuka setelah masuk,
- pengguna yang belum mengisi verifikasi diarahkan ke **Pilih Peran**,
- tiap akun hanya bisa membuka dashboard sesuai perannya.

## Aturan keamanan yang sudah dipasang (Row Level Security)
- Pengguna hanya bisa membuat dan mengubah **profilnya sendiri**, dan tidak bisa menandai dirinya terverifikasi.
- Listing hanya bisa diubah atau dihapus oleh **pemiliknya**. Listing aktif bisa dilihat semua orang.
- Penawaran hanya terlihat oleh **penawar** dan **pemilik listing**. Pemilik tidak bisa menawar listingnya sendiri.
- File diunggah ke folder milik pengguna sendiri. Dokumen verifikasi bersifat **privat**.

## Opsional: login OTP lewat WhatsApp
WhatsApp OTP butuh layanan berbayar (Twilio, dihitung per pesan):
1. Buat akun Twilio dan siapkan pengirim WhatsApp (perlu persetujuan WhatsApp Business).
2. Buka Supabase **Authentication → Sign In / Providers → Phone** → aktifkan → pilih **Twilio** → isi Account SID, Auth Token, dan Message Service SID.
3. Di `assets/js/db.js`, ubah `const LOGIN_VIA = 'whatsapp';`. Halaman Masuk otomatis berubah meminta nomor WhatsApp. Nomor `0812…` diubah otomatis ke format `+62812…`.

## Opsional: Masuk dengan Google
Buka **Authentication → Sign In / Providers → Google**, lalu ikuti petunjuk di halaman itu untuk membuat OAuth Client di Google Cloud Console.
Selama belum diatur, tombol "Masuk dengan Google" akan menampilkan pesan error.

## Kalau ada masalah
| Gejala | Solusi |
|---|---|
| Setelah klik **Sign in** malah ke halaman lain / error | Pastikan alamat Live Server sudah ada di **Redirect URLs** (langkah 4), dan link dibuka di browser yang sama |
| "Terlalu sering meminta kode" | Tunggu ± 1 menit (batas bawaan Supabase) |
| "Akses ditolak" | Pastikan `schema.sql` sudah di-Run sampai selesai, lalu masuk ulang |
| Halaman tetap memakai data contoh | Kunci di `db.js` belum diisi, atau internet mati sehingga library Supabase gagal dimuat |
| Lihat error lengkap | Di browser tekan **F12 → Console** |
