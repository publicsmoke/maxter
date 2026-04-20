const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

let servers = [];
const activeSessions = new Map();
let activeTabId = null;
let editingId = null;
let authMode = 'password';
let homeDir = '/';
let currentTheme = 'obsidian';

// ─── Themes ───
const THEMES = [
  {
    id: 'obsidian', name: 'OBSIDIAN',
    xterm: {
      background: '#08080c', foreground: '#d0d0d5',
      cursor: '#9cb3d4', cursorAccent: '#08080c',
      selectionBackground: '#2a3548',
      black: '#0a0a0d', red: '#e06c75', green: '#98c379', yellow: '#e5c07b',
      blue: '#6695c4', magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf',
      brightBlack: '#5c6370', brightRed: '#e06c75', brightGreen: '#98c379', brightYellow: '#e5c07b',
      brightBlue: '#9cb3d4', brightMagenta: '#c678dd', brightCyan: '#56b6c2', brightWhite: '#ffffff',
    },
  },
  {
    id: 'polar', name: 'POLAR',
    xterm: {
      background: '#ffffff', foreground: '#1a1a1f',
      cursor: '#0066cc', cursorAccent: '#ffffff',
      selectionBackground: '#cde0f6',
      black: '#0a0a0f', red: '#c0392b', green: '#0f8a3a', yellow: '#b07400',
      blue: '#0066cc', magenta: '#8e44ad', cyan: '#0f8f7f', white: '#666670',
      brightBlack: '#333340', brightRed: '#e74c3c', brightGreen: '#14a84a', brightYellow: '#d99600',
      brightBlue: '#3498db', brightMagenta: '#9b59b6', brightCyan: '#16a085', brightWhite: '#0a0a0f',
    },
  },
  {
    id: 'cybertron', name: 'CYBERTRON',
    xterm: {
      background: '#0a0014', foreground: '#f0d8ff',
      cursor: '#ff2d95', cursorAccent: '#0a0014',
      selectionBackground: '#3a1a5e',
      black: '#22143b', red: '#ff2d95', green: '#00ff88', yellow: '#ffaa00',
      blue: '#00eeff', magenta: '#d050ff', cyan: '#00eeff', white: '#f0d8ff',
      brightBlack: '#7a4f9a', brightRed: '#ff66cc', brightGreen: '#66ffbb', brightYellow: '#ffcc44',
      brightBlue: '#66ffff', brightMagenta: '#e888ff', brightCyan: '#88ffff', brightWhite: '#ffffff',
    },
  },
  {
    id: 'mars', name: 'MARS',
    xterm: {
      background: '#140806', foreground: '#f0dcd0',
      cursor: '#ff6a3d', cursorAccent: '#140806',
      selectionBackground: '#4a2820',
      black: '#281010', red: '#ff4040', green: '#d4b572', yellow: '#ffaa44',
      blue: '#c98460', magenta: '#d67575', cyan: '#c0a078', white: '#f0dcd0',
      brightBlack: '#7a5c4a', brightRed: '#ff6666', brightGreen: '#e8cc88', brightYellow: '#ffcc66',
      brightBlue: '#e8a078', brightMagenta: '#f09595', brightCyan: '#e0c088', brightWhite: '#ffffff',
    },
  },
  {
    id: 'matrix', name: 'MATRIX',
    xterm: {
      background: '#000000', foreground: '#00ff41',
      cursor: '#00ff41', cursorAccent: '#000000',
      selectionBackground: '#004020',
      black: '#000000', red: '#ff4040', green: '#00ff41', yellow: '#ddff00',
      blue: '#00cc33', magenta: '#00ff88', cyan: '#66ffaa', white: '#c8ffc8',
      brightBlack: '#368036', brightRed: '#ff6666', brightGreen: '#66ff77', brightYellow: '#eeff66',
      brightBlue: '#33ff55', brightMagenta: '#66ffaa', brightCyan: '#88ffbb', brightWhite: '#ffffff',
    },
  },
  {
    id: 'nord', name: 'NORD',
    xterm: {
      background: '#1a1e27', foreground: '#eceff4',
      cursor: '#88c0d0', cursorAccent: '#1a1e27',
      selectionBackground: '#434c5e',
      black: '#3b4252', red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b',
      blue: '#81a1c1', magenta: '#b48ead', cyan: '#88c0d0', white: '#e5e9f0',
      brightBlack: '#4c566a', brightRed: '#bf616a', brightGreen: '#a3be8c', brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1', brightMagenta: '#b48ead', brightCyan: '#8fbcbb', brightWhite: '#eceff4',
    },
  },
  {
    id: 'solar', name: 'SOLAR',
    xterm: {
      background: '#fdf6e3', foreground: '#002b36',
      cursor: '#268bd2', cursorAccent: '#fdf6e3',
      selectionBackground: '#eee8d5',
      black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
      blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5',
      brightBlack: '#586e75', brightRed: '#cb4b16', brightGreen: '#93a1a1', brightYellow: '#657b83',
      brightBlue: '#839496', brightMagenta: '#6c71c4', brightCyan: '#2aa198', brightWhite: '#fdf6e3',
    },
  },
  {
    id: 'void', name: 'VOID',
    xterm: {
      background: '#000000', foreground: '#ffffff',
      cursor: '#ffffff', cursorAccent: '#000000',
      selectionBackground: '#333333',
      black: '#000000', red: '#ff4040', green: '#ffffff', yellow: '#aaaaaa',
      blue: '#ffffff', magenta: '#ffffff', cyan: '#aaaaaa', white: '#ffffff',
      brightBlack: '#555555', brightRed: '#ff6666', brightGreen: '#ffffff', brightYellow: '#cccccc',
      brightBlue: '#ffffff', brightMagenta: '#ffffff', brightCyan: '#dddddd', brightWhite: '#ffffff',
    },
  },
];

