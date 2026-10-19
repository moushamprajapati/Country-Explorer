/* =========================================================
   common.js  -  shared by every page
   Accounts (user + admin), login session, forgot password,
   wishlist (notes + visited), recent searches,
   trip plans, dark mode, navigation bar and toast messages.
   Everything is stored in the browser's localStorage
   (no backend), so each browser keeps its own data.
   ========================================================= */
(function () {
  const USERS_KEY = 'ce_users';
  const SESSION_KEY = 'ce_session';
  const THEME_KEY = 'ce_theme';
  const WISH_PREFIX = 'ce_wishlist_';
  const RECENT_PREFIX = 'ce_recent_';
  const PLANS_PREFIX = 'ce_plans_';
  const USER_DATA_PREFIXES = [WISH_PREFIX, RECENT_PREFIX, PLANS_PREFIX];

  // Built-in administrator account (created automatically on first use).
  const ADMIN_EMAIL = 'admin@countryexplorer.com';
  const ADMIN_PASSWORD = 'Admin@123';

  const SECURITY_QUESTIONS = [
    "What is your pet's name?",
    'What was the name of your first school?',
    'In which city were you born?',
    "What is your best friend's first name?",
    'What is your favourite food?'
  ];

  const DEFAULT_BG = Array.from({ length: 18 }, (_, i) =>
    'https://picsum.photos/seed/travel' + (i + 1) + '/500/500');

  // Common alternate names people type -> the country API's official name.
  const NAME_ALIASES = {
    'south korea': 'Korea (Republic of)',
    'north korea': "Korea (Democratic People's Republic of)",
    'usa': 'United States of America', 'us': 'United States of America', 'america': 'United States of America',
    'uk': 'United Kingdom of Great Britain and Northern Ireland',
    'britain': 'United Kingdom of Great Britain and Northern Ireland',
    'england': 'United Kingdom of Great Britain and Northern Ireland',
    'russia': 'Russian Federation', 'iran': 'Iran (Islamic Republic of)',
    'laos': "Lao People's Democratic Republic", 'syria': 'Syrian Arab Republic',
    'venezuela': 'Venezuela (Bolivarian Republic of)', 'bolivia': 'Bolivia (Plurinational State of)',
    'tanzania': 'Tanzania, United Republic of', 'moldova': 'Moldova (Republic of)',
    'vatican': 'Vatican City', 'ivory coast': 'Ivory Coast',
    'czechia': 'Czech Republic', 'macedonia': 'North Macedonia'
  };

  /* ---------- small helpers ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Passwords and security answers are hashed (SHA-256), never stored as plain text.
  async function hashPassword(text) {
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* use fallback below */ }
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return 'f' + (h >>> 0).toString(16);
  }
  const normAnswer = (a) => String(a).trim().toLowerCase();

  /* ---------- theme (dark / light) ---------- */
  function isDark() { return localStorage.getItem(THEME_KEY) === 'dark'; }
  function applyTheme() {
    document.documentElement.classList.toggle('dark', isDark());
    document.querySelectorAll('.theme-btn').forEach(b => {
      b.textContent = isDark() ? '☀ Light mode' : '🌙 Dark mode';
    });
  }
  function toggleTheme() {
    localStorage.setItem(THEME_KEY, isDark() ? 'light' : 'dark');
    applyTheme();
  }
  // Floating theme button for pages without the nav bar (login page)
  function mountThemeButton() {
    const wrap = document.createElement('div');
    wrap.className = 'theme-fab';
    wrap.innerHTML = '<button type="button" class="fab-btn theme-btn"></button>';
    document.body.appendChild(wrap);
    wrap.querySelector('button').addEventListener('click', toggleTheme);
    applyTheme();
  }
  applyTheme();

  /* ---------- accounts ---------- */
  function getUsers() { return read(USERS_KEY, []); }
  function saveUsers(users) { write(USERS_KEY, users); }
  function sessionEmail() { return localStorage.getItem(SESSION_KEY); }

  function currentUser() {
    const email = sessionEmail();
    if (!email) return null;
    return getUsers().find(u => u.email === email) || null;
  }
  function isAdmin(user) { return !!user && user.role === 'admin'; }

  async function ensureAdmin() {
    const users = getUsers();
    if (!users.some(u => u.email === ADMIN_EMAIL)) {
      users.push({
        name: 'Administrator', email: ADMIN_EMAIL, role: 'admin',
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        createdAt: new Date().toISOString()
      });
      saveUsers(users);
    }
  }

  async function register(name, email, password, secQuestion, secAnswer) {
    await ensureAdmin();
    email = email.trim().toLowerCase();
    const users = getUsers();
    if (users.some(u => u.email === email)) {
      return { ok: false, error: 'An account with this email already exists. Please log in.' };
    }
    const user = {
      name: name.trim(), email: email, role: 'user',
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString()
    };
    if (secQuestion && secAnswer) {
      user.secQuestion = secQuestion;
      user.secAnswerHash = await hashPassword(normAnswer(secAnswer));
    }
    users.push(user);
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, email);
    return { ok: true, role: 'user' };
  }

  async function login(email, password) {
    await ensureAdmin();
    email = email.trim().toLowerCase();
    const user = getUsers().find(u => u.email === email);
    if (!user) return { ok: false, error: 'No account found with this email. Register first.' };
    if (user.passwordHash !== await hashPassword(password)) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }
    localStorage.setItem(SESSION_KEY, email);
    return { ok: true, role: user.role || 'user' };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  // Protected pages call this first.
  function requireLogin() {
    const user = currentUser();
    if (!user) { window.location.replace('index.html'); return null; }
    return user;
  }
  // Admin-only page. Normal users are sent back to Explore.
  function requireAdmin() {
    const user = requireLogin();
    if (!user) return null;
    if (!isAdmin(user)) { window.location.replace('explore.html'); return null; }
    return user;
  }

  function updateName(newName) {
    const users = getUsers();
    const user = users.find(u => u.email === sessionEmail());
    if (!user) return false;
    user.name = newName.trim();
    saveUsers(users);
    return true;
  }

  async function changePassword(oldPw, newPw) {
    const users = getUsers();
    const user = users.find(u => u.email === sessionEmail());
    if (!user) return { ok: false, error: 'Session expired. Please log in again.' };
    if (user.passwordHash !== await hashPassword(oldPw)) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
    user.passwordHash = await hashPassword(newPw);
    saveUsers(users);
    return { ok: true };
  }

  /* ----- forgot password (security question) ----- */
  function getSecurityQuestion(email) {
    const user = getUsers().find(u => u.email === email.trim().toLowerCase());
    if (!user) return { ok: false, error: 'No account found with this email.' };
    if (!user.secQuestion) {
      return { ok: false, error: 'This account has no security question set, so the password cannot be reset here.' };
    }
    return { ok: true, question: user.secQuestion };
  }

  async function resetPassword(email, answer, newPw) {
    const users = getUsers();
    const user = users.find(u => u.email === email.trim().toLowerCase());
    if (!user || !user.secAnswerHash) return { ok: false, error: 'Password cannot be reset for this account.' };
    if (user.secAnswerHash !== await hashPassword(normAnswer(answer))) {
      return { ok: false, error: 'Security answer is incorrect.' };
    }
    user.passwordHash = await hashPassword(newPw);
    saveUsers(users);
    return { ok: true };
  }

  // Set or change the security question from the Profile page.
  async function setSecurity(question, answer, password) {
    const users = getUsers();
    const user = users.find(u => u.email === sessionEmail());
    if (!user) return { ok: false, error: 'Session expired. Please log in again.' };
    if (user.passwordHash !== await hashPassword(password)) {
      return { ok: false, error: 'Password is incorrect.' };
    }
    user.secQuestion = question;
    user.secAnswerHash = await hashPassword(normAnswer(answer));
    saveUsers(users);
    return { ok: true };
  }

  /* ----- deleting accounts ----- */
  function purgeUserData(email) {
    USER_DATA_PREFIXES.forEach(p => localStorage.removeItem(p + email));
  }

  // Deletes the user's own account AND all their saved data.
  async function deleteAccount(password) {
    const email = sessionEmail();
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (!user) return { ok: false, error: 'Session expired. Please log in again.' };
    if (isAdmin(user)) return { ok: false, error: 'The administrator account cannot be deleted.' };
    if (user.passwordHash !== await hashPassword(password)) {
      return { ok: false, error: 'Password is incorrect. Account was not deleted.' };
    }
    saveUsers(users.filter(u => u.email !== email));
    purgeUserData(email);
    localStorage.removeItem(SESSION_KEY);
    return { ok: true };
  }

  /* ---------- per-user data helpers ---------- */
  const userKey = (prefix) => prefix + sessionEmail();

  /* ---------- wishlist (notes + visited) ---------- */
  function getWishlist() { return read(userKey(WISH_PREFIX), []); }
  function isSaved(id) { return getWishlist().some(i => i.id === id); }

  // item = { id, type: 'country' | 'place', title, subtitle, image, url }
  // Returns true if now saved, false if it was removed.
  function toggleWishlist(item) {
    const list = getWishlist();
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      list.splice(idx, 1);
      write(userKey(WISH_PREFIX), list);
      updateNavCount();
      return false;
    }
    list.unshift(Object.assign({ savedAt: Date.now(), visited: false, note: '' }, item));
    write(userKey(WISH_PREFIX), list);
    updateNavCount();
    return true;
  }

  // Change fields of a saved item, e.g. { note: 'go in March' } or { visited: true }
  function updateWishItem(id, patch) {
    const list = getWishlist();
    const item = list.find(i => i.id === id);
    if (!item) return null;
    Object.assign(item, patch);
    write(userKey(WISH_PREFIX), list);
    return item;
  }

  function removeFromWishlist(id) {
    const list = getWishlist();
    const removed = list.find(i => i.id === id);
    write(userKey(WISH_PREFIX), list.filter(i => i.id !== id));
    updateNavCount();
    return removed;
  }

  function restoreToWishlist(item) {
    const list = getWishlist();
    if (!list.some(i => i.id === item.id)) {
      list.unshift(item);
      write(userKey(WISH_PREFIX), list);
      updateNavCount();
    }
  }

  function clearWishlist() {
    write(userKey(WISH_PREFIX), []);
    updateNavCount();
  }

  /* ---------- recent searches (last 5 countries) ---------- */
  function getRecent() { return read(userKey(RECENT_PREFIX), []); }
  function addRecent(name) {
    const list = getRecent().filter(n => n.toLowerCase() !== name.toLowerCase());
    list.unshift(name);
    write(userKey(RECENT_PREFIX), list.slice(0, 5));
  }
  function clearRecent() { write(userKey(RECENT_PREFIX), []); }

  /* ---------- trip plans ---------- */
  function getPlans() { return read(userKey(PLANS_PREFIX), []); }
  function savePlan(plan) {
    const list = getPlans();
    list.unshift(Object.assign({ id: 'plan' + Date.now(), createdAt: new Date().toISOString() }, plan));
    write(userKey(PLANS_PREFIX), list);
  }
  function deletePlan(id) { write(userKey(PLANS_PREFIX), getPlans().filter(p => p.id !== id)); }

  /* ---------- admin tools ---------- */
  function adminSummary() {
    if (!isAdmin(currentUser())) return null;
    const users = getUsers().filter(u => u.role !== 'admin').map(u => {
      const wish = read(WISH_PREFIX + u.email, []);
      return {
        name: u.name, email: u.email, createdAt: u.createdAt,
        saved: wish.length, visited: wish.filter(i => i.visited).length,
        wishlist: wish
      };
    });
    const counts = {};
    users.forEach(u => u.wishlist.filter(i => i.type === 'country').forEach(i => {
      counts[i.title] = (counts[i.title] || 0) + 1;
    }));
    const topCountries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { users, topCountries };
  }

  function adminDeleteUser(email) {
    if (!isAdmin(currentUser())) return false;
    const target = getUsers().find(u => u.email === email);
    if (!target || target.role === 'admin') return false;
    saveUsers(getUsers().filter(u => u.email !== email));
    purgeUserData(email);
    return true;
  }

  /* ---------- country lookup (used by Compare) ---------- */
  async function fetchCountry(rawName) {
    const query = NAME_ALIASES[rawName.trim().toLowerCase()] || rawName.trim();
    const res = await fetch('https://countries.dev/name/' + encodeURIComponent(query));
    if (!res.ok) throw new Error('not-found');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('not-found');
    const lower = query.toLowerCase();
    const exact = data.find(i => i.name.toLowerCase() === lower);
    if (exact) return exact;
    const starts = data.filter(i => i.name.toLowerCase().startsWith(lower)).sort((a, b) => a.name.length - b.name.length);
    return starts[0] || data[0];
  }

  /* ---------- navigation bar ---------- */
  function renderNav(active) {
    const mount = document.getElementById('navMount');
    if (!mount) return;
    const user = currentUser();
    const link = (href, label, key, extra) =>
      '<a href="' + href + '"' + (active === key ? ' class="current"' : '') + '>' + label + (extra || '') + '</a>';

    mount.innerHTML =
      '<nav class="topnav"><div class="topnav-inner">' +
        '<a class="brand" href="explore.html">Country <span>Explorer</span></a>' +
        '<div class="nav-links">' +
          link('explore.html', 'Explore', 'explore') +
          link('wishlist.html', 'Wishlist', 'wishlist', '<span class="badge" id="navCount">0</span>') +
          link('compare.html', 'Compare', 'compare') +
          link('planner.html', 'Planner', 'planner') +
          (isAdmin(user) ? link('admin.html', 'Admin', 'admin') : '') +
          link('profile.html', user ? esc(user.name.split(' ')[0]) : 'Profile', 'profile') +
          '<button type="button" class="theme-btn" id="themeBtn"></button>' +
          '<button type="button" id="logoutBtn">Log out</button>' +
        '</div>' +
      '</div></nav>';

    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    applyTheme();
    updateNavCount();
  }

  function updateNavCount() {
    const el = document.getElementById('navCount');
    if (el) el.textContent = getWishlist().length;
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(message, actionLabel, actionFn) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.innerHTML = '<span>' + esc(message) + '</span>';
    if (actionLabel && actionFn) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = actionLabel;
      btn.addEventListener('click', () => { actionFn(); el.classList.remove('show'); });
      el.appendChild(btn);
    }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 5000 : 2200);
  }

  /* ---------- photo background ---------- */
  function setCollage(urls) {
    const box = document.getElementById('bgCollage');
    if (!box) return;
    box.innerHTML = '';
    urls.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      box.appendChild(img);
    });
  }

  window.CE = {
    DEFAULT_BG, SECURITY_QUESTIONS, ADMIN_EMAIL, esc,
    currentUser, isAdmin, register, login, logout, requireLogin, requireAdmin,
    updateName, changePassword, getSecurityQuestion, resetPassword, setSecurity, deleteAccount,
    getWishlist, isSaved, toggleWishlist, updateWishItem, removeFromWishlist, restoreToWishlist, clearWishlist,
    getRecent, addRecent, clearRecent, getPlans, savePlan, deletePlan,
    adminSummary, adminDeleteUser, fetchCountry,
    renderNav, updateNavCount, toast, setCollage, toggleTheme, mountThemeButton
  };
})();
