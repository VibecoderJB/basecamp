// Renders PNG icons + the Open Graph image with the preinstalled Playwright/Chromium.
// Usage: FONT_DIR=/path/to/woff2s node tools/render-assets.mjs
//   FONT_DIR (optional) should contain archivo-latin-wdth-normal.woff2 and jetbrains-mono-latin-700-normal.woff2
//   (from the @fontsource-variable/archivo and @fontsource/jetbrains-mono npm packages).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // works with a global install too
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const F = process.env.FONT_DIR;
const font = (file) => F && existsSync(`${F}/${file}`) ? `data:font/woff2;base64,${readFileSync(`${F}/${file}`).toString('base64')}` : null;
const archivo = font('archivo-latin-wdth-normal.woff2'), mono = font('jetbrains-mono-latin-700-normal.woff2');
const faces = `${archivo ? `@font-face{font-family:Archivo;src:url(${archivo}) format('woff2');font-weight:100 900;font-stretch:62% 125%}` : ''}
${mono ? `@font-face{font-family:'JetBrains Mono';src:url(${mono}) format('woff2');font-weight:700}` : ''}`;

const mark = readFileSync(new URL('assets/icons/favicon.svg', root), 'utf8');
const topo = readFileSync(new URL('assets/topo.svg', root), 'utf8')
  .replace('stroke="#000"', 'stroke="#4e5c2f"').replace('<svg ', '<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:.28" ');

const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><style>${faces}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}</style>${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL(out, root).pathname, omitBackground: true });
  console.log('wrote', out);
}

const icon = (pad, bg) => `<div style="width:100%;height:100%;display:grid;place-items:center;background:${bg}">
  <div style="width:${100 - pad * 2}%;height:${100 - pad * 2}%">${mark.replace('<svg ', '<svg width="100%" height="100%" ')}</div></div>`;
await shot(icon(0, 'transparent'), 32, 32, 'assets/icons/favicon-32.png');
await shot(icon(6, '#f1ecdf'), 180, 180, 'assets/icons/apple-touch-icon.png');
await shot(icon(2, 'transparent'), 192, 192, 'assets/icons/icon-192.png');
await shot(icon(2, 'transparent'), 512, 512, 'assets/icons/icon-512.png');
await shot(icon(20, '#14251b'), 512, 512, 'assets/icons/icon-maskable-512.png');

// Open Graph 1200x630
await shot(`<div style="position:relative;width:1200px;height:630px;background:#f1ecdf;color:#14251b;font-family:Archivo,sans-serif;overflow:hidden;
  background-image:linear-gradient(rgba(20,37,27,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(20,37,27,.05) 1px,transparent 1px);background-size:30px 30px">
  ${topo}
  <div style="position:absolute;inset:28px;border:4px solid #14251b;border-radius:28px"></div>
  <div style="position:absolute;left:70px;top:60px;right:70px;display:flex;justify-content:space-between;font:700 20px 'JetBrains Mono',monospace;letter-spacing:.14em;color:#5f635d">
    <span>44.37°N / 110.58°W — ELEV 7,733 FT</span><span>SPEC SHEET 001</span></div>
  <div style="position:absolute;left:70px;top:150px;display:flex;align-items:center;gap:30px">
    <div style="width:130px;height:130px">${mark.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    <div style="font-weight:900;font-stretch:125%;font-size:114px;line-height:.85;letter-spacing:-.03em">TRAILSPEC</div>
  </div>
  <div style="position:absolute;left:70px;top:350px;font-weight:800;font-stretch:112%;font-size:48px;text-transform:uppercase;line-height:1.05">Pack light. <span style="color:#b03a0c">Plan right.</span></div>
  <div style="position:absolute;left:70px;top:420px;font-size:28px;color:#3c463c;max-width:900px">Free backpacking field kit — gear weight, trip maps, weather, food &amp; water. No account. Works offline.</div>
  <div style="position:absolute;left:70px;bottom:62px;display:flex;gap:14px;font:700 20px 'JetBrains Mono',monospace;letter-spacing:.12em">
    ${[['NO SIGN-UP', '#ff5a1f'], ['WORKS OFFLINE', '#8fd3e8'], ['$0 FOREVER', '#ffd23f'], ['NO ADS', '#8a9a5b']].map(([t, c]) => `<span style="background:${c};border:3px solid #14251b;border-radius:999px;padding:8px 18px">${t}</span>`).join('')}
  </div>
</div>`, 1200, 630, 'assets/og-image.png');

await browser.close();
