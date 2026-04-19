# dashboard

Single-page tiled dashboard at `111iridescence.org/dashboard`. Widgets (vault file browser, todolist kanban, habits week grid, courses tiles) read/write the existing per-app D1s directly, so edits in the dashboard appear in the main apps immediately.

## Stack

- Cloudflare Worker, route `111iridescence.org/dashboard*`
- D1: AUTH_DB, TODO_DB, HABITS_DB, COURSES_DB, VAULT_DB, DASHBOARD_DB
- R2: VAULT_R2 (bucket `my-pdfs`)

## Deploy

```
npm install
npx wrangler deploy
```

Per-user layout lives in `dashboard-data.widget_layout` and is seeded on first visit.

## Schemas

Schemas for every D1 binding live under `schemas/`. Apply them with:

```
npx wrangler d1 execute global-auth --file=schemas/auth.sql
npx wrangler d1 execute dashboard   --file=schemas/dashboard.sql
npx wrangler d1 execute todolist    --file=schemas/todo.sql
npx wrangler d1 execute habits      --file=schemas/habits.sql
npx wrangler d1 execute courses     --file=schemas/courses.sql
```

Add `--local` for the local miniflare DB.
