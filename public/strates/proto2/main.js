import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ---------- Constantes ----------
const MAP_SIZE = 48;
const CHUNK_SIZE = 16;
const CHUNKS_PER_SIDE = MAP_SIZE / CHUNK_SIZE;
const MAX_H = 8;
const MIN_H = 1;
const WATER_LEVEL = 1.15;

// ---------- Bruit Perlin FBM (sans dependance) ----------
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

// ---------- Palette biomes (Dorfromantik) ----------
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
};

// ---------- Renderer / scene ----------
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
camera.position.set(MAP_SIZE * 0.9, MAP_SIZE * 0.7, MAP_SIZE * 0.9);
camera.lookAt(MAP_SIZE / 2, 0, MAP_SIZE / 2);

// ---------- Sky shader ----------
const sky = new Sky();
sky.scale.setScalar(450);
scene.add(sky);
const skyU = sky.material.uniforms;
skyU.turbidity.value = 6;
skyU.rayleigh.value = 1.6;
skyU.mieCoefficient.value = 0.006;
skyU.mieDirectionalG.value = 0.85;
const sunDir = new THREE.Vector3();
sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(60), THREE.MathUtils.degToRad(135));
skyU.sunPosition.value.copy(sunDir);

// ---------- Lumieres ----------
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
sun.target.position.set(MAP_SIZE / 2, 0, MAP_SIZE / 2);

const hemi = new THREE.HemisphereLight(0xbcd7ff, 0x3a2a1a, 0.55);
scene.add(hemi);

// ---------- OrbitControls (mode dependant) ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(MAP_SIZE / 2, 2, MAP_SIZE / 2);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 14;
controls.maxDistance = 140;
controls.maxPolarAngle = Math.PI * 0.48;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

// ---------- Donnees terrain ----------
const heights = new Uint8Array(MAP_SIZE * MAP_SIZE);
const biomeNoise = new Float32Array(MAP_SIZE * MAP_SIZE);
function hIndex(x, z) { return z * MAP_SIZE + x; }

function initHeights() {
  const cx = MAP_SIZE / 2, cz = MAP_SIZE / 2;
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const nx = x / MAP_SIZE - 0.5;
      const nz = z / MAP_SIZE - 0.5;
      const hill = Math.max(0, 1 - (nx * nx + nz * nz) * 3.2);
      const valley = Math.max(0, 0.7 - Math.abs((x - cx * 0.7) / (MAP_SIZE * 0.18)));
      const base = fbm(x * 0.06, z * 0.06, 5);
      const ridges = Math.abs(fbm(x * 0.11 + 12, z * 0.11 + 8, 3));
      let elev = 0.6 + base * 1.4 + hill * 3.2 - valley * 1.4 + ridges * 0.8;
      elev += Math.max(0, (x - MAP_SIZE * 0.7) / MAP_SIZE) * 4.0;
      let h = Math.round(elev);
      if (h < MIN_H) h = MIN_H;
      if (h > MAX_H) h = MAX_H;
      heights[hIndex(x, z)] = h;
      biomeNoise[hIndex(x, z)] = fbm(x * 0.08 + 100, z * 0.08 + 100, 3);
    }
  }
}
initHeights();

// ---------- Biomes ----------
function biomeFor(x, z, topY) {
  const b = biomeNoise[hIndex(x, z)];
  if (topY >= 6) return 'snow';
  if (topY >= 5) return 'rock';
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

// jitter HSL deterministe par cellule pour casser le plat
function jitterCol(out, x, z) {
  const j = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);
  const f = j - Math.floor(j);
  out.offsetHSL(0, 0, 0.06 * (f - 0.5));
}

// ---------- Chunks ----------
const chunks = [];
const chunkGroup = new THREE.Group();
scene.add(chunkGroup);

function makeChunkMesh(cx, cz) {
  const geom = new THREE.BufferGeometry();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0.0 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.cx = cx;
  mesh.userData.cz = cz;
  chunkGroup.add(mesh);
  return mesh;
}

