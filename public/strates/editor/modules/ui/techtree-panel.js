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
import { queueTech, cancelResearch } from '../tech.js'
import { installResearchPopup } from './research-popup.js'

let root = null
let isOpen = false
let dirty = false
let currentBranch = null
let refreshTimer = null
let selectedTechId = null
const QUEUE_MAX = 5
let _viewedAge = 1
// Cache des positions des nœuds par tech id, alimente par renderBranchDetail.
// Utilise par centerOnViewedAge pour cadrer le viewport sur l'age en cours.
let _lastNodePos = {}

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
    '    <button class="ttp-btn-back" id="ttp-back">&#8592; Retour</button>',
    '    <div class="ttp-crumb">',
    '      <span id="ttp-crumb-age">Age I, Pierre</span>',
    '      <span class="sep" id="ttp-crumb-sep" style="display:none">/</span>',
    '      <span class="cur" id="ttp-crumb-cur" style="display:none"></span>',
    '    </div>',
    '    <div class="ttp-age-pill">Age en cours, <b id="ttp-age-name">Pierre</b></div>',
    '    <div class="ttp-res">',
    '      <span><b id="ttp-pts">0</b> pts recherche</span>',
    '    </div>',
    '    <button class="ttp-close" id="ttp-close" title="Fermer">&#10005;</button>',
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
    '      <aside class="ttp-fiche" id="ttp-fiche">',
    '      </aside>',
    '    </div>',
    '  </div>',

    // File de recherche (visible en mode global, masquee en mode detail)
    '  <div class="ttp-queue" id="ttp-queue">',
    '    <div class="qh">',
    '      <span class="hourglass">&#x29D6;</span>',
    '      <b>File</b>',
    '      <span class="cnt" id="ttp-qcnt">0/5</span>',
    '    </div>',
    '    <div class="qlist" id="ttp-qlist"></div>',
    '  </div>',

    // Filtres (bas gauche) - avant agerail comme dans la maquette
    '  <div class="ttp-filters-panel" id="ttp-filters">',
    '    <div class="title">Filtres branches</div>',
    '  </div>',

    // Age rail (bas)
    '  <div class="ttp-agerail" id="ttp-agerail"></div>',

    // Hint
    '  <div class="ttp-hint">Echap pour revenir, glisser pour panner, molette pour zoomer</div>',

    '</div>'
  ].join('')
  document.body.appendChild(root)

  root.querySelector('#ttp-close').addEventListener('click', closeTechTreePanel)
  root.querySelector('#ttp-back').addEventListener('click', function() {
    if (root.classList.contains('detail-mode')) closeBranch()
    else closeTechTreePanel()
  })

  bindSearch()
  bindPanZoom()
  bindResearchEvents()
  try { installResearchPopup() } catch (e) { /* ignore */ }
}

// ─── File de recherche : events + refresh periodique ────────────────────────

function bindResearchEvents() {
  window.addEventListener('strates:researchStarted', function() { refreshTechTree() })
  window.addEventListener('strates:queueChanged',    function() { refreshTechTree() })
  window.addEventListener('strates:techComplete',    function() {
    if (typeof refreshTechsPanel === 'function') refreshTechsPanel()
    refreshTechTree()
  })
}

// Refresh leger : redessine la constellation + la vue detail courante avec
// les etats a jour (progression active, queue). Appele par les events file
// et par un timer 2Hz tant que le panneau est ouvert et qu une recherche
// est en cours (pour animer la barre).
export function refreshTechTree() {
  if (!root) return
  renderTopbar()
  renderConstellation()
  if (root.classList.contains('detail-mode') && currentBranch) {
    renderBranchDetail(currentBranch)
    if (selectedTechId) {
      renderFiche(byId(selectedTechId))
      const card = root.querySelector('.ttp-tech[data-id="' + cssEscape(selectedTechId) + '"]')
      if (card) card.classList.add('selected')
    }
  }
  // La file de recherche est visible aussi en mode global (constellation),
  // il faut donc toujours la rafraichir pour que le clic sur la croix d une
  // bulle (cancelResearch puis dispatch queueChanged) repercute la mise a
  // jour dans le DOM.
  renderQueue()
}
if (typeof window !== 'undefined') {
  window.refreshTechTree = refreshTechTree
}

