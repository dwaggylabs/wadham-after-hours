/* =============================================================================
   WADHAM AFTER HOURS — engine
   -----------------------------------------------------------------------------
   You shouldn't need to edit this file to change content: all names, positions,
   anecdotes, quests, items and the passphrase live in data.js.

   Three.js is loaded from a CDN via the importmap in index.html — no build step.
============================================================================= */

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CONFIG, LOCATIONS, ITEMS, QUESTS, NPCS, RAISED, STEPS, FENCES, WALLS, LINTELS, FURNITURE, STREET, TREES, POO } from './data.js';

/* ------------------------------------------------------------------ helpers */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const loc = (id) => LOCATIONS.find((l) => l.id === id);
const item = (id) => ITEMS.find((i) => i.id === id);
const quest = (id) => QUESTS.find((q) => q.id === id);

// small seeded PRNG so the world (lit windows, tree jitter) looks the same each load
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0xb89a5e);
const rand = (a, b) => a + (b - a) * rng();

const facingToYaw = (f) =>
  ({ north: 0, south: Math.PI, east: -Math.PI / 2, west: Math.PI / 2 }[f] ?? Math.PI / 2);

/* ------------------------------------------------------------------ palette */
const COL = {
  stone: 0xb89a5e, stoneDark: 0x8a7144, roof: 0x474a55, crenel: 0x9c8350, brick: 0x7c4636,
  lawn: 0x16361f, lawnEdge: 0x12301b, gravel: 0x5b5247, paving: 0x6c6358,
  hedge: 0x16331c, trunk: 0x4a3826, foliage: 0x1c4226, foliage2: 0x244e2c,
  winLit: 0xffd49a, winDark: 0x223049, lamp: 0xffb45a, neon: 0xff4fd8,
  water: 0x1d3552, terrace: 0x6f6042, ghost: 0xbfd0ff,
};

/* ------------------------------------------------------------------ globals */
let renderer, scene, camera, controls;
let isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const clock = new THREE.Clock();

const colliders = [];                 // AABBs: {minX,maxX,minZ,maxZ}
let PASSAGES = [];                     // walk-through gaps pierced in walls (the gate)
let gateMesh = null, gateCollider = null, gateOpen = false;
let gateAnim = 0;

const pickups = [];                   // {item, mesh, taken}
const npcs = [];                      // {def, group, label, talked}
const beacons = [];                   // objective beacon (one)
const poos = [];                      // {x,z,stepped} Maggie Mae's leavings
const lockedGates = [];               // {x,z,key,name,collider,mesh,open} locked garden gates

// player state
const state = {
  inventory: new Set(),
  flags: new Set(),
  talked: new Set(),
  active: new Set(),                  // started quest ids
  done: new Set(),                    // completed quest ids
  won: false,
};

// input
const keys = {};
const move = { x: 0, y: 0 };          // touch joystick (-1..1)
let look = { yaw: facingToYaw(CONFIG.startFacing), pitch: 0 };
const velocity = new THREE.Vector3();
let running = true;                   // master run flag (false while a menu is up)
let started = false;

const PLAYER = { h: 1.7, r: 0.55, speed: 5.4, run: 8.6, reach: 3.4 };
const BOUNDARY = { minX: -95, maxX: 112, minZ: -152, maxZ: 118 };
const fx = { ket: 0, elf: 0, poo: 0, drunk: 0, choir: 0, floorY: 1.7 };   // effect timers / state

/* ============================================================================
   BOOT — passphrase splash, then the start overlay (pointer lock needs a click)
============================================================================ */
function boot() {
  $('cfg-title').textContent = CONFIG.title || 'WADHAM AFTER HOURS';
  $('cfg-sub').textContent = CONFIG.subtitle || '';
  $('cfg-prompt').textContent = CONFIG.passphrasePrompt || 'Password:';
  $('start-title').textContent = CONFIG.title || '';
  $('start-sub').textContent = CONFIG.subtitle || '';

  const pf = $('passfield');
  const tryPass = () => {
    const ok = pf.value.trim().toLowerCase() === String(CONFIG.passphrase).toLowerCase();
    if (ok) {
      $('splash').classList.add('hidden');
      $('start').classList.remove('hidden');
    } else {
      $('passerr').textContent = 'The Porter shakes his head.';
      pf.value = '';
      pf.focus();
    }
  };
  $('passbtn').addEventListener('click', tryPass);
  pf.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryPass(); });
  pf.focus();

  $('startbtn').addEventListener('click', startGame);
}

function startGame() {
  if (!started) { initWorld(); started = true; }
  $('start').classList.add('hidden');
  running = true;
  sndInit();                                  // user gesture — browsers allow audio now
  if (!isTouch && controls) controls.lock();
  clock.getDelta();
  renderer.setAnimationLoop(tick);
}

/* ============================================================================
   WORLD
============================================================================ */
function initWorld() {
  renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: !isTouch, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.6 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;

  scene = new THREE.Scene();
  const night = CONFIG.timeOfDay !== 'day';
  scene.fog = new THREE.FogExp2(night ? 0x0d1832 : 0x9fb6d6, night ? 0.0092 : 0.006);

  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 600);
  const sp = CONFIG.startPosition || { x: -8, z: 0 };
  camera.position.set(sp.x, PLAYER.h, sp.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = look.yaw;

  controls = new PointerLockControls(camera, renderer.domElement);
  controls.addEventListener('unlock', () => {
    if (started && running && !anyMenuOpen()) showPause(true);
  });

  buildSky(night);
  buildLights(night);
  buildGround();

  // collect instanced bits while building, then commit them in single meshes
  ctx.windows = []; ctx.crenels = []; ctx.trees = []; ctx.lamps = [];
  (TREES || []).forEach((t) => ctx.trees.push({ x: t.x, z: t.z, s: t.s || 1, kind: t.kind }));

  // collect wall passages (the lockable gate) FIRST, so any wall that overlaps
  // gets a matching gap carved out of it when it builds.
  PASSAGES = [];
  LOCATIONS.forEach((L) => { if (L.gate) PASSAGES.push(gatePassageRect(L)); });

  (RAISED || []).forEach(buildRaised);
  (STEPS || []).forEach(buildStep);
  LOCATIONS.forEach(buildLocation);
  (FENCES || []).forEach(buildFence);
  (WALLS || []).forEach(buildWall);
  (LINTELS || []).forEach(buildLintel);
  (FURNITURE || []).forEach(buildFurniture);
  buildStreet();
  commitInstances();

  spawnPickups();
  spawnNPCs();
  spawnPoo();
  buildBeacon();

  bindInput();
  buildHelpAndLog();
  addEventListener('resize', onResize);
  updateHUD(true);

  // QA hook — only active if you load index.html#debug. Lets a test harness
  // orbit the camera to inspect the world. Never touched during normal play.
  if (location.hash === '#debug') window.__wadham = { THREE, scene, camera, renderer, state, colliders, npcs, pickups, poos, lockedGates, fx, openGate, look, checkWin, currentObjective, updateHUD, NPCS, SND, collidesAt, floorYAt, talkTo, runAction, ketamine, drinkUp, nearestInteractable, updateLockedGates, updateVillain };
}

const ctx = {};   // scratch buffers for instancing

/* --- sky, stars, moon --------------------------------------------------- */
function buildSky(night) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  if (night) {
    grad.addColorStop(0.0, '#05060f');
    grad.addColorStop(0.45, '#0b1430');
    grad.addColorStop(0.62, '#1a2748');
    grad.addColorStop(1.0, '#0a1022');
  } else {
    grad.addColorStop(0, '#3f6db0'); grad.addColorStop(1, '#cfe0f0');
  }
  g.fillStyle = grad; g.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 24, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  scene.add(sky);

  if (night) {
    // stars
    const N = 650, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = rng(), v = 0.5 + rng() * 0.5, th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
      const r = 360;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.9 + 20;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({
      color: 0xcdd8ff, size: 1.5, sizeAttenuation: false, fog: false,
      transparent: true, opacity: 0.9, depthWrite: false,
    })));

    // moon + glow
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(16, 32),
      new THREE.MeshBasicMaterial({ color: 0xeaf0ff, fog: false })
    );
    moon.position.set(-150, 140, -240); moon.lookAt(0, PLAYER.h, 0);
    scene.add(moon);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTex('#dfe8ff'), color: 0xbcd0ff, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    glow.scale.set(90, 90, 1); glow.position.copy(moon.position); scene.add(glow);
  }
}

function radialTex(hex) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, hex); gr.addColorStop(0.25, hex);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildLights(night) {
  scene.add(new THREE.HemisphereLight(night ? 0x5a6a98 : 0xbcd2f0, night ? 0x171c2a : 0x6b6450, night ? 1.2 : 1.0));
  scene.add(new THREE.AmbientLight(0x39466a, night ? 1.0 : 0.45));
  const moon = new THREE.DirectionalLight(0xc2d4ff, night ? 0.95 : 0.9);
  moon.position.set(-80, 120, -120); scene.add(moon);
  const moon2 = new THREE.DirectionalLight(0x8a6a3a, night ? 0.35 : 0.2);   // warm fill from the quad
  moon2.position.set(40, 30, 60); scene.add(moon2);
}

/* --- ground: base earth + per-location lawn/gravel patches --------------- */
function buildGround() {
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshLambertMaterial({ color: 0x0c170f })
  );
  base.rotation.x = -Math.PI / 2; base.position.y = -0.02; scene.add(base);

  // gravel path spines (the Plush street is built separately in buildStreet)
  addPatch(-11, 0, 22, 4, COL.gravel, 0.01);         // gate -> front quad
  addPatch(-13, 28, 6, 22, COL.gravel, 0.01);        // SW corner -> back quad
  addPatch(13, 28, 6, 22, COL.gravel, 0.01);         // SE corner -> back quad
  addPatch(13, -27, 8, 10, COL.gravel, 0.01);        // NE corner -> NORTH to the gardens (the path)
  addPatch(13, -36, 8, 16, COL.gravel, 0.01);        // into the Cloister/Fellows garden
  addPatch(40, 63, 52, 6, COL.gravel, 0.01);         // back quad -> Bar Quad, SOUTH of the AC/LSK
  addPatch(28, 30, 8, 10, COL.gravel, 0.01);         // up to the terrace steps (NW of the AC)
  addPatch(80, 44, 10, 12, COL.gravel, 0.01);        // Bar Quad -> terrace steps
}

function addPatch(x, z, w, d, color, y = 0.01) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshLambertMaterial({ color })
  );
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m);
}

/* --- build one LOCATION ------------------------------------------------- */
function buildLocation(L) {
  switch (L.type) {
    case 'quad':   buildQuad(L); break;
    case 'garden': buildGarden(L); break;
    case 'range':  buildRange(L); break;
    case 'gate':   buildGateTower(L); break;
    case 'modern': buildModern(L); break;
    case 'marker': buildMarker(L); break;
    case 'goal':   buildPlush(L); break;
    case 'spot':   break;                 // invisible anchor (NPC/quest position only)
  }
}

function buildQuad(L) {
  // grass lawn, inset from the surrounding ranges (lifted if the quad is raised)
  const by = floorYAt(L.x, L.z);
  addPatch(L.x, L.z, L.w - 6, L.d - 6, COL.lawn, by + 0.012);
  if (L.ring) buildRing(L);                 // the Front Quad's continuous medieval ring
}

/* The Front Quad as ONE continuous medieval quadrangle: a closed crenellated
   ring of ranges (tall mullioned windows, battlements) around the courtyard,
   with gaps for the gate, the south corners and the garden opening. */
