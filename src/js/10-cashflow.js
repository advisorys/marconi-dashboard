/* ===== script-4 ===== */
const DATA = window.__DATA__ || {};
const PRECOMPUTED = DATA.precomputed || {};


// ═══════════════════════════════════════════════════════════════
// FLUXO DE CAIXA 2026 · INTERACTIVE DASHBOARD · REV. COMPACTA
// ═══════════════════════════════════════════════════════════════

// ─── STATE ───
const ALL_MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const REAL_MONTHS = ALL_MONTHS.filter(m => !isProjectionMonth(m));
const PROJ_MONTHS = ALL_MONTHS.filter(m => isProjectionMonth(m));
let selectedMonths = [...ALL_MONTHS];
let activePeriodMode = 'year'; // year | realized | projection | custom
let selectedFlow = 'both'; // both | entradas | saidas
let selectedCategoryName = null;
let selectedCategoryColor = '#6366F1';
let selectedMonthDetail = null;
let dailyMonthView = 1;

const MONTH_NAMES_LONG = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_NAMES_SHORT = ['', 'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// ─── FORMATTERS ───
const fmtMoney = window.MarconiFormat?.moneyShort || ((v) => {
  if (Math.abs(v) >= 1000000) return (v >= 0 ? 'R$ ' : '-R$ ') + (Math.abs(v) / 1000000).toFixed(2) + 'M';
  if (Math.abs(v) >= 1000) return (v >= 0 ? 'R$ ' : '-R$ ') + (Math.abs(v) / 1000).toFixed(0) + 'K';
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
});
const BRL_FULL_FORMATTER = window.MarconiFormat?.BRL_FULL_FORMATTER || new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRL_EXACT_FORMATTER = window.MarconiFormat?.BRL_EXACT_FORMATTER || new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoneyFull = window.MarconiFormat?.moneyFull || ((v) => BRL_FULL_FORMATTER.format(v));
const fmtMoneyExact = window.MarconiFormat?.moneyExact || ((v) => BRL_EXACT_FORMATTER.format(v));
const fmtPct = window.MarconiFormat?.pct || ((v) => (Number.isFinite(v) ? v.toFixed(1) : '0.0') + '%');

// ─── HELPERS ───
function isProjectionMonth(m) { return window.MarconiFormat ? window.MarconiFormat.isProjectionMonth(m) : (Number(m) >= 7); }
function isPartialMonth(m) { return window.MarconiFormat && window.MarconiFormat.isPartialMonth ? window.MarconiFormat.isPartialMonth(m) : false; }
// (D2) Há DADO de projeção? Hoje o Bling só traz realizado → meses 7–12 vêm todos zerados.
// Quando não há nenhum valor de projeção, o aparato de "Projeção" (atalho, divisor REAL|PROJEÇÃO,
// rótulo "2026 completo") é ESCONDIDO e o ano vira "Acumulado realizado" — para a UI não exibir
// "Projeção" como R$0 sem explicação. Se um forecast for alimentado no JSON, o aparato volta sozinho.
function hasProjectionData() {
  try {
    if (!DATA.monthly) return false;
    return PROJ_MONTHS.some(m => {
      const d = DATA.monthly[m];
      return d && ((Number(d.entradas) || 0) !== 0 || (Number(d.saidas) || 0) !== 0);
    });
  } catch (e) { return false; }
}
// Realizado FECHADO = realizado e não-parcial (ex.: Jun é parcial → fora da base de comparação).
function isClosedRealizedMonth(m) { return !isProjectionMonth(m) && !isPartialMonth(m); }
function normalizeMonths(months) {
  const uniq = [...new Set(months.map(Number).filter(m => m >= 1 && m <= 12))].sort((a, b) => a - b);
  return uniq.length ? uniq : [...ALL_MONTHS];
}
function sameMonths(a, b) {
  const x = normalizeMonths(a), y = normalizeMonths(b);
  return x.length === y.length && x.every((m, i) => m === y[i]);
}
function hasFlow(flow) { return selectedFlow === 'both' || selectedFlow === flow; }
function setFlow(flow) {
  selectedFlow = (selectedFlow === flow && flow !== 'both') ? 'both' : flow;
  applyFilter();
}

function setSelectedMonths(months, mode = 'custom') {
  const normalized = normalizeMonths(months);
  if (!normalized.length) {
    selectedMonths = [...ALL_MONTHS];
    activePeriodMode = 'year';
  } else {
    selectedMonths = normalized;
    activePeriodMode = mode;
  }
  dailyMonthView = selectedMonths.length === 1 ? selectedMonths[0] : selectedMonths.find(m => !isProjectionMonth(m)) || selectedMonths[0];
}
function toggleMonth(m) {
  m = Number(m);
  // Ao sair de um atalho (2026/Realizado/Projeção), o primeiro clique em mês cria uma seleção personalizada nova.
  // Isso evita ter que desmarcar todos os meses manualmente.
  if (activePeriodMode !== 'custom') {
    setSelectedMonths([m], 'custom');
    return;
  }
  let next = selectedMonths.includes(m) ? selectedMonths.filter(x => x !== m) : [...selectedMonths, m];
  if (!next.length) next = [m];
  setSelectedMonths(next, 'custom');
}
function selectPeriod(kind) {
  // (D2) Sem dado de projeção, o atalho "projeção" cai no realizado e "ano" só agrega o realizado.
  if (kind === 'projection') {
    if (hasProjectionData()) setSelectedMonths(PROJ_MONTHS, 'projection');
    else setSelectedMonths(REAL_MONTHS, 'realized');
  } else if (kind === 'realized') {
    setSelectedMonths(REAL_MONTHS, 'realized');
  } else {
    // "ano": com projeção = jan–dez (real+proj); sem projeção = só meses realizados.
    setSelectedMonths(hasProjectionData() ? ALL_MONTHS : REAL_MONTHS, 'year');
  }
}
function getActivePeriod() {
  const months = normalizeMonths(selectedMonths);
  const projData = hasProjectionData();
  let label, short;
  if (activePeriodMode === 'year') {
    // Sem projeção, o "ano" é só realizado → rotular honestamente como acumulado realizado.
    label = projData ? '2026 completo' : 'Acumulado realizado';
    short = projData ? '2026' : 'ACUM. REAL';
  } else if (activePeriodMode === 'realized') {
    label = 'Realizado'; short = 'REALIZADO';
  } else if (activePeriodMode === 'projection') {
    label = 'Projeção'; short = 'PROJEÇÃO';
  } else if (months.length === 1) {
    label = MONTH_NAMES_LONG[months[0]]; short = MONTH_NAMES_SHORT[months[0]];
  } else {
    short = months.length > 4 ? `${months.length} MESES` : months.map(m => MONTH_NAMES_SHORT[m]).join(' + ');
    label = months.map(m => MONTH_NAMES_SHORT[m]).join(' + ');
  }
  return { months, label, short, mode: activePeriodMode, includesProjection: months.some(isProjectionMonth) };
}
// Rótulo dinâmico do intervalo de meses (deriva do último mês realizado via selo, não hardcode).
function rangeLabelShort(months) {
  const ms = normalizeMonths(months);
  if (!ms.length) return '—';
  const a = ms[0], b = ms[ms.length - 1];
  return a === b ? MONTH_NAMES_SHORT[a] : `${MONTH_NAMES_SHORT[a]} — ${MONTH_NAMES_SHORT[b]}`;
}
function rangeLabelLong(months) {
  const ms = normalizeMonths(months);
  if (!ms.length) return '—';
  const a = ms[0], b = ms[ms.length - 1];
  return a === b ? MONTH_NAMES_LONG[a] : `${MONTH_NAMES_LONG[a]} — ${MONTH_NAMES_LONG[b]}`;
}
function realizedRangeShort() { return rangeLabelShort(REAL_MONTHS); }
function projectionRangeShort() { return rangeLabelShort(PROJ_MONTHS); }
function getRealPeriod() {
  const lng = rangeLabelLong(REAL_MONTHS);
  return { months: [...REAL_MONTHS], label: lng, short: realizedRangeShort() };
}

function periodLabelFor(months, mode = activePeriodMode) {
  months = normalizeMonths(months);
  if (mode === 'year') return hasProjectionData() ? '2026 · REAL + PROJEÇÃO' : `${realizedRangeShort()} / 2026 · ACUMULADO REALIZADO`;
  if (mode === 'realized') return `${realizedRangeShort()} / 2026 · REALIZADO`;
  if (mode === 'projection') return `${projectionRangeShort()} / 2026 · PROJEÇÃO`;
  if (months.length === 1) return `${MONTH_NAMES_SHORT[months[0]]} / 2026${isProjectionMonth(months[0]) ? ' · PROJEÇÃO' : ' · REALIZADO'}`;
  const hasReal = months.some(m => !isProjectionMonth(m));
  const hasProj = months.some(isProjectionMonth);
  const suffix = hasReal && hasProj ? ' · REAL + PROJEÇÃO' : (hasProj ? ' · PROJEÇÃO' : ' · REALIZADO');
  return `${months.map(m => MONTH_NAMES_SHORT[m]).join(' + ')} / 2026${suffix}`;
}

function precomputedMonthsKey(months) {
  return normalizeMonths(months).join(',');
}
function aggregate(months) {
  months = normalizeMonths(months);
  const cached = PRECOMPUTED.aggregates && PRECOMPUTED.aggregates[precomputedMonthsKey(months)];
  if (cached) {
    return {
      entradas: Number(cached.entradas || 0),
      saidas: Number(cached.saidas || 0),
      resultado: Number(cached.resultado || 0),
      margem: Number(cached.margem || 0),
      months
    };
  }
  const entradas = months.reduce((s, m) => s + DATA.monthly[m].entradas, 0);
  const saidas = months.reduce((s, m) => s + DATA.monthly[m].saidas, 0);
  return { entradas, saidas, resultado: entradas - saidas, margem: entradas > 0 ? (entradas - saidas) / entradas * 100 : 0, months };
}

function fmtDeltaAbs(v) {
  if (!Number.isFinite(v)) return '—';
  return (v >= 0 ? '+' : '') + fmtMoney(v).replace('R$ ', 'R$ ');
}
function fmtDeltaPct(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || Math.abs(previous) < 0.01) return '—';
  return (current - previous >= 0 ? '+' : '') + fmtPct(((current - previous) / Math.abs(previous)) * 100);
}
function monthCategoryBreakdown(month) {
  const cached = PRECOMPUTED.monthCategoryBreakdown && PRECOMPUTED.monthCategoryBreakdown[String(month)];
  if (Array.isArray(cached)) {
    return cached.map(c => ({
      name: c.name,
      value: Number(c.value || 0),
      pct: Number(c.pct || 0)
    }));
  }
  const items = (DATA.categoryMonthly || DATA.categories).map(c => ({
    name: c.name,
    value: c.months ? (Number(c.months[month]) || 0) : 0
  })).filter(c => c.value > 0.01).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, c) => s + c.value, 0);
  return items.map(c => ({ ...c, pct: total > 0 ? c.value / total * 100 : 0 }));
}
function getMonthCriticalReading(m) {
  const d = DATA.monthly[m];
  const prev = m > 1 ? DATA.monthly[m - 1] : null;
  const cats = monthCategoryBreakdown(m);
  const top = cats[0];
  const resultText = d.resultado >= 0 ? `gerou caixa líquido de <strong>${fmtMoneyFull(d.resultado)}</strong>` : `consumiu caixa líquido de <strong>${fmtMoneyFull(Math.abs(d.resultado))}</strong>`;
  const topText = top ? `A principal rubrica de saída foi <strong>${top.name}</strong>, com <strong>${fmtMoneyFull(top.value)}</strong>, equivalente a <strong>${fmtPct(top.pct)}</strong> das saídas classificadas do mês.` : 'Não houve saída classificada por categoria no mês.';
  const prevText = prev ? `Contra ${MONTH_NAMES_LONG[m-1]}, o resultado variou <strong>${fmtDeltaAbs(d.resultado - prev.resultado)}</strong> (${fmtDeltaPct(d.resultado, prev.resultado)}).` : 'Janeiro é o primeiro mês da série, sem base mensal anterior.';
  return `${MONTH_NAMES_LONG[m]} ${resultText}. ${topText} ${prevText}`;
}

