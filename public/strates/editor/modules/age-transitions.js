// ============================================================================
// age-transitions.js -- Lot D
// Gestion du passage Âge de Pierre -> Âge du Bronze.
//
// - canBuildCairn(state)      : verifie les conditions cumulatives
// - getCairnProgress(state)   : ratio 0-1 de progression vers les conditions
// - triggerAgeTransitionBronze() : declenche la cinematique et bascule state
// - initAgeTransitions()      : injecte le bouton Cairn dans l'actionbar
//                              + intercepte onBuild du cairn
// ============================================================================

import { state } from './state.js'
import { playCinematic } from './cinematics.js'
import { saveGame } from './persistence.js'
import { getTechsForAge, getBuildingsForAge, getTotalFood, TECH_TREE_DATA } from './gamedata.js'
import { addCairn, isCellOccupied } from './placements.js'
import { GRID, SHALLOW_WATER_LEVEL } from './constants.js'
import { showHudToast } from './ui/research-popup.js'

// Calcul derive de l'etat reel : somme des couts de recherche des techs debloquees.
// Plus fiable que state.totalResearchSpent qui peut etre mal incremente sur
// certains chemins de deblocage (alreadyPaid, saves anciennes, debug).
function totalResearchSpentComputed() {
  const techs = (TECH_TREE_DATA && Array.isArray(TECH_TREE_DATA.techs)) ? TECH_TREE_DATA.techs : []
  return techs
    .filter(t => state.techs[t.id] && state.techs[t.id].unlocked)
    .reduce((sum, t) => {
      const cost = t.cost && typeof t.cost === 'object' ? (t.cost.research || 0) : (t.cost || 0)
      return sum + cost
    }, 0)
}

// ---------------------------------------------------------------------------
// Seuils des conditions (source : HTML pilotage v0.2, onglet "Passage au Bronze")
// ---------------------------------------------------------------------------
const SEUILS = {
  population:       6,    // 6 villageois loges (Abri + Cabane)
  bois:            50,    // stock bois
  pierre:          30,    // stock pierre
  nourriture:      20,    // baies + viande
  researchPoints: 100,    // points de recherche accumules
}

// Couts materiaux du Cairn (decision 2026-05-04 : os retire, rare sur petites cartes iles)
export const CAIRN_COST = { stone: 50, wood: 20 }

// ---------------------------------------------------------------------------
// canBuildCairn
// Retourne { ok: bool, missing: string[] }
// ---------------------------------------------------------------------------
export function canBuildCairn(st) {
  const missing = []

  // Condition : population
  const pop = st.colonists ? st.colonists.length : 0
  if (pop < SEUILS.population) {
    missing.push(`${pop}/${SEUILS.population} villageois`)
  }

  // Condition : bois
  const bois = (st.resources && st.resources.wood) || 0
  if (bois < SEUILS.bois) {
    missing.push(`${bois}/${SEUILS.bois} bois`)
  }

  // Condition : pierre
  const pierre = (st.resources && st.resources.stone) || 0
  if (pierre < SEUILS.pierre) {
    missing.push(`${pierre}/${SEUILS.pierre} pierre`)
  }

  // Condition : nourriture
  const nourriture = getTotalFood(st)
  if (nourriture < SEUILS.nourriture) {
    missing.push(`${nourriture}/${SEUILS.nourriture} nourriture`)
  }

  // Condition : hutte du sage construite (bâtiment de recherche)
  const hasLab = st.researchHouses && st.researchHouses.length > 0
  if (!hasLab) {
    missing.push('Hutte du sage requise')
  }

  // Condition : chercheur assigne
  const hasResearcher = st.researchHouses && st.researchHouses.some(r => Array.isArray(r.assignedColonistIds) && r.assignedColonistIds.length > 0)
  if (!hasResearcher) {
    missing.push('1 Chercheur assigne')
  }

  // Condition : points de recherche cumulatifs depenses.
  // Valeur derivee des techs effectivement debloquees pour eviter
  // les derives dues a des chemins qui n incrementaient pas totalResearchSpent.
  const pts = totalResearchSpentComputed()
  if (pts < SEUILS.researchPoints) {
    missing.push(`${pts}/${SEUILS.researchPoints} pts recherche depenses`)
  }

  // Condition : pas deja en age 2+
  if (st.currentAge >= 2) {
    missing.push('Deja en age du Bronze')
  }

  return { ok: missing.length === 0, missing }
}

