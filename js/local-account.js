/* NCT Seoul Map · 公网静态版本地账号（仅当前浏览器） */
(function () {
  'use strict';
  var DB_KEY = 'nct_local_account_db_v1';
  function available() {
    try {
      var params = new URLSearchParams(location.search);
      if (params.get('local_account') === '1') return true;
    } catch (e) {}
    return /github\.io$/i.test(location.hostname) || location.protocol === 'file:' || window.NCT_LOCAL_ACCOUNT === true;
  }
  function blank() { return { users:[], sessions:{}, folders:[], routes:[], shares:[], logs:[], seq:{ user:1, folder:1, route:1, log:1 } }; }
  function load() { try { var x=JSON.parse(localStorage.getItem(DB_KEY)||''); return x && x.users ? x : blank(); } catch (e) { return blank(); } }
  function save(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  function esc(s) { return String(s == null ? '' : s); }
  function norm(s) { return esc(s).trim(); }
  function lower(s) { return norm(s).toLowerCase(); }
  function now() { return new Date().toISOString(); }
  function hex(bytes) { return Array.prototype.map.call(new Uint8Array(bytes), function(b){ return ('0'+b.toString(16)).slice(-2); }).join(''); }
  function randomHex(n) { var a=new Uint8Array(n); if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for(var i=0;i<n;i++) a[i]=Math.floor(Math.random()*256); return hex(a); }
  function fallbackHash(s) { var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(16); }
  async function digest(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      var bytes = new TextEncoder().encode(text);
      var out = await crypto.subtle.digest('SHA-256', bytes);
      return hex(out);
    }
    return fallbackHash(text);
  }
  async function passHash(password, salt) { return digest(salt + ':' + password); }
  async function answerHash(answer, salt) { return digest(salt + ':' + lower(answer).replace(/\s+/g,' ')); }
  function userByName(db,name) { var n=lower(name); return db.users.filter(function(u){return lower(u.username)===n;})[0]||null; }
  function userById(db,id) { return db.users.filter(function(u){return u.id===Number(id);})[0]||null; }
  function tokenOf(opts) { var h=(opts&&opts.headers&&(opts.headers.Authorization||opts.headers.authorization))||''; return h.indexOf('Bearer ')===0?h.slice(7):''; }
  function me(db,opts) { var t=tokenOf(opts); var uid=db.sessions[t]; return uid?userById(db,uid):null; }
  function publicUser(u) { return u?{id:u.id,username:u.username,local:true}:null; }
  function canView(db,f,u) { if(!f) return false; if(f.visibility==='public') return true; if(!u) return false; if(f.owner_id===u.id) return true; return f.visibility==='shared' && db.shares.some(function(s){return s.folder_id===f.id&&s.user_id===u.id;}); }
  function canEdit(db,f,u) { if(!f||!u) return false; if(f.owner_id===u.id) return true; return f.visibility==='shared' && db.shares.some(function(s){return s.folder_id===f.id&&s.user_id===u.id;}); }
  function next(db,k) { var n=db.seq[k]||1; db.seq[k]=n+1; return n; }
  function routeRows(db,id) { return db.routes.filter(function(r){return r.folder_id===Number(id);}).sort(function(a,b){return b.updated_at.localeCompare(a.updated_at);}); }
  function folderDTO(db,f,u) {
    var owner=userById(db,f.owner_id); var shared=db.shares.filter(function(s){return s.folder_id===f.id;}).map(function(s){return publicUser(userById(db,s.user_id));}).filter(Boolean);
    return {id:f.id,name:f.name,visibility:f.visibility,owner:owner?owner.username:'',isOwner:!!(u&&u.id===f.owner_id),canEdit:canEdit(db,f,u),sharedWith:shared,routeCount:routeRows(db,f.id).length,createdAt:f.created_at,updatedAt:f.updated_at};
  }
  function folderFull(db,id,u) { var f=db.folders.filter(function(x){return x.id===Number(id);})[0]; if(!f) return {status:404,body:{error:'路线集不存在'}}; if(!canView(db,f,u)) return {status:403,body:{error:'无权查看（私密路线集）'}}; var out=folderDTO(db,f,u); out.routes=routeRows(db,id).map(function(r){return {id:r.id,name:r.name,origin:r.origin,stops:r.stops||[],note:r.note||'',updatedAt:r.updated_at};}); return {status:200,body:{folder:out}}; }
  function log(db,folderId,routeId,userId,action,detail) { db.logs.unshift({id:next(db,'log'),folder_id:folderId,route_id:routeId||null,user_id:userId,action:action,detail:detail||null,created_at:now()}); }
  function parseBody(opts) { try { if (!opts || !opts.body) return {}; if (typeof opts.body === 'object') return opts.body; return JSON.parse(opts.body); } catch(e) { return {}; } }
  async function api(path, opts) {
    opts=opts||{}; var method=(opts.method||'GET').toUpperCase(); var b=parseBody(opts); var db=load(); var u=me(db,opts);
    function out(status,body){ save(db); return {status:status,body:body}; }
    if (path==='/api/auth/register' && method==='POST') {
      var username=norm(b.username), password=String(b.password||''), question=norm(b.question), answer=norm(b.answer);
      if(!/^[A-Za-z0-9_\-.]{3,24}$/.test(username)) return out(400,{error:'用户名需为 3–24 位字母/数字/_-. '});
      if(password.length<8) return out(400,{error:'密码至少 8 位'});
      if(lower(password)===lower(username)) return out(400,{error:'密码不能与用户名相同'});
      if(question.length<2||answer.length<2) return out(400,{error:'请设置找回问题与答案'});
      if(userByName(db,username)) return out(409,{error:'用户名已存在'});
      var salt=randomHex(16), asalt=randomHex(16), id=next(db,'user');
      var user={id:id,username:username,salt:salt,pass_hash:await passHash(password,salt),question:question,answer_salt:asalt,answer_hash:await answerHash(answer,asalt),created_at:now()};
      db.users.push(user); var token='local-'+randomHex(20); db.sessions[token]=id; return out(201,{token:token,user:publicUser(user)});
    }
    if (path==='/api/auth/login' && method==='POST') {
      var lu=userByName(db,b.username); if(!lu||lu.pass_hash!==await passHash(String(b.password||''),lu.salt)) return out(401,{error:'用户名或密码错误'});
      var lt='local-'+randomHex(20); db.sessions[lt]=lu.id; return out(200,{token:lt,user:publicUser(lu)});
    }
    if (path==='/api/auth/question' && method==='GET') {
      var qu=userByName(db,new URLSearchParams((path.split('?')[1]||'')).get('username')); if(!qu) return out(404,{error:'用户不存在'}); return out(200,{question:qu.question});
    }
    if (path==='/api/auth/recover' && method==='POST') {
      var ru=userByName(db,b.username); if(!ru) return out(404,{error:'用户不存在'});
      if(ru.answer_hash!==await answerHash(b.answer,ru.answer_salt)) return out(403,{error:'找回问题答案不正确'});
      var np=String(b.newPassword||''); if(np.length<8) return out(400,{error:'新密码至少 8 位'}); if(lower(np)===lower(ru.username)) return out(400,{error:'密码不能与用户名相同'});
      ru.salt=randomHex(16); ru.pass_hash=await passHash(np,ru.salt); Object.keys(db.sessions).forEach(function(t){if(db.sessions[t]===ru.id) delete db.sessions[t];}); return out(200,{ok:true});
    }
    if (path==='/api/auth/me') { return u?out(200,{user:publicUser(u)}):out(401,{error:'未登录'}); }
    if (path==='/api/auth/logout' && method==='POST') { var t=tokenOf(opts); if(t) delete db.sessions[t]; return out(200,{ok:true}); }
    if (path==='/api/folders' && method==='GET') { if(!u) return out(401,{error:'未登录'}); var fs=db.folders.filter(function(f){return f.owner_id===u.id||db.shares.some(function(s){return s.folder_id===f.id&&s.user_id===u.id;});}); return out(200,{folders:fs.map(function(f){return folderDTO(db,f,u);})}); }
    if (path==='/api/folders' && method==='POST') { if(!u) return out(401,{error:'未登录'}); var fn=norm(b.name); if(!fn) return out(400,{error:'请填写路线集名称'}); var vis=['private','public','shared'].indexOf(b.visibility)>=0?b.visibility:'private'; var nf={id:next(db,'folder'),owner_id:u.id,name:fn,visibility:vis,created_at:now(),updated_at:now()}; db.folders.push(nf); log(db,nf.id,null,u.id,'create_folder',{name:fn,visibility:vis}); return out(201,{folder:folderDTO(db,nf,u)}); }
    if (path==='/api/public/folders' && method==='GET') { var q=lower(new URLSearchParams((path.split('?')[1]||'')).get('q')); var pubs=db.folders.filter(function(f){return f.visibility==='public';}); if(q) pubs=pubs.filter(function(f){var o=userById(db,f.owner_id); return lower(f.name).indexOf(q)>=0||(o&&lower(o.username).indexOf(q)>=0);}); return out(200,{folders:pubs.map(function(f){var o=userById(db,f.owner_id); return {id:f.id,name:f.name,owner:o?o.username:'',routeCount:routeRows(db,f.id).length,updatedAt:f.updated_at};})}); }
    var m;
    if ((m=path.match(/^\/api\/folders\/(\d+)$/))) {
      var fid=Number(m[1]), f=db.folders.filter(function(x){return x.id===fid;})[0];
      if(method==='GET') { var full=folderFull(db,fid,u); return out(full.status,full.body); }
      if(method==='PATCH') { if(!u) return out(401,{error:'未登录'}); if(!f||f.owner_id!==u.id) return out(403,{error:'只有创建者可修改路线集'}); f.name=b.name!=null?norm(b.name):f.name; f.visibility=['private','public','shared'].indexOf(b.visibility)>=0?b.visibility:f.visibility; f.updated_at=now(); log(db,f.id,null,u.id,'update_folder',{name:f.name,visibility:f.visibility}); return out(200,{folder:folderDTO(db,f,u),routes:routeRows(db,f.id)}); }
      if(method==='DELETE') { if(!u||!f||f.owner_id!==u.id) return out(403,{error:'只有创建者可删除路线集'}); db.folders=db.folders.filter(function(x){return x.id!==fid;}); db.routes=db.routes.filter(function(r){return r.folder_id!==fid;}); db.shares=db.shares.filter(function(s){return s.folder_id!==fid;}); return out(200,{ok:true}); }
    }
    if ((m=path.match(/^\/api\/folders\/(\d+)\/routes$/))) {
      var rf=db.folders.filter(function(x){return x.id===Number(m[1]);})[0]; if(!canEdit(db,rf,u)) return out(403,{error:'无权在该路线集保存路线'});
      if(method==='POST') { var rn=norm(b.name); if(!rn) return out(400,{error:'请给路线命名'}); var nr={id:next(db,'route'),folder_id:rf.id,owner_id:u.id,name:rn,origin:norm(b.origin),stops:Array.isArray(b.stops)?b.stops.map(String):[],note:norm(b.note),created_at:now(),updated_at:now()}; db.routes.push(nr); rf.updated_at=now(); log(db,rf.id,nr.id,u.id,'create_route',{name:rn,stops:nr.stops}); return out(201,folderFull(db,rf.id,u).body); }
      if(method==='GET') { var g=folderFull(db,rf.id,u); return out(g.status,g.body); }
    }
    if ((m=path.match(/^\/api\/routes\/(\d+)$/))) {
      var rr=db.routes.filter(function(x){return x.id===Number(m[1]);})[0]; var rf2=rr&&db.folders.filter(function(x){return x.id===rr.folder_id;})[0]; if(!rr||!canEdit(db,rf2,u)) return out(403,{error:'无权修改该路线'});
      if(method==='PATCH') { if(b.name!=null) rr.name=norm(b.name); if(b.origin!=null) rr.origin=norm(b.origin); if(Array.isArray(b.stops)) rr.stops=b.stops.map(String); if(b.note!=null) rr.note=norm(b.note); rr.updated_at=now(); rf2.updated_at=now(); log(db,rf2.id,rr.id,u.id,'update_route',{name:rr.name,stops:rr.stops}); return out(200,folderFull(db,rf2.id,u).body); }
      if(method==='DELETE') { db.routes=db.routes.filter(function(x){return x.id!==rr.id;}); log(db,rf2.id,rr.id,u.id,'delete_route',{name:rr.name}); return out(200,{ok:true}); }
    }
    if ((m=path.match(/^\/api\/folders\/(\d+)\/share$/))) { var sf=db.folders.filter(function(x){return x.id===Number(m[1]);})[0]; if(!u||!sf||sf.owner_id!==u.id) return out(403,{error:'只有创建者可共享路线集'}); var su=userByName(db,b.username); if(!su) return out(404,{error:'用户不存在'}); if(!db.shares.some(function(s){return s.folder_id===sf.id&&s.user_id===su.id;})) db.shares.push({folder_id:sf.id,user_id:su.id}); log(db,sf.id,null,u.id,'share_add',{username:su.username}); return out(200,{ok:true}); }
    if ((m=path.match(/^\/api\/folders\/(\d+)\/share\/(\d+)$/))) { var df=db.folders.filter(function(x){return x.id===Number(m[1]);})[0]; if(!u||!df||df.owner_id!==u.id) return out(403,{error:'只有创建者可修改共享成员'}); db.shares=db.shares.filter(function(s){return !(s.folder_id===df.id&&s.user_id===Number(m[2]));}); log(db,df.id,null,u.id,'share_remove',{userId:Number(m[2])}); return out(200,{ok:true}); }
    if ((m=path.match(/^\/api\/folders\/(\d+)\/logs$/))) { var lf=db.folders.filter(function(x){return x.id===Number(m[1]);})[0]; if(!u||!lf||!(lf.owner_id===u.id||db.shares.some(function(s){return s.folder_id===lf.id&&s.user_id===u.id;}))) return out(403,{error:'无权查看编辑记录'}); var logs=db.logs.filter(function(l){return l.folder_id===lf.id;}).map(function(l){var lu=userById(db,l.user_id); return {id:l.id,action:l.action,detail:l.detail,username:lu?lu.username:'',createdAt:l.created_at};}); return out(200,{logs:logs}); }
    return out(404,{error:'本地接口不存在'});
  }
  window.NCTLocalAccount = { available:available, api:async function(path,opts){ var r=await api(path,opts); if(r.status<200||r.status>=300){var e=new Error(r.body&&r.body.error||('请求失败 '+r.status)); throw e;} return r.body; } };
})();
