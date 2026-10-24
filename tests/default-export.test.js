const { APP_URL, OUT } = require('./lib');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({acceptDownloads:true}); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(APP_URL); await p.click('#settingsBtn'); await p.waitForTimeout(400);
  await p.selectOption('[data-pdf="daily"]','all'); console.log('estimate:', await p.textContent('#pdfEst'));
  await p.selectOption('[data-pdf="daily"]','none');
  const t0=Date.now(); const [d] = await Promise.all([p.waitForEvent('download'), p.click('#pdfBtn')]); await d.saveAs(OUT+'/final.pdf'); console.log('export ms', Date.now()-t0);
  console.log('errors',errs); await b.close();
})();
