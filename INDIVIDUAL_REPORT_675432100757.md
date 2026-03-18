# INDIVIDUAL_REPORT_675432100757.md

## ข้อมูลผู้จัดทำ
- **ชื่อ-นามสกุล:** นางสาวอภิรญา สายนาคำ
- **รหัสนักศึกษา:** 67543210075-7
- **รายวิชา:** ENGSE207 Software Architecture
- **งาน:** Final Lab ชุดที่ 2 — Microservices + Activity Tracking + Cloud (Railway)

---

## ขอบเขตงานที่รับผิดชอบ

| ส่วนงาน | ไฟล์หลัก |
|---|---|
| Task Service — เพิ่ม logActivity() | `task-service/src/routes/tasks.js` |
| Task DB Schema | `task-service/init.sql` |
| Activity Service (ใหม่ทั้งหมด) | `activity-service/src/index.js` |
| Activity DB Schema | `activity-service/init.sql` |
| Frontend | `frontend/index.html`, `frontend/activity.html`, `frontend/config.js` |
| Deploy Task + Activity บน Railway | Railway Dashboard |

---

## สิ่งที่ได้ดำเนินการด้วยตนเอง

### 1. Task Service — เพิ่ม logActivity()
- เขียน `logActivity()` helper แบบ fire-and-forget เรียก `ACTIVITY_SERVICE_URL/api/activity/internal`
- เพิ่ม call ใน 3 routes:
  - `POST /api/tasks` → ส่ง `TASK_CREATED`
  - `PUT /api/tasks/:id` → ตรวจ `status !== old.status` ก่อน ถ้าเปลี่ยนถึงส่ง `TASK_STATUS_CHANGED` พร้อม `meta: { old_status, new_status }`
  - `DELETE /api/tasks/:id` → ส่ง `TASK_DELETED`

### 2. Activity Service (สร้างใหม่ทั้งหมด)
- `POST /api/activity/internal` — รับ event จาก services อื่น INSERT ลง activities table ไม่ต้อง JWT (เรียกภายใน Docker network)
- `GET /api/activity/me` — ดึง activities ของ `req.user.sub` รองรับ filter `event_type`, pagination
- `GET /api/activity/all` — admin เท่านั้น รองรับ filter `event_type`, `username`
- เพิ่ม fallback `CREATE TABLE IF NOT EXISTS` ใน `start()` สำหรับ Railway ที่ init.sql อาจไม่รันอัตโนมัติ

### 3. Frontend
- **config.js** — กำหนด `window.APP_CONFIG` พร้อม AUTH_URL, TASK_URL, ACTIVITY_URL (local + comment สำหรับ Railway)
- **index.html** — เพิ่ม Register tab, `doRegister()` ที่ auto-login หลัง register สำเร็จ, เปลี่ยน sidebar ให้มีแค่ Tasks + Activity link
- **activity.html** — Timeline UI พร้อม stats bar, filter, tabs (mine/all), render timeline ด้วย color-coded dots

---

## ปัญหาที่พบและวิธีการแก้ไข

### ปัญหาที่ 1: TASK_STATUS_CHANGED ต้องรู้ค่า status เดิม
PUT /api/tasks/:id รับแค่ค่าใหม่ ไม่รู้ค่าเดิม

**วิธีแก้:** query `SELECT * FROM tasks WHERE id=$1` ก่อน UPDATE อยู่แล้ว (เพื่อ check permission) จึงเก็บ `check.rows[0].status` ไว้ใน `old` แล้วเปรียบเทียบกับ `status` ที่รับมา ถ้าต่างกันจึง logActivity พร้อมส่ง `meta: { old_status, new_status }`

### ปัญหาที่ 2: doRegister() ใน frontend ต้อง login ต่อหลัง register
auth-service `/register` ไม่คืน token ตรงๆ ต้อง login แยก

**วิธีแก้:** หลัง register สำเร็จ (201) เรียก `POST /api/auth/login` ต่อทันทีด้วย email/password เดิม แล้ว `initApp(loginData.user)` ทำให้ UX ลื่นไม่ต้อง login ซ้ำ

---

## สิ่งที่ได้เรียนรู้จากงานนี้

- **Denormalization ใน activities table:** activities เก็บ `username` ไว้ด้วยแม้จะรู้ `user_id` อยู่แล้ว เพราะ activity-db ไม่มี users table ถ้าต้องการ username ต้องเรียก auth-service ซึ่งทำให้ activity-service ขึ้นอยู่กับ auth-service ทุกครั้งที่ query — การ denormalize ณ เวลาที่ event เกิดขึ้นเป็น pattern ที่ดีกว่า
- **ทำไม logActivity() ต้องเป็น fire-and-forget:** เพราะ activity tracking เป็น non-critical feature ถ้า await แล้ว activity-service ล่ม จะทำให้ task create หรือ login ล้มเหลวด้วย ซึ่งไม่ถูกต้อง การ fire-and-forget ทำให้ core functionality ไม่ขึ้นอยู่กับ non-critical service
- **Service-to-Service Call Pattern:** ใช้ HTTP call โดยตรงระหว่าง services ใน Docker network — ง่ายกว่า Message Queue แต่ต้องระวัง coupling และ latency
- **Railway Deployment:** ลำดับ deploy สำคัญ — ควร deploy activity-service ก่อน แล้วค่อยตั้ง ACTIVITY_SERVICE_URL ให้ auth-service และ task-service

---

## ส่วนที่ยังไม่สมบูรณ์หรืออยากปรับปรุง

- เพิ่ม **Auto-refresh** ใน activity.html ทุก 10 วินาที เพื่อเห็น activities realtime
- เพิ่ม **Date range filter** สำหรับ admin ที่ต้องการดู activities ช่วงเวลาที่กำหนด
- ใช้ **WebSocket** หรือ **Server-Sent Events** เพื่อ push notifications เมื่อมี activity ใหม่
