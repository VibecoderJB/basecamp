// MODULE 02 — Trip Planner: details, day-by-day itinerary, map with pins.
import { state, save } from './store.js';
import { $, $$, esc, uid, num, icon, toast, confirmBox, coord, addDaysISO, niceDate, clamp } from './utils.js';
import { unit, inputVal, fromD, show, toD } from './units.js';
import { loadLeaflet, pinIcon, osmLayer, PIN_TYPES } from './map.js';
import { tripTotals as coreTripTotals } from './core/calc.js';

let root;
// Map objects persist across re-renders: the map's DOM node is re-attached rather than rebuilt.
let L, map, mapEl, markers = new Map(), dropType = null;

export const tripTotals = (days = state.trip.days) => coreTripTotals(days);

const dayDate = (i) => (state.trip.start ? addDaysISO(state.trip.start, i) : '');

export function render(el) {
  root = el;
  const t = state.trip;
  el.innerHTML = `
  <header class="view-head">
    <span class="kicker">Module 02 · Route</span>
    <h1 id="h-trip">Trip Planner</h1>
    <p>Lay out the route, plan each day's miles and climbing, and drop pins for trailheads, camps and water. Everything saves automatically.</p>
  </header>

  <div class="grid">
    <div class="card span-5">
      <div class="card-head"><h2>Trip Details</h2><span class="label">Spec</span></div>
      <div class="form-grid">
        <label class="field wide"><span>Trip name</span><input class="input" data-t="name" value="${esc(t.name)}" maxlength="80"></label>
        <label class="field"><span>Start date</span><input class="input" type="date" data-t="start" value="${esc(t.start)}"></label>
        <label class="field"><span>End date</span><input class="input" type="date" data-t="end" value="${esc(t.end)}"></label>
        <label class="field"><span>Start point</span><input class="input" data-t="from" value="${esc(t.from)}" placeholder="Trailhead / town"></label>
        <label class="field"><span>End point</span><input class="input" data-t="to" value="${esc(t.to)}" placeholder="Trailhead / town"></label>
      </div>
      <hr class="cut">
      <h3 class="label" style="margin-bottom:10px">Emergency / trip-plan contact</h3>
      <div class="form-grid">
        <label class="field"><span>Contact name</span><input class="input" data-t="contactName" value="${esc(t.contactName)}" autocomplete="off"></label>
        <label class="field"><span>Contact phone</span><input class="input" type="tel" data-t="contactPhone" value="${esc(t.contactPhone)}" autocomplete="off"></label>
        <label class="field wide"><span>Call for help if not back by</span><input class="input" type="datetime-local" data-t="returnBy" value="${esc(t.returnBy)}"></label>
        <label class="field wide"><span>Notes (route, vehicle, permits)</span><textarea class="textarea" data-t="notes" maxlength="2000">${esc(t.notes)}</textarea></label>
      </div>
    </div>

    <div class="span-7 stack">
      <div class="stats" id="trip-stats"></div>
      <div class="card">
        <div class="card-head"><h2>Daily ${unit('dist') === 'mi' ? 'Mileage' : 'Distance'}</h2><span class="label" id="trip-range"></span></div>
        <div id="trip-bars"></div>
      </div>
    </div>

    <div class="span-12">
      <div class="map-shell" id="map-shell">
        <div class="map-tools" role="toolbar" aria-label="Map tools">
          <span class="label">Drop pin:</span>
          ${Object.entries(PIN_TYPES).map(([k, p]) => `<button type="button" class="btn btn--sm" data-drop="${k}" aria-pressed="false"><span class="pin-dot pin-${k}" style="width:18px;height:18px" aria-hidden="true"><b style="font-size:.55rem">${p.letter}</b></span>${p.name}</button>`).join('')}
          <button type="button" class="btn btn--sm btn--ghost" id="map-locate">${icon('locate')} Locate me</button>
          <button type="button" class="btn btn--sm btn--ghost" id="map-fit">Fit pins</button>
          <span class="map-hint" id="map-hint" aria-live="polite">Pick a pin type, then tap the map.</span>
        </div>
        <div id="map-slot"><div class="map-loading" style="position:static;height:320px">LOADING MAP…</div></div>
      </div>
    </div>

    <div class="card span-5">
      <div class="card-head"><h2>Pins</h2><span class="label" id="pin-count"></span></div>
      <ul class="pin-list" id="pin-list"></ul>
      <hr class="cut">
      <form id="pin-add" class="form-grid" autocomplete="off" aria-label="Add pin by coordinates">
        <label class="field"><span>Latitude</span><input class="input" name="lat" type="number" step="any" min="-90" max="90" required placeholder="44.37"></label>
        <label class="field"><span>Longitude</span><input class="input" name="lng" type="number" step="any" min="-180" max="180" required placeholder="-110.58"></label>
        <label class="field"><span>Type</span><select class="select" name="type">${Object.entries(PIN_TYPES).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join('')}</select></label>
        <label class="field"><span>Label</span><input class="input" name="label" maxlength="60" placeholder="optional"></label>
        <button class="btn wide" type="submit">${icon('pin')} Add pin by coordinates</button>
      </form>
    </div>

    <div class="span-7">
      <div class="row between" style="margin-bottom:10px">
        <h2 class="mb0">Itinerary</h2>
        <div class="btn-row">
          <button type="button" class="btn btn--sm" id="days-from-dates">Build from dates</button>
          <button type="button" class="btn btn--sm btn--primary" id="day-add">${icon('plus')} Add day</button>
        </div>
      </div>
      <div id="day-list"></div>
    </div>
  </div>`;

  renderDays(); renderTotals(); renderPins();
  bindInner();
  if (!el.dataset.bound) { bindRoot(); el.dataset.bound = '1'; }
  initMap();
}

