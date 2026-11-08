// Data schema: defaults, versioned migrations and strict normalisation.
// Pure (no DOM / storage) so it can be unit-tested. Every load, import and
// cross-tab sync goes through normalize(), so the app never sees bad data.
import { uid, todayISO, addDaysISO } from '../utils.js';
import { CHECKLIST_GROUPS } from '../data/checklist.js';
import { TEMPLATES } from '../data/templates.js';
import { CATEGORIES } from '../data/categories.js';

/** Bump when the stored shape changes, and add a step to MIGRATIONS. */
export const SCHEMA_VERSION = 2;
export const COLORWAY_IDS = ['auto', 'granite', 'glacier', 'sapphire', 'forage', 'ember'];
export const PIN_TYPE_IDS = ['trailhead', 'camp', 'water', 'waypoint'];
const CAT_IDS = new Set(CATEGORIES.map((c) => c.id));

/** Turn a template row into a gear item object */
export const rowToItem = ([name, cat, g, qty = 1, flags = '']) => ({
  id: uid(), name, cat, g, qty, worn: flags.includes('w'), cons: flags.includes('c'),
});

export const defaultChecklist = () =>
  CHECKLIST_GROUPS.flatMap((grp) => grp.items.map((text) => ({ id: uid(), text, group: grp.id, done: false })));

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
    meta: { created: Date.now(), gearTouched: false, setupDismissed: false },
    updated: Date.now(),
  };
}

/* ---------- Migrations: MIGRATIONS[n] upgrades data from version n to n+1 ---------- */
const MIGRATIONS = {
  // v1 -> v2: light/dark themes became colorways; added meta (setup guide state)
  1: (d) => {
    const legacy = { light: 'granite', dark: 'sapphire' };
    if (legacy[d.theme]) d.theme = legacy[d.theme];
    // Existing users already know the app — mark their gear as touched
    d.meta = { created: d.updated || Date.now(), gearTouched: true, setupDismissed: false };
    return d;
  },
};
export function migrate(raw) {
  const d = { ...raw };
  let v = Number(d.v) || 1;
  while (v < SCHEMA_VERSION) { d.v = v; MIGRATIONS[v]?.(d); v += 1; }
  return d;
}

/* ---------- Normalisation helpers ---------- */
const str = (v, max = 200) => String(v ?? '').slice(0, max);
const nonNeg = (v) => Math.max(0, Number(v) || 0);
const finite = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** Merge loaded data over defaults, coercing every field to a safe type. */
export function normalize(input) {
  const d = defaults();
  if (!input || typeof input !== 'object') return d;
  const raw = migrate(input);
  const out = { ...d };

  out.units = raw.units === 'metric' ? 'metric' : 'imperial';
  out.theme = COLORWAY_IDS.includes(raw.theme) ? raw.theme : 'auto';

  const g = obj(raw.gear);
  out.gear = {
    name: str(g.name ?? d.gear.name, 80),
    chartMode: ['base', 'pack', 'skin'].includes(g.chartMode) ? g.chartMode : 'base',
    items: Array.isArray(g.items) ? g.items.filter((i) => i && typeof i === 'object').slice(0, 1000).map((i) => ({
      id: str(i.id || uid(), 40), name: str(i.name, 80), cat: CAT_IDS.has(i.cat) ? i.cat : 'misc', g: nonNeg(i.g),
      qty: Math.round(nonNeg(i.qty)), worn: !!i.worn, cons: !!i.cons && !i.worn,
    })) : d.gear.items,
  };

  const t = obj(raw.trip);
  out.trip = {
    ...d.trip,
    name: str(t.name ?? d.trip.name, 80), start: isoDate(t.start) || (t.start === '' ? '' : d.trip.start), end: isoDate(t.end) || (t.end === '' ? '' : d.trip.end),
    from: str(t.from, 80), to: str(t.to, 80), contactName: str(t.contactName, 80), contactPhone: str(t.contactPhone, 40),
    returnBy: str(t.returnBy, 20), notes: str(t.notes, 2000),
    days: Array.isArray(t.days) ? t.days.filter((x) => x && typeof x === 'object').slice(0, 120).map((x) => ({
      id: str(x.id || uid(), 40), from: str(x.from, 80), to: str(x.to, 80), distKm: nonNeg(x.distKm), gainM: nonNeg(x.gainM), lossM: nonNeg(x.lossM),
      water: str(x.water, 200), notes: str(x.notes, 2000),
    })) : [],
    pins: Array.isArray(t.pins) ? t.pins.filter((p) => p && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180).slice(0, 300).map((p) => ({
      id: str(p.id || uid(), 40), type: PIN_TYPE_IDS.includes(p.type) ? p.type : 'waypoint', lat: Number(p.lat), lng: Number(p.lng), label: str(p.label, 60),
    })) : [],
    mapView: t.mapView && Math.abs(t.mapView.lat) <= 90 && Math.abs(t.mapView.lng) <= 360 ? { lat: +t.mapView.lat, lng: +t.mapView.lng, z: finite(t.mapView.z, 4) } : null,
  };

  const f = obj(raw.food);
  out.food = {
    days: Math.min(60, Math.max(1, Math.round(finite(f.days, d.food.days)))), distKm: nonNeg(finite(f.distKm, d.food.distKm)), gainM: nonNeg(finite(f.gainM, d.food.gainM)),
    bodyKg: Math.max(20, finite(f.bodyKg, d.food.bodyKg)), packKg: nonNeg(finite(f.packKg, d.food.packKg)), cold: !!f.cold,
    density: Math.min(250, Math.max(40, finite(f.density, d.food.density))),
  };
  const w = obj(raw.water);
  out.water = {
    distKm: nonNeg(finite(w.distKm, d.water.distKm)), paceKmh: Math.max(0.1, finite(w.paceKmh, d.water.paceKmh)),
    tempC: Math.min(55, Math.max(-50, finite(w.tempC, d.water.tempC))), gainM: nonNeg(finite(w.gainM, d.water.gainM)), dryCamp: !!w.dryCamp,
  };

  out.checklist = Array.isArray(raw.checklist)
    ? raw.checklist.filter((i) => i && typeof i === 'object' && i.text).slice(0, 300).map((i) => ({ id: str(i.id || uid(), 40), text: str(i.text, 120), group: str(i.group, 30), done: !!i.done, custom: !!i.custom }))
    : d.checklist;

  const wx = obj(raw.weather);
  out.weather = {
    loc: wx.loc && Math.abs(wx.loc.lat) <= 90 && Math.abs(wx.loc.lng) <= 180 ? { name: str(wx.loc.name, 80), lat: +wx.loc.lat, lng: +wx.loc.lng } : null,
    cache: wx.cache && typeof wx.cache === 'object' && wx.cache.data?.daily ? wx.cache : null,
  };

  const m = obj(raw.meta);
  out.meta = { created: finite(m.created, d.meta.created), gearTouched: !!m.gearTouched, setupDismissed: !!m.setupDismissed };
  out.updated = finite(raw.updated, Date.now());
  out.v = SCHEMA_VERSION;
  return out;
}
