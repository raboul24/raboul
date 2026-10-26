/* Calendar Journal: a planner builder.
   Pick a style, choose the pages, arrange the tabs, then export a hyperlinked PDF for GoodNotes, Notability or Notes+.
   The page you see in the preview is drawn by pdf.js, the same code that writes the PDF, so what you see is what you export.
   (Optional) When served by the Java backend in backend/, the journal is also saved there. See the "Optional Java backend" section. */
(() => {
'use strict';

const STORE_KEY = 'calendar-journal-v1';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_COLORS = ['#5b7fa6','#8e6bb0','#4f9d8a','#6aa84f','#c9a227','#e0873a','#d9534f','#c2548d','#a0663c','#7a8b3c','#4c7aa0','#5d6d7e'];

const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayKey = () => { const t = new Date(); return dateKey(t.getFullYear(), t.getMonth(), t.getDate()); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);

/* ---------- Colors: three independent layers ----------
   1. page color   (paper + text)            2. accent (lines, titles, highlights)     3. tab palette
   Changing one layer never changes another, except where it must stay readable: the accent is lightened
   automatically on dark pages, and the "Match accent" tab palette follows the accent. */
const hexRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - t) + B[i] * t).toString(16).padStart(2, '0')).join(''); };
const lumOf = h => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

const PAGE_COLORS = {
  sand:  { label: 'Sand',       paper: '#f5efe3', ink: '#4a4036' },
  white: { label: 'White',      paper: '#ffffff', ink: '#2b2a33' },
  blush: { label: 'Blush',      paper: '#fbefed', ink: '#4a3535' },
  sage:  { label: 'Sage Mist',  paper: '#d3d9c4', ink: '#2f3a2c' },
  lilac: { label: 'Lilac Mist', paper: '#c6badf', ink: '#2e2548' },
  mist:  { label: 'Blue Mist',  paper: '#93a8b3', ink: '#1f2e37' },
  olive: { label: 'Olive',      paper: '#7f8d62', ink: '#fbf7e8' },
  slate: { label: 'Slate',      paper: '#52667a', ink: '#f1f5f8' },
  plum:  { label: 'Plum',       paper: '#5b4b80', ink: '#f5effc' },
  cocoa: { label: 'Cocoa',      paper: '#7a6355', ink: '#f7efe5' },
};
const ACCENTS = [['Gold', '#b59a6b'], ['Rose', '#c9788a'], ['Terracotta', '#c0563b'], ['Sage', '#7b8a5e'], ['Teal', '#3f8a8c'],
  ['Sky', '#6f9fd1'], ['Indigo', '#5b6bb5'], ['Plum', '#8a5a9e'], ['Slate', '#5d6d7e'], ['Charcoal', '#3a3a3a']];
const TAB_PALETTES = {
  neutral: { label: 'Neutral', colors: ['#c9b48a', '#b59a6b', '#a58b5e', '#d3c3a0', '#9a8660', '#bfae8a'] },
  pastel:  { label: 'Pastel',  colors: ['#e8a5a5', '#f2c6a0', '#b9d2a8', '#a8cbd6', '#c9b6e0', '#e6b8cf'] },
  jewel:   { label: 'Jewel',   colors: ['#8a3b52', '#2f6f6a', '#3b4a8a', '#9a7228', '#6a3b8a', '#2f6a3b'] },
  earth:   { label: 'Earth',   colors: ['#c2815b', '#d9a566', '#a8a77a', '#8e6f5a', '#d0b8a0', '#b58a8a'] },
  mono:    { label: 'Mono',    colors: ['#4a4a4a', '#6c6c6c', '#8e8e8e', '#b0b0b0', '#5a5a5a', '#7c7c7c'] },
  match:   { label: 'Match accent', colors: null },
};
/* One-tap starting points. They only set the three layers above; each layer can still be changed afterwards. */
const COMBOS = [
  { name: 'Sand & Gold',    page: 'sand',  accent: '#b59a6b', tabs: 'neutral' },
  { name: 'Blush Garden',   page: 'blush', accent: '#c9788a', tabs: 'pastel' },
  { name: 'Sage Studio',    page: 'sage',  accent: '#7b8a5e', tabs: 'earth' },
  { name: 'Midnight Plum',  page: 'plum',  accent: '#b59a6b', tabs: 'jewel' },
  { name: 'Ocean Calm',     page: 'mist',  accent: '#5b6bb5', tabs: 'pastel' },
  { name: 'Cocoa Cream',    page: 'cocoa', accent: '#b59a6b', tabs: 'earth' },
  { name: 'Clean White',    page: 'white', accent: '#5d6d7e', tabs: 'mono' },
  { name: 'Lilac Dream',    page: 'lilac', accent: '#8a5a9e', tabs: 'match' },
];
const effectiveAccent = (base, paper) => lumOf(paper) < 0.5 ? mixHex(base, '#ffffff', 0.5) : base;     // keep the accent readable on dark pages
const todayFor = (paper, accent) => lumOf(paper) > 0.5 ? mixHex(accent, paper, 0.72) : mixHex(paper, '#ffffff', 0.18);

function paletteColors(theme) {
  const p = TAB_PALETTES[theme.tabPalette], a = theme.accent;
  const base = p && p.colors ? p.colors                                                               // "Match accent" = shades of the accent
    : [mixHex(a, '#000000', 0.15), a, mixHex(a, '#ffffff', 0.2), mixHex(a, '#ffffff', 0.4), mixHex(a, '#000000', 0.3), mixHex(a, '#ffffff', 0.55)];
  return lumOf(theme.paper) < 0.5 ? base.map(c => mixHex(c, '#ffffff', 0.38)) : base;                    // lighter markers on dark pages so they stay visible
}
/* Give every tab a color from the palette (months cycle through it, the year tab uses the accent). */
function recolorTabs(tabs, theme, force) {
  if (theme.tabPalette === 'custom' && !force) return tabs;                                           // the user colored tabs by hand: leave them
  const pal = paletteColors(theme.tabPalette === 'custom' ? { ...theme, tabPalette: 'neutral' } : theme);
  let n = 0;
  tabs.forEach(t => {
    if (t.kind === 'month') t.color = pal[t.month % pal.length];
    else if (t.kind === 'year') t.color = theme.accent;
    else if (t.kind === 'index') t.color = pal[pal.length - 1];
    else t.color = pal[(n++ + 2) % pal.length];
  });
  return tabs;
}
function applyDerivedColors() {
  const t = state.theme;
  t.accent = effectiveAccent(t.accentBase, t.paper);
  t.today = todayFor(t.paper, t.accent);
  t.bar = mixHex(t.paper, t.ink, 0.08);
  recolorTabs(state.tabs, t);
}
function setPageColor(key) { const c = PAGE_COLORS[key], t = state.theme; t.pageColor = key; t.paper = c.paper; t.ink = c.ink; applyDerivedColors(); }
function setCustomPage(paper) { const t = state.theme; t.pageColor = 'custom'; t.paper = paper; t.ink = lumOf(paper) > 0.5 ? '#2b2a33' : '#f5f5f5'; applyDerivedColors(); }
function setAccent(hex) { state.theme.accentBase = hex; applyDerivedColors(); }
function setTabPalette(key) { state.theme.tabPalette = key; recolorTabs(state.tabs, state.theme, true); }
function applyCombo(c) { const t = state.theme; t.tabPalette = c.tabs; setPageColor(c.page); t.accentBase = c.accent; applyDerivedColors(); recolorTabs(state.tabs, t, true); }

