// config.js — Service URLs
// ─────────────────────────────────────────────────────────────
// Local  : BASE = '' ทุกตัว (ผ่าน Nginx)
// Railway: เปลี่ยนเป็น URL จริงของแต่ละ service
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  // ── Local (default) ──────────────────────────────────────
  AUTH_URL:     '',
  TASK_URL:     '',
  ACTIVITY_URL: '',

  // ── Railway (uncomment เมื่อ deploy) ─────────────────────
  // AUTH_URL:     'https://auth-service-xxxx.railway.app',
  // TASK_URL:     'https://task-service-xxxx.railway.app',
  // ACTIVITY_URL: 'https://activity-service-xxxx.railway.app',
};
