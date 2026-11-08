// Unit tests for the pure core. Run: npm test   (Node 18+, no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gearTotals, rating, tripTotals, calcFood, calcWater, waterRate, G_PER_LB, G_PER_OZ } from '../js/core/calc.js';
import { encodeGear, decodeGear, b64url, unb64url } from '../js/core/codec.js';
import { normalize, defaults, migrate, SCHEMA_VERSION } from '../js/core/schema.js';
import { TEMPLATES } from '../js/data/templates.js';
import { rowToItem } from '../js/core/schema.js';

const item = (g, qty = 1, extra = {}) => ({ name: 'x', cat: 'misc', g, qty, ...extra });

test('gearTotals splits base / worn / consumable / pack / skin-out', () => {
  const t = gearTotals([item(1000), item(500, 2), item(300, 1, { worn: true }), item(2000, 1, { cons: true })]);
  assert.equal(t.base, 2000);
  assert.equal(t.worn, 300);
  assert.equal(t.cons, 2000);
  assert.equal(t.pack, 4000);
  assert.equal(t.skin, 4300);
  assert.equal(t.count, 5);
});

test('gearTotals tolerates junk numbers', () => {
  const t = gearTotals([item('abc'), item(100, 'two'), item(NaN)]);
  assert.equal(t.base, 0);
});

test('rating thresholds (SUL < 5 lb, UL < 10, LW < 20, Trad ≥ 20)', () => {
  assert.equal(rating(4.9 * G_PER_LB).tier, 'sul');
  assert.equal(rating(9.99 * G_PER_LB).tier, 'ul');
  assert.equal(rating(10 * G_PER_LB).tier, 'lw');
  assert.equal(rating(19.99 * G_PER_LB).tier, 'lw');
  assert.equal(rating(20 * G_PER_LB).tier, 'trad');
});

test('templates land in the expected weight classes', () => {
  const base = (k) => gearTotals(TEMPLATES[k].items.map(rowToItem)).base;
  assert.equal(rating(base('thru')).tier, 'ul');
  assert.equal(rating(base('weekend')).tier, 'lw');
  assert.equal(rating(base('winter')).tier, 'trad');
});

test('tripTotals sums distance and climbing', () => {
  const t = tripTotals([{ distKm: 10, gainM: 500, lossM: 100 }, { distKm: 5.5, gainM: 0, lossM: 400 }]);
  assert.deepEqual(t, { dist: 15.5, gain: 500, loss: 500, n: 2 });
});

test('calcFood is in a realistic backpacking range', () => {
  // 170 lb hiker, 25 lb pack, 15 mi, 2,500 ft gain → roughly 3,500–4,500 kcal
  const r = calcFood({ days: 3, distKm: 15 * 1.609344, gainM: 762, bodyKg: 77.1, packKg: 11.3, cold: false, density: 125 });
  assert.ok(r.perDay > 3500 && r.perDay < 4500, `perDay ${r.perDay}`);
  assert.ok(Math.abs(r.total - r.perDay * 3) < 1e-6);
  // 125 kcal/oz → food weight per day ≈ perDay / 125 oz
  assert.ok(Math.abs(r.foodG / G_PER_OZ - r.perDay / 125) < 1e-6);
  const cold = calcFood({ days: 1, distKm: 0, gainM: 0, bodyKg: 70, packKg: 0, cold: true, density: 125 });
  assert.ok(Math.abs(cold.perDay - 26 * 70 * 1.15) < 1e-6);
});

test('calcWater scales with heat and adds dry-camp water', () => {
  assert.equal(waterRate(5), 0.4);
  assert.equal(waterRate(35), 1.0);
  const r = calcWater({ distKm: 9.6, paceKmh: 3.2, gainM: 0, tempC: 30, dryCamp: true });
  assert.ok(Math.abs(r.hours - 3) < 1e-9);
  assert.ok(Math.abs(r.total - (3 * 0.85 + 0.5 + 3)) < 1e-9);
});

test('share codec round-trips a gear list', async () => {
  const gear = { name: 'Test “list” ✓', items: [
    { name: 'Tent', cat: 'big3', g: 1700, qty: 1, worn: false, cons: false },
    { name: 'Shoes', cat: 'clothing', g: 650.25, qty: 1, worn: true, cons: false },
    { name: 'Food', cat: 'food', g: 1600, qty: 2, worn: false, cons: true },
  ] };
  const code = await encodeGear(gear);
  assert.match(code, /^[zj][A-Za-z0-9_-]+$/);
  const back = await decodeGear(code);
  assert.equal(back.name, gear.name);
  assert.deepEqual(back.items.map(({ id, ...r }) => r), gear.items.map((i) => ({ ...i, g: Math.round(i.g * 10) / 10 })));
});

test('share codec rejects garbage', async () => {
  await assert.rejects(decodeGear('x123'));
  await assert.rejects(decodeGear('j!!!!'));
  await assert.rejects(decodeGear('j' + b64url(new TextEncoder().encode('{"nope":1}'))));
  assert.deepEqual([...unb64url(b64url(new Uint8Array([0, 255, 128])))], [0, 255, 128]);
});

test('normalize() returns defaults for missing / broken input', () => {
  for (const bad of [null, undefined, 42, 'str', []]) {
    const n = normalize(bad);
    assert.equal(n.v, SCHEMA_VERSION);
    assert.ok(Array.isArray(n.gear.items));
  }
});

test('normalize() coerces hostile data to safe shapes', () => {
  const n = normalize({ v: 2, units: 'furlongs', theme: 'neon', gear: { items: [{ name: 5, g: -10, qty: 'x', cat: 'nope', worn: 1, cons: 1 }, null, 'x'] },
    trip: { start: 'tomorrow', pins: [{ lat: 999, lng: 0 }, { lat: 45, lng: -110, type: 'bogus' }], days: [{ distKm: -5 }] }, food: { days: 9999, bodyKg: 'heavy' } });
  assert.equal(n.units, 'imperial');
  assert.equal(n.theme, 'auto');
  assert.equal(n.gear.items.length, 1);
  assert.deepEqual({ ...n.gear.items[0], id: '' }, { id: '', name: '5', cat: 'misc', g: 0, qty: 0, worn: true, cons: false });
  assert.equal(n.trip.pins.length, 1);
  assert.equal(n.trip.pins[0].type, 'waypoint');
  assert.equal(n.trip.days[0].distKm, 0);
  assert.match(n.trip.start, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(n.food.days, 60);
  assert.equal(n.food.bodyKg, defaults().food.bodyKg);
});

test('migrate() upgrades v1 data (light/dark → colorways, adds meta)', () => {
  const m = migrate({ v: 1, theme: 'dark', updated: 123 });
  assert.equal(m.theme, 'sapphire');
  assert.equal(m.meta.gearTouched, true);
  assert.equal(normalize({ v: 1, theme: 'light' }).theme, 'granite');
  assert.equal(normalize({ theme: 'dark' }).v, SCHEMA_VERSION);
});
