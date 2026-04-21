const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

let servers = [];
const activeSessions = new Map();
let activeTabId = null;
let editingId = null;
let authMode = 'password';
let homeDir = '/';
let currentTheme = 'mint';

// Double-click tracker lives at module scope so it survives
// renderServerList() rebuilding the sidebar between the two clicks.
// Keyed by server.id.
const _lastSrvClick = new Map();

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
      background: '#fdf6e3', foreground: '#3a2a1a',
      cursor: '#cb4b16', cursorAccent: '#fdf6e3',
      selectionBackground: '#eee8d5',
      black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
      blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5',
      brightBlack: '#586e75', brightRed: '#cb4b16', brightGreen: '#93a1a1', brightYellow: '#657b83',
      brightBlue: '#839496', brightMagenta: '#6c71c4', brightCyan: '#2aa198', brightWhite: '#3a2a1a',
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
  {
    id: 'dracula', name: 'DRACULA',
    xterm: {
      background: '#282a36', foreground: '#f8f8f2',
      cursor: '#f8f8f2', cursorAccent: '#282a36',
      selectionBackground: '#44475a',
      black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
      blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2',
      brightBlack: '#6272a4', brightRed: '#ff6e6e', brightGreen: '#69ff94', brightYellow: '#ffffa5',
      brightBlue: '#d6acff', brightMagenta: '#ff92df', brightCyan: '#a4ffff', brightWhite: '#ffffff',
    },
  },
  {
    id: 'tokyo', name: 'TOKYO',
    xterm: {
      background: '#1a1b26', foreground: '#c0caf5',
      cursor: '#7aa2f7', cursorAccent: '#1a1b26',
      selectionBackground: '#283457',
      black: '#15161e', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68',
      blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6',
      brightBlack: '#414868', brightRed: '#f7768e', brightGreen: '#9ece6a', brightYellow: '#e0af68',
      brightBlue: '#7aa2f7', brightMagenta: '#bb9af7', brightCyan: '#7dcfff', brightWhite: '#c0caf5',
    },
  },
  {
    id: 'synthwave', name: 'SYNTHWAVE',
    xterm: {
      background: '#130a3e', foreground: '#ffdcf7',
      cursor: '#ff00c8', cursorAccent: '#130a3e',
      selectionBackground: '#3a1a6e',
      black: '#241650', red: '#ff0059', green: '#00f2a8', yellow: '#ffa500',
      blue: '#00f2ff', magenta: '#ff00c8', cyan: '#00f2ff', white: '#ffdcf7',
      brightBlack: '#6b588a', brightRed: '#ff3377', brightGreen: '#44ffbb', brightYellow: '#ffcc44',
      brightBlue: '#66fbff', brightMagenta: '#ff66dd', brightCyan: '#88ffff', brightWhite: '#ffffff',
    },
  },
  {
    id: 'amber', name: 'AMBER',
    xterm: {
      background: '#0a0600', foreground: '#ffb000',
      cursor: '#ffb000', cursorAccent: '#0a0600',
      selectionBackground: '#4a3000',
      black: '#0a0600', red: '#ff4040', green: '#ffb000', yellow: '#ffd454',
      blue: '#c08400', magenta: '#ffb000', cyan: '#ffd454', white: '#ffb000',
      brightBlack: '#6e4a00', brightRed: '#ff6666', brightGreen: '#ffd454', brightYellow: '#fff099',
      brightBlue: '#ffd454', brightMagenta: '#ffd454', brightCyan: '#ffe8bb', brightWhite: '#ffd454',
    },
  },
  {
    id: 'monokai', name: 'MONOKAI',
    xterm: {
      background: '#272822', foreground: '#f8f8f2',
      cursor: '#f92672', cursorAccent: '#272822',
      selectionBackground: '#49483e',
      black: '#272822', red: '#f92672', green: '#a6e22e', yellow: '#f4bf75',
      blue: '#66d9ef', magenta: '#ae81ff', cyan: '#a1efe4', white: '#f8f8f2',
      brightBlack: '#75715e', brightRed: '#f92672', brightGreen: '#a6e22e', brightYellow: '#fd971f',
      brightBlue: '#66d9ef', brightMagenta: '#ae81ff', brightCyan: '#a1efe4', brightWhite: '#f9f8f5',
    },
  },
  {
    id: 'gruvbox', name: 'GRUVBOX',
    xterm: {
      background: '#282828', foreground: '#ebdbb2',
      cursor: '#fe8019', cursorAccent: '#282828',
      selectionBackground: '#504945',
      black: '#282828', red: '#cc241d', green: '#98971a', yellow: '#d79921',
      blue: '#458588', magenta: '#b16286', cyan: '#689d6a', white: '#a89984',
      brightBlack: '#928374', brightRed: '#fb4934', brightGreen: '#b8bb26', brightYellow: '#fabd2f',
      brightBlue: '#83a598', brightMagenta: '#d3869b', brightCyan: '#8ec07c', brightWhite: '#ebdbb2',
    },
  },
  {
    id: 'catppuccin', name: 'CATPPUCCIN',
    xterm: {
      background: '#1e1e2e', foreground: '#cdd6f4',
      cursor: '#f5e0dc', cursorAccent: '#1e1e2e',
      selectionBackground: '#45475a',
      black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af',
      blue: '#89b4fa', magenta: '#f5c2e7', cyan: '#94e2d5', white: '#bac2de',
      brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1', brightYellow: '#f9e2af',
      brightBlue: '#89b4fa', brightMagenta: '#f5c2e7', brightCyan: '#94e2d5', brightWhite: '#a6adc8',
    },
  },
  {
    id: 'terminator', name: 'TERMINATOR',
    xterm: {
      background: '#050000', foreground: '#ff8080',
      cursor: '#ff0000', cursorAccent: '#050000',
      selectionBackground: '#4a0000',
      black: '#1e0808', red: '#ff0000', green: '#ff6b6b', yellow: '#ffaa00',
      blue: '#ff4444', magenta: '#ff2222', cyan: '#ff8080', white: '#ff8080',
      brightBlack: '#6d2b2b', brightRed: '#ff6666', brightGreen: '#ff9999', brightYellow: '#ffcc44',
      brightBlue: '#ff6666', brightMagenta: '#ff4444', brightCyan: '#ffaaaa', brightWhite: '#ffffff',
    },
  },
  {
    id: 'ocean', name: 'OCEAN',
    xterm: {
      background: '#03131f', foreground: '#d0e3f7',
      cursor: '#4a9eff', cursorAccent: '#03131f',
      selectionBackground: '#1e3a5c',
      black: '#0a2540', red: '#ef5350', green: '#4adeaa', yellow: '#ffa726',
      blue: '#4a9eff', magenta: '#9575cd', cyan: '#4dd0e1', white: '#d0e3f7',
      brightBlack: '#3e566e', brightRed: '#ff8888', brightGreen: '#7cffcc', brightYellow: '#ffc472',
      brightBlue: '#7dc3ff', brightMagenta: '#b39ddb', brightCyan: '#80deea', brightWhite: '#ffffff',
    },
  },
  {
    id: 'sunset', name: 'SUNSET',
    xterm: {
      background: '#250f1a', foreground: '#ffdcc5',
      cursor: '#ff6b9d', cursorAccent: '#250f1a',
      selectionBackground: '#552838',
      black: '#3a1c28', red: '#ff5555', green: '#ffc571', yellow: '#ff9a5c',
      blue: '#c49882', magenta: '#ff6b9d', cyan: '#ffb88c', white: '#ffdcc5',
      brightBlack: '#7a5649', brightRed: '#ff7e7e', brightGreen: '#ffd699', brightYellow: '#ffb480',
      brightBlue: '#ddb09c', brightMagenta: '#ff8fb4', brightCyan: '#ffcea8', brightWhite: '#fff2e3',
    },
  },
  {
    id: 'carbon', name: 'CARBON',
    xterm: {
      background: '#161618', foreground: '#f4f4f4',
      cursor: '#0f62fe', cursorAccent: '#161618',
      selectionBackground: '#393939',
      black: '#161618', red: '#fa4d56', green: '#42be65', yellow: '#f1c21b',
      blue: '#0f62fe', magenta: '#a56eff', cyan: '#1192e8', white: '#c6c6c6',
      brightBlack: '#6f6f6f', brightRed: '#ff7070', brightGreen: '#6fdc8c', brightYellow: '#ffd03b',
      brightBlue: '#4589ff', brightMagenta: '#be95ff', brightCyan: '#33b1ff', brightWhite: '#ffffff',
    },
  },
  {
    id: 'paper', name: 'PAPER',
    xterm: {
      background: '#ffffff', foreground: '#1a1a1a',
      cursor: '#1a1a1a', cursorAccent: '#ffffff',
      selectionBackground: '#dcdcdc',
      black: '#0a0a0a', red: '#c62828', green: '#2e7d32', yellow: '#ef6c00',
      blue: '#1565c0', magenta: '#6a1b9a', cyan: '#00838f', white: '#525252',
      brightBlack: '#333333', brightRed: '#d32f2f', brightGreen: '#388e3c', brightYellow: '#f57c00',
      brightBlue: '#1976d2', brightMagenta: '#7b1fa2', brightCyan: '#0097a7', brightWhite: '#1a1a1a',
    },
  },
  {
    id: 'linear', name: 'LINEAR',
    xterm: {
      background: '#fbfbfc', foreground: '#1f2428',
      cursor: '#5e6ad2', cursorAccent: '#fbfbfc',
      selectionBackground: '#d0d4ed',
      black: '#1f2428', red: '#eb5757', green: '#4cb782', yellow: '#f2994a',
      blue: '#5e6ad2', magenta: '#9d5bd2', cyan: '#4bb4e6', white: '#555a65',
      brightBlack: '#8a919e', brightRed: '#f06969', brightGreen: '#5ec893', brightYellow: '#ffa968',
      brightBlue: '#7b88ea', brightMagenta: '#b070e0', brightCyan: '#6cc0f0', brightWhite: '#1f2428',
    },
  },
  {
    id: 'gruvlight', name: 'GRUVLIGHT',
    xterm: {
      background: '#fbf1c7', foreground: '#3c3836',
      cursor: '#af3a03', cursorAccent: '#fbf1c7',
      selectionBackground: '#ebdbb2',
      black: '#3c3836', red: '#9d0006', green: '#79740e', yellow: '#b57614',
      blue: '#076678', magenta: '#8f3f71', cyan: '#427b58', white: '#928374',
      brightBlack: '#7c6f64', brightRed: '#cc241d', brightGreen: '#98971a', brightYellow: '#d79921',
      brightBlue: '#458588', brightMagenta: '#b16286', brightCyan: '#689d6a', brightWhite: '#3c3836',
    },
  },
  {
    id: 'sakura', name: 'SAKURA',
    xterm: {
      background: '#fff5f8', foreground: '#4a2c3a',
      cursor: '#e85d75', cursorAccent: '#fff5f8',
      selectionBackground: '#ffcdd8',
      black: '#4a2c3a', red: '#c62828', green: '#6a9955', yellow: '#d19a66',
      blue: '#6b5b95', magenta: '#e85d75', cyan: '#7a9fa0', white: '#7c5064',
      brightBlack: '#b08090', brightRed: '#e04545', brightGreen: '#85b46a', brightYellow: '#e8b080',
      brightBlue: '#8777b5', brightMagenta: '#f57e95', brightCyan: '#98b8b9', brightWhite: '#4a2c3a',
    },
  },
  {
    id: 'mint', name: 'MINT',
    xterm: {
      background: '#f0fdf9', foreground: '#0f3d2e',
      cursor: '#10b981', cursorAccent: '#f0fdf9',
      selectionBackground: '#c8ead5',
      black: '#0f3d2e', red: '#dc2626', green: '#059669', yellow: '#d97706',
      blue: '#0891b2', magenta: '#9333ea', cyan: '#0e7490', white: '#2d6b50',
      brightBlack: '#6b9080', brightRed: '#ef4444', brightGreen: '#10b981', brightYellow: '#f59e0b',
      brightBlue: '#06b6d4', brightMagenta: '#a855f7', brightCyan: '#0ea5e9', brightWhite: '#0f3d2e',
    },
  },
];

