import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ============================================================================
// Editeur Strates, fusion proto3 (visuel) + proto4 (colons) + proto5 (placement)
// Un seul fichier par choix de lisibilite, sections clairement separees.
// ============================================================================

// ---------- constantes ----------
const GRID = 48;
const MAX_STRATES = 6;
const MIN_STRATES = 1;
const WATER_LEVEL = 1.15;
const VOXEL = 1;
const COLONIST_SPEED = 2.0;
const WORK_DURATION = 2.0;
const MAX_STEP = 2;
const GRAVITY = 20;
const MAX_TREES = 4000;
const MAX_ROCKS = 2000;
const MAX_ORES = 2000;
const MAX_CRYSTALS = MAX_ORES * 4;

// ---------- PRNG + bruit Perlin ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let seedRand = mulberry32(1337);
let rng = mulberry32(7777);
let PERM = new Uint8Array(512);
function rebuildPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(seedRand() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
rebuildPerm();
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

// ---------- boot rendu ----------
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
controls.minDistance = 18;
controls.maxDistance = 140;
controls.maxPolarAngle = Math.PI * 0.48;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

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
sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(60), THREE.MathUtils.degToRad(135));
skyU.sunPosition.value.copy(sunDir);

// ---------- lumieres ----------
const sun = new THREE.DirectionalLight(0xfff2d9, 2.4);
sun.position.set(60, 70, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
{
  const d = 60;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
}
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
  designate: new THREE.Color('#d6493a'),
  flash: new THREE.Color('#ffffff'),
};

const ORE_TYPES = {
  'ore-gold':      { label: 'or',        rock: new THREE.Color('#e8c547'), crystal: new THREE.Color('#ffe98a') },
  'ore-copper':    { label: 'cuivre',    rock: new THREE.Color('#c97a4a'), crystal: new THREE.Color('#e8a47a') },
  'ore-silver':    { label: 'argent',    rock: new THREE.Color('#d8dde0'), crystal: new THREE.Color('#f4f7f9') },
  'ore-iron':      { label: 'fer',       rock: new THREE.Color('#7d8a9a'), crystal: new THREE.Color('#b4c0cc') },
  'ore-coal':      { label: 'charbon',   rock: new THREE.Color('#2a2a2a'), crystal: new THREE.Color('#5a5a5a') },
  'ore-amethyst':  { label: 'amethyste', rock: new THREE.Color('#9b6bd6'), crystal: new THREE.Color('#c9a6ef') }
};
const ORE_KEYS = Object.keys(ORE_TYPES);

// ============================================================================
// Terrain : heightmap, voxels instancies, recoloration top
// ============================================================================

let heightmap, biomeNoise;
let cellTop, cellBiome;
let cellSurface, cellOre;
const instanceIndex = []; // par cellule : array [y] = idx d'instance
let instanced = null;
let origColor = null;
let voxelCount = 0;

const boxGeo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
const baseMat = new THREE.MeshStandardMaterial({
  vertexColors: false,
  roughness: 0.92,
  metalness: 0.0,
  flatShading: true
});

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();
const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

function makeHeightmap() {
  const h = new Float32Array(GRID * GRID);
  const bn = new Float32Array(GRID * GRID);
  const cx = GRID / 2;
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
      bn[z * GRID + x] = fbm(x * 0.08 + 100, z * 0.08 + 100, 3);
    }
  }
  return { h, bn };
}

function biomeFor(x, z, topY) {
  const b = biomeNoise[z * GRID + x];
  if (topY >= 5) return 'snow';
  if (topY >= 4) return 'rock';
  if (topY <= WATER_LEVEL + 0.2) return 'sand';
  if (b > 0.12) return 'forest';
  return 'grass';
}

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
  if (surface === 'field') return COL.field;
  return fallback;
}

function buildTerrain() {
  const r = makeHeightmap();
  heightmap = r.h;
  biomeNoise = r.bn;

  cellTop = new Int16Array(GRID * GRID);
  cellBiome = new Array(GRID * GRID);
  cellSurface = new Array(GRID * GRID).fill(null);
  cellOre = new Array(GRID * GRID).fill(null);
  instanceIndex.length = 0;
  for (let i = 0; i < GRID * GRID; i++) instanceIndex.push([]);

  voxelCount = 0;
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const e = heightmap[z * GRID + x];
      const top = Math.min(MAX_STRATES, Math.max(MIN_STRATES, Math.round(e)));
      cellTop[z * GRID + x] = top;
      cellBiome[z * GRID + x] = biomeFor(x, z, top);
      voxelCount += top;
    }
  }

  if (instanced) {
    scene.remove(instanced);
    instanced.dispose();
  }
  instanced = new THREE.InstancedMesh(boxGeo, baseMat, voxelCount);
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  origColor = new Array(voxelCount);

  let idx = 0;
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const top = cellTop[z * GRID + x];
      const biome = cellBiome[z * GRID + x];
      const colArr = instanceIndex[z * GRID + x];
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
        origColor[idx] = tmpColor.clone();
        colArr[y] = idx;
        idx++;
      }
    }
  }
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  scene.add(instanced);
}

function topVoxelIndex(x, z) {
  const top = cellTop[z * GRID + x];
  if (top <= 0) return -1;
  return instanceIndex[z * GRID + x][top - 1];
}

