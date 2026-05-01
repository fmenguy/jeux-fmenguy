import {
  ORE_KEYS, ORE_TYPES, STOCK_KEYS, STOCK_LABELS,
  GENDER_SYMBOLS, CHIEF_STAR, CHIEF_COLOR,
  GRID, WATER_LEVEL, SHALLOW_WATER_LEVEL
} from './constants.js'
import { state } from './state.js'
import { totalBuildStock } from './stocks.js'
import { countActiveResearchers } from './placements.js'
import { unlockTech } from './tech.js'
import { BUILDINGS_DATA, TECH_TREE_DATA } from './gamedata.js'

// ============================================================================
// HUD : stocks, techs, colons, compteurs, FPS
// ============================================================================

export function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return Math.floor(n).toString()
}

// Valeurs affichées interpolées (lerp) pour les ressources à mise à jour fréquente
const _disp = { berries: 0, wood: 0, stone: 0, pts: 0 }

const fpsEl = document.getElementById('fps')
const jobsEl = document.getElementById('jobs')
const idleEl = document.getElementById('idle')
const movingEl = document.getElementById('moving')
const workingEl = document.getElementById('working')
const talkingEl = document.getElementById('talking')
const cTreesEl = document.getElementById('c-trees')
const cRocksEl = document.getElementById('c-rocks')
const cHousesEl = document.getElementById('c-houses')
const cFieldsEl = document.getElementById('c-fields')
const cOresEl = document.getElementById('c-ores')
const cOresDetailEl = document.getElementById('c-ores-detail')
const cBushesEl = document.getElementById('c-bushes')
const cResearchEl = document.getElementById('c-research')
const cResearchersEl = document.getElementById('c-researchers')
const rBerriesEl = document.getElementById('r-berries')
const rWoodEl = document.getElementById('r-wood')
const rStoneEl = document.getElementById('r-stone')
const rBlocsEl = document.getElementById('r-blocs')
const cCountEl = document.getElementById('c-count')
const colonsListEl = document.getElementById('colons-list')
const colonsHeaderEl = document.getElementById('colons-header')
const stocksLineEl = document.getElementById('stocks-line')
const rPointsEl = document.getElementById('r-points')
const rNightPointsEl = document.getElementById('r-nightpoints')
const techsBodyEl = document.getElementById('techs-body')

if (colonsHeaderEl) {
  colonsHeaderEl.addEventListener('click', () => {
    colonsHeaderEl.classList.toggle('collapsed')
    colonsListEl.classList.toggle('hidden')
  })
}

export function refreshStocksLine() {
  if (!stocksLineEl) return
  const parts = []
  for (const k of STOCK_KEYS) {
    if (state.stocks[k] > 0) parts.push(STOCK_LABELS[k] + ' ' + state.stocks[k])
  }
  stocksLineEl.textContent = 'Stocks : ' + (parts.length ? parts.join(', ') : 'vide')
}