/* ---------- PDF fonts ---------- */
const PDF_FONTS = {
  cormorant: 'Cormorant Garamond', greatvibes: 'Great Vibes (script)', playfair: 'Playfair Display', lora: 'Lora', merriweather: 'Merriweather',
  quicksand: 'Quicksand (rounded)', caveat: 'Caveat (handwriting)', patrickhand: 'Patrick Hand', indieflower: 'Indie Flower', specialelite: 'Special Elite (typewriter)',
  helvetica: 'Helvetica (clean sans)', times: 'Times (classic serif)', courier: 'Courier (typewriter)',
};
const FONT_SETS = {
  elegant: { font: 'cormorant', headFont: 'same', titleFont: 'greatvibes' },
  soft:    { font: 'quicksand', headFont: 'playfair', titleFont: 'playfair' },
  classic: { font: 'helvetica', headFont: 'same', titleFont: 'same' },
};
const LOOKS = [['elegant', 'Elegant'], ['soft', 'Soft'], ['classic', 'Classic']];
const NOTE_STYLES = [['blank', 'Blank'], ['lined', 'Lined'], ['dotted', 'Dotted'], ['grid', 'Grid'], ['cornell', 'Cornell'], ['checklist', 'Checklist']];

/* ---------- Calendar presets ---------- */
const spanMonths = (startMonth, year) =>
  Array.from({ length: 12 }, (_, i) => ({ month: (startMonth + i) % 12, year: year + Math.floor((startMonth + i) / 12) }));

const monthTabs = (startMonth, year) => spanMonths(startMonth, year).map(({ month, year: y }) =>
  ({ id: uid(), name: MONTHS[month].slice(0, 3), kind: 'month', color: MONTH_COLORS[month], year: y, month }));

const mk = (name, kind, color, extra = {}) => ({ id: uid(), name, kind, color, ...extra });

const PRESETS = {
  full:     { label: 'Full year', desc: 'Index, year overview, Jan–Dec, notes',
              build: y => [mk('Index', 'index', '#444'), mk('Year', 'year', '#c0563b', { year: y, month: 0 }), ...monthTabs(0, y), mk('Notes', 'notes', '#777')] },
  academic: { label: 'Academic year', desc: 'August to July',
              build: y => [mk('Index', 'index', '#444'), mk('School Year', 'year', '#c0563b', { year: y, month: 7 }), ...monthTabs(7, y), mk('Notes', 'notes', '#777')] },
  fiscal:   { label: 'Fiscal year', desc: 'April to March',
              build: y => [mk('Index', 'index', '#444'), mk('Fiscal Year', 'year', '#c0563b', { year: y, month: 3 }), ...monthTabs(3, y), mk('Notes', 'notes', '#777')] },
  monthly:  { label: 'Monthly planner', desc: 'Index and 12 month pages, no year page',
              build: y => [mk('Index', 'index', '#444'), ...monthTabs(0, y)] },
  minimal:  { label: 'Minimal', desc: 'Index, year, Goals and Notes',
              build: y => [mk('Index', 'index', '#444'), mk('Year', 'year', '#c0563b', { year: y, month: 0 }), mk('Goals', 'notes', '#4f9d8a'), mk('Notes', 'notes', '#777')] },
};


/* ---------- State ---------- */
const DEFAULT_PDF = {
  size: 'a4', orient: 'portrait', useTheme: true, weekly: 'planner', daily: 'none', dailyLayout: 'planner', dailyStyle: 'dotted',
  notesStyle: 'lined', notesPages: 2, coverPage: true, font: 'cormorant', headFont: 'same', titleFont: 'greatvibes',
};
const defaultState = () => {
  const year = new Date().getFullYear();
  const theme = {
    pageColor: 'sand', paper: '#f5efe3', ink: '#4a4036', accentBase: '#b59a6b', accent: '#b59a6b', today: '#e8d7ae', bar: '#e9dfcc', tabPalette: 'neutral',
    font: '"Cormorant Garamond", Georgia, serif', headFont: '', titleFont: '"Great Vibes", cursive',      // legacy fields, kept so older saved journals and the Java server keep working
  };
  return { title: 'My Calendar Journal', year, weekStart: 0, look: 'elegant', cover: 'frame', theme, tabs: recolorTabs(PRESETS.full.build(year), theme, true), days: {}, notes: {}, pdf: { ...DEFAULT_PDF } };
};
/* Bring a journal saved by an older version up to the current shape. */
function migrate(s) {
  const saved = s.theme || {};                                                    // look at what was really saved, before defaults fill the gaps
  const t = s.theme = { ...defaultState().theme, ...saved };
  if (!saved.pageColor || (!PAGE_COLORS[saved.pageColor] && saved.pageColor !== 'custom')) {
    const hit = Object.entries(PAGE_COLORS).find(([, c]) => c.paper.toLowerCase() === String(t.paper).toLowerCase());
    t.pageColor = hit ? hit[0] : 'custom';
  }
  if (!saved.accentBase) t.accentBase = t.accent;
  if (!saved.tabPalette) t.tabPalette = 'custom';                                 // older journals colored tabs themselves: keep them as they are
  s.look = s.look || 'elegant';
  if (s.cover === undefined) s.cover = 'frame';
  s.pdf = { ...DEFAULT_PDF, ...(s.pdf || {}) };
  if (['auto', undefined].includes(s.pdf.font) || ['auto'].includes(s.pdf.headFont) || ['auto'].includes(s.pdf.titleFont)) {
    const r = JournalPDF.resolvedFonts(s, { ...s.pdf, look: s.look });             // turn the old "match the journal" settings into explicit fonts
    if (s.pdf.font === 'auto') s.pdf.font = r.body;
    if (s.pdf.headFont === 'auto') s.pdf.headFont = r.head || 'same';
    if (s.pdf.titleFont === 'auto') s.pdf.titleFont = r.title || 'same';
  }
  s.days = s.days || {}; s.notes = s.notes || {};
  return s;
}
let state = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.tabs)) return migrate({ ...defaultState(), ...s });
  } catch (e) { /* storage unavailable or corrupt */ }
  return defaultState();
}
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    pushToServer();                      // no-op unless the Java server was found (see below)
  }, 150);
}

