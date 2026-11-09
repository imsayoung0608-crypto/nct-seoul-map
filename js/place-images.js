/* Per-place images: store uploaded images in browser and attach them to PLACES. */
(function () {
  'use strict';
  var KEY = 'nct_place_images_v1';
  var imageMap = {};
  try { imageMap = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { imageMap = {}; }
  function applyImages() { PLACES.forEach(function (p) { if (imageMap[p.id]) p.image = imageMap[p.id]; }); }
  applyImages();
  function saveMap() { try { localStorage.setItem(KEY, JSON.stringify(imageMap)); return true; } catch (e) { return false; } }
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) return reject(new Error('请选择图片文件'));
      if (file.size > 10 * 1024 * 1024) return reject(new Error('图片不能超过 10MB'));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('读取图片失败')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('图片格式无法识别')); };
        img.onload = function () {
          var max = 1400, scale = Math.min(1, max / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function notify(text) {
    var el = document.getElementById('dp-toast');
    if (el) { el.textContent = text; el.classList.add('show'); clearTimeout(notify.t); notify.t = setTimeout(function () { el.classList.remove('show'); }, 2200); }
    else { alert(text); }
  }
  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('place-image-input');
    if (!input) { input = document.createElement('input'); input.type = 'file'; input.id = 'place-image-input'; input.accept = 'image/*'; input.hidden = true; document.body.appendChild(input); }
    var targetId = null;
    document.addEventListener('click', function (e) {
      var setBtn = e.target.closest ? e.target.closest('[data-place-image-id]') : null;
      if (setBtn) { targetId = setBtn.getAttribute('data-place-image-id'); input.value = ''; input.click(); return; }
      var removeBtn = e.target.closest ? e.target.closest('[data-place-image-remove]') : null;
      if (removeBtn) {
        var id = removeBtn.getAttribute('data-place-image-remove');
        delete imageMap[id];
        var place = PLACES.filter(function (p) { return p.id === id; })[0];
        if (place) delete place.image;
        if (saveMap()) { notify('已移除地点图片'); setTimeout(function () { location.reload(); }, 250); }
        else { notify('移除图片失败'); }
      }
    });
    input.addEventListener('change', async function () {
      var file = input.files && input.files[0];
      if (!file || !targetId) return;
      try {
        notify('正在压缩并保存图片…');
        var dataUrl = await compressImage(file);
        imageMap[targetId] = dataUrl;
        if (!saveMap()) { delete imageMap[targetId]; throw new Error('浏览器存储空间不足，请换一张更小的图片'); }
        var place = PLACES.filter(function (p) { return p.id === targetId; })[0];
        if (place) place.image = dataUrl;
        notify('图片已保存，正在刷新…');
        setTimeout(function () { location.reload(); }, 350);
      } catch (err) { notify(err.message || '图片保存失败'); }
    });
  });
})();
