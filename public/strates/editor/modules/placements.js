import * as THREE from 'three'
import {
  GRID, SHALLOW_WATER_LEVEL, MAX_TREES, MAX_ROCKS, MAX_ORES, MAX_CRYSTALS,
  MAX_BUSHES, MAX_BUSH_LEAVES, MAX_BUSH_BERRIES, BERRIES_PER_BUSH, ORE_TYPES,
  COOK_DURATION, FIELD_GROWTH_DURATION
} from './constants.js'
import { state } from './state.js'
import { prng } from './rng.js'
import { scene, tmpObj, tmpColor } from './scene.js'
import { repaintCellSurface, setOnCellRevealed, revealAround } from './terrain.js'
import { showHudToast } from './ui/research-popup.js'
import { findApproach } from './pathfind.js'
import { dlog, dwarn } from './debug.js'
import { getBuildingById } from './gamedata.js'
import { getModel, getModelClips, TREE_GLB_SCALE, ROCK_GLB_SCALE, DEER_GLB_SCALE, FARM_GLB_SCALE } from './glb-cache.js'

// ============================================================================
// Lot B (engine) : phase de construction. Tout batiment dont la definition
// JSON declare buildTime > 0 est marque "isUnderConstruction" au placement.
// Les flags constructionProgress (0..1) et buildTime (s) sont lus par :
//   - colonist.js (etat BUILDER, fait progresser le chantier)
//   - construction-fx.js (transparence et barre de progres)
//   - les call-sites qui doivent ignorer un batiment non termine (chercheur
//     qui ne s assigne pas a une hutte en chantier, etc.).
// Les batiments dont buildTime == 0 ou absent sont consideres immediatement
// actifs (compat retro avec les comportements existants).
// ============================================================================
function _markUnderConstruction(entry, buildingId) {
  if (!entry) return entry
  entry.buildingId = buildingId
  const def = getBuildingById(buildingId)
  const bt = def && typeof def.buildTime === 'number' ? def.buildTime : 0
  if (bt > 0) {
    entry.isUnderConstruction = true
    entry.constructionProgress = 0
    entry.buildTime = bt
  } else {
    entry.isUnderConstruction = false
    entry.constructionProgress = 1
    entry.buildTime = 0
  }
  return entry
}

// ============================================================================
// Arbres (trunk + leaf InstancedMesh)
// ============================================================================
const trunkGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35)
trunkGeo.translate(0, 0.5, 0)
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.95, flatShading: true })
export const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, MAX_TREES)
trunkMesh.castShadow = true
trunkMesh.receiveShadow = true
trunkMesh.count = 0
trunkMesh.frustumCulled = false
trunkMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES * 3).fill(1), 3)
scene.add(trunkMesh)

const leafGeo = new THREE.ConeGeometry(0.95, 2.6, 6)
leafGeo.translate(0, 2.2, 0)
const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.85, flatShading: true })
export const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, MAX_TREES)
leafMesh.castShadow = true
leafMesh.receiveShadow = true
leafMesh.count = 0
leafMesh.frustumCulled = false
leafMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES * 3), 3)
scene.add(leafMesh)

function stageMultiplier(growth) {
  if (growth < 0.33) return 0.25
  if (growth < 0.66) return 0.55
  return 1.0
}

// Identifie le stade discret d'un arbre (0, 1 ou 2) pour ne mettre a jour le
// visuel qu'au franchissement d'un seuil et eviter une croissance visible en
// continu, qui rendait la scene confuse (tous les arbres semblaient grandir
// en temps reel).
function growthStage(growth) {
  if (growth < 0.33) return 0
  if (growth < 0.66) return 1
  return 2
}

function applyTreeMatrix(t) {
  const s = t.targetScale * stageMultiplier(t.growth)
  if (t.group) {
    t.group.scale.setScalar(s * TREE_GLB_SCALE)
    return
  }
  tmpObj.position.set(t.x + 0.5 + t.jx, t.top, t.z + 0.5 + t.jz)
  tmpObj.rotation.set(0, t.rot, 0)
  tmpObj.scale.setScalar(s)
  tmpObj.updateMatrix()
  trunkMesh.setMatrixAt(t.slot, tmpObj.matrix)
  leafMesh.setMatrixAt(t.slot, tmpObj.matrix)
}

export function isTreeMature(x, z) {
  const t = state.trees.find(t => t.x === x && t.z === z)
  return t != null && t.growth >= 0.66
}

export function addTree(gx, gz, opts) {
  if (state.trees.length >= MAX_TREES) return
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return
  const rng = prng.rng
  const jx = (rng() - 0.5) * 0.6
  const jz = (rng() - 0.5) * 0.6
  const scale = 0.8 + rng() * 0.5
  const rot = rng() * Math.PI * 2
  const growing = opts && opts.growing
  const growth = (opts && opts.growth != null) ? opts.growth : (growing ? 0.12 : 1)

  const model = getModel('tree')
  if (model) {
    // Scale base sur stageMultiplier (par seuils) pour rester coherent avec
    // tickTreeGrowth et eviter toute mise a jour continue de la scale GLB.
    model.scale.setScalar(scale * stageMultiplier(growth) * TREE_GLB_SCALE)
    model.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz)
    model.rotation.y = rot
    model.traverse(function(o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(model)
    const entry = { x: gx, z: gz, jx, jz, rot, top, targetScale: scale, growth, stage: growthStage(growth), group: model }
    state.trees.push(entry)
    return entry
  }

  // Fallback instanced procedural
  const slot = state.trees.length
  const entry = { x: gx, z: gz, slot, jx, jz, rot, top, targetScale: scale, growth, stage: growthStage(growth) }
  applyTreeMatrix(entry)
  tmpColor.setHSL(0.28 + (rng() - 0.5) * 0.06, 0.5 + rng() * 0.15, 0.32 + rng() * 0.1)
  entry.leafColor = tmpColor.clone()
  leafMesh.setColorAt(slot, tmpColor)
  entry.trunkColor = new THREE.Color(0x6b4a2b)
  trunkMesh.setColorAt(slot, entry.trunkColor)
  trunkMesh.count = slot + 1
  leafMesh.count = slot + 1
  trunkMesh.instanceMatrix.needsUpdate = true
  trunkMesh.instanceColor.needsUpdate = true
  leafMesh.instanceMatrix.needsUpdate = true
  if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true
  state.trees.push(entry)
  return entry
}

export function removeTreesIn(cells) {
  if (!state.trees.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  const toRemove = state.trees.filter(t => cellSet.has(t.z * GRID + t.x))
  if (!toRemove.length) return

  // 1) Retire chirurgicalement les arbres GLB cibles de la scene.
  for (const t of toRemove) {
    if (t.group) {
      scene.remove(t.group)
      t.group.traverse(o => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
          else o.material.dispose()
        }
      })
    }
  }

  // 2) Reconstitue la liste des arbres preserves.
  const kept = state.trees.filter(t => !cellSet.has(t.z * GRID + t.x))

  // 3) Si certains arbres preserves utilisaient le fallback instanced
  // (sans group), il faut reattribuer les slots et remettre a jour les
  // InstancedMesh trunk/leaf. Sinon (tout en GLB), rien a faire cote mesh.
  const hasInstanced = kept.some(t => !t.group)
  if (hasInstanced) {
    trunkMesh.count = 0
    leafMesh.count = 0
    for (const t of kept) {
      if (t.group) continue
      const slot = trunkMesh.count
      t.slot = slot
      applyTreeMatrix(t)
      trunkMesh.count = slot + 1
      leafMesh.count = slot + 1
    }
    trunkMesh.instanceMatrix.needsUpdate = true
    leafMesh.instanceMatrix.needsUpdate = true
  }

  state.trees.length = 0
  for (const t of kept) state.trees.push(t)
}

// animation de pousse : chaque arbre avec growth < 1 grandit sur ~480 s (8 min)
// La scale visuelle ne change qu'au franchissement d'un seuil de stade
// (0 < 0.33 < 0.66 < 1), ce qui evite l'effet "tous les arbres grandissent en
// temps reel". La valeur growth elle-meme continue d'avancer en continu pour
// que isTreeMature() (>= 0.66) reste precis.
export function tickTreeGrowth(dt) {
  if (!state.trees.length) return
  let instancedChanged = false
  const RATE = 1 / 480
  for (const t of state.trees) {
    if (t.growth >= 1) continue
    const before = t.stage != null ? t.stage : growthStage(t.growth)
    t.growth = Math.min(1, t.growth + dt * RATE)
    const after = growthStage(t.growth)
    if (after !== before) {
      t.stage = after
      applyTreeMatrix(t)
      if (!t.group) instancedChanged = true
    }
  }
  if (instancedChanged) {
    trunkMesh.instanceMatrix.needsUpdate = true
    leafMesh.instanceMatrix.needsUpdate = true
  }
}

// ============================================================================
// Rochers : tas de 2 a 3 cailloux ramasses au sol (chaque rocher consomme
// jusqu'a 3 instances dans l'InstancedMesh, d'ou la capacite x3).
// ============================================================================
const ROCK_INSTANCE_CAP = MAX_ROCKS * 3
const rockGeo = new THREE.BoxGeometry(0.55, 0.45, 0.55)
rockGeo.translate(0, 0.225, 0)
const rockMatInst = new THREE.MeshStandardMaterial({ color: 0xa0998e, roughness: 0.95, flatShading: true })
export const rockMesh = new THREE.InstancedMesh(rockGeo, rockMatInst, ROCK_INSTANCE_CAP)
rockMesh.castShadow = true
rockMesh.receiveShadow = true
rockMesh.count = 0
rockMesh.frustumCulled = false
rockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ROCK_INSTANCE_CAP * 3), 3)
scene.add(rockMesh)

function placeRockChunk(i, cx, cy, cz, sx, sy, sz, rotY, g) {
  tmpObj.position.set(cx, cy, cz)
  tmpObj.rotation.set(0, rotY, 0)
  tmpObj.scale.set(sx, sy, sz)
  tmpObj.updateMatrix()
  rockMesh.setMatrixAt(i, tmpObj.matrix)
  tmpColor.setRGB(g, g * 0.98, g * 0.95)
  rockMesh.setColorAt(i, tmpColor)
}

export function addRock(gx, gz) {
  if (state.rocks.length >= MAX_ROCKS) return
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return
  const rng = prng.rng

  const model = getModel('rock')
  if (model) {
    const s = (0.7 + rng() * 0.5) * ROCK_GLB_SCALE
    model.scale.setScalar(s)
    model.position.set(gx + 0.5 + (rng() - 0.5) * 0.3, top, gz + 0.5 + (rng() - 0.5) * 0.3)
    model.rotation.y = rng() * Math.PI * 2
    model.traverse(function(o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(model)
    state.rocks.push({ x: gx, z: gz, group: model })
    return model
  }

  // Fallback instanced procedural
  const baseX = gx + 0.5
  const baseZ = gz + 0.5
  const startIdx = rockMesh.count
  const chunkCount = 2 + Math.floor(rng() * 2) // 2 ou 3 cailloux
  const indices = []
  const chunkColors = []
  for (let k = 0; k < chunkCount; k++) {
    if (rockMesh.count >= ROCK_INSTANCE_CAP) break
    const i = rockMesh.count
    const ang = rng() * Math.PI * 2
    const dist = k === 0 ? 0 : 0.18 + rng() * 0.22
    const cx = baseX + Math.cos(ang) * dist
    const cz = baseZ + Math.sin(ang) * dist
    const baseScale = k === 0 ? (0.85 + rng() * 0.35) : (0.5 + rng() * 0.35)
    const sx = baseScale
    const sz = baseScale * (0.85 + rng() * 0.3)
    const sy = baseScale * (0.55 + rng() * 0.25)
    const rotY = rng() * Math.PI * 2
    const g = 0.55 + rng() * 0.15
    placeRockChunk(i, cx, top, cz, sx, sy, sz, rotY, g)
    chunkColors.push(new THREE.Color(g, g * 0.98, g * 0.95))
    rockMesh.count = i + 1
    indices.push(i)
  }
  rockMesh.instanceMatrix.needsUpdate = true
  if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true
  state.rocks.push({ x: gx, z: gz, indices, chunkColors })
  return startIdx
}

export function removeRocksIn(cells) {
  if (!state.rocks.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  const toRemove = state.rocks.filter(r => cellSet.has(r.z * GRID + r.x))
  const kept = state.rocks.filter(r => !cellSet.has(r.z * GRID + r.x))
  if (kept.length === state.rocks.length) return
  for (const r of toRemove) { if (r.group) scene.remove(r.group) }
  state.rocks.length = 0
  rockMesh.count = 0
  for (const r of kept) addRock(r.x, r.z)
}

// ============================================================================
// Filons (oreRock + crystal)
// ============================================================================
const oreRockGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7)
oreRockGeo.translate(0, 0.3, 0)
const oreRockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.25, flatShading: true })
export const oreRockMesh = new THREE.InstancedMesh(oreRockGeo, oreRockMat, MAX_ORES)
oreRockMesh.castShadow = true
oreRockMesh.receiveShadow = true
oreRockMesh.count = 0
oreRockMesh.frustumCulled = false
oreRockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ORES * 3), 3)
scene.add(oreRockMesh)

