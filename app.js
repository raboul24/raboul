(() => {
'use strict';

const STORE_KEY = 'calendar-journal-v1';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_COLORS = ['#5b7fa6','#8e6bb0','#4f9d8a','#6aa84f','#c9a227','#e0873a','#d9534f','#c2548d','#a0663c','#7a8b3c','#4c7aa0','#5d6d7e'];

const THEMES = {
  pageSand:     { group: 'page', label: 'Sand',      paper: '#f5efe3', ink: '#4a4036', accent: '#b59a6b', bar: '#e9dfcc', today: '#e8d7ae', tabs: ['#c9b48a','#b59a6b','#a58b5e','#d3c3a0','#9a8660','#bfae8a'] },
  pageOlive:    { group: 'page', label: 'Olive',     paper: '#7f8d62', ink: '#fbf7e8', accent: '#ecdfae', bar: '#6a774f', today: '#98a678', tabs: ['#c8d19e','#dfe5bf','#b4c08a','#e8dba8','#a2b07a','#d5cf9a'] },
  pageSage:     { group: 'page', label: 'Sage Mist', paper: '#d3d9c4', ink: '#2f3a2c', accent: '#7b8a5e', bar: '#c3cbb0', today: '#e4e9d2', tabs: ['#9aa97f','#b2bf98','#869570','#c4cfae','#7a8a64','#a8b58e'] },
  pagePlum:     { group: 'page', label: 'Plum',      paper: '#5b4b80', ink: '#f5effc', accent: '#dcc9a0', bar: '#4a3c6b', today: '#7b69a5', tabs: ['#b8a6dc','#cdbfe8','#a592cc','#ddd2f0','#9482bd','#c2b2e2'] },
  pageLilac:    { group: 'page', label: 'Lilac Mist', paper: '#c6badf', ink: '#2e2548', accent: '#6c56a3', bar: '#b5a7d3', today: '#ded5ef', tabs: ['#9a86c8','#b3a3d8','#8672b8','#c8bce4','#7762aa','#ad9cd2'] },
  pageSlate:    { group: 'page', label: 'Slate',     paper: '#52667a', ink: '#f1f5f8', accent: '#e4d2a6', bar: '#43566a', today: '#6f879c', tabs: ['#9db3c6','#b8c8d6','#8aa1b6','#cbd8e3','#7c93a9','#adc0d0'] },
  pageMist:     { group: 'page', label: 'Blue Mist', paper: '#93a8b3', ink: '#1f2e37', accent: '#f5ebcf', bar: '#82979f', today: '#b4c4cc', tabs: ['#cfdde4','#e3ecf0','#bccfd8','#f0f5f7','#a9bdc8','#dbe6ec'] },
  pageCocoa:    { group: 'page', label: 'Cocoa',     paper: '#7a6355', ink: '#f7efe5', accent: '#e6d2ab', bar: '#69534a', today: '#977d6d', tabs: ['#d3bda3','#e3d2bb','#c1a98d','#ecdfcd','#b09579','#dccbb2'] },
  blush:    { label: 'Blush',    paper: '#fffaf6', ink: '#4a3b3b', accent: '#d98c8c', bar: '#f6e1dc', today: '#fde5c8', tabs: ['#e8a5a5','#f2c6a0','#b9d2a8','#a8cbd6','#c9b6e0','#e6b8cf'] },
  sage:     { label: 'Sage',     paper: '#fbfcf7', ink: '#34423a', accent: '#7fa383', bar: '#e4ecd9', today: '#f3ecc2', tabs: ['#9bb89a','#c5d3a5','#e3d3a0','#d9b79c','#a9c4c0','#8fb0a3'] },
  boho:     { label: 'Boho',     paper: '#fdf8f1', ink: '#4b3a2f', accent: '#c2815b', bar: '#f1e3d0', today: '#f6dfb0', tabs: ['#c2815b','#d9a566','#a8a77a','#8e6f5a','#d0b8a0','#b58a8a'] },
  sky:      { label: 'Sky',      paper: '#f7fbff', ink: '#2f4157', accent: '#6f9fd1', bar: '#dcebf8', today: '#fff1bf', tabs: ['#8fb8e0','#a9d3d6','#b9c6ec','#c8b9e6','#9fcfbf','#f0c4cf'] },
  lilac:    { label: 'Lilac',    paper: '#fbf9ff', ink: '#3d3552', accent: '#a08cd0', bar: '#e9e2f7', today: '#fce8c4', tabs: ['#b7a5e0','#d2b3d9','#a9b8e6','#e6b5c8','#9fcad0','#cbb8f0'] },
  linen:    { label: 'Linen',    paper: '#fbf8f3', ink: '#3f3f3a', accent: '#8a8f80', bar: '#ebe6db', today: '#efe2c0', tabs: ['#a3a898','#c4b8a4','#b3a39b','#9aa7a0','#cdbfae','#8f9a8e'] },
  classic:  { label: 'Classic',  paper: '#fffdf7', ink: '#2b2a33', accent: '#c0563b', bar: '#efe6d2', today: '#ffe08a' },
  midnight: { label: 'Midnight', paper: '#1f2230', ink: '#e8e8f0', accent: '#7aa2f7', bar: '#161824', today: '#3b4261' },
  ocean:    { label: 'Ocean',    paper: '#f4fbfd', ink: '#17323d', accent: '#0e7c9b', bar: '#cfe9f1', today: '#ffe9a8' },
  forest:   { label: 'Forest',   paper: '#f7faf2', ink: '#223322', accent: '#4a7c3a', bar: '#dbe8cc', today: '#f6e27a' },
  rose:     { label: 'Rose',     paper: '#fff8f8', ink: '#3a2630', accent: '#c2417a', bar: '#f6dbe5', today: '#ffd6e0' },
  lavender: { label: 'Lavender', paper: '#faf8ff', ink: '#2c2540', accent: '#7c5cc4', bar: '#e5dcf7', today: '#fbe7a1' },
  mono:     { label: 'Mono',     paper: '#ffffff', ink: '#111111', accent: '#444444', bar: '#e6e6e6', today: '#dddddd' },
};
const FONTS = {
  'Cormorant Garamond': '"Cormorant Garamond", Georgia, serif',
  'Great Vibes (script)': '"Great Vibes", cursive',
  'Georgia (serif)': 'Georgia, "Times New Roman", serif',
  'Times': '"Times New Roman", Times, serif',
  'Palatino': '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  'Lora': 'Lora, Georgia, serif',
  'Merriweather': 'Merriweather, Georgia, serif',
  'Playfair Display': '"Playfair Display", Georgia, serif',
  'System sans-serif': 'system-ui, -apple-system, "Segoe UI", sans-serif',
  'Verdana': 'Verdana, Geneva, sans-serif',
  'Trebuchet': '"Trebuchet MS", Helvetica, sans-serif',
  'Quicksand (rounded)': 'Quicksand, "Trebuchet MS", sans-serif',
  'Handwritten (system)': '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
  'Caveat (handwriting)': 'Caveat, "Segoe Print", "Bradley Hand", cursive',
  'Patrick Hand': '"Patrick Hand", "Segoe Print", cursive',
  'Indie Flower': '"Indie Flower", "Segoe Print", cursive',
  'Typewriter': '"Special Elite", "Courier New", monospace',
  'Monospace': 'ui-monospace, Menlo, Consolas, monospace',
};

/* Give every tab a color from the theme's palette (months cycle through it, the year tab uses the accent). */
function recolorTabs(tabs, theme) {
  const pal = theme.tabs && theme.tabs.length ? theme.tabs : MONTH_COLORS;
  let n = 0;
  tabs.forEach(t => {
    if (t.kind === 'month') t.color = pal[t.month % pal.length];
    else if (t.kind === 'year') t.color = theme.accent;
    else if (t.kind === 'index') t.color = pal[pal.length - 1];
    else t.color = pal[(n++ + 2) % pal.length];
  });
  return tabs;
}
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return { y, m: m - 1, d }; };
const todayKey = () => { const t = new Date(); return dateKey(t.getFullYear(), t.getMonth(), t.getDate()); };
const addDays = (k, n) => { const { y, m, d } = parseKey(k); const t = new Date(y, m, d + n); return dateKey(t.getFullYear(), t.getMonth(), t.getDate()); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);

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
const defaultState = () => ({
  title: 'My Calendar Journal',
  year: new Date().getFullYear(),
  weekStart: 0,
  look: 'elegant',
  cover: 'frame',
  theme: { preset: 'pageSand', ...THEMES.pageSand, font: FONTS['Cormorant Garamond'], headFont: '', titleFont: FONTS['Great Vibes (script)'] },
  tabs: recolorTabs(PRESETS.full.build(new Date().getFullYear()), THEMES.pageSand),
  days: {},
  notes: {},
  pdf: { ...JournalPDF.DEFAULTS },
});

let state = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.tabs)) return { ...defaultState(), ...s };
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
   server, and a search box appears in Customize. When there is no server (file://, the hosted copy, offline)
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
const norm = s => JSON.stringify({ ...defaultState(), ...s });        // same shape on both sides, so equal journals compare equal

async function connectToServer() {
  if (!/^https?:$/.test(location.protocol)) return;                   // opened as a file: there is no server
  try {
    const r = await api('/api/health', {}, 1500);
    if (!r.ok || (await r.json()).service !== 'journal-backend') return;   // not our server
  } catch (e) { return; }                                             // no server, blocked, or offline
  server.on = true;
  try { server.revision = Number(localStorage.getItem(REV_KEY)) || 0; } catch (e) { /* ignore */ }
  try { await syncOnLoad(); } catch (e) { /* stay local if anything goes wrong */ }
  if (!$('settings').hidden) renderSettings();
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
  state = { ...defaultState(), ...remote.state };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  rememberRevision(remote.revision);
  server.lastJson = JSON.stringify(state);
  applyTheme(); render();
  if (!$('settings').hidden) renderSettings();
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
      ? hits.map(h => `<a href="${esc(h.href)}"><strong>${esc(h.title)}</strong><small>${esc(h.snippet)}</small></a>`).join('')
      : '<p class="hint">No matches.</p>';
  } catch (e) { box.innerHTML = '<p class="hint">Search is unavailable right now.</p>'; }
}
document.addEventListener('input', e => {
  if (e.target.id !== 'searchInput') return;
  clearTimeout(searchTimer); const v = e.target.value; searchTimer = setTimeout(() => runSearch(v), 250);
});
const serverSection = () => !server.on ? '' : `
    <h3>Search entries</h3>
    <input type="search" id="searchInput" placeholder="Search entries and notes…" autocomplete="off">
    <div class="search-results" id="searchResults"></div>
    <p class="hint">Also saved on the Java server (revision ${server.revision}).</p>
`;