function getTheme(id) {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

function applyTheme(id) {
  const theme = getTheme(id);
  currentTheme = theme.id;
  document.body.className = 'theme-' + theme.id;
  try { localStorage.setItem('nexus.theme', theme.id); } catch (e) {}
  for (const [, s] of activeSessions) {
    if (s.term) {
      try { s.term.options.theme = theme.xterm; } catch (e) {}
    }
  }
  const dots = document.querySelectorAll('.theme-dot');
  dots.forEach(d => d.classList.toggle('active', d.dataset.theme === theme.id));
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = theme.name;
}

// ─── Stars background ───
(function initStars() {
  const host = $('#stars');
  for (let i = 0; i < 55; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    const sz = Math.random() * 1.8 + 0.4;
    s.style.width = sz + 'px';
    s.style.height = sz + 'px';
    s.style.animationDelay = (Math.random() * 8) + 's';
    s.style.animationDuration = (6 + Math.random() * 6) + 's';
    host.appendChild(s);
  }
})();

// ─── Utilities ───
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
function humanSize(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' K';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' M';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' G';
}
function fmtDate(sec) {
  if (!sec) return '';
  const d = new Date(sec * 1000);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}
function parentDir(p) {
  if (!p || p === '/') return '/';
  // Windows drive root: "C:/" or "C:\"
  if (/^[a-zA-Z]:[\\/]?$/.test(p)) return p.endsWith('/') || p.endsWith('\\') ? p : p + '/';
  const parts = p.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 1) {
    // Root-like path
    if (parts.length === 1 && /^[a-zA-Z]:$/.test(parts[0])) return parts[0] + '/';
    return '/';
  }
  parts.pop();
  // Preserve Windows drive prefix
  if (/^[a-zA-Z]:$/.test(parts[0])) return parts[0] + '/' + parts.slice(1).join('/');
  return '/' + parts.join('/');
}
function joinPath(a, b) {
  if (!a) return '/' + b;
  if (a.endsWith('/') || a.endsWith('\\')) return a + b;
  return a + '/' + b;
}
function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  $('#toastHost').appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    t.style.transition = 'all .3s';
  }, 2800);
  setTimeout(() => t.remove(), 3200);
}
function pad2(n) { return String(n).padStart(2, '0'); }

