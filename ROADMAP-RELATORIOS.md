# Roadmap de Evolução — Dashboard Financeiro Marconi Foods (2026)

> Empresa **EM RECUPERAÇÃO JUDICIAL**. Público: diretoria (leitura de relance) + analista + terceiros (administrador judicial, credores). Site estático, sem backend, sem inventar números. Todos os valores abaixo foram conferidos contra `data/financeiro.json` em 2026-06-17.

---

## 1. Sumário executivo

O dashboard hoje são **4 páginas isoladas**, cada uma lendo uma fonte sem cruzá-las, e **nenhuma menciona a Recuperação Judicial** — apesar de "EM RECUPERAÇÃO JUDICIAL" constar no próprio CNPJ da DRE. As maiores oportunidades estão em três frentes: **(a) corrigir distorções de leitura que comprometem credibilidade** (a DRE exibe "Lucro Bruto = 100% da receita" porque o CMV está aninhado errado; Junho parcial é contado como mês fechado superavitário em Fluxo e Custos Fixos; metodologia escrita contradiz a fonte Bling); **(b) dar ao painel uma camada de RJ** (runway, geração de caixa operacional limpa de antecipações, custo isolado da própria RJ = **R$685k / 69% de todo o custo fixo realizado**); e **(c) ativar dados já presentes e desperdiçados** (`daily` com 109 dias, `reconciliation` 100% zerada, categorias "Mov. Financeiras" e "Despesas Financeiras"). Vários itens são **quick wins de baixo esforço e alto valor** — texto, selos e colunas derivadas de dados que já existem. A aposta estratégica de maior retorno é a **ponte Caixa × Competência** (o caixa girou ~R$35M mas o lucro foi R$295k — "cadê o dinheiro?"), seguida de uma **aba dedicada de Recuperação Judicial**.

---

## 2. Quick wins (esforço baixo, alto valor)

| Página | Ideia | Valor | Esforço |
|---|---|---|---|
| Fluxo | **Tratar Junho como mês PARCIAL** — usar `isPartialMonth` (já existe e nunca é chamado) para dar selo no gráfico/tabela e excluir Jun do "Melhor Mês" e da média de saídas dos alertas | Hoje Jun (+R$217k) entra como mês fechado e induz decisão sobre número que muda até dia 30 | Baixo |
| Custos Fixos | **Excluir/sinalizar o mês parcial do desvio** — Jun real R$123k vs orçado R$156k vira falso −R$33k de "economia" que infla o KPI de desvio | Desvio realizado vira número honrado (Jan–Mai fechados); credível p/ AJ/credores | Baixo |
| Fluxo | **Corrigir o texto de Metodologia** — crava "Jan-jun/Jul-dez" (corte é por selo) e diz que saídas excluem Importação (o Bling **conta** Importação, exclui só a Classe AJUSTE); explicar "Sem classificação" (15 lanç. ~R$558k) | Metodologia errada destrói credibilidade na 1ª pergunta cética | Baixo |
| DRE | **Coluna AV% (análise vertical)** — cada linha como % da Receita Líquida (CMV 86,4%, Desp. Vendas 91,4%, Resultado 1,6%) | Mostra de relance que o problema é CMV+comercial (~90% da RL), não overhead (1%) | Baixo |
| DRE | **Faixa de margens no topo** (Bruta ~13,6%, Operacional, Líquida 1,59%) — cumpre o header que promete "margens" e padroniza a base no RL (hoje o KPI mistura RB e RL) | Margem é o que diretoria e credores leem primeiro; 1,6% = fio da navalha | Baixo |
| DRE | **Sinalizar divergência soma-meses × acum assinado** — R$299.557 vs R$295.437 (Δ R$4.120); badge/tooltip por linha quando \|soma−acum\| > limite | Em DRE que vai a credores, divergência precisa ser rastreável, não nota de rodapé | Baixo |
| Fluxo | **Caixa acumulado corrido** (running total) no bar chart/tabela — Jan +95k … Mai +201k, com o déficit de abril visível | Diretoria precisa de tendência, não 6 fotos soltas; inclinação mostra recuperação | Baixo |
| Custos Fixos | **KPI de aderência orçamentária + "meses dentro da meta"** — `1 − Σ\|diff\|/Σest`, em vez do desvio líquido em R$ que esconde compensações | Nota única "estamos cumprindo o orçamento?" p/ reportar disciplina ao AJ | Baixo |
| Custos Fixos | **Top estouros recorrentes por %** — expor Reembolso Consultoria +220% (R$96k vs R$30k orçado est.), Honorários +14%, Passagem +21%; separar recorrente × pontual | Foca o corte nos itens discricionários e controláveis | Baixo |
| DRE | **Destaque visual do CMV** (barra proporcional inline / card "Custo total da operação ~93% da RL") | Faz ver em 2s que sobra ~7% p/ tudo o mais — base p/ renegociar fornecedor | Baixo |
| Transversal | **Subtítulo do header e footer dinâmicos** — hoje cravam "Fluxo de Caixa 2026" e "JANEIRO — JUNHO / 2026"; derivar do último mês realizado via `isRealizedMonth` | Rótulo de período mentindo é o pior erro de painel executivo | Baixo |
| Transversal | **Reativar a reconciliação** (`reconciliation[12]` existe e está 100% zerada) — selo "Fonte reconciliada / 0 divergências" + expor os 15 lanç. sem categoria | Em RJ, confiabilidade vale tanto quanto o número; transmite governança | Baixo (depende do importador alimentar os diffs) |
| Transversal | **Skip-link + role/aria completos nas abas** — `role='tab'`/`aria-controls` nos `data-fixed-view`; `<a class='skip-link'>` | Acessibilidade esperada e auditável por terceiros em RJ | Baixo |

