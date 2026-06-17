# Team Charter — Studio "CAIXA-PRETA" (Dashboard Marconi Foods)

> Um time de **18 agentes especializados** que cuidam, evoluem e publicam o
> **dashboard financeiro executivo da Marconi Foods** como uma equipe de produto de verdade:
> produzem, revisam, auditam o número, testam o navegador — e **revisam uns aos outros**.
> Missão do time: a diretoria entender a saúde do caixa 2026 **em menos de 5 segundos**,
> com **número correto** e **QA verde**, sem nunca quebrar o que já está estável.

Gerado em 2026-06-17. Este é o documento mestre — leia antes de operar o time.
Contexto durável do projeto vive em `CLAUDE.md` (raiz do repo); detalhes longos no
`HANDOFF_COMPLETO_MARCONI_CLAUDE_COWORK_2026-05-29.md` (pasta-mãe). **O charter não
substitui as Regras de Ouro do `CLAUDE.md` — ele as faz cumprir.**

---

## 1. Princípio central: ninguém entrega sozinho

Todo trabalho passa por uma **cadeia de três papéis**:

```
PRODUTOR  →  REVISOR  →  AUDITOR/INTEGRADOR
(faz)        (mesma guilda,   (guilda transversal:
             olho crítico)     número / a11y / segurança / QA)
```

Nada é marcado como "concluído" sem passar por essa cadeia (ver §6, Definition of Done).
O `maestro-orquestrador` distribui o trabalho; o `gerente-de-entrega` garante que cada
handoff aconteceu e que o **checklist de publicação** do `CLAUDE.md` foi cumprido.

**Regra inviolável herdada do `CLAUDE.md`:** nunca commitar/push com QA falhando; nunca
editar `assets/app.js`/`assets/styles.css` à mão (são gerados); nunca inventar número;
nunca `git reset --hard` nem apagar mudança local sem ordem explícita; nunca commitar
ruído de CRLF↔LF.

---

## 2. Organograma — 6 guildas, 18 agentes

### 00 · Orquestração & Entrega (2)
- **maestro-orquestrador** — quebra o objetivo, delega, integra, destrava. Ponto único de contato com o Felipe.
- **gerente-de-entrega** — ritmo, dependências, status, e dono do **checklist de publicação** (precompute → build → QA → diff --check → commit limpo).

### 01 · Dados Financeiros & Contabilidade (3) — o coração do produto
- **engenheiro-de-dados-financeiros** — dono do `data/financeiro.json` e do `precompute-data.mjs`; schema, agregados, selo realizado/projeção por calendário.
- **analista-contabil-dre** — autoridade do **significado** do número: DRE contábil oficial, Fluxo de Caixa, Custos Fixos (real×orçado), narrativa da Diretoria. *(opus — palavra final no número.)*
- **auditor-financeiro-adversarial** — verificação adversarial de todo número antes de publicar: reconciliação, `resultado == entradas − saídas`, somatórios, totais. *(opus — pode bloquear publicação.)*

### 02 · Arquitetura & Build (2)
- **arquiteto-frontend** — stack vanilla, padrão decorator de páginas, ordem de build, disciplina "assets são gerados". *(opus.)*
- **engenheiro-de-build** — dono do `build.mjs`: ordem de concatenação, versionamento de asset (`?v=`/`ASSET_VERSION`), `--prod`.

### 03 · Engenharia de Páginas, Dataviz & Exportação (3)
- **engenheiro-paginas** — `10-cashflow`, `40-fixed-director`, `45-dre`, navegação (`setDashboardPage`), filtros, e a estabilidade de `50-ux-patches`.
- **engenheiro-dataviz** — gráficos: tipo correto, escala honesta, tabela alternativa, render fluido.
- **especialista-exportacao** — `export.js`/`export.css`: exportação PDF/PPTX carregada sob demanda (lazy), fiel à tela.

### 04 · Design, UX & Acessibilidade (4)
- **engenheiro-design-system** — `00-theme-base` (tokens), camadas de tema dark/light, especificidade dos overrides.
- **designer-executivo-ui** — identidade visual executiva, hierarquia, legibilidade em <5s, microcopy financeira em PT-BR.
- **engenheiro-responsivo-mobile** — mobile-first, zero overflow horizontal, topbar/sidebar estáveis em todos os breakpoints.
- **auditor-acessibilidade** — WCAG 2.1 AA; contraste, foco, leitura por teclado/leitor de tela. *(pode bloquear UI que exclui.)*

### 05 · Qualidade, Deploy & Segurança (4)
- **engenheiro-qa-dashboard** — dono do `qa-dashboard.mjs` (CDP headless): navegação, abas, KPIs count-up, topbar, overflow desktop/mobile, lazy export, console, orçamento de performance.
- **revisor-de-codigo** — portão de qualidade dos PRs. *(opus — gate crítico.)*
- **engenheiro-devops-pages** — GitHub Pages, Actions (`qa.yml`/`qa-status.yml`), higiene de git, disciplina CRLF, rollback.
- **auditor-de-seguranca-privacidade** — sigilo do dado (uso interno), nada de `embedded-data` no `index.html`, nenhum segredo no repo, privacidade do link. *(pode bloquear deploy.)*

