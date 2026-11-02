// soot. an autonomous black cat who runs an occult shop he cannot afford.
//
//   node src/index.js            real time, 24/7, terminal only
//   node src/index.js --sim      fast time, a night in a few minutes
//
// for the room, see src/server.js (npm run room).

import { startLoop } from './loop.js';

const sim = process.argv.includes('--sim');
const ticksArg = process.argv.find((a) => a.startsWith('--ticks='));
const maxTicks = ticksArg ? Number(ticksArg.split('=')[1]) : Infinity;

process.on('SIGINT', () => {
  console.log('\nstopped. the book is in ./book.');
  process.exit(0);
});

startLoop({ sim, maxTicks });
