/* ============================================================
   60-cinema.js — Modo Cinema executivo (v4 · chart-forward)
   Deck de apresentação para diretoria / painel de sala (loop ambiente).
   - SOMENTE meses REALIZADOS (sem projeção) — trava em Jan–Jun.
   - Deck movido a GRÁFICOS VIVOS (linha que desenha, cascata, pulso diário,
     rosca multi-segmento, heatmap, sparkline). Pouco texto/número solto.
   - Slide-do-momento: contador de volta rotaciona categoria/mês a cada ciclo,
     cada um com seu micro-gráfico animado.
   Lê helpers globais: aggregate, getCategoryBreakdown, getCategoryByName,
   monthCategoryBreakdown, getMonthCriticalReading, MarconiFormat
   (window.__DATA__.daily/categoryMonthly/monthly, window.__META__).
   ============================================================ */
(function () {
  'use strict';

  var MF = window.MarconiFormat || {};
  function money(v) { return MF.moneyShort ? MF.moneyShort(v) : ('R$ ' + Math.round(v)); }
  function moneyFull(v) { return MF.moneyFull ? MF.moneyFull(v) : ('R$ ' + Math.round(v)); }
  function pct(v) { return MF.pct ? MF.pct(v) : (v.toFixed(1) + '%'); }
  function esc(s) { return MF.escapeHtml ? MF.escapeHtml(String(s)) : String(s); }

  var MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var MONTHS_LONG = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  // paleta de segmentos (tokens theme-aware) p/ rosca multi e heatmap
  var SEG = ['var(--gold)', 'var(--indigo)', 'var(--cyan)', 'var(--green)', 'var(--gold-l)'];

  var AUTOPLAY_MS = 10000;

  var state = { idx: 0, cycle: 0, playing: false, timer: null, raf: [], timebarRaf: null, built: false };

  function token(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  // =========================================================
  //  COLETA DE DADOS — SOMENTE REALIZADO (sem projeção)
  // =========================================================
  function realizedMonths() {
    var all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    try {
      var dm = window.__DATA__ && window.__DATA__.monthly;
      if (dm) {
        var r = all.filter(function (m) { return dm[m] && !dm[m].projection; });
        if (r.length) return r;
      }
    } catch (e) {}
    return [1, 2, 3, 4, 5, 6];
  }

  function lastUpdateStamp() {
    try {
      var raw = window.__META__ && window.__META__.ultima_atualizacao;
      if (raw) {
        var dt = new Date(raw);
        if (!isNaN(dt.getTime())) return dt.toLocaleDateString('pt-BR');
      }
    } catch (e) {}
    return '';
  }

  function gather() {
    var months = realizedMonths();
    var agg = (typeof aggregate === 'function') ? aggregate(months) : { entradas: 0, saidas: 0, resultado: 0, margem: 0 };
    var cats = (typeof getCategoryBreakdown === 'function') ? getCategoryBreakdown(months) : [];
    var series = months.map(function (m) {
      var a = (typeof aggregate === 'function') ? aggregate([m]) : { entradas: 0, saidas: 0, resultado: 0 };
      return { m: m, entradas: a.entradas, saidas: a.saidas, resultado: a.resultado };
    });
    var best = series.slice().sort(function (a, b) { return b.resultado - a.resultado; })[0] || { m: months[0], resultado: 0 };
    var worst = series.slice().sort(function (a, b) { return a.resultado - b.resultado; })[0] || { m: months[0], resultado: 0 };
    var deficits = series.filter(function (s) { return s.resultado < 0; });
    var first = months[0], last = months[months.length - 1];
    var label = 'Realizado · ' + MONTHS[first] + '–' + MONTHS[last] + ' 2026';
    return { months: months, agg: agg, cats: cats, series: series, best: best, worst: worst, deficits: deficits, label: label, stamp: lastUpdateStamp() };
  }

  // =========================================================
  //  GRÁFICOS (SVG/HTML; animados; só dados reais realizados)
  // =========================================================
  function svgPath(pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  }

  // Linha de tendência do RESULTADO — o traço que desenha + pontos que pipocam.
  function chartLine(d) {
    var s = d.series;
    if (!s.length) return '';
    var w = 820, h = 300, padL = 18, padR = 18, padB = 40, padT = 22;
    var vals = s.map(function (x) { return x.resultado; });
    var max = Math.max.apply(null, vals.concat([1]));
    var min = Math.min.apply(null, vals.concat([0]));
    var range = (max - min) || 1;
    var stepX = (w - padL - padR) / Math.max(1, s.length - 1);
    var pts = s.map(function (x, i) {
      return [padL + i * stepX, padT + (1 - (x.resultado - min) / range) * (h - padT - padB)];
    });
    var dPath = svgPath(pts);
    var zeroY = padT + (1 - (0 - min) / range) * (h - padT - padB);
    var svg = '<svg class="cine-svg cine-line" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<line x1="' + padL + '" y1="' + zeroY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + zeroY.toFixed(1) + '" class="cine-zero"/>';
    var area = 'M' + pts[0][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' ' + dPath.replace(/^M/, 'L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' Z';
    svg += '<path class="cine-line-area" d="' + area + '"/>';
    svg += '<path class="cine-line-path" d="' + dPath + '"/>';
    pts.forEach(function (p, i) {
      svg += '<circle class="cine-line-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5" style="--dot-delay:' + (0.7 + i * 0.07) + 's"/>';
      svg += '<text class="cine-axis-lbl" x="' + p[0].toFixed(1) + '" y="' + (h - 14) + '" text-anchor="middle">' + MONTHS[s[i].m] + '</text>';
      svg += '<text class="cine-axis-val" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 14).toFixed(1) + '" text-anchor="middle" style="--dot-delay:' + (1.1 + i * 0.07) + 's">' + (s[i].resultado >= 0 ? '+' : '') + money(s[i].resultado) + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  // Entradas × Saídas — duas linhas desenhando, com a área do gap (resultado) sombreada.
  function chartDualLine(d) {
    var s = d.series;
    if (!s.length) return '';
    var w = 820, h = 300, padL = 18, padR = 18, padB = 40, padT = 22;
    var maxV = Math.max.apply(null, s.map(function (x) { return Math.max(x.entradas, x.saidas); }).concat([1]));
    var stepX = (w - padL - padR) / Math.max(1, s.length - 1);
    function pt(val, i) { return [padL + i * stepX, padT + (1 - val / maxV) * (h - padT - padB)]; }
    var inPts = s.map(function (x, i) { return pt(x.entradas, i); });
    var outPts = s.map(function (x, i) { return pt(x.saidas, i); });
    var gap = 'M' + inPts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') +
      ' L' + outPts.slice().reverse().map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' Z';
    var svg = '<svg class="cine-svg cine-duo" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<path class="cine-duo-gap" d="' + gap + '"/>';
    svg += '<path class="cine-duo-in cine-draw" pathLength="1" d="' + svgPath(inPts) + '"/>';
    svg += '<path class="cine-duo-out cine-draw" pathLength="1" d="' + svgPath(outPts) + '"/>';
    inPts.forEach(function (p, i) { svg += '<circle class="cine-duo-dot in" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5" style="--dot-delay:' + (0.8 + i * 0.06) + 's"/>'; });
    outPts.forEach(function (p, i) { svg += '<circle class="cine-duo-dot out" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5" style="--dot-delay:' + (1.0 + i * 0.06) + 's"/>'; });
    s.forEach(function (x, i) { svg += '<text class="cine-axis-lbl" x="' + (padL + i * stepX).toFixed(1) + '" y="' + (h - 14) + '" text-anchor="middle">' + MONTHS[x.m] + '</text>'; });
    svg += '</svg>';
    return svg;
  }

  // Cascata (waterfall) — como o resultado de cada mês construiu o caixa acumulado.
  function chartWaterfall(d) {
    var s = d.series;
    if (!s.length) return '';
    var w = 820, h = 320, padL = 18, padR = 18, padB = 42, padT = 26;
    var cum = 0, steps = s.map(function (x) { var from = cum; cum += x.resultado; return { m: x.m, from: from, to: cum, val: x.resultado }; });
    var allVals = [0]; steps.forEach(function (st) { allVals.push(st.from, st.to); });
    var maxV = Math.max.apply(null, allVals), minV = Math.min.apply(null, allVals);
    var range = (maxV - minV) || 1;
    var plotH = h - padT - padB;
    function yFor(v) { return padT + (1 - (v - minV) / range) * plotH; }
    var slot = (w - padL - padR) / s.length;
    var bw = slot * 0.5;
    var zeroY = yFor(0);
    var bars = '', conns = '', labels = '';
    steps.forEach(function (st, i) {
      var cx = padL + slot * i + slot / 2;
      var y0 = yFor(st.from), y1 = yFor(st.to);
      var top = Math.min(y0, y1), hgt = Math.max(2, Math.abs(y1 - y0));
      bars += '<rect class="cine-wf-bar ' + (st.val >= 0 ? 'pos' : 'neg') + '" x="' + (cx - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="4" style="--bar-delay:' + (0.15 + i * 0.13) + 's"/>';
      if (i < steps.length - 1) {
        var nx = padL + slot * (i + 1) + slot / 2;
        conns += '<line class="cine-wf-conn" x1="' + (cx + bw / 2).toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + (nx - bw / 2).toFixed(1) + '" y2="' + y1.toFixed(1) + '" style="--conn-delay:' + (0.4 + i * 0.13) + 's"/>';
      }
      labels += '<text class="cine-axis-lbl" x="' + cx.toFixed(1) + '" y="' + (h - 14) + '" text-anchor="middle">' + MONTHS[st.m] + '</text>';
      labels += '<text class="cine-wf-val ' + (st.val >= 0 ? 'pos' : 'neg') + '" x="' + cx.toFixed(1) + '" y="' + (Math.min(y0, y1) - 9).toFixed(1) + '" text-anchor="middle" style="--bar-delay:' + (0.5 + i * 0.13) + 's">' + (st.val >= 0 ? '+' : '−') + money(Math.abs(st.val)) + '</text>';
    });
    var svg = '<svg class="cine-svg cine-wf" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<line class="cine-zero" x1="' + padL + '" y1="' + zeroY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + zeroY.toFixed(1) + '"/>';
    svg += conns + bars + labels;
    svg += '</svg>';
    return svg;
  }

  // Pulso diário — fluxo líquido (entradas−saídas) dia a dia no realizado. Linha densa "batimento".
  function chartDailyPulse(d) {
    var daily = [];
    try { daily = (window.__DATA__ && window.__DATA__.daily) || []; } catch (e) {}
    var rows = daily.filter(function (x) { return d.months.indexOf(x.month) !== -1 && !x.projection; });
    if (rows.length < 2) return '';
    var w = 860, h = 280, padL = 8, padR = 8, padB = 26, padT = 16;
    var nets = rows.map(function (x) { return (x.entradas || 0) - (x.saidas || 0); });
    var maxV = Math.max.apply(null, nets.concat([1])), minV = Math.min.apply(null, nets.concat([0]));
    var range = (maxV - minV) || 1;
    var stepX = (w - padL - padR) / (rows.length - 1);
    var plotH = h - padT - padB;
    function y(v) { return padT + (1 - (v - minV) / range) * plotH; }
    var pts = nets.map(function (v, i) { return [padL + i * stepX, y(v)]; });
    var line = svgPath(pts);
    var zeroY = y(0);
    var area = 'M' + pts[0][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' ' + line.replace(/^M/, 'L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' Z';
    // marcadores de início de mês
    var seps = '';
    var seen = {};
    rows.forEach(function (x, i) {
      if (!seen[x.month]) { seen[x.month] = true; var px = padL + i * stepX; seps += '<text class="cine-axis-lbl" x="' + px.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' + MONTHS[x.month] + '</text>'; }
    });
    var svg = '<svg class="cine-svg cine-pulse" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<line class="cine-zero" x1="' + padL + '" y1="' + zeroY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + zeroY.toFixed(1) + '"/>';
    svg += '<path class="cine-pulse-area" d="' + area + '"/>';
    svg += '<path class="cine-pulse-line cine-draw" pathLength="1" d="' + line + '"/>';
    svg += seps;
    svg += '</svg>';
    return svg;
  }

  // Rosca multi-segmento — top categorias como arcos coloridos varrendo no anel.
  function chartDonutMulti(d) {
    var cats = d.cats.slice(0, 5);
    if (!cats.length) return '';
    var totalAll = d.cats.reduce(function (s, c) { return s + c.value; }, 0) || 1;
    var r = 84, c = 2 * Math.PI * r, cx = 120, cy = 120;
    var gap = 0.014 * c;
    var offset = 0, segs = '';
    cats.forEach(function (cat, i) {
      var frac = cat.value / totalAll;
      var len = Math.max(0, frac * c - gap);
      segs += '<circle class="cine-mdonut-seg" cx="' + cx + '" cy="' + cy + '" r="' + r + '" transform="rotate(' + (-90 + offset / c * 360).toFixed(2) + ' ' + cx + ' ' + cy + ')" style="--seg-len:' + len.toFixed(1) + ';--seg-circ:' + c.toFixed(1) + ';--seg-delay:' + (0.2 + i * 0.14) + 's;stroke:' + SEG[i % SEG.length] + '"/>';
      offset += frac * c;
    });
    var top = cats[0];
    var svg = '<svg class="cine-svg cine-mdonut" viewBox="0 0 240 240" aria-hidden="true">';
    svg += '<circle class="cine-mdonut-track" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
    svg += segs;
    svg += '<text class="cine-mdonut-pct" x="120" y="115" text-anchor="middle">' + pct(top.pct) + '</text>';
    svg += '<text class="cine-mdonut-sub" x="120" y="139" text-anchor="middle">maior rubrica</text>';
    svg += '</svg>';
    return svg;
  }

  function donutLegend(d) {
    var cats = d.cats.slice(0, 5);
    return '<div class="cine-mdonut-legend">' + cats.map(function (c, i) {
      return '<div class="cine-mdleg-row"><span class="cine-mdleg-dot" style="background:' + SEG[i % SEG.length] + '"></span>' +
        '<span class="cine-mdleg-name">' + esc(c.name) + '</span>' +
        '<span class="cine-mdleg-pct">' + pct(c.pct) + '</span></div>';
    }).join('') + '</div>';
  }

  // Mapa de calor — mês × categoria, células acendendo em onda diagonal.
  function chartHeatmap(d) {
    var cm = [];
    try { cm = (window.__DATA__ && window.__DATA__.categoryMonthly) || []; } catch (e) {}
    if (!cm.length) return '';
    var months = d.months;
    function val(c, m) { return Number((c.months && (c.months[m] != null ? c.months[m] : c.months[String(m)])) || 0); }
    var ranked = cm.map(function (c) {
      return { name: c.name, months: c.months, total: months.reduce(function (s, m) { return s + val(c, m); }, 0) };
    }).filter(function (c) { return c.total > 0.01; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 6);
    if (!ranked.length) return '';
    var maxCell = 1;
    ranked.forEach(function (c) { months.forEach(function (m) { var v = val(c, m); if (v > maxCell) maxCell = v; }); });
    var header = '<div class="cine-hm-corner"></div>' + months.map(function (m) { return '<div class="cine-hm-mhead">' + MONTHS[m] + '</div>'; }).join('');
    var rows = ranked.map(function (c, ri) {
      var cells = months.map(function (m, ci) {
        var v = val(c, m);
        return '<div class="cine-hm-cell" style="--hm:' + (v / maxCell).toFixed(3) + ';--hm-delay:' + ((ri + ci) * 0.05).toFixed(2) + 's" title="' + esc(c.name) + ' · ' + MONTHS[m] + ': ' + money(v) + '"></div>';
      }).join('');
      return '<div class="cine-hm-rowname">' + esc(c.name) + '</div>' + cells;
    }).join('');
    return '<div class="cine-hm" style="grid-template-columns: minmax(120px,200px) repeat(' + months.length + ', 1fr)">' + header + rows + '</div>';
  }

  // Barras horizontais das top categorias — anima largura
  function chartHbars(d) {
    var top = d.cats.slice(0, 5);
    if (!top.length) return '';
    var max = Math.max.apply(null, top.map(function (c) { return c.value; }).concat([1]));
    var rows = top.map(function (c, i) {
      var wpct = (c.value / max) * 100;
      return '<div class="cine-hbar-row" style="--row-delay:' + (i * 0.1) + 's">' +
        '<div class="cine-hbar-name">' + esc(c.name) + '</div>' +
        '<div class="cine-hbar-track"><div class="cine-hbar-fill" style="--fill:' + wpct.toFixed(1) + '%"></div></div>' +
        '<div class="cine-hbar-val">' + money(c.value) + '</div>' +
        '<div class="cine-hbar-pct">' + pct(c.pct) + '</div>' +
      '</div>';
    }).join('');
    return '<div class="cine-hbars">' + rows + '</div>';
  }

  // Sparkline de uma categoria (evolução Jan–Jun) — linha desenhando, p/ o slide-do-momento.
  function chartSparkline(catName) {
    var cat = (typeof getCategoryByName === 'function') ? getCategoryByName(catName) : null;
    if (!cat || !cat.months) return '';
    var months = (data && data.months) || [1, 2, 3, 4, 5, 6];
    var vals = months.map(function (m) { return Number((cat.months[m] != null ? cat.months[m] : cat.months[String(m)]) || 0); });
    if (!vals.some(function (v) { return v > 0; })) return '';
    var w = 560, h = 160, padL = 12, padR = 12, padB = 26, padT = 14;
    var maxV = Math.max.apply(null, vals.concat([1]));
    var stepX = (w - padL - padR) / Math.max(1, vals.length - 1);
    var pts = vals.map(function (v, i) { return [padL + i * stepX, padT + (1 - v / maxV) * (h - padT - padB)]; });
    var line = svgPath(pts);
    var area = 'M' + pts[0][0].toFixed(1) + ' ' + (h - padB) + ' ' + line.replace(/^M/, 'L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (h - padB) + ' Z';
    var svg = '<svg class="cine-svg cine-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<path class="cine-spark-area" d="' + area + '"/>';
    svg += '<path class="cine-spark-line cine-draw" pathLength="1" d="' + line + '"/>';
    pts.forEach(function (p, i) {
      svg += '<circle class="cine-spark-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" style="--dot-delay:' + (0.6 + i * 0.07) + 's"/>';
      svg += '<text class="cine-axis-lbl" x="' + p[0].toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' + MONTHS[months[i]] + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  // Mini-barras das rubricas de um mês — p/ o slide-do-momento (mês).
  function monthMiniBars(m) {
    var cats = (typeof monthCategoryBreakdown === 'function') ? monthCategoryBreakdown(m) : [];
    cats = cats.slice(0, 4);
    if (!cats.length) return '';
    var max = Math.max.apply(null, cats.map(function (c) { return c.value; }).concat([1]));
    return '<div class="cine-mini-hbars">' + cats.map(function (c, i) {
      var wpct = (c.value / max) * 100;
      return '<div class="cine-mini-row" style="--row-delay:' + (0.2 + i * 0.1) + 's">' +
        '<div class="cine-mini-name">' + esc(c.name) + '</div>' +
        '<div class="cine-mini-track"><div class="cine-mini-fill" style="--fill:' + wpct.toFixed(1) + '%"></div></div>' +
        '<div class="cine-mini-val">' + money(c.value) + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  // ---- slide-do-momento: conteúdo varia conforme a volta (state.cycle) ----
  function momentCategoryHtml(cycle) {
    var arr = (data && data.cats) || [];
    if (!arr.length) return '<div class="cine-eyebrow">Categoria em foco</div><h2 class="cine-h2">Sem dados.</h2>';
    var n = arr.length, i = ((cycle % n) + n) % n, c = arr[i];
    return '<div class="cine-eyebrow">Categoria em foco · ' + (i + 1) + ' de ' + n + '</div>' +
      '<div class="cine-moment-head">' +
        '<div class="cine-moment-name">' + esc(c.name) + '</div>' +
        '<div class="cine-moment-figs"><span class="cine-moment-val" data-cine-count="' + c.value + '" data-signed="0" data-pct="0">R$ 0</span><span class="cine-moment-pct">' + pct(c.pct) + ' das saídas</span></div>' +
      '</div>' +
      chartSparkline(c.name);
  }

  function momentMonthHtml(cycle) {
    var arr = (data && data.series) || [];
    if (!arr.length) return '<div class="cine-eyebrow">Mês em foco</div><h2 class="cine-h2">Sem dados.</h2>';
    var n = arr.length, i = ((cycle % n) + n) % n, s = arr[i], m = s.m, pos = s.resultado >= 0;
    return '<div class="cine-eyebrow">Mês em foco · ' + (i + 1) + ' de ' + n + '</div>' +
      '<div class="cine-moment-head">' +
        '<div class="cine-moment-name">' + MONTHS_LONG[m] + '</div>' +
        '<div class="cine-moment-figs"><span class="cine-moment-val" data-cine-count="' + s.resultado + '" data-signed="1" data-pct="0" style="color:' + (pos ? 'var(--green)' : 'var(--red)') + '">R$ 0</span><span class="cine-moment-pct">resultado do mês</span></div>' +
      '</div>' +
      '<div class="cine-moment-sub">Principais saídas do mês</div>' +
      monthMiniBars(m);
  }

  // =========================================================
  //  SLIDES (chart-forward — texto só nos marcos)
  // =========================================================
  function buildSlides(d) {
    var resPositive = d.agg.resultado >= 0;
    var top = d.cats[0] || { name: '—', value: 0, pct: 0 };
    var concentrado = top.pct >= 50;
    var n = d.months.length;
    var slides = [];

    // 01) CAPA
    slides.push({ kind: 'cover', html:
      '<div class="cine-eyebrow">Relatório executivo · ' + esc(d.label) + '</div>' +
      '<h1 class="cine-h1">Marconi Foods</h1>' +
      '<div class="cine-lede">Leitura visual do fluxo de caixa realizado — ' +
        (resPositive ? 'operação superavitária no semestre.' : 'consumo de caixa no semestre.') + '</div>' +
      '<div class="cine-cover-meta">' +
        '<span class="cine-chip">' + n + ' meses realizados</span>' +
        '<span class="cine-chip">resultado ' + (resPositive ? '+' : '−') + money(Math.abs(d.agg.resultado)) + '</span>' +
        (d.stamp ? '<span class="cine-chip">atualizado em ' + esc(d.stamp) + '</span>' : '') +
      '</div>'
    });

    // 02) ENTRADAS × SAÍDAS (duas linhas + gap)
    slides.push({ kind: 'duo', html:
      '<div class="cine-eyebrow">Entradas × Saídas</div>' +
      '<h2 class="cine-h2">O que entra e o que sai, mês a mês.</h2>' +
      chartDualLine(d) +
      '<div class="cine-chartkey"><span class="cine-key in">Entradas</span><span class="cine-key out">Saídas</span><span class="cine-key gap">Resultado (gap)</span></div>'
    });

    // 03) TENDÊNCIA DO RESULTADO (a linha)
    slides.push({ kind: 'trend', html:
      '<div class="cine-eyebrow">Tendência mensal</div>' +
      '<h2 class="cine-h2">Como o resultado evoluiu mês a mês.</h2>' +
      chartLine(d)
    });

    // 04) CASCATA — acúmulo do caixa
    slides.push({ kind: 'waterfall', html:
      '<div class="cine-eyebrow">Construção do caixa</div>' +
      '<h2 class="cine-h2">Como cada mês somou ao caixa.</h2>' +
      chartWaterfall(d) +
      '<div class="cine-lede">Acúmulo do semestre: <strong>' + (resPositive ? '+' : '−') + moneyFull(Math.abs(d.agg.resultado)) + '</strong>.</div>'
    });

    // 05) PULSO DIÁRIO
    slides.push({ kind: 'pulse', html:
      '<div class="cine-eyebrow">Pulso diário</div>' +
      '<h2 class="cine-h2">O batimento do caixa, dia a dia.</h2>' +
      chartDailyPulse(d) +
      '<div class="cine-lede">Fluxo líquido diário (entradas − saídas) no semestre realizado.</div>'
    });

    // 06) CONCENTRAÇÃO — rosca multi-segmento + legenda
    slides.push({ kind: 'concentration', html:
      '<div class="cine-eyebrow">Concentração das saídas</div>' +
      '<h2 class="cine-h2">Para onde o caixa está indo.</h2>' +
      '<div class="cine-split">' +
        '<div class="cine-split-chart">' + chartDonutMulti(d) + '</div>' +
        '<div class="cine-split-text">' + donutLegend(d) +
          '<div class="cine-lede">' + (concentrado
            ? '<strong>' + esc(top.name) + '</strong> sozinha responde por ' + pct(top.pct) + ' das saídas — concentração alta.'
            : 'Distribuição equilibrada entre as principais rubricas.') + '</div>' +
        '</div>' +
      '</div>'
    });

    // 07) MAPA DE CALOR — mês × categoria
    slides.push({ kind: 'heatmap', html:
      '<div class="cine-eyebrow">Mapa de calor</div>' +
      '<h2 class="cine-h2">Onde o caixa saiu, mês a mês.</h2>' +
      chartHeatmap(d) +
      '<div class="cine-chartkey"><span class="cine-key faint">menos</span><span class="cine-key heat">mais saída</span></div>'
    });

    // 08) COMPOSIÇÃO (top 5)
    slides.push({ kind: 'composition', html:
      '<div class="cine-eyebrow">Composição das saídas</div>' +
      '<h2 class="cine-h2">As 5 principais rubricas.</h2>' +
      chartHbars(d)
    });

    // 09) ⭐ CATEGORIA-DO-MOMENTO (rotativo + sparkline)
    slides.push({ kind: 'moment', dyn: 'category', html: momentCategoryHtml(0) });

    // 10) ⭐ MÊS-DO-MOMENTO (rotativo + mini-barras)
    slides.push({ kind: 'moment', dyn: 'month', html: momentMonthHtml(0) });

    // 11) SÍNTESE & RECOMENDAÇÃO
    var recs = [];
    if (concentrado) recs.push('Renegociar prazo/condições da rubrica dominante (' + top.name + ').');
    if (d.deficits.length) recs.push('Endereçar os ' + d.deficits.length + ' mês(es) deficitário(s), priorizando ' + MONTHS_LONG[d.worst.m] + '.');
    recs.push(resPositive ? 'Preservar a geração de caixa: margem atual de ' + pct(d.agg.margem) + '.' : 'Reverter o consumo de caixa com plano de saídas.');
    recs.push('Acompanhar o realizado mês a mês e revisar as metas do 2º semestre.');
    slides.push({ kind: 'synthesis', html:
      '<div class="cine-eyebrow">Síntese executiva</div>' +
      '<h2 class="cine-h2">' + (resPositive ? 'Operação saudável, com um ponto de atenção.' : 'Operação sob pressão de caixa.') + '</h2>' +
      '<div class="cine-synth">' +
        '<div class="cine-verdict cine-verdict--' + (resPositive ? (concentrado ? 'watch' : 'good') : 'risk') + '">' +
          (resPositive ? (concentrado ? 'ATENÇÃO' : 'ESTÁVEL') : 'CRÍTICO') +
        '</div>' +
        '<ol class="cine-recs">' + recs.slice(0, 4).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' +
      '</div>'
    });

    // 12) COMO LER (legenda das cores) + carimbo
    slides.push({ kind: 'legend', html:
      '<div class="cine-eyebrow">Como ler este painel</div>' +
      '<h2 class="cine-h2">Legenda.</h2>' +
      '<div class="cine-legend">' +
        legendRow('var(--green)', 'Entradas / resultado positivo', 'Dinheiro que entrou no caixa.') +
        legendRow('var(--red)', 'Saídas / resultado negativo', 'Desembolsos e consumo de caixa.') +
        legendRow('var(--gold)', 'Destaque / concentração', 'Maior rubrica, gap e marcações.') +
      '</div>' +
      '<div class="cine-legend-meta">Recorte: <strong>' + esc(d.label) + '</strong>' + (d.stamp ? ' · atualizado em <strong>' + esc(d.stamp) + '</strong>' : '') + '</div>'
    });

    return slides;
  }

  function legendRow(color, title, desc) {
    return '<div class="cine-legend-row">' +
      '<span class="cine-legend-swatch" style="background:' + color + '"></span>' +
      '<div class="cine-legend-text"><div class="cine-legend-title">' + title + '</div><div class="cine-legend-desc">' + desc + '</div></div>' +
    '</div>';
  }

  // =========================================================
  //  COUNT-UP (números que ainda existem — capa/momento usam textos diretos)
  // =========================================================
  function runCountUp(root) {
    root.querySelectorAll('[data-cine-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-cine-count')) || 0;
      var signed = el.getAttribute('data-signed') === '1';
      var isPct = el.getAttribute('data-pct') === '1';
      var dur = 1100, start = null;
      function fmt(v) {
        if (isPct) return (signed && v >= 0 ? '+' : '') + pct(v);
        var s = money(Math.abs(v));
        return (signed ? (v >= 0 ? '+' : '-') : '') + s;
      }
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / dur, 1);
        var ease = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(target * ease);
        if (t < 1) state.raf.push(requestAnimationFrame(step));
      }
      state.raf.push(requestAnimationFrame(step));
    });
  }

  // =========================================================
  //  OVERLAY / NAVEGAÇÃO
  // =========================================================
  var data = null, slides = [];

  function ensureOverlay() {
    var o = document.getElementById('cineOverlay');
    if (o) return o;
    o = document.createElement('div');
    o.id = 'cineOverlay';
    o.className = 'cine-overlay';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-label', 'Modo apresentação executiva');
    o.innerHTML =
      '<div class="cine-stage" id="cineStage"></div>' +
      '<div class="cine-progress" id="cineProgress"></div>' +
      '<div class="cine-controls">' +
        '<button class="cine-btn cine-prev" id="cinePrev" type="button" aria-label="Slide anterior">‹</button>' +
        '<button class="cine-btn cine-play" id="cinePlay" type="button" aria-label="Reproduzir automaticamente">▶</button>' +
        '<button class="cine-btn cine-next" id="cineNext" type="button" aria-label="Próximo slide">›</button>' +
      '</div>' +
      '<button class="cine-close" id="cineClose" type="button" aria-label="Fechar (Esc)">✕ Fechar</button>' +
      '<div class="cine-counter" id="cineCounter"></div>' +
      '<div class="cine-timebar" id="cineTimebar"><div class="cine-timebar-fill" id="cineTimebarFill"></div></div>';
    document.body.appendChild(o);
    o.querySelector('#cineClose').addEventListener('click', close);
    o.querySelector('#cinePrev').addEventListener('click', function () { go(-1, true); });
    o.querySelector('#cineNext').addEventListener('click', function () { go(1, true); });
    o.querySelector('#cinePlay').addEventListener('click', togglePlay);
    return o;
  }

  function open() {
    data = gather();
    slides = buildSlides(data);
    var o = ensureOverlay();
    var stage = o.querySelector('#cineStage');
    stage.innerHTML = slides.map(function (s, i) {
      return '<section class="cine-slide cine-slide--' + s.kind + '" data-i="' + i + '"' + (s.dyn ? ' data-dyn="' + s.dyn + '"' : '') + '>' +
        '<div class="cine-slide-inner">' + s.html + '</div></section>';
    }).join('');
    var prog = o.querySelector('#cineProgress');
    prog.innerHTML = slides.map(function (s, i) { return '<button class="cine-dot" data-i="' + i + '" aria-label="Ir ao slide ' + (i + 1) + '"></button>'; }).join('');
    prog.querySelectorAll('.cine-dot').forEach(function (dot) {
      dot.addEventListener('click', function () { state.idx = parseInt(dot.dataset.i, 10); render(true); });
    });
    state.idx = 0;
    state.cycle = 0;
    document.body.classList.add('cine-active');
    o.classList.add('show');
    render(false);
    startPlay();
  }

  function close() {
    stopPlay();
    cancelRaf();
    var o = document.getElementById('cineOverlay');
    if (o) o.classList.remove('show');
    document.body.classList.remove('cine-active');
  }

  function cancelRaf() {
    state.raf.forEach(function (id) { cancelAnimationFrame(id); });
    state.raf = [];
  }

  function render(userAction) {
    var o = document.getElementById('cineOverlay');
    if (!o) return;
    cancelRaf();
    var secs = o.querySelectorAll('.cine-slide');
    secs.forEach(function (s, i) { s.classList.toggle('active', i === state.idx); });
    o.querySelectorAll('.cine-dot').forEach(function (dot, i) { dot.classList.toggle('on', i === state.idx); });
    var counter = o.querySelector('#cineCounter');
    if (counter) counter.textContent = (state.idx + 1) + ' / ' + slides.length + (state.cycle > 0 ? '  ·  volta ' + (state.cycle + 1) : '');
    var active = secs[state.idx];
    if (active) {
      // slide-do-momento: regenera o conteúdo conforme a volta atual
      var dyn = active.getAttribute('data-dyn');
      if (dyn) {
        var inner = active.querySelector('.cine-slide-inner');
        if (inner) inner.innerHTML = (dyn === 'category') ? momentCategoryHtml(state.cycle) : momentMonthHtml(state.cycle);
      }
      active.classList.remove('anim');
      void active.offsetWidth; // reflow
      active.classList.add('anim');
      runCountUp(active);
    }
    if (userAction) restartPlayIfOn();
  }

  function go(dir, userAction) {
    var prev = state.idx;
    state.idx = (state.idx + dir + slides.length) % slides.length;
    if (dir > 0 && state.idx === 0 && prev !== 0) state.cycle++;
    else if (dir < 0 && prev === 0 && state.idx !== 0) state.cycle = Math.max(0, state.cycle - 1);
    render(userAction);
  }

  // ---- autoplay ----
  function startPlay() { state.playing = true; updatePlayBtn(); schedule(); }
  function stopPlay() {
    state.playing = false;
    updatePlayBtn();
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    stopTimebar();
  }
  function togglePlay() { state.playing ? stopPlay() : startPlay(); }
  function restartPlayIfOn() { if (state.playing) { schedule(); } }
  function schedule() {
    if (state.timer) clearTimeout(state.timer);
    if (!state.playing) { stopTimebar(); return; }
    runTimebar();
    state.timer = setTimeout(function () {
      if (!state.playing) return;
      go(1, false);
      schedule();
    }, AUTOPLAY_MS);
  }

  // ---- mini barra de progresso temporal ----
  function runTimebar() {
    var fill = document.getElementById('cineTimebarFill');
    var bar = document.getElementById('cineTimebar');
    if (!fill || !bar) return;
    if (state.timebarRaf) cancelAnimationFrame(state.timebarRaf);
    bar.classList.add('on');
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / AUTOPLAY_MS, 1);
      fill.style.width = (t * 100).toFixed(2) + '%';
      if (t < 1 && state.playing) state.timebarRaf = requestAnimationFrame(step);
    }
    fill.style.width = '0%';
    state.timebarRaf = requestAnimationFrame(step);
  }
  function stopTimebar() {
    if (state.timebarRaf) { cancelAnimationFrame(state.timebarRaf); state.timebarRaf = null; }
    var fill = document.getElementById('cineTimebarFill');
    var bar = document.getElementById('cineTimebar');
    if (fill) fill.style.width = '0%';
    if (bar) bar.classList.remove('on');
  }
  function updatePlayBtn() {
    var b = document.getElementById('cinePlay');
    if (!b) return;
    b.textContent = state.playing ? '❚❚' : '▶';
    b.setAttribute('aria-label', state.playing ? 'Pausar apresentação automática' : 'Reproduzir automaticamente');
    b.classList.toggle('playing', state.playing);
    var o = document.getElementById('cineOverlay');
    if (o) o.classList.toggle('cine-autoplaying', state.playing);
  }

  // ---- teclado ----
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('cine-active')) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowRight') { go(1, true); }
    else if (e.key === 'ArrowLeft') { go(-1, true); }
    else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  });

  // ---- botão na sidebar ----
  function wireButton() {
    var old = document.getElementById('v23CinemaMode');
    var actions = document.querySelector('.sidebar-actions');
    if (!actions) return;
    var btn = document.getElementById('cineOpenBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'cineOpenBtn';
      btn.className = 'sidebar-action gold';
      btn.textContent = 'Modo cinema';
      if (old && old.parentNode === actions) { actions.replaceChild(btn, old); }
      else { actions.appendChild(btn); }
      btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
    } else if (old && old !== btn) {
      old.remove();
    }
  }

  // re-render no toggle de tema (cores via token mudam; re-render garante gráficos coerentes)
  if (window.MarconiEvents && window.MarconiEvents.on) {
    window.MarconiEvents.on('theme:changed', function () {
      if (document.body.classList.contains('cine-active')) render(false);
    });
  }

  function boot() {
    wireButton();
    setTimeout(wireButton, 400);
    setTimeout(wireButton, 1200);
  }
  if (window.onDashboardReady) window.onDashboardReady(boot); else document.addEventListener('DOMContentLoaded', boot);

  window.MarconiCinema = { open: open, close: close };
})();
