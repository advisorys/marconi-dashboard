# Dashboard Financeiro · Marconi Foods

Dashboard executivo de fluxo de caixa e controle orçamentário desenvolvido para apresentação à diretoria.

## Acesso

**URL pública:** https://advisorys.github.io/marconi-dashboard/

## O que mostra

- **Diretoria** — visão executiva resumida: saúde, riscos e recomendações
- **Fluxo de Caixa** — análise operacional por mês e categoria
- **Custos Fixos** — controle orçamentário real vs. orçado

## Como atualizar

1. Atualize `data/financeiro.json`.
2. Rode `node tools/precompute-data.mjs` para recalcular dados pré-computados.
3. Rode `node tools/build.mjs` para rebuildar os bundles.
4. Rode `node tools/qa-dashboard.mjs` para validar desktop/mobile, console, overflow e navegação.
5. Faça commit e push para `main`.

O GitHub Pages publica automaticamente no mesmo link.

## Estrutura

```text
marconi-dashboard/
├── index.html
├── assets/
│   ├── bootstrap.js          # carrega data/financeiro.json e inicia o app
│   ├── app.js                # bundle gerado a partir de src/js
│   ├── styles.css            # bundle gerado a partir de src/css
│   ├── export.js             # exportação carregada sob demanda
│   └── export.css
├── data/
│   └── financeiro.json       # dados e agregados pré-computados
├── src/
│   ├── js/                   # código-fonte dividido por responsabilidade
│   └── css/                  # estilos divididos por camada
├── tools/
│   ├── precompute-data.mjs
│   ├── build.mjs
│   └── qa-dashboard.mjs
└── package.json
```

## Scripts

```bash
node tools/precompute-data.mjs
node tools/build.mjs
node tools/qa-dashboard.mjs
```

Também existe `package.json` com scripts equivalentes para quem tiver `npm` disponível. O QA usa Chrome ou Edge local; se necessário, informe outro executável com `CHROME_PATH`.

## Arquitetura

- HTML estático para GitHub Pages.
- Dados externos em `data/financeiro.json`, sem fallback JSON gigante no HTML.
- Agregados principais pré-computados no JSON para reduzir cálculo no navegador.
- Exportação PDF/PPTX carregada apenas por intenção do usuário.
- Código-fonte editável em `src`; bundles públicos em `assets`.

## Confidencialidade

Os dados são de uso interno e confidenciais. Não compartilhe o link com terceiros não autorizados.
