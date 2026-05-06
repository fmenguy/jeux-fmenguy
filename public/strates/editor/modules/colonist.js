import * as THREE from 'three'
import {
  GRID, MIN_STRATES, MAX_STRATES, WATER_LEVEL, SHALLOW_WATER_LEVEL,
  COLONIST_SPEED, WORK_DURATION, HARVEST_DURATION, HARVEST_RADIUS, GRAVITY,
  FORGE_CRAFT_DURATION,
  UNASSIGNED_PRODUCTIVITY_MUL,
  GENDER_SYMBOLS, GENDER_COLORS,
  CHIEF_COLOR, COL, ORE_TO_STOCK, RESEARCH_TICK,
  RAW_MEAT_SATIETY, COOKED_MEAT_SATIETY,
  MAX_BUILDER_DISTANCE, STAR_COLONIST_CHANCE,
  IDLE_SPEECH_COOLDOWN,
  FOG_VISION_RADIUS_DEFAULT, FOG_VISION_RADIUS_EXPLORER, FOG_VISION_CARTOGRAPHY_BONUS
} from './constants.js'
import {
  MALE_NAMES, FEMALE_NAMES, SPEECH_LINES, SPEECH_LINES_INSISTENT, SPEECH_LINES_BY_NAME
} from './gamedata.js'
import { state } from './state.js'
import { scene, camera, tmpObj, tmpColor, HIDDEN_MATRIX } from './scene.js'
import { topVoxelIndex, colorForLayer, isDeepWater, revealAround } from './terrain.js'
import { aStar, findApproach, findBuildSlot } from './pathfind.js'
import { jobKey, removeJob } from './jobs.js'
import { dlog } from './debug.js'
import {
  findResearchBuildingById, isCellOccupied, extractOreAt, chopTreeAt, isTreeOn,
  isRockOn, collectRockAt, isBushOn, grabBushAt, isOreOn,
  findWheatFieldById, releaseFromWheatFields, completeUpgrade, transformField,
  makeHomeRef, resolveHomeBuilding
} from './placements.js'
import { findNearestBush, refreshBushBerries, isObservatoryOn, enterObservatory, releaseFromObservatory, OBSERVATORY_CAPACITY } from './placements.js'
import { techUnlocked, classifyMineableBlock, canMineResource } from './tech.js'
import { totalBuildStock, consumeBuildStock, incrStockForBiome } from './stocks.js'
import { makeBubbleCanvas, drawBubble, makeLabelCanvas, drawLabel } from './bubbles.js'
import { activeSpeakers } from './speech.js'
import { initColonistNeeds, isNeedCritical } from './needs.js'
import { getGlobalSpeedFactor } from './productivity.js'
import { NEEDS_DATA, JOBS_DATA, BUILDINGS_DATA } from './gamedata.js'
import { showHudToast } from './ui/research-popup.js'
// tasks.js : file de taches, utilisee ici pour marquer la tache courante.
import { PRIORITY, TASK_KIND } from './tasks.js'

export const COLONIST_COLORS = [0xffcf6b, 0x6bd0ff, 0xff8a8a, 0xb78aff, 0x8aff9c, 0xffa07a, 0x98ddca]

function _randSkill() { return Math.floor(Math.random() * 5) + 1 }

// Lot B : helper d acces au job par id, lecture des donnees JSON via gamedata.
function jobOf(professionId) {
  if (!professionId || !JOBS_DATA || !Array.isArray(JOBS_DATA.jobs)) return null
  return JOBS_DATA.jobs.find(j => j.id === professionId) || null
}
const PROFESSION_TO_KIND = {
  bucheron:           'hache',
  mineur:             'pick',
  cueilleur:          'mine',
  chasseur:           'hunt',
  // Lot B age 2 : nouveaux metiers cables sur les memes "kinds" de jobs.
  // bucheron-bronze utilise le meme kind 'hache' (multiplicateur applique
  // dans le bloc WORKING). fermier et forgeron n ont pas de job cellule
  // (ils travaillent sur des batiments dedies, pas sur la grille).
  'bucheron-bronze':  'hache',
  forgeron:           'forge'
}

// Lot B age 2 : helper utilitaire centralise pour le forgeron. Le metier est
// pose par la modale population avec profession === 'forgeron'. Aucun ancien
// alias a supporter (metier introduit a l age 2).
export function isForgeronActive(c) {
  return !!(c && c.profession === 'forgeron')
}

// Lot B age 2 : helper utilitaire centralise pour la detection du metier
// fermier. La modale de population peut poser soit profession === 'fermier'
// (jobs.json age 2) soit l ancien couple ('agriculteur', 'farmer') laisse
// par compat. On accepte les deux pour ne rien casser cote UI.
function isFarmerActive(c) {
  if (!c) return false
  if (c.profession === 'fermier') return true
  if (c.profession === 'agriculteur' && c.assignedJob === 'farmer') return true
  return false
}

// Lot B age 2 : helper bucheron, accepte le bucheron starter (axe-stone) et
// le bucheron bronze (axe-bronze). Pour le multiplicateur de yield, voir le
// bloc WORKING qui detecte profession === 'bucheron-bronze' explicitement.
function isWoodcutterActive(c) {
  if (!c) return false
  if (c.profession === 'bucheron' && c.assignedJob === 'woodcutter') return true
  if (c.profession === 'bucheron-bronze') return true
  return false
}

// Lot B (explorateur) : rayon de vision du colon pour la revelation du fog.
// Explorateur beneficie d une vision elargie (14 au lieu de 8), avec bonus
// cartography si la tech est debloquee (x1.5 = 21).
function getColonistVisionRadius(colonist) {
  if (colonist.profession === 'explorateur') {
    const radius = FOG_VISION_RADIUS_EXPLORER
    return techUnlocked('cartography') ? radius * FOG_VISION_CARTOGRAPHY_BONUS : radius
  }
  return FOG_VISION_RADIUS_DEFAULT
}

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

// Lot B : retourne la taille (w x d) du footprint d un chantier en cours, en
// inspectant le tableau dans state qui le contient. Defaut : 1x1.
// Bati en dur car les footprints sont fixes par type de batiment (cf.
// placements.js). Future evolution : champ explicit footprint sur l entree.
function getSiteFootprint(site) {
  if (!site) return { w: 1, d: 1 }
  if (state.bigHouses && state.bigHouses.indexOf(site) !== -1) return { w: 4, d: 4 }
  if (state.manors && state.manors.indexOf(site) !== -1) return { w: 2, d: 2 }
  if (state.wheatFields && state.wheatFields.indexOf(site) !== -1) return { w: 2, d: 2 }
  return { w: 1, d: 1 }
}

// Lot B : satiete par unite consommee, lue dans needs.json (satisfied_by).
// Fallback sur les constantes RAW_MEAT_SATIETY / COOKED_MEAT_SATIETY si la
// donnee est absente. La logique des baies (amount/20) reste a part car les
// baies sont prelevees en pile sur un buisson.
function hungerReductionFor(resourceId) {
  const need = (NEEDS_DATA && NEEDS_DATA.needs)
    ? NEEDS_DATA.needs.find(n => n.id === 'hunger')
    : null
  if (need && Array.isArray(need.satisfied_by)) {
    const entry = need.satisfied_by.find(s => s.resource === resourceId)
    if (entry && typeof entry.amount === 'number') return entry.amount
  }
  if (resourceId === 'cooked-meat') return COOKED_MEAT_SATIETY
  if (resourceId === 'raw-meat')    return RAW_MEAT_SATIETY
  return 0
}

// Lot B : consomme 1 unite de viande (cuite si dispo, sinon crue) pour
// satisfaire la faim. Retourne true si une consommation a eu lieu. Action
// instantanee (pas de deplacement) car la viande est portee depuis les stocks
// communs. La cuite est preferee : meilleure satiete et pas de risque.
function tryEatMeatFromStocks(colonist) {
  if (!colonist || !colonist.needs) return false
  const have = (id) => (state.resources[id] || 0) > 0
  let consumed = null
  if (have('cooked-meat')) consumed = 'cooked-meat'
  else if (have('raw-meat')) consumed = 'raw-meat'
  if (!consumed) return false
  state.resources[consumed] -= 1
  const reduction = hungerReductionFor(consumed)
  const cur = colonist.needs.get('hunger') || 0
  colonist.needs.set('hunger', Math.max(0, cur - reduction))
  return true
}

// ============================================================================
// Lot B house utility (sommeil, reproduction)
// ----------------------------------------------------------------------------
// Le repos nocturne envoie chaque resident d une maison sur la cellule de sa
// cabane des le passage en mode nuit. Pendant SLEEP, rested monte 3x plus vite
// que dehors (au foyer commun). Au lever du jour, le colon repart en IDLE.
// Si rested > 0.7, productivite x1.15 (cf. productivity.js et needs.js).
//
// Reproduction : si deux partenaires (partnerId reciproque) habitent la meme
// maison et qu il reste de la place (residents.length < residentsCapacity),
// reproductionTimer monte d 1 a chaque transition jour vers nuit. A 30, un
// nouveau colon adulte spawne aupres de la maison, residents recoivent un toast
// HUD "Nouveau ne". Capacite pleine, le compteur stagne (pas d incrementation).
// ============================================================================

// Vitesse de variation du repos. Valeurs en unites par seconde.
// Un colon dehors la nuit (sans-abri ou repli foyer commun) recupere a
// REST_RATE_OUTDOOR ; sous toit, on multiplie par 3 (REST_RATE_INDOOR).
// La descente diurne pendant le travail est calee pour qu un colon repose a
// 0.7 baisse en environ 8 minutes de travail continu.
const REST_RATE_INDOOR  = 0.025   // par seconde, sous toit (sleep en cabane)
const REST_RATE_OUTDOOR = REST_RATE_INDOOR / 3  // par seconde, dehors
const FATIGUE_RATE_WORK = 0.008   // par seconde, en travail/construction
const REST_BONUS_THRESHOLD = 0.7
const REST_BONUS_FACTOR    = 1.15
const REPRODUCTION_TARGET  = 30   // points (1 par jour)

// Retourne le facteur de productivite lie au repos (1.15 si bien repose).
// Expose pour productivity.js et needs.js. Plancher 1.0 (pas de malus).
export function restedFactor(colonist) {
  if (!colonist) return 1.0
  const r = (typeof colonist.rested === 'number') ? colonist.rested : 0.5
  return r > REST_BONUS_THRESHOLD ? REST_BONUS_FACTOR : 1.0
}

// Resout la cellule de couchage d un colon (centre de sa maison). Retourne
// null s il n a pas de homeBuildingId valide. La cellule est calee sur le
// coin (x, z) du batiment ; pour big-house/manoir on prend le centre 4x4 / 2x2.
function getHomeSleepCell(colonist) {
  if (!colonist || !colonist.homeBuildingId) return null
  const r = resolveHomeBuilding(colonist.homeBuildingId)
  if (!r || !r.building) return null
  const b = r.building
  if (b.isUnderConstruction) return null
  if (r.kind === 'big-house') return { x: b.x + 1, z: b.z + 1, building: b, kind: r.kind }
  if (r.kind === 'manor')     return { x: b.x + 1, z: b.z + 1, building: b, kind: r.kind }
  return { x: b.x, z: b.z, building: b, kind: r.kind }
}

// Lot B house utility : tick global appele par main.js apres tickAllNeeds.
// Detecte la transition jour vers nuit (compute une fois pour toute la
// colonie) et met a jour le compteur de reproduction. Le retour a la maison
// individuel est gere dans Colonist.update via _prevIsNight.
let _prevIsNightGlobal = null
export function tickHousing(_dt) {
  const cur = !!state.isNight
  if (_prevIsNightGlobal === null) { _prevIsNightGlobal = cur; return }
  // Top de transition jour vers nuit : un seul declenchement reproduction.
  if (!_prevIsNightGlobal && cur) {
    tickReproduction()
  }
  _prevIsNightGlobal = cur
}

// Examine chaque couple cohabitant et fait avancer reproductionTimer. Les deux
// partenaires partagent la meme valeur (synchronisation symetrique). A
// REPRODUCTION_TARGET, on fait naitre un nouveau colon dans la maison si elle
// a encore de la place et on remet a zero.
function tickReproduction() {
  if (!Array.isArray(state.colonists)) return
  const seen = new Set()
  for (const c of state.colonists) {
    if (!c || c.partnerId == null) continue
    if (seen.has(c.id)) continue
    const partner = state.colonists.find(p => p && p.id === c.partnerId)
    if (!partner) continue
    seen.add(c.id); seen.add(partner.id)
    // Cohabitation requise.
    if (!c.homeBuildingId || c.homeBuildingId !== partner.homeBuildingId) continue
    const ref = resolveHomeBuilding(c.homeBuildingId)
    if (!ref || !ref.building) continue
    const b = ref.building
    if (b.isUnderConstruction) continue
    const cap = (typeof b.residentsCapacity === 'number') ? b.residentsCapacity : 2
    const cur = Array.isArray(b.residents) ? b.residents.length : 0
    // Capacite pleine : on stagne, pas d incrementation.
    if (cur >= cap) continue
    const next = (c.reproductionTimer || 0) + 1
    c.reproductionTimer = next
    partner.reproductionTimer = next
    if (next >= REPRODUCTION_TARGET) {
      c.reproductionTimer = 0
      partner.reproductionTimer = 0
      _spawnChildAt(b, ref.kind, c, partner)
    }
  }
}

