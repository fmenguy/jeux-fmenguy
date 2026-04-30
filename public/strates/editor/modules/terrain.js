import * as THREE from 'three'
import {
  GRID, MAX_STRATES, MIN_STRATES, WATER_LEVEL, SHALLOW_WATER_LEVEL,
  EDGE_DEEP_RING, EDGE_SHALLOW_RING, FALLOFF_SPAN, VOXEL, COL
} from './constants.js'
import { state } from './state.js'
import { fbm } from './rng.js'
import { scene, tmpObj, tmpColor, HIDDEN_MATRIX } from './scene.js'

// ============================================================================
// Terrain : heightmap, voxels instancies, eau, helpers.
// ============================================================================

const boxGeo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL)
const baseMat = new THREE.MeshStandardMaterial({
  vertexColors: false,
  roughness: 0.92,
  metalness: 0.0,
  flatShading: true
})

export function smoothstep01(a, b, v) {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function makeHeightmap() {
  const h = new Float32Array(GRID * GRID)
  const bn = new Float32Array(GRID * GRID)
  const cx = GRID / 2
  const cz = GRID / 2
  const SPAWN_FLAT_RADIUS = 15
  const SPAWN_FLAT_ELEV   = SHALLOW_WATER_LEVEL + 1.2  // ~2.8 → arrondi 3 = herbe
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const nx = x / GRID - 0.5
      const nz = z / GRID - 0.5
      const hill = Math.max(0, 1 - (nx * nx + nz * nz) * 3.2)
      const valley = Math.max(0, 0.7 - Math.abs((x - cx * 0.7) / (GRID * 0.18)))
      const base = fbm(x * 0.045, z * 0.045, 5)
      const ridges = Math.abs(fbm(x * 0.085 + 12, z * 0.085 + 8, 4))
      const peak = Math.pow(Math.max(0, fbm(x * 0.025 + 50, z * 0.025 + 50, 2)), 2) * 4
      let elev = 0.6 + base * 1.8 + hill * 3.4 - valley * 1.4 + ridges * 1.4 + peak
      elev += Math.max(0, (x - GRID * 0.7) / GRID) * 4.0

      const edgeDist = Math.min(x, z, GRID - 1 - x, GRID - 1 - z)
      if (edgeDist < EDGE_DEEP_RING) {
        elev = 0
      } else if (edgeDist < EDGE_DEEP_RING + EDGE_SHALLOW_RING) {
        const t = (edgeDist - EDGE_DEEP_RING) / EDGE_SHALLOW_RING
        elev = WATER_LEVEL + 0.1 + t * (SHALLOW_WATER_LEVEL - WATER_LEVEL - 0.2)
      } else {
        const falloff = smoothstep01(0, FALLOFF_SPAN, edgeDist - (EDGE_DEEP_RING + EDGE_SHALLOW_RING))
        elev = SHALLOW_WATER_LEVEL * (1 - falloff) + elev * falloff
      }

      // Terrain plat autour du spawn central (zone de village)
      const dx = x - cx, dz2 = z - cz
      const spawnDist = Math.sqrt(dx * dx + dz2 * dz2)
      if (spawnDist < SPAWN_FLAT_RADIUS) {
        const blend = spawnDist / SPAWN_FLAT_RADIUS
        elev = SPAWN_FLAT_ELEV + (elev - SPAWN_FLAT_ELEV) * blend * blend
      }

      h[z * GRID + x] = elev
      bn[z * GRID + x] = fbm(x * 0.08 + 100, z * 0.08 + 100, 3)
    }
  }
  return { h, bn }
}

export function biomeFor(x, z, topY) {
  const b = state.biomeNoise[z * GRID + x]
  if (topY >= 5) return 'snow'
  if (topY >= 4) return 'rock'
  if (topY <= SHALLOW_WATER_LEVEL + 0.4) return 'sand'
  if (b > 0.12) return 'forest'
  return 'grass'
}

