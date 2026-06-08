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