function _spawnChildAt(building, kind, parentA, parentB) {
  // Cherche une cellule libre adjacente au coin (building.x, building.z).
  const baseX = building.x
  const baseZ = building.z
  let sx = baseX, sz = baseZ
  let found = false
  outer:
  for (let r = 1; r <= 3; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dz === 0) continue
        const x = baseX + dx, z = baseZ + dz
        if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue
        const top = state.cellTop[z * GRID + x]
        if (top <= SHALLOW_WATER_LEVEL) continue
        if (isCellOccupied(x, z)) continue
        let occ = false
        for (const cc of state.colonists) if (cc.x === x && cc.z === z) { occ = true; break }
        if (occ) continue
        sx = x; sz = z; found = true; break outer
      }
    }
  }
  if (!found) { sx = baseX; sz = baseZ }
  const child = spawnColonist(sx, sz, {})
  if (!child) return
  // Lien residence : ajoute aux residents si la place existe encore.
  if (!Array.isArray(building.residents)) building.residents = []
  const cap = (typeof building.residentsCapacity === 'number') ? building.residentsCapacity : 2
  if (building.residents.length < cap) {
    building.residents.push(child.id)
    child.homeBuildingId = makeHomeRef(kind, building)
    const shelterId = kind === 'big-house' ? 'big-house' : (kind === 'manor' ? 'manor' : 'cabane')
    child.assignedBuildingId = shelterId
  }
  // Toast HUD pour les deux parents.
  try {
    const nameA = parentA && parentA.name ? parentA.name : 'colon'
    const nameB = parentB && parentB.name ? parentB.name : 'colon'
    showHudToast('Nouveau ne chez ' + nameA + ' et ' + nameB + '.', 4000)
  } catch (_) {}
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
    // Lot B : foyer cible pour aller cuire de la viande (LEISURE).
    this.targetFoyer = null
    // Lot B age 2 (forgeron) : forge cible quand un colon forgeron part allier
    // cuivre et etain en bronze. null tant qu il n a pas trouve de forge libre
    // ou qu il manque de matieres premieres (>= 2 copper + 1 tin).
    this.targetForge = null
    this.targetBuildJob = null
    // Lot B : chantier cible quand le colon est constructeur. Mis a null
    // quand le batiment est termine ou inaccessible.
    this.targetConstructionSite = null
    // Lot B : slot de travail (cellule autour du chantier) attribue a ce
    // colon. Permet plusieurs constructeurs sans superposition (style AoE).
    this.builderSlot = null
    // Lot B : flag pose par pickObservatory pour indiquer que le path en cours
    // mene vers un promontoire d observation. Permet de ne pas annuler le
    // chemin a la moindre apparition de job (cf. branche MOVING) et de basculer
    // proprement en IDLE en fin de path sans repasser par WORKING.
    this.observatoryTarget = false
    // Lot B : reference vers l entry promontoire ciblee (cf. pickObservatory).
    // Sert a l arrivee pour declencher enterObservatory et masquer le mesh.
    this.observatoryTargetEntry = null
    // Lot B : true tant que le mesh du colon est cache (caché dans un
    // promontoire la nuit). Restaure a false par releaseFromObservatory.
    this.isHidden = false
    this.workTimer = 0
    this.huntTimer = 0
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
    // Lot B : timestamp (secondes) de la derniere bulle "idle metier" pour
    // throttler a IDLE_SPEECH_COOLDOWN. Runtime only, pas persiste.
    this._lastIdleSpeechAt = 0
    this.researchBuildingId = null
    // Lot B fermier : id du champ de ble auquel ce colon est attache (1 max).
    // null tant qu il n est pas agriculteur ou qu aucun champ libre n existe.
    this.assignedFieldId = null
    // Lot B (explorateur) : cible courante de l explorateur, cellule {x,z}
    // non encore revelee vers laquelle il marche. null hors metier ou apres
    // arrivee. Le toast "monde entierement explore" est garde a un par colon
    // via _toldAllRevealed (runtime, non persiste).
    this.explorationTarget = null
    this._toldAllRevealed = false
    // Lot B (two-stage field) : si vrai, la cible courante est un champ sauvage
    // a transformer (state FARMING_TRANSFORM, 30s). Sinon la cible est un champ
    // cultive a exploiter (state FARMING). Reset au reload.
    this._fieldTransformTarget = false
    this.farmingTransformTimer = 0
    this.lastContextLine = null
    this.favorite = false
    // Lot B : flag "etoile" (5% au spawn par maison construite). Affecte
    // potentiellement l UI population et les bulles. Par defaut faux.
    this.isStar = false
    // Lot B, moteur comportemental
    this.needs = new Map()
    this.jobQueue = []                   // tableau de Task, priorite decroissante
    this.currentTask = null              // Task en cours d execution
    this.assignedBuildingId = null       // Cabane pour dormir, Hutte du sage pour bosser
    // Lot B residents : reference vers l instance d habitation precise (cabane,
    // grosse cabane, manoir) du colon. Forme "kind:id" via makeHomeRef.
    // Distinct de assignedBuildingId qui est un id de buildings.json (string).
    // null si SANS-ABRI (apres demolition de la maison ou colon orphelin).
    this.homeBuildingId = null
    // Lot B residents : id du colon partenaire (couple). Symetrique. null par
    // defaut. Casse a la mort d un des deux ou a la demolition.
    this.partnerId = null
    // Lot B house utility : etat de repos (0..1). Monte pendant SLEEP, baisse
    // pendant le travail. Au-dela de 0.7 le colon beneficie d un bonus de
    // productivite (cf. productivity.js et needs.js computeProductivityMul).
    this.rested = 0.5
    // Lot B house utility : compteur de reproduction des couples cohabitant.
    // Incremente d 1 a chaque debut de nuit si conditions reunies. A 30, un
    // enfant naitra (spawn colon adulte) et le compteur est remis a zero.
    this.reproductionTimer = 0
    // Lot B house utility : derniere phase jour/nuit vue par ce colon. Sert
    // a detecter la transition jour vers nuit pour declencher le retour a la
    // maison (logique SLEEP) sans relire l etat global a chaque tick.
    this._prevIsNight = !!state.isNight
    this.productivityMul = 1.0           // expose en lecture pour le cablage par placements.js et tech.js (post-Lot-B)
    // Lot B (mode mixte) : flag mis par pickJob/pickHarvest quand le colon
    // prend une tache basique (cueillette, minage pierre) sans avoir la
    // profession adequate. Applique UNASSIGNED_PRODUCTIVITY_MUL en WORKING.
    this._unassignedTask = false
    this.wasAttacked = false             // flag pour le besoin Blesse
    // Champs vus par la vue Population (population-modal.js)
    this.hp    = 80
    this.mor   = 70
    this.faim  = 60
    this.age   = Math.floor(18 + Math.random() * 28)  // 18-45
    this.profession = null
    this.skills = {
      gathering: _randSkill(),
      logging:   _randSkill(),
      mining:    _randSkill(),
      research:  _randSkill(),
      hunting:   _randSkill(),
      building:  _randSkill()
    }
    this.researchXpTimer = 0
    initColonistNeeds(this)
    if (opts && opts.restore) {
      const r = opts.restore
      this.gender = r.gender || 'M'
      this.name = r.name
      state.usedNames.add(this.name)
      this.isChief = !!r.isChief
      this.researchBuildingId = r.researchBuildingId != null ? r.researchBuildingId : null
      this.favorite = !!r.favorite
      this.isStar = !!r.isStar
      if (typeof r.ty === 'number') this.ty = r.ty
      if (r.state) this.state = r.state
      if (typeof r.hp    === 'number') this.hp    = r.hp
      if (typeof r.mor   === 'number') this.mor   = r.mor
      if (typeof r.faim  === 'number') this.faim  = r.faim
      if (typeof r.age   === 'number') this.age   = r.age
      if (r.skills && typeof r.skills === 'object') Object.assign(this.skills, r.skills)
      if (r.profession !== undefined) this.profession = r.profession
      if (r.assignedJob !== undefined) this.assignedJob = r.assignedJob
      if (typeof r.assignedFieldId === 'number') this.assignedFieldId = r.assignedFieldId
      // Lot B age 2 (forgeron) : restore de la cible forge {x,z}. On retrouve
      // l entry vivante dans state.forges par coordonnees, sinon null. L etat
      // du colon est de toute facon force a IDLE par serializeSnapshot, donc
      // ce champ n est utile que si une logique future l observe au reload.
      if (r.targetForge && typeof r.targetForge.x === 'number' && typeof r.targetForge.z === 'number') {
        const tf = (state.forges || []).find(f => f.x === r.targetForge.x && f.z === r.targetForge.z) || null
        this.targetForge = tf
      }
      // Lot B (explorateur) : restore d une cible si toujours non revelee, sinon
      // reset (le pickExplorationTarget en IDLE refera le travail).
      if (r.explorationTarget && typeof r.explorationTarget.x === 'number' && typeof r.explorationTarget.z === 'number') {
        const k = r.explorationTarget.z * GRID + r.explorationTarget.x
        if (state.cellRevealed && !state.cellRevealed[k]) {
          this.explorationTarget = { x: r.explorationTarget.x, z: r.explorationTarget.z }
        } else {
          this.explorationTarget = null
        }
      }
      // Lot B : restaure l assignation de bati si presente dans la save,
      // sinon suppose qu il y avait au moins une maison (la save implique
      // que le hameau initial a ete cree).
      if (r.assignedBuildingId) this.assignedBuildingId = r.assignedBuildingId
      else if (state.houses && state.houses.length > 0) this.assignedBuildingId = 'cabane'
      // Lot B residents : reference d habitation precise et lien social couple.
      if (typeof r.homeBuildingId === 'string') this.homeBuildingId = r.homeBuildingId
      if (typeof r.partnerId === 'number') this.partnerId = r.partnerId
      // Lot B house utility : restaure repos et compteur de reproduction.
      if (typeof r.rested === 'number') this.rested = Math.max(0, Math.min(1, r.rested))
      if (typeof r.reproductionTimer === 'number') this.reproductionTimer = Math.max(0, r.reproductionTimer)
    } else if (opts && opts.forceName) {
      this.gender = opts.forceGender || 'M'
      this.name = opts.forceName
      state.usedNames.add(this.name)
      this.isChief = !!opts.isChief
    } else {
      // Lot B residents : permet de forcer le genre pour appairer des couples
      // M/F dans une cabane sans avoir a fournir un forceName explicite.
      this.gender = (opts && opts.forceGender) ? opts.forceGender : (Math.random() < 0.5 ? 'M' : 'F')
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

    // Chapeau de metier : visible quand assignedJob != null et que le colon
    // n est pas Chief. Couleur = job.color (jobs.json, fournie par Lot A).
    // Forme : cone bas-poly voxel (8 segments, flatShading) au-dessus de la tete.
    this._hatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, flatShading: true })
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.32, 8), this._hatMat)
    hat.position.y = 1.66
    hat.castShadow = true
    hat.visible = false
    this._hat = hat
    this.group.add(hat)

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
    this.bubble.scale.set(3.4, 1.1, 1)
    this.bubble.position.set(0, 2.95, 0)
    this.bubble.visible = false
    this.bubble.renderOrder = 999
    this.group.add(this.bubble)
    this.labelCanvas = makeLabelCanvas()
    drawLabel(this.labelCanvas, this.name, this.gender, this.isChief)
    this.labelTex = new THREE.CanvasTexture(this.labelCanvas)
    this.labelTex.minFilter = THREE.LinearFilter
    this.labelMat = new THREE.SpriteMaterial({ map: this.labelTex, transparent: true, depthTest: false, depthWrite: false })
    this.label = new THREE.Sprite(this.labelMat)
    this.label.scale.set(1.4, 0.35, 1)
    this.label.position.set(0, 1.85, 0)
    this.label.visible = true
    this.label.renderOrder = 998
    this.group.add(this.label)

    // Arc du chasseur (cache par defaut)
    const bowGroup = new THREE.Group()
    const handleGeo = new THREE.BoxGeometry(0.04, 0.35, 0.04)
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    const handle = new THREE.Mesh(handleGeo, woodMat)
    handle.position.set(0, 0, 0)
    bowGroup.add(handle)
    const stringGeo = new THREE.BoxGeometry(0.01, 0.30, 0.01)
    const stringMat = new THREE.MeshLambertMaterial({ color: 0xcccccc })
    const bowString = new THREE.Mesh(stringGeo, stringMat)
    bowString.position.set(0.06, 0, 0)
    bowGroup.add(bowString)
    bowGroup.position.set(0.25, 0.1, 0)
    bowGroup.visible = false
    this.group.add(bowGroup)
    this._bowGroup = bowGroup

    this.updateHat()
  }

  // Met a jour le chapeau de metier selon assignedJob/profession/isChief.
  // Appele en fin de constructeur (couvre new spawn ET restore via opts.restore)
  // et apres chaque changement d assignation (population-modal).
  updateHat() {
    if (!this._hat || !this._hatMat) return
    if (this.isChief) { this._hat.visible = false; return }
    if (!this.assignedJob || !this.profession) { this._hat.visible = false; return }
    const jobs = (JOBS_DATA && JOBS_DATA.jobs) || []
    const job = jobs.find(j => j.id === this.profession)
    if (!job || !job.color) { this._hat.visible = false; return }
    this._hatMat.color.set(job.color)
    this._hat.visible = true
  }

  // Lot B : evalue si le metier assigne a ce colon n a aucune cible exploitable
  // a l instant present. Sert a declencher les bulles idleSpeech dans l etat
  // IDLE quand le colon est employe mais sans travail possible. Lecture seule.
  _hasNoTaskForProfession() {
    switch (this.profession) {
      case 'chercheur': {
        if (!state.activeResearch) return true
        const huts = state.researchHouses || []
        if (huts.length === 0) return true
        return huts.every(h => h.isUnderConstruction === true)
      }
      case 'bucheron': {
        const trees = state.trees || []
        if (trees.length === 0) return true
        for (const t of trees) {
          if (t.growth >= 0.66 && !state.jobs.has(jobKey(t.x, t.z))) return false
        }
        return true
      }
      case 'mineur': {
        const ores = state.ores || []
        if (ores.length === 0) return true
        for (const o of ores) {
          if (o.isUnderConstruction) continue
          if (state.jobs.has(jobKey(o.x, o.z))) continue
          const block = classifyMineableBlock ? classifyMineableBlock(o.x, o.z) : null
          if (canMineResource(this, block, o.altitude != null ? o.altitude : 0)) return false
        }
        return true
      }
      case 'cueilleur': {
        const bushes = state.bushes || []
        for (const b of bushes) {
          if (b.berries > 0) return false
        }
        return true
      }
      case 'chasseur': {
        const deers = state.deers || []
        for (const d of deers) {
          if (!d.dead) return false
        }
        return true
      }
      case 'constructeur': {
        const lists = [
          state.foyers, state.houses, state.bigHouses, state.researchHouses,
          state.observatories, state.cairns, state.wheatFields, state.manors
        ]
        for (const arr of lists) {
          if (!arr) continue
          for (const b of arr) if (b && (b.isUnderConstruction || b.isUnderUpgrade)) return false
        }
        return true
      }
      case 'agriculteur': {
        if (!techUnlocked('wheat-field')) return true
        const fields = state.wheatFields || []
        if (fields.length === 0) return true
        for (const f of fields) {
          if (!f || f.isUnderConstruction) continue
          const ids = Array.isArray(f.assignedColonistIds) ? f.assignedColonistIds : []
          if (ids.length === 0) return false
          if (ids.indexOf(this.id) !== -1) return false
        }
        return true
      }
      case 'forgeron': {
        // Aucune tache si pas de forge construite ou stocks insuffisants
        // (moins de 2 copper ou moins de 1 tin).
        const forges = state.forges || []
        if (forges.length === 0) return true
        const hasReady = forges.some(f => f && !f.isUnderConstruction && !f.isUnderUpgrade)
        if (!hasReady) return true
        if ((state.stocks.copper || 0) < 2) return true
        if ((state.stocks.tin || 0) < 1) return true
        return false
      }
      case 'explorateur': {
        if (!state.cellRevealed) return false
        for (const revealed of state.cellRevealed) {
          if (!revealed) return false
        }
        return true
      }
      default:
        return false
    }
  }

  say(line, isHint, opts) {
    this.lastLine = line
    this.lastLineHint = !!isHint
    this._bubbleOpts = opts || null
    this._bubbleTruncated = null
    const { bw, bh } = drawBubble(this.bubbleCanvas, line, !!isHint, opts)
    this.bubbleTex.needsUpdate = true
    // Conversion canvas → world : la résolution texture est 768×240 pixels.
    // Les coefficients 4.5 et 1.05 dimensionnent le sprite en unités world
    // pour une bulle parfaitement lisible à distance caméra normale (~16 u).
    this._bubbleBaseW = Math.max(1.8, (bw / 768) * 4.5)
    this._bubbleBaseH = Math.max(0.6, (bh / 240) * 1.05)
    this.bubble.scale.set(this._bubbleBaseW, this._bubbleBaseH, 1)
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

    // Scale ∝ distance : compense la perspective pour garder la bulle lisible
    // même quand la caméra est loin. Min 0.95 pour ne pas trop rétrécir au
    // zoom rapproché, max 4.5 pour permettre vraiment de grandir en vue dézoomée.
    // Référence dist=16 → zoomFactor=1.
    const zoomFactor = Math.max(0.95, Math.min(4.5, dist / 16))
    const baseW = this._bubbleBaseW || 3.4
    const baseH = this._bubbleBaseH || 1.1
    this.bubble.scale.set(baseW * zoomFactor, baseH * zoomFactor, 1)
    // Ajuste Y pour que le bas du sprite reste ancré au-dessus de la tête
    this.bubble.position.set(0, 2.5 + (baseH / 2) * zoomFactor, 0)

    // Pas de troncature : la bulle grandit avec la distance, le texte complet
    // doit toujours être lisible. _bubbleTruncated conservé pour compat éventuelle.

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

  // Lot B house utility : appele lors du passage du jour a la nuit.
  // Le colon abandonne tout ordre proactif (bulle, flanerie) et tente de
  // rejoindre son lit. S il a une faim critique, il mange d abord.
  _onNightFall() {
    // Pas de force-stop sur les taches de survie (faim) ni sur les ordres
    // joueur en cours (WORKING). On se contente de reorienter quand le colon
    // sera IDLE. La logique est appelee aussi via _tryGoSleep ci-dessous.
    if (this.state === 'IDLE' && !isNeedCritical(this, 'hunger')) {
      this._tryGoSleep()
    }
  }

  // Lot B house utility : reveil. Si le colon dormait, repasser en IDLE pour
  // que la branche normale reprenne (assignations, bulles, deplacements).
  _onDayBreak() {
    if (this.state === 'SLEEP') {
      this.state = 'IDLE'
      this.path = null
      this.lineGeo.setFromPoints([])
    }
  }

  // Lot B house utility : tente d envoyer le colon vers la cellule de sa
  // maison. Si arrive (Manhattan <= 1), bascule directement en SLEEP. Sinon
  // calcule un chemin (findApproach pour absorber les paliers) et passe
  // MOVING. En cas d echec (pas de home, chemin inaccessible), n agit pas
  // pour laisser la branche IDLE generer un repli (campfire / wander).
  _tryGoSleep() {
    if (!this.homeBuildingId) return false
    const home = getHomeSleepCell(this)
    if (!home) return false
    const d = Math.abs(home.x - this.x) + Math.abs(home.z - this.z)
    if (d <= 1) {
      // Deja a la maison : dort sur place.
      this.state = 'SLEEP'
      this.path = null
      this.lineGeo.setFromPoints([])
      this.group.position.set(this.tx, this.ty, this.tz)
      return true
    }
    const approach = findApproach(this.x, this.z, home.x, home.z)
    if (!approach) return false
    this.path = approach.path
    this.pathStep = 0
    this.state = 'MOVING'
    this.isWandering = false
    // Flag pour faire basculer en SLEEP a l arrivee plutot qu en WORKING.
    this._goingToSleep = true
    this.updateTrail()
    return true
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
    // Lot B : helper local pour verifier le gating skill (roche de montagne
    // pour l instant, etendu aux ressources futures via RESOURCE_MIN_LEVELS).
    const skillGateOk = (j) => {
      const blockType = classifyMineableBlock(j.x, j.z)
      if (!blockType) return true
      return canMineResource(this, blockType, state.cellTop[j.z * GRID + j.x]).ok
    }
    // Lot B (mode mixte) : gating metier strict pour les jobs metier, ouvert
    // pour les jobs basiques. Retourne :
    //   { ok: true, unassigned: false }  professionnel match (pleine vitesse)
    //   { ok: true, unassigned: true }   prend la tache mais a vitesse reduite
    //   { ok: false }                    interdit (job metier strict)
    const professionGate = (j) => {
      // Abattage : reserve aux bucherons
      if (j.kind === 'hache') {
        // Lot B age 2 : bucheron pierre OU bucheron-bronze peuvent abattre.
        const ok = (this.profession === 'bucheron') || (this.profession === 'bucheron-bronze')
        return { ok, unassigned: false }
      }
      // Chasse : reservee aux chasseurs
      if (j.kind === 'hunt') {
        return { ok: this.profession === 'chasseur', unassigned: false }
      }
      // Pioche : pierre basique ouverte a tous, mais filons et roche de
      // montagne reserves aux mineurs (le gating skill bloque deja la roche
      // de montagne sous niveau requis ; on ajoute le gate strict metier sur
      // filons et roche de montagne pour empecher un cueilleur d aller miner
      // un filon).
      if (j.kind === 'pick') {
        const blockType = classifyMineableBlock(j.x, j.z)
        const ore = isOreOn(j.x, j.z)
        const isMetierOnly = (blockType === 'mountain-rock') || ore
        if (isMetierOnly) {
          return { ok: this.profession === 'mineur', unassigned: false }
        }
        // Pierre basique : ouvert a tous
        return { ok: true, unassigned: this.profession !== 'mineur' }
      }
      // Cueillette via job (kind 'mine') : ouvert a tous, malus si non-cueilleur
      if (j.kind === 'mine') {
        return { ok: true, unassigned: this.profession !== 'cueilleur' }
      }
      // Job sans kind explicite : comportement par defaut, ouvert a tous,
      // malus si pas de profession adequate (rare en pratique).
      return { ok: true, unassigned: !this.profession }
    }
    // Premiere passe : preferencer les jobs du type correspondant a la profession
    if (this.profession && PROFESSION_TO_KIND[this.profession]) {
      const prefKind = PROFESSION_TO_KIND[this.profession]
      let best = null, bestD = Infinity
      for (const [, j] of state.jobs) {
        if (j.claimedBy) continue
        if (j.kind !== prefKind) continue
        if (!skillGateOk(j)) continue
        const gate = professionGate(j)
        if (!gate.ok) continue
        const d = Math.abs(j.x - this.x) + Math.abs(j.z - this.z)
        if (d < bestD) { bestD = d; best = j }
      }
      if (best) {
        const approach = findApproach(this.x, this.z, best.x, best.z)
        if (approach) {
          best.claimedBy = this
          this.targetJob = best
          this.path = approach.path
          this.pathStep = 0
          this.state = 'MOVING'
          this.isWandering = false
          this._unassignedTask = false
          this.updateTrail()
          return true
        }
      }
    }
    // Passe normale : tout job disponible (filtre par professionGate)
    let best = null, bestD = Infinity
    let bestUnassigned = false
    for (const [, j] of state.jobs) {
      if (j.claimedBy) continue
      if (!skillGateOk(j)) continue
      const gate = professionGate(j)
      if (!gate.ok) continue
      const d = Math.abs(j.x - this.x) + Math.abs(j.z - this.z)
      if (d < bestD) { bestD = d; best = j; bestUnassigned = gate.unassigned }
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
    this._unassignedTask = bestUnassigned
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
    // Lot B (mode mixte) : la cueillette est ouverte a tous. Un colon non
    // cueilleur la prend a vitesse reduite (UNASSIGNED_PRODUCTIVITY_MUL).
    this._unassignedTask = (this.profession !== 'cueilleur')
    this.updateTrail()
    return true
  }

  // Lot B : LEISURE - cuisson de viande au foyer. Si du raw-meat est dispo,
  // le foyer existe et n est pas deja occupe a cuire, le colon va le rejoindre
  // pour lancer une cuisson. Au contact, il consomme 1 raw-meat et lance le
  // timer du foyer (cf placements.tickFoyers). La production d 1 cooked-meat
  // se fait dans le tick foyer, pas ici.
  pickCookMeat() {
    if (!state.foyers || !state.foyers.length) return false
    if ((state.resources['raw-meat'] || 0) <= 0) return false
    let best = null, bestD = Infinity
    for (const f of state.foyers) {
      if (f.isCooking) continue
      if (f.isUnderConstruction) continue
      const d = Math.abs(f.x - this.x) + Math.abs(f.z - this.z)
      if (d < bestD) { bestD = d; best = f }
    }
    if (!best) return false
    const approach = findApproach(this.x, this.z, best.x, best.z)
    if (!approach) return false
    this.targetFoyer = best
    this.path = approach.path
    this.pathStep = 0
    this.state = 'MOVING'
    this.isWandering = false
    this.updateTrail()
    return true
  }

  // Lot B age 2 (forgeron) : cherche la forge la plus proche et lance un cycle
  // de craft de bronze. Conditions strictes : le colon doit etre forgeron,
  // au moins une forge construite (non en chantier), et les stocks doivent
  // contenir au moins 2 cuivre + 1 etain. Retourne true si un trajet a ete
  // engage (bascule en MOVING), false sinon.
  pickForge() {
    if (!isForgeronActive(this)) return false
    if (!state.forges || !state.forges.length) return false
    if ((state.stocks.copper || 0) < 2) return false
    if ((state.stocks.tin || 0) < 1) return false
    let best = null, bestD = Infinity
    for (const f of state.forges) {
      if (!f) continue
      if (f.isUnderConstruction || f.isUnderUpgrade) continue
      const d = Math.abs(f.x - this.x) + Math.abs(f.z - this.z)
      if (d < bestD) { bestD = d; best = f }
    }
    if (!best) return false
    const approach = findApproach(this.x, this.z, best.x, best.z)
    if (!approach) return false
    this.targetForge = best
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

  // Lot B : OBSERVATEUR (chercheur la nuit). Un colon de profession chercheur
  // rejoint le promontoire d observation le plus proche et s y stationne. Les
  // points nocturnes sont generes par tickDayNight via isColonistOnObservatory()
  // tant que le colon est IDLE sur la cellule du promontoire.
  pickObservatory() {
    if (!state.observatories || !state.observatories.length) return false
    // Deja sur un promontoire : rester IDLE, les points sont generes auto.
    if (isObservatoryOn(this.x, this.z)) return false
    // Lot B : capacite 2 par promontoire. On ne cible qu un promontoire avec
    // une place dispo (en comptant ce colon s il y est deja). Sinon le colon
    // surnumeraire reste IDLE/wander hors promontoire.
    let best = null, bestD = Infinity
    for (const o of state.observatories) {
      if (o.isUnderConstruction) continue
      const occ = Array.isArray(o.occupants) ? o.occupants : []
      const alreadyIn = occ.includes(this.id)
      if (!alreadyIn && occ.length >= OBSERVATORY_CAPACITY) continue
      const d = Math.abs(o.x - this.x) + Math.abs(o.z - this.z)
      if (d < bestD) { bestD = d; best = o }
    }
    if (!best) return false
    // Lot B : on tente d abord d aller pile sur la cellule du promontoire.
    // Si le palier est trop haut (cellTop > MAX_STEP au-dessus du sol voisin)
    // aStar peut retourner null. Dans ce cas on retombe sur findApproach qui
    // cherche une cellule adjacente atteignable (Manhattan = 1, coherent avec
    // isObservatoryOn et isColonistOnObservatory qui tolerent ce voisinage).
    let path = aStar(this.x, this.z, best.x, best.z)
    if (!path) {
      const approach = findApproach(this.x, this.z, best.x, best.z)
      if (approach) path = approach.path
    }
    if (!path) return false
    this.path = path
    this.pathStep = 0
    this.state = 'MOVING'
    // Lot B : on NE met PAS isWandering=true ici. Sinon la branche MOVING
    // annule le chemin des qu un job apparait (state.jobs.size > 0) et le
    // chercheur n atteint jamais le promontoire. Le flag observatoryTarget
    // permet de basculer en IDLE en fin de path sans repasser par WORKING.
    this.isWandering = false
    this.observatoryTarget = true
    // Lot B : memorise l entry visee pour l ajouter aux occupants a l arrivee.
    this.observatoryTargetEntry = best
    this.updateTrail()
    return true
  }

  // Lot B : BUILDER. Cherche un chantier (isUnderConstruction === true) le
  // plus proche, parmi tous les types de batiments enregistres dans state.
  // S il en trouve un et qu un chemin existe, place le colon en MOVING vers
  // ce chantier et stocke la cible dans this.targetConstructionSite. La
  // progression sera ensuite avancee dans l etat BUILDING.
  pickConstructionSite() {
    const sites = []
    const pushAll = (arr) => {
      if (!arr) return
      for (const b of arr) if (b && (b.isUnderConstruction || b.isUnderUpgrade)) sites.push(b)
    }
    pushAll(state.foyers)
    pushAll(state.houses)
    pushAll(state.bigHouses)
    pushAll(state.researchHouses)
    pushAll(state.observatories)
    pushAll(state.cairns)
    pushAll(state.wheatFields)
    if (sites.length === 0) return false
    // Plusieurs constructeurs peuvent travailler sur le meme chantier. On
    // filtre les sites par proximite (MAX_BUILDER_DISTANCE) puis on privilegie
    // ceux qui ont deja des constructeurs actifs (pour terminer un chantier
    // commence avant d en ouvrir un nouveau). A egalite, le plus proche gagne.
    let best = null
    let bestScore = Infinity
    for (const b of sites) {
      const d = Math.abs(b.x - this.x) + Math.abs(b.z - this.z)
      if (d > MAX_BUILDER_DISTANCE) continue
      const activeCount = (b.builders && typeof b.builders.size === 'number') ? b.builders.size : 0
      // Score : on soustrait un gros bonus si le chantier est deja actif
      // (priorite secondaire), puis distance. Un chantier deja travaille
      // bat tout chantier vide hors de portee directe.
      const score = (activeCount > 0 ? -100000 : 0) + d
      if (score < bestScore) { bestScore = score; best = b }
    }
    if (!best) return false
    // Lot B : repartition des constructeurs autour du chantier (style AoE).
    // Chaque builder prend un slot distinct sur le perimetre exterieur du
    // footprint. builderSlots est une Map<colonistId, "x,z"> stockee sur le
    // chantier ; takenSet permet a findBuildSlot d eviter les slots deja pris.
    const fp = getSiteFootprint(best)
    if (!best.builderSlots) best.builderSlots = new Map()
    const takenSet = new Set()
    for (const k of best.builderSlots.values()) takenSet.add(k)
    const slot = findBuildSlot(this.x, this.z, best.x, best.z, fp.w, fp.d, takenSet)
    if (!slot) return false
    if (!best.builders) best.builders = new Set()
    best.builders.add(this.id)
    best.builderSlots.set(this.id, slot.x + ',' + slot.z)
    best.activeBuildersCount = best.builders.size
    this.targetConstructionSite = best
    this.builderSlot = { x: slot.x, z: slot.z }
    this.path = slot.path
    this.pathStep = 0
    this.state = 'MOVING'
    this.isWandering = false
    this.updateTrail()
    return true
  }

  pickExplorationTarget() {
    if (!state.cellRevealed) return false
    let best = null
    let bestDist = Infinity
    for (let k = 0; k < state.cellRevealed.length; k++) {
      if (state.cellRevealed[k]) continue
      const x = k % GRID, z = Math.floor(k / GRID)
      if (x < 0 || x >= GRID || z < 0 || z >= GRID) continue
      const biome = state.cellBiome ? state.cellBiome[k] : null
      if (biome === 'water' || biome === 'deep-water' || biome === 'snow' || biome === 'rock') continue
      const dist = Math.abs(x - this.x) + Math.abs(z - this.z)
      if (dist < bestDist) { bestDist = dist; best = { x, z } }
    }
    if (!best) return false
    const path = findApproach(this.x, this.z, best.x, best.z)
    if (!path || path.length === 0) return false
    this.explorationTarget = { x: best.x, z: best.z }
    this.path = path
    this.pathStep = 0
    this.state = 'MOVING'
    this.isWandering = false
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
    // Lot B house utility : repos. Pendant SLEEP, on monte plus vite si sous
    // toit (REST_RATE_INDOOR), sinon a vitesse REST_RATE_OUTDOOR (foyer
    // commun). Pendant le travail (WORKING/BUILDING/RESEARCHING/FARMING) la
    // jauge baisse a FATIGUE_RATE_WORK. IDLE et MOVING sont neutres.
    if (this.state === 'SLEEP') {
      this.rested = Math.min(1, (this.rested || 0) + REST_RATE_INDOOR * dt)
    } else if (this.state === 'WORKING' || this.state === 'BUILDING' ||
               this.state === 'RESEARCHING' || this.state === 'FARMING') {
      this.rested = Math.max(0, (this.rested || 0) - FATIGUE_RATE_WORK * dt)
    } else if (state.isNight && this.state === 'IDLE' && !this.homeBuildingId) {
      // Sans-abri la nuit : recuperation lente dehors (foyer commun).
      this.rested = Math.min(1, (this.rested || 0) + REST_RATE_OUTDOOR * dt)
    }
    // Detection transition jour <-> nuit pour ce colon (envoi a la maison la
    // nuit, reveil le matin). Independant du tickHousing global qui gere la
    // reproduction sur le top jour vers nuit.
    const nowNight = !!state.isNight
    if (this._prevIsNight !== nowNight) {
      if (nowNight) this._onNightFall()
      else          this._onDayBreak()
      this._prevIsNight = nowNight
    }
    // Si la nuit tombe sans transition (chargement save), s assurer que les
    // colons ayant home et IDLE rejoignent leur lit. Ne s applique qu une fois
    // par tick et seulement aux IDLE proches de chez eux.
    if (nowNight && this.state === 'IDLE' && !isNeedCritical(this, 'hunger')) {
      this._tryGoSleep()
    }
    // Etat SLEEP : statique, pas d action. Sortie au lever du jour ou si la
    // faim devient critique (le colon prefere manger).
    if (this.state === 'SLEEP') {
      if (!nowNight) {
        this.state = 'IDLE'
        this.path = null
        this.lineGeo.setFromPoints([])
      } else if (isNeedCritical(this, 'hunger')) {
        this.state = 'IDLE'
        this.path = null
        this.lineGeo.setFromPoints([])
      } else {
        // Animation : leger bob respiratoire, pas de bruit visuel sinon.
        const bob = Math.sin(performance.now() * 0.003) * 0.03
        this.group.position.set(this.tx, this.ty + Math.abs(bob), this.tz)
        return
      }
    }
    // Arc visible si chasseur de profession ou job de chasse en cours
    if (this._bowGroup && this.state !== 'WORKING') {
      const activeHunt = (this.targetJob && this.targetJob.kind === 'hunt')
      this._bowGroup.visible = (this.profession === 'chasseur' || activeHunt)
    }
    if (this.state !== 'MOVING' && this.legL) {
      const k = Math.min(1, dt * 8)
      this.legL.rotation.x *= (1 - k)
      this.legR.rotation.x *= (1 - k)
      this.armL.rotation.x *= (1 - k)
      this.armR.rotation.x *= (1 - k)
    }

    if (this.state === 'RESEARCHING') {
      this.lineGeo.setFromPoints([])
      // Gate universel : profession === 'chercheur' ET assignedJob === 'researcher'.
      // Si l une des deux conditions tombe (changement de metier ou desassignation
      // depuis le panneau Population), on libere la hutte et on quitte.
      if (this.profession !== 'chercheur' || this.assignedJob !== 'researcher') {
        const b = findResearchBuildingById(this.researchBuildingId)
        if (b && Array.isArray(b.assignedColonistIds)) {
          const i = b.assignedColonistIds.indexOf(this.id)
          if (i >= 0) b.assignedColonistIds.splice(i, 1)
        }
        this.researchBuildingId = null
        this.state = 'IDLE'
        return
      }
      // Lot B : chercheur bivalent. La nuit, s il existe un promontoire actif,
      // le chercheur libere la hutte du sage et bascule en IDLE pour que
      // l auto-attribution promontoire prenne le relais au prochain tick.
      if (state.isNight) {
        let hasActiveObs = false
        if (state.observatories && state.observatories.length) {
          for (const o of state.observatories) {
            if (!o.isUnderConstruction) { hasActiveObs = true; break }
          }
        }
        if (hasActiveObs) {
          const b = findResearchBuildingById(this.researchBuildingId)
          if (b && Array.isArray(b.assignedColonistIds)) {
            const i = b.assignedColonistIds.indexOf(this.id)
            if (i >= 0) b.assignedColonistIds.splice(i, 1)
          }
          this.researchBuildingId = null
          this.state = 'IDLE'
          return
        }
      }
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
      this.researchXpTimer += dt
      if (this.researchXpTimer >= RESEARCH_TICK) {
        this.researchXpTimer -= RESEARCH_TICK
        this.skills.research++
      }
      this.nextSpeech -= dt
      if (this.nextSpeech <= 0) {
        this.nextSpeech = 15 + Math.random() * 10
      }
      return
    }

    if (this.state === 'IDLE') {
      this.lineGeo.setFromPoints([])
      // Lot B : auto-attribution differee. Quand le joueur assigne un colon
      // (chef ou non) au metier 'chercheur' apres la pose de la Hutte du sage,
      // personne ne lie le colon a la hutte. On rattrape ici : tout colon IDLE
      // avec profession === 'chercheur' ET assignedJob === 'researcher' ET sans
      // researchBuildingId cherche la hutte libre la plus proche.
      // Lot B : nuit avec promontoire actif, on ne re-attribue PAS la hutte
      // au chercheur (il va aller au promontoire via le bloc dedie plus bas).
      let _nightHasObs = false
      if (state.isNight && state.observatories && state.observatories.length) {
        for (const o of state.observatories) {
          if (!o.isUnderConstruction) { _nightHasObs = true; break }
        }
      }
      if (
        !_nightHasObs &&
        this.researchBuildingId == null &&
        this.profession === 'chercheur' &&
        this.assignedJob === 'researcher' &&
        state.researchHouses && state.researchHouses.length > 0
      ) {
        // Lot B : la Hutte du sage accepte plusieurs chercheurs. On choisit
        // la plus proche, peu importe le nombre deja assignes. Repartition
        // naturelle si plusieurs huttes presentes : chacun va vers la sienne.
        let bestHut = null, bestHutD = Infinity
        for (const h of state.researchHouses) {
          if (h.isUnderConstruction) continue
          if (!Array.isArray(h.assignedColonistIds)) h.assignedColonistIds = []
          const d = Math.abs(h.x - this.x) + Math.abs(h.z - this.z)
          if (d < bestHutD) { bestHutD = d; bestHut = h }
        }
        if (bestHut) {
          if (!bestHut.assignedColonistIds.includes(this.id)) bestHut.assignedColonistIds.push(this.id)
          this.researchBuildingId = bestHut.id
        }
      }
      if (this.researchBuildingId != null) {
        // Gate universel : profession === 'chercheur' ET assignedJob === 'researcher'.
        // Si le joueur change le metier OU desassigne le role, on libere
        // immediatement la hutte et le colon redevient IDLE normal.
        if (this.profession !== 'chercheur' || this.assignedJob !== 'researcher') {
          const b = findResearchBuildingById(this.researchBuildingId)
          if (b && Array.isArray(b.assignedColonistIds)) {
            const i = b.assignedColonistIds.indexOf(this.id)
            if (i >= 0) b.assignedColonistIds.splice(i, 1)
          }
          this.researchBuildingId = null
        }
      }
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
          if (Array.isArray(building.assignedColonistIds)) {
            const i = building.assignedColonistIds.indexOf(this.id)
            if (i >= 0) building.assignedColonistIds.splice(i, 1)
          }
          this.researchBuildingId = null
        }
      }
      // Lot B : la recherche ne tourne QUE si le colon est explicitement
      // assigne profession === 'chercheur'. Plus d auto-assignation du chef
      // ni d aucun autre colon IDLE vers la Hutte du sage. Sans chercheur
      // explicite, la file de recherche stagne : c est voulu.
      // Lot B fermier : si le colon n est plus agriculteur (changement de
      // metier ou desassignation), liberer immediatement le champ qu il avait
      // reserve. Evite qu un champ reste verrouille apres un changement de role.
      if (
        this.assignedFieldId != null &&
        !isFarmerActive(this)
      ) {
        releaseFromWheatFields(this.id)
        this.assignedFieldId = null
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
          // Lot B : aucun buisson accessible, repli sur la viande disponible
          // dans les stocks communs (cuite > crue). Action instantanee, le
          // colon ne bouge pas, mais la faim est ramenee sous le seuil.
          if (tryEatMeatFromStocks(this)) {
            this.currentTask = { kind: TASK_KIND.EAT_SEEK_FOOD, priority: PRIORITY.SURVIVAL, reason: 'hunger_critical_stocks' }
            return
          }
        }
        if (state.jobs.size > 0) { if (this.pickJob()) { this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.WORK }; return } }
        if (state.buildJobs.size > 0) { if (this.pickBuildJob()) { this.currentTask = { kind: TASK_KIND.PLAYER_BUILD_JOB, priority: PRIORITY.WORK }; return } }
        // Lot B : profession constructeur. S il y a un chantier ouvert, le
        // constructeur s y rend en priorite WORK (avant les LEISURE par
        // profession plus bas). Les autres professions n initient pas de
        // chantier d elles-memes : le constructeur est dedie.
        // Lot B (mode mixte) : les metiers "specialises" (constructeur,
        // bucheron, chasseur, astronome) restent gates par assignedJob. Pour
        // les taches "basiques" (cueillette baies, minage pierre), un colon
        // sans profession peut quand meme agir, voir le bloc plus bas.
        // Vitesse reduite via UNASSIGNED_PRODUCTIVITY_MUL.
        if (this.profession === 'constructeur' && this.assignedJob === 'builder') {
          if (this.pickConstructionSite()) {
            this.currentTask = { kind: TASK_KIND.BUILD_SITE, priority: PRIORITY.WORK, reason: 'builder' }
            return
          }
        }
        // Comportement proactif selon profession (priorite LEISURE, derriere les ordres joueur)
        // Lot B age 2 : bucheron pierre (gate axe-stone) ou bucheron bronze
        // (gate axe-bronze) declenchent la recherche proactive d arbre.
        const isBucheronStarter = (this.profession === 'bucheron' && this.assignedJob === 'woodcutter' && techUnlocked('axe-stone'))
        const isBucheronBronze  = (this.profession === 'bucheron-bronze' && techUnlocked('axe-bronze'))
        if (isBucheronStarter || isBucheronBronze) {
          let best = null, bestD = Infinity
          for (const t of state.trees) {
            if (t.growth < 0.66) continue
            if (state.jobs.has(jobKey(t.x, t.z))) continue
            const d = Math.abs(t.x - this.x) + Math.abs(t.z - this.z)
            if (d < bestD) { bestD = d; best = t }
          }
          if (best) {
            const approach = findApproach(this.x, this.z, best.x, best.z)
            if (approach) {
              this.targetJob = { x: best.x, z: best.z, claimedBy: this, auto: true, kind: 'hache' }
              this.path = approach.path; this.pathStep = 0
              this.state = 'MOVING'; this.isWandering = false; this.updateTrail()
              this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.LEISURE }
              return
            }
          }
        }
        if (this.profession === 'cueilleur' && this.assignedJob === 'gatherer') {
          if (this.pickHarvest()) {
            this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.LEISURE }
            return
          }
        }
        // Lot B (mode mixte) : cueillette spontanee pour TOUT colon non
        // assigne a un metier specifique. Action LEISURE, vitesse reduite
        // (UNASSIGNED_PRODUCTIVITY_MUL applique en WORKING). Les cueilleurs
        // assignes sont deja servis ci-dessus a pleine vitesse.
        if (!this.profession && !this.assignedJob) {
          if (this.pickHarvest()) {
            this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.LEISURE, reason: 'auto_gather_unassigned' }
            return
          }
        }
        if (this.profession === 'chasseur' && this.assignedJob === 'hunter') {
          let best = null, bestD = Infinity
          for (const d of (state.deers || [])) {
            // Garde anti-fuite : on ignore les cerfs morts (encore dans state.deers
            // pendant deadTimer) et ceux deja cibles par un autre chasseur. Sans
            // ces deux filtres, le tir au WORKING redrop la viande sur un cadavre.
            if (d.dead) continue
            if (d.claimedBy && d.claimedBy !== this) continue
            if (state.jobs.has(jobKey(d.x, d.z))) continue
            const dist = Math.abs(d.x - this.x) + Math.abs(d.z - this.z)
            if (dist < bestD) { bestD = dist; best = d }
          }
          if (best) {
            const approach = findApproach(this.x, this.z, best.x, best.z)
            if (approach) {
              best.claimedBy = this
              this.targetJob = { x: best.x, z: best.z, claimedBy: this, auto: true, kind: 'hunt' }
              this.path = approach.path; this.pathStep = 0
              this.state = 'MOVING'; this.isWandering = false; this.updateTrail()
              this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.LEISURE }
              return
            }
          }
        }
        // Lot B : CHERCHEUR bivalent. La nuit, s il existe au moins un
        // promontoire actif, le chercheur le rejoint pour generer des
        // nightPoints (via isColonistOnObservatory dans daynight.js). Sinon
        // il reste a la Hutte du sage (gere plus haut). Note : la liberation
        // de la hutte (assignedColonistIds, researchBuildingId) est faite
        // dans le bloc RESEARCHING via la detection state.isNight.
        if (this.profession === 'chercheur' && state.isNight) {
          let hasActiveObs = false
          if (state.observatories && state.observatories.length) {
            for (const o of state.observatories) {
              if (!o.isUnderConstruction) { hasActiveObs = true; break }
            }
          }
          if (hasActiveObs) {
            if (this.pickObservatory()) {
              this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.LEISURE, reason: 'astronome' }
              return
            }
          }
        }
        // Lot B fermier (two-stage field) : agriculteur. Le jour, le fermier
        // gere deux priorites :
        //   P1 : trouver un champ SAUVAGE le plus proche pour le TRANSFORMER en
        //        cultive (state FARMING_TRANSFORM, 30s). Aucun champ sauvage n a
        //        de fermier assigne (production autonome), donc pas de check de
        //        capacite ici. On marque _fieldTransformTarget pour que MOVING
        //        bascule en FARMING_TRANSFORM a l arrivee.
        //   P2 : si tous les champs sont deja cultives, prendre un champ
        //        cultive libre (assignedColonistIds vide) comme avant pour
        //        produire du ble (state FARMING).
        // La nuit, comme les autres metiers, il rentre au campfire.
        if (
          isFarmerActive(this) &&
          !state.isNight &&
          techUnlocked('wheat-field')
        ) {
          // Si un champ etait deja attribue mais qu il a disparu ou est en
          // chantier, on libere proprement.
          if (this.assignedFieldId != null) {
            const cur = findWheatFieldById(this.assignedFieldId)
            if (!cur || cur.isUnderConstruction) {
              releaseFromWheatFields(this.id)
              this.assignedFieldId = null
              this._fieldTransformTarget = false
            }
          }
          // Trouver un champ libre si pas encore assigne.
          if (this.assignedFieldId == null && state.wheatFields && state.wheatFields.length) {
            // P1 : champ sauvage le plus proche.
            let bestWild = null, bestWildD = Infinity
            for (const f of state.wheatFields) {
              if (!f) continue
              if (f.isUnderConstruction) continue
              if ((f.stage || 'sauvage') !== 'sauvage') continue
              const d = Math.abs(f.x - this.x) + Math.abs(f.z - this.z)
              if (d < bestWildD) { bestWildD = d; bestWild = f }
            }
            if (bestWild) {
              if (!Array.isArray(bestWild.assignedColonistIds)) bestWild.assignedColonistIds = []
              // On reserve la cible pour eviter que deux fermiers convergent
              // sur le meme champ sauvage. Capacite stricte 1.
              if (bestWild.assignedColonistIds.length === 0) {
                bestWild.assignedColonistIds.push(this.id)
                this.assignedFieldId = bestWild.id
                this._fieldTransformTarget = true
              } else {
                // Deja reserve : on tente quand meme de continuer en P2.
                bestWild = null
              }
            }
            // P2 : si pas de sauvage trouve, champ cultive libre le plus proche.
            if (this.assignedFieldId == null) {
              let bestF = null, bestFD = Infinity
              for (const f of state.wheatFields) {
                if (!f) continue
                if (f.isUnderConstruction) continue
                if ((f.stage || 'sauvage') !== 'cultive') continue
                if (!Array.isArray(f.assignedColonistIds)) f.assignedColonistIds = []
                if (f.assignedColonistIds.length >= 1) continue
                const d = Math.abs(f.x - this.x) + Math.abs(f.z - this.z)
                if (d < bestFD) { bestFD = d; bestF = f }
              }
              if (bestF) {
                bestF.assignedColonistIds.push(this.id)
                this.assignedFieldId = bestF.id
                this._fieldTransformTarget = false
              }
            }
          }
          if (this.assignedFieldId != null) {
            const field = findWheatFieldById(this.assignedFieldId)
            if (field) {
              const approach = findApproach(this.x, this.z, field.x, field.z)
              if (approach) {
                this.path = approach.path
                this.pathStep = 0
                this.state = 'MOVING'
                this.isWandering = false
                this.updateTrail()
                this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.WORK, reason: 'farmer' }
                return
              }
              // Champ inaccessible : on libere pour permettre une autre cible.
              releaseFromWheatFields(this.id)
              this.assignedFieldId = null
              this._fieldTransformTarget = false
            }
          }
        }
        // Lot B age 2 (forgeron) : le jour, le forgeron tente un cycle de craft
        // a la forge la plus proche, sous reserve que les stocks contiennent
        // 2 copper + 1 tin. Si rien n est dispo (pas de forge, pas de matieres),
        // il reste IDLE. La nuit, comportement par defaut (campfire + wander).
        if (this.profession === 'forgeron' && !state.isNight) {
          if (this.pickForge()) {
            this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.WORK, reason: 'forgeron' }
            return
          }
        }
        // Lot B LEISURE : si de la viande crue traine dans les stocks et
        // qu un foyer libre est dispo, n importe quel colon peut prendre
        // l initiative d aller la cuire. Action collective non specifique
        // a une profession.
        if (this.pickCookMeat()) {
          this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.LEISURE, reason: 'cook_meat' }
          return
        }
        // Lot B (explorateur) : le jour, l explorateur cherche en priorite
        // la zone non revelee accessible la plus proche et y va. La nuit,
        // comportement par defaut (campfire + wander). Quand tout le monde
        // est decouvert, on retombe en wander avec un toast unique.
        if (this.profession === 'explorateur' && !state.isNight) {
          // Cible deja atteinte ou plus valide : reset.
          if (this.explorationTarget) {
            const t = this.explorationTarget
            const k = t.z * GRID + t.x
            const arrived = (this.x === t.x && this.z === t.z)
            const nowRevealed = state.cellRevealed && state.cellRevealed[k]
            if (arrived || nowRevealed) this.explorationTarget = null
          }
          if (!this.explorationTarget) {
            if (this.pickExplorationTarget()) {
              this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.WORK, reason: 'explore' }
              return
            } else {
              if (!this._toldAllRevealed) {
                try { showHudToast('Explorateur : monde entierement explore') } catch (_) {}
                this._toldAllRevealed = true
              }
              // Tombe en wander default plus bas.
            }
          }
        }
      }
      // Lot B, B10 : auto-collecte de base au repos (rochers, arbres si hache).
      // desactive - remplace par systeme 3 boutons (pioche/hache/baie)
      // if (!state.isNight && this.pickAutoCollect()) {
      //   this.currentTask = { kind: TASK_KIND.PLAYER_JOB, priority: PRIORITY.LEISURE }
      //   return
      // }
      // Lot B : chercheur stationne sur son promontoire la nuit, ni campfire
      // social ni wander pour ne pas perdre les nightPoints.
      const stayingOnObservatory = (
        this.profession === 'chercheur' && state.isNight && isObservatoryOn(this.x, this.z)
      )
      // Nuit : attirance vers le foyer le plus proche (feu de camp social).
      if (state.isNight && !stayingOnObservatory && this.pickCampfire()) return
      if (stayingOnObservatory) {
        // Lot B : si le colon est sur la cellule d un promontoire avec place
        // dispo et n y figure pas encore (cas reload mi-nuit ou bascule N),
        // l ajouter aux occupants pour masquer le mesh et allumer la lumiere.
        if (!this.isHidden && state.observatories) {
          for (const o of state.observatories) {
            if (o.isUnderConstruction) continue
            const dx = Math.abs(o.x - this.x)
            const dz = Math.abs(o.z - this.z)
            if (dx + dz <= 1) {
              if (enterObservatory(this, o)) break
            }
          }
        }
        // Petite rotation lente de la tete pour montrer qu il scrute le ciel.
        this.lookTimer -= dt
        if (this.lookTimer <= 0) {
          this.targetYaw = this.group.rotation.y + (Math.random() - 0.5) * 1.0
          this.lookTimer = 2 + Math.random() * 3
        }
        const dy = this.targetYaw - this.group.rotation.y
        this.group.rotation.y += dy * Math.min(1, dt * 1.0)
        this.group.position.set(this.tx, this.ty, this.tz)
        return
      }
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
      // Lot B : bulle "idle metier". Un colon assigne a un metier mais sans
      // cible exploitable peut prononcer une phrase d idleSpeech (donnees JSON
      // via gamedata, lecture seule). Throttle a IDLE_SPEECH_COOLDOWN par colon.
      // Priorite sur la flanerie aleatoire : si on parle ici, on saute le pool
      // generique en repoussant nextSpeech.
      if (this.profession && this.speechTimer <= 0) {
        const job = jobOf(this.profession)
        const pool = job && Array.isArray(job.idleSpeech) ? job.idleSpeech : null
        if (pool && pool.length > 0) {
          const nowSec = performance.now() / 1000
          if ((nowSec - this._lastIdleSpeechAt) > IDLE_SPEECH_COOLDOWN) {
            if (this._hasNoTaskForProfession() && activeSpeakers() < 2) {
              const phrase = pool[Math.floor(Math.random() * pool.length)]
              this.say(phrase, false, { kind: 'idle', borderColor: job.color })
              this._lastIdleSpeechAt = nowSec
              this.nextSpeech = 12 + Math.random() * 8
            }
          }
        }
      }
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
      // Lot B : si le jour se leve pendant un trajet vers le promontoire,
      // on annule pour rebasculer en IDLE et laisser la branche IDLE renvoyer
      // le chercheur a la Hutte du sage.
      if (this.observatoryTarget && !state.isNight) {
        this.observatoryTarget = false
        this.path = null
        this.state = 'IDLE'
        this.lineGeo.setFromPoints([])
        return
      }
      if (this.isWandering && (state.jobs.size > 0 || state.buildJobs.size > 0 || this.researchBuildingId != null)) {
        this.isWandering = false
        this.path = null
        this.state = 'IDLE'
        this.lineGeo.setFromPoints([])
        return
      }
      // Tir a distance : si job de chasse et cerf dans portee 6, arreter le deplacement
      if (this.targetJob && this.targetJob.kind === 'hunt') {
        // Filtre dead : un cerf abattu reste 4s dans state.deers (deadTimer)
        // pour l animation de chute. Sans ce filtre, un autre colon pouvait
        // viser un cadavre, arriver, tirer, et redrop la viande/os.
        // Filtre claimedBy : si un autre chasseur a claim, on lache.
        const deerEntry = state.deers ? state.deers.find(d =>
          d.x === this.targetJob.x && d.z === this.targetJob.z &&
          !d.dead && d.group && (!d.claimedBy || d.claimedBy === this)
        ) : null
        if (!deerEntry) {
          // Cible disparue ou morte avant l arrivee : on abandonne sans drop.
          // On libere aussi tout claim residuel sur l ancien cerf de la cellule.
          if (state.deers) {
            for (const d of state.deers) {
              if (d.claimedBy === this) d.claimedBy = null
            }
          }
          if (state.jobs.has(jobKey(this.targetJob.x, this.targetJob.z))) {
            removeJob(this.targetJob.x, this.targetJob.z, true)
          }
          this.targetJob = null
          this.state = 'IDLE'
          this.path = null
          this.lineGeo.setFromPoints([])
          return
        }
        {
          const huntDx = deerEntry.x - this.x
          const huntDz = deerEntry.z - this.z
          const huntDist = Math.hypot(huntDx, huntDz)
          if (huntDist <= 6) {
            this.state = 'WORKING'
            this.workTimer = 0
            this.huntTimer = 0
            this.path = null
            this.lineGeo.setFromPoints([])
            return
          }
        }
      }
      if (!this.path || this.pathStep >= this.path.length) {
        // Lot B house utility : arrivee au lit. On bascule directement en SLEEP
        // sans passer par WORKING. Le sommeil persistera jusqu au lever du jour.
        if (this._goingToSleep) {
          this._goingToSleep = false
          this.state = 'SLEEP'
          this.path = null
          this.lineGeo.setFromPoints([])
          this.group.position.set(this.tx, this.ty, this.tz)
          return
        }
        // Lot B : arrivee au promontoire la nuit. On reste en IDLE (pas WORKING)
        // pour que isColonistOnObservatory genere les nightPoints, et on coupe
        // le flag pour que les decisions IDLE suivantes (campfire, wander) ne
        // perturbent pas la station. La branche IDLE chercheur teste deja
        // isObservatoryOn pour le maintenir sur place (stayingOnObservatory).
        if (this.observatoryTarget) {
          this.observatoryTarget = false
          // Lot B : tente d entrer dans le promontoire (capacite 2). Si OK,
          // mesh masque + lumiere allumee. Sinon le colon reste IDLE en
          // surface (pas de night points pour lui, contribution = 0).
          const entry = this.observatoryTargetEntry
          this.observatoryTargetEntry = null
          if (entry) enterObservatory(this, entry)
          this.state = 'IDLE'
          this.path = null
          this.lineGeo.setFromPoints([])
          return
        }
        if (this.isWandering) {
          this.isWandering = false
          this.state = 'IDLE'
          this.path = null
          this.lineGeo.setFromPoints([])
          this.wanderPause = 2 + Math.random() * 4
          return
        }
        if (this.researchBuildingId != null && this.profession === 'chercheur' && !this.targetJob && !this.targetBush && !this.targetFoyer) {
          this.state = 'RESEARCHING'
          this.path = null
          this.lineGeo.setFromPoints([])
          this.group.position.set(this.tx, this.ty, this.tz)
          return
        }
        // Lot B age 2 (forgeron) : arrivee a la forge. On bascule en WORKING
        // avec un workTimer remis a zero. La fin de cycle (FORGE_CRAFT_DURATION)
        // declenche la consommation des matieres et la production de bronze.
        if (
          this.targetForge &&
          isForgeronActive(this) &&
          !this.targetJob && !this.targetBush && !this.targetFoyer && !this.targetBuildJob
        ) {
          this.state = 'WORKING'
          this.workTimer = 0
          this.path = null
          this.lineGeo.setFromPoints([])
          this.group.position.set(this.tx, this.ty, this.tz)
          return
        }
        // Lot B fermier : arrivee au champ. Bascule en FARMING_TRANSFORM si la
        // cible est un champ sauvage (transformation 30s vers cultive), sinon en
        // FARMING (production de ble sur champ cultive).
        if (
          this.assignedFieldId != null &&
          isFarmerActive(this) &&
          !this.targetJob && !this.targetBush && !this.targetFoyer
        ) {
          if (this._fieldTransformTarget) {
            this.state = 'FARMING_TRANSFORM'
            this.farmingTransformTimer = 0
          } else {
            this.state = 'FARMING'
          }
          this.path = null
          this.lineGeo.setFromPoints([])
          this.group.position.set(this.tx, this.ty, this.tz)
          return
        }
        if (this.targetConstructionSite) {
          // Arrive au chantier : on passe en etat BUILDING. Le tick BUILDING
          // fait avancer constructionProgress et XP building tant que le site
          // est isUnderConstruction.
          this.state = 'BUILDING'
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
      const _roadK = nz * GRID + nx
      const _onRoad = state.cellSurface && state.cellSurface[_roadK] === 'paved-road'
      const speed = (this.isWandering ? COLONIST_SPEED * 0.5 : COLONIST_SPEED) * (_onRoad ? 1.2 : 1.0)
      const step = speed * dt
      if (dist <= step) {
        this.tx = targetX; this.tz = targetZ
        const prevX = this.x, prevZ = this.z
        this.x = nx; this.z = nz
        this.pathStep++
        this.updateTrail()
        // Revelation du fog of war quand le colon change de cellule.
        // Lot B : rayon dependant de la profession (explorateur eleve).
        if (this.x !== prevX || this.z !== prevZ) {
          revealAround(this.x, this.z, getColonistVisionRadius(this))
        }
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

    if (this.state === 'FARMING_TRANSFORM') {
      this.lineGeo.setFromPoints([])
      // Lot B (two-stage field) : transformation d un champ sauvage en cultive.
      // Duree lue depuis BUILDINGS_DATA.field.transformFrom.duration (defaut 30s).
      // Gate universel : si plus fermier ou si nuit tombee, on rebascule en IDLE
      // (le timer se reinitialise au prochain MOVING -> arrivee).
      const stillFarmer = isFarmerActive(this)
      if (!stillFarmer || state.isNight) {
        if (!stillFarmer) {
          releaseFromWheatFields(this.id)
          this.assignedFieldId = null
          this._fieldTransformTarget = false
        } else {
          // Nuit : on garde l assignation, on reset le timer pour reprendre
          // depuis zero le lendemain (transformation atomique).
          this.farmingTransformTimer = 0
        }
        this.state = 'IDLE'
        return
      }
      const field = findWheatFieldById(this.assignedFieldId)
      if (!field || field.isUnderConstruction) {
        releaseFromWheatFields(this.id)
        this.assignedFieldId = null
        this._fieldTransformTarget = false
        this.state = 'IDLE'
        return
      }
      // Si le champ a deja ete cultive entre temps (autre fermier, rechargement),
      // on saute la transformation et on bascule directement en FARMING.
      if (field.stage === 'cultive') {
        this._fieldTransformTarget = false
        this.farmingTransformTimer = 0
        this.state = 'FARMING'
        return
      }
      // Resolution data-driven de la duree de transformation.
      let transformDuration = 30
      try {
        const fieldDef = (typeof BUILDINGS_DATA !== 'undefined' && BUILDINGS_DATA && BUILDINGS_DATA.buildings)
          ? BUILDINGS_DATA.buildings.find(x => x.id === 'field') : null
        if (fieldDef && fieldDef.transformFrom && typeof fieldDef.transformFrom.duration === 'number') {
          transformDuration = fieldDef.transformFrom.duration
        }
      } catch (e) { /* fallback 30s */ }
      this.farmingTransformTimer = (this.farmingTransformTimer || 0) + dt
      // Mise a jour de la progression cote field pour eventuel feedback UI / save.
      field.transformProgress = Math.min(1, this.farmingTransformTimer / transformDuration)
      // Animation legere comme en FARMING.
      const centerX = field.x + 1
      const centerZ = field.z + 1
      const dx = centerX - this.tx
      const dz = centerZ - this.tz
      this.group.rotation.y = Math.atan2(dx, dz)
      const bob = Math.sin(performance.now() * 0.0045) * 0.07
      this.group.position.set(this.tx, this.ty + Math.abs(bob), this.tz)
      if (this.farmingTransformTimer >= transformDuration) {
        // Transformation terminee : champ passe cultive, fermier reste assigne.
        transformField(field)
        this.farmingTransformTimer = 0
        this._fieldTransformTarget = false
        // Bascule en FARMING : le meme champ est desormais cultive et le fermier
        // est deja sur place. La production de ble demarrera au prochain tick.
        this.state = 'FARMING'
      }
      return
    }

    if (this.state === 'FARMING') {
      this.lineGeo.setFromPoints([])
      // Gate universel : profession === 'agriculteur' ET assignedJob === 'farmer'.
      // La nuit, le fermier rentre se reposer comme les autres metiers (rebascule
      // en IDLE pour laisser le campfire le prendre en charge). Le champ reste
      // assigne (assignedFieldId) pour qu il y revienne le lendemain.
      const stillFarmer = isFarmerActive(this)
      if (!stillFarmer || state.isNight) {
        if (!stillFarmer) {
          // Changement de metier : on libere completement le champ.
          releaseFromWheatFields(this.id)
          this.assignedFieldId = null
        }
        this.state = 'IDLE'
        return
      }
      const field = findWheatFieldById(this.assignedFieldId)
      if (!field || field.isUnderConstruction) {
        releaseFromWheatFields(this.id)
        this.assignedFieldId = null
        this.state = 'IDLE'
        return
      }
      // Lot B (two-stage field) : si le champ est encore sauvage, on ne produit
      // rien en FARMING. On retourne en IDLE pour que le picker rebascule en
      // FARMING_TRANSFORM (cas save legacy ou changement d etat externe).
      if ((field.stage || 'sauvage') === 'sauvage') {
        releaseFromWheatFields(this.id)
        this.assignedFieldId = null
        this._fieldTransformTarget = false
        this.state = 'IDLE'
        return
      }
      // Animation : oriente vers le centre du champ 2x2, leger bob.
      const centerX = field.x + 1
      const centerZ = field.z + 1
      const dx = centerX - this.tx
      const dz = centerZ - this.tz
      this.group.rotation.y = Math.atan2(dx, dz)
      const bob = Math.sin(performance.now() * 0.0035) * 0.06
      this.group.position.set(this.tx, this.ty + Math.abs(bob), this.tz)
      // XP recolte par tick (similaire au researcher avec research).
      this.researchXpTimer = (this.researchXpTimer || 0) + dt
      if (this.researchXpTimer >= RESEARCH_TICK) {
        this.researchXpTimer -= RESEARCH_TICK
        this.skills.gathering = (this.skills.gathering || 0) + 1
      }
      return
    }

    if (this.state === 'BUILDING') {
      const site = this.targetConstructionSite
      const isUpgrade = !!(site && site.isUnderUpgrade)
      if (!site || (!site.isUnderConstruction && !site.isUnderUpgrade)) {
        // Chantier disparu (annule, supprime) ou termine entre temps.
        if (site && site.builders) {
          site.builders.delete(this.id)
          if (site.builderSlots) site.builderSlots.delete(this.id)
          site.activeBuildersCount = site.builders.size
        }
        this.builderSlot = null
        this.targetConstructionSite = null
        this.state = 'IDLE'
        this.path = null
        this.currentTask = null
        this.group.position.set(this.tx, this.ty, this.tz)
        return
      }
      // Orientation vers le batiment et leger bob.
      const dx = (site.x + 0.5) - this.tx
      const dz = (site.z + 0.5) - this.tz
      this.group.rotation.y = Math.atan2(dx, dz)
      const bob = Math.sin(performance.now() * 0.012) * 0.05
      this.group.position.set(this.tx, this.ty + Math.abs(bob), this.tz)
      // Productivite : skillLevel/10, multiplie par productivityMul (penalite
      // faim/sans-abri appliquee par needs.js). Plancher 0.1 pour qu un
      // novice puisse quand meme batir, lentement.
      const lvl = this.skillLevel('building')
      const skillFactor = Math.max(0.1, lvl / 10)
      const prodMul = (typeof this.productivityMul === 'number') ? this.productivityMul : 1
      const speedMul = getGlobalSpeedFactor(state)
      // XP building accumule dans this.skills.building (paliers via skillLevel).
      this.skills.building = (this.skills.building || 0) + dt

      if (isUpgrade) {
        // Upgrade explicite Cabane -> Grosse maison : meme moteur de progression
        // que la construction, mais on incremente upgradeProgress et on swap le
        // batiment a l achevement via completeUpgrade.
        const ubt = (typeof site.upgradeBuildTime === 'number' && site.upgradeBuildTime > 0) ? site.upgradeBuildTime : 1
        site.upgradeProgress = Math.min(1, (site.upgradeProgress || 0) + skillFactor * prodMul * speedMul * dt / ubt)
        if (site.upgradeProgress >= 1) {
          const builders = site.builders ? Array.from(site.builders) : []
          if (site.builders) { site.builders.clear(); site.activeBuildersCount = 0 }
          if (site.builderSlots) site.builderSlots.clear()
          site.isUnderUpgrade = false
          site.upgradeProgress = 1
          completeUpgrade(site)
          for (const cid of builders) {
            const c = state.colonists.find(cc => cc.id === cid)
            if (!c) continue
            if (c.targetConstructionSite === site) {
              c.targetConstructionSite = null
              c.builderSlot = null
              c.currentTask = null
              c.path = null
              if (c.state === 'BUILDING' || c.state === 'MOVING') c.state = 'IDLE'
            }
          }
          this.builderSlot = null
          this.targetConstructionSite = null
          this.currentTask = null
          this.state = 'IDLE'
          this.path = null
        }
        return
      }

      const bt = (typeof site.buildTime === 'number' && site.buildTime > 0) ? site.buildTime : 1
      site.constructionProgress = Math.min(1, (site.constructionProgress || 0) + skillFactor * prodMul * speedMul * dt / bt)
      if (site.constructionProgress >= 1) {
        site.constructionProgress = 1
        site.isUnderConstruction = false
        if (site.builders) {
          site.builders.clear()
          site.activeBuildersCount = 0
        }
        if (site.builderSlots) site.builderSlots.clear()
        this.builderSlot = null
        onBuildingComplete(site)
        this.targetConstructionSite = null
        this.currentTask = null
        this.state = 'IDLE'
        this.path = null
      }
      return
    }

    if (this.state === 'WORKING') {
      this.workTimer += dt
      // Lot B age 2 (forgeron) : cycle de craft a la forge. Independant des
      // autres targets cellulaires (job, buisson, foyer, build). A la fin de
      // FORGE_CRAFT_DURATION, on consomme 2 copper + 1 tin et on produit 1
      // bronze. Si un autre forgeron a vide le stock entre temps, le cycle
      // echoue silencieusement et le colon repart en IDLE pour reessayer.
      if (this.targetForge) {
        // Garde universelle : si plus forgeron, ou si nuit, ou si la forge a
        // disparu / passe en chantier (upgrade), on annule le cycle.
        const forgeStillValid = state.forges && state.forges.indexOf(this.targetForge) !== -1
          && !this.targetForge.isUnderConstruction && !this.targetForge.isUnderUpgrade
        if (!isForgeronActive(this) || state.isNight || !forgeStillValid) {
          this.targetForge = null
          this.workTimer = 0
          this.currentTask = null
          this.state = 'IDLE'
          return
        }
        const dx = (this.targetForge.x + 0.5) - this.tx
        const dz = (this.targetForge.z + 0.5) - this.tz
        this.group.rotation.y = Math.atan2(dx, dz)
        this.bounce = Math.sin(this.workTimer * 12) * 0.08
        const grounded = this.ty <= topY(this.x, this.z) + 1e-4 && this.vy === 0
        this.group.position.set(this.tx, this.ty + (grounded ? Math.abs(this.bounce) : 0), this.tz)
        if (this.workTimer >= FORGE_CRAFT_DURATION) {
          if ((state.stocks.copper || 0) >= 2 && (state.stocks.tin || 0) >= 1) {
            state.stocks.copper = (state.stocks.copper || 0) - 2
            state.stocks.tin = (state.stocks.tin || 0) - 1
            state.stocks.bronze = (state.stocks.bronze || 0) + 1
            // Resources mirror, pour cohesion avec les autres ressources visibles.
            state.resources.copper = (state.resources.copper || 0) - 2
            state.resources.tin = (state.resources.tin || 0) - 1
            state.resources.bronze = (state.resources.bronze || 0) + 1
            this.skills.forging = (this.skills.forging || 0) + 1
            try { scheduleFlash(this.targetForge.x, this.targetForge.z) } catch (_) {}
            dlog('[forge] craft bronze', {
              colonist: this.name, x: this.targetForge.x, z: this.targetForge.z,
              copperLeft: state.stocks.copper, tinLeft: state.stocks.tin, bronze: state.stocks.bronze
            })
          }
          this.targetForge = null
          this.workTimer = 0
          this.currentTask = null
          this.state = 'IDLE'
          this.path = null
        }
        return
      }
      const focusTarget = this.targetJob || this.targetBush || this.targetBuildJob || this.targetFoyer
      if (focusTarget) {
        const dx = (focusTarget.x + 0.5) - this.tx
        const dz = (focusTarget.z + 0.5) - this.tz
        this.group.rotation.y = Math.atan2(dx, dz)
      }
      // Visibilite de l arc : afficher quand job de chasse actif
      if (this._bowGroup) {
        const isHunting = (this.targetJob && this.targetJob.kind === 'hunt') || this.profession === 'chasseur'
        this._bowGroup.visible = !!isHunting
      }
      this.bounce = Math.sin(this.workTimer * 12) * 0.08
      const grounded = this.ty <= topY(this.x, this.z) + 1e-4 && this.vy === 0
      this.group.position.set(this.tx, this.ty + (grounded ? Math.abs(this.bounce) : 0), this.tz)

      // Tir a distance : job de chasse avec timer 0.8s
      if (this.targetJob && this.targetJob.kind === 'hunt') {
        this.huntTimer += dt
        if (this.huntTimer < 0.8) return
        // Tir declenche
        const { x, z } = this.targetJob
        // Filtre dead : un cerf abattu reste 4s dans state.deers (animation
        // de chute via deadTimer). Sans ce filtre, un autre tireur arrivait
        // sur la cellule et redroppait viande/os, d ou la fuite continue.
        // Garde supplementaire (anti-fuite) : group present et claimedBy
        // egal a nous ou null. Un cerf claim par un autre chasseur ne peut
        // plus generer de drop.
        const deerEntry = state.deers ? state.deers.find(d =>
          d.x === x && d.z === z && !d.dead && d.group &&
          (!d.claimedBy || d.claimedBy === this)
        ) : null
        if (deerEntry) {
          if (!techUnlocked('bow-wood')) {
            removeJob(x, z, true)
            this.targetJob = null
            this.huntTimer = 0
            this.state = 'IDLE'
            if (this._bowGroup) this._bowGroup.visible = false
            return
          }
          deerEntry.dead = true
          deerEntry.deadTimer = 4.0
          deerEntry.claimedBy = null
          deerEntry.group.rotation.x = Math.PI / 2
          if (deerEntry.mixer) { deerEntry.mixer.stopAllAction(); deerEntry.mixer = null }
          // Drop spec : 3 viande crue, 2 os, 1 cuir.
          // raw-meat et hide en resources (consommables / artisanat).
          // bone en resources ET en stocks.bone (utilise par age-transitions
          // pour la condition Cairn de passage au Bronze).
          const rawBefore = state.resources['raw-meat'] || 0
          const boneBefore = state.resources['bone'] || 0
          state.resources['raw-meat'] = rawBefore + 3
          state.resources['bone']     = boneBefore + 2
          state.resources['hide']     = (state.resources['hide']     || 0) + 1
          state.stocks.bone           = (state.stocks.bone           || 0) + 2
          this.skills.hunting++
          dlog('[hunt] kill (drop +3 raw-meat, +2 bone, +1 hide)', {
            colonist: this.name,
            profession: this.profession,
            assignedJob: this.assignedJob,
            x, z,
            auto: !!(this.targetJob && this.targetJob.auto),
            rawMeatBefore: rawBefore,
            rawMeatAfter: state.resources['raw-meat'],
            boneBefore: boneBefore,
            boneAfter: state.resources['bone']
          })
          scheduleFlash(x, z)
          removeJob(x, z, true)
          state.gameStats.minesCompleted++
        } else {
          // Cerf disparu, deja mort, ou claim par un autre : aucun drop.
          dlog('[hunt] no-op (cible morte/disparue/claim autre)', {
            colonist: this.name, x, z,
            deersCount: state.deers ? state.deers.length : 0
          })
          removeJob(x, z, true)
        }
        this.targetJob = null
        this.huntTimer = 0
        this.currentTask = null
        this.state = 'IDLE'
        this.path = null
        if (this._bowGroup) this._bowGroup.visible = (this.profession === 'chasseur')
        this.group.position.set(this.tx, this.ty, this.tz)
        return
      }

      let duration = this.targetBush ? HARVEST_DURATION
        : (this.targetBuildJob ? 1.5
        : (this.targetFoyer ? 0.6
        : WORK_DURATION))
      // Lot B (mode mixte) : malus de duree pour les colons non assignes au
      // metier de la tache. Ne s applique qu aux taches basiques (cueillette
      // baies, minage pierre basique) ; les taches metier strict (abattage,
      // chasse, filon, roche montagne) sont deja gatees en amont.
      if (this._unassignedTask && UNASSIGNED_PRODUCTIVITY_MUL > 0) {
        duration = duration / UNASSIGNED_PRODUCTIVITY_MUL
      }
      if (this.workTimer >= duration) {
        if (this.targetJob) {
          const { x, z } = this.targetJob
          // Ordre de priorite : arbre > rocher > filon > buisson > voxel.
          // L'un ou l'autre est traite, jamais les deux en un coup, ce qui
          // force le joueur a sequencer les ordres (ramasser avant miner).
          const treeEntry = state.trees.find(t => t.x === x && t.z === z)
          if (isTreeOn(x, z) && treeEntry && treeEntry.growth >= 0.66 && chopTreeAt(x, z)) {
            // Lot B age 2 : bucheron-bronze a un meilleur rendement
            // (multiplicateur 1.3x sur le bois recolte, arrondi a +1 wood
            // bonus quand la tech axe-bronze est debloquee). Le bucheron
            // pierre garde son comportement initial (1 unite par arbre).
            const bronzeBonus = (this.profession === 'bucheron-bronze' && techUnlocked('axe-bronze')) ? 1 : 0
            state.resources.wood += 1 + bronzeBonus
            this.skills.logging++
            scheduleFlash(x, z)
            removeJob(x, z, true)
            state.gameStats.minesCompleted++
          } else if (isRockOn(x, z)) {
            const got = collectRockAt(x, z)
            state.resources.stone += got
            state.stocks.stone += got
            if (Math.random() < 0.15) { state.resources.silex++; state.stocks.silex++ }
            this.skills.mining++
            scheduleFlash(x, z)
            removeJob(x, z, true)
            state.gameStats.minesCompleted++
          } else {
            const oreType = extractOreAt(x, z)
            if (oreType) {
              const stockKey = ORE_TO_STOCK[oreType]
              if (stockKey && state.stocks[stockKey] != null) state.stocks[stockKey]++
              this.skills.mining++
              scheduleFlash(x, z)
              removeJob(x, z, true)
              state.gameStats.minesCompleted++
            } else if (isBushOn(x, z)) {
              const picked = grabBushAt(x, z)
              const bonus = techUnlocked('gathering-improved') ? 1 : 0
              state.resources.berries += picked + bonus
              state.gameStats.totalBerriesHarvested += picked + bonus
              this.skills.gathering++
              scheduleFlash(x, z)
              removeJob(x, z, true)
              state.gameStats.minesCompleted++
            } else {
              // Voxel terrain nu : le mineur retire la couche du dessus.
              const k = z * GRID + x
              const biomeHere = state.cellBiome[k]
              const isRocky = biomeHere === 'rock' || biomeHere === 'snow'
              if (!isRocky && !techUnlocked('shovel-stone')) {
                // Biome ordinaire sans terraformation : annuler le job sans miner.
                removeJob(x, z, true)
              } else {
                const top = state.cellTop[k]
                if (top > MIN_STRATES && top > SHALLOW_WATER_LEVEL) {
                  const idx = state.instanceIndex[z * GRID + x] ? state.instanceIndex[z * GRID + x][top - 1] : -1
                  if (idx >= 0) {
                    state.instanced.setMatrixAt(idx, HIDDEN_MATRIX)
                    state.instanced.instanceMatrix.needsUpdate = true
                    if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
                    state.cellTop[k] = top - 1
                    incrStockForBiome(biomeHere)
                    if (isRocky) state.resources.stone++
                    if (biomeHere === 'sand' && Math.random() < 0.35) { state.resources.silex++; state.stocks.silex++ }
                    scheduleFlash(x, z)
                  }
                }
                removeJob(x, z, true)
                state.gameStats.minesCompleted++
              }
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
              const bonus = techUnlocked('gathering-improved') ? 1 : 0
              state.resources.berries += picked + bonus
            }
            refreshBushBerries(bush)
            bush.regenTimer = 0
          }
          bush.claimedBy = null
          this.targetBush = null
        }
        if (this.targetFoyer) {
          // Lot B : arrivee au foyer pour lancer une cuisson. On verifie a
          // nouveau les conditions (la viande peut avoir ete consommee, le
          // foyer peut etre occupe par un autre colon entre temps).
          const foyer = this.targetFoyer
          if (!foyer.isCooking && (state.resources['raw-meat'] || 0) > 0) {
            state.resources['raw-meat'] -= 1
            foyer.isCooking = true
            foyer.cookTimer = 0
            this.skills.gathering = (this.skills.gathering || 0) + 1
          }
          this.targetFoyer = null
        }
        // Purge la tache courante a la fin du WORKING.
        this.currentTask = null
        this._unassignedTask = false
        this.state = 'IDLE'
        this.path = null
        this.group.position.set(this.tx, this.ty, this.tz)
      }
    }
  }

  skillLevel(name) { return Math.min(10, Math.floor((this.skills[name] || 0) / 20)) }

  dispose() {
    // Liberation du chantier en cas de destruction du colon (mort, retrait,
    // reset). Sans cela, l ID resterait dans builders et fausserait le
    // compteur d activite.
    if (this.targetConstructionSite && this.targetConstructionSite.builders) {
      this.targetConstructionSite.builders.delete(this.id)
      if (this.targetConstructionSite.builderSlots) {
        this.targetConstructionSite.builderSlots.delete(this.id)
      }
      this.targetConstructionSite.activeBuildersCount = this.targetConstructionSite.builders.size
    }
    // Lot B fermier : liberer le champ assigne en cas de destruction du colon.
    if (this.assignedFieldId != null) {
      releaseFromWheatFields(this.id)
      this.assignedFieldId = null
    }
    // Lot B age 2 (forgeron) : abandonner la forge cible, le bronze ne sera
    // pas produit. Pas de release a effectuer (la forge n a pas de slot par
    // colon, plusieurs forgerons peuvent partager la meme forge en sequentiel).
    if (this.targetForge) this.targetForge = null
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

// Lot B : hook appele a la fin d une construction (constructionProgress >= 1).
// Centralise les effets gameplay differes (spawn de colons big-house, vision
// du promontoire, etc.) qui ne doivent s activer qu une fois le batiment fini.
export function onBuildingComplete(site) {
  if (!site) return
  // Big-house : spawn des colons promis a la pose.
  if (site.buildingId === 'big-house' && site.pendingColonistsSpawn > 0) {
    const cx = site.x + 2
    const cz = site.z + 2
    spawnColonsAroundHouse(cx, cz, site.pendingColonistsSpawn,
      { homeKind: 'big-house', homeBuilding: site })
    site.pendingColonistsSpawn = 0
  }
  // Cabane : meme pattern, spawn differe a la fin de construction.
  if (site.buildingId === 'cabane' && site.pendingColonistsSpawn > 0) {
    spawnColonsAroundHouse(site.x, site.z, site.pendingColonistsSpawn,
      { homeKind: 'house', homeBuilding: site })
    site.pendingColonistsSpawn = 0
  }
  // Promontoire : reveler la zone de vision en differe.
  if (site.buildingId === 'promontoire' && site.pendingVisionRadius > 0) {
    const r = site.pendingVisionRadius
    revealAround(site.x, site.z, r)
    if (typeof showHudToast === 'function') {
      showHudToast(`Promontoire achevé, vision ${r} cases`, 3000)
    }
    site.pendingVisionRadius = 0
  }
}

export function spawnColonist(x, z, opts) {
  const id = state.colonists.length
  const c = new Colonist(id, x, z, opts)
  state.colonists.push(c)
  // Assigner la maison la plus proche pour homeId legacy. Le lien residents
  // explicite (Lot B residents) est pose par spawnColonsAroundHouse via
  // homeBuildingId + building.residents, pas ici, pour eviter une
  // double affectation incoherente sur les big-house / manoirs.
  let nearestHouse = null
  let nearestDist = Infinity
  for (const h of (state.houses || [])) {
    const d = Math.abs(h.x - x) + Math.abs(h.z - z)
    if (d < nearestDist) { nearestDist = d; nearestHouse = h }
  }
  c.homeId = nearestHouse ? nearestHouse.id : null
  return c
}

export function clearColonists() {
  for (const c of state.colonists) c.dispose()
  state.colonists.length = 0
  state.usedNames.clear()
}

// Lot B : applique des niveaux aleatoires faibles (1 a 3 dans 2 ou 3 skills)
// a un colon nouvellement spawne par construction de maison, et tire la chance
// "star" (STAR_COLONIST_CHANCE) qui place une de ses skills directement au
// niveau 10 (200 XP, plafond skillLevel). Toast d annonce si star.
// Le hameau initial (worldgen) n appelle pas cette fonction et garde le RNG
// _randSkill par defaut du constructeur.
function applyRandomLevelsAndStar(c) {
  if (!c || !c.skills) return
  const skillIds = Object.keys(c.skills)
  if (skillIds.length === 0) return
  // Reset a 0 toutes les skills (le constructeur a deja tire 1-5).
  for (const id of skillIds) c.skills[id] = 0
  // 2 ou 3 skills aleatoires recoivent 1 a 3 XP brut. NB : skillLevel = floor(xp/20)
  // donc 1-3 XP donne niveau 0 affiche. Pour avoir un niveau visible 1 a 3, il
  // faut 20 a 79 XP. On interprete la spec "niveau 1-3" en XP correspondant.
  const pool = skillIds.slice()
  const picked = []
  const target = 2 + Math.floor(Math.random() * 2) // 2 ou 3
  for (let i = 0; i < target && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  for (const sk of picked) {
    const lvl = 1 + Math.floor(Math.random() * 3) // 1, 2 ou 3
    c.skills[sk] = lvl * 20
  }
  // Star : 5% de chance, une skill aleatoire passe niveau 10 (200 XP).
  if (Math.random() < STAR_COLONIST_CHANCE) {
    const starSkill = skillIds[Math.floor(Math.random() * skillIds.length)]
    c.skills[starSkill] = 200
    c.isStar = true
    if (typeof showHudToast === 'function') {
      showHudToast(`Une étoile est née : ${c.name || 'colon'}.`, 4000)
    }
  } else {
    c.isStar = false
  }
}

// Lot B residents : choisit le genre du i-ieme colon spawne pour permettre
// l appairage de couples M/F dans la meme habitation (cabane = 1 couple,
// big-house = jusqu a 2 couples). Au dela, alterne pour eviter les biais.
function _genderForIndex(i, count) {
  if (count >= 2) {
    if (i === 0) return 'M'
    if (i === 1) return 'F'
    if (i === 2) return 'M'
    if (i === 3) return 'F'
  }
  return (i % 2 === 0) ? 'M' : 'F'
}

export function spawnColonsAroundHouse(hx, hz, count, opts = {}) {
  const homeKind = opts && opts.homeKind ? opts.homeKind : null
  const homeBuilding = opts && opts.homeBuilding ? opts.homeBuilding : null
  // Compat : assignedBuildingId reste l id de batiments.json le plus pertinent
  // pour le besoin shelter (utilise par needs.js avant la generalisation
  // residents). En l absence d info, on retombe sur 'cabane'.
  const shelterId = homeKind === 'big-house' ? 'big-house'
                  : homeKind === 'manor'     ? 'manor'
                  : 'cabane'
  const homeRef = (homeKind && homeBuilding) ? makeHomeRef(homeKind, homeBuilding) : null

  const spawned = []           // colons effectivement crees
  const spawnedCells = []      // coords (compat retour legacy)
  const tried = new Set()
  let idx = 0

  const _link = (c) => {
    if (!c) return
    c.assignedBuildingId = shelterId
    applyRandomLevelsAndStar(c)
    if (homeRef && homeBuilding) {
      if (!Array.isArray(homeBuilding.residents)) homeBuilding.residents = []
      // Verifie capacite : si pleine, on link pas (le colon reste Sans-abri).
      const cap = (typeof homeBuilding.residentsCapacity === 'number')
        ? homeBuilding.residentsCapacity
        : Infinity
      if (homeBuilding.residents.length < cap) {
        homeBuilding.residents.push(c.id)
        c.homeBuildingId = homeRef
      }
    }
  }

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
        const g = _genderForIndex(idx, count)
        const c = spawnColonist(x, z, { forceGender: g })
        _link(c)
        spawned.push(c)
        spawnedCells.push({ x, z })
        idx++
      }
    }
  }
  while (spawned.length < count) {
    const fx = Math.max(0, Math.min(GRID - 1, hx + spawned.length))
    const fz = Math.max(0, Math.min(GRID - 1, hz))
    const g = _genderForIndex(idx, count)
    const c = spawnColonist(fx, fz, { forceGender: g })
    _link(c)
    spawned.push(c)
    spawnedCells.push({ x: fx, z: fz })
    idx++
  }

  // Lot B residents : appairer les couples (0+1 et 2+3 si presents).
  if (count >= 2 && spawned[0] && spawned[1]) {
    spawned[0].partnerId = spawned[1].id
    spawned[1].partnerId = spawned[0].id
  }
  if (count >= 4 && spawned[2] && spawned[3]) {
    spawned[2].partnerId = spawned[3].id
    spawned[3].partnerId = spawned[2].id
  }
  return spawnedCells
}
