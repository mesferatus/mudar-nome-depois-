# Kairotec — próximos passos

## 1. Assistente com IA (Claude)

**Objetivo:** conversar com seus dados ("como está o projeto BI?", "reorganiza minha semana", "resume minhas notas de hoje") e deixar a IA *propor* mudanças que você aprova com um clique, como as Rotinas já fazem.

**Como funciona tecnicamente**
1. **Chave própria:** em Ajustes você cola uma chave da API da Anthropic. Ela fica só no seu navegador, nunca no repositório.
2. **Ferramentas (tool use):** o app expõe para o modelo funções como `listar_tarefas`, `criar_tarefa`, `mover_prazo`, `criar_evento`, `buscar_notas`, `resumo_metricas`. O modelo decide quais chamar; o app executa e mostra uma prévia antes de gravar.
3. **Agentes agendados:** as Rotinas viram agentes de verdade — ex.: toda segunda 8h gera o relatório semanal; toda sexta revisa prazos e sugere replanejamento.
4. **Contexto da Volks/Knightec:** uma nota "Contexto" (seus projetos, siglas, KPIs de logística como OTIF, lead time) é enviada junto para respostas mais certeiras.

**Cuidados**
- Dados da empresa: confirmar com a Knightec/Volks se pode enviar conteúdo para uma API externa. Alternativa: modo "só métricas" (envia números, não textos).
- Custo baixo: o modelo menor responde o dia a dia; o maior só para planejamento.

**Etapas**
- [ ] Painel "Assistente" com chat e prévia das ações
- [ ] Ferramentas de leitura (sem risco)
- [ ] Ferramentas de escrita com confirmação
- [ ] Agendamento das rotinas

## 2. Integrações
- [ ] Importar calendário do Outlook (.ics) e, depois, Microsoft Graph
- [ ] Importar planilhas existentes (.xlsx) como tarefas

## 3. Produto
- [x] App instalável (PWA): ícone no celular e no PC, funciona offline
- [ ] Tarefas recorrentes e subtarefas
- [ ] Mais temas e editor de tema próprio

## 4. Qualidade (já automatizado)
- CI no GitHub roda tipos, lint, testes e build a cada push (`npm run check` localmente)
- Próximo: testes de interface (Playwright) para os fluxos principais
