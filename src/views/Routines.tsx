import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../lib/store'
import { metrics } from '../lib/metrics'
import { Page, Card, Btn, Icon } from '../components/ui'
import { addDays, iso, today, toMin, pad, fmt, startOfWeek, WD } from '../lib/date'
import type { Data, Task } from '../lib/types'

/*
 * Rotinas: pequenos "agentes" locais e determinísticos que leem seus dados,
 * produzem um diagnóstico e oferecem uma ação. Nada sai da sua máquina.
 */
type Result = { text: string; action?: { label: string; run: () => void } }
type Routine = { id: string; icon: string; name: string; desc: string; run: (d: Data) => Result }

const nextWorkday = (d: Date) => { let x = addDays(d, 1); while (x.getDay() === 0 || x.getDay() === 6) x = addDays(x, 1); return x }

export default function Routines() {
  const store = useStore(); const { data } = store
  const [out, setOut] = useState<Record<string, Result>>({})

  const routines: Routine[] = [
    {
      id: 'prazos', icon: '⏱', name: 'Vigia de prazos', desc: 'Encontra entregas atrasadas e em risco e propõe novas datas em dias úteis.',
      run: d => {
        const m = metrics(d)
        if (!m.overdue && !m.atRisk.length) return { text: 'Tudo em dia. Nenhuma entrega atrasada ou em risco.' }
        let day = new Date()
        const plan = m.overdueList.map(t => { day = nextWorkday(day); return { t, to: iso(day) } })
        return {
          text: [`${m.overdue} atrasada(s), ${m.atRisk.length} em risco.`, '',
            ...plan.map(p => `• ${p.t.title} — ${fmt(p.t.due)} → ${fmt(p.to)}`),
            ...m.atRisk.map(t => `• (risco) ${t.title} — prazo ${fmt(t.due)}, ainda "${t.status === 'todo' ? 'a fazer' : 'em andamento'}"`)].join('\n'),
          action: plan.length ? { label: `Reagendar ${plan.length} atrasada(s)`, run: () => { plan.forEach(p => store.upsertTask({ id: p.t.id, due: p.to })); store.toast('Prazos reagendados') } } : undefined,
        }
      },
    },
    {
      id: 'blocos', icon: '▦', name: 'Planejador de foco', desc: 'Distribui as horas estimadas das tarefas abertas em blocos de foco nos horários livres da semana (8h–17h).',
      run: d => {
        const open = d.tasks.filter(t => t.status !== 'done' && t.estimate).sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9') || (b.priority === 'alta' ? 1 : 0) - (a.priority === 'alta' ? 1 : 0))
        const blocks: { t: Task; date: string; start: string; end: string }[] = []
        const already = new Set(d.events.filter(e => e.title.startsWith('Foco: ')).map(e => e.title.slice(6)))
        let day = new Date(); if (new Date().getHours() >= 16) day = nextWorkday(day)
        const busy = (ds: string) => d.events.filter(e => e.date === ds).map(e => [toMin(e.start), toMin(e.end)])
        for (const t of open) {
          if (already.has(t.title)) continue
          let left = Math.max(30, Math.ceil(Math.min(t.estimate! * 60, 240) / 30) * 30)
          for (let k = 0; k < 10 && left > 0; k++) {
            const ds = iso(day); if (day.getDay() === 0 || day.getDay() === 6) { day = nextWorkday(day); continue }
            const b = [...busy(ds), ...blocks.filter(x => x.date === ds).map(x => [toMin(x.start), toMin(x.end)])]
            let s = ds === today() ? Math.max(480, Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 30) * 30) : 480
            while (s < 1020 && left > 0) {
              const e = Math.min(s + Math.min(left, 120), 1020)
              if (e - s < 30) break
              if (b.some(([a, z]) => s < z && e > a) || (s < 780 && e > 720)) { s += 30; continue }
              blocks.push({ t, date: ds, start: `${pad(s / 60 | 0)}:${pad(s % 60)}`, end: `${pad(e / 60 | 0)}:${pad(e % 60)}` }); left -= e - s; s = e + 15
            }
            if (left > 0) day = nextWorkday(day)
          }
        }
        if (!blocks.length) return { text: 'Nenhuma tarefa com horas estimadas precisando de blocos (ou todas já têm foco agendado).' }
        return {
          text: blocks.map(b => `• ${WD[new Date(b.date + 'T12:00').getDay()]} ${fmt(b.date)} ${b.start}–${b.end}  ${b.t.title}`).join('\n'),
          action: { label: `Criar ${blocks.length} bloco(s) na agenda`, run: () => { blocks.forEach(b => store.upsertEvent({ title: `Foco: ${b.t.title}`, date: b.date, start: b.start, end: b.end, projectId: b.t.projectId })); store.toast('Blocos de foco criados') } },
        }
      },
    },
    {
      id: 'status', icon: '✎', name: 'Relatório semanal', desc: 'Escreve um status report da semana (feito, próximo, riscos) pronto para mandar pro gestor ou colar no Teams.',
      run: d => {
        const ws = iso(startOfWeek(new Date(), d.settings.weekStart)), we = iso(addDays(new Date(ws + 'T12:00'), 7)), nx = iso(addDays(new Date(ws + 'T12:00'), 14))
        const m = metrics(d), P = (id?: string) => d.projects.find(p => p.id === id)?.name ?? 'Geral'
        const done = d.tasks.filter(t => t.doneAt && t.doneAt >= ws && t.doneAt < we)
        const next = d.tasks.filter(t => t.status !== 'done' && t.due && t.due >= today() && t.due < nx)
        const body = [`# Status · semana de ${fmt(ws)}`, '', '## ✓ Concluído', ...(done.length ? done.map(t => `- ${t.title} (${P(t.projectId)})`) : ['- —']),
          '', '## → Próximos passos', ...(next.length ? next.map(t => `- ${t.title} — ${fmt(t.due)} (${P(t.projectId)})`) : ['- —']),
          '', '## ⚠ Riscos e atrasos', ...([...m.overdueList, ...m.atRisk].length ? [...m.overdueList, ...m.atRisk].map(t => `- ${t.title} — prazo ${fmt(t.due)}`) : ['- Sem riscos no momento']),
          '', `> Entregas no prazo: **${m.onTimeRate}%** · ${m.open} ativas · ${m.openHours}h estimadas #status`].join('\n')
        return { text: body, action: { label: 'Salvar como nota', run: () => { store.upsertNote({ title: `Status ${fmt(ws)}`, folder: 'Relatórios', body, tags: ['status'] }); store.toast('Relatório salvo em Notas') } } }
      },
    },
    {
      id: 'faxina', icon: '✧', name: 'Faxina', desc: 'Aponta tarefas sem prazo, sem projeto, sem estimativa ou paradas há muito tempo em andamento.',
      run: d => {
        const open = d.tasks.filter(t => t.status !== 'done')
        const noDue = open.filter(t => !t.due), noProj = open.filter(t => !t.projectId), noEst = open.filter(t => !t.estimate)
        const stale = open.filter(t => t.status === 'doing' && t.start && t.start < iso(addDays(new Date(), -14)))
        const lines = [
          noDue.length && `Sem prazo (${noDue.length}): ${noDue.map(t => t.title).join(', ')}`,
          noProj.length && `Sem projeto (${noProj.length}): ${noProj.map(t => t.title).join(', ')}`,
          noEst.length && `Sem estimativa (${noEst.length}): ${noEst.map(t => t.title).join(', ')}`,
          stale.length && `Em andamento há +14 dias (${stale.length}): ${stale.map(t => t.title).join(', ')}`,
        ].filter(Boolean)
        return { text: lines.length ? lines.join('\n\n') : 'Base limpinha ✓' }
      },
    },
  ]

  return <Page>
    <div className="head"><div><div className="kicker">Kairotec · Assistentes</div><h1>Rotinas <em>do dia a dia</em></h1><p>Assistentes que rodam localmente sobre seus dados — analisam, sugerem e só aplicam quando você confirma.</p></div><div className="sp" /><span className="stamp">✻ local</span></div>
    <div className="grid routines-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))' }}>
      {routines.map((r, i) => <Card key={r.id} delay={i * .05}>
        <div className="agent" style={{ padding: 0 }}>
          <div className="ic">{r.icon}</div>
          <div><b>{r.name}</b><div className="muted" style={{ fontSize: 13 }}>{r.desc}</div></div>
          <Btn variant="sm" onClick={() => setOut(o => ({ ...o, [r.id]: r.run(data) }))}><Icon n="play" s={12} /> Rodar</Btn>
        </div>
        <AnimatePresence>{out[r.id] && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
          <div className="out">{out[r.id].text}</div>
          <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
            {r.id === 'status' && <Btn variant="sm" onClick={() => { navigator.clipboard.writeText(out[r.id].text); store.toast('Copiado') }}>Copiar</Btn>}
            {out[r.id].action && <Btn variant="sm primary" onClick={() => { out[r.id].action!.run(); setOut(o => { const c = { ...o }; delete c[r.id]; return c }) }}><Icon n="check" s={13} /> {out[r.id].action!.label}</Btn>}
          </div>
        </motion.div>}</AnimatePresence>
      </Card>)}
    </div>
  </Page>
}
