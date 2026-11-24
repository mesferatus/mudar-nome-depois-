import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../lib/store'
import { Page, Btn, Icon, Seg } from '../components/ui'
import { useEditors } from '../components/editors'
import { MONTHS, WD, iso, monthGrid, today } from '../lib/date'
import { buildWorkbook } from '../lib/excel'
import { download } from '../lib/sync'

export default function Planner() {
  const { data, upsertTask, upsertEvent, toast } = useStore(); const { editTask, editEvent } = useEditors()
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [show, setShow] = useState<'tudo' | 'tarefas' | 'eventos'>('tudo')
  const [drop, setDrop] = useState<string>()
  const [dir, setDir] = useState(0)
  const ws = data.settings.weekStart
  const grid = monthGrid(cur.y, cur.m, ws)
  const order = ws === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
  const go = (n: number) => { setDir(n); setCur(c => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } }) }
  const proj = (id?: string) => data.projects.find(p => p.id === id)
  const t = today()

  const onDrop = (ds: string, e: React.DragEvent) => {
    setDrop(undefined)
    const [kind, id] = e.dataTransfer.getData('text').split(':')
    if (kind === 't') upsertTask({ id, due: ds }); else if (kind === 'e') upsertEvent({ id, date: ds })
  }

  return <Page wide>
    <div className="head">
      <div><h1>{MONTHS[cur.m]} <span className="muted" style={{ fontWeight: 500 }}>{cur.y}</span></h1><p>Planner mensal — arraste itens entre os dias. Duplo clique cria evento.</p></div>
      <div className="sp" />
      <Seg value={show} onChange={setShow} options={[{ v: 'tudo', l: 'Tudo' }, { v: 'tarefas', l: 'Entregas' }, { v: 'eventos', l: 'Eventos' }]} />
      <div className="row" style={{ gap: 4 }}>
        <Btn variant="icon" onClick={() => go(-1)}><Icon n="left" /></Btn>
        <Btn onClick={() => { const d = new Date(); setDir(0); setCur({ y: d.getFullYear(), m: d.getMonth() }) }}>Hoje</Btn>
        <Btn variant="icon" onClick={() => go(1)}><Icon n="right" /></Btn>
      </div>
      <Btn onClick={async () => { download(await buildWorkbook(data), `Kairotec-${MONTHS[cur.m]}-${cur.y}.xlsx`); toast('Planilha gerada') }}><Icon n="sheet" /> Exportar .xlsx</Btn>
    </div>
    <div className="card planner-card" style={{ overflow: 'hidden' }}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.table key={`${cur.y}-${cur.m}`} className="xl" custom={dir}
          initial={{ opacity: 0, x: dir * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -30 }} transition={{ duration: .25, ease: [.2, .8, .2, 1] }}>
          <thead><tr>{order.map(i => <th key={i}>{WD[i]}</th>)}</tr></thead>
          <tbody>{Array.from({ length: 6 }, (_, w) => <tr key={w}>{grid.slice(w * 7, w * 7 + 7).map(day => {
            const ds = iso(day), out = day.getMonth() !== cur.m, we = day.getDay() === 0 || day.getDay() === 6
            const evs = show !== 'tarefas' ? data.events.filter(e => e.date === ds).sort((a, b) => a.start.localeCompare(b.start)) : []
            const tks = show !== 'eventos' ? data.tasks.filter(x => x.due === ds) : []
            const items = evs.length + tks.length
            return <td key={ds} className={`${out ? 'out' : ''} ${we ? 'we' : ''} ${drop === ds ? 'drop' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrop(ds) }} onDragLeave={() => setDrop(undefined)} onDrop={e => onDrop(ds, e)}
              onDoubleClick={() => editEvent({ date: ds, start: '09:00', end: '10:00' })}><div className="cellwrap">
              <div className="n"><span className={ds === t ? 'today' : ''}>{day.getDate()}</span>
                <span className="row" style={{ gap: 2 }}><button className="cellbtn" title="Nova entrega" onClick={() => editTask({ due: ds, start: ds })}>◆</button><button className="cellbtn" title="Novo evento" onClick={() => editEvent({ date: ds, start: '09:00', end: '10:00' })}>+</button></span></div>
              {evs.slice(0, 2).map(e => <div key={e.id} className="it" draggable onDragStart={ev => ev.dataTransfer.setData('text', `e:${e.id}`)}
                style={{ borderColor: proj(e.projectId)?.color ?? 'var(--accent)' }} onClick={() => editEvent(e)}><span className="mono">{e.start}</span> {e.title}</div>)}
              {tks.slice(0, 2).map(x => <div key={x.id} className="it" draggable onDragStart={ev => ev.dataTransfer.setData('text', `t:${x.id}`)}
                style={{ borderColor: proj(x.projectId)?.color ?? 'var(--muted)', textDecoration: x.status === 'done' ? 'line-through' : undefined, color: x.status !== 'done' && ds < t ? 'var(--bad)' : undefined }}
                onClick={() => editTask(x)}>{x.status === 'done' ? '✓' : '◆'} {x.title}</div>)}
              {items > 4 && <div className="muted" style={{ fontSize: 11, padding: '0 10px' }}>+{items - 4} mais</div>}
            </div></td>
          })}</tr>)}</tbody>
        </motion.table>
      </AnimatePresence>
    </div>
  </Page>
}
