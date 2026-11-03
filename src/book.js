// The book is the only memory. If it is not in the book, he does not know it.
// first-page.md  fixed, never rewritten
// front.md       spells, capped at 12
// middle.md      diary, raw lines, rewritten into a paragraph on sleep
// back.md        ledger and people

import fs from 'node:fs';
import path from 'node:path';

export function makeBook(dir, log) {
  const p = (f) => path.join(dir, f);
  const read = (f) => fs.readFileSync(p(f), 'utf8');
  const write = (f, s) => fs.writeFileSync(p(f), s);

  const book = {
    firstPage: () => read('first-page.md'),
    front: () => read('front.md'),
    middle: () => read('middle.md'),
    back: () => read('back.md'),

    // parse the front into spells the world can use
    spells() {
      return read('front.md')
        .split('\n')
        .filter((l) => l.startsWith('- '))
        .map((l) => {
          const name = l.slice(2).split('.')[0].trim();
          const tried = /tried: (\d+|never|once)/.exec(l);
          const n = tried ? (tried[1] === 'never' ? 0 : tried[1] === 'once' ? 1 : Number(tried[1])) : 0;
          return { name, tried: n, last: null, raw: l };
        });
    },

    // append a diary line
    writeLine(time, text) {
      const line = `${time}  ${String(text).slice(0, 400)}`;
      fs.appendFileSync(p('middle.md'), line + '\n');
      if (log) log(line);
      // the raw diary cannot grow without end between sleeps
      const lines = read('middle.md').split('\n');
      if (lines.length > 400) {
        const head = lines.filter((l) => l.startsWith('#') || l.startsWith('> ') || !l.trim());
        const raw = lines.filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('> '));
        write('middle.md', [...head, ...raw.slice(-200)].join('\n') + '\n');
      }
    },

    recentLines(n = 6) {
      return read('middle.md')
        .split('\n')
        .filter((l) => l && !l.startsWith('#'))
        .slice(-n);
    },

    // replace the raw diary with a paragraph (the nightly rewrite)
    rewriteMiddle(paragraph, date) {
      const header = '# middle: what happened\n\n';
      const kept = read('middle.md')
        .split('\n')
        .filter((l) => l.startsWith('> '))
        .slice(-7); // keep the last week of paragraphs
      const block = [...kept, `> ${date}. ${paragraph.trim()}`].join('\n');
      write('middle.md', header + block + '\n\n');
    },

    // a person line in the back
    notePerson(name, standing) {
      let s = read('back.md');
      const re = new RegExp(`^- ${escape(name)}:.*$`, 'm');
      const line = `- ${name}: ${standing}`;
      if (re.test(s)) s = s.replace(re, line);
      else s = s.replace('(nobody yet)\n', '').trimEnd() + '\n' + line + '\n';
      // he can only keep so many names. the ones he knows least fall off the page.
      const people = [...s.matchAll(/^- (.+?): (\d+)$/gm)].map((m) => [m[1], Number(m[2]), m[0]]);
      if (people.length > 200) {
        people.sort((a, b) => a[1] - b[1]);
        for (const [, , raw] of people.slice(0, people.length - 200)) s = s.replace(raw + '\n', '');
      }
      write('back.md', s);
    },

    people() {
      const out = {};
      for (const l of read('back.md').split('\n')) {
        const m = /^- (.+?): (\d+)$/.exec(l);
        if (m) out[m[1]] = Number(m[2]);
      }
      return out;
    },

    noteMoney(money) {
      let s = read('back.md');
      s = s.replace(/## money\n[^\n]*\n/, `## money\nthe till said ${Math.round(money)} last time i looked\n`);
      write('back.md', s);
    },

    // promote or replace spells, keep the cap
    setFront(lines) {
      const capped = lines.slice(0, 12);
      write('front.md', '# front: spells\n\n' + capped.map((l) => (l.startsWith('- ') ? l : '- ' + l)).join('\n') + '\n');
    },

    // the names on the first page are the only thing on it that changes, and only by his own hand
    addNameToFirstPage(name) {
      let s = read('first-page.md');
      if (s.includes(`- ${name}`)) return;
      s = s.replace('(none yet)\n', '').trimEnd() + `\n- ${name}\n`;
      write('first-page.md', s);
    },

    whole() {
      return [read('first-page.md'), read('front.md'), read('middle.md'), read('back.md')].join('\n---\n');
    },
  };
  return book;
}

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
