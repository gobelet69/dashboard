# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page dashboard at `111iridescence.org/dashboard` with 4 tiled, resizable, closable widgets (vault file browser, todolist kanban, habits week grid, courses tiles) that read/write the existing D1 databases directly.

**Architecture:** New Cloudflare Worker (`dashboard`), server-rendered HTML, `fetch`-based API for layout + widget writes. CSS Grid for the tile engine. Per-user layout in a new D1 `dashboard-data`. All widget data comes from the existing app D1s (same bindings used by their workers).

**Tech Stack:** Cloudflare Workers, D1 (SQLite), R2, vanilla JS (no framework, consistent with sibling workers), wrangler.

**Repo path:** `/Users/theodeville/Repos/dashboard/`

**Reference spec:** `docs/superpowers/specs/2026-04-17-dashboard-design.md`

**Convention note:** The existing apps do not ship tests. This plan follows the same pattern — verification is manual via `curl` / browser. Do **not** introduce a test framework unless the user asks.

---

## File Structure

```
dashboard/
├── worker.js         # entire worker: routes, HTML, CSS, API
├── schema.sql        # dashboard-data: widget_layout table
├── wrangler.jsonc    # 6 D1 bindings + R2 + route
├── package.json      # wrangler dev dep only
└── README.md
```

Single-file worker, same style as `habits-tracker/worker.js` and `courses/worker.js`.

---

## Database IDs (pre-resolved)

| Binding | DB name | ID |
|---|---|---|
| `AUTH_DB` | `global-auth` | `ba736065-1d46-450b-a083-efc8ba935939` |
| `TODO_DB` | `todolist` | `c8e246d5-91c1-4f3b-92d2-a18eef69831f` |
| `HABITS_DB` | `habits` | `89ac9757-7e16-472d-8cdd-025a5946aa30` |
| `COURSES_DB` | `courses` | `8fa40436-d869-42b1-ade6-d98d0669f321` |
| `VAULT_DB` | `pdfs` | `c2e90b66-e4bf-43b7-859f-a452650f94ec` |
| `VAULT_R2` | `my-pdfs` (R2) | — |
| `DASHBOARD_DB` | `dashboard` | **(create in Task 1)** |

---

## Task 1: Scaffold the worker project

**Files:**
- Create: `package.json`
- Create: `wrangler.jsonc`
- Create: `schema.sql`
- Create: `worker.js`
- Create: `README.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "dashboard",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^3.78.0"
  }
}
```

- [ ] **Step 2: Create the `dashboard` D1 database**

Run:
```bash
cd /Users/theodeville/Repos/dashboard
npx wrangler d1 create dashboard
```
Expected: prints a new `database_id` UUID. **Copy this UUID** — paste it into `wrangler.jsonc` in Step 3.

- [ ] **Step 3: Create `wrangler.jsonc`**

Replace `<DASHBOARD_DB_ID>` with the UUID printed by Step 2.

```jsonc
{
  "name": "dashboard",
  "main": "worker.js",
  "compatibility_date": "2024-09-23",
  "routes": [
    { "pattern": "111iridescence.org/dashboard*", "zone_name": "111iridescence.org" }
  ],
  "r2_buckets": [
    { "binding": "VAULT_R2", "bucket_name": "my-pdfs" }
  ],
  "d1_databases": [
    { "binding": "AUTH_DB",      "database_name": "global-auth", "database_id": "ba736065-1d46-450b-a083-efc8ba935939" },
    { "binding": "TODO_DB",      "database_name": "todolist",    "database_id": "c8e246d5-91c1-4f3b-92d2-a18eef69831f" },
    { "binding": "HABITS_DB",    "database_name": "habits",      "database_id": "89ac9757-7e16-472d-8cdd-025a5946aa30" },
    { "binding": "COURSES_DB",   "database_name": "courses",     "database_id": "8fa40436-d869-42b1-ade6-d98d0669f321" },
    { "binding": "VAULT_DB",     "database_name": "pdfs",        "database_id": "c2e90b66-e4bf-43b7-859f-a452650f94ec" },
    { "binding": "DASHBOARD_DB", "database_name": "dashboard",   "database_id": "<DASHBOARD_DB_ID>" }
  ]
}
```

- [ ] **Step 4: Create `schema.sql`**

```sql
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
```

- [ ] **Step 5: Apply schema to the new D1**

Run:
```bash
npx wrangler d1 execute dashboard --remote --file=schema.sql
```
Expected: `Executed X commands`.

- [ ] **Step 6: Create stub `worker.js`**

```js
export default {
  async fetch(req, env) {
    return new Response('dashboard: hello', { status: 200 });
  }
};
```

- [ ] **Step 7: Create `README.md`**

```markdown
# dashboard

Tiled dashboard at `111iridescence.org/dashboard` that embeds vault, todolist, habits and courses widgets. Reads/writes the existing per-app D1s directly.

Deploy: `npm run deploy`
```

