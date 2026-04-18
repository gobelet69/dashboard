const DEFAULT_INSTANCES = [
  { widget_type: 'vault',    col_start: 1, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"path":""}' },
  { widget_type: 'todolist', col_start: 7, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"board_id":null}' },
  { widget_type: 'habits',   col_start: 1, col_span: 7, row_start: 4, row_span: 2, open: 1, config: '{}' },
  { widget_type: 'courses',  col_start: 8, col_span: 5, row_start: 4, row_span: 2, open: 1, config: '{}' },
];

const VALID_TYPES = ['vault', 'todolist', 'habits', 'courses', 'blocus'];

const WIDGET_TITLES = { vault: '🗄️ Vault', todolist: '📋 Todolist', habits: '📈 Habits', courses: '🎓 Courses', blocus: '📅 Blocus' };

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function widgetStyle(w) {
  return `grid-column:${w.col_start}/span ${w.col_span};grid-row:${w.row_start}/span ${w.row_span}`;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
:root{
  --bg:#0F1115;--surface:#1A1D24;--surface-hover:#20242C;--surface-soft:#151820;
  --text:#F1F5F9;--text-secondary:#94A3B8;--text-muted:#64748B;--border:#262A33;
  --accent:#A855F7;--accent-pink:#EC4899;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh}
a{color:var(--accent);text-decoration:none}
button{font-family:inherit;cursor:pointer;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 10px}
button:hover{background:var(--surface-hover)}
.hub-header{display:flex;justify-content:space-between;align-items:center;height:64px;padding:0 24px;background:var(--surface);border-bottom:1px solid var(--border);box-shadow:0 1px 3px rgba(0,0,0,.25);position:sticky;top:0;z-index:50}
.user-wrap{position:relative}
.user-btn{display:flex;align-items:center;gap:8px;color:var(--text);font-size:.84rem;font-weight:500;padding:6px 12px 6px 10px;border-radius:8px;background:transparent;border:1px solid var(--border);cursor:pointer;transition:all .15s ease-out}
.user-btn:hover{background:var(--surface-hover)}
.caret{color:var(--text-muted);transition:transform .15s ease-out;margin-left:2px}
.user-wrap.open .caret{transform:rotate(180deg)}
.dd{display:none;position:absolute;right:0;top:calc(100% + 8px);background:var(--surface);border:1px solid var(--border);border-radius:12px;min-width:240px;box-shadow:0 16px 48px rgba(0,0,0,.4);z-index:999;overflow:hidden}
.user-wrap.open .dd{display:block;animation:dd 150ms ease-out}
@keyframes dd{from{opacity:0;transform:translateY(-4px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.dd-hdr{padding:14px 16px 12px;border-bottom:1px solid var(--border)}
.dd-name{font-weight:700;font-size:.92rem;margin-bottom:7px}
.dd-sub{font-size:.76rem;color:var(--text-muted)}
.ddl{display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--text);text-decoration:none;font-size:.86rem;font-weight:500;transition:background .15s ease-out}
.ddl:hover{background:rgba(168,85,247,.1);color:var(--text)}
.dd-sep{height:1px;background:var(--border);margin:4px 0}
.ddl.out{color:#F43F5E!important}
.ddl.out:hover{background:rgba(244,63,94,.12)!important;color:#F43F5E}
.page{padding:16px}
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
.vault .crumbs{margin-bottom:8px;font-size:12px;color:var(--text-secondary)}
.vault .row{display:block;padding:6px 8px;border-radius:6px;cursor:pointer;color:var(--text)}
.vault .row:hover{background:var(--surface-hover)}
.vault .row.file{color:var(--accent)}
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
.habits{width:100%;font-size:12px;border-collapse:collapse}
.habits th,.habits td{padding:4px 6px;text-align:left;vertical-align:middle}
.habits .hb-days td{color:var(--text-muted);font-size:11px}
.habits .hb-dlabel{display:inline-block;width:22px;text-align:center;margin-right:4px}
.habits .hb-name{font-weight:500}
.habits .hb-streak{color:var(--text-secondary);white-space:nowrap}
.hb-cells{display:flex;gap:4px}
.hb-cell{width:22px;height:22px;border-radius:4px;border:1px solid var(--border);background:var(--surface-soft);padding:0;cursor:pointer}
.hb-cell.done{background:var(--accent);border-color:var(--accent)}
.course-section{margin-bottom:12px}
.course-section-title{font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em}
.course-tiles{display:flex;flex-wrap:wrap;gap:6px}
.course-tile{display:flex;align-items:center;gap:6px;background:var(--surface-soft);border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--text);font-size:12px}
.course-tile:hover{background:var(--surface-hover);color:var(--text)}
.course-tile .emoji{font-size:14px}
`;

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
function save(instanceId, patch){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const el = document.querySelector('[data-instance="'+instanceId+'"]');
    const r = el ? widgetRect(el) : { col_start:1, col_span:6, row_start:1, row_span:2 };
    const body = Object.assign({ instance_id: instanceId, open:1, config:'{}' }, r, patch);
    await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  }, 300);
}

document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]');
  if (c) {
    e.preventDefault();
    const instanceId = c.dataset.close;
    const widget = c.closest('[data-instance]');
    const r = widget ? widgetRect(widget) : { col_start:1, col_span:6, row_start:1, row_span:2 };
    fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ instance_id: instanceId, ...r, open: 0 })
    }).then(() => location.reload());
    return;
  }
  const r = e.target.closest('[data-reopen]');
  if (r) {
    const instanceId = r.dataset.reopen;
    const widgets = [...document.querySelectorAll('.widget')];
    let maxRow = 1;
    for (const w of widgets){ const rr = widgetRect(w); maxRow = Math.max(maxRow, rr.row_start + rr.row_span); }
    fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ instance_id: instanceId, col_start:1, col_span:6, row_start:maxRow, row_span:3, open:1 })
    }).then(() => location.reload());
  }
});

let resizing = null;
document.addEventListener('mousedown', e => {
  const h = e.target.closest('[data-resize]');
  if (!h) return;
  e.preventDefault();
  const el = h.closest('.widget');
  const rect = el.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const colW = (gridRect.width - (11 * 12)) / 12;
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

document.addEventListener('click', async e => {
  const n = e.target.closest('[data-navvault]');
  if (!n) return;
  e.preventDefault();
  const widget = n.closest('[data-instance]');
  const newPath = n.dataset.navvault;
  const r = widgetRect(widget);
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ instance_id: widget.dataset.instance, ...r, open:1, config: JSON.stringify({ path:newPath }) })
  });
  const res = await fetch('/dashboard/api/vault?path=' + encodeURIComponent(newPath));
  widget.querySelector('[data-body]').innerHTML = await res.text();
});

document.addEventListener('change', async e => {
  const s = e.target.closest('[data-todo-board]');
  if (!s) return;
  const bid = s.value;
  const widget = s.closest('[data-instance]');
  const r = widgetRect(widget);
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ instance_id: widget.dataset.instance, ...r, open:1, config: JSON.stringify({ board_id:bid }) })
  });
  const res = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  widget.querySelector('[data-body]').innerHTML = await res.text();
});

document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-addcard]');
  if (!f) return;
  e.preventDefault();
  const widget = f.closest('[data-instance]');
  const fd = new FormData(f);
  fd.set('listId', f.dataset.addcard);
  await fetch('/dashboard/api/todo/card/create', { method:'POST', body: fd });
  const sel = widget ? widget.querySelector('[data-todo-board]') : document.querySelector('[data-todo-board]');
  const bid = sel ? sel.value : '';
  const res = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  if (widget) widget.querySelector('[data-body]').innerHTML = await res.text();
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
  const sel = widget ? widget.querySelector('[data-todo-board]') : document.querySelector('[data-todo-board]');
  const bid = sel ? sel.value : '';
  const res = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  if (widget) widget.querySelector('[data-body]').innerHTML = await res.text();
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
`;

async function renderVault(env, username, configJson) {
  let path = '';
  try { path = JSON.parse(configJson || '{}').path || ''; } catch {}
  const prefix = path ? (path.endsWith('/') ? path : path + '/') : '';
  const list = await env.VAULT_R2.list({ prefix, delimiter: '/', limit: 200 });

  const folders = (list.delimitedPrefixes || []).map(p => {
    const name = p.slice(prefix.length).replace(/\/$/, '');
    return { name, key: p };
  });
  const files = (list.objects || []).map(o => ({
    name: o.key.slice(prefix.length),
    key: o.key,
    size: o.size,
  })).filter(f => f.name);

  const crumbs = [];
  crumbs.push(`<a href="#" data-navvault="">root</a>`);
  let acc = '';
  for (const part of path.split('/').filter(Boolean)) {
    acc += part + '/';
    crumbs.push(` / <a href="#" data-navvault="${esc(acc)}">${esc(part)}</a>`);
  }

  const folderRows = folders.map(f =>
    `<div class="row folder" data-navvault="${esc(f.key)}">📁 ${esc(f.name)}</div>`
  ).join('');
  const fileRows = files.map(f =>
    `<a class="row file" target="_top" href="/vault/file/${encodeURIComponent(f.key)}">📄 ${esc(f.name)}</a>`
  ).join('');

  return `
  <div class="vault">
    <div class="crumbs">${crumbs.join('')}</div>
    <div class="rows">${folderRows}${fileRows || (folders.length?'':'<div class="muted">empty</div>')}</div>
  </div>`;
}

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
        <td><div class="hb-cells">${cells}</div></td>
      </tr>`;
  }).join('');

  return `
  <table class="habits">
    <thead>
      <tr class="hb-days"><td></td><td></td><td>${days.map(d => `<span class="hb-dlabel">${esc(d.label)}</span>`).join('')}</td></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

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

async function renderBlocus(env, username, configJson) {
  return '<div class="muted">blocus coming in Task 2</div>';
}

async function renderWidget(env, username, w) {
  if (w.widget_type === 'vault')    return await renderVault(env, username, w.config);
  if (w.widget_type === 'todolist') return await renderTodo(env, username, w.config);
  if (w.widget_type === 'habits')   return await renderHabits(env, username);
  if (w.widget_type === 'courses')  return await renderCourses(env, username);
  if (w.widget_type === 'blocus')   return await renderBlocus(env, username, w.config);
  return '<div class="muted">unknown widget</div>';
}

function renderHeader(user) {
  const userId = 'dUW';
  const appsId = 'dApps';
  return `<header class="hub-header">
  <a href="/" style="text-decoration:none;display:flex;align-items:center;gap:10px;flex-shrink:0">
    <span style="width:36px;height:36px;background:linear-gradient(135deg,#A855F7,#EC4899);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.05em;color:#fff;text-shadow:0 0 12px rgba(255,255,255,.7),0 0 4px rgba(255,255,255,.95);flex-shrink:0;box-shadow:0 2px 8px rgba(168,85,247,.35),0 0 20px rgba(168,85,247,.45)">111</span>
    <div style="display:flex;flex-direction:column;line-height:1.25">
      <span style="font-weight:700;font-size:1.1em;color:#fff;letter-spacing:-.02em">111<span style="color:#A855F7;text-shadow:0 0 20px rgba(168,85,247,.5)">iridescence</span></span>
      <span style="font-size:.72em;color:#94a3b8;font-weight:500;letter-spacing:.03em">Dashboard</span>
    </div>
  </a>
  <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
    <div class="user-wrap" id="${userId}">
      <button class="user-btn" onclick="document.getElementById('${userId}').classList.toggle('open')">
        ${esc(user.username)}<svg class="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="dd">
        <div class="dd-hdr">
          <div class="dd-name">${esc(user.username)}</div>
          <div class="dd-sub">Dashboard</div>
        </div>
        <a href="/auth/account" class="ddl">Account Preferences</a>
        <a href="/auth/admin" class="ddl">Admin Panel</a>
        <div class="dd-sep"></div>
        <a href="/auth/logout" class="ddl out">Sign Out</a>
      </div>
    </div>
    <div class="user-wrap" id="${appsId}">
      <button class="user-btn" onclick="document.getElementById('${appsId}').classList.toggle('open')">
        Apps<svg class="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="dd">
        <a href="/" class="ddl">🏠 Hub</a>
        <a href="/vault" class="ddl">🔒 Vault</a>
        <a href="/habits" class="ddl">📈 Habits</a>
        <a href="/todo" class="ddl">✅ Todo</a>
        <a href="/courses" class="ddl">🎓 Courses</a>
        <a href="/editor" class="ddl">📝 Editor</a>
        <a href="/dashboard" class="ddl">📊 Dashboard</a>
        <a href="/feed" class="ddl">📰 Feed</a>
      </div>
    </div>
  </div>
  <script>document.addEventListener('click',e=>{const w=document.getElementById('${userId}');const a=document.getElementById('${appsId}');if(w&&!w.contains(e.target))w.classList.remove('open');if(a&&!a.contains(e.target))a.classList.remove('open')});<\/script>
</header>`;
}

function renderPage(user, layout, bodies) {
  const open = layout.filter(w => w.open);
  const closed = layout.filter(w => !w.open);

  // Count occurrences per type to suffix duplicates
  const counters = {};
  const labelFor = (w) => {
    const t = w.widget_type;
    counters[t] = (counters[t] || 0) + 1;
    return counters[t] > 1 ? `${WIDGET_TITLES[t] || t} #${counters[t]}` : (WIDGET_TITLES[t] || t);
  };

  const chips = closed.map(w =>
    `<button class="chip" data-reopen="${esc(w.instance_id)}">+ ${esc(WIDGET_TITLES[w.widget_type] || w.widget_type)}</button>`
  ).join('');

  const widgets = open.map(w => {
    const label = labelFor(w);
    return `
    <section class="widget" data-instance="${esc(w.instance_id)}" data-type="${esc(w.widget_type)}" style="${widgetStyle(w)}">
      <div class="widget-header">
        <div class="title">${label}</div>
        <button class="close" data-close="${esc(w.instance_id)}" title="Close">×</button>
      </div>
      <div class="widget-body" data-body="${esc(w.instance_id)}">${bodies[w.instance_id] || ''}</div>
      <div class="resize-handle" data-resize="${esc(w.instance_id)}"></div>
    </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Dashboard — 111iridescence</title>
<style>${CSS}</style>
</head><body>
${renderHeader(user)}
<div class="page">
  <div class="topbar">
    <h1>Dashboard · ${esc(user.username)}</h1>
    <div class="closed-chips">${chips}</div>
  </div>
  <div class="grid" id="grid">${widgets}</div>
</div>
<script>${CLIENT_JS}</script>
</body></html>`;
}

async function getUser(req, env) {
  const cookie = req.headers.get('Cookie') || '';
  const sess = cookie.split(';').find(c => c.trim().startsWith('sess='))?.split('=')[1];
  if (!sess) return null;
  return await env.AUTH_DB.prepare('SELECT * FROM sessions WHERE id = ? AND expires > ?')
    .bind(sess, Date.now()).first();
}

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

    if (path === '/api/vault' && req.method === 'GET') {
      const p = url.searchParams.get('path') || '';
      return new Response(await renderVault(env, user.username, JSON.stringify({ path: p })), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

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
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

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

    if (path === '/api/widget/create' && req.method === 'POST') {
      const body = await req.json();
      const { widget_type } = body;
      if (!VALID_TYPES.includes(widget_type)) return new Response('bad type', { status: 400 });
      const row = await env.DASHBOARD_DB.prepare(
        'SELECT MAX(row_start + row_span) AS maxrow FROM widget_layout WHERE username = ?'
      ).bind(user.username).first();
      const maxrow = (row?.maxrow) || 1;
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

    return new Response('404', { status: 404 });
  }
};
