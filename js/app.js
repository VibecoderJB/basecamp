// BASECAMP — app shell: hash router, theme + units toggles, offline status, PWA install, print.
import { state, save, subscribe } from './store.js';
import { $, $$, toast } from './utils.js';
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
addEventListener('beforeprint', () => { if (current?.name !== 'print') share.renderPrint($('#view-print')); });

/* ---------- Boot ---------- */
applyTheme(); applyUnits(); netStatus();
addEventListener('hashchange', route);
route();
