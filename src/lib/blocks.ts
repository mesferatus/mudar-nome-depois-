/*
 * Conversão entre blocos (editor estilo Notion) e Markdown (como a nota é guardada).
 * Guardar em Markdown mantém backup, Excel e backlinks funcionando.
 */
export type BType = 'p' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'todo' | 'quote' | 'callout' | 'divider' | 'code' | 'toggle' | 'image' | 'page' | 'database' | 'dbview'
export interface Block { id: string; type: BType; text: string; checked?: boolean; icon?: string; open?: boolean; body?: string }

let n = 0
export const bid = () => `b${Date.now().toString(36)}${(n++).toString(36)}`

export function mdToBlocks(md: string): Block[] {
  const out: Block[] = []
  const lines = md.replace(/\r/g, '').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      out.push({ id: bid(), type: 'code', text: code.join('\n') })
      continue
    }
    let m: RegExpMatchArray | null
    if (!l.trim()) continue
    if ((m = l.match(/^<details( open)?><summary>(.*)<\/summary>$/))) {
      const body: string[] = []
      i++
      while (i < lines.length && lines[i] !== '</details>') body.push(lines[i++])
      out.push({ id: bid(), type: 'toggle', text: m[2], open: !!m[1], body: body.join('\n') })
    } else if ((m = l.match(/^### (.*)/))) out.push({ id: bid(), type: 'h3', text: m[1] })
    else if ((m = l.match(/^## (.*)/))) out.push({ id: bid(), type: 'h2', text: m[1] })
    else if ((m = l.match(/^# (.*)/))) out.push({ id: bid(), type: 'h1', text: m[1] })
    else if ((m = l.match(/^\s*- \[( |x)\] ?(.*)/))) out.push({ id: bid(), type: 'todo', text: m[2], checked: m[1] === 'x' })
    else if ((m = l.match(/^\s*[-*] (.*)/))) out.push({ id: bid(), type: 'bullet', text: m[1] })
    else if ((m = l.match(/^\s*\d+\. (.*)/))) out.push({ id: bid(), type: 'number', text: m[1] })
    else if ((m = l.match(/^> (\p{Extended_Pictographic}️?) (.*)/u))) out.push({ id: bid(), type: 'callout', icon: m[1], text: m[2] })
    else if ((m = l.match(/^> ?(.*)/))) out.push({ id: bid(), type: 'quote', text: m[1] })
    else if (/^(-{3,}|\*{3,})$/.test(l.trim())) out.push({ id: bid(), type: 'divider', text: '' })
    else out.push({ id: bid(), type: 'p', text: l })
  }
  return out.length ? out : [{ id: bid(), type: 'p', text: '' }]
}

export function blocksToMd(bs: Block[]): string {
  let num = 0
  return bs.map((b, i) => {
    num = b.type === 'number' ? (bs[i - 1]?.type === 'number' ? num + 1 : 1) : 0
    switch (b.type) {
      case 'h1': return `# ${b.text}`
      case 'h2': return `## ${b.text}`
      case 'h3': return `### ${b.text}`
      case 'bullet': return `- ${b.text}`
      case 'number': return `${num}. ${b.text}`
      case 'todo': return `- [${b.checked ? 'x' : ' '}] ${b.text}`
      case 'quote': return `> ${b.text}`
      case 'callout': return `> ${b.icon ?? '💡'} ${b.text}`
      case 'divider': return '---'
      case 'dbview': return `@banco(${b.text})`
      case 'image': return `![${b.body ?? ''}](${b.text})`
      case 'code': return '```\n' + b.text + '\n```'
      case 'toggle': return `<details${b.open ? ' open' : ''}><summary>${b.text}</summary>\n${b.body ?? ''}\n</details>`
      default: return b.text
    }
  }).join('\n')
}

export const SLASH: { type: BType; label: string; hint: string; icon: string; keys: string }[] = [
  { type: 'p', label: 'Texto', hint: 'Parágrafo simples', icon: 'Aa', keys: 'texto paragrafo' },
  { type: 'h1', label: 'Título 1', hint: 'Seção grande', icon: 'H1', keys: 'titulo heading h1' },
  { type: 'h2', label: 'Título 2', hint: 'Seção média', icon: 'H2', keys: 'titulo heading h2 subtitulo' },
  { type: 'h3', label: 'Título 3', hint: 'Seção pequena', icon: 'H3', keys: 'titulo heading h3' },
  { type: 'todo', label: 'Lista de tarefas', hint: 'Checklist', icon: '☑', keys: 'tarefa todo checklist check' },
  { type: 'bullet', label: 'Lista', hint: 'Tópicos com marcador', icon: '•', keys: 'lista bullet topicos' },
  { type: 'number', label: 'Lista numerada', hint: '1, 2, 3…', icon: '1.', keys: 'numerada numero ordenada' },
  { type: 'toggle', label: 'Alternância', hint: 'Conteúdo que abre e fecha', icon: '▸', keys: 'toggle alternancia recolher' },
  { type: 'callout', label: 'Destaque', hint: 'Caixa com ícone', icon: '💡', keys: 'callout destaque aviso nota' },
  { type: 'quote', label: 'Citação', hint: 'Trecho em destaque', icon: '❝', keys: 'citacao quote' },
  { type: 'code', label: 'Código', hint: 'DAX, SQL, Python…', icon: '</>', keys: 'codigo code dax sql python' },
  { type: 'page', label: 'Página', hint: 'Subpágina dentro desta', icon: '📄', keys: 'pagina page subpagina' },
  { type: 'dbview', label: 'Banco de dados (aqui)', hint: 'Tabela/quadro dentro desta página', icon: '▦', keys: 'banco database tabela table quadro galeria inline' },
  { type: 'database', label: 'Banco de dados (página)', hint: 'Em uma página própria', icon: '🗂', keys: 'banco database pagina' },
  { type: 'image', label: 'Imagem', hint: 'Enviar arquivo ou colar link', icon: '🖼', keys: 'imagem image foto print' },
  { type: 'divider', label: 'Divisor', hint: 'Linha separadora', icon: '—', keys: 'divisor linha separador' },
]

/** Atalhos de Markdown digitados no início do bloco: "# ", "- ", "[] "… */
export function shortcut(text: string): { type: BType; text: string; checked?: boolean } | null {
  const rules: [RegExp, BType][] = [[/^# $/, 'h1'], [/^## $/, 'h2'], [/^### $/, 'h3'], [/^[-*] $/, 'bullet'], [/^1\. $/, 'number'], [/^\[\] $/, 'todo'], [/^> $/, 'quote'], [/^---$/, 'divider'], [/^```$/, 'code']]
  for (const [re, type] of rules) if (re.test(text)) return { type, text: '' }
  return null
}

export const TEMPLATES: { id: string; name: string; icon: string; cover?: string; body: string }[] = [
  { id: 'reuniao', name: 'Ata de reunião', icon: '🗓️', cover: 'nuvens', body: '> 📍 Data, participantes e objetivo\n## Pauta\n- \n## Decisões\n- \n## Próximos passos\n- [ ] ' },
  { id: 'projeto', name: 'Projeto', icon: '🎯', cover: 'jardim', body: '> 🎯 Objetivo do projeto em uma frase\n## Escopo\n- \n## Entregas\n- [ ] \n## Riscos\n- \n## Links\n- ' },
  { id: 'diario', name: 'Diário', icon: '🌸', cover: 'coracoes', body: '## Como estou hoje\n\n## 3 prioridades\n1. \n2. \n3. \n## Gratidão\n- ' },
  { id: 'bi', name: 'Especificação de BI', icon: '📊', cover: 'cafe', body: '> 📊 Pergunta de negócio que o painel responde\n## Fontes de dados\n- \n## Medidas (DAX)\n```\nMedida = \n```\n## Visuais\n- \n## Validação\n- [ ] Conferir números com a área' },
  { id: 'estudo', name: 'Estudos', icon: '📚', cover: 'estrelas', body: '## O que aprendi\n\n<details><summary>Exemplo</summary>\n\n</details>\n## Dúvidas\n- [ ] ' },
]
