// ============================================================================
// Fiche personnage : panneau lateral fixe pour afficher et agir sur un colon.
// API : initCharSheet(), openCharSheet(colonist), closeCharSheet()
// ============================================================================

import { state } from './state.js'
import { drawLabel } from './bubbles.js'
import { getHomeOf, homeLabel, openHousePicker } from './housing.js'
import { camera, controls } from './scene.js'
import { showHudToast } from './ui/research-popup.js'

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
let elHomeSection = null
let elHomeRow = null
let elAssignedJobRow = null
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

const ASSIGNED_JOB_LABELS = {
  hunter:     { icon: '🏹', label: 'Chasseur' },
  woodcutter: { icon: '🪓', label: 'Bûcheron' },
  miner:      { icon: '⛏', label: 'Mineur' },
  gatherer:   { icon: '🫐', label: 'Cueilleur' },
  researcher: { icon: '🔬', label: 'Chercheur' },
}

// skills[name] est du XP brut (entier). Niveau = floor(xp / 20), plafonné à 10.
function skillLevel(c, name) {
  if (!c) return 0
  const xp = (c.skills && c.skills[name]) || 0
  return Math.min(10, Math.floor(xp / 20))
}

const PROFESSION_SKILL = {
  cueilleur: 'gathering',
  bucheron:  'logging',
  mineur:    'mining',
  chasseur:  'hunting',
  chercheur: 'research',
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
  injectHomeSection()

  domReady = true
}

function injectHomeSection() {
  if (!panelEl) return
  if (panelEl.querySelector('#cs-home-section')) return
  const body = panelEl.querySelector('.cs-body')
  if (!body) return
  const section = document.createElement('div')
  section.className = 'cs-section'
  section.id = 'cs-home-section'
  section.innerHTML =
    '<h4>Foyer</h4>' +
    '<div id="cs-home-row" class="cs-home-row"></div>'
  body.appendChild(section)
  elHomeSection = section
  elHomeRow = section.querySelector('#cs-home-row')
  // Délégation : focus caméra sur la maison ou ouverture du picker.
  elHomeRow.addEventListener('click', (e) => {
    const focusBtn = e.target.closest('[data-action="focus-home"]')
    if (focusBtn && currentColonist) {
      const home = getHomeOf(currentColonist)
      if (home && home.building && controls) {
        const x = home.building.x + 0.5
        const z = home.building.z + 0.5
        controls.target.set(x, 2, z)
        camera.position.set(x + 14, 18, z + 14)
        camera.lookAt(controls.target)
        if (controls.update) controls.update()
      }
      return
    }
    const assignBtn = e.target.closest('[data-action="assign-home"]')
    if (assignBtn && currentColonist) {
      openHousePicker(currentColonist, () => { refreshHome(currentColonist) })
    }
  })
  injectHomeStyles()
}

function injectHomeStyles() {
  if (document.getElementById('cs-home-style')) return
  const style = document.createElement('style')
  style.id = 'cs-home-style'
  style.textContent =
    '#char-panel .cs-home-row {' +
    '  display: flex; align-items: center; gap: 8px;' +
    '  padding: 6px 10px;' +
    '  background: rgba(255,217,138,0.06);' +
    '  border: 1px solid rgba(255,217,138,0.20);' +
    '  border-radius: 6px;' +
    '  font-size: 12px; color: #f3ecdd;' +
    '}' +
    '#char-panel .cs-home-row .cs-home-key {' +
    '  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;' +
    '  color: #c7b98c;' +
    '}' +
    '#char-panel .cs-home-row .cs-home-name {' +
    '  flex: 1; font-weight: 600; color: #ffd98a;' +
    '  cursor: pointer; transition: color 0.12s;' +
    '}' +
    '#char-panel .cs-home-row .cs-home-name:hover { color: #fff7d0; text-decoration: underline; }' +
    '#char-panel .cs-home-row .cs-home-libre {' +
    '  flex: 1; color: rgba(243,236,221,0.45); font-style: italic;' +
    '}' +
    '#char-panel .cs-home-row .cs-home-btn {' +
    '  background: rgba(120,180,230,0.10);' +
    '  border: 1px solid rgba(120,180,230,0.40);' +
    '  color: #b0d4f5;' +
    '  font-family: var(--mono, monospace);' +
    '  font-size: 9.5px; letter-spacing: 0.06em;' +
    '  padding: 3px 9px; border-radius: 3px; cursor: pointer;' +
    '  transition: background 0.12s, color 0.12s;' +
    '}' +
    '#char-panel .cs-home-row .cs-home-btn:hover {' +
    '  background: rgba(120,180,230,0.22); color: #d8ecff;' +
    '}'
  document.head.appendChild(style)
}

