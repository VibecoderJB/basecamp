// Project integrity checks: the offline cache list and file references can't drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
  const p = join(dir, f);
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
});

const sw = read('sw.js');
const shell = JSON.parse(sw.match(/const SHELL_FILES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));

test('every service-worker shell file exists', () => {
  for (const f of shell) if (f !== './') assert.ok(existsSync(join(ROOT, f)), `sw.js lists missing file: ${f}`);
});

test('every JS/CSS file is in the service-worker shell (works offline)', () => {
  const files = [...walk('js'), ...walk('css')].map((p) => relative(ROOT, join(ROOT, p)));
  const missing = files.filter((f) => !shell.includes(f));
  assert.deepEqual(missing, [], `Add these to SHELL_FILES in sw.js: ${missing.join(', ')}`);
});

test('every relative import in js/ resolves', () => {
  for (const f of walk('js')) {
    const src = read(f);
    for (const [, spec] of src.matchAll(/(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]/g)) {
      const target = join(ROOT, f, '..', spec);
      assert.ok(existsSync(target), `${f} imports missing ${spec}`);
    }
    for (const [, spec] of src.matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
      assert.ok(existsSync(join(ROOT, f, '..', spec)), `${f} dynamically imports missing ${spec}`);
    }
  }
});

test('index.html local references exist', () => {
  const html = read('index.html');
  for (const [, ref] of html.matchAll(/(?:href|src)="(?!https?:|#|data:|mailto:)([^"]+)"/g)) {
    assert.ok(existsSync(join(ROOT, ref.split('?')[0])), `index.html references missing ${ref}`);
  }
});

test('manifest icons exist', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  for (const i of m.icons) assert.ok(existsSync(join(ROOT, i.src)), `missing icon ${i.src}`);
});

test('colorway ids agree across CSS, JS, schema and pre-paint script', async () => {
  const { COLORWAY_IDS } = await import('../js/core/schema.js');
  const css = read('css/styles.css'), app = read('js/app.js'), html = read('index.html');
  for (const id of COLORWAY_IDS.filter((x) => x !== 'auto')) {
    assert.ok(css.includes(`[data-theme="${id}"]`), `CSS missing colorway ${id}`);
    assert.ok(app.includes(`id: '${id}'`), `app.js COLORWAYS missing ${id}`);
    assert.ok(html.includes(id), `index.html pre-paint script missing ${id}`);
  }
});
