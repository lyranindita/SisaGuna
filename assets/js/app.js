/* =========================================================
   SisaGuna Web — Single Page App (HTML + CSS + JS murni)
   Router berbasis hash (#/rute), 3 peran: penghasil, pengolah, logistik
   ========================================================= */

/* ---------- STATE ---------- */
const S = Object.assign({
  role: 'penghasil',      // peran aktif
  pickRole: 'penghasil',  // pilihan di halaman Pilih Peran
  postCat: 'Perikanan',   // kategori posting
  model: 'Jual Limbah',   // model transaksi posting
  metode: 'Mitra Logistik', // metode penjemputan saat menawar
  pay: 'QRIS',            // metode bayar
  jlCat: 'Semua', jlPage: 1, // jelajah
  katTab: 'Perikanan', petaTab: 'Semua', galeri: 0, kalDay: 12,
  tenderSel: 0, step: 1, rating: 4, tanggal: 14, jam: '10.00–12.00'
}, JSON.parse(localStorage.getItem('sisaguna') || '{}'));
S.prof = S.prof || { penghasil: {}, pengolah: {}, logistik: {} };
S.phone = S.phone || '';
S.draft = {}; S.draftFiles = []; S.cur = null; S.offerH = 1600; S.offerJ = 250;
S.pickups = S.pickups || []; S.doneOrders = S.doneOrders || []; S.curOrder = S.curOrder || 'SG-2611-0040'; S.jform = { armada: 'Pick-up berpendingin', waktu: 'Sekarang (< 2 jam)' };
const save = () => localStorage.setItem('sisaguna', JSON.stringify({ role: S.role, postCat: S.postCat, prof: S.prof, phone: S.phone, pickups: S.pickups, doneOrders: S.doneOrders, curOrder: S.curOrder }));
const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* profil pengguna aktif: diisi dari form verifikasi / profil */
function me(role = S.role) {
  const p = S.prof[role] || {};
  const nama = (p.nama || '').trim() || { penghasil: 'Penghasil Limbah', pengolah: 'Mitra Pengolah', logistik: 'Mitra Logistik' }[role];
  const ini = initials(nama);
  return Object.assign({}, p, { nama, ini, kec: p.kec || '', or: (v, d) => (p[v] || '').trim() ? p[v] : d });
}

/* ---------- HELPERS ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ck = (cat) => CATS[cat] ? CATS[cat].key : 'primary';
const photo = (k, cls = '', style = '') => `<div class="photo ${cls}" style="background-image:url('${IMG(k)}');${style}"></div>`;
const pill = (t, c) => `<span class="pill ${c}">${t}</span>`;
const ib = (ic, c, s = 44) => `<div class="icon-box ib-${c}" style="width:${s}px;height:${s}px">${I(ic)}</div>`;
const kv = (k, v, total) => `<div class="kv ${total ? 'total' : ''}"><span>${k}</span><span>${v}</span></div>`;
const note = (ic, txt, c = 'primary') => `<div class="note ${c}">${I(ic)}<span>${txt}</span></div>`;
const secHead = (t, link, go) => `<div class="row between"><div class="h3">${t}</div>${link ? `<a class="link" data-go="${go}">${link}</a>` : ''}</div>`;
const bar = (v, c) => `<div class="bar"><span style="width:${Math.round(v * 100)}%;background:var(--${c})"></span></div>`;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); }

function lcard(l) {
  const [cat, j, loc, b, h, img, id] = l; const k = ck(cat);
  return `<div class="lcard" data-go="#/detail" ${id ? `data-lid="${id}"` : ''}>${photo(img, k)}
    <div class="body">${pill(cat, k)}<div class="title">${j}</div>
      <div class="loc">${I('pin')}${loc}</div>
      <div class="foot"><span class="b6">${b}</span><span class="price">${h}</span></div></div></div>`;
}
function lrow(l) {
  const [cat, j, loc, b, h, img, id] = l; const k = ck(cat);
  return `<div class="lrow" data-go="#/detail" ${id ? `data-lid="${id}"` : ''}>${photo(img, k)}
    <div class="col gap-4 grow">${pill(cat, k)}<div class="b7 t-lg" style="font-size:15px">${j}</div>
      <div class="loc t-sm muted row gap-4">${I('pin', 'faint')}${loc}</div>
      <div class="row between"><span class="b6 t-md">${b}</span><span class="b8 c-primary">${h}</span></div></div></div>`;
}
/* dropdown: opts = [[value, sub]] */
function dd(id, label, opts, val, o = {}) {
  return `<div class="field">${label ? `<span class="label">${label}</span>` : ''}
    <div class="dd" id="${id}" data-value="${val}" ${o.name ? `data-name="${o.name}"` : ''}>
      <button type="button" class="dd-btn"><span class="dd-val ${val ? '' : 'ph'}">${val ? (o.prefix || '') + val : (o.ph || 'Pilih salah satu')}</span>${o.icon ? I(o.icon) : I('down', 'chev')}</button>
      <div class="dd-menu">${opts.map(([v, s]) => `<div class="dd-opt ${v === val ? 'sel' : ''}" data-v="${v}" data-prefix="${o.prefix || ''}">${v}${s ? `<small>${s}</small>` : ''}</div>`).join('')}</div>
    </div></div>`;
}
const input = (label, val, ph = '') => `<label class="field"><span class="label">${label}</span><input class="input" value="${val}" placeholder="${ph}"></label>`;
/* field kosong untuk data yang diisi pengguna */
const field = (label, name, ph, val = '', type = 'text') => `<label class="field"><span class="label">${label}</span><input class="input" type="${type}" name="${name}" value="${esc(val)}" placeholder="${ph}"></label>`;
const chips = (items, active, attr = 'data-single') => `<div class="chips" ${attr}>${items.map(x => `<button class="chip ${x === active ? 'active' : ''}" data-v="${x}">${x === active ? I('check') : ''}${x}</button>`).join('')}</div>`;
const multi = (items, name) => `<div class="chips" ${name ? `data-name="${name}"` : ''}>${items.map(([x, on]) => `<button type="button" class="chip chip-multi ${on ? 'on' : ''}" data-v="${x}">${I(on ? 'check' : 'plus')}${x}</button>`).join('')}</div>`;
const chk = (label, on, count = '') => `<div class="chk ${on ? 'on' : ''}"><span class="box">${I('check')}</span><span class="grow b6">${label}</span><span class="t-sm faint b6">${count}</span></div>`;
const sw = (on) => `<div class="switch ${on ? 'on' : ''}"></div>`;
/* opsi radio berbentuk kartu */
function opt(group, v, o) {
  const sel = o.sel ? 'sel' : ''; const c = o.c || 'primary';
  const media = o.img ? photo(o.img, '', 'width:48px;height:48px;border-radius:14px') : ib(o.icon, c, 48);
  return `<button type="button" class="opt-card ${sel} ${o.v ? 'v' : ''}" style="--c:var(--${c});--cl:var(--${c === 'primary' ? 'primary-light' : c + '-light'});position:relative" data-radio="${group}" data-v="${v}">
    ${media}<div class="col gap-4 grow"><span class="t">${o.t || v}</span><span class="d">${o.d || ''}</span></div>
    <span class="radio" ${o.v ? 'style="top:16px;right:16px"' : ''}>${I('check')}</span></button>`;
}
function tabsBar(set, items, active, cls = 'seg') {
  return `<div class="${cls}" data-tabset="${set}">${items.map(([v, l]) => `<button class="${cls === 'seg' ? '' : 'chip'} ${v === active ? 'active' : ''}" data-tab="${v}">${l || v}</button>`).join('')}</div>`;
}
const pane = (set, v, active, html) => `<div data-pane-of="${set}" data-pane="${v}" class="col gap-20 ${v === active ? '' : 'hidden'}">${html}</div>`;
function stat(ic, c, v, k, go) { return `<div class="stat" ${go ? `data-go="${go}"` : ''}>${ib(ic, c, 48)}<div><div class="v">${v}</div><div class="k">${k}</div></div></div>`; }
function mapArt(h, pins = true, extra = '') {
  const P = [['fish', 'ikan', 15, 24], ['fish', 'ikan', 58, 25], ['fish', 'ikan', 30, 28], ['batik', 'batik', 55, 48], ['batik', 'batik', 70, 52], ['batik', 'batik', 48, 66], ['factory', 'industri', 82, 62], ['factory', 'industri', 12, 50], ['leaf', 'tani', 25, 75], ['leaf', 'tani', 42, 82], ['leaf', 'tani', 62, 84]];
  return `<div class="map" style="height:${h}px"><div class="sea"></div>
    <div class="road" style="left:0;right:0;top:40%;height:10px"></div><div class="road" style="left:0;right:0;top:70%;height:8px"></div>
    <div class="road" style="left:30%;top:22%;bottom:0;width:8px"></div><div class="road" style="left:68%;top:22%;bottom:0;width:10px"></div>
    <div class="lbl" style="left:24px;top:calc(22% - 30px);color:var(--ikan)">Laut Jawa</div>
    <div class="lbl" style="left:8%;top:33%">BATANG</div><div class="lbl" style="left:52%;top:55%">PEKALONGAN</div><div class="lbl" style="left:80%;top:73%">Gringsing</div><div class="lbl" style="left:36%;top:88%">Subah</div>
    ${pins ? `<div class="me" style="left:42%;top:45%"></div>` + P.map(([ic, c, x, y]) => `<div class="pin" style="left:${x}%;top:${y}%;background:var(--${c})" data-go="#/detail">${I(ic)}</div>`).join('') : ''}
    ${extra}</div>`;
}

/* ---------- SHELLS ---------- */
function logo(white) { return `<div class="logo ${white ? 'white' : ''}" data-go="#/"><img src="${ASSET_IMG}logo.svg" alt="SisaGuna"><b>Sisa<span>Guna</span></b></div>`; }
function sidebar() {
  const R = ROLES[S.role]; const here = location.hash || '#/';
  return `<aside class="sidebar">
    <div class="logo" data-go="${R.home}"><img src="${ASSET_IMG}logo.svg" alt=""><b>Sisa<span>Guna</span></b></div>
    ${S.role !== 'penghasil' ? `<div style="margin-top:8px">${pill(R.role, R.color)}</div>` : ''}
    <div style="height:14px"></div>
    <button class="btn btn-primary btn-block" data-go="${R.cta[2]}">${I(R.cta[1])}${R.cta[0]}</button>
    ${sideMenu(R).map(([g, items]) => `<div class="nav-group">${g}</div>` + items.map(([l, ic, go, badge]) =>
      `<div class="nav-item ${here === go ? 'active' : ''} ${l === 'Keluar' ? 'danger' : ''}" data-go="${go}">${I(ic)}<span>${l}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</div>`).join('')).join('')}
    <div class="user-card"><div class="avatar ib-${R.color}">${me().ini}</div><div class="grow"><div class="b7 t-md ellipsis">${esc(me().nama)}</div><div class="t-xs muted">${R.role}${verifLabel()}</div></div></div>
  </aside>`;
}
/* menu: Pesanan untuk pengolah & logistik (mode database), Verifikasi Mitra untuk admin */
function sideMenu(R) {
  const menu = R.menu.map(([g, items]) => [g, items.slice()]);
  if (DB.on && S.role !== 'penghasil' && !menu.some(([, it]) => it.some(x => x[2] === '#/pesanan'))) menu[0][1].push(['Pesanan', 'box', '#/pesanan']);
  if (isAdmin()) menu[menu.length - 1][1].splice(Math.max(0, menu[menu.length - 1][1].length - 1), 0, ['Verifikasi Mitra', 'shield', '#/admin']);
  return menu;
}
function verifLabel() {
  if (!DB.on || !DB.profile) return '';
  const v = DB.profile.verif_status || (DB.profile.terverifikasi ? 'disetujui' : 'belum');
  return { disetujui: ' · <span class="c-tani b7">Terverifikasi ✓</span>', menunggu: ' · <span class="c-warning b7">Menunggu verifikasi</span>', ditolak: ' · <span class="c-danger b7">Verifikasi ditolak</span>' }[v] || '';
}
function topbar(title, sub) {
  const R = ROLES[S.role];
  const notif = { penghasil: '#/notifikasi', pengolah: '#/p/penawaran', logistik: '#/l/order' }[S.role];
  const prof = S.role === 'penghasil' ? '#/profil' : R.home;
  return `<header class="topbar"><div class="tb-title"><h1>${title}</h1><div class="sub">${sub || 'Batang–Pekalongan'}</div></div>
    <div class="row">
      <div class="search">${I('search')}<input placeholder="Cari limbah, bahan baku, mitra…" data-enter="#/jelajah"></div>
      <button class="icon-btn" data-go="#/pesan" title="Pesan">${I('chat')}</button>
      <button class="icon-btn" data-go="${notif}" title="Notifikasi">${I('bell')}<span class="dot"></span></button>
      <div class="av-chip" data-go="${prof}" title="${esc(me().nama)}"><div class="avatar ib-${R.color}">${me().ini}</div><span class="ellipsis">${esc(me().nama)}</span>${I('chevron', 'faint')}</div>
    </div></header>`;
}
const appShell = (title, sub, body) => `<div class="shell">${sidebar()}<div class="main-wrap">${topbar(title, sub)}<main class="content">${body}</main></div></div>`;
function authShell(body) {
  return `<div class="auth"><aside class="auth-panel">${logo(true)}
    <div class="col gap-20"><h2>Sisa jadi <span style="color:#BFE3FF">Guna.</span></h2>
      <p>Marketplace B2B yang menyalurkan limbah perikanan, batik, kawasan industri, dan pertanian di Batang–Pekalongan ke pendaur ulang terverifikasi.</p>
      <div class="row wrap gap-8">${[['Perikanan', 'fish'], ['Batik', 'batik'], ['Kawasan Industri', 'factory'], ['Pertanian', 'leaf']].map(([l, i]) => `<span class="auth-chip">${I(i)}${l}</span>`).join('')}</div></div>
    <div class="auth-stats"><div><b>1.240 ton</b><small>limbah tersalurkan</small></div><div><b>380+</b><small>mitra terverifikasi</small></div><div><b>4 sektor</b><small>industri lokal</small></div></div>
  </aside><section class="auth-form"><div class="inner">${body}</div></section></div>`;
}
function stepper(n, labels = ['Kategori', 'Detail Limbah', 'Harga & Lokasi']) {
  return `<div class="stepper">${labels.map((l, i) => { const k = i + 1; const st = k < n ? 'done' : (k === n ? 'cur' : '');
    return `<div class="step ${st}"><div class="n">${k < n ? I('check') : k}</div><div><div class="t-xs faint b6">Langkah ${k}</div><div class="b8">${l}</div></div></div>${k < labels.length ? `<div class="step-line ${k < n ? 'done' : ''}"></div>` : ''}`; }).join('')}</div>`;
}
const authSteps = (n, label) => `<div class="col gap-8"><div class="row between t-md"><span class="b7 c-primary">Langkah ${n} dari 3</span><span class="muted">${label}</span></div>
  <div class="row gap-8">${[1, 2, 3].map(k => `<div class="grow" style="height:6px;border-radius:3px;background:var(--${k <= n ? 'primary' : 'border'})"></div>`).join('')}</div></div>`;

/* =========================================================
   VIEWS
   ========================================================= */
const V = {};

/* ---------- LANDING ---------- */
V.landing = () => `
<nav class="l-nav">${logo()}
  <div class="links"><a data-scroll="#tentang">Tentang</a><a data-scroll="#kategori">Kategori</a><a data-scroll="#cara-kerja">Cara Kerja</a><a data-scroll="#fitur">Fitur</a><a data-scroll="#dampak">Dampak</a></div>
  <div class="row"><button class="btn btn-plain btn-sm" data-go="#/masuk">Masuk</button><button class="btn btn-primary btn-sm" data-go="#/masuk">Daftar Gratis</button></div></nav>
<header class="l-hero" id="top">
  <div class="col gap-24" style="max-width:600px">
    <span class="auth-chip" style="align-self:flex-start">${I('pin')}Khusus Batang–Pekalongan</span>
    <h1>Sisa jadi<br><span style="color:#BFE3FF">Guna.</span></h1>
    <p>Marketplace B2B daur ulang limbah industri. Salurkan limbah perikanan, batik, pabrik, dan pertanian ke pendaur ulang terverifikasi — cepat, legal, dan terlacak.</p>
    <div class="row"><button class="btn btn-white" data-go="#/masuk">${I('recycle')}Mulai Salurkan Limbah</button><button class="btn btn-ghost-white" data-go="#/masuk">Jelajahi Limbah</button></div>
    <div class="row gap-24" style="gap:40px">${[['1.240 ton', 'limbah tersalurkan'], ['380+', 'mitra terverifikasi'], ['Rp2,1 M', 'nilai transaksi']].map(([v, k]) => `<div><div style="font-size:26px;font-weight:800">${v}</div><div class="t-md b6" style="color:var(--primary-light)">${k}</div></div>`).join('')}</div>
  </div>
  <div class="row grow gap-20" style="align-items:flex-start;justify-content:center">
    <div class="col gap-20" style="width:268px">${lcard(LISTINGS[0])}<div class="card row soft" style="box-shadow:var(--shadow)">${ib('cloud', 'tani')}<div><div class="t-sm muted b6">CO₂e dihindari</div><div class="b8 t-xl">1.980 ton</div></div></div></div>
    <div style="width:268px;margin-top:60px">${lcard(LISTINGS[1])}</div>
  </div>
</header>
<section class="l-sec white about" id="tentang">
  <div class="about-wrap">
    <figure class="about-photo">
      <img src="${ASSET_IMG}foto-lyra.jpg" alt="Foto Lyra Anindita Ferani" width="600" height="800" loading="lazy">
      <figcaption class="about-badge">${I('pin')}Batang, Jawa Tengah</figcaption>
    </figure>
    <div class="about-body">
      <span class="eyebrow">Tentang Pengembang</span>
      <h2>Lyra Anindita Ferani</h2>
      <p class="about-role">Mahasiswi S1 Bisnis Digital · UIN K.H. Abdurrahman Wahid Pekalongan</p>
      <p class="about-bio">Saya berasal dari Kabupaten Batang dan tertarik pada titik temu antara bisnis, data, dan desain. SisaGuna adalah proyek yang saya kerjakan dari riset model bisnis, perancangan UI/UX, hingga menjadi website yang bisa dipakai langsung oleh pelaku usaha di daerah saya.</p>
      <div class="about-fields">${[['Penelitian Bisnis', 'chart'], ['Analisis Data', 'trend'], ['Desain', 'image'], ['UI/UX', 'grid']].map(([t, ic]) => `<span class="chip">${I(ic)}${t}</span>`).join('')}</div>
      <div class="about-story">
        <h3>Awal mula riset SisaGuna</h3>
        <div class="about-steps">${[
          ['Ide awal', 'Berawal dari konsep marketplace B2B untuk jasa pemulihan, refurbish, dan upcycling.'],
          ['Fokus ke daerah sendiri', 'Ide dipersempit menjadi jasa daur ulang limbah industri di Batang–Pekalongan: perikanan, batik non-B3, kawasan industri & pabrik, serta pertanian & perkebunan.'],
          ['Model bisnis', 'Peluang dan alur nilainya dirumuskan lewat Business Model Canvas (BMC) dan DMC.'],
          ['Dari desain ke website', 'Antarmuka dirancang di Figma, lalu dibangun sebagai website (bukan aplikasi Android) agar lebih cepat diluncurkan dan mudah diakses mitra.']
        ].map(([t, d], i) => `<div class="about-step"><span class="num">${i + 1}</span><div><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>
      </div>
      <div class="about-links">
        <a class="btn btn-primary btn-sm" href="https://lyranindita.github.io/" target="_blank" rel="noopener">${I('user')}Portofolio</a>
        <a class="btn btn-outline btn-sm" href="https://digital-flow-space.blogspot.com/" target="_blank" rel="noopener">${I('edit')}Blog UI/UX</a>
        <a class="btn btn-outline btn-sm" href="https://github.com/lyranindita/SisaGuna" target="_blank" rel="noopener">${I('file')}Kode di GitHub</a>
      </div>
    </div>
  </div>
</section>
<section class="l-sec" id="kategori"><div class="head"><h2>4 Sektor Limbah Utama Batang–Pekalongan</h2><p>Setiap kategori punya alur yang menyesuaikan sifat limbahnya.</p></div>
  <div class="grid-4">${Object.entries(CATS).map(([n, c]) => `<div class="card col cat-card">${photo(c.img, c.key)}<div class="h3">${n}</div><div class="muted">${KATEGORI_DETAIL[n].d.split('.')[0]}.</div><div class="note ${c.key === 'industri' ? 'primary' : (c.key === 'batik' ? 'warning' : c.key)} t-sm">→ ${KATEGORI_DETAIL[n].olah.map(o => o[0]).join(' · ')}</div></div>`).join('')}</div></section>
<section class="l-sec white" id="cara-kerja"><div class="head"><h2>Cara Kerja SisaGuna</h2><p>Dari limbah sampai dana cair, semua tercatat dan aman.</p></div>
  <div class="grid-4">${[['plus', 'Posting limbah', 'Foto, jenis, berat & lokasi. Form menyesuaikan kategori.'], ['tag', 'Terima penawaran', 'Pengolah terdekat menawar. Bandingkan & pilih yang terbaik.'], ['truck', 'Jemput & timbang', 'Mitra logistik menjemput, menimbang & mengunggah bukti.'], ['shield', 'Dana rekber cair', 'Dana diteruskan setelah limbah diterima sesuai berat.']].map(([ic, t, d], i) => `<div class="card col" style="background:var(--bg);border:0"><div class="row between">${ib(ic, 'primary', 48)}<span style="font-size:36px;font-weight:800;color:var(--primary-light)">${i + 1}</span></div><div class="h3">${t}</div><div class="muted">${d}</div></div>`).join('')}</div></section>
<section class="l-sec" id="fitur"><div class="head"><h2>Fitur Khusus untuk Industri Lokal</h2><p>Dibangun dari karakter limbah tiap sektor di Batang–Pekalongan.</p></div>
  <div class="grid-2">${[['zap', 'ikan', 'Jemput Cepat', 'Limbah ikan cepat busuk — armada berpendingin terdekat datang < 2 jam.'], ['calendar', 'tani', 'Kalender Panen', 'Pra-pesan sekam, jerami & ampas teh sebelum musim panen tiba.'], ['clipboard', 'industri', 'Tender & Kontrak', 'Pabrik di kawasan industri membuka tender volume besar & rutin.'], ['chart', 'primary', 'Rekber & Laporan ESG', 'Pembayaran aman via rekber dan laporan dampak siap untuk PROPER/ESG.']].map(([ic, c, t, d]) => `<div class="card row gap-16">${ib(ic, c, 60)}<div class="col gap-4"><div class="h3">${t}</div><div class="muted">${d}</div></div></div>`).join('')}</div></section>
<section class="l-sec white" id="dampak"><div class="head"><h2>Dampak Bersama di Batang–Pekalongan</h2><p>Angka yang tercatat otomatis dari setiap transaksi di SisaGuna.</p></div>
  <div class="grid-4">${[['recycle', 'primary', '1.240 ton', 'limbah tersalurkan'], ['cloud', 'tani', '1.980 ton', 'CO₂e dihindari'], ['user', 'batik', '380+', 'mitra terverifikasi'], ['wallet', 'industri', 'Rp2,1 M', 'nilai ekonomi sirkular']].map(([ic, c, v, k]) => `<div class="card col" style="background:var(--bg);border:0">${ib(ic, c, 48)}<div style="font-size:30px;font-weight:800">${v}</div><div class="muted b6">${k}</div></div>`).join('')}</div></section>
<div style="padding-top:80px"></div>
<div class="l-cta"><div><div style="font-size:30px;font-weight:800">Siap mengubah limbah jadi nilai?</div><div style="color:var(--primary-light);font-size:16px">Gratis daftar. Verifikasi usaha selesai maks. 1×24 jam.</div></div><button class="btn btn-white" data-go="#/masuk">Daftar Sekarang</button></div>
<footer class="l-foot"><div class="col" style="max-width:360px">${logo()}<p class="muted">Marketplace B2B daur ulang limbah industri untuk Kabupaten Batang & Pekalongan.</p><span class="t-sm faint b6">© 2026 SisaGuna</span><a class="link" data-scroll="#top">↑ Kembali ke atas</a></div>
  ${[['Platform', ['Jelajah Limbah', 'Posting Limbah', 'Tender', 'Kalender Panen']], ['Perusahaan', ['Tentang Kami', 'Mitra', 'Karier']], ['Bantuan', ['Pusat Bantuan', 'Syarat & Ketentuan', 'Kebijakan Privasi']]].map(([h, ls]) => `<div class="col"><b>${h}</b>${ls.map(l => `<a data-go="#/masuk">${l}</a>`).join('')}</div>`).join('')}</footer>
