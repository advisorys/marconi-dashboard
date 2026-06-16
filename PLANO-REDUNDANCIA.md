# 🪶 Plano de enxugamento — leveza & clareza (pré-D.R.E.)

**Data:** 2026-06-08
**Objetivo:** matar a redundância visual ("o cliente vê a mesma coisa 3 vezes"), deixar o painel leve e claro, e preparar a arquitetura pra receber a página de **D.R.E. Gerencial** sem virar labirinto.
**Princípio guia:** **uma pergunta → uma vista canônica.** Escolher a melhor representação de cada informação e cortar/fundir o resto.

> Inventário levantado por 3 agentes (1 por página). Prototipagem — impacto alto no HTML é aceitável.

---

## 1. Diagnóstico (quantos blocos hoje, e a repetição)

| Página | Blocos | Repetição principal |
|---|--:|---|
| **Fluxo de Caixa** | **15** | mensal (entradas/saídas/resultado) em **6 blocos**; categoria em **4**; alerta **idêntico 2x** |
| **Diretoria** | 7 | mesmo agregado **3x na tela** (veredito + KPIs + prosa) |
| **Custos Fixos** | 11 | desvio por rubrica em **3 formas** (atenua por estar em sub-abas) |

Os 3 prints do cliente = blocos **6, 10, 12** do Fluxo (três formas do mesmo dado mensal).

---

## 2. Fluxo de Caixa — 15 → ~8 blocos

| # | Bloco | Mostra | Ação | Motivo |
|--:|---|---|---|---|
| 1 | Hero / capa | 3 KPIs resumo | **Manter** | abertura |
| 2 | Indicadores-chave (4 KPIs) | agregado período | **Manter** (âncora) | leitura de relance |
| 3 | Resumo executivo | leitura + "sinais rápidos" | **Manter, enxugar** | tirar os "sinais rápidos" (duplicam bloco 7) |
| 4 | Barras mensais entradas×saídas | mensal | **Manter (âncora gráfica)** | o gráfico do mês |
| 5 | Barras de resultado mensal | mensal | **Fundir no 4** | resultado já anotado sob as barras |
| 6 | "Análise mês contra mês" (tabela) | mensal + variação | **Cortar** | absorvido pelo drill-down da tabela 10 · *print* |
| 7 | Meses críticos (alertas) | alertas | **Manter (único bloco de alertas)** | recebe os do 3b |
| 8 | Linha "Movimentação" (`#daily`, é mensal) | mensal | **Cortar** | mesmos dados do 4, só em linha |
| 9 | Donut + ranking categorias | categoria | **Manter (âncora)** | a vista de categorias |
| 10 | Tabela "Resultados mensais" | mensal + drill | **Manter (ficha mensal canônica)** | margem/status + drill com MoM + top categorias · *print* |
| 11 | Insights dinâmicos | mistura | **Cortar/fundir** | repete KPIs (2)/resultado (5)/resumo (3) |
| 12 | Cards "mini análise executiva" (heatmap) | mês×categoria | **Cortar** | repete tabela (10) + donut (9) · *print* |
| 13 | Toolbar ordenar ranking | controle | **Manter** | controle do 9 (não é dado) |
| 14 | Dock comparativo fixado | mês/cat | **Manter** | interação sob demanda |
| 15 | Metodologia | texto | **Manter** | transparência |

**Cortes:** 5 (fundir), 6, 8, 11, 12 + dedup de alertas. Os 3 prints colapsam em **1** (tabela 10) + o gráfico-âncora (4).

---

## 3. Diretoria — 7 → ~5 blocos (e parar de duplicar o Fluxo)

| # | Bloco | Ação |
|--:|---|---|
| 1 | Capa | Manter |
| 2 | Veredito (badge ESTÁVEL/ATENÇÃO/CRÍTICO) | **Manter** |
| 3 | 4 KPIs | **Manter** |
| 4 | Saúde (score + lista) | **Manter** |
| 5 | Pontos de atenção | **Manter** |
| 6 | "O que explica o período" (prosa) | **Cortar ou reduzir a 1 frase** — repete veredito (2) + KPIs (3) |
| 7 | Ações recomendadas | **Manter** |

+ **Remover o renderer V38 morto** (script-9, sobrescrito pelo V40 — código duplicado inativo).
+ **Papel da página:** vira o "índice executivo de 30s" com CTAs pra mergulhar em Fluxo/Custos/DRE — **deixa de reproduzir o detalhe mensal** que vive no Fluxo.

---

## 4. Custos Fixos — fundir desvios + cortar prosa

| # | Bloco | Ação |
|--:|---|---|
| 3 | KPIs (4) | Manter |
| 4 | Resumo executivo (3 cards) | **Manter, enxugar** |
| 6 | Análise automática (prosa + ações) | **Reduzir** — repete KPIs (3) + resumo (4) |
| 7 | Gráfico mensal orçado×real | Manter |
| 8 | Composição por grupo | Manter |
| 9 | Maiores variações (lista) | **Fundir com 10** |
| 10 | Rubricas sensíveis (cards) | **Fundir com 9** → um único "rubricas em foco" |
| 11 | Heatmap rubrica×mês (aba Mapa) | Manter (vista distinta) |
| 5 | Painel de foco (drill) | Manter |

As sub-abas (overview/control/matrix) já separam bem; o ganho é **fundir 9+10** e **enxugar a prosa**.

---

## 5. Arquitetura de páginas + encaixe do D.R.E.

**Tese:** o peso não vem do nº de páginas, vem do tamanho de cada uma. 4 abas no topo navega bem. Cada página deve ter **um papel único e não repetir a outra**:

| Página | Papel (lente única) |
|---|---|
| **Diretoria** | Resumo executivo de 30s — saúde, riscos, ações. Índice com CTAs. |
| **Fluxo de Caixa** | O caixa **mês a mês** + para onde vai (categorias). |
| **Custos Fixos** | Estrutura fixa **real × orçado**. |
| **D.R.E. Gerencial** *(nova)* | Resultado por **linha gerencial** (receita → CMV → despesas → EBITDA). Lente que **não existe hoje**. |

Cortada a duplicação Diretoria↔Fluxo, o DRE entra como 4ª lente **sem somar peso**.

---

## 6. Ordem sugerida de execução

1. **Fluxo de Caixa** (maior ganho: 15→~8; ataca os 3 prints).
2. **Diretoria** (tirar prosa duplicada + V38 morto + virar índice).
3. **Custos Fixos** (fundir 9+10, enxugar prosa).
4. **D.R.E. Gerencial** (página nova, via skill `nova-pagina-dashboard`).

Cada passo: branch → QA verde → revisão visual → commit. Cortes removem `<section>` do `index.html` + a função de render correspondente (sem mexer no cálculo dos números que sobram).