---

## 3. Apostas maiores (novos relatórios / funcionalidades)

### Tema A — Recuperação Judicial (PRIORIDADE ESTRATÉGICA)

**A1. Nova aba "Recuperação Judicial"** *(esforço alto)*
Página dedicada com os 4–5 indicadores que um plano de RJ exige:
- **Geração de caixa operacional** mensal = resultado de caixa **excluindo** "Mov. Financeiras (antecip./empréstimos)" — mostra o caixa "limpo" da operação, não inflado por dívida nova.
- **Runway** = saldo de caixa / burn médio dos últimos 3 meses.
- **Tendência** de geração de caixa Jan–Jun com linha de tendência.
- **Custo isolado da RJ** (ver A2).
- Cada card com selo realizado/parcial/projeção (helpers `MarconiFormat` existentes).
- **Dados:** geração operacional, tendência e custo-da-RJ usam o que já existe (`fluxo_caixa.monthly` + `categories` + `custos_fixos.items`). **Runway exige UM dado novo crítico:** o **saldo de caixa** (abertura/fechamento) — existe na fonte Bling (`diagnostics.linhas_saldo=2`) mas **não foi exposto no JSON**. Recomendação: importador gravar `fluxo_caixa.saldoInicial/saldoFinal` por mês. Sem isso, runway não é calculável.

**A2. Bloco "Custo da Recuperação Judicial"** *(esforço médio — dados já disponíveis)*
Isola e soma as rubricas do processo: Honorários AJ **R$268k**, Honorários consultoria **R$237,5k**, Reembolso consultoria **R$96k**, Advocatícios **R$52k**, Contábeis **R$28k**. **Total ≈ R$681,7k = 68,7% de TODO o custo fixo realizado (R$991,9k)** — achado direto dos dados, hoje diluído dentro de "Despesas com Funcionamento". Implementável como 3º grupo virtual por nome de rubrica, sem mexer no dado. Mostra que a estrutura operacional "pura" é enxuta e que o peso é o jurídico do plano. **Vira material de reunião com credores.**

**A3. Faixa de RJ persistente** *(esforço médio)*
Faixa fina abaixo do top-nav nas 4 páginas: "EM RECUPERAÇÃO JUDICIAL" + caixa gerado acumulado + runway estimado (rotulado como **estimativa gerencial**, não plano homologado). Transforma "relatório genérico" em "painel de RJ", que é exatamente o público.

> Nota de dedup: a "faixa de status de RJ" (Diretoria), a "faixa persistente" (Transversal) e o "recorte de RJ no Fluxo" são a **mesma família** — consolidar num único componente reutilizável alimentando a aba A1 + a faixa A3, derivando o status do número-chave de cada página.

---

### Tema B — Ponte Caixa × Competência ("se deu lucro, cadê o caixa?")

