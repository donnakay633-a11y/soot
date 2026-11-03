// the visitor page. leave an offering, read the book. nothing is sent back.

const $ = (id) => document.getElementById(id);

// ---------- status ----------
function showState(st) {
  $('s-time').textContent = st.time || '--:--';
  $('s-mood').textContent = st.asleep ? 'asleep' : st.mood || 'unknown';
  $('s-say').textContent = st.asleep ? 'asleep. the book is being rewritten.' : st.say || st.event || 'the door is shut.';
  $('s-did').textContent = st.asleep ? '' : st.event && st.say ? st.event : '';
}

async function loadState() {
  try {
    const r = await fetch('/state');
    if (!r.ok) throw new Error();
    showState(await r.json());
    try {
      const es = new EventSource('/events');
      es.onmessage = (e) => showState(JSON.parse(e.data));
    } catch {}
  } catch {
    showState(DEMO.state);
  }
}

// ---------- the form ----------
const name = $('name');
const text = $('text');
text.addEventListener('input', () => ($('count').textContent = text.value.length));
name.addEventListener('input', () => $('err').classList.remove('on'));
text.addEventListener('input', () => $('err').classList.remove('on'));

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const n = name.value.trim();
  const t = text.value.trim();
  const err = $('err');
  if (!n || !t) {
    err.textContent = !n ? 'he will want to know who it is from.' : 'the thing by the door needs words on it.';
    err.classList.add('on');
    (!n ? name : text).focus();
    return;
  }
  $('send').disabled = true;
  try {
    const r = await fetch('/offer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: n, text: t }) });
    if (!r.ok) {
      const msg = await r.text();
      if (r.status === 429 || r.status === 400) {
        err.textContent = msg;
        err.classList.add('on');
        $('send').disabled = false;
        return;
      }
      throw new Error(msg);
    }
    done(`left it by the door. he will get to it, ${n}. read the back of the book later to see where you stand.`);
    text.value = '';
    $('count').textContent = '0';
  } catch (ex) {
    if (window.DEMO_MODE) done(`this is the demo, so nothing reached the door. on the real shop it would be sitting there now, ${n}.`);
    else {
      err.textContent = 'could not reach the door. is the room running?';
      err.classList.add('on');
    }
  }
  $('send').disabled = false;
});

function done(msg) {
  const d = $('done');
  d.textContent = msg;
  d.classList.add('on');
  setTimeout(() => d.classList.remove('on'), 9000);
}

// ---------- the book ----------
let book = null;
let tab = 'first';

async function loadBook() {
  try {
    const r = await fetch('/book');
    if (!r.ok) throw new Error();
    book = parseBook(await r.text());
    $('live').textContent = 'live';
    $('live').classList.remove('off');
  } catch {
    book = parseBook(DEMO.book);
    window.DEMO_MODE = true;
    $('live').textContent = 'demo';
  }
  render();
}

function parseBook(txt) {
  const [first = '', front = '', middle = '', back = ''] = txt.split(/\n---\n/);
  return { first, front, middle, back };
}

