import { describe, it, expect } from 'vitest'
import { parseIcs } from '../lib/ics'

const ICS = [
  'BEGIN:VCALENDAR', 'VERSION:2.0',
  'BEGIN:VEVENT', 'DTSTART;TZID=E. South America Standard Time:20261125T140000', 'DTEND;TZID=E. South America Standard Time:20261125T150000',
  'SUMMARY:Review do dashboard\\, inbound', 'LOCATION:Sala 3 - Taubaté', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261201', 'DTEND;VALUE=DATE:20261202', 'SUMMARY:Inventário geral', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261126T120000Z', 'SUMMARY:Call com fornec', ' edor', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

describe('parseIcs', () => {
  const ev = parseIcs(ICS)
  it('lê os três eventos', () => { expect(ev).toHaveLength(3) })
  it('horário local com TZID e escapes', () => {
    expect(ev[0]).toEqual({ title: 'Review do dashboard, inbound', date: '2026-11-25', start: '14:00', end: '15:00', location: 'Sala 3 - Taubaté' })
  })
  it('dia inteiro', () => { expect(ev[1]).toMatchObject({ title: 'Inventário geral', date: '2026-12-01', start: '00:00', end: '23:59' }) })
  it('linhas dobradas e UTC', () => {
    expect(ev[2].title).toBe('Call com fornecedor')
    const d = new Date(Date.UTC(2026, 10, 26, 12)); expect(ev[2].start).toBe(`${String(d.getHours()).padStart(2, '0')}:00`)
  })
})
