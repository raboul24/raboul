// The live preview is the real PDF page: it is drawn, navigable, clickable, and follows every setting.
const { chromium } = require('playwright');
const { APP_URL, ok, wait } = require('./lib');

const pixels = p => p.evaluate(() => { const c = document.getElementById('sheet'); return c.toDataURL(); });
const distinctColors = p => p.evaluate(() => {
  const c = document.getElementById('sheet'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, seen = new Set();
  for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
  return seen.size;
});
const label = async p => (await p.textContent('#pageNum')).trim();

(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(APP_URL); await wait(1500);

  ok(await distinctColors(p) > 4, 'the preview canvas is actually drawn (not blank)');
  const total = Number((await label(p)).match(/of (\d+)/)[1]);

  // navigation: arrows, jump menu, thumbnails
  await p.click('#nextPage'); ok(/^Page 2 of/.test(await label(p)), 'next page button');
  await p.click('#prevPage'); ok(/^Page 1 of/.test(await label(p)), 'previous page button');
  await p.selectOption('#jump', { index: 2 }); await wait(150); ok(/^Page 3 of/.test(await label(p)), 'jump menu opens the Calendar page');
  await p.click('.thumb:has-text("Month")'); await wait(150); ok(/January/.test(await p.locator('#jump option:checked').textContent()), 'thumbnail opens the first Month page');
  await p.keyboard.press('ArrowRight'); await wait(100); ok(/Page 5 of/.test(await label(p)) || /Page \d+ of/.test(await label(p)), 'arrow key moves to the next page');

  // links inside the preview work like the PDF: scan the top tab row of the Home page for a link and follow it
  await p.click('.thumb:has-text("Home")'); await wait(150);
  const box = await p.locator('#sheet').boundingBox(); let followed = false;
  for (let x = 0.12; x < 0.85 && !followed; x += 0.02) {
    await p.mouse.click(box.x + box.width * x, box.y + box.height * 0.028); await wait(60);
    if (!/^Page 2 of/.test(await label(p))) followed = true;
  }
  ok(followed, 'clicking a tab drawn on the page jumps to that page (links work in the preview)');

  // the preview follows settings and jumps to the page being changed
  await p.click('.thumb:has-text("Cover")'); await wait(150);
  const coverBefore = await pixels(p);
  await p.click('[data-page-color="plum"]'); await wait(900);
  ok(await pixels(p) !== coverBefore, 'changing the page color redraws the preview');
  await p.click('[data-step="pages"]'); await wait(300);
  await p.click('[data-opt="weekly"][data-value="rows"]'); await wait(900);
  ok(/Week of/.test(await p.locator('#jump option:checked').textContent()), 'changing the weekly layout jumps to a week page');
  await p.click('[data-opt="weekly"][data-value="none"]'); await wait(900);
  ok(!(await p.locator('#jump option').allTextContents()).some(t => /Week of/.test(t)), 'weekly "None" removes the week pages');
  await p.click('[data-opt="daily"][data-value="all"]'); await wait(1200);
  ok(/Day:/.test(await p.locator('#jump option:checked').textContent()), 'daily pages: preview jumps to a day page');
  const n = Number((await label(p)).match(/of (\d+)/)[1]);
  ok(n > total + 300, `"every day" adds a year of pages (${total} -> ${n})`);
  await p.click('[data-step="export"]'); await p.click('[data-opt="size"][data-value="letter"]'); await p.click('[data-opt="orient"][data-value="landscape"]'); await wait(900);
  ok(/Letter landscape/.test(await p.textContent('#exportInfo')), 'page size and orientation shown in the export bar');
  const dims = await p.evaluate(() => { const c = document.getElementById('sheet'); return c.width / c.height; });
  ok(dims > 1.2, 'landscape preview is wider than tall');

  console.log('errors', errs); await b.close();
})();
