import * as THREE from 'three'
import {
  GRID, MAX_STRATES, SHALLOW_WATER_LEVEL, STRATA_MAX, ORE_KEYS, ORE_TYPES
} from './constants.js'
import { state } from './state.js'
import { prng } from './rng.js'
import { scene, renderer, camera, controls } from './scene.js'
import { repaintCellSurface } from './terrain.js'
import {
  addTree, addRock, addOre, addHouse, addBush, addResearchHouse,
  assignResearcherToBuilding, removeTreesIn, removeRocksIn, removeHousesIn,
  removeResearchHousesIn, removeOresIn, removeBushesIn,
  isCellOccupied, isMineBlocked
} from './placements.js'
import { addJob, addBuildJob, removeAllJobsIn, removeJob, removeBuildJob, jobKey } from './jobs.js'
import { canMineCell } from './tech.js'
import { spawnColonsAroundHouse } from './colonist.js'
import { refreshHUD } from './hud.js'
import { resetWorld } from './worldgen.js'
import { saveGame, loadGame, hasSave, deleteSave } from './persistence.js'

// ============================================================================
// Curseur wireframe
// ============================================================================
const cursorGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02)
const cursorEdges = new THREE.EdgesGeometry(cursorGeo)
const cursorMatOk = new THREE.LineBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.9, depthTest: false })
const cursorMatBad = new THREE.LineBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.95, depthTest: false })
const cursorMesh = new THREE.LineSegments(cursorEdges, cursorMatOk)
cursorMesh.renderOrder = 999
cursorMesh.visible = false
scene.add(cursorMesh)

function setCursorAt(cell) {
  if (!cell) { cursorMesh.visible = false; return }
  if (state.toolState.tool === 'nav') { cursorMesh.visible = false; return }
  const top = state.cellTop[cell.z * GRID + cell.x]
  cursorMesh.position.set(cell.x + 0.5, top - 0.5, cell.z + 0.5)
  const ok = toolAllowedOnCell(state.toolState.tool, cell.x, cell.z)
  cursorMesh.material = ok ? cursorMatOk : cursorMatBad
  cursorMesh.visible = true
}

// ============================================================================
// Selection de strate (Shift+clic)
// ============================================================================
function computeStrata(x, z) {
  const out = []
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return out
  const startKey = z * GRID + x
  const refTop = state.cellTop[startKey]
  const refBiome = state.cellBiome[startKey]
  const seen = new Uint8Array(GRID * GRID)
  const queue = [startKey]
  seen[startKey] = 1
  while (queue.length && out.length < STRATA_MAX) {
    const k = queue.shift()
    const cx = k % GRID
    const cz = (k - cx) / GRID
    out.push({ x: cx, z: cz })
    const nbs = [[cx + 1, cz], [cx - 1, cz], [cx, cz + 1], [cx, cz - 1]]
    for (const [nx, nz] of nbs) {
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue
      const nk = nz * GRID + nx
      if (seen[nk]) continue
      if (state.cellTop[nk] !== refTop) continue
      if (state.cellBiome[nk] !== refBiome) continue
      seen[nk] = 1
      queue.push(nk)
    }
  }
  return out
}

const strataPreviewMeshes = []
const strataPreviewMat = new THREE.LineBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.75, depthTest: false })
let strataPreviewKey = null
let strataCachedCells = null

function clearStrataPreview() {
  for (const m of strataPreviewMeshes) m.visible = false
}

function ensureStrataMesh(i) {
  if (strataPreviewMeshes[i]) return strataPreviewMeshes[i]
  const m = new THREE.LineSegments(cursorEdges, strataPreviewMat)
  m.renderOrder = 998
  m.visible = false
  scene.add(m)
  strataPreviewMeshes[i] = m
  return m
}

function showStrataPreview(cell) {
  if (!cell) { clearStrataPreview(); strataPreviewKey = null; strataCachedCells = null; return }
  if (state.toolState.tool === 'nav') { clearStrataPreview(); strataPreviewKey = null; strataCachedCells = null; return }
  const key = cell.x + ',' + cell.z
  if (key !== strataPreviewKey) {
    strataPreviewKey = key
    strataCachedCells = computeStrata(cell.x, cell.z)
  }
  const cells = strataCachedCells
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]
    const top = state.cellTop[c.z * GRID + c.x]
    const m = ensureStrataMesh(i)
    m.position.set(c.x + 0.5, top - 0.5, c.z + 0.5)
    m.visible = true
  }
  for (let i = cells.length; i < strataPreviewMeshes.length; i++) {
    strataPreviewMeshes[i].visible = false
  }
}

