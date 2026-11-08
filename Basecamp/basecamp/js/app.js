// BASECAMP — app shell: hash router, theme + units toggles, offline status, PWA install, print.
import { state, save, subscribe } from './store.js';
import { $, $$, toast, icon } from './utils.js';
import * as home from './home.js';
import * as gear from './gear.js';
import * as trip from './trip.js';
import * as weather from './weather.js';
import * as food from './food.js';
import * as checklist from './checklist.js';
import * as guide from './guide.js';
import * as share from './share.js';

/* Route table: hash segment -> { module, title } */
const ROUTES = {
  '': { mod: home, title: 'Field Kit' },
  gear: { mod: gear, title: 'Gear List' },
  trip: { mod: trip, title: 'Trip Planner' },
  weather: { mod: weather, title: 'Weather' },
  food: { mod: food, title: 'Food & Water' },
  checklist: { mod: checklist, title: 'Checklists' },
  guide: { mod: guide, title: 'Trail Knowledge' },
  data: { mod: share, title: 'Save & Share' },
  print: { mod: { render: share.renderPrint }, title: 'Trail Card' },
};

let current = null; // { name, params }

/** Parse "#/guide/bears?x=1" -> { name:'guide', params:{ slug:'bears', x:'1' } } */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const [name = '', ...rest] = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(query));
  if (rest[0]) params.slug = decodeURIComponent(rest.join('/'));
  return { name, params };
}

function route() {
  const { name, params } = parseHash();
  if (name === 'share' && params.slug) { share.handleShare(params.slug); return; }
  const r = ROUTES[name] ? name : '';
  const def = ROUTES[r];
  const changed = !current || current.name !== r;
  current = { name: r, params };

  $$('.view').forEach((v) => { v.hidden = v.dataset.route !== r; });
  const el = $(`.view[data-route="${r}"]`);
  def.mod.render(el, params);
  def.mod.onShow?.();

  // Nav state
  $$('.nav a').forEach((a) => {
    const target = a.getAttribute('href').replace(/^#\/?/, '');
    if (target === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const ib = $('#install-btn'); if (ib && deferredInstall) ib.hidden = false;
  document.title = `${def.title}${params.slug && r === 'guide' ? ' · Guide' : ''} — BASECAMP`;

  // Move focus to the new view's heading for screen-reader users; reset scroll.
  if (changed) {
    scrollTo(0, 0);
    const h = el.querySelector('h1');
    if (h && document.activeElement !== document.body) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
}

/** Re-render the visible view after global changes (units, imports, template loads). */
subscribe((scope) => {
  if (scope === 'all' || scope === 'units') {
    if (current) ROUTES[current.name].mod.render($(`.view[data-route="${current.name}"]`), current.params);
  }
});

/* ---------- Theme: auto -> light -> dark ---------- */
const THEMES = ['auto', 'light', 'dark'];
const THEME_ICON = { auto: 'auto', light: 'sun', dark: 'moon' };
const THEME_LABEL = { auto: 'auto (follows device)', light: 'day', dark: 'night hike' };
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const b = $('#theme-toggle');
  b.innerHTML = icon(THEME_ICON[state.theme]);
  b.setAttribute('aria-label', `Theme: ${THEME_LABEL[state.theme]}. Switch theme`);
  const dark = state.theme === 'dark' || (state.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').content = dark ? '#0d1510' : '#14251b';
}
$('#theme-toggle').addEventListener('click', () => {
  state.theme = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];
  save('theme'); applyTheme(); toast(`Theme: ${THEME_LABEL[state.theme]}`, { ms: 1800 });
});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

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
addEventListener('beforeprint', () => { if (current?.name !== 'print') share.renderPrint($('#view-print')); });

/* ---------- Boot ---------- */
applyTheme(); applyUnits(); netStatus();
addEventListener('hashchange', route);
route();
