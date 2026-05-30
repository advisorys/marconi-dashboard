# Automação agendada — Atualizar dados (Claude Code / Windows)

Esta automação atualiza `data/financeiro.json` a partir das planilhas dos consultores e publica
se houver mudança real. **Roda no Claude Code (Windows)** — não no Cowork — porque precisa das
planilhas (no Desktop), do Python/openpyxl e de **criar commit** (o sandbox do Cowork não commita).

## Como agendar no Claude Code Desktop
1. Abra o Claude Code Desktop no repositório `marconi-dashboard`.
2. Crie uma tarefa agendada (seção de agendamentos / "Schedule").
3. Cadência sugerida: **diária, dias de semana, de manhã** (ex.: 07:00). É seguro rodar todo dia: se as planilhas não mudaram, a tarefa detecta e **não faz nada** (sem commit de ruído).
4. Cole o prompt abaixo como instrução da tarefa.

---

## Prompt da tarefa (cole isto no Claude Code)

```
Atualize os dados do Marconi Foods Dashboard a partir das planilhas dos consultores e publique só se houver mudança real. Você roda no Windows com shell completo. Siga o CLAUDE.md e a skill "atualizar-dados". Regra inquebrável: NUNCA invente números — os dados vêm só das planilhas. Responda em português.

Caminhos:
- Repo: C:\Users\felip\Documents\HMTL - Marconi Foods\marconi-dashboard
- Importador: C:\Users\felip\Documents\HMTL - Marconi Foods\.codex_check_scripts\update_marconi_data.py
- Wrapper: <repo>\.claude\skills\atualizar-dados\update_data_safe.py

Passos:
1. Localize a pasta das planilhas. Procure dentro de "C:\Users\felip\Desktop\Clientes\Marconi Foods" uma subpasta cujo nome bata com a regex (case-insensitive) `an[aá]lises?\s+dos\s+consultores` — o nome real é algo como "analise dos consultores" / "Análises dos Consultores". Ex. PowerShell:
   $base = "C:\Users\felip\Desktop\Clientes\Marconi Foods"
   $plan = Get-ChildItem $base -Recurse -Directory | Where-Object { $_.Name -match 'an[aá]lises?\s+dos\s+consultores' } | Select-Object -First 1
   Confirme que existe pelo menos um .xlsx (ignore temporários que começam com ~$). Se não achar a pasta ou não houver .xlsx, PARE e reporte (não invente caminho).
2. Garanta o Python e o openpyxl (se `python -c "import openpyxl"` falhar, rode `pip install openpyxl`).
3. Rode o wrapper (ele detecta mudança real e só escreve se mudou):
   python "<repo>\.claude\skills\atualizar-dados\update_data_safe.py" "<importador>" "<pasta_planilhas>" "<repo>"
   - Se imprimir "RESULT: NO_CHANGE": não há novidade. NÃO faça commit. Reporte "sem alterações" e encerre.
   - Se imprimir "RESULT: CHANGED": siga.
4. Revalide e reconstrua (no repo):
   npm run prepare-dashboard   (precompute valida o JSON; se falhar, PARE — dado inconsistente, não force)
   npm run build:prod
   npm run qa                  (QA de browser roda aqui no Windows com o Chrome real)
5. Se precompute/build/qa passaram: publique só os arquivos certos (evite `git add -A`):
   git add data/financeiro.json assets/app.js assets/styles.css index.html assets/bootstrap.js
   git commit -m "Atualiza dados financeiros (planilhas dos consultores)"
   git push origin main
   Se QA falhar: NÃO commite; rode `git checkout -- data/financeiro.json assets index.html` pra reverter, e reporte BLOQUEADO com o motivo.
6. Registre o resultado em "C:\Users\felip\Desktop\Clientes\Marconi Foods\...\analise dos consultores\ultima_atualizacao_dashboard.txt" (ou no caminho equivalente já usado): data/hora (America/Sao_Paulo), commit, planilhas processadas, e contagens (daily, categorias, itens de custos fixos, totais).
7. Reporte: mudou ou não, QA verde/vermelho, commit/push (sim/não), e riscos.

Regras de integridade (CLAUDE.md): não editar assets à mão (são gerados); não mudar paleta/design; não commitar se QA falhar; nunca `git reset --hard`; nunca apagar trabalho local do usuário; commitar só mudança real.
```

---

## Observações
- A automação de QA das 05:00 (Cowork) e esta de dados (Claude Code) são complementares: a de dados publica quando o consultor entrega planilha nova; a de QA vigia a integridade todo dia.
- O importador antigo (`update_marconi_data.py`) ainda injeta `embedded-data` (removido da arquitetura) — por isso usamos o wrapper, que grava só o `financeiro.json`. Quando der, vale corrigir o importador de vez (ver SKILL.md → "Melhoria recomendada").