// ============================================================================
// Outils
// ============================================================================
const toolBtns = document.querySelectorAll('.tool')
const brushBtns = document.querySelectorAll('.brush')
const hudToolEl = document.getElementById('hud-tool')
const oreSubEl = document.getElementById('ore-sub')

// init oreType dans toolState
state.toolState.oreType = ORE_KEYS[0]

export function labelOfTool(t) {
  if (t === 'ore') return 'filon (' + ORE_TYPES[state.toolState.oreType].label + ')'
  return ({
    nav: 'naviguer',
    mine: 'miner',
    build: 'placer',
    forest: 'foret',
    rock: 'rocher',
    house: 'maison',
    research: 'recherche',
    field: 'champ',
    bush: 'buisson baies',
    erase: 'effacer'
  })[t] || t
}

export function setTool(t) {
  if (t === 'ore' && state.toolState.tool === 'ore') {
    const i = ORE_KEYS.indexOf(state.toolState.oreType)
    state.toolState.oreType = ORE_KEYS[(i + 1) % ORE_KEYS.length]
  }
  state.toolState.tool = t
  toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === t))
  if (hudToolEl) hudToolEl.textContent = labelOfTool(t)
  if (oreSubEl) oreSubEl.textContent = ORE_TYPES[state.toolState.oreType].label
  const btnOre = document.querySelector('.tool[data-tool="ore"]')
  if (btnOre) btnOre.style.borderLeft = '4px solid #' + ORE_TYPES[state.toolState.oreType].rock.getHexString()
  controls.mouseButtons.LEFT = (t === 'nav') ? THREE.MOUSE.ROTATE : null
  if (t === 'nav') cursorMesh.visible = false
}

export function setBrush(b) {
  state.toolState.brush = b
  brushBtns.forEach(x => x.classList.toggle('active', parseInt(x.dataset.brush, 10) === b))
}

toolBtns.forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)))
brushBtns.forEach(b => b.addEventListener('click', () => setBrush(parseInt(b.dataset.brush, 10))))

const btnReset = document.getElementById('btn-reset')
if (btnReset) btnReset.addEventListener('click', () => {
  if (!confirm('Nouvelle partie ? La sauvegarde actuelle sera effacee.')) return
  deleteSave('auto')
  resetWorld(refreshHUD)
})

const btnSave = document.getElementById('btn-save')
if (btnSave) btnSave.addEventListener('click', () => {
  const ok = saveGame('auto')
  btnSave.textContent = ok ? 'Sauve!' : 'Echec'
  setTimeout(() => { btnSave.textContent = 'Sauver' }, 1200)
})

const btnLoad = document.getElementById('btn-load')
if (btnLoad) btnLoad.addEventListener('click', () => {
  if (!hasSave('auto')) {
    btnLoad.textContent = 'Aucune'
    setTimeout(() => { btnLoad.textContent = 'Charger' }, 1200)
    return
  }
  const ok = loadGame('auto')
  if (ok) refreshHUD()
  btnLoad.textContent = ok ? 'Charge!' : 'Echec'
  setTimeout(() => { btnLoad.textContent = 'Charger' }, 1200)
})

window.addEventListener('keydown', (e) => {
  const map = {
    '1': 'nav', '2': 'mine', '3': 'build',
    '4': 'forest', '5': 'rock',
    '6': 'ore', '7': 'house', '0': 'research', '8': 'field', '9': 'bush'
  }
  if (map[e.key]) setTool(map[e.key])
  if (e.key === 'r' || e.key === 'R') resetWorld(refreshHUD)
})

