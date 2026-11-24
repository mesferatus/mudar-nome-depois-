export type Status = 'todo' | 'doing' | 'review' | 'done'
export type Priority = 'baixa' | 'media' | 'alta'

export interface Project { id: string; name: string; color: string }
export interface Task {
  id: string; title: string; projectId?: string; status: Status; priority: Priority
  start?: string; due?: string; doneAt?: string; estimate?: number; tags: string[]; notes?: string
  createdAt: string
}
export interface CalEvent {
  id: string; title: string; date: string; start: string; end: string
  projectId?: string; location?: string; color?: string
}
export interface Note { id: string; title: string; body: string; folder: string; tags: string[]; updatedAt: string; pinned?: boolean }
export interface Settings { theme: string; userName: string; weekStart: 0 | 1; autoExcel: boolean; autoCloud: boolean }

export interface Data {
  version: 1
  projects: Project[]; tasks: Task[]; events: CalEvent[]; notes: Note[]
  settings: Settings
  updatedAt: string
}

export const STATUS_LABEL: Record<Status, string> = { todo: 'A fazer', doing: 'Em andamento', review: 'Revisão', done: 'Concluído' }
export const PRIORITY_LABEL: Record<Priority, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }
