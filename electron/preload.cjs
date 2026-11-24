const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('kairotecDesktop', {
  isDesktop: true,
  onUpdateReady: cb => ipcRenderer.on('kairotec:update-ready', (_e, v) => cb(v)),
  restart: () => ipcRenderer.send('kairotec:restart'),
})
