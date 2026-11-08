// MODULE 06 — Trail Knowledge guide pages (#/guide and #/guide/<slug>)
import { esc } from './utils.js';
import { GUIDES, DISCLAIMER } from './data/guides.js';

export function render(el, params = {}) {
  const g = GUIDES.find((x) => x.slug === params.slug);
  el.innerHTML = `
  <header class="view-head">
    <span class="kicker">Module 06 · Field Manual</span>
    <h1 id="h-guide">${g ? esc(g.title) : 'Trail Knowledge'}</h1>
    <p>${g ? esc(g.blurb) : 'Short, practical field notes. Read before you go — they work offline too.'}</p>
  </header>
  <nav class="guide-nav" aria-label="Guides">
    ${GUIDES.map((x) => `<a href="#/guide/${x.slug}" ${g && x.slug === g.slug ? 'aria-current="page"' : ''}><span class="label">${esc(x.tag)}</span>${esc(x.title)}</a>`).join('')}
  </nav>
  ${DISCLAIMER}
  ${g ? `<article class="prose mt">${g.html}</article>` : `<div class="grid mt">${GUIDES.map((x, i) => `
    <a class="card feature-card span-4" href="#/guide/${x.slug}">
      <span class="num">FM-${String(i + 1).padStart(2, '0')} · ${esc(x.tag)}</span><h3>${esc(x.title)}</h3><p>${esc(x.blurb)}</p>
    </a>`).join('')}</div>`}
  ${g ? `<p class="mt"><a class="btn btn--sm" href="#/guide">← All guides</a></p>` : ''}`;
}
