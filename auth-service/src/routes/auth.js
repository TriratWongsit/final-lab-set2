const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const axios    = require('axios');
const pool     = require('../db/db');
const { signToken, verifyToken } = require('../middleware/jwtUtils');

// ── helper: ส่ง activity event แบบ fire-and-forget ──────────
const logActivity = (event_type, user_id, metadata = {}) => {
  const url = process.env.ACTIVITY_SERVICE_URL;
  if (!url) return;
  axios.post(`${url}/api/activities/internal`, {
    service: 'auth-service', event_type, user_id, metadata,
  }).catch(err => console.error('[logActivity]', err.message));
};

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email และ password จำเป็นต้องกรอก' });

  if (password.length < 6)
    return res.status(400).json({ error: 'password ต้องมีอย่างน้อย 6 ตัวอักษร' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'รูปแบบ email ไม่ถูกต้อง' });

  try {
    // ตรวจ email ซ้ำ
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0)
      return res.status(400).json({ error: 'Email นี้ถูกใช้งานแล้ว' });

    const hash   = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'member') RETURNING id, username, email, role`,
      [username, email, hash]
    );
    const user  = result.rows[0];
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    logActivity('user_registered', user.id, { username, email });

    return res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ', token, user });
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ error: 'Email นี้ถูกใช้งานแล้ว' });
    console.error('[register]', err.message);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'email และ password จำเป็นต้องกรอก' });

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    if (!result.rows.length)
      return res.status(401).json({ error: 'email หรือ password ไม่ถูกต้อง' });

    const user    = result.rows[0];
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ error: 'email หรือ password ไม่ถูกต้อง' });

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    logActivity('user_login', user.id, { email });

    return res.status(200).json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

// ── GET /api/auth/verify ─────────────────────────────────────
router.get('/verify', verifyToken, (req, res) => {
  res.status(200).json({ valid: true, user: req.user });
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
    res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error('[me]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

// ── GET /api/auth/health ─────────────────────────────────────
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

module.exports = router;
