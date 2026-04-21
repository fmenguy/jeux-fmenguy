// ============================================================================
// Lot B, file de taches par colon et systeme de priorites.
//
// Une Task decrit une intention temporaire du colon (aller chercher a manger,
// aller a son batiment assigne, cueillir un buisson, miner un job joueur...).
// Elle se compose de :
//   { kind, priority, payload, reason }
//
// Priorites (nombre haut = plus urgent) :
//   SURVIVAL = 100   besoins critiques (faim, blessures)
//   WORK     =  60   taches designees par le joueur (jobs, buildJobs, labo)
//   LEISURE  =  30   cueillette, loisir, feu de camp la nuit
//   IDLE     =  10   flane, errance
//
// Le module ne modifie pas directement l etat du colon, il expose :
//   - enqueueTask(colonist, task)   push avec ordre decroissant de priorite
//   - peekTask(colonist)             prochaine task (sans consommer)
//   - popTask(colonist)              consomme la prochaine task
//   - clearLowPriorityTasks(c, lvl)  purge ce qui est strictement sous lvl
//   - PRIORITY                       export des constantes
//   - TASK_KIND                      export des constantes de types
//
// L execution effective (pathfinding, animation) reste dans colonist.js qui
// lit la queue via peekTask/popTask. tasks.js n est qu un scheduler.
// ============================================================================

export const PRIORITY = Object.freeze({
  SURVIVAL: 100,
  WORK:      60,
  LEISURE:   30,
  IDLE:      10
})

export const TASK_KIND = Object.freeze({
  EAT_SEEK_FOOD:     'eat_seek_food',     // aller vers buisson, manger
  GO_TO_SHELTER:     'go_to_shelter',     // rejoindre sa Cabane assignee (pas implemente)
  PLAYER_JOB:        'player_job',        // job designe (minage)
  PLAYER_BUILD_JOB:  'player_build_job',  // buildJob
  GO_TO_RESEARCH:    'go_to_research',    // labo assigne (Hutte du sage)
  HARVEST_BERRIES:   'harvest_berries',   // cueillette loisir
  CAMPFIRE:          'campfire',          // attraction feu de camp nuit
  WANDER:            'wander'             // errance
})

export function enqueueTask(colonist, task) {
  if (!colonist.jobQueue) colonist.jobQueue = []
  if (!task || typeof task.priority !== 'number') return
  // insertion triee decroissante par priorite (stable : a priorite egale,
  // l ordre d insertion est preserve, ce qui evite de reset en cours de
  // tache quand une nouvelle tache de meme niveau arrive).
  const q = colonist.jobQueue
  let i = 0
  while (i < q.length && q[i].priority >= task.priority) i++
  q.splice(i, 0, task)
}

export function peekTask(colonist) {
  if (!colonist.jobQueue || colonist.jobQueue.length === 0) return null
  return colonist.jobQueue[0]
}

export function popTask(colonist) {
  if (!colonist.jobQueue || colonist.jobQueue.length === 0) return null
  return colonist.jobQueue.shift()
}

export function clearLowPriorityTasks(colonist, floorPriority) {
  if (!colonist.jobQueue) return
  colonist.jobQueue = colonist.jobQueue.filter(t => t.priority >= floorPriority)
}

export function hasTaskOfKind(colonist, kind) {
  if (!colonist.jobQueue) return false
  return colonist.jobQueue.some(t => t.kind === kind)
}

// Helper : la tache courante (currentTask sur le colon) est elle plus
// prioritaire que ce qu on voudrait pousser ? Utile pour preemption.
export function canPreempt(colonist, incomingPriority) {
  const cur = colonist.currentTask
  if (!cur) return true
  return incomingPriority > cur.priority
}
