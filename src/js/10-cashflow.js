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
  if (kind === 'realized') setSelectedMonths(REAL_MONTHS, 'realized');
  else if (kind === 'projection') setSelectedMonths(PROJ_MONTHS, 'projection');
  else setSelectedMonths(ALL_MONTHS, 'year');
}
function getActivePeriod() {
  const months = normalizeMonths(selectedMonths);
  let label, short;
  if (activePeriodMode === 'year') {
    label = '2026 completo'; short = '2026';
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
function getRealPeriod() { return { months: [...REAL_MONTHS], label: 'Jan — Jun', short: 'JAN — JUN' }; }

function periodLabelFor(months, mode = activePeriodMode) {
  months = normalizeMonths(months);
  if (mode === 'year') return '2026 · REAL + PROJEÇÃO';
  if (mode === 'realized') return 'JAN — JUN / 2026 · REALIZADO';
  if (mode === 'projection') return 'JUL — DEZ / 2026 · PROJEÇÃO';
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

  const bestBasis = period.months.filter(m => !isProjectionMonth(m));
  const bestMonths = bestBasis.length ? bestBasis : REAL_MONTHS;
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
  const realized = months.filter(m => !isProjectionMonth(m));
  return realized.length ? realized : months;
}
function getCriticalAlertObjects(period = getActivePeriod()) {
  const months = normalizeMonths(period.months);
  const agg = aggregate(months);
  const cats = getCategoryBreakdown(months);
  const alerts = [];
  const avgOut = months.length ? months.reduce((s,m) => s + DATA.monthly[m].saidas, 0) / months.length : 0;
  const maxOutM = months.reduce((acc,m) => DATA.monthly[m].saidas > DATA.monthly[acc].saidas ? m : acc, months[0]);
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
  const alerts = getCriticalAlertObjects(period);
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
    </div>
    <div class="executive-card">
      <div class="executive-eyebrow">SINAIS RÁPIDOS</div>
      <div class="executive-alert-list">
        ${alerts.map(a => `<div class="mini-alert" style="--alert-color:${a.color};"><div class="tag">${a.tag}</div><div class="title">${a.title}</div><div class="desc">${a.desc}</div></div>`).join('')}
      </div>
    </div>`;
}
function renderResultChart() {
  const svg = document.getElementById('resultChart');
  const summary = document.getElementById('resultSummary');
  if (!svg || !summary) return;
  const period = getActivePeriod();
  const selected = new Set(period.months);
  const agg = aggregate(period.months);
  const months = ALL_MONTHS;
  const maxAbs = Math.max(...months.map(m => Math.abs(DATA.monthly[m].resultado)), 1);
  const chartTop = 46, chartHeight = 270, zeroY = chartTop + chartHeight / 2, half = chartHeight / 2, startX = 78, endX = 1145, groupSpacing = (endX - startX) / (months.length - 1), barWidth = 42;
  const positives = period.months.filter(m => DATA.monthly[m].resultado > 0).length;
  const negatives = period.months.filter(m => DATA.monthly[m].resultado < 0).length;
  const bestM = period.months.reduce((acc,m) => DATA.monthly[m].resultado > DATA.monthly[acc].resultado ? m : acc, period.months[0]);
  const worstM = period.months.reduce((acc,m) => DATA.monthly[m].resultado < DATA.monthly[acc].resultado ? m : acc, period.months[0]);
  const ctx = document.getElementById('resultPeriodContext');
  if (ctx) ctx.textContent = `Resultado mensal · ${periodLabelFor(period.months, period.mode)}`;
  summary.innerHTML = `<div class="result-summary-item"><div class="lbl">RESULTADO DO PERÍODO</div><div class="val ${agg.resultado >= 0 ? 'number-green' : 'number-red'}">${agg.resultado >= 0 ? '+' : ''}${fmtMoneyFull(agg.resultado)}</div></div>
    <div class="result-summary-item"><div class="lbl">MESES POSITIVOS</div><div class="val number-green">${positives} / ${period.months.length}</div></div>
    <div class="result-summary-item"><div class="lbl">MELHOR MÊS</div><div class="val">${MONTH_NAMES_SHORT[bestM]} · ${fmtMoney(DATA.monthly[bestM].resultado)}</div></div>
    <div class="result-summary-item"><div class="lbl">PIOR MÊS</div><div class="val ${DATA.monthly[worstM].resultado < 0 ? 'number-red' : ''}">${MONTH_NAMES_SHORT[worstM]} · ${fmtMoney(DATA.monthly[worstM].resultado)}</div></div>`;
  let grid = '';
  for (let i = -2; i <= 2; i++) {
    const y = zeroY - (i / 2) * half;
    if (i === 0) grid += `<line x1="${startX - 20}" y1="${y}" x2="${endX + 30}" y2="${y}" stroke="#FCD34D" stroke-width="1.2" opacity="0.75"/>`;
    else grid += `<line x1="${startX - 20}" y1="${y}" x2="${endX + 30}" y2="${y}" stroke="#1F2440" stroke-width="1" stroke-dasharray="4 4"/>`;
    const val = (maxAbs * i / 2) / 1000000;
    grid += `<text x="${startX - 32}" y="${y + 4}" text-anchor="end" fill="#5A6580" font-size="10" font-family="Helvetica, Arial">${val.toFixed(1)}M</text>`;
  }
  let bars = '';
  months.forEach((m, i) => {
    const d = DATA.monthly[m], x = startX + i * groupSpacing;
    const h = Math.abs(d.resultado) / maxAbs * half;
    const y = d.resultado >= 0 ? zeroY - h : zeroY;
    const isProj = isProjectionMonth(m);
    const inPeriod = selected.has(m);
    const opacity = inPeriod ? 1 : 0.25;
    const fill = d.resultado >= 0 ? '#10B981' : '#EF4444';
    const stroke = activePeriodMode === 'custom' && inPeriod ? 'stroke="#FCD34D" stroke-width="2"' : '';
    bars += `<g class="result-month" data-month="${m}" opacity="${opacity}">
      <rect x="${x - barWidth/2}" y="${y}" width="${barWidth}" height="${Math.max(h, 3)}" rx="6" fill="${fill}" ${stroke} ${isProj ? 'stroke-dasharray="3 2"' : ''}/>
      <text x="${x}" y="${zeroY + half + 28}" text-anchor="middle" fill="${inPeriod ? '#FFFFFF' : '#5A6580'}" font-size="11" font-weight="800" letter-spacing="1.5">${MONTH_NAMES_SHORT[m]}</text>
      <text x="${x}" y="${d.resultado >= 0 ? y - 10 : y + h + 17}" text-anchor="middle" fill="${fill}" font-size="9" font-weight="800">${formatSmallResult(d.resultado)}</text>
    </g>`;
  });
  svg.innerHTML = `<defs><filter id="resultGlow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${grid}${bars}`;
  svg.querySelectorAll('.result-month').forEach(g => {
    const m = Number(g.dataset.month);
    g.addEventListener('click', () => { toggleMonth(m); applyFilter(); });
    g.addEventListener('mousemove', e => {
      const d = DATA.monthly[m];
      showTip(`Resultado · ${MONTH_NAMES_LONG[m]} / 2026`, [
        ['Entradas', fmtMoneyFull(d.entradas)], ['Saídas gerenciais', fmtMoneyFull(d.saidas)], ['Resultado', `${d.resultado >= 0 ? '+' : ''}${fmtMoneyFull(d.resultado)}`], ['Margem', fmtPct(d.entradas > 0 ? d.resultado / d.entradas * 100 : 0)]
      ], e.clientX, e.clientY);
    });
    g.addEventListener('mouseleave', hideTip);
  });
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
  const dividerX = startX + 20 + 5.5 * groupSpacing + 28 + barGap / 2;
  grid += `<line x1="${dividerX}" y1="${chartTop}" x2="${dividerX}" y2="${baseY}" stroke="#FCD34D" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
    <text x="${dividerX - 8}" y="${chartTop + 16}" text-anchor="end" fill="#FCD34D" font-size="9" font-weight="700" letter-spacing="2" opacity="0.7">REAL</text>
    <text x="${dividerX + 8}" y="${chartTop + 16}" text-anchor="start" fill="#6366F1" font-size="9" font-weight="700" letter-spacing="2" opacity="0.7">PROJEÇÃO</text>`;
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
    const cls = isHighlighted ? 'bar-group selected' : (isDimmed ? 'bar-group dim' : 'bar-group');
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
    bars += `<g class="${cls}" data-month="${m}">${rects}
      <text x="${labelX}" y="${baseY + 22}" text-anchor="middle" fill="${isHighlighted ? '#FCD34D' : (isProj ? '#94A0B8' : '#FFFFFF')}" font-size="11" font-weight="${isHighlighted ? '700' : '500'}" letter-spacing="1.5">${MONTH_NAMES_SHORT[m]}</text>
      <text x="${labelX}" y="${baseY + 38}" text-anchor="middle" fill="${d.resultado >= 0 ? '#10B981' : '#EF4444'}" font-size="9" font-weight="600">${formatSmallResult(d.resultado)}</text>
    </g>`;
  });
  svg.innerHTML = defs + grid + bars;
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

// ─── MONTHLY LINE CHART ───
function renderDailyChart() {
  const svg = document.getElementById('dailyChart');
  const summary = document.getElementById('dailySummary');
  const period = getActivePeriod();
  const months = normalizeMonths(period.months);
  const monthData = months.map(m => ({ month: m, ...DATA.monthly[m] }));
  if (!monthData.length) {
    summary.innerHTML = `<div class="daily-stat" style="grid-column: 1 / -1; text-align:center;"><div class="lbl">SEM DADOS</div><div class="val" style="font-size:16px;color:var(--text-dim);margin-top:4px;">Não há dados mensais disponíveis para o período selecionado.</div></div>`;
    svg.innerHTML = `<text x="600" y="190" text-anchor="middle" fill="#5A6580" font-size="18" font-family="Helvetica, Arial" letter-spacing="2">VISÃO MENSAL INDISPONÍVEL</text>`;
    return;
  }
  const totalIn = monthData.reduce((s, d) => s + d.entradas, 0);
  const totalOut = monthData.reduce((s, d) => s + d.saidas, 0);
  const dailyRows = DATA.daily.filter(d => months.includes(d.month));
  const totalGrossOut = dailyRows.reduce((s, d) => s + (d.saidasBrutas ?? d.saidas), 0);
  const totalAdjust = dailyRows.reduce((s, d) => s + (d.ajustesGerenciais || 0), 0);
  const result = totalIn - totalOut;
  const maxMonthIn = monthData.reduce((acc, d) => d.entradas > acc.entradas ? d : acc, monthData[0]);
  const maxMonthOut = monthData.reduce((acc, d) => d.saidas > acc.saidas ? d : acc, monthData[0]);
  const projectionNote = months.every(isProjectionMonth) ? 'Período projetado conforme a planilha.' : (months.some(isProjectionMonth) ? 'Período misto: realizado + projeção.' : 'Período realizado conforme a planilha.');
  summary.innerHTML = `<div class="daily-stat"><div class="lbl">MESES EXIBIDOS</div><div class="val number">${monthData.length}</div></div>
    <div class="daily-stat"><div class="lbl">ENTRADAS TOTAIS</div><div class="val number-gold number" data-count-to="${totalIn}" data-prefix="R$ " data-divisor="1000000" data-suffix="M" data-decimals="2">R$ 0M</div></div>
    <div class="daily-stat"><div class="lbl">SAÍDAS GERENCIAIS</div><div class="val number" data-count-to="${totalOut}" data-prefix="R$ " data-divisor="1000000" data-suffix="M" data-decimals="2">R$ 0M</div></div>
    <div class="daily-stat"><div class="lbl">RESULTADO</div><div class="val number ${result >= 0 ? 'number-green' : 'number-red'}" data-count-to="${Math.abs(result)}" data-prefix="${result >= 0 ? '+R$ ' : '-R$ '}" data-divisor="1000000" data-suffix="M" data-decimals="2">R$ 0M</div></div>
    <div class="data-note"><strong>Conciliação:</strong> saídas gerenciais = saídas brutas (${fmtMoneyExact(totalGrossOut)}) - ajustes não gerenciais (${fmtMoneyExact(totalAdjust)}). Ajustes: Transferência entre Contas e Importação. ${projectionNote}</div>`;
  summary.querySelectorAll('[data-count-to]').forEach(el => { el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || ''); setTimeout(() => animateCount(el), 60); });

  const showIn = hasFlow('entradas'), showOut = hasFlow('saidas');
  const maxVal = Math.max(...monthData.map(d => Math.max(showIn ? d.entradas : 0, showOut ? d.saidas : 0)), 1);
  const chartHeight = 260, chartTop = 40, baseY = chartTop + chartHeight, startX = 80, endX = 1140;
  const n = monthData.length;
  const xFor = (i) => n === 1 ? (startX + endX) / 2 : startX + i * ((endX - startX) / (n - 1));
  let grid = '';
  for (let i = 0; i <= 5; i++) {
    const y = chartTop + chartHeight - (chartHeight * i / 5);
    const val = (maxVal * i / 5) / 1000000;
    grid += `<line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="#1F2440" stroke-width="1" stroke-dasharray="4 4"/>`;
    grid += `<text x="${startX - 12}" y="${y + 4}" text-anchor="end" fill="#5A6580" font-size="11" font-family="Helvetica, Arial">${val.toFixed(1)}M</text>`;
  }

  let labels = '';
  monthData.forEach((d, i) => {
    const x = xFor(i);
    const fill = d.projection ? '#94A0B8' : '#FFFFFF';
    labels += `<text x="${x}" y="${baseY + 28}" text-anchor="middle" fill="${fill}" font-size="11" font-family="Helvetica, Arial" font-weight="700" letter-spacing="1.5">${MONTH_NAMES_SHORT[d.month]}</text>`;
    labels += `<text x="${x}" y="${baseY + 44}" text-anchor="middle" fill="${d.resultado >= 0 ? '#10B981' : '#EF4444'}" font-size="9" font-family="Helvetica, Arial" font-weight="600">${formatSmallResult(d.resultado)}</text>`;
  });

  const pathFor = (field) => monthData.map((d, i) => {
    const x = xFor(i);
    const y = baseY - (d[field] / maxVal) * chartHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  const inPath = pathFor('entradas');
  const outPath = pathFor('saidas');

  let points = '';
  monthData.forEach((d, i) => {
    const x = xFor(i);
    const yIn = baseY - (d.entradas / maxVal) * chartHeight;
    const yOut = baseY - (d.saidas / maxVal) * chartHeight;
    const hoverW = n === 1 ? 80 : Math.max(34, (endX - startX) / Math.max(1, n - 1) * 0.7);
    points += `<g class="daily-day monthly-point" data-month="${d.month}" data-entradas="${d.entradas}" data-saidas="${d.saidas}" data-result="${d.resultado}">
      <rect x="${x - hoverW/2}" y="${chartTop}" width="${hoverW}" height="${chartHeight}" fill="transparent" class="day-hover"/>
      ${showIn ? `<circle data-flow="entradas" cx="${x}" cy="${yIn}" r="5" fill="#6366F1" stroke="${d === maxMonthIn ? '#FCD34D' : '#0A0E1A'}" stroke-width="${d === maxMonthIn ? 3 : 1.5}"/>` : ''}
      ${showOut ? `<circle data-flow="saidas" cx="${x}" cy="${yOut}" r="5" fill="#06B6D4" stroke="${d === maxMonthOut ? '#FCD34D' : '#0A0E1A'}" stroke-width="${d === maxMonthOut ? 3 : 1.5}"/>` : ''}
    </g>`;
  });
  const defs = `<defs><linearGradient id="monthlyInFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366F1" stop-opacity="0.22"/><stop offset="100%" stop-color="#6366F1" stop-opacity="0"/></linearGradient><linearGradient id="monthlyOutFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#06B6D4" stop-opacity="0.18"/><stop offset="100%" stop-color="#06B6D4" stop-opacity="0"/></linearGradient></defs>`;
  const areaPath = (path) => n > 1 ? path + ` L ${xFor(n - 1)} ${baseY} L ${xFor(0)} ${baseY} Z` : '';
  svg.innerHTML = `${defs}${grid}${showIn && n > 1 ? `<path d="${areaPath(inPath)}" fill="url(#monthlyInFill)"/>` : ''}${showOut && n > 1 ? `<path d="${areaPath(outPath)}" fill="url(#monthlyOutFill)"/>` : ''}${showIn ? `<path d="${inPath}" fill="none" stroke="#6366F1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}${showOut ? `<path d="${outPath}" fill="none" stroke="#06B6D4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}${points}${labels}`;
  svg.querySelectorAll('.monthly-point circle[data-flow]').forEach(c => c.addEventListener('click', (e) => { e.stopPropagation(); setFlow(c.dataset.flow); }));
  svg.querySelectorAll('.monthly-point').forEach(g => {
    const m = Number(g.dataset.month);
    g.addEventListener('click', () => { setSelectedMonths([m]); applyFilter(); });
    g.addEventListener('mousemove', (e) => {
      const entradas = parseFloat(g.dataset.entradas), saidas = parseFloat(g.dataset.saidas), result = parseFloat(g.dataset.result);
      showTip(MONTH_NAMES_LONG[m] + ' / 2026', [['Entradas', fmtMoneyExact(entradas)], ['Saídas gerenciais', fmtMoneyExact(saidas)], ['Resultado', (result >= 0 ? '+' : '') + fmtMoneyExact(result)]], e.clientX, e.clientY);
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
  const prev = m > 1 ? DATA.monthly[m - 1] : null;
  const margem = d.entradas > 0 ? d.resultado / d.entradas * 100 : 0;
  const cats = monthCategoryBreakdown(m);
  const topCats = cats.slice(0, 5);
  const prevResultDelta = prev ? d.resultado - prev.resultado : null;
  const topHtml = topCats.length ? topCats.map((c, i) => `
    <div class="month-cat-row">
      <div class="month-cat-rank">${String(i + 1).padStart(2, '0')}</div>
      <div class="month-cat-name">${c.name}</div>
      <div class="month-cat-val">${fmtMoneyFull(c.value)}</div>
      <div class="month-cat-pct">${fmtPct(c.pct)}</div>
    </div>`).join('') : '<div class="month-detail-reading">Sem saídas classificadas para este mês.</div>';

  return `<tr class="month-detail-row"><td colspan="6">
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
          <div class="month-detail-reading" style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border);">
            <strong>Variação vs. mês anterior:</strong><br>
            ${prev ? `Entradas: ${fmtDeltaAbs(d.entradas - prev.entradas)} (${fmtDeltaPct(d.entradas, prev.entradas)}).<br>Saídas: ${fmtDeltaAbs(d.saidas - prev.saidas)} (${fmtDeltaPct(d.saidas, prev.saidas)}).<br>Resultado: ${fmtDeltaAbs(prevResultDelta)} (${fmtDeltaPct(d.resultado, prev.resultado)}).` : 'Sem comparação anterior disponível.'}
          </div>
        </div>
      </div>
    </div>
  </td></tr>`;
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  let html = '';
  ALL_MONTHS.forEach(m => {
    const d = DATA.monthly[m];
    const isSelected = activePeriodMode === 'custom' && selectedMonths.includes(m);
    const isOpen = selectedMonthDetail === m;
    const isProj = isProjectionMonth(m);
    let rowCls = 'row-month';
    if (isSelected) rowCls += ' selected';
    if (isOpen) rowCls += ' open';
    if (isProj) rowCls += ' projection-row';
    const margem = d.entradas > 0 ? d.resultado / d.entradas * 100 : 0;
    const status = isProj ? 'forecast' : (d.resultado >= 0 ? 'surplus' : 'deficit');
    const statusText = isProj ? '◌ Projeção' : (d.resultado >= 0 ? '▲ Superávit' : '▼ Déficit');
    html += `<tr class="${rowCls}" data-row-month="${m}"><td><span class="month-cell"><span class="dot ${isProj ? 'proj-dot' : ''}"></span>${MONTH_NAMES_LONG[m].toUpperCase()}</span></td><td class="num">${fmtMoneyFull(d.entradas)}</td><td class="num">${fmtMoneyFull(d.saidas)}</td><td class="num ${d.resultado >= 0 ? 'number-green' : 'number-red'}">${d.resultado >= 0 ? '+' : ''}${fmtMoneyFull(d.resultado)}</td><td class="num ${d.resultado >= 0 ? '' : 'number-red'}">${fmtPct(margem)}</td><td><span class="status-pill ${status}">${statusText}</span></td></tr>`;
    if (isOpen) html += renderMonthDetailRow(m);
  });
  const realAgg = aggregate(REAL_MONTHS), fullAgg = aggregate(ALL_MONTHS), activeAgg = aggregate(selectedMonths);
  html += `<tr class="total-row"><td>SELECIONADO · ${periodLabelFor(selectedMonths, activePeriodMode)}</td><td class="num">${fmtMoneyFull(activeAgg.entradas)}</td><td class="num">${fmtMoneyFull(activeAgg.saidas)}</td><td class="num ${activeAgg.resultado >= 0 ? 'number-green' : 'number-red'}">${activeAgg.resultado >= 0 ? '+' : ''}${fmtMoneyFull(activeAgg.resultado)}</td><td class="num number-gold">${fmtPct(activeAgg.margem)}</td><td><span class="status-pill ${activeAgg.resultado >= 0 ? 'surplus' : 'deficit'}">${activeAgg.resultado >= 0 ? '▲ Superávit' : '▼ Déficit'}</span></td></tr>`;
  html += `<tr class="total-row" style="border-top:1px solid #2D3454;"><td>ACUMULADO · JAN—JUN <span style="font-size:9px;color:#FCD34D;letter-spacing:2px;margin-left:8px;">REAL</span></td><td class="num">${fmtMoneyFull(realAgg.entradas)}</td><td class="num">${fmtMoneyFull(realAgg.saidas)}</td><td class="num ${realAgg.resultado >= 0 ? 'number-green' : 'number-red'}">${realAgg.resultado >= 0 ? '+' : ''}${fmtMoneyFull(realAgg.resultado)}</td><td class="num number-gold">${fmtPct(realAgg.margem)}</td><td><span class="status-pill ${realAgg.resultado >= 0 ? 'surplus' : 'deficit'}">${realAgg.resultado >= 0 ? '▲ Superávit' : '▼ Déficit'}</span></td></tr>`;
  html += `<tr class="total-row" style="border-top:1px solid #2D3454;"><td>PROJEÇÃO ANUAL · 2026 <span style="font-size:9px;color:#6366F1;letter-spacing:2px;margin-left:8px;">REAL + PROJ.</span></td><td class="num">${fmtMoneyFull(fullAgg.entradas)}</td><td class="num">${fmtMoneyFull(fullAgg.saidas)}</td><td class="num ${fullAgg.resultado >= 0 ? 'number-green' : 'number-red'}">${fullAgg.resultado >= 0 ? '+' : ''}${fmtMoneyFull(fullAgg.resultado)}</td><td class="num">${fmtPct(fullAgg.margem)}</td><td><span class="status-pill ${fullAgg.resultado >= 0 ? 'surplus' : 'deficit'}">${fullAgg.resultado >= 0 ? '▲ Anual+' : '▼ Anual−'}</span></td></tr>`;
  tbody.innerHTML = html;
  tbody.querySelectorAll('.row-month').forEach(tr => tr.addEventListener('click', () => { selectedMonthDetail = selectedMonthDetail === Number(tr.dataset.rowMonth) ? null : Number(tr.dataset.rowMonth); renderTable(); }));
  tbody.querySelectorAll('[data-apply-month]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); setSelectedMonths([Number(btn.dataset.applyMonth)], 'custom'); applyFilter(); }));
  tbody.querySelectorAll('[data-close-month-detail]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); selectedMonthDetail = null; renderTable(); }));
}

// ─── INSIGHTS ───
function renderInsights() {
  const period = getActivePeriod();
  const categories = getCategoryBreakdown(period.months);
  let insights = [];
  if (period.months.length === 1) {
    const m = period.months[0], d = DATA.monthly[m], topCat = categories[0];
    const basisMonths = isProjectionMonth(m) ? REAL_MONTHS : REAL_MONTHS;
    const ranking = basisMonths.map(mm => ({ m:mm, res:DATA.monthly[mm].resultado })).sort((a,b) => b.res - a.res);
    const myRank = ranking.findIndex(r => r.m === m) + 1;
    const avgEntradas = basisMonths.reduce((s, mm) => s + DATA.monthly[mm].entradas, 0) / basisMonths.length;
    const vsAvg = avgEntradas ? (d.entradas - avgEntradas) / avgEntradas * 100 : 0;
    insights = [
      { cls:d.resultado >= 0 ? 'green':'red', eyebrow:isProjectionMonth(m) ? 'RESULTADO PROJETADO' : 'RESULTADO DO MÊS', month:MONTH_NAMES_LONG[m].toUpperCase() + ' / 2026', value:(d.resultado >= 0 ? '+' : '') + fmtMoney(d.resultado), valueCls:d.resultado >= 0 ? 'number-green':'number-red', desc:`${d.resultado >= 0 ? 'Superávit' : 'Déficit'} no mês com margem de ${fmtPct(d.entradas > 0 ? d.resultado / d.entradas * 100 : 0)}. ${isProjectionMonth(m) ? 'Leitura baseada em projeção; não entra no ranking de pior/melhor realizado.' : 'Leitura baseada em mês realizado.'}` },
      { cls:'', eyebrow:isProjectionMonth(m) ? 'BASE DE COMPARAÇÃO' : 'POSIÇÃO NO REALIZADO', month:'JAN — JUN / 2026 · REALIZADO', value:isProjectionMonth(m) ? 'N/A' : `${myRank}º / ${basisMonths.length}`, valueCls:'number-gold', desc:isProjectionMonth(m) ? 'Meses projetados não são classificados como melhor ou pior resultado realizado.' : `${MONTH_NAMES_LONG[m]} ocupa o ${myRank}º lugar entre os meses realizados.` },
      { cls:vsAvg >= 0 ? 'green':'red', eyebrow:'VS. MÉDIA REALIZADA', month:'COMPARATIVO JAN—JUN', value:(vsAvg >= 0 ? '+' : '') + fmtPct(vsAvg), valueCls:vsAvg >= 0 ? 'number-green':'number-red', desc:`Entradas ${vsAvg >= 0 ? 'acima' : 'abaixo'} da média mensal realizada de ${fmtMoney(avgEntradas)}.` },
      { cls:'cyan', eyebrow:'PRINCIPAL SAÍDA', month:'COMPOSIÇÃO DO MÊS', value:topCat ? fmtPct(topCat.pct) : '0.0%', valueCls:'', desc:topCat ? `${topCat.name} é a maior rubrica de saída do mês, com ${fmtMoneyExact(topCat.value)}.` : 'Sem saídas classificadas no período.' }
    ];
  } else {
    const realizedInSelection = period.months.filter(m => !isProjectionMonth(m));
    const bestWorstMonths = realizedInSelection.length ? realizedInSelection : REAL_MONTHS;
    const bestM = bestWorstMonths.reduce((acc,m) => DATA.monthly[m].resultado > DATA.monthly[acc].resultado ? m : acc, bestWorstMonths[0]);
    const worstM = bestWorstMonths.reduce((acc,m) => DATA.monthly[m].resultado < DATA.monthly[acc].resultado ? m : acc, bestWorstMonths[0]);
    const surplus = period.months.filter(m => DATA.monthly[m].resultado > 0).length;
    const top3Pct = categories.slice(0,3).reduce((s,c) => s + c.pct, 0);
    const compLabel = realizedInSelection.length ? 'NO FILTRO · SOMENTE REALIZADO' : 'JAN — JUN · REALIZADO';
    insights = [
      { cls:'green', eyebrow:'MELHOR RESULTADO REALIZADO', month:MONTH_NAMES_LONG[bestM].toUpperCase() + ' / 2026', value:(DATA.monthly[bestM].resultado >= 0 ? '+' : '') + fmtMoney(DATA.monthly[bestM].resultado), valueCls:DATA.monthly[bestM].resultado >= 0 ? 'number-green':'number-red', desc:`Melhor resultado entre meses realizados (${compLabel}). Projeções não entram neste ranking.` },
      { cls:DATA.monthly[worstM].resultado < 0 ? 'red':'green', eyebrow:'PIOR RESULTADO REALIZADO', month:MONTH_NAMES_LONG[worstM].toUpperCase() + ' / 2026', value:(DATA.monthly[worstM].resultado >= 0 ? '+' : '') + fmtMoney(DATA.monthly[worstM].resultado), valueCls:DATA.monthly[worstM].resultado < 0 ? 'number-red':'number-green', desc:DATA.monthly[worstM].resultado < 0 ? 'Ponto de atenção entre meses realizados: saídas gerenciais superaram entradas.' : 'Mesmo no pior mês realizado, o caixa se manteve positivo.' },
      { cls:'cyan', eyebrow:'DISTRIBUIÇÃO MENSAL', month:periodLabelFor(period.months, period.mode), value:`${surplus} / ${period.months.length}`, valueCls:'', desc:`${surplus} mês(es) operaram com superávit no período selecionado.` },
      { cls:'', eyebrow:'CONCENTRAÇÃO DE SAÍDAS', month:'TOP 3 CATEGORIAS', value:fmtPct(top3Pct), valueCls:'number-gold', desc:categories.length ? `${categories.slice(0,3).map(c => c.name).join(', ')} concentram a maior parte do desembolso gerencial.` : 'Sem saídas classificadas no período.' }
    ];
  }
  const grid = document.getElementById('insightsGrid');
  grid.innerHTML = insights.map(i => `<div class="insight-card ${i.cls}"><div class="insight-eyebrow">${i.eyebrow}</div><div class="insight-month">${i.month}</div><div class="insight-value ${i.valueCls}">${i.value}</div><div class="insight-desc">${i.desc}</div></div>`).join('');
}

// ─── HERO ───
function renderHero() {
  const period = getActivePeriod();
  const agg = aggregate(period.months);
  const periodEl = document.getElementById('heroPeriod');
  if (periodEl) periodEl.textContent = period.label;
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
  document.querySelectorAll('[data-period="year"]').forEach(p => p.classList.toggle('active', activePeriodMode === 'year'));
  document.querySelectorAll('[data-period="realized"]').forEach(p => p.classList.toggle('active', activePeriodMode === 'realized'));
  document.querySelectorAll('[data-period="projection"]').forEach(p => p.classList.toggle('active', activePeriodMode === 'projection'));
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

function renderMoMAnalysis() {
  const panel = document.getElementById('momPanel');
  const ctx = document.getElementById('momContext');
  if (!panel) return;
  const period = getActivePeriod();
  const months = normalizeMonths(period.months).sort((a,b) => a-b);
  if (ctx) ctx.textContent = `VARIAÇÃO VS. MÊS ANTERIOR · ${period.short}`;

  const metricCell = (current, previous, kind) => {
    const hasPrev = Number.isFinite(previous);
    const diff = hasPrev ? current - previous : 0;
    const pct = hasPrev && Math.abs(previous) > 0.01 ? diff / Math.abs(previous) * 100 : null;
    const isGood = kind === 'saidas' ? diff <= 0 : diff >= 0;
    const cls = !hasPrev || Math.abs(diff) < 0.01 ? '' : (isGood ? 'mom-positive' : 'mom-negative');
    const arrow = !hasPrev || Math.abs(diff) < 0.01 ? '→' : (diff > 0 ? '▲' : '▼');
    const pctTxt = pct === null ? 'sem base comparativa' : `${arrow} ${fmtMoneyFull(Math.abs(diff))} · ${fmtPct(Math.abs(pct))}`;
    return `<div class="mom-cell mom-value"><span class="mom-main">${fmtMoneyFull(current)}</span><span class="mom-delta ${cls}">${pctTxt}</span></div>`;
  };

  const rows = months.map(m => {
    const d = DATA.monthly[m];
    const prev = m > 1 ? DATA.monthly[m - 1] : null;
    const resultDiff = prev ? d.resultado - prev.resultado : 0;
    const saidaDiff = prev ? d.saidas - prev.saidas : 0;
    let note;
    if (!prev) {
      note = 'Mês inicial do exercício, sem base anterior para comparação.';
    } else if (Math.abs(resultDiff) < 0.01 && Math.abs(saidaDiff) < 0.01) {
      note = 'Sem variação relevante em relação ao mês anterior.';
    } else {
      const resWord = resultDiff >= 0 ? 'melhora' : 'piora';
      const outWord = saidaDiff >= 0 ? 'aumento' : 'redução';
      note = `Resultado apresentou ${resWord} de ${fmtMoneyFull(Math.abs(resultDiff))}; saídas tiveram ${outWord} de ${fmtMoneyFull(Math.abs(saidaDiff))}.`;
    }
    return `<div class="mom-row ${isProjectionMonth(m) ? 'projection' : ''}">
      <div class="mom-cell mom-month">${MONTH_NAMES_SHORT[m]}</div>
      ${metricCell(d.entradas, prev ? prev.entradas : NaN, 'entradas')}
      ${metricCell(d.saidas, prev ? prev.saidas : NaN, 'saidas')}
      ${metricCell(d.resultado, prev ? prev.resultado : NaN, 'resultado')}
      <div class="mom-cell mom-note">${note}${isProjectionMonth(m) ? ' <strong>◌ Projeção.</strong>' : ''}</div>
    </div>`;
  }).join('');

  panel.innerHTML = `<div class="mom-head"><div>Mês</div><div>Entradas</div><div>Saídas</div><div>Resultado</div><div>Leitura gerencial</div></div>${rows}`;
}


function forceVisibleDynamicBlocks() {
  ['momPanel', 'criticalAlerts'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('in-view');
  });
  document.querySelectorAll('.mom-panel, .critical-alerts-grid, .methodology-card, .month-detail-row').forEach(el => {
    el.classList.add('in-view');
  });
}

function applyFilter() {
  window.MarconiPerf?.start('filter-render');
  updateControls();
  const currentPage = document.body?.dataset?.page || 'cash';
  if (currentPage === 'cash') {
    const renderSteps = [renderHero, renderKPIs, renderExecutiveSummary, renderBarChart, renderResultChart, renderCriticalAlerts, renderDonut, renderRanking, renderTable];
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
