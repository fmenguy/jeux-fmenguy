import * as THREE from 'three'
import {
  GRID, MIN_STRATES, MAX_STRATES, WATER_LEVEL, SHALLOW_WATER_LEVEL,
  COLONIST_SPEED, WORK_DURATION, HARVEST_DURATION, HARVEST_RADIUS, GRAVITY,
  GENDER_SYMBOLS, GENDER_COLORS,
  CHIEF_COLOR, COL, ORE_TO_STOCK
} from './constants.js'
import {
  MALE_NAMES, FEMALE_NAMES, SPEECH_LINES, SPEECH_LINES_INSISTENT, SPEECH_LINES_BY_NAME
} from './gamedata.js'
import { state } from './state.js'
import { scene, camera, tmpObj, tmpColor, HIDDEN_MATRIX } from './scene.js'
import { topVoxelIndex, colorForLayer, isDeepWater } from './terrain.js'
import { aStar, findApproach } from './pathfind.js'
import { jobKey, removeJob } from './jobs.js'
import {
  findResearchBuildingById, isCellOccupied, extractOreAt, chopTreeAt, isTreeOn,
  isRockOn, collectRockAt, isBushOn, grabBushAt
} from './placements.js'
import { findNearestBush, refreshBushBerries } from './placements.js'
import { techUnlocked } from './tech.js'
import { totalBuildStock, consumeBuildStock, incrStockForBiome } from './stocks.js'
import { makeBubbleCanvas, drawBubble, makeLabelCanvas, drawLabel } from './bubbles.js'
import { activeSpeakers } from './speech.js'
import { initColonistNeeds, isNeedCritical } from './needs.js'
import { NEEDS_DATA } from './gamedata.js'
// tasks.js : file de taches, utilisee ici pour marquer la tache courante.
import { PRIORITY, TASK_KIND } from './tasks.js'

export const COLONIST_COLORS = [0xffcf6b, 0x6bd0ff, 0xff8a8a, 0xb78aff, 0x8aff9c, 0xffa07a, 0x98ddca]

function pickUniqueName(gender, usedSet) {
  const pool = gender === 'M' ? MALE_NAMES : FEMALE_NAMES
  const free = pool.filter(n => !usedSet.has(n))
  if (free.length > 0) {
    const n = free[Math.floor(Math.random() * free.length)]
    usedSet.add(n)
    return n
  }
  const romans = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
  for (const suf of romans) {
    for (const base of pool) {
      const candidate = base + ' ' + suf
      if (!usedSet.has(candidate)) { usedSet.add(candidate); return candidate }
    }
  }
  const fallback = pool[0] + ' #' + usedSet.size
  usedSet.add(fallback)
  return fallback
}

export function topY(x, z) {
  const t = state.cellTop[z * GRID + x]
  if (t >= WATER_LEVEL && t <= SHALLOW_WATER_LEVEL) return t - 0.2
  return t
}

export function scheduleFlash(x, z) {
  state.flashes.push({ x, z, t: 0 })
  const i = topVoxelIndex(x, z)
  if (i < 0) return
  state.instanced.setColorAt(i, COL.flash)
  if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
}

