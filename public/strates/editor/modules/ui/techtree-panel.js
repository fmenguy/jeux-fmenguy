// ============================================================================
// Panneau Tech tree XXL (Lot C) - maquette v2 "constellation"
//
// Vue globale constellation : branches hexagonales autour du centre "Age en
// cours". Vue detail par branche avec pan + zoom, cards tech, liens SVG
// orthogonaux. Ages 2+ restent teases (flou + "?????").
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
let dirty = false
let currentBranch = null

// Etat pan + zoom de la vue detail
const view = {
  tx: 240,
  ty: 0,
  scale: 0.88,
}
const ZOOM_MIN = 0.5
const ZOOM_MAX = 1.4

// Etat filtres + recherche
const active = new Set()

// Metadonnees visuelles des branches (icone + pitch) non presentes dans le JSON
// brut. Cle = branch.id du JSON (outils, agriculture, etc.).
const BRANCH_META = {
  outils:       { ic: '⛏', pitch: "Le geste avant la pensee. Ce que tiennent leurs mains faconne ce qu'ils peuvent faire." },
  agriculture:  { ic: '🌾', pitch: "De la cueillette au champ. La terre commence a rendre ce qu'on lui donne." },
  construction: { ic: '🏠', pitch: "Du foyer a la longere. Poser des murs, c'est decider de rester." },
  savoir:       { ic: '✦', pitch: "Les histoires, puis les notes. On garde ce que les anciens ont compris avant nous." },
  exploration:  { ic: '🧭', pitch: "Au-dela de la crete. Celui qui marche revient avec des nouvelles du monde." },
  nocturne:     { ic: '🌙', pitch: "Les etoiles ont un ordre. La nuit n'est plus une attente, mais une lecture." },
}

// Positions radiales des branches dans la constellation (coord relatives au
// centre de .ttp-constellation, qui fait 820x820 et dont le centre est
// top:50%/left:50%).
const BRANCH_POS = {
  outils:       { dx:    0, dy: -300 },
  nocturne:     { dx:  260, dy: -150 },
  agriculture:  { dx:  260, dy:  150 },
  construction: { dx:    0, dy:  320 },
  savoir:       { dx: -260, dy:  150 },
  exploration:  { dx: -260, dy: -150 },
}

// Layout de la vue detail
const CELL_W  = 240
const CELL_H  = 150
const PAD_X   = 80
const PAD_Y   = 180
const AGES_PER_VIEW = 2

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

    // TOPBAR
    '  <div class="ttp-topbar">',
    '    <h1>Strates <small>Arbre</small></h1>',
    '    <button class="ttp-btn-back" id="ttp-back">Retour</button>',
    '    <div class="ttp-crumb">',
    '      <span id="ttp-crumb-age">Age I, Pierre</span>',
    '      <span class="sep" id="ttp-crumb-sep" style="display:none">/</span>',
    '      <span class="cur" id="ttp-crumb-cur" style="display:none"></span>',
    '    </div>',
    '    <div class="ttp-age-pill">Age en cours, <b id="ttp-age-name">Pierre</b></div>',
    '    <div class="ttp-res">',
    '      <span><b id="ttp-pts">0</b> pts recherche</span>',
    '    </div>',
    '    <button class="ttp-close" id="ttp-close" title="Fermer">X</button>',
    '  </div>',

    // Recherche globale
    '  <div class="ttp-search-top">',
    '    <span style="color:var(--ttp-ink-3)">&#x1F50E;&#xFE0E;</span>',
    '    <input id="ttp-search" type="text" placeholder="Rechercher une technologie..." />',
    '  </div>',

    // STAGE
    '  <div class="ttp-stage" id="ttp-stage">',

    // Constellation (vue globale)
    '    <div class="ttp-constellation" id="ttp-constellation">',
    '      <svg class="ttp-spokes" id="ttp-spokes" viewBox="-410 -410 820 820"></svg>',
    '      <div class="ttp-center">',
    '        <div class="ring r3"></div><div class="ring r2"></div><div class="ring"></div>',
    '        <div class="lbl">Age 01</div>',
    '        <div class="name"><em id="ttp-center-name">Pierre</em></div>',
    '        <div class="sub">Tout commence par le feu, une pioche, et l\'histoire qu\'on se raconte.</div>',
    '        <div class="progress"><span>Debloquees</span><b id="ttp-global-progress">0/0</b></div>',
    '      </div>',
    '    </div>',

    // Vue detail branche
    '    <div class="ttp-detail-view" id="ttp-detail">',
    '      <div class="ttp-canvas-wrap" id="ttp-canvas-wrap">',
    '        <div class="ttp-branch-canvas" id="ttp-canvas">',
    '          <div class="ttp-branch-header" id="ttp-branch-header"></div>',
    '          <svg class="ttp-links" id="ttp-links" width="1800" height="900"></svg>',
    '        </div>',
    '      </div>',
    '    </div>',
    '  </div>',

    // Age rail (bas)
    '  <div class="ttp-agerail" id="ttp-agerail"></div>',

    // Filtres (bas gauche)
    '  <div class="ttp-filters-panel" id="ttp-filters">',
    '    <div class="title">Filtres branches</div>',
    '  </div>',

    // Hint
    '  <div class="ttp-hint">Echap pour revenir, glisser pour panner, molette pour zoomer</div>',

    '</div>'
  ].join('')
  document.body.appendChild(root)

  root.querySelector('#ttp-close').addEventListener('click', closeTechTreePanel)
  root.querySelector('#ttp-back').addEventListener('click', closeBranch)

  window.addEventListener('keydown', function(e) {
    if (!isOpen) return
    if (e.key === 'Escape') {
      e.preventDefault()
      if (root.classList.contains('detail-mode')) closeBranch()
      else closeTechTreePanel()
    }
  })

  bindSearch()
  bindPanZoom()
}

