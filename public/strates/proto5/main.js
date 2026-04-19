import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ---------- constantes ----------
const GRID = 48;
const MAX_STRATES = 6;
const WATER_LEVEL = 1.15;
const VOXEL = 1;
const MAX_TREES = 4000;
const MAX_ROCKS = 2000;

// ---------- bruit ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const seedRand = mulberry32(2024);
const rng = mulberry32(7777);
const PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(seedRand() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + (b - a) * t; }
function grad(hash, x, y) {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
function perlin2(x, y) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const aa = PERM[PERM[xi] + yi];
  const ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi];
  const bb = PERM[PERM[xi + 1] + yi + 1];
  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v);
}
function fbm(x, y, oct = 4) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += perlin2(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}

// ---------- boot ----------
const app = document.getElementById('app');
const loader = document.getElementById('loader');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe6f5);
scene.fog = new THREE.FogExp2(0xcfe6f5, 0.014);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 500);
camera.position.set(GRID * 0.9, GRID * 0.7, GRID * 0.9);
camera.lookAt(GRID / 2, 0, GRID / 2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(GRID / 2, 2, GRID / 2);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 20;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI * 0.48;
// boutons : gauche=ROTATE par defaut (mais selon outil on neutralise), droite=PAN, molette=ZOOM
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN
};

// ---------- ciel ----------
const sky = new Sky();
sky.scale.setScalar(450);
scene.add(sky);
const sunDir = new THREE.Vector3();
const skyU = sky.material.uniforms;
skyU.turbidity.value = 6;
skyU.rayleigh.value = 1.6;
skyU.mieCoefficient.value = 0.006;
skyU.mieDirectionalG.value = 0.85;
const phi = THREE.MathUtils.degToRad(60);
const theta = THREE.MathUtils.degToRad(135);
sunDir.setFromSphericalCoords(1, phi, theta);
skyU.sunPosition.value.copy(sunDir);

// ---------- lumieres ----------
const sun = new THREE.DirectionalLight(0xfff2d9, 2.4);
sun.position.set(60, 70, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
const d = 60;
sun.shadow.camera.left = -d;
sun.shadow.camera.right = d;
sun.shadow.camera.top = d;
sun.shadow.camera.bottom = -d;
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.05;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(GRID / 2, 0, GRID / 2);

const hemi = new THREE.HemisphereLight(0xbcd7ff, 0x3a2a1a, 0.55);
scene.add(hemi);

// ---------- palette ----------
const COL = {
  grass: new THREE.Color('#7cc06a'),
  grassDark: new THREE.Color('#5ea24d'),
  forest: new THREE.Color('#3f7a3a'),
  sand: new THREE.Color('#e8cf8e'),
  sandDark: new THREE.Color('#cfb374'),
  rock: new THREE.Color('#a8a196'),
  rockDark: new THREE.Color('#8a8378'),
  snow: new THREE.Color('#f2f2ee'),
  dirt: new THREE.Color('#8c6a43'),
  field: new THREE.Color('#d9b755'),
  fieldDark: new THREE.Color('#b8923f')
};

// types de filon : couleur du rocher, couleur du cristal (plus claire)
const ORE_TYPES = {
  'ore-gold':      { label: 'or',        rock: new THREE.Color('#e8c547'), crystal: new THREE.Color('#ffe98a') },
  'ore-copper':    { label: 'cuivre',    rock: new THREE.Color('#c97a4a'), crystal: new THREE.Color('#e8a47a') },
  'ore-silver':    { label: 'argent',    rock: new THREE.Color('#d8dde0'), crystal: new THREE.Color('#f4f7f9') },
  'ore-iron':      { label: 'fer',       rock: new THREE.Color('#7d8a9a'), crystal: new THREE.Color('#b4c0cc') },
  'ore-coal':      { label: 'charbon',   rock: new THREE.Color('#2a2a2a'), crystal: new THREE.Color('#5a5a5a') },
  'ore-amethyst':  { label: 'amethyste', rock: new THREE.Color('#9b6bd6'), crystal: new THREE.Color('#c9a6ef') }
};
const ORE_KEYS = Object.keys(ORE_TYPES);

// ---------- heightmap ----------
function makeHeightmap() {
  const h = new Float32Array(GRID * GRID);
  const biomeNoise = new Float32Array(GRID * GRID);
  const cx = GRID / 2, cy = GRID / 2;
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const nx = x / GRID - 0.5;
      const nz = z / GRID - 0.5;
      const hill = Math.max(0, 1 - (nx * nx + nz * nz) * 3.2);
      const valley = Math.max(0, 0.7 - Math.abs((x - cx * 0.7) / (GRID * 0.18)));
      const base = fbm(x * 0.06, z * 0.06, 5);
      const ridges = Math.abs(fbm(x * 0.11 + 12, z * 0.11 + 8, 3));
      let elev = 0.6 + base * 1.4 + hill * 3.2 - valley * 1.4 + ridges * 0.8;
      elev += Math.max(0, (x - GRID * 0.7) / GRID) * 4.0;
      h[z * GRID + x] = elev;
      biomeNoise[z * GRID + x] = fbm(x * 0.08 + 100, z * 0.08 + 100, 3);
    }
  }
  return { h, biomeNoise };
}
const { h: heightmap, biomeNoise } = makeHeightmap();

