CREATE TABLE IF NOT EXISTS sections (
  id       TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  name     TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  hidden   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sections_user ON sections(username);

CREATE TABLE IF NOT EXISTS tiles (
  id         TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  username   TEXT NOT NULL,
  name       TEXT NOT NULL,
  emoji      TEXT,
  url        TEXT NOT NULL DEFAULT '#',
  position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tiles_user ON tiles(username);
CREATE INDEX IF NOT EXISTS idx_tiles_section ON tiles(section_id);
