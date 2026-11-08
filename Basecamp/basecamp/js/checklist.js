// MODULE 05 — Smart pre-trip checklist. Checkbox state saves automatically.
import { state, save, defaultChecklist } from './store.js';
import { $, esc, uid, icon, toast, confirmBox } from './utils.js';
import { CHECKLIST_GROUPS } from './data/checklist.js';

let root;
export const progress = () => {
  const total = state.checklist.length, done = state.checklist.filter((i) => i.done).length;
  return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
};

export function render(el) {
  root = el;
  el.innerHTML = `
  <header class="view-head">
    <span class="kicker">Module 05 · Pre-flight</span>
    <h1 id="h-checklist">Checklists</h1>
    <p>Run through these before every trip. Ticks are saved on this device, so you can work through them over a few days.</p>
  </header>
  <div class="grid">
    <div class="span-8">
      <div class="card" style="margin-bottom:var(--gap)">
        <div class="row between"><span class="label">Ready to go</span><span class="readout" id="ck-count"></span></div>
        <div class="strap mt" role="progressbar" aria-label="Checklist progress" aria-valuemin="0" aria-valuemax="100" id="ck-bar"><span></span></div>
      </div>
      <div id="ck-groups"></div>
    </div>
    <aside class="span-4 stack">
      <form class="card" id="ck-add" autocomplete="off">
        <div class="card-head"><h2>Add an item</h2></div>
        <div class="stack">
          <label class="field"><span>Task</span><input class="input" name="text" required maxlength="120" placeholder="e.g. Pick up permit at ranger station"></label>
          <label class="field"><span>Section</span><select class="select" name="group">${CHECKLIST_GROUPS.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label>
          <button class="btn btn--primary" type="submit">${icon('plus')} Add task</button>
        </div>
      </form>
      <div class="card stack">
        <button class="btn btn--sm" type="button" id="ck-uncheck">Uncheck all (new trip)</button>
        <button class="btn btn--sm btn--ghost btn--danger" type="button" id="ck-reset">Restore default list</button>
      </div>
    </aside>
  </div>`;
  renderGroups();
  $('#ck-add', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target), text = String(fd.get('text')).trim(); if (!text) return;
    state.checklist.push({ id: uid(), text, group: fd.get('group'), done: false, custom: true });
    save('checklist'); renderGroups(); e.target.reset(); e.target.elements.text.focus(); toast('Task added');
  });
  $('#ck-uncheck', root).addEventListener('click', () => { state.checklist.forEach((i) => { i.done = false; }); save('checklist'); renderGroups(); toast('All unchecked — fresh start'); });
  $('#ck-reset', root).addEventListener('click', async () => {
    if (!(await confirmBox('Restore defaults?', '<p>Your custom tasks and ticks will be replaced by the default checklist.</p>', 'Restore', true))) return;
    state.checklist = defaultChecklist(); save('checklist'); renderGroups();
  });
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    el.addEventListener('change', (e) => {
      const li = e.target.closest('[data-ck]'); if (!li || e.target.type !== 'checkbox') return;
      const item = state.checklist.find((i) => i.id === li.dataset.ck); if (!item) return;
      item.done = e.target.checked; save('checklist'); updateProgress();
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-del-ck]'); if (!b) return;
      const id = b.closest('[data-ck]').dataset.ck;
      state.checklist = state.checklist.filter((i) => i.id !== id); save('checklist'); renderGroups();
    });
  }
}

function renderGroups() {
  const groups = [...CHECKLIST_GROUPS];
  $('#ck-groups', root).innerHTML = groups.map((g) => {
    const items = state.checklist.filter((i) => (CHECKLIST_GROUPS.some((x) => x.id === i.group) ? i.group : 'plan') === g.id);
    if (!items.length) return '';
    return `<section class="check-group" aria-labelledby="ckg-${g.id}">
      <h2 id="ckg-${g.id}" style="font-size:.95rem">${esc(g.name)}</h2>
      <ul class="check-list">${items.map((i) => `<li data-ck="${i.id}">
        <label><input type="checkbox" ${i.done ? 'checked' : ''}><span>${esc(i.text)}</span></label>
        <button type="button" class="btn btn--sm btn--icon btn--ghost" data-del-ck aria-label="Remove task: ${esc(i.text)}">${icon('x')}</button>
      </li>`).join('')}</ul></section>`;
  }).join('') || '<div class="empty">Checklist is empty. Add a task or restore the defaults.</div>';
  updateProgress();
}

function updateProgress() {
  const p = progress();
  $('#ck-count', root).textContent = `${p.done}/${p.total} · ${p.pct}%`;
  const bar = $('#ck-bar', root); bar.setAttribute('aria-valuenow', p.pct); bar.firstElementChild.style.width = p.pct + '%';
}