const crystalGeo = new THREE.BoxGeometry(0.2, 0.3, 0.2)
crystalGeo.translate(0, 0.15, 0)
const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.45, flatShading: true })
export const crystalMesh = new THREE.InstancedMesh(crystalGeo, crystalMat, MAX_CRYSTALS)
crystalMesh.castShadow = true
crystalMesh.count = 0
crystalMesh.frustumCulled = false
crystalMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CRYSTALS * 3), 3)
scene.add(crystalMesh)

export function addOre(gx, gz, type) {
  if (state.ores.length >= MAX_ORES) return
  const def = ORE_TYPES[type]
  if (!def) return
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return
  const rng = prng.rng
  const jx = (rng() - 0.5) * 0.25
  const jz = (rng() - 0.5) * 0.25
  const rot = rng() * Math.PI * 2
  const scale = 0.85 + rng() * 0.3

  const ri = oreRockMesh.count
  tmpObj.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz)
  tmpObj.rotation.set(0, rot, 0)
  tmpObj.scale.set(scale, 0.8 + rng() * 0.5, scale)
  tmpObj.updateMatrix()
  oreRockMesh.setMatrixAt(ri, tmpObj.matrix)
  tmpColor.copy(def.rock)
  tmpColor.offsetHSL(0, 0, (rng() - 0.5) * 0.06)
  oreRockMesh.setColorAt(ri, tmpColor)
  const oreRockColor = tmpColor.clone()
  oreRockMesh.count = ri + 1

  const nCrystals = 2 + Math.floor(rng() * 3)
  const baseY = top + 0.4
  const crystalSlots = []
  const crystalColors = []
  for (let k = 0; k < nCrystals; k++) {
    const ci = crystalMesh.count
    const cx = gx + 0.5 + jx + (rng() - 0.5) * 0.4
    const cz = gz + 0.5 + jz + (rng() - 0.5) * 0.4
    const cy = baseY + (rng() - 0.5) * 0.08
    tmpObj.position.set(cx, cy, cz)
    tmpObj.rotation.set((rng() - 0.5) * 0.6, rng() * Math.PI * 2, (rng() - 0.5) * 0.6)
    const cs = 0.8 + rng() * 0.7
    tmpObj.scale.set(cs, 0.8 + rng() * 0.8, cs)
    tmpObj.updateMatrix()
    crystalMesh.setMatrixAt(ci, tmpObj.matrix)
    tmpColor.copy(def.crystal)
    tmpColor.offsetHSL(0, 0, (rng() - 0.5) * 0.05)
    crystalMesh.setColorAt(ci, tmpColor)
    crystalSlots.push(ci)
    crystalColors.push(tmpColor.clone())
    crystalMesh.count = ci + 1
  }

  oreRockMesh.instanceMatrix.needsUpdate = true
  if (oreRockMesh.instanceColor) oreRockMesh.instanceColor.needsUpdate = true
  crystalMesh.instanceMatrix.needsUpdate = true
  if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true

  state.ores.push({ x: gx, z: gz, type, oreRockSlot: ri, oreRockColor, crystalSlots, crystalColors })
  state.cellOre[gz * GRID + gx] = type
}

export function rebuildOres(kept) {
  state.ores.length = 0
  oreRockMesh.count = 0
  crystalMesh.count = 0
  for (let i = 0; i < state.cellOre.length; i++) state.cellOre[i] = null
  for (const o of kept) addOre(o.x, o.z, o.type)
}

export function removeOresIn(cells) {
  if (!state.ores.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  const kept = state.ores.filter(o => !cellSet.has(o.z * GRID + o.x))
  if (kept.length === state.ores.length) return
  rebuildOres(kept.slice())
}

export function isTreeOn(x, z) {
  for (const t of state.trees) if (t.x === x && t.z === z) return true
  return false
}

// Abat un arbre et renvoie true si un arbre etait present.
export function chopTreeAt(x, z) {
  if (!isTreeOn(x, z)) return false
  removeTreesIn([{ x, z }])
  return true
}

// Extrait le filon d'une cellule et renvoie son type (ex: 'ore-gold'), ou null
// si pas de filon. Utilise par le colon quand il mine une tuile a filon.
export function extractOreAt(x, z) {
  const k = z * GRID + x
  const type = state.cellOre[k]
  if (!type) return null
  removeOresIn([{ x, z }])
  return type
}

// ============================================================================
// Buissons de baies
// ============================================================================
const bushLeafGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25)
const bushLeafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true })
export const bushLeafMesh = new THREE.InstancedMesh(bushLeafGeo, bushLeafMat, MAX_BUSH_LEAVES)
bushLeafMesh.castShadow = true
bushLeafMesh.receiveShadow = true
bushLeafMesh.count = 0
bushLeafMesh.frustumCulled = false
bushLeafMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BUSH_LEAVES * 3), 3)
scene.add(bushLeafMesh)

const bushBerryGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12)
const bushBerryMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, flatShading: true })
export const bushBerryMesh = new THREE.InstancedMesh(bushBerryGeo, bushBerryMat, MAX_BUSH_BERRIES)
bushBerryMesh.castShadow = true
bushBerryMesh.count = 0
bushBerryMesh.frustumCulled = false
bushBerryMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BUSH_BERRIES * 3), 3)
scene.add(bushBerryMesh)

const BERRY_HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0)

export function addBush(gx, gz) {
  if (state.bushes.length >= MAX_BUSHES) return false
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return false
  if (isCellOccupied(gx, gz)) return false

  const rng = prng.rng
  const leafIndices = []
  const leafColors = []
  const berryIndices = []
  const berryColors = []
  const baseY = top
  const nLeaves = 3 + Math.floor(rng() * 3)
  const leafBase = new THREE.Color('#3d6b2d')
  for (let k = 0; k < nLeaves; k++) {
    const li = bushLeafMesh.count
    if (li >= MAX_BUSH_LEAVES) break
    const lx = gx + 0.5 + (rng() - 0.5) * 0.35
    const lz = gz + 0.5 + (rng() - 0.5) * 0.35
    const ly = baseY + 0.12 + rng() * 0.35
    tmpObj.position.set(lx, ly, lz)
    tmpObj.rotation.set(0, rng() * Math.PI * 2, 0)
    const ls = 0.8 + rng() * 0.5
    tmpObj.scale.set(ls, ls, ls)
    tmpObj.updateMatrix()
    bushLeafMesh.setMatrixAt(li, tmpObj.matrix)
    tmpColor.copy(leafBase).offsetHSL((rng() - 0.5) * 0.02, 0, (rng() - 0.5) * 0.08)
    bushLeafMesh.setColorAt(li, tmpColor)
    leafColors.push(tmpColor.clone())
    bushLeafMesh.count = li + 1
    leafIndices.push(li)
  }
  const berryBase = new THREE.Color('#6b2d8c')
  const nBerries = 2 + Math.floor(rng() * 3)
  const berryPositions = []
  for (let k = 0; k < nBerries; k++) {
    const bi = bushBerryMesh.count
    if (bi >= MAX_BUSH_BERRIES) break
    const bx = gx + 0.5 + (rng() - 0.5) * 0.3
    const bz = gz + 0.5 + (rng() - 0.5) * 0.3
    const by = baseY + 0.25 + rng() * 0.3
    tmpObj.position.set(bx, by, bz)
    tmpObj.rotation.set(0, 0, 0)
    tmpObj.scale.set(1, 1, 1)
    tmpObj.updateMatrix()
    bushBerryMesh.setMatrixAt(bi, tmpObj.matrix)
    tmpColor.copy(berryBase).offsetHSL((rng() - 0.5) * 0.04, (rng() - 0.5) * 0.15, (rng() - 0.5) * 0.06)
    bushBerryMesh.setColorAt(bi, tmpColor)
    berryColors.push(tmpColor.clone())
    bushBerryMesh.count = bi + 1
    berryIndices.push(bi)
    berryPositions.push(tmpObj.matrix.clone())
  }
  bushLeafMesh.instanceMatrix.needsUpdate = true
  if (bushLeafMesh.instanceColor) bushLeafMesh.instanceColor.needsUpdate = true
  bushBerryMesh.instanceMatrix.needsUpdate = true
  if (bushBerryMesh.instanceColor) bushBerryMesh.instanceColor.needsUpdate = true

  // maxBerries aleatoire entre 5 et 14 pour que les buissons soient
  // productifs : la recolte normale vaut largement plus que le minage brut.
  const maxB = 5 + Math.floor(rng() * 10)
  const bush = {
    x: gx, z: gz,
    berries: Math.min(maxB, 3 + Math.floor(rng() * 8)), // part deja partiellement remplie
    maxBerries: maxB,
    leafIndices,
    leafColors,
    berryIndices,
    berryColors,
    berryMatrices: berryPositions,
    claimedBy: null,
    regenTimer: 0
  }
  state.bushes.push(bush)
  return bush
}

export function refreshBushBerries(bush) {
  const visible = Math.min(bush.berries, bush.berryIndices.length)
  for (let k = 0; k < bush.berryIndices.length; k++) {
    const bi = bush.berryIndices[k]
    if (k < visible) {
      bushBerryMesh.setMatrixAt(bi, bush.berryMatrices[k])
    } else {
      bushBerryMesh.setMatrixAt(bi, BERRY_HIDDEN)
    }
  }
  bushBerryMesh.instanceMatrix.needsUpdate = true
}

export function removeBushesIn(cells) {
  if (!state.bushes.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  const kept = state.bushes.filter(b => !cellSet.has(b.z * GRID + b.x))
  if (kept.length === state.bushes.length) return
  const kp = kept.map(b => ({ x: b.x, z: b.z }))
  state.bushes.length = 0
  bushLeafMesh.count = 0
  bushBerryMesh.count = 0
  for (const b of kp) addBush(b.x, b.z)
}

export function findNearestBush(cx, cz, maxDist) {
  let best = null, bestD = Infinity
  for (const b of state.bushes) {
    if (b.berries <= 0) continue
    if (b.claimedBy) continue
    const d = Math.abs(b.x - cx) + Math.abs(b.z - cz)
    if (d > maxDist) continue
    if (d < bestD) { bestD = d; best = b }
  }
  return best
}

// ============================================================================
// Cerfs (decor statique GLB, pas de IA)
// ============================================================================

function _makeDeerElance() {
  const MAT_RUST      = new THREE.MeshLambertMaterial({ color: 0xA0522D })
  const MAT_DARK      = new THREE.MeshLambertMaterial({ color: 0x5C3A1E })
  const MAT_AMBER     = new THREE.MeshLambertMaterial({ color: 0xC8860A })
  const MAT_BLACK     = new THREE.MeshLambertMaterial({ color: 0x111111 })
  const MAT_CREAM     = new THREE.MeshLambertMaterial({ color: 0xE8D5B0 })

  const g = new THREE.Group()

  function box(w,h,d,mat,x,y,z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat)
    m.position.set(x,y,z); m.castShadow = true; g.add(m)
  }
  function cyl(rt,rb,h,mat,x,y,z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,8), mat)
    m.position.set(x,y,z); m.castShadow = true; g.add(m)
  }

  // Corps
  box(0.58,0.38,1.20, MAT_RUST,      0,    0.92,  0)
  // Cou
  box(0.16,0.44,0.16, MAT_RUST,      0,    1.22,  0.46)
  // Tete
  box(0.22,0.22,0.30, MAT_RUST,      0,    1.50,  0.60)
  // Museau
  box(0.14,0.10,0.14, MAT_DARK,      0,    1.44,  0.74)
  // Yeux
  box(0.05,0.05,0.03, MAT_BLACK,  0.09,1.54,0.70)
  box(0.05,0.05,0.03, MAT_BLACK, -0.09,1.54,0.70)
  // Pattes avant
  cyl(0.055,0.07,0.60, MAT_DARK,  0.24,0.38,  0.38)
  cyl(0.055,0.07,0.60, MAT_DARK, -0.24,0.38,  0.38)
  // Pattes arriere
  cyl(0.055,0.07,0.60, MAT_DARK,  0.24,0.38, -0.36)
  cyl(0.055,0.07,0.60, MAT_DARK, -0.24,0.38, -0.36)
  // Sabots avant
  cyl(0.07,0.07,0.07, MAT_BLACK,  0.24,0.05, 0.38)
  cyl(0.07,0.07,0.07, MAT_BLACK, -0.24,0.05, 0.38)
  // Sabots arriere
  cyl(0.07,0.07,0.07, MAT_BLACK,  0.24,0.05,-0.36)
  cyl(0.07,0.07,0.07, MAT_BLACK, -0.24,0.05,-0.36)
  // Bois gauche
  cyl(0.03,0.03,0.38, MAT_AMBER,  0.10,1.70,0.56)
  cyl(0.03,0.03,0.22, MAT_AMBER,  0.22,1.84,0.56)
  cyl(0.03,0.03,0.18, MAT_AMBER,  0.08,1.80,0.56)
  cyl(0.03,0.03,0.14, MAT_AMBER,  0.28,1.74,0.56)
  // Bois droit
  cyl(0.03,0.03,0.38, MAT_AMBER, -0.10,1.70,0.56)
  cyl(0.03,0.03,0.22, MAT_AMBER, -0.22,1.84,0.56)
  cyl(0.03,0.03,0.18, MAT_AMBER, -0.08,1.80,0.56)
  cyl(0.03,0.03,0.14, MAT_AMBER, -0.28,1.74,0.56)
  // Oreilles
  box(0.05,0.20,0.04, MAT_RUST,  0.22,1.52,0.56)
  box(0.05,0.20,0.04, MAT_RUST, -0.22,1.52,0.56)
  // Queue
  box(0.18,0.18,0.07, MAT_CREAM, 0,1.0,-0.62)

  g.userData.type = 'deer'
  return g
}

