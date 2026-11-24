import { eventsOn } from '../lib/recur'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { metrics } from '../lib/metrics'
import { Card, Page, Icon, Empty, CountUp, plural } from '../components/ui'
import { Donut, Area, Burndown } from '../components/charts'
import { useEditors } from '../components/editors'
import { fmt, today, addDays, iso, daysBetween } from '../lib/date'
import { STATUS_LABEL } from '../lib/types'

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

export default function Dashboard() {
  const { data } = useStore(); const { editTask, editEvent, quick } = useEditors()
  const m = useMemo(() => metrics(data), [data])
  const t = today()
  const nowHM = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
  const dueToday = data.tasks.filter(x => x.due === today() && x.status !== 'done')
  const todayEvents = eventsOn(data.events, t).sort((a, b) => a.start.localeCompare(b.start))
  const proj = (id?: string) => data.projects.find(p => p.id === id)

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
      <motion.div className="hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
        <div className="k">Entregas no prazo</div>
        <div className="big">{m.done ? <CountUp value={m.onTimeRate} suffix="%" /> : '—'}</div>
        <div className="sub">{m.done ? '' : 'Conclua a primeira entrega para medir · '}{plural(m.open, 'tarefa ativa', 'tarefas ativas')} · {m.openHours}h planejadas</div>
        <div className="split">
          <div><span className="k">Próximos 7 dias</span><b className="gold">{plural(m.dueSoon, 'entrega', 'entregas')}</b></div>
          <div><span className="k">Precisam de atenção</span><b style={{ color: m.overdue ? 'var(--bad)' : undefined }}>{m.overdue} atrasada{m.overdue === 1 ? '' : 's'}</b></div>
        </div>
      </motion.div>
      <div>
        <div className="actions">
          {[{ l: 'Tarefa', i: 'check', k: 'task' as const, c: 'var(--c1)' }, { l: 'Evento', i: 'cal', k: 'event' as const, c: 'var(--c4)' }, { l: 'Nota', i: 'note', k: 'note' as const, c: 'var(--c3)' }].map((a, i) =>
            <motion.button key={a.l} className="action" onClick={() => quick({ kind: a.k })} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .05 + i * .05, type: 'spring', stiffness: 300, damping: 24 }} whileHover={{ y: -3 }} whileTap={{ scale: .95 }}>
              <span className="circ" style={{ background: `color-mix(in srgb, ${a.c} 18%, transparent)`, color: a.c }}><Icon n={a.i} s={20} /></span>{a.l}
            </motion.button>)}
        </div>
        <div className="kpis" style={{ marginTop: 12 }}>
          <Card className="kpi" delay={.1}><div className="l">Em risco</div><div className="v" style={{ color: m.atRisk.length ? 'var(--warn)' : undefined }}><CountUp value={m.atRisk.length} /></div><div className="s">ritmo abaixo do ideal</div></Card>
          <Card className="kpi" delay={.14}><div className="l">Concluídas</div><div className="v"><CountUp value={m.done} /></div><div className="s">de {data.tasks.length} tarefas</div></Card>
        </div>
      </div>
    </div>

    <div className="dash">
      <Card title="Ritmo de entregas" sub="últimas 8 semanas" delay={.1}><Area data={m.weeks.map(w => ({ label: w.label, a: w.onTime, b: w.done }))} /></Card>
      <Card title="Status" sub={`${data.tasks.length} tarefas`} delay={.14}>
        <Donut parts={m.byStatus.map(s => ({ v: s.n, c: COLORS[s.status], l: STATUS_LABEL[s.status] }))} label={`${data.tasks.length ? Math.round((m.done / data.tasks.length) * 100) : 0}%`} sub="concluído" />
      </Card>
      <Card title="Burndown · 14 dias" sub={`${burn.total}h em aberto`} delay={.18}><Burndown points={burn.pts} /></Card>
      <Card title="Seu dia" sub={`${plural(todayEvents.length, 'compromisso', 'compromissos')} · ${plural(dueToday.length, 'entrega', 'entregas')}`} delay={.22}>
        <div className="scroll" style={{ height: '100%' }}>
          {todayEvents.length + dueToday.length === 0 ? <Empty icon="cal" text="Dia livre — bom momento para foco" action="Evento" onAction={() => quick({ kind: 'event' })} /> :
            <div className="tl">
              {dueToday.map(x => <motion.div key={x.id} className="tl-i" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                <span className="tl-t mono">hoje</span><span className="tl-d" style={{ borderColor: proj(x.projectId)?.color ?? 'var(--accent)' }} />
                <div className="tl-c" onClick={() => editTask(x)}><b>{x.title}</b><small>entrega{proj(x.projectId) ? ` · ${proj(x.projectId)!.name}` : ''}</small></div>
              </motion.div>)}
              {todayEvents.map((e, i) => {
                const past = e.end < nowHM, live = e.start <= nowHM && nowHM < e.end
                return <motion.div key={e.id} className={`tl-i ${past ? 'past' : ''} ${live ? 'live' : ''}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .05 }}>
                  <span className="tl-t mono">{e.start}</span><span className="tl-d" style={{ background: proj(e.projectId)?.color ?? 'var(--accent)', borderColor: proj(e.projectId)?.color ?? 'var(--accent)' }} />
                  <div className="tl-c" onClick={() => editEvent(e)}><b>{e.title}</b><small>{e.start}–{e.end}{live ? ' · agora' : ''}{e.location ? ` · ${e.location}` : ''}</small></div>
                </motion.div>
              })}
            </div>}
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
