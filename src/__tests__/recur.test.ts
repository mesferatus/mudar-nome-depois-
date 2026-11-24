import { describe, it, expect } from 'vitest'
import { eventsOn, hoursOf } from '../lib/recur'
import type { CalEvent, Task } from '../lib/types'

const base: CalEvent = { id: 'e', title: 'Daily', date: '2026-11-23', start: '09:00', end: '09:15' } // segunda
describe('eventos recorrentes', () => {
  it('sem repetição só no dia', () => { expect(eventsOn([base], '2026-11-24')).toHaveLength(0) })
  it('diária só em dias úteis', () => {
    const e = { ...base, repeat: 'diaria' as const }
    expect(eventsOn([e], '2026-11-27')[0].date).toBe('2026-11-27')
    expect(eventsOn([e], '2026-11-28')).toHaveLength(0)
  })
  it('semanal no mesmo dia da semana e respeita "até"', () => {
    const e = { ...base, repeat: 'semanal' as const, until: '2026-12-10' }
    expect(eventsOn([e], '2026-11-30')).toHaveLength(1)
    expect(eventsOn([e], '2026-12-01')).toHaveLength(0)
    expect(eventsOn([e], '2026-12-14')).toHaveLength(0)
  })
  it('mensal no mesmo dia do mês', () => { expect(eventsOn([{ ...base, repeat: 'mensal' }], '2026-12-23')).toHaveLength(1) })
  it('nunca antes do início', () => { expect(eventsOn([{ ...base, repeat: 'diaria' }], '2026-11-20')).toHaveLength(0) })
})
describe('horas registradas', () => {
  it('soma os períodos', () => {
    const t = { timeLog: [{ start: '2026-11-24T09:00:00Z', end: '2026-11-24T10:30:00Z' }, { start: '2026-11-25T14:00:00Z', end: '2026-11-25T14:30:00Z' }] } as Task
    expect(hoursOf(t)).toBe(2); expect(hoursOf(t, '2026-11-25')).toBe(.5)
  })
})
