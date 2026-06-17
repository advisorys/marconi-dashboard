/* Marconi Dashboard application bundle. Source: src/js. Run: node tools/build.mjs
 * Build: 20260617171808
 * Mode: production
 */

/* ===== src/js/00-foundation.js ===== */

/* Marconi Dashboard application scripts
   Extracted from index.html. Blocks remain in original order to preserve behavior.
   Data is exposed by assets/bootstrap.js as window.DASHBOARD_DATA and legacy aliases. */

/* Explicit ready helper: app.js is loaded after async data fetch, so modules
   must run init callbacks even when DOMContentLoaded already fired. */
(function () {
  'use strict';
  if (window.onDashboardReady) return;

  window.onDashboardReady = function onDashboardReady(callback) {
    if (typeof callback !== 'function') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      queueMicrotask(function () {
        callback(new Event('DOMContentLoaded'));
      });
    }
  };
})();

/* Shared formatting and parsing helpers. */
(function () {
  'use strict';
  if (window.MarconiFormat) return;

  const BRL_FULL_FORMATTER = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  });
  const BRL_EXACT_FORMATTER = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function moneyShort(value) {
    const number = Number(value) || 0;
    if (Math.abs(number) >= 1000000) return (number >= 0 ? 'R$ ' : '-R$ ') + (Math.abs(number) / 1000000).toFixed(2) + 'M';
    if (Math.abs(number) >= 1000) return (number >= 0 ? 'R$ ' : '-R$ ') + (Math.abs(number) / 1000).toFixed(0) + 'K';
    return 'R$ ' + Math.round(number).toLocaleString('pt-BR');
  }

  function pct(value, decimals = 1) {
    const number = Number(value);
    return (Number.isFinite(number) ? number.toFixed(decimals) : (0).toFixed(decimals)) + '%';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (match) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match];
    });
  }

  function normalizeMonths(months) {
    const source = Array.isArray(months) ? months : [];
    const normalized = [...new Set(source.map(Number).filter(month => month >= 1 && month <= 12))].sort((a, b) => a - b);
    return normalized.length ? normalized : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }

  function parseMoneyNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = String(value || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // Fronteira realizado/projeção — lê o flag do dado (data-driven), com fallback legado m>=7.
  function monthProjectionFlag(month) {
    var m = Number(month);
    try {
      var dm = window.__DATA__ && window.__DATA__.monthly;
      var rec = dm && (dm[m] || dm[String(m)]);
      if (rec && typeof rec.projection === 'boolean') return rec.projection;
    } catch (e) {}
    return m >= 7;
  }
  // Mês corrente parcial ("em andamento") — flag opcional do dado; default false.
  function monthPartialFlag(month) {
    var m = Number(month);
    try {
      var dm = window.__DATA__ && window.__DATA__.monthly;
      var rec = dm && (dm[m] || dm[String(m)]);
      if (rec && typeof rec.partial === 'boolean') return rec.partial;
    } catch (e) {}
    return false;
  }

  window.MarconiFormat = {
    BRL_FULL_FORMATTER,
    BRL_EXACT_FORMATTER,
    moneyShort,
    moneyFull: value => BRL_FULL_FORMATTER.format(value),
    moneyExact: value => BRL_EXACT_FORMATTER.format(value),
    pct,
    escapeHtml,
    normalizeMonths,
    isProjectionMonth: monthProjectionFlag,
    isRealizedMonth: month => !monthProjectionFlag(month),
    isPartialMonth: monthPartialFlag,
    realizedMonths: () => { const o = []; for (let m = 1; m <= 12; m++) { if (!monthProjectionFlag(m)) o.push(m); } return o; },
    projectionMonths: () => { const o = []; for (let m = 1; m <= 12; m++) { if (monthProjectionFlag(m)) o.push(m); } return o; },
    parseMoneyNumber
  };
})();

/* Selo de status padronizado (E1) — componente reutilizável nas 4 páginas.
   Cada página alimenta com seu número-chave; o visual é idêntico em todas. */
(function () {
  'use strict';
  if (window.MarconiSeal) return;

  function esc(s) {
    return (window.MarconiFormat && window.MarconiFormat.escapeHtml)
      ? window.MarconiFormat.escapeHtml(String(s == null ? '' : s))
      : String(s == null ? '' : s);
  }

  // tone: 'good' | 'watch' | 'risk' | 'neutral'
  function render(host, opts) {
    var el = typeof host === 'string' ? document.getElementById(host) : host;
    if (!el) return;
    opts = opts || {};
    var tone = opts.tone || 'neutral';
    el.classList.add('status-seal');
    el.dataset.tone = tone;
    el.setAttribute('role', 'status');
    var label = esc(opts.label || 'STATUS DO PERÍODO');
    var verdict = esc(opts.verdict || '—');
    var metricVal = esc(opts.metricValue == null ? '' : opts.metricValue);
    var metricLbl = esc(opts.metricLabel || '');
    var desc = esc(opts.desc || '');
    var metricHtml = metricVal
      ? '<div class="status-seal-metric"><div class="status-seal-metric-val">' + metricVal + '</div>' +
        (metricLbl ? '<div class="status-seal-metric-lbl">' + metricLbl + '</div>' : '') + '</div>'
      : '';
    el.innerHTML =
      '<div class="status-seal-verdict"><span class="status-seal-eyebrow">' + label + '</span>' +
      '<strong class="status-seal-word">' + verdict + '</strong></div>' +
      metricHtml +
      (desc ? '<div class="status-seal-desc">' + desc + '</div>' : '');
    el.setAttribute('aria-label', (opts.label || 'Status') + ': ' + (opts.verdict || '') + '. ' + (opts.desc || ''));
  }

  window.MarconiSeal = { render: render };
})();

/* Shared motion helpers for final UI polish. */
(function () {
  'use strict';
  if (window.MarconiMotion) return;

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function easeOutCubic(progress) {
    const t = Math.max(0, Math.min(1, Number(progress) || 0));
    return 1 - Math.pow(1 - t, 3);
  }

  function countUpGroup(entries, options) {
    const list = (entries || []).filter(function (entry) {
      return entry && entry.element && typeof entry.render === 'function';
    });
    if (!list.length) return '';

    const opts = options || {};
    const duration = Math.max(120, Number(opts.duration) || 850);
    const className = opts.className || 'v67-counting';
    const tokenKey = opts.tokenKey || '__marconiCountUpToken';
    const token = String(Date.now()) + Math.random().toString(16).slice(2);
    window[tokenKey] = token;

    if (prefersReducedMotion()) {
      list.forEach(function (entry) {
        entry.element.textContent = entry.final != null ? entry.final : entry.render(entry.to || 0);
        entry.element.classList.remove(className);
        if (typeof entry.done === 'function') entry.done(entry.element);
      });
      return token;
    }

    list.forEach(function (entry) {
      entry.element.classList.add(className);
      entry.element.textContent = entry.render(Number(entry.from) || 0);
    });

    const started = performance.now();
    let finished = false;
    let fallbackTimer = 0;

    function clearFallback() {
      if (fallbackTimer) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = 0;
      }
    }

    function tick(now) {
      if (finished) return;
      if (window[tokenKey] !== token) {
        clearFallback();
        return;
      }
      const progress = Math.min(1, (now - started) / duration);
      const eased = easeOutCubic(progress);

      list.forEach(function (entry) {
        if (!document.documentElement.contains(entry.element)) return;
        const from = Number(entry.from) || 0;
        const to = Number(entry.to) || 0;
        const value = from + (to - from) * eased;
        entry.element.textContent = progress >= 1 && entry.final != null ? entry.final : entry.render(value);
        if (progress >= 1) {
          entry.element.classList.remove(className);
          if (typeof entry.done === 'function') entry.done(entry.element);
        }
      });

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        finished = true;
        clearFallback();
      }
    }
    fallbackTimer = window.setInterval(function() { tick(performance.now()); }, 48);
    window.requestAnimationFrame(tick);
    return token;
  }

  window.MarconiMotion = {
    prefersReducedMotion,
    easeOutCubic,
    countUpGroup
  };
})();

