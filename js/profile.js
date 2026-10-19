/* profile.js - account details, edit name, change password, DELETE account */

const user = CE.requireLogin();
if (!user) { throw new Error('Not logged in'); }
CE.renderNav('profile');
CE.setCollage(CE.DEFAULT_BG);

const nameMsg = document.getElementById('nameMsg');
const pwMsg = document.getElementById('pwMsg');
const delMsg = document.getElementById('delMsg');

function fillDetails() {
  const u = CE.currentUser();
  const list = CE.getWishlist();
  document.getElementById('pName').textContent = u.name;
  document.getElementById('pEmail').textContent = u.email;
  document.getElementById('pSince').textContent = new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('pCountries').textContent = list.filter(i => i.type === 'country').length;
  document.getElementById('pPlaces').textContent = list.filter(i => i.type === 'place').length;
  document.getElementById('newName').value = u.name;
  document.getElementById('pVisited').textContent = list.filter(i => i.visited).length;
  document.getElementById('secStatus').textContent = u.secQuestion
    ? 'Current question: ' + u.secQuestion
    : 'No security question set yet. Add one so you can reset your password if you forget it.';
}
fillDetails();

document.getElementById('nameForm').addEventListener('submit', (e) => {
  e.preventDefault();
  nameMsg.className = 'form-msg';
  const name = document.getElementById('newName').value.trim();
  if (name.length < 2) { nameMsg.textContent = 'Name must be at least 2 characters.'; return; }
  CE.updateName(name);
  nameMsg.textContent = 'Name updated.';
  nameMsg.className = 'form-msg ok';
  CE.renderNav('profile');
  fillDetails();
});

document.getElementById('pwForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  pwMsg.className = 'form-msg';
  const oldPw = document.getElementById('oldPw').value;
  const newPw = document.getElementById('newPw').value;
  if (!oldPw) { pwMsg.textContent = 'Enter your current password.'; return; }
  if (newPw.length < 6) { pwMsg.textContent = 'New password must be at least 6 characters.'; return; }
  const result = await CE.changePassword(oldPw, newPw);
  if (result.ok) {
    pwMsg.textContent = 'Password updated.';
    pwMsg.className = 'form-msg ok';
    e.target.reset();
  } else {
    pwMsg.textContent = result.error;
  }
});

document.getElementById('deleteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  delMsg.textContent = '';
  const pw = document.getElementById('delPw').value;
  if (!pw) { delMsg.textContent = 'Enter your password to confirm.'; return; }
  if (!confirm('Delete your account and wishlist permanently?')) return;
  const result = await CE.deleteAccount(pw);
  if (result.ok) {
    window.location.href = 'index.html';
  } else {
    delMsg.textContent = result.error;
  }
});

/* ----- security question (used by Forgot password) ----- */
const secQuestion = document.getElementById('secQuestion');
CE.SECURITY_QUESTIONS.forEach(q => {
  const o = document.createElement('option');
  o.value = q; o.textContent = q;
  secQuestion.appendChild(o);
});

document.getElementById('secForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('secMsg');
  msg.className = 'form-msg';
  const answer = document.getElementById('secAnswer').value.trim();
  const pw = document.getElementById('secPw').value;
  if (answer.length < 2) { msg.textContent = 'Enter an answer (at least 2 characters).'; return; }
  if (!pw) { msg.textContent = 'Enter your current password to confirm.'; return; }
  const r = await CE.setSecurity(secQuestion.value, answer, pw);
  if (r.ok) {
    msg.textContent = 'Security question saved.';
    msg.className = 'form-msg ok';
    e.target.reset();
    fillDetails();
  } else {
    msg.textContent = r.error;
  }
});
