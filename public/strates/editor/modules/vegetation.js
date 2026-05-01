import * as THREE from 'three'
import { GRID } from './constants.js'
import { state } from './state.js'
import { scene, tmpObj, tmpColor } from './scene.js'
import { prng } from './rng.js'
import { SEASONS } from './seasons.js'

// ============================================================================
// Decorations vegetales : epis de ble (biome field uniquement).
// Les brins d'herbe et fleurs ont ete supprimes (encombrement visuel sans
// gameplay). Seul wheatMesh reste, avec animation saisonniere.
// ============================================================================

const MAX_WHEAT = 4500

// ---------- epis de ble ----------
const wheatGeo = new THREE.BoxGeometry(0.04, 0.35, 0.04)
wheatGeo.translate(0, 0.175, 0)
const wheatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true })
export const wheatMesh = new THREE.InstancedMesh(wheatGeo, wheatMat, MAX_WHEAT)
wheatMesh.castShadow = false
wheatMesh.receiveShadow = true
wheatMesh.count = 0
wheatMesh.frustumCulled = false
wheatMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_WHEAT * 3), 3)
scene.add(wheatMesh)

let built = false
const wheatBaseY = new Float32Array(MAX_WHEAT)

export function buildVegetation() {
  const rng = prng.rng
  wheatMesh.count = 0

  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const k = z * GRID + x
      const surface = state.cellSurface[k]
      const top = state.cellTop[k]
      if (top <= 0) continue
      const y = top

      // champs : epis de ble disperses sur la tuile
      if (surface === 'field') {
        const nEpis = 6 + Math.floor(rng() * 4)
        for (let i = 0; i < nEpis; i++) {
          if (wheatMesh.count >= MAX_WHEAT) break
          const px = x + rng() * 0.9 + 0.05
          const pz = z + rng() * 0.9 + 0.05
          tmpObj.position.set(px, y, pz)
          tmpObj.rotation.set(0, rng() * Math.PI, 0)
          const h = 0.7 + rng() * 0.5
          tmpObj.scale.set(1, h, 1)
          tmpObj.updateMatrix()
          wheatMesh.setMatrixAt(wheatMesh.count, tmpObj.matrix)
          wheatBaseY[wheatMesh.count] = h
          tmpColor.setRGB(0.9, 0.78, 0.35)
          wheatMesh.setColorAt(wheatMesh.count, tmpColor)
          wheatMesh.count++
        }
      }
    }
  }
  wheatMesh.instanceMatrix.needsUpdate = true
  if (wheatMesh.instanceColor) wheatMesh.instanceColor.needsUpdate = true
  built = true
}

// Couleurs de ble par saison (semis -> pleine croissance -> moisson -> repos)
const WHEAT_COLORS = {
  spring: new THREE.Color(0.55, 0.85, 0.40), // vert tendre
  summer: new THREE.Color(0.90, 0.82, 0.35), // dore
  autumn: new THREE.Color(0.88, 0.65, 0.28), // moisson bronze
  winter: new THREE.Color(0.55, 0.52, 0.45)  // repos fane
}
const WHEAT_SCALE_Y = { spring: 0.7, summer: 1.0, autumn: 0.9, winter: 0.3 }

let lastAppliedSeasonId = null

function repaintWheat() {
  const id = SEASONS[state.season.idx].id
  const col = WHEAT_COLORS[id] || WHEAT_COLORS.summer
  const sy = WHEAT_SCALE_Y[id] || 1
  for (let i = 0; i < wheatMesh.count; i++) {
    tmpColor.copy(col).offsetHSL(((i * 0.137) % 1 - 0.5) * 0.03, 0, ((i * 0.271) % 1 - 0.5) * 0.08)
    wheatMesh.setColorAt(i, tmpColor)
    wheatMesh.getMatrixAt(i, tmpObj.matrix)
    tmpObj.matrix.decompose(tmpObj.position, tmpObj.quaternion, tmpObj.scale)
    const base = wheatBaseY[i] || 1
    tmpObj.scale.set(1, base * sy, 1)
    tmpObj.updateMatrix()
    wheatMesh.setMatrixAt(i, tmpObj.matrix)
  }
  wheatMesh.instanceMatrix.needsUpdate = true
  if (wheatMesh.instanceColor) wheatMesh.instanceColor.needsUpdate = true
}

export function tickVegetationSeasons() {
  if (!built) return
  const id = SEASONS[state.season.idx].id
  if (id === lastAppliedSeasonId) return
  lastAppliedSeasonId = id
  repaintWheat()
}

// reset total (appel au reset et au chargement de save)
export function clearVegetation() {
  wheatMesh.count = 0
  wheatMesh.instanceMatrix.needsUpdate = true
  built = false
  lastAppliedSeasonId = null
}
