/* compare.js - two countries side by side */

if (!CE.requireLogin()) { throw new Error('Not logged in'); }
CE.renderNav('compare');
CE.setCollage(CE.DEFAULT_BG);

const esc = CE.esc;
const form = document.getElementById('cmpForm');
const msg = document.getElementById('cmpMsg');
const result = document.getElementById('cmpResult');
const NAME_RE = /^[a-zA-Z\s.'-]{3,}$/;

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  result.innerHTML = '';

  const a = document.getElementById('cmpA').value.trim();
  const b = document.getElementById('cmpB').value.trim();

  if (!NAME_RE.test(a) || !NAME_RE.test(b)) {
    msg.textContent = 'Enter two country names (letters only, at least 3 characters each).';
    return;
  }
  if (a.toLowerCase() === b.toLowerCase()) {
    msg.textContent = 'Please choose two different countries.';
    return;
  }

  msg.textContent = 'Comparing…';
  msg.style.color = 'rgba(255,255,255,0.8)';

  try {
    const [ca, cb] = await Promise.all([CE.fetchCountry(a), CE.fetchCountry(b)]);
    msg.textContent = '';
    msg.style.color = '';
    render(ca, cb);
  } catch (err) {
    msg.style.color = '';
    msg.textContent = 'Couldn\'t find one of those countries. Check the spelling and try again.';
  }
});

function render(a, b) {
  const list = (arr, key) => arr && arr.length ? arr.map(x => esc(x[key])).join(', ') : '—';
  const flag = (c) => c.flags && c.flags.svg ? '<img src="' + esc(c.flags.svg) + '" alt="Flag of ' + esc(c.name) + '">' : '—';

  const popA = a.population || 0;
  const popB = b.population || 0;
  const winA = popA > popB;
  const winB = popB > popA;

  const rows = [
    ['Flag', flag(a), flag(b), false, false],
    ['Capital', esc(a.capital || '—'), esc(b.capital || '—'), false, false],
    ['Region', esc(a.region || '—') + (a.subregion ? ' · ' + esc(a.subregion) : ''), esc(b.region || '—') + (b.subregion ? ' · ' + esc(b.subregion) : ''), false, false],
    ['Population', popA ? fmt(popA) + (winA ? ' ✔' : '') : '—', popB ? fmt(popB) + (winB ? ' ✔' : '') : '—', winA, winB],
    ['Currency', a.currencies ? a.currencies.map(c => esc(c.name) + ' (' + esc(c.symbol) + ')').join(', ') : '—',
                 b.currencies ? b.currencies.map(c => esc(c.name) + ' (' + esc(c.symbol) + ')').join(', ') : '—', false, false],
    ['Languages', list(a.languages, 'name'), list(b.languages, 'name'), false, false]
  ];

  let html = '<div class="table-scroll"><table class="cmp-table"><thead><tr><th></th><th>' + esc(a.name) + '</th><th>' + esc(b.name) + '</th></tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr><th class="rowhead" scope="row">' + r[0] + '</th>' +
      '<td' + (r[3] ? ' class="cmp-win"' : '') + '>' + r[1] + '</td>' +
      '<td' + (r[4] ? ' class="cmp-win"' : '') + '>' + r[2] + '</td></tr>';
  });
  html += '</tbody></table></div>';

  if (popA && popB && popA !== popB) {
    const big = winA ? a : b, small = winA ? b : a;
    const ratio = Math.max(popA, popB) / Math.min(popA, popB);
    html += '<p class="cmp-note">' + esc(big.name) + ' has about ' + ratio.toFixed(1) + '× the population of ' + esc(small.name) + '.</p>';
  }
  result.innerHTML = html;
}
