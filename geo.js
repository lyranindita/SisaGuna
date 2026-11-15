/* =========================================================
   SisaGuna — peta sungguhan (Leaflet + OpenStreetMap)
   Peta bisa digeser & di-zoom. Jika internet/library peta
   gagal dimuat, otomatis memakai gambar peta sederhana.
   ========================================================= */

/* Koordinat perkiraan tempat-tempat di Batang–Pekalongan */
const GEO_PLACES = [
  [/klidang|tpi batang/i, [-6.8838, 109.7383]], [/kauman/i, [-6.8893, 109.6756]], [/pesindon/i, [-6.8885, 109.6700]],
  [/pelabuhan pekalongan|pekalongan utara/i, [-6.8590, 109.6880]], [/kit batang|kawasan industri terpadu|ketanggan/i, [-6.9420, 110.0230]],
  [/kandeman/i, [-6.9300, 109.7800]], [/subah/i, [-6.9890, 109.8860]], [/roban/i, [-6.9190, 109.9640]], [/bawang/i, [-7.0700, 109.9000]],
  [/blado|pagilaran/i, [-7.1050, 109.8200]], [/limpung/i, [-7.0300, 109.9200]], [/wonokerto/i, [-6.8600, 109.6000]], [/wiradesa/i, [-6.8930, 109.6200]],
  [/buaran/i, [-6.9200, 109.6500]], [/kedungwuni/i, [-6.9700, 109.6400]], [/gringsing/i, [-6.9500, 110.0300]], [/bandar/i, [-7.0200, 109.8000]],
  [/tulis/i, [-6.9200, 109.8400]], [/pekalongan barat/i, [-6.8900, 109.6600]], [/pekalongan timur/i, [-6.8900, 109.6900]],
  [/pekalongan selatan/i, [-6.9200, 109.6800]], [/maggot lestari/i, [-6.9300, 109.7400]], [/pekalongan/i, [-6.8890, 109.6750]], [/batang/i, [-6.9080, 109.7300]]
];
const GEO_CENTER = [-6.93, 109.80];
function hashStr(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
/* cari koordinat dari teks lokasi; seed membuat titik sedikit bergeser agar marker tidak menumpuk */
function placeLL(text, seed) {
  const hit = GEO_PLACES.find(([re]) => re.test(text || ''));
  const base = hit ? hit[1] : GEO_CENTER;
  if (seed == null) return base.slice();
  const h = hashStr(seed); return [base[0] + ((h % 100) / 100) * 0.006, base[1] + (((h >> 8) % 100) / 100) * 0.006];
}
function distKm(a, b) {
  const R = 6371, dLat = (b[0] - a[0]) * Math.PI / 180, dLng = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const fmtKm = (km) => km < 10 ? km.toFixed(1).replace('.', ',') + ' km' : Math.round(km) + ' km';

/* ---------- Pengelola peta ---------- */
const MAPS = {}; let mapSeq = 0;
const lmap = (type, h, attrs = '') => `<div class="lmap" data-map="${type}" style="height:${h}px" ${attrs}></div>`;
function cleanupMaps() { for (const k in MAPS) { const m = MAPS[k]; if (!document.body.contains(m.getContainer())) { try { m.remove(); } catch (e) {} delete MAPS[k]; } } }
function initMaps(root = document) {
  cleanupMaps();
  $$('.lmap[data-map]:not([data-ready])', root).forEach(el => {
    el.dataset.ready = '1';
    if (!window.L) { el.innerHTML = mapArt(parseInt(el.style.height) || 300, el.dataset.map === 'peta') + `<div class="map-offline">Peta interaktif butuh koneksi internet</div>`; return; }
    try { MAP_INIT[el.dataset.map](el); } catch (e) { console.error(e); }
  });
}
function baseMap(el, center, zoom = 12) {
  const m = L.map(el, { zoomControl: true, scrollWheelZoom: true, attributionControl: true }).setView(center, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  }).addTo(m);
  const id = 'm' + (++mapSeq); MAPS[id] = m; el._map = m;
  setTimeout(() => m.invalidateSize(), 120);
  return m;
}
const pinIcon = (color, icon, size = 36) => L.divIcon({ className: 'lpin-wrap', html: `<div class="lpin" style="background:var(--${color});width:${size}px;height:${size}px">${I(icon)}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2] });
const meIcon = () => L.divIcon({ className: 'lpin-wrap', html: '<div class="lme"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
function locateBtn(m, onFound) {
  const C = L.Control.extend({ options: { position: 'topright' }, onAdd() {
    const b = L.DomUtil.create('button', 'lmap-btn'); b.type = 'button'; b.innerHTML = I('target') + '<span>Lokasiku</span>'; b.title = 'Tampilkan lokasiku';
    L.DomEvent.disableClickPropagation(b);
    b.onclick = () => locateMe(ll => { m.setView(ll, 14); onFound && onFound(ll); });
    return b; } });
  m.addControl(new C());
}
function locateMe(cb) {
  if (!navigator.geolocation) { toast('Browser tidak mendukung lokasi'); return; }
  toast('Mencari lokasimu…');
  navigator.geolocation.getCurrentPosition(p => cb([p.coords.latitude, p.coords.longitude]),
    () => toast('Izin lokasi ditolak / tidak tersedia'), { enableHighAccuracy: true, timeout: 10000 });
}

/* ---------- Rute jalan (OSRM), cadangan garis lurus ---------- */
const ROUTE_CACHE = {};
async function getRoute(a, b) {
  const key = a.join() + '|' + b.join(); if (ROUTE_CACHE[key]) return ROUTE_CACHE[key];
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`);
    const j = await r.json(); const rt = j.routes && j.routes[0];
    if (rt) return (ROUTE_CACHE[key] = { pts: rt.geometry.coordinates.map(([x, y]) => [y, x]), km: rt.distance / 1000, min: rt.duration / 60 });
  } catch (e) { /* offline → garis lurus */ }
  const km = distKm(a, b); return { pts: [a, b], km, min: km / 30 * 60, straight: true };
}
function pointAlong(pts, t) {
  if (pts.length < 2) return pts[0]; t = Math.max(0, Math.min(1, t));
  const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = distKm(pts[i - 1], pts[i]); seg.push(d); tot += d; }
  let target = tot * t; for (let i = 0; i < seg.length; i++) { if (target <= seg[i]) { const f = seg[i] ? target / seg[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; } target -= seg[i]; }
  return pts[pts.length - 1];
}

