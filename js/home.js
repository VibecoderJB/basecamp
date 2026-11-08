// Home / dashboard — product-page hero, setup guide, status modules and the kit catalog.
import { state, save } from './store.js';
import { esc, icon, coord, niceDate, todayISO } from './utils.js';
import { showWeight, show } from './units.js';
import { gearTotals, rating, tripTotals } from './core/calc.js';

const FEATURES = [
  ['gear', 'pack', 'Gear List', 'Pack weight calculator with base / worn / consumable splits and a category breakdown.'],
  ['trip', 'map', 'Trip Planner', 'Itinerary, daily mileage, elevation notes and an OpenStreetMap with your pins.'],
  ['weather', 'cloud', 'Weather', '7-day forecast for any pin: temps, precip, wind, sunrise and sunset.'],
  ['food', 'food', 'Food & Water', 'Calories per day, food weight to carry, and water between sources.'],
  ['checklist', 'check', 'Checklists', 'Permits, fire bans, trip plan — tick it off; it remembers.'],
  ['guide', 'book', 'Trail Knowledge', 'Leave No Trace, layering, water treatment, bears, blisters, 10 Essentials.'],
  ['data', 'share', 'Save & Share', 'Backup to a file, share a gear list as a link, print a trail card.'],
];

const TICKER = ['No account', 'No ads', 'Works offline', '$0 forever', 'Data stays on device', 'Open map data', 'Installable', 'Print a trail card'];

/** Technical "product shot": a single-lens goggle shield with callouts (decorative SVG). */
const LENS = `
<svg class="lens-shot" viewBox="0 0 560 400" role="img" aria-label="Illustration: a goggle lens with topographic lines, labelled topo layer, weather sensor and offline core">
  <defs>
    <linearGradient id="lg-lens" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4b4bff"/><stop offset=".3" stop-color="#b04dff"/><stop offset=".55" stop-color="#ff4d8d"/>
      <stop offset=".78" stop-color="#ff7a2b"/><stop offset="1" stop-color="#ffd23f"/>
    </linearGradient>
    <radialGradient id="lg-depth" cx=".5" cy=".42" r=".7"><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
    <linearGradient id="lg-sheen" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="lg-clip"><path d="M84 182C84 144 118 127 172 125L388 125C442 127 476 144 476 182L472 243C468 292 432 326 380 326C346 326 324 314 311 294C301 278 292 270 280 270C268 270 259 278 249 294C236 314 214 326 180 326C128 326 92 292 88 243Z"/></clipPath>
    <pattern id="lg-web" width="8" height="40" patternUnits="userSpaceOnUse"><rect width="8" height="40" fill="var(--ink)"/><path d="M0 6h8M0 34h8" stroke="var(--bg)" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/></pattern>
  </defs>
  <!-- webbing strap -->
  <rect x="0" y="190" width="76" height="40" fill="url(#lg-web)"/><rect x="484" y="190" width="76" height="40" fill="url(#lg-web)"/>
  <!-- frame -->
  <path d="M70 180C70 135 110 115 170 112L390 112C450 115 490 135 490 180L486 245C482 302 440 340 380 340C340 340 315 325 300 302C292 290 286 284 280 284C274 284 268 290 260 302C245 325 220 340 180 340C120 340 78 302 74 245Z" fill="var(--ink)"/>
  <!-- lens -->
  <g clip-path="url(#lg-clip)">
    <rect x="80" y="120" width="400" height="210" fill="url(#lg-lens)"/>
    <image href="assets/topo.svg" x="40" y="80" width="480" height="300" preserveAspectRatio="xMidYMid slice" opacity=".32" style="mix-blend-mode:overlay"/>
    <rect x="80" y="120" width="400" height="210" fill="url(#lg-depth)"/>
    <rect class="sheen" x="-60" y="100" width="70" height="260" fill="url(#lg-sheen)" transform="skewX(-22)"/>
  </g>
  <path d="M96 160C120 138 160 132 220 131" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>
  <!-- callouts -->
  <g class="callout" fill="none" stroke="var(--ink-muted)" stroke-width="1">
    <polyline points="180,190 180,62 112,62"/><polyline points="404,206 404,62 548,62"/><polyline points="372,306 372,376 452,376"/>
  </g>
  <g class="callout-dot" fill="var(--bg)" stroke="var(--ink)" stroke-width="2">
    <circle cx="180" cy="190" r="6"/><circle cx="404" cy="206" r="6"/><circle cx="372" cy="306" r="6"/>
  </g>
  <g class="callout" font-family="var(--font-mono)" text-transform="uppercase">
    <text x="112" y="52" fill="var(--ink)" font-size="12" font-weight="700" letter-spacing="1.5">01 TOPO LAYER</text>
    <text x="112" y="80" fill="var(--ink-muted)" font-size="10" letter-spacing="1">OSM · LEAFLET</text>
    <text x="548" y="52" fill="var(--ink)" font-size="12" font-weight="700" letter-spacing="1.5" text-anchor="end">02 WX SENSOR</text>
    <text x="548" y="80" fill="var(--ink-muted)" font-size="10" letter-spacing="1" text-anchor="end">OPEN-METEO · 7 DAY</text>
    <text x="460" y="372" fill="var(--ink)" font-size="12" font-weight="700" letter-spacing="1.5">03 OFFLINE CORE</text>
    <text x="460" y="390" fill="var(--ink-muted)" font-size="10" letter-spacing="1">ZERO BARS OK</text>
  </g>
</svg>`;

