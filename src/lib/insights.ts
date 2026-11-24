import type { Data } from './types'
import { addDays, iso, startOfWeek, daysBetween, WD, parse } from './date'
import { hoursOf } from './recur'

/** Indicadores do painel de BI pessoal para os últimos `days` dias. */
export function insights(d: Data, days: number, now = new Date()) {
  const from = iso(addDays(now, -days)), fromIso = addDays(now, -days).toISOString()
  const done = d.tasks.filter(t => t.status === 'done' && t.doneAt && t.doneAt >= from)
  const withDue = done.filter(t => t.due)
  const onTime = withDue.filter(t => t.doneAt! <= t.due!)
  const lead = done.map(t => daysBetween(t.createdAt.slice(0, 10), t.doneAt!)).filter(n => n >= 0)
  const avgLead = lead.length ? Math.round((lead.reduce((a, b) => a + b, 0) / lead.length) * 10) / 10 : 0
  const hours = d.tasks.reduce((s, t) => s + hoursOf(t, fromIso), 0)
  const meetingH = d.events.filter(e => e.date >= from && e.date <= iso(now)).reduce((s, e) => {
    const [a, b] = [e.start, e.end].map(x => +x.slice(0, 2) * 60 + +x.slice(3)); return s + Math.max(0, b - a) / 60
  }, 0)

  const byProject = [...d.projects.map(p => ({ id: p.id, name: p.name, color: p.color })), { id: undefined as string | undefined, name: 'Sem projeto', color: 'var(--faint)' }].map(p => {
    const ts = d.tasks.filter(t => t.projectId === p.id)
    const dn = done.filter(t => t.projectId === p.id), dl = dn.filter(t => t.due), ot = dl.filter(t => t.doneAt! <= t.due!)
    const ld = dn.map(t => daysBetween(t.createdAt.slice(0, 10), t.doneAt!)).filter(n => n >= 0)
    return { ...p, hours: Math.round(ts.reduce((s, t) => s + hoursOf(t, fromIso), 0) * 10) / 10, done: dn.length,
      onTime: dl.length ? Math.round((ot.length / dl.length) * 100) : null, lead: ld.length ? Math.round(ld.reduce((a, b) => a + b, 0) / ld.length * 10) / 10 : null,
      est: ts.filter(t => t.status !== 'done').reduce((s, t) => s + (t.estimate ?? 0), 0) }
  }).filter(p => p.hours || p.done || p.est)

  const nWeeks = Math.min(12, Math.max(4, Math.ceil(days / 7)))
  const ws0 = startOfWeek(now, d.settings.weekStart)
  const weeks = Array.from({ length: nWeeks }, (_, i) => {
    const a = addDays(ws0, (i - nWeeks + 1) * 7), A = iso(a), B = iso(addDays(a, 7))
    const dn = d.tasks.filter(t => t.doneAt && t.doneAt >= A && t.doneAt < B)
    return { label: `${a.getDate()}/${a.getMonth() + 1}`, done: dn.length, late: dn.filter(t => t.due && t.doneAt! > t.due).length,
      hours: Math.round(d.tasks.reduce((s, t) => s + hoursOf(t, a.toISOString(), addDays(a, 7).toISOString()), 0) * 10) / 10 }
  })
  const weekday = Array.from({ length: 7 }, (_, i) => ({ day: WD[i], n: done.filter(t => parse(t.doneAt!).getDay() === i).length }))
  const estVsReal = done.filter(t => t.estimate && t.timeLog?.length).map(t => ({ title: t.title, est: t.estimate!, real: Math.round(hoursOf(t) * 10) / 10 }))

  return {
    done: done.length, onTimeRate: withDue.length ? Math.round((onTime.length / withDue.length) * 100) : null,
    avgLead, hours: Math.round(hours * 10) / 10, meetingH: Math.round(meetingH * 10) / 10,
    byProject, weeks, weekday, estVsReal,
    late: d.tasks.filter(t => t.status !== 'done' && t.due && t.due < iso(now)).length,
  }
}
