/* NCT Seoul Map auth: Node API first, browser-local fallback for GitHub Pages. */
(function () {
  'use strict';
  var TOKEN_KEY = 'nct_week4_token';
  var LOCAL_USERS_KEY = 'nct_local_users_v1';
  var LOCAL_SESSION_KEY = 'nct_local_session_v1';
  var GUEST_KEY = 'nct_guest_session_v1';
  var state = { user: null, mode: 'detecting' };
  var splashFinished = false;
  var splashTimer = null;

  window.NCTAuth = {
    getToken: token,
    getUser: function () { return state.user; },
    isLoggedIn: function () { return !!state.user; },
    getMode: function () { return state.mode; },
    open: function () { openModal(); }
  };

  function $(id) { return document.getElementById(id); }
  function token() {
    if (state.mode === 'local') return state.user ? 'local-session' : '';
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(value) {
    try { value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }
  function readJson(key, fallback) {
    try { var value = JSON.parse(localStorage.getItem(key) || ''); return value || fallback; } catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function norm(value) { return String(value == null ? '' : value).trim(); }
  function normAnswer(value) { return norm(value).toLowerCase().replace(/\s+/g, ' '); }
  function msg(id, text, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'auth-msg' + (ok ? ' ok' : (text ? ' err' : ''));
  }
  function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  async function detectMode() {
    try {
      var controller = window.AbortController ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 2500) : null;
      var res = await fetch('/api/health', { cache: 'no-store', signal: controller ? controller.signal : undefined });
      if (timer) clearTimeout(timer);
      if (res.ok) {
        var data = await res.json();
        if (data && data.ok) { state.mode = 'server'; return; }
      }
    } catch (e) {}
    state.mode = 'local';
  }
  var modeReady = detectMode();

  async function api(path, options) {
    options = options || {};
    options.headers = Object.assign({}, options.headers || {});
    if (token()) options.headers.Authorization = 'Bearer ' + token();
    if (options.body && !options.headers['Content-Type']) options.headers['Content-Type'] = 'application/json';
    var res = await fetch(path, options);
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || ('请求失败 ' + res.status));
    return data || {};
  }

  function randomSalt() {
    var bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function fallbackHash(text) {
    var h1 = 0x811c9dc5, h2 = 0x9e3779b9;
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619);
      h2 = Math.imul(h2 ^ c, 2246822519);
    }
    return ('00000000' + (h1 >>> 0).toString(16)).slice(-8) + ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
  }
  async function hashSecret(secret, salt) {
    var text = String(secret);
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      try {
        var enc = new TextEncoder();
        var key = await window.crypto.subtle.importKey('raw', enc.encode(text), 'PBKDF2', false, ['deriveBits']);
        var bits = await window.crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
        return 'pbkdf2:' + Array.prototype.map.call(new Uint8Array(bits), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      } catch (e) {}
    }
    return 'fallback:' + fallbackHash(salt + '|' + text + '|' + salt);
  }
  function localUsers() {
    var users = readJson(LOCAL_USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  }
  function findLocalUser(username) {
    var wanted = norm(username).toLowerCase();
    return localUsers().find(function (user) { return String(user.username || '').toLowerCase() === wanted; }) || null;
  }
  function publicUser(user) { return { id: user.id, username: user.username, local: !!user.local }; }
  function saveLocalSession(user) {
    try { localStorage.setItem(LOCAL_SESSION_KEY, user.username); } catch (e) {}
  }
  function clearLocalSession() {
    try { localStorage.removeItem(LOCAL_SESSION_KEY); } catch (e) {}
  }
  function restoreLocalSession() {
    var username = '';
    try { username = localStorage.getItem(LOCAL_SESSION_KEY) || ''; } catch (e) {}
    return username ? findLocalUser(username) : null;
  }

  function notifyAuth() {
    updateUserUI();
    try { window.dispatchEvent(new CustomEvent('nct:auth-changed', { detail: { user: state.user, mode: state.mode } })); } catch (e) {}
  }
  function finishLogin(user, local) {
    state.user = publicUser(user);
    if (local) saveLocalSession(user);
    try { sessionStorage.removeItem(GUEST_KEY); } catch (e) {}
    notifyAuth();
  }
  function updateUserUI() {
    var label = $('auth-label'), userBox = $('auth-user'), logout = $('auth-logout'), guest = $('auth-guest');
    if (label) label.textContent = state.user ? state.user.username : '登录';
    if (userBox) userBox.textContent = state.user ? ('已登录：' + state.user.username + (state.mode === 'local' ? ' · 本机账号' : '')) : '当前未登录';
    if (logout) logout.hidden = !state.user;
    if (guest) guest.hidden = !!state.user;
  }
  function openModal() {
    var m = $('auth-modal');
    if (!m) return;
    m.hidden = false;
    m.setAttribute('aria-hidden', 'false');
    showTab('login');
  }
  function closeModal() {
    var m = $('auth-modal');
    if (!m) return;
    m.hidden = true;
    m.setAttribute('aria-hidden', 'true');
  }
  function showTab(which) {
    var loginTab = $('auth-tab-login'), regTab = $('auth-tab-register');
    var loginForm = $('auth-login-form'), regForm = $('auth-register-form');
    if (loginTab) loginTab.classList.toggle('on', which === 'login');
    if (regTab) regTab.classList.toggle('on', which === 'register');
    if (loginForm) loginForm.hidden = which !== 'login';
    if (regForm) regForm.hidden = which !== 'register';
  }

  async function restore() {
    await modeReady;
    if (state.mode === 'local') {
      var localUser = restoreLocalSession();
      state.user = localUser ? publicUser(localUser) : null;
      notifyAuth();
      return;
    }
    if (!token()) { notifyAuth(); return; }
    try {
      var data = await api('/api/auth/me');
      state.user = data.user || null;
    } catch (e) {
      setToken('');
      state.user = null;
    }
    notifyAuth();
  }

  async function serverLogin(username, password) {
    var data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: username, password: password }) });
    setToken(data.token);
    finishLogin(data.user, false);
  }
  async function localLogin(username, password) {
    var user = findLocalUser(username);
    if (!user) throw new Error('用户名或密码错误');
    var hash = await hashSecret(password, user.passSalt);
    if (hash !== user.passwordHash) throw new Error('用户名或密码错误');
    finishLogin(user, true);
  }
  async function serverRegister(username, password, question, answer) {
    var data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: username, password: password, question: question, answer: answer }) });
    setToken(data.token);
    finishLogin(data.user, false);
  }
  async function localRegister(username, password, question, answer) {
    if (findLocalUser(username)) throw new Error('用户名已存在');
    var passSalt = randomSalt();
    var answerSalt = randomSalt();
    var user = {
      id: 'local-' + Date.now().toString(36),
      username: username,
      passwordHash: await hashSecret(password, passSalt),
      passSalt: passSalt,
      question: question,
      answerHash: await hashSecret(normAnswer(answer), answerSalt),
      answerSalt: answerSalt,
      createdAt: new Date().toISOString(),
      local: true
    };
    var users = localUsers();
    users.push(user);
    writeJson(LOCAL_USERS_KEY, users);
    finishLogin(user, true);
  }

  async function finishSplash() {
    if (splashFinished) return;
    splashFinished = true;
    if (splashTimer) clearTimeout(splashTimer);
    var splash = $('neo-splash');
    if (splash) {
      splash.classList.add('is-leaving');
      await Promise.race([restore(), delay(1200)]);
      setTimeout(function () { splash.hidden = true; }, 520);
    } else {
      await Promise.race([restore(), delay(1200)]);
    }
    var guestSeen = false;
    try { guestSeen = sessionStorage.getItem(GUEST_KEY) === '1'; } catch (e) {}
    setTimeout(function () {
      if (!state.user && !guestSeen) openModal();
    }, splash ? 540 : 0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var openBtn = $('auth-open'); if (openBtn) openBtn.addEventListener('click', openModal);
    var closeBtn = $('auth-close'); if (closeBtn) closeBtn.addEventListener('click', closeModal);
    var backdrop = document.querySelector('[data-auth-close]'); if (backdrop) backdrop.addEventListener('click', closeModal);
    var guest = $('auth-guest');
    if (guest) guest.addEventListener('click', function () {
      try { sessionStorage.setItem(GUEST_KEY, '1'); } catch (e) {}
      closeModal();
    });
    var tabLogin = $('auth-tab-login'); if (tabLogin) tabLogin.addEventListener('click', function () { showTab('login'); });
    var tabReg = $('auth-tab-register'); if (tabReg) tabReg.addEventListener('click', function () { showTab('register'); });

    var loginForm = $('auth-login-form');
    if (loginForm) loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      msg('auth-login-msg', '正在登录…', true);
      var username = norm($('auth-login-user').value);
      var password = $('auth-login-pass').value;
      try {
        await modeReady;
        if (state.mode === 'local') await localLogin(username, password);
        else await serverLogin(username, password);
        msg('auth-login-msg', '登录成功', true);
        setTimeout(closeModal, 280);
      } catch (err) { msg('auth-login-msg', err.message || '登录失败', false); }
    });

    var regForm = $('auth-register-form');
    if (regForm) regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      msg('auth-reg-msg', '正在注册…', true);
      var username = norm($('auth-reg-user').value);
      var password = $('auth-reg-pass').value;
      var question = norm($('auth-reg-question').value);
      var answer = norm($('auth-reg-answer').value);
      if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) return msg('auth-reg-msg', '用户名需为 3–24 位字母、数字、_、- 或 .', false);
      if (password.length < 8) return msg('auth-reg-msg', '密码至少 8 位', false);
      if (password.toLowerCase() === username.toLowerCase()) return msg('auth-reg-msg', '密码不能与用户名相同', false);
      if (!question || answer.length < 2) return msg('auth-reg-msg', '请设置找回问题与答案', false);
      try {
        await modeReady;
        if (state.mode === 'local') await localRegister(username, password, question, answer);
        else await serverRegister(username, password, question, answer);
        msg('auth-reg-msg', '注册成功，已自动登录', true);
        setTimeout(closeModal, 320);
      } catch (err) { msg('auth-reg-msg', err.message || '注册失败', false); }
    });

    var logout = $('auth-logout');
    if (logout) logout.addEventListener('click', async function () {
      if (state.mode === 'server') { try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) {} setToken(''); }
      else clearLocalSession();
      state.user = null;
      notifyAuth();
      closeModal();
    });

    var splash = $('neo-splash');
    if (splash) {
      splash.addEventListener('click', finishSplash);
      splash.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finishSplash(); }
      });
      splashTimer = setTimeout(finishSplash, 2000);
    } else {
      finishSplash();
    }

    modeReady.then(function () {
      var hint = $('auth-mode-hint');
      if (hint) hint.textContent = state.mode === 'server'
        ? '登录后可跨设备保存账号；游客也可以直接浏览地图和规划路线。'
        : '当前为浏览器本机账号模式，无需填写 IP；账号仅保存在这台设备和当前浏览器。游客也可以直接浏览。';
    });
    updateUserUI();
  });
})();
