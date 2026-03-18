-- user_db — user profiles (user-service)
CREATE TABLE IF NOT EXISTS profiles (
  id         SERIAL       PRIMARY KEY,
  user_id    INTEGER      UNIQUE NOT NULL,  -- ตรงกับ id ใน auth_db
  username   VARCHAR(50)  NOT NULL,
  email      VARCHAR(100) NOT NULL,
  role       VARCHAR(20)  DEFAULT 'member',
  bio        TEXT,
  created_at TIMESTAMP    DEFAULT NOW(),
  updated_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Seed profiles ตรงกับ seed users ใน auth_db
INSERT INTO profiles (user_id, username, email, role, bio) VALUES
  (1, 'alice', 'alice@lab.local', 'member', 'Seed user — alice'),
  (2, 'bob',   'bob@lab.local',   'member', 'Seed user — bob'),
  (3, 'admin', 'admin@lab.local', 'admin',  'System administrator')
ON CONFLICT (user_id) DO NOTHING;
