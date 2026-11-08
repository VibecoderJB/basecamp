// MODULE 07 — Save & Share: JSON export/import, shareable gear links, CSV, printable trail card.
import { state, save, replaceState, defaults, STORAGE_KEY, rowToItem } from './store.js';
import { $, esc, icon, toast, download, modal, confirmBox, todayISO, niceDate, addDaysISO, coord, uid } from './utils.js';
import { showWeight, show, unit, toD } from './units.js';
import { CATEGORIES, catById } from './data/categories.js';
import { gearTotals, rating } from './gear.js';
import { tripTotals } from './trip.js';
import { PIN_TYPES } from './map.js';

/* ---------- Share-link codec ----------
   Gear list -> compact JSON -> deflate-raw (if supported) -> base64url, in the URL hash.
   Prefix: 'z' = compressed, 'j' = plain. Nothing is sent to any server. */
const CAT_IDS = CATEGORIES.map((c) => c.id);

const b64url = (bytes) => {
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64url = (str) => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

export async function encodeGear(gear = state.gear) {
  const payload = { n: gear.name, i: gear.items.map((i) => [i.name, Math.max(0, CAT_IDS.indexOf(i.cat)), Math.round(i.g * 10) / 10, i.qty, (i.worn ? 1 : 0) | (i.cons ? 2 : 0)]) };
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  if ('CompressionStream' in window) {
    try { return 'z' + b64url(await pipe(raw, new CompressionStream('deflate-raw'))); } catch { /* fall through */ }
  }
  return 'j' + b64url(raw);
}

export async function decodeGear(code) {
  const kind = code[0], bytes = unb64url(code.slice(1));
  let json;
  if (kind === 'z') json = new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')));
  else if (kind === 'j') json = new TextDecoder().decode(bytes);
  else throw new Error('Unknown share format');
  const p = JSON.parse(json);
  if (!Array.isArray(p.i)) throw new Error('Bad payload');
  return {
    name: String(p.n || 'Shared list').slice(0, 80),
    items: p.i.slice(0, 500).map(([name, c, g, qty, f]) => ({
      id: uid(), name: String(name ?? '').slice(0, 80), cat: CAT_IDS[c] || 'misc', g: Math.max(0, Number(g) || 0),
      qty: Math.max(0, Math.round(Number(qty) || 0)), worn: !!(f & 1), cons: !!(f & 2),
    })),
  };
}

/** Handle #/share/<code>: preview, then replace or merge. */
export async function handleShare(code) {
  let gear;
  try { gear = await decodeGear(code); } catch { toast('That share link is damaged or incomplete.'); location.hash = '#/gear'; return; }
  const t = gearTotals(gear.items);
  const choice = await modal({
    title: 'Shared gear list',
    html: `<p><strong>${esc(gear.name)}</strong></p>
      <table class="spec"><tbody>
        <tr><th scope="row">Items</th><td class="num">${gear.items.length}</td></tr>
        <tr><th scope="row">Base weight</th><td class="num">${showWeight(t.base)}</td></tr>
        <tr><th scope="row">Total pack</th><td class="num">${showWeight(t.pack)}</td></tr>
      </tbody></table>
      <p class="help mt">Replace your current list, or add these items to it.</p>`,
    buttons: [{ label: 'Cancel', value: 'cancel' }, { label: 'Add to mine', value: 'merge' }, { label: 'Replace mine', value: 'replace', primary: true }],
  });
  if (choice === 'replace') { state.gear.name = gear.name; state.gear.items = gear.items; save('all'); toast(`Loaded "${gear.name}"`); }
  if (choice === 'merge') { state.gear.items.push(...gear.items); save('all'); toast(`Added ${gear.items.length} items`); }
  history.replaceState(null, '', location.pathname + location.search + '#/gear');
  dispatchEvent(new HashChangeEvent('hashchange'));
}

/* ---------- Save & Share view ---------- */
export function render(el) {
  const bytes = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
  el.innerHTML = `
  <header class="view-head">
    <span class="kicker">Module 07 · Cache</span>
    <h1 id="h-data">Save &amp; Share</h1>
    <p>Everything auto-saves to this browser — no account, nothing uploaded. Back up to a file, move between devices, or share a gear list as a link.</p>
  </header>
  <div class="grid">
    <section class="card span-6">
      <div class="card-head"><h2>Share gear list</h2><span class="label">Link</span></div>
      <p class="help">The whole list is encoded <em>inside</em> the link — anyone who opens it can load a copy. No server involved.</p>
      <div class="row mt" style="flex-wrap:nowrap">
        <label class="sr-only" for="share-url">Share link</label>
        <input class="input" id="share-url" readonly value="Generating…">
        <button class="btn btn--primary" type="button" id="share-copy">${icon('link')} Copy</button>
      </div>
      <p class="readout mt" id="share-meta"></p>
      ${navigator.share ? `<button class="btn btn--sm mt" type="button" id="share-native">${icon('share')} Share…</button>` : ''}
    </section>

    <section class="card span-6">
      <div class="card-head"><h2>Trail card</h2><span class="label">Print</span></div>
      <p class="help">A printable one-pager with your itinerary, pins, emergency contact and a tick-box gear list. Leave a copy with your trip contact.</p>
      <div class="btn-row mt">
        <a class="btn btn--signal" href="#/print">${icon('print')} Open trail card</a>
        <button class="btn" type="button" id="csv">${icon('down')} Gear CSV</button>
      </div>
    </section>

    <section class="card span-6">
      <div class="card-head"><h2>Backup file</h2><span class="label">JSON</span></div>
      <p class="help">Export everything (gear, trip, pins, checklists, calculators) to a file. Import it on another device or browser.</p>
      <div class="btn-row mt">
        <button class="btn btn--primary" type="button" id="export">${icon('down')} Export JSON</button>
        <label class="btn" for="import-file">${icon('up')} Import JSON</label>
        <input type="file" id="import-file" accept="application/json,.json" class="sr-only">
      </div>
    </section>

    <section class="card span-6">
      <div class="card-head"><h2>On this device</h2><span class="label">localStorage</span></div>
      <table class="spec"><tbody>
        <tr><th scope="row">Stored</th><td class="num">${(bytes / 1024).toFixed(1)} KB</td></tr>
        <tr><th scope="row">Last change</th><td class="num">${new Date(state.updated).toLocaleString()}</td></tr>
        <tr><th scope="row">Gear items</th><td class="num">${state.gear.items.length}</td></tr>
        <tr><th scope="row">Trip days / pins</th><td class="num">${state.trip.days.length} / ${state.trip.pins.length}</td></tr>
      </tbody></table>
      <button class="btn btn--sm btn--ghost btn--danger mt" type="button" id="reset">${icon('x')} Erase all data</button>
      <p class="help mt">Clearing your browser's site data also erases BASECAMP data — export a backup first.</p>
    </section>
  </div>`;

  encodeGear().then((code) => {
    const url = `${location.origin}${location.pathname}#/share/${code}`;
    const input = $('#share-url', el); if (!input) return;
    input.value = url;
    $('#share-meta', el).textContent = `${state.gear.items.length} ITEMS · ${url.length.toLocaleString()} CHARS${url.length > 8000 ? ' · LONG LINK — SOME APPS MAY TRUNCATE' : ''}`;
  });

  $('#share-copy', el).addEventListener('click', async () => {
    const input = $('#share-url', el);
    try { await navigator.clipboard.writeText(input.value); toast('Link copied'); }
    catch { input.select(); toast('Select-all done — copy with your keyboard or long-press'); }
  });
  $('#share-native', el)?.addEventListener('click', () => navigator.share({ title: `BASECAMP — ${state.gear.name}`, url: $('#share-url', el).value }).catch(() => {}));

  $('#export', el).addEventListener('click', () => {
    const data = { ...state, weather: { loc: state.weather.loc, cache: null } };
    download(`basecamp-backup-${todayISO()}.json`, JSON.stringify({ app: 'basecamp', exported: new Date().toISOString(), data }, null, 2));
    toast('Backup downloaded');
  });

  $('#import-file', el).addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    try {
      if (file.size > 5e6) throw new Error('File too large');
      const json = JSON.parse(await file.text());
      const data = json.app === 'basecamp' ? json.data : json;
      if (!data || typeof data !== 'object' || !(data.gear || data.trip)) throw new Error('Not a BASECAMP backup');
      if (!(await confirmBox('Import backup?', `<p>This replaces all data on this device with <strong>${esc(file.name)}</strong>.</p>`, 'Import'))) return;
      replaceState(data); toast('Backup imported');
    } catch (err) { toast(`Import failed: ${err.message}`); }
  });

  $('#csv', el).addEventListener('click', () => {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['Name', 'Category', 'Weight (g)', 'Weight (oz)', 'Qty', 'Worn', 'Consumable']]
      .concat(state.gear.items.map((i) => [i.name, catById[i.cat]?.name || 'Misc', i.g.toFixed(1), (i.g / 28.3495).toFixed(2), i.qty, i.worn ? 'yes' : '', i.cons ? 'yes' : '']));
    download(`${state.gear.name.replace(/[^\w-]+/g, '-').toLowerCase() || 'gear'}.csv`, rows.map((r) => r.map(q).join(',')).join('\n'), 'text/csv');
  });

  $('#reset', el).addEventListener('click', async () => {
    if (!(await confirmBox('Erase everything?', '<p>All gear, trips, pins, checklists and settings on this device will be deleted and reset to defaults. This cannot be undone.</p>', 'Erase all', true))) return;
    replaceState(defaults()); toast('All data erased');
  });
}

