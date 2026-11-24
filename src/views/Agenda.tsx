import { eventsOn } from '../lib/recur'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../lib/store'
import type { CalEvent } from '../lib/types'
import { Page, Btn, Icon, useIsMobile } from '../components/ui'
import { useEditors } from '../components/editors'
import { WD, MONTHS, addDays, iso, startOfWeek, toMin, pad, today } from '../lib/date'

/** Distribui eventos sobrepostos lado a lado (como no Outlook). */
function lanes(evs: CalEvent[]) {
  const sorted = [...evs].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
  const out: { e: CalEvent; lane: number; of: number }[] = []
  let group: typeof out = [], groupEnd = ''
  const flush = () => { const n = Math.max(...group.map(g => g.lane)) + 1; group.forEach(g => { g.of = n; out.push(g) }); group = [] }
  for (const e of sorted) {
    if (group.length && e.start >= groupEnd) flush()
    const used = new Set(group.filter(g => g.e.end > e.start).map(g => g.lane))
    let lane = 0; while (used.has(lane)) lane++
    group.push({ e, lane, of: 1 }); if (e.end > groupEnd || group.length === 1) groupEnd = group.length === 1 ? e.end : (e.end > groupEnd ? e.end : groupEnd)
  }
  if (group.length) flush()
  return out
}

const HOURS = Array.from({ length: 24 }, (_, i) => i), PX = 48

