// Unit conversion. Everything is STORED in metric (g, km, m, °C, L, kg)
// and converted for display based on state.units ('imperial' | 'metric').
import { state } from './store.js';
import { fmt } from './utils.js';

export const G_PER_OZ = 28.349523125;
export const G_PER_LB = 453.59237;
export const KM_PER_MI = 1.609344;
export const M_PER_FT = 0.3048;

export const isImp = () => state.units !== 'metric';

/** Definitions: toDisplay(metric) / fromDisplay(display) / unit label / decimals */
const KINDS = {
  gear:  { imp: ['oz', (g) => g / G_PER_OZ, (v) => v * G_PER_OZ, 1], met: ['g', (g) => g, (v) => v, 0] },
  mass:  { imp: ['lb', (g) => g / G_PER_LB, (v) => v * G_PER_LB, 2], met: ['kg', (g) => g / 1000, (v) => v * 1000, 2] },
  body:  { imp: ['lb', (kg) => kg * 2.20462, (v) => v / 2.20462, 0], met: ['kg', (kg) => kg, (v) => v, 0] },
  dist:  { imp: ['mi', (km) => km / KM_PER_MI, (v) => v * KM_PER_MI, 1], met: ['km', (km) => km, (v) => v, 1] },
  elev:  { imp: ['ft', (m) => m / M_PER_FT, (v) => v * M_PER_FT, 0], met: ['m', (m) => m, (v) => v, 0] },
  temp:  { imp: ['°F', (c) => c * 9 / 5 + 32, (v) => (v - 32) * 5 / 9, 0], met: ['°C', (c) => c, (v) => v, 0] },
  speed: { imp: ['mph', (k) => k / KM_PER_MI, (v) => v * KM_PER_MI, 0], met: ['km/h', (k) => k, (v) => v, 0] },
  pace:  { imp: ['mph', (k) => k / KM_PER_MI, (v) => v * KM_PER_MI, 1], met: ['km/h', (k) => k, (v) => v, 1] },
  rain:  { imp: ['in', (mm) => mm / 25.4, (v) => v * 25.4, 2], met: ['mm', (mm) => mm, (v) => v, 1] },
};
const def = (kind) => KINDS[kind][isImp() ? 'imp' : 'met'];

export const unit = (kind) => def(kind)[0];
export const toD = (kind, v) => def(kind)[1](Number(v) || 0);
export const fromD = (kind, v) => def(kind)[2](Number(v) || 0);
export const decimals = (kind) => def(kind)[3];

/** Value rounded for an <input>, without separators. */
export const inputVal = (kind, v, d = decimals(kind)) => {
  const n = toD(kind, v); const r = Math.round(n * 10 ** d) / 10 ** d; return String(r);
};
/** Formatted with unit, e.g. "12.4 mi" */
export const show = (kind, v, d = decimals(kind)) => `${fmt(toD(kind, v), d)} ${unit(kind)}`;

/** Pack-weight style: lb + oz in imperial ("12 lb 4.3 oz") or kg in metric. */
export function showWeight(g, { compact = false } = {}) {
  if (!isImp()) return g >= 1000 ? `${fmt(g / 1000, 2)} kg` : `${fmt(g, 0)} g`;
  const totalOz = g / G_PER_OZ;
  if (compact || totalOz < 16) return totalOz < 16 ? `${fmt(totalOz, 1)} oz` : `${fmt(g / G_PER_LB, 2)} lb`;
  const lb = Math.floor(totalOz / 16); const oz = totalOz - lb * 16;
  return `${lb} lb ${fmt(oz, 1)} oz`;
}