// ---------------------------------------------------------------------------
// getCairnProgress
// Retourne un ratio entre 0 et 1 representant le pourcentage de conditions
// satisfaites (utile pour le badge "Monument").
// ---------------------------------------------------------------------------
export function getCairnProgress(st) {
  if (st.currentAge >= 2) return 1

  const checks = []

  const pop = st.colonists ? st.colonists.length : 0
  checks.push(Math.min(1, pop / SEUILS.population))

  const bois = (st.resources && st.resources.wood) || 0
  checks.push(Math.min(1, bois / SEUILS.bois))

  const pierre = (st.resources && st.resources.stone) || 0
  checks.push(Math.min(1, pierre / SEUILS.pierre))

  const nourriture = getTotalFood(st)
  checks.push(Math.min(1, nourriture / SEUILS.nourriture))

  const hasLab = (st.researchHouses && st.researchHouses.length > 0) ? 1 : 0
  checks.push(hasLab)

  const hasResearcher = (st.researchHouses && st.researchHouses.some(r => Array.isArray(r.assignedColonistIds) && r.assignedColonistIds.length > 0)) ? 1 : 0
  checks.push(hasResearcher)

  const pts = totalResearchSpentComputed()
  checks.push(Math.min(1, pts / SEUILS.researchPoints))

  const total = checks.reduce((a, b) => a + b, 0)
  return total / checks.length
}

// ---------------------------------------------------------------------------
// triggerAgeTransitionBronze
// Enchaine : cinematique -> bascule state -> re-render tech tree -> celebration
// ---------------------------------------------------------------------------
export function triggerAgeTransitionBronze() {
  if (state.currentAge >= 2) return // idempotent

  playCinematic({
    title: 'AGE DU BRONZE',
    subtitle: 'Une ere nouvelle commence',
    onEnd: () => {
      _applyBronzeAge()
    }
  })
}

function _applyBronzeAge() {
  // Bascule d'age
  state.currentAge = 2
  state.ageUnlockedAt[2] = Date.now()
  state.achievements.push({ id: 'bronze_age', at: Date.now() })

  // Debloquer les techs Bronze (age 2) sans prérequis (ou dont les pre-requis
  // sont tous en age 1 et déjà dispo)
  const techsBronze = getTechsForAge(2)
  techsBronze.forEach(t => {
    if (state.techs[t.id]) {
      // Rendre disponible visuellement
      state.techs[t.id]._bronzeAvailable = true
    }
  })

  // Debloquer les batiments Bronze
  const buildingsBronze = getBuildingsForAge(2)
  buildingsBronze.forEach(b => {
    b._available = true
  })

  // Rafraichir le tech tree si le module est disponible
  try {
    // On importe dynamiquement pour eviter les couplages circulaires
    import('./techtree-ui.js').then(mod => {
      if (mod.refreshTechTreeAfterAgeChange) mod.refreshTechTreeAfterAgeChange(2)
      else if (mod.closeTechTree) {
        // Fallback : fermer et re-ouvrir pour forcer le re-rendu
      }
    }).catch(() => {})
  } catch (e) {}

  // Bulles de celebration sur tous les colons
  setTimeout(() => {
    _triggerCelebrationBubbles()
  }, 300)

  // Sauvegarde checkpoint
  saveGame('auto')

  console.info('[age-transitions] Passage à l\'Âge du Bronze accompli.')
}

function _triggerCelebrationBubbles() {
  const phrases = [
    'Le bronze change tout !',
    'Une nouvelle ere commence !',
    'Nous entrons dans l\'age du Bronze !',
    'Le monde s\'ouvre a nous !',
  ]
  if (!state.colonists || !state.colonists.length) return
  state.colonists.forEach((c, i) => {
    setTimeout(() => {
      const phrase = phrases[i % phrases.length]
      if (c.say) c.say(phrase)
    }, i * 400)
  })
}

// ---------------------------------------------------------------------------
// UI : bouton Cairn dans l'actionbar
// ---------------------------------------------------------------------------

let _cairnBtn = null
let _condTooltip = null

export function initAgeTransitions() {
  _injectCairnButton()
  _condTooltip = document.getElementById('cairn-conditions-tooltip')
  // Applique l'etat initial du bouton (grise si deja en Bronze au reload)
  checkCairnOverlay()
}

