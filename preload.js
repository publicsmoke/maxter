const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    save: (servers) => ipcRenderer.invoke('servers:save', servers),
  },
  auth: {
    status: () => ipcRenderer.invoke('auth:status'),
    setPin: (opts) => ipcRenderer.invoke('auth:setPin', opts),
    verify: (opts) => ipcRenderer.invoke('auth:verify', opts),
    reset: () => ipcRenderer.invoke('auth:reset'),
  },
  ssh: {
    connect: (opts) => ipcRenderer.invoke('ssh:connect', opts),
    write: (opts) => ipcRenderer.invoke('ssh:write', opts),
    resize: (opts) => ipcRenderer.invoke('ssh:resize', opts),
    disconnect: (opts) => ipcRenderer.invoke('ssh:disconnect', opts),
    onData: (sessionId, cb) => {
      const ch = `ssh:data:${sessionId}`;
      const handler = (_e, data) => cb(data);
      ipcRenderer.on(ch, handler);
      return () => ipcRenderer.removeListener(ch, handler);
    },
    onClose: (sessionId, cb) => {
      const ch = `ssh:close:${sessionId}`;
      const handler = () => cb();
      ipcRenderer.on(ch, handler);
      return () => ipcRenderer.removeListener(ch, handler);
    },
    onError: (sessionId, cb) => {
      const ch = `ssh:error:${sessionId}`;
      const handler = (_e, msg) => cb(msg);
      ipcRenderer.on(ch, handler);
      return () => ipcRenderer.removeListener(ch, handler);
    },
  },
  sftp: {
    list: (opts) => ipcRenderer.invoke('sftp:list', opts),
    realpath: (opts) => ipcRenderer.invoke('sftp:realpath', opts),
    mkdir: (opts) => ipcRenderer.invoke('sftp:mkdir', opts),
    delete: (opts) => ipcRenderer.invoke('sftp:delete', opts),
    rename: (opts) => ipcRenderer.invoke('sftp:rename', opts),
    download: (opts) => ipcRenderer.invoke('sftp:download', opts),
    upload: (opts) => ipcRenderer.invoke('sftp:upload', opts),
    sendFile: (opts) => ipcRenderer.invoke('sftp:sendFile', opts),
    getFile: (opts) => ipcRenderer.invoke('sftp:getFile', opts),
    sendDir: (opts) => ipcRenderer.invoke('sftp:sendDir', opts),
    getDir: (opts) => ipcRenderer.invoke('sftp:getDir', opts),
    exists: (opts) => ipcRenderer.invoke('sftp:exists', opts),
  },
  local: {
    home: () => ipcRenderer.invoke('local:home'),
    list: (opts) => ipcRenderer.invoke('local:list', opts),
    mkdir: (opts) => ipcRenderer.invoke('local:mkdir', opts),
    rename: (opts) => ipcRenderer.invoke('local:rename', opts),
    delete: (opts) => ipcRenderer.invoke('local:delete', opts),
    exists: (opts) => ipcRenderer.invoke('local:exists', opts),
  },
  dialog: {
    pickKey: () => ipcRenderer.invoke('dialog:pickKey'),
  },
  dock: {
    setIcon: (dataUrl) => ipcRenderer.invoke('dock:setIcon', dataUrl),
  },
});