/* ---------- Itinerary ---------- */
function dayCard(d, i) {
  const du = unit('dist'), eu = unit('elev');
  return `<article class="day-card" data-day="${d.id}">
    <header><span class="day-num">DAY ${String(i + 1).padStart(2, '0')}</span>
      <span class="readout">${esc(niceDate(dayDate(i)))}</span>
      <div class="row" style="margin-left:auto;gap:4px">
        <button type="button" class="btn btn--sm btn--icon btn--ghost" data-move="-1" aria-label="Move day ${i + 1} up" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="btn btn--sm btn--icon btn--ghost" data-move="1" aria-label="Move day ${i + 1} down" ${i === state.trip.days.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="btn btn--sm btn--icon btn--ghost btn--danger" data-del-day aria-label="Delete day ${i + 1}">${icon('x')}</button>
      </div>
    </header>
    <div class="form-grid">
      <label class="field"><span>From</span><input class="input" data-d="from" value="${esc(d.from)}"></label>
      <label class="field"><span>To / camp</span><input class="input" data-d="to" value="${esc(d.to)}"></label>
      <label class="field"><span>Distance (${du})</span><input class="input" type="number" inputmode="decimal" min="0" step="any" data-d="distKm" value="${d.distKm ? inputVal('dist', d.distKm) : ''}"></label>
      <label class="field"><span>Gain (${eu})</span><input class="input" type="number" inputmode="numeric" min="0" step="any" data-d="gainM" value="${d.gainM ? inputVal('elev', d.gainM) : ''}"></label>
      <label class="field"><span>Loss (${eu})</span><input class="input" type="number" inputmode="numeric" min="0" step="any" data-d="lossM" value="${d.lossM ? inputVal('elev', d.lossM) : ''}"></label>
      <label class="field"><span>Water sources</span><input class="input" data-d="water" value="${esc(d.water)}" placeholder="e.g. creek mi 4.2"></label>
      <label class="field wide"><span>Elevation & notes</span><textarea class="textarea" data-d="notes" placeholder="Big climb over the pass early; exposed ridge — be off by noon.">${esc(d.notes)}</textarea></label>
    </div>
  </article>`;
}

function renderDays() {
  const host = $('#day-list', root);
  host.innerHTML = state.trip.days.length ? state.trip.days.map(dayCard).join('')
    : `<div class="empty">No days yet. Set your dates and hit “Build from dates”, or add days one at a time.</div>`;
}