export default function Agenda({ switcher }: { switcher?: ReactNode }) {
  const { data, upsertEvent } = useStore(); const { editEvent, editTask, quick } = useEditors()
  const [anchor, setAnchor] = useState(new Date())
  const [now, setNow] = useState(new Date())
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i) }, [])
  useEffect(() => { scroller.current?.scrollTo({ top: 7 * PX }) }, [])
  const ws = startOfWeek(anchor, data.settings.weekStart)
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  const proj = (id?: string) => data.projects.find(p => p.id === id)
  const t = today()

  const create = (ds: string, e: React.MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const m = Math.floor((y / PX) * 2) * 30, h = Math.floor(m / 60)
    editEvent({ date: ds, start: `${pad(h)}:${pad(m % 60)}`, end: `${pad(Math.min(23, h + 1))}:${pad(m % 60)}` })
  }
  const onDrop = (ds: string, e: React.DragEvent<HTMLDivElement>) => {
    const id = e.dataTransfer.getData('text'); const ev = data.events.find(x => x.id === id); if (!ev) return
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top - Number(e.dataTransfer.getData('off') || 0)
    const start = Math.max(0, Math.round((y / PX) * 4) * 15), dur = toMin(ev.end) - toMin(ev.start)
    const f = (m: number) => `${pad(Math.floor(Math.min(m, 1439) / 60))}:${pad(Math.min(m, 1439) % 60)}`
    upsertEvent({ id, date: ds, start: f(start), end: f(start + dur) })
  }

  const mobile = useIsMobile()
  if (mobile) return <Page>
    <div className="head"><div><h1>{MONTHS[ws.getMonth()]} <span className="muted" style={{ fontWeight: 500 }}>{ws.getFullYear()}</span></h1></div>
      {switcher}<div className="row" style={{ gap: 6, marginLeft: 'auto' }}><Btn variant="icon" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Semana anterior"><Icon n="left" /></Btn><Btn variant="icon" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Próxima semana"><Icon n="right" /></Btn></div></div>
    <div className="wlist">{days.map((d, i) => {
      const ds = iso(d), evs = eventsOn(data.events, ds).sort((a, b) => a.start.localeCompare(b.start)), tks = data.tasks.filter(x => x.due === ds && x.status !== 'done')
      return <motion.div key={ds} className={`wday ${ds === t ? 'today' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .03 }}>
        <div className="wd-h"><b>{d.getDate()}</b><span>{WD[d.getDay()]}</span><button className="btn ghost sm icon" onClick={() => quick({ kind: 'event', date: ds })} aria-label="Adicionar"><Icon n="plus" s={15} /></button></div>
        {evs.length + tks.length === 0 ? <div className="wd-empty">Livre</div> : <div className="wd-items">
          {evs.map(e => <div key={e.id} className="wd-it" onClick={() => editEvent(e)} style={{ borderColor: proj(e.projectId)?.color ?? 'var(--accent)' }}><span className="mono">{e.start}</span>{e.title}</div>)}
          {tks.map(x => <div key={x.id} className="wd-it task" onClick={() => editTask(x)} style={{ borderColor: proj(x.projectId)?.color ?? 'var(--muted)' }}><span className="mono">◆</span>{x.title}</div>)}
        </div>}
      </motion.div>
    })}</div>
  </Page>
  return <Page wide>
    <div className="head">
      <div><h1>{MONTHS[ws.getMonth()]} <span className="muted" style={{ fontWeight: 500 }}>{ws.getFullYear()}</span></h1><p>Clique num horário para criar · arraste para mover</p></div><div className="sp" />
      {switcher}
      <Btn variant="icon" onClick={() => setAnchor(addDays(anchor, -7))}><Icon n="left" /></Btn>
      <Btn onClick={() => setAnchor(new Date())}>Hoje</Btn>
      <Btn variant="icon" onClick={() => setAnchor(addDays(anchor, 7))}><Icon n="right" /></Btn>
    </div>
    <div className="card" ref={scroller} style={{ flex: 1, minHeight: 0, maxHeight: 'calc(100dvh - 160px)', overflow: 'auto', display: 'block' }}>
      <div className="week">
        <div className="hcol" />
        {days.map(d => <div key={iso(d)} className={`hcol ${iso(d) === t ? 'today' : ''}`}>{WD[d.getDay()]}<b>{d.getDate()}</b>
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>{data.tasks.filter(x => x.due === iso(d) && x.status !== 'done').slice(0, 3).map(x => <span key={x.id} className="chip" title={x.title} style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>◆ {x.title}</span>)}</div>
        </div>)}
        <div>{HOURS.map(h => <div key={h} className="tlabel">{h ? `${pad(h)}:00` : ''}</div>)}</div>
        {days.map(d => {
          const ds = iso(d)
          return <div key={ds} className="slotcol" onClick={e => e.target === e.currentTarget && create(ds, e)} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(ds, e)}>
            {HOURS.map(h => <div key={h} className="hour" style={{ pointerEvents: 'none' }} />)}
            {ds === t && <div className="nowline" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * PX }} />}
            {lanes(eventsOn(data.events, ds)).map(({ e, lane, of }) => {
              const c = proj(e.projectId)?.color ?? 'var(--accent)'
              const top = (toMin(e.start) / 60) * PX, h = Math.max(22, ((toMin(e.end) - toMin(e.start)) / 60) * PX - 2)
              return <motion.div key={e.id} className="ev" draggable={false} initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02, zIndex: 5 }}
                style={{ top, height: h, borderColor: c, left: `calc(${(lane / of) * 100}% + 3px)`, width: `calc(${100 / of}% - 6px)`, right: 'auto', background: `color-mix(in srgb, ${c} 18%, var(--card))` }} onClick={() => editEvent(e)}>
                <div draggable onDragStart={x => { x.dataTransfer.setData('text', e.id); x.dataTransfer.setData('off', String(x.clientY - (x.currentTarget.parentElement as HTMLElement).getBoundingClientRect().top)) }} style={{ height: '100%' }}>
                  <b>{e.repeat ? '↻ ' : ''}{e.title}</b><span className="mono muted">{e.start}–{e.end}</span>{e.location && <div className="muted" style={{ fontSize: 11 }}>{e.location}</div>}
                </div>
                <div className="ev-resize" title="Arraste para mudar a duração" onClick={x => x.stopPropagation()} onPointerDown={x => {
                  x.stopPropagation(); x.preventDefault()
                  const y0 = x.clientY, end0 = toMin(e.end), el = x.currentTarget.parentElement as HTMLElement, h0 = el.offsetHeight
                  let next = end0
                  const mv = (m: PointerEvent) => { next = Math.max(toMin(e.start) + 15, Math.min(1439, end0 + Math.round(((m.clientY - y0) / PX) * 4) * 15)); el.style.height = `${h0 + ((next - end0) / 60) * PX}px` }
                  const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (next !== end0) upsertEvent({ id: e.id, end: `${pad(Math.floor(next / 60))}:${pad(next % 60)}` }) }
                  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
                }} />
              </motion.div>
            })}
          </div>
        })}
      </div>
    </div>
  </Page>
}