// ─── Server registry ───
async function loadServers() {
  servers = await window.api.servers.list();
  renderServerList();
  updateStats();
}

function renderServerList() {
  const list = $('#serverList');
  list.innerHTML = '';
  if (servers.length === 0) {
    list.innerHTML = '<div class="empty">NO ENDPOINTS<br>REGISTERED</div>';
    return;
  }
  servers.forEach(s => {
    const el = document.createElement('div');
    el.className = 'srv';
    const online = Array.from(activeSessions.values()).some(a => a.server.id === s.id);
    if (online) el.classList.add('online');
    el.innerHTML = `
      <div class="srv-ico">${online ? '●' : '◦'}</div>
      <div class="srv-info">
        <div class="srv-name">${escapeHtml(s.name || s.host)}</div>
        <div class="srv-meta">${escapeHtml(s.username)}@${escapeHtml(s.host)}:${s.port || 22}</div>
      </div>
      <button class="srv-edit" title="Edit endpoint">EDIT</button>
    `;
    el.querySelector('.srv-edit').addEventListener('click', e => {
      e.stopPropagation();
      openEditModal(s);
    });
    el.addEventListener('click', () => connectServer(s));
    list.appendChild(el);
  });
}

function updateStats() {
  $('#statServers').textContent = servers.length;
  $('#statActive').textContent = activeSessions.size;
  $('#srvCount').textContent = pad2(servers.length);
}

// ─── Modal ───
function openAddModal() {
  editingId = null;
  $('#modalTitle').textContent = 'DEPLOY NEW ENDPOINT';
  $('#f-name').value = '';
  $('#f-host').value = '';
  $('#f-port').value = 22;
  $('#f-user').value = '';
  $('#f-pass').value = '';
  $('#f-key').value = '';
  $('#f-passphrase').value = '';
  $('#f-path').value = '/root';
  $('#btnDel').hidden = true;
  setAuthMode('password');
  $('#modal').hidden = false;
  setTimeout(() => $('#f-name').focus(), 50);
}

function openEditModal(s) {
  editingId = s.id;
  $('#modalTitle').textContent = 'EDIT ENDPOINT';
  $('#f-name').value = s.name || '';
  $('#f-host').value = s.host || '';
  $('#f-port').value = s.port || 22;
  $('#f-user').value = s.username || '';
  $('#f-pass').value = s.password || '';
  $('#f-key').value = s.privateKey || '';
  $('#f-passphrase').value = s.passphrase || '';
  $('#f-path').value = s.defaultPath || '/root';
  $('#btnDel').hidden = false;
  setAuthMode(s.authMethod || 'password');
  $('#modal').hidden = false;
}

function setAuthMode(mode) {
  authMode = mode;
  $$('.auth-toggle .seg').forEach(b => b.classList.toggle('active', b.dataset.auth === mode));
  $('#auth-password').hidden = mode !== 'password';
  $('#auth-key').hidden = mode !== 'key';
}

$('#btnAdd').addEventListener('click', openAddModal);
$('#btnCancel').addEventListener('click', () => $('#modal').hidden = true);
$$('.auth-toggle .seg').forEach(b =>
  b.addEventListener('click', () => setAuthMode(b.dataset.auth))
);
$('#btnPickKey').addEventListener('click', async () => {
  const p = await window.api.dialog.pickKey();
  if (p) $('#f-key').value = p;
});

