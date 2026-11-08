// Small DOM + formatting helpers shared by every module.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape text for safe interpolation into innerHTML templates. */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Short random id (not crypto-grade; fine for list keys). */
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const num = (v, fallback = 0) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : fallback; };

export function debounce(fn, ms = 250) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** Inline icon from the sprite in index.html */
export const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

/** Format a number with locale separators and fixed decimals. */
export const fmt = (n, d = 0) => (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

/** Decorative coordinate readout, e.g. "44.37°N / 85.76°W" */
export function coord(lat, lng, d = 2) {
  return `${Math.abs(lat).toFixed(d)}°${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lng).toFixed(d)}°${lng >= 0 ? 'E' : 'W'}`;
}

/** Toast notification in the aria-live region. Optional action button. */
export function toast(msg, { action, onAction, ms = 3800 } = {}) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = action;
    b.addEventListener('click', () => { onAction?.(); el.remove(); });
    el.append(b);
  }
  host.append(el);
  setTimeout(() => el.remove(), ms);
}

/** Trigger a file download from a string. */
export function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Promise-based modal using the shared <dialog>.
 * buttons: [{ label, value, primary }]. Resolves with the clicked value (or 'cancel').
 */
export function modal({ title, html = '', buttons = [{ label: 'OK', value: 'ok', primary: true }] }) {
  const dlg = $('#dialog'), form = $('#dialog-form');
  form.innerHTML = `<h2 id="dialog-title">${esc(title)}</h2><div>${html}</div>
    <div class="btn-row mt">${buttons.map((b) => `<button class="btn ${b.primary ? 'btn--primary' : ''} ${b.danger ? 'btn--danger' : ''}" value="${esc(b.value)}">${esc(b.label)}</button>`).join('')}</div>`;
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue || 'cancel'), { once: true });
    dlg.returnValue = '';
    dlg.showModal();
    form.querySelector('.btn--primary, .btn')?.focus();
  });
}

export const confirmBox = (title, html, okLabel = 'Confirm', danger = false) =>
  modal({ title, html, buttons: [{ label: 'Cancel', value: 'cancel' }, { label: okLabel, value: 'ok', primary: !danger, danger }] }).then((v) => v === 'ok');

/** Today's date as yyyy-mm-dd in local time */
export const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

export function addDaysISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function niceDate(iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}
