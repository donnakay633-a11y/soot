// Offerings arrive as small json files in ./offerings. The loop picks them up
// and puts them by the door. Nothing is sent back. Read the book.

import fs from 'node:fs';
import path from 'node:path';

export function collectOfferings(dir, world) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const full = path.join(dir, f);
    try {
      const o = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (o && o.name && o.text) {
        world.offerings.push({ name: String(o.name).slice(0, 24), text: String(o.text).slice(0, 200) });
      }
    } catch {
      // a bad offering is just rubbish by the door
    }
    fs.unlinkSync(full);
  }
}