export function addDeer(gx, gz) {
  dlog('[deer] addDeer called at', gx, gz)
  const biome = state.cellBiome[gz * GRID + gx]
  if (biome !== 'grass' && biome !== 'forest') return null
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return null
  const rng = prng.rng
  const jx = (rng() - 0.5) * 0.4
  const jz = (rng() - 0.5) * 0.4
  const rotY = rng() * Math.PI * 2

  const model = null // GLB Deer.glb : materiaux transparents, forcage fallback procedural
  if (model) {
    model.scale.setScalar(DEER_GLB_SCALE)
    // Offset Y fixe : le pivot du GLB est typiquement au centre du mesh.
    // 0.5 leve assez le groupe pour que les sabots affleurent le sol, sans
    // dependre du scale (qui peut varier sans changer la geometrie native).
    model.position.set(gx + 0.5 + jx, top + 0.5, gz + 0.5 + jz)
    model.rotation.y = rotY
    model.userData.type = 'deer'
    let meshCount = 0
    model.traverse(function(o) {
      o.visible = true
      if (o.isMesh) {
        meshCount++
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false
      }
    })
    dlog('[deer] meshes found in traverse:', meshCount)
    scene.add(model)
    model.updateMatrixWorld(true)
    dlog('[deer] addDeer GLB pos:', model.position.x.toFixed(1), model.position.y.toFixed(1), model.position.z.toFixed(1), 'scale:', DEER_GLB_SCALE)
    if (meshCount === 0) {
      dwarn('[deer] GLB clone vide, fallback procedural style D pour cette tuile')
      scene.remove(model)
      const g = _makeDeerElance()
      g.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz)
      g.rotation.y = rotY
      g.traverse(function(o) { if (o.isMesh) o.frustumCulled = false })
      scene.add(g)
      const entry = { x: gx, z: gz, group: g, mixer: null, tx: gx, tz: gz, waitTimer: 60 + Math.random() * 120, speed: 0.012 + Math.random() * 0.006 }
      state.deers.push(entry)
      return entry
    }
    const glbClips = getModelClips('deer')
    let glbMixer = null
    if (glbClips.length > 0) {
      glbMixer = new THREE.AnimationMixer(model)
      glbMixer.clipAction(glbClips[0]).play()
    }
    const entry = { x: gx, z: gz, group: model, mixer: glbMixer, tx: gx, tz: gz, waitTimer: 60 + Math.random() * 120, speed: 0.012 + Math.random() * 0.006 }
    state.deers.push(entry)
    return entry
  }

  // Fallback procedural style D si le GLB est absent ou en echec de chargement
  const g = _makeDeerElance()
  g.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz)
  g.rotation.y = rotY
  g.traverse(function(o) { if (o.isMesh) o.frustumCulled = false })
  scene.add(g)
  dlog('[deer] addDeer fallback style D pos:', g.position.x.toFixed(1), g.position.y.toFixed(1), g.position.z.toFixed(1))
  const entry = { x: gx, z: gz, group: g, mixer: null, tx: gx, tz: gz, waitTimer: 60 + Math.random() * 120, speed: 0.012 + Math.random() * 0.006 }
  state.deers.push(entry)
  return entry
}

const _deerTmpVec = new THREE.Vector3()

export function tickDeer(dt) {
  if (!state.deers || !state.deers.length) return
  const rng = Math.random
  let needCleanup = false
  for (const d of state.deers) {
    if (d.dead) {
      d.deadTimer -= dt
      if (d.deadTimer <= 0) {
        scene.remove(d.group)
        d.group.traverse(function(o) {
          if (o.geometry) o.geometry.dispose()
          if (o.material) o.material.dispose()
        })
        d._remove = true
        needCleanup = true
      }
      continue
    }

    if (d.mixer) d.mixer.update(dt)

    if (d.waitTimer > 0) {
      d.waitTimer -= dt * 60
      // bob procedural au repos
      if (!d.mixer) {
        const top = state.cellTop[Math.round(d.tz) * GRID + Math.round(d.tx)] || 1
        d.group.position.y = top + Math.sin(Date.now() * 0.003 + d.x) * 0.03
      }
      continue
    }

    // Fuite si colon a moins de 3 cellules
    let fleeDx = 0, fleeDz = 0
    if (state.colonists && state.colonists.length) {
      for (const c of state.colonists) {
        const cdx = d.group.position.x - c.group.position.x
        const cdz = d.group.position.z - c.group.position.z
        const dist2 = cdx * cdx + cdz * cdz
        if (dist2 < 9) { fleeDx += cdx; fleeDz += cdz }
      }
    }

    const px = d.group.position.x, pz = d.group.position.z
    const tx = d.tx + 0.5, tz = d.tz + 0.5
    const dx = tx - px, dz = tz - pz
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 0.1) {
      // Nouvelle cible
      const deerX = Math.round(d.x), deerZ = Math.round(d.z)
      const currentTop = state.cellTop[deerZ * GRID + deerX] || 1
      let attempts = 0, nx = deerX, nz = deerZ
      const radius = 4 + Math.floor(rng() * 5)
      for (let i = 0; i < 12; i++) {
        const angle = rng() * Math.PI * 2
        const cx = Math.round(d.x + Math.cos(angle) * radius)
        const cz = Math.round(d.z + Math.sin(angle) * radius)
        if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) continue
        const biome = state.cellBiome[cz * GRID + cx]
        if (biome !== 'grass' && biome !== 'forest') continue
        if (isCellOccupied(cx, cz)) continue
        const top = state.cellTop[cz * GRID + cx] || 1
        if (top > currentTop + 1) continue
        nx = cx; nz = cz; attempts++; break
      }
      d.tx = nx; d.tz = nz; d.x = nx; d.z = nz
      d.waitTimer = 60 + rng() * 120
      continue
    }

    // Fuite : recalcule la target si fuite active
    if (fleeDx !== 0 || fleeDz !== 0) {
      const flen = Math.sqrt(fleeDx * fleeDx + fleeDz * fleeDz)
      const fnx = Math.round(px + (fleeDx / flen) * 8)
      const fnz = Math.round(pz + (fleeDz / flen) * 8)
      if (fnx >= 0 && fnz >= 0 && fnx < GRID && fnz < GRID) {
        const fb = state.cellBiome[fnz * GRID + fnx]
        if ((fb === 'grass' || fb === 'forest') && !isCellOccupied(fnx, fnz)) {
          d.tx = fnx; d.tz = fnz
        }
      }
    }

    // Y suit le relief de la cellule courante
    const curX = Math.min(GRID - 1, Math.max(0, Math.round(px - 0.5)))
    const curZ = Math.min(GRID - 1, Math.max(0, Math.round(d.group.position.z - 0.5)))
    const curTop = state.cellTop[curZ * GRID + curX] || 1
    const targetY = curTop + 0.5

    // Deplacement
    _deerTmpVec.set(tx, targetY, tz)
    d.group.position.lerp(_deerTmpVec, d.speed)
    d.group.rotation.y = Math.atan2(dx, dz)

    // Animations GLB
    if (d.mixer) {
      const clips = getModelClips('deer')
      if (!d._walkAction && clips.length > 0) {
        d._walkAction = d.mixer.clipAction(clips[0])
        d._idleAction = clips.length > 1 ? d.mixer.clipAction(clips[1]) : null
      }
      if (d._walkAction && !d._walkAction.isRunning()) d._walkAction.play()
      if (d._idleAction && d._idleAction.isRunning()) d._idleAction.stop()
    }
  }
  if (needCleanup) {
    const kept = state.deers.filter(function(d) { return !d._remove })
    state.deers.length = 0
    for (const d of kept) state.deers.push(d)
  }
}

export function removeDeersIn(cells) {
  if (!state.deers || !state.deers.length) return
  const cellSet = new Set(cells.map(function(c) { return c.z * GRID + c.x }))
  const toRemove = state.deers.filter(function(d) { return cellSet.has(d.z * GRID + d.x) })
  const kept = state.deers.filter(function(d) { return !cellSet.has(d.z * GRID + d.x) })
  if (kept.length === state.deers.length) return
  for (const d of toRemove) {
    scene.remove(d.group)
    d.group.traverse(function(o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() })
  }
  state.deers.length = 0
  for (const d of kept) state.deers.push(d)
}

// ============================================================================
// Maisons (Group Three)
// ============================================================================
function makeHouse() {
  const rng = prng.rng
  const g = new THREE.Group()
  const wallColors = [0xf2e6c9, 0xe6d2a8, 0xd9c79d]
  const roofColors = [0xb24e3a, 0xa04030, 0xc86a48]
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColors[Math.floor(rng() * 3)], roughness: 0.9, flatShading: true })
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[Math.floor(rng() * 3)], roughness: 0.85, flatShading: true })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), wallMat)
  body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true
  g.add(body)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.9, 4), roofMat)
  roof.position.y = 1.45
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true; roof.receiveShadow = true
  g.add(roof)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.18), wallMat)
  chimney.position.set(0.35, 1.5, 0.15)
  chimney.castShadow = true
  g.add(chimney)
  g.rotation.y = rng() * Math.PI * 2
  return g
}

export function addHouse(gx, gz) {
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return null
  const g = makeHouse()
  g.position.set(gx + 0.5, top, gz + 0.5)
  scene.add(g)
  const def = getBuildingById('cabane')
  const cap = (def && typeof def.residentsCapacity === 'number') ? def.residentsCapacity : 2
  const entry = { x: gx, z: gz, group: g, id: state.houseNextId++, residents: [], residentsCapacity: cap }
  _markUnderConstruction(entry, 'cabane')
  state.houses.push(entry)
  revealAround(gx, gz, 8)
  return entry
}

// ============================================================================
// Foyer (feu de camp)
// ============================================================================
function makeFoyer() {
  const g = new THREE.Group()
  const logMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1f, roughness: 0.95, flatShading: true })
  const emberMat = new THREE.MeshStandardMaterial({ color: 0xd4620a, roughness: 0.7, flatShading: true, emissive: new THREE.Color(0x7a2a00), emissiveIntensity: 0.4 })
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.5, flatShading: true, emissive: new THREE.Color(0xff4400), emissiveIntensity: 0.6, transparent: true, opacity: 0.9 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.18, 8), logMat)
  base.position.y = 0.09; base.castShadow = true; base.receiveShadow = true
  g.add(base)
  const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.12, 6), emberMat)
  embers.position.y = 0.24
  g.add(embers)
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 6), flameMat)
  flame.position.y = 0.55
  flame.castShadow = false
  g.add(flame)
  g.userData.flame = flame
  return g
}

export function addFoyer(gx, gz) {
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return false
  const g = makeFoyer()
  g.position.set(gx + 0.5, top, gz + 0.5)
  const light = new THREE.PointLight(0xff6a1a, 3.0, 8)
  light.position.set(0, 1.5, 0)
  g.add(light)
  scene.add(g)
  // Lot B : cuisson de viande. cookTimer monte tant que isCooking est vrai,
  // jusqu a COOK_DURATION secondes, puis produit 1 cooked-meat.
  const entry = { x: gx, z: gz, group: g, light, cookTimer: 0, isCooking: false }
  _markUnderConstruction(entry, 'foyer')
  state.foyers.push(entry)
  revealAround(gx, gz, 8)
  return true
}

