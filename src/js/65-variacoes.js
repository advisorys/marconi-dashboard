/* "O que explica a variação do caixa" — Fluxo de Caixa.
   Liga a variação de resultado mês a mês (financeiro.json) às justificativas
   do balancete (data/justificativas.json), por transição (ex.: Jan -> Fev). */
(function () {
  'use strict';

  var JUSTIF = null, sel = 0, TRANS = [];
  var MES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  function money(v) {
    try { if (window.MarconiFormat && window.MarconiFormat.moneyShort) return window.MarconiFormat.moneyShort(v); } catch (e) {}
    var n = Number(v) || 0, a = Math.abs(n), s = n < 0 ? '-' : '';
    if (a >= 1e6) return s + 'R$ ' + (a / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return s + 'R$ ' + (a / 1e3).toFixed(0) + 'K';
    return s + 'R$ ' + Math.round(a).toLocaleString('pt-BR');
  }
  function esc(s) {
    try { if (window.MarconiFormat && window.MarconiFormat.escapeHtml) return window.MarconiFormat.escapeHtml(s); } catch (e) {}
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function monthly(m) {
    try { var d = window.__DATA__ && window.__DATA__.monthly; return d && (d[m] || d[String(m)]); } catch (e) { return null; }
  }

  function dedupe(items) {
    var map = {};
    (items || []).forEach(function (it) {
      var k = (it.justificativa || '').trim().toLowerCase();
      if (!k) return;
      var mag = Math.abs(Number(it.delta) || 0);
      if (!map[k] || mag > map[k]._mag) {
        var c = {};
        for (var p in it) { if (Object.prototype.hasOwnProperty.call(it, p)) c[p] = it[p]; }
        c._mag = mag;
        map[k] = c;
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function buildTransitions() {
    TRANS = [];
    if (!JUSTIF || !JUSTIF.periodos) return;
    JUSTIF.periodos.forEach(function (p) {
      if (p.ano !== 2026) return;            // foco no exercício corrente
      var de = monthly(p.de), para = monthly(p.para);
      if (!de || !para) return;              // precisa do caixa nos dois meses
      TRANS.push({ p: p, de: p.de, para: p.para, cdDe: de, cdPara: para });
    });
  }

  function whyHtml(items) {
    return items.map(function (it) {
      var d = '';
      if (it.delta != null) {
        var cls = it.delta >= 0 ? 'up' : 'down';
        d = '<span class="cashvar-driver-delta ' + cls + '">' + (it.delta >= 0 ? '+' : '') + money(it.delta) + '</span>';
      }
      return '<div class="cashvar-driver"><div class="cashvar-driver-top"><span class="cashvar-driver-conta">' +
        esc(it.conta) + '</span>' + d + '</div><div class="cashvar-driver-text">' + esc(it.justificativa) + '</div></div>';
    }).join('');
  }

  function render() {
    var tabsEl = document.getElementById('cashvarTabs');
    var panelEl = document.getElementById('cashvarPanel');
    if (!tabsEl || !panelEl) return;

    if (!TRANS.length) {
      tabsEl.innerHTML = '';
      panelEl.innerHTML = '<div class="cashvar-empty">As justificativas chegam por balancete mensal da controladoria. Assim que os próximos meses forem enviados, cada variação aparece explicada aqui.</div>';
      return;
    }
    if (sel >= TRANS.length) sel = TRANS.length - 1;

    tabsEl.innerHTML = TRANS.map(function (t, i) {
      return '<button type="button" class="cashvar-tab' + (i === sel ? ' active' : '') +
        '" data-cv="' + i + '">' + esc(MES[t.de]) + ' → ' + esc(MES[t.para]) + '</button>';
    }).join('');

    var t = TRANS[sel];
    var rDe = Number(t.cdDe.resultado) || 0, rPara = Number(t.cdPara.resultado) || 0, dR = rPara - rDe;
    var eDe = Number(t.cdDe.entradas) || 0, ePara = Number(t.cdPara.entradas) || 0, dE = ePara - eDe;
    var sDe = Number(t.cdDe.saidas) || 0, sPara = Number(t.cdPara.saidas) || 0, dS = sPara - sDe;
    var dir = dR >= 0 ? 'up' : 'down';
    var pct = rDe !== 0 ? Math.round(dR / Math.abs(rDe) * 100) : null;

    var items = dedupe(t.p.itens).sort(function (a, b) {
      return Math.abs(Number(b.delta) || 0) - Math.abs(Number(a.delta) || 0);
    });

    panelEl.innerHTML =
      '<div class="cashvar-headline ' + dir + '">' +
        '<div class="cashvar-metric-label">Resultado de caixa · ' + esc(MES[t.de]) + ' → ' + esc(MES[t.para]) + '</div>' +
        '<div class="cashvar-flow"><span class="cashvar-from">' + (rDe >= 0 ? '+' : '') + money(rDe) +
          '</span><span class="cashvar-arrow">→</span><span class="cashvar-to">' + (rPara >= 0 ? '+' : '') + money(rPara) + '</span></div>' +
        '<div class="cashvar-bigdelta">' + (dR >= 0 ? '▲ ganho de ' : '▼ queda de ') + money(Math.abs(dR)) +
          (pct != null ? ' · ' + Math.abs(pct) + '%' : '') + '</div>' +
        '<div class="cashvar-subdeltas">' +
          '<span>Entradas <b class="' + (dE >= 0 ? 'up' : 'down') + '">' + (dE >= 0 ? '+' : '−') + money(Math.abs(dE)) + '</b></span>' +
          '<span>Saídas <b class="' + (dS >= 0 ? 'down' : 'up') + '">' + (dS >= 0 ? '+' : '−') + money(Math.abs(dS)) + '</b></span>' +
        '</div>' +
      '</div>' +
      '<div class="cashvar-why"><div class="cashvar-why-label">O que aconteceu · explicações da controladoria</div>' +
        '<div class="cashvar-why-list">' + whyHtml(items) + '</div></div>';
  }

  function wire() {
    var tabsEl = document.getElementById('cashvarTabs');
    if (!tabsEl || tabsEl.__cvWired) return;
    tabsEl.__cvWired = true;
    tabsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cv]');
      if (!b) return;
      sel = Number(b.getAttribute('data-cv')) || 0;
      render();
    });
  }

  function start() {
    var url = 'data/justificativas.json';
    try { if (window.DASHBOARD_ASSET_VERSION) url += '?v=' + encodeURIComponent(window.DASHBOARD_ASSET_VERSION); } catch (e) {}
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      JUSTIF = j;
      buildTransitions();
      sel = TRANS.length ? TRANS.length - 1 : 0; // abre no mais recente
      wire();
      render();
    }).catch(function (e) { console.warn('[cashvar] falha ao carregar justificativas:', e); });
  }

  function init() {
    if (window.__DATA__ && window.__DATA__.monthly) { start(); return; }
    var n = 0, t = setInterval(function () {
      n++;
      if ((window.__DATA__ && window.__DATA__.monthly) || n > 40) { clearInterval(t); start(); }
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
