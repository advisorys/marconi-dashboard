# CLAUDE.md — Marconi Foods Dashboard

Contexto durável do projeto para Claude (Code e Cowork). Mantenha curto e denso.
Detalhes longos e histórico ficam em `HANDOFF_COMPLETO_MARCONI_CLAUDE_COWORK_2026-05-29.md` (na pasta-mãe do repo).

## O que é
Dashboard financeiro executivo da Marconi Foods (2026). Site **estático**, publicado no **GitHub Pages**, **sem backend**.
- Repo: `advisorys/marconi-dashboard` · Branch: `main` · URL: https://advisorys.github.io/marconi-dashboard/
- 3 páginas: **Diretoria** (`director`), **Fluxo de Caixa** (`cash`), **Custos Fixos** (`fixed`).

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

## Build (sempre via script — nunca editar assets à mão)
`tools/build.mjs` concatena os fontes em ordem fixa e atualiza a versão dos assets.
- JS: `00-foundation → 10-cashflow → 20-interactions → 30-export-loader → 40-fixed-director → 50-ux-patches`
- CSS: `00-theme-base → 20-fixed-director → 30-executive-interactions → 40-ux-patches`
- `--prod` tenta minificar com `terser`/`lightningcss` (opcionais, hoje ausentes → avisa e segue).
- Atualiza `?v=` em `index.html` e `ASSET_VERSION` em `assets/bootstrap.js`.

## Dados (`data/financeiro.json`) e precompute
`tools/precompute-data.mjs` **valida** e recalcula agregados (`precomputed`). Modelo:
- `meta`: `empresa`, `periodo`, `ultima_atualizacao` (todos obrigatórios).
- `fluxo_caixa.monthly`: chaves `1..12` → `{name, entradas, saidas, resultado, projection}`. Exige `resultado == entradas - saidas` (±0.02).
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
- **`.codex_check_scripts/update_marconi_data.py` está DESATUALIZADO**: ainda injeta `embedded-data` no `index.html`, que foi removido. Hoje ele quebra. Corrigir antes de usar (ver skill `atualizar-dados`).