function startRefreshTimer() {
  if (refreshTimer) return
  refreshTimer = setInterval(function() {
    if (!isOpen || !state.activeResearch) return
    tickProgressOnly()
  }, 500)
}
function stopRefreshTimer() {
  if (!refreshTimer) return
  clearInterval(refreshTimer)
  refreshTimer = null
}

// Mise a jour chirurgicale de la barre de progression et des compteurs,
// sans reconstruire le DOM. Appelee par le timer 2Hz pendant la recherche.
function tickProgressOnly() {
  const ar = state.activeResearch
  if (!ar) return
  const data = TECH_TREE_DATA
  const techs = (data && data.techs) || []
  const activeTech = techs.find(function(t) { return t.id === ar.id })
  const cost = techCost(activeTech)
  const prog = ar.progress || 0

  // Compteur de points de recherche dans la topbar
  const pts = document.getElementById('ttp-pts')
  if (pts) pts.textContent = String(Math.floor(prog))

  // Barre de progression dans la card (vue detail)
  if (root) {
    const barI = root.querySelector('.ttp-tech.researching .ttp-tech-bar i')
    if (barI && cost > 0) {
      barI.style.width = Math.min(100, (prog / cost) * 100).toFixed(1) + '%'
    }

    // Arc de branche dans la constellation (--p CSS var)
    if (activeTech && activeTech.branch) {
      const branchTechs = techs.filter(function(t) {
        return t.branch === activeTech.branch && (t.age || 1) === _viewedAge
      })
      if (branchTechs.length) {
        const doneCount = branchTechs.filter(function(t) { return techUnlocked(t.id) }).length
        const c = techCost(activeTech) || 1
        const score = doneCount + Math.min(1, Math.max(0, prog / c))
        const pct = Math.round((score / branchTechs.length) * 100)
        const arcI = root.querySelector('.ttp-branch[data-br="' + cssEscape(activeTech.branch) + '"] .bar i')
        if (arcI) arcI.style.setProperty('--p', pct + '%')
      }
    }
  }
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
  _viewedAge = state.currentAge || 1
  root.classList.add('open')
  root.classList.remove('detail-mode')
  render()
  startRefreshTimer()
}
export function closeTechTreePanel() {
  if (!root) return
  isOpen = false
  root.classList.remove('open')
  root.classList.remove('detail-mode')
  currentBranch = null
  stopRefreshTimer()
  try { window.dispatchEvent(new CustomEvent('strates:techtreeClosed')) } catch (_) {}
}
export function toggleTechTreePanel() {
  if (!root) initTechTreePanel()
  if (!root) return
  if (isOpen) closeTechTreePanel()
  else openTechTreePanel()
}

// ─── Hook Lot D : refresh apres transition d'age ────────────────────────────

