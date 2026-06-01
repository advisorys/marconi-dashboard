# Fase 6 — Design system + tema dual (escuro/claro)

Spec de implementação para o **Claude Code (Windows)**. Objetivo: adicionar um **tema claro alternável**, mantendo o **dark atual como padrão**, via uma camada de **tokens semânticos** — sem redesign nem troca de identidade.

> Leia o `CLAUDE.md` antes. Regras da Fase 6 (handoff §14/§19): **nunca na `main`**; trabalhar em branch; screenshots **antes/depois**; comparar Diretoria, Fluxo de Caixa, Custos Fixos e mobile; **só mergear com aprovação do usuário**. O dark continua o padrão. Verde = economia/positivo, vermelho = acima/negativo — não inverter.

## 0. Setup
```powershell
cd "C:\Users\felip\Documents\HMTL - Marconi Foods\marconi-dashboard"
git checkout main; git pull origin main
git checkout -b claude/fase-6-design-system
npm run prepare-dashboard; npm run build:prod; npm run qa
```
Guarde os screenshots de `.qa-output` como **ANTES** (copie para `.qa-output/antes/`).

## 1. Arquitetura da mudança (aditiva e reversível)
1. **Tokens do tema claro** num arquivo novo `src/css/50-theme-light.css` (só redefine variáveis sob `html[data-theme="light"]`). O dark permanece o `:root` atual de `00-theme-base.css` — **não alterar os valores dark**.
2. **Toggle** num módulo novo `src/js/55-theme-toggle.js` + um botão na sidebar + um snippet anti-flash no `<head>` do `index.html`.
3. **Registrar** os dois arquivos no `tools/build.mjs`.
4. **Iterar** as cores "chumbadas" (hardcoded) do CSS para usarem os tokens — por área, com QA a cada passo.

O tema claro só "pega" onde o CSS usa `var(--token)`. Onde a cor está chumbada (hex fixo), continua escura no claro — por isso o passo 4 é o grosso do trabalho, feito incrementalmente.

## 2. `src/css/50-theme-light.css` (criar)
```css
/* Tema claro — overrides de tokens. O dark e o padrao (sem data-theme). */
html[data-theme="light"] {
  --bg:        #F6F7F9;
  --bg-elev:   #FFFFFF;
  --surface:   #FFFFFF;
  --surface-2: #F1F3F6;
  --surface-3: #E9ECF1;
  --border:    #E6E8EC;
  --border-2:  #D5DAE2;
  --text:      #0F1722;
  --text-dim:  #586173;
  --text-mute: #8A93A3;
  --indigo:    #4F46E5;
  --indigo-d:  #4338CA;
  --cyan:      #0E7490;
  --green:     #15803D;
  --gold:      #B45309;
  --gold-l:    #D97706;
  --red:       #DC2626;
  --purple-d:  #EEF0FF;
  --purple-m:  #E3E6FF;
  --control-active-border: rgba(180,83,9,0.55);
  color-scheme: light;
}
html:not([data-theme="light"]) { color-scheme: dark; }
```
Valores iniciais — afine no QA (contraste AA). O ouro vira âmbar profundo (`#B45309`) e o verde/vermelho escurecem para ficarem legíveis no branco.

## 3. Toggle
### 3a. Anti-flash — no `<head>` do `index.html`, o mais cedo possível (antes do CSS):
```html
<script>try{if(localStorage.getItem('marconi-theme')==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}</script>
```
### 3b. Botão — na sidebar, junto das outras `.sidebar-action` (grupo "Ações"):
```html
<button class="sidebar-action outline" id="themeToggle" type="button" aria-pressed="false" aria-label="Alternar tema claro e escuro">Tema escuro</button>
```
### 3c. `src/js/55-theme-toggle.js` (criar):
```js
/* Tema dual: escuro (padrao) + claro. Persiste no localStorage. */
(function () {
  var KEY = 'marconi-theme';
  var root = document.documentElement;
  function label(isLight){ return isLight ? 'Tema claro' : 'Tema escuro'; }
  function apply(theme) {
    var isLight = theme === 'light';
    if (isLight) root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    var btn = document.getElementById('themeToggle');
    if (btn) { btn.setAttribute('aria-pressed', String(isLight)); btn.textContent = label(isLight); }
  }
  function current(){ try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } }
  function toggle() {
    var next = current() === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply(next);
    if (window.MarconiEvents && window.MarconiEvents.emit) window.MarconiEvents.emit('theme:changed', { theme: next });
  }
  window.MarconiTheme = { apply: apply, toggle: toggle, current: current };
  function init(){ apply(current()); var b = document.getElementById('themeToggle'); if (b) b.addEventListener('click', toggle); }
  if (window.onDashboardReady) window.onDashboardReady(init); else document.addEventListener('DOMContentLoaded', init);
})();
```

