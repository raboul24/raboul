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