function getTheme(id) {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

// ─── Fonts ───
const FONTS = [
  { id: 'ops',      name: 'OPS',      display: "'Rajdhani', 'Inter', sans-serif",             mono: "'JetBrains Mono', 'Menlo', monospace" },
  { id: 'protoss',  name: 'PROTOSS',  display: "'Orbitron', 'Rajdhani', sans-serif",          mono: "'JetBrains Mono', 'Menlo', monospace" },
  { id: 'vapor',    name: 'VAPOR',    display: "'Audiowide', 'Rajdhani', sans-serif",         mono: "'Space Mono', 'Menlo', monospace" },
  { id: 'crt',      name: 'CRT',      display: "'VT323', 'Rajdhani', monospace",              mono: "'VT323', 'Menlo', monospace" },
  { id: 'arcade',   name: '8-BIT',    display: "'Press Start 2P', 'Rajdhani', monospace",     mono: "'Space Mono', 'Menlo', monospace" },
  { id: 'block',    name: 'BLOCK',    display: "'Bungee', 'Rajdhani', sans-serif",            mono: "'JetBrains Mono', 'Menlo', monospace" },
  { id: 'sprint',   name: 'SPRINT',   display: "'Teko', 'Rajdhani', sans-serif",              mono: "'JetBrains Mono', 'Menlo', monospace" },
  { id: 'russo',    name: 'RUSSO',    display: "'Russo One', 'Rajdhani', sans-serif",         mono: "'JetBrains Mono', 'Menlo', monospace" },
  { id: 'ghost',    name: 'GHOST',    display: "'Monoton', 'Rajdhani', sans-serif",           mono: "'Share Tech Mono', 'Menlo', monospace" },
  { id: 'cyber',    name: 'CYBER',    display: "'Chakra Petch', 'Rajdhani', sans-serif",      mono: "'Space Mono', 'Menlo', monospace" },
  { id: 'bauhaus',  name: 'BAUHAUS',  display: "'Unica One', 'Rajdhani', sans-serif",         mono: "'Inconsolata', 'Menlo', monospace" },
  { id: 'military', name: 'MILITARY', display: "'Black Ops One', 'Rajdhani', sans-serif",     mono: "'JetBrains Mono', 'Menlo', monospace" },
  { id: 'geo',      name: 'GEO',      display: "'Syncopate', 'Rajdhani', sans-serif",         mono: "'Space Mono', 'Menlo', monospace" },
  { id: 'wide',     name: 'WIDE',     display: "'Michroma', 'Rajdhani', sans-serif",          mono: "'JetBrains Mono', 'Menlo', monospace" },
  { id: 'future',   name: 'FUTURE',   display: "'Exo 2', 'Rajdhani', sans-serif",             mono: "'Fira Code', 'Menlo', monospace" },
  { id: 'ibm',      name: 'IBM',      display: "'IBM Plex Sans', 'Inter', sans-serif",        mono: "'IBM Plex Mono', 'Menlo', monospace" },
  { id: 'iceberg',  name: 'ICEBERG',  display: "'Iceberg', 'Rajdhani', sans-serif",           mono: "'Space Mono', 'Menlo', monospace" },
  { id: 'rite',     name: 'RITE',     display: "'Righteous', 'Rajdhani', sans-serif",         mono: "'JetBrains Mono', 'Menlo', monospace" },
  { id: 'major',    name: 'MAJOR',    display: "'Major Mono Display', 'Rajdhani', monospace", mono: "'Share Tech Mono', 'Menlo', monospace" },
  { id: 'tekno',    name: 'TEKNO',    display: "'Chakra Petch', 'Rajdhani', sans-serif",      mono: "'Fira Code', 'Menlo', monospace" },
];

let currentFont = 'cyber';

function firstFamilyName(s) {
  const m = s && s.match(/['"]([^'"]+)['"]/);
  return m ? m[1] : (s ? s.split(',')[0].trim() : '');
}

function applyFont(id) {
  const f = FONTS.find(x => x.id === id) || FONTS[0];
  currentFont = f.id;
  document.documentElement.style.setProperty('--family-display', f.display);
  document.documentElement.style.setProperty('--family-mono', f.mono);
  try { localStorage.setItem('maxter.font', f.id); } catch (e) {}

  // Update xterm terminals
  const primary = firstFamilyName(f.mono);
  const xmono = `"${primary}", "JetBrains Mono", "Menlo", monospace`;
  for (const [, s] of activeSessions) {
    if (s.term) {
      try {
        s.term.options.fontFamily = xmono;
        if (s.fitAddon) s.fitAddon.fit();
      } catch (e) {}
    }
  }

  document.querySelectorAll('.font-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.font === f.id)
  );
  const label = document.getElementById('fontLabel');
  if (label) label.textContent = f.name;
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
  // Repaint dock icon with the new palette
  if (typeof refreshDockIcon === 'function') refreshDockIcon();
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

// ─── Custom confirm / prompt (replaces native browser dialogs) ───
let _dialogResolve = null;

function openDialog(opts) {
  return new Promise(resolve => {
    const m = $('#dialogModal');
    const title = $('#dialogTitle');
    const msg = $('#dialogMsg');
    const inputWrap = $('#dialogInputWrap');
    const input = $('#dialogInput');
    const btnOk = $('#dialogOk');
    const btnCancel = $('#dialogCancel');

    title.textContent = opts.title || 'CONFIRM';
    msg.textContent = opts.message || '';
    btnOk.textContent = opts.okText || (opts.prompt ? 'OK' : 'CONFIRM');
    btnCancel.textContent = opts.cancelText || 'CANCEL';
    btnOk.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');

    if (opts.prompt) {
      inputWrap.hidden = false;
      // Toggle password mode per call so subsequent prompts are plain text
      // again (sticky type would surprise the next caller).
      input.type = opts.passwordInput ? 'password' : 'text';
      input.value = opts.defaultValue || '';
      setTimeout(() => { input.focus(); input.select(); }, 40);
    } else {
      inputWrap.hidden = true;
      input.type = 'text';
      setTimeout(() => btnOk.focus(), 40);
    }

    _dialogResolve = resolve;
    m.hidden = false;
  });
}

function closeDialog(result) {
  const m = $('#dialogModal');
  if (m) m.hidden = true;
  const r = _dialogResolve;
  _dialogResolve = null;
  if (r) r(result);
}

function showConfirm(message, opts = {}) {
  return openDialog({
    title: opts.title || 'CONFIRM',
    message,
    danger: opts.danger !== false,
    okText: opts.okText || 'CONFIRM',
    cancelText: opts.cancelText,
  });
}

function showPrompt(message, defaultValue = '', opts = {}) {
  return openDialog({
    title: opts.title || 'INPUT',
    message,
    prompt: true,
    defaultValue,
    okText: opts.okText || 'OK',
    cancelText: opts.cancelText,
    passwordInput: !!opts.passwordInput,
  });
}

// Wire dialog actions
(function wireDialog() {
  const m = $('#dialogModal');
  if (!m) return;
  const btnCancel = $('#dialogCancel');
  const btnOk = $('#dialogOk');
  const input = $('#dialogInput');
  const inputWrap = $('#dialogInputWrap');

  function onCancel() {
    const isPrompt = !inputWrap.hidden;
    closeDialog(isPrompt ? null : false);
  }
  function onOk() {
    const isPrompt = !inputWrap.hidden;
    closeDialog(isPrompt ? input.value : true);
  }

  btnCancel.addEventListener('click', onCancel);
  btnOk.addEventListener('click', onOk);
  m.addEventListener('click', e => { if (e.target.id === 'dialogModal') onCancel(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); onOk(); }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  });
  m.addEventListener('keydown', e => {
    if (e.target === input) return;
    if (e.key === 'Enter') { e.preventDefault(); onOk(); }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  });
})();

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
    const sessionsForSrv = Array.from(activeSessions.values()).filter(a => a.server.id === s.id);
    const online = sessionsForSrv.some(a => a.connected);
    const connecting = !online && sessionsForSrv.some(a => a.connecting);
    if (online) el.classList.add('online');
    else if (connecting) el.classList.add('connecting');
    el.innerHTML = `
      <span class="srv-dot" title="${online ? 'Connected' : 'Offline'}"></span>
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
    // Single click → switch to / revive / create one session per server.
    // Double click (<320ms between clicks) → force a new parallel session.
    // Use the module-level tracker so the timer survives sidebar re-renders
    // triggered by the first click (e.g. online state flip).
    el.addEventListener('click', () => {
      const now = Date.now();
      const prev = _lastSrvClick.get(s.id) || 0;
      const isDouble = now - prev < 320;
      _lastSrvClick.set(s.id, isDouble ? 0 : now);
      connectServer(s, { allowDuplicate: isDouble });
    });
    list.appendChild(el);
  });
}

function updateStats() {
  const srv = $('#statServers');
  if (srv) srv.textContent = servers.length;
  const act = $('#statActive');
  if (act) act.textContent = activeSessions.size;
  const cnt = $('#srvCount');
  if (cnt) cnt.textContent = pad2(servers.length);
}

// ─── Modal ───
function resetPasswordEyes() {
  // Always start with passwords hidden — safer default, user has to click
  // the eye explicitly to reveal.
  $$('.pwd-eye').forEach(btn => {
    btn.classList.remove('on');
    btn.textContent = '◐';
    const target = document.getElementById(btn.dataset.target);
    if (target) target.type = 'password';
  });
}

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
  $('#f-path').value = '~';
  $('#btnDel').hidden = true;
  setAuthMode('password');
  resetPasswordEyes();
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
  resetPasswordEyes();
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
    defaultPath: $('#f-path').value.trim() || '~',
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
  const ok = await showConfirm('Decommission this endpoint permanently?', {
    title: 'DECOMMISSION ENDPOINT', okText: 'DECOMMISSION', danger: true,
  });
  if (!ok) return;
  servers = servers.filter(s => s.id !== editingId);
  await window.api.servers.save(servers);
  $('#modal').hidden = true;
  renderServerList();
  updateStats();
  toast('Endpoint decommissioned', 'warn');
});

// ─── Sessions + Tabs ───
function effectiveStartPath(server) {
  const p = ((server && server.defaultPath) || '').trim();
  // Anything that obviously means "just go to the user's home":
  if (!p) return '~';
  if (p === '~' || p === '.' || p === '$HOME') return '~';
  // Bare filesystem root is almost never what the user wants — treat as home
  if (p === '/') return '~';
  // Legacy default '/root' from earlier versions — unusable for non-root users
  if (p === '/root' && server && server.username && server.username !== 'root') {
    return '~';
  }
  return p;
}

// Maps the raw ssh2/Node error string into something a human can act on.
// Returns three flavours so we can use different copy in the terminal vs.
// the toast (terminal has space for a hint line; toasts must be short).
function humanizeSshError(raw) {
  const msg = String(raw || '').toLowerCase();
  if (msg.includes('all configured authentication methods failed') || msg.includes('authentication failed')) {
    return {
      toast: 'Wrong password or key — auth rejected',
      term: 'AUTH REJECTED · password or key changed on the server',
      hint: 'open the endpoint and re-enter the password / re-pick the key',
    };
  }
  if (msg.includes('econnrefused')) {
    return {
      toast: 'Connection refused — port closed or sshd down',
      term: 'CONNECTION REFUSED · nothing listening on that port',
      hint: 'check the host:port and that sshd is running',
    };
  }
  if (msg.includes('etimedout') || msg.includes('timed out')) {
    return {
      toast: 'Timed out — host unreachable',
      term: 'TIMEOUT · host did not answer in 20 s',
      hint: 'check VPN, firewall, or DNS',
    };
  }
  if (msg.includes('enotfound') || msg.includes('getaddrinfo') || msg.includes('eai_again')) {
    return {
      toast: 'Host not found (DNS)',
      term: 'DNS FAILURE · could not resolve hostname',
      hint: 'check spelling or your network',
    };
  }
  if (msg.includes('ehostunreach') || msg.includes('enetunreach')) {
    return {
      toast: 'Network unreachable',
      term: 'NETWORK UNREACHABLE · no route to host',
      hint: 'check VPN / interface',
    };
  }
  if (msg.includes('handshake failed') || msg.includes('protocol version')) {
    return {
      toast: 'SSH handshake failed',
      term: 'HANDSHAKE FAILED · server speaks a different SSH dialect',
      hint: 'verify port, may be hitting a non-SSH service',
    };
  }
  if (msg.includes('failed to read key')) {
    return {
      toast: 'Cannot read private key',
      term: 'KEY READ FAILED · ' + raw,
      hint: 'check the path and read permission',
    };
  }
  if (msg.includes('key parse') || msg.includes('encrypted private')) {
    return {
      toast: 'Key needs a passphrase or is unsupported',
      term: 'KEY PARSE FAILED · the file is encrypted or not in OpenSSH format',
      hint: 'set the passphrase in the endpoint config',
    };
  }
  // Fallback: prefix CONNECTION FAILED but keep the raw upstream text.
  return {
    toast: 'Connection failed: ' + raw,
    term: 'CONNECTION FAILED · ' + raw,
    hint: '',
  };
}

async function connectServer(server, options = {}) {
  const { allowDuplicate = false } = options;

  // Single-click path: at most one session per server. Match by id or by the
  // (host, port, user) tuple for resilience against id drift. If the existing
  // tab is dead, reuse the slot by disconnecting first.
  // Double-click (allowDuplicate = true) bypasses this entirely so the user
  // can open as many parallel sessions to the same host as they want.
  if (!allowDuplicate) {
    for (const [id, s] of activeSessions) {
      const sameServer = s.server.id === server.id
        || (s.server.host === server.host && (s.server.port || 22) === (server.port || 22) && s.server.username === server.username);
      if (sameServer) {
        if (s.connected) { setActiveTab(id); return; }
        await disconnectSession(id);
        break;
      }
    }
  }

  // Ensure the local home dir is resolved before we seed the session with it.
  // Boot normally sets `homeDir`, but if the IPC was slow or failed we fall
  // back here so the LOCAL pane never opens on "/".
  if (!homeDir || homeDir === '/') {
    try { homeDir = await window.api.local.home(); } catch (e) {}
  }

  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const startPath = effectiveStartPath(server);
  const sess = {
    server,
    view: 'term',
    remotePath: startPath && startPath !== '~' ? startPath : '.',
    localPath: homeDir || '/',
    term: null,
    fitAddon: null,
    wrap: null,
    termEl: null,
    sftpEl: null,
    localPaneEl: null,
    remotePaneEl: null,
    statusDotEl: null,
    cleanup: [],
    connecting: true,
    connected: false,
    selected: { local: new Set(), remote: new Set() },
    lastClicked: { local: null, remote: null },
  };
  activeSessions.set(sessionId, sess);
  renderWorkspace(sessionId);
  renderTabs();
  setActiveTab(sessionId);
  renderServerList();
  updateStats();

  const fontPreset = FONTS.find(x => x.id === currentFont) || FONTS[0];
  const termFontFamily = `"${firstFamilyName(fontPreset.mono)}", "JetBrains Mono", "Menlo", monospace`;
  const term = new Terminal({
    fontFamily: termFontFamily,
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

  term.writeln('\x1b[38;5;110m── MAXTER TRANSMISSION ─────────────────────────\x1b[0m');
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
    sess.connecting = false;
    sess.connected = true;
    setStatus(sess, 'ok');
    renderServerList();
  } catch (e) {
    sess.connecting = false;
    sess.connected = false;
    setStatus(sess, 'fail');
    renderServerList();
    const friendly = humanizeSshError(e.message || String(e));
    term.writeln('\x1b[38;5;203m✗ ' + friendly.term + '\x1b[0m');
    if (friendly.hint) term.writeln('\x1b[38;5;244m  ' + friendly.hint + '\x1b[0m');
    toast(friendly.toast, 'err');
    return;
  }

  const off1 = window.api.ssh.onData(sessionId, data => term.write(data));
  const off2 = window.api.ssh.onClose(sessionId, () => {
    term.writeln('\r\n\x1b[38;5;244m── LINK SEVERED ──\x1b[0m');
    sess.connecting = false;
    sess.connected = false;
    setStatus(sess, 'fail');
    stopMonitor(sess);   // halt polling so we don't spam dead exec calls
    renderTabs();
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

  // Terminal: do NOT auto-cd — the login shell lands in $HOME by default,
  // that's what the user expects. SFTP still uses the configured start path
  // (or home fallback) independently.

  // Resolve SFTP start path — verify it's listable; fall back to home if not
  const isHome = !startPath || startPath === '~' || startPath === '.' || startPath === '$HOME';
  let remoteStart = null;
  if (!isHome) {
    try {
      const rp = await window.api.sftp.realpath({ sessionId, path: startPath });
      // realpath doesn't verify the directory exists; probe with readdir
      await window.api.sftp.list({ sessionId, path: rp });
      remoteStart = rp;
    } catch (e) { /* fall through to home */ }
  }
  if (!remoteStart) {
    try { remoteStart = await window.api.sftp.realpath({ sessionId, path: '.' }); } catch (e) {}
  }
  if (remoteStart) {
    sess.remotePath = remoteStart;
    const inp = sess.remotePaneEl.querySelector('.fs-path');
    if (inp) inp.value = remoteStart;
  }

  // If the user already toggled away from the terminal while we were warming
  // up, the destination view is showing its skeleton/awaiting state — refresh
  // it now that the SSH session is live.
  if (sess.view === 'sftp') {
    loadRemote(sessionId);
    loadLocal(sessionId);
  } else if (sess.view === 'monitor') {
    startMonitor(sessionId);
  }
}

function setStatus(sess, kind) {
  if (!sess.statusDotEl) return;
  sess.statusDotEl.classList.remove('fail', 'warn');
  if (kind === 'fail') sess.statusDotEl.classList.add('fail');
  if (kind === 'warn') sess.statusDotEl.classList.add('warn');
  // Reconnect button visibility is driven by a class on the wrap — only the
  // 'fail' (link severed / connect failed) state shows it. 'warn' is the
  // normal "still handshaking" state, no point showing reconnect there.
  if (sess.wrap) {
    sess.wrap.classList.toggle('session-offline', kind === 'fail');
    sess.wrap.classList.toggle('session-reconnecting', kind === 'warn' && sess.connecting && !sess.connected);
  }
}

function renderTabs() {
  const bar = $('#tabsBar');
  // Preserve sidebar toggle and lock button; clear everything else
  const KEEP = new Set(['sidebarToggle', 'lockBtn']);
  Array.from(bar.children).forEach(c => {
    if (!KEEP.has(c.id)) c.remove();
  });
  const lockEl = bar.querySelector('#lockBtn');
  if (activeSessions.size === 0) {
    const ph = document.createElement('div');
    ph.className = 'tab-placeholder';
    ph.textContent = 'NO ACTIVE SESSIONS';
    if (lockEl) bar.insertBefore(ph, lockEl);
    else bar.appendChild(ph);
    return;
  }
  // Sequence numbering for duplicate sessions. If multiple sessions share the
  // same server.id, label them #1, #2, … in order of creation. Singletons get
  // nothing — no visual noise when there's just one.
  const groups = new Map();
  for (const [id, s] of activeSessions) {
    const key = s.server.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(id);
  }
  const seqOf = new Map();
  for (const [, ids] of groups) {
    if (ids.length > 1) ids.forEach((id, i) => seqOf.set(id, i + 1));
  }

  for (const [id, s] of activeSessions) {
    const el = document.createElement('div');
    el.className = 'tab' + (id === activeTabId ? ' active' : '');
    const seq = seqOf.get(id);
    const seqMarkup = seq ? `<span class="tab-seq">#${seq}</span>` : '';
    el.innerHTML = `
      ${seqMarkup}
      <span class="tab-name">${escapeHtml(s.server.name || s.server.host)}</span>
      <span class="tab-sub">${escapeHtml(s.server.host)}</span>
      <button class="tab-close" title="Disconnect">×</button>
    `;
    el.addEventListener('click', () => setActiveTab(id));
    el.querySelector('.tab-close').addEventListener('click', e => {
      e.stopPropagation();
      disconnectSession(id);
    });
    if (lockEl) bar.insertBefore(el, lockEl);
    else bar.appendChild(el);
  }
}

// Re-establish SSH on the same session. Reuses the existing terminal +
// IPC handler subscriptions (they're keyed by sessionId, so the new
// connection's data flows into the same xterm). Only allowed when the
// session is in a clean offline state — clicking spam-reconnect during a
// live link or in-flight handshake is a no-op.
async function reconnectSession(sessionId) {
  const sess = activeSessions.get(sessionId);
  if (!sess || sess.connecting || sess.connected) return;
  if (!sess.term) return;
  sess.connecting = true;
  setStatus(sess, 'warn');
  renderServerList();
  sess.term.writeln('\r\n\x1b[38;5;244m── RE-ESTABLISHING LINK ──\x1b[0m');
  try {
    await window.api.ssh.connect({
      sessionId,
      server: sess.server,
      cols: sess.term.cols,
      rows: sess.term.rows,
    });
    sess.connecting = false;
    sess.connected = true;
    setStatus(sess, 'ok');
    renderServerList();
    renderTabs();
    sess.term.writeln('\x1b[38;5;120m✓ LINK RESTORED\x1b[0m');
    if (sess.view === 'monitor') { resetMonitorSkeleton(sess); startMonitor(sessionId); }
    else if (sess.view === 'sftp') { loadLocal(sessionId); loadRemote(sessionId); }
  } catch (e) {
    sess.connecting = false;
    sess.connected = false;
    setStatus(sess, 'fail');
    renderServerList();
    sess.term.writeln('\x1b[38;5;203m✗ RECONNECT FAILED · ' + (e.message || e) + '\x1b[0m');
    toast('Reconnect failed: ' + (e.message || e), 'err');
  }
}

async function disconnectSession(sessionId) {
  const s = activeSessions.get(sessionId);
  if (!s) return;
  stopMonitor(s);
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
        <button class="seg" data-mode="monitor">PANEL</button>
      </div>
      <div class="view-info">
        <button class="reconnect-btn" data-act="reconnect" title="Re-establish link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square">
            <path d="M3 12a9 9 0 0 1 16-5.7"/><path d="M19 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-16 5.7"/><path d="M5 21v-5h5"/>
          </svg>
          <span>RECONNECT</span>
        </button>
        <span class="info-dot warn"></span>
        <span class="view-host">${escapeHtml(sess.server.username)}@${escapeHtml(sess.server.host)}:${sess.server.port || 22}</span>
      </div>
    </div>
    <div class="view-body">
      <div class="term-pane"></div>
      <div class="monitor-pane" hidden>
        <div class="mon-grid">
          <section class="mon-card mon-cpu loading">
            <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
            <header class="mon-head"><span>CPU</span><span class="mon-sub"></span></header>
            <div class="mon-big"><span class="mon-val">—</span><span class="mon-unit">%</span></div>
            <div class="mon-bar"><div class="mon-bar-fill"></div></div>
            <div class="mon-meta"></div>
          </section>
          <section class="mon-card mon-mem loading">
            <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
            <header class="mon-head"><span>MEMORY</span><span class="mon-sub"></span></header>
            <div class="mon-big"><span class="mon-val">—</span><span class="mon-unit">%</span></div>
            <div class="mon-bar"><div class="mon-bar-fill"></div></div>
            <div class="mon-meta"></div>
          </section>
          <section class="mon-card mon-disk loading">
            <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
            <header class="mon-head"><span>DISK</span><span class="mon-sub"></span></header>
            <div class="mon-list">
              <div class="mon-skel"></div><div class="mon-skel"></div><div class="mon-skel"></div>
            </div>
          </section>
          <section class="mon-card mon-docker loading">
            <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
            <header class="mon-head"><span>DOCKER CONTAINERS</span><span class="mon-sub"></span></header>
            <div class="mon-list">
              <div class="mon-skel"></div><div class="mon-skel"></div><div class="mon-skel"></div>
            </div>
          </section>
          <section class="mon-card mon-ports loading">
            <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
            <header class="mon-head"><span>LISTENING PORTS</span><span class="mon-sub"></span></header>
            <div class="mon-list">
              <div class="mon-skel"></div><div class="mon-skel"></div><div class="mon-skel"></div>
            </div>
          </section>
          <section class="mon-card mon-sites loading">
            <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
            <header class="mon-head"><span>NGINX SITES</span><span class="mon-sub"></span></header>
            <div class="mon-list">
              <div class="mon-skel"></div><div class="mon-skel"></div><div class="mon-skel"></div>
            </div>
          </section>
          <section class="mon-card mon-fw loading">
            <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
            <header class="mon-head">
              <span>FIREWALL · INPUT</span>
              <span class="mon-sub"></span>
            </header>
            <div class="mon-list">
              <div class="mon-skel"></div><div class="mon-skel"></div><div class="mon-skel"></div>
            </div>
          </section>
          <section class="mon-card mon-vols loading">
            <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
            <header class="mon-head"><span>DOCKER VOLUMES</span><span class="mon-sub"></span></header>
            <div class="mon-list">
              <div class="mon-skel"></div><div class="mon-skel"></div><div class="mon-skel"></div>
            </div>
          </section>
        </div>
      </div>
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
              <div class="fs-path-wrap">
                <div class="fs-crumbs" tabindex="0"></div>
                <input class="fs-path" value="${escapeHtml(sess.localPath)}" spellcheck="false" hidden>
              </div>
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
              <div class="fs-path-wrap">
                <div class="fs-crumbs" tabindex="0"></div>
                <input class="fs-path" value="${escapeHtml(sess.remotePath)}" spellcheck="false" hidden>
              </div>
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
  sess.monitorEl = wrap.querySelector('.monitor-pane');
  sess.localPaneEl = wrap.querySelector('.local-pane');
  sess.remotePaneEl = wrap.querySelector('.remote-pane');
  sess.statusDotEl = wrap.querySelector('.info-dot');
  wrap.querySelector('.reconnect-btn').addEventListener('click', () => reconnectSession(sessionId));

  // Mode toggle
  wrap.querySelectorAll('.mode-seg .seg').forEach(b => {
    b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      wrap.querySelectorAll('.mode-seg .seg').forEach(x => x.classList.toggle('active', x === b));
      sess.termEl.hidden = mode !== 'term';
      sess.sftpEl.hidden = mode !== 'sftp';
      sess.monitorEl.hidden = mode !== 'monitor';
      sess.view = mode;
      if (mode === 'term') {
        stopMonitor(sess);
        setTimeout(() => { try { sess.fitAddon && sess.fitAddon.fit(); } catch (e) {} }, 50);
      } else if (mode === 'sftp') {
        stopMonitor(sess);
        loadLocal(sessionId);
        loadRemote(sessionId);
      } else if (mode === 'monitor') {
        startMonitor(sessionId);
      }
    });
  });

  bindPaneBar(sessionId, sess.localPaneEl, 'local');
  bindPaneBar(sessionId, sess.remotePaneEl, 'remote');
}

