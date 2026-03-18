# ENGSE207 Software Architecture  
## README — Final Lab Set 2: Microservices + Activity Tracking + Cloud (Railway)

> ต่อยอดจาก Final Lab Set 1 โดยตรง

---

## 1. ข้อมูลรายวิชาและสมาชิก

**รายวิชา:** ENGSE207 Software Architecture  
**ชื่องาน:** Final Lab — ชุดที่ 2: Microservices + Register + User Service + Database-per-Service  

**สมาชิกในกลุ่ม**
| ลำดับ | ชื่อ-นามสกุล | รหัสนักศึกษา |
|---|---|---|
| 1 | นายตรัยรัตน์ วงษ์สิทธิ์ | 67543210028-6 |
| 2 | นางสาวอภิรญา สายนาคำ | 67543210075-7 |

**Repository:** `final-lab-set2/`

---

## 2. ภาพรวมของระบบ

Set 2 ต่อยอดจาก Set 1 โดยเพิ่มและเปลี่ยนแปลงดังนี้

| ส่วน | Set 1 | Set 2 |
|---|---|---|
| Auth | Login + Seed Users เท่านั้น | **เพิ่ม Register** |
| User | ไม่มี | **เพิ่ม User Service** (profile, bio, list) |
| Database | Shared DB 1 ก้อน | **แยก DB ต่อ service** (Database-per-Service) |
| Frontend | Task Board + Log Dashboard | **เพิ่ม Register tab + Users page + Bio edit** |
| Nginx | route 4 service | **เพิ่ม /api/users/ route** |

---

## 3. วัตถุประสงค์ของงาน

- เพิ่ม Register API และเชื่อมต่อกับ User Service
- ออกแบบ Database-per-Service pattern (auth-db, user-db, task-db, log-db)
- พัฒนา User Service สำหรับจัดการ profile ผู้ใช้
- อัปเดต Frontend ให้รองรับ Register และ Users page

---

## 4. Architecture Overview

```text
Browser / Postman
       │
       │ HTTPS :443  (HTTP :80 → redirect HTTPS)
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Nginx (API Gateway + TLS + Rate Limiter)                        │
│  /api/auth/*         → auth-service:3001                         │
│  /api/users/*        → user-service:3004  [JWT required]         │
│  /api/tasks/*        → task-service:3002  [JWT required]         │
│  /api/logs/internal  → BLOCKED (403)                             │
│  /api/logs/*         → log-service:3003   [admin JWT only]       │
│  /                   → frontend:80                               │
└──────┬──────────────┬────────────────┬────────────┬─────────────┘
       │              │                │            │
       ▼              ▼                ▼            ▼
  auth-service   user-service    task-service  log-service
    :3001           :3004           :3002         :3003
       │              │                │            │
       ▼              ▼                ▼            ▼
    auth-db        user-db          task-db       log-db
  (PostgreSQL)   (PostgreSQL)    (PostgreSQL)  (PostgreSQL)
```

### Services ที่ใช้ในระบบ
| Service | Port | DB | หน้าที่ |
|---|---|---|---|
| **nginx** | 80, 443 | — | API Gateway, HTTPS, rate limit |
| **frontend** | 80 | — | Task Board, Register, Users, Log Dashboard |
| **auth-service** | 3001 | auth-db | Login, Register, Verify, Me |
| **user-service** | 3004 | user-db | Profile, Bio, List Users (admin) |
| **task-service** | 3002 | task-db | CRUD Tasks + JWT guard |
| **log-service** | 3003 | log-db | รับและแสดง logs (admin only) |

---

## 5. โครงสร้าง Repository

```text
final-lab-set2/
├── README.md
├── TEAM_SPLIT.md
├── INDIVIDUAL_REPORT_675432100286.md
├── INDIVIDUAL_REPORT_675432100757.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── nginx/
│   ├── Dockerfile          ← สร้าง SSL cert อัตโนมัติตอน build
│   └── nginx.conf          ← เพิ่ม /api/users/ route
├── frontend/
│   ├── Dockerfile
│   ├── index.html          ← Task Board + Register tab + Bio edit
│   ├── users.html          ← Users page
│   └── logs.html           ← Log Dashboard (admin only)
├── auth-service/           ← เพิ่ม /register route
├── user-service/           ← NEW service
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── routes/users.js
│       ├── middleware/jwtUtils.js
│       └── db/db.js
├── task-service/           ← ปรับให้ใช้ task-db แยก
├── log-service/            ← ปรับให้ใช้ log-db แยก
└── db/
    ├── auth/init.sql
    ├── user/init.sql
    ├── task/init.sql
    └── log/init.sql
```