- [ ] **Step 8: Deploy and sanity-check**

```bash
npm install
npx wrangler deploy
curl -sI https://111iridescence.org/dashboard
```
Expected: `HTTP/2 200` and body `dashboard: hello` (via `curl https://111iridescence.org/dashboard`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold dashboard worker with DB bindings"
```

---

## Task 2: Auth + default-layout seeding

**Files:**
- Modify: `worker.js`

- [ ] **Step 1: Add session check and layout load**

Replace the stub in `worker.js` with:

```js
const DEFAULT_LAYOUT = [
  { widget_id: 'vault',    col_start: 1, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"path":""}' },
  { widget_id: 'todolist', col_start: 7, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"board_id":null}' },
  { widget_id: 'habits',   col_start: 1, col_span: 7, row_start: 4, row_span: 2, open: 1, config: '{}' },
  { widget_id: 'courses',  col_start: 8, col_span: 5, row_start: 4, row_span: 2, open: 1, config: '{}' },
];

async function getUser(req, env) {
  const cookie = req.headers.get('Cookie') || '';
  const sess = cookie.split(';').find(c => c.trim().startsWith('sess='))?.split('=')[1];
  if (!sess) return null;
  return await env.AUTH_DB.prepare('SELECT * FROM sessions WHERE id = ? AND expires > ?')
    .bind(sess, Date.now()).first();
}

async function loadLayout(env, username) {
  const { results } = await env.DASHBOARD_DB.prepare(
    'SELECT * FROM widget_layout WHERE username = ?'
  ).bind(username).all();
  if (results.length > 0) return results;
  // Seed defaults
  const now = Date.now();
  for (const w of DEFAULT_LAYOUT) {
    await env.DASHBOARD_DB.prepare(
      'INSERT INTO widget_layout (username, widget_id, col_start, col_span, row_start, row_span, open, config, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(username, w.widget_id, w.col_start, w.col_span, w.row_start, w.row_span, w.open, w.config, now).run();
  }
  return DEFAULT_LAYOUT.map(w => ({ ...w, username, updated_at: now }));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    let path = url.pathname;
    if (path.startsWith('/dashboard')) path = path.substring(10) || '/';

    const user = await getUser(req, env);
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': `/auth/login?redirect=${encodeURIComponent(url.pathname)}` }
      });
    }

    if (path === '/' || path === '') {
      const layout = await loadLayout(env, user.username);
      return new Response(JSON.stringify({ user: user.username, layout }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('404', { status: 404 });
  }
};
```

- [ ] **Step 2: Deploy and verify**

```bash
npx wrangler deploy
```
Browse `https://111iridescence.org/dashboard` in your logged-in browser.

Expected: JSON with `user` and 4-row `layout` array. Reload → same (no duplicate seeding).

Verify seeding persisted:
```bash
npx wrangler d1 execute dashboard --remote --command "SELECT widget_id, col_start, col_span FROM widget_layout"
```
Expected: 4 rows.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: auth check + default layout seeding"
```

---

## Task 3: Layout save API

**Files:**
- Modify: `worker.js`

- [ ] **Step 1: Add the API route**

Insert this handler **before** the `if (path === '/' || path === '')` block:

```js
if (path === '/api/layout' && req.method === 'POST') {
  const body = await req.json();
  const { widget_id, col_start, col_span, row_start, row_span, open, config } = body;
  if (!['vault', 'todolist', 'habits', 'courses'].includes(widget_id)) {
    return new Response('bad widget', { status: 400 });
  }
  await env.DASHBOARD_DB.prepare(
    `UPDATE widget_layout
     SET col_start = ?, col_span = ?, row_start = ?, row_span = ?, open = ?, config = ?, updated_at = ?
     WHERE username = ? AND widget_id = ?`
  ).bind(
    col_start|0, col_span|0, row_start|0, row_span|0, open ? 1 : 0,
    typeof config === 'string' ? config : JSON.stringify(config || {}),
    Date.now(), user.username, widget_id
  ).run();
  return new Response('OK');
}
```

- [ ] **Step 2: Deploy and verify**

```bash
npx wrangler deploy
```
From your logged-in browser dev tools:
```js
fetch('/dashboard/api/layout', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({widget_id:'vault', col_start:2, col_span:4, row_start:1, row_span:3, open:1, config:'{"path":""}'})
}).then(r => r.text())
```
Expected: `OK`. Then reload `/dashboard` → the `vault` row shows `col_start:2, col_span:4`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: layout save API"
```

---

## Task 4: HTML shell + CSS + grid engine

**Files:**
- Modify: `worker.js`

- [ ] **Step 1: Add the CSS block and layout renderer**

Add these constants at module top (after `DEFAULT_LAYOUT`):