export function removeHousesIn(cells) {
  if (!state.houses.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  for (let i = state.houses.length - 1; i >= 0; i--) {
    if (cellSet.has(state.houses[i].z * GRID + state.houses[i].x)) {
      scene.remove(state.houses[i].group)
      state.houses[i].group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
      state.houses.splice(i, 1)
    }
  }
}

// ============================================================================
// Grosses maisons (big-house) : 4x4 cellules, placement manuel
// ============================================================================
function makeBigHouse() {
  return makeManor()
}

export function addBigHouse(gx, gz) {
  // Vérifie toutes les 16 cellules du footprint 4x4
  for (let dz = 0; dz < 4; dz++) {
    for (let dx = 0; dx < 4; dx++) {
      const cx = gx + dx, cz = gz + dz
      if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) return false
      const top = state.cellTop[cz * GRID + cx]
      if (top <= SHALLOW_WATER_LEVEL) return false
      if (isCellOccupied(cx, cz)) return false
    }
  }
  const tops = []
  for (let dz = 0; dz < 4; dz++) {
    for (let dx = 0; dx < 4; dx++) {
      tops.push(state.cellTop[(gz + dz) * GRID + (gx + dx)])
    }
  }
  const top = Math.max(...tops)
  const g = makeBigHouse()
  g.position.set(gx + 2, top, gz + 2)
  scene.add(g)
  const def = getBuildingById('big-house')
  const cap = (def && typeof def.residentsCapacity === 'number') ? def.residentsCapacity : 6
  const entry = { x: gx, z: gz, group: g, id: state.bigHouseNextId++, residents: [], residentsCapacity: cap }
  _markUnderConstruction(entry, 'big-house')
  state.bigHouses.push(entry)
  revealAround(gx + 2, gz + 2, 8)
  return entry
}

export function removeBigHousesIn(cells) {
  if (!state.bigHouses || !state.bigHouses.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  for (let i = state.bigHouses.length - 1; i >= 0; i--) {
    const b = state.bigHouses[i]
    let hit = false
    outer: for (let dz = 0; dz < 4 && !hit; dz++) {
      for (let dx = 0; dx < 4 && !hit; dx++) {
        if (cellSet.has((b.z + dz) * GRID + (b.x + dx))) hit = true
      }
    }
    if (hit) {
      scene.remove(b.group)
      b.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
      state.bigHouses.splice(i, 1)
    }
  }
}

export function addBigHouseFromSave(ox, oz) {
  const tops = []
  for (let dz = 0; dz < 4; dz++) {
    for (let dx = 0; dx < 4; dx++) {
      tops.push(state.cellTop[(oz + dz) * GRID + (ox + dx)])
    }
  }
  const top = Math.max(...tops)
  const g = makeBigHouse()
  g.position.set(ox + 2, top, oz + 2)
  scene.add(g)
  // Restauration depuis save : batiment deja construit dans la sauvegarde.
  const def = getBuildingById('big-house')
  const cap = (def && typeof def.residentsCapacity === 'number') ? def.residentsCapacity : 6
  const entry = {
    x: ox, z: oz, group: g, buildingId: 'big-house',
    isUnderConstruction: false, constructionProgress: 1, buildTime: 0,
    id: state.bigHouseNextId++, residents: [], residentsCapacity: cap
  }
  state.bigHouses.push(entry)
  return entry
}

// ============================================================================
// Upgrade explicite d un batiment vers un autre type. Remplace l ancienne
// fusion automatique de 4 maisons. Appele par le bouton du panneau bâtiment
// (UI : building-panel.js -> placementsApi.upgradeBuilding).
// ============================================================================

// Fallback si la def JSON ne declare pas upgradeFrom.
const _HARDCODED_UPGRADES = {
  'big-house': ['cabane']
}

export function canUpgradeTo(fromType, toType) {
  const def = getBuildingById(toType)
  if (def && def.upgradeFrom) {
    const f = def.upgradeFrom.from
    if (Array.isArray(f)) return f.includes(fromType)
    return f === fromType
  }
  const list = _HARDCODED_UPGRADES[toType]
  return Array.isArray(list) && list.includes(fromType)
}

function _checkUpgradeFootprint(gx, gz, footprint, sourceX, sourceZ) {
  for (let dz = 0; dz < footprint; dz++) {
    for (let dx = 0; dx < footprint; dx++) {
      const cx = gx + dx, cz = gz + dz
      if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) return false
      const top = state.cellTop[cz * GRID + cx]
      if (top <= SHALLOW_WATER_LEVEL) return false
      if (cx === sourceX && cz === sourceZ) continue
      if (isCellOccupied(cx, cz)) return false
    }
  }
  return true
}

function _hasUpgradeResources(cost) {
  if (!cost) return true
  if (!state.resources) return false
  for (const k in cost) {
    if ((state.resources[k] || 0) < cost[k]) return false
  }
  return true
}

function _consumeUpgradeResources(cost) {
  if (!cost) return
  for (const k in cost) {
    state.resources[k] = Math.max(0, (state.resources[k] || 0) - cost[k])
  }
}

export function upgradeBuilding(building, targetType) {
  if (!building) return { ok: false, reason: 'no-building' }
  if (building.isUnderConstruction) return { ok: false, reason: 'still-building' }
  if (building.isUnderUpgrade) return { ok: false, reason: 'already-upgrading' }
  const targetDef = getBuildingById(targetType)
  if (!targetDef) return { ok: false, reason: 'unknown-target' }
  const fromType = building.buildingId
  if (!canUpgradeTo(fromType, targetType)) return { ok: false, reason: 'invalid-upgrade' }

  const footprint = targetDef.footprint || 1
  if (footprint > 1) {
    if (!_checkUpgradeFootprint(building.x, building.z, footprint, building.x, building.z)) {
      try { showHudToast("Pas assez de place autour de la cabane (4x4 nécessaire).", 2500) } catch (_) {}
      return { ok: false, reason: 'no-room' }
    }
  }

  const upgradeCost = (targetDef.upgradeFrom && targetDef.upgradeFrom.cost) || targetDef.cost || {}
  if (!_hasUpgradeResources(upgradeCost)) {
    try { showHudToast("Ressources insuffisantes pour l'amélioration.", 2500) } catch (_) {}
    return { ok: false, reason: 'no-resources' }
  }
  _consumeUpgradeResources(upgradeCost)

  const upgradeBuildTime = (targetDef.upgradeFrom && typeof targetDef.upgradeFrom.buildTime === 'number')
    ? targetDef.upgradeFrom.buildTime
    : (typeof targetDef.buildTime === 'number' ? targetDef.buildTime : 30)

  building.isUnderUpgrade = true
  building.upgradeProgress = 0
  building.upgradeTargetType = targetType
  building.upgradeBuildTime = upgradeBuildTime > 0 ? upgradeBuildTime : 1
  if (!building.builders) building.builders = new Set()
  if (!building.builderSlots) building.builderSlots = new Map()
  building.activeBuildersCount = building.builders.size

  return { ok: true }
}

// Termine l upgrade : retire la cabane source et place la grosse maison deja
// construite a l emplacement, en transferant les residents.
export function completeUpgrade(sourceBuilding) {
  if (!sourceBuilding) return null
  const targetType = sourceBuilding.upgradeTargetType
  const fromType = sourceBuilding.buildingId
  const ox = sourceBuilding.x
  const oz = sourceBuilding.z
  const residents = Array.isArray(sourceBuilding.residents) ? sourceBuilding.residents.slice() : []

  if (fromType === 'cabane' && targetType === 'big-house') {
    const idx = state.houses.indexOf(sourceBuilding)
    if (idx !== -1) {
      const h = state.houses[idx]
      if (h.group) {
        scene.remove(h.group)
        h.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
      }
      state.houses.splice(idx, 1)
    }
    const tops = []
    for (let dz = 0; dz < 4; dz++) {
      for (let dx = 0; dx < 4; dx++) {
        tops.push(state.cellTop[(oz + dz) * GRID + (ox + dx)])
      }
    }
    const top = Math.max(...tops)
    const g = makeBigHouse()
    g.position.set(ox + 2, top, oz + 2)
    scene.add(g)
    const def = getBuildingById('big-house')
    const cap = (def && typeof def.residentsCapacity === 'number') ? def.residentsCapacity : 6
    const entry = {
      x: ox, z: oz, group: g, buildingId: 'big-house',
      isUnderConstruction: false, constructionProgress: 1, buildTime: 0,
      id: state.bigHouseNextId++, residents: residents, residentsCapacity: cap
    }
    state.bigHouses.push(entry)
    // Lot B residents : recable le homeBuildingId des colons transferes pour
    // pointer la nouvelle big-house (etait "house:<oldId>").
    const newRef = makeHomeRef('big-house', entry)
    for (const cid of residents) {
      const c = state.colonists.find(x => x && x.id === cid)
      if (c) c.homeBuildingId = newRef
    }
    revealAround(ox + 2, oz + 2, 8)
    try { showHudToast('Grosse maison achevée.', 2500) } catch (_) {}
    return entry
  }

  return null
}

// ============================================================================
// Manoirs : fusion de 4 maisons en 2x2
// ============================================================================
function makeManor() {
  const rng = prng.rng
  const g = new THREE.Group()
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc4bab0, roughness: 0.88, flatShading: true })
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7a3528, roughness: 0.82, flatShading: true })
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9e9690, roughness: 0.92, flatShading: true })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.8, 1.9), wallMat)
  body.position.y = 0.9; body.castShadow = true; body.receiveShadow = true
  g.add(body)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.62, 1.4, 4), roofMat)
  roof.position.y = 2.5; roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  g.add(roof)
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.7), stoneMat)
  tower.position.y = 2.25; tower.castShadow = true
  g.add(tower)
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(0.54, 1.05, 4), roofMat)
  towerRoof.position.y = 3.35; towerRoof.rotation.y = Math.PI / 4
  towerRoof.castShadow = true
  g.add(towerRoof)
  for (const [cx, cz] of [[-0.55, -0.45], [0.45, 0.5]]) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.2), stoneMat)
    ch.position.set(cx, 2.42, cz); ch.castShadow = true
    g.add(ch)
  }
  g.rotation.y = Math.floor(rng() * 4) * Math.PI / 2
  return g
}

function _placeManorGroup(ox, oz) {
  const tops = [
    state.cellTop[ oz      * GRID + ox   ],
    state.cellTop[ oz      * GRID + ox+1 ],
    state.cellTop[(oz + 1) * GRID + ox   ],
    state.cellTop[(oz + 1) * GRID + ox+1 ]
  ]
  const top = Math.max(...tops)
  const g = makeManor()
  g.position.set(ox + 1, top, oz + 1)
  scene.add(g)
  const def = getBuildingById('manor')
  const cap = (def && typeof def.residentsCapacity === 'number') ? def.residentsCapacity : 4
  const entry = {
    x: ox, z: oz, group: g, buildingId: 'manor',
    isUnderConstruction: false, constructionProgress: 1, buildTime: 0,
    id: state.manorNextId++, residents: [], residentsCapacity: cap
  }
  state.manors.push(entry)
  return entry
}

// La fusion automatique de 4 cabanes en manoir 2x2 a ete retiree (bug : la
// fusion se declenchait des le placement, sans attendre la construction).
// Elle est remplacee par un upgrade explicite Cabane -> Grosse maison
// declenche depuis le panneau bâtiment (voir upgradeBuilding ci-dessous).

export function addManorFromSave(ox, oz) {
  return _placeManorGroup(ox, oz)
}

export function removeManorsIn(cells) {
  if (!state.manors.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  for (let i = state.manors.length - 1; i >= 0; i--) {
    const m = state.manors[i]
    if (
      cellSet.has( m.z      * GRID + m.x   ) ||
      cellSet.has( m.z      * GRID + m.x+1 ) ||
      cellSet.has((m.z + 1) * GRID + m.x   ) ||
      cellSet.has((m.z + 1) * GRID + m.x+1 )
    ) {
      scene.remove(m.group)
      m.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
      state.manors.splice(i, 1)
    }
  }
}

// ============================================================================
// Batiments de recherche (toit bleu)
// ============================================================================
function makeResearchHouse() {
  const rng = prng.rng
  const g = new THREE.Group()
  const wallColors = [0xf2e6c9, 0xe6d2a8, 0xd9c79d]
  const roofColors = [0x3c7fb8, 0x3572a3, 0x4a8cc4]
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColors[Math.floor(rng() * 3)], roughness: 0.9, flatShading: true })
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[Math.floor(rng() * 3)], roughness: 0.85, flatShading: true })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), wallMat)
  body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true
  g.add(body)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.9, 4), roofMat)
  roof.position.y = 1.45
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true; roof.receiveShadow = true
  g.add(roof)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.18), wallMat)
  chimney.position.set(0.35, 1.5, 0.15)
  chimney.castShadow = true
  g.add(chimney)
  g.rotation.y = rng() * Math.PI * 2
  return g
}

export function addResearchHouse(gx, gz) {
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return null
  const g = makeResearchHouse()
  g.position.set(gx + 0.5, top, gz + 0.5)
  scene.add(g)
  const entry = { id: state.researchBuildingNextId++, x: gx, z: gz, group: g, assignedColonistIds: [] }
  _markUnderConstruction(entry, 'hutte-du-sage')
  state.researchHouses.push(entry)
  revealAround(gx, gz, 8)
  try { window.dispatchEvent(new CustomEvent('strates:buildingPlaced', { detail: { type: 'research', id: entry.id } })) } catch (_) {}
  return entry
}

export function isResearchHouseOn(x, z) {
  for (const h of state.researchHouses) if (h.x === x && h.z === z) return true
  return false
}