function _injectCairnButton() {
  // Lot E : le bouton Cairn s integre desormais dans le pane Construire
  // (#ab-build), aux cotes des autres outils de construction. Auparavant il
  // etait pousse dans une zone .group.monument appendee a #actionbar, ce qui
  // le faisait deborder sous la zone Naviguer (grid 3 colonnes).
  const buildPane = document.getElementById('ab-build')
  if (!buildPane) return

  _cairnBtn = document.createElement('button')
  // On utilise 'tool' sans 'locked' pour que pointer-events reste actif
  // (le CSS .tool.locked applique pointer-events:none ce qui bloque le tooltip)
  // L'apparence "verrouillee" est geree par les styles inline.
  _cairnBtn.className = 'tool'
  _cairnBtn.dataset.tool = 'cairn'
  _cairnBtn.title = 'Poser le Cairn (passage à l\'âge du Bronze)'
  _cairnBtn.innerHTML = '<span class="ic">&#127961;</span><span class="nm">Cairn</span><span class="kb">C</span>'
  _cairnBtn.style.border        = '1px solid rgba(212,184,112,0.7)'
  _cairnBtn.style.boxShadow     = '0 0 8px rgba(212,184,112,0.45)'
  _cairnBtn.style.opacity       = '0.5'
  _cairnBtn.style.cursor        = 'not-allowed'
  _cairnBtn.style.pointerEvents = 'auto'
  buildPane.appendChild(_cairnBtn)

  _cairnBtn.addEventListener('click', _onCairnClick)
  _cairnBtn.addEventListener('mouseenter', _showCondTooltip)
  _cairnBtn.addEventListener('mouseleave', _hideCondTooltip)

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    if ((e.key === 'c' || e.key === 'C') && !state.cairnPlacementMode) {
      e.preventDefault()
      _onCairnClick()
    }
  })
}

function _onCairnClick() {
  const { ok } = canBuildCairn(state)
  if (!ok) {
    _showCondTooltip()
    setTimeout(_hideCondTooltip, 3000)
    return
  }
  startCairnPlacement()
}

// ---------------------------------------------------------------------------
// Placement manuel du Cairn
// ---------------------------------------------------------------------------

export function startCairnPlacement() {
  state.cairnPlacementMode = true
  const canvas = document.querySelector('canvas')
  if (canvas) canvas.style.cursor = 'crosshair'
  showHudToast('Choisissez un emplacement pour le Cairn. ESC ou clic droit pour annuler.', 5000)
}

export function confirmCairnPlacement(gx, gz) {
  if (!state.cairnPlacementMode) return
  if (gx < 0 || gz < 0 || gx >= GRID || gz >= GRID) {
    showHudToast('Emplacement hors-carte.', 2000)
    return
  }
  if (state.cellTop[gz * GRID + gx] <= SHALLOW_WATER_LEVEL) {
    showHudToast('Le Cairn ne peut pas être posé sur l\'eau.', 2500)
    return
  }
  if (isCellOccupied(gx, gz)) {
    showHudToast('Cette case est déjà occupée.', 2000)
    return
  }
  if (!_consumeCairnResources()) {
    showHudToast('Ressources insuffisantes pour le Cairn.', 2500)
    return
  }
  state.cairnPlacementMode = false
  const canvas = document.querySelector('canvas')
  if (canvas) canvas.style.cursor = ''
  addCairn(gx, gz)
  setTimeout(() => { triggerAgeTransitionBronze() }, 200)
}

export function cancelCairnPlacement() {
  state.cairnPlacementMode = false
  const canvas = document.querySelector('canvas')
  if (canvas) canvas.style.cursor = ''
  showHudToast('Pose du Cairn annulée.', 2000)
}

function _consumeCairnResources() {
  const wood  = (state.resources && state.resources.wood)  || 0
  const stone = (state.resources && state.resources.stone) || 0

  if (wood < CAIRN_COST.wood || stone < CAIRN_COST.stone) return false

  state.resources.wood  -= CAIRN_COST.wood
  state.resources.stone -= CAIRN_COST.stone
  return true
}

// ---------------------------------------------------------------------------
// Tooltip conditions
// ---------------------------------------------------------------------------

