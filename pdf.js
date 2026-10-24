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
const M = 36;           // page margin
const TOP = 52;         // below the tab strip
const BODY_TOP = 124;   // below title + nav row

const DEFAULTS = { font: 'auto', size: 'a4', orient: 'portrait', useTheme: true, weekly: 'rows', daily: 'none', dailyStyle: 'lined', notesStyle: 'lined', notesPages: 2 };

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
};
/* optical size correction so small-x-height faces stay legible at the same nominal size */
const SCALE = { caveat: 1.22, indieflower: 1.08, patrickhand: 1.05, quicksand: 1.0 };
const AUTO_FONT = {
  georgia: 'times', 'times new roman': 'times', 'palatino linotype': 'times', lora: 'lora', merriweather: 'merriweather',
  'playfair display': 'playfair', quicksand: 'quicksand', caveat: 'caveat', 'segoe print': 'caveat', 'patrick hand': 'patrickhand',
  'indie flower': 'indieflower', 'special elite': 'specialelite', 'ui-monospace': 'courier',
};
const autoFont = css => AUTO_FONT[(css || '').split(',')[0].trim().replace(/["']/g, '').toLowerCase()] || 'helvetica';
const resolveFont = (state, o) => (BUILTIN[o.font] || EMBEDDED[o.font]) ? o.font : autoFont(state.theme.font);

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
const emb = () => loaded[curFont] || null;
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

let curFont = 'helvetica', measureCtx; const mcache = new Map();
function tw(s, size, bold) {
  const F = emb();
  if (F) {
    let sum = 0; for (const g of gidsOf(F, s)) sum += F.adv(g);
    return sum / F.upm * size * (SCALE[curFont] || 1) * (bold ? 1.04 : 1);
  }
  const fam = BUILTIN[curFont] || BUILTIN.helvetica, k = (BUILTIN[curFont] ? curFont : 'helvetica') + (bold ? 'b' : 'r') + s;
  let w = mcache.get(k);
  if (w === undefined) {
    measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
    measureCtx.font = (bold ? 'bold ' : '') + '100px ' + fam.css;
    w = measureCtx.measureText(enc(s)).width / 100;
    mcache.set(k, w);
  }
  return w * size;
}
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
class Pg {
  constructor(W, H) { this.W = W; this.H = H; this.ops = []; this.links = []; }
  rect(x, y, w, h, fill, stroke, lw) {
    let o = '';
    if (fill) o += rg(fill) + ' rg ';
    if (stroke) o += rg(stroke) + ' RG ' + (lw || 0.6) + ' w ';
    this.ops.push(`${o}${f(x)} ${f(this.H - y - h)} ${f(w)} ${f(h)} re ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
  }
  line(x1, y1, x2, y2, c, lw) { this.ops.push(`${rg(c)} RG ${lw || 0.5} w ${f(x1)} ${f(this.H - y1)} m ${f(x2)} ${f(this.H - y2)} l S`); }
  dots(x, y, w, h, step, c) {
    this.ops.push(`q ${rg(c)} RG 1.4 w 1 J [0 ${step}] 0 d`);
    for (let yy = y; yy <= y + h + 0.1; yy += step) this.ops.push(`${f(x)} ${f(this.H - yy)} m ${f(x + w)} ${f(this.H - yy)} l S`);
    this.ops.push('Q');
  }
  text(x, y, s, size, color, bold) {
    const F = emb();
    if (F) {                                   // embedded CID font: hex glyph ids, faux bold via stroke
      const hexs = gidsOf(F, s).map(g => g.toString(16).padStart(4, '0')).join('');
      this.ops.push(`q ${bold ? `${rg(color)} RG ${f(size * 0.03)} w 2 Tr ` : ''}BT /F1 ${f(size * (SCALE[curFont] || 1))} Tf ${rg(color)} rg ${f(x)} ${f(this.H - y)} Td <${hexs}> Tj ET Q`);
    } else this.ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rg(color)} rg ${f(x)} ${f(this.H - y)} Td ${pdfStr(s)} Tj ET`);
  }
  link(x, y, w, h, key) { if (key) this.links.push({ x, y, w, h, key }); }
}

/* ---------- the document session: plan pages, then draw them ---------- */
function session(state, optsIn) {
  const o = { ...DEFAULTS, ...optsIn };
  const fontKey = resolveFont(state, o);
  curFont = fontKey;
  const [bw, bh] = SIZES[o.size] || SIZES.a4;
  const W = o.orient === 'landscape' ? bh : bw, H = o.orient === 'landscape' ? bw : bh;
  const th = state.theme;
  const C = o.useTheme
    ? { paper: th.paper, ink: th.ink, accent: th.accent, today: th.today }
    : { paper: '#ffffff', ink: '#222222', accent: th.accent, today: '#fff1b8' };
  C.muted = mix(C.ink, C.paper, 0.45); C.line = mix(C.paper, C.ink, 0.2); C.faint = mix(C.paper, C.ink, 0.1);
  C.dot = mix(C.paper, C.ink, 0.38);
  const today = todayKey();
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
      for (let i = 1; i <= rows; i++) { const yy = L.ty0 + i * L.step; pg.line(x + 20, yy, x + w, yy, C.line, 0.6); pg.rect(x, yy - 13, 11, 11, null, C.muted, 0.7); }
    } else if (style === 'schedule') {
      const hrs = 16, rh = Math.min(30, h / hrs), half = Math.round(w * 0.5) - 8;
      for (let i = 0; i < hrs; i++) {
        const hr = 6 + i, yy = y + (i + 1) * rh;
        pg.line(x + 36, yy, x + half, yy, C.line, 0.6);
        pg.text(x, yy - 4, `${hr % 12 || 12} ${hr < 12 ? 'AM' : 'PM'}`, 8, C.muted);
      }
      pg.text(x + half + 20, y + 10, 'To-do', 9, C.muted, true);
      for (let yy = y + 36, n = 0; yy < y + h && n < 20; yy += 26, n++) { pg.line(x + half + 38, yy, x + w, yy, C.line, 0.6); pg.rect(x + half + 20, yy - 12, 11, 11, null, C.muted, 0.7); }
    }
  }

  /* ----- planning ----- */
  const specs = [], first = new Map();
  const add = (spec, keys) => { spec.i = specs.length; specs.push(spec); (keys || []).forEach(k => { if (!first.has(k)) first.set(k, spec.i); }); };
  const wantDay = k => o.daily === 'all' || (o.daily === 'entries' && state.days[k]);
  const doneWeeks = new Set();
  const notesBox = { x: M, y: BODY_TOP - 14, w: W - 2 * M, h: H - 36 - (BODY_TOP - 14) };

  for (const tab of state.tabs) {
    const tk = 'tab:' + tab.id;
    if (tab.kind === 'index' || tab.kind === 'year') add({ type: tab.kind, tab }, [tk]);
    else if (tab.kind === 'month') {
      add({ type: 'month', tab }, [tk]);
      for (let d = 1; d <= daysIn(tab.year, tab.month); d++) {
        const k = dateKey(tab.year, tab.month, d), ws = weekStartOf(k);
        if (o.weekly !== 'none' && !doneWeeks.has(ws)) { doneWeeks.add(ws); add({ type: 'week', tab, ws }, ['week:' + ws]); }
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
  function chrome(pg, activeTab) {
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
    pg.rect(M, 36, W - 2 * M, 2.5, activeTab ? activeTab.color : C.accent);
  }
  function title(pg, text, sub) {
    pg.text(M, 72, fit(text, 22, W - 2 * M, true), 22, C.ink, true);
    if (sub) pg.text(M, 87, sub, 10, C.muted);
  }
  function navBar(pg, left, right) {
    const y = 94, h = 18, wid = it => tw(it.label, 9, true) + 16;
    const place = (it, x) => { pg.rect(x, y, wid(it), h, C.faint, C.line, 0.6); pg.text(x + 8, y + 12.5, it.label, 9, C.accent, true); pg.link(x, y, wid(it), h, it.key); };
    let x = M;
    for (const it of left.filter(i => i.key)) { place(it, x); x += wid(it) + 6; }
    const r = right.filter(i => i.key);
    x = W - M - r.reduce((t, i) => t + wid(i) + 6, -6);
    for (const it of r) { place(it, x); x += wid(it) + 6; }
  }
  const monthTabs = state.tabs.filter(t => t.kind === 'month');

  /* ----- page types ----- */
  function indexPage(pg, spec) {
    chrome(pg, spec.tab);
    title(pg, state.title, 'Tap a tab at the top, or any link below, to jump around.');
    const items = [];
    if (dayTarget(today)) items.push({ name: 'Today', sub: shortDate(today), color: C.accent, key: dayTarget(today) });
    state.tabs.filter(t => t.kind !== 'index' && first.has('tab:' + t.id)).forEach(t =>
      items.push({ name: t.name, sub: { year: 'Year overview', month: `${MONTHS[t.month]} ${t.year}`, notes: 'Notes' }[t.kind], color: t.color, key: 'tab:' + t.id }));
    const cols = W > H ? 3 : 2, gap = 10, cw = (W - 2 * M - (cols - 1) * gap) / cols, ch = 44;
    items.forEach((it, i) => {
      const x = M + (i % cols) * (cw + gap), y = BODY_TOP + Math.floor(i / cols) * (ch + gap);
      if (y + ch > H - 30) return;
      pg.rect(x, y, cw, ch, C.faint, C.line, 0.6); pg.rect(x, y, 8, ch, it.color);
      pg.text(x + 18, y + 19, fit(it.name, 13, cw - 26, true), 13, C.ink, true); pg.text(x + 18, y + 34, fit(it.sub || '', 8.5, cw - 26), 8.5, C.muted);
      pg.link(x, y, cw, ch, it.key);
    });
  }

  function yearPage(pg, spec) {
    const tab = spec.tab; chrome(pg, tab);
    const label = tab.month === 0 ? tab.year : `${tab.year}-${tab.year + 1}`;
    title(pg, `${tab.name} ${label}`, 'Tap a month name or any day to jump to its page.');
    const cols = W > H ? 4 : 3, rows = 12 / cols, gap = 14;
    const cw = (W - 2 * M - (cols - 1) * gap) / cols, ch = (H - 36 - BODY_TOP - (rows - 1) * gap) / rows;
    for (let i = 0; i < 12; i++) {
      const month = (tab.month + i) % 12, year = tab.year + Math.floor((tab.month + i) / 12);
      const x = M + (i % cols) * (cw + gap), y = BODY_TOP + Math.floor(i / cols) * (ch + gap);
      const mt = monthTabs.find(t => t.month === month && t.year === year), mcolor = mt ? mt.color : C.ink;
      pg.text(x, y + 10, `${MONTHS[month]} ${year}`, 10.5, mcolor, true);
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
    const tab = spec.tab; chrome(pg, tab);
    title(pg, `${MONTHS[tab.month]} ${tab.year}`);
    const i = monthTabs.indexOf(tab), yt = state.tabs.find(t => t.kind === 'year');
    navBar(pg,
      [{ label: '< ' + (monthTabs[i - 1] ? MONTHS[monthTabs[i - 1].month].slice(0, 3) : ''), key: monthTabs[i - 1] && 'tab:' + monthTabs[i - 1].id }],
      [{ label: (monthTabs[i + 1] ? MONTHS[monthTabs[i + 1].month].slice(0, 3) : '') + ' >', key: monthTabs[i + 1] && 'tab:' + monthTabs[i + 1].id }, { label: 'Year', key: yt && 'tab:' + yt.id }]);
    const off = (new Date(tab.year, tab.month, 1).getDay() - state.weekStart + 7) % 7, n = daysIn(tab.year, tab.month), rows = Math.ceil((off + n) / 7);
    const wkW = o.weekly !== 'none' ? 26 : 0, gx = M + wkW, gw = W - M - gx, cw = gw / 7, hy = BODY_TOP - 4, ch = (H - 36 - hy - 16) / rows;
    for (let c = 0; c < 7; c++) pg.text(gx + c * cw + 4, hy + 8, DOWS[(c + state.weekStart) % 7], 9, C.muted, true);
    for (let d = 1; d <= n; d++) {
      const k = dateKey(tab.year, tab.month, d), idx = off + d - 1, x = gx + (idx % 7) * cw, y = hy + 16 + Math.floor(idx / 7) * ch;
      pg.rect(x, y, cw, ch, k === today ? C.today : null, C.line, 0.6);
      pg.text(x + 4, y + 13, String(d), 11, C.ink, true);
      const entry = state.days[k];
      if (entry) drawPlainSnippet(pg, entry, x + 4, y + 24, cw - 8, Math.floor((ch - 28) / 9));
      pg.link(x, y, cw, ch, dayTarget(k));
    }
    if (wkW) for (let r = 0; r < rows; r++) {
      const k = dateKey(tab.year, tab.month, Math.max(1, r * 7 - off + 1)), key = first.has('week:' + weekStartOf(k)) ? 'week:' + weekStartOf(k) : null, y = hy + 16 + r * ch;
      pg.rect(M, y, wkW - 2, ch, C.faint, C.line, 0.6);
      pg.text(M + 3, y + 13, 'W' + (r + 1), 8, C.accent, true); pg.link(M, y, wkW - 2, ch, key);
    }
  }
  function drawPlainSnippet(pg, text, x, y, w, maxLines) {
    wrapRich(text.replace(/\[\[([^\]]+)\]\]/g, '$1'), w, 7).slice(0, Math.max(0, maxLines)).forEach((ln, i) =>
      pg.text(x, y + i * 9, ln.map(wd => wd.t).join(' '), 7, C.muted));
  }

  /* one day's box in a week page: label + ruled writing lines + prefilled entry */
  function dayBox(pg, k, x, y, w, h, side) {
    const labelW = side ? 64 : 0, ly = side ? y : y + 20, lh = side ? h : h - 20;
    pg.rect(x, y, w, h, null, C.line, 0.7);
    if (side) pg.rect(x, y, labelW, h, k === today ? C.today : C.faint, C.line, 0.7);
    else pg.rect(x, y, w, 20, k === today ? C.today : C.faint, C.line, 0.7);
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
    const tab = spec.tab, ws = spec.ws, days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    chrome(pg, tab);
    const a = parseKey(ws), b = parseKey(days[6]);
    title(pg, `Week of ${shortDate(ws)}`, `${shortDate(ws)}${a.y !== b.y ? ', ' + a.y : ''} - ${shortDate(days[6])}, ${b.y}`);
    navBar(pg,
      [{ label: '< Prev week', key: first.has('week:' + addDays(ws, -7)) ? 'week:' + addDays(ws, -7) : null }, { label: 'Next week >', key: first.has('week:' + addDays(ws, 7)) ? 'week:' + addDays(ws, 7) : null }],
      [{ label: MONTHS[tab.month] + ' ' + tab.year, key: 'tab:' + tab.id }]);
    const x = M, y = BODY_TOP, w = W - 2 * M, h = H - 36 - y;
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
    const k = spec.date, tab = spec.tab, { y: yy, m, d } = parseKey(k), ws = weekStartOf(k);
    chrome(pg, tab);
    title(pg, `${DOW_FULL[dowOf(k)]}, ${MONTHS[m]} ${d}, ${yy}`);
    navBar(pg,
      [{ label: '< ' + shortDate(addDays(k, -1)), key: dayTarget(addDays(k, -1)) }, { label: shortDate(addDays(k, 1)) + ' >', key: dayTarget(addDays(k, 1)) }],
      [{ label: 'Week', key: first.has('week:' + ws) ? 'week:' + ws : null }, { label: MONTHS[tab.month].slice(0, 3) + ' ' + tab.year, key: 'tab:' + tab.id }]);
    let y = BODY_TOP; const w = W - 2 * M, bottom = H - 36;
    const entry = state.days[k];
    if (entry) {
      const lines = wrapRich(entry, w, 11), max = Math.max(1, Math.floor((bottom - y) * 0.4 / 16)), shown = lines.length > max ? max : lines.length;
      drawRich(pg, lines, M, y + 12, 16, 11, max);
      if (lines.length > max) pg.text(M, y + 12 + shown * 16, '... (continues in the app)', 9, C.muted);
      y += shown * 16 + 18 + (lines.length > max ? 14 : 0);
      pg.line(M, y - 6, W - M, y - 6, C.line, 0.8);
    }
    drawStyleBg(pg, o.dailyStyle, M, y, w, bottom - y);
  }

  function notesPage(pg, spec) {
    const tab = spec.tab; chrome(pg, tab);
    title(pg, tab.name + (spec.part ? ' (cont.)' : ''), spec.count > 1 ? `Page ${spec.part + 1} of ${spec.count}` : '');
    const b = notesBox;
    drawStyleBg(pg, o.notesStyle, b.x, b.y, b.w, b.h);
    const L = styleLayout(o.notesStyle, b.x, b.y, b.w, b.h);
    drawRich(pg, spec.lines, L.tx + 2, L.ty0 + L.step - 5, L.step, L.size, 9999);
  }

  const draw = spec => {
    const pg = new Pg(W, H);
    ({ index: indexPage, year: yearPage, month: monthPage, week: weekPage, day: dayPage, notes: notesPage })[spec.type](pg, spec);
    return pg;
  };
  return { specs, first, W, H, draw, fontKey, count: specs.length };
}

/* ---------- PDF serialisation ---------- */
const deflate = str => deflateBytes(latin1(str));
async function deflateBytes(bytes) {
  if (typeof CompressionStream === 'undefined') return { bytes, filter: '' };
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return { bytes: new Uint8Array(await new Response(stream).arrayBuffer()), filter: '/Filter /FlateDecode ' };
}

async function generate(state, opts) {
  await loadFont(resolveFont(state, { ...DEFAULTS, ...opts }));
  const F = loaded[resolveFont(state, { ...DEFAULTS, ...opts })];
  if (F) F.used.clear();
  const S = session(state, opts), n = S.specs.length, W = S.W, H = S.H;
  curFont = S.fontKey;
  const pages = S.specs.map(S.draw);
  const pageObj = i => 5 + 2 * i, contentObj = i => 6 + 2 * i;
  let next = 5 + 2 * n;                                         // annotation ids start after all page/content objects
  const annots = pages.map(pg => pg.links.map(l => ({ id: next++, l })).filter(a => S.first.has(a.l.key)));
  const outline = state.tabs.filter(t => S.first.has('tab:' + t.id)).map(t => ({ id: 0, title: t.name, page: S.first.get('tab:' + t.id) }));
  const outRoot = outline.length ? next++ : 0;
  outline.forEach(it => { it.id = next++; });
  const infoId = next++;
  const E = F ? { type0: next++, cid: next++, desc: next++, file: next++, tou: next++ } : null;
  const total = next;

  const chunks = [], offsets = []; let off = 0;
  const w = x => { const b = typeof x === 'string' ? latin1(x) : x; chunks.push(b); off += b.length; };
  const obj = (id, body) => { offsets[id] = off; w(`${id} 0 obj\n${body}\nendobj\n`); };

  w('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n');
  obj(1, `<< /Type /Catalog /Pages 2 0 R${outRoot ? ` /Outlines ${outRoot} 0 R /PageMode /UseOutlines` : ''} >>`);
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => pageObj(i) + ' 0 R').join(' ')}] /Count ${n} >>`);
  const B = BUILTIN[S.fontKey] || BUILTIN.helvetica;
  obj(3, `<< /Type /Font /Subtype /Type1 /BaseFont /${B.base} /Encoding /WinAnsiEncoding >>`);
  obj(4, `<< /Type /Font /Subtype /Type1 /BaseFont /${B.bold} /Encoding /WinAnsiEncoding >>`);

  for (let i = 0; i < n; i++) {
    const ann = annots[i].map(a => a.id + ' 0 R').join(' ');
    obj(pageObj(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /Resources << /Font << ${E ? `/F1 ${E.type0} 0 R` : '/F1 3 0 R /F2 4 0 R'} >> >> /Contents ${contentObj(i)} 0 R${ann ? ` /Annots [${ann}]` : ''} >>`);
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

  if (E) {
    const name = EMBEDDED[S.fontKey], gids = [...F.used.keys()].sort((a, b) => a - b), sc = 1000 / F.upm;
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

window.JournalPDF = {
  DEFAULTS, generate,
  ready: (state, opts) => loadFont(resolveFont(state, { ...DEFAULTS, ...opts })).catch(() => {}),
  count: (state, opts) => session(state, opts).count,
};
})();
