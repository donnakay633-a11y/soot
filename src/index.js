// soot. an autonomous black cat who runs an occult shop he cannot afford.
//
//   node src/index.js            real time, 24/7
//   node src/index.js --sim      fast time, a night in a few minutes
//
// every tick: drift the body, derive mood, observe, ask the brain, do the thing, maybe write.
// when he sleeps, the book gets rewritten.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClock, hhmm } from './clock.js';
import { makeWorld, drift, deriveMood, observe, pushEvent } from './world.js';
import { ACTIONS, available, rankOf } from './actions.js';
import { makeBook } from './book.js';
import { makeBrain } from './brain/index.js';
import { collectOfferings } from './offerings.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));

const SIM = process.argv.includes('--sim');
const ticksArg = process.argv.find((a) => a.startsWith('--ticks='));
const MAX_TICKS = ticksArg ? Number(ticksArg.split('=')[1]) : Infinity;

const timeScale = SIM ? 120 : config.timeScale || 1; // sim: 1 real second = 2 cat minutes
const startAt = SIM ? todayAt(21, 40) : null;
const clock = makeClock(timeScale, startAt);

const book = makeBook(path.join(root, 'book'), (line) => process.stdout.write(`  \x1b[2m${line}\x1b[0m\n`));
const world = makeWorld(config, clock);
world.knownSpells = book.spells();
world.standing = book.people();
world.lastTick = clock.now();

const brain = await makeBrain(config);

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

console.log(bold(`${config.name}. ${config.shop}. brain: ${brain.kind}. ${SIM ? 'sim time' : 'real time'}.`));
console.log(dim('the door is shut.\n'));

let ticks = 0;
let dayStartMoney = world.money;

async function tick() {
  ticks += 1;
  collectOfferings(path.join(root, 'offerings'), world);
  drift(world);
  world.mood = deriveMood(world);

  if (world.asleep) {
    process.stdout.write(dim(`${hhmm(clock.now())}  asleep\n`));
    return;
  }

  const actions = available(world);
  const observation = observe(world);
  let { action, say } = await brain.decide({
    observation,
    actions,
    firstPage: book.firstPage(),
    recentLines: book.recentLines(5),
    world,
  });

  if (!action || !ACTIONS[action] || !ACTIONS[action].can(world)) {
    action = 'nothing';
    say = say || 'sat.';
  }

  const t = hhmm(clock.now());
  const event = ACTIONS[action].do(world, book, { say });
  world.lastAction = action;
  if (action !== 'write') pushEvent(world, event); // writing is not itself a thing that happened

  console.log(`${t}  ${bold(world.mood.padEnd(8))} ${action.padEnd(20)} ${dim(event)}`);
  if (say) console.log(`        ${say}`);

  if (action === 'write') {
    // the diary line is what happened, in his words, not the act of writing
    const happened = event.replace(/^wrote: /, '');
    book.writeLine(t, say ? `${happened}. ${say}` : happened);
  } else if (/broke|died|went out|worked|read what/.test(event)) {
    // things that matter get a line straight away, even without a write action
    book.writeLine(t, say ? `${event}. ${say}` : event);
    world.unwritten = Math.max(0, world.unwritten - 1);
  }

  if (action === 'find the offering') {
    const name = /read what (.+?) left/.exec(event)?.[1];
    if (name && world.standing[name] >= 10) book.addNameToFirstPage(name);
  }

  if (action === 'sleep' && config.rewriteOnSleep) {
    await nightlyRewrite();
  }
}

async function nightlyRewrite() {
  const raw = book.recentLines(config.diaryMaxLines);
  if (!raw.length) return;
  console.log(dim('\n  the rewrite. he is asleep. the book is changing.\n'));
  const out = await brain.rewrite({
    firstPage: book.firstPage(),
    rawLines: raw,
    front: book.front(),
    people: world.standing,
    money: world.money,
  });
  const now = clock.now();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (out.day) book.rewriteMiddle(out.day, date);
  if (out.spells && out.spells.length) {
    book.setFront(out.spells);
    world.knownSpells = book.spells();
  }
  book.noteMoney(world.money);
  // the ledger check: if what he wrote disagrees with the till, he notices on waking
  if (Math.abs(dayStartMoney - world.money) > 5) {
    pushEvent(world, `the till moved ${Math.round(world.money - dayStartMoney)} and i do not remember agreeing to that`);
  }
  dayStartMoney = world.money;
  console.log(dim(`  > ${date}. ${out.day}\n`));
}

function loopDelay() {
  const key = world.asleep ? 'asleep' : world.mood;
  const secs = config.loopSeconds[key] ?? 10;
  return SIM ? (world.asleep ? 100 : Math.max(150, (secs * 1000) / 20)) : secs * 1000;
}

function todayAt(h, m) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

async function run() {
  while (ticks < MAX_TICKS) {
    try {
      await tick();
    } catch (e) {
      console.error(dim(`  (brain stumbled: ${e.message})`));
      await sleep(5000);
    }
    await sleep(loopDelay());
  }
  console.log(dim('\nstopped. the book is in ./book.'));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

process.on('SIGINT', () => {
  console.log(dim('\nstopped. the book is in ./book.'));
  process.exit(0);
});

run();
