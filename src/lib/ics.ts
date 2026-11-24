import type { CalEvent } from './types'
import { pad } from './date'

/*
 * Lê um arquivo .ics (Outlook: Arquivo → Salvar calendário; ou o link ICS publicado)
 * e devolve eventos do Kairotec. Horários em UTC ("Z") são convertidos para o fuso local.
 * Eventos recorrentes (RRULE) entram só na primeira ocorrência.
 */
export function parseIcs(text: string): Omit<CalEvent, 'id'>[] {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/)
  const out: Omit<CalEvent, 'id'>[] = []
  let cur: Record<string, string> | null = null
  for (const l of lines) {
    if (l === 'BEGIN:VEVENT') { cur = {}; continue }
    if (l === 'END:VEVENT' && cur) {
      const s = when(cur.DTSTART), e = when(cur.DTEND) ?? s
      if (s && cur.SUMMARY) {
        const ev: Omit<CalEvent, 'id'> = { title: unesc(cur.SUMMARY), date: s.date, start: s.time ?? '00:00', end: e && e.date === s.date && e.time ? e.time : s.time ? addHour(s.time) : '23:59' }
        if (cur.LOCATION) ev.location = unesc(cur.LOCATION)
        out.push(ev)
      }
      cur = null; continue
    }
    if (!cur) continue
    const i = l.indexOf(':'); if (i < 0) continue
    const key = l.slice(0, i).split(';')[0].toUpperCase()
    cur[key] = l.slice(i + 1); if (key === 'DTSTART' || key === 'DTEND') cur[key + '_RAW'] = l
  }
  return out
}

function when(v?: string): { date: string; time?: string } | undefined {
  if (!v) return
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/)
  if (!m) return
  if (!m[4]) return { date: `${m[1]}-${m[2]}-${m[3]}` }
  if (m[7]) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]))
    return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }
  }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` }
}
const addHour = (t: string) => `${pad(Math.min(23, +t.slice(0, 2) + 1))}:${t.slice(3)}`
const unesc = (s: string) => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim()

/** Evita duplicar: mesmo título + data + início. */
export const icsKey = (e: Pick<CalEvent, 'title' | 'date' | 'start'>) => `${e.title}|${e.date}|${e.start}`
