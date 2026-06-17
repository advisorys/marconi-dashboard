# WORKFLOWS — Studio CAIXA-PRETA (Dashboard Marconi)

Três pipelines prontos. Cada um percorre a cadeia **produtor → revisor → auditor** e
termina na **Definition of Done** (`TEAM-CHARTER.md` §6). O `maestro-orquestrador`
conduz; o `gerente-de-entrega` cobra o checklist.

---

## Pipeline A — Atualização de dados (mensal / fechamento)

Quando chega novo dado financeiro (extrato Bling, DRE da Priori, custos fixos do mês).

```
1. engenheiro-de-dados-financeiros
   → atualiza data/financeiro.json (ou roda o importador); NUNCA edita à mão sem validar.
   → roda `npm run precompute` (valida schema, recalcula `precomputed`, carimba selo
     realizado/parcial/projeção por calendário). Falhou? volta aqui.
2. analista-contabil-dre  (REVISOR)
   → confere significado: resultado, DRE bate com a oficial, custos real×orçado coerentes,
     fronteira realizado/projeção certa para o mês corrente.
3. auditor-financeiro-adversarial  (AUDITOR — pode bloquear)
   → verificação adversarial: `resultado == entradas − saídas` (±0,02), somatórios,
     totais de custos, reconciliação 12 meses. Número não bate → BLOQUEIA.
4. engenheiro-de-build
   → `npm run build` (regenera assets na ordem fixa, atualiza `?v=`/`ASSET_VERSION`).
5. engenheiro-qa-dashboard  (AUDITOR)
   → `npm run qa` (local) ou confia no GitHub Actions (Cowork). QA vermelho → para.
6. engenheiro-devops-pages
   → checklist de publicação: `git diff --check`, add específico, commit claro, push `main`.
   → gerente-de-entrega registra handoff e fecha a DoD.
```

> **Atalho existente:** há a skill `atualizar-dados` em `.claude/skills/` — o
> `engenheiro-de-dados-financeiros` a usa como caminho seguro de atualização.

---

## Pipeline B — Mudança de UI / nova feature

Qualquer alteração visual, de página, gráfico, tema ou exportação.

```
1. maestro-orquestrador  → quebra o pedido, define critério de aceite (Given/When/Then).
2. designer-executivo-ui → especifica o visual/hierarquia; muda paleta? só em branch, com antes/depois.
3. PRODUTOR (depende do alvo):
   - página/navegação/filtro → engenheiro-paginas
   - gráfico               → engenheiro-dataviz   (revisor: analista-contabil-dre p/ o dado)
   - tokens/tema/CSS       → engenheiro-design-system
   - export PDF/PPTX       → especialista-exportacao
   - responsivo/overflow   → engenheiro-responsivo-mobile
   ⚠️ Edita SEMPRE em `src/` e roda o build. Nunca em `assets/` direto.
   ⚠️ 45-dre.js fica ENTRE 40 e 50 na ordem de build (mover quebra a DRE em silêncio).
4. revisor-de-codigo  (REVISOR)         → lê o diff inteiro; bloqueante trava o merge.
5. auditor-acessibilidade  (AUDITOR)    → WCAG AA; contraste/foco/teclado.
6. engenheiro-de-build → `npm run build`.
7. engenheiro-qa-dashboard  (AUDITOR)   → QA navegador verde (sem overflow, topbar estável,
   KPIs contam, abas respondem, sem erro de console relevante).
8. engenheiro-devops-pages → publica seguindo o checklist; gerente-de-entrega fecha a DoD.
```

> **Nova página?** Use a skill `nova-pagina-dashboard` (`.claude/skills/`): some um módulo
> que **envolve** `setDashboardPage` (padrão decorator) — não reescreva a base.

---

## Pipeline C — Publicação / deploy

Portão final antes do `git push origin main` (GitHub Pages publica sozinho).

```
1. gerente-de-entrega → confirma que A e/ou B fecharam a DoD.
2. engenheiro-de-build → `npm run prepare-dashboard && npm run build:prod`.
3. auditor-de-seguranca-privacidade  (AUDITOR — pode bloquear)
   → sem `embedded-data` no index.html, bootstrap faz fetch do JSON, nenhum segredo,
     nada que vaze o link/dado sigiloso.
4. engenheiro-qa-dashboard → QA verde (local) + confirma o run do Actions.
5. engenheiro-devops-pages → `git status -sb`, `git diff --check`, `git add <arquivos>`,
   commit claro, `git push origin main`. Acompanha o Actions; vermelho → rollback.
6. maestro-orquestrador → comunica ao Felipe: o que mudou, link, e o que ficou pendente.
```

**Não publicar** se: QA vermelho, número não verificado, asset editado à mão, ou só
ruído de EOL/timestamp no diff. Sem mudança real → não commita.

---

## Convenções compartilhadas

- **Fonte de verdade do dado:** `data/financeiro.json`. **Fonte de verdade do código:** `src/`. **Gerados:** `assets/`.
- **Helpers globais:** `MarconiFormat` (formatação + selo realizado/projeção), `MarconiEvents` (`page:changed`, `filter:changed`), `MarconiMotion`, `MarconiPerf`, `onDashboardReady`.
- **Selo realizado/projeção é dinâmico** (por calendário no dado). Nunca cravar `m>=7`/`m<=6` no código — leia via `MarconiFormat.isProjectionMonth/isRealizedMonth/isPartialMonth`.
- **Handoff sempre:** `_handoffs/<data>-<agente>.md`.
