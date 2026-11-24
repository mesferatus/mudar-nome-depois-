// Kairotec · app de desktop (Windows)
// Carrega o app web empacotado por um protocolo próprio (app://kairotec) para manter
// armazenamento local, acesso a arquivos (OneDrive/Excel) e notificações funcionando,
// e se atualiza sozinho pelos Releases do GitHub.
const { app, BrowserWindow, protocol, net, shell, ipcMain, Menu } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }])
const DIST = path.join(__dirname, '..', 'dist')
let win

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    backgroundColor: '#0b0806', title: 'Kairotec', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true },
  })
  win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  win.loadURL('app://kairotec/')
}

if (!app.requestSingleInstanceLock()) app.quit()
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })

app.setAppUserModelId('com.kairotec.app')
app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  protocol.handle('app', req => {
    const p = decodeURIComponent(new URL(req.url).pathname)
    const file = path.join(DIST, p === '/' || !path.extname(p) ? 'index.html' : p)
    if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })
  createWindow()
  setupUpdates()
})
app.on('window-all-closed', () => app.quit())

// ---------- atualização automática (GitHub Releases) ----------
function setupUpdates() {
  if (!app.isPackaged) return
  const { autoUpdater } = require('electron-updater')
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-downloaded', info => win?.webContents.send('kairotec:update-ready', info.version))
  ipcMain.on('kairotec:restart', () => autoUpdater.quitAndInstall())
  const check = () => autoUpdater.checkForUpdates().catch(() => { /* offline */ })
  check(); setInterval(check, 30 * 60 * 1000)
}