function repaintCellSurface(x, z) {
  const top = cellTop[z * GRID + x];
  const biome = cellBiome[z * GRID + x];
  const baseC = colorForLayer(biome, top - 1, top);
  const surface = cellSurface[z * GRID + x];
  const c = surfaceColor(surface, baseC);
  tmpColor.copy(c);
  if (surface === 'field') {
    if (x % 2 === 0) tmpColor.offsetHSL(0, 0, -0.04);
  } else {
    const jitter = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    const j = 0.06 * (jitter - Math.floor(jitter) - 0.5);
    tmpColor.offsetHSL(0, 0, j);
  }
  const i = topVoxelIndex(x, z);
  if (i < 0) return;
  instanced.setColorAt(i, tmpColor);
  origColor[i].copy(tmpColor);
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

// ============================================================================
// Placement : arbres, rochers, filons, maisons, champs
// ============================================================================

// Arbres, deux InstancedMesh : trunk + leaf
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
const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.85, flatShading: true });
const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, MAX_TREES);
leafMesh.castShadow = true;
leafMesh.receiveShadow = true;
leafMesh.count = 0;
leafMesh.frustumCulled = false;
leafMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES * 3), 3);
scene.add(leafMesh);

const trees = [];

function addTree(gx, gz) {
  if (trees.length >= MAX_TREES) return;
  const top = cellTop[gz * GRID + gx];
  if (top <= WATER_LEVEL) return;
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
  tmpColor.setHSL(0.28 + (rng() - 0.5) * 0.06, 0.5 + rng() * 0.15, 0.32 + rng() * 0.1);
  leafMesh.setColorAt(i, tmpColor);
  trunkMesh.count = i + 1;
  leafMesh.count = i + 1;
  trunkMesh.instanceMatrix.needsUpdate = true;
  leafMesh.instanceMatrix.needsUpdate = true;
  if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
  trees.push({ x: gx, z: gz });
}

function removeTreesIn(cells) {
  if (!trees.length) return;
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x));
  const kept = trees.filter(t => !cellSet.has(t.z * GRID + t.x));
  if (kept.length === trees.length) return;
  trees.length = 0;
  trunkMesh.count = 0; leafMesh.count = 0;
  for (const t of kept) addTree(t.x, t.z);
}

// Rochers
const rockGeo = new THREE.BoxGeometry(0.7, 1.4, 0.7);
rockGeo.translate(0, 0.7, 0);
const rockMatInst = new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 0.95, flatShading: true });
const rockMesh = new THREE.InstancedMesh(rockGeo, rockMatInst, MAX_ROCKS);
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
  if (top <= WATER_LEVEL) return;
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
  rocks.push({ x: gx, z: gz });
}

function removeRocksIn(cells) {
  if (!rocks.length) return;
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x));
  const kept = rocks.filter(r => !cellSet.has(r.z * GRID + r.x));
  if (kept.length === rocks.length) return;
  rocks.length = 0;
  rockMesh.count = 0;
  for (const r of kept) addRock(r.x, r.z);
}

// Filons
const oreRockGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
oreRockGeo.translate(0, 0.3, 0);
const oreRockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.25, flatShading: true });
const oreRockMesh = new THREE.InstancedMesh(oreRockGeo, oreRockMat, MAX_ORES);
oreRockMesh.castShadow = true;
oreRockMesh.receiveShadow = true;
oreRockMesh.count = 0;
oreRockMesh.frustumCulled = false;
oreRockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ORES * 3), 3);
scene.add(oreRockMesh);

const crystalGeo = new THREE.BoxGeometry(0.2, 0.3, 0.2);
crystalGeo.translate(0, 0.15, 0);
const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.45, flatShading: true });
const crystalMesh = new THREE.InstancedMesh(crystalGeo, crystalMat, MAX_CRYSTALS);
crystalMesh.castShadow = true;
crystalMesh.count = 0;
crystalMesh.frustumCulled = false;
crystalMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CRYSTALS * 3), 3);
scene.add(crystalMesh);

const ores = [];

function addOre(gx, gz, type) {
  if (ores.length >= MAX_ORES) return;
  const def = ORE_TYPES[type];
  if (!def) return;
  const top = cellTop[gz * GRID + gx];
  if (top <= WATER_LEVEL) return;
  const jx = (rng() - 0.5) * 0.25;
  const jz = (rng() - 0.5) * 0.25;
  const rot = rng() * Math.PI * 2;
  const scale = 0.85 + rng() * 0.3;

  const ri = oreRockMesh.count;
  tmpObj.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz);
  tmpObj.rotation.set(0, rot, 0);
  tmpObj.scale.set(scale, 0.8 + rng() * 0.5, scale);
  tmpObj.updateMatrix();
  oreRockMesh.setMatrixAt(ri, tmpObj.matrix);
  tmpColor.copy(def.rock);
  tmpColor.offsetHSL(0, 0, (rng() - 0.5) * 0.06);
  oreRockMesh.setColorAt(ri, tmpColor);
  oreRockMesh.count = ri + 1;

  const nCrystals = 2 + Math.floor(rng() * 3);
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
  }

  oreRockMesh.instanceMatrix.needsUpdate = true;
  if (oreRockMesh.instanceColor) oreRockMesh.instanceColor.needsUpdate = true;
  crystalMesh.instanceMatrix.needsUpdate = true;
  if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true;

  ores.push({ x: gx, z: gz, type });
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

// Maisons voxel (design proto3, preserve tel quel)
const houses = [];

