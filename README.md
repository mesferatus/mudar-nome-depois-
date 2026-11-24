# Kairotec

> *kairós* (o momento certo) + *tec*. Planner pessoal que roda localmente: agenda estilo Outlook, caderno estilo Obsidian/Notion, quadro de entregas estilo ClickUp e uma planilha Excel sempre atualizada.

## Rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
# ou, versão otimizada:
npm run build && npm run preview
```

Use **Microsoft Edge** ou **Google Chrome** (necessário para gravar direto em arquivos).

## O que tem

| Aba | O que faz |
| --- | --- |
| **Início** | KPIs (ativas, % no prazo, atrasadas, em risco), entregas por semana, status, burndown de 14 dias, carga da semana, progresso por projeto |
| **Calendário** | Visão Mês (estilo planilha) ou Semana (horários, estilo Outlook). Mês: calendário mensal com cara de planilha. Arraste entregas/eventos entre dias, duplo clique cria evento, exporta `.xlsx` |
| **Agenda** | Semana por horário (estilo Outlook), linha do "agora", clique para criar, arraste para mover |
| **Entregas** | Quadro (A fazer → Em andamento → Revisão → Concluído) e visão em lista, filtros por projeto |
| **Notas** | Caderno estilo Notion: páginas aninhadas, ícones e capas fofas, editor em blocos (**/**) com títulos, listas, tarefas, alternâncias, destaques, código, imagens e links entre páginas; barra de formatação; **bancos de dados** com visões Tabela, Quadro, Galeria e Lista (propriedades de texto, número, seleção, data e caixa); modelos; favoritos; lixeira; duplicar, mover e exportar .md |
| **Rotinas** | Assistentes locais: *Vigia de prazos*, *Planejador de foco* (cria blocos na agenda), *Relatório semanal* (status report pronto pro gestor), *Faxina* |
| **Ajustes** | 12 temas (Café, Vinho, Oliva, Noite, Creme, Morango 🍓, Nuvem ☁️, Jardim 🌸, Lavanda 💜, Bruxinha 🔮, Gótico 🦇, Abóbora 🎃 — com desenhos), projetos, nuvem, Excel, backup |

**Criação rápida:** botão **+ Novo** (ou tecla `N`). Escreva natural: *"Reunião com fornecedor amanhã 14h #bi"*, *"Entregar dashboard sexta !alta ~4h"*, *"nota: ideias de estoque"* — o app entende data, horário, `#projeto`, `!prioridade` e `~horas`.

Atalhos: `Ctrl+K` paleta de comandos · `Alt+1…7` trocar de aba · `N` nova tarefa.

## Mais

- **Tarefas recorrentes** (todo dia / semana / mês — também por texto: *"Daily toda segunda"*) e **checklist** dentro da tarefa
- **Desfazer** ao excluir · **boas-vindas** na primeira vez
- **Celular:** deslize a tarefa → conclui, ← adia 1 dia; calendário com pontinhos; semana em lista
- **Outlook:** Ajustes → Integrações → importar `.ics`
- **Lembretes:** notificação 10 min antes dos eventos e resumo das entregas do dia

## Atualizações automáticas (como na App Store)

A cada mudança na branch `main`, o GitHub testa e publica o app no **GitHub Pages** (`.github/workflows/deploy.yml`). O app instalado verifica sozinho se há versão nova (ao abrir, ao voltar para ele e a cada 30 min) e mostra **"Nova versão ✨ · Atualizar"**. Não precisa desinstalar; seus dados ficam no aparelho.

Para ligar (uma vez): no GitHub, **Settings → Pages → Source: GitHub Actions**.

## Instalar como app

No Edge/Chrome do PC: ícone de instalar na barra de endereço. No celular: menu → *Adicionar à tela inicial*. Abre em janela própria e funciona sem internet.

## Nuvem e Excel (arquivo único)

Em **Ajustes → Nuvem & Excel**:

1. **Arquivo de dados (.json)** — crie dentro de uma pasta do OneDrive/SharePoint. Cada alteração é gravada nele; o OneDrive sincroniza. Em outro PC, use *Abrir existente* para carregar.
2. **Planilha Excel (.xlsx)** — escolha um arquivo uma vez; a partir daí o app reescreve essa planilha a cada mudança com as abas *Resumo*, *Planner* (3 meses, formatado como calendário), *Tarefas*, *Agenda* e *Notas*.

> Se a planilha estiver aberta no Excel, o Windows bloqueia a gravação — o app avisa e atualiza na próxima alteração.

Os dados também ficam no navegador (localStorage) como cópia local.

## Testes

```bash
npm run check   # tipos + lint + testes + build (o mesmo que o CI roda)
```

Próximos passos e plano da IA: veja [ROADMAP.md](ROADMAP.md).

## Estrutura

```
src/
  lib/       tipos, store (estado + autosave), sync (arquivos), excel (ExcelJS), métricas, datas
  components ui (botões, modais, animações), gráficos SVG, editores de tarefa/evento
  views/     Painel, Planner, Agenda, Entregas, Notas, Rotinas, Ajustes
```

Visual limpo com Figtree. Mobile first (barra de navegação inferior no celular); no PC a tela é fixa e só as listas rolam.

Stack: React + TypeScript + Vite, Framer Motion (transições), ExcelJS. Sem servidor.

## Próximos passos (ideias)

- Rotinas com modelo de linguagem (via chave de API própria) para resumir notas, quebrar tarefas e responder "como está o projeto X?"
- Importar `.ics` do Outlook
- Empacotar como app desktop (Tauri) com atalho na bandeja
- Tarefas recorrentes e subtarefas
