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
  const activeIds = new Set((state.questsActive || []).map(q => q.id))
  const pool = QUEST_CATALOG.filter(q => !doneIds.has(q.id) && !activeIds.has(q.id))
  const needed = 3 - (state.questsActive || []).length
  state.questsAvailable = pool.slice(0, Math.max(0, needed + 3)).map(q => ({ ...q, check: resolveGoal(q.goal) }))
  try { window.dispatchEvent(new CustomEvent('strates:questsAvailable', { detail: { quests: state.questsAvailable } })) } catch (_) {}
}

export function acceptQuest(id) {
  const q = (state.questsAvailable || []).find(q => q.id === id)
  if (!q) return
  if (!state.questsActive) state.questsActive = []
  if (state.questsActive.length >= 3) return
  if (state.questsActive.some(a => a.id === id)) return
  const active = { ...q, progress: 0, completed: false }
  state.questsActive.push(active)
  state.questsAvailable = (state.questsAvailable || []).filter(x => x.id !== id)
  try { window.dispatchEvent(new CustomEvent('strates:questAccepted', { detail: { quest: active } })) } catch (_) {}
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
  if (!state.questsActive || state.questsActive.length === 0) return
  let anyCompleted = false
  const stillActive = []
  for (const q of state.questsActive) {
    if (q.completed) continue
    const check = q.check || resolveGoal(q.goal)
    const p = Math.min(q.goal.target, check())
    q.progress = p
    if (p >= q.goal.target) {
      q.completed = true
      applyReward(q.reward)
      state.questsCompleted = [...(state.questsCompleted || []), { id: q.id, title: q.title }]
      try { window.dispatchEvent(new CustomEvent('strates:questCompleted', { detail: { quest: q } })) } catch (_) {}
      anyCompleted = true
    } else {
      stillActive.push(q)
    }
  }
  if (anyCompleted) {
    state.questsActive = stillActive
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
let activeTab = 'available'

export function resetQuestSig() { lastQuestSig = ''; activeTab = 'available' }

function rewardLabel(r) {
  if (!r) return ''
  const parts = []
  if (r.researchPoints) parts.push('+' + r.researchPoints + ' recherche')
  if (r.stone)  parts.push('+' + r.stone + ' pierre')
  if (r.wood)   parts.push('+' + r.wood + ' bois')
  if (r.berries) parts.push('+' + r.berries + ' baies')
  return parts.join(' · ')
}

function buildSig() {
  const active = state.questsActive || []
  const avail = state.questsAvailable || []
  const done = state.questsCompleted || []
  return activeTab +
    '|a:' + active.map(q => q.id + ':' + (q.progress || 0)).join(';') +
    '|v:' + avail.map(x => x.id).join(',') +
    '|d:' + done.length
}

function renderTabContent(body) {
  const active = state.questsActive || []
  const avail = state.questsAvailable || []
  const done = state.questsCompleted || []

  if (activeTab === 'available') {
    if (avail.length === 0 && active.length === 0) {
      body.innerHTML = '<div class="qall-done">Toutes les quêtes sont complétées !</div>'
      return
    }
    if (avail.length === 0) {
      body.innerHTML = '<div class="qactive-empty">3 quêtes en cours, revenez après en avoir complété une.</div>'
      return
    }
    body.innerHTML = avail.map(x =>
      '<div class="qcard">' +
        '<div class="qcard-title"><span class="qdot" style="background:' + x.color + '"></span>' + x.title + '</div>' +
        '<div class="qcard-desc">' + x.description + '</div>' +
        (rewardLabel(x.reward) ? '<div class="qcard-reward">' + rewardLabel(x.reward) + '</div>' : '') +
        (active.length < 3 ? '<button class="qcard-accept" data-qid="' + x.id + '">Accepter</button>' : '') +
      '</div>'
    ).join('')
    body.querySelectorAll('.qcard-accept').forEach(btn => {
      btn.addEventListener('click', () => {
        acceptQuest(btn.dataset.qid)
        activeTab = 'active'
        lastQuestSig = ''
        renderQuests()
      })
    })
    return
  }

  if (activeTab === 'active') {
    if (active.length === 0) {
      body.innerHTML = '<div class="qactive-empty">Aucune quête en cours.<br>Acceptez-en une dans l\'onglet "À prendre".</div>'
      return
    }
    body.innerHTML = active.map(q => {
      const pct = Math.min(100, Math.round(((q.progress || 0) / q.goal.target) * 100))
      return '<div class="qactive-card">' +
        '<div class="qactive-title"><span class="qdot" style="background:' + q.color + '"></span>' + q.title + '</div>' +
        '<div class="qactive-desc">' + q.description + '</div>' +
        '<div class="qbar"><div class="qfill" style="width:' + pct + '%"></div></div>' +
        '<div class="qprog">' + (q.progress || 0) + ' / ' + q.goal.target + '</div>' +
      '</div>'
    }).join('')
    return
  }

  if (activeTab === 'done') {
    if (done.length === 0) {
      body.innerHTML = '<div class="qdone-empty">Aucune quête complétée pour l\'instant.</div>'
      return
    }
    body.innerHTML = done.map(x =>
      '<div class="qdone-item"><span class="qdone-check">✓</span>' + x.title + '</div>'
    ).join('')
  }
}

export function renderQuests() {
  const tabsBar = document.getElementById('quests-tabs-bar')
  const body = questsBodyEl()
  if (!body) return

  const sig = buildSig()
  if (sig === lastQuestSig) return
  lastQuestSig = sig

  const avail = state.questsAvailable || []
  const done = state.questsCompleted || []
  const activeCount = (state.questsActive || []).length

  const badge = (n) => n > 0 ? '<span class="q-tab-badge">' + n + '</span>' : ''

  if (tabsBar) {
    tabsBar.innerHTML =
      '<div class="q-tabs">' +
        '<button class="q-tab' + (activeTab === 'available' ? ' active' : '') + '" data-tab="available">À prendre' + badge(avail.length) + '</button>' +
        '<button class="q-tab' + (activeTab === 'active' ? ' active' : '') + '" data-tab="active">En cours' + badge(activeCount) + '</button>' +
        '<button class="q-tab' + (activeTab === 'done' ? ' active' : '') + '" data-tab="done">Réalisées' + badge(done.length) + '</button>' +
      '</div>'
    tabsBar.querySelectorAll('.q-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab
        lastQuestSig = ''
        renderQuests()
      })
    })
  }

  renderTabContent(body)
}