function getCategoryBreakdown(months) {
  months = normalizeMonths(months);
  const cached = PRECOMPUTED.categoryBreakdown && PRECOMPUTED.categoryBreakdown[precomputedMonthsKey(months)];
  if (Array.isArray(cached)) {
    return cached.map(c => ({
      name: c.name,
      value: Number(c.value || 0),
      pct: Number(c.pct || 0)
    }));
  }
  const items = (DATA.categoryMonthly || DATA.categories).map(c => {
    const value = months.reduce((sum, m) => sum + (c.months ? (c.months[m] || 0) : 0), 0);
    return { name: c.name, value };
  }).filter(c => c.value > 0.01).sort((a, b) => b.value - a.value);
  const total = items.reduce((sum, c) => sum + c.value, 0);
  return items.map(c => ({ ...c, pct: total > 0 ? (c.value / total * 100) : 0 }));
}

function getCategoryByName(name) {
  return (DATA.categoryMonthly || []).find(c => c.name === name) || null;
}
function getCategoryMonthlyRows(category, periodMonths) {
  const selected = new Set(normalizeMonths(periodMonths));
  const monthsData = category && category.months ? category.months : {};
  const rows = ALL_MONTHS.map(m => ({
    month: m,
    value: Number(monthsData[m] || monthsData[String(m)] || 0),
    inPeriod: selected.has(m),
    projection: isProjectionMonth(m)
  }));
  const max = Math.max(...rows.map(r => r.value), 1);
  const periodTotal = rows.filter(r => r.inPeriod).reduce((s, r) => s + r.value, 0);
  const yearTotal = rows.reduce((s, r) => s + r.value, 0);
  return { rows, max, periodTotal, yearTotal };
}

function categoryConcentrationInsight(rows, total) {
  const activeRows = rows.filter(r => r.value > 0.01).sort((a, b) => b.value - a.value);
  if (!total || !activeRows.length) return 'Sem movimentação anual registrada para esta categoria.';
  if (activeRows.length === 1) {
    const r = activeRows[0];
    return `Movimentação concentrada em <strong>${MONTH_NAMES_LONG[r.month]}</strong>, com <strong>${fmtMoneyFull(r.value)}</strong>, equivalente a <strong>${fmtPct(r.value / total * 100)}</strong> do total anual da categoria.`;
  }
  const top = activeRows.slice(0, 2);
  const topTotal = top.reduce((s, r) => s + r.value, 0);
  return `Maior concentração em <strong>${top.map(r => MONTH_NAMES_LONG[r.month]).join(' e ')}</strong>: <strong>${fmtMoneyFull(topTotal)}</strong>, equivalente a <strong>${fmtPct(topTotal / total * 100)}</strong> do total anual da categoria.`;
}
function selectCategory(name, color) {
  if (selectedCategoryName === name) {
    selectedCategoryName = null;
  } else {
    selectedCategoryName = name;
    selectedCategoryColor = color || '#6366F1';
  }
  renderRanking();
  renderCategoryDetail();
}
function formatSmallResult(v) {
  const abs = Math.abs(v);
  if (abs >= 1000000) return (v >= 0 ? '+' : '-') + (abs / 1000000).toFixed(2) + 'M';
  if (abs >= 1000) return (v >= 0 ? '+' : '-') + (abs / 1000).toFixed(0) + 'K';
  return (v >= 0 ? '+' : '-') + abs.toFixed(0);
}

// ─── COUNTER ANIMATION ───
function animateCount(el) {
  if (!el || el.dataset.counting === '1') return;
  el.dataset.counting = '1';
  const rawTarget = parseFloat(el.dataset.countTo || '0');
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const divisor = parseFloat(el.dataset.divisor) || 1;
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  const duration = 900;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = (Math.abs(rawTarget) * ease) / divisor;
    el.textContent = prefix + val.toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(step);
    else el.dataset.counting = '0';
  }
  requestAnimationFrame(step);
}
function setAnimatedValue(el, target, prefix, divisor, suffix, decimals) {
  if (!el) return;
  el.dataset.countTo = Math.abs(target);
  el.dataset.prefix = prefix;
  el.dataset.divisor = divisor;
  el.dataset.suffix = suffix;
  el.dataset.decimals = decimals;
  el.dataset.counting = '0';
  animateCount(el);
}

// ─── STATUS SEAL (E1) — número-chave do Fluxo = resultado do período ───
function renderCashSeal() {
  if (!window.MarconiSeal) return;
  const period = getActivePeriod();
  const agg = aggregate(period.months);
  const res = agg.resultado;
  let tone, verdict;
  if (res < 0) { tone = 'risk'; verdict = 'DÉFICIT'; }
  else if (agg.margem < 1.5) { tone = 'watch'; verdict = 'APERTADO'; }
  else { tone = 'good'; verdict = 'SUPERAVITÁRIO'; }
  window.MarconiSeal.render('cashStatusSeal', {
    label: 'STATUS DO FLUXO · ' + period.short,
    verdict: verdict,
    tone: tone,
    metricValue: (res >= 0 ? '+' : '') + fmtMoneyFull(res),
    metricLabel: 'resultado do período · margem ' + fmtPct(agg.margem),
    desc: res >= 0
      ? 'O período gerou caixa líquido. Caixa de competência é tratado na DRE.'
      : 'O período consumiu caixa líquido — revisar calendário de pagamentos e recebíveis.'
  });
}

