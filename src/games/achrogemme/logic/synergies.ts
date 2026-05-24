import type {
  ActiveSynergy,
  CardInstance,
  GameState,
  PlayerState,
  Side,
} from '../state/types';
import { CARD_INDEX } from '../data/cards';
import { SYNERGIES } from '../data/synergies';

function allBoardUnits(p: PlayerState): CardInstance[] {
  const out: CardInstance[] = [];
  for (let l = 0; l < 3; l += 1) {
    for (let s = 0; s < 3; s += 1) {
      const c = p.lanes[l][s];
      if (c) out.push(c);
    }
  }
  return out;
}

function unitMatches(unit: CardInstance, on: { kind: string; value: string }): boolean {
  const def = CARD_INDEX[unit.defId];
  if (!def) return false;
  if (on.kind === 'faction') return def.faction === on.value;
  if (on.kind === 'classe') return def.classe === on.value;
  if (on.kind === 'tag') return (def.tags ?? []).includes(on.value) || unit.tagsExtra.includes(on.value);
  return false;
}

function countTrinityFaction(p: PlayerState, faction: string): number {
  let hasSylv = false, hasArc = false, hasRem = false;
  for (const u of allBoardUnits(p)) {
    const def = CARD_INDEX[u.defId];
    if (!def || def.faction !== faction) continue;
    if (def.classe === 'sylvestre') hasSylv = true;
    else if (def.classe === 'arcanique') hasArc = true;
    else if (def.classe === 'rempart') hasRem = true;
  }
  return (hasSylv && hasArc && hasRem) ? 1 : 0;
}

export function computeActiveSynergies(p: PlayerState): ActiveSynergy[] {
  const units = allBoardUnits(p);
  const out: ActiveSynergy[] = [];
  for (const syn of SYNERGIES) {
    let matchCount = 0;
    if (syn.on.kind === 'trinity') {
      matchCount = countTrinityFaction(p, syn.on.value);
    } else {
      matchCount = units.filter((u) => unitMatches(u, syn.on)).length;
    }
    if (matchCount === 0) continue;
    let bestThreshold: number = 0;
    for (const t of syn.thresholds) {
      if (matchCount >= t.count && t.count > bestThreshold) {
        bestThreshold = t.count;
      }
    }
    if (bestThreshold > 0) {
      const t = syn.thresholds.find((x) => x.count === bestThreshold)!;
      out.push({ synergyId: syn.id, threshold: bestThreshold, applied: t.apply });
    }
  }
  return out;
}

export function refreshSynergies(state: GameState) {
  state.player.activeSynergies = computeActiveSynergies(state.player);
  state.ai.activeSynergies = computeActiveSynergies(state.ai);
}

export function synergyAtqBonus(side: PlayerState, unit: CardInstance): number {
  let bonus = 0;
  for (const a of side.activeSynergies) {
    const syn = SYNERGIES.find((s) => s.id === a.synergyId);
    if (!syn) continue;
    if (!unitMatches(unit, syn.on)) continue;
    if (a.applied.kind === 'atq_bonus_to_matching') bonus += a.applied.amount;
  }
  return bonus;
}

export function synergyPvBonus(side: PlayerState, unit: CardInstance): number {
  let bonus = 0;
  for (const a of side.activeSynergies) {
    const syn = SYNERGIES.find((s) => s.id === a.synergyId);
    if (!syn) continue;
    if (!unitMatches(unit, syn.on)) continue;
    if (a.applied.kind === 'pv_bonus_to_matching') bonus += a.applied.amount;
  }
  return bonus;
}

export function synergyHasGarde(side: PlayerState, unit: CardInstance): boolean {
  for (const a of side.activeSynergies) {
    const syn = SYNERGIES.find((s) => s.id === a.synergyId);
    if (!syn) continue;
    if (!unitMatches(unit, syn.on)) continue;
    if (a.applied.kind === 'garde_to_matching') return true;
  }
  return false;
}

export function synergyPaBonus(side: PlayerState): number {
  let bonus = 0;
  for (const a of side.activeSynergies) {
    if (a.applied.kind === 'pa_bonus') bonus += a.applied.amount;
  }
  return bonus;
}

export function synergyChampionPvBonus(side: PlayerState): number {
  let bonus = 0;
  for (const a of side.activeSynergies) {
    if (a.applied.kind === 'champion_pv_bonus') bonus += a.applied.amount;
  }
  return bonus;
}

// Use side param to avoid unused warning when called from engine.
export function _touch(_: Side) { return null; }
