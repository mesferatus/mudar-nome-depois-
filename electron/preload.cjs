const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('kairotecDesktop', {
  isDesktop: true,
  onUpdateReady: cb => ipcRenderer.on('kairotec:update-ready', (_e, v) => cb(v)),
  restart: () => ipcRenderer.send('kairotec:restart'),
  onQuick: cb => ipcRenderer.on('kairotec:quick', () => cb()),
  prefs: p => ipcRenderer.invoke('kairotec:prefs', p),
  outlook: () => ipcRenderer.invoke('kairotec:outlook'),
  fetch: req => ipcRenderer.invoke('kairotec:fetch', req),
})
