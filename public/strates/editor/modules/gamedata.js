// ============================================================================
// Donnees de jeu chargees depuis les fichiers JSON au demarrage.
// Exports live : les modules qui importent ces variables voient la valeur
// mise a jour apres l'appel a loadGameData().
// SPEC v1 -- ne pas modifier le schema sans ouvrir un ticket.
// ============================================================================

import { dinfo } from './debug.js'

export let SPEECH_LINES              = []
export let SPEECH_LINES_BY_NAME      = {}
export let SPEECH_LINES_INSISTENT    = []
export let SPEECH_CONTEXT_SEASON     = {}
export let SPEECH_CONTEXT_FIELD_NO_RESEARCH = []
export let SPEECH_CONTEXT_EMPTY_LAB  = []
export let TECH_BUBBLE_LINES         = {}

export let MALE_NAMES   = []
export let FEMALE_NAMES = []

export let QUEST_DEFS_BASE = []

export let TECH_TREE_DATA  = null
export let BUILDINGS_DATA  = null
export let JOBS_DATA        = null
export let NEEDS_DATA       = null
export let RESOURCES_DATA   = null

// ============================================================================
// Chargement principal
// ============================================================================

export async function loadGameData() {
  const base = new URL('./../data/', import.meta.url).href

  const [speech, colonists, quests, techtree, buildings, jobs, needs, resources] = await Promise.all([
    fetch(base + 'speech.json').then(r => r.json()),
    fetch(base + 'colonists.json').then(r => r.json()),
    fetch(base + 'quests.json').then(r => r.json()),
    fetch(base + 'techtree.json').then(r => r.json()),
    fetch(base + 'buildings.json').then(r => r.json()),
    fetch(base + 'jobs.json').then(r => r.json()),
    fetch(base + 'needs.json').then(r => r.json()),
    fetch(base + 'resources.json').then(r => r.json()),
  ])

  SPEECH_LINES              = speech.lines
  SPEECH_LINES_BY_NAME      = speech.byName
  SPEECH_LINES_INSISTENT    = speech.insistent
  SPEECH_CONTEXT_SEASON     = speech.contextSeason
  SPEECH_CONTEXT_FIELD_NO_RESEARCH = speech.contextFieldNoResearch
  SPEECH_CONTEXT_EMPTY_LAB  = speech.contextEmptyLab
  TECH_BUBBLE_LINES         = speech.techBubble

  MALE_NAMES   = colonists.maleNames
  FEMALE_NAMES = colonists.femaleNames

  QUEST_DEFS_BASE = quests.quests
  TECH_TREE_DATA  = techtree
  BUILDINGS_DATA  = buildings
  JOBS_DATA        = jobs
  NEEDS_DATA       = needs
  RESOURCES_DATA   = resources

  _runLinter()
}

// ============================================================================
// Accesseurs (fonctions pures, utilisables aussi en tests unitaires)
// ============================================================================

/**
 * Retourne toutes les techs de l'age donne.
 * @param {number} n - numero d'age (1 = Pierre, 2 = Bronze, etc.)
 * @returns {Array}
 */
export function getTechsForAge(n) {
  if (!TECH_TREE_DATA || !TECH_TREE_DATA.techs) return []
  return TECH_TREE_DATA.techs.filter(t => t.age === n)
}

/**
 * Retourne un batiment par son id, ou undefined si introuvable.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getBuildingById(id) {
  if (!BUILDINGS_DATA || !BUILDINGS_DATA.buildings) return undefined
  return BUILDINGS_DATA.buildings.find(b => b.id === id)
}

/**
 * Retourne tous les metiers qui necessitent la tech donnee.
 * @param {string} techId
 * @returns {Array}
 */
export function getJobsRequiringTech(techId) {
  if (!JOBS_DATA || !JOBS_DATA.jobs) return []
  return JOBS_DATA.jobs.filter(j =>
    j.requires && j.requires.tech && j.requires.tech.includes(techId)
  )
}

/**
 * Retourne tous les besoins introduits a l'age donne.
 * @param {number} n - numero d'age
 * @returns {Array}
 */
export function getNeedsForAge(n) {
  if (!NEEDS_DATA || !NEEDS_DATA.needs) return []
  return NEEDS_DATA.needs.filter(need => need.age_introduced === n)
}

/**
 * Retourne une ressource par son id, ou undefined si introuvable.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getResourceById(id) {
  if (!RESOURCES_DATA || !RESOURCES_DATA.resources) return undefined
  return RESOURCES_DATA.resources.find(r => r.id === id)
}

/**
 * Retourne tous les batiments de l'age donne.
 * @param {number} n - numero d'age (1 = Pierre, 2 = Bronze, etc.)
 * @returns {Array}
 */
