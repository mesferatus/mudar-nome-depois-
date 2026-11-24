import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { Btn, Icon, Empty, spring } from '../components/ui'
import { BlockEditor } from '../components/BlockEditor'
import { COVERS, ICONS, coverBg } from '../lib/art'
import { TEMPLATES } from '../lib/blocks'
import type { Note } from '../lib/types'
import { Database, PropValue, newDb } from '../components/Database'
import { download } from '../lib/sync'
import { takeNote } from '../lib/nav'

const tagsOf = (body: string) => [...new Set([...body.matchAll(/(?:^|\s)#([\p{L}\w-]+)/gu)].map(m => m[1]))]

export default function Notes() {
  const { data, upsertNote, removeNote, restoreNote, purgeNote, toast } = useStore()
  const [sel, setSel] = useState<string | undefined>(() => takeNote() ?? data.notes.find(n => n.pinned)?.id ?? data.notes.find(n => !n.parentId)?.id)
  const [q, setQ] = useState('')
  const [listOpen, setListOpen] = useState(true)
  const [picker, setPicker] = useState<'icon' | 'cover' | 'tpl' | 'menu' | 'move' | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const note = data.notes.find(n => n.id === sel)

  const open = (id?: string) => { setSel(id); setListOpen(false); setPicker(null) }
  useEffect(() => { const h = (e: Event) => { takeNote(); open((e as CustomEvent<string>).detail) }; window.addEventListener('kairotec:open-note', h); return () => window.removeEventListener('kairotec:open-note', h) }, [])
  const kids = (id?: string) => data.notes.filter(n => !n.trashed && (n.parentId ?? undefined) === id && (id ? true : !n.parentId)).sort((a, b) => a.title.localeCompare(b.title))
  const isDb = (id?: string) => !!data.notes.find(n => n.id === id)?.db
  const parentDb = note?.parentId ? data.notes.find(n => n.id === note.parentId && n.db) : undefined
  const crumbs = useMemo(() => { const c: Note[] = []; let p = note; while (p?.parentId) { p = data.notes.find(n => n.id === p!.parentId); if (p) c.unshift(p) } return c }, [note, data.notes])
  const backlinks = note ? data.notes.filter(n => !n.trashed && n.id !== note.id && n.body.includes(`[[${note.title}]]`)) : []
  const trash = data.notes.filter(n => n.trashed && !data.notes.find(p => p.id === n.parentId)?.trashed)
  const hits = q ? data.notes.filter(n => !n.trashed && (n.title + ' ' + n.body).toLowerCase().includes(q.toLowerCase())) : []

  const create = (opts: Partial<Note> = {}) => {
    const n = upsertNote({ title: 'Sem título', icon: '📄', folder: 'Geral', body: '', ...opts })
    if (opts.parentId) upsertNote({ id: opts.parentId, expanded: true })
    open(n.id); return n
  }
  const newDatabase = (parentId?: string, title = 'Banco de dados') => create({ title, icon: '🗂️', parentId, db: newDb() })
  const duplicate = (n: Note) => { const c = upsertNote({ ...n, id: undefined, title: `${n.title} (cópia)`, pinned: false }); open(c.id); toast('Página duplicada') }
  const exportMd = (n: Note) => { download(new Blob([`# ${n.icon ?? ''} ${n.title}\n\n${n.body}`], { type: 'text/markdown' }), `${n.title || 'pagina'}.md`) }
  const descendants = (id: string): string[] => data.notes.filter(n => n.parentId === id).flatMap(n => [n.id, ...descendants(n.id)])
  const save = (p: Partial<Note>) => note && upsertNote({ id: note.id, ...p, ...(p.body !== undefined ? { tags: tagsOf(p.body) } : {}) })
  const link = (title: string) => {
    const ex = data.notes.find(n => n.title.toLowerCase() === title.toLowerCase())
    if (ex) open(ex.id); else { create({ title, parentId: note?.id }); toast('Página criada') }
  }

  const Tree = ({ parent, depth }: { parent?: string; depth: number }) => <>
    {kids(parent).map(n => {
      const ch = n.db ? [] : kids(n.id)
      return <div key={n.id}>
        <div className={`titem ${n.id === sel ? 'on' : ''}`} style={{ paddingLeft: 6 + depth * 14 }} onClick={() => open(n.id)}>
          <button className="tcaret" style={{ visibility: ch.length ? 'visible' : 'hidden' }} onClick={e => { e.stopPropagation(); upsertNote({ id: n.id, expanded: !n.expanded }) }}>
            <motion.span animate={{ rotate: n.expanded ? 90 : 0 }} style={{ display: 'inline-block' }}>▸</motion.span></button>
          <span className="ticon">{n.icon ?? (n.db ? '🗂️' : '📄')}</span><span className="tt">{n.title || 'Sem título'}</span>
          {!n.db && <button className="tadd" title="Nova subpágina" onClick={e => { e.stopPropagation(); create({ parentId: n.id }) }}>+</button>}
        </div>
        <AnimatePresence initial={false}>{n.expanded && ch.length > 0 && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
          <Tree parent={n.id} depth={depth + 1} /></motion.div>}</AnimatePresence>
      </div>
    })}
  </>

  const favs = data.notes.filter(n => n.pinned && !n.trashed)

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
        <button className="titem ghost" onClick={() => newDatabase()}><span className="tcaret" /><span className="ticon">▦</span><span className="tt">Novo banco de dados</span></button>
        <button className="titem ghost" onClick={() => setTrashOpen(o => !o)}><span className="tcaret" /><span className="ticon">🗑</span><span className="tt">Lixeira {trash.length ? `(${trash.length})` : ''}</span></button>
        <AnimatePresence>{trashOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
          {!trash.length && <div className="muted" style={{ padding: '4px 34px', fontSize: 13 }}>Vazia</div>}
          {trash.map(n => <div key={n.id} className="titem" style={{ paddingLeft: 30 }}><span className="ticon">{n.icon ?? '📄'}</span><span className="tt muted">{n.title || 'Sem título'}</span>
            <button className="tadd" style={{ opacity: 1 }} title="Restaurar" onClick={() => { restoreNote(n.id); toast('Restaurada') }}>↺</button>
            <button className="tadd" style={{ opacity: 1 }} title="Excluir para sempre" onClick={() => purgeNote(n.id)}>✕</button></div>)}
        </motion.div>}</AnimatePresence>
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
      <AnimatePresence mode="wait">{note && !note.trashed && picker !== 'tpl' && <motion.div key={note.id} className={note.wide || note.db ? 'wide' : ''} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
        <div className="crumbs">
            <Btn variant="icon mob-only" onClick={() => setListOpen(true)} aria-label="Voltar para a lista"><Icon n="left" /></Btn>
            {crumbs.map(c => <span key={c.id}><button onClick={() => open(c.id)}>{c.icon} {c.title}</button> / </span>)}
            <span className="muted">{note.icon} {note.title}</span>
            <span style={{ flex: 1 }} />
            <Btn variant="ghost icon" title={note.pinned ? 'Remover dos favoritos' : 'Favoritar'} onClick={() => save({ pinned: !note.pinned })} style={{ color: note.pinned ? 'var(--accent)' : undefined }}>{note.pinned ? '★' : '☆'}</Btn>
            <span className="muted mono" style={{ fontSize: 11 }}>{note.body.split(/\s+/).filter(Boolean).length} palavras · editada {new Date(note.updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <div style={{ position: 'relative' }}><Btn variant="ghost icon" title="Mais" onClick={() => setPicker(picker === 'menu' ? null : 'menu')}>⋯</Btn>
              <AnimatePresence>{(picker === 'menu' || picker === 'move') && <motion.div className="pmenu" initial={{ opacity: 0, y: -6, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={spring}>
                {picker === 'menu' ? <>
                  <button onClick={() => { duplicate(note); setPicker(null) }}>⧉ Duplicar</button>
                  <button onClick={() => setPicker('move')}>↪ Mover para…</button>
                  <button onClick={() => { save({ wide: !note.wide }); setPicker(null) }}>↔ {note.wide ? 'Largura normal' : 'Largura total'}</button>
                  <button onClick={() => { exportMd(note); setPicker(null) }}>⬇ Exportar .md</button>
                  {!note.cover && <button onClick={() => setPicker('cover')}>🖼 Adicionar capa</button>}
                  <button className="danger" onClick={() => { const parent = note.parentId; removeNote(note.id); setPicker(null); setSel(parent ?? data.notes.find(n => n.id !== note.id && !n.parentId && !n.trashed)?.id) }}>🗑 Mover para a lixeira</button>
                </> : <>
                  <div className="slash-t">Mover para</div>
                  <button onClick={() => { save({ parentId: undefined }); setPicker(null); toast('Movida para a raiz') }}>⌂ Raiz do caderno</button>
                  {data.notes.filter(n => !n.trashed && !n.db && n.id !== note.id && n.id !== note.parentId && !descendants(note.id).includes(n.id) && !isDb(n.parentId)).map(n => <button key={n.id} onClick={() => { save({ parentId: n.id }); upsertNote({ id: n.id, expanded: true }); setPicker(null); toast(`Movida para ${n.title}`) }}>{n.icon ?? '📄'} {n.title || 'Sem título'}</button>)}
                </>}
              </motion.div>}</AnimatePresence></div>
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
        {parentDb && <div className="props">{parentDb.db!.props.map(p => <div key={p.id} className="prop-r"><span className="prop-n">{p.name}</span>
          <PropValue prop={p} value={note.props?.[p.id]} onChange={v => save({ props: { ...note.props, [p.id]: v } })} onAddOption={name => upsertNote({ id: parentDb.id, db: { ...parentDb.db!, props: parentDb.db!.props.map(x => x.id === p.id ? { ...x, options: [...(x.options ?? []), { name, color: '#c9a7ff' }] } : x) } })} /></div>)}</div>}
        {note.db ? <Database db={note} open={open} /> :
          <BlockEditor key={note.id} value={note.body} onChange={body => save({ body })} onLink={link} onCreate={kind => {
            const title = kind === 'database' ? 'Banco de dados' : 'Nova página'
            const n = upsertNote({ title, icon: kind === 'database' ? '🗂️' : '📄', parentId: note.id, folder: 'Geral', body: '', ...(kind === 'database' ? { db: newDb() } : {}) })
            upsertNote({ id: note.id, expanded: true }); setTimeout(() => open(n.id), 50); return title
          }} />}

        {!note.db && <div className="subpages">
          {kids(note.id).map(k => <motion.button key={k.id} className="subpage" whileHover={{ x: 3 }} onClick={() => open(k.id)}><span>{k.icon ?? '📄'}</span>{k.title}</motion.button>)}
          <button className="subpage ghost" onClick={() => create({ parentId: note.id })}><span>＋</span>Subpágina</button>
        </div>}
        {backlinks.length > 0 && <div className="backlinks"><div className="side-sec" style={{ padding: '0 0 8px' }}>Mencionada em</div>
          {backlinks.map(b => <button key={b.id} className="subpage" onClick={() => open(b.id)}><span>{b.icon ?? '📄'}</span>{b.title}</button>)}</div>}
      </motion.div>}</AnimatePresence>
    </div>
  </motion.div>
}
