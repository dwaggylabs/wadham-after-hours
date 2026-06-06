/* =============================================================================
   WADHAM AFTER HOURS — engine
   -----------------------------------------------------------------------------
   You shouldn't need to edit this file to change content: all names, positions,
   anecdotes, quests, items and the passphrase live in data.js.

   Three.js is loaded from a CDN via the importmap in index.html — no build step.
============================================================================= */

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CONFIG, LOCATIONS, ITEMS, QUESTS, NPCS } from './data.js';

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
  stone: 0xb89a5e, stoneDark: 0x8a7144, roof: 0x474a55, crenel: 0x9c8350,
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
const BOUNDARY = { minX: -92, maxX: 78, minZ: -128, maxZ: 84 };

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
  renderer.toneMappingExposure = 1.28;

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

  // collect wall passages (the lockable gate) FIRST, so any wall that overlaps
  // gets a matching gap carved out of it when it builds.
  PASSAGES = [];
  LOCATIONS.forEach((L) => { if (L.gate) PASSAGES.push(gatePassageRect(L)); });

  LOCATIONS.forEach(buildLocation);
  commitInstances();

  spawnPickups();
  spawnNPCs();
  buildBeacon();

  bindInput();
  buildHelpAndLog();
  addEventListener('resize', onResize);
  updateHUD(true);

  // QA hook — only active if you load index.html#debug. Lets a test harness
  // orbit the camera to inspect the world. Never touched during normal play.
  if (location.hash === '#debug') window.__wadham = { THREE, scene, camera, renderer, state, colliders, npcs, pickups, openGate, look, checkWin, currentObjective, updateHUD, NPCS };
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
  scene.add(new THREE.HemisphereLight(night ? 0x4a5a86 : 0xbcd2f0, night ? 0x10131c : 0x6b6450, night ? 0.85 : 0.9));
  scene.add(new THREE.AmbientLight(0x2a3656, night ? 0.65 : 0.35));
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

  // gravel approach lane from the gate out to the forecourt + on to Plush
  addPatch(-40, 0, 30, 14, COL.gravel, 0.005);
  addPatch(-58, 16, 26, 12, COL.gravel, 0.005);
  // path spines
  addPatch(-11, 0, 22, 4, COL.gravel, 0.01);        // gate -> front quad
  addPatch(0, 31, 6, 22, COL.gravel, 0.01);          // front quad -> back quad
  addPatch(15, -32, 5, 18, COL.gravel, 0.01);        // north arch -> gardens
  addPatch(24, 44, 26, 5, COL.gravel, 0.01);         // back quad -> webb/jcr
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
    case 'range':  L.gate ? buildGateTower(L) : buildRange(L); break;
    case 'marker': buildMarker(L); break;
  }
}

function buildQuad(L) {
  // grass lawn, inset from the surrounding ranges
  addPatch(L.x, L.z, L.w - 6, L.d - 6, COL.lawn, 0.012);
}

function buildGarden(L) {
  const court = L.id === 'forecourt';
  addPatch(L.x, L.z, L.w - 2, L.d - 2, court ? COL.gravel : COL.lawn, 0.012);
  const n = court ? 3 : Math.round((L.w * L.d) / 240);
  for (let i = 0; i < n; i++) {
    const x = L.x + rand(-L.w / 2 + 3, L.w / 2 - 3);
    const z = L.z + rand(-L.d / 2 + 3, L.d / 2 - 3);
    if (court && Math.abs(z) < 9) continue;     // keep the entrance lane clear
    ctx.trees.push({ x, z, s: rand(0.85, 1.5) });
  }
  ctx.lamps.push({ x: L.x - L.w / 2 + 3, z: L.z });
  ctx.lamps.push({ x: L.x + L.w / 2 - 3, z: L.z });
}

/* --- a RANGE: a stone building block, with optional carved passages ------ */
function buildRange(L) {
  const h = L.h || 12;
  const along = L.w >= L.d ? 'x' : 'z';     // long axis
  const halfLen = (along === 'x' ? L.w : L.d) / 2;

  // gaps to carve: this range's own archway, plus any global passage (the gate)
  const gaps = [];
  if (L.archway) gaps.push({ c: L.archOffset || 0, w: 5, lintel: true });
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
    addBlock(cx, cz, w, d, h, COL.stone, { windows: true, floors: Math.max(2, Math.round(h / 4)), crenel: true });
  }

  // lintels above this range's own archways (so they read as arches, not gaps)
  gaps.filter((g) => g.lintel).forEach((g) => {
    const cx = along === 'x' ? L.x + g.c : L.x;
    const cz = along === 'z' ? L.z + g.c : L.z;
    const w = along === 'x' ? g.w : L.w;
    const d = along === 'z' ? g.w : L.d;
    const lin = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, h - 4.6, d + 0.4), stoneMat(COL.stoneDark));
    lin.position.set(cx, 4.6 + (h - 4.6) / 2, cz); scene.add(lin);
  });
}

