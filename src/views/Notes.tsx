import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { Btn, Icon, Empty, spring } from '../components/ui'
import { BlockEditor } from '../components/BlockEditor'
import { COVERS, ICONS, coverBg } from '../lib/art'
import { TEMPLATES } from '../lib/blocks'
import type { Note } from '../lib/types'

const tagsOf = (body: string) => [...new Set([...body.matchAll(/(?:^|\s)#([\p{L}\w-]+)/gu)].map(m => m[1]))]

export default function Notes() {
  const { data, upsertNote, removeNote, toast } = useStore()
  const [sel, setSel] = useState<string | undefined>(() => data.notes.find(n => n.pinned)?.id ?? data.notes.find(n => !n.parentId)?.id)
  const [q, setQ] = useState('')
  const [listOpen, setListOpen] = useState(true)
  const [picker, setPicker] = useState<'icon' | 'cover' | 'tpl' | null>(null)
  const note = data.notes.find(n => n.id === sel)

  const open = (id?: string) => { setSel(id); setListOpen(false); setPicker(null) }
  const kids = (id?: string) => data.notes.filter(n => (n.parentId ?? undefined) === id && (id ? true : !n.parentId)).sort((a, b) => a.title.localeCompare(b.title))
  const crumbs = useMemo(() => { const c: Note[] = []; let p = note; while (p?.parentId) { p = data.notes.find(n => n.id === p!.parentId); if (p) c.unshift(p) } return c }, [note, data.notes])
  const backlinks = note ? data.notes.filter(n => n.id !== note.id && n.body.includes(`[[${note.title}]]`)) : []
  const hits = q ? data.notes.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(q.toLowerCase())) : []

  const create = (opts: Partial<Note> = {}) => {
    const n = upsertNote({ title: 'Sem título', icon: '📄', folder: 'Geral', body: '', ...opts })
    if (opts.parentId) upsertNote({ id: opts.parentId, expanded: true })
    open(n.id); return n
  }
  const save = (p: Partial<Note>) => note && upsertNote({ id: note.id, ...p, ...(p.body !== undefined ? { tags: tagsOf(p.body) } : {}) })
  const link = (title: string) => {
    const ex = data.notes.find(n => n.title.toLowerCase() === title.toLowerCase())
    if (ex) open(ex.id); else { create({ title, parentId: note?.id }); toast('Página criada') }
  }

  const Tree = ({ parent, depth }: { parent?: string; depth: number }) => <>
    {kids(parent).map(n => {
      const ch = kids(n.id)
      return <div key={n.id}>
        <div className={`titem ${n.id === sel ? 'on' : ''}`} style={{ paddingLeft: 6 + depth * 14 }} onClick={() => open(n.id)}>
          <button className="tcaret" style={{ visibility: ch.length ? 'visible' : 'hidden' }} onClick={e => { e.stopPropagation(); upsertNote({ id: n.id, expanded: !n.expanded }) }}>
            <motion.span animate={{ rotate: n.expanded ? 90 : 0 }} style={{ display: 'inline-block' }}>▸</motion.span></button>
          <span className="ticon">{n.icon ?? '📄'}</span><span className="tt">{n.title || 'Sem título'}</span>
          <button className="tadd" title="Nova subpágina" onClick={e => { e.stopPropagation(); create({ parentId: n.id }) }}>+</button>
        </div>
        <AnimatePresence initial={false}>{n.expanded && ch.length > 0 && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
          <Tree parent={n.id} depth={depth + 1} /></motion.div>}</AnimatePresence>
      </div>
    })}
  </>

  const favs = data.notes.filter(n => n.pinned)

  return <motion.div className={`notes ${listOpen ? 'show-list' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <aside className="nlist">
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" placeholder="Buscar em tudo…" value={q} onChange={e => setQ(e.target.value)} />
        <Btn variant="icon primary" onClick={() => create()} aria-label="Nova página"><Icon n="plus" /></Btn>
      </div>
      {q ? <div>{hits.length ? hits.map(n => <div key={n.id} className="titem" onClick={() => { open(n.id); setQ('') }}><span className="ticon">{n.icon ?? '📄'}</span><span className="tt">{n.title}</span></div>) : <div className="muted" style={{ padding: 10 }}>Nada encontrado</div>}</div> : <>
        {favs.length > 0 && <><div className="side-sec">Favoritos</div>{favs.map(n => <div key={n.id} className={`titem ${n.id === sel ? 'on' : ''}`} onClick={() => open(n.id)}><span className="tcaret" /><span className="ticon">{n.icon ?? '📄'}</span><span className="tt">{n.title}</span></div>)}</>}
        <div className="side-sec">Páginas</div>
        <Tree depth={0} />
        <button className="titem ghost" onClick={() => setPicker('tpl')}><span className="tcaret" /><span className="ticon">✨</span><span className="tt">Começar de um modelo</span></button>
      </>}
    </aside>

    <div className="neditor">
      <AnimatePresence>{picker === 'tpl' && <motion.div className="tpl-grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>Modelos</h2><Btn variant="ghost icon" onClick={() => setPicker(null)} aria-label="Fechar"><Icon n="x" /></Btn></div>
        <div className="tpls">{TEMPLATES.map((t, i) => <motion.button key={t.id} className="tpl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }} whileHover={{ y: -3 }}
          onClick={() => { create({ title: t.name, icon: t.icon, cover: t.cover, body: t.body }); toast('Página criada a partir do modelo') }}>
          <span className="tpl-c" style={{ background: coverBg(t.cover) }} /><span className="tpl-n">{t.icon} {t.name}</span></motion.button>)}</div>
      </motion.div>}</AnimatePresence>

      {!note && picker !== 'tpl' && <Empty icon="note" text="Nenhuma página aberta" action="Nova página" onAction={() => create()} />}
      <AnimatePresence mode="wait">{note && picker !== 'tpl' && <motion.div key={note.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
        <div className="crumbs">
            <Btn variant="icon mob-only" onClick={() => setListOpen(true)} aria-label="Voltar para a lista"><Icon n="left" /></Btn>
            {crumbs.map(c => <span key={c.id}><button onClick={() => open(c.id)}>{c.icon} {c.title}</button> / </span>)}
            <span className="muted">{note.icon} {note.title}</span>
            <span style={{ flex: 1 }} />
            <Btn variant="ghost icon" title={note.pinned ? 'Remover dos favoritos' : 'Favoritar'} onClick={() => save({ pinned: !note.pinned })} style={{ color: note.pinned ? 'var(--accent)' : undefined }}>{note.pinned ? '★' : '☆'}</Btn>
            <Btn variant="ghost icon" title="Excluir" onClick={() => { const parent = note.parentId; removeNote(note.id); setSel(parent ?? data.notes.find(n => n.id !== note.id && !n.parentId)?.id) }}><Icon n="trash" /></Btn>
          </div>
        {note.cover && <div className="cover" style={{ background: coverBg(note.cover) }}>
          <div className="cover-act"><button onClick={() => setPicker(picker === 'cover' ? null : 'cover')}>Trocar capa</button><button onClick={() => save({ cover: undefined })}>Remover</button></div></div>}
        <div className={`nhead ${note.cover ? 'has-cover' : ''}`}>
          <motion.button className="nicon" whileHover={{ scale: 1.06, rotate: -4 }} whileTap={{ scale: .9 }} onClick={() => setPicker(picker === 'icon' ? null : 'icon')}>{note.icon ?? '📄'}</motion.button>
          <AnimatePresence>{picker === 'icon' && <motion.div className="pick icons" initial={{ opacity: 0, y: -6, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={spring}>
            {ICONS.map(ic => <button key={ic} onClick={() => { save({ icon: ic }); setPicker(null) }}>{ic}</button>)}</motion.div>}</AnimatePresence>
          {!note.cover && <div className="nhover"><button onClick={() => setPicker('cover')}>🖼 Adicionar capa</button></div>}
          <AnimatePresence>{picker === 'cover' && <motion.div className="pick covers" initial={{ opacity: 0, y: -6, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={spring}>
            {COVERS.map(c => <button key={c.id} title={c.name} onClick={() => { save({ cover: c.id }); setPicker(null) }}><span style={{ background: c.bg }} /><small>{c.name}</small></button>)}</motion.div>}</AnimatePresence>
          <input className="ntitle" value={note.title} placeholder="Sem título" onChange={e => save({ title: e.target.value })} />
          {note.tags.length > 0 && <div className="row wrap" style={{ gap: 6, margin: '4px 0 6px' }}>{note.tags.map(t => <span key={t} className="chip">#{t}</span>)}</div>}
        </div>
        <BlockEditor key={note.id} value={note.body} onChange={body => save({ body })} onLink={link} />

        <div className="subpages">
          {kids(note.id).map(k => <motion.button key={k.id} className="subpage" whileHover={{ x: 3 }} onClick={() => open(k.id)}><span>{k.icon ?? '📄'}</span>{k.title}</motion.button>)}
          <button className="subpage ghost" onClick={() => create({ parentId: note.id })}><span>＋</span>Subpágina</button>
        </div>
        {backlinks.length > 0 && <div className="backlinks"><div className="side-sec" style={{ padding: '0 0 8px' }}>Mencionada em</div>
          {backlinks.map(b => <button key={b.id} className="subpage" onClick={() => open(b.id)}><span>{b.icon ?? '📄'}</span>{b.title}</button>)}</div>}
      </motion.div>}</AnimatePresence>
    </div>
  </motion.div>
}
