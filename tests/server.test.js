// End-to-end test of the Java connection: sync between two browsers, conflicts, search, and file safety.
// Run against a server started on an EMPTY data folder, e.g.
//   cd backend && mvn spring-boot:run -Dspring-boot.run.arguments=--journal.data-dir=/tmp/journal-test-data
const { chromium } = require('playwright');
const { SERVER_URL } = require('./lib');

const ok = (c, m) => console.log(c ? 'PASS' : 'FAIL', m);
const wait = ms => new Promise(r => setTimeout(r, ms));
const serverJournal = async () => { const r = await fetch(SERVER_URL + '/api/journal'); return r.status === 404 ? null : r.json(); };

(async () => {
  if (await serverJournal()) { console.log('FAIL the server already holds a journal; start it on an empty --journal.data-dir so real data is never touched'); process.exit(1); }
  const b = await chromium.launch(); const errs = [];
  const open = async () => {                                              // a fresh "browser profile" (empty localStorage)
    const ctx = await b.newContext(); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/status of (404|409)/.test(m.text())) errs.push(m.text()); });   // 404 = "server has no journal yet", 409 = the conflict we provoke on purpose
    await p.goto(SERVER_URL); await wait(700); return p;
  };
  const typeToday = async (p, text) => { await p.click('#todayBtn'); await p.waitForSelector('#editor'); await p.fill('#editor', text); await wait(1600); };

  // 1. device A connects and its entry is saved on the server
  const A = await open();
  await A.click('#settingsBtn');
  ok(await A.locator('#searchInput').count() === 1, 'search box appears when the Java server is found');
  await A.click('#closeSettings');
  await typeToday(A, 'Dentist at nine [[Goals]]');
  let s = await serverJournal();
  ok(s && s.revision >= 1 && Object.values(s.state.days).includes('Dentist at nine [[Goals]]'), 'entry is saved on the server (revision ' + (s && s.revision) + ')');

  // 2. search finds it, and clicking a result opens that day
  await A.click('#settingsBtn'); await A.fill('#searchInput', 'dentist'); await A.waitForSelector('.search-results a');
  ok(/Dentist/.test(await A.textContent('.search-results a small')), 'search returns a snippet');
  await A.click('.search-results a'); await wait(300);
  ok(await A.locator('#editor').inputValue() === 'Dentist at nine [[Goals]]', 'clicking a result opens the entry');

  // 3. a brand-new browser silently adopts the server's copy
  const B = await open();
  ok((await B.evaluate(() => localStorage.getItem('calendar-journal-v1'))).includes('Dentist at nine'), 'second device loads the server copy');

  // 4. conflict: B saves, then A (out of date) saves -> dialog -> "Use server copy"
  await typeToday(B, 'Written on device B');
  await A.click('#closeSettings').catch(() => {}); await typeToday(A, 'Written on device A');
  await A.waitForSelector('#modal:not([hidden])', { timeout: 4000 });
  ok(/different copy/.test(await A.textContent('.modal-card p')), 'conflict dialog appears instead of overwriting');
  await A.click('[data-m="yes"]'); await wait(500);
  ok(await A.locator('#editor').inputValue() === 'Written on device B', '"Use server copy" adopts the other device\'s text');

  // 5. conflict again, this time "Keep this device" overwrites the server
  await typeToday(B, 'B edits again'); await typeToday(A, 'A wins this one');
  await A.waitForSelector('#modal:not([hidden])', { timeout: 4000 });
  await A.click('[data-m="no"]'); await wait(1800);
  s = await serverJournal();
  ok(Object.values(s.state.days).includes('A wins this one'), '"Keep this device" replaces the server copy');

  // 6. nothing else in the repo is exposed
  for (const p of ['/backend/pom.xml', '/PLAN.md', '/.git/config', '/fonts/%2e%2e%2fPLAN.md', '/fonts/..%2fPLAN.md']) {
    const status = (await fetch(SERVER_URL + p)).status;          // Tomcat answers 400 for encoded-slash tricks, 404 otherwise: both mean "refused"
    ok(status === 404 || status === 400, `not served (${status}): ${p}`);
  }
  console.log('errors', errs); await b.close();
})();