/* ---------- Jenis-jenis peta ---------- */
const MAP_INIT = {
  /* Peta Limbah: semua listing */
  peta(el) {
    const m = baseMap(el, GEO_CENTER, 11); el._layer = L.featureGroup().addTo(m);
    locateBtn(m, ll => { S.myLL = ll; if (el._me) el._me.remove(); el._me = L.marker(ll, { icon: meIcon() }).addTo(m).bindPopup('<b>Kamu di sini</b>'); const p = $('#peta-panel'); if (p) p.innerHTML = petaPanel(); });
    petaMarkers(true);
  },
  /* Pilih titik (posting limbah / jemput cepat) */
  pick(el) {
    const tgt = el.dataset.target === 'jform' ? S.jform : S.draft;
    const P = me(); const start = tgt.lat ? [tgt.lat, tgt.lng] : placeLL([P.alamat, P.kec].join(' '));
    const m = baseMap(el, start, 14);
    const mk = L.marker(start, { draggable: true, icon: pinIcon('primary', 'pin', 40) }).addTo(m).bindTooltip('Geser untuk memindahkan titik', { direction: 'top', offset: [0, -18] });
    const set = (ll) => { tgt.lat = +ll[0].toFixed(6); tgt.lng = +ll[1].toFixed(6); mk.setLatLng(ll); const out = $(el.dataset.out || '#pick-ll'); if (out) out.textContent = `Titik dipilih: ${tgt.lat.toFixed(5)}, ${tgt.lng.toFixed(5)}`; };
    set(start);
    mk.on('dragend', () => { const p = mk.getLatLng(); set([p.lat, p.lng]); });
    m.on('click', (e) => set([e.latlng.lat, e.latlng.lng]));
    locateBtn(m, ll => set(ll));
  },
  /* Rute dari A ke B dengan posisi truk (logistik & jemput cepat) */
  async route(el) {
    const a = el.dataset.from.split(',').map(Number), b = el.dataset.to.split(',').map(Number);
    const m = baseMap(el, a, 13);
    L.marker(a, { icon: pinIcon(el.dataset.fromColor || 'ikan', el.dataset.fromIcon || 'fish') }).addTo(m).bindPopup(el.dataset.fromLabel || 'Titik jemput');
    L.marker(b, { icon: pinIcon(el.dataset.toColor || 'tani', el.dataset.toIcon || 'recycle') }).addTo(m).bindPopup(el.dataset.toLabel || 'Tujuan');
    m.fitBounds(L.latLngBounds([a, b]).pad(0.35));
    const r = await getRoute(a, b); if (!el.isConnected) return;
    el._route = r;
    L.polyline(r.pts, { color: '#2F80ED', weight: 5, opacity: .85, dashArray: r.straight ? '8 8' : null }).addTo(m);
    if (el.dataset.t != null && el.dataset.t !== '') el._truck = L.marker(pointAlong(r.pts, +el.dataset.t), { icon: pinIcon('primary', 'truck', 42), zIndexOffset: 500 }).addTo(m).bindPopup('Posisi armada');
    m.fitBounds(L.latLngBounds(r.pts).pad(0.2));
    const eta = el.dataset.eta && $(el.dataset.eta); if (eta) eta.textContent = `${fmtKm(r.km)} · ± ${Math.max(1, Math.round(r.min * (1 - (+el.dataset.t || 0))))} menit${r.straight ? ' (perkiraan)' : ''}`;
    if (el.dataset.gmaps) { const g = $(el.dataset.gmaps); if (g) g.href = `https://www.google.com/maps/dir/?api=1&origin=${a.join(',')}&destination=${b.join(',')}&travelmode=driving`; }
  }
};
/* marker Peta Limbah sesuai tab kategori */
function petaItems() {
  const src = DB.on && S.petaDB ? S.petaDB.map(r => ({ card: DB.toCard(r), ll: r.lat ? [r.lat, r.lng] : placeLL((r.lokasi || '') + ' ' + (r.kecamatan || ''), r.id), id: r.id }))
    : LISTINGS.map((l, i) => ({ card: l, ll: placeLL(l[2], 'demo' + i), idx: i }));
  return src.filter(x => S.petaTab === 'Semua' || x.card[0] === S.petaTab || (S.petaTab === 'Industri' && x.card[0] === 'Kawasan Industri'));
}
function petaMarkers(fit) {
  const el = $('.lmap[data-map="peta"]'); if (!el || !el._map) return;
  el._layer.clearLayers();
  const items = petaItems();
  items.forEach(x => { const [cat, j, loc, b, h] = x.card, c = CATS[cat] || CATS.Perikanan;
    L.marker(x.ll, { icon: pinIcon(c.key, c.icon) }).addTo(el._layer).bindPopup(`<div class="lpop"><span class="pill ${c.key}">${cat}</span><b>${j}</b><span>${loc}</span><span>${b} · <b class="c-primary">${h}</b></span><button class="btn btn-primary btn-sm" data-go="#/detail" ${x.id ? `data-lid="${x.id}"` : ''}>Lihat detail</button></div>`); });
  if (fit && items.length) el._map.fitBounds(el._layer.getBounds().pad(0.15));
}
