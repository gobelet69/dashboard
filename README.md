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
