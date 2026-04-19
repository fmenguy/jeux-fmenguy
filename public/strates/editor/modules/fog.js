import * as THREE from 'three'
import { GRID } from './constants.js'
import { state } from './state.js'
import { scene, tmpObj } from './scene.js'

// ============================================================================
// Fog of war style Age of Empires : chaque cellule a 3 etats.
//   0 = jamais vue (noir opaque)
//   1 = exploree (gris semi-opaque)
//   2 = actuellement visible (pas de fog)
//
// Chaque entite (colon, maison, labo) a un rayon de vision. Les cellules
// dans le rayon passent a 2. Les cellules qui etaient a 2 mais ne sont plus
// en vision passent a 1.
//
// Rendu : un InstancedMesh de plans carres, un par cellule. Scale 1 si fog,
// 0 si visible. Couleur noir/gris selon etat.
// ============================================================================

const COLONIST_VIEW = 7
const HOUSE_VIEW = 10
const RESEARCH_VIEW = 12

const fogGeo = new THREE.PlaneGeometry(1.01, 1.01)
fogGeo.rotateX(-Math.PI / 2)
const fogMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 1,
  depthWrite: false
})
// instanceColor pour distinguer unseen (noir opaque) vs explored (gris opaque)
export const fogMesh = new THREE.InstancedMesh(fogGeo, fogMat, GRID * GRID)
fogMesh.frustumCulled = false
fogMesh.renderOrder = 500
fogMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GRID * GRID * 3), 3)
scene.add(fogMesh)

const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0)
const tmpCol = new THREE.Color()

let built = false

export function buildFog() {
  if (!state.visited) state.visited = new Uint8Array(GRID * GRID)
  fogMesh.count = GRID * GRID
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const idx = z * GRID + x
      placeFogCell(x, z, idx, state.visited[idx])
    }
  }
  fogMesh.instanceMatrix.needsUpdate = true
  if (fogMesh.instanceColor) fogMesh.instanceColor.needsUpdate = true
  built = true
}

function placeFogCell(x, z, idx, visState) {
  if (visState === 2) {
    fogMesh.setMatrixAt(idx, HIDDEN_MATRIX)
    return
  }
  const top = state.cellTop ? state.cellTop[idx] : 0
  tmpObj.position.set(x + 0.5, top + 0.02, z + 0.5)
  tmpObj.rotation.set(0, 0, 0)
  tmpObj.scale.set(1, 1, 1)
  tmpObj.updateMatrix()
  fogMesh.setMatrixAt(idx, tmpObj.matrix)
  if (visState === 0) tmpCol.setRGB(0.02, 0.02, 0.04)
  else tmpCol.setRGB(0.18, 0.20, 0.25)
  fogMesh.setColorAt(idx, tmpCol)
  // alpha via couleur (l'opacity est 1 sur le material pour ne pas re-setter)
  // Pour avoir une "alpha" par instance, on joue sur le fait que instanceColor
  // est un multiplicateur ; ici on veut un voile assez opaque donc on laisse
  // la couleur sombre faire le travail. On ajoute un discard via scale Y
  // pour explored vs unseen ?
  // Plus simple : explored = plane plus mince (scale Y = 0.5) pour laisser
  // voir un peu en dessous si on rend en cherchant l'effet.
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

function recomputeVisibility() {
  if (!state.visited) return
  // d'abord : toutes les cellules "2" (visibles) passent a "1" (exploree)
  for (let i = 0; i < state.visited.length; i++) {
    if (state.visited[i] === 2) state.visited[i] = 1
  }
  // puis : on revele autour de chaque entite
  for (const c of state.colonists) revealAround(c.tx, c.tz, COLONIST_VIEW)
  for (const h of state.houses) revealAround(h.x + 0.5, h.z + 0.5, HOUSE_VIEW)
  for (const r of state.researchHouses) revealAround(r.x + 0.5, r.z + 0.5, RESEARCH_VIEW)
  // update visuel
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const idx = z * GRID + x
      placeFogCell(x, z, idx, state.visited[idx])
    }
  }
  fogMesh.instanceMatrix.needsUpdate = true
  if (fogMesh.instanceColor) fogMesh.instanceColor.needsUpdate = true
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
