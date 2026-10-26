# Prompt: recreate the Calendar Journal planner builder

Copy everything below the line into a new coding-agent session in an empty repository.

---

Build **Calendar Journal**, a planner builder that runs in the browser. The user designs a planner, sees the real PDF pages in a live preview, and exports a **hyperlinked PDF** for GoodNotes, Notability and Notes+ (every tab, date and `[[link]]` is a tappable link). It is NOT a place to type journal entries. An optional **Java 21 / Spring Boot backend** adds file storage, search and multi-device sync. Work in phases, test each phase, and tell me what you built and what you could not verify. If a requirement is ambiguous, pick the sensible default and say so. Do not open a pull request unless I ask.

## 1. Hard constraints
- **Front end:** plain HTML, CSS and JavaScript. No framework, no bundler, no npm runtime dependencies, no build step. It must work when `index.html` is opened as a `file://` page, from the Java server, and inside a sandboxed hosted viewer (see section 12). It also works offline: no CDN scripts, no Google Fonts. Fonts are bundled.
- **PDF engine:** write the PDF yourself (no jsPDF or similar) in `pdf.js`.
- **Files:** `index.html`, `styles.css`, `app.js` (UI and state), `pdf.js` (PDF writer and preview painter), `covers.js` (procedural covers), `fonts/`, `artifact.html` (the same page without the document wrapper, for hosting), `backend/` (Java), `tests/` (Node + Playwright), `tools/` (Python helpers that regenerate fonts), `README.md`, `PLAN.md`.
- **Quality:** responsive (desktop, tablet, phone), follows the device light/dark setting, keyboard accessible with visible focus, respects `prefers-reduced-motion`. No `alert`, `confirm` or `prompt` (they are disabled in the hosted viewer). Use an in-page dialog and a toast.
- **Process:** write tests as you go and run them. Do not claim something works unless you ran it. Match the style of existing code and keep comments short and explanatory.

## 2. Interface
One screen, four steps, plus a live preview.
- **Top bar:** logo, an editable planner title field, a pill-style step switcher (**Style · Pages · Tabs · Export**, each with a small line icon), and a **⋯** menu: *Search entries…* (shown only when the Java server is connected), *Back up journal (JSON)*, *Restore from backup…*, *Reset everything…*.
- **Left panel** (scrolls on its own): the controls of the current step as rounded cards. Switching steps scrolls to the top.
- **Right stage:** a canvas showing one real PDF page, fitted to the available space. Above it: previous and next buttons, a *Jump to page* menu (listing every page by name, such as "3. Calendar", "Week of Jan 5", "Day: Jan 5"), and "Page N of M". Below it: a thumbnail strip of the first page of each type that exists (Cover, Home, Calendar, Month, Week, Day, Notes). Clicking a tab or date drawn on the canvas jumps to that page (hit-test the link rectangles; pointer cursor on hover). Left and right arrow keys change page when not typing.
- **Bottom bar (always visible):** "N pages · A4 portrait" and a large primary **Export PDF** button (label becomes "Building…" while working).
- **Preview behavior:** after any change, redraw within about 120 ms (debounced) and **jump to the page the change affects** (changing weekly layout shows a week page, daily options a day page, a color shows Home, a cover shows the cover, and so on).
- **Tablet and phone (under 1000 px):** the preview goes on top, the controls scroll below, the export bar is fixed to the bottom, and the step labels shrink to icons except the active one. No horizontal page scroll.
- **Look:** a clean modern app UI in warm neutrals with one indigo brand color, 16 px rounded cards, pill chips, circular swatches, iOS-style switches, soft shadows, a dotted stage background, and a blurred modal backdrop. Provide full dark-mode tokens. The planner pages have their own style (below); this only styles the app around them.