function biomeFor(x, z, topY) {
  const b = biomeNoise[z * GRID + x];
  if (topY >= 5) return 'snow';
  if (topY >= 4) return 'rock';
  if (topY <= WATER_LEVEL + 0.2) return 'sand';
  if (b > 0.12) return 'forest';
  return 'grass';
}

// ---------- structures cellules ----------
const cellTop = new Int16Array(GRID * GRID);
const cellBiome = new Array(GRID * GRID);
// surface override : 'field' | null (les filons ne colorent plus la surface)
const cellSurface = new Array(GRID * GRID).fill(null);
// indique le type de filon pose sur la cellule, ou null
const cellOre = new Array(GRID * GRID).fill(null);
let voxelCount = 0;
for (let z = 0; z < GRID; z++) {
  for (let x = 0; x < GRID; x++) {
    const e = heightmap[z * GRID + x];
    const top = Math.min(MAX_STRATES, Math.max(1, Math.round(e)));
    cellTop[z * GRID + x] = top;
    cellBiome[z * GRID + x] = biomeFor(x, z, top);
    voxelCount += top;
  }
}

// ---------- voxels terrain (instancie, recoloration possible) ----------
const boxGeo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
const baseMat = new THREE.MeshStandardMaterial({
  vertexColors: false,
  roughness: 0.92,
  metalness: 0.0,
  flatShading: true
});

const instanced = new THREE.InstancedMesh(boxGeo, baseMat, voxelCount);
instanced.castShadow = true;
instanced.receiveShadow = true;

// indexation : pour chaque cellule, on garde l'index de l'instance "top"
const cellTopInstance = new Int32Array(GRID * GRID);

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();
let idx = 0;

function colorForLayer(biome, y, top) {
  const isTop = (y === top - 1);
  switch (biome) {
    case 'snow': return isTop ? COL.snow : COL.rock;
    case 'rock': return isTop ? COL.rock : COL.rockDark;
    case 'sand': return isTop ? COL.sand : COL.sandDark;
    case 'forest': return isTop ? COL.grassDark : COL.dirt;
    case 'grass':
    default: return isTop ? COL.grass : COL.dirt;
  }
}

function surfaceColor(surface, fallback) {
  if (!surface) return fallback;
  if (surface === 'field') return COL.field;
  return fallback;
}

for (let z = 0; z < GRID; z++) {
  for (let x = 0; x < GRID; x++) {
    const top = cellTop[z * GRID + x];
    const biome = cellBiome[z * GRID + x];
    for (let y = 0; y < top; y++) {
      tmpObj.position.set(x + 0.5, y + 0.5, z + 0.5);
      tmpObj.updateMatrix();
      instanced.setMatrixAt(idx, tmpObj.matrix);
      const c = colorForLayer(biome, y, top);
      tmpColor.copy(c);
      const jitter = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
      const j = 0.06 * (jitter - Math.floor(jitter) - 0.5);
      tmpColor.offsetHSL(0, 0, j);
      instanced.setColorAt(idx, tmpColor);
      if (y === top - 1) cellTopInstance[z * GRID + x] = idx;
      idx++;
    }
  }
}
instanced.instanceMatrix.needsUpdate = true;
if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
scene.add(instanced);