function renderTotals() {
  const tt = tripTotals();
  const avg = tt.n ? tt.dist / tt.n : 0;
  $('#trip-stats', root).innerHTML = `
    <div class="stat stat--hl"><span class="label">Distance</span><span class="stat-value">${show('dist', tt.dist)}</span></div>
    <div class="stat"><span class="label">Days</span><span class="stat-value">${tt.n}</span></div>
    <div class="stat"><span class="label">Avg / day</span><span class="stat-value">${show('dist', avg)}</span></div>
    <div class="stat"><span class="label">Gain / Loss</span><span class="stat-value" style="font-size:1.15rem">+${show('elev', tt.gain)}<br>−${show('elev', tt.loss)}</span></div>`;
  const t = state.trip;
  $('#trip-range', root).textContent = t.start ? `${niceDate(t.start, { month: 'short', day: 'numeric' })} → ${niceDate(t.end, { month: 'short', day: 'numeric' })}` : '';
  const days = t.days, max = Math.max(...days.map((d) => Number(d.distKm) || 0), 0.001);
  $('#trip-bars', root).innerHTML = days.length ? `
    <div class="bars" role="img" aria-label="Daily distance: ${days.map((d, i) => `day ${i + 1} ${show('dist', d.distKm || 0)}`).join(', ')}">
      ${days.map((d) => `<div style="height:${clamp((Number(d.distKm) || 0) / max * 100, 2, 100)}%" title="${show('dist', d.distKm || 0)}"></div>`).join('')}
    </div>
    <div class="bars-x" aria-hidden="true">${days.map((d, i) => `<span>D${i + 1}<br>${toD('dist', d.distKm || 0).toFixed(0)}</span>`).join('')}</div>`
    : `<p class="help">Add days to see your daily ${unit('dist') === 'mi' ? 'mileage' : 'distance'} profile.</p>`;
}

/* ---------- Pins ---------- */
function renderPins() {
  const pins = state.trip.pins;
  $('#pin-count', root).textContent = `${pins.length} pinned`;
  $('#pin-list', root).innerHTML = pins.length ? pins.map((p) => `
    <li class="pin-item" data-pin="${p.id}">
      <span class="pin-dot pin-${p.type}" aria-hidden="true"><b>${PIN_TYPES[p.type]?.letter || '•'}</b></span>
      <div>
        <label><span class="sr-only">${PIN_TYPES[p.type]?.name || 'Pin'} label</span>
          <input class="input" data-pin-label value="${esc(p.label)}" style="min-height:36px;padding:4px 8px" maxlength="60"></label>
        <span class="readout">${PIN_TYPES[p.type]?.name || 'Pin'} · ${coord(p.lat, p.lng, 4)}</span>
      </div>
      <div class="row" style="gap:4px">
        <a class="btn btn--sm btn--icon btn--ghost" href="#/weather?pin=${p.id}" aria-label="Weather at ${esc(p.label)}" title="Forecast">${icon('cloud')}</a>
        <button type="button" class="btn btn--sm btn--icon btn--ghost" data-center aria-label="Show ${esc(p.label)} on map" title="Center">${icon('locate')}</button>
        <button type="button" class="btn btn--sm btn--icon btn--ghost btn--danger" data-del-pin aria-label="Delete pin ${esc(p.label)}">${icon('x')}</button>
      </div>
    </li>`).join('') : `<li class="empty">No pins yet. Drop them on the map or add by coordinates.</li>`;
}

function addPin(lat, lng, type, label) {
  const count = state.trip.pins.filter((p) => p.type === type).length + 1;
  const pin = { id: uid(), type, lat: +lat.toFixed(6), lng: +lng.toFixed(6), label: label || `${PIN_TYPES[type].name} ${count}` };
  state.trip.pins.push(pin);
  save('pins'); renderPins(); syncMarkers();
  toast(`Pinned ${pin.label}`);
  return pin;
}