window.addEventListener('wheel', (e) => {
  if (state.toolState.tool === 'ore' && e.shiftKey) {
    e.preventDefault()
    const i = ORE_KEYS.indexOf(state.toolState.oreType)
    const dir = e.deltaY > 0 ? 1 : -1
    state.toolState.oreType = ORE_KEYS[(i + dir + ORE_KEYS.length) % ORE_KEYS.length]
    if (hudToolEl) hudToolEl.textContent = labelOfTool('ore')
    if (oreSubEl) oreSubEl.textContent = ORE_TYPES[state.toolState.oreType].label
    const btnOre = document.querySelector('.tool[data-tool="ore"]')
    if (btnOre) btnOre.style.borderLeft = '4px solid #' + ORE_TYPES[state.toolState.oreType].rock.getHexString()
  }
}, { passive: false })

// ============================================================================
// Raycasting et peinture
// ============================================================================
const raycaster = new THREE.Raycaster()
const mouseNDC = new THREE.Vector2()

function pickCell(clientX, clientY) {
  if (!state.instanced) return null
  const rect = renderer.domElement.getBoundingClientRect()
  mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
  mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouseNDC, camera)
  const hits = raycaster.intersectObject(state.instanced, false)
  if (!hits.length) return null
  const hit = hits[0]
  const p = hit.point.clone()
  if (hit.face) {
    const n = hit.face.normal
    p.x -= n.x * 0.01
    p.z -= n.z * 0.01
  }
  const x = Math.floor(p.x)
  const z = Math.floor(p.z)
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return null
  return { x, z }
}

function toolAllowedOnBiome(tool, biome) {
  if (tool === 'field' || tool === 'bush') {
    return biome === 'grass' || biome === 'forest'
  }
  if (tool === 'ore') {
    return biome === 'rock' || biome === 'snow'
  }
  if (tool === 'build') {
    return biome === 'grass' || biome === 'forest' || biome === 'sand' || biome === 'rock' || biome === 'snow'
  }
  return true
}

function toolAllowedOnCell(tool, x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return false
  const biome = state.cellBiome[z * GRID + x]
  if (!toolAllowedOnBiome(tool, biome)) return false
  if (tool === 'mine' && isMineBlocked(x, z)) return false
  if (tool === 'mine' && !canMineCell(x, z).ok) return false
  if (tool === 'build') {
    if (isCellOccupied(x, z)) return false
    if (state.cellTop[z * GRID + x] >= MAX_STRATES) return false
    if (state.cellTop[z * GRID + x] <= SHALLOW_WATER_LEVEL) return false
  }
  return true
}

function cellsInBrush(cx, cz, radius) {
  if (radius === 1) return [{ x: cx, z: cz }]
  const out = []
  const r = radius
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > r * r + 0.5) continue
      const x = cx + dx, z = cz + dz
      if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue
      out.push({ x, z })
    }
  }
  return out
}