/* ---------- Theme ---------- */
const hexRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - t) + B[i] * t).toString(16).padStart(2, '0')).join(''); };
const lumOf = h => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
function applyTheme() {
  const r = document.documentElement.style, t = state.theme;
  r.setProperty('--paper', t.paper); r.setProperty('--ink', t.ink); r.setProperty('--accent', t.accent);
  r.setProperty('--bar', t.bar); r.setProperty('--today', t.today); r.setProperty('--font', t.font); r.setProperty('--font-head', t.headFont || t.font);
  r.setProperty('--font-title', t.titleFont || t.headFont || t.font);
  const light = lumOf(t.paper) > 0.5;
  r.setProperty('--legend', light ? mixHex(t.accent, t.ink, 0.5) : mixHex(t.accent, '#ffffff', 0.25));
  r.setProperty('--titlec', light ? mixHex(t.accent, t.ink, 0.3) : t.accent);
  r.setProperty('--cell', light ? mixHex(t.accent, t.paper, 0.78) : mixHex(t.paper, '#ffffff', 0.1));
  r.setProperty('--goldsoft', mixHex(t.accent, t.paper, 0.5));
  r.setProperty('--onaccent', lumOf(t.accent) > 0.62 ? '#2b2b2b' : '#ffffff');
  r.setProperty('--coil', mixHex(t.accent, t.ink, 0.2));
  r.setProperty('--bind', mixHex(t.paper, t.ink, 0.07));
  document.body.classList.toggle('look-elegant', (state.look || 'elegant') === 'elegant');
  $('brand').textContent = state.title;
  document.title = state.title;
}