/* ---------- Map ---------- */
async function initMap() {
  const slot = $('#map-slot', root);
  if (map) { slot.replaceChildren(mapEl); map.invalidateSize(); syncMarkers(); return; }
  try {
    L = await loadLeaflet();
  } catch {
    slot.innerHTML = `<div class="empty" style="margin:12px">Map couldn't load — you may be offline and haven't opened the map online yet. You can still add pins by coordinates below; they'll appear on the map next time you're connected.</div>`;
    return;
  }
  if (!root.isConnected || map) return;
  mapEl = document.createElement('div'); mapEl.id = 'map';
  slot.replaceChildren(mapEl);
  const v = state.trip.mapView;
  map = L.map(mapEl, { zoomControl: true, worldCopyJump: true }).setView(v ? [v.lat, v.lng] : [39.5, -98.35], v ? v.z : 4);
  osmLayer(L).addTo(map);
  L.control.scale({ imperial: true, metric: true }).addTo(map);
  map.on('click', (e) => { if (dropType) addPin(e.latlng.lat, e.latlng.lng, dropType); });
  map.on('moveend', () => { const c = map.getCenter(); state.trip.mapView = { lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), z: map.getZoom() }; save('map'); });
  syncMarkers();
  if (!v && state.trip.pins.length) fitPins();
}

/** Make Leaflet markers match state.trip.pins */
function syncMarkers() {
  if (!map) return;
  const ids = new Set(state.trip.pins.map((p) => p.id));
  for (const [id, m] of markers) if (!ids.has(id)) { m.remove(); markers.delete(id); }
  for (const p of state.trip.pins) {
    let m = markers.get(p.id);
    if (!m) {
      m = L.marker([p.lat, p.lng], { icon: pinIcon(L, p.type), draggable: true, title: p.label, alt: p.label, keyboard: true }).addTo(map);
      m.on('dragend', () => {
        const pin = state.trip.pins.find((x) => x.id === p.id); if (!pin) return;
        const ll = m.getLatLng(); pin.lat = +ll.lat.toFixed(6); pin.lng = +ll.lng.toFixed(6);
        save('pins'); renderPins();
      });
      markers.set(p.id, m);
    }
    m.setLatLng([p.lat, p.lng]);
    m.unbindTooltip().bindTooltip(esc(p.label), { direction: 'right' });
  }
}

function fitPins() {
  if (!map || !state.trip.pins.length) return;
  const b = L.latLngBounds(state.trip.pins.map((p) => [p.lat, p.lng]));
  map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
}

/* ---------- Events ---------- */
function bindInner() {
  $('#pin-add', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const lat = num(fd.get('lat'), NaN), lng = num(fd.get('lng'), NaN);
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) { toast('Enter a valid latitude (−90..90) and longitude (−180..180)'); return; }
    addPin(lat, lng, fd.get('type'), String(fd.get('label')).trim());
    e.target.reset();
    if (map) map.setView([lat, lng], Math.max(map.getZoom(), 12));
  });
}

