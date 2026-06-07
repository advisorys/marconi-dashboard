# 🧹 Relatório de Auditoria & Limpeza — Marconi Foods Dashboard

**Data:** 2026-06-03
**Escopo:** `src/js/` (8 módulos) + `src/css/` (8 folhas) + tooling
**Objetivo:** mapa para o "dia da faxina". Cada item tem evidência (`arquivo:linha`), nível de confiança e fix sugerido.

> ⚠️ **Regras de ouro a respeitar (do CLAUDE.md):**
> - Não editar `assets/app.js` / `assets/styles.css` à mão — são **gerados**; editar `src/` e rodar o build.
> - **Não remover patches / `!important` históricos sem QA visual forte** — eles estabilizam topbar, sidebar, mobile e abas.
> - QA verde + 0 erro de console antes de qualquer push. Nada de overflow horizontal, topbar instável, cards cortados, KPIs travados, abas sem resposta.

### Legenda de confiança
| Marca | Significado |
|---|---|
| ✅ | Confirmado com evidência — seguro de corrigir |
| 🟡 | Provável — **verificar no dia** antes de mexer |
| 🔵 | Arquitetural / dívida — grande e arriscado; avaliar custo×benefício |
| 🟢 | Já resolvido nesta sessão (registro) |

---

## 1. 🐞 Bugs funcionais

### 1.1 🟢 `addRankingToolbar` duplicada — **RESOLVIDO ✅ (Opção B, commit `9555e9d`)**
- **Onde:** `src/js/20-interactions.js:163` (v35) e `:263` (v23). O arquivo é um **único IIFE** (linhas 2–502), então as duas declarações disputam o mesmo escopo.
- **Problema:** por *hoisting* do JS, a **2ª declaração (263, v23 antiga) vence a 1ª (163, v35 nova)**. Resultado: o dashboard mostra a toolbar **v23** ("Ordenar ranking", chips fixos) e a **v35** ("Critério de ordenação", com status + `RANK_SORT_META`) **nunca roda** — é código morto.
- **✅ FEITO (Opção B):** removida a função v35 morta (163–181) + o `RANK_SORT_META` órfão + o CSS da toolbar v35 em `00-theme-base.css`. **Mantido o CSS VIVO das linhas** do ranking (`.v35-sorted`, `.v35-rank-row-metric` — usados em `20-interactions.js:98,101`). Comportamento inalterado (a v23 já era a toolbar ativa). −81 linhas de fonte. QA verde.
  *(Se um dia quiserem a toolbar v35, o caminho é o oposto: restaurá-la e remover a v23 — mas isso muda a aparência.)*

> Nenhum outro bug funcional confirmado nesta passada.

---

## 2. 💀 Código morto / inativo

### 2.1 🟢 Cinema antigo (v23) — **JÁ REMOVIDO** (commit `664a813`)
6 funções (`openCinema`/`ensureCinema`/`closeCinema`/`moveCinema`/`updateCinemaProgress`/`wireCinemaButton`) + estado + ~30 linhas de CSS `.v23-cinema-*` em 3 arquivos. Era inalcançável (`openCinema` nunca chamado). Registro.

### 2.2 🟡 Caça a funções não-chamadas (pendente do dia)
- **Não** fiz a checagem 1-a-1 de uso das ~150 funções (caro). A `addRankingToolbar` (item 1.1) foi a única claramente morta achada por inspeção.
- **Método pro dia:** pra cada função suspeita, `grep` do nome — se aparece **só** na definição, está morta. Priorizar os blocos de patch (`40-fixed-director.js`, `50-ux-patches.js`).

---

## 3. ♻️ Duplicatas & redundância

### 3.1 ✅ Vários helpers de "escapar HTML" reimplementados
- **Canônico:** `MarconiFormat.escapeHtml` — `src/js/00-foundation.js:52`.
- **Reimplementações:** `escHtml` (`40-fixed-director.js:9`), `esc` (`40-fixed-director.js:698`). O `esc` do cinema (`60-cinema.js:20`) já usa o canônico como fallback (ok). Verificar `safe(...)` em `20-interactions.js` (🟡 — usado 9×, conferir onde é definido).
- **Fix:** padronizar tudo em `MarconiFormat.escapeHtml` (é global, acessível em todos os blocos). Baixo risco.

