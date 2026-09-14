/* NCT Seoul Map · 账号 / 路线集 / 共享 / 编辑记录（前端 v2：全内联表单，无系统弹窗） */
(function () {
  'use strict';
  var TOKEN_KEY = 'nct_token';
  var API_KEY = 'nct_api_base';
  var state = { token: localStorage.getItem(TOKEN_KEY) || '', user: null, tab: 'mine', authMode: 'login',
    folders: [], folder: null, pubFolders: [], pubDetail: null, logs: [], showLogs: false,
    ui: { newName: '', newVis: 'private', renameSetId: null, renameSetVal: '', visEdit: false, delSetId: null,
          shareName: '', renamingRouteId: null, routeRenameVal: '', routeName: '', newRouteName: '', delRouteId: null, autoPlan: true } };

  function apiBase() { return (localStorage.getItem(API_KEY) || '').trim().replace(/\/$/, ''); }
  function api(path, opts) {
    var base = apiBase();
    opts = opts || {}; opts.headers = opts.headers || {}; opts.headers['Content-Type'] = 'application/json';
    if (state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
    if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
    if (window.NCTLocalAccount && window.NCTLocalAccount.available()) return window.NCTLocalAccount.api(path, opts);
    return fetch(base + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ('请求失败 ' + r.status)); return j; });
    });
  }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; }); }
  function toast(m) { var t = $('acct-toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2400); }
  function visLabel(v) { return v === 'private' ? '私密' : (v === 'public' ? '公开' : '共享'); }
  function suggestSetName() {
    var max = 0; state.folders.forEach(function (f) { var m = /^我的路线集(\d+)$/.exec(f.name); if (m) max = Math.max(max, Number(m[1])); });
    return '我的路线集' + (max + 1);
  }

  /* ================= DOM 骨架 ================= */
  function buildDOM() {
    var top = document.querySelector('#topbar .tb-actions');
    if (top && !$('acct-btn')) {
      var b = document.createElement('button'); b.id = 'acct-btn'; b.className = 'hbtn'; b.type = 'button'; b.textContent = '👤 登录';
      top.insertBefore(b, top.firstChild); b.addEventListener('click', openModal);
    }
    if (!$('acct-modal')) {
      var wrap = document.createElement('div'); wrap.id = 'acct-modal';
      wrap.innerHTML = '<div class="acct-backdrop"></div><div class="acct-panel">'
        + '<div class="acct-head"><h3>🔐 账号 · 我的路线</h3><span class="acct-user" id="acct-user"></span>'
        + '<button class="acct-close" id="acct-close" aria-label="关闭">✕</button></div>'
        + '<div class="acct-tabs"><button class="acct-tab" data-tab="mine">我的路线集</button>'
        + '<button class="acct-tab" data-tab="public">公开路线集</button>'
        + '<button class="acct-tab" data-tab="account">账号</button></div>'
        + '<div class="acct-body" id="acct-body"></div></div>';
      document.body.appendChild(wrap);
      var t = document.createElement('div'); t.id = 'acct-toast'; t.className = 'acct-toast'; document.body.appendChild(t);
      wrap.querySelector('.acct-backdrop').addEventListener('click', closeModal);
      $('acct-close').addEventListener('click', closeModal);
      wrap.querySelectorAll('.acct-tab').forEach(function (btn) { btn.addEventListener('click', function () { state.tab = btn.dataset.tab; render(); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('acct-modal').classList.contains('open')) closeModal(); });
    }
  }
  function openModal() { $('acct-modal').classList.add('open'); render(); }
  function closeModal() { $('acct-modal').classList.remove('open'); }

  /* ================= 账号表单 ================= */
  function authHTML(mode) {
    if (state.user) {
      return '<div class="acct-card"><h4>当前账号</h4><div class="acct-row"><b>' + esc(state.user.username) + '</b>'
        + '<button class="acct-btn plain" data-act="logout">退出登录</button></div></div>';
    }
    var tabs = '<div class="acct-row" style="margin-bottom:10px">'
      + '<button class="acct-btn ' + (mode === 'login' ? 'primary' : 'plain') + '" data-act="mode-login">登录</button>'
      + '<button class="acct-btn ' + (mode === 'register' ? 'primary' : 'plain') + '" data-act="mode-register">注册</button>'
      + '<button class="acct-btn ' + (mode === 'recover' ? 'primary' : 'plain') + '" data-act="mode-recover">找回密码</button></div>';
    if (mode === 'register') {
      return tabs + '<div class="acct-card"><h4>注册（密码至少 8 位，且不能与用户名相同）</h4>'
        + '<div class="acct-field">用户名（3–24 位字母/数字/_-.）<input id="acct-u" autocomplete="username"><div class="acct-field-hint" id="acct-u-hint"></div></div>'
        + '<div class="acct-field">密码（≥8 位，不能等于用户名）<input id="acct-p" type="password" autocomplete="new-password"><div class="acct-field-hint" id="acct-p-hint"></div></div>'
        + '<div class="acct-field">确认密码<input id="acct-p2" type="password" autocomplete="new-password"><div class="acct-field-hint" id="acct-p2-hint"></div></div>'
        + '<div class="acct-field">找回问题（账号丢失时凭它找回）<input id="acct-q" placeholder="如：我的第一张专辑是？"></div>'
        + '<div class="acct-field">找回答案<input id="acct-a"></div>'
        + '<div class="acct-row"><button class="acct-btn primary" data-act="register">注册并登录</button></div>'
        + '<div class="acct-hint" style="margin-top:8px">答案不区分大小写与多余空格。</div></div>';
    }
    if (mode === 'recover') {
      return tabs + '<div class="acct-card"><h4>找回密码</h4>'
        + '<div class="acct-field">用户名<input id="acct-ru"></div>'
        + '<div class="acct-row"><button class="acct-btn" data-act="get-question">获取找回问题</button><span class="acct-hint" id="acct-qtext"></span></div>'
        + '<div class="acct-field" style="margin-top:8px">找回答案<input id="acct-ra"></div>'
        + '<div class="acct-field">新密码（≥8 位，不能等于用户名）<input id="acct-rp" type="password"></div>'
        + '<div class="acct-row"><button class="acct-btn primary" data-act="recover">重置密码</button></div></div>';
    }
    return tabs + '<div class="acct-card"><h4>登录</h4>'
      + '<div class="acct-field">用户名<input id="acct-u"></div>'
      + '<div class="acct-field">密码<input id="acct-p" type="password"></div>'
      + '<div class="acct-row"><button class="acct-btn primary" data-act="login">登录</button></div></div>';
  }

  function bindRegisterValidation() {
    var u = $('acct-u'), p = $('acct-p'), p2 = $('acct-p2');
    if (!u || !p || !p2) return;
    function setHint(el, box, text, ok) {
      var hint = $(box); if (!hint) return;
      hint.textContent = text || ''; hint.className = 'acct-field-hint' + (text ? (ok ? ' ok' : ' err') : '');
      el.classList.toggle('invalid', !!text && !ok); el.classList.toggle('valid', !!text && ok);
    }
    function validate() {
      var uv = u.value.trim(), pv = p.value, p2v = p2.value;
      var uOk = /^[A-Za-z0-9_\-\.]{3,24}$/.test(uv);
      setHint(u, 'acct-u-hint', uv ? (uOk ? '✓ 用户名可用' : '用户名需 3–24 位字母/数字/_-.（不能含中文或空格）') : '', uOk);
      var msg = '', ok = false;
      if (pv) {
        if (pv.length < 8) msg = '✕ 密码至少 8 位（当前 ' + pv.length + ' 位）';
        else if (uv && pv.toLowerCase() === uv.toLowerCase()) msg = '✕ 密码不能与用户名相同';
        else { msg = '✓ 密码可用'; ok = true; }
      }
      setHint(p, 'acct-p-hint', msg, ok);
      var m2 = '', o2 = false;
      if (p2v) { if (p2v !== pv) m2 = '✕ 两次输入的密码不一致'; else { m2 = '✓ 两次输入一致'; o2 = true; } }
      setHint(p2, 'acct-p2-hint', m2, o2);
      return uOk && pv.length >= 8 && pv.toLowerCase() !== uv.toLowerCase() && pv === p2v;
    }
    [u, p, p2].forEach(function (el) { el.addEventListener('input', validate); });
    validate(); window.__acctValidate = validate;
  }

  /* ================= 数据加载 ================= */
  function loadMe() {
    if (!state.token) { state.user = null; return Promise.resolve(); }
    return api('/api/auth/me').then(function (j) { state.user = j.user; }).catch(function () { state.token = ''; localStorage.removeItem(TOKEN_KEY); state.user = null; });
  }
  function loadFolders(keep) { return api('/api/folders').then(function (j) { state.folders = j.folders || []; if (!keep) state.folder = null; }); }
  function loadFolder(id) { return api('/api/folders/' + id).then(function (j) { state.folder = j.folder; state.logs = []; state.showLogs = false; }); }
  function loadPublic(q) { return api('/api/public/folders' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (j) { state.pubFolders = j.folders || []; }); }
  function defaultRouteName(f) { return '路线 ' + (((f.routes && f.routes.length) || 0) + 1) + ' · ' + new Date().toLocaleDateString(); }
  function defaultCustomRouteName(f) {
    var max = 0; (f.routes || []).forEach(function (r) { var m = /^自定义路线(\d+)$/.exec(r.name); if (m) max = Math.max(max, Number(m[1])); });
    return '自定义路线' + (max + 1);
  }

  /* ================= 渲染 ================= */
  function detailHTML(f) {
    var ui = state.ui;
    if (!f) return '<div class="acct-card"><div class="acct-hint">← 请在左侧选择一个路线集</div></div>';
    var h = '<div class="acct-card"><h4>路线集：' + esc(f.name) + '<span class="acct-tag ' + f.visibility + '">' + visLabel(f.visibility) + '</span></h4>';
    h += '<div class="acct-hint">' + esc(f.owner) + ' · 路线 ' + ((f.routes && f.routes.length) || f.routeCount) + ' 条' + (f.canEdit ? '' : ' · 只读') + '</div>';
    h += '<div class="acct-row" style="margin-top:8px">';
    if (f.isOwner) {
      if (ui.renameSetId === f.id) {
        h += '<input id="acct-rename-set" value="' + esc(ui.renameSetVal || f.name) + '" style="flex:1;min-width:140px">'
          + '<button class="acct-btn primary" data-act="do-rename-set">保存名称</button><button class="acct-btn plain" data-act="cancel-rename-set">取消</button>';
      } else h += '<button class="acct-btn plain" data-act="ask-rename-set">重命名</button>';
      if (ui.visEdit) {
        h += '<select id="acct-vis-select"><option value="private"' + (f.visibility === 'private' ? ' selected' : '') + '>私密（仅自己）</option>'
          + '<option value="public"' + (f.visibility === 'public' ? ' selected' : '') + '>公开（他人只读）</option>'
          + '<option value="shared"' + (f.visibility === 'shared' ? ' selected' : '') + '>共享（成员可改）</option></select>'
          + '<button class="acct-btn primary" data-act="do-set-vis">保存可见性</button><button class="acct-btn plain" data-act="cancel-vis">取消</button>';
      } else h += '<button class="acct-btn plain" data-act="ask-vis">修改可见性</button>';
      if (ui.delSetId === f.id) h += '<button class="acct-btn danger" data-act="do-del-set">确认删除</button><button class="acct-btn plain" data-act="cancel-del-set">取消</button>';
      else h += '<button class="acct-btn danger" data-act="ask-del-set">删除路线集</button>';
    }
    var participant = f.isOwner || (f.sharedWith || []).some(function (x) { return state.user && x.id === state.user.id; });
    if (participant) h += '<button class="acct-btn plain" data-act="view-logs">' + (state.showLogs ? '收起编辑记录' : '查看编辑记录') + '</button>';
    h += '</div>';
    if (f.visibility === 'shared') {
      h += '<div style="margin-top:10px"><h4>共享成员</h4><div class="acct-row">';
      (f.sharedWith || []).forEach(function (u) {
        h += '<span class="acct-btn plain" style="cursor:default">' + esc(u.username)
          + (f.isOwner ? ' <button class="acct-btn danger" data-act="remove-share" data-uid="' + u.id + '" style="margin-left:6px">移除</button>' : '') + '</span>';
      });
      if (f.isOwner) h += '<input id="acct-share-name" placeholder="输入要共享的用户名" value="' + esc(ui.shareName) + '"><button class="acct-btn" data-act="add-share">添加共享</button>';
      h += '</div><div class="acct-hint">共享成员可以在这个路线集里添加/修改/删除路线；所有改动都会记入编辑记录。</div></div>';
    }
    if (state.showLogs) {
      h += '<div style="margin-top:10px"><h4>编辑记录</h4>';
      if (!state.logs.length) h += '<div class="acct-hint">暂无记录</div>';
      state.logs.forEach(function (l) {
        h += '<div class="acct-log"><b>' + esc(l.username) + '</b> · ' + esc(actionCN(l.action)) + ' <span class="t">' + esc(l.createdAt) + '</span>'
          + (l.detail ? '<div class="t">' + esc(JSON.stringify(l.detail)).slice(0, 150) + '</div>' : '') + '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
    if (f.canEdit) {
      var sel = (window.NCTMap && window.NCTMap.getRouteIds()) ? window.NCTMap.getRouteIds().length : 0;
      h += '<div class="acct-card" style="margin-top:10px"><h4>➕ 在路线集中添加路线</h4>'
        + '<div class="acct-pick-map"><div><b>从地图准确选点</b><div class="acct-hint">地图标记和地点详情都会显示明确的「加入路线」按钮，选完可直接规划并保存到本路线集。</div></div>'
        + '<label class="acct-check"><input id="acct-auto-plan" type="checkbox"' + (ui.autoPlan !== false ? ' checked' : '') + '> 选完后自动规划最优路线</label>'
        + '<button class="acct-btn primary" data-act="pick-on-map">📍 打开地图选点</button></div>'
        + '<div class="acct-divider"><span>或者</span></div>'
        + '<div class="acct-row"><input id="acct-route-name" placeholder="给当前地图规划命名" value="' + esc(ui.routeName || '') + '" style="flex:1;min-width:150px">'
        + '<button class="acct-btn" data-act="save-route">保存当前规划</button></div>'
        + '<div class="acct-hint">当前地图已选 ' + sel + ' 个地点；保存内容包含出发地与访问顺序。</div>'
        + '<div class="acct-divider"><span>或者新建空白路线</span></div>'
        + '<div class="acct-row"><input id="acct-new-route-name" placeholder="' + esc(defaultCustomRouteName(f)) + '" value="' + esc(ui.newRouteName || '') + '" style="flex:1;min-width:150px">'
        + '<button class="acct-btn" data-act="create-route">＋ 新建路线</button></div>'
        + '<div class="acct-hint">空白路线会按「自定义路线1、2、3……」命名；之后可载入并更新地点。</div></div>';
    }
    h += '<div class="acct-card" style="margin-top:10px"><h4>路线列表</h4>';
    if (!f.routes || !f.routes.length) h += '<div class="acct-hint">该路线集还没有路线，先在上方保存一条吧。</div>';
    (f.routes || []).forEach(function (r) {
      h += '<div class="acct-route"><div class="name">' + esc(r.name) + '</div>'
        + '<div class="meta">' + r.stops.length + ' 个地点' + (r.origin ? ' · 出发：' + esc(r.origin) : '') + ' · ' + esc(r.updatedAt) + '</div><div class="acct-row">'
        + '<button class="acct-btn primary" data-act="load-route" data-rid="' + r.id + '">载入规划</button>';
      if (f.canEdit) h += '<button class="acct-btn" data-act="update-route-stops" data-rid="' + r.id + '">更新为当前规划</button>';
      if (f.canEdit) {
        if (ui.renamingRouteId === r.id) {
          h += '<input id="acct-route-rename" value="' + esc(ui.routeRenameVal || r.name) + '" style="min-width:130px">'
            + '<button class="acct-btn" data-act="do-rename-route" data-rid="' + r.id + '">保存</button><button class="acct-btn plain" data-act="cancel-rename-route">取消</button>';
        } else h += '<button class="acct-btn plain" data-act="ask-rename-route" data-rid="' + r.id + '">重命名</button>';
        if (ui.delRouteId === r.id) h += '<button class="acct-btn danger" data-act="do-del-route" data-rid="' + r.id + '">确认删除</button><button class="acct-btn plain" data-act="cancel-del-route">取消</button>';
        else h += '<button class="acct-btn danger" data-act="ask-del-route" data-rid="' + r.id + '">删除</button>';
      }
      h += '</div></div>';
    });
    return h + '</div>';
  }
  function actionCN(a) {
    return ({ create_folder:'新建路线集', update_folder:'修改路线集设置', share_add:'添加共享成员', share_remove:'移除共享成员',
      create_route:'新建路线', update_route:'修改路线', delete_route:'删除路线' })[a] || a;
  }
  function publicListHTML() {
    if (!state.pubFolders.length) return '<div class="acct-card"><div class="acct-hint">暂无公开路线集（或未连接后端服务器）。</div></div>';
    var h = '<div class="acct-card"><h4>公开路线集（只读）</h4>';
    state.pubFolders.forEach(function (f) {
      h += '<div class="acct-folder" data-act="open-public" data-id="' + f.id + '"><div class="name">' + esc(f.name) + '<span class="acct-tag public">公开</span></div>'
        + '<div class="meta">@' + esc(f.owner) + ' · ' + f.routeCount + ' 条路线 · ' + esc(f.updatedAt) + '</div></div>';
    });
    return h + '</div>';
  }
  function render() {
    var body = $('acct-body'); if (!body) return;
    if (state.user) document.body.classList.remove('guest-mode');
    document.querySelectorAll('.acct-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === state.tab); });
    $('acct-user').textContent = state.user ? ('已登录：' + state.user.username) : '未登录';
    if (state.tab === 'account') {
      body.innerHTML = authHTML(state.authMode || 'login');
      if ((state.authMode || 'login') === 'register') setTimeout(bindRegisterValidation, 0);
      return;
    }
    if (state.tab === 'public') {
      body.innerHTML = '<div class="acct-card"><h4>浏览其他用户的公开路线集</h4>'
        + '<div class="acct-row"><input id="acct-pub-q" placeholder="搜索用户名 / 路线集名" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#fff;border-radius:8px;padding:8px 10px">'
        + '<button class="acct-btn" data-act="search-public">搜索</button></div></div>'
        + '<div style="margin-top:10px">' + (state.pubDetail ? detailHTML(state.pubDetail) : publicListHTML()) + '</div>';
      return;
    }
    if (!state.user) { body.innerHTML = '<div class="acct-card"><h4>我的路线集</h4><div class="acct-hint">登录后即可创建路线集、保存路线、共享给其他用户。</div><div class="acct-row" style="margin-top:8px"><button class="acct-btn primary" data-act="goto-login">登录 / 注册</button></div></div>'; return; }
    if (!state.ui.newName) state.ui.newName = suggestSetName();
    var left = '<div class="acct-card"><h4>我的路线集</h4>'
      + '<div class="acct-row" style="margin-bottom:8px"><input id="acct-new-name" placeholder="' + esc(suggestSetName()) + '" value="' + esc(state.ui.newName) + '" style="flex:1;min-width:120px">'
      + '<select id="acct-new-vis"><option value="private"' + (state.ui.newVis === 'private' ? ' selected' : '') + '>私密</option>'
      + '<option value="public"' + (state.ui.newVis === 'public' ? ' selected' : '') + '>公开</option>'
      + '<option value="shared"' + (state.ui.newVis === 'shared' ? ' selected' : '') + '>共享</option></select>'
      + '<button class="acct-btn primary" data-act="create-set">＋ 新建</button></div>';
    if (!state.folders.length) left += '<div class="acct-hint">还没有路线集，输入名称后点“新建”即可。</div>';
    state.folders.forEach(function (f) {
      left += '<div class="acct-folder' + (state.folder && state.folder.id === f.id ? ' on' : '') + '" data-act="select-folder" data-id="' + f.id + '">'
        + '<div class="name">' + esc(f.name) + '<span class="acct-tag ' + f.visibility + '">' + visLabel(f.visibility) + '</span>'
        + (f.isOwner ? '' : '<span class="acct-tag shared">他人共享</span>') + '</div>'
        + '<div class="meta">' + f.routeCount + ' 条路线 · ' + esc(f.owner) + '</div></div>';
    });
    body.innerHTML = '<div class="acct-grid">' + left + '</div><div>' + detailHTML(state.folder) + '</div></div>';
    bindInline();
  }
  function bindInline() {
    var map = { 'acct-new-name': ['newName'], 'acct-rename-set': ['renameSetVal'], 'acct-route-name': ['routeName'], 'acct-share-name': ['shareName'], 'acct-route-rename': ['routeRenameVal'], 'acct-new-route-name': ['newRouteName'] };
    Object.keys(map).forEach(function (id) {
      var el = $(id); if (!el) return;
      el.addEventListener('input', function () { state.ui[map[id][0]] = el.value; });
      if (id === 'acct-new-name') el.addEventListener('blur', function () { if (!el.value.trim()) { state.ui.newName = suggestSetName(); render(); } });
      if (id === 'acct-new-route-name' && state.folder) el.addEventListener('blur', function () { if (!el.value.trim()) { state.ui.newRouteName = defaultCustomRouteName(state.folder); render(); } });
      if (el.tagName === 'SELECT') el.addEventListener('change', function () { state.ui[map[id][0]] = el.value; });
    });
    var vis = $('acct-new-vis'); if (vis) vis.addEventListener('change', function () { state.ui.newVis = vis.value; });
  }

  /* ================= 行为 ================= */
  function val(id) { var el = $(id); return el ? el.value : ''; }
  function refreshFolder(id) { return loadFolder(id).then(function () { return loadFolders(true); }); }
  function act(name, el) {
    var f = (state.tab === 'public' && state.pubDetail) ? state.pubDetail : state.folder;
    var rid = el && el.dataset ? Number(el.dataset.rid || 0) : 0;
    if (name === 'mode-login') { state.authMode = 'login'; render(); return; }
    if (name === 'mode-register') { state.authMode = 'register'; render(); return; }
    if (name === 'mode-recover') { state.authMode = 'recover'; render(); return; }
    if (name === 'goto-login') { state.tab = 'account'; state.authMode = 'login'; render(); return; }
    if (name === 'logout') { api('/api/auth/logout', { method:'POST' }).catch(function(){}); state.token = ''; state.user = null; state.folders = []; state.folder = null; localStorage.removeItem(TOKEN_KEY); toast('已退出登录'); render(); return; }
    if (name === 'login') return api('/api/auth/login', { method:'POST', body:{ username:val('acct-u'), password:val('acct-p') } })
      .then(function (j) { state.token = j.token; localStorage.setItem(TOKEN_KEY, j.token); state.user = j.user; toast('登录成功'); return loadFolders(); }).then(render).catch(function (e) { toast(e.message); });
    if (name === 'register') {
      var uv0 = val('acct-u').trim(), pv0 = val('acct-p');
      if (!/^[A-Za-z0-9_\-\.]{3,24}$/.test(uv0)) { toast('用户名需 3–24 位字母/数字/_-. '); if (window.__acctValidate) window.__acctValidate(); return; }
      if (pv0.length < 8) { toast('密码至少 8 位'); if (window.__acctValidate) window.__acctValidate(); return; }
      if (pv0.toLowerCase() === uv0.toLowerCase()) { toast('密码不能与用户名相同'); if (window.__acctValidate) window.__acctValidate(); return; }
      if (pv0 !== val('acct-p2')) { toast('两次输入的密码不一致'); if (window.__acctValidate) window.__acctValidate(); return; }
      return api('/api/auth/register', { method:'POST', body:{ username:uv0, password:pv0, question:val('acct-q'), answer:val('acct-a') } })
        .then(function (j) { state.token = j.token; localStorage.setItem(TOKEN_KEY, j.token); state.user = j.user; state.tab = 'mine'; toast('注册成功，已登录'); return loadFolders(); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'get-question') return api('/api/auth/question?username=' + encodeURIComponent(val('acct-ru'))).then(function (j) { $('acct-qtext').textContent = '问题：' + j.question; }).catch(function (e) { toast(e.message); });
    if (name === 'recover') return api('/api/auth/recover', { method:'POST', body:{ username:val('acct-ru'), answer:val('acct-ra'), newPassword:val('acct-rp') } })
      .then(function () { toast('密码已重置，请用新密码登录'); state.authMode = 'login'; render(); }).catch(function (e) { toast(e.message); });

    /* ---- 路线集 ---- */
    if (name === 'create-set') {
      var nm = (val('acct-new-name') || '').trim() || suggestSetName();
      var vs = val('acct-new-vis') || 'private';
      return api('/api/folders', { method:'POST', body:{ name:nm, visibility:vs } }).then(function (j) {
        state.ui.newName = ''; state.ui.newVis = 'private';
        return loadFolders().then(function () { return loadFolder(j.folder.id); }).then(function () { toast('已创建「' + nm + '」'); render(); });
      }).catch(function (e) { toast(e.message); });
    }
    if (name === 'select-folder') return loadFolder(Number(el.dataset.id)).then(render).catch(function (e) { toast(e.message); });
    if (name === 'ask-rename-set' && f) { state.ui.renameSetId = f.id; state.ui.renameSetVal = f.name; render(); return; }
    if (name === 'cancel-rename-set') { state.ui.renameSetId = null; render(); return; }
    if (name === 'do-rename-set' && f) {
      var rn = (val('acct-rename-set') || '').trim(); if (!rn) { toast('名称不能为空'); return; }
      return api('/api/folders/' + f.id, { method:'PATCH', body:{ name:rn } }).then(function () { state.ui.renameSetId = null; toast('已重命名'); return refreshFolder(f.id); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'ask-vis') { state.ui.visEdit = true; render(); return; }
    if (name === 'cancel-vis') { state.ui.visEdit = false; render(); return; }
    if (name === 'do-set-vis' && f) {
      var nv = val('acct-vis-select') || f.visibility;
      return api('/api/folders/' + f.id, { method:'PATCH', body:{ visibility:nv } }).then(function () { state.ui.visEdit = false; toast('可见性已改为「' + visLabel(nv) + '」'); return refreshFolder(f.id); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'ask-del-set' && f) { state.ui.delSetId = f.id; render(); return; }
    if (name === 'cancel-del-set') { state.ui.delSetId = null; render(); return; }
    if (name === 'do-del-set' && f) {
      return api('/api/folders/' + f.id, { method:'DELETE' }).then(function () { state.ui.delSetId = null; state.folder = null; toast('已删除路线集'); return loadFolders(); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'add-share' && f) {
      var sn = (val('acct-share-name') || '').trim(); if (!sn) { toast('请输入用户名'); return; }
      return api('/api/folders/' + f.id + '/share', { method:'POST', body:{ username:sn } }).then(function () { state.ui.shareName = ''; toast('已共享给 ' + sn); return refreshFolder(f.id); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'remove-share' && f) {
      return api('/api/folders/' + f.id + '/share/' + el.dataset.uid, { method:'DELETE' }).then(function () { toast('已移除'); return refreshFolder(f.id); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'pick-on-map' && f) {
      var autoEl = document.getElementById('acct-auto-plan');
      state.ui.autoPlan = !!(autoEl && autoEl.checked);
      if (window.NCTMap && window.NCTMap.beginRouteSetSelection) {
        closeModal();
        window.NCTMap.beginRouteSetSelection({ id:f.id, name:f.name, autoPlan:state.ui.autoPlan });
        toast('已进入地图选点：请为「' + f.name + '」勾选地点');
      }
      return;
    }
    if (name === 'view-logs' && f) {
      if (state.showLogs) { state.showLogs = false; render(); return; }
      return api('/api/folders/' + f.id + '/logs').then(function (j) { state.logs = j.logs || []; state.showLogs = true; render(); }).catch(function (e) { toast(e.message); });
    }

    /* ---- 路线 ---- */
    if (name === 'save-route' && f) {
      var ids = ((window.NCTMap && (window.NCTMap.getLastOrder() || window.NCTMap.getRouteIds())) || []).filter(function (id) { return id !== '__origin__'; });
      if (!ids || ids.length < 2) { toast('请先在“路线规划”里勾选至少 2 个地点'); return; }
      var rname = (val('acct-route-name') || '').trim() || defaultRouteName(f);
      var origin = window.NCTMap ? window.NCTMap.getOrigin() : '';
      return api('/api/folders/' + f.id + '/routes', { method:'POST', body:{ name:rname, origin:origin, stops:ids } })
        .then(function () { state.ui.routeName = ''; toast('已保存路线「' + rname + '」'); return refreshFolder(f.id); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'create-route' && f) {
      var nr0 = (val('acct-new-route-name') || '').trim() || defaultCustomRouteName(f);
      return api('/api/folders/' + f.id + '/routes', { method:'POST', body:{ name:nr0, origin:'', stops:[] } })
        .then(function () { state.ui.newRouteName = ''; toast('已新建路线「' + nr0 + '」'); return refreshFolder(f.id); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'update-route-stops' && f) {
      var idsU = ((window.NCTMap && (window.NCTMap.getLastOrder() || window.NCTMap.getRouteIds())) || []).filter(function (id) { return id !== '__origin__'; });
      if (!idsU || idsU.length < 2) { toast('请先在“路线规划”里勾选至少 2 个地点'); return; }
      var originU = window.NCTMap ? window.NCTMap.getOrigin() : '';
      return api('/api/routes/' + rid, { method:'PATCH', body:{ stops:idsU, origin:originU } })
        .then(function () { toast('已用当前规划更新该路线'); return refreshFolder(f.id); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'load-route' && f) {
      var r = (f.routes || []).filter(function (x) { return x.id === rid; })[0];
      if (!r || !window.NCTMap) return;
      window.NCTMap.setRouteIds(r.stops); window.NCTMap.setOrigin(r.origin || ''); window.NCTMap.setRouteMode(false);
      if (window.NCTMap.setTargetFolder) window.NCTMap.setTargetFolder({ id:f.id, name:f.name });
      if (window.NCTMap.openRoutePlanner) window.NCTMap.openRoutePlanner();
      toast('已载入「' + r.name + '」，可点“规划最优路线”'); closeModal();
      var t = document.getElementById('route-toggle'); if (t) t.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }
    if (name === 'ask-rename-route' && f) { var rr = (f.routes || []).filter(function (x) { return x.id === rid; })[0]; if (!rr) return; state.ui.renamingRouteId = rid; state.ui.routeRenameVal = rr.name; render(); return; }
    if (name === 'cancel-rename-route') { state.ui.renamingRouteId = null; render(); return; }
    if (name === 'do-rename-route' && f) {
      var nr = (val('acct-route-rename') || '').trim(); if (!nr) { toast('名称不能为空'); return; }
      return api('/api/routes/' + rid, { method:'PATCH', body:{ name:nr } }).then(function () { state.ui.renamingRouteId = null; toast('已重命名'); return refreshFolder(f.id); }).then(render).catch(function (e) { toast(e.message); });
    }
    if (name === 'ask-del-route') { state.ui.delRouteId = rid; render(); return; }
    if (name === 'cancel-del-route') { state.ui.delRouteId = null; render(); return; }
    if (name === 'do-del-route' && f) {
      return api('/api/routes/' + rid, { method:'DELETE' }).then(function () { state.ui.delRouteId = null; toast('已删除路线'); return refreshFolder(f.id); }).then(render).catch(function (e) { toast(e.message); });
    }

    /* ---- 公开浏览 ---- */
    if (name === 'search-public') { return loadPublic(val('acct-pub-q')).then(function () { state.pubDetail = null; render(); }).catch(function (e) { toast(e.message); }); }
    if (name === 'open-public') { return api('/api/folders/' + el.dataset.id).then(function (j) { state.pubDetail = j.folder; render(); }).catch(function (e) { toast(e.message); }); }
    if (name === 'back-public') { state.pubDetail = null; render(); return; }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var name = el.dataset.act; if (!name) return;
    act(name, el);
  });

  /* ===== 供地图路线规划模块调用（NCTAccount API） ===== */
  function getMyFolders() {
    if (!state.user) return Promise.reject(new Error('请先登录账号'));
    return loadFolders(true).then(function () { return state.folders.slice(); });
  }
  function getFolderById(id) {
    if (!id) return Promise.resolve(null);
    return loadFolder(Number(id)).then(function () { return state.folder; });
  }
  function saveRouteToFolder(folderId, data) {
    if (!state.user) return Promise.reject(new Error('请先登录账号'));
    return api('/api/folders/' + Number(folderId) + '/routes', { method:'POST', body:data }).then(function (j) {
      state.folder = j.folder;
      return loadFolders(true).then(function () { return j.folder; });
    });
  }
  function suggestCustomRouteName(folderId) {
    return getFolderById(folderId).then(function (f) { return defaultCustomRouteName(f || { routes:[] }); });
  }
  function loginAccount(username, password) {
    return api('/api/auth/login', { method:'POST', body:{ username:username, password:password } }).then(function (j) {
      state.token = j.token; localStorage.setItem(TOKEN_KEY, j.token); state.user = j.user;
      return loadFolders().then(function () { return j.user; });
    });
  }
  function registerAccount(data) {
    return api('/api/auth/register', { method:'POST', body:data }).then(function (j) {
      state.token = j.token; localStorage.setItem(TOKEN_KEY, j.token); state.user = j.user;
      return loadFolders().then(function () { return j.user; });
    });
  }
  window.NCTAccount = {
    getUser: function () { return state.user; },
    login: loginAccount,
    register: registerAccount,
    refreshUser: loadMe,
    open: function (tab) { if (tab) state.tab = tab; openModal(); },
    getMyFolders: getMyFolders,
    getFolder: getFolderById,
    saveRoute: saveRouteToFolder,
    suggestCustomRouteName: suggestCustomRouteName
  };

  function boot() {
    buildDOM();
    loadMe().then(function () { if (state.user) return loadFolders(); }).then(function () { render(); }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();



