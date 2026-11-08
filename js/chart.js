// Pure-SVG donut chart. Accessible: role="img" + summary label; each arc has a <title>.
import { esc } from './utils.js';

/**
 * @param {{label:string,value:number,color:string}[]} segments
 * @param {{size?:number, thickness?:number, center?:string, sub?:string, ariaLabel?:string}} opts
 */
export function donut(segments, { size = 170, thickness = 26, center = '', sub = '', ariaLabel = 'Chart' } = {}) {
  const r = (size - thickness) / 2 - 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 2 : 0;
  let offset = 0;
  const arcs = total > 0 ? segments.filter((s) => s.value > 0).map((s) => {
    const len = (s.value / total) * c;
    const dash = Math.max(0, len - gap);
    const el = `<circle class="seg-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thickness}"
      stroke-dasharray="${dash.toFixed(2)} ${(c - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"><title>${esc(s.label)}: ${Math.round((s.value / total) * 100)}%</title></circle>`;
    offset += len;
    return el;
  }).join('') : '';
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(ariaLabel)}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${thickness}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r + thickness / 2}" fill="none" stroke="var(--line)" stroke-width="2"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r - thickness / 2}" fill="none" stroke="var(--line)" stroke-width="2"/>
    ${arcs}
    <text x="50%" y="${size / 2 - 2}" text-anchor="middle" font-family="var(--font-mono)" font-weight="700" font-size="17" fill="currentColor">${esc(center)}</text>
    <text x="50%" y="${size / 2 + 15}" text-anchor="middle" font-family="var(--font-mono)" font-size="9" letter-spacing="1.5" fill="currentColor" opacity=".7">${esc(sub)}</text>
  </svg>`;
}
