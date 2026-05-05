// ============================================================================
// Lot B, productivite par metier. Architecture interne engine (les seuils ne
// sont pas dans les JSON, ce sont des paliers de gameplay au sens spec v1).
//
// Une formule unique :
//   pour chaque colon dont profession === jobId, on additionne sa skillLevel
//   normalisee (level/10). Si moins de MIN_COLONISTS_FOR_JOB[jobId] colons
//   travaillent ce metier, la production est nulle (pas d'effet partiel).
//
// Utilisations :
//   - Recherche : main.js multiplie le tick par computeJobProductivity('chercheur').
//   - Construction : la progression d'un chantier multiplie dt par la
//     productivite du constructeur en cours, ou par celle globale si on veut
//     une vue agregee.
//
// Aucune valeur hardcodee de gameplay n'est dupliquee ici : skillLevel vient
// du colon (computed sur ses XP). Les noms de skills sont alignes sur
// jobs.json -> produces/uses, mais comme ces JSON ne donnent pas le mapping
// directement, on l'expose ici en table interne. Si un jour jobs.json gagne
// un champ "skill", on le lira via gamedata.js et on supprimera la table.
// ============================================================================

export const SKILL_FOR_JOB = Object.freeze({
  bucheron:     'logging',
  mineur:       'mining',
  cueilleur:    'gathering',
  chasseur:     'hunting',
  chercheur:    'research',
  constructeur: 'building'
})

export const MIN_COLONISTS_FOR_JOB = Object.freeze({
  constructeur: 1,
  chercheur:    1,
  bucheron:     1,
  mineur:       1,
  cueilleur:    1,
  chasseur:     1
})

// Boost global temporaire (recompense de quete speedBoost). Lu par
// computeJobProductivity et par les modules qui appliquent productivityMul
// (construction). Retourne 1.0 si aucun boost actif. La gestion de l expiration
// (tick + dispatch d events) est centralisee dans quests.js.
export function getGlobalSpeedFactor(state) {
  if (!state || !state.speedBoost) return 1
  const boost = state.speedBoost
  const now = (typeof performance !== 'undefined' && performance.now)
    ? performance.now() / 1000
    : Date.now() / 1000
  if (!boost.expiresAt || now >= boost.expiresAt) return 1
  const f = (typeof boost.factor === 'number' && boost.factor > 0) ? boost.factor : 1
  return f
}

// Productivite agregee d'un metier sur l'ensemble de la colonie. Retourne 0
// si l'effectif est sous le seuil. Sinon retourne la somme des skillLevel/10
// (de 0.0 a 1.0 par colon, max 10 colons -> 10.0). Filtre optionnel : si
// onlyState est fourni, ne compte que les colons dans cet etat.
export function computeJobProductivity(state, jobId, onlyState) {
  if (!state || !Array.isArray(state.colonists)) return 0
  const skillName = SKILL_FOR_JOB[jobId]
  if (!skillName) return 0
  let total = 0
  let count = 0
  for (const c of state.colonists) {
    if (c.profession !== jobId) continue
    if (onlyState && c.state !== onlyState) continue
    const lvl = (typeof c.skillLevel === 'function') ? c.skillLevel(skillName) : 0
    // Lot B house utility : bonus de productivite si le colon est repose
    // (rested > 0.7 -> x1.15). Plancher 1.0, jamais de malus depuis ce
    // facteur. Lecture defensive (rested peut etre absent sur restore).
    const r = (typeof c.rested === 'number') ? c.rested : 0.5
    const restedF = r > 0.7 ? 1.15 : 1.0
    total += (lvl / 10) * restedF
    count++
  }
  const minN = MIN_COLONISTS_FOR_JOB[jobId] || 1
  if (count < minN) return 0
  // Plancher : un colon assigne mais skill 0 doit quand meme produire un
  // minimum, sinon le debut de partie est bloquant. On retourne au moins
  // count * 0.1 (equivalent skillLevel 1).
  const base = Math.max(total, count * 0.1)
  return base * getGlobalSpeedFactor(state)
}
