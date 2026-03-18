CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  DEFAULT 'member',
  created_at    TIMESTAMP    DEFAULT NOW()
);

-- Seed users
-- สร้าง hash ด้วย: node -e "const b=require('bcryptjs'); console.log(b.hashSync('alice123',10))"
INSERT INTO users (username, email, password_hash, role) VALUES
  ('alice', 'alice@lab.local', 'REPLACE_BCRYPT_alice123',  'member'),
  ('bob',   'bob@lab.local',   'REPLACE_BCRYPT_bob456',    'member'),
  ('admin', 'admin@lab.local', 'REPLACE_BCRYPT_adminpass', 'admin')
ON CONFLICT DO NOTHING;