function makeHouse() {
  const g = new THREE.Group();
  const wallColors = [0xf2e6c9, 0xe6d2a8, 0xd9c79d];
  const roofColors = [0xb24e3a, 0xa04030, 0xc86a48];
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColors[Math.floor(rng() * 3)], roughness: 0.9, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[Math.floor(rng() * 3)], roughness: 0.85, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), wallMat);
  body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.9, 4), roofMat);
  roof.position.y = 1.45;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true; roof.receiveShadow = true;
  g.add(roof);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.18), wallMat);
  chimney.position.set(0.35, 1.5, 0.15);
  chimney.castShadow = true;
  g.add(chimney);
  g.rotation.y = rng() * Math.PI * 2;
  return g;
}

function addHouse(gx, gz) {
  const top = cellTop[gz * GRID + gx];
  if (top <= WATER_LEVEL) return;
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

function clearAllPlacements() {
  trees.length = 0; trunkMesh.count = 0; leafMesh.count = 0;
  rocks.length = 0; rockMesh.count = 0;
  ores.length = 0; oreRockMesh.count = 0; crystalMesh.count = 0;
  for (let i = 0; i < cellOre.length; i++) cellOre[i] = null;
  for (const h of houses) {
    scene.remove(h.group);
    h.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
  }
  houses.length = 0;
}

function isCellOccupied(x, z) {
  for (const t of trees) if (t.x === x && t.z === z) return true;
  for (const r of rocks) if (r.x === x && r.z === z) return true;
  for (const h of houses) if (h.x === x && h.z === z) return true;
  if (cellOre[z * GRID + x]) return true;
  return false;
}

// ============================================================================
// Jobs de minage (proto4)
// ============================================================================
const jobs = new Map();
function jobKey(x, z) { return x + ',' + z; }

const markerGeo = new THREE.PlaneGeometry(0.6, 0.6);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xff5544, transparent: true, opacity: 0.9, depthWrite: false });
const markers = new Map();
const markerGroup = new THREE.Group();
scene.add(markerGroup);

function tintTopVoxel(x, z) {
  const i = topVoxelIndex(x, z);
  if (i < 0) return;
  tmpColor.copy(origColor[i]).lerp(COL.designate, 0.65);
  instanced.setColorAt(i, tmpColor);
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
}
function untintTopVoxel(x, z) {
  const i = topVoxelIndex(x, z);
  if (i < 0) return;
  instanced.setColorAt(i, origColor[i]);
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
}

let lastJobTime = performance.now() / 1000;

function addJob(x, z) {
  const k = jobKey(x, z);
  if (jobs.has(k)) return;
  const top = cellTop[z * GRID + x];
  if (top <= MIN_STRATES) return;
  if (top <= WATER_LEVEL + 0.5) return;
  jobs.set(k, { x, z, claimedBy: null });
  lastJobTime = performance.now() / 1000;
  tintTopVoxel(x, z);
  const m = new THREE.Mesh(markerGeo, markerMat);
  m.position.set(x + 0.5, top + 0.8, z + 0.5);
  markerGroup.add(m);
  markers.set(k, m);
}

function removeJob(x, z, completed = false) {
  const k = jobKey(x, z);
  if (!jobs.has(k)) return;
  const j = jobs.get(k);
  if (j.claimedBy) {
    j.claimedBy.state = 'IDLE';
    j.claimedBy.path = null;
    j.claimedBy.targetJob = null;
  }
  jobs.delete(k);
  if (!completed) untintTopVoxel(x, z);
  const m = markers.get(k);
  if (m) { markerGroup.remove(m); markers.delete(k); }
}

function removeAllJobsIn(cells) {
  for (const c of cells) removeJob(c.x, c.z, false);
}

// ============================================================================
// A* + approach (proto4)
// ============================================================================
function passable(x, z, fromTop) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return false;
  const top = cellTop[z * GRID + x];
  if (top <= 0) return false;
  if (top <= WATER_LEVEL) return false;
  if (Math.abs(top - fromTop) > MAX_STEP) return false;
  return true;
}

function aStar(sx, sz, tx, tz) {
  if (sx === tx && sz === tz) return [[sx, sz]];
  const open = [];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();
  const sk = sx + ',' + sz;
  gScore.set(sk, 0);
  fScore.set(sk, Math.abs(tx - sx) + Math.abs(tz - sz));
  open.push({ x: sx, z: sz, f: fScore.get(sk) });
  const closed = new Set();
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = cur.x + ',' + cur.z;
    if (cur.x === tx && cur.z === tz) {
      const path = [[cur.x, cur.z]];
      let k = ck;
      while (cameFrom.has(k)) {
        const [px, pz] = cameFrom.get(k);
        path.unshift([px, pz]);
        k = px + ',' + pz;
      }
      return path;
    }
    closed.add(ck);
    const curTop = cellTop[cur.z * GRID + cur.x];
    for (const [dx, dz] of dirs) {
      const nx = cur.x + dx, nz = cur.z + dz;
      const nk = nx + ',' + nz;
      if (closed.has(nk)) continue;
      const isTarget = (nx === tx && nz === tz);
      if (!isTarget && !passable(nx, nz, curTop)) continue;
      const tentative = (gScore.get(ck) ?? Infinity) + 1;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, [cur.x, cur.z]);
        gScore.set(nk, tentative);
        const f = tentative + Math.abs(tx - nx) + Math.abs(tz - nz);
        fScore.set(nk, f);
        let found = false;
        for (let i = 0; i < open.length; i++) {
          if (open[i].x === nx && open[i].z === nz) { open[i].f = f; found = true; break; }
        }
        if (!found) open.push({ x: nx, z: nz, f });
      }
    }
  }
  return null;
}

