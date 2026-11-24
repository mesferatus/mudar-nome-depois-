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
| **Painel** | KPIs (ativas, % no prazo, atrasadas, em risco), entregas por semana, status, burndown de 14 dias, carga da semana, progresso por projeto |
| **Planner** | Calendário mensal com cara de planilha. Arraste entregas/eventos entre dias, duplo clique cria evento, exporta `.xlsx` |
| **Agenda** | Semana por horário (estilo Outlook), linha do "agora", clique para criar, arraste para mover |
| **Entregas** | Quadro (A fazer → Em andamento → Revisão → Concluído) e visão em lista, filtros por projeto |
| **Notas** | Markdown, pastas, `#tags`, `[[links]]` entre páginas, backlinks, checklists clicáveis, notas fixadas |
| **Rotinas** | Assistentes locais: *Vigia de prazos*, *Planejador de foco* (cria blocos na agenda), *Relatório semanal* (status report pronto pro gestor), *Faxina* |
| **Ajustes** | 5 temas retrô editoriais (Bordeaux, Café, Rosé, Ameixa, Celeste), projetos, nuvem, Excel, backup |

Atalhos: `Ctrl+K` paleta de comandos · `Alt+1…7` trocar de aba · `N` nova tarefa.

## Nuvem e Excel (arquivo único)

Em **Ajustes → Nuvem & Excel**:

1. **Arquivo de dados (.json)** — crie dentro de uma pasta do OneDrive/SharePoint. Cada alteração é gravada nele; o OneDrive sincroniza. Em outro PC, use *Abrir existente* para carregar.
2. **Planilha Excel (.xlsx)** — escolha um arquivo uma vez; a partir daí o app reescreve essa planilha a cada mudança com as abas *Resumo*, *Planner* (3 meses, formatado como calendário), *Tarefas*, *Agenda* e *Notas*.

> Se a planilha estiver aberta no Excel, o Windows bloqueia a gravação — o app avisa e atualiza na próxima alteração.

Os dados também ficam no navegador (localStorage) como cópia local.

## Estrutura

```
src/
  lib/       tipos, store (estado + autosave), sync (arquivos), excel (ExcelJS), métricas, datas
  components ui (botões, modais, animações), gráficos SVG, editores de tarefa/evento
  views/     Painel, Planner, Agenda, Entregas, Notas, Rotinas, Ajustes
```

Visual: serifadas (DM Serif Display + Instrument Serif itálico), Work Sans, listras, selos e pastas.

Stack: React + TypeScript + Vite, Framer Motion (transições), ExcelJS. Sem servidor.

## Próximos passos (ideias)

- Rotinas com modelo de linguagem (via chave de API própria) para resumir notas, quebrar tarefas e responder "como está o projeto X?"
- Importar `.ics` do Outlook
- Empacotar como app desktop (Tauri) com atalho na bandeja
- Tarefas recorrentes e subtarefas
