# INDIVIDUAL_REPORT_67543210028-6.md

## ข้อมูลผู้จัดทำ
- ชื่อ-นามสกุล: นายตรัยรัตน์  วงษ์สิทธิ์
- รหัสนักศึกษา: 67543210028-6
- รายวิชา: ENGSE207 Software Architecture

---

## ขอบเขตงานที่รับผิดชอบ

- **auth-service** — เพิ่ม Register API พร้อม validation และ bcrypt hashing
- **user-service** — ออกแบบและพัฒนา service ใหม่สำหรับจัดการ User Profile
- **nginx** — เพิ่ม route `/api/users/` และ `/api/activities/` ปรับ gateway strategy
- **scripts/** — gen-certs.sh สำหรับสร้าง self-signed certificate
- **docker-compose.yml** — ตั้งค่า database-per-service และ network ทั้งระบบ
- **.env.example** — กำหนด environment variables สำหรับทุก service
- Deploy auth-service และ user-service บน Railway Cloud

---

## สิ่งที่ได้ดำเนินการด้วยตนเอง

### 1. Auth Service — Register API
เพิ่ม route `POST /api/auth/register` ใหม่ใน `auth-service/src/routes/auth.js` โดยรับ `username`, `email` และ `password` จาก request body ก่อน insert ตรวจสอบว่า email ซ้ำในฐานข้อมูลหรือไม่ด้วย query `SELECT id FROM users WHERE email = $1` หากซ้ำให้ return 400 ทันที หากไม่ซ้ำจึงเข้ารหัส password ด้วย `bcryptjs.hashSync(password, 10)` แล้ว insert ลง auth-db พร้อม return JWT token กลับไปเลยเพื่อให้ user login ได้ทันทีหลัง register สำเร็จ นอกจากนี้ยังเพิ่ม input validation ตรวจสอบ field ว่าง และความยาว password ขั้นต่ำ 6 ตัวอักษร

### 2. User Service (ใหม่ทั้งหมด)
ออกแบบและพัฒนา service ใหม่ตั้งแต่ต้นใน `user-service/` กำหนดโครงสร้างไฟล์ให้เหมือนกับ service อื่นในระบบ ได้แก่ `src/index.js` และ `src/routes/users.js` ตาราง `user_profiles` ใน user-db เก็บข้อมูล `user_id`, `display_name` และ `bio` โดย `user_id` อ้างอิงจาก auth-service แต่ไม่ได้ทำ foreign key ข้าม database เพราะเป็น database-per-service เขียน route `GET /api/users/:id` สำหรับดูโปรไฟล์และ `PUT /api/users/:id` สำหรับแก้ไข ทุก route ผ่าน JWT middleware ก่อนเสมอ และใช้ `ON CONFLICT DO UPDATE` เพื่อให้ upsert ได้ในคำสั่งเดียว

### 3. Nginx — Gateway Strategy
แก้ไข `nginx/nginx.conf` เพิ่ม location block สำหรับ `/api/users/` และ `/api/activities/` ให้ proxy ไปยัง user-service และ activity-service ตามลำดับ ปรับ `limit_req_zone` ให้ครอบคลุม login และ register เพื่อป้องกัน brute-force และเพิ่ม `proxy_set_header X-Real-IP $remote_addr` ทุก location เพื่อให้ service ปลายทางรู้ IP จริงของ client

### 4. Docker Compose — Database-per-Service
แก้ไข `docker-compose.yml` จาก Set 1 ที่ใช้ postgres ก้อนเดียว ให้แตกออกเป็น 5 containers ได้แก่ auth-db, task-db, log-db, user-db และ activity-db แต่ละตัวมี volume แยก และ mount init SQL ของตัวเองเพื่อสร้าง schema ตอน boot กำหนด `depends_on` ให้ทุก service รอ database ของตัวเองก่อน start

### 5. Railway Deployment
Deploy auth-service และ user-service บน Railway Cloud สร้าง PostgreSQL plugin แยกสำหรับแต่ละ service ตั้งค่า environment variables บน Railway dashboard ได้แก่ `DATABASE_URL` จาก Railway PostgreSQL, `JWT_SECRET`, `JWT_EXPIRES` และ `ACTIVITY_SERVICE_URL` ที่ชี้ไปยัง URL จริงของ activity-service บน Railway

---

## ปัญหาที่พบและวิธีการแก้ไข

### ปัญหาที่ 1 — Register ส่ง error 500 แทน 400 เมื่อ email ซ้ำ
**ปัญหา:** เมื่อ register ด้วย email ที่มีอยู่แล้วใน database PostgreSQL던지ก error `duplicate key value violates unique constraint` ซึ่ง Express จับเป็น unhandled error แล้ว response กลับเป็น 500 Internal Server Error ทำให้ client ไม่รู้ว่าเกิดอะไรขึ้น

**วิธีแก้:** เพิ่มการตรวจสอบ `err.code === '23505'` ใน catch block ซึ่งเป็น PostgreSQL error code สำหรับ unique violation จากนั้น return `res.status(400).json({ error: 'Email already exists' })` แทนที่จะปล่อยให้ error ขึ้น 500 ทำให้ client ได้รับ error message ที่ชัดเจนและสามารถแสดงผลบน frontend ได้ถูกต้อง

### ปัญหาที่ 2 — Service crash เพราะ database ยังไม่พร้อมตอน boot
**ปัญหา:** หลังจากแยก database เป็น 5 ก้อน พบว่าตอนรัน `docker compose up --build` ครั้งแรก auth-service และ user-service พยายาม connect database ก่อนที่ postgres container จะ initialize เสร็จ ทำให้ service crash และ Docker restart loop ไม่หยุด

**วิธีแก้:** เพิ่ม `depends_on` ใน docker-compose.yml และเพิ่ม retry logic ใน service โดยใช้ `pg.Pool` ที่มี `connectionTimeoutMillis: 5000` และ `max: 10` เพื่อให้ pool รอ connection แทนที่จะ throw error ทันที นอกจากนี้ยังเพิ่ม try-catch รอบ pool.query ทุกจุดเพื่อ graceful error handling

### ปัญหาที่ 3 — Railway environment variable ชื่อไม่ตรงกับ local
**ปัญหา:** ใน local ใช้ `AUTH_DB_URL` แต่ Railway PostgreSQL plugin inject ตัวแปรในชื่อ `DATABASE_URL` โดยอัตโนมัติ ทำให้ service บน Railway connect database ไม่ได้

**วิธีแก้:** แก้ code ใน service ให้อ่านค่าจาก `process.env.DATABASE_URL || process.env.AUTH_DB_URL` เพื่อให้ทำงานได้ทั้งบน local และ Railway โดยไม่ต้องแก้ code แยกกัน

---

## สิ่งที่ได้เรียนรู้จากงานนี้

**ด้านเทคนิค**
- เข้าใจ Register flow ที่สมบูรณ์ว่าต้องมี validation → duplicate check → bcrypt hash → insert → return token ตามลำดับ และแต่ละขั้นต้องมี error handling ที่ชัดเจน
- เรียนรู้ว่าการแยก User Profile ออกจาก Auth service ทำให้ auth-service มีหน้าที่ชัดเจนคือจัดการ credential เท่านั้น ส่วน profile ข้อมูลเพิ่มเติมของ user อยู่ใน user-service
- เข้าใจ database-per-service ในทางปฏิบัติว่าต้องออกแบบ schema และ init SQL แยกกันทุก service และต้องระวังเรื่อง boot order ของ container

**ด้านสถาปัตยกรรม**
- เห็นความสำคัญของ gateway strategy ว่าเมื่อมีหลาย service Nginx ต้องรู้จัก route ทุกตัว และการเพิ่ม service ใหม่ทุกครั้งต้องอัปเดต nginx.conf ด้วยเสมอ
- เรียนรู้ความแตกต่างระหว่าง local Docker Compose กับ Railway ว่า Railway inject environment variables ให้อัตโนมัติในบางชื่อ ต้องอ่าน documentation ก่อน deploy

---

## เปรียบเทียบ Set 1 และ Set 2

| ประเด็น | Set 1 | Set 2 |
|---|---|---|
| Register | ไม่มี ใช้ Seed Users เท่านั้น | มี Register API พร้อม validation และ bcrypt |
| User Management | รวมอยู่ใน auth-service | แยก user-service มีฐานข้อมูลของตัวเอง |
| Database | Shared postgres ก้อนเดียว | Database-per-Service (5 ก้อนแยกกัน) |
| Nginx | Route 3 services | Route 5 services พร้อม gateway strategy |
| Deployment | Local Docker Compose เท่านั้น | Railway Cloud |
| ความซับซ้อน docker-compose.yml | 1 postgres หลาย service เชื่อมกัน | 5 postgres แต่ละตัว mount init SQL แยก |

**สิ่งที่ซับซ้อนขึ้นใน Set 2** คือ docker-compose.yml ที่มี service มากขึ้นเป็น 2 เท่า และต้องดูแล boot order ให้ถูกต้อง รวมถึง Railway deployment ที่ต้องตั้งค่า environment ทีละ service ซึ่งใช้เวลามากกว่า local มาก

**สิ่งที่ดีขึ้นใน Set 2** คือระบบมี user management ที่สมบูรณ์กว่า สามารถ register ได้จริงและมี profile แยกต่างหาก ทำให้เห็นภาพระบบ production จริงๆ มากขึ้น
