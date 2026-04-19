import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ====================================================================
// Constantes monde
// ====================================================================
const GRID = 48;
const MAX_STRATES = 6;
const MIN_STRATES = 1;
const WATER_LEVEL = 1.15;
const VOXEL = 1;
const N_COLONISTS = 5;
const COLONIST_SPEED = 2.0; // tiles par seconde
const WORK_DURATION = 2.0; // secondes
const MAX_STEP = 2; // difference de hauteur traversable
const GRAVITY = 20; // gravite appliquee aux colons (unites/s^2), pour qu'ils tombent si le sol disparait

// ====================================================================
// PRNG + bruit Perlin (repris de proto3)
// ====================================================================
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const seedRand = mulberry32(1337);
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

// ====================================================================
// Boot rendu (repris de proto3)
// ====================================================================
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

// Ciel
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

// Lumieres
const sun = new THREE.DirectionalLight(0xfff2d9, 2.4);
sun.position.set(60, 70, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
const dShadow = 60;
sun.shadow.camera.left = -dShadow;
sun.shadow.camera.right = dShadow;
sun.shadow.camera.top = dShadow;
sun.shadow.camera.bottom = -dShadow;
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.05;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(GRID / 2, 0, GRID / 2);

const hemi = new THREE.HemisphereLight(0xbcd7ff, 0x3a2a1a, 0.55);
scene.add(hemi);

// Palette
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
  designate: new THREE.Color('#d6493a'),
  flash: new THREE.Color('#ffffff'),
};

// ====================================================================
// Heightmap
// ====================================================================
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

// ====================================================================
// Voxels instancies, on garde une ref par colonne pour pouvoir miner
// ====================================================================
const cellTop = new Int16Array(GRID * GRID); // hauteur courante (nombre de voxels)
const cellBiome = new Array(GRID * GRID);

let voxelCount = 0;
for (let z = 0; z < GRID; z++) {
  for (let x = 0; x < GRID; x++) {
    const e = heightmap[z * GRID + x];
    const top = Math.min(MAX_STRATES, Math.max(MIN_STRATES, Math.round(e)));
    cellTop[z * GRID + x] = top;
    cellBiome[z * GRID + x] = biomeFor(x, z, top);
    voxelCount += top;
  }
}

const boxGeo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
const baseMat = new THREE.MeshStandardMaterial({
  vertexColors: false,
  roughness: 0.92,
  metalness: 0.0,
  flatShading: true
});

// On surdimensionne legerement pour pouvoir cacher des voxels mines
const MAX_VOXELS = voxelCount;
const instanced = new THREE.InstancedMesh(boxGeo, baseMat, MAX_VOXELS);
instanced.castShadow = true;
instanced.receiveShadow = true;

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();
const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

// Index par colonne et par y
// instanceIndex[z*GRID+x][y] = idx dans instanced
const instanceIndex = [];
for (let i = 0; i < GRID * GRID; i++) instanceIndex.push([]);

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

// Couleur d'origine memoire pour pouvoir reset apres flash ou designation
const origColor = new Array(MAX_VOXELS);

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

// ====================================================================
// Arbres
// ====================================================================
function makeTree() {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.95, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.3 + (seedRand() - 0.5) * 0.05, 0.55, 0.35 + seedRand() * 0.08),
    roughness: 0.85, flatShading: true
  });
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.35), trunkMat);
  trunk.position.y = 0.5;
  trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 6), leafMat);
  cone.position.y = 1.8;
  cone.castShadow = true; cone.receiveShadow = true;
  g.add(cone);
  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.3, 6), leafMat);
  cone2.position.y = 2.5;
  cone2.castShadow = true; cone2.receiveShadow = true;
  g.add(cone2);
  g.rotation.y = seedRand() * Math.PI * 2;
  const s = 0.85 + seedRand() * 0.4;
  g.scale.setScalar(s);
  return g;
}
let treesPlaced = 0;
for (let i = 0; i < 600 && treesPlaced < 70; i++) {
  const x = Math.floor(seedRand() * GRID);
  const z = Math.floor(seedRand() * GRID);
  if (cellBiome[z * GRID + x] !== 'forest') continue;
  const top = cellTop[z * GRID + x];
  const t = makeTree();
  t.position.set(x + 0.5 + (seedRand() - 0.5) * 0.5, top, z + 0.5 + (seedRand() - 0.5) * 0.5);
  scene.add(t);
  treesPlaced++;
}

