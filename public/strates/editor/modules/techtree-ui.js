// Viewer multi-arbres : Tech, Batiments, (sous-arbres a venir)
// Navigation entre arbres avec animation slide vertical style "strate"
//
// Pre-fix defensif SPEC v1 : les JSON ont change de schema
// (age.id/age.name au lieu de age.num/age.label, branches sans .label,
// tech.cost = { research: N } au lieu d'un number, plus de tech.color,
// BUILDINGS_DATA.buildings + schema a plat au lieu de BUILDINGS_DATA.chains).
// Ce fichier est tolerant pour ne pas crasher, en attendant le remplacement
// complet par modules/ui/techtree-panel.js (Lot C).
import { state } from './state.js'
import { unlockTech } from './tech.js'
import { TECH_TREE_DATA, BUILDINGS_DATA } from './gamedata.js'
import { refreshTechsPanel } from './hud.js'

let panel = null
let currentTree = 'tech'

const AGES_LABELS = ['Pierre','Bronze','Fer','Industriel','Moderne','Atomique','Espace']

// ─── Helpers defensifs de lecture SPEC v1 ────────────────────────────────────

function ageNumOf(age)     { return age && (age.id != null ? age.id : age.num) }
function ageNameOf(age)    { return (age && (age.name || age.label)) || '' }
function branchNameOf(br)  { return (br && (br.name || br.label)) || '' }
function branchColorOf(br) { return (br && br.color) || '#888' }
function techCostOf(tech) {
  if (!tech) return 0
  if (typeof tech.cost === 'number') return tech.cost
  if (tech.cost && typeof tech.cost === 'object') return tech.cost.research || 0
  return 0
}
function techColorOf(tech, branchesById) {
  if (!tech) return '#555'
  if (tech.color) return tech.color
  if (branchesById && tech.branch && branchesById[tech.branch]) {
    return branchesById[tech.branch].color || '#555'
  }
  return '#555'
}

// ─── Ouverture / Fermeture ───────────────────────────────────────────────────

export function initTechTreeUI() {
  panel = document.getElementById('tt-panel')
  if (!panel) return
  const closeBtn = document.getElementById('tt-close-btn')
  const backdrop = document.getElementById('tt-backdrop')
  if (closeBtn) closeBtn.addEventListener('click', closeTechTree)
  if (backdrop) backdrop.addEventListener('click', closeTechTree)

  document.querySelectorAll('.tt-tab').forEach(function(tab) {
    tab.addEventListener('click', function() { switchTree(tab.dataset.tree) })
  })
}

export function openTechTree() {
  if (!panel) return
  panel.classList.add('open')
  const backdrop = document.getElementById('tt-backdrop')
  if (backdrop) backdrop.classList.add('open')
  updatePtsLabel()
  renderCurrent()
}

export function closeTechTree() {
  if (!panel) return
  panel.classList.remove('open')
  const backdrop = document.getElementById('tt-backdrop')
  if (backdrop) backdrop.classList.remove('open')
}

export function toggleTechTree() {
  if (!panel) return
  if (panel.classList.contains('open')) closeTechTree()
  else openTechTree()
}

function updatePtsLabel() {
  const el = document.getElementById('tt-pts')
  if (el) el.textContent = state.researchPoints + ' pts de recherche'
}

// ─── Navigation entre arbres ─────────────────────────────────────────────────

function switchTree(treeId) {
  if (treeId === currentTree) return
  const scroll = document.getElementById('tt-scroll')
  if (!scroll) return
  const incoming = treeId === 'tech' ? 'up' : 'down'

  document.querySelectorAll('.tt-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tree === treeId)
  })

  scroll.classList.add('tt-slide-out-' + (incoming === 'down' ? 'up' : 'down'))
  setTimeout(function() {
    scroll.classList.remove('tt-slide-out-up', 'tt-slide-out-down')
    currentTree = treeId
    renderCurrent()
    scroll.classList.add('tt-slide-in-' + incoming)
    setTimeout(function() {
      scroll.classList.remove('tt-slide-in-up', 'tt-slide-in-down')
    }, 280)
  }, 200)
}

function renderCurrent() {
  if (currentTree === 'tech') renderTechTree()
  else if (currentTree === 'buildings') renderBuildingsTree()
}

// ─── Arbre Tech ──────────────────────────────────────────────────────────────

function getTechStatus(tech) {
  if (tech.future) return 'future'
  const t = state.techs[tech.id]
  if (!t) return 'future'
  if (t.unlocked) return 'done'
  const reqsMet = (tech.requires || []).every(function(r) {
    return state.techs[r] && state.techs[r].unlocked
  })
  if (!reqsMet) return 'locked'
  return state.researchPoints >= techCostOf(tech) ? 'ready' : 'available'
}