/* ---------- Optional Java backend (see backend/ and README.md) ----------
   When this page is served by the Java server (http://localhost:8080) the journal is also saved on that
   server, and Search appears in the ⋯ menu. When there is no server (file://, the hosted copy, offline)
   connectToServer() quietly does nothing and everything keeps using localStorage exactly as before. */
const server = { on: false, revision: 0, lastJson: null, timer: null, busy: false };
const REV_KEY = STORE_KEY + '-server-revision';

async function api(path, options = {}, timeoutMs = 4000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
  try { return await fetch(path, { ...options, signal: ctl.signal, headers: { 'Content-Type': 'application/json' } }); }
  finally { clearTimeout(t); }
}
function rememberRevision(rev) {
  server.revision = rev;
  try { localStorage.setItem(REV_KEY, String(rev)); } catch (e) { /* ignore */ }
}
const hasSavedLocally = () => { try { return localStorage.getItem(STORE_KEY) !== null; } catch (e) { return false; } };
const norm = s => JSON.stringify(migrate(JSON.parse(JSON.stringify({ ...defaultState(), ...s }))));        // same shape on both sides, so equal journals compare equal

async function connectToServer() {
  if (!/^https?:$/.test(location.protocol)) return;                   // opened as a file: there is no server
  try {
    const r = await api('/api/health', {}, 1500);
    if (!r.ok || (await r.json()).service !== 'journal-backend') return;   // not our server
  } catch (e) { return; }                                             // no server, blocked, or offline
  server.on = true;
  try { server.revision = Number(localStorage.getItem(REV_KEY)) || 0; } catch (e) { /* ignore */ }
  try { await syncOnLoad(); } catch (e) { /* stay local if anything goes wrong */ }
}

/* Decide, once at startup, which copy wins: this browser's or the server's. */
async function syncOnLoad() {
  const r = await api('/api/journal');
  if (r.status === 404) { if (hasSavedLocally()) await doPush(); return; }          // server is empty: upload ours
  if (!r.ok) return;
  const remote = await r.json();                                                    // { revision, savedAt, state }
  if (norm(remote.state) === norm(state)) { rememberRevision(remote.revision); server.lastJson = JSON.stringify(state); return; }
  if (remote.revision === server.revision) { await doPush(); return; }              // server unchanged since we last synced: our edits are newer
  if (!hasSavedLocally()) { adopt(remote); return; }                                // brand-new browser: take the server's copy
  await resolveConflict(remote);                                                    // both changed: ask, never overwrite silently
}
function adopt(remote) {
  state = migrate({ ...defaultState(), ...remote.state });
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  rememberRevision(remote.revision);
  server.lastJson = JSON.stringify(state);
  renderAll();
}
async function resolveConflict(remote) {
  const when = new Date(remote.savedAt).toLocaleString();
  const useServer = await askConfirm(`The server has a different copy of this journal (saved ${when}, revision ${remote.revision}). Use the server copy, or keep this device's version and replace the server's?`, 'Use server copy', 'Keep this device');
  if (useServer) adopt(remote);
  else { rememberRevision(remote.revision); await doPush(); }
}
function pushToServer() {
  if (!server.on) return;
  clearTimeout(server.timer);
  server.timer = setTimeout(doPush, 800);                            // wait for a pause in typing
}
async function doPush() {
  const body = JSON.stringify(state);
  if (body === server.lastJson) return;                              // nothing new to send
  if (server.busy) return pushToServer();
  server.busy = true;
  try {
    const r = await api('/api/journal?baseRevision=' + server.revision, { method: 'PUT', body });
    if (r.ok) { rememberRevision((await r.json()).revision); server.lastJson = body; }
    else if (r.status === 409) await resolveConflict(await r.json());
  } catch (e) { /* server unreachable: keep working locally, we retry on the next save */ }
  finally { server.busy = false; }
}


