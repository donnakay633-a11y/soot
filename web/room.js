// the room. style c: dusty gothic. everything here is built from code, no model files.
// it listens to /events for the cat's state and moves him accordingly.
// with no server (or ?demo) it plays a scripted evening so the room can be looked at on its own.

import * as THREE from 'three';
import { makeCat } from './cat.js';

// ---------- palette ----------
const P = {
  bg: 0x0b0d0a,
  wallBack: 0x2a3326,
  wallSide: 0x3a4433,
  plankA: 0x4a3a28,
  plankB: 0x3f3122,
  wood: 0x5a4530,
  woodDark: 0x3a2b1c,
  shelf: 0x5a4a30,
  paper: 0xd9d0a8,
  paperDark: 0xb8ad88,
  candle: 0xe0a040,
  flame: 0xf4e0a0,
  moon: 0x9fb0c8,
  cat: 0x16161a,
  eye: 0xc9b84a,
  rug: 0x5a2a2a,
  rugLine: 0x7a4a3a,
  cushion: 0x3a2a2a,
  glass: 0x1a1c2a,
  iron: 0x2a2416,
  tin: 0x3a3a30,
  crystal: 0x9fd8c8,
  jars: [0x5a6a4a, 0x7a5a3a, 0x6a4a5a, 0x4a5a6a, 0x8a7a4a, 0x4a6a5a],
};

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.02, flatShading: true, ...extra });

// ---------- scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(P.bg);
scene.fog = new THREE.Fog(P.bg, 14, 26);

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 60);
camera.position.set(9.5, 7.6, 10.5);
camera.lookAt(-0.3, 1.4, -0.6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
document.body.prepend(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// room: x from -4 to 4, z from -3 to 3, y from 0 to 5. back wall at z=-3, left wall at x=-4.
const W = 8, D = 6, H = 5;

function box(w, h, d, m, x, y, z, { shadow = true, receive = true } = {}) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  g.position.set(x, y, z);
  g.castShadow = shadow;
  g.receiveShadow = receive;
  scene.add(g);
  return g;
}

// ---------- walls and floor ----------
const back = box(W, H, 0.3, mat(P.wallBack), 0, H / 2, -D / 2 - 0.15, { shadow: false });
const left = box(0.3, H, D, mat(P.wallSide), -W / 2 - 0.15, H / 2, 0, { shadow: false });
// floor planks running along x
for (let i = 0; i < 12; i++) {
  const z = -D / 2 + 0.25 + i * 0.5;
  box(W, 0.12, 0.48, mat(i % 2 ? P.plankA : P.plankB), 0, -0.06, z, { shadow: false });
}
// skirting
box(W, 0.3, 0.12, mat(P.woodDark), 0, 0.15, -D / 2 + 0.06, { shadow: false });
box(0.12, 0.3, D, mat(P.woodDark), -W / 2 + 0.06, 0.15, 0, { shadow: false });
// a beam across the ceiling line, suggests the rest of the building
box(W, 0.3, 0.3, mat(P.woodDark), 0, H - 0.15, -D / 2 + 0.15, { shadow: false });
box(0.3, 0.3, D, mat(P.woodDark), -W / 2 + 0.15, H - 0.15, 0, { shadow: false });

// ---------- arched window on the left wall ----------
{
  const frame = new THREE.Group();
  const shape = new THREE.Shape();
  const w = 1.6, h = 2.6, r = w / 2;
  shape.moveTo(-w / 2, 0);
  shape.lineTo(-w / 2, h - r);
  shape.absarc(0, h - r, r, Math.PI, 0, true);
  shape.lineTo(w / 2, 0);
  shape.lineTo(-w / 2, 0);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), new THREE.MeshStandardMaterial({ color: P.glass, emissive: 0x141a2e, emissiveIntensity: 0.9, roughness: 1 }));
  glass.rotation.y = Math.PI / 2;
  glass.position.set(-W / 2 + 0.02, 1.4, -0.9);
  frame.add(glass);
  // iron frame: a sill, two uprights, a cross bar, a centre bar
  const iron = mat(P.iron);
  const sill = box(0.5, 0.12, w + 0.5, mat(P.woodDark), -W / 2 + 0.2, 1.36, -0.9);
  const upL = box(0.08, h - r, 0.08, iron, -W / 2 + 0.06, 1.4 + (h - r) / 2, -0.9 - w / 2);
  const upR = box(0.08, h - r, 0.08, iron, -W / 2 + 0.06, 1.4 + (h - r) / 2, -0.9 + w / 2);
  const cross = box(0.08, 0.08, w, iron, -W / 2 + 0.06, 2.6, -0.9);
  const centre = box(0.08, h, 0.08, iron, -W / 2 + 0.06, 1.4 + h / 2, -0.9);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 6, 24, Math.PI), iron);
  arch.rotation.y = Math.PI / 2;
  arch.position.set(-W / 2 + 0.06, 1.4 + h - r, -0.9);
  scene.add(arch);
  scene.add(frame);
  // the moon, seen through the glass
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ color: 0xd9d0a8 }));
  moon.rotation.y = Math.PI / 2;
  moon.position.set(-W / 2 + 0.05, 3.1, -1.25);
  scene.add(moon);
  const bite = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), new THREE.MeshBasicMaterial({ color: P.glass }));
  bite.rotation.y = Math.PI / 2;
  bite.position.set(-W / 2 + 0.06, 3.16, -1.14);
  scene.add(bite);
  window.__moon = { moon, bite };
}

