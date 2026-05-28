/* ===== v23-advanced-interactions-script ===== */
(function(){
  'use strict';
  const V23 = {
    rankSort: 'value',
    tableSort: { key: null, dir: 'desc' },
    compareMonths: [],
    compareCats: [],
    pinnedTip: false,
    cinemaIndex: 0,
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
  const RANK_SORT_META = {
    value: {
      label: 'Valor total',
      chip: 'Valor',
      desc: 'classifica pela materialidade financeira no período selecionado.',
      metric: 'Valor no período'
    },
    pct: {
      label: 'Participação',
      chip: 'Participação',
      desc: 'classifica pelo peso relativo de cada rubrica sobre o total de saídas.',
      metric: 'Participação'
    },
    peak: {
      label: 'Pico mensal',
      chip: 'Pico mensal',
      desc: 'classifica pela maior concentração observada em um único mês.',
      metric: 'Maior pico'
    },
    recurrence: {
      label: 'Recorrência',
      chip: 'Recorrência',
      desc: 'classifica pelas rubricas que aparecem em mais meses do recorte.',
      metric: 'Meses com valor'
    },
    concentration: {
      label: 'Concentração',
      chip: 'Concentração',
      desc: 'classifica pelo percentual concentrado no mês de maior desembolso.',
      metric: 'Concentração'
    }
  };

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

  function addRankingToolbar(){
    const list = document.getElementById('rankList'); if(!list) return;
    let bar = document.getElementById('v23RankToolbar');
    const meta = RANK_SORT_META[V23.rankSort || 'value'] || RANK_SORT_META.value;
    const chips = Object.entries(RANK_SORT_META).map(([key,m]) => `<button class="v23-chip" data-rank-sort="${key}">${m.chip}</button>`).join('');
    const html = `<div class="v35-rank-toolbar-left"><div class="label">Critério de ordenação</div><div id="v35RankSortStatus" class="v35-sort-status"><strong>${meta.label}</strong> <span>· ${meta.desc}</span></div></div><div class="v23-chipset">${chips}</div>`;
    if(!bar){
      bar = document.createElement('div'); bar.id='v23RankToolbar'; bar.className='v23-rank-toolbar v35-rank-toolbar';
      list.parentNode.insertBefore(bar, list);
    }
    bar.className = 'v23-rank-toolbar v35-rank-toolbar';
    bar.innerHTML = html;
    bar.querySelectorAll('[data-rank-sort]').forEach(b=>setButtonLike(b,()=>{
      V23.rankSort=b.dataset.rankSort;
      renderRanking();
      decorateAfterRender();
    }));
    bar.querySelectorAll('[data-rank-sort]').forEach(b=>b.classList.toggle('active', b.dataset.rankSort===V23.rankSort));
  }

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
  document.addEventListener('keydown', e => { if(e.key==='Escape') { V23.pinnedTip=false; const tt=document.getElementById('tooltip'); if(tt){tt.classList.remove('v23-pinned'); originalHideTip();} if(document.body.classList.contains('v23-cinema')) closeCinema(); }});

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
    renderHeatmap();
    renderOutliers();
    renderCompareDock();
    wireInsights();
    pulseAlerts();
    wireCompareButtons();
    wireCinemaButton();
  }
  function updateDynamicBackground(){
    try {
      const agg = aggregate(getActivePeriod().months);
      document.body.classList.toggle('v23-positive', agg.resultado > 0);
      document.body.classList.toggle('v23-negative', agg.resultado < 0);
      document.body.classList.toggle('v23-neutral', agg.resultado === 0);
    } catch(e){}
  }
  document.addEventListener('mousemove', e => { document.body.style.setProperty('--mx', (e.clientX/window.innerWidth*100).toFixed(1)+'%'); document.body.style.setProperty('--my', (e.clientY/window.innerHeight*100).toFixed(1)+'%'); });
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

  
  function ensureHeatmapSection(){
    let sec = document.getElementById('heatmap');
    if(sec) {
      const h = sec.querySelector('h2'); if(h) h.textContent = 'Concentração mensal de saídas.';
      const ctx = sec.querySelector('.section-context'); if(ctx) ctx.textContent = 'Cards executivos por mês · top categorias e concentração';
      const right = sec.querySelector('.section-header .right'); if(right) right.textContent = 'Meses × Rubricas';
      const card = sec.querySelector('.heatmap-card');
      if(card) { card.className = 'heatmap-card monthly-cards-mode'; if(!card.querySelector('#v23Heatmap')) card.innerHTML = '<div id="v23Heatmap"></div><div id="v23Outliers" class="outlier-ribbon"></div>'; }
      return sec;
    }
    const categoriesSec = document.getElementById('categories');
    sec = document.createElement('section'); sec.id='heatmap'; sec.className='v23-section reveal in-view';
    sec.innerHTML = `<div class="container"><div class="section-header"><div class="left"><div class="eyebrow cyan">CONCENTRAÇÃO MENSAL</div><h2>Concentração mensal de saídas.</h2><div class="section-context">Cards executivos por mês · top categorias e concentração</div></div><div class="right">Meses × Rubricas</div></div><div class="heatmap-card monthly-cards-mode"><div id="v23Heatmap"></div><div id="v23Outliers" class="outlier-ribbon"></div></div></div>`;
    categoriesSec ? categoriesSec.insertAdjacentElement('afterend', sec) : document.querySelector('main')?.appendChild(sec);
    const nav = document.querySelector('.top-site-nav .site-nav-links');
    if(nav && !nav.querySelector('[data-target="heatmap"]')) nav.insertAdjacentHTML('beforeend','<a href="#heatmap" data-target="heatmap">Concentração</a>');
    return sec;
  }

  function renderHeatmap(){
    ensureHeatmapSection();
    const root = document.getElementById('v23Heatmap'); if(!root) return;
    const period = getActivePeriod();
    const periodMonths = period.months && period.months.length ? period.months : ALL_MONTHS;
    const selected = new Set(periodMonths);
    const sig = `${period.mode || 'custom'}:${periodMonths.join(',')}`;
    if (V23.heatPeriodSig !== sig) {
      V23.heatPeriodSig = sig;
      V23.heatFocused = false;
      V23.heatMonth = null;
    }

    const cats = (DATA.categoryMonthly || DATA.categories).slice(0,10);
    const colors = ['#6D6AF4','#22C3D6','#20C997','#E2A331','#E75858','#A66BE8','#D957A0','#83C92E','#35BDB3','#7D8BA8'];
    const monthTotals = {};
    ALL_MONTHS.forEach(m => monthTotals[m] = cats.reduce((s,c)=>s+(c.months?.[m]||0),0));

    const fallbackMonth = periodMonths.reduce((best,m)=> monthTotals[m] > monthTotals[best] ? m : best, periodMonths[0] || 1);
    if (V23.heatFocused && (!V23.heatMonth || !periodMonths.includes(V23.heatMonth))) {
      V23.heatFocused = false;
      V23.heatMonth = null;
    }
    const activeMonth = V23.heatFocused ? V23.heatMonth : fallbackMonth;
    const isMonthFocused = Boolean(V23.heatFocused && activeMonth);

    const activeTotal = monthTotals[activeMonth] || 0;
    const activeResult = DATA.monthly[activeMonth]?.resultado || 0;
    const periodAgg = aggregate(periodMonths);
    const activeRows = cats.map((c,i)=>({ name:c.name, value:c.months?.[activeMonth]||0, color:colors[i]||'#64748B' })).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
    const periodRows = cats.map((c,i)=>({ name:c.name, value:periodMonths.reduce((s,m)=>s+(c.months?.[m]||0),0), color:colors[i]||'#64748B' })).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
    const leader = isMonthFocused ? activeRows[0] : periodRows[0];
    const leaderBase = isMonthFocused ? activeTotal : periodRows.reduce((s,d)=>s+d.value,0);
    const dominance = leader && leaderBase ? leader.value / leaderBase * 100 : 0;
    const peakCells = cats.flatMap((c,i)=>ALL_MONTHS.map(m=>({cat:c.name, month:m, value:c.months?.[m]||0, color:colors[i]||'#64748B'}))).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,6);
    const totalPeriodClassified = periodMonths.reduce((s,m)=>s+(monthTotals[m]||0),0);
    const avgMonth = totalPeriodClassified / Math.max(periodMonths.length, 1);
    const criticalMonths = new Set(periodMonths.filter(m => (DATA.monthly[m]?.resultado||0) < 0 || monthTotals[m] > avgMonth * 1.35));

    const headerLabel = isMonthFocused ? 'Mês ativo' : 'Período ativo';
    const headerValue = isMonthFocused ? MONTH_NAMES_LONG[activeMonth] : (
      period.mode === 'year' ? '2026' :
      period.mode === 'realized' ? 'Realizado' :
      period.mode === 'projection' ? 'Projeção' :
      (periodMonths.length <= 3 ? periodMonths.map(m=>MONTH_NAMES_SHORT[m]).join(' + ') : `${periodMonths.length} meses`)
    );
    const headerResult = isMonthFocused ? activeResult : periodAgg.resultado;

    let html = `<div class="monthly-focus-header"><div><div class="monthly-focus-kicker">Concentração mensal por categoria</div><div class="monthly-focus-title">Cada mês como uma mini análise executiva.</div><div class="monthly-focus-copy">Os cards abaixo respeitam o <strong>período filtrado</strong>: meses fora do recorte não aparecem, reduzindo ruído visual e mantendo apenas o que precisa ser analisado.</div></div><div class="monthly-focus-stats"><div class="monthly-focus-stat"><div class="lbl">${headerLabel}</div><div class="val">${headerValue}</div></div><div class="monthly-focus-stat"><div class="lbl">Meses exibidos</div><div class="val">${periodMonths.length}</div></div><div class="monthly-focus-stat"><div class="lbl">Resultado</div><div class="val ${headerResult>=0?'good':'bad'}">${headerResult>=0?'+':'-'}${fmtMoney(Math.abs(headerResult))}</div></div></div></div>`;
    html += `<div class="monthly-concentration-grid">`;
    periodMonths.forEach(m=>{
      const total = monthTotals[m] || 0;
      const result = DATA.monthly[m]?.resultado || 0;
      const rows = cats.map((c,i)=>({ name:c.name, value:c.months?.[m]||0, color:colors[i]||'#64748B' })).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,4);
      const cls = `monthly-concentration-card in-period ${isMonthFocused && m===activeMonth?'active':''} ${m>=7?'projection':''} ${criticalMonths.has(m)?'critical':''}`;
      const badge = criticalMonths.has(m) ? '<span class="monthly-card-badge bad">Atenção</span>' : (m>=7 ? '<span class="monthly-card-badge proj">Projeção</span>' : '<span class="monthly-card-badge">Realizado</span>');
      html += `<button type="button" class="${cls}" data-month="${m}" aria-label="Ver composição de ${MONTH_NAMES_LONG[m]}"><div class="monthly-card-top"><div class="monthly-card-month">${MONTH_NAMES_SHORT[m]}</div>${badge}</div><div class="monthly-card-metrics"><div class="monthly-card-metric"><span class="lbl">Saídas</span><span class="val">${total?fmtMoney(total):'—'}</span></div><div class="monthly-card-metric"><span class="lbl">Resultado</span><span class="val ${result>=0?'good':'bad'}">${result>=0?'+':'-'}${fmtMoney(Math.abs(result))}</span></div></div>`;
      if(rows.length){
        html += `<div class="monthly-category-list">` + rows.map(d=>`<div class="monthly-cat-row" data-cat-name="${safe(d.name)}" data-month="${m}" data-value="${d.value}"><span class="monthly-cat-name"><i class="monthly-cat-dot" style="--cat-color:${d.color}"></i>${safe(d.name)}</span><span class="monthly-cat-value">${fmtMoney(d.value)}</span><span class="monthly-cat-bar"><span class="monthly-cat-fill" style="--cat-color:${d.color};--w:${total ? Math.max(3,d.value/total*100).toFixed(1) : 0}%"></span></span></div>`).join('') + `</div>`;
      } else {
        html += `<div class="monthly-empty-card">Sem concentração relevante de saídas classificadas neste mês.</div>`;
      }
      html += `</button>`;
    });
    html += `</div>`;

    const peakHtml = peakCells.slice(0,5).map((d,i)=>`<div class="monthly-peak-item" style="--cat-color:${d.color}" data-month="${d.month}" data-cat-name="${safe(d.cat)}"><span class="monthly-peak-rank">${String(i+1).padStart(2,'0')}</span><span><div class="monthly-peak-name">${safe(d.cat)}</div><div class="monthly-peak-sub">${MONTH_NAMES_LONG[d.month]}</div></span><span class="monthly-peak-value">${fmtMoney(d.value)}</span></div>`).join('');
    const baseRows = isMonthFocused ? activeRows : periodRows;
    const panelTitle = isMonthFocused ? 'Leitura do mês ativo' : 'Leitura do período filtrado';
    const panelCopy = leader ? (isMonthFocused
      ? `Em <strong>${MONTH_NAMES_LONG[activeMonth]}</strong>, <strong>${safe(leader.name)}</strong> lidera com <strong>${fmtMoneyFull(leader.value)}</strong>, equivalente a <strong>${dominance.toFixed(1)}%</strong> das saídas classificadas do mês.`
      : `No período <strong>${period.short || period.label}</strong>, <strong>${safe(leader.name)}</strong> lidera com <strong>${fmtMoneyFull(leader.value)}</strong>, equivalente a <strong>${dominance.toFixed(1)}%</strong> das saídas classificadas do recorte.`
    ) : (isMonthFocused ? 'O mês selecionado não apresenta concentração material nas categorias classificadas.' : 'O período selecionado não apresenta concentração material nas categorias classificadas.');
    const leaderHtml = baseRows.slice(0,4).map((d,i)=>`<div class="monthly-peak-item" style="--cat-color:${d.color}" data-month="${isMonthFocused ? activeMonth : ''}" data-cat-name="${safe(d.name)}"><span class="monthly-peak-rank">${String(i+1).padStart(2,'0')}</span><span><div class="monthly-peak-name">${safe(d.name)}</div><div class="monthly-peak-sub">${leaderBase ? (d.value/leaderBase*100).toFixed(1) : '0.0'}% ${isMonthFocused ? 'do mês' : 'do período'}</div></span><span class="monthly-peak-value">${fmtMoney(d.value)}</span></div>`).join('') || `<div class="empty-state"><strong>Sem composição relevante</strong><br>Não há categorias com valor positivo no recorte ativo.</div>`;
    html += `<div class="monthly-concentration-footer"><div class="monthly-side-panel"><h4>${panelTitle}</h4><div class="monthly-focus-copy" style="margin:0 0 10px;">${panelCopy}</div><div class="monthly-peak-list">${leaderHtml}</div></div><div class="monthly-side-panel"><h4>Maiores picos de 2026</h4><div class="monthly-peak-list">${peakHtml}</div></div></div>`;
    root.innerHTML = html;

    root.querySelectorAll('.monthly-concentration-card').forEach(card=>{
      card.addEventListener('mouseenter',()=>highlightMonth(Number(card.dataset.month)));
      card.addEventListener('mouseleave', clearContext);
      card.addEventListener('click',()=>{ V23.heatMonth=Number(card.dataset.month); V23.heatFocused=true; renderHeatmap(); });
    });
    root.querySelectorAll('.monthly-cat-row,.monthly-peak-item').forEach(item=>{
      item.addEventListener('mouseenter',()=>{ if(item.dataset.month) highlightMonth(Number(item.dataset.month)); if(item.dataset.catName) highlightCategory(item.dataset.catName); });
      item.addEventListener('mouseleave', clearContext);
      item.addEventListener('mousemove', e => {
        if(!item.dataset.catName || !item.dataset.month) return;
        const m=Number(item.dataset.month), val=Number(item.dataset.value||0) || cats.find(c=>c.name===item.dataset.catName)?.months?.[m] || 0;
        const total=monthTotals[m]||1;
        showTip('Composição mensal', [['Categoria', item.dataset.catName], ['Mês', MONTH_NAMES_LONG[m]], ['Valor', fmtMoneyFull(val)], ['% do mês', (val/total*100).toFixed(1)+'%']], e.clientX, e.clientY);
      });
      item.addEventListener('mouseleave', hideTip);
      item.addEventListener('click',e=>{ e.stopPropagation(); if(item.dataset.month){ V23.heatMonth=Number(item.dataset.month); V23.heatFocused=true; } if(item.dataset.catName) selectedCategoryName=item.dataset.catName; renderHeatmap(); renderRanking(); });
    });
  }

