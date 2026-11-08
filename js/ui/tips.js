// Tap-to-explain jargon. Usage in templates: `${tip('base')}` renders a small ⓘ button.
// One shared, accessible popover handles every button (click, Enter/Space, Escape, click-away).
import { GLOSSARY } from '../data/glossary.js';
import { esc } from '../utils.js';

export const tip = (key) => {
  const g = GLOSSARY[key]; if (!g) return '';
  return `<button type="button" class="info" data-tip="${key}" aria-expanded="false" aria-controls="tip-pop" aria-label="What is ${esc(g[0].toLowerCase())}?">i</button>`;
};

let pop, openBtn = null;

function close({ focus = false } = {}) {
  if (!openBtn) return;
  openBtn.setAttribute('aria-expanded', 'false');
  if (focus) openBtn.focus();
  openBtn = null; pop.hidden = true;
}

function open(btn) {
  const [title, body] = GLOSSARY[btn.dataset.tip];
  if (openBtn === btn) return close();
  close();
  pop.innerHTML = `<strong>${esc(title)}</strong><p>${esc(body)}</p>`;
  pop.hidden = false;
  // Position below the button, kept inside the viewport
  const r = btn.getBoundingClientRect(), w = Math.min(300, innerWidth - 24);
  pop.style.width = `${w}px`;
  pop.style.left = `${Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12)) + scrollX}px`;
  const below = r.bottom + 10 + pop.offsetHeight < innerHeight;
  pop.style.top = `${(below ? r.bottom + 10 : r.top - pop.offsetHeight - 10) + scrollY}px`;
  btn.setAttribute('aria-expanded', 'true');
  openBtn = btn;
}

export function initTips() {
  pop = document.createElement('div');
  pop.id = 'tip-pop'; pop.className = 'tip-pop'; pop.hidden = true;
  pop.setAttribute('role', 'note'); pop.setAttribute('aria-live', 'polite');
  document.body.append(pop);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tip]');
    if (b) { e.preventDefault(); e.stopPropagation(); open(b); } else if (!e.target.closest('#tip-pop')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openBtn) close({ focus: true }); });
  addEventListener('hashchange', () => close());
  addEventListener('resize', () => close());
}
