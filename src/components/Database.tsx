import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore, uid } from '../lib/store'
import type { DbSchema, DbView, Note, Prop, PropType } from '../lib/types'
import { coverBg } from '../lib/art'
import { fmt } from '../lib/date'
import { Icon, Seg, Empty } from './ui'

const OPT_COLORS = ['#e6a87c', '#b9c7e8', '#9fcf9a', '#f0a6ca', '#f0c27a', '#c9a7ff', '#ef8a7a', '#9fd3c7']
const TYPE_LABEL: Record<PropType, string> = { text: 'Texto', number: 'Número', select: 'Seleção', date: 'Data', checkbox: 'Caixa' }
const TYPE_ICON: Record<PropType, string> = { text: 'Aa', number: '#', select: '◉', date: '📅', checkbox: '☑' }

export const newDb = (): DbSchema => ({
  view: 'table',
  props: [
    { id: 'status', name: 'Status', type: 'select', options: [{ name: 'A fazer', color: OPT_COLORS[1] }, { name: 'Fazendo', color: OPT_COLORS[0] }, { name: 'Feito', color: OPT_COLORS[2] }] },
    { id: 'data', name: 'Data', type: 'date' },
    { id: 'tags', name: 'Responsável', type: 'text' },
  ],
})

/** Valor editável de uma propriedade (usado na tabela e no painel da página). */
export function PropValue({ prop, value, onChange, onAddOption }: { prop: Prop; value: unknown; onChange: (v: string | number | boolean | undefined) => void; onAddOption: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  if (prop.type === 'checkbox') return <input type="checkbox" className="db-check" checked={!!value} onChange={e => onChange(e.target.checked)} />
  if (prop.type === 'date') return <input type="date" className="db-in" value={(value as string) ?? ''} onChange={e => onChange(e.target.value || undefined)} />
  if (prop.type === 'number') return <input type="number" className="db-in" value={(value as number) ?? ''} onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
  if (prop.type === 'select') {
    const opt = prop.options?.find(o => o.name === value)
    return <div className="db-sel" onClick={() => setOpen(true)}>
      {opt ? <span className="pill-o" style={{ background: `color-mix(in srgb, ${opt.color} 28%, transparent)`, color: 'var(--text)' }}>{opt.name}</span> : <span className="muted">—</span>}
      <AnimatePresence>{open && <motion.div className="db-menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()}>
        <input autoFocus className="db-in" placeholder="Buscar ou criar…" value={q} onChange={e => setQ(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) { if (!prop.options?.some(o => o.name === q.trim())) onAddOption(q.trim()); onChange(q.trim()); setQ(''); setOpen(false) } if (e.key === 'Escape') setOpen(false) }} />
        {(prop.options ?? []).filter(o => o.name.toLowerCase().includes(q.toLowerCase())).map(o => <button key={o.name} onMouseDown={() => { onChange(o.name); setOpen(false) }}>
          <span className="pill-o" style={{ background: `color-mix(in srgb, ${o.color} 28%, transparent)` }}>{o.name}</span></button>)}
        {q.trim() && !prop.options?.some(o => o.name === q.trim()) && <button onMouseDown={() => { onAddOption(q.trim()); onChange(q.trim()); setOpen(false); setQ('') }}>Criar <b>{q}</b></button>}
        {value !== undefined && <button className="muted" onMouseDown={() => { onChange(undefined); setOpen(false) }}>Limpar</button>}
      </motion.div>}</AnimatePresence>
    </div>
  }
  return <input className="db-in" value={(value as string) ?? ''} placeholder="—" onChange={e => onChange(e.target.value || undefined)} />
}

