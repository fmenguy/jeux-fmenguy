import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';

// Constantes monde
const MAX_HEIGHT = 6;
const CHUNK_SIZE = 16;
const WATER_LEVEL = 1.15;

// Palette biomes facon Dorfromantik (reprise de proto3)
const COL = {
  grass: new THREE.Color('#7cc06a'),
  grassDark: new THREE.Color('#5ea24d'),
  forest: new THREE.Color('#3f7a3a'),
  sand: new THREE.Color('#e8cf8e'),
  sandDark: new THREE.Color('#cfb374'),
  rock: new THREE.Color('#a8a196'),
  rockDark: new THREE.Color('#8a8378'),
  snow: new THREE.Color('#f2f2ee'),
  dirt: new THREE.Color('#8c6a43')
};

// Bruit de Perlin lisse (reprise de proto3)
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

// Heightmap Perlin FBM avec colline centrale, applati a la taille demandee
function makeHeightMap(size) {
  const h = new Uint8Array(size * size);
  const biome = new Uint8Array(size * size);
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const nz = z / size - 0.5;
      const hill = Math.max(0, 1 - (nx * nx + nz * nz) * 3.2);
      const base = fbm(x * 0.06, z * 0.06, 5);
      const ridges = Math.abs(fbm(x * 0.11 + 12, z * 0.11 + 8, 3));
      let elev = 0.6 + base * 1.4 + hill * 3.0 + ridges * 0.6;
      const top = Math.min(MAX_HEIGHT, Math.max(1, Math.round(elev)));
      h[z * size + x] = top;
      // bruit secondaire pour separer herbe et foret
      const b = fbm(x * 0.08 + 100, z * 0.08 + 100, 3);
      biome[z * size + x] = b > 0.12 ? 1 : 0; // 1 = forest, 0 = grass
    }
  }
  return { h, biome };
}

function biomeFor(top, biomeNoise) {
  if (top >= 5) return 'snow';
  if (top >= 4) return 'rock';
  if (top <= Math.ceil(WATER_LEVEL)) return 'sand';
  if (biomeNoise === 1) return 'forest';
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

function columnHeight(map, size, x, z) {
  if (x < 0 || z < 0 || x >= size || z >= size) return 0;
  return map[z * size + x];
}

// Construit la geometry d'un chunk via face culling
function buildChunkGeometry(heightMap, biomeMap, size, cx, cz) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let vertOffset = 0;

  const x0 = cx * CHUNK_SIZE;
  const z0 = cz * CHUNK_SIZE;
  const x1 = Math.min(x0 + CHUNK_SIZE, size);
  const z1 = Math.min(z0 + CHUNK_SIZE, size);

  const tmpColor = new THREE.Color();

  for (let z = z0; z < z1; z++) {
    for (let x = x0; x < x1; x++) {
      const top = columnHeight(heightMap, size, x, z);
      const biome = biomeFor(top, biomeMap[z * size + x]);
      for (let y = 0; y < top; y++) {
        const base = colorForLayer(biome, y, top);
        // jitter HSL par voxel pour casser le plat
        tmpColor.copy(base);
        const jitter = (Math.sin(x * 12.9898 + z * 78.233 + y * 37.719) * 43758.5453) % 1;
        const j = 0.06 * (jitter - Math.floor(jitter) - 0.5);
        tmpColor.offsetHSL(0, 0, j);

        if (y === top - 1) {
          addFace(positions, normals, colors, indices, vertOffset, 'top', x, y, z, tmpColor);
          vertOffset += 4;
        }
        if (columnHeight(heightMap, size, x + 1, z) <= y) {
          addFace(positions, normals, colors, indices, vertOffset, 'px', x, y, z, tmpColor);
          vertOffset += 4;
        }
        if (columnHeight(heightMap, size, x - 1, z) <= y) {
          addFace(positions, normals, colors, indices, vertOffset, 'nx', x, y, z, tmpColor);
          vertOffset += 4;
        }
        if (columnHeight(heightMap, size, x, z + 1) <= y) {
          addFace(positions, normals, colors, indices, vertOffset, 'pz', x, y, z, tmpColor);
          vertOffset += 4;
        }
        if (columnHeight(heightMap, size, x, z - 1) <= y) {
          addFace(positions, normals, colors, indices, vertOffset, 'nz', x, y, z, tmpColor);
          vertOffset += 4;
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

function addFace(positions, normals, colors, indices, vo, kind, x, y, z, col) {
  let v;
  let n;
  switch (kind) {
    case 'top':
      v = [x, y + 1, z, x, y + 1, z + 1, x + 1, y + 1, z + 1, x + 1, y + 1, z];
      n = [0, 1, 0];
      break;
    case 'px':
      v = [x + 1, y, z, x + 1, y + 1, z, x + 1, y + 1, z + 1, x + 1, y, z + 1];
      n = [1, 0, 0];
      break;
    case 'nx':
      v = [x, y, z + 1, x, y + 1, z + 1, x, y + 1, z, x, y, z];
      n = [-1, 0, 0];
      break;
    case 'pz':
      v = [x + 1, y, z + 1, x + 1, y + 1, z + 1, x, y + 1, z + 1, x, y, z + 1];
      n = [0, 0, 1];
      break;
    case 'nz':
      v = [x, y, z, x, y + 1, z, x + 1, y + 1, z, x + 1, y, z];
      n = [0, 0, -1];
      break;
  }
  for (let i = 0; i < 4; i++) {
    positions.push(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]);
    normals.push(n[0], n[1], n[2]);
    colors.push(col.r, col.g, col.b);
  }
  indices.push(vo, vo + 1, vo + 2, vo, vo + 2, vo + 3);
}

// Renderer AAA, ACES tonemapping, PCFSoft
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe6f5);
// fog exponentiel, aide aussi a masquer les chunks lointains sur 256
scene.fog = new THREE.FogExp2(0xcfe6f5, 0.012);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 800);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = false;

// Sky shader
const sky = new Sky();
sky.scale.setScalar(2000);
scene.add(sky);
const skyU = sky.material.uniforms;
skyU.turbidity.value = 6;
skyU.rayleigh.value = 1.6;
skyU.mieCoefficient.value = 0.006;
skyU.mieDirectionalG.value = 0.85;
const sunDir = new THREE.Vector3();
const phi = THREE.MathUtils.degToRad(60);
const theta = THREE.MathUtils.degToRad(135);
sunDir.setFromSphericalCoords(1, phi, theta);
skyU.sunPosition.value.copy(sunDir);

// Lumieres
const sun = new THREE.DirectionalLight(0xfff2d9, 2.4);
sun.castShadow = true;
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.05;
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xbcd7ff, 0x3a2a1a, 0.55);
scene.add(hemi);

// Materiau commun pour tous les chunks
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.92,
  metalness: 0.0,
  flatShading: true
});