```js
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
:root{
  --bg:#0F1115;--surface:#1A1D24;--surface-hover:#20242C;--surface-soft:#151820;
  --text:#F1F5F9;--text-secondary:#94A3B8;--text-muted:#64748B;--border:#262A33;
  --accent:#bb86fc;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;padding:16px}
a{color:var(--accent);text-decoration:none}
button{font-family:inherit;cursor:pointer;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 10px}
button:hover{background:var(--surface-hover)}
.topbar{display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.topbar h1{font-size:16px;font-weight:600;color:var(--text-secondary)}
.closed-chips{display:flex;gap:6px}
.chip{background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;cursor:pointer}
.chip:hover{background:var(--surface-hover)}
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px;grid-auto-rows:80px}
.widget{background:var(--surface);border:1px solid var(--border);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;position:relative;min-height:0}
.widget-header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border);background:var(--surface-soft);font-size:13px;font-weight:600}
.widget-header .title{display:flex;gap:8px;align-items:center}
.widget-header .close{background:transparent;border:none;color:var(--text-muted);font-size:16px;line-height:1;padding:2px 6px}
.widget-header .close:hover{color:var(--text)}
.widget-body{flex:1;overflow:auto;padding:12px;font-size:13px}
.resize-handle{position:absolute;right:2px;bottom:2px;width:14px;height:14px;cursor:se-resize;opacity:.5;background:
  linear-gradient(135deg,transparent 0 50%,var(--text-muted) 50% 60%,transparent 60% 70%,var(--text-muted) 70% 80%,transparent 80%)}
.muted{color:var(--text-muted)}
input[type=text]{background:var(--surface-soft);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:6px 8px;font:inherit;width:100%}
`;

const WIDGET_TITLES = { vault: '🗄️ Vault', todolist: '📋 Todolist', habits: '📈 Habits', courses: '🎓 Courses' };

