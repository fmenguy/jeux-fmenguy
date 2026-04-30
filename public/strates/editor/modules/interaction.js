import * as THREE from 'three'
import {
  GRID, MAX_STRATES, SHALLOW_WATER_LEVEL, STRATA_MAX, ORE_KEYS, ORE_TYPES
} from './constants.js'
import { state } from './state.js'
import { prng } from './rng.js'
import { scene, renderer, camera, controls, tmpObj, tmpColor } from './scene.js'
import { repaintCellSurface, colorForLayer } from './terrain.js'
import {
  addTree, addRock, addOre, addHouse, addFoyer, addBush, addResearchHouse,
  assignResearcherToBuilding, removeTreesIn, removeRocksIn, removeHousesIn,
  removeResearchHousesIn, removeOresIn, removeBushesIn, removeManorsIn,
  checkManorMerge, isCellOccupied, isMineBlocked,
  addObservatory, removeObservatoriesIn,
  isBuildingUniqueAndPlaced
} from './placements.js'
import { addJob, removeAllJobsIn, removeJob, removeBuildJob, jobKey } from './jobs.js'
import { canMineCell, techUnlocked, hasTreeAt } from './tech.js'
import { spawnColonsAroundHouse } from './colonist.js'
import { refreshHUD } from './hud.js'
import { resetWorld } from './worldgen.js'
import { saveGame, loadGame, hasSave, deleteSave, listSlots } from './persistence.js'
import { openCharSheet, isCharSheetOpen } from './charsheet-ui.js'
import { totalBuildStock, consumeBuildStock } from './stocks.js'
import { showHudToast } from './ui/research-popup.js'

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

// ============================================================================
// Rectangle de sélection CSS
// ============================================================================
const selRectEl = document.createElement('div')
selRectEl.id = 'sel-rect'
selRectEl.style.cssText = 'position:fixed;border:1.5px solid rgba(255,255,255,0.85);background:rgba(180,210,255,0.12);pointer-events:none;display:none;z-index:50;'
document.body.appendChild(selRectEl)

const selectionRect = { active: false, startX: 0, startZ: 0, endX: 0, endZ: 0, screenX0: 0, screenY0: 0 }
const RECT_SELECT_TOOLS = new Set(['mine', 'hache', 'pick'])

function cellsInRect(x1, z1, x2, z2) {
  const sx = Math.min(x1, x2), ex = Math.max(x1, x2)
  const sz = Math.min(z1, z2), ez = Math.max(z1, z2)
  const out = []
  for (let z = sz; z <= ez; z++) {
    for (let x = sx; x <= ex; x++) {
      if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue
      out.push({ x, z })
    }
  }
  return out
}

function updateSelRectCSS(sx, sy, ex, ey) {
  selRectEl.style.left   = Math.min(sx, ex) + 'px'
  selRectEl.style.top    = Math.min(sy, ey) + 'px'
  selRectEl.style.width  = Math.abs(ex - sx) + 'px'
  selRectEl.style.height = Math.abs(ey - sy) + 'px'
  selRectEl.style.display = ''
}

function applyToolToZone(cells, tool) {
  let toastShown = false
  for (const c of cells) {
    if (!toolAllowedOnCell(tool, c.x, c.z)) {
      const check = canMineCell(c.x, c.z)
      if (check.reason === 'tech' && check.requiredTech) {
        state.lastBlockedMineTech = { x: c.x, z: c.z, tech: check.requiredTech, t: performance.now() / 1000 }
        if (!toastShown) { toastShown = true; showHudToast('Il vous faut une meilleure technique pour extraire ça.', 2500) }
      }
      continue
    }
    addJob(c.x, c.z)
  }
  refreshHUD()
}

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