// ---------- shelves on the back wall, with jars ----------
const jars = [];
{
  const shelfY = [1.6, 2.5, 3.4];
  for (const y of shelfY) {
    box(4.2, 0.1, 0.5, mat(P.shelf), 0.1, y, -D / 2 + 0.3);
    // brackets
    box(0.08, 0.3, 0.3, mat(P.woodDark), -1.6, y - 0.2, -D / 2 + 0.2);
    box(0.08, 0.3, 0.3, mat(P.woodDark), 2.0, y - 0.2, -D / 2 + 0.2);
  }
  let k = 0;
  for (const y of shelfY) {
    for (let i = 0; i < 7; i++) {
      if ((i * 7 + k) % 5 === 0) continue; // gaps on the shelf
      const h = 0.28 + ((i * 13 + k * 5) % 4) * 0.07;
      const r = 0.1 + ((i * 3 + k) % 3) * 0.02;
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, h, 10), mat(P.jars[(i + k) % P.jars.length], { roughness: 0.6 }));
      jar.position.set(-1.4 + i * 0.56, y + 0.05 + h / 2, -D / 2 + 0.3);
      jar.castShadow = true;
      scene.add(jar);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.05, 10), mat(P.paperDark));
      lid.position.set(jar.position.x, jar.position.y + h / 2 + 0.025, jar.position.z);
      scene.add(lid);
      jars.push({ jar, lid });
    }
    k++;
  }
  // the mirror, propped on the top shelf
  const mirrorFrame = box(0.7, 0.9, 0.06, mat(P.iron), -1.3, 3.9, -D / 2 + 0.32);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.76), new THREE.MeshStandardMaterial({ color: 0x3a3a30, roughness: 0.25, metalness: 0.6 }));
  mirror.position.set(-1.3, 3.9, -D / 2 + 0.36);
  scene.add(mirror);
}

// ---------- the desk ----------
const DESK = { x: 0.6, z: 0.2 };
box(3.4, 0.14, 1.5, mat(P.wood), DESK.x, 1.03, DESK.z);
box(3.2, 0.3, 1.3, mat(P.woodDark), DESK.x, 0.8, DESK.z);
for (const [dx, dz] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]]) {
  box(0.16, 0.95, 0.16, mat(P.woodDark), DESK.x + dx, 0.48, DESK.z + dz);
}
// the book, open
const bookGroup = new THREE.Group();
{
  const cover = box(1.1, 0.06, 0.8, mat(P.woodDark), 0, 0, 0);
  const pageL = box(0.5, 0.05, 0.72, mat(P.paper), -0.27, 0.05, 0);
  const pageR = box(0.5, 0.05, 0.72, mat(P.paperDark), 0.27, 0.05, 0);
  for (const m of [cover, pageL, pageR]) {
    scene.remove(m);
    bookGroup.add(m);
  }
  // lines of ink
  const ink = mat(0x6a5a3a);
  for (let i = 0; i < 5; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.01, 0.025), ink);
    l.position.set(-0.27, 0.08, -0.25 + i * 0.12);
    bookGroup.add(l);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.3 - (i % 2) * 0.08, 0.01, 0.025), ink);
    r.position.set(0.27, 0.08, -0.25 + i * 0.12);
    bookGroup.add(r);
  }
  bookGroup.position.set(DESK.x - 0.5, 1.1, DESK.z + 0.1);
  bookGroup.rotation.y = 0.18;
  scene.add(bookGroup);
}
// the till: a tin
const till = box(0.5, 0.3, 0.36, mat(P.tin, { roughness: 0.5, metalness: 0.4 }), DESK.x + 1.3, 1.25, DESK.z - 0.4);

