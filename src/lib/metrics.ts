import { eventsOn } from './recur'
import type { Data } from './types'
import { addDays, iso, today, startOfWeek, parse, daysBetween } from './date'

export function metrics(d: Data) {
  const t = today(), in7 = iso(addDays(new Date(), 7))
  const tasks = d.tasks
  const done = tasks.filter(x => x.status === 'done')
  const open = tasks.filter(x => x.status !== 'done')
  const overdue = open.filter(x => x.due && x.due < t)
  const dueSoon = open.filter(x => x.due && x.due >= t && x.due <= in7)
  const withDue = done.filter(x => x.due)
  const onTime = withDue.filter(x => (x.doneAt ?? '') <= x.due!)
  const onTimeRate = withDue.length ? Math.round((onTime.length / withDue.length) * 100) : 100
  const openHours = open.reduce((s, x) => s + (x.estimate ?? 0), 0)
  const atRisk = open.filter(x => {
    if (!x.due || !x.start || x.due < t) return false
    const total = Math.max(1, daysBetween(x.start, x.due)), used = daysBetween(x.start, t)
    const expected = used / total
    const prog = x.status === 'review' ? 0.85 : x.status === 'doing' ? 0.45 : 0
    return expected - prog > 0.4
  })
  const byProject = d.projects.map(p => {
    const pt = tasks.filter(x => x.projectId === p.id)
    return { ...p, total: pt.length, done: pt.filter(x => x.status === 'done').length, late: pt.filter(x => x.status !== 'done' && x.due && x.due < t).length }
  })
  const byStatus = (['todo', 'doing', 'review', 'done'] as const).map(s => ({ status: s, n: tasks.filter(x => x.status === s).length }))
  // 8 weeks of throughput: created vs completed
  const ws0 = startOfWeek(new Date(), d.settings.weekStart)
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const a = addDays(ws0, (i - 7) * 7), b = addDays(a, 7), A = iso(a), B = iso(b)
    return {
      label: `${a.getDate()}/${a.getMonth() + 1}`,
      done: done.filter(x => x.doneAt && x.doneAt >= A && x.doneAt < B).length,
      onTime: done.filter(x => x.doneAt && x.doneAt >= A && x.doneAt < B && (!x.due || x.doneAt <= x.due)).length,
      created: tasks.filter(x => x.createdAt.slice(0, 10) >= A && x.createdAt.slice(0, 10) < B).length,
    }
  })
  // Week load (hours of events per weekday)
  const wk = Array.from({ length: 7 }, (_, i) => {
    const ds = iso(addDays(ws0, i))
    const mins = eventsOn(d.events, ds).reduce((s, e) => { const [h1, m1] = e.start.split(':').map(Number), [h2, m2] = e.end.split(':').map(Number); return s + (h2 * 60 + m2 - h1 * 60 - m1) }, 0)
    return { day: parse(ds), hours: Math.round(mins / 6) / 10, due: d.tasks.filter(x => x.due === ds && x.status !== 'done').length }
  })
  return { open: open.length, done: done.length, overdue: overdue.length, overdueList: overdue, dueSoon: dueSoon.length, dueSoonList: dueSoon, onTimeRate, openHours, atRisk, byProject, byStatus, weeks, wk }
}