export function refreshToolButtons() {
  const btnHache = document.querySelector('.tool[data-tool="hache"]')
  const btnPick = document.querySelector('.tool[data-tool="pick"]')
  if (btnHache) btnHache.style.display = techUnlocked('axe-stone') ? '' : 'none'
  if (btnPick) btnPick.style.display = techUnlocked('pick-stone') ? '' : 'none'
  const btnResearch = document.querySelector('.tool[data-tool="place-research"]')
  if (btnResearch) {
    btnResearch.style.display = techUnlocked('basic-research') ? '' : 'none'
    btnResearch.classList.toggle('locked', state.researchHouses.length > 0)
  }
  const btnFoyer = document.querySelector('.tool[data-tool="place-foyer"]')
  if (btnFoyer) {
    btnFoyer.style.display = techUnlocked('fire-mastery') ? '' : 'none'
    btnFoyer.classList.toggle('locked', state.foyers.length > 0)
  }
}

export function labelOfTool(t) {
  if (t === 'ore') return 'filon (' + ORE_TYPES[state.toolState.oreType].label + ')'
  return ({
    nav: 'naviguer',
    mine: 'récolter ressources',
    hache: 'hache (abattre arbres)',
    pick: 'pioche (extraire minerais)',
    build: 'placer un bloc',
    forest: 'planter une forêt',
    rock: 'poser un rocher',
    house: 'poser une maison',
    research: 'poser un laboratoire',
    'place-research': 'placer hutte du sage',
    'place-foyer': 'placer un foyer',
    field: 'tracer un champ',
    bush: 'poser un buisson',
    observatory: 'poser un promontoire',
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
window.addEventListener('strates:brushSize', e => setBrush(e.detail.size))

const btnReset = document.getElementById('btn-reset')
if (btnReset) btnReset.addEventListener('click', () => {
  if (!confirm('Nouvelle partie ? La sauvegarde actuelle sera effacee.')) return
  deleteSave('auto')
  resetWorld(refreshHUD)
})

function openSaveMenu() {
  renderSaveSlots()
  const m = document.getElementById('save-menu')
  if (m) m.classList.remove('hidden')
}
function closeSaveMenu() {
  const m = document.getElementById('save-menu')
  if (m) m.classList.add('hidden')
}

function formatTs(ts) {
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function renderSaveSlots() {
  const container = document.getElementById('save-slots')
  const autoC = document.getElementById('save-auto')
  if (!container || !autoC) return
  container.innerHTML = ''
  const slots = listSlots()
  for (const slot of slots) {
    const row = document.createElement('div')
    row.className = 'save-row' + (slot.meta ? '' : ' empty')
    const label = document.createElement('div')
    label.className = 'slot-label'
    label.textContent = '#' + slot.index
    row.appendChild(label)
    const info = document.createElement('div')
    info.className = 'slot-info'
    if (slot.corrupted) info.textContent = 'corrompu'
    else if (slot.meta) info.textContent = formatTs(slot.meta.savedAt) + '  ·  ' + slot.meta.colonists + ' colons  ·  cycle ' + (slot.meta.cyclesDone || 0)
    else info.innerHTML = '<em>emplacement libre</em>'
    row.appendChild(info)
    const bSave = document.createElement('button')
    bSave.className = 'btn-save'
    bSave.textContent = slot.meta ? 'Ecraser' : 'Sauver'
    bSave.addEventListener('click', () => { saveGame(slot.index); renderSaveSlots() })
    row.appendChild(bSave)
    const bLoad = document.createElement('button')
    bLoad.className = 'btn-load'
    bLoad.textContent = 'Charger'
    bLoad.disabled = !slot.meta
    bLoad.addEventListener('click', () => {
      if (loadGame(slot.index)) { refreshHUD(); closeSaveMenu() }
    })
    row.appendChild(bLoad)
    const bDel = document.createElement('button')
    bDel.className = 'btn-del'
    bDel.textContent = '×'
    bDel.disabled = !slot.meta
    bDel.addEventListener('click', () => { if (confirm('Supprimer l emplacement ' + slot.index + ' ?')) { deleteSave(slot.index); renderSaveSlots() } })
    row.appendChild(bDel)
    container.appendChild(row)
  }
  // slot auto en bas
  autoC.innerHTML = ''
  const autoRow = document.createElement('div')
  autoRow.className = 'save-row auto' + (hasSave('auto') ? '' : ' empty')
  const aLabel = document.createElement('div')
  aLabel.className = 'slot-label'
  aLabel.textContent = 'Auto'
  autoRow.appendChild(aLabel)
  const aInfo = document.createElement('div')
  aInfo.className = 'slot-info'
  aInfo.textContent = hasSave('auto') ? 'derniere sauvegarde auto (toutes les 30 s)' : 'pas encore de sauvegarde auto'
  autoRow.appendChild(aInfo)
  const aLoad = document.createElement('button')
  aLoad.className = 'btn-load'
  aLoad.textContent = 'Charger'
  aLoad.disabled = !hasSave('auto')
  aLoad.addEventListener('click', () => { if (loadGame('auto')) { refreshHUD(); closeSaveMenu() } })
  autoRow.appendChild(aLoad)
  autoC.appendChild(autoRow)
}

const btnSave = document.getElementById('btn-save')
if (btnSave) btnSave.addEventListener('click', openSaveMenu)
const btnLoad = document.getElementById('btn-load')
if (btnLoad) btnLoad.addEventListener('click', openSaveMenu)
const btnSaveClose = document.getElementById('save-menu-close')
if (btnSaveClose) btnSaveClose.addEventListener('click', closeSaveMenu)

// Menu pause
function openPauseMenu() {
  const pm = document.getElementById('pause-menu')
  if (!pm) return
  const hint = document.getElementById('pause-save-hint')
  if (hint) {
    try {
      const raw = localStorage.getItem('strates-save-auto')
      if (raw) {
        const d = new Date(JSON.parse(raw).savedAt)
        hint.textContent = 'auto-save ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }
    } catch(e) {}
  }
  pm.classList.remove('hidden')
}
function closePauseMenu() {
  const pm = document.getElementById('pause-menu')
  if (pm) pm.classList.add('hidden')
}
const btnPauseResume = document.getElementById('pause-resume')
if (btnPauseResume) btnPauseResume.addEventListener('click', closePauseMenu)
const btnPauseSaves = document.getElementById('pause-saves')
if (btnPauseSaves) btnPauseSaves.addEventListener('click', () => { closePauseMenu(); openSaveMenu() })
const pauseMenu = document.getElementById('pause-menu')
if (pauseMenu) pauseMenu.addEventListener('click', (e) => { if (e.target === pauseMenu) closePauseMenu() })

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Ne pas ouvrir le menu pause si un panneau plein ecran est deja ouvert.
    // Les panneaux concernes (tech tree XXL, fiche colon, overlay d'aide)
    // gerent eux-memes la fermeture sur Echap, via leurs propres listeners.
    const ttp = document.getElementById('ttp-root')
    if (ttp && ttp.classList.contains('open')) return
    const cs = document.getElementById('char-panel')
    if (cs && cs.classList.contains('open')) return
    const ho = document.getElementById('help-overlay')
    if (ho && ho.classList.contains('open')) return
    const pp = document.getElementById('popPanel')
    if (pp && pp.classList.contains('open')) {
      pp.classList.remove('open')
      document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('active'))
      e.stopPropagation(); e.preventDefault(); return
    }

    const sm = document.getElementById('save-menu')
    const pm = document.getElementById('pause-menu')
    if (sm && !sm.classList.contains('hidden')) { closeSaveMenu(); return }
    if (pm && !pm.classList.contains('hidden')) { closePauseMenu(); return }
    openPauseMenu()
  }
})

window.addEventListener('keydown', (e) => {
  const map = {
    'p': 'observatory', 'P': 'observatory',
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
  if (tool === 'hache') {
    if (!hasTreeAt(x, z)) return false
    if (!canMineCell(x, z).ok) return false
  }
  if (tool === 'pick') {
    if (biome !== 'rock' && biome !== 'snow') return false
    if (isMineBlocked(x, z)) return false
    if (!canMineCell(x, z).ok) return false
  }
  if (tool === 'build') {
    if (isCellOccupied(x, z)) return false
    if (state.cellTop[z * GRID + x] >= MAX_STRATES) return false
    if (state.cellTop[z * GRID + x] <= SHALLOW_WATER_LEVEL) return false
  }
  return true
}

function cellsInBrush(cx, cz, brush) {
  const r = Math.floor(brush / 2)
  if (r === 0) return [{ x: cx, z: cz }]
  const out = []
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, z = cz + dz
      if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue
      out.push({ x, z })
    }
  }
  return out
}

function buildAtCell(x, z) {
  if (totalBuildStock() <= 0) return false
  if (isCellOccupied(x, z)) return false
  const k = z * GRID + x
  const top = state.cellTop[k]
  if (top >= MAX_STRATES) return false
  if (top <= SHALLOW_WATER_LEVEL) return false
  if (!consumeBuildStock()) return false
  const biome = state.cellBiome[k]
  const newY = top
  const slot = state.nextFreeVoxelIdx++
  tmpObj.position.set(x + 0.5, newY + 0.5, z + 0.5)
  tmpObj.rotation.set(0, 0, 0)
  tmpObj.scale.set(1, 1, 1)
  tmpObj.updateMatrix()
  state.instanced.setMatrixAt(slot, tmpObj.matrix)
  const colTop = colorForLayer(biome, newY, newY + 1)
  tmpColor.copy(colTop)
  state.instanced.setColorAt(slot, tmpColor)
  state.origColor[slot] = tmpColor.clone()
  const oldTopIdx = state.instanceIndex[z * GRID + x][top - 1]
  if (oldTopIdx != null) {
    const under = colorForLayer(biome, top - 1, newY + 1)
    tmpColor.copy(under)
    state.instanced.setColorAt(oldTopIdx, tmpColor)
    state.origColor[oldTopIdx] = tmpColor.clone()
  }
  state.instanceIndex[z * GRID + x][newY] = slot
  state.cellTop[k] = newY + 1
  state.instanced.instanceMatrix.needsUpdate = true
  if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
  return true
}

function applyToolAtCell(cell) {
  const key = cell.z * GRID + cell.x
  const t = state.toolState.tool
  const rng = prng.rng

  if (t === 'mine' || t === 'hache' || t === 'pick') {
    const cells = cellsInBrush(cell.x, cell.z, state.toolState.brush)
    for (const c of cells) {
      if (!toolAllowedOnCell(t, c.x, c.z)) {
        const check = canMineCell(c.x, c.z)
        if (check.reason === 'tech' && check.requiredTech) {
          state.lastBlockedMineTech = { x: c.x, z: c.z, tech: check.requiredTech, t: performance.now() / 1000 }
          if (!state.toolState.paintedThisStroke.has('blocked-tech-toast')) {
            state.toolState.paintedThisStroke.add('blocked-tech-toast')
            showHudToast('Il vous faut une meilleure technique pour extraire ça.', 2500)
          }
        }
        continue
      }
      addJob(c.x, c.z)
    }
    return
  }
  if (t === 'build') {
    const cells = cellsInBrush(cell.x, cell.z, state.toolState.brush)
    for (const c of cells) {
      if (!toolAllowedOnCell('build', c.x, c.z)) continue
      buildAtCell(c.x, c.z)
    }
    refreshHUD()
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
        if (rng() < 0.6 && !isCellOccupied(c.x, c.z)) addTree(c.x, c.z, { growing: true })
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
          const manor = checkManorMerge(cell.x, cell.z)
          if (manor) spawnColonsAroundHouse(manor.x + 1, manor.z + 1, 2)
        }
      }
      break
    case 'research':
      if (isBuildingUniqueAndPlaced('hutte-du-sage')) break
      if (!isCellOccupied(cell.x, cell.z)) {
        const entry = addResearchHouse(cell.x, cell.z)
        if (entry) assignResearcherToBuilding(entry)
      }
      break
    case 'place-research': {
      if (!techUnlocked('basic-research')) break
      if (isBuildingUniqueAndPlaced('hutte-du-sage')) break
      const prk = cell.z * GRID + cell.x
      if (state.toolState.paintedThisStroke.has('pr' + prk)) break
      state.toolState.paintedThisStroke.add('pr' + prk)
      if (!isCellOccupied(cell.x, cell.z)) {
        const entry = addResearchHouse(cell.x, cell.z)
        if (entry) assignResearcherToBuilding(entry)
      }
      break
    }
    case 'place-foyer': {
      if (!techUnlocked('fire-mastery')) break
      if (state.foyers.length > 0) break
      const pfk = cell.z * GRID + cell.x
      if (state.toolState.paintedThisStroke.has('pf' + pfk)) break
      state.toolState.paintedThisStroke.add('pf' + pfk)
      if (!isCellOccupied(cell.x, cell.z)) addFoyer(cell.x, cell.z)
      break
    }
    case 'bush':
      if (!isCellOccupied(cell.x, cell.z) && toolAllowedOnCell('bush', cell.x, cell.z)) addBush(cell.x, cell.z)
      break
    case 'observatory':
      if (!isCellOccupied(cell.x, cell.z)) addObservatory(cell.x, cell.z)
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
      removeManorsIn(cells)
      removeResearchHousesIn(cells)
      removeOresIn(cells)
      removeBushesIn(cells)
      removeObservatoriesIn(cells)
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
      const check = canMineCell(c.x, c.z)
      if (!check.ok) {
        if (check.reason === 'tech' && check.requiredTech) {
          state.lastBlockedMineTech = { x: c.x, z: c.z, tech: check.requiredTech, t: performance.now() / 1000 }
        }
        continue
      }
      addJob(c.x, c.z)
    }
    refreshHUD()
    return
  }
  if (t === 'build') {
    for (const c of cells) {
      if (!toolAllowedOnCell('build', c.x, c.z)) continue
      buildAtCell(c.x, c.z)
    }
    refreshHUD()
    return
  }
  if (t === 'erase') {
    removeTreesIn(cells)
    removeRocksIn(cells)
    removeHousesIn(cells)
    removeManorsIn(cells)
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
        if (!isCellOccupied(c.x, c.z)) addTree(c.x, c.z, { growing: true })
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
            const manor = checkManorMerge(c.x, c.z)
            if (manor) spawnColonsAroundHouse(manor.x + 1, manor.z + 1, 2)
          }
        }
        break
      case 'research':
        if (isBuildingUniqueAndPlaced('hutte-du-sage')) break
        if (!isCellOccupied(c.x, c.z)) {
          const entry = addResearchHouse(c.x, c.z)
          if (entry) assignResearcherToBuilding(entry)
        }
        break
      case 'place-research': {
        if (!techUnlocked('basic-research')) break
        if (isBuildingUniqueAndPlaced('hutte-du-sage')) break
        const prk2 = c.z * GRID + c.x
        if (state.toolState.paintedThisStroke.has('pr' + prk2)) break
        state.toolState.paintedThisStroke.add('pr' + prk2)
        if (!isCellOccupied(c.x, c.z)) {
          const entry = addResearchHouse(c.x, c.z)
          if (entry) assignResearcherToBuilding(entry)
        }
        break
      }
      case 'place-foyer': {
        if (!techUnlocked('fire-mastery')) break
        if (state.foyers.length > 0) break
        const pfk2 = c.z * GRID + c.x
        if (state.toolState.paintedThisStroke.has('pf' + pfk2)) break
        state.toolState.paintedThisStroke.add('pf' + pfk2)
        if (!isCellOccupied(c.x, c.z)) addFoyer(c.x, c.z)
        break
      }
      case 'bush':
        if (!isCellOccupied(c.x, c.z) && toolAllowedOnCell('bush', c.x, c.z)) addBush(c.x, c.z)
        break
      case 'observatory':
        if (!isCellOccupied(c.x, c.z)) addObservatory(c.x, c.z)
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