function setupGuide(p, g) {
  if (state.meta.setupDismissed) return '';
  const t = state.trip;
  const steps = [
    ['gear', 'Build your gear list', 'Load a starter template, then edit weights to match your kit.', state.meta.gearTouched],
    ['trip', 'Set dates & drop a trailhead pin', 'Your pins power the weather forecast and the trail card.', t.pins.length > 0],
    ['weather', 'Check the forecast', 'It’s saved, so you can re-read it with no signal.', !!state.weather.cache],
    ['checklist', 'Start the pre-trip checklist', 'Permits, fire bans, and leaving a trip plan with someone.', p.done > 0],
  ];
  const done = steps.filter((s) => s[3]).length;
  if (done === steps.length) return '';
  const next = steps.find((s) => !s[3]);
  return `<section class="card setup" aria-labelledby="setup-h">
    <div class="card-head"><h2 id="setup-h">Get trail-ready</h2><span class="label">${done}/${steps.length} complete</span></div>
    <div class="strap" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${done}"><span style="width:${done / steps.length * 100}%"></span></div>
    <ol class="setup-steps">
      ${steps.map(([route, title, desc, ok], i) => `<li class="${ok ? 'done' : ''} ${next && next[0] === route ? 'is-next' : ''}">
        <a href="#/${route}"><span class="step-check" aria-hidden="true">${ok ? '✓' : String(i + 1).padStart(2, '0')}</span>
        <span><strong>${title}</strong><span class="help">${desc}</span></span>
        <span class="sr-only">${ok ? '(done)' : '(to do)'}</span><span class="ns-arrow" aria-hidden="true">→</span></a></li>`).join('')}
    </ol>
    <button type="button" class="btn btn--sm btn--ghost" data-dismiss-setup>Hide this guide</button>
  </section>`;
}