export class Colonist {
  constructor(id, x, z, opts) {
    this.id = id
    this.isChief = false
    this.x = x; this.z = z
    this.tx = x + 0.5
    this.tz = z + 0.5
    this.ty = topY(x, z)
    this.vy = 0
    this.state = 'IDLE'
    this.path = null
    this.pathStep = 0
    this.targetJob = null
    this.targetBush = null
    this.targetBuildJob = null
    this.workTimer = 0
    this.bounce = 0
    this.isWandering = false
    this.wanderPause = 2 + Math.random() * 4
    this.lookTimer = 1 + Math.random() * 3
    this.targetYaw = 0
    // Lot B perf : throttle de la prise de decision IDLE (pathfinding A* lourd).
    // Valeur initiale aleatoire pour decorreler les colons entre eux.
    this.decisionCooldown = Math.random() * 0.3
    this.speechTimer = 0
    this.nextSpeech = 10 + Math.random() * 10
    this.lastLine = null
    this.researchBuildingId = null
    this.lastContextLine = null
    this.favorite = false
    // Lot B, moteur comportemental
    this.needs = new Map()
    this.jobQueue = []                   // tableau de Task, priorite decroissante
    this.currentTask = null              // Task en cours d execution
    this.assignedBuildingId = null       // Cabane pour dormir, Hutte du sage pour bosser
    this.productivityMul = 1.0           // expose en lecture pour le cablage par placements.js et tech.js (post-Lot-B)
    this.wasAttacked = false             // flag pour le besoin Blesse
    // Champs vus par la vue Population (population-modal.js)
    this.hp    = 80
    this.mor   = 70
    this.faim  = 60
    this.age   = Math.floor(18 + Math.random() * 28)  // 18-45
    this.skills = {}
    initColonistNeeds(this)
    if (opts && opts.restore) {
      const r = opts.restore
      this.gender = r.gender || 'M'
      this.name = r.name
      state.usedNames.add(this.name)
      this.isChief = !!r.isChief
      this.researchBuildingId = r.researchBuildingId != null ? r.researchBuildingId : null
      this.favorite = !!r.favorite
      if (typeof r.ty === 'number') this.ty = r.ty
      if (r.state) this.state = r.state
      if (typeof r.hp    === 'number') this.hp    = r.hp
      if (typeof r.mor   === 'number') this.mor   = r.mor
      if (typeof r.faim  === 'number') this.faim  = r.faim
      if (typeof r.age   === 'number') this.age   = r.age
      if (r.skills && typeof r.skills === 'object') this.skills = r.skills
      // Lot B : restaure l assignation de bati si presente dans la save,
      // sinon suppose qu il y avait au moins une maison (la save implique
      // que le hameau initial a ete cree).
      if (r.assignedBuildingId) this.assignedBuildingId = r.assignedBuildingId
      else if (state.houses && state.houses.length > 0) this.assignedBuildingId = 'cabane'
    } else if (opts && opts.forceName) {
      this.gender = opts.forceGender || 'M'
      this.name = opts.forceName
      state.usedNames.add(this.name)
      this.isChief = !!opts.isChief
    } else {
      this.gender = Math.random() < 0.5 ? 'M' : 'F'
      this.name = pickUniqueName(this.gender, state.usedNames)
    }
    this.relationships = new Map()
    const col = COLONIST_COLORS[id % COLONIST_COLORS.length]
    this.group = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, flatShading: true })
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf3d6a8, roughness: 0.7, flatShading: true })
    const pantsCol = this.isChief ? 0x6b4a2b : 0x3a3a4a
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsCol, roughness: 0.8, flatShading: true })
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.38), bodyMat)
    body.position.y = 0.78; body.castShadow = true
    const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.22)
    const legL = new THREE.Mesh(legGeo, pantsMat)
    legL.position.set(-0.14, 0.25, 0); legL.castShadow = true
    const legR = new THREE.Mesh(legGeo, pantsMat)
    legR.position.set(0.14, 0.25, 0); legR.castShadow = true
    this.legL = legL; this.legR = legR
    const armGeo = new THREE.BoxGeometry(0.16, 0.5, 0.18)
    const armL = new THREE.Mesh(armGeo, bodyMat)
    armL.position.set(-0.34, 0.78, 0); armL.castShadow = true
    const armR = new THREE.Mesh(armGeo, bodyMat)
    armR.position.set(0.34, 0.78, 0); armR.castShadow = true
    this.armL = armL; this.armR = armR
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMat)
    head.position.y = 1.28; head.castShadow = true
    if (this.gender === 'F') {
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9, flatShading: true })
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.46), hairMat)
      hair.position.y = 1.46; hair.castShadow = true
      this.group.add(hair)
    } else {
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x2e2218, roughness: 0.9, flatShading: true })
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), hairMat)
      hair.position.y = 1.51; hair.castShadow = true
      this.group.add(hair)
    }
    if (this.isChief) {
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.35, metalness: 0.7, flatShading: true })
      const crownBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), crownMat)
      crownBase.position.y = 1.58; crownBase.castShadow = true
      this.group.add(crownBase)
      const spikeGeo = new THREE.BoxGeometry(0.1, 0.14, 0.1)
      for (let si = 0; si < 4; si++) {
        const ang = (si / 4) * Math.PI * 2
        const spike = new THREE.Mesh(spikeGeo, crownMat)
        spike.position.set(Math.cos(ang) * 0.18, 1.7, Math.sin(ang) * 0.18)
        spike.castShadow = true
        this.group.add(spike)
      }
    }
    this.group.add(body); this.group.add(head)
    this.group.add(legL); this.group.add(legR)
    this.group.add(armL); this.group.add(armR)
    this.group.position.set(this.tx, this.ty, this.tz)
    scene.add(this.group)
    this.lineMat = new THREE.LineDashedMaterial({ color: col, dashSize: 0.2, gapSize: 0.15, transparent: true, opacity: 0.6 })
    this.lineGeo = new THREE.BufferGeometry()
    this.line = new THREE.Line(this.lineGeo, this.lineMat)
    scene.add(this.line)
    this.bubbleCanvas = makeBubbleCanvas()
    this.bubbleTex = new THREE.CanvasTexture(this.bubbleCanvas)
    this.bubbleTex.minFilter = THREE.LinearFilter
    this.bubbleMat = new THREE.SpriteMaterial({ map: this.bubbleTex, transparent: true, depthTest: false, depthWrite: false })
    this.bubbleMat.opacity = 0
    this.bubble = new THREE.Sprite(this.bubbleMat)
    this.bubble.scale.set(2.4, 0.75, 1)
    this.bubble.position.set(0, 2.75, 0)
    this.bubble.visible = false
    this.bubble.renderOrder = 999
    this.group.add(this.bubble)
    this.labelCanvas = makeLabelCanvas()
    drawLabel(this.labelCanvas, this.name, this.gender, this.isChief)
    this.labelTex = new THREE.CanvasTexture(this.labelCanvas)
    this.labelTex.minFilter = THREE.LinearFilter
    this.labelMat = new THREE.SpriteMaterial({ map: this.labelTex, transparent: true, depthTest: false, depthWrite: false })
    this.label = new THREE.Sprite(this.labelMat)
    this.label.scale.set(1.35, 0.34, 1)
    this.label.position.set(0, 1.85, 0)
    this.label.visible = true
    this.label.renderOrder = 998
    this.group.add(this.label)
  }

  say(line, isHint) {
    this.lastLine = line
    this.lastLineHint = !!isHint
    this._bubbleTruncated = null
    const { bw } = drawBubble(this.bubbleCanvas, line, !!isHint)
    this.bubbleTex.needsUpdate = true
    this._bubbleBaseW = Math.max(1.0, (bw / 512) * 2.8)
    this.bubble.scale.set(this._bubbleBaseW, 0.75, 1)
    this.speechTimer = isHint ? 6.0 : 4.0
    this.bubble.visible = true
    this.bubbleMat.opacity = 1
  }
  sayHint(line) { this.say(line, true) }

  updateSpeech(dt) {
    if (this.speechTimer <= 0) {
      if (this.bubble.visible) { this.bubble.visible = false; this.bubbleMat.opacity = 0 }
      return
    }
    this.speechTimer -= dt

    const dist = camera.position.distanceTo(this.group.position)

    // Trop loin : masquer sans consommer le timer
    if (dist > 50) {
      if (this.bubble.visible) this.bubble.visible = false
      return
    }

    this.bubble.visible = true

    // Scale proportionnel à la distance, ancrage bas du sprite
    const zoomFactor = Math.max(0.6, Math.min(2.5, dist / 18))
    const baseW = this._bubbleBaseW || 2.4
    this.bubble.scale.set(baseW * zoomFactor, 0.75 * zoomFactor, 1)
    // Ajuste Y pour que le bas du sprite reste ancré au-dessus de la tête
    this.bubble.position.set(0, 2.375 + 0.375 * zoomFactor, 0)

    // Troncature au-delà de 25 unités : redraw uniquement au changement de seuil
    const truncate = dist > 25
    if (truncate !== this._bubbleTruncated && this.lastLine) {
      this._bubbleTruncated = truncate
      const text = truncate && this.lastLine.length > 20
        ? this.lastLine.slice(0, 20) + '…'
        : this.lastLine
      drawBubble(this.bubbleCanvas, text, !!this.lastLineHint)
      this.bubbleTex.needsUpdate = true
    }

    if (this.speechTimer <= 0.5) {
      this.bubbleMat.opacity = Math.max(0, this.speechTimer / 0.5)
    } else {
      this.bubbleMat.opacity = 1
    }
    if (this.speechTimer <= 0) {
      this.bubble.visible = false
      this.bubbleMat.opacity = 0
    }
  }

  pickWander() {
    for (let tries = 0; tries < 10; tries++) {
      const dx = Math.floor((Math.random() * 7) - 3)
      const dz = Math.floor((Math.random() * 7) - 3)
      if (dx === 0 && dz === 0) continue
      const nx = this.x + dx, nz = this.z + dz
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue
      const top = state.cellTop[nz * GRID + nx]
      if (top <= 0) continue
      if (isDeepWater(nx, nz)) continue
      let occupied = false
      for (const other of state.colonists) {
        if (other === this) continue
        if (other.x === nx && other.z === nz) { occupied = true; break }
      }
      if (occupied) continue
      const path = aStar(this.x, this.z, nx, nz)
      if (path && path.length > 1 && path.length < 8) {
        this.path = path
        this.pathStep = 0
        this.isWandering = true
        this.state = 'MOVING'
        this.updateTrail()
        return true
      }
    }
    return false
  }

  pickJob() {
    let best = null, bestD = Infinity
    for (const [, j] of state.jobs) {
      if (j.claimedBy) continue
      const d = Math.abs(j.x - this.x) + Math.abs(j.z - this.z)
      if (d < bestD) { bestD = d; best = j }
    }
    if (!best) return false
    const approach = findApproach(this.x, this.z, best.x, best.z)
    if (!approach) return false
    best.claimedBy = this
    this.targetJob = best
    this.path = approach.path
    this.pathStep = 0
    this.state = 'MOVING'
    this.isWandering = false
    this.updateTrail()
    return true
  }

  pickBuildJob() {
    if (totalBuildStock() <= 0) return false
    let best = null, bestD = Infinity
    for (const [, j] of state.buildJobs) {
      if (j.claimedBy) continue
      const colonTop = state.cellTop[this.z * GRID + this.x]
      const targetTop = state.cellTop[j.z * GRID + j.x]
      if (targetTop - colonTop > 3) continue
      const d = Math.abs(j.x - this.x) + Math.abs(j.z - this.z)
      if (d < bestD) { bestD = d; best = j }
    }
    if (!best) return false
    const approach = findApproach(this.x, this.z, best.x, best.z)
    if (!approach) return false
    best.claimedBy = this
    this.targetBuildJob = best
    this.path = approach.path
    this.pathStep = 0
    this.state = 'MOVING'
    this.isWandering = false
    this.updateTrail()
    return true
  }

  // Lot B, B10 : auto-collecte de base au repos. Le colon IDLE sans ordre
  // joueur cherche autour de lui un rocher a ramasser (toujours autorise) ou
  // un arbre a abattre (si axe-stone debloquee). Priorite LEISURE, plus
  // basse que les ordres joueur mais plus haute que la flanerie. Rayon
  // Manhattan 8 pour rester local au hameau. Cellules deja marquees par le
  // joueur (state.jobs) sont exclues pour eviter double-claim.
  // desactive - remplace par systeme 3 boutons (pioche/hache/baie)
  // pickAutoCollect() {
  //   const RADIUS = 8
  //   const claimed = new Set()
  //   for (const other of state.colonists) {
  //     if (other === this) continue
  //     if (other.targetJob && other.targetJob.auto) {
  //       claimed.add(other.targetJob.x + ',' + other.targetJob.z)
  //     }
  //   }
  //   let best = null, bestD = Infinity
  //   for (const r of state.rocks) {
  //     const d = Math.abs(r.x - this.x) + Math.abs(r.z - this.z)
  //     if (d > RADIUS) continue
  //     const k = r.x + ',' + r.z
  //     if (state.jobs.has(k)) continue
  //     if (claimed.has(k)) continue
  //     if (d < bestD) { bestD = d; best = { x: r.x, z: r.z } }
  //   }
  //   if (techUnlocked('axe-stone')) {
  //     for (const t of state.trees) {
  //       if (t.growth != null && t.growth < 0.6) continue
  //       const d = Math.abs(t.x - this.x) + Math.abs(t.z - this.z)
  //       if (d > RADIUS) continue
  //       const k = t.x + ',' + t.z
  //       if (state.jobs.has(k)) continue
  //       if (claimed.has(k)) continue
  //       if (d < bestD) { bestD = d; best = { x: t.x, z: t.z } }
  //     }
  //   }
  //   if (!best) return false
  //   const approach = findApproach(this.x, this.z, best.x, best.z)
  //   if (!approach) return false
  //   this.targetJob = { x: best.x, z: best.z, claimedBy: this, auto: true }
  //   this.path = approach.path
  //   this.pathStep = 0
  //   this.state = 'MOVING'
  //   this.isWandering = false
  //   this.updateTrail()
  //   return true
  // }

  pickHarvest() {
    const bush = findNearestBush(this.x, this.z, HARVEST_RADIUS)
    if (!bush) return false
    const approach = findApproach(this.x, this.z, bush.x, bush.z)
    if (!approach) return false
    bush.claimedBy = this
    this.targetBush = bush
    this.path = approach.path
    this.pathStep = 0
    this.state = 'MOVING'
    this.isWandering = false
    this.updateTrail()
    return true
  }

  // Feu de camp social : la nuit, les colons IDLE sont attires vers le foyer
  // (maison ou manoir) le plus proche. Boost moral tant qu'ils y sont.
  pickCampfire() {
    let best = null, bestD = Infinity
    const sources = []
    for (const h of state.houses) sources.push({ x: h.x, z: h.z })
    for (const m of state.manors) sources.push({ x: m.x + 1, z: m.z + 1 })
    if (!sources.length) return false
    for (const s of sources) {
      const d = Math.abs(s.x - this.x) + Math.abs(s.z - this.z)
      if (d > 12) continue
      if (d < bestD) { bestD = d; best = s }
    }
    if (!best) return false
    if (bestD <= 2) {
      // Deja aupres du foyer, moral +1 (stocke sur c.moralNight).
      this.moralNight = Math.min(10, (this.moralNight || 0) + 1)
      return false
    }
    // Probabilite d'initier le deplacement, pour ne pas spammer les calculs.
    if (Math.random() > 0.25) return false
    const approach = findApproach(this.x, this.z, best.x, best.z)
    if (!approach) return false
    this.path = approach.path
    this.pathStep = 0
    this.state = 'MOVING'
    this.isWandering = true
    this.updateTrail()
    return true
  }

  updateTrail() {
    if (!this.path) { this.lineGeo.setFromPoints([]); return }
    const pts = []
    for (let i = this.pathStep; i < this.path.length; i++) {
      const [x, z] = this.path[i]
      pts.push(new THREE.Vector3(x + 0.5, topY(x, z) + 0.05, z + 0.5))
    }
    this.lineGeo.setFromPoints(pts)
    this.line.computeLineDistances()
  }

  applyGravity(dt) {
    const groundY = topY(this.x, this.z)
    if (this.ty > groundY + 1e-4) {
      this.vy -= GRAVITY * dt
      this.ty += this.vy * dt
      if (this.ty <= groundY) { this.ty = groundY; this.vy = 0 }
    } else if (this.ty < groundY) {
      this.ty = groundY; this.vy = 0
    } else {
      this.vy = 0
    }
  }

  update(dt) {
    this.applyGravity(dt)
    this.updateSpeech(dt)
    this.faim = Math.max(0, this.faim - 0.5 * dt)
    if (this.state !== 'MOVING' && this.legL) {
      const k = Math.min(1, dt * 8)
      this.legL.rotation.x *= (1 - k)
      this.legR.rotation.x *= (1 - k)
      this.armL.rotation.x *= (1 - k)
      this.armR.rotation.x *= (1 - k)
    }

    if (this.state === 'RESEARCHING') {
      this.lineGeo.setFromPoints([])
      const building = findResearchBuildingById(this.researchBuildingId)
      if (!building) {
        this.researchBuildingId = null
        this.state = 'IDLE'
        return
      }
      const dx = (building.x + 0.5) - this.tx
      const dz = (building.z + 0.5) - this.tz
      this.group.rotation.y = Math.atan2(dx, dz)
      const bob = Math.sin(performance.now() * 0.0025) * 0.06
      this.group.position.set(this.tx, this.ty + bob, this.tz)
      this.nextSpeech -= dt
      if (this.nextSpeech <= 0) {
        this.nextSpeech = 15 + Math.random() * 10
      }
      return
    }

    if (this.state === 'IDLE') {
      this.lineGeo.setFromPoints([])
      if (this.researchBuildingId != null) {
        const building = findResearchBuildingById(this.researchBuildingId)
        if (!building) {
          this.researchBuildingId = null
        } else {
          const approach = findApproach(this.x, this.z, building.x, building.z)
          if (approach) {
            this.path = approach.path
            this.pathStep = 0
            this.state = 'MOVING'
            this.isWandering = false
            this.updateTrail()
            return
          }
          // Chemin inaccessible : liberer l assignation pour permettre reassignation
          if (building.assignedColonistId === this.id) building.assignedColonistId = null
          this.researchBuildingId = null
        }
      }
      // Lot B (file de recherche) : le chef s auto-assigne a la hutte du sage
      // des qu une tech est active dans la file. C est indispensable au tout
      // debut de partie, ou le chef est le seul colon dispo et ou l UI doit
      // montrer une progression immediate apres que le joueur a enfile une tech.
      if (
        state.activeResearch != null
        && this.isChief
        && this.researchBuildingId == null
        && Array.isArray(state.researchHouses)
        && state.researchHouses.length > 0
      ) {
        this.researchBuildingId = state.researchHouses[0].id
        const building = findResearchBuildingById(this.researchBuildingId)
        if (building) {
          const approach = findApproach(this.x, this.z, building.x, building.z)
          if (approach) {
            this.path = approach.path
            this.pathStep = 0
            this.state = 'MOVING'
            this.isWandering = false
            this.updateTrail()
            return
          }
        }
        // Chemin introuvable vers la hutte : annuler l auto-assignation du chef
        this.researchBuildingId = null
      }
      // Lot B perf : la prise de decision (pickHarvest, pickJob, pickBuildJob)
      // appelle du pathfinding A* couteux. On throttle a ~3 Hz par colon pour
      // eviter les micro-freezes en foule IDLE. La rotation tete et la flanerie
      // plus bas continuent tourner a 60 Hz normalement.
      this.decisionCooldown -= dt
      if (this.decisionCooldown <= 0) {
        this.decisionCooldown = 0.3 + Math.random() * 0.3
        // Lot B : priorite absolue a la survie. Si le colon a faim critique,
        // il abandonne tout et cherche un buisson. La nuit n y change rien
        // (manger est vital, meme en pleine nuit).
        if (isNeedCritical(this, 'hunger')) {
          if (this.pickHarvest()) {
            this.currentTask = { kind: TASK_KIND.EAT_SEEK_FOOD, priority: PRIORITY.SURVIVAL, reason: 'hunger_critical' }
            return
          }
        }
        if (state.jobs.size > 0) { if (this.pickJob()) { this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.WORK }; return } }
        if (state.buildJobs.size > 0) { if (this.pickBuildJob()) { this.currentTask = { kind: TASK_KIND.PLAYER_BUILD_JOB, priority: PRIORITY.WORK }; return } }
        // Activite exclusive jour : cueillette de baies (agriculture). La nuit
        // les colons affectes a un buisson reviennent au repos.
        if (!state.isNight && this.pickHarvest()) {
          this.currentTask = { kind: TASK_KIND.HARVEST_BERRIES, priority: PRIORITY.LEISURE }
          return
        }
      }
      // Lot B, B10 : auto-collecte de base au repos (rochers, arbres si hache).
      // desactive - remplace par systeme 3 boutons (pioche/hache/baie)
      // if (!state.isNight && this.pickAutoCollect()) {
      //   this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.LEISURE }
      //   return
      // }
      // Nuit : attirance vers le foyer le plus proche (feu de camp social).
      if (state.isNight && this.pickCampfire()) return
      this.wanderPause -= dt
      this.lookTimer -= dt
      if (this.lookTimer <= 0) {
        this.targetYaw = this.group.rotation.y + (Math.random() - 0.5) * 1.2
        this.lookTimer = 1.5 + Math.random() * 3.5
      }
      const dy = this.targetYaw - this.group.rotation.y
      this.group.rotation.y += dy * Math.min(1, dt * 1.5)
      if (this.wanderPause <= 0) {
        if (this.pickWander()) this.wanderPause = 2 + Math.random() * 4
        else this.wanderPause = 1 + Math.random() * 2
      }
      this.group.position.set(this.tx, this.ty, this.tz)
      this.nextSpeech -= dt
      if (this.nextSpeech <= 0) {
        if (this.speechTimer <= 0 && activeSpeakers() < 2) {
          const noJobSince = performance.now() / 1000 - state.lastJobTime
          const insistent = (state.jobs.size === 0 && noJobSince > 15) && Math.random() < 0.6
          const charLines = SPEECH_LINES_BY_NAME[this.name]
          const pool = insistent ? SPEECH_LINES_INSISTENT
            : (charLines && Math.random() < 0.6) ? charLines
            : SPEECH_LINES
          let line, guard = 0
          do { line = pool[Math.floor(Math.random() * pool.length)]; guard++ }
          while (line === this.lastLine && guard < 5)
          this.say(line)
        }
        const noJobSince = performance.now() / 1000 - state.lastJobTime
        const base = (state.jobs.size === 0 && noJobSince > 15) ? 6 : 12
        this.nextSpeech = base + Math.random() * 8
      }
      return
    }

    if (this.state === 'MOVING') {
      if (this.isWandering && (state.jobs.size > 0 || state.buildJobs.size > 0 || this.researchBuildingId != null)) {
        this.isWandering = false
        this.path = null
        this.state = 'IDLE'
        this.lineGeo.setFromPoints([])
        return
      }
      if (!this.path || this.pathStep >= this.path.length) {
        if (this.isWandering) {
          this.isWandering = false
          this.state = 'IDLE'
          this.path = null
          this.lineGeo.setFromPoints([])
          this.wanderPause = 2 + Math.random() * 4
          return
        }
        if (this.researchBuildingId != null && !this.targetJob && !this.targetBush) {
          this.state = 'RESEARCHING'
          this.path = null
          this.lineGeo.setFromPoints([])
          this.group.position.set(this.tx, this.ty, this.tz)
          return
        }
        this.state = 'WORKING'
        this.workTimer = 0
        this.lineGeo.setFromPoints([])
        return
      }
      const [nx, nz] = this.path[this.pathStep]
      const targetX = nx + 0.5
      const targetZ = nz + 0.5
      const dx = targetX - this.tx
      const dz = targetZ - this.tz
      const dist = Math.hypot(dx, dz)
      const speed = this.isWandering ? COLONIST_SPEED * 0.5 : COLONIST_SPEED
      const step = speed * dt
      if (dist <= step) {
        this.tx = targetX; this.tz = targetZ
        this.x = nx; this.z = nz
        this.pathStep++
        this.updateTrail()
      } else {
        this.tx += (dx / dist) * step
        this.tz += (dz / dist) * step
      }
      const walkPhase = performance.now() * 0.012
      const bob = Math.abs(Math.sin(walkPhase)) * 0.05
      this.group.position.set(this.tx, this.ty + bob, this.tz)
      this.group.rotation.y = Math.atan2(dx, dz)
      this.targetYaw = this.group.rotation.y
      const swing = Math.sin(walkPhase) * 0.6
      if (this.legL) this.legL.rotation.x = swing
      if (this.legR) this.legR.rotation.x = -swing
      if (this.armL) this.armL.rotation.x = -swing
      if (this.armR) this.armR.rotation.x = swing
      return
    }

    if (this.state === 'WORKING') {
      this.workTimer += dt
      const focusTarget = this.targetJob || this.targetBush || this.targetBuildJob
      if (focusTarget) {
        const dx = (focusTarget.x + 0.5) - this.tx
        const dz = (focusTarget.z + 0.5) - this.tz
        this.group.rotation.y = Math.atan2(dx, dz)
      }
      this.bounce = Math.sin(this.workTimer * 12) * 0.08
      const grounded = this.ty <= topY(this.x, this.z) + 1e-4 && this.vy === 0
      this.group.position.set(this.tx, this.ty + (grounded ? Math.abs(this.bounce) : 0), this.tz)
      const duration = this.targetBush ? HARVEST_DURATION : (this.targetBuildJob ? 1.5 : WORK_DURATION)
      if (this.workTimer >= duration) {
        if (this.targetJob) {
          const { x, z } = this.targetJob
          // Ordre de priorite : arbre > rocher > filon > buisson > voxel.
          // L'un ou l'autre est traite, jamais les deux en un coup, ce qui
          // force le joueur a sequencer les ordres (ramasser avant miner).
          if (isTreeOn(x, z) && chopTreeAt(x, z)) {
            state.resources.wood++
            scheduleFlash(x, z)
            removeJob(x, z, true)
            state.gameStats.minesCompleted++
          } else if (isRockOn(x, z)) {
            const got = collectRockAt(x, z)
            state.resources.stone += got
            state.stocks.stone += got
            scheduleFlash(x, z)
            removeJob(x, z, true)
            state.gameStats.minesCompleted++
          } else {
            const oreType = extractOreAt(x, z)
            if (oreType) {
              const stockKey = ORE_TO_STOCK[oreType]
              if (stockKey && state.stocks[stockKey] != null) state.stocks[stockKey]++
              scheduleFlash(x, z)
              removeJob(x, z, true)
              state.gameStats.minesCompleted++
            } else if (isBushOn(x, z)) {
              const picked = grabBushAt(x, z)
              state.resources.berries += picked
              state.gameStats.totalBerriesHarvested += picked
              scheduleFlash(x, z)
              removeJob(x, z, true)
              state.gameStats.minesCompleted++
            } else {
              // Voxel terrain nu : le mineur retire la couche du dessus.
              const k = z * GRID + x
              const top = state.cellTop[k]
              if (top > MIN_STRATES && top > SHALLOW_WATER_LEVEL) {
                const idx = state.instanceIndex[z * GRID + x] ? state.instanceIndex[z * GRID + x][top - 1] : -1
                if (idx >= 0) {
                  state.instanced.setMatrixAt(idx, HIDDEN_MATRIX)
                  state.instanced.instanceMatrix.needsUpdate = true
                  if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
                  state.cellTop[k] = top - 1
                  incrStockForBiome(state.cellBiome[k])
                  scheduleFlash(x, z)
                }
              }
              removeJob(x, z, true)
              state.gameStats.minesCompleted++
            }
          }
          this.targetJob = null
        }
        if (this.targetBuildJob) {
          const { x, z } = this.targetBuildJob
          const top = state.cellTop[z * GRID + x]
          if (top < MAX_STRATES && consumeBuildStock()) {
            const biome = state.cellBiome[z * GRID + x]
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
            state.cellTop[z * GRID + x] = newY + 1
            state.instanced.instanceMatrix.needsUpdate = true
            if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
            const k = jobKey(x, z)
            const m = state.buildMarkers.get(k)
            if (m) { m.parent.remove(m); state.buildMarkers.delete(k) }
            state.buildJobs.delete(k)
          } else {
            this.targetBuildJob.claimedBy = null
          }
          this.targetBuildJob = null
        }
        if (this.targetBush) {
          const bush = this.targetBush
          const picked = bush.berries
          if (picked > 0) {
            bush.berries = 0
            // Lot B : toute baie prelevee du buisson est comptee dans
            // totalBerriesHarvested, que le colon la mange sur place ou la
            // ramene au stock. La quete "recolter N baies" suit la cueillette
            // reelle, pas le stock disponible.
            state.gameStats.totalBerriesHarvested += picked
            // Lot B : si la tache courante est EAT_SEEK_FOOD, le colon mange
            // sur place et les baies ne rentrent pas au stock. Sinon il
            // ramene tout au stock, comportement normal de cueilleur.
            const eating = this.currentTask && this.currentTask.kind === TASK_KIND.EAT_SEEK_FOOD
            if (eating) {
              // Baisse la faim data-driven via needs.json satisfied_by[berries].amount.
              // 1 baie consommee = amount / 20 points de faim en moins. Si le
              // JSON change, le gameplay suit sans retoucher le code.
              const need = (NEEDS_DATA && NEEDS_DATA.needs) ? NEEDS_DATA.needs.find(n => n.id === 'hunger') : null
              const entry = need && Array.isArray(need.satisfied_by)
                ? need.satisfied_by.find(s => s.resource === 'berries')
                : null
              if (entry && this.needs) {
                const perBerry = (entry.amount || 0) / 20
                const cur = this.needs.get('hunger') || 0
                this.needs.set('hunger', Math.max(0, cur - perBerry * picked))
              }
            } else {
              state.resources.berries += picked
            }
            refreshBushBerries(bush)
            bush.regenTimer = 0
          }
          bush.claimedBy = null
          this.targetBush = null
        }
        // Purge la tache courante a la fin du WORKING.
        this.currentTask = null
        this.state = 'IDLE'
        this.path = null
        this.group.position.set(this.tx, this.ty, this.tz)
      }
    }
  }

  dispose() {
    scene.remove(this.group)
    scene.remove(this.line)
    this.group.traverse(o => { if (o.material) o.material.dispose?.(); if (o.geometry) o.geometry.dispose?.() })
    this.lineGeo.dispose()
    this.lineMat.dispose()
    this.bubbleTex.dispose()
    this.bubbleMat.dispose()
    this.labelTex.dispose()
    this.labelMat.dispose()
  }
}

