import type { Data, Priority, Task, CalEvent, Note } from './types'
import { iso, addDays, WD, fmt } from './date'
import { metrics } from './metrics'
import { eventsOn } from './recur'

/*
 * Assistente do Kairotec — sem custo e sem treinar nada:
 *  • Local: Ollama no próprio PC (modelos já prontos, ex. qwen2.5:3b)
 *  • Copilot da empresa: o app monta o texto, você cola no Copilot e cola a resposta de volta
 * A IA nunca altera nada sozinha: ela devolve "ações" e você aprova.
 */

export type Action =
  | { tipo: 'criar_tarefa'; titulo: string; prazo?: string; projeto?: string; prioridade?: Priority; horas?: number }
  | { tipo: 'mover_prazo'; id: string; prazo: string }
  | { tipo: 'concluir'; id: string }
  | { tipo: 'subtarefas'; id: string; itens: string[] }
  | { tipo: 'criar_evento'; titulo: string; data: string; inicio: string; fim: string }
  | { tipo: 'criar_nota'; titulo: string; conteudo: string }
export interface Reply { resposta: string; acoes: Action[] }

const short = (id: string) => id.slice(0, 6)

/** Resumo compacto dos seus dados para a IA (sem expor tudo de uma vez). */
export function buildContext(d: Data, opts: { notas?: boolean } = {}) {
  const today = iso(new Date()), m = metrics(d), P = (id?: string) => d.projects.find(p => p.id === id)?.name ?? '—'
  const open = d.tasks.filter(t => t.status !== 'done').sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9')).slice(0, 40)
  const week = Array.from({ length: 7 }, (_, i) => iso(addDays(new Date(), i)))
  const lines = [
    `Hoje: ${WD[new Date().getDay()]} ${today}. Usuária: ${d.settings.userName || 'a usuária'}, técnica de logística (BI, Power BI, dados).`,
    `Projetos: ${d.projects.map(p => p.name).join(', ') || 'nenhum'}.`,
    `Indicadores: ${m.open} tarefas abertas, ${m.overdue} atrasadas, ${m.atRisk.length} em risco, ${m.onTimeRate}% entregues no prazo, ${m.openHours}h estimadas em aberto.`,
    '', 'TAREFAS ABERTAS (id | título | projeto | status | prioridade | prazo | horas est.):',
    ...open.map(t => `${short(t.id)} | ${t.title} | ${P(t.projectId)} | ${t.status} | ${t.priority} | ${t.due ?? '—'} | ${t.estimate ?? '—'}${t.checklist?.length ? ` | checklist ${t.checklist.filter(c => c.done).length}/${t.checklist.length}` : ''}`),
    '', 'AGENDA DOS PRÓXIMOS 7 DIAS:',
    ...week.flatMap(ds => eventsOn(d.events, ds).sort((a, b) => a.start.localeCompare(b.start)).map(e => `${ds} ${e.start}-${e.end} ${e.title}`)),
  ]
  if (opts.notas) {
    const recent = [...d.notes].filter(n => !n.trashed && !n.db).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
    lines.push('', 'NOTAS RECENTES:', ...recent.map(n => `## ${n.title}\n${n.body.slice(0, 1200)}`))
  }
  return lines.join('\n')
}

export const SYSTEM = `Você é o assistente do Kairotec, um planner pessoal. Responda em português do Brasil, de forma curta e prática.
Responda SEMPRE apenas com um JSON neste formato:
{"resposta": "texto para a usuária", "acoes": [ ... ]}
Ações possíveis (use só quando fizer sentido; os ids são os 6 primeiros caracteres mostrados):
{"tipo":"criar_tarefa","titulo":"...","prazo":"AAAA-MM-DD","projeto":"nome do projeto","prioridade":"baixa|media|alta","horas":2}
{"tipo":"mover_prazo","id":"abc123","prazo":"AAAA-MM-DD"}
{"tipo":"concluir","id":"abc123"}
{"tipo":"subtarefas","id":"abc123","itens":["passo 1","passo 2"]}
{"tipo":"criar_evento","titulo":"Foco: ...","data":"AAAA-MM-DD","inicio":"HH:MM","fim":"HH:MM"}
{"tipo":"criar_nota","titulo":"...","conteudo":"texto em markdown"}
Nunca invente ids. Evite marcar eventos por cima de reuniões existentes. Fins de semana são livres.`