### Step 1: Style
Cards, in this order:
1. **Starting points:** 8 one-tap combos (name, page color, accent, tab palette): Sand & Gold, Blush Garden, Sage Studio, Midnight Plum, Ocean Calm, Cocoa Cream, Clean White, Lilac Dream. Each card shows a mini sheet, an accent line and three tab dots. The active combo is highlighted.
2. **Look:** Elegant / Soft / Classic chips.
3. **Page color:** 10 swatches (Sand `#f5efe3`, White, Blush, Sage Mist, Lilac Mist, Blue Mist, Olive, Slate, Plum, Cocoa, with matching text colors, light text on dark pages) plus a Custom color picker.
4. **Accent color:** 10 swatches (Gold `#b59a6b`, Rose, Terracotta, Sage, Teal, Sky, Indigo, Plum, Slate, Charcoal) plus Custom.
5. **Tab colors:** palettes Neutral, Pastel, Jewel, Earth, Mono, Match accent (shades of the accent).
6. **Fonts:** three custom pickers (Titles, Headings, Body text). Every option is drawn in its own typeface, with keyboard support (arrows, Enter, Esc) and a check mark. A "use the look's recommended fonts" link appears when fonts differ from the look's set (Elegant: Cormorant / same / Great Vibes; Soft: Quicksand / Playfair / Playfair; Classic: Helvetica / same / same).
7. **Cover:** None plus 8 covers as thumbnails.

### Color model (important: three independent layers)
Page color, accent and tab palette never overwrite each other. Page color sets only paper and text. Accent sets only the accent. A palette sets only tab colors (the Calendar tab always uses the accent). The only automatic adjustments are for readability: on dark pages (luminance under 0.5) the *effective* accent is the chosen accent mixed 50% toward white and tab markers are lightened, but the chosen accent is remembered (`theme.accentBase`) and returns on a light page. "Today" highlight and bar color are derived, not pickers. Picking a combo sets all three layers once. Editing one tab's color by hand switches the palette to "custom"; custom-colored tabs are never recolored later unless the user picks a palette on purpose.

### Step 2: Pages
- **Start from:** 5 layouts that replace the tabs and keep dates and notes text (confirm with an in-page dialog): Full year, Academic year (Aug to Jul), Fiscal year (Apr to Mar), Monthly planner (no year page), Minimal.
- **Calendar:** year stepper (changing it shifts every month and year tab by the difference, keeping tab order) and week starts on Sunday or Monday.
- **Pages to include:** *Cover page* switch; *Weekly pages* None / Rows / Grid / Planner; *Daily pages* None / Dates with text / Every day (warn about ~365 pages); when daily is on: *Daily layout* Daily planner / Simple page (and for Simple, a page style chip set: Blank, Lined, Dotted, Grid, Cornell, Checklist, Schedule); *Notes pages per tab* stepper (1 to 30); *Notes page style* chips.
- **Dates & events:** a list of rows (date input, text input, remove button) plus "+ Add a date". Text prints on the matching calendar and week pages, and `[[Tab Name]]` or `[[2026-12-25]]` inside any text becomes a link. Empty state: a dashed explanatory box.

### Step 3: Tabs
One row per tab: color dot, name field, kind badge (Home, Calendar, Month, Notes), move up, move down, delete (confirm). Notes tabs also show a text area whose text prints on that notes page. Buttons: + Notes page, + Month, + Calendar.

### Step 4: Export
Page size chips (A4, US Letter, Tablet 4:3), orientation chips, a "Use my page colors" switch (off gives a plain white PDF), and a summary card (page count, file name, usage tip for GoodNotes, Notability and Notes+).

## 3. State (localStorage key `calendar-journal-v1`)
```
{ title, year, weekStart (0|1), look ('elegant'|'soft'|'classic'), cover (id|'none'),
  theme: { pageColor, paper, ink, accentBase, accent, today, bar, tabPalette, font, headFont, titleFont },
  tabs: [{ id, name, kind: 'index'|'year'|'month'|'notes', color, year?, month? }],
  days: { 'YYYY-MM-DD': text }, notes: { tabId: text },
  pdf: { size, orient, useTheme, weekly, daily, dailyLayout, dailyStyle, notesStyle, notesPages, coverPage, font, headFont, titleFont } }
```
`pdf.font`, `headFont`, `titleFont` hold explicit PDF font keys (`headFont` and `titleFont` may be `same`). Nothing is saved until the first change. Write a `migrate()` that opens journals saved by older versions (missing `pageColor`, `accentBase`, `tabPalette`, `look`, `cover`; `auto` font values become explicit fonts) with nothing lost.

