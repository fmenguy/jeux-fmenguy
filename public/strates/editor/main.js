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
const WATER_LEVEL = 1.0;
const SHALLOW_WATER_LEVEL = 1.6;
const EDGE_DEEP_RING = 3;
const EDGE_SHALLOW_RING = 2;
const FALLOFF_SPAN = 6;
const VOXEL = 1;
const COLONIST_SPEED = 2.0;
const WORK_DURATION = 2.0;
const MAX_STEP = 2;
const GRAVITY = 20;
const MAX_TREES = 4000;
const MAX_ROCKS = 2000;
const MAX_ORES = 2000;
const MAX_CRYSTALS = MAX_ORES * 4;
const MAX_BUSHES = 2000;
const MAX_BUSH_LEAVES = MAX_BUSHES * 5;
const MAX_BUSH_BERRIES = MAX_BUSHES * 4;
const BERRIES_PER_BUSH = 3;
const HARVEST_DURATION = 1.5;
const HARVEST_RADIUS = 8;
const BERRY_REGEN_INTERVAL = 20;

// ============================================================================
// Identite des colons (noms, genre, relations a venir)
// ============================================================================
const MALE_NAMES = [
  'Antoine', 'Anthonin', 'Belkacem', 'Frédéric', 'Vincent', 'Eric',
  'Christophe', 'Alexandru', 'Gerard', 'Guillaume', 'Emeric', 'Mickaël',
  'Paul', 'Jeremy', 'Joé', 'William', 'Lucas', 'Valentin', 'Nicolas',
  'Alexis', 'François'
];
const FEMALE_NAMES = [
  'Alexie', 'Nina', 'Catherine', 'Audrey', 'Emma', 'Alyssa', 'Hortense',
  'Margaux', 'Sophie', 'Claire', 'Julie', 'Amélie', 'Marion', 'Céline',
  'Pauline', 'Chloé', 'Manon', 'Lucie', 'Léa', 'Sarah', 'Lou'
];
const GENDER_COLORS = { M: '#4a7fc0', F: '#d06b8e' };
const GENDER_SYMBOLS = { M: '\u2642', F: '\u2640' };
const CHIEF_NAME = 'François';
const CHIEF_STAR = '\u2605';
const CHIEF_COLOR = '#f2c94c';

function pickUniqueName(gender, usedSet) {
  const pool = gender === 'M' ? MALE_NAMES : FEMALE_NAMES;
  const free = pool.filter(n => !usedSet.has(n));
  if (free.length > 0) {
    const n = free[Math.floor(Math.random() * free.length)];
    usedSet.add(n);
    return n;
  }
  // pool epuise, on concatene un suffixe romain
  const romans = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  for (const suf of romans) {
    for (const base of pool) {
      const candidate = base + ' ' + suf;
      if (!usedSet.has(candidate)) { usedSet.add(candidate); return candidate; }
    }
  }
  const fallback = pool[0] + ' #' + usedSet.size;
  usedSet.add(fallback);
  return fallback;
}

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
// Stocks de ressources (pierre, terre, minerais)
// ============================================================================
const STOCK_KEYS = ['stone', 'dirt', 'copper', 'silver', 'iron', 'coal', 'gold', 'amethyst'];
const STOCK_LABELS = {
  stone: 'pierre', dirt: 'terre',
  copper: 'cuivre', silver: 'argent', iron: 'fer',
  coal: 'charbon', gold: 'or', amethyst: 'amethyste'
};
const stocks = {};
for (const k of STOCK_KEYS) stocks[k] = 0;

// mapping type de filon -> cle de stock
const ORE_TO_STOCK = {
  'ore-gold': 'gold',
  'ore-copper': 'copper',
  'ore-silver': 'silver',
  'ore-iron': 'iron',
  'ore-coal': 'coal',
  'ore-amethyst': 'amethyst'
};

function incrStockForBiome(biome) {
  if (biome === 'rock' || biome === 'snow') stocks.stone++;
  else if (biome === 'grass' || biome === 'forest' || biome === 'sand') stocks.dirt++;
}

function totalBuildStock() {
  return stocks.stone + stocks.dirt;
}

function consumeBuildStock() {
  // consomme la ressource la plus abondante entre pierre et terre
  if (stocks.stone === 0 && stocks.dirt === 0) return false;
  if (stocks.stone >= stocks.dirt) stocks.stone--;
  else stocks.dirt--;
  return true;
}

// ============================================================================
// Recherche et arbre technologique
// ============================================================================
let researchPoints = 0;
const RESEARCH_TICK = 3.0; // secondes entre deux points par chercheur

const techs = {
  'pick-stone':    { name: 'Pioche en pierre',  cost: 5,  req: null,           unlocked: false },
  'pick-bronze':   { name: 'Pioche en bronze',  cost: 15, req: 'pick-stone',   unlocked: false },
  'pick-iron':     { name: 'Pioche en fer',     cost: 30, req: 'pick-bronze',  unlocked: false },
  'pick-gold':     { name: 'Pioche en or',      cost: 60, req: 'pick-iron',    unlocked: false }
};

// mapping type de filon -> tech requise
const ORE_TECH = {
  'ore-copper': 'pick-bronze',
  'ore-coal': 'pick-bronze',
  'ore-iron': 'pick-iron',
  'ore-silver': 'pick-iron',
  'ore-gold': 'pick-gold',
  'ore-amethyst': 'pick-gold'
};

function techUnlocked(id) { return !!(techs[id] && techs[id].unlocked); }

// determine si une tile est minable compte tenu des techs debloquees
// renvoie { ok: bool, reason: string|null, requiredTech: string|null }
function canMineCell(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return { ok: false, reason: 'hors-carte', requiredTech: null };
  const biome = cellBiome[z * GRID + x];
  // filons : bloques (et necessitent la tech liee une fois l'extraction active)
  const oreType = cellOre ? cellOre[z * GRID + x] : null;
  if (oreType) {
    const req = ORE_TECH[oreType];
    if (req && !techUnlocked(req)) return { ok: false, reason: 'tech', requiredTech: req };
  }
  if (biome === 'rock' || biome === 'snow') {
    if (!techUnlocked('pick-stone')) return { ok: false, reason: 'tech', requiredTech: 'pick-stone' };
  }
  return { ok: true, reason: null, requiredTech: null };
}

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

function smoothstep01(a, b, v) {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

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

      // Ile, distance au bord en tiles
      const edgeDist = Math.min(x, z, GRID - 1 - x, GRID - 1 - z);
      if (edgeDist < EDGE_DEEP_RING) {
        // couronne exterieure, eau profonde, hauteur forcee a 0
        elev = 0;
      } else if (edgeDist < EDGE_DEEP_RING + EDGE_SHALLOW_RING) {
        // couronne interieure, eau peu profonde, hauteur dans la tranche shallow
        const t = (edgeDist - EDGE_DEEP_RING) / EDGE_SHALLOW_RING;
        elev = WATER_LEVEL + 0.1 + t * (SHALLOW_WATER_LEVEL - WATER_LEVEL - 0.2);
      } else {
        // interieur, falloff progressif sur FALLOFF_SPAN tiles
        const falloff = smoothstep01(0, FALLOFF_SPAN, edgeDist - (EDGE_DEEP_RING + EDGE_SHALLOW_RING));
        // interpole entre une valeur sous-l'eau peu profonde et le relief plein
        elev = SHALLOW_WATER_LEVEL * (1 - falloff) + elev * falloff;
      }

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
  if (topY <= SHALLOW_WATER_LEVEL + 0.4) return 'sand';
  if (b > 0.12) return 'forest';
  return 'grass';
}

// ---------- helpers eau ----------
function isDeepWater(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return true;
  return cellTop[z * GRID + x] < WATER_LEVEL;
}
function isShallowWater(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return false;
  const t = cellTop[z * GRID + x];
  return t >= WATER_LEVEL && t <= SHALLOW_WATER_LEVEL;
}
function isAnyWater(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return true;
  return cellTop[z * GRID + x] <= SHALLOW_WATER_LEVEL;
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
      // le bord le plus exterieur peut descendre en dessous de MIN_STRATES pour passer sous l'eau profonde
      const edgeDist = Math.min(x, z, GRID - 1 - x, GRID - 1 - z);
      const minAllowed = (edgeDist < EDGE_DEEP_RING) ? 0 : MIN_STRATES;
      const top = Math.min(MAX_STRATES, Math.max(minAllowed, Math.round(e)));
      cellTop[z * GRID + x] = top;
      cellBiome[z * GRID + x] = biomeFor(x, z, top);
      voxelCount += top;
    }
  }

  if (instanced) {
    scene.remove(instanced);
    instanced.dispose();
  }
  // capacite totale = terrain initial + slack pour les voxels poses via l'outil Placer
  // (1 slot par colonne suffit largement en pratique, on prevoit GRID*GRID)
  const capacity = voxelCount + GRID * GRID;
  instanced = new THREE.InstancedMesh(boxGeo, baseMat, capacity);
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  origColor = new Array(capacity);

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
  // slots libres (scale 0) au-dessus, pour l'outil Placer
  for (let i = idx; i < capacity; i++) {
    instanced.setMatrixAt(i, HIDDEN_MATRIX);
    tmpColor.setRGB(1, 1, 1);
    instanced.setColorAt(i, tmpColor);
    origColor[i] = tmpColor.clone();
  }
  nextFreeVoxelIdx = idx;
  instanced.count = capacity;
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  scene.add(instanced);
}

// index du prochain slot libre dans instanced (pour voxels poses)
let nextFreeVoxelIdx = 0;

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
    uShallow: { value: new THREE.Color('#2a5a85') },
    uDeep: { value: new THREE.Color('#1a3a5e') }
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

