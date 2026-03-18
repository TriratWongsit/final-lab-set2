const express     = require('express');
const { pool }    = require('../db/db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

async function logEvent(payload) {
  try {
    await fetch('http://log-service:3003/api/logs/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'task-service', ...payload })
    });
  } catch (_) {}
}

router.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'task-service', version: '2.0.0' })
);

router.use(requireAuth);

// GET /api/tasks/ — admin เห็นทั้งหมด, member เห็นของตัวเอง
router.get('/', async (req, res) => {
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

// POST /api/tasks/
router.post('/', async (req, res) => {
  const { title, description, status = 'TODO', priority = 'medium' } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, username, title, description, status, priority)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.sub, req.user.username, title, description, status, priority]
    );
    const task = result.rows[0];
    await logEvent({
      level: 'INFO', event: 'TASK_CREATED', user_id: req.user.sub,
      method: 'POST', path: '/api/tasks', status_code: 201,
      message: `Task created: "${title}"`, meta: { task_id: task.id }
    });
    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT * FROM tasks WHERE id=$1', [id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Task not found' });
    if (check.rows[0].user_id !== req.user.sub && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const { title, description, status, priority } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET
         title=$1, description=$2, status=$3, priority=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [
        title       ?? check.rows[0].title,
        description ?? check.rows[0].description,
        status      ?? check.rows[0].status,
        priority    ?? check.rows[0].priority,
        id
      ]
    );
    res.json({ task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT * FROM tasks WHERE id=$1', [id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Task not found' });
    if (check.rows[0].user_id !== req.user.sub && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
    await logEvent({
      level: 'INFO', event: 'TASK_DELETED', user_id: req.user.sub,
      method: 'DELETE', path: `/api/tasks/${id}`, status_code: 200,
      message: `Task ${id} deleted`
    });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
