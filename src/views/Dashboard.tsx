import { eventsOn } from '../lib/recur'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { metrics } from '../lib/metrics'
import { Card, Page, Icon, Empty, CountUp, plural } from '../components/ui'
import { Donut, Area, Burndown } from '../components/charts'
import { useEditors } from '../components/editors'
import { fmt, today, addDays, iso, daysBetween, WD, parse } from '../lib/date'
import { STATUS_LABEL } from '../lib/types'

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

export default function Dashboard() {
  const { data } = useStore(); const { editTask, editEvent, quick } = useEditors()
  const m = useMemo(() => metrics(data), [data])
  const t = today()
  const nowHM = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
  const proj = (id?: string) => data.projects.find(p => p.id === id)
  const [sel, setSel] = useState(t)
  const week = useMemo(() => { const d = new Date(); const back = (d.getDay() - data.settings.weekStart + 7) % 7; return Array.from({ length: 7 }, (_, i) => addDays(d, i - back)) }, [data.settings.weekStart])
  const selEvents = eventsOn(data.events, sel).sort((a, b) => a.start.localeCompare(b.start))
  const selTasks = data.tasks.filter(x => x.due === sel && x.status !== 'done')
  const upcoming = data.tasks.filter(x => x.status !== 'done' && x.due && x.due >= t && x.due <= iso(addDays(new Date(), 14))).sort((a, b) => a.due!.localeCompare(b.due!))

  // Burndown: open estimated hours over next 14 days vs ideal
  const burn = useMemo(() => {
    const open = data.tasks.filter(x => x.status !== 'done' && x.due)
    const total = open.reduce((s, x) => s + (x.estimate ?? 1), 0)
    const pts = Array.from({ length: 15 }, (_, i) => {
      const ds = iso(addDays(new Date(), i))
      const remaining = open.filter(x => x.due! >= ds).reduce((s, x) => s + (x.estimate ?? 1), 0)
      return { ideal: total * (1 - i / 14), real: remaining as number | null }
    })
    return { pts, total }
  }, [data])

  const COLORS = { todo: 'var(--c3)', doing: 'var(--c4)', review: 'var(--c2)', done: 'var(--c1)' }
  return <Page>
    <div className="head home"><div><h1>{hello()}{data.settings.userName ? `, ${data.settings.userName}` : ''}</h1>
      <p>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p></div></div>
    <div className="dash-top">
      <motion.div className="card planner" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
        <div className="wk-strip">{week.map((d, i) => {
          const ds = iso(d), n = eventsOn(data.events, ds).length + data.tasks.filter(x => x.due === ds && x.status !== 'done').length
          return <motion.button key={ds} className={`wk-day ${ds === sel ? 'on' : ''} ${ds === t ? 'today' : ''}`} onClick={() => setSel(ds)} whileTap={{ scale: .92 }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .03 }}>
            {ds === sel && <motion.span layoutId="wkpill" className="wk-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <small>{WD[d.getDay()].slice(0, 3)}</small><b>{d.getDate()}</b><i>{Array.from({ length: Math.min(n, 3) }, (_, k) => <span key={k} />)}</i>
          </motion.button>
        })}</div>
        <div className="pl-h"><b>{sel === t ? 'Hoje' : `${WD[parse(sel).getDay()]}, ${fmt(sel)}`}</b><span className="muted">{plural(selEvents.length, 'compromisso', 'compromissos')} · {plural(selTasks.length, 'entrega', 'entregas')}</span></div>
        <div className="scroll pl-body">
          {selEvents.length + selTasks.length === 0 ? <Empty icon="cal" text={sel === t ? 'Dia livre — bom momento para foco' : 'Nada marcado neste dia'} action="Evento" onAction={() => quick({ kind: 'event', date: sel })} /> :
            <div className="tl">
              {selTasks.map(x => <motion.div key={x.id} className="tl-i" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                <span className="tl-t mono">entrega</span><span className="tl-d" style={{ borderColor: proj(x.projectId)?.color ?? 'var(--accent)' }} />
                <div className="tl-c" onClick={() => editTask(x)}><b>{x.title}</b><small>{proj(x.projectId)?.name ?? 'sem projeto'}{x.estimate ? ` · ${x.estimate}h` : ''}</small></div>
              </motion.div>)}
              {selEvents.map((e, i) => {
                const past = sel < t || (sel === t && e.end < nowHM), live = sel === t && e.start <= nowHM && nowHM < e.end
                return <motion.div key={e.id} className={`tl-i ${past ? 'past' : ''} ${live ? 'live' : ''}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .04 }}>
                  <span className="tl-t mono">{e.start}</span><span className="tl-d" style={{ background: proj(e.projectId)?.color ?? 'var(--accent)', borderColor: proj(e.projectId)?.color ?? 'var(--accent)' }} />
                  <div className="tl-c" onClick={() => editEvent(e)}><b>{e.title}</b><small>{e.start}–{e.end}{live ? ' · agora' : ''}{e.location ? ` · ${e.location}` : ''}</small></div>
                </motion.div>
              })}
            </div>}
        </div>
      </motion.div>
      <div className="dash-side">
        <div className="stickers">
          {[
            { k: 'Próximos 7 dias', v: m.dueSoon, s: m.dueSoon === 1 ? 'entrega' : 'entregas', c: 'var(--c1)' },
            { k: 'Atrasadas', v: m.overdue, s: m.overdue ? 'precisam de você' : 'nenhuma 🎉', c: m.overdue ? 'var(--bad)' : 'var(--ok)' },
            { k: 'Em risco', v: m.atRisk.length, s: 'ritmo abaixo do ideal', c: 'var(--warn)' },
            { k: 'No prazo', v: m.done ? m.onTimeRate : 0, suf: '%', s: `${m.done} de ${data.tasks.length} concluídas`, c: 'var(--c4)' },
          ].map((x, i) => <motion.div key={x.k} className="sticker" style={{ '--st': x.c, '--rot': `${[-1.6, 1.2, .8, -1][i]}deg` } as React.CSSProperties}
            initial={{ opacity: 0, y: 12, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: [-1.6, 1.2, .8, -1][i] }} transition={{ delay: .08 + i * .06, type: 'spring', stiffness: 260, damping: 18 }} whileHover={{ rotate: 0, y: -3 }}>
            <span className="st-k">{x.k}</span><b><CountUp value={x.v} suffix={x.suf} /></b><small>{x.s}</small>
          </motion.div>)}
        </div>
        <div className="actions">
          {[{ l: 'Tarefa', i: 'check', k: 'task' as const, c: 'var(--c1)' }, { l: 'Evento', i: 'cal', k: 'event' as const, c: 'var(--c4)' }, { l: 'Nota', i: 'note', k: 'note' as const, c: 'var(--c3)' }].map((a, i) =>
            <motion.button key={a.l} className="action" onClick={() => quick({ kind: a.k, ...(a.k === 'note' ? {} : { date: sel }) })} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3 + i * .05, type: 'spring', stiffness: 300, damping: 24 }} whileHover={{ y: -3 }} whileTap={{ scale: .95 }}>
              <span className="circ" style={{ background: `color-mix(in srgb, ${a.c} 18%, transparent)`, color: a.c }}><Icon n={a.i} s={18} /></span>{a.l}
            </motion.button>)}
        </div>
      </div>
    </div>

    <div className="dash">
      <Card title="Ritmo de entregas" sub="últimas 8 semanas" delay={.1}><Area data={m.weeks.map(w => ({ label: w.label, a: w.onTime, b: w.done }))} /></Card>
      <Card title="Status" sub={`${data.tasks.length} tarefas`} delay={.14}>
        <Donut parts={m.byStatus.map(s => ({ v: s.n, c: COLORS[s.status], l: STATUS_LABEL[s.status] }))} label={`${data.tasks.length ? Math.round((m.done / data.tasks.length) * 100) : 0}%`} sub="concluído" />
      </Card>
      <Card title="Burndown · 14 dias" sub={`${burn.total}h em aberto`} delay={.18}><Burndown points={burn.pts} /></Card>
      <Card title="Próximas entregas" sub="14 dias" delay={.22}>
        <div className="scroll" style={{ height: '100%' }}>
          {upcoming.length === 0 ? <Empty icon="check" text="Nenhuma entrega nos próximos dias" action="Tarefa" onAction={() => quick({ kind: 'task' })} /> :
            upcoming.map(x => <div key={x.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => editTask(x)}>
              <span className="dot" style={{ background: proj(x.projectId)?.color ?? 'var(--accent)' }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</span><span className="mono muted">{fmt(x.due)}</span></div>)}
        </div>
      </Card>
      <Card title="Atenção" sub="atrasadas e em risco" delay={.26}>
        <div className="scroll" style={{ height: '100%' }}>
          {[...m.overdueList, ...m.atRisk].length === 0 && <Empty icon="check" text="Tudo dentro do prazo" />}
          {[...m.overdueList.map(x => ({ x, k: 'late' })), ...m.atRisk.map(x => ({ x, k: 'risk' }))].map(({ x, k }) =>
            <div key={x.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => editTask(x)}>
              <span className="chip" style={{ color: k === 'late' ? 'var(--bad)' : 'var(--warn)' }}>{k === 'late' ? `${daysBetween(x.due!, t)}d atraso` : 'risco'}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</span><span className="mono muted">{fmt(x.due)}</span></div>)}
        </div>
      </Card>
      <Card title="Projetos" sub="progresso" delay={.3}>
        <div className="scroll" style={{ height: '100%' }}>
          {m.byProject.map((p, i) => <div key={p.id} style={{ marginBottom: 12 }}>
            <div className="row" style={{ fontSize: 13, marginBottom: 5 }}><span className="dot" style={{ background: p.color }} /><b style={{ fontWeight: 600 }}>{p.name}</b><span className="muted" style={{ marginLeft: 'auto' }}>{p.done}/{p.total}{p.late ? ` · ${p.late} atrasada` : ''}</span></div>
            <div className="bar"><motion.i style={{ background: p.color }} initial={{ width: 0 }} animate={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} transition={{ delay: .3 + i * .06, duration: .8, ease: [.2, .8, .2, 1] }} /></div>
          </div>)}
        </div>
      </Card>
    </div>
  </Page>
}
