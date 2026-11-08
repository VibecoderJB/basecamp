// Generates assets/topo.svg — procedural topographic contour lines.
// Fractal value noise -> marching squares -> joined polylines.
// Run: node tools/make-topo.mjs   (deterministic; seed below)
import { writeFileSync } from 'node:fs';

const W = 1200, H = 900, STEP = 8;         // canvas size + sample grid spacing
const LEVELS = 22;                          // number of contour levels
let seed = 4437;                            // 44.37°N, for luck
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Lattice of random values for value noise
const G = 64, lattice = Array.from({ length: G * G }, rand);
const lv = (x, y) => lattice[((y % G + G) % G) * G + ((x % G + G) % G)];
const smooth = t => t * t * (3 - 2 * t);
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
  const a = lv(xi, yi), b = lv(xi + 1, yi), c = lv(xi, yi + 1), d = lv(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
const fbm = (x, y) => { let v = 0, amp = 0.55, f = 1; for (let o = 0; o < 4; o++) { v += amp * noise(x * f, y * f); amp *= 0.5; f *= 2.03; } return v; };

const cols = Math.ceil(W / STEP) + 1, rows = Math.ceil(H / STEP) + 1;
const field = [];
for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
  // two "peaks" bias so it reads like terrain, not static
  const x = i * STEP, y = j * STEP;
  const peak = Math.exp(-(((x - 380) ** 2) + ((y - 330) ** 2)) / 90000) * 0.45 + Math.exp(-(((x - 900) ** 2) + ((y - 640) ** 2)) / 70000) * 0.35;
  field.push(fbm(x / 260, y / 260) + peak);
}
const min = Math.min(...field), max = Math.max(...field);
const f = (i, j) => field[j * cols + i];

const key = p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const paths = [];
for (let l = 1; l < LEVELS; l++) {
  const t = min + (max - min) * (l / LEVELS);
  const segs = [];
  const interp = (x1, y1, v1, x2, y2, v2) => { const k = (t - v1) / (v2 - v1); return [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k]; };
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const x = i * STEP, y = j * STEP;
    const a = f(i, j), b = f(i + 1, j), c = f(i + 1, j + 1), d = f(i, j + 1);
    const idx = (a > t) | ((b > t) << 1) | ((c > t) << 2) | ((d > t) << 3);
    if (idx === 0 || idx === 15) continue;
    const T = interp(x, y, a, x + STEP, y, b), R = interp(x + STEP, y, b, x + STEP, y + STEP, c);
    const B = interp(x, y + STEP, d, x + STEP, y + STEP, c), L = interp(x, y, a, x, y + STEP, d);
    const table = { 1: [[L, T]], 2: [[T, R]], 3: [[L, R]], 4: [[R, B]], 5: [[L, T], [R, B]], 6: [[T, B]], 7: [[L, B]],
      8: [[B, L]], 9: [[B, T]], 10: [[T, R], [B, L]], 11: [[B, R]], 12: [[R, L]], 13: [[R, T]], 14: [[T, L]] };
    segs.push(...table[idx]);
  }
  // Join segments into polylines
  const ends = new Map();
  segs.forEach((s, n) => { for (const p of s) { const k = key(p); (ends.get(k) || ends.set(k, []).get(k)).push(n); } });
  const used = new Uint8Array(segs.length);
  for (let n = 0; n < segs.length; n++) {
    if (used[n]) continue; used[n] = 1;
    const line = [...segs[n]];
    for (const dir of [1, -1]) {
      for (;;) {
        const tip = dir === 1 ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) || []).find(m => !used[m]);
        if (next === undefined) break;
        used[next] = 1;
        const [p, q] = segs[next];
        const other = key(p) === key(tip) ? q : p;
        dir === 1 ? line.push(other) : line.unshift(other);
      }
    }
    if (line.length < 6) continue;
    // decimate every other point for size
    const pts = line.filter((_, k) => k % 2 === 0 || k === line.length - 1);
    const d = 'M' + pts.map(p => `${Math.round(p[0])} ${Math.round(p[1])}`).join('L');
    paths.push(`<path d="${d}"${l % 5 === 0 ? ' stroke-width="2.2"' : ''}/>`);
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#000" stroke-width="1.1" stroke-linejoin="round">${paths.join('')}</g></svg>`;
writeFileSync(new URL('../assets/topo.svg', import.meta.url), svg);
console.log('topo.svg', (svg.length / 1024).toFixed(1) + 'KB', paths.length, 'paths');
