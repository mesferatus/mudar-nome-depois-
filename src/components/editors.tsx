import { hoursOf } from '../lib/recur'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useStore, uid } from '../lib/store'
import type { Task, CalEvent } from '../lib/types'
import { STATUS_LABEL, PRIORITY_LABEL, REPEAT_LABEL, type Repeat } from '../lib/types'
import { Btn, Icon, Modal } from './ui'
import { today } from '../lib/date'
import { QuickAdd } from './QuickAdd'
import type { Kind } from '../lib/parse'

type Ed = { editTask: (t?: Partial<Task>) => void; editEvent: (e?: Partial<CalEvent>) => void; quick: (p?: { kind?: Kind; date?: string }) => void }
const C = createContext<Ed>(null!)
export const useEditors = () => useContext(C)

export function EditorsProvider({ children }: { children: ReactNode }) {
  const [task, setTask] = useState<Partial<Task> | null>(null)
  const [ev, setEv] = useState<Partial<CalEvent> | null>(null)
  const [q, setQ] = useState<{ open: boolean; n: number; preset?: { kind?: Kind; date?: string } }>({ open: false, n: 0 })
  const { upsertNote } = useStore()
  return <C.Provider value={{ editTask: t => setTask(t ?? { due: today(), start: today() }), editEvent: e => setEv(e ?? { date: today(), start: '09:00', end: '10:00' }), quick: preset => setQ(x => ({ open: true, n: x.n + 1, preset })) }}>
    {children}
    <TaskModal t={task} close={() => setTask(null)} />
    <EventModal e={ev} close={() => setEv(null)} />
    <QuickAdd n={q.n} open={q.open} preset={q.preset} close={() => setQ(x => ({ ...x, open: false }))} more={(k, f) => {
      if (k === 'task') setTask(f as Partial<Task>); else if (k === 'event') setEv(f as Partial<CalEvent>); else upsertNote(f)
    }} />
  </C.Provider>
}

