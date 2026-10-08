import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const routes = new Map([
  ['/', ['public/index.html', 'text/html']], ['/style.css', ['public/style.css', 'text/css']],
  ['/bundle.mjs', ['public/bundle.mjs', 'text/javascript']]
]);
export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (req.headers.host !== `127.0.0.1:${req.socket.localPort}`) { res.writeHead(403); res.end('Host refused'); return; }
    if (req.method !== 'GET') { res.writeHead(405); res.end('Read-only'); return; }
    const route = routes.get(req.url);
    if (!route) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const content = await readFile(new URL(route[0], import.meta.url));
      res.writeHead(200, { 'Content-Type': `${route[1]}; charset=utf-8` }); res.end(content);
    } catch { res.writeHead(503); res.end('Build resources unavailable'); }
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.SIGNALCHECK_PORT || 3274);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
  const server = createServer();
  server.on('error', error => { console.error(`Server error: ${error.code}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`SignalCheck: http://127.0.0.1:${port}`));
}
