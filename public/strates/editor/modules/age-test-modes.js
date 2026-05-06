// ============================================================================
// age-test-modes.js -- Lot D
// Modes de test par age, extensibles pour les 7 ages du jeu.
//
// Usage URL : ?mode=bronze-test
//
// Chaque mode inject un etat "fin d'age precedent" directement dans state,
// bypasse le flow normal (new game, onboarding, Cairn) et ne cree pas de
// sauvegarde en localStorage.
//
// AJOUT D'UN NOUVEAU MODE :
//   1. Creer une fonction setupIronTest() qui appelle setupBronzeTest() puis
//      injecte les conditions de fin d'age 2 vers 3.
//   2. L'enregistrer dans TEST_MODE_HANDLERS ci-dessous.
//   Le pattern garantit que chaque mode est un etat complet d'entree dans
//   l'age suivant, sans duplication de code entre modes.
//
// CONTRAINTES :
//   - Ce module ne modifie pas age-transitions.js, gamedata.js ni state.js.
//   - Il consomme leurs exports sans les toucher.
//   - Il n'ecrit pas en localStorage (mode session uniquement).
// ============================================================================

import { state } from './state.js'
import { TECH_TREE_DATA } from './gamedata.js'
import { getTechsForAge, getBuildingsForAge } from './gamedata.js'
import { spawnColonist } from './colonist.js'
import {
  addHouse, addFoyer, addResearchHouse, addObservatory, isCellOccupied,
  addTree, addDeer, addRock, addOre
} from './placements.js'
import { GRID, CHIEF_NAME, SHALLOW_WATER_LEVEL } from './constants.js'

// ---------------------------------------------------------------------------
// Registre des modes disponibles
// Pour ajouter iron-test : { 'iron-test': setupIronTest }
// ---------------------------------------------------------------------------
const TEST_MODE_HANDLERS = {
  'bronze-test': setupBronzeTest,
  // 'iron-test': setupIronTest,  // TODO age 3
}

// ---------------------------------------------------------------------------
// Lecture du parametre URL
// ---------------------------------------------------------------------------

/**
 * Retourne le mode de test depuis l'URL (?mode=bronze-test), ou null.
 * @returns {string|null}
 */
export function getTestModeFromURL() {
  try {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('mode')
    if (mode && mode.endsWith('-test')) return mode
    return null
  } catch (e) {
    return null
  }
}

/**
 * Applique le mode de test donne si un handler existe.
 * A appeler APRES init de la scene et du terrain, AVANT le spawn par defaut.
 * Retourne true si un mode a ete applique, false sinon.
 * @param {string} mode
 * @returns {boolean}
 */
export function applyTestMode(mode) {
  const handler = TEST_MODE_HANDLERS[mode]
  if (!handler) {
    console.warn('[age-test-modes] Mode inconnu :', mode, '-- modes disponibles :', Object.keys(TEST_MODE_HANDLERS))
    return false
  }
  console.info('[age-test-modes] Application du mode', mode)
  handler()
  _showTestModeBadge(mode)
  return true
}

// ---------------------------------------------------------------------------
// setupBronzeTest
// Injecte un etat "fin d'age de Pierre, pret a entrer dans l'age du Bronze".
// Ne sauvegarde rien en localStorage.
// ---------------------------------------------------------------------------