let chunkGroup = new THREE.Group();
scene.add(chunkGroup);

function clearChunks() {
  for (const m of chunkGroup.children) {
    m.geometry.dispose();
  }
  scene.remove(chunkGroup);
  chunkGroup = new THREE.Group();
  scene.add(chunkGroup);
}

function buildWorld(size) {
  clearChunks();
  const { h: heightMap, biome: biomeMap } = makeHeightMap(size);
  const chunksPerSide = Math.ceil(size / CHUNK_SIZE);
  let totalTris = 0;
  for (let cz = 0; cz < chunksPerSide; cz++) {
    for (let cx = 0; cx < chunksPerSide; cx++) {
      const geo = buildChunkGeometry(heightMap, biomeMap, size, cx, cz);
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      chunkGroup.add(mesh);
      totalTris += (geo.index ? geo.index.count : 0) / 3;
    }
  }

  // Recentre camera
  const center = size / 2;
  controls.target.set(center, 3, center);
  camera.position.set(center + size * 0.7, size * 0.85, center + size * 0.7);
  controls.minDistance = size * 0.2;
  controls.maxDistance = size * 2.5;
  controls.update();

  // Cadrage soleil et ombres adaptees a la taille (shadowMap capee pour 256)
  sun.position.set(center + size * 0.6, size * 1.8, center + size * 0.4);
  sun.target.position.set(center, 0, center);
  const shadowExtent = size * 0.7;
  sun.shadow.camera.left = -shadowExtent;
  sun.shadow.camera.right = shadowExtent;
  sun.shadow.camera.top = shadowExtent;
  sun.shadow.camera.bottom = -shadowExtent;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = size * 4;
  // shadowMap proportionnelle, capee pour eviter cout enorme sur 256
  const shadowSize = size <= 64 ? 2048 : (size <= 128 ? 1536 : 1024);
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  if (sun.shadow.map) {
    sun.shadow.map.dispose();
    sun.shadow.map = null;
  }
  sun.shadow.camera.updateProjectionMatrix();

  // Fog adapte a la taille pour cacher les chunks au loin sur 256
  scene.fog.density = size <= 64 ? 0.012 : (size <= 128 ? 0.009 : 0.007);

  document.getElementById('size').textContent = size;
  document.getElementById('chunks').textContent = chunksPerSide * chunksPerSide;
  document.getElementById('tris').textContent = totalTris.toLocaleString('fr-FR');
}

// Post process, bloom doux et vignette chaude
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.85, 0.92);
composer.addPass(bloom);

const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.5 },
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
      c.rgb = mix(c.rgb, c.rgb * vec3(1.04, 0.99, 0.92), 1.0 - v);
      gl_FragColor = c;
    }
  `
};
composer.addPass(new ShaderPass(vignetteShader));
composer.addPass(new OutputPass());

// Resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Boutons stress-test
const btns = {
  64: document.getElementById('btn64'),
  128: document.getElementById('btn128'),
  256: document.getElementById('btn256')
};
function setActive(size) {
  for (const s of Object.keys(btns)) {
    btns[s].classList.toggle('active', Number(s) === size);
  }
}
btns[64].addEventListener('click', () => { setActive(64); buildWorld(64); });
btns[128].addEventListener('click', () => { setActive(128); buildWorld(128); });
btns[256].addEventListener('click', () => { setActive(256); buildWorld(256); });

// HUD FPS
let frames = 0;
let lastTime = performance.now();
const fpsEl = document.getElementById('fps');
const callsEl = document.getElementById('calls');

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
  frames++;
  const now = performance.now();
  if (now - lastTime >= 500) {
    const fps = (frames * 1000) / (now - lastTime);
    fpsEl.textContent = fps.toFixed(0);
    callsEl.textContent = renderer.info.render.calls;
    frames = 0;
    lastTime = now;
  }
}

buildWorld(64);
animate();