<button class="to-top" data-scroll="#top" aria-label="Kembali ke atas">${I('chevron')}</button>`;

/* ---------- AUTH ---------- */
const VIA_EMAIL = () => DB.on && LOGIN_VIA === 'email';
const OTP_MODE = () => !VIA_EMAIL() || EMAIL_MODE === 'otp';
V.masuk = () => authShell(`
  <a class="link" data-go="#/">← Kembali ke beranda</a>
  <div class="col gap-8"><div class="h1" style="font-size:30px">Masuk ke akunmu 👋</div><p class="muted">${VIA_EMAIL() ? (OTP_MODE() ? `Masukkan email usahamu. Kami akan mengirim kode OTP ${OTP_LENGTH} digit ke email tersebut.` : 'Masukkan email usahamu. Kami akan mengirim link masuk ke email tersebut.') : 'Gunakan nomor WhatsApp yang terdaftar. Kami akan mengirim kode OTP untuk verifikasi.'}</p></div>
  ${VIA_EMAIL()
    ? `<label class="field"><span class="label">Email</span><input class="input" type="email" inputmode="email" name="login" value="${esc(S.loginId || '')}" placeholder="nama@usaha.com" autocomplete="email"></label>`
    : `<label class="field"><span class="label">Nomor WhatsApp</span><input class="input" type="tel" inputmode="tel" name="login" value="${esc(S.phone)}" placeholder="Contoh: 0812 3456 7890" autocomplete="tel"></label>`}
  ${chk('Saya menyetujui Syarat & Ketentuan serta Kebijakan Privasi', true)}
  <button class="btn btn-primary btn-block" data-send-otp>${OTP_MODE() ? 'Kirim Kode OTP' : 'Kirim Link Masuk'}</button>
  <div class="row"><div class="divider grow"></div><span class="t-sm faint">atau</span><div class="divider grow"></div></div>
  <button class="btn btn-outline btn-block" data-google>Masuk dengan Google</button>
  <p class="muted" style="text-align:center">Belum punya akun? Akun baru otomatis dibuat saat pertama kali masuk, lalu kamu diminta memilih peran & melengkapi data usaha.</p>`);

V.otp = () => authShell(`
  <a class="link" data-go="#/masuk">← Ganti ${VIA_EMAIL() ? 'email' : 'nomor'}</a>
  ${OTP_MODE()
    ? `<div class="col" style="align-items:center;text-align:center">${ib('shield', 'primary', 96)}<div class="h1" style="font-size:30px">Masukkan kode OTP</div><p class="muted">Kode ${OTP_LENGTH} digit telah dikirim ke ${VIA_EMAIL() ? 'email' : 'WhatsApp'} <b>${esc(S.loginId || S.phone) || 'kamu'}</b>.${VIA_EMAIL() ? ' Cek juga folder Spam.' : ''}</p></div>
       <div class="otp" style="--otp-n:${OTP_LENGTH}">${Array(OTP_LENGTH).fill('<input maxlength="1" inputmode="numeric" value="" autocomplete="one-time-code">').join('')}</div>
       <p class="muted" style="text-align:center">Belum menerima kode? <a class="link" data-resend>Kirim ulang</a></p>
       <button class="btn btn-primary btn-block" data-verify-otp>Verifikasi</button>
       ${VIA_EMAIL() ? `<p class="t-sm faint" style="text-align:center">Email berisi tombol "Sign in", bukan kode? Klik saja tombol itu di email, kamu akan otomatis masuk.</p>` : ''}`
    : `<div class="col" style="align-items:center;text-align:center">${ib('send', 'primary', 96)}<div class="h1" style="font-size:30px">Cek email kamu</div><p class="muted">Kami mengirim email ke <b>${esc(S.loginId) || 'kamu'}</b>. Buka email itu lalu klik <b>Sign in</b> — kamu otomatis masuk. Cek juga folder Spam.</p></div>
       <p class="muted" style="text-align:center">Belum menerima email? <a class="link" data-resend>Kirim ulang</a></p>`}`);

const ROLE_OPTS = [
  ['penghasil', 'Penghasil Limbah', 'kardus', 'primary', 'Pabrik, UMKM batik, TPI/nelayan, kebun & kelompok tani yang ingin menyalurkan limbah.', 'Verifikasi data usaha penghasil limbah'],
  ['pengolah', 'Mitra Pengolah', 'maggot', 'tani', 'Pendaur ulang, pengrajin upcycle, peternak, pabrik pakan & pupuk yang butuh bahan baku.', 'Verifikasi data pengolahan & izin usaha'],
  ['logistik', 'Mitra Logistik', 'truk', 'batik', 'Pemilik armada angkut lokal untuk menjemput & mengantar limbah.', 'Verifikasi armada, plat nomor & wilayah layanan']
];
V.peran = () => {
  const cur = ROLE_OPTS.find(r => r[0] === S.pickRole);
  return authShell(`
  <div class="col gap-8"><div class="h1" style="font-size:30px">Kamu bergabung sebagai?</div><p class="muted">Pilih peran utama. Kamu bisa menambah peran lain nanti di Profil.</p></div>
  <div class="col" data-radio-group="peran">${ROLE_OPTS.map(([v, t, img, c, d]) => opt('peran', v, { t, img, c, d, sel: v === S.pickRole })).join('')}</div>
  ${note('info', 'Langkah berikutnya: ' + cur[5])}
  <button class="btn btn-primary btn-block" id="btn-peran" data-go="#/verifikasi/${cur[0]}">Lanjutkan sebagai ${cur[1]}</button>`);
};

V.verif = (who) => {
  const P = S.prof[who] || {}; S.ocr = null; S.ocrText = null;
  const upload = (t, d) => `<label class="upload">${ib('upload', 'primary')}<div class="col gap-4"><b class="c-primary">${t}</b><span class="t-sm muted">${d}</span></div><input type="file" name="dokumen" accept="image/*,application/pdf" hidden data-file-label></label><div id="ocr-box" class="col gap-8"><span class="t-xs muted">Foto dokumen (JPG/PNG) dibaca otomatis untuk mencocokkan NIB & nama usaha.</span></div>`;
  const wa = () => field('Nomor WhatsApp', 'wa', 'Contoh: 0812 3456 7890', P.wa || S.phone, 'tel');
  const actions = (go) => `<div class="grid-2"><button class="btn btn-outline" data-back>Kembali</button><button class="btn btn-primary" data-go="${go}" data-role="${who}">Kirim Verifikasi</button></div>`;
  const kec = () => dd('dd-kec', 'Kecamatan', KECAMATAN, P.kec || '', { name: 'kec', ph: 'Pilih kecamatan' });
  const has = (k, v) => (P[k] || []).includes(v);
  if (who === 'pengolah') return authShell(`${authSteps(2, 'Data Pengolah')}
    <div class="col gap-8"><div class="h1">Verifikasi mitra pengolah</div><p class="muted">Data ini dipakai untuk mencocokkan limbah yang sesuai dengan kemampuan olahmu.</p></div>
    <div class="grid-2">${field('Nama usaha', 'nama', 'Contoh: CV Maggot Lestari', P.nama)}${field('NIB', 'nib', '13 digit Nomor Induk Berusaha', P.nib)}
      ${dd('dd-olah', 'Jenis olahan', [['Pakan ternak & maggot'], ['Pupuk & kompos'], ['Daur ulang plastik & kertas'], ['Upcycle kain & kerajinan'], ['Briket & biomassa']], P.olah || '', { name: 'olah', ph: 'Pilih jenis olahan' })}${kec()}</div>
    <span class="label">Kategori limbah yang diterima (bisa pilih lebih dari satu)</span>${multi(['Perikanan', 'Batik', 'Kawasan Industri', 'Pertanian'].map(x => [x, has('kategori', x)]), 'kategori')}
    <div class="grid-2">${field('Kapasitas olah per bulan', 'kapasitas', 'Contoh: 8 ton', P.kapasitas)}${wa()}</div>${upload('Unggah izin usaha pengolahan / UKL-UPL', 'PDF/JPG maks. 5 MB')}${actions('#/p/beranda')}`);
  if (who === 'logistik') return authShell(`${authSteps(2, 'Data Armada')}
    <div class="col gap-8"><div class="h1">Verifikasi mitra logistik</div><p class="muted">Armada terverifikasi akan menerima order jemput limbah di wilayah layananmu.</p></div>
    <div class="grid-2">${field('Nama pemilik / usaha', 'nama', 'Contoh: Darto Logistik', P.nama)}${field('Nomor plat', 'plat', 'Contoh: G 1234 AB', P.plat)}
      ${dd('dd-armada', 'Jenis armada', [['Pick-up bak terbuka', 'Kapasitas ± 1 ton'], ['Pick-up berpendingin', 'Box dingin 4°C · ± 1 ton'], ['Truk box 4 ton', 'Untuk volume pabrik'], ['Motor roda tiga', 'Muatan ± 300 kg']], P.armada || '', { name: 'armada', ph: 'Pilih jenis armada' })}${kec()}</div>
    <div class="grid-2">${field('Kapasitas angkut', 'kapasitas', 'Contoh: 1 ton', P.kapasitas)}${wa()}</div>
    <div class="note ikan" style="justify-content:space-between"><div class="row">${ib('zap', 'ikan', 40)}<div><b>Armada punya box berpendingin</b><div class="t-sm muted">Wajib untuk menerima order Jemput Cepat limbah ikan</div></div></div>${sw(!!P.pendingin).replace('class="switch', 'data-name="pendingin" class="switch')}</div>
    <span class="label">Wilayah layanan</span>${multi(['Kab. Batang', 'Kota Pekalongan', 'Kab. Pekalongan'].map(x => [x, has('wilayah', x)]), 'wilayah')}
    ${upload('Unggah STNK, SIM & foto armada', 'JPG/PDF maks. 5 MB')}${actions('#/l/beranda')}`);
  return authShell(`${authSteps(2, 'Data Usaha')}
    <div class="col gap-8"><div class="h1">Verifikasi usahamu</div><p class="muted">Akun terverifikasi lebih dipercaya mitra dan bisa bertransaksi via rekber.</p></div>
    <div class="grid-2">${field('Nama Usaha', 'nama', 'Contoh: UD Batik Sekar Jagad', P.nama)}${field('NIB', 'nib', '13 digit Nomor Induk Berusaha', P.nib)}
      ${dd('dd-usaha', 'Jenis Usaha', [['Perikanan', 'TPI, nelayan, pengolahan ikan'], ['Batik & Konveksi', 'Sentra batik, konveksi, garmen'], ['Pabrik & Industri', 'Kawasan industri, pabrik, gudang'], ['Pertanian & Perkebunan', 'Kelompok tani, kebun teh & kopi']], P.usaha || '', { name: 'usaha', ph: 'Pilih jenis usaha' })}${kec()}</div>
    <div class="grid-2">${field('Alamat Lengkap', 'alamat', 'Nama jalan, nomor, kelurahan/desa', P.alamat)}${wa()}</div>
    ${upload('Unggah foto lokasi usaha & dokumen NIB', 'JPG/PNG/PDF maks. 5 MB · seret file ke sini')}
    ${note('info', 'Untuk limbah B3 wajib unggah izin pengelolaan. Verifikasi selesai maks. 1×24 jam.', 'warning')}${actions('#/beranda')}`);
};

/* ---------- PENGHASIL: BERANDA ---------- */
V.beranda = () => appShell('Beranda', 'Selamat datang kembali', `
  <div class="hero"><div class="col gap-8"><h2>Halo, ${esc(me('penghasil').nama)} 👋</h2><p>Ada 3 penawaran baru untuk limbahmu hari ini.</p>
      <div class="row" style="margin-top:8px"><button class="btn btn-white" data-go="#/posting">${I('plus')}Posting Limbah</button><button class="btn btn-ghost-white" data-go="#/penawaran-masuk">Lihat Penawaran</button></div></div>
    <div class="card row clickable" style="width:340px;color:var(--text)" data-go="#/dampak">${ib('cloud', 'tani', 52)}<div class="grow"><div class="t-sm muted b6">Dampakmu bulan ini</div><div class="b8 t-xl">1,2 ton tersalurkan</div><div class="t-sm b7 c-tani">± 1,9 ton CO₂e dihindari</div></div>${I('chevron', 'faint')}</div></div>
  <div class="grid-4">${stat('recycle', 'tani', '1,2 ton', 'Limbah tersalurkan', '#/dampak')}${stat('wallet', 'primary', 'Rp3,4 jt', 'Pendapatan bulan ini', '#/dompet')}${stat('tag', 'batik', '3', 'Penawaran baru', '#/penawaran-masuk')}${stat('truck', 'ikan', '2', 'Pesanan berjalan', '#/pesanan')}</div>
  <div class="two-col r340"><div class="col gap-20">
      ${secHead('Kategori Limbah', 'Lihat kategori', '#/kategori')}
      <div class="grid-4">${Object.entries(CATS).map(([n, c]) => `<div class="card row clickable" style="padding:14px" data-go="#/kategori" data-kat="${n}">${photo(c.img, c.key, 'width:44px;height:44px;border-radius:14px')}<div><div class="b8">${n === 'Kawasan Industri' ? 'Industri' : n}</div><div class="t-xs muted b6">${c.count} listing</div></div></div>`).join('')}</div>
      ${secHead('Limbah Terbaru di Sekitarmu', 'Lihat semua', '#/jelajah')}
      <div class="grid-cards cols-3" id="latest">${[0, 1, 3].map(i => lcard(LISTINGS[i])).join('')}</div></div>
    <div class="col gap-16">
      <div class="hero" style="padding:18px;border-radius:20px;background:linear-gradient(135deg,#0EA5E9,#38BDF8);cursor:pointer" data-go="#/jemput-cepat"><div class="row"><div class="icon-box" style="background:rgba(255,255,255,.25);color:#fff">${I('zap')}</div><div><b>Jemput Cepat Limbah Ikan</b><div class="t-sm">Armada berpendingin datang &lt; 2 jam</div></div></div>${I('chevron')}</div>
      ${[['calendar', 'tani', 'Kalender Panen', 'Pra-pesan limbah panen 12 Des', '#/kalender'], ['clipboard', 'industri', 'Tender & Kontrak', '2 tender aktif di KIT Batang', '#/tender'], ['tag', 'batik', 'Butuh Bahan Baku', 'Pasang permintaan sebagai pengolah', '#/bahan-baku']].map(([ic, c, t, d, go]) => `<div class="card row clickable" style="padding:14px" data-go="${go}">${ib(ic, c, 40)}<div class="grow"><b>${t}</b><div class="t-sm muted">${d}</div></div>${I('chevron', 'faint')}</div>`).join('')}
      <div class="card col">${secHead('Pesanan Aktif', 'Semua', '#/pesanan')}
        <div class="row clickable" data-go="#/jejak">${photo('tulang', '', 'width:36px;height:36px')}<div class="col gap-4"><b class="t-md">Tulang ikan · CV Maggot Lestari</b>${pill('Dalam penjemputan', 'primary')}</div></div>
        <div class="row clickable" data-go="#/bayar">${photo('perca', '', 'width:36px;height:36px')}<div class="col gap-4"><b class="t-md">Perca batik · Rumah Upcycle</b>${pill('Menunggu pembayaran', 'warning')}</div></div></div>
    </div></div>`);

/* ---------- KATEGORI ---------- */
function katPane(n) {
  const c = CATS[n], d = KATEGORI_DETAIL[n];
  return `<div class="card row gap-24" style="background:var(--${c.key}-light);border:0;padding:24px">${photo(c.img, '', 'width:200px;height:140px;border-radius:20px')}
      <div class="col gap-8 grow"><div class="h1" style="font-size:30px">${n}</div><p class="muted b6" style="line-height:1.6">${d.d}</p></div>
      <div class="row">${d.st.map(([v, k]) => `<div class="card col gap-4" style="align-items:center;padding:14px 18px;border:0"><b class="c-${c.key}" style="font-size:20px">${v}</b><span class="t-xs muted b6">${k}</span></div>`).join('')}</div></div>
    <div class="grid-2"><div class="card col"><div class="h3">Jenis Limbah</div><div class="chips">${d.jenis.map(j => `<span class="chip">${j}</span>`).join('')}</div></div>
      <div class="card col"><div class="h3">Bisa Diolah Menjadi</div><div class="grid-4" style="gap:10px">${d.olah.map(([l, k]) => `<div class="col gap-8" style="background:var(--bg);border-radius:14px;padding:8px;align-items:center">${photo(k, '', 'width:100%;height:72px;border-radius:10px')}<b class="t-sm">${l}</b></div>`).join('')}</div></div></div>
    ${secHead('Listing ' + n + ' Terbaru', 'Lihat semua di Jelajah', '#/jelajah')}
    <div class="grid-cards cols-4">${LISTINGS.filter(l => l[0] === n).slice(0, 4).map(lcard).join('')}</div>`;
}
V.kategori = () => appShell('Kategori Limbah', 'Perikanan · Batik · Industri · Pertanian', `
  ${tabsBar('kat', Object.keys(CATS).map(k => [k]), S.katTab, 'chips')}
  ${Object.keys(CATS).map(k => pane('kat', k, S.katTab, katPane(k))).join('')}`);

/* ---------- JELAJAH ---------- */
function jelajahResults() {
  if (DB.on) return jelajahDB();
  let items, info, pag = false;
  if (S.jlCat === 'Semua') { items = LISTINGS.slice((S.jlPage - 1) * 6, S.jlPage * 6); info = `86 limbah ditemukan · halaman ${S.jlPage} dari 15`; pag = true; }
  else { items = LISTINGS.filter(l => l[0] === S.jlCat); info = `${CATS[S.jlCat].count} limbah ${S.jlCat.toLowerCase()} ditemukan`; }
  return `<div class="chips">${['Semua', ...Object.keys(CATS)].map(c => `<button class="chip ${c === S.jlCat ? 'active' : ''}" data-jlcat="${c}">${c}</button>`).join('')}</div>
    <span class="muted b6 t-md">${info}</span>
    <div class="grid-cards cols-3">${items.map(lcard).join('')}</div>
    ${pag ? `<div class="row" style="justify-content:center">${['‹', '1', '2', '3', '…', '15', '›'].map(p => { const on = String(S.jlPage) === p;
      const tgt = p === '‹' ? 1 : p === '›' ? 2 : (p === '1' || p === '2') ? +p : 0;
      return `<button class="icon-btn" style="width:38px;height:38px;${on ? 'background:var(--primary);color:#fff;border:0' : ''}" ${tgt ? `data-jlpage="${tgt}"` : ''}><b>${p}</b></button>`; }).join('')}</div>` : ''}`;
}
V.jelajah = () => appShell(S.role === 'pengolah' ? 'Cari Bahan Baku' : 'Jelajah Limbah', DB.on ? 'Limbah tersedia di Batang–Pekalongan' : '86 limbah tersedia di Batang–Pekalongan', `
  <div class="two-col l260">
    <aside class="card col gap-16 sticky"><div class="row between"><div class="h3">Filter</div><a class="link" data-toast="Filter direset">Reset</a></div>
      <span class="label">Kategori</span>${Object.entries(CATS).map(([n, c]) => chk(n, true, c.count)).join('')}
      <span class="label">Jarak maksimal</span><input type="range" class="slider" min="0" max="30" value="15" data-range-out="#jarak"><div class="row between t-xs faint b6"><span>0 km</span><b class="c-primary" id="jarak">≤ 15 km</b><span>30 km</span></div>
      <span class="label">Harga per kg</span><div class="grid-2" style="gap:8px"><input class="input" style="height:42px" value="Rp0"><input class="input" style="height:42px" value="Rp5.000"></div>
      <span class="label">Frekuensi</span>${multi([['Sekali', 0], ['Harian', 1], ['Musiman', 0], ['Kontrak', 0]])}
      <div class="row between"><b>Hanya non-B3</b>${sw(true)}</div>
      <button class="btn btn-primary" data-toast="Filter diterapkan">Terapkan Filter</button></aside>
    <div class="col gap-16">
      <div class="row"><div class="search grow" style="background:#fff;border:1px solid var(--border);width:auto">${I('search')}<input placeholder="Cari kain perca, sekam, kardus…"></div>
        <div style="width:210px">${dd('dd-urut', '', [['Terdekat'], ['Harga terendah'], ['Harga tertinggi'], ['Terbaru']], 'Terdekat', { prefix: 'Urut: ' })}</div>
        <div class="seg"><button class="active">Grid</button><button data-go="#/peta">Peta</button></div></div>
      <div class="col gap-16" id="jl-results">${jelajahResults()}</div></div></div>`);

/* ---------- PETA ---------- */
function petaPanel() {
  const from = S.myLL || GEO_CENTER;
  const items = petaItems().map(x => Object.assign(x, { km: distKm(from, x.ll) })).sort((p, q) => p.km - q.km);
  return `<div class="h3">${items.length} limbah ${S.petaTab === 'Semua' ? '' : S.petaTab.toLowerCase() + ' '}di peta</div>
    <span class="t-sm muted">${S.myLL ? 'Diurutkan dari yang terdekat dengan lokasimu' : 'Klik "Lokasiku" di peta untuk mengurutkan dari yang terdekat'}</span>
    <div class="chips">${['Semua', 'Perikanan', 'Batik', 'Industri', 'Pertanian'].map(c => `<button class="chip ${c === S.petaTab ? 'active' : ''}" data-petatab="${c}">${c}</button>`).join('')}</div>
    <div class="col gap-8" style="max-height:470px;overflow:auto;margin:0 -4px;padding:0 4px">${items.length ? items.map(x => { const [cat, j, loc, , h, img, id] = x.card;
      return `<div class="row peta-item" style="padding:10px;border:1px solid var(--border);border-radius:14px;gap:10px">${photo(img, ck(cat), 'width:52px;height:52px')}<div class="grow" style="min-width:0"><b class="ellipsis t-md">${j}</b><div class="t-xs muted ellipsis">${loc}</div><div class="t-xs b7"><span class="c-primary">${h}</span> · ${fmtKm(x.km)}</div></div>
        <div class="col gap-4"><button class="btn btn-secondary btn-sm" style="height:30px;padding:0 10px" data-fly="${x.ll.join(',')}">Peta</button><button class="btn btn-plain btn-sm" style="height:30px;padding:0 10px" data-go="#/detail" ${id ? `data-lid="${id}"` : ''}>Detail</button></div></div>`; }).join('') : (DB.on && !(S.petaDB || []).length
      ? `<div class="col gap-8" style="align-items:flex-start"><span class="muted">Belum ada limbah yang diposting. Pin akan muncul di peta setelah penghasil limbah memposting limbahnya.</span>${S.role === 'penghasil' ? `<button class="btn btn-primary btn-sm" data-go="#/posting">${I('plus')}Posting Limbah</button>` : ''}</div>`
      : `<span class="muted">Belum ada limbah di kategori ini.</span>`)}</div>`;
}
V.peta = () => appShell('Peta Limbah', 'Geser & zoom peta untuk melihat sebaran limbah', `
  <div class="two-col r340"><div style="position:relative;z-index:0">${lmap('peta', 640)}<div class="legend" style="z-index:500;top:auto;bottom:16px;left:16px;right:auto">${Object.entries(CATS).map(([n, c]) => `<span><i style="background:var(--${c.key})"></i>${n === 'Kawasan Industri' ? 'Industri' : n}</span>`).join('')}</div></div>
    <div class="card col" id="peta-panel">${petaPanel()}</div></div>`);
async function loadPeta() {
  if (!DB.on) return;
  try { S.petaDB = (await DB.listListings({ per: 200 })).rows; petaMarkers(true); const p = $('#peta-panel'); if (p) p.innerHTML = petaPanel(); } catch (e) { console.error(e); }
}

/* ---------- DETAIL ---------- */
const GALERI = [['tulang', 'Tulang ikan dijemur'], ['jeroan', 'Disimpan di drum tertutup'], ['timbang', 'Timbangan di TPI'], ['tpi', 'Lokasi TPI Klidang Lor']];
function galeri() { if (S.cur) return galeriDB(); return `${photo(GALERI[S.galeri][0], 'gallery-main')}<div class="thumbs">${GALERI.map(([k], i) => `<div class="photo ${i === S.galeri ? 'sel' : ''}" style="background-image:url('${IMG(k)}')" data-galeri="${i}"></div>`).join('')}<span class="pill" style="background:rgba(15,42,74,.55);color:#fff;padding:6px 12px">${S.galeri + 1} / 4 · ${GALERI[S.galeri][1]}</span></div>`; }
V.detail = () => S.cur ? detailDB(S.cur) : appShell('Detail Limbah', 'Jelajah / Perikanan / Tulang & kepala ikan', `
  <div class="two-col"><div class="col gap-20"><div class="col" id="galeri">${galeri()}</div>
      <div class="card col"><div class="h3">Deskripsi</div><p class="muted" style="line-height:1.65">Sisa pengolahan pindang & ikan asin dari pelelangan pagi, dikumpulkan dalam drum tertutup (± 50 kg/drum). Cocok untuk tepung ikan, pakan maggot, dan pupuk organik cair. Tersedia setiap hari pukul 06.00–10.00.</p>
        <div class="grid-4">${[['scale', 'Estimasi berat', '± 250 kg'], ['clock', 'Dihasilkan', 'Hari ini, 06.30'], ['calendar', 'Frekuensi', 'Setiap hari'], ['shield', 'Status', 'Non-B3']].map(([ic, k, v]) => `<div class="row" style="background:var(--bg);border-radius:14px;padding:12px;gap:10px">${ib(ic, 'ikan', 34)}<div><div class="t-xs faint b6">${k}</div><b class="t-md">${v}</b></div></div>`).join('')}</div></div>
      <div class="card row"><div class="avatar ib-primary" style="width:52px;height:52px">MB</div><div class="grow"><div class="row gap-4"><b class="t-lg">Koperasi Nelayan Mina Batang</b><span class="c-primary">${I('shield')}</span></div><div class="t-md muted">★ 4.8 · 126 transaksi · Bergabung sejak 2025 · Batang</div></div><button class="btn btn-plain btn-sm" data-toast="Profil penjual segera hadir">Lihat Profil</button></div></div>
    <div class="card col sticky" style="box-shadow:var(--shadow)"><div class="row gap-8">${pill('Perikanan', 'ikan')}${pill('Non-B3', 'tani')}${pill('Rutin harian', 'primary')}</div>
      <div class="h2">Tulang & kepala ikan tongkol segar</div><div class="row gap-8" style="align-items:flex-end"><span class="c-primary" style="font-size:30px;font-weight:800">Rp1.500</span><span class="muted b6">/kg · bisa nego</span></div>
      <div class="row">${I('pin', 'c-primary')}<div><div class="t-xs faint b6">Lokasi</div><b>TPI Klidang Lor, Batang · 2,1 km</b></div></div>
      <div class="row">${I('truck', 'c-primary')}<div><div class="t-xs faint b6">Penjemputan</div><b>Jemput Cepat tersedia (&lt; 2 jam)</b></div></div>
      <button class="btn btn-primary" data-go="#/tawar">Ajukan Penawaran</button><button class="btn btn-outline" data-go="#/pesan">Chat Penjual</button>
      ${note('shield', 'Pembayaran aman via Rekber SisaGuna')}</div></div>
  ${secHead('Limbah Serupa', 'Lihat semua', '#/jelajah')}<div class="grid-cards cols-4">${[6, 11, 9, 12].map(i => lcard(LISTINGS[i])).join('')}</div>`);

/* ---------- AJUKAN PENAWARAN ---------- */
function miniCal() {
  const days = { 14: 'Sab', 15: 'Min', 16: 'Sen', 17: 'Sel', 18: 'Rab', 19: 'Kam', 20: 'Jum', 21: 'Sab' };
  let cells = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => `<div class="wd">${d}</div>`).join('');
  for (let i = 0; i < 6; i++) cells += '<div></div>';
  for (let d = 1; d <= 30; d++) cells += days[d] ? `<div class="ok ${d === S.tanggal ? 'sel' : ''}" data-tgl="${d}">${d}</div>` : `<div>${d}</div>`;
  return { days, html: `<div class="row between" style="margin-bottom:8px">${I('back', 'faint')}<b>November 2026</b>${I('chevron', 'faint')}</div><div class="mini-cal">${cells}</div><p class="t-xs faint b6" style="margin-top:8px">Penjemputan bisa dijadwalkan hingga 7 hari ke depan.</p>` };
}
function calc() {
  const sub = S.offerH * S.offerJ, ong = S.metode === 'Mitra Logistik' ? 35000 : 0, fee = Math.round(sub * 0.05);
  return { sub, ong, fee, total: sub + ong + fee };
}
function ringkasan() { const c = calc();
  return `<div class="h3">Ringkasan</div>${kv(`Subtotal (${S.offerJ.toLocaleString('id-ID')} kg × ${rp(S.offerH)})`, rp(c.sub))}${kv('Ongkos jemput', c.ong ? rp(c.ong) : '<span class="c-tani">Gratis</span>')}${kv('Biaya layanan (5%)', rp(c.fee))}<div class="divider"></div>${kv('Total dibayar', rp(c.total), 1)}`; }
function checkout() {
  const logi = S.metode === 'Mitra Logistik';
  return `<span class="label">Metode penjemputan</span>
    <div class="col" data-radio-group="metode">${opt('metode', 'Mitra Logistik', { t: 'Mitra Logistik SisaGuna', icon: 'truck', d: 'Armada berpendingin · +Rp35.000', sel: logi })}${opt('metode', 'Jemput Sendiri', { t: 'Jemput sendiri', icon: 'user', c: 'tani', d: 'Ambil di lokasi penjual · gratis', sel: !logi })}</div>
    <div class="card col" id="ringkasan">${ringkasan()}</div>
    <button class="btn btn-primary" data-send-offer="${logi ? 'p01' : 'p02'}">Kirim Penawaran</button><button class="btn btn-outline" data-back>Batal</button>`;
}
V.tawar = () => { const mc = miniCal(); const L = S.cur ? DB.toCard(S.cur) : LISTINGS[0];
  if (!V.tawar._keep) { S.offerH = S.cur && S.cur.harga_per_kg ? S.cur.harga_per_kg : 1600; S.offerJ = S.cur ? (num(S.cur.berat, true) || 100) : 250; }
  return appShell('Ajukan Penawaran', S.cur ? esc(S.cur.judul) : 'Tulang & kepala ikan tongkol', `
  <div class="two-col"><div class="card col gap-16"><div class="h3" style="font-size:18px">Detail Penawaran</div>
      <span class="label">Model transaksi</span>
      <div class="seg block" data-tabset="modelp"><button class="active" data-tab="beli">Beli Limbah</button><button data-tab="jasa">Bayar Jasa Olah</button></div>
      <div data-pane-of="modelp" data-pane="beli">${note('info', 'Kamu membeli limbah dan membayar per kg ke penjual.')}</div>
      <div data-pane-of="modelp" data-pane="jasa" class="hidden">${note('info', 'Penjual membayarmu untuk mengolah limbahnya secara legal & tercatat.')}</div>
      <div class="grid-2">${field('Harga tawar per kg (Rp)', 'harga', 'Contoh: 1600', S.offerH, 'number')}${field('Jumlah diambil (kg)', 'jumlah', 'Contoh: 250', S.offerJ, 'number')}</div>
      <div class="field"><span class="label">Tanggal penjemputan</span><div class="dd dd-cal" id="dd-tgl"><button class="dd-btn"><span class="dd-val">${mc.days[S.tanggal]}, ${S.tanggal} Nov 2026</span>${I('calendar')}</button><div class="dd-menu" style="max-height:none;padding:14px" id="cal-wrap">${mc.html}</div></div></div>
      <span class="label">Jam penjemputan</span>${chips(['08.00–10.00', '10.00–12.00', '13.00–15.00', '15.00–17.00'], S.jam)}
      <label class="field"><span class="label">Catatan untuk penjual</span><textarea class="textarea" name="catatan" placeholder="Contoh: mohon limbah tetap di wadah tertutup"></textarea></label></div>
    <div class="col gap-16">${lrow(L)}<div class="col gap-16" id="checkout">${checkout()}</div></div></div>`); };

/* ---------- POSTING (3 langkah) ---------- */
const POST_FORMS = {
  Perikanan: { title: 'Detail limbah perikanan', imgs: ['tulang', 'jeroan'], jenis: ['Kepala & tulang', 'Sisik', 'Jeroan', 'Kulit', 'Cangkang udang'], berat: ['Estimasi berat', '± 250 kg'], d1: ['Jam dihasilkan', [['05.00 WIB'], ['06.30 WIB'], ['08.00 WIB']], '06.30 WIB'], d2: ['Wadah', [['Drum tertutup'], ['Box styrofoam'], ['Karung'], ['Ember besar']], 'Drum tertutup'], sp: ['zap', 'Aktifkan Jemput Cepat', 'Limbah ikan cepat busuk — kami carikan armada berpendingin terdekat'], fq: 'Harian', prev: ['Tulang & kepala ikan tongkol', 'TPI Klidang Lor, Batang'] },
  Batik: { title: 'Detail limbah batik (non-B3)', imgs: ['perca', 'gagal'], jenis: ['Kain perca', 'Kain gagal produksi', 'Malam bekas', 'Potongan kayu cap'], berat: ['Estimasi berat', '± 120 kg'], d1: ['Jenis kain', [['Katun primisima'], ['Katun prima'], ['Rayon'], ['Sutra'], ['Campuran']], 'Katun primisima'], d2: ['Warna dominan', [['Cokelat sogan'], ['Biru indigo'], ['Merah'], ['Motif campur']], 'Cokelat sogan'], sp: ['shield', 'Saya menjamin limbah bebas pewarna kimia', 'Limbah B3 (pewarna, sisa kimia) tidak boleh diposting tanpa izin'], fq: 'Mingguan', prev: ['Kain perca batik cap katun', 'Kauman, Pekalongan'] },
  'Kawasan Industri': { title: 'Detail limbah kawasan industri', imgs: ['kardus', 'plastik'], jenis: ['Kardus', 'Plastik kemasan', 'Palet kayu', 'Logam & besi'], berat: ['Volume per bulan', '± 2 ton'], d1: ['Kemasan', [['Bal atau ikat'], ['Karung'], ['Palet'], ['Curah (lepas)']], 'Bal atau ikat'], d2: ['Lokasi gudang', [['KIT Batang · Gringsing'], ['Gudang Kandeman · Batang'], ['Gudang Wiradesa · Pekalongan']], 'KIT Batang · Gringsing'], sp: ['file', 'Butuh manifest serah terima resmi', 'Dokumen otomatis untuk laporan PROPER/ESG perusahaan'], fq: 'Kontrak rutin', prev: ['Kardus & palet kayu bekas', 'KIT Batang, Gringsing'] },
  Pertanian: { title: 'Detail limbah pertanian & perkebunan', imgs: ['sekam', 'teh'], jenis: ['Sekam padi', 'Jerami', 'Ampas teh', 'Kulit kopi', 'Tongkol jagung'], berat: ['Estimasi berat', '± 1,5 ton'], d1: ['Perkiraan panen', [['4 Des 2026'], ['12 Des 2026'], ['18 Des 2026'], ['27 Des 2026']], '12 Des 2026'], d2: ['Lokasi lahan', [['Kel. Tani Subah'], ['Kebun Teh Bawang'], ['Kebun Kopi Blado'], ['Sawah Limpung']], 'Kel. Tani Subah'], sp: ['calendar', 'Buka pra-pesan sebelum panen', 'Pengolah bisa memesan kuota lewat Kalender Panen'], fq: 'Musiman', prev: ['Sekam & jerami padi', 'Kel. Tani Subah, Batang'] }
};
const NEXT_INFO = { Perikanan: 'jam dihasilkan, wadah & opsi Jemput Cepat', Batik: 'jenis kain, warna dominan & jaminan non-B3', 'Kawasan Industri': 'volume rutin, kemasan & manifest serah terima', Pertanian: 'perkiraan panen & opsi pra-pesan' };
V.posting = () => appShell('Posting Limbah', 'Langkah 1 dari 3 · Kategori', `${stepper(1)}
  <div class="two-col r340"><div class="card col gap-20"><div><div class="h2">Limbah apa yang ingin kamu salurkan?</div><p class="muted">Pilih satu kategori. Form berikutnya menyesuaikan sifat limbahmu.</p></div>
      ${note('info', 'Limbah B3 (pewarna kimia, oli, aki) hanya bisa diposting oleh akun yang sudah mengunggah izin pengelolaan.', 'warning')}
      <div class="grid-2" data-radio-group="postcat">${Object.entries(CATS).map(([n, c]) => opt('postcat', n, { img: c.img, c: c.key, d: c.desc, sel: n === S.postCat })).join('')}</div>
      <div id="postcat-info">${note('info', `Form berikutnya untuk ${S.postCat}: ${NEXT_INFO[S.postCat]}.`, ck(S.postCat) === 'industri' ? 'primary' : (ck(S.postCat) === 'batik' ? 'warning' : ck(S.postCat)))}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn btn-outline" style="width:180px" data-go="${ROLES[S.role].home}">Batal</button><button class="btn btn-primary" style="width:240px" data-go="#/posting/detail" data-draft-start>Lanjutkan</button></div></div>
    <div class="card col"><b>💡 Tips listing cepat laku</b>${['Unggah minimal 2 foto jelas', 'Tulis estimasi berat yang jujur', 'Aktifkan Jemput Cepat untuk limbah ikan', 'Isi jadwal ketersediaan rutin'].map(t => `<div class="row gap-8 t-md muted"><span class="c-tani">${I('checkCircle')}</span>${t}</div>`).join('')}</div></div>`);

function draftCard(f, L) {
  const d = S.draft, Pm = me('penghasil');
  const img = S.draftFiles[0] ? S.draftFiles[0]._url : L[5];
  return [S.postCat, esc(d.judul) || f.prev[0], esc([Pm.alamat, Pm.kec].filter(Boolean).join(', ')) || f.prev[1], esc(d.berat) || f.berat[1], d.harga ? rp(num(d.harga)) + '/kg' : '—', img];
}
function fotoPrev(f) {
  return S.draftFiles.length
    ? S.draftFiles.map((x, i) => `<div style="position:relative">${photo(x._url, '', 'width:110px;height:96px;border-radius:16px')}<button type="button" class="icon-box" data-rmfoto="${i}" style="position:absolute;top:4px;right:4px;width:26px;height:26px;border-radius:50%;background:rgba(15,42,74,.6);color:#fff" aria-label="Hapus foto">${I('close')}</button></div>`).join('')
    : f.imgs.map(i => `<div style="position:relative;opacity:.55">${photo(i, '', 'width:110px;height:96px;border-radius:16px')}<span class="pill" style="position:absolute;left:6px;bottom:6px;background:#fff">Contoh</span></div>`).join('');
}
V.postingDetail = () => { const f = POST_FORMS[S.postCat], k = ck(S.postCat); const L = LISTINGS.find(l => l[1] === f.prev[0]) || LISTINGS[0];
  return appShell('Posting Limbah', `Langkah 2 dari 3 · Detail limbah ${S.postCat.toLowerCase()}`, `${stepper(2)}
  <div class="two-col r300"><div class="card col gap-16"><div class="h2">${f.title}</div>
      ${field('Judul listing', 'judul', 'Contoh: ' + f.prev[0], S.draft.judul)}
      <span class="label">Foto limbah (maks. 4)</span><div class="row wrap"><div class="row wrap" id="foto-prev">${fotoPrev(f)}</div><label class="upload" style="width:110px;height:96px;flex-direction:column;justify-content:center;gap:6px;padding:0">${I('camera', 'c-primary')}<b class="t-sm c-primary">Tambah foto</b><input type="file" name="foto" hidden accept="image/*" multiple></label></div>
      <span class="label">Jenis limbah</span>${chips(f.jenis, S.draft.jenis || f.jenis[0], 'data-single data-name="jenis"')}
      <div class="grid-3">${field(f.berat[0], 'berat', 'Contoh: ' + f.berat[1], S.draft.berat)}${dd('dd-p1', f.d1[0], f.d1[1], S.draft.d1 || '', { name: 'd1', ph: 'Pilih' })}${dd('dd-p2', f.d2[0], f.d2[1], S.draft.d2 || '', { name: 'd2', ph: 'Pilih' })}</div>
      <label class="field"><span class="label">Deskripsi</span><textarea class="textarea" name="deskripsi" placeholder="Kondisi limbah, cara penyimpanan, jam ambil, dll.">${esc(S.draft.deskripsi || '')}</textarea></label>
      <div class="note ${k === 'industri' ? 'primary' : (k === 'batik' ? 'warning' : k)}" style="justify-content:space-between;border:1px solid var(--${k});padding:16px"><div class="row">${ib(f.sp[0], k, 44)}<div><b class="t-lg">${f.sp[1]}</b><div class="t-md muted b6">${f.sp[2]}</div></div></div>${sw(S.draft.khusus !== false).replace('class="switch', 'data-name="khusus" class="switch')}</div>
      <span class="label">Frekuensi</span>${chips(['Sekali', 'Harian', 'Mingguan', 'Bulanan', 'Musiman', 'Kontrak rutin'], S.draft.frekuensi || f.fq, 'data-single data-name="frekuensi"')}
      <div class="row" style="justify-content:flex-end"><button class="btn btn-outline" style="width:180px" data-back>Kembali</button><button class="btn btn-primary" style="width:240px" data-go="#/posting/harga" data-draft-step="2">Lanjutkan</button></div></div>
    <div class="col gap-16"><b class="t-lg">Pratinjau listing</b>${lcard(draftCard(f, L))}${note('info', 'Form ini otomatis menyesuaikan kategori ' + S.postCat + '.', k === 'industri' ? 'primary' : (k === 'batik' ? 'warning' : k))}</div></div>`); };

const MODELS = {
  'Jual Limbah': { icon: 'tag', c: 'primary', d: 'Pengolah membayar limbahmu', btn: 'Publikasikan Limbah', act: 'data-publish', det: [['Biaya layanan', '5% dari nilai transaksi'], ['Pembayaran', 'Lewat rekber, cair setelah limbah diterima'], ['Setelah publikasi', 'Pengolah terdekat dinotifikasi']] },
  'Bayar Jasa Olah': { icon: 'recycle', c: 'tani', d: 'Kamu membayar pengolah berizin', btn: 'Kirim Permintaan Jasa Olah', act: 'data-publish', det: [['Anggaran jasa maksimal', 'Rp300.000'], ['Dikirim ke', '5 pengolah berizin terdekat'], ['Penawaran jasa', '± 1 jam setelah dikirim']] },
  'Buka Tender': { icon: 'clipboard', c: 'industri', d: 'Volume besar & kontrak rutin', btn: 'Buka Tender', act: 'data-publish', det: [['Durasi tender', '14 hari'], ['Minimal peserta', '3 mitra terverifikasi'], ['Dokumen', 'RKS dibuat otomatis']] }
};
function modelBox() { const m = MODELS[S.model]; return `<div class="card col" style="background:var(--bg);border:0">${m.det.map(([a, b]) => kv(a, b)).join('')}</div>
  <div class="row" style="justify-content:flex-end"><button class="btn btn-outline" style="width:180px" data-back>Kembali</button><button class="btn btn-primary" style="width:280px" ${m.act}>${m.btn}</button></div>`; }
function estimasi() { const h = num(S.draft.harga), b = num(S.draft.berat, true); return h && b ? rp(h * b * 0.95) : '—'; }
V.postingHarga = () => { const f = POST_FORMS[S.postCat]; const L = LISTINGS.find(l => l[1] === f.prev[0]) || LISTINGS[0];
  return appShell('Posting Limbah', 'Langkah 3 dari 3 · Harga & lokasi', `${stepper(3)}
  <div class="two-col r300"><div class="card col gap-16"><div class="h2">Harga & penjemputan</div>
      <div class="row" style="align-items:flex-end"><div class="grow">${field('Harga per kg (Rp)', 'harga', 'Contoh: 1500', S.draft.harga, 'number')}</div><div class="row" style="height:52px;border:1px solid var(--border);border-radius:14px;padding:0 14px;flex:none"><b class="t-md">Bisa nego</b>${sw(S.draft.nego !== false).replace('class="switch', 'data-name="nego" class="switch')}</div><div class="grow">${dd('dd-ket', 'Ketersediaan', [['Setiap hari · 06.00–10.00'], ['Senin–Jumat · 08.00–16.00'], ['Akhir pekan saja'], ['Sekali · sesuai jadwal']], S.draft.ketersediaan || '', { name: 'ketersediaan', ph: 'Pilih jadwal' })}</div></div>
      <span class="label">Lokasi penjemputan</span>
      <div class="card col" style="padding:12px;gap:10px"><div class="row between"><div class="grow"><b class="t-lg">${esc([me('penghasil').alamat, me('penghasil').kec].filter(Boolean).join(', ')) || 'Alamat usaha belum diisi'}</b><div class="t-sm muted">Geser pin atau klik peta untuk menentukan titik jemput yang tepat</div></div></div>${lmap('pick', 240, 'data-target="draft" data-out="#pick-ll"')}<span class="t-xs muted b6" id="pick-ll">Titik dipilih: —</span></div>
      <span class="label">Model transaksi</span>
      <div class="grid-3" data-radio-group="model">${Object.entries(MODELS).map(([n, m]) => opt('model', n, { icon: m.icon, c: m.c, d: m.d, sel: n === S.model, v: true })).join('')}</div>
      <div class="col gap-16" id="model-box">${modelBox()}</div></div>
    <div class="col gap-16"><b class="t-lg">Pratinjau listing</b>${lcard(draftCard(f, L))}
      <div class="card col gap-4" style="background:var(--tani-light);border:0"><span class="t-sm muted b6">Estimasi pendapatan</span><b class="c-tani" style="font-size:24px" id="estimasi">${estimasi()}</b><span class="t-xs muted">setelah biaya layanan 5%</span></div></div></div>`); };

V.postingSukses = () => { const f = POST_FORMS[S.postCat]; const L = LISTINGS.find(l => l[1] === f.prev[0]) || LISTINGS[0];
  const last = S.lastPosted ? DB.toCard(S.lastPosted) : null;
  return appShell('Posting Limbah', 'Selesai', `<div class="card col gap-20" style="max-width:720px;margin:0 auto;padding:40px;align-items:center;text-align:center">
    <div class="icon-box" style="width:128px;height:128px;border-radius:50%;background:var(--tani-light)"><div class="icon-box" style="width:84px;height:84px;border-radius:50%;background:var(--tani);color:#fff">${I('check')}</div></div>
    <div class="h1" style="font-size:28px">Limbah berhasil dipublikasikan! 🎉</div><p class="muted">Pengolah di sekitarmu sudah bisa melihat dan menawar limbah ini. Penawaran yang masuk akan muncul di halaman Penawaran Masuk.</p>
    <div style="width:100%;text-align:left">${lrow(last || draftCard(f, L))}</div>
    <div class="grid-3" style="width:100%">${[['12', 'pengolah dinotifikasi'], ['± 30 mnt', 'penawaran pertama'], ['5%', 'biaya layanan']].map(([v, k]) => `<div class="card col gap-4" style="background:var(--bg);border:0;text-align:left"><b class="c-primary" style="font-size:20px">${v}</b><span class="t-sm muted">${k}</span></div>`).join('')}</div>
    <div class="grid-3" style="width:100%"><button class="btn btn-outline" data-go="#/posting">Posting Lagi</button><button class="btn btn-secondary" data-go="#/beranda">Ke Beranda</button><button class="btn btn-primary" data-go="#/penawaran-masuk">Lihat Penawaran</button></div></div>`); };

/* ---------- FITUR KHUSUS ---------- */
V.jemput = () => appShell('Jemput Cepat', 'Penjemputan cepat oleh armada terdekat', `<div id="jemput">${loading()}</div>`);

function kalPanel() { const d = S.kalDay; return `<div class="row between"><div class="h3">Panen ${d} Desember</div><span class="link">${HARVEST[d].length} jadwal</span></div>
  ${HARVEST[d].map(([t, s, v, n, img]) => `<div class="card col"><div class="row">${photo(img, '', 'width:48px;height:48px')}<div class="grow"><b>${t}</b><div class="t-sm muted">${s}</div></div></div><div class="row between"><b class="c-tani t-lg">${v}</b>${pill(n, n.startsWith('Belum') ? 'warning' : 'primary')}</div></div>`).join('')}
  ${input('Jumlah pra-pesan', '1 ton')}<button class="btn btn-primary" data-go="#/pesanan">Pra-pesan Limbah Panen ${d} Des</button>
  ${note('info', 'Pra-pesan mengunci kuota sebelum panen. Pembayaran dilakukan saat penjemputan.', 'tani')}`; }
V.kalender = () => { const ev = { 4: 'Padi', 12: 'Padi · Teh', 18: 'Kopi', 22: 'Kelapa', 27: 'Padi' }; let cells = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => `<div class="wd">${d}</div>`).join('');
  for (let d = 1; d <= 35; d++) cells += d > 31 ? '<div class="day empty"></div>' : `<div class="day ${ev[d] ? 'ev' : ''} ${d === 22 ? 'kelapa' : ''} ${d === S.kalDay ? 'sel' : ''}" ${ev[d] ? `data-kal="${d}"` : ''}>${d}${ev[d] ? `<small>${ev[d]}</small>` : ''}</div>`;
  return appShell('Kalender Panen', 'Pertanian & perkebunan Batang', `<div class="two-col"><div class="card col"><div class="row between"><div class="row">${I('back', 'faint')}<b class="t-xl">Desember 2026</b>${I('chevron', 'faint')}</div><div class="row t-sm muted b6"><span class="row gap-4"><i style="width:10px;height:10px;border-radius:50%;background:var(--tani);display:block"></i>Padi / teh / kopi</span><span class="row gap-4"><i style="width:10px;height:10px;border-radius:50%;background:var(--batik);display:block"></i>Kelapa</span></div></div>
    <div class="cal" id="cal">${cells}</div><p class="t-sm faint b6">Klik tanggal berwarna untuk melihat jadwal panen.</p></div><div class="col gap-16" id="kal-panel">${kalPanel()}</div></div>`); };

function tenderDetail() { const t = TENDERS[S.tenderSel]; return `<div class="h2">${t.title}</div><div class="row">${photo(t.key, '', 'width:36px;height:36px;border-radius:10px')}<span class="muted b6">${t.co}</span></div>
  <div class="grid-4">${[['Volume', t.vol], ['Durasi kontrak', t.dur], ['Peserta', t.peserta], ['Batas akhir', t.batas]].map(([k, v]) => `<div style="background:var(--bg);border-radius:14px;padding:14px"><div class="t-xs faint b6">${k}</div><b>${v}</b></div>`).join('')}</div>
  <p class="muted" style="line-height:1.65">${t.d}</p><b class="t-lg">Syarat peserta</b>${['Izin usaha daur ulang / pengepul terdaftar', 'Armada truk minimal 4 ton', 'Laporan serah terima bulanan (manifest)'].map(s => `<div class="row gap-8"><span class="c-tani">${I('checkCircle')}</span>${s}</div>`).join('')}
  <b class="t-lg">Dokumen tender</b><div class="row">${t.docs.map(d => `<a class="row gap-8" style="background:var(--bg);border-radius:12px;padding:12px" data-pdf="tender" data-doc="${d}">${I('file', 'c-industri')}<b class="t-md">${d}</b>${I('download', 'faint')}</a>`).join('')}</div>
  <div class="row" style="align-items:flex-end"><div class="grow">${input('Harga penawaran', t.harga)}</div><button class="btn btn-primary" style="width:220px" data-go="#/pesanan">Ikut Tender</button></div>`; }
V.tender = () => appShell('Tender & Kontrak', 'Kawasan industri & pabrik Batang', `
  ${tabsBar('tender', [['aktif', 'Tender Aktif (3)'], ['kontrak', 'Kontrak Saya (2)'], ['riwayat', 'Riwayat']], 'aktif')}
  ${pane('tender', 'aktif', 'aktif', `<div class="two-col" style="grid-template-columns:380px 1fr"><div class="col" id="tender-list">${tenderList()}</div><div class="card col gap-16" id="tender-detail">${tenderDetail()}</div></div>`)}
  ${pane('tender', 'kontrak', 'aktif', [['kardus', 'Pengangkutan kardus + palet kayu', 'PT Kemasan Nusantara · KIT Batang', 'Berjalan · bulan 3 dari 12', 'tani', .25, 'Jemput berikutnya: Sel, 17 Nov 2026 · 08.00', 1], ['plastik', 'Limbah plastik kemasan (LDPE)', 'PT Sinar Packaging · KIT Batang', 'Menunggu tanda tangan', 'warning', 0, 'Kontrak dikirim 12 Nov 2026 · tanda tangan digital', 0]].map(([img, t, co, st, c, p, nx, a]) => `<div class="card col"><div class="row">${photo(img, '', 'width:56px;height:56px')}<div class="grow"><b class="t-lg">${t}</b><div class="t-md muted">${co}</div></div>${pill(st, c)}</div>${bar(p, 'tani')}<span class="t-sm muted b6">${nx}</span><div class="row">${a ? `<button class="btn btn-secondary btn-sm" data-go="#/kalender">Lihat Jadwal Jemput</button><button class="btn btn-plain btn-sm" data-pdf="manifest" data-judul="${t}" data-mitra="${co.split(' · ')[0]}">${I('download')}Laporan Manifest (PDF)</button>` : `<button class="btn btn-primary btn-sm" data-toast="Kontrak ditandatangani ✓">Tanda Tangani Kontrak</button>`}</div></div>`).join(''))}
  ${pane('tender', 'riwayat', 'aktif', `<div class="card col">${[['perca', 'Limbah kain perca garmen', 'CV Garmen Batang Jaya · Jan–Jun 2026', 'Menang · kontrak selesai', 'tani'], ['kardus', 'Kertas & arsip kantor', 'PT Sinar Packaging · Agu 2026', 'Tidak terpilih', 'danger'], ['plastik', 'Karung plastik bekas', 'PT Kemasan Nusantara · Mar–Sep 2026', 'Menang · diperpanjang', 'tani']].map(([img, t, d, r, c]) => `<div class="row">${photo(img, '', 'width:48px;height:48px')}<div class="grow"><b>${t}</b><div class="t-sm muted">${d}</div></div>${pill(r, c)}</div>`).join('<div class="divider"></div>')}</div>`)}`);
function tenderList() { return TENDERS.map((t, i) => `<div class="card col gap-8 clickable" style="${i === S.tenderSel ? 'border:1.5px solid var(--industri)' : ''}" data-tender="${i}"><div class="row between">${pill('Kawasan Industri', 'industri')}${pill(t.sisa, 'warning')}</div><b class="t-lg">${t.title}</b><span class="t-sm muted b6">${t.co.split(' · ')[0]}</span><b class="c-industri t-md">Volume ${t.vol}</b></div>`).join(''); }

V.bahanBaku = () => appShell('Butuh Bahan Baku', 'Pasang permintaan sebagai mitra pengolah', `
  <div class="two-col"><div class="card col gap-16"><div class="note warning" style="padding:16px">${ib('tag', 'batik')}<div><b class="t-lg">Pasang permintaan bahan baku</b><div class="t-md muted b6">Penghasil limbah yang cocok akan langsung menawarkan stoknya ke kamu.</div></div></div>
      <div class="grid-2">${dd('dd-bk', 'Kategori', [['Perikanan'], ['Batik'], ['Kawasan Industri'], ['Pertanian']], 'Batik')}${dd('dd-bj', 'Jenis limbah', [['Kain perca katun'], ['Malam (lilin) bekas'], ['Kain gagal produksi']], 'Kain perca katun')}${input('Kebutuhan', '500 kg / bulan')}${input('Harga maksimal', 'Rp4.500/kg')}</div>
      <div class="row between"><span class="label">Radius pencarian</span><b class="c-primary" id="radius">≤ 15 km dari Pekalongan</b></div><input type="range" class="slider" min="5" max="50" value="15" data-range-out="#radius" data-range-fmt="≤ {v} km dari Pekalongan">
      <span class="label">Frekuensi kebutuhan</span>${chips(['Sekali', 'Bulanan', 'Kontrak rutin'], 'Bulanan')}
      <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" style="width:260px" data-go="#/jelajah" data-toast-after="Permintaan dipasang ✓">Pasang Permintaan</button></div></div>
    <div class="col gap-16">${secHead('Stok yang cocok', '3 stok', '#/jelajah')}${[1, 13, 7].map(i => lrow(LISTINGS[i])).join('')}
      <div class="card col"><b class="t-lg">Permintaan aktifmu</b><div class="row between"><span class="b6">Sekam padi · 2 ton/bln</span>${pill('4 tawaran', 'primary')}</div></div></div></div>`);

/* ---------- TRANSAKSI ---------- */
const isDone = (id) => S.doneOrders.includes(id);
/* pesanan yang sudah dibayar/diselesaikan: tombol jadi abu-abu & ikut tercatat di tab Selesai */
function orderRows(t) {
  if (t === 'Selesai') return [...ORDERS.Aktif.filter(r => isDone(r[0])).map(r => [r[0], r[1], r[2], r[3], r[4], 'Selesai · baru saja', 'tani', 'Ulas', '#/ulasan', 'btn-primary']), ...ORDERS.Selesai];
  if (t === 'Aktif') return ORDERS.Aktif.map(r => isDone(r[0]) ? [r[0], r[1], r[2], r[3], r[4], 'Selesai · sudah dibayar', 'tani', 'Selesai', null, 'btn-disabled'] : r);
  return ORDERS[t];
}
V.pesanan = () => { const nAktif = ORDERS.Aktif.filter(r => !isDone(r[0])).length; return appShell('Pesanan', 'Kelola semua transaksi limbah', `
  <div class="row between">${tabsBar('pesanan', [['Aktif', `Aktif (${nAktif})`], ['Selesai', `Selesai (${39 + S.doneOrders.length})`], ['Dibatalkan', 'Dibatalkan (2)']], 'Aktif')}<button class="btn btn-plain btn-sm" data-csv="pesanan">${I('download')}Ekspor CSV</button></div>
  ${Object.keys(ORDERS).map(t => pane('pesanan', t, 'Aktif', `
    ${t === 'Aktif' ? `<div class="hero" style="padding:18px 20px;border-radius:20px"><div class="row"><div class="icon-box" style="background:rgba(255,255,255,.22);color:#fff">${I('tag')}</div><div><b class="t-lg">3 penawaran baru masuk</b><div class="t-md" style="color:var(--primary-light)">Untuk tulang & kepala ikan tongkol · tertinggi Rp1.600/kg</div></div></div><button class="btn btn-white btn-sm" data-go="#/penawaran-masuk">Lihat Penawaran</button></div>` : ''}
    <div class="card p0"><table class="table"><thead><tr><th>ID Pesanan</th><th>Limbah</th><th>Mitra</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
      ${orderRows(t).map(([id, img, j, m, tot, st, c, a, go, bc]) => `<tr ${go ? '' : 'style="opacity:.75"'}><td class="b7">${id}</td><td><div class="row">${photo(img)}<b>${j}</b></div></td><td class="muted">${m}</td><td class="b8">${tot}</td><td>${pill(st, c)}</td><td>${go ? `<button class="btn ${bc} btn-sm" data-go="${go}" data-order="${id}">${a}</button>` : `<button class="btn btn-disabled btn-sm" disabled title="Pesanan sudah diselesaikan">${I('check')}${a}</button>`}</td></tr>`).join('')}
    </tbody></table></div>
    ${t === 'Dibatalkan' ? note('info', 'Dana untuk pesanan yang dibatalkan otomatis dikembalikan dari rekber dalam 1×24 jam.', 'warning') : ''}`)).join('')}`); };

V.penawaranMasuk = () => appShell('Penawaran Masuk', 'Tulang & kepala ikan tongkol', `
  <div class="two-col" style="grid-template-columns:340px 1fr"><div class="col gap-16">${lrow(LISTINGS[0])}
      <div class="card col"><b class="t-lg">Performa listing</b>${kv('Dilihat', '86 kali')}${kv('Penawaran masuk', '3')}${kv('Penawaran tertinggi', 'Rp1.600/kg')}${kv('Berakhir dalam', '5 jam')}</div>
      ${note('info', 'Terima satu penawaran, penawaran lain otomatis ditolak dengan sopan.')}</div>
    <div class="col gap-16"><div class="row between"><div class="h3">3 penawaran</div><span class="link">Urut: Tertinggi</span></div>
      ${[['ML', 'tani', 'CV Maggot Lestari', '★ 4.9 · Batang · 3 km · 58 transaksi', 'Rp1.600/kg', '250 kg · Mitra Logistik · hari ini 10.00', 'Rp400.000', 1], ['PS', 'batik', 'Pakan Ternak Sejahtera', '★ 4.7 · Pekalongan · 6 km · 31 transaksi', 'Rp1.550/kg', '250 kg · Jemput sendiri · hari ini 13.00', 'Rp387.500', 0], ['TP', 'industri', 'Tani Pupuk Organik', '★ 4.6 · Subah · 11 km · 12 transaksi', 'Rp1.400/kg', '200 kg · Jemput sendiri · besok 08.00', 'Rp280.000', 0]].map(([ini, c, n, m, p, d, tot, best]) => `
        <div class="card row offer" style="${best ? 'border:1.5px solid var(--primary)' : ''}"><div class="avatar ib-${c}" style="width:52px;height:52px">${ini}</div>
          <div class="col gap-4 grow"><div class="row gap-8"><b class="t-lg">${n}</b>${best ? pill('Tertinggi', 'primary') : ''}</div><span class="t-sm muted">${m}</span><span class="t-sm b6">${d}</span></div>
          <div class="col gap-4" style="align-items:flex-end"><b class="c-primary" style="font-size:20px">${p}</b><span class="t-xs faint b6">Total ± ${tot}</span></div>
          <div class="row gap-8 offer-actions"><button class="btn btn-plain btn-sm" data-reject>Tolak</button><button class="btn btn-secondary btn-sm" data-go="#/pesan">${I('chat')}Chat</button><button class="btn btn-primary btn-sm" data-go="#/jejak">Terima</button></div></div>`).join('')}</div></div>`);

V.jejak = () => { const done = isDone('SG-2611-0040'); return appShell('Jejak Limbah', 'SG-2611-0040', `
  <div class="two-col"><div class="card col gap-16"><div class="h3" style="font-size:18px">Jejak perjalanan limbah</div><div>
      ${[['Limbah diposting', 'TPI Klidang Lor · 06.30 · 3 foto', 'done', 'file'], ['Penawaran diterima', 'CV Maggot Lestari · Rp1.600/kg · 07.40', 'done', 'checkCircle'], ['Dijemput & ditimbang', 'Berat aktual 248 kg · foto timbangan · 08.45', 'done', 'scale'], ['Dalam perjalanan ke pengolah', 'Pak Darto · G 8123 AB · ETA 09.30', done ? 'done' : 'now', 'truck'], ['Diterima pengolah', done ? 'Dikonfirmasi & dibayar via rekber' : 'Menunggu konfirmasi penerima', done ? 'done' : 'next', 'box'], ['Diolah jadi pakan maggot', 'Pengolah unggah bukti pengolahan', done ? 'now' : 'next', 'recycle']].map(([t, s, st, ic], i, a) => `
        <div class="tl-item"><div class="tl-dot"><div class="d" style="background:var(--${st === 'done' ? 'tani' : st === 'now' ? 'primary' : 'bg'});${st === 'next' ? 'border:1px solid var(--border)' : ''}"><span style="color:${st === 'next' ? 'var(--text-3)' : '#fff'}">${I(ic)}</span></div>${i < a.length - 1 ? `<div class="line ${st === 'done' ? 'done' : ''}"></div>` : ''}</div>
          <div style="padding-top:8px"><b class="${st === 'next' ? 'faint' : ''} ${st === 'now' ? 'b8' : ''}">${t}</b><div class="t-md ${st === 'next' ? 'faint' : 'muted'}">${s}</div></div></div>`).join('')}</div>
      <b>Bukti serah terima</b><div class="row">${[['timbang', 'Timbangan'], ['jeroan', 'Muatan'], ['truk', 'Armada'], ['manifest', 'Manifest']].map(([k, l]) => `<div class="col gap-4" style="align-items:center">${photo(k, '', 'width:120px;height:96px;border-radius:14px')}<span class="t-xs b6 muted">${l}</span></div>`).join('')}</div></div>
    <div class="col gap-16"><div class="card col"><div class="row">${photo('tulang', '', 'width:48px;height:48px')}<div><div class="t-xs faint b6">SG-2611-0040</div><b>Tulang & kepala ikan tongkol</b><div class="t-sm muted">Ke CV Maggot Lestari</div></div></div><div class="divider"></div>${kv('Berat aktual', '248 kg')}${kv('Harga', 'Rp1.600/kg')}${kv('Total', 'Rp451.640', 1)}</div>
      <div class="card row"><div class="avatar ib-batik">PD</div><div class="grow"><b>Pak Darto</b><div class="t-sm muted">Pick-up Berpendingin · 4°C</div></div><button class="icon-box ib-tani" data-toast="Menghubungi driver…">${I('phone')}</button></div>
      ${done ? `<button class="btn btn-disabled" disabled>${I('check')}Sudah diterima & dibayar</button>` : `<button class="btn btn-primary" data-go="#/bayar" data-order="SG-2611-0040">Konfirmasi Diterima & Bayar</button>`}<button class="btn btn-outline" data-go="#/bantuan">Laporkan Masalah</button></div></div>`); };

const PAYS = { QRIS: ['grid', 'primary', 'Semua e-wallet & mobile banking', 'p03'], 'Saldo SisaGuna': ['wallet', 'tani', 'Saldo: Rp3.412.500', 'p04'], 'Virtual Account': ['file', 'industri', 'BRI, BNI, BSI, Mandiri', 'p05'] };
function payBox() { if (isDone(S.curOrder)) return `${note('checkCircle', 'Pesanan ' + S.curOrder + ' sudah dibayar. Dana diteruskan ke penjual setelah limbah diterima.', 'tani')}<button class="btn btn-disabled" disabled>${I('check')}Pembayaran selesai</button>`; return `<div class="col" data-radio-group="pay">${Object.entries(PAYS).map(([n, [ic, c, d]]) => opt('pay', n, { icon: ic, c, d, sel: n === S.pay })).join('')}</div>
  <button class="btn btn-primary" data-modal="${PAYS[S.pay][3]}">Bayar Rp451.640 via ${S.pay}</button>`; }
V.bayar = () => appShell('Pembayaran Rekber', S.curOrder, `
  <div class="two-col"><div class="card col gap-16"><div class="note primary" style="padding:16px">${ib('shield', 'primary', 48)}<div><b class="t-lg">Aman dengan Rekber SisaGuna</b><div class="t-md muted b6">Dana ditahan & baru diteruskan ke penjual setelah limbah diterima sesuai berat.</div></div></div>
      <div class="grid-3">${[['Estimasi berat', '250 kg', ''], ['Timbangan aktual', '248 kg', 'c-tani'], ['Selisih', '−2 kg (disesuaikan)', '']].map(([k, v, c]) => `<div style="background:var(--bg);border-radius:16px;padding:14px"><div class="t-xs faint b6">${k}</div><b class="t-xl ${c}">${v}</b></div>`).join('')}</div>
      <b class="t-lg">Pilih metode pembayaran</b><div class="col gap-16" id="pay-box">${payBox()}</div></div>
    <div class="col gap-16"><div class="card col"><b class="t-lg">Rincian pembayaran</b>${kv('248 kg × Rp1.600', 'Rp396.800')}${kv('Ongkos jemput', 'Rp35.000')}${kv('Biaya layanan', 'Rp19.840')}<div class="divider"></div>${kv('Total bayar', 'Rp451.640', 1)}</div>
      ${note('lock', 'Transaksi terenkripsi. Dana otomatis kembali jika pesanan dibatalkan.', 'tani')}</div></div>`);

function stars() { const L = ['Sangat buruk', 'Kurang', 'Cukup', 'Baik', 'Sangat baik']; return `<div class="stars">${[1, 2, 3, 4, 5].map(i => `<button class="${i <= S.rating ? 'on' : ''}" data-star="${i}">${I('star')}</button>`).join('')}</div><b class="${S.rating >= 4 ? 'c-tani' : S.rating === 3 ? 'c-warning' : 'c-danger'}">${L[S.rating - 1]} (${S.rating}/5)</b>`; }
V.ulasan = () => appShell('Ulasan Transaksi', 'SG-2611-0040', `<div class="card col gap-20" style="max-width:720px;margin:0 auto;padding:36px;align-items:center">
  <div class="note tani" style="width:100%;padding:16px"><div class="icon-box" style="background:var(--tani);color:#fff;border-radius:50%">${I('check')}</div><div><b class="t-lg">Transaksi selesai!</b><div class="t-md c-tani">248 kg limbah ikan terselamatkan · ± 0,4 ton CO₂e dihindari</div></div></div>
  <div class="avatar ib-tani" style="width:64px;height:64px;font-size:18px">ML</div><b class="t-xl">CV Maggot Lestari</b><span class="muted">Bagaimana pengalamanmu bertransaksi?</span>
  <div class="col" style="align-items:center" id="stars">${stars()}</div>
  ${multi([['Tepat waktu', 1], ['Berat sesuai', 1], ['Limbah bersih', 0], ['Komunikatif', 1], ['Harga adil', 0]])}
  <textarea class="textarea" style="width:100%">Penjemputan cepat, armada berpendingin, timbangan transparan. Mantap!</textarea>
  <div class="grid-2" style="width:100%"><button class="btn btn-outline" data-go="#/pesanan">Lewati</button><button class="btn btn-primary" data-go="#/pesanan" data-toast-after="Terima kasih atas ulasanmu!">Kirim Ulasan</button></div></div>`);

/* ---------- KOMUNIKASI & AKUN ---------- */
V.pesan = () => appShell('Pesan', '3 percakapan belum dibaca', `<div class="chat"><div class="chat-list"><div class="search" style="width:auto">${I('search')}<input placeholder="Cari percakapan…"></div>
    ${[['ML', 'tani', 'CV Maggot Lestari', 'Saya terima ya pak 🙏', '07.40', 0, 1], ['DR', 'batik', 'Pak Darto (Driver)', 'Saya sudah di gerbang TPI', '08.40', 1], ['RU', 'batik', 'Rumah Upcycle Kanoman', 'Perca motif parang masih ada?', 'Kemarin', 1], ['KM', 'industri', 'PT Kemasan Nusantara', 'Dokumen tender sudah kami unggah', 'Kemarin', 1], ['CS', 'primary', 'CS SisaGuna', 'Verifikasi usahamu disetujui ✅', '12 Nov', 0]].map(([ini, c, n, m, t, un, act]) => `<div class="chat-item ${act ? 'active' : ''}" data-chat><div class="avatar ib-${c}" style="width:44px;height:44px">${ini}</div><div class="grow" style="min-width:0"><b>${n}</b><div class="t-sm ${un ? 'b7' : 'muted'}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m}</div></div><div class="col gap-4" style="align-items:flex-end"><span class="t-xs b6 ${un ? 'c-primary' : 'faint'}">${t}</span>${un ? '<span class="badge" style="background:var(--primary);color:#fff;font-size:11px;font-weight:800;padding:2px 7px;border-radius:999px">1</span>' : ''}</div></div>`).join('')}</div>
  <div class="chat-room"><div class="row" style="padding:14px 20px;border-bottom:1px solid var(--border)"><div class="avatar ib-tani" style="width:44px;height:44px">ML</div><div class="grow"><b class="t-lg">CV Maggot Lestari</b><div class="t-sm c-tani b6">● Online · Mitra Pengolah · Batang</div></div><button class="icon-box ib-tani" style="width:40px;height:40px" data-toast="Menelepon…">${I('phone')}</button></div>
    <div class="row" style="padding:10px 20px;background:var(--bg)">${photo('tulang', '', 'width:36px;height:36px;border-radius:10px')}<div class="grow"><b class="t-md">Tulang & kepala ikan tongkol</b><div class="t-xs c-primary b6">Rp1.500/kg · ± 250 kg · TPI Klidang Lor</div></div><button class="btn btn-plain btn-sm" data-go="#/detail">Lihat Limbah</button></div>
    <div class="msgs" id="msgs"><div class="msg">Selamat pagi Bu, limbah tulang ikannya masih tersedia?<small>07.31</small></div><div class="msg me">Masih pak, ± 250 kg di drum tertutup. Siap dijemput hari ini.<small>07.33</small></div>
      <div class="card col gap-8" style="max-width:320px;border:1.5px solid var(--primary)"><div class="row gap-8 c-primary b8 t-sm">${I('tag')}Penawaran</div><b class="t-xl">Rp1.600/kg · 250 kg</b><span class="t-sm muted">Jemput hari ini 10.00 · Mitra Logistik</span><div class="grid-2" style="gap:8px"><button class="btn btn-plain btn-sm" data-toast="Penawaran ditolak">Tolak</button><button class="btn btn-primary btn-sm" data-go="#/jejak">Terima</button></div></div>
      <div class="msg me">Saya terima ya pak 🙏<small>07.40</small></div></div>
    <form class="chat-input" id="chat-form"><button type="button" class="round ib-primary" data-toast="Lampirkan foto/dokumen">${I('plus')}</button><input placeholder="Tulis pesan…" id="chat-text"><button class="round" style="background:var(--primary);color:#fff">${I('send')}</button></form></div></div>`);

V.notifikasi = () => { const cats = ['Semua', 'Transaksi', 'Penjemputan', 'Sistem']; return appShell('Notifikasi', 'Semua aktivitas akunmu', `
  <div class="row between">${tabsBar('notif', cats.map(c => [c, `${c} (${c === 'Semua' ? NOTIFS.length : NOTIFS.filter(n => n[6] === c).length})`]), 'Semua', 'chips')}<a class="link" data-mark-read>Tandai semua dibaca</a></div>
  ${cats.map(c => pane('notif', c, 'Semua', `<div class="card p0">${NOTIFS.filter(n => c === 'Semua' || n[6] === c).map(([ic, col, t, s, tm, un, , go]) => `<div class="row notif-item" style="padding:16px 24px;gap:14px;cursor:pointer;${un ? 'background:var(--primary-light)' : ''};border-bottom:1px solid var(--border)" data-go="${go}">${ib(ic, col, 44)}<div class="grow"><b class="t-lg">${t}</b><div class="t-md muted">${s}</div></div><span class="t-sm faint b6">${tm}</span>${un ? '<i class="unread" style="width:10px;height:10px;border-radius:50%;background:var(--primary);display:block"></i>' : ''}</div>`).join('')}</div>`)).join('')}`); };

const TX = [['tulang', 'Limbah tulang ikan', 'CV Maggot Lestari · SG-2611-0040', '14 Nov 2026', '+Rp356.250', 1], ['perca', 'Kain perca batik', 'Rumah Upcycle Kanoman · SG-2611-0036', '12 Nov 2026', '+Rp462.000', 1], [null, 'Tarik dana ke BRI', '•••• 4521', '10 Nov 2026', '−Rp1.000.000', 0], ['sekam', 'Sekam padi', 'UD Briket Subah Jaya · SG-2611-0031', '8 Nov 2026', '+Rp427.500', 1], ['kardus', 'Kardus & palet kayu', 'PT Kemasan Nusantara · SG-2611-0028', '5 Nov 2026', '+Rp1.235.000', 1], [null, 'Tarik dana ke BRI', '•••• 4521', '1 Nov 2026', '−Rp750.000', 0]];
V.dompet = () => appShell('Dompet', 'Saldo, rekber & penarikan', `
  <div class="two-col"><div class="hero" style="flex-direction:column;align-items:flex-start"><span class="b6" style="color:var(--primary-light)">Saldo SisaGuna</span><div style="font-size:40px;font-weight:800">Rp3.412.500</div><div class="row"><button class="btn btn-ghost-white btn-sm" data-modal="tarik">${I('download')}Tarik Dana</button><button class="btn btn-ghost-white btn-sm" data-tabjump="dompet:Keluar">${I('file')}Riwayat Penarikan</button></div></div>
    <div class="col gap-16"><div class="card row clickable" data-go="#/bayar">${ib('shield', 'primary')}<div class="grow"><div class="t-sm muted b6">Dana di Rekber</div><b>Rp486.000 · 1 transaksi</b></div>${I('chevron', 'faint')}</div><div class="card row">${ib('wallet', 'tani')}<div class="grow"><div class="t-sm muted b6">Rekening penarikan</div><b>BRI •••• 4521 · a.n. ${esc(me().nama)}</b></div></div></div></div>
  <div class="card p0"><div class="row between" style="padding:18px 24px"><div class="h3">Riwayat Transaksi</div>${tabsBar('dompet', [['Semua'], ['Masuk'], ['Keluar']], 'Semua', 'chips')}</div>
    ${['Semua', 'Masuk', 'Keluar'].map(t => `<div data-pane-of="dompet" data-pane="${t}" class="${t === 'Semua' ? '' : 'hidden'}">${TX.filter(x => t === 'Semua' || (t === 'Masuk') === !!x[5]).map(([img, n, s, d, v, pos]) => `<div class="row" style="padding:14px 24px;border-top:1px solid var(--border);gap:14px">${img ? photo(img, '', 'width:40px;height:40px') : ib('download', 'primary', 40)}<div class="grow"><b>${n}</b><div class="t-sm muted">${s}</div></div><span class="muted t-md" style="width:160px">${d}</span><b style="width:140px;text-align:right" class="${pos ? 'c-tani' : ''}">${v}</b></div>`).join('')}${t !== 'Semua' ? `<div class="row between" style="padding:14px 24px;background:var(--bg)"><b class="muted">Total ${t.toLowerCase()} bulan ini</b><b class="${t === 'Masuk' ? 'c-tani' : ''}">${t === 'Masuk' ? '+Rp2.480.750' : '−Rp1.750.000'}</b></div>` : ''}</div>`).join('')}</div>`);

const DAMPAK = {
  'Bulan ini': { v: ['1,2', '1,9 t', 'Rp3,4 jt', '8'], tr: '+18% dari bulan lalu', ttl: 'Limbah tersalurkan per bulan (ton)', bars: [['Jun', .3], ['Jul', .4], ['Agu', .55], ['Sep', .5], ['Okt', .75], ['Nov', 1], ['Des', .25]], hl: ['Nov'], cat: [['Perikanan', 'ikan', .55, '660 kg'], ['Batik', 'batik', .35, '420 kg'], ['Pertanian', 'tani', .1, '120 kg'], ['Industri', 'industri', .02, '—']] },
  '3 bulan': { v: ['3,1', '4,9 t', 'Rp8,7 jt', '14'], tr: '+32% dari 3 bulan sebelumnya', ttl: 'Limbah tersalurkan Sep–Nov (ton)', bars: [['Jun', .3], ['Jul', .4], ['Agu', .55], ['Sep', .5], ['Okt', .75], ['Nov', 1], ['Des', .25]], hl: ['Sep', 'Okt', 'Nov'], cat: [['Perikanan', 'ikan', .5, '1,5 t'], ['Batik', 'batik', .3, '0,9 t'], ['Pertanian', 'tani', .15, '0,5 t'], ['Industri', 'industri', .07, '0,2 t']] },
  'Tahun ini': { v: ['9,8', '15,6 t', 'Rp27,4 jt', '31'], tr: 'Target 2026: 12 ton (82%)', ttl: 'Limbah tersalurkan 2026 (ton)', bars: [['Jan', .35], ['Feb', .3], ['Mar', .45], ['Apr', .5], ['Mei', .55], ['Jun', .6], ['Jul', .65], ['Agu', .7], ['Sep', .68], ['Okt', .85], ['Nov', 1]], hl: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov'], cat: [['Perikanan', 'ikan', .48, '4,7 t'], ['Batik', 'batik', .27, '2,6 t'], ['Pertanian', 'tani', .17, '1,7 t'], ['Industri', 'industri', .08, '0,8 t']] }
};
V.dampak = () => appShell('Dashboard Dampak', 'Laporan lingkungan & ESG', `
  <div class="row between">${tabsBar('dampak', Object.keys(DAMPAK).map(k => [k]), 'Bulan ini', 'chips')}<button class="btn btn-primary btn-sm" data-pdf="dampak">${I('download')}Unduh Laporan ESG (PDF)</button></div>
  ${Object.entries(DAMPAK).map(([k, d]) => pane('dampak', k, 'Bulan ini', `
    <div class="grid-4"><div class="hero green" style="flex-direction:column;align-items:flex-start;gap:4px;padding:20px;border-radius:20px"><span class="b6">Limbah tersalurkan</span><div><span style="font-size:36px;font-weight:800">${d.v[0]}</span> <b>ton</b></div><span class="pill" style="background:rgba(255,255,255,.25);color:#fff">${I('trend')}${d.tr}</span></div>
      ${[['cloud', 'tani', d.v[1], 'CO₂e dihindari'], ['wallet', 'primary', d.v[2], 'Pendapatan dari limbah'], ['recycle', 'industri', d.v[3], 'Mitra pengolah aktif']].map(([ic, c, v, l]) => `<div class="card col gap-8">${ib(ic, c, 40)}<b style="font-size:24px">${v}</b><span class="t-sm muted b6">${l}</span></div>`).join('')}</div>
    <div class="two-col"><div class="card col gap-16"><div class="h3">${d.ttl}</div><div class="chart">${d.bars.map(([m, v]) => `<div class="c ${d.hl.includes(m) ? 'hl' : ''}"><span style="height:${Math.round(180 * v)}px"></span><small>${m}</small></div>`).join('')}</div></div>
      <div class="card col"><div class="h3">Per kategori</div>${d.cat.map(([n, c, v, l]) => `<div class="col gap-4"><div class="row between t-md"><b>${n}</b><b class="muted">${l}</b></div>${bar(v, c)}</div>`).join('')}</div></div>`)).join('')}
  <div class="card p0"><div style="padding:18px 24px" class="h3">Laporan & sertifikat</div>${[['Laporan Dampak Oktober 2026', 'PDF · 1,2 MB · siap untuk PROPER/ESG'], ['Laporan Dampak September 2026', 'PDF · 1,1 MB'], ['Sertifikat Mitra Sirkular 2026', 'PDF · diterbitkan SisaGuna']].map(([t, d]) => `<div class="row" style="padding:14px 24px;border-top:1px solid var(--border)">${ib('file', 'tani', 40)}<div class="grow"><b>${t}</b><div class="t-sm muted">${d}</div></div><button class="btn btn-plain btn-sm" data-pdf="${/Sertifikat/.test(t) ? 'sertifikat' : 'laporan'}" data-judul="${t}">${I('download')}Unduh</button></div>`).join('')}</div>`);

V.profil = () => { const P = me('penghasil');
  return appShell('Profil & Pengaturan', esc(P.nama), `
  <div class="two-col" style="grid-template-columns:340px 1fr"><div class="card col" style="align-items:center;text-align:center;padding:24px"><div class="avatar ib-primary" style="width:88px;height:88px;font-size:26px">${P.ini}</div><b class="t-xl" style="word-break:break-word">${esc(P.nama)}</b><div class="row gap-8" style="justify-content:center">${!(S.prof.penghasil || {}).nama ? pill('Belum lengkap', 'warning') : (DB.on && !P.verified) ? pill('Menunggu verifikasi', 'warning') : pill('✓ Terverifikasi', 'tani')}${pill('Penghasil Limbah', 'primary')}</div>
      <div class="row between" style="background:var(--bg);border-radius:16px;padding:14px;width:100%">${[['4.9 ★', 'Rating'], ['42', 'Transaksi'], ['5,6 t', 'Tersalur']].map(([v, k]) => `<div><b class="t-lg">${v}</b><div class="t-xs muted b6">${k}</div></div>`).join('')}</div>
      ${[['phone', esc(P.wa || S.phone) || 'Nomor WhatsApp belum diisi'], ['pin', [P.alamat, P.kec].filter(Boolean).map(esc).join(', ') || 'Alamat belum diisi'], ['calendar', 'Bergabung Nov 2026']].map(([ic, v]) => `<div class="row" style="width:100%;text-align:left">${I(ic, 'faint')}<span class="muted">${v}</span></div>`).join('')}
      <button class="btn btn-danger-soft btn-block" data-go="#/keluar">${I('logout')}Keluar</button></div>
    <div class="col gap-20"><div class="card col gap-16" id="profil-form"><div class="row between"><div class="h3">Informasi usaha</div><button class="btn btn-primary btn-sm" data-save-profile>Simpan Perubahan</button></div>
        <div class="grid-2">${field('Nama usaha', 'nama', 'Contoh: UD Batik Sekar Jagad', (S.prof.penghasil || {}).nama)}${field('NIB', 'nib', '13 digit Nomor Induk Berusaha', P.nib)}${dd('dd-pu', 'Jenis usaha', [['Perikanan'], ['Batik & Konveksi'], ['Pabrik & Industri'], ['Pertanian & Perkebunan']], P.usaha || '', { name: 'usaha', ph: 'Pilih jenis usaha' })}${field('Email', 'email', 'nama@email.com', P.email, 'email')}
          ${dd('dd-pk', 'Kecamatan', KECAMATAN, P.kec || '', { name: 'kec', ph: 'Pilih kecamatan' })}${field('Alamat lengkap', 'alamat', 'Nama jalan, nomor, kelurahan/desa', P.alamat)}</div></div>
      <div class="card col"><div class="h3">Dokumen & verifikasi</div>${[['NIB (Nomor Induk Berusaha)', P.nib ? 'Terverifikasi' : 'Belum diisi', !!P.nib], ['Foto lokasi usaha', 'Menunggu unggahan', 0], ['Izin pengelolaan limbah B3', 'Belum diunggah · opsional', 0]].map(([t, st, ok]) => `<div class="row" style="background:var(--bg);border-radius:14px;padding:14px">${ib(ok ? 'checkCircle' : 'upload', ok ? 'tani' : 'warning', 40)}<div class="grow"><b>${t}</b><div class="t-sm muted">${st}</div></div>${ok ? '' : '<label class="btn btn-secondary btn-sm">Unggah<input type="file" hidden></label>'}</div>`).join('')}</div>
      <div class="card col"><div class="h3">Pengaturan notifikasi</div>${[['Penawaran baru via WhatsApp', 1], ['Pengingat jadwal panen', 1], ['Tender baru di kawasan industri', 0]].map(([t, on]) => `<div class="row between"><span class="b6">${t}</span>${sw(on)}</div>`).join('')}</div></div></div>`); };

V.bantuan = () => appShell('Pusat Bantuan', 'Kami siap membantu', `
  <div class="hero" style="flex-direction:column;justify-content:center"><div class="h1" style="font-size:28px">Ada yang bisa kami bantu?</div><div class="search" style="background:#fff;width:560px;height:52px">${I('search')}<input placeholder='Cari pertanyaan, mis. "biaya layanan"…'></div></div>
  <div class="grid-4">${[['plus', 'primary', 'Cara posting limbah', 'Foto, kategori, harga'], ['shield', 'tani', 'Pembayaran & rekber', 'Keamanan dana'], ['info', 'warning', 'Limbah B3 & izin', 'Aturan & dokumen'], ['truck', 'ikan', 'Penjemputan', 'Jemput Cepat & logistik']].map(([ic, c, t, d]) => `<div class="card col clickable">${ib(ic, c)}<b class="t-lg">${t}</b><span class="t-sm muted">${d}</span></div>`).join('')}</div>
  <div class="two-col r340"><div class="card col"><div class="h3">Pertanyaan populer</div>${[['Berapa biaya layanan SisaGuna?', 'Biaya layanan 5% dari nilai transaksi, dipotong otomatis saat dana rekber diteruskan ke penjual.', 1], ['Bagaimana jika berat limbah tidak sesuai?', 'Total otomatis disesuaikan dengan hasil timbangan yang difoto mitra logistik sebelum dana rekber diteruskan.'], ['Apakah limbah B3 boleh diposting?', 'Hanya akun yang sudah mengunggah izin pengelolaan limbah B3 yang masih berlaku. Tanpa izin, listing B3 otomatis ditolak.'], ['Berapa lama dana rekber cair?', 'Maksimal 1×24 jam setelah penerima mengonfirmasi limbah diterima sesuai berat.']].map(([q, a, o]) => `<div class="acc ${o ? 'open' : ''}"><div class="q">${q}${I('chevron')}</div><div class="a">${a}</div></div>`).join('')}</div>
    <div class="card col"><div class="h3">Masih butuh bantuan?</div><p class="muted">Tim CS siap membantu setiap hari 07.00–21.00 WIB.</p><button class="btn btn-primary" data-go="#/pesan">Chat CS via WhatsApp</button><a class="btn btn-outline" href="mailto:halo@sisaguna.id">Kirim Email</a></div></div>`);

/* ---------- MITRA PENGOLAH ---------- */
V.pBeranda = () => appShell('Beranda Mitra Pengolah', esc(me('pengolah').nama) + (me('pengolah').kec ? ' · ' + me('pengolah').kec : ''), `
  <div class="hero green"><div class="col gap-8"><h2>Halo, ${esc(me('pengolah').nama)} 👋</h2><p>Kebutuhan bahan baku bulan ini sudah 72% terpenuhi.</p><div class="row" style="margin-top:8px"><button class="btn btn-white" style="color:var(--tani)" data-go="#/jelajah">Cari Bahan Baku</button><button class="btn btn-ghost-white" data-go="#/bahan-baku">Pasang Permintaan</button></div></div>
    <div class="card col gap-8 clickable" style="width:340px;color:var(--text)" data-go="#/p/gudang"><span class="t-sm muted b6">Kapasitas olah bulan ini</span><b style="font-size:22px">5,8 / 8 ton</b>${bar(.72, 'tani')}<span class="t-xs b6 c-tani">Sisa kapasitas 2,2 ton · cari bahan baku tambahan</span></div></div>
  <div class="grid-4">${stat('box', 'tani', '5,8 ton', 'Bahan baku masuk bulan ini', '#/p/gudang')}${stat('tag', 'primary', '2', 'Penawaran menunggu', '#/p/penawaran')}${stat('wallet', 'batik', 'Rp4,1 jt', 'Pengeluaran bahan baku', '#/dompet')}${stat('recycle', 'industri', '3,2 ton', 'Produk olahan jadi', '#/p/gudang')}</div>
  <div class="two-col r340"><div class="col gap-16">${secHead('Rekomendasi bahan baku untukmu', 'Lihat semua', '#/jelajah')}<span class="muted t-md">${(me('pengolah').kategori || []).length ? 'Sesuai kategori yang kamu terima: ' + me('pengolah').kategori.join(' & ') + ' · radius 15 km' : 'Rekomendasi umum · radius 15 km dari lokasimu'}</span>
      <div class="grid-cards cols-3" id="latest">${[0, 11, 3].map(i => lcard(LISTINGS[i])).join('')}</div>
      <div class="note warning clickable" style="padding:16px;justify-content:space-between" data-go="#/bahan-baku"><div class="row">${ib('clipboard', 'batik')}<div><b class="t-lg">Permintaan aktif: Sekam padi · 2 ton/bulan</b><div class="t-sm muted">4 penghasil limbah menawarkan stoknya</div></div></div>${I('chevron', 'faint')}</div></div>
    <div class="col gap-16"><div class="card col"><b class="t-lg">Penerimaan hari ini</b><div class="row">${photo('truk', '', 'width:52px;height:52px')}<div><b>Tulang & kepala ikan · 248 kg</b><div class="t-sm muted">Dari TPI Klidang Lor · tiba ± 09.30</div></div></div><button class="btn btn-secondary btn-sm" data-go="#/jejak">Lacak Kiriman</button></div>
      <div class="card col">${secHead('Penawaran terkirim', 'Semua', '#/p/penawaran')}${[['tulang', 'Tulang & kepala ikan', 'Rp1.600/kg', 'Diterima', 'tani'], ['sekam', 'Sekam & jerami padi', 'Rp280/kg', 'Menunggu', 'warning']].map(([k, t, v, s, c]) => `<div class="row">${photo(k, '', 'width:40px;height:40px')}<div class="grow"><b class="t-md">${t}</b><div class="t-sm c-primary b6">${v}</div></div>${pill(s, c)}</div>`).join('')}</div>
      <div class="card col">${secHead('Stok gudang', 'Kelola', '#/p/gudang')}${[['Tulang ikan', '1,2 t', .6, 'ikan'], ['Jeroan ikan', '0,4 t', .2, 'warning'], ['Sekam padi', '0,8 t', .4, 'tani']].map(([k, v, w, c]) => `<div class="col gap-4"><div class="row between t-sm"><b>${k}</b><b class="muted">${v}</b></div>${bar(w, c)}</div>`).join('')}</div></div></div>`);

V.pPenawaran = () => { const D = { Menunggu: [['sekam', 'Sekam & jerami padi', 'Kel. Tani Subah', 'Rp280/kg × 1,5 ton', 'Jemput sendiri · 16 Nov', 'Menunggu · berakhir 5 jam', 'warning', [['Ubah Penawaran', 'btn-secondary', '#/tawar'], ['Chat Penjual', 'btn-plain', '#/pesan']]], ['jeroan', 'Jeroan ikan pindang', 'Pengolahan Ikan Wonokerto', 'Rp950/kg × 150 kg', 'Mitra Logistik · 15 Nov', 'Menunggu · berakhir 1 hari', 'warning', [['Ubah Penawaran', 'btn-secondary', '#/tawar'], ['Chat Penjual', 'btn-plain', '#/pesan']]]], Diterima: [['tulang', 'Tulang & kepala ikan tongkol', 'Koperasi Nelayan Mina Batang', 'Rp1.600/kg × 250 kg', 'Mitra Logistik · 14 Nov 10.00', 'Diterima · bayar rekber', 'tani', [['Bayar Rekber', 'btn-primary', '#/bayar'], ['Lacak Kiriman', 'btn-plain', '#/jejak']]]], Ditolak: [['udang', 'Cangkang udang kering', 'Nelayan Roban', 'Rp2.000/kg × 60 kg', 'Jemput sendiri', 'Ditolak · ada penawaran lebih tinggi', 'danger', [['Cari Serupa', 'btn-secondary', '#/jelajah']]]] };
  return appShell('Penawaran Saya', 'Status penawaran bahan baku yang kamu ajukan', `${tabsBar('pp', Object.keys(D).map(k => [k, `${k} (${D[k].length})`]), 'Menunggu')}
  ${Object.entries(D).map(([k, list]) => pane('pp', k, 'Menunggu', list.map(([img, t, s, pr, mt, st, c, acts]) => `<div class="card row gap-16">${photo(img, '', 'width:84px;height:72px;border-radius:14px')}<div class="col gap-4 grow"><b class="t-lg">${t}</b><span class="t-sm muted">Penjual: ${s}</span><b class="t-md c-primary">${pr} · ${mt}</b><div>${pill(st, c)}</div></div><div class="col gap-8" style="width:170px">${acts.map(([l, b, go]) => `<button class="btn ${b} btn-sm" data-go="${go}">${l}</button>`).join('')}</div></div>`).join('') + (k === 'Menunggu' ? note('info', 'Penawaran otomatis kedaluwarsa jika tidak direspons penjual dalam 24 jam. Dana belum dipotong selama menunggu.') : ''))).join('')}`); };

V.pGudang = () => appShell('Gudang & Produksi', 'Stok bahan baku, batch olahan & bukti pengolahan', `${tabsBar('gd', [['stok', 'Stok Bahan Baku'], ['batch', 'Batch Produksi']], 'stok')}
  ${pane('gd', 'stok', 'stok', `<div class="card col"><div class="row between"><b class="t-lg">Kapasitas gudang</b><b class="c-tani">2,4 / 4 ton terisi</b></div>${bar(.6, 'tani')}</div>
    <div class="card p0"><table class="table"><thead><tr><th>Bahan baku</th><th>Jumlah</th><th>Masuk</th><th>Asal</th><th>Status</th></tr></thead><tbody>${[['tulang', 'Tulang & kepala ikan', '1,2 ton', '14 Nov 2026', 'TPI Klidang Lor', 'Siap diolah', 'tani'], ['jeroan', 'Jeroan ikan pindang', '0,4 ton', '13 Nov 2026', 'Wonokerto', 'Segera diolah', 'warning'], ['sekam', 'Sekam padi', '0,8 ton', '10 Nov 2026', 'Kel. Tani Subah', 'Stok aman', 'primary']].map(([k, n, q, d, o, s, c]) => `<tr><td><div class="row">${photo(k)}<b>${n}</b></div></td><td>${q}</td><td class="muted">${d}</td><td class="muted">${o}</td><td>${pill(s, c)}</td></tr>`).join('')}</tbody></table></div>
    <div><button class="btn btn-primary btn-sm" data-go="#/jelajah">${I('search')}Tambah Bahan Baku</button></div>`)}
  ${pane('gd', 'batch', 'stok', [['maggot', 'Batch #12 · Pakan maggot', .6, 'Proses · hari 6 dari 10', 'primary', 'tulang & kepala ikan 1,2 t', 1], ['tepung', 'Batch #11 · Tepung ikan', 1, 'Selesai · bukti terkirim ✓', 'tani', 'tulang & kepala ikan 1,0 t', 0], ['pupuk', 'Batch #13 · Pupuk organik cair', 0, 'Dijadwalkan 18 Nov', 'warning', 'jeroan 0,4 t', 0]].map(([k, t, p, s, c, bhn, up]) => `<div class="card row gap-16">${photo(k, '', 'width:84px;height:72px;border-radius:14px')}<div class="col gap-8 grow"><div class="row"><b class="t-lg">${t}</b>${pill(s, c)}</div><span class="t-sm muted">Bahan: ${bhn}</span>${bar(p, c === 'warning' ? 'warning' : 'tani')}</div>${up ? `<button class="btn btn-primary btn-sm" data-go="#/jejak" data-toast-after="Bukti pengolahan terkirim ✓">${I('upload')}Unggah Bukti Pengolahan</button>` : ''}</div>`).join('') + note('checkCircle', 'Bukti pengolahan menutup Jejak Limbah dan masuk ke laporan dampak/ESG penjual.', 'tani'))}`);

/* ---------- MITRA LOGISTIK ---------- */
const TPI_LL = [-6.8838, 109.7383], MAGGOT_LL = [-6.9300, 109.7400];
function routeMap(h, t, extra = '') { return lmap('route', h, `data-from="${TPI_LL.join(',')}" data-to="${MAGGOT_LL.join(',')}" data-t="${t}" data-from-label="TPI Klidang Lor (jemput)" data-to-label="CV Maggot Lestari (tujuan)" ${extra}`); }
V.lBeranda = () => { const L = me('logistik'); return appShell('Beranda Mitra Logistik', [L.armada, L.plat].filter(Boolean).map(esc).join(' · ') || 'Lengkapi data armada di verifikasi', `
  <div class="hero"><div class="col gap-8"><h2>Halo, ${esc(L.nama)} 👋</h2><p>1 tugas aktif & 3 order baru di sekitarmu hari ini.</p><div class="row" style="margin-top:8px"><button class="btn btn-white" data-go="#/l/tugas">${I('pin')}Lanjutkan Tugas</button><button class="btn btn-ghost-white" data-go="#/l/order">Lihat Order Baru</button></div></div>
    <div class="card row" style="width:380px;color:var(--text)">${photo('truk', '', 'width:64px;height:56px;border-radius:14px')}<div class="grow"><b class="t-md">${[L.plat, L.armada].filter(Boolean).map(esc).join(' · ') || 'Armada belum diisi'}</b><div class="t-xs muted b6">${L.pendingin ? 'Box berpendingin 4°C · ' : ''}muatan maks. ${esc(L.kapasitas) || '—'}</div><div class="t-sm b7 c-tani" id="siap-label">Siap terima order</div></div><div class="switch on" data-toggle-label="#siap-label" data-on="Siap terima order" data-off="Sedang istirahat"></div></div></div>
  <div class="grid-4">${stat('box', 'primary', '3', 'Order tersedia', '#/l/order')}${stat('pin', 'ikan', '1', 'Tugas aktif', '#/l/tugas')}${stat('wallet', 'tani', 'Rp210.000', 'Pendapatan hari ini', '#/l/pendapatan')}${stat('star', 'warning', '4.9', 'Rating mitra')}</div>
  <div class="two-col r340"><div class="card col">${secHead('Rute tugas berikutnya', 'Buka tugas', '#/l/tugas')}${routeMap(330, .25)}<div class="row">${photo('tulang', '', 'width:52px;height:52px')}<div class="grow"><b class="t-lg">Tulang & kepala ikan · 250 kg</b><div class="t-sm muted">TPI Klidang Lor → CV Maggot Lestari · 3 km · 10.00</div></div>${pill('Rp35.000', 'tani')}</div></div>
    <div class="col gap-16"><div class="card col"><b class="t-lg">Jadwal hari ini</b>${[['10.00', 'TPI Klidang Lor → CV Maggot Lestari', 'Aktif', 'primary'], ['13.00', 'Kauman → Rumah Upcycle Kanoman', 'Dijadwalkan', 'warning']].map(([t, r, s, c]) => `<div class="row"><b style="background:var(--bg);border-radius:10px;padding:8px 10px" class="t-sm">${t}</b><div class="col gap-4"><b class="t-sm">${r}</b><div>${pill(s, c)}</div></div></div>`).join('')}</div>
      <div class="card col">${secHead('Pendapatan minggu ini', 'Detail', '#/l/pendapatan')}<b class="c-tani" style="font-size:22px">Rp1.240.000</b><div class="chart" style="height:90px">${[['Sen', .5], ['Sel', .7], ['Rab', .4], ['Kam', .9], ['Jum', .6], ['Sab', 1], ['Min', .2]].map(([d, v]) => `<div class="c"><span style="height:${Math.round(64 * v)}px;background:var(--${d === 'Sab' ? 'tani' : 'tani-light'})"></span><small>${d}</small></div>`).join('')}</div></div></div></div>`); };

V.lOrder = () => { const tabs = ['Semua', 'Butuh Pendingin', 'Pick-up', 'Truk']; return appShell('Order Tersedia', 'Order jemput limbah di wilayah layananmu', `${DB.on ? `<div class="col gap-16" id="lo-box">${loading()}</div><div class="col gap-16" id="lj-box">${loading()}</div><div class="h3">Order contoh</div>` : ''}
  ${tabsBar('lo', tabs.map(t => [t, `${t} (${LOG_ORDERS.filter(o => o[7].includes(t)).length})`]), 'Semua', 'chips')}
  ${tabs.map(t => pane('lo', t, 'Semua', (t === 'Truk' ? note('info', 'Armadamu pick-up 1 ton. Order truk hanya bisa diambil mitra dengan truk box 4 ton.', 'warning') : '') + LOG_ORDERS.filter(o => o[7].includes(t)).map(([img, n, r, tm, fee, bd, c, , st]) => `
    <div class="card row gap-16" style="${st === 'no' ? 'opacity:.65' : ''}">${photo(img, '', 'width:72px;height:64px;border-radius:14px')}<div class="col gap-4 grow"><b class="t-lg">${n}</b><span class="t-md muted">${r}</span><div class="row gap-8">${pill(tm, 'primary')}${pill(bd, c)}</div></div>
      <div class="col gap-4" style="align-items:flex-end"><b class="c-tani" style="font-size:20px">${fee}</b><span class="t-xs faint b6">ongkos jemput</span></div>
      ${st === 'urgent' ? `<button class="btn btn-primary btn-sm" data-go="#/l/tugas">Ambil & Mulai</button>` : st === 'ok' ? `<button class="btn btn-secondary btn-sm" data-modal="p07">Ambil Order</button>` : `<button class="btn btn-disabled btn-sm" disabled>Armada tidak sesuai</button>`}</div>`).join(''))).join('')}`); };

const STEPS = ['Menuju lokasi jemput', 'Tiba & timbang muatan', 'Menuju pengolah', 'Serah terima'];
function tugasView() { const n = S.step;
  const act = [`<b class="t-lg">Menuju TPI Klidang Lor</b><span class="muted">2,1 km · tiba ± 08.40 · temui petugas TPI</span><button class="btn btn-plain" data-go="#/pesan">${I('phone')}Hubungi Penjual</button>`,
    `<b class="t-lg">Timbang & foto muatan</b>${photo('timbang', '', 'width:100%;height:150px;border-radius:14px')}<div class="row between" style="background:var(--bg);border-radius:12px;padding:12px"><span class="muted b6">Berat aktual</span><b class="c-tani t-lg">248 kg</b></div>`,
    `<b class="t-lg">Menuju CV Maggot Lestari</b><span class="muted">3 km · tiba ± 09.30 · gudang belakang</span>${note('zap', 'Suhu box tercatat otomatis tiap 10 menit', 'ikan')}`,
    `<b class="t-lg">Serah terima ke pengolah</b>${photo('manifest', '', 'width:100%;height:150px;border-radius:14px')}${note('checkCircle', 'Manifest ditandatangani penerima ✓', 'tani')}`][n - 1];
  const btn = ['Saya Sudah Tiba di TPI', 'Konfirmasi Muat 248 kg', 'Saya Sudah Tiba di Pengolah', 'Selesaikan Tugas'][n - 1];
  const nav = `<a class="btn btn-secondary" id="gmaps-link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&origin=${TPI_LL.join(',')}&destination=${MAGGOT_LL.join(',')}">${I('map')}Buka navigasi di Google Maps</a><span class="t-sm muted b6" id="route-eta"></span>`;
  return `<div class="card col"><div class="row between"><b class="t-lg">SG-2611-0040 · Jemput Cepat</b>${pill(n < 4 ? `Langkah ${n} dari 4` : 'Hampir selesai', 'primary')}</div>${routeMap(420, [.15, .5, .75, 1][n - 1], 'data-eta="#route-eta"')}
      <div class="grid-3">${[['Muatan', 'Tulang & kepala ikan · ± 250 kg'], ['Suhu box', '4°C · stabil'], ['Ongkos', 'Rp35.000']].map(([k, v]) => `<div style="background:var(--bg);border-radius:14px;padding:12px"><div class="t-xs faint b6">${k}</div><b class="t-md">${v}</b></div>`).join('')}</div></div>
    <div class="col gap-16"><div class="card col"><b class="t-lg">Progres tugas</b>${STEPS.map((s, i) => { const k = i + 1; const st = k < n ? 'done' : k === n ? 'cur' : ''; return `<div class="step ${st}"><div class="n" style="width:26px;height:26px;font-size:12px">${k < n ? I('check') : k}</div><span class="${st ? 'b8' : 'faint b6'}">${s}</span></div>`; }).join('')}</div>
      <div class="card col">${act}<button class="btn btn-primary" data-step-next>${btn}</button>${nav}</div></div>`; }
V.lTugas = () => appShell('Tugas Aktif', 'SG-2611-0040 · TPI Klidang Lor → CV Maggot Lestari', `<div class="two-col" id="tugas">${tugasView()}</div>`);

V.lPendapatan = () => { const R = { 'Minggu ini': [['tulang', 'TPI Klidang Lor → CV Maggot Lestari', '14 Nov · 248 kg', 'Rp35.000', '★ 5'], ['perca', 'Kauman → Rumah Upcycle Kanoman', '13 Nov · 120 kg', 'Rp25.000', '★ 5'], ['jeroan', 'Wonokerto → Pakan Ternak Sejahtera', '12 Nov · 150 kg', 'Rp30.000', '★ 4']] };
  R['Bulan ini'] = [...R['Minggu ini'], ['tulang', 'TPI Klidang Lor → Tani Pupuk Organik', '8 Nov · 200 kg', 'Rp40.000', '★ 5'], ['perca', 'Pesindon → Rumah Upcycle Kanoman', '5 Nov · 90 kg', 'Rp25.000', '★ 5']];
  return appShell('Pendapatan & Riwayat', 'Ongkos jemput yang sudah kamu terima', `
  <div class="grid-4"><div class="hero green" style="flex-direction:column;align-items:flex-start;padding:24px;border-radius:24px"><span class="b6">Saldo pendapatan</span><div style="font-size:30px;font-weight:800">Rp1.240.000</div><button class="btn btn-white btn-sm" style="color:var(--primary)" data-modal="p08">${I('download')}Tarik Dana</button></div>
    ${[['truck', 'primary', '12', 'Tugas selesai bulan ini'], ['star', 'warning', '4.9', 'Rating rata-rata'], ['map', 'ikan', '186 km', 'Jarak tempuh']].map(([ic, c, v, k]) => `<div class="card col gap-8">${ib(ic, c, 40)}<b style="font-size:22px">${v}</b><span class="t-sm muted b6">${k}</span></div>`).join('')}</div>
  <div class="card p0"><div class="row between" style="padding:18px 24px"><div class="h3">Riwayat tugas selesai</div>${tabsBar('lp', Object.keys(R).map(k => [k]), 'Minggu ini', 'chips')}</div>
    ${Object.entries(R).map(([k, list]) => `<div data-pane-of="lp" data-pane="${k}" class="${k === 'Minggu ini' ? '' : 'hidden'}">${list.map(([img, r, d, f, rt]) => `<div class="row" style="padding:14px 24px;border-top:1px solid var(--border);gap:14px">${photo(img, '', 'width:44px;height:44px')}<div class="grow"><b>${r}</b><div class="t-sm muted">${d}</div></div>${pill(rt, 'warning')}<b class="c-tani" style="width:120px;text-align:right">+${f}</b></div>`).join('')}<div class="row between" style="padding:14px 24px;background:var(--bg)"><b class="muted">Total ${k.toLowerCase()}</b><b class="c-tani">${k === 'Minggu ini' ? 'Rp90.000 · 3 tugas' : 'Rp155.000 · 5 tugas'}</b></div></div>`).join('')}</div>`); };

/* =========================================================
   MODALS (pop-up detail pilihan)
   ========================================================= */
const MODALS = {
  p01: () => modal('truck', 'primary', 'Penawaran terkirim!', 'Menunggu penjual menerima. Armada SisaGuna otomatis dijadwalkan setelah diterima.', [['Metode', 'Mitra Logistik SisaGuna'], ['Armada', 'Pick-up berpendingin'], ['Jadwal jemput', `${S.tanggal} Nov 2026 · ${S.jam}`], ['Ongkos jemput', 'Rp35.000'], ['Total (ditahan di rekber)', rp(calc().total), 1]], note('bell', 'Nama driver & plat nomor dikirim lewat notifikasi saat armada berangkat.'), ['Tutup', 'Lihat Pesanan', '#/pesanan']),
  p02: () => modal('pin', 'tani', 'Penawaran terkirim!', 'Setelah penjual menerima, ambil limbah sendiri di lokasi dengan kode ambil berikut.', [['Metode', 'Jemput sendiri'], ['Lokasi ambil', S.cur ? esc(S.cur.lokasi || S.cur.kecamatan || 'Lokasi penjual') : 'TPI Klidang Lor, Batang'], ['Jadwal ambil', `${S.tanggal} Nov 2026 · ${S.jam}`], ['Ongkos jemput', 'Gratis'], ['Total (ditahan di rekber)', rp(calc().total), 1]], `<div class="card col gap-4" style="background:var(--tani-light);border:0;width:100%;align-items:center"><span class="t-sm muted b6">Kode ambil</span><b class="c-tani" style="font-size:26px">SG-${Math.random().toString(36).slice(2, 6).toUpperCase()}</b></div>` + note('info', 'Bawa wadah tertutup dan tunjukkan kode ambil ke petugas TPI.', 'warning'), ['Tutup', 'Lihat Pesanan', '#/pesanan']),
  p03: () => { let s = 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; let q = ''; for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) { const f = (x < 6 && y < 6) || (x > 13 && y < 6) || (x < 6 && y > 13); const edge = f && (x % 13 === 0 || x % 13 === 5 || y % 14 === 0 || y % 14 === 5 || (x % 14 >= 2 && x % 14 <= 3 && y % 14 >= 2 && y % 14 <= 3)); q += `<i class="${(f ? edge : r() > .55) ? 'on' : ''}"></i>`; }
    return modal('grid', 'primary', 'Scan QRIS untuk membayar', 'Gunakan e-wallet atau m-banking apa pun. Dana masuk ke Rekber SisaGuna.', null, `<div class="qr">${q}</div><div class="row" style="gap:40px"><div><div class="t-sm faint b6">Total bayar</div><b class="c-primary t-xl">Rp451.640</b></div><div><div class="t-sm faint b6">Bayar dalam</div><b class="c-warning t-xl" id="qr-timer">14:59</b></div></div>`, ['Batal', 'Saya Sudah Bayar', '#/ulasan']); },
  p04: () => modal('wallet', 'primary', 'Bayar dengan Saldo', 'Konfirmasi pembayaran memakai saldo SisaGuna-mu.', [['Saldo saat ini', 'Rp3.412.500'], ['Dibayar', '−Rp451.640'], ['Sisa saldo', 'Rp2.960.860', 1]], `<b>Masukkan PIN SisaGuna</b><div class="otp">${[1, 2, 3, 4, 5, 6].map(() => '<input type="password" maxlength="1" style="width:44px;height:52px">').join('')}</div>`, ['Batal', 'Konfirmasi Bayar', '#/ulasan']),
  p05: () => modal('file', 'primary', 'Transfer Virtual Account', 'Transfer sesuai nominal ke nomor VA di bawah. Status terverifikasi otomatis.', null, `${chips(['BRI', 'BNI', 'BSI', 'Mandiri'], 'BRI')}<div class="row between" style="background:var(--bg);border-radius:16px;padding:16px;width:100%"><div><div class="t-sm faint b6">Nomor VA</div><b class="t-xl" id="va-num">8808 1234 5678 9012</b></div><button class="btn btn-secondary btn-sm" data-copy="#va-num">Salin</button></div><div class="kv total" style="width:100%"><span>Total transfer</span><span>Rp451.640</span></div><div class="col gap-4 t-sm muted" style="width:100%"><span>1. Buka m-banking / ATM → menu Virtual Account</span><span>2. Masukkan nomor VA di atas</span><span>3. Pastikan nama "SisaGuna – Rekber" lalu bayar</span></div>`, ['Batal', 'Cek Status Pembayaran', '#/ulasan']),
  p06: () => modal('recycle', 'tani', 'Permintaan jasa olah terkirim!', 'Dikirim ke 5 pengolah berizin terdekat. Penawaran biaya jasa akan masuk ke halaman Penawaran Masuk.', [['Model', 'Bayar jasa olah'], ['Limbah', 'Tulang & kepala ikan · ± 250 kg'], ['Pengolah dinotifikasi', '5 mitra berizin'], ['Estimasi penawaran pertama', '± 1 jam']], '', ['Tutup', 'Lihat Penawaran', '#/penawaran-masuk']),
  p07: () => modal('calendar', 'batik', 'Order dijadwalkan!', 'Order masuk ke jadwal hari ini. Kamu akan diingatkan 30 menit sebelum waktu jemput.', [['Waktu jemput', 'Sesuai slot penjual'], ['Ongkos jemput', 'Masuk saldo setelah serah terima', 1]], '', ['Tutup', 'Ke Beranda', '#/l/beranda']),
  p08: () => modal('wallet', 'tani', 'Penarikan diproses', 'Dana dikirim ke rekeningmu maksimal 1×24 jam hari kerja.', [['Rekening', 'BRI •••• 7812 · a.n. ' + esc(me('logistik').nama)], ['Jumlah', 'Rp1.240.000', 1]], '', ['Tutup', 'OK', null]),
  tarik: () => modal('download', 'primary', 'Tarik dana', 'Dana dari saldo SisaGuna dikirim ke rekening terdaftar.', [['Rekening', 'BRI •••• 4521 · a.n. ' + esc(me().nama)], ['Saldo tersedia', 'Rp3.412.500']], input('Jumlah penarikan', 'Rp1.000.000'), ['Batal', 'Tarik Sekarang', null, 'Penarikan diproses ✓'])
};
function modal(ic, c, title, sub, rows, extra, [b0, b1, go, msg]) {
  return `<div class="modal-bg" data-close-bg><div class="modal" role="dialog" aria-modal="true">
    <div class="big-ic ib-${c}">${I(ic)}</div><h3>${title}</h3><p>${sub}</p>
    ${rows ? `<div class="box">${rows.map(([k, v, t]) => kv(k, v, t)).join('')}</div>` : ''}${extra || ''}
    <div class="actions"><button class="btn btn-outline" data-close>${b0}</button><button class="btn btn-primary" ${go ? `data-close data-go="${go}"` : `data-close ${msg ? `data-toast="${msg}"` : ''}`}>${b1}</button></div></div></div>`;
}
function openModal(name) { $('#modal-root').innerHTML = MODALS[name](); if (name === 'p03') startTimer(); }
function closeModal() { $('#modal-root').innerHTML = ''; clearInterval(window._qr); }
function startTimer() { let s = 899; clearInterval(window._qr); window._qr = setInterval(() => { const el = $('#qr-timer'); if (!el) return clearInterval(window._qr); s--; el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000); }


/* =========================================================
   MODE DATABASE (aktif jika db.js sudah diisi kunci Supabase)
   ========================================================= */
const loading = (t = 'Memuat data…') => `<div class="card row muted" style="justify-content:center;padding:32px">${t}</div>`;
const errBox = (e) => note('info', 'Gagal memuat data: ' + esc(e.message || e) + '. Coba muat ulang halaman.', 'warning');
const emptyBox = (ic, t, d, btn) => `<div class="card col" style="align-items:center;text-align:center;padding:40px">${ib(ic, 'primary', 64)}<b class="t-lg">${t}</b><span class="muted">${d}</span>${btn || ''}</div>`;
const STATUS_OFFER = { menunggu: ['Menunggu', 'warning'], diterima: ['Diterima', 'tani'], ditolak: ['Ditolak', 'danger'], dibatalkan: ['Dibatalkan', 'danger'] };
const tgl = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* Jelajah */
function jelajahDB() {
  const J = S.jlData;
  const head = `<div class="chips">${['Semua', ...Object.keys(CATS)].map(c => `<button class="chip ${c === S.jlCat ? 'active' : ''}" data-jlcat="${c}">${c}</button>`).join('')}</div>`;
  if (!J) return head + loading();
  if (J.error) return head + errBox(J.error);
  if (!J.rows.length) return head + emptyBox('box', 'Belum ada limbah' + (S.jlCat === 'Semua' ? '' : ' ' + S.jlCat.toLowerCase()), 'Listing yang diposting penghasil limbah akan muncul di sini.', S.role === 'penghasil' ? `<button class="btn btn-primary" data-go="#/posting">${I('plus')}Posting Limbah</button>` : '');
  const pages = Math.max(1, Math.ceil(J.count / 6));
  return `${head}<span class="muted b6 t-md">${J.count} limbah ditemukan · halaman ${S.jlPage} dari ${pages}</span>
    <div class="grid-cards cols-3">${J.rows.map(r => lcard(DB.toCard(r))).join('')}</div>
    ${pages > 1 ? `<div class="row" style="justify-content:center">${[['‹', Math.max(1, S.jlPage - 1)], ...Array.from({ length: Math.min(pages, 7) }, (_, i) => [String(i + 1), i + 1]), ['›', Math.min(pages, S.jlPage + 1)]].map(([l, p]) =>
      `<button class="icon-btn" style="width:38px;height:38px;${l === String(S.jlPage) ? 'background:var(--primary);color:#fff;border:0' : ''}" data-jlpage="${p}"><b>${l}</b></button>`).join('')}</div>` : ''}`;
}
async function loadJelajah() {
  S.jlData = null; const box = $('#jl-results'); if (box) box.innerHTML = jelajahResults();
  try { S.jlData = await DB.listListings({ kategori: S.jlCat, page: S.jlPage }); } catch (e) { S.jlData = { error: e }; }
  const b2 = $('#jl-results'); if (b2) b2.innerHTML = jelajahResults();
}
/* Limbah terbaru di beranda */
async function loadLatest() {
  const box = $('#latest'); if (!box) return;
  try {
    const kat = S.role === 'pengolah' ? me('pengolah').kategori : null;
    const { rows } = await DB.listListings({ per: 3, kategoriIn: kat && kat.length ? kat : null });
    if (rows.length) box.innerHTML = rows.map(r => lcard(DB.toCard(r))).join('');
  } catch (e) { console.error(e); }
}

/* Detail listing dari database */
function galeriDB() {
  const r = S.cur, fotos = r.foto && r.foto.length ? r.foto : [CATS[r.kategori].img], i = Math.min(S.galeri, fotos.length - 1);
  return `${photo(fotos[i], 'gallery-main ' + ck(r.kategori))}${fotos.length > 1 ? `<div class="thumbs">${fotos.map((k, j) => `<div class="photo ${j === i ? 'sel' : ''}" style="background-image:url('${IMG(k)}')" data-galeri="${j}"></div>`).join('')}<span class="pill" style="background:rgba(15,42,74,.55);color:#fff;padding:6px 12px">${i + 1} / ${fotos.length}</span></div>` : ''}`;
}
function detailDB(r) {
  const k = ck(r.kategori), o = r.owner || {}, mine = DB.user && r.owner_id === DB.user.id;
  const det = Object.entries(r.detail || {}).filter(([, v]) => v !== '' && v != null && typeof v !== 'boolean');
  return appShell('Detail Limbah', `Jelajah / ${esc(r.kategori)} / ${esc(r.judul)}`, `
  <div class="two-col"><div class="col gap-20"><div class="col" id="galeri">${galeriDB()}</div>
      <div class="card col"><div class="h3">Deskripsi</div><p class="muted" style="line-height:1.65;white-space:pre-line">${esc(r.deskripsi) || 'Penjual belum menambahkan deskripsi.'}</p>
        <div class="grid-4">${[['scale', 'Estimasi berat', r.berat], ['calendar', 'Frekuensi', r.frekuensi], ['clock', 'Ketersediaan', r.ketersediaan], ['tag', 'Jenis', r.jenis]].map(([ic, kk, v]) => `<div class="row" style="background:var(--bg);border-radius:14px;padding:12px;gap:10px">${ib(ic, k, 34)}<div class="grow"><div class="t-xs faint b6">${kk}</div><b class="t-md">${esc(v) || '—'}</b></div></div>`).join('')}</div>
        ${det.length ? `<div class="col gap-4">${det.map(([a, b]) => kv(esc(a), esc(b))).join('')}</div>` : ''}</div>
      <div class="card row"><div class="avatar ib-primary" style="width:52px;height:52px">${initials(o.nama)}</div><div class="grow"><div class="row gap-4"><b class="t-lg">${esc(o.nama) || 'Penjual'}</b>${o.terverifikasi ? `<span class="c-primary">${I('shield')}</span>` : ''}</div><div class="t-md muted">${esc(o.kecamatan) || 'Batang–Pekalongan'} · diposting ${tgl(r.created_at)}</div></div></div></div>
    <div class="card col sticky" style="box-shadow:var(--shadow)"><div class="row gap-8 wrap">${pill(esc(r.kategori), k)}${pill(esc(r.model), 'primary')}</div>
      <div class="h2">${esc(r.judul)}</div><div class="row gap-8" style="align-items:flex-end"><span class="c-primary" style="font-size:30px;font-weight:800">${r.harga_per_kg != null ? rp(r.harga_per_kg) : 'Nego'}</span><span class="muted b6">${r.harga_per_kg != null ? '/kg' : ''}${r.bisa_nego ? ' · bisa nego' : ''}</span></div>
      <div class="row">${I('pin', 'c-primary')}<div class="grow"><div class="t-xs faint b6">Lokasi</div><b>${esc(r.lokasi || r.kecamatan) || '—'}</b></div></div>
      ${mine ? `${note('info', 'Ini listing milikmu.')}<button class="btn btn-primary" data-go="#/penawaran-masuk">Lihat Penawaran Masuk</button>`
             : `<button class="btn btn-primary" data-go="#/tawar">Ajukan Penawaran</button><button class="btn btn-outline" data-go="#/pesan">Chat Penjual</button>`}
      ${note('shield', 'Pembayaran aman via Rekber SisaGuna')}</div></div>`);
}

/* Penawaran masuk (penghasil) */
const _penawaranMasuk = V.penawaranMasuk;
V.penawaranMasuk = () => DB.on ? appShell('Penawaran Masuk', 'Penawaran untuk limbah yang kamu posting', `<div class="col gap-16" id="incoming">${loading()}</div>`) : _penawaranMasuk();
async function loadIncoming() {
  const box = $('#incoming'); if (!box) return;
  try {
    const list = await DB.incomingOffers(); S.offers = {}; list.forEach(o => S.offers[o.id] = o);
    if (!list.length) { box.innerHTML = emptyBox('tag', 'Belum ada penawaran', 'Penawaran dari pengolah untuk limbahmu akan muncul di sini.', `<button class="btn btn-primary" data-go="#/posting">${I('plus')}Posting Limbah</button>`); return; }
    const groups = {}; list.forEach(o => (groups[o.listing.id] = groups[o.listing.id] || { l: o.listing, items: [] }).items.push(o));
    box.innerHTML = Object.values(groups).map(({ l, items }) => `<div class="card col gap-16">
      <div class="row">${photo((l.foto && l.foto[0]) || CATS[l.kategori].img, ck(l.kategori), 'width:56px;height:56px')}<div class="grow"><b class="t-lg">${esc(l.judul)}</b><div class="t-sm muted">${esc(l.berat) || ''} · ${items.length} penawaran</div></div>${pill(esc(l.kategori), ck(l.kategori))}</div>
      ${items.map(o => { const [st, c] = STATUS_OFFER[o.status]; const b = o.buyer || {};
        return `<div class="row" style="background:var(--bg);border-radius:16px;padding:14px;gap:14px;flex-wrap:wrap"><div class="avatar ib-tani" style="width:46px;height:46px">${initials(b.nama)}</div>
          <div class="col gap-4 grow"><b>${esc(b.nama) || 'Mitra'}</b><span class="t-sm muted">${esc(b.kecamatan) || ''}${b.kecamatan ? ' · ' : ''}${o.jumlah_kg.toLocaleString('id-ID')} kg · ${esc(o.metode_jemput)} · ${tgl(o.tanggal_jemput)} ${esc(o.jam_jemput || '')}</span>${o.catatan ? `<span class="t-sm">“${esc(o.catatan)}”</span>` : ''}</div>
          <div class="col gap-4" style="align-items:flex-end"><b class="c-primary t-xl">${rp(o.harga_per_kg)}/kg</b><span class="t-xs faint b6">Total ${rp(o.total)}</span></div>
          <div class="row gap-8">${o.status === 'menunggu' ? `<button class="btn btn-plain btn-sm" data-offer-act="ditolak" data-oid="${o.id}">Tolak</button><button class="btn btn-primary btn-sm" data-offer-act="diterima" data-oid="${o.id}">Terima</button>` : pill(st, c)}</div></div>`; }).join('')}</div>`).join('');
  } catch (e) { box.innerHTML = errBox(e); }
}

/* Penawaran saya (pengolah) */
const _pPenawaran = V.pPenawaran;
V.pPenawaran = () => DB.on ? appShell('Penawaran Saya', 'Status penawaran bahan baku yang kamu ajukan', `<div class="col gap-20" id="myoffers">${loading()}</div>`) : _pPenawaran();
async function loadMyOffers() {
  const box = $('#myoffers'); if (!box) return;
  try {
    const list = await DB.myOffers(); S.offers = {}; list.forEach(o => S.offers[o.id] = o);
    const T = { Menunggu: ['menunggu'], Diterima: ['diterima'], 'Ditolak/Batal': ['ditolak', 'dibatalkan'] };
    box.innerHTML = tabsBar('mo', Object.keys(T).map(k => [k, `${k} (${list.filter(o => T[k].includes(o.status)).length})`]), 'Menunggu') +
      Object.entries(T).map(([k, sts]) => { const items = list.filter(o => sts.includes(o.status));
        return pane('mo', k, 'Menunggu', items.length ? items.map(o => { const l = o.listing || {}; const [st, c] = STATUS_OFFER[o.status];
          return `<div class="card row gap-16">${photo((l.foto && l.foto[0]) || (CATS[l.kategori] || CATS.Perikanan).img, '', 'width:84px;height:72px;border-radius:14px')}<div class="col gap-4 grow"><b class="t-lg">${esc(l.judul) || 'Listing dihapus'}</b><span class="t-sm muted">Penjual: ${esc((l.owner || {}).nama) || '—'}</span><b class="t-md c-primary">${rp(o.harga_per_kg)}/kg × ${o.jumlah_kg.toLocaleString('id-ID')} kg · ${esc(o.metode_jemput)} · ${tgl(o.tanggal_jemput)}</b><div>${pill(st, c)}</div></div>
            <div class="col gap-8" style="width:170px">${o.status === 'menunggu' ? `<button class="btn btn-plain btn-sm" data-offer-act="dibatalkan" data-oid="${o.id}">Batalkan</button>` : o.status === 'diterima' ? `<button class="btn btn-primary btn-sm" data-go="#/bayar">Bayar Rekber</button>` : `<button class="btn btn-secondary btn-sm" data-go="#/jelajah">Cari Serupa</button>`}</div></div>`; }).join('')
          : emptyBox('tag', 'Tidak ada penawaran', 'Cari bahan baku lalu ajukan penawaran ke penjual.', `<button class="btn btn-primary" data-go="#/jelajah">Cari Bahan Baku</button>`)); }).join('');
  } catch (e) { box.innerHTML = errBox(e); }
}

/* Notifikasi */
const _notifikasi = V.notifikasi;
V.notifikasi = () => DB.on ? appShell('Notifikasi', 'Semua aktivitas akunmu', `<div class="row" style="justify-content:flex-end"><a class="link" data-mark-read>Tandai semua dibaca</a></div><div class="card p0" id="notifs">${loading()}</div>`) : _notifikasi();
async function loadNotifs() {
  const box = $('#notifs'); if (!box) return;
  try {
    const list = await DB.notifications();
    box.innerHTML = list.length ? list.map(n => `<div class="row notif-item" style="padding:16px 24px;gap:14px;cursor:pointer;${n.dibaca ? '' : 'background:var(--primary-light)'};border-bottom:1px solid var(--border)" data-go="${esc(n.link || '#/notifikasi')}">${ib('bell', 'primary', 44)}<div class="grow"><b class="t-lg">${esc(n.judul)}</b><div class="t-md muted">${esc(n.isi || '')}</div></div><span class="t-sm faint b6">${tgl(n.created_at)}</span>${n.dibaca ? '' : '<i class="unread" style="width:10px;height:10px;border-radius:50%;background:var(--primary);display:block"></i>'}</div>`).join('')
      : `<div style="padding:32px;text-align:center" class="muted">Belum ada notifikasi.</div>`;
  } catch (e) { box.innerHTML = `<div style="padding:16px">${errBox(e)}</div>`; }
}


/* =========================================================
   JEMPUT CEPAT — kosong → buat permintaan → dilacak
   (mode demo: tersimpan di browser & disimulasikan;
    mode database: tabel pickup_requests, diambil mitra logistik)
   ========================================================= */
const ARMADA = { 'Pick-up berpendingin': [35000, 'Box dingin 4°C · cocok untuk limbah ikan', 'ikan'], 'Pick-up bak terbuka': [25000, 'Muatan ± 1 ton', 'primary'], 'Truk box 4 ton': [90000, 'Untuk volume pabrik', 'industri'], 'Motor roda tiga': [15000, 'Muatan ± 300 kg', 'tani'] };
const PSTAT = { mencari: ['Mencari armada terdekat…', 'warning'], diambil: ['Armada menuju lokasimu', 'primary'], dijemput: ['Limbah sudah dimuat', 'tani'], selesai: ['Penjemputan selesai', 'tani'], dibatalkan: ['Dibatalkan', 'danger'] };
const jam = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';
const waLink = (n) => { let d = String(n || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '62' + d.slice(1); return d ? 'https://wa.me/' + d : null; };
/* status demo dihitung dari waktu sejak dibuat */
function demoPickup(p) {
  if (p.status === 'dibatalkan' || DB.on) return p;
  const el = (Date.now() - new Date(p.created_at)) / 1000;
  const q = Object.assign({}, p);
  q.status = el < 8 ? 'mencari' : el < 50 ? 'diambil' : el < 80 ? 'dijemput' : 'selesai';
  if (q.status !== 'mencari') { q.driver = { nama: 'Pak Darto', whatsapp: '081234567890', plat: 'G 8123 AB', armada: p.armada, start: [p.lat + 0.018, p.lng + 0.022] }; q.diambil_at = new Date(new Date(p.created_at).getTime() + 8000).toISOString(); }
  q.t = Math.max(0, Math.min(1, (el - 8) / 42));
  return q;
}
async function loadJemput() {
  const box = $('#jemput'); if (!box) return;
  try {
    S.jList = DB.on ? await DB.myPickups() : S.pickups.map(demoPickup);
    const act = S.jList.find(p => ['mencari', 'diambil', 'dijemput'].includes(p.status)) || (S.jShow && S.jList.find(p => p.id === S.jShow));
    S.jActive = act || null; box.innerHTML = act ? jemputTrack(act) : jemputForm(); initMaps(box);
    clearInterval(window._jt);
    if (act && !['selesai', 'dibatalkan'].includes(act.status)) window._jt = setInterval(tickJemput, DB.on ? 10000 : 1500);
  } catch (e) { box.innerHTML = errBox(e); }
}
async function tickJemput() {
  if (!$('#jemput') || !S.jActive) return clearInterval(window._jt);
  const before = S.jActive.status;
  const list = DB.on ? await DB.myPickups().catch(() => null) : S.pickups.map(demoPickup); if (!list) return;
  const p = list.find(x => x.id === S.jActive.id); if (!p) return;
  S.jActive = p;
  if (p.status !== before) { if (p.status === 'diambil') toast('Armada ditemukan! 🚚'); if (p.status === 'selesai') toast('Penjemputan selesai ✓'); S.jShow = p.id; return loadJemput(); }
  const el = $('#jemput .lmap[data-map="route"]');
  if (el && p.driver_lat) setDriverMarker(el, [p.driver_lat, p.driver_lng]);
  else if (el && el._truck && el._route && p.t != null) el._truck.setLatLng(pointAlong(el._route.pts, p.t));
  const eta = $('#j-eta'); if (eta && el && el._route) eta.textContent = `± ${Math.max(1, Math.round(el._route.min * (1 - (p.t || 0))))} menit lagi`;
}
function jemputForm() {
  const f = S.jform, P = me(), hist = (S.jList || []).filter(p => ['selesai', 'dibatalkan'].includes(p.status)).slice(0, 5);
  return `<div class="two-col"><div class="col gap-16">
    <div class="card row" style="background:var(--bg);border:1px dashed var(--border)">${ib('truck', 'primary', 52)}<div class="grow"><b class="t-lg">Belum ada penjemputan aktif</b><div class="t-md muted">Buat permintaan di bawah ini kalau limbahmu perlu segera diangkut. Mitra logistik terdekat akan mengambil ordernya.</div></div></div>
    <div class="card col gap-16" id="jform"><div class="h2">Buat permintaan Jemput Cepat</div>
      ${field('Jenis limbah', 'limbah', 'Contoh: Tulang & kepala ikan', f.limbah)}
      <div class="grid-2">${field('Perkiraan berat (kg)', 'berat', 'Contoh: 250', f.berat, 'number')}${field('Tujuan (opsional)', 'tujuan', 'Contoh: CV Maggot Lestari, Batang', f.tujuan)}</div>
      <span class="label">Kapan dijemput?</span>${chips(['Sekarang (< 2 jam)', 'Hari ini, nanti sore', 'Besok pagi'], f.waktu, 'data-single data-name="waktu"')}
      <span class="label">Jenis armada</span>
      <div class="grid-2" data-radio-group="armada">${Object.entries(ARMADA).map(([n, [harga, d, c]]) => opt('armada', n, { icon: n.startsWith('Motor') ? 'zap' : 'truck', c, d: d + ' · ' + rp(harga), sel: n === f.armada })).join('')}</div>
      <label class="field"><span class="label">Catatan untuk driver</span><textarea class="textarea" name="catatan" placeholder="Contoh: limbah di drum tertutup dekat gerbang timur">${esc(f.catatan || '')}</textarea></label></div></div>
    <div class="col gap-16"><div class="card col"><b class="t-lg">Titik penjemputan</b><span class="t-sm muted">Geser pin, klik peta, atau tekan "Lokasiku"</span>${lmap('pick', 280, 'data-target="jform" data-out="#j-ll"')}<span class="t-xs muted b6" id="j-ll">Titik dipilih: —</span>
        ${field('Alamat / patokan', 'alamat', 'Contoh: TPI Klidang Lor, dermaga 2', f.alamat || [P.alamat, P.kec].filter(Boolean).join(', '))}</div>
      <div class="card col">${kv('Armada', `<span id="j-armada">${esc(f.armada)}</span>`)}${kv('Perkiraan ongkos', `<span id="j-ongkos">${rp(ARMADA[f.armada][0])}</span>`, 1)}<span class="t-xs muted">Ongkos final mengikuti jarak & berat aktual, dibayar lewat rekber.</span></div>
      <button class="btn btn-primary" data-jemput-create>${I('zap')}Kirim Permintaan Jemput</button>
      ${hist.length ? `<div class="card col"><b class="t-lg">Riwayat penjemputan</b>${hist.map(p => `<div class="row between"><div class="grow"><b class="t-md">${esc(p.limbah)}</b><div class="t-xs muted">${tgl(p.created_at)} · ${esc(p.armada)}</div></div>${pill(PSTAT[p.status][0].replace('…', ''), PSTAT[p.status][1])}</div>`).join('')}</div>` : ''}</div></div>`;
}
function jemputTrack(p) {
  const [st, c] = PSTAT[p.status], d = p.driver;
  const steps = [['Permintaan dibuat', p.created_at, true], ['Armada ditemukan', p.diambil_at, ['diambil', 'dijemput', 'selesai'].includes(p.status)], ['Limbah dimuat', null, ['dijemput', 'selesai'].includes(p.status)], ['Selesai diantar', null, p.status === 'selesai']];
  const startLL = d && (p.driver_lat ? [p.driver_lat, p.driver_lng] : d.start || (d.kecamatan ? placeLL(d.kecamatan, d.nama) : [p.lat + 0.02, p.lng + 0.02]));
  const drvAttr = p.driver_lat ? `data-driver="${p.driver_lat},${p.driver_lng}"` : '';
  const map = d && p.status === 'diambil'
    ? lmap('route', 460, `data-from="${startLL.join(',')}" data-to="${p.lat},${p.lng}" data-t="${p.driver_lat ? '' : p.t != null ? p.t : 0.35}" ${drvAttr} data-from-icon="truck" data-from-color="batik" data-from-label="Posisi awal armada" data-to-icon="pin" data-to-color="ikan" data-to-label="Titik jemput" data-eta="#j-eta"`)
    : lmap('route', 460, `data-from="${p.lat},${p.lng}" data-to="${placeLL(p.tujuan || 'maggot lestari').join(',')}" data-t="${p.status === 'dijemput' && !p.driver_lat ? 0.05 : ''}" ${p.status === 'dijemput' ? drvAttr : ''} data-from-icon="pin" data-from-color="ikan" data-from-label="Titik jemput" data-to-label="${esc(p.tujuan || 'Pengolah tujuan')}"`);
  return `<div class="two-col"><div class="col gap-16">${map}
      <div class="grid-4">${[['Limbah', p.limbah], ['Berat', p.berat ? p.berat + ' kg' : '—'], ['Armada', p.armada], ['Ongkos', rp(p.ongkos)]].map(([k, v]) => `<div class="card col gap-4" style="padding:12px"><span class="t-xs faint b6">${k}</span><b class="t-md">${esc(v)}</b></div>`).join('')}</div></div>
    <div class="col gap-16">${note(p.status === 'mencari' ? 'clock' : p.status === 'selesai' ? 'checkCircle' : 'truck', st + (p.status === 'diambil' ? ' · <b id="j-eta">menghitung…</b>' : ''), c === 'warning' ? 'warning' : c === 'tani' ? 'tani' : 'primary')}
      ${d ? `<div class="card row"><div class="avatar ib-batik" style="width:52px;height:52px">${initials(d.nama)}</div><div class="grow"><b class="t-lg">${esc(d.nama)}</b><div class="t-sm muted">${esc(d.armada || p.armada)}${d.plat ? ' · ' + esc(d.plat) : ''}</div></div>${waLink(d.whatsapp) ? `<a class="icon-box ib-tani" href="${waLink(d.whatsapp)}" target="_blank" rel="noopener" title="Chat WhatsApp driver">${I('phone')}</a>` : ''}</div>`
           : p.status === 'mencari' ? `<div class="card col" style="align-items:center;text-align:center">${ib('truck', 'warning', 56)}<b>Menunggu mitra logistik mengambil order…</b><span class="t-sm muted">${DB.on ? 'Halaman ini memeriksa status otomatis setiap 10 detik.' : 'Mode demo: armada otomatis ditemukan dalam beberapa detik.'}</span></div>` : ''}
      <div class="card col"><b class="t-lg">Status penjemputan</b>${steps.map(([t, time, done], i) => { const now = !done && (i === 0 || steps[i - 1][2]) && p.status !== 'dibatalkan';
        return `<div class="row"><div class="icon-box" style="width:24px;height:24px;border-radius:50%;background:var(--${done ? 'tani' : now ? 'primary' : 'border'});color:#fff">${done ? I('check') : now ? I('truck') : ''}</div><span class="grow ${now ? 'b8' : 'b6'} ${!done && !now ? 'faint' : ''}">${t}</span><span class="t-sm faint b6">${done && time ? jam(time) : '—'}</span></div>`; }).join('')}</div>
      <div class="card col gap-4"><span class="t-xs faint b6">Alamat jemput</span><b class="t-md">${esc(p.alamat) || '—'}</b>${p.catatan ? `<span class="t-sm muted">“${esc(p.catatan)}”</span>` : ''}<a class="link t-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}">Buka di Google Maps</a></div>
      ${['mencari', 'diambil'].includes(p.status) ? `<button class="btn btn-outline" data-jemput-cancel="${p.id}">Batalkan Penjemputan</button>` : ''}
      ${['selesai', 'dibatalkan'].includes(p.status) ? `<button class="btn btn-primary" data-jemput-new>${I('plus')}Buat Permintaan Baru</button>` : ''}
      ${DB.on && p.status !== 'selesai' && p.status !== 'dibatalkan' ? `<button class="btn btn-plain" data-jemput-refresh>Perbarui status</button>` : ''}</div></div>`;
}

/* Sisi mitra logistik (mode database): ambil & kerjakan permintaan jemput */
async function loadLogistikJemput() {
  const box = $('#lj-box'); if (!box || !DB.on) return;
  try {
    const [open, mine] = await Promise.all([DB.openPickups(), DB.myPickupTasks()]); S.ljOpen = {}; [...open, ...mine].forEach(p => S.ljOpen[p.id] = p);
    const card = (p, actions) => `<div class="card row gap-16" style="flex-wrap:wrap">${ib(p.armada.startsWith('Motor') ? 'zap' : 'truck', (ARMADA[p.armada] || [0, 0, 'primary'])[2], 52)}<div class="col gap-4 grow" style="min-width:220px"><b class="t-lg">${esc(p.limbah)}${p.berat ? ' · ' + esc(p.berat) + ' kg' : ''}</b><span class="t-md muted">${esc(p.alamat || '')}${p.tujuan ? ' → ' + esc(p.tujuan) : ''}</span>
        <div class="row gap-8 wrap">${pill(esc(p.waktu), 'primary')}${pill(esc(p.armada), (ARMADA[p.armada] || [0, 0, 'primary'])[2])}${p.requester ? pill('Pemohon: ' + esc(p.requester.nama), 'tani') : ''}</div></div>
        <div class="col gap-4" style="align-items:flex-end"><b class="c-tani" style="font-size:20px">${rp(p.ongkos)}</b><a class="link t-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}">Rute di Google Maps</a></div>${actions}</div>`;
    box.innerHTML = `${mine.length ? `<div class="h3">Tugas Jemput Cepat saya</div>${mine.map(p => card(p, (p.status === 'diambil'
        ? `<button class="btn btn-primary btn-sm" data-lj-act="dijemput" data-pid="${p.id}">Limbah Sudah Dimuat</button>` : `<button class="btn btn-primary btn-sm" data-lj-act="selesai" data-pid="${p.id}">Selesai Diantar</button>`) + `<div style="width:100%">${shareBtn('pickup', p.id)}</div>`)).join('')}` : ''}
      <div class="h3">Permintaan Jemput Cepat baru (${open.length})</div>
      ${open.length ? open.map(p => card(p, `<button class="btn btn-primary btn-sm" data-lj-act="ambil" data-pid="${p.id}">Ambil Order</button>`)).join('') : `<div class="card muted" style="padding:20px">Belum ada permintaan jemput baru. Halaman ini bisa dimuat ulang untuk mengecek.</div>`}
      <div class="divider"></div>`;
  } catch (e) { box.innerHTML = errBox(e); }
}

function afterRender(path) {
  if (path === '/jemput-cepat') loadJemput();
  if (path === '/peta') loadPeta();
  if (path === '/l/order') { loadLogistikJemput(); loadLogistikOrders(); }
  if (path === '/admin') loadAdmin();
  if (!DB.on) return;
  if (path === '/pesanan') loadOrders();
  if (path === '/jejak') loadJejak();
  if (path === '/jelajah') loadJelajah();
  if (path === '/beranda' || path === '/p/beranda') loadLatest();
  if (path === '/penawaran-masuk') loadIncoming();
  if (path === '/p/penawaran') loadMyOffers();
  if (path === '/notifikasi') loadNotifs();
}
/* tombol sibuk saat menunggu database */
async function busy(btn, fn, label = 'Memproses…') {
  if (btn.disabled) return;
  const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = label; btn.style.opacity = '.75';
  try { return await fn(); } catch (e) { console.error(e); toast(pesanError(e)); }
  finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = html; btn.style.opacity = ''; } }
}
function pesanError(e) {
  const m = String((e && e.message) || e);
  if (/Token has expired|invalid/i.test(m) && /otp|token/i.test(m)) return 'Kode OTP salah atau kedaluwarsa';
  if (/rate limit|security purposes/i.test(m)) return 'Terlalu sering meminta kode. Tunggu sebentar lalu coba lagi';
  if (/row-level security/i.test(m)) return 'Akses ditolak. Pastikan kamu masuk dengan akun yang benar';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Tidak bisa terhubung ke server. Periksa koneksi internet';
  return 'Gagal: ' + m;
}
const nav = (h) => { if (location.hash === h) render(); else location.hash = h; };


/* =========================================================
   FITUR LANJUTAN: OCR dokumen, admin verifikasi,
   Pesanan & Jejak Limbah dari database, lokasi driver
   ========================================================= */
const kodeOrder = (o) => 'SG-' + String(o.id).slice(0, 8).toUpperCase();
const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
const ORD_ST = {
  menunggu_pembayaran: ['Menunggu pembayaran', 'warning'], dibayar: ['Dibayar · menunggu jemput', 'primary'], dijemput: ['Dalam penjemputan', 'primary'],
  dikirim: ['Dalam perjalanan', 'ikan'], diterima: ['Diterima pengolah', 'tani'], selesai: ['Selesai', 'tani'], dibatalkan: ['Dibatalkan', 'danger']
};
const ORD_FLOW = ['menunggu_pembayaran', 'dibayar', 'dijemput', 'dikirim', 'diterima', 'selesai'];
const jamTgl = (d) => d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/* ---------- 1. OCR DOKUMEN (Tesseract.js) ---------- */
const TESS_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
function loadScript(src) {
  return new Promise((ok, no) => {
    if (window.Tesseract) return ok();
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => ok(); s.onerror = () => { s.remove(); no(new Error('pembaca dokumen gagal dimuat, periksa koneksi')); };
    document.head.appendChild(s);
  });
}
function ocrForm() { const r = $('.auth .inner') || document; const v = (n) => (($(`input[name="${n}"]`, r) || {}).value || '').trim(); return { nib: v('nib'), nama: v('nama'), plat: v('plat') }; }
function ocrCheck(text, f) {
  const raw = String(text || '');
  const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const T = norm(raw), Tnos = T.replace(/ /g, '');
  const nibs = [...new Set(raw.replace(/(\d)[ \t.\-]+(?=\d)/g, '$1').match(/(?<!\d)\d{13}(?!\d)/g) || [])];
  const nibIn = String(f.nib || '').replace(/\D/g, '');
  const tokens = norm(f.nama).split(' ').filter(w => w.length > 2 && !['CV', 'UD', 'PT', 'PAK', 'IBU'].includes(w));
  const hit = tokens.filter(w => T.includes(w)).length;
  const skor = tokens.length ? hit / tokens.length : null;
  const plat = norm(f.plat).replace(/ /g, '');
  return {
    nib_terbaca: nibs[0] || null, nib_cocok: nibIn.length === 13 ? Tnos.includes(nibIn) : null,
    nama_skor: skor == null ? null : Math.round(skor * 100), nama_cocok: skor == null ? null : skor >= 0.6,
    plat_cocok: plat ? Tnos.includes(plat) : null, jumlah_karakter: raw.replace(/\s/g, '').length, waktu: new Date().toISOString()
  };
}
const ocrBar = (p, t) => `<div class="card col gap-8" style="padding:14px"><div class="row between"><b class="t-md">${I('file')} ${t}</b><span class="t-sm b7 c-primary">${Math.round(p * 100)}%</span></div>${bar(Math.max(.03, p), 'primary')}</div>`;
function ocrRows(r) {
  if (!r) return '';
  const row = (ok, t) => `<div class="row gap-8"><span class="icon-box" style="width:22px;height:22px;border-radius:50%;background:var(--${ok === true ? 'tani' : ok === false ? 'warning' : 'border'});color:#fff">${I(ok === true ? 'check' : 'info')}</span><span class="t-sm b6">${t}</span></div>`;
  const out = [];
  if (r.jumlah_karakter < 25) out.push(row(false, 'Teks hampir tidak terbaca. Gunakan foto yang lebih terang dan tegak.'));
  if (r.nib_cocok !== null) out.push(row(r.nib_cocok, r.nib_cocok ? 'NIB pada dokumen sama dengan NIB yang diisi' : `NIB yang diisi tidak ditemukan di dokumen${r.nib_terbaca ? ' (terbaca: ' + r.nib_terbaca + ')' : ''}`));
  else if (r.nib_terbaca) out.push(row(null, 'NIB terbaca: ' + r.nib_terbaca));
  if (r.nama_cocok !== null) out.push(row(r.nama_cocok, r.nama_cocok ? `Nama usaha ditemukan di dokumen (${r.nama_skor}%)` : `Nama usaha belum cocok dengan dokumen (${r.nama_skor}%)`));
  if (r.plat_cocok !== null) out.push(row(r.plat_cocok, r.plat_cocok ? 'Nomor plat ditemukan di STNK' : 'Nomor plat tidak ditemukan di dokumen'));
  return out.join('') || row(null, 'Dokumen terbaca, tidak ada data yang bisa dicocokkan.');
}
const ocrResult = (r) => `<div class="card col gap-8" style="padding:14px;background:var(--bg);border:0"><b class="t-md">Hasil pemeriksaan otomatis (OCR)</b>${ocrRows(r)}<span class="t-xs muted">Hasil ini membantu admin. Keputusan verifikasi tetap diperiksa oleh admin SisaGuna.</span></div>`;
async function runOcr(file) {
  const box = $('#ocr-box'); if (!box) return;
  S.ocrText = null; S.ocr = null;
  const tok = (runOcr.tok = (runOcr.tok || 0) + 1);
  if (!/^image\/(jpe?g|png|webp|bmp)$/i.test(file.type)) { box.innerHTML = note('info', 'File PDF tidak dibaca otomatis. Dokumen tetap terkirim dan diperiksa admin.', 'warning'); return; }
  if (file.size > 5 * 1024 * 1024) { box.innerHTML = note('info', 'Ukuran file lebih dari 5 MB. Kecilkan dulu fotonya.', 'warning'); return; }
  box.innerHTML = ocrBar(0, 'Menyiapkan pembaca dokumen…');
  let worker;
  try {
    await loadScript(TESS_SRC);
    const opt = { logger: (m) => { if (tok === runOcr.tok && m.status === 'recognizing text' && box.isConnected) box.innerHTML = ocrBar(m.progress || 0, 'Membaca teks dokumen…'); } };
    try { worker = await Tesseract.createWorker('ind', 1, opt); } catch (e1) { console.warn('OCR ind gagal, pakai eng', e1); worker = await Tesseract.createWorker('eng', 1, opt); }
    const { data } = await worker.recognize(file);
    if (tok !== runOcr.tok || !box.isConnected) return;
    S.ocrText = data.text || ''; S.ocr = ocrCheck(S.ocrText, ocrForm());
    box.innerHTML = ocrResult(S.ocr);
  } catch (e) {
    console.error(e); if (tok === runOcr.tok && box.isConnected) box.innerHTML = note('info', 'Pemeriksaan otomatis tidak berjalan (' + esc(e.message || e) + '). Dokumen tetap bisa dikirim untuk diperiksa admin.', 'warning');
  } finally { if (worker) worker.terminate().catch(() => {}); }
}
/* hitung ulang kecocokan dengan isian terbaru saat formulir dikirim */
const ocrFinal = () => S.ocrText != null ? ocrCheck(S.ocrText, ocrForm()) : null;

/* ---------- 2. HALAMAN ADMIN VERIFIKASI ---------- */
const isAdmin = () => DB.on ? !!(DB.profile && DB.profile.is_admin) : true;
const VSTAT = { menunggu: ['Menunggu', 'warning'], disetujui: ['Disetujui', 'tani'], ditolak: ['Ditolak', 'danger'], belum: ['Belum unggah', 'primary'] };
S.adminTab = 'menunggu';
S.adminDemo = [
  { id: 'd1', role: 'penghasil', nama: 'UD Batik Sekar Jagad', nib: '9120301234567', email: 'sekarjagad@contoh.id', whatsapp: '081234500001', kecamatan: 'Pekalongan Barat', jenis_usaha: 'Batik & Konveksi', verif_status: 'menunggu', created_at: '2026-11-17T08:10:00Z', ocr: { nib_terbaca: '9120301234567', nib_cocok: true, nama_skor: 100, nama_cocok: true, jumlah_karakter: 640 }, demoImg: 'perca' },
  { id: 'd2', role: 'pengolah', nama: 'CV Maggot Lestari', nib: '8120004455661', email: 'maggotlestari@contoh.id', whatsapp: '081234500002', kecamatan: 'Batang', jenis_olahan: 'Pakan ternak & maggot', verif_status: 'menunggu', created_at: '2026-11-17T09:30:00Z', ocr: { nib_terbaca: '8120004455611', nib_cocok: false, nama_skor: 67, nama_cocok: true, jumlah_karakter: 410 }, demoImg: 'maggot' },
  { id: 'd3', role: 'logistik', nama: 'Darto Logistik', plat: 'G 8123 AB', email: 'darto@contoh.id', whatsapp: '081234500003', kecamatan: 'Batang', armada: 'Pick-up berpendingin', verif_status: 'menunggu', created_at: '2026-11-18T06:45:00Z', ocr: null, demoImg: 'truk' }
];
V.admin = () => appShell('Verifikasi Mitra', 'Periksa dokumen usaha sebelum akun ditandai terverifikasi', `
  ${DB.on ? '' : note('info', 'Mode demo: data di bawah adalah contoh. Setelah database tersambung, daftar ini berisi pendaftar sungguhan.', 'warning')}
  <div class="row between wrap">${tabsBar('adm', [['menunggu', 'Menunggu'], ['disetujui', 'Disetujui'], ['ditolak', 'Ditolak']], S.adminTab)}<a class="btn btn-plain btn-sm" href="https://oss.go.id" target="_blank" rel="noopener">${I('shield')}Buka OSS (cek NIB)</a></div>
  <div class="col gap-16" id="admin-box">${loading()}</div>`);
function adminCard(p) {
  const R = ROLES[p.role] || ROLES.penghasil, st = VSTAT[p.verif_status] || VSTAT.belum;
  const det = p.role === 'logistik' ? [['Plat', p.plat], ['Armada', p.armada]] : p.role === 'pengolah' ? [['NIB', p.nib], ['Jenis olahan', p.jenis_olahan]] : [['NIB', p.nib], ['Jenis usaha', p.jenis_usaha]];
  const hasDoc = p.dokumen_path || p.demoImg;
  return `<div class="card col gap-16"><div class="row gap-16 wrap"><div class="avatar ib-${R.color}" style="width:52px;height:52px">${initials(p.nama)}</div>
      <div class="col gap-4 grow" style="min-width:200px"><div class="row gap-8 wrap"><b class="t-lg">${esc(p.nama)}</b>${pill(R.role, R.color)}${pill(st[0], st[1])}</div>
        <span class="t-sm muted">${[p.email, p.whatsapp, p.kecamatan].filter(Boolean).map(esc).join(' · ') || '—'}</span><span class="t-xs faint b6">Daftar ${jamTgl(p.created_at)}${p.verif_at ? ' · diperiksa ' + jamTgl(p.verif_at) : ''}</span></div>
      ${hasDoc ? `<button class="btn btn-secondary btn-sm" data-adm-doc="${esc(p.dokumen_path || '')}" data-demo-img="${p.demoImg || ''}">${I('file')}Lihat Dokumen</button>` : pill('Belum ada dokumen', 'warning')}</div>
    <div class="grid-2">${det.map(([k, v]) => `<div style="background:var(--bg);border-radius:14px;padding:12px"><div class="t-xs faint b6">${k}</div><b class="t-md">${esc(v) || '—'}</b></div>`).join('')}</div>
    ${p.ocr ? `<div class="col gap-8"><b class="t-md">Hasil OCR</b>${ocrRows(p.ocr)}</div>` : `<span class="t-sm muted">${hasDoc ? 'Dokumen berupa PDF / belum diperiksa OCR — cek manual.' : ''}</span>`}
    ${p.verif_catatan ? `<span class="t-sm"><b>Catatan:</b> ${esc(p.verif_catatan)}</span>` : ''}
    ${p.verif_status === 'menunggu' ? `<label class="field"><span class="label">Catatan untuk pendaftar (opsional)</span><input class="input" data-adm-note="${p.id}" placeholder="Contoh: NIB sesuai data OSS"></label>
      <div class="row gap-8" style="justify-content:flex-end"><button class="btn btn-outline btn-sm" data-adm-set="ditolak" data-uid="${p.id}">Tolak</button><button class="btn btn-primary btn-sm" data-adm-set="disetujui" data-uid="${p.id}">${I('check')}Setujui</button></div>`
      : `<div class="row" style="justify-content:flex-end"><button class="btn btn-plain btn-sm" data-adm-set="menunggu" data-uid="${p.id}">Periksa ulang</button></div>`}</div>`;
}
async function loadAdmin() {
  const box = $('#admin-box'); if (!box) return;
  const st = S.adminTab;
  try {
    const list = DB.on ? await DB.verifQueue(st) : S.adminDemo.filter(p => p.verif_status === st);
    box.innerHTML = list.length ? list.map(adminCard).join('') : emptyBox('shield', st === 'menunggu' ? 'Tidak ada antrean verifikasi' : 'Belum ada data', st === 'menunggu' ? 'Pendaftar baru yang mengunggah dokumen akan muncul di sini.' : 'Data akan muncul setelah admin memeriksa dokumen.');
  } catch (e) { box.innerHTML = /verif_status|is_admin|column/.test(e.message || '') ? note('info', 'Jalankan dulu file supabase/update-2-admin-jejak.sql di Supabase SQL Editor.', 'warning') : errBox(e); }
}

/* ---------- 3. PESANAN DARI DATABASE ---------- */
const _pesananDemo = V.pesanan;
V.pesanan = () => DB.on ? appShell('Pesanan', 'Semua transaksi limbahmu', `<div class="col gap-20" id="ord-box">${loading()}</div>`) : _pesananDemo();
function ordParty(o) {
  const uid = DB.user && DB.user.id;
  if (o.seller_id === uid) return ['Pembeli', o.buyer];
  if (o.buyer_id === uid) return ['Penjual', o.seller];
  return ['Rute', { nama: `${(o.seller || {}).nama || '—'} → ${(o.buyer || {}).nama || '—'}` }];
}
function ordTodo(o) { /* apakah pesanan menunggu tindakan saya */
  const uid = DB.user && DB.user.id, buyer = o.buyer_id === uid, carrier = o.metode_jemput === 'Jemput Sendiri' ? buyer : o.logistik_id === uid;
  return (o.status === 'menunggu_pembayaran' && buyer) || (o.status === 'dibayar' && o.metode_jemput === 'Jemput Sendiri' && buyer)
    || (o.status === 'dijemput' && carrier) || (['dikirim', 'diterima'].includes(o.status) && buyer);
}
async function loadOrders() {
  const box = $('#ord-box'); if (!box) return;
  try {
    const all = await DB.myOrders(); S.ordList = all;
    const grp = { Aktif: all.filter(o => !['selesai', 'dibatalkan'].includes(o.status)), Selesai: all.filter(o => o.status === 'selesai'), Dibatalkan: all.filter(o => o.status === 'dibatalkan') };
    const act = S.ordTab && grp[S.ordTab] ? S.ordTab : 'Aktif';
    const rows = (list, t) => list.length ? `<div class="card p0"><table class="table"><thead><tr><th>ID Pesanan</th><th>Limbah</th><th>Mitra</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        ${list.map(o => { const [lbl, pt] = ordParty(o), st = ORD_ST[o.status] || [o.status, 'primary'], todo = ordTodo(o);
          return `<tr ${t === 'Aktif' ? '' : 'style="opacity:.8"'}><td class="b7">${kodeOrder(o)}</td><td><div class="row">${photo(o.foto || (CATS[o.kategori] || CATS.Perikanan).img)}<div class="col gap-4"><b>${esc(o.judul || 'Limbah')}</b><span class="t-xs muted">${esc(o.metode_jemput)}</span></div></div></td>
            <td class="muted"><span class="t-xs faint b6">${lbl}</span><br>${esc((pt || {}).nama || '—')}</td><td class="b8">${rp(o.total)}</td><td>${pill(st[0], st[1])}</td>
            <td><button class="btn ${t === 'Aktif' ? (todo ? 'btn-primary' : 'btn-secondary') : 'btn-disabled'} btn-sm" data-go="#/jejak" data-order="${o.id}">${t === 'Aktif' ? (todo ? 'Proses' : 'Lihat Jejak') : 'Riwayat'}</button></td></tr>`; }).join('')}
      </tbody></table></div>` : emptyBox('box', t === 'Aktif' ? 'Belum ada pesanan berjalan' : 'Belum ada pesanan ' + t.toLowerCase(), t === 'Aktif' ? 'Pesanan otomatis dibuat ketika penjual menerima penawaran.' : 'Pesanan akan tampil di sini.',
        t === 'Aktif' ? `<button class="btn btn-primary" data-go="${S.role === 'penghasil' ? '#/penawaran-masuk' : S.role === 'pengolah' ? '#/jelajah' : '#/l/order'}">${S.role === 'penghasil' ? 'Lihat Penawaran Masuk' : S.role === 'pengolah' ? 'Cari Bahan Baku' : 'Lihat Order Tersedia'}</button>` : '');
    box.innerHTML = `<div class="row between wrap">${tabsBar('ordtab', Object.keys(grp).map(k => [k, `${k} (${grp[k].length})`]), act)}<button class="btn btn-plain btn-sm" data-csv-db>${I('download')}Ekspor CSV</button></div>
      ${Object.keys(grp).map(k => pane('ordtab', k, act, rows(grp[k], k))).join('')}`;
  } catch (e) { box.innerHTML = /metode_jemput|judul|order_events|column|relationship/i.test(e.message || '') ? note('info', 'Jalankan dulu file supabase/update-2-admin-jejak.sql di Supabase SQL Editor, lalu muat ulang halaman.', 'warning') : errBox(e); }
}

/* ---------- 4. JEJAK LIMBAH DARI DATABASE ---------- */
const _jejakDemo = V.jejak;
V.jejak = () => {
  if (!DB.on) return _jejakDemo();
  if (!isUuid(S.curOrder)) return appShell('Jejak Limbah', 'Lacak perjalanan limbah', emptyBox('box', 'Pilih pesanan dulu', 'Buka salah satu pesanan untuk melihat jejak perjalanan limbahnya.', `<button class="btn btn-primary" data-go="#/pesanan">Ke Pesanan</button>`));
  return appShell('Jejak Limbah', 'Memuat pesanan…', `<div id="jejak-box">${loading()}</div>`);
};
function ordRoles(o) {
  const uid = DB.user && DB.user.id;
  const buyer = o.buyer_id === uid, seller = o.seller_id === uid, log = o.logistik_id === uid;
  return { buyer, seller, log, carrier: o.metode_jemput === 'Jemput Sendiri' ? buyer : log };
}
const ordFrom = (o) => o.jemput_lat ? [o.jemput_lat, o.jemput_lng] : placeLL(o.jemput_alamat || (o.seller || {}).kecamatan, o.id);
const ordTo = (o) => { const b = o.buyer || {}; return placeLL([b.alamat, b.kecamatan, b.nama].filter(Boolean).join(' '), o.buyer_id); };
function jejakStages(o) {
  const ev = {}; (o.events || []).forEach(e => ev[e.tahap] = e);
  const sendiri = o.metode_jemput === 'Jemput Sendiri';
  const S6 = [['menunggu_pembayaran', 'Penawaran diterima', 'file', 'Pesanan dibuat'], ['dibayar', 'Dibayar ke rekber', 'wallet', 'Menunggu pembeli membayar'],
    ['dijemput', sendiri ? 'Pembeli menuju lokasi' : 'Armada menuju lokasi', 'truck', sendiri ? 'Pembeli mengambil sendiri' : 'Menunggu mitra logistik mengambil order'],
    ['dikirim', 'Dimuat & ditimbang', 'scale', 'Berat aktual & foto muatan dicatat saat muat'], ['diterima', 'Diterima pengolah', 'box', 'Pengolah mengonfirmasi limbah sampai'],
    ['selesai', 'Diolah · bukti pengolahan', 'recycle', 'Pengolah mengunggah bukti pengolahan']];
  const idx = ORD_FLOW.indexOf(o.status), batal = o.status === 'dibatalkan';
  const doneMax = batal ? Math.max(-1, ...Object.keys(ev).map(k => ORD_FLOW.indexOf(k))) : idx;
  const items = S6.map(([k, t, ic, hint], i) => { const e = ev[k]; const st = i <= doneMax ? 'done' : (!batal && i === doneMax + 1 ? 'now' : 'next');
    return [t, e ? `${esc(e.catatan || '')} · ${jamTgl(e.created_at)}` : hint, st, ic]; });
  if (batal) items.push(['Pesanan dibatalkan', ev.dibatalkan ? `${esc(ev.dibatalkan.catatan || '')} · ${jamTgl(ev.dibatalkan.created_at)}` : 'Dana rekber dikembalikan', 'cancel', 'close']);
  return items;
}
function shareBtn(kind, id) {
  const on = SHARE.watch != null && SHARE.id === id;
  return `<div class="col gap-4" data-share-ui="${id}" data-kind="${kind}">${on ? `<button class="btn btn-outline" data-share-stop>${I('target')}Berhenti Bagikan Lokasi</button><span class="t-xs muted b6">${SHARE.sent ? 'Lokasi terkirim ' + SHARE.sent.toLocaleTimeString('id-ID') + ' · diperbarui tiap 15 detik' : 'Mencari lokasi GPS…'} · biarkan halaman ini terbuka</span>`
    : `<button class="btn btn-secondary" data-share-start="${kind}" data-sid="${id}">${I('target')}Bagikan Lokasi Langsung</button><span class="t-xs muted">Posisimu tampil di peta pemesan selama halaman ini terbuka.</span>`}</div>`;
}
function ordActions(o) {
  const R = ordRoles(o), st = o.status, ML = o.metode_jemput === 'Mitra Logistik';
  const btn = (act, label, cls = 'btn-primary', ic = '') => `<button class="btn ${cls}" data-ord-act="${act}">${ic ? I(ic) : ''}${label}</button>`;
  const fileIn = (name, label) => `<label class="upload" style="padding:14px">${ib('camera', 'primary', 40)}<div class="col gap-4"><b class="c-primary">${label}</b><span class="t-sm muted">JPG/PNG maks. 5 MB</span></div><input type="file" name="${name}" accept="image/*" hidden data-file-label></label>`;
  const cancel = btn('batal', 'Batalkan Pesanan', 'btn-outline');
  if (st === 'menunggu_pembayaran') return R.buyer ? `${note('shield', 'Dana ditahan di rekber SisaGuna dan baru diteruskan ke penjual setelah limbah diterima.', 'primary')}${btn('bayar', 'Bayar ' + rp(o.total) + ' via Rekber', 'btn-primary', 'wallet')}<span class="t-xs muted">Prototipe: pembayaran disimulasikan, tidak ada uang yang ditarik.</span>${cancel}`
    : `${note('clock', 'Menunggu pembeli membayar ke rekber.', 'warning')}${R.seller ? cancel : ''}`;
  if (st === 'dibayar') {
    if (!ML) return R.buyer ? `${note('pin', 'Kamu memilih Jemput Sendiri. Tekan tombol saat berangkat ke lokasi penjual.', 'primary')}${btn('jemput', 'Mulai Jemput Sendiri', 'btn-primary', 'truck')}` : note('clock', 'Pembeli akan datang mengambil limbah sendiri.', 'warning');
    if (S.role === 'logistik' && !o.logistik_id) return `${note('truck', 'Order ini sudah dibayar dan menunggu armada.', 'primary')}${btn('ambil', 'Ambil Order Ini', 'btn-primary', 'truck')}`;
    return `${note('clock', 'Menunggu mitra logistik mengambil order. Halaman ini diperbarui otomatis.', 'warning')}${R.buyer ? cancel : ''}`;
  }
  if (st === 'dijemput') return R.carrier ? `<b class="t-lg">Timbang & foto muatan</b>${field('Berat aktual hasil timbang (kg)', 'berat_aktual', 'Contoh: 248', o.jumlah_kg || '', 'number')}${fileIn('foto_muat', 'Foto timbangan / muatan')}${btn('muat', 'Konfirmasi Muat & Berangkat', 'btn-primary', 'check')}`
    : note('truck', (ML ? 'Armada' : 'Pembeli') + ' sedang menuju lokasi jemput.', 'primary');
  if (st === 'dikirim') return R.buyer ? `${note('truck', 'Limbah dalam perjalanan. Konfirmasi setelah limbah sampai dan sesuai.', 'primary')}${btn('terima', 'Konfirmasi Limbah Diterima', 'btn-primary', 'checkCircle')}` : note('truck', 'Limbah dalam perjalanan ke pengolah.', 'primary');
  if (st === 'diterima') return R.buyer ? `<b class="t-lg">Unggah bukti pengolahan</b><label class="field"><span class="label">Hasil olahan</span><textarea class="textarea" name="catatan_olah" placeholder="Contoh: diolah jadi pakan maggot batch #12"></textarea></label>${fileIn('foto_olah', 'Foto proses / hasil olahan')}${btn('olah', 'Kirim Bukti Pengolahan', 'btn-primary', 'recycle')}`
    : note('clock', 'Menunggu pengolah mengunggah bukti pengolahan.', 'warning');
  if (st === 'selesai') return `<button class="btn btn-disabled" disabled>${I('check')}Pesanan selesai</button><button class="btn btn-outline" data-go="#/ulasan">Beri Ulasan</button>`;
  return note('info', 'Pesanan dibatalkan. Dana rekber dikembalikan ke pembeli.', 'warning');
}
function jejakView(o) {
  const R = ordRoles(o), stg = jejakStages(o), fotos = (o.events || []).filter(e => e.foto_url);
  const showMap = !['dibatalkan'].includes(o.status), moving = ['dijemput', 'dikirim'].includes(o.status);
  const from = ordFrom(o), to = ordTo(o), drv = o.driver_lat ? [o.driver_lat, o.driver_lng] : null;
  const person = (lbl, p, c, extra = '') => p ? `<div class="row"><div class="avatar ib-${c}">${initials(p.nama)}</div><div class="grow"><div class="t-xs faint b6">${lbl}</div><b class="t-md">${esc(p.nama)}</b>${extra ? `<div class="t-xs muted">${extra}</div>` : ''}</div>${waLink(p.whatsapp) ? `<a class="icon-box ib-tani" href="${waLink(p.whatsapp)}" target="_blank" rel="noopener" title="Chat WhatsApp">${I('phone')}</a>` : ''}</div>` : '';
  return `<div class="two-col"><div class="col gap-16">
      ${showMap ? `<div class="card col">${lmap('route', 340, `data-from="${from.join(',')}" data-to="${to.join(',')}" data-from-label="Lokasi jemput" data-from-icon="${(CATS[o.kategori] || CATS.Perikanan).icon}" data-from-color="${ck(o.kategori)}" data-to-label="${esc((o.buyer || {}).nama || 'Pengolah')}" ${drv && moving ? `data-driver="${drv.join(',')}"` : ''} data-eta="#ord-eta"`)}
        <div class="row between wrap"><span class="t-sm muted b6">${I('map')} <span id="ord-eta">Menghitung rute…</span></span><span class="t-sm b6 ${drv && moving ? 'c-primary' : 'faint'}" id="drv-at">${drv && moving ? 'Posisi pengangkut ' + jamTgl(o.driver_at) : moving ? 'Lokasi pengangkut belum dibagikan' : ''}</span></div></div>` : ''}
      <div class="card col gap-16"><div class="h3" style="font-size:18px">Jejak perjalanan limbah</div><div>
        ${stg.map(([t, s, st, ic], i, a) => `<div class="tl-item"><div class="tl-dot"><div class="d" style="background:var(--${st === 'done' ? 'tani' : st === 'now' ? 'primary' : st === 'cancel' ? 'danger' : 'bg'});${st === 'next' ? 'border:1px solid var(--border)' : ''}"><span style="color:${st === 'next' ? 'var(--text-3)' : '#fff'}">${I(ic)}</span></div>${i < a.length - 1 ? `<div class="line ${st === 'done' ? 'done' : ''}"></div>` : ''}</div>
          <div style="padding-top:8px"><b class="${st === 'next' ? 'faint' : ''} ${st === 'now' ? 'b8' : ''}">${t}</b><div class="t-md ${st === 'next' ? 'faint' : 'muted'}">${s}</div></div></div>`).join('')}</div>
        <b>Bukti serah terima</b>${fotos.length ? `<div class="row wrap">${fotos.map(e => `<a class="col gap-4" style="align-items:center" href="${esc(e.foto_url)}" target="_blank" rel="noopener">${photo(e.foto_url, '', 'width:120px;height:96px;border-radius:14px')}<span class="t-xs b6 muted">${e.tahap === 'selesai' ? 'Hasil olahan' : 'Muatan · ' + (e.berat || '') + ' kg'}</span></a>`).join('')}</div>` : `<span class="t-sm muted">Foto timbangan dan hasil olahan akan tampil di sini.</span>`}</div></div>
    <div class="col gap-16"><div class="card col"><div class="row">${photo(o.foto || (CATS[o.kategori] || CATS.Perikanan).img, '', 'width:48px;height:48px')}<div><div class="t-xs faint b6">${kodeOrder(o)}</div><b>${esc(o.judul || 'Limbah')}</b><div class="t-sm muted">${pill((ORD_ST[o.status] || [o.status])[0], (ORD_ST[o.status] || [0, 'primary'])[1])}</div></div></div><div class="divider"></div>
        ${kv('Metode jemput', esc(o.metode_jemput))}${kv('Berat dipesan', o.jumlah_kg ? esc(o.jumlah_kg) + ' kg' : '—')}${kv('Berat aktual', o.berat_aktual ? esc(o.berat_aktual) + ' kg' : '—')}${kv('Harga', o.harga_per_kg ? rp(o.harga_per_kg) + '/kg' : '—')}${kv('Total rekber', rp(o.total), 1)}</div>
      <div class="card col">${person('Penjual', o.seller, 'primary', esc(o.jemput_alamat || ''))}${person('Pembeli / pengolah', o.buyer, 'tani', esc((o.buyer || {}).kecamatan || ''))}${person('Mitra logistik', o.driver, 'batik', esc([o.driver && o.driver.armada, o.driver && o.driver.plat].filter(Boolean).join(' · ')))}</div>
      <div class="card col" id="ord-act">${ordActions(o)}</div>
      ${R.carrier && moving ? `<div class="card col">${shareBtn('order', o.id)}</div>` : ''}
      <button class="btn btn-plain" data-go="#/pesanan">${I('back')}Kembali ke Pesanan</button></div></div>`;
}
async function loadJejak() {
  const box = $('#jejak-box'); if (!box) return;
  try {
    const o = await DB.getOrder(S.curOrder);
    if (!o) { box.innerHTML = emptyBox('box', 'Pesanan tidak ditemukan', 'Pesanan ini tidak ada atau bukan milikmu.', `<button class="btn btn-primary" data-go="#/pesanan">Ke Pesanan</button>`); return; }
    S.jo = o; box.innerHTML = jejakView(o); initMaps(box);
    const sub = $('.topbar .sub'); if (sub) sub.textContent = `${kodeOrder(o)} · ${o.judul || ''}`;
    clearInterval(window._jt);
    if (!['selesai', 'dibatalkan'].includes(o.status)) window._jt = setInterval(tickJejak, 15000);
  } catch (e) { box.innerHTML = /column|relationship|order_events/i.test(e.message || '') ? note('info', 'Jalankan dulu file supabase/update-2-admin-jejak.sql di Supabase SQL Editor.', 'warning') : errBox(e); }
}
async function tickJejak() {
  if (!$('#jejak-box') || !S.jo) return clearInterval(window._jt);
  const o = await DB.getOrder(S.jo.id).catch(() => null); if (!o || !$('#jejak-box')) return;
  const changed = o.status !== S.jo.status || (o.events || []).length !== (S.jo.events || []).length || o.logistik_id !== S.jo.logistik_id;
  if (changed) { toast('Status pesanan diperbarui: ' + (ORD_ST[o.status] || [o.status])[0]); return loadJejak(); }
  if (o.driver_lat && (o.driver_lat !== S.jo.driver_lat || o.driver_lng !== S.jo.driver_lng)) {
    setDriverMarker($('#jejak-box .lmap[data-map="route"]'), [o.driver_lat, o.driver_lng]);
    const at = $('#drv-at'); if (at) { at.textContent = 'Posisi pengangkut ' + jamTgl(o.driver_at); at.className = 't-sm b6 c-primary'; }
  }
  S.jo = o;
}
/* geser / buat marker truk di peta rute */
function setDriverMarker(el, ll) {
  if (!el || !el._map || !window.L) return;
  if (el._truck) el._truck.setLatLng(ll);
  else el._truck = L.marker(ll, { icon: pinIcon('primary', 'truck', 42), zIndexOffset: 500 }).addTo(el._map).bindPopup('Posisi pengangkut');
}

/* ---------- 5. BAGIKAN LOKASI DRIVER (Geolocation API) ---------- */
const SHARE = { watch: null, id: null, kind: null, last: 0, sent: null };
function shareUI() { $$('[data-share-ui]').forEach(el => { el.outerHTML = shareBtn(el.dataset.kind || (SHARE.kind || 'order'), el.dataset.shareUi); }); }
function stopShare(quiet) {
  if (SHARE.watch != null && navigator.geolocation) navigator.geolocation.clearWatch(SHARE.watch);
  const was = SHARE.watch != null; SHARE.watch = null; SHARE.id = null; SHARE.sent = null;
  if (was && !quiet) toast('Berbagi lokasi dihentikan');
}
function startShare(kind, id) {
  if (!navigator.geolocation) { toast('Browser tidak mendukung lokasi'); return; }
  stopShare(true); SHARE.kind = kind; SHARE.id = id; SHARE.last = 0;
  SHARE.watch = navigator.geolocation.watchPosition((p) => {
    if (SHARE.id !== id) return;
    const ll = [+p.coords.latitude.toFixed(6), +p.coords.longitude.toFixed(6)];
    setDriverMarker($('#jejak-box .lmap[data-map="route"]'), ll);
    if (Date.now() - SHARE.last < 15000) return; SHARE.last = Date.now();
    (kind === 'order' ? DB.orderLocation(id, ll) : DB.pickupLocation(id, ll))
      .then(() => { SHARE.sent = new Date(); if (SHARE.id === id) shareUI(); })
      .catch((e) => { SHARE.last = 0; toast(pesanError(e)); });
  }, (err) => { toast(err.code === 1 ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser.' : 'Lokasi GPS belum tersedia'); stopShare(true); shareUI(); },
  { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
  shareUI(); toast('Berbagi lokasi aktif 📍');
}

/* ---------- 6. ORDER PESANAN UNTUK MITRA LOGISTIK ---------- */
async function loadLogistikOrders() {
  const box = $('#lo-box'); if (!box || !DB.on) return;
  try {
    const [open, mine] = await Promise.all([DB.openOrders(), DB.myOrders()]);
    const tasks = mine.filter(o => o.logistik_id === DB.user.id && ['dijemput', 'dikirim'].includes(o.status));
    const card = (o, action) => `<div class="card row gap-16" style="flex-wrap:wrap">${photo(o.foto || (CATS[o.kategori] || CATS.Perikanan).img, '', 'width:72px;height:64px;border-radius:14px')}<div class="col gap-4 grow" style="min-width:220px"><b class="t-lg">${esc(o.judul || 'Limbah')}${o.jumlah_kg ? ' · ' + esc(o.jumlah_kg) + ' kg' : ''}</b>
        <span class="t-md muted">${esc(o.jemput_alamat || (o.seller || {}).kecamatan || 'Lokasi penjual')} → ${esc((o.buyer || {}).nama || 'Pengolah')}${(o.buyer || {}).kecamatan ? ', ' + esc(o.buyer.kecamatan) : ''}</span>
        <div class="row gap-8 wrap">${pill(kodeOrder(o), 'primary')}${pill((ORD_ST[o.status] || [o.status])[0], (ORD_ST[o.status] || [0, 'primary'])[1])}</div></div>${action}</div>`;
    box.innerHTML = `${tasks.length ? `<div class="h3">Tugas pesanan saya</div>${tasks.map(o => card(o, `<button class="btn btn-primary btn-sm" data-go="#/jejak" data-order="${o.id}">Buka Tugas</button>`)).join('')}` : ''}
      <div class="h3">Pesanan rekber menunggu armada (${open.length})</div>
      ${open.length ? open.map(o => card(o, `<button class="btn btn-primary btn-sm" data-ord-take="${o.id}">Ambil Order</button>`)).join('') : `<div class="card muted" style="padding:20px">Belum ada pesanan yang menunggu armada.</div>`}`;
  } catch (e) { box.innerHTML = /column|metode_jemput/i.test(e.message || '') ? note('info', 'Jalankan dulu file supabase/update-2-admin-jejak.sql di Supabase SQL Editor.', 'warning') : errBox(e); }
}

/* ---------- interaksi fitur lanjutan ---------- */
document.addEventListener('click', (e) => {
  const t = e.target;
  // admin
  const at = t.closest('[data-tabset="adm"] [data-tab]'); if (at) { S.adminTab = at.dataset.tab; loadAdmin(); return; }
  const ot = t.closest('[data-tabset="ordtab"] [data-tab]'); if (ot) { S.ordTab = ot.dataset.tab; return; }
  const ad = t.closest('[data-adm-doc]'); if (ad) { e.preventDefault();
    if (!DB.on) { window.open(IMG(ad.dataset.demoImg || 'manifest'), '_blank', 'noopener'); return; }
    const w = window.open('', '_blank'); // dibuka langsung agar tidak diblokir browser
    busy(ad, async () => { try { const url = await DB.docUrl(ad.dataset.admDoc); if (w) w.location.href = url; else location.href = url; } catch (err) { if (w) w.close(); throw err; } }, 'Membuka…'); return; }
  const as = t.closest('[data-adm-set]'); if (as) { e.preventDefault(); const id = as.dataset.uid, st = as.dataset.admSet;
    const noteEl = $(`[data-adm-note="${id}"]`), cat = noteEl ? noteEl.value.trim() : '';
    if (st === 'ditolak' && !cat) { toast('Tulis alasan penolakan di kolom catatan'); noteEl && noteEl.focus(); return; }
    const msg = st === 'disetujui' ? 'Akun disetujui & ditandai terverifikasi ✓' : st === 'ditolak' ? 'Verifikasi ditolak, pendaftar diberi tahu' : 'Dikembalikan ke antrean';
    if (!DB.on) { const p = S.adminDemo.find(x => x.id === id); if (p) { p.verif_status = st; p.verif_catatan = cat || null; p.verif_at = st === 'menunggu' ? null : new Date().toISOString(); } toast(msg); loadAdmin(); return; }
    busy(as, async () => { await DB.setVerif(id, st, cat); toast(msg); loadAdmin(); }); return; }
  // pesanan & jejak
  const oa = t.closest('[data-ord-act]'); if (oa) { e.preventDefault(); const o = S.jo; if (!o) return; const act = oa.dataset.ordAct; const root = $('#ord-act');
    if (act === 'batal' && !confirmCancel(oa)) return;
    busy(oa, async () => {
      let msg;
      if (act === 'bayar') { await DB.updateOrder(o.id, { status: 'dibayar' }); msg = 'Pembayaran masuk rekber ✓'; }
      if (act === 'batal') { await DB.updateOrder(o.id, { status: 'dibatalkan' }); msg = 'Pesanan dibatalkan'; }
      if (act === 'ambil') { const ok = await DB.takeOrder(o.id); if (!ok) { toast('Order sudah diambil mitra lain'); return loadJejak(); } msg = 'Order diambil! Segera menuju lokasi jemput 🚚'; }
      if (act === 'jemput') { await DB.updateOrder(o.id, { status: 'dijemput' }); msg = 'Status: menuju lokasi jemput'; }
      if (act === 'muat') { const b = parseFloat(String(($('input[name="berat_aktual"]', root) || {}).value || '').replace(',', '.'));
        if (!(b > 0)) { toast('Isi berat aktual hasil timbang'); $('input[name="berat_aktual"]', root).focus(); return; }
        const f = ($('input[name="foto_muat"]', root) || {}).files; const foto = f && f[0] ? await DB.upload('foto-limbah', f[0]) : null;
        await DB.updateOrder(o.id, { status: 'dikirim', berat_aktual: b, foto_muat: foto }); msg = 'Muatan ' + b + ' kg tercatat ✓'; }
      if (act === 'terima') { await DB.updateOrder(o.id, { status: 'diterima' }); msg = 'Limbah diterima ✓'; }
      if (act === 'olah') { const ta = $('textarea[name="catatan_olah"]', root), cat = ta ? ta.value.trim() : '';
        const f = ($('input[name="foto_olah"]', root) || {}).files;
        if (!cat && !(f && f[0])) { toast('Isi hasil olahan atau unggah foto bukti'); ta && ta.focus(); return; }
        const foto = f && f[0] ? await DB.upload('foto-limbah', f[0]) : null;
        await DB.updateOrder(o.id, { status: 'selesai', foto_olah: foto, catatan_olah: cat || null }); msg = 'Bukti pengolahan terkirim · pesanan selesai ✓'; }
      if (['terima', 'olah', 'batal'].includes(act)) stopShare(true);
      if (msg) toast(msg); await loadJejak();
    }); return; }
  const tk = t.closest('[data-ord-take]'); if (tk) { e.preventDefault();
    busy(tk, async () => { const ok = await DB.takeOrder(tk.dataset.ordTake); if (!ok) { toast('Order sudah diambil mitra lain'); return loadLogistikOrders(); }
      toast('Order diambil! Segera menuju lokasi jemput 🚚'); S.curOrder = tk.dataset.ordTake; save(); nav('#/jejak'); }); return; }
  if (t.closest('[data-csv-db]')) { e.preventDefault(); const tab = S.ordTab || 'Aktif';
    const list = (S.ordList || []).filter(o => tab === 'Aktif' ? !['selesai', 'dibatalkan'].includes(o.status) : tab === 'Selesai' ? o.status === 'selesai' : o.status === 'dibatalkan');
    downloadCSV([['ID Pesanan', 'Limbah', 'Penjual', 'Pembeli', 'Metode', 'Berat (kg)', 'Total', 'Status', 'Tanggal'], ...list.map(o => [kodeOrder(o), o.judul || '', (o.seller || {}).nama || '', (o.buyer || {}).nama || '', o.metode_jemput, o.berat_aktual || o.jumlah_kg || '', o.total || 0, (ORD_ST[o.status] || [o.status])[0], (o.created_at || '').slice(0, 10)])], `SisaGuna_Pesanan_${tab}_${new Date().toISOString().slice(0, 10)}.csv`);
    toast('CSV diunduh ✓'); return; }
  // lokasi driver
  const ss = t.closest('[data-share-start]'); if (ss) { e.preventDefault(); startShare(ss.dataset.shareStart, ss.dataset.sid); return; }
  if (t.closest('[data-share-stop]')) { e.preventDefault(); stopShare(); shareUI(); return; }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.name === 'dokumen' && t.files && t.files[0] && $('#ocr-box')) runOcr(t.files[0]);
  if (['foto_muat', 'foto_olah'].includes(t.name) && t.files && t.files[0] && t.files[0].size > 5 * 1024 * 1024) { toast('Ukuran foto lebih dari 5 MB'); t.value = ''; const b = t.closest('.upload').querySelector('b'); if (b) b.textContent = 'Pilih foto lagi'; }
});

/* =========================================================
   ROUTER
   ========================================================= */
const ROUTES = {
  '/': ['landing'], '/masuk': ['masuk'], '/otp': ['otp'], '/peran': ['peran'],
  '/verifikasi/penghasil': ['verif', 'penghasil'], '/verifikasi/pengolah': ['verif', 'pengolah'], '/verifikasi/logistik': ['verif', 'logistik'],
  '/beranda': ['beranda', null, 'penghasil'], '/kategori': ['kategori'], '/jelajah': ['jelajah'], '/peta': ['peta'], '/detail': ['detail'], '/tawar': ['tawar'],
  '/posting': ['posting', null, 'penghasil'], '/posting/detail': ['postingDetail', null, 'penghasil'], '/posting/harga': ['postingHarga', null, 'penghasil'], '/posting/sukses': ['postingSukses', null, 'penghasil'],
  '/jemput-cepat': ['jemput'], '/kalender': ['kalender'], '/tender': ['tender'], '/bahan-baku': ['bahanBaku'],
  '/pesanan': ['pesanan', null, 'penghasil'], '/penawaran-masuk': ['penawaranMasuk', null, 'penghasil'], '/jejak': ['jejak'], '/bayar': ['bayar'], '/ulasan': ['ulasan'],
  '/pesan': ['pesan'], '/notifikasi': ['notifikasi'], '/dompet': ['dompet'], '/dampak': ['dampak'], '/profil': ['profil', null, 'penghasil'], '/bantuan': ['bantuan'],
  '/p/beranda': ['pBeranda', null, 'pengolah'], '/p/penawaran': ['pPenawaran', null, 'pengolah'], '/p/gudang': ['pGudang', null, 'pengolah'],
  '/l/beranda': ['lBeranda', null, 'logistik'], '/l/order': ['lOrder', null, 'logistik'], '/l/tugas': ['lTugas', null, 'logistik'], '/l/pendapatan': ['lPendapatan', null, 'logistik'],
  '/admin': ['admin']
};
function render() {
  if (DB.on && !DB.ready) return; // tunggu koneksi database (dan token dari link email) selesai dibaca
  let path = (location.hash || '#/').slice(1) || '/';
  if (path === '/keluar') { DB.signOut().catch(() => {}); S.role = 'penghasil'; if (DB.on) { S.prof = { penghasil: {}, pengolah: {}, logistik: {} }; S.phone = ''; } save(); location.hash = '#/'; return; }
  if (!ROUTES[path]) path = '/';
  const r = ROUTES[path];
  if (DB.on) {
    const pub = ['/', '/masuk', '/otp'];
    if (!DB.user && !pub.includes(path)) { location.hash = '#/masuk'; return; }
    if (DB.user && !DB.profile && !pub.includes(path) && path !== '/peran' && !path.startsWith('/verifikasi')) { location.hash = '#/peran'; return; }
    if (DB.profile && r[2] && r[2] !== DB.profile.role && path !== '/pesanan') { toast('Halaman itu untuk peran lain'); location.hash = ROLES[DB.profile.role].home; return; }
    if (path === '/admin' && !isAdmin()) { toast('Halaman admin hanya untuk akun admin'); location.hash = DB.profile ? ROLES[DB.profile.role].home : '#/'; return; }
  }
  if (r[2] && S.role !== r[2] && !(DB.on && path === '/pesanan')) { S.role = r[2]; save(); }
  if (path !== '/jejak' && path !== '/l/order') stopShare(true);
  if (path === '/l/tugas' && !render._keepStep) S.step = 1;
  render._keepStep = false;
  clearInterval(window._jt);
  $('#app').innerHTML = V[r[0]](r[1]);
  V.tawar._keep = false;
  initMaps();
  closeModal(); window.scrollTo(0, 0);
  afterRender(path);
  document.title = (path === '/' ? 'SisaGuna — Marketplace Daur Ulang Limbah' : 'SisaGuna · ' + (($('.topbar h1') || {}).textContent || 'Akun'));
}
window.addEventListener('hashchange', render);

/* =========================================================
   INTERAKSI (event delegation)
   ========================================================= */
document.addEventListener('click', (e) => {
  const t = e.target;
  // tutup dropdown jika klik di luar
  if (!t.closest('.dd')) $$('.dd.open').forEach(d => d.classList.remove('open'));

  const ddBtn = t.closest('.dd-btn'); if (ddBtn) { const d = ddBtn.parentElement; const was = d.classList.contains('open'); $$('.dd.open').forEach(x => x.classList.remove('open')); if (!was) d.classList.add('open'); return; }
  const ddOpt = t.closest('.dd-opt'); if (ddOpt) { const d = ddOpt.closest('.dd'); d.dataset.value = ddOpt.dataset.v; const dv = $('.dd-val', d); dv.textContent = (ddOpt.dataset.prefix || '') + ddOpt.dataset.v; dv.classList.remove('ph'); $$('.dd-opt', d).forEach(o => o.classList.toggle('sel', o === ddOpt)); d.classList.remove('open'); return; }
  const tgl = t.closest('[data-tgl]'); if (tgl) { S.tanggal = +tgl.dataset.tgl; const mc = miniCal(); $('#cal-wrap').innerHTML = mc.html; $('#dd-tgl .dd-val').textContent = `${mc.days[S.tanggal]}, ${S.tanggal} Nov 2026`; $('#dd-tgl').classList.remove('open'); return; }

  if (t.closest('[data-close-bg]') && !t.closest('.modal')) { closeModal(); return; }
  const ord = t.closest('[data-order]'); if (ord) { S.curOrder = ord.dataset.order; save(); }
  const closeEl = t.closest('[data-close]'); if (closeEl) { if (closeEl.dataset.go === '#/ulasan' && S.curOrder && !isDone(S.curOrder)) { S.doneOrders.push(S.curOrder); save(); toast('Pembayaran ' + S.curOrder + ' berhasil ✓'); }
    closeModal(); if (closeEl.dataset.toast) toast(closeEl.dataset.toast); if (closeEl.dataset.go) location.hash = closeEl.dataset.go; return; }
  const m = t.closest('[data-modal]'); if (m) { openModal(m.dataset.modal); return; }

  const scr = t.closest('[data-scroll]'); if (scr) { e.preventDefault(); $(scr.dataset.scroll).scrollIntoView({ behavior: 'smooth' }); return; }
  if (t.closest('[data-back]')) { history.back(); return; }

  // radio kartu
  const rd = t.closest('[data-radio]'); if (rd) { const g = rd.dataset.radio, v = rd.dataset.v; $$(`[data-radio="${g}"]`).forEach(x => x.classList.toggle('sel', x === rd)); onRadio(g, v); return; }
  // tab
  const tab = t.closest('[data-tab]'); if (tab) { const set = tab.closest('[data-tabset]').dataset.tabset; switchTab(set, tab.dataset.tab); return; }
  const jump = t.closest('[data-tabjump]'); if (jump) { const [s, v] = jump.dataset.tabjump.split(':'); switchTab(s, v); $(`[data-tabset="${s}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  // chip pilih satu
  const single = t.closest('[data-single] .chip'); if (single) { const box = single.parentElement; $$('.chip', box).forEach(c => { const on = c === single; c.classList.toggle('active', on); c.innerHTML = (on ? I('check') : '') + c.dataset.v; }); if (['08.00–10.00', '10.00–12.00', '13.00–15.00', '15.00–17.00'].includes(single.dataset.v)) S.jam = single.dataset.v; return; }
  const mc = t.closest('.chip-multi'); if (mc) { mc.classList.toggle('on'); mc.querySelector('.ic').outerHTML = I(mc.classList.contains('on') ? 'check' : 'plus'); return; }
  const ch = t.closest('.chk'); if (ch) { ch.classList.toggle('on'); return; }
  const sv = t.closest('.switch'); if (sv) { sv.classList.toggle('on'); if (sv.dataset.toggleLabel) { const l = $(sv.dataset.toggleLabel); l.textContent = sv.classList.contains('on') ? sv.dataset.on : sv.dataset.off; l.className = 't-sm b7 ' + (sv.classList.contains('on') ? 'c-tani' : 'faint'); } return; }
  const acc = t.closest('.acc'); if (acc) { acc.classList.toggle('open'); return; }

  // halaman-spesifik
  const jc = t.closest('[data-jlcat]'); if (jc) { S.jlCat = jc.dataset.jlcat; S.jlPage = 1; if (DB.on) loadJelajah(); else $('#jl-results').innerHTML = jelajahResults(); return; }
  const jp = t.closest('[data-jlpage]'); if (jp) { S.jlPage = +jp.dataset.jlpage; if (DB.on) loadJelajah(); else $('#jl-results').innerHTML = jelajahResults(); $('#jl-results').scrollIntoView({ behavior: 'smooth' }); return; }
  const pt = t.closest('[data-petatab]'); if (pt) { S.petaTab = pt.dataset.petatab; $('#peta-panel').innerHTML = petaPanel(); petaMarkers(true); return; }
  const fly = t.closest('[data-fly]'); if (fly) { const el = $('.lmap[data-map="peta"]'); if (el && el._map) { const ll = fly.dataset.fly.split(',').map(Number); el._map.flyTo(ll, 15); el._layer.eachLayer(mk => { const p = mk.getLatLng(); if (Math.abs(p.lat - ll[0]) < 1e-6 && Math.abs(p.lng - ll[1]) < 1e-6) setTimeout(() => mk.openPopup(), 600); }); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else toast('Peta belum dimuat'); return; }
  const gl = t.closest('[data-galeri]'); if (gl) { S.galeri = +gl.dataset.galeri; $('#galeri').innerHTML = galeri(); return; }
  const kd = t.closest('[data-kal]'); if (kd) { S.kalDay = +kd.dataset.kal; $$('#cal .day').forEach(d => d.classList.toggle('sel', d.dataset.kal === kd.dataset.kal)); $('#kal-panel').innerHTML = kalPanel(); return; }
  const td = t.closest('[data-tender]'); if (td) { S.tenderSel = +td.dataset.tender; $('#tender-list').innerHTML = tenderList(); $('#tender-detail').innerHTML = tenderDetail(); return; }
  const st = t.closest('[data-star]'); if (st) { S.rating = +st.dataset.star; $('#stars').innerHTML = stars(); return; }
  const rj = t.closest('[data-reject]'); if (rj) { const card = rj.closest('.offer'); const a = $('.offer-actions', card); if (!card.dataset.html) { card.dataset.html = a.innerHTML; a.innerHTML = `${pill('Ditolak', 'danger')}<button class="btn btn-plain btn-sm" data-undo>Batalkan</button>`; card.style.background = 'var(--bg)'; } return; }
  const ud = t.closest('[data-undo]'); if (ud) { const card = ud.closest('.offer'); $('.offer-actions', card).innerHTML = card.dataset.html; delete card.dataset.html; card.style.background = ''; return; }
  if (t.closest('[data-step-next]')) { if (S.step < 4) { S.step++; $('#tugas').innerHTML = tugasView(); initMaps($('#tugas')); } else { toast('Tugas selesai! +Rp35.000'); location.hash = '#/l/pendapatan'; } return; }
  if (t.closest('[data-mark-read]')) { if (DB.on) DB.markAllRead().catch(() => {}); $$('.notif-item').forEach(n => n.style.background = ''); $$('.unread').forEach(u => u.remove()); toast('Semua notifikasi ditandai dibaca'); return; }
  const cp = t.closest('[data-copy]'); if (cp) { navigator.clipboard && navigator.clipboard.writeText($(cp.dataset.copy).textContent.replace(/\s/g, '')); toast('Nomor VA disalin'); return; }
  const kat = t.closest('[data-kat]'); if (kat) S.katTab = kat.dataset.kat;
  if (t.closest('[data-chat]')) { $$('[data-chat]').forEach(c => c.classList.toggle('active', c === t.closest('[data-chat]'))); }

  // --- unduhan PDF & CSV
  const pdfBtn = t.closest('[data-pdf]'); if (pdfBtn) { e.preventDefault(); const k = pdfBtn.dataset.pdf;
    try {
      if (k === 'dampak') PDF_DOCS.dampak((($('[data-tabset="dampak"] .active') || {}).dataset || {}).tab || 'Bulan ini');
      if (k === 'laporan') PDF_DOCS.dampak('Bulan ini', pdfBtn.dataset.judul);
      if (k === 'sertifikat') PDF_DOCS.sertifikat();
      if (k === 'tender') PDF_DOCS.tender(TENDERS[S.tenderSel], pdfBtn.dataset.doc);
      if (k === 'manifest') PDF_DOCS.manifest(pdfBtn.dataset.judul, pdfBtn.dataset.mitra);
      toast('PDF diunduh ✓');
    } catch (err) { console.error(err); toast('Gagal membuat PDF'); }
    return; }
  if (t.closest('[data-csv="pesanan"]')) { e.preventDefault();
    const tab = (($('[data-tabset="pesanan"] .active') || {}).dataset || {}).tab || 'Aktif';
    downloadCSV([['ID Pesanan', 'Limbah', 'Mitra', 'Total', 'Status'], ...ORDERS[tab].map(r => [r[0], r[2], r[3], r[4], r[5]])], `SisaGuna_Pesanan_${tab}_${new Date().toISOString().slice(0, 10)}.csv`);
    toast('CSV diunduh ✓'); return; }

  // --- jemput cepat
  const jc2 = t.closest('[data-jemput-create]'); if (jc2) { e.preventDefault();
    const d = collect($('#jemput')); Object.assign(S.jform, d);
    if (!d.limbah) { toast('Isi jenis limbah dulu'); $('#jemput input[name="limbah"]').focus(); return; }
    if (!S.jform.lat) { toast('Tentukan titik jemput di peta'); return; }
    const row = { limbah: d.limbah, berat: d.berat || null, armada: S.jform.armada, waktu: d.waktu || 'Sekarang (< 2 jam)', alamat: d.alamat || null, lat: S.jform.lat, lng: S.jform.lng, tujuan: d.tujuan || null, catatan: d.catatan || null, ongkos: ARMADA[S.jform.armada][0] };
    const done = () => { S.jform = { armada: S.jform.armada, waktu: 'Sekarang (< 2 jam)' }; S.jShow = null; toast('Permintaan jemput terkirim ✓'); loadJemput(); };
    if (!DB.on) { S.pickups.unshift(Object.assign({ id: 'demo-' + Date.now(), status: 'mencari', created_at: new Date().toISOString() }, row)); save(); done(); return; }
    busy(jc2, async () => { await DB.createPickup(row); done(); }, 'Mengirim…'); return; }
  const jx = t.closest('[data-jemput-cancel]'); if (jx) { e.preventDefault(); if (!confirmCancel(jx)) return;
    const id = jx.dataset.jemputCancel;
    if (!DB.on) { const p = S.pickups.find(x => x.id === id); if (p) p.status = 'dibatalkan'; save(); S.jShow = null; toast('Penjemputan dibatalkan'); loadJemput(); return; }
    busy(jx, async () => { await DB.updatePickup(id, { status: 'dibatalkan' }); S.jShow = null; toast('Penjemputan dibatalkan'); loadJemput(); }); return; }
  if (t.closest('[data-jemput-new]')) { S.jShow = '__none'; S.jActive = null; $('#jemput').innerHTML = jemputForm(); initMaps($('#jemput')); clearInterval(window._jt); return; }
  if (t.closest('[data-jemput-refresh]')) { loadJemput(); return; }
  const lj = t.closest('[data-lj-act]'); if (lj) { e.preventDefault(); const p = S.ljOpen[lj.dataset.pid], act = lj.dataset.ljAct;
    busy(lj, async () => {
      if (act === 'ambil') { const ok = await DB.takePickup(p.id); toast(ok ? 'Order diambil! Segera menuju titik jemput 🚚' : 'Order sudah diambil mitra lain'); }
      else { await DB.updatePickup(p.id, { status: act }); if (act === 'selesai' && SHARE.id === p.id) stopShare(true); toast(act === 'dijemput' ? 'Status: limbah dimuat ✓' : 'Penjemputan selesai ✓'); }
      loadLogistikJemput(); }); return; }

  // --- login
  const so = t.closest('[data-send-otp], [data-resend]'); if (so) { e.preventDefault();
    const inp = $('input[name="login"]'); const id = inp ? inp.value.trim() : (S.loginId || S.phone);
    if (!id) { toast(VIA_EMAIL() ? 'Isi email dulu' : 'Isi nomor WhatsApp dulu'); inp && inp.focus(); return; }
    if (VIA_EMAIL() && !/^\S+@\S+\.\S+$/.test(id)) { toast('Format email belum benar'); inp.focus(); return; }
    S.loginId = id; if (!VIA_EMAIL()) S.phone = id; save();
    if (!DB.on) { if (so.hasAttribute('data-send-otp')) nav('#/otp'); else toast('Kode dikirim ulang'); return; }
    busy(so, async () => { await DB.sendOtp(id); toast(OTP_MODE() ? 'Kode OTP terkirim, cek email kamu' : 'Email terkirim, cek inbox kamu'); if (so.hasAttribute('data-send-otp')) nav('#/otp'); }, 'Mengirim…'); return; }
  const vo = t.closest('[data-verify-otp]'); if (vo) { e.preventDefault();
    const code = $$('.otp input').map(i => i.value.trim()).join('');
    if (!DB.on) { nav('#/peran'); return; }
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) { toast(`Isi ${OTP_LENGTH} digit kode OTP`); return; }
    busy(vo, async () => { const p = await DB.verifyOtp(S.loginId, code); toast('Berhasil masuk ✓'); if (p) S.pickRole = p.role; nav('#/peran'); }, 'Memeriksa…'); return; }
  const gg = t.closest('[data-google]'); if (gg) { e.preventDefault(); if (!DB.on) { nav('#/peran'); return; } busy(gg, () => DB.google(), 'Membuka Google…'); return; }

  // --- posting limbah
  if (t.closest('[data-draft-start]') && S.draftDone) { S.draft = {}; S.draftFiles = []; S.draftDone = false; S.lastPosted = null; }
  const ds = t.closest('[data-draft-step]'); if (ds) { const root = ds.closest('.card'); const d = collect(root);
    if (!d.judul) { toast('Judul listing wajib diisi'); $('input[name="judul"]', root).focus(); e.preventDefault(); return; }
    Object.assign(S.draft, d); }
  const rf = t.closest('[data-rmfoto]'); if (rf) { e.preventDefault(); S.draftFiles.splice(+rf.dataset.rmfoto, 1); $('#foto-prev').innerHTML = fotoPrev(POST_FORMS[S.postCat]); return; }
  const pb = t.closest('[data-publish]'); if (pb) { e.preventDefault();
    Object.assign(S.draft, collect($('.content')));
    if (!num(S.draft.harga) && S.model !== 'Bayar Jasa Olah') { toast('Isi harga per kg dulu'); const h = $('input[name="harga"]'); h && h.focus(); return; }
    const f = POST_FORMS[S.postCat];
    const finish = () => { S.draftDone = true; if (S.model === 'Bayar Jasa Olah') openModal('p06'); else if (S.model === 'Buka Tender') nav('#/tender'); else nav('#/posting/sukses'); };
    if (!DB.on) { finish(); return; }
    busy(pb, async () => {
      const d = S.draft;
      S.lastPosted = await DB.createListing({ kategori: S.postCat, judul: d.judul, jenis: d.jenis, deskripsi: d.deskripsi, berat: d.berat, harga: d.harga, nego: d.nego,
        detail: { [f.d1[0]]: d.d1 || '', [f.d2[0]]: d.d2 || '', [f.sp[1]]: d.khusus !== false }, frekuensi: d.frekuensi, ketersediaan: d.ketersediaan, model: S.model, lat: d.lat, lng: d.lng }, S.draftFiles);
      toast('Listing tersimpan ✓'); finish();
    }, 'Menyimpan…'); return; }

  // --- penawaran
  const lid = t.closest('[data-lid]'); if (lid) { S.cur = DB.cache[lid.dataset.lid] || null; S.galeri = 0; }
  else if (t.closest('.lcard, .lrow, [data-go="#/detail"]')) { S.cur = null; S.galeri = 0; }
  const sof = t.closest('[data-send-offer]'); if (sof) { e.preventDefault();
    if (!(S.offerH > 0) || !(S.offerJ > 0)) { toast('Isi harga dan jumlah dengan benar'); return; }
    if (!DB.on || !S.cur) { openModal(sof.dataset.sendOffer); return; }
    const model = (($('[data-tabset="modelp"] .active') || {}).dataset || {}).tab === 'jasa' ? 'Bayar Jasa Olah' : 'Beli Limbah';
    const ta = $('textarea[name="catatan"]');
    busy(sof, async () => {
      await DB.createOffer({ listing_id: S.cur.id, model, harga_per_kg: Math.round(S.offerH), jumlah_kg: S.offerJ, metode_jemput: S.metode,
        tanggal_jemput: `2026-11-${String(S.tanggal).padStart(2, '0')}`, jam_jemput: S.jam, catatan: ta ? ta.value.trim() || null : null, total: calc().total });
      openModal(sof.dataset.sendOffer);
    }, 'Mengirim…'); return; }
  const oa = t.closest('[data-offer-act]'); if (oa) { e.preventDefault(); const o = S.offers[oa.dataset.oid], st = oa.dataset.offerAct;
    busy(oa, async () => { await DB.setOfferStatus(o, st); toast(st === 'diterima' ? 'Penawaran diterima, pesanan dibuat ✓' : st === 'ditolak' ? 'Penawaran ditolak' : 'Penawaran dibatalkan'); render(); }); return; }

  // simpan data yang diinput pengguna
  if (t.closest('[data-save-profile]')) { const d = collect($('#profil-form')); if (!d.nama) { toast('Nama usaha wajib diisi'); $('#profil-form input[name="nama"]').focus(); return; } const merged = Object.assign({}, S.prof.penghasil || {}, d);
    if (DB.on) { busy(t.closest('[data-save-profile]'), async () => { await DB.saveProfile('penghasil', merged); render(); toast('Perubahan disimpan ✓'); }, 'Menyimpan…'); return; }
    S.prof.penghasil = merged; save(); render(); toast('Perubahan disimpan ✓'); return; }
  // navigasi umum
  const role = t.closest('[data-role]'); if (role) { const who = role.dataset.role; const d = collect(role.closest('.inner')); if (!d.nama) { toast('Nama usaha wajib diisi'); const n = $('.inner input[name="nama"]'); n && n.focus(); return; } if (d.wa) S.phone = d.wa;
    if (DB.on) { e.preventDefault(); const fileInp = $('.inner input[name="dokumen"]'); const file = fileInp && fileInp.files[0];
      busy(role, async () => { await DB.saveProfile(who, d, file, ocrFinal()); toast(file ? 'Data terkirim ✓ Dokumen menunggu pemeriksaan admin' : 'Data verifikasi terkirim ✓'); nav(role.dataset.go); }, 'Mengirim…'); return; }
    d.ocr = ocrFinal(); S.prof[who] = d; S.role = who; save(); }
  const toastEl = t.closest('[data-toast]'); if (toastEl) toast(toastEl.dataset.toast);
  const after = t.closest('[data-toast-after]'); if (after) setTimeout(() => toast(after.dataset.toastAfter), 150);
  const go = t.closest('[data-go]'); if (go) { e.preventDefault(); if (location.hash === go.dataset.go) render(); else location.hash = go.dataset.go; }
});