function bindSearch() {
  const input = root && root.querySelector('#ttp-search')
  if (!input) return
  input.addEventListener('input', function() {
    const q = (input.value || '').trim().toLowerCase()
    root.querySelectorAll('.ttp-branch').forEach(function(el) {
      if (!q) { el.classList.remove('dimmed'); return }
      const hit = el.textContent.toLowerCase().indexOf(q) !== -1
      el.classList.toggle('dimmed', !hit)
    })
  })
}

// ─── Pan + zoom (vue detail) ────────────────────────────────────────────────

function bindPanZoom() {
  const wrap = root && root.querySelector('#ttp-canvas-wrap')
  const canv = root && root.querySelector('#ttp-canvas')
  if (!wrap || !canv) return

  let dragging = false
  let sx = 0, sy = 0, stx = 0, sty = 0

  wrap.addEventListener('mousedown', function(e) {
    if (e.target.closest('.ttp-tech')) return
    if (e.target.closest('.ttp-tech-unlock')) return
    dragging = true
    sx = e.clientX; sy = e.clientY
    stx = view.tx; sty = view.ty
    wrap.classList.add('dragging')
    canv.classList.add('dragging')
    e.preventDefault()
  })
  window.addEventListener('mousemove', function(e) {
    if (!dragging || !isOpen) return
    view.tx = stx + (e.clientX - sx)
    view.ty = sty + (e.clientY - sy)
    applyTransform()
  })
  window.addEventListener('mouseup', function() {
    if (!dragging) return
    dragging = false
    wrap.classList.remove('dragging')
    canv.classList.remove('dragging')
  })

  wrap.addEventListener('wheel', function(e) {
    if (!isOpen) return
    if (!root.classList.contains('detail-mode')) return
    e.preventDefault()
    const rect = wrap.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const old = view.scale
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, old + delta))
    if (next === old) return
    view.tx = mx - (mx - view.tx) * (next / old)
    view.ty = my - (my - view.ty) * (next / old)
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
  dirty = false
  root.classList.add('open')
  root.classList.remove('detail-mode')
  render()
}
export function closeTechTreePanel() {
  if (!root) return
  isOpen = false
  root.classList.remove('open')
  root.classList.remove('detail-mode')
  currentBranch = null
}
export function toggleTechTreePanel() {
  if (!root) initTechTreePanel()
  if (!root) return
  if (isOpen) closeTechTreePanel()
  else openTechTreePanel()
}

// ─── Hook Lot D : refresh apres transition d'age ────────────────────────────

export function refreshTechTreeAfterAgeChange(age) {
  if (isOpen) {
    render()
  } else {
    dirty = true
  }
}
if (typeof window !== 'undefined') {
  window.refreshTechTreeAfterAgeChange = refreshTechTreeAfterAgeChange
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
  const currentAge = state.currentAge || 1
  if ((tech.age || 1) > currentAge) return 'teased'
  if (techUnlocked(tech.id)) return 'done'
  const reqs = Array.isArray(tech.requires) ? tech.requires : []
  const reqsMet = reqs.every(function(r) { return techUnlocked(r) })
  if (!reqsMet) return 'locked'
  return (state.researchPoints || 0) >= techCost(tech) ? 'ready' : 'available'
}
function byId(id) {
  const techs = (TECH_TREE_DATA && TECH_TREE_DATA.techs) || []
  for (let i = 0; i < techs.length; i++) if (techs[i].id === id) return techs[i]
  return null
}