// ====================================================================
// Hameau central, 3 maisons rouges autour du spawn
// ====================================================================
function makeHouse() {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2e6c9, roughness: 0.9, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xb24e3a, roughness: 0.85, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), wallMat);
  body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.9, 4), roofMat);
  roof.position.y = 1.45;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true; roof.receiveShadow = true;
  g.add(roof);
  return g;
}

// Trouver un spawn valide pres du centre, sur herbe non-eau
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
const spawn = findSpawn();

// Trois maisons collees au spawn
const houseOffsets = [[0, 0], [2, 1], [-2, 1]];
for (const [ox, oz] of houseOffsets) {
  const x = Math.max(0, Math.min(GRID - 1, spawn.x + ox));
  const z = Math.max(0, Math.min(GRID - 1, spawn.z + oz));
  const top = cellTop[z * GRID + x];
  const h = makeHouse();
  h.position.set(x + 0.5, top, z + 0.5);
  scene.add(h);
}

// ====================================================================
// Eau
// ====================================================================
const waterGeo = new THREE.PlaneGeometry(GRID * 1.6, GRID * 1.6, 32, 32);
waterGeo.rotateX(-Math.PI / 2);
const waterMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    uTime: { value: 0 },
    uShallow: { value: new THREE.Color('#7fc3b5') },
    uDeep: { value: new THREE.Color('#2e5a66') },
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
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
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

// ====================================================================
// Post process
// ====================================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.85, 0.92);
composer.addPass(bloom);
const vignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.5 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uStrength; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float r = length(d);
      float v = smoothstep(0.75, 0.22, r);
      c.rgb *= mix(1.0 - uStrength, 1.0, v);
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

// ====================================================================
// Etat jobs et designation
// ====================================================================
const jobs = new Map(); // key "x,z" -> {x,z, claimedBy: colonist|null}
function jobKey(x, z) { return x + ',' + z; }

// Markers flottants, un quad billboard rouge par job
const markerGeo = new THREE.PlaneGeometry(0.6, 0.6);
const markerMat = new THREE.MeshBasicMaterial({
  color: 0xff5544,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});
const markers = new Map(); // key -> Mesh
const markerGroup = new THREE.Group();
scene.add(markerGroup);

function topVoxelIndex(x, z) {
  const top = cellTop[z * GRID + x];
  if (top <= 0) return -1;
  return instanceIndex[z * GRID + x][top - 1];
}

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

function addJob(x, z) {
  const k = jobKey(x, z);
  if (jobs.has(k)) return;
  const top = cellTop[z * GRID + x];
  if (top <= MIN_STRATES) return;
  if (top <= WATER_LEVEL + 0.5) return; // inutile sous l'eau
  jobs.set(k, { x, z, claimedBy: null });
  lastJobTime = performance.now() / 1000;
  tintTopVoxel(x, z);
  // marker billboard
  const m = new THREE.Mesh(markerGeo, markerMat);
  m.position.set(x + 0.5, top + 0.8, z + 0.5);
  m.userData.kind = 'marker';
  markerGroup.add(m);
  markers.set(k, m);
}
function removeJob(x, z, completed = false) {
  const k = jobKey(x, z);
  if (!jobs.has(k)) return;
  jobs.delete(k);
  if (!completed) untintTopVoxel(x, z);
  const m = markers.get(k);
  if (m) { markerGroup.remove(m); markers.delete(k); }
}

// ====================================================================
// Outils, pinceau
// ====================================================================
let tool = 'nav'; // nav, mine, cancel
let brushSize = 1; // 1, 3, 5
let isDragging = false;

const btnNav = document.getElementById('tool-nav');
const btnMine = document.getElementById('tool-mine');
const btnCancel = document.getElementById('tool-cancel');
const btnB1 = document.getElementById('brush-1');
const btnB3 = document.getElementById('brush-3');
const btnB5 = document.getElementById('brush-5');