export function refreshTechTreeAfterAgeChange(age) {
  _viewedAge = state.currentAge || age || 1
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
function activeResearchId() {
  return state.activeResearch ? state.activeResearch.id : null
}
function activeResearchProgress() {
  return state.activeResearch ? (state.activeResearch.progress || 0) : 0
}
function researchQueue() {
  return Array.isArray(state.researchQueue) ? state.researchQueue : []
}
function queuePositionOf(id) {
  const q = researchQueue()
  const idx = q.indexOf(id)
  return idx < 0 ? 0 : (idx + 1)
}
function techStatus(tech) {
  const currentAge = state.currentAge || 1
  if ((tech.age || 1) > currentAge) return 'teased'
  if (techUnlocked(tech.id)) return 'done'
  if (activeResearchId() === tech.id) return 'researching'
  if (researchQueue().indexOf(tech.id) >= 0) return 'queued'
  const reqs = Array.isArray(tech.requires) ? tech.requires : []
  const reqsMet = reqs.every(function(r) { return techUnlocked(r) })
  if (!reqsMet) return 'locked'
  // Avec la file de recherche, le cout n est plus en points directs : toute
  // tech aux prerequis remplis est enfilable. On garde 'ready' quand les
  // points suffisent pour conserver le glow, sinon 'available'.
  return (state.researchPoints || 0) >= techCost(tech) ? 'ready' : 'available'
}
function byId(id) {
  const techs = (TECH_TREE_DATA && TECH_TREE_DATA.techs) || []
  for (let i = 0; i < techs.length; i++) if (techs[i].id === id) return techs[i]
  return null
}

// Enfile la tech dans la file de recherche (Lot B). Le deblocage effectif
// sera declenche par le tick moteur quand activeResearch.progress >= cost.
function queueLocal(techId) {
  const tech = byId(techId)
  if (!tech) return
  const st = techStatus(tech)
  if (st !== 'ready' && st !== 'available') return
  try { queueTech(techId) } catch (e) { console.error('queueTech failed', e) }
  // Le dispatch d evt 'strates:queueChanged' par tech.js relance le refresh,
  // mais on refait un rendu immediat pour la reactivite visuelle.
  refreshTechTree()
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
  // File de recherche visible egalement en mode global (constellation).
  renderQueue()
}

function renderTopbar() {
  const pts = document.getElementById('ttp-pts')
  if (pts) pts.textContent = String(state.researchPoints || 0)
  const data = TECH_TREE_DATA
  const ages = (data && data.ages) || []
  const curAge = _viewedAge
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
    d.className = 'dot' + (a.id === _viewedAge ? ' active' : (unlocked ? '' : ' locked'))
    d.title = 'Age ' + roman(a.id) + (a.name ? ', ' + a.name : '')
    d.textContent = roman(a.id)
    if (unlocked) {
      d.addEventListener('click', function() {
        _viewedAge = a.id
        render()
        // Si on est en vue detail, recentrer sur l'age fraichement selectionne.
        if (root && root.classList.contains('detail-mode')) {
          centerOnViewedAge()
        }
      })
    }
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
  const techs = (data.techs || []).filter(function(t) { return (t.age || 1) === _viewedAge })

  // Branches ayant au moins une tech a l'age courant
  const activeBranchIds = new Set()
  techs.forEach(function(t) { if (t.branch) activeBranchIds.add(t.branch) })

  // Spokes (rayons centraux)
  const spokes = document.getElementById('ttp-spokes')
  if (spokes) {
    spokes.innerHTML = ''
    branches.forEach(function(br) {
      if (!activeBranchIds.has(br.id)) return
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

  // Une carte par branche (seulement si elle a des techs a l'age courant)
  const activeId = activeResearchId()
  const activeProg = activeResearchProgress()
  branches.forEach(function(br) {
    if (!activeBranchIds.has(br.id)) return
    const meta = BRANCH_META[br.id] || { ic: '•', pitch: '' }
    const pos = BRANCH_POS[br.id]
    if (!pos) return
    const list = techs.filter(function(t) { return t.branch === br.id })
    const done = list.filter(function(t) { return techUnlocked(t.id) })
    // Progression visuelle : base = done / total, bonus si activeResearch
    // appartient a cette branche, on ajoute la progression partielle.
    let pct = 0
    if (list.length) {
      let score = done.length
      if (activeId) {
        const activeTech = list.find(function(t) { return t.id === activeId })
        if (activeTech) {
          const c = techCost(activeTech) || 1
          score += Math.min(1, Math.max(0, activeProg / c))
        }
      }
      pct = Math.round((score / list.length) * 100)
    }

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

  const backBtn = document.getElementById('ttp-back')
  if (backBtn) backBtn.innerHTML = '&#8592; Retour'

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
  centerOnViewedAge()

  // Selection automatique d'une tech interessante pour remplir la fiche
  const techs = (TECH_TREE_DATA && TECH_TREE_DATA.techs) || []
  const list = techs.filter(function(t) { return t.branch === brId && (t.age || 1) === _viewedAge })
  const first =
    list.find(function(t) { return activeResearchId() === t.id }) ||
    list.find(function(t) { return techStatus(t) === 'ready' || techStatus(t) === 'available' }) ||
    list[0]
  if (first) selectTech(first.id)
  else renderFiche(null)
  renderQueue()
}

export function closeBranch() {
  root.classList.remove('detail-mode')

  const backBtn = document.getElementById('ttp-back')
  if (backBtn) backBtn.innerHTML = 'Retour'

  const sep = document.getElementById('ttp-crumb-sep')
  const cur = document.getElementById('ttp-crumb-cur')
  if (sep) sep.style.display = 'none'
  if (cur) cur.style.display = 'none'
  currentBranch = null
  selectedTechId = null
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
  const viewAge = _viewedAge
  const visibleAges = ages.slice(0, Math.max(viewAge + 1, 2)).slice(0, AGES_PER_VIEW * 4)
  // Afficher l'age visionne + un teaser
  const ageCols = []
  ages.forEach(function(a, idx) {
    if (idx >= 2 && a.id > viewAge + 1) return
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
      // Stocks nocturnes insuffisants : on desactive le bouton "Mettre en file"
      // pour empecher l enfilage qui se bloquerait silencieusement a 100 %.
      const nCost = (t && t.cost && typeof t.cost === 'object') ? (t.cost.night || 0) : 0
      const nStock = state.nightPoints || 0
      const nightShort = nCost > 0 && nStock < nCost
      const node = buildTechNode(t, status, {
        cost: techCost(t),
        onQueue: queueLocal,
        activeProgress: status === 'researching' ? activeResearchProgress() : 0,
        queueIndex: status === 'queued' ? queuePositionOf(t.id) : 0,
        vc: br.color,
        disabled: nightShort,
        disabledTitle: nightShort
          ? ('Stocks insuffisants, il faut ' + nCost + ' pts nocturnes (vous avez ' + nStock + '). Passez en mode nuit avec un chercheur assigne a un promontoire pour en accumuler.')
          : '',
      })
      node.style.left = cx + 'px'
      node.style.top = cy + 'px'
      // Selection + highlight des prerequis au survol
      node.addEventListener('click', function(e) {
        if (e.target.closest('.ttp-tech-unlock')) return
        selectTech(t.id)
      })
      node.addEventListener('mouseenter', function() { highlightReqs(t.id) })
      node.addEventListener('mouseleave', clearReqHighlight)
      canvas.appendChild(node)
      nodePos[t.id] = { x: cx, y: cy, w: 200, h: 110 }
    })
  })

  // Liens SVG orthogonaux — les coords cx/cy sont le CENTRE du nœud (transform:-50%,-50%)
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
      // Choisir le bord de sortie/entrée selon la direction dominante
      const dx = to.x - from.x
      const dy = to.y - from.y
      let x1, y1, x2, y2, d
      if (Math.abs(dx) >= Math.abs(dy)) {
        // Connexion principalement horizontale : sortie droite, entrée gauche
        x1 = from.x + from.w / 2
        y1 = from.y
        x2 = to.x - to.w / 2
        y2 = to.y
        const midX = (x1 + x2) / 2
        d = 'M ' + x1 + ' ' + y1 + ' L ' + midX + ' ' + y1 + ' L ' + midX + ' ' + y2 + ' L ' + x2 + ' ' + y2
      } else {
        // Connexion principalement verticale : sortie bas, entrée haut
        x1 = from.x
        y1 = from.y + from.h / 2
        x2 = to.x
        y2 = to.y - to.h / 2
        const midY = (y1 + y2) / 2
        d = 'M ' + x1 + ' ' + y1 + ' L ' + x1 + ' ' + midY + ' L ' + x2 + ' ' + midY + ' L ' + x2 + ' ' + y2
      }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      const done = techUnlocked(t.id) && techUnlocked(rid)
      path.setAttribute('class', 'ttp-link-line' + (done ? ' done' : ''))
      path.dataset.to = t.id
      path.dataset.from = rid
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

// Centre le viewport sur les techs de la branche pour l'age courant (_viewedAge).
// Strategie : si plusieurs techs disponibles a cet age, on centre sur leur
// barycentre. Si toutes acquises ou aucune dispo, on centre sur la derniere
// acquise. Si rien du tout, on laisse le pan par defaut.
function centerOnViewedAge() {
  const wrap = root && root.querySelector('#ttp-canvas-wrap')
  const canvas = root && root.querySelector('#ttp-canvas')
  if (!wrap || !canvas || !currentBranch) return
  const positions = _lastNodePos || {}
  const ids = Object.keys(positions)
  if (!ids.length) return

  // Si le viewport n'est pas encore layoute (ouverture du panneau), reporter
  // d'une frame pour recuperer des dimensions reelles.
  if (wrap.getBoundingClientRect().width <= 0) {
    requestAnimationFrame(centerOnViewedAge)
    return
  }

  // Filtrer les techs de l'age vise
  const ageIds = ids.filter(function(id) {
    const t = byId(id)
    return t && (t.age || 1) === _viewedAge
  })

  let target = null
  if (ageIds.length) {
    // Priorite : techs non encore unlocked (les plus pertinentes a regarder).
    const pending = ageIds.filter(function(id) { return !techUnlocked(id) })
    const pickList = pending.length ? pending : ageIds
    let sx = 0, sy = 0
    pickList.forEach(function(id) {
      sx += positions[id].x
      sy += positions[id].y
    })
    target = { x: sx / pickList.length, y: sy / pickList.length }
  } else {
    // Aucun noeud a cet age : tomber sur la derniere tech acquise toutes ages.
    const unlocked = ids.filter(function(id) { return techUnlocked(id) })
    if (unlocked.length) {
      const last = unlocked[unlocked.length - 1]
      target = { x: positions[last].x, y: positions[last].y }
    }
  }

  if (!target) return

  const rect = wrap.getBoundingClientRect()
  const vw = rect.width
  const vh = rect.height
  // canvas.style.transform = translate(tx, ty) scale(s) avec origin top-left.
  // Pour qu'un point (target.x, target.y) du canvas atterrisse au centre du
  // viewport (vw/2, vh/2), on resout : tx + target.x * scale = vw/2.
  view.tx = vw / 2 - target.x * view.scale
  view.ty = vh / 2 - target.y * view.scale

  // Transition douce pour le centrage initial, retiree apres pour ne pas
  // freiner le pan manuel (pas d'inertie residuelle).
  canvas.style.transition = 'transform 320ms ease'
  applyTransform()
  setTimeout(function() {
    if (canvas) canvas.style.transition = ''
  }, 360)
}

// ─── Selection + fiche droite ────────────────────────────────────────────────

function selectTech(id) {
  selectedTechId = id
  const t = byId(id)
  if (!t) { renderFiche(null); return }
  // Si la tech est dans une autre branche, basculer
  if (t.branch && t.branch !== currentBranch) {
    currentBranch = t.branch
    const br = (TECH_TREE_DATA && TECH_TREE_DATA.branches || []).find(function(b) { return b.id === t.branch })
    const sep = document.getElementById('ttp-crumb-sep')
    const cur = document.getElementById('ttp-crumb-cur')
    if (sep) sep.style.display = 'inline'
    if (cur) { cur.style.display = 'inline'; cur.textContent = (br && br.name) || t.branch }
    renderBranchDetail(t.branch)
  }
  // Marquer la card selectionnee
  if (root) {
    root.querySelectorAll('.ttp-tech.selected').forEach(function(el) { el.classList.remove('selected') })
    const card = root.querySelector('.ttp-tech[data-id="' + cssEscape(id) + '"]')
    if (card) card.classList.add('selected')
  }
  renderFiche(t)
}

function renderFiche(tech) {
  const panel = document.getElementById('ttp-fiche')
  if (!panel) return

  if (!tech) {
    panel.classList.remove('has-tech')
    panel.innerHTML = ''
    return
  }

  const branches = (TECH_TREE_DATA && TECH_TREE_DATA.branches) || []
  const br = branches.find(function(b) { return b.id === tech.branch })
  const vc = (br && br.color) || '#888'

  const status = techStatus(tech)
  const cost = techCost(tech)
  const speech = Array.isArray(tech.speech) ? tech.speech[0] : (tech.speech || '')
  const desc = tech.description || ''

  // Prerequis
  const reqs = Array.isArray(tech.requires) ? tech.requires : []
  let reqsHtml = ''
  if (reqs.length) {
    reqsHtml = '<div class="ttp-fsec"><h5 style="margin:0 0 3px">Prerequis</h5><div class="ttp-req-grid">' +
      reqs.map(function(rid) {
        const r = byId(rid)
        const ok = techUnlocked(rid)
        const crossBranch = r && r.branch !== tech.branch
        const crossHtml = crossBranch
          ? '<span class="bn">&#x2197; ' + escapeHTML((branches.find(function(b) { return b.id === r.branch }) || {}).name || r.branch) + '</span>'
          : ''
        return '<div class="ttp-req-card ' + (ok ? 'ok' : 'ko') + '" data-req="' + escapeHTML(rid) + '">' +
               '<div class="chk">' + (ok ? '&#x2713;' : '&middot;') + '</div>' +
               '<div class="tn">' + escapeHTML(r ? r.name : rid) + '</div>' +
               crossHtml +
               '</div>'
      }).join('') +
      '</div></div>'
  }

  // Debloque
  const unlocks = tech.unlocks || {}
  const unlockItems = []
  if (Array.isArray(unlocks.jobs)) unlocks.jobs.forEach(function(j) { unlockItems.push({ kind: 'Metier', label: j }) })
  if (Array.isArray(unlocks.buildings)) unlocks.buildings.forEach(function(b) { unlockItems.push({ kind: 'Batiment', label: b }) })
  if (Array.isArray(unlocks.resources)) unlocks.resources.forEach(function(r) { unlockItems.push({ kind: 'Ressource', label: r }) })
  if (Array.isArray(unlocks.tools)) unlocks.tools.forEach(function(r) { unlockItems.push({ kind: 'Outil', label: r }) })
  if (Array.isArray(unlocks.features)) unlocks.features.forEach(function(f) { unlockItems.push({ kind: 'Fonctionnalite', label: f }) })
  let unlocksHtml = ''
  if (unlockItems.length) {
    unlocksHtml = '<div class="ttp-fsec"><h5 style="margin:0 0 3px">Debloque</h5><div class="ttp-unlock-list">' +
      unlockItems.map(function(u) {
        return '<div class="u"><span class="dot">&#x25B8;</span><span>' +
               escapeHTML(u.kind) + ' <b>' + escapeHTML(u.label) + '</b></span></div>'
      }).join('') +
      '</div></div>'
  }

  const actionHtml = renderFicheAction(tech, status, cost)

  panel.style.setProperty('--vc', vc)
  panel.innerHTML =
    '<div class="ttp-fiche-left">' +
    '  <span class="ic" id="ttp-fiche-ic">' + escapeHTML(tech.icon || '-') + '</span>' +
    '  <div>' +
    '    <h3 id="ttp-fiche-name">' + escapeHTML(tech.name || tech.id) + '</h3>' +
    '    <div class="br" id="ttp-fiche-branch" style="color:' + vc + '">' + escapeHTML((br && br.name) || tech.branch || '') + '</div>' +
    '  </div>' +
    '</div>' +
    '<div class="ttp-fiche-body" id="ttp-fiche-body">' +
    '  <div style="font-family:var(--ttp-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ttp-ink-3);margin-bottom:1px">Cout</div>' +
    '  <div style="font-size:13px;color:var(--ttp-ink)">&#x2605; <b>' + cost + '</b> pts recherche' +
    (((tech.cost && typeof tech.cost === 'object' && tech.cost.night) || 0) > 0
      ? ' &middot; &#127769; <b>' + tech.cost.night + '</b> pts nocturnes' +
        (((state.nightPoints || 0) < tech.cost.night)
          ? ' <span style="color:#c66" title="Stocks de points nocturnes insuffisants. Passez en mode nuit avec un chercheur assigne a un promontoire pour en accumuler.">(stock ' + (state.nightPoints || 0) + ')</span>'
          : ' <span style="color:var(--ttp-ink-3)">(stock ' + (state.nightPoints || 0) + ')</span>')
      : '') +
    '</div>' +
    (desc ? '<div style="font-size:12px;color:var(--ttp-ink-2);margin-top:2px;line-height:1.35">' + escapeHTML(desc) + '</div>' : '') +
    (speech ? '<div style="font-size:11px;color:var(--ttp-ink-3);font-style:italic;margin-top:1px;line-height:1.3">' + escapeHTML(speech) + '</div>' : '') +
    '</div>' +
    '<div class="ttp-fiche-meta" id="ttp-fiche-meta">' + reqsHtml + unlocksHtml + '</div>' +
    '<div class="ttp-fiche-actions" id="ttp-fiche-actions">' + actionHtml + '</div>'

  panel.classList.add('has-tech')

  const bq = panel.querySelector('[data-act="queue"]')
  const bu = panel.querySelector('[data-act="unqueue"]')
  const bc = panel.querySelector('[data-act="chain"]')
  if (bq) bq.addEventListener('click', function() { queueLocal(tech.id) })
  if (bu) bu.addEventListener('click', function() { try { cancelResearch(tech.id) } catch (e) {} refreshTechTree() })
  if (bc) bc.addEventListener('click', function() { enqueueChain(tech.id); refreshTechTree() })

  panel.querySelectorAll('.ttp-req-card').forEach(function(el) {
    el.addEventListener('click', function() { selectTech(el.dataset.req) })
  })
}

function renderFicheAction(tech, status, cost) {
  if (status === 'done') {
    return '<button class="ttp-fiche-btn done-btn" disabled>&#x2713; Debloque</button>'
  }
  if (status === 'researching') {
    return '<button class="ttp-fiche-btn" data-act="unqueue">Annuler la recherche</button>'
  }
  if (status === 'queued') {
    return '<button class="ttp-fiche-btn ghost" data-act="unqueue">- Retirer de la file</button>'
  }
  if (status === 'teased') {
    return '<button class="ttp-fiche-btn" disabled>Age a venir</button>'
  }
  if (status === 'ready' || status === 'available') {
    const queueFull = (researchQueue().length + (activeResearchId() ? 1 : 0)) >= QUEUE_MAX
    if (queueFull) return '<button class="ttp-fiche-btn" disabled>File pleine</button>'
    // Tech a cout night > 0 : autorisee de jour comme de nuit, MAIS uniquement
    // si le joueur a deja accumule assez de points nocturnes. Sans ce garde-fou,
    // la recherche progressait jusqu a 100 % puis se bloquait silencieusement
    // (cf. queueTech dans tech.js, fix faim de stock nocturne).
    const nightCost = (tech && tech.cost && typeof tech.cost === 'object') ? (tech.cost.night || 0) : 0
    let label = '+ Ajouter a la file &middot; ' + cost + ' &#x2605;'
    if (nightCost > 0) {
      label = '+ Ajouter a la file &middot; ' + cost + ' &#x2605; + ' + nightCost + ' &#127769;'
    }
    const nightStock = state.nightPoints || 0
    if (nightCost > 0 && nightStock < nightCost) {
      const tip = 'Stocks insuffisants, il faut ' + nightCost + ' pts nocturnes (vous avez ' + nightStock + '). Passez en mode nuit avec un chercheur assigne a un promontoire pour en accumuler.'
      return '<button class="ttp-fiche-btn" disabled title="' + tip + '">' + label + '</button>'
    }
    return '<button class="ttp-fiche-btn" data-act="queue">' + label + '</button>'
  }
  // locked
  return '<button class="ttp-fiche-btn" data-act="chain">&#x2933; Mettre le chemin en file</button>' +
         '<button class="ttp-fiche-btn ghost" disabled>Prerequis manquants</button>'
}

// ─── Highlight des prerequis au survol ──────────────────────────────────────

function highlightReqs(techId) {
  const t = byId(techId)
  if (!t) return
  const status = techStatus(t)
  // Ne declencher que pour locked / available / ready (techs non encore debloquees)
  if (status === 'done' || status === 'teased') return
  const reqs = Array.isArray(t.requires) ? t.requires : []
  const missing = reqs.filter(function(r) { return !techUnlocked(r) })
  if (reqs.length === 0) return
  if (!root) return
  root.querySelectorAll('.ttp-tech').forEach(function(el) {
    const id = el.dataset.id
    if (!id) return
    if (id === techId) {
      el.classList.add('highlight')
      return
    }
    if (missing.indexOf(id) >= 0 || (reqs.indexOf(id) >= 0 && techUnlocked(id))) {
      el.classList.add('req-highlight', 'highlight')
    } else {
      el.classList.add('faded')
    }
  })
  root.querySelectorAll('#ttp-links path').forEach(function(p) {
    if (p.dataset.to === techId && reqs.indexOf(p.dataset.from) >= 0) {
      p.classList.add('req-hi')
    } else {
      p.style.opacity = '0.1'
    }
  })
}

function clearReqHighlight() {
  if (!root) return
  root.querySelectorAll('.ttp-tech').forEach(function(el) {
    el.classList.remove('req-highlight', 'faded', 'highlight')
  })
  root.querySelectorAll('#ttp-links path').forEach(function(p) {
    p.classList.remove('req-hi')
    p.style.opacity = ''
  })
}

// ─── File de recherche (rail bas-droite) ────────────────────────────────────

function renderQueue() {
  const list = document.getElementById('ttp-qlist')
  const cnt = document.getElementById('ttp-qcnt')
  if (!list || !cnt) return
  const active = state.activeResearch
  const q = researchQueue()
  // "File" = active en tete (si presente) puis queue
  const items = []
  if (active) items.push({ id: active.id, isCurrent: true })
  q.forEach(function(id) { items.push({ id: id, isCurrent: false }) })

  cnt.textContent = items.length + '/' + QUEUE_MAX
  list.innerHTML = ''
  if (items.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'qempty'
    empty.textContent = 'Aucune technologie en file'
    list.appendChild(empty)
  } else {
    items.forEach(function(it) {
      const t = byId(it.id)
      if (!t) return
      const cost = techCost(t) || 1
      const slot = document.createElement('div')
      slot.className = 'qslot' + (it.isCurrent ? ' current' : '')
      slot.dataset.id = t.id
      let ringHtml = ''
      if (it.isCurrent) {
        const prog = activeResearchProgress()
        const pct = Math.min(1, Math.max(0, prog / cost))
        const C = 2 * Math.PI * 30
        const off = C * (1 - pct)
        ringHtml =
          '<div class="ring">' +
          '  <svg viewBox="0 0 64 64">' +
          '    <circle class="bg" cx="32" cy="32" r="30" fill="none"/>' +
          '    <circle class="fg" cx="32" cy="32" r="30" fill="none" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"/>' +
          '  </svg>' +
          '</div>'
      }
      slot.innerHTML =
        ringHtml +
        '<span class="ic">' + escapeHTML(t.icon || '') + '</span>' +
        '<div class="cost-pill">' + cost + '&#x2605;</div>' +
        '<button class="x" title="Retirer">&times;</button>' +
        '<div class="tip">' + escapeHTML(t.name) + (it.isCurrent ? ' (en cours)' : '') + '</div>'
      slot.addEventListener('click', function(e) {
        if (e.target.closest('.x')) return
        selectTech(t.id)
      })
      const xbtn = slot.querySelector('.x')
      if (xbtn) {
        xbtn.addEventListener('click', function(e) {
          e.stopPropagation()
          try { cancelResearch(t.id) } catch (err) {}
          refreshTechTree()
        })
      }
      list.appendChild(slot)
    })
  }
  // Placeholders +
  const remaining = Math.max(0, QUEUE_MAX - items.length)
  for (let i = 0; i < remaining; i++) {
    const add = document.createElement('div')
    add.className = 'qadd'
    add.textContent = '+'
    list.appendChild(add)
  }
}

// Calcule la chaine de prerequis non debloques en ordre topologique, puis
// tente d'en enfiler autant que possible jusqu'a atteindre la tech cible.
function enqueueChain(id) {
  const chain = []
  const visited = new Set()
  function visit(tid) {
    if (visited.has(tid)) return
    visited.add(tid)
    const t = byId(tid)
    if (!t) return
    if (techUnlocked(tid)) return
    const reqs = Array.isArray(t.requires) ? t.requires : []
    reqs.forEach(function(r) { visit(r) })
    chain.push(tid)
  }
  visit(id)
  // Filtrer ce qui n'est ni deja actif ni deja en file
  const activeId = activeResearchId()
  const q = researchQueue()
  chain.forEach(function(tid) {
    if (tid === activeId) return
    if (q.indexOf(tid) >= 0) return
    const curLen = researchQueue().length + (activeResearchId() ? 1 : 0)
    if (curLen >= QUEUE_MAX) return
    try { queueTech(tid) } catch (e) {}
  })
}

function cssEscape(s) {
  return String(s == null ? '' : s).replace(/["\\]/g, '\\$&')
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
