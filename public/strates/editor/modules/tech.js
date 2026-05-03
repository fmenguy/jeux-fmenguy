import { GRID, ORE_TECH, TECH_BUBBLE_COOLDOWN, MOUNTAIN_Y_THRESHOLD, RESOURCE_MIN_LEVELS } from './constants.js'
import { TECH_BUBBLE_LINES, TECH_TREE_DATA } from './gamedata.js'
import { state } from './state.js'

// ============================================================================
// Tech tree, gating de minage, bulles "tech bloque"
// ============================================================================

export function techUnlocked(id) { return !!(state.techs[id] && state.techs[id].unlocked) }

// Lot B, B11 : la generation de points de recherche doit se figer quand
// aucune tech n est recherchable (available ou ready) pour l age courant
// ou inferieur. Une tech est recherchable si non debloquee, d age <= age
// courant, et tous ses prerequis debloques. Consommee par main.js pour
// geler l accumulation de researchPoints.
export function hasPendingResearchableTech() {
  const data = TECH_TREE_DATA
  if (!data || !Array.isArray(data.techs)) return true
  const currentAge = state.currentAge || 1
  for (const t of data.techs) {
    if (!t || !t.id) continue
    if ((t.age || 1) > currentAge) continue
    if (techUnlocked(t.id)) continue
    const reqs = Array.isArray(t.requires) ? t.requires : (t.req ? [t.req] : [])
    let reqsMet = true
    for (const r of reqs) {
      if (!techUnlocked(r)) { reqsMet = false; break }
    }
    if (reqsMet) return true
  }
  return false
}

export function hasTreeAt(x, z) {
  for (const t of state.trees) if (t.x === x && t.z === z) return true
  return false
}

export function canMineCell(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return { ok: false, reason: 'hors-carte', requiredTech: null }
  const biome = state.cellBiome[z * GRID + x]
  // arbre present : requiert hache
  if (hasTreeAt(x, z)) {
    if (!techUnlocked('axe-stone')) return { ok: false, reason: 'tech', requiredTech: 'axe-stone' }
    return { ok: true, reason: null, requiredTech: null }
  }
  const oreType = state.cellOre ? state.cellOre[z * GRID + x] : null
  if (oreType) {
    const req = ORE_TECH[oreType]
    if (req && !techUnlocked(req)) return { ok: false, reason: 'tech', requiredTech: req }
  }
  if (biome === 'rock' || biome === 'snow') {
    if (!techUnlocked('pick-stone')) return { ok: false, reason: 'tech', requiredTech: 'pick-stone' }
  }
  return { ok: true, reason: null, requiredTech: null }
}

// ============================================================================
// Gating skill par ressource (Lot B, pattern reutilisable)
// ============================================================================
// Determine le type "ressource" d une cellule pour le gating skill. Pour
// l instant, seule la roche de montagne (biome 'snow' ou cellule au dessus
// du seuil d altitude) est traitee. Aux ages suivants, on enrichira ce
// classement (cuivre, fer, or) en se basant sur cellOre + biome.
export function classifyMineableBlock(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return null
  const k = z * GRID + x
  const biome = state.cellBiome[k]
  const top = state.cellTop[k]
  if (biome === 'snow' || top >= MOUNTAIN_Y_THRESHOLD) {
    if (biome === 'rock' || biome === 'snow') return 'mountain-rock'
  }
  return null
}

// Verifie qu un colon a le niveau de competence requis pour miner un bloc
// donne. Retourne { ok, requiredLevel, message }. Si le bloc n a pas de
// gating skill (ressource non listee ou niveau null), ok = true et
// requiredLevel = 0. Le message est en francais, sans tiret long.
export function canMineResource(colonist, blockType, blockAltitude) {
  const out = { ok: true, requiredLevel: 0, message: '' }
  if (!blockType) return out
  const required = RESOURCE_MIN_LEVELS[blockType]
  if (required == null) return out
  out.requiredLevel = required
  const lvl = colonist && typeof colonist.skillLevel === 'function'
    ? colonist.skillLevel('mining')
    : 0
  if (lvl < required) {
    out.ok = false
    out.message = 'Cette roche est trop dure pour moi.'
    return out
  }
  return out
}

