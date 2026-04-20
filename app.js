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

let currentFont = 'ops';

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
    let lastClickAt = 0;
    el.addEventListener('click', () => {
      const now = Date.now();
      const isDouble = now - lastClickAt < 320;
      lastClickAt = isDouble ? 0 : now;
      connectServer(s, { allowDuplicate: isDouble });
    });
    list.appendChild(el);
  });
}

function updateStats() {
  $('#statServers').textContent = servers.length;
  $('#statActive').textContent = activeSessions.size;
  $('#srvCount').textContent = pad2(servers.length);
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
  if (!confirm('Decommission this endpoint permanently?')) return;
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
    connected: false,
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
}

function setStatus(sess, kind) {
  if (!sess.statusDotEl) return;
  sess.statusDotEl.classList.remove('fail', 'warn');
  if (kind === 'fail') sess.statusDotEl.classList.add('fail');
  if (kind === 'warn') sess.statusDotEl.classList.add('warn');
}

function renderTabs() {
  const bar = $('#tabsBar');
  // Preserve sidebar toggle button; clear everything else
  Array.from(bar.children).forEach(c => {
    if (c.id !== 'sidebarToggle') c.remove();
  });
  if (activeSessions.size === 0) {
    const ph = document.createElement('div');
    ph.className = 'tab-placeholder';
    ph.textContent = 'NO ACTIVE SESSIONS';
    bar.appendChild(ph);
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

  // If the path is still the placeholder (fast SFTP click before connectServer
  // finished its realpath), resolve $HOME on the remote now.
  if (!sess.remotePath || sess.remotePath === '.' || sess.remotePath === '~') {
    try {
      const rp = await window.api.sftp.realpath({ sessionId, path: '.' });
      sess.remotePath = rp;
      const inp = sess.remotePaneEl.querySelector('.fs-path');
      if (inp) inp.value = rp;
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
  if (!$('#lockscreen').hidden) return; // locked — ignore
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
  if ((e.metaKey || e.ctrlKey) && e.key === 'b' && $('#modal').hidden) {
    e.preventDefault();
    setSidebarHidden(!document.body.classList.contains('sidebar-hidden'));
  }
});

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
async function makeDockIconDataURL() {
  try {
    // Make sure Rajdhani is loaded before we rasterise the glyph
    try {
      await document.fonts.load('900 560px Rajdhani');
      await document.fonts.ready;
    } catch (e) {}

    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const radius = size * 0.22;

    // Dark diagonal gradient background
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#1a1b24');
    bg.addColorStop(1, '#05060a');
    ctx.fillStyle = bg;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, radius);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, size, size);
    }

    // Inner hairline frame
    const inset = size * 0.095;
    ctx.strokeStyle = 'rgba(156,179,212,0.16)';
    ctx.lineWidth = Math.max(1, size * 0.003);
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(inset, inset, size - inset * 2, size - inset * 2, radius * 0.65);
      ctx.stroke();
    }

    // Corner ticks (signature brand detail from the UI)
    ctx.strokeStyle = '#6695c4';
    ctx.lineWidth = Math.max(2, size * 0.007);
    ctx.lineCap = 'square';
    const tickLen = size * 0.04;
    const t = inset;
    // TL
    ctx.beginPath(); ctx.moveTo(t, t + tickLen); ctx.lineTo(t, t); ctx.lineTo(t + tickLen, t); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(size - t - tickLen, t); ctx.lineTo(size - t, t); ctx.lineTo(size - t, t + tickLen); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(t, size - t - tickLen); ctx.lineTo(t, size - t); ctx.lineTo(t + tickLen, size - t); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(size - t - tickLen, size - t); ctx.lineTo(size - t, size - t); ctx.lineTo(size - t, size - t - tickLen); ctx.stroke();

    // Letter M — Rajdhani Black, accent-hot colour, soft glow
    ctx.font = `900 ${Math.round(size * 0.6)}px "Rajdhani", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(102,149,196,0.55)';
    ctx.shadowBlur = size * 0.05;
    ctx.fillStyle = '#c0d3ea';
    ctx.fillText('M', size / 2, size / 2 + size * 0.02);
    ctx.shadowBlur = 0;

    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

// ─── Boot ───
(async function boot() {
  // Dock icon (macOS only; main-process ignores on other platforms)
  try {
    const url = await makeDockIconDataURL();
    if (url) await window.api.dock.setIcon(url);
  } catch (e) {}

  // Theme (early, so lockscreen uses it)
  try {
    const saved = localStorage.getItem('nexus.theme') || localStorage.getItem('maxter.theme');
    if (saved && THEMES.some(t => t.id === saved)) currentTheme = saved;
  } catch (e) {}
  applyTheme(currentTheme);

  // Font (after theme, before UI reads var(--family-*))
  try {
    const savedFont = localStorage.getItem('maxter.font');
    if (savedFont && FONTS.some(f => f.id === savedFont)) currentFont = savedFont;
  } catch (e) {}
  applyFont(currentFont);

  // Sidebar state
  let sidebarHidden = false;
  try { sidebarHidden = localStorage.getItem('maxter.sidebar.hidden') === '1'; } catch (e) {}
  setSidebarHidden(sidebarHidden);

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