**B1. Ponte Caixa × Competência (waterfall)** *(esforço alto)*
A pergunta nº1 de uma empresa em RJ. A DRE (competência) mostra lucro acum **+R$295k**; o Fluxo (caixa Bling) mostra meses bem diferentes (Jan +95k, Abr −135k) e entradas de caixa ~R$35M vs receita contábil R$20M. Waterfall mês a mês (Jan–Abr, onde há as duas fontes) reconciliando resultado de caixa → lucro líquido, com blocos rotulados:
- (a) entradas de caixa que não são receita → antecipações/empréstimos ("Mov. Financeiras" R$2,4M) + o gap de ~R$15M entre caixa e receita;
- (b) saídas brutas vs líquidas → os **R$20,7M de `ajustesGerenciais`** já calculados no `daily`;
- (c) defasagem temporal compra/pagamento e venda/recebimento (linha residual de conciliação).
- **Dados:** maior parte já disponível (`monthly`, `daily.ajustesGerenciais/saidasBrutas`, `categories`, `dre.lines.values{1..4}`). A decomposição fina do gap de R$15M idealmente pede **saldos de balanço** (estoque/recebíveis) — fonte nova da contabilidade; versão defensável já dá com o que existe (gap total como linha residual).

> Dedup: a proposta da DRE ("Ponte DRE × Fluxo") e a transversal ("Ponte Caixa × Competência") são **a mesma** — fazer uma só, hospedada na DRE ou na aba RJ.

---

### Tema C — Erosão de margem e estrutura de custo (DRE)

**C1. Corrigir "Lucro Bruto" enganoso** *(esforço médio — CORREÇÃO, não refinamento)*
**Distorção de leitura mais grave do painel.** O CMV (−R$16,09M) está aninhado como L1 **dentro** de "−Despesas com Vendas" (−R$17,02M), então `lucro_bruto` acum fica **igual** à Receita Líquida (R$18,63M) — a página diz que a margem bruta é **100%**, o que é falso. Margem bruta real = (RL+CMV)/RL ≈ **13,6%**. Reposicionar o CMV como dedução direta da RL na cascata (ou recomputar `lucro_bruto = RL − CMV` em `45-dre.js`, os números existem) e mostrar o resíduo de Desp. Vendas (−R$931k) como despesa comercial separada. **Alinhar com a Priori/consultoria** se a reclassificação é só de exibição ou estrutural.

**C2. Erosão de margem / alerta de CMV (tendência mensal)** *(esforço médio)*
O acumulado assinado (margem média ~1,5%) **esconde** a deterioração. Gráfico de linha duplo (margem líquida e peso do CMV) com banda de alerta: margem líquida **0,27% → 1,67% → 2,24% → 1,36%** e CMV/RL subindo **73,6% → 80,3% → 83,9% → 88,4%** (conferido). Texto automático: "CMV consumiu 88% da receita em Abril — margem comprimindo". Margem caindo de Mar→Abr é alerta antecipado.

**C3. Análise horizontal mês×mês** *(esforço médio)* — sparklines/Δ% por linha; Receita Líquida saltou de R$1,85M (Jan) → R$8,08M (Abr); responde "estamos melhorando?", a pergunta-chave do plano de RJ. *(C2 e C3 podem ser entregues juntos.)*

**C4. EBITDA (cumprir a promessa do header)** *(esforço médio)* — header diz "EBITDA" e não há. Proxy "Resultado Operacional antes do financeiro" (≈ R$295k + R$72k ≈ **R$367k**), marcado como "EBITDA parcial (sem D&A)". **Depreciação/amortização é fonte nova da Priori** para EBITDA pleno.

---

### Tema D — Granularidade operacional e projeção defensável (Fluxo / Custos)

**D1. Visão diária do mês** *(esforço médio — dado já existe e está parado)* — `fluxo_caixa.daily` (109 dias, com `saidasBrutas` e `ajustesGerenciais`) **não é renderizado**. Mini-painel: 3 maiores dias de desembolso + curva de saldo acumulado intra-mês. Resultado mensal positivo esconde o descasamento dentro do mês — base para negociar prazo com credor/fornecedor.

