CREATE TABLE IF NOT EXISTS habits (
  id         TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(username);

CREATE TABLE IF NOT EXISTS habit_logs (
  id        TEXT PRIMARY KEY,
  habit_id  TEXT NOT NULL,
  username  TEXT NOT NULL,
  date      TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON habit_logs(username);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, date);
