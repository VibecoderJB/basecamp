// Share-link codec — pure, works in browsers and Node 18+.
// Gear list -> compact JSON -> deflate-raw (if supported) -> base64url.
// Prefix: 'z' = compressed, 'j' = plain JSON. Nothing is sent to any server.
import { CATEGORIES } from '../data/categories.js';

const CAT_IDS = CATEGORIES.map((c) => c.id);
const MAX_ITEMS = 500;

export const b64url = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const unb64url = (str) => {
  if (!/^[A-Za-z0-9_-]*$/.test(str)) throw new Error('Invalid characters in share code');
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
const canCompress = () => typeof CompressionStream === 'function';

/** @param {{name:string, items:object[]}} gear */
export async function encodeGear(gear) {
  const payload = {
    n: gear.name,
    i: gear.items.map((i) => [i.name, Math.max(0, CAT_IDS.indexOf(i.cat)), Math.round(i.g * 10) / 10, i.qty, (i.worn ? 1 : 0) | (i.cons ? 2 : 0)]),
  };
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  if (canCompress()) {
    try { return 'z' + b64url(await pipe(raw, new CompressionStream('deflate-raw'))); } catch { /* fall back to plain */ }
  }
  return 'j' + b64url(raw);
}

/** Decode + validate. `makeId` supplies fresh ids for the imported items. Throws on bad input. */
export async function decodeGear(code, makeId = () => Math.random().toString(36).slice(2, 10)) {
  if (typeof code !== 'string' || code.length < 2 || code.length > 200000) throw new Error('Bad share code');
  const kind = code[0], bytes = unb64url(code.slice(1));
  let json;
  if (kind === 'z') json = new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')));
  else if (kind === 'j') json = new TextDecoder().decode(bytes);
  else throw new Error('Unknown share format');
  const p = JSON.parse(json);
  if (!p || !Array.isArray(p.i)) throw new Error('Bad payload');
  return {
    name: String(p.n || 'Shared list').slice(0, 80),
    items: p.i.slice(0, MAX_ITEMS).filter(Array.isArray).map(([name, c, g, qty, f]) => ({
      id: makeId(), name: String(name ?? '').slice(0, 80), cat: CAT_IDS[c] || 'misc', g: Math.max(0, Number(g) || 0),
      qty: Math.max(0, Math.round(Number(qty) || 0)), worn: !!(f & 1), cons: !!(f & 2) && !(f & 1),
    })),
  };
}
