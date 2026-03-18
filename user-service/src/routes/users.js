const express = require('express');
const { pool } = require('../db/db');
const { requireAuth, requireAdmin } = require('../middleware/jwtUtils');

const router = express.Router();

// GET /api/users/health
router.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'user-service', version: '1.0.0' })
);

// POST /api/users/internal/create-profile — เรียกจาก auth-service เท่านั้น
router.post('/internal/create-profile', async (req, res) => {
  const { user_id, username, email, role } = req.body;
  if (!user_id || !username || !email)
    return res.status(400).json({ error: 'user_id, username, email required' });
  try {
    await pool.query(
      `INSERT INTO profiles (user_id, username, email, role)
       VALUES ($1,$2,$3,$4) ON CONFLICT (user_id) DO NOTHING`,
      [user_id, username, email, role || 'member']
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[user] create-profile error:', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

// GET /api/users/me — ดู profile ตัวเอง
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE user_id=$1', [req.user.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// PUT /api/users/me — แก้ไข bio ของตัวเอง
router.put('/me', requireAuth, async (req, res) => {
  const { bio } = req.body;
  try {
    const result = await pool.query(
      `UPDATE profiles SET bio=$1, updated_at=NOW()
       WHERE user_id=$2 RETURNING *`,
      [bio, req.user.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// GET /api/users/ — admin ดู users ทั้งหมด
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, username, email, role, bio, created_at FROM profiles ORDER BY created_at DESC'
    );
    res.json({ users: result.rows, count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