### 3.2 ✅ Proliferação de funções de "contar/animar número de KPI" (~11)
Cada bloco de patch criou a sua. Inventário:
- `countUpGroup` — `00-foundation.js:102` *(a oficial, em `MarconiMotion`)*
- `animateCount` — `10-cashflow.js:233` · `setAnimatedValue` — `10-cashflow.js:253`
- `fixedKpiAnimatedValue` — `40-fixed:25` · `animateFixedKpiCards` — `40-fixed:29`
- `countText` — `40-fixed:786` · `animateOne` — `40-fixed:956` · `animateNumbers` — `40-fixed:976`
- `pulseNumbers` — `40-fixed:1128` · `countUp` — `40-fixed:1235` · `animateVisibleKPIs` — `40-fixed:1262`
- **Fix (grande):** convergir no `MarconiMotion.countUpGroup`. **Risco ALTO** (mexe em animação de KPI das 3 páginas) → fazer um por vez, com QA forte.

### 3.3 🟡 `totalsFor` — mesmo nome, 2 funções diferentes
- `40-fixed:139` = `totalsFor(months)` (totais do período) · `40-fixed:494` = `totalsFor(item, months)` (totais de um item).
- Estão em **IIFEs diferentes** (`script-7` e `script-8`) → **não é bug** (cada um no seu escopo), mas o nome igual confunde a leitura.
- **Fix (cosmético):** renomear um (ex.: `itemTotalsFor`).

### 3.4 🔵 Utilitários repetidos por bloco (money/pct/mês/heat)
- `fixedMoney`/`fixedPct` (`40-fixed:10,13`), `safeMoney`/`safeShort`/`safePct` (`595–597`), `monthValue`/`monthValueLocal` (`120`/`699`), `heatColor`/`heatColorLocal` (`390`/`703`), `fixedMonthLabel`/`fixedMonthLabelLocal` (`110`/`702`).
- Origem: cada IIFE recriou seus utilitários locais (ver item 4.1). Consolidável, mas é trabalho grande e arriscado.

---

## 4. 🏗️ Arquitetura / estrutura excessiva

### 4.1 🔵 `40-fixed-director.js` = **11 IIFEs empilhados**
- Blocos `script-7` … `script-17` + `v41-hard-fixes` (linhas 6–1585). Cada patch virou um IIFE isolado com seus próprios helpers → é a origem de toda a redundância da seção 3.
- **Recomendação:** mesclar é refactor caro. Só encarar se virar dor real de manutenção; senão, **deixar**.

### 4.2 🔵 `50-ux-patches.js` — patches de UX cumulativos
- Mesma natureza (topbar/sidebar/mobile). **Regra de ouro #3: não mexer sem QA visual forte.**

### 4.3 🔵 CSS — **1737 `!important`** em 8 folhas
- Distribuição: `30-executive-interactions.css` **737**, `40-ux-patches.css` **373**, `20-fixed-director.css` 155, `60-theme-light-premium.css` 93, `50-theme-light.css` 78, `70-solaris.css` 52, `00-theme-base.css` 241, `80-cinema.css` 8.
- São os patches que seguram o layout. **Reduzir é perigoso — não recomendo mexer por atacado.**

### 4.4 🟡 Camadas de tema claro sobrepostas
- `50-theme-light.css` + `60-theme-light-premium.css` + `70-solaris.css` — **3 folhas** mexendo no tema claro. Possível redundância/conflito (uma sobrescrevendo a outra com `!important`). Auditar com cuidado visual.

---

## 5. 🎨 CSS — outros

### 5.1 🟢 Classes CSS mortas — **AUDITADO ✅ (commit `a959635`)**
- Cruzei todas as classes com prefixo de versão (`v23/v35/v60/v62/v64/v66/v67/v69`) contra o uso no JS. **Praticamente todas estão VIVAS** (aplicadas via `classList`/template). Única morta: **`v23-table-toolbar`** (table toolbar nunca implementada) — removida das 5 regras multi-seletor. **O CSS está essencialmente limpo de classes mortas.**