function bindPaneBar(sessionId, paneEl, side) {
  const pathInput = paneEl.querySelector('.fs-path');
  const crumbsEl = paneEl.querySelector('.fs-crumbs');
  const curKeyOf = () => side === 'local' ? 'localPath' : 'remotePath';
  const loadOf = () => side === 'local' ? loadLocal : loadRemote;

  // ── Path input (edit mode) ──
  const exitEdit = (commit) => {
    const sess = activeSessions.get(sessionId);
    if (!sess) return;
    if (commit) {
      const v = pathInput.value.trim();
      sess[curKeyOf()] = v || (side === 'local' ? homeDir : '/');
      loadOf()(sessionId);
    }
    pathInput.hidden = true;
    crumbsEl.hidden = false;
  };
  pathInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') exitEdit(true);
    else if (e.key === 'Escape') {
      const sess = activeSessions.get(sessionId);
      if (sess) pathInput.value = sess[curKeyOf()];
      exitEdit(false);
    }
  });
  pathInput.addEventListener('blur', () => exitEdit(true));

  // ── Breadcrumb clicks: navigate; click on empty area → switch to edit ──
  crumbsEl.addEventListener('click', (e) => {
    const sess = activeSessions.get(sessionId);
    if (!sess) return;
    const crumb = e.target.closest('.crumb');
    if (crumb && crumb.dataset.path !== undefined) {
      sess[curKeyOf()] = crumb.dataset.path;
      pathInput.value = crumb.dataset.path;
      loadOf()(sessionId);
      return;
    }
    // Click in the empty trailing area → enter edit mode.
    crumbsEl.hidden = true;
    pathInput.hidden = false;
    pathInput.focus();
    pathInput.select();
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
        const name = await showPrompt('New directory name:', '', {
          title: 'NEW DIRECTORY', okText: 'CREATE',
        });
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

// ─── Path bar (breadcrumb + edit mode) ───
function syncPathBar(sess, side) {
  const paneEl = side === 'local' ? sess.localPaneEl : sess.remotePaneEl;
  if (!paneEl) return;
  const path = side === 'local' ? sess.localPath : sess.remotePath;
  const input = paneEl.querySelector('.fs-path');
  const crumbs = paneEl.querySelector('.fs-crumbs');
  if (input) input.value = path;
  if (crumbs) renderCrumbs(crumbs, path);
}

// Path → list of clickable crumbs separated by `/`. Selecting across the row
// yields the original path text (separators are real `/` chars).
function renderCrumbs(crumbsEl, fullPath) {
  crumbsEl.innerHTML = '';
  if (!fullPath) return;
  const norm = fullPath.replace(/\/+$/, '') || '/';
  const isAbs = norm.startsWith('/');
  const parts = norm.split('/').filter(Boolean);

  let acc;
  if (isAbs) {
    const root = document.createElement('span');
    root.className = 'crumb crumb-root';
    root.dataset.path = '/';
    root.textContent = '/';
    crumbsEl.appendChild(root);
    acc = '';
  } else if (parts.length) {
    // Windows-style: drive letter (or first segment) acts as root.
    const drive = parts.shift();
    const root = document.createElement('span');
    root.className = 'crumb crumb-root';
    root.dataset.path = drive + '/';
    root.textContent = drive;
    crumbsEl.appendChild(root);
    acc = drive;
  }

  parts.forEach((p, i) => {
    // Skip separator only when root '/' is already acting as one (unix abs,
    // first segment). Everywhere else we emit an explicit `/`.
    if (!(isAbs && i === 0)) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = '/';
      crumbsEl.appendChild(sep);
    }
    acc += '/' + p;
    const c = document.createElement('span');
    c.className = 'crumb';
    c.dataset.path = acc;
    c.textContent = p;
    crumbsEl.appendChild(c);
  });
}

async function loadLocal(sessionId) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  syncPathBar(sess, 'local');
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
  syncPathBar(sess, 'remote');
  const list = sess.remotePaneEl.querySelector('.fs-list');

  // SSH still warming up? Show "awaiting link" and bail — once connectServer
  // finishes it calls loadRemote again, so the listing fills in automatically.
  // This prevents the "SCAN FAILED · No active session" flash when the user
  // toggles to SFTP before the shell is ready.
  if (!sess.connected) {
    list.innerHTML = '<div class="loading">AWAITING LINK · REMOTE</div>';
    return;
  }

  list.innerHTML = '<div class="loading">SCANNING · REMOTE</div>';

  // If the path is still the placeholder (fast SFTP click before connectServer
  // finished its realpath), resolve $HOME on the remote now.
  if (!sess.remotePath || sess.remotePath === '.' || sess.remotePath === '~') {
    try {
      const rp = await window.api.sftp.realpath({ sessionId, path: '.' });
      sess.remotePath = rp;
      syncPathBar(sess, 'remote');
    } catch (e) { /* fall through — sftp.list will report */ }
  }

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

  // Wipe selection when the listed directory changed; otherwise (refresh of
  // the same dir) just drop entries whose names disappeared.
  const curKey = side === 'local' ? 'localPath' : 'remotePath';
  if (!sess._listedPath) sess._listedPath = { local: null, remote: null };
  if (sess._listedPath[side] !== sess[curKey]) {
    sess.selected[side].clear();
    sess.lastClicked[side] = null;
    sess._listedPath[side] = sess[curKey];
  } else {
    const present = new Set(items.map(i => i.name));
    for (const n of [...sess.selected[side]]) {
      if (!present.has(n)) sess.selected[side].delete(n);
    }
  }

  listEl.innerHTML = '';
  if (items.length === 0) {
    listEl.innerHTML = '<div class="empty">EMPTY</div>';
    return;
  }

  const arrow = side === 'local' ? '→' : '←';
  // Index for shift-range selection; mirrors render order so consecutive
  // rows in the DOM are also consecutive in this list.
  const orderedNames = items.map(i => i.name);

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'fs-row' + (item.isDir ? ' dir' : '');
    if (sess.selected[side].has(item.name)) row.classList.add('selected');
    row.dataset.name = item.name;
    // Symlinks aren't followed in transfers (avoids loops/escapes); skip drag.
    if (!item.isLink) row.draggable = true;
    const icon = item.isDir ? '▪' : (item.isLink ? '↪' : '·');
    const xferTitle = side === 'local'
      ? (item.isDir ? 'Upload directory to remote' : 'Upload to remote')
      : (item.isDir ? 'Download directory to local' : 'Download to local');
    row.innerHTML = `
      <span class="f-ico">${icon}</span>
      <span class="f-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
      <span class="f-size">${item.isDir ? '—' : humanSize(item.size)}</span>
      <span class="f-date">${fmtDate(item.mtime)}</span>
      <span class="f-actions">
        ${item.isLink ? '' : `<button class="row-btn transfer" data-act="xfer" title="${xferTitle}">${arrow}</button>`}
        <button class="row-btn" data-act="rn" title="Rename">✎</button>
        <button class="row-btn danger" data-act="rm" title="Delete">×</button>
      </span>
    `;

    row.addEventListener('click', (e) => {
      if (e.target.closest('.row-btn')) return;
      const sel = sess.selected[side];
      if (e.shiftKey && sess.lastClicked[side]) {
        const a = orderedNames.indexOf(sess.lastClicked[side]);
        const b = orderedNames.indexOf(item.name);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          if (!(e.metaKey || e.ctrlKey)) sel.clear();
          for (let i = lo; i <= hi; i++) sel.add(orderedNames[i]);
        }
      } else if (e.metaKey || e.ctrlKey) {
        if (sel.has(item.name)) sel.delete(item.name);
        else sel.add(item.name);
        sess.lastClicked[side] = item.name;
      } else {
        sel.clear();
        sel.add(item.name);
        sess.lastClicked[side] = item.name;
      }
      paintSelection(sess, side);
    });

    // Double-click: dirs navigate, files no-op (use the transfer button).
    row.addEventListener('dblclick', (e) => {
      if (e.target.closest('.row-btn')) return;
      if (!item.isDir) return;
      sess[curKey] = joinPath(sess[curKey], item.name);
      (side === 'local' ? loadLocal : loadRemote)(sessionId);
    });

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // If user right-clicks an unselected row, switch the selection to it
      // first (matches Finder/Explorer); otherwise the menu acts on whatever
      // is already selected.
      if (!sess.selected[side].has(item.name)) {
        sess.selected[side].clear();
        sess.selected[side].add(item.name);
        sess.lastClicked[side] = item.name;
        paintSelection(sess, side);
      }
      showContextMenu(e.clientX, e.clientY, sessionId, side, item);
    });

    row.addEventListener('dragstart', (e) => {
      if (item.isLink) { e.preventDefault(); return; }
      // If user starts dragging a row that isn't part of the current
      // selection, switch to single-item drag — matches native file managers.
      if (!sess.selected[side].has(item.name)) {
        sess.selected[side].clear();
        sess.selected[side].add(item.name);
        paintSelection(sess, side);
      }
      const names = [...sess.selected[side]];
      const payload = JSON.stringify({ sessionId, side, names });
      // Custom mime carries our routing info; text/plain is set so Chromium
      // recognises this as a real DnD payload (some Electron versions silently
      // drop drags with only non-standard mime types).
      e.dataTransfer.setData('application/x-maxter-files', payload);
      e.dataTransfer.setData('text/plain', names.join('\n'));
      // 'move' over 'copy' so the OS doesn't slap a + badge on the cursor —
      // the actual transfer is still a copy (we never delete the source);
      // dropEffect is just a UI hint and our drop handler ignores it.
      e.dataTransfer.effectAllowed = 'move';
      sess._dragPayload = { sessionId, side, names };
    });

    row.addEventListener('dragend', () => {
      sess._dragPayload = null;
      // Belt-and-suspenders: clear the highlight from any pane that still has
      // it (in case dragleave didn't fire — happens on fast cursor exits).
      document.querySelectorAll('.fs-list.drag-target').forEach(el => el.classList.remove('drag-target'));
    });

    row.querySelectorAll('.f-actions .row-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'xfer') {
          // If row is in the current selection, transfer the whole batch;
          // otherwise just this one.
          const sel = sess.selected[side];
          const names = sel.has(item.name) ? [...sel] : [item.name];
          await handleBatchTransfer(sessionId, side, names);
        } else if (act === 'rn') {
          const nn = await showPrompt('Rename to:', item.name, {
            title: 'RENAME', okText: 'RENAME',
          });
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
          const ok = await showConfirm(
            'Delete ' + item.name + (item.isDir ? ' (recursive)' : '') + '?',
            { title: 'DELETE', okText: 'DELETE', danger: true }
          );
          if (!ok) return;
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

  bindPaneDropTarget(sessionId, side);
}

function paintSelection(sess, side) {
  const paneEl = side === 'local' ? sess.localPaneEl : sess.remotePaneEl;
  if (!paneEl) return;
  paneEl.querySelectorAll('.fs-row').forEach(r => {
    r.classList.toggle('selected', sess.selected[side].has(r.dataset.name));
  });
}