function findApproach(sx, sz, tx, tz) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let best = null, bestLen = Infinity;
  for (const [dx, dz] of dirs) {
    const nx = tx + dx, nz = tz + dz;
    if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue;
    const top = cellTop[nz * GRID + nx];
    if (top <= WATER_LEVEL) continue;
    const path = aStar(sx, sz, nx, nz);
    if (path && path.length < bestLen) {
      best = { path, ax: nx, az: nz };
      bestLen = path.length;
    }
  }
  return best;
}

// ============================================================================
// Bulles de dialogue (proto4)
// ============================================================================
const SPEECH_LINES = [
  "Qu'est-ce qu'on fait ?",
  "Il fait beau ici.",
  "Je me sens utile a rien.",
  "On attend quoi au juste ?",
  "Regarde, un oiseau.",
  "J'ai un peu faim.",
  "Bon, et maintenant ?",
  "Je commence a m'ennuyer.",
  "Tu crois qu'il va pleuvoir ?",
  "On pourrait construire quelque chose.",
  "Je vais faire un tour.",
  "Quelqu'un a vu le chef ?",
  "Ca pousse bien par ici.",
  "J'aime bien cet endroit.",
  "Faudrait creuser la, non ?",
  "Je prends racine la.",
  "Joli panorama.",
  "Mes pieds me font mal.",
  "On va camper ici ?",
  "Un peu de musique, non ?",
  "J'ai oublie mon chapeau."
];
const SPEECH_LINES_INSISTENT = [
  "Tu dors ou quoi ?",
  "Allez, du boulot !",
  "Bouge, patron !",
  "On va moisir la.",
  "Tu nous as oublies ?",
  "Donne nous quelque chose a faire."
];

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
    return this;
  };
}

function makeBubbleCanvas() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  return c;
}

function drawBubble(canvas, text) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '500 32px system-ui, sans-serif';
  const padX = 22;
  const metrics = ctx.measureText(text);
  const tw = Math.min(canvas.width - padX * 2, metrics.width);
  const bw = tw + padX * 2;
  const bh = 64;
  const bx = (canvas.width - bw) / 2;
  const by = 10;
  const r = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.roundRect(bx + 3, by + 5, bw, bh, r); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, r); ctx.fill(); ctx.stroke();
  const cxp = canvas.width / 2;
  const tipY = by + bh + 18;
  ctx.beginPath();
  ctx.moveTo(cxp - 12, by + bh - 1);
  ctx.lineTo(cxp + 12, by + bh - 1);
  ctx.lineTo(cxp, tipY);
  ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cxp - 11, by + bh - 3, 22, 3);
  ctx.fillStyle = '#1a1f2a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, by + bh / 2, canvas.width - padX * 2);
}

function activeSpeakers() {
  let n = 0;
  for (const c of colonists) if (c.speechTimer > 0) n++;
  return n;
}

// ============================================================================
// Colons (proto4)
// ============================================================================
const COLONIST_COLORS = [0xffcf6b, 0x6bd0ff, 0xff8a8a, 0xb78aff, 0x8aff9c, 0xffa07a, 0x98ddca];

function topY(x, z) { return cellTop[z * GRID + x]; }