/* In-page replacements for confirm()/alert(), which the hosted viewer disables. */
function askConfirm(message, okLabel = 'Confirm', cancelLabel = 'Cancel') {
  return new Promise(resolve => {
    const m = $('modal');
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><p>${esc(message)}</p><div class="row"><button class="btn" data-m="no">${esc(cancelLabel)}</button><button class="btn btn-primary" data-m="yes">${esc(okLabel)}</button></div></div>`;
    m.hidden = false;
    const done = v => { m.hidden = true; m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') done(false); };
    document.addEventListener('keydown', onKey);
    m.onclick = e => { const b = e.target.closest('[data-m]'); if (b) done(b.dataset.m === 'yes'); else if (e.target === m) done(false); };
    m.querySelector('[data-m="yes"]').focus();
  });
}
let toastTimer;
function notify(message) {
  const t = $('toast'); t.textContent = message; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 5000);
}
/* Save a file: through the viewer's downloads capability when hosted, otherwise a normal download. */
async function saveFile(filename, blob) {
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename, data: blob }); notify(`Saved ${filename}`); }
    catch (err) { if (!err || err.code !== 'declined') notify(`Could not save ${filename}: ${(err && (err.message || err.code)) || 'unknown error'}`); }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ---------- PDF options ---------- */
const pdfOpts = () => ({ ...JournalPDF.DEFAULTS, ...state.pdf, look: state.look || 'elegant' });
const fileName = () => (state.title.replace(/[^\w -]+/g, '').trim() || 'calendar-journal') + '.pdf';

/* ---------- UI state ---------- */
const ui = { step: 'style' };
const view = { page: 0, sess: null, token: 0 };
const STEPS = [
  ['style', 'Style', '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 21 9.7C21 5.9 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>'],
  ['pages', 'Pages', '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>'],
  ['tabs', 'Tabs', '<rect x="3" y="4" width="14" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="10" height="4" rx="1"/>'],
  ['export', 'Export', '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M5 21h14"/>'],
];
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

/* small building blocks used by all steps */
const card = (title, hint, body) => `<section class="card"><header class="card-h"><h3>${title}</h3>${hint ? `<p class="hint">${hint}</p>` : ''}</header>${body}</section>`;
const chips = (name, options, current) => `<div class="chips" role="radiogroup">${options.map(([v, label]) => {
  const on = String(current) === String(v);
  return `<button type="button" class="chip${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-opt="${name}" data-value="${esc(v)}">${esc(label)}</button>`;
}).join('')}</div>`;
const toggle = (name, label, on, hint) => `<label class="switch-row"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span><input type="checkbox" class="switch" data-toggle="${name}"${on ? ' checked' : ''}></label>`;
const dots = colors => `<span class="dots">${colors.map(c => `<i style="background:${c}"></i>`).join('')}</span>`;

/* ---------- Step 1: Style ---------- */
function stepStyle() {
  const t = state.theme, p = pdfOpts();
  const combos = COMBOS.map((c, i) => {
    const pc = PAGE_COLORS[c.page], acc = effectiveAccent(c.accent, pc.paper), tabs = paletteColors({ paper: pc.paper, accent: acc, tabPalette: c.tabs });
    const on = t.pageColor === c.page && t.accentBase.toLowerCase() === c.accent && t.tabPalette === c.tabs;
    return `<button type="button" class="combo${on ? ' on' : ''}" data-combo="${i}" title="${c.name}"><span class="combo-sheet" style="background:${pc.paper};box-shadow:inset 0 0 0 2px ${acc}66"><i style="background:${acc}"></i></span>${dots(tabs.slice(0, 3))}<small>${c.name}</small></button>`;
  }).join('');
  const pageSw = Object.entries(PAGE_COLORS).map(([k, c]) =>
    `<button type="button" class="swatch${t.pageColor === k ? ' on' : ''}" data-page-color="${k}" title="${c.label}"><span style="background:${c.paper}"></span><small>${c.label}</small></button>`).join('')
    + `<label class="swatch custom${t.pageColor === 'custom' ? ' on' : ''}" title="Custom page color"><span style="background:${t.pageColor === 'custom' ? t.paper : 'conic-gradient(#e66,#ec6,#6c8,#6ae,#a6e,#e66)'}"></span><small>Custom</small><input type="color" id="customPage" value="${t.paper}"></label>`;
  const accSw = ACCENTS.map(([n, h]) =>
    `<button type="button" class="swatch small${t.accentBase.toLowerCase() === h ? ' on' : ''}" data-accent="${h}" title="${n}"><span style="background:${h}"></span><small>${n}</small></button>`).join('')
    + `<label class="swatch small custom${ACCENTS.some(a => a[1] === t.accentBase.toLowerCase()) ? '' : ' on'}" title="Custom accent"><span style="background:${ACCENTS.some(a => a[1] === t.accentBase.toLowerCase()) ? 'conic-gradient(#e66,#ec6,#6c8,#6ae,#a6e,#e66)' : t.accentBase}"></span><small>Custom</small><input type="color" id="customAccent" value="${t.accentBase}"></label>`;
  const pal = Object.entries(TAB_PALETTES).map(([k, v]) =>
    `<button type="button" class="palette${t.tabPalette === k ? ' on' : ''}" data-palette="${k}">${dots(paletteColors({ ...t, tabPalette: k }).slice(0, 6))}<small>${v.label}</small></button>`).join('');
  const recommended = FONT_SETS[state.look];
  const fontsDiffer = ['font', 'headFont', 'titleFont'].some(k => p[k] !== recommended[k]);
  return [
    card('Starting points', 'One tap sets the page color, accent and tab colors together. Fine-tune each below.', `<div class="combos">${combos}</div>`),
    card('Look', 'The overall style of the pages.', chips('look', LOOKS, state.look || 'elegant')),
    card('Page color', 'Background and text. Text switches to light on dark pages automatically.', `<div class="swatches">${pageSw}</div>`),
    card('Accent color', 'Gold lines, titles, and highlights.', `<div class="swatches">${accSw}</div>`),
    card('Tab colors', 'The colored markers on the tabs. Edit single tabs in the Tabs step.', `<div class="palettes">${pal}</div>`),
    card('Fonts', 'Titles, headings, and body text.', `${fontPicker('pdfTitleFont')}${fontPicker('pdfHeadFont')}${fontPicker('pdfFont')}`
      + (fontsDiffer ? `<button type="button" class="link" data-fontset="${state.look}">Use the ${LOOKS.find(l => l[0] === state.look)[1]} look's recommended fonts</button>` : '')),
    card('Cover', 'The first page of the PDF.', `<div class="cover-grid">${['none', ...JournalCovers.list.map(c => c.id)].map(id => {
      const c = JournalCovers.list.find(x => x.id === id);
      return `<button type="button" class="cover-opt${(state.cover || 'none') === id ? ' on' : ''}" data-cover="${id}" title="${c ? c.label : 'No cover'}">${c ? `<canvas width="90" height="120" data-cover-canvas="${id}"></canvas>` : '<span class="cover-none">None</span>'}<small>${c ? c.label : 'No cover'}</small></button>`;
    }).join('')}</div>`),
  ].join('');
}

/* ---------- Step 2: Pages ---------- */
function stepPages() {
  const p = pdfOpts();
  const presets = Object.entries(PRESETS).map(([k, v]) => `<button type="button" class="preset" data-preset="${k}"><b>${v.label}</b><small>${v.desc}</small></button>`).join('');
  const days = Object.keys(state.days).sort();
  const rows = days.length ? days.map(k => `<div class="row-item" data-day-row="${k}">
      <input type="date" data-day-date="${k}" value="${k}" aria-label="Date">
      <input type="text" data-day-text="${k}" value="${esc(state.days[k])}" placeholder="What's happening?" aria-label="Text to print on this date">
      <button type="button" class="icon-btn" data-day-del="${k}" title="Remove" aria-label="Remove ${k}">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div>`).join('')
    : '<p class="empty">No dates yet. Add birthdays, holidays or appointments and they print on the matching calendar pages.</p>';
  return [
    card('Start from', 'Replaces your tabs with a ready-made layout. Your dates and notes are kept.', `<div class="presets">${presets}</div>`),
    card('Calendar', null, `<div class="field"><label for="yearInput">Year</label><div class="stepper"><button type="button" data-year="-1" aria-label="Previous year">−</button><input id="yearInput" type="number" min="1900" max="2200" value="${state.year}"><button type="button" data-year="1" aria-label="Next year">+</button></div></div>
      <div class="field"><label>Week starts on</label>${chips('weekStart', [[0, 'Sunday'], [1, 'Monday']], state.weekStart)}</div>`),
    card('Pages to include', 'The preview jumps to the page you change.',
      toggle('coverPage', 'Cover page', p.coverPage !== false, state.cover === 'none' ? 'Pick a cover in the Style step' : '')
      + `<div class="field"><label>Weekly pages</label>${chips('weekly', [['none', 'None'], ['rows', 'Rows'], ['grid', 'Grid'], ['planner', 'Planner']], p.weekly)}</div>`
      + `<div class="field"><label>Daily pages</label>${chips('daily', [['none', 'None'], ['entries', 'Dates with text'], ['all', 'Every day']], p.daily)}${p.daily === 'all' ? '<p class="hint warn">Every day adds about 365 pages.</p>' : ''}</div>`
      + (p.daily !== 'none' ? `<div class="field"><label>Daily layout</label>${chips('dailyLayout', [['planner', 'Daily planner'], ['simple', 'Simple page']], p.dailyLayout)}</div>`
        + (p.dailyLayout === 'simple' ? `<div class="field"><label>Daily page style</label>${chips('dailyStyle', NOTE_STYLES.concat([['schedule', 'Schedule']]), p.dailyStyle)}</div>` : '') : '')
      + `<div class="field"><label>Notes pages per tab</label><div class="stepper"><button type="button" data-notes="-1" aria-label="Fewer">−</button><output>${p.notesPages}</output><button type="button" data-notes="1" aria-label="More">+</button></div></div>`
      + `<div class="field"><label>Notes page style</label>${chips('notesStyle', NOTE_STYLES, p.notesStyle)}</div>`),
    card('Dates & events', 'Optional. Printed on the planner pages (tip: write [[Goals]] to link to a tab).', `<div class="rows" id="dayRows">${rows}</div><button type="button" class="btn btn-quiet" id="addDay">+ Add a date</button>`),
  ].join('');
}

/* ---------- Step 3: Tabs ---------- */
function stepTabs() {
  const rows = state.tabs.map((t, i) => `<div class="tab-item" data-tab-row="${t.id}">
      <div class="row-item">
        <input type="color" data-tab-color="${i}" value="${esc(t.color)}" aria-label="Color of ${esc(t.name)}">
        <input type="text" data-tab-name="${i}" value="${esc(t.name)}" aria-label="Tab name">
        <span class="kind">${{ index: 'Home', year: 'Calendar', month: 'Month', notes: 'Notes' }[t.kind] || t.kind}</span>
        <button type="button" class="icon-btn" data-up="${i}" title="Move up" aria-label="Move up"${i === 0 ? ' disabled' : ''}>${svg('<path d="m6 14 6-6 6 6"/>')}</button>
        <button type="button" class="icon-btn" data-down="${i}" title="Move down" aria-label="Move down"${i === state.tabs.length - 1 ? ' disabled' : ''}>${svg('<path d="m6 10 6 6 6-6"/>')}</button>
        <button type="button" class="icon-btn" data-del="${i}" title="Delete tab" aria-label="Delete ${esc(t.name)}">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button>
      </div>
      ${t.kind === 'notes' ? `<textarea class="note-text" data-note="${t.id}" rows="3" placeholder="Text to print on this notes page (optional)" aria-label="Text for ${esc(t.name)}">${esc(state.notes[t.id] || '')}</textarea>` : ''}
    </div>`).join('');
  return [
    card('Your tabs', 'Each tab becomes a tappable tab in the PDF, in this order.', `<div class="tab-list" id="tabList">${rows}</div>
      <div class="chips add-row"><button type="button" class="chip" id="addNotes">+ Notes page</button><button type="button" class="chip" id="addMonth">+ Month</button><button type="button" class="chip" id="addYear">+ Calendar</button></div>`),
  ].join('');
}

/* ---------- Step 4: Export ---------- */
function stepExport() {
  const p = pdfOpts(), n = view.sess ? view.sess.count : '…';
  return [
    card('Page size', 'Pick the size that fits your tablet or printer.', chips('size', [['a4', 'A4'], ['letter', 'US Letter'], ['tablet', 'Tablet 4:3']], p.size)
      + `<div class="field"><label>Orientation</label>${chips('orient', [['portrait', 'Portrait'], ['landscape', 'Landscape']], p.orient)}</div>`),
    card('Colors', null, toggle('useTheme', 'Use my page colors', p.useTheme !== false, 'Turn off for a plain white, print-friendly PDF.')),
    card('Ready to export', null, `<ul class="summary"><li><b>${n}</b> pages</li><li>${esc(state.title)}.pdf</li><li>Every tab, date and <code>[[link]]</code> is tappable</li></ul>
      <p class="hint">Save the PDF, then open it in <b>GoodNotes</b>, <b>Notability</b> or <b>Notes+</b> (Share, Open in…). Tap the tabs to jump around and write with your Apple Pencil.</p>`),
  ].join('');
}

const STEP_FN = { style: stepStyle, pages: stepPages, tabs: stepTabs, export: stepExport };

/* ---------- Font pickers: every option is drawn in its own typeface ---------- */
const FONT_CSS = JournalPDF.CSS_FAMILY;
const fontOpts = lead => [...lead, ...Object.entries(PDF_FONTS).map(([value, label]) => ({ value, label, css: FONT_CSS[value] }))];
const sameAsBody = () => [{ value: 'same', label: 'Same as body', css: FONT_CSS[pdfOpts().font] }];
const FONT_PICKERS = {
  pdfTitleFont: { title: 'Titles', opts: () => fontOpts(sameAsBody()), get: () => pdfOpts().titleFont, set: v => { state.pdf.titleFont = v; } },
  pdfHeadFont:  { title: 'Headings', opts: () => fontOpts(sameAsBody()), get: () => pdfOpts().headFont, set: v => { state.pdf.headFont = v; } },
  pdfFont:      { title: 'Body text', opts: () => fontOpts([]), get: () => pdfOpts().font, set: v => { state.pdf.font = v; } },
};
function fontPickerInner(id) {
  const P = FONT_PICKERS[id], opts = P.opts(), cur = P.get(), sel = opts.find(o => o.value === cur) || opts[0];
  return `<button type="button" class="fp-btn" aria-haspopup="listbox" aria-expanded="false" style="font-family:${esc(sel.css)}"><span>${esc(sel.label)}</span><i aria-hidden="true">▾</i></button>
    <ul class="fp-list" role="listbox" aria-label="${esc(P.title)}" hidden>${opts.map(o => `<li role="option" tabindex="-1" data-value="${esc(o.value)}" aria-selected="${o === sel}" style="font-family:${esc(o.css)}">${esc(o.label)}</li>`).join('')}</ul>`;
}
const fontPicker = id => `<div class="fp-row"><span>${FONT_PICKERS[id].title}</span><div class="fp" data-fp="${id}">${fontPickerInner(id)}</div></div>`;
function closeFontPickers(except) {
  document.querySelectorAll('.fp').forEach(el => {
    if (el === except) return;
    el.querySelector('.fp-list').hidden = true; el.querySelector('.fp-btn').setAttribute('aria-expanded', 'false');
  });
}
function toggleFontPicker(el, open) {
  closeFontPickers(open ? el : null);
  const list = el.querySelector('.fp-list'), btn = el.querySelector('.fp-btn');
  list.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  if (open) { const cur = list.querySelector('[aria-selected="true"]') || list.firstElementChild; cur.scrollIntoView({ block: 'nearest' }); cur.focus({ preventScroll: true }); }
  else btn.focus({ preventScroll: true });
}
document.addEventListener('click', e => {
  const el = e.target.closest('.fp');
  if (!el) return closeFontPickers(null);
  const opt = e.target.closest('li[data-value]'), id = el.dataset.fp;
  if (opt) { FONT_PICKERS[id].set(opt.dataset.value); commit({ focus: 'index' }); return; }       // commit redraws the panel, which closes the list
  if (e.target.closest('.fp-btn')) toggleFontPicker(el, el.querySelector('.fp-list').hidden);
});
document.addEventListener('keydown', e => {
  const el = e.target.closest && e.target.closest('.fp');
  if (!el) return;
  const list = el.querySelector('.fp-list'), items = [...list.children], i = items.indexOf(document.activeElement);
  if (e.target.classList.contains('fp-btn')) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); toggleFontPicker(el, true); } return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.activeElement.click(); }
  else if (e.key === 'Escape') { e.stopImmediatePropagation(); toggleFontPicker(el, false); }
});