function bindPaneDropTarget(sessionId, side) {
  // Bind drop on the WHOLE pane (header, bar, list) so users can release
  // anywhere over the destination column, not just the file list. Stable
  // across renders, so guard with a flag to avoid double-binding.
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  const paneEl = side === 'local' ? sess.localPaneEl : sess.remotePaneEl;
  if (!paneEl || paneEl._dropBound) return;
  paneEl._dropBound = true;

  // Counter pattern for dragenter/leave: child elements (rows, headers) fire
  // their own enter/leave events that bubble up, so a single boolean flips
  // constantly. Counting enters/leaves gives a stable "drag inside pane".
  let dragDepth = 0;

  const isOurDrag = (e) => {
    if (!e.dataTransfer) return false;
    const types = e.dataTransfer.types;
    if (!types) return false;
    // DOMStringList in older specs, plain array in newer — handle both.
    for (let i = 0; i < types.length; i++) {
      if (types[i] === 'application/x-maxter-files') return true;
    }
    return false;
  };

  const sameSide = () => {
    const s = activeSessions.get(sessionId);
    const src = s && s._dragPayload;
    return src && src.side === side;
  };

  paneEl.addEventListener('dragenter', (e) => {
    if (!isOurDrag(e) || sameSide()) return;
    e.preventDefault();
    dragDepth++;
    paneEl.classList.add('drag-target');
  });

  paneEl.addEventListener('dragover', (e) => {
    if (!isOurDrag(e) || sameSide()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  paneEl.addEventListener('dragleave', (e) => {
    if (!isOurDrag(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) paneEl.classList.remove('drag-target');
  });

  paneEl.addEventListener('drop', async (e) => {
    if (!isOurDrag(e)) return;
    e.preventDefault();
    dragDepth = 0;
    paneEl.classList.remove('drag-target');
    if (sameSide()) return;
    const s = activeSessions.get(sessionId);
    if (!s) return;
    let payload = s._dragPayload;
    if (!payload) {
      try {
        const raw = e.dataTransfer.getData('application/x-maxter-files');
        if (raw) payload = JSON.parse(raw);
      } catch (_) {}
    }
    if (!payload) return;
    await handleBatchTransfer(payload.sessionId, payload.side, payload.names);
  });
}

async function handleBatchTransfer(sessionId, side, names) {
  const sess = activeSessions.get(sessionId);
  if (!sess || !names || !names.length) return;

  const srcDir = side === 'local' ? sess.localPath : sess.remotePath;
  const dstDir = side === 'local' ? sess.remotePath : sess.localPath;

  // Re-list source so we know each name's isDir/isLink — selection only
  // tracks names, not metadata.
  let srcItems = [];
  try {
    srcItems = side === 'local'
      ? await window.api.local.list({ path: srcDir })
      : await window.api.sftp.list({ sessionId, path: srcDir });
  } catch (e) {
    toast('Could not read source: ' + e.message, 'err');
    return;
  }
  const itemMap = new Map(srcItems.map(i => [i.name, i]));

  // Cache of dest-side names for unique-name generation in "copy" mode. Lazy
  // so we don't pay the readdir cost when there are no conflicts.
  let dstNamesCache = null;
  const getDstNames = async () => {
    if (dstNamesCache) return dstNamesCache;
    try {
      const list = side === 'local'
        ? await window.api.sftp.list({ sessionId, path: dstDir })
        : await window.api.local.list({ path: dstDir });
      dstNamesCache = new Set(list.map(i => i.name));
    } catch (_) {
      dstNamesCache = new Set();
    }
    return dstNamesCache;
  };

  let okN = 0, failN = 0, skippedN = 0;
  let applyAll = null; // 'overwrite' | 'copy' | 'cancel' once user picks

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const item = itemMap.get(name);
    if (!item) { skippedN++; continue; }
    if (item.isLink) { skippedN++; continue; } // symlinks not followed

    let destName = name;
    const destPath = joinPath(dstDir, name);
    const exists = side === 'local'
      ? await window.api.sftp.exists({ sessionId, path: destPath })
      : await window.api.local.exists({ path: destPath });

    if (exists) {
      const decision = applyAll
        ? { action: applyAll, applyAll: true }
        : await showOverwriteDialog(name, dstDir, side);
      if (decision.applyAll) applyAll = decision.action;

      if (decision.action === 'cancel') {
        if (applyAll === 'cancel') {
          skippedN += names.length - i;
          break;
        }
        skippedN++;
        continue;
      }
      if (decision.action === 'copy') {
        const used = await getDstNames();
        destName = uniqueName(name, used);
        used.add(destName);
      }
      // 'overwrite' → leave destName alone
    }

    const finalDest = joinPath(dstDir, destName);
    try {
      const srcPath = joinPath(srcDir, name);
      if (side === 'local') {
        if (item.isDir) await window.api.sftp.sendDir({ sessionId, localPath: srcPath, remotePath: finalDest });
        else            await window.api.sftp.sendFile({ sessionId, localPath: srcPath, remotePath: finalDest });
      } else {
        if (item.isDir) await window.api.sftp.getDir({ sessionId, remotePath: srcPath, localPath: finalDest });
        else            await window.api.sftp.getFile({ sessionId, remotePath: srcPath, localPath: finalDest });
      }
      okN++;
    } catch (e) {
      failN++;
      toast('Failed · ' + name + ' · ' + e.message, 'err');
    }
  }

  const verb = side === 'local' ? 'Uploaded' : 'Downloaded';
  const tail = skippedN ? `, ${skippedN} skipped` : '';
  if (okN && !failN) toast(`${verb} ${okN} item${okN > 1 ? 's' : ''}${tail}`, 'ok');
  else if (okN && failN) toast(`${verb} ${okN}, ${failN} failed${tail}`, 'err');
  else if (skippedN && !okN && !failN) toast(`Skipped ${skippedN}`, 'warn');

  sess.selected[side].clear();
  paintSelection(sess, side);
  if (side === 'local') loadRemote(sessionId); else loadLocal(sessionId);
}

// "file.txt" + {file.txt, file (2).txt} → "file (3).txt".
// Walks the existing-set until we land on a free name. Preserves the last
// extension; treats `tar.gz`-style as a single ext is intentionally NOT
// supported (matches macOS Finder behaviour).
function uniqueName(name, used) {
  if (!used.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const hasExt = dot > 0 && dot < name.length - 1;
  const base = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : '';
  const m = base.match(/^(.*) \((\d+)\)$/);
  const stem = m ? m[1] : base;
  let n = m ? parseInt(m[2], 10) + 1 : 2;
  let candidate = `${stem} (${n})${ext}`;
  while (used.has(candidate)) {
    n++;
    candidate = `${stem} (${n})${ext}`;
  }
  return candidate;
}

function showOverwriteDialog(name, dstDir, srcSide) {
  return new Promise(resolve => {
    const destLabel = srcSide === 'local' ? 'REMOTE' : 'LOCAL';
    const back = document.createElement('div');
    back.className = 'modal info-modal';
    back.innerHTML = `
      <div class="modal-body dialog-body ovr-body">
        <span class="corner tl"></span><span class="corner tr"></span>
        <span class="corner bl"></span><span class="corner br"></span>
        <div class="modal-header">ITEM EXISTS</div>
        <div class="dialog-msg ovr-msg">
          <div class="ovr-name">${escapeHtml(name)}</div>
          <div class="ovr-path">already exists at <span class="ovr-dest">${destLabel} · ${escapeHtml(dstDir)}</span></div>
        </div>
        <label class="ovr-applyall">
          <input type="checkbox" class="ovr-applyall-cb">
          <span>APPLY TO REMAINING ITEMS</span>
        </label>
        <div class="modal-footer ovr-foot">
          <button class="btn btn-ghost ovr-cancel">SKIP</button>
          <button class="btn btn-ghost ovr-copy">TRANSFER AS COPY</button>
          <button class="btn btn-primary ovr-overwrite">OVERWRITE</button>
        </div>
      </div>
    `;
    document.body.appendChild(back);
    const cb = back.querySelector('.ovr-applyall-cb');
    const finish = (action) => {
      back.remove();
      document.removeEventListener('keydown', onEsc);
      resolve({ action, applyAll: cb.checked });
    };
    function onEsc(e) { if (e.key === 'Escape') finish('cancel'); }
    back.querySelector('.ovr-overwrite').onclick = () => finish('overwrite');
    back.querySelector('.ovr-copy').onclick = () => finish('copy');
    back.querySelector('.ovr-cancel').onclick = () => finish('cancel');
    back.addEventListener('click', (e) => { if (e.target === back) finish('cancel'); });
    document.addEventListener('keydown', onEsc);
    setTimeout(() => back.querySelector('.ovr-overwrite').focus(), 50);
  });
}

// ─── Monitor tab ───
// Polls system + docker metrics over the existing SSH connection via
// ssh.exec. Two cadences:
//   fast (2 s):  /proc/stat + /proc/meminfo — trivial read, always cheap
//   slow (8 s):  df, docker stats, docker system df -v — heavier (docker
//                stats samples for 1 s, so 8 s gives it headroom)
// CPU utilisation needs two /proc/stat samples to compute, so first tick
// only primes the baseline; real number appears on the second tick.
//
// Commands are wrapped in `2>/dev/null || true` so a missing docker, missing
// lscpu, etc., don't spew stderr into the output. We still check exit code
// separately via the ssh:exec result to decide whether to show a placeholder.

function startMonitor(sessionId) {
  const sess = activeSessions.get(sessionId);
  if (!sess || !sess.connected) {
    // Session not ready yet — show waiting state; the mode-toggle re-enters
    // this once connected.
    if (sess && sess.monitorEl) {
      sess.monitorEl.querySelector('.mon-cpu .mon-val').textContent = '—';
    }
    return;
  }
  sess.monitor = sess.monitor || { timers: [], prevCpu: null, cpuInfo: null, active: false };
  if (sess.monitor.active) return;
  sess.monitor.active = true;

  const fast = () => { if (sess.monitor.active) pollFast(sessionId).catch(() => {}); };
  const slow = () => { if (sess.monitor.active) pollSlow(sessionId).catch(() => {}); };

  // Prime once immediately, then interval. Static info (CPU model, host) is
  // only fetched on first start — doesn't change mid-session.
  if (!sess.monitor.cpuInfo) pollStatic(sessionId).catch(() => {});
  fast();
  slow();
  sess.monitor.timers.push(setInterval(fast, 2000));
  sess.monitor.timers.push(setInterval(slow, 8000));

  // One-time card click bindings (drilldowns). Idempotent via _drillBound.
  if (!sess.monitorEl._drillBound) {
    sess.monitorEl._drillBound = true;
    sess.monitorEl.querySelector('.mon-cpu').addEventListener('click', () =>
      showProcessesModal(sessionId, 'cpu'));
    sess.monitorEl.querySelector('.mon-mem').addEventListener('click', () =>
      showProcessesModal(sessionId, 'mem'));
    sess.monitorEl.querySelector('.mon-disk').addEventListener('click', (e) => {
      // If the click landed on a row inside the card, drill into that mount.
      const row = e.target.closest('.mon-row');
      const mount = row && row.dataset.mount;
      showDiskModal(sessionId, mount || '/');
    });
  }
}

function stopMonitor(sess) {
  if (!sess || !sess.monitor) return;
  sess.monitor.timers.forEach(clearInterval);
  sess.monitor.timers = [];
  sess.monitor.active = false;
}

// Wipe rendered values back to the initial loading state. Called on
// reconnect (data is stale) so skeletons show until fresh poll lands.
function resetMonitorSkeleton(sess) {
  if (!sess || !sess.monitorEl) return;
  ['cpu', 'mem'].forEach(k => {
    const c = sess.monitorEl.querySelector('.mon-' + k);
    if (!c) return;
    c.classList.add('loading');
    c.classList.remove('hot', 'warm');
    const v = c.querySelector('.mon-val'); if (v) v.textContent = '—';
    const b = c.querySelector('.mon-bar-fill'); if (b) b.style.width = '0';
    const m = c.querySelector('.mon-meta'); if (m) m.textContent = '';
  });
  ['disk', 'docker', 'ports', 'sites', 'fw', 'vols'].forEach(k => {
    const c = sess.monitorEl.querySelector('.mon-' + k);
    if (!c) return;
    c.classList.add('loading');
    const list = c.querySelector('.mon-list');
    if (list) list.innerHTML = '<div class="mon-skel"></div><div class="mon-skel"></div><div class="mon-skel"></div>';
    const sub = c.querySelector('.mon-sub');
    if (sub) sub.textContent = '';
  });
  if (sess.monitor) {
    sess.monitor.prevCpu = null;        // re-prime CPU baseline
    sess.monitor.attempts = {};         // re-grant the empty-poll grace
    sess.monitor.seen = {};             // drop stickiness — server may have changed
  }
}

async function execOut(sessionId, cmd, timeoutMs) {
  try {
    const r = await window.api.ssh.exec({ sessionId, cmd, timeoutMs });
    return r;
  } catch (e) {
    return { stdout: '', stderr: String(e.message || e), code: -1 };
  }
}

async function pollStatic(sessionId) {
  const sess = activeSessions.get(sessionId);
  if (!sess || !sess.monitorEl) return;

  const r = await execOut(sessionId,
    "lscpu 2>/dev/null || cat /proc/cpuinfo 2>/dev/null | head -30; echo '---'; uname -srm 2>/dev/null; echo '---'; (cat /etc/os-release 2>/dev/null | grep PRETTY_NAME || true)",
    5000);
  const [cpuRaw, kernelRaw, osRaw] = (r.stdout || '').split('---');

  // Try lscpu-style ("Model name: Intel ..."), fallback to cpuinfo.
  let model = null, cores = null, mhz = null;
  const cpuText = cpuRaw || '';
  const m1 = cpuText.match(/Model name:\s*(.+)/i);
  if (m1) model = m1[1].trim();
  else {
    const m2 = cpuText.match(/model name\s*:\s*(.+)/);
    if (m2) model = m2[1].trim();
  }
  const cm = cpuText.match(/^CPU\(s\):\s*(\d+)/mi) || cpuText.match(/^cpu cores\s*:\s*(\d+)/mi);
  if (cm) cores = parseInt(cm[1], 10);
  // Fallback: count processor lines in cpuinfo.
  if (!cores) {
    const procs = (cpuText.match(/^processor\s*:/gm) || []).length;
    if (procs) cores = procs;
  }
  const mh = cpuText.match(/CPU MHz:\s*([\d.]+)/i) || cpuText.match(/cpu MHz\s*:\s*([\d.]+)/);
  if (mh) mhz = parseFloat(mh[1]);

  sess.monitor.cpuInfo = { model, cores, mhz };

  const parts = [];
  if (model) parts.push(model);
  if (cores) parts.push(`${cores} core${cores > 1 ? 's' : ''}`);
  if (mhz) parts.push(`${(mhz / 1000).toFixed(2)} GHz`);
  sess.monitorEl.querySelector('.mon-cpu .mon-meta').textContent = parts.join(' · ') || '—';

  const kernel = (kernelRaw || '').trim();
  const osLine = ((osRaw || '').match(/PRETTY_NAME="?([^"\n]+)/) || [])[1] || '';
  const sub = [osLine, kernel].filter(Boolean).join(' · ');
  sess.monitorEl.querySelector('.mon-cpu .mon-sub').textContent = sub;
}

async function pollFast(sessionId) {
  const sess = activeSessions.get(sessionId);
  if (!sess || !sess.monitorEl) return;

  const r = await execOut(sessionId,
    "head -1 /proc/stat 2>/dev/null; echo '---'; cat /proc/meminfo 2>/dev/null",
    4000);
  const [cpuRaw, memRaw] = (r.stdout || '').split('---');

  // ── CPU % ────────────────────────────────────────
  // /proc/stat top line: cpu user nice system idle iowait irq softirq steal ...
  const nums = (cpuRaw || '').trim().split(/\s+/).slice(1).map(Number);
  if (nums.length >= 4) {
    const idle = (nums[3] || 0) + (nums[4] || 0);           // idle + iowait
    const total = nums.reduce((a, b) => a + (b || 0), 0);
    const prev = sess.monitor.prevCpu;
    sess.monitor.prevCpu = { idle, total };
    if (prev) {
      const dt = total - prev.total;
      const di = idle - prev.idle;
      const pct = dt > 0 ? Math.max(0, Math.min(100, 100 * (1 - di / dt))) : 0;
      renderBar(sess.monitorEl.querySelector('.mon-cpu'), pct);
    }
  }

  // ── Memory ───────────────────────────────────────
  if (memRaw) {
    const get = (k) => {
      const m = memRaw.match(new RegExp(`^${k}:\\s+(\\d+)`, 'm'));
      return m ? parseInt(m[1], 10) * 1024 : null;  // kB → bytes
    };
    const total = get('MemTotal');
    const avail = get('MemAvailable') ?? (() => {
      // Fallback for very old kernels without MemAvailable.
      const free = get('MemFree') || 0;
      const buff = get('Buffers') || 0;
      const cache = get('Cached') || 0;
      return free + buff + cache;
    })();
    if (total) {
      const used = total - (avail || 0);
      const pct = (used / total) * 100;
      const card = sess.monitorEl.querySelector('.mon-mem');
      renderBar(card, pct);
      card.querySelector('.mon-meta').textContent = `${humanSize(used)} / ${humanSize(total)}`;
    }
  }
}

async function pollSlow(sessionId) {
  const sess = activeSessions.get(sessionId);
  if (!sess || !sess.monitorEl) return;

  // Run these in parallel — each is independent and slow commands
  // (docker stats samples for 1 s) shouldn't block faster ones.
  const [dfR, dpsR, dpsAllR, dvolR, dmapR, portsR, sitesR, fwR] = await Promise.all([
    execOut(sessionId, "df -h -P 2>/dev/null | awk 'NR==1 || ($1 !~ /tmpfs|devtmpfs|overlay|udev/)'", 5000),
    execOut(sessionId, "docker stats --no-stream --format '{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}' 2>/dev/null", 10000),
    // ALL containers (running + stopped). Status text starts with "Up" when
    // running ("Up 3 days"), or "Exited"/"Created"/"Restarting" otherwise.
    // Ports column is comma-separated host→guest publishings. Last three
    // columns are docker-compose labels (empty if container wasn't created
    // by compose) — we use them to show a project dir + offer rebuild.
    execOut(sessionId,
      "docker ps -a --format " +
      "'{{.Names}}\\t{{.Status}}\\t{{.Image}}\\t{{.Ports}}\\t" +
      "{{.Label \"com.docker.compose.project.working_dir\"}}\\t" +
      "{{.Label \"com.docker.compose.service\"}}\\t" +
      "{{.Label \"com.docker.compose.project.config_files\"}}' 2>/dev/null",
      5000),
    execOut(sessionId, "docker system df -v --format '{{json .}}' 2>/dev/null", 10000),
    // Container → volume mapping. {{.Mounts}} prints comma-separated mount
    // sources; named volumes appear as a bare name, bind mounts as absolute
    // paths (we filter those out by leading slash).
    execOut(sessionId, "docker ps -a --format '{{.Names}}|{{.Mounts}}' 2>/dev/null", 5000),
    // Listening sockets. ss -tlnp / -ulnp give TCP/UDP listeners. The
    // "users:" column with PID/process needs root to see other users'
    // processes. Try the privileged path (uses cached sudo password if the
    // user enabled sudo this session) and fall back to plain ss otherwise.
    // Wrapped in withPath because SSH non-interactive shells often miss
    // /usr/sbin/ from PATH and ss "not found" silently.
    execOut(sessionId,
      withPath(
        `(${withSudo('ss -tlnpH', sessionId)} 2>/dev/null || ss -tlnpH 2>/dev/null); ` +
        `echo '___UDP___'; ` +
        `(${withSudo('ss -ulnpH', sessionId)} 2>/dev/null || ss -ulnpH 2>/dev/null)`
      ),
      6000),
    // nginx sites: scan both classic Debian layout and conf.d. Per file
    // we emit the FULL path (so click→editor opens the right file) plus
    // server_name and listen lines.
    execOut(sessionId,
      "for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do " +
      "[ -f \"$f\" ] || continue; " +
      "echo \"=== $f\"; " +
      "grep -hE '^[[:space:]]*(server_name|listen)[[:space:]]' \"$f\" 2>/dev/null | sed 's/^[[:space:]]*//; s/;.*//'; " +
      "done 2>/dev/null; " +
      "[ -f /etc/nginx/nginx.conf ] && echo '___MAIN___/etc/nginx/nginx.conf'",
      5000),
    // Firewall rules — INPUT chain only (most relevant for "who can reach
    // me"). -S spits rules in iptables-restore syntax which is easy to
    // parse. Uses cached sudo password if available; otherwise sudo -n
    // (NOPASSWD); otherwise plain (usually empty for unprivileged users).
    // withPath because iptables typically lives in /usr/sbin or /sbin,
    // which non-interactive SSH shells often skip.
    execOut(sessionId,
      withPath(
        `(${withSudo('iptables -S INPUT', sessionId)} 2>/dev/null || iptables -S INPUT 2>/dev/null)`
      ),
      5000),
  ]);

  // Build {volumeName → [containerNames]} AND {containerName → [volumes]}
  // from one pass over docker ps output. Used both in renderVolumes (which
  // containers use a vol) and renderDocker (which vols a container uses).
  const volMap = new Map();
  const ctrVolMap = new Map();
  (dmapR.stdout || '').split('\n').filter(Boolean).forEach(line => {
    const [name, mounts] = line.split('|');
    if (!name || !mounts) return;
    mounts.split(',').map(s => s.trim()).filter(Boolean).forEach(m => {
      if (m.startsWith('/')) return;  // bind mount
      if (!volMap.has(m)) volMap.set(m, []);
      volMap.get(m).push(name);
      if (!ctrVolMap.has(name)) ctrVolMap.set(name, []);
      ctrVolMap.get(name).push(m);
    });
  });

  // Merge `docker ps -a` (canonical list of all containers) with `docker stats`
  // (resource numbers, only running). Stopped containers show status only.
  const statsByName = new Map();
  (dpsR.stdout || '').split('\n').filter(Boolean).forEach(line => {
    const [name, cpu, memUsage, memPct] = line.split('\t');
    statsByName.set(name, { cpu, memUsage, memPct });
  });
  const containers = (dpsAllR.stdout || '').split('\n').filter(Boolean).map(line => {
    const cols = line.split('\t');
    const [name, status, image, portsRaw, projDir, service, configFiles] = cols;
    const isRunning = (status || '').startsWith('Up');
    const stats = isRunning ? (statsByName.get(name) || {}) : {};
    return {
      name,
      status,
      image,
      ports: summarizePorts(portsRaw),
      isRunning,
      // Compose-managed if working_dir label is present; service/configFiles
      // come from the same Docker Compose spec labels.
      compose: projDir ? {
        dir: projDir,
        service: service || '',
        // config_files can be a comma-list when multiple `-f file.yml` were
        // passed; first one is "the" compose file for our links.
        configFile: (configFiles || '').split(',')[0] || '',
      } : null,
      // Named volumes attached to this container (bind mounts excluded).
      volumes: ctrVolMap.get(name) || [],
      ...stats,
    };
  });

  renderDisk(sess, dfR.stdout || '');
  renderDocker(sess, containers, dpsAllR.code, sessionId);
  renderPorts(sess, portsR.stdout || '', portsR.code, sessionId);
  renderSites(sess, sitesR.stdout || '', sitesR.code, sessionId);
  renderFirewall(sess, fwR.stdout || '', fwR.code, sessionId);
  renderVolumes(sess, dvolR.stdout || '', dvolR.code, volMap, sessionId);
}

// "0.0.0.0:8080->80/tcp, [::]:8080->80/tcp, 0.0.0.0:443->443/tcp"
//   → "8080, 443"  (host-side ports only, deduped, sorted)
function summarizePorts(s) {
  if (!s) return '';
  const set = new Set();
  s.split(',').forEach(p => {
    const m = p.trim().match(/:(\d+)->/);
    if (m) set.add(m[1]);
  });
  return [...set].sort((a, b) => Number(a) - Number(b)).join(', ');
}

function renderBar(cardEl, pct) {
  const v = cardEl.querySelector('.mon-val');
  const bar = cardEl.querySelector('.mon-bar-fill');
  v.textContent = pct.toFixed(1);
  bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
  cardEl.classList.toggle('hot', pct >= 85);
  cardEl.classList.toggle('warm', pct >= 60 && pct < 85);
  cardEl.classList.remove('loading');
}

function renderDisk(sess, raw) {
  const card = sess.monitorEl.querySelector('.mon-disk');
  const list = card.querySelector('.mon-list');
  const sub = card.querySelector('.mon-sub');
  card.classList.remove('loading');
  const lines = raw.split('\n').filter(Boolean);
  // Header: "Filesystem Size Used Avail Use% Mounted on"
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].trim().split(/\s+/);
    if (cols.length < 6) continue;
    const mount = cols.slice(5).join(' ');  // path may have spaces
    const pct = parseInt(cols[4], 10);
    rows.push({ mount, size: cols[1], used: cols[2], pct: isNaN(pct) ? 0 : pct });
  }
  if (!rows.length) { list.innerHTML = '<div class="mon-empty">no data</div>'; sub.textContent = ''; return; }
  sub.textContent = `${rows.length} mount${rows.length > 1 ? 's' : ''}`;
  list.innerHTML = rows.map(r => `
    <div class="mon-row${r.pct >= 85 ? ' hot' : r.pct >= 60 ? ' warm' : ''}" data-mount="${escapeHtml(r.mount)}">
      <div class="mon-row-line">
        <span class="mon-row-name">${escapeHtml(r.mount)}</span>
        <span class="mon-row-val">${r.pct}% · ${escapeHtml(r.used)} / ${escapeHtml(r.size)}</span>
      </div>
      <div class="mon-row-bar"><div class="mon-row-fill" style="width:${r.pct}%"></div></div>
    </div>
  `).join('');
}