function widgetStyle(w) {
  return `grid-column:${w.col_start}/span ${w.col_span};grid-row:${w.row_start}/span ${w.row_span}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
```

- [ ] **Step 2: Add the main page renderer**

Add this function below the CSS block:

```js
function renderPage(user, layout, widgetBodies) {
  const byId = Object.fromEntries(layout.map(w => [w.widget_id, w]));
  const open = layout.filter(w => w.open);
  const closed = layout.filter(w => !w.open);

  const chips = closed.map(w =>
    `<button class="chip" data-reopen="${w.widget_id}">+ ${esc(WIDGET_TITLES[w.widget_id])}</button>`
  ).join('');

  const widgets = open.map(w => `
    <section class="widget" data-widget="${w.widget_id}" style="${widgetStyle(w)}">
      <div class="widget-header">
        <div class="title">${WIDGET_TITLES[w.widget_id]}</div>
        <button class="close" data-close="${w.widget_id}" title="Close">×</button>
      </div>
      <div class="widget-body" data-body="${w.widget_id}">${widgetBodies[w.widget_id] || ''}</div>
      <div class="resize-handle" data-resize="${w.widget_id}"></div>
    </section>
  `).join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Dashboard — 111iridescence</title>
<style>${CSS}</style>
</head><body>
<div class="topbar">
  <h1>Dashboard · ${esc(user.username)}</h1>
  <div class="closed-chips">${chips}</div>
</div>
<div class="grid" id="grid">${widgets}</div>
<script>${CLIENT_JS}</script>
</body></html>`;
}
```

- [ ] **Step 3: Add the client JS**

Add this constant at module top:

```js
const CLIENT_JS = `
const grid = document.getElementById('grid');

function widgetRect(el){
  const s = el.style;
  const col = s.gridColumn.match(/(\\d+) ?\\/ ?span ?(\\d+)/);
  const row = s.gridRow.match(/(\\d+) ?\\/ ?span ?(\\d+)/);
  return { col_start:+col[1], col_span:+col[2], row_start:+row[1], row_span:+row[2] };
}
function setRect(el, r){
  el.style.gridColumn = r.col_start + ' / span ' + r.col_span;
  el.style.gridRow = r.row_start + ' / span ' + r.row_span;
}

let saveTimer;
function save(widget_id, patch){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const el = document.querySelector('[data-widget="'+widget_id+'"]');
    const r = el ? widgetRect(el) : { col_start:1, col_span:6, row_start:1, row_span:2 };
    const body = Object.assign({ widget_id, open:1, config:'{}' }, r, patch);
    await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  }, 300);
}

// Close
document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]');
  if (c) {
    const id = c.dataset.close;
    save(id, { open:0 });
    setTimeout(() => location.reload(), 350);
  }
  const r = e.target.closest('[data-reopen]');
  if (r) {
    const id = r.dataset.reopen;
    // Find max row_start+row_span in current layout to append at bottom
    const widgets = [...document.querySelectorAll('.widget')];
    let maxRow = 1;
    for (const w of widgets){ const rr = widgetRect(w); maxRow = Math.max(maxRow, rr.row_start + rr.row_span); }
    fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ widget_id:id, col_start:1, col_span:6, row_start:maxRow, row_span:3, open:1, config:'{}' })
    }).then(() => location.reload());
  }
});

// Resize
let resizing = null;
document.addEventListener('mousedown', e => {
  const h = e.target.closest('[data-resize]');
  if (!h) return;
  e.preventDefault();
  const el = h.closest('.widget');
  const rect = el.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const colW = (gridRect.width - (11 * 12)) / 12; // 12 cols with 12px gaps
  const rowH = 80 + 12;
  resizing = { el, id: h.dataset.resize, startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height, colW, rowH, start: widgetRect(el) };
});
document.addEventListener('mousemove', e => {
  if (!resizing) return;
  const dx = e.clientX - resizing.startX;
  const dy = e.clientY - resizing.startY;
  const colSpan = Math.max(3, Math.min(12 - resizing.start.col_start + 1, Math.round((resizing.startW + dx) / resizing.colW)));
  const rowSpan = Math.max(2, Math.round((resizing.startH + dy) / resizing.rowH));
  setRect(resizing.el, { ...resizing.start, col_span: colSpan, row_span: rowSpan });
});
document.addEventListener('mouseup', () => {
  if (!resizing) return;
  const r = widgetRect(resizing.el);
  save(resizing.id, r);
  resizing = null;
});
`;
```

- [ ] **Step 4: Wire the renderer into `fetch`**

Replace the handler for the root path (`if (path === '/' || path === '')`) with:

```js
if (path === '/' || path === '') {
  const layout = await loadLayout(env, user.username);
  const widgetBodies = {
    vault: '<div class="muted">vault widget pending…</div>',
    todolist: '<div class="muted">todolist widget pending…</div>',
    habits: '<div class="muted">habits widget pending…</div>',
    courses: '<div class="muted">courses widget pending…</div>',
  };
  return new Response(renderPage(user, layout, widgetBodies), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
```

- [ ] **Step 5: Deploy and verify**

```bash
npx wrangler deploy
```
Browse `/dashboard`. Expected: 4 widget cards on a 12-col grid with placeholder bodies. Close a widget → chip appears. Click chip → widget returns. Drag the bottom-right corner → span changes; after mouseup, reload preserves the size.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: HTML shell + grid engine with resize/close"
```

---

## Task 5: Vault widget (file browser)

**Files:**
- Modify: `worker.js`

Vault's existing app stores files in R2 under flat keys. Browse by prefix. Check the existing worker (`/Users/theodeville/Repos/vault/src/worker.js`) for the exact listing approach if in doubt — the code below uses standard R2 `list` with `prefix` + `delimiter`.

- [ ] **Step 1: Add vault render helper**

Add above `renderPage`:

```js
async function renderVault(env, username, configJson) {
  let path = '';
  try { path = JSON.parse(configJson || '{}').path || ''; } catch {}
  const prefix = path ? (path.endsWith('/') ? path : path + '/') : '';
  const list = await env.VAULT_R2.list({ prefix, delimiter: '/', limit: 200 });

  const folders = (list.delimitedPrefixes || []).map(p => {
    const name = p.slice(prefix.length).replace(/\\/$/, '');
    return { name, key: p };
  });
  const files = (list.objects || []).map(o => ({
    name: o.key.slice(prefix.length),
    key: o.key,
    size: o.size,
  })).filter(f => f.name); // skip zero-length "folder marker" entries

  const crumbs = [];
  crumbs.push(\`<a href="#" data-navvault="">root</a>\`);
  let acc = '';
  for (const part of path.split('/').filter(Boolean)) {
    acc += part + '/';
    crumbs.push(\` / <a href="#" data-navvault="\${esc(acc)}">\${esc(part)}</a>\`);
  }

  const folderRows = folders.map(f =>
    \`<div class="row folder" data-navvault="\${esc(f.key)}">📁 \${esc(f.name)}</div>\`
  ).join('');
  const fileRows = files.map(f =>
    \`<a class="row file" target="_top" href="/vault/file/\${encodeURIComponent(f.key)}">📄 \${esc(f.name)}</a>\`
  ).join('');

  return \`
  <div class="vault">
    <div class="crumbs">\${crumbs.join('')}</div>
    <div class="rows">\${folderRows}\${fileRows || (folders.length?'':'<div class="muted">empty</div>')}</div>
  </div>\`;
}
```

*Note: the JS template literal above uses escaped backticks `\\\`` because it lives inside a `.md` code fence — when copying into `worker.js`, use real backticks.*

- [ ] **Step 2: Extend CSS**

Append to the `CSS` template:

```
.vault .crumbs{margin-bottom:8px;font-size:12px;color:var(--text-secondary)}
.vault .row{display:block;padding:6px 8px;border-radius:6px;cursor:pointer;color:var(--text)}
.vault .row:hover{background:var(--surface-hover)}
.vault .row.file{color:var(--accent)}
```

- [ ] **Step 3: Extend the client JS — vault navigation**

Append inside the `CLIENT_JS` string, at the end:

```js
document.addEventListener('click', async e => {
  const n = e.target.closest('[data-navvault]');
  if (!n) return;
  e.preventDefault();
  const newPath = n.dataset.navvault;
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ widget_id:'vault', ...widgetRect(document.querySelector('[data-widget=vault]')), open:1, config: JSON.stringify({ path:newPath }) })
  });
  const r = await fetch('/dashboard/api/vault?path=' + encodeURIComponent(newPath));
  document.querySelector('[data-body=vault]').innerHTML = await r.text();
});
```

- [ ] **Step 4: Add the vault API route and wire body into renderPage**

Add this route handler alongside the other `if (path === '/api/...')` blocks:

```js
if (path === '/api/vault' && req.method === 'GET') {
  const p = url.searchParams.get('path') || '';
  return new Response(await renderVault(env, user.username, JSON.stringify({ path: p })), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
```

Then in the root handler, replace the vault placeholder:

```js
const vaultLayout = layout.find(w => w.widget_id === 'vault');
const widgetBodies = {
  vault: vaultLayout.open ? await renderVault(env, user.username, vaultLayout.config) : '',
  todolist: '<div class="muted">todolist widget pending…</div>',
  habits: '<div class="muted">habits widget pending…</div>',
  courses: '<div class="muted">courses widget pending…</div>',
};
```

- [ ] **Step 5: Deploy and verify**

```bash
npx wrangler deploy
```
Browse `/dashboard`. Expected: vault widget shows folders + files at root. Click a folder → widget body updates to that folder's contents, breadcrumb updates. Reload → stays in the same folder (config persisted).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: vault mini browser widget"
```

---

## Task 6: Todolist widget (board picker + kanban)

**Files:**
- Modify: `worker.js`

Mirrors the main `/todo` worker's queries exactly. Reference: `/Users/theodeville/Repos/todolist/worker.js`.

- [ ] **Step 1: Add todolist render helper**

Add above `renderPage`:

```js
async function renderTodo(env, username, configJson) {
  let boardId = null;
  try { boardId = JSON.parse(configJson || '{}').board_id; } catch {}
  const { results: boards } = await env.TODO_DB.prepare(
    'SELECT id, name FROM boards WHERE username = ? ORDER BY created_at ASC'
  ).bind(username).all();

  if (!boards.length) {
    return '<div class="muted">No boards yet. Create one in <a target="_top" href="/todo">the main app</a>.</div>';
  }
  if (!boardId || !boards.find(b => b.id === boardId)) boardId = boards[0].id;

  const { results: lists } = await env.TODO_DB.prepare(
    'SELECT * FROM lists WHERE board_id = ? ORDER BY position ASC'
  ).bind(boardId).all();
  const { results: cards } = await env.TODO_DB.prepare(
    'SELECT * FROM cards WHERE board_id = ? ORDER BY position ASC'
  ).bind(boardId).all();

  const select = `<select data-todo-board>${
    boards.map(b => `<option value="${esc(b.id)}" ${b.id===boardId?'selected':''}>${esc(b.name)}</option>`).join('')
  }</select>`;

  const cols = lists.map(l => {
    const listCards = cards.filter(c => c.list_id === l.id);
    return `
    <div class="kanban-col" data-list="${esc(l.id)}">
      <div class="kanban-col-head" style="border-top-color:${esc(l.color||'#bb86fc')}">${esc(l.name)}</div>
      <div class="kanban-cards">
        ${listCards.map(c => `
          <div class="kanban-card" draggable="true" data-card="${esc(c.id)}" data-pos="${c.position}">
            <span>${esc(c.title)}</span>
            <button class="delcard" data-delcard="${esc(c.id)}" title="Delete">×</button>
          </div>`).join('')}
      </div>
      <form class="addcard" data-addcard="${esc(l.id)}">
        <input type="text" name="title" placeholder="+ add card" required>
      </form>
    </div>`;
  }).join('');

  return `
  <div class="todo">
    <div class="todo-bar">${select}</div>
    <div class="kanban">${cols || '<div class="muted">No lists in this board.</div>'}</div>
  </div>`;
}
```

- [ ] **Step 2: Extend CSS**

Append to `CSS`:

```
.todo .todo-bar{margin-bottom:8px}
.todo select{background:var(--surface-soft);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;font:inherit}
.todo .kanban{display:flex;gap:8px;overflow-x:auto;height:calc(100% - 30px);align-items:flex-start}
.kanban-col{background:var(--surface-soft);border:1px solid var(--border);border-radius:8px;padding:8px;min-width:200px;flex:0 0 200px;display:flex;flex-direction:column;gap:6px}
.kanban-col.drag-over{background:var(--surface-hover)}
.kanban-col-head{font-weight:600;font-size:12px;padding:4px 6px;border-top:3px solid var(--accent)}
.kanban-cards{display:flex;flex-direction:column;gap:4px;min-height:24px}
.kanban-card{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px;display:flex;justify-content:space-between;align-items:center;cursor:grab}
.kanban-card .delcard{background:transparent;border:none;color:var(--text-muted);padding:0 4px}
.kanban-card .delcard:hover{color:#f43f5e}
.addcard input{font-size:12px;padding:4px 6px}
```

- [ ] **Step 3: Add todolist API routes**

Add alongside other API routes:

```js
if (path === '/api/todo/card/create' && req.method === 'POST') {
  const fd = await req.formData();
  const listId = fd.get('listId'), title = fd.get('title');
  const list = await env.TODO_DB.prepare('SELECT board_id FROM lists WHERE id = ? AND username = ?').bind(listId, user.username).first();
  if (!list) return new Response('no list', { status: 404 });
  const { results: existing } = await env.TODO_DB.prepare('SELECT position FROM cards WHERE list_id = ? ORDER BY position DESC LIMIT 1').bind(listId).all();
  const pos = existing.length ? existing[0].position + 1 : 0;
  await env.TODO_DB.prepare(
    'INSERT INTO cards (id, list_id, board_id, username, title, description, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), listId, list.board_id, user.username, title, '', pos, Date.now()).run();
  return new Response('OK');
}

if (path === '/api/todo/card/move' && req.method === 'POST') {
  const fd = await req.formData();
  const cid = fd.get('cardId'), nlid = fd.get('newListId'), npos = parseInt(fd.get('newPosition'));
  const card = await env.TODO_DB.prepare('SELECT * FROM cards WHERE id = ? AND username = ?').bind(cid, user.username).first();
  if (!card) return new Response('no card', { status: 404 });
  const list = await env.TODO_DB.prepare('SELECT board_id FROM lists WHERE id = ?').bind(nlid).first();
  // Shift positions in the destination list
  await env.TODO_DB.prepare('UPDATE cards SET position = position + 1 WHERE list_id = ? AND position >= ?').bind(nlid, npos).run();
  await env.TODO_DB.prepare('UPDATE cards SET list_id = ?, board_id = ?, position = ? WHERE id = ?').bind(nlid, list.board_id, npos, cid).run();
  return new Response('OK');
}

if (path === '/api/todo/card/delete' && req.method === 'POST') {
  const fd = await req.formData();
  await env.TODO_DB.prepare('DELETE FROM cards WHERE id = ? AND username = ?').bind(fd.get('id'), user.username).run();
  return new Response('OK');
}

if (path === '/api/todo/board' && req.method === 'GET') {
  const bid = url.searchParams.get('boardId');
  return new Response(await renderTodo(env, user.username, JSON.stringify({ board_id: bid })), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
```

- [ ] **Step 4: Extend client JS**

Append to `CLIENT_JS`:

```js
// Board switcher
document.addEventListener('change', async e => {
  const s = e.target.closest('[data-todo-board]');
  if (!s) return;
  const bid = s.value;
  const el = document.querySelector('[data-widget=todolist]');
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ widget_id:'todolist', ...widgetRect(el), open:1, config: JSON.stringify({ board_id:bid }) })
  });
  const r = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  document.querySelector('[data-body=todolist]').innerHTML = await r.text();
});

// Add card
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-addcard]');
  if (!f) return;
  e.preventDefault();
  const fd = new FormData(f);
  fd.set('listId', f.dataset.addcard);
  await fetch('/dashboard/api/todo/card/create', { method:'POST', body: fd });
  const sel = document.querySelector('[data-todo-board]');
  const bid = sel ? sel.value : '';
  const r = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  document.querySelector('[data-body=todolist]').innerHTML = await r.text();
});

