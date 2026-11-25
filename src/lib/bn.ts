/*
 * Ponte entre o editor estilo Notion (BlockNote) e o Markdown do Kairotec.
 * O documento do editor (JSON) é a fonte da verdade da página; o Markdown é
 * gerado junto para busca, backlinks, Excel, assistente e exportação.
 */
import { mdToBlocks, type Block } from './blocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type BnBlock = { id?: string; type: string; props?: Record<string, any>; content?: any; children?: BnBlock[] }
type Inline = { type: 'text'; text: string; styles: Record<string, any> } | { type: 'link'; href: string; content: Inline[] }

export const PAGE_HREF = '#pagina:'
const COLOR_IN: Record<string, string> = { vermelho: 'red', laranja: 'orange', verde: 'green', azul: 'blue', roxo: 'purple', rosa: 'pink' }
const COLOR_OUT = Object.fromEntries(Object.entries(COLOR_IN).map(([k, v]) => [v, k]))

const TOKEN = /`([^`]+)`|\*\*([^*]+)\*\*|~~([^~]+)~~|==([^=]+)==|\{(vermelho|laranja|verde|azul|roxo|rosa):([^}]+)\}|\[\[([^\]]+)\]\]|(https?:\/\/[^\s<]+)|(?<![*\w])\*([^*]+)\*/g

/** Texto com a marcação do Kairotec → conteúdo inline do editor. */
export function mdInline(s: string): Inline[] {
  const out: Inline[] = []
  const t = (text: string, styles: Record<string, any> = {}) => { if (text) out.push({ type: 'text', text, styles }) }
  let last = 0
  for (const m of s.matchAll(TOKEN)) {
    t(s.slice(last, m.index))
    if (m[1]) t(m[1], { code: true })
    else if (m[2]) t(m[2], { bold: true })
    else if (m[3]) t(m[3], { strike: true })
    else if (m[4]) t(m[4], { backgroundColor: 'yellow' })
    else if (m[5]) t(m[6], { textColor: COLOR_IN[m[5]] })
    else if (m[7]) out.push({ type: 'link', href: PAGE_HREF + encodeURIComponent(m[7]), content: [{ type: 'text', text: m[7], styles: {} }] })
    else if (m[8]) out.push({ type: 'link', href: m[8], content: [{ type: 'text', text: m[8], styles: {} }] })
    else if (m[9]) t(m[9], { italic: true })
    last = m.index! + m[0].length
  }
  t(s.slice(last))
  return out
}

/** Conteúdo inline do editor → texto com a marcação do Kairotec. */
export function inlineMd(content: any): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map((c: any) => {
    if (c.type === 'link') {
      const txt = inlineMd(c.content)
      if (typeof c.href === 'string' && c.href.startsWith(PAGE_HREF)) return `[[${decodeURIComponent(c.href.slice(PAGE_HREF.length))}]]`
      return txt === c.href ? c.href : `${txt} (${c.href})`
    }
    if (c.type !== 'text') return c.text ?? ''
    let x: string = c.text ?? ''
    const st = c.styles ?? {}
    if (!x) return ''
    if (st.code) return '`' + x + '`'
    if (st.bold) x = `**${x}**`
    if (st.italic) x = `*${x}*`
    if (st.strike) x = `~~${x}~~`
    if (st.backgroundColor && st.backgroundColor !== 'default') x = `==${x}==`
    if (st.textColor && COLOR_OUT[st.textColor]) x = `{${COLOR_OUT[st.textColor]}:${x}}`
    return x
  }).join('')
}

const one = (b: Block): BnBlock[] => {
  switch (b.type) {
    case 'h1': case 'h2': case 'h3': return [{ type: 'heading', props: { level: +b.type[1] }, content: mdInline(b.text) }]
    case 'bullet': return [{ type: 'bulletListItem', content: mdInline(b.text) }]
    case 'number': return [{ type: 'numberedListItem', content: mdInline(b.text) }]
    case 'todo': return [{ type: 'checkListItem', props: { checked: !!b.checked }, content: mdInline(b.text) }]
    case 'quote': return [{ type: 'quote', content: mdInline(b.text) }]
    case 'callout': return [{ type: 'callout', props: { icon: b.icon ?? '💡' }, content: mdInline(b.text) }]
    case 'divider': return [{ type: 'divider' }]
    case 'code': return [{ type: 'codeBlock', content: b.text }]
    case 'toggle': return [{ type: 'toggleListItem', content: mdInline(b.text), children: mdToBn(b.body ?? '', false) }]
    case 'image': return [{ type: 'image', props: { url: b.text, caption: b.body ?? '' } }]
    case 'dbview': return [{ type: 'database', props: { dbId: b.text } }]
    case 'columns': return [{ type: 'columnList', children: (b.cols ?? ['', '']).map(c => ({ type: 'column', props: { width: 1 }, children: mdToBn(c) })) }]
    default: {
      const m = b.text.match(/^\s*\[\[([^\]]+)\]\]\s*$/)
      if (m) return [{ type: 'pageLink', props: { title: m[1] } }]
      return [{ type: 'paragraph', content: mdInline(b.text) }]
    }
  }
}

/** Markdown do Kairotec → blocos do editor. */
export function mdToBn(md: string, pad = true): BnBlock[] {
  const out = md.trim() ? mdToBlocks(md).flatMap(one) : []
  return out.length || !pad ? out : [{ type: 'paragraph', content: [] }]
}

/** Blocos do editor → Markdown do Kairotec. */
export function bnToMd(bs: BnBlock[], depth = 0): string {
  const pad = '  '.repeat(depth)
  const lines: string[] = []
  let num = 0
  for (const b of bs ?? []) {
    num = b.type === 'numberedListItem' ? num + 1 : 0
    const txt = inlineMd(b.content)
    const p = b.props ?? {}
    let kidsDone = false
    switch (b.type) {
      case 'heading': lines.push(`${'#'.repeat(Math.min(3, p.level ?? 1))} ${txt}`); break
      case 'bulletListItem': lines.push(`${pad}- ${txt}`); break
      case 'numberedListItem': lines.push(`${pad}${num}. ${txt}`); break
      case 'checkListItem': lines.push(`${pad}- [${p.checked ? 'x' : ' '}] ${txt}`); break
      case 'quote': lines.push(`> ${txt}`); break
      case 'callout': lines.push(`> ${p.icon ?? '💡'} ${txt}`); break
      case 'divider': lines.push('---'); break
      case 'codeBlock': lines.push('```\n' + (typeof b.content === 'string' ? b.content : inlineMd(b.content)) + '\n```'); break
      case 'toggleListItem': lines.push(`<details><summary>${txt}</summary>\n${bnToMd(b.children ?? [])}\n</details>`); kidsDone = true; break
      case 'image': lines.push(`![${p.caption ?? ''}](${p.url ?? ''})`); break
      case 'database': lines.push(`@banco(${p.dbId})`); break
      case 'pageLink': lines.push(`[[${p.title}]]`); break
      case 'columnList': lines.push(':::colunas\n' + (b.children ?? []).map(c => bnToMd(c.children ?? [])).join('\n:::coluna\n') + '\n:::'); kidsDone = true; break
      case 'table': {
        const rows: any[] = b.content?.rows ?? []
        rows.forEach((r, i) => {
          lines.push('| ' + (r.cells ?? []).map((c: any) => inlineMd(c?.content ?? c)).join(' | ') + ' |')
          if (i === 0) lines.push('|' + (r.cells ?? []).map(() => ' --- |').join(''))
        })
        break
      }
      default: if (txt || b.type === 'paragraph') lines.push(pad + txt)
    }
    if (!kidsDone && b.children?.length) lines.push(bnToMd(b.children, depth + 1))
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
}