// Eau peu profonde, plan plus haut, turquoise clair, transparence plus forte.
// Ne cache pas completement les voxels sable, donne effet de lagon / plage mouillee.
const shallowGeo = new THREE.PlaneGeometry(GRID * 1.6, GRID * 1.6, 48, 48);
shallowGeo.rotateX(-Math.PI / 2);
const shallowMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#5ba8c4') }
  },
  vertexShader: `
    uniform float uTime;
    varying float vWave;
    void main() {
      vec3 p = position;
      float w = sin(p.x * 0.45 + uTime * 1.1) * 0.03 + sin(p.z * 0.38 + uTime * 0.9) * 0.025;
      p.y += w;
      vWave = w;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform vec3 uColor;
    varying float vWave;
    void main() {
      vec3 col = uColor + vec3(vWave * 1.8);
      gl_FragColor = vec4(col, 0.55);
    }
  `
});
const shallowWater = new THREE.Mesh(shallowGeo, shallowMat);
shallowWater.position.set(GRID / 2, SHALLOW_WATER_LEVEL, GRID / 2);
scene.add(shallowWater);

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
  if (top <= SHALLOW_WATER_LEVEL) return;
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
  if (top <= SHALLOW_WATER_LEVEL) return;
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
  if (top <= SHALLOW_WATER_LEVEL) return;
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

// Buissons de baies
const bushLeafGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
const bushLeafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
const bushLeafMesh = new THREE.InstancedMesh(bushLeafGeo, bushLeafMat, MAX_BUSH_LEAVES);
bushLeafMesh.castShadow = true;
bushLeafMesh.receiveShadow = true;
bushLeafMesh.count = 0;
bushLeafMesh.frustumCulled = false;
bushLeafMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BUSH_LEAVES * 3), 3);
scene.add(bushLeafMesh);

const bushBerryGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const bushBerryMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, flatShading: true });
const bushBerryMesh = new THREE.InstancedMesh(bushBerryGeo, bushBerryMat, MAX_BUSH_BERRIES);
bushBerryMesh.castShadow = true;
bushBerryMesh.count = 0;
bushBerryMesh.frustumCulled = false;
bushBerryMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BUSH_BERRIES * 3), 3);
scene.add(bushBerryMesh);

const bushes = [];
const BERRY_HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

function addBush(gx, gz) {
  if (bushes.length >= MAX_BUSHES) return false;
  const top = cellTop[gz * GRID + gx];
  if (top <= SHALLOW_WATER_LEVEL) return false;
  if (isCellOccupied(gx, gz)) return false;

  const leafIndices = [];
  const berryIndices = [];
  const baseY = top;
  const nLeaves = 3 + Math.floor(rng() * 3);
  const leafBase = new THREE.Color('#3d6b2d');
  for (let k = 0; k < nLeaves; k++) {
    const li = bushLeafMesh.count;
    if (li >= MAX_BUSH_LEAVES) break;
    const lx = gx + 0.5 + (rng() - 0.5) * 0.35;
    const lz = gz + 0.5 + (rng() - 0.5) * 0.35;
    const ly = baseY + 0.12 + rng() * 0.35;
    tmpObj.position.set(lx, ly, lz);
    tmpObj.rotation.set(0, rng() * Math.PI * 2, 0);
    const ls = 0.8 + rng() * 0.5;
    tmpObj.scale.set(ls, ls, ls);
    tmpObj.updateMatrix();
    bushLeafMesh.setMatrixAt(li, tmpObj.matrix);
    tmpColor.copy(leafBase).offsetHSL((rng() - 0.5) * 0.02, 0, (rng() - 0.5) * 0.08);
    bushLeafMesh.setColorAt(li, tmpColor);
    bushLeafMesh.count = li + 1;
    leafIndices.push(li);
  }
  const berryBase = new THREE.Color('#6b2d8c');
  const nBerries = 2 + Math.floor(rng() * 3);
  const berryPositions = [];
  for (let k = 0; k < nBerries; k++) {
    const bi = bushBerryMesh.count;
    if (bi >= MAX_BUSH_BERRIES) break;
    const bx = gx + 0.5 + (rng() - 0.5) * 0.3;
    const bz = gz + 0.5 + (rng() - 0.5) * 0.3;
    const by = baseY + 0.25 + rng() * 0.3;
    tmpObj.position.set(bx, by, bz);
    tmpObj.rotation.set(0, 0, 0);
    tmpObj.scale.set(1, 1, 1);
    tmpObj.updateMatrix();
    bushBerryMesh.setMatrixAt(bi, tmpObj.matrix);
    tmpColor.copy(berryBase).offsetHSL((rng() - 0.5) * 0.04, (rng() - 0.5) * 0.15, (rng() - 0.5) * 0.06);
    bushBerryMesh.setColorAt(bi, tmpColor);
    bushBerryMesh.count = bi + 1;
    berryIndices.push(bi);
    berryPositions.push(tmpObj.matrix.clone());
  }
  bushLeafMesh.instanceMatrix.needsUpdate = true;
  if (bushLeafMesh.instanceColor) bushLeafMesh.instanceColor.needsUpdate = true;
  bushBerryMesh.instanceMatrix.needsUpdate = true;
  if (bushBerryMesh.instanceColor) bushBerryMesh.instanceColor.needsUpdate = true;

  const bush = {
    x: gx, z: gz,
    berries: BERRIES_PER_BUSH,
    maxBerries: BERRIES_PER_BUSH,
    leafIndices,
    berryIndices,
    berryMatrices: berryPositions,
    claimedBy: null,
    regenTimer: 0
  };
  bushes.push(bush);
  return true;
}

function refreshBushBerries(bush) {
  const visible = Math.min(bush.berries, bush.berryIndices.length);
  for (let k = 0; k < bush.berryIndices.length; k++) {
    const bi = bush.berryIndices[k];
    if (k < visible) {
      bushBerryMesh.setMatrixAt(bi, bush.berryMatrices[k]);
    } else {
      bushBerryMesh.setMatrixAt(bi, BERRY_HIDDEN);
    }
  }
  bushBerryMesh.instanceMatrix.needsUpdate = true;
}

function removeBushesIn(cells) {
  if (!bushes.length) return;
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x));
  const kept = bushes.filter(b => !cellSet.has(b.z * GRID + b.x));
  if (kept.length === bushes.length) return;
  const kp = kept.map(b => ({ x: b.x, z: b.z }));
  bushes.length = 0;
  bushLeafMesh.count = 0;
  bushBerryMesh.count = 0;
  for (const b of kp) addBush(b.x, b.z);
}

