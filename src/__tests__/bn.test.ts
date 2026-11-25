import { describe, expect, it } from 'vitest'
import { bnToMd, mdInline, mdToBn, inlineMd } from '../lib/bn'

describe('ponte editor ↔ markdown', () => {
  it('ida e volta mantém a estrutura', () => {
    const md = ['# Título', '- item **forte**', '- [x] feito', '1. um', '2. dois', '> 💡 destaque', '> citação', '---', '```\nx = 1\n```',
      '<details><summary>Abrir</summary>\ndentro\n</details>', '![foto](data:image/png;base64,AA)', '@banco(abc123)', '[[Outra página]]',
      ':::colunas\nesquerda\n:::coluna\n- direita\n:::', 'texto ==marcado== e {azul:colorido} e [[link]] e *itálico* ~~riscado~~ `código`'].join('\n')
    expect(bnToMd(mdToBn(md))).toBe(md)
  })
  it('inline', () => {
    expect(inlineMd(mdInline('a **b** https://x.com'))).toBe('a **b** https://x.com')
    expect(mdToBn('[[Página]]')[0]).toMatchObject({ type: 'pageLink', props: { title: 'Página' } })
    expect(mdToBn('')).toHaveLength(1)
  })
})
