import type { CalEvent, Data } from './types'

/** Item como o PowerShell devolve do Outlook (COM). */
export interface OutlookItem { id: string; subject: string; start: string; end: string; location?: string; allDay?: boolean; busy?: number }

/** Converte itens do Outlook em eventos do Kairotec (cada ocorrência de série vira um evento). */
export function fromOutlook(items: OutlookItem[]): CalEvent[] {
  return items.filter(i => i.subject && i.start && i.busy !== 0 /* livre = ignorar */ || (i.subject && i.start && i.busy === undefined)).map(i => {
    const date = i.start.slice(0, 10), endDate = i.end?.slice(0, 10)
    return {
      id: `ol-${hash(i.id + i.start)}`, extId: i.id, source: 'outlook' as const, title: i.subject.trim(), date,
      start: i.allDay ? '00:00' : i.start.slice(11, 16), end: i.allDay || endDate !== date ? '23:59' : i.end.slice(11, 16),
      ...(i.location ? { location: i.location } : {}),
    }
  })
}

/** Troca os eventos vindos do Outlook pelo retrato atual (mantém os seus e respeita projeto/edições locais). */
export function mergeOutlook(d: Data, fresh: CalEvent[], source: 'outlook' | 'ics' = 'outlook'): Data {
  const old = new Map(d.events.filter(e => e.source === source).map(e => [e.id, e]))
  const merged = fresh.map(e => { const o = old.get(e.id); return o ? { ...e, projectId: o.projectId, color: o.color } : e })
  return { ...d, events: [...d.events.filter(e => e.source !== source), ...merged] }
}

function hash(s: string) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
