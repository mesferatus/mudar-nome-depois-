import { useState } from 'react'
import { Seg } from '../components/ui'
import Planner from './Planner'
import Agenda from './Agenda'

type Mode = 'mes' | 'semana'
const read = (): Mode => { try { return (localStorage.getItem('kairotec:cal') as Mode) || 'mes' } catch { return 'mes' } }

/** Calendário único: visão de mês (planner estilo planilha) ou semana (horários, estilo Outlook). */
export default function Calendar() {
  const [mode, setMode] = useState<Mode>(read)
  const set = (m: Mode) => { setMode(m); try { localStorage.setItem('kairotec:cal', m) } catch { /* ignore */ } }
  const sw = <Seg value={mode} onChange={set} options={[{ v: 'mes', l: 'Mês' }, { v: 'semana', l: 'Semana' }]} />
  return mode === 'mes' ? <Planner switcher={sw} /> : <Agenda switcher={sw} />
}
