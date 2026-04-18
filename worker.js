const DEFAULT_LAYOUT = [
  { widget_id: 'vault',    col_start: 1, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"path":""}' },
  { widget_id: 'todolist', col_start: 7, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"board_id":null}' },
  { widget_id: 'habits',   col_start: 1, col_span: 7, row_start: 4, row_span: 2, open: 1, config: '{}' },
  { widget_id: 'courses',  col_start: 8, col_span: 5, row_start: 4, row_span: 2, open: 1, config: '{}' },
];

const WIDGET_TITLES = { vault: '🗄️ Vault', todolist: '📋 Todolist', habits: '📈 Habits', courses: '🎓 Courses' };

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
function save(widget_id, patch){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const el = document.querySelector('[data-widget="'+widget_id+'"]');
    const r = el ? widgetRect(el) : { col_start:1, col_span:6, row_start:1, row_span:2 };
    const body = Object.assign({ widget_id, open:1, config:'{}' }, r, patch);
    await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  }, 300);
}

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
    const widgets = [...document.querySelectorAll('.widget')];
    let maxRow = 1;
    for (const w of widgets){ const rr = widgetRect(w); maxRow = Math.max(maxRow, rr.row_start + rr.row_span); }
    fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ widget_id:id, col_start:1, col_span:6, row_start:maxRow, row_span:3, open:1, config:'{}' })
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
  const newPath = n.dataset.navvault;
  const wEl = document.querySelector('[data-widget=vault]');
  const s = wEl.style;
  const col = s.gridColumn.match(/(\\d+) ?\\/ ?span ?(\\d+)/);
  const row = s.gridRow.match(/(\\d+) ?\\/ ?span ?(\\d+)/);
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ widget_id:'vault', col_start:+col[1], col_span:+col[2], row_start:+row[1], row_span:+row[2], open:1, config: JSON.stringify({ path:newPath }) })
  });
  const r = await fetch('/dashboard/api/vault?path=' + encodeURIComponent(newPath));
  document.querySelector('[data-body=vault]').innerHTML = await r.text();
});

document.addEventListener('change', async e => {
  const s = e.target.closest('[data-todo-board]');
  if (!s) return;
  const bid = s.value;
  const el = document.querySelector('[data-widget=todolist]');
  const st = el.style;
  const col = st.gridColumn.match(/(\\d+) ?\\/ ?span ?(\\d+)/);
  const row = st.gridRow.match(/(\\d+) ?\\/ ?span ?(\\d+)/);
  await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ widget_id:'todolist', col_start:+col[1], col_span:+col[2], row_start:+row[1], row_span:+row[2], open:1, config: JSON.stringify({ board_id:bid }) })
  });
  const r = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  document.querySelector('[data-body=todolist]').innerHTML = await r.text();
});

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
  const sel = document.querySelector('[data-todo-board]');
  const bid = sel ? sel.value : '';
  const r = await fetch('/dashboard/api/todo/board?boardId=' + encodeURIComponent(bid));
  document.querySelector('[data-body=todolist]').innerHTML = await r.text();
  draggingCard = null;
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

function renderPage(user, layout, widgetBodies) {
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

    if (path === '/api/vault' && req.method === 'GET') {
      const p = url.searchParams.get('path') || '';
      return new Response(await renderVault(env, user.username, JSON.stringify({ path: p })), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
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
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

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

    if (path === '/' || path === '') {
      const layout = await loadLayout(env, user.username);
      const vaultLayout = layout.find(w => w.widget_id === 'vault');
      const todoLayout = layout.find(w => w.widget_id === 'todolist');
      const widgetBodies = {
        vault: vaultLayout.open ? await renderVault(env, user.username, vaultLayout.config) : '',
        todolist: todoLayout.open ? await renderTodo(env, user.username, todoLayout.config) : '',
        habits: '<div class="muted">habits widget pending…</div>',
        courses: '<div class="muted">courses widget pending…</div>',
      };
      return new Response(renderPage(user, layout, widgetBodies), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new Response('404', { status: 404 });
  }
};
