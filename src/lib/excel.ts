import ExcelJS from 'exceljs'
import type { Data } from './types'
import { STATUS_LABEL, PRIORITY_LABEL } from './types'
import { MONTHS, WD, iso, monthGrid, parse, today } from './date'
import { metrics } from './metrics'

const INK = 'FF4A1A26', PAPER = 'FFFBF3E6', LINE = 'FFE2D2C4', MUTED = 'FF8A6A6F', ACCENT = 'FF4A1A26'
const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const border = (c = LINE): Partial<ExcelJS.Borders> => ({ top: { style: 'thin', color: { argb: c } }, left: { style: 'thin', color: { argb: c } }, bottom: { style: 'thin', color: { argb: c } }, right: { style: 'thin', color: { argb: c } } })
const hex = (c?: string) => 'FF' + (c ?? '#8a8f98').replace('#', '').toUpperCase()
const FONT = 'Georgia'
const STATUS_FILL: Record<string, string> = { todo: 'FFCBDDE6', doing: 'FFF3D6DE', review: 'FFF6E7C8', done: 'FFE8D5D9' }

function title(ws: ExcelJS.Worksheet, text: string, sub: string, span: number) {
  ws.mergeCells(1, 1, 1, span); ws.mergeCells(2, 1, 2, span)
  const a = ws.getCell(1, 1); a.value = text; a.font = { name: FONT, size: 20, bold: true, color: { argb: INK } }
  const b = ws.getCell(2, 1); b.value = sub; b.font = { name: FONT, size: 10, color: { argb: MUTED } }
  ws.getRow(1).height = 34; ws.getRow(2).height = 18
}
function header(row: ExcelJS.Row) {
  row.height = 24
  row.eachCell(c => { c.fill = fill(INK); c.font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }; c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 } })
}
function bg(ws: ExcelJS.Worksheet) { ws.properties.defaultRowHeight = 20; ws.views = [{ showGridLines: false }] }

