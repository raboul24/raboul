const { APP_URL, OUT } = require('./lib');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({acceptDownloads:true}); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP_URL);
  await p.click('#settingsBtn');
  await p.selectOption('[data-pdf="weekly"]','planner'); await p.selectOption('[data-pdf="notesStyle"]','cornell');
  console.log('estimate:', await p.textContent('#pdfEst'));
  const [d] = await Promise.all([p.waitForEvent('download'), p.click('#pdfBtn')]);
  console.log('file:', d.suggestedFilename()); await d.saveAs(OUT+'/ui.pdf');
  await p.reload(); await p.click('#settingsBtn');
  console.log('persisted weekly:', await p.inputValue('[data-pdf="weekly"]'));
  console.log('errors',errs); await b.close();
})();
