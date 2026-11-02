// leave something at the door:  node src/offer.js "your name" "what you want to say"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [name, ...rest] = process.argv.slice(2);
const text = rest.join(' ');
if (!name || !text) {
  console.log('usage: node src/offer.js "name" "message"');
  process.exit(1);
}
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'offerings');
fs.mkdirSync(dir, { recursive: true });
const f = path.join(dir, `${Date.now()}.json`);
fs.writeFileSync(f, JSON.stringify({ name, text, at: new Date().toISOString() }));
console.log('left it by the door. he will get to it.');
