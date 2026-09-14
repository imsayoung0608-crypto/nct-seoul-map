/* NCT Seoul Map · NEO GOT MY BACK 启动页与登录/注册入口 */
(function () {
  'use strict';
  var splash = document.getElementById('neo-splash');
  var gate = document.getElementById('neo-auth-gate');
  var loginForm = document.getElementById('neo-login-form');
  var registerForm = document.getElementById('neo-register-form');
  var loginTab = document.getElementById('neo-tab-login');
  var registerTab = document.getElementById('neo-tab-register');
  var entered = false;
  function $(id) { return document.getElementById(id); }
  function setMsg(id, text, ok) { var el=$(id); if(!el) return; el.textContent=text||''; el.className='neo-auth-msg'+(ok?' ok':''); }
  function setHint(input, hintId, text, ok) { var el=$(input), hint=$(hintId); if(!el||!hint) return; hint.textContent=text||''; hint.className='neo-auth-hint'+(text?(ok?' ok':' err'):''); el.classList.toggle('invalid',!!text&&!ok); el.classList.toggle('valid',!!text&&ok); }
  function showGate() {
    if (entered || !gate) return;
    if (splash) splash.classList.add('hide');
    gate.hidden = false;
    setTimeout(function(){ gate.classList.remove('hide'); }, 20);
    setTimeout(function(){ var u=$('neo-login-user'); if(u) u.focus(); }, 420);
  }
  function enterApp(mode) {
    if (entered) return; entered = true;
    document.body.classList.toggle('guest-mode', mode === 'guest');
    if (mode === 'guest') sessionStorage.setItem('nct_entry_mode','guest'); else sessionStorage.removeItem('nct_entry_mode');
    var btn=$('acct-btn');
    if (btn && mode === 'guest') btn.textContent='👤 游客';
    if (gate) { gate.classList.add('hide'); setTimeout(function(){ gate.hidden=true; },360); }
    if (splash) splash.classList.add('hide');
  }
  function switchMode(mode) {
    var login = mode !== 'register';
    if (loginTab) loginTab.classList.toggle('on',login);
    if (registerTab) registerTab.classList.toggle('on',!login);
    if (loginForm) loginForm.hidden=!login;
    if (registerForm) registerForm.hidden=login;
    setMsg('neo-login-msg',''); setMsg('neo-reg-msg','');
  }
  function validateRegister() {
    var u=$('neo-reg-user'), p=$('neo-reg-pass'), p2=$('neo-reg-pass2');
    if(!u||!p||!p2) return false;
    var uv=u.value.trim(), pv=p.value;
    var uOk=/^[A-Za-z0-9_\-.]{3,24}$/.test(uv);
    setHint('neo-reg-user','neo-reg-user-hint',uv?(uOk?'✓ 用户名格式正确':'用户名需 3–24 位字母/数字/_-. '):'',uOk);
    var msg='',ok=false;
    if(pv){ if(pv.length<8) msg='密码至少 8 位（当前 '+pv.length+' 位）'; else if(uv&&pv.toLowerCase()===uv.toLowerCase()) msg='密码不能与用户名相同'; else {msg='✓ 密码可用';ok=true;} }
    setHint('neo-reg-pass','neo-reg-pass-hint',msg,ok);
    var m2='',o2=false; if(p2.value){ if(p2.value!==pv) m2='两次输入的密码不一致'; else {m2='✓ 两次输入一致';o2=true;} }
    setHint('neo-reg-pass2','neo-reg-pass2-hint',m2,o2);
    return uOk&&pv.length>=8&&pv.toLowerCase()!==uv.toLowerCase()&&p2.value===pv;
  }
  if (splash) {
    var timer = setTimeout(showGate,2000);
    splash.addEventListener('click', function(){ clearTimeout(timer); showGate(); });
    splash.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); clearTimeout(timer); showGate(); } });
  }
  if (loginTab) loginTab.addEventListener('click',function(){switchMode('login')});
  if (registerTab) registerTab.addEventListener('click',function(){switchMode('register')});
  if (registerForm) {
    ['neo-reg-user','neo-reg-pass','neo-reg-pass2'].forEach(function(id){ var el=$(id); if(el) el.addEventListener('input',validateRegister); });
    registerForm.addEventListener('submit',function(e){
      e.preventDefault();
      if(!validateRegister()){ setMsg('neo-reg-msg','请先修正注册信息',false); return; }
      var q=$('neo-reg-q').value.trim(), a=$('neo-reg-a').value.trim();
      if(!q||a.length<2){ setMsg('neo-reg-msg','请设置找回问题与答案',false); return; }
      var btn=registerForm.querySelector('button[type="submit"]'); if(btn) btn.disabled=true; setMsg('neo-reg-msg','正在创建账号…',true);
      window.NCTAccount.register({username:$('neo-reg-user').value.trim(),password:$('neo-reg-pass').value,question:q,answer:a}).then(function(user){ enterApp('user'); if(user) { var b=$('acct-btn'); if(b) b.textContent='👤 '+user.username; } }).catch(function(err){ setMsg('neo-reg-msg',err.message||'注册失败',false); }).then(function(){ if(btn) btn.disabled=false; });
    });
  }
  if (loginForm) {
    loginForm.addEventListener('submit',function(e){
      e.preventDefault();
      var u=$('neo-login-user').value.trim(), p=$('neo-login-pass').value;
      if(!u||!p){ setMsg('neo-login-msg','请输入用户名和密码',false); return; }
      var btn=loginForm.querySelector('button[type="submit"]'); if(btn) btn.disabled=true; setMsg('neo-login-msg','正在登录…',true);
      window.NCTAccount.login(u,p).then(function(user){ enterApp('user'); if(user) { var b=$('acct-btn'); if(b) b.textContent='👤 '+user.username; } }).catch(function(err){ setMsg('neo-login-msg',err.message||'登录失败',false); }).then(function(){ if(btn) btn.disabled=false; });
    });
  }
  var guest=$('neo-guest'); if(guest) guest.addEventListener('click',function(){ enterApp('guest'); });
  if (window.NCTAccount && window.NCTAccount.refreshUser) window.NCTAccount.refreshUser().catch(function(){});
})();
