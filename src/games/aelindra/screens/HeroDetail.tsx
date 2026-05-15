/* ============================================
   AELINDRA · screens/HeroDetail.tsx
   Écran 08 : Détail d'un héros (stats + équipement)
   ============================================ */

import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';

interface StatDelta {
  value: number;
  delta?: number;
}

interface EquipSlot {
  id: 'head' | 'body' | 'weapon' | 'offhand';
  label: string;
  icon: string;
  item: { nm: string; bonus: string } | null;
  emptyLabel?: string;
}

interface InventoryCard {
  name: string;
  bonus: string;
  rarity: string;
}

interface MockHeroDetail {
  name: string;
  firstName: string;
  lastName: string;
  classLabel: string;
  raceDesc: string;
  icon: string;
  rarity: string;
  level: number;
  rangeLabel: string;
  stats: {
    hp: StatDelta;
    mp: StatDelta;
    atk: StatDelta;
    mag: StatDelta;
    def: StatDelta;
    res: StatDelta;
    vit: StatDelta;
    crit: StatDelta;
  };
  equip: EquipSlot[];
  inventory: InventoryCard[];
}

const MOCK_HERO: MockHeroDetail = {
  name: 'SYLVARA BRASIER',
  firstName: 'Sylvara',
  lastName: 'Brasier',
  classLabel: 'MAGE OFFENSIF',
  raceDesc: 'Elfe · spécialiste du feu',
  icon: 'mage',
  rarity: 'epic',
  level: 5,
  rangeLabel: 'Portée 1 – 3',
  stats: {
    hp:   { value: 85 },
    mp:   { value: 148, delta: 12 },
    atk:  { value: 12 },
    mag:  { value: 47,  delta: 8 },
    def:  { value: 26 },
    res:  { value: 80,  delta: 5 },
    vit:  { value: 70 },
    crit: { value: 11 },
  },
  equip: [
    { id: 'head',    label: 'TÊTE',    icon: 'head',    item: null,                                    emptyLabel: '— libre —' },
    { id: 'body',    label: 'CORPS',   icon: 'body',    item: { nm: 'Robe de Sylve',        bonus: '+8 RES · +4 MAG' } },
    { id: 'weapon',  label: 'ARME',    icon: 'weapon',  item: { nm: 'Bâton Rouge de Feu',   bonus: '+13 MAG · portée 1-3' } },
    { id: 'offhand', label: 'SECOND.', icon: 'offhand', item: null,                                    emptyLabel: 'bâton à deux mains' },
  ],
  inventory: [
    { name: 'Capuche tressée', bonus: '+6 RES',  rarity: 'rare' },
    { name: "Grimoire d'Ash",  bonus: '+18 MAG', rarity: 'epic' },
  ],
};

function renderStatValue(stat: StatDelta, suffix = ''): React.ReactNode {
  return (
    <>
      {stat.value}{suffix}
      {stat.delta != null && <span className="delta">+{stat.delta}</span>}
    </>
  );
}

interface HeroDetailProps {
  hero?: MockHeroDetail;
  onBack?: () => void;
  onUnequip?: (slot: string) => void;
}

export function HeroDetail({ hero = MOCK_HERO, onBack, onUnequip }: HeroDetailProps) {
  return (
    <div className="scr on" id="s-hero-detail">
      <ScrHeader title={hero.name} onBack={onBack} />
      <div className="hero-detail-body">
        <div className="hero-hero">
          <div className={`hero-portrait hero-portrait--framed rarity--${hero.rarity}`}>
            <div style={{ color: 'var(--gold-hi)' }}>
              <Icon id={hero.icon} className="ico" style={{ width: 44, height: 44 }} />
            </div>
            <span className="hp-lv">LV.{hero.level}</span>
          </div>
          <div className="hh-info">
            <div className="hh-name">
              {hero.firstName}
              <br />
              {hero.lastName}
            </div>
            <div className="hh-class">
              <Icon id={hero.icon} className="ico" /> {hero.classLabel}
            </div>
            <div className="hh-race">{hero.raceDesc}</div>
            <div className="hh-rarity-row">
              <span className="rp rp-e">ÉPIQUE</span>
              <span className="tag tag-floor">{hero.rangeLabel}</span>
            </div>
          </div>
        </div>

        <section>
          <div className="hd-section-title">STATISTIQUES</div>
          <div className="hero-stats-section">
            <div className="stat-row"><span className="k">PV</span>   <span className="v">{renderStatValue(hero.stats.hp)}</span></div>
            <div className="stat-row"><span className="k">PM</span>   <span className="v">{renderStatValue(hero.stats.mp)}</span></div>
            <div className="stat-row"><span className="k">ATK</span>  <span className="v">{renderStatValue(hero.stats.atk)}</span></div>
            <div className="stat-row"><span className="k">MAG</span>  <span className="v">{renderStatValue(hero.stats.mag)}</span></div>
            <div className="stat-row"><span className="k">DEF</span>  <span className="v">{renderStatValue(hero.stats.def)}</span></div>
            <div className="stat-row"><span className="k">RES</span>  <span className="v">{renderStatValue(hero.stats.res)}</span></div>
            <div className="stat-row"><span className="k">VIT</span>  <span className="v">{renderStatValue(hero.stats.vit)}</span></div>
            <div className="stat-row"><span className="k">CRIT</span> <span className="v">{renderStatValue(hero.stats.crit, '%')}</span></div>
          </div>
        </section>

        <section>
          <div className="hd-section-title">ÉQUIPEMENT</div>
          <div className="equip-slots">
            {hero.equip.map(slot => (
              <div key={slot.id} className="equip-slot">
                <div className="slot-icon">
                  <Icon id={slot.icon} />
                </div>
                <span className="slot-label">{slot.label}</span>
                {slot.item ? (
                  <>
                    <div className="slot-item">
                      <div className="nm">{slot.item.nm}</div>
                      <div className="bonus">{slot.item.bonus}</div>
                    </div>
                    <button onClick={() => onUnequip?.(slot.id)}>RETIRER</button>
                  </>
                ) : (
                  <div className="slot-item empty">{slot.emptyLabel}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="hd-section-title">INVENTAIRE</div>
          <div className="equip-grid">
            {hero.inventory.map((card, i) => (
              <div key={i} className={`equip-item-card rarity rarity--${card.rarity}`}>
                <div className="rarity-bar"></div>
                <div className="item-name">{card.name}</div>
                <div className="item-bonus">{card.bonus}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
