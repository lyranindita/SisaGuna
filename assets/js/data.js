/* =========================================================
   Data contoh SisaGuna (nanti bisa diganti data dari database)
   ========================================================= */
/* lokasi gambar: 'assets/img/' (struktur folder) atau '' (semua file di satu folder, window.FLAT) */
const ASSET_IMG = window.FLAT ? '' : 'assets/img/';
const IMG = (k) => /^(https?:|blob:|data:)/.test(k) ? k : `${ASSET_IMG}img_${k}.jpg`;

const CATS = {
  Perikanan:        { key: 'ikan',     icon: 'fish',    img: 'tulang', count: 128, desc: 'Kepala, tulang, sisik, jeroan' },
  Batik:            { key: 'batik',    icon: 'batik',   img: 'perca',  count: 94,  desc: 'Perca, malam bekas, kain gagal' },
  'Kawasan Industri': { key: 'industri', icon: 'factory', img: 'kardus', count: 41,  desc: 'Kardus, plastik, palet, logam' },
  Pertanian:        { key: 'tani',     icon: 'leaf',    img: 'sekam',  count: 67,  desc: 'Sekam, jerami, ampas teh, kulit kopi' }
};

/* Listing limbah: [kategori, judul, lokasi, berat, harga, gambar] */
const LISTINGS = [
  ['Perikanan', 'Tulang & kepala ikan tongkol', 'TPI Klidang Lor, Batang · 2,1 km', '± 250 kg', 'Rp1.500/kg', 'tulang'],
  ['Batik', 'Kain perca batik cap katun', 'Kauman, Pekalongan · 3,4 km', '± 120 kg', 'Rp4.000/kg', 'perca'],
  ['Kawasan Industri', 'Kardus & palet kayu bekas', 'KIT Batang · 18 km', '± 2 ton/bln', 'Tender', 'kardus'],
  ['Pertanian', 'Sekam & jerami padi', 'Kel. Tani Subah · 9 km', '± 1,5 ton', 'Rp300/kg', 'sekam'],
  ['Batik', 'Malam (lilin) batik bekas', 'Pesindon, Pekalongan · 2,8 km', '± 40 kg', 'Rp6.000/kg', 'malam'],
  ['Pertanian', 'Ampas & daun teh sortiran', 'Perkebunan Bawang · 22 km', '± 800 kg', 'Rp500/kg', 'teh'],
  ['Perikanan', 'Sisik & kulit ikan kakap', 'Pelabuhan Pekalongan · 4,8 km', '± 80 kg', 'Rp800/kg', 'sisik'],
  ['Batik', 'Kain batik gagal produksi', 'Wiradesa · 9 km', '± 75 kg', 'Rp4.200/kg', 'gagal'],
  ['Kawasan Industri', 'Plastik kemasan LDPE', 'KIT Batang · 18 km', '± 800 kg/bln', 'Rp2.000/kg', 'plastik'],
  ['Perikanan', 'Cangkang udang kering', 'Roban, Batang · 12 km', '± 60 kg', 'Rp2.500/kg', 'udang'],
  ['Pertanian', 'Kulit kopi kering', 'Kebun Kopi Blado · 26 km', '± 300 kg', 'Rp700/kg', 'kopi'],
  ['Perikanan', 'Jeroan ikan pindang', 'Wonokerto · 7 km', '± 150 kg', 'Rp1.000/kg', 'jeroan'],
  ['Perikanan', 'Kepala ikan layang', 'TPI Klidang Lor · 2,1 km', '± 180 kg', 'Rp1.300/kg', 'tpi'],
  ['Batik', 'Perca katun primisima', 'Buaran · 6,2 km', '± 200 kg', 'Rp3.800/kg', 'perca'],
  ['Kawasan Industri', 'Palet kayu rusak', 'Gudang Kandeman · 15 km', '± 120 unit', 'Rp15.000/unit', 'kardus'],
  ['Pertanian', 'Jerami padi kering', 'Sawah Limpung · 14 km', '± 2 ton', 'Rp250/kg', 'sekam']
];