function ProjectSelect({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const { data } = useStore()
  return <select className="select input" value={value ?? ''} onChange={e => onChange(e.target.value || undefined)}>
    <option value="">Sem projeto</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
}

function TaskModal({ t, close }: { t: Partial<Task> | null; close: () => void }) {
  const { upsertTask, removeTask, toast, startTimer } = useStore()
  const [f, setF] = useState<Partial<Task>>({})
  const [last, setLast] = useState<Partial<Task> | null>(null)
  if (t !== last) { setLast(t); setF(t ?? {}) }
  const s = (p: Partial<Task>) => setF(x => ({ ...x, ...p }))
  const save = () => { if (!f.title?.trim()) return; upsertTask({ ...f, title: f.title.trim() }); toast(f.id ? 'Tarefa atualizada' : 'Tarefa criada'); close() }
  return <Modal open={!!t} onClose={close} title={f.id ? 'Editar tarefa' : 'Nova tarefa'} footer={<>
    {f.id && <Btn variant="ghost" onClick={() => { removeTask(f.id!); close() }} style={{ color: 'var(--bad)' }}><Icon n="trash" /> Excluir</Btn>}
    {f.id && f.status !== 'done' && <Btn variant="ghost" onClick={() => { upsertTask({ ...f, title: f.title?.trim() || 'Tarefa' }); startTimer(f.id!); close() }} style={{ marginRight: 'auto' }}>▶ Foco 25 min</Btn>}
    {f.id && f.status === 'done' && <span style={{ marginRight: 'auto' }} />}
    <Btn onClick={close}>Cancelar</Btn><Btn variant="primary" onClick={save}>Salvar</Btn></>}>
    <input autoFocus className="input" placeholder="O que precisa ser feito?" value={f.title ?? ''} onChange={e => s({ title: e.target.value })} onKeyDown={e => e.key === 'Enter' && save()} style={{ height: 44, fontSize: 16, fontWeight: 600 }} />
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <div className="field"><label>Projeto</label><ProjectSelect value={f.projectId} onChange={v => s({ projectId: v })} /></div>
      <div className="field"><label>Status</label><select className="input" value={f.status ?? 'todo'} onChange={e => s({ status: e.target.value as Task['status'] })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div className="field"><label>Prioridade</label><select className="input" value={f.priority ?? 'media'} onChange={e => s({ priority: e.target.value as Task['priority'] })}>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div className="field"><label>Início</label><input type="date" className="input" value={f.start ?? ''} onChange={e => s({ start: e.target.value || undefined })} /></div>
      <div className="field"><label>Prazo</label><input type="date" className="input" value={f.due ?? ''} onChange={e => s({ due: e.target.value || undefined })} /></div>
      <div className="field"><label>Horas est.{f.timeLog?.length ? ` · ${Math.round(hoursOf(f as Task) * 10) / 10}h feitas` : ''}</label><input type="number" min={0} step={.5} className="input" value={f.estimate ?? ''} onChange={e => s({ estimate: e.target.value ? Number(e.target.value) : undefined })} /></div>
    </div>
    <div className="field"><label>Tags (separe por vírgula)</label><input className="input" value={(f.tags ?? []).join(', ')} onChange={e => s({ tags: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></div>
    <div className="field"><label>Repetir</label>
      <div className="row wrap" style={{ gap: 6 }}>{([undefined, 'diaria', 'semanal', 'mensal'] as (Repeat | undefined)[]).map(r =>
        <button key={r ?? 'none'} type="button" className={`chip ${f.repeat === r ? 'on' : ''}`} onClick={() => s({ repeat: r })}>{r ? REPEAT_LABEL[r] : 'Não repete'}</button>)}</div></div>
    <div className="field"><label>Checklist {f.checklist?.length ? `· ${f.checklist.filter(c => c.done).length}/${f.checklist.length}` : ''}</label>
      <div className="checklist">
        {(f.checklist ?? []).map(c => <div key={c.id} className="ck">
          <input type="checkbox" checked={c.done} onChange={e => s({ checklist: f.checklist!.map(x => x.id === c.id ? { ...x, done: e.target.checked } : x) })} />
          <input className="ck-t" value={c.text} onChange={e => s({ checklist: f.checklist!.map(x => x.id === c.id ? { ...x, text: e.target.value } : x) })} />
          <button type="button" className="btn ghost sm icon" onClick={() => s({ checklist: f.checklist!.filter(x => x.id !== c.id) })} aria-label="Remover item"><Icon n="x" s={14} /></button>
        </div>)}
        <input className="input" placeholder="+ Adicionar item (Enter)" onKeyDown={e => { const v = e.currentTarget.value.trim(); if (e.key === 'Enter' && v) { e.preventDefault(); s({ checklist: [...(f.checklist ?? []), { id: uid(), text: v, done: false }] }); e.currentTarget.value = '' } }} />
      </div></div>
    <div className="field"><label>Notas</label><textarea className="input" rows={2} value={f.notes ?? ''} onChange={e => s({ notes: e.target.value })} /></div>
  </Modal>
}

function EventModal({ e, close }: { e: Partial<CalEvent> | null; close: () => void }) {
  const { upsertEvent, removeEvent, toast } = useStore()
  const [f, setF] = useState<Partial<CalEvent>>({})
  const [last, setLast] = useState<Partial<CalEvent> | null>(null)
  if (e !== last) { setLast(e); setF(e ?? {}) }
  const s = (p: Partial<CalEvent>) => setF(x => ({ ...x, ...p }))
  const save = () => { if (!f.title?.trim()) return; if ((f.end ?? '') <= (f.start ?? '')) { toast('O fim precisa ser depois do início'); return } upsertEvent({ ...f, title: f.title.trim() }); toast(f.id ? 'Evento atualizado' : 'Evento criado'); close() }
  return <Modal open={!!e} onClose={close} title={f.id ? 'Editar evento' : 'Novo evento'} footer={<>
    {f.id && <Btn variant="ghost" onClick={() => { removeEvent(f.id!); toast('Evento removido'); close() }} style={{ marginRight: 'auto', color: 'var(--bad)' }}><Icon n="trash" /> Excluir</Btn>}
    <Btn onClick={close}>Cancelar</Btn><Btn variant="primary" onClick={save}>Salvar</Btn></>}>
    <input autoFocus className="input" placeholder="Título do compromisso" value={f.title ?? ''} onChange={x => s({ title: x.target.value })} onKeyDown={x => x.key === 'Enter' && save()} style={{ height: 44, fontSize: 16, fontWeight: 600 }} />
    <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10 }}>
      <div className="field"><label>Data</label><input type="date" className="input" value={f.date ?? ''} onChange={x => s({ date: x.target.value })} /></div>
      <div className="field"><label>Início</label><input type="time" className="input" value={f.start ?? ''} onChange={x => s({ start: x.target.value })} /></div>
      <div className="field"><label>Fim</label><input type="time" className="input" value={f.end ?? ''} onChange={x => s({ end: x.target.value })} /></div>
    </div>
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div className="field"><label>Projeto</label><ProjectSelect value={f.projectId} onChange={v => s({ projectId: v })} /></div>
      <div className="field"><label>Local / link</label><input className="input" value={f.location ?? ''} onChange={x => s({ location: x.target.value })} /></div>
    </div>
    <div className="field"><label>Repetir</label>
      <div className="row wrap" style={{ gap: 6 }}>{([undefined, 'diaria', 'semanal', 'mensal'] as (Repeat | undefined)[]).map(r =>
        <button key={r ?? 'none'} type="button" className={`chip ${f.repeat === r ? 'on' : ''}`} onClick={() => s({ repeat: r })}>{r ? (r === 'diaria' ? 'Dias úteis' : REPEAT_LABEL[r]) : 'Não repete'}</button>)}
        {f.repeat && <label className="row" style={{ gap: 6, fontSize: 13, color: 'var(--muted)' }}>até <input type="date" className="input" style={{ height: 34, width: 150 }} value={f.until ?? ''} onChange={x => s({ until: x.target.value || undefined })} /></label>}
      </div></div>
  </Modal>
}
