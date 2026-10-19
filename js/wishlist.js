/* wishlist.js - view, filter, search, mark visited, add notes, DELETE saved items */

if (!CE.requireLogin()) { throw new Error('Not logged in'); }
CE.renderNav('wishlist');
CE.setCollage(CE.DEFAULT_BG);

const esc = CE.esc;
const grid = document.getElementById('wishGrid');
const emptyState = document.getElementById('emptyState');
const emptyTitle = document.getElementById('emptyTitle');
const emptyText = document.getElementById('emptyText');
const emptyLink = document.getElementById('emptyLink');
const toolbar = document.getElementById('wishToolbar');
const summary = document.getElementById('wishSummary');
const searchBox = document.getElementById('wishSearch');
const filterRow = document.getElementById('filterRow');
const clearAllBtn = document.getElementById('clearAllBtn');
const progressBox = document.getElementById('progressBox');

let activeFilter = 'all';

function renderProgress(all) {
  if (all.length === 0) { progressBox.classList.add('hidden'); return; }
  const visited = all.filter(i => i.visited).length;
  const pct = Math.round((visited / all.length) * 100);
  document.getElementById('progressText').textContent = visited + ' of ' + all.length + ' visited';
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
  progressBox.classList.remove('hidden');
}

function matchesFilter(item) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'visited') return !!item.visited;
  if (activeFilter === 'tovisit') return !item.visited;
  return item.type === activeFilter;
}

function render() {
  const all = CE.getWishlist();
  const countries = all.filter(i => i.type === 'country').length;
  const places = all.length - countries;

  summary.textContent = all.length === 0
    ? 'Countries and places you saved will appear here.'
    : countries + (countries === 1 ? ' country' : ' countries') + ' and ' + places + (places === 1 ? ' place' : ' places') + ' saved.';

  renderProgress(all);

  if (all.length === 0) {
    toolbar.classList.add('hidden');
    grid.innerHTML = '';
    emptyTitle.textContent = 'Your wishlist is empty';
    emptyText.textContent = 'Tap the heart on any country or tourist place to save it here.';
    emptyLink.classList.remove('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  toolbar.classList.remove('hidden');

  const term = searchBox.value.trim().toLowerCase();
  const shown = all.filter(i =>
    matchesFilter(i) &&
    (!term || (i.title + ' ' + (i.subtitle || '') + ' ' + (i.note || '')).toLowerCase().includes(term))
  );

  grid.innerHTML = '';

  if (shown.length === 0) {
    emptyTitle.textContent = 'No matches';
    emptyText.textContent = 'Nothing in your wishlist matches this filter or search.';
    emptyLink.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  shown.forEach(item => grid.appendChild(buildCard(item)));
}

function buildCard(item) {
  const card = document.createElement('article');
  card.className = 'wish-card' + (item.visited ? ' is-visited' : '');

  let media;
  if (item.image) {
    media = item.type === 'country'
      ? '<img class="flag-thumb" src="' + esc(item.image) + '" alt="Flag of ' + esc(item.title) + '">'
      : '<img class="place-thumb" src="' + esc(item.image) + '" alt="' + esc(item.title) + '">';
  } else {
    media = '<div class="place-thumb-fallback">No image</div>';
  }

  card.innerHTML = media +
    '<div class="place-body">' +
      '<span class="type-tag">' + (item.type === 'country' ? 'Country' : 'Place') + '</span>' +
      (item.visited ? '<span class="visited-tag">✔ Visited</span>' : '') +
      '<div class="place-title">' + esc(item.title) + '</div>' +
      '<div class="place-dist">' + esc(item.subtitle || '') + '</div>' +
    '</div>' +
    '<div class="wish-extras" data-notearea></div>' +
    '<div class="wish-actions two-rows">' +
      '<a class="btn btn-teal" href="' + esc(item.url) + '"' + (item.type === 'place' ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
        (item.type === 'country' ? 'Explore' : 'Read more') + '</a>' +
      '<button type="button" class="btn btn-outline" data-remove>Delete</button>' +
      '<button type="button" class="btn ' + (item.visited ? 'btn-teal' : 'btn-brass') + '" data-visited>' +
        (item.visited ? '↺ Mark as not visited' : '✔ Mark as visited') + '</button>' +
    '</div>';

  renderNote(card.querySelector('[data-notearea]'), item);

  // visited toggle
  card.querySelector('[data-visited]').addEventListener('click', () => {
    const nowVisited = !item.visited;
    CE.updateWishItem(item.id, { visited: nowVisited });
    CE.toast(nowVisited ? 'Marked "' + item.title + '" as visited' : 'Moved "' + item.title + '" back to want to visit');
    render();
  });

  // delete with undo
  card.querySelector('[data-remove]').addEventListener('click', () => {
    const removed = CE.removeFromWishlist(item.id);
    render();
    CE.toast('Deleted "' + item.title + '"', 'Undo', () => {
      CE.restoreToWishlist(removed);
      render();
    });
  });
  return card;
}

// Shows the saved note (with Edit) or an "Add note" button; switches to a textarea to edit.
function renderNote(box, item) {
  box.innerHTML = '';

  if (item.note) {
    const text = document.createElement('div');
    text.className = 'note-text';
    text.textContent = item.note;
    box.appendChild(text);
  }

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'btn-small light';
  openBtn.textContent = item.note ? '✎ Edit note' : '＋ Add note';
  openBtn.addEventListener('click', () => openEditor(box, item));
  box.appendChild(openBtn);
}

function openEditor(box, item) {
  box.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'note-edit';

  const ta = document.createElement('textarea');
  ta.maxLength = 300;
  ta.placeholder = 'e.g. Go in March, budget ₹80,000';
  ta.value = item.note || '';
  ta.setAttribute('aria-label', 'Note for ' + item.title);

  const row = document.createElement('div');
  row.className = 'row';

  const save = document.createElement('button');
  save.type = 'button'; save.className = 'btn-small ok'; save.textContent = 'Save note';
  save.addEventListener('click', () => {
    const updated = CE.updateWishItem(item.id, { note: ta.value.trim() });
    if (updated) item.note = updated.note;
    CE.toast(item.note ? 'Note saved' : 'Note removed');
    renderNote(box, item);
  });

  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'btn-small grey'; cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => renderNote(box, item));

  row.appendChild(save);
  row.appendChild(cancel);
  wrap.appendChild(ta);
  wrap.appendChild(row);
  box.appendChild(wrap);
  ta.focus();
}

filterRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.pill');
  if (!btn) return;
  activeFilter = btn.dataset.filter;
  filterRow.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === btn));
  render();
});

searchBox.addEventListener('input', render);

clearAllBtn.addEventListener('click', () => {
  const backup = CE.getWishlist();
  if (backup.length === 0) return;
  if (!confirm('Delete all ' + backup.length + ' items from your wishlist?')) return;
  CE.clearWishlist();
  render();
  CE.toast('Wishlist cleared', 'Undo', () => {
    backup.slice().reverse().forEach(i => CE.restoreToWishlist(i));
    render();
  });
});

render();
