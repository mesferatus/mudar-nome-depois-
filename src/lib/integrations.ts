import type { CalEvent, Data, Note } from './types'
import { fromOutlook, mergeOutlook } from './outlook'
import { parseIcs } from './ics'
import { importNotionApi } from './notion'

export const isDesktop = () => !!window.kairotecDesktop

/** Lê a agenda do Outlook instalado e devolve os dados atualizados. */
export async function syncOutlook(d: Data): Promise<{ data?: Data; count?: number; error?: string }> {
  const r = await window.kairotecDesktop?.outlook()
  if (!r) return { error: 'Disponível no app de desktop (.exe).' }
  if (!r.ok || !r.items) return { error: r.error ?? 'Falha ao ler o Outlook.' }
  const fresh = fromOutlook(r.items)
  return { data: { ...mergeOutlook(d, fresh, 'outlook'), settings: { ...d.settings, lastOutlookSync: new Date().toISOString() } }, count: fresh.length }
}

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }

/** Assina um link de calendário (.ics) — Outlook "Publicar calendário", Google, etc. */
export async function syncIcsUrl(d: Data, url: string): Promise<{ data?: Data; count?: number; error?: string }> {
  const u = url.trim().replace(/^webcal:\/\//i, 'https://')
  if (!/^https:\/\//i.test(u)) return { error: 'O link precisa começar com https:// ou webcal://' }
  let text: string
  try {
    const r = window.kairotecDesktop ? await window.kairotecDesktop.fetch({ url: u }) : await fetch(u).then(async x => ({ ok: x.ok, status: x.status, text: await x.text() }))
    if (!r.ok) return { error: `O link respondeu ${r.status}` }
    text = r.text
  } catch { return { error: 'Não consegui baixar o link (no navegador, alguns links só funcionam no app de desktop).' } }
  const fresh: CalEvent[] = parseIcs(text).map(e => ({ ...e, id: `ics-${hash(e.title + e.date + e.start)}`, source: 'ics' as const }))
  return { data: mergeOutlook(d, fresh, 'ics'), count: fresh.length }
}

/** Traz páginas e bancos do Notion pela API (token de integração). Só no app de desktop. */
export async function importFromNotionApi(token: string, onProgress?: (n: number) => void): Promise<Note[]> {
  const desk = window.kairotecDesktop
  if (!desk) throw new Error('A conexão direta com o Notion funciona no app de desktop. No navegador, use "Importar arquivo exportado".')
  const headers = { Authorization: `Bearer ${token.trim()}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' }
  const notes = await importNotionApi((url, init) => desk.fetch({ url, method: init?.method, headers, body: init?.body }), onProgress)
  return notes.map(n => ({ folder: 'Notion', tags: ['notion'], body: '', updatedAt: new Date().toISOString(), ...n })) as Note[]
}

/** Junta páginas importadas ao caderno, dentro de uma página "Importado do Notion". */
export function addImported(d: Data, notes: Partial<Note>[], title = 'Importado do Notion'): Data {
  const rootId = 'imp' + Date.now().toString(36)
  const root: Note = { id: rootId, title, icon: '📥', body: `> 📥 ${notes.length} páginas importadas em ${new Date().toLocaleDateString('pt-BR')}`, folder: 'Notion', tags: ['notion'], updatedAt: new Date().toISOString(), expanded: true }
  const now = new Date().toISOString()
  const fixed = notes.map(n => ({ folder: 'Notion', tags: [], body: '', ...n, parentId: n.parentId ?? rootId, updatedAt: now })) as Note[]
  return { ...d, notes: [...d.notes, root, ...fixed], updatedAt: now }
}
