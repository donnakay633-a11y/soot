// builds dist/demo.html: the room as one file, three.js from a cdn, demo mode on.
// for showing the room to somebody with nothing installed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ver = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/three/package.json'), 'utf8')).version;
let html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const cat = fs.readFileSync(path.join(root, 'web/cat.js'), 'utf8').replace("import * as THREE from 'three';", '').replace('export function makeCat', 'function makeCat');
const js = (cat + '\n' + fs.readFileSync(path.join(root, 'web/room.js'), 'utf8').replace("import { makeCat } from './cat.js';", '')).replace("if (params.has('demo')) startDemo();\nelse {", 'if (true) startDemo();\nelse {');
html = html
  .replace('"/vendor/three/build/three.module.js"', `"https://cdn.jsdelivr.net/npm/three@${ver}/build/three.module.js"`)
  .replace('<script type="module" src="/room.js"></script>', `<script type="module">\n${js}\n</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/demo.html'), html);
// the visitor page, same idea: one file, demo data
let v = fs.readFileSync(path.join(root, 'web/visit.html'), 'utf8');
const vjs = fs.readFileSync(path.join(root, 'web/visit.js'), 'utf8');
v = v.replace('<script src="/visit.js"></script>', `<script>\n${vjs}\n</script>`);
fs.writeFileSync(path.join(root, 'dist/visit-demo.html'), v);
console.log('dist/visit-demo.html', (v.length / 1024).toFixed(0) + ' kb');
console.log('dist/demo.html', (html.length / 1024).toFixed(0) + ' kb, three ' + ver);
