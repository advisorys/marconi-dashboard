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

  function renderFixedExecutiveSummary(period, totals, flowAgg, fixedBase, pctSaidas, projectionOnly) {
    const el = ensureFixedExecutiveSummary();
    if (!el) return;
    const months = (period.months || []).slice().sort((a,b)=>a-b);
    const group = rowsByGroup(months, projectionOnly ? 'est' : 'basis')[0];
    const diff = projectionOnly ? 0 : totals.diff;
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

    const kpis = [
      {label: projectionOnly ? 'Custo fixo projetado' : 'Custo fixo do período', value: fixedBase, sub: projectionOnly ? 'Base estimada para os meses projetados' : 'Realizado onde disponível + estimado futuro', color:'#F59E0B'},
      {label:'Orçado no período', value: totals.est, sub:`${months.length} mês(es) selecionado(s)`, color:'#94A0B8'},
      {label: projectionOnly ? 'Realizado disponível' : 'Desvio realizado', value: projectionOnly ? totals.real : totals.diff, sub: projectionOnly ? 'Sem fechamento real para projeção' : `${totals.diff >= 0 ? 'Acima' : 'Abaixo'} do orçamento realizado`, color: projectionOnly ? '#94A0B8' : (totals.diff >= 0 ? '#EF4444' : '#10B981'), signed: !projectionOnly},
      {label:'Peso nas saídas', value:pctSaidas, sub:`${fixedPct(pctEntradas)} das entradas do período`, color:'#06B6D4', pct:true}
    ];
    kpis[0].tone = 'base';
    kpis[1].tone = 'neutral';
    kpis[2].tone = projectionOnly ? 'neutral' : (totals.diff > 0 ? 'risk' : totals.diff < 0 ? 'good' : 'neutral');
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
    renderFixedExecutiveSummary(period, totals, flowAgg, fixedBase, pctSaidas, projectionOnly);

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
  const realized = m => m >= 1 && m <= 6;

  function currentMonths(){
    const st = window.filterState || {};
    if (st.period === 'realized') return [1,2,3,4,5,6];
    if (st.period === 'projection') return [7,8,9,10,11,12];
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
    const realized = m => m<=6;
    let est=0, basis=0, realEst=0, real=0;
    months.forEach(m=> rows.forEach(it=>{ const r=it.months?.[m-1]||[0,0,0]; est+=r[0]||0; basis += realized(m) ? (r[1]||0) : (r[0]||0); if(realized(m)){real+=r[1]||0; realEst+=r[0]||0;} }));
    return {est,basis,real,diff:real-realEst};
  }
  function topCategory(months){
    const cats = (DATA.categories||[]).map(c=>({name:c.name, value:months.reduce((s,m)=>s+(c.months?.[m]||0),0)})).sort((a,b)=>b.value-a.value);
    return cats[0] || {name:'—', value:0};
  }
  function worstMonth(months, realizedOnly=false){
    const ms = realizedOnly ? months.filter(m=>m<=6) : months;
    return ms.map(m=>({m, ...(DATA.monthly[m]||{})})).sort((a,b)=>(a.resultado||0)-(b.resultado||0))[0] || null;
  }
  function bestMonth(months){
    return months.map(m=>({m, ...(DATA.monthly[m]||{})})).sort((a,b)=>(b.resultado||0)-(a.resultado||0))[0] || null;
  }
  function monthName(m){ try{return MONTH_NAMES_LONG[m]||m;}catch(e){return String(m);} }
  function render(){
    const page = document.getElementById('directoria'); if(!page) return;
    const p = activePeriod(); const months = p.months || [];
    let agg={entradas:0, saidas:0, resultado:0}; try{agg=aggregate(months);}catch(e){ months.forEach(m=>{const x=DATA.monthly[m]||{};agg.entradas+=x.entradas||0;agg.saidas+=x.saidas||0;agg.resultado+=x.resultado||0;}); }
    const margin = agg.entradas ? agg.resultado/agg.entradas*100 : 0;
    const fixed = fixedTotals(months); const fixedOnOut = agg.saidas ? fixed.basis/agg.saidas*100 : 0;
    const top = topCategory(months); const topPct = agg.saidas ? top.value/agg.saidas*100 : 0;
    const worst = worstMonth(months, months.some(m=>m<=6)); const best = bestMonth(months);
    const deficitMonths = months.filter(m=>(DATA.monthly[m]?.resultado||0)<0).length;
    let score = 50;
    score += Math.max(-25, Math.min(25, margin*2.2));
    score += deficitMonths===0 ? 12 : -Math.min(18, deficitMonths*3);
    score -= Math.max(0, topPct-45)*0.35;
    score -= Math.max(0, fixedOnOut-10)*0.8;
    score = Math.max(0, Math.min(100, Math.round(score)));
    const status = score>=75?'SAUDÁVEL':score>=55?'ATENÇÃO':'CRÍTICO';
    const color = score>=75?'var(--green)':score>=55?'var(--gold-l)':'var(--red)';
    document.getElementById('directorPeriodLabel').textContent = `${p.short || p.label} · ${months.length} mês(es) analisado(s)`;
    const verdict=document.getElementById('directorVerdict'); if(verdict){ verdict.style.setProperty('--director-color', color); verdict.innerHTML=`<span>STATUS DO PERÍODO</span><strong>${status}</strong><small>${agg.resultado>=0?'Geração líquida de caixa positiva':'Consumo líquido de caixa no período'} com margem de ${safePct(margin)}.</small>`; }
    const kpis=[
      ['Entradas', safeShort(agg.entradas), `${months.length} mês(es)`],
      ['Saídas gerenciais', safeShort(agg.saidas), `Top: ${top.name}`],
      ['Resultado', `${agg.resultado>=0?'+':''}${safeShort(agg.resultado)}`, `Margem ${safePct(margin)}`],
      ['Custo fixo', safeShort(fixed.basis), `${safePct(fixedOnOut)} das saídas`]
    ];
    const kg=document.getElementById('directorKpis'); if(kg) kg.innerHTML=kpis.map(k=>`<div class="director-kpi"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div><div class="sub">${k[2]}</div></div>`).join('');
    document.getElementById('directorScore').textContent = `${score}/100`;
    const sf=document.getElementById('directorScoreFill'); if(sf) sf.style.width = `${score}%`;
    const health=[
      ['Liquidez do período', agg.resultado>=0?'Positiva':'Pressionada', `${safeMoney(agg.resultado)} de resultado líquido.`],
      ['Concentração', topPct>60?'Alta':'Controlada', `${top.name} representa ${safePct(topPct)} das saídas.`],
      ['Custos fixos', fixedOnOut>10?'Relevante':'Baixo peso', `${safePct(fixedOnOut)} das saídas gerenciais.`],
      ['Meses negativos', deficitMonths?`${deficitMonths} mês(es)`: 'Nenhum', deficitMonths?'Há consumo de caixa em parte do recorte.':'Sem déficits no recorte selecionado.']
    ];
    const hl=document.getElementById('directorHealthList'); if(hl) hl.innerHTML=health.map(h=>`<div class="director-health-item"><b>${h[0]} · ${h[1]}</b><span>${h[2]}</span></div>`).join('');
    const att=[
      {c:'var(--gold)', b:'Categoria dominante', s:`${top.name} concentra ${safeMoney(top.value)} no período.`},
      {c:(worst?.resultado||0)<0?'var(--red)':'var(--green)', b:'Pior mês observado', s:worst?`${monthName(worst.m)} · ${safeMoney(worst.resultado||0)} de resultado.`:'Sem mês identificado.'},
      {c:'var(--cyan)', b:'Melhor geração de caixa', s:best?`${monthName(best.m)} · ${safeMoney(best.resultado||0)} de resultado.`:'Sem mês identificado.'}
    ];
    const al=document.getElementById('directorAttentionList'); if(al) al.innerHTML=att.map(x=>`<div class="director-attention-item" style="--c:${x.c}"><b>${x.b}</b><span>${x.s}</span></div>`).join('');
    const ex=document.getElementById('directorExplanation'); if(ex) ex.innerHTML=`No recorte <strong>${p.label || p.short}</strong>, a operação apresenta <strong>${safeMoney(agg.entradas)}</strong> em entradas e <strong>${safeMoney(agg.saidas)}</strong> em saídas gerenciais, resultando em <strong>${safeMoney(agg.resultado)}</strong>. A leitura central para diretoria é a concentração em <strong>${top.name}</strong>, que explica <strong>${safePct(topPct)}</strong> das saídas do período. Os custos fixos somam <strong>${safeMoney(fixed.basis)}</strong>, equivalentes a <strong>${safePct(fixedOnOut)}</strong> das saídas gerenciais.`;
    const recs=[];
    if(topPct>55) recs.push(`Validar plano de pagamento e negociação da categoria dominante (${top.name}).`);
    if(deficitMonths) recs.push(`Endereçar meses deficitários, priorizando ${worst?monthName(worst.m):'o pior mês do período'}.`);
    if(fixedOnOut>8) recs.push('Acompanhar custos fixos como percentual das saídas para evitar perda de flexibilidade financeira.');
    recs.push('Manter visão separada entre realizado e projeção para evitar decisões baseadas em meses ainda não confirmados.');
    const ac=document.getElementById('directorActionsList'); if(ac) ac.innerHTML=recs.slice(0,4).map(r=>`<li>${r}</li>`).join('');
  }
  window.renderDirectorPage = render;
  onDashboardReady(()=>setTimeout(()=>{ if (document.body.dataset.page === 'director') render(); },120));
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
    const realMonths=(months||[]).filter(m=>m<=6);
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
        acc.diff += (m <= 6 ? diff : 0);
        acc.basis += (m <= 6 ? real : est);
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
