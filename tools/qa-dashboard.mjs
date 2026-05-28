import http from 'node:http';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
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

function waitForDevTools(chrome) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Chrome DevTools timeout')), 15000);
    chrome.stderr.on('data', chunk => {
      buffer += chunk.toString();
      const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.on('exit', code => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited before DevTools was ready: ${code}`));
    });
  });
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
      const timer = setTimeout(() => reject(new Error('WebSocket timeout')), 10000);
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
      }, 15000);
    });
  }
  waitFor(method, sessionId, timeout = 15000) {
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
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,980',
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const warnings = [];
  const errors = [];
  const results = [];
  const screenshots = {};

  try {
    const wsUrl = await waitForDevTools(chrome);
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
          errors.push(event.params.exceptionDetails?.text || 'Runtime exception');
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
    for (const target of ['director', 'cash', 'fixed', 'cash']) {
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
        const visible = {
          cash: [...document.querySelectorAll('#kpis,#monthly,#table')].some(el => getComputedStyle(el).display !== 'none'),
          fixed: getComputedStyle(document.getElementById('fixed-costs')).display !== 'none',
          director: getComputedStyle(document.getElementById('directoria')).display !== 'none'
        };
        return {
          page: document.body.dataset.page,
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
      }
      if (target === 'director') pushResult('director_render_on_active', state.directorKpis >= 1, `directorKpis=${state.directorKpis}`);
    }

    const stable = topbarRects.every(item => {
      if (!item.rect || !initial.topbar) return false;
      return Math.abs(item.rect.left - initial.topbar.left) <= 1 && Math.abs(item.rect.width - initial.topbar.width) <= 2;
    });
    pushResult('topbar_stable_desktop', stable, JSON.stringify(topbarRects));

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
    await screenshot('phase5-mobile-fixed');

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
    chrome.kill();
    server.close();
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