export function findResearchBuildingById(id) {
  for (const h of state.researchHouses) if (h.id === id) return h
  return null
}

export function assignResearcherToBuilding(building) {
  if (!building) return false
  if (building.isUnderConstruction) return false
  if (!Array.isArray(building.assignedColonistIds)) building.assignedColonistIds = []
  let best = null, bestD = Infinity
  for (const c of state.colonists) {
    // Gate universel : profession === 'chercheur' ET assignedJob === 'researcher'.
    // Aucun fallback (ni chef, ni colon IDLE quelconque). Le joueur doit
    // explicitement assigner le role depuis le panneau Population.
    if (c.profession !== 'chercheur') continue
    if (c.assignedJob !== 'researcher') continue
    if (c.researchBuildingId != null) continue
    if (c.state !== 'IDLE') continue
    const d = Math.abs(c.x - building.x) + Math.abs(c.z - building.z)
    if (d < bestD) { bestD = d; best = c }
  }
  if (!best) return false
  const approach = findApproach(best.x, best.z, building.x, building.z)
  if (!approach) return false
  if (!building.assignedColonistIds.includes(best.id)) building.assignedColonistIds.push(best.id)
  best.researchBuildingId = building.id
  best.path = approach.path
  best.pathStep = 0
  best.state = 'MOVING'
  best.isWandering = false
  best.targetJob = null
  best.targetBush = null
  best.updateTrail()
  return true
}

export function removeResearchHousesIn(cells) {
  if (!state.researchHouses.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  for (let i = state.researchHouses.length - 1; i >= 0; i--) {
    const r = state.researchHouses[i]
    if (cellSet.has(r.z * GRID + r.x)) {
      for (const c of state.colonists) {
        if (c.researchBuildingId === r.id) {
          c.researchBuildingId = null
          if (c.state === 'RESEARCHING' || c.state === 'MOVING') {
            c.state = 'IDLE'
            c.path = null
            if (c.lineGeo) c.lineGeo.setFromPoints([])
          }
        }
      }
      scene.remove(r.group)
      r.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
      state.researchHouses.splice(i, 1)
    }
  }
}

// ============================================================================
// Annulation d un chantier en cours (Lot B).
// Retire un batiment isUnderConstruction de son array d etat, libere tous les
// colons qui le ciblent (state BUILDING ou MOVING avec targetConstructionSite),
// et nettoie ses references (builders, builderSlots). Les colons reviennent en
// IDLE et chercheront un autre chantier au tick suivant.
// Le helper ne fait rien si le batiment n est pas (ou plus) en construction,
// ce qui le rend idempotent.
// ============================================================================
export function removeConstructionSite(building, type) {
  if (!building || !building.isUnderConstruction) return false
  // 1) Liberer tous les colons qui ciblent ce chantier (MOVING ou BUILDING).
  if (state.colonists && state.colonists.length) {
    for (const c of state.colonists) {
      if (c.targetConstructionSite === building) {
        if (building.builders) building.builders.delete(c.id)
        if (building.builderSlots) building.builderSlots.delete(c.id)
        c.targetConstructionSite = null
        c.builderSlot = null
        c.currentTask = null
        c.path = null
        c.pathStep = 0
        if (c.lineGeo) c.lineGeo.setFromPoints([])
        c.state = 'IDLE'
      }
    }
  }
  if (building.builders) {
    building.builders.clear()
    building.activeBuildersCount = 0
  }
  if (building.builderSlots) building.builderSlots.clear()

  // 2) Retirer le batiment de son array d etat (selon le type) et nettoyer
  //    le group three.js (scene + dispose).
  const cell = [{ x: building.x, z: building.z }]
  switch (type) {
    case 'house':
      removeHousesIn(cell)
      repaintCellSurface(building.x, building.z)
      break
    case 'research':
      removeResearchHousesIn(cell)
      repaintCellSurface(building.x, building.z)
      break
    case 'observatory':
      removeObservatoriesIn(cell)
      repaintCellSurface(building.x, building.z)
      break
    case 'big-house':
      removeBigHousesIn(cell)
      for (let dz = 0; dz < 4; dz++) {
        for (let dx = 0; dx < 4; dx++) repaintCellSurface(building.x + dx, building.z + dz)
      }
      break
    case 'foyer': {
      const idx = state.foyers.findIndex(f => f.x === building.x && f.z === building.z)
      if (idx !== -1) {
        const f = state.foyers[idx]
        if (f.group) {
          f.group.removeFromParent()
          f.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
        }
        state.foyers.splice(idx, 1)
      }
      repaintCellSurface(building.x, building.z)
      break
    }
    case 'cairn': {
      const idx = state.cairns.findIndex(c => c.x === building.x && c.z === building.z)
      if (idx !== -1) {
        const cn = state.cairns[idx]
        if (cn.group) {
          cn.group.removeFromParent()
          cn.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
        }
        state.cairns.splice(idx, 1)
      }
      repaintCellSurface(building.x, building.z)
      break
    }
    case 'field': {
      const idx = state.wheatFields.findIndex(f => f.x === building.x && f.z === building.z)
      if (idx !== -1) {
        const f = state.wheatFields[idx]
        if (f.group) {
          f.group.removeFromParent()
          f.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
        }
        // Footprint 2x2 selon FIELD_PLACEMENT.
        const fw = (typeof f.w === 'number') ? f.w : 2
        const fd = (typeof f.d === 'number') ? f.d : 2
        for (let dz = 0; dz < fd; dz++) {
          for (let dx = 0; dx < fw; dx++) {
            const cx = building.x + dx, cz = building.z + dz
            const k = cz * GRID + cx
            if (state.cellSurface) state.cellSurface[k] = null
            repaintCellSurface(cx, cz)
          }
        }
        state.wheatFields.splice(idx, 1)
      }
      break
    }
    default:
      return false
  }
  return true
}

// Helper local : detecte tous les chantiers (isUnderConstruction === true)
// dont le footprint intersecte au moins une cellule de la zone donnee.
// Retourne une liste {building, type}. Utilise par cancelJobsInRect.
export function findConstructionSitesInCells(cells) {
  if (!cells || !cells.length) return []
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  const out = []
  const seen = new Set()
  const tryPush = (b, type, w, d) => {
    if (!b || !b.isUnderConstruction) return
    if (seen.has(b)) return
    const ww = w || 1, dd = d || 1
    for (let dz = 0; dz < dd; dz++) {
      for (let dx = 0; dx < ww; dx++) {
        if (cellSet.has((b.z + dz) * GRID + (b.x + dx))) {
          out.push({ building: b, type })
          seen.add(b)
          return
        }
      }
    }
  }
  for (const h of (state.houses || []))         tryPush(h, 'house', 1, 1)
  for (const f of (state.foyers || []))         tryPush(f, 'foyer', 1, 1)
  for (const r of (state.researchHouses || [])) tryPush(r, 'research', 1, 1)
  for (const b of (state.bigHouses || []))      tryPush(b, 'big-house', 4, 4)
  for (const o of (state.observatories || []))  tryPush(o, 'observatory', 1, 1)
  for (const c of (state.cairns || []))         tryPush(c, 'cairn', 1, 1)
  for (const wf of (state.wheatFields || []))   tryPush(wf, 'field', wf.w || 2, wf.d || 2)
  return out
}

export function clearAllResearchHouses() {
  for (const r of state.researchHouses) {
    scene.remove(r.group)
    r.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
  }
  state.researchHouses.length = 0
}

export function countActiveResearchers() {
  let n = 0
  for (const c of state.colonists) if (c.researchBuildingId != null && c.state === 'RESEARCHING') n++
  return n
}

export function clearAllPlacements() {
  for (const t of state.trees) { if (t.group) scene.remove(t.group) }
  state.trees.length = 0; trunkMesh.count = 0; leafMesh.count = 0
  for (const r of state.rocks) { if (r.group) scene.remove(r.group) }
  state.rocks.length = 0; rockMesh.count = 0
  if (state.deers) {
    for (const d of state.deers) {
      scene.remove(d.group)
      d.group.traverse(function(o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() })
    }
    state.deers.length = 0
  }
  if (state.foyers) {
    for (const f of state.foyers) {
      scene.remove(f.group)
      f.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
    }
    state.foyers.length = 0
  }
  state.ores.length = 0; oreRockMesh.count = 0; crystalMesh.count = 0
  state.bushes.length = 0; bushLeafMesh.count = 0; bushBerryMesh.count = 0
  for (let i = 0; i < state.cellOre.length; i++) state.cellOre[i] = null
  for (const h of state.houses) {
    scene.remove(h.group)
    h.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
  }
  state.houses.length = 0
  if (state.bigHouses) {
    for (const b of state.bigHouses) {
      scene.remove(b.group)
      b.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
    }
    state.bigHouses.length = 0
  }
  for (const m of state.manors) {
    scene.remove(m.group)
    m.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
  }
  state.manors.length = 0
  clearAllResearchHouses()
  if (state.observatories && state.observatories.length) {
    for (const o of state.observatories) {
      scene.remove(o.group)
      o.group.traverse(node => { if (node.material) node.material.dispose(); if (node.geometry) node.geometry.dispose() })
    }
    state.observatories.length = 0
  }
  if (state.wheatFields && state.wheatFields.length) {
    for (const f of state.wheatFields) {
      scene.remove(f.group)
      f.group.traverse(node => { if (node.material) node.material.dispose(); if (node.geometry) node.geometry.dispose() })
    }
    state.wheatFields.length = 0
  }
  if (state.cairns && state.cairns.length) {
    for (const c of state.cairns) {
      scene.remove(c.group)
      c.group.traverse(node => { if (node.material) node.material.dispose(); if (node.geometry) node.geometry.dispose() })
    }
    state.cairns.length = 0
  }
}

// ============================================================================
// Champs de ble (Age du Bronze, 2x2 cellules)
// Necessite des cellules fertiles (state.cellFertile[k] === 1) et libres.
// ============================================================================
// Phases de croissance du champ. L ordre dans le tableau définit la progression
// quand growthProgress passe les seuils. Pour ajouter une phase 'mature' future,
// il suffira d ajouter un objet ici et un seuil correspondant.
// Stages visuels d un champ. Pilotés par Lot A (field.stage) et Lot B
// (event 'strates:fieldCultivated' à la transformation par un fermier).
// 'dirt'      = champ sauvage, rendu voxel procédural (variante F du POC).
// 'sprouting' = champ cultivé,  rendu Farm.glb.
// Les noms d ID restent 'dirt' / 'sprouting' pour rétrocompat persistence.
const FIELD_STAGES = [
  { id: 'dirt',      glbKey: null,             builder: 'wild' },
  { id: 'sprouting', glbKey: 'farm-sprouting', builder: 'glb' },
]

// Lot E + Lot B : la transition dirt -> sprouting n est plus pilotée par un
// timer interne mais par l action du fermier (event externe). On garde le flag
// disponible si on veut un jour réactiver une évolution autonome au tick.
const FIELD_VISUAL_EVOLUTION_ENABLED = false

const _bbox = new THREE.Box3()
const _bsize = new THREE.Vector3()

// Builder procédural voxel pour le stage 'sauvage' (variante F du POC champs).
// Base 2x0.08x2 dirt-dark + 5 rangs de 9 blocs voxel dégradés vert→doré.
// Origine locale (0,0) ; positionnement externe via group.position.
function _buildWildFieldGroup() {
  const g = new THREE.Group()
  const COL_DIRT_DARK = 0x4a3220
  const baseGeo = new THREE.BoxGeometry(2, 0.08, 2)
  const baseMat = new THREE.MeshStandardMaterial({ color: COL_DIRT_DARK, roughness: 1, flatShading: true })
  const base = new THREE.Mesh(baseGeo, baseMat)
  base.position.set(0.5, 0.04, 0.5)
  base.receiveShadow = true
  g.add(base)
  // RNG déterministe par appel pour éviter le scintillement entre rebuilds.
  let s = 0x5a2b
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000 }
  const rowCount = 5
  const colCount = 9
  for (let r = 0; r < rowCount; r++) {
    const z = -0.8 + r * (1.6 / (rowCount - 1))
    for (let i = 0; i < colCount; i++) {
      const x = -0.9 + i * 0.225
      const t = r / (rowCount - 1)
      const cr = 0.49 + t * 0.30
      const cg = 0.69 - t * 0.05
      const cb = 0.29 - t * 0.15
      const blockH = 0.18 + rng() * 0.05
      const blockGeo = new THREE.BoxGeometry(0.18, blockH, 0.13)
      const blockMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cr, cg, cb), roughness: 0.85, flatShading: true
      })
      const block = new THREE.Mesh(blockGeo, blockMat)
      block.position.set(0.5 + x, 0.08 + blockH / 2, 0.5 + z)
      block.castShadow = true
      block.receiveShadow = true
      g.add(block)
    }
  }
  return g
}

