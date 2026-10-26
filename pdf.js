/* PDF export: builds a hyperlinked planner PDF (tabs, month/week/day pages, note-style pages)
   for apps like GoodNotes, Notability and Notes+. No dependencies. */
(() => {
'use strict';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SIZES = { a4: [595.28, 841.89], letter: [612, 792], tablet: [768, 1024] };
const STYLE = {
  blank: { step: 22, size: 12 }, lined: { step: 22, size: 12 }, dotted: { step: 20, size: 11 },
  grid: { step: 20, size: 11 }, cornell: { step: 22, size: 12 }, checklist: { step: 26, size: 12 },
  schedule: { step: 24, size: 11 },
};
let M = 36;             // left page margin (wider when the spiral binding is drawn)
const TOP = 52;         // below the tab strip
const BODY_TOP = 124;   // below title + nav row

const DEFAULTS = { look: 'elegant', font: 'auto', headFont: 'auto', titleFont: 'auto', size: 'a4', orient: 'portrait', useTheme: true, weekly: 'planner', daily: 'none', dailyLayout: 'planner', dailyStyle: 'dotted', notesStyle: 'lined', notesPages: 2, coverPage: true };

/* ---------- small helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return { y, m: m - 1, d }; };
const addDays = (k, n) => { const { y, m, d } = parseKey(k); const t = new Date(y, m, d + n); return dateKey(t.getFullYear(), t.getMonth(), t.getDate()); };
const todayKey = () => { const t = new Date(); return dateKey(t.getFullYear(), t.getMonth(), t.getDate()); };
const dowOf = k => { const { y, m, d } = parseKey(k); return new Date(y, m, d).getDay(); };
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
const shortDate = k => { const { m, d } = parseKey(k); return `${MONTHS[m].slice(0, 3)} ${d}`; };

const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round((v * (1 - t) + B[i] * t) * 255).toString(16).padStart(2, '0')).join(''); };
const rg = c => hex(c).map(v => v.toFixed(3)).join(' ');
const lum = c => { const [r, g, b] = hex(c); return 0.299 * r + 0.587 * g + 0.114 * b; };
const f = n => (Math.round(n * 100) / 100).toString();

/* Standard PDF fonts use WinAnsi (cp1252); anything else becomes '?'. */
const CP = { 0x20AC: 0x80, 0x201A: 0x82, 0x192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x2C6: 0x88, 0x2030: 0x89, 0x160: 0x8A, 0x2039: 0x8B, 0x152: 0x8C, 0x17D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2DC: 0x98, 0x2122: 0x99, 0x161: 0x9A, 0x203A: 0x9B, 0x153: 0x9C, 0x17E: 0x9E, 0x178: 0x9F };
function enc(s) {
  let o = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    let b = (c >= 32 && c < 0x7F) || (c >= 0xA0 && c <= 0xFF) ? c : CP[c] || (c === 9 ? 32 : 63);
    o += String.fromCharCode(b);
  }
  return o;
}
/* the text as the PDF will really show it: characters outside Windows-1252 become '?' */
const visibleText = s => { let o = ''; for (const ch of s) { const c = ch.codePointAt(0); o += (c >= 32 && c < 0x7F) || (c >= 0xA0 && c <= 0xFF) || CP[c] ? ch : c === 9 ? ' ' : '?'; } return o; };
const pdfStr = s => '(' + enc(s).replace(/[\\()]/g, m => '\\' + m) + ')';
const latin1 = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };

/* ---------- fonts ----------
   Built-in: the standard PDF fonts (nothing embedded). Embedded: bundled TrueType files in fonts/,
   lazy-loaded from fonts/<File>.js (base64) and embedded as Identity-H CID fonts. */
const BUILTIN = {
  helvetica: { base: 'Helvetica', bold: 'Helvetica-Bold', css: 'Helvetica, Arial, "Liberation Sans", sans-serif' },
  times:     { base: 'Times-Roman', bold: 'Times-Bold', css: '"Times New Roman", Times, "Liberation Serif", serif' },
  courier:   { base: 'Courier', bold: 'Courier-Bold', css: '"Courier New", Courier, "Liberation Mono", monospace' },
};
const EMBEDDED = {
  caveat: 'Caveat', patrickhand: 'PatrickHand', indieflower: 'IndieFlower', specialelite: 'SpecialElite',
  lora: 'Lora', merriweather: 'Merriweather', playfair: 'PlayfairDisplay', quicksand: 'Quicksand',
  greatvibes: 'GreatVibes', cormorant: 'CormorantGaramond', cormorantitalic: 'CormorantGaramondItalic',
};
/* optical size correction so small-x-height faces stay legible at the same nominal size */
const SCALE = { caveat: 1.22, indieflower: 1.08, patrickhand: 1.05, quicksand: 1.0, cormorant: 1.1, cormorantitalic: 1.1 };
const AUTO_FONT = {
  georgia: 'times', 'times new roman': 'times', 'palatino linotype': 'times', lora: 'lora', merriweather: 'merriweather',
  'playfair display': 'playfair', quicksand: 'quicksand', caveat: 'caveat', 'segoe print': 'caveat', 'patrick hand': 'patrickhand',
  'indie flower': 'indieflower', 'special elite': 'specialelite', 'ui-monospace': 'courier', 'great vibes': 'greatvibes', 'cormorant garamond': 'cormorant',
};
const autoFont = css => AUTO_FONT[(css || '').split(',')[0].trim().replace(/["']/g, '').toLowerCase()] || 'helvetica';
const isKey = k => BUILTIN[k] || EMBEDDED[k];
const resolveFont = (state, o) => isKey(o.font) ? o.font : autoFont(state.theme.font);
/* heading font = the face used for bold text (titles, labels, buttons); null means "bold version of the body font" */
function resolveHead(state, o) {
  const body = resolveFont(state, o);
  const h = o.headFont === 'same' ? null : isKey(o.headFont) ? o.headFont : state.theme.headFont ? autoFont(state.theme.headFont) : null;
  return h && h !== body ? h : null;
}
/* title font = big page titles (a script face in the elegant look); legend font = small italic box labels */
function resolveTitle(state, o) {
  const t = o.titleFont === 'same' ? null : isKey(o.titleFont) ? o.titleFont : state.theme.titleFont ? autoFont(state.theme.titleFont) : o.look === 'elegant' ? 'greatvibes' : null;
  return t && t !== resolveFont(state, o) ? t : null;
}
const resolveLegend = (state, o) => o.look === 'elegant' && resolveFont(state, o) === 'cormorant' ? 'cormorantitalic' : null;
const fontKeys = (state, o) => [...new Set([resolveFont(state, o), resolveHead(state, o), resolveTitle(state, o), resolveLegend(state, o)].filter(Boolean))];

const REV = Object.fromEntries(Object.entries(CP).map(([u, b]) => [b, +u]));
const loaded = {};                       // key -> parsed TrueType font
const loading = new Map();

function parseTTF(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), T = {};
  for (let i = 0, n = dv.getUint16(4); i < n; i++) {
    const o = 12 + i * 16;
    T[String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3])] = dv.getUint32(o + 8);
  }
  const head = T.head, hhea = T.hhea, hmtx = T.hmtx, cm = T.cmap;
  const upm = dv.getUint16(head + 18), nh = dv.getUint16(hhea + 34);
  let sub = -1, best = -1;
  for (let i = 0, n = dv.getUint16(cm + 2); i < n; i++) {
    const pid = dv.getUint16(cm + 4 + i * 8), eid = dv.getUint16(cm + 6 + i * 8), so = cm + dv.getUint32(cm + 8 + i * 8), fmt = dv.getUint16(so);
    const score = pid === 3 && eid === 10 && fmt === 12 ? 4 : pid === 3 && eid === 1 && fmt === 4 ? 3 : pid === 0 && (fmt === 4 || fmt === 12) ? 2 : 0;
    if (score > best) { best = score; sub = so; }
  }
  const fmt = dv.getUint16(sub);
  const glyph = cp => {
    if (fmt === 12) {
      for (let g = 0, n = dv.getUint32(sub + 12); g < n; g++) {
        const o = sub + 16 + g * 12, s = dv.getUint32(o), e = dv.getUint32(o + 4);
        if (cp >= s && cp <= e) return dv.getUint32(o + 8) + cp - s;
      }
      return 0;
    }
    if (cp > 0xFFFF) return 0;
    const segX2 = dv.getUint16(sub + 6), end = sub + 14, start = end + segX2 + 2, delta = start + segX2, ro = delta + segX2;
    for (let i = 0; i < segX2 / 2; i++) {
      if (cp > dv.getUint16(end + 2 * i)) continue;
      if (cp < dv.getUint16(start + 2 * i)) return 0;
      const d = dv.getInt16(delta + 2 * i), r = dv.getUint16(ro + 2 * i);
      if (r === 0) return (cp + d) & 0xFFFF;
      const g = dv.getUint16(ro + 2 * i + r + 2 * (cp - dv.getUint16(start + 2 * i)));
      return g === 0 ? 0 : (g + d) & 0xFFFF;
    }
    return 0;
  };
  return {
    bytes: u8, upm, ascent: dv.getInt16(hhea + 4), descent: dv.getInt16(hhea + 6),
    bbox: [dv.getInt16(head + 36), dv.getInt16(head + 38), dv.getInt16(head + 40), dv.getInt16(head + 42)],
    adv: g => dv.getUint16(hmtx + 4 * Math.min(g, nh - 1)),
    glyph, used: new Map(),
  };
}
function loadFont(key) {
  if (!EMBEDDED[key] || loaded[key]) return Promise.resolve();
  if (!loading.has(key)) loading.set(key, new Promise((resolve, reject) => {
    const file = EMBEDDED[key], done = () => {
      const bin = atob(window.JournalFontData[file]), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      loaded[key] = parseTTF(u8); resolve();
    };
    if (window.JournalFontData && window.JournalFontData[file]) return done();
    const s = document.createElement('script');
    s.src = `fonts/${file}.js`; s.onload = done;
    s.onerror = () => { loading.delete(key); reject(new Error(`Could not load font file fonts/${file}.js`)); };
    document.head.appendChild(s);
  }));
  return loading.get(key);
}
let curBody = 'helvetica', curHead = null, curTitle = null, curLegend = null;
const faceFor = (bold, role) => role === 'title' && curTitle ? curTitle : role === 'legend' && curLegend ? curLegend : (bold && curHead) || curBody;     // font key used for a piece of text
const emb = key => loaded[key] || null;
/* glyph ids for a string; unsupported characters fall back to '?' */
function gidsOf(F, s) {
  const e = enc(s), out = [];
  for (let i = 0; i < e.length; i++) {
    const b = e.charCodeAt(i); let u = b >= 0x80 && b < 0xA0 ? REV[b] || 63 : b, g = F.glyph(u);
    if (!g) { u = 63; g = F.glyph(63); }
    if (g) F.used.set(g, u);
    out.push(g);
  }
  return out;
}

