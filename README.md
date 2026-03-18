# ENGSE207 Software Architecture
## README — Final Lab Set 2

---

## 1. ข้อมูลรายวิชาและสมาชิก

**รายวิชา:** ENGSE207 Software Architecture  
**ชื่องาน:** Final Lab Set 2 — Register + Activity Service + Railway Deploy

**สมาชิกในกลุ่ม**
- นายตรัยรัตน์  วงษ์สิทธิ์ / 67543210028-6
- นางสาวอภิรญา  สายนาคำ / 67543210075-7

---

## 2. Architecture Overview

```text
Browser
   │ HTTPS :443
   ▼
Nginx (API Gateway + TLS Termination)
   ├── /api/auth/*       → auth-service     → auth-db
   ├── /api/tasks/*      → task-service     → task-db
   ├── /api/activities/* → activity-service → activity-db
   └── /                → frontend
```

---

## 3. โครงสร้าง Repository

```text
final-lab-set2/
├── README.md
├── TEAM_SPLIT.md
├── INDIVIDUAL_REPORT_67543210028-6.md
├── INDIVIDUAL_REPORT_67543210075-7.md
├── docker-compose.yml
├── .env.example
│
├── auth-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql                 ← auth-db schema + seed users
│   └── src/
│       ├── index.js
│       ├── db/db.js
│       ├── middleware/jwtUtils.js
│       └── routes/auth.js       ← register + login + verify + me
│
├── task-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql                 ← task-db schema
│   └── src/
│       ├── index.js
│       ├── db/db.js
│       ├── middleware/authMiddleware.js
│       ├── middleware/jwtUtils.js
│       └── routes/tasks.js      ← CRUD + logActivity() ทุก action
│
├── activity-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── init.sql                 ← activity-db schema
│   └── src/
│       ├── index.js
│       └── routes/activity.js
│
├── frontend/
│   ├── Dockerfile
│   ├── config.js                ← Service URLs (local / Railway)
│   ├── index.html               ← Task Board + Login + Register link
│   ├── register.html            ← Register page
│   └── activity.html            ← Activity Timeline
│
├── nginx/
│   ├── nginx.conf
│   └── certs/                   ← server.crt + server.key (gen-certs.sh)
│
└── screenshots/
```

---

## 4. API Summary

### Auth Service
| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| POST | /api/auth/register | — | สมัครสมาชิก |
| POST | /api/auth/login | — | เข้าสู่ระบบ |
| GET | /api/auth/verify | JWT | ตรวจสอบ token |
| GET | /api/auth/me | JWT | ข้อมูลตัวเอง |
| GET | /api/auth/health | — | health check |

### Task Service
| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| GET | /api/tasks/ | JWT | ดูรายการ task |
| POST | /api/tasks/ | JWT | สร้าง task |
| PUT | /api/tasks/:id | JWT | แก้ไข task |
| DELETE | /api/tasks/:id | JWT | ลบ task |
| GET | /api/tasks/health | — | health check |

### Activity Service
| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| POST | /api/activities/internal | — | รับ event จาก services |
| GET | /api/activities/ | JWT (admin) | ดู activity ทั้งหมด |
| GET | /api/activities/stats | JWT (admin) | สถิติ |
| GET | /api/activities/health | — | health check |

---

## 5. การรันระบบ (Local)

### 5.1 สร้าง SSL Certificate
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/server.key \
  -out    nginx/certs/server.crt \
  -subj "/C=TH/ST=Bangkok/O=ENGSE207/CN=localhost"
```

### 5.2 สร้างไฟล์ .env
```bash
cp .env.example .env
```

### 5.3 Generate bcrypt hash สำหรับ Seed Users
```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('alice123',10))"
node -e "const b=require('bcryptjs'); console.log(b.hashSync('bob456',10))"
node -e "const b=require('bcryptjs'); console.log(b.hashSync('adminpass',10))"
```
นำค่าที่ได้ไปแทนใน `auth-service/init.sql`

### 5.4 รันระบบ
```bash
docker compose down -v
docker compose up --build
```

### 5.5 เปิด Browser
| หน้า | URL |
|---|---|
| Task Board / Login | https://localhost |
| Register | https://localhost/register.html |
| Activity Timeline | https://localhost/activity.html |

> Browser จะขึ้นเตือน self-signed cert → กด **Advanced → Proceed**

---

## 6. Seed Users

| Username | Email | Password | Role |
|---|---|---|---|
| alice | alice@lab.local | alice123 | member |
| bob | bob@lab.local | bob456 | member |
| admin | admin@lab.local | adminpass | admin |

> Activity Timeline ต้อง login ด้วย **admin** จึงจะเห็นข้อมูล

---

## 7. Deploy บน Railway

### 7.1 ติดตั้ง CLI
```bash
npm install -g @railway/cli
railway login
```

### 7.2 Deploy แต่ละ service
```bash
cd auth-service     && railway up
cd task-service     && railway up
cd activity-service && railway up
```

### 7.3 Environment Variables บน Railway
| Variable | ค่า |
|---|---|
| DATABASE_URL | (Railway inject อัตโนมัติ) |
| JWT_SECRET | engse207-super-secret |
| JWT_EXPIRES | 1h |
| ACTIVITY_SERVICE_URL | https://activity-service-xxxx.railway.app |

### 7.4 แก้ไข config.js หลัง deploy
```js
const CONFIG = {
  AUTH_URL:     'https://auth-service-xxxx.railway.app',
  TASK_URL:     'https://task-service-xxxx.railway.app',
  ACTIVITY_URL: 'https://activity-service-xxxx.railway.app',
};
```

---

## 8. ปัญหาที่พบและแนวทางแก้ไข

- **Nginx host not found** — เพิ่ม `resolver 127.0.0.11` และใช้ `set $upstream` แทน hardcode hostname
- **Port 80 already in use** — `sudo lsof -i :80` หาโปรแกรมที่ใช้อยู่แล้วหยุด หรือเปลี่ยน port ใน docker-compose.yml
- **Seed users login ไม่ได้** — ต้อง generate bcrypt hash จริงแล้วแทนใน init.sql แล้ว `docker compose down -v` ก่อน up ใหม่
- **Register email ซ้ำได้ 500** — แก้ด้วย catch `err.code === '23505'`
- **Activity ช้า** — แก้ด้วย fire-and-forget (ไม่ await axios)

---

## 9. การแบ่งงานของทีม
ดูรายละเอียดใน `TEAM_SPLIT.md` และ `INDIVIDUAL_REPORT_[studentid].md`