// Delete card
document.addEventListener('click', async e => {
  const d = e.target.closest('[data-delcard]');
  if (!d) return;
  e.preventDefault();
  const fd = new FormData(); fd.set('id', d.dataset.delcard);
  await fetch('/dashboard/api/todo/card/delete', { method:'POST', body: fd });
  d.closest('.kanban-card').remove();
});

// Drag & drop cards between lists
let draggingCard = null;
document.addEventListener('dragstart', e => {
  const c = e.target.closest('.kanban-card');
  if (!c) return;
  draggingCard = c;
  e.dataTransfer.effectAllowed = 'move';
});
document.addEventListener('dragover', e => {
  const col = e.target.closest('.kanban-col');
  if (!col || !draggingCard) return;
  e.preventDefault();
  col.classList.add('drag-over');
});
document.addEventListener('dragleave', e => {
  const col = e.target.closest('.kanban-col');
  if (col) col.classList.remove('drag-over');
});
document.addEventListener('drop', async e => {
  const col = e.target.closest('.kanban-col');
  if (!col || !draggingCard) return;
  e.preventDefault();
  col.classList.remove('drag-over');
  const newListId = col.dataset.list;
  const cardId = draggingCard.dataset.card;
  // position = index into destination column where dropped
  const cards = [...col.querySelectorAll('.kanban-card')];
  let npos = cards.length;
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { npos = i; break; }
  }
  const fd = new FormData();
  fd.set('cardId', cardId); fd.set('newListId', newListId); fd.set('newPosition', npos);
  await fetch('/dashboard/api/todo/card/move', { method:'POST', body: fd });
  const sel = document.querySelector('[data-todo-board]');
  const bid = sel ? sel.value : '';
  const r = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  document.querySelector('[data-body=todolist]').innerHTML = await r.text();
  draggingCard = null;
});
```

- [ ] **Step 5: Wire into renderPage root handler**

Update `widgetBodies`:

```js
const todoLayout = layout.find(w => w.widget_id === 'todolist');
// ...
todolist: todoLayout.open ? await renderTodo(env, user.username, todoLayout.config) : '',
```

- [ ] **Step 6: Deploy and verify**

```bash
npx wrangler deploy
```
Browse `/dashboard`. Expected: Todolist widget shows a board select and kanban columns. Add a card → appears in dashboard and in `/todo` main app (reload `/todo` in another tab to confirm). Drag card between columns → persists. Switch boards via select → widget reloads + stays on that board after page reload.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: todolist kanban widget"
```