$('#btnSave').addEventListener('click', async () => {
  const data = {
    id: editingId || 's_' + Math.random().toString(36).slice(2, 10),
    name: $('#f-name').value.trim() || $('#f-host').value.trim(),
    host: $('#f-host').value.trim(),
    port: parseInt($('#f-port').value, 10) || 22,
    username: $('#f-user').value.trim(),
    authMethod: authMode,
    password: authMode === 'password' ? $('#f-pass').value : '',
    privateKey: authMode === 'key' ? $('#f-key').value.trim() : '',
    passphrase: authMode === 'key' ? $('#f-passphrase').value : '',
    defaultPath: $('#f-path').value.trim() || '/root',
  };
  if (!data.host || !data.username) {
    toast('HOST and OPERATOR are required', 'err');
    return;
  }
  if (data.authMethod === 'key' && !data.privateKey) {
    toast('Select a key file or switch to password auth', 'err');
    return;
  }
  if (editingId) {
    const idx = servers.findIndex(s => s.id === editingId);
    if (idx >= 0) servers[idx] = data;
  } else {
    servers.push(data);
  }
  await window.api.servers.save(servers);
  $('#modal').hidden = true;
  renderServerList();
  updateStats();
  toast(editingId ? 'Endpoint updated' : 'Endpoint deployed', 'ok');
});

$('#btnDel').addEventListener('click', async () => {
  if (!editingId) return;
  if (!confirm('Decommission this endpoint permanently?')) return;
  servers = servers.filter(s => s.id !== editingId);
  await window.api.servers.save(servers);
  $('#modal').hidden = true;
  renderServerList();
  updateStats();
  toast('Endpoint decommissioned', 'warn');
});

