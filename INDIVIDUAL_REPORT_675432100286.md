# INDIVIDUAL_REPORT_675432100286.md

## ข้อมูลผู้จัดทำ
- **ชื่อ-นามสกุล:** นายตรัยรัตน์ วงษ์สิทธิ์
- **รหัสนักศึกษา:** 67543210028-6
- **รายวิชา:** ENGSE207 Software Architecture
- **งาน:** Final Lab ชุดที่ 2 — Microservices + Activity Tracking + Cloud (Railway)

---

## ขอบเขตงานที่รับผิดชอบ

| ส่วนงาน | ไฟล์หลัก |
|---|---|
| Auth Service — Register + logActivity | `auth-service/src/routes/auth.js` |
| Auth DB Schema | `auth-service/init.sql` |
| Deploy Auth Service บน Railway | Railway Dashboard — auth-service + auth-db |

---

## สิ่งที่ได้ดำเนินการด้วยตนเอง

### 1. Auth Service — เพิ่ม Register API
- เขียน `POST /api/auth/register` พร้อม validate ครบ: ตรวจ field ว่าง, password น้อยกว่า 6 ตัวอักษร, email/username ซ้ำ
- ใช้ `bcrypt.hash(password, 10)` สร้าง hash ก่อน INSERT
- คืน status 201 พร้อม user object (ไม่คืน token เพื่อให้ frontend login ต่อเอง)

### 2. logToDB() — บันทึก log ลง auth-db
- เขียน helper function `logToDB()` INSERT ลง `logs` table ใน auth-db
- บันทึกทุก event สำคัญ: REGISTER_SUCCESS, LOGIN_SUCCESS, LOGIN_FAILED

### 3. logActivity() — ส่ง event ไป Activity Service (fire-and-forget)
- เขียน `logActivity()` ที่เรียก `fetch()` ไปที่ `ACTIVITY_SERVICE_URL/api/activity/internal`
- ต่อท้าย `.catch(() => { console.warn(...) })` เพื่อให้ auth-service ยังทำงานได้แม้ activity-service ล่ม
- ส่ง events: `USER_REGISTERED` หลัง register สำเร็จ, `USER_LOGIN` หลัง login สำเร็จ

### 4. Deploy บน Railway
- สร้าง auth-service deployment ตั้ง Root Directory = `auth-service`
- เพิ่ม PostgreSQL plugin สำหรับ auth-db
- ตั้งค่า Environment Variables: DATABASE_URL, JWT_SECRET, ACTIVITY_SERVICE_URL

---

## ปัญหาที่พบและวิธีการแก้ไข

### ปัญหาที่ 1: ACTIVITY_SERVICE_URL ยังไม่รู้ค่าตอน deploy auth-service
deploy auth-service ก่อน แต่ activity-service ยังไม่มี URL

**วิธีแก้:** ตั้ง `ACTIVITY_SERVICE_URL` เป็นค่า placeholder ก่อน แล้วกลับมาแก้ภายหลังเมื่อ activity-service deploy เสร็จ Railway จะ restart service อัตโนมัติเมื่อ env เปลี่ยน

### ปัญหาที่ 2: auth-service ส่ง event แล้ว activity-service ตอบช้า ทำให้ register ช้า
fetch() รอ response นานเกินไป

**วิธีแก้:** ยืนยันว่า `logActivity()` ไม่มี `await` นำหน้า — เรียกแบบ fire-and-forget จริงๆ ทำให้ไม่บล็อก response กลับไปหา client

---

## สิ่งที่ได้เรียนรู้จากงานนี้

- **Fire-and-forget Pattern:** การเรียก service อื่นโดยไม่รอ response ช่วยให้ระบบ resilient — ถ้า downstream service ล่ม upstream ยังทำงานได้ปกติ เป็น pattern ที่ใช้จริงในระบบ production ที่ต้องการ high availability
- **Denormalization ใน activities table:** activities เก็บ `username` ไว้ด้วยแม้จะรู้ `user_id` อยู่แล้ว เพราะ activity-db ไม่มี users table — ถ้าไม่ denormalize จะต้อง query ข้าม 2 databases ซึ่งทำไม่ได้ใน Database-per-Service pattern
- **Database-per-Service Trade-off:** แต่ละ service มี DB ของตัวเอง ทำให้ deploy และ scale อิสระได้ แต่ต้องแลกด้วยความซับซ้อนใน data sync และไม่สามารถ JOIN ข้าม services ได้
- **Railway Cloud Deploy:** การตั้ง Root Directory ให้ถูกต้องและใช้ `DATABASE_URL` connection string แทนการ config แยก host/port เป็นสิ่งสำคัญสำหรับ Railway

---

## ส่วนที่ยังไม่สมบูรณ์หรืออยากปรับปรุง

- เพิ่ม **Rate Limiting** ใน Register เพื่อป้องกัน brute-force account creation
- เพิ่ม **Email Verification** หลัง register เพื่อยืนยัน email จริง
- ใช้ **Message Queue** (Redis pub/sub) แทน HTTP call สำหรับ activity event เพื่อ decouple services มากขึ้น และรองรับ retry เมื่อ activity-service ล่มแล้วกลับมา