function pickColonist(clientX, clientY) {
  const rect = dom.getBoundingClientRect()
  hoverNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
  hoverNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
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
  return best
}

let lclickStart = null
dom.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return
  lclickStart = { x: e.clientX, y: e.clientY, t: performance.now() }
  if (state.toolState.tool === 'nav') return
  if (isCharSheetOpen()) return
  const cell = pickCell(e.clientX, e.clientY)
  if (e.shiftKey && cell) {
    const cells = computeStrata(cell.x, cell.z)
    applyToolToStrata(cells)
    return
  }
  if (RECT_SELECT_TOOLS.has(state.toolState.tool) && cell) {
    selectionRect.active = true
    selectionRect.startX = cell.x
    selectionRect.startZ = cell.z
    selectionRect.endX = cell.x
    selectionRect.endZ = cell.z
    selectionRect.screenX0 = e.clientX
    selectionRect.screenY0 = e.clientY
    updateSelRectCSS(e.clientX, e.clientY, e.clientX, e.clientY)
    return
  }
  state.toolState.isPainting = true
  state.toolState.paintedThisStroke = new Set()
  if (cell) applyToolAtCell(cell)
})

dom.addEventListener('pointermove', (e) => {
  let hoverCell = null
  if (state.toolState.tool !== 'nav') {
    hoverCell = pickCell(e.clientX, e.clientY)
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
  if (selectionRect.active) {
    if (!hoverCell) hoverCell = pickCell(e.clientX, e.clientY)
    if (hoverCell) {
      selectionRect.endX = hoverCell.x
      selectionRect.endZ = hoverCell.z
    }
    updateSelRectCSS(selectionRect.screenX0, selectionRect.screenY0, e.clientX, e.clientY)
    return
  }
  if (!state.toolState.isPainting) return
  if (state.toolState.tool === 'nav') return
  if (state.toolState.tool === 'rock' || state.toolState.tool === 'house' || state.toolState.tool === 'research' || state.toolState.tool === 'bush' || state.toolState.tool === 'observatory') return
  const cell = hoverCell || pickCell(e.clientX, e.clientY)
  if (cell) applyToolAtCell(cell)
})

dom.addEventListener('pointerleave', () => { cursorMesh.visible = false; clearStrataPreview() })
window.addEventListener('pointerup', (e) => {
  state.toolState.isPainting = false
  if (selectionRect.active && e.button === 0) {
    selectionRect.active = false
    selRectEl.style.display = 'none'
    const cells = cellsInRect(selectionRect.startX, selectionRect.startZ, selectionRect.endX, selectionRect.endZ)
    applyToolToZone(cells, state.toolState.tool)
  }
})

// Clic gauche bref sur un colon : ouvre la fiche personnage
dom.addEventListener('pointerup', (e) => {
  if (e.button !== 0) return
  if (!lclickStart) return
  const dt = performance.now() - lclickStart.t
  const dx = e.clientX - lclickStart.x
  const dy = e.clientY - lclickStart.y
  const dist2 = dx * dx + dy * dy
  lclickStart = null
  if (dt > 260) return
  if (dist2 > 20) return
  if (isCharSheetOpen()) return
  const col = pickColonist(e.clientX, e.clientY)
  if (col) openCharSheet(col)
})

// ---------------------------------------------------------------------------
// Clic droit bref : annulation de job
// ---------------------------------------------------------------------------
function cancelJobAt(x, z, skipHUDRefresh) {
  const k = jobKey(x, z)
  if (state.jobs.has(k)) {
    removeJob(x, z, false)
    if (!skipHUDRefresh) refreshHUD()
    return true
  }
  if (state.buildJobs.has(k)) {
    removeBuildJob(x, z)
    if (!skipHUDRefresh) refreshHUD()
    return true
  }
  return false
}

let rclickStart = null
dom.addEventListener('pointerdown', (e) => {
  if (e.button !== 2) return
  rclickStart = { x: e.clientX, y: e.clientY, t: performance.now(), shift: e.shiftKey }
})
dom.addEventListener('pointerup', (e) => {
  if (e.button !== 2) return
  if (!rclickStart) return
  const dt = performance.now() - rclickStart.t
  const dx = e.clientX - rclickStart.x
  const dy = e.clientY - rclickStart.y
  const dist2 = dx * dx + dy * dy
  const wasShift = rclickStart.shift
  rclickStart = null
  if (dt > 200) return
  if (dist2 > 16) return
  const cell = pickCell(e.clientX, e.clientY)
  if (!cell) return
  // Shift + clic droit bref : annule toute la strate sous le curseur
  if (wasShift) {
    const cells = computeStrata(cell.x, cell.z)
    let cancelled = 0
    for (const c of cells) if (cancelJobAt(c.x, c.z, true)) cancelled++
    if (cancelled > 0) refreshHUD()
    return
  }
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
