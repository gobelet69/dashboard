# Dashboard v2 Implementation Plan

**Goal:** Extend dashboard with multi-instance widgets, drag/snap/push tiling, multi-side resize, and a new blocus-calendar widget.

**Changes vs v1:**
- Data model: `widget_layout` keyed by `instance_id` (UUID) instead of `widget_id`; adds `widget_type` column.
- No gap between widgets; widgets snap to grid cells and push neighbors down on overlap (drag + resize).
- Drag by header, resize from 8 handles (4 sides + 4 corners).
- "+ Add widget" dropdown lets user add multiple instances of any widget type.
- New `blocus` widget reads `TODO_DB.blocus_*` tables (created by the todolist app's `blocus calendar planning feature` commit). View: week / 2-weeks / month / all.

**Repo:** `/Users/theodeville/Repos/dashboard/`

**File to touch:** `worker.js` (single file, now ~400 lines; v2 will add ~400 more — still one file, matching sibling workers).

---

## Task 1: Migrate layout schema to multi-instance

**Files:** `schema.sql`, `worker.js`

New table shape:

```sql
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
```

- [ ] **Step 1: Rewrite `schema.sql`** with the new shape above.

- [ ] **Step 2: Migrate the production D1**

Existing rows in `widget_layout` are all seeded defaults — acceptable to drop and re-seed. Apply:

```bash
cd /Users/theodeville/Repos/dashboard
npx wrangler d1 execute dashboard --remote --command "DROP TABLE IF EXISTS widget_layout"
npx wrangler d1 execute dashboard --remote --file=schema.sql
```

- [ ] **Step 3: Update `worker.js` — new defaults + loader + APIs**

Replace `DEFAULT_LAYOUT` and `loadLayout` with:

```js
const DEFAULT_INSTANCES = [
  { widget_type: 'vault',    col_start: 1, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"path":""}' },
  { widget_type: 'todolist', col_start: 7, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"board_id":null}' },
  { widget_type: 'habits',   col_start: 1, col_span: 7, row_start: 4, row_span: 2, open: 1, config: '{}' },
  { widget_type: 'courses',  col_start: 8, col_span: 5, row_start: 4, row_span: 2, open: 1, config: '{}' },
];

const VALID_TYPES = ['vault', 'todolist', 'habits', 'courses', 'blocus'];

async function loadLayout(env, username) {
  const { results } = await env.DASHBOARD_DB.prepare(
    'SELECT * FROM widget_layout WHERE username = ? ORDER BY row_start, col_start'
  ).bind(username).all();
  if (results.length > 0) return results;
  const now = Date.now();
  const seeded = [];
  for (const w of DEFAULT_INSTANCES) {
    const id = crypto.randomUUID();
    await env.DASHBOARD_DB.prepare(
      'INSERT INTO widget_layout (instance_id, username, widget_type, col_start, col_span, row_start, row_span, open, config, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, username, w.widget_type, w.col_start, w.col_span, w.row_start, w.row_span, w.open, w.config, now).run();
    seeded.push({ instance_id: id, username, ...w, updated_at: now });
  }
  return seeded;
}
```

Replace the `/api/layout` handler body (same route) with:

```js
if (path === '/api/layout' && req.method === 'POST') {
  const body = await req.json();
  const updates = Array.isArray(body) ? body : [body];
  for (const u of updates) {
    if (!u.instance_id) continue;
    await env.DASHBOARD_DB.prepare(
      `UPDATE widget_layout
       SET col_start = ?, col_span = ?, row_start = ?, row_span = ?, open = ?, config = COALESCE(?, config), updated_at = ?
       WHERE instance_id = ? AND username = ?`
    ).bind(
      u.col_start|0, u.col_span|0, u.row_start|0, u.row_span|0, u.open ? 1 : 0,
      u.config == null ? null : (typeof u.config === 'string' ? u.config : JSON.stringify(u.config)),
      Date.now(), u.instance_id, user.username
    ).run();
  }
  return new Response('OK');
}
```

Add two new routes alongside:

```js
if (path === '/api/widget/create' && req.method === 'POST') {
  const body = await req.json();
  const { widget_type } = body;
  if (!VALID_TYPES.includes(widget_type)) return new Response('bad type', { status: 400 });
  // place at the bottom-left of the grid
  const { results } = await env.DASHBOARD_DB.prepare(
    'SELECT MAX(row_start + row_span) AS maxrow FROM widget_layout WHERE username = ?'
  ).bind(user.username).first().then(r => ({ results: [r] }));
  const maxrow = (results[0]?.maxrow) || 1;
  const defaults = {
    vault:    { col_span: 6, row_span: 3, config: '{"path":""}' },
    todolist: { col_span: 6, row_span: 3, config: '{"board_id":null}' },
    habits:   { col_span: 7, row_span: 2, config: '{}' },
    courses:  { col_span: 5, row_span: 2, config: '{}' },
    blocus:   { col_span: 8, row_span: 3, config: '{"board_id":null,"view":"week"}' },
  }[widget_type];
  const id = crypto.randomUUID();
  await env.DASHBOARD_DB.prepare(
    'INSERT INTO widget_layout (instance_id, username, widget_type, col_start, col_span, row_start, row_span, open, config, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?, 1, ?, ?)'
  ).bind(id, user.username, widget_type, defaults.col_span, maxrow, defaults.row_span, defaults.config, Date.now()).run();
  return new Response(JSON.stringify({ instance_id: id }), { headers: { 'Content-Type': 'application/json' } });
}

if (path === '/api/widget/delete' && req.method === 'POST') {
  const body = await req.json();
  await env.DASHBOARD_DB.prepare('DELETE FROM widget_layout WHERE instance_id = ? AND username = ?')
    .bind(body.instance_id, user.username).run();
  return new Response('OK');
}
```

- [ ] **Step 4: Update the root handler and widget-render selector**

The renderPage + widgetBodies pattern needs rework — bodies are now keyed per instance. Replace the root handler block with:

```js
if (path === '/' || path === '') {
  const layout = await loadLayout(env, user.username);
  const bodies = {};
  for (const w of layout) {
    if (!w.open) continue;
    bodies[w.instance_id] = await renderWidget(env, user.username, w);
  }
  return new Response(renderPage(user, layout, bodies), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
```

And add a central dispatcher above `renderPage`:

```js
async function renderWidget(env, username, w) {
  if (w.widget_type === 'vault')    return await renderVault(env, username, w.config);
  if (w.widget_type === 'todolist') return await renderTodo(env, username, w.config);
  if (w.widget_type === 'habits')   return await renderHabits(env, username);
  if (w.widget_type === 'courses')  return await renderCourses(env, username);
  if (w.widget_type === 'blocus')   return await renderBlocus(env, username, w.config);
  return '<div class="muted">unknown widget</div>';
}
```

Also update `renderPage` so each widget's `data-*` attributes use `instance_id`, not `widget_type`:

- `data-widget="..."` → `data-instance="<instance_id>"`, add `data-type="<widget_type>"`
- `data-close="..."`, `data-resize="..."`, `data-body="..."` all use `instance_id`
- Title bar shows the widget type's label from `WIDGET_TITLES` plus an optional `#2` suffix if there are duplicates (match per `widget_type`).
- Close chips use the `instance_id` too.

Every reference in `CLIENT_JS` to `data-widget="..."` / `data-close` / `data-resize` / `data-body` / `data-addcard` / `data-todo-board` / `data-navvault` must be updated to scope via the widget root's `data-instance`. For selectors like `document.querySelector('[data-widget=vault]')`, switch to `closest('[data-instance]')` relative to the event target.

- [ ] **Step 5: Deploy + verify**

```bash
npx wrangler deploy
curl -sI https://111iridescence.org/dashboard
```
Expected: 302. Then open the page in a logged-in browser. Verify the four default widgets seed again and render. Check the Network tab: any `/api/layout` POST now carries `instance_id`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(v2): multi-instance widget_layout schema + APIs"
```

---

## Task 2: Blocus calendar widget

**File:** `worker.js`

Reads `TODO_DB.blocus_boards`, `TODO_DB.blocus_courses`, `TODO_DB.blocus_course_sections`, `TODO_DB.blocus_slots` (created by the `todolist` worker's `Add blocus calendar planning feature` migration, already live in prod).

Config: `{ board_id: string|null, view: 'week'|'two'|'month'|'all' }`. Default view = `week`.

- [ ] **Step 1: Add `renderBlocus` above `renderPage`**

```js
function blocusRange(view, startDate, endDate) {
  // returns { from, to } as YYYY-MM-DD inclusive
  const today = new Date(); today.setHours(0,0,0,0);
  const toYMD = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if (view === 'all') return { from: startDate, to: endDate };
  const days = view === 'week' ? 7 : view === 'two' ? 14 : 30;
  const from = toYMD(today);
  const end = new Date(today); end.setDate(end.getDate() + days - 1);
  const to = toYMD(end);
  // Clamp to board range
  return { from: from < startDate ? startDate : from, to: to > endDate ? endDate : to };
}

async function renderBlocus(env, username, configJson) {
  let cfg = {};
  try { cfg = JSON.parse(configJson || '{}'); } catch {}
  const view = cfg.view || 'week';
  const { results: boards } = await env.TODO_DB.prepare(
    'SELECT * FROM blocus_boards WHERE username = ? ORDER BY created_at ASC'
  ).bind(username).all();
  if (!boards.length) {
    return '<div class="muted">No blocus calendar yet. Create one in <a target="_top" href="/todo">todolist</a>.</div>';
  }
  let boardId = cfg.board_id;
  if (!boardId || !boards.find(b => b.id === boardId)) boardId = boards[0].id;
  const board = boards.find(b => b.id === boardId);

  const { results: courses } = await env.TODO_DB.prepare(
    'SELECT * FROM blocus_courses WHERE blocus_id = ? ORDER BY position ASC'
  ).bind(boardId).all();
  const { results: sections } = await env.TODO_DB.prepare(
    'SELECT * FROM blocus_course_sections WHERE blocus_id = ? ORDER BY position ASC'
  ).bind(boardId).all();
  const { results: slots } = await env.TODO_DB.prepare(
    'SELECT * FROM blocus_slots WHERE blocus_id = ?'
  ).bind(boardId).all();

  const courseById = Object.fromEntries(courses.map(c => [c.id, c]));
  const sectionById = Object.fromEntries(sections.map(s => [s.id, s]));
  const slotKey = (day, period) => `${day}|${period}`;
  const slotByKey = {};
  for (const s of slots) slotByKey[slotKey(s.day, s.period)] = s;

  const { from, to } = blocusRange(view, board.start_date, board.end_date);
  const days = [];
  for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const fmtDay = d => d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: '2-digit' });
  const ymdDay = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const cell = (day, period) => {
    const s = slotByKey[slotKey(ymdDay(day), period)];
    if (!s) return `<div class="bloc-cell empty">·</div>`;
    const c = courseById[s.course_id];
    const sec = s.section_id ? sectionById[s.section_id] : null;
    const label = c ? (sec ? `${c.name} · ${sec.name}` : c.name) : (s.exam_note || 'slot');
    const bg = c ? c.color : 'var(--surface-hover)';
    return `<div class="bloc-cell${s.is_exam ? ' exam' : ''}" style="background:${esc(bg)}">${esc(label)}</div>`;
  };

  const boardSel = `<select data-blocus-board>${boards.map(b => `<option value="${esc(b.id)}" ${b.id===boardId?'selected':''}>${esc(b.name)}</option>`).join('')}</select>`;
  const viewBtns = ['week','two','month','all'].map(v =>
    `<button class="bloc-view ${v===view?'active':''}" data-blocus-view="${v}">${v==='two'?'2 weeks':v}</button>`
  ).join('');

  const rows = days.map(d => `
    <tr>
      <td class="bloc-day">${esc(fmtDay(d))}</td>
      <td>${cell(d,'morning')}</td>
      <td>${cell(d,'afternoon')}</td>
    </tr>`).join('');

  return `
  <div class="blocus">
    <div class="bloc-bar">${boardSel}<div class="bloc-views">${viewBtns}</div></div>
    <table class="bloc-table"><thead><tr><th></th><th>AM</th><th>PM</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>`;
}
```

- [ ] **Step 2: CSS append**

```
.blocus .bloc-bar{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.blocus select{background:var(--surface-soft);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;font:inherit}
.blocus .bloc-views{display:flex;gap:4px}
.bloc-view{font-size:11px;padding:3px 8px}
.bloc-view.active{background:var(--accent);color:#111;border-color:var(--accent)}
.bloc-table{width:100%;border-collapse:collapse;font-size:12px}
.bloc-table th{text-align:left;color:var(--text-muted);font-weight:500;padding:4px}
.bloc-table td{padding:2px;vertical-align:top}
.bloc-day{color:var(--text-secondary);white-space:nowrap}
.bloc-cell{border-radius:4px;padding:4px 6px;color:#111;font-weight:500;min-height:24px}
.bloc-cell.empty{background:transparent;color:var(--text-muted);font-weight:400}
.bloc-cell.exam{outline:2px solid #f43f5e}
```

- [ ] **Step 3: CLIENT_JS append**

```js
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-blocus-view]');
  if (!b) return;
  const widget = b.closest('[data-instance]');
  const instanceId = widget.dataset.instance;
  const sel = widget.querySelector('[data-blocus-board]');
  const currentBoard = sel ? sel.value : null;
  const newView = b.dataset.blocusView;
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ instance_id: instanceId, ...rectOf(widget), open:1, config: JSON.stringify({ board_id: currentBoard, view: newView }) })
  });
  location.reload();
});
document.addEventListener('change', async e => {
  const s = e.target.closest('[data-blocus-board]');
  if (!s) return;
  const widget = s.closest('[data-instance]');
  const active = widget.querySelector('[data-blocus-view].active');
  const view = active ? active.dataset.blocusView : 'week';
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ instance_id: widget.dataset.instance, ...rectOf(widget), open:1, config: JSON.stringify({ board_id: s.value, view }) })
  });
  location.reload();
});
```

(`rectOf(el)` is a helper to be introduced in Task 3; if it doesn't exist yet, inline the regex extraction.)

- [ ] **Step 4: Register in the `renderWidget` dispatcher (already done in Task 1)**

Confirm the `if (w.widget_type === 'blocus')` branch exists.

- [ ] **Step 5: Deploy + commit**

```bash
npx wrangler deploy
git add -A && git commit -m "feat(v2): blocus calendar widget"
```

Manual verify by using the "+ Add widget" dropdown in Task 3 and picking "blocus".

---

## Task 3: No-gap tiling, drag-by-header, push/reflow, multi-side resize, Add-widget dropdown

**File:** `worker.js`

This is the biggest task. It rewrites the CSS grid + client JS to behave like a lightweight tiling manager.

- [ ] **Step 1: CSS changes**

In the `CSS` template:
- Change `.grid` to `gap: 0; position: relative`.
- Widget corners: `.widget { border-radius: 0 }` (sharp so tiles meet cleanly), but keep a subtle 1px border. Adjacent widgets show a 2px line which reads as a divider — acceptable.
- Widget header: `cursor: grab` (becomes `grabbing` while dragging).
- Add a dragging style: `.widget.dragging { opacity: 0.6; z-index: 10 }`.
- Remove the old single `.resize-handle` rule and replace with 8 edge/corner handles:

```
.resize-handle{position:absolute;z-index:5}
.resize-handle.n{top:-3px;left:6px;right:6px;height:6px;cursor:n-resize}
.resize-handle.s{bottom:-3px;left:6px;right:6px;height:6px;cursor:s-resize}
.resize-handle.e{right:-3px;top:6px;bottom:6px;width:6px;cursor:e-resize}
.resize-handle.w{left:-3px;top:6px;bottom:6px;width:6px;cursor:w-resize}
.resize-handle.nw{top:-3px;left:-3px;width:10px;height:10px;cursor:nw-resize}
.resize-handle.ne{top:-3px;right:-3px;width:10px;height:10px;cursor:ne-resize}
.resize-handle.sw{bottom:-3px;left:-3px;width:10px;height:10px;cursor:sw-resize}
.resize-handle.se{bottom:-3px;right:-3px;width:10px;height:10px;cursor:se-resize}
.widget-header{cursor:grab}
.widget-header.dragging{cursor:grabbing}
/* Add-widget dropdown */
.add-widget{position:relative}
.add-widget > button{font-size:12px}
.add-widget-menu{position:absolute;top:100%;left:0;margin-top:4px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px;display:none;z-index:100;min-width:160px}
.add-widget-menu.show{display:block}
.add-widget-menu button{display:block;width:100%;text-align:left;border:none;background:transparent;padding:6px 10px;border-radius:6px}
.add-widget-menu button:hover{background:var(--surface-hover)}
```

- [ ] **Step 2: renderPage changes**

- Add an "+ Add widget" dropdown to the topbar.
- For each widget, emit 8 resize handles (`n, s, e, w, nw, ne, sw, se`) instead of one.
- Add `data-drag="<instance_id>"` on the header.
- The existing close button stays, but move it into the header alongside the drag target (header is the drag handle except for the close button itself).

```js
function renderPage(user, layout, bodies) {
  const open = layout.filter(w => w.open);
  const closed = layout.filter(w => !w.open);

  // Count occurrences per type to suffix duplicates
  const counters = {};
  const labelFor = (w) => {
    const t = w.widget_type;
    counters[t] = (counters[t] || 0) + 1;
    return counters[t] > 1 ? `${WIDGET_TITLES[t]} #${counters[t]}` : WIDGET_TITLES[t];
  };

  const chips = closed.map(w =>
    `<button class="chip" data-reopen="${w.instance_id}">+ ${esc(WIDGET_TITLES[w.widget_type])}</button>`
  ).join('');

  const addMenu = ['vault','todolist','habits','courses','blocus'].map(t =>
    `<button data-add-type="${t}">${esc(WIDGET_TITLES[t] || t)}</button>`
  ).join('');

  const widgets = open.map(w => {
    const label = labelFor(w);
    const handles = ['n','s','e','w','nw','ne','sw','se']
      .map(d => `<div class="resize-handle ${d}" data-resize="${w.instance_id}" data-dir="${d}"></div>`).join('');
    return `
    <section class="widget" data-instance="${w.instance_id}" data-type="${w.widget_type}" style="${widgetStyle(w)}">
      <div class="widget-header" data-drag="${w.instance_id}">
        <div class="title">${label}</div>
        <button class="close" data-close="${w.instance_id}" title="Close">×</button>
      </div>
      <div class="widget-body" data-body="${w.instance_id}">${bodies[w.instance_id] || ''}</div>
      ${handles}
    </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><title>Dashboard — 111iridescence</title>
<style>${CSS}</style>
</head><body>
<div class="topbar">
  <h1>Dashboard · ${esc(user.username)}</h1>
  <div class="add-widget">
    <button data-add-toggle>+ Add widget</button>
    <div class="add-widget-menu" id="addMenu">${addMenu}</div>
  </div>
  <div class="closed-chips">${chips}</div>
</div>
<div class="grid" id="grid">${widgets}</div>
<script>${CLIENT_JS}</script>
</body></html>`;
}
```

- [ ] **Step 3: Replace `CLIENT_JS` entirely**

```js
const CLIENT_JS = `
const grid = document.getElementById('grid');
const COLS = 12;

function rectOf(el){
  const s = el.style;
  const col = s.gridColumn.match(/(\\d+) ?\\/ ?span ?(\\d+)/);
  const row = s.gridRow.match(/(\\d+) ?\\/ ?span ?(\\d+)/);
  return { col_start:+col[1], col_span:+col[2], row_start:+row[1], row_span:+row[2] };
}
function setRect(el, r){
  el.style.gridColumn = r.col_start + ' / span ' + r.col_span;
  el.style.gridRow = r.row_start + ' / span ' + r.row_span;
}
function overlaps(a, b){
  return !(a.col_start + a.col_span <= b.col_start || b.col_start + b.col_span <= a.col_start ||
           a.row_start + a.row_span <= b.row_start || b.row_start + b.row_span <= a.row_start);
}
function allWidgets(){
  return [...document.querySelectorAll('.widget')].map(el => ({ el, id: el.dataset.instance, r: rectOf(el) }));
}

// Push any widget overlapping \`moving\` downward, recursively.
function reflow(movingId){
  const items = allWidgets();
  const moving = items.find(i => i.id === movingId);
  if (!moving) return items;
  let changed = true;
  while (changed){
    changed = false;
    for (const o of items){
      if (o.id === movingId) continue;
      const target = moving.r;
      if (overlaps(target, o.r)){
        o.r.row_start = target.row_start + target.row_span;
        setRect(o.el, o.r);
        changed = true;
      }
    }
    // propagate pushes among pushed widgets
    for (let i = 0; i < items.length; i++){
      for (let j = 0; j < items.length; j++){
        if (i === j) continue;
        const a = items[i], b = items[j];
        if (a.id === movingId) continue;
        if (overlaps(a.r, b.r)){
          const ay = a.r.row_start + a.r.row_span;
          const by = b.r.row_start + b.r.row_span;
          // push whichever is lower
          if (ay > by) { b.r.row_start = ay; setRect(b.el, b.r); }
          else { a.r.row_start = by; setRect(a.el, a.r); }
          changed = true;
        }
      }
    }
  }
  return items;
}

// Persist everyone's rect in one POST
async function saveAll(items){
  const payload = items.map(i => ({ instance_id: i.id, ...i.r, open: 1 }));
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
}

function colRowFromEvent(e){
  const gr = grid.getBoundingClientRect();
  const colW = gr.width / COLS;
  const rowH = 80;
  const c = Math.max(1, Math.min(COLS, Math.floor((e.clientX - gr.left) / colW) + 1));
  const r = Math.max(1, Math.floor((e.clientY - gr.top) / rowH) + 1);
  return { col: c, row: r };
}

// DRAG
let drag = null;
document.addEventListener('mousedown', e => {
  if (e.target.closest('[data-close]')) return;
  if (e.target.closest('[data-resize]')) return;
  const h = e.target.closest('[data-drag]');
  if (!h) return;
  const el = h.closest('.widget');
  const start = rectOf(el);
  const pos = colRowFromEvent(e);
  drag = { el, id: h.dataset.drag, start, offsetCol: pos.col - start.col_start, offsetRow: pos.row - start.row_start };
  el.classList.add('dragging');
  h.classList.add('dragging');
  e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!drag) return;
  const pos = colRowFromEvent(e);
  const newCol = Math.max(1, Math.min(COLS - drag.start.col_span + 1, pos.col - drag.offsetCol));
  const newRow = Math.max(1, pos.row - drag.offsetRow);
  const cur = rectOf(drag.el);
  if (cur.col_start !== newCol || cur.row_start !== newRow){
    setRect(drag.el, { ...drag.start, col_start: newCol, row_start: newRow });
    reflow(drag.id);
  }
});
document.addEventListener('mouseup', async () => {
  if (!drag) return;
  drag.el.classList.remove('dragging');
  const hdr = drag.el.querySelector('[data-drag]'); if (hdr) hdr.classList.remove('dragging');
  const items = reflow(drag.id);
  await saveAll(items);
  drag = null;
});

// RESIZE (8-direction)
let resize = null;
document.addEventListener('mousedown', e => {
  const h = e.target.closest('[data-resize]');
  if (!h) return;
  e.preventDefault();
  const el = h.closest('.widget');
  resize = { el, id: h.dataset.resize, dir: h.dataset.dir, start: rectOf(el) };
});
document.addEventListener('mousemove', e => {
  if (!resize) return;
  const pos = colRowFromEvent(e);
  let { col_start, col_span, row_start, row_span } = resize.start;
  const dir = resize.dir;
  if (dir.includes('e')){
    col_span = Math.max(3, Math.min(COLS - col_start + 1, pos.col - col_start + 1));
  }
  if (dir.includes('w')){
    const right = col_start + col_span;
    col_start = Math.min(right - 3, Math.max(1, pos.col));
    col_span = right - col_start;
  }
  if (dir.includes('s')){
    row_span = Math.max(2, pos.row - row_start + 1);
  }
  if (dir.includes('n')){
    const bottom = row_start + row_span;
    row_start = Math.min(bottom - 2, Math.max(1, pos.row));
    row_span = bottom - row_start;
  }
  setRect(resize.el, { col_start, col_span, row_start, row_span });
  reflow(resize.id);
});
document.addEventListener('mouseup', async () => {
  if (!resize) return;
  const items = reflow(resize.id);
  await saveAll(items);
  resize = null;
});

// CLOSE / REOPEN
document.addEventListener('click', async e => {
  const c = e.target.closest('[data-close]');
  if (c){
    e.preventDefault();
    const widget = c.closest('[data-instance]');
    const id = c.dataset.close;
    await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ instance_id: id, ...rectOf(widget), open: 0 })
    });
    location.reload();
    return;
  }
  const r = e.target.closest('[data-reopen]');
  if (r){
    const items = allWidgets();
    let maxRow = 1;
    for (const w of items){ maxRow = Math.max(maxRow, w.r.row_start + w.r.row_span); }
    await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ instance_id: r.dataset.reopen, col_start: 1, col_span: 6, row_start: maxRow, row_span: 3, open: 1 })
    });
    location.reload();
  }
});

// ADD WIDGET MENU
document.addEventListener('click', e => {
  if (e.target.closest('[data-add-toggle]')){
    document.getElementById('addMenu').classList.toggle('show');
    return;
  }
  if (!e.target.closest('.add-widget')){
    const m = document.getElementById('addMenu'); if (m) m.classList.remove('show');
  }
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-add-type]');
  if (!b) return;
  await fetch('/dashboard/api/widget/create', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ widget_type: b.dataset.addType })
  });
  location.reload();
});

// --- Widget-specific handlers (adapted to data-instance) ---

document.addEventListener('click', async e => {
  const n = e.target.closest('[data-navvault]');
  if (!n) return;
  e.preventDefault();
  const widget = n.closest('[data-instance]');
  const newPath = n.dataset.navvault;
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ instance_id: widget.dataset.instance, ...rectOf(widget), open:1, config: JSON.stringify({ path:newPath }) })
  });
  const r = await fetch('/dashboard/api/vault?path=' + encodeURIComponent(newPath));
  widget.querySelector('[data-body]').innerHTML = await r.text();
});

document.addEventListener('change', async e => {
  const s = e.target.closest('[data-todo-board]');
  if (!s) return;
  const widget = s.closest('[data-instance]');
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ instance_id: widget.dataset.instance, ...rectOf(widget), open:1, config: JSON.stringify({ board_id: s.value }) })
  });
  const r = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(s.value));
  widget.querySelector('[data-body]').innerHTML = await r.text();
});

document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-addcard]');
  if (!f) return;
  e.preventDefault();
  const widget = f.closest('[data-instance]');
  const fd = new FormData(f);
  fd.set('listId', f.dataset.addcard);
  await fetch('/dashboard/api/todo/card/create', { method:'POST', body: fd });
  const sel = widget.querySelector('[data-todo-board]');
  const bid = sel ? sel.value : '';
  const r = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  widget.querySelector('[data-body]').innerHTML = await r.text();
});

document.addEventListener('click', async e => {
  const d = e.target.closest('[data-delcard]');
  if (!d) return;
  e.preventDefault();
  const fd = new FormData(); fd.set('id', d.dataset.delcard);
  await fetch('/dashboard/api/todo/card/delete', { method:'POST', body: fd });
  d.closest('.kanban-card').remove();
});

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
  const widget = col.closest('[data-instance]');
  const newListId = col.dataset.list;
  const cardId = draggingCard.dataset.card;
  const cards = [...col.querySelectorAll('.kanban-card')];
  let npos = cards.length;
  for (let i = 0; i < cards.length; i++) {
    const rr = cards[i].getBoundingClientRect();
    if (e.clientY < rr.top + rr.height / 2) { npos = i; break; }
  }
  const fd = new FormData();
  fd.set('cardId', cardId); fd.set('newListId', newListId); fd.set('newPosition', npos);
  await fetch('/dashboard/api/todo/card/move', { method:'POST', body: fd });
  const sel = widget.querySelector('[data-todo-board]');
  const bid = sel ? sel.value : '';
  const r = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  widget.querySelector('[data-body]').innerHTML = await r.text();
  draggingCard = null;
});

document.addEventListener('click', async e => {
  const c = e.target.closest('.hb-cell');
  if (!c) return;
  const fd = new FormData();
  fd.set('habitId', c.dataset.habit); fd.set('date', c.dataset.date);
  await fetch('/dashboard/api/habits/toggle', { method:'POST', body: fd });
  c.classList.toggle('done');
});

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-blocus-view]');
  if (!b) return;
  const widget = b.closest('[data-instance]');
  const sel = widget.querySelector('[data-blocus-board]');
  const currentBoard = sel ? sel.value : null;
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ instance_id: widget.dataset.instance, ...rectOf(widget), open:1, config: JSON.stringify({ board_id: currentBoard, view: b.dataset.blocusView }) })
  });
  location.reload();
});
document.addEventListener('change', async e => {
  const s = e.target.closest('[data-blocus-board]');
  if (!s) return;
  const widget = s.closest('[data-instance]');
  const active = widget.querySelector('[data-blocus-view].active');
  const view = active ? active.dataset.blocusView : 'week';
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ instance_id: widget.dataset.instance, ...rectOf(widget), open:1, config: JSON.stringify({ board_id: s.value, view }) })
  });
  location.reload();
});
`;
```

- [ ] **Step 4: Deploy + verify**

```bash
npx wrangler deploy
```

Manual checks (browser):
1. Widgets touch edges (no internal gap).
2. Dragging a widget's header moves it; neighbors shift down if overlap.
3. Each of the 8 resize directions works; min sizes enforced (3 cols × 2 rows).
4. "+ Add widget" dropdown adds a new instance of any type; the new instance appears at the bottom.
5. Close × removes widget → chip reappear restores it.
6. Adding a second `todolist` and picking a different board persists independently.
7. Add a `blocus` instance → see the week grid; switch to "2 weeks" / "month" / "all" → widget reloads with new range.
8. Reload page → everything in the same positions/views.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(v2): drag/snap/push tiling, multi-side resize, add-widget menu"
```

---

## Done

After 3 tasks: widgets snap flush, can be dragged/resized from any side with reflow, user can spin up multiple instances of any widget via "+ Add widget", and a new blocus calendar widget joins the lineup with week/2-weeks/month/all views.
