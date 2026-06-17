import http from 'node:http';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const devToolsTimeoutMs = Number(process.env.QA_DEVTOOLS_TIMEOUT_MS || (isCI ? 60000 : 25000));
const cdpTimeoutMs = Number(process.env.QA_CDP_TIMEOUT_MS || (isCI ? 30000 : 15000));
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const chromePath = chromeCandidates.find(candidate => fssync.existsSync(candidate));
const outputDir = path.join(repoRoot, '.qa-output');
await fs.mkdir(outputDir, { recursive: true });

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  }[ext] || 'application/octet-stream';
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') pathname = '/index.html';
      const requested = path.normalize(path.join(repoRoot, pathname));
      if (!requested.startsWith(repoRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const body = await fs.readFile(requested);
      res.writeHead(200, {
        'content-type': contentType(requested),
        'cache-control': 'no-store'
      });
      res.end(body);
    } catch (error) {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createLogBuffer(limit = 12000) {
  let value = '';
  return {
    push(chunk) {
      value += chunk.toString();
      if (value.length > limit) value = value.slice(-limit);
    },
    tail() {
      return value.trim();
    }
  };
}

async function pollDevToolsUrl(debugPort) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`, {
    signal: AbortSignal.timeout(1500)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload.webSocketDebuggerUrl) throw new Error('webSocketDebuggerUrl ausente');
  return payload.webSocketDebuggerUrl;
}

async function waitForDevTools(chrome, debugPort, chromeLog) {
  let exitCode = null;
  chrome.once('exit', code => {
    exitCode = code;
  });
  const started = Date.now();
  while (Date.now() - started < devToolsTimeoutMs) {
    if (exitCode !== null) {
      throw new Error(`Chrome exited before DevTools was ready: ${exitCode}. stderr: ${chromeLog.tail()}`);
    }
    try {
      return await pollDevToolsUrl(debugPort);
    } catch (error) {
      await sleep(350);
    }
  }
  throw new Error(`Chrome DevTools timeout after ${devToolsTimeoutMs}ms on port ${debugPort}. stderr: ${chromeLog.tail()}`);
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message}: ${JSON.stringify(msg.error.data || '')}`));
        else resolve(msg.result || {});
      } else {
        this.events.push(msg);
      }
    };
  }
  async open() {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket timeout')), cdpTimeoutMs);
      this.ws.onopen = () => { clearTimeout(timer); resolve(); };
      this.ws.onerror = error => { clearTimeout(timer); reject(error); };
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, cdpTimeoutMs);
    });
  }
  waitFor(method, sessionId, timeout = cdpTimeoutMs) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const poll = () => {
        const idx = this.events.findIndex(e => e.method === method && (!sessionId || e.sessionId === sessionId));
        if (idx >= 0) {
          const [event] = this.events.splice(idx, 1);
          resolve(event);
          return;
        }
        if (Date.now() - started > timeout) {
          reject(new Error(`Event timeout: ${method}`));
          return;
        }
        setTimeout(poll, 30);
      };
      poll();
    });
  }
}

