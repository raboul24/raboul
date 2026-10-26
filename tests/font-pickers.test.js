// Font pickers: every option is drawn in its own typeface, choices apply to the preview and are saved.
const { chromium } = require('playwright');
const { APP_URL, ok, wait, saved } = require('./lib');

(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(APP_URL); await wait(1300);
  const fp = id => `.fp[data-fp="${id}"]`;

  ok(await p.locator('.fp').count() === 3, 'three font pickers: titles, headings, body');
  await p.click(fp('pdfFont') + ' .fp-btn'); await wait(500);
  const info = await p.$$eval(fp('pdfFont') + ' li', els => els.map(e => [e.textContent.replace(' ✓', ''), getComputedStyle(e).fontFamily]));
  ok(info.length === 13, info.length + ' body fonts listed');
  ok(new Set(info.map(i => i[1])).size === info.length, 'every option is drawn in its own font-family');
  await p.click(fp('pdfFont') + ' li:has-text("Lora")'); await wait(300);
  let s = await saved(p);
  ok(s.pdf.font === 'lora', 'choosing Lora saves the body font');
  ok(/Lora/.test(await p.getAttribute(fp('pdfFont') + ' .fp-btn', 'style')), 'the closed picker shows the chosen font');

  // keyboard
  await p.focus(fp('pdfTitleFont') + ' .fp-btn'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await wait(300);
  s = await saved(p);
  ok(s.pdf.titleFont !== 'greatvibes', 'keyboard selection works (title font is now ' + s.pdf.titleFont + ')');
  await p.click(fp('pdfHeadFont') + ' .fp-btn'); await p.keyboard.press('Escape');
  ok(await p.locator(fp('pdfHeadFont') + ' .fp-list').isHidden(), 'Escape closes the list');

  // recommended fonts link appears when fonts differ from the look, and restores them
  await p.click('[data-fontset]'); await wait(300);
  s = await saved(p);
  ok(s.pdf.font === 'cormorant' && s.pdf.titleFont === 'greatvibes', 'the recommended-fonts link restores the look\'s fonts');

  await p.reload(); await wait(1200);
  ok(await p.locator(fp('pdfFont') + ' .fp-btn span').textContent() === 'Cormorant Garamond', 'font choice persists after reload');
  console.log('errors', errs); await b.close();
})();