export function refreshTechsPanel() {
  if (rPointsEl) rPointsEl.textContent = formatNum(state.researchPoints)
  if (!techsBodyEl) return
  const order = ['pick-stone', 'pick-bronze', 'pick-iron', 'pick-gold']
  const parts = ['<div class="tech-tree">']
  for (let i = 0; i < order.length; i++) {
    const id = order[i]
    const t = state.techs[id]
    const reqOk = !t.req || state.techs[t.req].unlocked
    const canAfford = state.researchPoints >= t.cost
    let st = 'locked'
    if (t.unlocked) st = 'done'
    else if (reqOk && canAfford) st = 'ready'
    else if (reqOk) st = 'available'
    if (i > 0) {
      const prevDone = state.techs[order[i - 1]].unlocked
      parts.push('<div class="tech-link ' + (prevDone ? 'active' : '') + '"></div>')
    }
    const progPct = t.unlocked ? 100 : Math.min(100, Math.round((state.researchPoints / t.cost) * 100))
    let right
    if (t.unlocked) {
      right = '<span class="tdone">OK</span>'
    } else if (st === 'ready') {
      right = '<button data-tech="' + id + '">' + t.cost + ' pts</button>'
    } else if (st === 'available') {
      right = '<span class="tcost">' + t.cost + ' pts</span>'
    } else {
      right = '<span class="tcost" style="opacity:0.6">verrou</span>'
    }
    parts.push(
      '<div class="tech-node ' + st + '" id="tech-' + id + '">' +
        '<div class="tech-icon" style="background:' + t.tint + '">' + t.icon + '</div>' +
        '<div class="tech-info">' +
          '<div class="tname">' + t.name + '</div>' +
          '<div class="tage">Age ' + t.age + '</div>' +
          (t.unlocked ? '' : '<div class="tech-prog"><div class="tech-prog-fill" style="width:' + progPct + '%"></div></div>') +
        '</div>' +
        '<div class="tech-action">' + right + '</div>' +
      '</div>'
    )
  }
  parts.push('</div>')
  techsBodyEl.innerHTML = parts.join('')
  techsBodyEl.querySelectorAll('button[data-tech]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-tech')
      unlockTech(id, refreshTechsPanel)
    })
  })
}

export function refreshHUD() {
  if (cTreesEl) cTreesEl.textContent = state.trees.length
  if (cRocksEl) cRocksEl.textContent = state.rocks.length
  if (cHousesEl) cHousesEl.textContent = state.houses.length
  let f = 0
  if (state.cellSurface) {
    for (let i = 0; i < state.cellSurface.length; i++) if (state.cellSurface[i] === 'field') f++
  }
  if (cFieldsEl) cFieldsEl.textContent = f
  if (cOresEl) cOresEl.textContent = state.ores.length
  const counts = {}
  for (const k of ORE_KEYS) counts[k] = 0
  for (const o of state.ores) counts[o.type]++
  if (cOresDetailEl) cOresDetailEl.textContent = ORE_KEYS.map(k => ORE_TYPES[k].label + ' ' + counts[k]).join(', ')
  if (cBushesEl) cBushesEl.textContent = state.bushes.length
  if (cResearchEl) cResearchEl.textContent = state.researchHouses.length
  if (cResearchersEl) cResearchersEl.textContent = countActiveResearchers()
  // Snap les valeurs interpolées pour éviter une animation depuis 0 (ex: chargement)
  _disp.berries = state.resources.berries
  _disp.wood    = state.resources.wood
  _disp.stone   = state.resources.stone
  _disp.pts     = state.activeResearch ? state.activeResearch.progress : 0
  if (rBerriesEl) rBerriesEl.textContent = formatNum(state.resources.berries)
  if (rWoodEl)    rWoodEl.textContent    = formatNum(state.resources.wood)
  if (rStoneEl)   rStoneEl.textContent   = formatNum(state.resources.stone)
  if (rBlocsEl)   rBlocsEl.textContent   = formatNum(totalBuildStock())
  if (rNightPointsEl) rNightPointsEl.textContent = formatNum(state.nightPoints)
  refreshStocksLine()
  refreshTechsPanel()
  refreshUniqueBuildingsPalette()
}

// Appelé chaque frame : lerp vers les vraies valeurs, formatNum, mise à jour DOM.
export function tickResourceAnim() {
  const LERP = 0.08
  _disp.berries += (state.resources.berries - _disp.berries) * LERP
  _disp.wood    += (state.resources.wood    - _disp.wood)    * LERP
  _disp.stone   += (state.resources.stone   - _disp.stone)   * LERP

  if (rBerriesEl) rBerriesEl.textContent = formatNum(_disp.berries)
  if (rWoodEl)    rWoodEl.textContent    = formatNum(_disp.wood)
  if (rStoneEl)   rStoneEl.textContent   = formatNum(_disp.stone)
  if (rBlocsEl)   rBlocsEl.textContent   = formatNum((state.stocks.stone || 0) + (state.stocks.dirt || 0))
  if (cBushesEl)  cBushesEl.textContent  = state.bushes.length

  if (rPointsEl) {
    if (state.activeResearch) {
      const ae = TECH_TREE_DATA && Array.isArray(TECH_TREE_DATA.techs)
        ? TECH_TREE_DATA.techs.find(x => x.id === state.activeResearch.id)
        : null
      const cost = ae ? ((ae.cost && ae.cost.research) || 0) : 0
      _disp.pts += (state.activeResearch.progress - _disp.pts) * LERP
      rPointsEl.textContent = formatNum(_disp.pts) + ' / ' + formatNum(cost)
    } else {
      _disp.pts = 0
      rPointsEl.textContent = '0'
    }
  }
}