class Colonist {
  constructor(id, x, z) {
    this.id = id;
    this.x = x; this.z = z;
    this.tx = x + 0.5;
    this.tz = z + 0.5;
    this.ty = topY(x, z);
    this.vy = 0;
    this.state = 'IDLE';
    this.path = null;
    this.pathStep = 0;
    this.targetJob = null;
    this.workTimer = 0;
    this.bounce = 0;
    this.isWandering = false;
    this.wanderPause = 2 + Math.random() * 4;
    this.lookTimer = 1 + Math.random() * 3;
    this.targetYaw = 0;
    this.speechTimer = 0;
    this.nextSpeech = 10 + Math.random() * 10;
    this.lastLine = null;
    const col = COLONIST_COLORS[id % COLONIST_COLORS.length];
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, flatShading: true });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf3d6a8, roughness: 0.7, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), bodyMat);
    body.position.y = 0.5; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMat);
    head.position.y = 1.2; head.castShadow = true;
    this.group.add(body); this.group.add(head);
    this.group.position.set(this.tx, this.ty, this.tz);
    scene.add(this.group);
    this.lineMat = new THREE.LineDashedMaterial({ color: col, dashSize: 0.2, gapSize: 0.15, transparent: true, opacity: 0.6 });
    this.lineGeo = new THREE.BufferGeometry();
    this.line = new THREE.Line(this.lineGeo, this.lineMat);
    scene.add(this.line);
    this.bubbleCanvas = makeBubbleCanvas();
    this.bubbleTex = new THREE.CanvasTexture(this.bubbleCanvas);
    this.bubbleTex.minFilter = THREE.LinearFilter;
    this.bubbleMat = new THREE.SpriteMaterial({ map: this.bubbleTex, transparent: true, depthTest: false, depthWrite: false });
    this.bubbleMat.opacity = 0;
    this.bubble = new THREE.Sprite(this.bubbleMat);
    this.bubble.scale.set(2.4, 0.75, 1);
    this.bubble.position.set(0, 2.2, 0);
    this.bubble.visible = false;
    this.bubble.renderOrder = 999;
    this.group.add(this.bubble);
  }

  say(line) {
    this.lastLine = line;
    drawBubble(this.bubbleCanvas, line);
    this.bubbleTex.needsUpdate = true;
    this.speechTimer = 4.0;
    this.bubble.visible = true;
    this.bubbleMat.opacity = 1;
  }

  updateSpeech(dt) {
    if (this.speechTimer <= 0) {
      if (this.bubble.visible) { this.bubble.visible = false; this.bubbleMat.opacity = 0; }
      return;
    }
    this.speechTimer -= dt;
    if (this.speechTimer <= 0.5) {
      this.bubbleMat.opacity = Math.max(0, this.speechTimer / 0.5);
    } else {
      this.bubbleMat.opacity = 1;
    }
    if (this.speechTimer <= 0) {
      this.bubble.visible = false;
      this.bubbleMat.opacity = 0;
    }
  }

  pickWander() {
    for (let tries = 0; tries < 10; tries++) {
      const dx = Math.floor((Math.random() * 7) - 3);
      const dz = Math.floor((Math.random() * 7) - 3);
      if (dx === 0 && dz === 0) continue;
      const nx = this.x + dx, nz = this.z + dz;
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue;
      const top = cellTop[nz * GRID + nx];
      if (top <= WATER_LEVEL) continue;
      let occupied = false;
      for (const other of colonists) {
        if (other === this) continue;
        if (other.x === nx && other.z === nz) { occupied = true; break; }
      }
      if (occupied) continue;
      const path = aStar(this.x, this.z, nx, nz);
      if (path && path.length > 1 && path.length < 8) {
        this.path = path;
        this.pathStep = 0;
        this.isWandering = true;
        this.state = 'MOVING';
        this.updateTrail();
        return true;
      }
    }
    return false;
  }

  pickJob() {
    let best = null, bestD = Infinity;
    for (const [, j] of jobs) {
      if (j.claimedBy) continue;
      const d = Math.abs(j.x - this.x) + Math.abs(j.z - this.z);
      if (d < bestD) { bestD = d; best = j; }
    }
    if (!best) return false;
    const approach = findApproach(this.x, this.z, best.x, best.z);
    if (!approach) return false;
    best.claimedBy = this;
    this.targetJob = best;
    this.path = approach.path;
    this.pathStep = 0;
    this.state = 'MOVING';
    this.isWandering = false;
    this.updateTrail();
    return true;
  }

  updateTrail() {
    if (!this.path) { this.lineGeo.setFromPoints([]); return; }
    const pts = [];
    for (let i = this.pathStep; i < this.path.length; i++) {
      const [x, z] = this.path[i];
      pts.push(new THREE.Vector3(x + 0.5, topY(x, z) + 0.05, z + 0.5));
    }
    this.lineGeo.setFromPoints(pts);
    this.line.computeLineDistances();
  }

  applyGravity(dt) {
    const groundY = topY(this.x, this.z);
    if (this.ty > groundY + 1e-4) {
      this.vy -= GRAVITY * dt;
      this.ty += this.vy * dt;
      if (this.ty <= groundY) { this.ty = groundY; this.vy = 0; }
    } else if (this.ty < groundY) {
      this.ty = groundY; this.vy = 0;
    } else {
      this.vy = 0;
    }
  }

  update(dt) {
    this.applyGravity(dt);
    this.updateSpeech(dt);

    if (this.state === 'IDLE') {
      this.lineGeo.setFromPoints([]);
      if (jobs.size > 0) { if (this.pickJob()) return; }
      this.wanderPause -= dt;
      this.lookTimer -= dt;
      if (this.lookTimer <= 0) {
        this.targetYaw = this.group.rotation.y + (Math.random() - 0.5) * 1.2;
        this.lookTimer = 1.5 + Math.random() * 3.5;
      }
      const dy = this.targetYaw - this.group.rotation.y;
      this.group.rotation.y += dy * Math.min(1, dt * 1.5);
      if (this.wanderPause <= 0) {
        if (this.pickWander()) this.wanderPause = 2 + Math.random() * 4;
        else this.wanderPause = 1 + Math.random() * 2;
      }
      this.group.position.set(this.tx, this.ty, this.tz);
      this.nextSpeech -= dt;
      if (this.nextSpeech <= 0) {
        if (this.speechTimer <= 0 && activeSpeakers() < 2) {
          const noJobSince = performance.now() / 1000 - lastJobTime;
          const insistent = (jobs.size === 0 && noJobSince > 15) && Math.random() < 0.6;
          const pool = insistent ? SPEECH_LINES_INSISTENT : SPEECH_LINES;
          let line, guard = 0;
          do { line = pool[Math.floor(Math.random() * pool.length)]; guard++; }
          while (line === this.lastLine && guard < 5);
          this.say(line);
        }
        const noJobSince = performance.now() / 1000 - lastJobTime;
        const base = (jobs.size === 0 && noJobSince > 15) ? 6 : 12;
        this.nextSpeech = base + Math.random() * 8;
      }
      return;
    }

    if (this.state === 'MOVING') {
      if (this.isWandering && jobs.size > 0) {
        this.isWandering = false;
        this.path = null;
        this.state = 'IDLE';
        this.lineGeo.setFromPoints([]);
        return;
      }
      if (!this.path || this.pathStep >= this.path.length) {
        if (this.isWandering) {
          this.isWandering = false;
          this.state = 'IDLE';
          this.path = null;
          this.lineGeo.setFromPoints([]);
          this.wanderPause = 2 + Math.random() * 4;
          return;
        }
        this.state = 'WORKING';
        this.workTimer = 0;
        this.lineGeo.setFromPoints([]);
        return;
      }
      const [nx, nz] = this.path[this.pathStep];
      const targetX = nx + 0.5;
      const targetZ = nz + 0.5;
      const dx = targetX - this.tx;
      const dz = targetZ - this.tz;
      const dist = Math.hypot(dx, dz);
      const speed = this.isWandering ? COLONIST_SPEED * 0.5 : COLONIST_SPEED;
      const step = speed * dt;
      if (dist <= step) {
        this.tx = targetX; this.tz = targetZ;
        this.x = nx; this.z = nz;
        this.pathStep++;
        this.updateTrail();
      } else {
        this.tx += (dx / dist) * step;
        this.tz += (dz / dist) * step;
      }
      const bob = this.isWandering ? Math.sin(performance.now() * 0.006) * 0.04 : 0;
      this.group.position.set(this.tx, this.ty + bob, this.tz);
      this.group.rotation.y = Math.atan2(dx, dz);
      this.targetYaw = this.group.rotation.y;
      return;
    }

    if (this.state === 'WORKING') {
      this.workTimer += dt;
      if (this.targetJob) {
        const dx = (this.targetJob.x + 0.5) - this.tx;
        const dz = (this.targetJob.z + 0.5) - this.tz;
        this.group.rotation.y = Math.atan2(dx, dz);
      }
      this.bounce = Math.sin(this.workTimer * 12) * 0.08;
      const grounded = this.ty <= topY(this.x, this.z) + 1e-4 && this.vy === 0;
      this.group.position.set(this.tx, this.ty + (grounded ? Math.abs(this.bounce) : 0), this.tz);
      if (this.workTimer >= WORK_DURATION) {
        if (this.targetJob) {
          const { x, z } = this.targetJob;
          const top = cellTop[z * GRID + x];
          if (top > MIN_STRATES) {
            const i = instanceIndex[z * GRID + x][top - 1];
            instanced.setMatrixAt(i, HIDDEN_MATRIX);
            instanced.instanceMatrix.needsUpdate = true;
            cellTop[z * GRID + x] = top - 1;
            scheduleFlash(x, z);
          }
          removeJob(x, z, true);
          this.targetJob = null;
        }
        this.state = 'IDLE';
        this.path = null;
        this.group.position.set(this.tx, this.ty, this.tz);
      }
    }
  }

  dispose() {
    scene.remove(this.group);
    scene.remove(this.line);
    this.group.traverse(o => { if (o.material) o.material.dispose?.(); if (o.geometry) o.geometry.dispose?.(); });
    this.lineGeo.dispose();
    this.lineMat.dispose();
    this.bubbleTex.dispose();
    this.bubbleMat.dispose();
  }
}

