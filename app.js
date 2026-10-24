(() => {
'use strict';

const STORE_KEY = 'calendar-journal-v1';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_COLORS = ['#5b7fa6','#8e6bb0','#4f9d8a','#6aa84f','#c9a227','#e0873a','#d9534f','#c2548d','#a0663c','#7a8b3c','#4c7aa0','#5d6d7e'];

const THEMES = {
  classic:  { label: 'Classic',  paper: '#fffdf7', ink: '#2b2a33', accent: '#c0563b', bar: '#efe6d2', today: '#ffe08a' },
  midnight: { label: 'Midnight', paper: '#1f2230', ink: '#e8e8f0', accent: '#7aa2f7', bar: '#161824', today: '#3b4261' },
  ocean:    { label: 'Ocean',    paper: '#f4fbfd', ink: '#17323d', accent: '#0e7c9b', bar: '#cfe9f1', today: '#ffe9a8' },
  forest:   { label: 'Forest',   paper: '#f7faf2', ink: '#223322', accent: '#4a7c3a', bar: '#dbe8cc', today: '#f6e27a' },
  rose:     { label: 'Rose',     paper: '#fff8f8', ink: '#3a2630', accent: '#c2417a', bar: '#f6dbe5', today: '#ffd6e0' },
  lavender: { label: 'Lavender', paper: '#faf8ff', ink: '#2c2540', accent: '#7c5cc4', bar: '#e5dcf7', today: '#fbe7a1' },
  mono:     { label: 'Mono',     paper: '#ffffff', ink: '#111111', accent: '#444444', bar: '#e6e6e6', today: '#dddddd' },
};
const FONTS = {
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
  theme: { preset: 'classic', ...THEMES.classic, font: Object.values(FONTS)[0], headFont: '' },
  tabs: PRESETS.full.build(new Date().getFullYear()),
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
  }, 150);
}

/* ---------- Theme ---------- */
function applyTheme() {
  const r = document.documentElement.style, t = state.theme;
  r.setProperty('--paper', t.paper); r.setProperty('--ink', t.ink); r.setProperty('--accent', t.accent);
  r.setProperty('--bar', t.bar); r.setProperty('--today', t.today); r.setProperty('--font', t.font); r.setProperty('--font-head', t.headFont || t.font);
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
function parseRoute() {
  const [, kind, arg] = (location.hash || '').split('/');
  return { kind: kind || 'tab', arg: arg ? decodeURIComponent(arg) : '' };
}
let previewMode = false;
let lastRouteKey = '';

function render() {
  const route = parseRoute();
  if (route.kind === 'new') {
    const name = route.arg || 'Untitled';
    let tab = state.tabs.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (!tab) { tab = mk(name, 'notes', '#777'); state.tabs.push(tab); save(); }
    location.replace(`#/tab/${tab.id}`);
    return;
  }
  if (route.kind === 'day' && route.arg === 'today') { location.replace(`#/day/${todayKey()}`); return; }

  const key = location.hash;
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
  $('page').innerHTML = page;
  bindPage(route);
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
  return `<h1>${esc(state.title)}</h1>
    <p class="sub">${DOWS[new Date(y, m, d).getDay()]}, ${MONTHS[m]} ${d}, ${y} · <a href="#/day/today">Open today’s page →</a></p>
    <h3>Jump to</h3>
    <ul class="toc">${state.tabs.filter(x => x.kind !== 'index').map(x =>
      `<li><a href="#/tab/${x.id}" style="--tab-color:${esc(x.color)}">${esc(x.name)}<br><small class="hint">${{ year: 'Year overview', month: `${MONTHS[x.month]} ${x.year}`, notes: 'Notes page' }[x.kind]}</small></a></li>`).join('')}</ul>
    ${state.tabs.length < 2 ? '<p class="hint">Open “Customize” to choose a preset or add tabs.</p>' : ''}`;
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
};
const NOTE_STYLES = [['blank', 'Blank'], ['lined', 'Lined'], ['dotted', 'Dotted'], ['grid', 'Grid'], ['cornell', 'Cornell notes'], ['checklist', 'Checklist']];
const pdfOpts = () => ({ ...JournalPDF.DEFAULTS, ...state.pdf });
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
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.title.replace(/[^\w -]+/g, '').trim() || 'calendar-journal') + '.pdf';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (err) { alert('PDF export failed: ' + err.message); console.error(err); }
  btn.disabled = false; btn.textContent = label;
}

const fontOptions = cur => Object.entries(FONTS).map(([n, f]) => `<option value="${esc(f)}" style="font-family:${esc(f)}"${cur === f ? ' selected' : ''}>${n}</option>`).join('');