export function getBuildingsForAge(n) {
  if (!BUILDINGS_DATA || !BUILDINGS_DATA.buildings) return []
  return BUILDINGS_DATA.buildings.filter(b => b.age === n)
}

/**
 * Calcule la nourriture totale disponible (baies + viande).
 * @param {object} st - objet state
 * @returns {number}
 */
export function getTotalFood(st) {
  if (!st || !st.resources) return 0
  const berries = (st.resources.berries || 0)
  const raw = (st.resources['raw-meat'] || 0)
  const cooked = (st.resources['cooked-meat'] || 0)
  // La viande cuite vaut 2 unites de nourriture (plus rassasiante).
  return berries + raw + cooked * 2
}

// ============================================================================
// Linter de references croisees (appele au boot)
// Verifie que chaque "requires" pointe vers un id existant.
// ============================================================================

function _collectAllIds() {
  const ids = new Set()

  if (TECH_TREE_DATA && TECH_TREE_DATA.techs) {
    TECH_TREE_DATA.techs.forEach(t => ids.add(t.id))
  }
  if (BUILDINGS_DATA && BUILDINGS_DATA.buildings) {
    BUILDINGS_DATA.buildings.forEach(b => ids.add(b.id))
  }
  if (JOBS_DATA && JOBS_DATA.jobs) {
    JOBS_DATA.jobs.forEach(j => ids.add(j.id))
  }
  if (NEEDS_DATA && NEEDS_DATA.needs) {
    NEEDS_DATA.needs.forEach(n => ids.add(n.id))
  }
  if (RESOURCES_DATA && RESOURCES_DATA.resources) {
    RESOURCES_DATA.resources.forEach(r => ids.add(r.id))
  }

  return ids
}

function _runLinter() {
  const allIds = _collectAllIds()
  const errors = []

  // Verifier les requires dans techtree.json
  if (TECH_TREE_DATA && TECH_TREE_DATA.techs) {
    TECH_TREE_DATA.techs.forEach(tech => {
      if (!Array.isArray(tech.requires)) return
      tech.requires.forEach(reqId => {
        if (!allIds.has(reqId)) {
          errors.push(`[gamedata linter] techtree.json > tech "${tech.id}" > requires "${reqId}" : id introuvable dans les JSON charges.`)
        }
      })
      // Verifier les ids dans unlocks
      if (tech.unlocks) {
        const unlockFields = ['buildings', 'jobs', 'resources']
        unlockFields.forEach(field => {
          if (!Array.isArray(tech.unlocks[field])) return
          tech.unlocks[field].forEach(uid => {
            if (!allIds.has(uid)) {
              errors.push(`[gamedata linter] techtree.json > tech "${tech.id}" > unlocks.${field} "${uid}" : id introuvable dans les JSON charges.`)
            }
          })
        })
      }
    })
  }

  // Verifier les requires dans buildings.json
  if (BUILDINGS_DATA && BUILDINGS_DATA.buildings) {
    BUILDINGS_DATA.buildings.forEach(building => {
      if (!building.requires) return
      if (Array.isArray(building.requires.tech)) {
        building.requires.tech.forEach(reqId => {
          if (!allIds.has(reqId)) {
            errors.push(`[gamedata linter] buildings.json > building "${building.id}" > requires.tech "${reqId}" : id introuvable.`)
          }
        })
      }
      if (Array.isArray(building.requires.buildings)) {
        // Deduplique pour les fusions (ex: 4x "cabane")
        const unique = [...new Set(building.requires.buildings)]
        unique.forEach(reqId => {
          if (!allIds.has(reqId)) {
            errors.push(`[gamedata linter] buildings.json > building "${building.id}" > requires.buildings "${reqId}" : id introuvable.`)
          }
        })
      }
    })
  }

  // Verifier les requires dans jobs.json
  if (JOBS_DATA && JOBS_DATA.jobs) {
    JOBS_DATA.jobs.forEach(job => {
      if (!job.requires) return
      if (Array.isArray(job.requires.tech)) {
        job.requires.tech.forEach(reqId => {
          if (!allIds.has(reqId)) {
            errors.push(`[gamedata linter] jobs.json > job "${job.id}" > requires.tech "${reqId}" : id introuvable.`)
          }
        })
      }
      if (Array.isArray(job.requires.buildings)) {
        job.requires.buildings.forEach(reqId => {
          if (!allIds.has(reqId)) {
            errors.push(`[gamedata linter] jobs.json > job "${job.id}" > requires.buildings "${reqId}" : id introuvable.`)
          }
        })
      }
      // Verifier les ressources produites
      if (Array.isArray(job.produces)) {
        job.produces.forEach(resId => {
          if (resId === '' ) return
          if (!allIds.has(resId)) {
            errors.push(`[gamedata linter] jobs.json > job "${job.id}" > produces "${resId}" : id introuvable dans resources.json.`)
          }
        })
      }
    })
  }

  // Verifier les satisfied_by dans needs.json
  if (NEEDS_DATA && NEEDS_DATA.needs) {
    NEEDS_DATA.needs.forEach(need => {
      if (!Array.isArray(need.satisfied_by)) return
      need.satisfied_by.forEach(entry => {
        if (!allIds.has(entry.resource)) {
          errors.push(`[gamedata linter] needs.json > need "${need.id}" > satisfied_by resource "${entry.resource}" : id introuvable dans resources.json.`)
        }
      })
    })
  }

  if (errors.length > 0) {
    errors.forEach(e => console.error(e))
    console.error(`[gamedata linter] ${errors.length} erreur(s) de reference croisee detectee(s). Verifiez les JSON.`)
  } else {
    dinfo('[gamedata linter] OK -- toutes les references croisees sont valides.')
  }
}