// ─── Sessions + Tabs ───
async function connectServer(server) {
  for (const [id, s] of activeSessions) {
    if (s.server.id === server.id) { setActiveTab(id); return; }
  }

  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const sess = {
    server,
    view: 'term',
    remotePath: server.defaultPath || '/root',
    localPath: homeDir,
    term: null,
    fitAddon: null,
    wrap: null,
    termEl: null,
    sftpEl: null,
    localPaneEl: null,
    remotePaneEl: null,
    statusDotEl: null,
    cleanup: [],
    connected: false,
  };
  activeSessions.set(sessionId, sess);
  renderWorkspace(sessionId);
  renderTabs();
  setActiveTab(sessionId);
  renderServerList();
  updateStats();

  const term = new Terminal({
    fontFamily: '"JetBrains Mono", "Menlo", monospace',
    fontSize: 13,
    lineHeight: 1.25,
    theme: getTheme(currentTheme).xterm,
    cursorBlink: true,
    cursorStyle: 'block',
    allowTransparency: true,
    scrollback: 5000,
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(sess.termEl);
  try { fit.fit(); } catch (e) {}
  sess.term = term;
  sess.fitAddon = fit;

  term.writeln('\x1b[38;5;110m── NEXUS TRANSMISSION ──────────────────────────\x1b[0m');
  term.writeln('\x1b[38;5;110m  TARGET      \x1b[38;5;250m' + server.host + ':' + (server.port || 22) + '\x1b[0m');
  term.writeln('\x1b[38;5;110m  OPERATOR    \x1b[38;5;250m' + server.username + '\x1b[0m');
  term.writeln('\x1b[38;5;110m  AUTH        \x1b[38;5;250m' + (server.authMethod === 'key' ? 'KEY FILE' : 'PASSWORD') + '\x1b[0m');
  term.writeln('\x1b[38;5;110m────────────────────────────────────────────────\x1b[0m');
  term.writeln('\x1b[38;5;244m› Establishing link ...\x1b[0m\r\n');

  try {
    await window.api.ssh.connect({
      sessionId,
      server,
      cols: term.cols,
      rows: term.rows,
    });
    sess.connected = true;
    setStatus(sess, 'ok');
  } catch (e) {
    sess.connected = false;
    setStatus(sess, 'fail');
    term.writeln('\x1b[38;5;203m✗ CONNECTION FAILED · ' + (e.message || e) + '\x1b[0m');
    toast('Connection failed: ' + (e.message || e), 'err');
    return;
  }

  const off1 = window.api.ssh.onData(sessionId, data => term.write(data));
  const off2 = window.api.ssh.onClose(sessionId, () => {
    term.writeln('\r\n\x1b[38;5;244m── LINK SEVERED ──\x1b[0m');
    setStatus(sess, 'fail');
    sess.connected = false;
    renderServerList();
    updateStats();
  });
  const off3 = window.api.ssh.onError(sessionId, msg => {
    term.writeln('\x1b[38;5;203m✗ ' + msg + '\x1b[0m');
  });
  sess.cleanup.push(off1, off2, off3);

  term.onData(data => window.api.ssh.write({ sessionId, data }));
  term.onResize(({ cols, rows }) => window.api.ssh.resize({ sessionId, cols, rows }));

  renderServerList();

  // Resolve real remote home/start path
  try {
    const rp = await window.api.sftp.realpath({ sessionId, path: server.defaultPath || '.' });
    sess.remotePath = rp;
    const inp = sess.remotePaneEl.querySelector('.fs-path');
    if (inp) inp.value = rp;
  } catch (e) {}
}

function setStatus(sess, kind) {
  if (!sess.statusDotEl) return;
  sess.statusDotEl.classList.remove('fail', 'warn');
  if (kind === 'fail') sess.statusDotEl.classList.add('fail');
  if (kind === 'warn') sess.statusDotEl.classList.add('warn');
}

function renderTabs() {
  const bar = $('#tabsBar');
  bar.innerHTML = '';
  if (activeSessions.size === 0) {
    const ph = document.createElement('div');
    ph.className = 'tab-placeholder';
    ph.textContent = 'NO ACTIVE SESSIONS';
    bar.appendChild(ph);
    return;
  }
  for (const [id, s] of activeSessions) {
    const el = document.createElement('div');
    el.className = 'tab' + (id === activeTabId ? ' active' : '');
    el.innerHTML = `
      <span class="tab-ico">${s.connected ? '●' : '○'}</span>
      <span class="tab-name">${escapeHtml(s.server.name || s.server.host)}</span>
      <span class="tab-sub">${escapeHtml(s.server.host)}</span>
      <button class="tab-close" title="Disconnect">×</button>
    `;
    el.addEventListener('click', () => setActiveTab(id));
    el.querySelector('.tab-close').addEventListener('click', e => {
      e.stopPropagation();
      disconnectSession(id);
    });
    bar.appendChild(el);
  }
}

async function disconnectSession(sessionId) {
  const s = activeSessions.get(sessionId);
  if (!s) return;
  s.cleanup.forEach(fn => { try { fn && fn(); } catch (e) {} });
  try { s.term && s.term.dispose(); } catch (e) {}
  try { s.wrap && s.wrap.remove(); } catch (e) {}
  await window.api.ssh.disconnect({ sessionId });
  activeSessions.delete(sessionId);
  renderTabs();
  renderServerList();
  updateStats();
  if (activeTabId === sessionId) {
    const next = activeSessions.keys().next().value;
    if (next) setActiveTab(next);
    else showSplash();
  }
}

function setActiveTab(sessionId) {
  activeTabId = sessionId;
  renderTabs();
  $$('#workspace .view').forEach(v => v.classList.remove('active'));
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  sess.wrap.classList.add('active');
  $('#splash').hidden = true;
  setTimeout(() => {
    try { sess.fitAddon && sess.fitAddon.fit(); } catch (e) {}
  }, 60);
}

function showSplash() {
  activeTabId = null;
  $$('#workspace .view').forEach(v => v.classList.remove('active'));
  $('#splash').hidden = false;
  renderTabs();
}

function renderWorkspace(sessionId) {
  const sess = activeSessions.get(sessionId);
  const ws = $('#workspace');

  const wrap = document.createElement('div');
  wrap.className = 'view';
  wrap.innerHTML = `
    <span class="corner tl"></span>
    <span class="corner tr"></span>
    <span class="corner bl"></span>
    <span class="corner br"></span>
    <div class="view-head">
      <div class="mode-seg">
        <button class="seg active" data-mode="term">TERMINAL</button>
        <button class="seg" data-mode="sftp">SFTP</button>
      </div>
      <div class="view-info">
        <span class="info-dot warn"></span>
        <span>${escapeHtml(sess.server.username)}@${escapeHtml(sess.server.host)}:${sess.server.port || 22}</span>
      </div>
    </div>
    <div class="view-body">
      <div class="term-pane"></div>
      <div class="sftp-pane" hidden>
        <div class="sftp-split">
          <section class="fs-pane local-pane">
            <div class="fs-head">
              <span class="fs-title">LOCAL</span>
              <span class="fs-tag">HOST</span>
            </div>
            <div class="fs-bar">
              <button class="ico-btn" data-act="up" title="Parent directory">↑</button>
              <button class="ico-btn" data-act="home" title="Home">⌂</button>
              <button class="ico-btn" data-act="refresh" title="Refresh">↻</button>
              <input class="fs-path" value="${escapeHtml(sess.localPath)}" spellcheck="false">
              <button class="ico-btn" data-act="mkdir" title="New directory">+</button>
            </div>
            <div class="fs-header">
              <span></span>
              <span>NAME</span>
              <span>SIZE</span>
              <span>MODIFIED</span>
              <span style="text-align:right">ACTION</span>
            </div>
            <div class="fs-list"></div>
          </section>
          <section class="fs-pane remote-pane">
            <div class="fs-head">
              <span class="fs-title remote">REMOTE</span>
              <span class="fs-tag">${escapeHtml(sess.server.host)}</span>
            </div>
            <div class="fs-bar">
              <button class="ico-btn" data-act="up" title="Parent directory">↑</button>
              <button class="ico-btn" data-act="home" title="Home">⌂</button>
              <button class="ico-btn" data-act="refresh" title="Refresh">↻</button>
              <input class="fs-path" value="${escapeHtml(sess.remotePath)}" spellcheck="false">
              <button class="ico-btn" data-act="mkdir" title="New directory">+</button>
            </div>
            <div class="fs-header">
              <span></span>
              <span>NAME</span>
              <span>SIZE</span>
              <span>MODIFIED</span>
              <span style="text-align:right">ACTION</span>
            </div>
            <div class="fs-list"></div>
          </section>
        </div>
      </div>
    </div>
  `;
  ws.appendChild(wrap);
  sess.wrap = wrap;
  sess.termEl = wrap.querySelector('.term-pane');
  sess.sftpEl = wrap.querySelector('.sftp-pane');
  sess.localPaneEl = wrap.querySelector('.local-pane');
  sess.remotePaneEl = wrap.querySelector('.remote-pane');
  sess.statusDotEl = wrap.querySelector('.info-dot');

  // Mode toggle
  wrap.querySelectorAll('.mode-seg .seg').forEach(b => {
    b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      wrap.querySelectorAll('.mode-seg .seg').forEach(x => x.classList.toggle('active', x === b));
      sess.termEl.hidden = mode !== 'term';
      sess.sftpEl.hidden = mode !== 'sftp';
      sess.view = mode;
      if (mode === 'term') {
        setTimeout(() => { try { sess.fitAddon && sess.fitAddon.fit(); } catch (e) {} }, 50);
      } else {
        loadLocal(sessionId);
        loadRemote(sessionId);
      }
    });
  });

  bindPaneBar(sessionId, sess.localPaneEl, 'local');
  bindPaneBar(sessionId, sess.remotePaneEl, 'remote');
}