function renderSteps() {
  $('steps').innerHTML = STEPS.map(([id, label, icon], i) =>
    `<button type="button" class="step${ui.step === id ? ' on' : ''}" role="tab" aria-selected="${ui.step === id}" data-step="${id}">${svg(icon)}<span>${label}</span></button>`).join('');
}
function renderPanel() {
  $('panel').innerHTML = STEP_FN[ui.step]();
  document.querySelectorAll('canvas[data-cover-canvas]').forEach(cv => JournalCovers.drawToCanvas(cv, cv.dataset.coverCanvas, state.theme));
}
function renderAll() { $('titleInput').value = state.title; document.title = state.title; renderSteps(); renderPanel(); schedulePreview(); }

/* ---------- Preview ---------- */
let previewTimer;
function schedulePreview(focusType) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => updatePreview(focusType), 120);
}
const loadCssFonts = keys => Promise.all(keys.map(k => document.fonts.load(`${k === 'cormorantitalic' ? 'italic ' : ''}18px ${JournalPDF.CSS_FAMILY[k]}`, 'Aa1').catch(() => {})));
async function updatePreview(focusType) {
  const my = ++view.token, opts = pdfOpts();
  try { await JournalPDF.ready(state, opts); } catch (e) { /* fonts optional */ }
  if (my !== view.token) return;
  const sess = JournalPDF.previewSession(state, opts);
  await loadCssFonts(sess.fonts);
  if (my !== view.token) return;
  view.sess = sess;
  if (focusType) { const i = sess.firstOfType(focusType); if (i >= 0) view.page = i; }
  view.page = Math.max(0, Math.min(view.page, sess.count - 1));
  drawStage();
}
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
function fitSheet() {
  const s = view.sess, box = $('sheetBox'), cv = $('sheet');
  const scale = Math.min(box.clientWidth / s.W, box.clientHeight / s.H), cw = Math.max(40, Math.floor(s.W * scale)), ch = Math.max(40, Math.floor(s.H * scale));
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  cv.width = Math.round(cw * dpr()); cv.height = Math.round(ch * dpr());
}
function drawStage() {
  const s = view.sess;
  if (!s) return;
  fitSheet();
  JournalPDF.paint($('sheet'), s.page(view.page), s.W);
  $('pageNum').textContent = `Page ${view.page + 1} of ${s.count}`;
  $('prevPage').disabled = view.page === 0; $('nextPage').disabled = view.page >= s.count - 1;
  const jump = $('jump');
  if (jump.dataset.count !== String(s.count) || jump.dataset.sig !== s.fonts.join()) { jump.innerHTML = Array.from({ length: s.count }, (_, i) => `<option value="${i}">${i + 1}. ${esc(s.label(i))}</option>`).join(''); jump.dataset.count = s.count; jump.dataset.sig = s.fonts.join(); }
  jump.value = String(view.page);
  $('exportInfo').textContent = `${s.count} pages · ${{ a4: 'A4', letter: 'Letter', tablet: 'Tablet' }[pdfOpts().size]} ${pdfOpts().orient}`;
  drawThumbs();
  if (ui.step === 'export') { const li = document.querySelector('.summary b'); if (li) li.textContent = s.count; }
}
function drawThumbs() {
  const s = view.sess, wanted = [['cover', 'Cover'], ['index', 'Home'], ['year', 'Calendar'], ['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['notes', 'Notes']];
  const items = wanted.map(([type, label]) => [type, label, s.firstOfType(type)]).filter(x => x[2] >= 0);
  $('thumbs').innerHTML = items.map(([type, label, i]) => `<button type="button" class="thumb${i === view.page ? ' on' : ''}" data-page="${i}" title="${label}"><canvas></canvas><small>${label}</small></button>`).join('');
  $('thumbs').querySelectorAll('.thumb').forEach((b, n) => {
    const cv = b.querySelector('canvas'), cssW = 52, cssH = Math.round(52 * s.H / s.W);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px'; cv.width = cssW * dpr(); cv.height = cssH * dpr();
    JournalPDF.paint(cv, s.page(items[n][2]), s.W);
  });
}
function goPage(i) { if (!view.sess) return; view.page = Math.max(0, Math.min(i, view.sess.count - 1)); drawStage(); }
function hitLink(e) {
  const s = view.sess; if (!s) return null;
  const r = $('sheet').getBoundingClientRect(), x = (e.clientX - r.left) / r.width * s.W, y = (e.clientY - r.top) / r.height * s.H;
  const links = s.page(view.page).links;
  for (let i = links.length - 1; i >= 0; i--) { const l = links[i]; if (x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) return l; }
  return null;
}

/* ---------- Changing things ---------- */
/* Every change goes through here: save, redraw the panel if needed, and refresh the preview (optionally jumping to a page type). */
function commit({ panel = true, focus = null } = {}) {
  save();
  if (panel) renderPanel();
  schedulePreview(focus);
}
const OPT_FOCUS = { weekly: 'week', daily: 'day', dailyLayout: 'day', dailyStyle: 'day', notesStyle: 'notes', notesPages: 'notes', coverPage: 'cover', look: null };
function setOpt(name, value) {
  if (name === 'look') state.look = value;
  else if (name === 'weekStart') state.weekStart = Number(value);
  else state.pdf[name] = name === 'notesPages' ? Math.max(1, Math.min(30, Number(value))) : value;
}
function setYear(y) {
  y = Math.max(1900, Math.min(2200, Math.round(Number(y)) || state.year));
  const delta = y - state.year;
  if (delta) state.tabs.forEach(t => { if (t.year != null) t.year += delta; });                 // shift every month/year tab, keeping your tab order
  state.year = y;
}
async function applyPreset(key) {
  const keep = state.tabs.filter(t => t.kind === 'notes' && (state.notes[t.id] || '').trim());
  if (state.tabs.length > 2 && !await askConfirm(`Use the “${PRESETS[key].label}” layout? Your tabs will be replaced (dates and notes text are kept).`, 'Use layout')) return;
  const fresh = PRESETS[key].build(state.year), names = new Set(fresh.map(t => t.name.toLowerCase()));
  state.tabs = recolorTabs([...fresh, ...keep.filter(t => !names.has(t.name.toLowerCase()))], state.theme, true);
  commit({ focus: 'month' });
}

/* ---------- Events ---------- */
document.addEventListener('click', async e => {
  const t = e.target, btn = t.closest('button, label.swatch, a');
  if (!t.closest('.menu-wrap')) closeMenu();
  if (t.closest('.fp') || t.closest('li[data-value]')) return;                         // font pickers have their own handler
  if (!btn) return;
  const d = btn.dataset;
  if (d.step) { ui.step = d.step; renderSteps(); renderPanel(); $('panel').scrollTop = 0; window.scrollTo({ top: 0 }); if (d.step === 'export') { /* summary uses the page count */ } schedulePreview({ style: view.sess && view.sess.firstOfType('cover') >= 0 ? 'cover' : 'index', tabs: 'index', export: view.sess && view.sess.firstOfType('cover') >= 0 ? 'cover' : 'index' }[d.step]); return; }
  if (d.opt) { setOpt(d.opt, d.value); commit({ focus: OPT_FOCUS[d.opt] }); return; }
  if (d.pageColor) { setPageColor(d.pageColor); commit({ focus: 'index' }); return; }
  if (d.accent) { setAccent(d.accent); commit({ focus: 'index' }); return; }
  if (d.palette) { setTabPalette(d.palette); commit({ focus: 'index' }); return; }
  if (d.combo !== undefined) { applyCombo(COMBOS[Number(d.combo)]); commit({ focus: 'index' }); return; }
  if (d.cover !== undefined) { state.cover = d.cover; if (d.cover !== 'none') state.pdf.coverPage = true; commit({ focus: 'cover' }); return; }
  if (d.fontset) { Object.assign(state.pdf, FONT_SETS[d.fontset]); commit({ focus: 'index' }); return; }
  if (d.preset) { await applyPreset(d.preset); return; }
  if (d.year) { setYear(state.year + Number(d.year)); commit({ focus: 'year' }); return; }
  if (d.notes) { setOpt('notesPages', pdfOpts().notesPages + Number(d.notes)); commit({ focus: 'notes' }); return; }
  if (d.page !== undefined && btn.classList.contains('thumb')) { goPage(Number(d.page)); return; }
  if (d.up !== undefined || d.down !== undefined) {
    const i = Number(d.up ?? d.down), j = d.up !== undefined ? i - 1 : i + 1;
    [state.tabs[i], state.tabs[j]] = [state.tabs[j], state.tabs[i]]; commit({ focus: 'index' }); return;
  }
  if (d.del !== undefined) {
    const tab = state.tabs[Number(d.del)];
    if (!await askConfirm(`Delete the “${tab.name}” tab?${tab.kind === 'notes' && state.notes[tab.id] ? ' Its text will be lost.' : ''}`, 'Delete')) return;
    state.tabs.splice(Number(d.del), 1); delete state.notes[tab.id]; commit({ focus: 'index' }); return;
  }
  if (d.dayDel !== undefined) { delete state.days[d.dayDel]; commit(); return; }
  switch (btn.id) {
    case 'addNotes': { const tab = mk(`Page ${state.tabs.length + 1}`, 'notes', '#777'); state.tabs.push(tab); recolorTabs(state.tabs, state.theme); commit({ focus: 'notes' }); break; }
    case 'addMonth': { const m = new Date().getMonth(); state.tabs.push(mk(MONTHS[m].slice(0, 3), 'month', '#777', { year: state.year, month: m })); recolorTabs(state.tabs, state.theme); commit({ focus: 'month' }); break; }
    case 'addYear': state.tabs.push(mk('Calendar', 'year', '#777', { year: state.year, month: 0 })); recolorTabs(state.tabs, state.theme); commit({ focus: 'year' }); break;
    case 'addDay': {
      let k = todayKey(); while (k in state.days) { const x = new Date(k + 'T00:00:00'); x.setDate(x.getDate() + 1); k = dateKey(x.getFullYear(), x.getMonth(), x.getDate()); }
      state.days[k] = ''; commit(); const row = document.querySelector(`[data-day-text="${k}"]`); if (row) row.focus(); break;
    }
    case 'prevPage': goPage(view.page - 1); break;
    case 'nextPage': goPage(view.page + 1); break;
    case 'exportBtn': exportPdf(btn); break;
    case 'moreBtn': toggleMenu(); break;
    case 'menuSearch': closeMenu(); openSearch(); break;
    case 'menuBackup': closeMenu(); saveFile('calendar-journal.json', new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); break;
    case 'menuRestore': closeMenu(); $('importFile').click(); break;
    case 'menuReset': closeMenu(); if (await askConfirm('Erase everything and start over?', 'Erase everything')) { state = defaultState(); view.page = 0; ui.step = 'style'; renderAll(); save(); } break;
    default: break;
  }
});
document.addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (d.toggle) { state.pdf[d.toggle] = t.checked; commit({ panel: false, focus: OPT_FOCUS[d.toggle] }); return; }
  if (t.id === 'yearInput') { setYear(t.value); commit({ focus: 'year' }); return; }
  if (d.dayDate !== undefined) {                                                       // moving an entry to another date
    const to = t.value, from = d.dayDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to) || (to !== from && to in state.days)) { if (to in state.days && to !== from) notify('That date already has an entry.'); renderPanel(); return; }
    state.days[to] = state.days[from]; if (to !== from) delete state.days[from]; commit(); return;
  }
  if (t.id === 'importFile' && t.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try { const s = JSON.parse(r.result); if (!Array.isArray(s.tabs)) throw new Error('missing tabs'); state = migrate({ ...defaultState(), ...s }); view.page = 0; renderAll(); save(); notify('Journal restored.'); }
      catch (err) { notify('Could not restore that file: ' + err.message); }
    };
    r.readAsText(t.files[0]); t.value = '';
  }
});
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (t.id === 'titleInput') { state.title = t.value; document.title = t.value || 'Calendar Journal'; commit({ panel: false }); }
  else if (t.id === 'customPage') { setCustomPage(t.value); save(); schedulePreview('index'); document.querySelectorAll('.swatch').forEach(s => s.classList.remove('on')); t.closest('.swatch').classList.add('on'); }
  else if (t.id === 'customAccent') { setAccent(t.value); save(); schedulePreview('index'); }
  else if (d.tabName !== undefined) { state.tabs[Number(d.tabName)].name = t.value; commit({ panel: false }); }
  else if (d.tabColor !== undefined) { state.tabs[Number(d.tabColor)].color = t.value; state.theme.tabPalette = 'custom'; commit({ panel: false }); }
  else if (d.note !== undefined) { if (t.value) state.notes[d.note] = t.value; else delete state.notes[d.note]; commit({ panel: false, focus: 'notes' }); }
  else if (d.dayText !== undefined) { state.days[d.dayText] = t.value; commit({ panel: false }); }
  else if (t.id === 'jump') { goPage(Number(t.value)); }
});
$('jump').addEventListener('change', e => goPage(Number(e.target.value)));
$('sheet').addEventListener('click', e => { const l = hitLink(e); if (l) goPage(l.page); });
$('sheet').addEventListener('mousemove', e => { $('sheet').style.cursor = hitLink(e) ? 'pointer' : 'default'; });
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input, textarea, select, .fp')) return;
  if (e.key === 'ArrowLeft') goPage(view.page - 1); else if (e.key === 'ArrowRight') goPage(view.page + 1);
});
new ResizeObserver(() => { if (view.sess) drawStage(); }).observe($('sheetBox'));