---

## 6. เทคโนโลยีที่ใช้

- Node.js / Express.js
- PostgreSQL 15 (4 instances แยกกัน)
- Nginx 1.25
- Docker / Docker Compose
- HTML / CSS / JavaScript (Vanilla)
- JWT (jsonwebtoken)
- bcryptjs

---

## 7. การตั้งค่าและการรันระบบ

### 7.1 สร้างไฟล์ `.env`
```bash
cp .env.example .env
```

ค่าใน `.env.example`:
```env
DB_USER=admin
DB_PASSWORD=secret123
JWT_SECRET=engse207-set2-super-secret-change-in-production
JWT_EXPIRES=1h
```

### 7.2 รันระบบ

> SSL certificate สร้างอัตโนมัติตอน `docker compose up --build` ไม่ต้องรัน script แยก

```bash
docker compose up --build
```

**Windows PowerShell:**
```powershell
copy .env.example .env
docker compose up --build
```

### 7.3 รีเซ็ตฐานข้อมูลทั้งหมด
```bash
docker compose down -v
docker compose up --build
```

### 7.4 เปิดใช้งานผ่าน Browser
| URL | หน้าที่ |
|---|---|
| `https://localhost` | Task Board + Login + Register |
| `https://localhost/users.html` | Users page |
| `https://localhost/logs.html` | Log Dashboard (admin only) |

> Browser จะแจ้ง cert warning → กด **Advanced → Proceed to localhost**

---

## 8. Seed Users สำหรับทดสอบ

| Username | Email | Password | Role |
|---|---|---|---|
| alice | alice@lab.local | alice123 | member |
| bob | bob@lab.local | bob456 | member |
| admin | admin@lab.local | adminpass | admin |

หรือทดสอบ **Register** สมัครสมาชิกใหม่ได้เลยผ่านหน้าเว็บ

---

## 9. API Summary

### Auth Service (port 3001)
| Method | Path | Auth | หน้าที่ |
|---|---|---|---|
| POST | /api/auth/register | ❌ | สมัครสมาชิกใหม่ → JWT |
| POST | /api/auth/login | ❌ | Login → JWT |
| GET | /api/auth/verify | ❌ | ตรวจสอบ JWT |
| GET | /api/auth/me | ✅ JWT | ข้อมูลผู้ใช้ปัจจุบัน |
| GET | /api/auth/health | ❌ | Health check |

### User Service (port 3004) — NEW
| Method | Path | Auth | หน้าที่ |
|---|---|---|---|
| POST | /api/users/internal/create-profile | ❌ (internal) | สร้าง profile หลัง register |
| GET | /api/users/me | ✅ JWT | ดู profile ตัวเอง |
| PUT | /api/users/me | ✅ JWT | แก้ไข bio |
| GET | /api/users/ | ✅ admin JWT | ดู users ทั้งหมด |
| GET | /api/users/health | ❌ | Health check |

### Task Service (port 3002)
| Method | Path | Auth | หน้าที่ |
|---|---|---|---|
| GET | /api/tasks/health | ❌ | Health check |
| GET | /api/tasks/ | ✅ JWT | ดู tasks |
| POST | /api/tasks/ | ✅ JWT | สร้าง task |
| PUT | /api/tasks/:id | ✅ JWT | แก้ไข task |
| DELETE | /api/tasks/:id | ✅ JWT | ลบ task |

### Log Service (port 3003)
| Method | Path | Auth | หน้าที่ |
|---|---|---|---|
| POST | /api/logs/internal | ❌ (internal) | รับ log จาก services |
| GET | /api/logs/ | ✅ admin JWT | ดึง logs |
| GET | /api/logs/stats | ✅ admin JWT | สถิติ logs |
| GET | /api/logs/health | ❌ | Health check |

---

## 10. การทดสอบระบบ

### ลำดับการทดสอบ
1. รัน `docker compose up --build`
2. เปิด `https://localhost`
3. **ทดสอบ Register** — สมัครสมาชิกใหม่
4. Login ด้วย seed users
5. CRUD Tasks ครบ 4 ขั้นตอน
6. แก้ไข Bio ใน Profile page
7. เปิด `https://localhost/users.html` → admin เห็นทั้งหมด, member เห็นตัวเอง
8. ทดสอบไม่มี JWT → 401
9. ทดสอบ Log Dashboard (admin)
10. ทดสอบ rate limit login > 5 ครั้ง/นาที → 429