function buildChunkGeometry(mesh) {
  const cx = mesh.userData.cx;
  const cz = mesh.userData.cz;
  const x0 = cx * CHUNK_SIZE;
  const z0 = cz * CHUNK_SIZE;

  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];

  function addFace(verts, nx, ny, nz, color) {
    const base = positions.length / 3;
    for (let i = 0; i < 4; i++) {
      positions.push(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]);
      normals.push(nx, ny, nz);
      colors.push(color.r, color.g, color.b);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const tmpCol = new THREE.Color();

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = x0 + lx;
      const wz = z0 + lz;
      const h = heights[hIndex(wx, wz)];
      const biome = biomeFor(wx, wz, h);

      const hN = (wz - 1 >= 0) ? heights[hIndex(wx, wz - 1)] : 0;
      const hS = (wz + 1 < MAP_SIZE) ? heights[hIndex(wx, wz + 1)] : 0;
      const hW = (wx - 1 >= 0) ? heights[hIndex(wx - 1, wz)] : 0;
      const hE = (wx + 1 < MAP_SIZE) ? heights[hIndex(wx + 1, wz)] : 0;

      const x = wx;
      const z = wz;

      // Face du dessus, ordre CCW vu d'au dessus (corrige le bug de winding)
      tmpCol.copy(colorForLayer(biome, h - 1, h));
      jitterCol(tmpCol, wx, wz);
      addFace([
        x,     h, z,
        x,     h, z + 1,
        x + 1, h, z + 1,
        x + 1, h, z,
      ], 0, 1, 0, tmpCol);

      function emitSide(neighH, dir) {
        const from = Math.max(neighH, 0);
        for (let y = from; y < h; y++) {
          tmpCol.copy(colorForLayer(biome, y, h));
          jitterCol(tmpCol, wx + y * 7, wz - y * 5);
          if (dir === 'N') {
            addFace([
              x + 1, y,     z,
              x,     y,     z,
              x,     y + 1, z,
              x + 1, y + 1, z,
            ], 0, 0, -1, tmpCol);
          } else if (dir === 'S') {
            addFace([
              x,     y,     z + 1,
              x + 1, y,     z + 1,
              x + 1, y + 1, z + 1,
              x,     y + 1, z + 1,
            ], 0, 0, 1, tmpCol);
          } else if (dir === 'W') {
            addFace([
              x, y,     z + 1,
              x, y,     z,
              x, y + 1, z,
              x, y + 1, z + 1,
            ], -1, 0, 0, tmpCol);
          } else if (dir === 'E') {
            addFace([
              x + 1, y,     z,
              x + 1, y,     z + 1,
              x + 1, y + 1, z + 1,
              x + 1, y + 1, z,
            ], 1, 0, 0, tmpCol);
          }
        }
      }

      emitSide(hN, 'N');
      emitSide(hS, 'S');
      emitSide(hW, 'W');
      emitSide(hE, 'E');
    }
  }

  const geom = mesh.geometry;
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeBoundingSphere();
  geom.computeBoundingBox();
}

for (let cz = 0; cz < CHUNKS_PER_SIDE; cz++) {
  chunks[cz] = [];
  for (let cx = 0; cx < CHUNKS_PER_SIDE; cx++) {
    const m = makeChunkMesh(cx, cz);
    chunks[cz][cx] = m;
    buildChunkGeometry(m);
  }
}

function rebuildChunksForColumn(wx, wz) {
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const toRebuild = new Set();
  toRebuild.add(cz * 100 + cx);

  const lx = wx % CHUNK_SIZE;
  const lz = wz % CHUNK_SIZE;
  if (lx === 0 && cx > 0) toRebuild.add(cz * 100 + (cx - 1));
  if (lx === CHUNK_SIZE - 1 && cx < CHUNKS_PER_SIDE - 1) toRebuild.add(cz * 100 + (cx + 1));
  if (lz === 0 && cz > 0) toRebuild.add((cz - 1) * 100 + cx);
  if (lz === CHUNK_SIZE - 1 && cz < CHUNKS_PER_SIDE - 1) toRebuild.add((cz + 1) * 100 + cx);

  for (const key of toRebuild) {
    const kx = key % 100;
    const kz = Math.floor(key / 100);
    buildChunkGeometry(chunks[kz][kx]);
  }
}