// Construit le mesh d un champ pour la phase donnée. Tente d utiliser le GLB
// associé ; en fallback, retourne un mesh procédural minimal (4 dalles brunes).
// Le group retourné est centré localement (origine à la cellule (gx,gz) du
// coin haut-gauche du 2x2), il faut le placer ensuite via group.position.set().
function _makeFieldGroup(stageId, tops) {
  const stage = FIELD_STAGES.find(s => s.id === stageId) || FIELD_STAGES[0]
  const baseTop = tops ? tops[0] : 0
  const wrap = new THREE.Group()
  // Stage sauvage : rendu procédural voxel (pas de GLB).
  if (stage.builder === 'wild') {
    wrap.add(_buildWildFieldGroup())
    return wrap
  }
  const model = stage.glbKey ? getModel(stage.glbKey) : null
  if (model) {
    // Centrer le modèle sur le 2x2. Le footprint world s étend de -0.5 à +1.5
    // en X/Z autour de l origine du Group (qui est posée à gx+0.5, gz+0.5).
    // Le centre du 2x2 est donc à (+0.5, +0.5) en local.
    _bbox.setFromObject(model)
    _bbox.getSize(_bsize)
    const maxXZ = Math.max(_bsize.x || 1, _bsize.z || 1)
    const targetXZ = 2.0
    const autoScale = (targetXZ / maxXZ) * FARM_GLB_SCALE * 2.0
    model.scale.setScalar(autoScale)
    // Reposer la base du modèle sur y=0 du group, puis offset XZ vers (0.5, 0.5)
    _bbox.setFromObject(model)
    model.position.x += (0.5 - (_bbox.min.x + _bbox.max.x) / 2)
    model.position.z += (0.5 - (_bbox.min.z + _bbox.max.z) / 2)
    model.position.y -= _bbox.min.y
    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false
      }
    })
    wrap.add(model)
    return wrap
  }
  // Fallback procédural : 4 dalles brunes plates, sans piquets ni cylindres
  // jaunes (qui passaient pour des piquets noirs en silhouette).
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x6e4a22, roughness: 0.96, flatShading: true
  })
  const soilGeo = new THREE.BoxGeometry(0.92, 0.08, 0.92)
  const offsets = [[0, 0], [1, 0], [0, 1], [1, 1]]
  for (let i = 0; i < 4; i++) {
    const [dx, dz] = offsets[i]
    const localTop = tops ? tops[i] : 0
    const soil = new THREE.Mesh(soilGeo, soilMat)
    soil.position.set(dx, (localTop - baseTop) + 0.04, dz)
    soil.receiveShadow = true
    wrap.add(soil)
  }
  return wrap
}

// Swap propre du mesh d un champ vers une nouvelle phase. Retire le group
// précédent de la scène et dispose géométries/matériaux, puis attache le
// nouveau group à la même position.
export function updateFieldMesh(field, stageId) {
  if (!field) return
  if (field.group) {
    if (field.group.parent) field.group.parent.remove(field.group)
    field.group.traverse(o => {
      if (o.isMesh) {
        if (o.geometry) o.geometry.dispose()
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          for (const m of mats) m.dispose && m.dispose()
        }
      }
    })
  }
  const tops = []
  for (let dz = 0; dz < 2; dz++) {
    for (let dx = 0; dx < 2; dx++) {
      tops.push(state.cellTop[(field.z + dz) * GRID + (field.x + dx)])
    }
  }
  const g = _makeFieldGroup(stageId, tops)
  g.position.set(field.x + 0.5, tops[0], field.z + 0.5)
  scene.add(g)
  field.group = g
  field.growthStage = stageId
}

/**
 * Place un champ de ble 2x2 dont l'origine est la cellule (gx, gz).
 * Verifie : cellules dans la grille, biome grass/forest, fertiles, libres, hors eau.
 * Peint cellSurface = 'field' sur les 4 cellules.
 * Retourne l'entree { x, z, group, grain } ou null si echec.
 */
export function addWheatField(gx, gz) {
  // Verifie le footprint 2x2
  for (let dz = 0; dz < 2; dz++) {
    for (let dx = 0; dx < 2; dx++) {
      const cx = gx + dx, cz = gz + dz
      if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) return null
      const k = cz * GRID + cx
      const top = state.cellTop[k]
      if (top <= 1) return null
      const biome = state.cellBiome[k]
      if (biome !== 'grass' && biome !== 'forest') return null
      if (!state.cellFertile || state.cellFertile[k] !== 1) return null
      if (isCellOccupied(cx, cz)) return null
    }
  }
  const tops = []
  for (let dz = 0; dz < 2; dz++) {
    for (let dx = 0; dx < 2; dx++) {
      tops.push(state.cellTop[(gz + dz) * GRID + (gx + dx)])
    }
  }
  const baseTop = tops[0]
  // Peindre cellSurface = 'field' et repaint chaque voxel top
  for (let dz = 0; dz < 2; dz++) {
    for (let dx = 0; dx < 2; dx++) {
      const cx = gx + dx, cz = gz + dz
      const k = cz * GRID + cx
      state.cellSurface[k] = 'field'
      repaintCellSurface(cx, cz)
    }
  }
  if (!state.wheatFields) state.wheatFields = []
  if (!state.wheatFieldNextId) state.wheatFieldNextId = 1
  // Lot E : champ sauvage par défaut → rendu voxel procédural (stage visuel 'dirt').
  // Le passage en 'cultive' est piloté par Lot B (event strates:fieldCultivated
  // ou mutation de field.stage), pas par timer interne.
  const initialStage = 'dirt'
  // Lot B fermier : id stable + capacité 1 fermier max via assignedColonistIds.
  // wheat = compteur de blé accumulé au stage cultivé (séparé de grain).
  const entry = { id: state.wheatFieldNextId++, x: gx, z: gz, group: null, grain: 0.0, wheat: 0.0,
                  growthStage: initialStage, growthProgress: 0.0,
                  stage: 'sauvage', transformProgress: 0,
                  assignedColonistIds: [] }
  updateFieldMesh(entry, initialStage)
  // Pas de buildTime sur champ-ble dans buildings.json (Lot A age 2). On
  // marque pour homogeneiser le contrat, mais l absence de buildTime laisse
  // le champ immediatement actif.
  _markUnderConstruction(entry, 'champ-ble')
  state.wheatFields.push(entry)
  return entry
}

// Lot B fermier : retrouve un champ de ble par son id stable.
export function findWheatFieldById(id) {
  if (!state.wheatFields || id == null) return null
  for (const f of state.wheatFields) if (f.id === id) return f
  return null
}

// Lot B fermier : retire le colon des assignedColonistIds de tous les champs.
// Sert quand un colon change de metier ou est detruit.
export function releaseFromWheatFields(colonistId) {
  if (!state.wheatFields) return
  for (const f of state.wheatFields) {
    if (!Array.isArray(f.assignedColonistIds)) continue
    const i = f.assignedColonistIds.indexOf(colonistId)
    if (i >= 0) f.assignedColonistIds.splice(i, 1)
  }
}

// Lot B (two-stage field) : transformation d un champ sauvage en champ cultive.
// Bascule field.stage de 'sauvage' vers 'cultive', remet transformProgress a 0,
// et emet un event 'strates:fieldTransformed' que Lot E consomme pour swapper
// le visuel. La logique de production (grain vs ble) lit field.stage chaque tick.
export function transformField(field) {
  if (!field) return false
  if (field.stage === 'cultive') return false
  field.stage = 'cultive'
  field.transformProgress = 0
  // Notification pour Lot E (swap visuel) et autres ecouteurs eventuels.
  try {
    const ev = new CustomEvent('strates:fieldTransformed', {
      detail: { fieldId: field.id, x: field.x, z: field.z, stage: 'cultive' }
    })
    if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(ev)
  } catch (e) { /* environnement sans window, ignore */ }
  return true
}

// Tick des champs : observe field.stage (Lot A/B). Dès que stage devient
// 'cultive' alors que le visuel est encore 'dirt', on bascule vers 'sprouting'
// (Farm.glb). Et inversement si un champ revenait en 'sauvage' (cas rare).
// Léger : un O(N) sur state.wheatFields, où N est typiquement <10.
export function tickWheatFields(dt) {
  if (!state.wheatFields || !state.wheatFields.length) return
  for (const f of state.wheatFields) {
    if (!f) continue
    const wantStage = (f.stage === 'cultive') ? 'sprouting' : 'dirt'
    if (f.growthStage !== wantStage) {
      updateFieldMesh(f, wantStage)
    }
  }
}

// Listener event Lot B : transformation explicite par fermier. La mutation
// de field.stage est aussi captée par le tick ci-dessus (filet de sécurité),
// mais l event permet un swap immédiat sans attendre 1/60 s.
function _onFieldStageEvent(e) {
  const detail = e && e.detail
  if (!detail) return
  let f = detail.field || null
  if (!f) {
    const id = detail.fieldId != null ? detail.fieldId : detail.id
    if (id != null) f = findWheatFieldById(id)
  }
  if (!f) return
  if ((detail.stage === 'cultive' || !detail.stage) && f.growthStage !== 'sprouting') {
    f.stage = 'cultive'
    updateFieldMesh(f, 'sprouting')
  }
}
try {
  window.addEventListener('strates:fieldCultivated', _onFieldStageEvent)
  window.addEventListener('strates:fieldTransformed', _onFieldStageEvent)
} catch (e) { /* environnement sans window : ignore */ }

// ============================================================================
// Cairn de pierre (monument de passage a l'Age du Bronze)
// Empilement de 4 blocs pierre grise formes d'une colonne.
// ============================================================================
function makeCairn() {
  const g = new THREE.Group()
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8b8278, roughness: 0.93, flatShading: true })
  const capMat   = new THREE.MeshStandardMaterial({ color: 0xc2b8a8, roughness: 0.88, flatShading: true })

  // 4 blocs empiles, chaque bloc legerement plus petit que le precedent
  const heights = [0.55, 0.5, 0.45, 0.38]
  const scales  = [1.00, 0.88, 0.76, 0.62]
  let yOff = 0
  heights.forEach((h, i) => {
    const s = scales[i]
    const block = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), i === heights.length - 1 ? capMat : stoneMat)
    block.position.y = yOff + h / 2
    block.castShadow = true
    block.receiveShadow = true
    g.add(block)
    yOff += h
  })

  // Petite etoile au sommet
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xf9d97a,
    roughness: 0.3,
    emissive: 0xa07010,
    emissiveIntensity: 0.7,
    flatShading: true
  })
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), starMat)
  star.position.y = yOff + 0.16
  g.add(star)

  return g
}

/**
 * Place le Cairn sur la tuile (gx, gz) et l'ajoute a state.cairns.
 * Retourne l'entree { x, z, group } ou null si la tuile est invalide.
 */
export function addCairn(gx, gz) {
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return null
  const g = makeCairn()
  g.position.set(gx + 0.5, top, gz + 0.5)
  scene.add(g)
  if (!state.cairns) state.cairns = []
  const entry = { x: gx, z: gz, group: g }
  _markUnderConstruction(entry, 'cairn-pierre')
  state.cairns.push(entry)
  return entry
}

/**
 * Trouve la premiere cellule libre pres du point (cx, cz), en spirale.
 * Retourne { x, z } ou null.
 */
export function findFreeCellNear(cx, cz, maxRadius) {
  if (maxRadius === undefined) maxRadius = 20
  for (let r = 0; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue
        const x = Math.round(cx) + dx
        const z = Math.round(cz) + dz
        if (x < 1 || z < 1 || x >= GRID - 1 || z >= GRID - 1) continue
        const top = state.cellTop[z * GRID + x]
        if (top <= SHALLOW_WATER_LEVEL) continue
        if (isCellOccupied(x, z)) continue
        return { x, z }
      }
    }
  }
  return null
}

// ============================================================================
// Helpers d'occupation
// ============================================================================
export function isCellOccupied(x, z) {
  for (const t of state.trees) if (t.x === x && t.z === z) return true
  for (const r of state.rocks) if (r.x === x && r.z === z) return true
  for (const h of state.houses) if (h.x === x && h.z === z) return true
  for (const m of state.manors) if ((x === m.x || x === m.x+1) && (z === m.z || z === m.z+1)) return true
  if (state.bigHouses) {
    for (const b of state.bigHouses) {
      if (x >= b.x && x < b.x + 4 && z >= b.z && z < b.z + 4) return true
    }
  }
  for (const h of state.researchHouses) if (h.x === x && h.z === z) return true
  for (const b of state.bushes) if (b.x === x && b.z === z) return true
  if (state.observatories) {
    for (const o of state.observatories) if (o.x === x && o.z === z) return true
  }
  if (state.wheatFields) {
    for (const f of state.wheatFields) {
      if (x >= f.x && x < f.x + 2 && z >= f.z && z < f.z + 2) return true
    }
  }
  if (state.cellOre[z * GRID + x]) return true
  return false
}

