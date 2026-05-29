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

function fail(message) {
  throw new Error(`[precompute] ERRO: ${message}`);
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function assertObject(value, pathLabel) {
  if (!isObject(value)) fail(`${pathLabel} invalido ou ausente`);
}

function assertText(value, pathLabel) {
  if (typeof value !== 'string' || !value.trim()) fail(`${pathLabel} invalido ou ausente`);
}

function assertFiniteNumber(value, pathLabel) {
  if (!Number.isFinite(Number(value))) fail(`${pathLabel} invalido`);
}

function monthlyRow(month) {
  return fluxo.monthly?.[month] || fluxo.monthly?.[String(month)];
}

function validateFluxoCaixa() {
  assertObject(fluxo, 'fluxo_caixa');
  assertObject(fluxo.monthly, 'fluxo_caixa.monthly');
  for (const month of ALL_MONTHS) {
    const row = monthlyRow(month);
    assertObject(row, `fluxo_caixa.monthly[${month}]`);
    assertText(row.name, `fluxo_caixa.monthly[${month}].name`);
    assertFiniteNumber(row.entradas, `fluxo_caixa.monthly[${month}].entradas`);
    assertFiniteNumber(row.saidas, `fluxo_caixa.monthly[${month}].saidas`);
    assertFiniteNumber(row.resultado, `fluxo_caixa.monthly[${month}].resultado`);
    const expected = Number(row.entradas) - Number(row.saidas);
    if (Math.abs(expected - Number(row.resultado)) > 0.02) {
      fail(`fluxo_caixa.monthly[${month}].resultado inconsistente`);
    }
  }

  const categories = fluxo.categoryMonthly || fluxo.categories;
  if (!Array.isArray(categories) || !categories.length) fail('fluxo_caixa.categories vazio');
  categories.forEach((category, index) => {
    assertObject(category, `fluxo_caixa.categories[${index}]`);
    assertText(category.name, `fluxo_caixa.categories[${index}].name`);
    assertObject(category.months, `fluxo_caixa.categories[${index}].months`);
    for (const month of ALL_MONTHS) {
      assertFiniteNumber(category.months[month] ?? category.months[String(month)] ?? 0, `fluxo_caixa.categories[${index}].months[${month}]`);
    }
    if ('value' in category) assertFiniteNumber(category.value, `fluxo_caixa.categories[${index}].value`);
  });
}

function validateCustosFixos() {
  assertObject(fixed, 'custos_fixos');
  if (!Array.isArray(fixed.items) || !fixed.items.length) fail('custos_fixos.items vazio');
  fixed.items.forEach((item, index) => {
    assertObject(item, `custos_fixos.items[${index}]`);
    assertText(item.name, `custos_fixos.items[${index}].name`);
    assertText(item.group, `custos_fixos.items[${index}].group`);
    if (!Array.isArray(item.months) || item.months.length < 12) fail(`custos_fixos.items[${index}].months invalido`);
    for (const monthIndex of ALL_MONTHS.map(month => month - 1)) {
      const row = item.months[monthIndex];
      if (!Array.isArray(row) || row.length < 3) fail(`custos_fixos.items[${index}].months[${monthIndex}] invalido`);
      assertFiniteNumber(row[0], `custos_fixos.items[${index}].months[${monthIndex}][0]`);
      assertFiniteNumber(row[1], `custos_fixos.items[${index}].months[${monthIndex}][1]`);
      assertFiniteNumber(row[2], `custos_fixos.items[${index}].months[${monthIndex}][2]`);
      if (row.length > 3) assertFiniteNumber(row[3], `custos_fixos.items[${index}].months[${monthIndex}][3]`);
    }
  });
}

function validatePayload() {
  assertObject(payload, 'payload');
  assertObject(payload.meta, 'meta');
  assertText(payload.meta.empresa, 'meta.empresa');
  assertText(payload.meta.periodo, 'meta.periodo');
  assertText(payload.meta.ultima_atualizacao, 'meta.ultima_atualizacao');
  validateFluxoCaixa();
  validateCustosFixos();
  console.log('[precompute] JSON validado com sucesso');
}

function normalizeMonths(months) {
  return [...new Set(months.map(Number).filter(m => m >= 1 && m <= 12))].sort((a, b) => a - b);
}

function keyFor(months) {
  return normalizeMonths(months).join(',');
}

function aggregate(months) {
  const normalized = normalizeMonths(months);
  const entradas = normalized.reduce((sum, month) => sum + Number(monthlyRow(month)?.entradas || 0), 0);
  const saidas = normalized.reduce((sum, month) => sum + Number(monthlyRow(month)?.saidas || 0), 0);
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
  const realizedMonths = normalized.filter(month => month <= 6);
  const projectionOnly = normalized.every(month => month >= 7);
  const rows = Array.isArray(fixed.totals) && fixed.totals.length ? fixed.totals : fixed.items || [];
  return rows.reduce((acc, item) => {
    for (const month of normalized) {
      const row = item.months?.[month - 1] || [0, 0, 0, 0];
      acc.est += Number(row[0] || 0);
      acc.basis += projectionOnly ? Number(row[0] || 0) : (month <= 6 ? Number(row[1] || 0) : Number(row[0] || 0));
    }
    for (const month of realizedMonths) {
      const row = item.months?.[month - 1] || [0, 0, 0, 0];
      acc.real += Number(row[1] || 0);
      acc.diff += Number(row[2] || 0);
    }
    return acc;
  }, { est: 0, real: 0, diff: 0, basis: 0 });
}

validatePayload();

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
  version: '20260528-phase5',
  generated_at: payload.meta?.ultima_atualizacao || null,
  periodAliases,
  aggregates,
  categoryBreakdown: categoryBreakdowns,
  monthCategoryBreakdown
};

fixed.precomputed = {
  version: '20260528-phase5',
  generated_at: payload.meta?.ultima_atualizacao || null,
  periodAliases,
  periodTotals: fixedPeriodTotals
};

payload.fluxo_caixa = fluxo;
payload.custos_fixos = fixed;

await fs.writeFile(dataPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Precomputed dashboard data written to ${path.relative(repoRoot, dataPath)}`);
