# INDIVIDUAL_REPORT_675432100286.md

## ข้อมูลผู้จัดทำ
- **ชื่อ-นามสกุล:** นายตรัยรัตน์ วงษ์สิทธิ์
- **รหัสนักศึกษา:** 67543210028-6
- **รายวิชา:** ENGSE207 Software Architecture
- **งาน:** Final Lab ชุดที่ 2

---

## ขอบเขตงานที่รับผิดชอบ

| ส่วนงาน | ไฟล์หลัก |
|---|---|
| Auth Service — เพิ่ม Register | `auth-service/src/routes/auth.js` |
| User Service (ใหม่ทั้งหมด) | `user-service/src/routes/users.js`, `src/index.js`, `src/middleware/jwtUtils.js`, `src/db/db.js` |
| Database schemas | `db/auth/init.sql`, `db/user/init.sql` |
| Docker Compose | `docker-compose.yml` (เพิ่ม auth-db, user-db, user-service) |
| Nginx | `nginx/nginx.conf` (เพิ่ม /api/users/ + regex rate-limit) |

---

## สิ่งที่ได้ดำเนินการด้วยตนเอง

### 1. Auth Service — เพิ่ม Register
- เขียน `POST /api/auth/register` ให้ตรวจสอบ duplicate username/email ด้วย `OR` query
- hash password ด้วย `bcrypt.hash(password, 10)` และบันทึกลง auth-db
- หลัง register สำเร็จ เรียก `user-service/internal/create-profile` แบบ fire-and-forget เพื่อสร้าง profile ใน user-db
- ส่ง `REGISTER_SUCCESS` event ไปที่ log-service ทันที

### 2. User Service (สร้างใหม่ทั้งหมด)
- เขียน `POST /api/users/internal/create-profile` สำหรับรับ callback จาก auth-service (ไม่ต้อง JWT เพราะเรียกภายใน Docker network)
- เขียน `GET /api/users/me` ดึง profile จาก user-db ด้วย `user_id` จาก JWT payload
- เขียน `PUT /api/users/me` อัปเดต bio พร้อม `updated_at=NOW()`
- เขียน `GET /api/users/` สำหรับ admin ดู user ทั้งหมด พร้อม `requireAdmin` middleware

### 3. Database Schemas
- ออกแบบ `auth-db` เก็บเฉพาะ credentials (id, username, email, password_hash, role)
- ออกแบบ `user-db` เก็บ profiles (user_id FK concept, username, email, role, bio)
- ใส่ seed profiles ตรงกับ seed users ใน auth-db (user_id 1,2,3)

### 4. Docker Compose + Nginx
- เพิ่ม `auth-db` และ `user-db` service แต่ละตัวมี healthcheck และ volume แยกกัน
- เพิ่ม `user-service` service พร้อม environment variables
- ปรับ nginx.conf เพิ่ม `location /api/users/` และเปลี่ยน login rate-limit เป็น regex `~ ^/api/auth/(login|register)$`

---

## ปัญหาที่พบและวิธีการแก้ไข

### ปัญหาที่ 1: auth-service และ user-service ใช้ DB แยกกัน ทำให้ register แล้ว profile ไม่ถูกสร้างอัตโนมัติ
เมื่อ Register สำเร็จใน auth-db แต่ user-db ยังไม่รู้ว่ามี user ใหม่

**วิธีแก้:** auth-service เรียก `POST /api/users/internal/create-profile` แบบ fire-and-forget ทันทีหลัง INSERT users สำเร็จ ครอบด้วย `.catch(() => {})` เพื่อไม่ให้ล้มเหลวแม้ user-service ยังไม่พร้อม

### ปัญหาที่ 2: user-service ยังไม่ up ตอน auth-service start แต่ register ถูกเรียกแล้ว
ในช่วงแรก `depends_on` ใน docker-compose ไม่มี user-service → auth-service เรียก create-profile ไม่สำเร็จ

**วิธีแก้:** เนื่องจาก create-profile เป็น fire-and-forget อยู่แล้ว user-service จะสร้าง profile เมื่อ seed users ตอน init.sql แทน ส่วน user ที่ register ใหม่ profile จะถูกสร้างทันทีที่ user-service พร้อม

---

## สิ่งที่ได้เรียนรู้จากงานนี้

- **Database-per-Service Pattern:** การแยก DB ทำให้แต่ละ service deploy และ scale อิสระได้ แต่ต้องแลกด้วยความซับซ้อนใน cross-service data sync
- **Eventual Consistency:** การใช้ fire-and-forget สำหรับ create-profile เป็นตัวอย่างของ eventual consistency ที่ยอมรับได้ในระบบนี้ เพราะ profile ไม่ critical เท่า credentials
- **Internal Service Communication:** endpoint `/internal/*` ที่ไม่ต้อง JWT แต่ Nginx ไม่ expose ออกภายนอก เป็นรูปแบบที่ใช้กันจริงในระบบ microservices
- **Regex Location ใน Nginx:** `~ ^/api/auth/(login|register)$` ช่วย apply rate-limit ให้ทั้ง login และ register ด้วย rule เดียว

---

## แนวทางการพัฒนาต่อไป

- เพิ่ม **Message Queue** (เช่น Redis pub/sub) แทน HTTP call สำหรับ user-service sync เพื่อ decouple services มากขึ้น
- เพิ่ม **Refresh Token** ใน auth-service เพื่อลดความเสี่ยงเมื่อ access token หมดอายุ
- ใช้ **Managed Database** บน cloud แทน self-hosted postgres เพื่อ production readiness