function renderDocker(sess, containers, code, sessionId) {
  const card = sess.monitorEl.querySelector('.mon-docker');
  const list = card.querySelector('.mon-list');
  const sub = card.querySelector('.mon-sub');
  card.classList.remove('loading');
  if (!containers.length) {
    list.innerHTML = `<div class="mon-empty">${code === 0 ? 'no containers' : 'docker not available'}</div>`;
    sub.textContent = '';
    return;
  }
  // Sort: running first (alphabetical inside), then stopped.
  containers.sort((a, b) => {
    if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });
  const runningCount = containers.filter(c => c.isRunning).length;
  const stoppedCount = containers.length - runningCount;
  sub.textContent = `${runningCount} running${stoppedCount ? ` · ${stoppedCount} stopped` : ''}`;

  list.innerHTML = containers.map(c => {
    const stateCls = c.isRunning ? 'running' : 'stopped';
    const statsLine = c.isRunning
      ? `${escapeHtml(c.cpu || '—')} CPU · ${escapeHtml(c.memUsage || '—')}`
      : escapeHtml(c.status || 'stopped');
    const portsTag = c.ports ? ` · <span class="mon-ctr-ports">:${escapeHtml(c.ports)}</span>` : '';
    const metaLine = c.isRunning
      ? escapeHtml(c.status || '') + portsTag
      : escapeHtml(c.image || '') + portsTag;

    // Two extra meta rows below the container's main line:
    //  1) compose project + clickable file shortcuts (.env / compose / Dockerfile)
    //  2) named volumes attached to this container — clickable to scroll +
    //     flash the matching row in DOCKER VOLUMES card
    let projLine = '';
    if (c.compose && c.compose.dir) {
      const dir = c.compose.dir;
      const enc = (p) => encodeURIComponent(p);
      const paths = [];
      if (c.compose.configFile) paths.push(c.compose.configFile);
      else paths.push(joinPath(dir, 'docker-compose.yml'));
      paths.push(joinPath(dir, '.env'));
      paths.push(joinPath(dir, 'Dockerfile'));
      const seen = new Set();
      const links = paths.filter(p => (seen.has(p) ? false : (seen.add(p), true)))
        .map(p => {
          const label = p.split('/').pop();
          return `<a class="mon-ctr-file" data-path="${enc(p)}">${escapeHtml(label)}</a>`;
        }).join(' · ');
      projLine = `
        <div class="mon-ctr-proj">
          <span class="mon-ctr-proj-icon">▸</span>
          <span class="mon-ctr-proj-dir" title="Project working directory">${escapeHtml(dir)}</span>
          <span class="mon-ctr-proj-files">${links}</span>
        </div>
      `;
    }
    let volsLine = '';
    if (c.volumes && c.volumes.length) {
      const vlinks = c.volumes.map(v =>
        `<a class="mon-ctr-vol" data-vol="${escapeHtml(v)}">${escapeHtml(v)}</a>`
      ).join(' · ');
      volsLine = `
        <div class="mon-ctr-vols">
          <span class="mon-ctr-proj-icon">⊟</span>
          <span class="mon-ctr-vols-label">vol:</span>
          <span class="mon-ctr-vols-list">${vlinks}</span>
        </div>
      `;
    }

    // Always 4 slots: power(start/stop) · restart · rebuild · export.
    // Slots that don't apply to this container render as invisible spacers
    // so every row's button cluster occupies the same width and the
    // buttons sit at the same X across the whole list.
    const slot = (html) => html || '<span class="row-btn-spacer"></span>';
    const powerBtn = c.isRunning
      ? '<button class="row-btn" data-act="stop"  title="Stop">◼</button>'
      : '<button class="row-btn" data-act="start" title="Start">▶</button>';
    const restartBtn = c.isRunning
      ? '<button class="row-btn" data-act="restart" title="Restart">↻</button>'
      : '';
    const rebuildBtn = c.compose
      ? '<button class="row-btn" data-act="rebuild" title="docker compose up -d --build">⚙</button>'
      : '';
    const exportBtn = '<button class="row-btn" data-act="export" title="Export filesystem">↓</button>';
    const actions = `${slot(powerBtn)}${slot(restartBtn)}${slot(rebuildBtn)}${slot(exportBtn)}`;

    return `
      <div class="mon-row mon-ctr-row mon-ctr-${stateCls}" data-name="${escapeHtml(c.name || '')}">
        <span class="mon-ctr-dot" title="${c.isRunning ? 'Running' : 'Stopped'}"></span>
        <div class="mon-ctr-main">
          <div class="mon-row-line">
            <span class="mon-row-name">${escapeHtml(c.name || '?')}</span>
            <span class="mon-row-val">${statsLine}</span>
          </div>
          <div class="mon-ctr-meta">${metaLine}</div>
          ${projLine}
          ${volsLine}
        </div>
        <div class="mon-vol-actions">${actions}</div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.mon-ctr-row').forEach(row => {
    const name = row.dataset.name;
    const ctr = containers.find(c => c.name === name);
    row.querySelectorAll('.row-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'start')        await containerAction(sessionId, name, 'start');
        else if (act === 'stop')    await containerAction(sessionId, name, 'stop');
        else if (act === 'restart') await containerAction(sessionId, name, 'restart');
        else if (act === 'export')  await exportContainer(sessionId, name);
        else if (act === 'rebuild' && ctr && ctr.compose) await rebuildContainer(sessionId, ctr);
      });
    });
    // File / dir links → open editor modal. Plain anchor click; SFTP read
    // happens inside the modal so we can show a loading state.
    row.querySelectorAll('.mon-ctr-file').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showFileEditor(sessionId, decodeURIComponent(a.dataset.path));
      });
    });
    // Volume links → scroll to matching VOLUMES row + flash highlight.
    row.querySelectorAll('.mon-ctr-vol').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        flashVolumeRow(activeSessions.get(sessionId), a.dataset.vol);
      });
    });
  });
}

// Scrolls to + briefly highlights a volume row by name. Used from container
// rows so user can trace "this container uses these volumes" → see them in
// the VOLUMES card.
function flashVolumeRow(sess, volName) {
  if (!sess || !sess.monitorEl) return;
  const row = sess.monitorEl.querySelector(`.mon-vol-row[data-vol="${CSS.escape(volName)}"]`);
  if (!row) return;
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  row.classList.remove('flash');
  // Reflow so re-adding the class restarts the CSS animation.
  void row.offsetWidth;
  row.classList.add('flash');
  setTimeout(() => row.classList.remove('flash'), 1400);
}

// Same trick the other way — clicking a container name in the VOLUMES card.
function flashContainerRow(sess, ctrName) {
  if (!sess || !sess.monitorEl) return;
  const row = sess.monitorEl.querySelector(`.mon-ctr-row[data-name="${CSS.escape(ctrName)}"]`);
  if (!row) return;
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  row.classList.remove('flash');
  void row.offsetWidth;
  row.classList.add('flash');
  setTimeout(() => row.classList.remove('flash'), 1400);
}

// Listening sockets. ss output (no header, -H) is whitespace-separated:
//   State Recv-Q Send-Q LocalAddress:Port PeerAddress:Port [users:(("proc",pid=N,fd=M))]
// On non-root SSH the users:(...) column may be empty. We accept that and
// just leave the process column blank for those rows.
function renderPorts(sess, raw, code, sessionId) {
  const card = sess.monitorEl.querySelector('.mon-ports');
  const list = card.querySelector('.mon-list');
  const sub = card.querySelector('.mon-sub');
  sess.monitor.seen = sess.monitor.seen || {};
  if (!raw.trim()) {
    if (sess.monitor.seen.ports) return;  // keep last good render
    sess.monitor.attempts = sess.monitor.attempts || {};
    sess.monitor.attempts.ports = (sess.monitor.attempts.ports || 0) + 1;
    if (sess.monitor.attempts.ports < 2) return;
    card.classList.remove('loading');
    list.innerHTML = `<div class="mon-empty">${code === 0 ? 'no listeners' : 'ss not available'}</div>`;
    sub.textContent = '';
    return;
  }
  card.classList.remove('loading');
  const sections = raw.split('___UDP___');
  const tcpLines = (sections[0] || '').split('\n').filter(Boolean);
  const udpLines = (sections[1] || '').split('\n').filter(Boolean);
  const rows = [
    ...tcpLines.map(l => parsePortLine(l, 'TCP')),
    ...udpLines.map(l => parsePortLine(l, 'UDP')),
  ].filter(Boolean);
  if (!rows.length) {
    list.innerHTML = '<div class="mon-empty">no listeners</div>';
    sub.textContent = '';
    return;
  }
  // De-dupe by proto+port (ipv4 + ipv6 dual-stack often shows both).
  const seen = new Set();
  const unique = rows.filter(r => {
    const k = `${r.proto}:${r.port}:${r.proc}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  unique.sort((a, b) => Number(a.port) - Number(b.port));
  sess.monitor.seen.ports = true;  // sticky from now on
  sub.textContent = `${unique.length} listener${unique.length > 1 ? 's' : ''}`;
  // If we still don't see process info after a poll, sudo is probably needed.
  // Render "use sudo" as a clickable link in the proc column instead of a
  // dead "unknown" placeholder.
  const sudoOn = !!sess._sudoPwd;
  list.innerHTML = unique.map(r => {
    let procHtml;
    if (r.proc) {
      procHtml = `${escapeHtml(r.proc)}${r.pid ? ' <span class="mon-port-pid">#'+r.pid+'</span>' : ''}`;
    } else if (sudoOn) {
      procHtml = `<span class="mon-port-noproc">unknown</span>`;
    } else {
      procHtml = `<a class="mon-port-sudo" title="Enable sudo for this session">use sudo</a>`;
    }
    return `
      <div class="mon-row mon-port-row" data-port="${escapeHtml(r.port)}" data-proto="${r.proto.toLowerCase()}">
        <span class="mon-port-proto">${r.proto}</span>
        <span class="mon-port-num">:${escapeHtml(r.port)}</span>
        <span class="mon-port-proc" title="${escapeHtml(r.addr)}">${procHtml}</span>
        <span class="mon-port-chev">▸</span>
      </div>
    `;
  }).join('');

  // Whole row click → firewall menu at the click point. Movement check
  // (>4 px between down and up) tells "real click" from "drag to select" —
  // we don't fire the menu mid-selection. We DON'T look at
  // window.getSelection() because that would block clicks while text is
  // selected anywhere else on the page.
  list.querySelectorAll('.mon-port-row').forEach(row => {
    const port = row.dataset.port;
    const proto = row.dataset.proto;
    let dragStartX = 0, dragStartY = 0;
    row.addEventListener('mousedown', (e) => { dragStartX = e.clientX; dragStartY = e.clientY; });
    row.addEventListener('click', (e) => {
      const moved = Math.abs(e.clientX - dragStartX) > 4 || Math.abs(e.clientY - dragStartY) > 4;
      if (moved) return;
      // Click on the "use sudo" link → enable sudo, not menu.
      if (e.target.closest('.mon-port-sudo')) {
        e.stopPropagation();
        enableSudo(sessionId);
        return;
      }
      const rect = row.getBoundingClientRect();
      showFirewallMenu(rect.right, rect.bottom + 2, sessionId, port, proto);
    });
  });
}

function parsePortLine(line, proto) {
  // ss columns vary; the local-address-and-port is column 4 for tcp/udp,
  // and the users:(...) trailer is the last column when present.
  const cols = line.trim().split(/\s+/);
  if (cols.length < 4) return null;
  const local = cols[3];
  const portMatch = local.match(/:(\d+)$/);
  if (!portMatch) return null;
  const port = portMatch[1];
  const addr = local.replace(/:\d+$/, '');
  // Process: users:(("name",pid=123,fd=4)) — first match is enough.
  const procMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
  return {
    proto,
    port,
    addr,
    proc: procMatch ? procMatch[1] : '',
    pid: procMatch ? procMatch[2] : '',
  };
}

// nginx site config blocks parsed from sites-enabled / conf.d. Output of the
// shell loop is groups of `=== /full/path.conf` followed by raw
// server_name/listen lines, then optional `___MAIN___/etc/nginx/nginx.conf`.
function renderSites(sess, raw, code, sessionId) {
  const card = sess.monitorEl.querySelector('.mon-sites');
  const list = card.querySelector('.mon-list');
  const sub = card.querySelector('.mon-sub');
  sess.monitor.seen = sess.monitor.seen || {};
  // Stickiness: once we've ever rendered real data into this card, we never
  // blank it back out on a transient empty poll — keep the last good
  // render. A genuinely empty initial state shows after a short grace.
  if (!raw.trim()) {
    if (sess.monitor.seen.sites) return;
    sess.monitor.attempts = sess.monitor.attempts || {};
    sess.monitor.attempts.sites = (sess.monitor.attempts.sites || 0) + 1;
    if (sess.monitor.attempts.sites < 2) return;  // keep skeleton on first poll
    card.classList.remove('loading');
    list.innerHTML = `<div class="mon-empty">no nginx sites</div>`;
    sub.textContent = '';
    return;
  }
  sess.monitor.seen.sites = true;
  card.classList.remove('loading');
  const sites = [];
  let cur = null;
  let mainConf = '';
  raw.split('\n').forEach(line => {
    const main = line.match(/^___MAIN___(.+)/);
    if (main) { mainConf = main[1]; return; }
    const m = line.match(/^=== (.+)$/);
    if (m) {
      cur = { path: m[1], file: m[1].split('/').pop(), names: [], ports: [] };
      sites.push(cur);
      return;
    }
    if (!cur) return;
    const sn = line.match(/^server_name\s+(.+)/);
    if (sn) {
      sn[1].split(/\s+/).forEach(n => { if (n && n !== '_') cur.names.push(n); });
      return;
    }
    const ln = line.match(/^listen\s+(.+)/);
    if (ln) cur.ports.push(ln[1].trim());
  });
  if (!sites.length && !mainConf) {
    list.innerHTML = '<div class="mon-empty">no nginx sites</div>';
    sub.textContent = '';
    return;
  }
  // sub gets the main config link if we found nginx.conf — clickable.
  sub.innerHTML = mainConf
    ? `${sites.length} site${sites.length === 1 ? '' : 's'} · <a class="mon-site-mainconf" data-path="${escapeHtml(mainConf)}">nginx.conf</a>`
    : `${sites.length} site${sites.length === 1 ? '' : 's'}`;
  list.innerHTML = sites.map(s => {
    const portSet = new Set();
    s.ports.forEach(p => {
      const m = p.match(/(\d+)/);
      if (m) portSet.add(m[1] + (/ssl/i.test(p) ? '/ssl' : ''));
    });
    const portsStr = [...portSet].sort().join(', ');
    const namesStr = s.names.length ? s.names.join(', ') : '<span class="mon-vol-orphan">no server_name</span>';
    return `
      <div class="mon-row mon-site-row" data-path="${escapeHtml(s.path)}">
        <div class="mon-row-line">
          <span class="mon-row-name">${escapeHtml(s.file)}</span>
          <span class="mon-row-val">${escapeHtml(portsStr)}</span>
        </div>
        <div class="mon-vol-users">${namesStr}</div>
      </div>
    `;
  }).join('');

  // Bindings: row click → editor; sub-link → main nginx.conf editor.
  list.querySelectorAll('.mon-site-row').forEach(row => {
    row.addEventListener('click', () => showFileEditor(sessionId, row.dataset.path));
  });
  if (mainConf) {
    const mc = sub.querySelector('.mon-site-mainconf');
    if (mc) mc.addEventListener('click', (e) => { e.stopPropagation(); showFileEditor(sessionId, mc.dataset.path); });
  }
}

// ─── Firewall (iptables INPUT chain) ───
// Parses `iptables -S INPUT` output. Each line is a rule in restore-syntax,
// e.g. "-A INPUT -p tcp -m tcp --dport 80 -j DROP". We render DROP/REJECT
// rules with a × to delete; the policy line ("-P INPUT ACCEPT") gets shown
// as the chain header.
function renderFirewall(sess, raw, code, sessionId) {
  const card = sess.monitorEl.querySelector('.mon-fw');
  const list = card.querySelector('.mon-list');
  const sub = card.querySelector('.mon-sub');
  sess.monitor.seen = sess.monitor.seen || {};
  if (!raw.trim()) {
    if (sess.monitor.seen.fw) return;  // keep last good render
    sess.monitor.attempts = sess.monitor.attempts || {};
    sess.monitor.attempts.fw = (sess.monitor.attempts.fw || 0) + 1;
    if (sess.monitor.attempts.fw < 2) return;
    card.classList.remove('loading');
    const sudoOn = !!sess._sudoPwd;
    list.innerHTML = sudoOn
      ? `<div class="mon-empty">no rules</div>`
      : `<div class="mon-empty">iptables not visible · <a class="mon-port-sudo mon-fw-sudo">use sudo</a></div>`;
    sub.textContent = '';
    if (!sudoOn) {
      list.querySelector('.mon-fw-sudo').addEventListener('click', () => enableSudo(sessionId));
    }
    return;
  }
  sess.monitor.seen.fw = true;
  card.classList.remove('loading');
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let policy = '';
  const rules = [];
  lines.forEach(l => {
    if (l.startsWith('-P INPUT')) {
      policy = l.slice('-P INPUT '.length);
      return;
    }
    if (l.startsWith('-A INPUT')) {
      rules.push(l);
    }
  });
  // Render: policy at top + DROP/REJECT rules with × delete + ACCEPT rules
  // dimmed (informational only).
  const summary = `policy ${policy || '?'} · ${rules.length} rule${rules.length === 1 ? '' : 's'}`;
  sub.innerHTML = `${summary} · <a class="mon-fw-save">SAVE</a>`;

  if (!rules.length) {
    list.innerHTML = '<div class="mon-empty">no rules · click a port row to add one</div>';
  } else {
    list.innerHTML = rules.map((r, i) => {
      const target = (r.match(/-j\s+(\S+)/) || [, ''])[1];
      const isDeny = target === 'DROP' || target === 'REJECT';
      const portM = r.match(/--dport\s+(\d+)/);
      const srcM = r.match(/-s\s+(\S+)/);
      const protoM = r.match(/-p\s+(\S+)/);
      // Compact summary line — shows the human-readable bits, full rule
      // visible on hover.
      const parts = [];
      if (protoM) parts.push(protoM[1].toUpperCase());
      if (portM) parts.push(`:${portM[1]}`);
      if (srcM) parts.push(`from ${srcM[1]}`);
      if (!parts.length) parts.push('chain rule');
      return `
        <div class="mon-row mon-fw-row${isDeny ? ' deny' : ''}" title="${escapeHtml(r)}">
          <span class="mon-fw-target">${escapeHtml(target)}</span>
          <span class="mon-fw-summary">${escapeHtml(parts.join(' '))}</span>
          <span class="mon-fw-raw">${escapeHtml(r.replace(/^-A INPUT\s*/, ''))}</span>
          <span class="mon-vol-actions">
            <button class="row-btn danger" data-idx="${i}" title="Delete rule">×</button>
          </span>
        </div>
      `;
    }).join('');
    list.querySelectorAll('[data-idx]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const r = rules[parseInt(btn.dataset.idx, 10)];
        await deleteFirewallRule(sessionId, r);
      });
    });
  }
  const saveLink = sub.querySelector('.mon-fw-save');
  if (saveLink) saveLink.addEventListener('click', () => persistFirewall(sessionId));
}