function confirmCancel(btn) {
  if (btn.dataset.armed) return true;
  btn.dataset.armed = '1'; const html = btn.innerHTML; btn.innerHTML = 'Klik lagi untuk membatalkan'; btn.classList.add('btn-danger-soft');
  setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.innerHTML = html; btn.classList.remove('btn-danger-soft'); } }, 3000);
  return false;
}
function collect(root) {
  const d = {};
  $$('input[name]', root).forEach(i => d[i.name] = i.value.trim());
  $$('.dd[data-name]', root).forEach(x => d[x.dataset.name] = x.dataset.value || '');
  $$('.chips[data-name]', root).forEach(c => d[c.dataset.name] = c.hasAttribute('data-single') ? (($('.chip.active', c) || {}).dataset || {}).v || '' : $$('.chip.on', c).map(b => b.dataset.v));
  $$('textarea[name]', root).forEach(i => d[i.name] = i.value.trim());
  $$('.switch[data-name]', root).forEach(w => d[w.dataset.name] = w.classList.contains('on'));
  return d;
}
function switchTab(set, v) {
  $$(`[data-tabset="${set}"] [data-tab]`).forEach(b => b.classList.toggle('active', b.dataset.tab === v));
  $$(`[data-pane-of="${set}"]`).forEach(p => p.classList.toggle('hidden', p.dataset.pane !== v));
}
function onRadio(g, v) {
  if (g === 'peran') { S.pickRole = v; const r = ROLE_OPTS.find(x => x[0] === v); const b = $('#btn-peran'); b.textContent = 'Lanjutkan sebagai ' + r[1]; b.dataset.go = '#/verifikasi/' + v; $('#btn-peran').previousElementSibling.lastElementChild.textContent = 'Langkah berikutnya: ' + r[5]; }
  if (g === 'postcat') { S.postCat = v; save(); const k = ck(v); $('#postcat-info').innerHTML = note('info', `Form berikutnya untuk ${v}: ${NEXT_INFO[v]}.`, k === 'industri' ? 'primary' : (k === 'batik' ? 'warning' : k)); }
  if (g === 'model') { S.model = v; $('#model-box').innerHTML = modelBox(); }
  if (g === 'metode') { S.metode = v; $('#checkout').innerHTML = checkout(); }
  if (g === 'pay') { S.pay = v; $('#pay-box').innerHTML = payBox(); }
  if (g === 'armada') { S.jform.armada = v; $('#j-armada').textContent = v; $('#j-ongkos').textContent = rp(ARMADA[v][0]); }
}

