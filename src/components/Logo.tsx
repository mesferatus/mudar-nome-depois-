import { motion } from 'framer-motion'
import { useId } from 'react'

/** Marca Kairotec: a estrela do "momento certo" (kairós) sobre um bloco café. */
export function Logo({ size = 36, animate = true }: { size?: number; animate?: boolean }) {
  const id = useId().replace(/:/g, '')
  return <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-label="Kairotec">
    <defs>
      <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a3222" /><stop offset="1" stopColor="#1a120d" /></linearGradient>
      <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffbff" /><stop offset="1" stopColor="#f1dabf" /></linearGradient>
    </defs>
    <rect width="64" height="64" rx="18" fill={`url(#g${id})`} />
    <motion.path d="M30 12 C31.6 24 34 26.4 46 28 C34 29.6 31.6 32 30 44 C28.4 32 26 29.6 14 28 C26 26.4 28.4 24 30 12Z" fill={`url(#s${id})`}
      style={{ originX: '30px', originY: '28px' }} initial={animate ? { scale: 0, rotate: -90 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} />
    <motion.path d="M46 38 C46.7 43 47.6 43.9 52 44.6 C47.6 45.3 46.7 46.2 46 51 C45.3 46.2 44.4 45.3 40 44.6 C44.4 43.9 45.3 43 46 38Z" fill="#c79d7b"
      initial={animate ? { opacity: 0, scale: 0 } : false} animate={{ opacity: [0, 1, .6, 1], scale: 1 }} transition={{ delay: .35, duration: 1.2 }} style={{ originX: '46px', originY: '44px' }} />
  </svg>
}
