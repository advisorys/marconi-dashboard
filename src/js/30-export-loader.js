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
