import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { insights } from '../lib/insights'
import { Card, Page, Seg, CountUp, Empty, plural } from '../components/ui'

/** Painel de BI pessoal: horas, prazos, lead time e ritmo, por período. */
export default function Insights() {
  const { data } = useStore()
  const [days, setDays] = useState<'30' | '90' | '365'>('30')
  const r = useMemo(() => insights(data, Number(days)), [data, days])
  const maxH = Math.max(1, ...r.byProject.map(p => p.hours))
  const maxW = Math.max(1, ...r.weeks.map(w => Math.max(w.done, w.hours)))
  const maxD = Math.max(1, ...r.weekday.map(w => w.n))
  const best = r.weekday.reduce((a, b) => b.n > a.n ? b : a, r.weekday[0])

  return <Page>
    <div className="head"><div><h1>Insights</h1><p>Seu BI pessoal — como você entrega, onde vai seu tempo.</p></div><div className="sp" />
      <Seg value={days} onChange={setDays} options={[{ v: '30', l: '30 dias' }, { v: '90', l: '90 dias' }, { v: '365', l: '12 meses' }]} /></div>
    <div className="ins">
      <div className="kpis ins-k">
        {[
          { l: 'Entregas', v: r.done, s: 'concluídas no período' },
          { l: 'No prazo', v: r.onTimeRate, suf: '%', s: r.onTimeRate === null ? 'sem prazos no período' : 'das que tinham prazo', c: r.onTimeRate !== null && r.onTimeRate < 70 ? 'var(--warn)' : 'var(--ok)' },
          { l: 'Lead time', v: r.avgLead, suf: 'd', s: 'da criação à entrega' },
          { l: 'Foco', v: r.hours, suf: 'h', s: 'registradas no cronômetro' },
          { l: 'Reuniões', v: r.meetingH, suf: 'h', s: 'na agenda' },
        ].map((k, i) => <Card key={k.l} className="kpi" delay={i * .04}><div className="l">{k.l}</div>
          <div className="v" style={{ color: k.c }}>{k.v === null ? '—' : <CountUp value={k.v} suffix={k.suf ?? ''} />}</div><div className="s">{k.s}</div></Card>)}
      </div>

      <Card title="Ritmo semanal" sub="entregas · horas de foco · atrasos" delay={.1}>
        <div className="ins-weeks">{r.weeks.map((w, i) => <div key={i} className="ins-w" title={`${w.done} entregas · ${w.hours}h · ${w.late} com atraso`}>
          <div className="ins-bars">
            <motion.i style={{ background: 'var(--accent)' }} initial={{ height: 0 }} animate={{ height: `${(w.done / maxW) * 100}%` }} transition={{ delay: i * .03, type: 'spring', stiffness: 180, damping: 22 }} />
            <motion.i style={{ background: 'var(--c4)' }} initial={{ height: 0 }} animate={{ height: `${(w.hours / maxW) * 100}%` }} transition={{ delay: i * .03 + .05, type: 'spring', stiffness: 180, damping: 22 }} />
          </div>
          {w.late > 0 && <span className="ins-late">{w.late}</span>}
          <span className="mono muted">{w.label}</span></div>)}</div>
        <div className="row" style={{ gap: 14, fontSize: 12, marginTop: 8 }}><span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: 'var(--accent)' }} />entregas</span><span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: 'var(--c4)' }} />horas de foco</span><span className="row" style={{ gap: 6 }}><span className="ins-late" style={{ position: 'static' }}>n</span>com atraso</span></div>
      </Card>

      <Card title="Por projeto" sub="horas · entregas · prazo · lead time" delay={.14}>
        <div className="scroll" style={{ height: '100%' }}>
          {!r.byProject.length && <Empty icon="board" text="Sem dados no período" />}
          {r.byProject.map((p, i) => <div key={p.name} className="ins-p">
            <div className="row" style={{ fontSize: 14 }}><span className="dot" style={{ background: p.color }} /><b style={{ fontWeight: 600, flex: 1 }}>{p.name}</b>
              <span className="chip">{plural(p.done, 'entrega', 'entregas')}</span>{p.onTime !== null && <span className="chip" style={{ color: p.onTime < 70 ? 'var(--warn)' : 'var(--ok)' }}>{p.onTime}% no prazo</span>}{p.lead !== null && <span className="chip">{p.lead}d</span>}</div>
            <div className="bar" style={{ marginTop: 6 }}><motion.i style={{ background: p.color }} initial={{ width: 0 }} animate={{ width: `${(p.hours / maxH) * 100}%` }} transition={{ delay: .2 + i * .05, duration: .7 }} /></div>
            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{p.hours}h de foco{p.est ? ` · ${p.est}h estimadas em aberto` : ''}</div>
          </div>)}
        </div>
      </Card>

      <Card title="Seus dias mais produtivos" sub={best.n ? `pico: ${best.day}` : ''} delay={.18}>
        <div className="ins-wd">{r.weekday.map((w, i) => <div key={w.day}>
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .2 + i * .04 }} style={{ background: `color-mix(in srgb, var(--accent) ${15 + (w.n / maxD) * 85}%, var(--hover))`, color: w.n / maxD > .5 ? 'var(--accent-ink)' : 'var(--text)' }}>{w.n}</motion.span>
          <small>{w.day}</small></div>)}</div>
      </Card>

      <Card title="Estimado × real" sub="tarefas com cronômetro" delay={.22}>
        <div className="scroll" style={{ height: '100%' }}>
          {!r.estVsReal.length ? <Empty icon="check" text="Use ▶ Foco nas tarefas para comparar estimativa e tempo real" /> :
            r.estVsReal.map(t => { const diff = t.real - t.est; return <div key={t.title} className="list-row"><span style={{ flex: 1 }}>{t.title}</span>
              <span className="mono muted">{t.est}h → {t.real}h</span><span className="chip" style={{ color: Math.abs(diff) <= t.est * .2 ? 'var(--ok)' : diff > 0 ? 'var(--warn)' : 'var(--info)' }}>{diff > 0 ? '+' : ''}{Math.round(diff * 10) / 10}h</span></div> })}
        </div>
      </Card>
    </div>
  </Page>
}