---

## Task 7: Habits widget (7-day grid + streaks)

**Files:**
- Modify: `worker.js`

Schema reference (from `/Users/theodeville/Repos/habits-tracker/worker.js`): tables `habits(id, username, name, created_at)` and `habit_logs(id, habit_id, username, date, completed)` where `date` is `YYYY-MM-DD`.

- [ ] **Step 1: Add habits render helper**

Add above `renderPage`:

```js
function ymd(d) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function streakFor(habitId, logsByHabit) {
  const completed = new Set((logsByHabit[habitId] || []).map(l => l.date));
  let s = 0;
  const d = new Date();
  while (completed.has(ymd(d))) { s++; d.setDate(d.getDate() - 1); }
  return s;
}

async function renderHabits(env, username) {
  const { results: habits } = await env.HABITS_DB.prepare(
    'SELECT * FROM habits WHERE username = ? ORDER BY created_at ASC'
  ).bind(username).all();
  const { results: logs } = await env.HABITS_DB.prepare(
    'SELECT * FROM habit_logs WHERE username = ? AND completed = 1'
  ).bind(username).all();

  const logsByHabit = {};
  for (const l of logs) (logsByHabit[l.habit_id] = logsByHabit[l.habit_id] || []).push(l);

  if (!habits.length) {
    return '<div class="muted">No habits yet. Create one in <a target="_top" href="/habits">the main app</a>.</div>';
  }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ date: ymd(d), label: d.toLocaleDateString(undefined,{weekday:'short'}) });
  }

  const rows = habits.map(h => {
    const completed = new Set((logsByHabit[h.id] || []).map(l => l.date));
    const cells = days.map(d =>
      `<button class="hb-cell ${completed.has(d.date)?'done':''}" data-habit="${esc(h.id)}" data-date="${d.date}" title="${d.date}"></button>`
    ).join('');
    return `
      <tr>
        <td class="hb-name">${esc(h.name)}</td>
        <td class="hb-streak">🔥${streakFor(h.id, logsByHabit)}</td>
        <td class="hb-cells">${cells}</td>
      </tr>`;
  }).join('');

  const head = days.map(d => `<th>${esc(d.label)}</th>`).join('');

  return `
  <table class="habits">
    <thead><tr><th>Habit</th><th>Streak</th><th colspan="7" class="hb-head">${head ? '' : ''}</th></tr>
    <tr class="hb-days"><td></td><td></td>${days.map(d => `<td>${esc(d.label)}</td>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}
```

- [ ] **Step 2: Extend CSS**

Append:

```
.habits{width:100%;font-size:12px;border-collapse:collapse}
.habits th,.habits td{padding:4px 6px;text-align:left}
.habits .hb-days td{color:var(--text-muted);font-size:11px;text-align:center}
.habits .hb-name{font-weight:500}
.habits .hb-streak{color:var(--text-secondary)}
.habits .hb-cells{display:flex;gap:4px}
.hb-cell{width:22px;height:22px;border-radius:4px;border:1px solid var(--border);background:var(--surface-soft);padding:0;cursor:pointer}
.hb-cell.done{background:var(--accent);border-color:var(--accent)}
```

- [ ] **Step 3: Add toggle API**

```js
if (path === '/api/habits/toggle' && req.method === 'POST') {
  const fd = await req.formData();
  const hid = fd.get('habitId'), date = fd.get('date');
  const existing = await env.HABITS_DB.prepare(
    'SELECT * FROM habit_logs WHERE habit_id = ? AND date = ? AND username = ?'
  ).bind(hid, date, user.username).first();
  if (existing) {
    await env.HABITS_DB.prepare('UPDATE habit_logs SET completed = ? WHERE id = ?')
      .bind(existing.completed ? 0 : 1, existing.id).run();
  } else {
    await env.HABITS_DB.prepare(
      'INSERT INTO habit_logs (id, habit_id, username, date, completed) VALUES (?, ?, ?, ?, 1)'
    ).bind(crypto.randomUUID(), hid, user.username, date).run();
  }
  return new Response('OK');
}
```

- [ ] **Step 4: Extend client JS**

Append:

```js
document.addEventListener('click', async e => {
  const c = e.target.closest('.hb-cell');
  if (!c) return;
  const fd = new FormData();
  fd.set('habitId', c.dataset.habit); fd.set('date', c.dataset.date);
  await fetch('/dashboard/api/habits/toggle', { method:'POST', body: fd });
  c.classList.toggle('done');
});
```

- [ ] **Step 5: Wire into renderPage**

Update `widgetBodies`:

```js
const habitsLayout = layout.find(w => w.widget_id === 'habits');
// ...
habits: habitsLayout.open ? await renderHabits(env, user.username) : '',
```

- [ ] **Step 6: Deploy and verify**

```bash
npx wrangler deploy
```
Browse `/dashboard`. Expected: 7-day grid with habit rows + streak counters. Click a cell → toggles purple. Reload `/habits` main app → same state.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: habits week-grid widget"
```

---

## Task 8: Courses widget (sections + tiles)

**Files:**
- Modify: `worker.js`

- [ ] **Step 1: Add courses render helper**

Add above `renderPage`:

```js
async function renderCourses(env, username) {
  const { results: sections } = await env.COURSES_DB.prepare(
    'SELECT * FROM sections WHERE username = ? AND hidden = 0 ORDER BY position ASC'
  ).bind(username).all();
  const { results: tiles } = await env.COURSES_DB.prepare(
    'SELECT * FROM tiles WHERE username = ? ORDER BY position ASC'
  ).bind(username).all();

  if (!sections.length) {
    return '<div class="muted">No sections yet. Create them in <a target="_top" href="/courses">the main app</a>.</div>';
  }

  return sections.map(s => {
    const sTiles = tiles.filter(t => t.section_id === s.id);
    const tileEls = sTiles.map(t =>
      `<a class="course-tile" href="${esc(t.url)}" target="_blank" rel="noopener">
         <span class="emoji">${esc(t.emoji || '📚')}</span>
         <span class="name">${esc(t.name)}</span>
       </a>`
    ).join('');
    return `
      <div class="course-section">
        <div class="course-section-title">${esc(s.name)}</div>
        <div class="course-tiles">${tileEls || '<span class="muted">empty</span>'}</div>
      </div>`;
  }).join('');
}
```

- [ ] **Step 2: Extend CSS**

Append:

```
.course-section{margin-bottom:12px}
.course-section-title{font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em}
.course-tiles{display:flex;flex-wrap:wrap;gap:6px}
.course-tile{display:flex;align-items:center;gap:6px;background:var(--surface-soft);border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--text);font-size:12px}
.course-tile:hover{background:var(--surface-hover);color:var(--text)}
.course-tile .emoji{font-size:14px}
```

- [ ] **Step 3: Wire into renderPage**

Update `widgetBodies`:

```js
const coursesLayout = layout.find(w => w.widget_id === 'courses');
// ...
courses: coursesLayout.open ? await renderCourses(env, user.username) : '',
```

- [ ] **Step 4: Deploy and verify**

```bash
npx wrangler deploy
```
Browse `/dashboard`. Expected: Courses widget shows all non-hidden sections from `/courses`, each with its tiles; clicking a tile opens the course URL in a new tab.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: courses tiles widget"
```

---

## Task 9: Final polish + end-to-end verification

**Files:**
- Modify: `worker.js`
- Modify: `README.md`

- [ ] **Step 1: Cache-Control on static HTML**

In each HTML response, add `'Cache-Control': 'no-store'` so edits to the widget bodies aren't cached across sessions.

- [ ] **Step 2: End-to-end test matrix**

Verify each of these by hand in the browser (logged-in session):

1. `/dashboard` loads and shows all 4 widgets with data.
2. Close vault → chip appears. Click chip → vault reappears at the bottom.
3. Resize todolist widget → size persists after reload.
4. Add a todolist card in dashboard → appears in `/todo` main app.
5. Toggle a habit cell in dashboard → state reflected in `/habits` main app.
6. Navigate into a vault subfolder → persists after reload.
7. Click a course tile → opens the configured URL in a new tab.
8. Log out (clear `sess=` cookie) → `/dashboard` redirects to `/auth/login?redirect=/dashboard`.

- [ ] **Step 3: Update README**

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: cache headers, README, final verification"
```

---

## Done

After all 9 tasks the dashboard is live at `111iridescence.org/dashboard` with a resizable tiled grid of 4 widgets that share the existing app databases.
