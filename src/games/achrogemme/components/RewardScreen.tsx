import { useMemo, useState } from 'react';
import { CARD_INDEX } from '../data/cards';
import { addToCollection, rollRewardChoices, countOwned } from '../data/collection';
import { CardView } from './CardView';
import type { CardInstance } from '../state/types';

interface Props {
  victory: boolean;
  onClose: () => void;
}

function makePreviewInstance(defId: string): CardInstance {
  const def = CARD_INDEX[defId];
  return {
    instId: `preview_${defId}`,
    defId,
    pv: def?.pv ?? 0,
    pvMax: def?.pv ?? 0,
    atq: def?.atq ?? 0,
    paBonus: def?.paBonus ?? 0,
    turnsOnBoard: 0,
    exhausted: false,
    buffs: { atq: 0, pv: 0 },
    tagsExtra: [],
  };
}

export function RewardScreen({ victory, onClose }: Props) {
  const count = victory ? 4 : 2;
  const choices = useMemo(() => rollRewardChoices(count, victory), [count, victory]);
  const [picked, setPicked] = useState<string | null>(null);
  const collection = useMemo(() => countOwned(), [picked]);

  if (choices.length === 0) {
    return (
      <div className="ach-reward-overlay">
        <div className="ach-reward-modal">
          <div className="ach-reward-title">{victory ? 'Victoire' : 'Défaite'}</div>
          <p className="ach-reward-empty">Tu possèdes déjà toutes les cartes du Codex. Bien joué !</p>
          <button className="ach-side__btn" onClick={onClose}>Continuer</button>
        </div>
      </div>
    );
  }

  const pickCard = (cardId: string) => {
    if (picked) return;
    addToCollection(cardId);
    setPicked(cardId);
  };

  return (
    <div className="ach-reward-overlay">
      <div className="ach-reward-modal">
        <div className="ach-reward-head">
          <div className={`ach-reward-title ${victory ? 'is-victory' : 'is-defeat'}`}>
            {victory ? 'Victoire !' : 'Défaite'}
          </div>
          <div className="ach-reward-sub">
            {victory
              ? "Choisis une carte parmi 4 pour enrichir ta collection."
              : "Une consolation : choisis une carte parmi 2."}
          </div>
        </div>

        <div className="ach-reward-grid" data-count={choices.length}>
          {choices.map((cardId) => {
            const def = CARD_INDEX[cardId];
            if (!def) return null;
            const isPicked = picked === cardId;
            const isDimmed = picked && picked !== cardId;
            return (
              <button
                key={cardId}
                type="button"
                className={`ach-reward-card ${isPicked ? 'is-picked' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                onClick={() => pickCard(cardId)}
                disabled={!!picked}
              >
                <CardView card={makePreviewInstance(cardId)} interactive={false} playable />
                {isPicked && <div className="ach-reward-card-stamp">Acquise</div>}
              </button>
            );
          })}
        </div>

        <div className="ach-reward-footer">
          <div className="ach-reward-collection">
            Collection : <b>{collection.owned}</b> / {collection.total} cartes
            {collection.lockedLegend > 0 && (
              <span className="ach-reward-collection-locked"> · {collection.lockedLegend} légendaire{collection.lockedLegend > 1 ? 's' : ''} encore à débloquer</span>
            )}
          </div>
          <div className="ach-reward-hint">
            Plus tu joues, plus tu débloques. Monte en difficulté pour viser les Élites et les Légendaires.
          </div>
          <button
            className="ach-side__btn"
            onClick={onClose}
            disabled={!picked}
          >
            {picked ? 'Continuer' : 'Choisis une carte'}
          </button>
        </div>
      </div>
    </div>
  );
}
