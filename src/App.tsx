import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StoreProvider, useStore } from './lib/store'
import { EditorsProvider, useEditors } from './components/editors'
import { Icon, spring } from './components/ui'
import Dashboard from './views/Dashboard'
import Planner from './views/Planner'
import Agenda from './views/Agenda'
import Board from './views/Board'
import Notes from './views/Notes'
import Routines from './views/Routines'
import Settings, { THEMES } from './views/Settings'

const NAV = [
  { id: 'painel', l: 'Painel', i: 'home', k: '1', C: Dashboard },
  { id: 'planner', l: 'Planner', i: 'grid', k: '2', C: Planner },
  { id: 'agenda', l: 'Agenda', i: 'cal', k: '3', C: Agenda },
  { id: 'entregas', l: 'Entregas', i: 'board', k: '4', C: Board },
  { id: 'notas', l: 'Notas', i: 'note', k: '5', C: Notes },
  { id: 'rotinas', l: 'Rotinas', i: 'bolt', k: '6', C: Routines },
  { id: 'ajustes', l: 'Ajustes', i: 'gear', k: '7', C: Settings },
]

function Palette({ open, close, go }: { open: boolean; close: () => void; go: (v: string) => void }) {
  const { data, setSettings } = useStore(); const { editTask, editEvent } = useEditors()
  const [q, setQ] = useState(''), [i, setI] = useState(0)
  const opts = useMemo(() => {
    const base = [
      { l: 'Nova tarefa', h: 'ação', run: () => editTask() },
      { l: 'Novo evento', h: 'ação', run: () => editEvent() },
      ...NAV.map(n => ({ l: `Ir para ${n.l}`, h: `Alt+${n.k}`, run: () => go(n.id) })),
      ...THEMES.map(t => ({ l: `Tema: ${t.name}`, h: 'tema', run: () => setSettings({ theme: t.id }) })),
      ...data.tasks.map(t => ({ l: t.title, h: 'tarefa', run: () => editTask(t) })),
      ...data.events.map(e => ({ l: e.title, h: `evento ${e.date.slice(5).split('-').reverse().join('/')}`, run: () => editEvent(e) })),
      ...data.notes.map(n => ({ l: n.title, h: 'nota', run: () => go('notas') })),
    ]
    const s = q.toLowerCase()
    return base.filter(o => o.l.toLowerCase().includes(s)).slice(0, 9)
  }, [q, data, editTask, editEvent, go, setSettings])
  useEffect(() => { if (open) { setQ(''); setI(0) } }, [open])
  const pick = (k: number) => { opts[k]?.run(); close() }
  return <AnimatePresence>{open && <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
    <motion.div className="modal pal" initial={{ opacity: 0, scale: .96, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98 }} transition={spring} onMouseDown={e => e.stopPropagation()}>
      <input autoFocus placeholder="Buscar ou executar…" value={q} onChange={e => { setQ(e.target.value); setI(0) }}
        onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(x => Math.min(x + 1, opts.length - 1)) } if (e.key === 'ArrowUp') { e.preventDefault(); setI(x => Math.max(x - 1, 0)) } if (e.key === 'Enter') pick(i); if (e.key === 'Escape') close() }} />
      <div style={{ padding: '6px 0 8px' }}>{opts.map((o, k) => <div key={k} className={`opt ${k === i ? 'on' : ''}`} onMouseEnter={() => setI(k)} onClick={() => pick(k)}>{o.l}<small>{o.h}</small></div>)}
        {!opts.length && <div className="opt muted">Nada encontrado</div>}</div>
    </motion.div></motion.div>}</AnimatePresence>
}

function Shell() {
  const { data, sync, toasts } = useStore(); const { editTask } = useEditors()
  const [view, setView] = useState(() => localStorage.getItem('kairotec:view') ?? 'painel')
  const [pal, setPal] = useState(false)
  useEffect(() => { localStorage.setItem('kairotec:view', view) }, [view])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal(p => !p) }
      if (e.altKey && /^[1-7]$/.test(e.key)) { e.preventDefault(); setView(NAV[Number(e.key) - 1].id) }
      const tag = (e.target as HTMLElement).tagName
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) { e.preventDefault(); editTask() }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [editTask])
  const Cur = NAV.find(n => n.id === view)?.C ?? Dashboard
  const overdue = data.tasks.filter(t => t.status !== 'done' && t.due && t.due < new Date().toISOString().slice(0, 10)).length

  return <div className="app">
    <aside className="side">
      <div className="brand"><div className="brand-mark">K</div>Kairotec</div>
      <button className="nav" onClick={() => setPal(true)} style={{ border: '1px solid var(--line)', marginBottom: 10 }}><Icon n="search" /><span>Buscar</span><kbd>Ctrl K</kbd></button>
      {NAV.map(n => <motion.button whileTap={{ scale: .97 }} key={n.id} className={`nav ${view === n.id ? 'on' : ''}`} onClick={() => setView(n.id)}>
        {view === n.id && <motion.div layoutId="navpill" className="nav-pill" transition={spring} />}
        <Icon n={n.i} /><span>{n.l}</span>
        {n.id === 'entregas' && overdue > 0 ? <span className="chip" style={{ marginLeft: 'auto', color: 'var(--bad)' }}>{overdue}</span> : <kbd>Alt {n.k}</kbd>}
      </motion.button>)}
      <div className="side-sec">Projetos</div>
      {data.projects.map(p => <div key={p.id} className="nav" style={{ cursor: 'default', fontWeight: 500 }}><span className="dot" style={{ background: p.color }} /><span>{p.name}</span><kbd>{data.tasks.filter(t => t.projectId === p.id && t.status !== 'done').length}</kbd></div>)}
      <div className="side-foot" title={sync.error}>
        <motion.span className="dot" animate={{ scale: sync.status === 'saving' ? [1, 1.5, 1] : 1 }} transition={{ repeat: sync.status === 'saving' ? Infinity : 0, duration: .8 }}
          style={{ background: sync.status === 'error' ? 'var(--bad)' : sync.cloudName || sync.excelName ? 'var(--ok)' : 'var(--faint)' }} />
        {sync.status === 'error' ? 'Erro ao sincronizar' : sync.cloudName || sync.excelName ? (sync.lastSaved ? `Sincronizado ${sync.lastSaved}` : 'Conectado') : 'Só neste navegador'}
      </div>
    </aside>
    <main className="main"><AnimatePresence mode="wait"><motion.div key={view} style={{ height: view === 'notas' ? '100%' : undefined }}><Cur /></motion.div></AnimatePresence></main>
    <Palette open={pal} close={() => setPal(false)} go={setView} />
    <div className="toasts"><AnimatePresence>{toasts.map(t => <motion.div key={t.id} className="toast" layout initial={{ opacity: 0, y: 20, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} transition={spring}>{t.msg}</motion.div>)}</AnimatePresence></div>
  </div>
}

export default function App() {
  return <StoreProvider><EditorsProvider><Shell /></EditorsProvider></StoreProvider>
}
