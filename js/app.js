// TRAILSPEC — app shell: lazy hash router with error boundaries, colorways, units,
// save status, offline status, PWA install, print. Views are loaded on demand.
import { state, save, subscribe, onSaveStatus, storageProblem } from './store.js';
import { $, $$, toast, esc } from './utils.js';
import { initTips } from './ui/tips.js';

/* ---------- Route table ----------
   load: lazy module import · num: module number shown in the view header
   next: [route, label] — the "next step" link at the bottom of the view
   fn: which export renders the view (default 'render') */
const ROUTES = {
  '': { load: () => import('./home.js'), title: 'Field Kit', num: '00' },
  gear: { load: () => import('./gear.js'), title: 'Gear List', num: '01', next: ['trip', 'Plan the route'] },
  trip: { load: () => import('./trip.js'), title: 'Trip Planner', num: '02', next: ['weather', 'Check the forecast'] },
  weather: { load: () => import('./weather.js'), title: 'Weather', num: '03', next: ['food', 'Dial in food & water'] },
  food: { load: () => import('./food.js'), title: 'Food & Water', num: '04', next: ['checklist', 'Run the pre-trip checklist'] },
  checklist: { load: () => import('./checklist.js'), title: 'Checklists', num: '05', next: ['print', 'Print your trail card'] },
  guide: { load: () => import('./guide.js'), title: 'Trail Knowledge', num: '06' },
  data: { load: () => import('./share.js'), title: 'Save & Share', num: '07' },
  print: { load: () => import('./share.js'), title: 'Trail Card', fn: 'renderPrint' },
};
/** Routes that live behind "More" in the phone tab bar */
const MORE_ROUTES = ['food', 'checklist', 'guide', 'data', 'print'];

const loaded = new Map(); // route -> module
let current = null;       // { name, params }
let navToken = 0;         // guards against out-of-order async navigations

/** Parse "#/guide/bears?x=1" -> { name:'guide', params:{ slug:'bears', x:'1' } } */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const [name = '', ...rest] = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(query));
  if (rest[0]) { try { params.slug = decodeURIComponent(rest.join('/')); } catch { params.slug = rest.join('/'); } }
  return { name, params };
}

async function loadRoute(r) {
  if (!loaded.has(r)) loaded.set(r, await ROUTES[r].load());
  return loaded.get(r);
}

/** Error boundary: a broken view shows a recovery card instead of a blank app. */
function renderError(el, err, title) {
  console.error(`TRAILSPEC view error (${title}):`, err);
  el.innerHTML = `<div class="card fault" role="alert">
    <div class="card-head"><h2>Module fault</h2><span class="label">${esc(title)}</span></div>
    <p>This screen hit a problem and couldn't load. <strong>Your saved data is safe</strong> — it lives on this device.</p>
    ${navigator.onLine ? '' : '<p class="help">You appear to be offline and this screen may not have been cached yet. Reconnect and try again.</p>'}
    <div class="btn-row mt">
      <button class="btn btn--primary" type="button" data-reload>Reload app</button>
      <a class="btn" href="#/">Back to base</a>
      <a class="btn btn--ghost" href="#/data">Back up my data</a>
    </div>
    <details class="mt"><summary class="label">Technical details</summary><pre class="readout" style="white-space:pre-wrap">${esc(err?.stack || err)}</pre></details>
  </div>`;
  el.querySelector('[data-reload]').addEventListener('click', () => location.reload());
}

/** Decorations shared by all module views: giant module number + next-step link. */
function decorate(el, r) {
  const def = ROUTES[r];
  const head = el.querySelector('.view-head');
  if (head && def.num && def.num !== '00' && !head.querySelector('.vh-num')) {
    head.insertAdjacentHTML('beforeend', `<span class="vh-num" aria-hidden="true">${def.num}</span>`);
  }
  if (def.next && !el.querySelector('.next-step')) {
    const [to, label] = def.next, n = ROUTES[to];
    el.insertAdjacentHTML('beforeend', `<nav class="next-step" aria-label="Next step"><a href="#/${to}">
      <span class="label">Next${n.num ? ` · Module ${n.num}` : ''}</span><strong>${esc(label)}</strong><span class="ns-arrow" aria-hidden="true">→</span></a></nav>`);
  }
}

function renderView(r, el, params) {
  const mod = loaded.get(r), def = ROUTES[r];
  try {
    mod[def.fn || 'render'](el, params);
    mod.onShow?.();
    decorate(el, r);
  } catch (err) { renderError(el, err, def.title); }
}

