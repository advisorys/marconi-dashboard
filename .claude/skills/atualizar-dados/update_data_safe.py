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
  python update_data_safe.py <importador.py> <pasta_planilhas> <repo_dir> [--debug-diff]

Os caminhos são passados por argumento (não hardcode). Os caminhos reais desta máquina
ficam no slash command local .claude/commands/atualizar-dados.md (não versionado).
--debug-diff: se houver CHANGED, lista as diferenças reais de dado e sai sem escrever.
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
    """Remove TODOS os campos voláteis (timestamps) pra comparar só o conteúdo real.

    O precompute injeta 3 timestamps que NÃO indicam mudança de dado:
      - meta.ultima_atualizacao
      - fluxo_caixa.precomputed.generated_at
      - custos_fixos.precomputed.generated_at
    Antes, este wrapper delegava ao strip_update_only do importador, que só removia o 1º —
    por isso reportava CHANGED em runs sem mudança real (ruído de timestamp). Agora removemos
    os 3 explicitamente, depois de (opcionalmente) aplicar o strip do importador.
    """
    import copy
    clone = copy.deepcopy(data)
    if hasattr(upd, "strip_update_only"):
        try:
            clone = copy.deepcopy(upd.strip_update_only(data))
        except Exception:
            clone = copy.deepcopy(data)
    clone.get("meta", {}).pop("ultima_atualizacao", None)
    # A seção `precomputed` é DERIVADA (recalculada pelo precompute-data.mjs depois).
    # O JSON publicado já a tem; o recém-gerado pelo importador ainda NÃO. Compará-las
    # daria sempre CHANGED (SO-VELHO). Removemos a seção inteira dos dois lados — o que
    # importa é a mudança nos dados-FONTE (monthly, categorias, custos, reconciliation).
    for sec in ("fluxo_caixa", "custos_fixos"):
        node = clone.get(sec)
        if isinstance(node, dict):
            node.pop("precomputed", None)
    return _canon_numbers(clone)


def _canon_numbers(obj):
    """Normaliza a REPRESENTAÇÃO dos números pra comparar só o VALOR.

    O importador às vezes serializa o mesmo número como int (`0`) ou float (`0.0`),
    e às vezes com microcaudas de ponto-flutuante. Isso gerava milhares de diffs de
    'tipo' (sem mudança de valor) que faziam o wrapper reportar CHANGED por engano.
    Arredondamos todo número a 2 casas e normalizamos -0.0 -> 0.0, recursivamente.
    """
    if isinstance(obj, bool):
        return obj
    if isinstance(obj, int):
        return round(float(obj), 2)
    if isinstance(obj, float):
        r = round(obj, 2)
        return 0.0 if r == 0 else r
    if isinstance(obj, list):
        return [_canon_numbers(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _canon_numbers(v) for k, v in obj.items()}
    return obj


def main():
    pos = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(pos) != 3:
        print("Uso: python update_data_safe.py <importador.py> <pasta_planilhas> <repo_dir> [--debug-diff]")
        sys.exit(2)

    importer_path, spreadsheets_dir, repo_dir = (Path(a) for a in pos)
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

    # Comparação robusta: remove timestamps voláteis, normaliza representação numérica
    # (int/float, microcaudas) e serializa de forma canônica (sort_keys). Assim CHANGED
    # só dispara em mudança REAL de valor/estrutura — não em ruído de serialização.
    canon_old = json.dumps(strip_volatile(upd, old), sort_keys=True, ensure_ascii=False)
    canon_new = json.dumps(strip_volatile(upd, data), sort_keys=True, ensure_ascii=False)
    changed = canon_old != canon_new
    planilhas = ", ".join(p.name for p in xlsx_files)

    if "--debug-diff" in sys.argv and changed:
        # Diagnóstico: lista os diffs que sobrevivem ao strip+canon (mudança real de dado).
        so = strip_volatile(upd, old)
        sn = strip_volatile(upd, data)
        def _dp(a, b, p="", o=None):
            if o is None: o = []
            if isinstance(a, dict) and isinstance(b, dict):
                for k in set(list(a) + list(b)):
                    if k not in a: o.append(p + "/" + str(k) + " SO-NOVO")
                    elif k not in b: o.append(p + "/" + str(k) + " SO-VELHO")
                    else: _dp(a[k], b[k], p + "/" + str(k), o)
            elif isinstance(a, list) and isinstance(b, list):
                if len(a) != len(b): o.append(p + " LEN %d!=%d" % (len(a), len(b)))
                else:
                    for i in range(len(a)): _dp(a[i], b[i], p + "[%d]" % i, o)
            else:
                if a != b: o.append("%s  %r -> %r" % (p, a, b))
            return o
        diffs = _dp(so, sn)
        print("DEBUG: %d diffs reais (mudanca de dado) apos strip+canon:" % len(diffs))
        for x in diffs[:30]:
            print("  ", x)
        sys.exit(0)

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
