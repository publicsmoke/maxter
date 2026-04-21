const { app, BrowserWindow, ipcMain, safeStorage, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { Client } = require('ssh2');

// Portable mode: electron-builder's "portable" target sets
// PORTABLE_EXECUTABLE_DIR to the folder that holds the .exe. When running
// portable we drop all state into a "Maxter data" folder next to the binary,
// so the user can move the exe + folder together (to a flash drive, etc).
// Otherwise (dev run via `npm start`, packaged non-portable build) fall back
// to the canonical appData location.
try {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const portableData = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'Maxter data');
    app.setPath('userData', portableData);
  } else {
    app.setPath('userData', path.join(app.getPath('appData'), 'nexus-term'));
  }
} catch (e) { /* ignore — fall back to default */ }

// Migrate data that may have been written to a stray "Maxter" userData dir
// (from an earlier build that mistakenly called app.setName). One-shot,
// safe to run every launch.
function migrateStrayMaxterData() {
  try {
    const base = app.getPath('appData');
    const canonical = path.join(base, 'nexus-term');
    const stray = path.join(base, 'Maxter');
    if (!fs.existsSync(stray)) return;
    fs.mkdirSync(canonical, { recursive: true });
    for (const f of ['servers.json', 'auth.json']) {
      const src = path.join(stray, f);
      const dst = path.join(canonical, f);
      if (fs.existsSync(src) && !fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
      }
    }
  } catch (e) { /* ignore */ }
}

const CONFIG_DIR = () => app.getPath('userData');
const CONFIG_FILE = () => path.join(CONFIG_DIR(), 'servers.json');
const AUTH_FILE = () => path.join(CONFIG_DIR(), 'auth.json');
const HOSTS_FILE = () => path.join(CONFIG_DIR(), 'known_hosts.json');

let mainWindow;
const sessions = new Map(); // sessionId -> { conn, stream, sftp }

function createWindow() {
  // Static .ico baked into the .exe by electron-builder; in dev (`npm start`)
  // we still load it explicitly so the taskbar/title-bar isn't the generic
  // Electron atom while the renderer warms up. Once the renderer boots, it
  // pushes a theme-coloured icon via the dock:setIcon IPC below.
  const opts = {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 620,
    backgroundColor: '#05070f',
    frame: false,
    titleBarStyle: 'hidden',
    thickFrame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
  if (process.platform === 'win32') {
    const icoPath = path.join(__dirname, 'build', 'icon.ico');
    if (fs.existsSync(icoPath)) opts.icon = icoPath;
  }
  mainWindow = new BrowserWindow(opts);
  mainWindow.loadFile('index.html');

  const fire = (state) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('win:maximizeChanged', state);
  };
  mainWindow.on('maximize',   () => fire(true));
  mainWindow.on('unmaximize', () => fire(false));
}