function buildRing(L) {
  const r = L.ring, t = r.t || 5, h = r.h || 13;
  const ix0 = L.x - L.w / 2, ix1 = L.x + L.w / 2, iz0 = L.z - L.d / 2, iz1 = L.z + L.d / 2; // courtyard edges
  const gaps = r.gaps || [];
  const sideGaps = (s) => gaps.filter((g) => g.side === s);
  // one crenellated, mullioned wall-run along an axis, leaving the gaps
  const run = (fixed, axis, a, b, sg) => {
    const cuts = [a];
    sg.forEach((g) => cuts.push(g.at - g.width / 2, g.at + g.width / 2));
    cuts.push(b); cuts.sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i += 2) {
      const s = cuts[i], e = cuts[i + 1]; if (e - s < 0.4) continue;
      const cx = axis === 'x' ? (s + e) / 2 : fixed;
      const cz = axis === 'z' ? (s + e) / 2 : fixed;
      const w = axis === 'x' ? e - s : t;
      const d = axis === 'z' ? e - s : t;
      addBlock(cx, cz, w, d, h, COL.stone, { windows: true, floors: 3, wstyle: 'hall', crenel: true });
    }
  };
  // centrelines just outside the courtyard; N/S span the full outer width so
  // the corners are solid → one continuous ring (not separate blocks).
  const cN = iz0 - t / 2, cS = iz1 + t / 2, cW = ix0 - t / 2, cE = ix1 + t / 2;
  run(cN, 'x', ix0 - t, ix1 + t, sideGaps('n'));
  run(cS, 'x', ix0 - t, ix1 + t, sideGaps('s'));
  run(cW, 'z', iz0 - t, iz1 + t, sideGaps('w'));
  run(cE, 'z', iz0 - t, iz1 + t, sideGaps('e'));
  // lintels over arched gaps → they read as a TUNNEL through the range, not a gap
  gaps.filter((g) => g.arch).forEach((g) => {
    const onX = g.side === 'n' || g.side === 's';
    const fixed = g.side === 'n' ? cN : g.side === 's' ? cS : g.side === 'w' ? cW : cE;
    const cx = onX ? g.at : fixed, cz = onX ? fixed : g.at;
    const w = onX ? g.width + 0.6 : t + 0.4, d = onX ? t + 0.4 : g.width + 0.6;
    const lin = new THREE.Mesh(new THREE.BoxGeometry(w, h - 4.4, d), stoneMat(COL.stoneDark));
    lin.position.set(cx, 4.4 + (h - 4.4) / 2, cz); scene.add(lin);
  });
}

function buildGarden(L) {
  const court = L.id === 'forecourt';
  addPatch(L.x, L.z, L.w - 2, L.d - 2, court ? COL.gravel : COL.lawn, 0.012);
  const n = court ? 3 : Math.round((L.w * L.d) / 300);
  for (let i = 0; i < n; i++) {
    const x = L.x + rand(-L.w / 2 + 4, L.w / 2 - 4);
    const z = L.z + rand(-L.d / 2 + 4, L.d / 2 - 4);
    if (court && Math.abs(z) < 9) continue;     // keep the entrance lane clear
    ctx.trees.push({ x, z, s: rand(0.8, 1.4) });
  }
  ctx.lamps.push({ x: L.x - L.w / 2 + 3, z: L.z });
  ctx.lamps.push({ x: L.x + L.w / 2 - 3, z: L.z });
  if (L.walled) buildGardenWalls(L);
}

/* A walled garden: stone walls round the footprint, with gaps at `gates`.
   gates: [{side:'n'|'s'|'e'|'w', at: position along that wall, width}]. */
function buildGardenWalls(L) {
  const H = 2.6, T = 0.5;                                   // wall height / thickness
  const x0 = L.x - L.w / 2, x1 = L.x + L.w / 2, z0 = L.z - L.d / 2, z1 = L.z + L.d / 2;
  const gates = L.gates || [];
  const sideGates = (s) => gates.filter((g) => g.side === s);
  // build one wall run along an axis, leaving gaps for gates on that side
  const run = (fixed, axis, a, b, sgates) => {
    const cuts = [a];
    sgates.forEach((g) => cuts.push(g.at - g.width / 2, g.at + g.width / 2));
    cuts.push(b); cuts.sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i += 2) {
      const s = cuts[i], e = cuts[i + 1]; if (e - s < 0.4) continue;
      const cx = axis === 'x' ? (s + e) / 2 : fixed;
      const cz = axis === 'z' ? (s + e) / 2 : fixed;
      const w = axis === 'x' ? e - s : T;
      const d = axis === 'z' ? e - s : T;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), stoneMat(COL.stoneDark));
      m.position.set(cx, H / 2, cz); scene.add(m);
      addCollider(cx, cz, w, d);
      // a little coping line of crenel blocks for texture
      ctx.crenels.push({ x: cx, y: H + 0.1, z: cz });
    }
  };
  run(z0, 'x', x0, x1, sideGates('n'));   // north wall (runs in X)
  run(z1, 'x', x0, x1, sideGates('s'));   // south wall
  run(x0, 'z', z0, z1, sideGates('w'));   // west wall (runs in Z)
  run(x1, 'z', z0, z1, sideGates('e'));   // east wall
  // LOCKED gates: drop an iron barrier across the gap until you hold the key
  gates.filter((g) => g.locked).forEach((g) => addLockedGate(L, g, { x0, x1, z0, z1 }));
}

/* A locked garden gate: a wrought-iron leaf + a blocking collider across the
   gap, registered so updateLockedGates() can open it when you have the key. */
function addLockedGate(L, g, b) {
  const T = 0.6, H = 2.7, w = g.width;
  let cx, cz, gw, gd;
  if (g.side === 'n' || g.side === 's') { cx = g.at; cz = g.side === 'n' ? b.z0 : b.z1; gw = w; gd = T; }
  else { cz = g.at; cx = g.side === 'w' ? b.x0 : b.x1; gw = T; gd = w; }
  const grp = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(gw, H, gd),
    new THREE.MeshLambertMaterial({ color: 0x20242e, flatShading: true }));
  leaf.position.set(cx, H / 2, cz); grp.add(leaf);
  const along = gw >= gd ? 'x' : 'z', n = Math.max(2, Math.round(w / 0.8));
  for (let i = 0; i <= n; i++) {                    // vertical bars
    const t = i / n - 0.5;
    const bx = cx + (along === 'x' ? t * gw : 0), bz = cz + (along === 'z' ? t * gd : 0);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, H, 6), stoneMat(0x474d5a));
    bar.position.set(bx, H / 2, bz); grp.add(bar);
  }
  scene.add(grp);
  const collider = { minX: cx - gw / 2, maxX: cx + gw / 2, minZ: cz - gd / 2, maxZ: cz + gd / 2 };
  colliders.push(collider);
  lockedGates.push({ x: cx, z: cz, key: g.key, name: L.name, collider, mesh: grp, open: false });
}

/* --- a RANGE: a stone building block, with optional carved passages ------ */
function buildRange(L) {
  const h = L.h || 12;
  const along = L.w >= L.d ? 'x' : 'z';     // long axis
  const halfLen = (along === 'x' ? L.w : L.d) / 2;
  const baseY = raisedBase(L);

  // gaps to carve: this range's archway(s), plus any global passage (the gate)
  const gaps = [];
  if (L.archway) gaps.push({ c: L.archOffset || 0, w: 5, lintel: true });
  if (L.arches) L.arches.forEach((off) => gaps.push({ c: off, w: 5, lintel: true }));
  PASSAGES.forEach((p) => {
    const hits = p.minX < L.x + L.w / 2 && p.maxX > L.x - L.w / 2 &&
                 p.minZ < L.z + L.d / 2 && p.maxZ > L.z - L.d / 2;
    if (!hits) return;
    if (along === 'x') gaps.push({ c: (p.minX + p.maxX) / 2 - L.x, w: p.maxX - p.minX, lintel: false });
    else gaps.push({ c: (p.minZ + p.maxZ) / 2 - L.z, w: p.maxZ - p.minZ, lintel: false });
  });

  const cuts = [-halfLen];
  gaps.forEach((g) => cuts.push(g.c - g.w / 2, g.c + g.w / 2));
  cuts.push(halfLen);
  cuts.sort((a, b) => a - b);

  for (let i = 0; i < cuts.length - 1; i += 2) {
    const a = cuts[i], b = cuts[i + 1];
    if (b - a < 0.3) continue;
    const segC = (a + b) / 2, segLen = b - a;
    const cx = along === 'x' ? L.x + segC : L.x;
    const cz = along === 'z' ? L.z + segC : L.z;
    const w = along === 'x' ? segLen : L.w;
    const d = along === 'z' ? segLen : L.d;
    addBlock(cx, cz, w, d, h, L.brick ? COL.brick : COL.stone, { windows: true, floors: Math.max(2, Math.round(h / 4)), parapet: true, baseY, wstyle: L.style });
  }

  // lintels above this range's own archways (so they read as arches, not gaps)
  gaps.filter((g) => g.lintel).forEach((g) => {
    const cx = along === 'x' ? L.x + g.c : L.x;
    const cz = along === 'z' ? L.z + g.c : L.z;
    const w = along === 'x' ? g.w : L.w;
    const d = along === 'z' ? g.w : L.d;
    const lin = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, h - 4.6, d + 0.4), stoneMat(COL.stoneDark));
    lin.position.set(cx, baseY + 4.6 + (h - 4.6) / 2, cz); scene.add(lin);
  });

  if (L.project) buildProject(L);             // chapel / old library wing sticking out
  if (L.cupola) addCupola(L.x, h, L.z);        // octagonal lantern on the Hall roof
}

/* a wing projecting off a range (the Chapel & Old Library, sticking out east) */
function buildProject(L) {
  const p = L.project, h = p.h || L.h || 13;
  const x = L.x + (p.dir === 'east' ? (L.w / 2 + p.w / 2) : p.dir === 'west' ? -(L.w / 2 + p.w / 2) : 0);
  const z = p.z != null ? p.z : L.z;
  addBlock(x, z, p.w, p.d, h, COL.stone, { windows: true, floors: 2, parapet: true, wstyle: 'chapel' });
  addCupola(x, h, z, 0.7);                      // a little spirelet
}

/* an octagonal cupola lantern (the Hall/Chapel roof turrets) */
function addCupola(x, baseH, z, scale = 1) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * scale, 1.2 * scale, 2.4 * scale, 8),
    stoneMat(COL.stoneDark));
  post.position.set(x, baseH + 1.4 * scale, z); scene.add(post);
  const dome = new THREE.Mesh(new THREE.ConeGeometry(1.3 * scale, 1.8 * scale, 8),
    new THREE.MeshLambertMaterial({ color: 0x6a6e7a, flatShading: true }));
  dome.position.set(x, baseH + 3.4 * scale, z); scene.add(dome);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xe8d49a }));
  ball.position.set(x, baseH + 4.4 * scale, z); scene.add(ball);
}

/* the only higher ground — which RAISED zone (if any) a raised building sits on */
function raisedBase(L) {
  if (!L || !L.raised) return 0;
  for (const r of RAISED || [])
    if (Math.abs(L.x - r.x) < r.w / 2 + 4 && Math.abs(L.z - r.z) < r.d / 2 + 4) return r.y;
  return 0;
}

/* a solid box: optional instanced windows + parapet/crenellations, raisable */
function addBlock(x, z, w, d, h, color, opt = {}) {
  const baseY = opt.baseY || 0;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat(color));
  m.position.set(x, baseY + h / 2, z);
  scene.add(m);
  addCollider(x, z, w, d);
  if (opt.windows) addWindows(x, z, w, d, h, opt.floors || 3, baseY, opt.wstyle);
  if (opt.crenel) addCrenels(x, z, w, d, baseY + h);
  if (opt.parapet) addParapet(x, z, w, d, baseY + h);
}

/* a plain stone parapet coping + a hint of pitched roof behind it (Wadham's
   ranges have flat parapets, not heavy battlements) */
function addParapet(x, z, w, d, yTop) {
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.6, d + 0.5), stoneMat(COL.stoneDark));
  cap.position.set(x, yTop + 0.3, z); scene.add(cap);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.6, w - 1), 1.5, Math.max(0.6, d - 1)),
    new THREE.MeshLambertMaterial({ color: COL.roof, flatShading: true }));
  roof.position.set(x, yTop + 1.1, z); scene.add(roof);
}

let _stoneCache = {};
function stoneMat(color) {
  if (!_stoneCache[color]) _stoneCache[color] = new THREE.MeshLambertMaterial({ color, flatShading: true });
  return _stoneCache[color];
}

function addCollider(x, z, w, d) {
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
}

/* window grid on the two long faces (collected for one InstancedMesh).
   wstyle 'hall'/'chapel' => tall traceried windows; baseY for raised buildings. */
