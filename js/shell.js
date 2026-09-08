/* =====================================================================
   NCT 首尔同款地图 · App Shell（移动端抽屉 + 快捷分类 + 手势）
   - 底部抽屉（列表）：收起(peek) / 展开(expanded) / 全屏(full)
   - 抓手拖动调整高度；点击标题行/箭头循环切换状态
   - 快捷分类 chips：与侧栏“类型 TYPE”筛选联动（复用 app.js 引擎）
   - 筛选抽屉遮罩 / 关闭按钮；详情面板下拉关闭；浮动按钮定位
   依赖：需在 js/app.js 之后加载（引擎在 DOMContentLoaded 里先建好筛选 DOM）
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var MOBILE = window.matchMedia('(max-width: 767.98px)');
  var PEEK_H = 128;               // 收起高度（与 app.css --peek-h 保持一致）
  var MAX_TOP = 108;              // 全屏时距顶部悬浮栏的余量

  /* ---------------- 底部抽屉状态机 ---------------- */
  var sheet = $('sheet');
  var grip = $('sheet-grip');
  var head = $('sheet-head');
  var chev = $('sheet-expand');
  var fabStack = $('map-fabs');
  var order = ['peek', 'expanded', 'full'];

  function setSheetState(state) {
    if (!sheet) return;
    sheet.classList.remove('expanded', 'full', 'dragging');
    if (state !== 'peek') sheet.classList.add(state);
    sheet.dataset.state = state;
    sheet.style.height = '';       // 交还给 CSS 的 height
    requestAnimationFrame(syncFab);
  }

  function nextState(cur) {
    var i = order.indexOf(cur);
    return order[(i + 1) % order.length];
  }

  function cycleSheet() {
    if (!sheet || !MOBILE.matches) return;
    setSheetState(nextState(sheet.dataset.state || 'peek'));
  }

  function onSheetClick(ev) {
    if (ev.target.closest && ev.target.closest('button')) return;
    cycleSheet();
  }

  if (sheet) {
    if (grip) {
      grip.addEventListener('click', cycleSheet);
      grip.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleSheet(); }
      });
    }
    if (head) head.addEventListener('click', onSheetClick);
    if (chev) chev.addEventListener('click', function (e) { e.stopPropagation(); cycleSheet(); });
    sheet.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'height') syncFab();
    });
  }

  /* ---------- 抓手拖动调整高度（移动端） ---------- */
  if (grip && sheet && MOBILE.matches) {
    var drag = { on: false, startY: 0, startH: 0 };
    function onDown(ev, y) {
      drag.on = true;
      drag.startY = y;
      drag.startH = sheet.offsetHeight;
      sheet.classList.add('dragging');
      sheet.style.transition = 'none';
      if (grip.setPointerCapture) { try { grip.setPointerCapture(ev.pointerId); } catch (e) {} }
      document.body.style.userSelect = 'none';
    }
    function onMove(y) {
      if (!drag.on) return;
      var maxH = window.innerHeight - MAX_TOP;
      var h = Math.min(maxH, Math.max(PEEK_H, drag.startH + (drag.startY - y)));
      sheet.style.height = h + 'px';
      sheet.classList.toggle('expanded', h > PEEK_H + 40);
      syncFab(h);
    }
    function onUp() {
      if (!drag.on) return;
      drag.on = false;
      sheet.style.transition = '';
      var h = sheet.offsetHeight;
      var maxH = window.innerHeight - MAX_TOP;
      var state = h <= PEEK_H + 30 ? 'peek' : (h >= maxH * 0.72 ? 'full' : 'expanded');
      setSheetState(state);
      document.body.style.userSelect = '';
    }
    grip.addEventListener('pointerdown', function (e) { if (e.button === 0) onDown(e, e.clientY); });
    grip.addEventListener('pointermove', function (e) { if (drag.on) onMove(e.clientY); });
    grip.addEventListener('pointerup', onUp);
    grip.addEventListener('pointercancel', onUp);
  }

  /* ---------- 浮动按钮：随抽屉高度自动上移（移动端） ---------- */
  function syncFab(knownH) {
    if (!fabStack) return;
    if (!MOBILE.matches) { fabStack.style.bottom = ''; return; }
    var h = knownH || (sheet ? sheet.offsetHeight : PEEK_H);
    if (!knownH && sheet && sheet.dataset.state === 'peek') h = PEEK_H;
    fabStack.style.bottom = (h + 12) + 'px';
  }
  if (fabStack) {
    var realR = $('fab-roulette');
    var realB = $('fab-bucket');
    var floatR = fabStack.querySelector('#fab-roulette-float');
    var floatB = fabStack.querySelector('#fab-bucket-float');
    if (realR && floatR) floatR.addEventListener('click', function () { realR.click(); });
    if (realB && floatB) floatB.addEventListener('click', function () { realB.click(); });
    var realCount = $('fab-bucket-count');
    if (realCount && floatB) {
      var small = document.createElement('small');
      small.className = 'fab-count-float';
      floatB.appendChild(small);
      var updateFloatCount = function () { small.textContent = realCount.textContent || '0'; };
      updateFloatCount();
      if (window.MutationObserver) {
        new MutationObserver(updateFloatCount).observe(realCount, { childList: true, characterData: true, subtree: true });
      } else {
        setInterval(updateFloatCount, 1200);
      }
    }
    window.addEventListener('resize', syncFab);
    window.addEventListener('orientationchange', function () { setTimeout(syncFab, 350); });
    syncFab();
  }

  /* ---------------- 筛选抽屉：遮罩 & 关闭 ---------------- */
  var sidebar = $('sidebar');
  var scrim = $('sidebar-scrim');
  var filterBtn = $('filter-toggle');
  var sidebarClose = $('sidebar-close');

  function syncScrim() {
    if (!scrim || !sidebar) return;
    var open = sidebar.classList.contains('open');
    if (open && MOBILE.matches) {
      scrim.hidden = false;
      requestAnimationFrame(function () { scrim.classList.add('show'); });
    } else {
      scrim.classList.remove('show');
      setTimeout(function () { if (!sidebar.classList.contains('open')) scrim.hidden = true; }, 240);
    }
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    syncScrim();
  }
  if (filterBtn && sidebar) filterBtn.addEventListener('click', function () { setTimeout(syncScrim, 20); });
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (scrim) scrim.addEventListener('click', closeSidebar);
  if (MOBILE.matches && sidebar && window.MutationObserver) {
    new MutationObserver(function () {
      if (!sidebar.classList.contains('open')) {
        scrim.classList.remove('show');
        setTimeout(function () { if (!sidebar.classList.contains('open')) scrim.hidden = true; }, 240);
      }
    }).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------------- 快捷分类 chips（与类型 TYPE 联动） ---------------- */
  var QUICK = [
    { id: 'all',     label: '✦ 全部',            types: null },
    { id: 'photo',   label: '📸 拍照打卡',        types: ['拍照打卡点'] },
    { id: 'food',    label: '🍽 美食',            types: ['美食'] },
    { id: 'cafe',    label: '☕️ 咖啡',            types: ['咖啡'] },
    { id: 'mv',      label: '🎬 MV·拍摄地',        types: ['拍摄地'] },
    { id: 'kwangya', label: '🛍 KWANGYA·周边',     types: ['官方周边', '快闪'] },
    { id: 'venue',   label: '🎤 演出场地',         types: ['演出场地'] },
    { id: 'expo',    label: '🖼 展览',             types: ['展览'] },
    { id: 'shop',    label: '🛒 购物',             types: ['购物'] }
  ];
  var quickBox = $('quickchips');
  var typeFilter = $('type-filter');

  function buildQuickChips() {
    if (!quickBox) return;
    quickBox.innerHTML = '';
    QUICK.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'qchip';
      b.dataset.quick = q.id;
      b.textContent = q.label;
      b.addEventListener('click', function () { applyQuick(q.id); });
      quickBox.appendChild(b);
    });
  }

  function typeInputs() {
    if (!typeFilter) return [];
    return Array.prototype.slice.call(typeFilter.querySelectorAll('input[data-role="type"]'));
  }

  function applyQuick(id) {
    var q = null;
    for (var i = 0; i < QUICK.length; i++) if (QUICK[i].id === id) q = QUICK[i];
    if (!q) return;
    var inputs = typeInputs();
    var changed = false;
    inputs.forEach(function (inp) {
      var want = q.types ? q.types.indexOf(inp.value) >= 0 : false;
      if (inp.checked !== want) { inp.checked = want; changed = true; }
    });
    if (changed && inputs.length) {
      var ev = document.createEvent('HTMLEvents');
      ev.initEvent('change', true, true);
      inputs[inputs.length - 1].dispatchEvent(ev);   // app.js 会统一读取最新状态并重绘
    }
    syncQuick();
  }

  function syncQuick() {
    if (!quickBox) return;
    var inputs = typeInputs();
    var checked = inputs.filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
    var activeId = 'all';
    for (var i = 0; i < QUICK.length; i++) {
      var q = QUICK[i];
      if (!q.types) continue;
      var same = q.types.length === checked.length && q.types.every(function (t) { return checked.indexOf(t) >= 0; });
      if (same) { activeId = q.id; break; }
    }
    quickBox.querySelectorAll('.qchip').forEach(function (b) {
      b.classList.toggle('on', b.dataset.quick === activeId);
    });
  }

  /* ---------------- 详情面板：下拉关闭（移动端） ---------------- */
  var detailPanel = $('detail-panel');
  var dpGrip = detailPanel ? detailPanel.querySelector('.dp-grip') : null;
  var dpCloseBtn = $('dp-close');

  if (dpGrip && detailPanel && MOBILE.matches) {
    var dDrag = { on: false, startY: 0, dist: 0 };
    dpGrip.addEventListener('pointerdown', function (e) {
      if (e.button === 0) { dDrag.on = true; dDrag.startY = e.clientY; dDrag.dist = 0; detailPanel.style.transition = 'none'; }
    });
    dpGrip.addEventListener('pointermove', function (e) {
      if (!dDrag.on || !detailPanel.classList.contains('open')) return;
      dDrag.dist = Math.max(0, e.clientY - dDrag.startY);
      detailPanel.style.transform = 'translateY(' + dDrag.dist + 'px)';
    });
    function endDpDrag() {
      if (!dDrag.on) return;
      dDrag.on = false;
      detailPanel.style.transition = '';
      detailPanel.style.transform = '';
      if (dDrag.dist > 90 && dpCloseBtn) dpCloseBtn.click();
    }
    dpGrip.addEventListener('pointerup', endDpDrag);
    dpGrip.addEventListener('pointercancel', endDpDrag);
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    buildQuickChips();
    syncQuick();
    syncScrim();
    if (typeFilter) typeFilter.addEventListener('change', syncQuick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* =====================================================================
   Fix：随机抽卡“点不开” —— 列表栏/浮动 🎰 统一转发到顶部 🎰（实测可靠）
   做法：克隆节点清除旧的（失效）点击监听，再绑定转发；避免重复触发
   ===================================================================== */
(function () {
  'use strict';
  if (window.__roulettePatched) return;
  window.__roulettePatched = true;

  function patch() {
    var hr = document.getElementById('hdr-roulette');
    function go() { if (hr) hr.click(); }
    function swap(sel) {
      var b = document.querySelector(sel);
      if (!b) return;
      var c = b.cloneNode(true);
      if (b.parentNode) b.parentNode.replaceChild(c, b);
      c.addEventListener('click', go);
      c.setAttribute('title', '随机抽一个打卡点（Neo Roulette）');
    }
    swap('#fab-roulette');       // 桌面端列表栏 🎰
    swap('#fab-roulette-float'); // 移动端浮动 🎰
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patch);
  } else {
    patch();
  }
})();
