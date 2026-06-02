/* Captura o estado COLAPSADO da sidebar (Fluxo) e a Diretoria, tema claro,
   para diagnosticar o "treco preto" e o breadcrumb. Reusa CDP simples. */
import http from 'node:http';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const chromePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(p => fssync.existsSync(p));
const outputDir = path.join(repoRoot, '.qa-output', 'theme');
await fs.mkdir(outputDir, { recursive: true });

function contentType(f) {
  const e = path.extname(f).toLowerCase();
  return { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[e] || 'application/octet-stream';
}
function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      const f = path.normalize(path.join(repoRoot, p));
      if (!f.startsWith(repoRoot)) { res.writeHead(403); res.end(); return; }
      res.writeHead(200, { 'content-type': contentType(f), 'cache-control': 'no-store' });
      res.end(await fs.readFile(f));
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitWs(port, t0 = Date.now()) {
  while (Date.now() - t0 < 30000) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1500) }); const j = await r.json(); if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch { await sleep(300); }
  }
  throw new Error('devtools timeout');
}
class CDP {
  constructor(ws) { this.ws = new WebSocket(ws); this.id = 0; this.p = new Map(); this.ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { res, rej } = this.p.get(m.id); this.p.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result || {}); } }; }
  open() { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('ws')), 15000); this.ws.onopen = () => { clearTimeout(t); res(); }; this.ws.onerror = e => { clearTimeout(t); rej(e); }; }); }
  send(method, params = {}, sid) { const id = ++this.id; const pl = { id, method, params }; if (sid) pl.sessionId = sid; this.ws.send(JSON.stringify(pl)); return new Promise((res, rej) => { this.p.set(id, { res, rej }); setTimeout(() => { if (this.p.has(id)) { this.p.delete(id); rej(new Error('timeout ' + method)); } }, 15000); }); }
}

const { server, port } = await startServer();
const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'marconi-col-'));
const dport = 9400 + Math.floor(Math.random() * 500);
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-sandbox', '--remote-allow-origins=*', `--remote-debugging-port=${dport}`, `--user-data-dir=${userDataDir}`, '--window-size=1440,980', 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const ws = await waitWs(dport);
  const cdp = new CDP(ws); await cdp.open();
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const page = (m, p = {}) => cdp.send(m, p, sessionId);
  await page('Page.enable'); await page('Runtime.enable');
  await page('Emulation.setDeviceMetricsOverride', { width: 1820, height: 980, deviceScaleFactor: 1, mobile: false });
  const ev = async expr => { const r = await page('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  const shot = async name => { const c = await page('Page.captureScreenshot', { format: 'png', fromSurface: true }); await fs.writeFile(path.join(outputDir, name + '.png'), Buffer.from(c.data, 'base64')); };

  await page('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  await sleep(1800);
  await ev(`try{localStorage.setItem('marconi-theme','light')}catch(e){}; window.MarconiTheme&&window.MarconiTheme.apply('light');`);
  await sleep(300);
  // ir pro Fluxo
  await ev(`document.querySelector('[data-page-link="cash"]')?.click()`);
  await sleep(1200);
  // colapsar a sidebar de verdade
  await ev(`window.toggleSidebarV42 && window.toggleSidebarV42()`);
  await sleep(800);
  await ev(`window.scrollTo(0,0)`);
  await sleep(300);
  await shot('light-cash-collapsed');
  // expandir de volta e ir pra Diretoria (ver o breadcrumb)
  await ev(`window.toggleSidebarV42 && window.toggleSidebarV42()`);
  await sleep(400);
  await ev(`document.querySelector('[data-page-link="director"]')?.click()`);
  await sleep(1400);
  await ev(`window.scrollTo(0,0)`);
  await sleep(300);
  await shot('light-director-top');
  // medir alinhamento breadcrumb vs hero em 1820px
  const align = await ev(`(function(){
    var hero=document.querySelector('.director-hero'); var bc=document.querySelector('.v66-context-line');
    var cont=document.querySelector('.director-container');
    if(!hero||!bc) return 'sem elementos';
    var h=hero.getBoundingClientRect(); var b=bc.getBoundingClientRect(); var c=cont.getBoundingClientRect();
    // borda interna do conteudo = container.left + padding
    var cpad=parseFloat(getComputedStyle(cont).paddingLeft);
    var contentEdge=Math.round(c.left+cpad);
    // borda interna do breadcrumb = bc.left + padding
    var bpad=parseFloat(getComputedStyle(bc).paddingLeft);
    var bcTextEdge=Math.round(b.left+bpad);
    return {page:document.body.dataset.page, contentTextEdge:contentEdge, bcTextEdge:bcTextEdge, textDiff:bcTextEdge-contentEdge, hero_left:Math.round(h.left), bc_left:Math.round(b.left), container_left:Math.round(c.left), cpad:cpad, bpad:bpad};
  })()`);
  console.log('ALIGN @1820:', JSON.stringify(align));
  console.log('OK: light-cash-collapsed.png, light-director-top.png');
} finally {
  chrome.kill(); server.close(); await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}
