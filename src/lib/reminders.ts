import { eventsOn } from './recur'
import { useEffect } from 'react'
import type { Data } from './types'
import { iso, toMin } from './date'

/** Lembretes do navegador: 10 min antes de eventos e resumo das entregas do dia (uma vez por dia). */
export function useReminders(data: Data) {
  useEffect(() => {
    if (!data.settings.reminders || !('Notification' in window) || Notification.permission !== 'granted') return
    const seen = (k: string) => { try { if (localStorage.getItem(k)) return true; localStorage.setItem(k, '1') } catch { /* ignore */ } return false }
    const tick = () => {
      const now = new Date(), today = iso(now), m = now.getHours() * 60 + now.getMinutes()
      for (const e of eventsOn(data.events, today)) {
        const diff = toMin(e.start) - m
        if (e.date === today && diff >= 0 && diff <= 10 && !seen(`kt:rem:${e.id}:${today}`))
          new Notification(`Em ${diff} min · ${e.title}`, { body: `${e.start}–${e.end}${e.location ? ` · ${e.location}` : ''}`, icon: '/icon-192.png', tag: e.id })
      }
      const due = data.tasks.filter(t => t.due === today && t.status !== 'done')
      if (due.length && now.getHours() >= 8 && !seen(`kt:rem:day:${today}`))
        new Notification(`${due.length} entrega(s) para hoje`, { body: due.slice(0, 4).map(t => `• ${t.title}`).join('\n'), icon: '/icon-192.png', tag: 'day' })
    }
    tick(); const i = setInterval(tick, 30000); return () => clearInterval(i)
  }, [data])
}