## 4. Registrar no build (`tools/build.mjs`)
- Em `cssFiles`, adicione por ÚLTIMO: `'src/css/50-theme-light.css'`.
- Em `jsFiles`, adicione depois de `50-ux-patches.js`: `'src/js/55-theme-toggle.js'`.

## 5. Iteração das cores chumbadas (o grosso)
Liste candidatos:
```powershell
Select-String -Path src/css/*.css -Pattern '#[0-9A-Fa-f]{6}' | Where-Object { $_.Line -notmatch '--' }
```
Para cada cor hardcoded de **fundo/superfície/texto/borda**, troque pelo token equivalente (`var(--bg|--surface|--surface-2|--text|--text-dim|--border|...)`). Faça **por área, uma de cada vez, com QA entre elas**, nesta ordem (menor→maior risco):
1. Fundo do app + `.control-sidebar` + topbar.
2. Cards e KPIs (Diretoria/Fluxo).
3. Custos Fixos: tabela, mapa de desvios, chips de desvio (mantenha verde=economia / vermelho=acima).
4. Gráficos e tooltips (ver §6).
5. Restante (badges, divisórias, estados hover/foco).
Não remova `!important` em massa; se precisar, troque a cor e mantenha o `!important` daquele seletor.

## 6. Cores desenhadas em JS (gráficos)
Alguns gráficos/tooltips usam cor fixa no JS. Para ficarem theme-aware, leia o token em runtime:
```js
var css = getComputedStyle(document.documentElement);
var gold = css.getPropertyValue('--gold').trim();
```
e re-desenhe no evento `theme:changed` (emitido pelo toggle). Trate isso como item da iteração, não bloqueante para a fatia 1.

## 7. QA + comparação (a cada fatia e no fim)
```powershell
npm run prepare-dashboard; npm run build:prod; npm run qa
```
Depois, no navegador, **alterne o tema** e confira em **dark E claro**:
- Diretoria, Fluxo de Caixa, Custos Fixos — desktop (1440x980) e mobile (390x900).
- Sem texto ilegível (contraste AA), sem elemento "preso" no escuro dentro do claro, sem overflow horizontal, topbar estável, KPIs animando, abas de Custos Fixos respondendo.
- Verde = economia/positivo; vermelho = acima/negativo (não inverteu).
Salve os screenshots como **DEPOIS** (`.qa-output/depois/`) e compare com o ANTES.

### 7b. Capturar o tema CLARO no QA (importante)
O `tools/qa-dashboard.mjs` só fotografa o tema padrão (escuro). Para o QA — e o relatório diário — mostrarem os DOIS temas, adicione uma captura clara após cada screenshot existente.

Helper (perto da função `screenshot`, ~linha 292):
```js
async function setTheme(t){
  await page('Runtime.evaluate', { expression: t === 'light'
    ? "document.documentElement.setAttribute('data-theme','light')"
    : "document.documentElement.removeAttribute('data-theme')" });
  await page('Runtime.evaluate', { expression: 'new Promise(r=>setTimeout(r,450))', awaitPromise: true });
}
```
Depois de cada `await screenshot('NOME')` (`phase5-desktop-cash`, `phase5-desktop-fixed`, `phase5-mobile-director`, `phase5-mobile-fixed`), acrescente:
```js
await setTheme('light'); await screenshot('NOME-light'); await setTheme('dark');
```
Gera `phase5-desktop-cash-light.png` etc. (Gráficos desenhados em JS podem sair ainda escuros — é o item §6 da iteração; o screenshot ajuda a localizá-los.)

## 8. Aceite e merge
- `npm run qa` verde; console sem erro relevante; ambos os temas aprovados visualmente nas 3 páginas + mobile.
- Apresente o comparativo ANTES/DEPOIS ao usuário. **Só mergear na `main` com aprovação explícita.** O padrão continua o dark.
```powershell
# só após aprovação:
git add src/css/50-theme-light.css src/js/55-theme-toggle.js tools/build.mjs index.html assets/app.js assets/styles.css assets/bootstrap.js
git commit -m "Fase 6: tema dual (claro/escuro) com tokens e toggle"
git checkout main; git merge --no-ff claude/fase-6-design-system; git push origin main
```

## 9. Não fazer
- Não alterar os valores do tema **escuro** (é a identidade atual e o padrão).
- Não seguir o `prefers-color-scheme` do SO automaticamente (padrão = dark; só muda se o usuário escolher).
- Não mergear sem aprovação; não aplicar na `main` direto.
- Não trocar a semântica das cores financeiras (verde/vermelho).
- Não fazer redesign amplo nesta fase — só a camada de tema.
