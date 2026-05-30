---
name: nova-pagina-dashboard
description: Adicionar uma página nova ao Marconi Foods Dashboard (ex.: DRE gerencial, importações) seguindo a arquitetura - dados, módulos src/js+src/css, build, navegação, precompute e QA.
---

# Nova página do Marconi Foods Dashboard

Receita para adicionar uma página seguindo a arquitetura existente. **Leia o `CLAUDE.md` antes** (regras de ouro, modelo de dados, build). Não reescreva a base; some camadas. Não quebre as 3 páginas atuais (`director`, `cash`, `fixed`).

## Convenções que você precisa respeitar
- Páginas são mostradas/ocultadas por **CSS baseado em `body[data-page="<id>"]`**. `window.setDashboardPage(page)` faz `document.body.dataset.page = page` e ativa o botão correspondente.
- A navegação por página usa **decorator**: vários módulos *envolvem* `window.setDashboardPage` para somar comportamento. Para uma página nova, **envolva** a função — não edite a base em `40-fixed-director.js`.
- Dados ficam em `window.DASHBOARD_DATA` (aliases: `window.__DATA__`, `window.__FIXED_COST_DATA__`). Formate com `window.MarconiFormat`. Eventos: `window.MarconiEvents`. Use `window.onDashboardReady(cb)`.
- `assets/` é **gerado** — só edite `src/` e rode o build.

## Passos

### 1. Defina a página
Escolha um `id` curto e estável (ex.: `dre`, `importacoes`) e o rótulo do botão (ex.: "DRE Gerencial"). Liste quais dados ela consome.

### 2. Dados (`data/financeiro.json`)
Adicione uma seção nova no topo do payload (ex.: `"dre": { ... }`), seguindo o estilo das existentes (números finitos, sem `NaN`, meses `1..12` quando aplicável). O `precompute` preserva chaves desconhecidas no round-trip, mas **não as valida** — você fará isso no passo 6. **Nunca invente números**; use dados reais (ver skill `atualizar-dados`).

### 3. Botão de navegação (`index.html`)
No `.page-switcher`, some:
```html
<button class="page-tab" data-page-link="<id>" type="button">Rótulo</button>
```
(Opcional) atalho de teclado em `src/js/50-ux-patches.js`, no mesmo padrão de `d`/`f`/`c`.

### 4. Container da página (`index.html`)
**Copie a estrutura de uma página existente como template** (ex.: a seção da Diretoria) em vez de inventar markup — assim você herda o esquema de mostrar/ocultar por `body[data-page]` e as classes de card/grid/topbar. Ajuste o seletor/identificador para o seu `<id>`.

### 5. Módulos fonte
Crie **`src/js/NN-<id>.js`** (escolha `NN` para rodar **antes** de `50-ux-patches.js`, ex.: `45`):
```js
/* Página <id> */
(function () {
  function render<Id>Page() {
    const data = window.DASHBOARD_DATA || window.__DATA__ || {};
    const money = window.MarconiFormat?.moneyFull;
    // ... preencher o container da página com os dados ...
  }
  window.render<Id>Page = render<Id>Page;

  // decorator: roda seu render quando entra na página
  const prev = window.setDashboardPage;
  window.setDashboardPage = function (page) {
    const out = prev ? prev.apply(this, arguments) : undefined;
    if (page === '<id>') { try { render<Id>Page(); } catch (e) { console.error('Erro <id>:', e); } }
    return out;
  };
  window.onDashboardReady?.(() => {
    if (document.body.dataset.page === '<id>') render<Id>Page();
  });
})();
```
Crie **`src/css/NN-<id>.css`** reaproveitando as variáveis/tokens de `00-theme-base.css` (cores dourado/verde/vermelho, espaçamentos). Evite novos `!important`.

### 6. Registre no build (`tools/build.mjs`)
- Adicione `'src/js/NN-<id>.js'` ao array `jsFiles`, **antes** de `'src/js/50-ux-patches.js'`.
- Adicione `'src/css/NN-<id>.css'` ao array `cssFiles`, **antes** de `'src/css/40-ux-patches.css'`.

### 7. Valide os dados (`tools/precompute-data.mjs`)
Adicione `validate<Id>()` usando os helpers existentes (`assertObject`, `assertText`, `assertFiniteNumber`) e chame dentro de `validatePayload()`. Se a página tiver agregados por período, gere `<id>.precomputed` no mesmo padrão de `fluxo`/`fixed` e atribua de volta ao payload antes do `writeFile`.

### 8. Build + QA
```
npm run prepare-dashboard && npm run build:prod && npm run qa
```
No **Cowork** o `qa` de browser não roda (sem navegador) — rode o build/precompute, valide a estrutura e deixe o QA de browser para o **GitHub Actions**. No Windows local, o `qa` roda completo.

### 9. Estenda o QA (`tools/qa-dashboard.mjs`)
Adicione asserts da nova página seguindo os labels existentes: a navegação abre a página, sem overflow desktop e mobile, os cards/KPIs renderizam. Ex.: `<id>_nav`, `<id>_no_overflow`, `<id>_mobile_no_overflow`.

### 10. Publique (só com QA verde)
Siga o checklist do `CLAUDE.md` → **Publicação**: `git add` só dos arquivos da página (`src/…`, `index.html`, `data/financeiro.json`, `tools/…` e os `assets/` gerados), commit claro, push. Nunca com QA falhando, nunca com ruído de EOL.

## Checklist final
- [ ] Botão `data-page-link="<id>"` no `.page-switcher`.
- [ ] Container da página mostrado por `body[data-page="<id>"]`.
- [ ] `src/js/NN-<id>.js` (render + decorator) e `src/css/NN-<id>.css` criados.
- [ ] Registrados no `build.mjs` (antes das camadas `50`/`40-ux`).
- [ ] `validate<Id>()` no `precompute` (e `precomputed` se aplicável).
- [ ] `build:prod` e `qa` (ou Actions) verdes; sem overflow desktop/mobile; topbar estável.
- [ ] As 3 páginas existentes continuam intactas.