/* input: range slider label, enter di pencarian, kirim chat, OTP auto-next */
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.rangeOut) $(t.dataset.rangeOut).textContent = (t.dataset.rangeFmt || '≤ {v} km').replace('{v}', t.value);
  if (t.closest('.otp')) { t.value = t.value.replace(/\D/g, '').slice(-1); if (t.value && t.nextElementSibling) t.nextElementSibling.focus(); }
  if ((t.name === 'harga' || t.name === 'jumlah') && $('#ringkasan')) { if (t.name === 'harga') S.offerH = +t.value || 0; else S.offerJ = +t.value || 0; $('#ringkasan').innerHTML = ringkasan(); }
  if ((t.name === 'harga' || t.name === 'berat') && $('#estimasi')) { S.draft[t.name] = t.value; $('#estimasi').textContent = estimasi(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.name === 'foto' && t.files) {
    const room = 4 - S.draftFiles.length;
    [...t.files].slice(0, room).forEach(f => { f._url = URL.createObjectURL(f); S.draftFiles.push(f); });
    if (t.files.length > room) toast('Maksimal 4 foto');
    t.value = ''; $('#foto-prev').innerHTML = fotoPrev(POST_FORMS[S.postCat]);
  }
  if (t.hasAttribute('data-file-label') && t.files[0]) { const b = t.closest('.upload').querySelector('b'); if (b) b.textContent = '✓ ' + t.files[0].name; }
});
document.addEventListener('paste', (e) => {
  const t = e.target; if (!t.closest || !t.closest('.otp')) return;
  const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH); if (!d) return;
  e.preventDefault(); $$('.otp input').forEach((i, k) => i.value = d[k] || '');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace' && e.target.closest && e.target.closest('.otp') && !e.target.value && e.target.previousElementSibling) e.target.previousElementSibling.focus();
  if (e.key === 'Enter' && e.target.dataset.enter) location.hash = e.target.dataset.enter;
  if (e.key === 'Enter' && e.target.name === 'login') { const b = $('[data-send-otp]'); b && b.click(); }
  if (e.key === 'Escape') closeModal();
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'chat-form') { e.preventDefault(); const i = $('#chat-text'); if (!i.value.trim()) return; const m = document.createElement('div'); m.className = 'msg me'; const now = new Date(); m.innerHTML = `${i.value.replace(/</g, '&lt;')}<small>${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}</small>`; $('#msgs').appendChild(m); i.value = ''; $('#msgs').scrollTop = 1e6; }
});
/* tombol "kembali ke atas" di landing */
window.addEventListener('scroll', () => { const b = $('.to-top'); if (b) b.classList.toggle('show', window.scrollY > 600); });

/* mulai aplikasi: sambungkan database dulu (jika diisi), lalu tampilkan halaman */
(async function boot() {
  if (DB.on) { $('#app').innerHTML = `<div style="min-height:100vh;display:grid;place-items:center" class="muted">Menghubungkan ke SisaGuna…</div>`;
    try { await DB.init(); } catch (e) { console.error(e); toast(pesanError(e)); } }
  DB.ready = true;
  render();
  if (DB.linkError) setTimeout(() => toast(/expired|invalid/i.test(DB.linkError) ? 'Link masuk sudah kedaluwarsa atau sudah dipakai. Minta link baru.' : 'Link masuk gagal: ' + DB.linkError), 300);
})();
