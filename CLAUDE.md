# CLAUDE.md — Marconi Foods Dashboard

Contexto durável do projeto para Claude (Code e Cowork). Mantenha curto e denso.
Detalhes longos e histórico ficam em `HANDOFF_COMPLETO_MARCONI_CLAUDE_COWORK_2026-05-29.md` (na pasta-mãe do repo).

## O que é
Dashboard financeiro executivo da Marconi Foods (2026). Site **estático**, publicado no **GitHub Pages**, **sem backend**.
- Repo: `advisorys/marconi-dashboard` · Branch: `main` · URL: https://advisorys.github.io/marconi-dashboard/
- 4 páginas: **Diretoria** (`director`), **Fluxo de Caixa** (`cash`), **Custos Fixos** (`fixed`), **DRE** (`dre`).

**Objetivos de negócio:** dar visibilidade executiva do caixa 2026 em < 5 s.
- Diretoria vê saúde geral, riscos e ações recomendadas de relance.
- Analista filtra mês/período e vê resultado + 10 categorias sem recarregar.
- 37 itens de custo fixo (2 grupos) com real × orçado × variação mês a mês.
- Fronteira **realizado/projeção é DINÂMICA** (selo `projection`/`partial` por mês no dado): mês passado = realizado, mês corrente = parcial ("em andamento"), mês futuro = projeção. O importador carimba por **calendário** → o corte vira sozinho a cada atualização (sem editar código). Hoje (2026-06): Jan–Mai realizados, Jun parcial, Jul–Dez projeção. Exportação PDF/PPTX lazy.
- Dados sigilosos — uso interno; não compartilhar o link.

## Regras de ouro (não violar sem aprovação explícita)
1. **Não alterar dados financeiros** sem validação. Nunca inventar números.
2. **Não editar `assets/app.js` nem `assets/styles.css` à mão** — são gerados. Edite `src/` e rode o build.
3. **Não remover patches/`!important` antigos** sem QA visual forte (estabilizam topbar, sidebar, mobile, abas).
4. **Não mudar paleta/design na `main`** — Fase 6 só em branch separada, com comparativo antes/depois.
5. **Não commitar/push se o QA falhar.** Não publicar com erro de console relevante.
6. Não aceitar: overflow horizontal, topbar instável, cards cortados, KPIs travados, abas sem resposta.
7. **Nunca `git reset --hard`** nem apagar mudanças locais do usuário sem ordem explícita.
8. **Nunca commitar ruído de EOL (CRLF↔LF) nem só o timestamp de versão de asset.**

## Estrutura
```
index.html              shell estático (carrega styles.css + bootstrap.js)
assets/                 GERADOS: app.js, styles.css (+ export.js/css, bootstrap.js)
data/financeiro.json    fonte de dados publicada
src/js/  src/css/        FONTE editável
tools/                  build.mjs, precompute-data.mjs, qa-dashboard.mjs
.github/workflows/qa.yml  QA no CI
```

## Arquivos críticos (por papel)
| Arquivo | Papel — quando tocar |
|---|---|
| `data/financeiro.json` | Fonte de verdade dos números. Nunca editar à mão — use precompute. |
| `src/css/00-theme-base.css` | Tokens `:root` (paleta, espaçamento, tipografia) — identidade visual parte daqui. |
| `src/css/50-theme-light.css` | Override do tema claro; vence patches v68 por especificidade `html[data-theme]` + `!important`. |
| `src/js/00-foundation.js` | Helpers globais: `MarconiFormat`, `MarconiEvents`, `MarconiMotion`, `onDashboardReady`. |
| `src/js/10-cashflow.js` | Página Fluxo de Caixa — gráficos, tabela, filtros de período/mês. |
| `src/js/40-fixed-director.js` | Páginas Custos Fixos e Diretoria — renderização e lógica de abas. |
| `src/js/50-ux-patches.js` | Patches cumulativos de UX (topbar, sidebar, mobile) — **não remover sem QA**. |
| `tools/precompute-data.mjs` | Valida schema e recalcula `precomputed`; obrigatório antes do build. |
| `tools/build.mjs` | Concatena `src/` na ordem fixa → `assets/`; única forma legítima de gerar assets. |
| `.github/workflows/qa.yml` | QA visual no CI (windows-latest, Node 22) — fonte de verdade para PRs. |
| `FASE6-DESIGN-SYSTEM.md` | Spec completa do tema claro (Fase 6): tokens, toggle, iteração de cores hardcoded. |
| `MELHORIAS-ESTETICAS.md` | Spec de polish: tokens de espaçamento/radius, tints de status, tipografia, micro-interações. |

