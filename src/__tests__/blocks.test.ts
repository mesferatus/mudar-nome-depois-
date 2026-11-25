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

describe('banco de dados dentro da página', () => {
  it('ida e volta do bloco @banco', () => {
    const b = mdToBlocks('Texto\n@banco(abc123)\nFim')
    expect(b[1]).toMatchObject({ type: 'dbview', text: 'abc123' })
    expect(blocksToMd(b)).toBe('Texto\n@banco(abc123)\nFim')
  })
})

describe('imagem', () => {
  it('ida e volta com legenda e link', () => {
    const md = '![Fluxo de doca](https://exemplo.com/a.png)'
    expect(mdToBlocks(md)[0]).toMatchObject({ type: 'image', text: 'https://exemplo.com/a.png', body: 'Fluxo de doca' })
    expect(blocksToMd(mdToBlocks(md))).toBe(md)
  })
  it('imagem enviada (data URL)', () => { expect(mdToBlocks('![](data:image/png;base64,AAAA)')[0].type).toBe('image') })
})

describe('colunas', () => {
  it('ida e volta com conteúdo em cada coluna', () => {
    const md = 'Antes\n:::colunas\n## Esquerda\n- item\n:::coluna\n- [ ] tarefa\n:::\nDepois'
    const b = mdToBlocks(md)
    expect(b.map(x => x.type)).toEqual(['p', 'columns', 'p'])
    expect(b[1].cols).toEqual(['## Esquerda\n- item', '- [ ] tarefa'])
    expect(blocksToMd(b)).toBe(md)
  })
})
