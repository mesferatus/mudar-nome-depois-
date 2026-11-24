import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { THEMES } from '../views/Settings'
import { Logo } from './Logo'
import { Btn, Icon, spring } from './ui'

const COLORS = ['#e6a87c', '#b9c7e8', '#9fcf9a', '#f0a6ca', '#f0c27a', '#9fd3c7']

/** Configuração inicial em 3 passos: nome → tema → projetos. */
export function Onboarding() {
  const { data, setSettings, upsertProject } = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(data.settings.userName)
  const [proj, setProj] = useState('')
  if (data.settings.onboarded) return null
  const finish = () => { setSettings({ onboarded: true, userName: name.trim() }) }
  const steps = [
    <div key="0" className="ob-step">
      <motion.div initial={{ scale: .6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={spring}><Logo size={84} /></motion.div>
      <h2>Bem-vinda ao kairotec<span style={{ color: 'var(--accent)' }}>.</span></h2>
      <p className="muted">Seu planner de entregas, agenda e caderno — tudo num lugar só, salvo no seu OneDrive e na sua planilha.</p>
      <input className="input" autoFocus placeholder="Como quer ser chamada?" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && setStep(1)} style={{ textAlign: 'center', fontSize: 17, height: 50 }} />
    </div>,
    <div key="1" className="ob-step">
      <h2>Escolha seu tema</h2><p className="muted">Dá pra trocar quando quiser em Ajustes.</p>
      <div className="ob-themes">{THEMES.map(t => <motion.button key={t.id} whileHover={{ y: -3 }} whileTap={{ scale: .95 }} className={`ob-t ${data.settings.theme === t.id ? 'on' : ''}`} onClick={() => setSettings({ theme: t.id })}>
        <span className="ob-sw" style={{ background: `linear-gradient(135deg, ${t.c[0]} 45%, ${t.c[1]} 45% 75%, ${t.c[2]} 75%)` }} />{t.name}</motion.button>)}</div>
    </div>,
    <div key="2" className="ob-step">
      <h2>Seus projetos</h2><p className="muted">Eles organizam tarefas, agenda e gráficos. Comece com alguns:</p>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
        <AnimatePresence>{data.projects.map(p => <motion.span layout key={p.id} className="chip" initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ fontSize: 14, padding: '7px 12px' }}><span className="dot" style={{ background: p.color }} />{p.name}</motion.span>)}</AnimatePresence>
      </div>
      <div className="row" style={{ width: '100%' }}><input className="input" placeholder="Novo projeto (Enter)" value={proj} onChange={e => setProj(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && proj.trim()) { upsertProject({ name: proj.trim(), color: COLORS[data.projects.length % COLORS.length] }); setProj('') } }} /></div>
    </div>,
  ]
  return <motion.div className="overlay ob" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="modal ob-card" initial={{ y: 30, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={spring}>
      <div className="ob-dots">{steps.map((_, i) => <motion.i key={i} animate={{ width: i === step ? 22 : 7, opacity: i <= step ? 1 : .35 }} />)}</div>
      <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: .22 }}>{steps[step]}</motion.div></AnimatePresence>
      <div className="modal-f" style={{ justifyContent: 'space-between' }}>
        {step > 0 ? <Btn variant="ghost" onClick={() => setStep(step - 1)}><Icon n="left" s={15} /> Voltar</Btn> : <Btn variant="ghost" onClick={finish}>Pular</Btn>}
        {step < steps.length - 1 ? <Btn variant="primary" onClick={() => setStep(step + 1)}>Continuar <Icon n="right" s={15} /></Btn> : <Btn variant="primary" onClick={finish}>Começar ✨</Btn>}
      </div>
    </motion.div>
  </motion.div>
}
