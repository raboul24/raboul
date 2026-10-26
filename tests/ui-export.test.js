// Open the app, check the live preview, export a PDF with a normal browser download.
const { chromium } = require('playwright');
const fs = require('fs');
const { APP_URL, OUT, ok, wait } = require('./lib');

(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 900 } })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(APP_URL); await wait(1500);

  ok(/^Page 1 of \d+/.test(await p.textContent('#pageNum')), 'live preview shows page 1');
  ok(/pages · A4 portrait/.test(await p.textContent('#exportInfo')), 'export bar shows page count and size: ' + await p.textContent('#exportInfo'));
  ok(await p.locator('.step').count() === 4, 'four steps: Style, Pages, Tabs, Export');
  ok(await p.locator('#exportBtn').isVisible(), 'Export button is always visible');

  const [d] = await Promise.all([p.waitForEvent('download'), p.click('#exportBtn')]);
  const file = OUT + '/ui-export.pdf'; await d.saveAs(file);
  const bytes = fs.readFileSync(file);
  ok(d.suggestedFilename() === 'My Calendar Journal.pdf', 'file is named after the planner title');
  ok(bytes.subarray(0, 5).toString() === '%PDF-' && bytes.length > 20000, `a real PDF was saved (${bytes.length} bytes)`);
  ok(await p.textContent('#exportBtn span') === 'Export PDF', 'button label restored after export');
  console.log('errors', errs); await b.close();
})();