function repaintCellSurface(x, z) {
  const top = cellTop[z * GRID + x];
  const biome = cellBiome[z * GRID + x];
  const baseC = colorForLayer(biome, top - 1, top);
  const surface = cellSurface[z * GRID + x];
  const c = surfaceColor(surface, baseC);
  tmpColor.copy(c);
  if (surface === 'field') {
    // motif rangees : alternance fine selon x
    if (x % 2 === 0) tmpColor.offsetHSL(0, 0, -0.04);
  } else {
    const jitter = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    const j = 0.06 * (jitter - Math.floor(jitter) - 0.5);
    tmpColor.offsetHSL(0, 0, j);
  }
  instanced.setColorAt(cellTopInstance[z * GRID + x], tmpColor);
  instanced.instanceColor.needsUpdate = true;
}

// ---------- eau ----------
const waterGeo = new THREE.PlaneGeometry(GRID * 1.6, GRID * 1.6, 64, 64);
waterGeo.rotateX(-Math.PI / 2);
const waterMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    uTime: { value: 0 },
    uShallow: { value: new THREE.Color('#7fc3b5') },
    uDeep: { value: new THREE.Color('#2e5a66') }
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying float vWave;
    void main() {
      vUv = uv;
      vec3 p = position;
      float w = sin(p.x * 0.35 + uTime * 0.8) * 0.05 + sin(p.z * 0.28 + uTime * 0.6) * 0.04;
      p.y += w;
      vWave = w;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform float uTime;
    uniform vec3 uShallow;
    uniform vec3 uDeep;
    varying vec2 vUv;
    varying float vWave;
    void main() {
      vec2 uv = vUv * 6.0;
      float ripple = sin(uv.x * 3.0 + uTime * 1.2) * 0.5 + 0.5;
      ripple *= sin(uv.y * 2.4 - uTime * 0.8) * 0.5 + 0.5;
      vec3 col = mix(uDeep, uShallow, 0.55 + vWave * 2.0);
      col += vec3(0.85, 0.95, 1.0) * pow(ripple, 6.0) * 0.35;
      gl_FragColor = vec4(col, 0.82);
    }
  `
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.set(GRID / 2, WATER_LEVEL, GRID / 2);
scene.add(water);

// ---------- arbres : InstancedMesh ----------
// mesh combine simple : un cone de feuillage + un trunk, on les fait en deux InstancedMesh
const trunkGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
trunkGeo.translate(0, 0.5, 0);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.95, flatShading: true });
const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, MAX_TREES);
trunkMesh.castShadow = true;
trunkMesh.receiveShadow = true;
trunkMesh.count = 0;
trunkMesh.frustumCulled = false;
scene.add(trunkMesh);

const leafGeo = new THREE.ConeGeometry(0.95, 2.6, 6);
leafGeo.translate(0, 2.2, 0);
const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.85, flatShading: true, vertexColors: false });
const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, MAX_TREES);
leafMesh.castShadow = true;
leafMesh.receiveShadow = true;
leafMesh.count = 0;
leafMesh.frustumCulled = false;
scene.add(leafMesh);
// per instance color
leafMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES * 3), 3);

const trees = []; // { x, z, idx, scale, rot, jx, jz }

function addTree(gx, gz) {
  if (trees.length >= MAX_TREES) return;
  const top = cellTop[gz * GRID + gx];
  const jx = (rng() - 0.5) * 0.6;
  const jz = (rng() - 0.5) * 0.6;
  const scale = 0.8 + rng() * 0.5;
  const rot = rng() * Math.PI * 2;
  const i = trees.length;
  tmpObj.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz);
  tmpObj.rotation.set(0, rot, 0);
  tmpObj.scale.setScalar(scale);
  tmpObj.updateMatrix();
  trunkMesh.setMatrixAt(i, tmpObj.matrix);
  leafMesh.setMatrixAt(i, tmpObj.matrix);
  const hue = 0.28 + (rng() - 0.5) * 0.06;
  const sat = 0.5 + rng() * 0.15;
  const lig = 0.32 + rng() * 0.1;
  tmpColor.setHSL(hue, sat, lig);
  leafMesh.setColorAt(i, tmpColor);
  trunkMesh.count = i + 1;
  leafMesh.count = i + 1;
  trunkMesh.instanceMatrix.needsUpdate = true;
  leafMesh.instanceMatrix.needsUpdate = true;
  if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
  trees.push({ x: gx, z: gz, idx: i });
}

function rebuildTrees() {
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    const top = cellTop[t.z * GRID + t.x];
    // re-derivation deterministe non requise, on garde pose existante
    // mais on doit recopier la matrice depuis l'ancien index
  }
}

function removeTreesIn(cells) {
  if (!trees.length) return;
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x));
  const kept = [];
  for (const t of trees) {
    if (!cellSet.has(t.z * GRID + t.x)) kept.push(t);
  }
  if (kept.length === trees.length) return;
  // reconstruire integralement les InstancedMesh depuis kept
  trees.length = 0;
  trunkMesh.count = 0; leafMesh.count = 0;
  const stash = kept.slice();
  for (const t of stash) addTree(t.x, t.z);
}

// ---------- rochers : InstancedMesh ----------
const rockGeo = new THREE.BoxGeometry(0.7, 1.4, 0.7);
rockGeo.translate(0, 0.7, 0);
const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 0.95, flatShading: true });
const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, MAX_ROCKS);
rockMesh.castShadow = true;
rockMesh.receiveShadow = true;
rockMesh.count = 0;
rockMesh.frustumCulled = false;
rockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ROCKS * 3), 3);
scene.add(rockMesh);
const rocks = [];

function addRock(gx, gz) {
  if (rocks.length >= MAX_ROCKS) return;
  const top = cellTop[gz * GRID + gx];
  const jx = (rng() - 0.5) * 0.4;
  const jz = (rng() - 0.5) * 0.4;
  const scale = 0.7 + rng() * 0.6;
  const rot = rng() * Math.PI * 2;
  const i = rocks.length;
  tmpObj.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz);
  tmpObj.rotation.set(0, rot, 0);
  tmpObj.scale.set(scale, 0.5 + rng() * 0.8, scale);
  tmpObj.updateMatrix();
  rockMesh.setMatrixAt(i, tmpObj.matrix);
  const g = 0.3 + rng() * 0.15;
  tmpColor.setRGB(g, g, g + 0.02);
  rockMesh.setColorAt(i, tmpColor);
  rockMesh.count = i + 1;
  rockMesh.instanceMatrix.needsUpdate = true;
  if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true;
  rocks.push({ x: gx, z: gz, idx: i });
}

function removeRocksIn(cells) {
  if (!rocks.length) return;
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x));
  const kept = rocks.filter(r => !cellSet.has(r.z * GRID + r.x));
  if (kept.length === rocks.length) return;
  rocks.length = 0;
  rockMesh.count = 0;
  const stash = kept.slice();
  for (const r of stash) addRock(r.x, r.z);
}

// ---------- maisons : Groups ----------
const houses = []; // { x, z, group }

function makeHouse() {
  const g = new THREE.Group();
  const wallColors = [0xc24a3a, 0xa84030, 0xd86040];
  const roofColors = [0xc88f4a, 0xb27a3a, 0xd9a060];
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColors[Math.floor(rng() * 3)], roughness: 0.9, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[Math.floor(rng() * 3)], roughness: 0.85, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.6), wallMat);
  body.position.y = 0.6; body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.1, 4), roofMat);
  roof.position.y = 1.7;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true; roof.receiveShadow = true;
  g.add(roof);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.25), roofMat);
  chimney.position.set(0.5, 1.85, 0.2);
  chimney.castShadow = true;
  g.add(chimney);
  g.rotation.y = Math.floor(rng() * 4) * Math.PI / 2;
  return g;
}

function addHouse(gx, gz) {
  const top = cellTop[gz * GRID + gx];
  const g = makeHouse();
  g.position.set(gx + 0.5, top, gz + 0.5);
  scene.add(g);
  houses.push({ x: gx, z: gz, group: g });
}

function removeHousesIn(cells) {
  if (!houses.length) return;
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x));
  for (let i = houses.length - 1; i >= 0; i--) {
    if (cellSet.has(houses[i].z * GRID + houses[i].x)) {
      scene.remove(houses[i].group);
      houses[i].group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
      houses.splice(i, 1);
    }
  }
}

// ---------- filons : petit rocher voxel colore + cristaux ----------
const MAX_ORES = 2000;
// petit rocher : box 0.7 x 0.6 x 0.7 pose sur le top
const oreRockGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
oreRockGeo.translate(0, 0.3, 0);
const oreRockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.25, flatShading: true, vertexColors: false });
const oreRockMesh = new THREE.InstancedMesh(oreRockGeo, oreRockMat, MAX_ORES);
oreRockMesh.castShadow = true;
oreRockMesh.receiveShadow = true;
oreRockMesh.count = 0;
oreRockMesh.frustumCulled = false;
oreRockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ORES * 3), 3);
scene.add(oreRockMesh);

// petits cristaux : cubes 0.2 x 0.3 x 0.2, 4 instances max par filon
const MAX_CRYSTALS = MAX_ORES * 4;
const crystalGeo = new THREE.BoxGeometry(0.2, 0.3, 0.2);
crystalGeo.translate(0, 0.15, 0);
const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.45, flatShading: true, vertexColors: false });
const crystalMesh = new THREE.InstancedMesh(crystalGeo, crystalMat, MAX_CRYSTALS);
crystalMesh.castShadow = true;
crystalMesh.count = 0;
crystalMesh.frustumCulled = false;
crystalMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CRYSTALS * 3), 3);
scene.add(crystalMesh);

// un filon : { x, z, type, rockIdx, crystalIdxs: [] }
const ores = [];

function addOre(gx, gz, type) {
  if (ores.length >= MAX_ORES) return;
  const def = ORE_TYPES[type];
  if (!def) return;
  const top = cellTop[gz * GRID + gx];
  const jx = (rng() - 0.5) * 0.25;
  const jz = (rng() - 0.5) * 0.25;
  const rot = rng() * Math.PI * 2;
  const scale = 0.85 + rng() * 0.3;

  // rocher
  const ri = oreRockMesh.count;
  tmpObj.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz);
  tmpObj.rotation.set(0, rot, 0);
  tmpObj.scale.set(scale, 0.8 + rng() * 0.5, scale);
  tmpObj.updateMatrix();
  oreRockMesh.setMatrixAt(ri, tmpObj.matrix);
  tmpColor.copy(def.rock);
  // legere variation de teinte
  tmpColor.offsetHSL(0, 0, (rng() - 0.5) * 0.06);
  oreRockMesh.setColorAt(ri, tmpColor);
  oreRockMesh.count = ri + 1;

  // cristaux 2 a 4
  const nCrystals = 2 + Math.floor(rng() * 3);
  const crystalIdxs = [];
  const baseY = top + 0.4;
  for (let k = 0; k < nCrystals; k++) {
    const ci = crystalMesh.count;
    const cx = gx + 0.5 + jx + (rng() - 0.5) * 0.4;
    const cz = gz + 0.5 + jz + (rng() - 0.5) * 0.4;
    const cy = baseY + (rng() - 0.5) * 0.08;
    tmpObj.position.set(cx, cy, cz);
    tmpObj.rotation.set((rng() - 0.5) * 0.6, rng() * Math.PI * 2, (rng() - 0.5) * 0.6);
    const cs = 0.8 + rng() * 0.7;
    tmpObj.scale.set(cs, 0.8 + rng() * 0.8, cs);
    tmpObj.updateMatrix();
    crystalMesh.setMatrixAt(ci, tmpObj.matrix);
    tmpColor.copy(def.crystal);
    tmpColor.offsetHSL(0, 0, (rng() - 0.5) * 0.05);
    crystalMesh.setColorAt(ci, tmpColor);
    crystalMesh.count = ci + 1;
    crystalIdxs.push(ci);
  }

  oreRockMesh.instanceMatrix.needsUpdate = true;
  if (oreRockMesh.instanceColor) oreRockMesh.instanceColor.needsUpdate = true;
  crystalMesh.instanceMatrix.needsUpdate = true;
  if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true;

  ores.push({ x: gx, z: gz, type, rockIdx: ri, crystalIdxs });
  cellOre[gz * GRID + gx] = type;
}

function rebuildOres(kept) {
  ores.length = 0;
  oreRockMesh.count = 0;
  crystalMesh.count = 0;
  for (let i = 0; i < cellOre.length; i++) cellOre[i] = null;
  for (const o of kept) addOre(o.x, o.z, o.type);
}

function removeOresIn(cells) {
  if (!ores.length) return;
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x));
  const kept = ores.filter(o => !cellSet.has(o.z * GRID + o.x));
  if (kept.length === ores.length) return;
  rebuildOres(kept.slice());
}

// ---------- post process ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.85, 0.92);
composer.addPass(bloom);
const vignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.5 }, uSoftness: { value: 0.65 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uStrength; uniform float uSoftness; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float r = length(d);
      float v = smoothstep(0.75, uSoftness * 0.35, r);
      c.rgb *= mix(1.0 - uStrength, 1.0, v);
      c.rgb = mix(c.rgb, c.rgb * vec3(1.04, 0.99, 0.92), 1.0 - v);
      gl_FragColor = c;
    }
  `
};
composer.addPass(new ShaderPass(vignetteShader));
composer.addPass(new OutputPass());