function renderTechTree() {
  const data = TECH_TREE_DATA
  if (!data) return
  const grid = document.getElementById('tt-grid')
  if (!grid) return
  grid.innerHTML = ''
  grid.className = 'tt-tech-grid'

  const ages = Array.isArray(data.ages) ? data.ages : []
  const branches = Array.isArray(data.branches) ? data.branches : []
  const branchesById = {}
  branches.forEach(function(b) { branchesById[b.id] = b })

  const cells = {}
  ;(data.techs || []).forEach(function(t) {
    const key = t.age + '_' + t.branch
    if (!cells[key]) cells[key] = []
    cells[key].push(t)
  })

  // Header ages
  const headerRow = document.createElement('div')
  headerRow.className = 'tt-header-row'
  headerRow.appendChild(makeEl('div', 'tt-corner', 'Branches'))
  ages.forEach(function(age) {
    const h = makeEl('div', 'tt-age-head')
    h.innerHTML = '<span class="tt-age-num">Age ' + ageNumOf(age) + '</span><span class="tt-age-name">' + ageNameOf(age) + '</span>'
    headerRow.appendChild(h)
  })
  grid.appendChild(headerRow)

  branches.forEach(function(branch) {
    const row = makeEl('div', 'tt-branch-row')
    const lbl = makeEl('div', 'tt-branch-label', branchNameOf(branch))
    lbl.style.borderLeftColor = branchColorOf(branch)
    row.appendChild(lbl)

    ages.forEach(function(age) {
      const cell = makeEl('div', 'tt-cell')
      const cellTechs = cells[ageNumOf(age) + '_' + branch.id] || []
      cellTechs.forEach(function(tech) {
        cell.appendChild(buildTechCard(tech, getTechStatus(tech), branchesById))
      })
      row.appendChild(cell)
    })
    grid.appendChild(row)
  })
}

function buildTechCard(tech, status, branchesById) {
  const card = makeEl('div', 'tt-card tt-card--' + status)
  card.dataset.id = tech.id

  const icon = makeEl('div', 'tt-card-icon', tech.icon || '')
  icon.style.background = techColorOf(tech, branchesById)
  card.appendChild(icon)

  const body = makeEl('div', 'tt-card-body')
  body.appendChild(makeEl('div', 'tt-card-name', tech.name))

  if (tech.requires && tech.requires.length > 0) {
    const reqNames = tech.requires.map(function(rid) {
      const rt = (TECH_TREE_DATA.techs || []).find(function(t) { return t.id === rid })
      return rt ? rt.name : rid
    })
    body.appendChild(makeEl('div', 'tt-card-req', 'Req: ' + reqNames.join(', ')))
  }

  const cost = techCostOf(tech)
  const footer = makeEl('div', 'tt-card-footer')
  if (status === 'done') {
    footer.appendChild(makeEl('span', 'tt-badge tt-badge--done', 'Debloque'))
  } else if (status === 'future') {
    footer.appendChild(makeEl('span', 'tt-badge tt-badge--future', 'A venir'))
  } else {
    footer.appendChild(makeEl('span', 'tt-card-cost', cost + ' pts'))
    if (status === 'ready') {
      const btn = makeEl('button', 'tt-unlock-btn', 'Debloquer')
      btn.addEventListener('click', function(e) {
        e.stopPropagation()
        unlockTech(tech.id, function() { refreshTechsPanel(); renderTechTree() })
      })
      footer.appendChild(btn)
    }
  }
  body.appendChild(footer)
  card.appendChild(body)
  return card
}

// ─── Arbre Batiments (defensif : schema SPEC v1 a plat, pas de .chains) ──────

function renderBuildingsTree() {
  const data = BUILDINGS_DATA
  const grid = document.getElementById('tt-grid')
  if (!grid) return
  grid.innerHTML = ''
  grid.className = 'tt-buildings-grid'

  // SPEC v1 : data.buildings (pas data.chains). Si schema non reconnu, on affiche
  // un message d'attente plutot que de crasher.
  if (!data || !Array.isArray(data.buildings)) {
    grid.appendChild(makeEl('div', 'tt-bld-empty', 'Arbre des batiments en cours de refonte (SPEC v1).'))
    return
  }

  const header = makeEl('div', 'tt-bld-header')
  header.appendChild(makeEl('div', 'tt-bld-chain-label', ''))
  AGES_LABELS.forEach(function(lbl, i) {
    const h = makeEl('div', 'tt-bld-age-col')
    h.innerHTML = '<span class="tt-age-num">Age ' + (i+1) + '</span><span class="tt-age-name">' + lbl + '</span>'
    header.appendChild(h)
  })
  grid.appendChild(header)

  // Regroupement simple par category (SPEC v1 utilise category + age plats).
  const byCat = {}
  data.buildings.forEach(function(b) {
    const c = b.category || 'divers'
    if (!byCat[c]) byCat[c] = []
    byCat[c].push(b)
  })

  Object.keys(byCat).forEach(function(cat) {
    const row = makeEl('div', 'tt-bld-row')
    const lbl = makeEl('div', 'tt-bld-chain-label')
    lbl.appendChild(makeEl('span', '', cat))
    row.appendChild(lbl)

    const byAge = {}
    byCat[cat].forEach(function(b) { (byAge[b.age] = byAge[b.age] || []).push(b) })

    for (let age = 1; age <= 7; age++) {
      const cell = makeEl('div', 'tt-bld-cell')
      const list = byAge[age] || []
      list.forEach(function(b) { cell.appendChild(buildBldCardV1(b)) })
      row.appendChild(cell)
    }
    grid.appendChild(row)
  })
}

function buildBldCardV1(b) {
  const card = makeEl('div', 'tt-bld-card')
  const top = makeEl('div', 'tt-bld-card-top')
  top.appendChild(makeEl('span', 'tt-bld-card-icon', b.icon || ''))
  top.appendChild(makeEl('span', 'tt-bld-card-name', b.name || b.id))
  card.appendChild(top)
  if (b.description) card.appendChild(makeEl('div', 'tt-bld-card-desc', b.description))
  return card
}

// ─── Utilitaire DOM ──────────────────────────────────────────────────────────

function makeEl(tag, cls, text) {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text != null) el.textContent = text
  return el
}