// ─── KPI CARDS ───
function renderKPIs() {
  const period = getActivePeriod();
  const agg = aggregate(period.months);
  const isSingleMonth = period.months.length === 1;
  const sparkMonths = REAL_MONTHS;
  const inMax = Math.max(...sparkMonths.map(m => DATA.monthly[m].entradas), 1);
  const outMax = Math.max(...sparkMonths.map(m => DATA.monthly[m].saidas), 1);
  const resMax = Math.max(...sparkMonths.map(m => DATA.monthly[m].resultado));
  const resMin = Math.min(...sparkMonths.map(m => DATA.monthly[m].resultado));

  const sparkInPoints = sparkMonths.map((m, i) => `${(i * 100 / (sparkMonths.length - 1))},${32 - (DATA.monthly[m].entradas / inMax) * 28}`).join(' ');
  const sparkOutPoints = sparkMonths.map((m, i) => `${(i * 100 / (sparkMonths.length - 1))},${32 - (DATA.monthly[m].saidas / outMax) * 28}`).join(' ');
  const sparkResPoints = sparkMonths.map((m, i) => {
    const range = resMax - resMin || 1;
    const v = (DATA.monthly[m].resultado - resMin) / range;
    return `${(i * 100 / (sparkMonths.length - 1))},${32 - v * 28}`;
  }).join(' ');

  // "Melhor Mês Realizado" só considera meses realizados FECHADOS (exclui parcial, ex.: Jun em andamento).
  const bestBasis = period.months.filter(isClosedRealizedMonth);
  const bestFallback = REAL_MONTHS.filter(isClosedRealizedMonth);
  const bestMonths = bestBasis.length ? bestBasis : (bestFallback.length ? bestFallback : REAL_MONTHS);
  const bestM = bestMonths.reduce((acc, m) => DATA.monthly[m].resultado > DATA.monthly[acc].resultado ? m : acc, bestMonths[0]);
  const bestVal = DATA.monthly[bestM].resultado;
  const ctxLabel = period.months.length === 1
    ? `MÊS: ${period.short} / 2026${isProjectionMonth(period.months[0]) ? ' · ◌ PROJEÇÃO' : ' · REALIZADO'}`
    : `PERÍODO: ${periodLabelFor(period.months, period.mode)}`;
  document.getElementById('kpiContext').textContent = ctxLabel;

  const kpis = [
    { cls:'indigo', icon:'<path d="M12 19V5M5 12l7-7 7 7"/>', label:'TOTAL ENTRADAS', value:agg.entradas, sub:fmtMoneyFull(agg.entradas), spark:sparkInPoints, sparkColor:'#6366F1', trend:'up', trendText:`▲ ${period.months.length} mês(es) selecionado(s)` },
    { cls:'cyan', icon:'<path d="M12 5v14M5 12l7 7 7-7"/>', label:'TOTAL SAÍDAS', value:agg.saidas, sub:fmtMoneyFull(agg.saidas), spark:sparkOutPoints, sparkColor:'#06B6D4', trend:'down', trendText:agg.entradas ? `${((agg.saidas / agg.entradas) * 100).toFixed(1)}% das entradas` : 'Sem entradas no período' },
    { cls:'gold', icon:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', label:'RESULTADO LÍQUIDO', value:agg.resultado, sub:`Margem de ${fmtPct(agg.margem)}`, spark:sparkResPoints, sparkColor:'#FCD34D', trend:agg.resultado >= 0 ? 'up' : 'down', trendText:agg.resultado >= 0 ? '▲ Operação superavitária' : '▼ Operação deficitária', gold:true },
    { cls:'green', icon:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', label:isSingleMonth ? 'MARGEM DO MÊS' : 'MELHOR MÊS REALIZADO', value:isSingleMonth ? agg.margem : bestVal, sub:isSingleMonth ? `${period.label} / 2026` : `${MONTH_NAMES_LONG[bestM]} / 2026`, spark:sparkResPoints, sparkColor:'#10B981', trend:isSingleMonth ? (agg.margem >= 0 ? 'up' : 'down') : 'up', trendText:isSingleMonth ? `${agg.margem >= 0 ? 'Resultado positivo' : 'Atenção: margem negativa'}` : `Resultado de ${fmtMoney(bestVal)}`, isMargin:isSingleMonth }
  ];

  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = kpis.map((k, i) => {
    const isMargin = !!k.isMargin;
    const prefix = isMargin ? '' : (k.value < 0 ? '-R$ ' : 'R$ ');
    const divisor = isMargin ? 1 : 1000000;
    const suffix = isMargin ? '%' : 'M';
    const decimals = isMargin ? 1 : 2;
    return `<div class="kpi-card ${k.cls}">
      <div class="icon-circle"><svg viewBox="0 0 24 24">${k.icon}</svg></div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.gold ? 'number-gold' : ''}" data-count-to="${Math.abs(k.value)}" data-prefix="${prefix}" data-divisor="${divisor}" data-suffix="${suffix}" data-decimals="${decimals}">${prefix}0${suffix}</div>
      <div class="kpi-sub">${k.sub}</div>
      <svg class="kpi-sparkline" viewBox="0 0 100 32" preserveAspectRatio="none"><polyline fill="none" stroke="${k.sparkColor}" stroke-width="2" points="${k.spark}"/></svg>
      <div class="kpi-trend ${k.trend}">${k.trendText}</div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-count-to]').forEach(el => { el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || ''); setTimeout(() => animateCount(el), 60); });
  grid.querySelectorAll('.kpi-card').forEach((el, i) => {
    el.addEventListener('mousemove', (e) => {
      const k = kpis[i];
      const rows = period.months.map(m => {
        const d = DATA.monthly[m];
        let v = k.label.includes('ENTRADAS') ? d.entradas : (k.label.includes('SAÍDAS') ? d.saidas : d.resultado);
        return [MONTH_NAMES_LONG[m], fmtMoneyFull(v)];
      });
      showTip(k.label + ' · ' + period.short, rows, e.clientX, e.clientY);
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      el.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    });
    el.addEventListener('mouseleave', hideTip);
  });
}


// ─── EXECUTIVE SUMMARY + RESULT CHART + ALERTS / v9 ───
function getPeriodAssessmentMonths(period) {
  const months = normalizeMonths(period.months);
  // Base de avaliação = realizados FECHADOS (exclui parcial); cai pra realizados e, em último caso, todos.
  const closed = months.filter(isClosedRealizedMonth);
  if (closed.length) return closed;
  const realized = months.filter(m => !isProjectionMonth(m));
  return realized.length ? realized : months;
}
function getCriticalAlertObjects(period = getActivePeriod()) {
  const months = normalizeMonths(period.months);
  const agg = aggregate(months);
  const cats = getCategoryBreakdown(months);
  const alerts = [];
  // Média/máximo de saídas ignoram meses PARCIAIS (ex.: Jun ~9 dias) p/ não distorcer a base de comparação.
  const outMonths = (() => { const full = months.filter(m => !isPartialMonth(m)); return full.length ? full : months; })();
  const avgOut = outMonths.length ? outMonths.reduce((s,m) => s + DATA.monthly[m].saidas, 0) / outMonths.length : 0;
  const maxOutM = outMonths.reduce((acc,m) => DATA.monthly[m].saidas > DATA.monthly[acc].saidas ? m : acc, outMonths[0]);
  const negatives = months.filter(m => DATA.monthly[m].resultado < 0).sort((a,b) => DATA.monthly[a].resultado - DATA.monthly[b].resultado);
  if (negatives.length) {
    const m = negatives[0], d = DATA.monthly[m];
    alerts.push({
      color:'#EF4444', tag:isProjectionMonth(m) ? 'PROJEÇÃO DEFICITÁRIA' : 'DÉFICIT REALIZADO',
      title:`${MONTH_NAMES_LONG[m]} · ${fmtMoney(d.resultado)}`,
      desc:`${isProjectionMonth(m) ? 'Mês projetado indica consumo de caixa' : 'Mês realizado apresentou consumo líquido de caixa'}: entradas de ${fmtMoneyFull(d.entradas)} contra saídas de ${fmtMoneyFull(d.saidas)}.`
    });
  }
  if (months.length > 1 && avgOut > 0 && DATA.monthly[maxOutM].saidas >= avgOut * 1.25) {
    alerts.push({
      color:'#F59E0B', tag:'SAÍDA ACIMA DA MÉDIA',
      title:`${MONTH_NAMES_LONG[maxOutM]} concentrou desembolsos`,
      desc:`Saídas gerenciais de ${fmtMoneyFull(DATA.monthly[maxOutM].saidas)}, contra média do período de ${fmtMoneyFull(avgOut)}.`
    });
  }
  const topCat = cats[0];
  if (topCat && topCat.pct >= 50) {
    alerts.push({
      color:'#6366F1', tag:'CONCENTRAÇÃO POR RUBRICA',
      title:`${topCat.name} · ${fmtPct(topCat.pct)}`,
      desc:`A principal categoria representa ${fmtMoneyFull(topCat.value)} das saídas gerenciais do período selecionado.`
    });
  }
  if (agg.resultado < 0) {
    alerts.push({
      color:'#EF4444', tag:'RESULTADO DO PERÍODO',
      title:`Consumo líquido de ${fmtMoneyFull(Math.abs(agg.resultado))}`,
      desc:`O período selecionado ficou negativo. Reavaliar calendário de pagamentos, recebíveis e concentração de desembolsos.`
    });
  }
  if (!alerts.length) {
    alerts.push({
      color:'#10B981', tag:'SEM ALERTA CRÍTICO',
      title:'Período com leitura saudável',
      desc:`Resultado positivo de ${fmtMoneyFull(agg.resultado)} e margem de ${fmtPct(agg.margem)} no período selecionado.`
    });
  }
  return alerts.slice(0, 3);
}
function renderExecutiveSummary() {
  const period = getActivePeriod();
  const agg = aggregate(period.months);
  const categories = getCategoryBreakdown(period.months);
  const topCat = categories[0];
  const top3 = categories.slice(0, 3);
  const top3Pct = top3.reduce((s,c) => s + c.pct, 0);
  const resultWord = agg.resultado >= 0 ? 'gerou caixa' : 'consumiu caixa';
  const assessmentMonths = getPeriodAssessmentMonths(period);
  const bestM = assessmentMonths.reduce((acc,m) => DATA.monthly[m].resultado > DATA.monthly[acc].resultado ? m : acc, assessmentMonths[0]);
  const maxOutM = period.months.reduce((acc,m) => DATA.monthly[m].saidas > DATA.monthly[acc].saidas ? m : acc, period.months[0]);
  const top3Label = top3.map(c => c.name).join(', ');
  const container = document.getElementById('executiveSummary');
  const ctx = document.getElementById('executiveContext');
  if (ctx) ctx.textContent = periodLabelFor(period.months, period.mode);
  if (!container) return;
  const principal = `No período selecionado, as entradas somaram <strong>${fmtMoneyFull(agg.entradas)}</strong> e as saídas gerenciais somaram <strong>${fmtMoneyFull(agg.saidas)}</strong>, resultando em <strong class="${agg.resultado >= 0 ? 'number-green' : 'number-red'}">${agg.resultado >= 0 ? '+' : ''}${fmtMoneyFull(agg.resultado)}</strong>. Em termos práticos, o período <strong>${resultWord}</strong>, com margem de <strong>${fmtPct(agg.margem)}</strong>. ${topCat ? `A principal pressão de saída foi <strong>${topCat.name}</strong>, enquanto o top 3 (${top3Label}) concentrou <strong>${fmtPct(top3Pct)}</strong> dos desembolsos gerenciais.` : 'Não há saídas classificadas para este recorte.'}`;
  container.innerHTML = `<div class="executive-card">
      <div class="executive-eyebrow">LEITURA DO PERÍODO</div>
      <div class="executive-title">${agg.resultado >= 0 ? 'Caixa positivo, mas com concentração de saída.' : 'Atenção: período com consumo líquido de caixa.'}</div>
      <div class="executive-text">${principal}</div>
      <div class="executive-metrics">
        <div class="exec-metric"><div class="lbl">MELHOR MÊS DA BASE</div><div class="val number-green">${MONTH_NAMES_SHORT[bestM]}</div></div>
        <div class="exec-metric"><div class="lbl">MAIOR SAÍDA MENSAL</div><div class="val number-gold">${MONTH_NAMES_SHORT[maxOutM]}</div></div>
        <div class="exec-metric"><div class="lbl">TOP 3 SAÍDAS</div><div class="val">${fmtPct(top3Pct)}</div></div>
      </div>
    </div>`;
}
function renderCriticalAlerts() {
  const container = document.getElementById('criticalAlerts');
  if (!container) return;
  const alerts = getCriticalAlertObjects(getActivePeriod());
  container.innerHTML = alerts.map(a => `<div class="critical-alert-card" style="--alert-color:${a.color};"><div class="tag">${a.tag}</div><div class="title">${a.title}</div><div class="desc">${a.desc}</div></div>`).join('');
}

// ─── BAR CHART (MONTHLY) ───
function renderBarChart() {
  const svg = document.getElementById('barChart');
  const months = ALL_MONTHS;
  const showIn = hasFlow('entradas');
  const showOut = hasFlow('saidas');
  const maxVal = Math.max(...months.map(m => Math.max(showIn ? DATA.monthly[m].entradas : 0, showOut ? DATA.monthly[m].saidas : 0)), 1);
  const chartHeight = 320, chartTop = 50, baseY = chartTop + chartHeight, startX = 70, groupSpacing = 90, barGap = 4;
  const visibleCount = (showIn ? 1 : 0) + (showOut ? 1 : 0);
  const barWidth = visibleCount === 1 ? 42 : 28;
  let grid = '';
  for (let i = 0; i <= 5; i++) {
    const y = chartTop + chartHeight - (chartHeight * i / 5);
    const val = (maxVal * i / 5) / 1000000;
    grid += `<line x1="${startX}" y1="${y}" x2="1180" y2="${y}" stroke="#1F2440" stroke-width="1"/>`;
    grid += `<text x="${startX - 12}" y="${y + 4}" text-anchor="end" fill="#5A6580" font-size="11" font-family="Helvetica, Arial">${val.toFixed(1)}M</text>`;
  }
  // (D2) Divisor REAL|PROJEÇÃO só faz sentido quando há dado de projeção; senão é omitido.
  if (hasProjectionData()) {
    const dividerX = startX + 20 + 5.5 * groupSpacing + 28 + barGap / 2;
    grid += `<line x1="${dividerX}" y1="${chartTop}" x2="${dividerX}" y2="${baseY}" stroke="#FCD34D" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
      <text x="${dividerX - 8}" y="${chartTop + 16}" text-anchor="end" fill="#FCD34D" font-size="9" font-weight="700" letter-spacing="2" opacity="0.7">REAL</text>
      <text x="${dividerX + 8}" y="${chartTop + 16}" text-anchor="start" fill="#6366F1" font-size="9" font-weight="700" letter-spacing="2" opacity="0.7">PROJEÇÃO</text>`;
  }
  const defs = `<defs>
    <linearGradient id="barGradIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366F1"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0.7"/></linearGradient>
    <linearGradient id="barGradOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#06B6D4"/><stop offset="100%" stop-color="#0891B2" stop-opacity="0.7"/></linearGradient>
    <linearGradient id="barGradInSel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FCD34D"/><stop offset="100%" stop-color="#F59E0B" stop-opacity="0.8"/></linearGradient>
    <linearGradient id="barGradOutSel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FBBF24"/><stop offset="100%" stop-color="#D97706" stop-opacity="0.7"/></linearGradient>
    <linearGradient id="barGradInProj" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366F1" stop-opacity="0.35"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0.15"/></linearGradient>
    <linearGradient id="barGradOutProj" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#06B6D4" stop-opacity="0.35"/><stop offset="100%" stop-color="#0891B2" stop-opacity="0.15"/></linearGradient>
  </defs>`;
  let bars = '';
  months.forEach((m, i) => {
    const d = DATA.monthly[m];
    const xBase = startX + 20 + i * groupSpacing;
    const groupWidth = visibleCount * barWidth + Math.max(0, visibleCount - 1) * barGap;
    const x = xBase + (60 - groupWidth) / 2;
    const isSelected = selectedMonths.includes(m);
    const isHighlighted = activePeriodMode === 'custom' && isSelected;
    const isDimmed = activePeriodMode !== 'year' && !isSelected;
    const isProj = isProjectionMonth(m);
    const isPartial = !isProj && isPartialMonth(m);
    const cls = isHighlighted ? 'bar-group selected' : (isDimmed ? 'bar-group dim' : 'bar-group')
      + (isPartial ? ' partial' : '');
    const inGrad = isProj ? 'url(#barGradInProj)' : 'url(#barGradIn)';
    const outGrad = isProj ? 'url(#barGradOutProj)' : 'url(#barGradOut)';
    const strokeAttr = isHighlighted ? 'stroke="#FCD34D" stroke-width="2"' : (isProj ? 'stroke="#6366F1" stroke-width="1" stroke-dasharray="3 2"' : '');
    let rects = '', idx = 0;
    if (showIn) {
      const h = (d.entradas / maxVal) * chartHeight;
      rects += `<rect data-flow="entradas" x="${x + idx * (barWidth + barGap)}" y="${baseY - h}" width="${barWidth}" height="${h}" rx="4" fill="${inGrad}" ${strokeAttr}/>`;
      idx++;
    }
    if (showOut) {
      const h = (d.saidas / maxVal) * chartHeight;
      rects += `<rect data-flow="saidas" x="${x + idx * (barWidth + barGap)}" y="${baseY - h}" width="${barWidth}" height="${h}" rx="4" fill="${outGrad}" ${strokeAttr}/>`;
    }
    const labelX = x + groupWidth / 2;
    const monthLbl = MONTH_NAMES_SHORT[m] + (isPartial ? ' ◐' : '');
    const partialMark = isPartial ? `<text x="${labelX}" y="${baseY + 50}" text-anchor="middle" fill="#FCD34D" font-size="8" font-weight="700" letter-spacing="1.5" opacity="0.85">PARCIAL</text>` : '';
    bars += `<g class="${cls}" data-month="${m}">${rects}
      <text x="${labelX}" y="${baseY + 22}" text-anchor="middle" fill="${isHighlighted ? '#FCD34D' : (isProj ? '#94A0B8' : '#FFFFFF')}" font-size="11" font-weight="${isHighlighted ? '700' : '500'}" letter-spacing="1.5">${monthLbl}</text>
      <text x="${labelX}" y="${baseY + 38}" text-anchor="middle" fill="${d.resultado >= 0 ? '#10B981' : '#EF4444'}" font-size="9" font-weight="600">${formatSmallResult(d.resultado)}</text>
      ${partialMark}
    </g>`;
  });
  // ─── Caixa acumulado corrido (running total) sobreposto ao gráfico de barras ───
  // Linha/área do resultado acumulado pelos meses realizados FECHADOS — mostra a trajetória
  // (Jan +95k → … → Mai ~+201k) e o mergulho do déficit de Abril na inclinação.
  let accOverlay = '';
  const groupCenterX = (i) => startX + 20 + i * groupSpacing + 30;
  const closedPts = [];
  let acc = 0;
  months.forEach((m, i) => {
    if (!isClosedRealizedMonth(m)) return;
    acc += DATA.monthly[m].resultado;
    closedPts.push({ i, m, acc });
  });
  if (closedPts.length >= 2) {
    const accVals = closedPts.map(p => p.acc);
    const accMax = Math.max(...accVals, 0);
    const accMin = Math.min(...accVals, 0);
    const accRange = (accMax - accMin) || 1;
    // Mapeia o acumulado numa faixa superior do gráfico (não colide com as barras altas).
    const accTop = chartTop + 8, accBottom = chartTop + chartHeight * 0.42;
    const yAcc = (v) => accBottom - ((v - accMin) / accRange) * (accBottom - accTop);
    const linePts = closedPts.map(p => `${groupCenterX(p.i)},${yAcc(p.acc)}`).join(' ');
    const areaPts = `${groupCenterX(closedPts[0].i)},${accBottom} ${linePts} ${groupCenterX(closedPts[closedPts.length - 1].i)},${accBottom}`;
    const dots = closedPts.map(p => {
      const cx = groupCenterX(p.i), cy = yAcc(p.acc);
      return `<g class="acc-dot-group"><circle cx="${cx}" cy="${cy}" r="4" fill="#10B981" stroke="#0A0E1A" stroke-width="1.5"/>` +
        `<text x="${cx}" y="${cy - 10}" text-anchor="middle" fill="#10B981" font-size="9" font-weight="700" font-family="Helvetica, Arial">${formatSmallResult(p.acc)}</text></g>`;
    }).join('');
    accOverlay = `<g class="cash-acc-overlay" pointer-events="none">
      <defs><linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10B981" stop-opacity="0.28"/><stop offset="100%" stop-color="#10B981" stop-opacity="0.02"/></linearGradient></defs>
      <polygon points="${areaPts}" fill="url(#accGrad)"/>
      <polyline points="${linePts}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
      <text x="${groupCenterX(closedPts[0].i)}" y="${accTop - 2}" text-anchor="start" fill="#10B981" font-size="9" font-weight="700" letter-spacing="1.5" font-family="Helvetica, Arial" opacity="0.85">CAIXA ACUMULADO CORRIDO (REALIZADO FECHADO)</text>
    </g>`;
  }
  svg.innerHTML = defs + grid + bars + accOverlay;
  svg.querySelectorAll('.bar-group rect[data-flow]').forEach(r => {
    r.addEventListener('click', (e) => { e.stopPropagation(); setFlow(r.dataset.flow); });
  });
  svg.querySelectorAll('.bar-group').forEach(g => {
    const m = Number(g.dataset.month);
    g.addEventListener('click', () => { toggleMonth(m); applyFilter(); });
    g.addEventListener('mousemove', (e) => {
      const d = DATA.monthly[m];
      showTip(MONTH_NAMES_LONG[m] + ' / 2026', [
        ['Entradas', fmtMoneyFull(d.entradas)], ['Saídas', fmtMoneyFull(d.saidas)], ['Resultado', (d.resultado >= 0 ? '+' : '') + fmtMoneyFull(d.resultado)], ['Margem', fmtPct(d.entradas > 0 ? d.resultado / d.entradas * 100 : 0)]
      ], e.clientX, e.clientY);
    });
    g.addEventListener('mouseleave', hideTip);
  });
}
// ─── DONUT + RANKING ───
function renderDonut() {
  const svg = document.getElementById('donut');
  const period = getActivePeriod();
  const totalEl = document.getElementById('donutTotal');
  const subEl = document.getElementById('donutSub');
  const ctxEl = document.getElementById('categoryContext');
  if (ctxEl) ctxEl.textContent = `RANKING · ${periodLabelFor(period.months, period.mode)}`;
  if (selectedFlow === 'entradas') {
    svg.innerHTML = `<text x="100" y="92" text-anchor="middle" fill="#94A0B8" font-size="11" font-weight="700" letter-spacing="2">ENTRADAS</text><text x="100" y="112" text-anchor="middle" fill="#5A6580" font-size="9">sem composição por saída</text>`;
    if (totalEl) totalEl.textContent = '—';
    if (subEl) subEl.textContent = 'Selecione SAÍDAS ou AMBOS';
    return;
  }
  const categories = getCategoryBreakdown(period.months);
  const r = 70, circ = 2 * Math.PI * r;
  const total = categories.reduce((s, c) => s + c.value, 0);
  const colors = ['#6366F1','#06B6D4','#10B981','#F59E0B','#EF4444','#A855F7','#EC4899','#84CC16','#14B8A6','#5A6580'];
  if (totalEl) setAnimatedValue(totalEl, total, 'R$ ', 1000000, 'M', 1);
  if (subEl) subEl.textContent = periodLabelFor(period.months, period.mode);
  if (!total) { svg.innerHTML = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="#1F2440" stroke-width="30"/>`; return; }
  const top = categories.slice(0, 6), rest = categories.slice(6), restTotal = rest.reduce((s, c) => s + c.value, 0);
  const slices = [...top]; if (restTotal > 0) slices.push({ name:'Outros agrupados', value:restTotal, pct:restTotal/total*100 });
  let arcs = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="#1F2440" stroke-width="30"/>`, offset = 0;
  slices.forEach((s, i) => {
    const len = (s.value / total) * circ;
    arcs += `<circle class="donut-slice" cx="100" cy="100" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="30" stroke-dasharray="${len.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${-offset.toFixed(2)}" transform="rotate(-90 100 100)" data-cat="${s.name}" data-pct="${fmtPct(s.pct || s.value/total*100)}" data-val="${fmtMoneyExact(s.value)}" data-idx="${i}"/>`;
    offset += len;
  });
  svg.innerHTML = arcs;
  svg.querySelectorAll('.donut-slice').forEach(s => {
    s.addEventListener('mousemove', e => showTip(s.dataset.cat, [['Valor', s.dataset.val], ['% do total', s.dataset.pct], ['Ação', 'Clique para abrir mês a mês']], e.clientX, e.clientY));
    s.addEventListener('mouseenter', () => svg.querySelectorAll('.donut-slice').forEach(o => o !== s && o.classList.add('dim')));
    s.addEventListener('mouseleave', () => { svg.querySelectorAll('.donut-slice').forEach(o => o.classList.remove('dim')); hideTip(); });
    s.addEventListener('click', () => selectCategory(s.dataset.cat, s.getAttribute('stroke')));
  });
}
function categoryDetailInnerHtml(cat, period, color) {
  const { rows, max, periodTotal, yearTotal } = getCategoryMonthlyRows(cat, period.months);
  const periodTotalOut = aggregate(period.months).saidas;
  const yearTotalOut = aggregate(ALL_MONTHS).saidas;
  const periodShare = periodTotalOut > 0 ? periodTotal / periodTotalOut * 100 : 0;
  const yearShare = yearTotalOut > 0 ? yearTotal / yearTotalOut * 100 : 0;
  const monthlyHtml = rows.map(r => {
    const hasValue = r.value > 0.01;
    const width = max > 0 ? Math.max((r.value / max) * 100, hasValue ? 1.5 : 0) : 0;
    const pct = yearTotal > 0 ? r.value / yearTotal * 100 : 0;
    const minw = hasValue && width < 2 ? '3px' : '0px';
    return `<div class="category-month-row ${r.inPeriod ? 'in-period' : ''} ${r.projection ? 'projection' : ''} ${hasValue ? '' : 'no-value'}">
      <div class="category-month-label">${MONTH_NAMES_SHORT[r.month]}</div>
      <div class="category-month-bar"><div class="category-month-fill" style="--w:${width.toFixed(1)}%;--minw:${minw};"></div></div>
      <div class="category-month-value">${fmtMoneyFull(r.value)}</div>
      <div class="category-month-pct">${fmtPct(pct)}</div>
    </div>`;
  }).join('');
  const insight = categoryConcentrationInsight(rows, yearTotal);
  return `<div class="category-detail-head">
      <div class="category-detail-title">
        <div class="eyebrow-mini">DRILL-DOWN MENSAL DA CATEGORIA</div>
        <h3>${cat.name.toUpperCase()}</h3>
        <div class="category-detail-subtitle">Abertura mensal de janeiro a dezembro; meses sem movimento ficam apagados para leitura rápida.</div>
      </div>
      <button class="category-close" type="button">Fechar</button>
    </div>
    <div class="category-insight">${insight}</div>
    <div class="category-metrics">
      <div class="category-metric"><div class="lbl">Total no período</div><div class="val number-gold">${fmtMoneyFull(periodTotal)}</div></div>
      <div class="category-metric"><div class="lbl">Total 2026</div><div class="val">${fmtMoneyFull(yearTotal)}</div></div>
      <div class="category-metric"><div class="lbl">Participação no período</div><div class="val">${fmtPct(periodShare)}</div></div>
    </div>
    <div class="category-empty-detail" style="display:${periodTotal > 0 ? 'none' : 'block'};margin-bottom:14px;">A categoria não teve valor no período filtrado. A distribuição anual continua exibida para contexto.</div>
    <div class="category-month-list">${monthlyHtml}</div>`;
}
function renderRanking() {
  const list = document.getElementById('rankList');
  const externalDetail = document.getElementById('categoryDetail');
  if (externalDetail) { externalDetail.classList.remove('show'); externalDetail.innerHTML = ''; }
  const period = getActivePeriod();
  if (selectedFlow === 'entradas') {
    selectedCategoryName = null;
    list.innerHTML = `<div class="empty-state"><strong>Composição indisponível para entradas.</strong><br>O ranking desta seção classifica apenas saídas gerenciais por rubrica. Selecione <strong>SAÍDAS</strong> ou <strong>AMBOS</strong> para visualizar o detalhamento.</div>`;
    return;
  }
  const categories = getCategoryBreakdown(period.months);
  const colors = ['#6366F1','#06B6D4','#10B981','#F59E0B','#EF4444','#A855F7','#EC4899','#84CC16','#14B8A6','#5A6580'];
  const maxVal = Math.max(...categories.map(c => c.value), 1);
  const htmlParts = [];
  categories.slice(0, 10).forEach((c, i) => {
    const barWidth = (c.value / maxVal * 100).toFixed(1) + '%';
    const color = colors[i] || '#5A6580';
    const activeCls = selectedCategoryName === c.name ? ' active' : '';
    const safeName = c.name.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    htmlParts.push(`<div class="rank-item${activeCls}" style="--cat-color:${color};" data-rank-idx="${i}" data-cat-name="${safeName}" title="Clique para abrir o detalhamento mensal" aria-label="Abrir detalhamento mensal de ${safeName}">
      <div class="rank-num">${String(i + 1).padStart(2, '0')}</div><div class="rank-name">${c.name.toUpperCase()}<div class="bar"><div class="bar-fill" style="--bar-width:${barWidth};"></div></div></div>
      <div class="rank-value number" data-count-to="${c.value}" data-prefix="R$ " data-divisor="${c.value >= 1000000 ? 1000000 : 1000}" data-suffix="${c.value >= 1000000 ? 'M' : 'K'}" data-decimals="${c.value >= 1000000 ? 2 : 0}">R$ 0</div>
      <div class="rank-pct number" data-count-to="${c.pct}" data-prefix="" data-divisor="1" data-suffix="%" data-decimals="1">0%</div>
      <div class="rank-action" aria-hidden="true">›</div>
    </div>`);
    if (selectedCategoryName === c.name) {
      const fullCat = getCategoryByName(c.name);
      if (fullCat) {
        htmlParts.push(`<div class="category-detail show inline-category-detail" style="--cat-color:${color};" aria-live="polite">${categoryDetailInnerHtml(fullCat, period, color)}</div>`);
      }
    }
  });
  list.innerHTML = htmlParts.join('');
  list.querySelectorAll('.rank-item').forEach(item => intObs.observe(item));
  list.querySelectorAll('.rank-item [data-count-to]').forEach(el => { el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || ''); setTimeout(() => animateCount(el), 80); });
  list.querySelectorAll('.rank-item').forEach((item, i) => {
    item.addEventListener('mouseenter', () => document.querySelectorAll('.donut-slice').forEach((s, idx) => { const donutIdx = i < 6 ? i : 6; if (idx !== donutIdx) s.classList.add('dim'); }));
    item.addEventListener('mouseleave', () => document.querySelectorAll('.donut-slice').forEach(s => s.classList.remove('dim')));
    item.addEventListener('click', () => {
      const name = item.dataset.catName;
      const color = getComputedStyle(item).getPropertyValue('--cat-color').trim() || '#6366F1';
      selectCategory(name, color);
    });
  });
  list.querySelectorAll('.category-close').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      selectedCategoryName = null;
      selectedCategoryColor = '#6366F1';
      renderRanking();
    });
  });
  const inlineDetail = list.querySelector('.inline-category-detail');
  if (inlineDetail) {
    setTimeout(() => inlineDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  }
}
function renderCategoryDetail() {
  const detail = document.getElementById('categoryDetail');
  if (!detail) return;
  detail.classList.remove('show');
  detail.innerHTML = '';
}

// ─── TABLE ───
function renderMonthDetailRow(m) {
  const d = DATA.monthly[m];
  const margem = d.entradas > 0 ? d.resultado / d.entradas * 100 : 0;
  const cats = monthCategoryBreakdown(m);
  const topCats = cats.slice(0, 5);
  const topHtml = topCats.length ? topCats.map((c, i) => `
    <div class="month-cat-row">
      <div class="month-cat-rank">${String(i + 1).padStart(2, '0')}</div>
      <div class="month-cat-name">${c.name}</div>
      <div class="month-cat-val">${fmtMoneyFull(c.value)}</div>
      <div class="month-cat-pct">${fmtPct(c.pct)}</div>
    </div>`).join('') : '<div class="month-detail-reading">Sem saídas classificadas para este mês.</div>';

  return `<tr class="month-detail-row"><td colspan="7">
    <div class="month-detail-panel">
      <div class="month-detail-top">
        <div class="month-detail-title">
          <span>Análise do mês</span>
          <strong>${MONTH_NAMES_LONG[m]} / 2026 ${isProjectionMonth(m) ? '· Projeção' : '· Realizado'}</strong>
        </div>
        <div class="month-detail-actions">
          <button type="button" class="month-detail-btn" data-apply-month="${m}">Aplicar mês no filtro</button>
          <button type="button" class="month-detail-btn secondary" data-close-month-detail>Fechar</button>
        </div>
      </div>

      <div class="month-detail-kpis">
        <div class="month-detail-kpi"><div class="lbl">Entradas</div><div class="val number-gold">${fmtMoneyFull(d.entradas)}</div></div>
        <div class="month-detail-kpi"><div class="lbl">Saídas gerenciais</div><div class="val">${fmtMoneyFull(d.saidas)}</div></div>
        <div class="month-detail-kpi"><div class="lbl">Resultado</div><div class="val ${d.resultado >= 0 ? 'number-green' : 'number-red'}">${d.resultado >= 0 ? '+' : ''}${fmtMoneyFull(d.resultado)}</div></div>
        <div class="month-detail-kpi"><div class="lbl">Margem</div><div class="val ${margem >= 0 ? '' : 'number-red'}">${fmtPct(margem)}</div></div>
      </div>

      <div class="month-detail-grid">
        <div class="month-detail-box">
          <h3>Top categorias do mês</h3>
          ${topHtml}
        </div>
        <div class="month-detail-box">
          <h3>Leitura gerencial</h3>
          <div class="month-detail-reading">${getMonthCriticalReading(m)}</div>
        </div>
      </div>
    </div>
  </td></tr>`;
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  let html = '';
  // Caixa acumulado corrido: running total do resultado pelos meses realizados FECHADOS,
  // em ordem cronológica (Jan +95k → … → Mai ~+201k). Parcial/projeção não entram no corrido.
  let runningClosed = 0;
  ALL_MONTHS.forEach(m => {
    const d = DATA.monthly[m];
    const isSelected = activePeriodMode === 'custom' && selectedMonths.includes(m);
    const isOpen = selectedMonthDetail === m;
    const isProj = isProjectionMonth(m);
    const isPartial = !isProj && isPartialMonth(m);
    const isClosed = isClosedRealizedMonth(m);
    let rowCls = 'row-month';
    if (isSelected) rowCls += ' selected';
    if (isOpen) rowCls += ' open';
    if (isProj) rowCls += ' projection-row';
    if (isPartial) rowCls += ' partial-row';
    const margem = d.entradas > 0 ? d.resultado / d.entradas * 100 : 0;
    const status = isProj ? 'forecast' : (isPartial ? 'partial' : (d.resultado >= 0 ? 'surplus' : 'deficit'));
    const statusText = isProj ? '◌ Projeção' : (isPartial ? '◐ Parcial' : (d.resultado >= 0 ? '▲ Superávit' : '▼ Déficit'));
    const partialTag = isPartial ? ' <span class="month-partial-tag" title="Mês em andamento — dados parciais (Bling até a data de importação). Excluído de Melhor Mês e da média de saídas.">PARCIAL</span>' : '';
    let accCell;
    if (isClosed) {
      runningClosed += d.resultado;
      accCell = `<td class="num cash-acc ${runningClosed >= 0 ? 'number-green' : 'number-red'}" title="Caixa acumulado corrido até ${MONTH_NAMES_LONG[m]} (meses realizados fechados)">${runningClosed >= 0 ? '+' : ''}${fmtMoneyFull(runningClosed)}</td>`;
    } else {
      accCell = `<td class="num cash-acc cash-acc-na" title="${isProj ? 'Mês projetado — fora do corrido realizado' : 'Mês parcial em andamento — fora do corrido realizado'}">—</td>`;
    }
    html += `<tr class="${rowCls}" data-row-month="${m}"><td><span class="month-cell"><span class="dot ${isProj ? 'proj-dot' : ''}${isPartial ? ' partial-dot' : ''}"></span>${MONTH_NAMES_LONG[m].toUpperCase()}${partialTag}</span></td><td class="num">${fmtMoneyFull(d.entradas)}</td><td class="num">${fmtMoneyFull(d.saidas)}</td><td class="num ${d.resultado >= 0 ? 'number-green' : 'number-red'}">${d.resultado >= 0 ? '+' : ''}${fmtMoneyFull(d.resultado)}</td>${accCell}<td class="num ${d.resultado >= 0 ? '' : 'number-red'}">${fmtPct(margem)}</td><td><span class="status-pill ${status}">${statusText}</span></td></tr>`;
    if (isOpen) html += renderMonthDetailRow(m);
  });
  const realAgg = aggregate(REAL_MONTHS), fullAgg = aggregate(ALL_MONTHS), activeAgg = aggregate(selectedMonths);
  // Acumulado corrido FECHADO (exclui parcial) = caixa "honrado" da série realizada.
  const closedAgg = aggregate(REAL_MONTHS.filter(isClosedRealizedMonth));
  html += `<tr class="total-row"><td>SELECIONADO · ${periodLabelFor(selectedMonths, activePeriodMode)}</td><td class="num">${fmtMoneyFull(activeAgg.entradas)}</td><td class="num">${fmtMoneyFull(activeAgg.saidas)}</td><td class="num ${activeAgg.resultado >= 0 ? 'number-green' : 'number-red'}">${activeAgg.resultado >= 0 ? '+' : ''}${fmtMoneyFull(activeAgg.resultado)}</td><td class="num cash-acc-na">—</td><td class="num number-gold">${fmtPct(activeAgg.margem)}</td><td><span class="status-pill ${activeAgg.resultado >= 0 ? 'surplus' : 'deficit'}">${activeAgg.resultado >= 0 ? '▲ Superávit' : '▼ Déficit'}</span></td></tr>`;
  html += `<tr class="total-row" style="border-top:1px solid #2D3454;"><td>ACUMULADO · ${realizedRangeShort().replace(/ — /g, '—')} <span style="font-size:9px;color:#FCD34D;letter-spacing:2px;margin-left:8px;">REAL</span></td><td class="num">${fmtMoneyFull(realAgg.entradas)}</td><td class="num">${fmtMoneyFull(realAgg.saidas)}</td><td class="num ${realAgg.resultado >= 0 ? 'number-green' : 'number-red'}">${realAgg.resultado >= 0 ? '+' : ''}${fmtMoneyFull(realAgg.resultado)}</td><td class="num cash-acc ${closedAgg.resultado >= 0 ? 'number-green' : 'number-red'}" title="Caixa acumulado corrido dos meses realizados fechados">${closedAgg.resultado >= 0 ? '+' : ''}${fmtMoneyFull(closedAgg.resultado)}</td><td class="num number-gold">${fmtPct(realAgg.margem)}</td><td><span class="status-pill ${realAgg.resultado >= 0 ? 'surplus' : 'deficit'}">${realAgg.resultado >= 0 ? '▲ Superávit' : '▼ Déficit'}</span></td></tr>`;
  // (D2) A linha "PROJEÇÃO ANUAL · REAL + PROJ." só aparece quando há dado de projeção.
  // Sem ele, o ano = realizado (já coberto pela linha ACUMULADO) → omitida para não duplicar/enganar.
  if (hasProjectionData()) {
    html += `<tr class="total-row" style="border-top:1px solid #2D3454;"><td>PROJEÇÃO ANUAL · 2026 <span style="font-size:9px;color:#6366F1;letter-spacing:2px;margin-left:8px;">REAL + PROJ.</span></td><td class="num">${fmtMoneyFull(fullAgg.entradas)}</td><td class="num">${fmtMoneyFull(fullAgg.saidas)}</td><td class="num ${fullAgg.resultado >= 0 ? 'number-green' : 'number-red'}">${fullAgg.resultado >= 0 ? '+' : ''}${fmtMoneyFull(fullAgg.resultado)}</td><td class="num cash-acc-na">—</td><td class="num">${fmtPct(fullAgg.margem)}</td><td><span class="status-pill ${fullAgg.resultado >= 0 ? 'surplus' : 'deficit'}">${fullAgg.resultado >= 0 ? '▲ Anual+' : '▼ Anual−'}</span></td></tr>`;
  }
  tbody.innerHTML = html;
  tbody.querySelectorAll('.row-month').forEach(tr => tr.addEventListener('click', () => { selectedMonthDetail = selectedMonthDetail === Number(tr.dataset.rowMonth) ? null : Number(tr.dataset.rowMonth); renderTable(); }));
  tbody.querySelectorAll('[data-apply-month]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); setSelectedMonths([Number(btn.dataset.applyMonth)], 'custom'); applyFilter(); }));
  tbody.querySelectorAll('[data-close-month-detail]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); selectedMonthDetail = null; renderTable(); }));
}

// ─── VISÃO DIÁRIA DO MÊS (D1) ───
// Renderiza fluxo_caixa.daily (109 dias com saidasBrutas e ajustesGerenciais), que hoje não é exibido:
//  · os 3 maiores dias de DESEMBOLSO (saída) do mês/período selecionado;
//  · curva de desembolso e saldo acumulado intra-mês.
// Mostra o descasamento DENTRO do mês — um resultado mensal positivo pode esconder dias críticos.
function dailyForMonths(months) {
  const set = new Set(normalizeMonths(months));
  const rows = (DATA.daily || []).filter(d => set.has(Number(d.month)));
  // ordena por data (string ISO ordena cronologicamente)
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}
function renderDailyPanel() {
  const host = document.getElementById('dailyPanel');
  if (!host) return;
  const period = getActivePeriod();
  // Foco em UM mês para a curva intra-mês: o mês selecionado (se 1) ou o 1º realizado do período.
  const focusMonth = period.months.length === 1
    ? period.months[0]
    : (period.months.filter(m => !isProjectionMonth(m))[0] || period.months[0]);
  const ctx = document.getElementById('dailyPeriodContext');
  if (ctx) ctx.textContent = `DIA A DIA · ${MONTH_NAMES_LONG[focusMonth]} / 2026${isProjectionMonth(focusMonth) ? ' · PROJEÇÃO' : ''}`;

  const days = dailyForMonths([focusMonth]);
  if (!days.length) {
    host.innerHTML = `<div class="daily-empty">Sem lançamentos diários para <strong>${MONTH_NAMES_LONG[focusMonth]}</strong>. ` +
      `O detalhamento diário existe apenas para os meses realizados (extrato Bling).</div>`;
    return;
  }

  // Top 3 dias de maior desembolso (saída líquida gerencial).
  const top3 = [...days].sort((a, b) => (b.saidas || 0) - (a.saidas || 0)).slice(0, 3).filter(d => (d.saidas || 0) > 0);
  const totalOut = days.reduce((s, d) => s + (d.saidas || 0), 0);
  const dayNum = (iso) => { const p = String(iso).split('-'); return p.length === 3 ? Number(p[2]) : null; };
  const topHtml = top3.map((d, i) => {
    const share = totalOut > 0 ? (d.saidas / totalOut * 100) : 0;
    const adj = Number(d.ajustesGerenciais || 0);
    const brutoNote = adj > 0
      ? `desembolso bruto ${fmtMoneyFull(d.saidasBrutas || d.saidas)} · ajustes gerenciais ${fmtMoneyFull(adj)}`
      : 'sem ajustes gerenciais no dia';
    return `<div class="daily-top-row">
      <div class="daily-top-rank">${String(i + 1).padStart(2, '0')}</div>
      <div class="daily-top-info">
        <div class="daily-top-date">${String(dayNum(d.date)).padStart(2, '0')} / ${MONTH_NAMES_SHORT[focusMonth]}</div>
        <div class="daily-top-note">${brutoNote}</div>
      </div>
      <div class="daily-top-val number-red">${fmtMoneyFull(d.saidas)}</div>
      <div class="daily-top-share">${fmtPct(share)}</div>
    </div>`;
  }).join('') || '<div class="daily-empty">Sem desembolso classificado neste mês.</div>';

  // Curva acumulada intra-mês: saída acumulada e saldo (entradas−saídas) acumulado, dia a dia.
  const W = 720, H = 230, padL = 56, padR = 16, padT = 20, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  let accOut = 0, accNet = 0;
  const pts = days.map((d, i) => {
    accOut += (d.saidas || 0);
    accNet += (d.entradas || 0) - (d.saidas || 0);
    return { i, day: dayNum(d.date), accOut, accNet, saidas: d.saidas || 0, entradas: d.entradas || 0 };
  });
  const n = pts.length;
  const x = (i) => padL + (n === 1 ? plotW / 2 : i * plotW / (n - 1));
  const allVals = pts.map(p => p.accOut).concat(pts.map(p => p.accNet)).concat([0]);
  const maxV = Math.max.apply(null, allVals);
  const minV = Math.min.apply(null, allVals);
  const range = (maxV - minV) || 1;
  const y = (v) => padT + plotH - ((v - minV) / range) * plotH;
  const zeroY = y(0);

  let grid = '';
  [maxV, (maxV + minV) / 2, minV].forEach(t => {
    grid += `<line class="daily-grid" x1="${padL}" y1="${y(t)}" x2="${W - padR}" y2="${y(t)}"/>` +
      `<text class="daily-axis" x="${padL - 8}" y="${(y(t) + 3).toFixed(1)}" text-anchor="end">${fmtMoney(t).replace('R$ ', '')}</text>`;
  });
  if (minV < 0 && maxV > 0) grid += `<line class="daily-zero" x1="${padL}" y1="${zeroY}" x2="${W - padR}" y2="${zeroY}"/>`;
  const outLine = pts.map(p => `${x(p.i).toFixed(1)},${y(p.accOut).toFixed(1)}`).join(' ');
  const netLine = pts.map(p => `${x(p.i).toFixed(1)},${y(p.accNet).toFixed(1)}`).join(' ');
  // rótulos de dia (a cada ~5 dias para não poluir)
  const step = Math.max(1, Math.ceil(n / 8));
  const labels = pts.map((p, i) => (i % step === 0 || i === n - 1)
    ? `<text class="daily-xlabel" x="${x(p.i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${p.day}</text>` : '').join('');
  const lastOut = pts[n - 1].accOut, lastNet = pts[n - 1].accNet;
  const svg = `<svg class="daily-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Curva de desembolso e saldo acumulado intra-mês de ${MONTH_NAMES_LONG[focusMonth]}">
    ${grid}
    <polyline class="daily-line-out" fill="none" points="${outLine}"/>
    <polyline class="daily-line-net" fill="none" points="${netLine}"/>
    ${labels}
  </svg>`;

  const worst = top3[0];
  const auto = worst
    ? `O maior desembolso de <strong>${MONTH_NAMES_LONG[focusMonth]}</strong> ocorreu no dia <strong>${String(dayNum(worst.date)).padStart(2, '0')}</strong>, com <strong class="number-red">${fmtMoneyFull(worst.saidas)}</strong> (${fmtPct(totalOut > 0 ? worst.saidas / totalOut * 100 : 0)} das saídas do mês). O saldo de caixa acumulado fechou o mês em <strong class="${lastNet >= 0 ? 'number-green' : 'number-red'}">${lastNet >= 0 ? '+' : ''}${fmtMoneyFull(lastNet)}</strong> — a curva mostra os pontos em que o caixa apertou dentro do mês.`
    : `Sem dia de desembolso relevante em ${MONTH_NAMES_LONG[focusMonth]}.`;

  host.innerHTML = `
    <div class="daily-grid-layout">
      <div class="daily-card daily-top-card">
        <div class="daily-card-head"><div class="daily-card-title">3 MAIORES DIAS DE DESEMBOLSO</div>
          <div class="daily-card-sub">${MONTH_NAMES_LONG[focusMonth]} · saída gerencial diária</div></div>
        <div class="daily-top-list">${topHtml}</div>
      </div>
      <div class="daily-card daily-chart-card">
        <div class="daily-card-head"><div class="daily-card-title">CURVA ACUMULADA INTRA-MÊS</div>
          <div class="daily-chart-legend">
            <span class="daily-key"><i class="dk-out"></i>Desembolso acum. (${fmtMoney(lastOut)})</span>
            <span class="daily-key"><i class="dk-net"></i>Saldo acum. (${(lastNet >= 0 ? '+' : '') + fmtMoney(lastNet)})</span>
          </div>
        </div>
        ${svg}
      </div>
    </div>
    <div class="daily-note">${auto}</div>`;
}

// ─── HERO ───
function renderHero() {
  const period = getActivePeriod();
  const agg = aggregate(period.months);
  const periodEl = document.getElementById('heroPeriod');
  if (periodEl) periodEl.textContent = period.label;
  // Rótulo do rodapé derivado do intervalo realizado (selo), não cravado em "Janeiro — Junho".
  const footerEl = document.getElementById('footerPeriodLabel');
  if (footerEl) footerEl.textContent = `${rangeLabelLong(REAL_MONTHS).toUpperCase()} / 2026`;
  const moviment = agg.entradas + agg.saidas;
  const stats = document.querySelectorAll('.hero-stat .value');
  if (stats[1]) setAnimatedValue(stats[1], moviment, 'R$ ', 1000000, 'M', 2);
  if (stats[2]) { setAnimatedValue(stats[2], Math.abs(agg.resultado), agg.resultado >= 0 ? '+R$ ' : '-R$ ', 1000000, 'M', 2); stats[2].className = 'value number ' + (agg.resultado >= 0 ? 'number-green' : 'number-red'); }
}

// ─── UI STATE ───

function updateControls() {
  const period = getActivePeriod();
  const customMode = activePeriodMode === 'custom';
  document.querySelectorAll('.month-row[data-month]').forEach(p => {
    p.classList.toggle('active', customMode && selectedMonths.includes(Number(p.dataset.month)));
  });
  // (D2) Aparato de projeção honesto: sem dado de projeção, esconde o atalho "Projeção",
  // renomeia "2026 completo" → "Acumulado realizado" e atualiza o subtítulo.
  const projData = hasProjectionData();
  document.querySelectorAll('[data-period="year"]').forEach(p => {
    p.classList.toggle('active', activePeriodMode === 'year');
    const span = p.querySelector('span'); const small = p.querySelector('small');
    if (span) span.textContent = projData ? '2026 completo' : 'Acumulado realizado';
    if (small) small.textContent = projData ? 'jan — dez · real + projeção' : `${rangeLabelLong(REAL_MONTHS).toLowerCase()} · só realizado`;
  });
  document.querySelectorAll('[data-period="realized"]').forEach(p => p.classList.toggle('active', activePeriodMode === 'realized'));
  document.querySelectorAll('[data-period="projection"]').forEach(p => {
    // Esconde o atalho de projeção quando não há nada projetado (evita KPIs em R$0 sem explicação).
    // Usa classe (não inline) porque há regras !important de layout que vencem style.display.
    p.classList.toggle('period-row--hidden', !projData);
    p.setAttribute('aria-hidden', projData ? 'false' : 'true');
    p.tabIndex = projData ? 0 : -1;
    p.classList.toggle('active', activePeriodMode === 'projection');
  });
  // Os meses de projeção no seletor ficam desabilitados/sinalizados quando não há dado.
  document.querySelectorAll('.month-row[data-month]').forEach(p => {
    const m = Number(p.dataset.month);
    if (isProjectionMonth(m) && !projData) {
      p.classList.add('month-row-empty');
      const small = p.querySelector('small');
      if (small) small.textContent = 'Sem dado';
      p.setAttribute('title', 'Mês futuro sem dado de projeção (Bling só traz realizado).');
    } else if (isProjectionMonth(m)) {
      p.classList.remove('month-row-empty');
    }
  });
  document.querySelectorAll('[data-flow]').forEach(el => {
    const f = el.dataset.flow;
    if (!f || f === 'both') return;
    el.classList.toggle('active', selectedFlow === 'both' || selectedFlow === f);
    el.classList.toggle('off', selectedFlow !== 'both' && selectedFlow !== f);
  });
  document.querySelectorAll('.flow-pill').forEach(p => p.classList.toggle('active', p.dataset.flow === selectedFlow));

  const monthLabel = document.getElementById('monthSelectLabel');
  if (monthLabel) monthLabel.textContent = `Período: ${period.short}`;

  const flowLabel = selectedFlow === 'both' ? 'ambos' : (selectedFlow === 'entradas' ? 'entradas' : 'saídas');
  const summary = document.getElementById('activeFilterSummary');
  if (summary) summary.textContent = `${periodLabelFor(period.months, period.mode)} · Fluxo: ${flowLabel}`;
  const dailyContext = document.getElementById('dailyPeriodContext');
  if (dailyContext) dailyContext.textContent = `Período selecionado: ${periodLabelFor(period.months, period.mode)}`;
}
function forceVisibleDynamicBlocks() {
  ['momPanel', 'criticalAlerts'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('in-view');
  });
  document.querySelectorAll('.mom-panel, .critical-alerts-grid, .methodology-card, .month-detail-row, .daily-panel').forEach(el => {
    el.classList.add('in-view');
  });
}

function applyFilter() {
  window.MarconiPerf?.start('filter-render');
  updateControls();
  const currentPage = document.body?.dataset?.page || 'cash';
  if (currentPage === 'cash') {
    const renderSteps = [renderHero, renderCashSeal, renderKPIs, renderExecutiveSummary, renderBarChart, renderDailyPanel, renderCriticalAlerts, renderDonut, renderRanking, renderTable];
    renderSteps.forEach(fn => {
      try { fn(); }
      catch (err) { console.error('Erro ao renderizar bloco do dashboard:', fn.name, err); }
    });
    forceVisibleDynamicBlocks();
  }
  try {
    const period = getActivePeriod();
    window.MarconiEvents?.emit('filter:changed', {
      page: currentPage,
      periodMode: activePeriodMode,
      months: period.months,
      flow: selectedFlow,
      category: selectedCategoryName
    });
    window.MarconiPerf?.end('filter-render', { page: currentPage, periodMode: activePeriodMode });
  } catch (e) {}
}

// ─── TOOLTIP ───
const tooltip = document.getElementById('tooltip');
const ttTitle = document.getElementById('ttTitle');
const ttBody = document.getElementById('ttBody');
function showTip(title, rows, x, y) {
  ttTitle.textContent = title;
  ttBody.innerHTML = rows.map(([lbl, val]) => `<div class="tooltip-row"><span class="lbl">${lbl}</span><span class="val">${val}</span></div>`).join('');
  let px = x + 20, py = y + 20;
  if (px + 240 > window.innerWidth) px = x - 240;
  if (py + 200 > window.innerHeight) py = y - 200;
  tooltip.style.left = px + 'px'; tooltip.style.top = py + 'px'; tooltip.classList.add('show');
}
function hideTip() { tooltip.classList.remove('show'); }

// ─── INTERSECTION OBSERVER ───
const intObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); if (e.target.dataset.countTo) animateCount(e.target); e.target.querySelectorAll('[data-count-to]').forEach(animateCount); } });
}, { threshold: 0.15 });