/** Banco de dados de página inteira, como no Notion: cada linha é uma página com propriedades. */
export function Database({ db, open }: { db: Note; open: (id: string) => void }) {
  const { data, upsertNote } = useStore()
  const schema = db.db!
  const [q, setQ] = useState('')
  const [colMenu, setColMenu] = useState<string | null>(null)
  const [dragRow, setDragRow] = useState<string | null>(null)
  const setSchema = (p: Partial<DbSchema>) => upsertNote({ id: db.id, db: { ...schema, ...p } })
  const setProp = (id: string, p: Partial<Prop>) => setSchema({ props: schema.props.map(x => x.id === id ? { ...x, ...p } : x) })
  const addOption = (pid: string, name: string) => { const pr = schema.props.find(x => x.id === pid)!; setProp(pid, { options: [...(pr.options ?? []), { name, color: OPT_COLORS[(pr.options?.length ?? 0) % OPT_COLORS.length] }] }) }
  const setVal = (row: Note, pid: string, v: unknown) => upsertNote({ id: row.id, props: { ...row.props, [pid]: v as string } })

  let rows = data.notes.filter(n => n.parentId === db.id && !n.trashed && (!q || n.title.toLowerCase().includes(q.toLowerCase())))
  if (schema.sort) { const { prop, dir } = schema.sort; rows = [...rows].sort((a, b) => { const va = prop === 'title' ? a.title : a.props?.[prop], vb = prop === 'title' ? b.title : b.props?.[prop]; return (va === vb ? 0 : va === undefined ? 1 : vb === undefined ? -1 : va > vb ? 1 : -1) * dir }) }
  const addRow = (props: Note['props'] = {}) => { const n = upsertNote({ title: '', parentId: db.id, icon: '📄', body: '', props }); return n }
  const groupProp = schema.props.find(p => p.type === 'select')
  const sortBy = (pid: string) => setSchema({ sort: schema.sort?.prop === pid ? (schema.sort.dir === 1 ? { prop: pid, dir: -1 } : undefined) : { prop: pid, dir: 1 } })
  const arrow = (pid: string) => schema.sort?.prop === pid ? (schema.sort.dir === 1 ? ' ↑' : ' ↓') : ''

  return <div className="db">
    <div className="db-bar">
      <Seg value={schema.view} onChange={(v: DbView) => setSchema({ view: v })} options={[{ v: 'table', l: '▦ Tabela' }, { v: 'board', l: '▥ Quadro' }, { v: 'gallery', l: '▣ Galeria' }, { v: 'list', l: '☰ Lista' }]} />
      <span style={{ flex: 1 }} />
      <input className="input" style={{ width: 170, height: 34 }} placeholder="Filtrar…" value={q} onChange={e => setQ(e.target.value)} />
      <button className="btn sm primary" onClick={() => addRow()}><Icon n="plus" s={14} /> Novo</button>
    </div>

    {schema.view === 'table' && <div className="db-table-w"><table className="db-table">
      <thead><tr>
        <th onClick={() => sortBy('title')}>Aa Nome{arrow('title')}</th>
        {schema.props.map(p => <th key={p.id}>
          <span onClick={() => sortBy(p.id)}>{TYPE_ICON[p.type]} {p.name}{arrow(p.id)}</span>
          <button className="db-th-m" onClick={() => setColMenu(colMenu === p.id ? null : p.id)}>⋯</button>
          <AnimatePresence>{colMenu === p.id && <motion.div className="db-menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <input className="db-in" defaultValue={p.name} onBlur={e => setProp(p.id, { name: e.target.value || p.name })} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            <div className="db-menu-t">Tipo</div>
            {(Object.keys(TYPE_LABEL) as PropType[]).map(t => <button key={t} className={p.type === t ? 'on' : ''} onClick={() => setProp(p.id, { type: t, options: t === 'select' ? p.options ?? [] : p.options })}>{TYPE_ICON[t]} {TYPE_LABEL[t]}</button>)}
            <button className="danger" onClick={() => { setSchema({ props: schema.props.filter(x => x.id !== p.id) }); setColMenu(null) }}>Excluir propriedade</button>
          </motion.div>}</AnimatePresence>
        </th>)}
        <th className="db-add-c"><button onClick={() => setSchema({ props: [...schema.props, { id: uid(), name: 'Propriedade', type: 'text' }] })}>+</button></th>
      </tr></thead>
      <tbody>
        {rows.map(r => <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <td className="db-title"><span>{r.icon ?? '📄'}</span><input className="db-in" value={r.title} placeholder="Sem título" onChange={e => upsertNote({ id: r.id, title: e.target.value })} /><button className="db-open" onClick={() => open(r.id)}>Abrir</button></td>
          {schema.props.map(p => <td key={p.id}><PropValue prop={p} value={r.props?.[p.id]} onChange={v => setVal(r, p.id, v)} onAddOption={n => addOption(p.id, n)} /></td>)}
          <td />
        </motion.tr>)}
        <tr><td colSpan={schema.props.length + 2}><button className="db-new" onClick={() => addRow()}>+ Nova linha</button></td></tr>
      </tbody>
    </table></div>}

    {schema.view === 'board' && (groupProp ? <div className="db-board">
      {[...(groupProp.options ?? []).map(o => o.name), undefined].map(g => {
        const opt = groupProp.options?.find(o => o.name === g), items = rows.filter(r => (r.props?.[groupProp.id] ?? undefined) === g)
        return <div key={g ?? '_'} className="db-col" onDragOver={e => e.preventDefault()} onDrop={() => { const r = rows.find(x => x.id === dragRow); if (r) setVal(r, groupProp.id, g); setDragRow(null) }}>
          <div className="db-col-h">{opt ? <span className="pill-o" style={{ background: `color-mix(in srgb, ${opt.color} 28%, transparent)` }}>{g}</span> : <span className="muted">Sem {groupProp.name.toLowerCase()}</span>}<span className="muted">{items.length}</span></div>
          {items.map(r => <motion.div layout key={r.id} className="db-card" draggable onDragStart={() => setDragRow(r.id)} onClick={() => open(r.id)} whileHover={{ y: -2 }}>
            <b>{r.icon} {r.title || 'Sem título'}</b>
            <div className="db-card-p">{schema.props.filter(p => p.id !== groupProp.id && r.props?.[p.id] !== undefined).map(p => <span key={p.id} className="chip">{p.type === 'date' ? fmt(r.props![p.id] as string) : p.type === 'checkbox' ? (r.props![p.id] ? '☑ ' + p.name : '☐ ' + p.name) : String(r.props![p.id])}</span>)}</div>
          </motion.div>)}
          <button className="db-new" onClick={() => addRow(g ? { [groupProp.id]: g } : {})}>+ Novo</button>
        </div>
      })}
    </div> : <Empty icon="board" text="Adicione uma propriedade do tipo Seleção para ver o quadro" />)}

    {schema.view === 'gallery' && <div className="db-gallery">
      {rows.map(r => <motion.button key={r.id} className="db-gcard" onClick={() => open(r.id)} whileHover={{ y: -4 }} layout>
        <span className="db-gc" style={{ background: coverBg(r.cover) ?? 'var(--card-2)' }}>{!r.cover && <span style={{ fontSize: 34 }}>{r.icon ?? '📄'}</span>}</span>
        <span className="db-gt">{r.cover && r.icon} {r.title || 'Sem título'}</span>
        <span className="db-card-p" style={{ padding: '0 12px 12px' }}>{schema.props.filter(p => r.props?.[p.id] !== undefined && p.type !== 'checkbox').slice(0, 3).map(p => <span key={p.id} className="chip">{p.type === 'date' ? fmt(r.props![p.id] as string) : String(r.props![p.id])}</span>)}</span>
      </motion.button>)}
      <button className="db-gcard ghost" onClick={() => addRow()}><span className="db-gc" /><span className="db-gt muted">+ Novo</span></button>
    </div>}

    {schema.view === 'list' && <div className="db-list">
      {rows.map(r => <motion.div layout key={r.id} className="db-li" onClick={() => open(r.id)}>
        <span>{r.icon ?? '📄'}</span><b>{r.title || 'Sem título'}</b><span style={{ flex: 1 }} />
        {schema.props.filter(p => r.props?.[p.id] !== undefined && p.type !== 'checkbox').slice(0, 3).map(p => <span key={p.id} className="chip">{p.type === 'date' ? fmt(r.props![p.id] as string) : String(r.props![p.id])}</span>)}
      </motion.div>)}
      <button className="db-new" onClick={() => addRow()}>+ Nova linha</button>
    </div>}
    {!rows.length && schema.view !== 'board' && <div className="muted" style={{ padding: '10px 4px', fontSize: 13 }}>{q ? 'Nada encontrado.' : 'Vazio — clique em "+ Novo" para criar a primeira linha.'}</div>}
  </div>
}
