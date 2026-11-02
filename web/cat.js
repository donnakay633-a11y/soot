// the cat. low-poly, built from code, posed by blending.
// makeCat() returns { group, setPose(name), update(dt, now, mood) }
// the group faces +x. turn it with group.rotation.y.

import * as THREE from 'three';

const BLACK = 0x15151a;
const INNER_EAR = 0x5a3340;
const EYE = 0xd4c24f;
const PUPIL = 0x0a0a0a;
const NOSE = 0x3a2a30;

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02, flatShading: true, ...extra });

const lerp = (a, b, t) => a + (b - a) * t;

export function makeCat() {
  const fur = mat(BLACK);
  const group = new THREE.Group();

  // ----- torso: a lathe, nose to tail, so it tapers like a cat and not a bean
  const torsoPts = [];
  const prof = [
    [0.0, 0.0], [0.06, 0.15], [0.14, 0.2], [0.26, 0.22], [0.4, 0.215], [0.54, 0.21], [0.64, 0.22], [0.74, 0.23], [0.82, 0.2], [0.87, 0.11], [0.88, 0.0],
  ];
  for (const [x, r] of prof) torsoPts.push(new THREE.Vector2(r, x));
  const torsoGeo = new THREE.LatheGeometry(torsoPts, 12);
  torsoGeo.rotateZ(-Math.PI / 2); // lathe axis y -> x
  torsoGeo.translate(-0.44, 0, 0);
  torsoGeo.scale(1, 0.9, 1);
  const torso = new THREE.Mesh(torsoGeo, fur);
  torso.castShadow = true;
  const torsoPivot = new THREE.Group();
  torsoPivot.add(torso);
  torsoPivot.position.y = 0.42;
  group.add(torsoPivot);

  // haunches, a little wider than the torso at the back
  const haunchGeo = new THREE.SphereGeometry(0.22, 10, 8);
  haunchGeo.scale(0.9, 0.95, 1.2);
  const haunch = new THREE.Mesh(haunchGeo, fur);
  haunch.position.set(-0.34, -0.02, 0);
  haunch.castShadow = true;
  torsoPivot.add(haunch);

  // ----- legs: thigh + shin as one tapered cylinder, paw as a squashed sphere
  const legs = {};
  const legGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.44, 7);
  legGeo.translate(0, -0.22, 0);
  const pawGeo = new THREE.SphereGeometry(0.085, 8, 6);
  pawGeo.scale(1.2, 0.55, 1);
  for (const [name, x, z] of [['fl', 0.26, -0.12], ['fr', 0.26, 0.12], ['bl', -0.32, -0.14], ['br', -0.32, 0.14]]) {
    const hip = new THREE.Group();
    hip.position.set(x, -0.02, z);
    const leg = new THREE.Mesh(legGeo, fur);
    leg.castShadow = true;
    const paw = new THREE.Mesh(pawGeo, fur);
    paw.position.set(0.03, -0.44, 0);
    paw.castShadow = true;
    hip.add(leg, paw);
    torsoPivot.add(hip);
    legs[name] = hip;
  }

  // ----- head on a neck pivot
  const neck = new THREE.Group();
  neck.position.set(0.42, 0.1, 0);
  torsoPivot.add(neck);
  const headGeo = new THREE.SphereGeometry(0.22, 10, 8);
  headGeo.scale(1.0, 0.92, 1.05);
  const head = new THREE.Mesh(headGeo, fur);
  head.castShadow = true;
  const headPivot = new THREE.Group();
  headPivot.position.set(0.1, 0.1, 0);
  headPivot.add(head);
  neck.add(headPivot);
  // muzzle
  const muzzleGeo = new THREE.SphereGeometry(0.12, 8, 6);
  muzzleGeo.scale(1.1, 0.7, 1.1);
  const muzzle = new THREE.Mesh(muzzleGeo, fur);
  muzzle.position.set(0.17, -0.06, 0);
  headPivot.add(muzzle);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.04, 4), mat(NOSE, { roughness: 0.5 }));
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(0.3, -0.03, 0);
  headPivot.add(nose);
  // ears: a thin triangular prism with a pink inner face
  const earShape = new THREE.Shape();
  earShape.moveTo(-0.07, 0);
  earShape.lineTo(0.07, 0);
  earShape.lineTo(0.0, 0.2);
  earShape.lineTo(-0.07, 0);
  const earGeo = new THREE.ExtrudeGeometry(earShape, { depth: 0.035, bevelEnabled: false });
  earGeo.rotateY(Math.PI / 2); // flat face points along x
  const earInnerGeo = new THREE.ShapeGeometry(earShape);
  earInnerGeo.scale(0.6, 0.6, 1);
  earInnerGeo.rotateY(Math.PI / 2);
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, fur);
    ear.castShadow = true;
    ear.position.set(0.04, 0.17, side * 0.11);
    ear.rotation.x = side * -0.35;
    ear.rotation.z = 0.15;
    const inner = new THREE.Mesh(earInnerGeo, mat(INNER_EAR, { roughness: 0.9 }));
    inner.position.set(0.02, 0.02, 0);
    ear.add(inner);
    headPivot.add(ear);
    ears.push(ear);
  }
  // eyes: a yellow disc with a slit
  const eyes = [];
  const pupils = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: EYE }));
    eye.position.set(0.17, 0.04, side * 0.085);
    eye.scale.set(0.6, 1, 1);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.012), new THREE.MeshBasicMaterial({ color: PUPIL }));
    pupil.position.set(0.045, 0, 0);
    eye.add(pupil);
    headPivot.add(eye);
    eyes.push(eye);
    pupils.push(pupil);
  }
  // whiskers: three thin lines each side
  const whiskerMat = new THREE.LineBasicMaterial({ color: 0x55555c, transparent: true, opacity: 0.7 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.24, -0.05 + i * 0.015, side * 0.08), new THREE.Vector3(0.3, -0.1 + i * 0.045, side * 0.26)]);
      headPivot.add(new THREE.Line(g, whiskerMat));
    }
  }

  // ----- tail: a tube along a curve we rewrite every frame
  const tailPts = Array.from({ length: 6 }, () => new THREE.Vector3());
  const tailCurve = new THREE.CatmullRomCurve3(tailPts);
  let tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 16, 0.045, 6, false), fur);
  tail.castShadow = true;
  torsoPivot.add(tail);
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), fur);
  torsoPivot.add(tailTip);

  // ----- poses: every number the animation blends between
  const POSES = {
    stand: { torsoY: 0.46, torsoRot: 0, torsoSY: 1, haunchY: -0.04, neckRot: 0, headRot: 0, headY: 0.1, legs: [0, 0, 0, 0], legLen: 1, eyes: 1, earRot: 0.15, tailBase: 0.5, tailCurl: 0.6, tailSide: 0 },
    sit: { torsoY: 0.44, torsoRot: -0.5, torsoSY: 1, haunchY: 0.02, neckRot: 0.5, headRot: 0.05, headY: 0.1, legs: [0.5, 0.5, -1.3, -1.3], legLen: 1, eyes: 1, earRot: 0.15, tailBase: 0.2, tailCurl: 0.3, tailSide: 0.9 },
    walk: { torsoY: 0.48, torsoRot: 0, torsoSY: 1, haunchY: -0.04, neckRot: -0.05, headRot: 0.05, headY: 0.1, legs: [0, 0, 0, 0], legLen: 1, eyes: 1, earRot: 0.15, tailBase: 0.9, tailCurl: 0.2, tailSide: 0 },
    read: { torsoY: 0.44, torsoRot: -0.5, torsoSY: 1, haunchY: 0.02, neckRot: 0.75, headRot: 0.45, headY: 0.05, legs: [0.5, 0.5, -1.3, -1.3], legLen: 1, eyes: 1, earRot: 0.3, tailBase: 0.2, tailCurl: 0.3, tailSide: 0.9 },
    eat: { torsoY: 0.46, torsoRot: 0.15, torsoSY: 1, haunchY: -0.04, neckRot: 0.9, headRot: 0.55, headY: 0.05, legs: [0.1, 0.1, 0, 0], legLen: 1, eyes: 0.4, earRot: 0.45, tailBase: 0.4, tailCurl: 0.5, tailSide: 0 },
    look: { torsoY: 0.44, torsoRot: -0.35, torsoSY: 1, haunchY: 0, neckRot: -0.55, headRot: -0.25, headY: 0.12, legs: [0.3, 0.3, -1.1, -1.1], legLen: 1, eyes: 1, earRot: 0.05, tailBase: 0.3, tailCurl: 0.4, tailSide: 0.6 },
    sleep: { torsoY: 0.26, torsoRot: 0.05, torsoSY: 0.75, haunchY: -0.02, neckRot: 0.95, headRot: 0.35, headY: -0.02, legs: [1.2, 1.2, -1.5, -1.5], legLen: 0.6, eyes: 0, earRot: -0.2, tailBase: -0.3, tailCurl: 1.4, tailSide: 1.6 },
  };

  const cur = JSON.parse(JSON.stringify(POSES.stand));
  let target = POSES.stand;
  let poseName = 'stand';
  let walkPhase = 0;
  let blink = 0;

  function setPose(name) {
    if (POSES[name]) {
      target = POSES[name];
      poseName = name;
    }
  }

  function update(dt, now, mood = 'content', moving = false) {
    const k = 1 - Math.pow(0.001, dt); // frame-rate independent ease, ~fast
    for (const key of Object.keys(target)) {
      if (key === 'legs') for (let i = 0; i < 4; i++) cur.legs[i] = lerp(cur.legs[i], target.legs[i], k * 0.7);
      else cur[key] = lerp(cur[key], target[key], k * 0.7);
    }

    // breathing
    const breath = Math.sin(now * (poseName === 'sleep' ? 1.1 : 2.2)) * (poseName === 'sleep' ? 0.015 : 0.008);
    torsoPivot.position.y = cur.torsoY + breath;
    torsoPivot.rotation.z = cur.torsoRot;
    torso.scale.y = cur.torsoSY + breath;
    haunch.position.y = cur.haunchY;

    // walk cycle on the legs
    if (moving) walkPhase += dt * 9;
    const legOrder = ['fl', 'fr', 'bl', 'br'];
    legOrder.forEach((n, i) => {
      const swing = moving ? Math.sin(walkPhase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.55 : 0;
      legs[n].rotation.z = cur.legs[i] + swing;
      legs[n].scale.y = cur.legLen;
    });

    // head
    neck.rotation.z = -cur.neckRot;
    headPivot.rotation.z = -cur.headRot + (poseName === 'read' ? Math.sin(now * 1.4) * 0.03 : 0) + (poseName === 'eat' ? Math.abs(Math.sin(now * 6)) * 0.12 : 0);
    headPivot.position.y = cur.headY;
    // a look around now and then when idle
    const glance = poseName === 'sit' || poseName === 'stand' ? Math.sin(now * 0.37) * Math.sin(now * 0.11) * 0.5 : 0;
    headPivot.rotation.y = glance;
    ears.forEach((e, i) => {
      e.rotation.z = cur.earRot + (mood === 'restless' || mood === 'feral' ? Math.sin(now * 7 + i * 2) * 0.08 : 0);
      e.rotation.x = (i === 0 ? -1 : 1) * -(0.35 + (mood === 'bleak' ? 0.5 : 0)); // flat back when bleak
    });

    // eyes and blink
    blink -= dt;
    if (blink < -3 - Math.random() * 4) blink = 0.14;
    const open = cur.eyes * (blink > 0 ? 0.08 : 1) * (mood === 'smug' || mood === 'bleak' ? 0.55 : 1);
    eyes.forEach((e) => (e.scale.y = Math.max(0.02, open)));
    pupils.forEach((p) => (p.scale.y = mood === 'feral' || mood === 'restless' ? 1.6 : 1));

    // tail: rebuild the curve
    const sway = mood === 'feral' || mood === 'restless' ? 1.4 : mood === 'bleak' ? 0.15 : mood === 'asleep' ? 0.1 : 0.55;
    const base = new THREE.Vector3(-0.5, cur.haunchY + 0.1, 0);
    for (let i = 0; i < tailPts.length; i++) {
      const t = i / (tailPts.length - 1);
      const wag = Math.sin(now * 2.1 + t * 3) * 0.14 * sway * t;
      tailPts[i].set(
        base.x - t * 0.5 * (1 - cur.tailSide * 0.5) + Math.sin(t * Math.PI) * cur.tailCurl * -0.25,
        base.y + Math.sin(t * Math.PI * 0.9) * cur.tailBase * 0.5 + t * (cur.tailBase > 0.6 ? 0.25 : -0.05) + Math.sin(now * 1.6 + t * 2) * 0.03 * sway,
        wag + t * cur.tailSide * 0.45
      );
    }
    tailCurve.points = tailPts;
    tail.geometry.dispose();
    tail.geometry = new THREE.TubeGeometry(tailCurve, 16, 0.045, 6, false);
    tailTip.position.copy(tailPts[tailPts.length - 1]);
  }

  return { group, setPose, update, poses: Object.keys(POSES) };
}
