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
import { startLoop, root, bookDir, offeringsDir } from './loop.js';

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

// one offering a minute per address, six an hour. strangers will test the door.
const seen = new Map();
function allow(ip) {
  const now = Date.now();
  const hits = (seen.get(ip) || []).filter((t) => now - t < 3600000);
  if (hits.length >= 6 || (hits.length && now - hits[hits.length - 1] < 60000)) return false;
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) seen.clear();
  return true;
}
// plain text only: no control characters, no tags, collapsed whitespace, capped
function clean(v, max) {
  return String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

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
      const dir = bookDir;
      const text = ['first-page.md', 'front.md', 'middle.md', 'back.md']
        .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
        .join('\n---\n');
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end(text);
    }
    if (p === '/offer' && req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
      if (!allow(ip)) {
        res.writeHead(429, { 'content-type': 'text/plain' });
        return res.end('the door has had enough from you for now. come back in a bit.');
      }
      let body = '';
      req.on('data', (c) => {
        body += c;
        if (body.length > 2000) req.destroy();
      });
      req.on('end', () => {
        try {
          const o = JSON.parse(body);
          const name = clean(o.name, 24);
          const text = clean(o.text, 200);
          if (!name || !text) throw new Error('name and text');
          const pending = fs.readdirSync(offeringsDir).filter((f) => f.endsWith('.json')).length;
          if (pending >= 20) throw new Error('the doorstep is full. he has not got to the last ones yet.');
          fs.writeFileSync(path.join(offeringsDir, `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`), JSON.stringify({ name, text, at: new Date().toISOString() }));
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end('{"ok":true}');
        } catch (e) {
          res.writeHead(400, { 'content-type': 'text/plain' });
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
    console.log(`\nthe room: http://localhost:${PORT}\ndata: ${bookDir}\n`);
  });