const flashes = [];
function scheduleFlash(x, z) {
  flashes.push({ x, z, t: 0 });
  const i = topVoxelIndex(x, z);
  if (i < 0) return;
  instanced.setColorAt(i, COL.flash);
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
}

const colonists = [];

function findSpawn() {
  const cx = Math.floor(GRID / 2), cz = Math.floor(GRID / 2);
  for (let r = 0; r < 12; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, z = cz + dz;
        if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
        const top = cellTop[z * GRID + x];
        if (top >= 2 && top <= 4 && cellBiome[z * GRID + x] !== 'sand') {
          return { x, z };
        }
      }
    }
  }
  return { x: cx, z: cz };
}

function spawnColonist(x, z) {
  const id = colonists.length;
  const c = new Colonist(id, x, z);
  colonists.push(c);
  return c;
}

function clearColonists() {
  for (const c of colonists) c.dispose();
  colonists.length = 0;
}

// ============================================================================
// Scene par defaut : hameau + arbres + colons
// ============================================================================
let spawn;
function populateDefaultScene() {
  spawn = findSpawn();

  // 3 maisons formant hameau
  const houseOffsets = [[0, 0], [2, 1], [-2, 1]];
  for (const [ox, oz] of houseOffsets) {
    const x = Math.max(0, Math.min(GRID - 1, spawn.x + ox));
    const z = Math.max(0, Math.min(GRID - 1, spawn.z + oz));
    if (!isCellOccupied(x, z)) addHouse(x, z);
  }

  // 10 a 15 arbres dans les zones forestieres
  let placed = 0;
  const targetTrees = 12;
  for (let tries = 0; tries < 800 && placed < targetTrees; tries++) {
    const x = Math.floor(rng() * GRID);
    const z = Math.floor(rng() * GRID);
    if (cellBiome[z * GRID + x] !== 'forest') continue;
    if (isCellOccupied(x, z)) continue;
    addTree(x, z);
    placed++;
  }

  // 5 colons autour du hameau
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    let cx = spawn.x + Math.round(Math.cos(ang) * 1.5);
    let cz = spawn.z + Math.round(Math.sin(ang) * 1.5);
    cx = Math.max(0, Math.min(GRID - 1, cx));
    cz = Math.max(0, Math.min(GRID - 1, cz));
    spawnColonist(cx, cz);
  }
}

function resetWorld() {
  // reset des jobs et markers
  for (const [, m] of markers) markerGroup.remove(m);
  markers.clear();
  jobs.clear();
  flashes.length = 0;
  // reset placements et colons
  clearAllPlacements();
  clearColonists();
  // reinit seeds pour reproductibilite legere (nouveau seed a chaque reset)
  const newSeed = Math.floor(Math.random() * 0xffffff);
  seedRand = mulberry32(newSeed);
  rng = mulberry32(newSeed + 1);
  rebuildPerm();
  buildTerrain();
  populateDefaultScene();
  lastJobTime = performance.now() / 1000;
  refreshHUD();
}

