---
description: Atualiza o dashboard com os números das planilhas dos consultores e publica na main se o QA passar
---

Atualize os dados do Marconi Foods Dashboard a partir das planilhas dos consultores e **publique automaticamente na main** se houver mudança real e o QA passar. Você roda no Windows (Claude Code) com shell completo. **Regra inquebrável: NUNCA invente números — os dados vêm SÓ das planilhas.** Responda em português, de forma concisa.

## Ambiente (lições já aprendidas — não redescubra)
- **node/npm NÃO estão no PATH.** Use o node bundled da Adobe: `& "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" <script>`. Rode os `tools/*.mjs` direto (não há `npm`).
- **Python 3.14 precisa do pacote `tzdata`** (o importador usa `ZoneInfo("America/Sao_Paulo")`). Se `python -c "import tzdata"` falhar, rode `python -m pip install tzdata`. Idem `openpyxl`.
- O importador antigo (`update_marconi_data.py`) está desatualizado (injeta `embedded-data` removido) — **use o wrapper seguro**, que grava só o `financeiro.json`.

## Caminhos
- Repo: `C:\Users\felip\Documents\HMTL - Marconi Foods\marconi-dashboard`
- Importador: `C:\Users\felip\Documents\HMTL - Marconi Foods\.codex_check_scripts\update_marconi_data.py`
- Wrapper: `<repo>\.claude\skills\atualizar-dados\update_data_safe.py`
- Planilhas: `C:\Users\felip\Desktop\Clientes\Marconi Foods\01 - Arquivos\Análises dos Consultores` (todos os `.xlsx`, ignore temporários `~$`). Se essa pasta não existir, procure dentro de `C:\Users\felip\Desktop\Clientes\Marconi Foods` uma subpasta cujo nome bata com a regex (case-insensitive) `an[aá]lises?\s+dos\s+consultores`. Se não achar pasta nem `.xlsx`, **PARE e reporte** (não invente caminho).

## Passos
1. **Pré-flight git**: `git status --short --branch`. Anote a branch. Se houver mudanças locais não relacionadas a dados, avise mas siga (vou stagear só os arquivos certos).
2. **Backup** do JSON atual: `Copy-Item data\financeiro.json data\financeiro.json.bak-pre-update -Force`.
3. **Garanta o ambiente Python**: `python -c "import openpyxl, tzdata"` — se falhar, instale o que faltar.
4. **Rode o wrapper** (detecta mudança real, só escreve se mudou):
   `python "<repo>\.claude\skills\atualizar-dados\update_data_safe.py" "<importador>" "<pasta_planilhas>" "<repo>"`
   - **`RESULT: NO_CHANGE`** → não há novidade. Remova o backup, **NÃO commite**, reporte "sem alterações" e **encerre**.
   - **`RESULT: CHANGED`** → siga.
5. **Compare os números** (transparência): mostre antes→depois das somas anuais de entradas/saídas/resultado do fluxo, e quais meses mudaram. Use um script Python temporário em `.qa-output\` (PowerShell here-string quebra com `$`). Isto é só relatório — não decide nada.
6. **Revalide e reconstrua** (node da Adobe):
   - `node tools/precompute-data.mjs` → se falhar, **PARE**: dado inconsistente. Reverta (`git checkout -- data/financeiro.json`), remova o backup, reporte BLOQUEADO. Não force.
   - `node tools/build.mjs --prod`
   - `node tools/qa-dashboard.mjs` → leia o JSON de saída: `passed`, falhas, erros de console.
7. **Publique SÓ se QA verde** (sua política: push automático):
   - `git diff --check` (ignore warnings de EOL CRLF↔LF — são esperados).
   - `git add data/financeiro.json index.html assets/app.js assets/styles.css assets/bootstrap.js` (arquivos específicos, **nunca `git add -A`**).
   - `git commit -m "Atualiza dados financeiros (planilhas dos consultores)"` (encerre a mensagem com a linha `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`).
   - **Se a branch atual for `main`**: `git push origin main`. **Se for outra branch**: faça `git checkout main`, `git pull origin main`, `git merge --no-ff <branch>`, `git push origin main`.
   - Limpe o backup (`Remove-Item data\financeiro.json.bak-pre-update`).
   - **Se QA falhar**: NÃO commite. `git checkout -- data/financeiro.json assets index.html`, restaure do backup se preciso, reporte BLOQUEADO com o motivo e encerre.
8. **Confirme o CI** (se houver `gh`): aguarde o workflow "Dashboard QA" no push da main e reporte o conclusion.
9. **Registre** em `…\Análises dos Consultores\ultima_atualizacao_dashboard.txt` (ou no `ultima_atualizacao_dashboard.txt` da pasta-mãe do repo, o que já existir): data/hora (America/Sao_Paulo), commit, planilhas processadas, contagens (daily, categorias, itens custos fixos) e os totais novos.
10. **Reporte** ao final: mudou ou não · totais antes→depois · QA verde/vermelho · commit/push (sim/não + hash) · CI · riscos.

## Regras de integridade (CLAUDE.md)
Não editar `assets/*` à mão (são gerados). Não mudar paleta/design. Não commitar se QA falhar. Nunca `git reset --hard`. Nunca apagar trabalho local do usuário. Commitar só mudança real (sem ruído de EOL ou só-timestamp). Verde=positivo/economia, vermelho=negativo/acima — nunca inverter.
