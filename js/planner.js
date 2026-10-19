/* planner.js - trip budget calculator with saved plans */

if (!CE.requireLogin()) { throw new Error('Not logged in'); }
CE.renderNav('planner');
CE.setCollage(CE.DEFAULT_BG);

const esc = CE.esc;
const $ = (id) => document.getElementById(id);
const FIELDS = ['pDest', 'pDays', 'pPeople', 'pCur', 'pFlight', 'pHotel', 'pFood', 'pTransport', 'pActivities', 'pExtra'];

// Offer wishlist countries as destination suggestions
CE.getWishlist().filter(i => i.type === 'country').forEach(i => {
  const o = document.createElement('option');
  o.value = i.title;
  $('destList').appendChild(o);
});

const num = (id) => Math.max(0, parseFloat($(id).value) || 0);
const money = (n, cur) => cur + ' ' + Math.round(n).toLocaleString('en-IN');

function calculate() {
  const days = Math.max(1, Math.floor(num('pDays')));
  const people = Math.max(1, Math.floor(num('pPeople')));
  const parts = [
    ['Flights', num('pFlight') * people],
    ['Hotel', num('pHotel') * days],
    ['Food', num('pFood') * days * people],
    ['Local transport', num('pTransport') * days],
    ['Activities', num('pActivities') * days * people]
  ];
  const subtotal = parts.reduce((s, p) => s + p[1], 0);
  const extra = subtotal * (Math.min(100, num('pExtra')) / 100);
  const total = subtotal + extra;
  return { days, people, parts, subtotal, extra, total };
}

function renderSummary() {
  const cur = $('pCur').value;
  const c = calculate();
  let html = '';
  c.parts.forEach(p => {
    const pct = c.subtotal ? (p[1] / c.subtotal) * 100 : 0;
    html += '<div class="sum-row"><span>' + p[0] + '</span><b>' + money(p[1], cur) + '</b></div>' +
            '<div class="sum-bar"><span style="width:' + pct.toFixed(0) + '%"></span></div>';
  });
  html += '<div class="sum-row"><span>Emergency buffer (' + num('pExtra') + '%)</span><b>' + money(c.extra, cur) + '</b></div>';
  html += '<div class="sum-row total"><span>Total</span><span>' + money(c.total, cur) + '</span></div>';
  html += '<div class="sum-row"><span>Per person</span><b>' + money(c.total / c.people, cur) + '</b></div>';
  html += '<div class="sum-row"><span>Per day</span><b>' + money(c.total / c.days, cur) + '</b></div>';
  $('summary').innerHTML = html;
}

FIELDS.forEach(id => $(id).addEventListener('input', renderSummary));
renderSummary();

/* ----- saved plans ----- */
function renderPlans() {
  const plans = CE.getPlans();
  const box = $('planList');
  box.innerHTML = '';

  if (plans.length === 0) {
    box.innerHTML = '<p class="empty-note">No saved plans yet. Fill in the form and tap "Save this plan".</p>';
    return;
  }

  plans.forEach(p => {
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.innerHTML =
      '<div><b>' + esc(p.destination) + '</b>' +
      '<small>' + p.days + ' days · ' + p.people + (p.people === 1 ? ' traveller' : ' travellers') +
      ' · ' + esc(p.currency) + ' ' + Math.round(p.total).toLocaleString('en-IN') + ' total</small></div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button type="button" class="btn-small light" data-load>Open</button>' +
        '<button type="button" class="btn-small grey" data-del>Delete</button>' +
      '</div>';

    card.querySelector('[data-load]').addEventListener('click', () => {
      FIELDS.forEach(id => { if (p.inputs[id] !== undefined) $(id).value = p.inputs[id]; });
      renderSummary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      CE.toast('Plan loaded');
    });
    card.querySelector('[data-del]').addEventListener('click', () => {
      if (!confirm('Delete the plan for ' + p.destination + '?')) return;
      CE.deletePlan(p.id);
      renderPlans();
      CE.toast('Plan deleted');
    });
    box.appendChild(card);
  });
}

$('savePlanBtn').addEventListener('click', () => {
  const msg = $('planMsg');
  msg.textContent = '';
  const dest = $('pDest').value.trim();
  if (dest.length < 2) { msg.textContent = 'Enter a destination before saving.'; $('pDest').focus(); return; }

  const c = calculate();
  if (c.total <= 0) { msg.textContent = 'Enter at least one cost before saving.'; return; }

  const inputs = {};
  FIELDS.forEach(id => { inputs[id] = $(id).value; });

  CE.savePlan({ destination: dest, days: c.days, people: c.people, currency: $('pCur').value, total: c.total, inputs });
  renderPlans();
  CE.toast('Plan saved');
});

renderPlans();
