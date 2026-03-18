CREATE TABLE IF NOT EXISTS activities (
  id          SERIAL PRIMARY KEY,
  service     VARCHAR(50)  NOT NULL,
  event_type  VARCHAR(100) NOT NULL,
  user_id     INTEGER,
  entity_type VARCHAR(50),
  entity_id   INTEGER,
  metadata    JSONB,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_act_user_id    ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_act_event_type ON activities(event_type);
CREATE INDEX IF NOT EXISTS idx_act_service    ON activities(service);
CREATE INDEX IF NOT EXISTS idx_act_created_at ON activities(created_at DESC);