function findNearestBush(cx, cz, maxDist) {
  let best = null, bestD = Infinity;
  for (const b of bushes) {
    if (b.berries <= 0) continue;
    if (b.claimedBy) continue;
    const d = Math.abs(b.x - cx) + Math.abs(b.z - cz);
    if (d > maxDist) continue;
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
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
  if (top <= SHALLOW_WATER_LEVEL) return false;
  const g = makeHouse();
  g.position.set(gx + 0.5, top, gz + 0.5);
  scene.add(g);
  houses.push({ x: gx, z: gz, group: g });
  return true;
}

function spawnColonsAroundHouse(hx, hz, count) {
  const spawned = [];
  const tried = new Set();
  for (let r = 1; r <= 2 && spawned.length < count; r++) {
    for (let dz = -r; dz <= r && spawned.length < count; dz++) {
      for (let dx = -r; dx <= r && spawned.length < count; dx++) {
        if (dx === 0 && dz === 0) continue;
        const x = hx + dx, z = hz + dz;
        if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
        const k = z * GRID + x;
        if (tried.has(k)) continue;
        tried.add(k);
        const top = cellTop[k];
        if (top <= SHALLOW_WATER_LEVEL) continue;
        if (isCellOccupied(x, z)) continue;
        let occ = false;
        for (const c of colonists) if (c.x === x && c.z === z) { occ = true; break; }
        if (occ) continue;
        spawnColonist(x, z);
        spawned.push({ x, z });
      }
    }
  }
  // fallback, si aucune tile adjacente valide, poser sur la maison avec decalage
  while (spawned.length < count) {
    const fx = Math.max(0, Math.min(GRID - 1, hx + spawned.length));
    const fz = Math.max(0, Math.min(GRID - 1, hz));
    spawnColonist(fx, fz);
    spawned.push({ x: fx, z: fz });
  }
  return spawned;
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

// ----------------------------------------------------------------------------
// Batiments de recherche (maison a toit bleu). Visuel clone de makeHouse avec
// palette de toit bleue (#3c7fb8 et variantes). Pose unitaire, aucun spawn de
// colon, un colon IDLE est attribue automatiquement comme chercheur.
// ----------------------------------------------------------------------------
const researchHouses = [];

function makeResearchHouse() {
  const g = new THREE.Group();
  const wallColors = [0xf2e6c9, 0xe6d2a8, 0xd9c79d];
  const roofColors = [0x3c7fb8, 0x3572a3, 0x4a8cc4];
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

let researchBuildingNextId = 1;
function addResearchHouse(gx, gz) {
  const top = cellTop[gz * GRID + gx];
  if (top <= SHALLOW_WATER_LEVEL) return null;
  const g = makeResearchHouse();
  g.position.set(gx + 0.5, top, gz + 0.5);
  scene.add(g);
  const entry = { id: researchBuildingNextId++, x: gx, z: gz, group: g, assignedColonistId: null };
  researchHouses.push(entry);
  return entry;
}

function isResearchHouseOn(x, z) {
  for (const h of researchHouses) if (h.x === x && h.z === z) return true;
  return false;
}

function findResearchBuildingById(id) {
  for (const h of researchHouses) if (h.id === id) return h;
  return null;
}

function assignResearcherToBuilding(building) {
  if (!building || building.assignedColonistId != null) return false;
  let best = null, bestD = Infinity;
  for (const c of colonists) {
    if (c.researchBuildingId != null) continue;
    if (c.state !== 'IDLE') continue;
    const d = Math.abs(c.x - building.x) + Math.abs(c.z - building.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return false;
  // test qu'il existe un chemin d'approche
  const approach = findApproach(best.x, best.z, building.x, building.z);
  if (!approach) return false;
  building.assignedColonistId = best.id;
  best.researchBuildingId = building.id;
  best.path = approach.path;
  best.pathStep = 0;
  best.state = 'MOVING';
  best.isWandering = false;
  best.targetJob = null;
  best.targetBush = null;
  best.updateTrail();
  return true;
}

function removeResearchHousesIn(cells) {
  if (!researchHouses.length) return;
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x));
  for (let i = researchHouses.length - 1; i >= 0; i--) {
    const r = researchHouses[i];
    if (cellSet.has(r.z * GRID + r.x)) {
      // liberer les colons assignes
      for (const c of colonists) {
        if (c.researchBuildingId === r.id) {
          c.researchBuildingId = null;
          if (c.state === 'RESEARCHING' || c.state === 'MOVING') {
            c.state = 'IDLE';
            c.path = null;
            if (c.lineGeo) c.lineGeo.setFromPoints([]);
          }
        }
      }
      scene.remove(r.group);
      r.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
      researchHouses.splice(i, 1);
    }
  }
}

function clearAllResearchHouses() {
  for (const r of researchHouses) {
    scene.remove(r.group);
    r.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
  }
  researchHouses.length = 0;
}

function countActiveResearchers() {
  let n = 0;
  for (const c of colonists) if (c.researchBuildingId != null && c.state === 'RESEARCHING') n++;
  return n;
}

function clearAllPlacements() {
  trees.length = 0; trunkMesh.count = 0; leafMesh.count = 0;
  rocks.length = 0; rockMesh.count = 0;
  ores.length = 0; oreRockMesh.count = 0; crystalMesh.count = 0;
  bushes.length = 0; bushLeafMesh.count = 0; bushBerryMesh.count = 0;
  for (let i = 0; i < cellOre.length; i++) cellOre[i] = null;
  for (const h of houses) {
    scene.remove(h.group);
    h.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
  }
  houses.length = 0;
  clearAllResearchHouses();
}

function isCellOccupied(x, z) {
  for (const t of trees) if (t.x === x && t.z === z) return true;
  for (const r of rocks) if (r.x === x && r.z === z) return true;
  for (const h of houses) if (h.x === x && h.z === z) return true;
  for (const h of researchHouses) if (h.x === x && h.z === z) return true;
  for (const b of bushes) if (b.x === x && b.z === z) return true;
  if (cellOre[z * GRID + x]) return true;
  return false;
}

// ============================================================================
// Ressources et quetes
// ============================================================================
const resources = { berries: 0, wood: 0, stone: 0 };
const gameStats = {
  housesPlaced: 0,
  minesCompleted: 0,
  totalBerriesHarvested: 0
};

const QUEST_DEFS = [
  {
    id: 'q-berries-5',
    title: 'Récolter 5 baies',
    target: 5,
    color: '#8c5cc4',
    check: () => resources.berries
  },
  {
    id: 'q-mine-10',
    title: 'Miner 10 blocs de pierre',
    target: 10,
    color: '#a8a196',
    check: () => gameStats.minesCompleted
  },
  {
    id: 'q-house-2',
    title: 'Poser une deuxième maison',
    target: 2,
    color: '#c97a4a',
    check: () => gameStats.housesPlaced
  },
  {
    id: 'q-colons-8',
    title: 'Avoir 8 colons en vie',
    target: 8,
    color: '#ffb070',
    check: () => colonists.length
  },
  {
    id: 'q-berries-20',
    title: 'Récolter 20 baies au total',
    target: 20,
    color: '#6b2d8c',
    check: () => gameStats.totalBerriesHarvested
  }
];
let questIndex = 0;
let currentQuest = null;
let questCompletedAt = -1;

function startNextQuest() {
  if (questIndex >= QUEST_DEFS.length) {
    currentQuest = null;
    return;
  }
  const def = QUEST_DEFS[questIndex];
  currentQuest = { ...def, progress: 0, completed: false };
  questCompletedAt = -1;
}

function updateQuests(nowSec) {
  if (!currentQuest) return;
  if (!currentQuest.completed) {
    const p = Math.min(currentQuest.target, currentQuest.check());
    currentQuest.progress = p;
    if (p >= currentQuest.target) {
      currentQuest.completed = true;
      questCompletedAt = nowSec;
    }
  } else if (nowSec - questCompletedAt >= 3) {
    questIndex++;
    startNextQuest();
  }
}

const questsBodyEl = () => document.getElementById('quests-body');
let lastQuestSig = '';
function renderQuests() {
  const el = questsBodyEl();
  if (!el) return;
  let sig;
  if (!currentQuest) {
    sig = 'done';
    if (sig === lastQuestSig) return;
    lastQuestSig = sig;
    el.innerHTML = '<div class="qdone-msg">Toutes les quêtes du proto sont complétées</div>';
    return;
  }
  sig = currentQuest.id + ':' + currentQuest.progress + ':' + (currentQuest.completed ? 'y' : 'n');
  if (sig === lastQuestSig) return;
  lastQuestSig = sig;
  const pct = Math.min(100, Math.round((currentQuest.progress / currentQuest.target) * 100));
  el.innerHTML =
    '<div class="quest' + (currentQuest.completed ? ' done' : '') + '">' +
      '<div class="qtitle"><span class="qdot" style="background:' + currentQuest.color + '"></span>' + currentQuest.title + '</div>' +
      '<div class="qbar"><div class="qfill" style="width:' + pct + '%"></div></div>' +
      '<div class="qprog">' + currentQuest.progress + ' / ' + currentQuest.target + '</div>' +
    '</div>';
}

startNextQuest();

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
  if (top <= SHALLOW_WATER_LEVEL + 0.5) return;
  const gate = canMineCell(x, z);
  if (!gate.ok) {
    if (gate.reason === 'tech') lastBlockedMineTech = { tech: gate.requiredTech, x, z, t: performance.now() / 1000 };
    return;
  }
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
  for (const c of cells) removeBuildJob(c.x, c.z);
}

// -----------------------------------------------------------------------------
// Jobs de placement (build). Marker vert clair semi-transparent sur la tile.
// Le stock necessaire (pierre ou terre) est verifie au moment de l'assignation
// au colon. Si stock a 0 : le job reste en attente (rien n'affiche d'icone
// jaune pour l'instant, le marker vert suffit visuellement).
// -----------------------------------------------------------------------------
const buildJobs = new Map();
const buildMarkerGeo = new THREE.PlaneGeometry(0.6, 0.6);
const buildMarkerMat = new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.85, depthWrite: false });
const buildMarkers = new Map();

// tinte top voxel en vert clair pour signaler un job de pose
function tintBuildVoxel(x, z) {
  const i = topVoxelIndex(x, z);
  if (i < 0) return;
  tmpColor.copy(origColor[i]).lerp(new THREE.Color(0x88ff99), 0.55);
  instanced.setColorAt(i, tmpColor);
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
}

function addBuildJob(x, z) {
  const k = jobKey(x, z);
  if (buildJobs.has(k)) return false;
  if (jobs.has(k)) return false;
  if (isCellOccupied(x, z)) return false;
  const top = cellTop[z * GRID + x];
  if (top >= MAX_STRATES) return false;
  if (top <= SHALLOW_WATER_LEVEL) return false;
  buildJobs.set(k, { x, z, claimedBy: null });
  tintBuildVoxel(x, z);
  const m = new THREE.Mesh(buildMarkerGeo, buildMarkerMat);
  m.position.set(x + 0.5, top + 0.8, z + 0.5);
  markerGroup.add(m);
  buildMarkers.set(k, m);
  return true;
}

function removeBuildJob(x, z) {
  const k = jobKey(x, z);
  if (!buildJobs.has(k)) return false;
  const j = buildJobs.get(k);
  if (j.claimedBy) {
    j.claimedBy.state = 'IDLE';
    j.claimedBy.path = null;
    j.claimedBy.targetBuildJob = null;
  }
  buildJobs.delete(k);
  untintTopVoxel(x, z);
  const m = buildMarkers.get(k);
  if (m) { markerGroup.remove(m); buildMarkers.delete(k); }
  return true;
}

// ============================================================================
// A* + approach (proto4)
// ============================================================================
function passable(x, z, fromTop) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return false;
  const top = cellTop[z * GRID + x];
  if (top <= 0) return false;
  // eau profonde infranchissable, eau peu profonde (shallow) est traversable
  if (isDeepWater(x, z)) return false;
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
    // eau profonde infranchissable, shallow ok
    if (isDeepWater(nx, nz)) continue;
    if (top <= 0) continue;
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

// ---------------------------------------------------------------------------
// Pools de bulles contextuelles (priorite sur les bulles aleatoires).
// Categorie "field-no-research" : joueur a pose >= 2 champs mais aucun
// batiment de recherche (ou laboratoire vide). Tirage aleatoire sans
// repetition consecutive. Cooldown global de 45 s entre deux declenchements.
// ---------------------------------------------------------------------------
const SPEECH_CONTEXT_FIELD_NO_RESEARCH = [
  "Il me faut une houe pour cultiver.",
  "Comment on fait pour manger du pain sans outil ?",
  "Ces champs ne donneront rien sans une houe.",
  "On devrait construire une hutte de recherche.",
  "Sans outils, ces champs sont juste de la terre retournee.",
  "Faut qu'on trouve comment faire une houe.",
  "Le savant pourrait nous aider, si on en avait un."
];
const SPEECH_CONTEXT_EMPTY_LAB = [
  "Le laboratoire est vide.",
  "Qui va faire la recherche ?",
  "La hutte du sage attend un chercheur."
];

const contextBubbles = {
  lastCategoryTriggerAt: new Map(), // categorie => timestamp (sec)
  lastLineByCategory: new Map(),    // categorie => derniere ligne tiree
  fieldTriggerStartAt: -1           // instant ou la condition "2 champs sans recherche" est apparue
};
const CONTEXT_COOLDOWN = 45;
const FIELD_NO_RESEARCH_DELAY_MAX = 30;

function pickContextLine(pool, category) {
  const last = contextBubbles.lastLineByCategory.get(category);
  let line, guard = 0;
  do { line = pool[Math.floor(Math.random() * pool.length)]; guard++; }
  while (line === last && guard < 6 && pool.length > 1);
  contextBubbles.lastLineByCategory.set(category, line);
  return line;
}

