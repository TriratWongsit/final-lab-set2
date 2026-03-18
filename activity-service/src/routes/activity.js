const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Middleware ────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  next();
};

// ── GET /api/activities/health ───────────────────────────────
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'activity-service' });
});

// ── POST /api/activities/internal ───────────────────────────
// รับ event จาก services อื่น (ไม่ต้องการ JWT)
router.post('/internal', async (req, res) => {
  const { service, event_type, user_id, entity_type, entity_id, metadata } = req.body;

  if (!service || !event_type)
    return res.status(400).json({ error: 'service และ event_type จำเป็นต้องระบุ' });

  try {
    const result = await pool.query(
      `INSERT INTO activities
         (service, event_type, user_id, entity_type, entity_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        service,
        event_type,
        user_id     || null,
        entity_type || null,
        entity_id   || null,
        metadata    ? JSON.stringify(metadata) : null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[insertActivity]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

// ── GET /api/activities/ ─────────────────────────────────────
// admin เท่านั้น — ดูรายการ activity ทั้งหมด
router.get('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM activities ORDER BY created_at DESC LIMIT 200'
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('[getActivities]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

// ── GET /api/activities/stats ────────────────────────────────
// admin เท่านั้น — สถิติ event แยกตาม event_type
router.get('/stats', verifyToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT event_type, service, COUNT(*) AS count
       FROM activities
       GROUP BY event_type, service
       ORDER BY count DESC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('[activityStats]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

module.exports = router;
