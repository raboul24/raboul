// A realistic walk-through: set up a planner through the UI and export it. The PDFs are kept in OUT for the link check.
const { chromium } = require('playwright');
const fs = require('fs');
const { APP_URL, OUT, ok, wait } = require('./lib');

(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 900 } })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(APP_URL); await wait(1300);
  const exportNow = async name => {
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('#exportBtn')]); await d.saveAs(`${OUT}/${name}.pdf`);
    return fs.statSync(`${OUT}/${name}.pdf`).size;
  };

  ok(/^\d+ pages/.test(await p.textContent('#exportInfo')), 'default planner: ' + await p.textContent('#exportInfo'));
  ok(await exportNow('default-export') > 20000, 'default planner exports');

  await p.click('[data-combo="1"]');                                   // Blush Garden
  await p.click('[data-cover="meadow"]');
  await p.click('[data-step="pages"]');
  await p.click('#addDay'); await p.fill('[data-day-text]', 'Mom\'s birthday — call [[Goals]]'); await wait(400);
  await p.click('[data-opt="daily"][data-value="entries"]'); await wait(900);
  ok(/Day:/.test(await p.locator('#jump option:checked').textContent()), 'a date with text gets its own daily page');
  await p.click('[data-step="tabs"]'); await p.click('#addNotes'); await wait(300);
  await p.fill('[data-note]', 'Remember the [[Calendar]] tab'); await wait(300);
  ok(await exportNow('styled-export') > 20000, 'a customized planner exports (cover, colors, daily page, notes text)');
  console.log('errors', errs); await b.close();
})();
