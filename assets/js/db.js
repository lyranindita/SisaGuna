/* =========================================================
   SisaGuna — koneksi database (Supabase)
   ---------------------------------------------------------
   1. Buat proyek di https://supabase.com
   2. Jalankan supabase/schema.sql di SQL Editor
   3. Isi 2 kunci di bawah (Project Settings → API)
   Selama kunci masih kosong, website berjalan dalam MODE DEMO
   (data contoh + tersimpan di browser saja).
   ========================================================= */
const SUPABASE_URL = 'https://juskkwnujvexpkfnozwv.supabase.co';        // contoh: 'https://abcdefghijk.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_aY_F8yNKBDcmE8Ez9MLnUw_hW38t2Cv';   // kunci "anon public" (aman dipakai di browser)
const LOGIN_VIA = 'email';      // 'email' (gratis) atau 'whatsapp' (butuh Twilio, lihat SUPABASE.md)
const EMAIL_MODE = 'link';       // 'otp' = pengguna memasukkan kode dari email (butuh SMTP + template {{ .Token }}), 'link' = klik link di email
const OTP_LENGTH = 6;           // samakan dengan "Email OTP Length" di Supabase

const rp = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
function initials(nama) {
  const words = String(nama || '').trim().split(/\s+/).filter(w => !/^(cv|ud|pt|pd|koperasi|pak|bu|ibu)\.?$/i.test(w));
  const a = words[0] || String(nama || '?'); const b = words[1] ? words[1][0] : (a[1] || '');
  return (a[0] + b).toUpperCase();
}
/* angka dari teks bebas: "± 250 kg" → 250, "1,5 ton" → 1500, "Rp1.500" → 1500 */
function num(v, unitAware = false) {
  const s = String(v || '').toLowerCase();
  const m = s.match(/\d[\d.,]*/); if (!m) return 0;
  let t = m[0];
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/[.,]/g, '');
  let n = parseFloat(t) || 0;
  if (unitAware && /ton/.test(s)) n *= 1000;
  return n;
}

