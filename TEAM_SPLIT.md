# TEAM_SPLIT.md

## ข้อมูลกลุ่ม
- รายวิชา: ENGSE207 Software Architecture

## รายชื่อสมาชิก
- 67543210028-6  นายตรัยรัตน์  วงษ์สิทธิ์
- 67543210075-7  นางสาวอภิรญา  สายนาคำ

---

## การแบ่งงานหลัก

### นายตรัยรัตน์  วงษ์สิทธิ์ (67543210028-6)
| ไฟล์ / โฟลเดอร์ | หน้าที่ |
|---|---|
| `auth-service/` | Register, Login, Verify, Me + logActivity() |
| `nginx/` | nginx.conf — gateway, HTTPS, rate limiting |
| `docker-compose.yml` | database-per-service, network, volumes |
| `.env.example` | environment variables template |

### นางสาวอภิรญา  สายนาคำ (67543210075-7)
| ไฟล์ / โฟลเดอร์ | หน้าที่ |
|---|---|
| `activity-service/` | Event tracking — internal, list, stats |
| `task-service/` | CRUD Tasks + logActivity() ทุก action |
| `frontend/` | index.html, register.html, activity.html, config.js |
| `screenshots/` | รวบรวม screenshots ทุกใบ |

---

## งานที่ดำเนินการร่วมกัน
- ออกแบบ architecture และ event schema ของ Activity Service
- ทดสอบระบบ end-to-end ทั้ง local และ Railway
- จัดทำ README

---

## สรุปการเชื่อมโยงงาน
- Auth Service (นายตรัยรัตน์) ส่ง `user_login` และ `user_registered` → Activity Service (นางสาวอภิรญา)
- Task Service (นางสาวอภิรญา) ส่ง `task_created/updated/deleted` → Activity Service (นางสาวอภิรญา)
- Task Service verify JWT ด้วย `JWT_SECRET` ที่นายตรัยรัตน์กำหนดใน docker-compose.yml
- Frontend (นางสาวอภิรญา) เรียกทุก API ผ่าน Nginx ที่นายตรัยรัตน์ตั้งค่า route ไว้
