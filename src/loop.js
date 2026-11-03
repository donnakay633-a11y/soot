// The loop as a module. index.js runs it in a terminal; server.js runs it and streams it to the room.
//
// every tick: drift the body, derive mood, observe, ask the brain, do the thing, maybe write.
// when he sleeps, the book gets rewritten.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClock, hhmm, moonPhase } from './clock.js';
import { makeWorld, drift, deriveMood, observe, pushEvent } from './world.js';
import { ACTIONS, available } from './actions.js';
import { makeBook } from './book.js';
import { makeBrain } from './brain/index.js';
import { collectOfferings } from './offerings.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.join(here, '..');

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startLoop({ sim = false, maxTicks = Infinity, quiet = false, onState = null } = {}) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
  const timeScale = sim ? 120 : config.timeScale || 1; // sim: 1 real second = 2 cat minutes
  const clock = makeClock(timeScale, sim ? todayAt(21, 40) : null);
  const log = quiet ? () => {} : (s) => console.log(s);

  const book = makeBook(path.join(root, 'book'), (line) => log(`  ${dim(line)}`));
  const world = makeWorld(config, clock);
  world.knownSpells = book.spells();
  world.standing = book.people();
  world.lastTick = clock.now();
  const brain = await makeBrain(config);

  log(bold(`${config.name}. ${config.shop}. brain: ${brain.kind}. ${sim ? 'sim time' : 'real time'}.`));
  log(dim('the door is shut.\n'));

  let ticks = 0;
  let dayStartMoney = world.money;
  let last = { action: null, say: null, event: null };
  let running = true;

  function snapshot() {
    const now = clock.now();
    return {
      time: hhmm(now),
      moon: moonPhase(now).name,
      mood: world.mood,
      asleep: world.asleep,
      needs: {
        hunger: Math.round(world.needs.hunger),
        sleep: Math.round(world.needs.sleep),
        purpose: Math.round(world.needs.purpose),
      },
      money: Math.round(world.money),
      stock: world.stock,
      herbs: world.herbs,
      bowl: world.bowl,
      candles: { ...world.candles },
      offerings: world.offerings.length,
      action: last.action,
      say: last.say,
      event: last.event,
      diary: book.recentLines(8),
    };
  }

  async function tick() {
    ticks += 1;
    collectOfferings(path.join(root, 'offerings'), world);
    drift(world);
    world.mood = deriveMood(world);

    if (world.asleep) {
      last = { action: 'sleep', say: null, event: 'asleep' };
      log(dim(`${hhmm(clock.now())}  asleep`));
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
      log(dim(`  (brain said "${action}", which he cannot do right now)`));
      const fallback = actions.filter((a) => a.name !== 'nothing');
      action = fallback.length ? fallback[Math.floor(Math.random() * fallback.length)].name : 'nothing';
      say = say || 'sat.';
    }
    world.idleRun = action === 'nothing' ? (world.idleRun || 0) + 1 : 0;

    const t = hhmm(clock.now());
    const event = ACTIONS[action].do(world, book, { say });
    world.lastAction = action;
    if (action !== 'write') pushEvent(world, event); // writing is not itself a thing that happened
    last = { action, say, event };

    log(`${t}  ${bold(world.mood.padEnd(8))} ${action.padEnd(20)} ${dim(event)}`);
    if (say) log(`        ${say}`);

    if (action === 'write') {
      const happened = event.replace(/^wrote: /, '');
      book.writeLine(t, say ? `${happened}. ${say}` : happened);
    } else if (/broke|died|went out|worked|read what/.test(event)) {
      book.writeLine(t, say ? `${event}. ${say}` : event);
      world.unwritten = Math.max(0, world.unwritten - 1);
    }

    if (action === 'find the offering') {
      const name = /read what (.+?) left/.exec(event)?.[1];
      if (name && world.standing[name] >= 10) book.addNameToFirstPage(name);
    }

    if (action === 'sleep' && config.rewriteOnSleep) await nightlyRewrite();
  }

  async function nightlyRewrite() {
    const raw = book.recentLines(config.diaryMaxLines);
    if (!raw.length) return;
    log(dim('\n  the rewrite. he is asleep. the book is changing.\n'));
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
    if (Math.abs(dayStartMoney - world.money) > 5) {
      pushEvent(world, `the till moved ${Math.round(world.money - dayStartMoney)} and i do not remember agreeing to that`);
    }
    dayStartMoney = world.money;
    log(dim(`  > ${date}. ${out.day}\n`));
  }

  function loopDelay() {
    const key = world.asleep ? 'asleep' : world.mood;
    const secs = config.loopSeconds[key] ?? 10;
    return sim ? (world.asleep ? 100 : Math.max(150, (secs * 1000) / 20)) : secs * 1000;
  }

  (async () => {
    while (running && ticks < maxTicks) {
      try {
        await tick();
        if (onState) onState(snapshot());
      } catch (e) {
        console.error(dim(`  (brain stumbled: ${e.message})`));
        await sleep(5000);
      }
      await sleep(loopDelay());
    }
    log(dim('\nstopped. the book is in ./book.'));
  })();

  return {
    snapshot,
    stop: () => {
      running = false;
    },
  };
}

function todayAt(h, m) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
