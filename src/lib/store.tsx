import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Data, Task, CalEvent, Note, Project, Settings } from './types'
import { iso, addDays, parse } from './date'
import { syncAll, loadHandles, type SyncState } from './sync'
import { pullSync, pushSync, syncConnected } from './cloudsync'
import { DOODLES } from './art'
import { logoSvg } from '../components/Logo'

const KEY = 'kairotec:data'
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

function seed(): Data {
  const t = new Date(), d = (n: number) => iso(addDays(t, n)), now = new Date().toISOString()
  const projects: Project[] = [
    { id: 'p1', name: 'BI Logística', color: '#e6a87c' },
    { id: 'p2', name: 'Software interno', color: '#b9c7e8' },
    { id: 'p3', name: 'Pessoal', color: '#9fcf9a' },
  ]
  const mk = (title: string, projectId: string, status: Task['status'], priority: Task['priority'], start: number, due: number, est = 4): Task =>
    ({ id: uid(), title, projectId, status, priority, start: d(start), due: d(due), estimate: est, tags: [], createdAt: now, doneAt: status === 'done' ? d(due - 1) : undefined })
  return {
    version: 1, updatedAt: now,
    projects,
    tasks: [
      mk('Dashboard de inbound – revisão de KPIs', 'p1', 'doing', 'alta', -3, 2, 6),
      mk('Modelo de dados de estoque (Power BI)', 'p1', 'todo', 'media', 1, 6, 8),
      mk('Validar base de fornecedores', 'p1', 'done', 'media', -6, -2, 3),
      mk('Protótipo do app de rastreio', 'p2', 'review', 'alta', -5, -1, 10),
      mk('Levantar requisitos com o time', 'p2', 'todo', 'baixa', 3, 10, 2),
      mk('Organizar estudos da semana', 'p3', 'todo', 'baixa', 0, 4, 1),
    ],
    events: [
      { id: uid(), title: 'Daily logística', date: d(0), start: '09:00', end: '09:30', projectId: 'p1' },
      { id: uid(), title: 'Review do dashboard', date: d(1), start: '14:00', end: '15:00', projectId: 'p1' },
      { id: uid(), title: 'Alinhamento app interno', date: d(2), start: '10:30', end: '11:30', projectId: 'p2' },
    ],
    notes: [
      { id: 'n-welcome', title: 'Bem-vinda ao Kairotec', icon: '🌸', cover: 'coracoes', folder: 'Início', tags: ['guia'], updatedAt: now, pinned: true, expanded: true, body:
`> 🌸 Este é o seu caderno. Funciona como o Notion: cada linha é um bloco.
## Como usar
- Digite **/** numa linha vazia para escolher: título, lista, tarefa, destaque, alternância, código…
- Atalhos: **# ** vira título, **- ** vira lista, **[] ** vira tarefa, **> ** vira citação.
- Ligue páginas com [[Ideias de BI]] — se não existir, ela é criada.
- Passe o mouse à esquerda de um bloco: **+** adiciona e **⋮⋮** arrasta.
- Clique no ícone e na capa para trocar.
<details><summary>Atalhos do app</summary>
Ctrl+K abre a busca · N cria tarefa · Alt+1…6 troca de aba
</details>
## Primeiros passos
- [ ] Conectar pasta do OneDrive
- [ ] Escolher a planilha de exportação
- [x] Abrir o app pela primeira vez` },
      { id: uid(), title: 'Ideias de BI', icon: '📊', cover: 'cafe', parentId: 'n-welcome', folder: 'Trabalho', tags: ['bi'], updatedAt: now, body: '# Ideias de BI\n\n- Lead time por fornecedor\n- Curva ABC de peças\n- OTIF semanal #logistica' },
    ],
    settings: { theme: 'cafe', userName: '', weekStart: 1, autoExcel: true, autoCloud: true },
  }
}

function load(): Data {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = { ...seed(), ...JSON.parse(raw) }; if (['grafite', 'papel', 'floresta', 'noite', 'areia'].includes(d.settings.theme)) d.settings = { ...d.settings, theme: 'cafe' }; return d } } catch { /* ignore */ }
  return seed()
}