function addWindows(x, z, w, d, h, floors, baseY = 0, wstyle) {
  const big = wstyle === 'hall' || wstyle === 'chapel';
  const faceLen = Math.max(w, d);
  const cols = Math.max(1, Math.floor(faceLen / (big ? 4.4 : 3.2)));
  const rows = big ? 1 : Math.max(1, floors);
  const along = w >= d ? 'x' : 'z';
  const halfFace = (along === 'x' ? w : d) / 2 - 1.4;
  const off = (along === 'x' ? d : w) / 2 + 0.06;
  const sx = big ? 1.35 : 1, sy = big ? (h - 3.4) / 1.5 : 1;
  const litP = big ? 0.72 : 0.45;
  for (let s = -1; s <= 1; s += 2) {            // two long faces
    for (let r = 0; r < rows; r++) {
      const wy = baseY + (big ? h / 2 + 0.4 : 2.0 + r * (h - 2.4) / rows);
      for (let c = 0; c < cols; c++) {
        const t = cols === 1 ? 0 : (c / (cols - 1) - 0.5) * 2;
        const fx = t * halfFace;
        const px = along === 'x' ? x + fx : x + s * off;
        const pz = along === 'z' ? z + fx : z + s * off;
        const ry = along === 'x' ? (s < 0 ? Math.PI : 0) : (s < 0 ? -Math.PI / 2 : Math.PI / 2);
        ctx.windows.push({ px, py: wy, pz, ry, lit: rng() < litP, sx, sy });
      }
    }
  }
}

function addCrenels(x, z, w, d, h) {
  const step = 1.6;
  const nx = Math.max(1, Math.floor(w / step)), nz = Math.max(1, Math.floor(d / step));
  for (let i = 0; i <= nx; i++) {
    const fx = x - w / 2 + (i / nx) * w;
    ctx.crenels.push({ x: fx, y: h + 0.35, z: z - d / 2 });
    ctx.crenels.push({ x: fx, y: h + 0.35, z: z + d / 2 });
  }
  for (let j = 1; j < nz; j++) {
    const fz = z - d / 2 + (j / nz) * d;
    ctx.crenels.push({ x: x - w / 2, y: h + 0.35, z: fz });
    ctx.crenels.push({ x: x + w / 2, y: h + 0.35, z: fz });
  }
}

/* The lockable main gate: a crenellated tower with an archway + two doors.
   The opening runs E–W (you walk through along X); the gap is in Z.
   gatePassageRect() is registered before walls build, so the West Range that
   overlaps it gets a matching gap carved out. */
function gatePassageRect(L) {
  return { minX: L.x - L.w / 2 - 2, maxX: L.x + L.w / 2 + 2, minZ: L.z - 3, maxZ: L.z + 3 };
}

function buildGateTower(L) {
  const h = L.h || 14, gapHalf = 3, archH = 5;
  // jambs either side of the opening (full height, solid)
  const jambD = L.d / 2 - gapHalf;
  if (jambD > 0.2) [-1, 1].forEach((s) => {
    const cz = L.z + s * (gapHalf + jambD / 2);
    addBlock(L.x, cz, L.w, jambD, h, COL.stone, {});
  });
  // mass above the arch
  const topH = h - archH;
  const top = new THREE.Mesh(new THREE.BoxGeometry(L.w, topH, gapHalf * 2), stoneMat(COL.stoneDark));
  top.position.set(L.x, archH + topH / 2, L.z); scene.add(top);
  // crenellated cap + glowing windows in the upper chamber
  addCrenels(L.x, L.z, L.w + 1, L.d + 1, h);
  ctx.windows.push({ px: L.x + L.w / 2 + 0.06, py: h - 2.2, pz: L.z, ry: Math.PI / 2, lit: true });
  ctx.windows.push({ px: L.x - L.w / 2 - 0.06, py: h - 2.2, pz: L.z, ry: -Math.PI / 2, lit: true });
  // the two door leaves
  buildGateDoors(L, gapHalf, archH - 0.8);
  // closed-gate collider (removed when the gate opens)
  gateCollider = { minX: L.x - 1, maxX: L.x + 1, minZ: L.z - gapHalf, maxZ: L.z + gapHalf, gate: true };
  colliders.push(gateCollider);
  addPatch(L.x, L.z, L.w, gapHalf * 2, COL.paving, 0.02);
}

function buildGateDoors(L, gapHalf, doorH) {
  const grp = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a, flatShading: true });
  [-1, 1].forEach((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(L.x, doorH / 2 + 0.2, L.z + s * gapHalf);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.28, doorH, gapHalf), mat);
    leaf.position.set(0, 0, -s * gapHalf / 2);
    pivot.add(leaf); pivot.userData.side = s; grp.add(pivot);
  });
  scene.add(grp); gateMesh = grp;
}

/* --- markers: frontispiece, terrace ------------------------------------- */
function buildMarker(L) {
  if (L.id === 'terrace') { buildTerrace(L); return; }
  // default ornate centrepiece (the Frontispiece): tiered tower with "statues"
  let y = 0; const tiers = [[L.w + 2, 6], [L.w, 5], [L.w - 1.5, (L.h || 12) - 11]];
  tiers.forEach(([wdt, hgt]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(wdt, hgt, wdt), stoneMat(COL.stoneDark));
    m.position.set(L.x, y + hgt / 2, L.z); scene.add(m);
    y += hgt;
  });
  addCollider(L.x, L.z, L.w + 2, L.w + 2);
  // little statue niches glowing faintly
  for (let s = -1; s <= 1; s += 2) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.6, 6),
      new THREE.MeshBasicMaterial({ color: 0xd8c89a }));
    st.position.set(L.x - 0.0, 7.6, L.z + s * (L.w / 2 + 0.2)); scene.add(st);
  }
  ctx.crenels.push({ x: L.x, y: y + 0.3, z: L.z });
}

function buildTerrace(L) {
  // raised earthwork walk you can stroll along (low, climbable look)
  const m = new THREE.Mesh(new THREE.BoxGeometry(L.w, (L.h || 3), L.d),
    new THREE.MeshLambertMaterial({ color: COL.terrace, flatShading: true }));
  m.position.set(L.x, (L.h || 3) / 2, L.z); scene.add(m);
  addCollider(L.x, L.z, L.w, L.d);
  addPatch(L.x, L.z, L.w - 0.6, L.d - 0.6, COL.paving, (L.h || 3) + 0.02);
  for (let i = 0; i < 8; i++) ctx.lamps.push({ x: L.x, z: L.z - L.d / 2 + (i + 0.5) * L.d / 8 });
}

function buildPlush(L) {
  // the club itself
  const club = new THREE.Mesh(new THREE.BoxGeometry(L.w, L.h, L.d),
    new THREE.MeshLambertMaterial({ color: 0x180b22, flatShading: true }));
  club.position.set(L.x, L.h / 2, L.z); scene.add(club);
  addCollider(L.x, L.z, L.w, L.d);

  const ex = L.x + L.w / 2;                 // entrance faces the gate (east / +X)
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2),
    new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.92, fog: false, toneMapped: false }));
  door.rotation.y = Math.PI / 2; door.position.set(ex + 0.06, 1.7, L.z); scene.add(door);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2),
    new THREE.MeshBasicMaterial({ map: textTex('PLUSH ▾', '#ff4fd8', 60), transparent: true, fog: false, toneMapped: false }));
  sign.rotation.y = Math.PI / 2; sign.position.set(ex + 0.1, L.h + 1.4, L.z); scene.add(sign);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('#ff7fe0'), color: 0xff4fd8,
    transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.scale.set(15, 15, 1); glow.position.set(ex + 1, 2.6, L.z); scene.add(glow);
  const plight = new THREE.PointLight(COL.neon, 7, 36, 2); plight.position.set(ex + 2, 3, L.z); scene.add(plight);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(18, 18),
    new THREE.MeshBasicMaterial({ map: radialTex('#ff4fd8'), transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(ex + 4, 0.05, L.z); scene.add(pool);
  for (let i = 0; i < 4; i++) {                    // velvet-rope bollards
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.0, 8), stoneMat(0x2a2a34));
    b.position.set(ex + 3.5 + (i % 2) * 2.4, 0.5, L.z - 3 + i * 2); scene.add(b);
  }

  L._goalPos = new THREE.Vector3(ex + 4, 0, L.z);   // stand here to enter (the street is built in buildStreet)
}

/* --- modern buildings: pale ashlar + big glass (AC, Library, Bowra) ------ */
function buildModern(L) {
  const baseY = raisedBase(L), h = L.h || 12;
  // GLASS blocks (AC/LSK) read brighter & cooler than the stone ranges
  const glass = !!L.glass, brick = !!L.brick, tint = L.tint || null;
  const m = new THREE.Mesh(new THREE.BoxGeometry(L.w, h, L.d),
    new THREE.MeshLambertMaterial({ color: glass ? (tint ? 0x9c7c5a : 0xbcc8d6) : brick ? COL.brick : 0x9a958a, flatShading: true }));
  m.position.set(L.x, baseY + h / 2, L.z); scene.add(m);
  addCollider(L.x, L.z, L.w, L.d);
  if (brick) {                              // Bowra: a solid brick block — ordinary windows + parapet, no glass curtain
    addWindows(L.x, L.z, L.w, L.d, h, Math.max(2, Math.round(h / 4)), baseY);
    addParapet(L.x, L.z, L.w, L.d, baseY + h);
    return;
  }
  // big cool glass panels on the long faces
  const along = L.w >= L.d ? 'x' : 'z';
  const cols = Math.max(2, Math.floor((along === 'x' ? L.w : L.d) / 3));
  const off = (along === 'x' ? L.d : L.w) / 2 + 0.05;
  const glassMat = new THREE.MeshBasicMaterial({ color: glass ? (tint || 0x4a6f93) : 0x213348, toneMapped: false });
  const litMat = new THREE.MeshBasicMaterial({ color: glass ? (tint ? 0xdcb482 : 0xd6ecff) : 0xbfe0ff, toneMapped: false });
  const litP = glass ? 0.5 : 0.4;
  for (let s = -1; s <= 1; s += 2)
    for (let r = 0; r < Math.max(2, Math.round(h / 3.5)); r++)
      for (let c = 0; c < cols; c++) {
        const t = (c / (cols - 1) - 0.5) * 2 * ((along === 'x' ? L.w : L.d) / 2 - 1.2);
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.2), rng() < litP ? litMat : glassMat);
        const px = along === 'x' ? L.x + t : L.x + s * off;
        const pz = along === 'z' ? L.z + t : L.z + s * off;
        pane.position.set(px, baseY + 2 + r * 3.2, pz);
        pane.rotation.y = along === 'x' ? (s < 0 ? Math.PI : 0) : (s < 0 ? -Math.PI / 2 : Math.PI / 2);
        scene.add(pane);
      }
  // the Access Centre's curved glass stair tower
  if (L.id === 'ac') {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, h + 2, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2a3f55, transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false }));
    tower.position.set(L.x - L.w / 2 - 1, (h + 2) / 2, L.z - L.d / 2 + 2); scene.add(tower);
    addCollider(L.x - L.w / 2 - 1, L.z - L.d / 2 + 2, 4.4, 4.4);
  }
}

/* --- the only RAISED ground: a stone terrace with steps up on one side --- */
function buildRaised(L) {
  const top = L.y;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(L.w, top, L.d),
    new THREE.MeshLambertMaterial({ color: COL.stoneDark, flatShading: true }));
  plat.position.set(L.x, top / 2, L.z); scene.add(plat);       // visual mesa (no collider — floorY lifts you)
  addPatch(L.x, L.z, L.w - 0.6, L.d - 0.6, L.garden ? COL.lawn : COL.paving, top + 0.02);   // grass on a roof garden
  // a flight of steps on the chosen side (skipped when explicit STEPS are used)
  const side = L.steps || 'w';
  const N = side === 'none' ? 0 : 5;
  for (let i = 0; i < N; i++) {
    const sy = top * (i + 1) / N;
    let sx = L.x, sz = L.z, sw = L.w, sd = 4;
    if (side === 'w') { sx = L.x - L.w / 2 - (N - i) * 1.0; sw = 2; sd = Math.min(L.d, 12); }
    if (side === 'e') { sx = L.x + L.w / 2 + (N - i) * 1.0; sw = 2; sd = Math.min(L.d, 12); }
    if (side === 'n') { sz = L.z - L.d / 2 - (N - i) * 1.0; sd = 2; sw = Math.min(L.w, 12); }
    if (side === 's') { sz = L.z + L.d / 2 + (N - i) * 1.0; sd = 2; sw = Math.min(L.w, 12); }
    const st = new THREE.Mesh(new THREE.BoxGeometry(sw, sy, sd), stoneMat(COL.paving));
    st.position.set(sx, sy / 2, sz); scene.add(st);
  }
  for (let i = 0; i < 4; i++) ctx.lamps.push({ x: L.x - L.w / 2 + 4 + i * (L.w - 8) / 3, z: L.z + L.d / 2 - 2 });
}

/* an explicit flight of steps (STEPS): visible treads rising toward the high
   end. No colliders — floorYAt() ramps the player up/down across the footprint. */
