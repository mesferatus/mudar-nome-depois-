import { AnimatePresence, motion } from 'framer-motion'
import { useId, useState } from 'react'

export function Donut({ parts, size = 150, label, sub }: { parts: { v: number; c: string; l: string }[]; size?: number; label: string; sub: string }) {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1, r = size / 2 - 12, C = 2 * Math.PI * r
  let acc = 0
  return <div className="row" style={{ gap: 20 }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hover)" strokeWidth={14} />
      {parts.map((p, i) => {
        const len = (p.v / total) * C, off = acc; acc += len
        return <motion.circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.c} strokeWidth={14} strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeDasharray={`${len} ${C}`} initial={{ strokeDashoffset: len }} animate={{ strokeDashoffset: -off }} transition={{ duration: .9, delay: i * .08, ease: [.2, .8, .2, 1] }} />
      })}
      <text x="50%" y="48%" textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--text)">{label}</text>
      <text x="50%" y="63%" textAnchor="middle" fontSize="11" fill="var(--muted)">{sub}</text>
    </svg>
    <div style={{ display: 'grid', gap: 6 }}>{parts.map(p => <div key={p.l} className="row" style={{ gap: 8, fontSize: 12 }}><span className="dot" style={{ background: p.c }} /> {p.l} <b style={{ marginLeft: 'auto', paddingLeft: 12 }}>{p.v}</b></div>)}</div>
  </div>
}

export function Bars({ data, h = 160 }: { data: { label: string; a: number; b: number }[]; h?: number }) {
  const max = Math.max(1, ...data.map(d => Math.max(d.a, d.b)))
  return <div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, alignItems: 'end', gap: 10, height: h }}>
      {data.map((d, i) => <div key={i} title={`${d.label}: ${d.a} no prazo / ${d.b} concluídas`} style={{ display: 'flex', gap: 3, alignItems: 'end', height: '100%', justifyContent: 'center' }}>
        <motion.div style={{ width: 12, borderRadius: 4, background: 'var(--line)' }} initial={{ height: 0 }} animate={{ height: `${(d.b / max) * 100}%` }} transition={{ delay: i * .04, type: 'spring', stiffness: 200, damping: 24 }} />
        <motion.div style={{ width: 12, borderRadius: 4, background: 'var(--accent)' }} initial={{ height: 0 }} animate={{ height: `${(d.a / max) * 100}%` }} transition={{ delay: i * .04 + .05, type: 'spring', stiffness: 200, damping: 24 }} />
      </div>)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 10, marginTop: 8 }}>{data.map((d, i) => <div key={i} className="mono muted" style={{ textAlign: 'center', fontSize: 10 }}>{d.label}</div>)}</div>
  </div>
}

export function Burndown({ points, h = 160 }: { points: { ideal: number; real: number | null }[]; h?: number }) {
  const w = 520, max = Math.max(1, ...points.map(p => Math.max(p.ideal, p.real ?? 0)))
  const x = (i: number) => (i / Math.max(1, points.length - 1)) * (w - 20) + 10, y = (v: number) => h - 10 - (v / max) * (h - 20)
  const ideal = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.ideal)}`).join('')
  const realPts = points.map((p, i) => [i, p.real] as const).filter(([, v]) => v !== null)
  const real = realPts.map(([i, v], k) => `${k ? 'L' : 'M'}${x(i)},${y(v!)}`).join('')
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
    {[0, .5, 1].map(f => <line key={f} x1="0" x2={w} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeDasharray="3 4" />)}
    <path d={ideal} stroke="var(--faint)" strokeDasharray="5 5" fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    <motion.path d={real} stroke="var(--accent)" fill="none" strokeWidth="2.5" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [.2, .8, .2, 1] }} />
  </svg>
}

/** Área suave com linha secundária e dica ao passar o mouse. */
export function Area({ data, h = 130 }: { data: { label: string; a: number; b: number }[]; h?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const w = 560, pad = 14, max = Math.max(1, ...data.map(d => Math.max(d.a, d.b)))
  const x = (i: number) => pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2)
  const y = (v: number) => h - 22 - (v / max) * (h - 44)
  const smooth = (vals: number[]) => vals.map((v, i) => {
    if (!i) return `M${x(0)},${y(v)}`
    const cx = (x(i - 1) + x(i)) / 2
    return `C${cx},${y(vals[i - 1])} ${cx},${y(v)} ${x(i)},${y(v)}`
  }).join('')
  const lb = smooth(data.map(d => d.b)), la = smooth(data.map(d => d.a))
  const id = useId().replace(/:/g, '')
  return <div style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none"
      onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width * w - pad) / ((w - pad * 2) / Math.max(1, data.length - 1))); setHover(Math.max(0, Math.min(data.length - 1, i))) }}>
      <defs><linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".35" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      {[.25, .5, .75, 1].map(f => <line key={f} x1={pad} x2={w - pad} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />)}
      <motion.path d={`${lb}L${x(data.length - 1)},${h - 22}L${x(0)},${h - 22}Z`} fill={`url(#a${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .8 }} />
      <motion.path d={lb} fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [.2, .8, .2, 1] }} />
      <motion.path d={la} fill="none" stroke="var(--c4)" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .6 }} />
      {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={10} y2={h - 22} stroke="var(--muted)" strokeOpacity=".4" vectorEffect="non-scaling-stroke" />}
    </svg>
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${pad / w * 100}%` }}>{data.map((d, i) => <span key={i} className="mono muted" style={{ fontSize: 10, opacity: hover === i ? 1 : .7 }}>{d.label}</span>)}</div>
    <AnimatePresence>{hover !== null && <motion.div className="tip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ left: `${x(hover) / w * 100}%`, top: Math.max(56, y(data[hover].b) - 8) }}>
      <b>Semana {data[hover].label}</b><span><i style={{ background: 'var(--accent)' }} />{data[hover].b} concluídas</span><span><i style={{ background: 'var(--c4)' }} />{data[hover].a} no prazo</span>
    </motion.div>}</AnimatePresence>
  </div>
}