/* a solid stone box: optionally instanced windows + crenellations on top */
function addBlock(x, z, w, d, h, color, opt = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat(color));
  m.position.set(x, h / 2, z);
  scene.add(m);
  addCollider(x, z, w, d);
  if (opt.windows) addWindows(x, z, w, d, h, opt.floors || 3);
  if (opt.crenel) addCrenels(x, z, w, d, h);
}

let _stoneCache = {};
function stoneMat(color) {
  if (!_stoneCache[color]) _stoneCache[color] = new THREE.MeshLambertMaterial({ color, flatShading: true });
  return _stoneCache[color];
}

function addCollider(x, z, w, d) {
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
}

/* window grid on the two long faces (collected for one InstancedMesh) */
function addWindows(x, z, w, d, h, floors) {
  const faceLen = Math.max(w, d);
  const cols = Math.max(1, Math.floor(faceLen / 3.2));
  const rows = Math.max(1, floors);
  const along = w >= d ? 'x' : 'z';
  const halfFace = (along === 'x' ? w : d) / 2 - 1.4;
  const off = (along === 'x' ? d : w) / 2 + 0.06;
  for (let s = -1; s <= 1; s += 2) {            // two long faces
    for (let r = 0; r < rows; r++) {
      const wy = 2.0 + r * (h - 2.4) / rows;
      for (let c = 0; c < cols; c++) {
        const t = cols === 1 ? 0 : (c / (cols - 1) - 0.5) * 2;
        const fx = t * halfFace;
        const px = along === 'x' ? x + fx : x + s * off;
        const pz = along === 'z' ? z + fx : z + s * off;
        const ry = along === 'x' ? (s < 0 ? Math.PI : 0) : (s < 0 ? -Math.PI / 2 : Math.PI / 2);
        const lit = rng() < 0.45;
        ctx.windows.push({ px, py: wy, pz, ry, lit });
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

/* --- markers: frontispiece, terrace, plush ------------------------------ */
function buildMarker(L) {
  if (L.goal) { buildPlush(L); return; }
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
  // a glowing club doorway out beyond the gate
  const box = new THREE.Mesh(new THREE.BoxGeometry(L.w, L.h, L.d),
    new THREE.MeshLambertMaterial({ color: 0x140a1e, flatShading: true }));
  box.position.set(L.x, L.h / 2, L.z); scene.add(box);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(L.w * 1.2, 1.6),
    new THREE.MeshBasicMaterial({ map: textTex('PLUSH', '#ff4fd8', 64), transparent: true, fog: false }));
  sign.position.set(L.x, L.h + 1.2, L.z + L.d / 2 + 0.1); scene.add(sign);
  const glow = new THREE.PointLight(COL.neon, 6, 30, 2);
  glow.position.set(L.x, 3, L.z + L.d / 2 + 1); scene.add(glow);
  addCollider(L.x, L.z, L.w, L.d);
  L._goalPos = new THREE.Vector3(L.x, 0, L.z + L.d / 2 + 3);
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
      m.compose(new THREE.Vector3(w.px, w.py, w.pz), q, new THREE.Vector3(1, 1, 1));
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
      m.compose(new THREE.Vector3(t.x, 1.2 * t.s, t.z), new THREE.Quaternion(), new THREE.Vector3(t.s, t.s, t.s));
      ti.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(t.x, (2.4 + 1.4) * t.s, t.z),
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
    { x: -22, z: 6 }, { x: -22, z: -6 }, { x: -14, z: 8 }, { x: -2, z: 8 },
    { x: 0, z: 16 }, { x: 0, z: 30 }, { x: 14, z: -10 }, { x: 14, z: -26 },
    { x: 18, z: 44 }, { x: -16, z: -56 }, { x: 28, z: -56 },
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

function spawnPickups() {
  const perLoc = {};
  ITEMS.forEach((it) => {
    if (!it.foundAt) return;                 // reward items are granted by quests
    const L = loc(it.foundAt); if (!L) return;
    const n = (perLoc[it.foundAt] = (perLoc[it.foundAt] || 0) + 1);
    const ang = n * 2.2, rad = 2 + n * 1.4;
    const x = L.x + Math.cos(ang) * rad, z = L.z + Math.sin(ang) * rad;
    const mesh = CURIOSITY[it.id] ? curiosityMesh(it.id) : pickupMesh(it.id);
    mesh.position.set(x, 1.0, z);
    mesh.userData.base = 1.0;
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
      x = L.x + Math.cos(ang) * rad; z = L.z + Math.sin(ang) * rad;
    }
    const group = npcFigure(def);
    group.position.set(x, 0, z);
    scene.add(group);
    const label = makeLabel(def.name, def.role);
    label.position.set(x, 2.5, z); scene.add(label);
    npcs.push({ def, group, label, talked: false, baseX: x, baseZ: z, phase: rng() * 6 });
  });
}

function npcFigure(def) {
  const g = new THREE.Group();
  const col = new THREE.Color(def.colour || '#cccccc');
  const ghost = def.role === 'oracle';
  const bodyMat = new THREE.MeshLambertMaterial({
    color: ghost ? COL.ghost : col, flatShading: true,
    transparent: ghost, opacity: ghost ? 0.55 : 1,
    emissive: ghost ? 0x2a3a66 : col.clone().multiplyScalar(0.22), // faint self-glow so they read at night
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.2, 7), bodyMat);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0),
    new THREE.MeshLambertMaterial({ color: 0xe7c9a0, flatShading: true, transparent: ghost, opacity: ghost ? 0.6 : 1 }));
  head.position.y = 1.7;
  g.add(body); g.add(head);
  // a soft marker glow so NPCs read at night
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTex('#ffffff'), color: col, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.scale.set(3.0, 3.0, 1); glow.position.y = 1.1; g.add(glow);
  g.userData.body = body; g.userData.head = head;
  return g;
}

function makeLabel(text, role) {
  const sub = role === 'friend' ? 'friend' : role === 'questgiver' || role === 'oracle' ? 'quest' : '';
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textTex(text, role === 'friend' ? '#ffd1ec' : '#ffe9b8', 44, sub),
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
  evaluateQuests();
  updateHUD();
}

/* dialogue --------------------------------------------------------------- */
const dialogue = { open: false, lines: [], i: 0, npc: null };

function talkTo(n) {
  const lines = linesForNPC(n);
  dialogue.open = true; dialogue.lines = lines; dialogue.i = 0; dialogue.npc = n;
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
       <p><b>Quest log</b> — 📜 &nbsp; <b>Help</b> — ❓</p>`
    : `<p><b>Move</b> — W A S D &nbsp; <b>Run</b> — Shift</p><p><b>Look</b> — mouse</p>
       <p><b>Interact / talk / advance</b> — E or click</p>
       <p><b>Quest log</b> — L &nbsp; <b>Help</b> — H &nbsp; <b>Pause</b> — Esc</p>`;
  $('help-body').innerHTML += `<p style="opacity:.7;margin-top:10px">North is up on the compass. Follow the blue beacon to your current objective.</p>`;
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
  const sp = (sprint ? PLAYER.run : PLAYER.speed);

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

  // boundary + the gate lock (can't pass west until gate_open)
  const minX = state.flags.has('gate_open') ? BOUNDARY.minX : -22.5;
  nx = clamp(nx, minX, BOUNDARY.maxX);
  nz = clamp(nz, BOUNDARY.minZ, BOUNDARY.maxZ);

  camera.position.x = nx; camera.position.z = nz;
  camera.position.y = PLAYER.h + Math.sin(performance.now() * 0.01) * 0.015 * Math.min(1, velocity.length());
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

  // touch look applies each frame
  if (isTouch) camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');

  // gate animation
  if (gateMesh && gateAnim > 0) {
    gateAnim = Math.min(1, gateAnim + dt * 0.6);
    gateMesh.children.forEach((pivot) => { pivot.rotation.y = pivot.userData.side * (Math.PI / 2) * easeOut(gateAnim); });
  }

  // pickups bob/spin
  pickups.forEach((pk) => { if (pk.taken) return; pk.mesh.rotation.y += dt * 1.2; pk.mesh.position.y = pk.mesh.userData.base + Math.sin(t * 2 + pk.mesh.position.x) * 0.12; });
  // npcs idle + face you
  npcs.forEach((n) => {
    const b = n.group.userData.body, hd = n.group.userData.head;
    const bob = Math.sin(t * 1.5 + n.phase) * 0.04;
    if (b) b.position.y = 0.85 + bob; if (hd) hd.position.y = 1.7 + bob;
    n.group.lookAt(camera.position.x, n.group.position.y, camera.position.z);
    n.label.position.y = 2.5 + bob;
  });
  // beacon spin
  if (beacons[0].visible) { beacons[0].rotation.y += dt; beacons[0].position.y = Math.sin(t * 2) * 0.1; }

  if (running) { updateCompass(); updatePrompt(); checkWin(); updateArea(); }

  renderer.render(scene, camera);
}
function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

/* ============================================================================
   AUDIO — tiny WebAudio blips, no asset files
============================================================================ */
let actx;
function beep(kind) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime;
    const notes = {
      pickup: [660, 880], talk: [330], friend: [520, 780], quest: [523, 659, 784],
      gate: [180, 120], win: [523, 659, 784, 1047], step: [90],
    }[kind] || [440];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = kind === 'gate' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.18);
      o.connect(g).connect(actx.destination); o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.2);
    });
  } catch (e) { /* audio optional */ }
}

/* go */
boot();
