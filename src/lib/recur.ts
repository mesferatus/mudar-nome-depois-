import type { CalEvent, Task } from './types'
import { parse } from './date'

/** Eventos que acontecem em um dia, incluindo as repetições (diária, semanal, mensal). */
export function eventsOn(events: CalEvent[], ds: string): CalEvent[] {
  const d = parse(ds)
  return events.filter(e => {
    if (e.date === ds) return true
    if (!e.repeat || ds < e.date || (e.until && ds > e.until)) return false
    const b = parse(e.date)
    if (e.repeat === 'diaria') return d.getDay() !== 0 && d.getDay() !== 6
    if (e.repeat === 'semanal') return d.getDay() === b.getDay()
    return d.getDate() === b.getDate()
  }).map(e => e.date === ds ? e : { ...e, date: ds })
}

/** Horas registradas no cronômetro (opcionalmente só entre duas datas ISO). */
export function hoursOf(t: Task, from?: string, to?: string) {
  return (t.timeLog ?? []).filter(l => (!from || l.start >= from) && (!to || l.start <= to))
    .reduce((s, l) => s + (new Date(l.end).getTime() - new Date(l.start).getTime()) / 3600000, 0)
}
