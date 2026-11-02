// The room server. Runs the loop and streams every tick to the browser.
//
//   npm run room            real time, open http://localhost:7777
//   npm run room -- --sim   fast time
//
// GET /            the room
// GET /visit       the visitor page: leave an offering, read the book
// GET /events      server-sent events, one state object per tick
// GET /state       the latest state as json
// GET /book        the whole book as text
// POST /offer      {name, text}  leave something at the door

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { startLoop, root } from './loop.js';

const PORT = Number(process.env.PORT || 7777);
const sim = process.argv.includes('--sim');
const web = path.join(root, 'web');
const three = path.join(root, 'node_modules', 'three');

const clients = new Set();
let latest = null;

const loop = await startLoop({
  sim,
  onState: (state) => {
    latest = state;
    const line = `data: ${JSON.stringify(state)}\n\n`;
    for (const res of clients) res.write(line);
  },
});

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

function serveFile(res, file) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not here');
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;

    if (p === '/events') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      res.write('\n');
      if (latest) res.write(`data: ${JSON.stringify(latest)}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (p === '/state') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(latest || loop.snapshot()));
    }
    if (p === '/book') {
      const dir = path.join(root, 'book');
      const text = ['first-page.md', 'front.md', 'middle.md', 'back.md']
        .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
        .join('\n---\n');
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end(text);
    }
    if (p === '/offer' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const o = JSON.parse(body);
          if (!o.name || !o.text) throw new Error('name and text');
          const dir = path.join(root, 'offerings');
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${Date.now()}.json`), JSON.stringify({ name: o.name, text: o.text, at: new Date().toISOString() }));
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end('{"ok":true}');
        } catch (e) {
          res.writeHead(400);
          res.end(e.message);
        }
      });
      return;
    }
    if (p.startsWith('/vendor/three/')) {
      return serveFile(res, path.join(three, p.replace('/vendor/three/', '')));
    }
    if (p === '/visit') return serveFile(res, path.join(web, 'visit.html'));
    serveFile(res, path.join(web, p === '/' ? 'index.html' : p));
  })
  .listen(PORT, () => {
    console.log(`\nthe room: http://localhost:${PORT}\n`);
  });