// refreshTechsPanel sera rattache par hud.js (DOM), laisse ici pour cohesion
// Lot B (file de recherche) : cette fonction reste le point d entree de
// deblocage effectif d une tech. Elle est appelee :
//   1) par le tick de main.js a la completion de activeResearch (progress >= cost)
//   2) en mode legacy / debug (chemins qui consommaient directement researchPoints)
// Dans le cas 1, le cout a deja ete consomme sous forme de progression, donc
// on ne doit PAS rededuire de researchPoints. Le flag opts.alreadyPaid gere ca.
export function unlockTech(id, refreshTechsPanel, opts) {
  const t = state.techs[id]
  if (!t || t.unlocked) return
  // SPEC v1 : prerequis donnes par un tableau requires[] (ids de techs).
  // Compatibilite retro avec l'ancien champ scalaire t.req.
  const reqs = Array.isArray(t.requires) && t.requires.length > 0
    ? t.requires
    : (t.req ? [t.req] : [])
  for (const r of reqs) {
    if (!state.techs[r] || !state.techs[r].unlocked) return
  }
  const costNum = (t.cost && typeof t.cost === 'object') ? (t.cost.research || 0) : (t.cost || 0)
  const alreadyPaid = opts && opts.alreadyPaid
  if (!alreadyPaid) {
    if (state.researchPoints < costNum) return
    state.researchPoints -= costNum
  }
  // Consommer les points nocturnes si la tech en requiert (ex: astronomy-1).
  // Le cout night est toujours verifie et consomme au moment du deblocage,
  // que le cout recherche ait ete pre-paye (alreadyPaid) ou non.
  const techEntry = TECH_TREE_DATA && Array.isArray(TECH_TREE_DATA.techs)
    ? TECH_TREE_DATA.techs.find(x => x.id === id)
    : null
  const nightCost = (techEntry && techEntry.cost && typeof techEntry.cost === 'object')
    ? (techEntry.cost.night || 0) : 0
  if (nightCost > 0) {
    if ((state.nightPoints || 0) < nightCost) return
    state.nightPoints -= nightCost
  }
  state.totalResearchSpent = (state.totalResearchSpent || 0) + costNum
  t.unlocked = true
  // Effets supplementaires depuis TECH_TREE_DATA (unlocks.jobs / unlocks.buildings).
  // Le cablage reel des jobs / batiments sera fait dans un ticket dedie. Pour
  // l instant on log juste pour tracer ce qui devrait etre active.
  try {
    const techEntry = TECH_TREE_DATA && Array.isArray(TECH_TREE_DATA.techs)
      ? TECH_TREE_DATA.techs.find(x => x.id === id)
      : null
    if (techEntry && techEntry.unlocks) {
      if (Array.isArray(techEntry.unlocks.jobs) && techEntry.unlocks.jobs.length > 0) {
        console.log('[tech] unlocks jobs:', id, techEntry.unlocks.jobs)
      }
      if (Array.isArray(techEntry.unlocks.buildings) && techEntry.unlocks.buildings.length > 0) {
        console.log('[tech] unlocks buildings:', id, techEntry.unlocks.buildings)
      }
    }
  } catch (e) { /* ignore */ }
  if (refreshTechsPanel) refreshTechsPanel()
  const el = document.getElementById('tech-' + id)
  if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 800) }
}

// ============================================================================
// Lot B : file de recherche
// ============================================================================

