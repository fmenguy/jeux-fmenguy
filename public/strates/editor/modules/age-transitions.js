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
import { getTechsForAge, getBuildingsForAge, getTotalFood } from './gamedata.js'
import { addCairn, findFreeCellNear } from './placements.js'

// ---------------------------------------------------------------------------
// Flag dev : si true, la condition "os" est ignoree (Lot B Chasseur pas livre)
// ---------------------------------------------------------------------------
const DEV_SKIP_BONES = true

// ---------------------------------------------------------------------------
// Seuils des conditions (source : HTML pilotage v0.2, onglet "Passage au Bronze")
// ---------------------------------------------------------------------------
const SEUILS = {
  population:       6,    // 6 villageois loges (Abri + Cabane)
  bois:            50,    // stock bois
  pierre:          30,    // stock pierre
  nourriture:      20,    // baies + viande
  researchPoints: 100,    // points de recherche accumules
  os:              10,    // os (composant rituel du Cairn)
}

// Couts materiaux du Cairn
export const CAIRN_COST = { stone: 50, wood: 20, bone: 10 }

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
  const hasResearcher = st.researchHouses && st.researchHouses.some(r => r.assignedColonistId)
  if (!hasResearcher) {
    missing.push('1 Chercheur assigne')
  }

  // Condition : points de recherche cumulatifs depenses (B19).
  // On lit totalResearchSpent, jamais le solde courant, pour eviter un
  // blocage si B11 gele l accumulation avant que le joueur atteigne 100.
  const pts = st.totalResearchSpent || 0
  if (pts < SEUILS.researchPoints) {
    missing.push(`${pts}/${SEUILS.researchPoints} pts recherche depenses`)
  }

  // Condition : os (bypass si Chasseur pas livre)
  if (!DEV_SKIP_BONES) {
    const os = (st.stocks && st.stocks.bone) || 0
    if (os < SEUILS.os) {
      missing.push(`${os}/${SEUILS.os} os`)
    }
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

  const hasResearcher = (st.researchHouses && st.researchHouses.some(r => r.assignedColonistId)) ? 1 : 0
  checks.push(hasResearcher)

  const pts = st.totalResearchSpent || 0
  checks.push(Math.min(1, pts / SEUILS.researchPoints))

  if (!DEV_SKIP_BONES) {
    const os = (st.stocks && st.stocks.bone) || 0
    checks.push(Math.min(1, os / SEUILS.os))
  }

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

  // Mettre a jour le badge HUD si present
  _updateBadge()

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
let _badgeEl = null
let _badgeBar = null

export function initAgeTransitions() {
  _injectCairnButton()
  _condTooltip = document.getElementById('cairn-conditions-tooltip')
  _badgeEl = document.getElementById('cairn-overlay-badge')
  _badgeBar = document.getElementById('cairn-badge-bar')
  _updateBadge()
  // Applique l'etat initial du bouton (grise si deja en Bronze au reload)
  checkCairnOverlay()
}

function _injectCairnButton() {
  const actionbar = document.getElementById('actionbar')
  if (!actionbar) return

  // Cherche si le groupe "monument" existe deja
  let monumentGroup = actionbar.querySelector('.group.monument')
  if (!monumentGroup) {
    monumentGroup = document.createElement('div')
    monumentGroup.className = 'group monument'
    monumentGroup.style.borderColor = 'rgba(255, 196, 80, 0.45)'
    monumentGroup.innerHTML = '<span class="group-label" style="color:#ffd98a">Monument</span>'
    actionbar.appendChild(monumentGroup)
  }

  if (monumentGroup.querySelector('[data-tool="cairn"]')) return

  _cairnBtn = document.createElement('button')
  _cairnBtn.className = 'tool'
  _cairnBtn.dataset.tool = 'cairn'
  _cairnBtn.title = 'Poser le Cairn de pierre (passage au Bronze)'
  _cairnBtn.innerHTML = 'Cairn<span class="key">C</span>'
  _cairnBtn.style.borderColor = 'rgba(255, 196, 80, 0.35)'

  _cairnBtn.addEventListener('click', _onCairnClick)
  _cairnBtn.addEventListener('mouseenter', _showCondTooltip)
  _cairnBtn.addEventListener('mouseleave', _hideCondTooltip)

  monumentGroup.appendChild(_cairnBtn)

  // Touche raccourci C
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault()
      _onCairnClick()
    }
  })
}

