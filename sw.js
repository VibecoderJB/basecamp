/* TRAILSPEC service worker — offline-first app shell.
   Bump VERSION whenever you change any file so clients pick up the update. */
const VERSION = 'trailspec-v3.1.0';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const TILES = 'trailspec-tiles';       // kept across versions
const MAX_TILES = 400;                  // modest cap — respects OSM tile usage policy (no bulk prefetch)

// Relative URLs so the app works from any sub-path (e.g. GitHub Pages /repo/).
const SHELL_FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/app.js', 'js/store.js', 'js/utils.js', 'js/units.js', 'js/home.js', 'js/gear.js', 'js/chart.js',
  'js/trip.js', 'js/map.js', 'js/weather.js', 'js/food.js', 'js/checklist.js', 'js/guide.js', 'js/share.js',
  'js/data/categories.js', 'js/data/templates.js', 'js/data/checklist.js', 'js/data/guides.js', 'js/data/glossary.js',
  'js/core/calc.js', 'js/core/codec.js', 'js/core/schema.js', 'js/ui/tips.js',
  'assets/topo.svg', 'assets/icons/favicon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];
// Third-party files cached opportunistically at install (install still succeeds if they fail).
const CDN_FILES = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(SHELL_FILES);
    const rt = await caches.open(RUNTIME);
    await Promise.allSettled(CDN_FILES.map((u) => fetch(u, { mode: 'cors' }).then((r) => r.ok && rt.put(u, r))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL, RUNTIME, TILES];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trimTiles() {
  const c = await caches.open(TILES);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Weather / geocoding: always network (fresh data). The app caches the last forecast itself.
  if (url.hostname.endsWith('open-meteo.com')) return;

  // Map tiles: cache-first, capped.
  if (url.hostname === 'tile.openstreetmap.org') {
    event.respondWith((async () => {
      const c = await caches.open(TILES);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trimTiles(); }
        return res;
      } catch { return new Response('', { status: 504, statusText: 'Offline' }); }
    })());
    return;
  }

  // Page navigations: network-first, fall back to cached shell (works offline).
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(SHELL); c.put('index.html', res.clone());
        return res;
      } catch {
        return (await caches.match('index.html', { ignoreSearch: true })) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Same-origin assets: stale-while-revalidate from the shell cache.
  // CDN libs + Google Fonts: stale-while-revalidate in the runtime cache.
  const sameOrigin = url.origin === self.location.origin;
  const cdn = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
  if (!sameOrigin && !cdn) return;
  event.respondWith((async () => {
    const c = await caches.open(sameOrigin ? SHELL : RUNTIME);
    const hit = await c.match(req, { ignoreSearch: sameOrigin });
    const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { event.waitUntil(net); return hit; }
    return (await net) || new Response('', { status: 504, statusText: 'Offline' });
  })());
});
