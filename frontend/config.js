// ══════════════════════════════════════════════════════════════
//  config.js — Service URLs
//
//  Local (Docker Compose + Nginx):
//    ใช้ '' (relative URL) → Nginx จัดการ routing ให้อัตโนมัติ
//
//  Railway (Cloud):
//    เปลี่ยนเป็น URL จริงของแต่ละ service
// ══════════════════════════════════════════════════════════════
window.APP_CONFIG = {
  // Local — ใช้ relative URL ผ่าน Nginx (https://localhost)
  AUTH_URL:     '',
  TASK_URL:     '',
  ACTIVITY_URL: '',

  // Railway — uncomment และใส่ URL จริงหลัง deploy
  // AUTH_URL:     'https://YOUR-auth-service.up.railway.app',
  // TASK_URL:     'https://YOUR-task-service.up.railway.app',
  // ACTIVITY_URL: 'https://YOUR-activity-service.up.railway.app',
};

