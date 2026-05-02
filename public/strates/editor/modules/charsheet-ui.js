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
let elSkillsSection = null
let elProfessionRow = null
let elSkillsList = null

// Liste des compétences affichées dans la fiche
const CHAR_SKILLS = [
  { id: 'gathering', icon: '🫐', label: 'Cueillette' },
  { id: 'logging',   icon: '🪓', label: 'Bûcheronnage' },
  { id: 'mining',    icon: '⛏',       label: 'Minage' },
  { id: 'research',  icon: '🔬', label: 'Recherche' },
  { id: 'hunting',   icon: '🏹', label: 'Chasse' },
  { id: 'building',  icon: '🔨', label: 'Construction' },
]

const PROFESSION_LABELS = {
  cueilleur: { icon: '🫐', label: 'Cueilleur' },
  bucheron:  { icon: '🪓', label: 'Bûcheron' },
  mineur:    { icon: '⛏',       label: 'Mineur' },
  chercheur: { icon: '📜', label: 'Chercheur' },
  chasseur:  { icon: '🏹', label: 'Chasseur' },
}

function skillLevel(c, name) {
  if (!c) return 0
  const direct = c.skills && c.skills[name]
  if (typeof direct === 'number' && direct > 0) {
    return Math.min(10, Math.floor(direct))
  }
  const xp = c.skillsXp && c.skillsXp[name]
  if (typeof xp === 'number' && xp > 0) {
    return Math.min(10, Math.floor(xp / 20))
  }
  return 0
}

function skillXp(c, name) {
  if (!c) return 0
  const xp = c.skillsXp && c.skillsXp[name]
  return typeof xp === 'number' ? xp : 0
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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

  injectSkillsSection()

  domReady = true
}

function injectSkillsSection() {
  if (!panelEl) return
  if (panelEl.querySelector('#cs-skills-section')) return
  const body = panelEl.querySelector('.cs-body')
  if (!body) return

  const section = document.createElement('div')
  section.className = 'cs-section'
  section.id = 'cs-skills-section'
  section.innerHTML =
    '<h4>Competences</h4>' +
    '<div id="cs-profession-row" class="cs-profession-row" style="display:none"></div>' +
    '<div id="cs-skills-list" class="cs-skills-list"></div>'
  body.appendChild(section)

  elSkillsSection = section
  elProfessionRow = section.querySelector('#cs-profession-row')
  elSkillsList = section.querySelector('#cs-skills-list')

  injectSkillsStyles()
}

function injectSkillsStyles() {
  if (document.getElementById('cs-skills-style')) return
  const style = document.createElement('style')
  style.id = 'cs-skills-style'
  style.textContent =
    '#char-panel .cs-profession-row {' +
    '  display: flex; align-items: center; gap: 8px;' +
    '  padding: 6px 10px; margin-bottom: 8px;' +
    '  background: rgba(255,217,138,0.08);' +
    '  border: 1px solid rgba(255,217,138,0.25);' +
    '  border-radius: 6px;' +
    '  font-size: 12px; color: #f3ecdd;' +
    '}' +
    '#char-panel .cs-profession-row .cs-prof-key {' +
    '  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;' +
    '  color: #c7b98c;' +
    '}' +
    '#char-panel .cs-profession-row .cs-prof-icon { font-size: 16px; }' +
    '#char-panel .cs-profession-row .cs-prof-label {' +
    '  font-weight: 600; color: #ffd98a;' +
    '}' +
    '#char-panel .cs-skills-list {' +
    '  display: flex; flex-direction: column; gap: 7px;' +
    '}' +
    '#char-panel .cs-skill-row {' +
    '  display: grid;' +
    '  grid-template-columns: 18px 1fr auto;' +
    '  align-items: center;' +
    '  gap: 8px;' +
    '  font-size: 11.5px;' +
    '  color: #e9e2cf;' +
    '}' +
    '#char-panel .cs-skill-icon { font-size: 14px; line-height: 1; }' +
    '#char-panel .cs-skill-mid {' +
    '  display: flex; flex-direction: column; gap: 3px; min-width: 0;' +
    '}' +
    '#char-panel .cs-skill-name {' +
    '  font-size: 11px; color: #e9e2cf;' +
    '  display: flex; justify-content: space-between; gap: 6px;' +
    '}' +
    '#char-panel .cs-skill-lvl {' +
    '  font-family: var(--mono); font-size: 10px;' +
    '  color: #d4b870; letter-spacing: 0.04em;' +
    '}' +
    '#char-panel .cs-skill-bar {' +
    '  height: 4px; background: rgba(0,0,0,0.35);' +
    '  border-radius: 2px; overflow: hidden;' +
    '  border: 1px solid rgba(255,255,255,0.05);' +
    '}' +
    '#char-panel .cs-skill-fill {' +
    '  height: 100%; background: #d4b870;' +
    '  border-radius: 2px; transition: width 0.3s;' +
    '}'
  document.head.appendChild(style)
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
  refreshSkills(c)
}

function refreshSkills(c) {
  if (!elSkillsList) return

  // Ligne profession
  if (elProfessionRow) {
    var prof = c.profession ? PROFESSION_LABELS[c.profession] : null
    if (prof) {
      elProfessionRow.innerHTML =
        '<span class="cs-prof-key">Metier</span>' +
        '<span class="cs-prof-icon">' + prof.icon + '</span>' +
        '<span class="cs-prof-label">' + escHtml(prof.label) + '</span>'
      elProfessionRow.style.display = ''
    } else {
      elProfessionRow.style.display = 'none'
      elProfessionRow.innerHTML = ''
    }
  }

  // Liste des 6 compétences
  var html = ''
  for (var i = 0; i < CHAR_SKILLS.length; i++) {
    var sk = CHAR_SKILLS[i]
    var lvl = skillLevel(c, sk.id)
    var xp = skillXp(c, sk.id)
    var pct = ((xp % 20) / 20) * 100
    if (xp <= 0 && lvl > 0) {
      // Cas où le niveau provient de skills[] direct sans xp : barre pleine au niveau acquis
      pct = 0
    }
    html +=
      '<div class="cs-skill-row">' +
        '<span class="cs-skill-icon">' + sk.icon + '</span>' +
        '<div class="cs-skill-mid">' +
          '<div class="cs-skill-name">' +
            '<span>' + escHtml(sk.label) + '</span>' +
            '<span class="cs-skill-lvl">Niv. ' + lvl + ' / 10</span>' +
          '</div>' +
          '<div class="cs-skill-bar"><div class="cs-skill-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '</div>' +
      '</div>'
  }
  elSkillsList.innerHTML = html
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