const DB = {
  on: !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase),
  sb: null, user: null, profile: null, cache: {},

  async init() {
    if (!this.on) return;
    // tanda datang dari link email / Google (token di #… atau ?code=…)
    const href = location.href;
    const fromLink = /access_token=|refresh_token=|error_description=|[?&]code=|[?&]error=/.test(href);
    const errDesc = (href.match(/error_description=([^&#]+)/) || [])[1];
    // flowType 'implicit': link di email bisa dibuka di browser/perangkat mana pun
    this.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: 'implicit', persistSession: true, detectSessionInUrl: true } });
    const { data } = await this.sb.auth.getSession();
    this.user = data.session ? data.session.user : null;
    if (this.user) await this.loadProfile().catch(e => console.error(e));
    this.sb.auth.onAuthStateChange((ev, session) => {
      this.user = session ? session.user : null;
      if (ev === 'SIGNED_OUT') this.profile = null;
    });
    // setelah klik "Sign in": bersihkan URL lalu arahkan ke halaman yang tepat
    if (fromLink) {
      this.linkError = !this.user && errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : (!this.user ? 'Sesi tidak terbaca' : null);
      history.replaceState(null, '', location.pathname);
      location.hash = this.user ? (this.profile ? ROLES[this.profile.role].home : '#/peran') : '#/masuk';
    }
  },

  /* ---------- LOGIN ---------- */
  phoneE164(v) { let d = String(v).replace(/\D/g, ''); if (d.startsWith('0')) d = '62' + d.slice(1); if (!d.startsWith('62')) d = '62' + d; return '+' + d; },
  async sendOtp(id) {
    const o = LOGIN_VIA === 'whatsapp'
      ? { phone: this.phoneE164(id), options: { channel: 'whatsapp' } }
      : { email: id.trim(), options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } };
    const { error } = await this.sb.auth.signInWithOtp(o);
    if (error) throw error;
  },
  async verifyOtp(id, token) {
    const o = LOGIN_VIA === 'whatsapp'
      ? { phone: this.phoneE164(id), token, type: 'sms' }
      : { email: id.trim(), token, type: 'email' };
    const { data, error } = await this.sb.auth.verifyOtp(o);
    if (error) throw error;
    this.user = data.user;
    return this.loadProfile();
  },
  async google() {
    const { error } = await this.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) throw error;
  },
  async signOut() { if (this.on) await this.sb.auth.signOut(); this.user = null; this.profile = null; },

  /* ---------- PROFIL ---------- */
  fromRow(r) {
    return { nama: r.nama, nib: r.nib || '', wa: r.whatsapp || '', email: r.email || '', kec: r.kecamatan || '', alamat: r.alamat || '',
      usaha: r.jenis_usaha || '', olah: r.jenis_olahan || '', kategori: r.kategori || [], kapasitas: r.kapasitas || '',
      plat: r.plat || '', armada: r.armada || '', pendingin: !!r.pendingin, wilayah: r.wilayah || [], verified: !!r.terverifikasi,
      verifStatus: r.verif_status || (r.terverifikasi ? 'disetujui' : 'belum'), verifCatatan: r.verif_catatan || '', isAdmin: !!r.is_admin };
  },
  toRow(role, d) {
    const map = { nama: 'nama', nib: 'nib', wa: 'whatsapp', email: 'email', kec: 'kecamatan', alamat: 'alamat', usaha: 'jenis_usaha', olah: 'jenis_olahan',
      kategori: 'kategori', kapasitas: 'kapasitas', plat: 'plat', armada: 'armada', pendingin: 'pendingin', wilayah: 'wilayah' };
    const row = { role };
    for (const k in map) if (d[k] !== undefined) row[map[k]] = d[k] === '' ? null : d[k];
    return row;
  },
  async loadProfile() {
    if (!this.user) return null;
    const { data, error } = await this.sb.from('profiles').select('*').eq('id', this.user.id).maybeSingle();
    if (error) throw error;
    this.profile = data;
    if (data) { S.role = data.role; S.prof[data.role] = this.fromRow(data); if (data.whatsapp) S.phone = data.whatsapp; save(); }
    return data;
  },
  async saveProfile(role, d, file, ocr) {
    const row = this.toRow(role, d); row.id = this.user.id;
    if (!row.email && this.user.email) row.email = this.user.email;
    if (file) row.dokumen_path = await this.upload('dokumen', file);
    if (ocr) row.ocr = ocr;
    let { data, error } = await this.sb.from('profiles').upsert(row).select().single();
    if (error && row.ocr && /ocr/.test(error.message || '')) { delete row.ocr; ({ data, error } = await this.sb.from('profiles').upsert(row).select().single()); } // update-2 belum dijalankan
    if (error) throw error;
    this.profile = data; S.role = data.role; S.prof[data.role] = this.fromRow(data); save();
    return data;
  },

  /* ---------- FILE ---------- */
  async upload(bucket, file) {
    const ext = ((file.name || '').split('.').pop() || 'jpg').toLowerCase();
    const path = `${this.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await this.sb.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
    if (error) throw error;
    return bucket === 'foto-limbah' ? this.sb.storage.from(bucket).getPublicUrl(path).data.publicUrl : path;
  },

  /* ---------- LISTING ---------- */
  toCard(r) {
    const harga = r.harga_per_kg != null ? rp(r.harga_per_kg) + '/kg' : 'Nego';
    return [r.kategori, esc(r.judul), esc(r.lokasi || r.kecamatan || '—'), esc(r.berat || '—'), harga, (r.foto && r.foto[0]) || CATS[r.kategori].img, r.id];
  },
  async createListing(d, files) {
    const urls = [];
    for (const f of files || []) urls.push(await this.upload('foto-limbah', f));
    const P = this.profile || {};
    const row = {
      kategori: d.kategori, judul: d.judul, jenis: d.jenis || null, deskripsi: d.deskripsi || null, berat: d.berat || null,
      harga_per_kg: d.harga ? Math.round(num(d.harga)) : null, bisa_nego: d.nego !== false,
      detail: d.detail || {}, frekuensi: d.frekuensi || null, ketersediaan: d.ketersediaan || null, model: d.model || 'Jual Limbah',
      lokasi: [P.alamat, P.kecamatan].filter(Boolean).join(', ') || null, kecamatan: P.kecamatan || null, foto: urls,
      lat: d.lat || null, lng: d.lng || null
    };
    const { data, error } = await this.sb.from('listings').insert(row).select('*, owner:profiles(nama, kecamatan, terverifikasi)').single();
    if (error) throw error;
    this.cache[data.id] = data; return data;
  },
  async listListings({ kategori, page = 1, per = 6, kategoriIn } = {}) {
    let q = this.sb.from('listings').select('*, owner:profiles(nama, kecamatan, terverifikasi)', { count: 'exact' })
      .eq('status', 'aktif').order('created_at', { ascending: false }).range((page - 1) * per, page * per - 1);
    if (kategori && kategori !== 'Semua') q = q.eq('kategori', kategori);
    if (kategoriIn && kategoriIn.length) q = q.in('kategori', kategoriIn);
    const { data, error, count } = await q;
    if (error) throw error;
    data.forEach(r => this.cache[r.id] = r);
    return { rows: data, count: count || 0 };
  },
  async myListings() {
    const { data, error } = await this.sb.from('listings').select('*').eq('owner_id', this.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    data.forEach(r => this.cache[r.id] = r); return data;
  },

  /* ---------- PENAWARAN ---------- */
  async createOffer(o) {
    const { data, error } = await this.sb.from('offers').insert(o).select().single();
    if (error) throw error; return data;
  },
  async incomingOffers() {
    const { data, error } = await this.sb.from('offers')
      .select('*, listing:listings!inner(id, judul, kategori, foto, owner_id, berat, lokasi, harga_per_kg), buyer:profiles(nama, kecamatan)')
      .eq('listing.owner_id', this.user.id).order('created_at', { ascending: false });
    if (error) throw error; return data;
  },
  async myOffers() {
    const { data, error } = await this.sb.from('offers')
      .select('*, listing:listings(id, judul, kategori, foto, lokasi, owner:profiles(nama))')
      .eq('buyer_id', this.user.id).order('created_at', { ascending: false });
    if (error) throw error; return data;
  },
  async setOfferStatus(offer, status) {
    const { error } = await this.sb.from('offers').update({ status }).eq('id', offer.id);
    if (error) throw error;
    if (status === 'diterima') {
      const { error: e2 } = await this.sb.from('orders').insert({ offer_id: offer.id, listing_id: offer.listing_id, seller_id: this.user.id, buyer_id: offer.buyer_id, total: offer.total });
      if (e2) throw e2;
    }
  },

  /* ---------- JEMPUT CEPAT ---------- */
  async createPickup(row) {
    const { data, error } = await this.sb.from('pickup_requests').insert(row).select().single();
    if (error) throw error; return data;
  },
  async myPickups() {
    const { data, error } = await this.sb.from('pickup_requests')
      .select('*, driver:profiles!pickup_requests_logistik_id_fkey(nama, whatsapp, plat, armada, kecamatan)')
      .eq('requester_id', this.user.id).order('created_at', { ascending: false }).limit(20);
    if (error) throw error; return data;
  },
  async openPickups() {
    const { data, error } = await this.sb.from('pickup_requests')
      .select('*, requester:profiles!pickup_requests_requester_id_fkey(nama, whatsapp, kecamatan)')
      .eq('status', 'mencari').order('created_at', { ascending: true });
    if (error) throw error; return data.filter(p => p.requester_id !== this.user.id);
  },
  async myPickupTasks() {
    const { data, error } = await this.sb.from('pickup_requests')
      .select('*, requester:profiles!pickup_requests_requester_id_fkey(nama, whatsapp, kecamatan)')
      .eq('logistik_id', this.user.id).in('status', ['diambil', 'dijemput']).order('created_at', { ascending: true });
    if (error) throw error; return data;
  },
  async takePickup(id) {
    const { data, error } = await this.sb.from('pickup_requests').update({ logistik_id: this.user.id, status: 'diambil', diambil_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'mencari').select();
    if (error) throw error; return data && data.length > 0;
  },
  async updatePickup(id, patch) {
    const { error } = await this.sb.from('pickup_requests').update(patch).eq('id', id);
    if (error) throw error;
  },

  async pickupLocation(id, ll) {
    const { error } = await this.sb.from('pickup_requests').update({ driver_lat: ll[0], driver_lng: ll[1], driver_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  /* ---------- PESANAN & JEJAK LIMBAH ---------- */
  ORDER_SEL: '*, seller:profiles!orders_seller_id_fkey(nama, whatsapp, kecamatan, alamat), buyer:profiles!orders_buyer_id_fkey(nama, whatsapp, kecamatan, alamat), driver:profiles!orders_logistik_id_fkey(nama, whatsapp, plat, armada, kecamatan)',
  async myOrders() {
    const id = this.user.id;
    const { data, error } = await this.sb.from('orders').select(this.ORDER_SEL)
      .or(`seller_id.eq.${id},buyer_id.eq.${id},logistik_id.eq.${id}`).order('created_at', { ascending: false });
    if (error) throw error; return data;
  },
  async getOrder(id) {
    const { data, error } = await this.sb.from('orders').select(this.ORDER_SEL + ', events:order_events(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    if (data) data.events = (data.events || []).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return data;
  },
  async openOrders() {
    const { data, error } = await this.sb.from('orders').select(this.ORDER_SEL)
      .eq('status', 'dibayar').eq('metode_jemput', 'Mitra Logistik').is('logistik_id', null).order('created_at', { ascending: true });
    if (error) throw error; return data;
  },
  async updateOrder(id, patch) {
    const { data, error } = await this.sb.from('orders').update(patch).eq('id', id).select('id');
    if (error) throw error;
    if (!data || !data.length) throw new Error('Pesanan tidak bisa diperbarui (mungkin sudah diambil mitra lain)');
  },
  async takeOrder(id) {
    const { data, error } = await this.sb.from('orders').update({ logistik_id: this.user.id, status: 'dijemput' })
      .eq('id', id).is('logistik_id', null).select('id');
    if (error) throw error; return data && data.length > 0;
  },
  async orderLocation(id, ll) {
    const { error } = await this.sb.from('orders').update({ driver_lat: ll[0], driver_lng: ll[1], driver_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  /* ---------- ADMIN VERIFIKASI ---------- */
  async verifQueue(status) {
    const { data, error } = await this.sb.from('profiles')
      .select('id, role, nama, nib, email, whatsapp, kecamatan, alamat, jenis_usaha, jenis_olahan, plat, armada, dokumen_path, verif_status, verif_catatan, verif_at, ocr, created_at')
      .eq('verif_status', status).order('created_at', { ascending: true });
    if (error) throw error; return data;
  },
  async docUrl(path) {
    const { data, error } = await this.sb.storage.from('dokumen').createSignedUrl(path, 600);
    if (error) throw error; return data.signedUrl;
  },
  async setVerif(id, status, catatan) {
    const { data, error } = await this.sb.from('profiles').update({ verif_status: status, verif_catatan: catatan || null }).eq('id', id).select('id');
    if (error) throw error;
    if (!data || !data.length) throw new Error('Akses admin ditolak. Pastikan is_admin = true untuk akunmu');
  },

  /* ---------- NOTIFIKASI ---------- */
  async notifications() {
    const { data, error } = await this.sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error; return data;
  },
  async markAllRead() { await this.sb.from('notifications').update({ dibaca: true }).eq('user_id', this.user.id).eq('dibaca', false); }
};
