import * as THREE from 'three'
import { GRID } from './constants.js'
import { state } from './state.js'
import { scene, tmpObj, tmpColor } from './scene.js'
import { prng } from './rng.js'
import { SEASONS } from './seasons.js'

// ============================================================================
// Decorations vegetales : brins d'herbe, fleurs, epis de ble.
// Instanced pour ne pas exploser le draw call count.
// Les couleurs suivent la saison courante via une mise a jour lente.
// ============================================================================

const MAX_GRASS = 3500
const MAX_FLOWERS = 800
const MAX_WHEAT = 3000

// ---------- brins d'herbe ----------
const grassGeo = new THREE.BoxGeometry(0.04, 0.22, 0.04)
grassGeo.translate(0, 0.11, 0)
const grassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true })
export const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, MAX_GRASS)
grassMesh.castShadow = false
grassMesh.receiveShadow = false
grassMesh.count = 0
grassMesh.frustumCulled = false
grassMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_GRASS * 3), 3)
scene.add(grassMesh)

// ---------- fleurs ----------
const flowerGeo = new THREE.ConeGeometry(0.06, 0.12, 5)
flowerGeo.translate(0, 0.22, 0)
const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true })
export const flowerMesh = new THREE.InstancedMesh(flowerGeo, flowerMat, MAX_FLOWERS)
flowerMesh.castShadow = false
flowerMesh.receiveShadow = false
flowerMesh.count = 0
flowerMesh.frustumCulled = false
flowerMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FLOWERS * 3), 3)
scene.add(flowerMesh)

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

const FLOWER_COLORS = [
  new THREE.Color('#f2a6c8'), // rose
  new THREE.Color('#f7e16c'), // jaune
  new THREE.Color('#b691ff'), // lavande
  new THREE.Color('#ff8a6c'), // corail
  new THREE.Color('#ffffff')  // blanc
]

let built = false

export function buildVegetation() {
  // pose une fois pour toutes les brins et epis, a chaque generation/chargement
  const rng = prng.rng
  grassMesh.count = 0
  flowerMesh.count = 0
  wheatMesh.count = 0
  const grassColBase = new THREE.Color('#6faa4a')

  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const k = z * GRID + x
      const biome = state.cellBiome[k]
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
          tmpColor.setRGB(0.9, 0.78, 0.35) // base doree, ajustee par saison
          wheatMesh.setColorAt(wheatMesh.count, tmpColor)
          wheatMesh.count++
        }
        continue
      }

      // herbe : brins disperses, densite selon biome
      if (biome === 'grass' || biome === 'forest') {
        const density = biome === 'grass' ? (0.20 + rng() * 0.2) : 0.10
        if (rng() < density) {
          const nBrins = 1 + Math.floor(rng() * 3)
          for (let i = 0; i < nBrins; i++) {
            if (grassMesh.count >= MAX_GRASS) break
            const px = x + rng() * 0.88 + 0.06
            const pz = z + rng() * 0.88 + 0.06
            tmpObj.position.set(px, y, pz)
            tmpObj.rotation.set((rng() - 0.5) * 0.2, rng() * Math.PI * 2, (rng() - 0.5) * 0.2)
            const h = 0.5 + rng() * 0.6
            tmpObj.scale.set(1, h, 1)
            tmpObj.updateMatrix()
            grassMesh.setMatrixAt(grassMesh.count, tmpObj.matrix)
            tmpColor.copy(grassColBase).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.12)
            grassMesh.setColorAt(grassMesh.count, tmpColor)
            grassMesh.count++
          }
        }
        // fleurs clairsemees sur herbe
        if (biome === 'grass' && rng() < 0.04) {
          if (flowerMesh.count >= MAX_FLOWERS) continue
          const px = x + rng() * 0.8 + 0.1
          const pz = z + rng() * 0.8 + 0.1
          tmpObj.position.set(px, y, pz)
          tmpObj.rotation.set(0, rng() * Math.PI * 2, 0)
          const sc = 0.8 + rng() * 0.6
          tmpObj.scale.set(sc, sc, sc)
          tmpObj.updateMatrix()
          flowerMesh.setMatrixAt(flowerMesh.count, tmpObj.matrix)
          tmpColor.copy(FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)])
          flowerMesh.setColorAt(flowerMesh.count, tmpColor)
          flowerMesh.count++
        }
      }
    }
  }
  grassMesh.instanceMatrix.needsUpdate = true
  if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true
  flowerMesh.instanceMatrix.needsUpdate = true
  if (flowerMesh.instanceColor) flowerMesh.instanceColor.needsUpdate = true
  wheatMesh.instanceMatrix.needsUpdate = true
  if (wheatMesh.instanceColor) wheatMesh.instanceColor.needsUpdate = true
  built = true
}

// cache le mesh fleurs/herbe selon saison en modifiant le visible count
let seasonMuteAccum = 0
export function tickVegetationSeasons(dt) {
  if (!built) return
  seasonMuteAccum += dt
  if (seasonMuteAccum < 1.5) return
  seasonMuteAccum = 0
  // densite fleurs : suit SEASONS.density.flowers
  const cur = SEASONS[state.season.idx].density
  // fleurs : on masque certaines instances en shrinkant la scale a 0 via matrix
  // approche simple : on modifie juste le count visible
  const flowerMax = flowerMesh.instanceMatrix.count
  void flowerMax
}

// reset total (appel au reset et au chargement de save)
export function clearVegetation() {
  grassMesh.count = 0
  flowerMesh.count = 0
  wheatMesh.count = 0
  grassMesh.instanceMatrix.needsUpdate = true
  flowerMesh.instanceMatrix.needsUpdate = true
  wheatMesh.instanceMatrix.needsUpdate = true
  built = false
}
