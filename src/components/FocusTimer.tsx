import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { Icon, spring } from './ui'

const POMO = 25 * 60

/** Cronômetro de foco flutuante. Pomodoro (25 min) ou livre; o tempo vai para a tarefa. */
export function FocusTimer() {
  const { data, stopTimer, toast } = useStore()
  const t = data.timer
  const task = data.tasks.find(x => x.id === t?.taskId)
  const [now, setNow] = useState(Date.now())
  const warned = useRef<string>()
  useEffect(() => { if (!t) return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i) }, [t])
  const el = t ? Math.max(0, Math.floor((now - new Date(t.start).getTime()) / 1000)) : 0
  const pomo = t?.mode === 'pomodoro', left = POMO - el
  useEffect(() => {
    if (!t || !pomo || left > 0 || warned.current === t.start) return
    warned.current = t.start
    toast('Pomodoro concluído 🍅 · hora de uma pausa')
    try { if (Notification.permission === 'granted') new Notification('Pomodoro concluído 🍅', { body: task?.title, icon: '/icon-192.png' }) } catch { /* sem notificação */ }
  }, [left, pomo, t, task, toast])
  const show = (s: number) => `${String(Math.floor(Math.abs(s) / 60)).padStart(2, '0')}:${String(Math.abs(s) % 60).padStart(2, '0')}`
  const pct = pomo ? Math.min(1, el / POMO) : 0
  return <AnimatePresence>{t && task && <motion.div className="focus" initial={{ y: -30, opacity: 0, scale: .9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -30, opacity: 0 }} transition={spring}>
    <svg width="30" height="30" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth="4" />
      {pomo && <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${pct * 94.2} 94.2`} transform="rotate(-90 18 18)" />}
      {!pomo && <motion.circle cx="18" cy="18" r="5" fill="var(--accent)" animate={{ opacity: [1, .3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} />}</svg>
    <div className="focus-t"><b className="mono">{pomo ? (left >= 0 ? show(left) : '+' + show(left)) : show(el)}</b><span>{task.title}</span></div>
    <button className="btn sm" onClick={() => { const m = stopTimer(); toast(m ? `${m} min registrados em "${task.title}"` : 'Cronômetro parado') }}><Icon n="check" s={14} /> Parar</button>
  </motion.div>}</AnimatePresence>
}