const KATEGORI_DETAIL = {
  Perikanan: { d: 'Limbah dari TPI, pelabuhan & pengolahan ikan di pesisir Batang–Pekalongan. Cepat busuk — gunakan Jemput Cepat agar tetap segar dan bernilai.', st: [['128', 'listing aktif'], ['34', 'pengolah'], ['18 ton', 'tersalur/bln']], jenis: ['Kepala & tulang', 'Sisik', 'Jeroan', 'Kulit ikan', 'Cangkang udang', 'Cangkang kerang'], olah: [['Tepung ikan', 'tepung'], ['Pakan maggot', 'maggot'], ['Pupuk cair', 'pupuk'], ['Kolagen', 'kolagen']] },
  Batik: { d: 'Limbah non-B3 dari sentra batik & konveksi Pekalongan: kain perca, malam bekas, dan kain gagal produksi yang masih bernilai untuk upcycle.', st: [['94', 'listing aktif'], ['22', 'pengolah'], ['6 ton', 'tersalur/bln']], jenis: ['Kain perca', 'Kain gagal produksi', 'Malam (lilin) bekas', 'Potongan kayu cap', 'Benang sisa'], olah: [['Produk upcycle', 'perca'], ['Majun', 'gagal'], ['Malam daur ulang', 'malam'], ['Isian bantal', 'perca']] },
  'Kawasan Industri': { d: 'Limbah volume besar & rutin dari pabrik di Kawasan Industri Terpadu Batang: kardus, plastik kemasan, palet kayu, dan logam.', st: [['41', 'listing aktif'], ['12', 'pengolah'], ['35 ton', 'tersalur/bln']], jenis: ['Kardus', 'Plastik kemasan', 'Palet kayu', 'Logam & besi', 'Karung'], olah: [['Kertas daur ulang', 'kardus'], ['Bijih plastik', 'plastik'], ['Furnitur palet', 'kardus'], ['Rongsok terpilah', 'plastik']] },
  Pertanian: { d: 'Limbah musiman dari sawah, kebun teh & kopi di Batang. Gunakan Kalender Panen untuk pra-pesan sebelum musim panen.', st: [['67', 'listing aktif'], ['19', 'pengolah'], ['42 ton', 'tersalur/bln']], jenis: ['Sekam padi', 'Jerami', 'Ampas teh', 'Kulit kopi', 'Tongkol jagung'], olah: [['Briket', 'sekam'], ['Kompos', 'kopi'], ['Teh kompos', 'teh'], ['Media jamur', 'sekam']] }
};

const KECAMATAN = [
  ['Batang', 'Kab. Batang'], ['Gringsing', 'Kab. Batang'], ['Subah', 'Kab. Batang'], ['Bandar', 'Kab. Batang'],
  ['Limpung', 'Kab. Batang'], ['Tulis', 'Kab. Batang'], ['Pekalongan Barat', 'Kota Pekalongan'],
  ['Pekalongan Timur', 'Kota Pekalongan'], ['Pekalongan Utara', 'Kota Pekalongan'], ['Pekalongan Selatan', 'Kota Pekalongan'],
  ['Wiradesa', 'Kab. Pekalongan'], ['Kedungwuni', 'Kab. Pekalongan'], ['Buaran', 'Kab. Pekalongan']
];

const ROLES = {
  penghasil: {
    name: 'Batik Sekar Jagad', short: 'Sekar Jagad', ini: 'SJ', role: 'Penghasil Limbah', color: 'primary', home: '#/beranda',
    cta: ['Posting Limbah', 'plus', '#/posting'],
    menu: [
      ['MENU', [['Beranda', 'home', '#/beranda'], ['Jelajah Limbah', 'search', '#/jelajah'], ['Peta Limbah', 'map', '#/peta'], ['Pesanan', 'box', '#/pesanan'], ['Pesan', 'chat', '#/pesan', 3]]],
      ['FITUR KHUSUS', [['Jemput Cepat', 'zap', '#/jemput-cepat'], ['Kalender Panen', 'calendar', '#/kalender'], ['Tender & Kontrak', 'clipboard', '#/tender'], ['Butuh Bahan Baku', 'tag', '#/bahan-baku']]],
      ['AKUN', [['Dompet', 'wallet', '#/dompet'], ['Dashboard Dampak', 'chart', '#/dampak'], ['Profil', 'user', '#/profil'], ['Bantuan', 'help', '#/bantuan']]]
    ]
  },
  pengolah: {
    name: 'CV Maggot Lestari', short: 'CV Maggot Lestari', ini: 'ML', role: 'Mitra Pengolah', color: 'tani', home: '#/p/beranda',
    cta: ['Pasang Permintaan', 'plus', '#/bahan-baku'],
    menu: [
      ['MENU', [['Beranda', 'home', '#/p/beranda'], ['Cari Bahan Baku', 'search', '#/jelajah'], ['Peta Limbah', 'map', '#/peta'], ['Penawaran Saya', 'tag', '#/p/penawaran']]],
      ['OPERASIONAL', [['Gudang & Produksi', 'box', '#/p/gudang'], ['Butuh Bahan Baku', 'clipboard', '#/bahan-baku'], ['Tender & Kontrak', 'file', '#/tender'], ['Pesan', 'chat', '#/pesan']]],
      ['AKUN', [['Dompet', 'wallet', '#/dompet'], ['Dashboard Dampak', 'chart', '#/dampak'], ['Bantuan', 'help', '#/bantuan'], ['Keluar', 'logout', '#/keluar']]]
    ]
  },
  logistik: {
    name: 'Pak Darto', short: 'Pak Darto', ini: 'PD', role: 'Mitra Logistik', color: 'batik', home: '#/l/beranda',
    cta: ['Lihat Order Baru', 'truck', '#/l/order'],
    menu: [
      ['MENU', [['Beranda', 'home', '#/l/beranda'], ['Order Tersedia', 'box', '#/l/order'], ['Tugas Aktif', 'pin', '#/l/tugas'], ['Pendapatan', 'wallet', '#/l/pendapatan']]],
      ['AKUN', [['Pesan', 'chat', '#/pesan'], ['Bantuan', 'help', '#/bantuan'], ['Keluar', 'logout', '#/keluar']]]
    ]
  }
};

