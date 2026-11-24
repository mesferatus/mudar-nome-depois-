import { describe, it, expect } from 'vitest'
import { metrics } from '../lib/metrics'
import { buildWorkbook } from '../lib/excel'
import ExcelJS from 'exceljs'
import type { Data } from '../lib/types'
import { iso, addDays } from '../lib/date'

const d = (n: number) => iso(addDays(new Date(), n))
const data: Data = {
  version: 1, updatedAt: '', notes: [{ id: 'n', title: 'N', body: 'x', folder: 'G', tags: [], updatedAt: new Date().toISOString() }],
  projects: [{ id: 'p', name: 'BI', color: '#123456' }],
  events: [{ id: 'e', title: 'Daily', date: d(0), start: '09:00', end: '09:30', projectId: 'p' }],
  tasks: [
    { id: 'a', title: 'Atrasada', status: 'todo', priority: 'alta', due: d(-2), tags: [], createdAt: new Date().toISOString(), projectId: 'p', estimate: 2 },
    { id: 'b', title: 'Feita no prazo', status: 'done', priority: 'media', due: d(1), doneAt: d(0), tags: [], createdAt: new Date().toISOString() },
    { id: 'c', title: 'Feita atrasada', status: 'done', priority: 'media', due: d(-3), doneAt: d(-1), tags: [], createdAt: new Date().toISOString() },
    { id: 'e2', title: 'Próxima', status: 'doing', priority: 'baixa', due: d(3), tags: [], createdAt: new Date().toISOString(), estimate: 3 },
  ],
  settings: { theme: 'cafe', userName: '', weekStart: 1, autoExcel: true, autoCloud: true },
}

describe('metrics', () => {
  const m = metrics(data)
  it('conta abertas, concluídas e atrasadas', () => {
    expect(m.open).toBe(2); expect(m.done).toBe(2); expect(m.overdue).toBe(1)
  })
  it('calcula % no prazo', () => { expect(m.onTimeRate).toBe(50) })
  it('soma horas abertas e entregas em 7 dias', () => { expect(m.openHours).toBe(5); expect(m.dueSoon).toBe(1) })
  it('agrupa por projeto', () => { expect(m.byProject[0]).toMatchObject({ total: 1, done: 0, late: 1 }) })
})

describe('excel', () => {
  it('gera todas as abas com os dados', async () => {
    const blob = await buildWorkbook(data)
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await blob.arrayBuffer())
    const names = wb.worksheets.map(w => w.name)
    expect(names).toEqual(expect.arrayContaining(['Resumo', 'Tarefas', 'Agenda', 'Notas']))
    expect(names.length).toBe(7)
    const t = wb.getWorksheet('Tarefas')!
    const titles = Array.from({ length: 4 }, (_, i) => t.getCell(5 + i, 1).value)
    expect(titles).toContain('Atrasada')
  })
})
