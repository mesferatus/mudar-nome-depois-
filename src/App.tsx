import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { StoreProvider, useStore } from './lib/store'
import { EditorsProvider, useEditors } from './components/editors'
import { Icon, spring } from './components/ui'
import { Logo } from './components/Logo'
import { requestNote } from './lib/nav'
import { applyPairCode, pullSync } from './lib/cloudsync'
import { syncOutlook, syncIcsUrl } from './lib/integrations'
import { Onboarding } from './components/Onboarding'
import { FocusTimer } from './components/FocusTimer'
import { useReminders } from './lib/reminders'
import Dashboard from './views/Dashboard'
import Calendar from './views/Calendar'
import Board from './views/Board'
import Notes from './views/Notes'
import Routines from './views/Routines'
import Insights from './views/Insights'
import Settings, { THEMES } from './views/Settings'

const NAV = [
  { id: 'inicio', l: 'Início', i: 'home', k: '1', C: Dashboard, mob: true },
  { id: 'calendario', l: 'Calendário', i: 'cal', k: '2', C: Calendar, mob: true },
  { id: 'entregas', l: 'Entregas', i: 'board', k: '3', C: Board, mob: true },
  { id: 'notas', l: 'Notas', i: 'note', k: '4', C: Notes, mob: true },
  { id: 'insights', l: 'Insights', i: 'chart', k: '5', C: Insights, mob: false },
  { id: 'rotinas', l: 'Rotinas', i: 'bolt', k: '6', C: Routines, mob: false },
  { id: 'ajustes', l: 'Ajustes', i: 'gear', k: '7', C: Settings, mob: false },
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
      ...data.notes.filter(n => !n.trashed).map(n => ({ l: `${n.icon ?? '📄'} ${n.title}`, h: 'página', run: () => { requestNote(n.id); go('notas') } })),
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
  useReminders(data)
  const { toast, replaceAll } = useStore()
  const live = useRef(data); live.current = data
  // conectar pelo QR/link do outro aparelho (#conectar=KT1…)
  useEffect(() => {
    const m = location.hash.match(/conectar=(KT1\.[\w-]+)/)
    if (!m) return
    history.replaceState(null, '', location.pathname + location.search)
    if (!applyPairCode(m[1])) { toast('Código de conexão inválido'); return }
    pullSync(live.current).then(d => { if (d) replaceAll(d); toast('Celular conectado ✨ seus dados chegaram') }).catch(() => toast('Conectado, mas não consegui buscar os dados agora'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Outlook (a cada 15 min) e link .ics (a cada 30 min), sozinhos
  useEffect(() => {
    const outlook = () => { if (live.current.settings.outlookAuto) syncOutlook(live.current).then(r => { if (r.data) replaceAll(r.data) }) }
    const ics = () => { const u = live.current.settings.icsUrl; if (u) syncIcsUrl(live.current, u).then(r => { if (r.data) replaceAll(r.data) }) }
    const t1 = setTimeout(() => { outlook(); ics() }, 4000)
    const i1 = setInterval(outlook, 15 * 60000), i2 = setInterval(ics, 30 * 60000)
    return () => { clearTimeout(t1); clearInterval(i1); clearInterval(i2) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // app de desktop: barra de título na cor do tema e atalho global
  useEffect(() => {
    const desk = window.kairotecDesktop; if (!desk) return
    document.documentElement.classList.add('desk')
    desk.onQuick(() => quick())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const desk = window.kairotecDesktop; if (!desk) return
    requestAnimationFrame(() => { const cs = getComputedStyle(document.documentElement); desk.prefs({ bg: cs.getPropertyValue('--panel').trim(), fg: cs.getPropertyValue('--text').trim() }) })
  }, [data.settings.theme])
  useEffect(() => {
    const h = () => toast('Nova versão do Kairotec ✨', { label: 'Atualizar', run: () => location.reload() })
    window.kairotecDesktop?.onUpdateReady(v => toast(`Kairotec ${v} pronto ✨`, { label: 'Reiniciar e atualizar', run: () => window.kairotecDesktop!.restart() }))
    window.addEventListener('kairotec:update', h); return () => window.removeEventListener('kairotec:update', h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [compact, setCompact] = useState(() => { try { return localStorage.getItem('kairotec:compact') === '1' } catch { return false } })
  useEffect(() => { try { localStorage.setItem('kairotec:compact', compact ? '1' : '0') } catch { /* ignore */ } }, [compact])
  // luz que segue o cursor nos cartões
  useEffect(() => {
    const h = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.('.card, .action, .tcard, .hero') as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    window.addEventListener('pointermove', h, { passive: true }); return () => window.removeEventListener('pointermove', h)
  }, [])
  useEffect(() => { try { localStorage.setItem('kairotec:view', view) } catch { /* ignore */ } }, [view])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal(p => !p) }
      if (e.altKey && /^[1-7]$/.test(e.key)) { e.preventDefault(); setView(NAV[Number(e.key) - 1].id) }
      const tag = (e.target as HTMLElement).tagName
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) { e.preventDefault(); quick() }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [quick])
  const cur = NAV.find(n => n.id === view) ?? NAV[0]
  const Cur = cur.C
  useEffect(() => { document.title = `${cur.l} · Kairotec` }, [cur.l])
  const overdue = data.tasks.filter(t => t.status !== 'done' && t.due && t.due < new Date().toISOString().slice(0, 10)).length
  const hello = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' })()

  return <div className={`app ${compact ? 'compact' : ''}`}>
    {window.kairotecDesktop && <div className="titlebar"><span>kairotec<i>.</i></span></div>}
    <header className="topbar">
      <Logo size={44} />
      <div className="t"><b>kairotec<span style={{ color: 'var(--accent)' }}>.</span></b><span>{hello} · {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span></div>
      <motion.button whileTap={{ scale: .9 }} className="btn icon" aria-label="Insights" onClick={() => setView('insights')}><Icon n="chart" /></motion.button>
      <motion.button whileTap={{ scale: .9 }} className="btn icon" aria-label="Rotinas" onClick={() => setView('rotinas')}><Icon n="bolt" /></motion.button>
      <motion.button whileTap={{ scale: .9 }} className="btn icon" aria-label="Ajustes" onClick={() => setView('ajustes')}><Icon n="gear" /></motion.button>
    </header>
    <nav className="side">
      <div className="brand"><Logo size={34} /><b>kairotec<i>.</i></b><button className="collapse" onClick={() => setCompact(c => !c)} aria-label={compact ? 'Expandir menu' : 'Recolher menu'} title={compact ? 'Expandir menu' : 'Recolher menu'}><Icon n={compact ? 'right' : 'left'} s={14} /></button></div>
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
        {sync.status === 'error' ? 'Erro ao sincronizar' : sync.cloudName || sync.excelName ? (sync.lastSaved ? `Sincronizado ${sync.lastSaved}` : 'Conectado') : window.kairotecDesktop ? 'Só neste computador' : 'Só neste navegador'}
      </div>
    </nav>
    <main className="main"><AnimatePresence mode="wait"><motion.div key={view} style={{ height: view === 'notas' ? '100%' : undefined }}><Cur /></motion.div></AnimatePresence></main>
    {!['ajustes', 'notas'].includes(view) && <motion.button className="fab" onClick={() => quick({ kind: view === 'calendario' ? 'event' : 'task' })} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ y: -2 }} whileTap={{ scale: .92 }} transition={spring} aria-label="Novo" title="Criar (tecla N)">
      <Icon n="plus" s={20} /> Novo</motion.button>}
    <FocusTimer />
    <Palette open={pal} close={() => setPal(false)} go={setView} />
    <AnimatePresence>{!data.settings.onboarded && <Onboarding key="ob" />}</AnimatePresence>
    <div className="toasts"><AnimatePresence>{toasts.map(t => <motion.div key={t.id} className="toast" layout initial={{ opacity: 0, y: 20, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .95 }} transition={spring}>{t.msg}{t.action && <button className="toast-act" onClick={() => t.action!.run()}>{t.action.label}</button>}</motion.div>)}</AnimatePresence></div>
  </div>
}

export default function App() {
  return <MotionConfig reducedMotion="user"><StoreProvider><EditorsProvider><Shell /></EditorsProvider></StoreProvider></MotionConfig>
}
