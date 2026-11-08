// Global app state + localStorage persistence (auto-saves on every change).
import { uid, todayISO, addDaysISO } from './utils.js';
import { CHECKLIST_GROUPS } from './data/checklist.js';
import { TEMPLATES } from './data/templates.js';

export const STORAGE_KEY = 'basecamp:v1';
export const SCHEMA_VERSION = 1;

/** Turn a template row into a gear item object */
export const rowToItem = ([name, cat, g, qty = 1, flags = '']) => ({
  id: uid(), name, cat, g, qty, worn: flags.includes('w'), cons: flags.includes('c'),
});

export function defaultChecklist() {
  return CHECKLIST_GROUPS.flatMap((grp) => grp.items.map((text) => ({ id: uid(), text, group: grp.id, done: false })));
}

export function defaults() {
  const start = addDaysISO(todayISO(), 14);
  return {
    v: SCHEMA_VERSION,
    units: 'imperial',
    theme: 'auto',
    gear: { name: TEMPLATES.weekend.name, items: TEMPLATES.weekend.items.map(rowToItem), chartMode: 'base' },
    trip: {
      name: 'My Next Trip', start, end: addDaysISO(start, 2), from: '', to: '',
      contactName: '', contactPhone: '', returnBy: '', notes: '',
      days: [], pins: [], mapView: null,
    },
    food: { days: 3, distKm: 16, gainM: 600, bodyKg: 75, packKg: 9, cold: false, density: 125 },
    water: { distKm: 8, paceKmh: 3.2, tempC: 21, gainM: 300, dryCamp: false },
    checklist: defaultChecklist(),
    weather: { loc: null, cache: null },
    updated: Date.now(),
  };
}

/** Merge loaded data over defaults so new fields always exist (forward-compatible). */
export function normalize(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const out = { ...d, ...raw };
  out.gear = { ...d.gear, ...(raw.gear || {}) };
  out.gear.items = Array.isArray(out.gear.items) ? out.gear.items.filter((i) => i && typeof i === 'object').map((i) => ({
    id: i.id || uid(), name: String(i.name ?? ''), cat: i.cat || 'misc', g: Math.max(0, Number(i.g) || 0),
    qty: Math.max(0, Math.round(Number(i.qty) || 0)), worn: !!i.worn, cons: !!i.cons, packed: !!i.packed,
  })) : [];
  out.trip = { ...d.trip, ...(raw.trip || {}) };
  out.trip.days = Array.isArray(out.trip.days) ? out.trip.days : [];
  out.trip.pins = Array.isArray(out.trip.pins) ? out.trip.pins.filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) : [];
  out.food = { ...d.food, ...(raw.food || {}) };
  out.water = { ...d.water, ...(raw.water || {}) };
  out.checklist = Array.isArray(raw.checklist) ? raw.checklist : d.checklist;
  out.weather = { ...d.weather, ...(raw.weather || {}) };
  out.units = raw.units === 'metric' ? 'metric' : 'imperial';
  // v1 used light/dark; map them onto the matching colorways
  const legacy = { light: 'granite', dark: 'sapphire' };
  const th = legacy[raw.theme] || raw.theme;
  out.theme = ['auto', 'granite', 'glacier', 'sapphire', 'forage', 'ember'].includes(th) ? th : 'auto';
  out.v = SCHEMA_VERSION;
  return out;
}

function load() {
  try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return defaults(); }
}

/** The single mutable state object. Mutate, then call save(). */
export const state = load();

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

let saveTimer;
let storageOK = true;
/** Persist (debounced) and notify listeners. `scope` lets views skip irrelevant updates. */
export function save(scope = 'all') {
  state.updated = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageOK = true; }
    catch (e) { if (storageOK) console.warn('BASECAMP: could not save to localStorage', e); storageOK = false; }
  }, 200);
  listeners.forEach((fn) => fn(scope));
}

/** Replace the whole state (import / reset) and persist immediately. */
export function replaceState(next) {
  const n = normalize(next);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, n);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  listeners.forEach((fn) => fn('all'));
}

// Save immediately if the tab is being hidden/closed (debounce may not have fired).
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ } }
});
