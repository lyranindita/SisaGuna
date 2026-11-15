/* =========================================================
   SisaGuna — pembuat file PDF & CSV (tanpa library tambahan)
   Semua dokumen dibuat langsung di browser lalu diunduh.
   ========================================================= */

/* ---------- 1. Penulis PDF sederhana (A4, font Helvetica) ---------- */
const HELV_W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const PDF_MAP = { '₂': '2', '–': '-', '—': '-', '…': '...', '≤': '<=', '≥': '>=', '★': '*', '→': '->', '←': '<-', '·': '·', '‘': "'", '’': "'", '“': '"', '”': '"', '•': '·', '✓': 'v', '✅': 'v' };
function pdfClean(s) {
  return String(s == null ? '' : s).replace(/[^\x00-\xff]/g, ch => PDF_MAP[ch] != null ? PDF_MAP[ch] : '');
}
class MiniPDF {
  constructor() { this.W = 595.28; this.H = 841.89; this.pages = []; this.addPage(); }
  addPage() { this.cur = []; this.pages.push(this.cur); return this; }
  width(str, size, bold) {
    let w = 0; for (const ch of pdfClean(str)) { const c = ch.charCodeAt(0); w += (c >= 32 && c <= 126 ? HELV_W[c - 32] : 556); }
    return w * size / 1000 * (bold ? 1.06 : 1);
  }
  color(c, op) { const [r, g, b] = c.map(v => (v / 255).toFixed(3)); return `${r} ${g} ${b} ${op}`; }
  /* teks; y diukur dari ATAS halaman */
  text(str, x, y, o = {}) {
    const size = o.size || 10, bold = !!o.bold, s = pdfClean(str);
    let xx = x; if (o.align === 'right') xx = x - this.width(s, size, bold); if (o.align === 'center') xx = x - this.width(s, size, bold) / 2;
    const esc = s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    this.cur.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${this.color(o.color || [15, 42, 74], 'rg')} ${xx.toFixed(2)} ${(this.H - y).toFixed(2)} Td (${esc}) Tj ET`);
    return this;
  }
  /* teks dengan pindah baris otomatis; mengembalikan y berikutnya */
  para(str, x, y, maxW, o = {}) {
    const size = o.size || 10, lh = o.lh || size * 1.45; let line = '';
    for (const word of pdfClean(str).split(/\s+/)) {
      const test = line ? line + ' ' + word : word;
      if (this.width(test, size, o.bold) > maxW && line) { this.text(line, x, y, o); y += lh; line = word; } else line = test;
    }
    if (line) { this.text(line, x, y, o); y += lh; }
    return y;
  }
  rect(x, y, w, h, o = {}) {
    const ops = [];
    if (o.fill) ops.push(this.color(o.fill, 'rg'));
    if (o.stroke) ops.push(this.color(o.stroke, 'RG'), `${o.lw || 1} w`);
    ops.push(`${x.toFixed(2)} ${(this.H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`, o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S');
    this.cur.push(ops.join(' ')); return this;
  }
  line(x1, y1, x2, y2, o = {}) { this.cur.push(`${this.color(o.color || [220, 231, 245], 'RG')} ${o.lw || 1} w ${x1.toFixed(2)} ${(this.H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H - y2).toFixed(2)} l S`); return this; }
  bytes() {
    const objs = []; const add = (s) => { objs.push(s); return objs.length; };
    const font1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const font2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pagesId = objs.length + 1; objs.push(null);
    const kids = [];
    for (const p of this.pages) {
      const content = p.join('\n');
      const cid = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${cid} 0 R >>`));
    }
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    const info = add(`<< /Producer (SisaGuna) /Title (${pdfClean(this.title || 'Dokumen SisaGuna').replace(/[()\\]/g, '')}) >>`);
    const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    let out = '%PDF-1.4\n%âãÏÓ\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const b = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255;
    return b;
  }
  save(filename) { downloadBlob(new Blob([this.bytes()], { type: 'application/pdf' }), filename); }
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => { const s = String(v == null ? '' : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename);
}