// ============================================================================
// Promontoires d'observation (astronomie MVP C)
// Simple tour : socle en pierre + plateforme, pour qu'un colon monte dessus la
// nuit et genere des points nocturnes.
// ============================================================================
// Lot B : capacite max d occupants caches dans le promontoire la nuit. Au-dela
// les chercheurs surnumeraires restent dehors (IDLE wander, pas de night points).
export const OBSERVATORY_CAPACITY = 2

function makeObservatory() {
  const g = new THREE.Group()
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8d8377, roughness: 0.92, flatShading: true })
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9, flatShading: true })
  const starMat = new THREE.MeshStandardMaterial({ color: 0xf4e8b0, roughness: 0.35, emissive: 0x8a6a10, emissiveIntensity: 0.55, flatShading: true })
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.85), stoneMat)
  base.position.y = 0.45
  base.castShadow = true; base.receiveShadow = true
  g.add(base)
  const mid = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.6), stoneMat)
  mid.position.y = 1.18
  mid.castShadow = true
  g.add(mid)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), woodMat)
  deck.position.y = 1.52
  deck.castShadow = true; deck.receiveShadow = true
  g.add(deck)
  for (const ox of [-0.4, 0.4]) {
    for (const oz of [-0.4, 0.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), woodMat)
      rail.position.set(ox, 1.78, oz)
      rail.castShadow = true
      g.add(rail)
    }
  }
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), starMat)
  star.position.y = 2.1
  g.add(star)
  return g
}

export function addObservatory(gx, gz) {
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return null
  const g = makeObservatory()
  g.position.set(gx + 0.5, top, gz + 0.5)
  scene.add(g)
  // Lot B : lumiere chaude allumee la nuit quand au moins un chercheur observe
  // depuis l interieur du promontoire. Attachee au group pour suivre la position.
  const light = new THREE.PointLight(0xffd070, 0, 5)
  light.position.set(0, 1.6, 0)
  g.add(light)
  const entry = { x: gx, z: gz, group: g, occupants: [], light }
  _markUnderConstruction(entry, 'promontoire')
  state.observatories.push(entry)
  const alt = top ?? 3
  const BASE_RADIUS = 20
  const HEIGHT_BONUS = Math.max(0, alt - 3) * 2
  const radius = Math.min(35, BASE_RADIUS + HEIGHT_BONUS)
  // Lot B : la zone de vision n est activee qu en fin de construction. On
  // memorise le rayon pour que onBuildingComplete declenche revealAround.
  entry.pendingVisionRadius = radius
  if (!entry.isUnderConstruction) {
    revealAround(gx, gz, radius)
    showHudToast(`Promontoire érigé, vision ${radius} cases`, 3000)
    entry.pendingVisionRadius = 0
  }
  return entry
}

