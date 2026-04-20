// Panneau arbre des technologies - vue scrollable ages x branches
import { state } from './state.js'
import { unlockTech } from './tech.js'
import { TECH_TREE_DATA } from './gamedata.js'
import { refreshTechsPanel } from './hud.js'

let panel = null

export function initTechTreeUI() {
  panel = document.getElementById('tt-panel')
  if (!panel) return

  document.getElementById('tt-close-btn').addEventListener('click', closeTechTree)
  document.getElementById('tt-backdrop').addEventListener('click', closeTechTree)
}

export function openTechTree() {
  if (!panel) return
  panel.classList.add('open')
  document.getElementById('tt-backdrop').classList.add('open')
  const ptsEl = document.getElementById('tt-pts')
  if (ptsEl) ptsEl.textContent = state.researchPoints + ' pts de recherche disponibles'
  renderTree()
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

function getTechStatus(tech) {
  if (tech.future) return 'future'
  const t = state.techs[tech.id]
  if (!t) return 'future'
  if (t.unlocked) return 'done'
  const reqsMet = (tech.requires || []).every(r => state.techs[r] && state.techs[r].unlocked)
  if (!reqsMet) return 'locked'
  if (state.researchPoints >= tech.cost) return 'ready'
  return 'available'
}

function renderTree() {
  const data = TECH_TREE_DATA
  if (!data || !panel) return

  const grid = document.getElementById('tt-grid')
  grid.innerHTML = ''

  const ages = data.ages
  const branches = data.branches
  const techs = data.techs

  // Grouper les techs par age+branche
  const cells = {}
  techs.forEach(t => {
    const key = t.age + '_' + t.branch
    if (!cells[key]) cells[key] = []
    cells[key].push(t)
  })

  // En-tetes ages
  const headerRow = document.createElement('div')
  headerRow.className = 'tt-header-row'

  const cornerCell = document.createElement('div')
  cornerCell.className = 'tt-corner'
  cornerCell.textContent = 'Branches / Ages'
  headerRow.appendChild(cornerCell)

  ages.forEach(age => {
    const ageHead = document.createElement('div')
    ageHead.className = 'tt-age-head'
    ageHead.style.borderBottomColor = age.color
    ageHead.innerHTML = '<span class="tt-age-num">Age ' + age.num + '</span><span class="tt-age-name">' + age.label + '</span>'
    headerRow.appendChild(ageHead)
  })
  grid.appendChild(headerRow)

  // Lignes de branches
  branches.forEach(branch => {
    const row = document.createElement('div')
    row.className = 'tt-branch-row'

    const branchLabel = document.createElement('div')
    branchLabel.className = 'tt-branch-label'
    branchLabel.style.borderLeftColor = branch.color
    branchLabel.textContent = branch.label
    row.appendChild(branchLabel)

    ages.forEach(age => {
      const cell = document.createElement('div')
      cell.className = 'tt-cell'

      const cellTechs = cells[age.num + '_' + branch.id] || []
      cellTechs.forEach(tech => {
        const status = getTechStatus(tech)
        const card = buildCard(tech, status)
        cell.appendChild(card)
      })

      row.appendChild(cell)
    })

    grid.appendChild(row)
  })
}

function buildCard(tech, status) {
  const card = document.createElement('div')
  card.className = 'tt-card tt-card--' + status
  card.dataset.id = tech.id

  const iconEl = document.createElement('div')
  iconEl.className = 'tt-card-icon'
  iconEl.style.background = tech.color
  iconEl.textContent = tech.icon
  card.appendChild(iconEl)

  const body = document.createElement('div')
  body.className = 'tt-card-body'

  const nameEl = document.createElement('div')
  nameEl.className = 'tt-card-name'
  nameEl.textContent = tech.name
  body.appendChild(nameEl)

  if (tech.requires && tech.requires.length > 0) {
    const reqEl = document.createElement('div')
    reqEl.className = 'tt-card-req'
    const TECH_TREE_DATA_local = TECH_TREE_DATA
    const reqNames = tech.requires.map(rid => {
      const rt = TECH_TREE_DATA_local.techs.find(t => t.id === rid)
      return rt ? rt.name : rid
    })
    reqEl.textContent = 'Req: ' + reqNames.join(', ')
    body.appendChild(reqEl)
  }

  const footer = document.createElement('div')
  footer.className = 'tt-card-footer'

  if (status === 'done') {
    footer.innerHTML = '<span class="tt-badge tt-badge--done">Debloque</span>'
  } else if (status === 'future') {
    footer.innerHTML = '<span class="tt-badge tt-badge--future">A venir</span>'
  } else {
    const costEl = document.createElement('span')
    costEl.className = 'tt-card-cost'
    costEl.textContent = tech.cost + ' pts'
    footer.appendChild(costEl)

    if (status === 'ready') {
      const btn = document.createElement('button')
      btn.className = 'tt-unlock-btn'
      btn.textContent = 'Debloquer'
      btn.addEventListener('click', function(e) {
        e.stopPropagation()
        unlockTech(tech.id, function() {
          refreshTechsPanel()
          renderTree()
        })
      })
      footer.appendChild(btn)
    }
  }

  body.appendChild(footer)
  card.appendChild(body)

  return card
}