const NOTIFS = [
  ['tag', 'primary', 'Penawaran baru Rp1.600/kg', 'CV Maggot Lestari menawar limbah tulang ikanmu', 'Hari ini · 07.40', true, 'Transaksi', '#/penawaran-masuk'],
  ['truck', 'ikan', 'Armada tiba di lokasi', 'Pak Darto sudah di TPI Klidang Lor', 'Hari ini · 08.40', true, 'Penjemputan', '#/jejak'],
  ['wallet', 'tani', 'Dana rekber diteruskan', 'Rp451.640 masuk ke saldo SisaGuna', 'Hari ini · 09.35', false, 'Transaksi', '#/dompet'],
  ['calendar', 'tani', 'Pengingat panen 12 Des', '3 pengolah sudah pra-pesan sekam & jerami', 'Kemarin · 16.00', false, 'Penjemputan', '#/kalender'],
  ['clipboard', 'industri', 'Tender baru di KIT Batang', 'Limbah plastik kemasan LDPE · 800 kg/bln', 'Kemarin · 10.12', false, 'Sistem', '#/tender'],
  ['shield', 'primary', 'Verifikasi usaha disetujui', 'Akunmu kini bertanda Terverifikasi', 'Kemarin · 08.00', false, 'Sistem', '#/profil']
];

const ORDERS = {
  Aktif: [
    ['SG-2611-0040', 'tulang', 'Tulang & kepala ikan tongkol', 'CV Maggot Lestari', 'Rp455.000', 'Dalam penjemputan', 'primary', 'Lacak', '#/jejak', 'btn-primary'],
    ['SG-2611-0041', 'perca', 'Kain perca batik cap katun', 'Rumah Upcycle Kanoman', 'Rp486.000', 'Menunggu pembayaran', 'warning', 'Bayar', '#/bayar', 'btn-primary'],
    ['SG-2611-0042', 'sekam', 'Sekam & jerami padi', 'UD Briket Subah Jaya', 'Rp450.000', 'Pra-pesan · 12 Des', 'tani', 'Detail', '#/kalender', 'btn-plain']
  ],
  Selesai: [
    ['SG-2611-0038', 'kardus', 'Kardus & palet kayu bekas', 'PT Kemasan Nusantara', 'Rp1.300.000', 'Selesai · belum diulas', 'tani', 'Ulas', '#/ulasan', 'btn-primary'],
    ['SG-2611-0036', 'perca', 'Kain perca batik cap katun', 'Rumah Upcycle Kanoman', 'Rp462.000', 'Selesai · diulas ★5', 'tani', 'Jejak', '#/jejak', 'btn-plain'],
    ['SG-2611-0031', 'sekam', 'Sekam padi', 'UD Briket Subah Jaya', 'Rp427.500', 'Selesai · diulas ★4', 'tani', 'Jejak', '#/jejak', 'btn-plain']
  ],
  Dibatalkan: [
    ['SG-2611-0033', 'plastik', 'Plastik kemasan LDPE', 'PT Sinar Packaging', 'Rp1.600.000', 'Dibatalkan penjual', 'danger', 'Cari Serupa', '#/jelajah', 'btn-secondary'],
    ['SG-2611-0029', 'udang', 'Cangkang udang kering', 'Pakan Ternak Sejahtera', 'Rp150.000', 'Kedaluwarsa', 'warning', 'Cari Serupa', '#/jelajah', 'btn-secondary']
  ]
};

