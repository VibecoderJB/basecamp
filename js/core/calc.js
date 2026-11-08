// Pure calculation core — no DOM, no storage. Imported by the views AND by
// the Node test suite (tests/core.test.mjs). All inputs/outputs are metric.

export const G_PER_OZ = 28.349523125;
export const G_PER_LB = 453.59237;
export const KM_PER_MI = 1.609344;
export const M_PER_FT = 0.3048;

/* ---------- Gear ---------- */
/**
 * Totals for a gear list.
 * base = carried, not worn, not consumable · pack = base + consumables · skin = pack + worn
 * byCat[catId] = { base, pack, skin } grams
 */
export function gearTotals(items = []) {
  const t = { base: 0, worn: 0, cons: 0, pack: 0, skin: 0, count: 0, byCat: {} };
  for (const i of items) {
    const qty = Number(i.qty) || 0;
    const w = (Number(i.g) || 0) * qty;
    t.count += qty;
    if (i.worn) t.worn += w; else if (i.cons) t.cons += w; else t.base += w;
    const bucket = (t.byCat[i.cat] ||= { base: 0, pack: 0, skin: 0 });
    if (!i.worn && !i.cons) bucket.base += w;
    if (!i.worn) bucket.pack += w;
    bucket.skin += w;
  }
  t.pack = t.base + t.cons;
  t.skin = t.pack + t.worn;
  return t;
}

/** Base-weight class. Common community thresholds: SUL < 5 lb, UL < 10 lb, LW 10–20 lb, Traditional ≥ 20 lb. */
export function rating(baseG) {
  const lb = baseG / G_PER_LB;
  if (lb < 5) return { tier: 'sul', name: 'Super Ultralight', idx: 0, note: 'Under 5 lb base. Minimal margin. Make sure safety gear made the cut.' };
  if (lb < 10) return { tier: 'ul', name: 'Ultralight', idx: 0, note: 'Under 10 lb base. Fast and light — double-check your 10 Essentials.' };
  if (lb < 20) return { tier: 'lw', name: 'Lightweight', idx: 1, note: '10–20 lb base. A comfortable, capable kit for most trips.' };
  return { tier: 'trad', name: 'Traditional', idx: 2, note: 'Over 20 lb base. Normal for winter or group gear — the Big 3 is the fastest place to cut weight.' };
}

/* ---------- Trip ---------- */
export const tripTotals = (days = []) => ({
  dist: days.reduce((s, d) => s + (Number(d.distKm) || 0), 0),
  gain: days.reduce((s, d) => s + (Number(d.gainM) || 0), 0),
  loss: days.reduce((s, d) => s + (Number(d.lossM) || 0), 0),
  n: days.length,
});

/* ---------- Food ----------
   Daily energy = baseline (resting + camp life) + walking + climbing, × cold factor.
   - Baseline ≈ 26 kcal per kg body mass per day (≈ BMR × 1.2).
   - Walking on trail ≈ 0.63 kcal per kg (body + pack) per km (net walking cost ×1.15 for uneven terrain).
   - Climbing ≈ 0.0094 kcal per kg per metre gained (mgh at ~25% muscular efficiency).
   - Cold (below freezing) adds ~15%.
   f.density is kcal per OUNCE of food. */
export function calcFood(f) {
  const load = f.bodyKg + f.packKg;
  const baseline = 26 * f.bodyKg;
  const walking = 0.63 * load * f.distKm;
  const climbing = 0.0094 * load * f.gainM;
  const perDay = (baseline + walking + climbing) * (f.cold ? 1.15 : 1);
  const kcalPer100g = (f.density / G_PER_OZ) * 100;
  const foodG = (perDay / kcalPer100g) * 100;
  return { baseline, walking, climbing, perDay, total: perDay * f.days, foodG, foodTotalG: foodG * f.days };
}

/* ---------- Water ----------
   Litres/hour scale with temperature; time = distance/pace + ~1 h per 600 m climbed
   (Naismith-style). Reserve 0.5 L; dry camp adds 3 L (dinner, night, breakfast). */
export function waterRate(tempC) {
  return tempC <= 10 ? 0.4 : tempC <= 21 ? 0.5 : tempC <= 27 ? 0.65 : tempC <= 32 ? 0.85 : 1.0;
}
export function calcWater(w) {
  const rate = waterRate(w.tempC);
  const hours = (w.paceKmh > 0 ? w.distKm / w.paceKmh : 0) + w.gainM / 600;
  const drink = hours * rate;
  const reserve = 0.5;
  const camp = w.dryCamp ? 3 : 0;
  return { rate, hours, drink, reserve, camp, total: drink + reserve + camp };
}
