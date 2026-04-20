// ============================================================================
// Données de jeu chargées depuis les fichiers JSON au démarrage.
// Exports live : les modules qui importent ces variables voient la valeur
// mise à jour après l'appel à loadGameData().
// ============================================================================

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

export let TECH_TREE_DATA = null

export async function loadGameData() {
  const base = new URL('./../data/', import.meta.url).href

  const [speech, colonists, quests, techtree] = await Promise.all([
    fetch(base + 'speech.json').then(r => r.json()),
    fetch(base + 'colonists.json').then(r => r.json()),
    fetch(base + 'quests.json').then(r => r.json()),
    fetch(base + 'techtree.json').then(r => r.json()),
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
}
