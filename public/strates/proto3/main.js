import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ---------- constantes monde ----------
const GRID = 48;
const MAX_STRATES = 6;
const WATER_LEVEL = 1.15;
const VOXEL = 1;

// ---------- bruit de valeur lisse (simple, sans dependance) ----------
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
controls.autoRotate = false;

// ---------- ciel via Sky shader ----------
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

// ---------- palette biomes facon Dorfromantik ----------
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
  path: new THREE.Color('#c9a878'),
  deep: new THREE.Color('#4a6d5a')
};

// ---------- carte d'altitudes ----------
function makeHeightmap() {
  const h = new Float32Array(GRID * GRID);
  const biomeNoise = new Float32Array(GRID * GRID);
  const cx = GRID / 2, cy = GRID / 2;
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const nx = x / GRID - 0.5;
      const nz = z / GRID - 0.5;
      // colline centrale douce
      const hill = Math.max(0, 1 - (nx * nx + nz * nz) * 3.2);
      // vallee lineaire nord sud decallee
      const valley = Math.max(0, 0.7 - Math.abs((x - cx * 0.7) / (GRID * 0.18)));
      const base = fbm(x * 0.06, z * 0.06, 5);
      const ridges = Math.abs(fbm(x * 0.11 + 12, z * 0.11 + 8, 3));
      let elev = 0.6 + base * 1.4 + hill * 3.2 - valley * 1.4 + ridges * 0.8;
      // relief cote est plus eleve pour faire la montagne
      elev += Math.max(0, (x - GRID * 0.7) / GRID) * 4.0;
      h[z * GRID + x] = elev;
      biomeNoise[z * GRID + x] = fbm(x * 0.08 + 100, z * 0.08 + 100, 3);
    }
  }
  return { h, biomeNoise };
}
const { h: heightmap, biomeNoise } = makeHeightmap();

function altitudeAt(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return 0;
  return heightmap[z * GRID + x];
}

// ---------- classification biome ----------
function biomeFor(x, z, topY) {
  const b = biomeNoise[z * GRID + x];
  if (topY >= 5) return 'snow';
  if (topY >= 4) return 'rock';
  if (topY <= WATER_LEVEL + 0.2) return 'sand';
  if (b > 0.12) return 'forest';
  return 'grass';
}

// ---------- geometrie voxel instanciee ----------
const boxGeo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
const baseMat = new THREE.MeshStandardMaterial({
  vertexColors: false,
  roughness: 0.92,
  metalness: 0.0,
  flatShading: true
});

// on compte puis on remplit
let voxelCount = 0;
const cellTop = new Int16Array(GRID * GRID);
const cellBiome = new Array(GRID * GRID);
for (let z = 0; z < GRID; z++) {
  for (let x = 0; x < GRID; x++) {
    const e = heightmap[z * GRID + x];
    const top = Math.min(MAX_STRATES, Math.max(1, Math.round(e)));
    cellTop[z * GRID + x] = top;
    cellBiome[z * GRID + x] = biomeFor(x, z, top);
    voxelCount += top;
  }
}

const instanced = new THREE.InstancedMesh(boxGeo, baseMat, voxelCount);
instanced.castShadow = true;
instanced.receiveShadow = true;

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();
let idx = 0;

function colorForLayer(biome, y, top) {
  const isTop = (y === top - 1);
  switch (biome) {
    case 'snow': return isTop ? COL.snow : COL.rock;
    case 'rock': return isTop ? (y === top - 1 ? COL.rock : COL.rockDark) : COL.rockDark;
    case 'sand': return isTop ? COL.sand : COL.sandDark;
    case 'forest': return isTop ? COL.grassDark : COL.dirt;
    case 'grass':
    default: return isTop ? COL.grass : COL.dirt;
  }
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
      // micro variation pour casser le plat
      const jitter = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
      const j = 0.06 * (jitter - Math.floor(jitter) - 0.5);
      tmpColor.offsetHSL(0, 0, j);
      instanced.setColorAt(idx, tmpColor);
      idx++;
    }
  }
}
instanced.instanceMatrix.needsUpdate = true;
if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
scene.add(instanced);

// ---------- chemin terre-clair ----------
(function tracePath() {
  const addBlock = (x, y, z, col) => {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, flatShading: true }));
    m.position.set(x + 0.5, y + 0.5, z + 0.5);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  };
  let px = 6, pz = GRID - 8;
  const tx = GRID - 12, tz = 10;
  for (let i = 0; i < 80; i++) {
    const top = cellTop[pz * GRID + px];
    const biome = cellBiome[pz * GRID + px];
    if (biome !== 'sand' && top >= 2 && top <= 4) {
      addBlock(px, top, pz, COL.path);
    }
    const dx = Math.sign(tx - px);
    const dz = Math.sign(tz - pz);
    if (Math.abs(tx - px) + Math.abs(tz - pz) < 2) break;
    if (seedRand() < 0.55) px += dx; else pz += dz;
    px = Math.max(1, Math.min(GRID - 2, px));
    pz = Math.max(1, Math.min(GRID - 2, pz));
  }
})();

