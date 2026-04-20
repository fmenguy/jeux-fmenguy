// ============================================================================
// Fiche personnage : panneau lateral fixe pour afficher et agir sur un colon.
// API : initCharSheet(), openCharSheet(colonist), closeCharSheet()
// ============================================================================

import { state } from './state.js'
import { drawLabel } from './bubbles.js'

let panelEl = null
let backdropEl = null
let currentColonist = null
let domReady = false

// elements internes mis a jour dynamiquement
let elTitle = null
let elSymbol = null
let elNameInput = null
let elRenameBtn = null
let elFavBtn = null
let elPos = null
let elState = null
let elRole = null
let elLastLine = null
let elGender = null
let elChief = null

function labelForState(s) {
  const map = {
    IDLE: 'au repos',
    MOVING: 'en deplacement',
    WORKING: 'au travail',
    HARVESTING: 'recolte en cours',
    RESEARCHING: 'recherche au laboratoire'
  }
  return map[s] || s || 'inconnu'
}

function roleForColonist(c) {
  if (c.isChief) return 'Chef'
  if (c.researchBuildingId != null) return 'Chercheur'
  return 'Colon'
}

function genderSymbol(g) {
  return g === 'F' ? '\u2640' : '\u2642'
}

function ensureDom() {
  if (domReady) return
  backdropEl = document.getElementById('char-backdrop')
  panelEl = document.getElementById('char-panel')
  if (!backdropEl || !panelEl) return

  elTitle = panelEl.querySelector('#cs-title')
  elSymbol = panelEl.querySelector('#cs-sym')
  elNameInput = panelEl.querySelector('#cs-name-input')
  elRenameBtn = panelEl.querySelector('#cs-rename-btn')
  elFavBtn = panelEl.querySelector('#cs-fav-btn')
  elPos = panelEl.querySelector('#cs-pos')
  elState = panelEl.querySelector('#cs-state')
  elRole = panelEl.querySelector('#cs-role')
  elLastLine = panelEl.querySelector('#cs-last-line')
  elGender = panelEl.querySelector('#cs-gender')
  elChief = panelEl.querySelector('#cs-chief-row')

  var closeBtn = panelEl.querySelector('#cs-close-btn')
  if (closeBtn) closeBtn.addEventListener('click', closeCharSheet)
  if (backdropEl) backdropEl.addEventListener('click', closeCharSheet)

  if (elRenameBtn) elRenameBtn.addEventListener('click', commitRename)
  if (elNameInput) {
    elNameInput.addEventListener('keydown', function(e) {
      e.stopPropagation()
      if (e.key === 'Enter') { e.preventDefault(); commitRename() }
      if (e.key === 'Escape') { e.preventDefault(); closeCharSheet() }
    })
  }
  if (elFavBtn) elFavBtn.addEventListener('click', toggleFavorite)

  domReady = true
}

function commitRename() {
  if (!currentColonist || !elNameInput) return
  var v = elNameInput.value.trim()
  if (!v) { elNameInput.value = currentColonist.name; return }
  if (v === currentColonist.name) return
  if (v.length > 24) v = v.substring(0, 24)
  // liberer ancien nom, reserver nouveau
  if (state.usedNames) {
    state.usedNames.delete(currentColonist.name)
    state.usedNames.add(v)
  }
  currentColonist.name = v
  // redessiner label 3D
  try {
    drawLabel(currentColonist.labelCanvas, currentColonist.name, currentColonist.gender, currentColonist.isChief)
    if (currentColonist.labelTex) currentColonist.labelTex.needsUpdate = true
  } catch (e) {}
  if (elTitle) elTitle.textContent = v
  elNameInput.value = v
  flashField(elNameInput)
}

function toggleFavorite() {
  if (!currentColonist) return
  currentColonist.favorite = !currentColonist.favorite
  updateFavBtn()
}

function updateFavBtn() {
  if (!elFavBtn || !currentColonist) return
  var isFav = !!currentColonist.favorite
  elFavBtn.classList.toggle('on', isFav)
  elFavBtn.textContent = isFav ? '\u2605 Favori' : '\u2606 Ajouter aux favoris'
  elFavBtn.title = isFav ? 'Retirer des favoris' : 'Marquer comme favori'
}

function flashField(el) {
  if (!el) return
  el.classList.add('cs-flash')
  setTimeout(function() { el.classList.remove('cs-flash') }, 450)
}

function refreshDynamic() {
  if (!currentColonist || !panelEl || panelEl.classList.contains('hidden')) return
  var c = currentColonist
  if (elPos) {
    var x = Math.round(c.tx != null ? c.tx - 0.5 : c.x)
    var z = Math.round(c.tz != null ? c.tz - 0.5 : c.z)
    var y = c.ty != null ? c.ty.toFixed(1) : '?'
    elPos.textContent = 'x ' + x + ' , y ' + y + ' , z ' + z
  }
  if (elState) elState.textContent = labelForState(c.state)
  if (elRole) elRole.textContent = roleForColonist(c)
  if (elLastLine) {
    var line = c.lastLine || c.lastContextLine || ''
    elLastLine.textContent = line ? ('"' + line + '"') : 'aucune bulle recente'
    elLastLine.classList.toggle('cs-muted', !line)
  }
}

let refreshTimer = null

export function initCharSheet() {
  ensureDom()
  if (!domReady) return
  // boucle de rafraichissement tant que la fiche est ouverte
  if (refreshTimer == null) {
    refreshTimer = setInterval(function() {
      if (panelEl && !panelEl.classList.contains('hidden')) refreshDynamic()
    }, 250)
  }
  // Echap pour fermer
  window.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return
    if (!panelEl || panelEl.classList.contains('hidden')) return
    // ne pas court-circuiter si une autre modale est au-dessus ? priorite : fiche
    e.stopPropagation()
    closeCharSheet()
  }, true)
}

export function openCharSheet(colonist) {
  ensureDom()
  if (!domReady || !colonist) return
  currentColonist = colonist
  if (elTitle) elTitle.textContent = colonist.name
  if (elSymbol) {
    elSymbol.textContent = genderSymbol(colonist.gender)
    elSymbol.className = 'cs-sym ' + (colonist.gender === 'F' ? 'F' : 'M')
  }
  if (elGender) elGender.textContent = colonist.gender === 'F' ? 'Feminin' : 'Masculin'
  if (elChief) elChief.style.display = colonist.isChief ? '' : 'none'
  if (elNameInput) elNameInput.value = colonist.name
  updateFavBtn()
  refreshDynamic()
  panelEl.classList.remove('hidden')
  if (backdropEl) backdropEl.classList.remove('hidden')
  // signal global pour que interaction.js sache qu'une modale est ouverte
  state.charSheetOpen = true
}

export function closeCharSheet() {
  if (!panelEl) return
  panelEl.classList.add('hidden')
  if (backdropEl) backdropEl.classList.add('hidden')
  currentColonist = null
  state.charSheetOpen = false
}

export function isCharSheetOpen() {
  return !!(panelEl && !panelEl.classList.contains('hidden'))
}
