import type { Data } from './types'

/*
 * Sincronização entre aparelhos usando um Gist secreto da sua conta do GitHub.
 * O token fica só neste aparelho (nunca vai para backup, Excel ou OneDrive).
 */
const K_TOKEN = 'kairotec:sync-token', K_GIST = 'kairotec:sync-gist', K_BASE = 'kairotec:sync-base'
const FILE = 'kairotec-dados.json', API = 'https://api.github.com'

const get = (k: string) => { try { return localStorage.getItem(k) ?? undefined } catch { return undefined } }
const set = (k: string, v?: string) => { try { if (v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* ignore */ } }
export const syncConnected = () => !!get(K_TOKEN) && !!get(K_GIST)

async function gh(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${get(K_TOKEN)}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', ...init.headers } })
  if (r.status === 401) throw new Error('Token inválido ou expirado')
  if (!r.ok) throw new Error(`GitHub respondeu ${r.status}`)
  return r.json()
}

/** Conecta: acha o gist do Kairotec na conta (outro aparelho já criou?) ou cria um novo. */
export async function connectSync(token: string, local: Data): Promise<{ remote?: Data }> {
  set(K_TOKEN, token.trim())
  try {
    const list: { id: string; files: Record<string, unknown> }[] = await gh('/gists?per_page=100')
    const found = list.find(g => g.files[FILE])
    if (found) { set(K_GIST, found.id); return { remote: await pullRaw() } }
    const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Kairotec · dados (não apague)', public: false, files: { [FILE]: { content: JSON.stringify(local) } } }) })
    set(K_GIST, g.id); set(K_BASE, local.updatedAt); return {}
  } catch (e) { set(K_TOKEN); set(K_GIST); throw e }
}
export function disconnectSync() { set(K_TOKEN); set(K_GIST); set(K_BASE) }

async function pullRaw(): Promise<Data | undefined> {
  const g = await gh(`/gists/${get(K_GIST)}`)
  const f = g.files?.[FILE]; if (!f) return
  const txt = f.truncated ? await (await fetch(f.raw_url)).text() : f.content
  return JSON.parse(txt)
}

/** Junta duas versões sem perder nada: itens dos dois lados; se o mesmo item mudou dos dois, vale o local. */
export function mergeData(local: Data, remote: Data): Data {
  const byId = <T extends { id: string }>(a: T[], b: T[]) => { const m = new Map(b.map(x => [x.id, x])); a.forEach(x => m.set(x.id, x)); return [...m.values()] }
  return { ...remote, ...local, projects: byId(local.projects, remote.projects), tasks: byId(local.tasks, remote.tasks), events: byId(local.events, remote.events), notes: byId(local.notes, remote.notes), updatedAt: new Date().toISOString() }
}

/** Busca a versão da nuvem. Devolve os dados a aplicar (ou nada, se o local já está em dia). */
export async function pullSync(local: Data): Promise<Data | undefined> {
  if (!syncConnected()) return
  const remote = await pullRaw(); if (!remote) return
  const base = get(K_BASE) ?? ''
  if (remote.updatedAt <= base || remote.updatedAt === local.updatedAt) return
  set(K_BASE, remote.updatedAt)
  return local.updatedAt > base ? mergeData(local, remote) : remote
}

export async function pushSync(d: Data) {
  if (!syncConnected()) return
  await gh(`/gists/${get(K_GIST)}`, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(d) } } }) })
  set(K_BASE, d.updatedAt)
}
