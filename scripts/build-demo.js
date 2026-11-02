// builds dist/demo.html: the room as one file, three.js from a cdn, demo mode on.
// for showing the room to somebody with nothing installed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ver = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/three/package.json'), 'utf8')).version;
let html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'web/room.js'), 'utf8').replace("if (params.has('demo')) startDemo();\nelse {", 'if (true) startDemo();\nelse {');
html = html
  .replace('"/vendor/three/build/three.module.js"', `"https://cdn.jsdelivr.net/npm/three@${ver}/build/three.module.js"`)
  .replace('<script type="module" src="/room.js"></script>', `<script type="module">\n${js}\n</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/demo.html'), html);
console.log('dist/demo.html', (html.length / 1024).toFixed(0) + ' kb, three ' + ver);
