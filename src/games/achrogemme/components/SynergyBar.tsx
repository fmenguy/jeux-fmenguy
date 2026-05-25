import { useEffect, useState } from 'react';
import type { GameState, Side } from '../state/types';
import { SYNERGIES, SYNERGY_INDEX } from '../data/synergies';
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

  if (syn.on.kind === 'trinity') {
    let hasSylv = false, hasArc = false, hasRem = false;
    for (let l = 0; l < 3; l += 1) {
      for (let s = 0; s < 3; s += 1) {
        const u = p.lanes[l][s];
        if (!u) continue;
        const def = CARD_INDEX[u.defId];
        if (!def || def.faction !== syn.on.value) continue;
        if (def.classe === 'sylvestre') hasSylv = true;
        else if (def.classe === 'arcanique') hasArc = true;
        else if (def.classe === 'rempart') hasRem = true;
      }
    }
    return (hasSylv && hasArc && hasRem) ? 1 : 0;
  }

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
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!openId) return;
    const t = setTimeout(() => setOpenId(null), 4500);
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.ach-syn-chip[data-syn="${openId}"]`) && !target.closest('.ach-syn-popover')) {
        setOpenId(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [openId]);

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <div className="ach-board__synergies" data-side={dataSide}>
      {SYNERGIES.map((syn) => {
        const n = countMatches(state, side, syn.id);
        const reached = syn.thresholds.filter((t) => n >= t.count);
        const isActive = active.has(syn.id);
        const nextStep = syn.thresholds.find((t) => n < t.count) ?? syn.thresholds[syn.thresholds.length - 1];
        const target = reached.length > 0 ? reached[reached.length - 1].count : nextStep.count;
        const icon = SYN_ICON[syn.on.value] ?? '◇';
        const isOpen = openId === syn.id;

        return (
          <button
            type="button"
            key={syn.id}
            className="ach-syn-chip"
            data-syn={syn.id}
            data-active={isActive ? '1' : '0'}
            data-open={isOpen ? '1' : '0'}
            onClick={(e) => { e.stopPropagation(); toggle(syn.id); }}
          >
            <span className="ach-syn-chip__icon">{icon}</span>
            <span className="ach-syn-chip__label">{syn.name}</span>
            <span className="ach-syn-chip__count">
              {n}<i>/{target}</i>
            </span>

            {isOpen && (
              <div className={`ach-syn-popover ${side === 'ai' ? 'is-from-top' : 'is-from-bottom'}`} role="tooltip">
                <div className="ach-syn-popover__head">
                  <span className="ach-syn-popover__icon">{icon}</span>
                  <span className="ach-syn-popover__title">{syn.name}</span>
                </div>
                <div className="ach-syn-popover__desc">{syn.description}</div>
                <div className="ach-syn-popover__steps">
                  {syn.thresholds.map((t) => {
                    const stepReached = n >= t.count;
                    return (
                      <div
                        key={t.count}
                        className={`ach-syn-popover__step ${stepReached ? 'is-reached' : ''}`}
                      >
                        <span className="ach-syn-popover__step-count">({t.count})</span>
                        <span className="ach-syn-popover__step-text">{t.text}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="ach-syn-popover__current">
                  {n} unité{n > 1 ? 's' : ''} en jeu sur ce trait.
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
