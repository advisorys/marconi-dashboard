/* Página DRE — Demonstração de Resultado do Exercício (contábil, regime de competência).
   Lê window.DASHBOARD_DATA.dre (gerado pelo importador a partir do .xlsb da contabilidade).
   Some uma camada via decorator de setDashboardPage — não reescreve a base. */
(function () {
  'use strict';

  var MONTH_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  function fmt() { return (window.MarconiFormat) || {}; }
  function esc(s) { var f = fmt(); return f.escapeHtml ? f.escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }
  function money(v) { var f = fmt(); return f.moneyFull ? f.moneyFull(v) : 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR'); }
  function cell(v) {
    var n = Math.round(Number(v) || 0);
    return n.toLocaleString('pt-BR');
  }

  function dreData() {
    var data = window.DASHBOARD_DATA || window.__DATA__ || {};
    return data.dre || null;
  }

  function valOf(line, m) {
    var v = line.values || {};
    return Number(v[m] != null ? v[m] : (v[String(m)] != null ? v[String(m)] : 0)) || 0;
  }
  function sumLine(line, months) {
    return months.reduce(function (s, m) { return s + valOf(line, m); }, 0);
  }
  function findLine(dre, key) {
    for (var i = 0; i < dre.lines.length; i++) { if (dre.lines[i].key === key) return dre.lines[i]; }
    return null;
  }

  // Valor acumulado autoritativo: usa o `acum` assinado (DRE cumulativa) quando há;
  // senão cai pra soma dos meses preenchidos.
  function accumOf(line, filled) {
    if (line && typeof line.acum === 'number') return line.acum;
    return line ? sumLine(line, filled) : 0;
  }

  function renderKpis(dre, filled) {
    var host = document.getElementById('dreKpis');
    if (!host) return;
    var rlV = accumOf(findLine(dre, 'receita_liquida'), filled);
    var rbV = accumOf(findLine(dre, 'receita_bruta'), filled);
    var cmvV = accumOf(findLine(dre, 'cmv'), filled);
    var resV = accumOf(findLine(dre, 'resultado'), filled);
    var margem = rbV > 0 ? (resV / rbV * 100) : 0;
    // Margem bruta GERENCIAL (derivada, não está na DRE assinada): (RL − |CMV|) / RL.
    // Evita a leitura enganosa de "margem bruta = 100%" (a DRE oficial aninha o CMV em Desp. Vendas).
    var margemBruta = rlV > 0 ? ((rlV - Math.abs(cmvV)) / rlV * 100) : 0;

    var cards = [
      { lbl: 'Receita Líquida', val: money(rlV), cls: 'number-gold', sub: 'acumulado assinado' },
      { lbl: 'CMV / Custo', val: money(cmvV), cls: 'number-red', sub: rlV > 0 ? fmtPct(Math.abs(cmvV) / rlV * 100) + ' da receita líquida' : '' },
      { lbl: 'Margem Bruta (gerencial)', val: fmtPct(margemBruta), cls: margemBruta >= 0 ? 'number-green' : 'number-red', sub: '(Receita Líq. − CMV) ÷ Receita Líq.' },
      { lbl: 'Lucro Líquido', val: (resV >= 0 ? '+' : '') + money(resV), cls: resV >= 0 ? 'number-green' : 'number-red', sub: fmtPct(margem) + ' da receita bruta' }
    ];
    host.innerHTML = cards.map(function (c) {
      return '<div class="dre-kpi"><div class="lbl">' + esc(c.lbl) + '</div>' +
        '<div class="val ' + c.cls + '">' + c.val + '</div>' +
        '<div class="sub">' + esc(c.sub) + '</div></div>';
    }).join('');
  }

  function fmtPct(v) {
    var f = fmt();
    if (f.pct) return f.pct(v);
    return (Math.round((v || 0) * 10) / 10).toLocaleString('pt-BR') + '%';
  }

  function renderTable(dre, filled) {
    var wrap = document.getElementById('dreTableWrap');
    if (!wrap) return;
    var abbr = dre.months || ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    // Margem bruta gerencial p/ a micro-nota da linha de Lucro Bruto (a DRE oficial aninha o CMV em Desp. Vendas).
    var rlAcum = accumOf(findLine(dre, 'receita_liquida'), filled);
    var cmvAcum = accumOf(findLine(dre, 'cmv'), filled);
    var margemBrutaGer = rlAcum > 0 ? ((rlAcum - Math.abs(cmvAcum)) / rlAcum * 100) : 0;

    var head = '<thead><tr><th class="dre-th-label">Linha</th>';
    filled.forEach(function (m) { head += '<th class="num">' + esc(abbr[m - 1] || ('M' + m)) + '</th>'; });
    head += '<th class="num dre-th-total">Acum.</th></tr></thead>';

    var body = '<tbody>';
    dre.lines.forEach(function (line) {
      var total = accumOf(line, filled);
      var isResult = (line.kind === 'resultado' || line.kind === 'subtotal');
      var rowCls = 'dre-row dre-row--' + line.kind + ' dre-row--l' + (line.level || 0);
      // Divergência soma(meses preenchidos) × acum assinado — sinalizar por linha quando |Δ| > R$1.
      var somaMeses = sumLine(line, filled);
      var delta = somaMeses - total;
      var hasDiverg = (typeof line.acum === 'number') && Math.abs(delta) > 1;
      body += '<tr class="' + rowCls + '">';
      var labelHtml = esc(line.label);
      if (line.key === 'lucro_bruto') {
        var gerNote = 'Estrutura oficial: Lucro Bruto = Receita Líquida (o CMV é deduzido em “Despesas com Vendas”). Margem bruta gerencial (RL − CMV) ÷ RL ≈ ' + fmtPct(margemBrutaGer) + '.';
        labelHtml += ' <span class="dre-ger-note" title="' + esc(gerNote) + '" aria-label="' + esc(gerNote) + '">margem bruta gerencial ' + esc(fmtPct(margemBrutaGer)) + '</span>';
      }
      body += '<td class="dre-cell-label">' + labelHtml + '</td>';
      filled.forEach(function (m) {
        var v = valOf(line, m);
        var vc = (isResult && v < 0) ? 'number-red' : (isResult && v > 0 ? 'number-green' : '');
        body += '<td class="num ' + vc + '">' + (v ? cell(v) : '<span class="dre-zero">—</span>') + '</td>';
      });
      var tc = (isResult && total < 0) ? 'number-red' : (isResult && total > 0 ? 'number-green' : '');
      var badge = '';
      if (hasDiverg) {
        var dlabel = '≠ soma dos meses: Δ ' + (delta >= 0 ? '+' : '') + money(delta) + ' — reclassificações contábeis';
        badge = '<span class="dre-diverg-badge" role="img" aria-label="' + esc(dlabel) + '" title="' + esc(dlabel) + '">Δ</span>';
      }
      body += '<td class="num dre-td-total' + (hasDiverg ? ' dre-td-diverg' : '') + ' ' + tc + '">' + (total ? cell(total) : '—') + badge + '</td>';
      body += '</tr>';
    });
    body += '</tbody>';

    wrap.innerHTML = '<table class="dre-table">' + head + body + '</table>';
  }

  function renderDrePage() {
    var dre = dreData();
    var ctx = document.getElementById('dreContext');
    var foot = document.getElementById('dreFoot');
    if (!dre || !dre.lines || !dre.lines.length) {
      var wrap = document.getElementById('dreTableWrap');
      if (wrap) wrap.innerHTML = '<div class="dre-empty">DRE contábil ainda não disponível para este período.</div>';
      var kp = document.getElementById('dreKpis'); if (kp) kp.innerHTML = '';
      return;
    }
    var filled = (dre.monthsFilled && dre.monthsFilled.length) ? dre.monthsFilled.slice() : [1, 2, 3, 4, 5];
    filled.sort(function (a, b) { return a - b; });

    if (ctx) {
      var first = MONTH_FULL[filled[0]] || '';
      var last = MONTH_FULL[filled[filled.length - 1]] || '';
      ctx.textContent = 'REGIME DE COMPETÊNCIA · ' + (first === last ? first : (first + '—' + last)).toUpperCase();
    }
    renderKpis(dre, filled);
    renderTable(dre, filled);
    if (foot) {
      var src = dre.source || {};
      var origem = src.origem || 'DRE contábil';
      foot.innerHTML = esc(origem) + (src.empresa ? ' · ' + esc(src.empresa) : '') +
        '. Regime de competência (não confundir com o caixa do Fluxo). Coluna “Acum.” = DRE cumulativa assinada; meses = DREs mensais assinadas (a soma pode diferir do acumulado por reclassificações contábeis).';
    }
  }
  window.renderDrePage = renderDrePage;

  function maybeRenderDre(page) {
    if (page === 'dre') {
      try { renderDrePage(); } catch (e) { console.error('Erro DRE:', e); }
    }
  }

  // Hook primário: o smooth-nav de 50-ux-patches chama window.__baseSetDashboardPage
  // DIRETO (não a cadeia de window.setDashboardPage), então um decorator de
  // window.setDashboardPage seria ignorado. 45-dre roda entre 40 (que define a base)
  // e 50 (que a captura), então envolvemos a base antes de ela ser capturada.
  var base = window.__baseSetDashboardPage;
  if (typeof base === 'function' && !base.__dreWrapped) {
    var wrapped = function (page) {
      var out = base.apply(this, arguments);
      maybeRenderDre(page);
      return out;
    };
    wrapped.__dreWrapped = true;
    window.__baseSetDashboardPage = wrapped;
  }

  // Backup idempotente: evento de troca de página.
  if (window.MarconiEvents && window.MarconiEvents.on) {
    window.MarconiEvents.on('page:changed', function (e) {
      maybeRenderDre(e && e.detail && e.detail.to);
    });
  }

  // Render inicial se a página já abrir na DRE.
  if (window.onDashboardReady) {
    window.onDashboardReady(function () {
      if (document.body && document.body.dataset.page === 'dre') renderDrePage();
    });
  }
})();
