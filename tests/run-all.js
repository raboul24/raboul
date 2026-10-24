// Runs every *.test.js in this folder and fails if any prints FAIL, reports page errors, or exits non-zero.
// The server test is skipped unless the Java server is running on an EMPTY data folder (see README).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { SERVER_URL, OUT } = require('./lib');

(async () => {
  let serverUp = false;
  try { serverUp = (await (await fetch(SERVER_URL + '/api/health')).json()).service === 'journal-backend'; } catch (e) { /* not running */ }

  let failed = 0;
  for (const file of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
    if (file === 'server.test.js' && !serverUp) { console.log(`SKIP  ${file} (Java server not running at ${SERVER_URL})`); continue; }
    const r = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8', timeout: 180000 });
    const out = (r.stdout || '') + (r.stderr || '');
    const pageErrors = /^errors \[\s*[^\]\s]/m.test(out);
    const bad = r.status !== 0 || /^FAIL/m.test(out) || pageErrors;
    console.log(`${bad ? 'FAIL' : 'PASS'}  ${file}`);
    if (bad) { failed++; console.log(out.split('\n').filter(l => /FAIL|errors|Error/.test(l)).join('\n')); }
  }

  // Optional: check that every link in the PDFs written above points at a real page (needs python3 + pypdf).
  const py = spawnSync('python3', [path.join(__dirname, 'check_pdf_links.py'), OUT], { encoding: 'utf8' });
  console.log((py.stdout || py.stderr || '').trim());
  if (py.status === 1) failed++;

  console.log(failed ? `\n${failed} test file(s) failed` : '\nAll browser tests passed');
  process.exit(failed ? 1 : 0);
})();
