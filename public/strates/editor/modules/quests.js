import { QUEST_DEFS_BASE } from './constants.js'
import { state } from './state.js'

// ============================================================================
// Quetes : definitions avec check() dynamique sur state
// ============================================================================

function resolveCheck(checkKey) {
  switch (checkKey) {
    case 'berries': return () => state.resources.berries
    case 'minesCompleted': return () => state.gameStats.minesCompleted
    case 'housesPlaced': return () => state.gameStats.housesPlaced
    case 'colonistsCount': return () => state.colonists.length
    case 'totalBerriesHarvested': return () => state.gameStats.totalBerriesHarvested
    default: return () => 0
  }
}

export const QUEST_DEFS = QUEST_DEFS_BASE.map(q => ({ ...q, check: resolveCheck(q.checkKey) }))

export function startNextQuest() {
  if (state.questIndex >= QUEST_DEFS.length) {
    state.currentQuest = null
    return
  }
  const def = QUEST_DEFS[state.questIndex]
  state.currentQuest = { ...def, progress: 0, completed: false }
  state.questCompletedAt = -1
}

export function updateQuests(nowSec) {
  if (!state.currentQuest) return
  if (!state.currentQuest.completed) {
    const p = Math.min(state.currentQuest.target, state.currentQuest.check())
    state.currentQuest.progress = p
    if (p >= state.currentQuest.target) {
      state.currentQuest.completed = true
      state.questCompletedAt = nowSec
    }
  } else if (nowSec - state.questCompletedAt >= 3) {
    state.questIndex++
    startNextQuest()
  }
}

const questsBodyEl = () => document.getElementById('quests-body')
let lastQuestSig = ''

export function renderQuests() {
  const el = questsBodyEl()
  if (!el) return
  let sig
  if (!state.currentQuest) {
    sig = 'done'
    if (sig === lastQuestSig) return
    lastQuestSig = sig
    el.innerHTML = '<div class="qdone-msg">Toutes les quêtes du proto sont complétées</div>'
    return
  }
  sig = state.currentQuest.id + ':' + state.currentQuest.progress + ':' + (state.currentQuest.completed ? 'y' : 'n')
  if (sig === lastQuestSig) return
  lastQuestSig = sig
  const pct = Math.min(100, Math.round((state.currentQuest.progress / state.currentQuest.target) * 100))
  el.innerHTML =
    '<div class="quest' + (state.currentQuest.completed ? ' done' : '') + '">' +
      '<div class="qtitle"><span class="qdot" style="background:' + state.currentQuest.color + '"></span>' + state.currentQuest.title + '</div>' +
      '<div class="qbar"><div class="qfill" style="width:' + pct + '%"></div></div>' +
      '<div class="qprog">' + state.currentQuest.progress + ' / ' + state.currentQuest.target + '</div>' +
    '</div>'
}

export function resetQuestSig() { lastQuestSig = '' }