/* ---------- Links ---------- */
const tabById = id => state.tabs.find(t => t.id === id);
const monthTabFor = k => { const { y, m } = parseKey(k); return state.tabs.find(t => t.kind === 'month' && t.year === y && t.month === m); };

function resolve(target) {
  const t = target.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return { href: `#/day/${t}`, label: t };
  if (t.toLowerCase() === 'today') return { href: '#/day/today', label: 'Today' };
  const tab = state.tabs.find(x => x.name.toLowerCase() === t.toLowerCase());
  if (tab) return { href: `#/tab/${tab.id}`, label: tab.name };
  return { href: `#/new/${encodeURIComponent(t)}`, label: t, missing: true };
}
const LINK_RE = /\[\[([^\]\n]+)\]\]/g;
const extractLinks = text => [...new Set([...text.matchAll(LINK_RE)].map(m => m[1].trim()))];
const renderText = text => esc(text).replace(/\[\[([^\]\n]+)\]\]/g, (_, t) => {
  const r = resolve(t.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, e => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }[e])));
  return `<a href="${esc(r.href)}"${r.missing ? ' class="missing" title="Click to create this page"' : ''}>${esc(r.label)}</a>`;
});
const chipsHtml = text => {
  const links = extractLinks(text);
  if (!links.length) return '<span class="hint">Tip: type [[Tab Name]] or [[2026-12-25]] to link to another page.</span>';
  return '<strong>Links:</strong> ' + links.map(l => { const r = resolve(l); return `<a class="chip${r.missing ? ' missing' : ''}" href="${esc(r.href)}">${esc(r.label)}${r.missing ? ' (new)' : ''}</a>`; }).join('');
};

/* ---------- Routing ---------- */
/* Route lives in the page (not only in location.hash) so it also works inside a sandboxed viewer
   that ignores #/path navigation. history/hash are still updated when the browser allows it. */
const VALID_ROUTE = /^#\/(tab|day|new)\//;
let routeHash = VALID_ROUTE.test(location.hash) ? location.hash : '#/tab/index';
const trail = [];
function go(h, replace) {
  if (!replace && h !== routeHash) trail.push(routeHash);
  routeHash = h;
  try { history[replace ? 'replaceState' : 'pushState'](null, '', h); } catch (e) { /* sandboxed */ }
  render();
}
function parseRoute() {
  const [, kind, arg] = routeHash.split('/');
  return { kind: kind || 'tab', arg: arg ? decodeURIComponent(arg) : '' };
}
let previewMode = false;
let lastRouteKey = '';