// Avance la file : si rien en cours et que la queue a au moins un id,
// depile le premier et met en activeResearch avec progress=0.
function _advanceQueue() {
  if (state.activeResearch) return
  if (!state.researchQueue || state.researchQueue.length === 0) return
  const id = state.researchQueue.shift()
  state.activeResearch = { id, progress: 0 }
  try {
    window.dispatchEvent(new CustomEvent('strates:researchStarted', { detail: { id } }))
    window.dispatchEvent(new CustomEvent('strates:queueChanged'))
  } catch (e) { /* ignore */ }
}

// Enfile une tech dans la file de recherche. Si rien n est en cours, la tech
// passe immediatement en activeResearch. Ignore les techs deja debloquees,
// deja en file ou deja actives.
export function queueTech(id) {
  const t = state.techs[id]
  if (!t || t.unlocked) return
  const techEntry = TECH_TREE_DATA && Array.isArray(TECH_TREE_DATA.techs)
    ? TECH_TREE_DATA.techs.find(x => x.id === id)
    : null
  const costObj = techEntry && techEntry.cost && typeof techEntry.cost === 'object' ? techEntry.cost : {}
  const totalCost = Object.values(costObj).reduce((s, v) => s + v, 0)
  if (totalCost === 0) {
    unlockTech(id, null, { alreadyPaid: true })
    try {
      window.dispatchEvent(new CustomEvent('strates:techComplete', { detail: { id, tech: techEntry } }))
      window.dispatchEvent(new CustomEvent('strates:queueChanged'))
    } catch (e) { /* ignore */ }
    return
  }
  if (!state.researchQueue) state.researchQueue = []
  if (state.researchQueue.includes(id)) return
  if (state.activeResearch && state.activeResearch.id === id) return
  state.researchQueue.push(id)
  try { window.dispatchEvent(new CustomEvent('strates:queueChanged')) } catch (e) { /* ignore */ }
  _advanceQueue()
}

// Annule une tech en file (la retire) ou la tech active (remise en tete de
// file avec progress=0 et activeResearch remis a null). Dispatch un event
// strates:queueChanged dans tous les cas utiles.
export function cancelResearch(id) {
  if (!id) return
  if (state.activeResearch && state.activeResearch.id === id) {
    state.activeResearch = null
    try { window.dispatchEvent(new CustomEvent('strates:queueChanged')) } catch (e) { /* ignore */ }
    // On relance immediatement la queue : si d autres techs etaient enfilees
    // derriere, la premiere devient active.
    _advanceQueue()
    return
  }
  if (Array.isArray(state.researchQueue)) {
    const i = state.researchQueue.indexOf(id)
    if (i >= 0) {
      state.researchQueue.splice(i, 1)
      try { window.dispatchEvent(new CustomEvent('strates:queueChanged')) } catch (e) { /* ignore */ }
    }
  }
}

export function tryBlockedTechBubble(nowSec) {
  if (!state.lastBlockedMineTech) return false
  if (nowSec - state.lastBlockedMineTech.t > 5) { state.lastBlockedMineTech = null; return false }
  const tech = state.lastBlockedMineTech.tech
  const lastAt = state.lastTechBubbleByTech.get(tech) || -Infinity
  if (nowSec - lastAt < TECH_BUBBLE_COOLDOWN) return false
  const pool = TECH_BUBBLE_LINES[tech]
  if (!pool) return false
  const bx = state.lastBlockedMineTech.x
  const bz = state.lastBlockedMineTech.z
  let best = null, bestD = Infinity
  for (const c of state.colonists) {
    if (c.speechTimer > 0) continue
    if (c.state !== 'IDLE' && c.state !== 'MOVING') continue
    const d = Math.abs(c.x - bx) + Math.abs(c.z - bz)
    if (d < bestD) { bestD = d; best = c }
  }
  if (!best || bestD > 12) return false
  const line = pool[Math.floor(Math.random() * pool.length)]
  best.sayHint(line)
  state.lastTechBubbleByTech.set(tech, nowSec)
  state.lastBlockedMineTech = null
  return true
}
