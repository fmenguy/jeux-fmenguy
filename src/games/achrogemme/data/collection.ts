import { CARDS, CARD_INDEX } from './cards';
import type { Rarity } from '../state/types';

const COLLECTION_KEY = 'achrogemme_collection_v1';
const STATS_KEY = 'achrogemme_stats_v1';

export const RARITY_RANK: Record<Rarity, number> = {
  commune: 0,
  rare: 1,
  epique: 2,
  legendaire: 3,
};

function initialOwnedIds(): string[] {
  return CARDS.filter((c) => c.rarity === 'commune').map((c) => c.id);
}

export function getOwnedIds(): string[] {
  if (typeof window === 'undefined') return initialOwnedIds();
  const raw = localStorage.getItem(COLLECTION_KEY);
  if (!raw) {
    const init = initialOwnedIds();
    try { localStorage.setItem(COLLECTION_KEY, JSON.stringify(init)); } catch (e) { void e; }
    return init;
  }
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return initialOwnedIds();
    return parsed.filter((id) => CARD_INDEX[id]);
  } catch (e) {
    void e;
    return initialOwnedIds();
  }
}

export function isOwned(cardId: string): boolean {
  return getOwnedIds().includes(cardId);
}

export function addToCollection(cardId: string) {
  if (typeof window === 'undefined') return;
  const ids = getOwnedIds();
  if (ids.includes(cardId)) return;
  ids.push(cardId);
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(ids));
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * Tire N cartes parmi celles non possédées. Pondéré pour favoriser
 * rare > epique > legendaire selon victoire/défaite.
 */
export function rollRewardChoices(count: number, onVictory: boolean): string[] {
  const owned = new Set(getOwnedIds());
  const locked = CARDS.filter((c) => !owned.has(c.id));
  if (locked.length === 0) return [];

  if (onVictory) {
    const rares = locked.filter((c) => c.rarity === 'rare');
    const epics = locked.filter((c) => c.rarity === 'epique');
    const legends = locked.filter((c) => c.rarity === 'legendaire');
    const picks: string[] = [];
    picks.push(...pickRandom(rares, Math.min(2, rares.length)).map((c) => c.id));
    picks.push(...pickRandom(epics, Math.min(1, epics.length)).map((c) => c.id));
    if (Math.random() < 0.35) {
      picks.push(...pickRandom(legends, Math.min(1, legends.length)).map((c) => c.id));
    } else {
      picks.push(...pickRandom([...rares, ...epics].filter((c) => !picks.includes(c.id)), 1).map((c) => c.id));
    }
    while (picks.length < count) {
      const remaining = locked.filter((c) => !picks.includes(c.id));
      if (remaining.length === 0) break;
      picks.push(...pickRandom(remaining, 1).map((c) => c.id));
    }
    return picks.slice(0, count);
  }

  // Défaite : seulement rares (consolation)
  const consolation = locked.filter((c) => c.rarity === 'rare' || c.rarity === 'commune');
  if (consolation.length > 0) {
    return pickRandom(consolation, Math.min(count, consolation.length)).map((c) => c.id);
  }
  return pickRandom(locked, Math.min(count, locked.length)).map((c) => c.id);
}

export interface Stats {
  wins: number;
  losses: number;
  totalPlayed: number;
}

export function getStats(): Stats {
  if (typeof window === 'undefined') return { wins: 0, losses: 0, totalPlayed: 0 };
  const raw = localStorage.getItem(STATS_KEY);
  if (!raw) return { wins: 0, losses: 0, totalPlayed: 0 };
  try {
    return JSON.parse(raw) as Stats;
  } catch (e) {
    void e;
    return { wins: 0, losses: 0, totalPlayed: 0 };
  }
}

export function recordResult(victory: boolean) {
  if (typeof window === 'undefined') return;
  const s = getStats();
  if (victory) s.wins += 1; else s.losses += 1;
  s.totalPlayed += 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

export function countOwned(): { owned: number; total: number; lockedLegend: number } {
  const ownedIds = new Set(getOwnedIds());
  let lockedLegend = 0;
  for (const c of CARDS) if (c.rarity === 'legendaire' && !ownedIds.has(c.id)) lockedLegend += 1;
  return { owned: ownedIds.size, total: CARDS.length, lockedLegend };
}

export function buildDeckFromCollection(maxSize: number = 27): string[] {
  const owned = getOwnedIds();
  if (owned.length <= maxSize) return [...owned];
  const sorted = [...owned].sort((a, b) => {
    const ra = CARD_INDEX[a]?.rarity ?? 'commune';
    const rb = CARD_INDEX[b]?.rarity ?? 'commune';
    return RARITY_RANK[rb] - RARITY_RANK[ra];
  });
  return sorted.slice(0, maxSize);
}
