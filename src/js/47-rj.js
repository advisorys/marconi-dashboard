/* Página RJ — Recuperação Judicial (Onda 3 do ROADMAP-RELATORIOS).
   A Marconi Foods está EM RECUPERAÇÃO JUDICIAL (consta no CNPJ da DRE).
   TUDO aqui é DERIVADO em runtime dos dados já existentes (custos_fixos.items,
   fluxo_caixa.monthly + categoryMonthly, fluxo_caixa.reconciliation) — nada de
   número inventado, nada de seção nova no JSON.
   Some uma camada via decorator de window.__baseSetDashboardPage (igual ao 45-dre),
   ANTES de 50-ux-patches capturar a base. */
(function () {
  'use strict';

  var MONTH_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // ── Rubricas do PROCESSO de Recuperação Judicial (auditável) ──
  // Classificação CONSERVADORA: só entram rubricas inequivocamente ligadas ao
  // processo (administrador judicial, jurídico, consultoria do plano, contábil).
  // Nomes batidos 1:1 contra data/financeiro.json (custos_fixos.items[].name).
  var RJ_RUBRICS = [
    { name: 'Honorários advocatícios-AJ', role: 'Administrador judicial (honorários do AJ)' },
    { name: 'Honorários consultoria', role: 'Consultoria do plano de recuperação' },
    { name: 'Despesas Consultoria - Reembolso', role: 'Reembolso de despesas da consultoria' },
    { name: 'Honorários advocatícios', role: 'Honorários advocatícios do processo' },
    { name: 'Honorários contábeis', role: 'Honorários contábeis do processo' }
  ];
  // Rubricas avaliadas e DELIBERADAMENTE não classificadas como RJ (registro de auditoria).
  // "Honorários TI" é operacional (não jurídico do plano) → fica em estrutura operacional.
  var RJ_EXCLUDED_NOTE = 'Honorários TI tratado como estrutura operacional (suporte, não jurídico do plano).';

  function fmt() { return (window.MarconiFormat) || {}; }
  function esc(s) { var f = fmt(); return f.escapeHtml ? f.escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }
  function money(v) { var f = fmt(); return f.moneyFull ? f.moneyFull(v) : 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR'); }
  function moneyShort(v) { var f = fmt(); return f.moneyShort ? f.moneyShort(v) : money(v); }
  function fmtPct(v) {
    var f = fmt();
    if (f.pct) return f.pct(v);
    return (Math.round((v || 0) * 10) / 10).toLocaleString('pt-BR') + '%';
  }

  function rootData() { return window.DASHBOARD_DATA || window.__DATA__ || {}; }
  function fixedData() { var d = rootData(); return d.custos_fixos || null; }
  function cashData() {
    // __DATA__ pode apontar pro fluxo_caixa (alias legado); DASHBOARD_DATA.fluxo_caixa é canônico.
    var d = window.DASHBOARD_DATA || {};
    if (d.fluxo_caixa) return d.fluxo_caixa;
    var legacy = window.__DATA__ || {};
    if (legacy.monthly) return legacy; // alias já é o fluxo_caixa
    return legacy.fluxo_caixa || null;
  }

  // Selo realizado/parcial/projeção (helpers data-driven da Onda 1).
  function isProjection(m) { var f = fmt(); return f.isProjectionMonth ? f.isProjectionMonth(m) : (m >= 7); }
  function isPartial(m) { var f = fmt(); return f.isPartialMonth ? f.isPartialMonth(m) : false; }

  // Soma o realizado (índice 1 = real) de uma rubrica por nome.
  function realizedOfItem(item) {
    var s = 0;
    (item.months || []).forEach(function (m) { s += Number(m && m[1]) || 0; });
    return s;
  }

  // ── Custo da RJ (A2): isola as rubricas do processo, soma o realizado ──
  function computeRjCost() {
    var fixed = fixedData();
    var out = { rubrics: [], rjTotal: 0, fixedTotal: 0, opTotal: 0, pct: 0 };
    if (!fixed || !Array.isArray(fixed.items)) return out;
    var byName = {};
    fixed.items.forEach(function (it) {
      var real = realizedOfItem(it);
      out.fixedTotal += real;
      byName[it.name] = (byName[it.name] || 0) + real;
    });
    RJ_RUBRICS.forEach(function (r) {
      var v = byName[r.name] || 0;
      out.rubrics.push({ name: r.name, role: r.role, value: v });
      out.rjTotal += v;
    });
    out.opTotal = out.fixedTotal - out.rjTotal;
    out.pct = out.fixedTotal > 0 ? (out.rjTotal / out.fixedTotal * 100) : 0;
    return out;
  }

  // ── Geração de caixa operacional limpa (A1, parcial) ──
  // = resultado de caixa do mês EXCLUINDO "Mov. Financeiras (antecip./empréstimos)"
  //   (saída já presente em categoryMonthly). Como Mov. Financeiras é uma SAÍDA
  //   embutida no resultado, "excluir" = somar de volta → caixa antes do serviço
  //   de dívida/antecipação. Mostra o caixa "limpo" da operação.
  function computeOpCash() {
    var fc = cashData();
    var out = { series: [], accum: 0, hasPartial: false, lastRealized: 0 };
    if (!fc || !fc.monthly) return out;
    var movByMonth = {};
    (fc.categoryMonthly || []).forEach(function (c) {
      if (c && /Mov\.\s*Financeiras/i.test(c.name || '')) {
        var mm = c.months || {};
        for (var m = 1; m <= 12; m++) { movByMonth[m] = Number(mm[m] != null ? mm[m] : mm[String(m)]) || 0; }
      }
    });
    for (var m = 1; m <= 12; m++) {
      if (isProjection(m)) continue; // só realizado/parcial (Jul–Dez = 0/projeção)
      var rec = fc.monthly[m] || fc.monthly[String(m)];
      if (!rec) continue;
      var resultado = Number(rec.resultado) || 0;
      var mov = movByMonth[m] || 0;
      var opGen = resultado + mov; // exclui a saída financeira
      var partial = isPartial(m);
      out.series.push({ m: m, resultado: resultado, mov: mov, opGen: opGen, partial: partial });
      out.accum += opGen;
      if (partial) out.hasPartial = true; else out.lastRealized = m;
    }
    return out;
  }

  // ── Posição de caixa + runway (estimativa gerencial) ──
  // Lê o saldo de caixa que o importador agora expõe:
  //   fluxo_caixa.saldoInicial (abertura 01/01) e monthly[m].saldoFinal/grossLiquido.
  // Saldo atual = saldoFinal do ÚLTIMO mês realizado/parcial disponível.
  // Burn = consumo médio mensal de caixa (grossLiquido) nos meses fechados.
  //   Convenção defensável: média do grossLiquido dos meses FECHADOS (exclui o parcial,
  //   ainda em andamento). Se essa média for ≥ 0, o caixa está estável/crescendo →
  //   runway não-limitante (não inventamos "infinito").
  function computeCashPosition() {
    var fc = cashData();
    var out = {
      ok: false, saldoInicial: 0, saldoAtual: 0, lastMonth: 0, lastPartial: false,
      series: [], burnAvg: 0, burnMonths: 0, avgGen: 0, closedMonths: 0,
      runwayMonths: null, stable: false
    };
    if (!fc || !fc.monthly) return out;
    var si = Number(fc.saldoInicial);
    out.saldoInicial = Number.isFinite(si) ? si : 0;

    var closedGross = [];
    for (var m = 1; m <= 12; m++) {
      var rec = fc.monthly[m] || fc.monthly[String(m)];
      if (!rec) continue;
      var saldo = rec.saldoFinal;
      var hasSaldo = (saldo != null && Number.isFinite(Number(saldo)));
      var gross = Number(rec.grossLiquido) || 0;
      var partial = isPartial(m);
      var realized = !isProjection(m); // realizado ou parcial
      if (!realized || !hasSaldo) continue;
      out.series.push({ m: m, saldoFinal: Number(saldo), gross: gross, partial: partial });
      out.saldoAtual = Number(saldo);
      out.lastMonth = m;
      out.lastPartial = partial;
      if (!partial) { closedGross.push(gross); out.closedMonths++; }
    }
    if (!out.series.length) return out;
    out.ok = true;

    // Geração média mensal (todos os meses fechados — base honesta p/ "estável vs queima").
    if (closedGross.length) {
      var sum = closedGross.reduce(function (a, b) { return a + b; }, 0);
      out.avgGen = sum / closedGross.length;
    }
    // Burn = média dos meses fechados de QUEIMA (grossLiquido < 0), em módulo.
    var burns = closedGross.filter(function (g) { return g < 0; }).map(function (g) { return -g; });
    out.burnMonths = burns.length;
    out.burnAvg = burns.length ? burns.reduce(function (a, b) { return a + b; }, 0) / burns.length : 0;

    // Runway: só faz sentido se a geração média é negativa (caixa caindo no agregado).
    if (out.avgGen < 0) {
      var monthlyBurn = -out.avgGen; // consumo médio agregado
      out.runwayMonths = monthlyBurn > 0 ? (out.saldoAtual / monthlyBurn) : null;
      out.stable = false;
    } else {
      out.stable = true; // caixa estável/crescendo no período → runway não-limitante
      out.runwayMonths = null;
    }
    return out;
  }

  // ── Reconciliação (governança) ──
  function computeRecon() {
    var fc = cashData();
    var out = { months: 0, divergences: 0, semClassif: 0, semClassifCount: 15 };
    if (fc && Array.isArray(fc.reconciliation)) {
      fc.reconciliation.forEach(function (r) {
        out.months++;
        if (Math.abs(Number(r.entradasDiff) || 0) > 0.01 || Math.abs(Number(r.saidasDiff) || 0) > 0.01) out.divergences++;
      });
    }
    // "Sem classificação" — lançamentos do Bling ainda a categorizar.
    (fc && fc.categories || []).forEach(function (c) {
      if (/Sem\s*classifica/i.test(c.name || '')) out.semClassif += Number(c.value != null ? c.value : 0) || 0;
    });
    return out;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: faixa de RJ (A3)
  // ─────────────────────────────────────────────────────────────────────────
  function renderBanner(op) {
    var host = document.getElementById('rjBanner');
    if (!host) return;
    var rangeLbl = '';
    if (op.series.length) {
      var first = MONTH_FULL[op.series[0].m] || '';
      var lastEntry = op.series[op.series.length - 1];
      var last = MONTH_FULL[lastEntry.m] || '';
      rangeLbl = (first === last ? first : (first + '—' + last)).toUpperCase();
      if (lastEntry.partial) rangeLbl += ' (parcial)';
    }
    var accCls = op.accum >= 0 ? 'number-green' : 'number-red';
    host.innerHTML =
      '<span class="rj-banner-flag">EM RECUPERAÇÃO JUDICIAL</span>' +
      '<span class="rj-banner-sep" aria-hidden="true"></span>' +
      '<span class="rj-banner-metric"><span class="rj-banner-metric-val ' + accCls + '">' + esc((op.accum >= 0 ? '+' : '') + money(op.accum)) + '</span>' +
      '<span class="rj-banner-metric-lbl">caixa operacional gerado (acum. ' + esc(rangeLbl || 'do período') + ')</span></span>' +
      '<span class="rj-banner-tag">ESTIMATIVA GERENCIAL · não é plano homologado</span>';
  }

  // Selo de status (A3) — número-chave = caixa operacional gerado acumulado.
  function renderSeal(op, rj) {
    if (!window.MarconiSeal) return;
    var tone, verdict;
    if (op.accum < 0) { tone = 'risk'; verdict = 'QUEIMA DE CAIXA'; }
    else if (op.accum < 300000) { tone = 'watch'; verdict = 'GERAÇÃO MAGRA'; }
    else { tone = 'good'; verdict = 'OPERAÇÃO GERA CAIXA'; }
    window.MarconiSeal.render('rjStatusSeal', {
      label: 'STATUS DA RECUPERAÇÃO JUDICIAL · GERENCIAL',
      verdict: verdict,
      tone: tone,
      metricValue: (op.accum >= 0 ? '+' : '') + money(op.accum),
      metricLabel: 'caixa operacional gerado acumulado (exclui antecipações/empréstimos)',
      desc: 'A operação ' + (op.accum >= 0 ? 'gerou' : 'consumiu') + ' caixa próprio no período; o maior peso fixo é o jurídico do plano (' +
        fmtPct(rj.pct) + ' do custo fixo realizado = ' + money(rj.rjTotal) + '). Estimativa gerencial, não plano homologado.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: KPIs (geração acumulada, custo da RJ, estrutura pura, runway)
  // ─────────────────────────────────────────────────────────────────────────
  function renderKpis(op, rj, cash) {
    var host = document.getElementById('rjKpis');
    if (!host) return;
    var accCls = op.accum >= 0 ? 'number-green' : 'number-red';

    // KPI Runway — agora LIVE (saldo de caixa real do importador).
    var runwayCard;
    if (cash && cash.ok) {
      var saldoCls = cash.saldoAtual >= 0 ? 'number-gold' : 'number-red';
      var lastLbl = (MONTH_ABBR[cash.lastMonth - 1] || ('M' + cash.lastMonth)) + (cash.lastPartial ? ' (parcial)' : '');
      var runwayVal, runwaySub;
      if (cash.stable) {
        runwayVal = 'Caixa estável';
        runwaySub = 'geração média ≥ 0 no período — sem queima (runway não-limitante)';
      } else if (cash.runwayMonths != null && Number.isFinite(cash.runwayMonths)) {
        var meses = cash.runwayMonths;
        runwayVal = (Math.round(meses * 10) / 10).toLocaleString('pt-BR') + ' meses';
        runwaySub = 'saldo ' + moneyShort(cash.saldoAtual) + ' ÷ queima média ' + moneyShort(-cash.avgGen) + '/mês';
      } else {
        runwayVal = 'estável';
        runwaySub = 'sem queima média no período';
      }
      runwayCard = {
        lbl: 'Saldo de Caixa · Runway',
        val: money(cash.saldoAtual),
        cls: saldoCls,
        sub: 'saldo em ' + lastLbl + ' · ' + runwayVal,
        runwaySub: runwaySub
      };
    } else {
      runwayCard = {
        lbl: 'Saldo de Caixa · Runway',
        val: 'indisponível',
        cls: 'rj-kpi-blocked',
        sub: 'saldo de caixa ausente no dado'
      };
    }

    var cards = [
      {
        lbl: 'Caixa Operacional Gerado',
        val: (op.accum >= 0 ? '+' : '') + money(op.accum),
        cls: accCls,
        sub: 'acumulado · exclui Mov. Financeiras (antecip./empréstimos)'
      },
      {
        lbl: 'Custo da Recuperação Judicial',
        val: money(rj.rjTotal),
        cls: 'number-red',
        sub: fmtPct(rj.pct) + ' de todo o custo fixo realizado'
      },
      {
        lbl: 'Estrutura Operacional Pura',
        val: money(rj.opTotal),
        cls: 'number-gold',
        sub: fmtPct(100 - rj.pct) + ' do custo fixo · operação enxuta'
      },
      runwayCard
    ];
    host.innerHTML = cards.map(function (c) {
      var blocked = c.cls === 'rj-kpi-blocked';
      return '<div class="rj-kpi' + (blocked ? ' rj-kpi--blocked' : '') + '">' +
        '<div class="lbl">' + esc(c.lbl) + '</div>' +
        '<div class="val ' + esc(c.cls) + '">' + esc(c.val) + '</div>' +
        '<div class="sub">' + esc(c.sub) +
        (c.runwaySub ? '<span class="rj-kpi-sub2">' + esc(c.runwaySub) + '</span>' : '') +
        '</div></div>';
    }).join('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: bloco "Custo da Recuperação Judicial" (A2) com auditoria
  // ─────────────────────────────────────────────────────────────────────────
  function renderRjCost(rj) {
    var host = document.getElementById('rjCostBlock');
    if (!host) return;
    if (!rj.rubrics.length || rj.fixedTotal <= 0) { host.innerHTML = ''; return; }

    // Barra comparativa Custo da RJ × Estrutura operacional pura.
    var rjPct = rj.pct;
    var opPct = 100 - rj.pct;
    var bar =
      '<div class="rj-split-bar" role="img" aria-label="Custo da RJ ' + esc(fmtPct(rjPct)) + ' e estrutura operacional pura ' + esc(fmtPct(opPct)) + ' do custo fixo realizado">' +
      '<span class="rj-split-rj" style="width:' + rjPct.toFixed(1) + '%"><span class="rj-split-cap">RJ ' + esc(fmtPct(rjPct)) + '</span></span>' +
      '<span class="rj-split-op" style="width:' + opPct.toFixed(1) + '%"><span class="rj-split-cap">Operação ' + esc(fmtPct(opPct)) + '</span></span>' +
      '</div>';

    var rows = rj.rubrics.map(function (r) {
      var pctOfRj = rj.rjTotal > 0 ? (r.value / rj.rjTotal * 100) : 0;
      return '<tr class="rj-cost-row">' +
        '<td class="rj-cost-name">' + esc(r.name) + '<span class="rj-cost-role">' + esc(r.role) + '</span></td>' +
        '<td class="num rj-cost-val number-red">' + esc(money(r.value)) + '</td>' +
        '<td class="num rj-cost-pct">' + esc(fmtPct(pctOfRj)) + '</td>' +
        '</tr>';
    }).join('');
    var foot =
      '<tr class="rj-cost-total"><td class="rj-cost-name">Total classificado como RJ</td>' +
      '<td class="num rj-cost-val number-red">' + esc(money(rj.rjTotal)) + '</td>' +
      '<td class="num rj-cost-pct">' + esc(fmtPct(rj.pct)) + ' do CF</td></tr>' +
      '<tr class="rj-cost-op"><td class="rj-cost-name">Estrutura operacional pura (resto)</td>' +
      '<td class="num rj-cost-val number-gold">' + esc(money(rj.opTotal)) + '</td>' +
      '<td class="num rj-cost-pct">' + esc(fmtPct(100 - rj.pct)) + ' do CF</td></tr>' +
      '<tr class="rj-cost-grand"><td class="rj-cost-name">Custo fixo realizado total</td>' +
      '<td class="num rj-cost-val">' + esc(money(rj.fixedTotal)) + '</td>' +
      '<td class="num rj-cost-pct">100%</td></tr>';

    host.innerHTML =
      '<div class="rj-card-head"><div class="rj-card-title">CUSTO DA RECUPERAÇÃO JUDICIAL</div>' +
      '<div class="rj-card-sub">A operação é enxuta — o peso do custo fixo é o jurídico do plano.</div></div>' +
      bar +
      '<div class="rj-cost-table-wrap"><table class="rj-cost-table"><thead><tr>' +
      '<th class="rj-cost-th-name">Rubrica classificada como RJ</th>' +
      '<th class="num">Realizado</th>' +
      '<th class="num">% do custo da RJ</th>' +
      '</tr></thead><tbody>' + rows + foot + '</tbody></table></div>' +
      '<div class="rj-audit-note"><strong>Auditabilidade:</strong> as ' + rj.rubrics.length +
      ' rubricas acima foram classificadas como custo do processo de RJ (somadas pelo realizado de custos_fixos.items). ' +
      'Classificação conservadora: ' + esc(RJ_EXCLUDED_NOTE) + '</div>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: mini-gráfico de geração de caixa operacional mensal (A1)
  // ─────────────────────────────────────────────────────────────────────────
  function renderOpChart(op) {
    var host = document.getElementById('rjOpChart');
    if (!host) return;
    if (!op.series.length) { host.innerHTML = ''; return; }

    var W = 720, H = 240, padL = 56, padR = 20, padT = 22, padB = 38;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = op.series.length;
    var vals = op.series.map(function (s) { return s.opGen; });
    var maxV = Math.max.apply(null, vals.concat([0]));
    var minV = Math.min.apply(null, vals.concat([0]));
    var range = (maxV - minV) || 1;
    function y(v) { return padT + plotH - ((v - minV) / range) * plotH; }
    var zeroY = y(0);
    var bw = plotW / n * 0.6;
    function bx(i) { return padL + (i + 0.5) * (plotW / n) - bw / 2; }

    var grid = '<line class="rj-chart-zero" x1="' + padL + '" y1="' + zeroY + '" x2="' + (W - padR) + '" y2="' + zeroY + '"/>';
    var bars = op.series.map(function (s, i) {
      var top = s.opGen >= 0 ? y(s.opGen) : zeroY;
      var h = Math.abs(zeroY - y(s.opGen));
      var cls = s.opGen >= 0 ? 'rj-bar-pos' : 'rj-bar-neg';
      if (s.partial) cls += ' rj-bar-partial';
      var title = (MONTH_FULL[s.m] || ('Mês ' + s.m)) + (s.partial ? ' (parcial)' : '') +
        ' · gerou ' + (s.opGen >= 0 ? '+' : '') + money(s.opGen) +
        ' (resultado ' + (s.resultado >= 0 ? '+' : '') + moneyShort(s.resultado) +
        (s.mov ? ' + Mov.Fin. ' + moneyShort(s.mov) : '') + ')';
      return '<g><rect class="rj-bar ' + cls + '" x="' + bx(i).toFixed(1) + '" y="' + Math.min(top, zeroY).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, h).toFixed(1) + '" rx="3"><title>' + esc(title) + '</title></rect></g>';
    }).join('');
    var labels = op.series.map(function (s, i) {
      var cx = padL + (i + 0.5) * (plotW / n);
      var lbl = (MONTH_ABBR[s.m - 1] || ('M' + s.m)) + (s.partial ? '*' : '');
      return '<text class="rj-chart-xlabel" x="' + cx.toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle">' + esc(lbl) + '</text>';
    }).join('');
    // Rótulos de eixo (min/0/max).
    var axis = '';
    [minV, 0, maxV].forEach(function (t) {
      var yy = y(t);
      axis += '<text class="rj-chart-axis" x="' + (padL - 8) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end">' + esc(moneyShort(t)) + '</text>';
    });
    var svg = '<svg class="rj-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Geração de caixa operacional mensal, excluindo antecipações e empréstimos">' +
      grid + axis + bars + labels + '</svg>';

    var partialNote = op.hasPartial ? ' <span class="rj-chart-partial-key">* mês parcial (em andamento)</span>' : '';
    host.innerHTML =
      '<div class="rj-card-head"><div class="rj-card-title">GERAÇÃO DE CAIXA OPERACIONAL · MENSAL</div>' +
      '<div class="rj-card-sub">Resultado de caixa por mês <strong>excluindo</strong> Mov. Financeiras (antecip./empréstimos) — o caixa “limpo” da operação.' + partialNote + '</div></div>' +
      svg;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: card Runway (LIVE) — saldo atual, evolução do saldo, runway/status
  // ─────────────────────────────────────────────────────────────────────────
  function renderRunway(cash) {
    var host = document.getElementById('rjRunway');
    if (!host) return;
    if (!cash || !cash.ok || !cash.series.length) {
      host.innerHTML =
        '<div class="rj-card-head"><div class="rj-card-title">RUNWAY</div>' +
        '<div class="rj-card-sub rj-blocked-tag">SALDO INDISPONÍVEL</div></div>' +
        '<div class="rj-runway-body"><div class="rj-runway-msg">Saldo de caixa ausente no dado deste período.</div></div>';
      return;
    }

    // Mini-série de saldoFinal a partir da abertura (226.315,50).
    var pts = [{ m: 0, saldo: cash.saldoInicial, partial: false }].concat(
      cash.series.map(function (s) { return { m: s.m, saldo: s.saldoFinal, partial: s.partial }; })
    );
    var W = 320, H = 96, padL = 8, padR = 8, padT = 14, padB = 18;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = pts.length;
    var vals = pts.map(function (p) { return p.saldo; });
    var maxV = Math.max.apply(null, vals);
    var minV = Math.min.apply(null, vals.concat([0]));
    var range = (maxV - minV) || 1;
    function x(i) { return padL + (n === 1 ? plotW / 2 : i * plotW / (n - 1)); }
    function y(v) { return padT + plotH - ((v - minV) / range) * plotH; }
    var line = pts.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.saldo).toFixed(1); }).join(' ');
    var area = 'M' + x(0).toFixed(1) + ',' + y(minV).toFixed(1) + ' L' +
      pts.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.saldo).toFixed(1); }).join(' L') +
      ' L' + x(n - 1).toFixed(1) + ',' + y(minV).toFixed(1) + ' Z';
    var dots = pts.map(function (p, i) {
      if (i === 0) return ''; // abertura sem rótulo de mês
      var lbl = (MONTH_ABBR[p.m - 1] || ('M' + p.m)) + (p.partial ? ' (parcial)' : '');
      return '<circle class="rj-spark-dot' + (p.partial ? ' rj-spark-partial' : '') + '" cx="' + x(i).toFixed(1) + '" cy="' + y(p.saldo).toFixed(1) +
        '" r="3"><title>' + esc(lbl + ' · saldo ' + money(p.saldo)) + '</title></circle>';
    }).join('');
    var spark = '<svg class="rj-spark-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Evolução do saldo de caixa desde a abertura">' +
      '<path class="rj-spark-area" d="' + area + '"/>' +
      '<polyline class="rj-spark-line" fill="none" points="' + line + '"/>' + dots + '</svg>';

    // Status / runway.
    var lastLbl = (MONTH_FULL[cash.lastMonth] || ('Mês ' + cash.lastMonth)) + (cash.lastPartial ? ' (parcial)' : '');
    var statusBlock;
    if (cash.stable) {
      statusBlock =
        '<div class="rj-runway-status rj-runway-stable">' +
        '<span class="rj-runway-status-val">Caixa estável</span>' +
        '<span class="rj-runway-status-lbl">geração média ' + (cash.avgGen >= 0 ? '+' : '') + money(cash.avgGen) + '/mês nos meses fechados — sem queima média (runway não-limitante)</span></div>';
    } else if (cash.runwayMonths != null && Number.isFinite(cash.runwayMonths)) {
      var meses = Math.round(cash.runwayMonths * 10) / 10;
      var rwCls = meses < 6 ? 'rj-runway-tight' : 'rj-runway-ok';
      statusBlock =
        '<div class="rj-runway-status ' + rwCls + '">' +
        '<span class="rj-runway-status-val">' + esc(meses.toLocaleString('pt-BR')) + ' meses</span>' +
        '<span class="rj-runway-status-lbl">saldo ' + esc(money(cash.saldoAtual)) + ' ÷ queima média ' + esc(money(-cash.avgGen)) + '/mês</span></div>';
    } else {
      statusBlock =
        '<div class="rj-runway-status rj-runway-stable"><span class="rj-runway-status-val">Caixa estável</span>' +
        '<span class="rj-runway-status-lbl">sem queima média no período fechado</span></div>';
    }

    host.innerHTML =
      '<div class="rj-card-head"><div class="rj-card-title">RUNWAY</div>' +
      '<div class="rj-card-sub rj-runway-est-tag">ESTIMATIVA GERENCIAL</div></div>' +
      '<div class="rj-runway-body">' +
      '<div class="rj-runway-saldo"><span class="rj-runway-saldo-val ' + (cash.saldoAtual >= 0 ? 'number-gold' : 'number-red') + '">' + esc(money(cash.saldoAtual)) + '</span>' +
      '<span class="rj-runway-saldo-lbl">saldo de caixa em ' + esc(lastLbl) + '</span></div>' +
      spark +
      '<div class="rj-runway-spark-cap">evolução desde a abertura (' + esc(money(cash.saldoInicial)) + ' em jan/2026)</div>' +
      statusBlock +
      '<div class="rj-runway-honest">Caixa apertado para o porte: <strong>' + esc(moneyShort(cash.saldoAtual)) + '</strong> de saldo numa empresa de ~R$ 20M de receita. ' +
      'Estimativa gerencial — não é plano de recuperação homologado.</div>' +
      '</div>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: selo de reconciliação (governança)
  // ─────────────────────────────────────────────────────────────────────────
  function renderRecon(recon) {
    var host = document.getElementById('rjRecon');
    if (!host) return;
    var ok = recon.divergences === 0 && recon.months > 0;
    host.innerHTML =
      '<div class="rj-recon-seal' + (ok ? ' rj-recon-ok' : ' rj-recon-warn') + '" role="status">' +
      '<span class="rj-recon-icon" aria-hidden="true">' + (ok ? '✓' : '!') + '</span>' +
      '<span class="rj-recon-text"><strong>Fonte reconciliada · ' + recon.divergences + ' divergência' + (recon.divergences === 1 ? '' : 's') + '</strong>' +
      '<span class="rj-recon-sub">O caixa diário concilia com o mensal em ' + recon.months + ' meses (Bling vs controle).</span></span>' +
      '</div>' +
      '<div class="rj-recon-pending">Pendência de governança: <strong>' + recon.semClassifCount + ' lançamentos “Sem classificação”</strong> (' +
      esc(money(recon.semClassif)) + ') ainda a categorizar pela consultoria.</div>';
  }

  function renderRjPage() {
    var fixed = fixedData();
    var fc = cashData();
    var foot = document.getElementById('rjFoot');
    if (!fixed || !Array.isArray(fixed.items) || !fc || !fc.monthly) {
      ['rjBanner', 'rjStatusSeal', 'rjKpis', 'rjCostBlock', 'rjOpChart', 'rjRunway', 'rjRecon'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.innerHTML = '';
      });
      var wrap = document.getElementById('rjCostBlock');
      if (wrap) wrap.innerHTML = '<div class="rj-empty">Dados de Recuperação Judicial indisponíveis para este período.</div>';
      return;
    }
    var rj = computeRjCost();
    var op = computeOpCash();
    var cash = computeCashPosition();
    var recon = computeRecon();

    renderBanner(op);
    renderSeal(op, rj);
    renderKpis(op, rj, cash);
    renderRjCost(rj);
    renderOpChart(op);
    renderRunway(cash);
    renderRecon(recon);

    if (foot) {
      foot.innerHTML =
        'Camada de Recuperação Judicial — todos os valores são <strong>derivados em runtime</strong> dos dados já publicados ' +
        '(custos fixos da consultoria + fluxo de caixa Bling), sem número inventado. As estimativas são <strong>gerenciais</strong>, ' +
        'não constituem plano de recuperação homologado. Caixa em regime de competência fica na DRE; aqui é caixa Bling.';
    }
  }
  window.renderRjPage = renderRjPage;

  function maybeRenderRj(page) {
    if (page === 'rj') {
      try { renderRjPage(); } catch (e) { console.error('Erro RJ:', e); }
    }
  }

  // Hook primário: envolve a base ANTES de 50-ux-patches capturá-la (igual ao 45-dre).
  var base = window.__baseSetDashboardPage;
  if (typeof base === 'function' && !base.__rjWrapped) {
    var wrapped = function (page) {
      var out = base.apply(this, arguments);
      maybeRenderRj(page);
      return out;
    };
    wrapped.__rjWrapped = true;
    // preserva flags de outros decorators (ex.: __dreWrapped) que já tenham passado.
    if (base.__dreWrapped) wrapped.__dreWrapped = true;
    window.__baseSetDashboardPage = wrapped;
  }

  // Backup idempotente: evento de troca de página.
  if (window.MarconiEvents && window.MarconiEvents.on) {
    window.MarconiEvents.on('page:changed', function (e) {
      maybeRenderRj(e && e.detail && e.detail.to);
    });
  }

  // Render inicial se a página já abrir na RJ.
  if (window.onDashboardReady) {
    window.onDashboardReady(function () {
      if (document.body && document.body.dataset.page === 'rj') renderRjPage();
    });
  }
})();