ipcMain.handle('win:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.handle('win:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('win:close',       () => mainWindow && mainWindow.close());
ipcMain.handle('win:isMaximized', () => !!(mainWindow && mainWindow.isMaximized()));

app.whenReady().then(() => {
  migrateStrayMaxterData();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  for (const s of sessions.values()) {
    try { s.conn.end(); } catch (e) {}
  }
  sessions.clear();
  if (process.platform !== 'darwin') app.quit();
});

// --- Config management + PIN-derived file encryption ---
// See main worktree's main.js for rationale. In portable mode the userData
// folder lives next to the .exe on the host filesystem — file-level
// encryption is especially important there (no Keychain / DPAPI guarantee
// if the folder is carried between machines on a USB stick).

let _serversKey = null;

function deriveServersKey(pin, encSalt) {
  return crypto.pbkdf2Sync(pin, encSalt, 200000, 32, 'sha256');
}

function encryptJSON(key, obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf-8'), cipher.final()]);
  return { v: 1, alg: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ct.toString('base64') };
}

function decryptJSON(key, blob) {
  if (!blob || blob.alg !== 'aes-256-gcm') throw new Error('bad envelope');
  const iv = Buffer.from(blob.iv, 'base64');
  const tag = Buffer.from(blob.tag, 'base64');
  const ct = Buffer.from(blob.data, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(pt.toString('utf-8'));
}

function loadServers() {
  try {
    if (!fs.existsSync(CONFIG_FILE())) return [];
    const raw = fs.readFileSync(CONFIG_FILE(), 'utf-8');
    const parsed = JSON.parse(raw);
    let data;
    if (parsed && parsed.v === 1 && parsed.alg) {
      if (!_serversKey) return [];
      try { data = decryptJSON(_serversKey, parsed); } catch (e) { return []; }
    } else if (Array.isArray(parsed)) {
      data = parsed;
    } else {
      return [];
    }
    return data.map(s => {
      const out = { ...s };
      if (out.encPassword && safeStorage.isEncryptionAvailable()) {
        try { out.password = safeStorage.decryptString(Buffer.from(out.encPassword, 'base64')); }
        catch (e) { out.password = ''; }
      } else if (out.encPassword) { out.password = ''; }
      if (out.encPassphrase && safeStorage.isEncryptionAvailable()) {
        try { out.passphrase = safeStorage.decryptString(Buffer.from(out.encPassphrase, 'base64')); }
        catch (e) { out.passphrase = ''; }
      }
      delete out.encPassword;
      delete out.encPassphrase;
      return out;
    });
  } catch (e) { return []; }
}

function saveServers(servers) {
  const toSave = servers.map(s => {
    const copy = { ...s };
    if (copy.password && safeStorage.isEncryptionAvailable()) {
      copy.encPassword = safeStorage.encryptString(copy.password).toString('base64');
      delete copy.password;
    }
    if (copy.passphrase && safeStorage.isEncryptionAvailable()) {
      copy.encPassphrase = safeStorage.encryptString(copy.passphrase).toString('base64');
      delete copy.passphrase;
    }
    return copy;
  });
  fs.mkdirSync(CONFIG_DIR(), { recursive: true });
  const payload = _serversKey
    ? JSON.stringify(encryptJSON(_serversKey, toSave), null, 2)
    : JSON.stringify(toSave, null, 2);
  fs.writeFileSync(CONFIG_FILE(), payload);
}

ipcMain.handle('servers:list', () => loadServers());
ipcMain.handle('servers:save', (_e, servers) => { saveServers(servers); return true; });

// --- Auth / PIN ---

let authVerified = false;

function loadAuth() {
  try {
    if (!fs.existsSync(AUTH_FILE())) return null;
    return JSON.parse(fs.readFileSync(AUTH_FILE(), 'utf-8'));
  } catch (e) { return null; }
}

function saveAuth(data) {
  fs.mkdirSync(CONFIG_DIR(), { recursive: true });
  fs.writeFileSync(AUTH_FILE(), JSON.stringify(data));
}

function hashPin(pin, salt, iterations) {
  return crypto.pbkdf2Sync(pin, salt, iterations, 32, 'sha256').toString('hex');
}

ipcMain.handle('auth:status', () => {
  const a = loadAuth();
  return { hasPin: !!(a && a.pinHash), verified: authVerified };
});

ipcMain.handle('auth:setPin', (_e, { pin }) => {
  if (!pin || pin.length < 4) throw new Error('PIN must be at least 4 digits');
  const salt = crypto.randomBytes(16).toString('hex');
  const encSalt = crypto.randomBytes(16).toString('hex');
  const iterations = 120000;
  const pinHash = hashPin(pin, salt, iterations);
  saveAuth({ pinHash, salt, encSalt, iterations, createdAt: Date.now() });
  authVerified = true;
  _serversKey = deriveServersKey(pin, encSalt);
  try { const existing = loadServers(); if (existing.length) saveServers(existing); } catch (_) {}
  return true;
});

let _verifyFailCount = 0;
const verifyDelay = () => new Promise(r => setTimeout(r, Math.min(_verifyFailCount, 10) * 500));

ipcMain.handle('auth:verify', async (_e, { pin }) => {
  await verifyDelay();
  const a = loadAuth();
  if (!a) return false;
  const h = hashPin(pin, a.salt, a.iterations || 120000);
  const ok = crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(a.pinHash, 'hex'));
  if (ok) {
    authVerified = true;
    _verifyFailCount = 0;
    let encSalt = a.encSalt;
    if (!encSalt) {
      encSalt = crypto.randomBytes(16).toString('hex');
      saveAuth({ ...a, encSalt });
    }
    _serversKey = deriveServersKey(pin, encSalt);
    try { const existing = loadServers(); if (existing.length) saveServers(existing); } catch (_) {}
  } else {
    _verifyFailCount++;
  }
  return ok;
});

ipcMain.handle('auth:reset', () => {
  try { fs.unlinkSync(AUTH_FILE()); } catch (e) {}
  authVerified = false;
  _serversKey = null;
  _verifyFailCount = 0;
  return true;
});

// --- Host key verification (known_hosts) ---
function loadKnownHosts() {
  try {
    if (!fs.existsSync(HOSTS_FILE())) return {};
    return JSON.parse(fs.readFileSync(HOSTS_FILE(), 'utf-8'));
  } catch (e) { return {}; }
}
function saveKnownHosts(map) {
  fs.mkdirSync(CONFIG_DIR(), { recursive: true });
  fs.writeFileSync(HOSTS_FILE(), JSON.stringify(map, null, 2));
}
function fingerprintFor(buf) {
  return 'SHA256:' + crypto.createHash('sha256').update(buf).digest('base64').replace(/=+$/, '');
}
let _verifyId = 0;
const pendingVerifies = new Map();
ipcMain.handle('host:verifyResponse', (_e, { id, accept, save }) => {
  const p = pendingVerifies.get(id);
  if (!p) return;
  pendingVerifies.delete(id);
  if (accept && save) {
    const known = loadKnownHosts();
    known[p.key] = { fingerprint: p.fp, addedAt: Date.now() };
    saveKnownHosts(known);
  }
  p.cb(accept);
});
ipcMain.handle('host:list', () => loadKnownHosts());
ipcMain.handle('host:forget', (_e, { key }) => {
  const known = loadKnownHosts();
  delete known[key];
  saveKnownHosts(known);
  return true;
});

// --- SSH session ---

ipcMain.handle('ssh:connect', (_e, { sessionId, server, cols, rows }) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const hostKey = `${server.host}:${server.port || 22}`;
    const cfg = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 20000,
      keepaliveInterval: 8000,
      keepaliveCountMax: 3,
      hostVerifier: (key, callback) => {
        const buf = Buffer.isBuffer(key) ? key : Buffer.from(key);
        const fp = fingerprintFor(buf);
        const known = loadKnownHosts();
        const stored = known[hostKey];
        if (stored && stored.fingerprint === fp) return callback(true);
        const id = ++_verifyId;
        pendingVerifies.set(id, { cb: callback, fp, key: hostKey });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('host:verify', {
            id,
            host: server.host,
            port: server.port || 22,
            fingerprint: fp,
            previous: stored ? stored.fingerprint : null,
            firstTime: !stored,
          });
        } else {
          pendingVerifies.delete(id);
          callback(false);
        }
      },
    };

    if (server.authMethod === 'key' && server.privateKey) {
      try {
        cfg.privateKey = fs.readFileSync(server.privateKey);
        if (server.passphrase) cfg.passphrase = server.passphrase;
      } catch (e) {
        return reject(new Error('Failed to read key: ' + e.message));
      }
    } else {
      cfg.password = server.password || '';
      cfg.tryKeyboard = true;
    }

    let resolved = false;

    conn.on('keyboard-interactive', (_name, _instr, _lang, _prompts, finish) => {
      finish([server.password || '']);
    });

    conn.on('ready', () => {
      conn.shell({ term: 'xterm-256color', cols, rows }, (err, stream) => {
        if (err) { resolved = true; return reject(err); }
        sessions.set(sessionId, { conn, stream, sftp: null });
        stream.on('data', (data) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(`ssh:data:${sessionId}`, data.toString('utf-8'));
          }
        });
        stream.on('close', () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(`ssh:close:${sessionId}`);
          }
          try { conn.end(); } catch (e) {}
          sessions.delete(sessionId);
        });
        resolved = true;
        resolve({ ok: true });
      });
    });

    conn.on('error', err => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`ssh:error:${sessionId}`, err.message);
      }
      if (!resolved) { resolved = true; reject(err); }
    });

    conn.on('close', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`ssh:close:${sessionId}`);
      }
      sessions.delete(sessionId);
    });

    try {
      conn.connect(cfg);
    } catch (e) {
      if (!resolved) { resolved = true; reject(e); }
    }
  });
});