function canTriggerContext(category, nowSec) {
  const last = contextBubbles.lastCategoryTriggerAt.get(category);
  if (last == null) return true;
  return (nowSec - last) >= CONTEXT_COOLDOWN;
}

function markContextTriggered(category, nowSec) {
  contextBubbles.lastCategoryTriggerAt.set(category, nowSec);
}

function countFields() {
  let f = 0;
  if (!cellSurface) return 0;
  for (let i = 0; i < cellSurface.length; i++) if (cellSurface[i] === 'field') f++;
  return f;
}

function isNearField(x, z, radius = 4) {
  if (!cellSurface) return false;
  const r = radius;
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue;
      if (cellSurface[nz * GRID + nx] === 'field') return true;
    }
  }
  return false;
}

// Essaie de faire parler un colon IDLE proche d'un champ si la condition
// "2+ champs, aucun batiment de recherche" dure depuis plus de 30 s. La
// condition alternative "laboratoire vide" (batiment pose mais aucun colon
// assigne) declenche une bulle adaptee.
function tryTriggerContextBubble(nowSec) {
  const fieldCount = countFields();
  const hasResearch = researchHouses.length > 0;
  const hasAssignedResearcher = researchHouses.some(r => r.assignedColonistId != null);

  // cas 1 : champs sans batiment de recherche
  if (fieldCount >= 2 && !hasResearch) {
    if (contextBubbles.fieldTriggerStartAt < 0) contextBubbles.fieldTriggerStartAt = nowSec;
    const elapsed = nowSec - contextBubbles.fieldTriggerStartAt;
    // premier declenchement aleatoire dans la fenetre 0..30 s, puis cooldown
    if (elapsed >= 0 && canTriggerContext('field-no-research', nowSec)) {
      // proba progressive pour etaler dans les 30 premieres secondes
      const targetProb = Math.min(1, elapsed / FIELD_NO_RESEARCH_DELAY_MAX);
      if (Math.random() < targetProb * 0.35) {
        // cherche un colon IDLE (ou WANDER) proche d'un champ
        const candidates = [];
        for (const c of colonists) {
          if (c.speechTimer > 0) continue;
          if (c.state !== 'IDLE' && c.state !== 'MOVING') continue;
          if (c.researchBuildingId != null) continue;
          if (!isNearField(c.x, c.z, 5)) continue;
          candidates.push(c);
        }
        if (candidates.length > 0 && activeSpeakers() < 2) {
          const speaker = candidates[Math.floor(Math.random() * candidates.length)];
          const line = pickContextLine(SPEECH_CONTEXT_FIELD_NO_RESEARCH, 'field-no-research');
          speaker.say(line);
          markContextTriggered('field-no-research', nowSec);
          return true;
        }
      }
    }
  } else {
    // condition levee, reset du timer
    contextBubbles.fieldTriggerStartAt = -1;
  }

  // cas 2 : batiment de recherche pose mais aucun colon attribue
  if (hasResearch && !hasAssignedResearcher) {
    if (canTriggerContext('empty-lab', nowSec) && activeSpeakers() < 2) {
      if (Math.random() < 0.25) {
        const candidates = colonists.filter(c => c.speechTimer <= 0 && (c.state === 'IDLE' || c.state === 'MOVING'));
        if (candidates.length > 0) {
          const speaker = candidates[Math.floor(Math.random() * candidates.length)];
          const line = pickContextLine(SPEECH_CONTEXT_EMPTY_LAB, 'empty-lab');
          speaker.say(line);
          markContextTriggered('empty-lab', nowSec);
          return true;
        }
      }
    }
  }
  return false;
}

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

let showNamesInBubbles = false;

function drawBubble(canvas, text, name, gender, isChief) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const padX = 22;
  const headerFont = '700 26px system-ui, sans-serif';
  const bodyFont = '500 30px system-ui, sans-serif';
  const sym = gender ? GENDER_SYMBOLS[gender] : '';
  const starPrefix = isChief ? (CHIEF_STAR + ' ') : '';
  const header = (showNamesInBubbles && name) ? (starPrefix + name + (sym ? ' ' + sym : '')) : '';
  ctx.font = headerFont;
  const hMetrics = header ? ctx.measureText(header) : { width: 0 };
  ctx.font = bodyFont;
  const bMetrics = ctx.measureText(text);
  const tw = Math.min(canvas.width - padX * 2, Math.max(hMetrics.width, bMetrics.width));
  const bw = tw + padX * 2;
  const hasHeader = header.length > 0;
  const bh = hasHeader ? 92 : 64;
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (hasHeader) {
    ctx.font = headerFont;
    const headerY = by + 24;
    // on dessine etoile (si chef) + nom + symbole separes pour colorer chacun
    const nameOnly = name;
    const starStr = isChief ? (CHIEF_STAR + ' ') : '';
    const starW = starStr ? ctx.measureText(starStr).width : 0;
    const nameW = ctx.measureText(nameOnly).width;
    const symW = sym ? ctx.measureText(' ' + sym).width : 0;
    const totalW = starW + nameW + symW;
    const startX = canvas.width / 2 - totalW / 2;
    ctx.textAlign = 'left';
    if (starStr) {
      ctx.fillStyle = CHIEF_COLOR;
      ctx.fillText(starStr, startX, headerY);
    }
    ctx.fillStyle = '#1a1f2a';
    ctx.fillText(nameOnly, startX + starW, headerY);
    if (sym) {
      ctx.fillStyle = GENDER_COLORS[gender] || '#1a1f2a';
      ctx.fillText(' ' + sym, startX + starW + nameW, headerY);
    }
    ctx.fillStyle = '#1a1f2a';
    ctx.textAlign = 'center';
    ctx.font = bodyFont;
    ctx.fillText(text, canvas.width / 2, by + 66, canvas.width - padX * 2);
  } else {
    ctx.fillStyle = '#1a1f2a';
    ctx.font = bodyFont;
    ctx.fillText(text, canvas.width / 2, by + bh / 2, canvas.width - padX * 2);
  }
}

// Etiquette persistante nom + genre (sprite au-dessus de la tete au survol)
function makeLabelCanvas() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  return c;
}
function drawLabel(canvas, name, gender, isChief) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 22px system-ui, sans-serif';
  const sym = GENDER_SYMBOLS[gender] || '';
  const starStr = isChief ? (CHIEF_STAR + ' ') : '';
  const starW = starStr ? ctx.measureText(starStr).width : 0;
  const nameW = ctx.measureText(name).width;
  const symW = ctx.measureText(' ' + sym).width;
  const totalW = starW + nameW + symW;
  const padX = 14;
  const bw = totalW + padX * 2;
  const bh = 36;
  const bx = (canvas.width - bw) / 2;
  const by = (canvas.height - bh) / 2;
  ctx.fillStyle = 'rgba(15, 18, 24, 0.78)';
  ctx.strokeStyle = 'rgba(255, 217, 138, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const startX = canvas.width / 2 - totalW / 2;
  const midY = canvas.height / 2;
  if (starStr) {
    ctx.fillStyle = CHIEF_COLOR;
    ctx.fillText(starStr, startX, midY);
  }
  ctx.fillStyle = '#f3ecdd';
  ctx.fillText(name, startX + starW, midY);
  ctx.fillStyle = GENDER_COLORS[gender] || '#f3ecdd';
  ctx.fillText(' ' + sym, startX + starW + nameW, midY);
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
const usedNames = new Set();

function topY(x, z) {
  const t = cellTop[z * GRID + x];
  // pieds mouilles, colon enfonce de 0.2 sur eau peu profonde
  if (t >= WATER_LEVEL && t <= SHALLOW_WATER_LEVEL) return t - 0.2;
  return t;
}

class Colonist {
  constructor(id, x, z, opts) {
    this.id = id;
    this.isChief = false;
    this.x = x; this.z = z;
    this.tx = x + 0.5;
    this.tz = z + 0.5;
    this.ty = topY(x, z);
    this.vy = 0;
    this.state = 'IDLE';
    this.path = null;
    this.pathStep = 0;
    this.targetJob = null;
    this.targetBush = null;
    this.targetBuildJob = null;
    this.workTimer = 0;
    this.bounce = 0;
    this.isWandering = false;
    this.wanderPause = 2 + Math.random() * 4;
    this.lookTimer = 1 + Math.random() * 3;
    this.targetYaw = 0;
    this.speechTimer = 0;
    this.nextSpeech = 10 + Math.random() * 10;
    this.lastLine = null;
    // recherche
    this.researchBuildingId = null;
    this.lastContextLine = null;
    // identite
    if (opts && opts.forceName) {
      this.gender = opts.forceGender || 'M';
      this.name = opts.forceName;
      usedNames.add(this.name);
      this.isChief = !!opts.isChief;
    } else {
      this.gender = Math.random() < 0.5 ? 'M' : 'F';
      this.name = pickUniqueName(this.gender, usedNames);
    }
    this.relationships = new Map();
    // NOTE: si François venait a mourir plus tard, designer un nouveau chef parmi colonists.
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
    // etiquette de survol (nom + genre)
    this.labelCanvas = makeLabelCanvas();
    drawLabel(this.labelCanvas, this.name, this.gender, this.isChief);
    this.labelTex = new THREE.CanvasTexture(this.labelCanvas);
    this.labelTex.minFilter = THREE.LinearFilter;
    this.labelMat = new THREE.SpriteMaterial({ map: this.labelTex, transparent: true, depthTest: false, depthWrite: false });
    this.label = new THREE.Sprite(this.labelMat);
    this.label.scale.set(1.6, 0.4, 1);
    this.label.position.set(0, 1.75, 0);
    this.label.visible = false;
    this.label.renderOrder = 998;
    this.group.add(this.label);
  }

