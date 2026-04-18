CREATE TABLE IF NOT EXISTS widget_layout (
  instance_id TEXT PRIMARY KEY,
  username    TEXT NOT NULL,
  widget_type TEXT NOT NULL,
  col_start   INTEGER NOT NULL,
  col_span    INTEGER NOT NULL,
  row_start   INTEGER NOT NULL,
  row_span    INTEGER NOT NULL,
  open        INTEGER NOT NULL DEFAULT 1,
  config      TEXT NOT NULL DEFAULT '{}',
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_widget_layout_user ON widget_layout(username);
