// Shared helpers for the browser tests.
const path = require('path');
const os = require('os');
const fs = require('fs');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');                     // repo root (index.html lives here)
const OUT = process.env.JOURNAL_TEST_OUT || path.join(os.tmpdir(), 'journal-tests');   // where PDFs/screenshots go
fs.mkdirSync(OUT, { recursive: true });

module.exports = {
  ROOT,
  OUT,
  APP_URL: pathToFileURL(path.join(ROOT, 'index.html')).href,   // the app opened as a plain file (no server)
  SERVER_URL: process.env.JOURNAL_SERVER_URL || 'http://localhost:8080',
};
