import * as THREE from 'three'
import {
  GRID, MAX_STRATES, MIN_STRATES, WATER_LEVEL, SHALLOW_WATER_LEVEL,
  EDGE_DEEP_RING, EDGE_SHALLOW_RING, FALLOFF_SPAN, VOXEL, COL
} from './constants.js'
import { state } from './state.js'
import { fbm, prng } from './rng.js'
import { scene, tmpObj, tmpColor, HIDDEN_MATRIX } from './scene.js'

// ============================================================================
// Terrain : heightmap, voxels instancies, eau, helpers.
// ============================================================================

const FERTILE_TINT = new THREE.Color(0xd4a843)

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
        const f3 = falloff * falloff * falloff
        elev = SHALLOW_WATER_LEVEL * (1 - f3) + elev * f3
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
  if (topY <= 1) return 'water'
  if (topY <= SHALLOW_WATER_LEVEL + 0.4) return 'sand'
  if (b > 0.10) return 'forest'
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
    case 'snow':   return isTop ? COL.snow     : COL.rock
    case 'rock':   return isTop ? COL.rock     : COL.rockDark
    case 'sand':   return isTop ? COL.sand     : COL.sandDark
    case 'water':  return isTop ? COL.water    : COL.waterDark
    case 'forest': return isTop ? COL.grassDark : COL.dirt
    case 'grass':
    default:       return isTop ? COL.grass    : COL.dirt
  }
}

export function surfaceColor(surface, fallback) {
  if (surface === 'field') return COL.field
  return fallback
}

// Creuse 1-2 rivieres par descente de gradient depuis les montagnes.
// Modifie h en place avant que buildTerrain calcule cellTop.
function carveRivers(h) {
  const rng = prng.seedRand
  const cx = GRID / 2, cz = GRID / 2
  const RIVER_ELEV = SHALLOW_WATER_LEVEL - 0.3   // 1.3, s'arrondit a 1 = eau
  const RIVER_EDGE_ELEV = SHALLOW_WATER_LEVEL     // cellules bordure legerement plus hautes

  // Chercher des points de depart en altitude (montagne) eloignes du centre
  const candidates = []
  for (let z = 5; z < GRID - 5; z++) {
    for (let x = 5; x < GRID - 5; x++) {
      const dist = Math.abs(x - cx) + Math.abs(z - cz)
      if (h[z * GRID + x] >= 5.0 && dist > 28) candidates.push([x, z])
    }
  }
  if (candidates.length === 0) return

  const riverCount = 1 + Math.floor(rng() * 2)
  const used = new Set()
  for (let r = 0; r < riverCount; r++) {
    if (candidates.length === 0) break
    const si = Math.floor(rng() * candidates.length)
    let [x, z] = candidates.splice(si, 1)[0]

    const maxLen = 28 + Math.floor(rng() * 18)
    const visited = new Set()

    for (let step = 0; step < maxLen; step++) {
      if (x < 1 || z < 1 || x >= GRID - 1 || z >= GRID - 1) break
      const k = z * GRID + x
      if (h[k] <= SHALLOW_WATER_LEVEL) break

      visited.add(k)
      used.add(k)
      h[k] = RIVER_ELEV

      // Berge: creuser legerement 1 cellule adjacente (largeur de riviere)
      if (rng() < 0.55) {
        const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        const s = sides[Math.floor(rng() * 4)]
        const bx = x + s[0], bz = z + s[1]
        if (bx >= 0 && bz >= 0 && bx < GRID && bz < GRID) {
          const bk = bz * GRID + bx
          if (!used.has(bk)) h[bk] = Math.min(h[bk], RIVER_EDGE_ELEV)
        }
      }

      // Descendre vers le voisin le plus bas non visite
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      let bestH = Infinity, nx = -1, nz = -1
      for (const [dx, dz] of dirs) {
        const tx = x + dx, tz = z + dz
        if (tx < 0 || tz < 0 || tx >= GRID || tz >= GRID) continue
        const tk = tz * GRID + tx
        if (visited.has(tk)) continue
        if (h[tk] < bestH) { bestH = h[tk]; nx = tx; nz = tz }
      }
      if (nx < 0) break
      x = nx; z = nz
    }
  }
}

export function buildTerrain() {
  const r = makeHeightmap()
  state.heightmap = r.h
  state.biomeNoise = r.bn
  carveRivers(state.heightmap)

  state.cellTop = new Int16Array(GRID * GRID)
  state.cellBiome = new Array(GRID * GRID)
  state.cellSurface = new Array(GRID * GRID).fill(null)
  state.cellFertile = new Uint8Array(GRID * GRID)
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

  // Post-process : sable de rive (cellules non-eau a distance <= 2 d'une cellule eau)
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const k = z * GRID + x
      const bk = state.cellBiome[k]
      if (bk === 'water' || bk === 'sand') continue
      if (state.cellTop[k] > 3) continue
      let near = false
      outer: for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dz) > 2) continue
          const nx = x + dx, nz2 = z + dz
          if (nx < 0 || nz2 < 0 || nx >= GRID || nz2 >= GRID) continue
          if (state.cellBiome[nz2 * GRID + nx] === 'water') { near = true; break outer }
        }
      }
      if (near) state.cellBiome[k] = 'sand'
    }
  }

  // Zones fertiles : herbe ou foret avec biomeNoise faible OU proche de l eau/sable
  computeFertileCells()

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
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      if (state.cellFertile[z * GRID + x]) repaintCellSurface(x, z)
    }
  }
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

// Calcule l'indicateur cellFertile pour chaque cellule.
// Une cellule est fertile si son biome est 'grass' ou 'forest' ET
// (biomeNoise < 0.4 OU distance Manhattan <= 3 d une cellule eau ou sable).
export function computeFertileCells() {
  if (!state.cellFertile || state.cellFertile.length !== GRID * GRID) {
    state.cellFertile = new Uint8Array(GRID * GRID)
  } else {
    state.cellFertile.fill(0)
  }
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const k = z * GRID + x
      const biome = state.cellBiome[k]
      if (biome !== 'grass' && biome !== 'forest') continue
      const noiseLow = state.biomeNoise[k] < 0.4
      let nearWaterOrSand = false
      if (!noiseLow) {
        outer: for (let dz = -3; dz <= 3; dz++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (Math.abs(dx) + Math.abs(dz) > 3) continue
            const nx = x + dx, nz = z + dz
            if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue
            const nb = state.cellBiome[nz * GRID + nx]
            if (nb === 'water' || nb === 'sand') { nearWaterOrSand = true; break outer }
          }
        }
      }
      if (noiseLow || nearWaterOrSand) state.cellFertile[k] = 1
    }
  }
}

export function topVoxelIndex(x, z) {
  const top = state.cellTop[z * GRID + x]
  if (top <= 0) return -1
  return state.instanceIndex[z * GRID + x][top - 1]
}

export function repaintCellSurface(x, z) {
  const top = state.cellTop[z * GRID + x]
  const k = z * GRID + x
  const biome = state.cellBiome[k]
  const baseC = colorForLayer(biome, top - 1, top)
  const surface = state.cellSurface[k]
  const c = surfaceColor(surface, baseC)
  tmpColor.copy(c)
  if (surface === 'field') {
    if (x % 2 === 0) tmpColor.offsetHSL(0, 0, -0.04)
  } else {
    const jitter = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1
    const j = 0.06 * (jitter - Math.floor(jitter) - 0.5)
    tmpColor.offsetHSL(0, 0, j)
    if (state.cellFertile && state.cellFertile[k]) {
      tmpColor.lerp(FERTILE_TINT, 0.28)
    }
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
