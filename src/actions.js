// The twelve things the cat can do. The brain picks one; the room executes it.
// Each action: can(world) -> bool, do(world, book, ctx) -> event string (what happened).

import { moonPhase } from './clock.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const rnd = () => Math.random();

export const ACTIONS = {
  eat: {
    desc: 'eat from the bowl, or eat a jar of stock if the bowl is empty',
    can: (w) => w.bowl > 0 || w.stock > 0,
    do: (w) => {
      if (w.bowl > 0) {
        w.bowl -= 1;
        w.needs.hunger = clamp(w.needs.hunger - 50);
        return 'ate from the bowl. bowl empty now';
      }
      w.stock -= 1;
      w.needs.hunger = clamp(w.needs.hunger - 40);
      return `ate a jar of stock. ${w.stock} jars left`;
    },
  },
  sleep: {
    desc: 'curl up on the cushion and sleep. the book gets rewritten while you sleep',
    can: (w) => w.needs.sleep > 55,
    do: (w) => {
      w.asleep = true;
      const mins = 240 + w.needs.sleep * 2;
      w.asleepUntil = new Date(w.clock.now().getTime() + mins * 60000);
      return 'went to sleep';
    },
  },
  read: {
    desc: 'read the front of the book. might remember a spell',
    can: (w) => w.candles.lit > 0,
    do: (w) => {
      w.needs.purpose = clamp(w.needs.purpose + 6);
      const spell = w.knownSpells[Math.floor(rnd() * w.knownSpells.length)];
      return spell ? `read about ${spell.name}` : 'read the front. nothing in it yet';
    },
  },
  write: {
    desc: 'write a line in the middle of the book about what happened',
    can: (w) => {
      if (w.candles.lit === 0 || w.unwritten === 0) return false;
      const since = w.lastWriteAt ? (w.clock.now() - w.lastWriteAt) / 60000 : 999;
      return w.unwritten >= 3 || since > 45;
    },
    do: (w) => {
      const happened = w.events.slice(-Math.min(w.unwritten, w.events.length)).join('. ');
      w.unwritten = 0;
      w.lastWriteAt = w.clock.now();
      w.needs.purpose = clamp(w.needs.purpose + 3);
      return `wrote: ${happened}`;
    },
  },
  cast: {
    desc: 'try a spell from the front of the book. might work. might break something',
    can: (w) => w.candles.lit > 0 && w.needs.purpose > 30 && w.knownSpells.length > 0,
    do: (w) => {
      const spell = w.knownSpells[Math.floor(rnd() * w.knownSpells.length)];
      const moon = moonPhase(w.clock.now());
      const odds = 0.25 + moon.illum * 0.35; // full moon helps
      w.needs.sleep = clamp(w.needs.sleep + 15);
      spell.tried += 1;
      if (rnd() < odds) {
        w.needs.purpose = clamp(w.needs.purpose + 20);
        w.money += 2 + Math.floor(rnd() * 4);
        spell.last = 'worked';
        return `cast ${spell.name}. it worked. something in the till that was not there before`;
      }
      w.needs.purpose = clamp(w.needs.purpose - 8);
      spell.last = 'failed';
      if (w.stock > 0 && rnd() < 0.6) {
        w.stock -= 1;
        return `cast ${spell.name}. it failed. a jar broke. ${w.stock} jars left`;
      }
      if (w.candles.lit > 0) {
        w.candles.lit -= 1;
        return `cast ${spell.name}. it failed. a candle died`;
      }
      return `cast ${spell.name}. nothing happened`;
    },
  },
  'count the till': {
    desc: 'count the money. changes nothing. you will feel something about the number',
    can: (w) => w.money < 40 || w.mood === 'anxious',
    do: (w) => `counted the till. ${Math.round(w.money)}`,
  },
  'tend stock': {
    desc: 'turn herbs into jars of stock to sell',
    can: (w) => w.stock < 5 && w.herbs > 0,
    do: (w) => {
      const n = Math.min(2, w.herbs);
      w.herbs -= n;
      w.stock += n;
      w.needs.purpose = clamp(w.needs.purpose + 4);
      return `made ${n} jar${n > 1 ? 's' : ''} from the herbs. ${w.herbs} herbs left`;
    },
  },
  'light candle': {
    desc: 'light a candle that has gone out. costs money',
    can: (w) => w.candles.lit < w.candles.total && w.money >= 2,
    do: (w) => {
      w.money -= 2;
      w.candles.lit += 1;
      return `lit a candle. ${Math.round(w.money)} left`;
    },
  },
  'look out the window': {
    desc: 'look out at the moon and the street. changes nothing',
    can: () => true,
    do: (w) => {
      const moon = moonPhase(w.clock.now());
      w.needs.purpose = clamp(w.needs.purpose + 1);
      return `looked out. moon ${moon.name}`;
    },
  },
  'check the mirror': {
    desc: 'look in the mirror. you will not explain why',
    can: (w) => w.mood === 'bleak' || w.mood === 'smug',
    do: () => 'checked the mirror',
  },
  'find the offering': {
    desc: 'go to the door and read what somebody left',
    can: (w) => w.offerings.length > 0,
    do: (w, book) => {
      const o = w.offerings.shift();
      const prev = w.standing[o.name] || 0;
      w.standing[o.name] = prev + 1;
      w.needs.purpose = clamp(w.needs.purpose + 8);
      book.notePerson(o.name, w.standing[o.name]);
      const rank = rankOf(w.standing[o.name]);
      return `read what ${o.name} left: "${o.text}". ${o.name} is ${rank} now`;
    },
  },
  nothing: {
    desc: 'sit. do nothing',
    can: (w) => (w.idleRun || 0) < 3, // three in a row and he has to do something
    do: () => 'sat',
  },
};

export function rankOf(n) {
  if (n >= 10) return 'one of mine';
  if (n >= 3) return 'a regular';
  if (n >= 1) return 'someone';
  return 'a stranger';
}

export function available(w) {
  return Object.entries(ACTIONS)
    .filter(([, a]) => a.can(w))
    .map(([name, a]) => ({ name, desc: a.desc }));
}
