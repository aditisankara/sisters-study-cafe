/* ============================================================
   Sister's Café — Study Tracker
   Single-file vanilla JS. No build, no dependencies, offline-first.
   Persistence: localStorage. Works as web app / installed PWA / widget.
   ============================================================ */
(() => {
'use strict';

/* ---------------- constants ---------------- */
const DB_KEY = 'cafe-study-db';
const THEMES = [
  { id: 'cafe',     name: 'Café',     color: '#c98a5b' },
  { id: 'matcha',   name: 'Matcha',   color: '#7fa25a' },
  { id: 'midnight', name: 'Midnight', color: '#9b8cff' },
  { id: 'sakura',   name: 'Sakura',   color: '#e28fae' },
];
const AVATARS = ['🙂','🐰','🦊','🐨','🐸','🦉','🌷','⭐','🍵','📚','🧋','🐧'];
const QUOTES = [
  'Small steps every day.', 'You don\'t have to be extreme, just consistent.',
  'Focus on progress, not perfection.', 'The secret is to begin.',
  'One pomodoro at a time.', 'Done is better than perfect.',
  'Your future self is watching.', 'Deep work, then real rest.',
];
const ACHIEVEMENTS = [
  { id: 'first_focus', emoji: '🌱', name: 'First Sip', desc: 'Finish your first focus session.' },
  { id: 'focus_10',    emoji: '☕', name: 'Regular', desc: 'Complete 10 focus sessions.' },
  { id: 'focus_50',    emoji: '🔥', name: 'Barista', desc: 'Complete 50 focus sessions.' },
  { id: 'streak_3',    emoji: '📅', name: 'Habit Forming', desc: '3-day focus streak.' },
  { id: 'streak_7',    emoji: '🏅', name: 'Week Warrior', desc: '7-day focus streak.' },
  { id: 'planner_pro', emoji: '🗂️', name: 'Planner Pro', desc: 'Plan 20 tasks into days.' },
  { id: 'clean_dump',  emoji: '🧹', name: 'Clear Mind', desc: 'Empty your task dump (had 5+).' },
  { id: 'early_bird',  emoji: '🌅', name: 'Early Bird', desc: 'Focus session before 8am.' },
  { id: 'night_owl',   emoji: '🦉', name: 'Night Owl', desc: 'Focus session after 10pm.' },
  { id: 'century',     emoji: '💯', name: 'Century', desc: '100 total focus hours.' },
];

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n) => String(n).padStart(2, '0');
const todayISO = () => toISO(new Date());
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayName = (d) => d.toLocaleDateString(undefined, { weekday: 'short' });
const prettyDate = (s) => parseISO(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const daysUntil = (s) => Math.round((parseISO(s) - parseISO(todayISO())) / 86400000);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* ---------------- storage ---------------- */
function freshProfileData() {
  return { tasks: [], events: [], sessions: [], achievements: {}, dailyGoalMin: 120 };
}
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('DB load failed', e); }
  return { activeProfileId: null, profiles: [], data: {} };
}
let DB = loadDB();
function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  catch (e) { toast('⚠️ Could not save (storage full or blocked)'); }
}
const profile = () => DB.profiles.find((p) => p.id === DB.activeProfileId) || null;
const pdata = () => DB.data[DB.activeProfileId] || (DB.data[DB.activeProfileId] = freshProfileData());

/* ---------------- toast ---------------- */
let toastT;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (el.hidden = true), 2600);
}

/* ---------------- confetti ---------------- */
function confetti() {
  const c = $('#confetti'); const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const cols = ['#c98a5b', '#7fa25a', '#9b8cff', '#e28fae', '#f4d35e'];
  const bits = Array.from({ length: 120 }, () => ({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.4,
    r: 3 + Math.random() * 5, vy: 2 + Math.random() * 4, vx: -2 + Math.random() * 4,
    col: cols[(Math.random() * cols.length) | 0], a: Math.random() * Math.PI,
  }));
  let frames = 0;
  (function tick() {
    frames++; ctx.clearRect(0, 0, c.width, c.height);
    bits.forEach((b) => {
      b.y += b.vy; b.x += b.vx; b.a += 0.1;
      ctx.fillStyle = b.col;
      ctx.fillRect(b.x, b.y, b.r, b.r * 1.6);
    });
    if (frames < 140) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, c.width, c.height);
  })();
}

/* ---------------- theme ---------------- */
function applyTheme(id, mode) {
  document.body.dataset.theme = THEMES.find((t) => t.id === id) ? id : 'cafe';
  document.body.dataset.mode = mode === 'dark' ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
    meta.content = bg || (THEMES.find((t) => t.id === id) || THEMES[0]).color;
  }
}
function toggleMode() {
  const p = profile(); if (!p) return;
  p.mode = p.mode === 'dark' ? 'light' : 'dark';
  saveDB();
  applyTheme(p.theme, p.mode);
  const b = $('#modeToggle'); if (b) b.textContent = p.mode === 'dark' ? '☀️' : '🌙';
}

/* ============================================================
   GATE  (profile selection / creation)
   ============================================================ */
let gateTheme = 'cafe';
let gateMode = 'light';
function renderGate() {
  $('#gate').hidden = false; $('#app').hidden = true; $('#widget').hidden = true;
  applyTheme(gateTheme, gateMode);
  const list = $('#profileList');
  list.innerHTML = DB.profiles.length ? '' : '<p class="muted">No profiles yet — create one below.</p>';
  DB.profiles.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'profile-chip';
    b.innerHTML = `<span class="dot" style="background:${THEMES.find((t) => t.id === p.theme)?.color || '#ccc'}"></span>
      <span>${p.avatar || '🙂'} ${esc(p.name)}</span>
      <span class="del" data-del="${p.id}" title="Delete">✕</span>`;
    b.addEventListener('click', (e) => {
      if (e.target.dataset.del) {
        if (confirm(`Delete profile "${p.name}" and all its data?`)) {
          DB.profiles = DB.profiles.filter((x) => x.id !== p.id);
          delete DB.data[p.id];
          if (DB.activeProfileId === p.id) DB.activeProfileId = null;
          saveDB(); renderGate();
        }
        return;
      }
      selectProfile(p.id);
    });
    list.appendChild(b);
  });
  const sw = $('#gateThemes'); sw.innerHTML = '';
  THEMES.forEach((t) => {
    const s = document.createElement('button');
    s.type = 'button'; s.className = 'swatch'; s.style.background = t.color;
    s.setAttribute('aria-pressed', String(t.id === gateTheme));
    s.innerHTML = `<span>${t.name}</span>`;
    s.addEventListener('click', () => { gateTheme = t.id; renderGate(); });
    sw.appendChild(s);
  });
  $$('#gateMode [data-mode]').forEach((b) => {
    b.classList.toggle('primary', b.dataset.mode === gateMode);
    b.onclick = () => { gateMode = b.dataset.mode; renderGate(); };
  });
}
$('#newProfileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#newProfileName').value.trim();
  if (!name) return;
  const id = uid();
  const p = { id, name, theme: gateTheme, mode: gateMode, avatar: AVATARS[(Math.random() * AVATARS.length) | 0],
    focusDuration: 45, breakDuration: 10, longBreak: 25, notifOptIn: false };
  DB.profiles.push(p);
  DB.data[id] = freshProfileData();
  saveDB();
  $('#newProfileName').value = '';
  selectProfile(id);
});
function selectProfile(id) {
  DB.activeProfileId = id; saveDB();
  applyTheme(profile().theme, profile().mode);
  bootApp();
}

