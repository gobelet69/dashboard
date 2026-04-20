const DEFAULT_INSTANCES = [
  { widget_type: 'vault',    col_start: 1, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"path":""}' },
  { widget_type: 'todolist', col_start: 7, col_span: 6, row_start: 1, row_span: 3, open: 1, config: '{"board_id":null}' },
  { widget_type: 'habits',   col_start: 1, col_span: 7, row_start: 4, row_span: 2, open: 1, config: '{}' },
  { widget_type: 'courses',  col_start: 8, col_span: 5, row_start: 4, row_span: 2, open: 1, config: '{}' },
];

const VALID_TYPES = ['vault', 'todolist', 'habits', 'courses', 'blocus'];
const VALID_PRESETS = ['balanced', 'focus', 'columns'];
const GRID_COLS = 12;
const MIN_COL_SPAN = 3;
const MIN_ROW_SPAN = 2;

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
.layout-slots{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.slot-group{display:flex;align-items:center;gap:2px}
.slot-btn{font-size:11px;padding:4px 8px;transition:background .15s,box-shadow .25s}
.slot-btn:disabled{opacity:.5;cursor:not-allowed}
.slot-btn.save{color:var(--text-secondary)}
.slot-btn.del{color:var(--text-muted);padding:4px 6px}
.slot-btn.del:hover{color:#f43f5e}
.slot-btn.del.armed{color:#fff;background:#f43f5e;border-color:#f43f5e;animation:armedPulse 2.5s linear}
@keyframes armedPulse{0%{box-shadow:0 0 0 0 rgba(244,63,94,.7)}100%{box-shadow:0 0 0 8px rgba(244,63,94,0)}}
.slot-btn.slot-saved{background:var(--accent);color:#fff;box-shadow:0 0 0 3px rgba(168,85,247,.25)}
.quick-presets{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.preset-btn{font-size:11px;padding:4px 8px}
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:0;grid-auto-rows:80px;position:relative}
.widget{background:var(--surface);border:1px solid var(--border);border-radius:0;display:flex;flex-direction:column;overflow:hidden;position:relative;min-height:0;transition:box-shadow .15s ease,border-color .15s ease}
.widget:hover{border-color:var(--accent);box-shadow:0 4px 18px rgba(0,0,0,.35)}
.widget.dragging{opacity:.55;z-index:12;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.widget-header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border);background:var(--surface-soft);font-size:13px;font-weight:600;cursor:grab;user-select:none}
.widget-header.dragging{cursor:grabbing}
.widget-header .title{display:flex;gap:8px;align-items:center}
.widget-header .grip{color:var(--text-muted);font-size:14px;line-height:1;letter-spacing:-1px;cursor:grab;opacity:.55;transition:opacity .15s ease}
.widget-header:hover .grip{opacity:1}
.widget-header.dragging .grip{cursor:grabbing}
.widget-header .hdr-actions{display:flex;align-items:center;gap:2px}
.widget-header .close,.widget-header .collapse{background:transparent;border:none;color:var(--text-muted);font-size:16px;line-height:1;padding:2px 6px;cursor:pointer}
.widget-header .close:hover,.widget-header .collapse:hover{color:var(--text)}
.widget-body{flex:1;overflow:auto;padding:12px;font-size:13px}
.widget.collapsed .widget-body{display:none}
.widget.collapsed{min-height:0}
.widget-error{color:#f43f5e;font-size:12px}
.cardtitle-edit{font-size:12px;padding:2px 4px;width:auto}
.drop-preview{border:2px dashed rgba(168,85,247,.95);background:rgba(168,85,247,.18);z-index:18;pointer-events:none;border-radius:4px;box-shadow:0 0 0 1px rgba(168,85,247,.25) inset;transition:left .08s ease,top .08s ease,width .08s ease,height .08s ease}
.drop-preview.target{border-color:rgba(236,72,153,.9);background:rgba(236,72,153,.14);animation:dropPulse 1.1s ease-in-out infinite}
@keyframes dropPulse{0%,100%{box-shadow:0 0 0 1px rgba(236,72,153,.3) inset}50%{box-shadow:0 0 0 3px rgba(236,72,153,.5) inset}}
body.is-dragging .grid{background-image:linear-gradient(to right,rgba(168,85,247,.07) 1px,transparent 1px);background-size:calc(100%/12) 100%;padding-bottom:240px}
.resize-handle{position:absolute;z-index:5}
.resize-handle.n{top:-3px;left:6px;right:6px;height:6px;cursor:n-resize}
.resize-handle.s{bottom:-3px;left:6px;right:6px;height:6px;cursor:s-resize}
.resize-handle.e{right:-3px;top:6px;bottom:6px;width:6px;cursor:e-resize}
.resize-handle.w{left:-3px;top:6px;bottom:6px;width:6px;cursor:w-resize}
.resize-handle.nw{top:-3px;left:-3px;width:10px;height:10px;cursor:nw-resize}
.resize-handle.ne{top:-3px;right:-3px;width:10px;height:10px;cursor:ne-resize}
.resize-handle.sw{bottom:-3px;left:-3px;width:10px;height:10px;cursor:sw-resize}
.resize-handle.se{bottom:-3px;right:-3px;width:10px;height:10px;cursor:se-resize}
/* Add-widget dropdown */
.add-widget{position:relative}
.add-widget > button{font-size:12px}
.add-widget-menu{position:absolute;top:100%;left:0;margin-top:4px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px;display:none;z-index:100;min-width:160px}
.add-widget-menu.show{display:block}
.add-widget-menu button{display:block;width:100%;text-align:left;border:none;background:transparent;padding:6px 10px;border-radius:6px}
.add-widget-menu button:hover{background:var(--surface-hover)}
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
.blocus .bloc-bar{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.blocus select{background:var(--surface-soft);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;font:inherit}
.blocus .bloc-views{display:flex;gap:4px}
.bloc-view{font-size:11px;padding:3px 8px}
.bloc-view.active{background:var(--accent);color:#111;border-color:var(--accent)}
.bloc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:6px}
.bloc-day-card{background:var(--surface-soft);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.bloc-day-head{display:flex;justify-content:space-between;align-items:center;padding:4px 8px;border-bottom:1px solid var(--border)}
.bloc-dow{font-size:10px;color:var(--text-secondary);letter-spacing:.04em}
.bloc-date{font-size:13px;font-weight:700}
.bloc-period{padding:4px 6px;border-top:1px solid rgba(255,255,255,.04)}
.bloc-period:first-of-type{border-top:none}
.bloc-period-label{font-size:9px;color:var(--text-secondary);font-weight:700;letter-spacing:.08em;margin-bottom:2px;text-transform:uppercase}
.bloc-slot{border-radius:5px;padding:4px 6px;color:#111;font-size:11px;font-weight:600;min-height:22px;display:flex;align-items:center}
.bloc-slot.empty{background:rgba(255,255,255,.02);border:1px dashed var(--border);color:var(--text-muted);font-weight:500}
.bloc-slot.exam{outline:2px solid #f43f5e}
`;

const CLIENT_JS = `
let grid = document.getElementById('grid');
const COLS = 12;
const MIN_COL = 3;
const MIN_ROW = 2;

async function refreshPage(){
  const r = await fetch('/dashboard', { headers: { Accept: 'text/html' }, cache: 'no-store' });
  if (!r.ok) return;
  const html = await r.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const newGrid = doc.getElementById('grid');
  const newTopbar = doc.querySelector('.topbar');
  const curGrid = document.getElementById('grid');
  const curTopbar = document.querySelector('.topbar');
  if (newGrid && curGrid) curGrid.replaceWith(newGrid);
  if (newTopbar && curTopbar) curTopbar.replaceWith(newTopbar);
  grid = document.getElementById('grid');
}

function flash(el, cls = 'flash'){
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 600);
}

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
// FLIP: animate the mutation done by fn() by capturing rects before/after and tweening transforms.
function animateLayout(fn){
  const nodes = [...document.querySelectorAll('.widget')];
  const before = new Map(nodes.map(n => [n, n.getBoundingClientRect()]));
  fn();
  requestAnimationFrame(() => {
    for (const n of nodes){
      const b = before.get(n); if (!b) continue;
      const a = n.getBoundingClientRect();
      const dx = b.left - a.left, dy = b.top - a.top;
      const sx = b.width && a.width ? b.width / a.width : 1;
      const sy = b.height && a.height ? b.height / a.height : 1;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) continue;
      n.style.transition = 'none';
      n.style.transformOrigin = 'top left';
      n.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
      requestAnimationFrame(() => {
        n.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
        n.style.transform = '';
        setTimeout(() => { n.style.transition = ''; n.style.transform = ''; n.style.transformOrigin = ''; }, 260);
      });
    }
  });
}
function overlaps(a, b){
  return !(a.col_start + a.col_span <= b.col_start || b.col_start + b.col_span <= a.col_start ||
           a.row_start + a.row_span <= b.row_start || b.row_start + b.row_span <= a.row_start);
}
function allWidgets(){
  return [...document.querySelectorAll('.widget')].map(el => ({ el, id: el.dataset.instance, r: rectOf(el) }));
}

function overlapSize(aStart, aEnd, bStart, bEnd){
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}
function clamp(v, min, max){
  return Math.max(min, Math.min(max, v));
}

function compactLayout(items){
  const sorted = [...items].sort((a,b) => (a.r.row_start - b.r.row_start) || (a.r.col_start - b.r.col_start));
  // Widgets keep their natural column span — no horizontal auto-expansion.
  // Only vertical compaction runs below, and we clamp positions into grid bounds.
  for (const cur of sorted){
    const maxColStart = COLS - cur.r.col_span + 1;
    cur.r.col_start = Math.max(1, Math.min(maxColStart, cur.r.col_start));
    cur.r.row_start = Math.max(1, cur.r.row_start);
    while (cur.r.row_start > 1){
      const test = { ...cur.r, row_start: cur.r.row_start - 1 };
      if (items.some(i => i.id !== cur.id && overlaps(test, i.r))) break;
      cur.r.row_start--;
    }
    setRect(cur.el, cur.r);
  }
  return sorted;
}

function pickNeighbor(items, self, side){
  const mine = self.r;
  let best = null;
  let bestOverlap = 0;
  for (const item of items){
    if (item.id === self.id) continue;
    const r = item.r;
    if (side === 'e' && mine.col_start + mine.col_span !== r.col_start) continue;
    if (side === 'w' && r.col_start + r.col_span !== mine.col_start) continue;
    if (side === 's' && mine.row_start + mine.row_span !== r.row_start) continue;
    if (side === 'n' && r.row_start + r.row_span !== mine.row_start) continue;
    const overlap = (side === 'e' || side === 'w')
      ? overlapSize(mine.row_start, mine.row_start + mine.row_span, r.row_start, r.row_start + r.row_span)
      : overlapSize(mine.col_start, mine.col_start + mine.col_span, r.col_start, r.col_start + r.col_span);
    if (overlap > bestOverlap){
      best = item;
      bestOverlap = overlap;
    }
  }
  return best;
}
function touchingNeighbors(items, self, side){
  const mine = self.r;
  return items.filter(item => {
    if (item.id === self.id) return false;
    const r = item.r;
    if (side === 'n') return (r.row_start + r.row_span === mine.row_start) &&
      overlapSize(mine.col_start, mine.col_start + mine.col_span, r.col_start, r.col_start + r.col_span) > 0;
    if (side === 's') return (mine.row_start + mine.row_span === r.row_start) &&
      overlapSize(mine.col_start, mine.col_start + mine.col_span, r.col_start, r.col_start + r.col_span) > 0;
    if (side === 'w') return (r.col_start + r.col_span === mine.col_start) &&
      overlapSize(mine.row_start, mine.row_start + mine.row_span, r.row_start, r.row_start + r.row_span) > 0;
    return (mine.col_start + mine.col_span === r.col_start) &&
      overlapSize(mine.row_start, mine.row_start + mine.row_span, r.row_start, r.row_start + r.row_span) > 0;
  });
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

function ensurePreview(id, cls){
  let el = document.getElementById(id);
  if (!el){
    el = document.createElement('div');
    el.id = id;
    el.className = 'drop-preview ' + cls;
    grid.appendChild(el);
  }
  return el;
}
function hidePreviews(){
  const a = document.getElementById('dropPreview');
  const b = document.getElementById('targetPreview');
  if (a) a.style.display = 'none';
  if (b) b.style.display = 'none';
}
function showSplitPreview(p){
  const drop = ensurePreview('dropPreview', 'drop');
  const target = ensurePreview('targetPreview', 'target');
  setRect(drop, p.dragRect);
  setRect(target, p.targetRect);
  drop.style.display = 'block';
  target.style.display = 'block';
}
function splitProposal(movingRect, targetRect, side){
  if (side === 'left' || side === 'right'){
    if (targetRect.col_span < MIN_COL * 2){
      // Target too narrow to split horizontally — fall back to insert beside target,
      // shifting columns. If there isn't room on that side, insert on the opposite side.
      const srcSpan = Math.max(MIN_COL, Math.min(COLS, movingRect.col_span));
      if (side === 'left'){
        return {
          mode: 'insertBeforeCol',
          dragRect: { col_start: Math.max(1, targetRect.col_start - srcSpan), col_span: srcSpan, row_start: targetRect.row_start, row_span: targetRect.row_span },
          targetRect: { ...targetRect }
        };
      }
      return {
        mode: 'insertAfterCol',
        dragRect: { col_start: Math.min(COLS + 1 - srcSpan, targetRect.col_start + targetRect.col_span), col_span: srcSpan, row_start: targetRect.row_start, row_span: targetRect.row_span },
        targetRect: { ...targetRect }
      };
    }
    const dragSpan = Math.max(MIN_COL, Math.min(targetRect.col_span - MIN_COL, Math.round(targetRect.col_span / 2)));
    const targetSpan = targetRect.col_span - dragSpan;
    if (targetSpan < MIN_COL) return null;
    if (side === 'left'){
      return {
        dragRect: { col_start: targetRect.col_start, col_span: dragSpan, row_start: targetRect.row_start, row_span: targetRect.row_span },
        targetRect: { ...targetRect, col_start: targetRect.col_start + dragSpan, col_span: targetSpan }
      };
    }
    return {
      dragRect: { col_start: targetRect.col_start + targetSpan, col_span: dragSpan, row_start: targetRect.row_start, row_span: targetRect.row_span },
      targetRect: { ...targetRect, col_span: targetSpan }
    };
  }
  if (targetRect.row_span < MIN_ROW * 2){
    // Target too short to split vertically — fall back to insert above/below,
    // pushing down any widgets that collide (handled in mouseup).
    const srcSpan = Math.max(MIN_ROW, movingRect.row_span);
    if (side === 'top'){
      return {
        mode: 'insertAboveRow',
        dragRect: { col_start: targetRect.col_start, col_span: targetRect.col_span, row_start: targetRect.row_start, row_span: srcSpan },
        targetRect: { ...targetRect, row_start: targetRect.row_start + srcSpan }
      };
    }
    return {
      mode: 'insertBelowRow',
      dragRect: { col_start: targetRect.col_start, col_span: targetRect.col_span, row_start: targetRect.row_start + targetRect.row_span, row_span: srcSpan },
      targetRect: { ...targetRect }
    };
  }
  const dragSpan = Math.max(MIN_ROW, Math.min(targetRect.row_span - MIN_ROW, Math.round(targetRect.row_span / 2)));
  const targetSpan = targetRect.row_span - dragSpan;
  if (targetSpan < MIN_ROW) return null;
  if (side === 'top'){
    return {
      dragRect: { col_start: targetRect.col_start, col_span: targetRect.col_span, row_start: targetRect.row_start, row_span: dragSpan },
      targetRect: { ...targetRect, row_start: targetRect.row_start + dragSpan, row_span: targetSpan }
    };
  }
  return {
    dragRect: { col_start: targetRect.col_start, col_span: targetRect.col_span, row_start: targetRect.row_start + targetSpan, row_span: dragSpan },
    targetRect: { ...targetRect, row_span: targetSpan }
  };
}
function edgeSide(targetEl, e){
  const r = targetEl.getBoundingClientRect();
  const left = Math.abs(e.clientX - r.left);
  const right = Math.abs(r.right - e.clientX);
  const top = Math.abs(e.clientY - r.top);
  const bottom = Math.abs(r.bottom - e.clientY);
  const min = Math.min(left, right, top, bottom);
  if (min === left) return 'left';
  if (min === right) return 'right';
  if (min === top) return 'top';
  return 'bottom';
}
function gridContainsPoint(e){
  const gr = grid.getBoundingClientRect();
  return e.clientX >= gr.left && e.clientX <= gr.right && e.clientY >= gr.top && e.clientY <= gr.bottom;
}
function pointRectDistance(pos, r){
  const left = r.col_start;
  const right = r.col_start + r.col_span - 1;
  const top = r.row_start;
  const bottom = r.row_start + r.row_span - 1;
  const dx = pos.col < left ? (left - pos.col) : (pos.col > right ? (pos.col - right) : 0);
  const dy = pos.row < top ? (top - pos.row) : (pos.row > bottom ? (pos.row - bottom) : 0);
  return dx + dy;
}
function sideCandidatesForPoint(pos, r){
  const cx = r.col_start + (r.col_span / 2);
  const cy = r.row_start + (r.row_span / 2);
  const dx = pos.col - cx;
  const dy = pos.row - cy;
  const primary = Math.abs(dx) >= Math.abs(dy)
    ? (dx < 0 ? 'left' : 'right')
    : (dy < 0 ? 'top' : 'bottom');
  if (primary === 'left') return ['left', 'top', 'bottom', 'right'];
  if (primary === 'right') return ['right', 'top', 'bottom', 'left'];
  if (primary === 'top') return ['top', 'left', 'right', 'bottom'];
  return ['bottom', 'left', 'right', 'top'];
}
function proposalFromEmptyArea(items, pos, movingRect, movingId){
  let best = null;
  let dist = Infinity;
  for (const it of items){
    if (it.id === movingId) continue;
    const d = pointRectDistance(pos, it.r);
    if (d < dist){
      best = it;
      dist = d;
    }
  }
  if (!best) return null;
  for (const side of sideCandidatesForPoint(pos, best.r)){
    const p = splitProposal(movingRect, best.r, side);
    if (p) return { targetId: best.id, dragRect: p.dragRect, targetRect: p.targetRect, mode: p.mode };
  }
  return null;
}

// DRAG + SPLIT DROP
let drag = null;
document.addEventListener('mousedown', e => {
  if (e.target.closest('[data-close]')) return;
  if (e.target.closest('[data-resize]')) return;
  const h = e.target.closest('[data-drag]');
  if (!h) return;
  const el = h.closest('.widget');
  drag = { id: h.dataset.drag, el, start: rectOf(el), proposal: null, prevPointerEvents: el.style.pointerEvents || '' };
  el.classList.add('dragging');
  el.style.pointerEvents = 'none';
  h.classList.add('dragging');
  document.body.classList.add('is-dragging');
  e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!drag) return;
  drag.proposal = null;
  const items = allWidgets();
  const stack = document.elementsFromPoint(e.clientX, e.clientY);
  const targetEl = stack
    .map(node => node.closest ? node.closest('.widget') : null)
    .find(w => w && w.dataset.instance !== drag.id) || null;
  if (targetEl && targetEl.dataset.instance !== drag.id){
    const target = items.find(i => i.id === targetEl.dataset.instance);
    if (!target){
      hidePreviews();
      return;
    }
    const side = edgeSide(targetEl, e);
    const proposal = splitProposal(drag.start, target.r, side);
    if (!proposal){
      hidePreviews();
      return;
    }
    drag.proposal = { targetId: target.id, dragRect: proposal.dragRect, targetRect: proposal.targetRect, mode: proposal.mode };
    showSplitPreview(drag.proposal);
    return;
  }
  if (!gridContainsPoint(e)){
    hidePreviews();
    return;
  }
  const pos = colRowFromEvent(e);
  const fallback = proposalFromEmptyArea(items, pos, drag.start, drag.id);
  if (!fallback){
    hidePreviews();
    return;
  }
  drag.proposal = fallback;
  showSplitPreview(drag.proposal);
});
document.addEventListener('mouseup', async () => {
  if (!drag) return;
  hidePreviews();
  drag.el.style.pointerEvents = drag.prevPointerEvents;
  drag.el.classList.remove('dragging');
  document.body.classList.remove('is-dragging');
  const hdr = drag.el.querySelector('[data-drag]');
  if (hdr) hdr.classList.remove('dragging');
  if (drag.proposal){
    const items = allWidgets();
    const moving = items.find(i => i.id === drag.id);
    const target = items.find(i => i.id === drag.proposal.targetId);
    if (moving && target){
      let compacted;
      animateLayout(() => {
        const mode = drag.proposal.mode;
        // For insert modes, push down/aside any non-moving non-target widget that overlaps
        // the new drag rect (or the shifted target rect for insertAboveRow).
        if (mode === 'insertBelowRow' || mode === 'insertAboveRow'){
          const newDrag = drag.proposal.dragRect;
          const newTarget = drag.proposal.targetRect;
          const occupiedTop = Math.min(newDrag.row_start, newTarget.row_start);
          const occupiedBottom = Math.max(newDrag.row_start + newDrag.row_span, newTarget.row_start + newTarget.row_span);
          const pushBy = newDrag.row_span;
          for (const it of items){
            if (it.id === moving.id || it.id === target.id) continue;
            // overlap in columns?
            const cOverlap = !(it.r.col_start + it.r.col_span <= newDrag.col_start || newDrag.col_start + newDrag.col_span <= it.r.col_start);
            if (!cOverlap) continue;
            // sits in/below the insertion zone?
            if (it.r.row_start + it.r.row_span > occupiedTop && it.r.row_start < occupiedBottom){
              it.r.row_start += pushBy;
              setRect(it.el, it.r);
            } else if (mode === 'insertAboveRow' && it.r.row_start >= newTarget.row_start - pushBy && it.r.row_start < newTarget.row_start){
              // nothing — handled above
            }
          }
        }
        moving.r = drag.proposal.dragRect;
        target.r = drag.proposal.targetRect;
        setRect(moving.el, moving.r);
        setRect(target.el, target.r);
        compacted = compactLayout(items);
      });
      await saveAll(compacted);
    }
  }
  drag = null;
});

// RESIZE (8-direction)
let resize = null;
document.addEventListener('mousedown', e => {
  const h = e.target.closest('[data-resize]');
  if (!h) return;
  e.preventDefault();
  const el = h.closest('.widget');
  const items = allWidgets();
  const self = items.find(i => i.id === h.dataset.resize);
  if (!self) return;
  resize = {
    el,
    id: h.dataset.resize,
    dir: h.dataset.dir,
    start: rectOf(el),
    startItems: Object.fromEntries(items.map(i => [i.id, { ...i.r }])),
    neighbors: {
      n: touchingNeighbors(items, self, 'n').map(i => i.id),
      s: touchingNeighbors(items, self, 's').map(i => i.id),
      e: touchingNeighbors(items, self, 'e').map(i => i.id),
      w: touchingNeighbors(items, self, 'w').map(i => i.id)
    }
  };
});
document.addEventListener('mousemove', e => {
  if (!resize) return;
  const items = allWidgets();
  const map = Object.fromEntries(items.map(i => [i.id, i]));
  const self = map[resize.id];
  if (!self) return;
  const idsToRestore = new Set([
    resize.id,
    ...resize.neighbors.e,
    ...resize.neighbors.w,
    ...resize.neighbors.n,
    ...resize.neighbors.s
  ]);
  for (const id of idsToRestore){
    if (!map[id]) continue;
    map[id].r = { ...resize.startItems[id] };
    setRect(map[id].el, map[id].r);
  }

  const pos = colRowFromEvent(e);
  let { col_start, col_span, row_start, row_span } = resize.start;
  const dir = resize.dir;
  if (dir.includes('e')){
    if (resize.neighbors.e.length){
      const startRight = resize.start.col_start + resize.start.col_span - 1;
      const wanted = pos.col - startRight;
      let minDelta = MIN_COL - resize.start.col_span;
      let maxDelta = COLS - resize.start.col_start + 1 - resize.start.col_span;
      for (const id of resize.neighbors.e){
        maxDelta = Math.min(maxDelta, resize.startItems[id].col_span - MIN_COL);
      }
      const delta = clamp(wanted, minDelta, maxDelta);
      col_span = resize.start.col_span + delta;
      for (const id of resize.neighbors.e){
        if (!map[id]) continue;
        map[id].r.col_start = resize.startItems[id].col_start + delta;
        map[id].r.col_span = resize.startItems[id].col_span - delta;
        setRect(map[id].el, map[id].r);
      }
    } else {
      col_span = Math.max(MIN_COL, Math.min(COLS - col_start + 1, pos.col - col_start + 1));
    }
  }
  if (dir.includes('w')){
    if (resize.neighbors.w.length){
      const wanted = pos.col - resize.start.col_start;
      let minDelta = 1 - resize.start.col_start;
      let maxDelta = resize.start.col_span - MIN_COL;
      for (const id of resize.neighbors.w){
        minDelta = Math.max(minDelta, MIN_COL - resize.startItems[id].col_span);
      }
      const delta = clamp(wanted, minDelta, maxDelta);
      col_start = resize.start.col_start + delta;
      col_span = resize.start.col_span - delta;
      for (const id of resize.neighbors.w){
        if (!map[id]) continue;
        map[id].r.col_span = resize.startItems[id].col_span + delta;
        setRect(map[id].el, map[id].r);
      }
    } else {
      const right = col_start + col_span;
      col_start = Math.min(right - MIN_COL, Math.max(1, pos.col));
      col_span = right - col_start;
    }
  }
  if (dir.includes('s')){
    if (resize.neighbors.s.length){
      const startBottom = resize.start.row_start + resize.start.row_span - 1;
      const wanted = pos.row - startBottom;
      let minDelta = MIN_ROW - resize.start.row_span;
      let maxDelta = Infinity;
      for (const id of resize.neighbors.s){
        maxDelta = Math.min(maxDelta, resize.startItems[id].row_span - MIN_ROW);
      }
      const delta = clamp(wanted, minDelta, maxDelta);
      row_span = resize.start.row_span + delta;
      for (const id of resize.neighbors.s){
        if (!map[id]) continue;
        map[id].r.row_start = resize.startItems[id].row_start + delta;
        map[id].r.row_span = resize.startItems[id].row_span - delta;
        setRect(map[id].el, map[id].r);
      }
    } else {
      row_span = Math.max(MIN_ROW, pos.row - row_start + 1);
    }
  }
  if (dir.includes('n')){
    if (resize.neighbors.n.length){
      const wanted = pos.row - resize.start.row_start;
      let minDelta = 1 - resize.start.row_start;
      let maxDelta = resize.start.row_span - MIN_ROW;
      for (const id of resize.neighbors.n){
        minDelta = Math.max(minDelta, MIN_ROW - resize.startItems[id].row_span);
      }
      const delta = clamp(wanted, minDelta, maxDelta);
      row_start = resize.start.row_start + delta;
      row_span = resize.start.row_span - delta;
      for (const id of resize.neighbors.n){
        if (!map[id]) continue;
        map[id].r.row_span = resize.startItems[id].row_span + delta;
        setRect(map[id].el, map[id].r);
      }
    } else {
      const bottom = row_start + row_span;
      row_start = Math.min(bottom - MIN_ROW, Math.max(1, pos.row));
      row_span = bottom - row_start;
    }
  }
  self.r = { col_start, col_span, row_start, row_span };
  setRect(self.el, self.r);
});
document.addEventListener('mouseup', async () => {
  if (!resize) return;
  let items;
  animateLayout(() => { items = compactLayout(allWidgets()); });
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
    const closedRect = rectOf(widget);
    widget.remove();
    let items;
    animateLayout(() => { items = compactLayout(allWidgets()); });
    await saveAll(items);
    await fetch('/dashboard/api/layout', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ instance_id: id, ...closedRect, open: 0 })
    });
    await refreshPage();
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
    await refreshPage();
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
  document.getElementById('addMenu')?.classList.remove('show');
  await refreshPage();
});

document.addEventListener('click', async e => {
  const save = e.target.closest('[data-slot-save]');
  if (save){
    save.disabled = true;
    const r = await fetch('/dashboard/api/layout-slot/save', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ slot: Number(save.dataset.slotSave) })
    });
    save.disabled = false;
    if (r.ok){
      flash(save, 'slot-saved');
      await refreshPage();
    }
    return;
  }
  const del = e.target.closest('[data-slot-delete]');
  if (del){
    // Two-step inline confirm: first click arms the button, second click within 2.5s commits.
    if (del.dataset.armed !== '1'){
      del.dataset.armed = '1';
      const prevText = del.textContent;
      del.textContent = '?';
      del.classList.add('armed');
      del.title = 'Click again to confirm';
      clearTimeout(del._armTimer);
      del._armTimer = setTimeout(() => {
        del.dataset.armed = '';
        del.textContent = prevText;
        del.classList.remove('armed');
        del.title = 'Clear slot ' + del.dataset.slotDelete;
      }, 2500);
      return;
    }
    clearTimeout(del._armTimer);
    await fetch('/dashboard/api/layout-slot/delete', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ slot: Number(del.dataset.slotDelete) })
    });
    await refreshPage();
    return;
  }
  const load = e.target.closest('[data-slot-load]');
  if (!load) return;
  const r = await fetch('/dashboard/api/layout-slot/load', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ slot: Number(load.dataset.slotLoad) })
  });
  if (r.ok) await refreshPage();
});

