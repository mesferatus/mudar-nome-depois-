import { Fragment, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StoreProvider, useStore } from './lib/store'
import { EditorsProvider, useEditors } from './components/editors'
import { Icon, spring } from './components/ui'
import { Logo } from './components/Logo'
import Dashboard from './views/Dashboard'
import Calendar from './views/Calendar'
import Board from './views/Board'
import Notes from './views/Notes'
import Routines from './views/Routines'
import Settings, { THEMES } from './views/Settings'

const NAV = [
  { id: 'inicio', l: 'Início', i: 'home', k: '1', C: Dashboard, mob: true },
  { id: 'calendario', l: 'Calendário', i: 'cal', k: '2', C: Calendar, mob: true },
  { id: 'entregas', l: 'Entregas', i: 'board', k: '3', C: Board, mob: true },
  { id: 'notas', l: 'Notas', i: 'note', k: '4', C: Notes, mob: true },
  { id: 'rotinas', l: 'Rotinas', i: 'bolt', k: '5', C: Routines, mob: false },
  { id: 'ajustes', l: 'Ajustes', i: 'gear', k: '6', C: Settings, mob: false },
]
const LEGACY: Record<string, string> = { painel: 'inicio', planner: 'calendario', agenda: 'calendario' }

function Palette({ open, close, go }: { open: boolean; close: () => void; go: (v: string) => void }) {
  const { data, setSettings } = useStore(); const { editTask, editEvent, quick } = useEditors()
  const [q, setQ] = useState(''), [i, setI] = useState(0)
  const opts = useMemo(() => {
    const base = [
      { l: 'Nova tarefa', h: 'ação', run: () => quick({ kind: 'task' }) },
      { l: 'Novo evento', h: 'ação', run: () => quick({ kind: 'event' }) },
      { l: 'Nova nota', h: 'ação', run: () => quick({ kind: 'note' }) },
      ...NAV.map(n => ({ l: `Ir para ${n.l}`, h: `Alt+${n.k}`, run: () => go(n.id) })),
      ...THEMES.map(t => ({ l: `Tema: ${t.name}`, h: 'tema', run: () => setSettings({ theme: t.id }) })),
      ...data.tasks.map(t => ({ l: t.title, h: 'tarefa', run: () => editTask(t) })),
      ...data.events.map(e => ({ l: e.title, h: `evento ${e.date.slice(5).split('-').reverse().join('/')}`, run: () => editEvent(e) })),
      ...data.notes.map(n => ({ l: n.title, h: 'nota', run: () => go('notas') })),
    ]
    const s = q.toLowerCase()
    return base.filter(o => o.l.toLowerCase().includes(s)).slice(0, 9)
  }, [q, data, editTask, editEvent, quick, go, setSettings])
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
  const { data, sync, toasts } = useStore(); const { quick } = useEditors()
  const [view, setView] = useState(() => { let v = 'inicio'; try { v = localStorage.getItem('kairotec:view') ?? 'inicio' } catch { /* ignore */ } return LEGACY[v] ?? (NAV.some(n => n.id === v) ? v : 'inicio') })
  const [pal, setPal] = useState(false)
  useEffect(() => { try { localStorage.setItem('kairotec:view', view) } catch { /* ignore */ } }, [view])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal(p => !p) }
      if (e.altKey && /^[1-6]$/.test(e.key)) { e.preventDefault(); setView(NAV[Number(e.key) - 1].id) }
      const tag = (e.target as HTMLElement).tagName
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) { e.preventDefault(); quick() }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [quick])
  const cur = NAV.find(n => n.id === view) ?? NAV[0]
  const Cur = cur.C
  const overdue = data.tasks.filter(t => t.status !== 'done' && t.due && t.due < new Date().toISOString().slice(0, 10)).length
  const hello = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' })()

  return <div className="app">
    <header className="topbar">
      <Logo size={44} />
      <div className="t"><b>kairotec<span style={{ color: 'var(--accent)' }}>.</span></b><span>{hello} · {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span></div>
      <motion.button whileTap={{ scale: .9 }} className="btn icon" aria-label="Rotinas" onClick={() => setView('rotinas')}><Icon n="bolt" /></motion.button>
      <motion.button whileTap={{ scale: .9 }} className="btn icon" aria-label="Ajustes" onClick={() => setView('ajustes')}><Icon n="gear" /></motion.button>
    </header>
    <nav className="side">
      <div className="brand"><Logo size={34} /><b>kairotec<i>.</i></b></div>
      <button className="nav search" onClick={() => setPal(true)}><span className="ico"><Icon n="search" /></span><span className="lbl">Buscar</span><kbd>Ctrl K</kbd></button>
      {NAV.map((n, i) => <Fragment key={n.id}>{i === 4 && <div className="side-sec">Ferramentas</div>}<motion.button whileTap={{ scale: .94 }} key={n.id} className={`nav ${view === n.id ? 'on' : ''} ${n.mob ? '' : 'more'}`} onClick={() => setView(n.id)} aria-label={n.l}>
        {view === n.id && <motion.div layoutId="navpill" className="nav-pill" transition={spring} />}
        <span className="ico"><Icon n={n.i} s={18} /></span><span className="lbl">{n.l}</span>
        {n.id === 'entregas' && overdue > 0 ? <span className="chip" style={{ color: 'var(--bad)' }}>{overdue}</span> : <kbd>Alt {n.k}</kbd>}
      </motion.button></Fragment>)}
      <div className="side-sec">Projetos</div>
      {data.projects.map(p => <div key={p.id} className="nav proj"><span className="dot" style={{ background: p.color }} /><span>{p.name}</span><kbd>{data.tasks.filter(t => t.projectId === p.id && t.status !== 'done').length}</kbd></div>)}
      <div className="side-foot" title={sync.error}>
        <motion.span className="dot" animate={{ scale: sync.status === 'saving' ? [1, 1.5, 1] : 1 }} transition={{ repeat: sync.status === 'saving' ? Infinity : 0, duration: .8 }}
          style={{ background: sync.status === 'error' ? 'var(--bad)' : sync.cloudName || sync.excelName ? 'var(--ok)' : 'var(--faint)' }} />
        {sync.status === 'error' ? 'Erro ao sincronizar' : sync.cloudName || sync.excelName ? (sync.lastSaved ? `Sincronizado ${sync.lastSaved}` : 'Conectado') : 'Só neste navegador'}
      </div>
    </nav>
    <main className="main"><AnimatePresence mode="wait"><motion.div key={view} style={{ height: view === 'notas' ? '100%' : undefined }}><Cur /></motion.div></AnimatePresence></main>
    {!['ajustes', 'notas'].includes(view) && <motion.button className="fab" onClick={() => quick({ kind: view === 'calendario' ? 'event' : 'task' })} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ y: -2 }} whileTap={{ scale: .92 }} transition={spring} aria-label="Novo">
      <Icon n="plus" s={20} /> Novo</motion.button>}
    <Palette open={pal} close={() => setPal(false)} go={setView} />
    <div className="toasts"><AnimatePresence>{toasts.map(t => <motion.div key={t.id} className="toast" layout initial={{ opacity: 0, y: 20, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .95 }} transition={spring}>{t.msg}</motion.div>)}</AnimatePresence></div>
  </div>
}

export default function App() {
  return <StoreProvider><EditorsProvider><Shell /></EditorsProvider></StoreProvider>
}