/* ---------- 2. Kerangka dokumen SisaGuna ---------- */
const C = { primary: [47, 128, 237], light: [232, 242, 254], text: [15, 42, 74], muted: [91, 112, 137], faint: [148, 166, 188], border: [220, 231, 245], tani: [34, 197, 94], taniL: [220, 252, 231], white: [255, 255, 255], bg: [245, 249, 255] };
const tglPanjang = (d = new Date()) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
function docBase(title, sub) {
  const d = new MiniPDF(); d.title = title;
  d.rect(0, 0, d.W, 96, { fill: C.primary });
  d.text('SisaGuna', 40, 42, { size: 22, bold: true, color: C.white });
  d.text('Marketplace B2B Daur Ulang Limbah Industri · Batang-Pekalongan', 40, 62, { size: 9, color: [232, 242, 254] });
  d.text(title, d.W - 40, 42, { size: 13, bold: true, color: C.white, align: 'right' });
  if (sub) d.text(sub, d.W - 40, 62, { size: 9, color: [232, 242, 254], align: 'right' });
  d.y = 126; return d;
}
function docFooter(d) {
  d.pages.forEach((p, i) => {
    d.cur = p;
    d.line(40, d.H - 46, d.W - 40, d.H - 46);
    d.text('Dokumen dibuat otomatis oleh SisaGuna pada ' + tglPanjang() + '.', 40, d.H - 30, { size: 8, color: C.faint });
    d.text(`Halaman ${i + 1} dari ${d.pages.length}`, d.W - 40, d.H - 30, { size: 8, color: C.faint, align: 'right' });
  });
  d.cur = d.pages[d.pages.length - 1];
}
function need(d, h) { if (d.y + h > d.H - 70) { d.addPage(); d.y = 50; } }
function heading(d, t) { need(d, 40); d.text(t, 40, d.y, { size: 13, bold: true }); d.y += 10; d.line(40, d.y, d.W - 40, d.y, { color: C.border }); d.y += 18; }
function kvList(d, rows) { rows.forEach(([k, v]) => { need(d, 18); d.text(k, 40, d.y, { size: 10, color: C.muted }); d.y = Math.max(d.para(v, 210, d.y, d.W - 250, { size: 10, bold: true }), d.y + 16); }); d.y += 6; }
function table(d, head, rows, widths, o = {}) {
  const x0 = 40, total = widths.reduce((a, b) => a + b, 0), scale = (d.W - 80) / total, ws = widths.map(w => w * scale);
  const drawHead = () => { d.rect(x0, d.y, d.W - 80, 24, { fill: C.light }); let x = x0; head.forEach((h, i) => { d.text(h, (o.right || []).includes(i) ? x + ws[i] - 8 : x + 8, d.y + 16, { size: 9, bold: true, color: C.primary, align: (o.right || []).includes(i) ? 'right' : 'left' }); x += ws[i]; }); d.y += 24; };
  need(d, 50); drawHead();
  rows.forEach((r, ri) => {
    if (d.y + 22 > d.H - 70) { d.addPage(); d.y = 50; drawHead(); }
    if (ri % 2) d.rect(x0, d.y, d.W - 80, 22, { fill: C.bg });
    let x = x0; r.forEach((c, i) => { const right = (o.right || []).includes(i); let s = pdfClean(c); while (d.width(s, 9) > ws[i] - 14 && s.length > 3) s = s.slice(0, -2); if (s !== pdfClean(c)) s = s.slice(0, -1) + '...';
      d.text(s, right ? x + ws[i] - 8 : x + 8, d.y + 15, { size: 9, align: right ? 'right' : 'left', bold: o.boldLast && i === r.length - 1 }); x += ws[i]; });
    d.y += 22;
  });
  d.line(x0, d.y, d.W - 40, d.y, { color: C.border }); d.y += 18;
}
function kpiBoxes(d, items) {
  need(d, 80); const w = (d.W - 80 - 12 * (items.length - 1)) / items.length;
  items.forEach(([v, k], i) => { const x = 40 + i * (w + 12); d.rect(x, d.y, w, 66, { fill: i === 0 ? C.taniL : C.bg }); d.text(v, x + 12, d.y + 30, { size: 17, bold: true, color: i === 0 ? [21, 128, 61] : C.text }); d.text(k, x + 12, d.y + 50, { size: 8.5, color: C.muted }); });
  d.y += 84;
}
function barChart(d, bars, hl) {
  need(d, 170); const x0 = 50, h = 120, w = d.W - 100, bw = w / bars.length;
  d.line(x0, d.y + h, x0 + w, d.y + h, { color: C.border });
  bars.forEach(([m, v], i) => { const bh = Math.max(2, h * v); const x = x0 + i * bw + bw * 0.2; d.rect(x, d.y + h - bh, bw * 0.6, bh, { fill: hl.includes(m) ? C.tani : [187, 247, 208] }); d.text(m, x + bw * 0.3, d.y + h + 14, { size: 8, color: C.muted, align: 'center' }); });
  d.y += h + 34;
}
const fname = (s) => pdfClean(s).replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

