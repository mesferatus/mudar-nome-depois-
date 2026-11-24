import { motion } from 'framer-motion'
import { useId } from 'react'

/*
 * Marca Kairotec — "Ascensão": duas setas subindo com sombra deslocada.
 * As cores vêm do tema atual (variáveis --logo-*), então a logo muda junto com o tema.
 */
export function Logo({ size = 36, variant = 'app', animate = true }: { size?: number; variant?: 'app' | 'mark'; animate?: boolean }) {
  const id = useId().replace(/:/g, '')
  const up = (d: number) => animate ? { initial: { y: 14, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { type: 'spring' as const, stiffness: 260, damping: 18, delay: d } } : {}
  return <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-label="Kairotec" role="img">
    <defs>
      <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: 'var(--logo-bg1)' }} /><stop offset="1" style={{ stopColor: 'var(--logo-bg2)' }} /></linearGradient>
      <linearGradient id={`lo${id}`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" style={{ stopColor: 'var(--logo-low1)' }} /><stop offset="1" style={{ stopColor: 'var(--logo-low2)' }} /></linearGradient>
    </defs>
    {variant === 'app' && <rect width="64" height="64" rx="16" fill={`url(#bg${id})`} style={{ transition: 'fill .4s' }} />}
    <g strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth="8.5">
      <path d="M17.5 48 L33.5 34 L49.5 48" stroke="#000" strokeOpacity=".22" transform="translate(2.5 3)" />
      <motion.path d="M17.5 48 L33.5 34 L49.5 48" stroke={`url(#lo${id})`} {...up(.05)} />
      <path d="M21.5 25.5 L33.5 15 L45.5 25.5" stroke="#000" strokeOpacity=".22" transform="translate(2.5 3)" />
      <motion.path d="M21.5 25.5 L33.5 15 L45.5 25.5" style={{ stroke: 'var(--logo-top)' }} {...up(.18)} />
    </g>
  </svg>
}

/** Ícone da aba do navegador com as cores do tema. */
export function logoSvg(c: { bg1: string; bg2: string; top: string; low1: string; low2: string }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.bg1}"/><stop offset="1" stop-color="${c.bg2}"/></linearGradient><linearGradient id="l" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.low1}"/><stop offset="1" stop-color="${c.low2}"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#b)"/><g stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="8.5"><path d="M17.5 48 L33.5 34 L49.5 48" stroke="#000" stroke-opacity=".22" transform="translate(2.5 3)"/><path d="M17.5 48 L33.5 34 L49.5 48" stroke="url(#l)"/><path d="M21.5 25.5 L33.5 15 L45.5 25.5" stroke="#000" stroke-opacity=".22" transform="translate(2.5 3)"/><path d="M21.5 25.5 L33.5 15 L45.5 25.5" stroke="${c.top}"/></g></svg>`
}