  say(line) {
    this.lastLine = line;
    drawBubble(this.bubbleCanvas, line, this.name, this.gender, this.isChief);
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
      // les colons peuvent marcher sur shallow, pas sur eau profonde
      if (top <= 0) continue;
      if (isDeepWater(nx, nz)) continue;
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

  pickBuildJob() {
    // necessite un stock disponible
    if (totalBuildStock() <= 0) return false;
    let best = null, bestD = Infinity;
    for (const [, j] of buildJobs) {
      if (j.claimedBy) continue;
      // portee verticale du placement : tile cible <= 3 au dessus du colon
      const colonTop = cellTop[this.z * GRID + this.x];
      const targetTop = cellTop[j.z * GRID + j.x];
      if (targetTop - colonTop > 3) continue;
      const d = Math.abs(j.x - this.x) + Math.abs(j.z - this.z);
      if (d < bestD) { bestD = d; best = j; }
    }
    if (!best) return false;
    const approach = findApproach(this.x, this.z, best.x, best.z);
    if (!approach) return false;
    best.claimedBy = this;
    this.targetBuildJob = best;
    this.path = approach.path;
    this.pathStep = 0;
    this.state = 'MOVING';
    this.isWandering = false;
    this.updateTrail();
    return true;
  }

  pickHarvest() {
    const bush = findNearestBush(this.x, this.z, HARVEST_RADIUS);
    if (!bush) return false;
    const approach = findApproach(this.x, this.z, bush.x, bush.z);
    if (!approach) return false;
    bush.claimedBy = this;
    this.targetBush = bush;
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

    if (this.state === 'RESEARCHING') {
      // chercheur immobile a cote du batiment, animation bob lent
      this.lineGeo.setFromPoints([]);
      const building = findResearchBuildingById(this.researchBuildingId);
      if (!building) {
        this.researchBuildingId = null;
        this.state = 'IDLE';
        return;
      }
      // regarde le batiment
      const dx = (building.x + 0.5) - this.tx;
      const dz = (building.z + 0.5) - this.tz;
      this.group.rotation.y = Math.atan2(dx, dz);
      const bob = Math.sin(performance.now() * 0.0025) * 0.06;
      this.group.position.set(this.tx, this.ty + bob, this.tz);
      // bulles classiques autorisees en recherche
      this.nextSpeech -= dt;
      if (this.nextSpeech <= 0) {
        this.nextSpeech = 15 + Math.random() * 10;
      }
      return;
    }

    if (this.state === 'IDLE') {
      this.lineGeo.setFromPoints([]);
      // si assigne a un batiment de recherche mais encore IDLE (edge), tenter d'aller vers lui
      if (this.researchBuildingId != null) {
        const building = findResearchBuildingById(this.researchBuildingId);
        if (!building) {
          this.researchBuildingId = null;
        } else {
          const approach = findApproach(this.x, this.z, building.x, building.z);
          if (approach) {
            this.path = approach.path;
            this.pathStep = 0;
            this.state = 'MOVING';
            this.isWandering = false;
            this.updateTrail();
            return;
          }
        }
      }
      if (jobs.size > 0) { if (this.pickJob()) return; }
      if (buildJobs.size > 0) { if (this.pickBuildJob()) return; }
      if (this.pickHarvest()) return;
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
      if (this.isWandering && (jobs.size > 0 || buildJobs.size > 0 || this.researchBuildingId != null)) {
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
        // arrivee au batiment de recherche
        if (this.researchBuildingId != null && !this.targetJob && !this.targetBush) {
          this.state = 'RESEARCHING';
          this.path = null;
          this.lineGeo.setFromPoints([]);
          this.group.position.set(this.tx, this.ty, this.tz);
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
      const focusTarget = this.targetJob || this.targetBush || this.targetBuildJob;
      if (focusTarget) {
        const dx = (focusTarget.x + 0.5) - this.tx;
        const dz = (focusTarget.z + 0.5) - this.tz;
        this.group.rotation.y = Math.atan2(dx, dz);
      }
      this.bounce = Math.sin(this.workTimer * 12) * 0.08;
      const grounded = this.ty <= topY(this.x, this.z) + 1e-4 && this.vy === 0;
      this.group.position.set(this.tx, this.ty + (grounded ? Math.abs(this.bounce) : 0), this.tz);
      const duration = this.targetBush ? HARVEST_DURATION : (this.targetBuildJob ? 1.5 : WORK_DURATION);
      if (this.workTimer >= duration) {
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
          // stock selon biome du voxel mine (avant suppression du top -> biome inchange)
          const minedBiome = cellBiome[z * GRID + x];
          incrStockForBiome(minedBiome);
          removeJob(x, z, true);
          resources.stone++;
          gameStats.minesCompleted++;
          this.targetJob = null;
        }
        if (this.targetBuildJob) {
          const { x, z } = this.targetBuildJob;
          const top = cellTop[z * GRID + x];
          if (top < MAX_STRATES && consumeBuildStock()) {
            // ajoute un voxel au dessus
            const biome = cellBiome[z * GRID + x];
            const newY = top; // nouvel indice y du voxel pose (= top courant)
            const slot = nextFreeVoxelIdx++;
            tmpObj.position.set(x + 0.5, newY + 0.5, z + 0.5);
            tmpObj.rotation.set(0, 0, 0);
            tmpObj.scale.set(1, 1, 1);
            tmpObj.updateMatrix();
            instanced.setMatrixAt(slot, tmpObj.matrix);
            // teinte selon biome (top color)
            const colTop = colorForLayer(biome, newY, newY + 1);
            tmpColor.copy(colTop);
            instanced.setColorAt(slot, tmpColor);
            origColor[slot] = tmpColor.clone();
            // repeindre l'ancien top avec la couleur "sous la surface"
            const oldTopIdx = instanceIndex[z * GRID + x][top - 1];
            if (oldTopIdx != null) {
              const under = colorForLayer(biome, top - 1, newY + 1);
              tmpColor.copy(under);
              instanced.setColorAt(oldTopIdx, tmpColor);
              origColor[oldTopIdx] = tmpColor.clone();
            }
            instanceIndex[z * GRID + x][newY] = slot;
            cellTop[z * GRID + x] = newY + 1;
            instanced.instanceMatrix.needsUpdate = true;
            if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
            // retire marker
            const k = jobKey(x, z);
            const m = buildMarkers.get(k);
            if (m) { markerGroup.remove(m); buildMarkers.delete(k); }
            buildJobs.delete(k);
          } else {
            // echec, remet le job en attente
            this.targetBuildJob.claimedBy = null;
          }
          this.targetBuildJob = null;
        }
        if (this.targetBush) {
          const bush = this.targetBush;
          const picked = bush.berries;
          if (picked > 0) {
            bush.berries = 0;
            resources.berries += picked;
            gameStats.totalBerriesHarvested += picked;
            refreshBushBerries(bush);
            bush.regenTimer = 0;
          }
          bush.claimedBy = null;
          this.targetBush = null;
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
    this.labelTex.dispose();
    this.labelMat.dispose();
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
  // fallback, au moins trouver une tile hors eau (la plus au centre possible)
  for (let r = 0; r < GRID; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, z = cz + dz;
        if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
        if (cellTop[z * GRID + x] > SHALLOW_WATER_LEVEL) return { x, z };
      }
    }
  }
  return { x: cx, z: cz };
}

function spawnColonist(x, z, opts) {
  const id = colonists.length;
  const c = new Colonist(id, x, z, opts);
  colonists.push(c);
  return c;
}

function clearColonists() {
  for (const c of colonists) c.dispose();
  colonists.length = 0;
  usedNames.clear();
}

// ============================================================================
// Scene par defaut : hameau + arbres + colons
// ============================================================================
let spawn;
let pendingDefaultResearch = null;
function populateDefaultScene() {
  pendingDefaultResearch = null;
  spawn = findSpawn();

  // 3 maisons formant hameau
  const houseOffsets = [[0, 0], [2, 1], [-2, 1]];
  for (const [ox, oz] of houseOffsets) {
    const x = Math.max(0, Math.min(GRID - 1, spawn.x + ox));
    const z = Math.max(0, Math.min(GRID - 1, spawn.z + oz));
    if (!isCellOccupied(x, z)) addHouse(x, z);
  }

  // 1 batiment de recherche adjacent au hameau (cote nord) pour voir le
  // toit bleu directement. Un colon IDLE sera assigne automatiquement.
  {
    const offsets = [[0, -2], [1, -2], [-1, -2], [0, -3], [2, -1]];
    for (const [ox, oz] of offsets) {
      const x = Math.max(0, Math.min(GRID - 1, spawn.x + ox));
      const z = Math.max(0, Math.min(GRID - 1, spawn.z + oz));
      if (isCellOccupied(x, z)) continue;
      if (cellTop[z * GRID + x] <= SHALLOW_WATER_LEVEL) continue;
      pendingDefaultResearch = { x, z };
      break;
    }
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

  // quelques buissons de baies disperses
  let bushPlaced = 0;
  const targetBushes = 8;
  for (let tries = 0; tries < 600 && bushPlaced < targetBushes; tries++) {
    const x = Math.floor(rng() * GRID);
    const z = Math.floor(rng() * GRID);
    const biome = cellBiome[z * GRID + x];
    if (biome !== 'grass' && biome !== 'forest') continue;
    if (isCellOccupied(x, z)) continue;
    if (addBush(x, z)) bushPlaced++;
  }

  // 5 colons autour du hameau, le premier est François (le chef)
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    let cx = spawn.x + Math.round(Math.cos(ang) * 1.5);
    let cz = spawn.z + Math.round(Math.sin(ang) * 1.5);
    cx = Math.max(0, Math.min(GRID - 1, cx));
    cz = Math.max(0, Math.min(GRID - 1, cz));
    if (i === 0) {
      spawnColonist(cx, cz, { forceName: CHIEF_NAME, forceGender: 'M', isChief: true });
    } else {
      spawnColonist(cx, cz);
    }
  }

  // batiment de recherche par defaut (apres spawn des colons pour attribution auto)
  if (pendingDefaultResearch) {
    const { x, z } = pendingDefaultResearch;
    if (!isCellOccupied(x, z)) {
      const entry = addResearchHouse(x, z);
      if (entry) assignResearcherToBuilding(entry);
    }
    pendingDefaultResearch = null;
  }
}

function resetWorld() {
  // reset des jobs et markers
  for (const [, m] of markers) markerGroup.remove(m);
  markers.clear();
  jobs.clear();
  for (const [, m] of buildMarkers) markerGroup.remove(m);
  buildMarkers.clear();
  buildJobs.clear();
  flashes.length = 0;
  for (const k of STOCK_KEYS) stocks[k] = 0;
  researchPoints = 0;
  for (const id in techs) techs[id].unlocked = false;
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
  resources.berries = 0;
  resources.wood = 0;
  resources.stone = 0;
  gameStats.housesPlaced = 0;
  gameStats.minesCompleted = 0;
  gameStats.totalBerriesHarvested = 0;
  contextBubbles.lastCategoryTriggerAt.clear();
  contextBubbles.lastLineByCategory.clear();
  contextBubbles.fieldTriggerStartAt = -1;
  questIndex = 0;
  lastQuestSig = '';
  startNextQuest();
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
// Curseur wireframe de placement.
// Affiche un cube filaire sur la tile survolee. Vert quand l'outil actif est
// autorise sur le biome, rouge quand il est refuse. Cache en mode navigation.
// ============================================================================
const cursorGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
const cursorEdges = new THREE.EdgesGeometry(cursorGeo);
const cursorMatOk = new THREE.LineBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.9, depthTest: false });
const cursorMatBad = new THREE.LineBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.95, depthTest: false });
const cursorMesh = new THREE.LineSegments(cursorEdges, cursorMatOk);
cursorMesh.renderOrder = 999;
cursorMesh.visible = false;
scene.add(cursorMesh);

function setCursorAt(cell) {
  if (!cell) { cursorMesh.visible = false; return; }
  if (toolState.tool === 'nav') { cursorMesh.visible = false; return; }
  const top = cellTop[cell.z * GRID + cell.x];
  cursorMesh.position.set(cell.x + 0.5, top - 0.5, cell.z + 0.5);
  const ok = toolAllowedOnCell(toolState.tool, cell.x, cell.z);
  cursorMesh.material = ok ? cursorMatOk : cursorMatBad;
  cursorMesh.visible = true;
}

// ============================================================================
// Selection de strate (Shift+clic). Flood fill 4-directionnel sur les tiles
// adjacentes qui partagent la meme hauteur (cellTop) et le meme biome que la
// tile cliquee. Plafond de securite a 200 tiles.
// ============================================================================
const STRATA_MAX = 200;

function computeStrata(x, z) {
  const out = [];
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return out;
  const startKey = z * GRID + x;
  const refTop = cellTop[startKey];
  const refBiome = cellBiome[startKey];
  const seen = new Uint8Array(GRID * GRID);
  const queue = [startKey];
  seen[startKey] = 1;
  while (queue.length && out.length < STRATA_MAX) {
    const k = queue.shift();
    const cx = k % GRID;
    const cz = (k - cx) / GRID;
    out.push({ x: cx, z: cz });
    const nbs = [
      [cx + 1, cz], [cx - 1, cz], [cx, cz + 1], [cx, cz - 1]
    ];
    for (const [nx, nz] of nbs) {
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue;
      const nk = nz * GRID + nx;
      if (seen[nk]) continue;
      if (cellTop[nk] !== refTop) continue;
      if (cellBiome[nk] !== refBiome) continue;
      seen[nk] = 1;
      queue.push(nk);
    }
  }
  return out;
}

// Preview wireframe de la strate survolee (un LineSegments par tile, recycle).
const strataPreviewMeshes = [];
const strataPreviewMat = new THREE.LineBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.75, depthTest: false });
let strataPreviewKey = null; // cache: "x,z" tant que le joueur ne change pas de tile
let strataCachedCells = null;