/* Lightweight app events and performance marks for safer cross-module hooks. */
(function () {
  'use strict';
  if (!window.MarconiEvents) {
    const prefix = 'marconi:';
    window.MarconiEvents = {
      emit(name, detail) {
        if (!name || typeof CustomEvent !== 'function') return false;
        document.dispatchEvent(new CustomEvent(prefix + name, {
          detail: detail || {},
          bubbles: false
        }));
        return true;
      },
      on(name, handler, options) {
        if (!name || typeof handler !== 'function') return function noop() {};
        const eventName = prefix + name;
        document.addEventListener(eventName, handler, options);
        return function unsubscribe() {
          document.removeEventListener(eventName, handler, options);
        };
      }
    };
  }

  if (window.MarconiPerf) return;

  function supported() {
    return !!(window.performance && typeof performance.mark === 'function');
  }

  function mark(name) {
    if (!supported() || !name) return false;
    try {
      performance.mark('marconi:' + name);
      return true;
    } catch (e) {
      return false;
    }
  }

  function start(name) {
    return mark(name + ':start');
  }

  function end(name, detail) {
    if (!supported() || !name) return false;
    const startName = 'marconi:' + name + ':start';
    const endName = 'marconi:' + name + ':end';
    try {
      performance.mark(endName);
      performance.measure('marconi:' + name, startName, endName);
      if (window.MarconiEvents) {
        window.MarconiEvents.emit('perf:measure', { name, detail: detail || {} });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  window.MarconiPerf = { mark, start, end };
})();

/* ===== src/js/10-cashflow.js ===== */

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

/* ===== src/js/20-interactions.js ===== */

/* ===== v23-advanced-interactions-script ===== */
(function(){
  'use strict';
  const V23 = {
    rankSort: 'value',
    tableSort: { key: null, dir: 'desc' },
    compareMonths: [],
    compareCats: [],
    pinnedTip: false,
    filterBusy: false
  };
  window.V23 = V23;

  const monthNameFromTitle = (title) => {
    if (!title) return null;
    for (const m of ALL_MONTHS) if ((title + '').toLowerCase().includes(MONTH_NAMES_LONG[m].toLowerCase())) return m;
    return null;
  };
  const safe = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parseMoneyNumber = (txt) => {
    const raw = String(txt || '').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',', '.');
    const n = parseFloat(raw); return Number.isFinite(n) ? n : 0;
  };

  function setButtonLike(el, fn){
    if (!el || el.dataset.v23Ready) return;
    el.dataset.v23Ready = '1'; el.setAttribute('role','button'); el.setAttribute('tabindex','0');
    el.addEventListener('click', fn);
    el.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fn(e); } });
  }

  // ── Ranking override with dynamic sorting ──
  const colors = ['#6366F1','#06B6D4','#10B981','#F59E0B','#EF4444','#A855F7','#EC4899','#84CC16','#14B8A6','#5A6580'];

  function rankStats(c, period){
    const full = getCategoryByName(c.name);
    const values = period.months.map(m => ({ month:m, value: full?.months?.[m] || 0 })).filter(x => x.value > 0.01);
    const recurrence = values.length;
    const peakRow = values.reduce((best, x) => x.value > best.value ? x : best, { month:null, value:0 });
    const concentration = c.value > 0 ? peakRow.value / c.value * 100 : 0;
    return { recurrence, peakMonth: peakRow.month, peakValue: peakRow.value, concentration };
  }

  function rankMetricHtml(c, period){
    const st = rankStats(c, period);
    const sort = V23.rankSort || 'value';
    if (sort === 'pct') return `<div class="main">${fmtPct(c.pct)}</div><div class="sub">do período</div>`;
    if (sort === 'peak') return `<div class="main">${fmtMoney(st.peakValue)}</div><div class="sub">pico em ${st.peakMonth ? MONTH_NAMES_SHORT[st.peakMonth] : '—'}</div>`;
    if (sort === 'recurrence') return `<div class="main">${st.recurrence}/${period.months.length}</div><div class="sub">meses com ocorrência</div>`;
    if (sort === 'concentration') return `<div class="main">${fmtPct(st.concentration)}</div><div class="sub">em ${st.peakMonth ? MONTH_NAMES_SHORT[st.peakMonth] : '—'}</div>`;
    return `<div class="main">${fmtMoney(c.value)}</div><div class="sub">valor no período</div>`;
  }

  function rankSortScore(c, period){
    const st = rankStats(c, period);
    const sort = V23.rankSort || 'value';
    if (sort === 'pct') return c.pct;
    if (sort === 'peak') return st.peakValue;
    if (sort === 'recurrence') return st.recurrence + (c.value / 1e12);
    if (sort === 'concentration') return st.concentration + (st.peakValue / 1e12);
    return c.value;
  }

  function rankBarWidth(c, categories, period){
    const sort = V23.rankSort || 'value';
    if (sort === 'concentration') return Math.max(rankStats(c, period).concentration, c.value > 0 ? 2 : 0);
    const maxScore = Math.max(...categories.map(x => rankSortScore(x, period)), 1);
    return maxScore > 0 ? Math.max(rankSortScore(c, period) / maxScore * 100, c.value > 0 ? 1.5 : 0) : 0;
  }

  function sortedCategoriesForPeriod(period){
    let categories = getCategoryBreakdown(period.months);
    categories = [...categories].sort((a,b) => {
      const diff = rankSortScore(b, period) - rankSortScore(a, period);
      return Math.abs(diff) > 0.00001 ? diff : b.value - a.value;
    });
    return categories;
  }

  renderRanking = function(){
    const list = document.getElementById('rankList');
    if (!list) return;
    const externalDetail = document.getElementById('categoryDetail');
    if (externalDetail) { externalDetail.classList.remove('show'); externalDetail.innerHTML = ''; }
    const period = getActivePeriod();
    if (selectedFlow === 'entradas') {
      selectedCategoryName = null;
      list.innerHTML = `<div class="empty-state"><strong>Composição indisponível para entradas.</strong><br>O ranking desta seção classifica apenas saídas gerenciais por rubrica. Selecione <strong>SAÍDAS</strong> ou <strong>AMBOS</strong> para visualizar o detalhamento.</div>`;
      return;
    }
    const categories = sortedCategoriesForPeriod(period);
    const htmlParts = [];
    categories.slice(0, 10).forEach((c, i) => {
      const barWidth = rankBarWidth(c, categories, period).toFixed(1) + '%';
      const color = colors[i] || '#5A6580';
      const activeCls = selectedCategoryName === c.name ? ' active' : '';
      const safeName = safe(c.name);
      htmlParts.push(`<div class="rank-item v35-sorted v35-sort-refresh${activeCls}" style="--cat-color:${color};--rank-delay:${i};" data-rank-idx="${i}" data-cat-name="${safeName}" data-cat-value="${c.value}" data-cat-pct="${c.pct}" title="Clique para abrir o detalhamento mensal" aria-label="Abrir detalhamento mensal de ${safeName}">
        <div class="rank-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="rank-name">${safeName.toUpperCase()}<div class="bar"><div class="bar-fill" style="--bar-width:${barWidth};width:${barWidth};"></div></div></div>
        <div class="v35-rank-row-metric">${rankMetricHtml(c, period)}</div>
        <div class="rank-pct number">${fmtPct(c.pct)}</div>
        <button type="button" class="v23-compare-btn" data-compare-cat="${safeName}" title="Comparar categoria">cmp</button>
        <div class="rank-action" aria-hidden="true">›</div>
      </div>`);
      if (selectedCategoryName === c.name) {
        const fullCat = getCategoryByName(c.name);
        if (fullCat) htmlParts.push(`<div class="category-detail show inline-category-detail" style="--cat-color:${color};" aria-live="polite">${categoryDetailInnerHtml(fullCat, period, color)}</div>`);
      }
    });
    list.innerHTML = htmlParts.join('');
    list.querySelectorAll('.rank-item').forEach((item, i) => {
      if (typeof intObs !== 'undefined') intObs.observe(item);
      item.style.animationDelay = `${Math.min(i, 8) * 28}ms`;
      item.addEventListener('mouseenter', () => { highlightCategory(item.dataset.catName); document.querySelectorAll('.donut-slice').forEach((s, idx) => { const donutIdx = i < 6 ? i : 6; if (idx !== donutIdx) s.classList.add('dim'); }); });
      item.addEventListener('mouseleave', () => { clearContext(); document.querySelectorAll('.donut-slice').forEach(s => s.classList.remove('dim')); });
      item.addEventListener('click', e => {
        if (e.target.closest('.v23-compare-btn')) return;
        const name = item.dataset.catName;
        const color = getComputedStyle(item).getPropertyValue('--cat-color').trim() || '#6366F1';
        selectCategory(name, color);
      });
    });
    list.querySelectorAll('.v23-compare-btn').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); toggleCompareCat(btn.dataset.compareCat); }));
    list.querySelectorAll('.category-close').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); selectedCategoryName = null; selectedCategoryColor = '#6366F1'; renderRanking(); decorateAfterRender(); }));
    const inlineDetail = list.querySelector('.inline-category-detail');
    if (inlineDetail) setTimeout(() => inlineDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    addRankingToolbar();
  };


  // ── Tooltip: advanced + pinned ──
  const originalShowTip = showTip;
  const originalHideTip = hideTip;
  showTip = function(title, rows, x, y){
    if (V23.pinnedTip) return;
    originalShowTip(title, rows, x, y);
    enrichTooltip(title);
  };
  hideTip = function(){ if (!V23.pinnedTip) originalHideTip(); };
  function enrichTooltip(title){
    const tt = document.getElementById('tooltip'); const body = document.getElementById('ttBody');
    if (!tt || !body) return;
    const m = monthNameFromTitle(title);
    if (m) body.insertAdjacentHTML('beforeend', microSpark(m));
    body.insertAdjacentHTML('beforeend', '<div class="v23-tooltip-foot">Clique no tooltip para fixar · ESC para soltar</div>');
  }
  function microSpark(activeM){
    const vals = REAL_MONTHS.map(m => DATA.monthly[m].resultado);
    const max = Math.max(...vals.map(v=>Math.abs(v)),1), W=210,H=34, mid=17;
    const pts = REAL_MONTHS.map((m,i)=> `${12+i*(W-24)/(REAL_MONTHS.length-1)},${mid-(DATA.monthly[m].resultado/max)*14}`).join(' ');
    const dots = REAL_MONTHS.map((m,i)=> `<circle cx="${12+i*(W-24)/(REAL_MONTHS.length-1)}" cy="${mid-(DATA.monthly[m].resultado/max)*14}" r="${m===activeM?3.8:2}" fill="${m===activeM?'#FCD34D':'#6366F1'}"/>`).join('');
    return `<svg class="v23-mini-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="#2D3454"/><polyline points="${pts}" fill="none" stroke="#6366F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
  }
  document.addEventListener('click', e => {
    const tt = document.getElementById('tooltip');
    if (tt && tt.contains(e.target)) { V23.pinnedTip = !V23.pinnedTip; tt.classList.toggle('v23-pinned', V23.pinnedTip); }
  });
  document.addEventListener('keydown', e => { if(e.key==='Escape') { V23.pinnedTip=false; const tt=document.getElementById('tooltip'); if(tt){tt.classList.remove('v23-pinned'); originalHideTip();} }});

  // ── Enhanced apply filter: View Transition + skeleton + post decoration ──
  const originalApplyFilter = applyFilter;
  applyFilter = function(){
    const run = () => { document.body.classList.add('v23-loading'); originalApplyFilter(); requestAnimationFrame(() => { decorateAfterRender(); setTimeout(()=>document.body.classList.remove('v23-loading'), 220); }); };
    if (document.startViewTransition && !V23.filterBusy) {
      V23.filterBusy = true;
      document.startViewTransition(run).finished.finally(() => { V23.filterBusy = false; });
    } else run();
  };

  function decorateAfterRender(){
    updateDynamicBackground();
    addStagger();
    addRankingToolbar();
    setupCrossfilter();
    setupTableSort();
    sortTableRows();
    renderCompareDock();
    wireInsights();
    pulseAlerts();
    wireCompareButtons();
  }
  function updateDynamicBackground(){
    try {
      const agg = aggregate(getActivePeriod().months);
      document.body.classList.toggle('v23-positive', agg.resultado > 0);
      document.body.classList.toggle('v23-negative', agg.resultado < 0);
      document.body.classList.toggle('v23-neutral', agg.resultado === 0);
    } catch(e){}
  }
  let dynamicPointerFrame = 0;
  let dynamicPointerX = 50;
  let dynamicPointerY = 50;
  document.addEventListener('mousemove', e => {
    dynamicPointerX = e.clientX / window.innerWidth * 100;
    dynamicPointerY = e.clientY / window.innerHeight * 100;
    if (dynamicPointerFrame) return;
    dynamicPointerFrame = requestAnimationFrame(() => {
      dynamicPointerFrame = 0;
      document.body.style.setProperty('--mx', dynamicPointerX.toFixed(1) + '%');
      document.body.style.setProperty('--my', dynamicPointerY.toFixed(1) + '%');
    });
  }, { passive: true });
  function addStagger(){
    document.querySelectorAll('.kpi-grid,.executive-summary-grid,.result-summary-strip,.critical-alerts-grid,.insights-grid,.rank-list,.hero-stats').forEach(group=>{
      group.classList.add('v23-stagger'); [...group.children].forEach((el,i)=>el.style.setProperty('--stagger', Math.min(i,12)));
    });
  }

  function addRankingToolbar(){
    const list = document.getElementById('rankList'); if(!list) return; const existingToolbar = document.getElementById('v23RankToolbar'); if(existingToolbar){ existingToolbar.querySelectorAll('[data-rank-sort]').forEach(b=>b.classList.toggle('active', b.dataset.rankSort===V23.rankSort)); return; }
    const bar = document.createElement('div'); bar.id='v23RankToolbar'; bar.className='v23-rank-toolbar';
    bar.innerHTML = `<div class="label">Ordenar ranking</div><div class="v23-chipset">
      <button class="v23-chip" data-rank-sort="value">Valor</button><button class="v23-chip" data-rank-sort="pct">Participação</button><button class="v23-chip" data-rank-sort="peak">Pico mensal</button><button class="v23-chip" data-rank-sort="recurrence">Recorrência</button><button class="v23-chip" data-rank-sort="concentration">Concentração</button>
    </div>`;
    list.parentNode.insertBefore(bar, list);
    bar.querySelectorAll('[data-rank-sort]').forEach(b=>setButtonLike(b,()=>{V23.rankSort=b.dataset.rankSort; renderRanking(); decorateAfterRender();}));
    bar.querySelectorAll('[data-rank-sort]').forEach(b=>b.classList.toggle('active', b.dataset.rankSort===V23.rankSort));
  }

  function setupTableSort(){
    const table = document.querySelector('#table .data-table table'); if(!table) return;
    const labels = ['month','entradas','saidas','resultado','margem','status'];
    table.querySelectorAll('thead th').forEach((th,i)=>{
      if (th.dataset.v23Sort) return;
      th.dataset.v23Sort = labels[i];
      th.addEventListener('click', () => {
        const key = th.dataset.v23Sort; if(!key || key==='status') return;
        if (V23.tableSort.key === key) V23.tableSort.dir = V23.tableSort.dir === 'asc' ? 'desc' : 'asc';
        else { V23.tableSort.key = key; V23.tableSort.dir = key==='month' ? 'asc' : 'desc'; }
        selectedMonthDetail = null;
        renderTable(); decorateAfterRender();
      });
    });
    table.querySelectorAll('thead th').forEach(th=>{ th.classList.toggle('v23-sort-active', th.dataset.v23Sort===V23.tableSort.key); th.setAttribute('data-dir', V23.tableSort.dir==='asc'?'↑':'↓'); });
  }
  function sortTableRows(){
    if(!V23.tableSort.key) return;
    const tbody = document.getElementById('tableBody'); if(!tbody) return;
    const rows = [...tbody.querySelectorAll('tr.row-month')]; if(!rows.length) return;
    const totals = [...tbody.querySelectorAll('tr.total-row')];
    rows.sort((a,b)=>{
      const ma=Number(a.dataset.rowMonth), mb=Number(b.dataset.rowMonth);
      let va=ma, vb=mb;
      if(V23.tableSort.key==='entradas'){va=DATA.monthly[ma].entradas; vb=DATA.monthly[mb].entradas;}
      if(V23.tableSort.key==='saidas'){va=DATA.monthly[ma].saidas; vb=DATA.monthly[mb].saidas;}
      if(V23.tableSort.key==='resultado'){va=DATA.monthly[ma].resultado; vb=DATA.monthly[mb].resultado;}
      if(V23.tableSort.key==='margem'){va=DATA.monthly[ma].entradas ? DATA.monthly[ma].resultado/DATA.monthly[ma].entradas : -999; vb=DATA.monthly[mb].entradas ? DATA.monthly[mb].resultado/DATA.monthly[mb].entradas : -999;}
      return V23.tableSort.dir==='asc' ? va-vb : vb-va;
    });
    [...tbody.children].forEach(ch=>{ if(!ch.classList.contains('total-row')) ch.remove(); });
    rows.forEach(r=>tbody.insertBefore(r, totals[0] || null));
  }

  function setupCrossfilter(){
    document.querySelectorAll('[data-month], [data-row-month]').forEach(el=>{
      if(el.dataset.v23Cross) return; el.dataset.v23Cross='1';
      el.addEventListener('mouseenter', () => highlightMonth(Number(el.dataset.month || el.dataset.rowMonth)));
      el.addEventListener('mouseleave', clearContext);
    });
  }
  function highlightMonth(m){
    if(!m) return;
    document.querySelectorAll('[data-month], [data-row-month]').forEach(el=>{
      const em = Number(el.dataset.month || el.dataset.rowMonth);
      el.classList.toggle('v23-context', em === m);
    });
  }
  function highlightCategory(name){
    document.querySelectorAll('.rank-item, .heatmap-name').forEach(el=> el.classList.toggle('v23-context', el.dataset.catName === name));
  }
  function clearContext(){ document.querySelectorAll('.v23-context').forEach(el=>el.classList.remove('v23-context')); }

  function toggleCompareMonth(m){
    V23.compareMonths = V23.compareMonths.includes(m) ? V23.compareMonths.filter(x=>x!==m) : [...V23.compareMonths, m].slice(-2);
    renderCompareDock();
  }
  function toggleCompareCat(name){
    V23.compareCats = V23.compareCats.includes(name) ? V23.compareCats.filter(x=>x!==name) : [...V23.compareCats, name].slice(-2);
    renderCompareDock();
  }
  function wireCompareButtons(){
    document.querySelectorAll('tr.row-month .month-cell').forEach(cell=>{
      if(cell.querySelector('.v23-compare-btn')) return;
      const tr = cell.closest('tr'); const m=Number(tr?.dataset.rowMonth); if(!m) return;
      const btn=document.createElement('button'); btn.type='button'; btn.className='v23-compare-btn'; btn.textContent='cmp'; btn.title='Comparar mês';
      btn.addEventListener('click',e=>{ e.stopPropagation(); toggleCompareMonth(m); }); cell.appendChild(btn);
    });
  }
  function renderCompareDock(){
    let dock = document.getElementById('v23CompareDock');
    if(!dock){ dock=document.createElement('aside'); dock.id='v23CompareDock'; dock.className='v23-compare-dock'; document.body.appendChild(dock); }
    const show = V23.compareMonths.length || V23.compareCats.length;
    dock.classList.toggle('show', !!show); if(!show) return;
    let cards='';
    V23.compareMonths.forEach(m=>{ const d=DATA.monthly[m]; cards += `<div class="v23-compare-card"><div class="mini">Mês</div><h4>${MONTH_NAMES_LONG[m]}</h4><div class="v23-compare-row"><span>Entradas</span><strong>${fmtMoneyFull(d.entradas)}</strong></div><div class="v23-compare-row"><span>Saídas</span><strong>${fmtMoneyFull(d.saidas)}</strong></div><div class="v23-compare-row"><span>Resultado</span><strong class="${d.resultado>=0?'number-green':'number-red'}">${d.resultado>=0?'+':''}${fmtMoneyFull(d.resultado)}</strong></div></div>`; });
    V23.compareCats.forEach(name=>{ const c=getCategoryByName(name); if(!c) return; const period=getActivePeriod(); const val=period.months.reduce((s,m)=>s+(c.months?.[m]||0),0); const peakM=ALL_MONTHS.reduce((a,m)=>(c.months?.[m]||0)>(c.months?.[a]||0)?m:a,1); cards += `<div class="v23-compare-card"><div class="mini">Categoria</div><h4>${safe(name)}</h4><div class="v23-compare-row"><span>Período</span><strong>${fmtMoneyFull(val)}</strong></div><div class="v23-compare-row"><span>Total 2026</span><strong>${fmtMoneyFull(c.value)}</strong></div><div class="v23-compare-row"><span>Pico</span><strong>${MONTH_NAMES_SHORT[peakM]} · ${fmtMoney(c.months?.[peakM]||0)}</strong></div></div>`; });
    dock.innerHTML = `<div class="v23-compare-head"><strong>Comparativo fixado</strong><button class="v23-chip" id="v23ClearCompare">Limpar</button></div><div class="v23-compare-grid">${cards}</div>`;
    document.getElementById('v23ClearCompare')?.addEventListener('click',()=>{V23.compareMonths=[]; V23.compareCats=[]; renderCompareDock();});
  }

  function wireInsights(){
    document.querySelectorAll('.insight-card, .critical-alert-card, .mini-alert').forEach(card=>{
      if(card.dataset.v23Click) return; card.dataset.v23Click='1';
      card.addEventListener('click',()=>{
        const txt=card.textContent || '';
        const m=monthNameFromTitle(txt);
        if(m){ setSelectedMonths([m], 'custom'); applyFilter(); document.getElementById('table')?.scrollIntoView({behavior:'smooth', block:'start'}); return; }
        const cat=(DATA.categoryMonthly||DATA.categories).find(c=>txt.toLowerCase().includes(c.name.toLowerCase()));
        if(cat){ selectedCategoryName=cat.name; renderRanking(); document.getElementById('categories')?.scrollIntoView({behavior:'smooth', block:'start'}); }
      });
    });
  }
  function pulseAlerts(){
    document.querySelectorAll('.critical-alert-card, .mini-alert').forEach(card=>{
      const txt=(card.textContent||'').toLowerCase();
      card.classList.toggle('v23-pulse', txt.includes('atenção') || txt.includes('déficit') || txt.includes('acima da média') || txt.includes('consumo'));
    });
  }


  // initial boot after original init
  onDashboardReady(() => { setTimeout(decorateAfterRender, 180); });
})();

/* ===== src/js/30-export-loader.js ===== */

/* ===== export-lazy-loader ===== */
(function() {
  'use strict';

  const EXPORT_VERSION = window.DASHBOARD_ASSET_VERSION || 'local';
  const EXPORT_SCRIPT_URL = 'assets/export.js?v=' + encodeURIComponent(EXPORT_VERSION);
  const EXPORT_STYLE_URL = 'assets/export.css?v=' + encodeURIComponent(EXPORT_VERSION);
  let exportModulePromise = null;
  let exportStylePromise = null;

  function loadExportStyles() {
    if (document.querySelector('link[data-dashboard-export-css]')) return Promise.resolve();
    if (!exportStylePromise) {
      exportStylePromise = new Promise(function(resolve, reject) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = EXPORT_STYLE_URL;
        link.dataset.dashboardExportCss = 'true';
        link.onload = resolve;
        link.onerror = function() { reject(new Error('Falha ao carregar ' + EXPORT_STYLE_URL)); };
        document.head.appendChild(link);
      });
    }
    return exportStylePromise;
  }

  function loadExportModule() {
    if (typeof window.exportToPPTX === 'function' || typeof window.buildPrintReportV27 === 'function') {
      return Promise.resolve();
    }
    if (!exportModulePromise) {
      exportModulePromise = loadExportStyles().then(function() {
        return new Promise(function(resolve, reject) {
          const script = document.createElement('script');
          script.src = EXPORT_SCRIPT_URL;
          script.async = false;
          script.onload = resolve;
          script.onerror = function() { reject(new Error('Falha ao carregar ' + EXPORT_SCRIPT_URL)); };
          document.head.appendChild(script);
        });
      });
    }
    return exportModulePromise;
  }

  function setExportButtonLoading(isLoading) {
    const btn = document.getElementById('printDashboard');
    if (!btn) return;
    if (!btn.dataset.exportOriginalHtml) {
      btn.dataset.exportOriginalHtml = btn.innerHTML.replace(/EXPORTAR\s*PDF/i, 'EXPORTAR APRESENTA\u00c7\u00c3O');
    }
    btn.disabled = !!isLoading;
    btn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    btn.innerHTML = isLoading ? 'Carregando exporta\u00e7\u00e3o...' : btn.dataset.exportOriginalHtml;
  }

  async function runDashboardExport(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    setExportButtonLoading(true);
    try {
      await loadExportModule();
      setExportButtonLoading(false);
      if (typeof window.exportToPPTX === 'function') {
        return window.exportToPPTX();
      }
      if (typeof window.buildPrintReportV27 === 'function') {
        window.buildPrintReportV27();
      }
      return window.print();
    } catch (error) {
      console.error('[Export] Falha ao carregar exportador:', error);
      setExportButtonLoading(false);
      window.alert('N\u00e3o foi poss\u00edvel carregar a exporta\u00e7\u00e3o. Tente novamente.');
    }
  }

  async function runCouncilPackageExport(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    const btn = document.getElementById('councilExport');
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      if (!btn.dataset.councilOriginalHtml) btn.dataset.councilOriginalHtml = btn.innerHTML;
      btn.innerHTML = 'Montando pacote...';
    }
    try {
      await loadExportModule();
      if (btn) {
        btn.disabled = false;
        btn.setAttribute('aria-busy', 'false');
        if (btn.dataset.councilOriginalHtml) btn.innerHTML = btn.dataset.councilOriginalHtml;
      }
      if (typeof window.runCouncilExport === 'function') {
        return window.runCouncilExport(event);
      }
      if (typeof window.buildCouncilReportV1 === 'function') {
        window.buildCouncilReportV1();
        document.body.classList.add('council-export-active');
      }
      return window.print();
    } catch (error) {
      console.error('[Export] Falha ao carregar pacote do conselho:', error);
      if (btn) {
        btn.disabled = false;
        btn.setAttribute('aria-busy', 'false');
        if (btn.dataset.councilOriginalHtml) btn.innerHTML = btn.dataset.councilOriginalHtml;
      }
      window.alert('N\u00e3o foi poss\u00edvel carregar o pacote do conselho. Tente novamente.');
    }
  }

  function prepareExportButton() {
    const btn = document.getElementById('printDashboard');
    if (btn && btn.dataset.lazyExportReady !== 'true') {
      btn.dataset.lazyExportReady = 'true';
      btn.innerHTML = btn.innerHTML.replace(/EXPORTAR\s*PDF/i, 'EXPORTAR APRESENTA\u00c7\u00c3O');
      btn.setAttribute('aria-label', 'Exportar apresentacao executiva');
      btn.addEventListener('click', runDashboardExport, true);
      btn.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') runDashboardExport(event);
      }, true);
    }
    const council = document.getElementById('councilExport');
    if (council && council.dataset.lazyCouncilReady !== 'true') {
      council.dataset.lazyCouncilReady = 'true';
      council.setAttribute('aria-label', 'Exportar pacote do conselho em PDF consolidado');
      council.addEventListener('click', runCouncilPackageExport, true);
      council.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') runCouncilPackageExport(event);
      }, true);
    }
  }

  window.loadDashboardExportModule = loadExportModule;
  window.runDashboardExport = runDashboardExport;
  window.runCouncilPackageExport = runCouncilPackageExport;
  window.prepareDashboardExportButton = prepareExportButton;
  onDashboardReady(prepareExportButton);
})();

/* ===== src/js/40-fixed-director.js ===== */

/* ===== script-7 ===== */
/* ━━━ V36 · Dados e renderização de Custos Fixos ━━━ */
const FIXED_COST_DATA = window.__FIXED_COST_DATA__ || {};


(function initFixedCostsPage() {
  window.FIXED_COST_DATA = FIXED_COST_DATA; /* V42: expor para o painel de foco encontrar itens */
  const fixedMoneyFormatter = window.MarconiFormat?.moneyFull || new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:0}).format;
  function escHtml(v) { return window.MarconiFormat.escapeHtml(v); }  /* dedup: usa o canônico (00-foundation) */
  function fixedMoney(v) {
    try { return fixedMoneyFormatter(v || 0); } catch(e) { return fmtMoneyFull(v || 0); }
  }
  function fixedPct(v) {
    try { return fmtPct(v || 0); } catch(e) { return `${(v||0).toFixed(1)}%`; }
  }
  function fixedKpiFinal(k) {
    if (k.pct) return fixedPct(k.value);
    return `${k.signed && k.value >= 0 ? '+' : ''}${fixedMoney(k.value)}`;
  }
  function fixedKpiInitial(k) {
    if (k.pct) return '0.0%';
    if (k.signed && k.value > 0) return '+R$ 0';
    return 'R$ 0';
  }
  function fixedKpiAnimatedValue(k, value) {
    if (k.pct) return fixedPct(value);
    return `${k.signed && value >= 0 ? '+' : ''}${fixedMoney(value)}`;
  }
  function animateFixedKpiCards(root, kpis) {
    if (!root || !kpis || !kpis.length) return;
    const values = [...root.querySelectorAll('.fixed-kpi .val')];
    if (!values.length) return;
    const token = String(Date.now()) + Math.random().toString(16).slice(2);
    window.__fixedKpiCountupToken = token;

    values.forEach((el, index) => {
      const k = kpis[index];
      if (!k) return;
      const final = fixedKpiFinal(k);
      el.dataset.v41Final = final;
      el.dataset.v67Final = final;
      el.dataset.v41Done = final;
      el.dataset.v67Done = final;
      el.dataset.counterDone = '1';
      el.dataset.v41Busy = '0';
      el.textContent = fixedKpiAnimatedValue(k, 0);
    });

    function rootIsVisible() {
      const section = root.closest('#fixed-costs') || root;
      const rect = root.getBoundingClientRect();
      const style = window.getComputedStyle(section);
      return document.body.dataset.page === 'fixed' && rect.width > 4 && rect.height > 4 && style.display !== 'none' && style.visibility !== 'hidden';
    }
    function startAnimation() {
      if (window.__fixedKpiCountupToken !== token) return;
      const entries = values.map((el, index) => {
        const k = kpis[index];
        const final = fixedKpiFinal(k);
        return {
          element: el,
          from: 0,
          to: k ? k.value : 0,
          final,
          render: value => fixedKpiAnimatedValue(k, value),
          done: node => {
            node.dataset.v41Done = final;
            node.dataset.v67Done = final;
          }
        };
      }).filter(entry => entry.element);
      if (window.MarconiMotion && typeof window.MarconiMotion.countUpGroup === 'function') {
        const activeToken = window.MarconiMotion.countUpGroup(entries, {
          duration: 880,
          className: 'v67-counting',
          tokenKey: '__fixedKpiCountupToken'
        });
        const finalizeIfCurrent = () => {
          if (window.__fixedKpiCountupToken !== activeToken || document.body.dataset.page !== 'fixed') return;
          entries.forEach(entry => {
            if (!document.documentElement.contains(entry.element)) return;
            entry.element.textContent = entry.final;
            entry.element.classList.remove('v67-counting');
            entry.done(entry.element);
          });
        };
        window.setTimeout(finalizeIfCurrent, 980);
        window.setTimeout(finalizeIfCurrent, 1400);
        return;
      }
      entries.forEach(entry => {
        entry.element.textContent = entry.final;
        entry.element.classList.remove('v67-counting');
        entry.done(entry.element);
      });
    }
    function waitForVisible(attempt = 0) {
      if (window.__fixedKpiCountupToken !== token) return;
      if (!rootIsVisible() && attempt < 3) {
        if (attempt < 24) window.setTimeout(() => waitForVisible(attempt + 1), 80);
        return;
      }
      startAnimation();
    }
    waitForVisible();
  }
  function fixedPeriod() {
    try { return getActivePeriod(); } catch(e) { return {months:[1,2,3,4,5,6], label:'Jan — Jun', short:'JAN — JUN', mode:'realized'}; }
  }
  function fixedMonthLabel(m) {
    try { return MONTH_NAMES_SHORT[m] || FIXED_COST_DATA.months[m-1]; } catch(e) { return FIXED_COST_DATA.months[m-1]; }
  }
  function isRealizedMonthSafe(m) { try { return !isProjectionMonth(m); } catch(e) { return m <= 6; } }
  function isPartialMonthSafe(m) { try { return !!(window.MarconiFormat && window.MarconiFormat.isPartialMonth && window.MarconiFormat.isPartialMonth(m)); } catch(e) { return false; } }
  // Realizado FECHADO = realizado e não-parcial; é a base honesta para o desvio (exclui Jun em andamento).
  function isClosedRealizedMonthSafe(m) { return isRealizedMonthSafe(m) && !isPartialMonthSafe(m); }
  // Desvio realizado FECHADO (real − est) somando só meses realizados não-parciais — calculado ao vivo,
  // pois o cache de periodTotals embute o mês parcial. Retorna {diff, months, hasPartial}.
  function closedRealizedDeviation(months) {
    const rows = (FIXED_COST_DATA.totals && FIXED_COST_DATA.totals.length) ? FIXED_COST_DATA.totals : (FIXED_COST_DATA.items || []);
    const closed = months.filter(isClosedRealizedMonthSafe);
    const partials = months.filter(m => isRealizedMonthSafe(m) && isPartialMonthSafe(m));
    let real = 0, est = 0;
    closed.forEach(m => rows.forEach(it => { const r = it.months[m-1] || [0,0,0]; real += r[1]||0; est += r[0]||0; }));
    return { diff: real - est, real, est, months: closed, hasPartial: partials.length > 0, partialMonths: partials };
  }
  function periodModeLabel(period) {
    if (period.mode === 'year') return '2026 completo';
    if (period.mode === 'realized') return 'Realizado';
    if (period.mode === 'projection') return 'Projeção';
    return `Personalizado · ${period.months.map(fixedMonthLabel).join(', ')}`;
  }
  function monthValue(item, m, kind) {
    const row = item.months[m-1] || [0,0,0,0];
    const est = row[0] || 0, real = row[1] || 0, diff = row[2] || 0;
    if (kind === 'basis') return isRealizedMonthSafe(m) ? real : est;
    if (kind === 'est') return est;
    if (kind === 'real') return real;
    if (kind === 'diff') return diff;
    return 0;
  }
  function sumItem(item, months, kind='basis') {
    return months.reduce((s,m)=>s + monthValue(item,m,kind), 0);
  }
  function sumRows(rows, months, kind='basis') {
    return rows.reduce((s,it)=>s + sumItem(it,months,kind), 0);
  }
  function fixedPrecomputedKey(months) {
    try { return normalizeMonths(months).join(','); }
    catch(e) { return [...new Set((months || []).map(Number).filter(m => m >= 1 && m <= 12))].sort((a,b)=>a-b).join(','); }
  }
  function totalsFor(months) {
    const cached = FIXED_COST_DATA.precomputed?.periodTotals?.[fixedPrecomputedKey(months)];
    if (cached) {
      return {
        est: Number(cached.est || 0),
        real: Number(cached.real || 0),
        basis: Number(cached.basis || 0),
        diff: Number(cached.diff || 0)
      };
    }
    const totalRows = FIXED_COST_DATA.totals || [];
    const items = FIXED_COST_DATA.items || [];
    const rows = totalRows.length ? totalRows : items;
    const est = sumRows(rows, months, 'est');
    const real = sumRows(rows, months.filter(isRealizedMonthSafe), 'real');
    const basis = months.reduce((s,m)=>s + rows.reduce((x,it)=>x+monthValue(it,m,'basis'),0),0);
    return { est, real, basis, diff: real - sumRows(rows, months.filter(isRealizedMonthSafe), 'est') };
  }
  function rowsByGroup(months, kind='basis') {
    const map = new Map();
    const base = FIXED_COST_DATA.totals?.length ? FIXED_COST_DATA.totals : FIXED_COST_DATA.items;
    base.forEach(it => {
      const name = it.name.replace(/^Total de\s*/i,'Despesas com ');
      const val = sumItem(it,months,kind);
      map.set(name, (map.get(name)||0)+val);
    });
    return [...map.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  }
  function monthlyTotals(months) {
    const rows = FIXED_COST_DATA.totals?.length ? FIXED_COST_DATA.totals : FIXED_COST_DATA.items;
    return months.map(m => {
      const est = rows.reduce((s,it)=>s+monthValue(it,m,'est'),0);
      const real = rows.reduce((s,it)=>s+monthValue(it,m,'real'),0);
      const basis = rows.reduce((s,it)=>s+monthValue(it,m,'basis'),0);
      return {m, est, real, basis, diff: real-est, projection: !isRealizedMonthSafe(m)};
    });
  }
  function itemRows(months, kind='basis') {
    return (FIXED_COST_DATA.items || []).map(it => {
      const est = sumItem(it,months,'est');
      const realMonths = months.filter(isRealizedMonthSafe);
      const real = sumItem(it,realMonths,'real');
      const basis = sumItem(it,months,kind);
      const diff = real - sumItem(it,realMonths,'est');
      const absDiff = Math.abs(diff);
      const pct = sumItem(it,realMonths,'est') ? diff / Math.abs(sumItem(it,realMonths,'est')) * 100 : (real ? 100 : 0);
      return {...it, est, real, basis, diff, absDiff, pct};
    }).filter(x => Math.abs(x.est)+Math.abs(x.real)+Math.abs(x.basis) > 0.01);
  }
  function healthStatus(diff, est) {
    const pct = est ? Math.abs(diff) / Math.abs(est) * 100 : (Math.abs(diff)>0 ? 100 : 0);
    if (diff < 0) return {cls:'econ', text:'Economia'};
    if (pct <= 5) return {cls:'ok', text:'OK'};
    if (pct <= 15) return {cls:'att', text:'Atenção'};
    return {cls:'crit', text:'Crítico'};
  }

  function ensureFixedExecutiveSummary() {
    let el = document.getElementById('fixedCostsExecutiveSummary');
    if (el) return el;
    const grid = document.querySelector('#fixed-costs .fixed-costs-grid');
    if (!grid || !grid.parentNode) return null;
    el = document.createElement('div');
    el.id = 'fixedCostsExecutiveSummary';
    el.className = 'fixed-exec-summary';
    grid.parentNode.insertBefore(el, grid);
    return el;
  }

  function renderFixedExecutiveSummary(period, totals, flowAgg, fixedBase, pctSaidas, projectionOnly, closedDev) {
    const el = ensureFixedExecutiveSummary();
    if (!el) return;
    const months = (period.months || []).slice().sort((a,b)=>a-b);
    const group = rowsByGroup(months, projectionOnly ? 'est' : 'basis')[0];
    // Desvio realizado FECHADO (exclui mês parcial); fallback p/ totals.diff se não veio o cálculo ao vivo.
    const dev = closedDev || closedRealizedDeviation(months);
    const diff = projectionOnly ? 0 : dev.diff;
    const budgetTone = projectionOnly ? 'neutral' : diff > 0 ? 'risk' : diff < 0 ? 'good' : 'neutral';
    const budgetTitle = projectionOnly ? 'Base projetada' : diff > 0 ? 'Acima do orcado' : diff < 0 ? 'Economia contra orcado' : 'Dentro do orcado';
    const pressureTone = pctSaidas > 14 ? 'risk' : pctSaidas > 9 ? 'watch' : 'good';
    const pressureTitle = pctSaidas > 14 ? 'Pressao alta' : pctSaidas > 9 ? 'Monitorar peso' : 'Peso controlado';
    const entries = [
      {
        tone: budgetTone,
        label: 'Leitura orcamentaria',
        value: projectionOnly ? fixedMoney(totals.est) : `${diff >= 0 ? '+' : ''}${fixedMoney(diff)}`,
        text: budgetTitle
      },
      {
        tone: pressureTone,
        label: 'Peso no caixa',
        value: fixedPct(pctSaidas),
        text: `${pressureTitle} nas saidas gerenciais`
      },
      {
        tone: 'neutral',
        label: 'Maior grupo',
        value: escHtml(group?.name || '-'),
        text: `${fixedPct((group?.value || 0) / (fixedBase || 1) * 100)} do custo fixo`
      }
    ];
    el.innerHTML = entries.map(item => `<div class="fixed-exec-card" data-tone="${item.tone}" tabindex="0" role="group" aria-label="${escHtml(item.label)}: ${escHtml(item.text)}">
      <div class="fixed-exec-label">${item.label}</div>
      <div class="fixed-exec-value">${item.value}</div>
      <div class="fixed-exec-text">${item.text}</div>
    </div>`).join('');
  }

  // Selo de status padronizado (E1) — número-chave de Custos Fixos = % vs orçado (base fechada).
  function renderFixedSeal(closedDev, projectionOnly, totals) {
    if (!window.MarconiSeal) return;
    const dev = closedDev || {diff:0, est:0, months:[]};
    const baseMonths = (dev.months || []).length;
    if (projectionOnly || !baseMonths) {
      window.MarconiSeal.render('fixedStatusSeal', {
        label: 'ADERÊNCIA ORÇAMENTÁRIA',
        verdict: 'SEM BASE FECHADA',
        tone: 'neutral',
        metricValue: fixedMoney(totals ? totals.est : 0),
        metricLabel: 'orçado no recorte · sem mês fechado para desvio',
        desc: 'Meses projetados não têm realização — leitura correta é orçamento previsto, não desvio.'
      });
      return;
    }
    const pct = dev.est ? dev.diff / Math.abs(dev.est) * 100 : (dev.diff ? 100 : 0);
    let tone, verdict;
    if (dev.diff <= 0) { tone = 'good'; verdict = 'DENTRO DO ORÇADO'; }
    else if (pct <= 5) { tone = 'good'; verdict = 'NO ALVO'; }
    else if (pct <= 15) { tone = 'watch'; verdict = 'ATENÇÃO'; }
    else { tone = 'risk'; verdict = 'ACIMA DO ORÇADO'; }
    window.MarconiSeal.render('fixedStatusSeal', {
      label: 'ADERÊNCIA ORÇAMENTÁRIA',
      verdict: verdict,
      tone: tone,
      metricValue: (pct >= 0 ? '+' : '') + fixedPct(pct),
      metricLabel: `desvio vs orçado · base ${baseMonths} mês(es) fechado(s)`,
      desc: `Realizado fechado contra orçado: ${dev.diff >= 0 ? '+' : ''}${fixedMoney(dev.diff)}${dev.hasPartial ? ' (mês parcial excluído).' : '.'}`
    });
  }

  window.renderFixedCosts = function renderFixedCosts() {
    const section = document.getElementById('fixed-costs');
    if (!section) return;
    const period = fixedPeriod();
    const months = (period.months || []).slice().sort((a,b)=>a-b);
    if (!months.length) return;
    const realMonths = months.filter(isRealizedMonthSafe);
    const projectionOnly = months.length && realMonths.length === 0;
    const totals = totalsFor(months);
    const rows = itemRows(months, 'basis');
    const realRows = itemRows(realMonths.length ? realMonths : months, projectionOnly ? 'est' : 'basis');
    let flowAgg = {entradas:0, saidas:0, resultado:0};
    try { flowAgg = aggregate(months); } catch(e) {}
    const fixedBase = projectionOnly ? totals.est : totals.basis;
    const pctSaidas = flowAgg.saidas ? fixedBase / flowAgg.saidas * 100 : 0;
    const pctEntradas = flowAgg.entradas ? fixedBase / flowAgg.entradas * 100 : 0;

    const ctx = document.getElementById('fixedCostsContext');
    if (ctx) ctx.textContent = `${periodModeLabel(period).toUpperCase()} · CUSTOS FIXOS ${projectionOnly ? 'PROJETADOS' : 'REAL/ORÇADO'}`;

    // Desvio realizado considera só meses realizados FECHADOS (exclui parcial, ex.: Jun em andamento).
    const closedDev = closedRealizedDeviation(months);
    const devValue = closedDev.diff;
    const devBaseMonths = closedDev.months.length;
    const devSub = projectionOnly
      ? 'Sem fechamento real para projeção'
      : (devBaseMonths
          ? `${devValue >= 0 ? 'Acima' : 'Abaixo'} do orçado · base ${devBaseMonths} mês(es) fechado(s)${closedDev.hasPartial ? ' (parcial excluído)' : ''}`
          : 'Sem mês realizado fechado no recorte');

    const kpis = [
      {label: projectionOnly ? 'Custo fixo projetado' : 'Custo fixo do período', value: fixedBase, sub: projectionOnly ? 'Base estimada para os meses projetados' : 'Realizado onde disponível + estimado futuro', color:'#F59E0B'},
      {label:'Orçado no período', value: totals.est, sub:`${months.length} mês(es) selecionado(s)`, color:'#94A0B8'},
      {label: projectionOnly ? 'Realizado disponível' : 'Desvio realizado', value: projectionOnly ? totals.real : devValue, sub: devSub, color: projectionOnly ? '#94A0B8' : (devBaseMonths ? (devValue >= 0 ? '#EF4444' : '#10B981') : '#94A0B8'), signed: !projectionOnly && devBaseMonths > 0},
      {label:'Peso nas saídas', value:pctSaidas, sub:`${fixedPct(pctEntradas)} das entradas do período`, color:'#06B6D4', pct:true}
    ];
    kpis[0].tone = 'base';
    kpis[1].tone = 'neutral';
    kpis[2].tone = projectionOnly ? 'neutral' : (!devBaseMonths ? 'neutral' : (devValue > 0 ? 'risk' : devValue < 0 ? 'good' : 'neutral'));
    kpis[3].tone = pctSaidas > 14 ? 'risk' : pctSaidas > 9 ? 'watch' : 'info';
    window.__lastFixedKpis = kpis;

    const kpiEl = document.getElementById('fixedCostsKpis');
    if (kpiEl) kpiEl.innerHTML = kpis.map(k => {
      const final = fixedKpiFinal(k);
      const initial = fixedKpiInitial(k);
      const cls = k.pct ? '' : (k.signed && k.value > 0 ? 'number-red' : k.signed && k.value < 0 ? 'number-green' : '');
      return `<div class="fixed-kpi" style="--kpi-color:${k.color}"><div class="lbl">${k.label}</div><div class="val ${cls}" data-v41-final="${escHtml(final)}" data-v67-final="${escHtml(final)}">${initial}</div><div class="sub">${k.sub}</div></div>`;
    }).join('');
    if (kpiEl) {
      [...kpiEl.querySelectorAll('.fixed-kpi')].forEach((card, index) => {
        const k = kpis[index];
        const final = k ? fixedKpiFinal(k) : '';
        card.dataset.tone = k?.tone || 'neutral';
        card.setAttribute('role', 'group');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${k?.label || ''}: ${final}. ${k?.sub || ''}`);
      });
    }
    animateFixedKpiCards(kpiEl, kpis);
    renderFixedExecutiveSummary(period, totals, flowAgg, fixedBase, pctSaidas, projectionOnly, closedDev);
    renderFixedSeal(closedDev, projectionOnly, totals);

    renderFixedMonthlyChart(months, projectionOnly);
    renderFixedComposition(months, projectionOnly);
    renderFixedDeviations(realMonths, projectionOnly);
    renderFixedSensitive(realRows, projectionOnly);
    renderFixedDeviationHeatmap(months, projectionOnly);
    renderFixedAnalysis(months, period, totals, rows, flowAgg, projectionOnly);
  };

  window.replayFixedKpiAnimation = function replayFixedKpiAnimation() {
    const kpiEl = document.getElementById('fixedCostsKpis');
    const kpis = window.__lastFixedKpis;
    if (!kpiEl || !Array.isArray(kpis) || !kpis.length) return;
    const values = [...kpiEl.querySelectorAll('.fixed-kpi .val')];
    const token = String(Date.now()) + Math.random().toString(16).slice(2);
    window.__fixedKpiManualReplayToken = token;
    window.__fixedKpiCountupToken = token;
    values.forEach((el, index) => {
      const k = kpis[index];
      if (!k) return;
      el.textContent = fixedKpiAnimatedValue(k, 0);
      el.classList.add('v67-counting');
    });
    window.setTimeout(() => {
      if (window.__fixedKpiManualReplayToken !== token) return;
      animateFixedKpiCards(kpiEl, kpis);
    }, 60);
    return true;
  };

  function renderFixedMonthlyChart(months, projectionOnly) {
    const el = document.getElementById('fixedCostsMonthlyChart'); if(!el) return;
    const chip = document.getElementById('fixedCostsChartChip'); if(chip) chip.textContent = months.map(fixedMonthLabel).join(' · ');
    const data = monthlyTotals(months);
    const max = Math.max(...data.map(d=>Math.max(d.est,d.real,d.basis)),1);
    const W = 920, H = 310, padL=54, padR=20, padT=26, padB=48;
    const plotW = W-padL-padR, plotH=H-padT-padB;
    const groupW = plotW/data.length;
    const bars = data.map((d,i)=> {
      const x = padL+i*groupW+groupW*.22;
      const bw = Math.min(26, groupW*.24);
      const estH = d.est/max*plotH, realH = (d.projection?d.est:d.real)/max*plotH;
      const realCls = d.projection ? 'bar-proj' : (d.real > d.est*1.05 ? 'bar-over' : 'bar-real');
      return `<g data-fixed-month="${d.m}">
        <rect class="bar-est" x="${x}" y="${padT+plotH-estH}" width="${bw}" height="${estH}" rx="6"/>
        <rect class="${realCls}" x="${x+bw+5}" y="${padT+plotH-realH}" width="${bw}" height="${realH}" rx="6"/>
        <text x="${x+bw+2}" y="${H-22}" text-anchor="middle">${fixedMonthLabel(d.m)}</text>
        <title>${fixedMonthLabel(d.m)} · Orçado: ${fixedMoney(d.est)} · ${d.projection?'Projetado':'Realizado'}: ${fixedMoney(d.projection?d.est:d.real)}</title>
      </g>`;
    }).join('');
    const grid = [0,.25,.5,.75,1].map(t => `<line class="grid-line" x1="${padL}" x2="${W-padR}" y1="${padT+plotH-t*plotH}" y2="${padT+plotH-t*plotH}"/><text x="${padL-10}" y="${padT+plotH-t*plotH+4}" text-anchor="end">${fixedMoney(max*t).replace('R$ ','R$ ').replace('R$ ', 'R$')}</text>`).join('');
    el.innerHTML = `<svg class="fixed-monthly-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}<line class="axis" x1="${padL}" x2="${W-padR}" y1="${padT+plotH}" y2="${padT+plotH}"/>${bars}</svg>
      <div class="fixed-monthly-legend"><span><i style="background:rgba(252,211,77,.28)"></i>Orçado</span><span><i style="background:rgba(16,185,129,.62)"></i>Realizado</span><span><i style="background:rgba(99,102,241,.36)"></i>Projetado</span><span><i style="background:rgba(239,68,68,.64)"></i>Acima do orçamento</span></div>`;
  }

  function renderFixedComposition(months, projectionOnly) {
    const el = document.getElementById('fixedCostsComposition'); if(!el) return;
    const groups = rowsByGroup(months, projectionOnly ? 'est' : 'basis');
    const total = groups.reduce((s,g)=>s+g.value,0)||1;
    el.innerHTML = groups.map((g,i) => `<div class="fixed-row">
      <div><div class="fixed-row-name">${escHtml(g.name)}</div><div class="fixed-row-sub">${fixedPct(g.value/total*100)} do custo fixo</div></div>
      <div class="fixed-row-bar"><span class="fixed-row-fill" style="--w:${Math.max(2,g.value/total*100)}%;--row-color:${i?'#06B6D4':'#F59E0B'}"></span></div>
      <div class="fixed-row-value">${fixedMoney(g.value)}</div>
    </div>`).join('');
  }

  function renderFixedDeviations(realMonths, projectionOnly) {
    const el = document.getElementById('fixedCostsDeviations'); if(!el) return;
    if (projectionOnly || !realMonths.length) {
      el.innerHTML = `<div class="empty-state"><strong>Sem desvios realizados no recorte.</strong><br>Para meses projetados, a leitura correta é orçamento previsto, não variação real contra estimado.</div>`;
      return;
    }
    const rows = itemRows(realMonths,'basis').filter(r=>Math.abs(r.diff)>0.01);
    const over = rows.filter(r=>r.diff>0).sort((a,b)=>b.diff-a.diff).slice(0,5);
    const under = rows.filter(r=>r.diff<0).sort((a,b)=>a.diff-b.diff).slice(0,5);
    const list = (arr, cls) => arr.length ? arr.map(r=>`<div class="fixed-dev-item"><div><div class="name">${escHtml(r.name)}</div><div class="meta">${escHtml(r.group)} · ${fixedPct(Math.abs(r.pct))}</div></div><div class="value ${r.diff>0?'number-red':'number-green'}">${r.diff>=0?'+':''}${fixedMoney(r.diff)}</div></div>`).join('') : '<div class="fixed-dev-item"><div class="name">Sem registros relevantes</div><div></div></div>';
    el.innerHTML = `<div class="fixed-deviation-list"><div class="fixed-dev-block"><div class="fixed-dev-title over">Acima do estimado</div>${list(over,'over')}</div><div class="fixed-dev-block"><div class="fixed-dev-title under">Economias / abaixo do estimado</div>${list(under,'under')}</div></div>`;
  }

  function renderFixedSensitive(rows, projectionOnly) {
    const el = document.getElementById('fixedCostsSensitive'); if(!el) return;
    const ranked = rows.slice().sort((a,b)=>Math.max(Math.abs(b.diff),b.basis*.18)-Math.max(Math.abs(a.diff),a.basis*.18)).slice(0,8);
    el.innerHTML = `<div class="fixed-sensitive-grid">${ranked.map(r => {
      const st = projectionOnly ? {cls:'att', text:'Previsto'} : healthStatus(r.diff, r.est);
      return `<div class="fixed-sensitive-card">
        <div class="top"><div class="name">${escHtml(r.name)}</div><span class="fixed-status ${st.cls}">${st.text}</span></div>
        <div class="fixed-sensitive-metrics">
          <div class="m"><div class="l">${projectionOnly?'Previsto':'Realizado'}</div><div class="v">${fixedMoney(projectionOnly?r.est:r.real)}</div></div>
          <div class="m"><div class="l">Desvio</div><div class="v ${r.diff>0?'number-red':r.diff<0?'number-green':''}">${r.diff>=0?'+':''}${fixedMoney(r.diff)}</div></div>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function heatColor(v, est) {
    if (Math.abs(v) < 1) return 'rgba(90,101,128,.12)';
    const pct = est ? Math.min(Math.abs(v)/Math.abs(est), .55) : .35;
    const a = 0.12 + pct*1.15;
    if (v > 0) return `rgba(239,68,68,${Math.min(.68,a)})`;
    return `rgba(16,185,129,${Math.min(.54,a)})`;
  }
  function renderFixedDeviationHeatmap(months, projectionOnly) {
    const el = document.getElementById('fixedCostsHeatmap'); if(!el) return;
    const realMonths = months.filter(isRealizedMonthSafe);
    if (projectionOnly || !realMonths.length) {
      el.innerHTML = `<div class="empty-state"><strong>Mapa de desvios indisponível para projeção.</strong><br>Os meses previstos ainda não possuem realização para comparação.</div>`;
      return;
    }
    const rows = itemRows(realMonths,'basis').filter(r=>Math.abs(r.diff)>100).sort((a,b)=>b.absDiff-a.absDiff).slice(0,12);
    const head = `<div class="fixed-heatmap-head">Rubrica</div>${realMonths.map(m=>`<div class="fixed-heatmap-head">${fixedMonthLabel(m)}</div>`).join('')}`;
    const body = rows.map(r => `<div class="fixed-heatmap-row-name">${escHtml(r.name)}</div>${realMonths.map(m=>{
      const est=monthValue(r,m,'est'), diff=monthValue(r,m,'diff');
      return `<div class="fixed-heatmap-cell" style="--hm-bg:${heatColor(diff,est)}">${diff>=0?'+':''}${fixedMoney(diff)}<small>${est?fixedPct(diff/Math.abs(est)*100):'sem base'}</small></div>`;
    }).join('')}`).join('');
    el.innerHTML = `<div class="fixed-heatmap-wrap"><div class="fixed-heatmap" style="--cols:${realMonths.length}">${head}${body}</div></div>`;
  }

  function renderFixedAnalysis(months, period, totals, rows, flowAgg, projectionOnly) {
    const el = document.getElementById('fixedCostsAnalysis'); if(!el) return;
    const realMonths = months.filter(isRealizedMonthSafe);
    const base = projectionOnly ? totals.est : totals.basis;
    const group = rowsByGroup(months, projectionOnly ? 'est' : 'basis')[0];
    const topRows = itemRows(realMonths.length?realMonths:months, projectionOnly?'est':'basis').sort((a,b)=>(projectionOnly?b.est:b.basis)-(projectionOnly?a.est:a.basis)).slice(0,3);
    const monthly = monthlyTotals(months);
    const high = monthly.slice().sort((a,b)=>(b.basis||b.real||b.est)-(a.basis||a.real||a.est))[0];
    const realDeviations = realMonths.length ? itemRows(realMonths,'basis').filter(r=>Math.abs(r.diff)>0.01).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,3) : [];
    const pctSaidas = flowAgg.saidas ? base/flowAgg.saidas*100 : 0;
    let text;
    if (projectionOnly) {
      text = `No recorte <strong>${periodModeLabel(period)}</strong>, a estrutura fixa projetada soma <strong>${fixedMoney(base)}</strong>. A maior concentração está em <strong>${escHtml(group?.name || '—')}</strong>, com <strong>${fixedPct((group?.value||0)/(base||1)*100)}</strong> do total previsto. O mês com maior pressão orçada é <strong>${fixedMonthLabel(high?.m)}</strong>, com <strong>${fixedMoney(high?.est||0)}</strong>.`;
    } else {
      text = `No recorte <strong>${periodModeLabel(period)}</strong>, os custos fixos considerados somam <strong>${fixedMoney(base)}</strong>, equivalentes a <strong>${fixedPct(pctSaidas)}</strong> das saídas gerenciais do fluxo de caixa. A principal pressão estrutural está em <strong>${escHtml(group?.name || '—')}</strong>. Entre os meses exibidos, <strong>${fixedMonthLabel(high?.m)}</strong> apresenta a maior pressão de custos fixos, com <strong>${fixedMoney(high?.basis||0)}</strong>.`;
    }
    const actions = [
      {tag:'1 · Validar desvios', txt: realDeviations.length ? `Priorizar ${realDeviations.map(r=>escHtml(r.name)).join(', ')}.` : 'Sem desvios relevantes no recorte.'},
      {tag:'2 · Separar recorrente', txt:'Distinguir custos fixos recorrentes de lançamentos pontuais para não distorcer orçamento-base.'},
      {tag:'3 · Conectar ao caixa', txt:`Monitorar custo fixo como percentual de entradas e saídas em cada fechamento mensal.`}
    ];
    el.innerHTML = `${text}<div class="fixed-analysis-actions">${actions.map(a=>`<div class="fixed-action"><div class="tag">${a.tag}</div><div class="txt">${a.txt}</div></div>`).join('')}</div>`;
  }

  function wireFixedCostsPage() {
    const nav = document.querySelector('.top-site-nav .site-nav-links, .top-site-links');
    if (nav && !nav.querySelector('[data-target="fixed-costs"]')) {
      const tableLink = nav.querySelector('[data-target="table"]');
      const html = '<a href="#fixed-costs" data-target="fixed-costs">Custos Fixos</a>';
      if (tableLink) tableLink.insertAdjacentHTML('beforebegin', html); else nav.insertAdjacentHTML('beforeend', html);
    }
    const host = document.getElementById('fixed-costs');
    if (host && !host.classList.contains('in-view')) host.classList.add('in-view');
  }

  wireFixedCostsPage();
  const prevApplyFilter = window.applyFilter || (typeof applyFilter !== 'undefined' ? applyFilter : null);
  if (prevApplyFilter && !window.__fixedCostsApplyWrapped) {
    window.__fixedCostsApplyWrapped = true;
    window.applyFilter = applyFilter = function() {
      prevApplyFilter();
      if (document.body.dataset.page === 'fixed') {
        try { renderFixedCosts(); } catch(err) { console.error('Erro ao renderizar Custos Fixos:', err); }
      }
    };
  }
  const prevDecorate = window.decorateAfterRender;
  if (typeof decorateAfterRender === 'function' && !window.__fixedCostsDecorateWrapped) {
    window.__fixedCostsDecorateWrapped = true;
    const originalDecorate = decorateAfterRender;
    decorateAfterRender = function() {
      originalDecorate();
      if (document.body.dataset.page === 'fixed') {
        try { renderFixedCosts(); } catch(err) {}
      }
    };
  }
  requestAnimationFrame(() => {
    wireFixedCostsPage();
    if (document.body.dataset.page === 'fixed') {
      try { renderFixedCosts(); } catch(err) { console.error('Erro inicial Custos Fixos:', err); }
    }
  });
})();

