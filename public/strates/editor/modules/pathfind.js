import { GRID, MAX_STEP } from './constants.js'
import { state } from './state.js'
import { isDeepWater } from './terrain.js'

// ============================================================================
// A* + approche (4-directions)
// ============================================================================

export function passable(x, z, fromTop) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return false
  const top = state.cellTop[z * GRID + x]
  if (top <= 0) return false
  if (isDeepWater(x, z)) return false
  if (Math.abs(top - fromTop) > MAX_STEP) return false
  return true
}

export function aStar(sx, sz, tx, tz) {
  if (sx === tx && sz === tz) return [[sx, sz]]
  const open = []
  const cameFrom = new Map()
  const gScore = new Map()
  const fScore = new Map()
  const sk = sx + ',' + sz
  gScore.set(sk, 0)
  fScore.set(sk, Math.abs(tx - sx) + Math.abs(tz - sz))
  open.push({ x: sx, z: sz, f: fScore.get(sk) })
  const closed = new Set()
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  while (open.length) {
    let bi = 0
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i
    const cur = open.splice(bi, 1)[0]
    const ck = cur.x + ',' + cur.z
    if (cur.x === tx && cur.z === tz) {
      const path = [[cur.x, cur.z]]
      let k = ck
      while (cameFrom.has(k)) {
        const [px, pz] = cameFrom.get(k)
        path.unshift([px, pz])
        k = px + ',' + pz
      }
      return path
    }
    closed.add(ck)
    const curTop = state.cellTop[cur.z * GRID + cur.x]
    for (const [dx, dz] of dirs) {
      const nx = cur.x + dx, nz = cur.z + dz
      const nk = nx + ',' + nz
      if (closed.has(nk)) continue
      const isTarget = (nx === tx && nz === tz)
      if (!isTarget && !passable(nx, nz, curTop)) continue
      const tentative = (gScore.get(ck) ?? Infinity) + 1
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, [cur.x, cur.z])
        gScore.set(nk, tentative)
        const f = tentative + Math.abs(tx - nx) + Math.abs(tz - nz)
        fScore.set(nk, f)
        let found = false
        for (let i = 0; i < open.length; i++) {
          if (open[i].x === nx && open[i].z === nz) { open[i].f = f; found = true; break }
        }
        if (!found) open.push({ x: nx, z: nz, f })
      }
    }
  }
  return null
}

export function findApproach(sx, sz, tx, tz) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  let best = null, bestLen = Infinity
  for (const [dx, dz] of dirs) {
    const nx = tx + dx, nz = tz + dz
    if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue
    const top = state.cellTop[nz * GRID + nx]
    if (isDeepWater(nx, nz)) continue
    if (top <= 0) continue
    const path = aStar(sx, sz, nx, nz)
    if (path && path.length < bestLen) {
      best = { path, ax: nx, az: nz }
      bestLen = path.length
    }
  }
  return best
}

// Lot B : enumere toutes les cellules formant le perimetre exterieur d un
// batiment de footprint w x d dont l origine (coin min) est (ox, oz). Inclut
// les 4 coins (style Age of Empires : 8 slots autour d un 1x1, perimetre
// complet pour 2x2 ou 4x4). Filtre les cellules hors grille, en eau profonde
// ou non passables.
export function listBuildSlots(ox, oz, w, d) {
  const slots = []
  // Bord haut (z = oz - 1) et bord bas (z = oz + d), de x = ox - 1 a ox + w
  for (let x = ox - 1; x <= ox + w; x++) {
    slots.push([x, oz - 1])
    slots.push([x, oz + d])
  }
  // Bord gauche et droite, de z = oz a oz + d - 1 (coins deja inclus au-dessus)
  for (let z = oz; z < oz + d; z++) {
    slots.push([ox - 1, z])
    slots.push([ox + w, z])
  }
  // Filtre hors-grille, eau profonde, hors-sol.
  const valid = []
  for (const [x, z] of slots) {
    if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue
    if (isDeepWater(x, z)) continue
    const top = state.cellTop[z * GRID + x]
    if (top <= 0) continue
    valid.push({ x, z })
  }
  return valid
}

// Lot B : choisit pour un constructeur un slot de travail autour d un chantier
// (footprint w x d, origine ox, oz). Evite les slots deja pris (takenSet de
// cles "x,z"). Retourne { x, z, path } ou null si aucun slot accessible.
// Heuristique : tri par distance Manhattan au demandeur, puis tentative aStar.
export function findBuildSlot(sx, sz, ox, oz, w, d, takenSet) {
  const slots = listBuildSlots(ox, oz, w, d)
  // Tri par distance Manhattan croissante au demandeur.
  slots.sort((a, b) => {
    const da = Math.abs(a.x - sx) + Math.abs(a.z - sz)
    const db = Math.abs(b.x - sx) + Math.abs(b.z - sz)
    return da - db
  })
  // Pass 1 : slots non pris.
  for (const s of slots) {
    const key = s.x + ',' + s.z
    if (takenSet && takenSet.has(key)) continue
    const path = aStar(sx, sz, s.x, s.z)
    if (path) return { x: s.x, z: s.z, path }
  }
  // Pass 2 (fallback) : si tous les slots sont pris, autoriser le partage du
  // slot le plus proche accessible. Evite que le constructeur reste bloque.
  for (const s of slots) {
    const path = aStar(sx, sz, s.x, s.z)
    if (path) return { x: s.x, z: s.z, path }
  }
  return null
}
