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
      const widgetBodies = {
        vault: vaultLayout.open ? await renderVault(env, user.username, vaultLayout.config) : '',
        todolist: '<div class="muted">todolist widget pending…</div>',
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
