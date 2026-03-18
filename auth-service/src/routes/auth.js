const express  = require('express');
const bcrypt   = require('bcryptjs');
const { pool } = require('../db/db');
const { generateToken, verifyToken } = require('../middleware/jwtUtils');

const router = express.Router();
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8y0R6VQwWi4KFOeFHrgb3R04QLbL7a';

async function logEvent(payload) {
  try {
    await fetch('http://log-service:3003/api/logs/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'auth-service', ...payload })
    });
  } catch (_) {}
}

// ── POST /api/auth/register ────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const ip = req.headers['x-real-ip'] || req.ip;

  if (!username || !email || !password)
    return res.status(400).json({ error: 'กรุณากรอก username, email และ password' });
  if (password.length < 6)
    return res.status(400).json({ error: 'password ต้องมีอย่างน้อย 6 ตัวอักษร' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();

  try {
    // ตรวจ duplicate
    const existing = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2',
      [normalizedEmail, normalizedUsername]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Email หรือ Username นี้ถูกใช้แล้ว' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1,$2,$3,'member') RETURNING id, username, email, role`,
      [normalizedUsername, normalizedEmail, password_hash]
    );
    const user = result.rows[0];

    // แจ้ง user-service ให้สร้าง profile (fire-and-forget)
    fetch('http://user-service:3004/api/users/internal/create-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, username: user.username, email: user.email, role: user.role })
    }).catch(() => {});

    const token = generateToken({ sub: user.id, email: user.email, role: user.role, username: user.username });

    await logEvent({
      level: 'INFO', event: 'REGISTER_SUCCESS', user_id: user.id, ip_address: ip,
      method: 'POST', path: '/api/auth/register', status_code: 201,
      message: `User registered: ${user.username}`
    });

    res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('[auth] Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers['x-real-ip'] || req.ip;
  if (!email || !password)
    return res.status(400).json({ error: 'กรุณากรอก email และ password' });

  const normalizedEmail = String(email).trim().toLowerCase();
  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE email=$1',
      [normalizedEmail]
    );
    const user = result.rows[0] || null;
    const hash = user ? user.password_hash : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hash);

    if (!user || !isValid) {
      await logEvent({
        level: 'WARN', event: 'LOGIN_FAILED', user_id: user?.id || null, ip_address: ip,
        method: 'POST', path: '/api/auth/login', status_code: 401,
        message: `Login failed: ${normalizedEmail}`
      });
      return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
    }

    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);
    const token = generateToken({ sub: user.id, email: user.email, role: user.role, username: user.username });

    await logEvent({
      level: 'INFO', event: 'LOGIN_SUCCESS', user_id: user.id, ip_address: ip,
      method: 'POST', path: '/api/auth/login', status_code: 200,
      message: `User ${user.username} logged in`, meta: { role: user.role }
    });

    res.json({
      message: 'Login สำเร็จ', token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('[auth] Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/verify ───────────────────────────────────────────────
router.get('/verify', (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ valid: false, error: 'No token' });
  try {
    const decoded = verifyToken(token);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = verifyToken(token);
    const result  = await pool.query(
      'SELECT id, username, email, role, created_at, last_login FROM users WHERE id=$1',
      [decoded.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ── GET /api/auth/health ───────────────────────────────────────────────
router.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'auth-service', version: '2.0.0' })
);

module.exports = router;