// ----------------------------------------------------------------------------
// U7, palette batiments uniques.
//
// Certains batiments ont "unique": true dans buildings.json (Hutte du sage,
// Cairn de pierre). Quand une instance existe deja sur la carte, la vignette
// correspondante dans l'actionbar recoit la classe .disabled-unique pour etre
// grisee visuellement (opacite, curseur not-allowed, pas de hover). La logique
// moteur (empecher la pose reelle) est geree par sub-agent engine en parallele.
// ----------------------------------------------------------------------------

// Mapping data-tool -> id de batiment dans buildings.json.
// Seuls les outils correspondant a un batiment unique sont utiles ici, mais
// on garde la table ouverte pour extensions futures.
const TOOL_TO_BUILDING_ID = {
  research: 'hutte-du-sage',
  cairn:    'cairn-pierre'
}

// Mapping id de batiment -> fonction qui dit si une instance existe dans state.
// On lit les tableaux dedies existants (researchHouses, cairns, etc.) sans
// introduire un state.buildings generique.
const INSTANCE_CHECKS = {
  'hutte-du-sage': () => Array.isArray(state.researchHouses) && state.researchHouses.length > 0,
  'cairn-pierre':  () => Array.isArray(state.cairns) && state.cairns.length > 0
}

function buildingIsUnique(id) {
  if (!BUILDINGS_DATA || !Array.isArray(BUILDINGS_DATA.buildings)) return false
  const b = BUILDINGS_DATA.buildings.find(x => x.id === id)
  return !!(b && b.unique === true)
}

export function refreshUniqueBuildingsPalette() {
  const btns = document.querySelectorAll('#actionbar .tool[data-tool]')
  btns.forEach(btn => {
    const tool = btn.dataset.tool
    const buildingId = TOOL_TO_BUILDING_ID[tool]
    if (!buildingId) return
    if (!buildingIsUnique(buildingId)) {
      btn.classList.remove('disabled-unique')
      return
    }
    const checker = INSTANCE_CHECKS[buildingId]
    const exists = typeof checker === 'function' ? checker() : false
    btn.classList.toggle('disabled-unique', exists)
  })
}

function stateLabel(c) {
  if (c.isWandering) return 'flâne'
  switch (c.state) {
    case 'IDLE': return 'repos'
    case 'MOVING': return 'marche'
    case 'WORKING': return 'travaille'
    case 'RESEARCHING': return 'recherche'
    default: return c.state
  }
}

let lastColonsListSig = ''
export function updateColonsList() {
  if (!colonsListEl) return
  if (colonsListEl.classList.contains('hidden')) return
  let sig = ''
  for (const c of state.colonists) {
    const st = stateLabel(c)
    sig += c.id + ':' + c.name + ':' + c.gender + ':' + (c.isChief ? 'C' : '') + ':' + st + '|'
  }
  if (sig === lastColonsListSig) return
  lastColonsListSig = sig
  const parts = []
  for (const c of state.colonists) {
    const st = stateLabel(c)
    const sym = GENDER_SYMBOLS[c.gender]
    const chiefMark = c.isChief
      ? '<span class="cchief" style="color:' + CHIEF_COLOR + ';margin-right:4px;">' + CHIEF_STAR + '</span>'
      : ''
    parts.push(
      '<div class="clist-row">' +
        '<span class="cname">' + chiefMark + c.name +
          '<span class="csym ' + c.gender + '">' + sym + '</span>' +
        '</span>' +
        '<span class="cstate">' + st + '</span>' +
      '</div>'
    )
  }
  colonsListEl.innerHTML = parts.join('')
}

