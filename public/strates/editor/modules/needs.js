// ============================================================================
// Lot B, moteur des besoins. Data-driven strict : tout vient de needs.json via
// gamedata.js. Ce module expose :
//   - initColonistNeeds(c)        initialise la Map c.needs pour un colon neuf
//   - tickColonistNeeds(c, dt)    fait monter les jauges, evalue les effets
//   - isNeedCritical(c, id)       true si le besoin id est en seuil critique
//   - computeProductivityMul(c)   multiplicateur de productivite compose
//   - isHomeless(c)               raccourci pour le besoin "shelter"
//
// Les seuils et effets suivent needs.json. Pour l age I :
//   - hunger : monte de need.rate par seconde, max = need.max. Low a 50%,
//              critique a 80%, mort a 100% (non implemente tant que pas de
//              ticket Lot A v2 pour formaliser la mortalite).
//   - shelter : ne monte pas, evalue via need.rule "colonist_has_assigned_cabane".
//               Si le colon n a pas assignedBuildingId de type cabane/abri, il
//               est Sans-abri.
//
// Lecture : la boucle principale (main.js) appelle tickNeeds(dt) a chaque tick
// qui iterera sur tous les colons. Pour ne pas polluer main.js, le tick est
// expose comme tickAllNeeds(dt).
// ============================================================================

import { state } from './state.js'
import { NEEDS_DATA, getBuildingById } from './gamedata.js'

// Seuils normalises sur need.max. Valeurs relatives fixes par design (pas
// dans le JSON car ce sont des paliers d etat, pas des parametres data).
// Si un jour on les veut data-driven, ajouter need.thresholds dans needs.json.
const THRESHOLD_LOW      = 0.50  // bulle d alerte
const THRESHOLD_CRITICAL = 0.80  // tache survie prioritaire + malus prod

// Multiplicateurs de productivite par besoin critique. Valeurs deduites des
// effects declares dans needs.json. On parse "productivity_-50%" pour eviter
// tout hardcode numerique duplique ici.
function parseProductivityEffect(effect) {
  if (typeof effect !== 'string') return 1.0
  const m = effect.match(/^productivity_([+-]?\d+)%$/)
  if (!m) return 1.0
  const pct = parseInt(m[1], 10)
  return Math.max(0, 1.0 + pct / 100)
}

// Indexe needs.json par id pour lookups rapides.
function needsIndex() {
  if (!NEEDS_DATA || !NEEDS_DATA.needs) return null
  if (state.needsBuckets) return state.needsBuckets
  const idx = {}
  for (const n of NEEDS_DATA.needs) idx[n.id] = n
  state.needsBuckets = idx
  return idx
}

export function initColonistNeeds(colonist) {
  const idx = needsIndex()
  if (!idx) {
    colonist.needs = new Map()
    return
  }
  if (!colonist.needs) colonist.needs = new Map()
  for (const need of NEEDS_DATA.needs) {
    if (need.age_introduced > 1) continue // Lot B Age I seulement
    if (typeof need.rate === 'number') {
      if (!colonist.needs.has(need.id)) colonist.needs.set(need.id, 0)
    } else {
      // besoins a regle booleenne (shelter) : on stocke 0 ou 1
      if (!colonist.needs.has(need.id)) colonist.needs.set(need.id, 0)
    }
  }
}

// Evalue la regle d un besoin booleen (shelter, injured). Retourne true si
// le besoin est "actif" (= le colon souffre de ce manque).
function evalRuleNeed(colonist, need) {
  if (need.rule === 'colonist_has_assigned_cabane') {
    // Sans-abri si pas de batiment assigne, ou batiment non habitable.
    const bid = colonist.assignedBuildingId
    if (!bid) return true
    // Si on a un registre de batiments poses (state.houses), on regarde.
    // La Cabane age I correspond au building id "cabane". Tout batiment
    // habitable (subtype habitation) coche la case, defensivement.
    const b = getBuildingById(bid)
    const isHabitableId = b && (b.id === 'cabane' || b.id === 'abri-fortune' || b.subtype === 'habitation' || b.category === 'habitation')
    if (!isHabitableId) return true
    // Lot B : il faut au moins une habitation effectivement construite (non en
    // chantier) sur la carte. Sinon le colon est sans-abri meme si son
    // assignedBuildingId est valide.
    let hasBuiltShelter = false
    if (state.houses) {
      for (const h of state.houses) { if (!h.isUnderConstruction) { hasBuiltShelter = true; break } }
    }
    if (!hasBuiltShelter && state.bigHouses) {
      for (const bh of state.bigHouses) { if (!bh.isUnderConstruction) { hasBuiltShelter = true; break } }
    }
    return !hasBuiltShelter
  }
  if (need.rule === 'colonist_was_attacked') {
    return !!colonist.wasAttacked
  }
  return false
}