let measureCtx; const mcache = new Map();
function tw(s, size, bold, role) {
  const key = faceFor(bold, role), F = emb(key), fake = bold && !curHead && !role;
  if (F) {
    let sum = 0; for (const g of gidsOf(F, s)) sum += F.adv(g);
    return sum / F.upm * size * (SCALE[key] || 1) * (fake ? 1.04 : 1);
  }
  const fam = BUILTIN[key] || BUILTIN.helvetica, k = (BUILTIN[key] ? key : 'helvetica') + (bold ? 'b' : 'r') + s;
  let w = mcache.get(k);
  if (w === undefined) {
    measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
    measureCtx.font = (bold ? 'bold ' : '') + '100px ' + fam.css;
    w = measureCtx.measureText(enc(s)).width / 100;
    mcache.set(k, w);
  }
  return w * size;
}
/* width of text drawn with character spacing cs */
const twc = (s, size, bold, role, cs) => tw(s, size, bold, role) + (cs || 0) * [...s].length;
function fit(s, size, maxW, bold) {
  if (tw(s, size, bold) <= maxW) return s;
  while (s.length > 1 && tw(s + '.', size, bold) > maxW) s = s.slice(0, -1);
  return s + '.';
}

/* [[link]] aware word wrapping. Returns lines of {t, link, x, w}. */
function parseRich(text) {
  const runs = []; let last = 0;
  text.replace(/\[\[([^\]\n]+)\]\]/g, (m, t, i) => {
    if (i > last) runs.push({ t: text.slice(last, i) });
    runs.push({ t: t.trim(), link: t.trim() }); last = i + m.length; return m;
  });
  if (last < text.length) runs.push({ t: text.slice(last) });
  return runs;
}
function wrapRich(text, width, size) {
  const lines = [], sp = tw(' ', size);
  for (const para of text.split('\n')) {
    let line = [], x = 0;
    for (const run of parseRich(para)) {
      for (let word of run.t.split(/\s+/).filter(Boolean)) {
        while (tw(word, size) > width && word.length > 1) {           // break very long words
          let n = word.length - 1; while (n > 1 && tw(word.slice(0, n), size) > width) n--;
          if (line.length) { lines.push(line); line = []; x = 0; }
          lines.push([{ t: word.slice(0, n), link: run.link, x: 0, w: tw(word.slice(0, n), size) }]);
          word = word.slice(n);
        }
        const w = tw(word, size);
        if (line.length && x + sp + w > width) { lines.push(line); line = []; x = 0; }
        const gap = line.length ? sp : 0;
        line.push({ t: word, link: run.link, x: x + gap, w }); x += gap + w;
      }
    }
    lines.push(line);
  }
  return lines;
}

/* ---------- page canvas (top-left origin) ---------- */
/* fonts actually used by the pages being drawn: resource name -> font */
let fontReg = new Map();
function fontRes(key, bold) {
  const id = key + (BUILTIN[key] && bold ? '|b' : '');
  let r = fontReg.get(id);
  if (!r) { r = { name: 'F' + (fontReg.size + 1), key, bold: !!(BUILTIN[key] && bold) }; fontReg.set(id, r); }
  return r.name;
}

class Pg {
  /* ops = the PDF content stream; vec = the same drawing as plain data, used to paint the on-screen preview */
  constructor(W, H) { this.W = W; this.H = H; this.ops = []; this.links = []; this.vec = []; }
  rect(x, y, w, h, fill, stroke, lw) {
    const r = this.soft && w >= 14 && h >= 14 && w < this.W - 1 ? Math.min(7, h / 4, w / 4) : 0;
    if (r) {                                                       // soft look: rounded corners + a faint drop shadow on filled cards
      if (fill && w > 40 && h > 24 && this.shadow) this.rrect(x + 1, y + 2, w, h, r, this.shadow, null);
      this.rrect(x, y, w, h, r, fill, stroke, lw); return;
    }
    this.vec.push(['rect', x, y, w, h, fill || null, stroke || null, lw || 0.6]);
    let o = '';
    if (fill) o += rg(fill) + ' rg ';
    if (stroke) o += rg(stroke) + ' RG ' + (lw || 0.6) + ' w ';
    this.ops.push(`${o}${f(x)} ${f(this.H - y - h)} ${f(w)} ${f(h)} re ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
  }
  rrect(x, y, w, h, r, fill, stroke, lw) {
    this.vec.push(['rrect', x, y, w, h, r, fill || null, stroke || null, lw || 0.6]);
    const k = 0.5523 * r, x0 = x, x1 = x + w, y0 = this.H - y - h, y1 = this.H - y, n = v => f(v);
    let o = '';
    if (fill) o += rg(fill) + ' rg ';
    if (stroke) o += rg(stroke) + ' RG ' + (lw || 0.6) + ' w ';
    this.ops.push(`${o}${n(x0 + r)} ${n(y0)} m ${n(x1 - r)} ${n(y0)} l ${n(x1 - r + k)} ${n(y0)} ${n(x1)} ${n(y0 + r - k)} ${n(x1)} ${n(y0 + r)} c ${n(x1)} ${n(y1 - r)} l ${n(x1)} ${n(y1 - r + k)} ${n(x1 - r + k)} ${n(y1)} ${n(x1 - r)} ${n(y1)} c ${n(x0 + r)} ${n(y1)} l ${n(x0 + r - k)} ${n(y1)} ${n(x0)} ${n(y1 - r + k)} ${n(x0)} ${n(y1 - r)} c ${n(x0)} ${n(y0 + r)} l ${n(x0)} ${n(y0 + r - k)} ${n(x0 + r - k)} ${n(y0)} ${n(x0 + r)} ${n(y0)} c h ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
  }
  fillRect(x, y, w, h, fill) { this.vec.push(['rect', x, y, w, h, fill, null, 0]); this.ops.push(`${rg(fill)} rg ${f(x)} ${f(this.H - y - h)} ${f(w)} ${f(h)} re f`); }
  strokeRect(x, y, w, h, stroke, lw) { this.vec.push(['rect', x, y, w, h, null, stroke, lw || 0.5]); this.ops.push(`${rg(stroke)} RG ${lw || 0.5} w ${f(x)} ${f(this.H - y - h)} ${f(w)} ${f(h)} re S`); }
  poly(pts, fill) {
    this.vec.push(['poly', pts, fill]);
    this.ops.push(`${rg(fill)} rg ` + pts.map(([x, y], i) => `${f(x)} ${f(this.H - y)} ${i ? 'l' : 'm'}`).join(' ') + ' h f');
  }
  polyline(pts, stroke, lw, closed) {
    this.vec.push(['polyline', pts, stroke, lw || 0.5, !!closed]);
    this.ops.push(`${rg(stroke)} RG ${lw || 0.5} w 1 j 1 J ` + pts.map(([x, y], i) => `${f(x)} ${f(this.H - y)} ${i ? 'l' : 'm'}`).join(' ') + (closed ? ' s' : ' S'));
  }
  circleStroke(cx, cy, r, stroke, lw) {
    const n = 20, pts = Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i * 2 * Math.PI / n), cy + r * Math.sin(i * 2 * Math.PI / n)]);
    this.polyline(pts, stroke, lw, true);
  }
  dashed(x1, y, x2, c, lw, on, off) {
    this.vec.push(['dashed', x1, y, x2, c, lw || 0.5, on, off]);
    this.ops.push(`q ${rg(c)} RG ${lw || 0.5} w 1 J [${on} ${off}] 0 d ${f(x1)} ${f(this.H - y)} m ${f(x2)} ${f(this.H - y)} l S Q`);
  }
  circle(cx, cy, r, fill) {
    this.vec.push(['circle', cx, cy, r, fill]);
    const k = 0.5523 * r, X = cx, Y = this.H - cy;
    this.ops.push(`${rg(fill)} rg ${f(X + r)} ${f(Y)} m ${f(X + r)} ${f(Y + k)} ${f(X + k)} ${f(Y + r)} ${f(X)} ${f(Y + r)} c ${f(X - k)} ${f(Y + r)} ${f(X - r)} ${f(Y + k)} ${f(X - r)} ${f(Y)} c ${f(X - r)} ${f(Y - k)} ${f(X - k)} ${f(Y - r)} ${f(X)} ${f(Y - r)} c ${f(X + k)} ${f(Y - r)} ${f(X + r)} ${f(Y - k)} ${f(X + r)} ${f(Y)} c f`);
  }
  /* washi tape: a rotated strip with diagonal stripes */
  tape(cx, cy, w, h, deg, c1, c2) {
    this.vec.push(['tape', cx, cy, w, h, deg, c1, c2]);
    const a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), o = [];
    o.push(`q ${f(co)} ${f(-si)} ${f(si)} ${f(co)} ${f(cx)} ${f(this.H - cy)} cm`);
    o.push(`${rg(c1)} rg ${f(-w / 2)} ${f(-h / 2)} ${f(w)} ${f(h)} re f`);
    o.push(`${f(-w / 2)} ${f(-h / 2)} ${f(w)} ${f(h)} re W n ${rg(c2)} RG 3 w`);
    for (let x = -w / 2 - h; x < w / 2; x += 9) o.push(`${f(x)} ${f(-h / 2)} m ${f(x + h)} ${f(h / 2)} l S`);
    o.push('Q');
    this.ops.push(o.join(' '));
  }
  line(x1, y1, x2, y2, c, lw) { this.vec.push(['line', x1, y1, x2, y2, c, lw || 0.5]); this.ops.push(`${rg(c)} RG ${lw || 0.5} w ${f(x1)} ${f(this.H - y1)} m ${f(x2)} ${f(this.H - y2)} l S`); }
  dots(x, y, w, h, step, c) {
    this.vec.push(['dots', x, y, w, h, step, c]);
    this.ops.push(`q ${rg(c)} RG 1.4 w 1 J [0 ${step}] 0 d`);
    for (let yy = y; yy <= y + h + 0.1; yy += step) this.ops.push(`${f(x)} ${f(this.H - yy)} m ${f(x + w)} ${f(this.H - yy)} l S`);
    this.ops.push('Q');
  }
  text(x, y, s, size, color, bold, rot, role, cs) {
    const key = faceFor(bold, role), F = emb(key), tm = `${cs ? f(cs) + ' Tc ' : ''}${rot ? '0 -1 1 0' : '1 0 0 1'} ${f(x)} ${f(this.H - y)} Tm`;
    this.vec.push(['text', x, y, visibleText(s), F ? size * (SCALE[key] || 1) : size, color, key, !!bold, !!rot, cs || 0, !!(F && bold && !curHead && !role)]);
    if (F) {                                   // embedded CID font: hex glyph ids; faux bold (stroke) only when there is no heading font
      const hexs = gidsOf(F, s).map(g => g.toString(16).padStart(4, '0')).join(''), fake = bold && !curHead && !role;
      this.ops.push(`q ${fake ? `${rg(color)} RG ${f(size * 0.03)} w 2 Tr ` : ''}BT /${fontRes(key, false)} ${f(size * (SCALE[key] || 1))} Tf ${rg(color)} rg ${tm} <${hexs}> Tj ET Q`);
    } else this.ops.push(`BT /${fontRes(BUILTIN[key] ? key : 'helvetica', bold)} ${size} Tf ${rg(color)} rg ${tm} ${pdfStr(s)} Tj ET`);
  }
  link(x, y, w, h, key) { if (key) this.links.push({ x, y, w, h, key }); }
}

