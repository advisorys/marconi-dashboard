# Melhorias estéticas — tema dual (dark + claro)

Spec de **polish visual** para o Claude Code executar com precisão. Vale para os **dois temas**: escuro (padrão, identidade premium navy + âmbar) e claro. Objetivo: elevar o acabamento **sem redesenhar** nem trocar a identidade.

> Pré-requisito: a Fase 6 (tokens + tema claro + toggle) do `FASE6-DESIGN-SYSTEM.md`. Faça isto na MESMA branch `claude/fase-6-design-system`. Regras valem: trabalhar em branch, QA nos dois temas (inclua a captura clara do §7b), **merge só com aprovação**, dark continua o padrão, verde = economia / vermelho = acima (não inverter).

## Princípios
1. **Refinar, não trocar.** Ajustes sutis; nada de nova identidade.
2. **Disciplina de acento:** 1 acento primário por tema (âmbar/dourado). Verde e vermelho **só** para semântica financeira. Ciano/índigo/roxo viram estruturais/sutis — não competir com o âmbar.
3. **Menos saturação em fundos de status:** a cor forte fica no **texto/valor**; o fundo usa **tint** suave. Isso "acalma" o visual e funciona nos dois temas.
4. **Ritmo e alinhamento:** escala de espaçamento de 8px, números **tabulares**, hierarquia tipográfica consistente.

## 1. Tokens de polish (adicionar)
No `:root` de `src/css/00-theme-base.css` (valores **compartilhados** + os do **dark**):
```css
:root{
  /* escala compartilhada */
  --r-sm:8px; --r-md:12px; --r-lg:16px; --r-pill:999px;
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px; --sp-6:32px;
  --ease:cubic-bezier(.2,.6,.2,1); --t-fast:120ms; --t-med:200ms;
  /* dark: tints de status + elevação + foco */
  --tint-positive: rgba(16,185,129,.14);
  --tint-negative: rgba(239,68,68,.14);
  --tint-accent:   rgba(245,158,11,.14);
  --elev-1: 0 1px 2px rgba(0,0,0,.45);
  --ring:   0 0 0 3px rgba(245,158,11,.45);
  --hairline: var(--border);
}
```
No `src/css/50-theme-light.css` (override **claro**):
```css
html[data-theme="light"]{
  --tint-positive:#E7F6EE;
  --tint-negative:#FCECEC;
  --tint-accent:#FBF0E0;
  --elev-1: 0 1px 2px rgba(16,23,42,.06), 0 1px 3px rgba(16,23,42,.04);
  --ring: 0 0 0 3px rgba(180,83,9,.35);
}
```

## 2. Tipografia
- **Corrigir a quebra do título** (bug real no mobile: "Performance" virou "Performanc / e"). Nos títulos display/hero (os H1 grandes das páginas), aplique:
  ```css
  .display-title, .hero-title, h1.page-title{ overflow-wrap:normal; word-break:normal; hyphens:manual; text-wrap:balance; }
  ```
  (ajuste o seletor para a classe real dos títulos grandes — Diretoria, Fluxo, Custos).
- **Tamanho responsivo** nos títulos display: `font-size:clamp(28px,6vw,44px); line-height:1.08; letter-spacing:-.02em;`
- **Números tabulares** em TODO valor financeiro (KPIs, tabelas, mapa de desvios):
  ```css
  .kpi-value,.fixed-row .num,.fixed-cell,[data-num]{ font-variant-numeric:tabular-nums; font-feature-settings:"tnum" 1; }
  ```
  (aponte para as classes reais dos números — isso alinha as colunas e é um ganho "profissional" enorme.)
- **Labels** maiúsculos atuais: manter, mas suavizar — `letter-spacing:.08em; color:var(--text-dim); font-size:11px;`

## 3. Cards de KPI
- Padding `var(--sp-4) var(--sp-5)`, raio `var(--r-lg)`, borda hairline `1px solid var(--border)`, sombra `var(--elev-1)` (sutil no dark, suave no claro).
- Valor 24–28px peso 500 tabular; label 11px `--text-dim`.
- **Delta como chip tintado:** fundo `var(--tint-positive)`/`var(--tint-negative)`, texto `var(--green)`/`var(--red)` — não usar fundo saturado.
- Hover: `transition: var(--t-med) var(--ease);` no dark vai para `--surface-2` + `--border-2`; no claro, leve `transform:translateY(-1px)` + `--elev-1` mais forte.

## 4. Custos Fixos — mapa de desvios (o ponto que mais pesa)
Hoje a tabela é muito saturada (vermelho/verde cheios). Troque os fundos por **tints**:
- célula de **economia**: `background:var(--tint-positive); color:var(--green);`
- célula **acima do orçado**: `background:var(--tint-negative); color:var(--red);`
- célula neutra/dentro: `background:var(--surface); color:var(--text-dim);`
Mantenha a legenda e deixe os números tabulares. Resultado: leitura mais limpa e premium nos dois temas, sem perder o sinal de cor.

## 5. Sidebar / topbar / abas
- Aba de página ativa: trocar o preenchimento dourado "cheio" por **pill tintado** — `background:var(--tint-accent); color:var(--gold-l); border:1px solid transparent;` (no dark) e `color:var(--gold)` no claro. Hover sutil nas inativas.
- Separadores: hairline `1px solid var(--border)`; remover bordas pesadas.
- Botões de ação (`.sidebar-action`): raio `--r-md`, `transition:var(--t-fast) var(--ease)`, foco `box-shadow:var(--ring)`.

## 6. Bordas, elevação e fundo
- **Dark:** hierarquia por superfície (`--bg < --surface < --surface-2`), hairlines de `--border`; nada de sombra preta dura.
- **Claro:** cards com hairline `--border` + `--elev-1` (sombra suave); evitar borda grossa. Fundo de página `--bg` (#F6F7F9), cartões `--surface` (#FFF).

## 7. Estados e micro-interações
- `transition` de 120–200ms em hover/focus/toggle, **dentro do guard de `prefers-reduced-motion`** que já existe (não animar se o usuário pediu menos movimento).
- `:focus-visible{ outline:none; box-shadow:var(--ring); }` consistente.
- Toggle de tema: troca suave de fundo (opcional, sutil) — não piscar.

## 8. Disciplina de acento (passe de limpeza)
Audite usos de ciano/índigo/roxo no CSS/JS. Onde forem decorativos, rebaixe para estrutural (borda/realce sutil) para o **âmbar** ficar como acento primário claro. Não introduzir cores novas.

## 9. Gráficos (JS)
Os gráficos desenhados em JS usam cor fixa — torne-os theme-aware lendo os tokens em runtime e redesenhando no evento `theme:changed` (ver `FASE6` §6). Use `--gold` para a série principal, `--text-dim` para eixos/grid, tints para áreas.

## 10. QA (obrigatório, nos DOIS temas)
```
npm run prepare-dashboard && npm run build:prod && npm run qa
```
Com a captura clara (§7b do FASE6) ativa, revise `*-light` e os dark em Diretoria, Fluxo, Custos — desktop e mobile. Conferir:
- contraste AA (âmbar no branco, `--text-dim`, chips), números **alinhados** (tabular), título **não quebra** no meio da palavra, mapa de desvios legível, topbar estável, sem overflow.
- verde = economia, vermelho = acima (intacto).
Salvar como `depois/` e comparar com `antes/`.

## 11. Não fazer / aceite
- Não redesenhar, não trocar identidade, não inverter cores financeiras, não mexer nos dados.
- Dark continua o padrão. **Merge na `main` só com aprovação**, com comparativo antes/depois dos dois temas.
