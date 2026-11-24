import { motion } from 'framer-motion'

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