// ---------- resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- selection d'outils ----------
const state = {
  tool: 'nav',
  brush: 3,
  isPainting: false,
  paintedThisStroke: new Set(),
  oreType: ORE_KEYS[0]
};

const toolBtns = document.querySelectorAll('.tool');
const brushBtns = document.querySelectorAll('.brush');
const hudTool = document.getElementById('hud-tool');

function setTool(t) {
  // cycle du type de filon si on reclique sur "ore" alors qu'il est deja actif
  if (t === 'ore' && state.tool === 'ore') {
    const i = ORE_KEYS.indexOf(state.oreType);
    state.oreType = ORE_KEYS[(i + 1) % ORE_KEYS.length];
  }
  state.tool = t;
  toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  hudTool.textContent = labelOfTool(t);
  updateOreButtonLabel();
  // gauche : on libere ROTATE seulement en mode nav
  if (t === 'nav') {
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  } else {
    controls.mouseButtons.LEFT = null;
  }
}
function labelOfTool(t) {
  if (t === 'ore') return 'filon (' + ORE_TYPES[state.oreType].label + ')';
  return ({ nav: 'naviguer', tree: 'arbre', forest: 'foret', rock: 'rocher', house: 'maison', field: 'champ', erase: 'effacer' })[t] || t;
}
function updateOreButtonLabel() {
  const btn = document.querySelector('.tool[data-tool="ore"]');
  if (!btn) return;
  const def = ORE_TYPES[state.oreType];
  btn.innerHTML = 'Filon<br><span style="font-size:10px;color:#ffd98a">' + def.label + '</span><span class="key">5</span>';
  // petite pastille de couleur
  btn.style.borderLeft = '4px solid #' + def.rock.getHexString();
}
function setBrush(b) {
  state.brush = b;
  brushBtns.forEach(x => x.classList.toggle('active', parseInt(x.dataset.brush, 10) === b));
}
toolBtns.forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
brushBtns.forEach(b => b.addEventListener('click', () => setBrush(parseInt(b.dataset.brush, 10))));