function setTool(t) {
  tool = t;
  btnNav.classList.toggle('active', t === 'nav');
  btnMine.classList.toggle('active', t === 'mine');
  btnCancel.classList.toggle('active', t === 'cancel');
  // Reconfigurer OrbitControls : navigation par defaut, sinon clic gauche neutre
  if (t === 'nav') {
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  } else {
    controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  }
}
function setBrush(b) {
  brushSize = b;
  btnB1.classList.toggle('active', b === 1);
  btnB3.classList.toggle('active', b === 3);
  btnB5.classList.toggle('active', b === 5);
}
btnNav.addEventListener('click', () => setTool('nav'));
btnMine.addEventListener('click', () => setTool('mine'));
btnCancel.addEventListener('click', () => setTool('cancel'));
btnB1.addEventListener('click', () => setBrush(1));
btnB3.addEventListener('click', () => setBrush(3));
btnB5.addEventListener('click', () => setBrush(5));
setTool('nav');

function getBrushCells(cx, cz) {
  if (brushSize === 1) return [[cx, cz]];
  if (brushSize === 3) {
    return [[cx, cz], [cx - 1, cz], [cx + 1, cz], [cx, cz - 1], [cx, cz + 1]]
      .filter(([x, z]) => x >= 0 && x < GRID && z >= 0 && z < GRID);
  }
  // disque rayon 2 (taille 5)
  const out = [];
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dz * dz > 4) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
      out.push([x, z]);
    }
  }
  return out;
}

// ====================================================================
// Raycasting sur l'instanced mesh + le sol (pour fallback)
// ====================================================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function updatePointer(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickColumn() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(instanced, false);
  if (!hits.length) return null;
  const hit = hits[0];
  const p = hit.point.clone();
  // pousser legerement vers l'interieur via la normale
  if (hit.face) {
    const n = hit.face.normal.clone();
    // normale est en local space, mais le cube est aligne, donc OK
    p.x -= n.x * 0.01;
    p.z -= n.z * 0.01;
  }
  const x = Math.floor(p.x);
  const z = Math.floor(p.z);
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return null;
  return { x, z };
}

function applyToolAt(col) {
  if (!col) return;
  const cells = getBrushCells(col.x, col.z);
  if (tool === 'mine') {
    for (const [x, z] of cells) addJob(x, z);
  } else if (tool === 'cancel') {
    for (const [x, z] of cells) {
      const k = jobKey(x, z);
      if (!jobs.get(k)) continue;
      // Si reclame, on previent le colon
      const j = jobs.get(k);
      if (j.claimedBy) {
        j.claimedBy.state = 'IDLE';
        j.claimedBy.path = null;
        j.claimedBy.targetJob = null;
      }
      removeJob(x, z, false);
    }
  }
}

renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0) return;
  if (tool === 'nav') return;
  updatePointer(ev);
  const col = pickColumn();
  if (col) applyToolAt(col);
  isDragging = true;
});
renderer.domElement.addEventListener('pointermove', (ev) => {
  if (!isDragging) return;
  if (tool === 'nav') return;
  updatePointer(ev);
  const col = pickColumn();
  if (col) applyToolAt(col);
});
window.addEventListener('pointerup', () => { isDragging = false; });

// ====================================================================
// A* pathfinding sur grille 2D
// ====================================================================
function passable(x, z, fromTop) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return false;
  const top = cellTop[z * GRID + x];
  if (top <= 0) return false;
  if (top <= WATER_LEVEL) return false; // pas dans l'eau
  if (Math.abs(top - fromTop) > MAX_STEP) return false;
  return true;
}

function aStar(sx, sz, tx, tz) {
  if (sx === tx && sz === tz) return [[sx, sz]];
  const open = []; // tableau, on extrait min naivement (carte 48x48 = 2304 noeuds, OK)
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
    // extract min
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = cur.x + ',' + cur.z;
    if (cur.x === tx && cur.z === tz) {
      // reconstruct
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
      // Tolere la cible meme si non passable strict (on s'arrete a cote, voir caller)
      const isTarget = (nx === tx && nz === tz);
      if (!isTarget && !passable(nx, nz, curTop)) continue;
      const tentative = (gScore.get(ck) ?? Infinity) + 1;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, [cur.x, cur.z]);
        gScore.set(nk, tentative);
        const f = tentative + Math.abs(tx - nx) + Math.abs(tz - nz);
        fScore.set(nk, f);
        // reinjecter ou maj
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

// Pour miner, on cherche la case voisine accessible la plus proche
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

// ====================================================================
// Bulles de dialogue
// ====================================================================
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

function makeBubbleCanvas() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  return c;
}

