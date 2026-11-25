import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import '@blocknote/mantine/style.css'
import { BlockNoteSchema, combineByGroup, filterSuggestionItems } from '@blocknote/core'
import * as locales from '@blocknote/core/locales'
import { createReactBlockSpec, getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { getMultiColumnSlashMenuItems, locales as colLocales, multiColumnDropCursor, withMultiColumn } from '@blocknote/xl-multi-column'
import { bnToMd, mdToBn, PAGE_HREF, type BnBlock } from '../lib/bn'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Hooks = { onLink: (title: string) => void; renderDb: (id: string) => ReactNode; page: (id: string) => { title: string; icon?: string; open: () => void } | undefined }
// os blocos personalizados são renderizados fora da árvore normal; pegam as funções por aqui
const hooks: { current: Hooks } = { current: { onLink: () => {}, renderDb: () => null, page: () => undefined } }

const ICONS = ['💡', '📌', '⚠️', '✅', '🔥', '🌙', '🍓', '☕', '📎', '✨']
const Callout = createReactBlockSpec(
  { type: 'callout', propSchema: { icon: { default: '💡' } }, content: 'inline' },
  { render: ({ block, editor, contentRef }) => <div className="bn-callout">
    <button contentEditable={false} className="bn-callout-i" title="Trocar ícone"
      onClick={() => editor.updateBlock(block, { props: { icon: ICONS[(ICONS.indexOf(block.props.icon) + 1) % ICONS.length] } } as any)}>{block.props.icon}</button>
    <div className="bn-callout-c" ref={contentRef} />
  </div> },
)
const PageLink = createReactBlockSpec(
  { type: 'pageLink', propSchema: { title: { default: '' }, pageId: { default: '' } }, content: 'none' },
  { render: ({ block }) => { const p = block.props.pageId ? hooks.current.page(block.props.pageId) : undefined
    return <button contentEditable={false} className="bn-page" onClick={() => p ? p.open() : hooks.current.onLink(block.props.title)}>{p?.icon ?? '📄'} <u>{p?.title || block.props.title || 'Página'}</u> <span className="muted">↗</span></button> } },
)
const DatabaseBlock = createReactBlockSpec(
  { type: 'database', propSchema: { dbId: { default: '' } }, content: 'none' },
  { render: ({ block }) => <div className="bn-db" contentEditable={false}>{hooks.current.renderDb(block.props.dbId) ?? <span className="muted">Banco de dados removido</span>}</div> },
)

const base = BlockNoteSchema.create()
const schema = withMultiColumn(BlockNoteSchema.create({ blockSpecs: { ...base.blockSpecs, callout: Callout(), pageLink: PageLink(), database: DatabaseBlock() } }))

const dark = () => getComputedStyle(document.documentElement).colorScheme.includes('dark')
const readFile = (f: File) => new Promise<string>((ok, bad) => {
  if (f.size > 2.5e6) return bad(new Error('Imagem grande demais (máx. 2,5 MB)'))
  const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => bad(r.error); r.readAsDataURL(f)
})

/** Editor de página estilo Notion (BlockNote): arrastar blocos, /comandos, colunas, tabelas, toggles e mais. */
export function NotionEditor({ doc, body, onChange, onLink, renderDb, onCreate, page }: {
  doc?: unknown[]; body: string
  onChange: (doc: unknown[], md: string) => void
  onLink: (title: string) => void
  renderDb: (id: string) => ReactNode
  page: Hooks['page']
  onCreate: (kind: 'page' | 'database' | 'dbview') => string
}) {
  hooks.current = { onLink, renderDb, page }
  const initial = useMemo(() => (doc?.length ? doc : mdToBn(body)) as any[], []) // eslint-disable-line react-hooks/exhaustive-deps
  const editor = useCreateBlockNote({
    schema, initialContent: initial, dropCursor: multiColumnDropCursor as any, uploadFile: readFile,
    dictionary: { ...locales.pt, multi_column: colLocales.pt } as any,
  })
  const [isDark, setDark] = useState(dark)
  useEffect(() => { const o = new MutationObserver(() => setDark(dark())); o.observe(document.documentElement, { attributes: true }); return () => o.disconnect() }, [])
  const wrap = useRef<HTMLDivElement>(null)

  const custom = (ed: typeof editor) => {
    const insert = (b: BnBlock) => { const cur = ed.getTextCursorPosition().block; ed.insertBlocks([b as any], cur, 'after'); if (!(cur.content as any[])?.length && cur.type === 'paragraph') ed.removeBlocks([cur]) }
    return [
      { title: 'Página', subtext: 'Subpágina dentro desta', aliases: ['pagina', 'subpagina', 'page'], group: 'Kairotec', icon: <span>📄</span>,
        onItemClick: () => { const id = onCreate('page'); insert({ type: 'pageLink', props: { pageId: id, title: page(id)?.title ?? 'Nova página' } }) } },
      { title: 'Banco de dados', subtext: 'Tabela, quadro e galeria aqui na página', aliases: ['banco', 'database', 'tabela', 'db'], group: 'Kairotec', icon: <span>🗂️</span>,
        onItemClick: () => insert({ type: 'database', props: { dbId: onCreate('dbview') } }) },
      { title: 'Destaque', subtext: 'Caixa com ícone (callout)', aliases: ['callout', 'destaque', 'aviso'], group: 'Kairotec', icon: <span>💡</span>,
        onItemClick: () => insert({ type: 'callout', props: { icon: '💡' }, content: [] as any }) },
    ]
  }

  return <div ref={wrap} className="bn-wrap" onClick={e => {
    const a = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
    const href = a?.getAttribute('href') ?? ''
    if (href.startsWith(PAGE_HREF)) { e.preventDefault(); onLink(decodeURIComponent(href.slice(PAGE_HREF.length))) }
  }}>
    <BlockNoteView editor={editor} theme={isDark ? 'dark' : 'light'} slashMenu={false}
      onChange={() => { const d = editor.document as unknown as BnBlock[]; onChange(d, bnToMd(d)) }}>
      <SuggestionMenuController triggerCharacter="/" getItems={async q => filterSuggestionItems(
        combineByGroup(getDefaultReactSlashMenuItems(editor), getMultiColumnSlashMenuItems(editor), custom(editor) as any), q)} />
    </BlockNoteView>
  </div>
}
