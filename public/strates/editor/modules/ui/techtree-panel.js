// ============================================================================
// Panneau Tech tree XXL (Lot C)
//
// Panneau plein ecran avec pan + zoom, colonnes = ages, lignes = branches,
// noeuds = cards, liens SVG entre prerequis, filtres par branche + recherche
// texte. Ages 2+ en flou avec "?????" au lieu du nom reel (preserve la
// surprise, ne jamais afficher meme via devtools).
//
// Consomme :
//   - TECH_TREE_DATA (JSON SPEC v1 via gamedata.js, lecture seule)
//   - state.techs[id].unlocked (ecriture via unlockTech locale)
//   - state.researchPoints (decremente au deblocage)
//
// N'ecrit pas dans data/*.json. Ne touche pas jobs.js / needs.js.
// ============================================================================
import { state } from '../state.js'
import { TECH_TREE_DATA } from '../gamedata.js'
import { refreshTechsPanel } from '../hud.js'
import { buildTechNode } from './techtree-node.js'

let root = null
let isOpen = false

// Dimensions de layout (pixels en coord canvas, scalees par le zoom)
const COL_W      = 240   // largeur d'un age
const ROW_H      = 140   // hauteur d'une branche
const HEADER_H   = 56
const LABEL_W    = 130
const CELL_PAD   = 12
const NODE_W     = 200
const NODE_H     = ROW_H - CELL_PAD * 2

// ─── Styles externalises dans styles/techtree.css ────────────────────────────

function ensureStylesheet() {
  if (document.getElementById('ttp-stylesheet')) return
  const link = document.createElement('link')
  link.id = 'ttp-stylesheet'
  link.rel = 'stylesheet'
  link.href = new URL('../../styles/techtree.css', import.meta.url).href
  document.head.appendChild(link)
}

// ─── Bootstrap du DOM ────────────────────────────────────────────────────────