export const PRESETS = [
  { l: '🗓 Planejar minha semana', p: 'Monte um plano para a minha semana: distribua blocos de foco nos horários livres (8h-17h) para as tarefas mais urgentes, sem conflitar com as reuniões.' },
  { l: '⚠️ O que está em risco?', p: 'Quais entregas estão atrasadas ou em risco? Sugira novos prazos realistas e o que priorizar hoje.' },
  { l: '✂️ Quebrar entrega em passos', p: 'Escolha a tarefa aberta mais complexa (mais horas) e quebre em subtarefas práticas.' },
  { l: '📝 Notas → tarefas', p: 'Leia minhas notas recentes e transforme os próximos passos e pendências em tarefas com prazo.', notas: true },
  { l: '📊 Status para o gestor', p: 'Escreva um status semanal curto (feito, próximos passos, riscos) e salve como nota.' },
]

/** Lê a resposta da IA (aceita JSON solto, dentro de ```json``` ou com texto em volta). */
export function parseReply(text: string): Reply {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fence ? fence[1] : text
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}')
  if (a >= 0 && b > a) {
    try {
      const j = JSON.parse(raw.slice(a, b + 1))
      const acoes = Array.isArray(j.acoes) ? j.acoes.filter(validAction) : []
      return { resposta: String(j.resposta ?? j.answer ?? '').trim() || (acoes.length ? 'Aqui está o que sugiro:' : ''), acoes }
    } catch { /* cai no texto puro */ }
  }
  return { resposta: text.trim(), acoes: [] }
}
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const isTime = (s: unknown) => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validAction(x: any): x is Action {
  if (!x || typeof x !== 'object') return false
  switch (x.tipo) {
    case 'criar_tarefa': return typeof x.titulo === 'string' && x.titulo.trim() !== '' && (x.prazo === undefined || isDate(x.prazo))
    case 'mover_prazo': return typeof x.id === 'string' && isDate(x.prazo)
    case 'concluir': return typeof x.id === 'string'
    case 'subtarefas': return typeof x.id === 'string' && Array.isArray(x.itens) && x.itens.length > 0
    case 'criar_evento': return typeof x.titulo === 'string' && isDate(x.data) && isTime(x.inicio) && isTime(x.fim) && x.fim > x.inicio
    case 'criar_nota': return typeof x.titulo === 'string' && typeof x.conteudo === 'string'
    default: return false
  }
}

const findTask = (d: Data, id: string) => d.tasks.find(t => t.id === id || t.id.startsWith(id))

/** Frase curta para a usuária conferir cada ação antes de aplicar. */
export function describe(d: Data, a: Action): string {
  const t = 'id' in a ? findTask(d, a.id) : undefined
  switch (a.tipo) {
    case 'criar_tarefa': return `Nova tarefa “${a.titulo}”${a.prazo ? ` · prazo ${fmt(a.prazo)}` : ''}${a.projeto ? ` · ${a.projeto}` : ''}${a.horas ? ` · ${a.horas}h` : ''}`
    case 'mover_prazo': return `Mudar prazo de “${t?.title ?? a.id}” para ${fmt(a.prazo)}`
    case 'concluir': return `Concluir “${t?.title ?? a.id}”`
    case 'subtarefas': return `Checklist em “${t?.title ?? a.id}”: ${a.itens.join(' · ')}`
    case 'criar_evento': return `Bloco “${a.titulo}” · ${fmt(a.data)} ${a.inicio}–${a.fim}`
    case 'criar_nota': return `Nova nota “${a.titulo}”`
  }
}

/** Aplica ações aprovadas e devolve os dados novos (função pura — fácil de testar e de desfazer). */
export function applyActions(d: Data, acoes: Action[]): Data {
  const now = new Date().toISOString(), id = () => 'ai' + Math.random().toString(36).slice(2, 9)
  let tasks: Task[] = [...d.tasks]
  const events: CalEvent[] = [...d.events], notes: Note[] = [...d.notes]
  for (const a of acoes) {
    if (a.tipo === 'criar_tarefa') {
      const projectId = d.projects.find(p => a.projeto && p.name.toLowerCase().includes(a.projeto.toLowerCase()))?.id
      tasks.push({ id: id(), title: a.titulo.trim(), status: 'todo', priority: a.prioridade ?? 'media', due: a.prazo, start: iso(new Date()), estimate: a.horas, projectId, tags: ['assistente'], createdAt: now })
    } else if (a.tipo === 'criar_evento') events.push({ id: id(), title: a.titulo, date: a.data, start: a.inicio, end: a.fim })
    else if (a.tipo === 'criar_nota') notes.push({ id: id(), title: a.titulo, body: a.conteudo, folder: 'Assistente', tags: ['assistente'], icon: '✨', updatedAt: now })
    else {
      const t = findTask({ ...d, tasks }, a.id); if (!t) continue
      const upd: Task = a.tipo === 'mover_prazo' ? { ...t, due: a.prazo }
        : a.tipo === 'concluir' ? { ...t, status: 'done', doneAt: iso(new Date()) }
          : { ...t, checklist: [...(t.checklist ?? []), ...a.itens.map(x => ({ id: id(), text: x, done: false }))] }
      tasks = tasks.map(x => x.id === t.id ? upd : x)
    }
  }
  return { ...d, tasks, events, notes, updatedAt: now }
}