function clearStrataPreview() {
  for (const m of strataPreviewMeshes) m.visible = false;
}

function ensureStrataMesh(i) {
  if (strataPreviewMeshes[i]) return strataPreviewMeshes[i];
  const m = new THREE.LineSegments(cursorEdges, strataPreviewMat);
  m.renderOrder = 998;
  m.visible = false;
  scene.add(m);
  strataPreviewMeshes[i] = m;
  return m;
}

function showStrataPreview(cell) {
  if (!cell) { clearStrataPreview(); strataPreviewKey = null; strataCachedCells = null; return; }
  if (toolState.tool === 'nav') { clearStrataPreview(); strataPreviewKey = null; strataCachedCells = null; return; }
  const key = cell.x + ',' + cell.z;
  if (key !== strataPreviewKey) {
    strataPreviewKey = key;
    strataCachedCells = computeStrata(cell.x, cell.z);
  }
  const cells = strataCachedCells;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const top = cellTop[c.z * GRID + c.x];
    const m = ensureStrataMesh(i);
    m.position.set(c.x + 0.5, top - 0.5, c.z + 0.5);
    m.visible = true;
  }
  for (let i = cells.length; i < strataPreviewMeshes.length; i++) {
    strataPreviewMeshes[i].visible = false;
  }
}

// ============================================================================
// UI : outils, pinceau, raccourcis
// ============================================================================
const toolState = {
  tool: 'nav',
  brush: 1,
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
    mine: 'miner',
    build: 'placer',
    forest: 'foret',
    rock: 'rocher',
    house: 'maison',
    research: 'recherche',
    field: 'champ',
    bush: 'buisson baies',
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
  if (t === 'nav') cursorMesh.visible = false;
}
function setBrush(b) {
  toolState.brush = b;
  brushBtns.forEach(x => x.classList.toggle('active', parseInt(x.dataset.brush, 10) === b));
}
toolBtns.forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
brushBtns.forEach(b => b.addEventListener('click', () => setBrush(parseInt(b.dataset.brush, 10))));

document.getElementById('btn-reset').addEventListener('click', resetWorld);

const toggleNamesEl = document.getElementById('toggle-names-in-bubbles');
if (toggleNamesEl) {
  toggleNamesEl.checked = showNamesInBubbles;
  toggleNamesEl.addEventListener('change', (e) => {
    showNamesInBubbles = !!e.target.checked;
    // redessine les bulles des colons qui parlent actuellement
    for (const c of colonists) {
      if (c.speechTimer > 0 && c.lastLine) {
        drawBubble(c.bubbleCanvas, c.lastLine, c.name, c.gender, c.isChief);
        c.bubbleTex.needsUpdate = true;
      }
    }
  });
}

window.addEventListener('keydown', (e) => {
  const map = {
    '1': 'nav', '2': 'mine', '3': 'build',
    '4': 'forest', '5': 'rock',
    '6': 'ore', '7': 'house', '0': 'research', '8': 'field', '9': 'bush'
  };
  if (map[e.key]) setTool(map[e.key]);
  if (e.key === 'r' || e.key === 'R') resetWorld();
});

// ============================================================================
// Deplacement camera ZQSD (AZERTY) et WASD (QWERTY).
// Pattern Cities Skylines : on deplace a la fois controls.target et
// camera.position du meme vecteur, la camera garde donc son orientation et sa
// distance. Vitesse proportionnelle a la distance pour rester agreable quand
// on est loin (vue d'ensemble) comme pres du sol.
// ============================================================================
const cameraKeys = new Set();
const CAMERA_KEY_FORWARD = new Set(['z', 'Z', 'w', 'W']);
const CAMERA_KEY_BACKWARD = new Set(['s', 'S']);
const CAMERA_KEY_LEFT = new Set(['q', 'Q', 'a', 'A']);
const CAMERA_KEY_RIGHT = new Set(['d', 'D']);

function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

window.addEventListener('keydown', (e) => {
  if (isEditableTarget(document.activeElement)) return;
  cameraKeys.add(e.key);
});
window.addEventListener('keyup', (e) => {
  cameraKeys.delete(e.key);
});
window.addEventListener('blur', () => { cameraKeys.clear(); });

const camTmpForward = new THREE.Vector3();
const camTmpRight = new THREE.Vector3();
const camTmpMove = new THREE.Vector3();

function updateCameraPan(dt) {
  if (isEditableTarget(document.activeElement)) return;
  let fwd = 0, side = 0;
  for (const k of cameraKeys) {
    if (CAMERA_KEY_FORWARD.has(k)) fwd += 1;
    else if (CAMERA_KEY_BACKWARD.has(k)) fwd -= 1;
    else if (CAMERA_KEY_LEFT.has(k)) side -= 1;
    else if (CAMERA_KEY_RIGHT.has(k)) side += 1;
  }
  if (fwd === 0 && side === 0) return;

  // forward projete sur XZ (on ignore la composante verticale)
  camTmpForward.subVectors(controls.target, camera.position);
  camTmpForward.y = 0;
  if (camTmpForward.lengthSq() < 1e-6) return;
  camTmpForward.normalize();
  // axe lateral droit vu depuis la camera, calibre pour que D donne un mouvement vers la droite sur l'ecran
  camTmpRight.set(-camTmpForward.z, 0, camTmpForward.x);

  const dist = camera.position.distanceTo(controls.target);
  // vitesse ajustee : environ 15 u/s a distance moyenne (~50), scaling doux
  const speed = THREE.MathUtils.clamp(dist * 0.30, 8, 60);

  camTmpMove.set(0, 0, 0);
  camTmpMove.addScaledVector(camTmpForward, fwd);
  camTmpMove.addScaledVector(camTmpRight, side);
  if (camTmpMove.lengthSq() < 1e-6) return;
  camTmpMove.normalize().multiplyScalar(speed * dt);

  controls.target.add(camTmpMove);
  camera.position.add(camTmpMove);
}

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

