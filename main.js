const { app, BrowserWindow, ipcMain, safeStorage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Client } = require('ssh2');

const CONFIG_DIR = () => app.getPath('userData');
const CONFIG_FILE = () => path.join(CONFIG_DIR(), 'servers.json');

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

app.whenReady().then(createWindow);

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

// --- SSH session ---

ipcMain.handle('ssh:connect', (_e, { sessionId, server, cols, rows }) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const cfg = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 20000,
      keepaliveInterval: 30000,
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