// ─── MOUSE + SCROLL ───
const glow = document.getElementById('mouseGlow');
let glowFrame = 0;
let glowX = 0;
let glowY = 0;
window.addEventListener('mousemove', (e) => {
  if (!glow) return;
  glowX = e.clientX;
  glowY = e.clientY;
  if (glowFrame) return;
  glowFrame = requestAnimationFrame(() => {
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';
    glowFrame = 0;
  });
}, { passive: true });
const progress = document.getElementById('scrollProgress');
const filterBar = document.getElementById('filterBar');
let scrollFrame = 0;
window.addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    if (filterBar) filterBar.classList.toggle('scrolled', h.scrollTop > 100);
    scrollFrame = 0;
  });
}, { passive: true });


function togglePresentationMode(force) {
  const shouldEnable = typeof force === 'boolean' ? force : !document.body.classList.contains('presentation-mode');
  document.body.classList.toggle('presentation-mode', shouldEnable);
  if (shouldEnable) window.scrollTo({ top: 0, behavior: 'smooth' });
}
function setupSideNav() {
  const links = [...document.querySelectorAll('.top-site-nav a[data-target], .sidebar-links a[data-target]')];
  if (!links.length) return;
  links.forEach(a => a.addEventListener('click', () => {
    links.forEach(x => x.classList.remove('active'));
    a.classList.add('active');
  }));
  const sections = links.map(a => document.getElementById(a.dataset.target)).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach(a => a.classList.toggle('active', a.dataset.target === visible.target.id));
  }, { rootMargin: '-35% 0px -55% 0px', threshold: [0.05, 0.2, 0.5] });
  sections.forEach(sec => observer.observe(sec));
}