// ============================================================================
// Post process
// ============================================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.85, 0.92);
composer.addPass(bloom);
const vignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.55 }, uSoftness: { value: 0.65 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// UI : outils, pinceau, raccourcis
// ============================================================================
const toolState = {
  tool: 'nav',
  brush: 3,
  oreType: ORE_KEYS[0],
  isPainting: false,
  paintedThisStroke: new Set()
};

const toolBtns = document.querySelectorAll('.tool');
const brushBtns = document.querySelectorAll('.brush');
const hudToolEl = document.getElementById('hud-tool');
const oreSubEl = document.getElementById('ore-sub');

function labelOfTool(t) {
  if (t === 'ore') return 'filon (' + ORE_TYPES[toolState.oreType].label + ')';
  return ({
    nav: 'naviguer',
    mine: 'designer miner',
    cancel: 'annuler job',
    tree: 'arbre',
    forest: 'foret',
    rock: 'rocher',
    house: 'maison',
    field: 'champ',
    erase: 'effacer'
  })[t] || t;
}

function setTool(t) {
  if (t === 'ore' && toolState.tool === 'ore') {
    const i = ORE_KEYS.indexOf(toolState.oreType);
    toolState.oreType = ORE_KEYS[(i + 1) % ORE_KEYS.length];
  }
  toolState.tool = t;
  toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  hudToolEl.textContent = labelOfTool(t);
  oreSubEl.textContent = ORE_TYPES[toolState.oreType].label;
  const btnOre = document.querySelector('.tool[data-tool="ore"]');
  if (btnOre) btnOre.style.borderLeft = '4px solid #' + ORE_TYPES[toolState.oreType].rock.getHexString();
  controls.mouseButtons.LEFT = (t === 'nav') ? THREE.MOUSE.ROTATE : null;
}
function setBrush(b) {
  toolState.brush = b;
  brushBtns.forEach(x => x.classList.toggle('active', parseInt(x.dataset.brush, 10) === b));
}
toolBtns.forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
brushBtns.forEach(b => b.addEventListener('click', () => setBrush(parseInt(b.dataset.brush, 10))));

document.getElementById('btn-addcolon').addEventListener('click', addColonNearSpawn);
document.getElementById('btn-reset').addEventListener('click', resetWorld);

function addColonNearSpawn() {
  if (!spawn) return;
  // trouver une tile libre a proximite
  for (let r = 1; r < 8; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = spawn.x + dx, z = spawn.z + dz;
        if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
        const top = cellTop[z * GRID + x];
        if (top <= WATER_LEVEL) continue;
        let occ = false;
        for (const c of colonists) if (c.x === x && c.z === z) { occ = true; break; }
        if (occ) continue;
        spawnColonist(x, z);
        return;
      }
    }
  }
}

window.addEventListener('keydown', (e) => {
  const map = {
    '1': 'nav', '2': 'mine', '3': 'cancel',
    '4': 'tree', '5': 'forest', '6': 'rock',
    '7': 'ore', '8': 'house', '9': 'field'
  };
  if (map[e.key]) setTool(map[e.key]);
  if (e.key === 'r' || e.key === 'R') resetWorld();
  if (e.key === 'c' || e.key === 'C') addColonNearSpawn();
});

window.addEventListener('wheel', (e) => {
  if (toolState.tool === 'ore' && e.shiftKey) {
    e.preventDefault();
    const i = ORE_KEYS.indexOf(toolState.oreType);
    const dir = e.deltaY > 0 ? 1 : -1;
    toolState.oreType = ORE_KEYS[(i + dir + ORE_KEYS.length) % ORE_KEYS.length];
    hudToolEl.textContent = labelOfTool('ore');
    oreSubEl.textContent = ORE_TYPES[toolState.oreType].label;
    const btnOre = document.querySelector('.tool[data-tool="ore"]');
    if (btnOre) btnOre.style.borderLeft = '4px solid #' + ORE_TYPES[toolState.oreType].rock.getHexString();
  }
}, { passive: false });

// ============================================================================
// Raycasting et peinture
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

function pickCell(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObject(instanced, false);
  if (!hits.length) return null;
  const hit = hits[0];
  const p = hit.point.clone();
  if (hit.face) {
    const n = hit.face.normal;
    p.x -= n.x * 0.01;
    p.z -= n.z * 0.01;
  }
  const x = Math.floor(p.x);
  const z = Math.floor(p.z);
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return null;
  return { x, z };
}