// ----------------------------------------------------------------------------
// Restrictions de placement par biome.
// Champ et buisson de baies : uniquement grass et forest.
// Filons (or, cuivre, argent, fer, charbon, amethyste) : uniquement rock et snow.
// Les autres outils (tree, forest, rock, house, mine, erase, nav) ne sont pas
// restreints ici.
// ----------------------------------------------------------------------------
function toolAllowedOnBiome(tool, biome) {
  if (tool === 'field' || tool === 'bush') {
    return biome === 'grass' || biome === 'forest';
  }
  if (tool === 'ore') {
    return biome === 'rock' || biome === 'snow';
  }
  if (tool === 'build') {
    // on peut poser sur n'importe quel biome non aquatique (gere plus haut via cellTop)
    return biome === 'grass' || biome === 'forest' || biome === 'sand' || biome === 'rock' || biome === 'snow';
  }
  return true;
}

function toolAllowedOnCell(tool, x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return false;
  const biome = cellBiome[z * GRID + x];
  if (!toolAllowedOnBiome(tool, biome)) return false;
  if (tool === 'mine' && isMineBlocked(x, z)) return false;
  if (tool === 'mine' && !canMineCell(x, z).ok) return false;
  if (tool === 'build') {
    if (isCellOccupied(x, z)) return false;
    if (cellTop[z * GRID + x] >= MAX_STRATES) return false;
    if (cellTop[z * GRID + x] <= SHALLOW_WATER_LEVEL) return false;
  }
  return true;
}

// ----------------------------------------------------------------------------
// Obstacles qui empechent le minage direct d'une colonne.
// Regle actuelle : maison, filon, buisson. Les colons devront d'abord
// deconstruire, extraire ou defricher via un outil dedie (non implemente).
// Exceptions futures prevues : arbres (outil hache) et rochers (outil
// extraction) qui devront eux aussi bloquer le minage direct une fois les
// outils correspondants en place.
// ----------------------------------------------------------------------------
function isHouseOn(x, z) {
  for (const h of houses) if (h.x === x && h.z === z) return true;
  for (const h of researchHouses) if (h.x === x && h.z === z) return true;
  return false;
}
function isOreOn(x, z) {
  for (const o of ores) if (o.x === x && o.z === z) return true;
  return false;
}
function isBushOn(x, z) {
  for (const b of bushes) if (b.x === x && b.z === z) return true;
  return false;
}
function isMineBlocked(x, z) {
  return isHouseOn(x, z) || isOreOn(x, z) || isBushOn(x, z);
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
    for (const c of cells) {
      if (isMineBlocked(c.x, c.z)) continue;
      addJob(c.x, c.z);
    }
    return;
  }
  if (t === 'build') {
    const cells = cellsInBrush(cell.x, cell.z, toolState.brush);
    for (const c of cells) {
      if (!toolAllowedOnCell('build', c.x, c.z)) continue;
      addBuildJob(c.x, c.z);
    }
    return;
  }
  if (toolState.paintedThisStroke.has(key)) return;
  toolState.paintedThisStroke.add(key);

  switch (t) {
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
        if (!toolAllowedOnCell('ore', c.x, c.z)) continue;
        if (rng() < 0.7) addOre(c.x, c.z, toolState.oreType);
      }
      break;
    }
    case 'house':
      if (!isCellOccupied(cell.x, cell.z)) {
        if (addHouse(cell.x, cell.z)) {
          gameStats.housesPlaced++;
          spawnColonsAroundHouse(cell.x, cell.z, 2);
        }
      }
      break;
    case 'research':
      if (!isCellOccupied(cell.x, cell.z)) {
        const entry = addResearchHouse(cell.x, cell.z);
        if (entry) {
          // attribution auto du colon IDLE le plus proche
          assignResearcherToBuilding(entry);
        }
      }
      break;
    case 'bush':
      if (!isCellOccupied(cell.x, cell.z) && toolAllowedOnCell('bush', cell.x, cell.z)) addBush(cell.x, cell.z);
      break;
    case 'field': {
      const cells = cellsInBrush(cell.x, cell.z, toolState.brush);
      for (const c of cells) {
        const k = c.z * GRID + c.x;
        if (toolState.paintedThisStroke.has('h' + k)) continue;
        toolState.paintedThisStroke.add('h' + k);
        if (!toolAllowedOnCell('field', c.x, c.z)) continue;
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
      removeResearchHousesIn(cells);
      removeOresIn(cells);
      removeBushesIn(cells);
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

function applyToolToStrata(cells) {
  const t = toolState.tool;
  toolState.paintedThisStroke = new Set();
  if (t === 'mine') {
    for (const c of cells) {
      if (isMineBlocked(c.x, c.z)) continue;
      addJob(c.x, c.z);
    }
    refreshHUD();
    return;
  }
  if (t === 'build') {
    for (const c of cells) {
      if (!toolAllowedOnCell('build', c.x, c.z)) continue;
      addBuildJob(c.x, c.z);
    }
    refreshHUD();
    return;
  }
  if (t === 'erase') {
    removeTreesIn(cells);
    removeRocksIn(cells);
    removeHousesIn(cells);
    removeResearchHousesIn(cells);
    removeOresIn(cells);
    removeBushesIn(cells);
    removeAllJobsIn(cells);
    for (const c of cells) {
      const k = c.z * GRID + c.x;
      if (cellSurface[k]) {
        cellSurface[k] = null;
        repaintCellSurface(c.x, c.z);
      }
    }
    refreshHUD();
    return;
  }
  for (const c of cells) {
    switch (t) {
      case 'forest':
        if (!isCellOccupied(c.x, c.z)) addTree(c.x, c.z);
        break;
      case 'rock':
        if (!isCellOccupied(c.x, c.z)) addRock(c.x, c.z);
        break;
      case 'ore':
        if (!isCellOccupied(c.x, c.z) && toolAllowedOnCell('ore', c.x, c.z)) addOre(c.x, c.z, toolState.oreType);
        break;
      case 'house':
        if (!isCellOccupied(c.x, c.z)) {
          if (addHouse(c.x, c.z)) {
            gameStats.housesPlaced++;
            spawnColonsAroundHouse(c.x, c.z, 2);
          }
        }
        break;
      case 'research':
        if (!isCellOccupied(c.x, c.z)) {
          const entry = addResearchHouse(c.x, c.z);
          if (entry) assignResearcherToBuilding(entry);
        }
        break;
      case 'bush':
        if (!isCellOccupied(c.x, c.z) && toolAllowedOnCell('bush', c.x, c.z)) addBush(c.x, c.z);
        break;
      case 'field': {
        if (!toolAllowedOnCell('field', c.x, c.z)) break;
        const k = c.z * GRID + c.x;
        cellSurface[k] = 'field';
        repaintCellSurface(c.x, c.z);
        break;
      }
    }
  }
  refreshHUD();
}

let isShiftDown = false;
window.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftDown = true; });
window.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') { isShiftDown = false; clearStrataPreview(); strataPreviewKey = null; strataCachedCells = null; }
});
window.addEventListener('blur', () => {
  isShiftDown = false; clearStrataPreview(); strataPreviewKey = null; strataCachedCells = null;
});

dom.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (toolState.tool === 'nav') return;
  const cell = pickCell(e.clientX, e.clientY);
  if (e.shiftKey && cell) {
    const cells = computeStrata(cell.x, cell.z);
    applyToolToStrata(cells);
    // ne pas activer le mode peinture pour un shift+clic
    return;
  }
  toolState.isPainting = true;
  toolState.paintedThisStroke = new Set();
  if (cell) applyToolAtCell(cell);
});
dom.addEventListener('pointermove', (e) => {
  // curseur de placement, mis a jour meme hors peinture
  if (toolState.tool !== 'nav') {
    const hoverCell = pickCell(e.clientX, e.clientY);
    setCursorAt(hoverCell);
    if ((e.shiftKey || isShiftDown) && !toolState.isPainting) {
      showStrataPreview(hoverCell);
    } else {
      clearStrataPreview();
      strataPreviewKey = null;
      strataCachedCells = null;
    }
  } else {
    cursorMesh.visible = false;
    clearStrataPreview();
  }
  if (!toolState.isPainting) return;
  if (toolState.tool === 'nav') return;
  // outils unitaires : un seul clic
  if (toolState.tool === 'rock' || toolState.tool === 'house' || toolState.tool === 'research' || toolState.tool === 'bush') return;
  const cell = pickCell(e.clientX, e.clientY);
  if (cell) applyToolAtCell(cell);
});
dom.addEventListener('pointerleave', () => { cursorMesh.visible = false; clearStrataPreview(); });
window.addEventListener('pointerup', () => { toolState.isPainting = false; });

// ----------------------------------------------------------------------------
// Clic droit bref sur une tile = annulation de job actif.
// OrbitControls garde le pan (clic droit drag). On distingue un tap court
// (moins de 200 ms, moins de 4 px de deplacement) d'un drag de pan.
// La fonction cancelJobAt est volontairement factorisee pour pouvoir, plus
// tard, annuler des jobs d'autres types (abattage, recolte, construction).
// ----------------------------------------------------------------------------
function cancelJobAt(x, z) {
  const k = jobKey(x, z);
  if (jobs.has(k)) {
    removeJob(x, z, false);
    refreshHUD();
    return true;
  }
  if (buildJobs.has(k)) {
    removeBuildJob(x, z);
    refreshHUD();
    return true;
  }
  return false;
}

let rclickStart = null;
dom.addEventListener('pointerdown', (e) => {
  if (e.button !== 2) return;
  rclickStart = { x: e.clientX, y: e.clientY, t: performance.now() };
});
dom.addEventListener('pointerup', (e) => {
  if (e.button !== 2) return;
  if (!rclickStart) return;
  const dt = performance.now() - rclickStart.t;
  const dx = e.clientX - rclickStart.x;
  const dy = e.clientY - rclickStart.y;
  const dist2 = dx * dx + dy * dy;
  rclickStart = null;
  if (dt > 200) return;
  if (dist2 > 16) return;
  const cell = pickCell(e.clientX, e.clientY);
  if (!cell) return;
  cancelJobAt(cell.x, cell.z);
});