## 4. PDF engine (`pdf.js`)
Dependency-free PDF 1.5 writer.
- **Structure:** pages with Flate-compressed content streams (`CompressionStream('deflate')`, fall back to uncompressed), link annotations (`/Subtype /Link /Dest [page /Fit]`, no border), a flat outline of the tabs (plus Cover), and an Info dictionary.
- **Fonts:** built-in Helvetica, Times and Courier (WinAnsi; characters outside Windows-1252 print as `?`). Embedded bundled TrueType fonts as Identity-H Type0/CIDFontType2 with a `ToUnicode` map: parse `head`, `hhea`, `hmtx` and `cmap` (formats 4 and 12) yourself; write real glyph widths; embed the full subset file. Font bytes live in `fonts/<Name>.ttf` (for CSS `@font-face`) and `fonts/<Name>.js` (base64, lazy-loaded with a `<script>` tag because `fetch()` is blocked on `file://`). Faux bold is a text stroke. Per-font size correction for small x-height faces (Caveat 1.22). Text roles: **body**, **bold/heading** (own font, or faux-bold of body), **title** (script), **legend** (italic serif labels), with character spacing for caps labels. Measure text with real glyph widths for wrapping, including `[[link]]`-aware word wrap.
- **Fonts bundled (Latin subsets, licenses included):** Caveat, Patrick Hand, Indie Flower, Special Elite, Lora, Merriweather, Playfair Display, Quicksand, Great Vibes, Cormorant Garamond (+ Italic). Generate them with fontTools (`tools/subset-fonts.py`, `tools/make-font-js.py`).
- **Page sizes:** A4 595.28x841.89, Letter 612x792, Tablet 768x1024, portrait or landscape.
- **Links:** every tab, month name, calendar day, week and day button, prev/next, and `[[link]]` in text points to a real page. Day links fall back to that day's week page when there is no day page.
- **Preview support:** every drawing call also records plain data (`Pg.vec`). `JournalPDF.previewSession(state, opts)` plans pages and draws one page on demand (`page(i)` returns `{vec, links}`), and `JournalPDF.paint(canvas, page, width)` draws it on a canvas (rectangles, rounded rectangles, polygons, polylines, dashed and dotted lines, circles, tape, rotated and letter-spaced text with the same fonts). The preview and the PDF are produced by the same code, so they match.
- **Public API:** `generate(state, opts) -> Blob`, `count(state, opts)`, `ready(state, opts)` (loads fonts), `previewSession`, `paint`, `resolvedFonts`, `DEFAULTS`, `CSS_FAMILY`.

### PDF page types and looks
**Cover** (full-bleed art plus a cream label plate with the title in script and the year, linking to Home), **Home** (title plus a two-column list of links to Today and every tab), **Calendar** (12 mini months, each day linked), **Month** (grid, week tabs, prev/next), **Week** (Rows, Grid, Planner), **Day** (Daily planner or Simple page), **Notes** (lined and other styles; long text flows onto extra pages).

**Elegant look (default):** spiral binding down the left edge; a row of folder tabs across the top with line icons (HOME, CALENDAR, MONTH, WEEK, DAY, NOTES) that highlights the current section; month tabs down the right edge with a small colored strip each; on month, week and day pages a clickable day-number strip beside them; titles in a script font centered with small letter-spaced caps subtitles; boxes with thin accent outlines and italic labels sitting on the top border; dotted writing lines; circle checkboxes. Month page: week tabs W1 to W5, a thin-lined grid, and "Goals for the month" and "Notes" boxes. Calendar page: filled mini-month cells. Weekly planner: day rows plus Weekly focus, To-do list, Notes, and a W1..W5 selector. **Daily planner:** water drops, mood circles and meal circles; Top priority and To-do list boxes with circle checkboxes; a Notes box; and a 6 AM to 8 PM Schedule box.
**Soft look:** tinted mat with a rounded page card and shadow, side tabs with rotated labels, banner titles with washi tape, rounded shadowed cells and cards. **Classic:** plain squares, a tab strip across the top.

