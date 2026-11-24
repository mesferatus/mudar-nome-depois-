import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Data, Task, CalEvent, Note, Project, Settings } from './types'
import { iso, addDays } from './date'
import { syncAll, loadHandles, type SyncState } from './sync'

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
      { id: uid(), title: 'Bem-vinda ao Kairotec', folder: 'Início', tags: ['guia'], updatedAt: now, pinned: true, body:
`# Bem-vinda 👋

Este é o seu caderno. Algumas dicas:

- Use **#tags** no texto para agrupar notas.
- Ligue notas com [[Ideias de BI]] — se a nota não existir, ela é criada ao clicar.
- \`Ctrl + K\` abre a paleta de comandos de qualquer lugar.
- Em **Ajustes** você conecta o arquivo de nuvem (OneDrive) e a planilha Excel.

- [ ] Conectar pasta do OneDrive
- [ ] Escolher a planilha de exportação
- [x] Abrir o app pela primeira vez` },
      { id: uid(), title: 'Ideias de BI', folder: 'Trabalho', tags: ['bi'], updatedAt: now, body: '# Ideias de BI\n\n- Lead time por fornecedor\n- Curva ABC de peças\n- OTIF semanal #logistica' },
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
  upsertProject: (p: Partial<Project> & { id?: string }) => Project
  removeProject: (id: string) => void
  setSettings: (s: Partial<Settings>) => void
  toast: (msg: string) => void
  toasts: { id: string; msg: string }[]
}
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
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([])
  const timer = useRef<number>()
  const first = useRef(true)

  const setSync = (s: Partial<SyncState>) => setSyncS(p => ({ ...p, ...s }))
  const toast = (msg: string) => { const id = uid(); setToasts(t => [...t, { id, msg }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800) }

  useEffect(() => { loadHandles().then(h => setSync({ cloudName: h.cloud?.name, excelName: h.excel?.name })) }, [])

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data))
    document.documentElement.dataset.theme = data.settings.theme
    if (first.current) { first.current = false; return }
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setSync({ status: 'saving' })
      syncAll(data).then(r => setSync({ status: r.error ? 'error' : 'saved', lastSaved: new Date().toLocaleTimeString('pt-BR'), error: r.error }))
    }, 1200)
  }, [data])

  const mut = (fn: (d: Data) => Data) => setData(d => ({ ...fn(d), updatedAt: new Date().toISOString() }))

  const api = useMemo<Omit<Ctx, 'data' | 'sync' | 'toasts'>>(() => ({
    setSync, toast,
    replaceAll: (d) => setData(d),
    upsertTask: (t) => {
      let res!: Task
      mut(d => {
        const prev = d.tasks.find(x => x.id === t.id)
        res = { tags: [], status: 'todo', priority: 'media', title: 'Nova tarefa', createdAt: new Date().toISOString(), ...prev, ...t, id: t.id ?? uid() } as Task
        if (res.status === 'done' && !res.doneAt) res.doneAt = iso(new Date())
        if (res.status !== 'done') res.doneAt = undefined
        return { ...d, tasks: upsert(d.tasks, res) }
      })
      return res
    },
    removeTask: (id) => mut(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== id) })),
    upsertEvent: (e) => {
      let res!: CalEvent
      mut(d => { res = { title: 'Novo evento', date: iso(new Date()), start: '09:00', end: '10:00', ...d.events.find(x => x.id === e.id), ...e, id: e.id ?? uid() } as CalEvent; return { ...d, events: upsert(d.events, res) } })
      return res
    },
    removeEvent: (id) => mut(d => ({ ...d, events: d.events.filter(x => x.id !== id) })),
    upsertNote: (n) => {
      let res!: Note
      mut(d => { res = { title: 'Sem título', body: '', folder: 'Geral', tags: [], ...d.notes.find(x => x.id === n.id), ...n, id: n.id ?? uid(), updatedAt: new Date().toISOString() } as Note; return { ...d, notes: upsert(d.notes, res) } })
      return res
    },
    removeNote: (id) => mut(d => ({ ...d, notes: d.notes.filter(x => x.id !== id) })),
    upsertProject: (p) => {
      let res!: Project
      mut(d => { res = { name: 'Projeto', color: '#8a8f98', ...d.projects.find(x => x.id === p.id), ...p, id: p.id ?? uid() } as Project; return { ...d, projects: upsert(d.projects, res) } })
      return res
    },
    removeProject: (id) => mut(d => ({ ...d, projects: d.projects.filter(x => x.id !== id), tasks: d.tasks.map(t => t.projectId === id ? { ...t, projectId: undefined } : t) })),
    setSettings: (s) => mut(d => ({ ...d, settings: { ...d.settings, ...s } })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  return <StoreCtx.Provider value={{ data, sync, toasts, ...api }}>{children}</StoreCtx.Provider>
}

export const useProject = (id?: string) => useStore().data.projects.find(p => p.id === id)
