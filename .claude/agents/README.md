# Studio de Agentes "CAIXA-PRETA" — 18 agentes para o Dashboard Marconi Foods

Um **time de agentes especializados** que cuida do dashboard financeiro executivo da
Marconi Foods como uma equipe de produto: mantém o **dado correto**, evolui a **UI**,
garante **QA verde** e **publica** no GitHub Pages — e **revisam uns aos outros**.

Diferente do studio ORBIT (genérico, para vender dashboards), este time é colado na
**stack e no domínio reais** deste repo: site estático, JS vanilla concatenado por
`build.mjs`, `financeiro.json` validado por `precompute-data.mjs`, QA headless via CDP
(`qa-dashboard.mjs`), GitHub Pages/Actions, e contabilidade (Fluxo de Caixa, Custos
Fixos, DRE) com rigor de auditoria.

## O que tem aqui

| Arquivo / pasta | O que é |
|---|---|
| **`TEAM-CHARTER.md`** | Documento mestre: organograma, matriz de revisão cruzada, handoff, escalonamento, Definition of Done. **Comece por aqui.** |
| **`WORKFLOWS.md`** | 3 pipelines prontos: A) Atualização de dados · B) Mudança de UI/feature · C) Publicação/deploy. |
| **`*.md` (18 arquivos)** | Os agentes, cada um no formato de subagente (frontmatter `name/description/tools/model` + corpo). |
| **`_handoffs/`** | Onde cada agente registra o que fez para o próximo continuar. |

> Os agentes herdam e **fazem cumprir** as Regras de Ouro do `CLAUDE.md` (raiz do repo).
> O charter não substitui o `CLAUDE.md` — ele o operacionaliza.

## As 6 guildas (18 agentes)

| # | Guilda | Agentes |
|---|---|---|
| 00 | Orquestração & Entrega | 2 |
| 01 | Dados Financeiros & Contabilidade | 3 |
| 02 | Arquitetura & Build | 2 |
| 03 | Páginas, Dataviz & Exportação | 3 |
| 04 | Design, UX & Acessibilidade | 4 |
| 05 | Qualidade, Deploy & Segurança | 4 |

## Como usar (rápido)

1. **Deixe o maestro conduzir:** dê o objetivo ao `maestro-orquestrador`. Ele quebra em
   tarefas, delega às guildas e garante que cada entrega passou por revisor + auditor.
2. **Ou chame um agente direto:** ex. `engenheiro-de-dados-financeiros` para atualizar o
   `financeiro.json`, `engenheiro-dataviz` para um gráfico, `analista-contabil-dre` para
   validar a DRE, `engenheiro-qa-dashboard` para rodar o QA.
3. **Ou rode um pipeline inteiro** (A, B ou C do `WORKFLOWS.md`).

> Em Claude Code, estes arquivos viram subagentes invocáveis via Task. Cada agente já
> sabe seguir o Charter, deixar handoff e respeitar a Definition of Done.

## Métrica-norte

A diretoria entende a saúde do caixa 2026 **em menos de 5 segundos, com o número certo**.
Bonito com número errado é risco, não entrega.