// Deblocage local : puise dans state.researchPoints, ne modifie pas data/*.json.
function unlockLocal(techId) {
  const tech = byId(techId)
  if (!tech) return
  if (techStatus(tech) !== 'ready') return
  const cost = techCost(tech)
  state.researchPoints = Math.max(0, (state.researchPoints || 0) - cost)
  state.totalResearchSpent = (state.totalResearchSpent || 0) + cost
  if (!state.techs[techId]) state.techs[techId] = {}
  state.techs[techId].unlocked = true
  state.techs[techId].name = tech.name
  if (typeof refreshTechsPanel === 'function') refreshTechsPanel()
  if (root.classList.contains('detail-mode')) {
    renderBranchDetail(currentBranch)
  }
  renderConstellation()
  renderTopbar()
}

// ─── Render principal ───────────────────────────────────────────────────────

function render() {
  if (!root) return
  renderTopbar()
  renderFilters()
  renderAgeRail()
  renderConstellation()
  if (root.classList.contains('detail-mode') && currentBranch) {
    renderBranchDetail(currentBranch)
  }
}

function renderTopbar() {
  const pts = document.getElementById('ttp-pts')
  if (pts) pts.textContent = String(state.researchPoints || 0)
  const data = TECH_TREE_DATA
  const ages = (data && data.ages) || []
  const curAge = state.currentAge || 1
  const curAgeObj = ages.find(function(a) { return a.id === curAge }) || ages[0]
  const ageName = (curAgeObj && (curAgeObj.name || curAgeObj.label)) || 'Pierre'
  const an = document.getElementById('ttp-age-name')
  if (an) an.textContent = ageName
  const cn = document.getElementById('ttp-center-name')
  if (cn) cn.textContent = ageName
  const crumb = document.getElementById('ttp-crumb-age')
  if (crumb) crumb.textContent = 'Age ' + roman(curAge) + ', ' + ageName
}

function renderFilters() {
  const bar = document.getElementById('ttp-filters')
  if (!bar) return
  // on preserve le <div class="title">
  bar.querySelectorAll('.ttp-filter').forEach(function(el) { el.remove() })
  const branches = (TECH_TREE_DATA && TECH_TREE_DATA.branches) || []
  if (active.size === 0) branches.forEach(function(br) { active.add(br.id) })
  branches.forEach(function(br) {
    const b = document.createElement('button')
    b.className = 'ttp-filter' + (active.has(br.id) ? '' : ' off')
    b.dataset.br = br.id
    b.innerHTML = '<span class="sw" style="background:' + (br.color || '#888') + '"></span>' +
                  escapeHTML(br.name || br.id)
    b.addEventListener('click', function() {
      if (active.has(br.id)) { active.delete(br.id); b.classList.add('off') }
      else { active.add(br.id); b.classList.remove('off') }
      root.querySelectorAll('.ttp-branch').forEach(function(c) {
        c.classList.toggle('dimmed', !active.has(c.dataset.br))
      })
      root.querySelectorAll('.ttp-spokes line').forEach(function(l) {
        l.style.opacity = active.has(l.dataset.br) ? '' : '0.1'
      })
    })
    bar.appendChild(b)
  })
}

function renderAgeRail() {
  const rail = document.getElementById('ttp-agerail')
  if (!rail) return
  rail.innerHTML = ''
  const ages = (TECH_TREE_DATA && TECH_TREE_DATA.ages) || []
  const curAge = state.currentAge || 1
  ages.forEach(function(a) {
    const d = document.createElement('div')
    const unlocked = a.unlocked || a.id <= curAge
    d.className = 'dot' + (a.id === curAge ? ' active' : (unlocked ? '' : ' locked'))
    d.title = 'Age ' + roman(a.id) + (a.name ? ', ' + a.name : '')
    d.textContent = roman(a.id)
    rail.appendChild(d)
  })
}

// ─── Constellation (vue globale) ────────────────────────────────────────────

