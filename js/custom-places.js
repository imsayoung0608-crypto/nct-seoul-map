/* Week 4: add a place by multilingual address, with no manual latitude/longitude entry. */
(function () {
  'use strict';
  var KEY = 'nct_custom_places_week4_v1';
  var state = { lat: null, lng: null, label: '' };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s); }
  function load() {
    try { var arr = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(arr) ? arr : []; }
    catch (e) { return []; }
  }
  function save(arr) { localStorage.setItem(KEY, JSON.stringify(arr)); }
  function setMsg(text, ok) {
    var el = $('custom-msg'); if (!el) return;
    el.textContent = text || '';
    el.className = 'custom-msg' + (ok ? ' ok' : (text ? ' err' : ''));
  }
  function setGeoResult(text, ok) {
    var el = $('custom-geocode-result'); if (!el) return;
    el.textContent = text || '尚未识别地址';
    el.className = 'custom-geocode-result' + (ok ? ' ok' : (text && text.indexOf('尚未') !== 0 ? ' err' : ''));
  }

  /* Register saved custom places before app.js builds its search index. */
  var saved = load();
  saved.forEach(function (p) {
    if (!p || !p.id) return;
    p.custom = true;
    if (!PLACES.some(function (x) { return x.id === p.id; })) PLACES.push(p);
  });

  function photonQuery(q) {
    return fetch('https://photon.komoot.io/api/?limit=5&countrycode=KR&q=' + encodeURIComponent(q), { headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('Photon HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var f = data && data.features && data.features[0];
        if (!f || !f.geometry || !f.geometry.coordinates) return null;
        var c = f.geometry.coordinates;
        var p = f.properties || {};
        var label = [p.name, p.street, p.district, p.city, p.country].filter(Boolean).join(', ');
        return { lat: Number(c[1]), lng: Number(c[0]), label: label || q };
      });
  }
  function nominatimQuery(q) {
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=kr&accept-language=zh-CN,ko,en&q=' + encodeURIComponent(q);
    return fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('Nominatim HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var f = data && data[0];
        if (!f || f.lat == null || f.lon == null) return null;
        return { lat: Number(f.lat), lng: Number(f.lon), label: f.display_name || q };
      });
  }
  async function geocodeAddress(address) {
    var q = String(address || '').trim();
    if (!q) throw new Error('请先输入地址');
    var queries = [q];
    if (!/서울|seoul|首尔/i.test(q)) { queries.push(q + ' 서울'); queries.push(q + ' Seoul'); }
    for (var i = 0; i < queries.length; i++) {
      try { var p = await photonQuery(queries[i]); if (p) return p; } catch (e) {}
    }
    for (var j = 0; j < queries.length; j++) {
      try { var n = await nominatimQuery(queries[j]); if (n) return n; } catch (e) {}
    }
    throw new Error('没有识别到地址，请补充区、洞、路名，或改用更完整的韩文地址');
  }

  function chips(container, values, name) {
    if (!container) return;
    container.innerHTML = '';
    Object.keys(values).forEach(function (id) {
      var v = values[id]; if (!v) return;
      var label = document.createElement('label'); label.className = 'custom-chip';
      var input = document.createElement('input'); input.type = 'checkbox'; input.value = id; input.name = name;
      var span = document.createElement('span'); span.textContent = v.name || id;
      label.appendChild(input); label.appendChild(span); container.appendChild(label);
    });
  }
  function selected(name) {
    var out = [];
    document.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (x) { if (out.indexOf(x.value) < 0) out.push(x.value); });
    return out;
  }
  function openModal() { var m=$('custom-place-modal'); if(m) m.hidden=false; setMsg(''); }
  function closeModal() { var m=$('custom-place-modal'); if(m) m.hidden=true; }

  document.addEventListener('DOMContentLoaded', function () {
    var open=$('custom-place-open'); if(open) open.addEventListener('click', openModal);
    var close=$('custom-close'); if(close) close.addEventListener('click', closeModal);
    var back=document.querySelector('[data-custom-close]'); if(back) back.addEventListener('click', closeModal);
    chips($('custom-units'), UNITS, 'custom-unit');
    chips($('custom-members'), MEMBERS.reduce(function (acc, m) { acc[m.id] = m; return acc; }, {}), 'custom-member');
    var addressInput=$('custom-address');
    if(addressInput) addressInput.addEventListener('input', function(){
      state.lat=null; state.lng=null; state.label='';
      setGeoResult('尚未识别地址'); setMsg('地址已修改，请重新识别', false);
    });

    var geo=$('custom-geocode');
    if(geo) geo.addEventListener('click', async function(){
      var btn=geo; btn.disabled=true; setMsg('正在识别地址…', true); setGeoResult('识别中…', true);
      try {
        var r=await geocodeAddress($('custom-address').value);
        state.lat=r.lat; state.lng=r.lng; state.label=r.label;
        setGeoResult('识别结果：' + r.label + '\n大致坐标：' + r.lat.toFixed(5) + ', ' + r.lng.toFixed(5), true);
        setMsg('地址识别成功，可以保存地点。', true);
      } catch (e) {
        state.lat=null; state.lng=null; state.label='';
        setGeoResult(e.message, false); setMsg(e.message, false);
      } finally { btn.disabled=false; }
    });

    var form=$('custom-form');
    if(form) form.addEventListener('submit', async function(e){
      e.preventDefault(); setMsg('');
      var name=$('custom-name').value.trim(); var address=$('custom-address').value.trim();
      if(!name) return setMsg('请填写地点名称', false);
      if(!address) return setMsg('请填写地址', false);
      if(state.lat == null || state.lng == null){
        setMsg('请先点击“识别地址”，确认大致位置', false); return;
      }
      var place={
        id:'custom-' + Date.now().toString(36),
        name:name,
        nameKo:$('custom-name-ko').value.trim() || address,
        category:$('custom-category').value,
        type:$('custom-type').value,
        units:selected('custom-unit'),
        members:selected('custom-member'),
        addressKo:address,
        address:address,
        station:$('custom-station').value.trim(),
        desc:$('custom-desc').value.trim(),
        source:$('custom-source').value.trim(),
        lat:Number(state.lat.toFixed(6)),
        lng:Number(state.lng.toFixed(6)),
        displayName:state.label,
        custom:true
      };
      saved.push(place); save(saved); PLACES.push(place);
      setMsg('已保存，正在刷新地图…', true);
      setTimeout(function(){ location.reload(); }, 400);
    });
  });
})();
