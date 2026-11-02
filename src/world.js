// The room, the body, and the mood.
// Nothing here is AI. This is the needs loop. It runs whether or not anyone is watching.

import { moonPhase, isNight } from './clock.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function makeWorld(config, clock) {
  const s = config.start;
  const w = {
    clock,
    config,
    // needs, 0 = fine, 100 = unbearable (purpose is reversed: 100 = fine)
    needs: { hunger: 30, sleep: 20, purpose: 55 },
    // the room
    money: s.money,
    stock: s.stock,
    herbs: s.herbs,
    bowl: s.bowl,
    candles: { lit: s.candles, total: s.candles },
    offerings: [], // things by the door, unread
    knownSpells: [], // filled from the front of the book at boot
    standing: {}, // name -> number
    // state
    asleep: false,
    asleepUntil: null,
    lastAction: null,
    lastWriteAt: null,
    unwritten: 0, // things that happened since the last write
    events: [], // last few events, newest last
    mood: 'content',
    lastTick: clock.now(),
  };
  return w;
}

export function pushEvent(w, text) {
  w.events.push(text);
  if (w.events.length > 5) w.events.shift();
  w.unwritten += 1;
}

// Advance the body by however much time has passed.
export function drift(w) {
  const now = w.clock.now();
  const mins = (now - w.lastTick) / 60000;
  w.lastTick = now;
  if (mins <= 0) return;
  const d = w.config.drift;

  if (w.asleep) {
    // the meter reaches zero right as he is due to wake
    const left = Math.max(1, (w.asleepUntil - now) / 60000);
    w.needs.sleep = clamp(w.needs.sleep - mins * (w.needs.sleep / left));
    w.needs.hunger = clamp(w.needs.hunger + mins * d.hungerPerMin * 0.5);
    if (now >= w.asleepUntil) {
      w.asleep = false;
      w.needs.sleep = 0;
      pushEvent(w, 'woke up');
    }
  } else {
    w.needs.hunger = clamp(w.needs.hunger + mins * d.hungerPerMin);
    w.needs.sleep = clamp(w.needs.sleep + mins * d.sleepPerMin);
    if (w.lastAction === 'nothing' || w.lastAction === null) {
      w.needs.purpose = clamp(w.needs.purpose - mins * d.purposePerMin * 2);
    } else {
      w.needs.purpose = clamp(w.needs.purpose - mins * d.purposePerMin);
    }
  }

  // candles burn money
  if (w.candles.lit > 0) {
    w.money = Math.max(0, w.money - (mins / 60) * d.moneyPerCandleHour * w.candles.lit * 0.5);
    if (w.money <= 0 && w.candles.lit > 0) {
      w.candles.lit = 0;
      pushEvent(w, 'the candles went out');
    }
  }
}

// Mood is derived, never stored as a need.
export function deriveMood(w) {
  if (w.asleep) return 'asleep';
  const n = w.needs;
  const recent = w.events.slice(-3).join(' ');
  const moon = moonPhase(w.clock.now());
  const worst = Math.max(n.hunger, n.sleep, 100 - n.purpose);

  if (/broke|went out|nothing to eat/.test(recent) && worst > 50) return 'bleak';
  if (/worked|sold|regular|one of his/.test(recent)) return 'smug';
  if (n.hunger > 85 && n.purpose < 30) return 'feral';
  if (w.money < 4 || w.offerings.length > 2) return 'anxious';
  if (100 - n.purpose > 70) return 'bleak';
  if (worst > 60) return 'restless';
  if (moon.name === 'full' && isNight(w.clock.now())) return 'restless';
  return 'content';
}

// What the brain sees each tick. Short on purpose.
export function observe(w) {
  const now = w.clock.now();
  const moon = moonPhase(now);
  const n = w.needs;
  const lines = [];
  lines.push(`time ${now.toTimeString().slice(0, 5)}, ${isNight(now) ? 'night' : 'day'}, moon ${moon.name}`);
  lines.push(`hunger ${Math.round(n.hunger)}, sleep ${Math.round(n.sleep)}, purpose ${Math.round(n.purpose)}, mood ${w.mood}`);
  lines.push(`till ${Math.round(w.money)}. jars ${w.stock}. herbs ${w.herbs}. bowl ${w.bowl > 0 ? 'has food' : 'empty'}. candles ${w.candles.lit} of ${w.candles.total} lit`);
  if (w.offerings.length) lines.push(`something by the door: ${w.offerings.length} thing${w.offerings.length > 1 ? 's' : ''}`);
  if (w.events.length) lines.push('lately: ' + w.events.slice(-3).join('; '));
  if (w.lastAction) lines.push(`last did: ${w.lastAction}`);
  return lines.join('\n');
}
