import { describe, it, expect } from 'vitest'
import { insights } from '../lib/insights'
import type { Data } from '../lib/types'

const NOW = new Date(2026, 10, 24, 12)
const data = {
  version: 1, updatedAt: '', notes: [], events: [{ id: 'e', title: 'Daily', date: '2026-11-23', start: '09:00', end: '10:30' }],
  projects: [{ id: 'p', name: 'BI', color: '#fff' }],
  settings: { theme: 'cafe', userName: '', weekStart: 1, autoExcel: true, autoCloud: true },
  tasks: [
    { id: 'a', title: 'A', status: 'done', priority: 'media', tags: [], projectId: 'p', createdAt: '2026-11-10T10:00:00Z', due: '2026-11-20', doneAt: '2026-11-18', estimate: 2, timeLog: [{ start: '2026-11-17T10:00:00Z', end: '2026-11-17T13:00:00Z' }] },
    { id: 'b', title: 'B', status: 'done', priority: 'media', tags: [], projectId: 'p', createdAt: '2026-11-15T10:00:00Z', due: '2026-11-16', doneAt: '2026-11-19' },
    { id: 'c', title: 'C', status: 'todo', priority: 'media', tags: [], createdAt: '2026-11-01T10:00:00Z', due: '2026-11-20', estimate: 5 },
  ],
} as Data

describe('insights', () => {
  const r = insights(data, 30, NOW)
  it('entregas, % no prazo e lead time', () => { expect(r.done).toBe(2); expect(r.onTimeRate).toBe(50); expect(r.avgLead).toBe(6) })
  it('horas do cronômetro e de reuniões', () => { expect(r.hours).toBe(3); expect(r.meetingH).toBe(1.5) })
  it('por projeto', () => { expect(r.byProject.find(p => p.id === 'p')).toMatchObject({ hours: 3, done: 2, onTime: 50, lead: 6 }) })
  it('estimado × real e atrasadas', () => { expect(r.estVsReal).toEqual([{ title: 'A', est: 2, real: 3 }]); expect(r.late).toBe(1) })
})
