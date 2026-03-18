# TEAM_SPLIT.md

## ข้อมูลกลุ่ม
- รายวิชา: ENGSE207 Software Architecture
- งาน: Final Lab — ชุดที่ 2: Microservices + Register + User Service + Database-per-Service

## รายชื่อสมาชิก
| ลำดับ | ชื่อ-นามสกุล | รหัสนักศึกษา |
|---|---|---|
| 1 | นายตรัยรัตน์ วงษ์สิทธิ์ | 67543210028-6 |
| 2 | นางสาวอภิรญา สายนาคำ | 67543210075-7 |

---

## การแบ่งงานหลัก

### สมาชิกคนที่ 1: นายตรัยรัตน์ วงษ์สิทธิ์ (67543210028-6)
**Branch: `feature/auth-user-db`**

รับผิดชอบงานหลักดังต่อไปนี้
- **Auth Service** — เพิ่ม `POST /api/auth/register` (validate, bcrypt hash, สร้าง JWT, แจ้ง user-service)
- **User Service** — สร้าง service ใหม่ทั้งหมด (profile, bio, list users, internal create-profile)
- **Database schemas** — เขียน `db/auth/init.sql`, `db/user/init.sql` (แยก DB ต่อ service)
- **Docker Compose** — เพิ่ม auth-db, user-db, user-service; ตั้งค่า depends_on ครบ
- **Nginx** — เพิ่ม `/api/users/` route, regex rate-limit สำหรับ login+register

### สมาชิกคนที่ 2: นางสาวอภิรญา สายนาคำ (67543210075-7)
**Branch: `feature/frontend-task-log`**

รับผิดชอบงานหลักดังต่อไปนี้
- **Task Service** — ปรับให้ใช้ task-db แยก, เปลี่ยน JOIN → เก็บ `username` ใน tasks table โดยตรง
- **Log Service** — ปรับให้ใช้ log-db แยก
- **Database schemas** — เขียน `db/task/init.sql`, `db/log/init.sql`
- **Frontend `index.html`** — เพิ่ม Register tab, switchTab(), `doRegister()`, Bio edit + saveBio()
- **Frontend `users.html`** — สร้างหน้าใหม่ Users page (admin เห็นทั้งหมด, member เห็นตัวเอง)
- **Integration Testing** — ทดสอบ Register flow, profile sync, screenshots ครบ 14 รูป

---

## งานที่ดำเนินการร่วมกัน
- ออกแบบ Database-per-Service architecture และ service communication flow
- ทดสอบ integration ระหว่าง auth-service → user-service (create-profile call)
- ทดสอบระบบแบบ end-to-end (`docker compose up --build`)
- จัดทำ README และ screenshots ครบ 14 รูป

---

## เหตุผลในการแบ่งงาน
แบ่งตาม **service boundary** เช่นเดิมจาก Set 1 โดย
- สมาชิกคนที่ 1 รับผิดชอบ **authentication layer และ user management** (auth + user + infrastructure)
- สมาชิกคนที่ 2 รับผิดชอบ **business logic และ presentation layer** (task + log + frontend)

การแบ่งแบบนี้ทำให้แต่ละคน commit ได้อย่างชัดเจน ไม่ทับกัน และสามารถ merge เข้า main branch ได้เมื่อทดสอบแล้ว

---

## สรุปการเชื่อมโยงงานของสมาชิก

```
นายตรัยรัตน์ (auth-service + user-service + db/auth + db/user + nginx + docker-compose)
        │
        │ Register สำเร็จ → auth-service เรียก user-service/internal/create-profile
        │ JWT_SECRET เดียวกัน → user-service และ task-service verify token ได้
        │ nginx.conf เพิ่ม /api/users/ route
        ▼
นางสาวอภิรญา (task-service + log-service + db/task + db/log + frontend)
        │
        │ task-service เก็บ req.user.username ลงใน tasks.username โดยตรง
        │ log-service รับ event REGISTER_SUCCESS จาก auth-service
        │ frontend index.html เรียก /api/auth/register และ /api/users/me
        ▼
    ระบบ Set 2 ที่สมบูรณ์
```

**จุดที่ต้องประสานงาน:**
- `JWT_SECRET` ต้องตรงกันทุก service (อยู่ใน `.env`)
- รูปแบบ payload ของ `logEvent()` ต้องตรงกับ schema ของ log-db
- `/api/users/internal/create-profile` ต้องรับ `{user_id, username, email, role}` ตามที่ auth-service ส่งมา
- `req.user.username` ใน JWT payload ต้องมีค่า (auth-service ต้องใส่ `username` ใน `generateToken`)

---

## แนวทาง Git Commit

### นายตรัยรัตน์ (ตัวอย่าง commit message)
```
feat(auth): add POST /api/auth/register route with bcrypt hash
feat(user-service): create user-service with profile CRUD
feat(db): add auth/init.sql and user/init.sql for database-per-service
feat(nginx): add /api/users/ proxy route and regex rate-limit
feat(docker): add auth-db, user-db, user-service to docker-compose
```

### นางสาวอภิรญา (ตัวอย่าง commit message)
```
feat(task): migrate task-service to use separate task-db
feat(task): store username directly in tasks table (remove JOIN)
feat(log): migrate log-service to use separate log-db
feat(frontend): add Register tab and doRegister() function
feat(frontend): add users.html with admin/member role view
feat(frontend): add bio edit and saveBio() to profile page
```