### 5.2 🟡 Assets acima do alvo (sem minificação) · **MINIFICAÇÃO INVIÁVEL NESTA MÁQUINA**
- `styles.css` ~340KB, `app.js` ~293KB (alvo recomendado 300KB). `terser`/`lightningcss` não instalados (zero-deps **proposital**).
- **Bloqueio (descoberto 2026-06-07):** esta máquina **não tem `npm`** — só o `node.exe` avulso do bundle da Adobe (sem `npm`, sem `npm-cli.js`, sem `node_modules/npm`, nada no PATH). Sem gerenciador de pacotes, **não dá pra instalar** as 2 devDeps. Contornos descartados: vendorizar é hacky e **`lightningcss` é binário nativo** (não dá pra "baixar um arquivo"); minificador caseiro é arriscado (quebraria `calc()` e regex sem um parser real).
- No fio, o GitHub Pages já serve **gzipado** (~70KB) → impacto real pequeno.
- **Resolução realista:** **subir o limiar do warning** no `build.mjs` (calar o aviso, documentando que "sem minificação é aceitável aqui") **ou deixar como está**. Minificação "de verdade" só se a máquina ganhar `npm`.

---

## 6. 🧰 Dívidas conhecidas (CLAUDE.md / sessão)

- **6.1 🟢 Importador de planilhas** (`.codex_check_scripts/update_marconi_data.py`) — **JÁ CORRIGIDO** (commit `829871f`): removidos `replace_embedded_json` + validação de `embedded-data`. Pendência: 1 run completo contra planilhas reais na próxima atualização.
- **6.2 🔵 `precompute`** não valida seções além de `fluxo_caixa`/`custos_fixos` — estender ao criar página nova.
- **6.3 🔵 Ruído CRLF↔LF** no working tree (Cowork) — ignorar; **nunca commitar diff só-EOL** nem só timestamp de versão de asset.

---

## 7. ✨ Cosméticos / menores

- **7.1 🟡** `renderOutliers` (`20-interactions.js:443`) está **sem indentação** (coluna 0), destoando do resto do IIFE. Conferir se é intencional ou descuido.
- **7.2 🟢** Comentário do cabeçalho de `80-cinema.css` — **já atualizado** nesta sessão.
- **7.3 🟡** Comentários "v23/v24/v40/v42" espalhados, alguns descrevendo código que já mudou — revisar/atualizar.

---

## 🎯 Priorização sugerida pro dia da faxina

| Ordem | Item | Esforço | Risco | Valor |
|:--:|---|:--:|:--:|:--:|
| ✅ | ~~**1.1** Remover toolbar v35 morta (Opção B)~~ — **FEITO** | Baixo | Baixo | **Alto** |
| ✅ | ~~**3.1** Unificar escape no `MarconiFormat.escapeHtml`~~ — **FEITO** (`28e2cc2`) | Baixo | Baixo | Médio |
| ✅ | ~~**2.2** Caçar funções não-chamadas~~ — **FEITO**: varredura confirmou que **não há mais** (todas vivas) | Médio | Baixo | Médio |
| ✅ | ~~**3.3** Renomear `totalsFor` colidido~~ — **FEITO** (`28e2cc2`) | Baixo | Baixo | Baixo |
| 5 | **5.2** Minificação — **inviável** (máquina sem `npm`); calar o warning ou deixar | Baixo | Baixo | Médio |
| 6 | **7.x** Comentários/indentação | Baixo | Baixo | Baixo |
| 7 | **3.2** Unificar contadores de número | Alto | **Alto** | Médio |
| 8 | **3.4 / 4.x** Consolidar helpers dos patches | Muito alto | **Muito alto** | Baixo |
| ✅ | ~~**5.1** Classes CSS mortas~~ — **FEITO** (`a959635`): só a `v23-table-toolbar` estava morta | Alto | **Alto** | Médio |
| 9 | **4.4** Auditar/unificar camadas de tema claro | Alto | **Alto** | Médio |

**Regra do dia:**
- Itens **1–6** são tranquilos → QA verde no fim e segue.
- Itens **7–9** mexem nos patches/CSS → **screenshot antes/depois das 3 páginas + cinema**, um de cada vez, revertendo ao primeiro sinal de regressão.

---

*Gerado por auditoria de código em 2026-06-03. Itens 🟡 precisam de verificação no dia antes de mexer.*
