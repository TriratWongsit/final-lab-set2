// ══════════════════════════════════════════════════════════════
//  config.js — Service URLs
//  แก้ค่า URL ด้านล่างให้ตรงกับ Railway URLs จริงหลัง deploy
//  สำหรับทดสอบ local ให้ใช้ค่าด้านล่างได้เลย
// ══════════════════════════════════════════════════════════════
window.APP_CONFIG = {
  // Local (Docker Compose)
  AUTH_URL:     'http://localhost:3001',
  TASK_URL:     'http://localhost:3002',
  ACTIVITY_URL: 'http://localhost:3003',

  // Railway — แก้ค่าเหล่านี้หลัง deploy
  // AUTH_URL:     'https://YOUR-auth-service.up.railway.app',
  // TASK_URL:     'https://YOUR-task-service.up.railway.app',
  // ACTIVITY_URL: 'https://YOUR-activity-service.up.railway.app',
};
