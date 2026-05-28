import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const dataPath = path.join(repoRoot, 'data', 'financeiro.json');
const payload = JSON.parse(await fs.readFile(dataPath, 'utf8'));
const fluxo = payload.fluxo_caixa || {};
const fixed = payload.custos_fixos || {};

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const PERIODS = {
  year: ALL_MONTHS,
  realized: [1, 2, 3, 4, 5, 6],
  projection: [7, 8, 9, 10, 11, 12],
  q1: [1, 2, 3],
  q2: [4, 5, 6],
  q3: [7, 8, 9],
  q4: [10, 11, 12],
  h1: [1, 2, 3, 4, 5, 6],
  h2: [7, 8, 9, 10, 11, 12]
};

for (const month of ALL_MONTHS) {
  PERIODS[`m${month}`] = [month];
}

function normalizeMonths(months) {
  return [...new Set(months.map(Number).filter(m => m >= 1 && m <= 12))].sort((a, b) => a - b);
}

function keyFor(months) {
  return normalizeMonths(months).join(',');
}

function aggregate(months) {
  const normalized = normalizeMonths(months);
  const entradas = normalized.reduce((sum, month) => sum + Number(fluxo.monthly?.[month]?.entradas || 0), 0);
  const saidas = normalized.reduce((sum, month) => sum + Number(fluxo.monthly?.[month]?.saidas || 0), 0);
  const resultado = entradas - saidas;
  return {
    entradas,
    saidas,
    resultado,
    margem: entradas > 0 ? resultado / entradas * 100 : 0
  };
}

function categoryBreakdown(months) {
  const normalized = normalizeMonths(months);
  const items = (fluxo.categoryMonthly || fluxo.categories || [])
    .map(category => {
      const value = normalized.reduce((sum, month) => sum + Number(category.months?.[month] || category.months?.[String(month)] || 0), 0);
      return { name: category.name, value };
    })
    .filter(item => item.value > 0.01)
    .sort((a, b) => b.value - a.value);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return items.map(item => ({
    ...item,
    pct: total > 0 ? item.value / total * 100 : 0
  }));
}

function fixedTotals(months) {
  const normalized = normalizeMonths(months);
  const projectionOnly = normalized.every(month => month >= 7);
  return (fixed.items || []).reduce((acc, item) => {
    for (const month of normalized) {
      const row = item.months?.[month - 1] || [0, 0, 0, 0];
      acc.est += Number(row[0] || 0);
      acc.real += Number(row[1] || 0);
      acc.diff += Number(row[2] || 0);
      acc.basis += projectionOnly ? Number(row[0] || 0) : (month <= 6 ? Number(row[1] || 0) : Number(row[0] || 0));
    }
    return acc;
  }, { est: 0, real: 0, diff: 0, basis: 0 });
}

const periodAliases = {};
const aggregates = {};
const categoryBreakdowns = {};
const fixedPeriodTotals = {};

for (const [name, months] of Object.entries(PERIODS)) {
  const key = keyFor(months);
  periodAliases[name] = key;
  aggregates[key] = aggregate(months);
  categoryBreakdowns[key] = categoryBreakdown(months);
  fixedPeriodTotals[key] = fixedTotals(months);
}

const monthCategoryBreakdown = {};
for (const month of ALL_MONTHS) {
  monthCategoryBreakdown[String(month)] = categoryBreakdown([month]);
}

fluxo.precomputed = {
  version: '20260528-phase4',
  generated_at: payload.meta?.ultima_atualizacao || null,
  periodAliases,
  aggregates,
  categoryBreakdown: categoryBreakdowns,
  monthCategoryBreakdown
};

fixed.precomputed = {
  version: '20260528-phase4',
  generated_at: payload.meta?.ultima_atualizacao || null,
  periodAliases,
  periodTotals: fixedPeriodTotals
};

payload.fluxo_caixa = fluxo;
payload.custos_fixos = fixed;

await fs.writeFile(dataPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Precomputed dashboard data written to ${path.relative(repoRoot, dataPath)}`);