/** Texto pronto para colar no Copilot da empresa. */
export const copilotPrompt = (d: Data, pedido: string, notas = false) =>
  `${SYSTEM}\n\n--- MEUS DADOS ---\n${buildContext(d, { notas })}\n\n--- PEDIDO ---\n${pedido}\n\nResponda só com o JSON.`

// ---------------- Ollama (local) ----------------
export const OLLAMA = 'http://localhost:11434'
export const SUGGESTED_MODEL = 'qwen2.5:3b'

type Http = (url: string, init?: { method?: string; body?: string }) => Promise<{ ok: boolean; status: number; text: string }>
export const httpLocal: Http = async (url, init) => {
  const desk = window.kairotecDesktop
  if (desk) return desk.fetch({ url, method: init?.method, headers: { 'Content-Type': 'application/json' }, body: init?.body })
  const r = await fetch(url, { method: init?.method, body: init?.body, headers: { 'Content-Type': 'application/json' } })
  return { ok: r.ok, status: r.status, text: await r.text() }
}

export async function ollamaModels(http: Http = httpLocal): Promise<string[] | null> {
  try { const r = await http(`${OLLAMA}/api/tags`); if (!r.ok) return null; return (JSON.parse(r.text).models ?? []).map((m: { name: string }) => m.name) } catch { return null }
}
export async function ollamaPull(model: string, http: Http = httpLocal) {
  const r = await http(`${OLLAMA}/api/pull`, { method: 'POST', body: JSON.stringify({ name: model, stream: false }) })
  if (!r.ok) throw new Error(`Não consegui baixar o modelo (${r.status})`)
}
export async function ollamaAsk(model: string, d: Data, pedido: string, history: { role: 'user' | 'assistant'; content: string }[], notas = false, http: Http = httpLocal): Promise<Reply> {
  const body = {
    model, stream: false, format: 'json', options: { temperature: 0.2, num_ctx: 8192 },
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `--- MEUS DADOS ---\n${buildContext(d, { notas })}` }, ...history.slice(-6), { role: 'user', content: pedido }],
  }
  const r = await http(`${OLLAMA}/api/chat`, { method: 'POST', body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`O modelo local respondeu ${r.status}`)
  return parseReply(JSON.parse(r.text).message?.content ?? '')
}

// ---------------- No aparelho (WebLLM: roda dentro do app, pela placa de vídeo — PC ou celular) ----------------
export const DEVICE_MODELS = [
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', l: 'Equilibrado', size: '≈1 GB' },
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', l: 'Leve (celulares simples)', size: '≈400 MB' },
  { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', l: 'Melhor (PC com boa placa)', size: '≈2 GB' },
]
export const deviceSupported = () => typeof navigator !== 'undefined' && 'gpu' in navigator

type Engine = { chat: { completions: { create: (b: unknown) => Promise<{ choices: { message: { content: string | null } }[] }> } } }
let engine: { id: string; e: Engine } | null = null
let loading: Promise<Engine> | null = null

/** Baixa (uma vez; fica guardado no aparelho) e carrega o modelo. */
export async function deviceLoad(model: string, onProgress?: (pct: number, text: string) => void): Promise<Engine> {
  if (engine?.id === model) return engine.e
  if (loading) return loading
  loading = (async () => {
    const web = await import('@mlc-ai/web-llm')
    const e = await web.CreateMLCEngine(model, { initProgressCallback: (r: { progress: number; text: string }) => onProgress?.(Math.round(r.progress * 100), r.text) }) as unknown as Engine
    engine = { id: model, e }
    return e
  })()
  try { return await loading } finally { loading = null }
}
export const deviceReady = (model: string) => engine?.id === model
export async function deviceCached(model: string) {
  try { const web = await import('@mlc-ai/web-llm'); return await web.hasModelInCache(model) } catch { return false }
}

export async function deviceAsk(model: string, d: Data, pedido: string, history: { role: 'user' | 'assistant'; content: string }[], notas = false): Promise<Reply> {
  const e = await deviceLoad(model)
  const r = await e.chat.completions.create({
    temperature: 0.2, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: SYSTEM + `\n\n--- MEUS DADOS ---\n${buildContext(d, { notas })}` }, ...history.slice(-4), { role: 'user', content: pedido }],
  })
  return parseReply(r.choices[0]?.message?.content ?? '')
}
