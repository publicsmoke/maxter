const { app, BrowserWindow, ipcMain, safeStorage, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { Client } = require('ssh2');

// Pin userData to the canonical "nexus-term" directory so existing data
// (servers.json, auth.json) is always found.
try {
  app.setPath('userData', path.join(app.getPath('appData'), 'nexus-term'));
} catch (e) { /* ignore — fall back to default */ }

// NOTE: intentionally NOT calling app.setName('Maxter'). On macOS, safeStorage
// uses the app name as the Keychain service identifier — renaming breaks the
// ability to decrypt previously-saved passwords. Branding is visual-only via
// CSS/DOM; the OS menu-bar item stays "Electron" in dev mode until the app is
// shipped as a packaged bundle with its own Info.plist.

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
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 620,
    backgroundColor: '#05070f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('index.html');
}

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

// --- Config management ---

function loadServers() {
  try {
    if (!fs.existsSync(CONFIG_FILE())) return [];
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE(), 'utf-8'));
    return data.map(s => {
      const out = { ...s };
      if (out.encPassword && safeStorage.isEncryptionAvailable()) {
        try {
          out.password = safeStorage.decryptString(Buffer.from(out.encPassword, 'base64'));
        } catch (e) {
          out.password = '';
        }
      } else if (out.encPassword) {
        out.password = '';
      }
      if (out.encPassphrase && safeStorage.isEncryptionAvailable()) {
        try {
          out.passphrase = safeStorage.decryptString(Buffer.from(out.encPassphrase, 'base64'));
        } catch (e) { out.passphrase = ''; }
      }
      delete out.encPassword;
      delete out.encPassphrase;
      return out;
    });
  } catch (e) {
    return [];
  }
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
  fs.writeFileSync(CONFIG_FILE(), JSON.stringify(toSave, null, 2));
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
  const iterations = 120000;
  const pinHash = hashPin(pin, salt, iterations);
  saveAuth({ pinHash, salt, iterations, createdAt: Date.now() });
  authVerified = true;
  return true;
});

ipcMain.handle('auth:verify', (_e, { pin }) => {
  const a = loadAuth();
  if (!a) return false;
  const h = hashPin(pin, a.salt, a.iterations || 120000);
  const ok = crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(a.pinHash, 'hex'));
  if (ok) authVerified = true;
  return ok;
});

ipcMain.handle('auth:reset', () => {
  try { fs.unlinkSync(AUTH_FILE()); } catch (e) {}
  authVerified = false;
  return true;
});

// --- Host key verification (known_hosts) ---
//
// We persist a {host:port → SHA-256 fingerprint} map next to the rest of the
// userData. On every connect, ssh2's hostVerifier callback hands us the
// presented public key:
//   * unknown host           → ask the renderer; on accept, save fingerprint
//   * known host, match      → silently accept
//   * known host, mismatch   → ask renderer with a "key changed" warning
//                              (potential MITM). User has to explicitly
//                              accept the new key to overwrite.
// Without this we used to accept any host key blindly — trivial MITM.

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
  // SHA-256 base64, OpenSSH-style (strip trailing '=').
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
      // 8 s × 3 misses = ~24 s before ssh2 declares the link dead. Was 30 s
      // with default count (3) = ~90 s, which left the UI showing "online"
      // long after the network actually dropped.
      keepaliveInterval: 8000,
      keepaliveCountMax: 3,
      // ssh2 hostVerifier — async form so we can prompt the renderer.
      hostVerifier: (key, callback) => {
        const buf = Buffer.isBuffer(key) ? key : Buffer.from(key);
        const fp = fingerprintFor(buf);
        const known = loadKnownHosts();
        const stored = known[hostKey];
        if (stored && stored.fingerprint === fp) return callback(true);
        // Prompt the renderer. The verify response IPC resolves p.cb.
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
          // No window to ask — refuse to silently auto-trust on first
          // connect, that's the whole point of the verifier.
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

// One-shot command runner over the existing SSH connection. Used by the
// monitor tab to poll /proc, df, docker stats, etc. without spawning a new
// session. Rejects on non-zero exit only if there's no stdout — many tools
// exit non-zero with useful partial output (e.g., df with permission denied
// on some mounts), which we still want to show.
ipcMain.handle('ssh:exec', (_e, { sessionId, cmd, timeoutMs }) => {
  return new Promise((resolve, reject) => {
    const s = sessions.get(sessionId);
    if (!s) return reject(new Error('No active session'));
    s.conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '', errOut = '', done = false;
      const finish = (payload) => {
        if (done) return;
        done = true;
        resolve(payload);
      };
      const killTimer = setTimeout(() => {
        if (!done) { try { stream.close(); } catch (_) {} finish({ stdout: out, stderr: errOut, code: -1, timedOut: true }); }
      }, timeoutMs || 8000);
      stream.on('data', d => { out += d.toString('utf-8'); });
      stream.stderr.on('data', d => { errOut += d.toString('utf-8'); });
      stream.on('close', (code) => {
        clearTimeout(killTimer);
        finish({ stdout: out, stderr: errOut, code: code == null ? 0 : code, timedOut: false });
      });
    });
  });
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
      // ssh2 returns code 4 ("Failure") for "already exists" on most servers;
      // treat any "already there" as success by stat-ing afterwards.
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

// Whole-file read/write for the file editor. Capped at 5 MB so a misclick on
// a giant log doesn't pull the renderer into an OOM. ssh2 sftp.readFile
// returns a Buffer; we decode UTF-8 here (the editor is text-only).
ipcMain.handle('sftp:readFile', async (_e, { sessionId, path: p, maxBytes }) => {
  const sftp = await getSftp(sessionId);
  const limit = maxBytes || 5 * 1024 * 1024;
  const stat = await new Promise((res, rej) => sftp.stat(p, (e, s) => e ? rej(e) : res(s)));
  if (stat.size > limit) throw new Error(`File too large (${stat.size} bytes; limit ${limit})`);
  const buf = await new Promise((res, rej) => sftp.readFile(p, (e, b) => e ? rej(e) : res(b)));
  return { content: buf.toString('utf-8'), size: stat.size, mtime: stat.mtime };
});

ipcMain.handle('sftp:writeFile', async (_e, { sessionId, path: p, content }) => {
  const sftp = await getSftp(sessionId);
  await new Promise((res, rej) => sftp.writeFile(p, Buffer.from(content, 'utf-8'), e => e ? rej(e) : res()));
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