// Survol colons : affiche etiquette nom + genre au-dessus de la tete
const hoverRaycaster = new THREE.Raycaster();
const hoverNDC = new THREE.Vector2();
let hoveredColonist = null;
dom.addEventListener('pointermove', (e) => {
  const rect = dom.getBoundingClientRect();
  hoverNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  hoverNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  hoverRaycaster.setFromCamera(hoverNDC, camera);
  let best = null;
  let bestDist = Infinity;
  for (const c of colonists) {
    const hits = hoverRaycaster.intersectObject(c.group, true);
    for (const h of hits) {
      // ignore sprites (bubble, label)
      if (h.object.isSprite) continue;
      if (h.distance < bestDist) { bestDist = h.distance; best = c; }
    }
  }
  if (best !== hoveredColonist) {
    if (hoveredColonist) hoveredColonist.label.visible = false;
    hoveredColonist = best;
    if (hoveredColonist) hoveredColonist.label.visible = true;
  }
});
dom.addEventListener('pointerleave', () => {
  if (hoveredColonist) { hoveredColonist.label.visible = false; hoveredColonist = null; }
});

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
const cBushesEl = document.getElementById('c-bushes');
const cResearchEl = document.getElementById('c-research');
const cResearchersEl = document.getElementById('c-researchers');
const rBerriesEl = document.getElementById('r-berries');
const rWoodEl = document.getElementById('r-wood');
const rStoneEl = document.getElementById('r-stone');
const cCountEl = document.getElementById('c-count');
const colonsListEl = document.getElementById('colons-list');
const colonsHeaderEl = document.getElementById('colons-header');
colonsHeaderEl.addEventListener('click', () => {
  colonsHeaderEl.classList.toggle('collapsed');
  colonsListEl.classList.toggle('hidden');
});

let researchTickAccum = 0;
let lastBlockedMineTech = null; // { tech, x, z, t }
const lastTechBubbleByTech = new Map(); // tech -> timestamp sec
const TECH_BUBBLE_COOLDOWN = 60;
const stocksLineEl = document.getElementById('stocks-line');
const rPointsEl = document.getElementById('r-points');
const techsBodyEl = document.getElementById('techs-body');

function refreshStocksLine() {
  if (!stocksLineEl) return;
  const parts = [];
  for (const k of STOCK_KEYS) {
    if (stocks[k] > 0) parts.push(STOCK_LABELS[k] + ' ' + stocks[k]);
  }
  stocksLineEl.textContent = 'Stocks: ' + (parts.length ? parts.join(', ') : 'vide');
}

function refreshTechsPanel() {
  if (rPointsEl) rPointsEl.textContent = researchPoints;
  if (!techsBodyEl) return;
  const order = ['pick-stone', 'pick-bronze', 'pick-iron', 'pick-gold'];
  const parts = [];
  for (const id of order) {
    const t = techs[id];
    const reqOk = !t.req || techs[t.req].unlocked;
    const canAfford = researchPoints >= t.cost;
    let cls = 'tech';
    let right;
    if (t.unlocked) {
      cls += ' done';
      right = '<span class="tdone">debloquee</span>';
    } else if (reqOk && canAfford) {
      cls += ' ready';
      right = '<button data-tech="' + id + '">Rechercher</button>';
    } else {
      cls += ' locked';
      if (!reqOk) right = '<span class="tcost">prerequis</span>';
      else right = '<span class="tcost">' + t.cost + ' pts</span>';
    }
    parts.push(
      '<div class="' + cls + '" id="tech-' + id + '">' +
        '<div><div class="tname">' + t.name + '</div><div class="tcost">cout ' + t.cost + ' pts</div></div>' +
        right +
      '</div>'
    );
  }
  techsBodyEl.innerHTML = parts.join('');
  techsBodyEl.querySelectorAll('button[data-tech]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-tech');
      unlockTech(id);
    });
  });
}

function unlockTech(id) {
  const t = techs[id];
  if (!t || t.unlocked) return;
  if (t.req && !techs[t.req].unlocked) return;
  if (researchPoints < t.cost) return;
  researchPoints -= t.cost;
  t.unlocked = true;
  refreshTechsPanel();
  const el = document.getElementById('tech-' + id);
  if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 800); }
}

// bulle contextuelle : joueur tente de miner sans la tech requise
const TECH_BUBBLE_LINES = {
  'pick-stone': [
    "Il nous faudrait une pioche en pierre.",
    "Je ne peux pas casser ca sans une meilleure pioche.",
    "Sans pioche en pierre, on ne fait rien de ces rochers."
  ],
  'pick-bronze': [
    "Faut inventer la pioche en bronze d'abord.",
    "Je ne peux pas extraire ca, pas assez d'outils."
  ],
  'pick-iron': [
    "Il nous faudrait une pioche en fer.",
    "Sans fer, on casse notre outil dessus."
  ],
  'pick-gold': [
    "Cet or attend qu'on invente la pioche en or.",
    "L'amethyste nous resiste tant qu'on n'a pas mieux."
  ]
};

function tryBlockedTechBubble(nowSec) {
  if (!lastBlockedMineTech) return false;
  if (nowSec - lastBlockedMineTech.t > 5) { lastBlockedMineTech = null; return false; }
  const tech = lastBlockedMineTech.tech;
  const lastAt = lastTechBubbleByTech.get(tech) || -Infinity;
  if (nowSec - lastAt < TECH_BUBBLE_COOLDOWN) return false;
  const pool = TECH_BUBBLE_LINES[tech];
  if (!pool) return false;
  // trouve un colon proche
  const bx = lastBlockedMineTech.x;
  const bz = lastBlockedMineTech.z;
  let best = null, bestD = Infinity;
  for (const c of colonists) {
    if (c.speechTimer > 0) continue;
    if (c.state !== 'IDLE' && c.state !== 'MOVING') continue;
    const d = Math.abs(c.x - bx) + Math.abs(c.z - bz);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best || bestD > 12) return false;
  const line = pool[Math.floor(Math.random() * pool.length)];
  best.say(line);
  lastTechBubbleByTech.set(tech, nowSec);
  lastBlockedMineTech = null;
  return true;
}

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
  if (cBushesEl) cBushesEl.textContent = bushes.length;
  if (cResearchEl) cResearchEl.textContent = researchHouses.length;
  if (cResearchersEl) cResearchersEl.textContent = countActiveResearchers();
  if (rBerriesEl) rBerriesEl.textContent = resources.berries;
  if (rWoodEl) rWoodEl.textContent = resources.wood;
  if (rStoneEl) rStoneEl.textContent = resources.stone;
  refreshStocksLine();
  refreshTechsPanel();
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
  if (cCountEl) cCountEl.textContent = colonists.length;
  if (cResearchEl) cResearchEl.textContent = researchHouses.length;
  if (cResearchersEl) cResearchersEl.textContent = countActiveResearchers();
  updateColonsList();
}

let lastColonsListSig = '';
function updateColonsList() {
  if (!colonsListEl) return;
  if (colonsListEl.classList.contains('hidden')) return;
  let sig = '';
  for (const c of colonists) {
    const st = c.isWandering ? 'WANDER' : (c.state === 'RESEARCHING' ? 'RESEARCH' : c.state);
    sig += c.id + ':' + c.name + ':' + c.gender + ':' + (c.isChief ? 'C' : '') + ':' + st + '|';
  }
  if (sig === lastColonsListSig) return;
  lastColonsListSig = sig;
  const parts = [];
  for (const c of colonists) {
    const st = c.isWandering ? 'WANDER' : (c.state === 'RESEARCHING' ? 'RESEARCH' : c.state);
    const sym = GENDER_SYMBOLS[c.gender];
    const chiefMark = c.isChief
      ? '<span class="cchief" style="color:' + CHIEF_COLOR + ';margin-right:4px;">' + CHIEF_STAR + '</span>'
      : '';
    parts.push(
      '<div class="clist-row">' +
        '<span class="cname">' + chiefMark + c.name +
          '<span class="csym ' + c.gender + '">' + sym + '</span>' +
        '</span>' +
        '<span class="cstate">' + st + '</span>' +
      '</div>'
    );
  }
  colonsListEl.innerHTML = parts.join('');
}

// ============================================================================
// Boucle principale
// ============================================================================
buildTerrain();
populateDefaultScene();
setTool('nav');
setBrush(1);
refreshHUD();

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(0.1, clock.getDelta());
  const t = clock.elapsedTime;
  waterMat.uniforms.uTime.value = t;
  shallowMat.uniforms.uTime.value = t;

  for (const [, m] of markers) m.lookAt(camera.position);
  for (const [, m] of buildMarkers) m.lookAt(camera.position);

  // generation de points de recherche, 1 pt / 3 s par chercheur actif
  researchTickAccum += dt;
  if (researchTickAccum >= RESEARCH_TICK) {
    researchTickAccum -= RESEARCH_TICK;
    const n = countActiveResearchers();
    if (n > 0) {
      researchPoints += n;
      refreshTechsPanel();
    }
  }

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

  // Regen des baies
  for (const b of bushes) {
    if (b.berries < b.maxBerries) {
      b.regenTimer += dt;
      if (b.regenTimer >= BERRY_REGEN_INTERVAL) {
        b.regenTimer = 0;
        b.berries = Math.min(b.maxBerries, b.berries + 1);
        refreshBushBerries(b);
      }
    }
  }

  updateQuests(t);
  renderQuests();

  // bulles contextuelles (priorite sur bulles aleatoires), eval toutes les 1s
  if (!tick._lastContextCheck || t - tick._lastContextCheck >= 1.0) {
    tick._lastContextCheck = t;
    if (!tryBlockedTechBubble(t)) tryTriggerContextBubble(t);
  }

  if (rBerriesEl) rBerriesEl.textContent = resources.berries;
  if (rWoodEl) rWoodEl.textContent = resources.wood;
  if (rStoneEl) rStoneEl.textContent = resources.stone;
  if (cBushesEl) cBushesEl.textContent = bushes.length;
  refreshStocksLine();
  if (rPointsEl) rPointsEl.textContent = researchPoints;

  updateCameraPan(dt);
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
