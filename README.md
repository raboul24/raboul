# Calendar Journal

A planner builder that runs in the browser. You design a planner, see the real pages in a live preview, and export a
hyperlinked PDF (tappable tabs, dates and `[[links]]`) for GoodNotes, Notability or Notes+.

## Using the app

The app is four steps, with a live preview of the actual PDF pages on the right and an **Export PDF** button that is
always visible at the bottom:

| Step | What you do |
|---|---|
| **Style** | Pick a *starting point* (one tap sets colors together), the *look* (Elegant, Soft, Classic), then change each color layer on its own: **page color**, **accent color** and **tab colors**. Choose fonts for titles, headings and body text, and a **cover**. |
| **Pages** | Choose a layout (full year, academic, ...), the year and week start, then which pages to include: cover, weekly pages, daily pages, notes pages. Add **dates & events** (birthdays, appointments) that print on the matching pages. |
| **Tabs** | Rename, recolor, reorder, add and remove tabs. Notes tabs can carry text that prints on the page. |
| **Export** | Page size (A4, Letter, Tablet), orientation, plain-white option, then export. |

**The three color layers are independent**: changing the page color never changes the accent or the tabs, and so on.
The only automatic adjustments are for readability: text turns light on dark pages, and the accent and tab markers are
lightened a little on dark pages (your chosen accent is remembered and comes back on a light page).

Click a tab or date in the preview to jump there, exactly as the PDF will behave. The **⋯** menu has backup (JSON), restore,
reset, and (with the Java server) search.

There are **two ways to run it**:

| | What you get | What you need |
|---|---|---|
| **A. Just the web app** | Everything. Your journal is saved in the browser (localStorage). | A web browser |
| **B. With the Java server** | Everything in A, plus the journal is also saved in files on your computer, **search** across all entries, rolling **backups**, and the same journal on several devices. | JDK 21 and Maven |

The hosted claude.ai copy of the app is mode A only. Hosted pages cannot talk to a server, so the Java features
only work when you run the app yourself (mode B).

## A. Just the web app

Open `index.html` in a browser. That is all. There is nothing to install or build.

## B. With the Java server

### Prerequisites
- **JDK 21** (any distribution, e.g. Temurin or OpenJDK). Check with `java -version`.
- **Maven 3.9+**. Check with `mvn -v`.
- Internet access the first time, so Maven can download Spring Boot (versions are pinned in `backend/pom.xml`).

### Run it
```bash
cd backend
mvn spring-boot:run
```
Then open **http://localhost:8080**. The same Java server serves the app and the API, so there is nothing else to start.

Open the **⋯** menu. If the server was found you will see **Search entries…**. Your journal is saved to
`backend/data/journal.json` about a second after each change.

Prefer a single jar? `cd backend && mvn package && java -jar target/journal-backend-1.0.0.jar`.

### Use it from an iPad or phone on your home Wi-Fi
By default only the computer running the server can reach it, because the journal has **no password**.
To allow other devices on your network, start it with
`mvn spring-boot:run -Dspring-boot.run.arguments=--server.address=0.0.0.0` and open `http://<your-computer-ip>:8080`
from the other device. Only do this on a network you trust.

### Where your data lives
```
backend/data/journal.json            the journal
backend/data/backups/journal-N.json  the last 10 older versions (restore by copying one over journal.json)
```
`backend/data/` is in `.gitignore`, so your journal is never committed. Change the folder with
`--journal.data-dir=/some/path`.

## How the Java part connects to the app

```
 browser (index.html, app.js ...)                    Java server (backend/)
 ┌──────────────────────────────┐   GET /api/health    ┌─────────────────────────────┐
 │ localStorage  (always used)  │ ───────────────────► │ JournalController  (REST)   │
 │ + connectToServer() in app.js│   GET/PUT /api/journal│ JournalStore  (JSON files)  │
 │   (does nothing if no server)│ ◄──────────────────► │ SearchService (full text)   │
 │ Search in the ⋯ menu          │   GET /api/search     │ StaticFilesController       │
 └──────────────────────────────┘                       │   (serves index.html, ...)  │
                                                        └─────────────────────────────┘
```
- **Optional by design.** `app.js` only talks to the server when the page itself came from an `http(s)` address
  that answers `/api/health` with `"service": "journal-backend"`. Opened as a file, from the hosted copy, or with the
  server stopped, the app behaves exactly as before.
- **Saving.** localStorage is still written first. Then, after a short pause in typing, the whole journal is sent with
  `PUT /api/journal?baseRevision=N`. The server numbers every save (revision 1, 2, 3 ...).
- **Two devices.** If the server's revision is newer than the one the app last saw, the server answers **409** and
  the app asks: *Use server copy* or *Keep this device*. Nothing is ever overwritten silently.
- **Startup.** A browser with no saved journal takes the server's copy. If both have changes, you are asked.
- **Search.** `GET /api/search?q=dentist` looks in daily entries and notes pages (all words must match, any case)
  and returns links such as `#/day/2026-01-05` that the app's normal navigation opens.
- **The server only serves the app's own files** (`index.html`, `app.js`, `pdf.js`, `covers.js`, `styles.css`, `fonts/`).
  `backend/`, `.git/`, your data and everything else return 404.

### API reference
| Request | Answer |
|---|---|
| `GET /api/health` | `{"status":"ok","service":"journal-backend"}` |
| `GET /api/journal` | `200 {"revision","savedAt","state"}` or `404` if nothing is saved yet |
| `PUT /api/journal?baseRevision=N` (body: the journal JSON) | `200 {"revision","savedAt"}`, `409` + the current copy if revision N is out of date, `400` if the body is not a journal |
| `GET /api/search?q=words&limit=20` | `[{"type":"day"\|"note","key","title","snippet","href"}]` |

### Java code map (`backend/src/main/java/com/raboul/journal/`)
| File | Purpose |
|---|---|
| `JournalApplication` | Starts Spring Boot and the web server |
| `JournalController` | The REST endpoints; turns Java exceptions into 400/409 answers |
| `JournalStore` | Reads/writes `journal.json` safely (write temp file, then rename), revision check, 10 backups |
| `SearchService` | Full-text search over `days` and `notes` |
| `StaticFilesController` | Serves the web app from an allow-list of files |
| `StoredJournal`, `SaveResult`, `SearchHit` | Small data holders (Java records) |
| `RevisionConflictException` | "Someone saved a newer version" |

## Tests

### Java (JUnit 5, 25 tests)
```bash
cd backend
mvn test
```
Covers saving/revisions/conflicts/backups, search ranking and snippets, the HTTP API and the file allow-list.

### Browser tests (Playwright)
```bash
cd tests
npm install                      # once; installs Playwright, then: npx playwright install chromium
npm test                         # interface, colors, live preview, fonts, PDF export, hosted mode (opens index.html as a file)
```
`npm test` also checks every link inside the generated PDFs if `python3` and `pypdf` (`pip install pypdf`) are available.

To include the Java connection test, start the server on an **empty** data folder first, in another terminal:
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.arguments=--journal.data-dir=/tmp/journal-test-data
```
then run `npm test` again. (`server.test.js` refuses to run if the server already holds a journal, so your real data is safe.)
Test PDFs and screenshots are written to your temp folder (override with `JOURNAL_TEST_OUT`).

## Project layout
```
index.html  app.js  pdf.js  covers.js  styles.css   the web app
artifact.html                                       the same app, packaged for the claude.ai hosted copy
fonts/                                              bundled fonts + licenses
backend/                                            the Java server (Maven)
tests/                                              browser tests (Node + Playwright)
tools/                                              scripts that regenerate the font files (Python)
PLAN.md                                             how the app was built, phase by phase
```
