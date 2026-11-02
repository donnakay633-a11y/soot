// The scripted brain. No model. Picks by need, speaks from templates.
// It exists so the loop runs without a key and so the body can be tuned
// without paying for it. The voice is a stand-in; the API brain replaces it.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const SAY = {
  eat: [
    'dinner was stock. the ledger will not like that but the ledger is not hungry.',
    'ate. the bowl is a rumour now.',
    'one jar. i will call it a tasting.',
  ],
  sleep: [
    'going to sleep on this and the book, in that order.',
    'enough. the candles can mind the shop.',
  ],
  read: [
    'page forty. the one about doors. still wants a key.',
    'read the rosemary one again. it is a finding spell. i have not found anything.',
    'read. the book knows something and is not saying.',
  ],
  write: [
    'wrote it down before it got away.',
    'wrote small. rule five.',
    'put it in the middle where it belongs.',
  ],
  cast: [
    'trying it. the moon can watch.',
    'said the words. waited.',
    'cast it. the book did not mention the jars.',
  ],
  'count the till': [
    'counted. same as yesterday. that is not a trend, that is a fact.',
    'the till has a number in it. i have looked at it twice now.',
    'counted again in case it had changed its mind.',
  ],
  'tend stock': [
    'herbs into jars. the rosemary is giving up but so am i.',
    'made stock. the shelf looks like a shop for an hour.',
  ],
  'light candle': [
    'lit one. that is money, burning, so i can read about money.',
    'candle. the dark was starting to get opinions.',
  ],
  'look out the window': [
    'moon is going. good. the last one was too interested.',
    'looked out. the street is doing its street thing.',
    'nothing out there wants to come in. fair.',
  ],
  'check the mirror': ['.', 'mirror. no.', 'checked. not a spell. rule four.'],
  'find the offering': [
    'something at the door. reading it.',
    'went to the door. somebody left a thing. the thing has words on it.',
  ],
  nothing: ['sat.', 'tail.', 'sat. the room sat with me.'],
};

export function makeScriptedBrain() {
  return {
    kind: 'scripted',

    async decide({ actions, world }) {
      const can = new Set(actions.map((a) => a.name));
      const n = world.needs;
      let action;

      if (can.has('find the offering')) action = 'find the offering';
      else if (n.sleep > 80 && can.has('sleep')) action = 'sleep';
      else if (n.hunger > 70 && can.has('eat')) action = 'eat';
      else if (can.has('light candle') && world.candles.lit === 0) action = 'light candle';
      else if (can.has('write') && Math.random() < 0.6) action = 'write';
      else if (can.has('tend stock') && world.stock < 2) action = 'tend stock';
      else if (world.mood === 'bleak') {
        // he sulks, but something eventually pulls him out: the book, the stock, or bed
        action = pick(['nothing', 'nothing', 'check the mirror', 'look out the window', 'read', 'tend stock', 'sleep', 'write'].filter((a) => can.has(a)));
      }
      else if (world.mood === 'anxious' && can.has('count the till')) action = 'count the till';
      else if (n.purpose < 45 && can.has('cast')) action = pick(['cast', 'read', 'read']);
      else if (n.sleep > 60 && can.has('sleep') && Math.random() < 0.4) action = 'sleep';
      else action = pick(['read', 'read', 'look out the window', 'nothing', 'tend stock', 'cast', 'cast', 'write', 'count the till'].filter((a) => can.has(a)));

      if (!action || !can.has(action)) action = 'nothing';
      return { action, say: pick(SAY[action] || ['.']) };
    },

    async rewrite({ rawLines, front, money }) {
      const did = rawLines.map((l) => l.replace(/^\S+\s+/, '')).filter(Boolean);
      const broke = did.filter((l) => /broke|died|went out/.test(l)).length;
      const worked = did.filter((l) => /worked/.test(l)).length;
      const ate = did.filter((l) => /ate/.test(l)).length;
      const bits = [];
      bits.push(`till ${Math.round(money)}.`);
      if (broke) bits.push(`${broke} thing${broke > 1 ? 's' : ''} broke. the book did not warn me.`);
      if (worked) bits.push(`something worked. i am not saying what in case it hears.`);
      if (ate) bits.push(`ate ${ate} time${ate > 1 ? 's' : ''}. mostly stock.`);
      if (!broke && !worked) bits.push('nothing happened on purpose.');
      bits.push('the door is still shut.');
      const spells = front.split('\n').filter((l) => l.startsWith('- '));
      return { day: bits.join(' '), spells };
    },
  };
}
