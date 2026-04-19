import {
  ORE_KEYS, ORE_TYPES, STOCK_KEYS, STOCK_LABELS,
  GENDER_SYMBOLS, CHIEF_STAR, CHIEF_COLOR
} from './constants.js'
import { state } from './state.js'
import { countActiveResearchers } from './placements.js'
import { unlockTech } from './tech.js'

// ============================================================================
// HUD : stocks, techs, colons, compteurs, FPS
// ============================================================================

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
const cCountEl = document.getElementById('c-count')
const colonsListEl = document.getElementById('colons-list')
const colonsHeaderEl = document.getElementById('colons-header')
const stocksLineEl = document.getElementById('stocks-line')
const rPointsEl = document.getElementById('r-points')
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
  stocksLineEl.textContent = 'Stocks: ' + (parts.length ? parts.join(', ') : 'vide')
}

export function refreshTechsPanel() {
  if (rPointsEl) rPointsEl.textContent = state.researchPoints
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
  if (rBerriesEl) rBerriesEl.textContent = state.resources.berries
  if (rWoodEl) rWoodEl.textContent = state.resources.wood
  if (rStoneEl) rStoneEl.textContent = state.resources.stone
  refreshStocksLine()
  refreshTechsPanel()
}

let lastColonsListSig = ''
export function updateColonsList() {
  if (!colonsListEl) return
  if (colonsListEl.classList.contains('hidden')) return
  let sig = ''
  for (const c of state.colonists) {
    const st = c.isWandering ? 'WANDER' : (c.state === 'RESEARCHING' ? 'RESEARCH' : c.state)
    sig += c.id + ':' + c.name + ':' + c.gender + ':' + (c.isChief ? 'C' : '') + ':' + st + '|'
  }
  if (sig === lastColonsListSig) return
  lastColonsListSig = sig
  const parts = []
  for (const c of state.colonists) {
    const st = c.isWandering ? 'WANDER' : (c.state === 'RESEARCHING' ? 'RESEARCH' : c.state)
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
  rBerriesEl, rWoodEl, rStoneEl, cBushesEl, rPointsEl
}
