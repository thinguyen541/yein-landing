const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const config = require('../config');
const requireAdmin = require('../middleware/auth');

// Very small in-memory brute-force guard: 10 failed attempts per IP per 15 min.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;

function tooMany(ip) {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return a.count >= MAX_FAILS;
}
function recordFail(ip) {
  const a = attempts.get(ip);
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(ip, { first: Date.now(), count: 1 });
  else a.count++;
}

router.post('/login', async (req, res, next) => {
  try {
    const ip = req.ip;
    if (tooMany(ip)) return res.status(429).json({ error: 'Thử lại sau 15 phút' });

    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Thiếu tài khoản hoặc mật khẩu' });

    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    const admin = rows[0];
    const ok = admin && (await bcrypt.compare(password, admin.password_hash));
    if (!ok) {
      recordFail(ip);
      return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    }
    attempts.delete(ip);
    const token = jwt.sign({ id: admin.id, username: admin.username }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: { id: req.admin.id, username: req.admin.username } });
});

router.post('/change-password', requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 8 ký tự' });
    const [rows] = await pool.query('SELECT * FROM admins WHERE id = ?', [req.admin.id]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(currentPassword || '', admin.password_hash)))
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, admin.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
