// A journal saved by the previous (journal-viewer) version must open in the new planner builder with nothing lost.
const { chromium } = require('playwright');
const { APP_URL, KEY, ok, wait, saved } = require('./lib');

const OLD = {                       // shape written by the previous version of the app
  title: 'Old Planner', year: 2026, weekStart: 1, look: 'soft', cover: 'stars',
  theme: { preset: 'pagePlum', paper: '#5b4b80', ink: '#f5effc', accent: '#dcc9a0', bar: '#4a3c6b', today: '#7b69a5', font: '"Cormorant Garamond", Georgia, serif', headFont: '"Playfair Display", Georgia, serif', titleFont: '"Great Vibes", cursive', tabs: ['#b8a6dc'] },
  tabs: [{ id: 'i', name: 'Index', kind: 'index', color: '#444' }, { id: 'm1', name: 'Jan', kind: 'month', color: '#5b7fa6', year: 2026, month: 0 }, { id: 'n1', name: 'Goals', kind: 'notes', color: '#4f9d8a' }],
  days: { '2026-01-05': 'Dentist 9am' }, notes: { n1: 'Learn Java' },
  pdf: { size: 'letter', orient: 'landscape', weekly: 'rows', daily: 'entries', font: 'auto', headFont: 'auto', titleFont: 'auto', notesPages: 3 },
};

(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [KEY, JSON.stringify(OLD)]);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(APP_URL); await wait(1500);

  ok(await p.inputValue('#titleInput') === 'Old Planner', 'title carried over');
  ok(/Letter landscape/.test(await p.textContent('#exportInfo')), 'page size and orientation carried over: ' + await p.textContent('#exportInfo'));
  ok(/Day: Jan 5/.test((await p.locator('#jump option').allTextContents()).join('|')), 'the saved date still gets its daily page');
  await p.click('[data-opt="look"][data-value="soft"]');             // forces a save so we can inspect the migrated shape
  const s = await saved(p);
  ok(s.theme.pageColor === 'plum' && s.theme.accentBase === '#dcc9a0' && s.theme.tabPalette === 'custom', 'old theme became page color + accent + (custom) tab colors');
  ok(s.pdf.font === 'cormorant' && s.pdf.headFont === 'playfair' && s.pdf.titleFont === 'greatvibes', 'old "auto" fonts became explicit fonts: ' + [s.pdf.font, s.pdf.headFont, s.pdf.titleFont]);
  ok(s.days['2026-01-05'] === 'Dentist 9am' && s.notes.n1 === 'Learn Java', 'dates and notes kept');
  ok(s.tabs.find(t => t.id === 'm1').color === '#5b7fa6', 'hand-picked tab colors are not recolored by the migration');
  await p.click('[data-step="pages"]'); await wait(300);
  ok(await p.inputValue('[data-day-text]') === 'Dentist 9am', 'the old entry shows up in Dates & events');
  console.log('errors', errs); await b.close();
})();
