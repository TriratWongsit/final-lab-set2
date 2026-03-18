# INDIVIDUAL_REPORT_67543210075-7.md

## ข้อมูลผู้จัดทำ
- ชื่อ-นามสกุล: นางสาวอภิรญา  สายนาคำ
- รหัสนักศึกษา: 67543210075-7
- รายวิชา: ENGSE207 Software Architecture

---

## ขอบเขตงานที่รับผิดชอบ

- **task-service** — ต่อยอดจาก Set 1 เพิ่มการส่ง event ไปยัง Activity Service ทุกครั้งที่มีการเปลี่ยนแปลง task
- **log-service** — ต่อยอดจาก Set 1 แยก database เป็น log-db ของตัวเอง
- **activity-service** — ออกแบบและพัฒนา service ใหม่ทั้งหมดสำหรับบันทึก events ในระบบ
- **frontend** — เพิ่มหน้า Register (`register.html`) และหน้า Activity Feed (`activities.html`)
- **db/** — ออกแบบและเขียน init SQL ทั้ง 5 ไฟล์
- **screenshots/** — ถ่ายและรวบรวม screenshots ทุกใบ
- Deploy task-service, log-service และ activity-service บน Railway Cloud

---

## สิ่งที่ได้ดำเนินการด้วยตนเอง

### 1. Activity Service (ใหม่ทั้งหมด)
ออกแบบ activity-service ตั้งแต่ต้นโดยกำหนด event schema ในตาราง `activities` ให้มี column `service` บอกว่า event มาจาก service ไหน, `event_type` บอกประเภท event เช่น `task_created`, `user_login`, `task_deleted`, `user_id` ของผู้ที่ทำ action, `entity_type` และ `entity_id` บอกว่า action กระทำกับ object ใด และ `metadata` แบบ JSONB เพื่อเก็บรายละเอียดเพิ่มเติมที่ยืดหยุ่นรองรับทุก event type

เขียน route `POST /api/activities/internal` สำหรับรับ event จาก service อื่น ไม่ต้องการ JWT เพราะเป็น internal call ระหว่าง service เขียน `GET /api/activities/` แสดงประวัติ event ทั้งหมด และ `GET /api/activities/stats` แสดงสถิติจำนวน event แยกตาม event_type เพิ่ม index บน `user_id` และ `event_type` เพื่อให้ query เร็ว

สร้าง `Dockerfile` และ `package.json` ให้ครบ พร้อม test ว่า health endpoint ตอบสนองถูกต้อง

### 2. Task Service — ต่อยอดจาก Set 1
แก้ไข task-service จาก Set 1 ใน 2 ส่วนหลัก ส่วนแรกคือเปลี่ยน `DATABASE_URL` ให้ชี้ไปยัง task-db แทน shared postgres ส่วนที่สองคือเพิ่ม HTTP call ไปยัง Activity Service ทุกครั้งที่มีการ create, update หรือ delete task โดยใช้ `axios.post(process.env.ACTIVITY_SERVICE_URL + '/api/activities/internal', { service: 'task-service', event_type: 'task_created', user_id: req.user.id, entity_type: 'task', entity_id: result.rows[0].id, metadata: { title } }).catch(err => console.error('Activity log failed:', err))` แบบ fire-and-forget คือไม่ `await` เพื่อให้ Task Service response กลับ client ได้ทันทีโดยไม่ต้องรอ Activity Service

### 3. Log Service — ต่อยอดจาก Set 1
แก้ไข log-service จาก Set 1 โดยเปลี่ยน `DATABASE_URL` ให้ชี้ไปยัง log-db แทน shared postgres และเพิ่ม CORS middleware เพื่อรองรับการเรียกจาก frontend บน Railway ที่อยู่คนละ subdomain

### 4. Frontend — เพิ่มหน้าใหม่ 2 หน้า

**register.html** — สร้างหน้า Register form ที่ส่ง `POST /api/auth/register` พร้อม `username`, `email` และ `password` เมื่อสำเร็จจะได้ token กลับมาและ redirect ไปหน้า index.html อัตโนมัติ เพิ่ม error message แสดงผลเมื่อ email ซ้ำหรือ password สั้นเกินไป และเพิ่มลิงก์ไปหน้า Login สำหรับคนที่มี account แล้ว

**activities.html** — สร้างหน้า Activity Feed ที่ดึงข้อมูลจาก `GET /api/activities/` แสดงเป็นรายการ events พร้อม timestamp, event_type, service ที่ส่ง event และ user_id ผู้ทำ action เพิ่ม dropdown filter ตาม event_type เพื่อให้ดูเฉพาะ event ที่สนใจได้ และแสดง stats จาก `GET /api/activities/stats` เป็น summary ด้านบนหน้า

### 5. Database Schema ทั้ง 5 ไฟล์
เขียน init SQL สำหรับทุก database ใน `db/` ดังนี้
- `init-auth.sql` — ตาราง users พร้อม seed data 3 คน (alice, bob, admin)
- `init-task.sql` — ตาราง tasks พร้อม index บน `created_by` และ `status`
- `init-log.sql` — ตาราง logs
- `init-user.sql` — ตาราง user_profiles พร้อม unique constraint บน user_id
- `init-activity.sql` — ตาราง activities พร้อม index บน user_id และ event_type

### 6. Railway Deployment
Deploy task-service, log-service และ activity-service บน Railway Cloud สร้าง PostgreSQL plugin สำหรับแต่ละ service ตั้งค่า `DATABASE_URL`, `JWT_SECRET` และ `ACTIVITY_SERVICE_URL` บน Railway dashboard ทดสอบด้วย curl ว่าทุก health endpoint ตอบสนองถูกต้องหลัง deploy

---

## ปัญหาที่พบและวิธีการแก้ไข

### ปัญหาที่ 1 — Task Service response ช้าลงหลังเพิ่ม Activity event
**ปัญหา:** หลังเพิ่ม HTTP call ไปยัง Activity Service ใน create/update/delete task พบว่า response time ช้าขึ้นประมาณ 200-300ms เพราะ code เดิมใช้ `await axios.post(...)` ทำให้ Task Service ต้องรอจนกว่า Activity Service จะ response ก่อนจึงจะ return ให้ client

**วิธีแก้:** เปลี่ยนเป็น fire-and-forget โดยตัด `await` ออก แล้วต่อ `.catch(err => console.error('Activity log failed:', err))` ไว้แทนเพื่อให้ error ไม่หลุดเงียบ ผลคือ Task Service return response ให้ client ได้ทันทีโดยไม่ต้องรอ Activity Service ทำให้ response time กลับมาปกติ

### ปัญหาที่ 2 — CORS error เมื่อ frontend บน Railway เรียก API
**ปัญหา:** หลัง deploy บน Railway แต่ละ service มี subdomain ต่างกัน เช่น `auth-service-xxxx.railway.app` และ `task-service-yyyy.railway.app` เมื่อ frontend เรียก API ข้าม subdomain browser บล็อก request เนื่องจาก CORS policy ทำให้ login และ task CRUD ไม่ทำงาน

**วิธีแก้:** ติดตั้ง `cors` package ใน task-service และ log-service แล้ว config ให้รับ origin ของ frontend URL บน Railway โดยเพิ่ม `app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))` ใน index.js ของแต่ละ service

### ปัญหาที่ 3 — Activity stats ไม่แสดงผลเมื่อยังไม่มี event ใด
**ปัญหา:** เมื่อเปิด activities.html ครั้งแรกก่อนมี event ใดเลย `GET /api/activities/stats` return array ว่าง `[]` และ frontend แสดงหน้าว่างไม่มีข้อความอธิบาย ทำให้ดูเหมือน error

**วิธีแก้:** เพิ่ม empty state ใน activities.html โดยตรวจสอบว่า response เป็น array ว่างหรือไม่ ถ้าใช่ให้แสดงข้อความ "ยังไม่มี activity ในระบบ" แทน และเพิ่ม loading spinner ระหว่างดึงข้อมูลเพื่อให้ UX ดีขึ้น

---

## สิ่งที่ได้เรียนรู้จากงานนี้

**ด้านเทคนิค**
- เข้าใจการออกแบบ Event Tracking schema ว่าควรใช้ JSONB metadata เพื่อให้ยืดหยุ่น ไม่ต้องสร้าง column ใหม่ทุกครั้งที่มี event type ใหม่ เพียงแค่ส่ง metadata ที่ต่างกันไป
- เรียนรู้ fire-and-forget pattern อย่างเข้าใจว่าใช้เมื่อไหร่ ซึ่งคือเมื่อ side effect ไม่ควรกระทบ main flow และ failure ของ side effect ยอมรับได้
- เข้าใจ CORS จากการแก้ปัญหาจริงบน Railway ว่าเกิดจากอะไรและแก้ได้ที่ฝั่ง server

**ด้านสถาปัตยกรรม**
- เห็นว่า Activity Service ทำหน้าที่เป็น audit trail ของทั้งระบบ ซึ่งในระบบ production จริงมีประโยชน์มากในการ debug และ monitor พฤติกรรมผู้ใช้ และสามารถแยก deploy หรือ scale ได้อิสระจาก service อื่น
- เข้าใจ trade-off ของ database-per-service จากการเขียน init SQL 5 ไฟล์แยกกัน ว่าได้ความเป็นอิสระของแต่ละ service แต่ต้องแลกกับความซับซ้อนในการ manage หลาย database พร้อมกัน

---

## เปรียบเทียบ Set 1 และ Set 2

| ประเด็น | Set 1 | Set 2 |
|---|---|---|
| Activity Tracking | ไม่มี | Activity Service บันทึกทุก event พร้อม stats |
| Task Service | CRUD + ส่ง log ไป Log Service | เพิ่มส่ง event ไป Activity Service แบบ fire-and-forget |
| Log Service | Shared DB | แยก log-db เป็นของตัวเอง |
| Database Schema | init.sql ไฟล์เดียว ทุก table รวมกัน | แยก init SQL 5 ไฟล์ตาม service |
| Frontend | Task Board + Log Dashboard | เพิ่มหน้า Register + Activity Feed |
| Deployment | Local Docker Compose | Railway Cloud |

**สิ่งที่ซับซ้อนขึ้นใน Set 2** คือ Task Service ต้องรู้จัก Activity Service และส่ง event ทุกครั้งที่มีการเปลี่ยนแปลง ทำให้ต้องคิดเรื่อง error handling เพิ่มว่าถ้า Activity Service ล่มจะกระทบ Task Service ไหม ซึ่งแก้ด้วย fire-and-forget ส่วน deploy บน Railway ต้องจัดการ environment ที่ต่างจาก local และต้องตั้งค่า URL ของแต่ละ service ให้ถูกต้อง

**สิ่งที่ดีขึ้นใน Set 2** คือระบบมีความสมบูรณ์และใกล้เคียง production มากขึ้น สามารถติดตามได้ว่าใครทำอะไรในระบบบ้างผ่าน Activity Feed และ user ใหม่สามารถ register เองได้โดยไม่ต้องรอ admin seed ข้อมูลให้
