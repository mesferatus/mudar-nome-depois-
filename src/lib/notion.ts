import JSZip from 'jszip'
import type { Note, Prop } from './types'
import { newDbSchema } from './dbschema'

/*
 * Trazer páginas do Notion para o caderno.
 *  1) Pelo arquivo exportado (Configurações → Exportar → Markdown & CSV) — funciona em qualquer lugar.
 *  2) Direto pela API com um token de integração — só no app de desktop (o navegador bloqueia).
 */
type NewNote = Partial<Note> & { id: string; title: string }
const uidN = () => 'nt' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)

// ---------------- texto rico do Notion → markdown do Kairotec ----------------
type RT = { plain_text: string; href?: string | null; annotations?: { bold?: boolean; italic?: boolean; strikethrough?: boolean; code?: boolean; color?: string } }
const COLOR: Record<string, string> = { red: 'vermelho', orange: 'laranja', yellow: 'laranja', green: 'verde', blue: 'azul', purple: 'roxo', pink: 'rosa' }
export function rich(rt: RT[] = []): string {
  return rt.map(r => {
    let t = r.plain_text
    const a = r.annotations ?? {}
    if (!t) return ''
    if (a.code) t = '`' + t + '`'
    if (a.bold) t = `**${t}**`
    if (a.italic) t = `*${t}*`
    if (a.strikethrough) t = `~~${t}~~`
    const c = a.color && a.color !== 'default' ? a.color.replace('_background', '') : ''
    if (a.color?.endsWith('_background')) t = `==${t}==`
    else if (COLOR[c]) t = `{${COLOR[c]}:${t}}`
    if (r.href && !a.code) t = `${t} (${r.href})`
    return t
  }).join('')
}

/** Um bloco da API do Notion vira uma ou mais linhas de markdown. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function blockToMd(b: any, childText = ''): string {
  const v = b[b.type] ?? {}
  const t = rich(v.rich_text)
  switch (b.type) {
    case 'paragraph': return t
    case 'heading_1': return `# ${t}`
    case 'heading_2': return `## ${t}`
    case 'heading_3': return `### ${t}`
    case 'bulleted_list_item': return `- ${t}`
    case 'numbered_list_item': return `1. ${t}`
    case 'to_do': return `- [${v.checked ? 'x' : ' '}] ${t}`
    case 'quote': return `> ${t}`
    case 'callout': return `> ${v.icon?.emoji ?? '💡'} ${t}`
    case 'divider': return '---'
    case 'code': return '```\n' + (v.rich_text ?? []).map((r: RT) => r.plain_text).join('') + '\n```'
    case 'toggle': return `<details><summary>${t}</summary>\n${childText}\n</details>`
    case 'image': { const url = v.type === 'external' ? v.external?.url : v.file?.url; return url ? `![${rich(v.caption)}](${url})` : '' }
    case 'bookmark': case 'embed': case 'link_preview': return v.url ?? ''
    case 'equation': return '`' + (v.expression ?? '') + '`'
    case 'table_row': return '| ' + (v.cells ?? []).map((c: RT[]) => rich(c)).join(' | ') + ' |'
    default: return t
  }
}

// ---------------- 1) Arquivo exportado (.zip) ----------------
const cleanName = (s: string) => decodeURIComponent(s).replace(/\.(md|csv)$/i, '').replace(/\s+[0-9a-f]{32}$/i, '').replace(/\s+[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i, '').trim()

/** Converte o .zip exportado do Notion em páginas (e bancos de dados a partir dos CSV). */
export async function importNotionZip(file: Blob): Promise<NewNote[]> {
  let zip = await JSZip.loadAsync(file)
  // O Notion às vezes coloca outro .zip dentro do .zip
  const inner = Object.values(zip.files).find(f => /\.zip$/i.test(f.name))
  if (inner && !Object.values(zip.files).some(f => /\.md$/i.test(f.name))) zip = await JSZip.loadAsync(await inner.async('blob'))
  const out: NewNote[] = [], byPath = new Map<string, string>(), dbRows = new Map<string, Map<string, NewNote>>()
  const files = Object.values(zip.files).filter(f => !f.dir && /\.(md|csv)$/i.test(f.name) && !/_all\.csv$/i.test(f.name)).sort((a, b) => a.name.split('/').length - b.name.split('/').length)
  for (const f of files) {
    const parts = f.name.split('/'), base = parts.pop()!, title = cleanName(base)
    const parentKey = parts.join('/'), parentId = byPath.get(parentKey)
    const id = uidN(); byPath.set([...parts, base.replace(/\.(md|csv)$/i, '')].join('/'), id)
    const text = await f.async('string')
    if (/\.csv$/i.test(base)) {
      const { rows, ...db } = csvToDb(text, title)
      out.push({ ...db, id, parentId })
      const m = new Map<string, NewNote>(); dbRows.set(id, m)
      for (const r of rows) { const row: NewNote = { id: uidN(), parentId: id, title: r.title, icon: '📄', body: '', folder: 'Notion', tags: ['notion'], props: r.props }; out.push(row); m.set(r.title, row) }
      continue
    }
    const lines = text.replace(/\r/g, '').split('\n')
    if (/^#\s/.test(lines[0] ?? '')) lines.shift()
    // linhas "Propriedade: valor" logo abaixo do título (páginas de banco de dados)
    if (parentId && dbRows.has(parentId)) { while (lines.length && (/^[^:\n]{1,40}: /.test(lines[0]) || !lines[0].trim())) lines.shift() }
    const body = lines.join('\n').replace(/\[([^\]]+)\]\(([^)]+?\.md)\)/g, (_, txt) => `[[${txt}]]`).replace(/^\n+/, '')
    const row = parentId ? dbRows.get(parentId)?.get(title) : undefined
    if (row) { row.body = body; byPath.set([...parts, base.replace(/\.md$/i, '')].join('/'), row.id); continue }
    out.push({ id, parentId, title, icon: '📄', body, folder: 'Notion', tags: ['notion'] })
  }
  return out
}

