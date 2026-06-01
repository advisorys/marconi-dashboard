/* Servidor estatico simples para abrir o dashboard no navegador (Fase 6 — revisao do tema).
   Uso: node tools/serve.mjs [porta]   (padrao 8080). Serve a raiz do repo. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const port = Number(process.argv[2] || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = path.normalize(path.join(root, pathname));
    if (!file.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Marconi dashboard em http://localhost:${port}/  (Ctrl+C para parar)`);
});