export function findSpawn() {
  const cx = Math.floor(GRID / 2), cz = Math.floor(GRID / 2)
  for (let r = 0; r < 12; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, z = cz + dz
        if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue
        const top = state.cellTop[z * GRID + x]
        if (top >= 2 && top <= 4 && state.cellBiome[z * GRID + x] !== 'sand') {
          return { x, z }
        }
      }
    }
  }
  for (let r = 0; r < GRID; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, z = cz + dz
        if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue
        if (state.cellTop[z * GRID + x] > SHALLOW_WATER_LEVEL) return { x, z }
      }
    }
  }
  return { x: cx, z: cz }
}

export function spawnColonist(x, z, opts) {
  const id = state.colonists.length
  const c = new Colonist(id, x, z, opts)
  state.colonists.push(c)
  // Assigner la maison la plus proche
  let nearestHouse = null
  let nearestDist = Infinity
  for (const h of (state.houses || [])) {
    const d = Math.abs(h.x - x) + Math.abs(h.z - z)
    if (d < nearestDist) { nearestDist = d; nearestHouse = h }
  }
  if (nearestHouse) {
    c.homeId = nearestHouse.id
    if (!nearestHouse.residents) nearestHouse.residents = []
    nearestHouse.residents.push(c.id)
  } else {
    c.homeId = null
  }
  return c
}

