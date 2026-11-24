import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion'
import { useId, type ReactNode } from 'react'

export const spring = { type: 'spring', stiffness: 420, damping: 32, mass: .7 } as const

const P: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  grid: 'M3 4h18v16H3zM3 9h18M3 14h18M9 4v16M15 4v16',
  board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z',
  note: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 1-2-2V4h-4v2L9 8 7 7 5 11l2 1v0l-2 1 2 4 2-1 2 2v2h4v-2l2-2 2 1 2-4z',
  plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4', download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  cloud: 'M7 18h10a4 4 0 00.5-8A6 6 0 006 9.5 4.3 4.3 0 007 18z', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  check: 'M5 12l5 5 9-10', pin: 'M12 17v5M8 3h8l-1 6 3 3H6l3-3z', play: 'M7 5l12 7-12 7z', sheet: 'M5 3h10l4 4v14H5zM8 11h8M8 15h8M12 11v8',
}
export function Icon({ n, s = 16 }: { n: string; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]} /></svg>
}

export function Btn({ children, variant = '', ...p }: HTMLMotionProps<'button'> & { variant?: string }) {
  return <motion.button whileTap={{ scale: .96 }} whileHover={{ y: -1 }} transition={spring} className={`btn ${variant}`} {...p}>{children}</motion.button>
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  const id = useId()
  return <div className="seg">{options.map(o => (
    <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>
      {o.v === value && <motion.div layoutId={id} className="pill" transition={spring} />}<span>{o.l}</span>
    </button>))}</div>
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  return <AnimatePresence>{open && (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div className="modal" initial={{ opacity: 0, y: 16, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }} transition={spring} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-h">{title}<button className="btn ghost icon" onClick={onClose}><Icon n="x" /></button></div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </motion.div>
    </motion.div>)}</AnimatePresence>
}

export const Card = ({ title, sub, children, delay = 0, className = '', style }: { title?: ReactNode; sub?: ReactNode; children: ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) =>
  <motion.div className={`card ${className}`} style={style} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay }}>
    {title && <div className="card-h">{title}{sub && <small>{sub}</small>}</div>}
    <div className="card-b">{children}</div>
  </motion.div>

export const Page = ({ children, wide }: { children: ReactNode; wide?: boolean }) =>
  <motion.div className="page" style={wide ? { maxWidth: 'none' } : undefined} initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }} transition={{ duration: .28, ease: [.2, .8, .2, 1] }}>{children}</motion.div>