export async function buildWorkbook(d: Data): Promise<Blob> {
  const wb = new ExcelJS.Workbook(); wb.creator = 'Kairotec'; wb.created = new Date()
  const proj = (id?: string) => d.projects.find(p => p.id === id)
  const m = metrics(d)

  // ---------- Resumo ----------
  const rs = wb.addWorksheet('Resumo', { properties: { tabColor: { argb: ACCENT } } }); bg(rs)
  rs.columns = [{ width: 4 }, { width: 26 }, { width: 18 }, { width: 4 }, { width: 26 }, { width: 18 }]
  title(rs, 'Kairotec · Resumo', `Atualizado em ${new Date().toLocaleString('pt-BR')}`, 6)
  const kpis: [string, string | number][] = [
    ['Tarefas ativas', m.open], ['Concluídas', m.done], ['Atrasadas', m.overdue],
    ['Entregas no prazo', `${m.onTimeRate}%`], ['Horas planejadas (abertas)', m.openHours], ['Próximos 7 dias', m.dueSoon],
  ]
  kpis.forEach(([k, v], i) => {
    const r = 4 + Math.floor(i / 2) * 3, c = i % 2 ? 5 : 2
    const lc = rs.getCell(r, c), vc = rs.getCell(r + 1, c)
    lc.value = k.toUpperCase(); lc.font = { name: FONT, size: 8, bold: true, color: { argb: MUTED } }
    vc.value = v; vc.font = { name: FONT, size: 22, bold: true, color: { argb: k === 'Atrasadas' && m.overdue ? 'FFC4453C' : INK } }
    vc.alignment = { horizontal: 'left' }
    rs.getRow(r + 1).height = 30
    for (const cell of [lc, vc]) cell.fill = fill(PAPER)
    rs.getCell(r, c + 1).fill = fill(PAPER); rs.getCell(r + 1, c + 1).fill = fill(PAPER)
  })
  let r0 = 14
  rs.getCell(r0, 2).value = 'POR PROJETO'; rs.getCell(r0, 2).font = { name: FONT, size: 8, bold: true, color: { argb: MUTED } }
  const hr = rs.getRow(r0 + 1); hr.getCell(2).value = 'Projeto'; hr.getCell(3).value = 'Progresso'; hr.getCell(5).value = 'Abertas / Total'; header(hr)
  m.byProject.forEach((p, i) => {
    const row = rs.getRow(r0 + 2 + i)
    row.getCell(2).value = p.name; row.getCell(2).font = { name: FONT, bold: true, color: { argb: hex(p.color) } }
    row.getCell(3).value = p.total ? p.done / p.total : 0; row.getCell(3).numFmt = '0%'
    row.getCell(5).value = `${p.total - p.done} / ${p.total}`
    ;[2, 3, 5].forEach(c => row.getCell(c).border = { bottom: { style: 'thin', color: { argb: LINE } } })
  })
  r0 = r0 + 2 + m.byProject.length
  if (m.byProject.length) rs.addConditionalFormatting({ ref: `C16:C${r0 - 1}`, rules: [{ type: 'dataBar', priority: 1, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }], color: { argb: ACCENT }, gradient: false } as unknown as ExcelJS.ConditionalFormattingRule] })

  // ---------- Planner (mês atual + 2) ----------
  const now = new Date()
  for (let k = 0; k < 3; k++) {
    const y = new Date(now.getFullYear(), now.getMonth() + k, 1)
    const ws = wb.addWorksheet(`${MONTHS[y.getMonth()].slice(0, 3)} ${y.getFullYear()}`, { properties: { tabColor: { argb: k === 0 ? 'FF6FBF8E' : 'FFB8B2A6' } }, pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 } }); bg(ws)
    ws.columns = Array.from({ length: 7 }, () => ({ width: 24 }))
    title(ws, `${MONTHS[y.getMonth()]} ${y.getFullYear()}`, 'Planner mensal · eventos e entregas', 7)
    const order = d.settings.weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
    const h = ws.getRow(4); order.forEach((wd, i) => h.getCell(i + 1).value = WD[wd].toUpperCase()); header(h); h.eachCell(c => c.alignment = { horizontal: 'center', vertical: 'middle' })
    const grid = monthGrid(y.getFullYear(), y.getMonth(), d.settings.weekStart)
    for (let w = 0; w < 6; w++) {
      const numRow = ws.getRow(5 + w * 2), bodyRow = ws.getRow(6 + w * 2)
      numRow.height = 18; bodyRow.height = 78
      for (let c = 0; c < 7; c++) {
        const day = grid[w * 7 + c], ds = iso(day), inMonth = day.getMonth() === y.getMonth()
        const items = [
          ...d.events.filter(e => e.date === ds).sort((a, b) => a.start.localeCompare(b.start)).map(e => `◷ ${e.start} ${e.title}`),
          ...d.tasks.filter(t => t.due === ds).map(t => `${t.status === 'done' ? '✓' : '◆'} ${t.title}`),
        ]
        const n = numRow.getCell(c + 1), b = bodyRow.getCell(c + 1)
        n.value = day.getDate()
        n.font = { name: FONT, bold: true, size: 10, color: { argb: ds === today() ? 'FFFFFFFF' : inMonth ? INK : 'FFC9C3B8' } }
        n.fill = fill(ds === today() ? ACCENT : inMonth ? PAPER : 'FFFFFFFF'); n.alignment = { horizontal: 'right', indent: 1 }
        b.value = items.join('\n'); b.alignment = { wrapText: true, vertical: 'top' }
        b.font = { name: FONT, size: 9, color: { argb: inMonth ? INK : 'FFC9C3B8' } }
        n.border = { top: { style: 'thin', color: { argb: LINE } }, left: { style: 'thin', color: { argb: LINE } }, right: { style: 'thin', color: { argb: LINE } } }
        b.border = { bottom: { style: 'thin', color: { argb: LINE } }, left: { style: 'thin', color: { argb: LINE } }, right: { style: 'thin', color: { argb: LINE } } }
        if (c >= 5 && d.settings.weekStart === 1) { if (inMonth) n.fill = fill('FFCBDDE6'); b.fill = fill(inMonth ? 'FFE9F1F5' : 'FFFFFFFF') }
      }
    }
  }

  // ---------- Tarefas ----------
  const ts = wb.addWorksheet('Tarefas', { properties: { tabColor: { argb: 'FFE0A458' } }, views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
  ts.columns = [{ width: 44 }, { width: 20 }, { width: 16 }, { width: 11 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 14 }, { width: 22 }]
  title(ts, 'Tarefas', `${d.tasks.length} itens`, 10)
  const th = ts.getRow(4); th.values = ['Tarefa', 'Projeto', 'Status', 'Prioridade', 'Início', 'Prazo', 'Concluída', 'Horas', 'Situação', 'Tags']; header(th)
  const sorted = [...d.tasks].sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'))
  sorted.forEach((t, i) => {
    const late = t.due && (t.status !== 'done' ? t.due < today() : (t.doneAt ?? '') > t.due)
    const sit = t.status === 'done' ? (late ? 'Entregue c/ atraso' : 'No prazo') : late ? 'Atrasada' : 'Em dia'
    const row = ts.getRow(5 + i)
    row.values = [t.title, proj(t.projectId)?.name ?? '—', STATUS_LABEL[t.status], PRIORITY_LABEL[t.priority], t.start ? parse(t.start) : '', t.due ? parse(t.due) : '', t.doneAt ? parse(t.doneAt) : '', t.estimate ?? '', sit, t.tags.join(', ')]
    row.height = 22
    row.eachCell({ includeEmpty: true }, (c, col) => {
      c.font = { name: FONT, size: 10, color: { argb: INK } }; c.alignment = { vertical: 'middle', indent: col === 1 ? 1 : 0 }
      c.border = { bottom: { style: 'thin', color: { argb: LINE } } }
      if (i % 2) c.fill = fill('FFFCFBF9')
    })
    ;[5, 6, 7].forEach(c => row.getCell(c).numFmt = 'dd/mm/yyyy')
    row.getCell(2).font = { name: FONT, size: 10, bold: true, color: { argb: hex(proj(t.projectId)?.color) } }
    row.getCell(3).fill = fill(STATUS_FILL[t.status]); row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(9).font = { name: FONT, size: 10, bold: true, color: { argb: sit === 'Atrasada' || sit.includes('atraso') ? 'FFC4453C' : 'FF3F8F5F' } }
  })
  if (sorted.length) ts.autoFilter = { from: 'A4', to: `J${4 + sorted.length}` }

  // ---------- Agenda ----------
  const as = wb.addWorksheet('Agenda', { properties: { tabColor: { argb: 'FF5B8DEF' } } }); bg(as)
  as.columns = [{ width: 14 }, { width: 10 }, { width: 10 }, { width: 40 }, { width: 20 }, { width: 22 }]
  title(as, 'Agenda', 'Compromissos', 6)
  const ah = as.getRow(4); ah.values = ['Data', 'Início', 'Fim', 'Evento', 'Projeto', 'Local']; header(ah)
  ;[...d.events].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).forEach((e, i) => {
    const row = as.getRow(5 + i); row.values = [parse(e.date), e.start, e.end, e.title, proj(e.projectId)?.name ?? '—', e.location ?? '']
    row.getCell(1).numFmt = 'ddd dd/mm/yy'
    row.eachCell({ includeEmpty: true }, c => { c.font = { name: FONT, size: 10 }; c.border = { bottom: { style: 'thin', color: { argb: LINE } } } })
    row.getCell(1).fill = fill(hex(proj(e.projectId)?.color).replace(/^FF/, '33'))
  })

  // ---------- Notas ----------
  const ns = wb.addWorksheet('Notas', { properties: { tabColor: { argb: 'FF9B7FD1' } } }); bg(ns)
  ns.columns = [{ width: 30 }, { width: 16 }, { width: 20 }, { width: 90 }, { width: 18 }]
  title(ns, 'Notas', `${d.notes.length} páginas`, 5)
  const nh = ns.getRow(4); nh.values = ['Título', 'Pasta', 'Tags', 'Conteúdo', 'Atualizada']; header(nh)
  d.notes.forEach((n, i) => {
    const row = ns.getRow(5 + i); row.values = [n.title, n.folder, n.tags.join(', '), n.body, new Date(n.updatedAt)]
    row.getCell(5).numFmt = 'dd/mm/yy hh:mm'
    row.eachCell({ includeEmpty: true }, c => { c.font = { name: FONT, size: 10 }; c.alignment = { wrapText: true, vertical: 'top' }; c.border = border() })
    row.getCell(1).font = { name: FONT, size: 10, bold: true }
  })
  return new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