function drawBubble(canvas, text) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '500 32px system-ui, sans-serif';
  const padX = 22, padY = 16;
  const metrics = ctx.measureText(text);
  const tw = Math.min(canvas.width - padX * 2, metrics.width);
  const bw = tw + padX * 2;
  const bh = 64;
  const bx = (canvas.width - bw) / 2;
  const by = 10;
  const r = 18;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.roundRect(bx + 3, by + 5, bw, bh, r);
  ctx.fill();
  // bubble
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, r);
  ctx.fill();
  ctx.stroke();
  // triangle pointer
  const cxp = canvas.width / 2;
  const tipY = by + bh + 18;
  ctx.beginPath();
  ctx.moveTo(cxp - 12, by + bh - 1);
  ctx.lineTo(cxp + 12, by + bh - 1);
  ctx.lineTo(cxp, tipY);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.stroke();
  // cover triangle base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cxp - 11, by + bh - 3, 22, 3);
  // text
  ctx.fillStyle = '#1a1f2a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, by + bh / 2, canvas.width - padX * 2);
}

// Polyfill roundRect pour vieux contextes si besoin
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

// Etat global pour les dialogues, on limite a 2 simultanes
let lastJobTime = performance.now() / 1000;
function activeSpeakers() {
  let n = 0;
  for (const c of colonists) if (c.speechTimer > 0) n++;
  return n;
}

// ====================================================================
// Colons
// ====================================================================
const COLONIST_COLORS = [0xffcf6b, 0x6bd0ff, 0xff8a8a, 0xb78aff, 0x8aff9c];

function topY(x, z) { return cellTop[z * GRID + x]; }