export function render(el) {
  const g = gearTotals(state.gear.items), r = rating(g.base), tt = tripTotals(state.trip.days), t = state.trip;
  const total = state.checklist.length, doneN = state.checklist.filter((i) => i.done).length;
  const p = { total, done: doneN, pct: total ? Math.round(doneN / total * 100) : 0 };
  const th = t.pins.find((x) => x.type === 'trailhead');
  const daysOut = t.start ? Math.round((Date.parse(t.start) - Date.parse(todayISO())) / 864e5) : null;
  const wx = state.weather.cache?.data;
  el.innerHTML = `
  <section class="hero topo" aria-labelledby="h-home">
    <div class="coord-strip"><span class="readout">${th ? coord(th.lat, th.lng) : '44.37°N / 110.58°W'} — ELEV ${th ? '—' : '7,733 FT'}</span><span class="readout">REF BC-003 · FIELD KIT · COLORWAY <span class="cw-ref"></span></span></div>
    <div class="hero-copy">
      <span class="kicker">Free backpacking field kit</span>
      <h1 id="h-home">Pack light.<br><span class="accent">Plan right.</span></h1>
      <p>Gear weights, trip maps, mountain weather and food &amp; water math — engineered into one free app that works with zero bars.</p>
      <div class="btn-row mt">
        <a class="btn btn--primary" href="#/gear">${icon('pack')} Build my pack</a>
        <a class="btn" href="#/trip">${icon('map')} Plan a trip</a>
        <button class="btn btn--signal" type="button" id="install-btn" hidden>${icon('down')} Install app</button>
      </div>
    </div>
    <div class="hero-visual">${LENS}</div>
    <dl class="specbar" aria-label="Technical specifications">
      <div><dt>Price</dt><dd>$0.00</dd></div>
      <div><dt>Accounts</dt><dd>None</dd></div>
      <div><dt>Ads / tracking</dt><dd>None</dd></div>
      <div><dt>Storage</dt><dd>On-device</dd></div>
      <div><dt>Signal</dt><dd>Not required</dd></div>
      <div><dt>Your base wt</dt><dd>${showWeight(g.base, { compact: true })}</dd></div>
    </dl>
  </section>

  <div class="ticker" aria-hidden="true"><div class="ticker-track">
    ${[0, 1].map(() => TICKER.map((x) => `<span>${x}</span><b>✕</b>`).join('')).join('')}
  </div></div>

  ${setupGuide(p, g)}

  <div class="section-head"><span class="label">Section 01</span><h2>Your status</h2><span class="rule" aria-hidden="true"></span></div>
  <div class="grid">
    <a class="card span-4 feature-card" href="#/gear" aria-label="Pack: base weight ${showWeight(g.base)}, ${r.name}">
      <span class="label">Pack · ${esc(state.gear.name)}</span>
      <span class="stat-value">${showWeight(g.base, { compact: true })}</span>
      <span class="readout">Base · ${r.name} · ${state.gear.items.length} items</span>
    </a>
    <a class="card span-4 feature-card" href="#/trip">
      <span class="label">Next trip · ${esc(t.name || 'Untitled')}</span>
      <span class="stat-value">${daysOut != null && daysOut >= 0 ? `${daysOut}<small>days out</small>` : `${tt.n}<small>days</small>`}</span>
      <span class="readout">${t.start ? esc(niceDate(t.start)) : 'No date'} · ${show('dist', tt.dist)} · ${t.pins.length} pins</span>
    </a>
    <a class="card span-4 feature-card" href="#/checklist">
      <span class="label">Pre-trip checklist</span>
      <span class="stat-value">${p.pct}<small>%</small></span>
      <div class="strap" aria-hidden="true"><span style="width:${p.pct}%"></span></div>
      <span class="readout">${p.done} of ${p.total} done</span>
    </a>
  </div>
  ${wx ? `<p class="readout mt">Last forecast · ${esc(state.weather.loc?.name || '')}: ${show('temp', wx.daily.temperature_2m_max[0])} / ${show('temp', wx.daily.temperature_2m_min[0])} · <a href="#/weather">open weather</a></p>` : ''}

  <div class="section-head"><span class="label">Section 02</span><h2>The kit</h2><span class="rule" aria-hidden="true"></span></div>
  <div class="grid">
    ${FEATURES.map(([route, ic, title, desc], i) => `
      <a class="card feature-card span-4" href="#/${route}">
        <div class="row between"><span class="ico">${icon(ic)}</span><span class="fc-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span></div>
        <span class="num">MODULE ${String(i + 1).padStart(2, '0')}</span>
        <h3>${title}</h3><p>${desc}</p>
      </a>`).join('')}
    <div class="card feature-card span-4 card--accent">
      <span class="num">MODULE 08</span>
      <h3>Works offline</h3>
      <p>Install to your home screen. Once loaded, the app, your data and your last forecast are available with zero bars.</p>
    </div>
  </div>`;

  el.querySelector('.cw-ref').textContent = (document.querySelector('#cw-name')?.textContent || '').replace(/^Auto · /, '').toUpperCase();
  el.querySelector('[data-dismiss-setup]')?.addEventListener('click', () => {
    state.meta.setupDismissed = true; save('meta'); render(el);
  });
}