function bindRoot() {
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.t) {
      state.trip[t.dataset.t] = t.value; save('trip');
      if (t.dataset.t === 'start' || t.dataset.t === 'end') { renderTotals(); $$('.day-card', root).forEach((c, i) => { $('.readout', c).textContent = niceDate(dayDate(i)); }); }
    } else if (t.dataset.d) {
      const day = state.trip.days.find((d) => d.id === t.closest('[data-day]').dataset.day); if (!day) return;
      const k = t.dataset.d;
      day[k] = k === 'distKm' ? fromD('dist', num(t.value)) : (k === 'gainM' || k === 'lossM') ? fromD('elev', num(t.value)) : t.value;
      save('trip');
      if (k.endsWith('Km') || k.endsWith('M')) renderTotals();
    } else if (t.hasAttribute('data-pin-label')) {
      const pin = state.trip.pins.find((p) => p.id === t.closest('[data-pin]').dataset.pin); if (!pin) return;
      pin.label = t.value; save('pins'); syncMarkers();
    }
  });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.drop) {
      dropType = dropType === b.dataset.drop ? null : b.dataset.drop;
      $$('[data-drop]', root).forEach((x) => x.setAttribute('aria-pressed', x.dataset.drop === dropType));
      $('#map-shell', root).classList.toggle('dropping', !!dropType);
      $('#map-hint', root).textContent = dropType ? `Tap the map to drop a ${PIN_TYPES[dropType].name.toLowerCase()} pin. Tap the button again to stop.` : 'Pick a pin type, then tap the map.';
    } else if (b.id === 'map-locate') {
      if (!navigator.geolocation) return toast('Geolocation is not available on this device');
      navigator.geolocation.getCurrentPosition(
        (pos) => { const { latitude: la, longitude: lo } = pos.coords; map?.setView([la, lo], 13); toast(`You are at ${coord(la, lo, 4)}`); },
        () => toast('Could not get your location (permission denied or no fix)'), { enableHighAccuracy: true, timeout: 15000 });
    } else if (b.id === 'map-fit') {
      state.trip.pins.length ? fitPins() : toast('No pins to fit yet');
    } else if (b.hasAttribute('data-del-pin')) {
      const id = b.closest('[data-pin]').dataset.pin;
      const idx = state.trip.pins.findIndex((p) => p.id === id); const [pin] = state.trip.pins.splice(idx, 1);
      save('pins'); renderPins(); syncMarkers();
      toast(`Removed ${pin.label}`, { action: 'Undo', onAction: () => { state.trip.pins.splice(idx, 0, pin); save('pins'); renderPins(); syncMarkers(); } });
    } else if (b.hasAttribute('data-center')) {
      const pin = state.trip.pins.find((p) => p.id === b.closest('[data-pin]').dataset.pin);
      if (pin && map) { map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 13)); markers.get(pin.id)?.openTooltip(); $('#map-shell', root).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    } else if (b.id === 'day-add') {
      const prev = state.trip.days.at(-1);
      state.trip.days.push({ id: uid(), from: prev?.to || state.trip.from || '', to: '', distKm: 0, gainM: 0, lossM: 0, water: '', notes: '' });
      save('trip'); renderDays(); renderTotals();
      $$('.day-card', root).at(-1)?.querySelector('input')?.focus();
    } else if (b.id === 'days-from-dates') {
      const { start, end } = state.trip;
      if (!start || !end || end < start) return toast('Set a start date and an end date on or after it first');
      const n = Math.round((Date.parse(end) - Date.parse(start)) / 864e5) + 1;
      if (n > 60) return toast('That is more than 60 days — add days manually for long trips');
      const days = state.trip.days;
      if (days.length > n && !(await confirmBox('Trim itinerary?', `<p>Your dates cover ${n} days but the itinerary has ${days.length}. Extra days at the end will be removed.</p>`, 'Trim'))) return;
      while (days.length < n) days.push({ id: uid(), from: days.at(-1)?.to || (days.length ? '' : state.trip.from), to: '', distKm: 0, gainM: 0, lossM: 0, water: '', notes: '' });
      days.length = n;
      if (state.trip.to && !days.at(-1).to) days.at(-1).to = state.trip.to;
      save('trip'); renderDays(); renderTotals(); toast(`Itinerary has ${n} day${n > 1 ? 's' : ''}`);
    } else if (b.hasAttribute('data-del-day')) {
      const id = b.closest('[data-day]').dataset.day;
      const idx = state.trip.days.findIndex((d) => d.id === id); const [day] = state.trip.days.splice(idx, 1);
      save('trip'); renderDays(); renderTotals();
      toast(`Removed day ${idx + 1}`, { action: 'Undo', onAction: () => { state.trip.days.splice(idx, 0, day); save('trip'); renderDays(); renderTotals(); } });
    } else if (b.dataset.move) {
      const id = b.closest('[data-day]').dataset.day, days = state.trip.days;
      const i = days.findIndex((d) => d.id === id), j = i + Number(b.dataset.move);
      if (j < 0 || j >= days.length) return;
      [days[i], days[j]] = [days[j], days[i]];
      save('trip'); renderDays(); renderTotals();
      $(`[data-day="${id}"] [data-move="${b.dataset.move}"]`, root)?.focus();
    }
  });
}

/** Called by the router when leaving/returning so Leaflet recomputes its size. */
export function onShow() { if (map) setTimeout(() => map.invalidateSize(), 50); }