ipcMain.handle('ssh:write', (_e, { sessionId, data }) => {
  const s = sessions.get(sessionId);
  if (s && s.stream) s.stream.write(data);
  return true;
});

ipcMain.handle('ssh:resize', (_e, { sessionId, cols, rows }) => {
  const s = sessions.get(sessionId);
  if (s && s.stream) s.stream.setWindow(rows, cols);
  return true;
});

ipcMain.handle('ssh:disconnect', (_e, { sessionId }) => {
  const s = sessions.get(sessionId);
  if (s) {
    try { s.conn.end(); } catch (e) {}
    sessions.delete(sessionId);
  }
  return true;
});

// --- SFTP ---

function getSftp(sessionId) {
  return new Promise((resolve, reject) => {
    const s = sessions.get(sessionId);
    if (!s) return reject(new Error('No active session'));
    if (s.sftp) return resolve(s.sftp);
    s.conn.sftp((err, sftp) => {
      if (err) return reject(err);
      s.sftp = sftp;
      resolve(sftp);
    });
  });
}

ipcMain.handle('sftp:list', async (_e, { sessionId, path: p }) => {
  const sftp = await getSftp(sessionId);
  return new Promise((resolve, reject) => {
    sftp.readdir(p, (err, list) => {
      if (err) return reject(err);
      resolve(list.map(item => ({
        name: item.filename,
        size: item.attrs.size,
        mtime: item.attrs.mtime,
        mode: item.attrs.mode,
        isDir: (item.attrs.mode & 0o170000) === 0o040000,
        isLink: (item.attrs.mode & 0o170000) === 0o120000,
      })));
    });
  });
});