function setupBronzeTest() {
  // --- 1. Trouver un point de spawn convenable sur la carte ---
  const spawnPt = _findGrassSpawn()
  if (!spawnPt) {
    console.error('[age-test-modes] Impossible de trouver un spawn grass pour le mode bronze-test.')
    return
  }
  const { sx, sz } = spawnPt
  state.spawn = { x: sx, z: sz }

  // --- 2. Colons : François chef + 5 colons ---
  // Le chef est place en premier, exactement comme worldgen.
  spawnColonist(sx, sz, { forceName: CHIEF_NAME, forceGender: 'M', isChief: true })
  // 5 colons supplementaires autour du spawn
  const offsets = [
    [ 1,  0], [-1,  0], [ 0,  1],
    [ 0, -1], [ 2,  1]
  ]
  for (const [ox, oz] of offsets) {
    const cx = Math.max(0, Math.min(GRID - 1, sx + ox))
    const cz = Math.max(0, Math.min(GRID - 1, sz + oz))
    spawnColonist(cx, cz, {})
  }

  // --- 3. Batiments (places immediatement termines, sans construction) ---
  // Foyer au centre
  _placeBuilding('foyer', sx, sz, () => addFoyer(sx, sz))

  // 2 Cabanes autour du foyer
  const housePositions = [
    [sx + 2, sz],
    [sx - 2, sz],
  ]
  for (const [hx, hz] of housePositions) {
    const x = Math.max(0, Math.min(GRID - 1, hx))
    const z = Math.max(0, Math.min(GRID - 1, hz))
    if (!isCellOccupied(x, z)) {
      const h = addHouse(x, z)
      if (h) {
        // Marquer comme construit immediatement
        h.isUnderConstruction = false
        h.constructionProgress = 1
      }
    }
  }

  // Hutte du sage
  const rsPos = _findFreeCell(sx, sz, 3, 6)
  if (rsPos) {
    const rs = addResearchHouse(rsPos.x, rsPos.z)
    if (rs) {
      rs.isUnderConstruction = false
      rs.constructionProgress = 1
    }
  }

  // Promontoire (un peu plus loin)
  const obsPos = _findFreeCell(sx, sz, 5, 10)
  if (obsPos) {
    const obs = addObservatory(obsPos.x, obsPos.z)
    if (obs) {
      obs.isUnderConstruction = false
      obs.constructionProgress = 1
    }
  }

  // Assigner un chercheur a la hutte si possible
  if (state.researchHouses.length > 0 && state.colonists.length > 1) {
    const lab = state.researchHouses[0]
    if (!Array.isArray(lab.assignedColonistIds)) lab.assignedColonistIds = []
    // On prend le 2e colon (pas le chef)
    const researcher = state.colonists[1]
    if (researcher) {
      lab.assignedColonistIds.push(researcher.id)
      researcher.researchBuildingId = lab.id
      researcher.profession = 'chercheur'
    }
  }

  // --- 4. Stocks ---
  state.resources.wood  = (state.resources.wood  || 0) + 100
  state.resources.stone = (state.resources.stone || 0) + 100
  state.resources.berries = (state.resources.berries || 0) + 50
  state.resources.copper = (state.resources.copper || 0) + 20
  state.resources.tin    = (state.resources.tin    || 0) + 20

  // --- 5. Techs age 1 : toutes debloquees ---
  const age1TechIds = [
    'pick-stone', 'axe-stone', 'bow-wood', 'shovel-stone',
    'gathering-improved', 'first-field', 'fire-mastery',
    'big-house', 'demolition', 'basic-research', 'oral-tradition',
    'promontory', 'astronomy-1'
  ]
  for (const id of age1TechIds) {
    if (!state.techs[id]) {
      // Cas rare : la tech n'est pas encore dans state.techs (JSON pas encore injecte).
      // On la cree a minima.
      state.techs[id] = { name: id, cost: 0, req: null, age: 1, unlocked: true }
    } else {
      state.techs[id].unlocked = true
    }
  }

  // Cumul de points de recherche (pour que la condition Cairn soit cohortente)
  // On calcule la somme des couts des techs age 1 si TECH_TREE_DATA est disponible.
  if (TECH_TREE_DATA && Array.isArray(TECH_TREE_DATA.techs)) {
    const totalAge1 = TECH_TREE_DATA.techs
      .filter(t => t.age === 1)
      .reduce((s, t) => {
        const c = t.cost && typeof t.cost === 'object' ? (t.cost.research || 0) : (t.cost || 0)
        return s + c
      }, 0)
    state.totalResearchSpent = Math.max(state.totalResearchSpent || 0, totalAge1)
  } else {
    state.totalResearchSpent = Math.max(state.totalResearchSpent || 0, 200)
  }

  // --- 6. Passer directement en age 2 (sans cinematique, sans Cairn) ---
  state.currentAge = 2
  if (!state.ageUnlockedAt) state.ageUnlockedAt = {}
  state.ageUnlockedAt[1] = state.ageUnlockedAt[1] || Date.now()
  state.ageUnlockedAt[2] = Date.now()
  if (!Array.isArray(state.achievements)) state.achievements = []
  state.achievements.push({ id: 'bronze_age_test', at: Date.now(), mode: 'bronze-test' })

  // --- 7. Techs age 2 : marquees disponibles (meme pattern que _applyBronzeAge) ---
  const techsBronze = getTechsForAge(2)
  for (const t of techsBronze) {
    if (state.techs[t.id]) {
      state.techs[t.id]._bronzeAvailable = true
    }
  }

  // Batiments age 2 marques disponibles
  const buildingsBronze = getBuildingsForAge(2)
  for (const b of buildingsBronze) {
    b._available = true
  }

  // --- 8. Points de recherche disponibles pour tester les techs age 2 ---
  state.researchPoints = (state.researchPoints || 0) + 50
  // On injecte aussi en activeResearch = null pour eviter un etat inconsistant.
  if (!state.researchQueue) state.researchQueue = []
  if (state.activeResearch === undefined) state.activeResearch = null

  // --- 9. Ressources naturelles autour du village ---
  // Les bâtiments du test occupent le centre (rayon ~10).
  // On spawne arbres, cerfs et filons dans un anneau rayon 15-25.

  const cx = sx
  const cz = sz
  let treesSpawned = 0
  let deersSpawned = 0
  let stonesSpawned = 0
  let coppersSpawned = 0
  let tinsSpawned = 0
  let coalsSpawned = 0

  // Arbres : ~30, biome grass ou forest, rayon 15-25
  for (let tries = 0; tries < 3000 && treesSpawned < 30; tries++) {
    const angle = Math.random() * Math.PI * 2
    const dist  = 15 + Math.random() * 10
    const tx = Math.round(cx + Math.cos(angle) * dist)
    const tz = Math.round(cz + Math.sin(angle) * dist)
    if (tx < 2 || tz < 2 || tx >= GRID - 2 || tz >= GRID - 2) continue
    const biome = state.cellBiome ? state.cellBiome[tz * GRID + tx] : null
    const top   = state.cellTop   ? state.cellTop[tz * GRID + tx]   : 0
    if (top <= SHALLOW_WATER_LEVEL) continue
    if (biome !== 'grass' && biome !== 'forest') continue
    if (isCellOccupied(tx, tz)) continue
    if (addTree(tx, tz)) treesSpawned++
  }

  // Cerfs : 4-5, biome grass ou forest, rayon 15-25
  for (let tries = 0; tries < 2000 && deersSpawned < 5; tries++) {
    const angle = Math.random() * Math.PI * 2
    const dist  = 15 + Math.random() * 10
    const dx = Math.round(cx + Math.cos(angle) * dist)
    const dz = Math.round(cz + Math.sin(angle) * dist)
    if (dx < 2 || dz < 2 || dx >= GRID - 2 || dz >= GRID - 2) continue
    const biome = state.cellBiome ? state.cellBiome[dz * GRID + dx] : null
    const top   = state.cellTop   ? state.cellTop[dz * GRID + dx]   : 0
    if (top <= SHALLOW_WATER_LEVEL) continue
    if (biome !== 'grass' && biome !== 'forest') continue
    if (isCellOccupied(dx, dz)) continue
    if (addDeer(dx, dz)) deersSpawned++
  }

  // Rochers (pierre extractible) : 8-10, tous biomes > eau, rayon 15-25
  // Note : ore-stone n'existe pas dans ORE_TYPES -- on utilise addRock() pour la pierre.
  for (let tries = 0; tries < 2000 && stonesSpawned < 9; tries++) {
    const angle = Math.random() * Math.PI * 2
    const dist  = 15 + Math.random() * 10
    const rx = Math.round(cx + Math.cos(angle) * dist)
    const rz = Math.round(cz + Math.sin(angle) * dist)
    if (rx < 2 || rz < 2 || rx >= GRID - 2 || rz >= GRID - 2) continue
    const top = state.cellTop ? state.cellTop[rz * GRID + rx] : 0
    if (top <= SHALLOW_WATER_LEVEL) continue
    if (isCellOccupied(rx, rz)) continue
    const prevRocks = state.rocks.length
    addRock(rx, rz)
    if (state.rocks.length > prevRocks) stonesSpawned++
  }

  // Filons de cuivre : 4-5
  for (let tries = 0; tries < 2000 && coppersSpawned < 4; tries++) {
    const angle = Math.random() * Math.PI * 2
    const dist  = 15 + Math.random() * 10
    const ox = Math.round(cx + Math.cos(angle) * dist)
    const oz = Math.round(cz + Math.sin(angle) * dist)
    if (ox < 2 || oz < 2 || ox >= GRID - 2 || oz >= GRID - 2) continue
    const top = state.cellTop ? state.cellTop[oz * GRID + ox] : 0
    if (top <= SHALLOW_WATER_LEVEL) continue
    if (isCellOccupied(ox, oz)) continue
    if (addOre(ox, oz, 'ore-copper')) coppersSpawned++
  }

  // Filons d'etain : 3-4
  for (let tries = 0; tries < 2000 && tinsSpawned < 3; tries++) {
    const angle = Math.random() * Math.PI * 2
    const dist  = 15 + Math.random() * 10
    const ox = Math.round(cx + Math.cos(angle) * dist)
    const oz = Math.round(cz + Math.sin(angle) * dist)
    if (ox < 2 || oz < 2 || ox >= GRID - 2 || oz >= GRID - 2) continue
    const top = state.cellTop ? state.cellTop[oz * GRID + ox] : 0
    if (top <= SHALLOW_WATER_LEVEL) continue
    if (isCellOccupied(ox, oz)) continue
    if (addOre(ox, oz, 'ore-tin')) tinsSpawned++
  }

  // Filons de charbon : 3-4
  for (let tries = 0; tries < 2000 && coalsSpawned < 3; tries++) {
    const angle = Math.random() * Math.PI * 2
    const dist  = 15 + Math.random() * 10
    const ox = Math.round(cx + Math.cos(angle) * dist)
    const oz = Math.round(cz + Math.sin(angle) * dist)
    if (ox < 2 || oz < 2 || ox >= GRID - 2 || oz >= GRID - 2) continue
    const top = state.cellTop ? state.cellTop[oz * GRID + ox] : 0
    if (top <= SHALLOW_WATER_LEVEL) continue
    if (isCellOccupied(ox, oz)) continue
    if (addOre(ox, oz, 'ore-coal')) coalsSpawned++
  }

  // Rafraichir le tech tree si deja ouvert
  try {
    import('./techtree-ui.js').then(mod => {
      if (mod.refreshTechTreeAfterAgeChange) mod.refreshTechTreeAfterAgeChange(2)
    }).catch(() => {})
  } catch (e) {}

  console.info(
    '[age-test-modes] setupBronzeTest() : spawn complet (' +
    treesSpawned + ' arbres, ' +
    deersSpawned + ' cerfs, ' +
    stonesSpawned + ' rochers pierre, ' +
    coppersSpawned + ' filons cuivre, ' +
    tinsSpawned + ' filons etain, ' +
    coalsSpawned + ' filons charbon)'
  )
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/**
 * Trouve une cellule herbe ou foret loin des bords et pas occupee.
 * Cherche dans un rayon croissant depuis le centre de la carte.
 * @returns {{ sx: number, sz: number }|null}
 */
function _findGrassSpawn() {
  const cx = Math.floor(GRID / 2)
  const cz = Math.floor(GRID / 2)
  for (let r = 0; r <= 30; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue
        const x = cx + dx
        const z = cz + dz
        if (x < 2 || z < 2 || x >= GRID - 2 || z >= GRID - 2) continue
        const biome = state.cellBiome ? state.cellBiome[z * GRID + x] : null
        const top   = state.cellTop   ? state.cellTop[z * GRID + x]   : 0
        if (top <= SHALLOW_WATER_LEVEL) continue
        if (biome !== 'grass' && biome !== 'forest') continue
        if (!isCellOccupied(x, z)) return { sx: x, sz: z }
      }
    }
  }
  return null
}

