#!/usr/bin/env python3
"""Wrapper seguro de atualização de dados do Marconi Foods Dashboard.

Reaproveita generate_data() do importador original (.codex_check_scripts/update_marconi_data.py)
e atualiza SOMENTE data/financeiro.json — sem mexer no index.html nem reintroduzir o bloco
<script id="embedded-data"> (removido da arquitetura atual).

Detecta MUDANÇA REAL: compara os dados novos com os atuais ignorando meta.ultima_atualizacao.
- Se mudou de verdade: grava financeiro.json e imprime "RESULT: CHANGED".
- Se não mudou (só o timestamp mudaria): NÃO grava nada e imprime "RESULT: NO_CHANGE".
Assim a automação agendada não gera commit de ruído.

Depois rode: npm run prepare-dashboard && npm run build:prod && npm run qa
(o precompute revalida o JSON).

Uso:
  python update_data_safe.py <importador.py> <pasta_planilhas> <repo_dir>

Exemplo:
  python update_data_safe.py \
    "C:\\Users\\felip\\Documents\\HMTL - Marconi Foods\\.codex_check_scripts\\update_marconi_data.py" \
    "C:\\Users\\felip\\Desktop\\Clientes\\Marconi Foods\\01 - Arquivos\\Análises dos Consultores" \
    "C:\\Users\\felip\\Documents\\HMTL - Marconi Foods\\marconi-dashboard"
"""
import importlib.util
import json
import sys
from pathlib import Path


def load_importer(importer_path: Path):
    spec = importlib.util.spec_from_file_location("marconi_importer", str(importer_path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def strip_volatile(upd, data):
    """Remove campos voláteis (timestamp) pra comparar conteúdo real."""
    if hasattr(upd, "strip_update_only"):
        return upd.strip_update_only(data)
    import copy
    clone = copy.deepcopy(data)
    clone.get("meta", {}).pop("ultima_atualizacao", None)
    return clone


def main():
    if len(sys.argv) != 4:
        print("Uso: python update_data_safe.py <importador.py> <pasta_planilhas> <repo_dir>")
        sys.exit(2)

    importer_path, spreadsheets_dir, repo_dir = (Path(a) for a in sys.argv[1:4])
    for path, label in [
        (importer_path, "importador"),
        (spreadsheets_dir, "pasta de planilhas"),
        (repo_dir, "repo"),
    ]:
        if not path.exists():
            print(f"ERRO: {label} nao encontrado: {path}")
            sys.exit(1)

    base_json = repo_dir / "data" / "financeiro.json"
    if not base_json.exists():
        print(f"ERRO: nao achei {base_json}")
        sys.exit(1)

    upd = load_importer(importer_path)

    old = json.loads(base_json.read_text(encoding="utf-8"))
    data, xlsx_files = upd.generate_data(base_json, spreadsheets_dir)  # NÃO escreve nada

    changed = strip_volatile(upd, old) != strip_volatile(upd, data)
    planilhas = ", ".join(p.name for p in xlsx_files)

    if changed:
        base_json.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("RESULT: CHANGED")
        print("Planilhas processadas: " + planilhas)
        print("financeiro.json atualizado. Proximo: npm run prepare-dashboard && npm run build:prod && npm run qa")
    else:
        print("RESULT: NO_CHANGE")
        print("Planilhas lidas: " + planilhas)
        print("Nenhuma mudanca real nos dados (so o timestamp mudaria). Nada foi escrito.")


if __name__ == "__main__":
    main()