/* ============================================================
   ROUTER
   ============================================================ */
const VIEWS = ['dashboard', 'dump', 'planner', 'calendar', 'focus', 'reminders', 'stats', 'settings'];
function currentView() {
  const h = location.hash.replace('#', '');
  return VIEWS.includes(h) ? h : 'dashboard';
}
window.addEventListener('hashchange', () => {
  if ($('#app').hidden) return;
  renderView(currentView());
});

function bootApp() {
  $('#gate').hidden = true; $('#widget').hidden = true; $('#app').hidden = false;
  const p = profile();
  if (!p.mode) p.mode = p.theme === 'midnight' ? 'dark' : 'light';
  applyTheme(p.theme, p.mode);
  $('#profileAvatar').textContent = p.avatar || '🙂';
  $('#modeToggle').textContent = p.mode === 'dark' ? '☀️' : '🌙';
  renderView(currentView());
  updateTopbar();
  scheduleReminderChecks();
}

function updateTopbar() {
  $('#streakPill').textContent = `🔥 ${focusStreak()}`;
  const mins = totalFocusMinutes();
  $('#levelPill').textContent = `Lv ${level(mins)}`;
}
const level = (mins) => Math.floor(Math.sqrt(mins / 25)) + 1;

/* nav */
$('#sidenav').addEventListener('click', (e) => {
  const b = e.target.closest('.nav-item'); if (!b) return;
  location.hash = b.dataset.view;
  $('#sidenav').classList.remove('open');
});
$('#menuToggle').addEventListener('click', () => $('#sidenav').classList.toggle('open'));
$('#modeToggle').addEventListener('click', () => { toggleMode(); if (!$('#app').hidden) renderView(currentView()); });
$('#profileBtn').addEventListener('click', () => { DB.activeProfileId = null; saveDB(); renderGate(); });

function setActiveNav(view) {
  $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === view));
}

/* ============================================================
   VIEW RENDERER
   ============================================================ */
function renderView(view) {
  setActiveNav(view);
  const c = $('#content');
  c.innerHTML = '';
  ({ dashboard: viewDashboard, dump: viewDump, planner: viewPlanner, calendar: viewCalendar,
     focus: viewFocus, reminders: viewReminders, stats: viewStats, settings: viewSettings }[view])(c);
  updateTopbar();
}

/* ---------------- DASHBOARD ---------------- */
function viewDashboard(c) {
  const p = profile();
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const today = todayISO();
  const d = pdata();
  const todayTasks = d.tasks.filter((t) => t.scheduledFor === today && t.status !== 'done');
  const doneToday = d.tasks.filter((t) => t.status === 'done' && (t.completedAt || '').slice(0, 10) === today).length;
  const focusToday = d.sessions.filter((s) => s.type === 'focus' && s.completed && (s.endedAt || '').slice(0, 10) === today)
    .reduce((a, s) => a + s.minutes, 0);
  const goal = d.dailyGoalMin || 120;
  const up = upcoming(7);
  const quote = QUOTES[(new Date().getDate()) % QUOTES.length];

  c.innerHTML = `
    <div class="section-title"><h2>${greet}, ${esc(p.name)} ${p.avatar || ''}</h2>
      <span class="pill">“${quote}”</span></div>

    <div class="grid cols-3">
      <div class="card">
        <h3>Today's focus</h3>
        <div style="font-size:30px;font-variant-numeric:tabular-nums">${focusToday}<span class="muted" style="font-size:15px"> / ${goal} min</span></div>
        <div class="bar" style="margin-top:8px"><i style="width:${clamp(focusToday / goal * 100, 0, 100)}%"></i></div>
        <button class="btn small primary" style="margin-top:10px" data-go="focus">Start focusing</button>
      </div>
      <div class="card">
        <h3>Streak & level</h3>
        <p style="font-size:15px">🔥 <b>${focusStreak()}</b> day streak<br>
        ⭐ Level <b>${level(totalFocusMinutes())}</b> · ${Math.round(totalFocusMinutes() / 60)}h total<br>
        ✅ <b>${doneToday}</b> tasks done today</p>
      </div>
      <div class="card">
        <h3>Quick add</h3>
        <form id="quickAdd" class="grid" style="gap:8px">
          <input id="qaTitle" placeholder="Brain dump a task…" required />
          <div class="row">
            <select id="qaWhen" style="flex:1">
              <option value="">Dump</option>
              <option value="${today}">Today</option>
              <option value="${toISO(addDays(new Date(), 1))}">Tomorrow</option>
            </select>
            <select id="qaPrio" style="flex:1">
              <option value="low">Low</option><option value="med" selected>Med</option><option value="high">High</option>
            </select>
          </div>
          <button class="btn primary small" type="submit">Add</button>
        </form>
      </div>
    </div>

    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <div class="section-title"><h3>Today's plan</h3><button class="btn small ghost" data-go="planner">Planner →</button></div>
        <div id="dashToday"></div>
        ${todayTasks.length ? '' : '<p class="muted">Nothing planned. Add something or pull from your dump.</p>'}
      </div>
      <div class="card">
        <div class="section-title"><h3>Coming up (7 days)</h3><button class="btn small ghost" data-go="reminders">All →</button></div>
        <div id="dashUp"></div>
        ${up.length ? '' : '<p class="muted">Clear skies 🌤️ nothing due this week.</p>'}
      </div>
    </div>`;

  const dt = $('#dashToday');
  todayTasks.slice(0, 8).forEach((t) => dt.appendChild(taskEl(t)));
  const du = $('#dashUp');
  up.slice(0, 8).forEach((r) => du.appendChild(reminderEl(r)));

  $('#quickAdd').addEventListener('submit', (e) => {
    e.preventDefault();
    addTask({ title: $('#qaTitle').value, scheduledFor: $('#qaWhen').value || null, priority: $('#qaPrio').value });
    renderView('dashboard');
  });
  c.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => (location.hash = b.dataset.go)));
}

/* ---------------- TASK DUMP ---------------- */
function viewDump(c) {
  const d = pdata();
  const dump = d.tasks.filter((t) => !t.scheduledFor && t.status !== 'done').sort(byOrder);
  c.innerHTML = `
    <div class="section-title"><h2>🧠 Task Dump</h2>
      <span class="pill">${dump.length} unscheduled</span></div>
    <div class="card">
      <form id="dumpAdd" class="row" style="margin-bottom:14px">
        <input id="dumpTitle" placeholder="Get it out of your head…" style="flex:1;min-width:180px" required />
        <select id="dumpPrio"><option value="low">Low</option><option value="med" selected>Med</option><option value="high">High</option></select>
        <input id="dumpEst" type="number" min="5" step="5" placeholder="min" style="width:90px" />
        <button class="btn primary" type="submit">Dump it</button>
      </form>
      <div id="dumpList" class="dropzone"></div>
      ${dump.length ? '' : '<p class="muted">Empty. A clear mind is a happy mind ✨</p>'}
    </div>
    <p class="muted" style="margin-top:10px">Tip: drag tasks into <b>Planner</b> to schedule them, or use the 📅 button on each task.</p>`;

  const list = $('#dumpList');
  dump.forEach((t) => list.appendChild(taskEl(t, { schedulable: true })));
  makeSortable(list, dump);

  $('#dumpAdd').addEventListener('submit', (e) => {
    e.preventDefault();
    addTask({ title: $('#dumpTitle').value, priority: $('#dumpPrio').value,
      estimateMin: Number($('#dumpEst').value) || null });
    renderView('dump');
  });
}