// ─── INIT ───
function init() {
  const makeButtonLike = (el, handler) => {
    if (!el) return;
    el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
    el.addEventListener('click', handler);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); } });
  };
  const monthSelect = document.getElementById('monthSelect');
  const monthSelectBtn = document.getElementById('monthSelectBtn');
  if (monthSelect && monthSelectBtn) {
    monthSelectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      monthSelect.classList.toggle('open');
      monthSelectBtn.setAttribute('aria-expanded', monthSelect.classList.contains('open') ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!monthSelect.contains(e.target)) {
        monthSelect.classList.remove('open');
        monthSelectBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('.filter-pill, .month-tab, .period-row, .month-row').forEach(p => {
    makeButtonLike(p, (e) => {
      if (e && (p.classList.contains('month-row') || p.classList.contains('period-row'))) e.stopPropagation();
      if (p.dataset.period) {
        selectPeriod(p.dataset.period);
        const monthSelect = document.getElementById('monthSelect');
        const monthSelectBtn = document.getElementById('monthSelectBtn');
        if (monthSelect && monthSelectBtn) { monthSelect.classList.remove('open'); monthSelectBtn.setAttribute('aria-expanded', 'false'); }
      }
      else if (p.dataset.month) toggleMonth(Number(p.dataset.month));
      applyFilter();
    });
  });
  document.querySelectorAll('.flow-pill').forEach(p => makeButtonLike(p, () => setFlow(p.dataset.flow)));
  document.querySelectorAll('.legend-item[data-flow]').forEach(p => makeButtonLike(p, () => setFlow(p.dataset.flow)));
  makeButtonLike(document.getElementById('filterReset'), () => { selectPeriod('year'); selectedFlow = 'both'; selectedCategoryName = null; const monthSelect = document.getElementById('monthSelect'); const monthSelectBtn = document.getElementById('monthSelectBtn'); if (monthSelect && monthSelectBtn) { monthSelect.classList.remove('open'); monthSelectBtn.setAttribute('aria-expanded', 'false'); } applyFilter(); });
  makeButtonLike(document.getElementById('printDashboard'), (event) => {
    if (typeof window.runDashboardExport === 'function') return window.runDashboardExport(event);
    return window.print();
  });
  makeButtonLike(document.getElementById('presentationMode'), () => togglePresentationMode(true));
  makeButtonLike(document.getElementById('presentationExit'), () => togglePresentationMode(false));
  setupSideNav();
  applyFilter();
  document.querySelectorAll('.reveal').forEach(el => intObs.observe(el));
  document.querySelectorAll('.hero [data-count-to]').forEach(el => { el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || ''); setTimeout(() => animateCount(el), 120); });
}
onDashboardReady(init);
