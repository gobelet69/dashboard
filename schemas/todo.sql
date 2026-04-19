CREATE TABLE IF NOT EXISTS boards (
  id         TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_boards_user ON boards(username);

CREATE TABLE IF NOT EXISTS lists (
  id       TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  username TEXT NOT NULL,
  name     TEXT NOT NULL,
  color    TEXT,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lists_board ON lists(board_id);

CREATE TABLE IF NOT EXISTS cards (
  id          TEXT PRIMARY KEY,
  list_id     TEXT NOT NULL,
  board_id    TEXT NOT NULL,
  username    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cards_list ON cards(list_id);
CREATE INDEX IF NOT EXISTS idx_cards_board ON cards(board_id);

CREATE TABLE IF NOT EXISTS blocus_boards (
  id         TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  name       TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blocus_boards_user ON blocus_boards(username);

CREATE TABLE IF NOT EXISTS blocus_courses (
  id        TEXT PRIMARY KEY,
  blocus_id TEXT NOT NULL,
  name      TEXT NOT NULL,
  color     TEXT,
  position  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_blocus_courses_board ON blocus_courses(blocus_id);

CREATE TABLE IF NOT EXISTS blocus_course_sections (
  id        TEXT PRIMARY KEY,
  blocus_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  name      TEXT NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_blocus_sections_course ON blocus_course_sections(course_id);

CREATE TABLE IF NOT EXISTS blocus_slots (
  id         TEXT PRIMARY KEY,
  blocus_id  TEXT NOT NULL,
  day        TEXT NOT NULL,
  period     TEXT NOT NULL,
  course_id  TEXT,
  section_id TEXT,
  is_exam    INTEGER NOT NULL DEFAULT 0,
  exam_note  TEXT
);
CREATE INDEX IF NOT EXISTS idx_blocus_slots_board ON blocus_slots(blocus_id);
