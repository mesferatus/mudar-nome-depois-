import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { parseQuick, type Kind } from '../lib/parse'
import { addDays, iso, fmt, WD, parse as parseDate, plusHour } from '../lib/date'
import type { Priority } from '../lib/types'
import { Btn, Icon, Seg, spring } from './ui'

const KINDS: { v: Kind; l: string }[] = [{ v: 'task', l: 'Tarefa' }, { v: 'event', l: 'Evento' }, { v: 'note', l: 'Nota' }]
const nextWd = (wd: number) => { const b = new Date(); let d = (wd - b.getDay() + 7) % 7; if (d === 0) d = 7; return iso(addDays(b, d)) }

/**
 * Criação rápida: um campo só. O texto é interpretado enquanto você digita
 * (data, horário, #projeto, !prioridade, ~horas) e os atalhos abaixo ajustam o resto.
 */
export function QuickAdd({ n = 0, open, preset, close, more }: {
  n?: number; open: boolean; preset?: { kind?: Kind; date?: string }; close: () => void
  more: (kind: Kind, fields: Record<string, unknown>) => void
}) {
  const { data, upsertTask, upsertEvent, upsertNote, toast } = useStore()
  const [text, setText] = useState('')
  const [kind, setKind] = useState<Kind | null>(preset?.kind ?? null)
  const [date, setDate] = useState<string | undefined>(preset?.date)
  const [proj, setProj] = useState<string | undefined>()
  const [prio, setPrio] = useState<Priority | undefined>()
  const [time, setTime] = useState<string | undefined>()
  const ref = useRef<HTMLInputElement>(null)

  // cada abertura começa limpa — zera no próprio render (sem esperar efeito), para não perder o que for digitado
  const [seen, setSeen] = useState(n)
  if (seen !== n) { setSeen(n); setText(''); setKind(preset?.kind ?? null); setDate(preset?.date); setProj(undefined); setPrio(undefined); setTime(undefined) }
  useEffect(() => { if (open) ref.current?.focus() }, [open, n])

  const p = useMemo(() => parseQuick(text, data.projects), [text, data.projects])
  const k: Kind = kind ?? p.kind
  const fDate = date ?? p.date ?? (k === 'note' ? undefined : iso(new Date()))
  const fStart = time ?? p.start ?? (k === 'event' ? '09:00' : undefined)
  const fEnd = p.end && !time ? p.end : fStart ? plusHour(fStart) : undefined
  const fProj = proj ?? p.projectId
  const fPrio = prio ?? p.priority ?? 'media'
  const project = data.projects.find(x => x.id === fProj)

  const fields = () => k === 'task'
    ? { title: p.title, due: fDate, start: iso(new Date()), projectId: fProj || undefined, priority: fPrio, estimate: p.estimate, tags: p.tags, repeat: p.repeat }
    : k === 'event' ? { title: p.title, date: fDate, start: fStart, end: fEnd, projectId: fProj }
      : { title: p.title, body: `# ${p.title}\n\n`, tags: p.tags, folder: project?.name ?? 'Geral' }

  const save = () => {
    if (!p.title) { ref.current?.focus(); return }
    const f = fields()
    if (k === 'task') upsertTask(f); else if (k === 'event') upsertEvent(f); else upsertNote(f)
    toast(k === 'task' ? 'Tarefa criada ✓' : k === 'event' ? 'Evento criado ✓' : 'Nota criada ✓')
    close()
  }

  const dateChips = [
    { l: 'Hoje', v: iso(new Date()) }, { l: 'Amanhã', v: iso(addDays(new Date(), 1)) },
    { l: 'Sexta', v: nextWd(5) }, { l: 'Próx. segunda', v: nextWd(1) },
  ]
  const label = (ds?: string) => ds ? `${WD[parseDate(ds).getDay()]} ${fmt(ds)}` : 'Sem data'

  return <AnimatePresence>{open && (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
      <motion.div className="modal" role="dialog" aria-label="Criar" initial={{ y: 60, opacity: 0, scale: .98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }} transition={spring}
        onMouseDown={e => e.stopPropagation()} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: .6 }} onDragEnd={(_, i) => i.offset.y > 120 && close()}>
        <div className="modal-h"><Seg value={k} onChange={v => setKind(v)} options={KINDS} /><button className="btn ghost icon" onClick={close} aria-label="Fechar"><Icon n="x" /></button></div>
        <div className="modal-b">
          <input ref={ref} autoFocus className="qa-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') close() }}
            placeholder={k === 'event' ? 'Reunião com fornecedor amanhã 14h #bi' : k === 'note' ? 'Ideias para o modelo de estoque' : 'Entregar dashboard sexta !alta ~4h'} />
          <div className="qa-preview">
            <AnimatePresence initial={false}>
              {k !== 'note' && <motion.span layout key="d" className="chip" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Icon n="cal" s={13} />{label(fDate)}</motion.span>}
              {k === 'event' && <motion.span layout key="t" className="chip" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>◷ {fStart}–{fEnd}</motion.span>}
              {project && <motion.span layout key="p" className="chip" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><span className="dot" style={{ background: project.color }} />{project.name}</motion.span>}
              {k === 'task' && <motion.span layout key="r" className="chip" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{fPrio === 'alta' ? '▲ alta' : fPrio === 'baixa' ? '▽ baixa' : '◆ média'}</motion.span>}
              {p.repeat && <motion.span layout key="rp" className="chip" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>↻ {p.repeat === 'diaria' ? 'todo dia' : p.repeat === 'semanal' ? 'toda semana' : 'todo mês'}</motion.span>}
              {p.estimate && <motion.span layout key="e" className="chip" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{p.estimate}h</motion.span>}
              {p.tags.map(t => <motion.span layout key={'#' + t} className="chip" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>#{t}</motion.span>)}
            </AnimatePresence>
          </div>

          {k !== 'note' && <div><div className="qa-sec">Quando</div><div className="row wrap" style={{ gap: 6 }}>
            {dateChips.map(c => <motion.button whileTap={{ scale: .94 }} key={c.l} className={`chip ${fDate === c.v ? 'on' : ''}`} onClick={() => setDate(c.v)}>{c.l}</motion.button>)}
            <input type="date" className="input" style={{ width: 150, height: 34 }} value={fDate ?? ''} onChange={e => setDate(e.target.value || undefined)} aria-label="Escolher data" />
            {k === 'event' && <input type="time" className="input" style={{ width: 130, height: 34 }} value={fStart ?? ''} onChange={e => setTime(e.target.value)} aria-label="Horário" />}
          </div></div>}

          <div><div className="qa-sec">Projeto</div><div className="row wrap" style={{ gap: 6 }}>
            {data.projects.map(pr => <motion.button whileTap={{ scale: .94 }} key={pr.id} className={`chip ${fProj === pr.id ? 'on' : ''}`} onClick={() => setProj(fProj === pr.id ? '' : pr.id)}><span className="dot" style={{ background: pr.color }} />{pr.name}</motion.button>)}
          </div></div>

          {k === 'task' && <div><div className="qa-sec">Prioridade</div><div className="row" style={{ gap: 6 }}>
            {(['baixa', 'media', 'alta'] as Priority[]).map(x => <motion.button whileTap={{ scale: .94 }} key={x} className={`chip ${fPrio === x ? 'on' : ''}`} onClick={() => setPrio(x)}>{x === 'media' ? 'Média' : x[0].toUpperCase() + x.slice(1)}</motion.button>)}
          </div></div>}

          <div className="qa-hint">Dica: escreva naturalmente — <b>amanhã</b>, <b>sexta</b>, <b>05/12</b>, <b>14h</b>, <b>#projeto</b>, <b>!alta</b>, <b>~2h</b>. Enter salva.</div>
        </div>
        <div className="modal-f">
          <Btn variant="ghost" onClick={() => { more(k, fields()); close() }} style={{ marginRight: 'auto' }}>Mais detalhes</Btn>
          <Btn variant="primary" onClick={save} disabled={!p.title}><Icon n="check" /> Criar</Btn>
        </div>
      </motion.div>
    </motion.div>)}</AnimatePresence>
}