// ---------- helpers eau ----------
export function isDeepWater(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return true
  return state.cellTop[z * GRID + x] < WATER_LEVEL
}
export function isShallowWater(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return false
  const t = state.cellTop[z * GRID + x]
  return t >= WATER_LEVEL && t <= SHALLOW_WATER_LEVEL
}
export function isAnyWater(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return true
  return state.cellTop[z * GRID + x] <= SHALLOW_WATER_LEVEL
}

export function colorForLayer(biome, y, top) {
  const isTop = (y === top - 1)
  switch (biome) {
    case 'snow': return isTop ? COL.snow : COL.rock
    case 'rock': return isTop ? COL.rock : COL.rockDark
    case 'sand': return isTop ? COL.sand : COL.sandDark
    case 'forest': return isTop ? COL.grassDark : COL.dirt
    case 'grass':
    default: return isTop ? COL.grass : COL.dirt
  }
}

export function surfaceColor(surface, fallback) {
  if (surface === 'field') return COL.field
  return fallback
}

export function buildTerrain() {
  const r = makeHeightmap()
  state.heightmap = r.h
  state.biomeNoise = r.bn

  state.cellTop = new Int16Array(GRID * GRID)
  state.cellBiome = new Array(GRID * GRID)
  state.cellSurface = new Array(GRID * GRID).fill(null)
  state.cellOre = new Array(GRID * GRID).fill(null)
  state.instanceIndex.length = 0
  for (let i = 0; i < GRID * GRID; i++) state.instanceIndex.push([])

  state.voxelCount = 0
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const e = state.heightmap[z * GRID + x]
      const edgeDist = Math.min(x, z, GRID - 1 - x, GRID - 1 - z)
      const minAllowed = (edgeDist < EDGE_DEEP_RING) ? 0 : MIN_STRATES
      const top = Math.min(MAX_STRATES, Math.max(minAllowed, Math.round(e)))
      state.cellTop[z * GRID + x] = top
      state.cellBiome[z * GRID + x] = biomeFor(x, z, top)
      state.voxelCount += top
    }
  }

  if (state.instanced) {
    scene.remove(state.instanced)
    state.instanced.dispose()
  }
  const capacity = state.voxelCount + GRID * GRID
  state.instanced = new THREE.InstancedMesh(boxGeo, baseMat, capacity)
  state.instanced.castShadow = true
  state.instanced.receiveShadow = true
  state.origColor = new Array(capacity)

  let idx = 0
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const top = state.cellTop[z * GRID + x]
      const biome = state.cellBiome[z * GRID + x]
      const colArr = state.instanceIndex[z * GRID + x]
      for (let y = 0; y < top; y++) {
        tmpObj.position.set(x + 0.5, y + 0.5, z + 0.5)
        tmpObj.updateMatrix()
        state.instanced.setMatrixAt(idx, tmpObj.matrix)
        const c = colorForLayer(biome, y, top)
        tmpColor.copy(c)
        const jitter = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1
        const j = 0.06 * (jitter - Math.floor(jitter) - 0.5)
        tmpColor.offsetHSL(0, 0, j)
        state.instanced.setColorAt(idx, tmpColor)
        state.origColor[idx] = tmpColor.clone()
        colArr[y] = idx
        idx++
      }
    }
  }
  for (let i = idx; i < capacity; i++) {
    state.instanced.setMatrixAt(i, HIDDEN_MATRIX)
    tmpColor.setRGB(1, 1, 1)
    state.instanced.setColorAt(i, tmpColor)
    state.origColor[i] = tmpColor.clone()
  }
  state.nextFreeVoxelIdx = idx
  state.instanced.count = capacity
  state.instanced.instanceMatrix.needsUpdate = true
  if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
  scene.add(state.instanced)
}