function applyToolAtCell(cell) {
  const key = cell.z * GRID + cell.x
  const t = state.toolState.tool
  const rng = prng.rng

  if (t === 'mine') {
    const cells = cellsInBrush(cell.x, cell.z, state.toolState.brush)
    for (const c of cells) {
      if (isMineBlocked(c.x, c.z)) continue
      addJob(c.x, c.z)
    }
    return
  }
  if (t === 'build') {
    const cells = cellsInBrush(cell.x, cell.z, state.toolState.brush)
    for (const c of cells) {
      if (!toolAllowedOnCell('build', c.x, c.z)) continue
      addBuildJob(c.x, c.z)
    }
    return
  }
  if (state.toolState.paintedThisStroke.has(key)) return
  state.toolState.paintedThisStroke.add(key)

  switch (t) {
    case 'forest': {
      const cells = cellsInBrush(cell.x, cell.z, state.toolState.brush)
      for (const c of cells) {
        const k = c.z * GRID + c.x
        if (state.toolState.paintedThisStroke.has('f' + k)) continue
        state.toolState.paintedThisStroke.add('f' + k)
        if (rng() < 0.6 && !isCellOccupied(c.x, c.z)) addTree(c.x, c.z)
      }
      break
    }
    case 'rock':
      if (!isCellOccupied(cell.x, cell.z)) addRock(cell.x, cell.z)
      break
    case 'ore': {
      const cells = cellsInBrush(cell.x, cell.z, state.toolState.brush)
      for (const c of cells) {
        const k = c.z * GRID + c.x
        if (state.toolState.paintedThisStroke.has('o' + k)) continue
        state.toolState.paintedThisStroke.add('o' + k)
        if (isCellOccupied(c.x, c.z)) continue
        if (!toolAllowedOnCell('ore', c.x, c.z)) continue
        if (rng() < 0.7) addOre(c.x, c.z, state.toolState.oreType)
      }
      break
    }
    case 'house':
      if (!isCellOccupied(cell.x, cell.z)) {
        if (addHouse(cell.x, cell.z)) {
          state.gameStats.housesPlaced++
          spawnColonsAroundHouse(cell.x, cell.z, 2)
        }
      }
      break
    case 'research':
      if (!isCellOccupied(cell.x, cell.z)) {
        const entry = addResearchHouse(cell.x, cell.z)
        if (entry) assignResearcherToBuilding(entry)
      }
      break
    case 'bush':
      if (!isCellOccupied(cell.x, cell.z) && toolAllowedOnCell('bush', cell.x, cell.z)) addBush(cell.x, cell.z)
      break
    case 'field': {
      const cells = cellsInBrush(cell.x, cell.z, state.toolState.brush)
      for (const c of cells) {
        const k = c.z * GRID + c.x
        if (state.toolState.paintedThisStroke.has('h' + k)) continue
        state.toolState.paintedThisStroke.add('h' + k)
        if (!toolAllowedOnCell('field', c.x, c.z)) continue
        state.cellSurface[k] = 'field'
        repaintCellSurface(c.x, c.z)
      }
      break
    }
    case 'erase': {
      const cells = cellsInBrush(cell.x, cell.z, state.toolState.brush)
      removeTreesIn(cells)
      removeRocksIn(cells)
      removeHousesIn(cells)
      removeResearchHousesIn(cells)
      removeOresIn(cells)
      removeBushesIn(cells)
      removeAllJobsIn(cells)
      for (const c of cells) {
        const k = c.z * GRID + c.x
        if (state.cellSurface[k]) {
          state.cellSurface[k] = null
          repaintCellSurface(c.x, c.z)
        }
      }
      break
    }
  }
  refreshHUD()
}

function applyToolToStrata(cells) {
  const t = state.toolState.tool
  state.toolState.paintedThisStroke = new Set()
  if (t === 'mine') {
    for (const c of cells) {
      if (isMineBlocked(c.x, c.z)) continue
      addJob(c.x, c.z)
    }
    refreshHUD()
    return
  }
  if (t === 'build') {
    for (const c of cells) {
      if (!toolAllowedOnCell('build', c.x, c.z)) continue
      addBuildJob(c.x, c.z)
    }
    refreshHUD()
    return
  }
  if (t === 'erase') {
    removeTreesIn(cells)
    removeRocksIn(cells)
    removeHousesIn(cells)
    removeResearchHousesIn(cells)
    removeOresIn(cells)
    removeBushesIn(cells)
    removeAllJobsIn(cells)
    for (const c of cells) {
      const k = c.z * GRID + c.x
      if (state.cellSurface[k]) {
        state.cellSurface[k] = null
        repaintCellSurface(c.x, c.z)
      }
    }
    refreshHUD()
    return
  }
  for (const c of cells) {
    switch (t) {
      case 'forest':
        if (!isCellOccupied(c.x, c.z)) addTree(c.x, c.z)
        break
      case 'rock':
        if (!isCellOccupied(c.x, c.z)) addRock(c.x, c.z)
        break
      case 'ore':
        if (!isCellOccupied(c.x, c.z) && toolAllowedOnCell('ore', c.x, c.z)) addOre(c.x, c.z, state.toolState.oreType)
        break
      case 'house':
        if (!isCellOccupied(c.x, c.z)) {
          if (addHouse(c.x, c.z)) {
            state.gameStats.housesPlaced++
            spawnColonsAroundHouse(c.x, c.z, 2)
          }
        }
        break
      case 'research':
        if (!isCellOccupied(c.x, c.z)) {
          const entry = addResearchHouse(c.x, c.z)
          if (entry) assignResearcherToBuilding(entry)
        }
        break
      case 'bush':
        if (!isCellOccupied(c.x, c.z) && toolAllowedOnCell('bush', c.x, c.z)) addBush(c.x, c.z)
        break
      case 'field': {
        if (!toolAllowedOnCell('field', c.x, c.z)) break
        const k = c.z * GRID + c.x
        state.cellSurface[k] = 'field'
        repaintCellSurface(c.x, c.z)
        break
      }
    }
  }
  refreshHUD()
}