// Per-port floating menu: block port-wide, block from a specific IP, or
// block the IP from everything. All actions go through the existing
// closeContextMenu pattern so click-outside / Esc closes them.
function showFirewallMenu(x, y, sessionId, port, proto) {
  closeContextMenu();
  const items = [
    { label: `Block ${proto.toUpperCase()} :${port} (all sources)`, act: 'block-port' },
    { label: `Allow ${proto.toUpperCase()} :${port} (remove blocks)`, act: 'allow-port' },
    { sep: true },
    { label: `Block IP from :${port}…`, act: 'block-ip-port' },
    { label: 'Block IP from everything…', act: 'block-ip-all' },
  ];
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.innerHTML = items.map(i =>
    i.sep ? '<div class="ctx-sep"></div>'
          : `<div class="ctx-item${i.danger ? ' danger' : ''}" data-act="${i.act}">${escapeHtml(i.label)}</div>`
  ).join('');
  menu.addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(menu);
  ctxMenuEl = menu;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  const r = menu.getBoundingClientRect();
  if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 6) + 'px';
  if (r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 6) + 'px';

  menu.querySelectorAll('.ctx-item').forEach(el => {
    el.addEventListener('click', async () => {
      const act = el.dataset.act;
      closeContextMenu();
      await runFirewallAction(act, sessionId, port, proto);
    });
  });
}

async function runFirewallAction(act, sessionId, port, proto) {
  if (act === 'block-port') {
    const ok = await showConfirm(
      `Block ALL ${proto.toUpperCase()} traffic to port ${port}?\n\nWill add: iptables -I INPUT -p ${proto} --dport ${port} -j DROP`,
      { title: 'BLOCK PORT', okText: 'BLOCK', danger: true }
    );
    if (ok) await runIpt(sessionId, `iptables -I INPUT -p ${proto} --dport ${port} -j DROP`);
  } else if (act === 'allow-port') {
    // Walk the rules and -D anything that matches port + DROP. We do it
    // with iptables -S → grep → iptables -D so duplicates also get cleared.
    const list = withSudo("iptables -S INPUT", sessionId);
    const ipt  = withSudo("iptables", sessionId);
    const cmd = `${list} | grep -E 'dport ${port}.*-j (DROP|REJECT)' | sed 's/^-A/-D/' | while read r; do ${ipt} $r; done`;
    await runIpt(sessionId, cmd, true);
  } else if (act === 'block-ip-port') {
    const ip = await showPrompt('Block which IP from this port?', '', { title: 'BLOCK IP FROM PORT', okText: 'BLOCK' });
    if (ip && ipOk(ip)) await runIpt(sessionId, `iptables -I INPUT -p ${proto} --dport ${port} -s ${ip} -j DROP`);
    else if (ip) toast('Invalid IP', 'err');
  } else if (act === 'block-ip-all') {
    const ip = await showPrompt('Block which IP from ALL ports?', '', { title: 'BLOCK IP', okText: 'BLOCK' });
    if (ip && ipOk(ip)) await runIpt(sessionId, `iptables -I INPUT -s ${ip} -j DROP`);
    else if (ip) toast('Invalid IP', 'err');
  }
}

async function deleteFirewallRule(sessionId, ruleLine) {
  const ok = await showConfirm(
    `Delete this rule?\n\n${ruleLine}`,
    { title: 'DELETE RULE', okText: 'DELETE', danger: true }
  );
  if (!ok) return;
  // -A → -D flips append into delete; same args, exact match.
  const delCmd = ruleLine.replace(/^-A\s+/, '-D ');
  await runIpt(sessionId, `iptables ${delCmd}`);
}

async function persistFirewall(sessionId) {
  const ok = await showConfirm(
    'Persist current rules to /etc/iptables/rules.v4?\n\nNeeds iptables-persistent installed; otherwise rules disappear on reboot.',
    { title: 'SAVE RULES', okText: 'SAVE' }
  );
  if (!ok) return;
  const cmd = `(${withSudo('netfilter-persistent save', sessionId)} 2>&1 || ${withSudo('sh -c "iptables-save > /etc/iptables/rules.v4"', sessionId)} 2>&1)`;
  const r = await execOut(sessionId, cmd, 10000);
  if (r.code === 0) toast('Rules saved', 'ok');
  else toast('Save failed: ' + ((r.stdout || r.stderr).trim().slice(0, 200)), 'err');
}

// Wraps a command in sudo. If the session has a stashed password (set by
// enableSudo), pipe it via stdin (`sudo -S -p ''` reads the password from
// stdin and silences its prompt so it doesn't bleed into stdout). Otherwise
// fall back to `sudo -n` which only succeeds if NOPASSWD is configured.
function withSudo(cmd, sessionId) {
  const sess = sessionId ? activeSessions.get(sessionId) : null;
  const pwd = sess && sess._sudoPwd;
  if (pwd) {
    // printf '%s\n' '<pwd>' | sudo -S -p '' <cmd>
    // Single-quote the password and escape any inner singles.
    const q = "'" + String(pwd).replace(/'/g, `'\\''`) + "'";
    return `printf '%s\\n' ${q} | sudo -S -p '' ${cmd}`;
  }
  return `sudo -n ${cmd}`;
}

// Prepends sbin dirs to PATH for the wrapped command. Non-interactive SSH
// shells often have a minimal PATH (just /usr/bin:/bin) so binaries like ss,
// iptables, ip, nft live in /sbin or /usr/sbin and "command not found".
// This helper makes them reachable without forcing a login shell.
function withPath(cmd) {
  return `PATH="$PATH:/usr/local/sbin:/usr/sbin:/sbin" ${cmd}`;
}

// One-shot sudo enrollment: prompt the user for the remote password, verify
// it via `sudo -S -v`, stash on the session if accepted. From then on
// withSudo() uses that password for ss / iptables / etc. Cleared when the
// session disconnects (the sess object goes away).
async function enableSudo(sessionId) {
  const sess = activeSessions.get(sessionId);
  if (!sess || !sess.connected) return;
  const pwd = await showPrompt(
    `Sudo password for ${sess.server.username}@${sess.server.host}.\nKept in app memory only for this session; never written to disk.`,
    '',
    { title: 'ENABLE SUDO', okText: 'ENABLE', passwordInput: true }
  );
  if (pwd == null || pwd === '') return;
  // Visible progress while we validate — `sudo -v` over a slow SSH can
  // easily take a couple of seconds and the prompt has already closed by
  // now, so without this the user sees nothing happening and clicks again.
  const progress = showProgressModal('VALIDATING SUDO', 'Checking password on remote…');
  // -k first wipes any cached credentials so we're really testing this pwd.
  const q = "'" + String(pwd).replace(/'/g, `'\\''`) + "'";
  const cmd = `sudo -k 2>/dev/null; printf '%s\\n' ${q} | sudo -S -p '' -v 2>&1`;
  const r = await execOut(sessionId, cmd, 8000);
  progress.close();
  if (r.code === 0) {
    sess._sudoPwd = pwd;
    toast('Sudo enabled · refreshing data…', 'ok');
    // Reset cards that need privileged data back to skeleton so the user
    // sees something is reloading rather than the stale "use sudo" hints.
    if (sess.monitorEl) {
      ['ports', 'fw'].forEach(k => {
        const c = sess.monitorEl.querySelector('.mon-' + k);
        if (!c) return;
        c.classList.add('loading');
        const list = c.querySelector('.mon-list');
        if (list) list.innerHTML = '<div class="mon-skel"></div><div class="mon-skel"></div><div class="mon-skel"></div>';
      });
      // attempts counter reset so a one-off empty doesn't flash "no rules"
      if (sess.monitor) sess.monitor.attempts = {};
    }
    pollSlow(sessionId);
  } else {
    toast('Sudo failed: ' + ((r.stdout || r.stderr).trim().slice(0, 200) || 'wrong password'), 'err');
  }
}

async function runIpt(sessionId, cmd, alreadyWrapped = false) {
  const full = alreadyWrapped ? cmd : withSudo(cmd, sessionId) + ' 2>&1';
  const r = await execOut(sessionId, full, 8000);
  if (r.code === 0) {
    toast('Rule applied', 'ok');
    pollSlow(sessionId);
  } else {
    const tail = (r.stdout || r.stderr || 'unknown').trim().slice(0, 200);
    toast('iptables failed: ' + tail, 'err');
  }
}

function ipOk(ip) {
  // Permissive validator: IPv4 dotted-quad OR a CIDR like 1.2.3.0/24.
  return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(ip.trim());
}

// start / stop / restart share the same flow: fire the docker command, surface
// docker's own stderr on failure, refresh the card on success. Timeout bumped
// to 60 s because stop waits for the default grace period (10 s) and some
// databases take longer to shut down cleanly.
async function containerAction(sessionId, name, verb) {
  const labels = {
    start:   { ing: 'Starting',   done: 'Started'   },
    stop:    { ing: 'Stopping',   done: 'Stopped'   },
    restart: { ing: 'Restarting', done: 'Restarted' },
  };
  const l = labels[verb];
  toast(`${l.ing} ${name}…`);
  const r = await execOut(sessionId, `docker ${verb} ${shellQuoteArg(name)} 2>&1`, 60000);
  if (r.code === 0) {
    toast(`${l.done} ${name}`, 'ok');
    pollSlow(sessionId);
  } else {
    toast(`Failed: ${(r.stdout || r.stderr || 'unknown error').trim().slice(0, 200)}`, 'err');
  }
}

// Rebuild a compose-managed container: cd into the project working_dir
// (taken from the docker-compose label) and run `docker compose up -d
// --build <service>`. Falls back to legacy `docker-compose` (v1) if v2 isn't
// installed. Image build can take minutes — long timeout, progress modal.
async function rebuildContainer(sessionId, ctr) {
  if (!ctr.compose || !ctr.compose.dir) return;
  const ok = await showConfirm(
    `Rebuild & restart "${ctr.name}"?\n\nWill run:\n  cd ${ctr.compose.dir}\n  docker compose up -d --build ${ctr.compose.service || ''}\n\nImage build can take minutes.`,
    { title: 'REBUILD CONTAINER', okText: 'REBUILD' }
  );
  if (!ok) return;
  const progress = showProgressModal(`REBUILDING · ${ctr.name}`, 'Building image + recreating container…');
  // -f explicitly points at the compose file so we don't depend on cwd's
  // default lookup. configFile may be empty → cd handles that.
  const fileArg = ctr.compose.configFile ? `-f ${shellQuoteArg(ctr.compose.configFile)} ` : '';
  const svcArg = ctr.compose.service ? ` ${shellQuoteArg(ctr.compose.service)}` : '';
  const cmd =
    `cd ${shellQuoteArg(ctr.compose.dir)} && ` +
    `(docker compose ${fileArg}up -d --build${svcArg} 2>&1 || ` +
    `docker-compose ${fileArg}up -d --build${svcArg} 2>&1)`;
  const r = await execOut(sessionId, cmd, 600000);  // 10 min ceiling
  progress.close();
  if (r.code === 0) {
    toast(`Rebuilt ${ctr.name}`, 'ok');
    pollSlow(sessionId);
  } else {
    // Show last meaningful line of build output (build errors are long).
    const tail = (r.stdout || r.stderr || 'unknown error').trim().split('\n').slice(-3).join('\n').slice(0, 400);
    toast(`Rebuild failed:\n${tail}`, 'err');
  }
}

// File editor: SFTP-backed read/write of a single text file. Plain textarea
// with monospace + line-number gutter (no syntax highlighting — keeps the
// app slim; users can still edit .env / yaml / Dockerfile comfortably).
function showFileEditor(sessionId, remotePath) {
  const sess = activeSessions.get(sessionId);
  if (!sess || !sess.connected) { toast('Session not connected', 'err'); return; }

  const back = document.createElement('div');
  back.className = 'modal info-modal';
  back.innerHTML = `
    <div class="modal-body editor-body">
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>
      <div class="modal-header editor-head">
        <span class="editor-title">EDIT</span>
        <span class="editor-path"></span>
        <span class="editor-status"></span>
        <button class="editor-close" aria-label="Close">×</button>
      </div>
      <div class="editor-body-inner">
        <div class="editor-gutter"></div>
        <textarea class="editor-area" spellcheck="false" wrap="off" disabled>Loading…</textarea>
      </div>
      <div class="modal-footer editor-foot">
        <span class="editor-hint">⌘ S to save · Esc to close</span>
        <div style="flex:1"></div>
        <button class="btn btn-ghost editor-cancel">CLOSE</button>
        <button class="btn btn-primary editor-save" disabled>SAVE</button>
      </div>
    </div>
  `;
  document.body.appendChild(back);

  back.querySelector('.editor-path').textContent = remotePath;

  const ta = back.querySelector('.editor-area');
  const gutter = back.querySelector('.editor-gutter');
  const saveBtn = back.querySelector('.editor-save');
  const status = back.querySelector('.editor-status');
  let originalContent = '';
  let dirty = false;

  const renderGutter = () => {
    const n = ta.value.split('\n').length;
    let s = '';
    for (let i = 1; i <= n; i++) s += i + '\n';
    gutter.textContent = s;
  };
  const syncGutterScroll = () => { gutter.scrollTop = ta.scrollTop; };

  const setDirty = (d) => {
    dirty = d;
    saveBtn.disabled = !d;
    status.textContent = d ? '· modified' : '';
  };

  const finish = (force) => {
    if (dirty && !force) {
      // Don't surprise-discard edits — confirm first.
      showConfirm('Discard unsaved changes?', {
        title: 'CLOSE EDITOR', okText: 'DISCARD', danger: true,
      }).then(ok => { if (ok) finish(true); });
      return;
    }
    document.removeEventListener('keydown', onKey);
    back.remove();
  };

  function onKey(e) {
    if (e.key === 'Escape' && document.activeElement !== ta) { finish(); return; }
    if (e.key === 'Escape') { ta.blur(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      doSave();
    }
  }

  back.querySelector('.editor-close').onclick = () => finish();
  back.querySelector('.editor-cancel').onclick = () => finish();
  back.addEventListener('click', (e) => { if (e.target === back) finish(); });
  document.addEventListener('keydown', onKey);

  ta.addEventListener('input', () => {
    renderGutter();
    setDirty(ta.value !== originalContent);
  });
  ta.addEventListener('scroll', syncGutterScroll);

  async function doSave() {
    if (!dirty) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'SAVING…';
    try {
      await window.api.sftp.writeFile({ sessionId, path: remotePath, content: ta.value });
      originalContent = ta.value;
      setDirty(false);
      saveBtn.textContent = 'SAVE';
      status.textContent = '· saved';
      setTimeout(() => { if (!dirty) status.textContent = ''; }, 1500);
    } catch (e) {
      saveBtn.textContent = 'SAVE';
      saveBtn.disabled = false;
      toast('Save failed: ' + e.message, 'err');
    }
  }
  saveBtn.onclick = doSave;

  // Load file content via SFTP. Show error in editor area if it fails.
  (async () => {
    try {
      const r = await window.api.sftp.readFile({ sessionId, path: remotePath });
      ta.value = r.content;
      originalContent = r.content;
      ta.disabled = false;
      renderGutter();
      setTimeout(() => { ta.focus(); }, 30);
    } catch (e) {
      ta.value = `── could not read file ──\n${remotePath}\n\n${e.message || e}`;
      ta.disabled = true;
      saveBtn.disabled = true;
    }
  })();
}

async function exportContainer(sessionId, name) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  const ok = await showConfirm(
    `Export container "${name}" filesystem to tar.gz and download?\n\nNote: this dumps the FS only — not the image history, ports, env, or volumes. For a full image backup use "docker save" on the underlying image.`,
    { title: 'EXPORT CONTAINER', okText: 'PROCEED' }
  );
  if (!ok) return;

  const stamp = Date.now();
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const remoteTar = `/tmp/maxter-ctr-${safe}-${stamp}.tar.gz`;
  const progress = showProgressModal(`EXPORTING CONTAINER · ${name}`, 'Running docker export + gzip…');

  // docker export streams a tar of the FS to stdout; pipe through gzip to a
  // temp file. Works on stopped containers too (a plus).
  const packCmd = `docker export ${shellQuoteArg(name)} 2>/dev/null | gzip > ${shellQuoteArg(remoteTar)}`;
  const packR = await execOut(sessionId, packCmd, 600000);
  if (packR.code !== 0 && packR.code !== -1) {
    progress.close();
    toast(`Export failed: ${(packR.stderr || 'unknown').trim().slice(0, 200)}`, 'err');
    await execOut(sessionId, `rm -f ${shellQuoteArg(remoteTar)}`, 5000);
    return;
  }

  const sizeR = await execOut(sessionId, `stat -c '%s' ${shellQuoteArg(remoteTar)} 2>/dev/null`, 5000);
  const bytes = parseInt((sizeR.stdout || '0').trim(), 10) || 0;
  if (bytes === 0) {
    progress.close();
    toast('Export produced empty archive', 'err');
    await execOut(sessionId, `rm -f ${shellQuoteArg(remoteTar)}`, 5000);
    return;
  }
  progress.update(`Packed · ${humanSize(bytes)}. Pick where to save…`);

  let saved;
  try {
    saved = await window.api.sftp.download({ sessionId, remotePath: remoteTar });
  } catch (e) {
    progress.close();
    toast('Download failed: ' + e.message, 'err');
    await execOut(sessionId, `rm -f ${shellQuoteArg(remoteTar)}`, 5000);
    return;
  }

  await execOut(sessionId, `rm -f ${shellQuoteArg(remoteTar)}`, 5000);
  progress.close();

  if (saved && saved.canceled) toast('Download cancelled', 'warn');
  else if (saved && saved.ok) toast(`Saved · ${humanSize(bytes)} → ${saved.localPath}`, 'ok');
}

function renderVolumes(sess, raw, code, volMap, sessionId) {
  const card = sess.monitorEl.querySelector('.mon-vols');
  const list = card.querySelector('.mon-list');
  const sub = card.querySelector('.mon-sub');
  card.classList.remove('loading');
  let parsed;
  try { parsed = JSON.parse(raw.trim()); } catch (_) { parsed = null; }
  const vols = (parsed && parsed.Volumes) || [];
  if (!vols.length) {
    list.innerHTML = `<div class="mon-empty">${code === 0 ? 'no volumes' : 'docker not available'}</div>`;
    sub.textContent = '';
    return;
  }
  sub.textContent = `${vols.length} volume${vols.length > 1 ? 's' : ''}`;
  const parseSize = s => {
    const m = String(s || '').match(/([\d.]+)\s*([KMGT]?)B?/i);
    if (!m) return 0;
    const v = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    return v * ({ '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12 }[unit] || 1);
  };
  vols.sort((a, b) => parseSize(b.Size) - parseSize(a.Size));
  list.innerHTML = vols.map(v => {
    const users = (volMap && volMap.get(v.Name)) || [];
    const usersStr = users.length
      ? users.map(u => `<a class="mon-vol-user" data-ctr="${escapeHtml(u)}">${escapeHtml(u)}</a>`).join(', ')
      : '<span class="mon-vol-orphan">unused</span>';
    return `
      <div class="mon-row mon-vol-row" data-vol="${escapeHtml(v.Name || '')}">
        <div class="mon-row-line">
          <span class="mon-row-name">${escapeHtml(v.Name || '')}</span>
          <span class="mon-row-val">${escapeHtml(v.Size || '—')}</span>
        </div>
        <div class="mon-vol-users">${usersStr}</div>
        <div class="mon-vol-actions">
          <button class="row-btn" data-act="dl" title="Download as tar.gz">↓</button>
          <button class="row-btn danger" data-act="rm" title="Delete volume">×</button>
        </div>
      </div>
    `;
  }).join('');

  // Bind action buttons + container-name click-through.
  list.querySelectorAll('.mon-vol-row').forEach(row => {
    const volName = row.dataset.vol;
    row.querySelectorAll('.row-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (b.dataset.act === 'rm') await deleteVolume(sessionId, volName);
        else if (b.dataset.act === 'dl') await downloadVolume(sessionId, volName);
      });
    });
    row.querySelectorAll('.mon-vol-user').forEach(a => {
      a.addEventListener('click', (e) => {
        e.stopPropagation();
        flashContainerRow(sess, a.dataset.ctr);
      });
    });
  });
}

async function deleteVolume(sessionId, volName) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  const ok = await showConfirm(
    `Delete volume "${volName}"? This is irreversible. Volumes in use by containers will be refused by docker.`,
    { title: 'DELETE VOLUME', okText: 'DELETE', danger: true }
  );
  if (!ok) return;
  const r = await execOut(sessionId, `docker volume rm ${shellQuoteArg(volName)} 2>&1`, 10000);
  if (r.code === 0) {
    toast(`Deleted volume "${volName}"`, 'ok');
    pollSlow(sessionId);  // refresh immediately
  } else {
    toast(`Failed: ${(r.stdout || r.stderr || 'unknown error').trim()}`, 'err');
  }
}

