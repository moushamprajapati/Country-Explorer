/* admin.js - admin dashboard: see users, delete users */

if (!CE.requireAdmin()) { throw new Error('Admins only'); }
CE.renderNav('admin');
CE.setCollage(CE.DEFAULT_BG);

const esc = CE.esc;
const rows = document.getElementById('userRows');
const noUsers = document.getElementById('noUsers');
const search = document.getElementById('userSearch');

function renderStats(data) {
  const totalSaved = data.users.reduce((s, u) => s + u.saved, 0);
  const totalVisited = data.users.reduce((s, u) => s + u.visited, 0);
  const cards = [
    ['Registered users', data.users.length],
    ['Items in wishlists', totalSaved],
    ['Marked visited', totalVisited],
    ['Most saved country', data.topCountries.length ? data.topCountries[0][0] : '—']
  ];
  document.getElementById('statCards').innerHTML = cards.map(c =>
    '<div class="stat-card"><div class="stat-label">' + c[0] + '</div><div class="num" style="' + (typeof c[1] === 'string' ? 'font-size:22px;' : '') + '">' + esc(c[1]) + '</div></div>'
  ).join('');

  const list = document.getElementById('topList');
  list.innerHTML = data.topCountries.length
    ? data.topCountries.map(t => '<li><span>' + esc(t[0]) + '</span><b>' + t[1] + (t[1] === 1 ? ' user' : ' users') + '</b></li>').join('')
    : '<li><span style="color:#8a8578;">No countries have been saved yet.</span></li>';
}

function render() {
  const data = CE.adminSummary();
  if (!data) return;
  renderStats(data);

  const term = search.value.trim().toLowerCase();
  const shown = data.users.filter(u => !term || (u.name + ' ' + u.email).toLowerCase().includes(term));

  rows.innerHTML = '';
  noUsers.classList.toggle('hidden', shown.length > 0);
  if (shown.length === 0 && data.users.length === 0) noUsers.textContent = 'No users have registered yet.';
  else noUsers.textContent = 'No users found.';

  shown.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + esc(u.name) + '</td>' +
      '<td>' + esc(u.email) + '</td>' +
      '<td>' + new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</td>' +
      '<td>' + u.saved + '</td>' +
      '<td>' + u.visited + '</td>' +
      '<td><button type="button" class="btn-small grey" data-del style="color:#8a2a22;">Delete user</button></td>';

    tr.querySelector('[data-del]').addEventListener('click', () => {
      if (!confirm('Delete ' + u.name + ' (' + u.email + ') and all their saved data? This cannot be undone.')) return;
      if (CE.adminDeleteUser(u.email)) {
        CE.toast('Deleted user ' + u.name);
        render();
      }
    });
    rows.appendChild(tr);
  });
}

search.addEventListener('input', render);
render();