// ---------- candles ----------
const candles = [];
function makeCandle(x, z, h) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, h, 10), mat(P.paper));
  stick.position.y = h / 2;
  stick.castShadow = true;
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 12), mat(P.iron));
  dish.position.y = 0.02;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), new THREE.MeshBasicMaterial({ color: P.flame }));
  flame.position.y = h + 0.1;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), new THREE.MeshBasicMaterial({ color: P.candle, transparent: true, opacity: 0.35 }));
  glow.position.y = h + 0.08;
  const light = new THREE.PointLight(P.candle, 14, 8, 2);
  light.position.y = h + 0.2;
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.bias = -0.004;
  g.add(stick, dish, flame, glow, light);
  g.position.set(x, 1.1, z);
  scene.add(g);
  candles.push({ g, flame, glow, light, base: 14, h });
  return g;
}
makeCandle(DESK.x + 0.55, DESK.z + 0.35, 0.5);
makeCandle(DESK.x + 1.2, DESK.z + 0.2, 0.34);

// ---------- cushion, rug, bowl, door, herbs ----------
const CUSHION = { x: -2.6, z: 1.9 };
const RUG = { x: -2.4, z: 1.6 };
{
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 1.9), mat(P.rug));
  rug.position.set(RUG.x, 0.02, RUG.z);
  rug.receiveShadow = true;
  scene.add(rug);
  const border = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.045, 1.6), mat(P.rugLine));
  border.position.set(RUG.x, 0.022, RUG.z);
  scene.add(border);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 1.3), mat(P.rug));
  inner.position.set(RUG.x, 0.025, RUG.z);
  scene.add(inner);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.22, 14), mat(P.cushion, { roughness: 1 }));
  cushion.position.set(CUSHION.x, 0.16, CUSHION.z);
  cushion.castShadow = true;
  cushion.receiveShadow = true;
  scene.add(cushion);
}
const BOWL = { x: -2.9, z: -2.2 };
const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.18, 0.14, 12), mat(P.tin, { roughness: 0.5, metalness: 0.3 }));
bowl.position.set(BOWL.x, 0.07, BOWL.z);
scene.add(bowl);
const bowlFood = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), mat(0x6a4a3a));
bowlFood.position.set(BOWL.x, 0.14, BOWL.z);
scene.add(bowlFood);

// the door is on the back wall, right of the shelves. shut. where offerings appear.
const DOOR = { x: 3.0, z: -D / 2 };
{
  box(1.3, 3.0, 0.22, mat(P.woodDark), DOOR.x, 1.5, DOOR.z + 0.2);
  box(0.14, 3.1, 0.26, mat(P.iron), DOOR.x - 0.7, 1.55, DOOR.z + 0.2);
  box(0.14, 3.1, 0.26, mat(P.iron), DOOR.x + 0.7, 1.55, DOOR.z + 0.2);
  box(1.5, 0.14, 0.26, mat(P.iron), DOOR.x, 3.07, DOOR.z + 0.2);
  for (let i = 0; i < 4; i++) box(0.26, 2.8, 0.04, mat(i % 2 ? P.wood : P.woodDark), DOOR.x - 0.48 + i * 0.32, 1.5, DOOR.z + 0.33);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 16), mat(P.iron, { metalness: 0.5, roughness: 0.4 }));
  ring.position.set(DOOR.x + 0.35, 1.5, DOOR.z + 0.38);
  scene.add(ring);
}
// herbs hanging from the beam near the window
{
  const twine = mat(0x8a7a5a);
  const herb = (x, z, len, color) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 4), twine);
    t.position.set(x, H - 0.3 - len / 2, z);
    scene.add(t);
    const bunch = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 6), mat(color));
    bunch.position.set(x, H - 0.3 - len - 0.25, z);
    bunch.castShadow = true;
    scene.add(bunch);
  };
  herb(-2.8, -2.4, 0.5, 0x4a5a3a);
  herb(-2.3, -2.6, 0.7, 0x6a5a3a);
  herb(-1.8, -2.3, 0.45, 0x4a5a3a);
  herb(-3.2, -1.9, 0.9, 0x5a6a4a);
}

