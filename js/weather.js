// MODULE 03 — Weather via Open-Meteo (free, no API key). Last forecast cached for offline use.
import { state, save } from './store.js';
import { $, esc, icon, toast, coord, num, fmt } from './utils.js';
import { show, unit, toD } from './units.js';
import { PIN_TYPES } from './map.js';

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const MAX_AGE = 60 * 60 * 1000; // re-fetch if cached forecast is older than 1 h

let root, loading = false;

/* WMO weather code -> label + icon group */
const WMO = {
  0: ['Clear', 'sun'], 1: ['Mainly clear', 'sun'], 2: ['Partly cloudy', 'part'], 3: ['Overcast', 'cloud'],
  45: ['Fog', 'fog'], 48: ['Rime fog', 'fog'],
  51: ['Light drizzle', 'rain'], 53: ['Drizzle', 'rain'], 55: ['Heavy drizzle', 'rain'], 56: ['Freezing drizzle', 'sleet'], 57: ['Freezing drizzle', 'sleet'],
  61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'], 66: ['Freezing rain', 'sleet'], 67: ['Freezing rain', 'sleet'],
  71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'], 77: ['Snow grains', 'snow'],
  80: ['Rain showers', 'rain'], 81: ['Rain showers', 'rain'], 82: ['Violent showers', 'rain'], 85: ['Snow showers', 'snow'], 86: ['Heavy snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'], 96: ['T-storm + hail', 'storm'], 99: ['T-storm + hail', 'storm'],
};
const wmo = (c) => WMO[c] || ['—', 'cloud'];