class Colonist {
  constructor(id, x, z) {
    this.id = id;
    this.x = x; this.z = z;
    this.tx = x + 0.5;
    this.tz = z + 0.5;
    this.ty = topY(x, z);
    this.vy = 0; // vitesse verticale, chute libre quand le sol disparait sous les pieds
    this.state = 'IDLE';
    this.path = null;
    this.pathStep = 0;
    this.targetJob = null;
    this.workTimer = 0;
    this.bounce = 0;
    // Errance
    this.isWandering = false;
    this.wanderPause = 2 + Math.random() * 4; // secondes avant premier mouvement
    this.lookTimer = 1 + Math.random() * 3;
    this.targetYaw = 0;
    // Dialogue
    this.speechTimer = 0; // duree restante d'affichage
    this.nextSpeech = 10 + Math.random() * 10;
    this.lastLine = null;
    // Mesh : corps + tete
    const col = COLONIST_COLORS[id % COLONIST_COLORS.length];
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, flatShading: true });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf3d6a8, roughness: 0.7, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMat);
    head.position.y = 1.2;
    head.castShadow = true;
    this.group.add(body);
    this.group.add(head);
    this.group.position.set(this.tx, this.ty, this.tz);
    scene.add(this.group);
    // Trail
    this.lineMat = new THREE.LineDashedMaterial({ color: col, dashSize: 0.2, gapSize: 0.15, transparent: true, opacity: 0.6 });
    this.lineGeo = new THREE.BufferGeometry();
    this.line = new THREE.Line(this.lineGeo, this.lineMat);
    scene.add(this.line);
    // Bulle de dialogue, sprite canvas
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
    // Fade sur les 0.5 dernieres secondes
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
    // Destination random dans un rayon de 3 tiles
    for (let tries = 0; tries < 10; tries++) {
      const dx = Math.floor((Math.random() * 7) - 3);
      const dz = Math.floor((Math.random() * 7) - 3);
      if (dx === 0 && dz === 0) continue;
      const nx = this.x + dx, nz = this.z + dz;
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue;
      const top = cellTop[nz * GRID + nx];
      if (top <= WATER_LEVEL) continue;
      // Eviter la tile d'un autre colon
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
    // Plus proche job non reclame
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
    this.approachX = approach.ax;
    this.approachZ = approach.az;
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
    // Cible verticale relue chaque frame : top du voxel sur lequel se tient le colon.
    // Si le sol a ete mine sous lui, groundY descend et il tombe. Si le sol adjacent
    // est plus haut (franchissement d'un rebord vers le haut), on snap doucement pour
    // rester simple cote proto.
    const groundY = topY(this.x, this.z);
    if (this.ty > groundY + 1e-4) {
      // Chute libre, integration semi-implicite simple
      this.vy -= GRAVITY * dt;
      this.ty += this.vy * dt;
      if (this.ty <= groundY) {
        // Impact, clamp et arret, pas de rebond
        this.ty = groundY;
        this.vy = 0;
      }
    } else if (this.ty < groundY) {
      // Colon en dessous du sol (colonne adjacente plus haute) : snap vers le haut
      this.ty = groundY;
      this.vy = 0;
    } else {
      // Au niveau du sol, on maintient vy a zero pour eviter un epsilon qui traine
      this.vy = 0;
    }
  }

  update(dt) {
    // Gravite appliquee dans tous les etats (IDLE, MOVING, WORKING) : un voxel peut etre
    // mine sous les pieds d'un colon a tout moment, y compris pendant qu'il travaille.
    this.applyGravity(dt);

    // Gestion de la bulle de dialogue
    this.updateSpeech(dt);

    if (this.state === 'IDLE') {
      this.lineGeo.setFromPoints([]);
      // Priorite : job si disponible
      if (jobs.size > 0) {
        if (this.pickJob()) return;
      }
      // Sinon, errance
      this.wanderPause -= dt;
      // Regarder autour, interpolation douce vers targetYaw
      this.lookTimer -= dt;
      if (this.lookTimer <= 0) {
        this.targetYaw = this.group.rotation.y + (Math.random() - 0.5) * 1.2;
        this.lookTimer = 1.5 + Math.random() * 3.5;
      }
      const dy = this.targetYaw - this.group.rotation.y;
      this.group.rotation.y += dy * Math.min(1, dt * 1.5);

      if (this.wanderPause <= 0) {
        if (this.pickWander()) {
          this.wanderPause = 2 + Math.random() * 4;
        } else {
          this.wanderPause = 1 + Math.random() * 2;
        }
      }
      this.group.position.set(this.tx, this.ty, this.tz);

      // Declencheur parole, uniquement si IDLE
      this.nextSpeech -= dt;
      if (this.nextSpeech <= 0) {
        if (this.speechTimer <= 0 && activeSpeakers() < 2) {
          const noJobSince = performance.now() / 1000 - lastJobTime;
          const insistent = (jobs.size === 0 && noJobSince > 15) && Math.random() < 0.6;
          const pool = insistent ? SPEECH_LINES_INSISTENT : SPEECH_LINES;
          let line;
          let guard = 0;
          do {
            line = pool[Math.floor(Math.random() * pool.length)];
            guard++;
          } while (line === this.lastLine && guard < 5);
          this.say(line);
        }
        // Plus frequent si pas de job depuis longtemps
        const noJobSince = performance.now() / 1000 - lastJobTime;
        const base = (jobs.size === 0 && noJobSince > 15) ? 6 : 12;
        this.nextSpeech = base + Math.random() * 8;
      }
      return;
    }
    if (this.state === 'MOVING') {
      // Abandon de l'errance si un job arrive
      if (this.isWandering && jobs.size > 0) {
        this.isWandering = false;
        this.path = null;
        this.state = 'IDLE';
        this.lineGeo.setFromPoints([]);
        return;
      }
      if (!this.path || this.pathStep >= this.path.length) {
        if (this.isWandering) {
          // Fin d'errance, retour IDLE
          this.isWandering = false;
          this.state = 'IDLE';
          this.path = null;
          this.lineGeo.setFromPoints([]);
          this.wanderPause = 2 + Math.random() * 4;
          return;
        }
        // Arrive au noeud d'approche (job)
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
      // Bob vertical leger en errance, simule la demarche
      const bob = this.isWandering ? Math.sin(performance.now() * 0.006) * 0.04 : 0;
      this.group.position.set(this.tx, this.ty + bob, this.tz);
      // Orienter vers la direction de marche
      this.group.rotation.y = Math.atan2(dx, dz);
      this.targetYaw = this.group.rotation.y;
      return;
    }
    if (this.state === 'WORKING') {
      this.workTimer += dt;
      // Orienter vers le voxel cible
      if (this.targetJob) {
        const dx = (this.targetJob.x + 0.5) - this.tx;
        const dz = (this.targetJob.z + 0.5) - this.tz;
        this.group.rotation.y = Math.atan2(dx, dz);
      }
      this.bounce = Math.sin(this.workTimer * 12) * 0.08;
      // Bounce de travail additionne au ty reel (qui peut etre en chute si le sol disparait).
      // Si le colon est en l'air (vy != 0), on n'applique pas le bounce pour ne pas masquer la chute.
      const grounded = this.ty <= topY(this.x, this.z) + 1e-4 && this.vy === 0;
      this.group.position.set(this.tx, this.ty + (grounded ? Math.abs(this.bounce) : 0), this.tz);
      if (this.workTimer >= WORK_DURATION) {
        // miner : retire le voxel du dessus
        if (this.targetJob) {
          const { x, z } = this.targetJob;
          const top = cellTop[z * GRID + x];
          if (top > MIN_STRATES) {
            const i = instanceIndex[z * GRID + x][top - 1];
            // Cacher le voxel
            instanced.setMatrixAt(i, HIDDEN_MATRIX);
            instanced.instanceMatrix.needsUpdate = true;
            cellTop[z * GRID + x] = top - 1;
            // flash sur le nouveau top, puis reset
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
}

// Flash blanc 300ms sur le nouveau voxel top
const flashes = []; // { x, z, t }
function scheduleFlash(x, z) {
  flashes.push({ x, z, t: 0 });
  const i = topVoxelIndex(x, z);
  if (i < 0) return;
  instanced.setColorAt(i, COL.flash);
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
}

const colonists = [];
for (let i = 0; i < N_COLONISTS; i++) {
  // disposer en cercle autour du spawn
  const ang = (i / N_COLONISTS) * Math.PI * 2;
  let cx = spawn.x + Math.round(Math.cos(ang) * 1.5);
  let cz = spawn.z + Math.round(Math.sin(ang) * 1.5);
  cx = Math.max(0, Math.min(GRID - 1, cx));
  cz = Math.max(0, Math.min(GRID - 1, cz));
  colonists.push(new Colonist(i, cx, cz));
}

// ====================================================================
// HUD
// ====================================================================
const fpsEl = document.getElementById('fps');
const jobsEl = document.getElementById('jobs');
const idleEl = document.getElementById('idle');
const movingEl = document.getElementById('moving');
const workingEl = document.getElementById('working');
const talkingEl = document.getElementById('talking');

let fpsFrames = 0, fpsLast = performance.now();
function updateHUD() {
  let nIdle = 0, nMov = 0, nWork = 0;
  for (const c of colonists) {
    if (c.state === 'IDLE') nIdle++;
    else if (c.state === 'MOVING') nMov++;
    else if (c.state === 'WORKING') nWork++;
  }
  jobsEl.textContent = jobs.size;
  idleEl.textContent = nIdle;
  movingEl.textContent = nMov;
  workingEl.textContent = nWork;
  let nTalk = 0;
  for (const c of colonists) if (c.speechTimer > 0) nTalk++;
  if (talkingEl) talkingEl.textContent = nTalk;
}

// ====================================================================
// Boucle
// ====================================================================
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(0.1, clock.getDelta());
  const t = clock.elapsedTime;

  waterMat.uniforms.uTime.value = t;

  // Markers : bobbing leger et orientation billboard
  for (const [, m] of markers) {
    m.position.y = m.position.y + Math.sin(t * 3 + m.position.x) * 0.002;
    m.lookAt(camera.position);
  }

  // Flashes
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

  // Colons
  for (const c of colonists) c.update(dt);

  controls.update();
  composer.render();
  updateHUD();

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
