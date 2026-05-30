#!/usr/bin/env python3
"""Wrapper seguro de atualização de dados do Marconi Foods Dashboard.

Reaproveita generate_data() do importador original (.codex_check_scripts/update_marconi_data.py)
e grava SOMENTE data/financeiro.json. NÃO mexe no index.html nem reintroduz o bloco
<script id="embedded-data"> (que foi removido da arquitetura atual). Depois rode o
precompute/build/qa normalmente — o precompute revalida o JSON.

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

    # Carrega o importador original como modulo e usa a logica boa (generate_data),
    # que NAO toca no index.html / embedded-data.
    spec = importlib.util.spec_from_file_location("marconi_importer", str(importer_path))
    upd = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(upd)

    base_json = repo_dir / "data" / "financeiro.json"
    if not base_json.exists():
        print(f"ERRO: nao achei {base_json}")
        sys.exit(1)

    data, xlsx_files = upd.generate_data(base_json, spreadsheets_dir)

    # Grava SO o financeiro.json. O precompute revalida em seguida.
    out = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    base_json.write_text(out, encoding="utf-8")

    print("financeiro.json atualizado a partir de: " + ", ".join(p.name for p in xlsx_files))
    print("Proximo passo: npm run prepare-dashboard && npm run build:prod && npm run qa")
    print("Commitar SO se houver mudanca real (git diff --ignore-all-space -- data/financeiro.json).")


if __name__ == "__main__":
    main()