// Reconstruit l'InstancedMesh a partir de state.cellTop et state.cellBiome deja
// remplis (utile pour charger une sauvegarde sans regenerer le Perlin).
// cellSurface est applique ensuite via repaintCellSurface par le code appelant.
export function rebuildTerrainFromState() {
  state.instanceIndex.length = 0
  for (let i = 0; i < GRID * GRID; i++) state.instanceIndex.push([])

  state.voxelCount = 0
  for (let i = 0; i < state.cellTop.length; i++) state.voxelCount += state.cellTop[i]

  if (state.instanced) {
    scene.remove(state.instanced)
    state.instanced.dispose()
  }
  const capacity = state.voxelCount + GRID * GRID
  state.instanced = new THREE.InstancedMesh(boxGeo, baseMat, capacity)
  state.instanced.castShadow = true
  state.instanced.receiveShadow = true
  state.origColor = new Array(capacity)

  let idx = 0
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const top = state.cellTop[z * GRID + x]
      const biome = state.cellBiome[z * GRID + x]
      const colArr = state.instanceIndex[z * GRID + x]
      for (let y = 0; y < top; y++) {
        tmpObj.position.set(x + 0.5, y + 0.5, z + 0.5)
        tmpObj.updateMatrix()
        state.instanced.setMatrixAt(idx, tmpObj.matrix)
        const c = colorForLayer(biome, y, top)
        tmpColor.copy(c)
        const jitter = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1
        const j = 0.06 * (jitter - Math.floor(jitter) - 0.5)
        tmpColor.offsetHSL(0, 0, j)
        state.instanced.setColorAt(idx, tmpColor)
        state.origColor[idx] = tmpColor.clone()
        colArr[y] = idx
        idx++
      }
    }
  }
  for (let i = idx; i < capacity; i++) {
    state.instanced.setMatrixAt(i, HIDDEN_MATRIX)
    tmpColor.setRGB(1, 1, 1)
    state.instanced.setColorAt(i, tmpColor)
    state.origColor[i] = tmpColor.clone()
  }
  state.nextFreeVoxelIdx = idx
  state.instanced.count = capacity
  state.instanced.instanceMatrix.needsUpdate = true
  if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
  scene.add(state.instanced)
}

export function topVoxelIndex(x, z) {
  const top = state.cellTop[z * GRID + x]
  if (top <= 0) return -1
  return state.instanceIndex[z * GRID + x][top - 1]
}

export function repaintCellSurface(x, z) {
  const top = state.cellTop[z * GRID + x]
  const biome = state.cellBiome[z * GRID + x]
  const baseC = colorForLayer(biome, top - 1, top)
  const surface = state.cellSurface[z * GRID + x]
  const c = surfaceColor(surface, baseC)
  tmpColor.copy(c)
  if (surface === 'field') {
    if (x % 2 === 0) tmpColor.offsetHSL(0, 0, -0.04)
  } else {
    const jitter = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1
    const j = 0.06 * (jitter - Math.floor(jitter) - 0.5)
    tmpColor.offsetHSL(0, 0, j)
  }
  const i = topVoxelIndex(x, z)
  if (i < 0) return
  state.instanced.setColorAt(i, tmpColor)
  state.origColor[i].copy(tmpColor)
  state.instanced.instanceColor.needsUpdate = true
}

// ---------- eau ----------
const waterGeo = new THREE.PlaneGeometry(GRID * 1.6, GRID * 1.6, 64, 64)
waterGeo.rotateX(-Math.PI / 2)
export const waterMat = new THREE.ShaderMaterial({
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
})
export const water = new THREE.Mesh(waterGeo, waterMat)
water.position.set(GRID / 2, WATER_LEVEL, GRID / 2)
scene.add(water)

const shallowGeo = new THREE.PlaneGeometry(GRID * 1.6, GRID * 1.6, 48, 48)
shallowGeo.rotateX(-Math.PI / 2)
export const shallowMat = new THREE.ShaderMaterial({
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
})
export const shallowWater = new THREE.Mesh(shallowGeo, shallowMat)
shallowWater.position.set(GRID / 2, SHALLOW_WATER_LEVEL, GRID / 2)
scene.add(shallowWater)
