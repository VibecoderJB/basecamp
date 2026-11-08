// MODULE 04 — Food & Water calculator. Estimates only: individual needs vary widely.
import { state, save } from './store.js';
import { $, num, fmt } from './utils.js';
import { unit, inputVal, fromD, show, isImp, G_PER_OZ } from './units.js';
import { gearTotals } from './gear.js';
import { calcFood, calcWater } from './core/calc.js';
import { tip } from './ui/tips.js';

// Models are in core/calc.js (documented + unit-tested there).
export { calcFood, calcWater };

let root;

export function render(el) {
  root = el;
  const f = state.food, w = state.water;
  const densUnit = isImp() ? 'kcal/oz' : 'kcal/100 g';
  const densVal = isImp() ? f.density : Math.round(f.density / G_PER_OZ * 100);
  el.innerHTML = `
  <header class="view-head">
    <span class="kicker">Module 04 · Fuel</span>
    <h1 id="h-food">Food &amp; Water</h1>
    <p>Rough-but-useful estimates for how many calories to pack and how much water to carry between sources. Adjust to how your body actually runs.</p>
  </header>
  <div class="grid">
    <section class="card span-6" aria-labelledby="h-cal">
      <div class="card-head"><h2 id="h-cal">Calories &amp; Food Weight</h2><span class="label">Per person</span></div>
      <form class="form-grid" id="food-form" onsubmit="return false">
        <label class="field"><span>Trip days</span><input class="input" type="number" min="1" max="60" step="1" name="days" value="${f.days}"></label>
        <label class="field"><span>Distance / day (${unit('dist')})</span><input class="input" type="number" min="0" step="any" name="distKm" value="${inputVal('dist', f.distKm)}"></label>
        <label class="field"><span>Gain / day (${unit('elev')})</span><input class="input" type="number" min="0" step="any" name="gainM" value="${inputVal('elev', f.gainM)}"></label>
        <label class="field"><span>Body weight (${unit('body')})</span><input class="input" type="number" min="20" step="any" name="bodyKg" value="${inputVal('body', f.bodyKg)}"></label>
        <label class="field"><span>Pack weight (${unit('mass') === 'lb' ? 'lb' : 'kg'})</span><input class="input" type="number" min="0" step="any" name="packKg" value="${inputVal('body', f.packKg, 1)}"></label>
        <label class="field"><span>Food density (${densUnit}) ${tip('density')}</span><input class="input" type="number" min="${isImp() ? 60 : 200}" max="${isImp() ? 200 : 700}" step="any" name="density" value="${densVal}"></label>
        <div class="wide row between">
          <label class="check"><input type="checkbox" name="cold" ${f.cold ? 'checked' : ''}> Cold conditions (below freezing)</label>
          <button type="button" class="btn btn--sm" id="use-gear">Use my pack weight</button>
        </div>
      </form>
      <hr class="cut">
      <div id="food-out" aria-live="polite"></div>
    </section>

    <section class="card span-6" aria-labelledby="h-water">
      <div class="card-head"><h2 id="h-water">Water Carry</h2><span class="label">Between sources</span></div>
      <form class="form-grid" id="water-form" onsubmit="return false">
        <label class="field"><span>Distance to next source (${unit('dist')})</span><input class="input" type="number" min="0" step="any" name="distKm" value="${inputVal('dist', w.distKm)}"></label>
        <label class="field"><span>Your pace (${unit('pace')})</span><input class="input" type="number" min="0.5" step="any" name="paceKmh" value="${inputVal('pace', w.paceKmh)}"></label>
        <label class="field"><span>Climb in that stretch (${unit('elev')})</span><input class="input" type="number" min="0" step="any" name="gainM" value="${inputVal('elev', w.gainM)}"></label>
        <label class="field"><span>Daytime high (${unit('temp')})</span><input class="input" type="number" step="any" name="tempC" value="${inputVal('temp', w.tempC)}"></label>
        <label class="check wide"><input type="checkbox" name="dryCamp" ${w.dryCamp ? 'checked' : ''}> Dry camp tonight (cook + overnight + morning)</label> ${tip('dry')}
      </form>
      <hr class="cut">
      <div id="water-out" aria-live="polite"></div>
    </section>
  </div>
  <div class="callout mt"><strong>Estimates, not prescriptions</strong>
    Energy and fluid needs vary with fitness, sex, age, altitude, humidity and pace. Drink to thirst plus a margin, watch urine colour (pale yellow is good), and eat early and often. Carry more water than the math says on unfamiliar or exposed routes, and never rely on a single unverified source.</div>`;

  $('#food-form', root).addEventListener('input', onFood);
  $('#water-form', root).addEventListener('input', onWater);
  $('#use-gear', root).addEventListener('click', () => {
    state.food.packKg = gearTotals().pack / 1000; save('food');
    $('#food-form [name="packKg"]', root).value = inputVal('body', state.food.packKg, 1);
    renderFood();
  });
  renderFood(); renderWater();
}