/** Tiny weather glyphs in the brand palette */
function wxIcon(kind) {
  const sun = '<circle cx="18" cy="18" r="7" fill="#ffd23f" stroke="currentColor" stroke-width="2"/>';
  const cloud = (x = 0, fill = 'var(--surface-2)') => `<path transform="translate(${x} 0)" d="M11 30h17a6 6 0 0 0 .6-12A8.5 8.5 0 0 0 12.2 20 5 5 0 0 0 11 30z" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
  const g = {
    sun: sun + '<g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 4v4M18 28v4M4 18h4M28 18h4M8 8l3 3M25 25l3 3M8 28l3-3M25 11l3-3"/></g>',
    part: '<circle cx="14" cy="13" r="6" fill="#ffd23f" stroke="currentColor" stroke-width="2"/>' + cloud(3),
    cloud: cloud(0),
    fog: '<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 13h24M4 19h28M8 25h20"/></g>',
    rain: cloud(0) + '<g stroke="#1f6680" stroke-width="2.5" stroke-linecap="round"><path d="M13 32l-1 3M19 32l-1 3M25 32l-1 3"/></g>',
    sleet: cloud(0) + '<g stroke="#1f6680" stroke-width="2.5" stroke-linecap="round"><path d="M13 32l-1 3M25 32l-1 3"/></g><circle cx="19" cy="34" r="1.6" fill="currentColor"/>',
    snow: cloud(0) + '<g fill="currentColor"><circle cx="13" cy="33.5" r="1.7"/><circle cx="19" cy="34.5" r="1.7"/><circle cx="25" cy="33.5" r="1.7"/></g>',
    storm: cloud(0, '#5f635d') + '<path d="M19 29l-4 6h4l-2 5 6-7h-4l2-4z" fill="#ffd23f" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  }[kind];
  return `<svg class="wx-ico" viewBox="0 0 36 40" aria-hidden="true">${g}</svg>`;
}

/* ---------- Data ---------- */
async function getJSON(url, ms = 12000) {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

async function fetchForecast(loc) {
  const p = new URLSearchParams({
    latitude: loc.lat.toFixed(4), longitude: loc.lng.toFixed(4), timezone: 'auto', forecast_days: '7',
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation',
    hourly: 'temperature_2m,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset,daylight_duration,uv_index_max',
    // fetched in metric; converted for display by units.js
    wind_speed_unit: 'kmh', temperature_unit: 'celsius', precipitation_unit: 'mm',
  });
  return getJSON(`${FORECAST}?${p}`);
}

async function load(force = false) {
  const loc = state.weather.loc; if (!loc || loading) return;
  const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
  const c = state.weather.cache;
  if (!force && c?.key === key && Date.now() - c.fetched < MAX_AGE) return renderForecast();
  loading = true; renderForecast();
  try {
    const data = await fetchForecast(loc);
    state.weather.cache = { key, fetched: Date.now(), data };
    save('weather');
  } catch (err) {
    toast(navigator.onLine ? `Forecast failed (${err.name === 'AbortError' ? 'timed out' : err.message}). Showing last saved.` : 'Offline — showing last saved forecast.');
  } finally { loading = false; if (root?.isConnected) renderForecast(); }
}

function setLoc(loc) {
  state.weather.loc = { name: loc.name || coord(loc.lat, loc.lng), lat: +loc.lat, lng: +loc.lng };
  save('weather');
  renderLocation();
  load();
}

/* ---------- Rendering ---------- */
export function render(el, params = {}) {
  root = el;
  el.innerHTML = `
  <header class="view-head">
    <span class="kicker">Module 03 · Sky</span>
    <h1 id="h-weather">Weather</h1>
    <p>7-day mountain forecast for any pin or place: temperature, precipitation, wind and daylight. The last forecast is saved so you can check it with no signal.</p>
  </header>
  <div class="grid">
    <div class="card span-5">
      <div class="card-head"><h2>Location</h2><span class="label">Choose one</span></div>
      <div class="stack">
        <label class="field"><span>From your trip pins</span>
          <select class="select" id="wx-pin"><option value="">— Select a pin —</option>
          ${state.trip.pins.map((p) => `<option value="${p.id}">${esc(p.label)} (${PIN_TYPES[p.type]?.name || 'Pin'})</option>`).join('')}</select>
        </label>
        <form id="wx-search" class="field" role="search"><label for="wx-q">Search a place</label>
          <div class="row" style="flex-wrap:nowrap"><input class="input" id="wx-q" placeholder="Town, peak, park…" autocomplete="off" required>
          <button class="btn" type="submit">Find</button></div></form>
        <ul class="pin-list" id="wx-results" aria-live="polite"></ul>
        <div class="row">
          <button class="btn btn--sm" type="button" id="wx-geo">${icon('locate')} Use my location</button>
          <details><summary class="label" style="cursor:pointer">Enter coordinates</summary>
            <form id="wx-coords" class="form-grid mt">
              <label class="field"><span>Lat</span><input class="input" name="lat" type="number" step="any" min="-90" max="90" required></label>
              <label class="field"><span>Lng</span><input class="input" name="lng" type="number" step="any" min="-180" max="180" required></label>
              <button class="btn btn--sm wide" type="submit">Get forecast</button>
            </form></details>
        </div>
      </div>
    </div>
    <div class="span-7 stack">
      <div class="card card--shadow topo" id="wx-now" aria-live="polite"></div>
      <div id="wx-alerts"></div>
    </div>
    <div class="span-12" id="wx-hourly"></div>
    <div class="span-12"><div class="wx-days" id="wx-days"></div></div>
  </div>
  <p class="help mt">Forecast data: <a href="https://open-meteo.com/" rel="noopener">Open-Meteo.com</a> (CC BY 4.0). Mountain weather changes fast and models can miss local effects — always check official forecasts and turn back when conditions turn.</p>`;

  bind();
  if (params.pin) {
    const p = state.trip.pins.find((x) => x.id === params.pin);
    if (p) { $('#wx-pin', root).value = p.id; setLoc({ name: p.label, lat: p.lat, lng: p.lng }); return; }
  }
  // First visit: default to the trip's trailhead (or first pin) so there's a forecast immediately
  if (!state.weather.loc && state.trip.pins.length) {
    const p = state.trip.pins.find((x) => x.type === 'trailhead') || state.trip.pins[0];
    $('#wx-pin', root).value = p.id; setLoc({ name: p.label, lat: p.lat, lng: p.lng }); return;
  }
  renderLocation();
  load();
}

function renderLocation() {
  const loc = state.weather.loc;
  if (!loc) {
    $('#wx-now', root).innerHTML = `<div class="empty">No location yet. Pick a trip pin, search a place, or use your location.</div>`;
  }
}

function renderForecast() {
  if (!root?.isConnected) return;
  const loc = state.weather.loc, c = state.weather.cache;
  const now = $('#wx-now', root);
  if (!loc) return renderLocation();
  const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
  const fresh = c && c.key === key;
  if (!fresh) {
    now.innerHTML = `<p class="readout">${esc(loc.name)} · ${coord(loc.lat, loc.lng)}</p><div class="empty">${loading ? 'FETCHING FORECAST…' : 'No forecast saved for this location yet. Connect to load one.'}</div>`;
    $('#wx-days', root).innerHTML = ''; $('#wx-hourly', root).innerHTML = ''; $('#wx-alerts', root).innerHTML = '';
    return;
  }
  const d = c.data, cur = d.current || {}, daily = d.daily;
  const [label, kind] = wmo(cur.weather_code);
  const ageMin = Math.round((Date.now() - c.fetched) / 60000);
  now.innerHTML = `
    <div class="coord-strip"><span class="readout">${esc(loc.name)}</span><span class="readout">${coord(loc.lat, loc.lng)} — ELEV ${show('elev', d.elevation || 0)}</span></div>
    <div class="wx-now">
      ${wxIcon(kind).replace('wx-ico', 'wx-ico" style="width:72px;height:72px')}
      <div class="stat"><span class="label">Now · ${esc(label)}</span><span class="stat-value">${fmt(toD('temp', cur.temperature_2m), 0)}<small>${unit('temp')}</small></span>
        <span class="readout">Feels ${show('temp', cur.apparent_temperature)} · RH ${fmt(cur.relative_humidity_2m)}%</span></div>
      <div class="stat"><span class="label">Wind</span><span class="stat-value" style="font-size:1.4rem">${show('speed', cur.wind_speed_10m)}</span>
        <span class="readout">Gusts ${show('speed', cur.wind_gusts_10m)}</span></div>
    </div>
    <div class="row between mt">
      <span class="readout">${loading ? 'Refreshing…' : `Updated ${ageMin < 1 ? 'just now' : ageMin < 120 ? ageMin + ' min ago' : Math.round(ageMin / 60) + ' h ago'}${navigator.onLine ? '' : ' · OFFLINE COPY'}`}</span>
      <button type="button" class="btn btn--sm" id="wx-refresh" ${loading ? 'disabled' : ''}>Refresh</button>
    </div>`;

  // Hiker-relevant flags for the next 3 days
  const flags = [];
  for (let i = 0; i < Math.min(3, daily.time.length); i++) {
    const day = new Date(daily.time[i] + 'T12:00').toLocaleDateString(undefined, { weekday: 'short' });
    if ([95, 96, 99].includes(daily.weather_code[i])) flags.push(`${day}: thunderstorms possible — plan to be off ridges and peaks by early afternoon.`);
    if (daily.wind_gusts_10m_max[i] >= 64) flags.push(`${day}: strong gusts to ${show('speed', daily.wind_gusts_10m_max[i])} — exposed terrain and tent pitching will be tough.`);
    if (daily.temperature_2m_min[i] <= 0) flags.push(`${day}: low of ${show('temp', daily.temperature_2m_min[i])} — freezing overnight; protect your filter and batteries.`);
    if (daily.temperature_2m_max[i] >= 32) flags.push(`${day}: high of ${show('temp', daily.temperature_2m_max[i])} — carry extra water and rest in shade midday.`);
  }
  $('#wx-alerts', root).innerHTML = flags.length ? `<div class="callout callout--warn"><strong>Heads up</strong><ul style="margin:0;padding-left:18px">${flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : '';

  // Next 24 h: precipitation chance bars + temperature labels
  const h = d.hourly; let start = h.time.findIndex((t) => t >= (cur.time || '').slice(0, 13)); if (start < 0) start = 0;
  const hrs = h.time.slice(start, start + 24).map((t, i) => ({ t: t.slice(11, 13), p: h.precipitation_probability?.[start + i] ?? 0, temp: h.temperature_2m[start + i] }));
  $('#wx-hourly', root).innerHTML = hrs.length ? `<div class="card"><div class="card-head"><h2>Next 24 h</h2><span class="label">Precip chance · temp</span></div>
    <div class="scroll-x" tabindex="0" aria-label="Next 24 hours chart, scrolls sideways"><div class="bars" style="min-width:560px" role="img" aria-label="Hourly chance of precipitation: ${hrs.filter((_, i) => i % 3 === 0).map((x) => `${x.t}:00 ${x.p}%`).join(', ')}">
      ${hrs.map((x) => `<div style="height:${Math.max(2, x.p)}%;background:var(--glacier)" title="${x.t}:00 · ${x.p}% · ${show('temp', x.temp)}"></div>`).join('')}</div>
    <div class="bars-x" style="min-width:560px" aria-hidden="true">${hrs.map((x, i) => `<span>${i % 3 === 0 ? `${x.t}h<br>${fmt(toD('temp', x.temp))}°` : ''}</span>`).join('')}</div></div></div>` : '';

  $('#wx-days', root).innerHTML = daily.time.map((t, i) => {
    const [lab, k] = wmo(daily.weather_code[i]);
    const dt = new Date(t + 'T12:00');
    return `<article class="wx-day" aria-label="${dt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}">
      <div class="row between"><span class="wx-date">${i === 0 ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' })} <span class="muted">${dt.getDate()}</span></span>${wxIcon(k)}</div>
      <div class="wx-temp">${fmt(toD('temp', daily.temperature_2m_max[i]))}° <span>/ ${fmt(toD('temp', daily.temperature_2m_min[i]))}°</span></div>
      <span class="label">${esc(lab)}</span>
      <dl>
        <dt>Precip</dt><dd>${daily.precipitation_probability_max?.[i] ?? '—'}% · ${show('rain', daily.precipitation_sum[i])}</dd>
        <dt>Wind</dt><dd>${show('speed', daily.wind_speed_10m_max[i])}</dd>
        <dt>Gusts</dt><dd>${show('speed', daily.wind_gusts_10m_max[i])}</dd>
        <dt>UV</dt><dd>${daily.uv_index_max?.[i] != null ? fmt(daily.uv_index_max[i], 0) : '—'}</dd>
        <dt>Sunrise</dt><dd>${clock(daily.sunrise[i])}</dd>
        <dt>Sunset</dt><dd>${clock(daily.sunset[i])}</dd>
        <dt>Daylight</dt><dd>${daily.daylight_duration ? `${Math.floor(daily.daylight_duration[i] / 3600)}h ${Math.round(daily.daylight_duration[i] % 3600 / 60)}m` : '—'}</dd>
      </dl></article>`;
  }).join('');
}

/** "2026-11-08T06:52" (already local to the location) -> "6:52 AM" */
function clock(iso) {
  if (!iso) return '—';
  const [hh, mm] = iso.slice(11, 16).split(':').map(Number);
  return new Date(2000, 0, 1, hh, mm).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/* ---------- Events ---------- */
function bind() {
  $('#wx-pin', root).addEventListener('change', (e) => {
    const p = state.trip.pins.find((x) => x.id === e.target.value);
    if (p) setLoc({ name: p.label, lat: p.lat, lng: p.lng });
  });
  $('#wx-search', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('#wx-q', root).value.trim(); if (!q) return;
    const out = $('#wx-results', root);
    out.innerHTML = '<li class="readout">Searching…</li>';
    try {
      const r = await getJSON(`${GEOCODE}?${new URLSearchParams({ name: q, count: '6', language: 'en', format: 'json' })}`);
      const res = r.results || [];
      out.innerHTML = res.length ? res.map((x, i) => `<li><button type="button" class="btn btn--sm btn--ghost" style="width:100%;justify-content:flex-start;text-transform:none" data-geo="${i}">
        ${icon('pin')} ${esc([x.name, x.admin1, x.country_code].filter(Boolean).join(', '))} <span class="readout" style="margin-left:auto">${x.elevation != null ? show('elev', x.elevation) : ''}</span></button></li>`).join('')
        : '<li class="readout">No matches. Try a nearby town.</li>';
      out.onclick = (ev) => { const b = ev.target.closest('[data-geo]'); if (!b) return; const x = res[+b.dataset.geo]; setLoc({ name: [x.name, x.admin1].filter(Boolean).join(', '), lat: x.latitude, lng: x.longitude }); out.innerHTML = ''; };
    } catch { out.innerHTML = '<li class="readout">Search needs a connection. Try coordinates or a trip pin.</li>'; }
  });
  $('#wx-geo', root).addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Geolocation not available');
    navigator.geolocation.getCurrentPosition((p) => setLoc({ name: 'My location', lat: p.coords.latitude, lng: p.coords.longitude }),
      () => toast('Could not get your location'), { timeout: 15000 });
  });
  $('#wx-coords', root).addEventListener('submit', (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const lat = num(fd.get('lat'), NaN), lng = num(fd.get('lng'), NaN);
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return toast('Invalid coordinates');
    setLoc({ lat, lng });
  });
  $('#wx-now', root).addEventListener('click', (e) => { if (e.target.closest('#wx-refresh')) load(true); });
}