function renderOutliers(){
    const box = document.getElementById('v23Outliers'); if(!box) return;
    const months = getActivePeriod().months;
    const vals = months.map(m=>DATA.monthly[m].saidas); const avg = vals.reduce((a,b)=>a+b,0)/Math.max(vals.length,1); const sd = Math.sqrt(vals.reduce((a,b)=>a+Math.pow(b-avg,2),0)/Math.max(vals.length,1)) || 1;
    const outs = months.map(m=>({m,z:(DATA.monthly[m].saidas-avg)/sd,val:DATA.monthly[m].saidas})).filter(o=>o.z>1.15).sort((a,b)=>b.z-a.z).slice(0,4);
    box.innerHTML = outs.length ? outs.map(o=>`<button class="outlier-pill" data-month="${o.m}">⚠ ${MONTH_NAMES_SHORT[o.m]} · saída ${o.z.toFixed(1)}σ acima</button>`).join('') : `<span class="outlier-pill" style="border-color:rgba(16,185,129,.35);background:rgba(16,185,129,.08);color:#86EFAC;">Sem outlier relevante no período</span>`;
    box.querySelectorAll('[data-month]').forEach(b=>b.addEventListener('click',()=>{ setSelectedMonths([Number(b.dataset.month)], 'custom'); applyFilter(); }));
  }

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

  function wireCinemaButton(){
    if(document.getElementById('v23CinemaMode')) return;
    const actions = document.querySelector('.sidebar-actions');
    if(actions){
      const btn=document.createElement('button'); btn.type='button'; btn.id='v23CinemaMode'; btn.className='sidebar-action gold'; btn.textContent='Modo cinema';
      actions.appendChild(btn); setButtonLike(btn, openCinema);
    }
  }
  function ensureCinema(){
    let o=document.getElementById('v23Cinema'); if(o) return o;
    o=document.createElement('div'); o.id='v23Cinema'; o.className='v23-cinema-overlay';
    o.innerHTML = `<button class="v23-cinema-close">Fechar</button><button class="v23-cinema-prev">Anterior</button><button class="v23-cinema-next">Próximo</button><div class="v23-cinema-progress" id="v23CinemaProgress"></div><div id="v23CinemaSlides" style="width:100%;height:100%;"></div>`;
    document.body.appendChild(o);
    o.querySelector('.v23-cinema-close').addEventListener('click', closeCinema);
    o.querySelector('.v23-cinema-next').addEventListener('click',()=>moveCinema(1));
    o.querySelector('.v23-cinema-prev').addEventListener('click',()=>moveCinema(-1));
    document.addEventListener('keydown', e=>{ if(!document.body.classList.contains('v23-cinema')) return; if(e.key==='ArrowRight') moveCinema(1); if(e.key==='ArrowLeft') moveCinema(-1); });
    return o;
  }
  function openCinema(){
    const period=getActivePeriod(), agg=aggregate(period.months), cats=getCategoryBreakdown(period.months), top=cats[0];
    const slides = [
      {k:'Fluxo de Caixa 2026', t:'Performance financeira em modo cinema.', x:`${periodLabelFor(period.months, period.mode)} · leitura executiva dinâmica.`},
      {k:'Resultado do período', t:`${agg.resultado>=0?'+':''}${fmtMoneyFull(agg.resultado)}`, x:`Entradas de ${fmtMoneyFull(agg.entradas)} contra saídas gerenciais de ${fmtMoneyFull(agg.saidas)}.`},
      {k:'Principal pressão de caixa', t: top ? top.name : 'Sem categoria', x: top ? `${fmtMoneyFull(top.value)} · ${fmtPct(top.pct)} das saídas do recorte.` : 'Sem saídas classificadas no período.'},
      {k:'Mapa crítico', t:'Concentração, outliers e composição.', x:'Use as setas para navegar. Esc fecha o modo cinema.'}
    ];
    const root=ensureCinema().querySelector('#v23CinemaSlides');
    root.innerHTML = slides.map((s,i)=>`<section class="v23-cinema-slide ${i===0?'active':''}"><div class="v23-cinema-content"><div class="v23-cinema-kicker">${safe(s.k)}</div><div class="v23-cinema-title">${safe(s.t)}</div><div class="v23-cinema-text">${safe(s.x)}</div><div class="v23-cinema-metrics"><div class="v23-cinema-metric"><div class="mini">Entradas</div><h3>${fmtMoneyFull(agg.entradas)}</h3></div><div class="v23-cinema-metric"><div class="mini">Saídas</div><h3>${fmtMoneyFull(agg.saidas)}</h3></div><div class="v23-cinema-metric"><div class="mini">Margem</div><h3>${fmtPct(agg.margem)}</h3></div></div></div></section>`).join('');
    V23.cinemaIndex=0; document.body.classList.add('v23-cinema'); updateCinemaProgress();
  }
  function closeCinema(){ document.body.classList.remove('v23-cinema'); }
  function moveCinema(d){
    const slides=[...document.querySelectorAll('.v23-cinema-slide')]; if(!slides.length) return;
    slides[V23.cinemaIndex]?.classList.remove('active');
    V23.cinemaIndex=(V23.cinemaIndex+d+slides.length)%slides.length;
    slides[V23.cinemaIndex]?.classList.add('active'); updateCinemaProgress();
  }
  function updateCinemaProgress(){ const slides=document.querySelectorAll('.v23-cinema-slide'); const p=document.getElementById('v23CinemaProgress'); if(p) p.textContent = `${V23.cinemaIndex+1} / ${slides.length}`; }

  // initial boot after original init
  document.addEventListener('DOMContentLoaded', () => { setTimeout(decorateAfterRender, 180); });
})();