ipcMain.handle('sftp:realpath', async (_e, { sessionId, path: p }) => {
  const sftp = await getSftp(sessionId);
  return new Promise((resolve, reject) => {
    sftp.realpath(p, (err, rp) => err ? reject(err) : resolve(rp));
  });
});

ipcMain.handle('sftp:mkdir', async (_e, { sessionId, path: p }) => {
  const sftp = await getSftp(sessionId);
  return new Promise((resolve, reject) => {
    sftp.mkdir(p, err => err ? reject(err) : resolve(true));
  });
});

ipcMain.handle('sftp:delete', async (_e, { sessionId, path: p, isDir }) => {
  const sftp = await getSftp(sessionId);
  return new Promise((resolve, reject) => {
    const fn = isDir ? sftp.rmdir.bind(sftp) : sftp.unlink.bind(sftp);
    fn(p, err => err ? reject(err) : resolve(true));
  });
});

ipcMain.handle('sftp:rename', async (_e, { sessionId, from, to }) => {
  const sftp = await getSftp(sessionId);
  return new Promise((resolve, reject) => {
    sftp.rename(from, to, err => err ? reject(err) : resolve(true));
  });
});

ipcMain.handle('sftp:download', async (_e, { sessionId, remotePath }) => {
  const sftp = await getSftp(sessionId);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Download from server',
    defaultPath: path.basename(remotePath),
  });
  if (result.canceled) return { canceled: true };
  return new Promise((resolve, reject) => {
    sftp.fastGet(remotePath, result.filePath, err => err
      ? reject(err)
      : resolve({ ok: true, localPath: result.filePath }));
  });
});

ipcMain.handle('sftp:upload', async (_e, { sessionId, remoteDir }) => {
  const sftp = await getSftp(sessionId);
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Upload to server',
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled) return { canceled: true };
  const uploaded = [];
  for (const file of result.filePaths) {
    await new Promise((resolve, reject) => {
      const dest = path.posix.join(remoteDir, path.basename(file));
      sftp.fastPut(file, dest, err => err ? reject(err) : resolve());
    });
    uploaded.push(path.basename(file));
  }
  return { ok: true, files: uploaded };
});

ipcMain.handle('dock:setIcon', (_e, dataUrl) => {
  try {
    const img = nativeImage.createFromDataURL(dataUrl);
    if (img.isEmpty()) return false;
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(img);
      return true;
    }
    if (process.platform === 'win32' && mainWindow && !mainWindow.isDestroyed()) {
      // Taskbar + window icon while app is running. The baked-in .exe icon
      // (visible in File Explorer when app is NOT running) still comes from
      // build/icon.ico at package time.
      mainWindow.setIcon(img);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('dialog:pickKey', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Select private key',
    properties: ['openFile', 'showHiddenFiles'],
  });
  if (r.canceled) return null;
  return r.filePaths[0];
});

// --- Local filesystem (for split SFTP view) ---

ipcMain.handle('local:home', () => os.homedir().replace(/\\/g, '/'));

