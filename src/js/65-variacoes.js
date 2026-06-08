/* Camada "Variações & Justificativas" — explicações do balancete (controladoria).
   Lê data/justificativas.json e renderiza dentro da página Diretoria (#variacoesBlock). */
(function () {
  'use strict';

  var DATA = null;
  var sel = 0;
  var GROUPS = ['Resultado', 'Ativo', 'Passivo', 'Outros'];
  var GROUP_LABEL = {
    Resultado: 'Resultado — receitas, custos e despesas',
    Ativo: 'Ativo — caixa, recebíveis, estoque, tributos',
    Passivo: 'Passivo — fornecedores e financiamentos',
    Outros: 'Outros'
  };

  function fmtMoney(v) {
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

  // Dedup por texto de justificativa dentro do período (mantém a conta de maior |Δ|),
  // pra não repetir a mesma explicação em conta-pai e conta-filha.
  function dedupe(items) {
    var map = {};
    (items || []).forEach(function (it) {
      var k = (it.justificativa || '').trim().toLowerCase();
      if (!k) return;
      var mag = Math.abs(Number(it.delta) || 0);
      var cur = map[k];
      if (!cur || mag > cur._mag) {
        var copy = {};
        for (var p in it) { if (Object.prototype.hasOwnProperty.call(it, p)) copy[p] = it[p]; }
        copy._mag = mag;
        map[k] = copy;
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function deltaHtml(it) {
    if (it.delta == null) return '';
    var cls = it.delta >= 0 ? 'up' : 'down';
    var pct = (it.varPct != null) ? ' · ' + (it.varPct >= 0 ? '+' : '') + Math.round(it.varPct) + '%' : '';
    return '<span class="vrc-delta ' + cls + '">' + (it.delta >= 0 ? '+' : '') + fmtMoney(it.delta) + pct + '</span>';
  }

  function itemHtml(it) {
    return '<div class="vrc-item"><div class="vrc-item-head"><span class="vrc-conta">' +
      esc(it.conta) + '</span>' + deltaHtml(it) + '</div><div class="vrc-justif">' +
      esc(it.justificativa) + '</div></div>';
  }

  function render() {
    if (!DATA || !DATA.periodos || !DATA.periodos.length) return;
    var periodsEl = document.getElementById('variacoesPeriods');
    var hiEl = document.getElementById('variacoesHighlights');
    var grEl = document.getElementById('variacoesGroups');
    if (!periodsEl || !grEl) return;

    periodsEl.innerHTML = DATA.periodos.map(function (p, i) {
      return '<button type="button" class="vrc-tab' + (i === sel ? ' active' : '') +
        '" data-vrc="' + i + '">' + esc(p.periodo) + ' <small>' + (p.qtd || 0) + '</small></button>';
    }).join('');

    var per = DATA.periodos[sel] || DATA.periodos[0];
    var items = dedupe(per.itens);

    var hi = items.filter(function (it) { return it.delta != null && Math.abs(it.delta) > 0; })
      .sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); }).slice(0, 4);
    if (hiEl) {
      hiEl.innerHTML = hi.length
        ? '<div class="vrc-hi-label">Maiores variações do período</div><div class="vrc-hi-grid">' +
          hi.map(function (it) {
            var cls = it.delta >= 0 ? 'up' : 'down';
            return '<div class="vrc-hi ' + cls + '"><div class="vrc-hi-conta">' + esc(it.conta) +
              '</div><div class="vrc-hi-delta">' + (it.delta >= 0 ? '+' : '') + fmtMoney(it.delta) +
              '</div><div class="vrc-hi-justif">' + esc(it.justificativa) + '</div></div>';
          }).join('') + '</div>'
        : '';
    }

    var html = '';
    GROUPS.forEach(function (g) {
      var gi = items.filter(function (it) { return (it.grupo || 'Outros') === g; })
        .sort(function (a, b) { return Math.abs(b.delta || 0) - Math.abs(a.delta || 0); });
      if (!gi.length) return;
      html += '<div class="vrc-group"><div class="vrc-group-head">' + esc(GROUP_LABEL[g] || g) +
        ' <small>' + gi.length + '</small></div>' + gi.map(itemHtml).join('') + '</div>';
    });
    grEl.innerHTML = html;
  }

  function wire() {
    var periodsEl = document.getElementById('variacoesPeriods');
    if (!periodsEl || periodsEl.__vrcWired) return;
    periodsEl.__vrcWired = true;
    periodsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vrc]');
      if (!b) return;
      sel = Number(b.getAttribute('data-vrc')) || 0;
      render();
    });
  }

  function init() {
    var url = 'data/justificativas.json';
    try { if (window.DASHBOARD_ASSET_VERSION) url += '?v=' + encodeURIComponent(window.DASHBOARD_ASSET_VERSION); } catch (e) {}
    fetch(url).then(function (r) { return r.json(); }).then(function (json) {
      DATA = json;
      sel = (json.periodos && json.periodos.length) ? json.periodos.length - 1 : 0; // mais recente
      wire();
      render();
    }).catch(function (e) { console.warn('[variacoes] falha ao carregar justificativas:', e); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