const HARVEST = {
  4: [['Panen padi · Sawah Limpung', 'Jerami ± 2 ton', 'Rp250/kg', '2 pra-pesan', 'sekam']],
  12: [['Panen padi · Kel. Tani Subah', 'Sekam & jerami ± 1,5 ton', 'Rp300/kg', '3 pra-pesan', 'sekam'], ['Petik teh · Perkebunan Bawang', 'Daun teh sortiran ± 800 kg', 'Rp500/kg', '1 pra-pesan', 'teh']],
  18: [['Petik kopi · Kebun Kopi Blado', 'Kulit kopi ± 300 kg', 'Rp700/kg', '1 pra-pesan', 'kopi']],
  22: [['Panen kelapa · Wiradesa', 'Sabut & tempurung ± 500 kg', 'Rp400/kg', 'Belum ada pra-pesan', 'kelapa']],
  27: [['Panen padi tahap 2 · Kel. Tani Subah', 'Sekam ± 1 ton', 'Rp300/kg', 'Belum ada pra-pesan', 'sekam']]
};

const TENDERS = [
  { key: 'kardus', title: 'Pengangkutan & daur ulang kardus + palet kayu', co: 'PT Kemasan Nusantara · Kawasan Industri Terpadu Batang', vol: '2 ton/bulan', dur: '12 bulan', peserta: '5 mitra', batas: '30 Nov 2026', sisa: 'Sisa 16 hari', d: 'Kami membutuhkan mitra untuk mengangkut dan mendaur ulang kardus bekas kemasan serta palet kayu rusak dari gudang produksi, dijemput 2× seminggu dengan manifest serah terima.', docs: ['RKS_Tender_Kardus.pdf', 'Spesifikasi_Palet.pdf'], harga: 'Rp650.000' },
  { key: 'plastik', title: 'Limbah plastik kemasan (LDPE)', co: 'PT Sinar Packaging · Kawasan Industri Terpadu Batang', vol: '800 kg/bulan', dur: '6 bulan', peserta: '3 mitra', batas: '23 Nov 2026', sisa: 'Sisa 9 hari', d: 'Plastik film LDPE sisa pengemasan produk, sudah dipres dalam bal 50 kg. Dijemput 1× seminggu dengan manifest serah terima.', docs: ['RKS_Tender_LDPE.pdf', 'Spesifikasi_Bal.pdf'], harga: 'Rp1.800.000' },
  { key: 'kardus', title: 'Sisa logam & besi potongan', co: 'CV Baja Utama · Gringsing, Batang', vol: '1,2 ton/bulan', dur: '12 bulan', peserta: '4 mitra', batas: '5 Des 2026', sisa: 'Sisa 21 hari', d: 'Potongan besi plat & sisa pengelasan dari bengkel fabrikasi. Wajib memiliki timbangan terkalibrasi dan izin pengepul logam.', docs: ['RKS_Tender_Logam.pdf', 'Daftar_Jenis_Logam.pdf'], harga: 'Rp4.500.000' }
];

const LOG_ORDERS = [
  ['tulang', 'Tulang & kepala ikan · 250 kg', 'TPI Klidang Lor → CV Maggot Lestari · 3 km', 'Hari ini · 10.00–12.00', 'Rp35.000', 'Butuh box pendingin', 'ikan', ['Semua', 'Butuh Pendingin', 'Pick-up'], 'urgent'],
  ['perca', 'Kain perca batik · 120 kg', 'Kauman → Rumah Upcycle Kanoman · 4 km', 'Hari ini · 13.00–15.00', 'Rp25.000', 'Pick-up biasa', 'batik', ['Semua', 'Pick-up'], 'ok'],
  ['jeroan', 'Jeroan ikan pindang · 150 kg', 'Wonokerto → Pakan Ternak Sejahtera · 6 km', 'Besok · 08.00–10.00', 'Rp30.000', 'Butuh box pendingin', 'ikan', ['Semua', 'Butuh Pendingin', 'Pick-up'], 'ok'],
  ['sekam', 'Sekam & jerami · 1,5 ton', 'Kel. Tani Subah → UD Briket Subah Jaya · 6 km', '12 Des · 08.00–10.00', 'Rp60.000', 'Butuh truk 4 ton', 'warning', ['Semua', 'Truk'], 'no'],
  ['kardus', 'Kardus & palet · 2 ton', 'KIT Batang → Daur Ulang Kandeman · 15 km', 'Kontrak · tiap Selasa', 'Rp90.000', 'Butuh truk 4 ton', 'warning', ['Semua', 'Truk'], 'no']
];