export function tickColonistNeeds(colonist, dt) {
  if (!NEEDS_DATA || !NEEDS_DATA.needs) return
  if (!colonist.needs) initColonistNeeds(colonist)
  for (const need of NEEDS_DATA.needs) {
    if (need.age_introduced > 1) continue
    if (typeof need.rate === 'number') {
      const cur = colonist.needs.get(need.id) || 0
      const next = Math.min(need.max || 100, cur + need.rate * dt * 100)
      // need.rate est donne par seconde en fraction de max (0.01 = 1% /s).
      // Ici on applique tel quel : rate * dt * 100 fait monter de rate*100% /s
      // sur l echelle 0..max. Avec need.rate = 0.01 et max = 100, on monte
      // de 1 point par seconde.
      colonist.needs.set(need.id, next)
    } else {
      // Besoin a regle, on reevalue.
      const active = evalRuleNeed(colonist, need) ? 1 : 0
      colonist.needs.set(need.id, active)
    }
  }
}

export function isNeedCritical(colonist, id) {
  if (!colonist.needs) return false
  const idx = needsIndex()
  if (!idx) return false
  const need = idx[id]
  if (!need) return false
  const v = colonist.needs.get(id) || 0
  if (typeof need.rate === 'number') {
    const max = need.max || 100
    return v >= THRESHOLD_CRITICAL * max
  }
  // Besoin a regle : actif = critique.
  return v > 0
}

export function isNeedLow(colonist, id) {
  if (!colonist.needs) return false
  const idx = needsIndex()
  if (!idx) return false
  const need = idx[id]
  if (!need || typeof need.rate !== 'number') return false
  const max = need.max || 100
  const v = colonist.needs.get(id) || 0
  return v >= THRESHOLD_LOW * max && v < THRESHOLD_CRITICAL * max
}

export function isHomeless(colonist) {
  return isNeedCritical(colonist, 'shelter')
}

// Compose le multiplicateur de productivite en prenant en compte tous les
// besoins actifs. L etat Sans-abri applique le malus missing. La faim
// critique applique le malus critical. Plancher a 0.1 par securite (evite
// zero absolu, coherent avec la decision "pas de mort par faim au Lot B").
export function computeProductivityMul(colonist) {
  const idx = needsIndex()
  if (!idx || !colonist.needs) return 1.0
  let mul = 1.0
  for (const need of NEEDS_DATA.needs) {
    if (need.age_introduced > 1) continue
    const v = colonist.needs.get(need.id) || 0
    if (typeof need.rate === 'number') {
      const max = need.max || 100
      if (v >= THRESHOLD_CRITICAL * max && need.effects && need.effects.critical) {
        mul *= parseProductivityEffect(need.effects.critical)
      } else if (v >= THRESHOLD_LOW * max && need.effects && need.effects.low) {
        mul *= parseProductivityEffect(need.effects.low)
      }
    } else {
      if (v > 0 && need.effects && need.effects.missing) {
        mul *= parseProductivityEffect(need.effects.missing)
      }
    }
  }
  return Math.max(0.1, mul)
}

// Boucle principale : iterer sur tous les colons.
export function tickAllNeeds(dt) {
  for (const c of state.colonists) {
    tickColonistNeeds(c, dt)
    // Expose productivityMul en live pour que d autres modules le lisent.
    c.productivityMul = computeProductivityMul(c)
  }
}
