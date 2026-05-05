// ============================================================================
// distant-islands.js : 3 à 5 silhouettes d îles décoratives autour de la carte
// principale. Pures décorations visuelles : pas d interaction, pas de fog of
// war, pas de raycasting, pas de pathfinding. Juste de la profondeur.
//
// API : buildDistantIslands() à appeler une fois au démarrage. Idempotent.
// ============================================================================

import * as THREE from 'three'
import { GRID } from './constants.js'
import { scene } from './scene.js'

// 5 îles paramétriques. Disposition radiale autour du centre du monde, à
// distances variables (240..420 du centre soit ~110..290 unités hors grille).
// Désaturation distance : couleurs assombries d un ton vers le ciel pour se
// fondre naturellement dans le FogExp2 de scene.js (#cfe6f5, density 0.005).
const ISLANDS = [
  { angle:  35, dist: 240, scale: 0.85, palette: 'sand-grass' },
  { angle: 110, dist: 320, scale: 1.10, palette: 'rocky' },
  { angle: 185, dist: 280, scale: 0.95, palette: 'sand-grass' },
  { angle: 250, dist: 380, scale: 1.25, palette: 'rocky-snow' },
  { angle: 320, dist: 220, scale: 0.75, palette: 'small-grass' },
]

// Palettes désaturées (mix doux vers la couleur du ciel/fog).
const PALETTES = {
  'sand-grass':  { sand: 0xd9c692, grass: 0x88a87a, rock: 0x9a9788, dirt: 0x84775a },
  'rocky':       { sand: 0xc0bca8, grass: 0x868c7e, rock: 0x8a8576, dirt: 0x736b58 },
  'rocky-snow':  { sand: 0xb6b6ae, grass: 0x939c8c, rock: 0x9c9788, dirt: 0x6f695a, snow: 0xeae5d6 },
  'small-grass': { sand: 0xd6c89b, grass: 0x91ad82, rock: 0x9c9788, dirt: 0x82775a },
}

let built = false
let _root = null

function _makeIsland(seed, palette, scale) {
  // Mini RNG déterministe (seedrand simple)
  let s = seed >>> 0
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return (s & 0xffffffff) / 0x100000000
  }

  const g = new THREE.Group()
  // Strates empilées (sable, herbe, roche). Box plats centrés en (0,0,0).
  const baseSize = 22 + rng() * 14   // ~22..36 unités world (avant scale)
  const sandH = 0.6, grassH = 0.8, rockH = 1.4
  const matSand  = new THREE.MeshLambertMaterial({ color: palette.sand,  flatShading: true })
  const matGrass = new THREE.MeshLambertMaterial({ color: palette.grass, flatShading: true })
  const matRock  = new THREE.MeshLambertMaterial({ color: palette.rock,  flatShading: true })
  const matDirt  = new THREE.MeshLambertMaterial({ color: palette.dirt,  flatShading: true })
  const matSnow  = palette.snow ? new THREE.MeshLambertMaterial({ color: palette.snow, flatShading: true }) : null

  const sandGeo  = new THREE.BoxGeometry(baseSize, sandH, baseSize * (0.85 + rng() * 0.25))
  const grassGeo = new THREE.BoxGeometry(baseSize * 0.85, grassH, baseSize * 0.7)
  const rockGeo  = new THREE.BoxGeometry(baseSize * 0.55, rockH, baseSize * 0.45)

  const sand = new THREE.Mesh(sandGeo, matSand)
  sand.position.y = sandH / 2
  g.add(sand)

  // Couche herbe/dirt mixte au-dessus
  const grass = new THREE.Mesh(grassGeo, matGrass)
  grass.position.y = sandH + grassH / 2
  grass.position.x = (rng() - 0.5) * 4
  grass.position.z = (rng() - 0.5) * 4
  g.add(grass)

  // 1 à 2 reliefs rocheux
  const peakCount = 1 + Math.floor(rng() * 2)
  for (let i = 0; i < peakCount; i++) {
    const peakH = rockH + rng() * 1.6
    const pgeo = new THREE.ConeGeometry(baseSize * (0.2 + rng() * 0.12), peakH, 5)
    const peak = new THREE.Mesh(pgeo, matRock)
    peak.position.set(
      (rng() - 0.5) * baseSize * 0.4,
      sandH + grassH + peakH / 2,
      (rng() - 0.5) * baseSize * 0.35
    )
    g.add(peak)
    // Coiffe neigeuse en haut sur palette neigeuse
    if (matSnow) {
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(baseSize * 0.12, peakH * 0.35, 5),
        matSnow
      )
      cap.position.set(peak.position.x, peak.position.y + peakH * 0.30, peak.position.z)
      g.add(cap)
    }
  }

  // Liseré dirt sous le sable pour la coupe (visible si on regarde de côté)
  const dirtGeo = new THREE.BoxGeometry(baseSize, 0.4, baseSize * 0.85)
  const dirt = new THREE.Mesh(dirtGeo, matDirt)
  dirt.position.y = -0.2
  g.add(dirt)

  g.scale.setScalar(scale)
  return g
}

export function buildDistantIslands() {
  if (built) return _root
  const root = new THREE.Group()
  root.name = 'distant-islands'
  root.userData.decorative = true
  root.userData.noPick = true

  const cx = GRID / 2
  const cz = GRID / 2

  ISLANDS.forEach((cfg, i) => {
    const palette = PALETTES[cfg.palette] || PALETTES['sand-grass']
    const island = _makeIsland(0xa17f + i * 71, palette, cfg.scale)
    const rad = cfg.angle * Math.PI / 180
    island.position.set(
      cx + Math.cos(rad) * cfg.dist,
      -0.4,                    // légèrement sous le niveau de l eau pour ne pas dépasser
      cz + Math.sin(rad) * cfg.dist
    )
    island.rotation.y = (cfg.angle + 30) * Math.PI / 180
    // Désactive raycast et pick : ces îles ne sont jamais cliquables.
    island.traverse(o => {
      o.userData.noPick = true
      if (o.isMesh) {
        o.frustumCulled = true
        o.castShadow = false
        o.receiveShadow = false
        // No-op raycast : le raycaster Three.js ne touchera plus ces meshes
        // même si quelqu un le pointe explicitement dessus.
        o.raycast = function() {}
      }
    })
    root.add(island)
  })

  scene.add(root)
  _root = root
  built = true
  return root
}

export function getDistantIslandsRoot() { return _root }