// the offering, by the door. a crystal. hidden until somebody leaves something.
const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: P.crystal, emissive: P.crystal, emissiveIntensity: 0.6, roughness: 0.3 }));
crystal.position.set(DOOR.x - 0.2, 0.25, DOOR.z + 0.75);
crystal.visible = false;
scene.add(crystal);
const crystalLight = new THREE.PointLight(P.crystal, 0, 3, 2);
crystalLight.position.copy(crystal.position).add(new THREE.Vector3(0, 0.3, 0));
scene.add(crystalLight);

// ---------- light ----------
scene.add(new THREE.AmbientLight(0x5a6a7a, 0.45));
const hemi = new THREE.HemisphereLight(0x6a7a8a, 0x3a2c1c, 0.6);
scene.add(hemi);
// moonlight through the window: cool, low, a long shadow across the floor
const moonLight = new THREE.DirectionalLight(P.moon, 1.3);
moonLight.position.set(-9, 6, -3);
moonLight.target.position.set(-1, 0, 0.5);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
moonLight.shadow.camera.left = -6;
moonLight.shadow.camera.right = 6;
moonLight.shadow.camera.top = 6;
moonLight.shadow.camera.bottom = -6;
moonLight.shadow.bias = -0.002;
scene.add(moonLight, moonLight.target);
const fill = new THREE.DirectionalLight(0x4a4038, 0.35);
fill.position.set(8, 5, 9);
scene.add(fill);

// ---------- the cat ----------
const soot = makeCat();
const cat = soot.group;
cat.position.set(-0.6, 0, 1.2);
scene.add(cat);

// ---------- places the cat can be ----------
const SPOT = {
  desk: { x: DESK.x + 0.25, y: 1.1, z: DESK.z + 0.2, face: -1 },
  till: { x: DESK.x + 0.95, y: 1.1, z: DESK.z - 0.1, face: -1 },
  cushion: { x: CUSHION.x, y: 0.26, z: CUSHION.z, face: 1 },
  bowl: { x: BOWL.x + 0.5, y: 0, z: BOWL.z + 0.1, face: -1 },
  window: { x: -W / 2 + 0.3, y: 1.42, z: -0.9, face: -1 },
  shelves: { x: 1.0, y: 0, z: -1.9, face: -1 },
  mirror: { x: -1.3, y: 0, z: -1.9, face: -1 },
  door: { x: DOOR.x - 0.9, y: 0, z: DOOR.z + 0.9, face: 1 },
  middle: { x: -0.6, y: 0, z: 1.2, face: 1 },
};

const WHERE = {
  eat: 'bowl',
  sleep: 'cushion',
  read: 'desk',
  write: 'desk',
  cast: 'desk',
  'count the till': 'till',
  'tend stock': 'shelves',
  'light candle': 'desk',
  'look out the window': 'window',
  'check the mirror': 'mirror',
  'find the offering': 'door',
  nothing: 'middle',
};

// ---------- state and animation ----------
const S = {
  action: 'nothing',
  target: SPOT.middle,
  from: { ...SPOT.middle },
  t: 1,
  asleep: false,
  mood: 'content',
  castAt: 0,
  candlesLit: 2,
  offerings: 0,
  face: 1,
};

function goTo(spot) {
  S.from = { x: cat.position.x, y: cat.position.y, z: cat.position.z };
  S.target = spot;
  S.t = 0;
}