/* ---------- More menu, search, export ---------- */
function toggleMenu() { const m = $('moreMenu'); m.hidden = !m.hidden; $('moreBtn').setAttribute('aria-expanded', String(!m.hidden)); $('menuSearch').hidden = !server.on; }
function closeMenu() { $('moreMenu').hidden = true; $('moreBtn').setAttribute('aria-expanded', 'false'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

function openSearch() {
  const m = $('modal');
  m.innerHTML = `<div class="modal-card wide" role="dialog" aria-modal="true" aria-label="Search entries"><input type="search" id="searchInput" placeholder="Search dates and notes…" autocomplete="off"><div class="search-results" id="searchResults"></div><div class="row"><button type="button" class="btn" data-m="no">Close</button></div></div>`;
  m.hidden = false;
  const done = () => { m.hidden = true; m.innerHTML = ''; m.onclick = null; };
  m.onclick = e => { if (e.target === m || e.target.closest('[data-m]')) done(); const a = e.target.closest('a[data-href]'); if (a) { e.preventDefault(); done(); openHit(a.dataset.href); } };
  $('searchInput').focus();
}
let searchTimer;
async function runSearch(q) {
  const box = $('searchResults');
  if (!box) return;
  if (!q.trim()) { box.innerHTML = ''; return; }
  try {
    clearTimeout(server.timer); await doPush();                      // search the latest text, not the copy from 1 second ago
    const r = await api('/api/search?q=' + encodeURIComponent(q) + '&limit=20');
    const hits = r.ok ? await r.json() : [];
    box.innerHTML = hits.length
      ? hits.map(h => `<a href="#" data-href="${esc(h.href)}"><strong>${esc(h.title)}</strong><small>${esc(h.snippet)}</small></a>`).join('')
      : '<p class="hint">No matches.</p>';
  } catch (e) { box.innerHTML = '<p class="hint">Search is unavailable right now.</p>'; }
}
document.addEventListener('input', e => { if (e.target.id === 'searchInput') { clearTimeout(searchTimer); const v = e.target.value; searchTimer = setTimeout(() => runSearch(v), 250); } });
/* A search result opens the matching editor: dates live in Pages, notes pages in Tabs. */
function openHit(href) {
  const day = /^#\/day\/(\d{4}-\d{2}-\d{2})$/.exec(href), tab = /^#\/tab\/(.+)$/.exec(href);
  if (day) { ui.step = 'pages'; renderSteps(); renderPanel(); const row = document.querySelector(`[data-day-row="${day[1]}"]`); if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('flash'); } }
  else if (tab) { ui.step = 'tabs'; renderSteps(); renderPanel(); const ta = document.querySelector(`[data-note="${tab[1]}"]`); if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus(); } }
}

async function exportPdf(btn) {
  btn.disabled = true; const label = btn.querySelector('span').textContent; btn.querySelector('span').textContent = 'Building…';
  try { await saveFile(fileName(), await JournalPDF.generate(state, pdfOpts())); }
  catch (err) { notify('PDF export failed: ' + err.message); console.error(err); }
  btn.disabled = false; btn.querySelector('span').textContent = label;
}

window.addEventListener('pagehide', () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } });

/* ---------- Start ---------- */
renderAll();
connectToServer();                     // looks for the Java server; does nothing if there is none
})();
