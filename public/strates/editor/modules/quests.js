import { state } from './state.js'
import { refreshHUD } from './hud.js'

// ============================================================================
// Catalogue de quêtes (hardcodé)
// ============================================================================

const QUEST_CATALOG = [
  {
    id: 'berries-75',
    title: 'Récolte de baies',
    description: 'Récoltez 75 baies pour l\'hiver.',
    goal: { type: 'stat', key: 'totalBerriesHarvested', target: 75 },
    reward: { researchPoints: 30 },
    color: '#8c5cc4'
  },
  {
    id: 'houses-3',
    title: 'Bâtir le hameau',
    description: 'Construisez 3 maisons pour le clan.',
    goal: { type: 'stat', key: 'housesPlaced', target: 3 },
    reward: { researchPoints: 20 },
    color: '#c97a4a'
  },
  {
    id: 'colons-8',
    title: 'Croissance du clan',
    description: 'Accueillez 8 colons dans le village.',
    goal: { type: 'colonists', target: 8 },
    reward: { researchPoints: 25 },
    color: '#ffb070'
  },
  {
    id: 'mines-5',
    title: 'Extraction minière',
    description: 'Complétez 5 chantiers de mine.',
    goal: { type: 'stat', key: 'minesCompleted', target: 5 },
    reward: { researchPoints: 35, stone: 10 },
    color: '#a8a196'
  },
  {
    id: 'foyer-1',
    title: 'Feu sacré',
    description: 'Allumez un foyer au cœur du village.',
    goal: { type: 'foyer', target: 1 },
    reward: { researchPoints: 40 },
    color: '#ff8c00'
  },
  {
    id: 'berries-150',
    title: 'Provisions d\'hiver',
    description: 'Récoltez 150 baies au total.',
    goal: { type: 'stat', key: 'totalBerriesHarvested', target: 150 },
    reward: { researchPoints: 50 },
    color: '#6b2d8c'
  },
  {
    id: 'houses-5',
    title: 'Village en essor',
    description: 'Construisez 5 maisons.',
    goal: { type: 'stat', key: 'housesPlaced', target: 5 },
    reward: { researchPoints: 45, stone: 5 },
    color: '#c97a4a'
  },
  {
    id: 'mines-15',
    title: 'Maître mineur',
    description: 'Complétez 15 chantiers de mine.',
    goal: { type: 'stat', key: 'minesCompleted', target: 15 },
    reward: { researchPoints: 60, stone: 20 },
    color: '#7d8a9a'
  },
  {
    id: 'colons-12',
    title: 'Tribu prospère',
    description: 'Atteignez 12 colons dans le village.',
    goal: { type: 'colonists', target: 12 },
    reward: { researchPoints: 55 },
    color: '#ffb070'
  }
]

function resolveGoal(goal) {
  if (goal.type === 'stat')      return () => state.gameStats[goal.key] || 0
  if (goal.type === 'colonists') return () => state.colonists.length
  if (goal.type === 'foyer')     return () => (state.foyers || []).length
  return () => 0
}

// ============================================================================
// API publique
// ============================================================================

export function getAvailableQuests() {
  const doneIds = new Set((state.questsCompleted || []).map(q => q.id))
  const activeId = state.questActive ? state.questActive.id : null
  const pool = QUEST_CATALOG.filter(q => !doneIds.has(q.id) && q.id !== activeId)
  state.questsAvailable = pool.slice(0, 3).map(q => ({ ...q, check: resolveGoal(q.goal) }))
  try { window.dispatchEvent(new CustomEvent('strates:questsAvailable', { detail: { quests: state.questsAvailable } })) } catch (_) {}
}

export function acceptQuest(id) {
  const q = (state.questsAvailable || []).find(q => q.id === id)
  if (!q) return
  state.questActive = { ...q, progress: 0, completed: false }
  state.questsAvailable = (state.questsAvailable || []).filter(x => x.id !== id)
  try { window.dispatchEvent(new CustomEvent('strates:questAccepted', { detail: { quest: state.questActive } })) } catch (_) {}
  refreshHUD()
}