function _onCairnClick() {
  const { ok, missing } = canBuildCairn(state)
  if (!ok) {
    // Affiche le tooltip d'erreur si clique sans conditions
    _showCondTooltip()
    setTimeout(_hideCondTooltip, 3000)
    return
  }
  // Consomme les ressources
  if (!_consumeCairnResources()) return

  // Place le mesh Cairn dans le monde 3D, pres du spawn ou du centre
  const GRID_SIZE = 96
  const center = state.spawn
    ? { x: state.spawn.x, z: state.spawn.z }
    : { x: Math.floor(GRID_SIZE / 2), z: Math.floor(GRID_SIZE / 2) }
  const cell = findFreeCellNear(center.x, center.z, 20)
  if (cell) {
    addCairn(cell.x, cell.z)
  }

  // Declenche la transition avec un leger delai pour laisser le mesh apparaitre
  setTimeout(() => {
    triggerAgeTransitionBronze()
  }, 200)
}

function _consumeCairnResources() {
  const wood  = (state.resources && state.resources.wood)  || 0
  const stone = (state.resources && state.resources.stone) || 0

  if (wood < CAIRN_COST.wood || stone < CAIRN_COST.stone) return false

  state.resources.wood  -= CAIRN_COST.wood
  state.resources.stone -= CAIRN_COST.stone
  // bone : ignore en mode DEV_SKIP_BONES
  if (!DEV_SKIP_BONES && state.stocks) {
    const bone = state.stocks.bone || 0
    if (bone < CAIRN_COST.bone) return false
    state.stocks.bone -= CAIRN_COST.bone
  }
  return true
}

// ---------------------------------------------------------------------------
// Tooltip conditions
// ---------------------------------------------------------------------------

function _showCondTooltip() {
  if (!_condTooltip) return
  const { missing } = canBuildCairn(state)

  // Construire la liste
  const condDefs = [
    { label: `${SEUILS.population} villageois loges`, ok: (state.colonists || []).length >= SEUILS.population },
    { label: `${SEUILS.bois} bois en stock`,          ok: ((state.resources && state.resources.wood) || 0) >= SEUILS.bois },
    { label: `${SEUILS.pierre} pierre en stock`,       ok: ((state.resources && state.resources.stone) || 0) >= SEUILS.pierre },
    { label: `${SEUILS.nourriture} nourriture`,        ok: getTotalFood(state) >= SEUILS.nourriture },
    { label: 'Hutte du sage',                          ok: !!(state.researchHouses && state.researchHouses.length > 0) },
    { label: '1 Chercheur assigne',                    ok: !!(state.researchHouses && state.researchHouses.some(r => r.assignedColonistId)) },
    { label: `${SEUILS.researchPoints} pts recherche depenses`, ok: (state.totalResearchSpent || 0) >= SEUILS.researchPoints },
  ]
  if (!DEV_SKIP_BONES) {
    condDefs.push({ label: `${SEUILS.os} os`, ok: ((state.stocks && state.stocks.bone) || 0) >= SEUILS.os })
  }

  const list = document.getElementById('cairn-cond-list')
  if (list) {
    list.innerHTML = condDefs.map(c => `
      <div class="cond-row">
        <span class="cond-dot ${c.ok ? 'ok' : 'ko'}"></span>
        <span class="cond-text ${c.ok ? 'ok' : ''}">${c.label}</span>
      </div>
    `).join('')
  }
  _condTooltip.classList.add('tooltip-visible')
}

function _hideCondTooltip() {
  if (_condTooltip) _condTooltip.classList.remove('tooltip-visible')
}

// ---------------------------------------------------------------------------
// Badge "Monument proche" (affiche quand progression > 80%)
// ---------------------------------------------------------------------------

function _updateBadge() {
  if (!_badgeEl) return
  if (state.currentAge >= 2) {
    _badgeEl.classList.remove('badge-visible')
    return
  }
  const prog = getCairnProgress(state)
  if (_badgeBar) _badgeBar.style.width = (prog * 100).toFixed(0) + '%'

  if (prog >= 0.8) {
    _badgeEl.classList.add('badge-visible')
  } else {
    _badgeEl.classList.remove('badge-visible')
  }
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
  _updateBadge()

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
    const { ok } = canBuildCairn(state)
    if (ok) {
      _cairnBtn.style.borderColor = 'rgba(255, 196, 80, 0.9)'
      _cairnBtn.style.background  = 'rgba(255, 196, 80, 0.22)'
      _cairnBtn.style.color       = '#fff5d8'
      _cairnBtn.style.opacity     = ''
      _cairnBtn.style.pointerEvents = ''
      _cairnBtn.style.cursor      = ''
      _cairnBtn.title = 'Poser le Cairn de pierre -- conditions reunies !'
    } else {
      _cairnBtn.style.borderColor = 'rgba(255, 196, 80, 0.35)'
      _cairnBtn.style.background  = ''
      _cairnBtn.style.color       = ''
      _cairnBtn.style.opacity     = ''
      _cairnBtn.style.pointerEvents = ''
      _cairnBtn.style.cursor      = ''
      _cairnBtn.title = 'Cairn de pierre (conditions non reunies -- survolez pour voir)'
    }
  }
}
