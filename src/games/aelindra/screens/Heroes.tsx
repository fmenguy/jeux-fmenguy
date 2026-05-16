/* ============================================
   AELINDRA · screens/Heroes.tsx
   Écran 07 : Équipe active + collection
   ============================================ */

import { useMemo, useState } from 'react';
import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';
import { specToIcon } from '../components/specToIcon';
import type { Hero, Rarity } from '../data/types';

const RARITY_ORDER: Record<Rarity, number> = {
  legendary: 3, epic: 2, rare: 1, common: 0,
};
const RARITY_TAG: Record<Rarity, string> = {
  common: 'C', rare: 'R', epic: 'É', legendary: 'L',
};

type SortKey = 'rarity' | 'level' | 'class' | 'recent';
const SORT_LABELS: Record<SortKey, string> = {
  rarity: 'RARETÉ',
  level:  'NIVEAU',
  class:  'CLASSE',
  recent: 'RÉCENT',
};

function xpToNext(level: number): number {
  return Math.round(1000 * Math.pow(1.28, Math.max(1, level) - 1));
}

interface HeroesProps {
  team: Hero[];
  collection: Hero[];
  lastPulledIds?: string[];
  onBack?: () => void;
  onSelectHero?: (id: string) => void;
  onEquip?: (id: string) => void;
  onUnequip?: (id: string) => void;
  onGoGuild?: () => void;
}

/* ---- HeroRow ---- */

interface HeroRowProps {
  h: Hero;
  isNew: boolean;
  actionLabel: string;
  actionDisabled?: boolean;
  onSelect?: (id: string) => void;
  onAction?: (id: string) => void;
}