async function run() {
  if (!chromePath) throw new Error(`Chrome/Edge not found. Set CHROME_PATH to a Chromium executable.`);
  const { server, port } = await startServer();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'marconi-qa-'));
  const debugPort = Number(process.env.QA_CHROME_DEBUG_PORT || 0) || await freePort();
  const chromeLog = createLogBuffer();
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--disable-dev-shm-usage',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--no-sandbox',
    '--remote-allow-origins=*',
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,980',
    'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  chrome.stdout.on('data', chunk => chromeLog.push(chunk));
  chrome.stderr.on('data', chunk => chromeLog.push(chunk));

  const warnings = [];
  const errors = [];
  const results = [];
  const screenshots = {};

  try {
    const wsUrl = await waitForDevTools(chrome, debugPort, chromeLog);
    const cdp = new CDP(wsUrl);
    await cdp.open();
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params = {}) => cdp.send(method, params, sessionId);

    await page('Page.enable');
    await page('Runtime.enable');
    await page('Log.enable');

    const collectEvents = setInterval(() => {
      for (let i = cdp.events.length - 1; i >= 0; i--) {
        const event = cdp.events[i];
        if (event.sessionId !== sessionId) continue;
        if (event.method === 'Runtime.consoleAPICalled') {
          const level = event.params.type;
          const text = (event.params.args || []).map(a => a.value || a.description || '').join(' ');
          if (level === 'error') errors.push(text);
          if (level === 'warning' || level === 'warn') warnings.push(text);
          cdp.events.splice(i, 1);
        }
        if (event.method === 'Runtime.exceptionThrown') {
          const details = event.params.exceptionDetails || {};
          const exception = details.exception || {};
          const location = [details.url, details.lineNumber != null ? details.lineNumber + 1 : null, details.columnNumber != null ? details.columnNumber + 1 : null]
            .filter(Boolean)
            .join(':');
          errors.push([details.text, exception.description || exception.value, location].filter(Boolean).join(' | ') || 'Runtime exception');
          cdp.events.splice(i, 1);
        }
        if (event.method === 'Log.entryAdded') {
          const entry = event.params.entry || {};
          if (entry.level === 'error') errors.push(entry.text);
          if (entry.level === 'warning') warnings.push(entry.text);
          cdp.events.splice(i, 1);
        }
      }
    }, 20);

    async function setViewport(width, height, mobile = false) {
      await page('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile
      });
    }

    async function navigate(url) {
      await page('Page.navigate', { url });
      await cdp.waitFor('Page.loadEventFired', sessionId, 20000);
      await page('Runtime.evaluate', {
        expression: 'new Promise(resolve => setTimeout(resolve, 900))',
        awaitPromise: true
      });
    }

    async function evaluate(expression) {
      const response = await page('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
      });
      if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.text || 'Evaluation failed');
      }
      return response.result.value;
    }

    async function screenshot(name) {
      const capture = await page('Page.captureScreenshot', { format: 'png', fromSurface: true });
      const file = path.join(outputDir, `${name}.png`);
      await fs.writeFile(file, Buffer.from(capture.data, 'base64'));
      screenshots[name] = file;
    }

    function pushResult(name, ok, detail = '') {
      results.push({ name, ok: !!ok, detail });
    }

    const baseUrl = `http://127.0.0.1:${port}/`;
    await setViewport(1440, 980, false);
    await navigate(baseUrl);

    const initial = await evaluate(`(() => {
      const topbar = document.querySelector('header.top-site-nav')?.getBoundingClientRect();
      const stylesheet = document.querySelector('link[href*="assets/styles.css"]')?.href || '';
      const bootstrap = document.querySelector('script[src*="assets/bootstrap.js"]')?.src || '';
      return {
        title: document.title,
        ready: document.readyState,
        hasData: !!window.DASHBOARD_DATA && !!window.__DATA__,
        dataError: !!document.querySelector('.dashboard-data-error'),
        page: document.body.dataset.page || 'cash',
        exportLoaded: !!document.querySelector('script[src*="export.js"]'),
        assetVersion: window.DASHBOARD_ASSET_VERSION || '',
        stylesheet,
        bootstrap,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        topbar: topbar ? { left: topbar.left, width: topbar.width } : null,
        active: document.querySelector('.page-tab.active')?.dataset.pageLink || null
      };
    })()`);
    pushResult('desktop_initial_load', initial.ready === 'complete' && initial.hasData && !initial.dataError, JSON.stringify(initial));
    pushResult('export_lazy_initial', initial.exportLoaded === false, `exportLoaded=${initial.exportLoaded}`);
    pushResult(
      'cache_versioned_assets',
      !!initial.assetVersion && initial.stylesheet.includes(`?v=${initial.assetVersion}`) && initial.bootstrap.includes(`?v=${initial.assetVersion}`),
      JSON.stringify({ assetVersion: initial.assetVersion, stylesheet: initial.stylesheet, bootstrap: initial.bootstrap })
    );
    pushResult('desktop_no_overflow_initial', initial.overflow <= 2, `overflow=${initial.overflow}`);
    await screenshot('phase5-desktop-cash');

    const topbarRects = [];
    for (const target of ['director', 'cash', 'fixed', 'dre', 'rj', 'cash']) {
      let fixedAnimationProbe = null;
      await evaluate(`document.querySelector('[data-page-link="${target}"]')?.click()`);
      if (target === 'fixed') {
        await page('Runtime.evaluate', {
          expression: `new Promise(resolve => {
            const started = performance.now();
            function poll() {
              if (document.body.dataset.page === 'fixed') {
                setTimeout(resolve, 180);
                return;
              }
              if (performance.now() - started > 2200) {
                resolve();
                return;
              }
              setTimeout(poll, 30);
            }
            poll();
          })`,
          awaitPromise: true
        });
        await evaluate(`window.replayFixedKpiAnimation && window.replayFixedKpiAnimation()`);
        fixedAnimationProbe = await evaluate(`new Promise(resolve => {
          const samples = [];
          function snap(label) {
            samples.push({
              label,
              page: document.body.dataset.page || '',
              token: window.__fixedKpiCountupToken || '',
              phase4: !!window.__phase4FixedKpiCountupLoaded,
              values: [...document.querySelectorAll('.fixed-kpi .val')].map(el => ({
                text: (el.textContent || '').trim(),
                final: el.dataset.v41Final || el.dataset.v67Final || '',
                active: el.dataset.phase4FixedKpiActive || '',
                done: el.dataset.phase4FixedKpiDone || '',
                v41Done: el.dataset.v41Done || '',
                v41Busy: el.dataset.v41Busy || '',
                reduced: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
              }))
            });
          }
          snap('body-fixed+180ms');
          setTimeout(() => snap('body-fixed+260ms'), 80);
          setTimeout(() => snap('body-fixed+420ms'), 240);
          setTimeout(() => resolve(samples), 260);
        })`);
      }
      await page('Runtime.evaluate', {
        expression: `new Promise(resolve => setTimeout(resolve, ${target === 'fixed' ? 1350 : 950}))`,
        awaitPromise: true
      });
      const state = await evaluate(`(() => {
        const topbar = document.querySelector('header.top-site-nav')?.getBoundingClientRect();
        const active = document.querySelector('.page-tab.active')?.dataset.pageLink || null;
        const dreEl = document.getElementById('dre-page');
        const rjEl = document.getElementById('rj-page');
        const visible = {
          cash: [...document.querySelectorAll('#kpis,#monthly,#table')].some(el => getComputedStyle(el).display !== 'none'),
          fixed: getComputedStyle(document.getElementById('fixed-costs')).display !== 'none',
          director: getComputedStyle(document.getElementById('directoria')).display !== 'none',
          dre: dreEl ? getComputedStyle(dreEl).display !== 'none' : false,
          rj: rjEl ? getComputedStyle(rjEl).display !== 'none' : false
        };
        return {
          page: document.body.dataset.page,
          title: document.title,
          active,
          visible,
          topbar: topbar ? { left: topbar.left, width: topbar.width } : null,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          fixedKpis: document.querySelectorAll('.fixed-kpi').length,
          fixedKpiValues: [...document.querySelectorAll('.fixed-kpi .val')].map(el => ({
            text: (el.textContent || '').trim(),
            final: el.dataset.v41Final || el.dataset.v67Final || ''
          })),
          directorKpis: document.querySelectorAll('.director-kpi').length,
          dreKpis: document.querySelectorAll('#dreKpis .dre-kpi').length,
          dreTable: !!document.querySelector('#dreTableWrap .dre-table'),
          dreResultRows: document.querySelectorAll('.dre-row--resultado, .dre-row--subtotal').length,
          dreAvColumn: !!document.querySelector('#dreTableWrap .dre-th-av') && document.querySelectorAll('#dreTableWrap .dre-td-av').length >= 3,
          dreMargins: document.querySelectorAll('#dreMargins .dre-margin-card').length,
          dreCmvBar: !!document.querySelector('#dreTableWrap .dre-row--cmv .dre-cmv-bar-fill'),
          dreTrend: !!document.querySelector('#dreTrend .dre-trend-svg') && !!document.querySelector('#dreTrend .dre-trend-note'),
          dreBridge: !!document.querySelector('#dreBridge .dre-wf-svg') && document.querySelectorAll('#dreBridge .dre-bridge-row').length >= 5 && !!document.querySelector('#dreBridge .dre-bridge-tab'),
          cashAccColumn: document.querySelectorAll('#tableBody .cash-acc').length,
          dailyPanel: !!document.querySelector('#dailyPanel .daily-svg') && document.querySelectorAll('#dailyPanel .daily-top-row').length >= 1,
          projectionApparatusHonest: (() => {
            // (D2) Sem dado de projeção, o aparato precisa estar honesto:
            //  · atalho "Projeção" escondido; · sem divisor REAL|PROJEÇÃO no gráfico;
            //  · sem linha "PROJEÇÃO ANUAL" na tabela; · rótulo do ano = "Acumulado realizado".
            const monthly = (window.DASHBOARD_DATA && window.DASHBOARD_DATA.fluxo_caixa && window.DASHBOARD_DATA.fluxo_caixa.monthly) || (window.__DATA__ && window.__DATA__.monthly) || {};
            let hasProj = false;
            for (let m = 7; m <= 12; m++) { const d = monthly[m] || monthly[String(m)]; if (d && ((Number(d.entradas) || 0) !== 0 || (Number(d.saidas) || 0) !== 0)) hasProj = true; }
            const projBtn = document.querySelector('[data-period="projection"]');
            const projHidden = !projBtn || getComputedStyle(projBtn).display === 'none';
            const yearBtnTxt = (document.querySelector('[data-period="year"] span')?.textContent || '').trim();
            // Linha-total "PROJEÇÃO ANUAL" (não as pílulas de status "Projeção" dos meses 7–12, que são legítimas).
            const tableHasProjAnnual = /PROJE[ÇC][AÃ]O ANUAL/i.test(document.getElementById('tableBody')?.textContent || '');
            // Divisor REAL|PROJEÇÃO desenhado no gráfico de barras (texto dentro do SVG).
            const barTxt = document.getElementById('barChart')?.textContent || '';
            const barHasDivider = /PROJE[ÇC][AÃ]O/i.test(barTxt) && /\bREAL\b/.test(barTxt);
            if (hasProj) return true; // com dado, o aparato pode aparecer (não testamos esse caminho aqui)
            return projHidden && /Acumulado realizado/i.test(yearBtnTxt) && !tableHasProjAnnual && !barHasDivider;
          })(),
          rjKpis: document.querySelectorAll('#rjKpis .rj-kpi').length,
          rjBanner: !!document.querySelector('#rjBanner .rj-banner-flag'),
          rjCostRows: document.querySelectorAll('#rjCostBlock .rj-cost-row').length,
          rjCostTotal: !!document.querySelector('#rjCostBlock .rj-cost-total'),
          rjSplitBar: !!document.querySelector('#rjCostBlock .rj-split-rj') && !!document.querySelector('#rjCostBlock .rj-split-op'),
          rjOpChart: !!document.querySelector('#rjOpChart .rj-chart-svg'),
          rjRunwayBlocked: !!document.querySelector('#rjRunway .rj-blocked-tag'),
          rjReconSeal: !!document.querySelector('#rjRecon .rj-recon-seal'),
          rjAuditNote: !!document.querySelector('#rjCostBlock .rj-audit-note'),
          statusSeal: (() => {
            const sealId = { cash: 'cashStatusSeal', fixed: 'fixedStatusSeal', director: 'directorStatusSeal', dre: 'dreStatusSeal', rj: 'rjStatusSeal' }[document.body.dataset.page];
            const el = sealId && document.getElementById(sealId);
            return !!(el && el.classList.contains('status-seal') && el.querySelector('.status-seal-word') && (el.querySelector('.status-seal-word').textContent || '').trim() && el.dataset.tone);
          })(),
          a11y: {
            tabs: [...document.querySelectorAll('[data-page-link]')].every(el => el.getAttribute('role') === 'tab' && el.hasAttribute('aria-selected') && el.hasAttribute('aria-controls')),
            cards: [...document.querySelectorAll('.fixed-kpi, .director-kpi')].every(el => el.hasAttribute('tabindex') && el.hasAttribute('aria-label')),
            regions: [...document.querySelectorAll('.data-table, .fixed-heatmap-wrap')].every(el => el.getAttribute('role') === 'region')
          },
          cache: window.__MARCONI_PHASE3_QA ? window.__MARCONI_PHASE3_QA.cache() : null
        };
      })()`);
      topbarRects.push({ target, rect: state.topbar });
      pushResult(`nav_${target}`, state.page === target && state.active === target, JSON.stringify(state));
      pushResult(`visible_${target}`, state.visible[target] === true, JSON.stringify(state.visible));
      pushResult(`overflow_${target}`, state.overflow <= 2, `overflow=${state.overflow}`);
      const titleLabels = { director: 'Diretoria', cash: 'Fluxo de Caixa', fixed: 'Custos Fixos', dre: 'DRE', rj: 'Recuperação Judicial' };
      pushResult(`title_${target}`, state.title === `Marconi Foods · ${titleLabels[target]} · 2026`, state.title);
      // Selo de status padronizado (E1) — presente e populado nas 4 páginas.
      pushResult(`status_seal_present_${target}`, state.statusSeal === true, `statusSeal=${state.statusSeal}`);
      if (target === 'cash') {
        pushResult('cash_running_total_column', state.cashAccColumn >= 12, `cashAccColumn=${state.cashAccColumn}`);
        // (D1) Painel de visão diária do mês renderizado (curva + top dias de desembolso).
        pushResult('daily_panel_present', state.dailyPanel === true, `dailyPanel=${state.dailyPanel}`);
        // (D2) Aparato de projeção honesto quando não há dado de projeção.
        pushResult('projection_apparatus_honest', state.projectionApparatusHonest === true, `projectionApparatusHonest=${state.projectionApparatusHonest}`);
      }
      if (target === 'dre') {
        pushResult('dre_render_on_active', state.dreKpis >= 4 && state.dreTable === true, JSON.stringify({ kpis: state.dreKpis, table: state.dreTable, resultRows: state.dreResultRows }));
        pushResult('dre_result_rows_present', state.dreResultRows >= 3, `resultRows=${state.dreResultRows}`);
        pushResult('dre_av_column', state.dreAvColumn === true, `dreAvColumn=${state.dreAvColumn}`);
        pushResult('dre_margins_band', state.dreMargins >= 3, `dreMargins=${state.dreMargins}`);
        pushResult('dre_cmv_highlight', state.dreCmvBar === true, `dreCmvBar=${state.dreCmvBar}`);
        pushResult('dre_margin_erosion_trend', state.dreTrend === true, `dreTrend=${state.dreTrend}`);
        // (B1) Ponte Caixa × Competência (waterfall) presente com os 5 blocos e seletor de mês.
        pushResult('bridge_present', state.dreBridge === true, `dreBridge=${state.dreBridge}`);
        await screenshot('dre-desktop');
      }
      if (target === 'rj') {
        // Asserts da Onda 3 (espelham o padrão do dre).
        pushResult('rj_nav', state.page === 'rj' && state.active === 'rj', JSON.stringify({ page: state.page, active: state.active }));
        pushResult('rj_visible', state.visible.rj === true, JSON.stringify(state.visible));
        pushResult('rj_no_overflow', state.overflow <= 2, `overflow=${state.overflow}`);
        pushResult(
          'rj_render_on_active',
          state.rjKpis >= 4 && state.rjBanner === true && state.rjCostRows >= 4 && state.rjCostTotal === true &&
          state.rjSplitBar === true && state.rjOpChart === true && state.rjRunwayBlocked === true &&
          state.rjReconSeal === true && state.rjAuditNote === true,
          JSON.stringify({
            kpis: state.rjKpis, banner: state.rjBanner, costRows: state.rjCostRows, costTotal: state.rjCostTotal,
            splitBar: state.rjSplitBar, opChart: state.rjOpChart, runwayBlocked: state.rjRunwayBlocked,
            reconSeal: state.rjReconSeal, auditNote: state.rjAuditNote
          })
        );
        await screenshot('rj-desktop');
      }
      if (target === 'fixed') {
        pushResult('fixed_render_on_active', state.fixedKpis >= 4, `fixedKpis=${state.fixedKpis}`);
        pushResult('fixed_accessibility_labels', state.a11y.tabs && state.a11y.cards && state.a11y.regions, JSON.stringify(state.a11y));
        pushResult(
          'fixed_kpi_countup_not_stuck',
          Array.isArray(fixedAnimationProbe) && fixedAnimationProbe.some(sample => Array.isArray(sample.values) && sample.values.every(item => item.final && item.text && item.text !== 'R$ 0' && item.text !== '+R$ 0' && item.text !== '0.0%')),
          JSON.stringify(fixedAnimationProbe)
        );
        pushResult(
          'fixed_kpi_countup_finishes_at_final',
          state.fixedKpiValues.length >= 4 && state.fixedKpiValues.every(item => !item.final || item.text === item.final),
          JSON.stringify(state.fixedKpiValues)
        );
        const fixedViews = await evaluate(`(async () => {
          const views = ['overview', 'control', 'matrix'];
          const states = [];
          for (const view of views) {
            document.querySelector('.fixed-view-tab[data-fixed-view="' + view + '"]')?.click();
            await new Promise(resolve => setTimeout(resolve, 220));
            const visibleSlots = [...document.querySelectorAll('.fixed-costs-grid > [data-fixed-panel]')]
              .filter(el => {
                const style = getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.display !== 'none' && rect.width > 1 && rect.height > 1;
              })
              .map(el => el.dataset.fixedSlot || el.dataset.fixedPanel || '');
            states.push({
              target: view,
              view: document.body.dataset.fixedView || '',
              active: document.querySelector('.fixed-view-tab.active')?.dataset.fixedView || '',
              visibleSlots
            });
          }
          return states;
        })()`);
        const fixedExpectations = {
          overview: { show: ['kpis', 'chart', 'composition', 'analysis'], hide: ['deviations', 'sensitive', 'matrix'] },
          control: { show: ['kpis', 'deviations', 'sensitive', 'analysis'], hide: ['chart', 'composition', 'matrix'] },
          matrix: { show: ['kpis', 'matrix', 'analysis'], hide: ['chart', 'composition', 'deviations', 'sensitive'] }
        };
        const fixedTabsOk = fixedViews.every(item => item.view === item.target && item.active === item.target);
        const fixedPanelsOk = fixedViews.every(item => {
          const expected = fixedExpectations[item.target];
          return expected.show.every(slot => item.visibleSlots.includes(slot)) &&
            expected.hide.every(slot => !item.visibleSlots.includes(slot));
        });
        pushResult('fixed_internal_tabs_state', fixedTabsOk, JSON.stringify(fixedViews));
        pushResult('fixed_internal_tabs_panels', fixedPanelsOk, JSON.stringify(fixedViews));
      }
      if (target === 'director') pushResult('director_render_on_active', state.directorKpis >= 1, `directorKpis=${state.directorKpis}`);
    }

    const stable = topbarRects.every(item => {
      if (!item.rect || !initial.topbar) return false;
      return Math.abs(item.rect.left - initial.topbar.left) <= 1 && Math.abs(item.rect.width - initial.topbar.width) <= 2;
    });
    pushResult('topbar_stable_desktop', stable, JSON.stringify(topbarRects));

    const controlledUx = await evaluate(`(async () => {
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      document.querySelector('[data-page-link="cash"]')?.click();
      await sleep(450);
      const button = document.getElementById('monthSelectBtn');
      const select = document.getElementById('monthSelect');
      button?.click();
      await sleep(80);
      const openAfterClick = !!select?.classList.contains('open') && button?.getAttribute('aria-expanded') === 'true';
      document.querySelector('.dashboard-main')?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await sleep(80);
      const closedByOutside = !select?.classList.contains('open') && button?.getAttribute('aria-expanded') === 'false';
      button?.click();
      await sleep(80);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(80);
      const closedByEscape = !select?.classList.contains('open') && button?.getAttribute('aria-expanded') === 'false';
      document.getElementById('filterReset')?.click();
      await sleep(260);
      const toast = document.querySelector('.toast-v41');
      const resetToast = !!toast && toast.classList.contains('show') && /Filtros resetados/.test(toast.textContent || '');
      document.getElementById('presentationMode')?.click();
      await sleep(260);
      const sidebar = document.querySelector('.control-sidebar');
      const presentationActive = document.body.classList.contains('presentation-mode');
      const sidebarHidden = !!sidebar && (getComputedStyle(sidebar).display === 'none' || sidebar.getAttribute('aria-hidden') === 'true');
      document.getElementById('presentationExit')?.click();
      await sleep(260);
      return {
        page: document.body.dataset.page || '',
        openAfterClick,
        closedByOutside,
        closedByEscape,
        resetToast,
        presentationActive,
        sidebarHidden,
        presentationRestored: !document.body.classList.contains('presentation-mode'),
        sidebarAria: sidebar?.getAttribute('aria-hidden') || ''
      };
    })()`);
    pushResult('period_dropdown_open_close', controlledUx.openAfterClick && controlledUx.closedByOutside && controlledUx.closedByEscape, JSON.stringify(controlledUx));
    pushResult('filter_reset_toast', controlledUx.resetToast && controlledUx.page === 'cash', JSON.stringify(controlledUx));
    pushResult('presentation_mode_sidebar_control', controlledUx.presentationActive && controlledUx.sidebarHidden && controlledUx.presentationRestored && controlledUx.sidebarAria === 'false', JSON.stringify(controlledUx));

    const telemetry = await evaluate(`(async () => {
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      const events = [];
      const unsubscribe = window.MarconiEvents?.on('page:changed', event => events.push(event.detail));
      const beforeMeasures = performance.getEntriesByName('marconi:page-change').length;
      window.setDashboardPage?.('director');
      await sleep(850);
      if (typeof unsubscribe === 'function') unsubscribe();
      return {
        hasEvents: !!window.MarconiEvents,
        hasPerf: !!window.MarconiPerf,
        page: document.body.dataset.page || '',
        events,
        newMeasures: performance.getEntriesByName('marconi:page-change').length - beforeMeasures
      };
    })()`);
    pushResult('custom_events_and_perf_marks', telemetry.hasEvents && telemetry.hasPerf && telemetry.page === 'director' && telemetry.events.length >= 1 && telemetry.newMeasures >= 1, JSON.stringify(telemetry));

    await evaluate(`document.querySelector('[data-page-link="fixed"]')?.click()`);
    await page('Runtime.evaluate', { expression: 'new Promise(resolve => setTimeout(resolve, 850))', awaitPromise: true });
    await screenshot('phase5-desktop-fixed');

    await setViewport(390, 900, true);
    await navigate(baseUrl);
    const mobile = await evaluate(`(() => {
      const topbar = document.querySelector('header.top-site-nav')?.getBoundingClientRect();
      const switcher = document.querySelector('.page-switcher')?.getBoundingClientRect();
      return {
        page: document.body.dataset.page || 'cash',
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        topbar: topbar ? { left: topbar.left, right: topbar.right, width: topbar.width, height: topbar.height } : null,
        switcher: switcher ? { width: switcher.width, height: switcher.height } : null,
        active: document.querySelector('.page-tab.active')?.dataset.pageLink || null
      };
    })()`);
    pushResult('mobile_initial_load', mobile.page === 'cash' && mobile.active === 'cash', JSON.stringify(mobile));
    pushResult('mobile_no_overflow', mobile.overflow <= 2, `overflow=${mobile.overflow}`);

    await evaluate(`document.querySelector('[data-page-link="director"]')?.click()`);
    await page('Runtime.evaluate', { expression: 'new Promise(resolve => setTimeout(resolve, 850))', awaitPromise: true });
    const mobileDirector = await evaluate(`(() => ({
      page: document.body.dataset.page,
      active: document.querySelector('.page-tab.active')?.dataset.pageLink || null,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      visible: getComputedStyle(document.getElementById('directoria')).display !== 'none'
    }))()`);
    pushResult('mobile_director_nav', mobileDirector.page === 'director' && mobileDirector.active === 'director' && mobileDirector.visible, JSON.stringify(mobileDirector));
    pushResult('mobile_director_no_overflow', mobileDirector.overflow <= 2, `overflow=${mobileDirector.overflow}`);
    await screenshot('phase5-mobile-director');

    await evaluate(`document.querySelector('[data-page-link="fixed"]')?.click()`);
    await page('Runtime.evaluate', { expression: 'new Promise(resolve => setTimeout(resolve, 1050))', awaitPromise: true });
    const mobileFixed = await evaluate(`(() => {
      const topbar = document.querySelector('header.top-site-nav')?.getBoundingClientRect();
      const firstKpi = document.querySelector('.fixed-kpi')?.getBoundingClientRect();
      const toolbar = document.querySelector('.fixed-page-toolbar')?.getBoundingClientRect();
      const execSummary = document.querySelector('#fixedCostsExecutiveSummary')?.getBoundingClientRect();
      const tabs = [...document.querySelectorAll('.fixed-view-tab')].map(tab => tab.getBoundingClientRect().height);
      return {
        page: document.body.dataset.page,
        active: document.querySelector('.page-tab.active')?.dataset.pageLink || null,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        visible: getComputedStyle(document.getElementById('fixed-costs')).display !== 'none',
        fixedKpis: document.querySelectorAll('.fixed-kpi').length,
        execSummary: !!execSummary && execSummary.width <= window.innerWidth,
        topbarHeight: topbar ? topbar.height : 0,
        firstKpiWidth: firstKpi ? firstKpi.width : 0,
        toolbarWidth: toolbar ? toolbar.width : 0,
        minFixedTabHeight: tabs.length ? Math.min(...tabs) : 0
      };
    })()`);
    pushResult('mobile_fixed_nav', mobileFixed.page === 'fixed' && mobileFixed.active === 'fixed' && mobileFixed.visible, JSON.stringify(mobileFixed));
    pushResult('mobile_fixed_no_overflow', mobileFixed.overflow <= 2, `overflow=${mobileFixed.overflow}`);
    pushResult('mobile_fixed_kpis_fit', mobileFixed.fixedKpis >= 4 && mobileFixed.firstKpiWidth <= 390 && mobileFixed.execSummary, JSON.stringify(mobileFixed));
    pushResult('mobile_fixed_hit_targets', mobileFixed.minFixedTabHeight >= 40, `minFixedTabHeight=${mobileFixed.minFixedTabHeight}`);

    await evaluate(`document.querySelector('[data-page-link="dre"]')?.click()`);
    await page('Runtime.evaluate', { expression: 'new Promise(resolve => setTimeout(resolve, 850))', awaitPromise: true });
    const mobileDre = await evaluate(`(() => ({
      page: document.body.dataset.page,
      active: document.querySelector('.page-tab.active')?.dataset.pageLink || null,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      visible: getComputedStyle(document.getElementById('dre-page')).display !== 'none',
      kpis: document.querySelectorAll('#dreKpis .dre-kpi').length,
      table: !!document.querySelector('#dreTableWrap .dre-table')
    }))()`);
    pushResult('mobile_dre_nav', mobileDre.page === 'dre' && mobileDre.active === 'dre' && mobileDre.visible, JSON.stringify(mobileDre));
    pushResult('mobile_dre_no_overflow', mobileDre.overflow <= 2, `overflow=${mobileDre.overflow}`);
    pushResult('mobile_dre_render', mobileDre.kpis >= 4 && mobileDre.table === true, JSON.stringify(mobileDre));
    await screenshot('dre-mobile');

    await evaluate(`document.querySelector('[data-page-link="rj"]')?.click()`);
    await page('Runtime.evaluate', { expression: 'new Promise(resolve => setTimeout(resolve, 850))', awaitPromise: true });
    const mobileRj = await evaluate(`(() => ({
      page: document.body.dataset.page,
      active: document.querySelector('.page-tab.active')?.dataset.pageLink || null,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      visible: getComputedStyle(document.getElementById('rj-page')).display !== 'none',
      kpis: document.querySelectorAll('#rjKpis .rj-kpi').length,
      costRows: document.querySelectorAll('#rjCostBlock .rj-cost-row').length
    }))()`);
    pushResult('mobile_rj_nav', mobileRj.page === 'rj' && mobileRj.active === 'rj' && mobileRj.visible, JSON.stringify(mobileRj));
    pushResult('mobile_rj_no_overflow', mobileRj.overflow <= 2, `overflow=${mobileRj.overflow}`);
    pushResult('mobile_rj_render', mobileRj.kpis >= 4 && mobileRj.costRows >= 4, JSON.stringify(mobileRj));
    await screenshot('rj-mobile');
    await screenshot('phase5-mobile-fixed');

    // ===== Modo Cinema (deck executivo) =====
    await setViewport(1440, 980, false);
    await navigate(baseUrl);
    const cinema = await evaluate(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      if (typeof window.MarconiCinema === 'undefined') return { api: false };
      const btn = document.getElementById('cineOpenBtn');
      window.MarconiCinema.open();
      await sleep(400);
      const overlay = document.getElementById('cineOverlay');
      const shown = !!overlay && overlay.classList.contains('show');
      const slides = document.querySelectorAll('.cine-slide').length;
      const autoplay = !!overlay && overlay.classList.contains('cine-autoplaying');
      // navega 1 slide e verifica que muda o ativo
      const firstActive = document.querySelector('.cine-slide.active')?.getAttribute('data-i');
      document.getElementById('cineNext')?.click();
      await sleep(200);
      const secondActive = document.querySelector('.cine-slide.active')?.getAttribute('data-i');
      // count-up presente
      const hasCount = !!document.querySelector('[data-cine-count]');
      // graficos vivos presentes em algum slide
      const hasCharts = !!document.querySelector('.cine-line, .cine-hbars, .cine-duo, .cine-wf, .cine-pulse, .cine-mdonut, .cine-hm, .cine-spark');
      // theme-aware: cor do texto do slide acompanha o tema (nao e' branco fixo no claro)
      window.MarconiTheme && window.MarconiTheme.apply('light');
      await sleep(150);
      const lightColor = getComputedStyle(document.querySelector('.cine-h1, .cine-h2') || document.body).color;
      window.MarconiTheme && window.MarconiTheme.apply('dark');
      // Esc fecha
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(300);
      const closed = !document.body.classList.contains('cine-active');
      return { api: true, hasBtn: !!btn, shown, slides, autoplay, navWorks: firstActive !== secondActive, hasCount, hasCharts, lightColor, closed };
    })()`);
    pushResult('cinema_opens', cinema.api && cinema.hasBtn && cinema.shown && cinema.slides >= 5, JSON.stringify(cinema));
    pushResult('cinema_autoplay_on_open', cinema.autoplay === true, `autoplay=${cinema.autoplay}`);
    pushResult('cinema_nav_works', cinema.navWorks === true, `nav=${cinema.navWorks}`);
    pushResult('cinema_live_charts_and_countup', cinema.hasCount === true && cinema.hasCharts === true, `count=${cinema.hasCount} charts=${cinema.hasCharts}`);
    pushResult('cinema_theme_aware', /rgb\(2[0-9],/.test(cinema.lightColor || '') || /rgb\(1[0-9],/.test(cinema.lightColor || ''), `lightColor=${cinema.lightColor}`);
    pushResult('cinema_esc_closes', cinema.closed === true, `closed=${cinema.closed}`);

    clearInterval(collectEvents);
    const relevantErrors = errors.filter(Boolean).filter(e => !/favicon/i.test(e));
    const relevantWarnings = warnings.filter(Boolean).filter(e => !/favicon/i.test(e));
    pushResult('console_no_relevant_errors', relevantErrors.length === 0, relevantErrors.join(' | '));

    const passed = results.every(r => r.ok);
    console.log(JSON.stringify({
      passed,
      url: baseUrl,
      results,
      warnings: relevantWarnings.slice(0, 10),
      errors: relevantErrors.slice(0, 10),
      screenshots
    }, null, 2));
    process.exitCode = passed ? 0 : 1;
  } finally {
    if (!chrome.killed) chrome.kill();
    server.close();
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