function cellsInBrush(cx, cz, radius) {
  if (radius === 1) return [{ x: cx, z: cz }];
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

function applyToolAtCell(cell) {
  const key = cell.z * GRID + cell.x;
  const t = toolState.tool;

  if (t === 'mine') {
    const cells = cellsInBrush(cell.x, cell.z, toolState.brush);
    for (const c of cells) addJob(c.x, c.z);
    return;
  }
  if (t === 'cancel') {
    const cells = cellsInBrush(cell.x, cell.z, toolState.brush);
    removeAllJobsIn(cells);
    return;
  }

  if (toolState.paintedThisStroke.has(key)) return;
  toolState.paintedThisStroke.add(key);

  switch (t) {
    case 'tree':
      if (!isCellOccupied(cell.x, cell.z)) addTree(cell.x, cell.z);
      break;
    case 'forest': {
      const cells = cellsInBrush(cell.x, cell.z, toolState.brush);
      for (const c of cells) {
        const k = c.z * GRID + c.x;
        if (toolState.paintedThisStroke.has('f' + k)) continue;
        toolState.paintedThisStroke.add('f' + k);
        if (rng() < 0.6 && !isCellOccupied(c.x, c.z)) addTree(c.x, c.z);
      }
      break;
    }
    case 'rock':
      if (!isCellOccupied(cell.x, cell.z)) addRock(cell.x, cell.z);
      break;
    case 'ore': {
      const cells = cellsInBrush(cell.x, cell.z, toolState.brush);
      for (const c of cells) {
        const k = c.z * GRID + c.x;
        if (toolState.paintedThisStroke.has('o' + k)) continue;
        toolState.paintedThisStroke.add('o' + k);
        if (isCellOccupied(c.x, c.z)) continue;
        if (rng() < 0.7) addOre(c.x, c.z, toolState.oreType);
      }
      break;
    }
    case 'house':
      if (!isCellOccupied(cell.x, cell.z)) addHouse(cell.x, cell.z);
      break;
    case 'field': {
      const cells = cellsInBrush(cell.x, cell.z, toolState.brush);
      for (const c of cells) {
        const k = c.z * GRID + c.x;
        if (toolState.paintedThisStroke.has('h' + k)) continue;
        toolState.paintedThisStroke.add('h' + k);
        cellSurface[k] = 'field';
        repaintCellSurface(c.x, c.z);
      }
      break;
    }
    case 'erase': {
      const cells = cellsInBrush(cell.x, cell.z, toolState.brush);
      removeTreesIn(cells);
      removeRocksIn(cells);
      removeHousesIn(cells);
      removeOresIn(cells);
      removeAllJobsIn(cells);
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

const dom = renderer.domElement;
dom.addEventListener('contextmenu', (e) => e.preventDefault());

dom.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (toolState.tool === 'nav') return;
  toolState.isPainting = true;
  toolState.paintedThisStroke = new Set();
  const cell = pickCell(e.clientX, e.clientY);
  if (cell) applyToolAtCell(cell);
});
dom.addEventListener('pointermove', (e) => {
  if (!toolState.isPainting) return;
  if (toolState.tool === 'nav') return;
  // outils unitaires : un seul clic
  if (toolState.tool === 'tree' || toolState.tool === 'rock' || toolState.tool === 'house') return;
  const cell = pickCell(e.clientX, e.clientY);
  if (cell) applyToolAtCell(cell);
});
window.addEventListener('pointerup', () => { toolState.isPainting = false; });

// ============================================================================
// HUD
// ============================================================================
const fpsEl = document.getElementById('fps');
const jobsEl = document.getElementById('jobs');
const idleEl = document.getElementById('idle');
const movingEl = document.getElementById('moving');
const workingEl = document.getElementById('working');
const talkingEl = document.getElementById('talking');
const cTreesEl = document.getElementById('c-trees');
const cRocksEl = document.getElementById('c-rocks');
const cHousesEl = document.getElementById('c-houses');
const cFieldsEl = document.getElementById('c-fields');
const cOresEl = document.getElementById('c-ores');
const cOresDetailEl = document.getElementById('c-ores-detail');

function refreshHUD() {
  cTreesEl.textContent = trees.length;
  cRocksEl.textContent = rocks.length;
  cHousesEl.textContent = houses.length;
  let f = 0;
  for (let i = 0; i < cellSurface.length; i++) if (cellSurface[i] === 'field') f++;
  cFieldsEl.textContent = f;
  cOresEl.textContent = ores.length;
  const counts = {};
  for (const k of ORE_KEYS) counts[k] = 0;
  for (const o of ores) counts[o.type]++;
  cOresDetailEl.textContent = ORE_KEYS.map(k => ORE_TYPES[k].label + ' ' + counts[k]).join(', ');
}

let fpsFrames = 0, fpsLast = performance.now();
function updateDynHUD() {
  let nIdle = 0, nMov = 0, nWork = 0, nTalk = 0;
  for (const c of colonists) {
    if (c.state === 'IDLE') nIdle++;
    else if (c.state === 'MOVING') nMov++;
    else if (c.state === 'WORKING') nWork++;
    if (c.speechTimer > 0) nTalk++;
  }
  jobsEl.textContent = jobs.size;
  idleEl.textContent = nIdle;
  movingEl.textContent = nMov;
  workingEl.textContent = nWork;
  talkingEl.textContent = nTalk;
}

// ============================================================================
// Boucle principale
// ============================================================================
buildTerrain();
populateDefaultScene();
setTool('nav');
setBrush(3);
refreshHUD();

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(0.1, clock.getDelta());
  const t = clock.elapsedTime;
  waterMat.uniforms.uTime.value = t;

  for (const [, m] of markers) m.lookAt(camera.position);

  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.t += dt;
    const idxV = topVoxelIndex(f.x, f.z);
    if (idxV < 0) { flashes.splice(i, 1); continue; }
    if (f.t >= 0.3) {
      instanced.setColorAt(idxV, origColor[idxV]);
      flashes.splice(i, 1);
    } else {
      const k = 1 - (f.t / 0.3);
      tmpColor.copy(origColor[idxV]).lerp(COL.flash, k);
      instanced.setColorAt(idxV, tmpColor);
    }
  }
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

  for (const c of colonists) c.update(dt);

  controls.update();
  composer.render();
  updateDynHUD();

  fpsFrames++;
  const now = performance.now();
  if (now - fpsLast >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - fpsLast));
    fpsEl.textContent = fps;
    fpsFrames = 0; fpsLast = now;
  }

  requestAnimationFrame(tick);
}
loader.classList.add('hidden');
tick();
