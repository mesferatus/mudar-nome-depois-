import { describe, it, expect } from 'vitest'
import { mergeData } from '../lib/cloudsync'
import type { Data } from '../lib/types'

const base = { version: 1, projects: [], events: [], notes: [], settings: { theme: 'cafe', userName: '', weekStart: 1, autoExcel: true, autoCloud: true } } as unknown as Data
const t = (id: string, title: string) => ({ id, title, status: 'todo', priority: 'media', tags: [], createdAt: '' }) as Data['tasks'][number]

describe('mergeData', () => {
  it('não perde itens criados em aparelhos diferentes e prefere a versão local no mesmo item', () => {
    const local = { ...base, updatedAt: '2', tasks: [t('a', 'A (PC)'), t('b', 'B')] }
    const remote = { ...base, updatedAt: '3', tasks: [t('a', 'A (celular)'), t('c', 'C do celular')] }
    const m = mergeData(local, remote)
    expect(m.tasks.map(x => x.id).sort()).toEqual(['a', 'b', 'c'])
    expect(m.tasks.find(x => x.id === 'a')!.title).toBe('A (PC)')
  })
})