window.addEventListener('keydown', (e) => {
  const map = { '1': 'nav', '2': 'tree', '3': 'forest', '4': 'rock', '5': 'ore', '6': 'house', '7': 'field', '8': 'erase' };
  if (map[e.key]) setTool(map[e.key]);
  if (e.key === '+' || e.key === '=') setBrush(Math.min(5, state.brush + 2));
  if (e.key === '-') setBrush(Math.max(1, state.brush - 2));
});

window.addEventListener('wheel', (e) => {
  // quand outil filon actif et touche shift, on cycle le type
  if (state.tool === 'ore' && e.shiftKey) {
    e.preventDefault();
    const i = ORE_KEYS.indexOf(state.oreType);
    const dir = e.deltaY > 0 ? 1 : -1;
    state.oreType = ORE_KEYS[(i + dir + ORE_KEYS.length) % ORE_KEYS.length];
    hudTool.textContent = labelOfTool('ore');
    updateOreButtonLabel();
  }
}, { passive: false });

// ---------- raycasting sur top des voxels ----------
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

// pour le pick on utilise un plan invisible par strate ? plus simple : on raycast sur InstancedMesh
function pickCell(clientX, clientY) {
  mouseNDC.x = (clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObject(instanced, false);
  if (!hits.length) return null;
  const p = hits[0].point;
  const x = Math.floor(p.x);
  const z = Math.floor(p.z);
  if (x < 0 || x >= GRID || z < 0 || z >= GRID) return null;
  return { x, z };
}

function cellsInBrush(cx, cz, radius) {
  const out = [];
  const r = radius;
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > r * r + 0.5) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
      out.push({ x, z });
    }
  }
  return out;
}