function renderConstellation() {
  const cst = document.getElementById('ttp-constellation')
  if (!cst) return
  // nettoyer les anciennes branches (garder svg + center)
  cst.querySelectorAll('.ttp-branch').forEach(function(el) { el.remove() })

  const data = TECH_TREE_DATA
  if (!data) return
  const branches = data.branches || []
  const techs = (data.techs || []).filter(function(t) { return (t.age || 1) === (state.currentAge || 1) })

  // Spokes (rayons centraux)
  const spokes = document.getElementById('ttp-spokes')
  if (spokes) {
    spokes.innerHTML = ''
    branches.forEach(function(br) {
      const p = BRANCH_POS[br.id]
      if (!p) return
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', '0')
      line.setAttribute('y1', '0')
      line.setAttribute('x2', String(p.dx * 0.85))
      line.setAttribute('y2', String(p.dy * 0.85))
      line.dataset.br = br.id
      spokes.appendChild(line)
    })
  }

  // Progress global
  let doneG = 0
  let totalG = 0
  branches.forEach(function(br) {
    const list = techs.filter(function(t) { return t.branch === br.id })
    totalG += list.length
    list.forEach(function(t) { if (techUnlocked(t.id)) doneG++ })
  })
  const gp = document.getElementById('ttp-global-progress')
  if (gp) gp.textContent = doneG + '/' + totalG

  // Une carte par branche
  branches.forEach(function(br) {
    const meta = BRANCH_META[br.id] || { ic: '•', pitch: '' }
    const pos = BRANCH_POS[br.id]
    if (!pos) return
    const list = techs.filter(function(t) { return t.branch === br.id })
    const done = list.filter(function(t) { return techUnlocked(t.id) })
    const pct = list.length ? Math.round((done.length / list.length) * 100) : 0

    const card = document.createElement('div')
    card.className = 'ttp-branch' + (active.size && !active.has(br.id) ? ' dimmed' : '')
    card.dataset.br = br.id
    card.style.left = '50%'
    card.style.top = '50%'
    card.style.marginLeft = pos.dx + 'px'
    card.style.marginTop = pos.dy + 'px'

    const chipsHtml = list.slice(0, 4).map(function(t) {
      const st = techStatus(t)
      const cls = st === 'done' ? 'ttp-done' : (st === 'ready' ? 'research' : '')
      return '<span class="chip ' + cls + '">' + escapeHTML(t.name) + '</span>'
    }).join('')

    card.innerHTML =
      '<div class="card">' +
      '  <div class="head"><div class="emblem">' + meta.ic + '</div><div><div class="nm">' + escapeHTML(br.name) + '</div></div></div>' +
      '  <div class="count"><b>' + done.length + '</b>/' + list.length + ' debloquees</div>' +
      '  <div class="bar"><i style="--p:' + pct + '%"></i></div>' +
      '  <div class="chips">' + chipsHtml + '</div>' +
      '</div>'

    card.addEventListener('click', function() { openBranch(br.id) })
    cst.appendChild(card)
  })
}

// ─── Vue detail branche ─────────────────────────────────────────────────────

function openBranch(brId) {
  currentBranch = brId
  root.classList.add('detail-mode')

  // Breadcrumb
  const data = TECH_TREE_DATA
  const br = (data && data.branches || []).find(function(b) { return b.id === brId })
  const name = (br && br.name) || brId
  const sep = document.getElementById('ttp-crumb-sep')
  const cur = document.getElementById('ttp-crumb-cur')
  if (sep) sep.style.display = 'inline'
  if (cur) { cur.style.display = 'inline'; cur.textContent = name }

  renderBranchDetail(brId)
  resetPan()
}

function closeBranch() {
  root.classList.remove('detail-mode')
  const sep = document.getElementById('ttp-crumb-sep')
  const cur = document.getElementById('ttp-crumb-cur')
  if (sep) sep.style.display = 'none'
  if (cur) cur.style.display = 'none'
  currentBranch = null
}