function buildStep(s) {
  const x0 = s.x - s.w / 2, x1 = s.x + s.w / 2, z0 = s.z - s.d / 2, z1 = s.z + s.d / 2;
  const N = 5, top = s.y || 2.4;
  for (let i = 0; i < N; i++) {
    const h = top * (i + 1) / N;                 // tread height grows toward the high end
    let cx, cz, w, d;
    if (s.axis === 'x') {
      const span = (x1 - x0) / N, e = s.high === 'e' ? x0 + i * span : x1 - (i + 1) * span;
      cx = e + span / 2; cz = s.z; w = span + 0.02; d = s.d;
    } else {
      const span = (z1 - z0) / N, e = s.high === 'n' ? z1 - (i + 1) * span : z0 + i * span;
      cx = s.x; cz = e + span / 2; w = s.w; d = span + 0.02;
    }
    const st = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat(COL.paving));
    st.position.set(cx, h / 2, cz); scene.add(st);
  }
}

/* an impassable iron fence (FENCES): a low rail + posts, sitting on whatever
   floor height it's at (e.g. the raised terrace edge), with a blocking collider */
function buildFence(f) {
  const baseY = floorYAt(f.x, f.z);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(f.w, 1.2, f.d),
    new THREE.MeshLambertMaterial({ color: 0x23262f, flatShading: true }));
  rail.position.set(f.x, baseY + 0.65, f.z); scene.add(rail);
  addCollider(f.x, f.z, f.w, f.d);
  const along = f.w >= f.d ? 'x' : 'z', len = along === 'x' ? f.w : f.d;
  const n = Math.max(2, Math.round(len / 2.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n - 0.5;
    const px = f.x + (along === 'x' ? t * f.w : 0), pz = f.z + (along === 'z' ? t * f.d : 0);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 6), stoneMat(0x14161c));
    post.position.set(px, floorYAt(px, pz) + 0.75, pz); scene.add(post);
  }
}

/* authored stone WALLS — one continuous garden/perimeter wall built from
   segments (no doubled walls). A segment with locked:true becomes a wrought-iron
   gate registered for key-unlock (same mechanic as the old garden gates). */
function buildWall(seg) {
  if (seg.locked) { addLockedWallGate(seg); return; }
  const H = seg.h || 2.8;
  const m = new THREE.Mesh(new THREE.BoxGeometry(seg.w, H, seg.d), stoneMat(COL.stoneDark));
  m.position.set(seg.x, H / 2, seg.z); scene.add(m);
  addCollider(seg.x, seg.z, seg.w, seg.d);
  const along = seg.w >= seg.d ? 'x' : 'z', len = along === 'x' ? seg.w : seg.d;
  const n = Math.max(1, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) {                 // crenel coping
    const t = i / n - 0.5;
    ctx.crenels.push({ x: seg.x + (along === 'x' ? t * seg.w : 0), y: H + 0.1, z: seg.z + (along === 'z' ? t * seg.d : 0) });
  }
}

function addLockedWallGate(seg) {
  const H = 2.8, grp = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(seg.w, H, seg.d),
    new THREE.MeshLambertMaterial({ color: 0x20242e, flatShading: true }));
  leaf.position.set(seg.x, H / 2, seg.z); grp.add(leaf);
  const along = seg.w >= seg.d ? 'x' : 'z', span = along === 'x' ? seg.w : seg.d, n = Math.max(2, Math.round(span / 0.8));
  for (let i = 0; i <= n; i++) {                 // vertical bars
    const t = i / n - 0.5;
    const bx = seg.x + (along === 'x' ? t * seg.w : 0), bz = seg.z + (along === 'z' ? t * seg.d : 0);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, H, 6), stoneMat(0x474d5a));
    bar.position.set(bx, H / 2, bz); grp.add(bar);
  }
  scene.add(grp);
  const collider = { minX: seg.x - seg.w / 2, maxX: seg.x + seg.w / 2, minZ: seg.z - seg.d / 2, maxZ: seg.z + seg.d / 2 };
  colliders.push(collider);
  lockedGates.push({ x: seg.x, z: seg.z, key: seg.key, name: seg.name || 'Garden', collider, mesh: grp, open: false });
}

/* a LINTEL — a partial-height block (a roofed bridge/tunnel), no collider, so you
   walk underneath. Joins the two AC parts over the ground passage. */
function buildLintel(L) {
  const y0 = L.y0 || 4.5, y1 = L.y1 || 13, h = y1 - y0;
  const mat = L.glass ? new THREE.MeshLambertMaterial({ color: 0xbcc8d6, flatShading: true }) : stoneMat(COL.stoneDark);
  const m = new THREE.Mesh(new THREE.BoxGeometry(L.w, h, L.d), mat);
  m.position.set(L.x, (y0 + y1) / 2, L.z); scene.add(m);
}

/* FURNITURE — a café table + four chairs (the Back Quad's seating). Sits on the
   floor (incl. raised platforms). A small collider for the table only. */
function buildFurniture(f) {
  const by = floorYAt(f.x, f.z), wood = stoneMat(0x6a4a2e);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 12), wood);
  top.position.set(f.x, by + 0.72, f.z); scene.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.72, 8), wood);
  leg.position.set(f.x, by + 0.36, f.z); scene.add(leg);
  [[1.05, 0], [-1.05, 0], [0, 1.05], [0, -1.05]].forEach(([dx, dz]) => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), wood);
    seat.position.set(f.x + dx, by + 0.44, f.z + dz); scene.add(seat);
    const cl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.42), wood);
    cl.position.set(f.x + dx, by + 0.22, f.z + dz); scene.add(cl);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.08), wood);
    back.position.set(f.x + dx + (dx ? Math.sign(dx) * 0.21 : 0), by + 0.7, f.z + dz + (dz ? Math.sign(dz) * 0.21 : 0)); scene.add(back);
  });
  addCollider(f.x, f.z, 1.3, 1.3);
}

/* the player's floor height at (x,z): raised on a terrace, with a ramp on the
   steps side so you walk up smoothly */
function floorYAt(x, z) {
  let y = 0;
  for (const r of RAISED || []) {
    const inX = x > r.x - r.w / 2 && x < r.x + r.w / 2;
    const inZ = z > r.z - r.d / 2 && z < r.z + r.d / 2;
    if (inX && inZ) { y = Math.max(y, r.y); continue; }
    // ramp band just outside the steps side
    const ramp = 5;
    if (r.steps === 'w' && inZ && x <= r.x - r.w / 2 && x > r.x - r.w / 2 - ramp)
      y = Math.max(y, r.y * (1 - (r.x - r.w / 2 - x) / ramp));
    if (r.steps === 'e' && inZ && x >= r.x + r.w / 2 && x < r.x + r.w / 2 + ramp)
      y = Math.max(y, r.y * (1 - (x - (r.x + r.w / 2)) / ramp));
    if (r.steps === 'n' && inX && z <= r.z - r.d / 2 && z > r.z - r.d / 2 - ramp)
      y = Math.max(y, r.y * (1 - (r.z - r.d / 2 - z) / ramp));
    if (r.steps === 's' && inX && z >= r.z + r.d / 2 && z < r.z + r.d / 2 + ramp)
      y = Math.max(y, r.y * (1 - (z - (r.z + r.d / 2)) / ramp));
  }
  // explicit STEP flights: ramp the floor across the footprint toward the high end
  for (const s of STEPS || []) {
    const x0 = s.x - s.w / 2, x1 = s.x + s.w / 2, z0 = s.z - s.d / 2, z1 = s.z + s.d / 2;
    if (x < x0 || x > x1 || z < z0 || z > z1) continue;   // inclusive so the ramp meets the terrace edge
    const f = s.axis === 'x'
      ? (s.high === 'e' ? (x - x0) / (x1 - x0) : (x1 - x) / (x1 - x0))
      : (s.high === 'n' ? (z1 - z) / (z1 - z0) : (z - z0) / (z1 - z0));
    y = Math.max(y, (s.y || 2.4) * clamp(f, 0, 1));
  }
  return y;
}

/* --- the street to Plush: Broad Street, left down Cornmarket, on the right */
function buildStreet() {
  if (!STREET) return;
  const P = STREET.path;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], n = 8;
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    const ox = -dz / len * 3.6, oz = dx / len * 3.6;            // perpendicular (lamps to the side)
    for (let j = 0; j <= n; j++) {
      const t = j / n, x = a.x + dx * t, z = a.z + dz * t;
      addPatch(x, z, 9, 9, COL.gravel, 0.006);
      ctx.lamps.push({ x: x + (j % 2 ? ox : -ox), z: z + (j % 2 ? oz : -oz) });
    }
  }
  // dark shopfronts
  (STREET.shops || []).forEach(([bx, bz, bw, bd], i) => {
    const hh = 8 + (i % 3) * 3;
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, hh, bd), stoneMat(i % 2 ? 0x23262f : 0x2a2d36));
    m.position.set(bx, hh / 2, bz); scene.add(m); addCollider(bx, bz, bw, bd);
    addWindows(bx, bz, bw, bd, hh, 3);
  });
  // street-name signs
  (STREET.signs || []).forEach((s) => {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.4),
      new THREE.MeshBasicMaterial({ map: textTex(s.text, '#eaf0ff', 40), transparent: true, fog: false, toneMapped: false }));
    sign.position.set(s.x, 3.4, s.z);
    sign.rotation.y = s.face === 'e' ? -Math.PI / 2 : s.face === 'w' ? Math.PI / 2 : s.face === 'n' ? Math.PI : 0;
    scene.add(sign);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), stoneMat(0x222230));
    post.position.set(s.x, 1.7, s.z); scene.add(post);
  });
}

/* --- commit all instanced geometry into single draw calls --------------- */
function commitInstances() {
  // WINDOWS (one MeshBasic InstancedMesh, per-instance colour for lit/dark)
  if (ctx.windows.length) {
    const geo = new THREE.PlaneGeometry(1.0, 1.5);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: false, toneMapped: false });
    const inst = new THREE.InstancedMesh(geo, mat, ctx.windows.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const lit = new THREE.Color(COL.winLit), dark = new THREE.Color(COL.winDark);
    ctx.windows.forEach((w, i) => {
      e.set(0, w.ry, 0); q.setFromEuler(e);
      m.compose(new THREE.Vector3(w.px, w.py, w.pz), q, new THREE.Vector3(w.sx || 1, w.sy || 1, 1));
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, w.lit ? lit : dark);
    });
    inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    scene.add(inst);
  }
  // CRENELLATIONS
  if (ctx.crenels.length) {
    const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const inst = new THREE.InstancedMesh(geo, stoneMat(COL.crenel), ctx.crenels.length);
    const m = new THREE.Matrix4();
    ctx.crenels.forEach((c, i) => { m.makeTranslation(c.x, c.y, c.z); inst.setMatrixAt(i, m); });
    inst.instanceMatrix.needsUpdate = true; scene.add(inst);
  }
  // TREES (trunk + foliage)
  if (ctx.trees.length) {
    const tg = new THREE.CylinderGeometry(0.22, 0.32, 2.4, 5);
    const ti = new THREE.InstancedMesh(tg, stoneMat(COL.trunk), ctx.trees.length);
    const fg = new THREE.IcosahedronGeometry(1.7, 0);
    const fmat = new THREE.MeshLambertMaterial({ color: COL.foliage, flatShading: true });
    const fi = new THREE.InstancedMesh(fg, fmat, ctx.trees.length);
    const m = new THREE.Matrix4();
    ctx.trees.forEach((t, i) => {
      const ty = t.y || 0;                          // lift trees onto a raised platform (roof garden)
      m.compose(new THREE.Vector3(t.x, ty + 1.2 * t.s, t.z), new THREE.Quaternion(), new THREE.Vector3(t.s, t.s, t.s));
      ti.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(t.x, ty + (2.4 + 1.4) * t.s, t.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i, 0)),
        new THREE.Vector3(t.s * 1.1, t.s * 1.3, t.s * 1.1));
      fi.setMatrixAt(i, m);
    });
    ti.instanceMatrix.needsUpdate = true; fi.instanceMatrix.needsUpdate = true;
    scene.add(ti); scene.add(fi);
  }
  // LAMPS (posts + glowing heads + ground pools)
  commitLamps();
}