/**
 * Trouve une cellule libre a une distance entre minR et maxR du point origine.
 * @param {number} ox
 * @param {number} oz
 * @param {number} minR
 * @param {number} maxR
 * @returns {{ x: number, z: number }|null}
 */
function _findFreeCell(ox, oz, minR, maxR) {
  for (let r = minR; r <= maxR; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue
        const x = Math.max(0, Math.min(GRID - 1, ox + dx))
        const z = Math.max(0, Math.min(GRID - 1, oz + dz))
        const top = state.cellTop ? state.cellTop[z * GRID + x] : 0
        if (top <= SHALLOW_WATER_LEVEL) continue
        if (!isCellOccupied(x, z)) return { x, z }
      }
    }
  }
  return null
}

/**
 * Helper de placement avec garde isCellOccupied.
 * Appelle fn() uniquement si la cellule est libre.
 */
function _placeBuilding(label, x, z, fn) {
  if (isCellOccupied(x, z)) {
    console.warn('[age-test-modes] cellule occupee pour', label, 'a', x, z, '-- batiment non place.')
    return
  }
  fn()
}

// ---------------------------------------------------------------------------
// Badge HUD "TEST MODE"
// Injecte un div fixe en haut de l'ecran pour ne pas oublier qu'on est en
// mode test. Retire si le joueur sauvegarde ou recharge en mode normal.
// ---------------------------------------------------------------------------

function _showTestModeBadge(mode) {
  // Eviter les doublons si applyTestMode est appele plusieurs fois.
  if (document.getElementById('test-mode-badge')) return

  const label = mode.replace('-test', '').toUpperCase()
  const badge = document.createElement('div')
  badge.id = 'test-mode-badge'
  badge.setAttribute('aria-label', 'Mode test actif : ' + mode)
  badge.style.cssText = [
    'position:fixed',
    'top:44px',   // sous la topbar (42px) avec 2px de marge
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:200',
    'background:linear-gradient(90deg,#b91c1c,#c2410c)',
    'color:#fff',
    'font-family:ui-monospace,"JetBrains Mono",Menlo,monospace',
    'font-size:10px',
    'font-weight:700',
    'letter-spacing:0.18em',
    'text-transform:uppercase',
    'padding:3px 14px',
    'border-radius:0 0 6px 6px',
    'border:1px solid rgba(255,100,50,0.35)',
    'border-top:none',
    'box-shadow:0 2px 8px rgba(0,0,0,0.4)',
    'pointer-events:none',
    'user-select:none',
    'white-space:nowrap',
  ].join(';')
  badge.textContent = 'TEST MODE : ' + label

  document.body.appendChild(badge)
}