function HeroRow({ h, isNew, actionLabel, actionDisabled, onSelect, onAction }: HeroRowProps) {
  const lv    = h.level ?? 1;
  const xp    = h.xp ?? 0;
  const cap   = xpToNext(lv);
  const xpPct = Math.min(100, (xp / cap) * 100);
  const icon  = specToIcon(h.spec);

  return (
    <div
      className={`hero-row rarity rarity--${h.rarity}`}
      onClick={() => onSelect?.(h.id)}
    >
      <div className="rarity-bar" />
      {isNew && <span className="hero-new-badge">NOUVEAU</span>}

      <div className={`hero-portrait hero-portrait--framed rarity--${h.rarity}`}>
        {h.imagePath ? (
          <img
            src={h.imagePath}
            alt={h.name}
            className="hero-portrait-img"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div style={{ color: 'var(--gold-hi)' }}>
            <Icon id={icon} className="ico" style={{ width: 26, height: 26 }} />
          </div>
        )}
        <span className="hp-lv">LV.{lv}</span>
      </div>

      <div className="hr-info">
        <div className="hr-top">
          <span className="hr-name">{h.name}</span>
          <span className={`hr-rarity-tag r-${h.rarity}`}>{RARITY_TAG[h.rarity]}</span>
        </div>
        <div className="hr-class">
          <Icon id={icon} className="ico" /> {h.class}
          <span className="hr-race"> · {h.race}</span>
        </div>
        <div className="hr-xp">
          <div className="hr-xp-bg">
            <div className="hr-xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <span className="hr-xp-label">{xp.toLocaleString()} / {cap.toLocaleString()}</span>
        </div>
      </div>

      <button
        className={`hero-action${actionDisabled ? ' is-disabled' : ''}`}
        disabled={actionDisabled}
        onClick={(e) => { e.stopPropagation(); onAction?.(h.id); }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="team-slot team-slot--empty">
      <span className="team-slot-plus">+</span>
      <span className="team-slot-label">Slot libre</span>
    </div>
  );
}

/* ---- Écran principal ---- */

export function Heroes({
  team,
  collection,
  lastPulledIds = [],
  onBack,
  onSelectHero,
  onEquip,
  onUnequip,
  onGoGuild,
}: HeroesProps) {
  const [sortKey,      setSortKey]      = useState<SortKey>('rarity');
  const [filterClass,  setFilterClass]  = useState<string | null>(null);

  const allHeroes = useMemo(() => [...team, ...collection], [team, collection]);
  const classes   = useMemo(
    () => [...new Set(allHeroes.map(h => h.class))].sort(),
    [allHeroes],
  );

  const filteredTeam = useMemo(
    () => filterClass ? team.filter(h => h.class === filterClass) : team,
    [team, filterClass],
  );

  const sortedCollection = useMemo(() => {
    const filtered = filterClass ? collection.filter(h => h.class === filterClass) : collection;
    const arr = [...filtered];
    switch (sortKey) {
      case 'rarity':
        arr.sort((a, b) =>
          RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] ||
          (b.level ?? 1) - (a.level ?? 1),
        );
        break;
      case 'level':
        arr.sort((a, b) => (b.level ?? 1) - (a.level ?? 1));
        break;
      case 'class':
        arr.sort((a, b) => a.class.localeCompare(b.class));
        break;
      case 'recent':
        // collection est en ordre d'arrivée (push dans le reducer) → on inverse
        arr.reverse();
        break;
    }
    return arr;
  }, [collection, filterClass, sortKey]);

  const cycleSort = () => {
    const order: SortKey[] = ['rarity', 'level', 'class', 'recent'];
    setSortKey(order[(order.indexOf(sortKey) + 1) % order.length]);
  };

  const teamFull = team.length >= 4;
  const noHeroes = allHeroes.length === 0;

  if (noHeroes) {
    return (
      <div className="scr on" id="s-heroes">
        <ScrHeader title="TON ÉQUIPE" onBack={onBack} />
        <div className="heroes-empty">
          <div className="heroes-empty-glyph">◎</div>
          <div className="heroes-empty-title">Aucun héros pour l'instant</div>
          <div className="heroes-empty-desc">
            Va invoquer ton premier aventurier à la Guilde, ou termine le tutoriel
            du Gouffre pour en gagner un.
          </div>
          <button className="btn-gold" onClick={onGoGuild}>ALLER À LA GUILDE</button>
        </div>
      </div>
    );
  }

  return (
    <div className="scr on" id="s-heroes">
      <ScrHeader title="TON ÉQUIPE" onBack={onBack} />

      {/* Toolbar : filtres + tri */}
      <div className="heroes-toolbar">
        <div className="heroes-filter-chips">
          <button
            className={`chip${filterClass === null ? ' is-on' : ''}`}
            onClick={() => setFilterClass(null)}
          >
            Toutes · {allHeroes.length}
          </button>
          {classes.map(c => {
            const count = allHeroes.filter(h => h.class === c).length;
            return (
              <button
                key={c}
                className={`chip${filterClass === c ? ' is-on' : ''}`}
                onClick={() => setFilterClass(filterClass === c ? null : c)}
              >
                {c} · {count}
              </button>
            );
          })}
        </div>
        <button className="heroes-sort" onClick={cycleSort}>
          ⇅ {SORT_LABELS[sortKey]}
        </button>
      </div>

      <div className="heroes-list">
        {/* Équipe active */}
        <div className="heroes-section-lbl">
          ÉQUIPE ACTIVE · {team.length} / 4
        </div>

        <div className="team-grid">
          {filteredTeam.map(h => (
            <HeroRow
              key={h.id}
              h={h}
              isNew={lastPulledIds.includes(h.id)}
              actionLabel="RETIRER"
              onSelect={onSelectHero}
              onAction={onUnequip}
            />
          ))}
          {team.length < 4 && filterClass === null &&
            Array.from({ length: 4 - team.length }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} />
            ))
          }
          {filterClass && filteredTeam.length === 0 && (
            <div className="heroes-empty-filter">
              Aucun {filterClass.toLowerCase()} dans l'équipe active.
            </div>
          )}
        </div>

        {/* Collection */}
        {(sortedCollection.length > 0 || filterClass) && (
          <div className="heroes-section-lbl">
            COLLECTION · {sortedCollection.length}
            {filterClass && (
              <span className="heroes-section-filter"> · filtre : {filterClass}</span>
            )}
          </div>
        )}

        {sortedCollection.map(h => (
          <HeroRow
            key={h.id}
            h={h}
            isNew={lastPulledIds.includes(h.id)}
            actionLabel="ÉQUIPER"
            actionDisabled={teamFull}
            onSelect={onSelectHero}
            onAction={onEquip}
          />
        ))}

        {filterClass && sortedCollection.length === 0 && filteredTeam.length === 0 && (
          <div className="heroes-empty-filter">
            Aucun héros de classe « {filterClass} » dans ta collection.
          </div>
        )}
      </div>
    </div>
  );
}