### ตัวอย่าง curl
```bash
BASE="https://localhost"

# Register ใหม่
curl -sk -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@lab.local","password":"test123"}'

# Login
TOKEN=$(curl -sk -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@lab.local","password":"alice123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# ดู profile
curl -sk $BASE/api/users/me -H "Authorization: Bearer $TOKEN"

# แก้ bio
curl -sk -X PUT $BASE/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"Hello from alice!"}'

# Admin ดู users ทั้งหมด
ADMIN_TOKEN=$(curl -sk -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lab.local","password":"adminpass"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -sk $BASE/api/users/ -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 11. Screenshots ที่แนบในงาน

| ไฟล์ | รายการ |
|---|---|
| `01_docker_running.png` | docker compose up สำเร็จ ทุก container healthy |
| `02_register_success.png` | Register สำเร็จ → ได้ JWT |
| `03_register_duplicate.png` | Register email ซ้ำ → 409 |
| `04_login_success.png` | Login สำเร็จ |
| `05_login_fail.png` | Login ผิด → 401 |
| `06_create_task.png` | POST /api/tasks/ → 201 |
| `07_get_tasks.png` | GET /api/tasks/ → task list |
| `08_update_task.png` | PUT /api/tasks/:id → 200 |
| `09_delete_task.png` | DELETE /api/tasks/:id → 200 |
| `10_no_jwt_401.png` | GET /api/tasks/ ไม่มี JWT → 401 |
| `11_user_profile.png` | GET /api/users/me → profile |
| `12_admin_users.png` | GET /api/users/ (admin) → user list |
| `13_logs_dashboard.png` | Log Dashboard แสดง REGISTER_SUCCESS |
| `14_rate_limit.png` | Login > 5 ครั้ง/นาที → 429 |

---

## 12. การแบ่งงานของทีม

รายละเอียดการแบ่งงานอยู่ในไฟล์ `TEAM_SPLIT.md`

รายงานรายบุคคล:
- `INDIVIDUAL_REPORT_675432100286.md` — นายตรัยรัตน์ วงษ์สิทธิ์
- `INDIVIDUAL_REPORT_675432100757.md` — นางสาวอภิรญา สายนาคำ

---

## 13. ปัญหาที่พบและแนวทางแก้ไข

| ปัญหา | สาเหตุ | แนวทางแก้ไข |
|---|---|---|
| user-service ไม่รู้ว่ามี user ใหม่จาก register | auth-db และ user-db แยกกัน | auth-service เรียก `POST /api/users/internal/create-profile` แบบ fire-and-forget หลัง register สำเร็จ |
| task-service ต้อง JOIN กับ users เพื่อดึง username | ไม่มี shared DB แล้ว | เก็บ `username` ลงใน tasks table โดยตรง (denormalization) |
| Nginx ต้องรองรับ register และ login ด้วย rate limit เดียวกัน | path ต่างกัน | ใช้ regex location `~ ^/api/auth/(login\|register)$` |

---

## 14. ข้อจำกัดของระบบ

- ใช้ self-signed certificate (browser แจ้ง warning)
- Database-per-Service ทำให้ cross-service query ไม่ได้โดยตรง ต้องใช้ internal API call
- user-service profile sync กับ auth-service แบบ eventual consistency (fire-and-forget)
- ยังไม่มี Refresh Token

---

## 15. สิ่งที่ต่างจาก Set 1

| จุด | Set 1 | Set 2 |
|---|---|---|
| Register | ❌ | ✅ POST /api/auth/register |
| User Service | ❌ | ✅ port 3004 |
| User Profile + Bio | ❌ | ✅ GET/PUT /api/users/me |
| Database | 1 shared DB | 4 แยก DB |
| task.username | JOIN users table | เก็บใน tasks table |
| Frontend | 2 หน้า | 3 หน้า (+ users.html) |
| docker-compose volumes | 1 | 4 |

---

> จัดทำโดย นายตรัยรัตน์ วงษ์สิทธิ์ และ นางสาวอภิรญา สายนาคำ  
> รายวิชา ENGSE207 Software Architecture | มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา
