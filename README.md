# TRAILSPEC — free backpacking field kit

**Live:** https://trailspec.github.io/

_Formerly "BASECAMP". Data saved under the old name is picked up automatically, and old backup files still import._

A free, offline-capable web app for backpackers. No account, no ads, no paywall, no backend.
Everything runs in the browser, and your data stays in `localStorage` on your device.

**What it does**

| Module | What you get |
|---|---|
| **Gear List** | Add/edit/delete items with category, weight (oz/g), quantity, and worn/consumable flags. Live base, worn, consumable, pack and skin-out totals. SVG donut breakdown by category. An Ultralight / Lightweight / Traditional rating. Three starter templates (weekend, thru-hike, winter). |
| **Trip Planner** | Trip name, dates, start/end, emergency contact and return-by time, plus a day-by-day itinerary with distance, gain/loss, water and elevation notes and a daily-distance chart. A Leaflet + OpenStreetMap map where you can drop draggable pins (trailhead, campsite, water, waypoint) or add them by coordinates. |
| **Weather** | 7-day Open-Meteo forecast for a trip pin, a searched place, your location or coordinates. Shows current conditions, temps, precipitation, wind/gusts, UV, sunrise/sunset, daylight, a 24 h precip chart and hiker alerts (storms, gusts, freezing, heat). The last forecast is cached for offline use. |
| **Food & Water** | Calories/day from distance, climbing, body and pack weight, with food weight to carry. Water carry between sources based on distance, pace, climb, temperature and dry camp. |
| **Checklists** | Pre-trip checklist (permits, fire bans, trip plan, etc.) where ticks are saved. Add custom tasks, uncheck all, or restore defaults. |
| **Trail Knowledge** | Leave No Trace, the 10 Essentials, layering, water treatment, bear safety & food storage, and blister care, all with a safety disclaimer. |
| **Save & Share** | Auto-save, JSON export/import, gear CSV, a shareable link with the gear list compressed into the URL, and a printable trail card. |
| **Offline / PWA** | Installable to your home screen. A service worker caches the app shell, Leaflet, fonts and the map tiles you've viewed. |

## Run it locally

You don't need a build step or dependencies, just any static file server. ES modules and service workers need `http://`, so opening the file directly with `file://` won't work.

```bash
cd trailspec
```

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>. (`npx serve .` works too.)

## Deploy for free

### GitHub Pages

1. Create an empty repository on GitHub called `trailspec` (no README).
2. Either click **uploading an existing file** and drag in the *contents* of this folder (so `index.html` sits at the top level of the repo, not inside a folder), or from this folder run:

```bash
git init -b main && git add -A && git commit -m "TRAILSPEC"
```

```bash
git remote add origin https://github.com/YOUR-USERNAME/trailspec.git
```

```bash
git push -u origin main
```

3. On GitHub, go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch** and **Branch: `main` / `/ (root)`**, then click **Save**.
4. After about a minute the site is live at `https://YOUR-USERNAME.github.io/trailspec/`.

All paths are relative, so the app works from a sub-path. `.nojekyll` stops GitHub from processing the files.

### Netlify (backup option)

- **Drag & drop:** go to <https://app.netlify.com/drop> and drop the `trailspec` folder.
- **From Git:** use **Add new site → Import from Git**, pick the repo, leave the build command empty and set the publish directory to `.`. `netlify.toml` already configures this.

### After deploying

- Change `og:image` in `index.html` to an absolute URL (e.g. `https://YOUR-USERNAME.github.io/trailspec/assets/og-image.png`), because social networks need absolute image URLs.
- **Every time you change files, bump `VERSION` in `sw.js`** and add any new files to `SHELL_FILES` there; `npm test` fails if you forget (e.g. `trailspec-v3.1.1`). Installed copies then update, and users see a "New version ready" toast.

## Project structure

```
index.html              App shell: header, nav + "More" sheet, view containers, icon sprite, meta/OG tags
manifest.webmanifest    PWA manifest
sw.js                   Service worker (offline cache; bump VERSION on changes)
css/styles.css          Colorway tokens, components, motion, print CSS
js/app.js               Lazy hash router with error boundaries, colorways, units, save status, PWA
js/store.js             State, debounced auto-save, save status, storage-full handling, cross-tab sync
js/core/calc.js         PURE maths: pack totals, rating, trip totals, food + water models
js/core/codec.js        PURE share-link encoder/decoder
js/core/schema.js       PURE data schema: defaults, versioned migrations, strict normalisation
js/ui/tips.js           Tap-to-explain jargon popover
js/units.js             Metric storage ⇄ imperial/metric display
js/utils.js             DOM helpers, toasts, dialogs, downloads
js/home.js              Dashboard: hero product shot, setup guide, status, kit catalog
js/gear.js, chart.js    Gear list (search, collapse, phone weight dock), SVG donut
js/trip.js, map.js      Trip planner, itinerary, lazy-loaded Leaflet map
js/weather.js           Open-Meteo forecast + geocoding
js/food.js              Food & water calculator UI
js/checklist.js         Checklists
js/guide.js             Guide pages
js/share.js             Export/import, share links, CSV, trail card
js/data/*.js            Editable content: categories, templates, checklist, guides, glossary
tests/*.test.mjs        Unit + project-integrity tests (npm test)
.github/workflows/      Runs the tests on every push
assets/                 topo.svg, OG image, icons
tools/                  Scripts that regenerate topo.svg and the PNG icons/OG image
```

## How it's built

- **Pure core:** everything that does maths, encoding or data validation lives in `js/core/`. It has no DOM or storage access, so it is unit-tested in Node.
- **One way in for data:** anything loaded from storage, imported from a file or received from another tab passes through `normalize()`. That function migrates old versions (`SCHEMA_VERSION` plus `MIGRATIONS` in `js/core/schema.js`) and coerces every field to a safe type, so corrupt or hostile data can't break the app.
- **Lazy views with error boundaries:** each screen is loaded with `import()` the first time it opens, and the rest are prefetched when the browser is idle. If a screen throws or fails to load, it shows a "Module fault" card with recovery buttons instead of breaking the whole app.
- **Saving:**
  - Edits save automatically, with a short delay, and are written out immediately if the tab is hidden or closed.
  - The header shows SAVING / SAVED / NOT SAVED.
  - If storage is full or blocked, the user is told and offered a backup.
  - Other open tabs pick up changes automatically.

## Tests

```bash
npm test
```

You only need Node 18+; there are no dependencies to install. The suite covers:
- the calculators
- share-link round-trips and garbage rejection
- schema migration and hostile-input normalisation
- that every file is in the service-worker offline cache
- that every import, `index.html` reference and manifest icon exists
- that colorway ids match across CSS, JS and HTML

GitHub runs these tests on every push (`.github/workflows/test.yml`).

## Editing content

All content is plain JavaScript data in `js/data/`, so you only need a text editor:

- **Guides:** `js/data/guides.js` has one object per guide (`slug`, `title`, `tag`, `blurb`, `html`). Add an object to create a new page; it shows up in the guide nav at `#/guide/<slug>`. Edit the safety disclaimer in `DISCLAIMER`.
- **Starter gear templates:** `js/data/templates.js`. Each row is `[name, categoryId, grams, qty, flags]`, where flags are `'w'` (worn) and `'c'` (consumable).
- **Gear categories and chart colours:** `js/data/categories.js`.
- **Jargon explanations (the ⓘ buttons):** `js/data/glossary.js`. In a template, `${tip('key')}` adds a button.
- **Default checklist:** `js/data/checklist.js`. Users who already have saved data keep their own list until they click "Restore default list".
- **Colorways (themes):** there are five, Granite, Glacier, Black Sapphire, Forage and Ember, plus Auto, which follows the device's light/dark setting. Each is one `[data-theme="…"]` token block at the top of `css/styles.css`. To add a colorway:
  1. Copy a block and change its values. Keep `--accent` as a fill and `--accent-ink` for text, and check AA contrast.
  2. Add an entry to `COLORWAYS` in `js/app.js` (swatch colours, browser bar colour, dark or light).
  3. Add the id to the regex in the pre-paint script in `index.html` and to the allowed list in `normalize()` in `js/store.js`.

  Switching colorways animates as a circular reveal (View Transitions API), with a colour cross-fade as the fallback.
- **Fonts and spacing:** the shared tokens in the first `:root` block of `css/styles.css`. The iridescent accent is `--lens`.
- **Calculator formulas:** `calcFood` and `calcWater` in `js/food.js` are documented inline. Rating thresholds are in `rating()` in `js/gear.js`.

To regenerate artwork:

```bash
node tools/make-topo.mjs
```

```bash
FONT_DIR=/path/to/woff2-files node tools/render-assets.mjs
```

The second command needs Playwright installed. `FONT_DIR` should hold `archivo-latin-wdth-normal.woff2` and `jetbrains-mono-latin-700-normal.woff2` from the `@fontsource-variable/archivo` and `@fontsource/jetbrains-mono` npm packages.

After any edit, bump `VERSION` in `sw.js`.

## Free services used

| Service | Use | Cost / key |
|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles | Map | Free, attribution required (shown on the map). Light personal use only; heavy traffic should switch to another free tile provider. |
| [Leaflet 1.9.4](https://leafletjs.com) via unpkg | Map library | Free, loaded only when the map opens, with SRI hashes |
| [Open-Meteo](https://open-meteo.com) | Forecast + geocoding | Free for non-commercial use, no key, CC BY 4.0 attribution |
| Google Fonts | Archivo, JetBrains Mono | Free |

## Privacy

There are no analytics, cookies or accounts. Data is stored only in your browser. Share links carry the gear list inside the URL itself. Weather requests send only the coordinates to Open-Meteo.

## Disclaimer

The guides and calculators are general information, not professional, medical or legal advice. Get training, follow local regulations and check current conditions.

MIT licensed.
