# Dashboard Financeiro · Marconi Foods

Dashboard executivo de fluxo de caixa e controle orçamentário desenvolvido para apresentação à diretoria.

## 🌐 Acesso

**URL pública:** https://advisorys.github.io/marconi-dashboard/

## 📊 O que mostra

- **Diretoria** — Visão executiva resumida (saúde, riscos, recomendações)
- **Fluxo de Caixa** — Análise operacional detalhada por mês e categoria  
- **Custos Fixos** — Controle orçamentário real vs orçado

## ⌨️ Atalhos de teclado

| Tecla | Ação |
|-------|------|
| `D` | Diretoria |
| `F` | Fluxo de Caixa |
| `C` | Custos Fixos |
| `S` | Colapsar/expandir painel |
| `←` `→` | Próxima/anterior página |
| `P` | Imprimir / Exportar PDF |
| `?` | Ver ajuda |

## 🔄 Como atualizar os dados

Os dados ficam em `/data/financeiro.json`. Para atualizar:

1. Edite o arquivo `financeiro.json` com os novos números
2. Faça commit e push para a branch `main`
3. GitHub Pages publica automaticamente (~30 segundos)
4. Cliente vê os dados novos no mesmo link

### Estrutura do JSON

```json
{
  "meta": {
    "empresa": "Marconi Foods",
    "periodo": "2026",
    "ultima_atualizacao": "2026-05-25T01:50:00-03:00"
  },
  "fluxo_caixa": { ... },
  "custos_fixos": { ... }
}
```

## 🚀 Tecnologia

- HTML5 + CSS3 + JavaScript vanilla (sem build, sem dependências)
- Dados externos via JSON (separação layout/dados)
- Hospedagem: GitHub Pages
- Deploy: automático no push para `main`

## 📁 Estrutura

```
marconi-dashboard/
├── index.html              ← Layout e lógica
├── data/
│   └── financeiro.json     ← Dados (atualizar este arquivo)
└── README.md               ← Esta documentação
```

## ⚖️ Confidencialidade

Os dados aqui são de uso interno e estritamente confidenciais.
Não compartilhe o link com terceiros não autorizados.

---

**Consultoria:** Felipe — Consultoria Financeira  
**Versão:** 1.0 (MVP)  
**Última atualização:** Maio/2026
