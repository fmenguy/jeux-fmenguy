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

// Etat pan + zoom du canvas
const view = {
  tx: 40,      // translation x en pixels
  ty: 0,       // translation y en pixels
  scale: 1,    // facteur de zoom (0.5 a 2)
}
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2.0

// Etat filtres et recherche
const filter = {
  branches: null,    // Set d'ids de branches visibles, null = toutes
  query: '',         // texte de recherche lowercase
}

// Dimensions de layout (pixels en coord canvas, scalees par le zoom)
const COL_W      = 240   // largeur d'un age
const HEADER_H   = 56
const LABEL_W    = 130
const CELL_PAD   = 12
const NODE_W     = 200
const NODE_H     = 68    // hauteur d'un noeud empilable
const NODE_GAP   = 8
const ROW_H_MIN  = 140   // hauteur minimale d'une branche

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
    '  <div class="ttp-toolbar">',
    '    <div class="ttp-filters" id="ttp-filters"></div>',
    '    <input type="text" class="ttp-search" id="ttp-search" placeholder="Rechercher une tech..." />',
    '  </div>',
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

  bindPanZoom()
  bindSearch()
}

// ─── Filtres branches + recherche ────────────────────────────────────────────

function renderFilterToolbar() {
  const bar = root && root.querySelector('#ttp-filters')
  if (!bar) return
  bar.innerHTML = ''
  const branches = (TECH_TREE_DATA && TECH_TREE_DATA.branches) || []
  // Bouton "Toutes"
  const allBtn = document.createElement('button')
  allBtn.className = 'ttp-filter-btn' + (filter.branches === null ? ' active' : '')
  allBtn.textContent = 'Toutes'
  allBtn.addEventListener('click', function() {
    filter.branches = null
    render()
  })
  bar.appendChild(allBtn)

  branches.forEach(function(br) {
    const b = document.createElement('button')
    const active = filter.branches === null || filter.branches.has(br.id)
    b.className = 'ttp-filter-btn' + (active ? ' active' : '')
    b.style.borderColor = br.color || '#888'
    b.innerHTML = '<span class="ttp-filter-dot" style="background:' + (br.color || '#888') + '"></span>' +
                  escapeHTML(br.name || br.id)
    b.addEventListener('click', function() {
      if (filter.branches === null) {
        filter.branches = new Set(branches.map(function(x) { return x.id }))
      }
      if (filter.branches.has(br.id)) filter.branches.delete(br.id)
      else filter.branches.add(br.id)
      // Si toutes cochees, on repasse en null pour lisibilite
      if (filter.branches.size === branches.length) filter.branches = null
      render()
    })
    bar.appendChild(b)
  })
}

function bindSearch() {
  const input = root && root.querySelector('#ttp-search')
  if (!input) return
  input.addEventListener('input', function() {
    filter.query = (input.value || '').trim().toLowerCase()
    render()
  })
}

function branchVisible(branchId) {
  return filter.branches === null || filter.branches.has(branchId)
}
function matchesQuery(tech) {
  if (!filter.query) return true
  if ((tech.age || 1) >= 2) return false   // les teases ne matchent jamais (preserve la surprise)
  const hay = (tech.name + ' ' + (tech.id || '')).toLowerCase()
  return hay.indexOf(filter.query) !== -1
}

// ─── Pan + zoom ──────────────────────────────────────────────────────────────

function bindPanZoom() {
  const stage = root.querySelector('#ttp-stage')
  if (!stage) return

  let dragging = false
  let sx = 0, sy = 0, startTx = 0, startTy = 0

  stage.addEventListener('mousedown', function(e) {
    // Ne pas hijacker les clics sur un bouton ou card
    if (e.target.closest('.ttp-node-unlock')) return
    dragging = true
    stage.classList.add('panning')
    sx = e.clientX; sy = e.clientY
    startTx = view.tx; startTy = view.ty
    e.preventDefault()
  })
  window.addEventListener('mousemove', function(e) {
    if (!dragging || !isOpen) return
    view.tx = startTx + (e.clientX - sx)
    view.ty = startTy + (e.clientY - sy)
    applyTransform()
  })
  window.addEventListener('mouseup', function() {
    if (!dragging) return
    dragging = false
    if (stage) stage.classList.remove('panning')
  })

  stage.addEventListener('wheel', function(e) {
    if (!isOpen) return
    e.preventDefault()
    const rect = stage.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, view.scale * delta))
    if (next === view.scale) return
    // Zoom centre sur la position du curseur : on garde le point monde sous le
    // curseur identique avant/apres zoom.
    const ratio = next / view.scale
    view.tx = px - (px - view.tx) * ratio
    view.ty = py - (py - view.ty) * ratio
    view.scale = next
    applyTransform()
  }, { passive: false })
}

function applyTransform() {
  const canvas = root && root.querySelector('#ttp-canvas')
  if (!canvas) return
  canvas.style.transform = 'translate(' + view.tx + 'px, ' + view.ty + 'px) scale(' + view.scale + ')'
}

// ─── Ouverture / fermeture ───────────────────────────────────────────────────

