// ============================================================================
// Tooltip de cellule : suit le curseur en mode hover et affiche les infos
// (biome, altitude, contenu) de la cellule survolee.
// API : showCellTooltip(gx, gz, screenX, screenY), hideCellTooltip()
// ============================================================================

import { state } from '../state.js'
import { GRID, ORE_TYPES } from '../constants.js'

const CSS = `
.cell-tooltip {
  position: fixed;
  top: 0; left: 0;
  background: rgba(27,25,20,0.92);
  border: 1px solid rgba(212,184,112,0.3);
  border-radius: 6px;
  padding: 6px 10px;
  font-family: monospace;
  font-size: 11px;
  color: #e8d9b5;
  z-index: 200;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease-out;
  white-space: nowrap;
  line-height: 1.45;
}
.cell-tooltip--visible { opacity: 1; }
.cell-tooltip-row { display: block; }
.cell-tooltip-row + .cell-tooltip-row { margin-top: 1px; }
.cell-tooltip-key {
  color: rgba(212,184,112,0.7);
  margin-right: 4px;
}
.cell-tooltip-icon { display: inline-block; margin-right: 3px; }
@keyframes cell-info-pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
#btn-cell-info.actif {
  background: rgba(212,184,112,0.25);
  box-shadow: 0 0 6px rgba(212,184,112,0.4);
}
#btn-cell-info.pulse {
  animation: cell-info-pulse 0.15s ease-out;
}
`

const BIOME_INFO = {
  grass:  { icon: '🌿', name: 'Prairie' },
  forest: { icon: '🌲', name: 'Forêt' },
  sand:   { icon: '🏖', name: 'Plage' },
  rock:   { icon: '⛰', name: 'Roche' },
  snow:   { icon: '❄', name: 'Neige' },
  water:  { icon: '💧', name: 'Eau' }
}

const BUILDING_NAMES = {
  house:       'Cabane',
  manor:       'Manoir',
  foyer:       'Foyer',
  research:    'Hutte du Sage',
  field:       'Champ',
  observatory: 'Promontoire',
  cairn:       'Cairn',
  'big-house': 'Grande Maison'
}

let tipEl = null
let _enabled = false

export function isCellTooltipEnabled() { return _enabled }

export function initCellTooltip() {
  const btn = document.getElementById('btn-cell-info')
  if (!btn) return
  btn.addEventListener('click', function() {
    _enabled = !_enabled
    btn.classList.toggle('actif', _enabled)
    btn.classList.add('pulse')
    btn.addEventListener('animationend', function() { btn.classList.remove('pulse') }, { once: true })
    if (!_enabled) hideCellTooltip()
  })
}

function ensureDom() {
  if (tipEl) return
  if (!document.getElementById('cell-tooltip-style')) {
    const s = document.createElement('style')
    s.id = 'cell-tooltip-style'
    s.textContent = CSS
    document.head.appendChild(s)
  }
  tipEl = document.createElement('div')
  tipEl.className = 'cell-tooltip'
  tipEl.setAttribute('role', 'tooltip')
  document.body.appendChild(tipEl)
}

function findBuildingAtCell(gx, gz) {
  for (const h of (state.houses || []))         if (h.x === gx && h.z === gz) return { type: 'house' }
  for (const f of (state.foyers || []))         if (f.x === gx && f.z === gz) return { type: 'foyer' }
  for (const r of (state.researchHouses || [])) if (r.x === gx && r.z === gz) return { type: 'research' }
  for (const m of (state.manors || []))         if (m.x === gx && m.z === gz) return { type: 'manor' }
  for (const b of (state.bigHouses || []))      if (gx >= b.x && gx < b.x + 4 && gz >= b.z && gz < b.z + 4) return { type: 'big-house' }
  for (const o of (state.observatories || []))  if (o.x === gx && o.z === gz) return { type: 'observatory' }
  for (const c of (state.cairns || []))         if (c.x === gx && c.z === gz) return { type: 'cairn' }
  if (state.cellSurface && state.cellSurface[gz * GRID + gx] === 'field') return { type: 'field' }
  return null
}

function describeContent(gx, gz) {
  const ore = (state.ores || []).find(o => o.x === gx && o.z === gz)
  if (ore) {
    const meta = ORE_TYPES[ore.type]
    const label = meta ? meta.label : ore.type
    return '⛏ Filon (' + label + ')'
  }
  if ((state.trees || []).some(t => t.x === gx && t.z === gz)) return '🌳 Arbre'
  if ((state.bushes || []).some(b => b.x === gx && b.z === gz)) return '🫐 Buisson'
  if ((state.rocks || []).some(r => r.x === gx && r.z === gz)) return '🪨 Rocher'
  const b = findBuildingAtCell(gx, gz)
  if (b) return '🏠 ' + (BUILDING_NAMES[b.type] || b.type)
  return null
}

export function showCellTooltip(gx, gz, screenX, screenY) {
  if (!_enabled) return
  ensureDom()
  if (gx < 0 || gz < 0 || gx >= GRID || gz >= GRID) {
    hideCellTooltip()
    return
  }
  const k = gz * GRID + gx
  const biomeKey = state.cellBiome ? state.cellBiome[k] : null
  const biome = BIOME_INFO[biomeKey] || { icon: '?', name: biomeKey || 'Inconnu' }
  const altitude = state.cellTop ? state.cellTop[k] : 0
  const content = describeContent(gx, gz)

  const rows = []
  rows.push(
    '<span class="cell-tooltip-row">' +
      '<span class="cell-tooltip-icon">' + biome.icon + '</span>' +
      biome.name +
    '</span>'
  )
  rows.push(
    '<span class="cell-tooltip-row">' +
      '<span class="cell-tooltip-key">Alt.</span>' + altitude +
    '</span>'
  )
  if (content) {
    rows.push('<span class="cell-tooltip-row">' + content + '</span>')
  }
  tipEl.innerHTML = rows.join('')

  // Positionnement avec decalage curseur, clamp dans la fenetre
  const off = 14
  let x = screenX + off
  let y = screenY + off
  // Mesure apres injection
  const rect = tipEl.getBoundingClientRect()
  const w = rect.width  || 120
  const h = rect.height || 40
  if (x + w > window.innerWidth - 4)  x = screenX - off - w
  if (y + h > window.innerHeight - 4) y = screenY - off - h
  tipEl.style.transform = 'translate(' + Math.max(2, x) + 'px,' + Math.max(2, y) + 'px)'
  tipEl.classList.add('cell-tooltip--visible')
}

export function hideCellTooltip() {
  if (!tipEl) return
  tipEl.classList.remove('cell-tooltip--visible')
}