export function initTechTreePanel() {
  ensureStylesheet()
  if (document.getElementById('ttp-root')) {
    root = document.getElementById('ttp-root')
    return
  }
  root = document.createElement('div')
  root.id = 'ttp-root'
  root.innerHTML = [
    '<div class="ttp-backdrop"></div>',
    '<div class="ttp-frame">',
    '  <header class="ttp-header">',
    '    <h2 class="ttp-title">Arbre des technologies</h2>',
    '    <div class="ttp-meta">',
    '      <span class="ttp-pts" id="ttp-pts">0 pts</span>',
    '      <button class="ttp-close" id="ttp-close" aria-label="Fermer">Fermer (Esc)</button>',
    '    </div>',
    '  </header>',
    '  <div class="ttp-body">',
    '    <div class="ttp-stage" id="ttp-stage">',
    '      <div class="ttp-canvas" id="ttp-canvas"></div>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('')
  document.body.appendChild(root)

  root.querySelector('#ttp-close').addEventListener('click', closeTechTreePanel)
  root.querySelector('.ttp-backdrop').addEventListener('click', closeTechTreePanel)
  window.addEventListener('keydown', function(e) {
    if (!isOpen) return
    if (e.key === 'Escape') { e.preventDefault(); closeTechTreePanel() }
  })
}

// ─── Ouverture / fermeture ───────────────────────────────────────────────────

export function openTechTreePanel() {
  if (!root) initTechTreePanel()
  if (!root) return
  isOpen = true
  root.classList.add('open')
  render()
}
export function closeTechTreePanel() {
  if (!root) return
  isOpen = false
  root.classList.remove('open')
}
export function toggleTechTreePanel() {
  if (!root) initTechTreePanel()
  if (!root) return
  if (isOpen) closeTechTreePanel()
  else openTechTreePanel()
}

// ─── Helpers donnees ─────────────────────────────────────────────────────────

function techCost(tech) {
  if (!tech) return 0
  if (typeof tech.cost === 'number') return tech.cost
  if (tech.cost && typeof tech.cost === 'object') return tech.cost.research || 0
  return 0
}
function techUnlocked(id) {
  return !!(state.techs && state.techs[id] && state.techs[id].unlocked)
}
function techStatus(tech) {
  if ((tech.age || 1) >= 2) return 'teased'
  if (techUnlocked(tech.id)) return 'done'
  const reqs = Array.isArray(tech.requires) ? tech.requires : []
  const reqsMet = reqs.every(function(r) { return techUnlocked(r) })
  if (!reqsMet) return 'locked'
  return (state.researchPoints || 0) >= techCost(tech) ? 'ready' : 'available'
}

// Deblocage local : puise dans state.researchPoints, ne modifie pas data/*.json.
function unlockLocal(techId) {
  const tech = (TECH_TREE_DATA.techs || []).find(function(t) { return t.id === techId })
  if (!tech) return
  if (techStatus(tech) !== 'ready') return
  const cost = techCost(tech)
  state.researchPoints = Math.max(0, (state.researchPoints || 0) - cost)
  if (!state.techs[techId]) state.techs[techId] = {}
  state.techs[techId].unlocked = true
  state.techs[techId].name = tech.name
  if (typeof refreshTechsPanel === 'function') refreshTechsPanel()
  render()
}

// ─── Rendu grille ages x branches ────────────────────────────────────────────

function render() {
  if (!root) return
  const pts = document.getElementById('ttp-pts')
  if (pts) pts.textContent = (state.researchPoints || 0) + ' pts'

  const canvas = document.getElementById('ttp-canvas')
  if (!canvas) return
  canvas.innerHTML = ''

  const data = TECH_TREE_DATA
  if (!data) {
    canvas.appendChild(infoEl('Chargement des donnees tech tree...'))
    return
  }
  const ages = Array.isArray(data.ages) ? data.ages : []
  const branches = Array.isArray(data.branches) ? data.branches : []
  const techs = Array.isArray(data.techs) ? data.techs : []

  // Taille totale canvas
  const totalW = LABEL_W + ages.length * COL_W
  const totalH = HEADER_H + branches.length * ROW_H
  canvas.style.width = totalW + 'px'
  canvas.style.height = totalH + 'px'

  // Grille de fond (colonnes d'ages + lignes de branches)
  canvas.appendChild(buildBackgroundGrid(ages, branches, totalW, totalH))

  // Header ages
  ages.forEach(function(age, idx) {
    const ageNum = age.id != null ? age.id : (idx + 1)
    const ageName = age.name || age.label || ('Age ' + ageNum)
    const h = document.createElement('div')
    h.className = 'ttp-age-head' + (age.unlocked === false ? ' ttp-age-head--locked' : '')
    h.style.left = (LABEL_W + idx * COL_W) + 'px'
    h.style.top = '0px'
    h.style.width = COL_W + 'px'
    h.style.height = HEADER_H + 'px'
    h.innerHTML = '<span class="ttp-age-num">Age ' + ageNum + '</span>' +
                  '<span class="ttp-age-name">' + escapeHTML(ageName) + '</span>'
    canvas.appendChild(h)
  })

  // Labels branches
  branches.forEach(function(br, idx) {
    const brName = br.name || br.label || br.id
    const l = document.createElement('div')
    l.className = 'ttp-branch-label'
    l.style.left = '0px'
    l.style.top = (HEADER_H + idx * ROW_H) + 'px'
    l.style.width = LABEL_W + 'px'
    l.style.height = ROW_H + 'px'
    l.style.borderLeftColor = br.color || '#888'
    l.innerHTML = '<span class="ttp-branch-dot" style="background:' + (br.color || '#888') + '"></span>' +
                  '<span class="ttp-branch-name">' + escapeHTML(brName) + '</span>'
    canvas.appendChild(l)
  })

  // Index techs par (age, branch)
  const byCell = {}
  techs.forEach(function(t) {
    const key = (t.age || 1) + '|' + (t.branch || '')
    if (!byCell[key]) byCell[key] = []
    byCell[key].push(t)
  })

  // Placer les nœuds
  branches.forEach(function(br, bi) {
    ages.forEach(function(age, ai) {
      const ageNum = age.id != null ? age.id : (ai + 1)
      const list = byCell[ageNum + '|' + br.id] || []
      const cellX = LABEL_W + ai * COL_W + CELL_PAD
      const cellY = HEADER_H + bi * ROW_H + CELL_PAD
      const cellInnerH = NODE_H
      // Empile verticalement si plusieurs techs dans la meme case (age 1 : 3 outils)
      const step = list.length > 1 ? Math.min(cellInnerH, 48) : 0
      list.forEach(function(tech, ti) {
        const status = techStatus(tech)
        const node = buildTechNode(tech, status, { cost: techCost(tech), onUnlock: unlockLocal })
        node.style.left = cellX + 'px'
        node.style.top = (cellY + ti * (step + 8)) + 'px'
        node.style.width = NODE_W + 'px'
        canvas.appendChild(node)
      })
    })
  })
}

// ─── Grille de fond ──────────────────────────────────────────────────────────

function buildBackgroundGrid(ages, branches, totalW, totalH) {
  const g = document.createElement('div')
  g.className = 'ttp-grid-bg'
  g.style.width = totalW + 'px'
  g.style.height = totalH + 'px'

  // Colonnes ages (tint pour les locked)
  ages.forEach(function(age, i) {
    const col = document.createElement('div')
    col.className = 'ttp-col' + (age.unlocked === false ? ' ttp-col--locked' : '')
    col.style.left = (LABEL_W + i * COL_W) + 'px'
    col.style.top = HEADER_H + 'px'
    col.style.width = COL_W + 'px'
    col.style.height = (totalH - HEADER_H) + 'px'
    g.appendChild(col)
  })

  // Lignes branches (teinte leger)
  branches.forEach(function(br, i) {
    const row = document.createElement('div')
    row.className = 'ttp-row'
    row.style.left = LABEL_W + 'px'
    row.style.top = (HEADER_H + i * ROW_H) + 'px'
    row.style.width = (totalW - LABEL_W) + 'px'
    row.style.height = ROW_H + 'px'
    row.style.background = 'linear-gradient(90deg, ' + hexToRgba(br.color || '#888', 0.04) + ', transparent 60%)'
    g.appendChild(row)
  })

  return g
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function infoEl(text) {
  const n = document.createElement('div')
  n.className = 'ttp-info'
  n.textContent = text
  return n
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  })
}
function hexToRgba(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return 'rgba(136,136,136,' + a + ')'
  return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')'
}
