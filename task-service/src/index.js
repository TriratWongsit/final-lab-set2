require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');
const tasksRouter = require('./routes/tasks');

const app  = express();
const PORT = process.env.PORT || 3002;
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.locals.pool = pool;

app.use('/api/tasks', tasksRouter);

async function start() {
  let retries = 10;
  while (retries > 0) {
    try { await pool.query('SELECT 1'); break; }
    catch (e) {
      console.log(`[task] Waiting DB... (${retries} left)`);
      retries--;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, () => console.log(`[task-service] Running on :${PORT}`));
}
start();