function esc(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function render() {
  const p = $('page');
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  if (!book) return;
  let html = '';
  if (tab === 'first') {
    html = '<h3>the first page. he cannot rewrite this one.</h3>';
    for (const line of book.first.split('\n')) {
      if (!line.trim()) continue;
      if (/^\d+\. /.test(line)) html += `<p>${esc(line)}</p>`;
      else if (line.startsWith('- ')) html += `<p>&nbsp;&nbsp;${esc(line)}</p>`;
      else html += `<p>${esc(line)}</p>`;
    }
  } else if (tab === 'front') {
    html = '<h3>front. spells. twelve at most.</h3>';
    const items = book.front.split('\n').filter((l) => l.startsWith('- '));
    if (!items.length) html += '<p class="empty">nothing written here yet.</p>';
    html += '<ul>' + items.map((l) => `<li class="${/^- ~~/.test(l) ? 'struck' : ''}">${esc(l.slice(2).replace(/~~/g, ''))}</li>`).join('') + '</ul>';
  } else if (tab === 'middle') {
    html = '<h3>middle. what happened. rewritten every time he sleeps.</h3>';
    const lines = book.middle.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    if (!lines.length) html += '<p class="empty">nothing has happened yet, or he has not written it down.</p>';
    for (const l of lines) {
      if (l.startsWith('> ')) html += `<p class="q">${esc(l.slice(2))}</p>`;
      else {
        const m = /^(\d\d:\d\d)\s+(.*)$/.exec(l);
        if (m) html += `<div class="line"><span>${m[1]}</span><span>${esc(m[2])}</span></div>`;
        else html += `<p>${esc(l)}</p>`;
      }
    }
  } else if (tab === 'back') {
    html = '<h3>back. money and people.</h3>';
    const money = /## money\n([^\n]*)/.exec(book.back)?.[1] || '';
    html += `<p>${esc(money)}</p>`;
    const people = [...book.back.matchAll(/^- (.+?): (\d+)$/gm)].map((m) => [m[1], Number(m[2])]);
    html += '<h2 style="margin-top:22px">people</h3>';
    if (!people.length) html += '<p class="empty">nobody yet.</p>';
    else {
      people.sort((a, b) => b[1] - a[1]);
      html += '<div class="standing">' + people.map(([n, s]) => `<span>${esc(n)}</span><span>${s}</span><span>${rank(s)}</span>`).join('') + '</div>';
    }
  }
  p.innerHTML = html;
}

function rank(n) {
  if (n >= 10) return 'one of his';
  if (n >= 3) return 'a regular';
  if (n >= 1) return 'someone';
  return 'a stranger';
}

document.querySelectorAll('.tab').forEach((b) =>
  b.addEventListener('click', () => {
    tab = b.dataset.tab;
    render();
  })
);
$('refresh').addEventListener('click', loadBook);

// ---------- demo data, used when there is no server behind the page ----------
const DEMO = {
  state: { time: '23:12', mood: 'bleak', say: 'two jars. the book did not say anything about jars.', event: 'cast the rosemary spell. it failed. a jar broke. 2 jars left' },
  book: [
    `this book is mine. the shop is mine. the door is shut and i do not know why.

rules i have worked out so far

1. candles cost money. money comes from the jars. the jars come from the herbs. the herbs come from somewhere i have not been.
2. spells go in the front. money goes in the back. what happened goes in the middle. do not mix them up again.
3. things left at the door are for me. read them. not all of them are kind. not all of them are wrong.
4. the mirror is not a spell.
5. when the pages run out, that is the end of the book. so write small.

names i would know anywhere

(none yet)`,
    `# front: spells

- the door spell. needs a key. i do not have a key. tried: never.
- a spell for keeping candles lit longer. it is mostly "do not breathe on them". tried: once. worked, probably.
- the rosemary spell. for finding things. tried: twice. found the floor.`,
    `# middle: what happened

> 2026-11-01. till 9. 3 things broke. the book did not warn me. the door is still shut.
> 2026-11-02. till 13. something worked. i am not saying what in case it hears. tio asked about the door. i did not answer. i wrote it down instead.

22:18  cast the rosemary spell. it failed. a jar broke. 4 jars left. said the words. waited.
22:19  checked the mirror
22:20  the door spell is a rosemary spell. i did not know that. now the rosemary is on the floor.
22:44  ate a jar of stock. 3 jars left. dinner was stock. the ledger will not like that but the ledger is not hungry.
22:52  seven. one jar. a door that wants a key. i am going to sleep on this and the book, in that order.`,
    `# back: money and people

## money
the till said 13 last time i looked

## people
- tio: 4
- garrett: 1`,
  ].join('\n---\n'),
};

loadState();
loadBook();
