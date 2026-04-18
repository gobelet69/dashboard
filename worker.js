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
