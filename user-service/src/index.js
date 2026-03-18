require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { pool } = require('./db/db');
const usersRouter = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use('/api/users', usersRouter);

async function start() {
  let retries = 10;
  while (retries > 0) {
    try { await pool.query('SELECT 1'); break; }
    catch (e) {
      console.log(`[user-service] Waiting DB... (${retries} left)`);
      retries--;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, () => console.log(`[user-service] Running on :${PORT}`));
}
start();
