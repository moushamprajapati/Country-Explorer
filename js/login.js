/* login.js - login, register (with security question) and forgot password */

// Already logged in? Skip straight to the right page.
(function () {
  const u = CE.currentUser();
  if (u) window.location.replace(CE.isAdmin(u) ? 'admin.html' : 'explore.html');
})();

CE.setCollage(CE.DEFAULT_BG);
CE.mountThemeButton();

const tabs = document.querySelector('.tabs');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotForm = document.getElementById('forgotForm');
const loginMsg = document.getElementById('loginMsg');
const registerMsg = document.getElementById('registerMsg');
const fpMsg = document.getElementById('fpMsg');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Fill the security-question dropdown
const regQuestion = document.getElementById('regQuestion');
CE.SECURITY_QUESTIONS.forEach(q => {
  const opt = document.createElement('option');
  opt.value = q; opt.textContent = q;
  regQuestion.appendChild(opt);
});

function showTab(which) {
  tabs.classList.toggle('hidden', which === 'forgot');
  tabLogin.classList.toggle('active', which === 'login');
  tabRegister.classList.toggle('active', which === 'register');
  loginForm.classList.toggle('hidden', which !== 'login');
  registerForm.classList.toggle('hidden', which !== 'register');
  forgotForm.classList.toggle('hidden', which !== 'forgot');
  loginMsg.textContent = ''; registerMsg.textContent = ''; fpMsg.textContent = '';
}
tabLogin.addEventListener('click', () => showTab('login'));
tabRegister.addEventListener('click', () => showTab('register'));
document.getElementById('forgotLink').addEventListener('click', () => { resetForgot(); showTab('forgot'); });
document.getElementById('backToLogin').addEventListener('click', () => showTab('login'));

document.getElementById('showLoginPw').addEventListener('change', (e) => {
  document.getElementById('loginPassword').type = e.target.checked ? 'text' : 'password';
});

function goHome(role) { window.location.href = role === 'admin' ? 'admin.html' : 'explore.html'; }

/* ----- login ----- */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMsg.className = 'form-msg';
  loginMsg.textContent = '';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!EMAIL_RE.test(email)) { loginMsg.textContent = 'Enter a valid email address.'; return; }
  if (!password) { loginMsg.textContent = 'Enter your password.'; return; }

  const result = await CE.login(email, password);
  if (result.ok) goHome(result.role); else loginMsg.textContent = result.error;
});

/* ----- register ----- */
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerMsg.textContent = '';
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const question = regQuestion.value;
  const answer = document.getElementById('regAnswer').value.trim();

  if (name.length < 2) { registerMsg.textContent = 'Enter your full name (at least 2 characters).'; return; }
  if (!EMAIL_RE.test(email)) { registerMsg.textContent = 'Enter a valid email address.'; return; }
  if (password.length < 6) { registerMsg.textContent = 'Password must be at least 6 characters.'; return; }
  if (password !== confirm) { registerMsg.textContent = 'Passwords do not match.'; return; }
  if (answer.length < 2) { registerMsg.textContent = 'Answer the security question (needed to reset your password).'; return; }

  const result = await CE.register(name, email, password, question, answer);
  if (result.ok) goHome(result.role); else registerMsg.textContent = result.error;
});

/* ----- forgot password: step 1 = find account, step 2 = answer + new password ----- */
const fpEmail = document.getElementById('fpEmail');
const fpStep2 = document.getElementById('fpStep2');
const fpBtn = document.getElementById('fpBtn');
let fpStage = 1;

function resetForgot() {
  fpStage = 1;
  fpEmail.disabled = false;
  fpEmail.value = '';
  fpStep2.classList.add('hidden');
  document.getElementById('fpAnswer').value = '';
  document.getElementById('fpNewPw').value = '';
  fpBtn.textContent = 'Find my account';
}

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  fpMsg.className = 'form-msg';
  fpMsg.textContent = '';
  const email = fpEmail.value.trim();
  if (!EMAIL_RE.test(email)) { fpMsg.textContent = 'Enter a valid email address.'; return; }

  if (fpStage === 1) {
    const r = CE.getSecurityQuestion(email);
    if (!r.ok) { fpMsg.textContent = r.error; return; }
    document.getElementById('fpQuestionLabel').textContent = r.question;
    fpEmail.disabled = true;
    fpStep2.classList.remove('hidden');
    fpBtn.textContent = 'Reset password';
    fpStage = 2;
    return;
  }

  const answer = document.getElementById('fpAnswer').value;
  const newPw = document.getElementById('fpNewPw').value;
  if (!answer.trim()) { fpMsg.textContent = 'Enter your security answer.'; return; }
  if (newPw.length < 6) { fpMsg.textContent = 'New password must be at least 6 characters.'; return; }

  const r = await CE.resetPassword(email, answer, newPw);
  if (!r.ok) { fpMsg.textContent = r.error; return; }

  resetForgot();
  showTab('login');
  loginMsg.textContent = 'Password reset. Please log in with your new password.';
  loginMsg.className = 'form-msg ok';
});