/* ---------------- PLANNER ---------------- */
function viewPlanner(c) {
  const d = pdata();
  const start = new Date();
  const days = Array.from({ length: 7 }, (_, i) => toISO(addDays(start, i)));
  const dump = d.tasks.filter((t) => !t.scheduledFor && t.status !== 'done').sort(byOrder);

  c.innerHTML = `
    <div class="section-title"><h2>🗓️ Planner</h2>
      <span class="pill">Daily &amp; weekly</span></div>
    <div class="grid cols-2" style="align-items:start">
      <div class="card">
        <h3>Unscheduled</h3>
        <div id="plDump" class="dropzone" data-day=""></div>
        ${dump.length ? '' : '<p class="muted">Dump is empty 🎉</p>'}
      </div>
      <div class="card">
        <h3>This week</h3>
        <div class="planner-grid" id="plGrid"></div>
      </div>
    </div>`;

  const plDump = $('#plDump');
  dump.forEach((t) => plDump.appendChild(taskEl(t, { schedulable: true, compact: true })));
  makeDroppable(plDump, '');

  const grid = $('#plGrid');
  days.forEach((iso, i) => {
    const col = document.createElement('div');
    col.className = 'day-col' + (i === 0 ? ' today' : '');
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${dayName(parseISO(iso))} ${prettyDate(iso)}`;
    col.innerHTML = `<h4>${label}</h4><div class="dropzone" data-day="${iso}"></div>`;
    const zone = col.querySelector('.dropzone');
    d.tasks.filter((t) => t.scheduledFor === iso && t.status !== 'done').sort(byOrder)
      .forEach((t) => zone.appendChild(taskEl(t, { schedulable: true, compact: true })));
    makeDroppable(zone, iso);
    grid.appendChild(col);
  });
}

/* ---------------- CALENDAR ---------------- */
let calCursor = new Date();
function viewCalendar(c) {
  const d = pdata();
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthName = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  c.innerHTML = `
    <div class="section-title"><h2>📅 Calendar</h2>
      <button class="btn small" id="icsBtn">⬇︎ Export .ics (Google/Apple)</button></div>
    <div class="card">
      <div class="cal-head">
        <button class="icon-btn" id="calPrev">‹</button>
        <h3 style="margin:0;flex:1;text-align:center">${monthName}</h3>
        <button class="icon-btn" id="calNext">›</button>
        <button class="btn small" id="calToday">Today</button>
        <button class="btn small primary" id="calAdd">+ Event</button>
      </div>
      <div class="cal-grid">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((x) => `<div class="cal-dow">${x}</div>`).join('')}
      </div>
      <div class="cal-grid" id="calBody"></div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Events this month</h3><div id="calList"></div>
    </div>`;

  const body = $('#calBody');
  const prevDays = startDow;
  const totalCells = Math.ceil((prevDays + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - prevDays + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const cellDate = new Date(y, m, dayNum);
    const iso = toISO(cellDate);
    const evs = d.events.filter((e) => e.date === iso);
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (inMonth ? '' : ' dim') + (iso === todayISO() ? ' today' : '');
    cell.innerHTML = `<div class="dnum">${cellDate.getDate()}</div>` +
      evs.slice(0, 3).map((e) => `<div class="cal-ev ev-${e.type}">${esc(e.title)}</div>`).join('') +
      (evs.length > 3 ? `<div class="muted" style="font-size:10px">+${evs.length - 3} more</div>` : '');
    cell.addEventListener('click', () => openEventModal({ date: iso }));
    body.appendChild(cell);
  }

  const list = $('#calList');
  const monthEvents = d.events.filter((e) => e.date.slice(0, 7) === `${y}-${pad(m + 1)}`)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  list.innerHTML = monthEvents.length ? '' : '<p class="muted">No events this month.</p>';
  monthEvents.forEach((e) => list.appendChild(eventRow(e)));

  $('#calPrev').onclick = () => { calCursor = new Date(y, m - 1, 1); viewCalendar(c); };
  $('#calNext').onclick = () => { calCursor = new Date(y, m + 1, 1); viewCalendar(c); };
  $('#calToday').onclick = () => { calCursor = new Date(); viewCalendar(c); };
  $('#calAdd').onclick = () => openEventModal({ date: todayISO() });
  $('#icsBtn').onclick = exportICS;
}

function eventRow(e) {
  const d = pdata();
  const el = document.createElement('div');
  el.className = 'task prio-' + (e.type === 'deadline' ? 'high' : e.type === 'exam' ? 'med' : 'low');
  const linked = (e.linkedTaskIds || []).map((id) => d.tasks.find((t) => t.id === id)).filter(Boolean);
  el.innerHTML = `<div class="body">
    <div class="title">${({ deadline: '⏰', exam: '📝', event: '📌' })[e.type]} ${esc(e.title)}</div>
    <div class="meta"><span>${prettyDate(e.date)}${e.time ? ' · ' + e.time : ''}</span>
      <span>${e.type}</span>${linked.length ? `<span>🔗 ${linked.length} task(s)</span>` : ''}</div>
    ${e.notes ? `<div class="meta">${esc(e.notes)}</div>` : ''}
  </div>
  <button class="icon-btn" title="Edit">✏️</button>
  <button class="icon-btn" title="Delete">🗑️</button>`;
  el.querySelector('[title="Edit"]').onclick = () => openEventModal(e);
  el.querySelector('[title="Delete"]').onclick = () => {
    if (confirm('Delete this event?')) { d.events = d.events.filter((x) => x.id !== e.id); saveDB(); renderView('calendar'); }
  };
  return el;
}

function openEventModal(ev) {
  const d = pdata();
  const editing = !!ev.id;
  const e = editing ? ev : { id: uid(), title: '', type: 'deadline', date: ev.date || todayISO(), time: '', notes: '', linkedTaskIds: [] };
  const openTasks = d.tasks.filter((t) => t.status !== 'done');
  const modal = mkModal(`
    <h3>${editing ? 'Edit' : 'New'} event</h3>
    <label class="field"><span>Title</span><input id="evTitle" value="${esc(e.title)}" placeholder="e.g. Physics midterm"></label>
    <div class="row">
      <label class="field" style="flex:1"><span>Type</span><select id="evType">
        <option value="deadline">⏰ Deadline</option><option value="exam">📝 Exam</option><option value="event">📌 Event</option>
      </select></label>
      <label class="field" style="flex:1"><span>Date</span><input id="evDate" type="date" value="${e.date}"></label>
      <label class="field" style="flex:1"><span>Time</span><input id="evTime" type="time" value="${e.time || ''}"></label>
    </div>
    <label class="field"><span>Notes</span><textarea id="evNotes">${esc(e.notes)}</textarea></label>
    <label class="field"><span>Link tasks to this event</span>
      <select id="evLinks" multiple size="${Math.min(5, Math.max(2, openTasks.length))}">
        ${openTasks.map((t) => `<option value="${t.id}" ${e.linkedTaskIds?.includes(t.id) ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}
      </select></label>
    <div class="row" style="justify-content:flex-end;margin-top:10px">
      ${editing ? '<button class="btn danger" id="evDel">Delete</button>' : ''}
      <button class="btn" id="evCancel">Cancel</button>
      <button class="btn primary" id="evSave">Save</button>
    </div>`);
  $('#evType').value = e.type;
  $('#evSave').onclick = () => {
    e.title = $('#evTitle').value.trim() || 'Untitled';
    e.type = $('#evType').value; e.date = $('#evDate').value || todayISO();
    e.time = $('#evTime').value; e.notes = $('#evNotes').value.trim();
    e.linkedTaskIds = [...$('#evLinks').selectedOptions].map((o) => o.value);
    // set due date on linked tasks
    e.linkedTaskIds.forEach((id) => { const t = d.tasks.find((x) => x.id === id); if (t && !t.due) t.due = e.date; });
    if (!editing) d.events.push(e);
    saveDB(); modal.close(); renderView('calendar');
    toast(editing ? 'Event updated' : 'Event added');
  };
  $('#evCancel').onclick = () => modal.close();
  if (editing) $('#evDel').onclick = () => {
    if (confirm('Delete this event?')) { d.events = d.events.filter((x) => x.id !== e.id); saveDB(); modal.close(); renderView('calendar'); }
  };
}

/* ---------------- FOCUS TIMER ---------------- */
const Timer = {
  running: false, phase: 'focus', remaining: 0, total: 0, taskId: null, startedAt: null, iv: null,
};
function fmtClock(sec) { sec = Math.max(0, Math.round(sec)); return `${pad((sec / 60) | 0)}:${pad(sec % 60)}`; }

function viewFocus(c) {
  const p = profile(); const d = pdata();
  if (!Timer.running && !Timer.remaining) { Timer.total = p.focusDuration * 60; Timer.remaining = Timer.total; }
  const openTasks = d.tasks.filter((t) => t.status !== 'done').sort(byOrder);
  const todaySessions = d.sessions.filter((s) => s.type === 'focus' && (s.endedAt || s.startedAt || '').slice(0, 10) === todayISO());
  const todayMin = todaySessions.filter((s) => s.completed).reduce((a, s) => a + s.minutes, 0);

  c.innerHTML = `
    <div class="section-title"><h2>⏳ Focus</h2><span class="pill">${todayMin} min today · ${todaySessions.length} sessions</span></div>
    <div class="card">
      <div class="timer-wrap">
        <div class="timer-ring">
          <svg width="260" height="260"><circle cx="130" cy="130" r="118" fill="none" stroke="var(--surface-2)" stroke-width="16"/>
            <circle id="ring" cx="130" cy="130" r="118" fill="none" stroke="var(--accent)" stroke-width="16"
              stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 118}" stroke-dashoffset="0"/></svg>
          <div class="phase" id="tPhase">focus</div>
          <div class="time" id="tTime">${fmtClock(Timer.remaining)}</div>
        </div>
        <div class="row" style="justify-content:center">
          <button class="btn primary" id="tStart">${Timer.running ? 'Pause' : 'Start'}</button>
          <button class="btn" id="tReset">Reset</button>
          <button class="btn ghost" id="tSkip">Skip phase</button>
        </div>
        <div class="row" style="justify-content:center">
          <label class="field" style="margin:0"><span>Focus length (min)</span>
            <input id="tLen" type="number" min="5" max="180" step="5" value="${p.focusDuration}" style="width:110px"></label>
          <label class="field" style="margin:0"><span>Break (min)</span>
            <input id="tBreak" type="number" min="1" max="60" value="${p.breakDuration}" style="width:90px"></label>
          <label class="field" style="margin:0"><span>Working on</span>
            <select id="tTask" style="min-width:160px"><option value="">— nothing specific —</option>
              ${openTasks.map((t) => `<option value="${t.id}" ${Timer.taskId === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}
            </select></label>
        </div>
        <label class="field" style="text-align:center;margin:0"><span>Daily goal (min)</span>
          <input id="tGoal" type="number" min="15" step="15" value="${d.dailyGoalMin}" style="width:110px;margin:0 auto"></label>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Today's sessions</h3>
      <div id="sessLog"></div>
      ${todaySessions.length ? '' : '<p class="muted">No sessions yet. One 45-minute block is a great start.</p>'}
    </div>`;

  const log = $('#sessLog');
  todaySessions.slice().reverse().forEach((s) => {
    const t = s.taskId ? d.tasks.find((x) => x.id === s.taskId) : null;
    const row = document.createElement('div');
    row.className = 'task';
    row.innerHTML = `<div class="body"><div class="title">${s.completed ? '✅' : '⏹️'} ${s.minutes} min ${s.type}</div>
      <div class="meta"><span>${new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      ${t ? `<span>· ${esc(t.title)}</span>` : ''}</div></div>`;
    log.appendChild(row);
  });

  $('#tStart').onclick = toggleTimer;
  $('#tReset').onclick = () => { stopTimer(false); Timer.remaining = Timer.total; paintTimer(); };
  $('#tSkip').onclick = () => { stopTimer(false); nextPhase(); };
  $('#tLen').onchange = (e) => { p.focusDuration = clamp(+e.target.value || 45, 5, 180); saveDB();
    if (!Timer.running && Timer.phase === 'focus') { Timer.total = p.focusDuration * 60; Timer.remaining = Timer.total; paintTimer(); } updateTopbar(); };
  $('#tBreak').onchange = (e) => { p.breakDuration = clamp(+e.target.value || 10, 1, 60); saveDB(); };
  $('#tGoal').onchange = (e) => { d.dailyGoalMin = clamp(+e.target.value || 120, 15, 1000); saveDB(); };
  $('#tTask').onchange = (e) => { Timer.taskId = e.target.value || null; };
  Timer.taskId = Timer.taskId || null;
  paintTimer();
}

function paintTimer() {
  const time = $('#tTime'), phase = $('#tPhase'), ring = $('#ring');
  if (!time) return;
  time.textContent = fmtClock(Timer.remaining);
  phase.textContent = Timer.phase;
  const circ = 2 * Math.PI * 118;
  const frac = Timer.total ? Timer.remaining / Timer.total : 0;
  ring.style.strokeDashoffset = String(circ * (1 - frac));
  ring.style.stroke = Timer.phase === 'focus' ? 'var(--accent)' : 'var(--good)';
  const st = $('#tStart'); if (st) st.textContent = Timer.running ? 'Pause' : (Timer.remaining < Timer.total ? 'Resume' : 'Start');
  // widget mirror
  const wt = $('#widgetTimer'); if (wt) wt.textContent = fmtClock(Timer.remaining);
  document.title = Timer.running ? `${fmtClock(Timer.remaining)} · ${Timer.phase} — Café` : "Sister's Café — Study Tracker";
}

function toggleTimer() { Timer.running ? stopTimer(false) : startTimer(); }
function startTimer() {
  Timer.running = true;
  if (!Timer.startedAt) Timer.startedAt = Date.now();
  const endAt = Date.now() + Timer.remaining * 1000;
  Timer.iv = setInterval(() => {
    Timer.remaining = (endAt - Date.now()) / 1000;
    if (Timer.remaining <= 0) { Timer.remaining = 0; paintTimer(); completePhase(); }
    else paintTimer();
  }, 250);
  paintTimer();
}
function stopTimer(completed) {
  Timer.running = false; clearInterval(Timer.iv); Timer.iv = null;
  paintTimer();
}
function completePhase() {
  stopTimer(true);
  beep();
  const d = pdata();
  const mins = Math.round(Timer.total / 60);
  if (Timer.phase === 'focus') {
    d.sessions.push({ id: uid(), type: 'focus', minutes: mins, taskId: Timer.taskId,
      startedAt: new Date(Timer.startedAt || Date.now()).toISOString(), endedAt: new Date().toISOString(), completed: true });
    saveDB();
    notify('Focus complete! 🎉', `${mins} minutes done. Time for a break.`);
    toast('Nice. Session logged ✅'); confetti();
    checkAchievements();
  } else {
    notify('Break over ☕', 'Ready for another round?');
  }
  Timer.startedAt = null;
  nextPhase();
  updateTopbar();
  if (currentView() === 'focus') renderView('focus');
}
function nextPhase() {
  const p = profile();
  Timer.phase = Timer.phase === 'focus' ? 'break' : 'focus';
  Timer.total = (Timer.phase === 'focus' ? p.focusDuration : p.breakDuration) * 60;
  Timer.remaining = Timer.total;
  Timer.startedAt = null;
  paintTimer();
}

let audioCtx;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    [880, 660, 990].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = f; o.type = 'sine';
      o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.001, now + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.16);
      o.start(now + i * 0.18); o.stop(now + i * 0.18 + 0.18);
    });
  } catch (e) { /* ignore */ }
}

/* ---------------- REMINDERS ---------------- */
function upcoming(days) {
  const d = pdata(); const out = [];
  const limit = toISO(addDays(new Date(), days));
  d.events.forEach((e) => {
    if (e.date >= todayISO() && e.date <= limit)
      out.push({ kind: 'event', id: e.id, title: e.title, type: e.type, date: e.date, time: e.time, ref: e });
  });
  d.tasks.forEach((t) => {
    if (t.due && t.status !== 'done' && t.due >= todayISO() && t.due <= limit)
      out.push({ kind: 'task', id: t.id, title: t.title, type: 'task due', date: t.due, ref: t });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
}

function reminderEl(r) {
  const el = document.createElement('div');
  const n = daysUntil(r.date);
  const when = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days`;
  const cls = n <= 1 ? 'due-over' : n <= 3 ? 'due-soon' : '';
  const icon = { deadline: '⏰', exam: '📝', event: '📌', 'task due': '✅' }[r.type] || '•';
  el.className = 'task';
  el.innerHTML = `<div class="body"><div class="title">${icon} ${esc(r.title)}</div>
    <div class="meta"><span class="${cls}">${when} · ${prettyDate(r.date)}${r.time ? ' ' + r.time : ''}</span><span>${r.type}</span></div></div>
    <button class="icon-btn" title="Remind">🔔</button>`;
  el.querySelector('[title="Remind"]').onclick = () => {
    ensureNotifyPermission().then((ok) => {
      if (!ok) return toast('Enable notifications in Settings first');
      notify('Reminder set', `You'll be nudged about "${r.title}"`);
      // schedule a same-session nudge 5s before if it's within the hour (demo) or at 9am day-of otherwise handled by daily check
      toast('🔔 Reminder on');
    });
  };
  return el;
}

function viewReminders(c) {
  const p = profile();
  const list7 = upcoming(7);
  const list30 = upcoming(30).filter((r) => daysUntil(r.date) > 7);
  c.innerHTML = `
    <div class="section-title"><h2>🔔 Reminders</h2>
      <label class="row" style="gap:6px;font-size:13px"><input type="checkbox" id="notifToggle" style="width:auto" ${p.notifOptIn ? 'checked' : ''}> notifications</label></div>
    <div class="card">
      <h3>Next 7 days</h3><div id="rem7"></div>
      ${list7.length ? '' : '<p class="muted">Nothing coming up. Breathe 🌿</p>'}
    </div>
    <div class="card" style="margin-top:14px">
      <div class="section-title"><h3>Later this month</h3><button class="btn small" id="icsBtn2">⬇︎ Sync to calendar (.ics)</button></div>
      <div id="rem30"></div>
      ${list30.length ? '' : '<p class="muted">Nothing further out.</p>'}
    </div>
    <p class="muted" style="margin-top:10px">Notifications work while the app (or its installed PWA) is open in the background.
    For phone/laptop native alerts, export <b>.ics</b> and import into Google or Apple Calendar — those apps handle the ringing.</p>`;

  list7.forEach((r) => $('#rem7').appendChild(reminderEl(r)));
  list30.forEach((r) => $('#rem30').appendChild(reminderEl(r)));
  $('#icsBtn2').onclick = exportICS;
  $('#notifToggle').onchange = async (e) => {
    if (e.target.checked) {
      const ok = await ensureNotifyPermission();
      p.notifOptIn = ok; e.target.checked = ok;
      if (ok) { toast('Notifications on 🔔'); notify('Notifications enabled', 'We\'ll remind you about upcoming deadlines.'); }
      else toast('Permission denied by browser');
    } else { p.notifOptIn = false; }
    saveDB();
  };
}

/* ---------------- STATS ---------------- */
function viewStats(c) {
  const d = pdata();
  const focus = d.sessions.filter((s) => s.type === 'focus' && s.completed);
  const totalMin = focus.reduce((a, s) => a + s.minutes, 0);
  const byDay = {};
  focus.forEach((s) => { const k = (s.endedAt || s.startedAt).slice(0, 10); byDay[k] = (byDay[k] || 0) + s.minutes; });
  const doneTasks = d.tasks.filter((t) => t.status === 'done');

  // 26 weeks heatmap
  const weeks = 26;
  const end = new Date(); end.setDate(end.getDate() + (6 - end.getDay()));
  const cells = [];
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const day = addDays(end, -i);
    const iso = toISO(day);
    const min = byDay[iso] || 0;
    const lvl = min === 0 ? 0 : min < 25 ? 1 : min < 50 ? 2 : min < 100 ? 3 : 4;
    cells.push(`<div class="hm-cell hm-${lvl}" title="${iso}: ${min} min"></div>`);
  }

  // last 7 days bar
  const last7 = Array.from({ length: 7 }, (_, i) => { const iso = toISO(addDays(new Date(), i - 6)); return { iso, min: byDay[iso] || 0 }; });
  const max7 = Math.max(60, ...last7.map((x) => x.min));

  c.innerHTML = `
    <div class="section-title"><h2>📈 Stats</h2></div>
    <div class="grid cols-3">
      <div class="card"><h3>Focus total</h3><div style="font-size:28px">${Math.floor(totalMin / 60)}h ${totalMin % 60}m</div><p class="muted">${focus.length} sessions</p></div>
      <div class="card"><h3>Current streak</h3><div style="font-size:28px">🔥 ${focusStreak()}</div><p class="muted">Best: ${bestStreak()} days</p></div>
      <div class="card"><h3>Tasks completed</h3><div style="font-size:28px">${doneTasks.length}</div><p class="muted">${d.tasks.length} total ever</p></div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Last 7 days</h3>
      <div class="row" style="align-items:flex-end;gap:10px;height:120px">
        ${last7.map((x) => `<div style="flex:1;text-align:center">
          <div style="height:${(x.min / max7 * 90) | 0}px;background:var(--accent);border-radius:6px 6px 0 0;min-height:3px"></div>
          <div class="muted" style="font-size:11px;margin-top:4px">${dayName(parseISO(x.iso))}<br>${x.min}m</div></div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Focus heatmap (26 weeks)</h3>
      <div class="heatmap">${cells.join('')}</div>
      <p class="muted" style="font-size:12px;margin-top:8px">Less <span class="hm-cell hm-1" style="display:inline-block;vertical-align:middle"></span>
        <span class="hm-cell hm-2" style="display:inline-block;vertical-align:middle"></span>
        <span class="hm-cell hm-3" style="display:inline-block;vertical-align:middle"></span>
        <span class="hm-cell hm-4" style="display:inline-block;vertical-align:middle"></span> More</p>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Achievements</h3>
      <div id="achList"></div>
    </div>`;

  const al = $('#achList');
  ACHIEVEMENTS.forEach((a) => {
    const got = d.achievements[a.id];
    const row = document.createElement('div');
    row.className = 'ach' + (got ? '' : ' locked');
    row.innerHTML = `<span class="emoji">${a.emoji}</span><div><b>${a.name}</b><br><span class="muted" style="font-size:12px">${a.desc}</span></div>
      ${got ? `<span class="pill" style="margin-left:auto">${prettyDate(got.slice(0, 10))}</span>` : '<span class="pill" style="margin-left:auto">🔒</span>'}`;
    al.appendChild(row);
  });
}

/* ---------------- SETTINGS ---------------- */
function viewSettings(c) {
  const p = profile();
  c.innerHTML = `
    <div class="section-title"><h2>⚙️ Settings</h2></div>
    <div class="card">
      <h3>Profile</h3>
      <label class="field"><span>Name</span><input id="setName" value="${esc(p.name)}"></label>
      <label class="field"><span>Avatar</span>
        <div class="row" id="avatarPick">${AVATARS.map((a) => `<button class="btn small ${a === p.avatar ? 'primary' : ''}" data-av="${a}">${a}</button>`).join('')}</div></label>
      <label class="field"><span>Theme (aesthetic)</span>
        <div class="theme-swatches" id="setThemes"></div></label>
      <label class="field"><span>Appearance</span>
        <div class="row" id="setMode">
          <button type="button" class="btn small ${p.mode !== 'dark' ? 'primary' : ''}" data-mode="light">☀️ Light</button>
          <button type="button" class="btn small ${p.mode === 'dark' ? 'primary' : ''}" data-mode="dark">🌙 Dark</button>
        </div></label>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Focus defaults</h3>
      <div class="row">
        <label class="field"><span>Focus (min)</span><input id="setFocus" type="number" min="5" max="180" step="5" value="${p.focusDuration}"></label>
        <label class="field"><span>Break (min)</span><input id="setBreak" type="number" min="1" max="60" value="${p.breakDuration}"></label>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Data</h3>
      <div class="row">
        <button class="btn" id="expJson">⬇︎ Export backup (JSON)</button>
        <button class="btn" id="impJson">⬆︎ Import backup</button>
        <button class="btn" id="expIcs">⬇︎ Export calendar (.ics)</button>
        <input type="file" id="impFile" accept="application/json" hidden>
      </div>
      <p class="muted" style="font-size:12px;margin-top:8px">Data lives only in this browser/device. Export regularly to move between devices.</p>
      <button class="btn danger" id="wipe" style="margin-top:8px">Delete this profile's data…</button>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Install &amp; widgets</h3>
      <p class="muted" style="font-size:13px">
        • <b>Desktop / phone app:</b> open in Chrome/Edge/Safari → menu → “Install app” / “Add to Home Screen”.<br>
        • <b>Widget mode:</b> <a href="?widget=1#widget">open compact widget</a> — add it to your home screen for a glanceable timer + reminders.<br>
        • <b>Keyboard:</b> <kbd>g</kbd> then <kbd>d/p/c/f/r</kbd> to jump views · <kbd>space</kbd> start/pause timer.</p>
      <button class="btn primary" id="installBtn" ${deferredPrompt ? '' : 'disabled'}>Install app</button>
    </div>`;

  $('#setName').onchange = (e) => { p.name = e.target.value.trim() || p.name; saveDB(); toast('Saved'); };
  $('#avatarPick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-av]'); if (!b) return;
    p.avatar = b.dataset.av; saveDB(); $('#profileAvatar').textContent = p.avatar; viewSettings(c);
  });
  const st = $('#setThemes');
  THEMES.forEach((t) => {
    const s = document.createElement('button');
    s.type = 'button'; s.className = 'swatch'; s.style.background = t.color;
    s.setAttribute('aria-pressed', String(t.id === p.theme));
    s.innerHTML = `<span>${t.name}</span>`;
    s.onclick = () => { p.theme = t.id; saveDB(); applyTheme(t.id, p.mode); viewSettings(c); updateTopbar(); };
    st.appendChild(s);
  });
  $$('#setMode [data-mode]').forEach((b) => b.onclick = () => {
    p.mode = b.dataset.mode; saveDB(); applyTheme(p.theme, p.mode);
    $('#modeToggle').textContent = p.mode === 'dark' ? '☀️' : '🌙';
    viewSettings(c);
  });
  $('#setFocus').onchange = (e) => { p.focusDuration = clamp(+e.target.value || 45, 5, 180); saveDB(); };
  $('#setBreak').onchange = (e) => { p.breakDuration = clamp(+e.target.value || 10, 1, 60); saveDB(); };
  $('#expJson').onclick = exportJSON;
  $('#impJson').onclick = () => $('#impFile').click();
  $('#impFile').onchange = importJSON;
  $('#expIcs').onclick = exportICS;
  $('#wipe').onclick = () => {
    if (confirm('Erase all tasks, events, sessions and stats for this profile? The profile itself stays.')) {
      DB.data[DB.activeProfileId] = freshProfileData(); saveDB(); toast('Profile data cleared'); renderView('settings');
    }
  };
  $('#installBtn').onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#installBtn').disabled = true;
  };
}

/* ============================================================
   TASK primitives
   ============================================================ */
function addTask(partial) {
  const d = pdata();
  const t = {
    id: uid(), title: (partial.title || '').trim() || 'Untitled', notes: partial.notes || '',
    status: 'open', scheduledFor: partial.scheduledFor || null, priority: partial.priority || 'med',
    estimateMin: partial.estimateMin || null, due: partial.due || null, eventId: partial.eventId || null,
    tags: partial.tags || [], createdAt: new Date().toISOString(), completedAt: null,
    order: (d.tasks.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1),
  };
  if (!t.title.trim()) return;
  d.tasks.push(t); saveDB();
  return t;
}
const byOrder = (a, b) => (a.order || 0) - (b.order || 0);

function taskEl(t, opts = {}) {
  const d = pdata();
  const el = document.createElement('div');
  el.className = `task prio-${t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : 'med'}` +
    (t.status === 'done' ? ' done' : '');
  el.draggable = !!opts.schedulable;
  el.dataset.id = t.id;
  const ev = t.eventId ? d.events.find((e) => e.id === t.eventId) : null;
  let dueTxt = '';
  if (t.due) {
    const n = daysUntil(t.due);
    dueTxt = `<span class="${n <= 1 ? 'due-over' : n <= 3 ? 'due-soon' : ''}">📅 ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : n < 0 ? `${-n}d late` : prettyDate(t.due)}</span>`;
  }
  el.innerHTML = `
    ${opts.schedulable ? '<span class="grip" title="Drag to plan">⠿</span>' : ''}
    <button class="check">${t.status === 'done' ? '✓' : ''}</button>
    <div class="body">
      <div class="title" contenteditable="plaintext-only">${esc(t.title)}</div>
      <div class="meta">
        ${t.estimateMin ? `<span>⏱ ${t.estimateMin}m</span>` : ''}
        ${dueTxt}
        ${ev ? `<span>🔗 ${esc(ev.title)}</span>` : ''}
        ${t.scheduledFor ? `<span>🗓 ${t.scheduledFor === todayISO() ? 'today' : prettyDate(t.scheduledFor)}</span>` : ''}
        ${(t.tags || []).map((x) => `<span class="tag">${esc(x)}</span>`).join('')}
      </div>
    </div>
    <button class="icon-btn" title="Options">⋯</button>`;

  el.querySelector('.check').onclick = () => toggleDone(t);
  const titleEl = el.querySelector('.title');
  titleEl.addEventListener('blur', () => {
    const v = titleEl.textContent.trim();
    if (v && v !== t.title) { t.title = v; saveDB(); }
    else titleEl.textContent = t.title;
  });
  titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } });
  el.querySelector('[title="Options"]').onclick = () => openTaskModal(t);

  if (opts.schedulable) {
    el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', t.id); el.classList.add('dragging'); });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  }
  return el;
}

function toggleDone(t) {
  const d = pdata();
  const wasDump = !t.scheduledFor;
  if (t.status === 'done') { t.status = 'open'; t.completedAt = null; }
  else {
    t.status = 'done'; t.completedAt = new Date().toISOString();
    confetti(); toast('✓ ' + (['Nice!', 'Done!', 'Crushed it', 'One less thing'][Math.random() * 4 | 0]));
  }
  saveDB();
  checkAchievements();
  renderView(currentView());
}

function openTaskModal(t) {
  const d = pdata();
  const events = d.events;
  const modal = mkModal(`
    <h3>Task</h3>
    <label class="field"><span>Title</span><input id="tkTitle" value="${esc(t.title)}"></label>
    <label class="field"><span>Notes</span><textarea id="tkNotes">${esc(t.notes)}</textarea></label>
    <div class="row">
      <label class="field" style="flex:1"><span>Priority</span><select id="tkPrio">
        <option value="low">Low</option><option value="med">Med</option><option value="high">High</option></select></label>
      <label class="field" style="flex:1"><span>Estimate (min)</span><input id="tkEst" type="number" min="5" step="5" value="${t.estimateMin || ''}"></label>
      <label class="field" style="flex:1"><span>Schedule for</span><input id="tkSched" type="date" value="${t.scheduledFor || ''}"></label>
    </div>
    <div class="row">
      <label class="field" style="flex:1"><span>Due date</span><input id="tkDue" type="date" value="${t.due || ''}"></label>
      <label class="field" style="flex:1"><span>Link to event</span><select id="tkEvent">
        <option value="">— none —</option>
        ${events.map((e) => `<option value="${e.id}" ${t.eventId === e.id ? 'selected' : ''}>${esc(e.title)} (${prettyDate(e.date)})</option>`).join('')}
      </select></label>
    </div>
    <label class="field"><span>Tags (comma separated)</span><input id="tkTags" value="${esc((t.tags || []).join(', '))}"></label>
    <div class="row" style="justify-content:flex-end;margin-top:8px">
      <button class="btn danger" id="tkDel">Delete</button>
      <button class="btn" id="tkCancel">Cancel</button>
      <button class="btn primary" id="tkSave">Save</button>
    </div>`);
  $('#tkPrio').value = t.priority;
  $('#tkSave').onclick = () => {
    t.title = $('#tkTitle').value.trim() || t.title;
    t.notes = $('#tkNotes').value.trim();
    t.priority = $('#tkPrio').value;
    t.estimateMin = Number($('#tkEst').value) || null;
    t.scheduledFor = $('#tkSched').value || null;
    t.due = $('#tkDue').value || null;
    t.eventId = $('#tkEvent').value || null;
    if (t.eventId) {
      const e = d.events.find((x) => x.id === t.eventId);
      if (e && !e.linkedTaskIds.includes(t.id)) e.linkedTaskIds.push(t.id);
      if (e && !t.due) t.due = e.date;
    }
    t.tags = $('#tkTags').value.split(',').map((x) => x.trim()).filter(Boolean);
    saveDB(); modal.close(); renderView(currentView());
  };
  $('#tkCancel').onclick = () => modal.close();
  $('#tkDel').onclick = () => {
    if (confirm('Delete this task?')) {
      d.tasks = d.tasks.filter((x) => x.id !== t.id);
      d.events.forEach((e) => e.linkedTaskIds = e.linkedTaskIds.filter((id) => id !== t.id));
      saveDB(); modal.close(); renderView(currentView());
    }
  };
}

/* drag/drop scheduling */
function makeDroppable(zone, iso) {
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('over');
    const id = e.dataTransfer.getData('text/plain');
    const t = pdata().tasks.find((x) => x.id === id);
    if (!t) return;
    t.scheduledFor = iso || null;
    bumpPlannerAchievement();
    saveDB(); renderView(currentView());
  });
}
function makeSortable(list, items) {
  let dragEl = null;
  list.addEventListener('dragstart', (e) => { dragEl = e.target.closest('.task'); });
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const after = [...list.querySelectorAll('.task:not(.dragging)')].find((el) => {
      const r = el.getBoundingClientRect(); return e.clientY < r.top + r.height / 2;
    });
    if (!dragEl) return;
    if (after) list.insertBefore(dragEl, after); else list.appendChild(dragEl);
  });
  list.addEventListener('drop', () => {
    [...list.querySelectorAll('.task')].forEach((el, i) => {
      const t = items.find((x) => x.id === el.dataset.id); if (t) t.order = i + 1;
    });
    saveDB();
  });
}

/* ============================================================
   ACHIEVEMENTS + STREAKS
   ============================================================ */
function totalFocusMinutes() {
  return pdata().sessions.filter((s) => s.type === 'focus' && s.completed).reduce((a, s) => a + s.minutes, 0);
}
function focusDays() {
  const set = new Set(pdata().sessions.filter((s) => s.type === 'focus' && s.completed)
    .map((s) => (s.endedAt || s.startedAt).slice(0, 10)));
  return set;
}
function focusStreak() {
  const set = focusDays();
  let n = 0; let cur = new Date();
  // allow today not-yet-done: start from today if present else yesterday
  if (!set.has(toISO(cur))) cur = addDays(cur, -1);
  while (set.has(toISO(cur))) { n++; cur = addDays(cur, -1); }
  return n;
}
function bestStreak() {
  const days = [...focusDays()].sort();
  let best = 0, run = 0, prev = null;
  days.forEach((d) => {
    if (prev && daysUntilBetween(prev, d) === 1) run++; else run = 1;
    best = Math.max(best, run); prev = d;
  });
  return best;
}
const daysUntilBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

function unlock(id) {
  const d = pdata();
  if (d.achievements[id]) return;
  d.achievements[id] = new Date().toISOString();
  saveDB();
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  toast(`${a.emoji} Achievement: ${a.name}`);
  confetti();
}
function checkAchievements() {
  const d = pdata();
  const focus = d.sessions.filter((s) => s.type === 'focus' && s.completed);
  if (focus.length >= 1) unlock('first_focus');
  if (focus.length >= 10) unlock('focus_10');
  if (focus.length >= 50) unlock('focus_50');
  if (focusStreak() >= 3) unlock('streak_3');
  if (focusStreak() >= 7) unlock('streak_7');
  if (totalFocusMinutes() >= 6000) unlock('century');
  const lastHour = focus.length ? new Date(focus[focus.length - 1].startedAt).getHours() : 12;
  if (focus.length && lastHour < 8) unlock('early_bird');
  if (focus.length && lastHour >= 22) unlock('night_owl');
  updateTopbar();
}
function bumpPlannerAchievement() {
  const d = pdata();
  d._planned = (d._planned || 0) + 1;
  if (d._planned >= 20) unlock('planner_pro');
}

/* ============================================================
   NOTIFICATIONS + REMINDER SCHEDULER
   ============================================================ */
async function ensureNotifyPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}
function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  navigator.serviceWorker?.ready.then((reg) => {
    if (reg) reg.active?.postMessage({ type: 'notify', title, body, tag: 'cafe-' + Date.now() });
    else new Notification(title, { body, icon: './icons/icon.svg' });
  }).catch(() => { try { new Notification(title, { body }); } catch (e) {} });
}

function scheduleReminderChecks() {
  runDailyReminderDigest();
  setInterval(runDailyReminderDigest, 60 * 60 * 1000); // hourly
}
function runDailyReminderDigest() {
  const p = profile(); if (!p || !p.notifOptIn) return;
  const key = 'cafe-digest-' + DB.activeProfileId;
  if (localStorage.getItem(key) === todayISO()) return;
  const hr = new Date().getHours();
  if (hr < 8) return; // wait until morning
  const items = upcoming(7).filter((r) => daysUntil(r.date) <= 3);
  if (items.length) {
    notify(`☕ ${items.length} thing${items.length > 1 ? 's' : ''} coming up`,
      items.slice(0, 4).map((r) => `${r.title} — ${daysUntil(r.date) === 0 ? 'today' : daysUntil(r.date) + 'd'}`).join(' · '));
  }
  localStorage.setItem(key, todayISO());
}

/* ============================================================
   IMPORT / EXPORT
   ============================================================ */
function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportJSON() {
  const payload = { app: 'sisters-cafe-study-tracker', version: 1, exportedAt: new Date().toISOString(),
    profile: profile(), data: pdata() };
  download(`cafe-study-${profile().name}-${todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}
function importJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const obj = JSON.parse(rd.result);
      if (!obj.data) throw new Error('bad file');
      if (obj.profile) {
        // merge into a new profile to avoid clobbering
        const id = uid();
        const np = { ...obj.profile, id, name: (obj.profile.name || 'Imported') + ' (import)' };
        DB.profiles.push(np); DB.data[id] = obj.data;
        saveDB(); toast('Imported as new profile'); renderGate();
      }
    } catch (err) { toast('⚠️ Invalid backup file'); }
  };
  rd.readAsText(file);
}
function icsDate(dateStr, timeStr) {
  const d = dateStr.replace(/-/g, '');
  if (timeStr) return `${d}T${timeStr.replace(':', '')}00`;
  return d; // all-day
}
function exportICS() {
  const d = pdata();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sisters Cafe//Study Tracker//EN', 'CALSCALE:GREGORIAN'];
  const push = (title, dateStr, timeStr, desc, uidStr) => {
    lines.push('BEGIN:VEVENT', `UID:${uidStr}@cafe-study`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
      timeStr ? `DTSTART:${icsDate(dateStr, timeStr)}` : `DTSTART;VALUE=DATE:${icsDate(dateStr)}`,
      `SUMMARY:${(title || '').replace(/[,;\n]/g, ' ')}`,
      desc ? `DESCRIPTION:${desc.replace(/[,;\n]/g, ' ')}` : "DESCRIPTION:From Sister's Cafe Study Tracker",
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT');
  };
  d.events.forEach((e) => push(`${({ deadline: '⏰', exam: '📝', event: '📌' })[e.type]} ${e.title}`, e.date, e.time, e.notes, e.id));
  d.tasks.filter((t) => t.due && t.status !== 'done').forEach((t) => push(`✅ ${t.title}`, t.due, '', t.notes, t.id));
  lines.push('END:VCALENDAR');
  download(`cafe-study-${profile().name}.ics`, lines.join('\r\n'), 'text/calendar');
  toast('Calendar exported — import into Google/Apple Calendar');
}

/* ============================================================
   MODAL
   ============================================================ */
function mkModal(html) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal">${html}</div>`;
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.appendChild(back);
  function close() { back.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  return { close, el: back };
}

/* ============================================================
   WIDGET MODE
   ============================================================ */
function renderWidget() {
  $('#gate').hidden = true; $('#app').hidden = true; $('#widget').hidden = false;
  const p = profile();
  if (!p) { $('#widgetProfile').textContent = 'Open app to set up'; return; }
  applyTheme(p.theme, p.mode);
  $('#widgetProfile').textContent = `${p.avatar || '☕'} ${p.name}`;
  Timer.total = Timer.total || p.focusDuration * 60;
  Timer.remaining = Timer.remaining || Timer.total;
  $('#widgetTimer').textContent = fmtClock(Timer.remaining);

  const up = upcoming(7).slice(0, 4);
  $('#widgetReminders').innerHTML = up.length
    ? up.map((r) => `<li>${({ deadline: '⏰', exam: '📝', event: '📌', 'task due': '✅' })[r.type] || '•'} ${esc(r.title)} <span class="muted">· ${daysUntil(r.date) === 0 ? 'today' : daysUntil(r.date) + 'd'}</span></li>`).join('')
    : '<li class="muted">Nothing coming up 🌿</li>';

  const tt = pdata().tasks.filter((t) => t.scheduledFor === todayISO() && t.status !== 'done').slice(0, 4);
  $('#widgetTasks').innerHTML = tt.length
    ? tt.map((t) => `<li>◦ ${esc(t.title)}</li>`).join('')
    : '<li class="muted">No tasks planned</li>';

  $('#widgetStart').onclick = () => { Timer.running ? stopTimer(false) : startTimer(); $('#widgetStart').textContent = Timer.running ? 'Pause' : 'Focus'; };
  $('#widgetReset').onclick = () => { stopTimer(false); Timer.remaining = Timer.total; $('#widgetTimer').textContent = fmtClock(Timer.remaining); };
  $$('[data-open-app]').forEach((b) => b.onclick = () => { location.href = './index.html#dashboard'; });
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
let gPressed = false;
document.addEventListener('keydown', (e) => {
  if ($('#app').hidden) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  if (e.key === 'g') { gPressed = true; setTimeout(() => (gPressed = false), 800); return; }
  if (gPressed) {
    const map = { d: 'dashboard', p: 'planner', c: 'calendar', f: 'focus', r: 'reminders', s: 'stats', t: 'dump' };
    if (map[e.key]) { location.hash = map[e.key]; gPressed = false; }
    return;
  }
  if (e.key === ' ' && currentView() === 'focus') { e.preventDefault(); toggleTimer(); }
});

/* ============================================================
   PWA install + service worker
   ============================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e;
  const b = $('#installBtn'); if (b) b.disabled = false; });
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

/* ============================================================
   BOOT
   ============================================================ */
function init() {
  const params = new URLSearchParams(location.search);
  const widgetMode = params.get('widget') === '1' || location.hash === '#widget';

  if (!DB.activeProfileId || !profile()) {
    if (widgetMode && DB.profiles[0]) { DB.activeProfileId = DB.profiles[0].id; }
  }

  if (widgetMode && profile()) { renderWidget(); return; }
  if (profile()) { applyTheme(profile().theme, profile().mode); bootApp(); }
  else renderGate();
}
init();

})();