function renderBranchDetail(brId) {
  const canvas = document.getElementById('ttp-canvas')
  const wrap = document.getElementById('ttp-canvas-wrap')
  const links = document.getElementById('ttp-links')
  if (!canvas || !links || !wrap) return

  const data = TECH_TREE_DATA
  const branches = (data && data.branches) || []
  const ages = (data && data.ages) || []
  const techs = (data && data.techs) || []
  const br = branches.find(function(b) { return b.id === brId })
  if (!br) return
  const meta = BRANCH_META[brId] || { ic: '•', pitch: '' }
  wrap.style.setProperty('--vc', br.color || '#888')
  canvas.style.setProperty('--vc', br.color || '#888')

  // Reset contenu (garder header + svg)
  canvas.querySelectorAll('.ttp-tech').forEach(function(n) { n.remove() })
  canvas.querySelectorAll('.ttp-age-col').forEach(function(n) { n.remove() })
  links.innerHTML = ''

  // Header branche
  const header = document.getElementById('ttp-branch-header')
  if (header) {
    header.style.setProperty('--vc', br.color || '#888')
    header.innerHTML =
      '<div class="el">' +
      '  <div class="emblem">' + meta.ic + '</div>' +
      '  <div>' +
      '    <div class="br">Branche</div>' +
      '    <div class="nm">' + escapeHTML(br.name) + '</div>' +
      '  </div>' +
      '</div>' +
      '<div class="pitch">' + escapeHTML(meta.pitch) + '</div>'
  }

  // Colonnes d'age (Age I, Age II teaser)
  const curAge = state.currentAge || 1
  const visibleAges = ages.slice(0, Math.max(curAge + 1, 2)).slice(0, AGES_PER_VIEW * 4)
  // Afficher l'age courant + un teaser
  const ageCols = []
  ages.forEach(function(a, idx) {
    if (idx >= 2 && a.id > curAge + 1) return
    if (idx > 3) return
    ageCols.push(a)
  })

  ageCols.slice(0, 3).forEach(function(a, idx) {
    const teased = a.id > curAge
    const col = document.createElement('div')
    col.className = 'ttp-age-col' + (teased ? ' teased' : '')
    const x = PAD_X + idx * 5 * CELL_W - 40
    const w = 5 * CELL_W
    col.style.left = x + 'px'
    col.style.width = w + 'px'
    col.innerHTML =
      '<div class="ah"><b>' + (teased ? '?????' : escapeHTML(a.name || '')) + '</b>' +
      'Age ' + String(a.id).padStart(2, '0') + (teased ? ', teaser' : ', en cours') + '</div>'
    canvas.appendChild(col)
  })

  // Placer les techs de cette branche
  const branchTechs = techs.filter(function(t) { return t.branch === brId })
  const nodePos = {}

  // Regroupement par age pour deduire col/row stable
  const byAge = {}
  branchTechs.forEach(function(t) {
    const a = t.age || 1
    if (!byAge[a]) byAge[a] = []
    byAge[a].push(t)
  })

  Object.keys(byAge).forEach(function(ageKey) {
    const ageNum = Number(ageKey)
    const list = byAge[ageKey]
    const ageIdx = ageCols.findIndex(function(x) { return x.id === ageNum })
    if (ageIdx < 0) return
    list.forEach(function(t, i) {
      // Disposition grille 5 col x N rows
      const col = i % 3
      const row = Math.floor(i / 3)
      const cx = PAD_X + (ageIdx * 5 + col + 1) * CELL_W + CELL_W / 2 - CELL_W
      const cy = PAD_Y + 40 + row * CELL_H + CELL_H / 2
      const status = techStatus(t)
      const node = buildTechNode(t, status, {
        cost: techCost(t),
        onUnlock: unlockLocal,
        vc: br.color,
      })
      node.style.left = cx + 'px'
      node.style.top = cy + 'px'
      canvas.appendChild(node)
      nodePos[t.id] = { x: cx, y: cy, w: 200, h: 110 }
    })
  })

  // Liens SVG orthogonaux
  branchTechs.forEach(function(t) {
    const to = nodePos[t.id]
    if (!to) return
    const reqs = Array.isArray(t.requires) ? t.requires : []
    reqs.forEach(function(rid) {
      const src = byId(rid)
      if (!src) return
      if (src.branch !== brId) return
      const from = nodePos[rid]
      if (!from) return
      const x1 = from.x + from.w / 2 - 10
      const y1 = from.y
      const x2 = to.x - to.w / 2 + 10
      const y2 = to.y
      const midX = (x1 + x2) / 2
      const d = 'M ' + x1 + ' ' + y1 + ' L ' + midX + ' ' + y1 + ' L ' + midX + ' ' + y2 + ' L ' + x2 + ' ' + y2
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      const done = techUnlocked(t.id) && techUnlocked(rid)
      path.setAttribute('class', 'ttp-link-line' + (done ? ' done' : ''))
      links.appendChild(path)
    })
  })
}

function resetPan() {
  view.scale = 0.88
  view.tx = 240
  view.ty = 0
  applyTransform()
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function roman(n) {
  const map = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return map[n] || String(n)
}
function escapeHTML(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  })
}