// ---------- HUD compteurs ----------
const hudC = {
  trees: document.getElementById('c-trees'),
  rocks: document.getElementById('c-rocks'),
  houses: document.getElementById('c-houses'),
  fields: document.getElementById('c-fields'),
  ores: document.getElementById('c-ores')
};
function refreshHUD() {
  hudC.trees.textContent = trees.length;
  hudC.rocks.textContent = rocks.length;
  hudC.houses.textContent = houses.length;
  let f = 0;
  for (let i = 0; i < cellSurface.length; i++) {
    if (cellSurface[i] === 'field') f++;
  }
  hudC.fields.textContent = f;
  // filons par type
  const counts = {};
  for (const k of ORE_KEYS) counts[k] = 0;
  for (const o of ores) counts[o.type] = (counts[o.type] || 0) + 1;
  const parts = ORE_KEYS.map(k => ORE_TYPES[k].label + ' ' + counts[k]);
  hudC.ores.textContent = ores.length + ' (' + parts.join(', ') + ')';
}

// ---------- application des outils ----------
function isCellOccupied(x, z) {
  for (const t of trees) if (t.x === x && t.z === z) return true;
  for (const r of rocks) if (r.x === x && r.z === z) return true;
  for (const h of houses) if (h.x === x && h.z === z) return true;
  if (cellOre[z * GRID + x]) return true;
  return false;
}

