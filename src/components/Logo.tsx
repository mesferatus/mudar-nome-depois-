import { motion } from 'framer-motion'
import { useId } from 'react'

/*
 * Marca Kairotec — "Ascensão": duas setas subindo (progresso, entregas avançando)
 * com uma sombra deslocada que dá profundidade de papel.
 *   variant="app"  → ícone em bloco café (app, favicon)
 *   variant="mark" → só o símbolo, para usar sobre qualquer fundo
 */
export function Logo({ size = 36, variant = 'app', animate = true }: { size?: number; variant?: 'app' | 'mark'; animate?: boolean }) {
  const id = useId().replace(/:/g, '')
  const up = (d: number) => animate ? { initial: { y: 14, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { type: 'spring' as const, stiffness: 260, damping: 18, delay: d } } : {}
  return <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-label="Kairotec" role="img">
    <defs>
      <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a3222" /><stop offset="1" stopColor="#1f1610" /></linearGradient>
      <linearGradient id={`lo${id}`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#c0703f" /><stop offset="1" stopColor="#e6a87c" /></linearGradient>
    </defs>
    {variant === 'app' && <rect width="64" height="64" rx="16" fill={`url(#bg${id})`} />}
    <g strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth="8.5">
      {/* sombra deslocada */}
      <path d="M17.5 48 L33.5 34 L49.5 48" stroke="#000" strokeOpacity=".28" transform="translate(2.5 3)" />
      <motion.path d="M17.5 48 L33.5 34 L49.5 48" stroke={`url(#lo${id})`} {...up(.05)} />
      <path d="M21.5 25.5 L33.5 15 L45.5 25.5" stroke="#000" strokeOpacity=".28" transform="translate(2.5 3)" />
      <motion.path d="M21.5 25.5 L33.5 15 L45.5 25.5" stroke="#f1dabf" {...up(.18)} />
    </g>
  </svg>
}
