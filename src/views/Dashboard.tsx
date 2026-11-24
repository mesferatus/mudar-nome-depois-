import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { metrics } from '../lib/metrics'
import { Card, Page, Btn, Icon } from '../components/ui'
import { Donut, Bars, Burndown } from '../components/charts'
import { useEditors } from '../components/editors'
import { WD, fmt, today, addDays, iso, daysBetween } from '../lib/date'
import { STATUS_LABEL } from '../lib/types'

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

export default function Dashboard() {
  const { data } = useStore(); const { editTask, editEvent } = useEditors()
  const m = useMemo(() => metrics(data), [data])
  const t = today()
  const todayEvents = data.events.filter(e => e.date === t).sort((a, b) => a.start.localeCompare(b.start))
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

  const COLORS = { todo: 'var(--faint)', doing: 'var(--info)', review: 'var(--warn)', done: 'var(--ok)' }
  return <Page>
    <div className="head"><div><h1>{hello()}{data.settings.userName ? `, ${data.settings.userName}` : ''}.</h1>
      <p>{WD[new Date().getDay()]}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} · {m.overdue ? `${m.overdue} entrega(s) atrasada(s)` : 'tudo dentro do prazo'}</p></div>
      <div className="sp" /><Btn onClick={() => editEvent()}><Icon n="cal" /> Evento</Btn><Btn variant="primary" onClick={() => editTask()}><Icon n="plus" /> Tarefa</Btn></div>

    <div className="grid kpis">
      {[
        { l: 'Ativas', v: m.open, s: `${m.openHours}h estimadas` },
        { l: 'No prazo', v: `${m.onTimeRate}%`, s: `${m.done} concluídas`, c: m.onTimeRate >= 80 ? 'var(--ok)' : 'var(--warn)' },
        { l: 'Atrasadas', v: m.overdue, s: 'precisam de atenção', c: m.overdue ? 'var(--bad)' : undefined },
        { l: 'Em risco', v: m.atRisk.length, s: 'ritmo abaixo do ideal', c: m.atRisk.length ? 'var(--warn)' : undefined },
        { l: '7 dias', v: m.dueSoon, s: 'entregas próximas' },
      ].map((k, i) => <Card key={k.l} delay={i * .04} className="kpi"><div className="l">{k.l}</div><div className="v" style={{ color: k.c }}>{k.v}</div><div className="s">{k.s}</div></Card>)}
    </div>

    <div className="dash">
      <Card title="Entregas por semana" sub="concluídas × no prazo" delay={.1}><Bars data={m.weeks.map(w => ({ label: w.label, a: w.onTime, b: w.done }))} /></Card>
      <Card title="Status" sub={`${data.tasks.length} tarefas`} delay={.14}>
        <Donut parts={m.byStatus.map(s => ({ v: s.n, c: COLORS[s.status], l: STATUS_LABEL[s.status] }))} label={`${data.tasks.length ? Math.round((m.done / data.tasks.length) * 100) : 0}%`} sub="concluído" />
      </Card>
      <Card title="Burndown · 14 dias" sub={`${burn.total}h em aberto`} delay={.18}><Burndown points={burn.pts} /></Card>
      <Card title="Hoje" sub={`${todayEvents.length} compromissos`} delay={.22}>
        <div className="scroll" style={{ height: '100%' }}>
          {todayEvents.length === 0 && <div className="muted">Agenda livre. Bom momento para foco.</div>}
          {todayEvents.map(e => <div key={e.id} className="list-row" style={{ cursor: 'pointer' }} onClick={() => editEvent(e)}>
            <span className="mono muted">{e.start}</span><span className="dot" style={{ background: proj(e.projectId)?.color ?? 'var(--accent)' }} />{e.title}</div>)}
        </div>
      </Card>
      <Card title="Atenção" sub="atrasadas e em risco" delay={.26}>
        <div className="scroll" style={{ height: '100%' }}>
          {[...m.overdueList, ...m.atRisk].length === 0 && <div className="muted">Nada pegando fogo 🌿</div>}
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