export function updateDynHUD() {
  let nIdle = 0, nMov = 0, nWork = 0, nTalk = 0
  for (const c of state.colonists) {
    if (c.state === 'IDLE') nIdle++
    else if (c.state === 'MOVING') nMov++
    else if (c.state === 'WORKING') nWork++
    if (c.speechTimer > 0) nTalk++
  }
  if (jobsEl) jobsEl.textContent = state.jobs.size
  if (idleEl) idleEl.textContent = nIdle
  if (movingEl) movingEl.textContent = nMov
  if (workingEl) workingEl.textContent = nWork
  if (talkingEl) talkingEl.textContent = nTalk
  if (cCountEl) cCountEl.textContent = state.colonists.length
  if (cResearchEl) cResearchEl.textContent = state.researchHouses.length
  if (cResearchersEl) cResearchersEl.textContent = countActiveResearchers()
  updateColonsList()
}

let fpsFrames = 0
let fpsLast = performance.now()
export function tickFps() {
  fpsFrames++
  const now = performance.now()
  if (now - fpsLast >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - fpsLast))
    if (fpsEl) fpsEl.textContent = fps
    fpsFrames = 0; fpsLast = now
  }
}

// referentiels pour tick()
export const hudRefs = {
  rBerriesEl, rWoodEl, rStoneEl, rBlocsEl, cBushesEl, rPointsEl, rNightPointsEl
}

// ============================================================================
// Mini-map
// ============================================================================

const BIOME_RGBA = {
  grass:  [124, 192, 106],
  forest: [ 63, 122,  58],
  snow:   [228, 236, 240],
  sand:   [232, 207, 142],
  rock:   [168, 161, 150],
}
const DEEP_WATER   = [74,  143, 212]
const SHAL_WATER   = [130, 185, 220]
const FIELD_RGBA   = [217, 183,  85]

const minimapEl = document.getElementById('minimap')

export function updateMinimap() {
  if (!minimapEl || !state.cellBiome || !state.cellTop) return
  const ctx = minimapEl.getContext('2d')
  const W = minimapEl.width   // 96
  const H = minimapEl.height  // 96
  const imgData = ctx.createImageData(W, H)
  const d = imgData.data

  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const ci = z * GRID + x
      const pi = (z * W + x) * 4
      const top = state.cellTop[ci]
      let rgb
      if (top <= WATER_LEVEL) {
        rgb = DEEP_WATER
      } else if (top <= SHALLOW_WATER_LEVEL) {
        rgb = SHAL_WATER
      } else {
        const surf = state.cellSurface ? state.cellSurface[ci] : null
        if (surf === 'field') {
          rgb = FIELD_RGBA
        } else {
          rgb = BIOME_RGBA[state.cellBiome[ci]] || BIOME_RGBA.grass
        }
      }
      d[pi] = rgb[0]; d[pi+1] = rgb[1]; d[pi+2] = rgb[2]; d[pi+3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)

  // Batiments
  ctx.fillStyle = 'rgba(60,35,10,0.85)'
  for (const h of state.houses) {
    ctx.fillRect(h.x - 1, h.z - 1, 2, 2)
  }
  ctx.fillStyle = 'rgba(40,20,5,0.9)'
  for (const m of state.manors) {
    ctx.fillRect(m.x, m.z, 3, 3)
  }

  // Colons
  for (const c of state.colonists) {
    ctx.fillStyle = c.gender === 'M' ? '#4a7fc0' : '#d06b8e'
    ctx.fillRect(Math.round(c.x) - 1, Math.round(c.z) - 1, 2, 2)
  }
}
