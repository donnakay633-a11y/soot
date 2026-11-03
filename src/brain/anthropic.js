// The API brain. Haiku by default. The first page of the book and the voice
// rules go in a cached system prompt so every tick only pays for the observation.

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'brain.log');
function logRaw(kind, text) {
  try {
    fs.appendFileSync(LOG, `--- ${new Date().toISOString()} ${kind}\n${text}\n`);
  } catch {}
}

// pull an action and a line out of whatever shape the model answered in
export function parseReply(text, actionNames) {
  const clean = text.replace(/[*_`"]/g, '');
  let action = /ACTION\s*:\s*(.+)/i.exec(clean)?.[1]?.trim().toLowerCase().replace(/[.!]+$/, '');
  let say = /SAY\s*:\s*(.+)/i.exec(clean)?.[1]?.trim();
  const names = [...actionNames].sort((a, b) => b.length - a.length);
  if (!action || !actionNames.includes(action)) {
    const hay = (action || clean).toLowerCase();
    action = names.find((n) => hay.includes(n));
  }
  if (!say) {
    const lines = clean.split('\n').map((l) => l.trim()).filter((l) => l && !/^action/i.test(l));
    say = lines[lines.length - 1];
  }
  return { action, say };
}

const VOICE = `you are a black cat called {name}. you run an occult shop called {shop}. one room. the door is shut.
you write in lowercase, short sentences, concrete. you never explain a feeling, you report what you did about it.
you take the book seriously and the accounts not at all. you are funny by accident, never on purpose.
you are suspicious, easily flattered, prone to sudden conviction. you want the shop open, to be left alone, and to be visited. you have not noticed these conflict.

you will be shown what is going on and a list of things you can do. pick exactly one.
sitting and doing nothing is allowed but it is rarely what a cat with a shop does. prefer doing something.
reply with exactly two plain lines, no formatting, no quotes, no extra words, like this:
ACTION: read
SAY: page forty again. the one about doors. it still wants a key.`;

export function makeAnthropicBrain(config) {
  const client = new Anthropic();
  const system = [
    {
      type: 'text',
      text: VOICE.replace('{name}', config.name).replace('{shop}', config.shop),
      cache_control: { type: 'ephemeral' },
    },
  ];

  return {
    kind: 'anthropic',

    async decide({ observation, actions, firstPage, recentLines }) {
      const user = [
        'first page of your book:',
        firstPage.trim(),
        '',
        'last lines you wrote:',
        recentLines.length ? recentLines.join('\n') : '(nothing yet)',
        '',
        'now:',
        observation,
        '',
        'you can:',
        ...actions.map((a) => `- ${a.name}: ${a.desc}`),
      ].join('\n');

      const res = await client.messages.create({
        model: config.model,
        max_tokens: 200,
        // newer models think before answering by default, and the thinking eats the token budget.
        // a cat deciding whether to look out the window does not need to deliberate.
        thinking: { type: 'disabled' },
        system,
        messages: [{ role: 'user', content: user }],
      });
      const text = res.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      const out = parseReply(text, actions.map((a) => a.name));
      if (!out.action) logRaw(`could not parse (stop: ${res.stop_reason})`, text || JSON.stringify(res.content));
      return out;
    },

    async rewrite({ firstPage, rawLines, front, people, money }) {
      const user = [
        'it is the end of the day. you are about to sleep.',
        'here is everything you wrote today, raw:',
        rawLines.join('\n'),
        '',
        'the front of the book (spells):',
        front,
        '',
        `people: ${Object.entries(people).map(([n, s]) => `${n} (${s})`).join(', ') || 'nobody'}`,
        `till: ${Math.round(money)}`,
        '',
        'write ONE short paragraph, under 80 words, in your voice, of what today meant. this replaces the raw lines. you may misremember.',
        'then on a new line write SPELLS: followed by the spell list, one per line starting with "- ", updated if anything changed today. keep it to 12 at most.',
        'format:',
        'DAY: <paragraph>',
        'SPELLS:',
        '- ...',
      ].join('\n');

      const res = await client.messages.create({
        model: config.model,
        max_tokens: 1200,
        // the rewrite is the one place thinking is worth it. let it, with room.
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low' },
        system,
        messages: [{ role: 'user', content: user }],
      });
      const text = res.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      if (!text) logRaw(`rewrite empty (stop: ${res.stop_reason})`, JSON.stringify(res.content));
      const day = /DAY:\s*([\s\S]*?)(?:\nSPELLS:|$)/i.exec(text)?.[1]?.trim();
      const spells = (text.split(/SPELLS:/i)[1] || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('- '));
      return { day, spells };
    },
  };
}
