// Viewer multi-arbres : Tech, Batiments, (sous-arbres a venir)
// Navigation entre arbres avec animation slide vertical style "strate"
import { state } from './state.js'
import { unlockTech } from './tech.js'
import { TECH_TREE_DATA, BUILDINGS_DATA } from './gamedata.js'
import { refreshTechsPanel } from './hud.js'

let panel = null
let currentTree = 'tech'

const AGES_LABELS = ['Pierre','Bronze','Fer','Industriel','Moderne','Atomique','Espace']

// ─── Ouverture / Fermeture ───────────────────────────────────────────────────

export function initTechTreeUI() {
  panel = document.getElementById('tt-panel')
  if (!panel) return
  document.getElementById('tt-close-btn').addEventListener('click', closeTechTree)
  document.getElementById('tt-backdrop').addEventListener('click', closeTechTree)

  // Tabs
  document.querySelectorAll('.tt-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      switchTree(tab.dataset.tree)
    })
  })
}

export function openTechTree() {
  if (!panel) return
  panel.classList.add('open')
  document.getElementById('tt-backdrop').classList.add('open')
  updatePtsLabel()
  renderCurrent()
}

export function closeTechTree() {
  if (!panel) return
  panel.classList.remove('open')
  document.getElementById('tt-backdrop').classList.remove('open')
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
  const incoming = treeId === 'tech' ? 'up' : 'down'

  // Active tab
  document.querySelectorAll('.tt-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tree === treeId)
  })

  // Animation strate : slide out puis slide in
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
  return state.researchPoints >= tech.cost ? 'ready' : 'available'
}

function renderTechTree() {
  const data = TECH_TREE_DATA
  if (!data) return
  const grid = document.getElementById('tt-grid')
  grid.innerHTML = ''
  grid.className = 'tt-tech-grid'

  const cells = {}
  data.techs.forEach(function(t) {
    const key = t.age + '_' + t.branch
    if (!cells[key]) cells[key] = []
    cells[key].push(t)
  })

  // Header ages
  const headerRow = document.createElement('div')
  headerRow.className = 'tt-header-row'
  headerRow.appendChild(makeEl('div', 'tt-corner', 'Branches'))
  data.ages.forEach(function(age) {
    const h = makeEl('div', 'tt-age-head')
    h.style.borderBottomColor = age.color
    h.innerHTML = '<span class="tt-age-num">Age ' + age.num + '</span><span class="tt-age-name">' + age.label + '</span>'
    headerRow.appendChild(h)
  })
  grid.appendChild(headerRow)

  // Branch rows
  data.branches.forEach(function(branch) {
    const row = makeEl('div', 'tt-branch-row')
    const lbl = makeEl('div', 'tt-branch-label', branch.label)
    lbl.style.borderLeftColor = branch.color
    row.appendChild(lbl)

    data.ages.forEach(function(age) {
      const cell = makeEl('div', 'tt-cell')
      const cellTechs = cells[age.num + '_' + branch.id] || []
      cellTechs.forEach(function(tech) {
        cell.appendChild(buildTechCard(tech, getTechStatus(tech)))
      })
      row.appendChild(cell)
    })
    grid.appendChild(row)
  })
}

function buildTechCard(tech, status) {
  const card = makeEl('div', 'tt-card tt-card--' + status)
  card.dataset.id = tech.id

  const icon = makeEl('div', 'tt-card-icon', tech.icon)
  icon.style.background = tech.color
  card.appendChild(icon)

  const body = makeEl('div', 'tt-card-body')
  body.appendChild(makeEl('div', 'tt-card-name', tech.name))

  if (tech.requires && tech.requires.length > 0) {
    const reqNames = tech.requires.map(function(rid) {
      const rt = TECH_TREE_DATA.techs.find(function(t) { return t.id === rid })
      return rt ? rt.name : rid
    })
    body.appendChild(makeEl('div', 'tt-card-req', 'Req: ' + reqNames.join(', ')))
  }

  const footer = makeEl('div', 'tt-card-footer')
  if (status === 'done') {
    footer.appendChild(makeEl('span', 'tt-badge tt-badge--done', 'Debloque'))
  } else if (status === 'future') {
    footer.appendChild(makeEl('span', 'tt-badge tt-badge--future', 'A venir'))
  } else {
    footer.appendChild(makeEl('span', 'tt-card-cost', tech.cost + ' pts'))
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

// ─── Arbre Batiments ─────────────────────────────────────────────────────────

function renderBuildingsTree() {
  const data = BUILDINGS_DATA
  if (!data) return
  const grid = document.getElementById('tt-grid')
  grid.innerHTML = ''
  grid.className = 'tt-buildings-grid'

  // En-tete ages horizontaux
  const header = makeEl('div', 'tt-bld-header')
  header.appendChild(makeEl('div', 'tt-bld-chain-label', ''))
  AGES_LABELS.forEach(function(lbl, i) {
    const h = makeEl('div', 'tt-bld-age-col')
    h.innerHTML = '<span class="tt-age-num">Age ' + (i+1) + '</span><span class="tt-age-name">' + lbl + '</span>'
    header.appendChild(h)
  })
  grid.appendChild(header)

  // Une ligne par chaine
  data.chains.forEach(function(chain) {
    const row = makeEl('div', 'tt-bld-row')

    // Label chaine
    const lbl = makeEl('div', 'tt-bld-chain-label')
    const dot = makeEl('span', 'tt-bld-dot', chain.icon)
    dot.style.background = chain.color
    lbl.appendChild(dot)
    lbl.appendChild(makeEl('span', '', chain.name))
    row.appendChild(lbl)

    // Cellules par age (1-7)
    const byAge = {}
    chain.levels.forEach(function(lvl) { byAge[lvl.age] = lvl })

    for (var age = 1; age <= 7; age++) {
      const cell = makeEl('div', 'tt-bld-cell')
      const lvl = byAge[age]
      if (lvl) {
        cell.appendChild(buildBldCard(lvl, chain))
        if (lvl.fusionReq) {
          const arrow = makeEl('div', 'tt-bld-arrow', '4x ')
          arrow.title = 'Fusionner ' + lvl.fusionReq + ' ' + lvl.name + ' pour obtenir le niveau suivant'
          cell.appendChild(arrow)
        }
      }
      row.appendChild(cell)
    }
    grid.appendChild(row)
  })
}

function buildBldCard(lvl, chain) {
  const card = makeEl('div', 'tt-bld-card')

  const top = makeEl('div', 'tt-bld-card-top')
  const icon = makeEl('span', 'tt-bld-card-icon', chain.icon)
  icon.style.background = chain.color
  top.appendChild(icon)
  top.appendChild(makeEl('span', 'tt-bld-card-name', lvl.name))
  card.appendChild(top)

  card.appendChild(makeEl('div', 'tt-bld-card-desc', lvl.desc))

  if (lvl.pop)  card.appendChild(makeEl('div', 'tt-bld-card-stat', 'Pop +' + lvl.pop))
  if (lvl.pts)  card.appendChild(makeEl('div', 'tt-bld-card-stat', 'Rech. +' + lvl.pts + '/tick'))
  if (lvl.food) card.appendChild(makeEl('div', 'tt-bld-card-stat', 'Nourrit ' + lvl.food))

  if (lvl.fusionReq) {
    card.appendChild(makeEl('div', 'tt-bld-card-fusion', lvl.fusionReq + 'x fusion'))
  }

  return card
}

// ─── Utilitaire DOM ──────────────────────────────────────────────────────────

function makeEl(tag, cls, text) {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text != null) el.textContent = text
  return el
}
