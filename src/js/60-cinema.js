/* ============================================================
   60-cinema.js — Modo Cinema executivo (v2)
   Deck de apresentação para diretoria: slides curados com dados REAIS,
   count-up, gráficos SVG animados (vivos), autoplay, theme-aware.
   Substitui o cinema antigo (wireCinemaButton/openCinema do 20-interactions,
   agora no-op). Lê os helpers globais: getActivePeriod, aggregate,
   getCategoryBreakdown, DATA(via window? não — usa os helpers), MarconiFormat.
   ============================================================ */
(function () {
  'use strict';

  // ---- Helpers de formatação (MarconiFormat é global) ----
  var MF = window.MarconiFormat || {};
  function money(v) { return MF.moneyShort ? MF.moneyShort(v) : ('R$ ' + Math.round(v)); }
  function moneyFull(v) { return MF.moneyFull ? MF.moneyFull(v) : ('R$ ' + Math.round(v)); }
  function pct(v) { return MF.pct ? MF.pct(v) : (v.toFixed(1) + '%'); }
  function esc(s) { return MF.escapeHtml ? MF.escapeHtml(String(s)) : String(s); }

  var MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var MONTHS_LONG = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  var AUTOPLAY_MS = 6000;

  var state = { idx: 0, playing: false, timer: null, raf: [], built: false };

  // ---- token de cor (theme-aware): lê do CSS em runtime ----
  function token(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  // =========================================================
  //  COLETA DE DADOS REAIS (via helpers globais do dashboard)
  // =========================================================
  function gather() {
    var period = (typeof getActivePeriod === 'function') ? getActivePeriod() : { months: [1,2,3,4,5,6,7,8,9,10,11,12], mode: 'year' };
    var months = period.months;
    var agg = (typeof aggregate === 'function') ? aggregate(months) : { entradas: 0, saidas: 0, resultado: 0, margem: 0 };
    var cats = (typeof getCategoryBreakdown === 'function') ? getCategoryBreakdown(months) : [];
    // série mensal de resultado (para a linha de tendência) — usa os helpers de mês
    var series = months.map(function (m) {
      var a = (typeof aggregate === 'function') ? aggregate([m]) : { entradas: 0, saidas: 0, resultado: 0 };
      return { m: m, entradas: a.entradas, saidas: a.saidas, resultado: a.resultado, proj: isProj(m) };
    });
    var best = series.slice().sort(function (a, b) { return b.resultado - a.resultado; })[0];
    var worst = series.slice().sort(function (a, b) { return a.resultado - b.resultado; })[0];
    var deficits = series.filter(function (s) { return s.resultado < 0; });
    var realizados = series.filter(function (s) { return !s.proj; });
    var label = (typeof periodLabelFor === 'function') ? periodLabelFor(months, period.mode) : '2026';
    return { period: period, months: months, agg: agg, cats: cats, series: series, best: best, worst: worst, deficits: deficits, realizados: realizados, label: label };
  }
  function isProj(m) {
    // Jul-Dez (7..12) são projeção neste modelo; usa MarconiFormat se disponível
    if (MF.isProjectionMonth) { try { return !!MF.isProjectionMonth(m); } catch (e) {} }
    return m >= 7;
  }

  // =========================================================
  //  GRÁFICOS SVG (desenhados com dados reais; animados via CSS/JS)
  // =========================================================
  // Barras verticais: entradas vs saídas (3 grupos resumidos) — anima altura
  function chartBars(d) {
    var max = Math.max(d.agg.entradas, d.agg.saidas, 1);
    var bars = [
      { lbl: 'Entradas', v: d.agg.entradas, c: 'var(--green)' },
      { lbl: 'Saídas', v: d.agg.saidas, c: 'var(--red)' },
      { lbl: 'Resultado', v: Math.abs(d.agg.resultado), c: 'var(--gold)' }
    ];
    var w = 520, h = 240, padB = 36, padT = 16, bw = 90, gap = (w - bars.length * bw) / (bars.length + 1);
    var svg = '<svg class="cine-svg cine-bars" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    // baseline
    svg += '<line x1="0" y1="' + (h - padB) + '" x2="' + w + '" y2="' + (h - padB) + '" class="cine-axis"/>';
    bars.forEach(function (b, i) {
      var bh = (b.v / max) * (h - padB - padT);
      var x = gap + i * (bw + gap);
      var y = h - padB - bh;
      svg += '<rect class="cine-bar" x="' + x + '" y="' + (h - padB) + '" width="' + bw + '" height="0" rx="8" fill="' + b.c + '" style="--bar-h:' + bh + 'px;--bar-y:' + y + 'px;--bar-delay:' + (i * 0.12) + 's"><animate/></rect>';
      svg += '<text class="cine-bar-lbl" x="' + (x + bw / 2) + '" y="' + (h - padB + 22) + '" text-anchor="middle">' + b.lbl + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  // Linha de tendência mensal (resultado) — anima o traço (stroke-dashoffset)
  function chartLine(d) {
    var s = d.series;
    if (!s.length) return '';
    var w = 760, h = 260, padL = 16, padR = 16, padB = 34, padT = 18;
    var vals = s.map(function (x) { return x.resultado; });
    var max = Math.max.apply(null, vals.concat([1]));
    var min = Math.min.apply(null, vals.concat([0]));
    var range = (max - min) || 1;
    var stepX = (w - padL - padR) / Math.max(1, s.length - 1);
    var pts = s.map(function (x, i) {
      var px = padL + i * stepX;
      var py = padT + (1 - (x.resultado - min) / range) * (h - padT - padB);
      return [px, py];
    });
    var dPath = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    // zero line
    var zeroY = padT + (1 - (0 - min) / range) * (h - padT - padB);
    var svg = '<svg class="cine-svg cine-line" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    svg += '<line x1="' + padL + '" y1="' + zeroY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + zeroY.toFixed(1) + '" class="cine-zero"/>';
    // área sob a linha
    var area = 'M' + pts[0][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' ' + dPath.replace(/^M/, 'L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + zeroY.toFixed(1) + ' Z';
    svg += '<path class="cine-line-area" d="' + area + '"/>';
    svg += '<path class="cine-line-path" d="' + dPath + '"/>';
    pts.forEach(function (p, i) {
      svg += '<circle class="cine-line-dot' + (s[i].proj ? ' proj' : '') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" style="--dot-delay:' + (0.6 + i * 0.06) + 's"/>';
      svg += '<text class="cine-line-lbl" x="' + p[0].toFixed(1) + '" y="' + (h - 12) + '" text-anchor="middle">' + MONTHS[s[i].m] + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  // Donut de concentração (top categoria vs resto) — anima o preenchimento
  function chartDonut(d) {
    var top = d.cats[0];
    if (!top) return '';
    var p = Math.max(0, Math.min(100, top.pct));
    var r = 86, c = 2 * Math.PI * r, cx = 120, cy = 120;
    var dash = (p / 100) * c;
    var svg = '<svg class="cine-svg cine-donut" viewBox="0 0 240 240" aria-hidden="true">';
    svg += '<circle class="cine-donut-track" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
    svg += '<circle class="cine-donut-val" cx="' + cx + '" cy="' + cy + '" r="' + r + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" style="--dash:' + dash.toFixed(1) + ';--circ:' + c.toFixed(1) + '"/>';
    svg += '<text class="cine-donut-pct" x="120" y="116" text-anchor="middle">' + pct(p) + '</text>';
    svg += '<text class="cine-donut-sub" x="120" y="142" text-anchor="middle">do total</text>';
    svg += '</svg>';
    return svg;
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

  // =========================================================
  //  SLIDES (curados — não repetem a página 1:1)
  // =========================================================
  function buildSlides(d) {
    var resPositive = d.agg.resultado >= 0;
    var top = d.cats[0] || { name: '—', value: 0, pct: 0 };
    var concentrado = top.pct >= 50;
    var slides = [];

    // 1) CAPA
    slides.push({
      kind: 'cover',
      html:
        '<div class="cine-eyebrow">Relatório executivo · ' + esc(d.label) + '</div>' +
        '<h1 class="cine-h1">Marconi Foods</h1>' +
        '<div class="cine-lede">Leitura executiva do fluxo de caixa. ' +
        (resPositive ? 'Operação superavitária no recorte.' : 'Atenção: consumo de caixa no recorte.') + '</div>' +
        '<div class="cine-cover-meta">' +
          '<span class="cine-chip">' + d.realizados.length + ' meses realizados</span>' +
          '<span class="cine-chip">' + d.series.length + ' meses no recorte</span>' +
        '</div>'
    });

    // 2) RESULTADO (count-up + barras)
    slides.push({
      kind: 'result',
      html:
        '<div class="cine-eyebrow">Resultado consolidado</div>' +
        '<h2 class="cine-h2">O caixa do período em um olhar.</h2>' +
        '<div class="cine-metrics">' +
          metric('Entradas', d.agg.entradas, 'var(--green)') +
          metric('Saídas gerenciais', d.agg.saidas, 'var(--red)') +
          metric('Resultado', d.agg.resultado, resPositive ? 'var(--green)' : 'var(--red)', true) +
          metric('Margem', d.agg.margem, 'var(--gold)', false, true) +
        '</div>' +
        chartBars(d)
    });

    // 3) TENDÊNCIA (linha desenhando)
    slides.push({
      kind: 'trend',
      html:
        '<div class="cine-eyebrow">Tendência mensal</div>' +
        '<h2 class="cine-h2">Como o resultado evoluiu mês a mês.</h2>' +
        '<div class="cine-lede">' +
          'Melhor mês: <strong>' + MONTHS_LONG[d.best.m] + '</strong> (' + money(d.best.resultado) + '). ' +
          (d.deficits.length ? 'Meses deficitários: <strong>' + d.deficits.length + '</strong> — pior em ' + MONTHS_LONG[d.worst.m] + '.' : 'Sem meses deficitários no recorte.') +
        '</div>' +
        chartLine(d)
    });

    // 4) CONCENTRAÇÃO DE RISCO (donut)
    slides.push({
      kind: 'risk',
      html:
        '<div class="cine-eyebrow">Concentração de risco</div>' +
        '<h2 class="cine-h2">Para onde o caixa está indo.</h2>' +
        '<div class="cine-split">' +
          '<div class="cine-split-chart">' + chartDonut(d) + '</div>' +
          '<div class="cine-split-text">' +
            '<div class="cine-big-cat">' + esc(top.name) + '</div>' +
            '<div class="cine-big-val">' + moneyFull(top.value) + '</div>' +
            '<div class="cine-lede">' + (concentrado
              ? 'Concentração <strong>alta</strong>: uma única rubrica responde por ' + pct(top.pct) + ' das saídas classificadas. Vale negociar prazo e diversificar fornecedores.'
              : 'Concentração controlada: a maior rubrica representa ' + pct(top.pct) + ' das saídas.') +
            '</div>' +
          '</div>' +
        '</div>'
    });

    // 5) COMPOSIÇÃO (barras horizontais)
    slides.push({
      kind: 'composition',
      html:
        '<div class="cine-eyebrow">Composição das saídas</div>' +
        '<h2 class="cine-h2">As 5 principais rubricas.</h2>' +
        chartHbars(d)
    });

    // 6) SÍNTESE & RECOMENDAÇÃO
    var recs = [];
    if (concentrado) recs.push('Renegociar prazo/condições da rubrica dominante (' + top.name + ').');
    if (d.deficits.length) recs.push('Endereçar os ' + d.deficits.length + ' mês(es) deficitário(s), priorizando ' + MONTHS_LONG[d.worst.m] + '.');
    recs.push('Manter leitura separada entre realizado (Jan–Jun) e projeção (Jul–Dez).');
    recs.push(resPositive ? 'Preservar a geração de caixa: margem atual de ' + pct(d.agg.margem) + '.' : 'Reverter o consumo de caixa com plano de saídas.');
    slides.push({
      kind: 'synthesis',
      html:
        '<div class="cine-eyebrow">Síntese executiva</div>' +
        '<h2 class="cine-h2">' + (resPositive ? 'Operação saudável, com um ponto de atenção.' : 'Operação sob pressão de caixa.') + '</h2>' +
        '<div class="cine-synth">' +
          '<div class="cine-verdict cine-verdict--' + (resPositive ? (concentrado ? 'watch' : 'good') : 'risk') + '">' +
            (resPositive ? (concentrado ? 'ATENÇÃO' : 'ESTÁVEL') : 'CRÍTICO') +
          '</div>' +
          '<ol class="cine-recs">' + recs.slice(0, 4).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' +
        '</div>'
    });

    return slides;
  }

  function metric(label, value, color, signed, isPct) {
    var disp = isPct ? '0.0%' : 'R$ 0';
    return '<div class="cine-metric">' +
      '<div class="cine-metric-lbl">' + label + '</div>' +
      '<div class="cine-metric-val" data-cine-count="' + value + '" data-signed="' + (signed ? '1' : '0') + '" data-pct="' + (isPct ? '1' : '0') + '" style="color:' + color + '">' + disp + '</div>' +
    '</div>';
  }

  // =========================================================
  //  COUNT-UP (anima os números do slide ativo)
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
      '<div class="cine-counter" id="cineCounter"></div>';
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
      return '<section class="cine-slide cine-slide--' + s.kind + '" data-i="' + i + '">' +
        '<div class="cine-slide-inner">' + s.html + '</div></section>';
    }).join('');
    // progress dots
    var prog = o.querySelector('#cineProgress');
    prog.innerHTML = slides.map(function (s, i) { return '<button class="cine-dot" data-i="' + i + '" aria-label="Ir ao slide ' + (i + 1) + '"></button>'; }).join('');
    prog.querySelectorAll('.cine-dot').forEach(function (dot) {
      dot.addEventListener('click', function () { state.idx = parseInt(dot.dataset.i, 10); render(true); });
    });
    state.idx = 0;
    document.body.classList.add('cine-active');
    o.classList.add('show');
    render(false);
    startPlay(); // autoplay inicia ao abrir
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
    secs.forEach(function (s, i) {
      s.classList.toggle('active', i === state.idx);
    });
    o.querySelectorAll('.cine-dot').forEach(function (dot, i) { dot.classList.toggle('on', i === state.idx); });
    var counter = o.querySelector('#cineCounter');
    if (counter) counter.textContent = (state.idx + 1) + ' / ' + slides.length;
    // re-disparar animações do slide ativo: força reflow removendo/readicionando classe
    var active = secs[state.idx];
    if (active) {
      active.classList.remove('anim');
      void active.offsetWidth; // reflow
      active.classList.add('anim');
      runCountUp(active);
    }
    if (userAction) restartPlayIfOn();
  }

  function go(dir, userAction) {
    state.idx = (state.idx + dir + slides.length) % slides.length;
    render(userAction);
  }

  // ---- autoplay ----
  function startPlay() {
    state.playing = true;
    updatePlayBtn();
    schedule();
  }
  function stopPlay() {
    state.playing = false;
    updatePlayBtn();
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
  }
  function togglePlay() { state.playing ? stopPlay() : startPlay(); }
  function restartPlayIfOn() { if (state.playing) { schedule(); } }
  function schedule() {
    if (state.timer) clearTimeout(state.timer);
    if (!state.playing) return;
    state.timer = setTimeout(function () {
      if (!state.playing) return;
      go(1, false);
      schedule();
    }, AUTOPLAY_MS);
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

  // ---- botão na sidebar (cria o novo, remove o antigo se existir) ----
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
      // posiciona onde estava o antigo, senão no fim
      if (old && old.parentNode === actions) { actions.replaceChild(btn, old); }
      else { actions.appendChild(btn); }
      btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
    } else if (old && old !== btn) {
      old.remove();
    }
  }

  // re-desenha o slide ativo no toggle de tema (cores via token mudam sozinhas,
  // mas re-render garante gráficos e count-up coerentes)
  if (window.MarconiEvents && window.MarconiEvents.on) {
    window.MarconiEvents.on('theme:changed', function () {
      if (document.body.classList.contains('cine-active')) render(false);
    });
  }

  function boot() {
    wireButton();
    // re-wire após renders de página (a sidebar pode ser recriada)
    setTimeout(wireButton, 400);
    setTimeout(wireButton, 1200);
  }
  if (window.onDashboardReady) window.onDashboardReady(boot); else document.addEventListener('DOMContentLoaded', boot);

  window.MarconiCinema = { open: open, close: close };
})();