function commitLamps() {
  // also line the main paths with lamps
  const extra = [
    { x: -22, z: 6 }, { x: -22, z: -6 }, { x: -2, z: 8 },
    { x: -13, z: 30 }, { x: 13, z: 30 },                         // corners -> Back Quad
    { x: 40, z: 64 }, { x: 60, z: 64 },                          // passage to the Bar (S of AC)
    { x: 8, z: 42 }, { x: 12, z: 56 }, { x: -4, z: 40 },         // Back Quad lighting
    { x: 73, z: 70 }, { x: 85, z: 74 },                          // C-Day Lewis / SE
    { x: 21, z: 29 },                                            // terrace steps (NW)
    { x: 13, z: -26 }, { x: 13, z: -40 },                        // north path into the gardens
    { x: -30, z: -66 }, { x: 13, z: -90 },                       // locked-garden gates
  ];
  const lamps = ctx.lamps.concat(extra);
  if (!lamps.length) return;
  const pg = new THREE.CylinderGeometry(0.08, 0.1, 3.2, 5);
  const pi = new THREE.InstancedMesh(pg, stoneMat(0x222230), lamps.length);
  const hg = new THREE.SphereGeometry(0.22, 8, 6);
  const hi = new THREE.InstancedMesh(hg, new THREE.MeshBasicMaterial({ color: COL.lamp, toneMapped: false }), lamps.length);
  const poolTex = radialTex('#ffb45a');
  const pool = new THREE.PlaneGeometry(7, 7);
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const gi = new THREE.InstancedMesh(pool, poolMat, lamps.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  lamps.forEach((l, i) => {
    m.makeTranslation(l.x, 1.6, l.z); pi.setMatrixAt(i, m);
    m.makeTranslation(l.x, 3.3, l.z); hi.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(l.x, 0.05, l.z), q, new THREE.Vector3(1, 1, 1)); gi.setMatrixAt(i, m);
  });
  [pi, hi, gi].forEach((x) => x.instanceMatrix.needsUpdate = true);
  scene.add(pi); scene.add(hi); scene.add(gi);
}

/* ============================================================================
   PICKUPS (items with a foundAt) + NPCs
============================================================================ */
const CURIOSITY = { apiary: 1, statue: 1, rainbow: 1 };

/* Keep spawned NPCs/items out of solid walls. If a spot is inside a building,
   spiral outward to the nearest open ground so you can always walk up to them. */
function collidesAt(x, z, pad) {
  for (const c of colliders)
    if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) return true;
  return false;
}
function findOpenSpot(x, z, pad = 1.0) {
  if (!collidesAt(x, z, pad)) return { x, z };
  for (let r = 2; r <= 22; r += 1.2) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
      if (nx < BOUNDARY.minX + 1 || nx > BOUNDARY.maxX - 1 || nz < BOUNDARY.minZ + 1 || nz > BOUNDARY.maxZ - 1) continue;
      if (!collidesAt(nx, nz, pad)) return { x: nx, z: nz };
    }
  }
  return { x, z };
}

function spawnPickups() {
  const perLoc = {};
  ITEMS.forEach((it) => {
    if (!it.foundAt) return;                 // reward items are granted by quests
    const L = loc(it.foundAt); if (!L) return;
    const n = (perLoc[it.foundAt] = (perLoc[it.foundAt] || 0) + 1);
    const ang = n * 2.2, rad = 2 + n * 1.4;
    const spot = findOpenSpot(L.x + Math.cos(ang) * rad, L.z + Math.sin(ang) * rad, 0.7);
    const mesh = CURIOSITY[it.id] ? curiosityMesh(it.id) : pickupMesh(it.id);
    const by = floorYAt(spot.x, spot.z) + 1.0;   // sit on the floor (incl. raised quads like the Bar)
    mesh.position.set(spot.x, by, spot.z);
    mesh.userData.base = by;
    scene.add(mesh);
    pickups.push({ item: it, mesh, taken: false });
  });
}

function pickupMesh(id) {
  const g = new THREE.Group();
  let body;
  if (id.startsWith('key')) {
    body = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9b24a, emissive: 0x6a4e10, metalness: 0.8, roughness: 0.3 }));
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xd9b24a, emissive: 0x6a4e10, metalness: 0.8, roughness: 0.3 }));
    stem.position.y = -0.32; body.add(stem);
  } else if (id === 'collegedrink') {
    body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x2bd0ff, emissive: 0x1170a0, transparent: true, opacity: 0.85 }));
  } else if (id === 'bodcard') {
    body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xf0e6c0, emissive: 0x554b22 }));
  } else {
    body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xc9b27a, emissive: 0x4a3f20 }));
  }
  g.add(body);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTex('#ffe6a8'), color: 0xffe0a0, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.scale.set(2.4, 2.4, 1); g.add(glow);
  return g;
}

function curiosityMesh(id) {
  const g = new THREE.Group();
  if (id === 'apiary') {
    const hive = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5),
      new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x224a66, transparent: true, opacity: 0.5, metalness: 0.3, roughness: 0.1 }));
    g.add(hive);
  } else if (id === 'statue') {
    const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 7),
      new THREE.MeshLambertMaterial({ color: 0xcfc6ac, flatShading: true }));
    fig.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), fig.material);
    head.position.y = 1.4; g.add(fig); g.add(head);
  } else { // rainbow: an arc of glowing misted water
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 24, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.7, toneMapped: false }));
    arc.position.y = 0.2; g.add(arc);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTex('#bfe8ff'), color: 0x9fd0ff, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.scale.set(3, 3, 1); glow.position.y = 0.4; g.add(glow);
  return g;
}

function spawnNPCs() {
  const perLoc = {};
  NPCS.forEach((def) => {
    const L = loc(def.at); if (!L) return;
    const n = (perLoc[def.at] = (perLoc[def.at] || 0) + 1);
    let x, z;
    if (def.role === 'gatekeeper') { x = L.x + 5; z = L.z + 2.5; }   // just inside the gate, in the quad
    else {
      const ang = 1 + n * 2.4, rad = 2.6 + n * 1.2;
      ({ x, z } = findOpenSpot(L.x + Math.cos(ang) * rad, L.z + Math.sin(ang) * rad, 0.9));
    }
    const group = npcFigure(def);
    const by = floorYAt(x, z);                 // sit on the raised terrace if there is one
    group.position.set(x, by, z);
    scene.add(group);
    const tag = def.questGiver ? 'quest' : def.role === 'friend' ? 'friend' : '';
    const label = makeLabel(def.name, tag);
    label.position.set(x, by + 2.5, z); scene.add(label);
    npcs.push({ def, group, label, talked: false, baseX: x, baseZ: z, by, phase: rng() * 6 });
  });
}

function npcFigure(def) {
  const g = new THREE.Group();
  const col = new THREE.Color(def.colour || '#cccccc');
  if (def.dog) { buildDog(g, col); return g; }
  const ghost = def.ghost || def.role === 'oracle';
  const bodyMat = new THREE.MeshLambertMaterial({
    color: ghost ? COL.ghost : col, flatShading: true,
    transparent: ghost, opacity: ghost ? 0.55 : 1,
    emissive: ghost ? 0x2a3a66 : col.clone().multiplyScalar(0.22), // faint self-glow so they read at night
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.2, 7), bodyMat);
  body.position.y = 0.85; body.userData.baseY = 0.85;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0),
    new THREE.MeshLambertMaterial({ color: 0xe7c9a0, flatShading: true, transparent: ghost, opacity: ghost ? 0.6 : 1 }));
  head.position.y = 1.7; head.userData.baseY = 1.7;
  g.add(body); g.add(head);
  if (def.hair && !ghost) {                       // a cap of hair (ginger/blonde/brown)
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.295, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6),
      new THREE.MeshLambertMaterial({ color: def.hair, flatShading: true }));
    hair.position.y = 1.78; head.add(hair); hair.position.y = 0.08;
  }
  if (def.glasses) {
    const gm = new THREE.MeshBasicMaterial({ color: 0x14171c });
    [-0.1, 0.1].forEach((dx) => {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 10), gm);
      lens.position.set(dx, 0.0, 0.24); head.add(lens);
    });
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTex('#ffffff'), color: def.villain ? 0xff2d2d : col, transparent: true, opacity: def.villain ? 0.6 : 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.scale.set(def.villain ? 4.4 : 3.0, def.villain ? 4.4 : 3.0, 1); glow.position.y = 1.1; g.add(glow);
  g.userData.body = body; g.userData.head = head;
  if (def.villain) g.scale.set(1.18, 1.28, 1.18);     // a little taller and more menacing
  return g;
}

/* Maggie Mae, the college dog */
function buildDog(g, col) {
  const mat = new THREE.MeshLambertMaterial({ color: col, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.42), mat); body.position.set(0, 0.55, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.38), mat); head.position.set(0.62, 0.72, 0);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.24), mat); snout.position.set(0.88, 0.64, 0);
  const ear = (z) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.06), mat); e.position.set(0.55, 0.95, z); g.add(e); };
  ear(0.12); ear(-0.12);
  [[-0.32, 0.16], [-0.32, -0.16], [0.34, 0.16], [0.34, -0.16]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), mat); leg.position.set(lx, 0.25, lz); g.add(leg);
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.1), mat); tail.position.set(-0.62, 0.72, 0); tail.rotation.z = 0.6;
  g.add(body, head, snout, tail);
  g.userData.dog = true; g.userData.body = body; g.userData.head = head; g.userData.tail = tail;
}

function makeLabel(text, tag) {
  const sub = tag || '';
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textTex(text, tag === 'friend' ? '#ffd1ec' : '#ffe9b8', 44, sub),
    transparent: true, depthTest: false, depthWrite: false, fog: false }));
  spr.scale.set(6.2, 1.55, 1);
  spr.renderOrder = 10;
  return spr;
}

