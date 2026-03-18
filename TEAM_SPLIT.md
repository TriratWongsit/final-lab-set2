# TEAM_SPLIT.md — Final Lab Sec2 Set 2

## ข้อมูลกลุ่ม
- รายวิชา: ENGSE207 Software Architecture
- งาน: Final Lab — ชุดที่ 2: Microservices + Activity Tracking + Cloud (Railway)

## รายชื่อสมาชิก
| ลำดับ | ชื่อ-นามสกุล | รหัสนักศึกษา |
|---|---|---|
| 1 | นายตรัยรัตน์ วงษ์สิทธิ์ | 67543210028-6 |
| 2 | นางสาวอภิรญา สายนาคำ | 67543210075-7 |

---

## การแบ่งงานหลัก

### สมาชิกคนที่ 1: นายตรัยรัตน์ วงษ์สิทธิ์ (67543210028-6)
**Branch: `feature/auth-register`**

รับผิดชอบงานหลักดังต่อไปนี้
- **Auth Service** — เพิ่ม `POST /api/auth/register`, `logToDB()`, `logActivity()` (fire-and-forget)
- **auth-service/init.sql** — users table + logs table + seed users
- **Deploy Auth Service + auth-db บน Railway**
- **ตั้งค่า ACTIVITY_SERVICE_URL** ใน Auth Service หลัง Activity Service deploy เสร็จ

### สมาชิกคนที่ 2: นางสาวอภิรญา สายนาคำ (67543210075-7)
**Branch: `feature/activity-task-frontend`**

รับผิดชอบงานหลักดังต่อไปนี้
- **Task Service** — เพิ่ม `logActivity()` ใน CRUD routes ทุกตัว (TASK_CREATED, TASK_STATUS_CHANGED, TASK_DELETED)
- **task-service/init.sql** — tasks table + logs table
- **Activity Service** — สร้าง service ใหม่ทั้งหมด (internal endpoint, /me, /all, health)
- **activity-service/init.sql** — activities table + indexes
- **Deploy Task + Activity Service บน Railway**
- **Frontend** — `index.html` (Register tab + Activity link), `activity.html`, `config.js`

---

## งานที่ดำเนินการร่วมกัน
- `docker-compose.yml` และ `.env.example`
- ทดสอบระบบ local ด้วย Docker Compose ก่อน deploy
- ทดสอบ end-to-end บน Railway (curl commands)
- `README.md` + screenshots ครบ 14 รูป
- อัปเดต `config.js` ด้วย Railway URLs จริง

---

## เหตุผลในการแบ่งงาน
แบ่งตาม **service boundary** ชัดเจน
- สมาชิกคนที่ 1 รับผิดชอบ **Auth layer** ซึ่งเป็นจุดเริ่มต้นของทุก event
- สมาชิกคนที่ 2 รับผิดชอบ **Activity tracking layer** ทั้งผู้ส่ง (task) และผู้รับ (activity service)

แบ่งแบบนี้ทำให้ commit ไม่ทับกัน และแต่ละคน deploy service ของตัวเองได้อิสระ

---

## สรุปการเชื่อมโยงงานของสมาชิก

```
นายตรัยรัตน์ (auth-service)
        │
        │ POST /api/activity/internal (fire-and-forget)
        │ event: USER_REGISTERED, USER_LOGIN
        ▼
นางสาวอภิรญา (activity-service) ← รับ events ทั้งหมด
        ▲
        │ POST /api/activity/internal (fire-and-forget)
        │ event: TASK_CREATED, TASK_STATUS_CHANGED, TASK_DELETED
        │
นางสาวอภิรญา (task-service)
```

**จุดที่ต้องประสานงาน:**
- `JWT_SECRET` ต้องเหมือนกันทุก service (ตั้งใน Railway Variables)
- `ACTIVITY_SERVICE_URL` ใน auth-service และ task-service ต้องตั้งให้ตรง URL ของ activity-service บน Railway
- รูปแบบ payload ของ `logActivity()` ต้องตรงกับที่ activity-service รับ

---

## แนวทาง Git Commit

### นายตรัยรัตน์ (ตัวอย่าง)
```
feat(auth): add POST /api/auth/register with validation and duplicate check
feat(auth): add logToDB() helper to write logs to auth-db
feat(auth): add logActivity() fire-and-forget for USER_REGISTERED and USER_LOGIN
feat(db): add auth-service/init.sql with users and logs tables
```

### นางสาวอภิรญา (ตัวอย่าง)
```
feat(activity): create activity-service with internal, me, all endpoints
feat(activity): add activity-service/init.sql with activities table and indexes
feat(task): add logActivity() for TASK_CREATED, TASK_STATUS_CHANGED, TASK_DELETED
feat(frontend): add Register tab and doRegister() with auto-login after register
feat(frontend): add activity.html timeline page with stats and filter
feat(frontend): add config.js for Railway service URLs
```
