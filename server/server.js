/* NCT Seoul Map · Week 4 backend
 * Features: static site hosting + user registration/login/recovery.
 * Run: node server/server.js (default port 8092)
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'nct.sqlite');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  question TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  answer_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS place_likes (
  place_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (place_id, user_id)
);
CREATE TABLE IF NOT EXISTS place_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_place_comments_place ON place_comments(place_id, id DESC);
DROP TABLE IF EXISTS folder_shares;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS edit_logs;
`);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp'
};

function json(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
  });
  res.end(JSON.stringify(body));
}
function norm(value) { return String(value == null ? '' : value).trim(); }
function normAnswer(value) { return norm(value).toLowerCase().replace(/\s+/g, ' '); }
function nowISO() { return new Date().toISOString(); }
function newSalt() { return crypto.randomBytes(16).toString('hex'); }
function hash(value, salt) { return crypto.scryptSync(String(value), salt, 64).toString('hex'); }
function readBody(req) {
  return new Promise(function (resolve) {
    let data = '';
    let tooLarge = false;
    req.on('data', function (chunk) {
      data += chunk;
      if (data.length > 1e6) { tooLarge = true; req.destroy(); }
    });
    req.on('end', function () {
      if (tooLarge) return resolve(null);
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve(null); }
    });
  });
}
function issueToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO sessions(token,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(token, userId, expiresAt, nowISO());
  return token;
}
function auth(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const row = db.prepare('SELECT s.expires_at, u.id, u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?').get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token=?').run(token);
    return null;
  }
  return { id: row.id, username: row.username, token: token };
}

function socialFor(placeId, me) {
  const likesCount = db.prepare('SELECT COUNT(*) AS n FROM place_likes WHERE place_id=?').get(placeId).n;
  const likedByMe = !!(me && db.prepare('SELECT 1 FROM place_likes WHERE place_id=? AND user_id=?').get(placeId, me.id));
  const comments = db.prepare('SELECT c.id, c.user_id, u.username, c.text, c.created_at FROM place_comments c JOIN users u ON u.id=c.user_id WHERE c.place_id=? ORDER BY c.id DESC LIMIT 200').all(placeId)
    .map(function (c) {
      return { id: c.id, author: c.username, username: c.username, text: c.text, createdAt: c.created_at, canDelete: !!(me && me.id === c.user_id) };
    });
  return { placeId: placeId, likesCount: likesCount, liked: likedByMe, comments: comments, local: false };
}

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') return json(res, 204, {});

  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, time: nowISO() });
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body) return json(res, 400, { error: '请求格式错误' });
      const username = norm(body.username);
      const password = String(body.password || '');
      const question = norm(body.question);
      const answer = norm(body.answer);
      if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) return json(res, 400, { error: '用户名需为 3–24 位字母、数字、_、- 或 .' });
      if (password.length < 8) return json(res, 400, { error: '密码至少 8 位' });
      if (password.toLowerCase() === username.toLowerCase()) return json(res, 400, { error: '密码不能与用户名相同' });
      if (!question || answer.length < 2) return json(res, 400, { error: '请设置找回问题与答案' });
      if (db.prepare('SELECT 1 FROM users WHERE username=? COLLATE NOCASE').get(username)) return json(res, 409, { error: '用户名已存在' });
      const passSalt = newSalt();
      const answerSalt = newSalt();
      const info = db.prepare('INSERT INTO users(username,pass_hash,pass_salt,question,answer_hash,answer_salt,created_at) VALUES(?,?,?,?,?,?,?)')
        .run(username, hash(password, passSalt), passSalt, question, hash(normAnswer(answer), answerSalt), answerSalt, nowISO());
      return json(res, 201, { token: issueToken(info.lastInsertRowid), user: { id: Number(info.lastInsertRowid), username: username } });
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body) return json(res, 400, { error: '请求格式错误' });
      const row = db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE').get(norm(body.username));
      if (!row || hash(String(body.password || ''), row.pass_salt) !== row.pass_hash) return json(res, 401, { error: '用户名或密码错误' });
      return json(res, 200, { token: issueToken(row.id), user: { id: row.id, username: row.username } });
    }

    if (pathname === '/api/auth/question' && req.method === 'GET') {
      const row = db.prepare('SELECT question FROM users WHERE username=? COLLATE NOCASE').get(norm(url.searchParams.get('username')));
      if (!row) return json(res, 404, { error: '用户不存在' });
      return json(res, 200, { question: row.question });
    }

    if (pathname === '/api/auth/recover' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body) return json(res, 400, { error: '请求格式错误' });
      const row = db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE').get(norm(body.username));
      if (!row) return json(res, 404, { error: '用户不存在' });
      if (hash(normAnswer(body.answer), row.answer_salt) !== row.answer_hash) return json(res, 403, { error: '找回答案不正确' });
      const password = String(body.newPassword || '');
      if (password.length < 8) return json(res, 400, { error: '新密码至少 8 位' });
      if (password.toLowerCase() === row.username.toLowerCase()) return json(res, 400, { error: '密码不能与用户名相同' });
      const salt = newSalt();
      db.prepare('UPDATE users SET pass_hash=?, pass_salt=? WHERE id=?').run(hash(password, salt), salt, row.id);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.id);
      return json(res, 200, { ok: true });
    }

    const me = auth(req);
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      if (!me) return json(res, 401, { error: '未登录' });
      return json(res, 200, { user: { id: me.id, username: me.username } });
    }
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      if (me) db.prepare('DELETE FROM sessions WHERE token=?').run(me.token);
      return json(res, 200, { ok: true });
    }

    let socialMatch;
    if ((socialMatch = pathname.match(/^\/api\/places\/([A-Za-z0-9_-]+)\/social$/)) && req.method === 'GET') {
      return json(res, 200, socialFor(decodeURIComponent(socialMatch[1]), me));
    }
    if ((socialMatch = pathname.match(/^\/api\/places\/([A-Za-z0-9_-]+)\/like$/)) && req.method === 'POST') {
      if (!me) return json(res, 401, { error: '请先登录后再点赞' });
      const placeId = decodeURIComponent(socialMatch[1]);
      const existing = db.prepare('SELECT 1 FROM place_likes WHERE place_id=? AND user_id=?').get(placeId, me.id);
      if (existing) db.prepare('DELETE FROM place_likes WHERE place_id=? AND user_id=?').run(placeId, me.id);
      else db.prepare('INSERT INTO place_likes(place_id,user_id,created_at) VALUES(?,?,?)').run(placeId, me.id, nowISO());
      return json(res, 200, socialFor(placeId, me));
    }
    if ((socialMatch = pathname.match(/^\/api\/places\/([A-Za-z0-9_-]+)\/comments$/)) && req.method === 'POST') {
      if (!me) return json(res, 401, { error: '请先登录后再发表评论' });
      const body = await readBody(req);
      if (!body) return json(res, 400, { error: '请求格式错误' });
      const text = norm(body.text);
      if (!text) return json(res, 400, { error: '评论不能为空' });
      if (text.length > 500) return json(res, 400, { error: '评论不能超过 500 字' });
      db.prepare('INSERT INTO place_comments(place_id,user_id,text,created_at) VALUES(?,?,?,?)').run(decodeURIComponent(socialMatch[1]), me.id, text, nowISO());
      return json(res, 201, socialFor(decodeURIComponent(socialMatch[1]), me));
    }
    const commentDeleteMatch = pathname.match(/^\/api\/comments\/(\d+)$/);
    if (commentDeleteMatch && req.method === 'DELETE') {
      if (!me) return json(res, 401, { error: '请先登录后再删除评论' });
      const cid = Number(commentDeleteMatch[1]);
      const row = db.prepare('SELECT * FROM place_comments WHERE id=?').get(cid);
      if (!row) return json(res, 404, { error: '评论不存在' });
      if (row.user_id !== me.id) return json(res, 403, { error: '只能删除自己的评论' });
      db.prepare('DELETE FROM place_comments WHERE id=?').run(cid);
      return json(res, 200, { ok: true });
    }

    if (pathname.startsWith('/api/')) return json(res, 404, { error: '接口不存在' });

    let rel = pathname === '/' ? '/index.html' : pathname;
    const file = path.resolve(ROOT, '.' + rel);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
      res.writeHead(403); return res.end('403 Forbidden');
    }
    fs.readFile(file, function (err, data) {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 Not Found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: '服务器内部错误' });
  }
});

const PORT = Number(process.env.PORT || 8092);
server.listen(PORT, '0.0.0.0', function () {
  console.log('NCT Seoul Map server: http://0.0.0.0:' + PORT);
});