/* In-page replacements for confirm()/alert(), which the hosted viewer disables. */
function askConfirm(message, okLabel = 'Confirm', cancelLabel = 'Cancel') {
  return new Promise(resolve => {
    const m = $('modal');
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><p>${esc(message)}</p><div class="row"><button class="btn" data-m="no">${esc(cancelLabel)}</button><button class="btn primary" data-m="yes">${esc(okLabel)}</button></div></div>`;
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

function render() {
  const route = parseRoute();
  if (route.kind === 'new') {
    const name = route.arg || 'Untitled';
    let tab = state.tabs.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (!tab) { tab = mk(name, 'notes', '#777'); state.tabs.push(tab); save(); }
    go(`#/tab/${tab.id}`, true);
    return;
  }
  if (route.kind === 'day' && route.arg === 'today') { go(`#/day/${todayKey()}`, true); return; }

  const key = routeHash;
  $('backBtn').hidden = !trail.length;
  if (key !== lastRouteKey) { previewMode = false; lastRouteKey = key; }

  applyTheme();
  let activeId, page;
  if (route.kind === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(route.arg)) {
    const mt = monthTabFor(route.arg);
    activeId = mt && mt.id;
    page = dayPage(route.arg, mt);
    $('page').style.setProperty('--page-color', mt ? mt.color : state.theme.accent);
  } else {
    const tab = tabById(route.arg) || state.tabs[0];
    if (!tab) { $('page').innerHTML = '<h1>No tabs</h1><p>Open Customize to add tabs or pick a preset.</p>'; renderTabs(null); return; }
    activeId = tab.id;
    page = ({ index: indexPage, year: yearPage, month: monthPage, notes: notesPage }[tab.kind] || notesPage)(tab);
    $('page').style.setProperty('--page-color', tab.color);
  }
  renderTabs(activeId);
  renderSections(route, activeId);
  $('page').innerHTML = page;
  const cc = $('coverCanvas'); if (cc) drawCoverCard(cc);
  bindPage(route);
}

/* elegant look: HOME / CALENDAR / MONTH / TODAY / NOTES tabs across the top, like the printed planners */
function renderSections(route, activeId) {
  const el = $('sections'); if (!el) return;
  const idx = state.tabs.find(t => t.kind === 'index'), yr = state.tabs.find(t => t.kind === 'year'), nt = state.tabs.find(t => t.kind === 'notes');
  const now = new Date(), mt = state.tabs.find(t => t.kind === 'month' && t.year === now.getFullYear() && t.month === now.getMonth()) || state.tabs.find(t => t.kind === 'month');
  const act = tab => tab && tab.id === activeId;
  const items = [
    idx && ['Home', `#/tab/${idx.id}`, act(idx)], yr && ['Calendar', `#/tab/${yr.id}`, act(yr)], mt && ['Month', `#/tab/${mt.id}`, route.kind === 'tab' && act(mt)],
    ['Today', '#/day/today', route.kind === 'day'], nt && ['Notes', `#/tab/${nt.id}`, act(nt)],
  ].filter(Boolean);
  el.innerHTML = items.map(([label, href, on]) => `<a href="${href}" class="${on ? 'active' : ''}">${label}</a>`).join('');
}

function renderTabs(activeId) {
  $('tabs').innerHTML = state.tabs.map(t =>
    `<a class="tab${t.id === activeId ? ' active' : ''}" href="#/tab/${t.id}" style="--tab-color:${esc(t.color)}">${esc(t.name)}</a>`).join('');
  const active = $('tabs').querySelector('.active');
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* ---------- Pages ---------- */
function indexPage() {
  const t = todayKey(), { y, m, d } = parseKey(t);
  const hasCover = state.cover && state.cover !== 'none' && JournalCovers.list.some(c => c.id === state.cover);
  return `<div class="index-grid${hasCover ? ' with-cover' : ''}">${hasCover ? '<canvas class="cover-card" id="coverCanvas" width="330" height="440" role="img" aria-label="Journal cover"></canvas>' : ''}<div class="index-body"><h1>${esc(state.title)}</h1>
    <p class="sub">${DOWS[new Date(y, m, d).getDay()]}, ${MONTHS[m]} ${d}, ${y} · <a href="#/day/today">Open today’s page →</a></p>
    <h3>Jump to</h3>
    <ul class="toc">${state.tabs.filter(x => x.kind !== 'index').map(x =>
      `<li><a href="#/tab/${x.id}" style="--tab-color:${esc(x.color)}">${esc(x.name)}<br><small class="hint">${{ year: 'Year overview', month: `${MONTHS[x.month]} ${x.year}`, notes: 'Notes page' }[x.kind]}</small></a></li>`).join('')}</ul>
    ${state.tabs.length < 2 ? '<p class="hint">Open “Customize” to choose a preset or add tabs.</p>' : ''}</div></div>`;
}

function gridRows(y, m, mini) {
  const first = new Date(y, m, 1).getDay();
  const offset = (first - state.weekStart + 7) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const today = todayKey();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<td class="empty"></td>');
  for (let d = 1; d <= count; d++) {
    const k = dateKey(y, m, d), entry = state.days[k];
    const cls = [k === today ? 'today' : '', entry ? 'has' : ''].filter(Boolean).join(' ');
    if (mini) cells.push(`<td class="${cls}"><a href="#/day/${k}" title="${k}">${d}</a></td>`);
    else {
      const snip = entry ? entry.split('\n')[0].replace(/\[\[([^\]]+)\]\]/g, '$1').slice(0, 40) : '';
      cells.push(`<td class="${cls}"><a class="day" href="#/day/${k}"><span class="num">${d}</span>${entry ? '<span class="dot"></span>' : ''}${snip ? `<span class="snip">${esc(snip)}</span>` : ''}</a></td>`);
    }
  }
  while (cells.length % 7) cells.push('<td class="empty"></td>');
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(`<tr>${cells.slice(i, i + 7).join('')}</tr>`);
  const heads = Array.from({ length: 7 }, (_, i) => `<th>${DOWS[(i + state.weekStart) % 7]}</th>`).join('');
  return `<thead><tr>${heads}</tr></thead><tbody>${rows.join('')}</tbody>`;
}

function monthNav(tab) {
  const i = state.tabs.indexOf(tab);
  const sibling = dir => { for (let j = i + dir; j >= 0 && j < state.tabs.length; j += dir) if (state.tabs[j].kind === 'month') return state.tabs[j]; };
  const p = sibling(-1), n = sibling(1);
  return `<div class="pagenav"><span>${p ? `<a class="btn" href="#/tab/${p.id}">← ${MONTHS[p.month]}</a>` : ''}</span>
    <a class="btn" href="#/tab/index">Index</a><span>${n ? `<a class="btn" href="#/tab/${n.id}">${MONTHS[n.month]} →</a>` : ''}</span></div>`;
}

function monthPage(tab) {
  const yt = state.tabs.find(t => t.kind === 'year');
  return `<div class="crumbs"><a href="#/tab/index">Index</a>${yt ? ` › <a href="#/tab/${yt.id}">${esc(yt.name)}</a>` : ''} › ${esc(tab.name)}</div>
    <h1>${MONTHS[tab.month]} ${tab.year}</h1><p class="sub">Click any day to open its journal page.</p>
    <table class="cal">${gridRows(tab.year, tab.month, false)}</table>${monthNav(tab)}`;
}

function yearPage(tab) {
  const label = tab.month === 0 ? tab.year : `${tab.year}–${tab.year + 1}`;
  return `<div class="crumbs"><a href="#/tab/index">Index</a> › ${esc(tab.name)}</div>
    <h1>${esc(tab.name)} ${label}</h1><p class="sub">Click a month name for its page, or any day for its entry. Underlined days have entries.</p>
    <div class="months">${spanMonths(tab.month, tab.year).map(({ month, year }) => {
      const mt = state.tabs.find(t => t.kind === 'month' && t.month === month && t.year === year);
      const title = mt ? `<a href="#/tab/${mt.id}">${MONTHS[month]}</a>` : MONTHS[month];
      return `<section class="mini" style="--mini-color:${mt ? esc(mt.color) : 'var(--ink)'}"><h3>${title} ${year}</h3><table>${gridRows(year, month, true)}</table></section>`;
    }).join('')}</div>`;
}

function notesPage(tab) {
  const text = state.notes[tab.id] || '';
  return `<div class="crumbs"><a href="#/tab/index">Index</a> › ${esc(tab.name)}</div>
    <h1>${esc(tab.name)}</h1>${editorHtml(text)}`;
}

function editorHtml(text) {
  return `<div class="toolbar"><button class="btn small" id="previewBtn">${previewMode ? '✎ Edit' : '👁 Preview links'}</button></div>
    ${previewMode
      ? `<div class="preview">${renderText(text) || '<span class="hint">Nothing here yet.</span>'}</div>`
      : `<textarea class="editor" id="editor" placeholder="Write here… use [[Tab Name]] or [[YYYY-MM-DD]] to link pages.">${esc(text)}</textarea>`}
    <div class="chips" id="chips">${chipsHtml(text)}</div>`;
}

function dayPage(k, mt) {
  const { y, m, d } = parseKey(k);
  const dow = new Date(y, m, d).getDay();
  const text = state.days[k] || '';
  return `<div class="crumbs"><a href="#/tab/index">Index</a>${mt ? ` › <a href="#/tab/${mt.id}">${MONTHS[m]} ${y}</a>` : ''} › ${k}</div>
    <h1>${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow]}, ${MONTHS[m]} ${d}, ${y}</h1>
    ${k === todayKey() ? '<p class="sub">Today</p>' : '<p class="sub"><a href="#/day/today">Jump to today</a></p>'}
    <div class="pagenav"><a class="btn" href="#/day/${addDays(k, -1)}">← ${addDays(k, -1)}</a>
      ${mt ? `<a class="btn" href="#/tab/${mt.id}">Month view</a>` : '<a class="btn" href="#/tab/index">Index</a>'}
      <a class="btn" href="#/day/${addDays(k, 1)}">${addDays(k, 1)} →</a></div>
    ${editorHtml(text)}`;
}

function bindPage(route) {
  const editor = $('editor'), pb = $('previewBtn');
  if (pb) pb.onclick = () => { previewMode = !previewMode; render(); };
  if (!editor) return;
  const isDay = route.kind === 'day';
  const id = isDay ? route.arg : (tabById(route.arg) || state.tabs[0]).id;
  editor.oninput = () => {
    const v = editor.value;
    const bucket = isDay ? state.days : state.notes;
    if (v) bucket[id] = v; else delete bucket[id];
    $('chips').innerHTML = chipsHtml(v);
    save();
  };
}

/* ---------- Settings drawer ---------- */
function openSettings(open) {
  $('settings').hidden = !open;
  $('settingsBtn').setAttribute('aria-expanded', String(open));
  if (open) renderSettings();
}

function colorInput(key, label) {
  return `<label>${label}<input type="color" data-theme="${key}" value="${state.theme[key]}"></label>`;
}


const PDF_FONTS = {
  auto: 'Match journal font', helvetica: 'Sans-serif (Helvetica)', times: 'Serif (Times)', courier: 'Typewriter (Courier)',
  caveat: 'Caveat (handwriting)', patrickhand: 'Patrick Hand', indieflower: 'Indie Flower', specialelite: 'Special Elite (typewriter)',
  lora: 'Lora (serif)', merriweather: 'Merriweather (serif)', playfair: 'Playfair Display', quicksand: 'Quicksand (rounded)',
  cormorant: 'Cormorant Garamond', greatvibes: 'Great Vibes (script)',
};
const NOTE_STYLES = [['blank', 'Blank'], ['lined', 'Lined'], ['dotted', 'Dotted'], ['grid', 'Grid'], ['cornell', 'Cornell notes'], ['checklist', 'Checklist']];
const pdfOpts = () => ({ ...JournalPDF.DEFAULTS, ...state.pdf, look: state.look || 'elegant' });
function pdfSelect(key, label, options) {
  const entries = Array.isArray(options) ? options : Object.entries(options);
  return `<label>${label}<select data-pdf="${key}">${entries.map(([v, n]) => `<option value="${v}"${pdfOpts()[key] === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`;
}
function updatePdfEstimate() {
  const el = $('pdfEst');
  if (!el) return;
  JournalPDF.ready(state, pdfOpts()).then(() => { const n = JournalPDF.count(state, pdfOpts()); if ($('pdfEst')) $('pdfEst').textContent = `≈ ${n} pages${n > 400 ? ' (large file)' : ''}`; });
  const n = JournalPDF.count(state, pdfOpts());
  el.textContent = `≈ ${n} pages${n > 400 ? ' (large file)' : ''}`;
}
async function exportPdf(btn) {
  btn.disabled = true; const label = btn.textContent; btn.textContent = 'Building…';
  try {
    const blob = await JournalPDF.generate(state, pdfOpts());
    await saveFile((state.title.replace(/[^\w -]+/g, '').trim() || 'calendar-journal') + '.pdf', blob);
  } catch (err) { notify('PDF export failed: ' + err.message); console.error(err); }
  btn.disabled = false; btn.textContent = label;
}

/* Font pickers: a custom listbox so every option is drawn in its own typeface (native <select> can't do this everywhere). */
const PDF_FONT_CSS = {
  helvetica: 'Helvetica, Arial, sans-serif', times: '"Times New Roman", Times, serif', courier: '"Courier New", Courier, monospace',
  caveat: 'Caveat, cursive', patrickhand: '"Patrick Hand", cursive', indieflower: '"Indie Flower", cursive', specialelite: '"Special Elite", monospace',
  lora: 'Lora, serif', merriweather: 'Merriweather, serif', playfair: '"Playfair Display", serif', quicksand: 'Quicksand, sans-serif',
  cormorant: '"Cormorant Garamond", serif', greatvibes: '"Great Vibes", cursive',
};
const webFontOpts = () => Object.entries(FONTS).map(([label, css]) => ({ value: css, label, css }));
const pdfFontOpts = () => Object.entries(PDF_FONTS).map(([k, label]) => ({ value: k, label, css: PDF_FONT_CSS[k] || state.theme.font }));
const FONT_PICKERS = {
  setFont:     { title: 'Body font', opts: webFontOpts, get: () => state.theme.font, set: v => { state.theme.font = v; refresh(false); } },
  setHeadFont: { title: 'Heading font', opts: () => [{ value: '', label: 'Same as body', css: state.theme.font }, ...webFontOpts()], get: () => state.theme.headFont || '', set: v => { state.theme.headFont = v; refresh(false); } },
  setTitleFont: { title: 'Title font', opts: () => [{ value: '', label: 'Same as heading', css: state.theme.headFont || state.theme.font }, ...webFontOpts()], get: () => state.theme.titleFont || '', set: v => { state.theme.titleFont = v; refresh(false); } },
  pdfTitleFont: {
    title: 'PDF title font',
    opts: () => [{ value: 'auto', label: 'Match journal title font', css: state.theme.titleFont || state.theme.headFont || state.theme.font }, { value: 'same', label: 'Same as body', css: state.theme.font }, ...pdfFontOpts().filter(o => o.value !== 'auto')],
    get: () => pdfOpts().titleFont, set: v => { state.pdf = { ...pdfOpts(), titleFont: v }; delete state.pdf.look; save(); updatePdfEstimate(); },
  },
  pdfFont:     { title: 'PDF body font', opts: pdfFontOpts, get: () => pdfOpts().font, set: v => { state.pdf = { ...pdfOpts(), font: v }; delete state.pdf.look; save(); updatePdfEstimate(); } },
  pdfHeadFont: {
    title: 'PDF heading font',
    opts: () => [{ value: 'auto', label: 'Match journal heading font', css: state.theme.headFont || state.theme.font }, { value: 'same', label: 'Same as body (bold)', css: state.theme.font }, ...pdfFontOpts().filter(o => o.value !== 'auto')],
    get: () => pdfOpts().headFont, set: v => { state.pdf = { ...pdfOpts(), headFont: v }; delete state.pdf.look; save(); updatePdfEstimate(); },
  },
};
function fontPickerInner(id) {
  const P = FONT_PICKERS[id], opts = P.opts(), cur = P.get(), sel = opts.find(o => o.value === cur) || opts[0];
  return `<button type="button" class="fp-btn" aria-haspopup="listbox" aria-expanded="false" style="font-family:${esc(sel.css)}"><span>${esc(sel.label)}</span><i aria-hidden="true">▾</i></button>
    <ul class="fp-list" role="listbox" aria-label="${esc(P.title)}" hidden>${opts.map(o => `<li role="option" tabindex="-1" data-value="${esc(o.value)}" aria-selected="${o === sel}" style="font-family:${esc(o.css)}">${esc(o.label)}</li>`).join('')}</ul>`;
}
const fontPicker = id => `<div class="fp-row"><span>${FONT_PICKERS[id].title}</span><div class="fp" data-fp="${id}">${fontPickerInner(id)}</div></div>`;
function syncFontPickers() { document.querySelectorAll('.fp').forEach(el => { el.innerHTML = fontPickerInner(el.dataset.fp); }); }
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
  if (opt) { FONT_PICKERS[id].set(opt.dataset.value); syncFontPickers(); const f = document.querySelector('.font-sample'); if (f) f.style.fontFamily = 'var(--font)'; return; }
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

function drawCoverThumbs() {
  document.querySelectorAll('canvas[data-cover-canvas]').forEach(cv => JournalCovers.drawToCanvas(cv, cv.dataset.coverCanvas, state.theme));
}
/* cover card on the Index page: the art plus a title plate */
async function drawCoverCard(cv) {
  JournalCovers.drawToCanvas(cv, state.cover, state.theme);
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  try { await document.fonts.load('32px "Great Vibes"'); } catch (e) { /* font optional */ }
  const px = W * 0.16, pw = W * 0.68, py = H * 0.4, ph = H * 0.2, ink = '#6b5636', gold = '#b59a6b';
  ctx.fillStyle = '#f7f1e3'; ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = gold; ctx.lineWidth = 1.2; ctx.strokeRect(px + 5, py + 5, pw - 10, ph - 10); ctx.lineWidth = 0.6; ctx.strokeRect(px + 9, py + 9, pw - 18, ph - 18);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let s = 38; do { ctx.font = `${s}px "Great Vibes", cursive`; s -= 2; } while (s > 16 && ctx.measureText(state.title).width > pw - 36);
  ctx.fillText(state.title, W / 2, py + ph * 0.46);
  ctx.font = '11px "Cormorant Garamond", serif'; ctx.fillText(String(state.year).split('').join(' '), W / 2, py + ph * 0.8);
}
function renderSettings() {
  const s = $('settings');
  s.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:center"><h2>Customize</h2><button class="btn small" id="closeSettings">Close ✕</button></div>

    <h3>Journal</h3>
    <label>Title<input type="text" id="setTitle" value="${esc(state.title)}"></label>
    <label>Year<input type="number" id="setYear" value="${state.year}" min="1900" max="2200" style="width:90px"></label>
    <label>Planner look<select id="setLook"><option value="elegant"${(state.look || 'elegant') === 'elegant' ? ' selected' : ''}>Elegant (spiral, gold lines)</option><option value="soft"${state.look === 'soft' ? ' selected' : ''}>Soft (rounded, pastel)</option><option value="classic"${state.look === 'classic' ? ' selected' : ''}>Classic (plain)</option></select></label>
    <label>Week starts on<select id="setWeek"><option value="0"${state.weekStart === 0 ? ' selected' : ''}>Sunday</option><option value="1"${state.weekStart === 1 ? ' selected' : ''}>Monday</option></select></label>

    ${serverSection()}

    <h3>Calendar presets</h3>
    <div class="presets">${Object.entries(PRESETS).map(([k, p]) =>
      `<button class="btn" data-preset="${k}">${p.label}<small>${p.desc}</small></button>`).join('')}</div>
    <p class="hint">Applying a preset uses the year above and replaces your tabs. Your day entries and notes pages are kept.</p>

    <h3>Colored pages</h3>
    <div class="pg-swatches">${Object.entries(THEMES).filter(([, t]) => t.group === 'page').map(([k, t]) =>
      `<button class="pg-swatch${state.theme.preset === k ? ' on' : ''}" data-themepreset="${k}" title="${t.label}"><span style="background:${t.paper};box-shadow:inset 0 0 0 3px ${t.accent}55"></span><small>${t.label}</small></button>`).join('')}</div>

    <h3>Cover</h3>
    <div class="cover-grid">${['none', ...JournalCovers.list.map(c => c.id)].map(id => {
      const c = JournalCovers.list.find(x => x.id === id);
      return `<button class="cover-opt${(state.cover || 'none') === id ? ' on' : ''}" data-cover="${id}" title="${c ? c.label : 'No cover'}">${c ? `<canvas width="90" height="120" data-cover-canvas="${id}"></canvas>` : '<span class="cover-none">None</span>'}<small>${c ? c.label : 'No cover'}</small></button>`;
    }).join('')}</div>

    <h3>More color themes</h3>
    <div class="swatches">${Object.entries(THEMES).filter(([, t]) => t.group !== 'page').map(([k, t]) =>
      `<button class="swatch${state.theme.preset === k ? ' on' : ''}" data-themepreset="${k}" title="${t.label}"><div class="bars"><i style="background:${t.paper}"></i><i style="background:${t.accent}"></i><i style="background:${t.bar}"></i><i style="background:${t.today}"></i></div><span>${t.label}</span></button>`).join('')}</div>

    <h3>Custom colors</h3>
    ${colorInput('paper', 'Page paper')}${colorInput('ink', 'Text')}${colorInput('accent', 'Links & accents')}${colorInput('bar', 'Top bar')}${colorInput('today', 'Today highlight')}
    ${fontPicker('setFont')}
    ${fontPicker('setHeadFont')}
    ${fontPicker('setTitleFont')}
    <p class="font-sample" style="font-family:var(--font)">The quick brown fox jumps over the lazy dog — 0123456789</p>

    <h3>Tabs</h3>
    <div id="tabEditor">${state.tabs.map((t, i) => `
      <div class="tabrow" data-i="${i}">
        <input type="color" data-tabcolor="${i}" value="${esc(t.color)}" title="Tab color">
        <input type="text" data-tabname="${i}" value="${esc(t.name)}" aria-label="Tab name">
        <button class="btn small" data-up="${i}" title="Move left"${i === 0 ? ' disabled' : ''}>↑</button>
        <button class="btn small" data-down="${i}" title="Move right"${i === state.tabs.length - 1 ? ' disabled' : ''}>↓</button>
        <button class="btn small danger" data-del="${i}" title="Delete tab">✕</button>
      </div>`).join('')}</div>
    <div class="row">
      <button class="btn" id="recolorBtn">Match colors to theme</button>
      <button class="btn" id="recolorBtn" title="Recolor every tab from the current theme">Match tab colors to theme</button>
      <button class="btn" id="addNotes">+ Notes tab</button>
      <button class="btn" id="addMonth">+ Month tab</button>
      <button class="btn" id="addYear">+ Year tab</button>
    </div>

    <h3>Export to PDF</h3>
    <p class="hint">Makes a hyperlinked PDF you can open in GoodNotes, Notability, Notes+ and similar apps. Tabs, calendar days, weeks and [[links]] stay tappable.</p>
    ${fontPicker('pdfFont')}
    ${fontPicker('pdfHeadFont')}
    ${fontPicker('pdfTitleFont')}
    ${pdfSelect('dailyLayout', 'Daily page layout', { planner: 'Daily planner (priorities, to-do, schedule)', simple: 'Simple journal page' })}
    <label>Include cover page<input type="checkbox" data-pdf="coverPage"${pdfOpts().coverPage !== false ? ' checked' : ''}></label>
    ${pdfSelect('size', 'Page size', { a4: 'A4', letter: 'US Letter', tablet: 'Tablet (4:3)' })}
    ${pdfSelect('orient', 'Orientation', { portrait: 'Portrait', landscape: 'Landscape' })}
    ${pdfSelect('weekly', 'Weekly pages', { none: 'None', rows: 'Rows (one line per day)', grid: 'Grid (boxes + notes)', planner: 'Planner (days + priorities)' })}
    ${pdfSelect('daily', 'Daily pages', { none: 'None', entries: 'Only days with entries', all: 'Every day' })}
    ${pdfSelect('dailyStyle', 'Daily page style', NOTE_STYLES.concat([['schedule', 'Hourly schedule + to-do']]))}
    ${pdfSelect('notesStyle', 'Notes page style', NOTE_STYLES)}
    <label>Pages per notes tab<input type="number" data-pdf="notesPages" min="1" max="30" value="${pdfOpts().notesPages}" style="width:70px"></label>
    <label>Use theme colors<input type="checkbox" data-pdf="useTheme"${pdfOpts().useTheme ? ' checked' : ''}></label>
    <div class="row"><button class="btn primary" id="pdfBtn">Export PDF</button><span class="hint" id="pdfEst"></span></div>

    <h3>Data</h3>
    <div class="row">
      <button class="btn" id="exportBtn">Export JSON</button>
      <button class="btn" id="importBtn">Import JSON</button>
      <button class="btn danger" id="resetBtn">Reset all</button>
    </div>
    <input type="file" id="importFile" accept="application/json" hidden>
    <p class="hint">Everything is saved automatically in this browser.</p>`;
  updatePdfEstimate();
  drawCoverThumbs();
}

function refresh(withSettings) { applyTheme(); render(); if (withSettings) renderSettings(); save(); }

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.theme) { state.theme[t.dataset.theme] = t.value; state.theme.preset = 'custom'; document.querySelectorAll('.swatch.on').forEach(x => x.classList.remove('on')); refresh(false); }
  else if (t.id === 'setTitle') { state.title = t.value; refresh(false); }
  else if (t.dataset.tabname !== undefined) { state.tabs[+t.dataset.tabname].name = t.value; renderTabs(parseRoute().arg); save(); }
  else if (t.dataset.tabcolor !== undefined) { state.tabs[+t.dataset.tabcolor].color = t.value; refresh(false); }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.pdf) {
    state.pdf = { ...pdfOpts(), [t.dataset.pdf]: t.type === 'checkbox' ? t.checked : t.type === 'number' ? Math.min(30, Math.max(1, +t.value || 1)) : t.value };
    delete state.pdf.look;
    save(); updatePdfEstimate(); return;
  }
  if (t.id === 'setYear') { state.year = Math.min(2200, Math.max(1900, +t.value || state.year)); save(); }
  else if (t.id === 'setLook') { state.look = t.value; refresh(true); }
  else if (t.id === 'setWeek') { state.weekStart = +t.value; refresh(false); }
  else if (t.dataset.tabname !== undefined) { refresh(true); }
  else if (t.id === 'importFile' && t.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!Array.isArray(s.tabs)) throw new Error('missing tabs');
        state = { ...defaultState(), ...s };
        go('#/tab/index', true); refresh(true);
      } catch (err) { notify('Could not import that file: ' + err.message); }
    };
    r.readAsText(t.files[0]);
  }
});