function onFood(e) {
  const t = e.target, f = state.food, v = num(t.value);
  const map = {
    days: () => Math.max(1, Math.round(v)), distKm: () => fromD('dist', v), gainM: () => fromD('elev', v),
    bodyKg: () => fromD('body', v), packKg: () => fromD('body', v), density: () => (isImp() ? v : v / 100 * G_PER_OZ),
    cold: () => t.checked,
  };
  if (map[t.name]) { f[t.name] = map[t.name](); save('food'); renderFood(); }
}
function onWater(e) {
  const t = e.target, w = state.water, v = num(t.value);
  const map = { distKm: () => fromD('dist', v), paceKmh: () => Math.max(0.1, fromD('pace', v)), gainM: () => fromD('elev', v), tempC: () => fromD('temp', v), dryCamp: () => t.checked };
  if (map[t.name]) { w[t.name] = map[t.name](); save('water'); renderWater(); }
}

const r50 = (n) => Math.round(n / 50) * 50;

function renderFood() {
  const f = state.food, r = calcFood(f);
  const lbOrKg = (g) => show('mass', g);
  $('#food-out', root).innerHTML = `
    <div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <div class="stat stat--hl"><span class="label">Calories / day ${tip('kcal')}</span><span class="stat-value">${fmt(r50(r.perDay))}<small>kcal</small></span>
        <span class="readout">Range ${fmt(r50(r.perDay * 0.9))}–${fmt(r50(r.perDay * 1.1))}</span></div>
      <div class="stat"><span class="label">Food / day</span><span class="stat-value">${lbOrKg(r.foodG)}</span>
        <span class="readout">${fmt(r.perDay / 1000 * 4.184, 1)} MJ</span></div>
      <div class="stat"><span class="label">Trip total</span><span class="stat-value">${fmt(r50(r.total))}<small>kcal</small></span></div>
      <div class="stat"><span class="label">Food to carry</span><span class="stat-value">${lbOrKg(r.foodTotalG)}</span>
        <span class="readout">${f.days} day${f.days > 1 ? 's' : ''}</span></div>
    </div>
    <table class="spec mt"><caption class="sr-only">Daily calorie breakdown</caption>
      <tbody>
        <tr><th scope="row">Baseline (rest + camp)</th><td class="num">${fmt(r50(r.baseline))} kcal</td></tr>
        <tr><th scope="row">Walking (${show('dist', f.distKm)})</th><td class="num">${fmt(r50(r.walking))} kcal</td></tr>
        <tr><th scope="row">Climbing (+${show('elev', f.gainM)})</th><td class="num">${fmt(r50(r.climbing))} kcal</td></tr>
        ${f.cold ? `<tr><th scope="row">Cold factor</th><td class="num">+15%</td></tr>` : ''}
      </tbody>
      <tfoot><tr><td>Per day</td><td class="num">${fmt(r50(r.perDay))} kcal</td></tr></tfoot>
    </table>
    <p class="help mt"><strong>Packing tips:</strong> aim for ~${isImp() ? '120–130 kcal/oz' : '420–460 kcal/100 g'} by leaning on nuts, nut butters, olive oil, chocolate and dried meals. A rough split of ~50% carbs, ~30–35% fat and ~15–20% protein works for most people. Many hikers can't eat a full ration the first day or two — but don't under-pack on long trips.</p>`;
}

function renderWater() {
  const w = state.water, r = calcWater(w);
  const lw = (L) => (isImp() ? `${fmt(L * 2.20462, 1)} lb` : `${fmt(L, 1)} kg`);
  $('#water-out', root).innerHTML = `
    <div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <div class="stat stat--hl"><span class="label">Carry ${tip('carry')}</span><span class="stat-value">${fmt(r.total, 1)}<small>L</small></span>
        <span class="readout">${isImp() ? fmt(r.total * 33.814, 0) + ' fl oz · ' : ''}${lw(r.total)}</span></div>
      <div class="stat"><span class="label">Time to source</span><span class="stat-value">${Math.floor(r.hours)}<small>h</small> ${Math.round(r.hours % 1 * 60)}<small>m</small></span>
        <span class="readout">@ ${fmt(r.rate, 2)} L/h</span></div>
    </div>
    <table class="spec mt"><caption class="sr-only">Water breakdown</caption><tbody>
      <tr><th scope="row">Drinking on the move</th><td class="num">${fmt(r.drink, 1)} L</td></tr>
      <tr><th scope="row">Safety reserve</th><td class="num">${fmt(r.reserve, 1)} L</td></tr>
      ${r.camp ? `<tr><th scope="row">Dry camp (dinner, night, breakfast)</th><td class="num">${fmt(r.camp, 1)} L</td></tr>` : ''}
    </tbody><tfoot><tr><td>Total to carry</td><td class="num">${fmt(r.total, 1)} L</td></tr></tfoot></table>
    <p class="help mt"><strong>Tip:</strong> "camel up" — drink ~0.5 L at the source before you leave. Typical needs run ~0.5 L/h in mild weather and up to ~1 L/h in heat or on big climbs. Water weighs ${isImp() ? '2.2 lb per litre' : '1 kg per litre'}.</p>`;
}