ipcMain.handle('local:list', async (_e, { path: p }) => {
  p = path.normalize(p);
  const entries = await fs.promises.readdir(p, { withFileTypes: true });
  const results = [];
  for (const ent of entries) {
    if (ent.name === '.' || ent.name === '..') continue;
    const full = path.join(p, ent.name);
    let stat = null;
    try { stat = await fs.promises.stat(full); } catch (e) {}
    const isDir = stat ? stat.isDirectory() : ent.isDirectory();
    results.push({
      name: ent.name,
      size: stat ? stat.size : 0,
      mtime: stat ? Math.floor(stat.mtimeMs / 1000) : 0,
      isDir,
      isLink: ent.isSymbolicLink(),
    });
  }
  return results;
});

ipcMain.handle('local:mkdir', async (_e, { path: p }) => {
  await fs.promises.mkdir(path.normalize(p));
  return true;
});

ipcMain.handle('local:rename', async (_e, { from, to }) => {
  await fs.promises.rename(path.normalize(from), path.normalize(to));
  return true;
});

ipcMain.handle('local:delete', async (_e, { path: p, isDir }) => {
  p = path.normalize(p);
  if (isDir) await fs.promises.rm(p, { recursive: true });
  else await fs.promises.unlink(p);
  return true;
});

// --- Direct SFTP transfers (used by split view) ---

ipcMain.handle('sftp:sendFile', async (_e, { sessionId, localPath, remotePath }) => {
  const sftp = await getSftp(sessionId);
  return new Promise((resolve, reject) => {
    sftp.fastPut(path.normalize(localPath), remotePath, err => err ? reject(err) : resolve(true));
  });
});

ipcMain.handle('sftp:getFile', async (_e, { sessionId, remotePath, localPath }) => {
  const sftp = await getSftp(sessionId);
  return new Promise((resolve, reject) => {
    sftp.fastGet(remotePath, path.normalize(localPath), err => err ? reject(err) : resolve(true));
  });
});

// ssh2 doesn't ship a recursive copier, so we walk the tree ourselves and
// fan out fastPut/fastGet per file. Symlinks are skipped — chasing them is a
// foot-gun (loops, escapes outside the source tree).
function sftpMkdirIfMissing(sftp, p) {
  return new Promise((resolve, reject) => {
    sftp.mkdir(p, err => {
      if (!err) return resolve();
      sftp.stat(p, statErr => statErr ? reject(err) : resolve());
    });
  });
}

async function sendDirRecursive(sftp, localDir, remoteDir) {
  await sftpMkdirIfMissing(sftp, remoteDir);
  const entries = await fs.promises.readdir(localDir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === '.' || ent.name === '..') continue;
    const lp = path.join(localDir, ent.name);
    const rp = path.posix.join(remoteDir, ent.name);
    if (ent.isDirectory()) {
      await sendDirRecursive(sftp, lp, rp);
    } else if (ent.isFile()) {
      await new Promise((res, rej) => sftp.fastPut(lp, rp, e => e ? rej(e) : res()));
    }
  }
}

async function getDirRecursive(sftp, remoteDir, localDir) {
  await fs.promises.mkdir(localDir, { recursive: true });
  const list = await new Promise((res, rej) => sftp.readdir(remoteDir, (e, l) => e ? rej(e) : res(l)));
  for (const item of list) {
    if (item.filename === '.' || item.filename === '..') continue;
    const rp = path.posix.join(remoteDir, item.filename);
    const lp = path.join(localDir, item.filename);
    const isDir = (item.attrs.mode & 0o170000) === 0o040000;
    const isLink = (item.attrs.mode & 0o170000) === 0o120000;
    if (isLink) continue;
    if (isDir) await getDirRecursive(sftp, rp, lp);
    else await new Promise((res, rej) => sftp.fastGet(rp, lp, e => e ? rej(e) : res()));
  }
}

ipcMain.handle('sftp:sendDir', async (_e, { sessionId, localPath, remotePath }) => {
  const sftp = await getSftp(sessionId);
  await sendDirRecursive(sftp, path.normalize(localPath), remotePath);
  return true;
});

ipcMain.handle('sftp:getDir', async (_e, { sessionId, remotePath, localPath }) => {
  const sftp = await getSftp(sessionId);
  await getDirRecursive(sftp, remotePath, path.normalize(localPath));
  return true;
});

ipcMain.handle('sftp:exists', async (_e, { sessionId, path: p }) => {
  const sftp = await getSftp(sessionId);
  return new Promise(resolve => sftp.stat(p, err => resolve(!err)));
});

ipcMain.handle('local:exists', async (_e, { path: p }) => {
  try { await fs.promises.access(path.normalize(p)); return true; }
  catch { return false; }
});