/* ---------- the document session: plan pages, then draw them ---------- */
function session(state, optsIn) {
  const o = { ...DEFAULTS, ...optsIn };
  const fontKey = resolveFont(state, o), headKey = resolveHead(state, o), titleKey = resolveTitle(state, o), legendKey = resolveLegend(state, o);
  curBody = fontKey; curHead = headKey; curTitle = titleKey; curLegend = legendKey;
  const [bw, bh] = SIZES[o.size] || SIZES.a4;
  const W = o.orient === 'landscape' ? bh : bw, H = o.orient === 'landscape' ? bw : bh;
  const th = state.theme;
  const C = o.useTheme
    ? { paper: th.paper, ink: th.ink, accent: th.accent, today: th.today }
    : { paper: '#ffffff', ink: '#222222', accent: th.accent, today: '#fff1b8' };
  C.muted = mix(C.ink, C.paper, 0.45); C.line = mix(C.paper, C.ink, 0.2); C.faint = mix(C.paper, C.ink, 0.1);
  C.dot = mix(C.paper, C.ink, 0.38);
  const today = todayKey();
  const ELEG = o.look === 'elegant', SOFT = o.look === 'soft', ROUNDED = ELEG || SOFT;
  M = ELEG ? 58 : 36;
  const TABCOL = ELEG ? 30 : SOFT ? 14 : 0, R = W - 36 - TABCOL, CW = R - M;
  C.card = lum(C.paper) > 0.5 ? mix(C.paper, '#ffffff', 0.7) : mix(C.paper, '#ffffff', 0.06);
  C.tint = mix(C.accent, C.paper, 0.84); C.mat = mix(C.accent, C.paper, 0.9); C.shadow = mix(C.paper, C.ink, 0.13);
  C.gold = C.accent; C.goldSoft = mix(C.accent, C.paper, 0.5);
  C.cell = lum(C.paper) > 0.5 ? mix(C.accent, C.paper, 0.78) : mix(C.paper, '#ffffff', 0.1);
  C.legend = lum(C.paper) > 0.5 ? mix(C.accent, C.ink, 0.5) : mix(C.accent, '#ffffff', 0.25);
  C.titleC = lum(C.paper) > 0.5 ? mix(C.accent, C.ink, 0.3) : C.accent;
  C.coil = mix(C.accent, C.ink, 0.2); C.hole = mix(C.paper, C.ink, 0.55); C.bind = mix(C.paper, C.ink, 0.06);
  let tabColor = C.accent;
  const weekStartOf = k => addDays(k, -((dowOf(k) - state.weekStart + 7) % 7));

  /* ----- note-style layout (shared by planning and drawing) ----- */
  function styleLayout(style, x, y, w, h) {
    const S = STYLE[style] || STYLE.lined;
    let tx = x, tww = w, ty1 = y + h, cue = 0;
    if (style === 'cornell') { cue = Math.round(w * 0.28); tx = x + cue + 10; tww = w - cue - 10; ty1 = y + h - Math.round(h * 0.16); }
    if (style === 'checklist') { tx = x + 20; tww = w - 20; }
    return { tx, tw: tww, ty0: y, ty1, step: S.step, size: S.size, cue };
  }
  function drawStyleBg(pg, style, x, y, w, h) {
    const L = styleLayout(style, x, y, w, h), rows = Math.floor((L.ty1 - L.ty0) / L.step);
    if (style === 'lined' || style === 'cornell') {
      const lx = style === 'cornell' ? x + L.cue : x;
      for (let i = 1; i <= rows; i++) pg.line(lx, L.ty0 + i * L.step, x + w, L.ty0 + i * L.step, C.line, 0.6);
      if (style === 'cornell') {
        pg.line(x + L.cue, y, x + L.cue, L.ty1, C.muted, 0.8); pg.line(x, L.ty1, x + w, L.ty1, C.muted, 0.8);
        pg.text(x + 4, y + 11, 'Cues', 8, C.muted, true); pg.text(x + L.cue + 14, y + 11, 'Notes', 8, C.muted, true); pg.text(x + 4, L.ty1 + 12, 'Summary', 8, C.muted, true);
      }
    } else if (style === 'dotted') pg.dots(x, y + L.step, w, h - L.step, L.step, C.dot);
    else if (style === 'grid') {
      for (let xx = x; xx <= x + w + 0.1; xx += L.step) pg.line(xx, y, xx, y + Math.floor(h / L.step) * L.step, C.line, 0.4);
      for (let yy = y; yy <= y + h + 0.1; yy += L.step) pg.line(x, yy, x + w, yy, C.line, 0.4);
    } else if (style === 'checklist') {
      for (let i = 1; i <= rows; i++) { const yy = L.ty0 + i * L.step; pg.line(x + 20, yy, x + w, yy, C.line, 0.6); pg.rrect(x, yy - 13, 11, 11, ROUNDED ? 3 : 0, null, C.muted, 0.7); }
    } else if (style === 'schedule') {
      const hrs = 16, rh = Math.min(30, h / hrs), half = Math.round(w * 0.5) - 8;
      for (let i = 0; i < hrs; i++) {
        const hr = 6 + i, yy = y + (i + 1) * rh;
        pg.line(x + 36, yy, x + half, yy, C.line, 0.6);
        pg.text(x, yy - 4, `${hr % 12 || 12} ${hr < 12 ? 'AM' : 'PM'}`, 8, C.muted);
      }
      pg.text(x + half + 20, y + 10, 'To-do', 9, C.muted, true);
      for (let yy = y + 36, n = 0; yy < y + h && n < 20; yy += 26, n++) { pg.line(x + half + 38, yy, x + w, yy, C.line, 0.6); pg.rrect(x + half + 20, yy - 12, 11, 11, ROUNDED ? 3 : 0, null, C.muted, 0.7); }
    }
  }

  /* ----- planning ----- */
  const specs = [], first = new Map();
  const add = (spec, keys) => { spec.i = specs.length; specs.push(spec); (keys || []).forEach(k => { if (!first.has(k)) first.set(k, spec.i); }); };
  const wantDay = k => o.daily === 'all' || (o.daily === 'entries' && state.days[k]);
  const doneWeeks = new Set();
  const notesBox = ELEG ? { x: M + 12, y: BODY_TOP + 2, w: CW - 24, h: H - 36 - BODY_TOP - 24 } : { x: M, y: BODY_TOP - 14, w: CW, h: H - 36 - (BODY_TOP - 14) };
  const monthWeeks = new Map();
  const cover = o.coverPage !== false && state.cover && window.JournalCovers && JournalCovers.list.find(c => c.id === state.cover);
  if (cover) add({ type: 'cover', cover }, ['cover']);

  for (const tab of state.tabs) {
    const tk = 'tab:' + tab.id;
    if (tab.kind === 'index' || tab.kind === 'year') add({ type: tab.kind, tab }, [tk]);
    else if (tab.kind === 'month') {
      add({ type: 'month', tab }, [tk]);
      for (let d = 1; d <= daysIn(tab.year, tab.month); d++) {
        const k = dateKey(tab.year, tab.month, d), ws = weekStartOf(k);
        if (o.weekly !== 'none' && !doneWeeks.has(ws)) { doneWeeks.add(ws); add({ type: 'week', tab, ws }, ['week:' + ws]); if (!monthWeeks.has(tab.id)) monthWeeks.set(tab.id, []); monthWeeks.get(tab.id).push(ws); }
        if (wantDay(k)) add({ type: 'day', tab, date: k }, ['day:' + k]);
      }
    } else {
      const L = styleLayout(o.notesStyle, notesBox.x, notesBox.y, notesBox.w, notesBox.h);
      const lines = wrapRich(state.notes[tab.id] || '', L.tw, L.size);
      const cap = Math.max(1, Math.floor((L.ty1 - L.ty0) / L.step));
      const count = Math.max(o.notesPages, Math.ceil(lines.length / cap), 1);
      for (let p = 0; p < count; p++) add({ type: 'notes', tab, part: p, count, lines: lines.slice(p * cap, (p + 1) * cap) }, p === 0 ? [tk] : []);
    }
  }

  const dayTarget = k => first.has('day:' + k) ? 'day:' + k : first.has('week:' + weekStartOf(k)) ? 'week:' + weekStartOf(k) : null;
  const linkTarget = raw => {
    const t = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return dayTarget(t);
    if (t.toLowerCase() === 'today') return dayTarget(today);
    const tab = state.tabs.find(x => x.name.toLowerCase() === t.toLowerCase());
    return tab && first.has('tab:' + tab.id) ? 'tab:' + tab.id : null;
  };

  /* ----- drawing helpers ----- */
  function drawRich(pg, lines, x, y0, step, size, maxLines) {
    lines.slice(0, maxLines).forEach((ln, i) => {
      const y = y0 + i * step;
      for (const wd of ln) {
        const key = wd.link ? linkTarget(wd.link) : null;
        pg.text(x + wd.x, y, wd.t, size, key ? C.accent : C.ink);
        if (key) { pg.line(x + wd.x, y + 1.6, x + wd.x + wd.w, y + 1.6, C.accent, 0.6); pg.link(x + wd.x, y - size, wd.w, size + 4, key); }
      }
    });
  }
  function chrome(pg, activeTab, spec) {
    if (ELEG) return chromeElegant(pg, activeTab, spec);
    tabColor = activeTab ? activeTab.color : C.accent;
    if (!SOFT) {
      pg.rect(0, 0, W, H, C.paper);
      const n = state.tabs.length, gap = 3, tabW = Math.min(96, (W - 2 * M - (n - 1) * gap) / Math.max(n, 1));
      const fs = tabW < 40 ? 6.5 : tabW < 58 ? 8 : 9.5;
      state.tabs.forEach((t, i) => {
        const x = M + i * (tabW + gap), act = activeTab && t.id === activeTab.id, y = act ? 8 : 15, h = act ? 28 : 21;
        pg.rect(x, y, tabW, h, t.color);
        const label = fit(t.name, fs, tabW - 4, act);
        pg.text(x + (tabW - tw(label, fs, act)) / 2, y + h / 2 + fs * 0.35, label, fs, lum(t.color) > 0.62 ? '#222222' : '#ffffff', act);
        pg.link(x, y, tabW, h, 'tab:' + t.id);
      });
      pg.rect(M, 36, W - 2 * M, 2.5, tabColor);
      return;
    }
    // soft planner: tinted mat, rounded page card, tabs down the right edge
    pg.rect(0, 0, W, H, C.mat);
    pg.rrect(15.5, 16.5, W - 48, H - 28, 16, C.shadow, null);
    pg.rrect(14, 14, W - 48, H - 28, 16, C.paper, mix(C.paper, C.ink, 0.14), 0.8);
    const n = state.tabs.length, top = 26, area = H - 2 * top, gap = 5, th = Math.min(92, (area - (n - 1) * gap) / Math.max(n, 1));
    const fs = th < 40 ? 6.5 : th < 56 ? 8 : 9.5;
    state.tabs.forEach((t, i) => {
      const act = activeTab && t.id === activeTab.id, y = top + i * (th + gap), x = act ? W - 40 : W - 32, w = act ? 48 : 40;
      pg.rrect(x, y, w, th, 8, t.color, null);
      const label = fit(t.name, fs, th - 8, act), lw = tw(label, fs, act);
      pg.text(x + (act ? 9 : 5) + 3 + 0.5 * (26 - fs * 0.7), y + (th - lw) / 2, label, fs, lum(t.color) > 0.62 ? '#222222' : '#ffffff', act, true);
      pg.link(x, y, Math.min(w, W - x), th, 'tab:' + t.id);
    });
  }
  function title(pg, text, sub) {
    if (ELEG) return titleElegant(pg, text, sub);
    if (!SOFT) {
      pg.text(M, 72, fit(text, 22, CW, true), 22, C.ink, true);
      if (sub) pg.text(M, 87, sub, 10, C.muted);
      return;
    }
    pg.rect(M, 46, CW, 46, C.tint, null);
    pg.text(M + 16, sub ? 69 : 75, fit(text, 22, CW - 130, true), 22, C.ink, true);
    if (sub) pg.text(M + 16, 84, fit(sub, 8.5, CW - 130), 8.5, C.muted);
    pg.tape(M + CW - 52, 49, 92, 19, 7, mix(tabColor, C.paper, 0.45), mix(tabColor, C.paper, 0.25));
  }
  function navBar(pg, left, right) {
    const y = 94, h = 18, wid = it => (ELEG ? tw(it.label, 8.5, false, 'legend') : tw(it.label, 9, true)) + 16;
    const place = (it, x) => { if (ELEG) { pg.rrect(x, y, wid(it), h, 9, null, C.gold, 0.7); pg.text(x + 8, y + 12.5, it.label, 8.5, C.legend, false, false, 'legend'); pg.link(x, y, wid(it), h, it.key); return; } pg.rect(x, y, wid(it), h, SOFT ? C.tint : C.faint, SOFT ? null : C.line, 0.6); pg.text(x + 8, y + 12.5, it.label, 9, SOFT ? mix(C.accent, C.ink, 0.5) : C.accent, true); pg.link(x, y, wid(it), h, it.key); };
    let x = M;
    for (const it of left.filter(i => i.key)) { place(it, x); x += wid(it) + 6; }
    const r = right.filter(i => i.key);
    x = R - r.reduce((t, i) => t + wid(i) + 6, -6);
    for (const it of r) { place(it, x); x += wid(it) + 6; }
  }
  const monthTabs = state.tabs.filter(t => t.kind === 'month');

  /* ----- page types ----- */
  function indexPage(pg, spec) {
    if (ELEG) return indexElegant(pg, spec);
    chrome(pg, spec.tab, spec);
    title(pg, state.title, 'Tap a tab at the top, or any link below, to jump around.');
    const items = [];
    if (dayTarget(today)) items.push({ name: 'Today', sub: shortDate(today), color: C.accent, key: dayTarget(today) });
    state.tabs.filter(t => t.kind !== 'index' && first.has('tab:' + t.id)).forEach(t =>
      items.push({ name: t.name, sub: { year: 'Year overview', month: `${MONTHS[t.month]} ${t.year}`, notes: 'Notes' }[t.kind], color: t.color, key: 'tab:' + t.id }));
    const cols = W > H ? 3 : 2, gap = 10, cw = (CW - (cols - 1) * gap) / cols, ch = 44;
    items.forEach((it, i) => {
      const x = M + (i % cols) * (cw + gap), y = BODY_TOP + Math.floor(i / cols) * (ch + gap);
      if (y + ch > H - 30) return;
      const tx = SOFT ? x + 38 : x + 18;
      if (SOFT) { pg.rect(x, y, cw, ch, C.card, C.line, 0.6); pg.circle(x + 20, y + ch / 2, 7, it.color); }
      else { pg.rect(x, y, cw, ch, C.faint, C.line, 0.6); pg.rect(x, y, 8, ch, it.color); }
      pg.text(tx, y + 19, fit(it.name, 13, cw - (tx - x) - 8, true), 13, C.ink, true); pg.text(tx, y + 34, fit(it.sub || '', 8.5, cw - (tx - x) - 8), 8.5, C.muted);
      pg.link(x, y, cw, ch, it.key);
    });
  }

  function yearPage(pg, spec) {
    if (ELEG) return yearElegant(pg, spec);
    const tab = spec.tab; chrome(pg, tab, spec);
    const label = tab.month === 0 ? tab.year : `${tab.year}-${tab.year + 1}`;
    title(pg, `${tab.name} ${label}`, 'Tap a month name or any day to jump to its page.');
    const cols = W > H ? 4 : 3, rows = 12 / cols, gap = 14;
    const cw = (CW - (cols - 1) * gap) / cols, ch = (H - 36 - BODY_TOP - (rows - 1) * gap) / rows;
    for (let i = 0; i < 12; i++) {
      const month = (tab.month + i) % 12, year = tab.year + Math.floor((tab.month + i) / 12);
      const x = M + (i % cols) * (cw + gap), y = BODY_TOP + Math.floor(i / cols) * (ch + gap);
      const mt = monthTabs.find(t => t.month === month && t.year === year), mcolor = mt ? mt.color : C.ink;
      if (SOFT) {
        pg.rect(x - 4, y - 8, cw + 8, Math.min(ch, 140), C.card, C.line, 0.6);
        pg.rect(x, y - 4, cw, 17, mt ? mt.color : C.tint, null);
        pg.text(x + 7, y + 8.5, `${MONTHS[month]} ${year}`, 10, mt ? (lum(mt.color) > 0.62 ? '#222222' : '#ffffff') : C.ink, true);
      } else pg.text(x, y + 10, `${MONTHS[month]} ${year}`, 10.5, mcolor, true);
      if (mt) pg.link(x, y - 2, cw, 16, 'tab:' + mt.id);
      const cell = cw / 7, hy = y + 26;
      for (let c = 0; c < 7; c++) pg.text(x + c * cell + cell / 2 - 2.5, hy, DOWS[(c + state.weekStart) % 7][0], 7, C.muted, true);
      const off = (new Date(year, month, 1).getDay() - state.weekStart + 7) % 7, rh = Math.min(15, (ch - 36) / 6);
      for (let d = 1; d <= daysIn(year, month); d++) {
        const k = dateKey(year, month, d), idx = off + d - 1, cx = x + (idx % 7) * cell, cy = hy + 4 + Math.floor(idx / 7) * rh;
        if (k === today) pg.rect(cx + 1, cy, cell - 2, rh - 1, C.today);
        const s = String(d); pg.text(cx + (cell - tw(s, 7.5)) / 2, cy + rh - 4, s, 7.5, C.ink);
        if (state.days[k]) pg.rect(cx + cell / 2 - 1.5, cy + rh - 2, 3, 1.4, C.accent);
        pg.link(cx, cy, cell, rh, dayTarget(k));
      }
    }
  }

  function monthPage(pg, spec) {
    if (ELEG) return monthElegant(pg, spec);
    const tab = spec.tab; chrome(pg, tab, spec);
    title(pg, `${MONTHS[tab.month]} ${tab.year}`);
    const i = monthTabs.indexOf(tab), yt = state.tabs.find(t => t.kind === 'year');
    navBar(pg,
      [{ label: '< ' + (monthTabs[i - 1] ? MONTHS[monthTabs[i - 1].month].slice(0, 3) : ''), key: monthTabs[i - 1] && 'tab:' + monthTabs[i - 1].id }],
      [{ label: (monthTabs[i + 1] ? MONTHS[monthTabs[i + 1].month].slice(0, 3) : '') + ' >', key: monthTabs[i + 1] && 'tab:' + monthTabs[i + 1].id }, { label: 'Year', key: yt && 'tab:' + yt.id }]);
    const off = (new Date(tab.year, tab.month, 1).getDay() - state.weekStart + 7) % 7, n = daysIn(tab.year, tab.month), rows = Math.ceil((off + n) / 7);
    const wkW = o.weekly !== 'none' ? 26 : 0, gx = M + wkW, gw = R - gx, cw = gw / 7, hy = BODY_TOP - 4, ch = (H - 36 - hy - 16) / rows;
    for (let c = 0; c < 7; c++) pg.text(gx + c * cw + 4, hy + 8, DOWS[(c + state.weekStart) % 7], 9, C.muted, true);
    for (let d = 1; d <= n; d++) {
      const k = dateKey(tab.year, tab.month, d), idx = off + d - 1, x = gx + (idx % 7) * cw, y = hy + 16 + Math.floor(idx / 7) * ch;
      const g = SOFT ? 2 : 0;
      pg.rect(x + g, y + g, cw - 2 * g, ch - 2 * g, k === today ? C.today : SOFT ? C.card : null, C.line, 0.6);
      pg.text(x + 4 + g, y + 13 + g, String(d), 11, C.ink, true);
      const entry = state.days[k];
      if (entry) drawPlainSnippet(pg, entry, x + 4 + g, y + 24 + g, cw - 8 - 2 * g, Math.floor((ch - 28 - 2 * g) / 9));
      pg.link(x, y, cw, ch, dayTarget(k));
    }
    if (wkW) for (let r = 0; r < rows; r++) {
      const k = dateKey(tab.year, tab.month, Math.max(1, r * 7 - off + 1)), key = first.has('week:' + weekStartOf(k)) ? 'week:' + weekStartOf(k) : null, y = hy + 16 + r * ch;
      pg.rect(M, y + (SOFT ? 2 : 0), wkW - 2, ch - (SOFT ? 4 : 0), SOFT ? C.tint : C.faint, SOFT ? null : C.line, 0.6);
      pg.text(M + 3, y + 13, 'W' + (r + 1), 8, C.accent, true); pg.link(M, y, wkW - 2, ch, key);
    }
  }
  function drawPlainSnippet(pg, text, x, y, w, maxLines) {
    wrapRich(text.replace(/\[\[([^\]]+)\]\]/g, '$1'), w, 7).slice(0, Math.max(0, maxLines)).forEach((ln, i) =>
      pg.text(x, y + i * 9, ln.map(wd => wd.t).join(' '), 7, C.muted));
  }

  /* one day's box in a week page: label + ruled writing lines + prefilled entry */
  function dayBox(pg, k, x, y, w, h, side) {
    if (ELEG) return dayBoxElegant(pg, k, x, y, w, h, side);
    const labelW = side ? 64 : 0, ly = side ? y : y + 20, lh = side ? h : h - 20;
    pg.rect(x, y, w, h, SOFT ? C.card : null, C.line, 0.7);
    if (side) pg.rect(x, y, labelW, h, k === today ? C.today : SOFT ? C.tint : C.faint, C.line, 0.7);
    else pg.rect(x, y, w, 20, k === today ? C.today : SOFT ? C.tint : C.faint, C.line, 0.7);
    const dname = side ? DOWS[dowOf(k)] : `${DOWS[dowOf(k)]}  ${shortDate(k)}`;
    pg.text(x + 6, y + 15, dname, side ? 11 : 10, C.ink, true);
    if (side) pg.text(x + 6, y + 27, shortDate(k), 8, C.muted);
    pg.link(x, y, side ? labelW : w, side ? h : 20, first.has('day:' + k) ? 'day:' + k : null);
    const tx = x + labelW + 6, tww = w - labelW - 12, step = 16;
    for (let yy = ly + step; yy < ly + lh - 2; yy += step) pg.line(x + labelW + 3, yy, x + w - 3, yy, C.line, 0.5);
    const entry = state.days[k];
    if (entry) {
      const lines = wrapRich(entry, tww, 9), max = Math.max(1, Math.floor((lh - 4) / step));
      drawRich(pg, lines, tx, ly + step - 4, step, 9, max);
    }
  }

  function weekPage(pg, spec) {
    if (ELEG && o.weekly === 'planner') return weekElegant(pg, spec);
    const tab = spec.tab, ws = spec.ws, days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    chrome(pg, tab, spec);
    const a = parseKey(ws), b = parseKey(days[6]);
    title(pg, `Week of ${shortDate(ws)}`, `${shortDate(ws)}${a.y !== b.y ? ', ' + a.y : ''} - ${shortDate(days[6])}, ${b.y}`);
    navBar(pg,
      [{ label: '< Prev week', key: first.has('week:' + addDays(ws, -7)) ? 'week:' + addDays(ws, -7) : null }, { label: 'Next week >', key: first.has('week:' + addDays(ws, 7)) ? 'week:' + addDays(ws, 7) : null }],
      [{ label: MONTHS[tab.month] + ' ' + tab.year, key: 'tab:' + tab.id }]);
    const x = M, y = BODY_TOP, w = CW, h = H - 36 - y;
    if (o.weekly === 'grid') {
      const cols = W > H ? 4 : 2, rows = 4 / (cols / 2) , gap = 8, cw = (w - (cols - 1) * gap) / cols, ch = (h - (rows - 1) * gap) / rows;
      for (let i = 0; i < 8; i++) {
        const cx = x + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (ch + gap);
        if (i < 7) dayBox(pg, days[i], cx, cy, cw, ch, false);
        else { pg.rect(cx, cy, cw, ch, null, C.line, 0.7); pg.rect(cx, cy, cw, 20, C.faint, C.line, 0.7); pg.text(cx + 6, cy + 14, 'Notes', 10, C.ink, true); drawStyleBg(pg, 'dotted', cx + 6, cy + 28, cw - 12, ch - 34); }
      }
    } else if (o.weekly === 'planner') {
      const lw = Math.round(w * 0.64), rh = h / 7;
      days.forEach((k, i) => dayBox(pg, k, x, y + i * rh, lw, rh, true));
      const rx = x + lw + 14, rw = w - lw - 14, ph = Math.round(h * 0.4);
      pg.text(rx, y + 10, 'Priorities', 11, C.ink, true); drawStyleBg(pg, 'checklist', rx, y + 16, rw, ph - 16);
      pg.text(rx, y + ph + 22, 'Notes', 11, C.ink, true); drawStyleBg(pg, 'lined', rx, y + ph + 30, rw, h - ph - 30);
    } else {
      const rh = h / 7;
      days.forEach((k, i) => dayBox(pg, k, x, y + i * rh, w, rh, true));
    }
  }

  function dayPage(pg, spec) {
    if (o.dailyLayout === 'planner') return plannerDay(pg, spec);
    const k = spec.date, tab = spec.tab, { y: yy, m, d } = parseKey(k), ws = weekStartOf(k);
    chrome(pg, tab, spec);
    title(pg, `${DOW_FULL[dowOf(k)]}, ${MONTHS[m]} ${d}, ${yy}`);
    navBar(pg,
      [{ label: '< ' + shortDate(addDays(k, -1)), key: dayTarget(addDays(k, -1)) }, { label: shortDate(addDays(k, 1)) + ' >', key: dayTarget(addDays(k, 1)) }],
      [{ label: 'Week', key: first.has('week:' + ws) ? 'week:' + ws : null }, { label: MONTHS[tab.month].slice(0, 3) + ' ' + tab.year, key: 'tab:' + tab.id }]);
    let y = BODY_TOP; const w = CW, bottom = H - 36;
    const entry = state.days[k];
    if (entry) {
      const lines = wrapRich(entry, w, 11), max = Math.max(1, Math.floor((bottom - y) * 0.4 / 16)), shown = lines.length > max ? max : lines.length;
      drawRich(pg, lines, M, y + 12, 16, 11, max);
      if (lines.length > max) pg.text(M, y + 12 + shown * 16, '... (continues in the app)', 9, C.muted);
      y += shown * 16 + 18 + (lines.length > max ? 14 : 0);
      pg.line(M, y - 6, R, y - 6, C.line, 0.8);
    }
    drawStyleBg(pg, o.dailyStyle, M, y, w, bottom - y);
  }

  function notesPage(pg, spec) {
    const tab = spec.tab; chrome(pg, tab, spec);
    title(pg, tab.name + (spec.part ? ' (cont.)' : ''), spec.count > 1 ? `Page ${spec.part + 1} of ${spec.count}` : '');
    if (ELEG) pg.rrect(M, BODY_TOP - 6, CW, H - 36 - BODY_TOP + 6, 12, null, C.gold, 0.7);
    const b = notesBox;
    drawStyleBg(pg, o.notesStyle, b.x, b.y, b.w, b.h);
    const L = styleLayout(o.notesStyle, b.x, b.y, b.w, b.h);
    drawRich(pg, spec.lines, L.tx + 2, L.ty0 + L.step - 5, L.step, L.size, 9999);
  }

  /* ================= shared planner pieces ================= */
  const ell = (cx, cy, rx, ry, n = 22) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos(i * 2 * Math.PI / n), cy + ry * Math.sin(i * 2 * Math.PI / n)]);
  const textC = (pg, cx, y, s, size, color, bold, role, cs) => pg.text(cx - twc(s, size, bold, role, cs) / 2, y, s, size, color, bold, false, role, cs);
  const onGold = () => lum(C.gold) > 0.62 ? '#2b2b2b' : '#ffffff';

  /* a box whose label sits on the top border (elegant), as a pill (soft) or inside the corner (classic) */
  function box(pg, x, y, w, h, label) {
    if (ELEG) {
      pg.rrect(x, y, w, h, 10, null, C.gold, 0.7);
      if (label) { const lw = tw(label, 9, false, 'legend') + 16; pg.fillRect(x + (w - lw) / 2, y - 5.5, lw, 11, C.paper); textC(pg, x + w / 2, y + 3, label, 9, C.legend, false, 'legend'); }
    } else if (SOFT) {
      pg.rect(x, y, w, h, C.card, C.line, 0.6);
      if (label) { const lw = tw(label, 8.5, true) + 16; pg.rect(x + 12, y - 8, lw, 16, C.tint, null); pg.text(x + 20, y + 3, label, 8.5, mix(C.accent, C.ink, 0.5), true); }
    } else {
      pg.rect(x, y, w, h, null, C.line, 0.7);
      if (label) pg.text(x + 8, y + 12, label, 8.5, C.ink, true);
    }
  }
  const boxPad = ELEG || SOFT ? 8 : 18;
  /* dotted writing rows, optionally with a circle checkbox at the right end */
  function checkRows(pg, x, y, w, rows, step, circles) {
    for (let i = 1; i <= rows; i++) {
      const yy = y + i * step;
      pg.dashed(x + 10, yy, x + w - (circles ? 28 : 10), ELEG ? C.goldSoft : C.line, 0.6, 1, 2.4);
      if (circles) pg.circleStroke(x + w - 15, yy - 5, 4.3, ELEG ? C.gold : C.muted, 0.7);
    }
  }
  function drop(pg, cx, cy, c) {
    const pts = [[cx, cy - 8]];
    for (let i = 0; i <= 14; i++) { const a = -0.3 * Math.PI + i * 1.6 * Math.PI / 14; pts.push([cx + 4.6 * Math.cos(a), cy + 2.6 + 4.6 * Math.sin(a)]); }
    pg.polyline(pts, c, 0.8, true);
  }
  function icon(pg, kind, x, y, c) {                      // 10 x 10 line icons
    const L = (pts, closed) => pg.polyline(pts.map(([a, b]) => [x + a, y + b]), c, 0.8, closed);
    if (kind === 'home') { L([[0, 5], [5, 0.5], [10, 5]]); L([[1.5, 4.5], [1.5, 9.5], [8.5, 9.5], [8.5, 4.5]]); }
    else if (kind === 'cal') { L([[0.5, 1.5], [9.5, 1.5], [9.5, 9.5], [0.5, 9.5]], true); L([[0.5, 4], [9.5, 4]]); L([[3, 0], [3, 2.5]]); L([[7, 0], [7, 2.5]]); }
    else if (kind === 'month') { for (const a of [0, 3.6, 7.2]) for (const b of [0, 3.6, 7.2]) L([[a, b], [a + 2.6, b], [a + 2.6, b + 2.6], [a, b + 2.6]], true); }
    else if (kind === 'week') { L([[0, 2], [10, 2]]); L([[0, 5], [10, 5]]); L([[0, 8], [10, 8]]); }
    else if (kind === 'day') { pg.polyline(ell(x + 5, y + 5, 2.6, 2.6, 12), c, 0.8, true); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; L([[5 + 3.8 * Math.cos(a), 5 + 3.8 * Math.sin(a)], [5 + 5 * Math.cos(a), 5 + 5 * Math.sin(a)]]); } }
    else L([[1, 9], [2, 6.5], [8, 0.8], [9.3, 2.1], [3.5, 8]], true);
  }

  /* ================= elegant chrome ================= */
  function spiral(pg) {
    pg.fillRect(0, 0, 38, H, C.bind);
    pg.line(38, 0, 38, H, C.goldSoft, 0.4);
    for (let y = 20; y < H - 12; y += 16) {
      pg.poly(ell(30, y, 3, 1.9), C.hole);
      pg.polyline(ell(15, y, 17, 3.8), C.coil, 2.2, true);
      pg.polyline(ell(15, y - 1, 15, 2.4), mix(C.coil, '#ffffff', 0.6), 0.6, true);
    }
  }
  let secs;
  function sections() {
    if (secs) return secs;
    const idx = state.tabs.find(t => t.kind === 'index'), yr = state.tabs.find(t => t.kind === 'year'), nt = state.tabs.find(t => t.kind === 'notes');
    const td = parseKey(today), mt = monthTabs.find(t => t.year === td.y && t.month === td.m) || monthTabs[0];
    const anyKey = prefix => [...first.keys()].find(k => k.startsWith(prefix));
    secs = [
      { id: 'index', label: 'HOME', icon: 'home', key: idx && 'tab:' + idx.id },
      { id: 'year', label: 'CALENDAR', icon: 'cal', key: yr && 'tab:' + yr.id },
      { id: 'month', label: 'MONTH', icon: 'month', key: mt && 'tab:' + mt.id },
      { id: 'week', label: 'WEEK', icon: 'week', key: first.has('week:' + weekStartOf(today)) ? 'week:' + weekStartOf(today) : anyKey('week:') },
      { id: 'day', label: 'DAY', icon: 'day', key: dayTarget(today) || anyKey('day:') || anyKey('week:') },
      { id: 'notes', label: 'NOTES', icon: 'notes', key: nt && 'tab:' + nt.id },
    ].filter(s => s.key && first.has(s.key));
    return secs;
  }
  function chromeElegant(pg, activeTab, spec) {
    tabColor = activeTab ? activeTab.color : C.accent;
    pg.rect(0, 0, W, H, C.paper);
    spiral(pg);
    const ss = sections(), n = ss.length, gap = 5, tw0 = Math.min(92, (CW - (n - 1) * gap) / Math.max(n, 1)), type = spec && spec.type;
    ss.forEach((s, i) => {
      const x = M + i * (tw0 + gap), act = s.id === type, col = act ? onGold() : C.legend;
      pg.rrect(x, 7, tw0, 28, 8, act ? C.gold : C.cell, act ? null : C.goldSoft, 0.6);
      icon(pg, s.icon, x + 8, 16, col);
      pg.text(x + 22, 24.5, fit(s.label, 6.2, tw0 - 28), 6.2, col, false, false, null, 0.9);
      pg.link(x, 7, tw0, 28, s.key);
    });
    const nT = state.tabs.length, top = 46, area = H - top - 24, g2 = 4, th = Math.min(86, (area - (nT - 1) * g2) / Math.max(nT, 1)), fs = th < 40 ? 6.5 : th < 56 ? 7.5 : 8.5;
    state.tabs.forEach((t, i) => {
      const act = activeTab && t.id === activeTab.id, y = top + i * (th + g2), x = act ? W - 36 : W - 30, w = act ? 44 : 38;
      pg.rrect(x, y, w, th, 8, act ? C.gold : C.cell, act ? null : C.goldSoft, 0.6);
      pg.rrect(x + 3, y + 6, 2.6, th - 12, 1.3, t.color, null);
      const label = fit(t.name, fs, th - 10, false), lw = tw(label, fs, false, 'legend');
      pg.text(x + 15, y + (th - lw) / 2, label, fs, act ? onGold() : C.legend, false, true, 'legend');
      pg.link(x, y, W - x, th, 'tab:' + t.id);
    });
    if (spec && ['month', 'week', 'day'].includes(spec.type) && spec.tab && spec.tab.kind === 'month') {
      const tab = spec.tab, nd = daysIn(tab.year, tab.month), y0 = 60, y1 = H - 40, st = (y1 - y0) / nd, cx = W - 49, cur = spec.type === 'day' ? parseKey(spec.date).d : 0;
      for (let d = 1; d <= nd; d++) {
        const k = dateKey(tab.year, tab.month, d), yy = y0 + (d - 0.5) * st, s = String(d);
        if (d === cur) pg.circle(cx, yy - 0.5, 5.8, C.gold); else if (k === today) pg.circleStroke(cx, yy - 0.5, 5.4, C.gold, 0.6);
        pg.text(cx - tw(s, 6.2, false, 'legend') / 2, yy + 2, s, 6.2, d === cur ? onGold() : C.legend, false, false, 'legend');
        pg.link(cx - 9, yy - st / 2, 18, st, dayTarget(k));
      }
    }
  }
  function titleElegant(pg, text, sub) {
    let s = text.length > 18 ? 26 : 32;
    while (s > 16 && tw(text, s, false, 'title') > CW - 10) s -= 2;
    textC(pg, M + CW / 2, 70, text, s, C.titleC, false, 'title');
    if (sub) textC(pg, M + CW / 2, 86, sub.toUpperCase(), 6.8, C.muted, false, null, 1.6);
  }

  /* ================= cover ================= */
  function coverPage(pg, spec) {
    const d = { rect: (x, y, w, h, f) => pg.fillRect(x, y, w, h, f), poly: (pts, f) => pg.poly(pts, f), polyline: (pts, s, lw, c) => pg.polyline(pts, s, lw, c) };
    spec.cover.draw(d, W, H, { paper: C.paper, accent: C.accent });
    const px = W * 0.16, pw = W * 0.68, py = H * 0.4, ph = H * 0.2, plate = '#f7f1e3', gold = '#b59a6b', ink = '#6b5636';
    pg.fillRect(px, py, pw, ph, plate); pg.strokeRect(px + 5, py + 5, pw - 10, ph - 10, gold, 1.2); pg.strokeRect(px + 9, py + 9, pw - 18, ph - 18, gold, 0.5);
    let s = 36; while (s > 16 && tw(state.title, s, false, 'title') > pw - 40) s -= 2;
    textC(pg, W / 2, py + ph / 2 + s * 0.15, state.title, s, ink, false, 'title');
    const years = monthTabs.length ? `${monthTabs[0].year}${monthTabs[monthTabs.length - 1].year !== monthTabs[0].year ? ' - ' + monthTabs[monthTabs.length - 1].year : ''}` : String(state.year);
    textC(pg, W / 2, py + ph - 20, years, 9, ink, false, null, 3);
    pg.link(0, 0, W, H, first.has('tab:' + (state.tabs[0] || {}).id) ? 'tab:' + state.tabs[0].id : null);
  }

  /* ================= index ================= */
  function indexElegant(pg, spec) {
    chromeElegant(pg, spec.tab, spec);
    titleElegant(pg, state.title, 'Hyperlinked planner');
    const items = [];
    if (dayTarget(today)) items.push({ name: 'Today', sub: shortDate(today), color: C.gold, key: dayTarget(today) });
    state.tabs.filter(t => t.kind !== 'index' && first.has('tab:' + t.id)).forEach(t =>
      items.push({ name: t.name, sub: { year: 'Year overview', month: `${MONTHS[t.month]} ${t.year}`, notes: 'Notes' }[t.kind], color: t.color, key: 'tab:' + t.id }));
    const cols = 2, gap = 22, cw = (CW - gap) / cols, rh = 40;
    items.forEach((it, i) => {
      const x = M + (i % cols) * (cw + gap), y = BODY_TOP + 8 + Math.floor(i / cols) * rh;
      if (y + rh > H - 34) return;
      pg.circle(x + 6, y + 12, 3.4, it.color);
      pg.text(x + 18, y + 15, fit(it.name.toUpperCase(), 9.5, cw - 24), 9.5, C.ink, false, false, null, 1.2);
      pg.text(x + 18, y + 28, fit(it.sub || '', 8.5, cw - 24), 8.5, C.muted, false, false, 'legend');
      pg.dashed(x, y + 35, x + cw, C.goldSoft, 0.6, 1, 2.4);
      pg.link(x, y, cw, rh, it.key);
    });
  }

  /* ================= year / calendar ================= */
  function yearElegant(pg, spec) {
    const tab = spec.tab; chromeElegant(pg, tab, spec);
    const label = tab.month === 0 ? tab.year : `${tab.year} - ${tab.year + 1}`;
    titleElegant(pg, 'Calendar', String(label));
    const cols = W > H ? 4 : 3, rows = 12 / cols, gap = 14, cw = (CW - (cols - 1) * gap) / cols, ch = (H - 36 - BODY_TOP - (rows - 1) * gap) / rows;
    for (let i = 0; i < 12; i++) {
      const month = (tab.month + i) % 12, year = tab.year + Math.floor((tab.month + i) / 12);
      const x = M + (i % cols) * (cw + gap), y = BODY_TOP + Math.floor(i / cols) * (ch + gap);
      const mt = monthTabs.find(t => t.month === month && t.year === year);
      textC(pg, x + cw / 2, y + 17, MONTHS[month], 18, C.titleC, false, 'title');
      if (mt) pg.link(x, y, cw, 24, 'tab:' + mt.id);
      const cell = cw / 7, hy = y + 36, off = (new Date(year, month, 1).getDay() - state.weekStart + 7) % 7, rh = Math.min(16, (ch - 48) / 6);
      for (let c = 0; c < 7; c++) textC(pg, x + c * cell + cell / 2, hy, DOWS[(c + state.weekStart) % 7][0], 5.8, C.muted, false, null, 0.4);
      for (let d = 1; d <= daysIn(year, month); d++) {
        const k = dateKey(year, month, d), idx = off + d - 1, cx = x + (idx % 7) * cell, cy = hy + 5 + Math.floor(idx / 7) * rh;
        pg.fillRect(cx + 0.8, cy, cell - 1.6, rh - 1.6, k === today ? C.today : C.cell);
        const s = String(d); pg.text(cx + (cell - tw(s, 6.2, false, 'legend')) / 2, cy + rh - 5.2, s, 6.2, C.ink, false, false, 'legend');
        if (state.days[k]) pg.circle(cx + cell - 4, cy + 3, 1.1, C.gold);
        pg.link(cx, cy, cell, rh, dayTarget(k));
      }
    }
  }

  /* ================= month ================= */
  function monthElegant(pg, spec) {
    const tab = spec.tab; chromeElegant(pg, tab, spec);
    titleElegant(pg, MONTHS[tab.month], String(tab.year));
    const i = monthTabs.indexOf(tab), yt = state.tabs.find(t => t.kind === 'year');
    navBar(pg,
      [{ label: '< ' + (monthTabs[i - 1] ? MONTHS[monthTabs[i - 1].month].slice(0, 3) : ''), key: monthTabs[i - 1] && 'tab:' + monthTabs[i - 1].id }],
      [{ label: (monthTabs[i + 1] ? MONTHS[monthTabs[i + 1].month].slice(0, 3) : '') + ' >', key: monthTabs[i + 1] && 'tab:' + monthTabs[i + 1].id }, { label: 'Calendar', key: yt && 'tab:' + yt.id }]);
    const off = (new Date(tab.year, tab.month, 1).getDay() - state.weekStart + 7) % 7, n = daysIn(tab.year, tab.month), rows = Math.ceil((off + n) / 7);
    const bh = 84, hy = BODY_TOP - 4, gridBottom = H - 36 - bh - 18, cw = CW / 7, ch = (gridBottom - hy - 14) / rows;
    for (let c = 0; c < 7; c++) textC(pg, M + c * cw + cw / 2, hy + 8, DOWS[(c + state.weekStart) % 7].toUpperCase(), 6.6, C.muted, false, null, 1.4);
    for (let d = 1; d <= n; d++) {
      const k = dateKey(tab.year, tab.month, d), idx = off + d - 1, x = M + (idx % 7) * cw, y = hy + 14 + Math.floor(idx / 7) * ch;
      if (k === today) pg.fillRect(x, y, cw, ch, C.today);
      pg.strokeRect(x, y, cw, ch, C.goldSoft, 0.6);
      pg.text(x + 4, y + 11, String(d), 8.5, C.legend, false, false, 'legend');
      if (state.days[k]) drawPlainSnippet(pg, state.days[k], x + 4, y + 21, cw - 8, Math.floor((ch - 24) / 9));
      pg.link(x, y, cw, ch, dayTarget(k));
    }
    if (o.weekly !== 'none') for (let r = 0; r < rows; r++) {
      const k = dateKey(tab.year, tab.month, Math.max(1, r * 7 - off + 1)), ws = weekStartOf(k), key = first.has('week:' + ws) ? 'week:' + ws : null, y = hy + 14 + r * ch;
      pg.rrect(M - 17, y + 3, 15, Math.min(ch - 6, 54), 5, C.cell, C.goldSoft, 0.5);
      pg.text(M - 14.5, y + 15, 'W' + (r + 1), 6, C.legend, false, false, 'legend'); pg.link(M - 17, y + 3, 15, Math.min(ch - 6, 54), key);
    }
    const by = H - 36 - bh, lw = Math.round(CW * 0.58);
    box(pg, M, by, lw - 8, bh, 'Goals for the month'); checkRows(pg, M, by + 4, lw - 8, 3, 22, false);
    box(pg, M + lw + 8, by, CW - lw - 8, bh, 'Notes'); drawStyleBg(pg, 'dotted', M + lw + 18, by + 12, CW - lw - 28, bh - 22);
  }

  /* ================= week ================= */
  function weekSelector(pg, tab, ws) {
    const list = monthWeeks.get(tab.id) || [];
    if (list.length < 2) return;
    const r = 8.5, gap = 5; let x = R - list.length * (2 * r + gap) + gap + r;
    list.forEach((w0, i) => {
      const act = w0 === ws, s = 'W' + (i + 1);
      if (act) pg.circle(x, 62, r, C.gold); else pg.circleStroke(x, 62, r, C.gold, 0.7);
      pg.text(x - tw(s, 6.5, false, 'legend') / 2, 64.4, s, 6.5, act ? onGold() : C.legend, false, false, 'legend');
      pg.link(x - r, 62 - r, 2 * r, 2 * r, 'week:' + w0); x += 2 * r + gap;
    });
  }
  function dayBoxElegant(pg, k, x, y, w, h, side) {
    const labelW = side ? 66 : 0, dn = DOWS[dowOf(k)];
    pg.rrect(x, y, w, h, 10, k === today ? C.today : null, C.gold, 0.7);
    if (side) { textC(pg, x + labelW / 2, y + 18, dn, 12, C.titleC, false, 'legend'); textC(pg, x + labelW / 2, y + 30, shortDate(k).toUpperCase(), 6.3, C.muted, false, null, 1); pg.line(x + labelW, y + 8, x + labelW, y + h - 8, C.goldSoft, 0.5); }
    else { textC(pg, x + w / 2, y + 15, `${dn}  ${shortDate(k)}`, 9.5, C.titleC, false, 'legend'); pg.line(x + 10, y + 22, x + w - 10, y + 22, C.goldSoft, 0.5); }
    pg.link(x, y, side ? labelW : w, side ? h : 22, first.has('day:' + k) ? 'day:' + k : null);
    const ly = side ? y : y + 22, lh = side ? h : h - 22, step = 16, tx = x + labelW + 8;
    for (let yy = ly + step; yy < ly + lh - 3; yy += step) pg.dashed(x + labelW + 6, yy, x + w - 8, C.goldSoft, 0.5, 1, 2.6);
    if (state.days[k]) drawRich(pg, wrapRich(state.days[k], w - labelW - 18, 8.5), tx, ly + step - 4, step, 8.5, Math.max(1, Math.floor((lh - 6) / step)));
  }
  function weekElegant(pg, spec) {
    const tab = spec.tab, ws = spec.ws, days = Array.from({ length: 7 }, (_, i) => addDays(ws, i)), b = parseKey(days[6]);
    chromeElegant(pg, tab, spec);
    titleElegant(pg, 'Weekly Planner', `${shortDate(ws)} - ${shortDate(days[6])}, ${b.y}`);
    weekSelector(pg, tab, ws);
    navBar(pg,
      [{ label: '< Prev week', key: first.has('week:' + addDays(ws, -7)) ? 'week:' + addDays(ws, -7) : null }, { label: 'Next week >', key: first.has('week:' + addDays(ws, 7)) ? 'week:' + addDays(ws, 7) : null }],
      [{ label: MONTHS[tab.month] + ' ' + tab.year, key: 'tab:' + tab.id }]);
    const x = M, y = BODY_TOP, w = CW, h = H - 36 - y, lw = Math.round(w * 0.6), rh = h / 7;
    days.forEach((k, i) => {
      const yy = y + i * rh;
      if (k === today) pg.rrect(x - 3, yy + 2, lw + 6, rh - 4, 8, C.today, null);
      else if (i) pg.dashed(x, yy, x + lw, C.goldSoft, 0.6, 1.2, 2.4);
      textC(pg, x + 33, yy + 22, DOW_FULL[dowOf(k)], 11, C.titleC, false, 'legend');
      textC(pg, x + 33, yy + 34, shortDate(k).toUpperCase(), 6.3, C.muted, false, null, 1);
      pg.link(x, yy, 68, rh, first.has('day:' + k) ? 'day:' + k : null);
      for (let ly = yy + 16; ly < yy + rh - 3; ly += 16) pg.dashed(x + 72, ly, x + lw - 4, C.goldSoft, 0.5, 1, 2.6);
      if (state.days[k]) drawRich(pg, wrapRich(state.days[k], lw - 84, 8.5), x + 74, yy + 13, 16, 8.5, Math.max(1, Math.floor((rh - 8) / 16)));
    });
    const rx = x + lw + 16, rw = w - lw - 16, fh = Math.round(h * 0.2), th2 = Math.round(h * 0.42), nh = h - fh - th2 - 36;
    box(pg, rx, y + 6, rw, fh, 'Weekly focus'); checkRows(pg, rx, y + 10, rw, Math.floor((fh - 12) / 22), 22, false);
    box(pg, rx, y + fh + 24, rw, th2, 'To-do list'); checkRows(pg, rx, y + fh + 28, rw, Math.floor((th2 - 8) / 24), 24, true);
    box(pg, rx, y + fh + th2 + 42, rw, nh - 6, 'Notes'); drawStyleBg(pg, 'dotted', rx + 8, y + fh + th2 + 52, rw - 16, nh - 24);
  }

  /* ================= daily planner ================= */
  function plannerDay(pg, spec) {
    const k = spec.date, tab = spec.tab, { y: yy, m, d } = parseKey(k), ws = weekStartOf(k);
    chrome(pg, tab, spec);
    title(pg, 'Daily Planner', `${DOW_FULL[dowOf(k)]}, ${MONTHS[m]} ${d}, ${yy}`);
    navBar(pg,
      [{ label: '< ' + shortDate(addDays(k, -1)), key: dayTarget(addDays(k, -1)) }, { label: shortDate(addDays(k, 1)) + ' >', key: dayTarget(addDays(k, 1)) }],
      [{ label: 'Week', key: first.has('week:' + ws) ? 'week:' + ws : null }, { label: MONTHS[tab.month].slice(0, 3) + ' ' + tab.year, key: 'tab:' + tab.id }]);
    const x = M, w = CW, bottom = H - 34, ink = ELEG ? C.gold : C.muted;
    let y = BODY_TOP - 2;
    // trackers: water, mood, meals
    const lab = (s, lx) => pg.text(lx, y + 4, s.toUpperCase(), 5.8, C.muted, false, false, null, 1.2);
    lab('Water', x); for (let i = 0; i < 8; i++) drop(pg, x + 6 + i * 15, y + 20, ink);
    const mx = x + w * 0.42; lab('Mood', mx); for (let i = 0; i < 5; i++) pg.circleStroke(mx + 6 + i * 16, y + 17, 5.2, ink, 0.8);
    const sx = x + w * 0.7; lab('Meals', sx); ['B', 'L', 'D', 'S'].forEach((c, i) => { pg.circleStroke(sx + 6 + i * 17, y + 17, 5.8, ink, 0.8); pg.text(sx + 6 + i * 17 - tw(c, 6, false, 'legend') / 2, y + 19.4, c, 6, C.legend, false, false, 'legend'); });
    y += 40;
    const lwid = Math.round(w * 0.43), gap = 14, rx = x + lwid + gap, rw = w - lwid - gap, avail = bottom - y;
    const priH = 86, notesH = Math.round(avail * 0.27), todoH = avail - priH - notesH - 2 * 16;
    // left column
    box(pg, x, y, lwid, priH, 'Top priority'); checkRows(pg, x, y + boxPad - 8, lwid, 3, 24, true);
    box(pg, x, y + priH + 16, lwid, todoH, 'To-do list'); checkRows(pg, x, y + priH + 16 + boxPad - 8, lwid, Math.floor((todoH - boxPad) / 22), 22, true);
    const ny = y + priH + todoH + 32;
    box(pg, x, ny, lwid, notesH, 'Notes');
    drawStyleBg(pg, o.dailyStyle === 'schedule' ? 'dotted' : o.dailyStyle, x + 8, ny + 10, lwid - 16, notesH - 18);
    const entry = state.days[k];
    if (entry) drawRich(pg, wrapRich(entry, lwid - 20, 8.5), x + 10, ny + 20, 12, 8.5, Math.max(1, Math.floor((notesH - 28) / 12)));
    // schedule
    box(pg, rx, y, rw, avail, 'Schedule');
    const hrs = 15, sh = (avail - 22) / hrs;
    for (let i = 0; i < hrs; i++) {
      const hr = 6 + i, yy2 = y + 16 + (i + 1) * sh;
      pg.text(rx + 10, yy2 - 3, `${hr % 12 || 12} ${hr < 12 ? 'AM' : 'PM'}`, 6.6, C.legend, false, false, 'legend');
      pg.dashed(rx + 40, yy2, rx + rw - 10, ELEG ? C.goldSoft : C.line, 0.6, 1, 2.4);
    }
  }

  const Mval = M;
  const draw = spec => {
    curBody = fontKey; curHead = headKey; curTitle = titleKey; curLegend = legendKey; M = Mval;   // other sessions may have run since this one was planned
    const pg = new Pg(W, H); pg.soft = ROUNDED; pg.shadow = SOFT ? C.shadow : null;
    ({ cover: coverPage, index: indexPage, year: yearPage, month: monthPage, week: weekPage, day: dayPage, notes: notesPage })[spec.type](pg, spec);
    return pg;
  };
  return { specs, first, W, H, draw, fontKey, headKey, titleKey, legendKey, M, count: specs.length };
}