function renderSettings() {
  const s = $('settings');
  s.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:center"><h2>Customize</h2><button class="btn small" id="closeSettings">Close ✕</button></div>

    <h3>Journal</h3>
    <label>Title<input type="text" id="setTitle" value="${esc(state.title)}"></label>
    <label>Year<input type="number" id="setYear" value="${state.year}" min="1900" max="2200" style="width:90px"></label>
    <label>Week starts on<select id="setWeek"><option value="0"${state.weekStart === 0 ? ' selected' : ''}>Sunday</option><option value="1"${state.weekStart === 1 ? ' selected' : ''}>Monday</option></select></label>

    <h3>Calendar presets</h3>
    <div class="presets">${Object.entries(PRESETS).map(([k, p]) =>
      `<button class="btn" data-preset="${k}">${p.label}<small>${p.desc}</small></button>`).join('')}</div>
    <p class="hint">Applying a preset uses the year above and replaces your tabs. Your day entries and notes pages are kept.</p>

    <h3>Color themes</h3>
    <div class="swatches">${Object.entries(THEMES).map(([k, t]) =>
      `<button class="swatch${state.theme.preset === k ? ' on' : ''}" data-themepreset="${k}" title="${t.label}"><div class="bars"><i style="background:${t.paper}"></i><i style="background:${t.accent}"></i><i style="background:${t.bar}"></i><i style="background:${t.today}"></i></div><span>${t.label}</span></button>`).join('')}</div>

    <h3>Custom colors</h3>
    ${colorInput('paper', 'Page paper')}${colorInput('ink', 'Text')}${colorInput('accent', 'Links & accents')}${colorInput('bar', 'Top bar')}${colorInput('today', 'Today highlight')}
    <label>Body font<select id="setFont" style="max-width:200px">${fontOptions(state.theme.font)}</select></label>
    <label>Heading font<select id="setHeadFont" style="max-width:200px"><option value="">Same as body</option>${fontOptions(state.theme.headFont)}</select></label>
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
      <button class="btn" id="addNotes">+ Notes tab</button>
      <button class="btn" id="addMonth">+ Month tab</button>
      <button class="btn" id="addYear">+ Year tab</button>
    </div>

    <h3>Export to PDF</h3>
    <p class="hint">Makes a hyperlinked PDF you can open in GoodNotes, Notability, Notes+ and similar apps. Tabs, calendar days, weeks and [[links]] stay tappable.</p>
    ${pdfSelect('font', 'PDF body font', PDF_FONTS)}
    ${pdfSelect('headFont', 'PDF heading font', { auto: 'Match journal heading font', same: 'Same as body (bold)', ...Object.fromEntries(Object.entries(PDF_FONTS).filter(([k]) => k !== 'auto')) })}
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
      <button class="btn" id="printBtn">Print page</button>
      <button class="btn danger" id="resetBtn">Reset all</button>
    </div>
    <input type="file" id="importFile" accept="application/json" hidden>
    <p class="hint">Everything is saved automatically in this browser.</p>`;
  updatePdfEstimate();
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
    save(); updatePdfEstimate(); return;
  }
  if (t.id === 'setYear') { state.year = Math.min(2200, Math.max(1900, +t.value || state.year)); save(); }
  else if (t.id === 'setWeek') { state.weekStart = +t.value; refresh(false); }
  else if (t.id === 'setFont') { state.theme.font = t.value; refresh(false); }
  else if (t.id === 'setHeadFont') { state.theme.headFont = t.value; refresh(false); }
  else if (t.dataset.tabname !== undefined) { refresh(true); }
  else if (t.id === 'importFile' && t.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!Array.isArray(s.tabs)) throw new Error('missing tabs');
        state = { ...defaultState(), ...s };
        location.hash = '#/tab/index'; refresh(true);
      } catch (err) { alert('Could not import that file: ' + err.message); }
    };
    r.readAsText(t.files[0]);
  }
});

document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (b.id === 'closeSettings') return openSettings(false);
  if (d.preset) {
    if (!confirm(`Apply the “${PRESETS[d.preset].label}” preset? Your tabs will be replaced (entries and notes pages are kept).`)) return;
    const keep = state.tabs.filter(t => t.kind === 'notes' && (state.notes[t.id] || '').trim());
    const fresh = PRESETS[d.preset].build(state.year);
    const names = new Set(fresh.map(t => t.name.toLowerCase()));
    state.tabs = [...fresh, ...keep.filter(t => !names.has(t.name.toLowerCase()))];
    location.hash = '#/tab/index'; refresh(true);
  } else if (d.themepreset) {
    const t = THEMES[d.themepreset];
    Object.assign(state.theme, { preset: d.themepreset, paper: t.paper, ink: t.ink, accent: t.accent, bar: t.bar, today: t.today });
    refresh(true);
  } else if (d.up !== undefined || d.down !== undefined) {
    const i = +(d.up ?? d.down), j = d.up !== undefined ? i - 1 : i + 1;
    [state.tabs[i], state.tabs[j]] = [state.tabs[j], state.tabs[i]]; refresh(true);
  } else if (d.del !== undefined) {
    const t = state.tabs[+d.del];
    if (!confirm(`Delete the “${t.name}” tab?${t.kind === 'notes' ? ' Its notes will be lost.' : ''}`)) return;
    state.tabs.splice(+d.del, 1); delete state.notes[t.id];
    if (!tabById(parseRoute().arg) && parseRoute().kind === 'tab') location.hash = '#/tab/index';
    refresh(true);
  } else if (b.id === 'addNotes') {
    const t = mk(`Page ${state.tabs.length + 1}`, 'notes', '#777'); state.tabs.push(t); refresh(true);
  } else if (b.id === 'addMonth') {
    const n = new Date(); const m = n.getMonth();
    state.tabs.push(mk(MONTHS[m].slice(0, 3), 'month', MONTH_COLORS[m], { year: state.year, month: m })); refresh(true);
  } else if (b.id === 'addYear') {
    state.tabs.push(mk('Year', 'year', '#c0563b', { year: state.year, month: 0 })); refresh(true);
  } else if (b.id === 'exportBtn') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.download = 'calendar-journal.json'; a.click(); URL.revokeObjectURL(a.href);
  } else if (b.id === 'importBtn') $('importFile').click();
  else if (b.id === 'printBtn') window.print();
  else if (b.id === 'pdfBtn') exportPdf(b);
  else if (b.id === 'resetBtn') {
    if (!confirm('Erase everything and start over?')) return;
    state = defaultState(); location.hash = '#/tab/index'; refresh(true);
  }
});

$('settingsBtn').onclick = () => openSettings($('settings').hidden);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('settings').hidden) openSettings(false); });
window.addEventListener('hashchange', render);
window.addEventListener('pagehide', () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } });

if (!location.hash) location.replace('#/tab/index');
render();
})();
