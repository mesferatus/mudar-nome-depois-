export type Status = 'todo' | 'doing' | 'review' | 'done'
export type Priority = 'baixa' | 'media' | 'alta'
export type Repeat = 'diaria' | 'semanal' | 'mensal'

export interface Project { id: string; name: string; color: string }
export interface Task {
  id: string; title: string; projectId?: string; status: Status; priority: Priority
  start?: string; due?: string; doneAt?: string; estimate?: number; tags: string[]; notes?: string
  createdAt: string
  repeat?: Repeat
  checklist?: { id: string; text: string; done: boolean }[]
  timeLog?: { start: string; end: string }[]
}
export interface CalEvent {
  id: string; title: string; date: string; start: string; end: string
  projectId?: string; location?: string; color?: string
  repeat?: Repeat; until?: string
}
export interface Note {
  id: string; title: string; body: string; folder: string; tags: string[]; updatedAt: string; pinned?: boolean
  parentId?: string; icon?: string; cover?: string; expanded?: boolean
  trashed?: boolean; wide?: boolean
  db?: DbSchema
  props?: Record<string, string | number | boolean | undefined>
}
export type PropType = 'text' | 'number' | 'select' | 'date' | 'checkbox'
export interface Prop { id: string; name: string; type: PropType; options?: { name: string; color: string }[] }
export type DbView = 'table' | 'board' | 'gallery' | 'list'
export interface DbSchema { props: Prop[]; view: DbView; sort?: { prop: string; dir: 1 | -1 } }
export interface Settings { theme: string; userName: string; weekStart: 0 | 1; autoExcel: boolean; autoCloud: boolean; onboarded?: boolean; reminders?: boolean }

export interface Data {
  version: 1
  projects: Project[]; tasks: Task[]; events: CalEvent[]; notes: Note[]
  settings: Settings
  updatedAt: string
  timer?: { taskId: string; start: string; mode: 'livre' | 'pomodoro' }
}

export const STATUS_LABEL: Record<Status, string> = { todo: 'A fazer', doing: 'Em andamento', review: 'Revisão', done: 'Concluído' }
export const PRIORITY_LABEL: Record<Priority, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }

export const REPEAT_LABEL: Record<Repeat, string> = { diaria: 'Todo dia', semanal: 'Toda semana', mensal: 'Todo mês' }
