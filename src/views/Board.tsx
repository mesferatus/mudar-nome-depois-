import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../lib/store'
import { Page, Icon, Seg, spring, Empty, DoneToggle, useIsMobile } from '../components/ui'
import { useEditors } from '../components/editors'
import type { Status } from '../lib/types'
import { STATUS_LABEL } from '../lib/types'
import { fmt, today, daysBetween, iso, addDays, parse } from '../lib/date'

const COLS: Status[] = ['todo', 'doing', 'review', 'done']
const CC: Record<Status, string> = { todo: 'var(--faint)', doing: 'var(--info)', review: 'var(--warn)', done: 'var(--ok)' }
const PR = { alta: 'var(--bad)', media: 'var(--warn)', baixa: 'var(--muted)' }

export default function Board() {
  const { data, upsertTask, toast, startTimer } = useStore(); const { editTask, quick } = useEditors()
  const [over, setOver] = useState<Status>()
  const [pf, setPf] = useState<string>('all')
  const [view, setView] = useState<'quadro' | 'lista'>('quadro')
  const [q, setQ] = useState('')
  const t = today()
  const mobile = useIsMobile()
  const tasks = data.tasks.filter(x => (pf === 'all' || x.projectId === pf) && x.title.toLowerCase().includes(q.toLowerCase()))
  const proj = (id?: string) => data.projects.find(p => p.id === id)

  const Due = ({ due, done }: { due?: string; done: boolean }) => {
    if (!due) return null
    const d = daysBetween(t, due), late = !done && d < 0
    return <span className="chip" style={{ color: late ? 'var(--bad)' : d <= 2 && !done ? 'var(--warn)' : undefined }}>{late ? `${-d}d atrasada` : d === 0 ? 'hoje' : fmt(due)}</span>
  }

  return <Page wide>
    <div className="head"><div><h1>Entregas</h1><p>Quadro de tarefas — arraste entre colunas</p></div><div className="sp" />
      <input className="input" placeholder="Filtrar…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 180 }} />
      <select className="input" value={pf} onChange={e => setPf(e.target.value)} style={{ width: 170 }}><option value="all">Todos os projetos</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <Seg value={view} onChange={setView} options={[{ v: 'quadro', l: 'Quadro' }, { v: 'lista', l: 'Lista' }]} />
      </div>

    <div className="fill">{view === 'quadro' ? <div className="board">{COLS.map(s => {
      const items = tasks.filter(x => x.status === s).sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'))
      return <div key={s} className={`col ${over === s ? 'drop' : ''}`} onDragOver={e => { e.preventDefault(); setOver(s) }} onDragLeave={() => setOver(undefined)}
        onDrop={e => { setOver(undefined); upsertTask({ id: e.dataTransfer.getData('text'), status: s }) }}>
        <div className="col-h"><span className="dot" style={{ background: CC[s] }} />{STATUS_LABEL[s]}<span className="muted" style={{ fontWeight: 500 }}>{items.length}</span>
          <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => s === 'todo' ? quick({ kind: 'task' }) : editTask({ status: s, start: t })}><Icon n="plus" s={14} /></button></div>
        <div className="scroll">{items.length === 0 && <Empty icon={s === 'done' ? 'check' : 'board'} text={s === 'done' ? 'Nada concluído ainda' : 'Solte uma tarefa aqui'} />}<AnimatePresence initial={false}>{items.map(x => <motion.div key={x.id} layout layoutId={x.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} transition={spring} className="swipe"
          {...(mobile ? { drag: 'x' as const, dragConstraints: { left: 0, right: 0 }, dragElastic: .5, dragSnapToOrigin: true, onDragEnd: (_: unknown, i: { offset: { x: number } }) => {
            if (i.offset.x > 90) { upsertTask({ id: x.id, status: s === 'done' ? 'todo' : 'done' }); toast(s === 'done' ? 'Reaberta' : 'Concluída ✓') }
            else if (i.offset.x < -90) { const nd = iso(addDays(parse(x.due ?? today()), 1)); upsertTask({ id: x.id, due: nd }); toast(`Adiada para ${fmt(nd)}`) }
          } } : {})}>
          <div className="tcard" draggable onDragStart={e => e.dataTransfer.setData('text', x.id)} onClick={() => editTask(x)}>
            <DoneToggle done={s === 'done'} color={proj(x.projectId)?.color} onToggle={() => { upsertTask({ id: x.id, status: s === 'done' ? 'todo' : 'done' }); if (s !== 'done') toast('Concluída ✓') }} />
            <div className="body">
            <div className="t" style={{ textDecoration: s === 'done' ? 'line-through' : undefined, opacity: s === 'done' ? .65 : 1 }}>{x.title}</div>
            <div className="meta">
              {proj(x.projectId) && <span className="chip"><span className="dot" style={{ background: proj(x.projectId)!.color }} />{proj(x.projectId)!.name}</span>}
              <Due due={x.due} done={s === 'done'} />
              {x.repeat && <span title="Repete">↻</span>}
              {x.checklist?.length ? <span className="chip">☑ {x.checklist.filter(c => c.done).length}/{x.checklist.length}</span> : null}
              <span title={`Prioridade ${x.priority}`} style={{ color: PR[x.priority], fontWeight: 800 }}>{'▮'.repeat(x.priority === 'alta' ? 3 : x.priority === 'media' ? 2 : 1)}</span>
              {x.estimate ? <span className="mono" style={{ marginLeft: 'auto' }}>{x.estimate}h</span> : null}
              {s !== 'done' && <button className="play" title="Iniciar foco (pomodoro 25 min)" onClick={e => { e.stopPropagation(); startTimer(x.id); toast('Foco iniciado 🍅') }}>▶</button>}
            </div>
          </div></div></motion.div>)}</AnimatePresence></div>
      </div>
    })}</div> :
      <div className="card" style={{ height: '100%' }}><div className="card-b scroll">
        <div className="list-row muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}><span style={{ width: 22 }} /><span style={{ flex: 1 }}>Tarefa</span><span style={{ width: 150 }}>Projeto</span><span style={{ width: 110 }}>Status</span><span style={{ width: 100 }}>Prazo</span><span style={{ width: 50 }}>Horas</span></div>
        {[...tasks].sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9')).map(x => <motion.div layout key={x.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => editTask(x)}>
          <input type="checkbox" checked={x.status === 'done'} onClick={e => e.stopPropagation()} onChange={e => upsertTask({ id: x.id, status: e.target.checked ? 'done' : 'todo' })} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
          <span style={{ flex: 1, textDecoration: x.status === 'done' ? 'line-through' : undefined }}>{x.title}</span>
          <span style={{ width: 150 }} className="row"><span className="dot" style={{ background: proj(x.projectId)?.color ?? 'var(--line)' }} />{proj(x.projectId)?.name ?? '—'}</span>
          <span style={{ width: 110 }}><span className="chip" style={{ color: CC[x.status] }}>{STATUS_LABEL[x.status]}</span></span>
          <span style={{ width: 100 }}><Due due={x.due} done={x.status === 'done'} /></span><span className="mono" style={{ width: 50 }}>{x.estimate ?? ''}</span>
        </motion.div>)}
      </div></div>}</div>
  </Page>
}
