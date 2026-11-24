import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../lib/store'
import { Btn, Icon, Seg } from '../components/ui'
import type { Note } from '../lib/types'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function inline(s: string) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="wl" data-link="$1">$1</span>')
    .replace(/(^|\s)#([\p{L}\w-]+)/gu, '$1<span class="tag">#$2</span>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
}
export function renderMd(md: string) {
  const out: string[] = []; let list = false
  md.split('\n').forEach((l, i) => {
    const task = l.match(/^\s*- \[( |x)\] (.*)/), li = l.match(/^\s*[-*] (.*)/)
    if ((task || li) && !list) { out.push('<ul>'); list = true }
    if (!(task || li) && list) { out.push('</ul>'); list = false }
    if (task) out.push(`<li class="task"><input type="checkbox" data-line="${i}" ${task[1] === 'x' ? 'checked' : ''}/>${inline(task[2])}</li>`)
    else if (li) out.push(`<li>${inline(li[1])}</li>`)
    else if (/^### /.test(l)) out.push(`<h3>${inline(l.slice(4))}</h3>`)
    else if (/^## /.test(l)) out.push(`<h2>${inline(l.slice(3))}</h2>`)
    else if (/^# /.test(l)) out.push(`<h1>${inline(l.slice(2))}</h1>`)
    else if (/^> /.test(l)) out.push(`<blockquote>${inline(l.slice(2))}</blockquote>`)
    else if (l.trim() === '---') out.push('<hr/>')
    else if (l.trim()) out.push(`<p>${inline(l)}</p>`)
  })
  if (list) out.push('</ul>')
  return out.join('')
}
const tagsOf = (body: string) => [...new Set([...body.matchAll(/(?:^|\s)#([\p{L}\w-]+)/gu)].map(m => m[1]))]

export default function Notes() {
  const { data, upsertNote, removeNote, toast } = useStore()
  const [sel, setSel] = useState<string | undefined>(() => data.notes.find(n => n.pinned)?.id ?? data.notes[0]?.id)
  const [mode, setMode] = useState<'ler' | 'editar'>('ler')
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string>()
  const note = data.notes.find(n => n.id === sel)
  const [listOpen, setListOpen] = useState(true)
  const open = (id?: string) => { setSel(id); setListOpen(false) }

  const folders = useMemo(() => {
    const f: Record<string, Note[]> = {}
    data.notes.filter(n => (!q || (n.title + n.body).toLowerCase().includes(q.toLowerCase())) && (!tag || n.tags.includes(tag)))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
      .forEach(n => (f[n.folder] ??= []).push(n))
    return f
  }, [data.notes, q, tag])
  const allTags = [...new Set(data.notes.flatMap(n => n.tags))]
  const backlinks = note ? data.notes.filter(n => n.id !== note.id && n.body.includes(`[[${note.title}]]`)) : []

  const create = (title = 'Nova página', folder = note?.folder ?? 'Geral') => { const n = upsertNote({ title, folder, body: `# ${title}\n\n` }); open(n.id); setMode('editar'); return n }
  const save = (p: Partial<Note>) => note && upsertNote({ id: note.id, ...p, ...(p.body !== undefined ? { tags: tagsOf(p.body) } : {}) })

  const click = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement
    if (el.dataset.link) { const ex = data.notes.find(n => n.title.toLowerCase() === el.dataset.link!.toLowerCase()); if (ex) setSel(ex.id); else { create(el.dataset.link); toast('Página criada') } }
    if (el.tagName === 'INPUT' && el.dataset.line && note) {
      const lines = note.body.split('\n'), i = Number(el.dataset.line)
      lines[i] = lines[i].includes('- [x]') ? lines[i].replace('- [x]', '- [ ]') : lines[i].replace('- [ ]', '- [x]'); save({ body: lines.join('\n') })
    }
  }

  return <motion.div className={`notes ${listOpen ? 'show-list' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="nlist">
      <div className="row" style={{ marginBottom: 10 }}><input className="input" placeholder="Buscar notas…" value={q} onChange={e => setQ(e.target.value)} /><Btn variant="icon primary" onClick={() => create()}><Icon n="plus" /></Btn></div>
      {allTags.length > 0 && <div className="row wrap" style={{ gap: 4, marginBottom: 8 }}>{allTags.map(t => <button key={t} className="chip" style={{ border: 0, cursor: 'pointer', background: tag === t ? 'var(--accent)' : undefined, color: tag === t ? 'var(--accent-ink)' : undefined }} onClick={() => setTag(tag === t ? undefined : t)}>#{t}</button>)}</div>}
      {Object.entries(folders).map(([f, ns]) => <div key={f}>
        <div className="side-sec" style={{ paddingTop: 10 }}>{f}</div>
        {ns.map(n => <div key={n.id} className={`nitem ${n.id === sel ? 'on' : ''}`} onClick={() => open(n.id)}>
          {n.id === sel && <motion.div layoutId="nsel" className="nav-pill" style={{ zIndex: 0 }} />}
          <div style={{ position: 'relative' }}><div className="tt">{n.pinned && '📌 '}{n.title}</div><div className="ss">{new Date(n.updatedAt).toLocaleDateString('pt-BR')} · {n.body.replace(/[#*[\]]/g, '').slice(0, 40)}</div></div>
        </div>)}
      </div>)}
    </div>
    <div className="neditor">
      <AnimatePresence mode="wait">{note ? <motion.div key={note.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <Btn variant="icon mob-only" onClick={() => setListOpen(true)} aria-label="Voltar para a lista"><Icon n="left" /></Btn>
          <input className="input" style={{ width: 160, height: 30 }} value={note.folder} onChange={e => save({ folder: e.target.value })} title="Pasta" />
          <div style={{ flex: 1 }} />
          <Seg value={mode} onChange={setMode} options={[{ v: 'ler', l: 'Ler' }, { v: 'editar', l: 'Editar' }]} />
          <Btn variant="ghost icon" title="Fixar" onClick={() => save({ pinned: !note.pinned })} style={{ color: note.pinned ? 'var(--accent)' : undefined }}><Icon n="pin" /></Btn>
          <Btn variant="ghost icon" title="Excluir" onClick={() => { if (confirm(`Excluir "${note.title}"?`)) { removeNote(note.id); setSel(data.notes.find(n => n.id !== note.id)?.id) } }}><Icon n="trash" /></Btn>
        </div>
        <input className="ntitle" value={note.title} onChange={e => save({ title: e.target.value })} />
        <div className="row wrap" style={{ gap: 6, margin: '6px 0 18px' }}>{note.tags.map(t => <span key={t} className="chip">#{t}</span>)}</div>
        {mode === 'editar'
          ? <textarea className="nbody" autoFocus value={note.body} onChange={e => save({ body: e.target.value })} placeholder="Escreva em Markdown… use [[links]] e #tags" />
          : <div className="md" onClick={click} onDoubleClick={() => setMode('editar')} dangerouslySetInnerHTML={{ __html: renderMd(note.body) || '<p class="muted">Página vazia — clique duas vezes para editar.</p>' }} />}
        {backlinks.length > 0 && <div style={{ marginTop: 40, borderTop: '1px solid var(--line)', paddingTop: 14 }}><div className="side-sec" style={{ padding: '0 0 8px' }}>Mencionada em</div>
          {backlinks.map(b => <div key={b.id} className="nitem" onClick={() => setSel(b.id)}>↳ {b.title}</div>)}</div>}
      </motion.div> : <div className="muted">Nenhuma nota. <Btn onClick={() => create()}>Criar a primeira</Btn></div>}</AnimatePresence>
    </div>
  </motion.div>
}