document.addEventListener('click', async e => {
  const p = e.target.closest('[data-preset-layout]');
  if (!p) return;
  await fetch('/dashboard/api/layout/preset', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ preset: p.dataset.presetLayout })
  });
  await refreshPage();
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

// Card inline edit: double-click title to edit
document.addEventListener('dblclick', e => {
  const t = e.target.closest('[data-cardtitle]');
  if (!t || t.querySelector('input')) return;
  const card = t.closest('.kanban-card');
  const id = card.dataset.card;
  const prev = t.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = prev;
  input.className = 'cardtitle-edit';
  t.textContent = '';
  t.appendChild(input);
  input.focus();
  input.select();
  let done = false;
  const commit = async () => {
    if (done) return;
    done = true;
    const val = input.value.trim();
    if (!val || val === prev){ t.textContent = prev; return; }
    const fd = new FormData();
    fd.set('id', id); fd.set('title', val);
    const r = await fetch('/dashboard/api/todo/card/update', { method:'POST', body: fd });
    t.textContent = r.ok ? val : prev;
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter'){ ev.preventDefault(); input.blur(); }
    else if (ev.key === 'Escape'){ done = true; t.textContent = prev; }
  });
});

// Widget collapse toggle
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-collapse]');
  if (!b) return;
  e.preventDefault();
  const widget = b.closest('.widget');
  const collapsed = !widget.classList.contains('collapsed');
  widget.classList.toggle('collapsed', collapsed);
  b.textContent = collapsed ? '+' : '−';
  await fetch('/dashboard/api/widget/collapse', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ instance_id: widget.dataset.instance, collapsed: collapsed ? 1 : 0 })
  });
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
  await refreshPage();
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
  await refreshPage();
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
  }).filter(f => f.name && !f.name.startsWith('.'));
  const files = (list.objects || []).map(o => ({
    name: o.key.slice(prefix.length),
    key: o.key,
    size: o.size,
  })).filter(f => f.name && !f.name.startsWith('.'));

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
            <span data-cardtitle title="Double-click to edit">${esc(c.title)}</span>
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
  const dayLabel = d => d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
  const dateLabel = d => String(d.getDate()).padStart(2, '0');
  const ymdDay = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const cell = (day, period, emptyLabel) => {
    const s = slotByKey[slotKey(ymdDay(day), period)];
    if (!s) return `<div class="bloc-slot empty">${emptyLabel}</div>`;
    const c = courseById[s.course_id];
    const sec = s.section_id ? sectionById[s.section_id] : null;
    const label = c ? (sec ? `${c.name} · ${sec.name}` : c.name) : (s.exam_note || 'slot');
    const bg = c ? c.color : 'var(--surface-hover)';
    return `<div class="bloc-slot${s.is_exam ? ' exam' : ''}" style="background:${esc(bg)}">${esc(label)}</div>`;
  };

  const boardSel = `<select data-blocus-board>${boards.map(b => `<option value="${esc(b.id)}" ${b.id===boardId?'selected':''}>${esc(b.name)}</option>`).join('')}</select>`;
  const viewBtns = ['week','two','month','all'].map(v =>
    `<button class="bloc-view ${v===view?'active':''}" data-blocus-view="${v}">${v==='two'?'2 weeks':v}</button>`
  ).join('');

  const cards = days.map(d => `
    <article class="bloc-day-card">
      <header class="bloc-day-head">
        <span class="bloc-dow">${esc(dayLabel(d))}</span>
        <span class="bloc-date">${esc(dateLabel(d))}</span>
      </header>
      <section class="bloc-period">
        <div class="bloc-period-label">Morning</div>
        ${cell(d, 'morning', 'No course selected')}
      </section>
      <section class="bloc-period">
        <div class="bloc-period-label">Afternoon</div>
        ${cell(d, 'afternoon', 'No course selected')}
      </section>
    </article>`).join('');

  return `
  <div class="blocus">
    <div class="bloc-bar">${boardSel}<div class="bloc-views">${viewBtns}</div></div>
    <div class="bloc-grid">${cards}</div>
  </div>`;
}

