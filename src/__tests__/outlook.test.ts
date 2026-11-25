import { describe, it, expect } from 'vitest'
import { fromOutlook, mergeOutlook } from '../lib/outlook'
import type { Data } from '../lib/types'

const items = [
  { id: 'AAA', subject: 'Daily logística', start: '2026-11-25T09:00', end: '2026-11-25T09:15', location: 'Teams', busy: 2 },
  { id: 'AAA', subject: 'Daily logística', start: '2026-11-26T09:00', end: '2026-11-26T09:15', busy: 2 },
  { id: 'BBB', subject: 'Feriado', start: '2026-11-20T00:00', end: '2026-11-21T00:00', allDay: true, busy: 3 },
  { id: 'CCC', subject: 'Bloqueio livre', start: '2026-11-25T12:00', end: '2026-11-25T13:00', busy: 0 },
]
describe('Outlook', () => {
  const ev = fromOutlook(items)
  it('converte ocorrências, dia inteiro e ignora "livre"', () => {
    expect(ev).toHaveLength(3)
    expect(ev[0]).toMatchObject({ title: 'Daily logística', date: '2026-11-25', start: '09:00', end: '09:15', location: 'Teams', source: 'outlook' })
    expect(ev[0].id).not.toBe(ev[1].id)
    expect(ev[2]).toMatchObject({ start: '00:00', end: '23:59' })
  })
  it('substitui só os eventos do Outlook e mantém o projeto escolhido', () => {
    const d = { events: [{ id: 'meu', title: 'Meu', date: '2026-11-25', start: '10:00', end: '11:00' }, { ...ev[0], projectId: 'p1' }, { id: 'ol-velho', source: 'outlook', title: 'Cancelado', date: '2026-11-25', start: '15:00', end: '16:00' }] } as Data
    const m = mergeOutlook(d, ev)
    expect(m.events.map(e => e.id)).toContain('meu')
    expect(m.events.find(e => e.id === 'ol-velho')).toBeUndefined()
    expect(m.events.find(e => e.id === ev[0].id)!.projectId).toBe('p1')
  })
})
