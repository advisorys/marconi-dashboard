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