export function applyState(st) {
  const action = st.asleep ? 'sleep' : st.action || 'nothing';
  if (action !== S.action || st.asleep !== S.asleep) {
    S.action = action;
    goTo(SPOT[WHERE[action]] || SPOT.middle);
    if (action === 'cast') S.castAt = performance.now();
  }
  S.asleep = !!st.asleep;
  S.mood = st.mood;
  S.candlesLit = st.candles ? st.candles.lit : 2;
  S.offerings = st.offerings || 0;
  // the room
  bowlFood.visible = st.bowl > 0;
  const visibleJars = Math.min(jars.length, Math.max(2, Math.round((st.stock || 0) * 3)));
  jars.forEach((j, i) => {
    j.jar.visible = i < visibleJars || i % 3 !== 0;
    j.lid.visible = j.jar.visible;
  });
  candles.forEach((c, i) => {
    const lit = i < S.candlesLit;
    c.flame.visible = lit;
    c.glow.visible = lit;
    c.light.intensity = lit ? c.base : 0;
  });
  crystal.visible = S.offerings > 0;
  crystalLight.intensity = S.offerings > 0 ? 1.4 : 0;
  // the plate
  plate(st);
}

// ---------- the plate ----------
const $ = (id) => document.getElementById(id);
function plate(st) {
  $('plate').classList.add('on');
  $('moon').textContent = 'moon ' + (st.moon || '');
  $('time').textContent = st.time || '';
  $('mood').textContent = st.asleep ? 'asleep' : st.mood || '';
  $('say').textContent = st.say || (st.asleep ? '' : '');
  $('did').textContent = st.asleep ? 'the book is being rewritten' : st.event || '';
  for (const k of ['hunger', 'sleep', 'purpose']) {
    const v = st.needs ? st.needs[k] : 0;
    const el = $('n-' + k);
    el.querySelector('.val').textContent = v;
    el.querySelector('.bar i').style.width = v + '%';
    el.classList.toggle('warn', k === 'purpose' ? v < 30 : v > 70);
  }
  const d = $('diary');
  d.innerHTML = '';
  for (const line of (st.diary || []).slice(-4)) {
    const div = document.createElement('div');
    div.textContent = line;
    d.appendChild(div);
  }
}

