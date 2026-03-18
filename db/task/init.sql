-- task_db — tasks table (task-service)
-- ไม่ต้อง JOIN กับ users table แล้ว — เก็บ username ใน tasks โดยตรง
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL       PRIMARY KEY,
  user_id     INTEGER      NOT NULL,
  username    VARCHAR(50)  NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  status      VARCHAR(20)  DEFAULT 'TODO'   CHECK (status IN ('TODO','IN_PROGRESS','DONE')),
  priority    VARCHAR(10)  DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Seed tasks
INSERT INTO tasks (user_id, username, title, description, status, priority) VALUES
  (1, 'alice', 'ออกแบบ UI หน้า Login',     'ใช้ Figma ออกแบบ mockup',       'TODO',        'high'),
  (1, 'alice', 'เขียน API สำหรับ Task CRUD', 'Express.js + PostgreSQL',        'IN_PROGRESS', 'high'),
  (2, 'bob',   'ทดสอบ JWT Authentication',   'ใช้ Postman ทดสอบทุก endpoint', 'TODO',        'medium')
ON CONFLICT DO NOTHING;
