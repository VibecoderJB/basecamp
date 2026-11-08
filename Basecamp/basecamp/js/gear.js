// MODULE 01 — Gear List Builder + Pack Weight Calculator
import { state, save, rowToItem } from './store.js';
import { $, $$, esc, uid, num, icon, toast, confirmBox } from './utils.js';
import { unit, inputVal, fromD, showWeight, G_PER_LB } from './units.js';
import { CATEGORIES, catById } from './data/categories.js';
import { TEMPLATES } from './data/templates.js';
import { donut } from './chart.js';

/* ---------- Pure calculations (also used by home, print, food) ---------- */
export function gearTotals(items = state.gear.items) {
  const t = { base: 0, worn: 0, cons: 0, pack: 0, skin: 0, count: 0, byCat: {} };
  for (const i of items) {
    const w = (Number(i.g) || 0) * (Number(i.qty) || 0);
    t.count += Number(i.qty) || 0;
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

/** Base-weight class. Common community thresholds: UL < 10 lb, LW 10–20 lb, Traditional > 20 lb. */
export function rating(baseG) {
  const lb = baseG / G_PER_LB;
  if (lb < 5) return { tier: 'sul', name: 'Super Ultralight', idx: 0, note: 'Under 5 lb base. Minimal margin. Make sure safety gear made the cut.' };
  if (lb < 10) return { tier: 'ul', name: 'Ultralight', idx: 0, note: 'Under 10 lb base. Fast and light — double-check your 10 Essentials.' };
  if (lb < 20) return { tier: 'lw', name: 'Lightweight', idx: 1, note: '10–20 lb base. A comfortable, capable kit for most trips.' };
  return { tier: 'trad', name: 'Traditional', idx: 2, note: 'Over 20 lb base. Normal for winter or group gear — the Big 3 is the fastest place to cut weight.' };
}

/* ---------- Rendering ---------- */
let root;
let collapsed = new Set();

export function render(el) {
  root = el;
  const u = unit('gear');
  el.innerHTML = `
  <header class="view-head">
    <span class="kicker">Module 01 · Pack</span>
    <h1 id="h-gear">Gear List</h1>
    <p>Build your kit, flag what you wear and what you eat or drink, and watch your base weight drop. Weights are per item — quantity multiplies.</p>
  </header>

  <div class="stats" id="gear-stats" aria-live="polite"></div>

  <div class="grid mt">
    <div class="span-8 stack">
      <div class="card">
        <div class="form-grid">
          <label class="field wide"><span>List name</span>
            <input class="input" id="gear-name" value="${esc(state.gear.name)}" maxlength="80"></label>
        </div>
        <hr class="cut">
        <form id="gear-add" class="gear-add" autocomplete="off">
          <label class="field wide"><span>Item</span><input class="input" name="name" required placeholder="e.g. Rain jacket" maxlength="80"></label>
          <label class="field"><span>Category</span><select class="select" name="cat">${CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
          <label class="field"><span>Weight (${u})</span><input class="input" name="w" type="number" inputmode="decimal" min="0" step="any" required placeholder="0"></label>
          <label class="field"><span>Qty</span><input class="input" name="qty" type="number" inputmode="numeric" min="1" step="1" value="1"></label>
          <button class="btn btn--primary" type="submit">${icon('plus')} Add</button>
          <div class="row wide" style="grid-column:1/-1">
            <label class="check"><input type="checkbox" name="worn"> Worn / carried</label>
            <label class="check"><input type="checkbox" name="cons"> Consumable</label>
          </div>
        </form>
      </div>

      <div class="gear-toolbar">
        <div class="row">
          <span class="label">Sort</span>
          <button class="btn btn--sm" type="button" data-sort="heavy">Heaviest</button>
          <button class="btn btn--sm" type="button" data-sort="az">A–Z</button>
        </div>
        <div class="seg" role="group" aria-label="Weight unit">
          <button type="button" data-units="imperial" aria-pressed="${u === 'oz'}">oz / lb</button>
          <button type="button" data-units="metric" aria-pressed="${u === 'g'}">g / kg</button>
        </div>
      </div>
      <div id="gear-list"></div>
    </div>

    <aside class="span-4 stack" aria-label="Pack summary">
      <div class="card"><div class="card-head"><h2>Pack Class</h2><span class="label">By base wt</span></div><div id="gear-rating"></div></div>
      <div class="card">
        <div class="card-head"><h2>Breakdown</h2>
          <div class="seg" role="group" aria-label="Chart weight type">
            ${[['base', 'Base'], ['pack', 'Pack'], ['skin', 'Skin-out']].map(([k, l]) => `<button type="button" data-chart="${k}" aria-pressed="${state.gear.chartMode === k}">${l}</button>`).join('')}
          </div>
        </div>
        <div id="gear-chart"></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Starter Templates</h2><span class="label">Replaces list</span></div>
        <div class="stack">
          ${Object.entries(TEMPLATES).map(([k, t]) => `
            <div class="row between"><div><strong>${esc(t.name)}</strong><p class="help">${esc(t.blurb)}</p></div>
            <button class="btn btn--sm" type="button" data-template="${k}">Load</button></div>`).join('<hr class="cut" style="margin:6px 0">')}
          <button class="btn btn--sm btn--ghost btn--danger" type="button" data-clear>${icon('x')} Clear list</button>
        </div>
      </div>
    </aside>
  </div>`;

  renderList();
  renderSummary();
  $('#gear-name', root).addEventListener('input', (e) => { state.gear.name = e.target.value; save('gear'); });
  $('#gear-add', root).addEventListener('submit', onAdd);
  if (!el.dataset.bound) { bindRoot(); el.dataset.bound = '1'; }
}

function itemRow(i) {
  const u = unit('gear');
  return `<div class="gear-row" data-id="${i.id}">
    <label class="g-name"><span class="sr-only">Item name</span><input class="input" data-f="name" value="${esc(i.name)}" maxlength="80"></label>
    <label class="g-cat"><span class="sr-only">Category for ${esc(i.name)}</span>
      <select class="select" data-f="cat">${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === i.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="g-wt suffix" data-unit="${u}"><span class="sr-only">Weight each, ${u}</span>
      <input class="input" data-f="w" type="number" inputmode="decimal" min="0" step="any" value="${inputVal('gear', i.g)}"></label>
    <label class="g-qty suffix" data-unit="×"><span class="sr-only">Quantity</span>
      <input class="input" data-f="qty" type="number" inputmode="numeric" min="0" step="1" value="${i.qty}"></label>
    <div class="g-flags">
      <label class="flag flag--worn" title="Worn or carried — excluded from base weight"><input type="checkbox" data-f="worn" ${i.worn ? 'checked' : ''}>Worn</label>
      <label class="flag flag--cons" title="Consumable (food, water, fuel) — excluded from base weight"><input type="checkbox" data-f="cons" ${i.cons ? 'checked' : ''}><span aria-hidden="true">Cons.</span><span class="sr-only">Consumable</span></label>
      <span class="g-line" data-line>${showWeight(i.g * i.qty)}</span>
    </div>
    <button class="btn btn--sm btn--icon btn--ghost g-del" type="button" data-del aria-label="Delete ${esc(i.name)}">${icon('x')}</button>
  </div>`;
}

function renderList() {
  const host = $('#gear-list', root);
  const items = state.gear.items;
  if (!items.length) {
    host.innerHTML = `<div class="empty">Pack's empty. Add your first item above or load a starter template.</div>`;
    return;
  }
  host.innerHTML = CATEGORIES.map((c) => {
    const list = items.filter((i) => (catById[i.cat] ? i.cat : 'misc') === c.id);
    if (!list.length) return '';
    const sub = list.reduce((s, i) => s + i.g * i.qty, 0);
    const open = !collapsed.has(c.id);
    return `<section class="gear-cat" data-cat="${c.id}" aria-label="${esc(c.name)}">
      <header>
        <span class="swatch" style="background:${c.color}" aria-hidden="true"></span>
        <h3>${esc(c.name)}</h3>
        <span class="label" data-sub>${list.length} · ${showWeight(sub)}</span>
        <button class="btn btn--sm btn--ghost btn--icon" type="button" data-collapse="${c.id}" aria-expanded="${open}" aria-label="${open ? 'Collapse' : 'Expand'} ${esc(c.name)}">${open ? '–' : '+'}</button>
      </header>
      <div ${open ? '' : 'hidden'}>${list.map(itemRow).join('')}</div>
    </section>`;
  }).join('');
}

function renderSummary() {
  const t = gearTotals();
  const r = rating(t.base);
  $('#gear-stats', root).innerHTML = `
    <div class="stat stat--hl"><span class="label">Base weight</span><span class="stat-value">${showWeight(t.base, { compact: true })}</span></div>
    <div class="stat"><span class="label">Worn</span><span class="stat-value">${showWeight(t.worn, { compact: true })}</span></div>
    <div class="stat"><span class="label">Consumables</span><span class="stat-value">${showWeight(t.cons, { compact: true })}</span></div>
    <div class="stat"><span class="label">Total pack</span><span class="stat-value">${showWeight(t.pack, { compact: true })}</span>
      <span class="readout">Skin-out ${showWeight(t.skin, { compact: true })}</span></div>`;

  $('#gear-rating', root).innerHTML = `
    <div class="rating" data-tier="${r.tier}"><div><span class="label">Class</span><div class="rating-name">${r.name}</div></div></div>
    <div class="tier-scale" aria-hidden="true">
      <span ${r.idx === 0 ? 'aria-current="true"' : ''}>UL &lt;10 lb</span>
      <span ${r.idx === 1 ? 'aria-current="true"' : ''}>LW 10–20</span>
      <span ${r.idx === 2 ? 'aria-current="true"' : ''}>Trad 20+</span>
    </div>
    <p class="help mt">${r.note}</p>
    ${bigThreeNote(t)}`;

  const mode = state.gear.chartMode || 'base';
  const segs = CATEGORIES.map((c) => ({ label: c.name, color: c.color, value: t.byCat[c.id]?.[mode] || 0 })).filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const total = segs.reduce((s, x) => s + x.value, 0);
  const label = { base: 'BASE', pack: 'PACK', skin: 'SKIN-OUT' }[mode];
  $('#gear-chart', root).innerHTML = total ? `<div class="chart-wrap">
      ${donut(segs, { center: showWeight(total, { compact: true }), sub: label, ariaLabel: `${label} weight by category: ` + segs.map((s) => `${s.label} ${Math.round(s.value / total * 100)}%`).join(', ') })}
      <ul class="legend">${segs.map((s) => `<li><span class="sw" style="background:${s.color}"></span><span>${esc(s.label)}</span><span>${showWeight(s.value, { compact: true })}</span><span class="pct">${Math.round(s.value / total * 100)}%</span></li>`).join('')}</ul>
    </div>` : `<div class="empty">No ${label.toLowerCase()} weight yet.</div>`;
}

function bigThreeNote(t) {
  const big = (t.byCat.big3?.base || 0) + (t.byCat.sleep?.base || 0);
  if (!t.base) return '';
  return `<p class="readout">Big 3 + sleep = ${Math.round(big / t.base * 100)}% of base</p>`;
}

/** Update one row's line total + its category subtotal without re-rendering (keeps focus). */
function refreshRow(rowEl, item) {
  $('[data-line]', rowEl).textContent = showWeight(item.g * item.qty);
  const sec = rowEl.closest('.gear-cat');
  const list = state.gear.items.filter((i) => i.cat === sec.dataset.cat);
  $('[data-sub]', sec).textContent = `${list.length} · ${showWeight(list.reduce((s, i) => s + i.g * i.qty, 0))}`;
}

const find = (el) => state.gear.items.find((i) => i.id === el.closest('[data-id]')?.dataset.id);

function onAdd(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = String(fd.get('name')).trim(); if (!name) return;
  const item = {
    id: uid(), name, cat: fd.get('cat'), g: Math.max(0, fromD('gear', num(fd.get('w')))),
    qty: Math.max(1, Math.round(num(fd.get('qty'), 1))), worn: !!fd.get('worn'), cons: !!fd.get('cons') && !fd.get('worn'),
  };
  state.gear.items.push(item);
  collapsed.delete(item.cat);
  e.target.reset();
  renderList(); renderSummary(); save('gear');
  toast(`Added ${name}`);
  e.target.elements.name.focus();
}

/** Delegated listeners on the persistent view root — bound once. */
function bindRoot() {

  root.addEventListener('input', (e) => {
    const f = e.target.dataset.f; if (!f || f === 'cat') return;
    const item = find(e.target); if (!item) return;
    if (f === 'name') item.name = e.target.value;
    if (f === 'w') item.g = Math.max(0, fromD('gear', num(e.target.value)));
    if (f === 'qty') item.qty = Math.max(0, Math.round(num(e.target.value)));
    if (f === 'worn') { item.worn = e.target.checked; if (item.worn) { item.cons = false; $('[data-f="cons"]', e.target.closest('.gear-row')).checked = false; } }
    if (f === 'cons') { item.cons = e.target.checked; if (item.cons) { item.worn = false; $('[data-f="worn"]', e.target.closest('.gear-row')).checked = false; } }
    refreshRow(e.target.closest('.gear-row'), item);
    renderSummary();
    save('gear');
  });

  root.addEventListener('change', (e) => {
    if (e.target.dataset.f !== 'cat') return;
    const item = find(e.target); if (!item) return;
    item.cat = e.target.value;
    renderList(); renderSummary(); save('gear');
    $(`[data-id="${item.id}"] [data-f="cat"]`, root)?.focus();
  });

  root.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-del')) {
      const item = find(t); if (!item) return;
      const idx = state.gear.items.indexOf(item);
      state.gear.items.splice(idx, 1);
      renderList(); renderSummary(); save('gear');
      toast(`Removed ${item.name}`, { action: 'Undo', onAction: () => { state.gear.items.splice(idx, 0, item); renderList(); renderSummary(); save('gear'); } });
    } else if (t.dataset.collapse) {
      const id = t.dataset.collapse; collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
      renderList(); $(`[data-collapse="${id}"]`, root)?.focus();
    } else if (t.dataset.chart) {
      state.gear.chartMode = t.dataset.chart; save('gear');
      $$('[data-chart]', root).forEach((b) => b.setAttribute('aria-pressed', b === t));
      renderSummary();
    } else if (t.dataset.sort) {
      const by = t.dataset.sort;
      state.gear.items.sort(by === 'az' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b.g * b.qty - a.g * a.qty);
      renderList(); save('gear'); toast(by === 'az' ? 'Sorted A–Z' : 'Sorted heaviest first');
    } else if (t.dataset.template) {
      const tpl = TEMPLATES[t.dataset.template];
      if (state.gear.items.length && !(await confirmBox(`Load "${tpl.name}"?`, `<p>This replaces your current list (${state.gear.items.length} items). Export first if you want to keep it.</p>`, 'Replace list'))) return;
      state.gear.name = tpl.name; state.gear.items = tpl.items.map(rowToItem);
      save('all'); toast(`Loaded ${tpl.name}`);
    } else if (t.hasAttribute('data-clear')) {
      if (!(await confirmBox('Clear the whole list?', '<p>All items will be removed. This cannot be undone (unless you exported a backup).</p>', 'Clear list', true))) return;
      state.gear.items = []; save('all');
    }
  });
}

