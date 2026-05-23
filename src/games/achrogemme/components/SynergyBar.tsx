import type { ActiveSynergy, Side } from '../state/types';
import { SYNERGIES, SYNERGY_INDEX } from '../data/synergies';
import type { GameState } from '../state/types';
import { CARD_INDEX } from '../data/cards';

interface Props {
  state: GameState;
  side: Side;
}

const SYN_ICON: Record<string, string> = {
  elfe: '☘',
  nain: '⚒',
  humain: '🏰',
  royaute: '👑',
};

function countMatches(state: GameState, side: Side, synergyId: string): number {
  const syn = SYNERGY_INDEX[synergyId];
  if (!syn) return 0;
  const p = state[side];
  let n = 0;
  for (let l = 0; l < 3; l += 1) {
    for (let s = 0; s < 3; s += 1) {
      const u = p.lanes[l][s];
      if (!u) continue;
      const def = CARD_INDEX[u.defId];
      if (!def) continue;
      if (syn.on.kind === 'faction' && def.faction === syn.on.value) n += 1;
      else if (syn.on.kind === 'classe' && def.classe === syn.on.value) n += 1;
      else if (syn.on.kind === 'tag' && ((def.tags ?? []).includes(syn.on.value) || u.tagsExtra.includes(syn.on.value))) n += 1;
    }
  }
  return n;
}

export function SynergyBar({ state, side }: Props) {
  const active: Set<string> = new Set(state[side].activeSynergies.map((a) => a.synergyId));
  const dataSide = side === 'ai' ? 'ia' : 'joueur';
  return (
    <div className="ach-board__synergies" data-side={dataSide}>
      {SYNERGIES.map((syn) => {
        const n = countMatches(state, side, syn.id);
        const reached = syn.thresholds.filter((t) => n >= t.count);
        const isActive = active.has(syn.id);
        const nextStep = syn.thresholds.find((t) => n < t.count) ?? syn.thresholds[syn.thresholds.length - 1];
        const target = reached.length > 0 ? reached[reached.length - 1].count : nextStep.count;
        const icon = SYN_ICON[syn.on.value] ?? '◇';
        return (
          <div
            key={syn.id}
            className="ach-syn-chip"
            data-active={isActive ? '1' : '0'}
            title={syn.description}
          >
            <span className="ach-syn-chip__icon">{icon}</span>
            <span>{syn.name}</span>
            <span className="ach-syn-chip__count">
              {n}<i>/{target}</i>
            </span>
          </div>
        );
      })}
    </div>
  );
}
