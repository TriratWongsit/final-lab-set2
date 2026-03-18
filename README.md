# ENGSE207 Software Architecture
## README — Final Lab Sec2 Set 2: Microservices + Activity Tracking + Cloud (Railway)

> ต่อยอดจาก Final Lab Set 1 โดยตรง

---

## 1. ข้อมูลรายวิชาและสมาชิก

**รายวิชา:** ENGSE207 Software Architecture
**ชื่องาน:** Final Lab — ชุดที่ 2: Microservices + Activity Tracking + Cloud (Railway)

| ลำดับ | ชื่อ-นามสกุล | รหัสนักศึกษา |
|---|---|---|
| 1 | นายตรัยรัตน์ วงษ์สิทธิ์ | 67543210028-6 |
| 2 | นางสาวอภิรญา สายนาคำ | 67543210075-7 |

**Railway URLs (อัปเดตหลัง deploy):**
| Service | URL |
|---|---|
| Auth Service | `https://YOUR-auth-service.up.railway.app` |
| Task Service | `https://YOUR-task-service.up.railway.app` |
| Activity Service | `https://YOUR-activity-service.up.railway.app` |

---

## 2. สิ่งที่เปลี่ยนจาก Set 1

| Set 1 | Set 2 |
|---|---|
| 4 services: auth, task, log, frontend | 3 services บน Cloud: auth, task, activity |
| Shared PostgreSQL (1 DB) | Database-per-Service (3 DB แยก) |
| Log Service แยก | แต่ละ service log ลง DB ของตัวเอง + ส่ง event ไป Activity Service |
| ไม่มี Register | มี Register API ใน Auth Service |
| Local-only (HTTPS + Nginx) | Deploy บน Railway (HTTPS อัตโนมัติ) |

---

## 3. Architecture

```
Browser / Postman
        │
        │ HTTPS (Railway จัดการให้อัตโนมัติ)
        ▼
┌───────────────────────────────────────────────────────┐
│                   Railway Project                     │
│                                                       │
│  Auth Service        Task Service    Activity Service │
│  :3001               :3002           :3003            │
│      │                   │               ▲            │
│      │                   │  POST         │            │
│      └───────────────────┴─/internal─────┘            │
│      │                   │               │            │
│      ▼                   ▼               ▼            │
│   auth-db            task-db        activity-db       │
│  (PostgreSQL)       (PostgreSQL)    (PostgreSQL)      │
│                                                       │
│  Frontend เรียกแต่ละ service โดยตรงผ่าน config.js      │
└───────────────────────────────────────────────────────┘
```

### Service-to-Service Call (fire-and-forget)

```
ผู้ใช้ Register / Login
    │
    ▼
Auth Service ── POST /api/activity/internal ──▶ Activity Service
(บันทึกลง auth-db)                              (บันทึกลง activity-db)

ผู้ใช้ CRUD Task
    │
    ▼
Task Service ── POST /api/activity/internal ──▶ Activity Service
(บันทึกลง task-db)                              (บันทึกลง activity-db)
```

### Activity Events ที่บันทึก

| event_type | ส่งมาจาก | เกิดขึ้นเมื่อ |
|---|---|---|
| `USER_REGISTERED` | auth-service | POST /register สำเร็จ |
| `USER_LOGIN` | auth-service | POST /login สำเร็จ |
| `TASK_CREATED` | task-service | POST /tasks สำเร็จ |
| `TASK_STATUS_CHANGED` | task-service | PUT /tasks/:id เปลี่ยน status |
| `TASK_DELETED` | task-service | DELETE /tasks/:id |

---

## 4. โครงสร้าง Repository

```
final-lab-set2/
├── README.md
├── TEAM_SPLIT.md
├── INDIVIDUAL_REPORT_675432100286.md
├── INDIVIDUAL_REPORT_675432100757.md
├── docker-compose.yml
├── .env.example
├── auth-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql          ← auth-db schema + seed users
│   └── src/
│       ├── index.js
│       ├── db/db.js
│       ├── middleware/jwtUtils.js
│       └── routes/auth.js   ← login + register + logActivity()
├── task-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql          ← task-db schema
│   └── src/
│       ├── index.js
│       ├── middleware/authMiddleware.js
│       └── routes/tasks.js  ← CRUD + logActivity()
├── activity-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql          ← activity-db schema
│   └── src/index.js
├── frontend/
│   ├── index.html        ← Task Board + Register tab
│   ├── activity.html     ← Activity Timeline
│   └── config.js         ← Railway Service URLs
└── screenshots/
```

---

## 5. Environment Variables

| Variable | Service | ค่า |
|---|---|---|
| `DATABASE_URL` | ทุก service | Railway PostgreSQL connection string |
| `JWT_SECRET` | ทุก service | ค่าเดียวกัน (shared secret) |
| `JWT_EXPIRES` | auth-service | `1h` |
| `PORT` | ทุก service | 3001 / 3002 / 3003 |
| `ACTIVITY_SERVICE_URL` | auth, task | Railway URL ของ activity-service |