function refreshHome(c) {
  if (!elHomeRow || !c) return
  const home = getHomeOf(c)
  if (home) {
    const lbl = homeLabel(home)
    elHomeRow.innerHTML =
      '<span class="cs-home-key">Foyer</span>' +
      '<span class="cs-home-name" data-action="focus-home" title="Centrer la caméra">' + escHtml(lbl) + '</span>'
  } else {
    elHomeRow.innerHTML =
      '<span class="cs-home-key">Foyer</span>' +
      '<span class="cs-home-libre">Sans-abri</span>' +
      '<button class="cs-home-btn" data-action="assign-home">Assigner</button>'
  }
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
    '<div id="cs-assigned-job-row" class="cs-assigned-job-row"></div>' +
    '<div id="cs-profession-row" class="cs-profession-row" style="display:none"></div>' +
    '<div id="cs-skills-list" class="cs-skills-list"></div>'
  body.appendChild(section)

  elSkillsSection = section
  elAssignedJobRow = section.querySelector('#cs-assigned-job-row')
  elProfessionRow = section.querySelector('#cs-profession-row')
  elSkillsList = section.querySelector('#cs-skills-list')

  injectSkillsStyles()
}

function injectSkillsStyles() {
  if (document.getElementById('cs-skills-style')) return
  const style = document.createElement('style')
  style.id = 'cs-skills-style'
  style.textContent =
    '#char-panel .cs-assigned-job-row {' +
    '  display: flex; align-items: center; gap: 8px;' +
    '  padding: 6px 10px; margin-bottom: 6px;' +
    '  background: rgba(100,180,255,0.07);' +
    '  border: 1px solid rgba(100,180,255,0.28);' +
    '  border-radius: 6px;' +
    '  font-size: 12px; color: #f3ecdd;' +
    '}' +
    '#char-panel .cs-assigned-job-row .cs-role-key {' +
    '  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;' +
    '  color: #c7b98c; margin-right: 2px;' +
    '}' +
    '#char-panel .cs-assigned-job-row .cs-role-icon { font-size: 16px; }' +
    '#char-panel .cs-assigned-job-row .cs-role-label {' +
    '  font-weight: 600; color: #a8d4f5;' +
    '}' +
    '#char-panel .cs-assigned-job-row .cs-role-libre {' +
    '  color: rgba(243,236,221,0.38); font-style: italic;' +
    '}' +
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
    '}' +
    '#char-panel .cs-skill-active {' +
    '  background: rgba(255,217,138,0.07);' +
    '  border-radius: 5px; padding: 2px 4px; margin: 0 -4px;' +
    '  outline: 1px solid rgba(255,217,138,0.22);' +
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
  refreshHome(c)
}

function refreshSkills(c) {
  if (!elSkillsList) return

  // Ligne rôle assigné (assignedJob, ID anglais écrit par le modal Population)
  if (elAssignedJobRow) {
    var aj = c.assignedJob ? ASSIGNED_JOB_LABELS[c.assignedJob] : null
    if (aj) {
      elAssignedJobRow.innerHTML =
        '<span class="cs-role-key">Rôle</span>' +
        '<span class="cs-role-icon">' + aj.icon + '</span>' +
        '<span class="cs-role-label">' + escHtml(aj.label) + '</span>'
    } else {
      elAssignedJobRow.innerHTML =
        '<span class="cs-role-key">Rôle</span>' +
        '<span class="cs-role-libre">Libre</span>'
    }
  }

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
  var profSkill = c.profession ? (PROFESSION_SKILL[c.profession] || null) : null
  var html = ''
  for (var i = 0; i < CHAR_SKILLS.length; i++) {
    var sk = CHAR_SKILLS[i]
    var xp = (c.skills && c.skills[sk.id]) || 0
    var lvl = skillLevel(c, sk.id)
    var xpInLevel = xp - lvl * 20
    var pct = lvl >= 10 ? 100 : (xpInLevel / 20) * 100
    var lvlTxt = lvl >= 10 ? 'MAX' : 'Niv. ' + lvl + ' / 10'
    var isActive = profSkill === sk.id
    html +=
      '<div class="cs-skill-row' + (isActive ? ' cs-skill-active' : '') + '">' +
        '<span class="cs-skill-icon">' + sk.icon + '</span>' +
        '<div class="cs-skill-mid">' +
          '<div class="cs-skill-name">' +
            '<span>' + escHtml(sk.label) + '</span>' +
            '<span class="cs-skill-lvl">' + lvlTxt + '</span>' +
          '</div>' +
          (lvl >= 10
            ? '<div class="cs-skill-bar"><div class="cs-skill-fill" style="width:100%;background:#f2c94c"></div></div>'
            : '<div class="cs-skill-bar"><div class="cs-skill-fill" style="width:' + pct.toFixed(1) + '%"></div></div>') +
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
