CREATE TABLE IF NOT EXISTS widget_layout (
  username   TEXT NOT NULL,
  widget_id  TEXT NOT NULL,
  col_start  INTEGER NOT NULL,
  col_span   INTEGER NOT NULL,
  row_start  INTEGER NOT NULL,
  row_span   INTEGER NOT NULL,
  open       INTEGER NOT NULL DEFAULT 1,
  config     TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (username, widget_id)
);