async function route() {
  const { name, params } = parseHash();
  const token = ++navToken;
  if (name === 'share' && params.slug) {
    const share = await loadRoute('data');
    share.handleShare(params.slug); return;
  }
  const r = ROUTES[name] ? name : '';
  const def = ROUTES[r];
  const changed = !current || current.name !== r;
  current = { name: r, params };

  $$('.view').forEach((v) => { v.hidden = v.dataset.route !== r; });
  const el = $(`.view[data-route="${r}"]`);
  updateNav(r);
  document.title = `${def.title}${params.slug && r === 'guide' ? ' · Guide' : ''} — TRAILSPEC`;

  if (!loaded.has(r)) {
    el.innerHTML = `<div class="loading-view" role="status"><span class="spinner" aria-hidden="true"></span>LOADING ${esc(def.title.toUpperCase())}…</div>`;
    try { await loadRoute(r); } catch (err) { if (token === navToken) renderError(el, err, def.title); return; }
    if (token !== navToken) return; // user navigated away while loading
  }
  renderView(r, el, params);
  const ib = $('#install-btn'); if (ib && deferredInstall) ib.hidden = false;

  // Move focus to the new view's heading for screen-reader users; reset scroll.
  if (changed) {
    scrollTo(0, 0);
    const h = el.querySelector('h1');
    if (h && document.activeElement !== document.body) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
}

/** Re-render the visible view after global changes (units, imports, template loads, other tabs). */
subscribe((scope) => {
  if ((scope === 'all' || scope === 'units') && current && loaded.has(current.name)) {
    renderView(current.name, $(`.view[data-route="${current.name}"]`), current.params);
  }
  if (scope === 'sync') toast('Updated from another tab');
});

/* ---------- Navigation: phone tab bar with a "More" sheet ---------- */
function updateNav(r) {
  $$('.nav a, .more-sheet a').forEach((a) => {
    const target = a.getAttribute('href').replace(/^#\/?/, '');
    if (target === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const more = $('#more-btn');
  const inMore = MORE_ROUTES.includes(r);
  more.classList.toggle('is-current', inMore);
  more.setAttribute('aria-label', inMore ? `More, current page: ${ROUTES[r].title}` : 'More pages');
}
const sheet = $('#more-sheet');
$('#more-btn').addEventListener('click', () => { sheet.showModal(); $('#more-btn').setAttribute('aria-expanded', 'true'); });
sheet.addEventListener('close', () => $('#more-btn').setAttribute('aria-expanded', 'false'));
sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('a, [data-close]')) sheet.close(); });

/* ---------- Save status (header readout) ---------- */
let warnedFull = false;
onSaveStatus(({ status, at }) => {
  const el = $('#save-status');
  el.dataset.status = status;
  if (status === 'saving') el.textContent = 'SAVING…';
  if (status === 'saved') el.textContent = `SAVED · ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (status === 'error') {
    el.textContent = 'NOT SAVED';
    if (!warnedFull) {
      warnedFull = true;
      toast('Couldn’t save — this browser’s storage is full or blocked. Export a backup now.', { action: 'Back up', onAction: () => { location.hash = '#/data'; }, ms: 12000 });
    }
  } else warnedFull = false;
});

/* ---------- Global safety net ---------- */
let lastErrToast = 0;
function onGlobalError(err) {
  console.error('TRAILSPEC:', err);
  if (Date.now() - lastErrToast > 10000) { lastErrToast = Date.now(); toast('Something went wrong, but your data is safe. Try that again.'); }
}
addEventListener('error', (e) => { if (e.error) onGlobalError(e.error); });
addEventListener('unhandledrejection', (e) => onGlobalError(e.reason));

/* ---------- Colorways (themes) ----------
   Each id matches a [data-theme="…"] token block in css/styles.css (and the
   pre-paint script in index.html). a/b = swatch colours, bar = browser UI colour. */
export const COLORWAYS = [
  { id: 'auto', name: 'Auto', note: 'Granite by day, Sapphire by night' },
  { id: 'granite', name: 'Granite', note: 'Warm stone · blaze', a: '#ecebe6', b: '#f0552a', bar: '#ecebe6', dark: false },
  { id: 'glacier', name: 'Glacier', note: 'Ice grey · cyan', a: '#e5ebee', b: '#3fc1e4', bar: '#e5ebee', dark: false },
  { id: 'sapphire', name: 'Black Sapphire', note: 'Night hike · violet lens', a: '#0a0e13', b: '#8b93ff', bar: '#0a0e13', dark: true },
  { id: 'forage', name: 'Forage', note: 'Olive drab · lime', a: '#3a4230', b: '#cde34a', bar: '#20241b', dark: true },
  { id: 'ember', name: 'Ember', note: 'Burnt clay · hot orange', a: '#3a2a20', b: '#ff6a2b', bar: '#17110e', dark: true },
];
const cwById = Object.fromEntries(COLORWAYS.map((c) => [c.id, c]));
const prefersDark = matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
/** 'auto' resolves to a real colorway based on the OS setting */
const resolve = (id) => (id === 'auto' || !cwById[id] ? (prefersDark.matches ? 'sapphire' : 'granite') : id);

function applyTheme() {
  const cw = cwById[resolve(state.theme)];
  const root = document.documentElement;
  root.dataset.theme = cw.id;
  root.dataset.scheme = cw.dark ? 'dark' : 'light';
  $('meta[name="theme-color"]').content = cw.bar;
  const pick = cwById[state.theme] || cwById.auto;
  $('#cw-sw').style.cssText = `--a:${cw.a};--b:${cw.b}`;
  $('#cw-name').textContent = pick.id === 'auto' ? `Auto · ${cw.name}` : cw.name;
  $('#cw-btn').setAttribute('aria-label', `Colorway: ${pick.id === 'auto' ? 'Auto, ' : ''}${cw.name}. Change colorway`);
  $$('#cw-options input').forEach((i) => { i.checked = i.value === state.theme; });
  $$('.cw-ref').forEach((e) => { e.textContent = cw.name.toUpperCase(); });
}

/**
 * Switch colorway with a transition:
 *  - View Transitions API: circular "lens" reveal expanding from (x, y)
 *  - otherwise: a smooth cross-fade of every colour (html.theme-fade)
 */
function setTheme(id, x = innerWidth - 40, y = 30) {
  const commit = () => { state.theme = id; save('theme'); applyTheme(); };
  if (resolve(id) === document.documentElement.dataset.theme || reducedMotion.matches) return commit();
  if (document.startViewTransition) {
    const t = document.startViewTransition(commit);
    t.ready.then(() => {
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
  } else {
    const cl = document.documentElement.classList;
    cl.add('theme-fade'); commit();
    setTimeout(() => cl.toggle('theme-fade', false), 650);
  }
}

// Build the swatch picker
$('#cw-options').innerHTML = COLORWAYS.map((c) => {
  const sw = c.id === 'auto' ? 'background:linear-gradient(135deg,#ecebe6 0 50%,#0a0e13 50% 100%)' : `--a:${c.a};--b:${c.b}`;
  return `<label class="cw-opt"><input type="radio" name="colorway" value="${c.id}">
    <span class="sw" style="${sw}" aria-hidden="true"></span>
    <span><strong>${c.name}</strong><span class="readout">${c.note}</span></span></label>`;
}).join('');

const cwBtn = $('#cw-btn'), cwPanel = $('#cw-panel');
function togglePanel(open = cwPanel.hidden) {
  cwPanel.hidden = !open; cwBtn.setAttribute('aria-expanded', open);
  if (open) ($('#cw-options input:checked') || $('#cw-options input')).focus();
}
cwBtn.addEventListener('click', () => togglePanel());
let lastPointer = null;
cwPanel.addEventListener('pointerdown', (e) => { lastPointer = { x: e.clientX, y: e.clientY }; });
cwPanel.addEventListener('change', (e) => {
  if (e.target.name !== 'colorway') return;
  // Reveal from the tapped swatch (pointer) or from the picker button (keyboard)
  const bb = cwBtn.getBoundingClientRect();
  const o = lastPointer || { x: bb.left + 18, y: bb.top + bb.height / 2 };
  lastPointer = null;
  setTheme(e.target.value, o.x, o.y);
});
// Enter closes the panel; Escape or a click outside also closes it
cwPanel.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); togglePanel(false); cwBtn.focus(); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !cwPanel.hidden) { togglePanel(false); cwBtn.focus(); } });
document.addEventListener('pointerdown', (e) => { if (!cwPanel.hidden && !e.target.closest('.colorway')) togglePanel(false); });
prefersDark.addEventListener?.('change', () => { if (state.theme === 'auto') setTheme('auto'); });

/* ---------- Units (global; any [data-units] button anywhere) ---------- */
function applyUnits() {
  $$('[data-units]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.units === state.units));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-units]'); if (!b || b.dataset.units === state.units) return;
  state.units = b.dataset.units; save('units'); applyUnits();
});
subscribe((s) => { if (s === 'units' || s === 'all') applyUnits(); });

/* ---------- Online / offline indicator ---------- */
function netStatus() {
  const el = $('#net-status');
  el.textContent = navigator.onLine ? '● ONLINE' : '○ OFFLINE — DATA SAVED LOCALLY';
}
addEventListener('online', () => { netStatus(); toast('Back online'); });
addEventListener('offline', () => { netStatus(); toast('Offline — everything still works from your device'); });

/* ---------- PWA: service worker + install prompt ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            toast('New version ready', { action: 'Reload', onAction: () => location.reload(), ms: 10000 });
          }
        });
      });
    }).catch((err) => console.warn('Service worker registration failed', err));
  });
}
let deferredInstall = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredInstall = e;
  const b = $('#install-btn'); if (b) b.hidden = false;
});
document.addEventListener('click', async (e) => {
  if (!e.target.closest('#install-btn') || !deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice; deferredInstall = null;
  e.target.closest('#install-btn').hidden = true;
});

/* ---------- Print from anywhere: render the trail card first ---------- */
addEventListener('beforeprint', () => {
  const share = loaded.get('data') || loaded.get('print');
  if (current?.name !== 'print' && share) share.renderPrint($('#view-print'));
});

/* ---------- Boot ---------- */
applyTheme(); applyUnits(); netStatus(); initTips();
$('#save-status').textContent = `SAVED · ${new Date(state.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
if (storageProblem()) toast('Couldn’t read saved data on this device — starting fresh. Import a backup from Save & Share if you have one.', { ms: 12000 });
addEventListener('hashchange', route);
route();
// Warm the cache for the rest of the modules once the first screen is up (also enables print-from-anywhere).
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
idle(() => Object.keys(ROUTES).forEach((r) => loadRoute(r).catch(() => {})));
