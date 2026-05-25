import { useMemo, useState } from 'react';
import { CARDS, CARD_INDEX } from '../data/cards';
import { CLASSES } from '../data/classes';
import { getOwnedIds, countOwned, getStats } from '../data/collection';
import { CardView } from './CardView';
import type { CardInstance, ClasseId, Rarity } from '../state/types';

interface Props { onClose: () => void; }

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

type RarityFilter = 'all' | Rarity;
type ClasseFilter = 'all' | ClasseId | 'sortilege';

export function DeckBuilder({ onClose }: Props) {
  const [classeFilter, setClasseFilter] = useState<ClasseFilter>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [onlyOwned, setOnlyOwned] = useState(false);

  const owned = useMemo(() => new Set(getOwnedIds()), []);
  const collection = useMemo(() => countOwned(), []);
  const stats = useMemo(() => getStats(), []);

  const filtered = useMemo(() => {
    return CARDS.filter((c) => {
      if (classeFilter !== 'all') {
        if (classeFilter === 'sortilege') {
          if (c.kind !== 'sortilege') return false;
        } else if (c.classe !== classeFilter) return false;
      }
      if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false;
      if (onlyOwned && !owned.has(c.id)) return false;
      return true;
    });
  }, [classeFilter, rarityFilter, onlyOwned, owned]);

  return (
    <div className="ach-deck-overlay" role="dialog" aria-modal="true">
      <div className="ach-deck-modal">
        <div className="ach-deck-head">
          <h2 className="ach-deck-title">Collection & Deck</h2>
          <button className="ach-lore-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="ach-deck-stats">
          <div className="ach-deck-stat">
            <span className="ach-deck-stat-num">{collection.owned}</span>
            <span className="ach-deck-stat-lbl">/ {collection.total} cartes possédées</span>
          </div>
          <div className="ach-deck-stat">
            <span className="ach-deck-stat-num">{collection.total - collection.owned}</span>
            <span className="ach-deck-stat-lbl">à débloquer</span>
          </div>
          <div className="ach-deck-stat">
            <span className="ach-deck-stat-num">{stats.wins}</span>
            <span className="ach-deck-stat-lbl">victoire{stats.wins > 1 ? 's' : ''}</span>
          </div>
          <div className="ach-deck-stat">
            <span className="ach-deck-stat-num">{stats.losses}</span>
            <span className="ach-deck-stat-lbl">défaite{stats.losses > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="ach-deck-hint">
          Plus tu joues, plus tu débloques. <b>Victoire</b> : choisis 1 carte parmi 4 (chance de Légendaire).
          <b> Défaite</b> : choisis 1 carte parmi 2 en consolation. Pour l'instant, ton deck actif est construit
          automatiquement avec tes meilleures cartes possédées (édition manuelle au Lot 3).
        </div>

        <div className="ach-deck-filters">
          <div className="ach-deck-filter-group">
            <span className="ach-deck-filter-label">Classe :</span>
            <Filter active={classeFilter === 'all'} onClick={() => setClasseFilter('all')}>Toutes</Filter>
            <Filter active={classeFilter === 'sylvestre'} onClick={() => setClasseFilter('sylvestre')}>🏹 Sylvestre</Filter>
            <Filter active={classeFilter === 'arcanique'} onClick={() => setClasseFilter('arcanique')}>✨ Arcanique</Filter>
            <Filter active={classeFilter === 'rempart'} onClick={() => setClasseFilter('rempart')}>⚔ Rempart</Filter>
            <Filter active={classeFilter === 'sortilege'} onClick={() => setClasseFilter('sortilege')}>✦ Sortilèges</Filter>
          </div>
          <div className="ach-deck-filter-group">
            <span className="ach-deck-filter-label">Rareté :</span>
            <Filter active={rarityFilter === 'all'} onClick={() => setRarityFilter('all')}>Toutes</Filter>
            <Filter active={rarityFilter === 'commune'} onClick={() => setRarityFilter('commune')}>Commune</Filter>
            <Filter active={rarityFilter === 'rare'} onClick={() => setRarityFilter('rare')}>Rare</Filter>
            <Filter active={rarityFilter === 'epique'} onClick={() => setRarityFilter('epique')}>Épique</Filter>
            <Filter active={rarityFilter === 'legendaire'} onClick={() => setRarityFilter('legendaire')}>Légendaire</Filter>
          </div>
          <label className="ach-deck-filter-toggle">
            <input type="checkbox" checked={onlyOwned} onChange={(e) => setOnlyOwned(e.target.checked)} />
            <span>Possédées uniquement</span>
          </label>
        </div>

        <div className="ach-deck-grid">
          {filtered.map((c) => {
            const isOwned = owned.has(c.id);
            return (
              <div
                key={c.id}
                className={`ach-deck-cell ${isOwned ? 'is-owned' : 'is-locked'}`}
                title={isOwned ? c.text : `Carte non possédée : ${CLASSES[c.classe ?? 'sylvestre']?.name ?? ''} · ${c.rarity}`}
              >
                <CardView card={makePreviewInstance(c.id)} interactive={false} playable />
                {!isOwned && <div className="ach-deck-cell-lock">🔒 verrouillée</div>}
              </div>
            );
          })}
        </div>

        <div className="ach-deck-footer">
          <button className="ach-side__btn" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function Filter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`ach-deck-filter ${active ? 'is-active' : ''}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