function _showCondTooltip() {
  if (!_condTooltip) _condTooltip = document.getElementById('cairn-conditions-tooltip')
  if (!_condTooltip) return

  const pop    = (state.colonists || []).length
  const bois   = (state.resources && state.resources.wood)  || 0
  const pierre = (state.resources && state.resources.stone) || 0
  const nourr  = getTotalFood(state)
  const hasLab = !!(state.researchHouses && state.researchHouses.length > 0)
  const hasRes = !!(state.researchHouses && state.researchHouses.some(r => Array.isArray(r.assignedColonistIds) && r.assignedColonistIds.length > 0))
  const pts    = totalResearchSpentComputed()

  const condDefs = [
    { label: `Villageois : ${pop} / ${SEUILS.population}`,           ok: pop    >= SEUILS.population },
    { label: `🪵 Bois : ${bois} / ${SEUILS.bois}`,                   ok: bois   >= SEUILS.bois },
    { label: `🪨 Pierre : ${pierre} / ${SEUILS.pierre}`,             ok: pierre >= SEUILS.pierre },
    { label: `🍇 Nourriture : ${nourr} / ${SEUILS.nourriture}`,      ok: nourr  >= SEUILS.nourriture },
    { label: 'Hutte du sage construite',                               ok: hasLab },
    { label: 'Chercheur assigné',                                      ok: hasRes },
    { label: `🔬 Recherche : ${pts} / ${SEUILS.researchPoints} pts`, ok: pts    >= SEUILS.researchPoints },
  ]

  const list = document.getElementById('cairn-cond-list')
  if (list) {
    list.innerHTML = condDefs.map(c => `
      <div class="cond-row">
        <span class="cond-dot ${c.ok ? 'ok' : 'ko'}"></span>
        <span class="cond-text ${c.ok ? 'ok' : ''}">${c.ok ? '✅' : '❌'} ${c.label}</span>
      </div>
    `).join('')
  }

  // Positionner au-dessus du bouton (évite les problèmes avec bottom: fixe)
  if (_cairnBtn) {
    const rect = _cairnBtn.getBoundingClientRect()
    _condTooltip.style.bottom    = (window.innerHeight - rect.top + 8) + 'px'
    _condTooltip.style.left      = (rect.left + rect.width / 2) + 'px'
    _condTooltip.style.transform = 'translateX(-50%)'
    _condTooltip.style.top       = 'auto'
  }

  _condTooltip.classList.add('tooltip-visible')
}

function _hideCondTooltip() {
  if (_condTooltip) _condTooltip.classList.remove('tooltip-visible')
}

// Retourne true si un Cairn a deja ete pose (unique par partie)
function _cairnAlreadyBuilt() {
  if (state.currentAge >= 2) return true
  if (state.cairns && state.cairns.length > 0) return true
  return false
}

/**
 * Appele depuis la boucle principale (tick lent ~1s) pour mettre a jour
 * le badge et l'etat du bouton Cairn.
 */
export function checkCairnOverlay() {
  if (_cairnBtn) {
    // Si le Cairn est deja pose, griser le bouton definitivement
    if (_cairnAlreadyBuilt()) {
      _cairnBtn.style.opacity = '0.4'
      _cairnBtn.style.pointerEvents = 'none'
      _cairnBtn.style.cursor = 'not-allowed'
      _cairnBtn.title = 'Cairn de pierre deja pose'
      return
    }

    // Sinon : reflet des conditions
    // On ne touche pas pointer-events pour conserver le survol tooltip
    // La classe 'locked' est retiree pour eviter que le CSS n'ecrase pointer-events
    const { ok } = canBuildCairn(state)
    _cairnBtn.classList.remove('locked')
    if (ok) {
      _cairnBtn.style.border        = '1px solid rgba(212,184,112,0.9)'
      _cairnBtn.style.boxShadow     = '0 0 8px rgba(212,184,112,0.8)'
      _cairnBtn.style.opacity       = '1'
      _cairnBtn.style.cursor        = 'pointer'
      _cairnBtn.style.pointerEvents = 'auto'
      _cairnBtn.title = 'Poser le Cairn (conditions réunies !)'
    } else {
      _cairnBtn.style.border        = '1px solid rgba(212,184,112,0.7)'
      _cairnBtn.style.boxShadow     = '0 0 8px rgba(212,184,112,0.45)'
      _cairnBtn.style.opacity       = '0.5'
      _cairnBtn.style.cursor        = 'not-allowed'
      _cairnBtn.style.pointerEvents = 'auto'
      _cairnBtn.title = 'Cairn de pierre (conditions non réunies, survolez pour voir)'
    }
  }
}
