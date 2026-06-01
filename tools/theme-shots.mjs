/* Screenshots dark + claro das 3 paginas (desktop + mobile) para a Fase 6.
   Reusa o esquema servidor + Chrome headless (CDP) do qa-dashboard.mjs.
   Saida: .qa-output/theme/<tema>-<pagina>-<viewport>.png
   Uso: node tools/theme-shots.mjs */
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
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);
const chromePath = chromeCandidates.find(c => fssync.existsSync(c));
const outputDir = path.join(repoRoot, '.qa-output', 'theme');
await fs.mkdir(outputDir, { recursive: true });

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
  }[ext] || 'application/octet-stream';
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') pathname = '/index.html';
      const requested = path.normalize(path.join(repoRoot, pathname));
      if (!requested.startsWith(repoRoot)) { res.writeHead(403); res.end('Forbidden'); return; }
      const body = await fs.readFile(requested);
      res.writeHead(200, { 'content-type': contentType(requested), 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = http.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForDevTools(debugPort, started = Date.now()) {
  while (Date.now() - started < 30000) {
    try {
      const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`, { signal: AbortSignal.timeout(1500) });
      const p = await r.json();
      if (p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch { await sleep(350); }
  }
  throw new Error('DevTools timeout');
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map();
    this.ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result || {});
      }
    };
  }
  open() {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('ws timeout')), 15000);
      this.ws.onopen = () => { clearTimeout(t); resolve(); };
      this.ws.onerror = err => { clearTimeout(t); reject(err); };
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`timeout ${method}`)); } }, 15000);
    });
  }
}

async function run() {
  if (!chromePath) throw new Error('Chrome/Edge nao encontrado. Defina CHROME_PATH.');
  const { server, port } = await startServer();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'marconi-shots-'));
  const debugPort = await freePort();
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
    '--no-default-browser-check', '--no-sandbox', '--remote-allow-origins=*',
    '--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`, '--window-size=1440,980', 'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const saved = [];
  const darkReport = {};
  try {
    const wsUrl = await waitForDevTools(debugPort);
    const cdp = new CDP(wsUrl); await cdp.open();
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const page = (m, p = {}) => cdp.send(m, p, sessionId);
    await page('Page.enable'); await page('Runtime.enable');

    const setViewport = (width, height, mobile = false) =>
      page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    const evaluate = async expression => {
      const r = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval failed');
      return r.result.value;
    };
    const navigate = async url => {
      await page('Page.navigate', { url });
      await sleep(1500);
    };
    const shot = async name => {
      const cap = await page('Page.captureScreenshot', { format: 'png', fromSurface: true });
      const file = path.join(outputDir, `${name}.png`);
      await fs.writeFile(file, Buffer.from(cap.data, 'base64'));
      saved.push(name);
    };
    // screenshot da PAGINA INTEIRA (alem do viewport) — para conferir sub-cards abaixo da dobra
    const shotFull = async name => {
      const m = await page('Page.getLayoutMetrics');
      const h = Math.min(Math.ceil((m.cssContentSize || m.contentSize).height), 8000);
      const w = Math.ceil((m.cssContentSize || m.contentSize).width);
      const cap = await page('Page.captureScreenshot', {
        format: 'png', fromSurface: true, captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: w, height: h, scale: 1 }
      });
      const file = path.join(outputDir, `${name}.png`);
      await fs.writeFile(file, Buffer.from(cap.data, 'base64'));
      saved.push(name);
    };
    const goPage = async link => {
      await evaluate(`document.querySelector('[data-page-link="${link}"]')?.click()`);
      await sleep(1200);
      await evaluate(`window.scrollTo(0,0)`);
      await sleep(150);
    };

    const scanExpr = `(function(){
      function lum(rgb){var m=rgb.match(/[\\d.]+/g); if(!m) return 1; var a=m[3]==null?1:+m[3]; if(a<0.5) return 1; return (0.299*+m[0]+0.587*+m[1]+0.114*+m[2])/255;}
      var darkBg=[], lowText=[];
      document.querySelectorAll('body *').forEach(function(el){
        var r=el.getBoundingClientRect(); if(r.width<70||r.height<20) return;
        var cs=getComputedStyle(el);
        if(cs.visibility==='hidden'||cs.opacity==='0') return;
        var bg=cs.backgroundColor; var bi=cs.backgroundImage;
        var dark=lum(bg)<0.25;
        if(!dark && bi!=='none'){ var nums=bi.match(/rgba?\\(([^)]+)\\)/g)||[]; dark=nums.some(function(c){var m=c.match(/[\\d.]+/g); if(!m)return false; var a=m[3]==null?1:+m[3]; return a>0.55 && (0.299*+m[0]+0.587*+m[1]+0.114*+m[2])/255<0.28;}); }
        var cls=(typeof el.className==='string'?el.className:el.tagName).split(' ').slice(0,2).join('.');
        if(dark){ darkBg.push(cls); }
        // texto de baixo contraste: texto claro (lum alto) com texto direto e sem fundo escuro proprio
        var hasText = [].some.call(el.childNodes, function(n){return n.nodeType===3 && n.nodeValue.trim().length>1;});
        if(hasText && lum(cs.color)>0.72 && lum(bg)>0.6){ lowText.push(cls+' ['+cs.color+']'); }
      });
      return { darkBg:[...new Set(darkBg)].slice(0,20), lowText:[...new Set(lowText)].slice(0,20) };
    })()`;

    const baseUrl = `http://127.0.0.1:${port}/`;
    const themes = ['dark', 'light'];
    const pages = ['cash', 'director', 'fixed'];

    for (const theme of themes) {
      // tema aplicado antes do load (anti-flash) + navegacao fresca
      await setViewport(1440, 980, false);
      await navigate(baseUrl);
      await evaluate(`(function(){ try{ if('${theme}'==='light') localStorage.setItem('marconi-theme','light'); else localStorage.removeItem('marconi-theme'); }catch(e){} window.MarconiTheme && window.MarconiTheme.apply('${theme}'); })()`);
      await sleep(400);
      for (const pg of pages) {
        await goPage(pg);
        await shot(`${theme}-${pg}-desktop`);
        if (pg === 'cash') {
          // topbar em estado de scroll (body.scrolled) — bug reportado: ficava preta
          await evaluate(`document.body.classList.add('scrolled'); (document.scrollingElement||document.documentElement).scrollTop=300;`);
          await sleep(500);
          await shot(`${theme}-topbar-scrolled`);
          await evaluate(`document.body.classList.remove('scrolled'); (document.scrollingElement||document.documentElement).scrollTop=0;`);
          await sleep(200);
        }
        if (theme === 'light') {
          try { darkReport[pg] = await evaluate(scanExpr); } catch { darkReport[pg] = ['scan-failed']; }
        }
        if (pg === 'cash') {
          // rola ate o grafico mensal (SVG) para conferir tinta dos eixos/labels
          await evaluate(`(function(){var s=document.getElementById('monthly'); if(s){var t=s.getBoundingClientRect().top+ (window.pageYOffset||document.documentElement.scrollTop); (document.scrollingElement||document.documentElement).scrollTop = Math.max(0,t-70);}})()`);
          await sleep(700);
          await shot(`${theme}-cash-charts`);
          // rola ate o ranking de rubricas (o que o usuario viu "apagado")
          await evaluate(`(function(){var s=document.querySelector('.rank-item'); if(s){var t=s.getBoundingClientRect().top+(window.pageYOffset||document.documentElement.scrollTop); (document.scrollingElement||document.documentElement).scrollTop=Math.max(0,t-140);}})()`);
          await sleep(600);
          await shot(`${theme}-cash-ranking`);
          // insights executivos ("O que os numeros estao dizendo")
          await evaluate(`(function(){var s=document.querySelector('.executive-card'); if(s){var t=s.getBoundingClientRect().top+(window.pageYOffset||document.documentElement.scrollTop); (document.scrollingElement||document.documentElement).scrollTop=Math.max(0,t-120);}})()`);
          await sleep(600);
          await shot(`${theme}-cash-insights`);
          // cards mensais (Concentracao mensal de saidas) — mini-boxes SAIDAS/RESULTADO
          await evaluate(`(function(){var s=document.querySelector('.monthly-cards-mode, #v23Heatmap'); if(s){var t=s.getBoundingClientRect().top+(window.pageYOffset||document.documentElement.scrollTop); (document.scrollingElement||document.documentElement).scrollTop=Math.max(0,t-120);}})()`);
          await sleep(600);
          await shot(`${theme}-cash-monthly-cards`);
          await evaluate(`(document.scrollingElement||document.documentElement).scrollTop=0`);
          await sleep(200);
        }
      }
      // Custos Fixos: sub-views Desvios (tabela) e Mapa (chips de desvio)
      await goPage('fixed');
      for (const view of ['control', 'matrix']) {
        await evaluate(`window.setFixedCostView && window.setFixedCostView('${view}')`);
        await sleep(1000);
        await evaluate(`document.getElementById('fixed-costs')?.scrollIntoView({block:'start'}); window.scrollBy(0,-90);`);
        await sleep(250);
        await shot(`${theme}-fixed-${view}-desktop`);
        if (theme === 'light') { try { darkReport['fixed-' + view] = await evaluate(scanExpr); } catch {} }
        if (view === 'matrix') {
          await evaluate(`(function(){var s=document.querySelector('.fixed-heatmap, .fixed-heatmap-wrap'); if(s){var t=s.getBoundingClientRect().top+(window.pageYOffset||document.documentElement.scrollTop); (document.scrollingElement||document.documentElement).scrollTop=Math.max(0,t-120);}})()`);
          await sleep(500);
          await shot(`${theme}-fixed-heatmap`);
          await evaluate(`(document.scrollingElement||document.documentElement).scrollTop=0`);
        }
      }
      // fixed-control rolado ate "LINHAS SENSIVEIS" (sub-cards que estavam cinza)
      await evaluate(`window.setFixedCostView && window.setFixedCostView('control')`);
      await sleep(800);
      await evaluate(`(function(){var s=[...document.querySelectorAll('*')].find(e=>/LINHAS SENS/i.test(e.textContent)&&e.children.length<4); if(s){var t=s.getBoundingClientRect().top+(window.pageYOffset||document.documentElement.scrollTop); (document.scrollingElement||document.documentElement).scrollTop=Math.max(0,t-120);}})()`);
      await sleep(400);
      await shot(`${theme}-fixed-sensitive`);
      // captura PAGINA INTEIRA do fixed-control (linhas sensiveis) e da Diretoria (saude/acoes)
      await evaluate(`window.setFixedCostView && window.setFixedCostView('control')`);
      await sleep(800);
      await shotFull(`${theme}-fixed-control-full`);
      await evaluate(`window.setFixedCostView && window.setFixedCostView('overview')`);
      await goPage('director');
      await sleep(400);
      await shotFull(`${theme}-director-full`);
      // tambem captura a metade inferior (saude/acoes) via scroll absoluto no <html>
      await evaluate(`(document.scrollingElement||document.documentElement).scrollTop = 720`);
      await sleep(500);
      await shot(`${theme}-director-lower`);
      await evaluate(`(document.scrollingElement||document.documentElement).scrollTop = 0`);
      await goPage('cash');
      await sleep(400);
      await shotFull(`${theme}-cash-full`);
      // mobile: director e fixed (sidebar oculta; foco em conteudo)
      await setViewport(390, 900, true);
      await goPage('cash'); await shot(`${theme}-cash-mobile`);
      await goPage('fixed'); await shot(`${theme}-fixed-mobile`);
    }

    clearInterval();
    await cdp.send('Target.closeTarget', { targetId });
  } finally {
    chrome.kill();
    server.close();
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
  console.log(`theme-shots: ${saved.length} imagens em .qa-output/theme/`);
  console.log('STUCK-DARK no tema claro (por pagina):');
  console.log(JSON.stringify(darkReport, null, 2));
}

run().catch(e => { console.error(e); process.exit(1); });