## 5. Covers (`covers.js`)
8 procedural covers drawn through a tiny adapter (`rect`, `poly`, `polyline`) so the same art renders on a canvas (gallery, thumbnails) and into the PDF: Golden Frame (uses the theme's paper and accent), Starry Night, Moonlit Meadow, Wildflower Vines, Crescent Sky, Enchanted Forest, Celestial Arch, Botanical Line. Use a seeded random generator so covers are stable.

## 6. Java backend (`backend/`, optional)
Java 21, Maven, Spring Boot 3.3.5 (pinned), JUnit 5. Package `com.raboul.journal`. Classes: `JournalApplication`, `JournalController`, `JournalStore`, `SearchService`, `StaticFilesController`, records `StoredJournal`, `SaveResult`, `SearchHit`, and `RevisionConflictException`. Add a short comment on each class explaining what it does and why.
- **API:** `GET /api/health` returns `{"status":"ok","service":"journal-backend"}`. `GET /api/journal` returns `{revision, savedAt, state}` or 404 when empty. `PUT /api/journal?baseRevision=N` returns `{revision, savedAt}`; 409 plus the current copy if N is stale; 400 if the body is not a JSON object with a `tabs` array. `GET /api/search?q=&limit=` returns hits `{type: day|note, key, title, snippet, href}`. Search: every word must match, case-insensitive, more occurrences rank first, ties newest day first, limit clamped to 1..100.
- **Storage:** JSON files in `data/journal.json` written to a temp file then renamed atomically; the last 10 versions in `data/backups/journal-000007.json`; recreate folders if deleted; synchronized access; revision increments per save; if the file is missing the app's copy is accepted.
- **Static serving:** the same server serves the web app from the repo root through an **allow-list only** (`/`, `index.html`, `app.js`, `pdf.js`, `covers.js`, `styles.css`, `/fonts/<name>.(ttf|js|txt)`), plus `/favicon.ico` returning 204. `backend/`, `.git/`, `PLAN.md` and path-traversal attempts must be refused.
- **Binding:** `127.0.0.1` by default (the journal has no password); document `--server.address=0.0.0.0` for an iPad on a trusted network.
- **Front-end connection (`app.js`, optional section):** only when the page came from `http(s)` and `/api/health` answers `journal-backend` within 1.5 s. localStorage is always written first; then after an 800 ms pause the journal is pushed with the last known revision. On startup: if the server has none, upload ours; if equal, adopt the revision; if the server is unchanged since last sync, push; if this browser has nothing saved, adopt the server copy; otherwise ask with a dialog (**Use server copy / Keep this device**). A 409 on save opens the same dialog. Never overwrite silently. With no server, nothing changes.
- **Tests:** about 25 JUnit tests: store (revisions, conflicts, backups pruning, recreated folders, invalid input), search (ranking, snippets, limits), HTTP API and the static allow-list.

## 7. Hosted-viewer adaptations
It must also run inside a sandboxed page host that blocks `confirm`/`alert`/`print`, blocks script-started downloads, and offers a "downloads" capability (`claude.use('downloads').save({filename, data})`) and no network. Save PDFs and JSON backups through that capability when present, otherwise use a normal `<a download>`. Use in-page dialogs only. The `artifact.html` fragment contains the same markup without `<!doctype>`, `<html>`, `<head>` and `<body>`.

## 8. Tests (`tests/`, Node + Playwright, pinned version, a runner that fails on any `FAIL` line or console error)
Cover: the interface and export download; color layer independence (page, accent, palette, dark-page accent, custom-tab protection, combos); the live preview (not blank, navigation, thumbnails, clickable links, follows settings, jumps to the changed page, page size and orientation); font pickers; hosted mode (blocked dialogs, downloads capability); migration of an old saved journal; PDF correctness across looks, fonts and options (and a Python check that every link points to a real page); and an end-to-end test of the Java connection (sync between two browsers, both conflict choices, search, files not exposed) that refuses to run unless the server's data folder is empty.

## 9. Order of work
1. PDF writer with built-in fonts, links and outlines, then embedded fonts. 2. Page types and the Elegant look, then Soft and Classic. 3. Covers. 4. The step UI, color layers and migration. 5. Preview recording and painting. 6. Hosted adaptations. 7. Java backend and the sync section. 8. Tests, README (prerequisites, exact run commands, how Java connects) and PLAN.md. At the end, run every test, list each file you created, and list anything you could not verify (for example real GoodNotes or iPad behavior, which cannot be tested in a headless browser).