function applyReward(reward) {
  if (!reward) return
  if (reward.researchPoints) state.researchPoints = (state.researchPoints || 0) + reward.researchPoints
  if (reward.wood)   state.resources.wood   = (state.resources.wood   || 0) + reward.wood
  if (reward.stone)  state.resources.stone  = (state.resources.stone  || 0) + reward.stone
  if (reward.berries) state.resources.berries = (state.resources.berries || 0) + reward.berries
}

function checkQuestProgress() {
  const q = state.questActive
  if (!q || q.completed) return
  const check = q.check || resolveGoal(q.goal)
  const p = Math.min(q.goal.target, check())
  state.questActive.progress = p
  if (p >= q.goal.target) {
    state.questActive.completed = true
    applyReward(q.reward)
    state.questsCompleted = [...(state.questsCompleted || []), { id: q.id, title: q.title }]
    try { window.dispatchEvent(new CustomEvent('strates:questCompleted', { detail: { quest: state.questActive } })) } catch (_) {}
    state.questActive = null
    getAvailableQuests()
    refreshHUD()
  }
}

// ============================================================================
// Compatibilité avec main.js et worldgen.js
// ============================================================================

export function initQuestDefs() { /* catalogue hardcodé, rien à faire */ }
export function startNextQuest() { getAvailableQuests() }

export function updateQuests(_nowSec) {
  checkQuestProgress()
}

// ============================================================================
// Rendu HTML
// ============================================================================

const questsBodyEl = () => document.getElementById('quests-body')
let lastQuestSig = ''

export function resetQuestSig() { lastQuestSig = '' }

function rewardLabel(r) {
  if (!r) return ''
  const parts = []
  if (r.researchPoints) parts.push('+' + r.researchPoints + ' recherche')
  if (r.stone)  parts.push('+' + r.stone + ' pierre')
  if (r.wood)   parts.push('+' + r.wood + ' bois')
  if (r.berries) parts.push('+' + r.berries + ' baies')
  return parts.join(' · ')
}

export function renderQuests() {
  const el = questsBodyEl()
  if (!el) return

  const q = state.questActive
  const avail = state.questsAvailable || []

  let sig
  if (q) {
    sig = 'active:' + q.id + ':' + (q.progress || 0) + ':' + (q.completed ? 'y' : 'n')
  } else {
    sig = 'avail:' + avail.map(x => x.id).join(',')
  }
  if (sig === lastQuestSig) return
  lastQuestSig = sig

  if (q) {
    const pct = Math.min(100, Math.round(((q.progress || 0) / q.goal.target) * 100))
    el.innerHTML =
      '<div class="quest' + (q.completed ? ' done' : '') + '">' +
        '<div class="qtitle"><span class="qdot" style="background:' + q.color + '"></span>' + q.title + '</div>' +
        '<div class="qdesc">' + q.description + '</div>' +
        '<div class="qbar"><div class="qfill" style="width:' + pct + '%"></div></div>' +
        '<div class="qprog">' + (q.progress || 0) + ' / ' + q.goal.target + '</div>' +
      '</div>'
    return
  }

  if (avail.length === 0) {
    el.innerHTML = '<div class="qdone-msg">Toutes les quêtes sont complétées</div>'
    return
  }

  el.innerHTML =
    '<div class="qa-header">Choisissez une quête</div>' +
    avail.map(x =>
      '<div class="qa-item">' +
        '<div class="qtitle"><span class="qdot" style="background:' + x.color + '"></span>' + x.title + '</div>' +
        '<div class="qdesc">' + x.description + '</div>' +
        '<div class="qreward">' + rewardLabel(x.reward) + '</div>' +
        '<button class="qa-btn" data-qid="' + x.id + '">Accepter</button>' +
      '</div>'
    ).join('')

  el.querySelectorAll('.qa-btn').forEach(btn => {
    btn.addEventListener('click', () => acceptQuest(btn.dataset.qid))
  })
}