export function openTechTreePanel() {
  if (!root) initTechTreePanel()
  if (!root) return
  isOpen = true
  root.classList.add('open')
  render()
  applyTransform()
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
  renderFilterToolbar()

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

  // Index techs par (age, branch) + calcul de ROW_H dynamique
  const byCell = {}
  techs.forEach(function(t) {
    const key = (t.age || 1) + '|' + (t.branch || '')
    if (!byCell[key]) byCell[key] = []
    byCell[key].push(t)
  })
  const rowH = new Array(branches.length)
  branches.forEach(function(br, bi) {
    let maxInRow = 1
    ages.forEach(function(age, ai) {
      const ageNum = age.id != null ? age.id : (ai + 1)
      const list = byCell[ageNum + '|' + br.id] || []
      if (list.length > maxInRow) maxInRow = list.length
    })
    rowH[bi] = Math.max(ROW_H_MIN, CELL_PAD * 2 + maxInRow * NODE_H + (maxInRow - 1) * NODE_GAP)
  })
  const rowY = [HEADER_H]
  for (let i = 0; i < branches.length; i++) rowY.push(rowY[i] + rowH[i])

  // Taille totale canvas
  const totalW = LABEL_W + ages.length * COL_W
  const totalH = rowY[branches.length]
  canvas.style.width = totalW + 'px'
  canvas.style.height = totalH + 'px'

  // Grille de fond (colonnes d'ages + lignes de branches)
  const gridBg = buildBackgroundGrid(ages, branches, totalW, totalH, rowY, rowH)
  canvas.appendChild(gridBg)

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
    l.style.top = rowY[idx] + 'px'
    l.style.width = LABEL_W + 'px'
    l.style.height = rowH[idx] + 'px'
    l.style.borderLeftColor = br.color || '#888'
    l.innerHTML = '<span class="ttp-branch-dot" style="background:' + (br.color || '#888') + '"></span>' +
                  '<span class="ttp-branch-name">' + escapeHTML(brName) + '</span>'
    canvas.appendChild(l)
  })

  // Cartographie id -> { x, y, w, h } pour tracer les liens SVG
  const nodePos = {}

  // Placer les nœuds
  branches.forEach(function(br, bi) {
    ages.forEach(function(age, ai) {
      const ageNum = age.id != null ? age.id : (ai + 1)
      const list = byCell[ageNum + '|' + br.id] || []
      const cellX = LABEL_W + ai * COL_W + CELL_PAD
      const cellY = rowY[bi] + CELL_PAD
      list.forEach(function(tech, ti) {
        const status = techStatus(tech)
        const hiddenByBranch = !branchVisible(br.id)
        const dimmedByQuery = filter.query && !matchesQuery(tech)
        const node = buildTechNode(tech, status, { cost: techCost(tech), onUnlock: unlockLocal })
        if (hiddenByBranch) node.classList.add('ttp-node--hidden')
        if (dimmedByQuery) node.classList.add('ttp-node--dimmed')
        const px = cellX
        const py = cellY + ti * (NODE_H + NODE_GAP)
        node.style.left = px + 'px'
        node.style.top = py + 'px'
        node.style.width = NODE_W + 'px'
        node.style.height = NODE_H + 'px'
        nodePos[tech.id] = { x: px, y: py, w: NODE_W, h: NODE_H, teased: status === 'teased' }
        canvas.appendChild(node)
      })
    })
  })

  // Liens SVG entre prerequis (insere juste apres la grille de fond,
  // donc derriere les noeuds mais devant le fond)
  const svg = buildLinksSVG(techs, nodePos, totalW, totalH)
  if (gridBg.nextSibling) canvas.insertBefore(svg, gridBg.nextSibling)
  else canvas.appendChild(svg)
}

// ─── Liens SVG entre prerequis ───────────────────────────────────────────────

function buildLinksSVG(techs, nodePos, totalW, totalH) {
  const xmlns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(xmlns, 'svg')
  svg.setAttribute('class', 'ttp-links')
  svg.setAttribute('width', String(totalW))
  svg.setAttribute('height', String(totalH))
  svg.setAttribute('viewBox', '0 0 ' + totalW + ' ' + totalH)

  techs.forEach(function(tech) {
    const reqs = Array.isArray(tech.requires) ? tech.requires : []
    const to = nodePos[tech.id]
    if (!to || to.teased) return
    reqs.forEach(function(reqId) {
      const from = nodePos[reqId]
      if (!from || from.teased) return
      const active = techUnlocked(reqId)
      const x1 = from.x + from.w
      const y1 = from.y + from.h / 2
      const x2 = to.x
      const y2 = to.y + to.h / 2
      const midX = (x1 + x2) / 2
      const d = 'M ' + x1 + ' ' + y1 +
                ' C ' + midX + ' ' + y1 +
                ', ' + midX + ' ' + y2 +
                ', ' + x2 + ' ' + y2
      const path = document.createElementNS(xmlns, 'path')
      path.setAttribute('d', d)
      path.setAttribute('class', 'ttp-link ' + (active ? 'ttp-link--active' : 'ttp-link--idle'))
      svg.appendChild(path)
    })
  })
  return svg
}

// ─── Grille de fond ──────────────────────────────────────────────────────────

function buildBackgroundGrid(ages, branches, totalW, totalH, rowY, rowH) {
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
    row.style.top = rowY[i] + 'px'
    row.style.width = (totalW - LABEL_W) + 'px'
    row.style.height = rowH[i] + 'px'
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