function applyToolAtCell(cell) {
  const key = cell.z * GRID + cell.x;
  if (state.paintedThisStroke.has(key)) return;
  state.paintedThisStroke.add(key);

  switch (state.tool) {
    case 'tree':
      if (!isCellOccupied(cell.x, cell.z)) addTree(cell.x, cell.z);
      break;
    case 'forest': {
      const cells = cellsInBrush(cell.x, cell.z, state.brush);
      for (const c of cells) {
        const k = c.z * GRID + c.x;
        if (state.paintedThisStroke.has('f' + k)) continue;
        state.paintedThisStroke.add('f' + k);
        if (rng() < 0.6 && !isCellOccupied(c.x, c.z)) addTree(c.x, c.z);
      }
      break;
    }
    case 'rock':
      if (!isCellOccupied(cell.x, cell.z)) addRock(cell.x, cell.z);
      break;
    case 'ore': {
      const cells = cellsInBrush(cell.x, cell.z, state.brush);
      for (const c of cells) {
        const k = c.z * GRID + c.x;
        if (state.paintedThisStroke.has('o' + k)) continue;
        state.paintedThisStroke.add('o' + k);
        // on ne pose un filon que si la cellule est libre et avec une probabilite (jitter de densite)
        if (isCellOccupied(c.x, c.z)) continue;
        if (rng() < 0.7) addOre(c.x, c.z, state.oreType);
      }
      break;
    }
    case 'house':
      if (!isCellOccupied(cell.x, cell.z)) addHouse(cell.x, cell.z);
      break;
    case 'field': {
      const cells = cellsInBrush(cell.x, cell.z, state.brush);
      for (const c of cells) {
        const k = c.z * GRID + c.x;
        if (state.paintedThisStroke.has('h' + k)) continue;
        state.paintedThisStroke.add('h' + k);
        cellSurface[k] = 'field';
        repaintCellSurface(c.x, c.z);
      }
      break;
    }
    case 'erase': {
      const cells = cellsInBrush(cell.x, cell.z, state.brush);
      removeTreesIn(cells);
      removeRocksIn(cells);
      removeHousesIn(cells);
      removeOresIn(cells);
      for (const c of cells) {
        const k = c.z * GRID + c.x;
        if (cellSurface[k]) {
          cellSurface[k] = null;
          repaintCellSurface(c.x, c.z);
        }
      }
      break;
    }
  }
  refreshHUD();
}

// ---------- input ----------
const dom = renderer.domElement;
dom.addEventListener('contextmenu', (e) => e.preventDefault());

dom.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (state.tool === 'nav') return;
  state.isPainting = true;
  state.paintedThisStroke = new Set();
  const cell = pickCell(e.clientX, e.clientY);
  if (cell) applyToolAtCell(cell);
});
dom.addEventListener('pointermove', (e) => {
  if (!state.isPainting) return;
  // outils unitaires : un seul clic
  if (state.tool === 'tree' || state.tool === 'rock' || state.tool === 'house') return;
  const cell = pickCell(e.clientX, e.clientY);
  if (cell) applyToolAtCell(cell);
});
window.addEventListener('pointerup', () => {
  state.isPainting = false;
});

// init HUD
setTool('nav');
setBrush(3);
refreshHUD();

// ---------- boucle ----------
const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  waterMat.uniforms.uTime.value = t;
  controls.update();
  composer.render();
  requestAnimationFrame(tick);
}
loader.classList.add('hidden');
tick();