**D2. Resolver o aparato de Projeção zerada (Jul–Dez)** *(esforço médio)* — meses 7–12 com tudo = 0 (Bling só traz realizado), mas a UI mantém atalho "Projeção" (KPIs em R$0) e divisor REAL|PROJEÇÃO. **Escolher:** (i) esconder o aparato e renomear "2026 completo" → "Acumulado realizado" (usa dado atual), **ou** (ii) alimentar Jul–Dez com **forecast defensável** (média móvel 3m ou run-rate ajustado pela sazonalidade Jan–Jun) marcado como estimativa. Em RJ, projeção/runway é o que AJ e credores cobram. Clicar em "Projeção" e ver tudo zerado mata a confiança.

**D3. Projeção de desembolso de custo fixo (run-rate vs orçado)** *(esforço médio)* — a partir do realizado recorrente Jan–Mai, projetar Jul–Dez ("custo fixo recorrente esperado/mês" e total até dez), em vez de repetir o `est` ~R$156k/mês. Conecta com runway. *(Casa com D2.)*

**D4. Concentração de saídas / exposição a credores (Pareto)** *(esforço médio)* — CMV+Deduções = 86% de todas as saídas. Versão por categoria usa o que existe; a versão por **fornecedor/credor** (a mais valiosa, "estamos dependentes de 1–2 fornecedores?") **exige dado novo:** top-N de contrapartes do extrato Bling (existe na fonte `Cola_Bling`, hoje só entra o agregado por Grupo DRE).

**D5. Comparativo mês-contra-mês das categorias** *(esforço médio)* — quais grupos DRE subiram/caíram vs mês anterior; ex.: Abril CMV de R$5,9M → R$7,9M (+34%) explica o único déficit. `monthCategoryBreakdown(m)` e `(m-1)` já existem. Conectar déficit à rubrica causadora.

---

### Tema E — Apresentação executiva e entregável (Transversal)

**E1. Selo de status único padronizado nas 4 páginas** *(esforço médio)* — só a Diretoria tem `.director-verdict`. Generalizar `renderDirectorV40` num `.status-seal` reutilizável, derivando o status do número-chave de cada página (resultado no Fluxo, % acima do orçado em Custos, margem na DRE).

**E2. "Pacote do Conselho" — PDF executivo consolidado** *(esforço alto)* — a infra de PDF (`export.css`, A4 landscape paginado) já existe. Fluxo único que monta capa Diretoria (verdict + runway RJ) → caixa → custos fixos → DRE assinada → metodologia (caixa Bling vs competência Priori). Entregável recorrente para conselho, AJ e assembleias de credores.

**E3. Legenda unificada realizado/parcial/projeção + aviso base caixa×competência** *(esforço médio)* — convenção visual idêntica (sólido/listrado/tracejado indigo) em todos os gráficos/tabelas das 3 páginas de caixa, com a DRE rotulada "REGIME DE COMPETÊNCIA · JAN-ABR ASSINADO" + tooltip explicando Bling × Priori. Previne a diretoria comparar caixa com competência.

**E4. Refinos de moldura** *(baixo/médio/alto)* — régua tipográfica/radius única entre as 4 grades de KPI (médio); consolidar camadas de patch V36–V40 dos Custos Fixos em bloco único só-CSS com QA visual antes/depois (alto, dívida técnica).

**E5. Subgrupos legíveis em Custos Fixos** *(esforço alto)* — "Despesas com Funcionamento" agrega 31 rubricas heterogêneas; quebrar em Jurídico/RJ, Ocupação, Frota, TI & Software (Conta Azul + Bling — duplicados?), RH & Benefícios, Serviços. Mostra onde dá para cortar de verdade. Pode exigir mapa rubrica→subgrupo.

---

## 4. Por página

### Diretoria
- **Gaps:** veredito e KPIs só de caixa, **score hardcoded**, não usa `dre` nem `reconciliation`, não cita RJ.
- **Fazer:** faixa/selo de RJ (→ A3/E1); **cartão DRE oficial** (ROB R$20M, CMV R$16,1M, Lucro R$295k de `dre.lines.acum` — médio); **runway de caixa** (→ A1, depende do saldo exposto). A Diretoria deve consumir os números de RJ derivados, não recalcular.

