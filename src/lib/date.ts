export const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => iso(new Date())
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const startOfWeek = (d: Date, ws: 0 | 1 = 1) => { const x = new Date(d); const diff = (x.getDay() - ws + 7) % 7; x.setDate(x.getDate() - diff); x.setHours(0, 0, 0, 0); return x }
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const fmt = (s?: string) => { if (!s) return '—'; const d = parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` }
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)
export const monthGrid = (y: number, m: number, ws: 0 | 1 = 1) => {
  const first = startOfWeek(new Date(y, m, 1), ws)
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}
export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
/** Fim padrão de um evento: 1h depois, sem passar de 23:59. */
export const plusHour = (t: string) => { const m = Math.min(toMin(t) + 60, 23 * 60 + 59); return `${pad(Math.floor(m / 60))}:${pad(m % 60)}` }