/* ---------- PDF serialisation ---------- */
const deflate = str => deflateBytes(latin1(str));
async function deflateBytes(bytes) {
  if (typeof CompressionStream === 'undefined') return { bytes, filter: '' };
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return { bytes: new Uint8Array(await new Response(stream).arrayBuffer()), filter: '/Filter /FlateDecode ' };
}

async function generate(state, opts) {
  const o = { ...DEFAULTS, ...opts };
  await Promise.all(fontKeys(state, o).map(loadFont));
  Object.values(loaded).forEach(F => F.used.clear());
  fontReg = new Map();
  const S = session(state, opts), n = S.specs.length, W = S.W, H = S.H;
  curBody = S.fontKey; curHead = S.headKey; curTitle = S.titleKey; curLegend = S.legendKey; M = S.M;
  const pages = S.specs.map(S.draw);
  if (!fontReg.size) fontRes('helvetica', false);
  const pageObj = i => 3 + 2 * i, contentObj = i => 4 + 2 * i;
  let next = 3 + 2 * n;                                         // annotation ids start after all page/content objects
  const annots = pages.map(pg => pg.links.map(l => ({ id: next++, l })).filter(a => S.first.has(a.l.key)));
  const outline = (S.first.has('cover') ? [{ id: 0, title: 'Cover', page: S.first.get('cover') }] : []).concat(state.tabs.filter(t => S.first.has('tab:' + t.id)).map(t => ({ id: 0, title: t.name, page: S.first.get('tab:' + t.id) })));
  const outRoot = outline.length ? next++ : 0;
  outline.forEach(it => { it.id = next++; });
  const infoId = next++;
  const fonts = [...fontReg.values()].map(r => ({ ...r, ids: EMBEDDED[r.key] ? { type0: next++, cid: next++, desc: next++, file: next++, tou: next++ } : { type0: next++ } }));
  const fontDict = fonts.map(r => `/${r.name} ${r.ids.type0} 0 R`).join(' ');
  const total = next;

  const chunks = [], offsets = []; let off = 0;
  const w = x => { const b = typeof x === 'string' ? latin1(x) : x; chunks.push(b); off += b.length; };
  const obj = (id, body) => { offsets[id] = off; w(`${id} 0 obj\n${body}\nendobj\n`); };

  w('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n');
  obj(1, `<< /Type /Catalog /Pages 2 0 R${outRoot ? ` /Outlines ${outRoot} 0 R /PageMode /UseOutlines` : ''} >>`);
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => pageObj(i) + ' 0 R').join(' ')}] /Count ${n} >>`);

  for (let i = 0; i < n; i++) {
    const ann = annots[i].map(a => a.id + ' 0 R').join(' ');
    obj(pageObj(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /Resources << /Font << ${fontDict} >> >> /Contents ${contentObj(i)} 0 R${ann ? ` /Annots [${ann}]` : ''} >>`);
    const { bytes, filter } = await deflate(pages[i].ops.join('\n'));
    offsets[contentObj(i)] = off;
    w(`${contentObj(i)} 0 obj\n<< ${filter}/Length ${bytes.length} >>\nstream\n`); w(bytes); w('\nendstream\nendobj\n');
    for (const a of annots[i]) {
      const { x, y, w: lw, h } = a.l;
      obj(a.id, `<< /Type /Annot /Subtype /Link /Rect [${f(x)} ${f(H - y - h)} ${f(x + lw)} ${f(H - y)}] /Border [0 0 0] /Dest [${pageObj(S.first.get(a.l.key))} 0 R /Fit] >>`);
    }
  }
  if (outRoot) {
    obj(outRoot, `<< /Type /Outlines /First ${outline[0].id} 0 R /Last ${outline[outline.length - 1].id} 0 R /Count ${outline.length} >>`);
    outline.forEach((it, i) => obj(it.id, `<< /Title ${pdfStr(it.title)} /Parent ${outRoot} 0 R${i ? ` /Prev ${outline[i - 1].id} 0 R` : ''}${outline[i + 1] ? ` /Next ${outline[i + 1].id} 0 R` : ''} /Dest [${pageObj(it.page)} 0 R /Fit] >>`));
  }
  const now = new Date();
  obj(infoId, `<< /Title ${pdfStr(state.title)} /Producer (Calendar Journal) /CreationDate (D:${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}) >>`);

  for (const r of fonts) {
    if (!BUILTIN[r.key]) continue;
    const B = BUILTIN[r.key];
    obj(r.ids.type0, `<< /Type /Font /Subtype /Type1 /BaseFont /${r.bold ? B.bold : B.base} /Encoding /WinAnsiEncoding >>`);
  }
  for (const r of fonts) {
    if (!EMBEDDED[r.key]) continue;
    const E = r.ids, F = loaded[r.key];
    const name = EMBEDDED[r.key], gids = [...F.used.keys()].sort((a, b) => a - b), sc = 1000 / F.upm;
    obj(E.type0, `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${E.cid} 0 R] /ToUnicode ${E.tou} 0 R >>`);
    obj(E.cid, `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${E.desc} 0 R /CIDToGIDMap /Identity /DW 500 /W [${gids.map(g => `${g} [${Math.round(F.adv(g) * sc)}]`).join(' ')}] >>`);
    obj(E.desc, `<< /Type /FontDescriptor /FontName /${name} /Flags 32 /FontBBox [${F.bbox.map(v => Math.round(v * sc)).join(' ')}] /ItalicAngle 0 /Ascent ${Math.round(F.ascent * sc)} /Descent ${Math.round(F.descent * sc)} /CapHeight ${Math.round(F.ascent * sc * 0.7)} /StemV 80 /FontFile2 ${E.file} 0 R >>`);
    const hx = n => n.toString(16).padStart(4, '0').toUpperCase(), maps = [];
    for (let k = 0; k < gids.length; k += 100) maps.push(`${Math.min(100, gids.length - k)} beginbfchar\n${gids.slice(k, k + 100).map(g => `<${hx(g)}> <${hx(F.used.get(g))}>`).join('\n')}\nendbfchar`);
    const cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${maps.join('\n')}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
    obj(E.tou, `<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream`);
    const ff = await deflateBytes(F.bytes);
    offsets[E.file] = off;
    w(`${E.file} 0 obj\n<< ${ff.filter}/Length ${ff.bytes.length} /Length1 ${F.bytes.length} >>\nstream\n`); w(ff.bytes); w('\nendstream\nendobj\n');
  }

  const xref = off;
  w(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let id = 1; id < total; id++) w(String(offsets[id]).padStart(10, '0') + ' 00000 n \n');
  w(`trailer\n<< /Size ${total} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}

/* ---------- on-screen preview: paint a page's recorded drawing onto a canvas ---------- */
const CSS_FAMILY = {
  helvetica: 'Helvetica, Arial, sans-serif', times: '"Times New Roman", Times, serif', courier: '"Courier New", Courier, monospace',
  caveat: 'Caveat, cursive', patrickhand: '"Patrick Hand", cursive', indieflower: '"Indie Flower", cursive', specialelite: '"Special Elite", monospace',
  lora: 'Lora, serif', merriweather: 'Merriweather, serif', playfair: '"Playfair Display", serif', quicksand: 'Quicksand, sans-serif',
  greatvibes: '"Great Vibes", cursive', cormorant: '"Cormorant Garamond", serif', cormorantitalic: '"Cormorant Garamond", serif',
};
function paint(canvas, page, W) {
  const ctx = canvas.getContext('2d'), k = canvas.width / W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.clearRect(0, 0, W, canvas.height / k);
  const path = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
  const round = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const paintShape = (fill, stroke, lw) => { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } };
  ctx.lineJoin = 'round';
  for (const op of page.vec) {
    ctx.setLineDash([]); ctx.lineCap = 'butt';
    switch (op[0]) {
      case 'rect': { const [, x, y, w, h, fill, stroke, lw] = op; ctx.beginPath(); ctx.rect(x, y, w, h); paintShape(fill, stroke, lw); break; }
      case 'rrect': { const [, x, y, w, h, r, fill, stroke, lw] = op; round(x, y, w, h, r); paintShape(fill, stroke, lw); break; }
      case 'poly': { path(op[1]); ctx.closePath(); ctx.fillStyle = op[2]; ctx.fill(); break; }
      case 'polyline': { ctx.lineCap = 'round'; path(op[1]); if (op[4]) ctx.closePath(); ctx.strokeStyle = op[2]; ctx.lineWidth = op[3]; ctx.stroke(); break; }
      case 'line': { ctx.beginPath(); ctx.moveTo(op[1], op[2]); ctx.lineTo(op[3], op[4]); ctx.strokeStyle = op[5]; ctx.lineWidth = op[6]; ctx.stroke(); break; }
      case 'dashed': { ctx.lineCap = 'round'; ctx.setLineDash([op[6], op[7]]); ctx.beginPath(); ctx.moveTo(op[1], op[2]); ctx.lineTo(op[3], op[2]); ctx.strokeStyle = op[4]; ctx.lineWidth = op[5]; ctx.stroke(); break; }
      case 'dots': { const [, x, y, w, h, step, c] = op; ctx.lineCap = 'round'; ctx.setLineDash([0, step]); ctx.strokeStyle = c; ctx.lineWidth = 1.4; for (let yy = y; yy <= y + h + 0.1; yy += step) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); } break; }
      case 'circle': { ctx.beginPath(); ctx.arc(op[1], op[2], op[3], 0, Math.PI * 2); ctx.fillStyle = op[4]; ctx.fill(); break; }
      case 'tape': {
        const [, cx, cy, w, h, deg, c1, c2] = op; ctx.save(); ctx.translate(cx, cy); ctx.rotate(deg * Math.PI / 180);
        ctx.fillStyle = c1; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
        ctx.strokeStyle = c2; ctx.lineWidth = 3; for (let x = -w / 2 - h; x < w / 2; x += 9) { ctx.beginPath(); ctx.moveTo(x, h / 2); ctx.lineTo(x + h, -h / 2); ctx.stroke(); }
        ctx.restore(); break;
      }
      case 'text': {
        const [, x, y, s, size, color, key, bold, rot, cs, fake] = op;
        ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(Math.PI / 2);
        ctx.font = `${key === 'cormorantitalic' ? 'italic ' : ''}${bold && BUILTIN[key] ? 'bold ' : ''}${size}px ${CSS_FAMILY[key] || CSS_FAMILY.helvetica}`;
        ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = size * 0.03; ctx.lineJoin = 'round';
        if (cs) { let dx = 0; for (const ch of s) { ctx.fillText(ch, dx, 0); if (fake) ctx.strokeText(ch, dx, 0); dx += ctx.measureText(ch).width + cs; } }
        else { ctx.fillText(s, 0, 0); if (fake) ctx.strokeText(s, 0, 0); }
        ctx.restore(); break;
      }
      default: break;
    }
  }
}

/* A preview session: the planned pages of the PDF, drawn one at a time on demand (no PDF file is built). */
function previewSession(state, opts) {
  const S = session(state, opts), cache = new Map();
  const label = spec => {
    switch (spec.type) {
      case 'cover': return 'Cover';
      case 'index': return 'Home';
      case 'year': return 'Calendar';
      case 'month': return `${MONTHS[spec.tab.month]} ${spec.tab.year}`;
      case 'week': return `Week of ${shortDate(spec.ws)}`;
      case 'day': return `Day: ${shortDate(spec.date)}`;
      default: return spec.tab.name + (spec.part ? ` (page ${spec.part + 1})` : '');
    }
  };
  return {
    count: S.specs.length, W: S.W, H: S.H,
    type: i => S.specs[i].type,
    label: i => label(S.specs[i]),
    page: i => { if (!cache.has(i)) { const pg = S.draw(S.specs[i]); cache.set(i, { vec: pg.vec, links: pg.links.filter(l => S.first.has(l.key)).map(l => ({ ...l, page: S.first.get(l.key) })) }); } return cache.get(i); },
    firstOfType: type => S.specs.findIndex(s => s.type === type),
    fonts: [...fontKeys(state, { ...DEFAULTS, ...opts })],
  };
}

window.JournalPDF = {
  paint, previewSession, CSS_FAMILY,
  resolvedFonts: (state, opts) => { const o = { ...DEFAULTS, ...opts }; return { body: resolveFont(state, o), head: resolveHead(state, o), title: resolveTitle(state, o) }; },
  DEFAULTS, generate,
  ready: (state, opts) => { const o = { ...DEFAULTS, ...opts }; return Promise.all(fontKeys(state, o).map(loadFont)).catch(() => {}); },
  count: (state, opts) => session(state, opts).count,
};
})();
