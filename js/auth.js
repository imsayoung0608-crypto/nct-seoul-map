/* Week 4 minimal auth client: login, register, session restore, logout. */
(function () {
  'use strict';
  var TOKEN_KEY = 'nct_week4_token';
  var state = { user: null };
  function $(id) { return document.getElementById(id); }
  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(value) { try { value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function msg(id, text, ok) { var el=$(id); if(!el) return; el.textContent=text||''; el.className='auth-msg'+(ok?' ok':(text?' err':'')); }
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
  function updateUserUI() {
    var label=$('auth-label'), userBox=$('auth-user'), logout=$('auth-logout'), guest=$('auth-guest');
    if(label) label.textContent=state.user?state.user.username:'登录';
    if(userBox) userBox.textContent=state.user?('已登录：'+state.user.username):'当前未登录';
    if(logout) logout.hidden=!state.user;
    if(guest) guest.hidden=!!state.user;
  }
  function openModal(){var m=$('auth-modal');if(m)m.hidden=false;}
  function closeModal(){var m=$('auth-modal');if(m)m.hidden=true;}
  function showTab(which){
    $('auth-tab-login').classList.toggle('on',which==='login');
    $('auth-tab-register').classList.toggle('on',which==='register');
    $('auth-login-form').hidden=which!=='login';
    $('auth-register-form').hidden=which!=='register';
  }
  async function restore(){
    if(!token()){updateUserUI();return;}
    try{var data=await api('/api/auth/me');state.user=data.user||null;}catch(e){setToken('');state.user=null;}
    updateUserUI();
  }
  document.addEventListener('DOMContentLoaded',function(){
    var openBtn=$('auth-open');if(openBtn)openBtn.addEventListener('click',openModal);
    var closeBtn=$('auth-close');if(closeBtn)closeBtn.addEventListener('click',closeModal);
    var backdrop=document.querySelector('[data-auth-close]');if(backdrop)backdrop.addEventListener('click',closeModal);
    var guest=$('auth-guest');if(guest)guest.addEventListener('click',closeModal);
    var tabLogin=$('auth-tab-login');if(tabLogin)tabLogin.addEventListener('click',function(){showTab('login');});
    var tabReg=$('auth-tab-register');if(tabReg)tabReg.addEventListener('click',function(){showTab('register');});
    var loginForm=$('auth-login-form');
    if(loginForm)loginForm.addEventListener('submit',async function(e){
      e.preventDefault();msg('auth-login-msg','正在登录…',true);
      try{var data=await api('/api/auth/login',{method:'POST',body:JSON.stringify({username:$('auth-login-user').value,password:$('auth-login-pass').value})});setToken(data.token);state.user=data.user;updateUserUI();setTimeout(closeModal,250);}catch(err){msg('auth-login-msg',err.message,false);}
    });
    var regForm=$('auth-register-form');
    if(regForm)regForm.addEventListener('submit',async function(e){
      e.preventDefault();msg('auth-reg-msg','正在注册…',true);
      var username=$('auth-reg-user').value.trim(),password=$('auth-reg-pass').value;
      if(!/^[A-Za-z0-9_.-]{3,24}$/.test(username))return msg('auth-reg-msg','用户名需为 3–24 位字母、数字、_、- 或 .',false);
      if(password.length<8)return msg('auth-reg-msg','密码至少 8 位',false);
      if(password.toLowerCase()===username.toLowerCase())return msg('auth-reg-msg','密码不能与用户名相同',false);
      try{var data=await api('/api/auth/register',{method:'POST',body:JSON.stringify({username:username,password:password,question:$('auth-reg-question').value,answer:$('auth-reg-answer').value})});setToken(data.token);state.user=data.user;updateUserUI();setTimeout(closeModal,250);}catch(err){msg('auth-reg-msg',err.message,false);}
    });
    var logout=$('auth-logout');
    if(logout)logout.addEventListener('click',async function(){try{await api('/api/auth/logout',{method:'POST'});}catch(e){}setToken('');state.user=null;updateUserUI();closeModal();});
    updateUserUI();restore();
  });
})();
