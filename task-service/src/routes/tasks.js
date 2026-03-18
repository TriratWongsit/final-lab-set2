const express     = require('express');
const { Pool }    = require('pg');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

function getPool(req) {
  return req.app.locals.pool;
}

// ── Helper: log ลง task-db ────────────────────────────────────────────
async function logToDB(pool, { level, event, userId, message, meta }) {
  try {
    await pool.query(
      `INSERT INTO logs (level, event, user_id, message, meta) VALUES ($1,$2,$3,$4,$5)`,
      [level, event, userId || null, message || null,
       meta ? JSON.stringify(meta) : null]
    );
  } catch (e) { console.error('[task-log]', e.message); }
}

// ── Helper: ส่ง activity event (fire-and-forget) ──────────────────────
function logActivity({ userId, username, eventType, entityId, summary, meta }) {
  const ACTIVITY_URL = process.env.ACTIVITY_SERVICE_URL || 'http://activity-service:3003';
  fetch(`${ACTIVITY_URL}/api/activity/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId, username, event_type: eventType,
      entity_type: 'task', entity_id: entityId || null,
      summary, meta: meta || null
    })
  }).catch(() => {
    console.warn('[task] activity-service unreachable — skipping event log');
  });
}

// GET /api/tasks/health
router.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'task-service', version: '2.0.0' })
);

router.use(requireAuth);

// GET /api/tasks
router.get('/', async (req, res) => {
  const pool = getPool(req);
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    } else {
      result = await pool.query(
        'SELECT * FROM tasks WHERE user_id=$1 ORDER BY created_at DESC',
        [req.user.sub]
      );
    }
    res.json({ tasks: result.rows, count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const pool = getPool(req);
  const { title, description, status = 'TODO', priority = 'medium' } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, username, title, description, status, priority)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.sub, req.user.username, title, description, status, priority]
    );
    const task = result.rows[0];

    await logToDB(pool, {
      level: 'INFO', event: 'TASK_CREATED', userId: req.user.sub,
      message: `Task created: "${title}"`, meta: { task_id: task.id }
    });

    // fire-and-forget
    logActivity({
      userId: req.user.sub, username: req.user.username,
      eventType: 'TASK_CREATED', entityId: task.id,
      summary: `${req.user.username} สร้าง task "${title}"`,
      meta: { task_id: task.id, title, priority }
    });

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const pool = getPool(req);
  const { id } = req.params;
  const { title, description, status, priority } = req.body;

  try {
    const check = await pool.query('SELECT * FROM tasks WHERE id=$1', [id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Task not found' });
    if (check.rows[0].user_id !== req.user.sub && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const old = check.rows[0];
    const result = await pool.query(
      `UPDATE tasks SET
         title=$1, description=$2, status=$3, priority=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [
        title       ?? old.title,
        description ?? old.description,
        status      ?? old.status,
        priority    ?? old.priority,
        id
      ]
    );
    const updated = result.rows[0];

    // ถ้า status เปลี่ยน → ส่ง TASK_STATUS_CHANGED (fire-and-forget)
    if (status && status !== old.status) {
      logActivity({
        userId: req.user.sub, username: req.user.username,
        eventType: 'TASK_STATUS_CHANGED', entityId: parseInt(id),
        summary: `${req.user.username} เปลี่ยนสถานะ task #${id} เป็น ${status}`,
        meta: { task_id: parseInt(id), old_status: old.status, new_status: status }
      });
    }

    res.json({ task: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const pool = getPool(req);
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT * FROM tasks WHERE id=$1', [id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Task not found' });
    if (check.rows[0].user_id !== req.user.sub && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM tasks WHERE id=$1', [id]);

    // fire-and-forget
    logActivity({
      userId: req.user.sub, username: req.user.username,
      eventType: 'TASK_DELETED', entityId: parseInt(id),
      summary: `${req.user.username} ลบ task #${id}`,
      meta: { task_id: parseInt(id) }
    });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
