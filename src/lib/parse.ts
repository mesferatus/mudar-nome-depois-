import type { Priority, Project } from './types'
import { addDays, iso, pad, plusHour } from './date'

/*
 * Interpreta uma frase em português e devolve o que criar.
 *   "Reunião com fornecedor amanhã 14h #bi"        → evento amanhã 14:00–15:00 no projeto BI
 *   "Entregar dashboard sexta !alta ~4h"           → tarefa com prazo na sexta, prioridade alta, 4h
 *   "nota: ideias para o modelo de estoque #ideia" → nota
 */
export type Kind = 'task' | 'event' | 'note'
export interface Parsed {
  kind: Kind
  title: string
  date?: string
  start?: string
  end?: string
  projectId?: string
  priority?: Priority
  estimate?: number
  repeat?: 'diaria' | 'semanal' | 'mensal'
  tags: string[]
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const WEEK: Record<string, number> = { dom: 0, domingo: 0, seg: 1, segunda: 1, ter: 2, terca: 2, qua: 3, quarta: 3, qui: 4, quinta: 4, sex: 5, sexta: 5, sab: 6, sabado: 6 }

export function parseQuick(input: string, projects: Project[], now = new Date()): Parsed {
  let s = ` ${input.trim()} `
  const out: Parsed = { kind: 'task', title: '', tags: [] }
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = s.match(re); if (m) { fn(m); s = s.replace(m[0], ' ') }
  }

  // tipo explícito
  take(/^\s*(nota|note)\s*:\s*/i, () => { out.kind = 'note' })
  take(/^\s*(evento|reuniao|reunião)\s*:\s*/i, () => { out.kind = 'event' })
  take(/^\s*(tarefa|task)\s*:\s*/i, () => { out.kind = 'task' })

  // recorrência: "todo dia", "toda segunda", "semanal", "mensal"
  take(/\s(todo dia|todos os dias|diariamente)(?=\s)/i, () => { out.repeat = 'diaria' })
  take(/\s(toda semana|semanalmente|semanal)(?=\s)/i, () => { out.repeat = 'semanal' })
  take(/\s(todo m[eê]s|mensalmente|mensal)(?=\s)/i, () => { out.repeat = 'mensal' })
  take(/\s(?:tod[ao]s? ?a?s?) (domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado)s?(?:-feira)?(?=\s)/i, m => {
    out.repeat = 'semanal'; s = s + ` ${m[1]} `
  })

  // estimativa (~3h, ~30min)
  take(/\s~(\d+(?:[.,]\d+)?)\s*(h|min)\b/i, m => { const v = Number(m[1].replace(',', '.')); out.estimate = m[2].toLowerCase() === 'min' ? Math.round((v / 60) * 10) / 10 : v })

  // prioridade
  take(/\s(!alta|!!|urgente)(?=\s)/i, () => { out.priority = 'alta' })
  take(/\s(!media|!média|!)(?=\s)/i, () => { out.priority = 'media' })
  take(/\s(!baixa)(?=\s)/i, () => { out.priority = 'baixa' })

  // horário: 14h, 14h30, 14:30, às 9, 14h-15h, 14h às 16h
  const T = String.raw`(\d{1,2})(?:(?:h|:)(\d{2})?|h)`
  take(new RegExp(String.raw`\s(?:as|às)?\s?${T}\s?(?:-|ate|até|as|às|a)\s?${T}(?=\s)`, 'i'), m => {
    out.start = `${pad(+m[1])}:${m[2] ?? '00'}`; out.end = `${pad(+m[3])}:${m[4] ?? '00'}`
  })
  if (!out.start) take(new RegExp(String.raw`\s(?:as|às)?\s?${T}(?=\s)`, 'i'), m => { out.start = `${pad(+m[1])}:${m[2] ?? '00'}` })
  if (!out.start) take(/\s(?:as|às)\s(\d{1,2})(?=\s)/i, m => { out.start = `${pad(+m[1])}:00` })
  if (out.start && !out.end) out.end = plusHour(out.start)

  // datas
  const base = new Date(now); base.setHours(12, 0, 0, 0)
  take(/\sdepois de amanh[aã](?=\s)/i, () => { out.date = iso(addDays(base, 2)) })
  if (!out.date) take(/\samanh[aã](?=\s)/i, () => { out.date = iso(addDays(base, 1)) })
  if (!out.date) take(/\shoje(?=\s)/i, () => { out.date = iso(base) })
  if (!out.date) take(/\s(?:semana que vem|pr[oó]xima semana)(?=\s)/i, () => { out.date = iso(addDays(base, 7)) })
  if (!out.date) take(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, m => {
    let y = m[3] ? +m[3] : base.getFullYear(); if (y < 100) y += 2000
    const d = new Date(y, +m[2] - 1, +m[1], 12)
    if (!m[3] && d < base) d.setFullYear(y + 1)
    out.date = iso(d)
  })
  if (!out.date) take(/\sdia (\d{1,2})(?=\s)/i, m => {
    const d = new Date(base.getFullYear(), base.getMonth(), +m[1], 12)
    if (d < base) d.setMonth(d.getMonth() + 1)
    out.date = iso(d)
  })
  if (!out.date) take(/\s(?:na |no |n[ao] pr[oó]xim[ao] |pr[oó]xim[ao] |at[eé] |at[eé] [ao] )?(domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|dom|seg|ter|qua|qui|sex|s[aá]b)(?:-feira)?(?=\s)/i, m => {
    const wd = WEEK[norm(m[1])]; let diff = (wd - base.getDay() + 7) % 7; if (diff === 0) diff = 7
    out.date = iso(addDays(base, diff))
  })

  // #projeto ou #tag
  s = s.replace(/\s#([\p{L}\w-]+)/gu, (_, t: string) => {
    const p = projects.find(p => norm(p.name).replace(/\s/g, '').startsWith(norm(t)) || norm(p.name).split(/\s+/).some(w => w === norm(t)))
    if (p && !out.projectId) out.projectId = p.id; else out.tags.push(t)
    return ' '
  })

  if (out.kind === 'task' && out.start) out.kind = 'event'
  out.title = s.replace(/\s+/g, ' ').trim()
  return out
}