function bindPaneBar(sessionId, paneEl, side) {
  const pathInput = paneEl.querySelector('.fs-path');
  pathInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const sess = activeSessions.get(sessionId);
      if (!sess) return;
      if (side === 'local') sess.localPath = pathInput.value || homeDir;
      else sess.remotePath = pathInput.value || '/';
      (side === 'local' ? loadLocal : loadRemote)(sessionId);
    }
  });
  paneEl.querySelectorAll('.fs-bar .ico-btn').forEach(b => {
    b.addEventListener('click', async () => {
      const act = b.dataset.act;
      const sess = activeSessions.get(sessionId);
      if (!sess) return;
      const curKey = side === 'local' ? 'localPath' : 'remotePath';
      const load = side === 'local' ? loadLocal : loadRemote;

      if (act === 'up') {
        sess[curKey] = parentDir(sess[curKey]);
        pathInput.value = sess[curKey];
        load(sessionId);
      } else if (act === 'home') {
        try {
          let home;
          if (side === 'local') home = homeDir;
          else home = await window.api.sftp.realpath({ sessionId, path: '.' });
          sess[curKey] = home;
          pathInput.value = home;
          load(sessionId);
        } catch (e) { toast(e.message, 'err'); }
      } else if (act === 'refresh') {
        load(sessionId);
      } else if (act === 'mkdir') {
        const name = prompt('New directory name:');
        if (!name) return;
        const target = joinPath(sess[curKey], name);
        try {
          if (side === 'local') await window.api.local.mkdir({ path: target });
          else await window.api.sftp.mkdir({ sessionId, path: target });
          load(sessionId);
          toast('Directory created', 'ok');
        } catch (e) { toast(e.message, 'err'); }
      }
    });
  });
}

