/* Captura os slides do Modo Cinema nos 2 temas, via CDP. Pausa autoplay e
   navega slide a slide com tempo pra animação assentar. Saída: .qa-output/theme/cinema-*. */
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
const outDir = path.join(repoRoot, '.qa-output', 'theme');
await fs.mkdir(outDir, { recursive: true });

function ct(f){ const e=path.extname(f).toLowerCase(); return {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'}[e]||'application/octet-stream'; }
function serve(){ const s=http.createServer(async(req,res)=>{ try{ let p=decodeURIComponent(new URL(req.url,'http://x').pathname); if(p==='/')p='/index.html'; const f=path.normalize(path.join(repoRoot,p)); if(!f.startsWith(repoRoot)){res.writeHead(403);res.end();return;} res.writeHead(200,{'content-type':ct(f),'cache-control':'no-store'}); res.end(await fs.readFile(f)); }catch{res.writeHead(404);res.end();} }); return new Promise(r=>s.listen(0,'127.0.0.1',()=>r({s,port:s.address().port}))); }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitWs(port,t0=Date.now()){ while(Date.now()-t0<30000){ try{ const r=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1500)}); const j=await r.json(); if(j.webSocketDebuggerUrl)return j.webSocketDebuggerUrl; }catch{ await sleep(300); } } throw new Error('devtools timeout'); }
class CDP{ constructor(ws){ this.ws=new WebSocket(ws); this.id=0; this.p=new Map(); this.ws.onmessage=e=>{ const m=JSON.parse(e.data); if(m.id&&this.p.has(m.id)){ const{res,rej}=this.p.get(m.id); this.p.delete(m.id); m.error?rej(new Error(m.error.message)):res(m.result||{});} }; } open(){ return new Promise((res,rej)=>{ const t=setTimeout(()=>rej(new Error('ws')),15000); this.ws.onopen=()=>{clearTimeout(t);res();}; this.ws.onerror=e=>{clearTimeout(t);rej(e);}; }); } send(method,params={},sid){ const id=++this.id; const pl={id,method,params}; if(sid)pl.sessionId=sid; this.ws.send(JSON.stringify(pl)); return new Promise((res,rej)=>{ this.p.set(id,{res,rej}); setTimeout(()=>{ if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout '+method));} },15000); }); } }

const { s: server, port } = await serve();
const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-'));
const dport = 9600 + Math.floor(Math.random()*300);
const chrome = spawn(chromePath, ['--headless=new','--disable-gpu','--no-sandbox','--remote-allow-origins=*',`--remote-debugging-port=${dport}`,`--user-data-dir=${userDataDir}`,'--window-size=1440,900','about:blank'], { stdio:['ignore','pipe','pipe'] });
const saved = [];
try {
  const ws = await waitWs(dport); const cdp = new CDP(ws); await cdp.open();
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const page=(m,p={})=>cdp.send(m,p,sessionId);
  await page('Page.enable'); await page('Runtime.enable');
  await page('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  const ev=async expr=>{ const r=await page('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true}); if(r.exceptionDetails)throw new Error(r.exceptionDetails.text); return r.result.value; };
  const shot=async name=>{ const c=await page('Page.captureScreenshot',{format:'png',fromSurface:true}); await fs.writeFile(path.join(outDir,name+'.png'),Buffer.from(c.data,'base64')); saved.push(name); };

  await page('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  await sleep(1800);

  for (const theme of ['dark','light']) {
    await ev(`(function(){ try{ if('${theme}'==='light')localStorage.setItem('marconi-theme','light'); else localStorage.removeItem('marconi-theme'); }catch(e){} window.MarconiTheme&&window.MarconiTheme.apply('${theme}'); })()`);
    await sleep(300);
    await ev(`window.MarconiCinema && window.MarconiCinema.open()`);
    await sleep(500);
    // pausar autoplay
    await ev(`(function(){var o=document.getElementById('cineOverlay'); if(o&&o.classList.contains('cine-autoplaying'))document.getElementById('cinePlay').click();})()`);
    const n = await ev(`document.querySelectorAll('.cine-slide').length`);
    for (let i = 0; i < n; i++) {
      await ev(`(function(){ window.__cineGo && 0; var dots=document.querySelectorAll('.cine-dot'); if(dots[${i}])dots[${i}].click(); })()`);
      await sleep(1700); // deixa animação assentar
      await shot(`cinema-${theme}-${i}`);
    }
    await ev(`window.MarconiCinema && window.MarconiCinema.close()`);
    await sleep(300);
  }
  console.log('cinema shots:', saved.length);
  console.log(saved.join('\n'));
} finally {
  chrome.kill(); server.close(); await fs.rm(userDataDir,{recursive:true,force:true}).catch(()=>{});
}
