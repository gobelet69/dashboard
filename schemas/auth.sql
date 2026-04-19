CREATE TABLE IF NOT EXISTS sessions (
  id       TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  expires  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
