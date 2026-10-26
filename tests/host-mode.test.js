// Simulates the hosted claude.ai viewer: confirm()/alert()/print() are dead and files are saved through the downloads capability.
const { chromium } = require('playwright');
const { APP_URL, ok, wait } = require('./lib');

(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => {
    window.confirm = () => false; window.alert = () => {}; window.print = () => {};            // like the hosted viewer
    window.__saved = []; window.__anchor = false;
    window.claude = { use: async n => n === 'downloads' ? { save: async r => { window.__saved.push({ f: r.filename, size: r.data.size, type: r.data.type }); return { status: 'saved' }; } } : null };
    const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__anchor = true; else orig.call(this); };
  });
  await p.goto(APP_URL); await wait(1400);

  // in-page dialog replaces confirm()
  await p.click('[data-step="pages"]'); await p.click('[data-preset="minimal"]');
  ok(await p.locator('#modal:not([hidden])').count() === 1, 'a layout change asks with an in-page dialog (native confirm is blocked)');
  await p.click('[data-m="no"]'); await wait(300);
  ok(await p.locator('#modal').isHidden(), 'cancel closes the dialog');
  await p.click('[data-preset="minimal"]'); await p.click('[data-m="yes"]'); await wait(800);
  await p.click('[data-step="tabs"]'); await wait(300);
  ok(await p.locator('[data-tab-row]').count() === 4, 'the Minimal layout was applied (4 tabs)');
  await p.click('[data-del="3"]'); await p.click('[data-m="yes"]'); await wait(500);
  ok(await p.locator('[data-tab-row]').count() === 3, 'deleting a tab works through the in-page dialog');

  // saving: PDF and JSON go through the downloads capability, never an anchor download
  await p.click('#exportBtn'); await wait(2500);
  await p.click('#moreBtn'); await p.click('#menuBackup'); await wait(400);
  const saved = await p.evaluate(() => window.__saved);
  ok(saved.length === 2 && /\.pdf$/.test(saved[0].f) && saved[0].size > 20000 && saved[0].type === 'application/pdf', 'PDF saved via the downloads capability (' + (saved[0] && saved[0].size) + ' bytes)');
  ok(saved[1] && saved[1].f === 'calendar-journal.json', 'JSON backup saved via the downloads capability');
  ok(!(await p.evaluate(() => window.__anchor)), 'no anchor download was used');
  ok(await p.locator('#toast:not([hidden])').count() === 1, 'a toast confirms the save');
  ok(await p.locator('#menuSearch').isHidden(), 'Search is hidden when there is no Java server');
  console.log('errors', errs); await b.close();
})();