/* ===== script-8 ===== */
/* ━━━ V37 · duas páginas internas + interação de rubrica dos custos fixos ━━━ */
(function(){
  const money = window.MarconiFormat?.moneyFull || new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format;
  const pct = v => `${Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
  const monthLabel = m => (window.FIXED_COST_DATA?.months?.[m-1] || ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][m-1] || '—');
  const realized = m => !isProjectionMonth(m);

  function currentMonths(){
    const st = window.filterState || {};
    if (st.period === 'realized') return ALL_MONTHS.filter(m => !isProjectionMonth(m));
    if (st.period === 'projection') return ALL_MONTHS.filter(m => isProjectionMonth(m));
    if (st.period === 'custom' && Array.isArray(st.months) && st.months.length) return st.months.slice().sort((a,b)=>a-b);
    return [1,2,3,4,5,6,7,8,9,10,11,12];
  }
  function itemByName(name){ return (window.FIXED_COST_DATA?.items || []).find(i => i.name === name); }
  function itemTotalsFor(item, months){
    return months.reduce((a,m)=>{ const row = item.months[m-1] || [0,0,0,0]; a.est += row[0]||0; a.real += row[1]||0; a.diff += row[2]||0; return a; }, {est:0, real:0, diff:0});
  }
  function setPage(page){
    document.body.dataset.page = page;
    document.querySelectorAll('[data-page-link]').forEach(b => b.classList.toggle('active', b.dataset.pageLink === page));
    document.querySelectorAll('.top-site-links a').forEach(a => a.classList.remove('active'));
    if (page === 'fixed') {
      if (!document.body.dataset.fixedView) document.body.dataset.fixedView = 'overview';
      document.querySelector('.top-site-links a[data-fixed-anchor]')?.classList.add('active');
      requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
      try { window.renderFixedCosts && window.renderFixedCosts(); } catch(e) { console.error(e); }
    } else if (page === 'director') {
      document.querySelector('.top-site-links a[data-director-anchor]')?.classList.add('active');
      requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
      try { window.renderDirectorPage && window.renderDirectorPage(); } catch(e) { console.error(e); }
    } else {
      document.querySelector('.top-site-links a[data-target="home"]')?.classList.add('active');
      requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
    }
  }
  window.__baseSetDashboardPage = setPage;
  window.setDashboardPage = setPage;

  function setFixedView(view){
    document.body.dataset.fixedView = view;
    document.querySelectorAll('.fixed-view-tab').forEach(b => b.classList.toggle('active', b.dataset.fixedView === view));
    const hint = document.getElementById('fixedPageHint');
    if (hint) hint.textContent = view === 'overview' ? 'Visão sintética dos custos fixos no período selecionado.' : view === 'control' ? 'Clique em uma rubrica para abrir evolução mensal e desvios.' : 'Mapa técnico de desvios por rubrica e mês.';
  }
  window.setFixedCostView = setFixedView;

  function renderFocus(name){
    const panel = document.getElementById('fixedFocusPanel'); if(!panel) return;
    const item = itemByName(name);
    if (!item) { panel.classList.remove('show'); panel.innerHTML=''; return; }
    const months = currentMonths();
    const realMonths = months.filter(realized);
    const viewMonths = realMonths.length ? realMonths : months;
    const t = itemTotalsFor(item, viewMonths);
    const max = Math.max(...viewMonths.map(m => Math.max(item.months[m-1]?.[0]||0, item.months[m-1]?.[1]||0)), 1);
    const status = Math.abs(t.diff) < Math.max(1,t.est*.04) ? 'dentro do orçamento' : t.diff > 0 ? 'acima do orçamento' : 'abaixo do orçamento';
    const statusColor = t.diff > 0 ? 'number-red' : t.diff < 0 ? 'number-green' : '';
    const cards = viewMonths.map(m => {
      const r = item.months[m-1] || [0,0,0,0];
      const basis = realized(m) ? r[1] : r[0];
      return `<div class="fixed-focus-month is-active" style="box-shadow: inset 0 -3px 0 rgba(252,211,77,${Math.max(.06, basis/max*.32).toFixed(2)})"><div class="m">${monthLabel(m)}</div><div class="v">${money(basis)}</div><div class="d">Δ ${r[2]>=0?'+':''}${money(r[2])}</div></div>`;
    }).join('');
    panel.innerHTML = `<div class="fixed-focus-inner"><div class="fixed-focus-main"><button type="button" class="fixed-focus-close" id="fixedFocusClose">Fechar</button><div class="mini">Rubrica selecionada</div><h3>${name}</h3><div class="fixed-focus-text">A rubrica pertence ao grupo <strong>${item.group}</strong> e, no recorte atual, está <strong class="${statusColor}">${status}</strong>. Use este painel para enxergar a evolução mensal sem abrir a planilha.</div><div class="fixed-focus-kpis"><div class="fixed-focus-kpi"><div class="l">Orçado</div><div class="v">${money(t.est)}</div></div><div class="fixed-focus-kpi"><div class="l">Real/Previsto</div><div class="v">${money(realMonths.length?t.real:t.est)}</div></div><div class="fixed-focus-kpi"><div class="l">Desvio</div><div class="v ${statusColor}">${t.diff>=0?'+':''}${money(t.diff)}</div></div></div></div><div class="fixed-focus-chart"><div class="fixed-focus-months">${cards}</div></div></div>`;
    panel.classList.add('show');
    document.getElementById('fixedFocusClose')?.addEventListener('click', () => { panel.classList.remove('show'); panel.innerHTML=''; });
  }
  window.renderFixedCostFocus = renderFocus;

  function enhanceFixedCosts(){
    document.querySelectorAll('#fixedCostsComposition .fixed-row').forEach(row => {
      const name = row.querySelector('.fixed-row-name')?.textContent?.trim();
      if (name) row.onclick = () => renderFocus(name);
    });
    document.querySelectorAll('#fixedCostsSensitive .fixed-sensitive-card').forEach(card => {
      const name = card.querySelector('.name')?.textContent?.trim();
      if (name) card.onclick = () => renderFocus(name);
    });
    document.querySelectorAll('#fixedCostsDeviations .fixed-dev-item').forEach(row => {
      const name = row.querySelector('.name')?.textContent?.trim();
      if (name && !/Sem registros/i.test(name)) row.onclick = () => renderFocus(name);
    });
  }

  document.addEventListener('click', function(e){
    const pageBtn = e.target.closest('[data-page-link]');
    if (pageBtn) { e.preventDefault(); window.setDashboardPage?.(pageBtn.dataset.pageLink); return; }
    const fixedNav = e.target.closest('[data-fixed-view-link]');
    if (fixedNav) { e.preventDefault(); setFixedView(fixedNav.dataset.fixedViewLink); document.getElementById('fixed-costs')?.scrollIntoView({behavior:'smooth', block:'start'}); return; }
    const viewBtn = e.target.closest('[data-fixed-view]');
    if (viewBtn && viewBtn.classList.contains('fixed-view-tab')) { e.preventDefault(); setFixedView(viewBtn.dataset.fixedView); return; }
  });

  const previous = window.renderFixedCosts;
  if (typeof previous === 'function' && !window.__v37FixedWrapped) {
    window.__v37FixedWrapped = true;
    window.renderFixedCosts = function(){
      const result = previous.apply(this, arguments);
      setTimeout(enhanceFixedCosts, 0);
      return result;
    };
  }
  onDashboardReady(function(){
    document.body.dataset.page = document.body.dataset.page || 'cash';
    document.body.dataset.fixedView = document.body.dataset.fixedView || 'overview';
    document.querySelectorAll('[data-page-link]').forEach(b => b.classList.toggle('active', b.dataset.pageLink === document.body.dataset.page));
    document.querySelectorAll('.fixed-view-tab').forEach(b => b.classList.toggle('active', b.dataset.fixedView === document.body.dataset.fixedView));
    try { if (window.renderFixedCosts) window.renderFixedCosts(); } catch(e) {}
    setTimeout(enhanceFixedCosts, 80);
  });
})();

/* ===== script-9 ===== */
/* ━━━ V38 · página Diretoria: leitura de bater o olho ━━━ */
(function(){
  const directorMoneyFormatter = window.MarconiFormat?.moneyFull || new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format;
  function safeMoney(v){ try{return directorMoneyFormatter(v||0);}catch(e){return fmtMoneyFull(v||0);} }
  function safeShort(v){ try{return fmtMoney(v||0);}catch(e){return safeMoney(v);} }
  function safePct(v){ return `${Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`; }
  function activePeriod(){ try{return getActivePeriod();}catch(e){return {months:[1,2,3,4,5,6,7,8,9,10,11,12], label:'2026', short:'2026', mode:'year'};} }
  function fixedTotals(months){
    const data = window.FIXED_COST_DATA || {}; const rows = data.totals?.length ? data.totals : (data.items||[]);
    const realized = m => !isProjectionMonth(m);
    let est=0, basis=0, realEst=0, real=0;
    months.forEach(m=> rows.forEach(it=>{ const r=it.months?.[m-1]||[0,0,0]; est+=r[0]||0; basis += realized(m) ? (r[1]||0) : (r[0]||0); if(realized(m)){real+=r[1]||0; realEst+=r[0]||0;} }));
    return {est,basis,real,diff:real-realEst};
  }
  function topCategory(months){
    const cats = (DATA.categories||[]).map(c=>({name:c.name, value:months.reduce((s,m)=>s+(c.months?.[m]||0),0)})).sort((a,b)=>b.value-a.value);
    return cats[0] || {name:'—', value:0};
  }
  function worstMonth(months, realizedOnly=false){
    const ms = realizedOnly ? months.filter(m=>!isProjectionMonth(m)) : months;
    return ms.map(m=>({m, ...(DATA.monthly[m]||{})})).sort((a,b)=>(a.resultado||0)-(b.resultado||0))[0] || null;
  }
  function bestMonth(months){
    return months.map(m=>({m, ...(DATA.monthly[m]||{})})).sort((a,b)=>(b.resultado||0)-(a.resultado||0))[0] || null;
  }
  function monthName(m){ try{return MONTH_NAMES_LONG[m]||m;}catch(e){return String(m);} }
})();

/* ===== script-10 ===== */
/* ━━━ V39 · comportamento e renderização refinados ━━━ */
(function(){
  function initDirectorCoverLogo(){
    const host=document.getElementById('directorCoverLogo');
    if(!host || host.dataset.ready) return;
    const src=document.querySelector('.hero-brand-mark')?.getAttribute('src') || document.querySelector('.client-logo img')?.getAttribute('src');
    if(src){ host.innerHTML = `<img alt="Marconi Foods" src="${src}">`; host.dataset.ready='1'; }
  }
  function ensureDirectorFirst(){
    const switcher=document.querySelector('.page-switcher');
    if(!switcher) return;
    const director=switcher.querySelector('[data-page-link="director"]');
    if(director && switcher.firstElementChild!==director) switcher.insertBefore(director, switcher.firstElementChild);
  }
  onDashboardReady(()=>{initDirectorCoverLogo(); ensureDirectorFirst();});
  setTimeout(()=>{initDirectorCoverLogo(); ensureDirectorFirst();},250);

  const originalSetPage=window.setDashboardPage;
  if(typeof originalSetPage==='function'){
    window.setDashboardPage=function(page){
      originalSetPage(page);
      initDirectorCoverLogo();
      ensureDirectorFirst();
    };
  }

  function esc(s){ return window.MarconiFormat.escapeHtml(s); }  /* dedup: usa o canônico (00-foundation) */
  function monthValueLocal(item, m, kind){
    try { return monthValue(item,m,kind); } catch(e){ const row=item.months?.[m-1]||[0,0,0,0]; return kind==='est'?row[0]||0:kind==='real'?row[1]||0:row[2]||0; }
  }
  function fixedMonthLabelLocal(m){ try{return fixedMonthLabel(m);}catch(e){return (MONTH_NAMES_SHORT&&MONTH_NAMES_SHORT[m])||String(m);} }
  function heatColorLocal(v, est){
    if (Math.abs(v) < 1) return 'rgba(90,101,128,.12)';
    const pct = est ? Math.min(Math.abs(v)/Math.abs(est), .55) : .35;
    const a = 0.12 + pct*1.15;
    if (v > 0) return `rgba(239,68,68,${Math.min(.68,a)})`;
    return `rgba(16,185,129,${Math.min(.54,a)})`;
  }
  window.renderFixedDeviationHeatmap=function(months, projectionOnly){
    const el=document.getElementById('fixedCostsHeatmap'); if(!el) return;
    const realMonths=(months||[]).filter(m=>!isProjectionMonth(m));
    if(projectionOnly || !realMonths.length){
      el.innerHTML=`<div class="empty-state"><strong>Mapa de desvios indisponível para projeção.</strong><br>Os meses previstos ainda não possuem realização para comparação.</div>`;
      return;
    }
    let rows=[];
    try{ rows=itemRows(realMonths,'basis').filter(r=>Math.abs(r.diff)>100).sort((a,b)=>b.absDiff-a.absDiff).slice(0,12); }
    catch(e){ rows=[]; }
    const head=`<div class="fixed-heatmap-head">Rubrica</div>${realMonths.map(m=>`<div class="fixed-heatmap-head">${fixedMonthLabelLocal(m)}</div>`).join('')}`;
    const body=rows.map(r=>`<div class="fixed-heatmap-row-name">${esc(r.name)}</div>${realMonths.map(m=>{
      const est=monthValueLocal(r,m,'est'), diff=monthValueLocal(r,m,'diff');
      const empty=Math.abs(diff)<1 || (Math.abs(est)<1 && Math.abs(diff)<1);
      if(empty) return `<div class="fixed-heatmap-cell empty">−</div>`;
      const pct = est ? fixedPct(diff/Math.abs(est)*100) : '';
      return `<div class="fixed-heatmap-cell" style="--hm-bg:${heatColorLocal(diff,est)}">${diff>=0?'+':''}${fixedMoney(diff)}${pct?`<small>${pct}</small>`:''}</div>`;
    }).join('')}`).join('');
    el.innerHTML=`<div class="fixed-heatmap-wrap"><div class="fixed-heatmap" style="--cols:${realMonths.length}">${head}${body}</div></div>`;
  };
})();

/* ===== script-11 ===== */
/* ━━━ V40 · correções finais de arquitetura, diretoria e custos fixos ━━━ */
(function(){
  const BRL0 = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
  const fmtFull = v => BRL0.format(v||0);
  const fmtShort = v => {
    v = Number(v||0);
    const sign = v < 0 ? '-' : '';
    const a = Math.abs(v);
    if (a >= 1e6) return `${sign}R$ ${(a/1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${sign}R$ ${(a/1e3).toFixed(0)}K`;
    return `${sign}R$ ${Math.round(a).toLocaleString('pt-BR')}`;
  };
  const pct = v => `${(Number.isFinite(v)?v:0).toFixed(1)}%`;
  const monthShort = m => (window.MONTH_NAMES_SHORT?.[m] || ['','JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][m] || String(m));
  const monthLong = m => (window.MONTH_NAMES_LONG?.[m] || ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m] || String(m));
  const esc = s => String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const getMonths = () => (Array.isArray(window.selectedMonths) && window.selectedMonths.length ? window.selectedMonths.slice() : (typeof selectedMonths !== 'undefined' ? selectedMonths.slice() : [1,2,3,4,5,6,7,8,9,10,11,12])).sort((a,b)=>a-b);
  function periodLabel(months){
    const key = months.join(',');
    if(key==='1,2,3,4,5,6,7,8,9,10,11,12') return {short:'2026 completo', detail:'2026 · 12 meses analisados'};
    if(key==='1,2,3,4,5,6') return {short:'Realizado', detail:'Jan — Jun / 2026 · realizado'};
    if(key==='7,8,9,10,11,12') return {short:'Projeção', detail:'Jul — Dez / 2026 · previsto'};
    return {short:months.map(monthShort).join(' · '), detail:`${months.length} mês(es) selecionado(s)`};
  }
  function aggregateSafe(months){
    try { return aggregate(months); } catch(e) {
      return months.reduce((a,m)=>{ const mm=DATA.monthly[m]||{}; a.entradas+=(mm.entradas||0); a.saidas+=(mm.saidas||0); a.resultado+=(mm.resultado||0); return a; }, {entradas:0,saidas:0,resultado:0});
    }
  }
  function categoriesFor(months){
    const cats=(DATA.categoryMonthly||DATA.categories||[]).map(c=>{
      const value=months.reduce((s,m)=>s+(Number(c.months?.[m]||0)),0);
      return {...c, value};
    }).filter(c=>Math.abs(c.value)>0.01).sort((a,b)=>b.value-a.value);
    const total=cats.reduce((s,c)=>s+c.value,0)||1;
    return cats.map(c=>({...c, pct:c.value/total*100}));
  }
  function fixedBasis(months){
    const data = (typeof FIXED_COST_DATA !== 'undefined') ? FIXED_COST_DATA : window.FIXED_COST_DATA;
    if(!data) return {basis:0, est:0, real:0, diff:0};
    const baseRows = data.totals?.length ? data.totals : data.items || [];
    return baseRows.reduce((acc,row)=>{
      months.forEach(m=>{
        const tuple = row.months?.[m-1] || [0,0,0,0];
        const est = Number(tuple[0]||0), real = Number(tuple[1]||0), diff = Number(tuple[2]||0);
        acc.est += est;
        acc.real += real;
        acc.diff += (!isProjectionMonth(m) ? diff : 0);
        acc.basis += (!isProjectionMonth(m) ? real : est);
      });
      return acc;
    }, {basis:0, est:0, real:0, diff:0});
  }
  function countText(el, finalText, raw, formatter){
    if(!el) return;
    const start=performance.now();
    const dur=620;
    const from=0;
    const to=Number(raw||0);
    function tick(t){
      const p=Math.min(1,(t-start)/dur);
      const ease=1-Math.pow(1-p,3);
      try { el.textContent = formatter(from+(to-from)*ease); } catch(e) { el.textContent=finalText; }
      if(p<1) requestAnimationFrame(tick); else el.textContent=finalText;
    }
    requestAnimationFrame(tick);
  }
  function normalizeHeatmapZeros(){
    document.querySelectorAll('#fixedCostsHeatmap .fixed-heatmap-cell').forEach(cell=>{
      const raw=cell.textContent.replace(/\s+/g,' ').trim();
      if(/^[-+]?R\$\s*0(\b|\.|,)/i.test(raw) || /sem base/i.test(raw) || raw === '+R$ 0 0.0%' || raw === '+R$ 0'){
        cell.classList.add('zero-cell');
        cell.innerHTML='−';
      }
    });
  }
  function setupStableNavigation(){
    const links=document.querySelector('.top-site-links');
    if(links && !links.dataset.v40fixed){
      links.querySelectorAll('[data-fixed-anchor]').forEach(a=>a.remove());
      const fixedLinks=[
        ['fixed-kpis','Visão geral'],
        ['fixed-chart','Controle mensal'],
        ['fixed-dev','Desvios'],
        ['fixed-sensitive','Linhas sensíveis'],
        ['fixed-map','Mapa']
      ];
      fixedLinks.forEach(([id,label])=>{
        const a=document.createElement('a');
        a.href='#'+id; a.dataset.fixedAnchor='true'; a.dataset.target=id; a.textContent=label;
        links.appendChild(a);
      });
      links.dataset.v40fixed='1';
    }
    const fixedGrid=document.querySelector('#fixed-costs .fixed-costs-grid');
    if(fixedGrid){
      const children=[...fixedGrid.children];
      if(children[0]) children[0].id='fixed-kpis';
      if(children[1]) children[1].id='fixed-chart';
      if(children[3]) children[3].id='fixed-dev';
      if(children[4]) children[4].id='fixed-sensitive';
      if(children[5]) children[5].id='fixed-map';
    }
    document.querySelectorAll('[data-fixed-anchor]').forEach(a=>{
      if(a.dataset.v40bound) return;
      a.dataset.v40bound='1';
      a.addEventListener('click', ev=>{
        if(document.body.dataset.page !== 'fixed') return;
        ev.preventDefault();
        const id=a.getAttribute('href')?.replace('#','');
        const target=id && document.getElementById(id);
        if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
      });
    });
  }
  function renderDirectorV40(){
    const months=getMonths();
    const p=periodLabel(months);
    const agg=aggregateSafe(months);
    const cats=categoriesFor(months);
    const top=cats[0]||{name:'—',value:0,pct:0};
    const fixed=fixedBasis(months);
    const margin=agg.entradas ? agg.resultado/agg.entradas*100 : 0;
    const fixedOut=agg.saidas ? fixed.basis/agg.saidas*100 : 0;
    const monthly=months.map(m=>({m,...(DATA.monthly[m]||{})}));
    const deficits=monthly.filter(x=>(x.resultado||0)<0);
    const best=monthly.slice().sort((a,b)=>(b.resultado||0)-(a.resultado||0))[0];
    const worst=monthly.slice().sort((a,b)=>(a.resultado||0)-(b.resultado||0))[0];
    const score=Math.max(0, Math.min(100, Math.round(52 + Math.max(-25, Math.min(25, margin*2.4)) - Math.max(0, top.pct-55)*0.35 - deficits.length*4 - Math.max(0, fixedOut-9)*1.5)));
    let verdict='ESTÁVEL', color='var(--green)', desc=`Geração líquida de caixa positiva com margem de ${pct(margin)}.`;
    if(agg.resultado < 0){ verdict='CRÍTICO'; color='var(--red)'; desc=`Consumo líquido de caixa no período: ${fmtFull(agg.resultado)}.`; }
    else if(top.pct > 60 || deficits.length){ verdict='ATENÇÃO'; color='var(--gold-l)'; desc=`Resultado positivo, mas com concentração relevante em ${top.name} e ${deficits.length} mês(es) deficitário(s).`; }
    const pl=document.getElementById('directorPeriodLabel'); if(pl) pl.textContent=p.detail.toUpperCase();
    const v=document.getElementById('directorVerdict');
    if(v){ v.style.setProperty('--director-color',color); v.innerHTML=`<span>Status do período</span><strong>${verdict}</strong><small>${desc}</small>`; }
    // Selo de status padronizado (E1) — mesmo componente das outras páginas; número-chave = resultado.
    if(window.MarconiSeal){
      const sealTone = agg.resultado < 0 ? 'risk' : (verdict==='ATENÇÃO' ? 'watch' : 'good');
      window.MarconiSeal.render('directorStatusSeal', {
        label:'STATUS DO PERÍODO · '+p.short,
        verdict:verdict,
        tone:sealTone,
        metricValue:(agg.resultado>=0?'+':'')+fmtShort(agg.resultado),
        metricLabel:`resultado do período · margem ${pct(margin)}`,
        desc:desc
      });
    }
    const kpis=[
      {label:'Entradas', raw:agg.entradas, text:fmtShort(agg.entradas), sub:`${months.length} mês(es)`, cls:'positive', c:'var(--green)'},
      {label:'Saídas gerenciais', raw:agg.saidas, text:fmtShort(agg.saidas), sub:`Top: ${top.name}`, cls:'cyan', c:'var(--cyan)'},
      {label:'Resultado', raw:agg.resultado, text:`${agg.resultado>=0?'+':''}${fmtShort(agg.resultado)}`, sub:`Margem ${pct(margin)}`, cls:agg.resultado>=0?'positive':'negative', c:agg.resultado>=0?'var(--green)':'#F87171'},
      {label:'Custo fixo', raw:fixed.basis, text:fmtShort(fixed.basis), sub:`${pct(fixedOut)} das saídas`, cls:'gold', c:'var(--gold-l)'}
    ];
    const kg=document.getElementById('directorKpis');
    if(kg){
      kg.innerHTML=kpis.map((k,i)=>`<div class="director-kpi" style="--dkpi-color:${k.c}"><div class="lbl">${k.label}</div><div class="val ${k.cls}" data-director-kpi="${i}">${k.text}</div><div class="sub">${esc(k.sub)}</div></div>`).join('');
      kpis.forEach((k,i)=>countText(kg.querySelector(`[data-director-kpi="${i}"]`), k.text, k.raw, val=>{
        if(k.label==='Resultado') return `${val>=0?'+':''}${fmtShort(val)}`;
        return fmtShort(val);
      }));
    }
    const sc=document.getElementById('directorScore'); if(sc) sc.textContent=`${score}/100`;
    const sf=document.getElementById('directorScoreFill'); if(sf) sf.style.width=`${score}%`;
    const health=[
      ['Liquidez', agg.resultado>=0?'Positiva':'Pressionada', `${fmtFull(agg.resultado)} de resultado líquido.`],
      ['Concentração', top.pct>60?'Alta':'Controlada', `${top.name} representa ${pct(top.pct)} das saídas.`],
      ['Custos fixos', fixedOut>10?'Relevante':'Controlado', `${pct(fixedOut)} das saídas gerenciais.`],
      ['Meses deficitários', deficits.length?`${deficits.length} mês(es)`:'Nenhum', deficits.length?`Pior: ${monthLong(worst.m)} (${fmtFull(worst.resultado)}).`:'Sem déficits no recorte.']
    ];
    const hl=document.getElementById('directorHealthList'); if(hl) hl.innerHTML=health.map(h=>`<div class="director-health-item"><b>${h[0]} · ${h[1]}</b><span>${h[2]}</span></div>`).join('');
    const att=[
      {c:'var(--gold)', b:'Categoria dominante', s:`${top.name} concentra ${fmtFull(top.value)} no período.`},
      {c:(worst?.resultado||0)<0?'var(--red)':'var(--green)', b:'Pior mês observado', s:worst?`${monthLong(worst.m)} · ${fmtFull(worst.resultado||0)}.`:'Sem mês identificado.'},
      {c:'var(--cyan)', b:'Melhor geração de caixa', s:best?`${monthLong(best.m)} · ${fmtFull(best.resultado||0)}.`:'Sem mês identificado.'}
    ];
    const al=document.getElementById('directorAttentionList'); if(al) al.innerHTML=att.map(x=>`<div class="director-attention-item" style="--c:${x.c}"><b>${x.b}</b><span>${x.s}</span></div>`).join('');
    const ex=document.getElementById('directorExplanation'); if(ex) ex.innerHTML=`No recorte <strong>${p.short}</strong>, a operação registrou <strong>${fmtFull(agg.entradas)}</strong> em entradas e <strong>${fmtFull(agg.saidas)}</strong> em saídas gerenciais, gerando <strong>${fmtFull(agg.resultado)}</strong> de resultado. A principal leitura para diretoria é a concentração em <strong>${top.name}</strong>, responsável por <strong>${pct(top.pct)}</strong> das saídas. A estrutura fixa representa <strong>${pct(fixedOut)}</strong> das saídas gerenciais.`;
    const recs=[];
    if(top.pct>55) recs.push(`Validar plano de pagamento e negociação da categoria dominante (${top.name}).`);
    if(deficits.length) recs.push(`Endereçar meses deficitários, priorizando ${worst?monthLong(worst.m):'o pior mês do período'}.`);
    if(fixedOut>8) recs.push('Acompanhar custos fixos como percentual das saídas para preservar flexibilidade financeira.');
    recs.push('Manter leitura separada entre realizado e projeção em todas as decisões de caixa.');
    const ac=document.getElementById('directorActionsList'); if(ac) ac.innerHTML=recs.slice(0,4).map(r=>`<li>${esc(r)}</li>`).join('');
  }
  function afterAnyRender(){
    setupStableNavigation();
    normalizeHeatmapZeros();
    if(document.body.dataset.page==='director') renderDirectorV40();
  }
  window.renderDirectorPage = renderDirectorV40;
  const oldApply = window.applyFilter || (typeof applyFilter === 'function' ? applyFilter : null);
  if(oldApply && !window.__v40ApplyWrapped){
    window.__v40ApplyWrapped=true;
    window.applyFilter=function(){ const out=oldApply.apply(this,arguments); setTimeout(afterAnyRender,40); return out; };
  }
  const oldSet = window.setDashboardPage;
  if(oldSet && !window.__v40PageWrapped){
    window.__v40PageWrapped=true;
    window.setDashboardPage=function(page){ const out=oldSet.apply(this,arguments); setTimeout(afterAnyRender,60); return out; };
  }
  onDashboardReady(()=>{
    setupStableNavigation();
    normalizeHeatmapZeros();
    setTimeout(afterAnyRender,250);
    document.querySelectorAll('[data-page-link="director"]').forEach(b=>b.addEventListener('click',()=>setTimeout(renderDirectorV40,80)));
    document.querySelectorAll('[data-page-link="fixed"]').forEach(b=>b.addEventListener('click',()=>setTimeout(normalizeHeatmapZeros,160)));
  });
})();

/* ===== v41-hard-fixes-script ===== */
(function(){
  const money0 = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
  const numBR = v => Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:1});
  function parseFinal(txt){
    txt = String(txt||'').trim();
    const sign = /^\s*[-−]/.test(txt) ? -1 : 1;
    const plus = /^\s*\+/.test(txt);
    let mult = /M\b/i.test(txt) ? 1e6 : /K\b/i.test(txt) ? 1e3 : 1;
    let raw = txt.replace(/R\$|%|M\b|K\b|\+/gi,'').replace(/[−-]/g,'-').trim();
    raw = raw.replace(/\./g,'').replace(',', '.').replace(/[^0-9.-]/g,'');
    let value = parseFloat(raw);
    if(!Number.isFinite(value)) return null;
    value = Math.abs(value) * sign * mult;
    return {value, plus, isMoney:/R\$/i.test(txt), isPct:/%/.test(txt), isM:/M\b/i.test(txt), isK:/K\b/i.test(txt), final:txt};
  }
  function fmtBy(final, v){
    const p = parseFinal(final); if(!p) return final;
    const sign = v < 0 ? '-' : (p.plus ? '+' : '');
    const a = Math.abs(v);
    if(p.isPct) return `${sign}${numBR(a)}%`;
    if(p.isMoney && p.isM) return `${sign}R$ ${(a/1e6).toFixed(2)}M`;
    if(p.isMoney && p.isK) return `${sign}R$ ${(a/1e3).toFixed(0)}K`;
    if(p.isMoney) return `${sign}${money0.format(a)}`;
    return `${sign}${Math.round(a).toLocaleString('pt-BR')}`;
  }
  function animateOne(el){
    if(!el || el.dataset.v41Busy === '1') return;
    const final = (el.dataset.v41Final || el.textContent || '').trim();
    const parsed = parseFinal(final);
    if(!parsed) return;
    if(el.dataset.v41Done === final) return;
    el.dataset.v41Busy = '1';
    el.dataset.v41Final = final;
    el.dataset.v41Animating = 'true';
    const start = performance.now(), dur = 820;
    const from = 0, to = parsed.value;
    function tick(now){
      const t = Math.min(1,(now-start)/dur);
      const ease = 1 - Math.pow(1-t,3);
      el.textContent = fmtBy(final, from + (to-from)*ease);
      if(t < 1) requestAnimationFrame(tick);
      else { el.textContent = final; el.dataset.v41Done = final; el.dataset.v41Busy='0'; el.dataset.v41Animating='false'; }
    }
    requestAnimationFrame(tick);
  }
  function animateNumbers(scope=document){
    const selector = [
      '.hero-stat .value','.kpi-value','.insight-value','.exec-metric .val','.result-summary-item .val',
      '.rank-value','.rank-pct','.daily-stat .val','.category-metric .val','.data-table td.num',
      '.director-kpi .val','#directorScore','.fixed-row-value','.fixed-sensitive-metrics .v',
      '.fixed-focus-kpi .v','.fixed-focus-month .v','.fixed-dev-item .value'
    ].join(',');
    scope.querySelectorAll(selector).forEach(animateOne);
  }
  function cleanHeatmap(){
    document.querySelectorAll('#fixedCostsHeatmap .fixed-heatmap-cell').forEach(cell=>{
      const raw = (cell.textContent || '').replace(/\s+/g,' ').trim();
      if(raw === '−' || /sem base/i.test(raw) || /^\+?R\$\s*0(?:\b|,|\.)/i.test(raw) || /^-?R\$\s*0(?:\b|,|\.)/i.test(raw)){
        cell.classList.add('zero-cell');
        cell.innerHTML = '−';
      }
    });
  }
  function syncSidebar(){
    const page = document.body.dataset.page || 'cash';
    const title = document.querySelector('.sidebar-brand .brand-title');
    const sub = document.querySelector('.sidebar-brand .brand-subtitle');
    const summary = document.getElementById('activeFilterSummary');
    if(page === 'fixed'){
      if(title) title.textContent = 'Custos Fixos 2026';
      if(sub) sub.textContent = 'Controle orçamentário executivo';
      if(summary){
        const txt = (document.getElementById('monthSelectLabel')?.textContent || 'Período: 2026').replace('Período:', '');
        summary.textContent = `Custos Fixos · ${txt.trim()}`;
      }
    } else if(page === 'cash'){
      if(title) title.textContent = 'Fluxo de Caixa 2026';
      if(sub) sub.textContent = 'Dashboard financeiro executivo';
    }
  }
  function setupFixedAnchors(){
    const grid = document.querySelector('#fixed-costs .fixed-costs-grid');
    if(grid){
      const c=[...grid.children];
      if(c[0]) c[0].id='fixed-kpis';
      if(c[1]) c[1].id='fixed-chart';
      if(c[2]) c[2].id='fixed-composition';
      if(c[3]) c[3].id='fixed-dev';
      if(c[4]) c[4].id='fixed-sensitive';
      if(c[5]) c[5].id='fixed-map';
      if(c[6]) c[6].id='fixed-analysis';
    }
    const links = document.querySelector('.top-site-links');
    if(links && !links.dataset.v41FixedNav){
      links.querySelectorAll('[data-fixed-anchor]').forEach(a=>a.remove());
      [ ['fixed-kpis','Visão Geral'], ['fixed-chart','Controle Mensal'], ['fixed-dev','Desvios'], ['fixed-sensitive','Linhas Sensíveis'], ['fixed-map','Mapa'] ].forEach(([id,label])=>{
        const a=document.createElement('a'); a.href='#'+id; a.dataset.fixedAnchor='true'; a.dataset.target=id; a.textContent=label; links.appendChild(a);
      });
      links.dataset.v41FixedNav='1';
    }
  }
  function afterRender(){
    setupFixedAnchors();
    cleanHeatmap();
    syncSidebar();
    animateNumbers();
  }
  const oldRender = window.renderFixedCosts;
  if(typeof oldRender === 'function' && !window.__v41WrapFixed){
    window.__v41WrapFixed = true;
    window.renderFixedCosts = function(){
      const r = oldRender.apply(this, arguments);
      setTimeout(afterRender, 40);
      return r;
    };
  }
  const oldApply = window.applyFilter;
  if(typeof oldApply === 'function' && !window.__v41WrapApply){
    window.__v41WrapApply = true;
    window.applyFilter = applyFilter = function(){
      const r = oldApply.apply(this, arguments);
      setTimeout(afterRender, 80);
      return r;
    };
  }
  document.addEventListener('click',()=>setTimeout(afterRender,120),true);
  onDashboardReady(()=>setTimeout(afterRender,350));
  const mo = new MutationObserver(()=>{ clearTimeout(window.__v41MoT); window.__v41MoT=setTimeout(afterRender,180); });
  onDashboardReady(()=>{ try{ mo.observe(document.body,{childList:true,subtree:true,characterData:true}); }catch(e){} });
})();

/* ===== script-13 ===== */
/* PATCH v40 JS - Transições suaves entre páginas */
(function() {
  'use strict';

  // Hook na função setDashboardPage para adicionar transições
  if (typeof window.setDashboardPage === 'function') {
    const original = window.setDashboardPage;
    let isTransitioning = false;
    
    window.setDashboardPage = function(page) {
      if (isTransitioning) return;
      if (document.body.dataset.page === page) return;  // não anima se já está nessa página
      
      isTransitioning = true;
      const body = document.body;
      
      // 1. Fade out atual
      body.classList.remove('page-entered');
      body.classList.add('page-changing');
      
      setTimeout(() => {
        // 2. Trocar de página
        original(page);
        body.classList.remove('page-changing');
        
        // 3. Fade in nova
        requestAnimationFrame(() => {
          body.classList.add('page-entered');
          
          setTimeout(() => {
            body.classList.remove('page-entered');
            isTransitioning = false;
          }, 500);
        });
      }, 200);
    };
  }

  // Hook em setFixedView (mudança entre Visão Geral / Desvios / Mapa)
  if (typeof window.setFixedCostView === 'function') {
    const original = window.setFixedCostView;
    window.setFixedCostView = function(view) {
      if (document.body.dataset.fixedView === view) return;
      
      // Animação suave nos cards
      const grid = document.querySelector('.fixed-costs-grid');
      if (grid) {
        grid.style.opacity = '0';
        grid.style.transform = 'translateY(6px)';
        grid.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        
        setTimeout(() => {
          original(view);
          requestAnimationFrame(() => {
            grid.style.opacity = '1';
            grid.style.transform = 'translateY(0)';
          });
        }, 180);
      } else {
        original(view);
      }
    };
  }

  // Pulse de números (mantido do v39)
  function pulseNumbers(scope) {
    const nodes = scope.querySelectorAll(
      '.cat-value, .ranking-value, .category-value, .insight-value, ' +
      '.kpi-value, .fixed-value, .fixed-kpi-value, .director-value, .director-metric'
    );
    nodes.forEach(n => {
      n.classList.remove('number-pulse');
      void n.offsetWidth;
      n.classList.add('number-pulse');
      setTimeout(() => n.classList.remove('number-pulse'), 700);
    });
  }

  document.addEventListener('click', function(e) {
    const item = e.target.closest(
      '.cat-item, .category-row, .ranking-row, .ranking-item, ' +
      '.fixed-dev-item, .fixed-sensitive-card, .fixed-kpi'
    );
    if (item) {
      const section = item.closest('section, .fixed-card') || document.body;
      pulseNumbers(section);
    }
  });

  console.log('[PATCH v40] Topbar fixa + transições suaves carregadas');
})();

/* ===== script-14 ===== */
/* ============================================================
   PATCH v41 JS - REFINAMENTOS FINAIS
   Count-up + Atalhos + Sombra ao scroll + Toast + Page Progress
   ============================================================ */
(function() {
  'use strict';

  // ===== 1. LOADED CLASS — fade in inicial elegante =====
  function markLoaded() {
    requestAnimationFrame(() => {
      document.body.classList.add('loaded');
    });
  }
  if (document.readyState === 'complete') {
    setTimeout(markLoaded, 100);
  } else {
    window.addEventListener('load', () => setTimeout(markLoaded, 100));
  }

  // ===== 2. TOPBAR — sombra ao scroll =====
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY > 30;
        document.body.classList.toggle('scrolled', scrolled);
        
        // Page progress bar
        let bar = document.querySelector('.page-progress');
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'page-progress';
          document.body.appendChild(bar);
        }
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
        bar.style.width = pct + '%';
        
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  // ===== 3. COUNT-UP ANIMATION nos KPIs =====
  function parseValue(text) {
    if (!text) return null;
    // Detecta: "R$ 1.234.567,89", "1.234.567", "10.3%", "+R$ 63.960"
    const negative = text.includes('-') && !text.match(/^[+-]\s*R\$/);
    const cleaned = text.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return negative ? -Math.abs(num) : num;
  }

  function formatLike(original, value) {
    // Preservar formato original
    const isCurrency = original.includes('R$');
    const isPercent = original.includes('%');
    const isPositive = original.includes('+');
    const isNegative = original.includes('-') || value < 0;
    
    let formatted;
    const absV = Math.abs(value);
    
    if (isCurrency) {
      formatted = 'R$ ' + Math.round(absV).toLocaleString('pt-BR');
    } else if (isPercent) {
      formatted = absV.toFixed(1) + '%';
    } else {
      formatted = Math.round(absV).toLocaleString('pt-BR');
    }
    
    if (isPositive && value > 0) formatted = '+' + formatted;
    else if (isNegative) formatted = '-' + formatted;
    
    return formatted;
  }

  function countUp(el, duration = 1200) {
    if (el.dataset.counterDone) return;
    const target = parseValue(el.textContent);
    if (target === null) return;
    
    const originalText = el.textContent;
    el.dataset.counterDone = '1';
    el.dataset.originalText = originalText;
    
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = target * eased;
      el.textContent = formatLike(originalText, current);
      
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = originalText;  // valor exato no fim
      }
    }
    requestAnimationFrame(step);
  }

  function animateVisibleKPIs() {
    const selectors = [
      '.kpi-value', '.fixed-kpi-value', '.director-value', '.director-metric',
      '.hero-stat-value', '.health-card .metric-value'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      // Reset para animar de novo ao trocar de página
      el.dataset.counterDone = '';
      // Apenas se estiver visível
      const rect = el.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        countUp(el, 1100);
      }
    });
  }
  
  // Animar KPIs na carga inicial
  if (document.readyState === 'complete') {
    setTimeout(animateVisibleKPIs, 400);
  } else {
    window.addEventListener('load', () => setTimeout(animateVisibleKPIs, 400));
  }

  // Re-animar ao trocar de página
  if (typeof window.setDashboardPage === 'function') {
    const _orig = window.setDashboardPage;
    window.setDashboardPage = function(p) {
      _orig(p);
      setTimeout(animateVisibleKPIs, 350);
    };
  }

  // ===== 4. TOAST notification helper =====
  function showToast(text, duration = 1800) {
    let toast = document.querySelector('.toast-v41');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-v41';
      document.body.appendChild(toast);
    }
    toast.innerHTML = text;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  }
  window.showToastV41 = showToast;

  // ===== 5. ATALHOS DE TECLADO =====
  document.addEventListener('keydown', (e) => {
    // Ignora se está digitando em input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    const key = e.key.toLowerCase();
    
    // Pop-up/modal aberto (cinema, painel de foco, dropdown de mês): Escape fecha; nenhum
    // atalho global dispara — senão a tecla "vaza" e troca a página POR TRÁS do pop-up.
    // (Mesmo bug que corrigimos no cinema; novos overlays: some o seletor aqui.)
    const cineOpen = document.body.classList.contains('cine-active');
    const focusPanel = document.querySelector('.fixed-focus-panel.show');
    const monthDrop = document.querySelector('#monthSelect.open');
    if (cineOpen || focusPanel || monthDrop) {
      if (key === 'escape') {
        if (focusPanel) { focusPanel.classList.remove('show'); focusPanel.innerHTML = ''; }
        if (monthDrop) {
          monthDrop.classList.remove('open');
          document.getElementById('monthSelectBtn')?.setAttribute('aria-expanded', 'false');
        }
      }
      return;
    }

    // Navegação entre páginas
    if (key === 'd') { window.setDashboardPage?.('director'); showToast('Diretoria'); }
    else if (key === 'f') { window.setDashboardPage?.('cash'); showToast('Fluxo de Caixa'); }
    else if (key === 'c') { window.setDashboardPage?.('fixed'); showToast('Custos Fixos'); }
    
    // Setas — próxima/anterior
    else if (key === 'arrowright') {
      const pages = ['director', 'cash', 'fixed'];
      const current = document.body.dataset.page || 'cash';
      const idx = pages.indexOf(current);
      const next = pages[(idx + 1) % pages.length];
      window.setDashboardPage?.(next);
      const labels = { director: 'Diretoria', cash: 'Fluxo de Caixa', fixed: 'Custos Fixos' };
      showToast(labels[next]);
    }
    else if (key === 'arrowleft') {
      const pages = ['director', 'cash', 'fixed'];
      const current = document.body.dataset.page || 'cash';
      const idx = pages.indexOf(current);
      const prev = pages[(idx - 1 + pages.length) % pages.length];
      window.setDashboardPage?.(prev);
      const labels = { director: 'Diretoria', cash: 'Fluxo de Caixa', fixed: 'Custos Fixos' };
      showToast(labels[prev]);
    }
    
    // Export
    else if (key === 'p') {
      e.preventDefault();
      showToast('Preparando exportação...');
      if (typeof window.runDashboardExport === 'function') window.runDashboardExport(e);
      else setTimeout(() => window.print(), 500);
    }
    
    // Top
    else if (key === 'home') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Help (?)
    else if (key === '?' || (e.shiftKey && key === '/')) {
      e.preventDefault();
      const help = [
        '<kbd>D</kbd> Diretoria',
        '<kbd>F</kbd> Fluxo',
        '<kbd>C</kbd> Custos',
        '<kbd>←</kbd><kbd>→</kbd> Trocar página',
        '<kbd>P</kbd> Imprimir'
      ].join(' &nbsp;·&nbsp; ');
      showToast(help, 5000);
    }
  });

  // ===== 6. TOOLTIPS automáticos em ícones e KPIs =====
  function addTooltips() {
    document.querySelectorAll('.fixed-kpi-label, .kpi-label').forEach(el => {
      if (el.dataset.tooltipAdded) return;
      el.dataset.tooltipAdded = '1';
    });
  }
  addTooltips();

  // ===== 7. PERFORMANCE LOGGING (silencioso) =====
  console.log('%c✓ Dashboard Marconi Foods', 'color: #FCD34D; font-size: 14px; font-weight: bold; padding: 4px 12px; background: rgba(252,211,77,0.10); border-radius: 4px;');
  console.log('%cVersão v41 — Refinamentos Finais', 'color: #94A0B8; font-size: 11px;');
  console.log('%cAtalhos:', 'color: #94A0B8; font-weight: bold;');
  console.log('%c  D - Diretoria | F - Fluxo de Caixa | C - Custos Fixos | ←/→ - Próxima/anterior | P - Imprimir | ? - Ajuda', 'color: #5A6580; font-size: 11px;');

})();

/* ===== script-15 ===== */
/* ============================================================
   PATCH v42 JS - Sidebar Collapse Toggle
   ============================================================ */
(function() {
  'use strict';

  function setupSidebarToggle() {
    const sidebar = document.querySelector('.control-sidebar');
    if (!sidebar) return;
    if (sidebar.querySelector('.sidebar-toggle-btn')) return; // já criado
    
    // Cria o botão
    const btn = document.createElement('button');
    btn.className = 'sidebar-toggle-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Colapsar/expandir painel lateral');
    btn.setAttribute('title', 'Encolher painel (S)');
    btn.setAttribute('data-tooltip', 'Encolher (S)');
    
    // Inserir como primeiro filho da sidebar
    sidebar.style.position = sidebar.style.position || 'fixed';
    sidebar.insertBefore(btn, sidebar.firstChild);
    
    // Carregar estado salvo
    const savedCollapsed = localStorage.getItem('marconi_sidebar_collapsed') === '1';
    if (savedCollapsed) {
      document.body.classList.add('sidebar-collapsed');
      btn.setAttribute('title', 'Expandir painel (S)');
      btn.setAttribute('data-tooltip', 'Expandir (S)');
    }
    
    // Toggle handler
    function toggle() {
      // BLOQUEIO: Diretoria não tem sidebar — S não faz nada nessa página
      if (document.body.dataset.page === 'director') {
        return;
      }
      const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('marconi_sidebar_collapsed', isCollapsed ? '1' : '0');
      
      // Atualiza tooltip
      btn.setAttribute('title', isCollapsed ? 'Expandir painel (S)' : 'Encolher painel (S)');
      btn.setAttribute('data-tooltip', isCollapsed ? 'Expandir (S)' : 'Encolher (S)');
      
      // Feedback toast
      if (window.showToastV41) {
        window.showToastV41(isCollapsed ? 'Painel encolhido' : 'Painel expandido');
      }
      
      // Recalcular charts se necessário (alguns charts precisam reflow)
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 460);
    }
    
    btn.addEventListener('click', toggle);
    
    // Quando colapsada, click em qualquer lugar da sidebar expande
    sidebar.addEventListener('click', (e) => {
      if (document.body.classList.contains('sidebar-collapsed') && 
          !e.target.closest('.sidebar-toggle-btn')) {
        toggle();
      }
    });
    
    // Atalho de teclado "S"
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      if (e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault();
        toggle();
      }
    });
    
    // Expor função globalmente
    window.toggleSidebarV42 = toggle;
    
    console.log('[PATCH v42] Sidebar toggle ativo. Atalho: S');
  }

  // Atualizar lista de atalhos no help
  function updateHelpToast() {
    const original = window.showToastV41;
    if (!original) return;
    
    // Intercepta o "?" para incluir o S
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const help = [
          '<kbd>D</kbd> Diretoria',
          '<kbd>F</kbd> Fluxo',
          '<kbd>C</kbd> Custos',
          '<kbd>S</kbd> Painel',
          '<kbd>←</kbd><kbd>→</kbd> Trocar',
          '<kbd>P</kbd> Imprimir'
        ].join(' &nbsp;·&nbsp; ');
        original(help, 6000);
      }
    }, true); // useCapture true para vir antes do v41
  }

  onDashboardReady(() => {
    setupSidebarToggle();
    updateHelpToast();
  });
})();

/* ===== script-16 ===== */
/* PATCH v44 - Fallback inline style para garantia absoluta */
(function() {
  function applyLayoutAdjust() {
    const isCollapsed = document.body.classList.contains('sidebar-collapsed');
    const main = document.querySelector('.dashboard-main');
    const sidebar = document.querySelector('.control-sidebar');
    const topbar = document.querySelector('.top-site-nav');

    // Diretoria nao tem sidebar de filtro (pagina de apresentacao): conteudo
    // centralizado, sem reservar o "vao" da sidebar fantasma. Sem isso, o offset
    // herdado do estado expandido/colapsado do Fluxo vazava pra ca (bug do vao).
    const isDirector = document.body.dataset.page === 'director';

    const offset = isDirector ? '0px' : (isCollapsed ? '98px' : '326px');
    const sidebarW = isCollapsed ? '64px' : '292px';
    const topbarLeft = isDirector ? '22px' : offset;

    if (main) main.style.setProperty('margin-left', offset, 'important');
    if (sidebar) sidebar.style.setProperty('width', sidebarW, 'important');
    if (topbar) topbar.style.setProperty('left', topbarLeft, 'important');
  }
  
  // Aplica ao trocar de página (vence regras data-page específicas)
  function watchPageChange() {
    let last = document.body.dataset.page;
    setInterval(() => {
      if (document.body.dataset.page !== last) {
        last = document.body.dataset.page;
        setTimeout(applyLayoutAdjust, 20);
      }
    }, 200);
  }
  
  // Aplica ao toggle da sidebar
  function watchSidebarToggle() {
    const observer = new MutationObserver(() => applyLayoutAdjust());
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  
  function init() {
    applyLayoutAdjust();
    watchPageChange();
    watchSidebarToggle();
    console.log('[PATCH v44] Layout enforcement ativo');
  }
  
  onDashboardReady(init);
})();

/* ===== script-17 ===== */
/* PATCH v55 JS - Remove fisicamente o submenu do DOM */
(function() {
  function hideSubmenus() {
    var submenus = document.querySelectorAll('.top-site-links');
    submenus.forEach(function(el) {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
    });
  }
  
  onDashboardReady(hideSubmenus);
  
  // Re-aplicar quando muda de página
  var obs = new MutationObserver(hideSubmenus);
  obs.observe(document.body, { attributes: true, attributeFilter: ['data-page', 'class'] });
  
  console.log('[PATCH v55] Submenus secundários ocultados em todas as páginas');
})();

/* ===== src/js/45-dre.js ===== */

/* Página DRE — Demonstração de Resultado do Exercício (contábil, regime de competência).
   Lê window.DASHBOARD_DATA.dre (gerado pelo importador a partir do .xlsb da contabilidade).
   Some uma camada via decorator de setDashboardPage — não reescreve a base. */
(function () {
  'use strict';

  var MONTH_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  function fmt() { return (window.MarconiFormat) || {}; }
  function esc(s) { var f = fmt(); return f.escapeHtml ? f.escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }
  function money(v) { var f = fmt(); return f.moneyFull ? f.moneyFull(v) : 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR'); }
  function cell(v) {
    var n = Math.round(Number(v) || 0);
    return n.toLocaleString('pt-BR');
  }

  function dreData() {
    var data = window.DASHBOARD_DATA || window.__DATA__ || {};
    return data.dre || null;
  }

  function valOf(line, m) {
    var v = line.values || {};
    return Number(v[m] != null ? v[m] : (v[String(m)] != null ? v[String(m)] : 0)) || 0;
  }
  function sumLine(line, months) {
    return months.reduce(function (s, m) { return s + valOf(line, m); }, 0);
  }
  function findLine(dre, key) {
    for (var i = 0; i < dre.lines.length; i++) { if (dre.lines[i].key === key) return dre.lines[i]; }
    return null;
  }

  // Valor acumulado autoritativo: usa o `acum` assinado (DRE cumulativa) quando há;
  // senão cai pra soma dos meses preenchidos.
  function accumOf(line, filled) {
    if (line && typeof line.acum === 'number') return line.acum;
    return line ? sumLine(line, filled) : 0;
  }

  function renderKpis(dre, filled) {
    var host = document.getElementById('dreKpis');
    if (!host) return;
    var rlV = accumOf(findLine(dre, 'receita_liquida'), filled);
    var rbV = accumOf(findLine(dre, 'receita_bruta'), filled);
    var cmvV = accumOf(findLine(dre, 'cmv'), filled);
    var resV = accumOf(findLine(dre, 'resultado'), filled);
    var margem = rbV > 0 ? (resV / rbV * 100) : 0;
    // Margem bruta GERENCIAL (derivada, não está na DRE assinada): (RL − |CMV|) / RL.
    // Evita a leitura enganosa de "margem bruta = 100%" (a DRE oficial aninha o CMV em Desp. Vendas).
    var margemBruta = rlV > 0 ? ((rlV - Math.abs(cmvV)) / rlV * 100) : 0;

    var cards = [
      { lbl: 'Receita Líquida', val: money(rlV), cls: 'number-gold', sub: 'acumulado assinado' },
      { lbl: 'CMV / Custo', val: money(cmvV), cls: 'number-red', sub: rlV > 0 ? fmtPct(Math.abs(cmvV) / rlV * 100) + ' da receita líquida' : '' },
      { lbl: 'Margem Bruta (gerencial)', val: fmtPct(margemBruta), cls: margemBruta >= 0 ? 'number-green' : 'number-red', sub: '(Receita Líq. − CMV) ÷ Receita Líq.' },
      { lbl: 'Lucro Líquido', val: (resV >= 0 ? '+' : '') + money(resV), cls: resV >= 0 ? 'number-green' : 'number-red', sub: fmtPct(margem) + ' da receita bruta' }
    ];
    host.innerHTML = cards.map(function (c) {
      return '<div class="dre-kpi"><div class="lbl">' + esc(c.lbl) + '</div>' +
        '<div class="val ' + c.cls + '">' + c.val + '</div>' +
        '<div class="sub">' + esc(c.sub) + '</div></div>';
    }).join('');
  }

  function fmtPct(v) {
    var f = fmt();
    if (f.pct) return f.pct(v);
    return (Math.round((v || 0) * 10) / 10).toLocaleString('pt-BR') + '%';
  }

  // ── Selo de status padronizado (E1) — número-chave da DRE = margem líquida ──
  function renderSeal(dre, filled) {
    if (!window.MarconiSeal) return;
    var rlV = accumOf(findLine(dre, 'receita_liquida'), filled);
    var resV = accumOf(findLine(dre, 'resultado'), filled);
    var mLiquida = rlV > 0 ? (resV / rlV * 100) : 0;
    var tone, verdict;
    if (mLiquida < 0) { tone = 'risk'; verdict = 'PREJUÍZO'; }
    else if (mLiquida < 3) { tone = 'watch'; verdict = 'MARGEM NO LIMITE'; }
    else { tone = 'good'; verdict = 'MARGEM POSITIVA'; }
    window.MarconiSeal.render('dreStatusSeal', {
      label: 'STATUS DA DRE · REGIME DE COMPETÊNCIA',
      verdict: verdict,
      tone: tone,
      metricValue: fmtPct(mLiquida),
      metricLabel: 'margem líquida (Lucro Líq. ÷ Receita Líq.)',
      desc: (resV >= 0 ? 'Lucro líquido acumulado de ' + money(resV) : 'Prejuízo acumulado de ' + money(resV)) +
        '. Margem ' + (mLiquida < 3 ? 'no fio da navalha — atenção ao peso do CMV.' : 'saudável no acumulado assinado.')
    });
  }

  // ── Faixa de margens (derivadas, base padronizada na Receita Líquida) ──
  // Cumpre o header que promete "margens": Bruta gerencial, Operacional e Líquida.
  function renderMargins(dre, filled) {
    var host = document.getElementById('dreMargins');
    if (!host) return;
    var rlV = accumOf(findLine(dre, 'receita_liquida'), filled);
    var cmvV = accumOf(findLine(dre, 'cmv'), filled);
    var resV = accumOf(findLine(dre, 'resultado'), filled);
    var despFin = accumOf(findLine(dre, 'desp_fin'), filled);
    var recFin = accumOf(findLine(dre, 'rec_fin'), filled);
    // Margem bruta gerencial = (RL − |CMV|) ÷ RL.
    var mBruta = rlV > 0 ? ((rlV - Math.abs(cmvV)) / rlV * 100) : 0;
    // Margem líquida = Resultado ÷ RL.
    var mLiquida = rlV > 0 ? (resV / rlV * 100) : 0;
    // Margem operacional = resultado ANTES do financeiro ÷ RL (resultado − rec.fin. + |desp.fin.|).
    var resOper = resV - recFin + Math.abs(despFin);
    var mOper = rlV > 0 ? (resOper / rlV * 100) : 0;

    var items = [
      { lbl: 'Margem Bruta', val: mBruta, sub: '(RL − CMV) ÷ RL · gerencial', tone: mBruta >= 0 ? 'pos' : 'neg' },
      { lbl: 'Margem Operacional', val: mOper, sub: 'antes do resultado financeiro ÷ RL', tone: mOper >= 0 ? 'pos' : 'neg' },
      { lbl: 'Margem Líquida', val: mLiquida, sub: 'Lucro Líquido ÷ RL', tone: mLiquida >= 0 ? 'pos' : 'neg' }
    ];
    var head = '<div class="dre-margins-head"><span class="dre-margins-title">MARGENS</span>' +
      '<span class="dre-margins-base">base: Receita Líquida acumulada (' + esc(money(rlV)) + ')</span></div>';
    var cards = '<div class="dre-margins-grid">' + items.map(function (it) {
      return '<div class="dre-margin-card dre-margin--' + it.tone + '">' +
        '<div class="dre-margin-lbl">' + esc(it.lbl) + '</div>' +
        '<div class="dre-margin-val ' + (it.tone === 'pos' ? 'number-green' : 'number-red') + '">' + esc(fmtPct(it.val)) + '</div>' +
        '<div class="dre-margin-sub">' + esc(it.sub) + '</div></div>';
    }).join('') + '</div>';
    host.innerHTML = head + cards;
  }

  // ── Legenda unificada / aviso de regime ──
  function renderLegend(dre, filled) {
    var host = document.getElementById('dreLegend');
    if (!host) return;
    var first = MONTH_FULL[filled[0]] || '';
    var last = MONTH_FULL[filled[filled.length - 1]] || '';
    var range = (first === last ? first : (first + '—' + last)).toUpperCase();
    host.innerHTML =
      '<span class="dre-legend-tag dre-legend-regime">REGIME DE COMPETÊNCIA · ' + esc(range) + ' ASSINADO</span>' +
      '<span class="dre-legend-item"><i class="dre-legend-swatch sw-av"></i>AV% = % da Receita Líquida</span>' +
      '<span class="dre-legend-item"><i class="dre-legend-swatch sw-diverg">Δ</i>soma dos meses ≠ acum. assinado</span>';
  }

  // ── Mini-gráfico de erosão de margem / peso do CMV (tendência mensal) ──
  // Margem líquida mensal e CMV/RL por mês, ambos derivados de dre.lines.values.
  function renderTrend(dre, filled) {
    var host = document.getElementById('dreTrend');
    if (!host) return;
    var rl = findLine(dre, 'receita_liquida');
    var cmv = findLine(dre, 'cmv');
    var res = findLine(dre, 'resultado');
    var abbr = dre.months || ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    // Só meses com Receita Líquida > 0 (evita divisão por zero / meses vazios).
    var pts = filled.filter(function (m) { return valOf(rl, m) > 0; }).map(function (m) {
      var rlv = valOf(rl, m);
      return {
        m: m,
        margem: rlv > 0 ? (valOf(res, m) / rlv * 100) : 0,
        cmvPeso: rlv > 0 ? (Math.abs(valOf(cmv, m)) / rlv * 100) : 0
      };
    });
    if (pts.length < 2) { host.innerHTML = ''; return; }

    var W = 720, H = 220, padL = 44, padR = 44, padT = 26, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = pts.length;
    function x(i) { return padL + (n === 1 ? plotW / 2 : i * plotW / (n - 1)); }
    // Eixo esquerdo: CMV/RL (0–100%). Eixo direito: margem líquida (auto, com folga).
    var maxMarg = Math.max.apply(null, pts.map(function (p) { return p.margem; }).concat([3]));
    var minMarg = Math.min.apply(null, pts.map(function (p) { return p.margem; }).concat([0]));
    var margRange = (maxMarg - minMarg) || 1;
    function yCmv(v) { return padT + plotH - (Math.min(100, v) / 100) * plotH; }
    function yMarg(v) { return padT + plotH - ((v - minMarg) / margRange) * plotH; }

    var grid = '';
    [0, 25, 50, 75, 100].forEach(function (t) {
      var yy = yCmv(t);
      grid += '<line class="dre-trend-grid" x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '"/>';
      grid += '<text class="dre-trend-axis" x="' + (padL - 8) + '" y="' + (yy + 3) + '" text-anchor="end">' + t + '%</text>';
    });
    var labels = pts.map(function (p, i) {
      return '<text class="dre-trend-xlabel" x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(abbr[p.m - 1] || ('M' + p.m)) + '</text>';
    }).join('');
    var cmvLine = pts.map(function (p, i) { return x(i) + ',' + yCmv(p.cmvPeso); }).join(' ');
    var margLine = pts.map(function (p, i) { return x(i) + ',' + yMarg(p.margem); }).join(' ');
    var cmvDots = pts.map(function (p, i) {
      return '<circle class="dre-trend-dot dot-cmv" cx="' + x(i) + '" cy="' + yCmv(p.cmvPeso) + '" r="3.5"><title>' + esc(abbr[p.m - 1]) + ' · CMV ' + esc(fmtPct(p.cmvPeso)) + ' da RL</title></circle>';
    }).join('');
    var margDots = pts.map(function (p, i) {
      return '<circle class="dre-trend-dot dot-marg" cx="' + x(i) + '" cy="' + yMarg(p.margem) + '" r="3.5"><title>' + esc(abbr[p.m - 1]) + ' · margem líquida ' + esc(fmtPct(p.margem)) + '</title></circle>';
    }).join('');
    var svg = '<svg class="dre-trend-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Tendência mensal: peso do CMV sobre a Receita Líquida e margem líquida">' +
      grid +
      '<polyline class="dre-trend-cmv" fill="none" points="' + cmvLine + '"/>' +
      '<polyline class="dre-trend-marg" fill="none" points="' + margLine + '"/>' +
      cmvDots + margDots + labels +
      '</svg>';

    // Texto automático: alerta de erosão a partir do último mês.
    var lastP = pts[pts.length - 1];
    var prevP = pts[pts.length - 2];
    var cmvUp = lastP.cmvPeso > prevP.cmvPeso;
    var margDown = lastP.margem < prevP.margem;
    var lastLbl = MONTH_FULL[lastP.m] || ('mês ' + lastP.m);
    var auto = 'O CMV consumiu <strong>' + fmtPct(lastP.cmvPeso) + '</strong> da receita líquida em <strong>' + esc(lastLbl) + '</strong>';
    if (cmvUp && margDown) {
      auto += ' — peso do custo subindo e <strong class="number-red">margem comprimindo</strong>.';
    } else if (cmvUp) {
      auto += ' — peso do custo em alta no mês.';
    } else if (margDown) {
      auto += ', com <strong class="number-red">margem líquida em queda</strong> no mês.';
    } else {
      auto += ', com margem líquida estável ou em recuperação.';
    }

    var legend = '<div class="dre-trend-legend">' +
      '<span class="dre-trend-key"><i class="sw-cmv"></i>CMV ÷ Receita Líquida</span>' +
      '<span class="dre-trend-key"><i class="sw-marg"></i>Margem líquida</span></div>';
    host.innerHTML =
      '<div class="dre-trend-head"><div class="dre-trend-title">EROSÃO DE MARGEM · CMV vs MARGEM LÍQUIDA</div>' + legend + '</div>' +
      svg +
      '<div class="dre-trend-note">' + auto + '</div>';
  }

  // ── Acesso ao fluxo de caixa (Bling) p/ a Ponte Caixa × Competência (B1) ──
  function cashData() {
    var d = window.DASHBOARD_DATA || {};
    if (d.fluxo_caixa) return d.fluxo_caixa;
    var legacy = window.__DATA__ || {};
    if (legacy.monthly) return legacy; // alias já é o fluxo_caixa
    return legacy.fluxo_caixa || null;
  }

  // ── Ponte Caixa × Competência (B1) — waterfall mês a mês ──
  // Reconcilia, em cada mês onde existem AS DUAS fontes (Jan–Abr), o RESULTADO DE CAIXA do mês
  // (Bling) até o LUCRO LÍQUIDO contábil do mês (DRE, competência), com blocos honestos:
  //   (a) Mov. Financeiras (antecip./empréstimos) — saída de caixa que NÃO é resultado;
  //   (b) Ajustes gerenciais (saídas brutas → líquidas) — já calculados em fluxo_caixa.daily;
  //   (c) Diferenças de competência / defasagem (residual) — o que sobra (compra×pagamento,
  //       venda×recebimento, diferenças de competência). Fecha exatamente no lucro contábil.
  // A decomposição fina do residual depende de saldos de balanço (estoque/recebíveis) — dado futuro.
  function computeBridge(dre) {
    var fc = cashData();
    var out = { months: [] };
    if (!fc || !fc.monthly) return out;
    // Mov. Financeiras por mês (saída embutida no resultado de caixa).
    var movByMonth = {};
    (fc.categoryMonthly || []).forEach(function (c) {
      if (c && /Mov\.\s*Financeiras/i.test(c.name || '')) {
        var mm = c.months || {};
        for (var m = 1; m <= 12; m++) { movByMonth[m] = Number(mm[m] != null ? mm[m] : mm[String(m)]) || 0; }
      }
    });
    // Ajustes gerenciais (saídas brutas − líquidas) por mês, somados do diário.
    var adjByMonth = {};
    (fc.daily || []).forEach(function (x) {
      var m = Number(x.month);
      adjByMonth[m] = (adjByMonth[m] || 0) + (Number(x.ajustesGerenciais) || 0);
    });
    var resLine = findLine(dre, 'resultado');
    // Só meses com AS DUAS fontes: DRE preenchida (monthsFilled) E fluxo realizado (não projeção).
    var bothMonths = (dre.monthsFilled || []).filter(function (m) {
      var rec = fc.monthly[m] || fc.monthly[String(m)];
      return rec && !(window.MarconiFormat && window.MarconiFormat.isProjectionMonth && window.MarconiFormat.isProjectionMonth(m));
    });
    bothMonths.forEach(function (m) {
      var rec = fc.monthly[m] || fc.monthly[String(m)];
      var caixa = Number(rec.resultado) || 0;
      var movFin = movByMonth[m] || 0;
      var ajustes = adjByMonth[m] || 0;
      var lucro = valOf(resLine, m);
      // residual = lucro − (caixa + movFin + ajustes). Fecha a ponte exatamente.
      var residual = lucro - (caixa + movFin + ajustes);
      out.months.push({ m: m, caixa: caixa, movFin: movFin, ajustes: ajustes, residual: residual, lucro: lucro });
    });
    return out;
  }

  function renderBridge(dre) {
    var host = document.getElementById('dreBridge');
    if (!host) return;
    var bridge = computeBridge(dre);
    if (!bridge.months.length) { host.innerHTML = ''; return; }

    // Seletor de mês: usa o último mês disponível por padrão.
    var months = bridge.months.map(function (b) { return b.m; });
    var sel = (host.dataset.bridgeMonth && months.indexOf(Number(host.dataset.bridgeMonth)) >= 0)
      ? Number(host.dataset.bridgeMonth) : months[months.length - 1];
    var b = bridge.months.filter(function (x) { return x.m === sel; })[0] || bridge.months[bridge.months.length - 1];

    var tabs = bridge.months.map(function (x) {
      return '<button type="button" class="dre-bridge-tab' + (x.m === b.m ? ' active' : '') +
        '" data-bridge-month="' + x.m + '">' + esc((dre.months && dre.months[x.m - 1]) || ('M' + x.m)) + '</button>';
    }).join('');

    // Blocos do waterfall, na ordem da ponte.
    var steps = [
      { key: 'start', label: 'Resultado de Caixa (Bling)', value: b.caixa, kind: 'anchor', note: 'entradas − saídas gerenciais do mês' },
      { key: 'mov', label: '+ Mov. Financeiras (antecip./empréstimos)', value: b.movFin, kind: 'delta', note: 'movimentação financeira que não é resultado da operação' },
      { key: 'adj', label: '+ Ajustes gerenciais (saídas brutas → líquidas)', value: b.ajustes, kind: 'delta', note: 'diferença bruto×líquido já calculada no diário (fluxo_caixa.daily)' },
      { key: 'res', label: '− Diferenças de competência / defasagem (residual)', value: b.residual, kind: 'delta', note: 'defasagem compra×pagamento, venda×recebimento e diferenças de competência' },
      { key: 'end', label: 'Lucro Líquido (DRE · competência)', value: b.lucro, kind: 'anchor', note: 'resultado contábil assinado do mês' }
    ];

    // Escala do waterfall: cobre do menor ao maior nível cumulativo.
    var cumul = [], running = 0;
    steps.forEach(function (s) {
      if (s.kind === 'anchor' && s.key === 'start') { running = s.value; cumul.push({ from: 0, to: running, mid: running }); }
      else if (s.kind === 'anchor') { cumul.push({ from: 0, to: s.value, mid: s.value }); }
      else { var from = running; running += s.value; cumul.push({ from: from, to: running, mid: running }); }
    });
    var allLevels = [0];
    cumul.forEach(function (c) { allLevels.push(c.from, c.to); });
    var maxL = Math.max.apply(null, allLevels);
    var minL = Math.min.apply(null, allLevels);
    var range = (maxL - minL) || 1;

    var W = 720, H = 280, padL = 12, padR = 12, padT = 18, padB = 64;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = steps.length;
    var slot = plotW / n, bw = slot * 0.56;
    function bx(i) { return padL + i * slot + (slot - bw) / 2; }
    function yOf(v) { return padT + plotH - ((v - minL) / range) * plotH; }
    var zeroY = yOf(0);

    var bars = steps.map(function (s, i) {
      var c = cumul[i];
      var top, h, cls;
      if (s.kind === 'anchor') {
        top = yOf(Math.max(0, c.to)); h = Math.abs(zeroY - yOf(c.to));
        cls = s.key === 'end' ? 'dre-wf-end' : 'dre-wf-start';
      } else {
        var hi = Math.max(c.from, c.to), lo = Math.min(c.from, c.to);
        top = yOf(hi); h = Math.abs(yOf(hi) - yOf(lo));
        cls = s.value >= 0 ? 'dre-wf-pos' : 'dre-wf-neg';
      }
      var title = s.label + ': ' + (s.value >= 0 && s.kind === 'delta' ? '+' : '') + money(s.value);
      return '<g><rect class="dre-wf-bar ' + cls + '" x="' + bx(i).toFixed(1) + '" y="' + top.toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + Math.max(2, h).toFixed(1) + '" rx="3"><title>' + esc(title) + '</title></rect>' +
        '<text class="dre-wf-val" x="' + (bx(i) + bw / 2).toFixed(1) + '" y="' + (Math.min(top, zeroY) - 6).toFixed(1) +
        '" text-anchor="middle">' + esc((s.value >= 0 && s.kind === 'delta' ? '+' : '') + (window.MarconiFormat && window.MarconiFormat.moneyShort ? window.MarconiFormat.moneyShort(s.value) : money(s.value))) + '</text></g>';
    }).join('');
    // Conectores entre topos cumulativos.
    var conns = '';
    for (var i = 0; i < n - 1; i++) {
      var yc = yOf(cumul[i].to);
      conns += '<line class="dre-wf-conn" x1="' + (bx(i) + bw).toFixed(1) + '" y1="' + yc.toFixed(1) +
        '" x2="' + bx(i + 1).toFixed(1) + '" y2="' + yc.toFixed(1) + '"/>';
    }
    var labels = steps.map(function (s, i) {
      var short = s.key === 'start' ? 'Caixa' : s.key === 'mov' ? 'Mov.Fin.' : s.key === 'adj' ? 'Ajustes' : s.key === 'res' ? 'Compet.' : 'Lucro';
      return '<text class="dre-wf-xlabel" x="' + (bx(i) + bw / 2).toFixed(1) + '" y="' + (H - 40) + '" text-anchor="middle">' + esc(short) + '</text>';
    }).join('');
    var baseLine = '<line class="dre-wf-base" x1="' + padL + '" y1="' + zeroY + '" x2="' + (W - padR) + '" y2="' + zeroY + '"/>';
    var svg = '<svg class="dre-wf-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ponte do resultado de caixa ao lucro líquido contábil do mês">' +
      baseLine + conns + bars + labels + '</svg>';

    // Lista textual auditável dos blocos.
    var rows = steps.map(function (s) {
      var vcls = s.kind === 'anchor' ? (s.value >= 0 ? 'number-gold' : 'number-red') : (s.value >= 0 ? 'number-green' : 'number-red');
      var sign = (s.value >= 0 && s.kind === 'delta') ? '+' : '';
      return '<tr class="dre-bridge-row dre-bridge-row--' + s.kind + '">' +
        '<td class="dre-bridge-lbl">' + esc(s.label) + '<span class="dre-bridge-note">' + esc(s.note) + '</span></td>' +
        '<td class="num dre-bridge-val ' + vcls + '">' + esc(sign + money(s.value)) + '</td></tr>';
    }).join('');

    var monthName = MONTH_FULL[b.m] || ('Mês ' + b.m);
    host.innerHTML =
      '<div class="dre-bridge-head"><div class="dre-bridge-title">PONTE CAIXA × COMPETÊNCIA · ' + esc(monthName.toUpperCase()) + '</div>' +
      '<div class="dre-bridge-tabs" role="tablist" aria-label="Mês da ponte">' + tabs + '</div></div>' +
      '<div class="dre-bridge-sub">“Se a DRE deu lucro, cadê o caixa?” — do <strong>resultado de caixa (Bling)</strong> ao <strong>lucro líquido contábil (competência)</strong> do mês.</div>' +
      svg +
      '<div class="dre-bridge-table-wrap"><table class="dre-bridge-table"><tbody>' + rows + '</tbody></table></div>' +
      '<div class="dre-bridge-foot"><strong>Ponte gerencial.</strong> Reconcilia exatamente o caixa do mês (regime de caixa, Bling) com o lucro contábil do mês (regime de competência, DRE assinada). ' +
      'A linha <em>“Diferenças de competência / defasagem (residual)”</em> agrega a defasagem temporal (compra×pagamento, venda×recebimento) e diferenças de competência; ' +
      'sua <strong>decomposição fina depende de saldos de balanço (estoque/recebíveis)</strong> — dado futuro da contabilidade.</div>';

    // Liga os tabs de mês.
    host.querySelectorAll('[data-bridge-month]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        host.dataset.bridgeMonth = btn.getAttribute('data-bridge-month');
        renderBridge(dre);
      });
    });
  }

  function renderTable(dre, filled) {
    var wrap = document.getElementById('dreTableWrap');
    if (!wrap) return;
    var abbr = dre.months || ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    // Margem bruta gerencial p/ a micro-nota da linha de Lucro Bruto (a DRE oficial aninha o CMV em Desp. Vendas).
    var rlAcum = accumOf(findLine(dre, 'receita_liquida'), filled);
    var cmvAcum = accumOf(findLine(dre, 'cmv'), filled);
    var margemBrutaGer = rlAcum > 0 ? ((rlAcum - Math.abs(cmvAcum)) / rlAcum * 100) : 0;
    // Análise vertical (AV%): cada linha como % da Receita Líquida acumulada (base padronizada).
    function avPct(v) { return rlAcum > 0 ? (v / rlAcum * 100) : 0; }
    // Peso do CMV sobre a RL (acum) p/ a barra proporcional inline na linha do CMV.
    var cmvWeight = rlAcum > 0 ? Math.min(100, Math.abs(cmvAcum) / rlAcum * 100) : 0;

    var head = '<thead><tr><th class="dre-th-label">Linha</th>';
    filled.forEach(function (m) { head += '<th class="num">' + esc(abbr[m - 1] || ('M' + m)) + '</th>'; });
    head += '<th class="num dre-th-total">Acum.</th>';
    head += '<th class="num dre-th-av" title="Análise vertical: cada linha como % da Receita Líquida acumulada" aria-label="Análise vertical (percentual da Receita Líquida)">AV% <small>da RL</small></th>';
    head += '</tr></thead>';

    var colCount = filled.length + 3;
    var body = '<tbody>';
    dre.lines.forEach(function (line) {
      var total = accumOf(line, filled);
      var isResult = (line.kind === 'resultado' || line.kind === 'subtotal');
      var rowCls = 'dre-row dre-row--' + line.kind + ' dre-row--l' + (line.level || 0);
      // Divergência soma(meses preenchidos) × acum assinado — sinalizar por linha quando |Δ| > R$1.
      var somaMeses = sumLine(line, filled);
      var delta = somaMeses - total;
      var hasDiverg = (typeof line.acum === 'number') && Math.abs(delta) > 1;
      var isCmv = (line.key === 'cmv');
      body += '<tr class="' + rowCls + (isCmv ? ' dre-row--cmv' : '') + '">';
      var labelHtml = esc(line.label);
      if (line.key === 'lucro_bruto') {
        var gerNote = 'Estrutura oficial: Lucro Bruto = Receita Líquida (o CMV é deduzido em “Despesas com Vendas”). Margem bruta gerencial (RL − CMV) ÷ RL ≈ ' + fmtPct(margemBrutaGer) + '.';
        labelHtml += ' <span class="dre-ger-note" title="' + esc(gerNote) + '" aria-label="' + esc(gerNote) + '">margem bruta gerencial ' + esc(fmtPct(margemBrutaGer)) + '</span>';
      }
      if (isCmv) {
        // Barra proporcional inline: o CMV consome ~86% da RL → fica claro o quanto sobra.
        var cmvNote = 'O CMV consome ' + fmtPct(cmvWeight) + ' da Receita Líquida acumulada.';
        labelHtml += ' <span class="dre-cmv-bar" role="img" title="' + esc(cmvNote) + '" aria-label="' + esc(cmvNote) + '">' +
          '<span class="dre-cmv-bar-fill" style="width:' + cmvWeight.toFixed(1) + '%"></span>' +
          '<span class="dre-cmv-bar-pct">' + esc(fmtPct(cmvWeight)) + ' da RL</span></span>';
      }
      body += '<td class="dre-cell-label">' + labelHtml + '</td>';
      filled.forEach(function (m) {
        var v = valOf(line, m);
        var vc = (isResult && v < 0) ? 'number-red' : (isResult && v > 0 ? 'number-green' : '');
        body += '<td class="num ' + vc + '">' + (v ? cell(v) : '<span class="dre-zero">—</span>') + '</td>';
      });
      var tc = (isResult && total < 0) ? 'number-red' : (isResult && total > 0 ? 'number-green' : '');
      var badge = '';
      if (hasDiverg) {
        var dlabel = '≠ soma dos meses: Δ ' + (delta >= 0 ? '+' : '') + money(delta) + ' — reclassificações contábeis';
        badge = '<span class="dre-diverg-badge" role="img" aria-label="' + esc(dlabel) + '" title="' + esc(dlabel) + '">Δ</span>';
      }
      body += '<td class="num dre-td-total' + (hasDiverg ? ' dre-td-diverg' : '') + ' ' + tc + '">' + (total ? cell(total) : '—') + badge + '</td>';
      // AV% (análise vertical): % sobre a Receita Líquida acumulada.
      var av = avPct(total);
      var avTxt = (rlAcum > 0 && total) ? fmtPct(av) : '—';
      body += '<td class="num dre-td-av">' + esc(avTxt) + '</td>';
      body += '</tr>';
    });
    body += '</tbody>';

    wrap.innerHTML = '<table class="dre-table" data-col-count="' + colCount + '">' + head + body + '</table>';
  }

  function renderDrePage() {
    var dre = dreData();
    var ctx = document.getElementById('dreContext');
    var foot = document.getElementById('dreFoot');
    if (!dre || !dre.lines || !dre.lines.length) {
      var wrap = document.getElementById('dreTableWrap');
      if (wrap) wrap.innerHTML = '<div class="dre-empty">DRE contábil ainda não disponível para este período.</div>';
      ['dreKpis', 'dreMargins', 'dreTrend', 'dreBridge', 'dreLegend', 'dreStatusSeal'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.innerHTML = '';
      });
      return;
    }
    var filled = (dre.monthsFilled && dre.monthsFilled.length) ? dre.monthsFilled.slice() : [1, 2, 3, 4, 5];
    filled.sort(function (a, b) { return a - b; });

    if (ctx) {
      var first = MONTH_FULL[filled[0]] || '';
      var last = MONTH_FULL[filled[filled.length - 1]] || '';
      ctx.textContent = 'REGIME DE COMPETÊNCIA · ' + (first === last ? first : (first + '—' + last)).toUpperCase();
    }
    renderSeal(dre, filled);
    renderKpis(dre, filled);
    renderMargins(dre, filled);
    renderTrend(dre, filled);
    renderBridge(dre);
    renderLegend(dre, filled);
    renderTable(dre, filled);
    if (foot) {
      var src = dre.source || {};
      var origem = src.origem || 'DRE contábil';
      foot.innerHTML = esc(origem) + (src.empresa ? ' · ' + esc(src.empresa) : '') +
        '. Regime de competência (não confundir com o caixa do Fluxo). Coluna “Acum.” = DRE cumulativa assinada; meses = DREs mensais assinadas (a soma pode diferir do acumulado por reclassificações contábeis).';
    }
  }
  window.renderDrePage = renderDrePage;

  function maybeRenderDre(page) {
    if (page === 'dre') {
      try { renderDrePage(); } catch (e) { console.error('Erro DRE:', e); }
    }
  }

  // Hook primário: o smooth-nav de 50-ux-patches chama window.__baseSetDashboardPage
  // DIRETO (não a cadeia de window.setDashboardPage), então um decorator de
  // window.setDashboardPage seria ignorado. 45-dre roda entre 40 (que define a base)
  // e 50 (que a captura), então envolvemos a base antes de ela ser capturada.
  var base = window.__baseSetDashboardPage;
  if (typeof base === 'function' && !base.__dreWrapped) {
    var wrapped = function (page) {
      var out = base.apply(this, arguments);
      maybeRenderDre(page);
      return out;
    };
    wrapped.__dreWrapped = true;
    window.__baseSetDashboardPage = wrapped;
  }

  // Backup idempotente: evento de troca de página.
  if (window.MarconiEvents && window.MarconiEvents.on) {
    window.MarconiEvents.on('page:changed', function (e) {
      maybeRenderDre(e && e.detail && e.detail.to);
    });
  }

  // Render inicial se a página já abrir na DRE.
  if (window.onDashboardReady) {
    window.onDashboardReady(function () {
      if (document.body && document.body.dataset.page === 'dre') renderDrePage();
    });
  }
})();

/* ===== src/js/47-rj.js ===== */

/* Página RJ — Recuperação Judicial (Onda 3 do ROADMAP-RELATORIOS).
   A Marconi Foods está EM RECUPERAÇÃO JUDICIAL (consta no CNPJ da DRE).
   TUDO aqui é DERIVADO em runtime dos dados já existentes (custos_fixos.items,
   fluxo_caixa.monthly + categoryMonthly, fluxo_caixa.reconciliation) — nada de
   número inventado, nada de seção nova no JSON.
   Some uma camada via decorator de window.__baseSetDashboardPage (igual ao 45-dre),
   ANTES de 50-ux-patches capturar a base. */
(function () {
  'use strict';

  var MONTH_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // ── Rubricas do PROCESSO de Recuperação Judicial (auditável) ──
  // Classificação CONSERVADORA: só entram rubricas inequivocamente ligadas ao
  // processo (administrador judicial, jurídico, consultoria do plano, contábil).
  // Nomes batidos 1:1 contra data/financeiro.json (custos_fixos.items[].name).
  var RJ_RUBRICS = [
    { name: 'Honorários advocatícios-AJ', role: 'Administrador judicial (honorários do AJ)' },
    { name: 'Honorários consultoria', role: 'Consultoria do plano de recuperação' },
    { name: 'Despesas Consultoria - Reembolso', role: 'Reembolso de despesas da consultoria' },
    { name: 'Honorários advocatícios', role: 'Honorários advocatícios do processo' },
    { name: 'Honorários contábeis', role: 'Honorários contábeis do processo' }
  ];
  // Rubricas avaliadas e DELIBERADAMENTE não classificadas como RJ (registro de auditoria).
  // "Honorários TI" é operacional (não jurídico do plano) → fica em estrutura operacional.
  var RJ_EXCLUDED_NOTE = 'Honorários TI tratado como estrutura operacional (suporte, não jurídico do plano).';

  function fmt() { return (window.MarconiFormat) || {}; }
  function esc(s) { var f = fmt(); return f.escapeHtml ? f.escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }
  function money(v) { var f = fmt(); return f.moneyFull ? f.moneyFull(v) : 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR'); }
  function moneyShort(v) { var f = fmt(); return f.moneyShort ? f.moneyShort(v) : money(v); }
  function fmtPct(v) {
    var f = fmt();
    if (f.pct) return f.pct(v);
    return (Math.round((v || 0) * 10) / 10).toLocaleString('pt-BR') + '%';
  }

  function rootData() { return window.DASHBOARD_DATA || window.__DATA__ || {}; }
  function fixedData() { var d = rootData(); return d.custos_fixos || null; }
  function cashData() {
    // __DATA__ pode apontar pro fluxo_caixa (alias legado); DASHBOARD_DATA.fluxo_caixa é canônico.
    var d = window.DASHBOARD_DATA || {};
    if (d.fluxo_caixa) return d.fluxo_caixa;
    var legacy = window.__DATA__ || {};
    if (legacy.monthly) return legacy; // alias já é o fluxo_caixa
    return legacy.fluxo_caixa || null;
  }

  // Selo realizado/parcial/projeção (helpers data-driven da Onda 1).
  function isProjection(m) { var f = fmt(); return f.isProjectionMonth ? f.isProjectionMonth(m) : (m >= 7); }
  function isPartial(m) { var f = fmt(); return f.isPartialMonth ? f.isPartialMonth(m) : false; }

  // Soma o realizado (índice 1 = real) de uma rubrica por nome.
  function realizedOfItem(item) {
    var s = 0;
    (item.months || []).forEach(function (m) { s += Number(m && m[1]) || 0; });
    return s;
  }

  // ── Custo da RJ (A2): isola as rubricas do processo, soma o realizado ──
  function computeRjCost() {
    var fixed = fixedData();
    var out = { rubrics: [], rjTotal: 0, fixedTotal: 0, opTotal: 0, pct: 0 };
    if (!fixed || !Array.isArray(fixed.items)) return out;
    var byName = {};
    fixed.items.forEach(function (it) {
      var real = realizedOfItem(it);
      out.fixedTotal += real;
      byName[it.name] = (byName[it.name] || 0) + real;
    });
    RJ_RUBRICS.forEach(function (r) {
      var v = byName[r.name] || 0;
      out.rubrics.push({ name: r.name, role: r.role, value: v });
      out.rjTotal += v;
    });
    out.opTotal = out.fixedTotal - out.rjTotal;
    out.pct = out.fixedTotal > 0 ? (out.rjTotal / out.fixedTotal * 100) : 0;
    return out;
  }

  // ── Geração de caixa operacional limpa (A1, parcial) ──
  // = resultado de caixa do mês EXCLUINDO "Mov. Financeiras (antecip./empréstimos)"
  //   (saída já presente em categoryMonthly). Como Mov. Financeiras é uma SAÍDA
  //   embutida no resultado, "excluir" = somar de volta → caixa antes do serviço
  //   de dívida/antecipação. Mostra o caixa "limpo" da operação.
  function computeOpCash() {
    var fc = cashData();
    var out = { series: [], accum: 0, hasPartial: false, lastRealized: 0 };
    if (!fc || !fc.monthly) return out;
    var movByMonth = {};
    (fc.categoryMonthly || []).forEach(function (c) {
      if (c && /Mov\.\s*Financeiras/i.test(c.name || '')) {
        var mm = c.months || {};
        for (var m = 1; m <= 12; m++) { movByMonth[m] = Number(mm[m] != null ? mm[m] : mm[String(m)]) || 0; }
      }
    });
    for (var m = 1; m <= 12; m++) {
      if (isProjection(m)) continue; // só realizado/parcial (Jul–Dez = 0/projeção)
      var rec = fc.monthly[m] || fc.monthly[String(m)];
      if (!rec) continue;
      var resultado = Number(rec.resultado) || 0;
      var mov = movByMonth[m] || 0;
      var opGen = resultado + mov; // exclui a saída financeira
      var partial = isPartial(m);
      out.series.push({ m: m, resultado: resultado, mov: mov, opGen: opGen, partial: partial });
      out.accum += opGen;
      if (partial) out.hasPartial = true; else out.lastRealized = m;
    }
    return out;
  }

  // ── Reconciliação (governança) ──
  function computeRecon() {
    var fc = cashData();
    var out = { months: 0, divergences: 0, semClassif: 0, semClassifCount: 15 };
    if (fc && Array.isArray(fc.reconciliation)) {
      fc.reconciliation.forEach(function (r) {
        out.months++;
        if (Math.abs(Number(r.entradasDiff) || 0) > 0.01 || Math.abs(Number(r.saidasDiff) || 0) > 0.01) out.divergences++;
      });
    }
    // "Sem classificação" — lançamentos do Bling ainda a categorizar.
    (fc && fc.categories || []).forEach(function (c) {
      if (/Sem\s*classifica/i.test(c.name || '')) out.semClassif += Number(c.value != null ? c.value : 0) || 0;
    });
    return out;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: faixa de RJ (A3)
  // ─────────────────────────────────────────────────────────────────────────
  function renderBanner(op) {
    var host = document.getElementById('rjBanner');
    if (!host) return;
    var rangeLbl = '';
    if (op.series.length) {
      var first = MONTH_FULL[op.series[0].m] || '';
      var lastEntry = op.series[op.series.length - 1];
      var last = MONTH_FULL[lastEntry.m] || '';
      rangeLbl = (first === last ? first : (first + '—' + last)).toUpperCase();
      if (lastEntry.partial) rangeLbl += ' (parcial)';
    }
    var accCls = op.accum >= 0 ? 'number-green' : 'number-red';
    host.innerHTML =
      '<span class="rj-banner-flag">EM RECUPERAÇÃO JUDICIAL</span>' +
      '<span class="rj-banner-sep" aria-hidden="true"></span>' +
      '<span class="rj-banner-metric"><span class="rj-banner-metric-val ' + accCls + '">' + esc((op.accum >= 0 ? '+' : '') + money(op.accum)) + '</span>' +
      '<span class="rj-banner-metric-lbl">caixa operacional gerado (acum. ' + esc(rangeLbl || 'do período') + ')</span></span>' +
      '<span class="rj-banner-tag">ESTIMATIVA GERENCIAL · não é plano homologado</span>';
  }

  // Selo de status (A3) — número-chave = caixa operacional gerado acumulado.
  function renderSeal(op, rj) {
    if (!window.MarconiSeal) return;
    var tone, verdict;
    if (op.accum < 0) { tone = 'risk'; verdict = 'QUEIMA DE CAIXA'; }
    else if (op.accum < 300000) { tone = 'watch'; verdict = 'GERAÇÃO MAGRA'; }
    else { tone = 'good'; verdict = 'OPERAÇÃO GERA CAIXA'; }
    window.MarconiSeal.render('rjStatusSeal', {
      label: 'STATUS DA RECUPERAÇÃO JUDICIAL · GERENCIAL',
      verdict: verdict,
      tone: tone,
      metricValue: (op.accum >= 0 ? '+' : '') + money(op.accum),
      metricLabel: 'caixa operacional gerado acumulado (exclui antecipações/empréstimos)',
      desc: 'A operação ' + (op.accum >= 0 ? 'gerou' : 'consumiu') + ' caixa próprio no período; o maior peso fixo é o jurídico do plano (' +
        fmtPct(rj.pct) + ' do custo fixo realizado = ' + money(rj.rjTotal) + '). Estimativa gerencial, não plano homologado.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: KPIs (geração acumulada, custo da RJ, estrutura pura, runway)
  // ─────────────────────────────────────────────────────────────────────────
  function renderKpis(op, rj) {
    var host = document.getElementById('rjKpis');
    if (!host) return;
    var accCls = op.accum >= 0 ? 'number-green' : 'number-red';
    var cards = [
      {
        lbl: 'Caixa Operacional Gerado',
        val: (op.accum >= 0 ? '+' : '') + money(op.accum),
        cls: accCls,
        sub: 'acumulado · exclui Mov. Financeiras (antecip./empréstimos)'
      },
      {
        lbl: 'Custo da Recuperação Judicial',
        val: money(rj.rjTotal),
        cls: 'number-red',
        sub: fmtPct(rj.pct) + ' de todo o custo fixo realizado'
      },
      {
        lbl: 'Estrutura Operacional Pura',
        val: money(rj.opTotal),
        cls: 'number-gold',
        sub: fmtPct(100 - rj.pct) + ' do custo fixo · operação enxuta'
      },
      {
        lbl: 'Runway',
        val: 'indisponível',
        cls: 'rj-kpi-blocked',
        sub: 'requer saldo de caixa (a expor pelo importador)'
      }
    ];
    host.innerHTML = cards.map(function (c) {
      return '<div class="rj-kpi' + (c.cls === 'rj-kpi-blocked' ? ' rj-kpi--blocked' : '') + '">' +
        '<div class="lbl">' + esc(c.lbl) + '</div>' +
        '<div class="val ' + esc(c.cls) + '">' + esc(c.val) + '</div>' +
        '<div class="sub">' + esc(c.sub) + '</div></div>';
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: bloco "Custo da Recuperação Judicial" (A2) com auditoria
  // ─────────────────────────────────────────────────────────────────────────
  function renderRjCost(rj) {
    var host = document.getElementById('rjCostBlock');
    if (!host) return;
    if (!rj.rubrics.length || rj.fixedTotal <= 0) { host.innerHTML = ''; return; }

    // Barra comparativa Custo da RJ × Estrutura operacional pura.
    var rjPct = rj.pct;
    var opPct = 100 - rj.pct;
    var bar =
      '<div class="rj-split-bar" role="img" aria-label="Custo da RJ ' + esc(fmtPct(rjPct)) + ' e estrutura operacional pura ' + esc(fmtPct(opPct)) + ' do custo fixo realizado">' +
      '<span class="rj-split-rj" style="width:' + rjPct.toFixed(1) + '%"><span class="rj-split-cap">RJ ' + esc(fmtPct(rjPct)) + '</span></span>' +
      '<span class="rj-split-op" style="width:' + opPct.toFixed(1) + '%"><span class="rj-split-cap">Operação ' + esc(fmtPct(opPct)) + '</span></span>' +
      '</div>';

    var rows = rj.rubrics.map(function (r) {
      var pctOfRj = rj.rjTotal > 0 ? (r.value / rj.rjTotal * 100) : 0;
      return '<tr class="rj-cost-row">' +
        '<td class="rj-cost-name">' + esc(r.name) + '<span class="rj-cost-role">' + esc(r.role) + '</span></td>' +
        '<td class="num rj-cost-val number-red">' + esc(money(r.value)) + '</td>' +
        '<td class="num rj-cost-pct">' + esc(fmtPct(pctOfRj)) + '</td>' +
        '</tr>';
    }).join('');
    var foot =
      '<tr class="rj-cost-total"><td class="rj-cost-name">Total classificado como RJ</td>' +
      '<td class="num rj-cost-val number-red">' + esc(money(rj.rjTotal)) + '</td>' +
      '<td class="num rj-cost-pct">' + esc(fmtPct(rj.pct)) + ' do CF</td></tr>' +
      '<tr class="rj-cost-op"><td class="rj-cost-name">Estrutura operacional pura (resto)</td>' +
      '<td class="num rj-cost-val number-gold">' + esc(money(rj.opTotal)) + '</td>' +
      '<td class="num rj-cost-pct">' + esc(fmtPct(100 - rj.pct)) + ' do CF</td></tr>' +
      '<tr class="rj-cost-grand"><td class="rj-cost-name">Custo fixo realizado total</td>' +
      '<td class="num rj-cost-val">' + esc(money(rj.fixedTotal)) + '</td>' +
      '<td class="num rj-cost-pct">100%</td></tr>';

    host.innerHTML =
      '<div class="rj-card-head"><div class="rj-card-title">CUSTO DA RECUPERAÇÃO JUDICIAL</div>' +
      '<div class="rj-card-sub">A operação é enxuta — o peso do custo fixo é o jurídico do plano.</div></div>' +
      bar +
      '<div class="rj-cost-table-wrap"><table class="rj-cost-table"><thead><tr>' +
      '<th class="rj-cost-th-name">Rubrica classificada como RJ</th>' +
      '<th class="num">Realizado</th>' +
      '<th class="num">% do custo da RJ</th>' +
      '</tr></thead><tbody>' + rows + foot + '</tbody></table></div>' +
      '<div class="rj-audit-note"><strong>Auditabilidade:</strong> as ' + rj.rubrics.length +
      ' rubricas acima foram classificadas como custo do processo de RJ (somadas pelo realizado de custos_fixos.items). ' +
      'Classificação conservadora: ' + esc(RJ_EXCLUDED_NOTE) + '</div>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: mini-gráfico de geração de caixa operacional mensal (A1)
  // ─────────────────────────────────────────────────────────────────────────
  function renderOpChart(op) {
    var host = document.getElementById('rjOpChart');
    if (!host) return;
    if (!op.series.length) { host.innerHTML = ''; return; }

    var W = 720, H = 240, padL = 56, padR = 20, padT = 22, padB = 38;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = op.series.length;
    var vals = op.series.map(function (s) { return s.opGen; });
    var maxV = Math.max.apply(null, vals.concat([0]));
    var minV = Math.min.apply(null, vals.concat([0]));
    var range = (maxV - minV) || 1;
    function y(v) { return padT + plotH - ((v - minV) / range) * plotH; }
    var zeroY = y(0);
    var bw = plotW / n * 0.6;
    function bx(i) { return padL + (i + 0.5) * (plotW / n) - bw / 2; }

    var grid = '<line class="rj-chart-zero" x1="' + padL + '" y1="' + zeroY + '" x2="' + (W - padR) + '" y2="' + zeroY + '"/>';
    var bars = op.series.map(function (s, i) {
      var top = s.opGen >= 0 ? y(s.opGen) : zeroY;
      var h = Math.abs(zeroY - y(s.opGen));
      var cls = s.opGen >= 0 ? 'rj-bar-pos' : 'rj-bar-neg';
      if (s.partial) cls += ' rj-bar-partial';
      var title = (MONTH_FULL[s.m] || ('Mês ' + s.m)) + (s.partial ? ' (parcial)' : '') +
        ' · gerou ' + (s.opGen >= 0 ? '+' : '') + money(s.opGen) +
        ' (resultado ' + (s.resultado >= 0 ? '+' : '') + moneyShort(s.resultado) +
        (s.mov ? ' + Mov.Fin. ' + moneyShort(s.mov) : '') + ')';
      return '<g><rect class="rj-bar ' + cls + '" x="' + bx(i).toFixed(1) + '" y="' + Math.min(top, zeroY).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, h).toFixed(1) + '" rx="3"><title>' + esc(title) + '</title></rect></g>';
    }).join('');
    var labels = op.series.map(function (s, i) {
      var cx = padL + (i + 0.5) * (plotW / n);
      var lbl = (MONTH_ABBR[s.m - 1] || ('M' + s.m)) + (s.partial ? '*' : '');
      return '<text class="rj-chart-xlabel" x="' + cx.toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle">' + esc(lbl) + '</text>';
    }).join('');
    // Rótulos de eixo (min/0/max).
    var axis = '';
    [minV, 0, maxV].forEach(function (t) {
      var yy = y(t);
      axis += '<text class="rj-chart-axis" x="' + (padL - 8) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end">' + esc(moneyShort(t)) + '</text>';
    });
    var svg = '<svg class="rj-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Geração de caixa operacional mensal, excluindo antecipações e empréstimos">' +
      grid + axis + bars + labels + '</svg>';

    var partialNote = op.hasPartial ? ' <span class="rj-chart-partial-key">* mês parcial (em andamento)</span>' : '';
    host.innerHTML =
      '<div class="rj-card-head"><div class="rj-card-title">GERAÇÃO DE CAIXA OPERACIONAL · MENSAL</div>' +
      '<div class="rj-card-sub">Resultado de caixa por mês <strong>excluindo</strong> Mov. Financeiras (antecip./empréstimos) — o caixa “limpo” da operação.' + partialNote + '</div></div>' +
      svg;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: card Runway (BLOQUEADO por dado novo) — placeholder honesto
  // ─────────────────────────────────────────────────────────────────────────
  function renderRunway(op) {
    var host = document.getElementById('rjRunway');
    if (!host) return;
    // Cálculo PRONTO pra ligar quando o saldo chegar: runway = saldoFinal / burn médio.
    // burn médio (gerencial) = média dos meses com geração operacional negativa.
    var burns = op.series.filter(function (s) { return s.opGen < 0; }).map(function (s) { return -s.opGen; });
    var burnAvg = burns.length ? burns.reduce(function (a, b) { return a + b; }, 0) / burns.length : 0;
    var burnTxt = burnAvg > 0 ? money(burnAvg) + '/mês (média dos meses negativos)' : 'sem meses de queima no período realizado';

    host.innerHTML =
      '<div class="rj-card-head"><div class="rj-card-title">RUNWAY</div>' +
      '<div class="rj-card-sub rj-blocked-tag">BLOQUEADO · requer dado novo</div></div>' +
      '<div class="rj-runway-body">' +
      '<div class="rj-runway-msg">Runway = <strong>saldo de caixa ÷ burn médio</strong>. O saldo de caixa ' +
      '(abertura/fechamento) <strong>não está no JSON</strong> — o importador ainda não o expõe. ' +
      'Não estimamos saldo para não inventar número.</div>' +
      '<div class="rj-runway-todo">A expor pelo importador: <code>fluxo_caixa.saldoInicial</code> / <code>fluxo_caixa.saldoFinal</code> por mês ' +
      '(existe na fonte Bling, <code>diagnostics.linhas_saldo=2</code>).</div>' +
      '<div class="rj-runway-ready">Cálculo pronto pra ligar — burn de referência: <strong>' + esc(burnTxt) + '</strong>.</div>' +
      '</div>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: selo de reconciliação (governança)
  // ─────────────────────────────────────────────────────────────────────────
  function renderRecon(recon) {
    var host = document.getElementById('rjRecon');
    if (!host) return;
    var ok = recon.divergences === 0 && recon.months > 0;
    host.innerHTML =
      '<div class="rj-recon-seal' + (ok ? ' rj-recon-ok' : ' rj-recon-warn') + '" role="status">' +
      '<span class="rj-recon-icon" aria-hidden="true">' + (ok ? '✓' : '!') + '</span>' +
      '<span class="rj-recon-text"><strong>Fonte reconciliada · ' + recon.divergences + ' divergência' + (recon.divergences === 1 ? '' : 's') + '</strong>' +
      '<span class="rj-recon-sub">O caixa diário concilia com o mensal em ' + recon.months + ' meses (Bling vs controle).</span></span>' +
      '</div>' +
      '<div class="rj-recon-pending">Pendência de governança: <strong>' + recon.semClassifCount + ' lançamentos “Sem classificação”</strong> (' +
      esc(money(recon.semClassif)) + ') ainda a categorizar pela consultoria.</div>';
  }

  function renderRjPage() {
    var fixed = fixedData();
    var fc = cashData();
    var foot = document.getElementById('rjFoot');
    if (!fixed || !Array.isArray(fixed.items) || !fc || !fc.monthly) {
      ['rjBanner', 'rjStatusSeal', 'rjKpis', 'rjCostBlock', 'rjOpChart', 'rjRunway', 'rjRecon'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.innerHTML = '';
      });
      var wrap = document.getElementById('rjCostBlock');
      if (wrap) wrap.innerHTML = '<div class="rj-empty">Dados de Recuperação Judicial indisponíveis para este período.</div>';
      return;
    }
    var rj = computeRjCost();
    var op = computeOpCash();
    var recon = computeRecon();

    renderBanner(op);
    renderSeal(op, rj);
    renderKpis(op, rj);
    renderRjCost(rj);
    renderOpChart(op);
    renderRunway(op);
    renderRecon(recon);

    if (foot) {
      foot.innerHTML =
        'Camada de Recuperação Judicial — todos os valores são <strong>derivados em runtime</strong> dos dados já publicados ' +
        '(custos fixos da consultoria + fluxo de caixa Bling), sem número inventado. As estimativas são <strong>gerenciais</strong>, ' +
        'não constituem plano de recuperação homologado. Caixa em regime de competência fica na DRE; aqui é caixa Bling.';
    }
  }
  window.renderRjPage = renderRjPage;

  function maybeRenderRj(page) {
    if (page === 'rj') {
      try { renderRjPage(); } catch (e) { console.error('Erro RJ:', e); }
    }
  }

  // Hook primário: envolve a base ANTES de 50-ux-patches capturá-la (igual ao 45-dre).
  var base = window.__baseSetDashboardPage;
  if (typeof base === 'function' && !base.__rjWrapped) {
    var wrapped = function (page) {
      var out = base.apply(this, arguments);
      maybeRenderRj(page);
      return out;
    };
    wrapped.__rjWrapped = true;
    // preserva flags de outros decorators (ex.: __dreWrapped) que já tenham passado.
    if (base.__dreWrapped) wrapped.__dreWrapped = true;
    window.__baseSetDashboardPage = wrapped;
  }

  // Backup idempotente: evento de troca de página.
  if (window.MarconiEvents && window.MarconiEvents.on) {
    window.MarconiEvents.on('page:changed', function (e) {
      maybeRenderRj(e && e.detail && e.detail.to);
    });
  }

  // Render inicial se a página já abrir na RJ.
  if (window.onDashboardReady) {
    window.onDashboardReady(function () {
      if (document.body && document.body.dataset.page === 'rj') renderRjPage();
    });
  }
})();

/* ===== src/js/50-ux-patches.js ===== */

/* ===== patch-v60-smooth-ux-js ===== */
/* PATCH v60 — controlador único de navegação.
   Evita múltiplos wrappers brigando entre si e remove smooth-scroll na troca de página. */
(function() {
  'use strict';
  if (window.__v60SmoothUXLoaded) return;
  window.__v60SmoothUXLoaded = true;

  const baseSetPage = window.__baseSetDashboardPage || window.setDashboardPage;
  if (typeof baseSetPage !== 'function') return;

  let isSwitching = false;
  let queuedPage = null;

  function pulseVisibleNumbers() {
    const selectors = [
      '.kpi-value', '.fixed-kpi-value', '.director-value', '.director-metric',
      '.hero-stat-value', '.health-card .metric-value'
    ].join(',');

    document.querySelectorAll(selectors).forEach(function(el) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      el.classList.remove('v60-kpi-pulse');
      void el.offsetWidth;
      el.classList.add('v60-kpi-pulse');
      window.setTimeout(function(){ el.classList.remove('v60-kpi-pulse'); }, 380);
    });
  }

  function settle(page) {
    const body = document.body;

    window.requestAnimationFrame(function() {
      body.classList.remove('page-switching-lite', 'page-changing', 'page-entered');
      body.classList.add('page-settled-lite');

      if (page === 'fixed' && typeof window.renderFixedCosts === 'function') {
        window.setTimeout(function(){ try { window.renderFixedCosts(); } catch(e){} }, 40);
      }
      if (page === 'director' && typeof window.renderDirectorPage === 'function') {
        window.setTimeout(function(){ try { window.renderDirectorPage(); } catch(e){} }, 40);
      }

      window.setTimeout(function() {
        body.classList.remove('page-settled-lite');
        pulseVisibleNumbers();
        isSwitching = false;

        if (queuedPage && queuedPage !== document.body.dataset.page) {
          const next = queuedPage;
          queuedPage = null;
          setDashboardPageSmooth(next);
        } else {
          queuedPage = null;
        }
      }, 260);
    });
  }

  function setDashboardPageSmooth(page) {
    if (!page) return;
    const current = document.body.dataset.page;
    if (isSwitching) {
      queuedPage = page;
      return;
    }
    if (current === page) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      pulseVisibleNumbers();
      return;
    }

    isSwitching = true;
    const body = document.body;

    if ('scrollRestoration' in history) {
      try { history.scrollRestoration = 'manual'; } catch(e) {}
    }

    body.classList.remove('page-changing', 'page-entered', 'page-settled-lite');
    body.classList.add('page-switching-lite');

    /* Topo instantâneo: elimina tremida de smooth-scroll entre layouts com alturas diferentes. */
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    window.requestAnimationFrame(function() {
      try {
        baseSetPage.call(window, page);
      } catch (err) {
        console.error('[PATCH v60] Erro ao trocar página:', err);
      }

      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      settle(page);
    });
  }

  window.setDashboardPage = setDashboardPageSmooth;

  /* Garante que qualquer botão de página use o controlador final, mesmo que scripts antigos tenham listeners próprios. */
  document.addEventListener('click', function(e) {
    const pageBtn = e.target.closest('[data-page-link]');
    if (!pageBtn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setDashboardPageSmooth(pageBtn.dataset.pageLink);
  }, true);

  console.log('[PATCH v60] Smooth UX ativo: navegação centralizada, sem reflow forçado.');
})();

/* ===== patch-v62-layered-transition-js ===== */
/* PATCH v62 — entrada em camadas para troca de páginas.
   Mantém a estabilidade conquistada na v60/v61: sem smooth-scroll, sem mexer em width/margin/left/top. */
(function() {
  'use strict';
  if (window.__v62LayeredTransitionLoaded) return;
  window.__v62LayeredTransitionLoaded = true;

  const layerSelector = [
    '.hero-top',
    '.hero-headline',
    '.hero-brand-panel',
    '.hero-stat',
    '.section-header',
    '.kpi-grid',
    '.executive-summary-grid',
    '.chart-card',
    '.result-card',
    '.mom-panel',
    '.breakdown-grid',
    '.daily-card',
    '.critical-alerts-grid',
    '.methodology-card',
    '.fixed-page-toolbar',
    '.fixed-focus-panel',
    '.fixed-kpi-grid',
    '.fixed-card',
    '.insights-grid',
    '.data-table',
    '.director-cover',
    '.director-kpi-grid',
    '.director-card'
  ].join(',');

  let cleanupTimer = null;
  let applyTimer = null;

  function isVisibleLayer(el) {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;

    // Como a troca de página volta ao topo, animamos apenas o que entra no campo visual imediato.
    return rect.bottom > -20 && rect.top < (window.innerHeight * 1.28);
  }

  function clearLayers() {
    document.body.classList.remove('v62-layered-transition');
    document.querySelectorAll('[data-v62-layer="true"]').forEach(function(el) {
      el.removeAttribute('data-v62-layer');
      el.style.removeProperty('--v62-layer-delay');
      el.style.removeProperty('will-change');
    });
  }

  function applyLayeredTransition() {
    const root = document.querySelector('.dashboard-main');
    if (!root) return;

    window.clearTimeout(cleanupTimer);
    clearLayers();

    const elements = Array.from(root.querySelectorAll(layerSelector))
      .filter(isVisibleLayer)
      .slice(0, 14);

    if (!elements.length) return;

    elements.forEach(function(el, index) {
      // Garante que blocos com .reveal não voltem a opacity:0 depois da animação.
      el.classList.add('in-view');

      el.setAttribute('data-v62-layer', 'true');
      el.style.setProperty('--v62-layer-delay', Math.min(index, 7) * 42 + 'ms');
    });

    // Reinicia a animação de forma controlada.
    void document.body.offsetWidth;
    document.body.classList.add('v62-layered-transition');

    cleanupTimer = window.setTimeout(function() {
      clearLayers();
    }, 980);
  }

  function scheduleLayeredTransition(delay) {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(applyLayeredTransition, delay || 90);
  }

  const previousSetPage = window.setDashboardPage;
  if (typeof previousSetPage === 'function') {
    window.setDashboardPage = function(page) {
      const before = document.body.dataset.page;
      const result = previousSetPage.apply(this, arguments);

      if (page && page !== before) {
        scheduleLayeredTransition(120);
      }

      return result;
    };
  }

  // Entrada inicial, discreta, quando o dashboard abre.
  onDashboardReady(function() {
    scheduleLayeredTransition(420);
  });

  console.log('[PATCH v62] Transição em camadas ativa.');
})();

/* ===== patch-v64-feedback-premium-js ===== */
/* PATCH v64 — Ripple e feedback de clique em controles internos.
   Escopo deliberadamente limitado ao .dashboard-main para não interferir na navegação principal. */
(function() {
  'use strict';

  if (window.__v64FeedbackPremiumLoaded) return;
  window.__v64FeedbackPremiumLoaded = true;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const interactiveSelector = [
    '.dashboard-main button:not(.page-tab)',
    '.dashboard-main .btn',
    '.dashboard-main .filter-btn',
    '.dashboard-main .month-btn',
    '.dashboard-main .view-btn',
    '.dashboard-main .tab-btn',
    '.dashboard-main .segmented-btn',
    '.dashboard-main .chip',
    '.dashboard-main .pill',
    '.dashboard-main [role="button"]:not(.page-tab)'
  ].join(',');

  function shouldIgnore(target) {
    if (!target) return true;
    if (target.closest('.page-switcher') || target.closest('header.top-site-nav')) return true;
    if (target.disabled || target.getAttribute('aria-disabled') === 'true') return true;
    return false;
  }

  function addRipple(target, event) {
    if (reducedMotion || shouldIgnore(target)) return;

    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const ripple = document.createElement('span');
    ripple.className = 'v64-premium-ripple';

    const x = event && typeof event.clientX === 'number'
      ? event.clientX - rect.left
      : rect.width / 2;

    const y = event && typeof event.clientY === 'number'
      ? event.clientY - rect.top
      : rect.height / 2;

    ripple.style.setProperty('--v64-ripple-x', x + 'px');
    ripple.style.setProperty('--v64-ripple-y', y + 'px');

    // Garante que o ripple fique contido no botão sem alterar layout.
    const computed = window.getComputedStyle(target);
    if (computed.position === 'static') {
      target.style.position = 'relative';
    }
    if (computed.overflow === 'visible') {
      target.style.overflow = 'hidden';
    }

    target.appendChild(ripple);
    window.setTimeout(function() {
      ripple.remove();
    }, 560);
  }

  document.addEventListener('pointerdown', function(event) {
    const target = event.target && event.target.closest(interactiveSelector);
    if (!target) return;
    addRipple(target, event);
  }, { passive: true });

  console.log('[PATCH v64] Feedback premium em filtros e botões ativo.');
})();

/* ===== patch-v66-page-context-js ===== */
/* PATCH v66 - Atualiza a linha de contexto conforme pagina e periodo ativo. */
(function() {
  'use strict';
  if (window.__v66PageContextLoaded) return;
  window.__v66PageContextLoaded = true;

  const pageLabels = {
    cash: 'Fluxo de Caixa',
    fixed: 'Custos Fixos',
    director: 'Diretoria',
    dre: 'DRE',
    rj: 'Recuperação Judicial'
  };

  function metaUpdatedDate() {
    try {
      const meta = window.__META__ || window.DASHBOARD_DATA?.meta || {};
      if (!meta.ultima_atualizacao) return '25/05/2026';
      const d = new Date(meta.ultima_atualizacao);
      if (Number.isNaN(d.getTime())) return '25/05/2026';
      return d.toLocaleDateString('pt-BR');
    } catch (e) {
      return '25/05/2026';
    }
  }

  function periodText() {
    try {
      if (typeof window.getActivePeriod === 'function') {
        const p = window.getActivePeriod();
        if (p && (p.short || p.label)) return (p.short || p.label).replace(/\s+/g, ' ').trim();
      }
    } catch (e) {}

    const candidates = [
      document.getElementById('monthSelectLabel')?.textContent,
      document.getElementById('kpiContext')?.textContent,
      document.getElementById('activeFilterSummary')?.textContent
    ].filter(Boolean);

    const found = candidates.find(Boolean) || 'Periodo: 2026';
    return found
      .replace(/periodo\s*:/i, '')
      .replace(/fluxo\s*:/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function ensureLine() {
    let line = document.getElementById('v66PageContext');
    if (line) return line;

    line = document.createElement('div');
    line.id = 'v66PageContext';
    line.className = 'v66-context-line';
    line.setAttribute('aria-hidden', 'true');
    line.innerHTML = [
      '<span class="v66-context-brand">Marconi Foods</span>',
      '<span class="v66-context-dot"></span>',
      '<span class="v66-context-page"></span>',
      '<span class="v66-context-dot"></span>',
      '<span class="v66-context-period"></span>',
      '<span class="v66-context-updated"></span>'
    ].join('');
    document.body.appendChild(line);
    return line;
  }

  function updateLine() {
    const line = ensureLine();
    const page = document.body?.dataset?.page || 'cash';
    line.querySelector('.v66-context-page').textContent = pageLabels[page] || 'Dashboard';
    line.querySelector('.v66-context-period').textContent = periodText() || '2026';
    line.querySelector('.v66-context-updated').textContent = 'Atualizado em ' + metaUpdatedDate();
  }

  function scheduleUpdate(delay) {
    window.clearTimeout(window.__v66ContextTimer);
    window.__v66ContextTimer = window.setTimeout(updateLine, delay || 80);
  }

  function observeBodyPage() {
    if (!document.body || window.__v66ContextObserver) return;
    window.__v66ContextObserver = new MutationObserver(function(mutations) {
      if (mutations.some(function(m) { return m.type === 'attributes' && m.attributeName === 'data-page'; })) {
        scheduleUpdate(120);
      }
    });
    try {
      window.__v66ContextObserver.observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
    } catch (e) {}
  }

  const previousSetPage = window.setDashboardPage;
  if (typeof previousSetPage === 'function') {
    window.setDashboardPage = function(page) {
      const result = previousSetPage.apply(this, arguments);
      scheduleUpdate(180);
      scheduleUpdate(520);
      return result;
    };
  }

  const previousApplyFilter = window.applyFilter;
  if (typeof previousApplyFilter === 'function') {
    window.applyFilter = function() {
      const result = previousApplyFilter.apply(this, arguments);
      scheduleUpdate(220);
      return result;
    };
  }

  document.addEventListener('click', function(event) {
    if (event.target.closest('[data-page-link], .filter-btn, .month-btn, .flow-pill, .period-row, .month-row, [data-month]')) {
      scheduleUpdate(260);
    }
  }, true);

  window.addEventListener('click', function(event) {
    if (event.target.closest('[data-page-link]')) {
      scheduleUpdate(520);
      window.setTimeout(updateLine, 980);
    }
  }, true);

  onDashboardReady(function() {
    observeBodyPage();
    scheduleUpdate(220);
  });
})();

/* ===== patch-v67-kpi-countup-js ===== */
/* PATCH v67 - Count-up blindado.
   Corrige animacoes antigas que podiam formatar valores intermediarios de forma inconsistente. */
(function() {
  'use strict';
  if (window.__v67KpiCountupLoaded) return;
  window.__v67KpiCountupLoaded = true;

  const selector = [
    '.dashboard-main .kpi-card .kpi-value',
    '.dashboard-main .hero-stat .value',
    '.dashboard-main .hero-stat-value'
  ].join(',');

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function expectedFromDataset(el) {
    if (!el || !el.dataset || typeof el.dataset.countTo === 'undefined') return null;
    const raw = Number(el.dataset.countTo);
    if (!Number.isFinite(raw)) return null;
    const prefix = el.dataset.prefix || '';
    const divisor = Number(el.dataset.divisor || 1) || 1;
    const suffix = el.dataset.suffix || '';
    const decimals = Number(el.dataset.decimals || 0) || 0;
    return prefix + (raw / divisor).toFixed(decimals) + suffix;
  }

  function parseValue(text) {
    const final = String(text || '').trim();
    if (!final) return null;
    const hasMoney = /R\$/i.test(final);
    const hasPct = /%/.test(final);
    const hasM = /M\b/i.test(final);
    const hasK = /K\b/i.test(final);
    const plus = /^\s*\+/.test(final);
    const negative = /(^|\s)-\s*R\$|R\$\s*-|^\s*-/.test(final);
    const multiplier = hasM ? 1000000 : (hasK ? 1000 : 1);
    let raw = final.replace(/R\$|%|M\b|K\b|\+/gi, '').replace(/\u00a0/g, ' ').replace(/[^\d,.-]/g, '');

    if (raw.includes(',') && raw.includes('.')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else if (raw.includes(',')) {
      raw = raw.replace(',', '.');
    } else {
      raw = raw.replace(/\.(?=\d{3}(?:\D|$))/g, '');
    }

    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return null;
    return {
      value: Math.abs(value) * multiplier * (negative ? -1 : 1),
      final,
      hasMoney,
      hasPct,
      hasM,
      hasK,
      plus,
      moneyMinusAfterSymbol: /R\$\s*-/.test(final)
    };
  }

  function numberBR(value, decimals) {
    return Number(value).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatLike(parsed, value) {
    const abs = Math.abs(value);
    const negative = value < 0;
    const plus = parsed.plus && value > 0 ? '+' : '';

    if (parsed.hasPct) return (negative ? '-' : plus) + numberBR(abs, 1) + '%';

    let amount;
    if (parsed.hasM) amount = (abs / 1000000).toFixed(2) + 'M';
    else if (parsed.hasK) amount = (abs / 1000).toFixed(0) + 'K';
    else amount = Math.round(abs).toLocaleString('pt-BR');

    if (parsed.hasMoney) {
      if (negative) return parsed.moneyMinusAfterSymbol ? 'R$ -' + amount : '-R$ ' + amount;
      return plus + 'R$ ' + amount;
    }

    return (negative ? '-' : plus) + amount;
  }

  function visible(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 4 && rect.height > 4 && rect.bottom > 0 && rect.top < window.innerHeight && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function lockExactFinal(el, final) {
    if (!el || !final) return;
    el.textContent = final;
    el.dataset.v67Final = final;
    el.dataset.counterDone = '1';
    el.dataset.v41Busy = '0';
    el.classList.remove('v67-counting');
  }

  function animateOne(el) {
    if (!el || !visible(el)) return;
    const final = expectedFromDataset(el) || (el.dataset.v67Final || el.textContent || '').trim();
    const parsed = parseValue(final);
    if (!parsed) return;

    el.dataset.v67Final = final;
    el.dataset.counterDone = '1';
    el.dataset.v41Busy = '1';

    if (reducedMotion || el.dataset.v67Done === final) {
      lockExactFinal(el, final);
      el.dataset.v67Done = final;
      return;
    }

    const token = String(Date.now()) + Math.random().toString(16).slice(2);
    el.dataset.v67Token = token;
    el.classList.add('v67-counting');

    const start = performance.now();
    const duration = 760;
    const from = 0;
    const to = parsed.value;

    function tick(now) {
      if (el.dataset.v67Token !== token) return;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatLike(parsed, from + (to - from) * eased);
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        lockExactFinal(el, final);
        el.dataset.v67Done = final;
      }
    }

    window.requestAnimationFrame(tick);
  }

  function stabilize(scope) {
    (scope || document).querySelectorAll(selector).forEach(function(el) {
      const final = expectedFromDataset(el) || el.dataset.v67Final;
      if (final) lockExactFinal(el, final);
    });
  }

  function run(scope) {
    const root = scope || document;
    root.querySelectorAll(selector).forEach(animateOne);
    window.setTimeout(function() { stabilize(root); }, 980);
    window.setTimeout(function() { stabilize(root); }, 1320);
  }

  function scheduleRun(delay) {
    window.clearTimeout(window.__v67RunTimer);
    window.__v67RunTimer = window.setTimeout(function() { run(document); }, delay || 180);
  }

  const previousSetPage = window.setDashboardPage;
  if (typeof previousSetPage === 'function') {
    window.setDashboardPage = function(page) {
      const result = previousSetPage.apply(this, arguments);
      scheduleRun(520);
      window.setTimeout(function() { stabilize(document); }, 1500);
      return result;
    };
  }

  const previousApplyFilter = window.applyFilter;
  if (typeof previousApplyFilter === 'function') {
    window.applyFilter = function() {
      const result = previousApplyFilter.apply(this, arguments);
      scheduleRun(240);
      window.setTimeout(function() { stabilize(document); }, 1300);
      return result;
    };
  }

  document.addEventListener('click', function(event) {
    if (event.target.closest('.filter-btn, .month-btn, .flow-pill, .period-row, .month-row, [data-month], [data-page-link]')) {
      scheduleRun(420);
      window.setTimeout(function() { stabilize(document); }, 1350);
    }
  }, true);

  window.addEventListener('click', function(event) {
    if (event.target.closest('[data-page-link]')) {
      scheduleRun(720);
      window.setTimeout(function() { stabilize(document); }, 1650);
    }
  }, true);

  if (document.readyState === 'complete') {
    scheduleRun(620);
  } else {
    window.addEventListener('load', function() { scheduleRun(620); });
  }
})();

/* ===== patch-v69-skeleton-shimmer-js ===== */
/* PATCH v69 - Estado visual breve para filtros e troca de paginas. */
(function() {
  'use strict';
  if (window.__v69SkeletonShimmerLoaded) return;
  window.__v69SkeletonShimmerLoaded = true;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function startPending(duration) {
    if (reducedMotion || !document.body) return;
    window.clearTimeout(window.__v69PendingTimer);
    document.body.classList.add('v69-ui-pending');
    window.__v69PendingTimer = window.setTimeout(function() {
      document.body.classList.remove('v69-ui-pending');
    }, duration || 520);
  }

  const previousSetPage = window.setDashboardPage;
  if (typeof previousSetPage === 'function') {
    window.setDashboardPage = function(page) {
      startPending(620);
      const result = previousSetPage.apply(this, arguments);
      window.setTimeout(function() { document.body.classList.remove('v69-ui-pending'); }, 760);
      return result;
    };
  }

  const previousApplyFilter = window.applyFilter;
  if (typeof previousApplyFilter === 'function') {
    window.applyFilter = function() {
      startPending(460);
      const result = previousApplyFilter.apply(this, arguments);
      window.setTimeout(function() { document.body.classList.remove('v69-ui-pending'); }, 560);
      return result;
    };
  }

  document.addEventListener('click', function(event) {
    const target = event.target.closest('.filter-btn, .month-btn, .flow-pill, .period-row, .month-row, [data-month], .fixed-view-tab, .fixed-focus-close');
    if (!target) return;
    if (target.closest('.page-switcher') || target.closest('header.top-site-nav')) return;
    startPending(380);
  }, true);

  window.addEventListener('click', function(event) {
    if (event.target.closest('[data-page-link]')) {
      startPending(680);
    }
  }, true);

  if (document.readyState === 'complete') {
    window.setTimeout(function() { startPending(420); }, 260);
  } else {
    window.addEventListener('load', function() { window.setTimeout(function() { startPending(420); }, 260); });
  }
})();

/* ===== patch-v70-qa-layout-fixes-js ===== */
/* PATCH v70 - Complemento JS.
   Alguns patches antigos gravam left/margin inline com !important; este ajuste regrava apenas medidas responsivas. */
(function() {
  'use strict';
  if (window.__v70QaLayoutFixesLoaded) return;
  window.__v70QaLayoutFixesLoaded = true;

  if (!window.__v70OriginalSetProperty) {
    window.__v70OriginalSetProperty = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function(prop, value, priority) {
      const name = String(prop || '').toLowerCase();
      const val = String(value || '');
      const isMobile = window.matchMedia('(max-width: 720px)').matches;
      const isTablet = window.matchMedia('(max-width: 1024px)').matches;

      if (isMobile && (val === '326px' || val === '98px')) {
        if (name === 'left') return window.__v70OriginalSetProperty.call(this, prop, '12px', priority);
        if (name === 'margin-left') return window.__v70OriginalSetProperty.call(this, prop, '0', priority);
      }

      if (!isMobile && isTablet && (val === '326px' || val === '98px')) {
        if (name === 'left') return window.__v70OriginalSetProperty.call(this, prop, '20px', priority);
        if (name === 'margin-left') return window.__v70OriginalSetProperty.call(this, prop, '0', priority);
      }

      return window.__v70OriginalSetProperty.call(this, prop, value, priority);
    };
  }

  function setImportant(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function applyLayoutFixes() {
    const topbar = document.querySelector('header.top-site-nav');
    const main = document.querySelector('.dashboard-main');
    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const isTablet = window.matchMedia('(max-width: 1024px)').matches;

    if (isMobile) {
      setImportant(topbar, 'top', '8px');
      setImportant(topbar, 'left', '12px');
      setImportant(topbar, 'right', '12px');
      setImportant(topbar, 'width', 'auto');
      setImportant(topbar, 'height', 'auto');
      setImportant(topbar, 'min-height', '124px');

      setImportant(main, 'margin-left', '0');
      setImportant(main, 'width', '100%');
      setImportant(main, 'max-width', 'none');
      setImportant(main, 'padding', '198px 16px 42px');
      return;
    }

    if (isTablet) {
      setImportant(topbar, 'left', '20px');
      setImportant(topbar, 'right', '20px');
      setImportant(topbar, 'width', 'auto');
      setImportant(main, 'margin-left', '0');
      return;
    }

    setImportant(topbar, 'left', '326px');
    setImportant(topbar, 'right', '32px');
    setImportant(topbar, 'width', 'auto');
  }

  function schedule() {
    window.clearTimeout(window.__v70LayoutTimer);
    window.__v70LayoutTimer = window.setTimeout(applyLayoutFixes, 60);
  }

  onDashboardReady(schedule);

  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('click', function(event) {
    if (event.target.closest('[data-page-link]')) {
      window.setTimeout(applyLayoutFixes, 360);
      window.setTimeout(applyLayoutFixes, 900);
    }
  }, true);
})();

/* ===== patch-v71-topbar-stability-js ===== */
/* PATCH v71 - Trava temporaria da geometria da topbar durante navegacao. */
(function() {
  'use strict';
  if (window.__v71TopbarStabilityLoaded) return;
  window.__v71TopbarStabilityLoaded = true;

  function setImportant(el, prop, value) {
    if (el) el.style.setProperty(prop, value, 'important');
  }

  function applyTopbarGeometry() {
    const topbar = document.querySelector('header.top-site-nav');
    const switcher = topbar && topbar.querySelector('.page-switcher');
    if (!topbar) return;

    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const isTablet = window.matchMedia('(max-width: 1024px)').matches;

    setImportant(topbar, 'transition', 'background-color .22s ease, background .22s ease, border-color .22s ease, box-shadow .22s ease');
    setImportant(topbar, 'animation', 'none');
    setImportant(topbar, 'transform', 'translateZ(0)');
    setImportant(topbar, 'will-change', 'auto');

    if (isMobile) {
      setImportant(topbar, 'left', '12px');
      setImportant(topbar, 'right', '12px');
      setImportant(topbar, 'width', 'auto');
      if (switcher) {
        setImportant(switcher, 'position', 'static');
        setImportant(switcher, 'transform', 'none');
        setImportant(switcher, 'transition', 'none');
      }
      return;
    }

    if (isTablet) {
      setImportant(topbar, 'left', '20px');
      setImportant(topbar, 'right', '20px');
      setImportant(topbar, 'width', 'auto');
      if (switcher) setImportant(switcher, 'transition', 'none');
      return;
    }

    setImportant(topbar, 'left', '326px');
    setImportant(topbar, 'right', '32px');
    setImportant(topbar, 'width', 'auto');
    setImportant(topbar, 'grid-template-columns', 'minmax(220px, .8fr) auto minmax(0, .8fr)');

    if (switcher) {
      setImportant(switcher, 'position', 'absolute');
      setImportant(switcher, 'left', '50%');
      setImportant(switcher, 'top', '50%');
      setImportant(switcher, 'transform', 'translate3d(-50%, -50%, 0)');
      setImportant(switcher, 'transition', 'none');
    }
  }

  function lockTopbar(ms) {
    const end = performance.now() + (ms || 900);
    function tick() {
      applyTopbarGeometry();
      if (performance.now() < end) window.requestAnimationFrame(tick);
    }
    tick();
  }

  function scheduleLock(ms) {
    window.clearTimeout(window.__v71TopbarTimer);
    lockTopbar(ms || 900);
    window.__v71TopbarTimer = window.setTimeout(applyTopbarGeometry, (ms || 900) + 80);
  }

  const previousSetPage = window.setDashboardPage;
  if (typeof previousSetPage === 'function') {
    window.setDashboardPage = function(page) {
      scheduleLock(1200);
      const result = previousSetPage.apply(this, arguments);
      scheduleLock(1200);
      return result;
    };
  }

  document.addEventListener('click', function(event) {
    if (event.target.closest('[data-page-link]')) {
      scheduleLock(1300);
    }
  }, true);

  if (document.body) {
    try {
      new MutationObserver(function(mutations) {
        if (mutations.some(function(m) { return m.type === 'attributes' && m.attributeName === 'data-page'; })) {
          scheduleLock(1100);
        }
      }).observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
    } catch (e) {}
  }

  onDashboardReady(function() {
    scheduleLock(900);
  });

  window.addEventListener('load', function() { scheduleLock(900); });
  window.addEventListener('resize', function() { scheduleLock(520); }, { passive: true });
})();

/* ===== phase3-performance-ux-js ===== */
/* Finalizacao de performance/UX: cache leve, pagina ativa e dedupe de navegacao. */
(function() {
  'use strict';
  if (window.__phase3PerformanceUxLoaded) return;
  window.__phase3PerformanceUxLoaded = true;

  const CACHE_LIMIT = 80;
  const CASH_SECTION_IDS = [
    'home', 'kpis', 'executive', 'monthly',
    'alerts', 'categories', 'table', 'methodology'
  ];

  function normalizedMonthsKey(months) {
    try {
      return normalizeMonths(months).join(',');
    } catch (e) {
      return Array.isArray(months) ? months.slice().sort((a, b) => a - b).join(',') : String(months || '');
    }
  }

  function trimCache(cache, limit) {
    while (cache.size > limit) cache.delete(cache.keys().next().value);
  }

  function memoizeByMonths(fn, label) {
    if (typeof fn !== 'function' || fn.__phase3Memoized) return fn;
    const cache = new Map();
    const wrapped = function(months) {
      const key = normalizedMonthsKey(months);
      if (cache.has(key)) return cache.get(key);
      const value = fn.apply(this, arguments);
      cache.set(key, value);
      trimCache(cache, CACHE_LIMIT);
      return value;
    };
    wrapped.__phase3Memoized = true;
    wrapped.__phase3Cache = cache;
    wrapped.__phase3Label = label;
    return wrapped;
  }

  try {
    aggregate = window.aggregate = memoizeByMonths(window.aggregate || aggregate, 'aggregate');
  } catch (e) {}

  try {
    getCategoryBreakdown = window.getCategoryBreakdown = memoizeByMonths(window.getCategoryBreakdown || getCategoryBreakdown, 'categoryBreakdown');
  } catch (e) {}

  try {
    const monthBreakdown = window.monthCategoryBreakdown || monthCategoryBreakdown;
    if (typeof monthBreakdown === 'function' && !monthBreakdown.__phase3Memoized) {
      const cache = new Map();
      const wrappedMonthBreakdown = function(month) {
        const key = String(month);
        if (cache.has(key)) return cache.get(key);
        const value = monthBreakdown.apply(this, arguments);
        cache.set(key, value);
        trimCache(cache, 24);
        return value;
      };
      wrappedMonthBreakdown.__phase3Memoized = true;
      wrappedMonthBreakdown.__phase3Cache = cache;
      monthCategoryBreakdown = window.monthCategoryBreakdown = wrappedMonthBreakdown;
    }
  } catch (e) {}

  function setInactiveState(elements, active) {
    elements.forEach(function(el) {
      if (!el) return;
      el.toggleAttribute('aria-hidden', !active);
      if ('inert' in el) {
        try { el.inert = !active; } catch (e) {}
      }
    });
  }

  const PAGE_TITLE_LABELS = {
    director: 'Diretoria',
    cash: 'Fluxo de Caixa',
    fixed: 'Custos Fixos',
    dre: 'DRE',
    rj: 'Recuperação Judicial'
  };

  function syncActivePageState() {
    const page = document.body && document.body.dataset.page ? document.body.dataset.page : 'cash';
    if (PAGE_TITLE_LABELS[page]) {
      document.title = `Marconi Foods · ${PAGE_TITLE_LABELS[page]} · 2026`;
    }
    setInactiveState(CASH_SECTION_IDS.map(function(id) { return document.getElementById(id); }), page === 'cash');
    setInactiveState([document.getElementById('directoria')], page === 'director');
    setInactiveState([document.getElementById('fixed-costs')], page === 'fixed');
    const switcher = document.querySelector('.page-switcher');
    if (switcher) switcher.setAttribute('role', 'tablist');
    document.querySelectorAll('[data-page-link]').forEach(function(tab) {
      const active = tab.dataset.pageLink === page;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    document.querySelectorAll('.dashboard-main section[id]').forEach(function(section) {
      section.setAttribute('tabindex', '-1');
    });
    document.documentElement.classList.toggle(
      'is-reduced-motion',
      !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    );
  }

  const previousSetPage = window.setDashboardPage;
  if (typeof previousSetPage === 'function' && !previousSetPage.__phase3Wrapped) {
    let lastPage = null;
    let lastAt = 0;
    const finalSetPage = function(page) {
      const now = performance.now();
      if (page === lastPage && now - lastAt < 140) {
        syncActivePageState();
        return;
      }
      lastPage = page;
      lastAt = now;
      const result = previousSetPage.apply(this, arguments);
      requestAnimationFrame(syncActivePageState);
      window.setTimeout(syncActivePageState, 430);
      return result;
    };
    finalSetPage.__phase3Wrapped = true;
    window.setDashboardPage = finalSetPage;
  }

  const previousApplyFilter = window.applyFilter || (typeof applyFilter === 'function' ? applyFilter : null);
  if (typeof previousApplyFilter === 'function' && !previousApplyFilter.__phase3Wrapped) {
    const finalApplyFilter = function() {
      const result = previousApplyFilter.apply(this, arguments);
      requestAnimationFrame(syncActivePageState);
      return result;
    };
    finalApplyFilter.__phase3Wrapped = true;
    try { applyFilter = window.applyFilter = finalApplyFilter; } catch (e) { window.applyFilter = finalApplyFilter; }
  }

  document.addEventListener('click', function(event) {
    if (event.target.closest('[data-page-link], .filter-btn, .month-btn, .flow-pill, .period-row, .month-row, [data-month], .fixed-view-tab')) {
      window.setTimeout(syncActivePageState, 80);
    }
  }, true);

  onDashboardReady(function() {
    syncActivePageState();
  });
  try {
    new MutationObserver(syncActivePageState).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-page']
    });
  } catch (e) {}
  window.addEventListener('load', syncActivePageState);
  window.addEventListener('resize', syncActivePageState, { passive: true });

  window.__MARCONI_PHASE3_QA = {
    cache: function() {
      return {
        aggregate: aggregate && aggregate.__phase3Cache ? aggregate.__phase3Cache.size : null,
        categories: getCategoryBreakdown && getCategoryBreakdown.__phase3Cache ? getCategoryBreakdown.__phase3Cache.size : null,
        monthlyCategories: monthCategoryBreakdown && monthCategoryBreakdown.__phase3Cache ? monthCategoryBreakdown.__phase3Cache.size : null
      };
    },
    syncActivePageState: syncActivePageState
  };
})();

/* ===== phase5-accessibility-keyboard-js ===== */
/* Final pass: ARIA, keyboard navigation and mobile QA hooks. */
(function() {
  'use strict';
  if (window.__phase5AccessibilityLoaded) return;
  window.__phase5AccessibilityLoaded = true;

  const PAGE_LABELS = {
    director: 'Diretoria',
    cash: 'Fluxo de Caixa',
    fixed: 'Custos Fixos',
    dre: 'DRE',
    rj: 'Recuperação Judicial'
  };
  const PAGE_CONTROLS = {
    director: 'directoria',
    cash: 'kpis',
    fixed: 'fixed-costs',
    dre: 'dre-page',
    rj: 'rj-page'
  };

  function textOf(el, selector) {
    return (el.querySelector(selector)?.textContent || '').trim().replace(/\s+/g, ' ');
  }

  function setButtonType() {
    document.querySelectorAll('button:not([type])').forEach(function(button) {
      button.type = 'button';
    });
  }

  function syncPageTabs() {
    const current = document.body?.dataset.page || 'cash';
    const tabs = [...document.querySelectorAll('[data-page-link]')];
    const switcher = document.querySelector('.page-switcher');
    if (switcher) {
      switcher.setAttribute('role', 'tablist');
      switcher.setAttribute('aria-label', 'Paginas do dashboard');
    }
    tabs.forEach(function(tab) {
      const page = tab.dataset.pageLink;
      const active = page === current;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-label', PAGE_LABELS[page] || tab.textContent.trim());
      tab.setAttribute('aria-controls', PAGE_CONTROLS[page] || '');
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
  }

  function syncFixedTabs() {
    const current = document.body?.dataset.fixedView || 'overview';
    let activeTabId = '';
    document.querySelectorAll('.fixed-view-tab').forEach(function(tab) {
      const active = tab.dataset.fixedView === current;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('aria-controls', 'fixedCostsGrid');
      tab.tabIndex = active ? 0 : -1;
      if (active && tab.id) activeTabId = tab.id;
    });
    const grid = document.getElementById('fixedCostsGrid');
    if (grid && activeTabId) grid.setAttribute('aria-labelledby', activeTabId);
  }

  function labelCards() {
    document.querySelectorAll('.dashboard-main :is(.kpi-card, .director-kpi, .fixed-kpi, .fixed-exec-card)').forEach(function(card) {
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
      if (!card.hasAttribute('role')) card.setAttribute('role', 'group');
      if (!card.hasAttribute('aria-label')) {
        const label = textOf(card, '.lbl, .fixed-exec-label, .kpi-label') || card.textContent.trim().replace(/\s+/g, ' ');
        const value = textOf(card, '.val, .fixed-exec-value, .kpi-value');
        const sub = textOf(card, '.sub, .fixed-exec-text, .kpi-sub');
        card.setAttribute('aria-label', [label, value, sub].filter(Boolean).join('. '));
      }
    });

    document.querySelectorAll('body[data-page="fixed"] :is(.fixed-row, .fixed-dev-item, .fixed-sensitive-card)').forEach(function(row) {
      const name = textOf(row, '.fixed-row-name, .name');
      if (!name || /Sem registros/i.test(name)) return;
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      if (!row.hasAttribute('aria-label')) row.setAttribute('aria-label', 'Abrir detalhe de ' + name);
    });
  }

  function labelScrollableRegions() {
    document.querySelectorAll('.data-table, .fixed-heatmap-wrap, .fixed-table-wrap').forEach(function(region) {
      region.setAttribute('tabindex', '0');
      region.setAttribute('role', 'region');
      if (!region.hasAttribute('aria-label')) {
        region.setAttribute('aria-label', region.classList.contains('data-table') ? 'Tabela financeira com rolagem horizontal' : 'Tabela de custos fixos com rolagem horizontal');
      }
    });
  }

  function applyAccessibility() {
    setButtonType();
    syncPageTabs();
    syncFixedTabs();
    labelCards();
    labelScrollableRegions();
  }

  function scheduleAccessibility() {
    window.clearTimeout(window.__phase5A11yTimer);
    window.__phase5A11yTimer = window.setTimeout(applyAccessibility, 40);
  }

  function rovingTabKeydown(event, selector) {
    const target = event.target instanceof Element ? event.target : null;
    const current = target?.closest(selector);
    if (!current) return false;
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return false;
    const tabs = [...document.querySelectorAll(selector)].filter(function(tab) {
      return tab.offsetParent !== null;
    });
    const index = tabs.indexOf(current);
    if (index < 0) return false;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = Math.max(0, index - 1);
    if (event.key === 'ArrowRight') nextIndex = Math.min(tabs.length - 1, index + 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
    return true;
  }

  document.addEventListener('keydown', function(event) {
    if (rovingTabKeydown(event, '.page-tab')) return;
    if (rovingTabKeydown(event, '.fixed-view-tab')) return;
    const target = event.target instanceof Element ? event.target : null;
    const actionable = target?.closest('body[data-page="fixed"] :is(.fixed-row, .fixed-dev-item, .fixed-sensitive-card)[role="button"]');
    if (!actionable) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    actionable.click();
  });

  document.addEventListener('click', function(event) {
    if (event.target.closest('[data-page-link], .fixed-view-tab, .filter-btn, .month-btn, .flow-pill, .period-row, .month-row')) {
      scheduleAccessibility();
    }
  }, true);

  try {
    new MutationObserver(scheduleAccessibility).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-page', 'data-fixed-view', 'class']
    });
  } catch (e) {}

  onDashboardReady(applyAccessibility);
  window.addEventListener('load', applyAccessibility);
  window.addEventListener('resize', scheduleAccessibility, { passive: true });
})();

/* ===== phase5-fixed-tabs-repair-js ===== */
/* Restores deterministic internal tabs for the fixed-costs page. */
(function() {
  'use strict';
  if (window.__phase5FixedTabsRepairLoaded) return;
  window.__phase5FixedTabsRepairLoaded = true;

  const VALID_VIEWS = new Set(['overview', 'control', 'matrix']);
  const VIEW_HINTS = {
    overview: 'Visao sintetica dos custos fixos no periodo selecionado.',
    control: 'Clique em uma rubrica para abrir evolucao mensal e desvios.',
    matrix: 'Mapa tecnico de desvios por rubrica e mes.'
  };
  const PANEL_TARGETS = [
    ['#fixedCostsKpis', 'kpis', 'kpis', 'self'],
    ['#fixedCostsMonthlyChart', 'overview', 'chart'],
    ['#fixedCostsComposition', 'overview', 'composition'],
    ['#fixedCostsDeviations', 'control', 'deviations'],
    ['#fixedCostsSensitive', 'control', 'sensitive'],
    ['#fixedCostsHeatmap', 'matrix', 'matrix'],
    ['#fixedCostsAnalysis', 'analysis', 'analysis']
  ];

  function normalizeView(view) {
    return VALID_VIEWS.has(view) ? view : 'overview';
  }

  function tagFixedPanels() {
    PANEL_TARGETS.forEach(function(entry) {
      const target = document.querySelector(entry[0]);
      const panel = entry[3] === 'self' ? target : target?.closest('.fixed-card');
      if (!panel) return;
      panel.dataset.fixedPanel = entry[1];
      panel.dataset.fixedSlot = entry[2];
    });
  }

  function syncFixedTabState(view) {
    const current = normalizeView(view || document.body?.dataset.fixedView);
    if (document.body && document.body.dataset.fixedView !== current) document.body.dataset.fixedView = current;
    tagFixedPanels();
    let activeTabId = '';
    document.querySelectorAll('.fixed-view-tab[data-fixed-view]').forEach(function(tab) {
      const active = tab.dataset.fixedView === current;
      tab.classList.toggle('active', active);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('aria-controls', 'fixedCostsGrid');
      tab.tabIndex = active ? 0 : -1;
      if (active && tab.id) activeTabId = tab.id;
    });
    const grid = document.getElementById('fixedCostsGrid');
    if (grid && activeTabId) grid.setAttribute('aria-labelledby', activeTabId);
    const hint = document.getElementById('fixedPageHint');
    if (hint && hint.textContent !== VIEW_HINTS[current]) hint.textContent = VIEW_HINTS[current];
  }

  const previousSetFixedCostView = window.setFixedCostView;
  window.setFixedCostView = function(view) {
    if (typeof previousSetFixedCostView === 'function') {
      try { previousSetFixedCostView.call(this, normalizeView(view)); } catch (e) {}
    }
    syncFixedTabState(view);
  };

  document.addEventListener('click', function(event) {
    const tab = event.target.closest('.fixed-view-tab[data-fixed-view]');
    if (!tab) return;
    event.preventDefault();
    event.stopPropagation();
    syncFixedTabState(tab.dataset.fixedView);
  }, true);

  try {
    new MutationObserver(function(mutations) {
      const shouldSync = mutations.some(function(mutation) {
        return mutation.attributeName === 'data-fixed-view' || mutation.attributeName === 'data-page';
      });
      if (shouldSync) syncFixedTabState(document.body?.dataset.fixedView);
    }).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-page', 'data-fixed-view']
    });
  } catch (e) {}

  onDashboardReady(function() { syncFixedTabState(); });
  window.addEventListener('load', function() { syncFixedTabState(); });
})();

/* ===== phase5-controlled-ux-js ===== */
/* Keeps dropdowns, overlays and presentation mode predictable during user exploration. */
(function() {
  'use strict';
  if (window.__phase5ControlledUxLoaded) return;
  window.__phase5ControlledUxLoaded = true;

  function periodSelect() {
    return document.getElementById('monthSelect');
  }

  function periodButton() {
    return document.getElementById('monthSelectBtn');
  }

  function closePeriodDropdown() {
    const select = periodSelect();
    const button = periodButton();
    if (!select || !select.classList.contains('open')) return false;
    select.classList.remove('open');
    if (button) button.setAttribute('aria-expanded', 'false');
    return true;
  }

  function closeFixedFocusPanel() {
    const panel = document.getElementById('fixedFocusPanel');
    if (!panel || !panel.classList.contains('show')) return false;
    panel.classList.remove('show');
    panel.innerHTML = '';
    return true;
  }

  function syncPresentationA11y() {
    const active = document.body?.classList.contains('presentation-mode');
    const sidebar = document.querySelector('.control-sidebar');
    const exitButton = document.getElementById('presentationExit');
    if (sidebar) {
      sidebar.setAttribute('aria-hidden', active ? 'true' : 'false');
      if ('inert' in sidebar) sidebar.inert = !!active;
    }
    if (exitButton) {
      exitButton.setAttribute('aria-hidden', active ? 'false' : 'true');
      exitButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  document.addEventListener('pointerdown', function(event) {
    const select = periodSelect();
    if (!select || !select.classList.contains('open')) return;
    if (select.contains(event.target)) return;
    closePeriodDropdown();
  }, true);

  document.addEventListener('keydown', function(event) {
    if (event.key !== 'Escape') return;
    if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    const handled = closePeriodDropdown() || closeFixedFocusPanel();
    if (handled) event.preventDefault();
  }, true);

  document.addEventListener('click', function(event) {
    if (!event.target.closest('#filterReset')) return;
    window.setTimeout(function() {
      if (typeof window.showToastV41 === 'function') window.showToastV41('Filtros resetados');
    }, 140);
  }, true);

  try {
    new MutationObserver(syncPresentationA11y).observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  } catch (e) {}

  onDashboardReady(syncPresentationA11y);
  window.addEventListener('load', syncPresentationA11y);
})();

/* ===== phase5-fixed-kpi-replay-js ===== */
/* Replays fixed-cost KPIs when the page becomes visible, avoiding hidden pre-render lock. */
(function() {
  'use strict';
  if (window.__phase5FixedKpiReplayLoaded) return;
  window.__phase5FixedKpiReplayLoaded = true;

  function replaySoon(delay) {
    window.clearTimeout(window.__phase5FixedReplayTimer);
    window.__phase5FixedReplayTimer = window.setTimeout(function() {
      if (document.body?.dataset.page !== 'fixed') return;
      if (typeof window.replayFixedKpiAnimation !== 'function') return;
      window.__phase5FixedReplayAt = Date.now();
      window.replayFixedKpiAnimation();
    }, delay || 110);
  }

  document.addEventListener('click', function(event) {
    if (event.target.closest('[data-page-link="fixed"]')) replaySoon(340);
  }, true);

  const previousSetPage = window.setDashboardPage;
  if (typeof previousSetPage === 'function' && !previousSetPage.__phase5FixedReplayWrapped) {
    const wrappedSetPage = function(page) {
      const result = previousSetPage.apply(this, arguments);
      if (page === 'fixed') replaySoon(520);
      return result;
    };
    wrappedSetPage.__phase5FixedReplayWrapped = true;
    window.setDashboardPage = wrappedSetPage;
  }

  try {
    new MutationObserver(function(mutations) {
      if (mutations.some(function(mutation) { return mutation.attributeName === 'data-page'; }) && document.body?.dataset.page === 'fixed') {
        replaySoon(90);
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
  } catch (e) {}

  if (document.body?.dataset.page === 'fixed') replaySoon(160);
})();

/* ===== backlog-events-performance-js ===== */
/* Adds stable CustomEvent hooks and performance marks for QA and future modules. */
(function() {
  'use strict';
  if (window.__backlogEventsPerformanceLoaded) return;
  window.__backlogEventsPerformanceLoaded = true;

  function emit(name, detail) {
    if (window.MarconiEvents) window.MarconiEvents.emit(name, detail);
  }

  function currentPage() {
    return document.body?.dataset.page || 'cash';
  }

  function currentFixedView() {
    return document.body?.dataset.fixedView || 'overview';
  }

  const previousSetPage = window.setDashboardPage;
  if (typeof previousSetPage === 'function' && !previousSetPage.__backlogEventsWrapped) {
    const wrappedSetPage = function(page) {
      const from = currentPage();
      const requested = page || from;
      window.MarconiPerf?.start('page-change');
      emit('page:before-change', { from, to: requested });
      const result = previousSetPage.apply(this, arguments);
      requestAnimationFrame(function() {
        const to = currentPage();
        emit('page:changed', { from, to, requested });
        window.MarconiPerf?.end('page-change', { from, to, requested });
      });
      return result;
    };
    wrappedSetPage.__backlogEventsWrapped = true;
    window.setDashboardPage = wrappedSetPage;
  }

  const previousSetFixedCostView = window.setFixedCostView;
  if (typeof previousSetFixedCostView === 'function' && !previousSetFixedCostView.__backlogEventsWrapped) {
    const wrappedSetFixedCostView = function(view) {
      const from = currentFixedView();
      const result = previousSetFixedCostView.apply(this, arguments);
      requestAnimationFrame(function() {
        emit('fixed-view:changed', { from, to: currentFixedView(), requested: view });
      });
      return result;
    };
    wrappedSetFixedCostView.__backlogEventsWrapped = true;
    window.setFixedCostView = wrappedSetFixedCostView;
  }

  const previousApplyFilter = window.applyFilter || (typeof applyFilter === 'function' ? applyFilter : null);
  if (typeof previousApplyFilter === 'function' && !previousApplyFilter.__backlogEventsWrapped) {
    const wrappedApplyFilter = function() {
      const result = previousApplyFilter.apply(this, arguments);
      requestAnimationFrame(function() {
        emit('filter:rendered', { page: currentPage() });
      });
      return result;
    };
    wrappedApplyFilter.__backlogEventsWrapped = true;
    try { applyFilter = window.applyFilter = wrappedApplyFilter; } catch (e) { window.applyFilter = wrappedApplyFilter; }
  }

  onDashboardReady(function() {
    emit('app:ready', { page: currentPage(), fixedView: currentFixedView() });
    window.MarconiPerf?.mark('app-ready');
  });
})();

/* ===== src/js/55-theme-toggle.js ===== */

/* Tema dual: escuro (padrao) + claro. Persiste no localStorage. */
(function () {
  var KEY = 'marconi-theme';
  var root = document.documentElement;
  function label(isLight){ return isLight ? 'Tema claro' : 'Tema escuro'; }
  function apply(theme) {
    var isLight = theme === 'light';
    if (isLight) root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    var btn = document.getElementById('themeToggle');
    if (btn) { btn.setAttribute('aria-pressed', String(isLight)); btn.textContent = label(isLight); }
  }
  function current(){ try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } }
  function toggle() {
    var next = current() === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply(next);
    if (window.MarconiEvents && window.MarconiEvents.emit) window.MarconiEvents.emit('theme:changed', { theme: next });
  }
  window.MarconiTheme = { apply: apply, toggle: toggle, current: current };
  function init(){ apply(current()); var b = document.getElementById('themeToggle'); if (b) b.addEventListener('click', toggle); }
  if (window.onDashboardReady) window.onDashboardReady(init); else document.addEventListener('DOMContentLoaded', init);
})();

/* ===== src/js/60-cinema.js ===== */

/* ============================================================
   60-cinema.js — Modo Cinema executivo (v4 · chart-forward)
   Deck de apresentação para diretoria / painel de sala (loop ambiente).
   - SOMENTE meses REALIZADOS (sem projeção) — trava em Jan–Jun.
   - Deck movido a GRÁFICOS VIVOS (linha que desenha, cascata, pulso diário,
     rosca multi-segmento, heatmap, sparkline). Pouco texto/número solto.
   - Slide-do-momento: contador de volta rotaciona categoria/mês a cada ciclo,
     cada um com seu micro-gráfico animado.
   Lê helpers globais: aggregate, getCategoryBreakdown, getCategoryByName,
   monthCategoryBreakdown, getMonthCriticalReading, MarconiFormat
   (window.__DATA__.daily/categoryMonthly/monthly, window.__META__).
   ============================================================ */
(function () {
  'use strict';

  var MF = window.MarconiFormat || {};
  function money(v) { return MF.moneyShort ? MF.moneyShort(v) : ('R$ ' + Math.round(v)); }
  function moneyFull(v) { return MF.moneyFull ? MF.moneyFull(v) : ('R$ ' + Math.round(v)); }
  function pct(v) { return MF.pct ? MF.pct(v) : (v.toFixed(1) + '%'); }
  function esc(s) { return MF.escapeHtml ? MF.escapeHtml(String(s)) : String(s); }

  var MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var MONTHS_LONG = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  // paleta de segmentos (tokens theme-aware) p/ rosca multi e heatmap
  var SEG = ['var(--gold)', 'var(--indigo)', 'var(--cyan)', 'var(--green)', 'var(--gold-l)'];

  var AUTOPLAY_MS = 10000;

  var state = { idx: 0, cycle: 0, playing: false, timer: null, raf: [], timebarRaf: null, built: false };

  var REDUCE = false;
  try { REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

  function token(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  // =========================================================
  //  COLETA DE DADOS — SOMENTE REALIZADO (sem projeção)
  // =========================================================
  function realizedMonths() {
    var all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    try {
      var dm = window.__DATA__ && window.__DATA__.monthly;
      if (dm) {
        var r = all.filter(function (m) { return dm[m] && !dm[m].projection; });
        if (r.length) return r;
      }
    } catch (e) {}
    return [1, 2, 3, 4, 5, 6];
  }

  function lastUpdateStamp() {
    try {
      var raw = window.__META__ && window.__META__.ultima_atualizacao;
      if (raw) {
        var dt = new Date(raw);
        if (!isNaN(dt.getTime())) return dt.toLocaleDateString('pt-BR');
      }
    } catch (e) {}
    return '';
  }

  function gather() {
    var months = realizedMonths();
    var agg = (typeof aggregate === 'function') ? aggregate(months) : { entradas: 0, saidas: 0, resultado: 0, margem: 0 };
    var cats = (typeof getCategoryBreakdown === 'function') ? getCategoryBreakdown(months) : [];
    var series = months.map(function (m) {
      var a = (typeof aggregate === 'function') ? aggregate([m]) : { entradas: 0, saidas: 0, resultado: 0 };
      return { m: m, entradas: a.entradas, saidas: a.saidas, resultado: a.resultado };
    });
    var best = series.slice().sort(function (a, b) { return b.resultado - a.resultado; })[0] || { m: months[0], resultado: 0 };
    var worst = series.slice().sort(function (a, b) { return a.resultado - b.resultado; })[0] || { m: months[0], resultado: 0 };
    var deficits = series.filter(function (s) { return s.resultado < 0; });
    var first = months[0], last = months[months.length - 1];
    var label = 'Realizado · ' + MONTHS[first] + '–' + MONTHS[last] + ' 2026';
    return { months: months, agg: agg, cats: cats, series: series, best: best, worst: worst, deficits: deficits, label: label, stamp: lastUpdateStamp() };
  }

  // =========================================================
  //  GRÁFICOS (SVG/HTML; animados; só dados reais realizados)
  // =========================================================
  function svgPath(pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  }

  // Linha de tendência do RESULTADO — o traço que desenha + pontos que pipocam.
  function chartLine(d) {
    var s = d.series;
    if (!s.length) return '';
    var w = 820, h = 300, padL = 18, padR = 18, padB = 40, padT = 22;
    var vals = s.map(function (x) { return x.resultado; });
    var max = Math.max.apply(null, vals.concat([1]));
    var min = Math.min.apply(null, vals.concat([0]));
    var range = (max - min) || 1;
    var stepX = (w - padL - padR) / Math.max(1, s.length - 1);
    var pts = s.map(function (x, i) {
      return [padL + i * stepX, padT + (1 - (x.resultado - min) / range) * (h - padT - padB)];
    });
    var dPath = svgPath(pts);
    var zeroY = padT + (1 - (0 - min) / range) * (h - padT - padB);
    var svg = '<svg class="cine-svg cine-line" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<line x1="' + padL + '" y1="' + zeroY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + zeroY.toFixed(1) + '" class="cine-zero"/>';
    var area = 'M' + pts[0][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' ' + dPath.replace(/^M/, 'L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' Z';
    svg += '<path class="cine-line-area" d="' + area + '"/>';
    svg += '<path class="cine-line-path" d="' + dPath + '"/>';
    pts.forEach(function (p, i) {
      svg += '<circle class="cine-line-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5" style="--dot-delay:' + (0.7 + i * 0.07) + 's"/>';
      svg += '<text class="cine-axis-lbl" x="' + p[0].toFixed(1) + '" y="' + (h - 14) + '" text-anchor="middle">' + MONTHS[s[i].m] + '</text>';
      svg += '<text class="cine-axis-val" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 14).toFixed(1) + '" text-anchor="middle" style="--dot-delay:' + (1.1 + i * 0.07) + 's">' + (s[i].resultado >= 0 ? '+' : '') + money(s[i].resultado) + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  // Entradas × Saídas — duas linhas desenhando, com a área do gap (resultado) sombreada.
  function chartDualLine(d) {
    var s = d.series;
    if (!s.length) return '';
    var w = 820, h = 300, padL = 18, padR = 18, padB = 40, padT = 22;
    var maxV = Math.max.apply(null, s.map(function (x) { return Math.max(x.entradas, x.saidas); }).concat([1]));
    var stepX = (w - padL - padR) / Math.max(1, s.length - 1);
    function pt(val, i) { return [padL + i * stepX, padT + (1 - val / maxV) * (h - padT - padB)]; }
    var inPts = s.map(function (x, i) { return pt(x.entradas, i); });
    var outPts = s.map(function (x, i) { return pt(x.saidas, i); });
    var gap = 'M' + inPts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') +
      ' L' + outPts.slice().reverse().map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z';
    var svg = '<svg class="cine-svg cine-duo" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<path class="cine-duo-gap" d="' + gap + '"/>';
    svg += '<path class="cine-duo-in cine-draw" pathLength="1" d="' + svgPath(inPts) + '"/>';
    svg += '<path class="cine-duo-out cine-draw" pathLength="1" d="' + svgPath(outPts) + '"/>';
    inPts.forEach(function (p, i) { svg += '<circle class="cine-duo-dot in" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5" style="--dot-delay:' + (0.8 + i * 0.06) + 's"/>'; });
    outPts.forEach(function (p, i) { svg += '<circle class="cine-duo-dot out" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5" style="--dot-delay:' + (1.0 + i * 0.06) + 's"/>'; });
    s.forEach(function (x, i) { svg += '<text class="cine-axis-lbl" x="' + (padL + i * stepX).toFixed(1) + '" y="' + (h - 14) + '" text-anchor="middle">' + MONTHS[x.m] + '</text>'; });
    svg += '</svg>';
    return svg;
  }

  // Cascata (waterfall) — como o resultado de cada mês construiu o caixa acumulado.
  function chartWaterfall(d) {
    var s = d.series;
    if (!s.length) return '';
    var w = 820, h = 320, padL = 18, padR = 18, padB = 42, padT = 26;
    var cum = 0, steps = s.map(function (x) { var from = cum; cum += x.resultado; return { m: x.m, from: from, to: cum, val: x.resultado }; });
    var allVals = [0]; steps.forEach(function (st) { allVals.push(st.from, st.to); });
    var maxV = Math.max.apply(null, allVals), minV = Math.min.apply(null, allVals);
    var range = (maxV - minV) || 1;
    var plotH = h - padT - padB;
    function yFor(v) { return padT + (1 - (v - minV) / range) * plotH; }
    var slot = (w - padL - padR) / s.length;
    var bw = slot * 0.5;
    var zeroY = yFor(0);
    var bars = '', conns = '', labels = '';
    steps.forEach(function (st, i) {
      var cx = padL + slot * i + slot / 2;
      var y0 = yFor(st.from), y1 = yFor(st.to);
      var top = Math.min(y0, y1), hgt = Math.max(2, Math.abs(y1 - y0));
      bars += '<rect class="cine-wf-bar ' + (st.val >= 0 ? 'pos' : 'neg') + '" x="' + (cx - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="4" style="--bar-delay:' + (0.15 + i * 0.13) + 's"/>';
      if (i < steps.length - 1) {
        var nx = padL + slot * (i + 1) + slot / 2;
        conns += '<line class="cine-wf-conn" x1="' + (cx + bw / 2).toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + (nx - bw / 2).toFixed(1) + '" y2="' + y1.toFixed(1) + '" style="--conn-delay:' + (0.4 + i * 0.13) + 's"/>';
      }
      labels += '<text class="cine-axis-lbl" x="' + cx.toFixed(1) + '" y="' + (h - 14) + '" text-anchor="middle">' + MONTHS[st.m] + '</text>';
      labels += '<text class="cine-wf-val ' + (st.val >= 0 ? 'pos' : 'neg') + '" x="' + cx.toFixed(1) + '" y="' + (Math.min(y0, y1) - 9).toFixed(1) + '" text-anchor="middle" style="--bar-delay:' + (0.5 + i * 0.13) + 's">' + (st.val >= 0 ? '+' : '−') + money(Math.abs(st.val)) + '</text>';
    });
    var svg = '<svg class="cine-svg cine-wf" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<line class="cine-zero" x1="' + padL + '" y1="' + zeroY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + zeroY.toFixed(1) + '"/>';
    svg += conns + bars + labels;
    svg += '</svg>';
    return svg;
  }

  // Pulso diário — fluxo líquido (entradas−saídas) dia a dia no realizado. Linha densa "batimento".
  function chartDailyPulse(d) {
    var daily = [];
    try { daily = (window.__DATA__ && window.__DATA__.daily) || []; } catch (e) {}
    var rows = daily.filter(function (x) { return d.months.indexOf(x.month) !== -1 && !x.projection; });
    if (rows.length < 2) return '';
    var w = 860, h = 280, padL = 8, padR = 8, padB = 26, padT = 16;
    var nets = rows.map(function (x) { return (x.entradas || 0) - (x.saidas || 0); });
    var maxV = Math.max.apply(null, nets.concat([1])), minV = Math.min.apply(null, nets.concat([0]));
    var range = (maxV - minV) || 1;
    var stepX = (w - padL - padR) / (rows.length - 1);
    var plotH = h - padT - padB;
    function y(v) { return padT + (1 - (v - minV) / range) * plotH; }
    var pts = nets.map(function (v, i) { return [padL + i * stepX, y(v)]; });
    var line = svgPath(pts);
    var zeroY = y(0);
    var area = 'M' + pts[0][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' ' + line.replace(/^M/, 'L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' Z';
    // marcadores de início de mês
    var seps = '';
    var seen = {};
    rows.forEach(function (x, i) {
      if (!seen[x.month]) { seen[x.month] = true; var px = padL + i * stepX; seps += '<text class="cine-axis-lbl" x="' + px.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' + MONTHS[x.month] + '</text>'; }
    });
    var svg = '<svg class="cine-svg cine-pulse" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<line class="cine-zero" x1="' + padL + '" y1="' + zeroY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + zeroY.toFixed(1) + '"/>';
    svg += '<path class="cine-pulse-area" d="' + area + '"/>';
    svg += '<path class="cine-pulse-line cine-draw" pathLength="1" d="' + line + '"/>';
    svg += seps;
    svg += '</svg>';
    return svg;
  }

  // Rosca multi-segmento — top categorias como arcos coloridos varrendo no anel.
  function chartDonutMulti(d) {
    var cats = d.cats.slice(0, 5);
    if (!cats.length) return '';
    var totalAll = d.cats.reduce(function (s, c) { return s + c.value; }, 0) || 1;
    var r = 84, c = 2 * Math.PI * r, cx = 120, cy = 120;
    var gap = 0.014 * c;
    var offset = 0, segs = '';
    cats.forEach(function (cat, i) {
      var frac = cat.value / totalAll;
      var len = Math.max(0, frac * c - gap);
      segs += '<circle class="cine-mdonut-seg" cx="' + cx + '" cy="' + cy + '" r="' + r + '" transform="rotate(' + (-90 + offset / c * 360).toFixed(2) + ' ' + cx + ' ' + cy + ')" style="--seg-len:' + len.toFixed(1) + ';--seg-circ:' + c.toFixed(1) + ';--seg-delay:' + (0.2 + i * 0.14) + 's;stroke:' + SEG[i % SEG.length] + '"/>';
      offset += frac * c;
    });
    var top = cats[0];
    var svg = '<svg class="cine-svg cine-mdonut" viewBox="0 0 240 240" aria-hidden="true">';
    svg += '<circle class="cine-mdonut-track" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
    svg += segs;
    svg += '<text class="cine-mdonut-pct" x="120" y="115" text-anchor="middle">' + pct(top.pct) + '</text>';
    svg += '<text class="cine-mdonut-sub" x="120" y="139" text-anchor="middle">maior rubrica</text>';
    svg += '</svg>';
    return svg;
  }

  function donutLegend(d) {
    var cats = d.cats.slice(0, 5);
    return '<div class="cine-mdonut-legend">' + cats.map(function (c, i) {
      return '<div class="cine-mdleg-row"><span class="cine-mdleg-dot" style="background:' + SEG[i % SEG.length] + '"></span>' +
        '<span class="cine-mdleg-name">' + esc(c.name) + '</span>' +
        '<span class="cine-mdleg-pct">' + pct(c.pct) + '</span></div>';
    }).join('') + '</div>';
  }

  // Mapa de calor — mês × categoria, células acendendo em onda diagonal.
  function chartHeatmap(d) {
    var cm = [];
    try { cm = (window.__DATA__ && window.__DATA__.categoryMonthly) || []; } catch (e) {}
    if (!cm.length) return '';
    var months = d.months;
    function val(c, m) { return Number((c.months && (c.months[m] != null ? c.months[m] : c.months[String(m)])) || 0); }
    var ranked = cm.map(function (c) {
      return { name: c.name, months: c.months, total: months.reduce(function (s, m) { return s + val(c, m); }, 0) };
    }).filter(function (c) { return c.total > 0.01; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 6);
    if (!ranked.length) return '';
    var maxCell = 1;
    ranked.forEach(function (c) { months.forEach(function (m) { var v = val(c, m); if (v > maxCell) maxCell = v; }); });
    var header = '<div class="cine-hm-corner"></div>' + months.map(function (m) { return '<div class="cine-hm-mhead">' + MONTHS[m] + '</div>'; }).join('');
    var rows = ranked.map(function (c, ri) {
      var cells = months.map(function (m, ci) {
        var v = val(c, m);
        return '<div class="cine-hm-cell" style="--hm:' + (v / maxCell).toFixed(3) + ';--hm-delay:' + ((ri + ci) * 0.05).toFixed(2) + 's" title="' + esc(c.name) + ' · ' + MONTHS[m] + ': ' + money(v) + '"></div>';
      }).join('');
      return '<div class="cine-hm-rowname">' + esc(c.name) + '</div>' + cells;
    }).join('');
    return '<div class="cine-hm" style="grid-template-columns: minmax(120px,200px) repeat(' + months.length + ', 1fr)">' + header + rows + '</div>';
  }

  // Barras horizontais das top categorias — anima largura
  function chartHbars(d) {
    var top = d.cats.slice(0, 5);
    if (!top.length) return '';
    var max = Math.max.apply(null, top.map(function (c) { return c.value; }).concat([1]));
    var rows = top.map(function (c, i) {
      var wpct = (c.value / max) * 100;
      return '<div class="cine-hbar-row" style="--row-delay:' + (i * 0.1) + 's">' +
        '<div class="cine-hbar-name">' + esc(c.name) + '</div>' +
        '<div class="cine-hbar-track"><div class="cine-hbar-fill" style="--fill:' + wpct.toFixed(1) + '%"></div></div>' +
        '<div class="cine-hbar-val">' + money(c.value) + '</div>' +
        '<div class="cine-hbar-pct">' + pct(c.pct) + '</div>' +
      '</div>';
    }).join('');
    return '<div class="cine-hbars">' + rows + '</div>';
  }

  // Sparkline de uma categoria (evolução Jan–Jun) — linha desenhando, p/ o slide-do-momento.
  function chartSparkline(catName) {
    var cat = (typeof getCategoryByName === 'function') ? getCategoryByName(catName) : null;
    if (!cat || !cat.months) return '';
    var months = (data && data.months) || [1, 2, 3, 4, 5, 6];
    var vals = months.map(function (m) { return Number((cat.months[m] != null ? cat.months[m] : cat.months[String(m)]) || 0); });
    if (!vals.some(function (v) { return v > 0; })) return '';
    var w = 560, h = 160, padL = 12, padR = 12, padB = 26, padT = 14;
    var maxV = Math.max.apply(null, vals.concat([1]));
    var stepX = (w - padL - padR) / Math.max(1, vals.length - 1);
    var pts = vals.map(function (v, i) { return [padL + i * stepX, padT + (1 - v / maxV) * (h - padT - padB)]; });
    var line = svgPath(pts);
    var area = 'M' + pts[0][0].toFixed(1) + ' ' + (h - padB) + ' ' + line.replace(/^M/, 'L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (h - padB) + ' Z';
    var svg = '<svg class="cine-svg cine-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<path class="cine-spark-area" d="' + area + '"/>';
    svg += '<path class="cine-spark-line cine-draw" pathLength="1" d="' + line + '"/>';
    pts.forEach(function (p, i) {
      svg += '<circle class="cine-spark-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" style="--dot-delay:' + (0.6 + i * 0.07) + 's"/>';
      svg += '<text class="cine-axis-lbl" x="' + p[0].toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' + MONTHS[months[i]] + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  // Mini-barras das rubricas de um mês — p/ o slide-do-momento (mês).
  function monthMiniBars(m) {
    var cats = (typeof monthCategoryBreakdown === 'function') ? monthCategoryBreakdown(m) : [];
    cats = cats.slice(0, 4);
    if (!cats.length) return '';
    var max = Math.max.apply(null, cats.map(function (c) { return c.value; }).concat([1]));
    return '<div class="cine-mini-hbars">' + cats.map(function (c, i) {
      var wpct = (c.value / max) * 100;
      return '<div class="cine-mini-row" style="--row-delay:' + (0.2 + i * 0.1) + 's">' +
        '<div class="cine-mini-name">' + esc(c.name) + '</div>' +
        '<div class="cine-mini-track"><div class="cine-mini-fill" style="--fill:' + wpct.toFixed(1) + '%"></div></div>' +
        '<div class="cine-mini-val">' + money(c.value) + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  // ---- slide-do-momento: conteúdo varia conforme a volta (state.cycle) ----
  function momentCategoryHtml(cycle) {
    var arr = (data && data.cats) || [];
    if (!arr.length) return '<div class="cine-eyebrow">Categoria em foco</div><h2 class="cine-h2">Sem dados.</h2>';
    var n = arr.length, i = ((cycle % n) + n) % n, c = arr[i];
    return '<div class="cine-eyebrow">Categoria em foco · ' + (i + 1) + ' de ' + n + '</div>' +
      '<div class="cine-moment-head">' +
        '<div class="cine-moment-name">' + esc(c.name) + '</div>' +
        '<div class="cine-moment-figs"><span class="cine-moment-val" data-cine-count="' + c.value + '" data-signed="0" data-pct="0">R$ 0</span><span class="cine-moment-pct">' + pct(c.pct) + ' das saídas</span></div>' +
      '</div>' +
      chartSparkline(c.name);
  }

  function momentMonthHtml(cycle) {
    var arr = (data && data.series) || [];
    if (!arr.length) return '<div class="cine-eyebrow">Mês em foco</div><h2 class="cine-h2">Sem dados.</h2>';
    var n = arr.length, i = ((cycle % n) + n) % n, s = arr[i], m = s.m, pos = s.resultado >= 0;
    return '<div class="cine-eyebrow">Mês em foco · ' + (i + 1) + ' de ' + n + '</div>' +
      '<div class="cine-moment-head">' +
        '<div class="cine-moment-name">' + MONTHS_LONG[m] + '</div>' +
        '<div class="cine-moment-figs"><span class="cine-moment-val" data-cine-count="' + s.resultado + '" data-signed="1" data-pct="0" style="color:' + (pos ? 'var(--green)' : 'var(--red)') + '">R$ 0</span><span class="cine-moment-pct">resultado do mês</span></div>' +
      '</div>' +
      '<div class="cine-moment-sub">Principais saídas do mês</div>' +
      monthMiniBars(m);
  }

  // =========================================================
  //  SLIDES (chart-forward — texto só nos marcos)
  // =========================================================
  function buildSlides(d) {
    var resPositive = d.agg.resultado >= 0;
    var top = d.cats[0] || { name: '—', value: 0, pct: 0 };
    var concentrado = top.pct >= 50;
    var n = d.months.length;
    var slides = [];

    // 01) CAPA
    slides.push({ kind: 'cover', html:
      '<div class="cine-eyebrow">Relatório executivo · ' + esc(d.label) + '</div>' +
      '<h1 class="cine-h1">Marconi Foods</h1>' +
      '<div class="cine-lede">Leitura visual do fluxo de caixa realizado — ' +
        (resPositive ? 'operação superavitária no semestre.' : 'consumo de caixa no semestre.') + '</div>' +
      '<div class="cine-cover-meta">' +
        '<span class="cine-chip">' + n + ' meses realizados</span>' +
        '<span class="cine-chip">resultado ' + (resPositive ? '+' : '−') + money(Math.abs(d.agg.resultado)) + '</span>' +
        (d.stamp ? '<span class="cine-chip">atualizado em ' + esc(d.stamp) + '</span>' : '') +
      '</div>'
    });

    // 02) ENTRADAS × SAÍDAS (duas linhas + gap)
    slides.push({ kind: 'duo', html:
      '<div class="cine-eyebrow">Entradas × Saídas</div>' +
      '<h2 class="cine-h2">O que entra e o que sai, mês a mês.</h2>' +
      chartDualLine(d) +
      '<div class="cine-chartkey"><span class="cine-key in">Entradas</span><span class="cine-key out">Saídas</span><span class="cine-key gap">Resultado (gap)</span></div>'
    });

    // 03) TENDÊNCIA DO RESULTADO (a linha)
    slides.push({ kind: 'trend', html:
      '<div class="cine-eyebrow">Tendência mensal</div>' +
      '<h2 class="cine-h2">Como o resultado evoluiu mês a mês.</h2>' +
      chartLine(d)
    });

    // 04) CASCATA — acúmulo do caixa
    slides.push({ kind: 'waterfall', html:
      '<div class="cine-eyebrow">Construção do caixa</div>' +
      '<h2 class="cine-h2">Como cada mês somou ao caixa.</h2>' +
      chartWaterfall(d) +
      '<div class="cine-lede">Acúmulo do semestre: <strong>' + (resPositive ? '+' : '−') + moneyFull(Math.abs(d.agg.resultado)) + '</strong>.</div>'
    });

    // 05) PULSO DIÁRIO
    slides.push({ kind: 'pulse', html:
      '<div class="cine-eyebrow">Pulso diário</div>' +
      '<h2 class="cine-h2">O batimento do caixa, dia a dia.</h2>' +
      chartDailyPulse(d) +
      '<div class="cine-lede">Fluxo líquido diário (entradas − saídas) no semestre realizado.</div>'
    });

    // 06) CONCENTRAÇÃO — rosca multi-segmento + legenda
    slides.push({ kind: 'concentration', html:
      '<div class="cine-eyebrow">Concentração das saídas</div>' +
      '<h2 class="cine-h2">Para onde o caixa está indo.</h2>' +
      '<div class="cine-split">' +
        '<div class="cine-split-chart">' + chartDonutMulti(d) + '</div>' +
        '<div class="cine-split-text">' + donutLegend(d) +
          '<div class="cine-lede">' + (concentrado
            ? '<strong>' + esc(top.name) + '</strong> sozinha responde por ' + pct(top.pct) + ' das saídas — concentração alta.'
            : 'Distribuição equilibrada entre as principais rubricas.') + '</div>' +
        '</div>' +
      '</div>'
    });

    // 07) MAPA DE CALOR — mês × categoria
    slides.push({ kind: 'heatmap', html:
      '<div class="cine-eyebrow">Mapa de calor</div>' +
      '<h2 class="cine-h2">Onde o caixa saiu, mês a mês.</h2>' +
      chartHeatmap(d) +
      '<div class="cine-chartkey"><span class="cine-key faint">menos</span><span class="cine-key heat">mais saída</span></div>'
    });

    // 08) COMPOSIÇÃO (top 5)
    slides.push({ kind: 'composition', html:
      '<div class="cine-eyebrow">Composição das saídas</div>' +
      '<h2 class="cine-h2">As 5 principais rubricas.</h2>' +
      chartHbars(d)
    });

    // 09) ⭐ CATEGORIA-DO-MOMENTO (rotativo + sparkline)
    slides.push({ kind: 'moment', dyn: 'category', html: momentCategoryHtml(0) });

    // 10) ⭐ MÊS-DO-MOMENTO (rotativo + mini-barras)
    slides.push({ kind: 'moment', dyn: 'month', html: momentMonthHtml(0) });

    // 11) SÍNTESE & RECOMENDAÇÃO
    var recs = [];
    if (concentrado) recs.push('Renegociar prazo/condições da rubrica dominante (' + top.name + ').');
    if (d.deficits.length) recs.push('Endereçar os ' + d.deficits.length + ' mês(es) deficitário(s), priorizando ' + MONTHS_LONG[d.worst.m] + '.');
    recs.push(resPositive ? 'Preservar a geração de caixa: margem atual de ' + pct(d.agg.margem) + '.' : 'Reverter o consumo de caixa com plano de saídas.');
    recs.push('Acompanhar o realizado mês a mês e revisar as metas do 2º semestre.');
    slides.push({ kind: 'synthesis', html:
      '<div class="cine-eyebrow">Síntese executiva</div>' +
      '<h2 class="cine-h2">' + (resPositive ? 'Operação saudável, com um ponto de atenção.' : 'Operação sob pressão de caixa.') + '</h2>' +
      '<div class="cine-synth">' +
        '<div class="cine-verdict cine-verdict--' + (resPositive ? (concentrado ? 'watch' : 'good') : 'risk') + '">' +
          (resPositive ? (concentrado ? 'ATENÇÃO' : 'ESTÁVEL') : 'CRÍTICO') +
        '</div>' +
        '<ol class="cine-recs">' + recs.slice(0, 4).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' +
      '</div>'
    });

    // 12) COMO LER (legenda das cores) + carimbo
    slides.push({ kind: 'legend', html:
      '<div class="cine-eyebrow">Como ler este painel</div>' +
      '<h2 class="cine-h2">Legenda.</h2>' +
      '<div class="cine-legend">' +
        legendRow('var(--green)', 'Entradas / resultado positivo', 'Dinheiro que entrou no caixa.') +
        legendRow('var(--red)', 'Saídas / resultado negativo', 'Desembolsos e consumo de caixa.') +
        legendRow('var(--gold)', 'Destaque / concentração', 'Maior rubrica, gap e marcações.') +
      '</div>' +
      '<div class="cine-legend-meta">Recorte: <strong>' + esc(d.label) + '</strong>' + (d.stamp ? ' · atualizado em <strong>' + esc(d.stamp) + '</strong>' : '') + '</div>'
    });

    return slides;
  }

  function legendRow(color, title, desc) {
    return '<div class="cine-legend-row">' +
      '<span class="cine-legend-swatch" style="background:' + color + '"></span>' +
      '<div class="cine-legend-text"><div class="cine-legend-title">' + title + '</div><div class="cine-legend-desc">' + desc + '</div></div>' +
    '</div>';
  }

  // =========================================================
  //  COUNT-UP (números que ainda existem — capa/momento usam textos diretos)
  // =========================================================
  function runCountUp(root) {
    root.querySelectorAll('[data-cine-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-cine-count')) || 0;
      var signed = el.getAttribute('data-signed') === '1';
      var isPct = el.getAttribute('data-pct') === '1';
      var dur = 1100, start = null;
      function fmt(v) {
        if (isPct) return (signed && v >= 0 ? '+' : '') + pct(v);
        var s = money(Math.abs(v));
        return (signed ? (v >= 0 ? '+' : '-') : '') + s;
      }
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / dur, 1);
        var ease = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(target * ease);
        if (t < 1) state.raf.push(requestAnimationFrame(step));
      }
      state.raf.push(requestAnimationFrame(step));
    });
  }

  // =========================================================
  //  OVERLAY / NAVEGAÇÃO
  // =========================================================
  var data = null, slides = [];

  function ensureOverlay() {
    var o = document.getElementById('cineOverlay');
    if (o) return o;
    o = document.createElement('div');
    o.id = 'cineOverlay';
    o.className = 'cine-overlay';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-label', 'Modo apresentação executiva');
    o.innerHTML =
      '<div class="cine-aurora" aria-hidden="true"><span class="ca-blob ca-1"></span><span class="ca-blob ca-2"></span><span class="ca-blob ca-3"></span><span class="ca-blob ca-4"></span></div>' +
      '<div class="cine-stage" id="cineStage"></div>' +
      '<div class="cine-progress" id="cineProgress"></div>' +
      '<div class="cine-controls">' +
        '<button class="cine-btn cine-prev" id="cinePrev" type="button" aria-label="Slide anterior">‹</button>' +
        '<button class="cine-btn cine-play" id="cinePlay" type="button" aria-label="Reproduzir automaticamente">▶</button>' +
        '<button class="cine-btn cine-next" id="cineNext" type="button" aria-label="Próximo slide">›</button>' +
      '</div>' +
      '<button class="cine-close" id="cineClose" type="button" aria-label="Fechar (Esc)">✕ Fechar</button>' +
      '<div class="cine-counter" id="cineCounter"></div>' +
      '<div class="cine-timebar" id="cineTimebar"><div class="cine-timebar-fill" id="cineTimebarFill"></div></div>';
    document.body.appendChild(o);
    o.querySelector('#cineClose').addEventListener('click', close);
    o.querySelector('#cinePrev').addEventListener('click', function () { go(-1, true); });
    o.querySelector('#cineNext').addEventListener('click', function () { go(1, true); });
    o.querySelector('#cinePlay').addEventListener('click', togglePlay);
    return o;
  }

  function open() {
    data = gather();
    slides = buildSlides(data);
    var o = ensureOverlay();
    var stage = o.querySelector('#cineStage');
    stage.innerHTML = slides.map(function (s, i) {
      return '<section class="cine-slide cine-slide--' + s.kind + '" data-i="' + i + '"' + (s.dyn ? ' data-dyn="' + s.dyn + '"' : '') + '>' +
        '<div class="cine-slide-inner">' + s.html + '</div></section>';
    }).join('');
    var prog = o.querySelector('#cineProgress');
    prog.innerHTML = slides.map(function (s, i) { return '<button class="cine-dot" data-i="' + i + '" aria-label="Ir ao slide ' + (i + 1) + '"></button>'; }).join('');
    prog.querySelectorAll('.cine-dot').forEach(function (dot) {
      dot.addEventListener('click', function () { state.idx = parseInt(dot.dataset.i, 10); render(true); });
    });
    state.idx = 0;
    state.cycle = 0;
    document.body.classList.add('cine-active');
    o.classList.add('show');
    render(false);
    startPlay();
  }

  function close() {
    stopPlay();
    cancelRaf();
    var o = document.getElementById('cineOverlay');
    if (o) o.classList.remove('show');
    document.body.classList.remove('cine-active');
  }

  function cancelRaf() {
    state.raf.forEach(function (id) { cancelAnimationFrame(id); });
    state.raf = [];
  }

  function render(userAction) {
    var o = document.getElementById('cineOverlay');
    if (!o) return;
    cancelRaf();
    var secs = o.querySelectorAll('.cine-slide');
    secs.forEach(function (s, i) { s.classList.toggle('active', i === state.idx); });
    o.querySelectorAll('.cine-dot').forEach(function (dot, i) { dot.classList.toggle('on', i === state.idx); });
    var counter = o.querySelector('#cineCounter');
    if (counter) counter.textContent = (state.idx + 1) + ' / ' + slides.length + (state.cycle > 0 ? '  ·  volta ' + (state.cycle + 1) : '');
    var active = secs[state.idx];
    if (active) {
      // Reconstrói o conteúdo do slide a cada exibição → DOM NOVA → as animações CSS
      // (entrada + gráficos) disparam do zero de forma CONFIÁVEL. O antigo truque
      // remove/reflow/add('anim') falhava às vezes (animação "fantasma": declarada
      // mas sem timeline), deixando o slide preso em opacity:0 = vazio.
      var inner = active.querySelector('.cine-slide-inner');
      if (inner) {
        var dyn = active.getAttribute('data-dyn');
        inner.innerHTML = dyn
          ? ((dyn === 'category') ? momentCategoryHtml(state.cycle) : momentMonthHtml(state.cycle))
          : slides[state.idx].html;
      }
      // Entrada do CONTEÚDO via Web Animations API — confiável (a animação CSS de
      // entrada às vezes ficava "pendente" sem timeline e travava em opacity:0 = vazio).
      if (inner && !REDUCE) {
        var kids = inner.children;
        for (var ci = 0; ci < kids.length; ci++) {
          try {
            kids[ci].animate(
              [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }],
              { duration: 560, delay: Math.min(ci, 4) * 80, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
            );
          } catch (e) {}
        }
      }
      // Linhas e rosca que "desenham" (stroke-dashoffset): a animação CSS desse tipo
      // NÃO iniciava de forma confiável (ficava pendente → traço invisível). Faço via
      // WAAPI, e o repouso já é "desenhado" (se algo falhar, nunca fica vazio).
      active.querySelectorAll('.cine-line-path, .cine-draw, .cine-mdonut-seg').forEach(function (el) {
        var fromOff = parseFloat(getComputedStyle(el).strokeDasharray) || 0;
        el.style.strokeDashoffset = '0';
        if (REDUCE || !fromOff) return;
        try {
          el.animate(
            [{ strokeDashoffset: fromOff + 'px' }, { strokeDashoffset: '0px' }],
            { duration: 1300, delay: 160, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' }
          );
        } catch (e) {}
      });
      runCountUp(active);
      // Demais animações de gráfico (opacidade: barras, células, pontos) via CSS.
      active.classList.add('anim');
    }
    if (userAction) restartPlayIfOn();
  }

  function go(dir, userAction) {
    var prev = state.idx;
    state.idx = (state.idx + dir + slides.length) % slides.length;
    if (dir > 0 && state.idx === 0 && prev !== 0) state.cycle++;
    else if (dir < 0 && prev === 0 && state.idx !== 0) state.cycle = Math.max(0, state.cycle - 1);
    render(userAction);
  }

  // ---- autoplay ----
  function startPlay() { state.playing = true; updatePlayBtn(); schedule(); }
  function stopPlay() {
    state.playing = false;
    updatePlayBtn();
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    stopTimebar();
  }
  function togglePlay() { state.playing ? stopPlay() : startPlay(); }
  function restartPlayIfOn() { if (state.playing) { schedule(); } }
  function schedule() {
    if (state.timer) clearTimeout(state.timer);
    if (!state.playing) { stopTimebar(); return; }
    runTimebar();
    state.timer = setTimeout(function () {
      if (!state.playing) return;
      go(1, false);
      schedule();
    }, AUTOPLAY_MS);
  }

  // ---- mini barra de progresso temporal ----
  function runTimebar() {
    var fill = document.getElementById('cineTimebarFill');
    var bar = document.getElementById('cineTimebar');
    if (!fill || !bar) return;
    if (state.timebarRaf) cancelAnimationFrame(state.timebarRaf);
    bar.classList.add('on');
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / AUTOPLAY_MS, 1);
      fill.style.width = (t * 100).toFixed(2) + '%';
      if (t < 1 && state.playing) state.timebarRaf = requestAnimationFrame(step);
    }
    fill.style.width = '0%';
    state.timebarRaf = requestAnimationFrame(step);
  }
  function stopTimebar() {
    if (state.timebarRaf) { cancelAnimationFrame(state.timebarRaf); state.timebarRaf = null; }
    var fill = document.getElementById('cineTimebarFill');
    var bar = document.getElementById('cineTimebar');
    if (fill) fill.style.width = '0%';
    if (bar) bar.classList.remove('on');
  }
  function updatePlayBtn() {
    var b = document.getElementById('cinePlay');
    if (!b) return;
    b.textContent = state.playing ? '❚❚' : '▶';
    b.setAttribute('aria-label', state.playing ? 'Pausar apresentação automática' : 'Reproduzir automaticamente');
    b.classList.toggle('playing', state.playing);
    var o = document.getElementById('cineOverlay');
    if (o) o.classList.toggle('cine-autoplaying', state.playing);
  }

  // ---- teclado (modal: roda na CAPTURA e bloqueia os atalhos do dashboard) ----
  // CAUSA do "slide vazio ao navegar de seta": o dashboard tem um keydown global em
  // que ArrowRight/Left chamam setDashboardPage() — trocavam a página ATRÁS do cinema
  // e re-renderizavam, atropelando o slide. Autoplay/dot-click não disparam keydown,
  // por isso funcionavam. Captura + stopImmediatePropagation isola o cinema.
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('cine-active')) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1, true); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1, true); }
    else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  }, true);

  // ---- botão na sidebar ----
  function wireButton() {
    var actions = document.querySelector('.sidebar-actions');
    if (!actions || document.getElementById('cineOpenBtn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'cineOpenBtn';
    btn.className = 'sidebar-action gold';
    btn.textContent = 'Modo cinema';
    actions.appendChild(btn);
    btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
  }

  // re-render no toggle de tema (cores via token mudam; re-render garante gráficos coerentes)
  if (window.MarconiEvents && window.MarconiEvents.on) {
    window.MarconiEvents.on('theme:changed', function () {
      if (document.body.classList.contains('cine-active')) render(false);
    });
  }

  function boot() {
    wireButton();
    setTimeout(wireButton, 400);
    setTimeout(wireButton, 1200);
  }
  if (window.onDashboardReady) window.onDashboardReady(boot); else document.addEventListener('DOMContentLoaded', boot);

  window.MarconiCinema = { open: open, close: close };
})();