async function downloadVolume(sessionId, volName) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  const ok = await showConfirm(
    `Pack volume "${volName}" into tar.gz and download?\n\nUses a temporary alpine container to bundle the data; you'll be prompted where to save the archive.`,
    { title: 'DOWNLOAD VOLUME', okText: 'PROCEED' }
  );
  if (!ok) return;

  // Unique tmp path on remote so concurrent downloads don't collide.
  const stamp = Date.now();
  const remoteTar = `/tmp/maxter-vol-${volName.replace(/[^a-zA-Z0-9._-]/g, '_')}-${stamp}.tar.gz`;
  const progress = showProgressModal(`PACKING VOLUME · ${volName}`, 'Spinning up alpine + tar…');

  // 1) Pack via alpine container. -v <vol>:/src mounts named volume RO-style;
  // -v /tmp:/dst lets us write the archive on the host. busybox tar would
  // also work but alpine is more universally present.
  const packCmd =
    `docker run --rm -v ${shellQuoteArg(volName)}:/src:ro -v /tmp:/dst alpine ` +
    `tar czf /dst/${remoteTar.split('/').pop()} -C /src . 2>&1`;
  const packR = await execOut(sessionId, packCmd, 600000);  // up to 10 min
  if (packR.code !== 0) {
    progress.close();
    toast(`Pack failed: ${(packR.stdout || packR.stderr || 'unknown').trim().slice(0, 200)}`, 'err');
    return;
  }

  // 2) Get size for the progress hint.
  const sizeR = await execOut(sessionId, `stat -c '%s' ${shellQuoteArg(remoteTar)} 2>/dev/null`, 5000);
  const bytes = parseInt((sizeR.stdout || '0').trim(), 10) || 0;
  progress.update(`Packed · ${humanSize(bytes)}. Pick where to save…`);

  // 3) Save dialog + SFTP transfer (sftp:download already prompts).
  let saved;
  try {
    saved = await window.api.sftp.download({ sessionId, remotePath: remoteTar });
  } catch (e) {
    progress.close();
    toast('Download failed: ' + e.message, 'err');
    await execOut(sessionId, `rm -f ${shellQuoteArg(remoteTar)}`, 5000);
    return;
  }

  // 4) Cleanup the temp tar on remote regardless.
  await execOut(sessionId, `rm -f ${shellQuoteArg(remoteTar)}`, 5000);
  progress.close();

  if (saved && saved.canceled) {
    toast('Download cancelled', 'warn');
  } else if (saved && saved.ok) {
    toast(`Saved · ${humanSize(bytes)} → ${saved.localPath}`, 'ok');
  }
}

// Tiny progress modal — single line of status text + spinner. Returned
// handle has `update(text)` and `close()`.
function showProgressModal(title, message) {
  const back = document.createElement('div');
  back.className = 'modal info-modal';
  back.innerHTML = `
    <div class="modal-body dialog-body">
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>
      <div class="modal-header">${escapeHtml(title)}</div>
      <div class="dialog-msg progress-msg">
        <span class="progress-spinner"></span>
        <span class="progress-text"></span>
      </div>
    </div>
  `;
  back.querySelector('.progress-text').textContent = message;
  document.body.appendChild(back);
  return {
    update: (msg) => { const t = back.querySelector('.progress-text'); if (t) t.textContent = msg; },
    close: () => back.remove(),
  };
}

// Single-quote escape for arbitrary strings passed to a remote shell.
function shellQuoteArg(s) {
  return "'" + String(s).replace(/'/g, `'\\''`) + "'";
}

// ─── Processes drilldown (CPU / MEM card click) ───
// Auto-refreshing top-N processes, sortable column. Polling stops when modal
// is dismissed (timer cleared inside finish()).
function showProcessesModal(sessionId, mode /* 'cpu' | 'mem' */) {
  const sess = activeSessions.get(sessionId);
  if (!sess || !sess.connected) return;

  const back = document.createElement('div');
  back.className = 'modal info-modal';
  back.innerHTML = `
    <div class="modal-body proc-body">
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>
      <div class="modal-header proc-head">
        <span>PROCESSES</span>
        <div class="proc-tabs">
          <button class="seg ${mode === 'cpu' ? 'active' : ''}" data-mode="cpu">BY CPU</button>
          <button class="seg ${mode === 'mem' ? 'active' : ''}" data-mode="mem">BY MEMORY</button>
        </div>
        <button class="proc-close" aria-label="Close">×</button>
      </div>
      <div class="proc-list-wrap">
        <div class="proc-grid proc-header">
          <span>PID</span><span>USER</span><span class="proc-num">CPU%</span><span class="proc-num">MEM%</span><span>COMMAND</span>
        </div>
        <div class="proc-list"><div class="mon-empty">SCANNING…</div></div>
      </div>
    </div>
  `;
  document.body.appendChild(back);

  let currentMode = mode;
  let timer = null;
  const finish = () => {
    if (timer) clearInterval(timer);
    document.removeEventListener('keydown', onEsc);
    back.remove();
  };
  function onEsc(e) { if (e.key === 'Escape') finish(); }

  back.querySelector('.proc-close').onclick = finish;
  back.addEventListener('click', (e) => { if (e.target === back) finish(); });
  document.addEventListener('keydown', onEsc);

  back.querySelectorAll('.proc-tabs .seg').forEach(b => {
    b.addEventListener('click', () => {
      currentMode = b.dataset.mode;
      back.querySelectorAll('.proc-tabs .seg').forEach(x => x.classList.toggle('active', x === b));
      tick();
    });
  });

  const list = back.querySelector('.proc-list');
  const tick = async () => {
    const sortKey = currentMode === 'cpu' ? '-%cpu' : '-%mem';
    // ps with explicit columns + no headers; trim COMMAND with cut to keep
    // rows compact. argv may contain spaces — last column gobbles the rest.
    const cmd = `ps -eo pid,user,%cpu,%mem,comm --sort=${sortKey} --no-headers 2>/dev/null | head -25`;
    const r = await execOut(sessionId, cmd, 5000);
    if (!back.isConnected) return;  // user closed mid-fetch
    const lines = (r.stdout || '').split('\n').filter(Boolean);
    if (!lines.length) {
      list.innerHTML = '<div class="mon-empty">no processes</div>';
      return;
    }
    list.innerHTML = lines.map(l => {
      const m = l.trim().match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);
      if (!m) return '';
      const [, pid, user, cpu, mem, comm] = m;
      const cpuN = parseFloat(cpu);
      const memN = parseFloat(mem);
      const hot = (currentMode === 'cpu' ? cpuN : memN) >= 50;
      const warm = (currentMode === 'cpu' ? cpuN : memN) >= 15;
      return `
        <div class="proc-grid proc-row${hot ? ' hot' : warm ? ' warm' : ''}">
          <span>${escapeHtml(pid)}</span>
          <span>${escapeHtml(user)}</span>
          <span class="proc-num">${escapeHtml(cpu)}</span>
          <span class="proc-num">${escapeHtml(mem)}</span>
          <span class="proc-cmd" title="${escapeHtml(comm)}">${escapeHtml(comm)}</span>
        </div>
      `;
    }).join('');
  };

  tick();
  timer = setInterval(tick, 3000);
}

// ─── Disk drilldown (DISK card click) ───
// du -h --max-depth=1 of a chosen path; click on a child folder drills in;
// breadcrumb at top jumps back. Cancellable: each navigation clears the
// previous in-flight call so old results can't clobber a newer drill.
function showDiskModal(sessionId, startPath) {
  const sess = activeSessions.get(sessionId);
  if (!sess || !sess.connected) return;

  const back = document.createElement('div');
  back.className = 'modal info-modal';
  back.innerHTML = `
    <div class="modal-body disk-body">
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>
      <div class="modal-header disk-head">
        <span>DISK USAGE</span>
        <button class="disk-close" aria-label="Close">×</button>
      </div>
      <div class="disk-bar">
        <button class="ico-btn disk-up" title="Parent">↑</button>
        <div class="fs-crumbs disk-crumbs"></div>
      </div>
      <div class="disk-list"><div class="mon-empty">SCANNING…</div></div>
      <div class="disk-foot">
        <span class="disk-hint">click a folder to drill in · esc to close</span>
      </div>
    </div>
  `;
  document.body.appendChild(back);

  let currentPath = startPath;
  let runId = 0;
  const finish = () => {
    runId = -1;
    document.removeEventListener('keydown', onEsc);
    back.remove();
  };
  function onEsc(e) { if (e.key === 'Escape') finish(); }
  back.querySelector('.disk-close').onclick = finish;
  back.addEventListener('click', (e) => { if (e.target === back) finish(); });
  document.addEventListener('keydown', onEsc);

  const listEl = back.querySelector('.disk-list');
  const crumbsEl = back.querySelector('.disk-crumbs');

  const renderCrumbsHere = (p) => {
    renderCrumbs(crumbsEl, p);
    crumbsEl.querySelectorAll('.crumb').forEach(c => {
      c.addEventListener('click', () => navigate(c.dataset.path));
    });
  };

  back.querySelector('.disk-up').addEventListener('click', () => navigate(parentDir(currentPath)));

  async function navigate(p) {
    if (!p) return;
    currentPath = p;
    renderCrumbsHere(p);
    listEl.innerHTML = '<div class="mon-empty">SCANNING…</div>';
    const myRun = ++runId;
    // -x = stay on one filesystem, -h human-readable. 2>/dev/null swallows
    // permission-denied noise. Sort by size desc; head for sanity (some
    // dirs have hundreds of children).
    const cmd = `du -hxd 1 ${shellQuote(p)} 2>/dev/null | sort -hr | head -50`;
    const r = await execOut(sessionId, cmd, 30000);
    if (myRun !== runId || !back.isConnected) return;
    const lines = (r.stdout || '').split('\n').filter(Boolean);
    if (!lines.length) {
      listEl.innerHTML = '<div class="mon-empty">no data (permission denied?)</div>';
      return;
    }
    // Last line is usually the parent itself (its total) — show separately.
    const total = lines.shift();
    const totalMatch = total.match(/^(\S+)\s+(.+)$/);
    let totalSize = totalMatch ? totalMatch[1] : '';
    // If the lines start with the parent total, sort moved it; check first
    // line equals current path.
    const first = lines[0] && lines[0].match(/^(\S+)\s+(.+)$/);
    if (first && first[2] === p) {
      totalSize = first[1];
      lines.shift();
    } else if (totalMatch && totalMatch[2] !== p) {
      // The "total" line was actually a child — put it back and recompute.
      lines.unshift(total);
      totalSize = '';
    }

    // Compute max bytes for the bar.
    const parseSize = s => {
      const m = String(s || '').match(/([\d.]+)\s*([KMGT]?)/i);
      if (!m) return 0;
      const v = parseFloat(m[1]);
      const unit = (m[2] || '').toUpperCase();
      return v * ({ '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12 }[unit] || 1);
    };
    const rows = lines.map(l => {
      const m = l.match(/^(\S+)\s+(.+)$/);
      if (!m) return null;
      const [, sz, fp] = m;
      const name = fp === p ? '(this dir)' : fp.replace(p.replace(/\/$/, '') + '/', '');
      return { size: sz, bytes: parseSize(sz), path: fp, name };
    }).filter(Boolean);
    const maxBytes = rows.reduce((a, r) => Math.max(a, r.bytes), 1);

    listEl.innerHTML = `
      ${totalSize ? `<div class="disk-total">${escapeHtml(totalSize)} total</div>` : ''}
      ${rows.map(r => {
        const w = Math.round((r.bytes / maxBytes) * 100);
        const isDir = r.path !== p;  // anything that isn't "this dir"
        return `
          <div class="disk-row${isDir ? ' nav' : ''}" data-path="${escapeHtml(r.path)}" data-isdir="${isDir ? '1' : ''}">
            <div class="disk-row-bar"><div class="disk-row-fill" style="width:${w}%"></div></div>
            <div class="disk-row-line">
              <span class="disk-row-size">${escapeHtml(r.size)}</span>
              <span class="disk-row-name" title="${escapeHtml(r.path)}">${escapeHtml(r.name)}</span>
            </div>
          </div>
        `;
      }).join('')}
    `;
    listEl.querySelectorAll('.disk-row.nav').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.path));
    });
  }

  function shellQuote(s) {
    // Single-quote and escape any inner single quotes. Safe for arbitrary paths.
    return "'" + String(s).replace(/'/g, `'\\''`) + "'";
  }

  navigate(startPath);
}

// ─── Context menu + Properties ───
let ctxMenuEl = null;
function closeContextMenu() {
  if (ctxMenuEl) { ctxMenuEl.remove(); ctxMenuEl = null; }
}
document.addEventListener('click', closeContextMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeContextMenu(); });
window.addEventListener('blur', closeContextMenu);
window.addEventListener('resize', closeContextMenu);

function showContextMenu(x, y, sessionId, side, item) {
  closeContextMenu();
  const sess = activeSessions.get(sessionId);
  if (!sess) return;

  const sel = sess.selected[side];
  const multi = sel.size > 1 && sel.has(item.name);
  const transferLabel = side === 'local' ? 'Upload to remote' : 'Download to local';
  const items = [];

  if (item.isDir && !multi) items.push({ label: 'Open', act: 'open' });
  if (!multi) items.push({ label: 'Copy path', act: 'copy-path' });
  // Cross-pane transfer doesn't apply to dirs (no recursive SFTP yet).
  if (!item.isDir) items.push({ label: transferLabel, act: 'xfer' });
  items.push({ sep: true });
  if (!multi) items.push({ label: 'Rename', act: 'rename' });
  items.push({ label: multi ? `Delete ${sel.size} items` : 'Delete', act: 'delete', danger: true });
  items.push({ sep: true });
  items.push({ label: 'Properties', act: 'props' });

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.innerHTML = items.map(i =>
    i.sep
      ? '<div class="ctx-sep"></div>'
      : `<div class="ctx-item${i.danger ? ' danger' : ''}" data-act="${i.act}">${escapeHtml(i.label)}</div>`
  ).join('');
  menu.addEventListener('click', (ev) => ev.stopPropagation());

  document.body.appendChild(menu);
  ctxMenuEl = menu;

  // Position then clamp to viewport.
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  const r = menu.getBoundingClientRect();
  if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 6) + 'px';
  if (r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 6) + 'px';

  menu.querySelectorAll('.ctx-item').forEach(el => {
    el.addEventListener('click', async () => {
      const act = el.dataset.act;
      closeContextMenu();
      await runCtxAction(act, sessionId, side, item);
    });
  });
}

