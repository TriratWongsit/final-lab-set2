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
  AUTH_URL:     'https://auth-service-production-6d6f.up.railway.app',
  TASK_URL:     'https://task-production-7409.up.railway.app',
  ACTIVITY_URL: 'https://activity-production-786c.up.railway.app',

  // Railway — uncomment และใส่ URL จริงหลัง deploy
  // AUTH_URL:     'https://YOUR-auth-service.up.railway.app',
  // TASK_URL:     'https://YOUR-task-service.up.railway.app',
  // ACTIVITY_URL: 'https://YOUR-activity-service.up.railway.app',
};

