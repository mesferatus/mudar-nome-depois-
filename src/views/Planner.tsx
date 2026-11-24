import { eventsOn } from '../lib/recur'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../lib/store'
import { Page, Btn, Icon, Seg, Empty, useIsMobile } from '../components/ui'
import { useEditors } from '../components/editors'
import { MONTHS, WD, iso, monthGrid, today, parse } from '../lib/date'
import { buildWorkbook } from '../lib/excel'
import { download } from '../lib/sync'

export default function Planner({ switcher }: { switcher?: ReactNode }) {
  const { data, upsertTask, upsertEvent, toast } = useStore(); const { editTask, editEvent, quick } = useEditors()
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

  const mobile = useIsMobile()
  const [sel, setSel] = useState(t)
  if (mobile) {
    const evs = eventsOn(data.events, sel).sort((a, b) => a.start.localeCompare(b.start))
    const tks = data.tasks.filter(x => x.due === sel)
    return <Page>
      <div className="head"><div><h1>{MONTHS[cur.m]} <span className="muted" style={{ fontWeight: 500 }}>{cur.y}</span></h1></div>
        {switcher}<div className="row" style={{ gap: 6, marginLeft: 'auto' }}><Btn variant="icon" onClick={() => go(-1)} aria-label="Mês anterior"><Icon n="left" /></Btn><Btn variant="icon" onClick={() => go(1)} aria-label="Próximo mês"><Icon n="right" /></Btn></div></div>
      <div className="card mcal">
        <div className="mcal-h">{order.map(i => <span key={i}>{WD[i][0]}</span>)}</div>
        <motion.div key={`${cur.y}-${cur.m}`} className="mcal-g" initial={{ opacity: 0, x: dir * 20 }} animate={{ opacity: 1, x: 0 }}>
          {grid.map(day => {
            const ds = iso(day), n = eventsOn(data.events, ds).length, k = data.tasks.filter(x => x.due === ds && x.status !== 'done').length
            return <motion.button whileTap={{ scale: .9 }} key={ds} className={`mday ${day.getMonth() !== cur.m ? 'out' : ''} ${ds === t ? 'today' : ''} ${ds === sel ? 'sel' : ''}`} onClick={() => setSel(ds)}>
              <span>{day.getDate()}</span><i>{n > 0 && <b style={{ background: 'var(--c4)' }} />}{k > 0 && <b style={{ background: ds < t ? 'var(--bad)' : 'var(--accent)' }} />}</i>
            </motion.button>
          })}
        </motion.div>
      </div>
      <div className="mday-list">
        <div className="qa-sec" style={{ margin: '18px 4px 8px' }}>{WD[parse(sel).getDay()]}, {parse(sel).getDate()} de {MONTHS[parse(sel).getMonth()].toLowerCase()}</div>
        {evs.length + tks.length === 0 ? <Empty icon="cal" text="Nada neste dia" action="Adicionar" onAction={() => quick({ kind: 'event', date: sel })} /> : <div className="card"><div className="card-b" style={{ paddingTop: 6, paddingBottom: 6 }}>
          {evs.map(e => <div key={e.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => editEvent(e)}><span className="mono muted">{e.start}</span><span className="dot" style={{ background: proj(e.projectId)?.color ?? 'var(--accent)' }} /><span style={{ flex: 1 }}>{e.title}</span></div>)}
          {tks.map(x => <div key={x.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => editTask(x)}><span className="mono muted">◆</span><span className="dot" style={{ background: proj(x.projectId)?.color ?? 'var(--muted)' }} /><span style={{ flex: 1, textDecoration: x.status === 'done' ? 'line-through' : undefined }}>{x.title}</span></div>)}
        </div></div>}
      </div>
    </Page>
  }
  return <Page wide>
    <div className="head">
      <div><h1>{MONTHS[cur.m]} <span className="muted" style={{ fontWeight: 500 }}>{cur.y}</span></h1><p>Arraste itens entre os dias · duplo clique cria evento</p></div>
      <div className="sp" />
      {switcher}
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
            const evs = show !== 'tarefas' ? eventsOn(data.events, ds).sort((a, b) => a.start.localeCompare(b.start)) : []
            const tks = show !== 'eventos' ? data.tasks.filter(x => x.due === ds) : []
            const items = evs.length + tks.length
            return <td key={ds} className={`${out ? 'out' : ''} ${we ? 'we' : ''} ${drop === ds ? 'drop' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrop(ds) }} onDragLeave={() => setDrop(undefined)} onDrop={e => onDrop(ds, e)}
              onDoubleClick={() => quick({ kind: 'event', date: ds })}><div className="cellwrap">
              <div className="n"><span className={ds === t ? 'today' : ''}>{day.getDate()}</span>
                <span className="row" style={{ gap: 2 }}><button className="cellbtn" title="Nova entrega" onClick={() => quick({ kind: 'task', date: ds })}>◆</button><button className="cellbtn" title="Novo evento" onClick={() => quick({ kind: 'event', date: ds })}>+</button></span></div>
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
