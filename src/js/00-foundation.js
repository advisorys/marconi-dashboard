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
