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

  // ── Selo de status padronizado (E1) — número-chave da DRE = margem líquida ──
  function renderSeal(dre, filled) {
    if (!window.MarconiSeal) return;
    var rlV = accumOf(findLine(dre, 'receita_liquida'), filled);
    var resV = accumOf(findLine(dre, 'resultado'), filled);
    var mLiquida = rlV > 0 ? (resV / rlV * 100) : 0;
    var tone, verdict;
    if (mLiquida < 0) { tone = 'risk'; verdict = 'PREJUÍZO'; }
    else if (mLiquida < 3) { tone = 'watch'; verdict = 'MARGEM NO LIMITE'; }
    else { tone = 'good'; verdict = 'MARGEM POSITIVA'; }
    window.MarconiSeal.render('dreStatusSeal', {
      label: 'STATUS DA DRE · REGIME DE COMPETÊNCIA',
      verdict: verdict,
      tone: tone,
      metricValue: fmtPct(mLiquida),
      metricLabel: 'margem líquida (Lucro Líq. ÷ Receita Líq.)',
      desc: (resV >= 0 ? 'Lucro líquido acumulado de ' + money(resV) : 'Prejuízo acumulado de ' + money(resV)) +
        '. Margem ' + (mLiquida < 3 ? 'no fio da navalha — atenção ao peso do CMV.' : 'saudável no acumulado assinado.')
    });
  }

  // ── Faixa de margens (derivadas, base padronizada na Receita Líquida) ──
  // Cumpre o header que promete "margens": Bruta gerencial, Operacional e Líquida.
  function renderMargins(dre, filled) {
    var host = document.getElementById('dreMargins');
    if (!host) return;
    var rlV = accumOf(findLine(dre, 'receita_liquida'), filled);
    var cmvV = accumOf(findLine(dre, 'cmv'), filled);
    var resV = accumOf(findLine(dre, 'resultado'), filled);
    var despFin = accumOf(findLine(dre, 'desp_fin'), filled);
    var recFin = accumOf(findLine(dre, 'rec_fin'), filled);
    // Margem bruta gerencial = (RL − |CMV|) ÷ RL.
    var mBruta = rlV > 0 ? ((rlV - Math.abs(cmvV)) / rlV * 100) : 0;
    // Margem líquida = Resultado ÷ RL.
    var mLiquida = rlV > 0 ? (resV / rlV * 100) : 0;
    // Margem operacional = resultado ANTES do financeiro ÷ RL (resultado − rec.fin. + |desp.fin.|).
    var resOper = resV - recFin + Math.abs(despFin);
    var mOper = rlV > 0 ? (resOper / rlV * 100) : 0;

    var items = [
      { lbl: 'Margem Bruta', val: mBruta, sub: '(RL − CMV) ÷ RL · gerencial', tone: mBruta >= 0 ? 'pos' : 'neg' },
      { lbl: 'Margem Operacional', val: mOper, sub: 'antes do resultado financeiro ÷ RL', tone: mOper >= 0 ? 'pos' : 'neg' },
      { lbl: 'Margem Líquida', val: mLiquida, sub: 'Lucro Líquido ÷ RL', tone: mLiquida >= 0 ? 'pos' : 'neg' }
    ];
    var head = '<div class="dre-margins-head"><span class="dre-margins-title">MARGENS</span>' +
      '<span class="dre-margins-base">base: Receita Líquida acumulada (' + esc(money(rlV)) + ')</span></div>';
    var cards = '<div class="dre-margins-grid">' + items.map(function (it) {
      return '<div class="dre-margin-card dre-margin--' + it.tone + '">' +
        '<div class="dre-margin-lbl">' + esc(it.lbl) + '</div>' +
        '<div class="dre-margin-val ' + (it.tone === 'pos' ? 'number-green' : 'number-red') + '">' + esc(fmtPct(it.val)) + '</div>' +
        '<div class="dre-margin-sub">' + esc(it.sub) + '</div></div>';
    }).join('') + '</div>';
    host.innerHTML = head + cards;
  }

  // ── Legenda unificada / aviso de regime ──
  function renderLegend(dre, filled) {
    var host = document.getElementById('dreLegend');
    if (!host) return;
    var first = MONTH_FULL[filled[0]] || '';
    var last = MONTH_FULL[filled[filled.length - 1]] || '';
    var range = (first === last ? first : (first + '—' + last)).toUpperCase();
    host.innerHTML =
      '<span class="dre-legend-tag dre-legend-regime">REGIME DE COMPETÊNCIA · ' + esc(range) + ' ASSINADO</span>' +
      '<span class="dre-legend-item"><i class="dre-legend-swatch sw-av"></i>AV% = % da Receita Líquida</span>' +
      '<span class="dre-legend-item"><i class="dre-legend-swatch sw-diverg">Δ</i>soma dos meses ≠ acum. assinado</span>';
  }

  // ── Mini-gráfico de erosão de margem / peso do CMV (tendência mensal) ──
  // Margem líquida mensal e CMV/RL por mês, ambos derivados de dre.lines.values.
  function renderTrend(dre, filled) {
    var host = document.getElementById('dreTrend');
    if (!host) return;
    var rl = findLine(dre, 'receita_liquida');
    var cmv = findLine(dre, 'cmv');
    var res = findLine(dre, 'resultado');
    var abbr = dre.months || ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    // Só meses com Receita Líquida > 0 (evita divisão por zero / meses vazios).
    var pts = filled.filter(function (m) { return valOf(rl, m) > 0; }).map(function (m) {
      var rlv = valOf(rl, m);
      return {
        m: m,
        margem: rlv > 0 ? (valOf(res, m) / rlv * 100) : 0,
        cmvPeso: rlv > 0 ? (Math.abs(valOf(cmv, m)) / rlv * 100) : 0
      };
    });
    if (pts.length < 2) { host.innerHTML = ''; return; }

    var W = 720, H = 220, padL = 44, padR = 44, padT = 26, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = pts.length;
    function x(i) { return padL + (n === 1 ? plotW / 2 : i * plotW / (n - 1)); }
    // Eixo esquerdo: CMV/RL (0–100%). Eixo direito: margem líquida (auto, com folga).
    var maxMarg = Math.max.apply(null, pts.map(function (p) { return p.margem; }).concat([3]));
    var minMarg = Math.min.apply(null, pts.map(function (p) { return p.margem; }).concat([0]));
    var margRange = (maxMarg - minMarg) || 1;
    function yCmv(v) { return padT + plotH - (Math.min(100, v) / 100) * plotH; }
    function yMarg(v) { return padT + plotH - ((v - minMarg) / margRange) * plotH; }

    var grid = '';
    [0, 25, 50, 75, 100].forEach(function (t) {
      var yy = yCmv(t);
      grid += '<line class="dre-trend-grid" x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '"/>';
      grid += '<text class="dre-trend-axis" x="' + (padL - 8) + '" y="' + (yy + 3) + '" text-anchor="end">' + t + '%</text>';
    });
    var labels = pts.map(function (p, i) {
      return '<text class="dre-trend-xlabel" x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(abbr[p.m - 1] || ('M' + p.m)) + '</text>';
    }).join('');
    var cmvLine = pts.map(function (p, i) { return x(i) + ',' + yCmv(p.cmvPeso); }).join(' ');
    var margLine = pts.map(function (p, i) { return x(i) + ',' + yMarg(p.margem); }).join(' ');
    var cmvDots = pts.map(function (p, i) {
      return '<circle class="dre-trend-dot dot-cmv" cx="' + x(i) + '" cy="' + yCmv(p.cmvPeso) + '" r="3.5"><title>' + esc(abbr[p.m - 1]) + ' · CMV ' + esc(fmtPct(p.cmvPeso)) + ' da RL</title></circle>';
    }).join('');
    var margDots = pts.map(function (p, i) {
      return '<circle class="dre-trend-dot dot-marg" cx="' + x(i) + '" cy="' + yMarg(p.margem) + '" r="3.5"><title>' + esc(abbr[p.m - 1]) + ' · margem líquida ' + esc(fmtPct(p.margem)) + '</title></circle>';
    }).join('');
    var svg = '<svg class="dre-trend-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Tendência mensal: peso do CMV sobre a Receita Líquida e margem líquida">' +
      grid +
      '<polyline class="dre-trend-cmv" fill="none" points="' + cmvLine + '"/>' +
      '<polyline class="dre-trend-marg" fill="none" points="' + margLine + '"/>' +
      cmvDots + margDots + labels +
      '</svg>';

    // Texto automático: alerta de erosão a partir do último mês.
    var lastP = pts[pts.length - 1];
    var prevP = pts[pts.length - 2];
    var cmvUp = lastP.cmvPeso > prevP.cmvPeso;
    var margDown = lastP.margem < prevP.margem;
    var lastLbl = MONTH_FULL[lastP.m] || ('mês ' + lastP.m);
    var auto = 'O CMV consumiu <strong>' + fmtPct(lastP.cmvPeso) + '</strong> da receita líquida em <strong>' + esc(lastLbl) + '</strong>';
    if (cmvUp && margDown) {
      auto += ' — peso do custo subindo e <strong class="number-red">margem comprimindo</strong>.';
    } else if (cmvUp) {
      auto += ' — peso do custo em alta no mês.';
    } else if (margDown) {
      auto += ', com <strong class="number-red">margem líquida em queda</strong> no mês.';
    } else {
      auto += ', com margem líquida estável ou em recuperação.';
    }

    var legend = '<div class="dre-trend-legend">' +
      '<span class="dre-trend-key"><i class="sw-cmv"></i>CMV ÷ Receita Líquida</span>' +
      '<span class="dre-trend-key"><i class="sw-marg"></i>Margem líquida</span></div>';
    host.innerHTML =
      '<div class="dre-trend-head"><div class="dre-trend-title">EROSÃO DE MARGEM · CMV vs MARGEM LÍQUIDA</div>' + legend + '</div>' +
      svg +
      '<div class="dre-trend-note">' + auto + '</div>';
  }

  // ── Acesso ao fluxo de caixa (Bling) p/ a Ponte Caixa × Competência (B1) ──
  function cashData() {
    var d = window.DASHBOARD_DATA || {};
    if (d.fluxo_caixa) return d.fluxo_caixa;
    var legacy = window.__DATA__ || {};
    if (legacy.monthly) return legacy; // alias já é o fluxo_caixa
    return legacy.fluxo_caixa || null;
  }

  // ── Ponte Caixa × Competência (B1) — waterfall mês a mês ──
  // Reconcilia, em cada mês onde existem AS DUAS fontes (Jan–Abr), o RESULTADO DE CAIXA do mês
  // (Bling) até o LUCRO LÍQUIDO contábil do mês (DRE, competência), com blocos honestos:
  //   (a) Mov. Financeiras (antecip./empréstimos) — saída de caixa que NÃO é resultado;
  //   (b) Ajustes gerenciais (saídas brutas → líquidas) — já calculados em fluxo_caixa.daily;
  //   (c) Diferenças de competência / defasagem (residual) — o que sobra (compra×pagamento,
  //       venda×recebimento, diferenças de competência). Fecha exatamente no lucro contábil.
  // A decomposição fina do residual depende de saldos de balanço (estoque/recebíveis) — dado futuro.
  function computeBridge(dre) {
    var fc = cashData();
    var out = { months: [] };
    if (!fc || !fc.monthly) return out;
    // Mov. Financeiras por mês (saída embutida no resultado de caixa).
    var movByMonth = {};
    (fc.categoryMonthly || []).forEach(function (c) {
      if (c && /Mov\.\s*Financeiras/i.test(c.name || '')) {
        var mm = c.months || {};
        for (var m = 1; m <= 12; m++) { movByMonth[m] = Number(mm[m] != null ? mm[m] : mm[String(m)]) || 0; }
      }
    });
    // Ajustes gerenciais (saídas brutas − líquidas) por mês, somados do diário.
    var adjByMonth = {};
    (fc.daily || []).forEach(function (x) {
      var m = Number(x.month);
      adjByMonth[m] = (adjByMonth[m] || 0) + (Number(x.ajustesGerenciais) || 0);
    });
    var resLine = findLine(dre, 'resultado');
    // Só meses com AS DUAS fontes: DRE preenchida (monthsFilled) E fluxo realizado (não projeção).
    var bothMonths = (dre.monthsFilled || []).filter(function (m) {
      var rec = fc.monthly[m] || fc.monthly[String(m)];
      return rec && !(window.MarconiFormat && window.MarconiFormat.isProjectionMonth && window.MarconiFormat.isProjectionMonth(m));
    });
    bothMonths.forEach(function (m) {
      var rec = fc.monthly[m] || fc.monthly[String(m)];
      var caixa = Number(rec.resultado) || 0;
      var movFin = movByMonth[m] || 0;
      var ajustes = adjByMonth[m] || 0;
      var lucro = valOf(resLine, m);
      // residual = lucro − (caixa + movFin + ajustes). Fecha a ponte exatamente.
      var residual = lucro - (caixa + movFin + ajustes);
      out.months.push({ m: m, caixa: caixa, movFin: movFin, ajustes: ajustes, residual: residual, lucro: lucro });
    });
    return out;
  }

  function renderBridge(dre) {
    var host = document.getElementById('dreBridge');
    if (!host) return;
    var bridge = computeBridge(dre);
    if (!bridge.months.length) { host.innerHTML = ''; return; }

    // Seletor de mês: usa o último mês disponível por padrão.
    var months = bridge.months.map(function (b) { return b.m; });
    var sel = (host.dataset.bridgeMonth && months.indexOf(Number(host.dataset.bridgeMonth)) >= 0)
      ? Number(host.dataset.bridgeMonth) : months[months.length - 1];
    var b = bridge.months.filter(function (x) { return x.m === sel; })[0] || bridge.months[bridge.months.length - 1];

    var tabs = bridge.months.map(function (x) {
      return '<button type="button" class="dre-bridge-tab' + (x.m === b.m ? ' active' : '') +
        '" data-bridge-month="' + x.m + '">' + esc((dre.months && dre.months[x.m - 1]) || ('M' + x.m)) + '</button>';
    }).join('');

    // Blocos do waterfall, na ordem da ponte.
    var steps = [
      { key: 'start', label: 'Resultado de Caixa (Bling)', value: b.caixa, kind: 'anchor', note: 'entradas − saídas gerenciais do mês' },
      { key: 'mov', label: '+ Mov. Financeiras (antecip./empréstimos)', value: b.movFin, kind: 'delta', note: 'movimentação financeira que não é resultado da operação' },
      { key: 'adj', label: '+ Ajustes gerenciais (saídas brutas → líquidas)', value: b.ajustes, kind: 'delta', note: 'diferença bruto×líquido já calculada no diário (fluxo_caixa.daily)' },
      { key: 'res', label: '− Diferenças de competência / defasagem (residual)', value: b.residual, kind: 'delta', note: 'defasagem compra×pagamento, venda×recebimento e diferenças de competência' },
      { key: 'end', label: 'Lucro Líquido (DRE · competência)', value: b.lucro, kind: 'anchor', note: 'resultado contábil assinado do mês' }
    ];

    // Escala do waterfall: cobre do menor ao maior nível cumulativo.
    var cumul = [], running = 0;
    steps.forEach(function (s) {
      if (s.kind === 'anchor' && s.key === 'start') { running = s.value; cumul.push({ from: 0, to: running, mid: running }); }
      else if (s.kind === 'anchor') { cumul.push({ from: 0, to: s.value, mid: s.value }); }
      else { var from = running; running += s.value; cumul.push({ from: from, to: running, mid: running }); }
    });
    var allLevels = [0];
    cumul.forEach(function (c) { allLevels.push(c.from, c.to); });
    var maxL = Math.max.apply(null, allLevels);
    var minL = Math.min.apply(null, allLevels);
    var range = (maxL - minL) || 1;

    var W = 720, H = 280, padL = 12, padR = 12, padT = 18, padB = 64;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = steps.length;
    var slot = plotW / n, bw = slot * 0.56;
    function bx(i) { return padL + i * slot + (slot - bw) / 2; }
    function yOf(v) { return padT + plotH - ((v - minL) / range) * plotH; }
    var zeroY = yOf(0);

    var bars = steps.map(function (s, i) {
      var c = cumul[i];
      var top, h, cls;
      if (s.kind === 'anchor') {
        top = yOf(Math.max(0, c.to)); h = Math.abs(zeroY - yOf(c.to));
        cls = s.key === 'end' ? 'dre-wf-end' : 'dre-wf-start';
      } else {
        var hi = Math.max(c.from, c.to), lo = Math.min(c.from, c.to);
        top = yOf(hi); h = Math.abs(yOf(hi) - yOf(lo));
        cls = s.value >= 0 ? 'dre-wf-pos' : 'dre-wf-neg';
      }
      var title = s.label + ': ' + (s.value >= 0 && s.kind === 'delta' ? '+' : '') + money(s.value);
      return '<g><rect class="dre-wf-bar ' + cls + '" x="' + bx(i).toFixed(1) + '" y="' + top.toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + Math.max(2, h).toFixed(1) + '" rx="3"><title>' + esc(title) + '</title></rect>' +
        '<text class="dre-wf-val" x="' + (bx(i) + bw / 2).toFixed(1) + '" y="' + (Math.min(top, zeroY) - 6).toFixed(1) +
        '" text-anchor="middle">' + esc((s.value >= 0 && s.kind === 'delta' ? '+' : '') + (window.MarconiFormat && window.MarconiFormat.moneyShort ? window.MarconiFormat.moneyShort(s.value) : money(s.value))) + '</text></g>';
    }).join('');
    // Conectores entre topos cumulativos.
    var conns = '';
    for (var i = 0; i < n - 1; i++) {
      var yc = yOf(cumul[i].to);
      conns += '<line class="dre-wf-conn" x1="' + (bx(i) + bw).toFixed(1) + '" y1="' + yc.toFixed(1) +
        '" x2="' + bx(i + 1).toFixed(1) + '" y2="' + yc.toFixed(1) + '"/>';
    }
    var labels = steps.map(function (s, i) {
      var short = s.key === 'start' ? 'Caixa' : s.key === 'mov' ? 'Mov.Fin.' : s.key === 'adj' ? 'Ajustes' : s.key === 'res' ? 'Compet.' : 'Lucro';
      return '<text class="dre-wf-xlabel" x="' + (bx(i) + bw / 2).toFixed(1) + '" y="' + (H - 40) + '" text-anchor="middle">' + esc(short) + '</text>';
    }).join('');
    var baseLine = '<line class="dre-wf-base" x1="' + padL + '" y1="' + zeroY + '" x2="' + (W - padR) + '" y2="' + zeroY + '"/>';
    var svg = '<svg class="dre-wf-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ponte do resultado de caixa ao lucro líquido contábil do mês">' +
      baseLine + conns + bars + labels + '</svg>';

    // Lista textual auditável dos blocos.
    var rows = steps.map(function (s) {
      var vcls = s.kind === 'anchor' ? (s.value >= 0 ? 'number-gold' : 'number-red') : (s.value >= 0 ? 'number-green' : 'number-red');
      var sign = (s.value >= 0 && s.kind === 'delta') ? '+' : '';
      return '<tr class="dre-bridge-row dre-bridge-row--' + s.kind + '">' +
        '<td class="dre-bridge-lbl">' + esc(s.label) + '<span class="dre-bridge-note">' + esc(s.note) + '</span></td>' +
        '<td class="num dre-bridge-val ' + vcls + '">' + esc(sign + money(s.value)) + '</td></tr>';
    }).join('');

    var monthName = MONTH_FULL[b.m] || ('Mês ' + b.m);
    host.innerHTML =
      '<div class="dre-bridge-head"><div class="dre-bridge-title">PONTE CAIXA × COMPETÊNCIA · ' + esc(monthName.toUpperCase()) + '</div>' +
      '<div class="dre-bridge-tabs" role="tablist" aria-label="Mês da ponte">' + tabs + '</div></div>' +
      '<div class="dre-bridge-sub">“Se a DRE deu lucro, cadê o caixa?” — do <strong>resultado de caixa (Bling)</strong> ao <strong>lucro líquido contábil (competência)</strong> do mês.</div>' +
      svg +
      '<div class="dre-bridge-table-wrap"><table class="dre-bridge-table"><tbody>' + rows + '</tbody></table></div>' +
      '<div class="dre-bridge-foot"><strong>Ponte gerencial.</strong> Reconcilia exatamente o caixa do mês (regime de caixa, Bling) com o lucro contábil do mês (regime de competência, DRE assinada). ' +
      'A linha <em>“Diferenças de competência / defasagem (residual)”</em> agrega a defasagem temporal (compra×pagamento, venda×recebimento) e diferenças de competência; ' +
      'sua <strong>decomposição fina depende de saldos de balanço (estoque/recebíveis)</strong> — dado futuro da contabilidade.</div>';

    // Liga os tabs de mês.
    host.querySelectorAll('[data-bridge-month]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        host.dataset.bridgeMonth = btn.getAttribute('data-bridge-month');
        renderBridge(dre);
      });
    });
  }

  function renderTable(dre, filled) {
    var wrap = document.getElementById('dreTableWrap');
    if (!wrap) return;
    var abbr = dre.months || ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    // Margem bruta gerencial p/ a micro-nota da linha de Lucro Bruto (a DRE oficial aninha o CMV em Desp. Vendas).
    var rlAcum = accumOf(findLine(dre, 'receita_liquida'), filled);
    var cmvAcum = accumOf(findLine(dre, 'cmv'), filled);
    var margemBrutaGer = rlAcum > 0 ? ((rlAcum - Math.abs(cmvAcum)) / rlAcum * 100) : 0;
    // Análise vertical (AV%): cada linha como % da Receita Líquida acumulada (base padronizada).
    function avPct(v) { return rlAcum > 0 ? (v / rlAcum * 100) : 0; }
    // Peso do CMV sobre a RL (acum) p/ a barra proporcional inline na linha do CMV.
    var cmvWeight = rlAcum > 0 ? Math.min(100, Math.abs(cmvAcum) / rlAcum * 100) : 0;

    var head = '<thead><tr><th class="dre-th-label">Linha</th>';
    filled.forEach(function (m) { head += '<th class="num">' + esc(abbr[m - 1] || ('M' + m)) + '</th>'; });
    head += '<th class="num dre-th-total">Acum.</th>';
    head += '<th class="num dre-th-av" title="Análise vertical: cada linha como % da Receita Líquida acumulada" aria-label="Análise vertical (percentual da Receita Líquida)">AV% <small>da RL</small></th>';
    head += '</tr></thead>';

    var colCount = filled.length + 3;
    var body = '<tbody>';
    dre.lines.forEach(function (line) {
      var total = accumOf(line, filled);
      var isResult = (line.kind === 'resultado' || line.kind === 'subtotal');
      var rowCls = 'dre-row dre-row--' + line.kind + ' dre-row--l' + (line.level || 0);
      // Divergência soma(meses preenchidos) × acum assinado — sinalizar por linha quando |Δ| > R$1.
      var somaMeses = sumLine(line, filled);
      var delta = somaMeses - total;
      var hasDiverg = (typeof line.acum === 'number') && Math.abs(delta) > 1;
      var isCmv = (line.key === 'cmv');
      body += '<tr class="' + rowCls + (isCmv ? ' dre-row--cmv' : '') + '">';
      var labelHtml = esc(line.label);
      if (line.key === 'lucro_bruto') {
        var gerNote = 'Estrutura oficial: Lucro Bruto = Receita Líquida (o CMV é deduzido em “Despesas com Vendas”). Margem bruta gerencial (RL − CMV) ÷ RL ≈ ' + fmtPct(margemBrutaGer) + '.';
        labelHtml += ' <span class="dre-ger-note" title="' + esc(gerNote) + '" aria-label="' + esc(gerNote) + '">margem bruta gerencial ' + esc(fmtPct(margemBrutaGer)) + '</span>';
      }
      if (isCmv) {
        // Barra proporcional inline: o CMV consome ~86% da RL → fica claro o quanto sobra.
        var cmvNote = 'O CMV consome ' + fmtPct(cmvWeight) + ' da Receita Líquida acumulada.';
        labelHtml += ' <span class="dre-cmv-bar" role="img" title="' + esc(cmvNote) + '" aria-label="' + esc(cmvNote) + '">' +
          '<span class="dre-cmv-bar-fill" style="width:' + cmvWeight.toFixed(1) + '%"></span>' +
          '<span class="dre-cmv-bar-pct">' + esc(fmtPct(cmvWeight)) + ' da RL</span></span>';
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
      // AV% (análise vertical): % sobre a Receita Líquida acumulada.
      var av = avPct(total);
      var avTxt = (rlAcum > 0 && total) ? fmtPct(av) : '—';
      body += '<td class="num dre-td-av">' + esc(avTxt) + '</td>';
      body += '</tr>';
    });
    body += '</tbody>';

    wrap.innerHTML = '<table class="dre-table" data-col-count="' + colCount + '">' + head + body + '</table>';
  }

  function renderDrePage() {
    var dre = dreData();
    var ctx = document.getElementById('dreContext');
    var foot = document.getElementById('dreFoot');
    if (!dre || !dre.lines || !dre.lines.length) {
      var wrap = document.getElementById('dreTableWrap');
      if (wrap) wrap.innerHTML = '<div class="dre-empty">DRE contábil ainda não disponível para este período.</div>';
      ['dreKpis', 'dreMargins', 'dreTrend', 'dreBridge', 'dreLegend', 'dreStatusSeal'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.innerHTML = '';
      });
      return;
    }
    var filled = (dre.monthsFilled && dre.monthsFilled.length) ? dre.monthsFilled.slice() : [1, 2, 3, 4, 5];
    filled.sort(function (a, b) { return a - b; });

    if (ctx) {
      var first = MONTH_FULL[filled[0]] || '';
      var last = MONTH_FULL[filled[filled.length - 1]] || '';
      ctx.textContent = 'REGIME DE COMPETÊNCIA · ' + (first === last ? first : (first + '—' + last)).toUpperCase();
    }
    renderSeal(dre, filled);
    renderKpis(dre, filled);
    renderMargins(dre, filled);
    renderTrend(dre, filled);
    renderBridge(dre);
    renderLegend(dre, filled);
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