/* ---------- 3. Dokumen yang bisa diunduh ---------- */
const PDF_DOCS = {
  /* Laporan dampak / ESG sesuai periode yang sedang dibuka */
  dampak(periode = 'Bulan ini', judul) {
    const D = DAMPAK[periode] || DAMPAK['Bulan ini'], who = me();
    const d = docBase(judul || 'Laporan Dampak & ESG', 'Periode: ' + (judul ? judul.replace('Laporan Dampak ', '') : periode));
    kvList(d, [['Nama usaha', who.nama], ['Peran', ROLES[S.role].role], ['Lokasi', [who.alamat, who.kec].filter(Boolean).join(', ') || 'Batang-Pekalongan'], ['Tanggal laporan', tglPanjang()]]);
    heading(d, 'Ringkasan dampak');
    kpiBoxes(d, [[D.v[0] + ' ton', 'Limbah tersalurkan'], [D.v[1], 'CO2e dihindari'], [D.v[2], 'Pendapatan dari limbah'], [D.v[3], 'Mitra pengolah aktif']]);
    d.y = d.para(D.tr + '. Seluruh angka dihitung dari transaksi yang tercatat dan dibuktikan dengan foto timbangan serta manifest serah terima di SisaGuna.', 40, d.y, d.W - 80, { size: 10, color: C.muted }) + 8;
    heading(d, D.ttl);
    barChart(d, D.bars, D.hl);
    heading(d, 'Rincian per kategori limbah');
    table(d, ['Kategori', 'Volume', 'Porsi'], D.cat.map(([n, , v, l]) => [n, l, Math.round(v * 100) + '%']), [3, 2, 1.2], { right: [1, 2] });
    heading(d, 'Kesesuaian untuk pelaporan');
    d.y = d.para('Laporan ini dapat dilampirkan sebagai bukti pengelolaan limbah non-B3 untuk PROPER (KLHK) dan pelaporan keberlanjutan/ESG perusahaan. Setiap transaksi memiliki jejak digital: waktu penjemputan, berat aktual, identitas pengangkut, dan penerima.', 40, d.y, d.W - 80, { size: 10 });
    docFooter(d); d.save(`SisaGuna_${fname(judul || 'Laporan_ESG_' + periode)}.pdf`);
  },
  sertifikat() {
    const who = me(), d = new MiniPDF(); d.title = 'Sertifikat Mitra Sirkular 2026';
    d.rect(24, 24, d.W - 48, d.H - 48, { stroke: C.primary, lw: 3 });
    d.rect(34, 34, d.W - 68, d.H - 68, { stroke: [187, 247, 208], lw: 1 });
    d.rect(34, 34, d.W - 68, 120, { fill: C.light });
    d.text('SisaGuna', d.W / 2, 92, { size: 26, bold: true, color: C.primary, align: 'center' });
    d.text('Marketplace B2B Daur Ulang Limbah Industri · Batang-Pekalongan', d.W / 2, 116, { size: 10, color: C.muted, align: 'center' });
    d.text('SERTIFIKAT', d.W / 2, 240, { size: 34, bold: true, align: 'center' });
    d.text('MITRA SIRKULAR 2026', d.W / 2, 272, { size: 15, bold: true, color: C.tani, align: 'center' });
    d.text('Diberikan kepada', d.W / 2, 340, { size: 12, color: C.muted, align: 'center' });
    d.text(who.nama, d.W / 2, 384, { size: 24, bold: true, color: C.primary, align: 'center' });
    d.line(140, 400, d.W - 140, 400, { color: C.border });
    let y = d.para('atas kontribusinya menyalurkan limbah industri agar dapat diolah kembali, mendukung ekonomi sirkular, dan mengurangi limbah yang terbuang ke lingkungan di wilayah Batang-Pekalongan.', 110, 440, d.W - 220, { size: 11, lh: 18 });
    const T = DAMPAK['Tahun ini'], bw = (d.W - 220 - 12) / 2;
    [[T.v[0] + ' ton', 'Limbah tersalurkan 2026'], [T.v[1], 'CO2e dihindari 2026']].forEach(([v, k], i) => { const x = 110 + i * (bw + 12); d.rect(x, y + 20, bw, 62, { fill: i ? C.bg : C.taniL }); d.text(v, x + bw / 2, y + 50, { size: 18, bold: true, align: 'center', color: i ? C.text : [21, 128, 61] }); d.text(k, x + bw / 2, y + 70, { size: 9, color: C.muted, align: 'center' }); });
    d.text('Pekalongan, ' + tglPanjang(), d.W - 110, 690, { size: 10, align: 'right' });
    d.text('Tim SisaGuna', d.W - 110, 750, { size: 11, bold: true, align: 'right' });
    d.text('No. ' + 'SG-CERT-2026-' + (initials(who.nama) + String(Date.now()).slice(-5)), 110, 750, { size: 9, color: C.faint });
    d.save(`SisaGuna_Sertifikat_Mitra_Sirkular_2026_${fname(who.nama)}.pdf`);
  },
  /* Dokumen tender: RKS atau spesifikasi */
  tender(t, docName) {
    const isRKS = /^RKS/i.test(docName);
    const d = docBase(isRKS ? 'Rencana Kerja & Syarat (RKS)' : 'Spesifikasi Teknis', t.co.split(' · ')[0]);
    d.text(t.title, 40, d.y, { size: 16, bold: true }); d.y += 26;
    kvList(d, [['Pemberi tender', t.co], ['Volume', t.vol], ['Durasi kontrak', t.dur], ['Batas pendaftaran', t.batas], ['Peserta saat ini', t.peserta], ['Harga acuan', t.harga]]);
    heading(d, 'Lingkup pekerjaan'); d.y = d.para(t.d, 40, d.y, d.W - 80) + 6;
    if (isRKS) {
      heading(d, 'Syarat peserta');
      ['Memiliki izin usaha daur ulang / pengepul yang masih berlaku.', 'Memiliki armada truk minimal 4 ton atau bermitra dengan armada terverifikasi SisaGuna.', 'Bersedia membuat laporan serah terima bulanan (manifest) melalui SisaGuna.', 'Menggunakan timbangan terkalibrasi dan mengunggah foto timbangan setiap pengambilan.'].forEach((s, i) => { need(d, 18); d.y = d.para((i + 1) + '. ' + s, 40, d.y, d.W - 80); });
      d.y += 6; heading(d, 'Jadwal tender');
      table(d, ['Tahap', 'Waktu'], [['Pendaftaran & unggah penawaran', 'Sampai ' + t.batas], ['Evaluasi penawaran', '3 hari kerja setelah batas'], ['Pengumuman pemenang', 'Melalui notifikasi SisaGuna'], ['Penandatanganan kontrak digital', 'Maks. 5 hari setelah pengumuman']], [3, 2]);
      heading(d, 'Kriteria penilaian');
      table(d, ['Kriteria', 'Bobot'], [['Harga penawaran', '40%'], ['Kesiapan armada & jadwal', '25%'], ['Legalitas & rekam jejak', '20%'], ['Rencana pengolahan limbah', '15%']], [4, 1], { right: [1] });
    } else {
      heading(d, 'Spesifikasi material');
      const spec = { kardus: [['Kardus bekas (karton gelombang)', 'Kering, dilipat & diikat', '± 70%'], ['Palet kayu', 'Ukuran 1,2 x 1 m, sebagian rusak', '± 30%']], plastik: [['Plastik film LDPE', 'Dipres bal 50 kg, bersih dari label', '100%']] }[t.key] || [['Potongan besi plat', 'Tebal 2-12 mm', '± 60%'], ['Sisa pengelasan & gram', 'Dikumpulkan dalam drum', '± 40%']];
      table(d, ['Material', 'Kondisi', 'Porsi'], spec, [2.4, 3, 1], { right: [2] });
      heading(d, 'Ketentuan pengambilan');
      ['Pengambilan di gudang pemberi tender pada jam kerja (08.00-16.00).', 'Penimbangan dilakukan bersama dan difoto sebagai bukti.', 'Material bukan limbah B3; dilarang mencampur dengan limbah lain.'].forEach((s, i) => { d.y = d.para((i + 1) + '. ' + s, 40, d.y, d.W - 80); });
    }
    docFooter(d); d.save(docName);
  },
  /* Manifest serah terima kontrak */
  manifest(judul, mitra) {
    const d = docBase('Manifest Serah Terima', 'Kontrak: ' + mitra);
    d.text(judul, 40, d.y, { size: 15, bold: true }); d.y += 24;
    kvList(d, [['Pengangkut', me().nama], ['Pemberi limbah', mitra], ['Periode', 'Agustus - November 2026']]);
    heading(d, 'Riwayat pengambilan');
    table(d, ['Tanggal', 'Material', 'Berat', 'Penerima', 'Status'], [['5 Agu 2026', 'Kardus + palet', '1.940 kg', 'Daur Ulang Kandeman', 'Diterima'], ['2 Sep 2026', 'Kardus + palet', '2.080 kg', 'Daur Ulang Kandeman', 'Diterima'], ['7 Okt 2026', 'Kardus + palet', '2.010 kg', 'Daur Ulang Kandeman', 'Diterima'], ['4 Nov 2026', 'Kardus + palet', '1.965 kg', 'Daur Ulang Kandeman', 'Diterima']], [1.4, 1.6, 1.1, 2, 1.1], { right: [2] });
    kvList(d, [['Total tersalurkan', '7.995 kg'], ['Bukti', 'Foto timbangan & tanda tangan digital tersimpan di SisaGuna']]);
    docFooter(d); d.save(`Manifest_${fname(judul)}.pdf`);
  }
};
