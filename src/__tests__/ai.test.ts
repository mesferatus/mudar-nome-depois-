import { describe, it, expect } from 'vitest'
import { parseReply, applyActions, buildContext, describe as desc, ollamaAsk } from '../lib/ai'
import type { Data } from '../lib/types'

const data = {
  version: 1, updatedAt: '', notes: [], events: [{ id: 'e1', title: 'Daily', date: '2026-11-25', start: '09:00', end: '09:30' }],
  projects: [{ id: 'p1', name: 'BI Logística', color: '#fff' }],
  settings: { theme: 'cafe', userName: 'Ana', weekStart: 1, autoExcel: true, autoCloud: true },
  tasks: [{ id: 'abc123xyz', title: 'Dashboard OTIF', status: 'todo', priority: 'alta', tags: [], createdAt: '', due: '2026-11-20', projectId: 'p1', estimate: 6 }],
} as Data

describe('leitura da resposta da IA', () => {
  it('JSON dentro de ```json``` com texto em volta (estilo Copilot)', () => {
    const r = parseReply('Claro! Aqui está:\n```json\n{"resposta":"Fiz um plano","acoes":[{"tipo":"mover_prazo","id":"abc123","prazo":"2026-11-28"}]}\n```\nAbraço')
    expect(r.resposta).toBe('Fiz um plano'); expect(r.acoes).toHaveLength(1)
  })
  it('descarta ações inválidas e aceita texto puro', () => {
    expect(parseReply('{"resposta":"ok","acoes":[{"tipo":"mover_prazo","id":"x","prazo":"amanhã"},{"tipo":"apagar_tudo"}]}').acoes).toHaveLength(0)
    expect(parseReply('Só uma resposta em texto.')).toEqual({ resposta: 'Só uma resposta em texto.', acoes: [] })
  })
  it('evento com fim antes do início é recusado', () => {
    expect(parseReply('{"acoes":[{"tipo":"criar_evento","titulo":"x","data":"2026-11-26","inicio":"15:00","fim":"14:00"}]}').acoes).toHaveLength(0)
  })
})

describe('aplicar ações', () => {
  const out = applyActions(data, [
    { tipo: 'mover_prazo', id: 'abc123', prazo: '2026-11-28' },
    { tipo: 'subtarefas', id: 'abc123', itens: ['Validar fonte', 'Montar visual'] },
    { tipo: 'criar_tarefa', titulo: 'Revisar KPIs', projeto: 'bi', prioridade: 'alta', prazo: '2026-11-27', horas: 2 },
    { tipo: 'criar_evento', titulo: 'Foco: OTIF', data: '2026-11-26', inicio: '10:00', fim: '12:00' },
    { tipo: 'criar_nota', titulo: 'Status', conteudo: '# Status' },
    { tipo: 'concluir', id: 'naoexiste' },
  ])
  it('altera, cria e ignora ids inexistentes', () => {
    const t = out.tasks.find(x => x.id === 'abc123xyz')!
    expect(t.due).toBe('2026-11-28'); expect(t.checklist?.map(c => c.text)).toEqual(['Validar fonte', 'Montar visual'])
    expect(out.tasks.find(x => x.title === 'Revisar KPIs')).toMatchObject({ projectId: 'p1', priority: 'alta', estimate: 2 })
    expect(out.events).toHaveLength(2); expect(out.notes[0].title).toBe('Status')
    expect(data.tasks[0].due).toBe('2026-11-20') // original intacto
  })
  it('descreve para conferir', () => { expect(desc(data, { tipo: 'concluir', id: 'abc123' })).toBe('Concluir “Dashboard OTIF”') })
})

describe('contexto e Ollama', () => {
  it('contexto traz tarefas com id curto e agenda', () => {
    const c = buildContext(data); expect(c).toContain('abc123 | Dashboard OTIF | BI Logística'); expect(c).toContain('Projetos: BI Logística')
  })
  it('conversa com o Ollama pelo formato JSON', async () => {
    let sent: { model?: string; format?: string } = {}
    const http = async (_url: string, init?: { body?: string }) => { sent = JSON.parse(init!.body!); return { ok: true, status: 200, text: JSON.stringify({ message: { content: '{"resposta":"Priorize o OTIF","acoes":[{"tipo":"concluir","id":"abc123"}]}' } }) } }
    const r = await ollamaAsk('qwen2.5:3b', data, 'o que faço hoje?', [], false, http)
    expect(sent).toMatchObject({ model: 'qwen2.5:3b', format: 'json' }); expect(r.acoes[0]).toEqual({ tipo: 'concluir', id: 'abc123' })
  })
})
