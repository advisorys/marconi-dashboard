/* Marconi Dashboard data bootstrap
   Loads data/financeiro.json asynchronously and then starts the dashboard app. */
(function () {
  'use strict';

  const DATA_URL = 'data/financeiro.json';
  const APP_URL = 'assets/app.js';

  function exposeData(payload) {
    const safePayload = payload && typeof payload === 'object' ? payload : {};
    window.DASHBOARD_DATA = safePayload;
    window.__DATA__ = safePayload.fluxo_caixa || safePayload;
    window.__FIXED_COST_DATA__ = safePayload.custos_fixos || {};
    window.__META__ = safePayload.meta || {};
  }

  function syncLastUpdate() {
    document.addEventListener('DOMContentLoaded', function () {
      const ts = document.getElementById('lastUpdateTime');
      const updatedAt = window.__META__ && window.__META__.ultima_atualizacao;
      if (!ts || !updatedAt) return;
      const date = new Date(updatedAt);
      if (!Number.isNaN(date.getTime())) {
        ts.textContent = date.toLocaleString('pt-BR');
      }
    });
  }

  function showDataError(error) {
    console.error('[Bootstrap] Erro ao carregar dados:', error);
    document.addEventListener('DOMContentLoaded', function () {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'dashboard-data-error';
      errorDiv.innerHTML =
        '<div class="dashboard-data-error__icon">!</div>' +
        '<div class="dashboard-data-error__title">Erro ao carregar dados</div>' +
        '<div class="dashboard-data-error__body">' +
        'Não foi possível carregar <code>data/financeiro.json</code>. ' +
        'No GitHub Pages isso deve funcionar automaticamente. Para teste local, abra a pasta por um servidor local.' +
        '</div>';
      document.body.appendChild(errorDiv);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Falha ao carregar ' + src));
      };
      document.head.appendChild(script);
    });
  }

  async function bootstrapDashboard() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ' ao buscar ' + DATA_URL);
      }
      const payload = await response.json();
      exposeData(payload);
      syncLastUpdate();
      await loadScript(APP_URL);
      console.log('[Bootstrap] Dados carregados de:', DATA_URL);
    } catch (error) {
      exposeData({});
      showDataError(error);
    }
  }

  bootstrapDashboard();
})();
