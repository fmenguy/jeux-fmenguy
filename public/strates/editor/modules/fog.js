import * as THREE from 'three'
import { GRID, MAX_STRATES } from './constants.js'
import { state } from './state.js'
import { scene, tmpObj } from './scene.js'

// ============================================================================
// Fog of war style Age of Empires.
//   0 = jamais vue : colonne de brume opaque blanc-bleu cotonneux qui cache
//       completement le contenu de la tuile jusqu'a une hauteur MAX_STRATES+2
//   1 = exploree : meme colonne mais semi-transparente grise (on voit le
//       terrain fige)
//   2 = actuellement visible : pas de fog
//
// Les entites (arbres, rochers, filons, buissons, maisons, labos, colons)
// sont masquees quand leur tuile est a 0. Visibles si 1 ou 2. Les colons
// sont toujours visibles car ils bougent et rendraient le jeu incompreh.
// ============================================================================

const COLONIST_VIEW = 7
const HOUSE_VIEW = 10
const RESEARCH_VIEW = 12

// Colonne de brume : un cube plat et haut qui depasse au-dessus du voxel top
// pour couvrir arbres et batiments.
const FOG_HEIGHT = MAX_STRATES + 3
const fogGeo = new THREE.BoxGeometry(1.02, FOG_HEIGHT, 1.02)
fogGeo.translate(0, FOG_HEIGHT / 2, 0)
const fogMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.95,
  depthWrite: false
})
export const fogMesh = new THREE.InstancedMesh(fogGeo, fogMat, GRID * GRID)
fogMesh.frustumCulled = false
fogMesh.renderOrder = 500
fogMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GRID * GRID * 3), 3)
scene.add(fogMesh)

const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0)
const tmpCol = new THREE.Color()

// palettes brume
const COL_UNSEEN = new THREE.Color(0.82, 0.86, 0.92)   // blanc-bleu cotonneux
const COL_EXPLORED = new THREE.Color(0.52, 0.56, 0.62) // gris plus sombre

let built = false

export function buildFog() {
  if (!state.visited) state.visited = new Uint8Array(GRID * GRID)
  // revelation initiale immediate autour des entites pour que le camp soit
  // visible des le premier frame au lieu d'attendre 0.6s
  recomputeVisibility(true)
  built = true
}

function placeFogCell(x, z, idx, visState) {
  if (visState === 2) {
    fogMesh.setMatrixAt(idx, HIDDEN_MATRIX)
    return
  }
  const top = state.cellTop ? state.cellTop[idx] : 0
  tmpObj.position.set(x + 0.5, top, z + 0.5)
  tmpObj.rotation.set(0, 0, 0)
  tmpObj.scale.set(1, 1, 1)
  tmpObj.updateMatrix()
  fogMesh.setMatrixAt(idx, tmpObj.matrix)
  if (visState === 0) tmpCol.copy(COL_UNSEEN)
  else tmpCol.copy(COL_EXPLORED)
  fogMesh.setColorAt(idx, tmpCol)
}

let accum = 0
const UPDATE_INTERVAL = 0.6

export function tickFog(dt) {
  if (!built) return
  accum += dt
  if (accum < UPDATE_INTERVAL) return
  accum = 0
  recomputeVisibility()
}

function revealAround(cx, cz, radius) {
  const r2 = radius * radius
  const x0 = Math.max(0, Math.floor(cx - radius))
  const x1 = Math.min(GRID - 1, Math.ceil(cx + radius))
  const z0 = Math.max(0, Math.floor(cz - radius))
  const z1 = Math.min(GRID - 1, Math.ceil(cz + radius))
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5) - cx
      const dz = (z + 0.5) - cz
      if (dx * dx + dz * dz <= r2) {
        state.visited[z * GRID + x] = 2
      }
    }
  }
}

function recomputeVisibility(forceApply) {
  if (!state.visited) return
  for (let i = 0; i < state.visited.length; i++) {
    if (state.visited[i] === 2) state.visited[i] = 1
  }
  for (const c of state.colonists) revealAround(c.tx, c.tz, COLONIST_VIEW)
  for (const h of state.houses) revealAround(h.x + 0.5, h.z + 0.5, HOUSE_VIEW)
  for (const r of state.researchHouses) revealAround(r.x + 0.5, r.z + 0.5, RESEARCH_VIEW)
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const idx = z * GRID + x
      placeFogCell(x, z, idx, state.visited[idx])
    }
  }
  fogMesh.instanceMatrix.needsUpdate = true
  if (fogMesh.instanceColor) fogMesh.instanceColor.needsUpdate = true
  applyEntityVisibility()
  void forceApply
}

// Masque les entites dont la tuile est "jamais vue" (0). En "explored" (1)
// ou "visible" (2) elles sont affichees (snapshot ou live).
function applyEntityVisibility() {
  // houses / research: Groups Three.js
  for (const h of state.houses) {
    const hidden = state.visited[h.z * GRID + h.x] === 0
    if (h.group) h.group.visible = !hidden
  }
  for (const r of state.researchHouses) {
    const hidden = state.visited[r.z * GRID + r.x] === 0
    if (r.group) r.group.visible = !hidden
  }
}

export function clearFog() {
  if (state.visited) state.visited.fill(0)
  built = false
}

// Revelation totale (debug ou scenario sans fog). Met tout a 2 (visible).
export function revealAll() {
  if (!state.visited) state.visited = new Uint8Array(GRID * GRID)
  for (let i = 0; i < state.visited.length; i++) state.visited[i] = 2
  if (built) {
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        placeFogCell(x, z, z * GRID + x, 2)
      }
    }
    fogMesh.instanceMatrix.needsUpdate = true
  }
}

export function isVisible(x, z) {
  if (!state.visited) return true
  return state.visited[z * GRID + x] === 2
}

export function wasExplored(x, z) {
  if (!state.visited) return true
  return state.visited[z * GRID + x] >= 1
}