async function runCtxAction(act, sessionId, side, item) {
  const sess = activeSessions.get(sessionId);
  if (!sess) return;
  const curKey = side === 'local' ? 'localPath' : 'remotePath';
  const sel = sess.selected[side];
  const names = sel.has(item.name) ? [...sel] : [item.name];

  if (act === 'open' && item.isDir) {
    sess[curKey] = joinPath(sess[curKey], item.name);
    (side === 'local' ? loadLocal : loadRemote)(sessionId);
  } else if (act === 'copy-path') {
    const full = joinPath(sess[curKey], item.name);
    try { await navigator.clipboard.writeText(full); toast('Path copied', 'ok'); }
    catch (e) { toast('Copy failed', 'err'); }
  } else if (act === 'xfer') {
    await handleBatchTransfer(sessionId, side, names);
  } else if (act === 'rename') {
    const nn = await showPrompt('Rename to:', item.name, { title: 'RENAME', okText: 'RENAME' });
    if (!nn || nn === item.name) return;
    const from = joinPath(sess[curKey], item.name);
    const to = joinPath(sess[curKey], nn);
    try {
      if (side === 'local') await window.api.local.rename({ from, to });
      else await window.api.sftp.rename({ sessionId, from, to });
      (side === 'local' ? loadLocal : loadRemote)(sessionId);
      toast('Renamed', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  } else if (act === 'delete') {
    const label = names.length > 1 ? `${names.length} items` : item.name;
    const ok = await showConfirm(
      `Delete ${label}${item.isDir && names.length === 1 ? ' (recursive)' : ''}?`,
      { title: 'DELETE', okText: 'DELETE', danger: true }
    );
    if (!ok) return;
    let okN = 0, failN = 0;
    for (const n of names) {
      const target = joinPath(sess[curKey], n);
      const isDir = (n === item.name) ? item.isDir : false; // best-effort for batch
      try {
        if (side === 'local') await window.api.local.delete({ path: target, isDir });
        else await window.api.sftp.delete({ sessionId, path: target, isDir });
        okN++;
      } catch (e) { failN++; }
    }
    if (okN) toast(`Deleted ${okN}${failN ? `, ${failN} failed` : ''}`, failN ? 'err' : 'ok');
    sel.clear();
    (side === 'local' ? loadLocal : loadRemote)(sessionId);
  } else if (act === 'props') {
    showProperties(sess, side, item);
  }
}

function showProperties(sess, side, item) {
  const curKey = side === 'local' ? 'localPath' : 'remotePath';
  const fullPath = joinPath(sess[curKey], item.name);
  const type = item.isDir ? 'Directory' : (item.isLink ? 'Symbolic link' : 'File');
  const sizeStr = item.isDir ? '—' : `${humanSize(item.size)} (${item.size.toLocaleString()} bytes)`;
  const modeStr = item.mode != null ? `0${(item.mode & 0o777).toString(8).padStart(3, '0')}` : '—';
  const mtimeStr = item.mtime ? new Date(item.mtime * 1000).toLocaleString() : '—';

  const rows = [
    ['NAME', item.name],
    ['LOCATION', sess[curKey]],
    ['FULL PATH', fullPath],
    ['SOURCE', side.toUpperCase()],
    ['TYPE', type],
    ['SIZE', sizeStr],
    ['MODIFIED', mtimeStr],
    ['MODE', modeStr],
  ];

  const html = rows.map(([k, v]) =>
    `<div class="props-row"><span class="props-k">${k}</span><span class="props-v">${escapeHtml(String(v))}</span></div>`
  ).join('');

  showInfo('PROPERTIES', html);
}

// Standalone info modal — separate from the confirm/prompt machinery to avoid
// fighting over the shared dialog buttons.
function showInfo(title, htmlBody) {
  const back = document.createElement('div');
  back.className = 'modal info-modal';
  back.innerHTML = `
    <div class="modal-body dialog-body">
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>
      <div class="modal-header">${escapeHtml(title)}</div>
      <div class="dialog-msg info-body"></div>
      <div class="modal-footer">
        <div style="flex:1"></div>
        <button class="btn btn-primary info-close">CLOSE</button>
      </div>
    </div>
  `;
  back.querySelector('.info-body').innerHTML = htmlBody;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('.info-close').addEventListener('click', close);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
}

// ─── Keyboard ───
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || '');
document.addEventListener('keydown', e => {
  if (!$('#lockscreen').hidden) return; // locked — ignore
  if (e.key === 'Escape' && !$('#modal').hidden) {
    $('#modal').hidden = true;
    return;
  }
  // Mac: ⌘L. Win/Linux: Ctrl+Shift+L — plain Ctrl+L is reserved (xterm/bash
  // clear-screen), so we require Shift there to avoid eating that keystroke.
  const lockCombo = IS_MAC
    ? (e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey)
    : (e.ctrlKey && e.shiftKey && !e.metaKey && !e.altKey);
  if (lockCombo && (e.key === 'l' || e.key === 'L') && $('#modal').hidden) {
    e.preventDefault();
    lockNow();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'w' && activeTabId && $('#modal').hidden) {
    e.preventDefault();
    disconnectSession(activeTabId);
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'n' && $('#modal').hidden) {
    e.preventDefault();
    openAddModal();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'b' && $('#modal').hidden) {
    e.preventDefault();
    setSidebarHidden(!document.body.classList.contains('sidebar-hidden'));
  }
});

// ─── Lock button ───
function lockNow() {
  // No PIN configured? Nothing meaningful to lock to — bail silently.
  // (boot() bypasses the lockscreen entirely when hasPin is false.)
  setLockMode('enter');
  showLock();
}
(() => {
  const btn = $('#lockBtn');
  if (!btn) return;
  const combo = IS_MAC ? '⌘ L' : 'CTRL ⇧ L';
  btn.dataset.shortcut = combo;
  btn.title = `Lock workspace · ${combo}`;
  btn.addEventListener('click', lockNow);
})();

// ─── PIN lockscreen ───
const PIN_LEN = 4;
const lockEl = $('#lockscreen');
const lockSub = $('#lockSub');
const lockStatus = $('#lockStatus');
const pinBoxesEl = $('#pinBoxes');
const pinInputs = Array.from(pinBoxesEl.querySelectorAll('.pin-box'));

let lockMode = 'enter';         // 'enter' | 'create' | 'confirm'
let pendingPin = '';             // first entry during create

function showLock() {
  lockEl.hidden = false;
  resetPin();
  setTimeout(() => pinInputs[0].focus(), 60);
}
function hideLock() {
  lockEl.hidden = true;
}
function resetPin() {
  pinInputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
  pinBoxesEl.classList.remove('shake', 'ok');
}
function currentPin() {
  return pinInputs.map(i => i.value).join('');
}
function setLockMode(mode, msg, kind) {
  lockMode = mode;
  if (mode === 'create') lockSub.textContent = 'CREATE ACCESS CODE';
  else if (mode === 'confirm') lockSub.textContent = 'CONFIRM ACCESS CODE';
  else lockSub.textContent = 'ENTER ACCESS CODE';
  setLockStatus(msg || '', kind || '');
}
function setLockStatus(msg, kind) {
  lockStatus.textContent = msg || '';
  lockStatus.className = 'lock-status' + (kind ? ' ' + kind : '');
}

pinInputs.forEach((inp, idx) => {
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/[^0-9]/g, '').slice(0, 1);
    inp.classList.toggle('filled', !!inp.value);
    if (inp.value && idx < pinInputs.length - 1) pinInputs[idx + 1].focus();
    if (currentPin().length === PIN_LEN) submitPin();
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !inp.value && idx > 0) {
      pinInputs[idx - 1].focus();
      pinInputs[idx - 1].value = '';
      pinInputs[idx - 1].classList.remove('filled');
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      pinInputs[idx - 1].focus();
    } else if (e.key === 'ArrowRight' && idx < pinInputs.length - 1) {
      pinInputs[idx + 1].focus();
    } else if (e.key === 'Enter' && currentPin().length === PIN_LEN) {
      submitPin();
    }
  });
  inp.addEventListener('paste', (e) => {
    const txt = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '');
    if (!txt) return;
    e.preventDefault();
    for (let i = 0; i < Math.min(txt.length, pinInputs.length - idx); i++) {
      pinInputs[idx + i].value = txt[i];
      pinInputs[idx + i].classList.add('filled');
    }
    const next = Math.min(idx + txt.length, pinInputs.length - 1);
    pinInputs[next].focus();
    if (currentPin().length === PIN_LEN) submitPin();
  });
});

async function submitPin() {
  const pin = currentPin();
  if (pin.length !== PIN_LEN) return;

  if (lockMode === 'enter') {
    const ok = await window.api.auth.verify({ pin });
    if (ok) {
      pinBoxesEl.classList.add('ok');
      setLockStatus('ACCESS GRANTED', 'ok');
      setTimeout(() => { hideLock(); afterUnlock(); }, 320);
    } else {
      pinBoxesEl.classList.add('shake');
      setLockStatus('INCORRECT CODE', 'err');
      setTimeout(() => { resetPin(); pinInputs[0].focus(); }, 500);
    }
  } else if (lockMode === 'create') {
    pendingPin = pin;
    setLockMode('confirm');
    resetPin();
    pinInputs[0].focus();
  } else if (lockMode === 'confirm') {
    if (pin === pendingPin) {
      try {
        await window.api.auth.setPin({ pin });
        pinBoxesEl.classList.add('ok');
        setLockStatus('CODE REGISTERED', 'ok');
        setTimeout(() => { hideLock(); afterUnlock(); }, 320);
      } catch (e) {
        setLockStatus('FAILED: ' + e.message, 'err');
      }
    } else {
      pendingPin = '';
      pinBoxesEl.classList.add('shake');
      setLockStatus('CODES DO NOT MATCH — RETRY', 'err');
      setTimeout(() => { setLockMode('create'); resetPin(); pinInputs[0].focus(); }, 600);
    }
  }
}

let bootResolve;
function afterUnlock() {
  if (bootResolve) { bootResolve(); bootResolve = null; }
}
function waitForUnlock() {
  return new Promise(res => { bootResolve = res; });
}

window.addEventListener('resize', () => {
  for (const [, s] of activeSessions) {
    try { s.fitAddon && s.fitAddon.fit(); } catch (e) {}
  }
});

$('#modal').addEventListener('click', e => {
  if (e.target.id === 'modal') $('#modal').hidden = true;
});

// Enter inside the modal → confirm. Buttons handle Enter themselves (browser
// default), so we skip when focus is on one.
$('#modal').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;
  e.preventDefault();
  $('#btnSave').click();
});

// ─── Sidebar toggle ───
const sidebarToggleBtn = $('#sidebarToggle');
function setSidebarHidden(hidden) {
  document.body.classList.toggle('sidebar-hidden', hidden);
  if (sidebarToggleBtn) sidebarToggleBtn.textContent = hidden ? '»' : '«';
  try { localStorage.setItem('maxter.sidebar.hidden', hidden ? '1' : '0'); } catch (e) {}
  // Fit terminals after layout change
  setTimeout(() => {
    for (const [, s] of activeSessions) {
      try { s.fitAddon && s.fitAddon.fit(); } catch (e) {}
    }
  }, 60);
}
if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener('click', () => {
    setSidebarHidden(!document.body.classList.contains('sidebar-hidden'));
  });
}

// ─── Password eye toggle ───
$$('.pwd-eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    const showing = target.type === 'text';
    target.type = showing ? 'password' : 'text';
    btn.classList.toggle('on', !showing);
    btn.textContent = showing ? '◐' : '◉';
    target.focus();
  });
});

// ─── Theme wiring ───
$$('.theme-dot').forEach(b => {
  b.addEventListener('click', () => applyTheme(b.dataset.theme));
});

// ─── Font wiring ───
$$('.font-btn').forEach(b => {
  b.addEventListener('click', () => applyFont(b.dataset.font));
});

const fontToggleEl = $('#fontToggle');
const fontDotsEl = $('#fontDots');
function setFontPickerOpen(open) {
  fontDotsEl.hidden = !open;
  fontToggleEl.classList.toggle('open', open);
  try { localStorage.setItem('maxter.font.open', open ? '1' : '0'); } catch (e) {}
}
fontToggleEl.addEventListener('click', () => setFontPickerOpen(fontDotsEl.hidden));
fontToggleEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    setFontPickerOpen(fontDotsEl.hidden);
  }
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

// ─── Dock icon generator (macOS) ───
// Picks colours from the currently-applied theme so the dock reflects the
// active palette. Called on boot and after any theme change.
async function makeDockIconDataURL() {
  try {
    try {
      await document.fonts.load('900 500px Rajdhani');
      await document.fonts.ready;
    } catch (e) {}

    // Theme variables are declared on body.theme-X, not :root — so read from
    // <body>, otherwise getComputedStyle returns the :root defaults (Obsidian).
    const cs = getComputedStyle(document.body);
    const bgColor     = (cs.getPropertyValue('--bg-0').trim()       || '#fdf6e3');
    const accentColor = (cs.getPropertyValue('--accent').trim()     || '#cb4b16');
    const accentHot   = (cs.getPropertyValue('--accent-hot').trim() || '#b58900');

    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const radius = size * 0.2;

    // Rounded background — flat theme bg, no gradient (cleaner)
    ctx.fillStyle = bgColor;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, radius);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, size, size);
    }

    // Inner square accent frame
    const frameInset = size * 0.115;
    const frameSize = size - frameInset * 2;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = Math.max(2, size * 0.008);
    ctx.lineCap = 'square';
    ctx.strokeRect(frameInset, frameInset, frameSize, frameSize);

    // Corner ticks — brand detail (heavier strokes at each corner)
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = Math.max(3, size * 0.016);
    const tickLen = size * 0.06;
    const t = frameInset;
    ctx.beginPath(); ctx.moveTo(t, t + tickLen); ctx.lineTo(t, t); ctx.lineTo(t + tickLen, t); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size - t - tickLen, t); ctx.lineTo(size - t, t); ctx.lineTo(size - t, t + tickLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t, size - t - tickLen); ctx.lineTo(t, size - t); ctx.lineTo(t + tickLen, size - t); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size - t - tickLen, size - t); ctx.lineTo(size - t, size - t); ctx.lineTo(size - t, size - t - tickLen); ctx.stroke();

    // Letter M — Rajdhani Black in accent-hot, optically centered
    ctx.font = `900 ${Math.round(size * 0.7)}px "Rajdhani", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = accentHot;
    const metrics = ctx.measureText('M');
    const ascent = metrics.actualBoundingBoxAscent || size * 0.5;
    const descent = metrics.actualBoundingBoxDescent || 0;
    const frameCenterY = frameInset + frameSize / 2;
    const baselineY = frameCenterY + (ascent - descent) / 2;
    ctx.fillText('M', size / 2, baselineY);

    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

async function refreshDockIcon() {
  try {
    const url = await makeDockIconDataURL();
    if (url) await window.api.dock.setIcon(url);
  } catch (e) {}
}

// ─── SSH host key verification ───
// Renderer side of known_hosts: main process triggers this when it sees a
// key it doesn't recognise (or one that has CHANGED, which is the scary
// path — possible MITM). User accepts/rejects; the response goes back via
// host.respond(id, ...).
window.api.host.onVerify(async ({ id, host, port, fingerprint, previous, firstTime }) => {
  const accepted = await showHostKeyDialog({ host, port, fingerprint, previous, firstTime });
  await window.api.host.respond({ id, accept: accepted, save: accepted });
});

function showHostKeyDialog({ host, port, fingerprint, previous, firstTime }) {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'modal info-modal';
    const isChanged = !firstTime;
    back.innerHTML = `
      <div class="modal-body dialog-body hostkey-body${isChanged ? ' danger' : ''}">
        <span class="corner tl"></span><span class="corner tr"></span>
        <span class="corner bl"></span><span class="corner br"></span>
        <div class="modal-header">${isChanged ? 'HOST KEY CHANGED' : 'NEW HOST'}</div>
        <div class="dialog-msg hostkey-msg"></div>
        <div class="modal-footer">
          <div style="flex:1"></div>
          <button class="btn btn-ghost hostkey-cancel">${isChanged ? 'ABORT' : 'CANCEL'}</button>
          <button class="btn ${isChanged ? 'btn-danger' : 'btn-primary'} hostkey-accept">${isChanged ? 'TRUST NEW (DANGEROUS)' : 'TRUST & SAVE'}</button>
        </div>
      </div>
    `;
    const msgEl = back.querySelector('.hostkey-msg');
    msgEl.innerHTML = isChanged
      ? `
        <div class="hostkey-warn">⚠ The host key for <span class="hostkey-host">${escapeHtml(host)}:${port}</span> has CHANGED.</div>
        <div class="hostkey-row"><span class="hostkey-label">EXPECTED</span><span class="hostkey-fp">${escapeHtml(previous || '?')}</span></div>
        <div class="hostkey-row"><span class="hostkey-label">PRESENTED</span><span class="hostkey-fp">${escapeHtml(fingerprint)}</span></div>
        <div class="hostkey-warn-foot">This could be a man-in-the-middle attack, OR the server's SSH key was legitimately rotated. If unsure — abort and verify out of band.</div>
      `
      : `
        <div class="hostkey-host">${escapeHtml(host)}:${port}</div>
        <div class="hostkey-row"><span class="hostkey-label">FINGERPRINT</span><span class="hostkey-fp">${escapeHtml(fingerprint)}</span></div>
        <div class="hostkey-foot">First time connecting. Verify the fingerprint with the server admin (or via console) before trusting.</div>
      `;
    document.body.appendChild(back);
    const finish = (accept) => {
      back.remove();
      document.removeEventListener('keydown', onEsc);
      resolve(accept);
    };
    function onEsc(e) { if (e.key === 'Escape') finish(false); }
    back.querySelector('.hostkey-accept').onclick = () => finish(true);
    back.querySelector('.hostkey-cancel').onclick = () => finish(false);
    back.addEventListener('click', (e) => { if (e.target === back) finish(false); });
    document.addEventListener('keydown', onEsc);
    setTimeout(() => back.querySelector('.hostkey-cancel').focus(), 50);  // safe default
  });
}

// ─── Boot ───
(async function boot() {
  // Theme (early, so lockscreen + dock icon use it)
  try {
    const saved = localStorage.getItem('nexus.theme') || localStorage.getItem('maxter.theme');
    if (saved && THEMES.some(t => t.id === saved)) currentTheme = saved;
  } catch (e) {}
  applyTheme(currentTheme);

  // Dock icon (macOS only; reads colours from --bg-0/--accent/--accent-hot
  // of the applied theme, so must run AFTER applyTheme).
  refreshDockIcon();

  // Font (after theme, before UI reads var(--family-*))
  try {
    const savedFont = localStorage.getItem('maxter.font');
    if (savedFont && FONTS.some(f => f.id === savedFont)) currentFont = savedFont;
  } catch (e) {}
  applyFont(currentFont);

  // Sidebar: always start visible on launch. The toggle is a workspace tool,
  // not a persisted preference — user opens the app → sees their registry.
  setSidebarHidden(false);

  let pickerOpen = false;
  try { pickerOpen = localStorage.getItem('nexus.theme.open') === '1'; } catch (e) {}
  setThemePickerOpen(pickerOpen);

  let fontPickerOpen = false;
  try { fontPickerOpen = localStorage.getItem('maxter.font.open') === '1'; } catch (e) {}
  setFontPickerOpen(fontPickerOpen);

  // Auth / PIN gate
  try {
    const st = await window.api.auth.status();
    setLockMode(st.hasPin ? 'enter' : 'create');
    showLock();
    await waitForUnlock();
  } catch (e) {
    console.error('Auth check failed', e);
  }

  try { homeDir = await window.api.local.home(); } catch (e) { homeDir = '/'; }
  await loadServers();
})();
