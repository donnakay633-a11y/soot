# soot

an autonomous black cat who runs an occult shop he cannot afford.

one room. a book. the door is shut. he eats, sleeps, reads, casts, breaks jars, counts a till that never changes, and writes it all down in a book he rewrites every time he sleeps. nobody plays him. you can leave him something at the door and he will get to it when he gets to it.

steps 1 and 2 are in: the body, the brain, the book, and the room.

## run it

```
npm install
npm run room            # the room, at http://localhost:7777, real time
npm run room -- --sim   # the room, fast time: a night in a few minutes
npm run sim             # terminal only, fast time, no key needed
npm start               # terminal only, real time, 24/7
```

the room is built in three.js from code alone (no model files) and listens to the loop over server-sent events. open it in a browser, or point an obs browser source at it. with no server behind it (or with `?demo` on the url) it plays a scripted evening, which is also what `npm run build:demo` packages into `dist/demo.html` for showing people.

with no `ANTHROPIC_API_KEY` set, the scripted brain runs: rules and template lines, free, a bit flat. set the key and the API brain takes over with the real voice:

```
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

the model and the brain are one line each in `config.json`.

## leave him something

```
npm run offer -- "your name" "what you want to say"
```

it appears by the door. he reads it when he decides to. nothing is sent back. read the book:

```
npm run book
```

## the book

`book/` is his only memory. if it is not in the book, he does not know it.

- `first-page.md`  fixed. the only line that ever changes is a name he adds himself when someone becomes one of his.
- `front.md`  spells. capped at 12.
- `middle.md`  the diary. raw lines all day, rewritten into one paragraph when he sleeps. he is allowed to misremember.
- `back.md`  the till and the people, with a standing number each.

## how a tick works

every few seconds (5 to 30, set by mood):

1. the body drifts: hunger, sleep and purpose move on their own. candles burn money.
2. mood is derived from the worst need, the last three events and the moon. six words: content, restless, anxious, bleak, smug, feral.
3. the room is observed in a few short lines.
4. the brain picks one of the twelve actions the room can currently execute, and says one line about it.
5. the room does it. if it mattered, it goes in the book.

the brain never invents an action. it chooses from a list, so it cannot do anything the room cannot show.

## layout

```
config.json          brain, model, loop speeds, drift rates, starting room
book/                his memory
offerings/           things left at the door, picked up each tick
src/index.js         the loop
src/world.js         needs, mood, observation
src/actions.js       the twelve actions
src/book.js          reading and writing the book
src/clock.js         time and the moon
src/brain/           scripted.js (free), anthropic.js (the voice), index.js (picks one)
```

## layout, continued

```
src/loop.js            the loop as a module
src/server.js          the room server: / /events /state /book /offer
web/index.html         the room page and the plate overlay
web/room.js            the room, the spots, the animations
web/cat.js             the cat: a low-poly model built from code, posed by blending
scripts/build-demo.js  packages the room as one file in demo mode
```

## next

- step 3: the visitor page, offering form and book reader
- step 4: obs browser source, clips
- the cat: whiskers twitch, ears flatten when bleak, but he has one walk and no jump. a real jump onto the desk is the next animation.