// ---------- frame ----------
const params = new URLSearchParams(location.search);
const CLOSE = params.has('close'); // a close camera on the cat, for checking him
const clock = new THREE.Clock();
const ease = (t) => 1 - Math.pow(1 - t, 3);

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now() / 1000;

  // walking
  if (S.t < 1) {
    S.t = Math.min(1, S.t + dt / 1.6);
    const e = ease(S.t);
    cat.position.x = S.from.x + (S.target.x - S.from.x) * e;
    cat.position.z = S.from.z + (S.target.z - S.from.z) * e;
    const hop = Math.sin(S.t * Math.PI * 4) * 0.06 * (1 - S.t);
    cat.position.y = S.from.y + (S.target.y - S.from.y) * e + Math.max(0, hop) + (S.target.y > S.from.y + 0.5 ? Math.sin(S.t * Math.PI) * 0.7 : 0);
    const dx = S.target.x - S.from.x;
    if (Math.abs(dx) > 0.1) S.face = dx > 0 ? 1 : -1;
  } else {
    S.face = S.target.face;
  }
  const want = S.face > 0 ? 0 : Math.PI;
  let diff = want - cat.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  cat.rotation.y += diff * Math.min(1, dt * 6);

  // pose
  const moving = S.t < 1;
  const a = S.action;
  let pose = 'sit';
  if (S.asleep || a === 'sleep') pose = 'sleep';
  else if (moving) pose = 'walk';
  else if (a === 'read' || a === 'write' || a === 'count the till') pose = 'read';
  else if (a === 'eat') pose = 'eat';
  else if (a === 'look out the window' || a === 'check the mirror' || a === 'find the offering') pose = 'look';
  else if (a === 'tend stock' || a === 'light candle' || a === 'cast') pose = 'stand';
  soot.setPose(pose);
  soot.update(dt, now, S.asleep ? 'asleep' : S.mood, moving);

  // candles flicker
  candles.forEach((c, i) => {
    if (c.light.intensity === 0) return;
    const f = 1 + Math.sin(now * 13 + i * 7) * 0.08 + Math.sin(now * 29 + i * 3) * 0.05;
    const burst = a === 'cast' && now * 1000 - S.castAt < 1500 ? 1 + Math.sin((now * 1000 - S.castAt) / 1500 * Math.PI) * 1.8 : 1;
    c.light.intensity = c.base * f * burst;
    c.flame.scale.setScalar(f * (burst > 1 ? 1 + (burst - 1) * 0.6 : 1));
    c.glow.material.opacity = 0.3 * f * burst;
  });

  // crystal
  if (crystal.visible) {
    crystal.rotation.y += dt * 0.8;
    crystal.position.y = 0.25 + Math.sin(now * 2) * 0.04;
    crystalLight.intensity = 1.2 + Math.sin(now * 3) * 0.3;
  }

  if (CLOSE) {
    camera.position.set(cat.position.x + 2.6, cat.position.y + 1.7, cat.position.z + 2.4);
    camera.lookAt(cat.position.x, cat.position.y + 0.45, cat.position.z);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

// ---------- feed ----------
let gotState = false;

function connect() {
  try {
    const es = new EventSource('/events');
    es.onmessage = (e) => {
      gotState = true;
      $('brain').textContent = 'live';
      applyState(JSON.parse(e.data));
    };
    es.onerror = () => {
      if (!gotState) startDemo();
    };
  } catch {
    startDemo();
  }
}

// a scripted evening, for looking at the room with no server behind it
function startDemo() {
  if (window.__demo) return;
  window.__demo = true;
  $('brain').textContent = 'demo';
  const script = [
    ['look out the window', 'content', 'moon is going. good. the last one was too interested.', 'looked out. moon waning crescent'],
    ['read', 'content', 'page forty. the one about doors. still wants a key.', 'read about the door spell'],
    ['count the till', 'anxious', 'nine. it was nine yesterday. that is not a trend, that is a fact.', 'counted the till. 9'],
    ['nothing', 'content', 'sat.', 'sat'],
    ['tend stock', 'content', 'herbs into jars. the rosemary is giving up but so am i.', 'made 2 jars from the herbs. 4 herbs left'],
    ['cast', 'content', 'said the words. waited.', 'cast the rosemary spell. it failed. a jar broke. 4 jars left'],
    ['check the mirror', 'bleak', 'mirror. no.', 'checked the mirror'],
    ['find the offering', 'restless', 'something at the door. reading it.', 'read what tio left: "is the door spell a rosemary spell or not"'],
    ['write', 'content', 'wrote small. rule five.', 'wrote: the door spell is a rosemary spell. now the rosemary is on the floor'],
    ['eat', 'content', 'dinner was stock. the ledger will not like that but the ledger is not hungry.', 'ate a jar of stock. 3 jars left'],
    ['sleep', 'restless', 'going to sleep on this and the book, in that order.', 'went to sleep'],
  ];
  let i = 0;
  let needs = { hunger: 40, sleep: 35, purpose: 55 };
  let diary = ['21:40  read what tio left. tio is someone now'];
  const tick = () => {
    const [action, mood, say, event] = script[i % script.length];
    const asleep = action === 'sleep' && i % script.length === script.length - 1;
    needs = {
      hunger: Math.min(95, needs.hunger + (action === 'eat' ? -40 : 6)),
      sleep: Math.min(95, needs.sleep + (action === 'sleep' ? -60 : 5)),
      purpose: Math.max(5, Math.min(95, needs.purpose + (action === 'cast' ? -8 : action === 'read' ? 6 : -2))),
    };
    if (/broke|read what|wrote/.test(event)) diary.push(`${21 + Math.floor(i / 6)}:${String(40 + (i * 7) % 20).padStart(2, '0')}  ${event}`);
    applyState({
      time: `${21 + Math.floor(i / 6)}:${String(40 + (i * 7) % 20).padStart(2, '0')}`,
      moon: 'waning crescent',
      mood,
      asleep,
      needs,
      money: 9,
      stock: action === 'tend stock' ? 5 : 3,
      bowl: action === 'eat' ? 0 : 1,
      candles: { lit: action === 'cast' && i % 2 ? 1 : 2, total: 2 },
      offerings: i % script.length >= 5 && i % script.length < 7 ? 1 : 0,
      action,
      say,
      event,
      diary: diary.slice(-4),
    });
    i++;
    setTimeout(tick, asleep ? 7000 : 4200);
  };
  tick();
}

if (params.has('demo')) startDemo();
else {
  connect();
  setTimeout(() => {
    if (!gotState) startDemo();
  }, 3000);
}