### Fluxo de Caixa
- **Correções:** Junho parcial (quick win), aparato de projeção zerada (D2), metodologia errada (quick win).
- **Ativar dados parados:** visão diária (D1), caixa acumulado corrido (quick win).
- **Novos:** recorte de RJ / geração de caixa vs serviço de dívida (→ A1/A2), comparativo categorias mês×mês (D5).

### Custos Fixos
- **Correções/ruído:** excluir mês parcial do desvio (quick win); **tratar rubricas intermitentes/anuais** (INSS, AVCB, IPVA, exames têm real=0 em 4–6 dos 6 meses mas est>0 todo mês → falsa "economia" gigante no heatmap; flag recorrente = real>0 em ≥4 meses) — médio.
- **Novos:** bloco Custo da RJ (→ A2, **o relatório nº1 desta página**); projeção de desembolso (D3); KPI de aderência + top estouros por % (quick wins).
- **Refino:** subgrupos legíveis (E5).

### DRE
- **Correção crítica:** "Lucro Bruto" enganoso = 100% da RL (C1).
- **Quick wins:** AV% (vertical), faixa de margens, divergência soma×acum, destaque do CMV.
- **Novos:** erosão de margem/CMV (C2), horizontal mês×mês (C3), EBITDA (C4), ponte Caixa×Competência (B1, compartilhada).

---

## 5. Sequência recomendada

**Onda 1 — Honestidade dos números (1–2 dias, quase tudo baixo esforço).**
Primeiro porque tudo o mais perde credibilidade se a base estiver errada, e porque em RJ os relatórios são olhados por terceiros.
1. **DRE — corrigir "Lucro Bruto"** (C1) — a distorção mais grave; margem bruta fantasma de 100%.
2. **Junho parcial** em Fluxo **e** Custos Fixos (quick wins) — pela mesma regra de ouro do selo.
3. **Metodologia do Fluxo** + **subtítulo/footer dinâmicos** (quick wins) — rótulos que mentem.
4. **Divergência soma×acum na DRE** (quick win).

**Onda 2 — Leitura executiva de relance (alavanca alta, esforço baixo/médio).**
5. **AV% + faixa de margens + destaque CMV** na DRE (quick wins, mesma `renderTable`).
6. **Caixa acumulado corrido** + **erosão de margem/CMV** (tendência) — mostram trajetória de recuperação.
7. **Selo de status padronizado** (E1) + **legenda unificada** (E3).

**Onda 3 — A camada de Recuperação Judicial (o diferencial estratégico).**
8. **Bloco Custo da RJ** (A2) — dados já existem, achado de R$681,7k/68,7%, alto valor imediato.
9. **Aba/Faixa de RJ + geração de caixa operacional + runway** (A1/A3) — **destravar primeiro o dado novo de saldo de caixa no importador** (`saldoInicial/saldoFinal`); sem ele o runway não sai.
10. **Reativar reconciliação** (quick win, depende do importador) — governança visível.

**Onda 4 — Apostas que exigem cruzamento de fontes ou dado novo.**
11. **Ponte Caixa × Competência** (B1) — pergunta nº1 da diretoria; versão defensável já com o que existe, refinar quando vier balanço.
12. **Visão diária** (D1) + **projeção defensável Jul–Dez** (D2/D3).
13. **EBITDA pleno** (C4), **concentração por fornecedor** (D4), **subgrupos de custo** (E5) — todos pendentes de dado novo (depreciação / contraparte Bling).

**Onda 5 — Polimento e entregável.**
14. **Pacote do Conselho (PDF)** (E2), **régua de KPIs** + **consolidação dos patches V36–V40** (E4), **skip-link/ARIA** (quick win).

**Racional da ordem:** honestidade → legibilidade → camada de RJ → cruzamentos → empacotamento. Os bloqueios de dado novo (saldo de caixa, depreciação, contraparte por fornecedor) estão concentrados nas ondas 3–4 e devem ser pedidos ao importador/consultoria **no início da onda 2** para não travarem a entrega.

> **3 dados novos a solicitar ao importador/Priori (caminho crítico):** (1) **saldo de caixa** abertura/fechamento por mês — destrava runway; (2) **depreciação/amortização** — destrava EBITDA pleno; (3) **top-N de contrapartes** do extrato Bling — destrava exposição por fornecedor/credor. Os três já existem nas fontes; falta exportá-los para o JSON.