---

## 6. วิธีรัน Local (Docker Compose)

```bash
# 1. สร้าง .env
cp .env.example .env

# 2. รันระบบ (activity-service ต้อง start ก่อน auth และ task)
docker compose up --build

# 3. ทดสอบ Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@sec2.local","password":"123456"}'

# 4. Login → เก็บ token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sec2.local","password":"123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 5. ตรวจ activities
curl http://localhost:3003/api/activity/me \
  -H "Authorization: Bearer $TOKEN"

# 6. Create Task
curl -X POST http://localhost:3002/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test activity tracking","priority":"high"}'

# 7. รีเซ็ต DB
docker compose down -v && docker compose up --build
```

**Seed Users:**
| Email | Password | Role |
|---|---|---|
| alice@lab.local | alice123 | member |
| admin@lab.local | adminpass | admin |

---

## 7. API Summary

### Auth Service
| Method | Path | Auth | หน้าที่ |
|---|---|---|---|
| POST | /api/auth/register | ❌ | สมัครสมาชิก |
| POST | /api/auth/login | ❌ | Login → JWT |
| GET | /api/auth/verify | ❌ | ตรวจสอบ JWT |
| GET | /api/auth/me | ✅ JWT | ข้อมูลผู้ใช้ |
| GET | /api/auth/health | ❌ | Health check |

### Task Service
| Method | Path | Auth | หน้าที่ |
|---|---|---|---|
| GET | /api/tasks/health | ❌ | Health check |
| GET | /api/tasks | ✅ JWT | ดู tasks |
| POST | /api/tasks | ✅ JWT | สร้าง task |
| PUT | /api/tasks/:id | ✅ JWT | แก้ไข task |
| DELETE | /api/tasks/:id | ✅ JWT | ลบ task |

### Activity Service
| Method | Path | Auth | หน้าที่ |
|---|---|---|---|
| POST | /api/activity/internal | ❌ (internal) | รับ event จาก services |
| GET | /api/activity/me | ✅ JWT | activities ของตัวเอง |
| GET | /api/activity/all | ✅ admin JWT | activities ทั้งหมด |
| GET | /api/activity/health | ❌ | Health check |

---

## 8. อธิบาย Pattern สำคัญ

### Fire-and-forget คืออะไร
`logActivity()` เรียก `fetch()` ไปหา activity-service แล้ว **ต่อท้ายด้วย `.catch(() => {})`** โดยไม่มี `await` ผลคือ:
- auth/task service ส่ง event แล้วทำงานต่อทันที ไม่รอ response
- ถ้า activity-service ล่ม — error ถูก catch และเงียบ ไม่กระทบ core functionality
- task create / login ยังสำเร็จได้แม้ activity-service ไม่พร้อม

### ทำไม activities table เก็บ `username` ไว้ด้วย (Denormalization)
activity-db ไม่มี users table — ถ้าต้องการ username ต้องเรียก auth-service ทุกครั้งที่ query ซึ่ง:
1. ทำให้ activity-service ขึ้นอยู่กับ auth-service ตลอดเวลา
2. เพิ่ม latency ในการ query
3. ขัดกับ Database-per-Service principle

แนวทางที่ดีกว่าคือ **เก็บ `username` ณ เวลาที่ event เกิดขึ้น** (ค่า username ใน JWT payload) ลงใน activities table โดยตรง

### Gateway Strategy: Frontend เรียก Service โดยตรง
ใช้ `config.js` กำหนด URL ของแต่ละ service แยกกัน — frontend เรียก auth, task, activity โดยตรง ไม่ผ่าน Nginx (เพราะ Railway จัดการ HTTPS ให้อัตโนมัติ)

---

## 9. วิธีอัปเดต config.js หลัง deploy Railway

แก้ไฟล์ `frontend/config.js`:
```javascript
window.APP_CONFIG = {
  AUTH_URL:     'https://YOUR-auth-service.up.railway.app',
  TASK_URL:     'https://YOUR-task-service.up.railway.app',
  ACTIVITY_URL: 'https://YOUR-activity-service.up.railway.app',
};
```

แล้ว commit และ push ใหม่ Railway จะ redeploy frontend อัตโนมัติ

---

## 10. Known Limitations

- `frontend/` ไม่ได้ deploy บน Railway (เปิดผ่าน file:// หรือ static hosting อื่น)
- `/api/activity/internal` ไม่มี JWT protection — ควรเพิ่ม shared secret ใน production
- ถ้า activity-service ล่มนานและกลับมา activities ที่ควรบันทึกระหว่างนั้นจะหายไป (no retry mechanism)

---

> จัดทำโดย นายตรัยรัตน์ วงษ์สิทธิ์ และ นางสาวอภิรญา สายนาคำ
> รายวิชา ENGSE207 Software Architecture | มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา
