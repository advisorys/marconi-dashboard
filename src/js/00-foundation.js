/* Marconi Dashboard application scripts
   Extracted from index.html. Blocks remain in original order to preserve behavior.
   Data is exposed by assets/bootstrap.js as window.DASHBOARD_DATA and legacy aliases. */

/* Compatibility bridge: app.js is loaded after async data fetch, so legacy
   DOMContentLoaded callbacks must still run when the DOM is already ready. */
(function () {
  'use strict';
  if (window.__dashboardReadyBridgeInstalled) return;
  window.__dashboardReadyBridgeInstalled = true;

  const nativeAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = function (type, listener, options) {
    if (type === 'DOMContentLoaded' && document.readyState !== 'loading' && typeof listener === 'function') {
      queueMicrotask(function () {
        listener.call(document, new Event('DOMContentLoaded'));
      });
      return undefined;
    }
    return nativeAddEventListener(type, listener, options);
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
