// Kairotec · app de desktop (Windows)
// - Carrega o app empacotado por um protocolo próprio (app://kairotec)
// - Lembra tamanho/posição da janela, ícone na bandeja, inicia com o Windows
// - Atalho global Ctrl+Alt+K para criar algo de qualquer lugar
// - Lê a agenda do Outlook instalado (sem senha, pelo próprio Windows)
// - Busca APIs sem o bloqueio de navegador (Notion, links .ics) — só HTTPS
// - Atualiza sozinho pelos Releases do GitHub
const { app, BrowserWindow, protocol, net, shell, ipcMain, Menu, Tray, globalShortcut, nativeImage, screen } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { pathToFileURL } = require('node:url')
const { execFile } = require('node:child_process')

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }])
const DIST = path.join(__dirname, '..', 'dist')
const ICON = path.join(__dirname, 'icon.png')
let win, tray, quitting = false

// ---------- preferências do app de desktop ----------
const PREFS = () => path.join(app.getPath('userData'), 'desktop.json')
const readPrefs = () => { try { return JSON.parse(fs.readFileSync(PREFS(), 'utf8')) } catch { return {} } }
const writePrefs = p => { try { fs.writeFileSync(PREFS(), JSON.stringify({ ...readPrefs(), ...p })) } catch { /* ignore */ } }

function boundsOk(b) {
  if (!b) return false
  return screen.getAllDisplays().some(d => b.x >= d.workArea.x - 50 && b.y >= d.workArea.y - 50 && b.x < d.workArea.x + d.workArea.width && b.y < d.workArea.y + d.workArea.height)
}

function createWindow() {
  const p = readPrefs(), b = boundsOk(p.bounds) ? p.bounds : { width: 1440, height: 900 }
  win = new BrowserWindow({
    ...b, minWidth: 900, minHeight: 600,
    backgroundColor: p.bg || '#0b0806', title: 'Kairotec', show: false, icon: ICON,
    titleBarStyle: 'hidden', titleBarOverlay: { color: p.bg || '#0b0806', symbolColor: p.fg || '#fffbff', height: 36 },
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true },
  })
  if (p.maximized) win.maximize()
  win.once('ready-to-show', () => { if (!process.argv.includes('--oculto')) win.show() })
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url) } })
  const save = () => { if (!win.isMaximized() && !win.isMinimized()) writePrefs({ bounds: win.getBounds() }); writePrefs({ maximized: win.isMaximized() }) }
  win.on('resize', save); win.on('move', save)
  win.on('close', e => { if (!quitting && readPrefs().tray !== false) { e.preventDefault(); win.hide() } })
  win.loadURL('app://kairotec/')
}
const show = () => { if (!win) return; if (win.isMinimized()) win.restore(); win.show(); win.focus() }

if (!app.requestSingleInstanceLock()) app.quit()
else app.on('second-instance', show)

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
  setupTray()
  globalShortcut.register('Control+Alt+K', () => { show(); win.webContents.send('kairotec:quick') })
  setupUpdates()
})
app.on('before-quit', () => { quitting = true })
app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => app.quit())

function setupTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }))
  tray.setToolTip('Kairotec')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir Kairotec', click: show },
    { label: 'Nova tarefa… (Ctrl+Alt+K)', click: () => { show(); win.webContents.send('kairotec:quick') } },
    { type: 'separator' },
    { label: 'Sair', click: () => { quitting = true; app.quit() } },
  ]))
  tray.on('click', show)
}

// ---------- integrações chamadas pela interface ----------
ipcMain.handle('kairotec:prefs', (_e, p) => {
  if (p) {
    writePrefs(p)
    if ('startup' in p) app.setLoginItemSettings({ openAtLogin: !!p.startup, args: ['--oculto'] })
    if (p.bg && win) { try { win.setTitleBarOverlay({ color: p.bg, symbolColor: p.fg }); win.setBackgroundColor(p.bg) } catch { /* ignore */ } }
  }
  return { ...readPrefs(), startup: app.getLoginItemSettings().openAtLogin, version: app.getVersion() }
})

// Agenda do Outlook (Outlook clássico instalado). Lê de 7 dias atrás até 90 dias à frente, incluindo séries.
const PS_OUTLOOK = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
try { $ol = [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application') } catch { $ol = New-Object -ComObject Outlook.Application }
$cal = $ol.GetNamespace('MAPI').GetDefaultFolder(9)
$items = $cal.Items; $items.IncludeRecurrences = $true; $items.Sort('[Start]')
$from = (Get-Date).Date.AddDays(-7); $to = (Get-Date).Date.AddDays(90)
$f = "[Start] >= '" + $from.ToString('g') + "' AND [Start] <= '" + $to.ToString('g') + "'"
$out = New-Object System.Collections.ArrayList
foreach ($i in $items.Restrict($f)) {
  if ($out.Count -ge 1500) { break }
  [void]$out.Add([pscustomobject]@{ id = [string]$i.GlobalAppointmentID; subject = [string]$i.Subject; start = $i.Start.ToString('yyyy-MM-ddTHH:mm'); end = $i.End.ToString('yyyy-MM-ddTHH:mm'); location = [string]$i.Location; allDay = [bool]$i.AllDayEvent; busy = [int]$i.BusyStatus })
}
ConvertTo-Json -InputObject @($out) -Compress -Depth 3
`
ipcMain.handle('kairotec:outlook', () => new Promise(resolve => {
  if (process.platform !== 'win32') return resolve({ ok: false, error: 'Disponível só no Windows com o Outlook instalado.' })
  const enc = Buffer.from(PS_OUTLOOK, 'utf16le').toString('base64')
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', enc], { timeout: 90000, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
    if (err) {
      const msg = String(stderr || err.message)
      return resolve({ ok: false, error: /80040154|ComObject|Outlook\.Application/i.test(msg) ? 'Não encontrei o Outlook clássico neste computador. (O "novo Outlook" não permite leitura direta — use a assinatura de link .ics.)' : msg.slice(0, 300) })
    }
    try { resolve({ ok: true, items: JSON.parse(stdout.trim() || '[]') }) } catch { resolve({ ok: false, error: 'Resposta inesperada do Outlook.' }) }
  })
}))

// Requisições sem o bloqueio de navegador (CORS): Notion, links de calendário (HTTPS) e o Ollama local.
ipcMain.handle('kairotec:fetch', async (_e, { url, method = 'GET', headers = {}, body }) => {
  const local = typeof url === 'string' && /^http:\/\/(localhost|127\.0\.0\.1):11434\//.test(url) // Ollama no próprio PC
  if (typeof url !== 'string' || (!url.startsWith('https://') && !local)) return { ok: false, status: 0, text: 'Destino não permitido' }
  try {
    const r = await net.fetch(url, { method, headers, body })
    return { ok: r.ok, status: r.status, text: await r.text() }
  } catch (e) { return { ok: false, status: 0, text: String(e.message || e) } }
})

// ---------- atualização automática (GitHub Releases) ----------
function setupUpdates() {
  if (!app.isPackaged) return
  const { autoUpdater } = require('electron-updater')
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-downloaded', info => win?.webContents.send('kairotec:update-ready', info.version))
  ipcMain.on('kairotec:restart', () => { quitting = true; autoUpdater.quitAndInstall() })
  const check = () => autoUpdater.checkForUpdates().catch(() => { /* offline */ })
  check(); setInterval(check, 30 * 60 * 1000)
}