document.addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (b.id === 'closeSettings') return openSettings(false);
  if (d.cover !== undefined) { state.cover = d.cover; refresh(true); return; }
  if (d.preset) {
    if (!await askConfirm(`Apply the “${PRESETS[d.preset].label}” preset? Your tabs will be replaced (entries and notes pages are kept).`, 'Apply preset')) return;
    const keep = state.tabs.filter(t => t.kind === 'notes' && (state.notes[t.id] || '').trim());
    const fresh = PRESETS[d.preset].build(state.year);
    const names = new Set(fresh.map(t => t.name.toLowerCase()));
    state.tabs = recolorTabs([...fresh, ...keep.filter(t => !names.has(t.name.toLowerCase()))], THEMES[state.theme.preset] || { accent: state.theme.accent });
    go('#/tab/index', true); refresh(true);
  } else if (d.themepreset) {
    const t = THEMES[d.themepreset];
    Object.assign(state.theme, { preset: d.themepreset, paper: t.paper, ink: t.ink, accent: t.accent, bar: t.bar, today: t.today });
    recolorTabs(state.tabs, t);
    refresh(true);
  } else if (d.up !== undefined || d.down !== undefined) {
    const i = +(d.up ?? d.down), j = d.up !== undefined ? i - 1 : i + 1;
    [state.tabs[i], state.tabs[j]] = [state.tabs[j], state.tabs[i]]; refresh(true);
  } else if (d.del !== undefined) {
    const t = state.tabs[+d.del];
    if (!await askConfirm(`Delete the “${t.name}” tab?${t.kind === 'notes' ? ' Its notes will be lost.' : ''}`, 'Delete')) return;
    state.tabs.splice(+d.del, 1); delete state.notes[t.id];
    if (!tabById(parseRoute().arg) && parseRoute().kind === 'tab') go('#/tab/index', true);
    refresh(true);
  } else if (b.id === 'recolorBtn') {
    recolorTabs(state.tabs, THEMES[state.theme.preset] || { accent: state.theme.accent }); refresh(true);
  } else if (b.id === 'addNotes') {
    const t = mk(`Page ${state.tabs.length + 1}`, 'notes', '#777'); state.tabs.push(t); refresh(true);
  } else if (b.id === 'addMonth') {
    const n = new Date(); const m = n.getMonth();
    state.tabs.push(mk(MONTHS[m].slice(0, 3), 'month', MONTH_COLORS[m], { year: state.year, month: m })); refresh(true);
  } else if (b.id === 'addYear') {
    state.tabs.push(mk('Year', 'year', '#c0563b', { year: state.year, month: 0 })); refresh(true);
  } else if (b.id === 'exportBtn') {
    saveFile('calendar-journal.json', new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  } else if (b.id === 'importBtn') $('importFile').click();
  else if (b.id === 'pdfBtn') exportPdf(b);
  else if (b.id === 'resetBtn') {
    if (!await askConfirm('Erase everything and start over?', 'Erase everything')) return;
    state = defaultState(); go('#/tab/index', true); refresh(true);
  }
});

$('settingsBtn').onclick = () => openSettings($('settings').hidden);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('settings').hidden) openSettings(false); });
window.addEventListener('hashchange', () => { if (VALID_ROUTE.test(location.hash) && location.hash !== routeHash) { routeHash = location.hash; render(); } });
window.addEventListener('popstate', () => { if (VALID_ROUTE.test(location.hash)) { routeHash = location.hash; render(); } });
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#/"]');
  if (link) { e.preventDefault(); go(link.getAttribute('href')); }
});
$('backBtn').onclick = () => { if (trail.length) go(trail.pop(), true); };
window.addEventListener('pagehide', () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } });

render();
connectToServer();                     // looks for the Java server; does nothing if there is none
})();