// ============================================================================
// Events pointeurs
// ============================================================================
const dom = renderer.domElement
dom.addEventListener('contextmenu', (e) => e.preventDefault())

let isShiftDown = false
window.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftDown = true })
window.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') { isShiftDown = false; clearStrataPreview(); strataPreviewKey = null; strataCachedCells = null }
})
window.addEventListener('blur', () => {
  isShiftDown = false; clearStrataPreview(); strataPreviewKey = null; strataCachedCells = null
})

dom.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return
  if (state.toolState.tool === 'nav') return
  const cell = pickCell(e.clientX, e.clientY)
  if (e.shiftKey && cell) {
    const cells = computeStrata(cell.x, cell.z)
    applyToolToStrata(cells)
    return
  }
  state.toolState.isPainting = true
  state.toolState.paintedThisStroke = new Set()
  if (cell) applyToolAtCell(cell)
})

dom.addEventListener('pointermove', (e) => {
  if (state.toolState.tool !== 'nav') {
    const hoverCell = pickCell(e.clientX, e.clientY)
    setCursorAt(hoverCell)
    if ((e.shiftKey || isShiftDown) && !state.toolState.isPainting) {
      showStrataPreview(hoverCell)
    } else {
      clearStrataPreview()
      strataPreviewKey = null
      strataCachedCells = null
    }
  } else {
    cursorMesh.visible = false
    clearStrataPreview()
  }
  if (!state.toolState.isPainting) return
  if (state.toolState.tool === 'nav') return
  if (state.toolState.tool === 'rock' || state.toolState.tool === 'house' || state.toolState.tool === 'research' || state.toolState.tool === 'bush') return
  const cell = pickCell(e.clientX, e.clientY)
  if (cell) applyToolAtCell(cell)
})

dom.addEventListener('pointerleave', () => { cursorMesh.visible = false; clearStrataPreview() })
window.addEventListener('pointerup', () => { state.toolState.isPainting = false })

// ---------------------------------------------------------------------------
// Clic droit bref : annulation de job
// ---------------------------------------------------------------------------
function cancelJobAt(x, z) {
  const k = jobKey(x, z)
  if (state.jobs.has(k)) {
    removeJob(x, z, false)
    refreshHUD()
    return true
  }
  if (state.buildJobs.has(k)) {
    removeBuildJob(x, z)
    refreshHUD()
    return true
  }
  return false
}

let rclickStart = null
dom.addEventListener('pointerdown', (e) => {
  if (e.button !== 2) return
  rclickStart = { x: e.clientX, y: e.clientY, t: performance.now() }
})
dom.addEventListener('pointerup', (e) => {
  if (e.button !== 2) return
  if (!rclickStart) return
  const dt = performance.now() - rclickStart.t
  const dx = e.clientX - rclickStart.x
  const dy = e.clientY - rclickStart.y
  const dist2 = dx * dx + dy * dy
  rclickStart = null
  if (dt > 200) return
  if (dist2 > 16) return
  const cell = pickCell(e.clientX, e.clientY)
  if (!cell) return
  cancelJobAt(cell.x, cell.z)
})

// ---------------------------------------------------------------------------
// Survol colon : affiche label
// ---------------------------------------------------------------------------
const hoverRaycaster = new THREE.Raycaster()
const hoverNDC = new THREE.Vector2()
let hoveredColonist = null

dom.addEventListener('pointermove', (e) => {
  const rect = dom.getBoundingClientRect()
  hoverNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  hoverNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  hoverRaycaster.setFromCamera(hoverNDC, camera)
  let best = null
  let bestDist = Infinity
  for (const c of state.colonists) {
    const hits = hoverRaycaster.intersectObject(c.group, true)
    for (const h of hits) {
      if (h.object.isSprite) continue
      if (h.distance < bestDist) { bestDist = h.distance; best = c }
    }
  }
  if (best !== hoveredColonist) {
    if (hoveredColonist) hoveredColonist.label.visible = false
    hoveredColonist = best
    if (hoveredColonist) hoveredColonist.label.visible = true
  }
})
dom.addEventListener('pointerleave', () => {
  if (hoveredColonist) { hoveredColonist.label.visible = false; hoveredColonist = null }
})
