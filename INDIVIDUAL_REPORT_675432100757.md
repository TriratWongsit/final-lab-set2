# INDIVIDUAL_REPORT_675432100757.md

## ข้อมูลผู้จัดทำ
- **ชื่อ-นามสกุล:** นางสาวอภิรญา สายนาคำ
- **รหัสนักศึกษา:** 67543210075-7
- **รายวิชา:** ENGSE207 Software Architecture
- **งาน:** Final Lab ชุดที่ 2

---

## ขอบเขตงานที่รับผิดชอบ

| ส่วนงาน | ไฟล์หลัก |
|---|---|
| Task Service — migrate to task-db | `task-service/src/routes/tasks.js`, `src/db/db.js` |
| Log Service — migrate to log-db | `log-service/src/index.js` |
| Database schemas | `db/task/init.sql`, `db/log/init.sql` |
| Frontend index.html | เพิ่ม Register tab, Bio edit, Users nav link |
| Frontend users.html | สร้างหน้าใหม่ทั้งหมด |
| Integration Testing + Screenshots | ทดสอบและจัดทำ screenshots 14 รูป |

---

## สิ่งที่ได้ดำเนินการด้วยตนเอง

### 1. Task Service — ปรับให้ใช้ task-db แยก
- เปลี่ยน DB connection จาก `postgres` (shared) เป็น `task-db` โดยแก้ `db/db.js`
- แก้ schema ใน `db/task/init.sql` ให้เพิ่มคอลัมน์ `username VARCHAR(50)` ใน tasks table เพื่อ denormalize แทนการ JOIN กับ users table
- แก้ `POST /api/tasks/` ให้บันทึก `req.user.username` ลงในคอลัมน์ `username` โดยตรง
- แก้ `GET /api/tasks/` ให้ไม่ต้อง JOIN อีกต่อไป (query จาก task-db เพียง DB เดียว)

### 2. Log Service — ปรับให้ใช้ log-db แยก
- เปลี่ยน DB connection จาก `postgres` (shared) เป็น `log-db`
- แก้ `db/log/init.sql` ให้เขียน schema `logs` table แยกต่างหาก (ไม่ต้องมี users/tasks)

### 3. Frontend index.html — Register tab
- เพิ่ม `.tabs` component พร้อม `switchTab()` function สำหรับสลับระหว่าง Login / Register
- เขียน `doRegister()` เรียก `POST /api/auth/register` รับ JWT กลับมาแล้วเข้าสู่ระบบทันที
- เพิ่ม Bio section ใน Profile page พร้อม `<textarea>` และปุ่ม `saveBio()` เรียก `PUT /api/users/me`
- เพิ่ม Users nav link ที่เปิด `users.html` ใน new tab

### 4. Frontend users.html (สร้างใหม่ทั้งหมด)
- Login overlay ที่ไม่ restrict role (ทั้ง member และ admin login ได้)
- admin เรียก `GET /api/users/` เห็น user ทั้งหมด
- member เรียก `GET /api/users/me` เห็นเฉพาะตัวเอง (handle 403 แล้ว fallback)
- แสดง user card พร้อม avatar, username, email, role badge, bio

---

## ปัญหาที่พบและวิธีการแก้ไข

### ปัญหาที่ 1: task-service ไม่รู้ username ของ user เพราะ task-db ไม่มี users table
เดิมใน Set 1 task-service JOIN กับ users table ใน shared DB แต่ Set 2 แยก DB แล้ว JOIN ไม่ได้

**วิธีแก้:** ใช้ **Denormalization** — เพิ่มคอลัมน์ `username` ใน tasks table และบันทึกค่าจาก `req.user.username` (มาจาก JWT payload) ตอน POST /api/tasks/ ทำให้ query tasks ได้โดยไม่ต้อง JOIN

### ปัญหาที่ 2: users.html ต้องรองรับทั้ง admin และ member โดยไม่ error
member เรียก `GET /api/users/` จะได้ 403 แต่ต้องยังแสดงข้อมูลของตัวเองได้

**วิธีแก้:** ตรวจ status code ก่อน — ถ้าได้ 403 ให้ fallback ไปเรียก `GET /api/users/me` แทน แล้ว `renderUsers([d.profile])` แสดง profile ตัวเองแทน

---

## สิ่งที่ได้เรียนรู้จากงานนี้

- **Denormalization ใน Microservices:** การเก็บ `username` ซ้ำใน tasks table เป็น trade-off ที่ยอมรับได้ เพราะ username ไม่ค่อยเปลี่ยน และช่วยให้ query ง่ายโดยไม่ต้องพึ่ง service อื่น
- **Database-per-Service Trade-off:** แม้แต่ละ service จะ scale ได้อิสระ แต่ต้องแลกด้วยการจัดการ DB หลายตัวและ data consistency ที่ซับซ้อนขึ้น
- **Graceful Fallback ใน Frontend:** การตรวจ status code และ fallback ให้ UX ที่ดีโดยไม่แสดง error กระโดก เป็นทักษะสำคัญสำหรับ production frontend
- **Eventual Consistency ในทางปฏิบัติ:** profile ที่สร้างจาก create-profile call อาจล่าช้าเล็กน้อยหลัง register แต่ในกรณีนี้ user-service รับ request ทันทีที่พร้อม ทำให้ latency เล็กน้อยมาก

---

## แนวทางการพัฒนาต่อไป

- เพิ่ม **Search และ Filter** ใน users.html สำหรับ admin จัดการผู้ใช้จำนวนมาก
- เพิ่ม **Avatar upload** ใน user-service (เก็บ URL รูปภาพ)
- ปรับ task-service ให้มี **Pagination** สำหรับกรณี tasks จำนวนมาก
- Deploy ระบบทั้งหมดขึ้น **Railway Cloud** เพื่อทดสอบ production environment จริง