// ---------- arbres voxel low poly ----------
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
for (let i = 0; i < 600 && treesPlaced < 80; i++) {
  const x = Math.floor(seedRand() * GRID);
  const z = Math.floor(seedRand() * GRID);
  if (cellBiome[z * GRID + x] !== 'forest') continue;
  const top = cellTop[z * GRID + x];
  const t = makeTree();
  t.position.set(x + 0.5 + (seedRand() - 0.5) * 0.5, top, z + 0.5 + (seedRand() - 0.5) * 0.5);
  scene.add(t);
  treesPlaced++;
}

// quelques arbres epars sur herbe
for (let i = 0; i < 200 && treesPlaced < 110; i++) {
  const x = Math.floor(seedRand() * GRID);
  const z = Math.floor(seedRand() * GRID);
  if (cellBiome[z * GRID + x] !== 'grass') continue;
  if (seedRand() > 0.08) continue;
  const top = cellTop[z * GRID + x];
  const t = makeTree();
  t.position.set(x + 0.5, top, z + 0.5);
  t.scale.multiplyScalar(0.9);
  scene.add(t);
  treesPlaced++;
}

// ---------- maisons voxel ----------
function makeHouse() {
  const g = new THREE.Group();
  const wallColors = [0xf2e6c9, 0xe6d2a8, 0xd9c79d];
  const roofColors = [0xb24e3a, 0xa04030, 0xc86a48];
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColors[Math.floor(seedRand() * 3)], roughness: 0.9, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[Math.floor(seedRand() * 3)], roughness: 0.85, flatShading: true });
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
  g.rotation.y = seedRand() * Math.PI * 2;
  return g;
}

let housesPlaced = 0;
for (let i = 0; i < 400 && housesPlaced < 6; i++) {
  const x = Math.floor(seedRand() * GRID);
  const z = Math.floor(seedRand() * GRID);
  if (cellBiome[z * GRID + x] !== 'grass') continue;
  const top = cellTop[z * GRID + x];
  if (top < 2 || top > 4) continue;
  const h = makeHouse();
  h.position.set(x + 0.5, top, z + 0.5);
  scene.add(h);
  housesPlaced++;
}

// ---------- eau, ShaderMaterial custom, vagues legeres ----------
const waterGeo = new THREE.PlaneGeometry(GRID * 1.6, GRID * 1.6, 64, 64);
waterGeo.rotateX(-Math.PI / 2);
const waterMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    uTime: { value: 0 },
    uShallow: { value: new THREE.Color('#7fc3b5') },
    uDeep: { value: new THREE.Color('#2e5a66') },
    uSun: { value: sun.position.clone().normalize() }
  },
  vertexShader: /* glsl */`
    uniform float uTime;
    varying vec2 vUv;
    varying float vWave;
    varying vec3 vWorld;
    void main() {
      vUv = uv;
      vec3 p = position;
      // houle tres legere, deux sinus croises
      float w = sin(p.x * 0.35 + uTime * 0.8) * 0.05
              + sin(p.z * 0.28 + uTime * 0.6) * 0.04;
      p.y += w;
      vWave = w;
      vec4 wp = modelMatrix * vec4(p, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform float uTime;
    uniform vec3 uShallow;
    uniform vec3 uDeep;
    uniform vec3 uSun;
    varying vec2 vUv;
    varying float vWave;
    varying vec3 vWorld;
    // reflets simples basees sur uv scroll
    void main() {
      vec2 uv = vUv * 6.0;
      float ripple = sin(uv.x * 3.0 + uTime * 1.2) * 0.5 + 0.5;
      ripple *= sin(uv.y * 2.4 - uTime * 0.8) * 0.5 + 0.5;
      vec3 col = mix(uDeep, uShallow, 0.55 + vWave * 2.0);
      col += vec3(0.85, 0.95, 1.0) * pow(ripple, 6.0) * 0.35;
      // fog tint pour fondre avec le ciel
      float alpha = 0.82;
      gl_FragColor = vec4(col, alpha);
    }
  `
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.set(GRID / 2, WATER_LEVEL, GRID / 2);
water.receiveShadow = false;
scene.add(water);

// ---------- post process, bloom doux et vignette ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.85, 0.92);
composer.addPass(bloom);

// shader de vignette maison, leger, teinte chaude dans les coins
const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.55 },
    uSoftness: { value: 0.65 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
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
      // teinte tres legere ambre
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