export function clearColonists() {
  for (const c of state.colonists) c.dispose()
  state.colonists.length = 0
  state.usedNames.clear()
}

export function spawnColonsAroundHouse(hx, hz, count) {
  const spawned = []
  const tried = new Set()
  // Lot B : tout colon qui spawn autour d une maison recoit cette maison
  // comme assignedBuildingId. needs.js l utilise pour le besoin shelter.
  // On choisit l id de batiment habitation le plus courant a l age I : "cabane".
  // La maison proto actuelle est encore placee par placements.addHouse sans
  // id explicite, mais le colon a juste besoin de savoir qu il est assigne
  // a une habitation pour ne pas etre Sans-abri.
  const shelterId = 'cabane'
  for (let r = 1; r <= 2 && spawned.length < count; r++) {
    for (let dz = -r; dz <= r && spawned.length < count; dz++) {
      for (let dx = -r; dx <= r && spawned.length < count; dx++) {
        if (dx === 0 && dz === 0) continue
        const x = hx + dx, z = hz + dz
        if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue
        const k = z * GRID + x
        if (tried.has(k)) continue
        tried.add(k)
        const top = state.cellTop[k]
        if (top <= SHALLOW_WATER_LEVEL) continue
        if (isCellOccupied(x, z)) continue
        let occ = false
        for (const c of state.colonists) if (c.x === x && c.z === z) { occ = true; break }
        if (occ) continue
        const c = spawnColonist(x, z)
        if (c) c.assignedBuildingId = shelterId
        spawned.push({ x, z })
      }
    }
  }
  while (spawned.length < count) {
    const fx = Math.max(0, Math.min(GRID - 1, hx + spawned.length))
    const fz = Math.max(0, Math.min(GRID - 1, hz))
    const c = spawnColonist(fx, fz)
    if (c) c.assignedBuildingId = shelterId
    spawned.push({ x: fx, z: fz })
  }
  return spawned
}