function textTex(text, color, size, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  let fs = size;                                  // shrink long names to fit the texture
  g.font = `bold ${fs}px Georgia, serif`;
  const tw = g.measureText(text).width, maxW = 492;
  if (tw > maxW) { fs = Math.max(20, Math.floor(fs * maxW / tw)); g.font = `bold ${fs}px Georgia, serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 8;
  g.fillStyle = color; g.fillText(text, 256, sub ? 54 : 64);
  if (sub) { g.font = '600 26px Georgia, serif'; g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillText(sub === 'quest' ? '✦ quest' : '★ friend', 256, 96); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* objective beacon */
function buildBeacon() {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 18, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x66e6ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  beam.position.y = 9; g.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x66e6ff, transparent: true, opacity: 0.8, fog: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
  g.visible = false; scene.add(g);
  beacons.push(g);
}

/* ============================================================================
   INTERACTION + QUESTS
============================================================================ */
function nearestInteractable() {
  const p = camera.position; let best = null, bd = PLAYER.reach;
  // pickups
  pickups.forEach((pk) => {
    if (pk.taken) return;
    const d = Math.hypot(pk.mesh.position.x - p.x, pk.mesh.position.z - p.z);
    if (d < bd) { bd = d; best = { kind: 'pickup', ref: pk }; }
  });
  // npcs (slightly longer reach)
  npcs.forEach((n) => {
    const d = Math.hypot(n.baseX - p.x, n.baseZ - p.z);
    if (d < Math.max(bd, PLAYER.reach) && d < PLAYER.reach + 0.6) {
      if (!best || d < bd) { bd = d; best = { kind: 'npc', ref: n }; }
    }
  });
  return best;
}

function interact() {
  if (dialogue.open) { advanceDialogue(); return; }
  const tgt = nearestInteractable();
  if (!tgt) return;
  if (tgt.kind === 'pickup') takePickup(tgt.ref);
  else talkTo(tgt.ref);
}

function takePickup(pk) {
  pk.taken = true; pk.mesh.visible = false;
  state.inventory.add(pk.item.id);
  beep('pickup');
  const lore = pk.item.hint ? ` — ${pk.item.hint}` : '';
  toast(`Picked up: ${pk.item.name}${lore}`);
  flashItem(pk.item);
  if (pk.item.id === 'collegedrink') drinkUp();    // you take a sip on the spot
  evaluateQuests();
  updateHUD();
}

/* ---- Maggie Mae's poo (step in it, regret it) -------------------------- */
function spawnPoo() {
  (POO || []).forEach((p) => {
    const spot = findOpenSpot(p.x, p.z, 0.3);
    const mat = new THREE.MeshLambertMaterial({ color: 0x46331f, flatShading: true });
    const a = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 6), mat); a.position.set(spot.x, 0.1, spot.z); a.rotation.y = rng() * 6;
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.15, 6), mat); b.position.set(spot.x + 0.06, 0.24, spot.z + 0.04);
    scene.add(a); scene.add(b);
    poos.push({ x: spot.x, z: spot.z, stepped: false });
  });
}

/* ---- character actions (run when their dialogue closes) ---------------- */
function giveItem(id) {
  if (state.inventory.has(id)) return;
  const it = item(id); state.inventory.add(id);
  beep('pickup'); if (it) { toast(`Got: ${it.name}`); flashItem(it); }
  evaluateQuests(); updateHUD();
}
function runAction(action, n) {
  switch (action) {
    case 'elfbar': elfPuff(); break;
    case 'ketamine': ketamine(); break;
    case 'givebook': giveItem('book'); break;
    case 'givegame': giveItem('game'); break;
    case 'dog': beep('friend'); if (n && n.group.userData.tail) n.group.userData.tail.userData.wag = 1.4; break;
    case 'singer': break;   // Finn's singing is ambient (see the audio section)
  }
}
function ketamine(sec = 26, msg) { fx.ket = sec; beep('gate'); toast(msg || "You take the bump. The edges of Wadham begin to… breathe."); }
function elfPuff() { fx.elf = 5; beep('talk'); toast("Watermelon ice fills your lungs. You feel briefly, chemically, fine."); }
function drinkUp() { fx.drunk = 24; beep('friend'); toast("You neck the college drink — sticky, blue, structurally unsound. The quad begins to gently spin."); }

/* ---- Arran, the villain: a slow map-wide stalker. On CLOSE contact he forces
   a ketamine bump (the existing impairment) then backs off; never fires at range. */
function updateVillain(dt) {
  const v = npcs.find((n) => n.def.villain); if (!v) return;
  const dx = camera.position.x - v.baseX, dz = camera.position.z - v.baseZ;
  const dist = Math.hypot(dx, dz) || 1;
  v.retreat = Math.max(0, (v.retreat || 0) - dt);
  v.cooldown = Math.max(0, (v.cooldown || 0) - dt);
  // close-contact bump — only at very short range
  if (v.retreat <= 0 && v.cooldown <= 0 && dist < 2.3) {
    ketamine(6, "Arran corners you and forces a bump — the quad smears, tilts and slows to a woozy crawl.");
    v.retreat = 3.0; v.cooldown = 13;            // back off, then a grace period
  }
  const chasing = v.retreat <= 0, sign = chasing ? 1 : -1;
  const speed = chasing ? 1.95 : 5.2;            // slow stalk; a quicker scuttle away after a hit
  let nx = v.baseX + sign * (dx / dist) * speed * dt;
  let nz = v.baseZ + sign * (dz / dist) * speed * dt;
  if (collidesAt(nx, v.baseZ, 0.5)) nx = v.baseX;   // simple wall-slide so he doesn't jam
  if (collidesAt(v.baseX, nz, 0.5)) nz = v.baseZ;
  nx = clamp(nx, BOUNDARY.minX + 1, BOUNDARY.maxX - 1);
  nz = clamp(nz, BOUNDARY.minZ + 1, BOUNDARY.maxZ - 1);
  v.baseX = nx; v.baseZ = nz;
  v.by = floorYAt(nx, nz);
  v.group.position.set(nx, v.by, nz);
  v.label.position.set(nx, v.by + 2.5, nz);
}

/* drive the screen-effect overlays from the fx timers (CSS does the visuals) */
function applyFx(dt) {
  ['ket', 'elf', 'poo', 'drunk'].forEach((k) => { if (fx[k] > 0) fx[k] = Math.max(0, fx[k] - dt); });
  const v = $('view');
  if (v) {
    v.classList.toggle('ket', fx.ket > 0);
    v.classList.toggle('elf', fx.elf > 0);
    v.classList.toggle('drunk', fx.drunk > 0 && fx.ket <= 0);   // ketamine takes visual priority
  }
  const p = $('poo'); if (p) p.classList.toggle('show', fx.poo > 0);
}

/* dialogue --------------------------------------------------------------- */
const dialogue = { open: false, lines: [], i: 0, npc: null, action: null };

function talkTo(n) {
  const lines = linesForNPC(n);
  dialogue.open = true; dialogue.lines = lines; dialogue.i = 0; dialogue.npc = n;
  dialogue.action = n.def.action || null;          // fires when the dialogue closes
  beep('talk');
  $('dlg').classList.remove('hidden');
  $('dlg-name').textContent = n.def.name;
  renderDialogueLine();
}

function renderDialogueLine() {
  $('dlg-text').textContent = dialogue.lines[dialogue.i] || '…';
  $('dlg-more').textContent = dialogue.i < dialogue.lines.length - 1 ? '▼ more' : '✕ close';
}

function advanceDialogue() {
  dialogue.i++;
  if (dialogue.i >= dialogue.lines.length) { closeDialogue(); return; }
  renderDialogueLine();
}

function closeDialogue() {
  dialogue.open = false; $('dlg').classList.add('hidden');
  const a = dialogue.action, n = dialogue.npc; dialogue.action = null;
  if (a) runAction(a, n);
}

/* Build what an NPC says, honouring quest state. Content is all from data.js;
   the engine only decides which lines apply and grants rewards. */
function linesForNPC(n) {
  const d = n.def;
  const out = [];

  // --- quest givers (Wilkins, Dorothy) ---
  if (d.questGiver) {
    const q = quest(d.questGiver);
    if (q && !state.done.has(q.id)) {
      const need = (q.requires || []).filter((r) => !hasReq(r));
      if (need.length === 0) {
        // complete it & grant unlocks
        completeQuest(q);
        out.push(...d.lines);
        (q.unlocks || []).forEach((u) => {
          const it = item(u);
          out.push(it ? `(${d.name} gives you: ${it.name}.)` : `(${d.name} grants: ${u}.)`);
        });
        return out;
      } else {
        if (!state.active.has(q.id)) { state.active.add(q.id); updateLog(); toast(`New quest: ${q.title}`); }
        out.push(...d.lines);
        out.push(`Still needed: ${need.map(reqName).join(', ')}.`);
        return out;
      }
    }
    // already done
    out.push(...d.lines);
    if (q) out.push(`(${q.title}: complete.)`);
    return out;
  }

  // --- the Porter / gatekeeper: opens the gate when you're ready ---
  if (d.role === 'gatekeeper') {
    const main = QUESTS.find((q) => q.type === 'main');
    if (main && !state.flags.has('gate_open')) {
      const need = (main.requires || []).filter((r) => !hasReq(r));
      if (need.length === 0) {
        openGate();
        completeQuest(main);
        out.push("That's the lot — three keys and your Bod card. Go on then.");
        out.push("Lodge is open. Mind how you go… and have one for me at Tuesgays.");
        return out;
      }
      out.push(...d.lines);
      out.push(`Still locked. Bring me: ${need.map(reqName).join(', ')}.`);
      return out;
    }
    out.push("Off you pop. The night's young.");
    return out;
  }

  // --- friends: must all be talked to for the win ---
  if (d.role === 'friend') {
    if (!n.talked) { n.talked = true; state.talked.add(d.id); beep('friend'); toast(`${d.name} is in!`); evaluateQuests(); updateHUD(); }
    out.push(...d.lines);
    out.push(seeYouAtPlush());
    return out;
  }

  // --- plain flavour NPC ---
  out.push(...d.lines);
  return out;
}

function seeYouAtPlush() {
  const friends = NPCS.filter((x) => x.role === 'friend');
  const got = friends.filter((x) => state.talked.has(x.id)).length;
  if (got >= friends.length && state.inventory.has('collegedrink') && state.flags.has('gate_open'))
    return "Everyone's in and we've got the drink — to Plush!";
  return `(Rallied ${got}/${friends.length} friends.)`;
}

/* requirement helpers (an id is either an item in inventory or a flag) */
function hasReq(id) { return state.inventory.has(id) || state.flags.has(id); }
function reqName(id) { const it = item(id); return it ? it.name : id.replace(/_/g, ' '); }

function completeQuest(q) {
  if (state.done.has(q.id)) return;
  state.done.add(q.id); state.active.add(q.id);
  (q.unlocks || []).forEach((u) => {
    if (item(u)) { state.inventory.add(u); }     // reward item
    else { state.flags.add(u); }                  // flag, e.g. gate_open
  });
  beep('quest'); toast(`Quest complete: ${q.title}`);
  updateLog(); updateHUD(); evaluateQuests();
}

function openGate() {
  if (gateOpen) return;
  state.flags.add('gate_open'); gateOpen = true; gateAnim = 0.0001;
  // remove the gate slot collider so you can pass
  if (gateCollider) { const i = colliders.indexOf(gateCollider); if (i >= 0) colliders.splice(i, 1); }
  beep('gate');
}

/* Locked garden gates: walk up holding the matching key and it swings open;
   without it, a throttled nudge tells you which key you need. */
let _lockToastT = -99;
function updateLockedGates(t) {
  for (const lg of lockedGates) {
    if (lg.open) continue;
    if (Math.hypot(camera.position.x - lg.x, camera.position.z - lg.z) > 3.2) continue;
    if (state.inventory.has(lg.key)) {
      lg.open = true;
      const i = colliders.indexOf(lg.collider); if (i >= 0) colliders.splice(i, 1);
      if (lg.mesh) lg.mesh.visible = false;
      beep('gate'); toast(`Unlocked: ${lg.name}.`);
    } else if (t - _lockToastT > 4.5) {
      _lockToastT = t;
      const it = item(lg.key);
      toast(`${lg.name} gate is locked — find the ${it ? it.name : 'key'}.`);
    }
  }
}

/* re-evaluate quest-driven world state */
function evaluateQuests() {
  // mark side quests active once their giver has been met is handled in dialogue.
  checkWin();
}

function checkWin() {
  if (state.won) return;
  const win = QUESTS.find((q) => q.type === 'win'); if (!win) return;
  const reqs = (win.requires || []).every(hasReq);
  const friends = NPCS.filter((x) => x.role === 'friend');
  const allFriends = !win.requiresAllFriends || friends.every((x) => state.talked.has(x.id));
  if (!(reqs && allFriends)) return;
  // need to physically reach the goal marker
  const goal = loc(win.goalMarker); if (!goal) return;
  const gp = goal._goalPos || new THREE.Vector3(goal.x, 0, goal.z);
  const d = Math.hypot(camera.position.x - gp.x, camera.position.z - gp.z);
  if (d < 5) winGame(win);
}

function winGame(win) {
  state.won = true; state.done.add(win.id);
  beep('win');
  $('win-text').textContent = win.winText || 'You made it. 🪩';
  showOverlay('win');
}

/* ============================================================================
   HUD, LOG, HELP, PAUSE, TOASTS
============================================================================ */
function updateHUD(force) {
  // inventory chips
  const inv = $('inv'); inv.innerHTML = '';
  state.inventory.forEach((id) => {
    const it = item(id); if (!it) return;
    const chip = document.createElement('div'); chip.className = 'chip';
    chip.textContent = chipIcon(id) + ' ' + it.name;
    inv.appendChild(chip);
  });
  // objective text
  const o = currentObjective();
  $('obj-text').textContent = o.text;
  updateLog();
}

function chipIcon(id) {
  if (id.startsWith('key')) return '🗝️';
  if (id === 'bodcard') return '🪪';
  if (id === 'collegedrink') return '🍹';
  if (id === 'subfusc') return '🎓';
  if (CURIOSITY[id]) return '🔮';
  return '•';
}

function flashItem(it) {
  const el = $('flash'); el.textContent = chipIcon(it.id) + ' ' + it.name;
  el.classList.remove('hidden'); el.classList.add('show');
  clearTimeout(flashItem._t);
  flashItem._t = setTimeout(() => { el.classList.remove('show'); el.classList.add('hidden'); }, 1400);
}

function currentObjective() {
  if (state.won) return { text: 'You made it to Tuesgays. Dance. 🪩', target: null };
  if (!state.flags.has('gate_open')) {
    const main = QUESTS.find((q) => q.type === 'main');
    const need = (main.requires || []).filter((r) => !hasReq(r));
    if (need.length === 0) return { text: "Open the Porters' Lodge — talk to the Porter at the gate.", target: targetForId('porter') };
    const id = need[0];
    return { text: `After Hours: find the ${reqName(id)}. ${item(id)?.hint || ''}`.trim(), target: targetForReq(id) };
  }
  // win quest
  const win = QUESTS.find((q) => q.type === 'win');
  const friends = NPCS.filter((x) => x.role === 'friend');
  const got = friends.filter((x) => state.talked.has(x.id)).length;
  if (got < friends.length) {
    const next = friends.find((x) => !state.talked.has(x.id));
    return { text: `Tuesgays: rally your friends (${got}/${friends.length}).`, target: next ? targetForNPC(next) : null };
  }
  if (!state.inventory.has('collegedrink')) return { text: 'Tuesgays: grab the Wadham college drink (JCR & Bar).', target: targetForReq('collegedrink') };
  const goal = loc(win.goalMarker);
  return { text: 'Tuesgays: get to Plush! 🪩', target: goal ? (goal._goalPos || new THREE.Vector3(goal.x, 0, goal.z)) : null };
}

function targetForId(npcId) { const n = NPCS.find((x) => x.id === npcId); return n ? targetForNPC(n) : null; }
function targetForNPC(def) { const L = loc(def.at); return L ? new THREE.Vector3(L.x, 0, L.z) : null; }
function targetForReq(id) {
  const it = item(id);
  if (it && it.foundAt) { const L = loc(it.foundAt); return L ? new THREE.Vector3(L.x, 0, L.z) : null; }
  // reward item -> point at its quest giver
  const q = QUESTS.find((qq) => (qq.unlocks || []).includes(id));
  if (q && q.giver) return targetForId(q.giver);
  return null;
}

function buildHelpAndLog() {
  $('help-body').innerHTML = isTouch
    ? `<p><b>Move</b> — left thumb stick</p><p><b>Look</b> — drag right side</p>
       <p><b>Interact / talk</b> — the ✋ button (or tap a glowing thing up close)</p>
       <p><b>Quests</b> — 📜 &nbsp; <b>Help</b> — ❓ &nbsp; <b>Mute</b> — 🔊</p>`
    : `<p><b>Move</b> — W A S D &nbsp; <b>Run</b> — Shift</p><p><b>Look</b> — mouse</p>
       <p><b>Interact / talk / advance</b> — E or click</p>
       <p><b>Quest log</b> — L &nbsp; <b>Help</b> — H &nbsp; <b>Mute</b> — M &nbsp; <b>Pause</b> — Esc</p>`;
  $('help-body').innerHTML += `<p style="opacity:.7;margin-top:10px">Talk to <b>everyone</b> — the anecdotes are the point. North is up on the compass; follow the blue beacon to your current objective.</p>`;
}

function updateLog() {
  const box = $('log-body'); if (!box) return;
  const friends = NPCS.filter((x) => x.role === 'friend');
  const got = friends.filter((x) => state.talked.has(x.id)).length;
  let html = '';
  QUESTS.forEach((q) => {
    const done = state.done.has(q.id);
    const active = state.active.has(q.id) || done || q.type === 'main';
    const status = done ? '✓ done' : active ? '… active' : 'not started';
    const cls = done ? 'q-done' : active ? 'q-active' : 'q-idle';
    html += `<div class="q ${cls}"><div class="q-h"><span class="q-t">${q.title}</span><span class="q-s">${status}</span></div>`;
    html += `<div class="q-b">${q.brief}</div>`;
    if (!done) {
      const reqs = (q.requires || []).slice();
      const checks = reqs.map((r) => `<span class="${hasReq(r) ? 'ok' : 'no'}">${hasReq(r) ? '☑' : '☐'} ${reqName(r)}</span>`);
      if (q.requiresAllFriends) checks.push(`<span class="${got >= friends.length ? 'ok' : 'no'}">${got >= friends.length ? '☑' : '☐'} rally friends (${got}/${friends.length})</span>`);
      if (checks.length) html += `<div class="q-checks">${checks.join('')}</div>`;
    }
    html += `</div>`;
  });
  box.innerHTML = html;
}

/* toasts */
let toastT;
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

/* menus */
function anyMenuOpen() { return !$('pause').classList.contains('hidden') || !$('help').classList.contains('hidden') || !$('log').classList.contains('hidden') || !$('win').classList.contains('hidden'); }

function showOverlay(id) {
  running = false;
  $(id).classList.remove('hidden');
  if (!isTouch && controls && controls.isLocked) controls.unlock();
}
function hideOverlay(id) {
  $(id).classList.add('hidden');
  if (!anyMenuOpen() && !state.won) { running = true; if (!isTouch && controls) controls.lock(); }
}
function showPause(v) { if (v) showOverlay('pause'); else hideOverlay('pause'); }
function toggleMenu(id) {
  if ($(id).classList.contains('hidden')) { if (id === 'log') updateLog(); showOverlay(id); }
  else hideOverlay(id);
}

/* ============================================================================
   INPUT
============================================================================ */
function bindInput() {
  addEventListener('keydown', (e) => {
    if (e.repeat) { keys[e.code] = true; return; }
    keys[e.code] = true;
    if (e.code === 'KeyE' || e.code === 'Space') { if (running || dialogue.open) { e.preventDefault(); interact(); } }
    if (e.code === 'KeyL') { e.preventDefault(); if (dialogue.open) closeDialogue(); toggleMenu('log'); }
    if (e.code === 'KeyH') { e.preventDefault(); if (dialogue.open) closeDialogue(); toggleMenu('help'); }
    if (e.code === 'KeyM') { e.preventDefault(); sndToggle(); }
    if (e.code === 'Escape') { if (dialogue.open) closeDialogue(); }
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });

  // desktop look via pointer lock
  if (!isTouch) {
    renderer.domElement.addEventListener('click', () => {
      if (!running) return;
      if (dialogue.open) { advanceDialogue(); return; }
      if (!controls.isLocked) controls.lock(); else interact();
    });
  }

  // buttons
  $('btn-resume').addEventListener('click', () => showPause(false));
  $('btn-help').addEventListener('click', () => { hideOverlay('pause'); toggleMenu('help'); });
  $('btn-restart').addEventListener('click', () => location.reload());
  $('win-again').addEventListener('click', () => location.reload());
  document.querySelectorAll('[data-close]').forEach((b) =>
    b.addEventListener('click', () => hideOverlay(b.getAttribute('data-close'))));
  $('dlg').addEventListener('click', () => advanceDialogue());

  if (isTouch) bindTouch();
}

function bindTouch() {
  $('touch').classList.remove('hidden');
  // joystick
  const stick = $('stick'), nub = $('nub');
  let sid = null, cx = 0, cy = 0;
  const R = 48;
  stick.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]; sid = t.identifier;
    const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    e.preventDefault();
  }, { passive: false });
  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === sid) {
      let dx = t.clientX - cx, dy = t.clientY - cy;
      const m = Math.hypot(dx, dy) || 1; const cl = Math.min(m, R);
      dx = dx / m * cl; dy = dy / m * cl;
      nub.style.transform = `translate(${dx}px,${dy}px)`;
      move.x = dx / R; move.y = dy / R;
    }
  }, { passive: false });
  addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; move.x = move.y = 0; nub.style.transform = ''; }
  });
  // drag look on right half
  let lid = null, lx = 0, ly = 0;
  const lookZone = $('lookzone');
  lookZone.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: false });
  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === lid) {
      look.yaw -= (t.clientX - lx) * 0.005;
      look.pitch = clamp(look.pitch - (t.clientY - ly) * 0.005, -1.3, 1.3);
      lx = t.clientX; ly = t.clientY;
    }
  }, { passive: false });
  addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; });
  // action buttons
  $('btn-act').addEventListener('click', () => interact());
  $('btn-log2').addEventListener('click', () => toggleMenu('log'));
  $('btn-help2').addEventListener('click', () => toggleMenu('help'));
  const mb = $('btn-mute'); if (mb) mb.addEventListener('click', () => sndToggle());
}

/* ============================================================================
   MOVEMENT + COLLISION
============================================================================ */
function updatePlayer(dt) {
  // direction from input
  let f = 0, s = 0;
  if (!dialogue.open && running) {
    if (keys['KeyW'] || keys['ArrowUp']) f += 1;
    if (keys['KeyS'] || keys['ArrowDown']) f -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) s += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) s -= 1;
    if (isTouch) { s += move.x; f -= move.y; }
  }
  const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
  const sp = (sprint ? PLAYER.run : PLAYER.speed) * (fx.ket > 0 ? 0.68 : 1) * (fx.drunk > 0 ? 0.82 : 1);   // ket/drink = woozy

  // forward/right from camera yaw (flattened)
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0;
  if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

  const wish = new THREE.Vector3()
    .addScaledVector(fwd, f).addScaledVector(right, s);
  if (wish.lengthSq() > 1) wish.normalize();

  // simple acceleration
  velocity.x += (wish.x * sp - velocity.x) * Math.min(1, dt * 12);
  velocity.z += (wish.z * sp - velocity.z) * Math.min(1, dt * 12);

  let nx = camera.position.x + velocity.x * dt;
  let nz = camera.position.z + velocity.z * dt;

  // resolve collisions axis-by-axis against AABBs (player as a circle)
  nx = resolveAxis(nx, camera.position.z, 'x');
  nz = resolveAxis(nx, nz, 'z');

  // boundary
  nx = clamp(nx, BOUNDARY.minX, BOUNDARY.maxX);
  nz = clamp(nz, BOUNDARY.minZ, BOUNDARY.maxZ);
  // pre-gate lock: can't slip out to the west exterior at the gate's latitude
  if (!state.flags.has('gate_open') && nz > -24 && nz < 26 && nx < -16) nx = -16;

  camera.position.x = nx; camera.position.z = nz;
  // floor height (the raised Library/Bowra terrace) + smoothed head-bob
  const targetY = floorYAt(nx, nz) + PLAYER.h;
  fx.floorY += (targetY - fx.floorY) * Math.min(1, dt * 8);
  camera.position.y = fx.floorY + Math.sin(performance.now() * 0.01) * 0.015 * Math.min(1, velocity.length());

  // step in Maggie Mae's poo (you will track it into Plush)
  for (const poo of poos) {
    if (!poo.stepped && Math.hypot(nx - poo.x, nz - poo.z) < 0.7) {
      poo.stepped = true; fx.poo = 7; beep('step');
      toast("…you've stepped in Maggie Mae's poo. Genuinely grim.");
    }
  }

  // footsteps, paced to speed
  const sp2 = Math.hypot(velocity.x, velocity.z);
  if (sp2 > 0.8 && !dialogue.open) {
    SND.stepDist += sp2 * dt;
    const stride = (keys['ShiftLeft'] || keys['ShiftRight']) ? 2.4 : 1.8;
    if (SND.stepDist > stride) { SND.stepDist = 0; sndStep(); }
  } else SND.stepDist = 1.4;     // primed so the first step lands as soon as you move
}

function resolveAxis(x, z, axis) {
  const r = PLAYER.r;
  for (const c of colliders) {
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
      if (axis === 'x') {
        const fromLeft = Math.abs((c.minX) - (x + r));
        const fromRight = Math.abs((c.maxX) - (x - r));
        x = fromLeft < fromRight ? c.minX - r : c.maxX + r;
      } else {
        const fromTop = Math.abs((c.minZ) - (z + r));
        const fromBot = Math.abs((c.maxZ) - (z - r));
        z = fromTop < fromBot ? c.minZ - r : c.maxZ + r;
      }
    }
  }
  return axis === 'x' ? x : z;
}

/* ============================================================================
   HUD: compass + beacon update
============================================================================ */
const _v = new THREE.Vector3();
function updateCompass() {
  // heading: 0 = north (-Z)
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const heading = Math.atan2(dir.x, -dir.z); // radians, 0=N, +=E
  const strip = $('compass-strip');
  const o = currentObjective();
  // build ticks
  const W = 360; // px window
  const ppr = W / (Math.PI * 1.4); // px per radian (~ shows ~80° each side)
  const cards = [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]];
  let html = '';
  cards.forEach(([lab, ang]) => {
    let da = wrap(ang - heading);
    const x = W / 2 + da * ppr;
    if (x > -20 && x < W + 20) html += `<span class="card" style="left:${x}px">${lab}</span>`;
  });
  if (o.target) {
    const bx = o.target.x - camera.position.x, bz = o.target.z - camera.position.z;
    const bAng = Math.atan2(bx, -bz);
    let da = wrap(bAng - heading);
    const x = W / 2 + da * ppr;
    const cx = clamp(x, 6, W - 6);
    html += `<span class="obj-tick" style="left:${cx}px">▲</span>`;
  }
  strip.innerHTML = html;

  // beacon
  const b = beacons[0];
  if (o.target) {
    b.visible = true; b.position.set(o.target.x, 0, o.target.z);
  } else b.visible = false;
}
function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

/* prompt under crosshair */
function updatePrompt() {
  const tgt = nearestInteractable();
  const el = $('prompt');
  if (dialogue.open) { el.classList.add('hidden'); return; }
  if (tgt) {
    const key = isTouch ? 'Tap ✋' : 'E';
    if (tgt.kind === 'pickup') el.textContent = `${key} — take ${tgt.ref.item.name}`;
    else el.textContent = `${key} — talk to ${tgt.ref.def.name}`;
    el.classList.remove('hidden');
  } else el.classList.add('hidden');
}

/* area-name toast when you enter a named zone */
let lastArea = '';
function updateArea() {
  const p = camera.position; let here = '';
  for (const L of LOCATIONS) {
    if (L.type === 'quad' || L.type === 'garden') {
      if (Math.abs(p.x - L.x) < L.w / 2 && Math.abs(p.z - L.z) < L.d / 2) { here = L.name; break; }
    }
  }
  if (here && here !== lastArea) { lastArea = here; areaToast(here); }
  else if (!here) lastArea = lastArea; // keep last
}
function areaToast(name) {
  const el = $('area'); el.textContent = name;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

/* ============================================================================
   LOOP
============================================================================ */
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = performance.now() * 0.001;

  if (running && !dialogue.open) updatePlayer(dt);
  if (running && !dialogue.open) updateVillain(dt);     // Arran prowls

  // touch look applies each frame
  if (isTouch) camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');

  // gate animation
  if (gateMesh && gateAnim > 0) {
    gateAnim = Math.min(1, gateAnim + dt * 0.6);
    gateMesh.children.forEach((pivot) => { pivot.rotation.y = pivot.userData.side * (Math.PI / 2) * easeOut(gateAnim); });
  }

  // pickups bob/spin
  pickups.forEach((pk) => { if (pk.taken) return; pk.mesh.rotation.y += dt * 1.2; pk.mesh.position.y = pk.mesh.userData.base + Math.sin(t * 2 + pk.mesh.position.x) * 0.12; });
  // npcs idle + face you (dogs wag instead of bob)
  npcs.forEach((n) => {
    const u = n.group.userData, bob = Math.sin(t * 1.5 + n.phase) * 0.04;
    if (u.dog) {
      if (u.tail) { if (u.tail.userData.wag > 0) u.tail.userData.wag -= dt; u.tail.rotation.y = Math.sin(t * (u.tail.userData.wag > 0 ? 18 : 3)) * 0.5; }
    } else {
      if (u.body) u.body.position.y = (u.body.userData.baseY || 0.85) + bob;
      if (u.head) u.head.position.y = (u.head.userData.baseY || 1.7) + bob;
      n.group.lookAt(camera.position.x, n.group.position.y, camera.position.z);
    }
    n.label.position.y = n.by + 2.5 + bob;
    // fade name labels with distance so 16 of them don't clutter the screen
    const ld = Math.hypot(n.baseX - camera.position.x, n.baseZ - camera.position.z);
    n.label.visible = ld < 34;
    n.label.material.opacity = clamp(1.4 - ld / 24, 0, 1);
  });
  // beacon spin
  if (beacons[0].visible) { beacons[0].rotation.y += dt; beacons[0].position.y = Math.sin(t * 2) * 0.1; }

  applyFx(dt);
  if (SND.started) { sndChoirNear(); sndPlushNear(); }

  if (running) { updateCompass(); updatePrompt(); checkWin(); updateArea(); updateLockedGates(t); }

  renderer.render(scene, camera);
}
function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

/* ============================================================================
   AUDIO — fully procedural (no asset files): a calm night drone, occasional
   Oxford church-bell peals, footsteps, and event blips. Mute with M / the 🔇 button.
============================================================================ */
const SND = { ctx: null, master: null, music: null, on: true, started: false, stepDist: 1.4 };

function sndInit() {
  if (SND.started) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = SND.ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    const master = SND.master = ctx.createGain();
    master.gain.value = SND.on ? 0.9 : 0.0; master.connect(ctx.destination);
    const music = SND.music = ctx.createGain(); music.gain.value = 0.6; music.connect(master);
    sndPad(ctx, music);
    SND.choir = ctx.createGain(); SND.choir.gain.value = 0; SND.choir.connect(master);
    sndChoir(ctx, SND.choir);                 // Finn, mid-rehearsal, swells near the chapel
    setupPlushAudio();                         // the club track for Plush
    SND.started = true;
    sndBellLoop();
  } catch (e) { /* audio is optional */ }
}

/* Finn's choir — sustained voices that swell as you near the ante-chapel */
function sndChoir(ctx, out) {
  const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 850; filt.Q.value = 0.9; filt.connect(out);
  const bus = ctx.createGain(); bus.gain.value = 0.5; bus.connect(filt);
  [196, 246.94, 293.66, 392].forEach((f, i) => {     // a slow G-major chord of "voices"
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = 0.12; o.connect(g).connect(bus); o.start();
    const vib = ctx.createOscillator(); vib.frequency.value = 4.5 + i * 0.4;
    const vg = ctx.createGain(); vg.gain.value = f * 0.006; vib.connect(vg).connect(o.frequency); vib.start();
    const sw = ctx.createOscillator(); sw.frequency.value = 0.07 + i * 0.02;
    const sg = ctx.createGain(); sg.gain.value = 0.06; sw.connect(sg).connect(g.gain); sw.start();
  });
}
function sndChoirNear() {
  if (!SND.choir) return;
  const ch = loc('chapel'); if (!ch) return;
  const d = Math.hypot(camera.position.x - ch.x, camera.position.z - ch.z);
  const target = d < 24 ? (1 - d / 24) * 0.5 : 0;
  SND.choir.gain.value += (target - SND.choir.gain.value) * 0.04;
}

/* Plush — an mp3 if one loads, else a procedural four-on-the-floor club beat */
function setupPlushAudio() {
  const a = $('plushaudio');
  if (a && CONFIG.plushMusicUrl) {
    a.src = CONFIG.plushMusicUrl; a.loop = true; a.volume = 0;
    a.addEventListener('canplaythrough', () => { SND.plushReady = true; });
    a.addEventListener('error', () => { SND.plushReady = false; });
    a.load();
    SND.plushAudio = a;
  }
}
function sndPlushNear() {
  const plL = loc('plush'); if (!plL) return;
  const gp = plL._goalPos || { x: plL.x, z: plL.z };
  const d = Math.hypot(camera.position.x - gp.x, camera.position.z - gp.z);
  const near = d < 38;
  if (near && !SND.plushPlaying) {
    SND.plushPlaying = true;
    if (SND.plushReady && SND.plushAudio) { try { SND.plushAudio.currentTime = 0; SND.plushAudio.play(); } catch (e) {} }
    else sndClubStart();
    if (SND.music) SND.music.gain.value = 0.1;       // duck the ambient pad
  } else if (!near && SND.plushPlaying) {
    SND.plushPlaying = false;
    if (SND.plushAudio) try { SND.plushAudio.pause(); } catch (e) {}
    sndClubStop();
    if (SND.music) SND.music.gain.value = 0.6;
  }
  if (SND.plushAudio && SND.plushReady)
    SND.plushAudio.volume = near ? clamp(1 - d / 38, 0, 1) * (CONFIG.plushMusicVolume || 0.5) * (SND.on ? 1 : 0) : 0;
}
function sndClubStart() {
  if (SND.club) return;
  const ctx = SND.ctx; if (!ctx) return;
  const bus = ctx.createGain(); bus.gain.value = 0.5; bus.connect(SND.master); SND.clubBus = bus;
  SND.club = { stop: false, step: 0 };
  const bpm = 126, beat = 60 / bpm, stepDur = beat / 4;
  const riff = [0, 3, 7, 10, 12, 10, 7, 3];
  const loop = () => {
    if (!SND.club || SND.club.stop) return;
    const st = SND.club.step, now = ctx.currentTime + 0.02;
    if (st % 4 === 0) clubKick(now);
    if (st % 2 === 1) clubHat(now);
    if (st % 4 === 0) clubTone(now, 55 * Math.pow(2, [0, 0, 5, 3][(st / 4) % 4] / 12), 'sine', 0.2, beat * 0.9);
    if (st % 2 === 0) clubTone(now, 220 * Math.pow(2, riff[(st / 2) % riff.length] / 12), 'sawtooth', 0.05, stepDur * 1.6);
    SND.club.step = (st + 1) % 16;
    SND.club.timer = setTimeout(loop, stepDur * 1000);
  };
  loop();
}
function sndClubStop() { if (SND.club) { SND.club.stop = true; clearTimeout(SND.club.timer); SND.club = null; } if (SND.clubBus) { SND.clubBus.gain.value = 0; SND.clubBus = null; } }
function clubKick(t) { const ctx = SND.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g).connect(SND.clubBus); o.start(t); o.stop(t + 0.22); }
function clubHat(t) { const ctx = SND.ctx, sr = ctx.sampleRate, len = Math.floor(sr * 0.03), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); const s = ctx.createBufferSource(); s.buffer = buf; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000; const g = ctx.createGain(); g.gain.value = 0.1; s.connect(hp).connect(g).connect(SND.clubBus); s.start(t); }
function clubTone(t, f, type, vol, dur) { const ctx = SND.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(SND.clubBus); o.start(t); o.stop(t + dur + 0.05); }

function sndPad(ctx, out) {                       // a quiet, sacred-ish drone in open fifths
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 0.6; lp.connect(out);
  const pg = ctx.createGain(); pg.gain.value = 0.05; pg.connect(lp);
  [110, 164.81, 220, 246.94].forEach((f, i) => {  // A2 · E3 · A3 · B3
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * (i % 2 ? 1.004 : 0.996);
    const g = ctx.createGain(); g.gain.value = 0.22; o.connect(g).connect(pg); o.start();
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.04 + i * 0.017;
    const lg = ctx.createGain(); lg.gain.value = 0.1; lfo.connect(lg).connect(g.gain); lfo.start();
  });
  const flfo = ctx.createOscillator(); flfo.frequency.value = 0.02;
  const fg = ctx.createGain(); fg.gain.value = 170; flfo.connect(fg).connect(lp.frequency); flfo.start();
}

function sndBell(base, when, vol) {               // one inharmonic bell toll
  const ctx = SND.ctx; if (!ctx) return;
  const t = when || ctx.currentTime, decay = 3.4, v = vol || 0.07;
  const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(v, t + 0.008);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + decay); bg.connect(SND.music);
  [[1, 1], [2.0, 0.6], [2.76, 0.4], [5.18, 0.18], [8.2, 0.1]].forEach(([r, a]) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = base * r;
    const g = ctx.createGain(); g.gain.value = a; o.connect(g).connect(bg); o.start(t); o.stop(t + decay + 0.1);
  });
}

function sndBellLoop() {                           // a toll or a short descending peal, now and then
  if (!SND.started) return;
  const ctx = SND.ctx, peal = [392.0, 349.23, 329.63, 293.66, 261.63];
  if (Math.random() < 0.5) {
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) sndBell(peal[i % peal.length], ctx.currentTime + i * 0.62, 0.055);
  } else sndBell(peal[Math.floor(Math.random() * peal.length)], ctx.currentTime, 0.07);
  setTimeout(sndBellLoop, 11000 + Math.random() * 13000);
}

function sndStep() {                               // a soft footfall (filtered noise burst)
  const ctx = SND.ctx; if (!ctx || !SND.started || !SND.on) return;
  const sr = ctx.sampleRate, len = Math.floor(sr * 0.11);
  const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 150 + Math.random() * 70; bp.Q.value = 1.1;
  const g = ctx.createGain(); g.gain.value = 0.16;
  src.connect(bp).connect(g).connect(SND.master); src.start();
}

function sndToggle() {
  SND.on = !SND.on;
  if (SND.master) SND.master.gain.linearRampToValueAtTime(SND.on ? 0.9 : 0.0, SND.ctx.currentTime + 0.18);
  if (SND.plushAudio) SND.plushAudio.muted = !SND.on;
  toast(SND.on ? '🔊 Sound on' : '🔇 Muted');
  const b = $('btn-mute'); if (b) b.textContent = SND.on ? '🔊' : '🔇';
}

function beep(kind) {                              // event blips, routed through the mute bus
  if (!SND.ctx) sndInit();
  const ctx = SND.ctx; if (!ctx) return;
  const out = SND.master || ctx.destination, now = ctx.currentTime;
  const notes = { pickup: [660, 880], talk: [392], friend: [523, 784], quest: [523, 659, 784],
    gate: [160, 110], win: [523, 659, 784, 1047], step: [90] }[kind] || [440];
  notes.forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = kind === 'gate' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.18);
    o.connect(g).connect(out); o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.2);
  });
}

/* go */
boot();
