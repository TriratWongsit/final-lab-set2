-- auth_db — users table (auth-service + user-service ต่างเก็บ users ของตัวเอง)
-- auth-service เก็บ credentials เท่านั้น
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL       PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  DEFAULT 'member',
  created_at    TIMESTAMP    DEFAULT NOW(),
  last_login    TIMESTAMP
);

-- Seed Users (bcrypt hash พร้อมใช้)
-- alice123 / bob456 / adminpass
INSERT INTO users (username, email, password_hash, role) VALUES
  ('alice', 'alice@lab.local',
   '$2b$10$PjnT4Aw1VHdFD89uFMsbtOunaa8XXNtp.8aGFlC4Rf2F1zAp3V.KC', 'member'),
  ('bob',   'bob@lab.local',
   '$2b$10$RdE50VVxFllAA71b/HJuPOIY8PQKujO4zWWTb0bJ3OsaeGNXTbSbu', 'member'),
  ('admin', 'admin@lab.local',
   '$2b$10$ZFSu9jujm16MjmDzk3fIYO36TyW7tNXJl3MGQuDkWBoiaiNJ2iFca', 'admin')
ON CONFLICT (username) DO NOTHING;
