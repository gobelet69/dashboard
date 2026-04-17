# Dashboard — Design Spec

**Date:** 2026-04-17
**Status:** Approved for implementation

## Goal

A single page at `111iridescence.org/dashboard` that embeds four mini-apps (vault, todolist, habits, courses) as resizable/closable tiled panels. Edits in the dashboard write directly to the existing D1 databases so the main apps stay in sync.

## Architecture

New Cloudflare Worker `dashboard` at route `111iridescence.org/dashboard*`.

### Bindings (wrangler.jsonc)

- `AUTH_DB` — D1 `global-auth` (session check)
- `TODO_DB` — D1 `todolist-data`
- `HABITS_DB` — D1 `habits-data`
- `COURSES_DB` — D1 `courses-data`
- `VAULT_DB` — D1 `vault-data` (file metadata)
- `VAULT_R2` — R2 bucket used by vault (file listing)
- `DASHBOARD_DB` — D1 `dashboard-data` (new, for layout persistence)

Binding names must match the IDs currently used by each app's own `wrangler.jsonc` — pull the `database_id` values from each existing repo.

### Auth

Same pattern as the other apps:
1. Read `sess=` cookie.
2. `SELECT * FROM sessions WHERE id = ? AND expires > ?` on `AUTH_DB`.
3. If no user, redirect to `/auth/login?redirect=/dashboard`.

## Layout engine

CSS Grid, 12 columns × auto rows. Each widget occupies a rectangle defined by `col_start`, `col_span`, `row_start`, `row_span`.

- **Resize**: drag the bottom-right corner handle; snap to grid cells; `col_span` min 3, `row_span` min 2.
- **Close**: `×` button in widget header bar; sets `open = 0`. Closed widgets appear as chips in a "Closed widgets" toolbar at the top of the dashboard, click to re-open.
- **No overlap / no drag-move**: simple reflow — widgets stack in order of `row_start, col_start`. Resizing only changes spans; moving is out of scope for v1 (kept minimal per YAGNI).
- Debounced save (400ms) to `POST /dashboard/api/layout` on resize/close/open.

## Persistence

New D1 `dashboard-data` with one table:

```sql
CREATE TABLE IF NOT EXISTS widget_layout (
  username   TEXT NOT NULL,
  widget_id  TEXT NOT NULL,  -- 'vault' | 'todolist' | 'habits' | 'courses'
  col_start  INTEGER NOT NULL,
  col_span   INTEGER NOT NULL,
  row_start  INTEGER NOT NULL,
  row_span   INTEGER NOT NULL,
  open       INTEGER NOT NULL DEFAULT 1,
  config     TEXT DEFAULT '{}',  -- JSON, e.g. selected board id for todo, path for vault
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (username, widget_id)
);
```

On first visit the worker seeds a default layout:

- Vault: `col_start=1, col_span=6, row_start=1, row_span=3`
- Todolist: `col_start=7, col_span=6, row_start=1, row_span=3`
- Habits: `col_start=1, col_span=7, row_start=4, row_span=2`
- Courses: `col_start=8, col_span=5, row_start=4, row_span=2`

## Widgets

All widget data is fetched on initial page render server-side (one render pass, no hydration). Interactions hit dashboard API endpoints that proxy directly to the underlying D1s.

### 1. Vault (mini file browser)

- Current folder path kept in `config.path` (persisted).
- Renders folder/file rows from `VAULT_R2` listing (using prefix = current path).
- Click folder: update `config.path`, re-render widget via `GET /dashboard/api/vault?path=...`.
- Click file: open in main vault (`<a target="_top" href="/vault/f/<key>">`).
- Breadcrumb at top of widget for navigation.
- Read-only — no upload/delete inside the mini widget.

### 2. Todolist (board picker → kanban)

- `config.board_id` persisted.
- Header: `<select>` of all user boards (`SELECT id, name FROM boards WHERE username = ?`).
- Body: lists as columns, cards inside each, ordered by `position`.
- Drag a card between lists → `POST /dashboard/api/todo/card/move` → updates `cards.list_id` + `cards.position` exactly like the main app does.
- Add card inline at bottom of each list.
- Delete card via × button.

### 3. Habits (7-day week grid)

- Rows = habits (ordered by `created_at ASC`), columns = last 7 days (today right-most).
- Each cell: checkbox reflecting `habit_logs.completed` for that `(habit_id, date)`.
- Click cell → `POST /dashboard/api/habits/toggle` → writes to `habit_logs` table.
- Streak counter next to habit name (consecutive completed days ending today).

### 4. Courses (sections with tile grid)

- Grouped by `sections` (filtered to `hidden = 0`), ordered by `position`.
- Under each section, tiles as `<a href={tile.url} target="_blank">{emoji} {name}</a>`, laid out as a flex/grid of cards.
- Read-only — manage sections/tiles in the main `/courses` app.

## API surface

All routes under `/dashboard/*`. All require session.

| Route | Method | Purpose |
|---|---|---|
| `/dashboard` | GET | Full dashboard HTML (server-rendered with all widgets) |
| `/dashboard/api/layout` | POST | Save `widget_layout` row (body: `{widget_id, col_start, col_span, row_start, row_span, open, config}`) |
| `/dashboard/api/vault?path=...` | GET | Return rendered HTML fragment for vault widget at given path |
| `/dashboard/api/todo/card/create` | POST | Insert card (form: `listId`, `title`) |
| `/dashboard/api/todo/card/move` | POST | Move card (form: `cardId`, `newListId`, `newPosition`) |
| `/dashboard/api/todo/card/delete` | POST | Delete card |
| `/dashboard/api/todo/board` | GET | Return kanban fragment for `?boardId=...` |
| `/dashboard/api/habits/toggle` | POST | Toggle `habit_logs` entry (form: `habitId`, `date`) |

Each write endpoint scopes by `username = user.username` and mirrors the parent app's own queries exactly.

## Styling

Reuse the shared system from the existing apps (habits-tracker's `CSS` block is canonical):

- Fonts: `DM Sans` (body), `JetBrains Mono` (code/numbers).
- Vars: `--bg:#0F1115; --surface:#1A1D24; --surface-hover:#20242C; --surface-soft:#151820; --text:#F1F5F9; --text-secondary:#94A3B8; --text-muted:#64748B; --border:#262A33;`.
- Accent purple `#bb86fc` for interactive elements, matching todolist.
- Widget card: `background: var(--surface); border: 1px solid var(--border); border-radius: 12px;` with a header bar containing title + close button.

## File layout

```
dashboard/
├── worker.js        # all routes, HTML/CSS render, API endpoints
├── schema.sql       # widget_layout table
├── wrangler.jsonc   # bindings + route
└── README.md
```

Single-file worker to stay consistent with the other `/habits-tracker`, `/courses`, `/todolist` workers in this ecosystem.

## Out of scope (v1)

- Drag-to-move widgets (only resize + close/reopen).
- Widget-internal full-feature parity (vault upload, course section management, habit history charts, todo board create).
- Mobile-optimized layout (keep desktop-first; grid will wrap gracefully but not hand-tuned).
- Realtime sync across tabs (a refresh will pick up changes — dashboard writes already hit the live DBs).

## Testing

- Manual: open each widget, make an edit, verify it appears in the main app and vice-versa.
- Layout: close a widget, reload → still closed. Resize → same size on reload.
- Auth: unauthenticated request → 302 to `/auth/login`.