type Ctx = {
  data: Data
  sync: SyncState
  setSync: (s: Partial<SyncState>) => void
  replaceAll: (d: Data) => void
  upsertTask: (t: Partial<Task> & { id?: string }) => Task
  removeTask: (id: string) => void
  upsertEvent: (e: Partial<CalEvent> & { id?: string }) => CalEvent
  removeEvent: (id: string) => void
  upsertNote: (n: Partial<Note> & { id?: string }) => Note
  removeNote: (id: string) => void
  restoreNote: (id: string) => void
  purgeNote: (id: string) => void
  upsertProject: (p: Partial<Project> & { id?: string }) => Project
  removeProject: (id: string) => void
  setSettings: (s: Partial<Settings>) => void
  startTimer: (taskId: string, mode?: 'livre' | 'pomodoro') => void
  stopTimer: () => number
  toast: (msg: string, action?: ToastAction) => void
  toasts: { id: string; msg: string; action?: ToastAction }[]
}
export type ToastAction = { label: string; run: () => void }
const StoreCtx = createContext<Ctx>(null!)
export const useStore = () => useContext(StoreCtx)

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex(x => x.id === item.id)
  if (i < 0) return [...list, item]
  const c = [...list]; c[i] = item; return c
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(load)
  const [sync, setSyncS] = useState<SyncState>({ cloudName: undefined, excelName: undefined, status: 'idle' })
  const [toasts, setToasts] = useState<{ id: string; msg: string; action?: ToastAction }[]>([])
  const timer = useRef<number>()
  const skipPush = useRef(false)
  // busca a versão da nuvem ao abrir, ao voltar para o app e a cada 2 min
  useEffect(() => {
    const pull = () => { if (!syncConnected()) return; pullSync(ref.current).then(d => { if (d) { skipPush.current = d.updatedAt === ref.current.updatedAt; ref.current = d; setData(d); setSync({ cloudSync: 'ok' }) } }).catch(() => setSync({ cloudSync: 'erro' })) }
    pull()
    const v = () => { if (document.visibilityState === 'visible') pull() }
    document.addEventListener('visibilitychange', v); window.addEventListener('focus', pull); const i = setInterval(pull, 120000)
    return () => { document.removeEventListener('visibilitychange', v); window.removeEventListener('focus', pull); clearInterval(i) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const first = useRef(true)

  const setSync = (s: Partial<SyncState>) => setSyncS(p => ({ ...p, ...s }))
  const toast = (msg: string, action?: ToastAction) => { const id = uid(); setToasts(t => [...t.slice(-2), { id, msg, action }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), action ? 6000 : 2800) }

  useEffect(() => { loadHandles().then(h => setSync({ cloudName: h.cloud?.name, excelName: h.excel?.name })) }, [])

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data))
    document.documentElement.dataset.theme = data.settings.theme
    document.documentElement.style.setProperty('--doodle', DOODLES[data.settings.theme] ?? 'none')
    // favicon e cor da barra com as cores do tema
    requestAnimationFrame(() => {
      const cs = getComputedStyle(document.documentElement), v = (k: string) => cs.getPropertyValue(k).trim()
      const svg = logoSvg({ bg1: v('--logo-bg1'), bg2: v('--logo-bg2'), top: v('--logo-top'), low1: v('--logo-low1'), low2: v('--logo-low2') })
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]'); if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(svg)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', v('--bg'))
    })
    if (first.current) { first.current = false; return }
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setSync({ status: 'saving' })
      const cloud = skipPush.current ? Promise.resolve() : pushSync(data).then(() => setSync({ cloudSync: 'ok' })).catch(e => setSync({ cloudSync: 'erro', error: `Sincronização: ${(e as Error).message}` }))
      skipPush.current = false
      Promise.all([syncAll(data), cloud]).then(([r]) => setSync({ status: r.error ? 'error' : 'saved', lastSaved: new Date().toLocaleTimeString('pt-BR'), error: r.error }))
    }, 1200)
  }, [data])

  const ref = useRef(data); ref.current = data
  const mut = (fn: (d: Data) => Data) => setData(d => { const n = { ...fn(d), updatedAt: new Date().toISOString() }; ref.current = n; return n })
  const snap = useRef<Data | null>(null)
  const keep = () => { snap.current = ref.current }
  const undoable = (msg: string) => { toast(msg, { label: 'Desfazer', run: () => { if (snap.current) { const s = snap.current; snap.current = null; setData(s); ref.current = s } } }) }

  const stopTimer = () => {
    const t = ref.current.timer; if (!t) return 0
    const end = new Date().toISOString(), mins = (new Date(end).getTime() - new Date(t.start).getTime()) / 60000
    mut(d => ({ ...d, timer: undefined, tasks: mins < 1 ? d.tasks : d.tasks.map(x => x.id === t.taskId ? { ...x, timeLog: [...(x.timeLog ?? []), { start: t.start, end }] } : x) }))
    return Math.round(mins)
  }

  const api = useMemo<Omit<Ctx, 'data' | 'sync' | 'toasts'>>(() => ({
    setSync, toast,
    replaceAll: (d) => { ref.current = d; setData(d) },
    upsertTask: (t) => {
      const d0 = ref.current, prev = d0.tasks.find(x => x.id === t.id)
      const res = { tags: [], status: 'todo', priority: 'media', title: 'Nova tarefa', createdAt: new Date().toISOString(), ...prev, ...t, id: t.id ?? uid() } as Task
      if (res.status === 'done' && !res.doneAt) res.doneAt = iso(new Date())
      if (res.status !== 'done') res.doneAt = undefined
      // tarefa recorrente: ao concluir, nasce a próxima
      let next: Task | undefined
      if (res.repeat && res.status === 'done' && prev?.status !== 'done') {
        const base = parse(res.due ?? iso(new Date()))
        const nd = res.repeat === 'diaria' ? addDays(base, 1) : res.repeat === 'semanal' ? addDays(base, 7) : new Date(base.getFullYear(), base.getMonth() + 1, base.getDate())
        next = { ...res, id: uid(), status: 'todo', doneAt: undefined, due: iso(nd), start: iso(nd), createdAt: new Date().toISOString(), checklist: res.checklist?.map(c => ({ ...c, done: false })) }
      }
      mut(d => ({ ...d, tasks: next ? [...upsert(d.tasks, res), next] : upsert(d.tasks, res) }))
      return res
    },
    removeTask: (id) => { const t = ref.current.tasks.find(x => x.id === id); keep(); mut(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== id) })); undoable(`"${t?.title ?? 'Tarefa'}" excluída`) },
    upsertEvent: (e) => {
      const res = { title: 'Novo evento', date: iso(new Date()), start: '09:00', end: '10:00', ...ref.current.events.find(x => x.id === e.id), ...e, id: e.id ?? uid() } as CalEvent
      mut(d => ({ ...d, events: upsert(d.events, res) })); return res
    },
    removeEvent: (id) => { keep(); mut(d => ({ ...d, events: d.events.filter(x => x.id !== id) })); undoable('Evento excluído') },
    upsertNote: (n) => {
      const res = { title: 'Sem título', body: '', folder: 'Geral', tags: [], ...ref.current.notes.find(x => x.id === n.id), ...n, id: n.id ?? uid(), updatedAt: new Date().toISOString() } as Note
      mut(d => ({ ...d, notes: upsert(d.notes, res) })); return res
    },
    removeNote: (id) => {
      const n = ref.current.notes.find(x => x.id === id)
      const all = new Set([id]); let grew = true
      while (grew) { grew = false; for (const x of ref.current.notes) if (x.parentId && all.has(x.parentId) && !all.has(x.id)) { all.add(x.id); grew = true } }
      keep(); mut(d => ({ ...d, notes: d.notes.map(x => all.has(x.id) ? { ...x, trashed: true } : x) }))
      undoable(`"${n?.title || 'Página'}" foi para a lixeira`)
    },
    restoreNote: (id) => {
      const n = ref.current.notes.find(x => x.id === id)
      const parentGone = n?.parentId && ref.current.notes.find(x => x.id === n.parentId)?.trashed
      mut(d => ({ ...d, notes: d.notes.map(x => x.id === id || (x.parentId === id && x.trashed) ? { ...x, trashed: false, ...(x.id === id && parentGone ? { parentId: undefined } : {}) } : x) }))
    },
    purgeNote: (id) => { keep(); mut(d => ({ ...d, notes: d.notes.filter(x => x.id !== id && x.parentId !== id) })); undoable('Excluída para sempre') },
    upsertProject: (p) => {
      const res = { name: 'Projeto', color: '#8a8f98', ...ref.current.projects.find(x => x.id === p.id), ...p, id: p.id ?? uid() } as Project
      mut(d => ({ ...d, projects: upsert(d.projects, res) })); return res
    },
    removeProject: (id) => { keep(); undoable('Projeto removido'); mut(d => ({ ...d, projects: d.projects.filter(x => x.id !== id), tasks: d.tasks.map(t => t.projectId === id ? { ...t, projectId: undefined } : t) })) },
    startTimer: (taskId, mode = 'pomodoro') => {
      const cur = ref.current.timer
      if (cur) stopTimer()
      mut(d => ({ ...d, timer: { taskId, start: new Date().toISOString(), mode }, tasks: d.tasks.map(t => t.id === taskId && t.status === 'todo' ? { ...t, status: 'doing' } : t) }))
    },
    stopTimer,
    setSettings: (s) => mut(d => ({ ...d, settings: { ...d.settings, ...s } })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  return <StoreCtx.Provider value={{ data, sync, toasts, ...api }}>{children}</StoreCtx.Provider>
}

export const useProject = (id?: string) => useStore().data.projects.find(p => p.id === id)
