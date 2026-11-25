import type { DbSchema } from './types'

export const OPT_COLORS = ['#e6a87c', '#b9c7e8', '#9fcf9a', '#f0a6ca', '#f0c27a', '#c9a7ff', '#ef8a7a', '#9fd3c7']

/** Banco de dados novo, com Status / Data / Responsável. */
export const newDbSchema = (): DbSchema => ({
  view: 'table',
  props: [
    { id: 'status', name: 'Status', type: 'select', options: [{ name: 'A fazer', color: OPT_COLORS[1] }, { name: 'Fazendo', color: OPT_COLORS[0] }, { name: 'Feito', color: OPT_COLORS[2] }] },
    { id: 'data', name: 'Data', type: 'date' },
    { id: 'tags', name: 'Responsável', type: 'text' },
  ],
})