## Build (sempre via script — nunca editar assets à mão)
`tools/build.mjs` concatena os fontes em ordem fixa e atualiza a versão dos assets.
- JS: `00-foundation → 10-cashflow → 20-interactions → 30-export-loader → 40-fixed-director → 45-dre → 50-ux-patches → 55-theme-toggle → 60-cinema`
- CSS: `00-theme-base → 20-fixed-director → 30-executive-interactions → 40-ux-patches → 45-dre → 50-theme-light → 60-theme-light-premium → 70-solaris → 80-cinema`
- **`45-dre.js` PRECISA ficar entre 40 e 50**: ele envolve `window.__baseSetDashboardPage` (definido por 40) ANTES de `50-ux-patches` capturá-lo. Mover 45 pra antes de 40 quebraria o render da DRE silenciosamente (há backup via evento `page:changed`, mas não confie nele).
- `--prod` tenta minificar com `terser`/`lightningcss` (opcionais, hoje ausentes → avisa e segue).
- Atualiza `?v=` em `index.html` e `ASSET_VERSION` em `assets/bootstrap.js`.

## Dados (`data/financeiro.json`) e precompute
`tools/precompute-data.mjs` **valida** e recalcula agregados (`precomputed`). Modelo:
- `meta`: `empresa`, `periodo`, `ultima_atualizacao` (todos obrigatórios).
- `fluxo_caixa.monthly`: chaves `1..12` → `{name, entradas, saidas, resultado, projection, partial}`. Exige `resultado == entradas - saidas` (±0.02). `projection`/`partial` = selo realizado/projeção (booleanos; setados pelo importador por calendário). A UI lê esse selo via `MarconiFormat.isProjectionMonth/isRealizedMonth/isPartialMonth` — **nunca cravar `m>=7`/`m<=6`**.
- `fluxo_caixa.categoryMonthly`/`categories`: `[{name, months:{1..12}, value?}]`. Também `daily` (365), `reconciliation` (12).
- `custos_fixos.items`: `[{name, group, months:[[est, real, diff, basis] ×12]}]` (37 itens). `totals` (2). `months` = rótulos.
- Precompute falha em: NaN/não-finito, mês 1..12 faltando, estrutura inválida. Não aceita dado não numérico.

## Scripts (`package.json`)
`npm run precompute` · `build` · `build:prod` · `qa` · `prepare-dashboard` (precompute+build).
Projeto **sem dependências de runtime** (lockfile vazio); `npm ci` é praticamente no-op.

## QA
`tools/qa-dashboard.mjs` sobe servidor local + Chrome headless (CDP) e testa navegação, abas de Custos Fixos, KPIs count-up, topbar estável, overflow desktop/mobile, reset/toast, lazy export, acessibilidade, console. Screenshots em `.qa-output/`.
- Roda no **GitHub Actions** (`.github/workflows/qa.yml`) a cada push em `main` e em PRs (windows-latest, Node 22). **Fonte de verdade do QA visual.**
- QA estrutural rápido (sem browser, qualquer ambiente): JSON válido, `index.html` sem `embedded-data`, `bootstrap.js` faz fetch de `data/financeiro.json`, 3 páginas e abas presentes, assets não vazios.

## Páginas (mecânica de navegação)
- Botões: `.page-tab[data-page-link="director|cash|fixed"]` no `.page-switcher`.
- `window.setDashboardPage(page)` define `document.body.dataset.page = page`; o CSS mostra/oculta seções por `body[data-page="..."]`. Em `fixed` chama `renderFixedCosts()`; em `director`, `renderDirectorPage()`.
- **Padrão decorator**: módulos (40, 50) **envolvem** `window.setDashboardPage` em camadas para somar comportamento. Para adicionar página, **some um módulo** que envolve a função (não reescreva a base). Ver skill `nova-pagina-dashboard`.
- Helpers compartilhados: `MarconiFormat` (formatação), `MarconiEvents` (eventos `page:changed`, `filter:changed`...), `MarconiMotion`, `MarconiPerf`, `onDashboardReady`.

## Identidade visual (tokens reais do código)
**Paleta dark (padrão)** — definida em `src/css/00-theme-base.css` `:root`:
- Fundos: `--bg #0A0E1A` · `--surface #131829` · `--surface-2 #1A1F35`
- Acento âmbar (marca): `--gold #F59E0B` / `--gold-l #FCD34D`
- Semânticos financeiros: `--green #10B981` (positivo/economia) · `--red #EF4444` (negativo/acima do orçado)
- Estruturais: `--indigo #6366F1` (projeção/UI) · `--cyan #06B6D4`
- Texto: `--text #FFFFFF` · `--text-dim #94A0B8` · `--text-mute #5A6580`

**Paleta light** (`html[data-theme="light"]` — Fase 6, branch separada):
- Fundos: `--bg #F4F1EA` (marfim) · `--surface #FFFFFF` · `--surface-2 #EFEAE0` (areia)
- Âmbar profundo: `--gold #B45309` · `--gold-l #C2710C`
- Texto: `--text #1A1714` · `--text-dim #5A5145`

**Tipografia:** `Helvetica Neue, Helvetica, Arial, sans-serif`. h1 `clamp(48px,6vw,84px)` · h2 `clamp(32px,4vw,48px)`. Números com `font-feature-settings:'tnum'` (tabular-nums). Container máx. 1320px, padding 48px lateral.

**Tokens de polish** (Fase 6 / `MELHORIAS-ESTETICAS.md`) — ainda só em branch:
- Radius: `--r-sm 8px` · `--r-md 12px` · `--r-lg 16px` · `--r-pill 999px`
- Espaçamento: `--sp-1..6` (4→32px em steps de 4/8px)
- Tints de status dark: `--tint-positive rgba(16,185,129,.14)` · `--tint-negative rgba(239,68,68,.14)` · `--tint-accent rgba(245,158,11,.14)`
- Animação: `--ease cubic-bezier(.2,.6,.2,1)` · `--t-fast 120ms` · `--t-med 200ms`

## Publicação (checklist antes de push)
```
git status --short --branch
npm run prepare-dashboard && npm run build:prod && npm run qa
git diff --check
git add <arquivos específicos>   # nunca `git add -A` com ruído de EOL
git commit -m "<mensagem clara>"
git push origin main
```
Só publicar com QA verde e mudança real. Sem mudança real → não commitar.

## Ambientes de execução (importante)
- **Windows local (Claude Code)**: shell completo, Chrome real → o QA de browser roda localmente. Fluxo do handoff vale 1:1.
- **Claude Cowork (este app)**: sandbox **Linux sem navegador**; rede só libera github.com (git) e npm. → **QA de browser não roda aqui**; use o GitHub Actions. Build/precompute/QA estrutural/relatório rodam normalmente. O working tree montado mostra ruído de **CRLF** (diff só-EOL) — **ignore, não commite**.

## Automação
- **QA diário 05:00 (America/Sao_Paulo)**: tarefa agendada do Cowork (`qa-diario-marconi-dashboard`) valida dados/build/QA estrutural, gera DOCX em `…\QA - DASHBOARD\` e publica se houver mudança real aprovada (push via PAT em `…\.cowork-qa-token.txt`). Só roda com o app aberto e o PC acordado.

## Riscos / dívidas conhecidas
- Assets acima do alvo minificado (`terser`/`lightningcss` não instalados).
- CSS com muitos `!important` e patches históricos (reduzir só com QA).
- `tools/precompute` não valida seções novas além de `fluxo_caixa`/`custos_fixos` — estender ao criar páginas.
- **`.codex_check_scripts/update_marconi_data.py` CORRIGIDO (2026-06-02)**: removidos `replace_embedded_json` + validação de `embedded-data`; `main()` grava só `financeiro.json` + `summary.json` (`generate_data`/`strip_update_only` intactos). Pendência: validar 1 run completo contra planilhas reais na próxima atualização (parsing não mudou). Fluxo via skill `atualizar-dados` (wrapper).
- **Fronteira realizado/projeção data-driven (2026-06-08)**: o selo `projection`/`partial` agora é por calendário (helper `month_flags(year,month,today)` no importador externo — passado=realizado, corrente=parcial, futuro=projeção). Rollover automático a cada `/atualizar-dados`, sem editar código. A UI (`MarconiFormat`) e o `precompute` (PERIODS/`fixedTotals`) leem o selo, não o número do mês. **Pendência: rodar 1 import real pra junho virar `partial` no dado publicado** (hoje ainda está como realizado pleno, do import de 02/06). O importador é externo ao repo (mudança local na máquina).
- **MIGRAÇÃO FONTE BLING + DRE (2026-06-16, branch `claude/bling-dre-v2`)**: o **Fluxo** deixou de vir da planilha do Diogo e passa a vir do **extrato Bling** (`Fonte de Dados Dashboard - Marconi.xlsx`: abas `Cola_Bling`+`DePara_Bling`+`d_CategCustos`), fiel ao `CONTRATO_ROBO` da planilha. Regras: joins com trim; descarta `Tipo='S'`; dedup por Id; **exclui só Classe `AJUSTE`** (transferências); **Importação conta como saída real**; categorias = saídas por Grupo DRE; só realizado (mês futuro = 0). Bate 100% com a aba `CONTROLE`. **Custos Fixos seguem vindo da planilha da consultoria** (`Custos Fixos.xlsx`). Importador reescrito em `.codex_check_scripts/update_marconi_data.py` (mesma interface `generate_data`/`strip_update_only` do wrapper). Nova seção **`dre`** no JSON: DRE contábil (regime de competência) lida do `.xlsb "DRE 26 NOVO"` (`generate_dre`, requer `pyxlsb`), renderizada pela página `dre`. Selo realizado/projeção e custos fixos inalterados. Variações/justificativas removidas. **Pendências da fonte (revisar com a consultoria, não são bug):** (1) "Descontos Concedidos" ~R$14,9M domina deduções — possível contra-receita; (2) 15 lançamentos "sem categoria no Bling"; (3) AJUSTE de Janeiro não é wash perfeito (líq. −R$311k); (4) IRPJ/CSLL de Janeiro somado de volta ao lucro no `.xlsb`.
