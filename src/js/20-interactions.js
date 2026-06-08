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
