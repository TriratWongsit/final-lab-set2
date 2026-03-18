const express   = require('express');
const router    = express.Router();
const axios     = require('axios');
const pool      = require('../db/db');
const authMiddleware = require('../middleware/authMiddleware');

// ── helper: ส่ง activity event แบบ fire-and-forget ──────────
const logActivity = (event_type, user_id, entity_id, metadata = {}) => {
  const url = process.env.ACTIVITY_SERVICE_URL;
  if (!url) return;
  axios.post(`${url}/api/activities/internal`, {
    service:     'task-service',
    event_type,
    user_id,
    entity_type: 'task',
    entity_id,
    metadata,
  }).catch(err => console.error('[logActivity]', err.message));
};

// ── GET /api/tasks/health ────────────────────────────────────
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'task-service' });
});

// ── GET /api/tasks/ ──────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('[getTasks]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

// ── POST /api/tasks/ ─────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, status, assigned_to } = req.body;

  if (!title)
    return res.status(400).json({ error: 'title จำเป็นต้องกรอก' });

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description || null, status || 'todo', assigned_to || null, req.user.id]
    );
    const task = result.rows[0];

    logActivity('task_created', req.user.id, task.id, { title, status: task.status });

    res.status(201).json(task);
  } catch (err) {
    console.error('[createTask]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

// ── PUT /api/tasks/:id ───────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, status, assigned_to } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!existing.rows.length)
      return res.status(404).json({ error: 'ไม่พบ task นี้' });

    const result = await pool.query(
      `UPDATE tasks
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           status      = COALESCE($3, status),
           assigned_to = COALESCE($4, assigned_to),
           updated_at  = NOW()
       WHERE id = $5 RETURNING *`,
      [title, description, status, assigned_to, id]
    );
    const task = result.rows[0];

    logActivity('task_updated', req.user.id, task.id, { title: task.title, status: task.status });

    res.status(200).json(task);
  } catch (err) {
    console.error('[updateTask]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

// ── DELETE /api/tasks/:id ────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!existing.rows.length)
      return res.status(404).json({ error: 'ไม่พบ task นี้' });

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    logActivity('task_deleted', req.user.id, parseInt(id), { task_id: id });

    res.status(200).json({ message: 'ลบ task สำเร็จ' });
  } catch (err) {
    console.error('[deleteTask]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

module.exports = router;
