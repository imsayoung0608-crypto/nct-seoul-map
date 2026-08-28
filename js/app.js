/* NCT 首尔同款地图 · 应用逻辑 v3（公共交通路线 + 气候卡标注 + 自定义地点） */
(function () {
  'use strict';

  var state = { query: '', queryRaw: '', queryTokens: [], units: [], members: [], category: 'all', types: [] };
  var map = null;
  var markers = {};
  var firstRender = true;
  var route = { mode: false, ids: [], layer: null };
  /* 地图图源（多源自动切换：OSM 加载失败时换下一个，兼容不同网络环境/国内访问） */
  var tileLayer = null;
  var tileProviderIdx = 0;
  var tileSwitchCount = 0;
  var TILE_PROVIDERS = [
    { name: 'OSM', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
    { name: 'Carto', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>', subdomains: 'abcd' },
    { name: 'OSM France', url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap France', subdomains: 'abc' },
    { name: 'Esri', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri' }
  ];

  /* ================= 自定义地点（用户添加，保存到本浏览器） ================= */
  var CUSTOM_KEY = 'nct_custom_places_v1';
  var customPlaces = loadCustomPlaces();
  function loadCustomPlaces() {
    try {
      var raw = localStorage.getItem(CUSTOM_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveCustomPlaces() {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customPlaces)); } catch (e) {}
  }
  function allPlaces() {
    return PLACES.concat(customPlaces);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getMember(id) {
    for (var i = 0; i < MEMBERS.length; i++) {
      if (MEMBERS[i].id === id) return MEMBERS[i];
    }
    return null;
  }

  function unitColor(units) {
    if (units.length === 1) return UNITS[units[0]].color;
    return '#8d99ae';
  }

  function buildSearchText(p) {
    var parts = [p.name, p.nameKo, p.type, (p.category === 'spot' ? '拍照打卡点' : '同款店铺'), p.addressKo, p.address, p.station, p.desc];
    p.units.forEach(function (u) { if (UNITS[u]) parts.push(UNITS[u].name, UNITS[u].short); });
    p.members.forEach(function (mid) {
      var m = getMember(mid);
      if (m) {
        parts.push(m.name, m.en);
        m.aliases.forEach(function (a) { parts.push(a); });
      }
    });
    return parts.join(' ');
  }

  /* ===== 搜索索引：一次性预计算，筛选/搜索更快更准 ===== */
  var searchIndex = {};
  function normText(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ''); }
  function indexPlace(pl) { searchIndex[pl.id] = normText(buildSearchText(pl)); }
  function indexAll() { searchIndex = {}; allPlaces().forEach(indexPlace); }
  function placeSearchText(pl) {
    var t = searchIndex[pl.id];
    if (t == null) { indexPlace(pl); t = searchIndex[pl.id]; }
    return t;
  }
  function setQuery(v) {
    state.query = String(v == null ? '' : v).trim();
    state.queryRaw = normText(state.query);
    state.queryTokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function placeMatches(p) {
    if (state.units.length && !state.units.some(function (u) { return p.units.indexOf(u) >= 0; })) return false;
    if (state.members.length && !state.members.some(function (m) { return p.members.indexOf(m) >= 0; })) return false;
    if (state.category !== 'all' && p.category !== state.category) return false;
    if (state.types.length && state.types.indexOf(p.type) < 0) return false;
    if (state.queryTokens.length) {
      var hay = placeSearchText(p);
      if (state.queryRaw && hay.indexOf(state.queryRaw) >= 0) return true;
      for (var qi = 0; qi < state.queryTokens.length; qi++) {
        if (hay.indexOf(state.queryTokens[qi]) < 0) return false;
      }
    }
    return true;
  }

  function makeTileLayer(provider) {
    var opts = { maxZoom: 19, attribution: provider.attr };
    if (provider.subdomains) opts.subdomains = provider.subdomains;
    return L.tileLayer(provider.url, opts);
  }

  function switchTileProviderTo(idx) {
    if (idx === tileProviderIdx || idx < 0 || idx >= TILE_PROVIDERS.length) return;
    tileProviderIdx = idx;
    var next = TILE_PROVIDERS[idx];
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = makeTileLayer(next);
    tileLayer.on('tileerror', onTileError);
    tileLayer.addTo(map);
    if (window.console) console.log('[map] 切换地图图源: ' + next.name);
  }

  function switchTileProvider() {
    if (tileSwitchCount >= TILE_PROVIDERS.length - 1) return; // 全部试过，不再循环切换
    tileSwitchCount++;
    switchTileProviderTo((tileProviderIdx + 1) % TILE_PROVIDERS.length);
  }

  function onTileError() {
    switchTileProvider();
  }

  /* 启动后并行探测各图源：当前图源可用则保持 OSM，否则自动切到第一个可用的（更快） */
  function probeTiles() {
    if (typeof Image === 'undefined') return;
    var currentHealthy = false;
    var switched = false;
    TILE_PROVIDERS.forEach(function (p, i) {
      var url = p.url
        .replace(/{s}/, p.subdomains ? p.subdomains.charAt(0) : 'a')
        .replace(/{z}/, '2').replace(/{x}/, '2').replace(/{y}/, '1').replace(/{r}/, '');
      var img = new Image();
      var done = false;
      img.onload = function () {
        if (done) return; done = true;
        if (i === tileProviderIdx) { currentHealthy = true; return; }
        // 稍等片刻，确认当前图源确实不可用再切换
        setTimeout(function () {
          if (!switched && !currentHealthy) { switched = true; switchTileProviderTo(i); }
        }, 400);
      };
      img.onerror = function () { done = true; };
      img.src = url;
    });
  }

  function initMap() {
    map = L.map('map', { zoomControl: true }).setView([37.5665, 126.978], 12);
    tileLayer = makeTileLayer(TILE_PROVIDERS[0]);
    tileLayer.on('tileerror', onTileError);
    tileLayer.addTo(map);
    window.__layer = L.layerGroup().addTo(map);
    route.layer = L.layerGroup().addTo(map);
    // 移动端/字体/布局变化后修正地图尺寸，避免地图不渲染
    setTimeout(function () { map.invalidateSize(); }, 300);
    setTimeout(function () { probeTiles(); }, 2000);
    window.addEventListener('resize', function () { map.invalidateSize(); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { map.invalidateSize(); }, 250); });
  }

  function markerIcon(p) {
    var color = unitColor(p.units);
    var spot = p.category === 'spot';
    var html;
    if (p.custom) html = '<div class="pin pin-custom" style="--c:#e8590c"></div>';
    else html = '<div class="pin' + (spot ? ' pin-spot' : ' pin-store') + '" style="--c:' + color + '"></div>';
    return L.divIcon({ className: 'pin-wrap', html: html, iconSize: [30, 34], iconAnchor: [15, 32], popupAnchor: [0, -30] });
  }

  function memberBadgeHtml(mid) {
    var m = getMember(mid);
    if (!m) return '';
    var tag = m.departed ? ' <em class="departed-tag">已退团</em>' : '';
    return '<span class="badge badge-member' + (m.departed ? ' departed' : '') + '">' + esc(m.name) + tag + '</span>';
  }

  function popupHtml(p) {
    var h = [];
    h.push('<div class="pop">');
    h.push('<div class="pop-title">' + esc(p.name) + (p.nameKo ? ' <span class="pop-ko">' + esc(p.nameKo) + '</span>' : '') + '</div>');
    h.push('<div class="pop-badges">');
    p.units.forEach(function (u) { if (UNITS[u]) h.push('<span class="badge badge-unit" style="background:' + UNITS[u].color + '">' + esc(UNITS[u].name) + '</span>'); });
    p.members.forEach(function (m) { h.push(memberBadgeHtml(m)); });
    h.push('<span class="badge badge-type">' + esc(p.type) + '</span>');
    if (p.custom) h.push('<span class="badge badge-type badge-custom">自定义</span>');
    h.push('</div>');
    if (p.desc) h.push('<p class="pop-desc">' + esc(p.desc) + '</p>');
    h.push('<table class="pop-info">');
    if (p.addressKo) h.push('<tr><td>韩文地址</td><td>' + esc(p.addressKo) + '</td></tr>');
    if (p.address) h.push('<tr><td>中文/说明</td><td>' + esc(p.address) + '</td></tr>');
    if (p.station) h.push('<tr><td>交通</td><td>' + esc(p.station) + '</td></tr>');
    if (p.hours) h.push('<tr><td>营业时间</td><td>' + esc(p.hours) + '</td></tr>');
    h.push('</table>');
    h.push('<div class="pop-foot">坐标约略，导航请以地图 App 为准');
    if (p.source) h.push(' · <a href="' + esc(p.source) + '" target="_blank" rel="noopener">资料来源</a>');
    h.push('</div>');
    h.push('</div>');
    return h.join('');
  }

  function cardHtml(p) {
    var div = document.createElement('div');
    div.className = 'card' + (route.ids.indexOf(p.id) >= 0 ? ' selected' : '') + (p.custom ? ' card-custom' : '');
    var head = document.createElement('div');
    head.className = 'card-top';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'card-check';
    cb.checked = route.ids.indexOf(p.id) >= 0;
    cb.title = '加入路线规划';
    cb.addEventListener('click', function (e) { e.stopPropagation(); toggleRoutePlace(p.id); });
    head.appendChild(cb);
    var name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = p.name;
    head.appendChild(name);
    var tag = document.createElement('span');
    tag.className = 'card-tag ' + (p.custom ? 'tag-custom' : (p.category === 'spot' ? 'tag-spot' : 'tag-store'));
    tag.textContent = p.custom ? '自定义' : (p.category === 'spot' ? '打卡' : '同款');
    head.appendChild(tag);
    div.appendChild(head);

    var badges = document.createElement('div');
    badges.className = 'card-badges';
    p.units.forEach(function (u) {
      if (!UNITS[u]) return;
      var b = document.createElement('span');
      b.className = 'badge badge-unit';
      b.style.background = UNITS[u].color;
      b.textContent = UNITS[u].name;
      badges.appendChild(b);
    });
    p.members.forEach(function (m) {
      var mm = getMember(m);
      if (mm) {
        var b = document.createElement('span');
        b.className = 'badge badge-member' + (mm.departed ? ' departed' : '');
        b.textContent = mm.name + (mm.departed ? ' 已退团' : '');
        badges.appendChild(b);
      }
    });
    var tb = document.createElement('span');
    tb.className = 'badge badge-type' + (p.custom ? ' badge-custom' : '');
    tb.textContent = p.type;
    badges.appendChild(tb);
    div.appendChild(badges);

    var meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = [p.station, p.nameKo].filter(Boolean).join(' · ');
    div.appendChild(meta);

    if (p.desc) {
      var ds = document.createElement('p');
      ds.className = 'card-desc';
      ds.textContent = p.desc;
      div.appendChild(ds);
    }

    div.addEventListener('click', function () {
      var mk = markers[p.id];
      if (mk) {
        map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
        setTimeout(function () { mk.openPopup(); }, 650);
      }
    });
    return div;
  }

  function render() {
    window.__layer.clearLayers();
    markers = {};
    var list = document.getElementById('place-list');
    list.innerHTML = '';
    var all = allPlaces();
    var hits = [];
    for (var i = 0; i < all.length; i++) {
      if (placeMatches(all[i])) hits.push(all[i]);
    }
    for (var j = 0; j < hits.length; j++) {
      var p = hits[j];
      var mk = L.marker([p.lat, p.lng], { icon: markerIcon(p) });
      mk.bindPopup(popupHtml(p), { maxWidth: 340 });
      mk.on('click', function () { mk.openPopup(); });
      window.__layer.addLayer(mk);
      markers[p.id] = mk;
      list.appendChild(cardHtml(p));
    }
    document.getElementById('result-count').textContent = hits.length + ' / ' + all.length + ' 个地点';
    if (firstRender) {
      map.setView([37.5665, 126.978], 12);
      firstRender = false;
    } else if (hits.length > 0) {
      var bounds = [];
      for (var k = 0; k < hits.length; k++) bounds.push([hits[k].lat, hits[k].lng]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  function collectChecked(role) {
    var out = [];
    document.querySelectorAll('input[data-role="' + role + '"]:checked').forEach(function (el) {
      if (out.indexOf(el.value) < 0) out.push(el.value);
    });
    return out;
  }

  function buildFilters() {
    var unitBox = document.getElementById('unit-filter');
    Object.keys(UNITS).forEach(function (id) {
      var u = UNITS[id];
      var label = document.createElement('label');
      label.className = 'chip';
      label.innerHTML = '<input type="checkbox" value="' + id + '" data-role="unit"><span class="chip-dot" style="background:' + u.color + '"></span>' + esc(u.name);
      unitBox.appendChild(label);
    });

    var memberBox = document.getElementById('member-filter');
    var memberHasData = {};
    allPlaces().forEach(function (p) { p.members.forEach(function (m) { memberHasData[m] = true; }); });
    var groups = {};
    Object.keys(UNITS).forEach(function (u) { groups[u] = []; });
    MEMBERS.forEach(function (m) {
      var units = m.units || [m.unit];
      units.forEach(function (u) {
        if (groups[u] && !groups[u].some(function (x) { return x.id === m.id; })) groups[u].push(m);
      });
    });
    Object.keys(groups).forEach(function (uid) {
      // 按年龄排序（年长在前）
      groups[uid].sort(function (a, b) {
        var ba = a.birth || '9999-12-31', bb = b.birth || '9999-12-31';
        return ba < bb ? -1 : ba > bb ? 1 : 0;
      });
      if (groups[uid].length === 0) return; // 隐藏空分组
      var g = document.createElement('div');
      g.className = 'member-group';
      var hd = document.createElement('div');
      hd.className = 'member-group-title';
      hd.textContent = UNITS[uid].name + (uid === 'n127' ? '（注：Mark / 楷灿 同时属于 127 与 DREAM，昀昀同时属于 127 与 WayV，可分别在对应分组选择）' : '');
      g.appendChild(hd);
      groups[uid].forEach(function (m) {
        var label = document.createElement('label');
        label.className = 'chip chip-member' + (memberHasData[m.id] ? '' : ' no-data') + (m.departed ? ' departed' : '');
        label.title = (memberHasData[m.id] ? '' : '暂无收录地点 ') + (m.departed ? '已退团' : '');
        label.innerHTML = '<input type="checkbox" value="' + m.id + '" data-role="member">' + esc(m.name) + (m.departed ? '<em class="departed-tag">已退团</em>' : '');
        g.appendChild(label);
      });
      memberBox.appendChild(g);
    });

    var typeBox = document.getElementById('type-filter');
    Object.keys(TYPE_COLORS).forEach(function (t) {
      var label = document.createElement('label');
      label.className = 'chip';
      label.innerHTML = '<input type="checkbox" value="' + t + '" data-role="type"><span class="chip-dot" style="background:' + TYPE_COLORS[t] + '"></span>' + esc(t);
      typeBox.appendChild(label);
    });

    var catBox = document.getElementById('category-filter');
    CATEGORIES.forEach(function (c) {
      var label = document.createElement('label');
      label.className = 'chip chip-cat' + (c.id === 'all' ? ' active' : '');
      label.innerHTML = '<input type="radio" name="cat" value="' + c.id + '"' + (c.id === 'all' ? ' checked' : '') + '>' + esc(c.name);
      catBox.appendChild(label);
    });
  }

  /* Safari 兼容：:has() 不可用时用 .checked 类做高亮（现代浏览器两者皆可） */
  function syncChipClasses() {
    var chips = document.querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
      var inp = chips[i].querySelector('input');
      if (inp) chips[i].classList.toggle('checked', inp.checked);
    }
  }

  function onFilterChange(e) {
    var el = e.target;
    if (el.getAttribute('data-role') === 'unit') state.units = collectChecked('unit');
    else if (el.getAttribute('data-role') === 'member') {
      document.querySelectorAll('input[data-role="member"][value="' + el.value + '"]').forEach(function (c) {
        if (c !== el) c.checked = el.checked;
      });
      state.members = collectChecked('member');
    }
    else if (el.getAttribute('data-role') === 'type') state.types = collectChecked('type');
    else if (el.name === 'cat') {
      state.category = el.value;
      document.querySelectorAll('.chip-cat').forEach(function (c) { c.classList.remove('active'); });
      if (el.closest) el.closest('.chip-cat').classList.add('active');
    }
    syncChipClasses();
    render();
  }

  function initSearch() {
    var input = document.getElementById('search');
    var clearBtn = document.getElementById('search-clear');
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var v = input.value;
      timer = setTimeout(function () { setQuery(v); render(); }, 150);
    });
    clearBtn.addEventListener('click', function () { input.value = ''; state.query = ''; render(); input.focus(); });
  }

  function clearAll() {
    state.query = ''; state.queryRaw = ''; state.queryTokens = []; state.units = []; state.members = []; state.types = []; state.category = 'all';
    document.getElementById('search').value = '';
    document.querySelectorAll('input[data-role="unit"], input[data-role="member"], input[data-role="type"]').forEach(function (c) { c.checked = false; });
    document.querySelectorAll('.chip-cat').forEach(function (c) {
      c.classList.remove('active');
      var inp = c.querySelector('input');
      if (inp && inp.value === 'all') { inp.checked = true; c.classList.add('active'); }
    });
    syncChipClasses();
    render();
  }

  function initSidebarToggle() {
    var btn = document.getElementById('filter-toggle');
    var sidebar = document.getElementById('sidebar');
    if (btn && sidebar) btn.addEventListener('click', function () { sidebar.classList.toggle('open'); });
  }

  /* ================= 路线规划（公共交通 + 气候卡标注） ================= */
  function toggleRoutePlace(id) {
    var i = route.ids.indexOf(id);
    if (i >= 0) route.ids.splice(i, 1);
    else route.ids.push(id);
    document.getElementById('route-count').textContent = '已选 ' + route.ids.length + ' 个地点';
    render();
  }

  function setRouteMsg(msg) {
    var el = document.getElementById('route-msg');
    if (el) el.innerHTML = msg;
  }

  function initRoute() {
    var toggle = document.getElementById('route-toggle');
    var panel = document.getElementById('route-panel');
    toggle.addEventListener('click', function () {
      route.mode = !route.mode;
      toggle.classList.toggle('on', route.mode);
      panel.classList.toggle('open', route.mode);
      document.getElementById('app').classList.toggle('route-on', route.mode);
      if (!route.mode) route.layer.clearLayers();
      render();
    });
    document.getElementById('route-plan').addEventListener('click', planRoute);
    document.getElementById('route-clear').addEventListener('click', clearRoute);
  }

  function clearRoute() {
    route.ids = [];
    route.layer.clearLayers();
    document.getElementById('route-count').textContent = '已选 0 个地点';
    document.getElementById('route-result').innerHTML = '';
    setRouteMsg('');
    render();
  }

  function findPlace(id) {
    var all = allPlaces();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  // 从地点 station 文本解析步行分钟
  function walkMin(str) {
    var m = /步行(?:约)?\s*(\d+)\s*分钟?/.exec(str || '');
    return m ? parseInt(m[1], 10) : 6;
  }

  function transitLeg(a, b) {
    var sa = null, sb = null;
    if (typeof TRANSIT !== 'undefined') {
      sa = TRANSIT.resolveStation(a.station);
      sb = TRANSIT.resolveStation(b.station);
    }
    var walkA = walkMin(a.station), walkB = walkMin(b.station);
    if (sa && sb && typeof TRANSIT !== 'undefined') {
      var r = TRANSIT.routeBetween(sa, sb);
      if (r.ok) {
        return {
          minutes: walkA + r.minutes + walkB,
          walkA: walkA, walkB: walkB,
          transitMin: r.minutes,
          sa: sa, sb: sb,
          famSeq: r.famSeq, transfers: r.transfers, allClimate: r.allClimate,
          ok: true
        };
      }
      return { minutes: 45, ok: false, sa: sa, sb: sb, allClimate: false, note: '未能规划地铁路线' };
    }
    return { minutes: 45, ok: false, sa: sa, sb: sb, allClimate: false, note: '未收录地铁站，请用 Naver Map 查询' };
  }

  /* ===== 出发地（home）解析：支持地铁站名 / 地址 → 最近地铁站 ===== */
  function haversine(aLat, aLng, bLat, bLng) {
    var R = 6371000, toRad = Math.PI / 180;
    var dLat = (bLat - aLat) * toRad, dLng = (bLng - aLng) * toRad;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  /* 地理编码：优先 Photon（国内/多数网络可用），失败回退 Nominatim */
  function geoCode(q, cb) {
    var url1 = 'https://photon.komoot.io/api/?limit=1&countrycode=KR&q=' + encodeURIComponent(q);
    fetch(url1)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.features && j.features.length) {
          var c = j.features[0].geometry.coordinates;
          cb({ lat: c[1], lng: c[0] });
        } else { cb(null); }
      })
      .catch(function () {
        fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ko&q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (arr) {
            if (arr && arr.length && arr[0].lat) cb({ lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) });
            else cb(null);
          })
          .catch(function () { cb(null); });
      });
  }

  /* 从文本中匹配地铁站：先精确匹配，再在韩/中文站名中做子串匹配 */
  function stationFromText(text) {
    if (typeof TRANSIT === 'undefined') return null;
    var s = TRANSIT.resolveStation(text);
    if (s) return s;
    var clean = String(text);
    var best = null, bestLen = 0;
    Object.keys(TRANSIT.stations).forEach(function (id) {
      var st = TRANSIT.stations[id];
      if (!st) return;
      if (st.ko && clean.indexOf(st.ko) >= 0 && st.ko.length > bestLen) { best = id; bestLen = st.ko.length; }
      if (st.zh && clean.indexOf(st.zh) >= 0 && st.zh.length > bestLen) { best = id; bestLen = st.zh.length; }
    });
    return best;
  }

  /* 解析出发地：返回 { matched, stationId, stationKo, stationZh, lat, lng, label, walkMin } 或 { error } / null */
  function resolveOrigin(text, cb) {
    var v = String(text || '').trim();
    if (!v) { cb(null); return; }
    var sid = stationFromText(v);
    if (sid) {
      var st = TRANSIT.stations[sid];
      var c = (TRANSIT.stationCoords && TRANSIT.stationCoords[sid]) || null;
      cb({
        matched: 'station', stationId: sid, stationKo: st.ko, stationZh: st.zh,
        lat: c ? c[0] : null, lng: c ? c[1] : null,
        label: st.ko + ' / ' + st.zh, walkMin: 0
      });
      return;
    }
    geoCode(v, function (g) {
      if (!g) { cb({ error: 'unresolved' }); return; }
      if (typeof TRANSIT !== 'undefined') {
        var ns = TRANSIT.nearestStation(g.lat, g.lng);
        if (ns) {
          var st2 = TRANSIT.stations[ns];
          var c2 = (TRANSIT.stationCoords && TRANSIT.stationCoords[ns]) || null;
          var walk = 6;
          if (c2) walk = Math.max(2, Math.min(25, Math.round(haversine(g.lat, g.lng, c2[0], c2[1]) / 70)));
          cb({
            matched: 'address', stationId: ns, stationKo: st2.ko, stationZh: st2.zh,
            lat: g.lat, lng: g.lng, label: v, walkMin: walk
          });
          return;
        }
      }
      cb({ error: 'unresolved' });
    });
  }

  function planRoute() {
    if (route.ids.length < 2) { setRouteMsg('⚠️ 请先勾选至少 2 个地点'); return; }
    var originInput = document.getElementById('route-origin');
    var originText = originInput ? originInput.value : '';
    var places = [];
    route.ids.forEach(function (id) { var p = findPlace(id); if (p) places.push(p); });

    function doPlan(originPlace) {
      var nodes = [];
      if (originPlace) nodes.push(originPlace);
      places.forEach(function (p) { nodes.push(p); });
      var n = nodes.length;
      var dur = [], legInfo = {};
      for (var i = 0; i < n; i++) {
        dur[i] = [];
        for (var j = 0; j < n; j++) {
          if (i === j) { dur[i][j] = 0; continue; }
          var info = transitLeg(nodes[i], nodes[j]);
          legInfo[i + '_' + j] = info;
          dur[i][j] = info.minutes;
        }
      }
      var order = tspOrder(dur, n);
      var total = 0, legs = [];
      for (var i2 = 0; i2 < order.length - 1; i2++) {
        var d = dur[order[i2]][order[i2 + 1]];
        legs.push(d); total += d;
      }
      drawRoute(nodes, order, null, !!originPlace);
      renderRouteResult(nodes, order, legs, total, legInfo, !!originPlace);
      setRouteMsg('');
    }

    setRouteMsg('🔄 正在计算公共交通最优路线…');
    if (originText) {
      resolveOrigin(originText, function (o) {
        if (!o) { doPlan(null); return; }
        if (o.error) {
          setRouteMsg('⚠️ 无法识别出发地「' + esc(originText) + '」。请填写附近<b>地铁站名</b>（如：홍대입구역 / 弘大入口），或用韩文/中文地址重试。');
          return;
        }
        var op = {
          id: '__origin__', name: '出发地', nameKo: o.label, category: 'spot', type: '出发地',
          units: [], members: [], custom: true,
          station: o.stationKo + '（步行' + o.walkMin + '分钟）',
          addressKo: o.label, address: '出发地址（' + o.label + '）',
          lat: o.lat != null ? o.lat : 37.5665, lng: o.lng != null ? o.lng : 126.978
        };
        doPlan(op);
      });
    } else {
      setTimeout(function () { doPlan(null); }, 30);
    }
  }

  function tspOrder(dur, n) {
    var visited = [true], order = [0], cur = 0;
    for (var k = 1; k < n; k++) {
      var best = -1, bestD = Infinity;
      for (var j = 0; j < n; j++) {
        if (visited[j]) continue;
        var d = dur[cur] ? dur[cur][j] : Infinity;
        if (d != null && d < bestD) { bestD = d; best = j; }
      }
      if (best < 0) { for (var j2 = 0; j2 < n; j2++) if (!visited[j2]) { best = j2; break; } }
      visited[best] = true; order.push(best); cur = best;
    }
    twoOpt(order, dur);
    return order;
  }

  function twoOpt(order, dur) {
    var improved = true;
    while (improved) {
      improved = false;
      for (var i = 1; i < order.length - 1; i++) {
        for (var k = i + 1; k < order.length; k++) {
          var a = order[i - 1], b = order[i], c = order[k], d = order[k + 1] === undefined ? order[0] : order[k + 1];
          var da = dur[a] ? dur[a] : null, db = dur[b] ? dur[b] : null, dc = dur[c] ? dur[c] : null;
          var curD = (da && da[b] != null ? da[b] : Infinity) + (dc && dc[d] != null ? dc[d] : Infinity);
          var altD = (da && da[c] != null ? da[c] : Infinity) + (db && db[d] != null ? db[d] : Infinity);
          if (altD < curD) {
            var seg = order.slice(i, k + 1).reverse();
            Array.prototype.splice.apply(order, [i, k - i + 1].concat(seg));
            improved = true;
          }
        }
      }
    }
  }

  function drawRoute(nodes, order, geom, hasOrigin) {
    route.layer.clearLayers();
    var pts = order.map(function (i) { return [nodes[i].lat, nodes[i].lng]; });
    L.polyline(pts, { color: '#2563eb', weight: 5, opacity: 0.85, dashArray: '6 8' }).addTo(route.layer);
    order.forEach(function (i, idx) {
      var p = nodes[i];
      var isOrigin = hasOrigin && i === 0;
      var num = isOrigin ? '起' : (idx + 1);
      var icon = L.divIcon({ className: 'pin-wrap', html: '<div class="route-pin' + (isOrigin ? ' origin' : '') + '">' + num + '</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
      L.marker([p.lat, p.lng], { icon: icon, zIndexOffset: 1000 }).addTo(route.layer).bindPopup(popupHtml(p), { maxWidth: 340 });
    });
    var bounds = order.map(function (i) { return [nodes[i].lat, nodes[i].lng]; });
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
  }

  function fmtTime(min) {
    if (min == null || !isFinite(min)) return '—';
    min = Math.round(min);
    if (min < 60) return min + ' 分钟';
    return Math.floor(min / 60) + ' 小时 ' + (min % 60) + ' 分';
  }

  function naverTransitHref(a, b) {
    return 'https://m.map.naver.com/directions.nhn?slat=' + a.lat + '&slng=' + a.lng
      + '&sname=' + encodeURIComponent(a.nameKo || a.name)
      + '&elat=' + b.lat + '&elng=' + b.lng
      + '&ename=' + encodeURIComponent(b.nameKo || b.name);
  }
  function naverAppHref(a, b) {
    return 'nmap://route/public?slat=' + a.lat + '&slng=' + a.lng
      + '&sname=' + encodeURIComponent(a.nameKo || a.name)
      + '&elat=' + b.lat + '&elng=' + b.lng
      + '&ename=' + encodeURIComponent(b.nameKo || b.name) + '&appname=nctseoulmap';
  }

  function renderRouteResult(nodes, order, legs, total, legInfo, hasOrigin) {
    var box = document.getElementById('route-result');
    var h = [];
    h.push('<div class="route-result-title">🚇 最优路线' + (hasOrigin ? '（含出发地）' : '') + '（公共交通 · 估算）</div>');
    h.push('<ol class="route-stops">');
    order.forEach(function (i, idx) {
      var p = nodes[i];
      var next = order[idx + 1];
      var leg = next != null ? legInfo[order[idx] + '_' + next] : null;
      var isOrigin = hasOrigin && i === 0;
      var nav = 'https://map.naver.com/p/search/' + encodeURIComponent(p.nameKo || p.addressKo || p.name);
      h.push('<li>');
      h.push('<span class="route-no' + (isOrigin ? ' origin' : '') + '">' + (isOrigin ? '起' : (idx + 1)) + '</span>');
      h.push('<div class="route-stop-body">');
      h.push('<div class="route-stop-name">' + (isOrigin ? '🏠 ' : '') + esc(p.name) + (isOrigin ? ' <em class="badge-custom-mini">出发地</em>' : (p.custom ? ' <em class="badge-custom-mini">自定义</em>' : '')) + '</div>');
      h.push('<div class="route-stop-meta">' + esc(p.station || p.addressKo || '') + '</div>');
      h.push('<div class="route-stop-actions"><a href="' + nav + '" target="_blank" rel="noopener">Naver Map 搜索</a></div>');
      if (leg && leg.ok) {
        var ls = leg.famSeq.map(function (f) {
          var c = (typeof TRANSIT !== 'undefined') ? TRANSIT.famColor(f.fam) : '#888';
          var nm = (typeof TRANSIT !== 'undefined') ? TRANSIT.famName(f.fam) : f.fam;
          return '<span class="leg-line" style="background:' + c + '">' + esc(nm) + ' ×' + f.count + '</span>';
        }).join(' ');
        h.push('<div class="route-leg-detail">');
        h.push('<div class="leg-lines">' + ls + (leg.transfers > 0 ? ' <span class="leg-transfer">换乘 ' + leg.transfers + ' 次</span>' : '') + '</div>');
        h.push('<div class="leg-time">🚇 ' + Math.round(leg.transitMin) + ' 分钟 · 步行 ' + (leg.walkA + leg.walkB) + ' 分钟</div>');
        h.push(leg.allClimate
          ? '<div class="climate climate-ok">✅ 全程可用气候卡（首尔市内）</div>'
          : '<div class="climate climate-no">⛔ 含气候卡不可用路段（超出首尔市界）</div>');
        h.push('<div class="leg-nav"><a href="' + naverTransitHref(nodes[order[idx]], nodes[next]) + '" target="_blank" rel="noopener">Naver 公交路线</a> · <a href="' + naverAppHref(nodes[order[idx]], nodes[next]) + '">Naver App（手机）</a></div>');
        h.push('</div>');
      } else if (leg) {
        h.push('<div class="route-leg-detail"><div class="climate climate-no">⚠️ ' + esc(leg.note || '无法规划') + '</div>');
        h.push('<div class="leg-nav"><a href="' + naverTransitHref(nodes[order[idx]], nodes[next]) + '" target="_blank" rel="noopener">Naver 公交路线</a></div></div>');
      }
      h.push('</div>');
      if (leg != null) h.push('<span class="route-leg">' + Math.round(leg.minutes) + '分</span>');
      h.push('</li>');
    });
    h.push('</ol>');
    h.push('<div class="route-total">预计总公共交通时间：<b>' + fmtTime(total) + '</b>（含步行与换乘，估算值）</div>');
    h.push('<div class="route-note">🚌 <b>气候卡（기후동행카드）</b>＝首尔市公共交通月票：市界内 1~9 号线、支线、盆唐/京义中央/机场铁路（一般）及市内公交可用；<b>超出首尔市界</b>（富川、河南渼沙、龙仁等）、机场快线直达、KTX、高速巴士<b>不可用</b>。Naver Map 公交路线中带 🌱 图标的路段即为气候卡可用路段。以上时间为估算，请以 Naver Map 实时公交为准。</div>');
    box.innerHTML = h.join('');
  }

  /* ================= 用户添加地点 ================= */
  function initAddPlace() {
    var btn = document.getElementById('add-place-btn');
    var modal = document.getElementById('add-modal');
    if (!btn || !modal) return;
    var unitBox = document.getElementById('ap-units');
    Object.keys(UNITS).forEach(function (uid) {
      var u = UNITS[uid];
      var label = document.createElement('label');
      label.className = 'chip chip-small';
      label.innerHTML = '<input type="checkbox" value="' + uid + '"><span class="chip-dot" style="background:' + u.color + '"></span>' + esc(u.name);
      unitBox.appendChild(label);
    });
    var memberBox = document.getElementById('ap-members');
    MEMBERS.forEach(function (m) {
      var label = document.createElement('label');
      label.className = 'chip chip-small' + (m.departed ? ' departed' : '');
      label.innerHTML = '<input type="checkbox" value="' + m.id + '">' + esc(m.name) + (m.departed ? '<em class="departed-tag">已退团</em>' : '');
      memberBox.appendChild(label);
    });
    btn.addEventListener('click', function () {
      modal.hidden = !modal.hidden;
      apMsg('', true);
    });
    document.getElementById('ap-cancel').addEventListener('click', function () { modal.hidden = true; });
    document.getElementById('ap-save').addEventListener('click', addPlaceSubmit);
    document.getElementById('ap-export').addEventListener('click', function () {
      if (!customPlaces.length) { apMsg('暂无自定义地点可导出', false); return; }
      var blob = new Blob([JSON.stringify(customPlaces, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nct-custom-places.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      apMsg('✅ 已导出 ' + customPlaces.length + ' 条自定义地点（可粘贴进 js/data.js 永久同步）', true);
    });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
  }

  function collectFormChecked(prefix) {
    var out = [];
    document.querySelectorAll('#ap-' + prefix + ' input:checked').forEach(function (el) {
      if (out.indexOf(el.value) < 0) out.push(el.value);
    });
    return out;
  }

  function apMsg(txt, ok) {
    var el = document.getElementById('ap-msg');
    if (!el) return;
    el.innerHTML = txt;
    el.className = 'ap-msg' + (ok ? ' ok' : ' err');
  }

  function addPlaceSubmit() {
    var val = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var name = val('ap-name');
    var nameKo = val('ap-nameko');
    var addr = val('ap-address');
    var station = val('ap-station');
    var category = document.getElementById('ap-category').value;
    var type = document.getElementById('ap-type').value;
    var desc = val('ap-desc');
    var source = val('ap-source');
    var lat = parseFloat(document.getElementById('ap-lat').value);
    var lng = parseFloat(document.getElementById('ap-lng').value);
    var units = collectFormChecked('units');
    var members = collectFormChecked('members');
    if (!name && !nameKo) { apMsg('⚠️ 请至少填写地点名称', false); return; }
    if (!addr && !station && !(isFinite(lat) && isFinite(lng))) { apMsg('⚠️ 请填写地址或地铁站（用于定位）', false); return; }
    var dup = allPlaces().filter(function (p) {
      return (name && p.name === name) || (nameKo && p.nameKo === nameKo);
    });
    if (dup.length) {
      apMsg('⚠️ 网站中已存在该地点：<b>' + esc(dup[0].name) + '</b>（已为你在地图上定位，无需重复添加）', false);
      var mk = markers[dup[0].id];
      if (mk) { map.flyTo([dup[0].lat, dup[0].lng], 16, { duration: 0.6 }); setTimeout(function () { mk.openPopup(); }, 650); }
      return;
    }
    apMsg('🔄 正在定位…', true);
    var finish = function (coords) {
      var p = coords;
      p.id = 'custom_' + Date.now();
      p.custom = true;
      p.category = category;
      p.type = type;
      p.units = units;
      p.members = members;
      p.name = name;
      p.nameKo = nameKo;
      p.addressKo = addr;
      p.address = '';
      p.station = station;
      p.desc = desc;
      p.source = source;
      customPlaces.push(p);
      indexPlace(p);
      saveCustomPlaces();
      document.getElementById('add-modal').hidden = true;
      render();
      var mk2 = markers[p.id];
      if (mk2) { map.flyTo([p.lat, p.lng], 16, { duration: 0.6 }); setTimeout(function () { mk2.openPopup(); }, 650); }
      setRouteMsg('✅ 已添加自定义地点「' + esc(p.name || p.nameKo) + '」，已保存到本浏览器（刷新后仍在）。');
    };
    if (isFinite(lat) && isFinite(lng)) { finish({ lat: lat, lng: lng }); return; }
    var q = nameKo || name || addr;
    geoCode(q, function (g) {
      if (g) {
        finish({ lat: g.lat, lng: g.lng });
      } else {
        apMsg('⚠️ 自动定位失败，请在上方「纬度 / 经度」手动填写坐标（可在 Naver Map 上右键查看），或换用韩文地址重试。', false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMap();
    buildFilters();
    syncChipClasses();
    initSearch();
    initSidebarToggle();
    initRoute();
    initAddPlace();
    document.getElementById('clear-all').addEventListener('click', clearAll);
    // 注册筛选芯片 change 事件（分队 / 成员 / 类型 / 分类），保证点击立即筛选
    document.querySelectorAll('input[data-role="unit"], input[data-role="member"], input[data-role="type"], input[name="cat"]').forEach(function (c) {
      c.addEventListener('change', onFilterChange);
    });
    indexAll();
    render();
    // 手机端「地图操作 / 页面浏览」切换
    var mmBtn = document.getElementById('map-mode-toggle');
    if (mmBtn) {
      mmBtn.addEventListener('click', function () {
        var on = document.body.classList.toggle('map-mode');
        mmBtn.textContent = on ? '✋ 返回浏览' : '📍 地图操作';
        mmBtn.classList.toggle('on', on);
      });
    }
  });
})();