/* ---------- Printable trail card (#/print) ---------- */
export function renderPrint(el) {
  const t = state.trip, g = gearTotals(), r = rating(g.base), tt = tripTotals();
  const th = t.pins.find((p) => p.type === 'trailhead') || t.pins[0];
  el.innerHTML = `
  <div class="row between no-print" style="margin-bottom:14px">
    <a class="btn btn--sm" href="#/data">← Back</a>
    <button class="btn btn--primary" type="button" id="do-print">${icon('print')} Print / Save PDF</button>
  </div>
  <article class="trail-card" aria-labelledby="h-print">
    <div class="row between"><span>BASECAMP · TRAIL CARD</span><span>${th ? coord(th.lat, th.lng, 4) : ''}</span></div>
    <h1 id="h-print">${esc(t.name || 'Trip')}</h1>
    <p>${esc(niceDate(t.start, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }))} → ${esc(niceDate(t.end, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }))}
      · ${esc(t.from || '—')} → ${esc(t.to || '—')}</p>

    <div class="tc-cols">
      <section>
        <h2>Emergency / trip plan</h2>
        <table class="spec"><tbody>
          <tr><th scope="row">Contact</th><td>${esc(t.contactName || '________________')}</td></tr>
          <tr><th scope="row">Phone</th><td>${esc(t.contactPhone || '________________')}</td></tr>
          <tr><th scope="row">Raise alarm if not back by</th><td><strong>${t.returnBy ? esc(new Date(t.returnBy).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })) : '________________'}</strong></td></tr>
          <tr><th scope="row">Notes</th><td>${esc(t.notes || '—')}</td></tr>
        </tbody></table>
      </section>
      <section>
        <h2>Pack</h2>
        <table class="spec"><tbody>
          <tr><th scope="row">Base</th><td class="num">${showWeight(g.base)}</td></tr>
          <tr><th scope="row">Consumables</th><td class="num">${showWeight(g.cons)}</td></tr>
          <tr><th scope="row">Total pack</th><td class="num"><strong>${showWeight(g.pack)}</strong></td></tr>
          <tr><th scope="row">Worn</th><td class="num">${showWeight(g.worn)}</td></tr>
          <tr><th scope="row">Class</th><td class="num">${r.name}</td></tr>
        </tbody></table>
      </section>
    </div>

    <h2>Itinerary · ${show('dist', tt.dist)} · +${show('elev', tt.gain)} / −${show('elev', tt.loss)}</h2>
    ${t.days.length ? `<table class="spec"><thead><tr><th>Day</th><th>Route</th><th class="num">${unit('dist')}</th><th class="num">+/− ${unit('elev')}</th><th>Water / notes</th></tr></thead><tbody>
      ${t.days.map((d, i) => `<tr><td class="nowrap">${i + 1} · ${esc(niceDate(t.start ? addDaysISO(t.start, i) : '', { month: 'short', day: 'numeric' }))}</td>
        <td>${esc(d.from || '—')} → ${esc(d.to || '—')}</td><td class="num">${toD('dist', d.distKm || 0).toFixed(1)}</td>
        <td class="num nowrap">+${Math.round(toD('elev', d.gainM || 0))} / −${Math.round(toD('elev', d.lossM || 0))}</td>
        <td>${esc([d.water, d.notes].filter(Boolean).join(' · '))}</td></tr>`).join('')}
    </tbody></table>` : '<p>No itinerary days entered.</p>'}

    ${t.pins.length ? `<h2>Waypoints</h2><table class="spec"><thead><tr><th>Type</th><th>Label</th><th>Lat, Lng</th></tr></thead><tbody>
      ${t.pins.map((p) => `<tr><td>${PIN_TYPES[p.type]?.name || 'Pin'}</td><td>${esc(p.label)}</td><td>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</td></tr>`).join('')}
    </tbody></table>` : ''}

    <h2>Gear · ${esc(state.gear.name)}</h2>
    <div class="tc-cols">
      ${CATEGORIES.map((c) => {
        const items = state.gear.items.filter((i) => i.cat === c.id); if (!items.length) return '';
        return `<table class="spec"><thead><tr><th colspan="2">${esc(c.name)}</th><th class="num">${showWeight(items.reduce((s, i) => s + i.g * i.qty, 0), { compact: true })}</th></tr></thead><tbody>
          ${items.map((i) => `<tr><td style="width:18px"><span class="box"></span></td><td>${esc(i.name)}${i.qty > 1 ? ` ×${i.qty}` : ''}${i.worn ? ' (worn)' : ''}${i.cons ? ' (cons.)' : ''}</td><td class="num nowrap">${showWeight(i.g * i.qty, { compact: true })}</td></tr>`).join('')}
        </tbody></table>`;
      }).join('')}
    </div>
    <p style="margin-top:14px;border-top:2px dashed #111;padding-top:8px">✂ Leave a copy with someone you trust. Printed ${new Date().toLocaleDateString()} · basecamp field kit</p>
  </article>`;
  $('#do-print', el).addEventListener('click', () => window.print());
}