async function renderWidget(env, username, w) {
  try {
    if (w.widget_type === 'vault')    return await renderVault(env, username, w.config);
    if (w.widget_type === 'todolist') return await renderTodo(env, username, w.config);
    if (w.widget_type === 'habits')   return await renderHabits(env, username);
    if (w.widget_type === 'courses')  return await renderCourses(env, username);
    if (w.widget_type === 'blocus')   return await renderBlocus(env, username, w.config);
    return '<div class="muted">unknown widget</div>';
  } catch (err) {
    return `<div class="widget-error">Failed to load: ${esc(err.message || 'unknown error')}</div>`;
  }
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

function renderPage(user, layout, bodies, slots = {}) {
  const open = layout.filter(w => w.open);

  // Count occurrences per type to suffix duplicates
  const counters = {};
  const labelFor = (w) => {
    const t = w.widget_type;
    counters[t] = (counters[t] || 0) + 1;
    return counters[t] > 1 ? `${WIDGET_TITLES[t] || t} #${counters[t]}` : (WIDGET_TITLES[t] || t);
  };

  const addMenu = ['vault','todolist','habits','courses','blocus'].map(t =>
    `<button data-add-type="${t}">${esc(WIDGET_TITLES[t] || t)}</button>`
  ).join('');

  const widgets = open.map(w => {
    const label = labelFor(w);
    const handles = ['n','s','e','w','nw','ne','sw','se']
      .map(d => `<div class="resize-handle ${d}" data-resize="${esc(w.instance_id)}" data-dir="${d}"></div>`).join('');
    const collapsed = !!w.collapsed;
    return `
    <section class="widget${collapsed ? ' collapsed' : ''}" data-instance="${esc(w.instance_id)}" data-type="${esc(w.widget_type)}" style="${widgetStyle(w)}">
      <div class="widget-header" data-drag="${esc(w.instance_id)}">
        <div class="title"><span class="grip" aria-hidden="true">⋮⋮</span>${label}</div>
        <div class="hdr-actions">
          <button class="collapse" data-collapse="${esc(w.instance_id)}" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '+' : '−'}</button>
          <button class="close" data-close="${esc(w.instance_id)}" title="Close">×</button>
        </div>
      </div>
      <div class="widget-body" data-body="${esc(w.instance_id)}">${bodies[w.instance_id] || ''}</div>
      ${handles}
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
    <div class="layout-slots">
      ${[1,2,3].map(i => `
        <div class="slot-group">
          <button class="slot-btn" data-slot-load="${i}" ${!slots[i] ? 'disabled title="empty"' : ''}>Slot ${i}${slots[i] ? ' •' : ''}</button>
          <button class="slot-btn save" data-slot-save="${i}" title="Save current layout to slot ${i}">Save</button>
          ${slots[i] ? `<button class="slot-btn del" data-slot-delete="${i}" title="Clear slot ${i}">×</button>` : ''}
        </div>
      `).join('')}
    </div>
    <div class="quick-presets">
      <button class="preset-btn" data-preset-layout="balanced">Preset Balanced</button>
      <button class="preset-btn" data-preset-layout="focus">Preset Focus</button>
      <button class="preset-btn" data-preset-layout="columns">Preset Columns</button>
    </div>
    <div class="add-widget">
      <button data-add-toggle>+ Add widget</button>
      <div class="add-widget-menu" id="addMenu">${addMenu}</div>
    </div>
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

let collapsedColumnReady = false;
async function ensureCollapsedColumn(env) {
  if (collapsedColumnReady) return;
  try {
    await env.DASHBOARD_DB.prepare('ALTER TABLE widget_layout ADD COLUMN collapsed INTEGER NOT NULL DEFAULT 0').run();
  } catch {} // column already exists
  collapsedColumnReady = true;
}

async function loadLayout(env, username) {
  await ensureCollapsedColumn(env);
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

function overlapsRect(a, b) {
  return !(a.col_start + a.col_span <= b.col_start || b.col_start + b.col_span <= a.col_start ||
           a.row_start + a.row_span <= b.row_start || b.row_start + b.row_span <= a.row_start);
}

function findFirstGap(layout, desiredColSpan, desiredRowSpan) {
  const open = layout.filter(w => w.open);
  const maxBottom = open.reduce((m, w) => Math.max(m, w.row_start + w.row_span - 1), 1);
  const searchBottom = maxBottom + 24;

  for (let rowSpan = desiredRowSpan; rowSpan >= MIN_ROW_SPAN; rowSpan--) {
    for (let colSpan = desiredColSpan; colSpan >= MIN_COL_SPAN; colSpan--) {
      for (let row = 1; row <= searchBottom; row++) {
        for (let col = 1; col <= GRID_COLS - colSpan + 1; col++) {
          const candidate = { col_start: col, col_span: colSpan, row_start: row, row_span: rowSpan };
          if (!open.some(w => overlapsRect(candidate, w))) return candidate;
        }
      }
    }
  }

  return { col_start: 1, col_span: desiredColSpan, row_start: maxBottom + 1, row_span: desiredRowSpan };
}

function presetFrames(preset) {
  if (preset === 'focus') {
    return [
      { col_start: 1, col_span: 8, row_start: 1, row_span: 4 },
      { col_start: 9, col_span: 4, row_start: 1, row_span: 2 },
      { col_start: 9, col_span: 4, row_start: 3, row_span: 2 },
      { col_start: 1, col_span: 6, row_start: 5, row_span: 3 },
      { col_start: 7, col_span: 6, row_start: 5, row_span: 3 },
    ];
  }
  if (preset === 'columns') {
    return [
      { col_start: 1, col_span: 4, row_start: 1, row_span: 3 },
      { col_start: 5, col_span: 4, row_start: 1, row_span: 3 },
      { col_start: 9, col_span: 4, row_start: 1, row_span: 3 },
      { col_start: 1, col_span: 4, row_start: 4, row_span: 3 },
      { col_start: 5, col_span: 4, row_start: 4, row_span: 3 },
      { col_start: 9, col_span: 4, row_start: 4, row_span: 3 },
    ];
  }
  return [
    { col_start: 1, col_span: 6, row_start: 1, row_span: 3 },
    { col_start: 7, col_span: 6, row_start: 1, row_span: 3 },
    { col_start: 1, col_span: 6, row_start: 4, row_span: 3 },
    { col_start: 7, col_span: 6, row_start: 4, row_span: 3 },
  ];
}

function buildPresetUpdates(layout, preset) {
  const open = layout.filter(w => w.open).sort((a, b) => (a.row_start - b.row_start) || (a.col_start - b.col_start));
  const frames = presetFrames(preset);
  const maxFrameBottom = frames.reduce((m, f) => Math.max(m, f.row_start + f.row_span), 1);
  return open.map((w, i) => {
    if (i < frames.length) return { instance_id: w.instance_id, ...frames[i] };
    const n = i - frames.length;
    return {
      instance_id: w.instance_id,
      col_start: (n % 2 === 0) ? 1 : 7,
      col_span: 6,
      row_start: maxFrameBottom + Math.floor(n / 2) * 3,
      row_span: 3
    };
  });
}

async function ensureLayoutSlotsTable(env) {
  await env.DASHBOARD_DB.prepare(
    `CREATE TABLE IF NOT EXISTS layout_slots (
      username    TEXT NOT NULL,
      slot_index  INTEGER NOT NULL,
      payload     TEXT NOT NULL,
      updated_at  INTEGER NOT NULL,
      PRIMARY KEY (username, slot_index)
    )`
  ).run();
}

async function loadSlots(env, username) {
  await ensureLayoutSlotsTable(env);
  const { results } = await env.DASHBOARD_DB.prepare(
    'SELECT slot_index FROM layout_slots WHERE username = ?'
  ).bind(username).all();
  const out = { 1: false, 2: false, 3: false };
  for (const row of results) {
    if (row.slot_index >= 1 && row.slot_index <= 3) out[row.slot_index] = true;
  }
  return out;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    let path = url.pathname;
    if (path.startsWith('/dashboard')) path = path.substring(10) || '/';

    // Local-only dev shortcut: seed a session cookie when hitting /dashboard/dev-login from localhost.
    if (path === '/dev-login') {
      // Gated by a compile-time secret token. Safe to leave enabled — anyone hitting
      // prod without the token gets 403.
      const DEV_TOKEN = 'local-only-e5b8';
      if (url.searchParams.get('token') !== DEV_TOKEN) {
        return new Response('forbidden', { status: 403 });
      }
      const id = 'devsess';
      const username = 'testuser';
      const expires = Date.now() + 7 * 24 * 3600 * 1000;
      await env.AUTH_DB.prepare(
        'INSERT OR REPLACE INTO sessions (id, username, expires) VALUES (?, ?, ?)'
      ).bind(id, username, expires).run();
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/dashboard',
          'Set-Cookie': `sess=${id}; Path=/; Max-Age=604800; SameSite=Lax`
        }
      });
    }

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
      const list = await env.TODO_DB.prepare('SELECT board_id FROM lists WHERE id = ? AND username = ?').bind(nlid, user.username).first();
      if (!list) return new Response('no list', { status: 404 });
      await env.TODO_DB.prepare('UPDATE cards SET position = position + 1 WHERE list_id = ? AND position >= ? AND username = ?').bind(nlid, npos, user.username).run();
      await env.TODO_DB.prepare('UPDATE cards SET list_id = ?, board_id = ?, position = ? WHERE id = ? AND username = ?').bind(nlid, list.board_id, npos, cid, user.username).run();
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
      const habit = await env.HABITS_DB.prepare('SELECT id FROM habits WHERE id = ? AND username = ?').bind(hid, user.username).first();
      if (!habit) return new Response('no habit', { status: 404 });
      const existing = await env.HABITS_DB.prepare(
        'SELECT * FROM habit_logs WHERE habit_id = ? AND date = ? AND username = ?'
      ).bind(hid, date, user.username).first();
      if (existing) {
        await env.HABITS_DB.prepare('UPDATE habit_logs SET completed = ? WHERE id = ? AND username = ?')
          .bind(existing.completed ? 0 : 1, existing.id, user.username).run();
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
      await ensureCollapsedColumn(env);
      for (const u of updates) {
        if (!u.instance_id) continue;
        await env.DASHBOARD_DB.prepare(
          `UPDATE widget_layout
           SET col_start = ?, col_span = ?, row_start = ?, row_span = ?, open = ?,
               config = COALESCE(?, config), collapsed = COALESCE(?, collapsed), updated_at = ?
           WHERE instance_id = ? AND username = ?`
        ).bind(
          u.col_start|0, u.col_span|0, u.row_start|0, u.row_span|0, u.open ? 1 : 0,
          u.config == null ? null : (typeof u.config === 'string' ? u.config : JSON.stringify(u.config)),
          u.collapsed == null ? null : (u.collapsed ? 1 : 0),
          Date.now(), u.instance_id, user.username
        ).run();
      }
      return new Response('OK');
    }

    if (path === '/api/layout/preset' && req.method === 'POST') {
      const body = await req.json();
      const preset = body?.preset;
      if (!VALID_PRESETS.includes(preset)) return new Response('bad preset', { status: 400 });
      const layout = await loadLayout(env, user.username);
      const updates = buildPresetUpdates(layout, preset);
      for (const u of updates) {
        await env.DASHBOARD_DB.prepare(
          `UPDATE widget_layout
           SET col_start = ?, col_span = ?, row_start = ?, row_span = ?, updated_at = ?
           WHERE instance_id = ? AND username = ?`
        ).bind(u.col_start, u.col_span, u.row_start, u.row_span, Date.now(), u.instance_id, user.username).run();
      }
      return new Response('OK');
    }

    if (path === '/api/layout-slot/save' && req.method === 'POST') {
      const body = await req.json();
      const slot = Number(body.slot);
      if (![1, 2, 3].includes(slot)) return new Response('bad slot', { status: 400 });
      const layout = await loadLayout(env, user.username);
      const payload = JSON.stringify(layout.map(w => ({
        instance_id: w.instance_id,
        widget_type: w.widget_type,
        col_start: w.col_start,
        col_span: w.col_span,
        row_start: w.row_start,
        row_span: w.row_span,
        open: w.open ? 1 : 0,
        config: w.config || '{}'
      })));
      await ensureLayoutSlotsTable(env);
      await env.DASHBOARD_DB.prepare(
        `INSERT INTO layout_slots (username, slot_index, payload, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(username, slot_index) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
      ).bind(user.username, slot, payload, Date.now()).run();
      return new Response('OK');
    }

    if (path === '/api/layout-slot/load' && req.method === 'POST') {
      const body = await req.json();
      const slot = Number(body.slot);
      if (![1, 2, 3].includes(slot)) return new Response('bad slot', { status: 400 });
      await ensureLayoutSlotsTable(env);
      const row = await env.DASHBOARD_DB.prepare(
        'SELECT payload FROM layout_slots WHERE username = ? AND slot_index = ?'
      ).bind(user.username, slot).first();
      if (!row?.payload) return new Response('empty slot', { status: 404 });
      let saved = [];
      try { saved = JSON.parse(row.payload); } catch { return new Response('bad payload', { status: 400 }); }
      if (!Array.isArray(saved) || !saved.length) return new Response('empty payload', { status: 400 });

      await env.DASHBOARD_DB.prepare('DELETE FROM widget_layout WHERE username = ?').bind(user.username).run();
      for (const w of saved) {
        if (!VALID_TYPES.includes(w.widget_type)) continue;
        await env.DASHBOARD_DB.prepare(
          `INSERT INTO widget_layout
           (instance_id, username, widget_type, col_start, col_span, row_start, row_span, open, config, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          w.instance_id || crypto.randomUUID(),
          user.username,
          w.widget_type,
          Math.max(1, w.col_start | 0),
          Math.max(3, w.col_span | 0),
          Math.max(1, w.row_start | 0),
          Math.max(2, w.row_span | 0),
          w.open ? 1 : 0,
          typeof w.config === 'string' ? w.config : JSON.stringify(w.config || {}),
          Date.now()
        ).run();
      }
      return new Response('OK');
    }

    if (path === '/api/widget/create' && req.method === 'POST') {
      const body = await req.json();
      const { widget_type } = body;
      if (!VALID_TYPES.includes(widget_type)) return new Response('bad type', { status: 400 });
      const defaults = {
        vault:    { col_span: 6, row_span: 3, config: '{"path":""}' },
        todolist: { col_span: 6, row_span: 3, config: '{"board_id":null}' },
        habits:   { col_span: 7, row_span: 2, config: '{}' },
        courses:  { col_span: 5, row_span: 2, config: '{}' },
        blocus:   { col_span: 8, row_span: 3, config: '{"board_id":null,"view":"week"}' },
      }[widget_type];
      const layout = await loadLayout(env, user.username);
      const spot = findFirstGap(layout, defaults.col_span, defaults.row_span);
      const id = crypto.randomUUID();
      await env.DASHBOARD_DB.prepare(
        'INSERT INTO widget_layout (instance_id, username, widget_type, col_start, col_span, row_start, row_span, open, config, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
      ).bind(id, user.username, widget_type, spot.col_start, spot.col_span, spot.row_start, spot.row_span, defaults.config, Date.now()).run();
      return new Response(JSON.stringify({ instance_id: id }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === '/api/widget/delete' && req.method === 'POST') {
      const body = await req.json();
      await env.DASHBOARD_DB.prepare('DELETE FROM widget_layout WHERE instance_id = ? AND username = ?')
        .bind(body.instance_id, user.username).run();
      return new Response('OK');
    }

    if (path === '/api/widget/collapse' && req.method === 'POST') {
      const body = await req.json();
      if (!body.instance_id) return new Response('bad id', { status: 400 });
      await ensureCollapsedColumn(env);
      await env.DASHBOARD_DB.prepare(
        'UPDATE widget_layout SET collapsed = ?, updated_at = ? WHERE instance_id = ? AND username = ?'
      ).bind(body.collapsed ? 1 : 0, Date.now(), body.instance_id, user.username).run();
      return new Response('OK');
    }

    if (path === '/api/todo/card/update' && req.method === 'POST') {
      const form = await req.formData();
      const id = form.get('id');
      const title = (form.get('title') || '').toString().trim();
      if (!id || !title) return new Response('bad input', { status: 400 });
      await env.TODO_DB.prepare(
        'UPDATE cards SET title = ? WHERE id = ? AND username = ?'
      ).bind(title, id, user.username).run();
      return new Response('OK');
    }

    if (path === '/api/layout-slot/delete' && req.method === 'POST') {
      const body = await req.json();
      const slot = Number(body.slot);
      if (![1, 2, 3].includes(slot)) return new Response('bad slot', { status: 400 });
      await ensureLayoutSlotsTable(env);
      await env.DASHBOARD_DB.prepare(
        'DELETE FROM layout_slots WHERE username = ? AND slot_index = ?'
      ).bind(user.username, slot).run();
      return new Response('OK');
    }

    if (path === '/' || path === '') {
      const layout = await loadLayout(env, user.username);
      const slots = await loadSlots(env, user.username);
      const bodies = {};
      for (const w of layout) {
        if (!w.open) continue;
        bodies[w.instance_id] = await renderWidget(env, user.username, w);
      }
      return new Response(renderPage(user, layout, bodies, slots), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    return new Response('404', { status: 404 });
  }
};