// ---------- Arbres voxel low poly ----------
const treeGroup = new THREE.Group();
scene.add(treeGroup);

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
  const x = Math.floor(seedRand() * MAP_SIZE);
  const z = Math.floor(seedRand() * MAP_SIZE);
  const top = heights[hIndex(x, z)];
  if (biomeFor(x, z, top) !== 'forest') continue;
  const t = makeTree();
  t.position.set(x + 0.5 + (seedRand() - 0.5) * 0.5, top, z + 0.5 + (seedRand() - 0.5) * 0.5);
  treeGroup.add(t);
  treesPlaced++;
}
for (let i = 0; i < 200 && treesPlaced < 100; i++) {
  const x = Math.floor(seedRand() * MAP_SIZE);
  const z = Math.floor(seedRand() * MAP_SIZE);
  const top = heights[hIndex(x, z)];
  if (biomeFor(x, z, top) !== 'grass') continue;
  if (seedRand() > 0.08) continue;
  const t = makeTree();
  t.position.set(x + 0.5, top, z + 0.5);
  t.scale.multiplyScalar(0.9);
  treeGroup.add(t);
  treesPlaced++;
}

// ---------- Eau ----------
const waterGeo = new THREE.PlaneGeometry(MAP_SIZE * 1.6, MAP_SIZE * 1.6, 64, 64);
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
      float w = sin(p.x * 0.35 + uTime * 0.8) * 0.05
              + sin(p.z * 0.28 + uTime * 0.6) * 0.04;
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
water.position.set(MAP_SIZE / 2, WATER_LEVEL, MAP_SIZE / 2);
scene.add(water);

// ---------- Post process ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.85, 0.92);
composer.addPass(bloom);