// ============================================================================
// Tests unitaires purs (sans framework, executables en console)
// Appeler runUnitTests() depuis la console du navigateur pour verifier.
// ============================================================================

export function runUnitTests() {
  const results = []
  let passed = 0
  let failed = 0

  function assert(label, condition) {
    if (condition) {
      results.push(`  PASS : ${label}`)
      passed++
    } else {
      results.push(`  FAIL : ${label}`)
      failed++
    }
  }

  // Test 1 : getTechsForAge retourne uniquement les techs de l'age 1
  const techsAge1 = getTechsForAge(1)
  assert(
    'getTechsForAge(1) retourne un tableau non vide',
    Array.isArray(techsAge1) && techsAge1.length > 0
  )
  assert(
    'getTechsForAge(1) ne contient que des techs age 1',
    techsAge1.every(t => t.age === 1)
  )

  // Test 2 : getTechsForAge sur age inexistant retourne tableau vide
  const techsAge99 = getTechsForAge(99)
  assert(
    'getTechsForAge(99) retourne un tableau vide',
    Array.isArray(techsAge99) && techsAge99.length === 0
  )

  // Test 3 : getBuildingById retourne le bon batiment
  const cairn = getBuildingById('cairn-pierre')
  assert(
    'getBuildingById("cairn-pierre") retourne un objet',
    cairn !== undefined && cairn !== null
  )
  assert(
    'getBuildingById("cairn-pierre").onBuild vaut trigger_age_transition_bronze',
    cairn && cairn.onBuild === 'trigger_age_transition_bronze'
  )

  // Test 4 : getBuildingById sur id inexistant retourne undefined
  const ghost = getBuildingById('inexistant-xyz')
  assert(
    'getBuildingById("inexistant-xyz") retourne undefined',
    ghost === undefined
  )

  // Test 5 : getJobsRequiringTech retourne les bons metiers
  const jobsAxe = getJobsRequiringTech('axe-stone')
  assert(
    'getJobsRequiringTech("axe-stone") contient bucheron',
    Array.isArray(jobsAxe) && jobsAxe.some(j => j.id === 'bucheron')
  )

  // Test 6 : getNeedsForAge retourne les besoins de l'age 1
  const needsAge1 = getNeedsForAge(1)
  assert(
    'getNeedsForAge(1) retourne un tableau non vide',
    Array.isArray(needsAge1) && needsAge1.length > 0
  )
  assert(
    'getNeedsForAge(1) contient hunger',
    needsAge1.some(n => n.id === 'hunger')
  )

  // Test 7 : getResourceById retourne la bonne ressource
  const silex = getResourceById('silex')
  assert(
    'getResourceById("silex") retourne un objet',
    silex !== undefined && silex !== null
  )
  assert(
    'getResourceById("silex").subtype vaut "pierre"',
    silex && silex.subtype === 'pierre'
  )

  console.group('[gamedata tests unitaires]')
  results.forEach(r => console.log(r))
  console.log(`\nResultat : ${passed} PASS / ${failed} FAIL`)
  console.groupEnd()

  return { passed, failed, total: passed + failed }
}
