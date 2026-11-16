/* Per-place likes and comments. Uses the Node backend when available; falls back to localStorage on GitHub Pages. */
(function () {
  'use strict';
  var LIKE_KEY = 'nct_place_likes_v1';
  var COMMENT_KEY = 'nct_place_comments_v1';
  var NICK_KEY = 'nct_comment_nickname';
  var currentPlaceId = null;
  var backendMode = null;
  var currentData = null;
  function $(selector, root) { return (root || document).querySelector(selector); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function token() { return (window.NCTAuth && window.NCTAuth.getToken && window.NCTAuth.getToken()) || localStorage.getItem('nct_week4_token') || ''; }
  function user() { return (window.NCTAuth && window.NCTAuth.getUser && window.NCTAuth.getUser()) || null; }
  function loadJson(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key) || ''); return v || fallback; } catch (e) { return fallback; } }
  function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function now() { return new Date().toISOString(); }
  function fmtTime(value) { try { return new Date(value).toLocaleString('zh-CN', { hour12: false }); } catch (e) { return ''; } }
  function setMsg(text, ok) { var el = $('[data-social-msg]'); if (!el) return; el.textContent = text || ''; el.className = ok ? 'ok' : (text ? 'err' : ''); }
  function localData(placeId) {
    var likes = loadJson(LIKE_KEY, {}); var comments = loadJson(COMMENT_KEY, {});
    var mine = likes[placeId] || { liked: false, count: 0 };
    return { liked: !!mine.liked, likesCount: Number(mine.count || 0), comments: Array.isArray(comments[placeId]) ? comments[placeId].slice() : [], local: true };
  }
  async function api(path, options) {
    options = options || {}; options.headers = Object.assign({}, options.headers || {});
    var t = token(); if (t) options.headers.Authorization = 'Bearer ' + t;
    if (options.body && !options.headers['Content-Type']) options.headers['Content-Type'] = 'application/json';
    var res = await fetch(path, options); var data = null; try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || ('请求失败 ' + res.status));
    return data || {};
  }
  function render(placeId, data) {
    currentPlaceId = placeId; currentData = data;
    var root = document.querySelector('.dp-social[data-place-social-id="' + placeId + '"]'); if (!root) return;
    var likeBtn = $('[data-place-like-id]', root); var count = $('[data-like-count]', root); var icon = $('[data-like-icon]', root);
    if (count) count.textContent = String(data.likesCount || 0);
    if (icon) icon.textContent = data.liked ? '❤️' : '🤍';
    if (likeBtn) likeBtn.classList.toggle('liked', !!data.liked);
    var list = $('[data-comment-list]', root); if (!list) return;
    if (!data.comments || !data.comments.length) list.innerHTML = '<div class="dp-comment-empty">还没有评论，来分享第一个到访体验吧。</div>';
    else list.innerHTML = data.comments.map(function (c) {
      var canDelete = c.canDelete || c.local;
      return '<article class="dp-comment"><div class="dp-comment-top"><b>' + esc(c.author || c.username || '游客') + '</b><time>' + esc(fmtTime(c.createdAt)) + '</time>' + (canDelete ? '<button type="button" class="dp-comment-delete" data-comment-delete="' + esc(c.id) + '">删除</button>' : '') + '</div><p>' + esc(c.text) + '</p></article>';
    }).join('');
    var mode = $('.dp-social-mode', root);
    if (!mode) { mode = document.createElement('div'); mode.className = 'dp-social-mode'; var head = $('.dp-social-head', root); if (head) head.parentNode.insertBefore(mode, head.nextSibling); }
    mode.textContent = data.local ? '本地讨论模式：评论和点赞仅保存在当前浏览器' : '云端讨论模式：所有访客共享评论和点赞';
  }
  async function loadSocial(placeId) {
    currentPlaceId = placeId;
    var root = document.querySelector('.dp-social[data-place-social-id="' + placeId + '"]'); if (!root) return;
    var list = $('[data-comment-list]', root); if (list) list.innerHTML = '<div class="dp-comment-empty">正在加载评论…</div>';
    setMsg('');
    if (backendMode !== false) {
      try { var data = await api('/api/places/' + encodeURIComponent(placeId) + '/social'); backendMode = true; render(placeId, data); return; }
      catch (e) { backendMode = false; }
    }
    render(placeId, localData(placeId));
  }
  async function toggleLike(placeId) {
    if (!currentData) return;
    if (backendMode) {
      if (!user()) { if (window.NCTAuth && window.NCTAuth.open) window.NCTAuth.open(); setMsg('请先登录后再点赞', false); return; }
      try { var data = await api('/api/places/' + encodeURIComponent(placeId) + '/like', { method: 'POST' }); render(placeId, data); }
      catch (e) { setMsg(e.message || '点赞失败', false); }
      return;
    }
    var likes = loadJson(LIKE_KEY, {}); var item = likes[placeId] || { liked: false, count: 0 };
    item.liked = !item.liked; item.count = Math.max(0, Number(item.count || 0) + (item.liked ? 1 : -1));
    likes[placeId] = item; saveJson(LIKE_KEY, likes); render(placeId, localData(placeId));
  }
  async function addComment(placeId, text) {
    text = String(text || '').trim();
    if (!text) return setMsg('评论不能为空', false);
    if (text.length > 500) return setMsg('评论不能超过 500 字', false);
    if (backendMode) {
      if (!user()) { if (window.NCTAuth && window.NCTAuth.open) window.NCTAuth.open(); setMsg('请先登录后再发表评论', false); return; }
      try { await api('/api/places/' + encodeURIComponent(placeId) + '/comments', { method: 'POST', body: JSON.stringify({ text: text }) }); await loadSocial(placeId); }
      catch (e) { setMsg(e.message || '发表评论失败', false); }
      return;
    }
    var nickname = localStorage.getItem(NICK_KEY) || '';
    if (!nickname) { nickname = (window.prompt('请输入你的昵称（最多 20 字）') || '').trim(); if (!nickname) return; nickname = nickname.slice(0, 20); localStorage.setItem(NICK_KEY, nickname); }
    var comments = loadJson(COMMENT_KEY, {}); var list = Array.isArray(comments[placeId]) ? comments[placeId] : [];
    list.unshift({ id: 'local-' + Date.now().toString(36), author: nickname, text: text, createdAt: now(), local: true });
    comments[placeId] = list; saveJson(COMMENT_KEY, comments); render(placeId, localData(placeId)); setMsg('评论已发布', true);
  }
  async function deleteComment(placeId, id) {
    if (!currentData) return;
    if (backendMode) {
      try { await api('/api/comments/' + encodeURIComponent(id), { method: 'DELETE' }); await loadSocial(placeId); }
      catch (e) { setMsg(e.message || '删除评论失败', false); }
      return;
    }
    var comments = loadJson(COMMENT_KEY, {}); comments[placeId] = (comments[placeId] || []).filter(function (c) { return c.id !== id; });
    saveJson(COMMENT_KEY, comments); render(placeId, localData(placeId));
  }
  document.addEventListener('nct:detail-rendered', function (e) { if (e.detail && e.detail.placeId) loadSocial(e.detail.placeId); });
  document.addEventListener('nct:auth-changed', function () { if (currentPlaceId) loadSocial(currentPlaceId); });
  document.addEventListener('click', function (e) {
    var like = e.target.closest ? e.target.closest('[data-place-like-id]') : null; if (like) { toggleLike(like.getAttribute('data-place-like-id')); return; }
    var del = e.target.closest ? e.target.closest('[data-comment-delete]') : null; if (del) deleteComment(currentPlaceId, del.getAttribute('data-comment-delete'));
  });
  document.addEventListener('submit', function (e) {
    var form = e.target.closest ? e.target.closest('[data-comment-form]') : null; if (!form) return;
    e.preventDefault(); var input = $('[data-comment-input]', form); if (input) { addComment(currentPlaceId, input.value); input.value = ''; }
  });
})();