export function removeObservatoriesIn(cells) {
  if (!state.observatories || !state.observatories.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  for (let i = state.observatories.length - 1; i >= 0; i--) {
    const o = state.observatories[i]
    if (cellSet.has(o.z * GRID + o.x)) {
      // Lot B : libere les occupants caches avant destruction du group, sinon
      // le mesh du colon resterait invisible.
      _releaseObservatoryOccupants(o)
      scene.remove(o.group)
      o.group.traverse(node => { if (node.material) node.material.dispose(); if (node.geometry) node.geometry.dispose() })
      state.observatories.splice(i, 1)
    }
  }
}

// Lot B : promontoire = abri nocturne pour chercheurs. Helpers d entree/sortie.
function _findColonistById(id) {
  if (!state.colonists) return null
  for (const c of state.colonists) if (c.id === id) return c
  return null
}

function _updateObservatoryLight(entry) {
  if (!entry || !entry.light) return
  entry.light.intensity = (entry.occupants && entry.occupants.length > 0) ? 1.5 : 0
}

// Tente d ajouter le colon c dans le promontoire entry. Retourne true si
// l ajout a reussi (place dispo, mesh masque, lumiere allumee).
export function enterObservatory(c, entry) {
  if (!c || !entry) return false
  if (entry.isUnderConstruction) return false
  if (!Array.isArray(entry.occupants)) entry.occupants = []
  if (entry.occupants.includes(c.id)) {
    // Deja a l interieur : invariant a respecter (mesh masque, lumiere ON).
    if (c.group) c.group.visible = false
    c.isHidden = true
    _updateObservatoryLight(entry)
    return true
  }
  if (entry.occupants.length >= OBSERVATORY_CAPACITY) return false
  entry.occupants.push(c.id)
  if (c.group) c.group.visible = false
  c.isHidden = true
  _updateObservatoryLight(entry)
  return true
}

// Retire le colon c de TOUT promontoire ou son id apparait. Restaure la
// visibilite du mesh et eteint la lumiere si plus personne.
export function releaseFromObservatory(c) {
  if (!c || !state.observatories) return
  for (const entry of state.observatories) {
    if (!Array.isArray(entry.occupants)) continue
    const idx = entry.occupants.indexOf(c.id)
    if (idx >= 0) {
      entry.occupants.splice(idx, 1)
      _updateObservatoryLight(entry)
    }
  }
  if (c.group) c.group.visible = true
  c.isHidden = false
}

function _releaseObservatoryOccupants(entry) {
  if (!entry || !Array.isArray(entry.occupants)) return
  for (const id of entry.occupants) {
    const c = _findColonistById(id)
    if (c) {
      if (c.group) c.group.visible = true
      c.isHidden = false
    }
  }
  entry.occupants.length = 0
  _updateObservatoryLight(entry)
}

// Appele au lever du jour pour vider tous les promontoires : les chercheurs
// reapparaissent et la lumiere s eteint.
export function releaseAllObservatoryOccupants() {
  if (!state.observatories) return
  for (const entry of state.observatories) _releaseObservatoryOccupants(entry)
}

export function isObservatoryOn(x, z) {
  if (!state.observatories) return false
  // Tolerance de voisinage : on considere "sur le promontoire" la cellule
  // meme et les 4 cellules adjacentes (Manhattan <= 1). Le pathfinding peut
  // deposer un colon a cote si la cellule du promontoire n est pas atteignable
  // (palier trop haut). Coherent avec isColonistOnObservatory dans daynight.js.
  for (const o of state.observatories) {
    if (o.isUnderConstruction) continue
    const dx = Math.abs(o.x - x)
    const dz = Math.abs(o.z - z)
    if (dx + dz <= 1) return true
  }
  return false
}

export function isRockOn(x, z) {
  for (const r of state.rocks) if (r.x === x && r.z === z) return true
  return false
}

// Retire le rocher present sur la tuile (tas de 2 a 3 cailloux), renvoie la
// quantite de pierre recoltee (environ 2 par caillou).
export function collectRockAt(x, z) {
  let chunks = 0
  for (const r of state.rocks) {
    if (r.x === x && r.z === z) {
      chunks = (r.indices && r.indices.length) ? r.indices.length : 2
      break
    }
  }
  if (!chunks) return 0
  removeRocksIn([{ x, z }])
  return chunks * 2
}

export function isHouseOn(x, z) {
  for (const h of state.houses) if (h.x === x && h.z === z) return true
  for (const m of state.manors) if ((x === m.x || x === m.x+1) && (z === m.z || z === m.z+1)) return true
  if (state.bigHouses) {
    for (const b of state.bigHouses) {
      if (x >= b.x && x < b.x + 4 && z >= b.z && z < b.z + 4) return true
    }
  }
  for (const h of state.researchHouses) if (h.x === x && h.z === z) return true
  return false
}
export function isOreOn(x, z) {
  for (const o of state.ores) if (o.x === x && o.z === z) return true
  return false
}
export function isBushOn(x, z) {
  for (const b of state.bushes) if (b.x === x && b.z === z) return true
  return false
}
export function isMineBlocked(x, z) {
  // Plus rien n'est "bloquant" au sens strict : tout peut etre designe, mais
  // la logique d'execution dans colonist detecte le contenu et agit en
  // consequence (abat arbre, ramasse rocher, extrait filon, recolte buisson,
  // sinon mine le voxel). Seules les constructions (maisons, laboratoires,
  // promontoires, cairn) restent intouchables car ce sont des placements que
  // le joueur efface explicitement avec Effacer. B17 : inclut toutes les
  // fondations de batiments pour qu'un colon ne puisse miner le sol sous un
  // batiment pose.
  if (isHouseOn(x, z)) return true  // inclut bigHouses via isHouseOn
  if (state.observatories) {
    for (const o of state.observatories) if (o.x === x && o.z === z) return true
  }
  if (state.cairns) {
    for (const c of state.cairns) if (c.x === x && c.z === z) return true
  }
  return false
}

// Recolte complete d'un buisson quand on mine le voxel dessous : retire le
// buisson et renvoie 1 a 3 baies bonus. La recolte "normale" via pickHarvest
// donne beaucoup plus (voir maxBerries sur addBush).
export function grabBushAt(x, z) {
  const bush = state.bushes.find(b => b.x === x && b.z === z)
  if (!bush || bush.berries <= 0) return 0
  const picked = Math.min(bush.berries, 2 + Math.floor(Math.random() * 3))
  bush.berries -= picked
  refreshBushBerries(bush)
  bush.regenTimer = 0
  return picked
}

// ============================================================================
// Flag "unique" des batiments (U7, session 14)
// ============================================================================
// Certains batiments de data/buildings.json portent "unique": true. Le moteur
// compte les instances existantes dans state et expose un guard generique.
// Le Cairn est gere a part par age-transitions.js (cinematique + etat d age).

// Map id batiment -> nom du tableau d instances dans state
const UNIQUE_STATE_ARRAY_BY_BUILDING = {
  'hutte-du-sage': 'researchHouses',
  'cairn-pierre':  'cairns'
}

// Map tool de l actionbar -> id batiment vise. Le tool "cairn" reste gere par
// age-transitions.js (conditions cumulatives, cinematique). On ne touche pas
// ici au bouton Cairn pour eviter les double gestion.
const UNIQUE_TOOL_TO_BUILDING = {
  'research': 'hutte-du-sage'
}

/**
 * Compte les instances posees d un batiment, en s appuyant sur les tableaux
 * de state. Retourne 0 si le batiment n est pas connu ou sans mapping.
 * @param {string} buildingId
 * @returns {number}
 */
export function countBuildingInstances(buildingId) {
  const arrName = UNIQUE_STATE_ARRAY_BY_BUILDING[buildingId]
  if (!arrName) return 0
  const arr = state[arrName]
  if (!Array.isArray(arr)) return 0
  return arr.length
}

/**
 * Retourne true si le batiment a "unique": true dans buildings.json ET qu au
 * moins une instance est deja posee dans state. Utilise par le HUD et la
 * logique de pose pour griser/desactiver le bouton.
 * @param {string} buildingId
 * @returns {boolean}
 */
export function isBuildingUniqueAndPlaced(buildingId) {
  const def = getBuildingById(buildingId)
  if (!def || def.unique !== true) return false
  return countBuildingInstances(buildingId) > 0
}

/**
 * Parcourt les boutons de l actionbar (data-tool=...) et grise/active ceux
 * associes a un batiment "unique" deja pose. Appele a cadence lente (~1s)
 * depuis la boucle principale. Le bouton Cairn garde son traitement propre
 * dans age-transitions.js.
 */
export function checkUniqueBuildingButtons() {
  for (const tool in UNIQUE_TOOL_TO_BUILDING) {
    const btn = document.querySelector(`.tool[data-tool="${tool}"]`)
    if (!btn) continue
    const buildingId = UNIQUE_TOOL_TO_BUILDING[tool]
    const placed = isBuildingUniqueAndPlaced(buildingId)
    if (placed) {
      if (!btn.dataset.uniqueBlocked) {
        btn.dataset.uniqueBlocked = '1'
        btn.dataset.origTitle = btn.title || ''
        btn.disabled = true
        btn.classList.add('disabled-unique')
        btn.style.pointerEvents = 'none'
        btn.title = 'Batiment unique deja pose'
      }
    } else if (btn.dataset.uniqueBlocked) {
      delete btn.dataset.uniqueBlocked
      btn.disabled = false
      btn.classList.remove('disabled-unique')
      btn.style.pointerEvents = ''
      btn.title = btn.dataset.origTitle || ''
      delete btn.dataset.origTitle
    }
  }
}

// ============================================================================
// Fog of war : vegetation
// Masque (noir) les meshes de vegetation dans les zones non revelees.
// Restaure la couleur d origine quand une cellule est revelee.
// ============================================================================

const _fogBlack = new THREE.Color(0, 0, 0)

function _setGroupVisibility(group, visible) {
  if (!group) return
  group.visible = visible
}

// Met a jour la visibilite/couleur de toute la vegetation sur la cellule (x, z).
// Appele par le callback setOnCellRevealed chaque fois qu une cellule est revelee.
export function repaintVegetationAt(x, z) {
  if (!state.cellRevealed) return
  const revealed = !!state.cellRevealed[z * GRID + x]

  // Arbres
  for (const t of state.trees) {
    if (t.x !== x || t.z !== z) continue
    if (t.group) {
      _setGroupVisibility(t.group, revealed)
    } else if (t.slot != null) {
      if (revealed) {
        leafMesh.setColorAt(t.slot, t.leafColor || new THREE.Color(0x4a8a3a))
        trunkMesh.setColorAt(t.slot, t.trunkColor || new THREE.Color(0x6b4a2b))
      } else {
        leafMesh.setColorAt(t.slot, _fogBlack)
        trunkMesh.setColorAt(t.slot, _fogBlack)
      }
      if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true
      trunkMesh.instanceColor.needsUpdate = true
    }
  }

  // Rochers
  for (const r of state.rocks) {
    if (r.x !== x || r.z !== z) continue
    if (r.group) {
      _setGroupVisibility(r.group, revealed)
    } else if (r.indices) {
      for (let i = 0; i < r.indices.length; i++) {
        const idx = r.indices[i]
        if (revealed) {
          const col = (r.chunkColors && r.chunkColors[i]) ? r.chunkColors[i] : new THREE.Color(0xa0998e)
          rockMesh.setColorAt(idx, col)
        } else {
          rockMesh.setColorAt(idx, _fogBlack)
        }
      }
      if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true
    }
  }

  // Filons
  for (const o of state.ores) {
    if (o.x !== x || o.z !== z) continue
    if (o.oreRockSlot != null) {
      if (revealed) {
        oreRockMesh.setColorAt(o.oreRockSlot, o.oreRockColor || new THREE.Color(1, 1, 1))
      } else {
        oreRockMesh.setColorAt(o.oreRockSlot, _fogBlack)
      }
      if (oreRockMesh.instanceColor) oreRockMesh.instanceColor.needsUpdate = true
    }
    if (o.crystalSlots) {
      for (let i = 0; i < o.crystalSlots.length; i++) {
        const ci = o.crystalSlots[i]
        if (revealed) {
          const col = (o.crystalColors && o.crystalColors[i]) ? o.crystalColors[i] : new THREE.Color(1, 1, 1)
          crystalMesh.setColorAt(ci, col)
        } else {
          crystalMesh.setColorAt(ci, _fogBlack)
        }
      }
      if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true
    }
  }

  // Buissons
  for (const b of state.bushes) {
    if (b.x !== x || b.z !== z) continue
    for (let i = 0; i < b.leafIndices.length; i++) {
      const li = b.leafIndices[i]
      if (revealed) {
        const col = (b.leafColors && b.leafColors[i]) ? b.leafColors[i] : new THREE.Color(0x3d6b2d)
        bushLeafMesh.setColorAt(li, col)
      } else {
        bushLeafMesh.setColorAt(li, _fogBlack)
      }
    }
    if (bushLeafMesh.instanceColor) bushLeafMesh.instanceColor.needsUpdate = true
    for (let i = 0; i < b.berryIndices.length; i++) {
      const bi = b.berryIndices[i]
      if (revealed) {
        const col = (b.berryColors && b.berryColors[i]) ? b.berryColors[i] : new THREE.Color(0x6b2d8c)
        bushBerryMesh.setColorAt(bi, col)
      } else {
        bushBerryMesh.setColorAt(bi, _fogBlack)
      }
    }
    if (bushBerryMesh.instanceColor) bushBerryMesh.instanceColor.needsUpdate = true
  }

  // Cerfs
  if (state.deers) {
    for (const d of state.deers) {
      if (d.x !== x || d.z !== z) continue
      _setGroupVisibility(d.group, revealed)
    }
  }
}

// Applique le fog a toute la vegetation (appele apres populateDefaultScene,
// avant la revelation initiale). Tout ce qui est sur une cellule non revelee
// est masque.
export function applyFogToAllVegetation() {
  if (!state.cellRevealed) return

  // Arbres
  for (const t of state.trees) {
    const revealed = !!state.cellRevealed[t.z * GRID + t.x]
    if (t.group) {
      _setGroupVisibility(t.group, revealed)
    } else if (t.slot != null) {
      if (!revealed) {
        leafMesh.setColorAt(t.slot, _fogBlack)
        trunkMesh.setColorAt(t.slot, _fogBlack)
        if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true
        trunkMesh.instanceColor.needsUpdate = true
      }
    }
  }

  // Rochers
  for (const r of state.rocks) {
    const revealed = !!state.cellRevealed[r.z * GRID + r.x]
    if (r.group) {
      _setGroupVisibility(r.group, revealed)
    } else if (r.indices) {
      if (!revealed) {
        for (const idx of r.indices) rockMesh.setColorAt(idx, _fogBlack)
        if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true
      }
    }
  }

  // Filons
  for (const o of state.ores) {
    const revealed = !!state.cellRevealed[o.z * GRID + o.x]
    if (!revealed) {
      if (o.oreRockSlot != null) {
        oreRockMesh.setColorAt(o.oreRockSlot, _fogBlack)
        if (oreRockMesh.instanceColor) oreRockMesh.instanceColor.needsUpdate = true
      }
      if (o.crystalSlots) {
        for (const ci of o.crystalSlots) crystalMesh.setColorAt(ci, _fogBlack)
        if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true
      }
    }
  }

  // Buissons
  for (const b of state.bushes) {
    const revealed = !!state.cellRevealed[b.z * GRID + b.x]
    if (!revealed) {
      for (const li of b.leafIndices) bushLeafMesh.setColorAt(li, _fogBlack)
      if (bushLeafMesh.instanceColor) bushLeafMesh.instanceColor.needsUpdate = true
      for (const bi of b.berryIndices) bushBerryMesh.setColorAt(bi, _fogBlack)
      if (bushBerryMesh.instanceColor) bushBerryMesh.instanceColor.needsUpdate = true
    }
  }

  // Cerfs
  if (state.deers) {
    for (const d of state.deers) {
      const revealed = !!state.cellRevealed[d.z * GRID + d.x]
      _setGroupVisibility(d.group, revealed)
    }
  }
}

// Enregistrement du callback dans terrain.js.
// Utilise la forme immediate : setOnCellRevealed est appele au chargement du
// module, avant que revealAround soit jamais invoque.
setOnCellRevealed(repaintVegetationAt)

// ============================================================================
// Animation flamme (foyer fallback procedural uniquement)
// ============================================================================
export function tickFoyers(dt) {
  const t = Date.now()
  const step = (typeof dt === 'number' && isFinite(dt)) ? dt : 0
  for (const f of state.foyers) {
    if (f.isUnderConstruction) continue
    // Fallback procedural : mesh stocke dans userData.flame
    let flame = f.group.userData.flame
    // GLB : chercher un mesh dont le nom contient fire/flame/embers
    if (!flame) {
      f.group.traverse(function(o) {
        if (flame || !o.isMesh) return
        const n = (o.name || '').toLowerCase()
        if (n.includes('fire') || n.includes('flame') || n.includes('embers')) flame = o
      })
    }
    if (flame) {
      // Cuisson active : flamme plus haute pour signaler visuellement.
      const cookBoost = f.isCooking ? 0.4 : 0
      flame.scale.y = 1 + cookBoost + 0.15 * Math.sin(t * 0.006)
      flame.scale.x = 1 + 0.08 * Math.sin(t * 0.009)
    }
    // Lot B : avancement de la cuisson. La viande crue a deja ete consommee
    // au moment ou la cuisson a ete lancee. A l echeance, on produit 1
    // cooked-meat dans state.resources et on libere le foyer.
    if (f.isCooking) {
      f.cookTimer = (f.cookTimer || 0) + step
      if (f.cookTimer >= COOK_DURATION) {
        state.resources['cooked-meat'] = (state.resources['cooked-meat'] || 0) + 1
        f.isCooking = false
        f.cookTimer = 0
      }
    }
  }
}

// ============================================================================
// Lot B residents : helpers de resolution d habitations.
// homeBuildingId est encode "kind:id" (ex: "house:0", "big-house:1", "manor:2")
// pour pointer une instance d habitation precise et survivre aux saves.
// ============================================================================

export function makeHomeRef(kind, building) {
  if (!kind || !building) return null
  return kind + ':' + building.id
}

export function resolveHomeBuilding(homeRef) {
  if (!homeRef || typeof homeRef !== 'string') return null
  const sep = homeRef.indexOf(':')
  if (sep < 0) return null
  const kind = homeRef.slice(0, sep)
  const id = parseInt(homeRef.slice(sep + 1), 10)
  if (!Number.isFinite(id)) return null
  let arr = null
  if (kind === 'house')         arr = state.houses
  else if (kind === 'big-house') arr = state.bigHouses
  else if (kind === 'manor')     arr = state.manors
  if (!arr) return null
  for (const b of arr) if (b && b.id === id) return { kind, building: b }
  return null
}

// Casse le lien residents / homeBuildingId d un colon (a appeler avant
// destruction du colon ou de son habitation). Symetrique : retire l id du
// tableau residents du batiment et nettoie c.homeBuildingId / assignedBuildingId.
export function unlinkColonistFromHome(colonist) {
  if (!colonist) return
  const ref = colonist.homeBuildingId
  if (ref) {
    const r = resolveHomeBuilding(ref)
    if (r && r.building && Array.isArray(r.building.residents)) {
      const idx = r.building.residents.indexOf(colonist.id)
      if (idx !== -1) r.building.residents.splice(idx, 1)
    }
  }
  colonist.homeBuildingId = null
  colonist.assignedBuildingId = null
}

// Lot B residents : assigne un colon a un batiment d habitation. Verifie la
// capacite, retire l ancien lien si present, pose le nouveau lien symetrique
// (residents + homeBuildingId). Retourne { ok: true } ou { ok: false, reason }.
// reason : 'full' | 'invalid' | 'unknown-kind'.
export function assignColonistToHouse(colonist, building) {
  if (!colonist || !building) return { ok: false, reason: 'invalid' }
  // Devine le kind a partir de l appartenance aux tableaux d etat.
  let kind = null
  if (state.houses && state.houses.includes(building)) kind = 'house'
  else if (state.bigHouses && state.bigHouses.includes(building)) kind = 'big-house'
  else if (state.manors && state.manors.includes(building)) kind = 'manor'
  if (!kind) return { ok: false, reason: 'unknown-kind' }
  if (!Array.isArray(building.residents)) building.residents = []
  const cap = (typeof building.residentsCapacity === 'number') ? building.residentsCapacity : 2
  if (building.residents.length >= cap) return { ok: false, reason: 'full' }
  // Retire de l ancienne maison si necessaire.
  if (colonist.homeBuildingId) unlinkColonistFromHome(colonist)
  building.residents.push(colonist.id)
  colonist.homeBuildingId = makeHomeRef(kind, building)
  // Conserve assignedBuildingId pour compat needs.js (besoin shelter).
  colonist.assignedBuildingId = kind === 'big-house' ? 'big-house'
                              : kind === 'manor'    ? 'manor'
                              : 'cabane'
  return { ok: true }
}

// Auto-reparation des liens residents <-> colons. Pour chaque maison sans
// residents, attache jusqu a residentsCapacity colons sans-abri proches.
// Utilise au reload pour les saves anciennes ou le linkage etait casse.
export function repairResidentsLinks() {
  const allHouses = [
    ...(state.houses || []).map(b => ({ kind: 'house', b })),
    ...(state.bigHouses || []).map(b => ({ kind: 'big-house', b })),
    ...(state.manors || []).map(b => ({ kind: 'manor', b }))
  ]
  // Index des colons par id pour reparation des homeBuildingId existants.
  const byId = new Map()
  for (const c of state.colonists) byId.set(c.id, c)
  // 1) Re-pose les homeBuildingId sur les colons listes dans residents.
  for (const { kind, b } of allHouses) {
    if (!Array.isArray(b.residents)) { b.residents = []; continue }
    const ref = makeHomeRef(kind, b)
    for (const cid of b.residents) {
      const c = byId.get(cid)
      if (c && !c.homeBuildingId) c.homeBuildingId = ref
    }
  }
  // 2) Pour chaque maison vide, rattache les colons sans-abri proches.
  for (const { kind, b } of allHouses) {
    const cap = (typeof b.residentsCapacity === 'number') ? b.residentsCapacity
              : kind === 'big-house' ? 6
              : kind === 'manor'     ? 4
              : 2
    if (!Array.isArray(b.residents)) b.residents = []
    if (b.residents.length >= cap) continue
    const need = cap - b.residents.length
    const cx = kind === 'big-house' ? b.x + 2 : kind === 'manor' ? b.x + 1 : b.x
    const cz = kind === 'big-house' ? b.z + 2 : kind === 'manor' ? b.z + 1 : b.z
    const candidates = state.colonists
      .filter(c => c && !c.homeBuildingId)
      .map(c => ({ c, d: Math.abs(c.x - cx) + Math.abs(c.z - cz) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, need)
    for (const { c } of candidates) {
      b.residents.push(c.id)
      c.homeBuildingId = makeHomeRef(kind, b)
      if (!c.assignedBuildingId) {
        c.assignedBuildingId = kind === 'big-house' ? 'big-house'
                             : kind === 'manor'    ? 'manor'
                             : 'cabane'
      }
    }
  }
}
