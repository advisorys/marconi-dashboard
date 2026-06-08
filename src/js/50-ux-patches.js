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
    director: 'Diretoria'
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
    'home', 'kpis', 'executive', 'monthly', 'result',
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
    fixed: 'Custos Fixos'
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
    fixed: 'Custos Fixos'
  };
  const PAGE_CONTROLS = {
    director: 'directoria',
    cash: 'kpis',
    fixed: 'fixed-costs'
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
    document.querySelectorAll('.fixed-view-tab').forEach(function(tab) {
      const active = tab.dataset.fixedView === current;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
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
    document.querySelectorAll('.fixed-view-tab[data-fixed-view]').forEach(function(tab) {
      const active = tab.dataset.fixedView === current;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
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