export function csvToDb(csv: string, title: string) {
  const all = parseCsv(csv.replace(/^\uFEFF/, ''))
  const head = all.shift() ?? ['Nome']
  const props: Prop[] = head.slice(1).map((h, i) => ({ id: 'c' + i, name: h || `Coluna ${i + 1}`, type: 'text' }))
  return {
    title, icon: '🗂️', body: '', folder: 'Notion', tags: ['notion'], db: { ...newDbSchema(), props },
    rows: all.filter(r => r.some(Boolean)).map(r => ({ title: r[0] ?? '', props: Object.fromEntries(props.map((p, i) => [p.id, r[i + 1] || undefined])) as Note['props'] })),
  }
}

export function parseCsv(s: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cur = '', q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) { if (c === '"' && s[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur); out.push(row); row = []; cur = '' }
    else if (c !== '\r') cur += c
  }
  if (cur || row.length) { row.push(cur); out.push(row) }
  return out
}

// ---------------- 2) API do Notion (app de desktop) ----------------
type Fetcher = (url: string, init?: { method?: string; body?: string }) => Promise<{ ok: boolean; status: number; text: string }>

export async function importNotionApi(fetcher: Fetcher, onProgress?: (n: number) => void): Promise<NewNote[]> {
  const call = async (path: string, body?: unknown) => {
    const r = await fetcher('https://api.notion.com/v1' + path, { method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined })
    if (r.status === 401) throw new Error('Token do Notion inválido')
    if (!r.ok) throw new Error(`Notion respondeu ${r.status}`)
    return JSON.parse(r.text)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children = async (id: string): Promise<any[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all: any[] = []; let cursor: string | undefined
    do { const r = await call(`/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`); all.push(...r.results); cursor = r.has_more ? r.next_cursor : undefined } while (cursor)
    return all
  }
  const out: NewNote[] = [], seen = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const titleOf = (p: any) => { const t = Object.values(p.properties ?? {}).find((x: any) => x.type === 'title') as any; return rich(t?.title) || p.title?.[0]?.plain_text || 'Sem título' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iconOf = (p: any) => p.icon?.emoji ?? '📄'

  const pageMd = async (id: string, parentId: string): Promise<string> => {
    const lines: string[] = []
    for (const b of await children(id)) {
      if (b.type === 'child_page') { const sub = await addPage({ id: b.id, properties: { title: { type: 'title', title: [{ plain_text: b.child_page.title }] } } }, parentId); lines.push(`[[${sub}]]`); continue }
      if (b.type === 'child_database') { const dbId = await addDb(b.id, b.child_database.title, parentId); if (dbId) lines.push(`@banco(${dbId})`); continue }
      const inner = b.has_children && b.type !== 'child_page' ? (await pageMd(b.id, parentId)) : ''
      lines.push(blockToMd(b, inner))
      if (inner && b.type !== 'toggle') lines.push(inner.split('\n').map(l => l).join('\n'))
    }
    return lines.join('\n')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addPage = async (p: any, parentId?: string, props?: Note['props']): Promise<string> => {
    const title = titleOf(p)
    if (seen.has(p.id)) return title
    seen.add(p.id); const id = uidN()
    const note: NewNote = { id, parentId, title, icon: iconOf(p), body: '', folder: 'Notion', tags: ['notion'], props }
    out.push(note); onProgress?.(out.length)
    note.body = await pageMd(p.id, id)
    return title
  }
  const addDb = async (dbNotionId: string, title: string, parentId?: string) => {
    if (seen.has(dbNotionId)) return undefined
    seen.add(dbNotionId)
    const meta = await call(`/databases/${dbNotionId}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props: Prop[] = Object.entries(meta.properties ?? {}).filter(([, v]: any) => v.type !== 'title').map(([name, v]: any) => ({
      id: v.id.replace(/[^\w]/g, '') || name, name,
      type: v.type === 'number' ? 'number' : v.type === 'checkbox' ? 'checkbox' : v.type === 'date' ? 'date' : ['select', 'status', 'multi_select'].includes(v.type) ? 'select' : 'text',
      ...(['select', 'status', 'multi_select'].includes(v.type) ? { options: (v[v.type]?.options ?? []).map((o: { name: string }, i: number) => ({ name: o.name, color: ['#e6a87c', '#b9c7e8', '#9fcf9a', '#f0a6ca', '#f0c27a', '#c9a7ff'][i % 6] })) } : {}),
    }))
    const id = uidN()
    out.push({ id, parentId, title: title || 'Banco de dados', icon: meta.icon?.emoji ?? '🗂️', body: '', folder: 'Notion', tags: ['notion'], db: { ...newDbSchema(), props } })
    let cursor: string | undefined
    do {
      const r = await call(`/databases/${dbNotionId}/query`, { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
      for (const row of r.results) {
        const values: Note['props'] = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [name, v] of Object.entries(row.properties) as [string, any][]) {
          const pr = props.find(x => x.name === name); if (!pr) continue
          values[pr.id] = v.type === 'number' ? v.number ?? undefined : v.type === 'checkbox' ? v.checkbox : v.type === 'date' ? v.date?.start?.slice(0, 10) : v.type === 'select' ? v.select?.name : v.type === 'status' ? v.status?.name : v.type === 'multi_select' ? v.multi_select?.[0]?.name : rich(v.rich_text ?? v.title) || undefined
        }
        await addPage(row, id, values)
      }
      cursor = r.has_more ? r.next_cursor : undefined
    } while (cursor && out.length < 1000)
    return id
  }

  let cursor: string | undefined
  do {
    const r = await call('/search', { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
    for (const item of r.results) {
      // só itens no topo (os filhos entram pela recursão)
      if (item.parent?.type === 'page_id' || item.parent?.type === 'database_id' || item.parent?.type === 'block_id') continue
      if (item.object === 'database') await addDb(item.id, rich(item.title))
      else await addPage(item)
      if (out.length >= 1000) break
    }
    cursor = r.has_more ? r.next_cursor : undefined
  } while (cursor && out.length < 1000)
  return out
}
