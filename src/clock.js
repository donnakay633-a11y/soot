// The cat's clock. In normal mode it is the real clock.
// In sim mode time runs faster, so a night takes minutes instead of hours.

export function makeClock(timeScale = 1, startAt = null) {
  const realStart = Date.now();
  const simStart = startAt ? new Date(startAt).getTime() : realStart;
  return {
    now() {
      return new Date(simStart + (Date.now() - realStart) * timeScale);
    },
    scale: timeScale,
  };
}

export function hhmm(d) {
  return d.toTimeString().slice(0, 5);
}

export function isNight(d) {
  const h = d.getHours();
  return h >= 22 || h < 6;
}

// Moon phase from the date. Returns a name and a 0..1 illumination.
// Not astronomically precise. The cat does not care.
export function moonPhase(d) {
  const known = Date.UTC(2000, 0, 6, 18, 14); // a new moon
  const synodic = 29.530588853;
  const days = (d.getTime() - known) / 86400000;
  const phase = ((days % synodic) + synodic) % synodic / synodic;
  const illum = 0.5 * (1 - Math.cos(phase * 2 * Math.PI));
  let name;
  if (phase < 0.03 || phase > 0.97) name = 'new';
  else if (phase < 0.22) name = 'waxing crescent';
  else if (phase < 0.28) name = 'first quarter';
  else if (phase < 0.47) name = 'waxing gibbous';
  else if (phase < 0.53) name = 'full';
  else if (phase < 0.72) name = 'waning gibbous';
  else if (phase < 0.78) name = 'last quarter';
  else name = 'waning crescent';
  return { name, illum, waning: phase > 0.5 };
}