const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.55 },
    uSoftness: { value: 0.65 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    uniform float uSoftness;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float r = length(d);
      float v = smoothstep(0.75, uSoftness * 0.35, r);
      c.rgb *= mix(1.0 - uStrength, 1.0, v);
      c.rgb = mix(c.rgb, c.rgb * vec3(1.04, 0.99, 0.92), 1.0 - v);
      gl_FragColor = c;
    }
  `
};
composer.addPass(new ShaderPass(vignetteShader));
composer.addPass(new OutputPass());

// ---------- Curseur wireframe ----------
const cursorGeom = new THREE.BoxGeometry(1.02, 1.02, 1.02);
const cursorEdges = new THREE.EdgesGeometry(cursorGeom);
const cursorMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const cursor = new THREE.LineSegments(cursorEdges, cursorMat);
cursor.visible = false;
scene.add(cursor);

// ---------- Raycasting ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredTile = null;

function updatePointerFromEvent(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickTile() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(chunkGroup.children, false);
  if (!hits.length) return null;
  const hit = hits[0];
  const n = hit.face.normal;
  const p = hit.point.clone();
  if (Math.abs(n.y) > 0.5) {
    const x = Math.floor(p.x);
    const z = Math.floor(p.z);
    if (x < 0 || x >= MAP_SIZE || z < 0 || z >= MAP_SIZE) return null;
    return { x, z, h: heights[hIndex(x, z)] };
  } else {
    p.x -= n.x * 0.01;
    p.z -= n.z * 0.01;
    const x = Math.floor(p.x);
    const z = Math.floor(p.z);
    if (x < 0 || x >= MAP_SIZE || z < 0 || z >= MAP_SIZE) return null;
    return { x, z, h: heights[hIndex(x, z)] };
  }
}

// ---------- Outils, modes, pinceau ----------
let tool = 'nav'; // 'nav' | 'raise' | 'lower' | 'level'
let brush = 1;    // 1, 3, 5
let levelingTargetH = null;
let isDragging = false;

const tools = {
  nav: document.getElementById('tool-nav'),
  raise: document.getElementById('tool-raise'),
  lower: document.getElementById('tool-lower'),
  level: document.getElementById('tool-level'),
};
const brushes = {
  1: document.getElementById('brush-1'),
  3: document.getElementById('brush-3'),
  5: document.getElementById('brush-5'),
};

function applyMouseMappingForTool() {
  if (tool === 'nav') {
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
  } else {
    // Sculpt actif, clic gauche pour sculpter, pan reste a droite, zoom molette.
    // La rotation passe sur Shift plus clic gauche, geree manuellement plus bas.
    controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
  }
}
applyMouseMappingForTool();

function setTool(k) {
  tool = k;
  for (const kk of Object.keys(tools)) tools[kk].classList.toggle('active', kk === k);
  applyMouseMappingForTool();
  cursor.visible = false;
}

for (const k of Object.keys(tools)) {
  tools[k].addEventListener('click', () => setTool(k));
}
for (const k of Object.keys(brushes)) {
  brushes[k].addEventListener('click', () => {
    brush = parseInt(k, 10);
    for (const kk of Object.keys(brushes)) brushes[kk].classList.toggle('active', parseInt(kk, 10) === brush);
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setTool('nav');
});

function getBrushCells(cx, cz) {
  const out = [];
  if (brush === 1) {
    out.push([cx, cz]);
  } else if (brush === 3) {
    // croix 5 cases
    const offs = [[0,0],[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dx, dz] of offs) out.push([cx + dx, cz + dz]);
  } else if (brush === 5) {
    // disque rayon ~1.6 (13 cases)
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dz * dz <= 2.5) out.push([cx + dx, cz + dz]);
      }
    }
  }
  return out.filter(([x, z]) => x >= 0 && x < MAP_SIZE && z >= 0 && z < MAP_SIZE);
}

function applyTool(tile) {
  if (!tile) return;
  if (tool === 'nav') return;
  const cells = getBrushCells(tile.x, tile.z);
  const modified = [];
  for (const [x, z] of cells) {
    const idx = hIndex(x, z);
    const h = heights[idx];
    let nh = h;
    if (tool === 'raise') nh = Math.min(MAX_H, h + 1);
    else if (tool === 'lower') nh = Math.max(MIN_H, h - 1);
    else if (tool === 'level') {
      if (levelingTargetH !== null) nh = levelingTargetH;
    }
    if (nh !== h) {
      heights[idx] = nh;
      modified.push([x, z]);
    }
  }
  for (const [x, z] of modified) rebuildChunksForColumn(x, z);
}

// ---------- Evenements souris ----------
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

renderer.domElement.addEventListener('pointermove', (ev) => {
  updatePointerFromEvent(ev);
  if (tool === 'nav') {
    cursor.visible = false;
    hoveredTile = null;
    return;
  }
  const tile = pickTile();
  hoveredTile = tile;
  if (tile) {
    cursor.visible = true;
    cursor.position.set(tile.x + 0.5, tile.h + 0.51, tile.z + 0.5);
  } else {
    cursor.visible = false;
  }
  if (isDragging && tool === 'level' && tile) {
    applyTool(tile);
  }
});

renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0) return;
  if (tool === 'nav') return;
  // Shift plus clic gauche en mode sculpt, on laisse OrbitControls orbiter temporairement
  if (ev.shiftKey) {
    const prev = controls.mouseButtons.LEFT;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    const restore = () => {
      controls.mouseButtons.LEFT = prev;
      window.removeEventListener('pointerup', restore);
    };
    window.addEventListener('pointerup', restore);
    return;
  }
  updatePointerFromEvent(ev);
  const tile = pickTile();
  if (!tile) return;
  if (tool === 'level') {
    levelingTargetH = tile.h;
    isDragging = true;
  } else {
    applyTool(tile);
  }
});

renderer.domElement.addEventListener('pointerup', (ev) => {
  if (ev.button !== 0) return;
  isDragging = false;
  levelingTargetH = null;
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- FPS ----------
const fpsEl = document.getElementById('fps');
let fpsFrames = 0;
let fpsLast = performance.now();

// ---------- Boucle ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  waterMat.uniforms.uTime.value = t;
  controls.update();
  composer.render();

  fpsFrames++;
  const now = performance.now();
  if (now - fpsLast >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - fpsLast));
    fpsEl.textContent = 'FPS: ' + fps;
    fpsFrames = 0;
    fpsLast = now;
  }
}
loader.classList.add('hidden');
animate();
