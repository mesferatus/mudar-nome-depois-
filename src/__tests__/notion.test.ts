import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { importNotionZip, importNotionApi, rich, blockToMd, parseCsv } from '../lib/notion'

describe('texto rico e blocos', () => {
  it('negrito, itálico, código, cor e marca-texto', () => {
    expect(rich([{ plain_text: 'A', annotations: { bold: true } }, { plain_text: ' b', annotations: { italic: true } }])).toBe('**A*** b*')
    expect(rich([{ plain_text: 'x', annotations: { color: 'red' } }])).toBe('{vermelho:x}')
    expect(rich([{ plain_text: 'y', annotations: { color: 'yellow_background' } }])).toBe('==y==')
  })
  it('tipos de bloco', () => {
    const rt = { rich_text: [{ plain_text: 'Oi' }] }
    expect(blockToMd({ type: 'heading_2', heading_2: rt })).toBe('## Oi')
    expect(blockToMd({ type: 'to_do', to_do: { ...rt, checked: true } })).toBe('- [x] Oi')
    expect(blockToMd({ type: 'callout', callout: { ...rt, icon: { emoji: '⚠️' } } })).toBe('> ⚠️ Oi')
    expect(blockToMd({ type: 'toggle', toggle: rt }, 'dentro')).toBe('<details><summary>Oi</summary>\ndentro\n</details>')
  })
  it('CSV com aspas e vírgulas', () => { expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']]) })
})

describe('importar .zip exportado do Notion', () => {
  it('páginas, subpáginas, links e banco de dados com linhas', async () => {
    const z = new JSZip()
    z.file('Trabalho 0123456789abcdef0123456789abcdef.md', '# Trabalho\n\nVeja [Ideias](Trabalho%200123456789abcdef0123456789abcdef/Ideias%20aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md)')
    z.file('Trabalho 0123456789abcdef0123456789abcdef/Ideias aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md', '# Ideias\n\n- OTIF semanal')
    z.file('Trabalho 0123456789abcdef0123456789abcdef/Projetos bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.csv', 'Nome,Status,Prazo\nDashboard,Feito,2026-11-30\nCurva ABC,Fazendo,')
    z.file('Trabalho 0123456789abcdef0123456789abcdef/Projetos bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/Dashboard cccccccccccccccccccccccccccccccc.md', '# Dashboard\n\nStatus: Feito\nPrazo: 2026-11-30\n\nNotas do dashboard')
    const notes = await importNotionZip(await z.generateAsync({ type: 'blob' }))
    const by = (t: string) => notes.find(n => n.title === t)!
    expect(by('Trabalho').body).toBe('Veja [[Ideias]]')
    expect(by('Ideias').parentId).toBe(by('Trabalho').id)
    expect(by('Projetos').db?.props.map(p => p.name)).toEqual(['Status', 'Prazo'])
    expect(by('Dashboard')).toMatchObject({ parentId: by('Projetos').id, body: 'Notas do dashboard', props: { c0: 'Feito', c1: '2026-11-30' } })
    expect(notes.filter(n => n.title === 'Dashboard')).toHaveLength(1)
  })
})

describe('importar pela API do Notion', () => {
  it('página com subpágina e banco de dados', async () => {
    const R: Record<string, unknown> = {
      'POST /search': { results: [{ object: 'page', id: 'P1', parent: { type: 'workspace' }, icon: { emoji: '🚚' }, properties: { title: { type: 'title', title: [{ plain_text: 'Logística' }] } } }], has_more: false },
      'GET /blocks/P1/children?page_size=100': { results: [
        { id: 'b1', type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Resumo' }] } },
        { id: 'P2', type: 'child_page', child_page: { title: 'Fornecedores' } },
        { id: 'D1', type: 'child_database', child_database: { title: 'Entregas' } },
      ], has_more: false },
      'GET /blocks/P2/children?page_size=100': { results: [{ id: 'b2', type: 'to_do', to_do: { checked: false, rich_text: [{ plain_text: 'Cotar' }] } }], has_more: false },
      'GET /databases/D1': { properties: { Nome: { id: 'title', type: 'title' }, Status: { id: 'st', type: 'status', status: { options: [{ name: 'Feito' }] } }, Horas: { id: 'h', type: 'number' } } },
      'POST /databases/D1/query': { results: [{ id: 'R1', properties: { Nome: { type: 'title', title: [{ plain_text: 'OTIF' }] }, Status: { type: 'status', status: { name: 'Feito' } }, Horas: { type: 'number', number: 6 } } }], has_more: false },
      'GET /blocks/R1/children?page_size=100': { results: [], has_more: false },
    }
    const fetcher = async (url: string, init?: { method?: string }) => {
      const key = `${init?.method ?? 'GET'} ${url.replace('https://api.notion.com/v1', '')}`
      return R[key] ? { ok: true, status: 200, text: JSON.stringify(R[key]) } : { ok: false, status: 404, text: key }
    }
    const notes = await importNotionApi(fetcher)
    const by = (t: string) => notes.find(n => n.title === t)!
    expect(by('Logística')).toMatchObject({ icon: '🚚' })
    expect(by('Logística').body).toContain('Resumo'); expect(by('Logística').body).toContain('[[Fornecedores]]'); expect(by('Logística').body).toMatch(/@banco\(\w+\)/)
    expect(by('Fornecedores')).toMatchObject({ parentId: by('Logística').id, body: '- [ ] Cotar' })
    expect(by('Entregas').db?.props.map(p => p.type)).toEqual(['select', 'number'])
    expect(by('OTIF')).toMatchObject({ parentId: by('Entregas').id, props: { st: 'Feito', h: 6 } })
  })
})
