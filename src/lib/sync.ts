import type { Data } from './types'
import { kvGet, kvSet, kvDel } from './idb'
import { buildWorkbook } from './excel'

/*
 * "Nuvem" sem servidor: o app grava um arquivo .json (dados completos) e um .xlsx
 * (planilha formatada) em arquivos que você escolhe — coloque-os numa pasta do
 * OneDrive / SharePoint / Google Drive e o cliente de sincronização cuida do resto.
 * Usa a File System Access API (Edge / Chrome).
 */
export type SyncState = { cloudName?: string; excelName?: string; status: 'idle' | 'saving' | 'saved' | 'error'; lastSaved?: string; error?: string; cloudSync?: 'ok' | 'erro' }

type Handle = FileSystemFileHandle & {
  queryPermission?: (o: { mode: string }) => Promise<PermissionState>
  requestPermission?: (o: { mode: string }) => Promise<PermissionState>
}
type W = Window & {
  showSaveFilePicker?: (o: unknown) => Promise<Handle>
  showOpenFilePicker?: (o: unknown) => Promise<Handle[]>
}
const w = window as W
export const fsSupported = () => typeof w.showSaveFilePicker === 'function'

let cloud: Handle | undefined, excel: Handle | undefined
export async function loadHandles() {
  try { cloud = await kvGet<Handle>('cloud'); excel = await kvGet<Handle>('excel') } catch { /* ignore */ }
  return { cloud, excel }
}

async function ensurePerm(h: Handle, ask = false) {
  if (!h.queryPermission) return true
  if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  if (ask && h.requestPermission) return (await h.requestPermission({ mode: 'readwrite' })) === 'granted'
  return false
}

async function write(h: Handle, blob: Blob) {
  const s = await h.createWritable(); await s.write(blob); await s.close()
}

export async function pickCloud(mode: 'new' | 'open') {
  const types = [{ description: 'Dados Kairotec', accept: { 'application/json': ['.json'] } }]
  const h = mode === 'new'
    ? await w.showSaveFilePicker!({ suggestedName: 'kairotec-dados.json', types })
    : (await w.showOpenFilePicker!({ types, multiple: false }))[0]
  await ensurePerm(h, true); cloud = h; await kvSet('cloud', h); return h
}
export async function readCloud(): Promise<Data | undefined> {
  if (!cloud || !(await ensurePerm(cloud, true))) return
  const txt = await (await cloud.getFile()).text()
  return txt.trim() ? JSON.parse(txt) : undefined
}
export async function pickExcel() {
  const h = await w.showSaveFilePicker!({ suggestedName: 'Kairotec-Planner.xlsx', types: [{ description: 'Planilha Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }] })
  await ensurePerm(h, true); excel = h; await kvSet('excel', h); return h
}
export async function forget(which: 'cloud' | 'excel') { await kvDel(which); if (which === 'cloud') cloud = undefined; else excel = undefined }
export async function regrant() { if (cloud) await ensurePerm(cloud, true); if (excel) await ensurePerm(excel, true) }

export async function syncAll(d: Data): Promise<{ error?: string }> {
  try {
    if (cloud && d.settings.autoCloud && (await ensurePerm(cloud))) await write(cloud, new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }))
    if (excel && d.settings.autoExcel && (await ensurePerm(excel))) await write(excel, await buildWorkbook(d))
    return {}
  } catch (e) {
    const msg = (e as Error).message
    return { error: /lock|in use|NoModification/i.test(msg) ? 'A planilha está aberta no Excel — feche para atualizar.' : msg }
  }
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
