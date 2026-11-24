import { describe, it, expect } from 'vitest'
import { mdToBlocks, blocksToMd, shortcut } from '../lib/blocks'

describe('blocos <-> markdown', () => {
  const md = ['# Título', '## Sub', 'Texto livre', '- item', '1. um', '2. dois', '- [x] feito', '- [ ] pendente', '> 💡 Dica importante', '> citação', '---', '```', 'SUM(x)', '```', '<details open><summary>Mais</summary>', 'escondido', '</details>'].join('\n')
  it('reconhece todos os tipos', () => {
    expect(mdToBlocks(md).map(b => b.type)).toEqual(['h1', 'h2', 'p', 'bullet', 'number', 'number', 'todo', 'todo', 'callout', 'quote', 'divider', 'code', 'toggle'])
  })
  it('ida e volta preserva o conteúdo', () => { expect(blocksToMd(mdToBlocks(md))).toBe(md) })
  it('callout guarda o ícone e toggle guarda o corpo', () => {
    const b = mdToBlocks(md)
    expect(b[8]).toMatchObject({ icon: '💡', text: 'Dica importante' })
    expect(b[12]).toMatchObject({ text: 'Mais', open: true, body: 'escondido' })
  })
  it('atalhos de markdown', () => {
    expect(shortcut('# ')?.type).toBe('h1'); expect(shortcut('[] ')?.type).toBe('todo'); expect(shortcut('oi')).toBeNull()
  })
  it('nota vazia vira um parágrafo', () => { expect(mdToBlocks('')).toHaveLength(1) })
})