async function loadLocal(sessionId) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  const list = sess.localPaneEl.querySelector('.fs-list');
  list.innerHTML = '<div class="loading">SCANNING · LOCAL</div>';
  try {
    const items = await window.api.local.list({ path: sess.localPath });
    renderFileList(sessionId, 'local', items, list);
  } catch (e) {
    list.innerHTML = '<div class="empty">SCAN FAILED · ' + escapeHtml(e.message) + '</div>';
  }
}

async function loadRemote(sessionId) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  const list = sess.remotePaneEl.querySelector('.fs-list');
  list.innerHTML = '<div class="loading">SCANNING · REMOTE</div>';
  try {
    const items = await window.api.sftp.list({ sessionId, path: sess.remotePath });
    renderFileList(sessionId, 'remote', items, list);
  } catch (e) {
    list.innerHTML = '<div class="empty">SCAN FAILED · ' + escapeHtml(e.message) + '</div>';
  }
}

function renderFileList(sessionId, side, items, listEl) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;

  items = items.filter(i => i.name !== '.' && i.name !== '..');
  items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  listEl.innerHTML = '';
  if (items.length === 0) {
    listEl.innerHTML = '<div class="empty">EMPTY</div>';
    return;
  }

  const curKey = side === 'local' ? 'localPath' : 'remotePath';
  const arrow = side === 'local' ? '→' : '←';

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'fs-row' + (item.isDir ? ' dir' : '');
    const icon = item.isDir ? '▪' : (item.isLink ? '↪' : '·');
    row.innerHTML = `
      <span class="f-ico">${icon}</span>
      <span class="f-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
      <span class="f-size">${item.isDir ? '—' : humanSize(item.size)}</span>
      <span class="f-date">${fmtDate(item.mtime)}</span>
      <span class="f-actions">
        ${item.isDir ? '' : `<button class="row-btn transfer" data-act="xfer" title="${side === 'local' ? 'Upload to remote' : 'Download to local'}">${arrow}</button>`}
        <button class="row-btn" data-act="rn" title="Rename">✎</button>
        <button class="row-btn danger" data-act="rm" title="Delete">×</button>
      </span>
    `;

    const nameEl = row.querySelector('.f-name');
    if (item.isDir) {
      nameEl.addEventListener('click', () => {
        sess[curKey] = joinPath(sess[curKey], item.name);
        const input = (side === 'local' ? sess.localPaneEl : sess.remotePaneEl).querySelector('.fs-path');
        input.value = sess[curKey];
        (side === 'local' ? loadLocal : loadRemote)(sessionId);
      });
    }

    row.querySelectorAll('.f-actions .row-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'xfer') {
          await handleTransfer(sessionId, side, item, b);
        } else if (act === 'rn') {
          const nn = prompt('Rename to:', item.name);
          if (!nn || nn === item.name) return;
          const from = joinPath(sess[curKey], item.name);
          const to = joinPath(sess[curKey], nn);
          try {
            if (side === 'local') await window.api.local.rename({ from, to });
            else await window.api.sftp.rename({ sessionId, from, to });
            (side === 'local' ? loadLocal : loadRemote)(sessionId);
            toast('Renamed', 'ok');
          } catch (e) { toast(e.message, 'err'); }
        } else if (act === 'rm') {
          const target = joinPath(sess[curKey], item.name);
          if (!confirm('Delete ' + item.name + (item.isDir ? ' (recursive)' : '') + '?')) return;
          try {
            if (side === 'local') await window.api.local.delete({ path: target, isDir: item.isDir });
            else await window.api.sftp.delete({ sessionId, path: target, isDir: item.isDir });
            (side === 'local' ? loadLocal : loadRemote)(sessionId);
            toast('Deleted', 'ok');
          } catch (e) { toast(e.message, 'err'); }
        }
      });
    });

    listEl.appendChild(row);
  }
}

async function handleTransfer(sessionId, side, item, btn) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  btn.disabled = true;
  const origText = btn.textContent;
  btn.textContent = '…';

  try {
    if (side === 'local') {
      const localPath = joinPath(sess.localPath, item.name);
      const remotePath = joinPath(sess.remotePath, item.name);
      await window.api.sftp.sendFile({ sessionId, localPath, remotePath });
      toast('Uploaded · ' + item.name, 'ok');
      loadRemote(sessionId);
    } else {
      const localPath = joinPath(sess.localPath, item.name);
      const remotePath = joinPath(sess.remotePath, item.name);
      await window.api.sftp.getFile({ sessionId, remotePath, localPath });
      toast('Downloaded · ' + item.name, 'ok');
      loadLocal(sessionId);
    }
  } catch (e) {
    toast('Transfer failed · ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

// ─── Keyboard ───
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').hidden) {
    $('#modal').hidden = true;
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'w' && activeTabId && $('#modal').hidden) {
    e.preventDefault();
    disconnectSession(activeTabId);
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'n' && $('#modal').hidden) {
    e.preventDefault();
    openAddModal();
  }
});

window.addEventListener('resize', () => {
  for (const [, s] of activeSessions) {
    try { s.fitAddon && s.fitAddon.fit(); } catch (e) {}
  }
});

$('#modal').addEventListener('click', e => {
  if (e.target.id === 'modal') $('#modal').hidden = true;
});

// ─── Theme wiring ───
$$('.theme-dot').forEach(b => {
  b.addEventListener('click', () => applyTheme(b.dataset.theme));
});

const themeToggleEl = $('#themeToggle');
const themeDotsEl = $('#themeDots');
function setThemePickerOpen(open) {
  themeDotsEl.hidden = !open;
  themeToggleEl.classList.toggle('open', open);
  try { localStorage.setItem('nexus.theme.open', open ? '1' : '0'); } catch (e) {}
}
themeToggleEl.addEventListener('click', () => {
  setThemePickerOpen(themeDotsEl.hidden);
});
themeToggleEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    setThemePickerOpen(themeDotsEl.hidden);
  }
});

// ─── Boot ───
(async function boot() {
  try {
    const saved = localStorage.getItem('nexus.theme');
    if (saved && THEMES.some(t => t.id === saved)) currentTheme = saved;
  } catch (e) {}
  applyTheme(currentTheme);

  let pickerOpen = false;
  try { pickerOpen = localStorage.getItem('nexus.theme.open') === '1'; } catch (e) {}
  setThemePickerOpen(pickerOpen);

  try { homeDir = await window.api.local.home(); } catch (e) { homeDir = '/'; }
  await loadServers();
})();