---

## 3. Matriz de revisão cruzada (quem revisa quem)

| Entrega | Produtor | Revisor (par) | Auditor transversal |
|---|---|---|---|
| Dados `financeiro.json` / precompute | engenheiro-de-dados-financeiros | analista-contabil-dre | auditor-financeiro-adversarial |
| Significado contábil / DRE / narrativa | analista-contabil-dre | engenheiro-de-dados-financeiros | auditor-financeiro-adversarial |
| `build.mjs` / versionamento de asset | engenheiro-de-build | arquiteto-frontend | revisor-de-codigo |
| JS de página / navegação / filtros | engenheiro-paginas | arquiteto-frontend | revisor-de-codigo + engenheiro-qa-dashboard |
| Gráficos / dataviz | engenheiro-dataviz | analista-contabil-dre | auditor-acessibilidade |
| Exportação PDF/PPTX | especialista-exportacao | engenheiro-paginas | engenheiro-qa-dashboard |
| Tokens / tema / CSS | engenheiro-design-system | designer-executivo-ui | auditor-acessibilidade |
| Layout / hierarquia / microcopy | designer-executivo-ui | engenheiro-responsivo-mobile | auditor-acessibilidade |
| Responsivo / overflow / mobile | engenheiro-responsivo-mobile | designer-executivo-ui | engenheiro-qa-dashboard |
| Publicação (push para `main`) | engenheiro-devops-pages | gerente-de-entrega | auditor-de-seguranca-privacidade + engenheiro-qa-dashboard |

Regra de ouro: **o revisor não é o autor**, e **o auditor é de outra guilda**.
Conflito de número? `analista-contabil-dre` decide. Conflito visual? `designer-executivo-ui`.
Bloqueio de publicação? `auditor-financeiro-adversarial`, `auditor-de-seguranca-privacidade`
ou `engenheiro-qa-dashboard` podem travar.

---

## 4. Protocolo de handoff

Cada agente, ao terminar, deixa um registro curto em `_handoffs/<data>-<agente>.md`:

```
## O que fiz
## Decisões (e por quê)
## Pendências / riscos
## Próximo agente sugerido + o que ele precisa
```

Isso é o que torna o time um time: o próximo agente começa onde o anterior parou,
sem reabrir decisões já fechadas. ADRs curtos de decisão também vivem aqui.

---

## 5. Escalonamento

- Bloqueio técnico de frontend → **arquiteto-frontend**.
- Conflito de escopo/prioridade → **maestro-orquestrador**.
- Conflito de **número/significado contábil** → **analista-contabil-dre** tem a palavra final.
- Número não bate na verificação → **auditor-financeiro-adversarial** bloqueia a publicação.
- Conflito estético → **designer-executivo-ui** decide o visual.
- QA de navegador vermelho → **engenheiro-qa-dashboard** trava o push.
- Sigilo/privacidade do dado em risco → **auditor-de-seguranca-privacidade** bloqueia deploy.
- Incidente em produção (Pages no ar com erro) → **engenheiro-devops-pages** executa rollback e aciona o maestro.

Bloqueio é comunicado em minutos, nunca escondido.

---

## 6. Definition of Done (DoD)

Uma entrega só é "pronta" quando:

1. Atende ao critério de aceite definido com o `maestro-orquestrador`.
2. Passou por **revisor** (par) **e auditor** (transversal) aplicáveis.
3. **Número verificado** pelo `auditor-financeiro-adversarial` (se toca dado).
4. **QA verde** no `qa-dashboard.mjs` / GitHub Actions (se toca UI/código de página).
5. Acessibilidade AA verificada (se tem UI).
6. Sigilo/privacidade verificada (se toca dado sensível).
7. **Assets gerados via `build.mjs`** (nunca editados à mão) e `?v=` atualizado.
8. `git diff --check` limpo (sem ruído de CRLF), commit específico (sem `git add -A`).
9. Handoff registrado em `_handoffs/`.

Sem os 9, volta para o produtor — sem exceção, sem "verde de fachada".

---

## 7. Ambiente de execução (importante)

- **Windows local (Claude Code):** shell completo + Chrome real → o QA de navegador roda localmente; fluxo do handoff vale 1:1.
- **Claude Cowork:** sandbox **Linux sem navegador**; rede só libera github.com e npm → **QA de navegador NÃO roda aqui**; use o GitHub Actions como fonte de verdade. Build/precompute/QA estrutural rodam normalmente. O working tree montado mostra ruído de **CRLF** (diff só-EOL) — ignore, não commite.

---

## 8. Métrica-norte do time

**A diretoria abre o link e entende a saúde do caixa 2026 em menos de 5 segundos —
com o número certo.** Tudo (design, performance, narrativa, QA) serve a esse número.
Bonito com número errado não é entrega: é risco. Número certo travado/cortado também não é.
