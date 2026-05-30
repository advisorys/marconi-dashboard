---
name: atualizar-dados
description: Atualizar data/financeiro.json a partir das planilhas .xlsx dos consultores (fluxo e custos), com precompute+build+QA e commit só se mudou. Inclui o caveat do importador desatualizado.
---

# Atualizar dados do dashboard (planilhas → financeiro.json)

Fluxo para regerar `data/financeiro.json` a partir das planilhas. **Leia o `CLAUDE.md` antes.** Regra inquebrável: **nunca inventar números** — os dados vêm sempre das planilhas reais. O `precompute` é a rede de segurança que valida tudo no fim.

## ⚠️ Alerta crítico (leia primeiro)
O importador original `…\.codex_check_scripts\update_marconi_data.py` está **desatualizado**: ele ainda injeta um `<script id="embedded-data">` no `index.html`, que **foi removido** da arquitetura atual (o `index.html` carrega os dados por `fetch` em `assets/bootstrap.js`). Rodar o script como está faz ele **falhar** com "Embedded data script not found" — e, se fosse adiante, reintroduziria JSON embutido (peso e dado duplicado) que não deve voltar.
→ Use o wrapper seguro abaixo (`update_data_safe.py`), que reaproveita a lógica boa (`generate_data`) e grava **só** o `financeiro.json`.

## Dependências e ambiente
- **Python + openpyxl** (`pip install openpyxl`).
- **Planilhas** dos consultores (origem citada no handoff): `C:\Users\felip\Desktop\Clientes\Marconi Foods\01 - Arquivos\Análises dos Consultores`. Usa todos os `.xlsx`, **ignora temporários `~$...`**. Precisa de uma planilha com "fluxo" e outra com "custo" no nome.
- Layout esperado (hardcoded no importador): abas `RESUMO MENSAL` e `FLUXO DE CAIXA - 2026` (fluxo) e aba `2026` (custos fixos), com os rótulos `ENTRADAS TOTAIS`, `SAÍDAS TOTAIS`, `RESULTADO LÍQUIDO` etc. Se a planilha mudar de formato, o importador quebra — confira o resultado.
- **No Cowork**: a pasta das planilhas e o Python local podem não estar acessíveis no sandbox. Rode preferencialmente no **Claude Code (Windows)** ou conecte a pasta das planilhas antes. O `git push` segue as regras do `CLAUDE.md`.

## Procedimento seguro
1. Confirme que as planilhas existem e não há `~$` abertos (feche o Excel).
2. Rode o wrapper (grava só `data/financeiro.json`, sem mexer no `index.html`):
   ```
   python .claude/skills/atualizar-dados/update_data_safe.py \
     "<...>\.codex_check_scripts\update_marconi_data.py" \
     "C:\Users\felip\Desktop\Clientes\Marconi Foods\01 - Arquivos\Análises dos Consultores" \
     "<repo>"
   ```
3. Revalide e reconstrua:
   ```
   npm run prepare-dashboard   # precompute (valida!) + build
   npm run build:prod
   npm run qa                  # ou GitHub Actions, no Cowork
   ```
   Se o `precompute` falhar, **pare**: o dado da planilha está inconsistente. Não force.
4. Veja se mudou de verdade (ignorando ruído de data/EOL):
   ```
   git diff --ignore-all-space -- data/financeiro.json
   ```
   - **Sem mudança real** (só `meta.ultima_atualizacao`/EOL) → **não commite**.
   - **Com mudança real** e QA verde → `git add data/financeiro.json` (+ `assets/` gerados, se rebuildou) → commit claro → push.
5. Registre o resultado em `…\ultima_atualizacao_dashboard.txt` (data/hora, commit, planilhas processadas, contagens: daily, categorias, itens de custos fixos, totais).

## O que o importador produz (referência)
- `fluxo_caixa`: `monthly` (12 meses: name/entradas/saidas/resultado/projection), `categoryMonthly`/`categories`, `daily` (365), `reconciliation` (12, diffs zerados quando bate).
- `custos_fixos`: `items` (name/group/`months` = 12×[est, real, diff, basis]), `totals`, `months` (rótulos).
- `meta.ultima_atualizacao` (America/Sao_Paulo) e `meta.fonte` (nomes das planilhas).

## Melhoria recomendada
Quando a pasta das planilhas estiver acessível, vale **corrigir e testar** o `update_marconi_data.py` de vez: remover `replace_embedded_json` e a validação de `embedded-data`, gravando só `financeiro.json`. Faça em conjunto, validando contra planilhas reais — não às cegas.
