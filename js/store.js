// State container + localStorage persistence.
//  - One mutable `state` object; mutate it, then call save(scope).
//  - Saves are debounced, flushed on tab hide, and report status (saving/saved/error).
//  - Data from storage, imports and other tabs always passes through normalize().
//  - Other open tabs stay in sync via the `storage` event.
import { normalize, defaults, rowToItem, defaultChecklist, SCHEMA_VERSION } from './core/schema.js';

export { defaults, rowToItem, defaultChecklist, SCHEMA_VERSION };
/** Storage key is stable across schema versions — data is migrated in place.
 *  LEGACY_KEY is where data lived before the BASECAMP → TRAILSPEC rename; it is read once and copied over. */
export const STORAGE_KEY = 'trailspec:v1';
export const LEGACY_KEY = 'basecamp:v1';

let loadError = null;
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    return raw ? normalize(JSON.parse(raw)) : defaults();
  } catch (e) {
    loadError = e; // corrupted JSON or storage blocked — start fresh but tell the user
    return defaults();
  }
}

/** The single mutable state object. */
export const state = load();
export const storageProblem = () => loadError;

/* ---------- Change listeners ---------- */
const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (scope) => listeners.forEach((fn) => { try { fn(scope); } catch (e) { console.error(e); } });

/* ---------- Save status listeners: { status: 'saving'|'saved'|'error', at, error } ---------- */
const statusListeners = new Set();
export const onSaveStatus = (fn) => { statusListeners.add(fn); return () => statusListeners.delete(fn); };
let lastStatus = { status: 'saved', at: state.updated };
const setStatus = (s) => { lastStatus = s; statusListeners.forEach((fn) => fn(s)); };
export const saveStatus = () => lastStatus;

let saveTimer = null;
function writeNow() {
  clearTimeout(saveTimer); saveTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setStatus({ status: 'saved', at: Date.now() });
    return true;
  } catch (error) {
    // Most likely QuotaExceededError (storage full) or storage disabled (private mode)
    setStatus({ status: 'error', at: Date.now(), error });
    return false;
  }
}

/** Mark state changed: notify views now, persist shortly after. `scope` lets views skip irrelevant updates. */
export function save(scope = 'all') {
  state.updated = Date.now();
  if (scope === 'gear' || scope === 'all') state.meta.gearTouched = true;
  if (lastStatus.status !== 'saving') setStatus({ status: 'saving', at: Date.now() });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 250);
  emit(scope);
}

/** Replace the whole state (import / reset / other tab) and persist. */
export function replaceState(next, { persist = true } = {}) {
  const n = normalize(next);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, n);
  if (persist) writeNow();
  emit('all');
}

// Flush pending saves when the tab is hidden or closed (mobile browsers kill tabs freely).
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) writeNow(); });
addEventListener('pagehide', () => { if (saveTimer) writeNow(); });

// Another tab/window saved: adopt its data (unless this tab has unsaved edits in flight).
addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY || !e.newValue || saveTimer) return;
  try { replaceState(JSON.parse(e.newValue), { persist: false }); emit('sync'); } catch { /* ignore malformed */ }
});
