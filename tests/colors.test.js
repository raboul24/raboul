// The three color layers (page color, accent, tab palette) must not overwrite each other.
const { chromium } = require('playwright');
const { APP_URL, ok, wait, saved } = require('./lib');

const lum = h => { h = h.replace('#', ''); const [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const monthColors = s => s.tabs.filter(t => t.kind === 'month').map(t => t.color);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(APP_URL); await wait(1200);

  await p.click('[data-opt="look"][data-value="elegant"]');           // a harmless click: nothing is saved until the first change
  let s0 = await saved(p);
  ok(s0.theme.pageColor === 'sand' && s0.theme.tabPalette === 'neutral' && s0.theme.accentBase === '#b59a6b', 'starts as Sand + Gold + Neutral tabs');

  // 1. page color changes only the page
  await p.click('[data-page-color="white"]');
  let s = await saved(p);
  ok(s.theme.paper === '#ffffff' && s.theme.accentBase === s0.theme.accentBase && s.theme.tabPalette === 'neutral', 'page color: paper changes, accent and palette stay');
  ok(JSON.stringify(monthColors(s)) === JSON.stringify(monthColors(s0)), 'page color: tab colors unchanged');

  // 2. accent changes only the accent (the calendar tab follows it, month tabs do not)
  const before = monthColors(s);
  await p.click('[data-accent="#c9788a"]');
  s = await saved(p);
  ok(s.theme.accentBase === '#c9788a' && s.theme.paper === '#ffffff' && s.theme.pageColor === 'white', 'accent: accent changes, page stays');
  ok(JSON.stringify(monthColors(s)) === JSON.stringify(before), 'accent: month tab colors unchanged');
  ok(s.tabs.find(t => t.kind === 'year').color === '#c9788a', 'accent: the Calendar tab uses the accent');

  // 3. tab palette changes only the tabs
  await p.click('[data-palette="pastel"]');
  s = await saved(p);
  ok(s.theme.paper === '#ffffff' && s.theme.accentBase === '#c9788a' && s.theme.tabPalette === 'pastel', 'palette: page and accent stay');
  ok(monthColors(s)[0] === '#e8a5a5', 'palette: months use the pastel colors');

  // 4. dark page: text turns light and the accent is lightened automatically, but the chosen accent is remembered
  await p.click('[data-page-color="plum"]');
  s = await saved(p);
  ok(lum(s.theme.paper) < 0.5 && lum(s.theme.ink) > 0.7, 'dark page gets light text');
  ok(s.theme.accentBase === '#c9788a' && lum(s.theme.accent) > lum('#c9788a'), 'dark page: accent lightened for contrast, choice remembered');
  await p.click('[data-page-color="sand"]');
  s = await saved(p);
  ok(s.theme.accent === '#c9788a', 'going back to a light page restores the exact accent');

  // 5. a starting point sets all three layers at once
  await p.click('[data-combo="3"]');
  s = await saved(p);
  ok(s.theme.pageColor === 'plum' && s.theme.accentBase === '#b59a6b' && s.theme.tabPalette === 'jewel', 'starting point sets page + accent + tabs');

  // 6. hand-colored tabs are protected from later changes
  await p.click('[data-step="tabs"]');
  await p.evaluate(() => { const i = document.querySelector('[data-tab-color="3"]'); i.value = '#ff0000'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  s = await saved(p);
  ok(s.tabs[3].color === '#ff0000' && s.theme.tabPalette === 'custom', 'editing one tab color switches to a custom palette');
  await p.click('[data-step="style"]'); await p.click('[data-accent="#3f8a8c"]');
  s = await saved(p);
  ok(s.tabs[3].color === '#ff0000', 'a later accent change does not overwrite hand-colored tabs');
  await p.click('[data-palette="earth"]');
  s = await saved(p);
  ok(s.tabs[3].color !== '#ff0000', 'picking a palette on purpose recolors them');

  console.log('errors', errs); await b.close();
})();
