// Home / dashboard — catalog-style overview of every module.
import { state } from './store.js';
import { esc, icon, coord, niceDate, todayISO } from './utils.js';
import { showWeight, show } from './units.js';
import { gearTotals, rating } from './gear.js';
import { tripTotals } from './trip.js';
import { progress } from './checklist.js';

const FEATURES = [
  ['gear', 'pack', 'Gear List', 'Pack weight calculator with base / worn / consumable splits and a category breakdown.'],
  ['trip', 'map', 'Trip Planner', 'Itinerary, daily mileage, elevation notes and an OpenStreetMap with your pins.'],
  ['weather', 'cloud', 'Weather', '7-day forecast for any pin: temps, precip, wind, sunrise and sunset.'],
  ['food', 'food', 'Food & Water', 'Calories per day, food weight to carry, and water between sources.'],
  ['checklist', 'check', 'Checklists', 'Permits, fire bans, trip plan — tick it off; it remembers.'],
  ['guide', 'book', 'Trail Knowledge', 'Leave No Trace, layering, water treatment, bears, blisters, 10 Essentials.'],
  ['data', 'share', 'Save & Share', 'Backup to a file, share a gear list as a link, print a trail card.'],
];

export function render(el) {
  const g = gearTotals(), r = rating(g.base), tt = tripTotals(), p = progress(), t = state.trip;
  const th = t.pins.find((x) => x.type === 'trailhead');
  const daysOut = t.start ? Math.round((Date.parse(t.start) - Date.parse(todayISO())) / 864e5) : null;
  const wx = state.weather.cache?.data;
  el.innerHTML = `
  <section class="hero topo" aria-labelledby="h-home">
    <div class="coord-strip"><span class="readout">${th ? coord(th.lat, th.lng) : '44.37°N / 110.58°W'} — ELEV ${th ? '—' : '7,733 FT'}</span><span class="readout">REF BC-001 · FIELD KIT</span></div>
    <div>
      <span class="kicker">Free backpacking field kit</span>
      <h1 id="h-home">Pack light.<br><span class="accent">Plan right.</span></h1>
      <p>Gear weights, trip maps, mountain weather and food &amp; water math — engineered into one free app that works with zero bars.</p>
      <div class="btn-row mt">
        <a class="btn btn--primary" href="#/gear">${icon('pack')} Build my pack</a>
        <a class="btn" href="#/trip">${icon('map')} Plan a trip</a>
        <button class="btn btn--signal" type="button" id="install-btn" hidden>${icon('down')} Install app</button>
      </div>
      <div class="hero-meta">
        <span class="tag tag--blaze">No sign-up</span><span class="tag tag--glacier">Works offline</span><span class="tag tag--signal">$0 forever</span><span class="tag tag--moss">Open data</span>
      </div>
    </div>
    <aside class="techspec" aria-label="Technical specifications">
      <header><span>Tech specs</span><span>BC-001</span></header>
      <dl>
        <dt>Price</dt><dd>$0.00</dd>
        <dt>Accounts</dt><dd>None required</dd>
        <dt>Ads / tracking</dt><dd>None</dd>
        <dt>Data storage</dt><dd>On-device</dd>
        <dt>Signal</dt><dd>Not required</dd>
        <dt>Your base wt</dt><dd>${showWeight(g.base, { compact: true })}</dd>
      </dl>
      <div class="lens-bar" aria-hidden="true"></div>
    </aside>
  </section>

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

  <hr class="cut">
  <h2 class="mt">The kit</h2>
  <div class="grid">
    ${FEATURES.map(([route, ic, title, desc], i) => `
      <a class="card feature-card span-4" href="#/${route}">
        <div class="row between"><span class="ico">${icon(ic)}</span><span class="num">MOD ${String(i + 1).padStart(2, '0')}</span></div>
        <h3>${title}</h3><p>${desc}</p>
      </a>`).join('')}
    <div class="card feature-card span-4 card--accent">
      <span class="num" style="color:inherit">MOD 08</span>
      <h3>Works offline</h3>
      <p style="color:inherit">Install to your home screen. Once loaded, the app, your data and your last forecast are available with zero bars.</p>
    </div>
  </div>`;
}
