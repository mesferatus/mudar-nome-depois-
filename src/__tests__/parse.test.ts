import { describe, it, expect } from 'vitest'
import { parseQuick } from '../lib/parse'

const P = [{ id: 'p1', name: 'BI Logística', color: '#fff' }, { id: 'p2', name: 'Software interno', color: '#fff' }]
const NOW = new Date(2026, 10, 24, 10) // terça, 24/11/2026

describe('parseQuick', () => {
  it('evento com amanhã, horário e projeto', () => {
    const r = parseQuick('Reunião com fornecedor amanhã 14h #bi', P, NOW)
    expect(r).toMatchObject({ kind: 'event', title: 'Reunião com fornecedor', date: '2026-11-25', start: '14:00', end: '15:00', projectId: 'p1' })
  })
  it('intervalo de horário', () => {
    const r = parseQuick('Workshop 9h30-11h hoje', P, NOW)
    expect(r).toMatchObject({ kind: 'event', start: '09:30', end: '11:00', date: '2026-11-24', title: 'Workshop' })
  })
  it('tarefa com dia da semana, prioridade e estimativa', () => {
    const r = parseQuick('Entregar dashboard sexta !alta ~4h', P, NOW)
    expect(r).toMatchObject({ kind: 'task', title: 'Entregar dashboard', date: '2026-11-27', priority: 'alta', estimate: 4 })
  })
  it('data dd/mm e tag que não é projeto', () => {
    const r = parseQuick('Revisar OTIF 05/12 #otif', P, NOW)
    expect(r).toMatchObject({ kind: 'task', date: '2026-12-05', tags: ['otif'], title: 'Revisar OTIF' })
  })
  it('dd/mm no passado vira ano que vem', () => {
    expect(parseQuick('Inventário 10/01', P, NOW).date).toBe('2027-01-10')
  })
  it('nota explícita', () => {
    expect(parseQuick('nota: ideias de BI #software', P, NOW)).toMatchObject({ kind: 'note', title: 'ideias de BI', projectId: 'p2' })
  })
  it('mesmo dia da semana vai para a próxima semana', () => {
    expect(parseQuick('Daily terça', P, NOW).date).toBe('2026-12-01')
  })
  it('estimativa em minutos', () => {
    expect(parseQuick('Responder e-mails ~30min', P, NOW).estimate).toBe(0.5)
  })
})

describe('recorrência', () => {
  it('toda segunda vira semanal com data na próxima segunda', () => {
    expect(parseQuick('Reunião de status toda segunda', P, NOW)).toMatchObject({ repeat: 'semanal', date: '2026-11-30', title: 'Reunião de status' })
  })
  it('todo dia', () => { expect(parseQuick('Conferir OTIF todo dia', P, NOW)).toMatchObject({ repeat: 'diaria', title: 'Conferir OTIF' }) })
  it('mensal', () => { expect(parseQuick('Fechamento todo mês dia 30', P, NOW)).toMatchObject({ repeat: 'mensal', date: '2026-11-30', title: 'Fechamento' }) })
})

describe('fim do evento', () => {
  it('evento às 23h termina 23:59, nunca com duração zero', () => {
    expect(parseQuick('Plantão hoje 23h', P, NOW)).toMatchObject({ start: '23:00', end: '23:59' })
    expect(parseQuick('Call 22h30', P, NOW)).toMatchObject({ start: '22:30', end: '23:30' })
  })
})

describe('palavras do título não viram recorrência', () => {
  it('"Relatório mensal" e "Reunião semanal" mantêm o título', () => {
    const a = parseQuick('Relatório mensal sexta', P, NOW), b = parseQuick('Reunião semanal de BI amanhã 10h', P, NOW)
    expect(a.title).toBe('Relatório mensal'); expect(a.repeat).toBeUndefined()
    expect(b).toMatchObject({ title: 'Reunião semanal de BI', start: '10:00' }); expect(b.repeat).toBeUndefined()
  })
})
