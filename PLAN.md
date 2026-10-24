# Calendar Journal — Plan

A zero-dependency web app (static HTML/CSS/JS, open `index.html`) for building your own calendar journal with active links between pages and tabs.

## Goals
1. **Customizable journal** – daily entries, free-form notes pages, a cover/index page.
2. **Active links** – everything jumps: tabs, index entries, mini-months → month pages, calendar days → day pages, prev/next day, "Today", and inline `[[wiki links]]` inside any text.
3. **Colors** – theme presets plus custom pickers (paper, ink, accent, tab bar, today highlight), font choice, and a per-tab color.
4. **Tab customization** – add, rename, recolor, reorder, delete tabs.
5. **Calendar presets** – Full year, Academic year, Fiscal year, Monthly planner, Minimal.

## Architecture
| File | Role |
|------|------|
| `index.html` | Shell: title bar, tab strip, page area, settings drawer |
| `styles.css` | Theme driven by CSS variables; paper look; print styles; mobile layout |
| `app.js` | State, hash router, page renderers, settings UI, persistence |

### State (persisted in `localStorage`, exportable as JSON)
```
{ title, year, weekStart, theme:{preset, paper, ink, accent, bar, today, font},
  tabs:[{id, name, color, kind:'index'|'year'|'month'|'notes', year, month}],
  days:{'YYYY-MM-DD': text}, notes:{tabId: text} }
```

### Routing (hash based, so back/forward and bookmarks work)
- `#/tab/<id>` – a tab page
- `#/day/YYYY-MM-DD` – a day page

### Link syntax
`[[Tab Name]]` → that tab · `[[2026-10-24]]` → that day · unknown name → dashed link that creates a notes page on click.

### Page kinds
- **Index** – cover with title and a link to every tab, plus Today.
- **Year** – 12 mini-months; each month and each day links through.
- **Month** – full grid; days link to day pages and show entry snippets.
- **Day** – entry editor, prev/next day, back to month, link chips.
- **Notes** – free-form page with edit/preview toggle.

## Build steps
1. Scaffold files and CSS variable theme.
2. State, defaults, persistence, presets.
3. Router and page renderers with link parsing.
4. Settings drawer: theme, colors, tabs editor, presets, import/export/print.
5. Test in headless Chromium (navigation, links, presets, theming, persistence).
6. Commit and push.

## Phase 2 — PDF export for note-taking apps
- `pdf.js`: dependency-free PDF writer (Helvetica, Flate-compressed streams). Every page carries a tab strip whose tabs are internal links; PDF bookmarks list the tabs.
- Linked pages: index, year (month names + every day), month (day cells + week buttons + prev/next), weekly, daily, notes. `[[links]]` in entries become tappable links.
- Weekly layouts: Rows, Grid (boxes + notes), Planner (days + priorities + notes). Daily pages: none / days with entries / every day.
- Note styles for daily and notes pages: Blank, Lined, Dotted, Grid, Cornell, Checklist (daily also: Hourly schedule + to-do).
- Options: A4 / Letter / Tablet 4:3, portrait or landscape, theme colors or plain white.
- Entries are pre-filled onto the pages so the PDF mirrors the journal; handwriting space is left for the pencil.
- Limit: standard PDF fonts only, so characters outside Latin-1/Windows-1252 export as `?`.

## Phase 3 — Fonts
- 16 body fonts (serif, sans, rounded, handwriting, typewriter, mono) via system stacks plus Google Fonts (Lora, Merriweather, Playfair Display, Quicksand, Caveat, Patrick Hand, Indie Flower, Special Elite); each falls back to a system font offline.
- Separate heading font ("Same as body" by default) and a live sample line.
- PDF font: Match journal font (auto), Helvetica, Times or Courier — standard PDF fonts, since nothing is embedded.

## Phase 4 — Embedded PDF fonts
- Bundled, Latin-subset OFL/Apache fonts in `fonts/` (Caveat, Patrick Hand, Indie Flower, Special Elite, Lora, Merriweather, Playfair Display, Quicksand; ~0.5 MB). Licenses alongside. The web app now loads them locally (`@font-face`) instead of from Google, so it works offline.
- PDF export embeds the chosen font as an Identity-H CID TrueType font (real glyph widths, ToUnicode map so text is searchable/copyable). Font bytes are lazy-loaded from `fonts/<Name>.js` (base64) because `fetch()` is blocked on `file://`.
- Bold is simulated with a text stroke; small-x-height faces get a size correction.
- `tools/subset-fonts.py` and `tools/make-font-js.py` regenerate the font files.

## Phase 5 — PDF heading font
- Bold text in the PDF (titles, month names, day labels, tab names, buttons) can use its own heading font. Options: Match journal heading font (default), Same as body (bold), or any PDF font.
- The writer now tracks every font actually used per document (resource registry), so it can embed two families at once (e.g. Caveat body + Playfair Display headings) and only writes what is used.

## Phase 6 — Hosting
- `artifact.html` is the publish entry (same app, no document wrapper). Published as a private claude.ai artifact with the `downloads` capability.
- Hosted-viewer adaptations (also fine standalone): in-page routing with a Back button (the viewer ignores `#/path` navigation), in-page confirm dialog and toast (native `confirm`/`alert` are disabled), file saves go through `claude.use("downloads")` with an anchor fallback, Print button removed (PDF export replaces it).

## Phase 7 — Soft planner look
- Reference listing (Etsy "Digital Life Planner") could not be opened from this environment, so the look follows the common hyperlinked-planner style: pastel palettes, side tabs, rounded cards, washi tape, banner titles.
- New pastel themes (Blush default, Sage, Boho, Sky, Lilac, Linen), each with a tab palette; picking a theme recolors the tabs ("Match tab colors to theme" re-applies it).
- Web app: tabs down the right edge (top row on phones), dotted paper, banner headings with tape, rounded shadowed cells and cards.
- PDF "Planner look": Soft (default) or Classic. Soft adds a rounded page card on a tinted mat, rotated side tabs, banner + tape titles, rounded cells/cards with shadows, month pills on the year page, rounded checkboxes.

## Phase 8 — Font pickers
- The four font menus (body, heading, PDF body, PDF heading) are custom listboxes: every option is drawn in its own typeface, which native `<select>` can't do on iOS/Safari. Keyboard support (arrows, Enter, Esc) and a check mark on the current choice.

## Phase 9 — Elegant planner look, colored pages and covers
- Reference: three screenshots of a hyperlinked iPad life planner (spiral binding, folder tabs with icons, month tabs with a day-number strip, gold-outlined boxes with labels on the border, script titles, "colored pages" + covers).
- New default look "Elegant" (Soft and Classic remain), shared by the app and the PDF (`state.look`).
- Fonts: Great Vibes (script titles), Cormorant Garamond (+ italic for box labels); new "title font" role in app and PDF.
- 8 colored pages (Sand, Olive, Sage Mist, Plum, Lilac Mist, Slate, Blue Mist, Cocoa) and 8 procedural covers (Golden Frame, Starry Night, Moonlit Meadow, Wildflower Vines, Crescent Sky, Enchanted Forest, Celestial Arch, Botanical Line) in `covers.js`, drawn identically on canvas and into the PDF.
- PDF pages: cover; home; calendar (filled mini months); monthly (week tabs, grid, goals + notes boxes); weekly planner (day rows, weekly focus, to-do, notes, W1..W5 selector); daily planner (water/mood/meal trackers, top priority, to-do, notes, 6AM-8PM schedule). Every page has HOME/CALENDAR/MONTH/WEEK/DAY/NOTES tabs, right-edge month tabs and a clickable day-number strip.
