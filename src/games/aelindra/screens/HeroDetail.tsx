/* ============================================
   AELINDRA · screens/HeroDetail.tsx
   Écran 08 : Détail d'un héros (stats + équipement)
   ============================================ */

import type { Hero, Item } from '../data/types';
import type { InventoryEntry } from '../state/types';
import type { EquipSlot } from '../logic/equipment';
import { getItemSlot } from '../logic/equipment';
import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';
import { specToIcon } from '../components/specToIcon';

/* ---- helpers ---- */

const RARITY_LABEL: Record<string, string> = {
  common: 'COMMUN',
  rare: 'RARE',
  epic: 'ÉPIQUE',
  legendary: 'LÉGENDAIRE',
};

const SLOT_META: Record<EquipSlot, { label: string; icon: string; empty: string }> = {
  head:    { label: 'TÊTE',    icon: 'head',    empty: 'libre' },
  body:    { label: 'CORPS',   icon: 'body',    empty: 'libre' },
  weapon:  { label: 'ARME',    icon: 'weapon',  empty: 'non équipé' },
  offhand: { label: 'SECOND.', icon: 'offhand', empty: 'non équipé' },
};

const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'body', 'head', 'offhand'];

function resolveItem(id: string | null, allItems: Item[]): Item | null {
  if (!id) return null;
  return allItems.find(it => it.id === id) ?? null;
}

/* ---- props ---- */

interface HeroDetailProps {
  hero?: Hero;
  inventory?: InventoryEntry[];
  allItems?: Item[];
  onBack?: () => void;
  onEquip?: (itemId: string) => void;
  onUnequip?: (slot: EquipSlot) => void;
}

/* ---- composant ---- */

export function HeroDetail({
  hero,
  inventory = [],
  allItems = [],
  onBack,
  onEquip,
  onUnequip,
}: HeroDetailProps) {
  /* Héros de fallback minimal quand aucun n'est passé */
  if (!hero) {
    return (
      <div className="scr on" id="s-hero-detail">
        <ScrHeader title="HÉROS" onBack={onBack} />
        <div className="hero-detail-body">
          <p style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
            Aucun héros sélectionné.
          </p>
        </div>
      </div>
    );
  }

  const level = hero.level ?? 1;
  const iconId = specToIcon(hero.spec);
  const rarityLabel = RARITY_LABEL[hero.rarity] ?? hero.rarity.toUpperCase();

  /* Stats */
  const bs = hero.baseStats;
  const rangeLabel = bs.range != null ? `Portée ${bs.range}` : 'Portée CAC';

  /* Items équipables dans l'inventaire (weapon, body, head, offhand — pas les consommables) */
  const equippableInInventory = inventory.filter(entry => {
    const item = resolveItem(entry.itemId, allItems);
    if (!item) return false;
    return getItemSlot(item) !== null;
  });

  return (
    <div className="scr on" id="s-hero-detail">
      <ScrHeader title={hero.name.toUpperCase()} onBack={onBack} />
      <div className="hero-detail-body">

        {/* ---- En-tête héros ---- */}
        <div className="hero-hero">
          <div className={`hero-portrait hero-portrait--framed rarity--${hero.rarity}`}>
            {hero.imagePath ? (
              <img
                src={hero.imagePath}
                alt={hero.name}
                style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4 }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div style={{ color: 'var(--gold-hi)' }}>
                <Icon id={iconId} className="ico" style={{ width: 44, height: 44 }} />
              </div>
            )}
            <span className="hp-lv">LV.{level}</span>
          </div>
          <div className="hh-info">
            <div className="hh-name">
              {hero.name.split(' ')[0]}
              <br />
              {hero.name.split(' ').slice(1).join(' ')}
            </div>
            <div className="hh-class">
              <Icon id={iconId} className="ico" /> {hero.class.toUpperCase()}
            </div>
            <div className="hh-race">{hero.race} · {hero.spec}</div>
            <div className="hh-rarity-row">
              <span className={`rp rp-${hero.rarity[0]}`}>{rarityLabel}</span>
              <span className="tag tag-floor">{rangeLabel}</span>
            </div>
          </div>
        </div>

        {/* ---- Statistiques ---- */}
        <section>
          <div className="hd-section-title">STATISTIQUES</div>
          <div className="hero-stats-section">
            <div className="stat-row"><span className="k">PV</span>   <span className="v">{bs.hp}</span></div>
            <div className="stat-row"><span className="k">PM</span>   <span className="v">{bs.mp}</span></div>
            <div className="stat-row"><span className="k">ATK</span>  <span className="v">{bs.atk}</span></div>
            <div className="stat-row"><span className="k">MAG</span>  <span className="v">{bs.mag}</span></div>
            <div className="stat-row"><span className="k">DEF</span>  <span className="v">{bs.def}</span></div>
            <div className="stat-row"><span className="k">RES</span>  <span className="v">{bs.res}</span></div>
            <div className="stat-row"><span className="k">VIT</span>  <span className="v">{bs.vit}</span></div>
            <div className="stat-row"><span className="k">CRIT</span> <span className="v">{bs.crit}%</span></div>
          </div>
        </section>

        {/* ---- Équipement ---- */}
        <section>
          <div className="hd-section-title">ÉQUIPEMENT</div>
          <div className="equip-slots">
            {EQUIP_SLOTS.map(slot => {
              const meta = SLOT_META[slot];
              const equippedId = hero.equipped?.[slot] ?? null;
              const item = resolveItem(equippedId, allItems);

              return (
                <div key={slot} className="equip-slot">
                  <div className="slot-icon">
                    <Icon id={meta.icon} />
                  </div>
                  <span className="slot-label">{meta.label}</span>
                  {item ? (
                    <>
                      <div className="slot-item">
                        <div className="nm">{item.emoji} {item.name}</div>
                        <div className="bonus">{item.stat}</div>
                      </div>
                      <button onClick={() => onUnequip?.(slot)}>RETIRER</button>
                    </>
                  ) : equippedId ? (
                    /* Slot occupé par un item natif du héros (arme de départ, etc.) */
                    <>
                      <div className="slot-item">
                        <div className="nm">
                          {slot === 'weapon' && hero.weapon ? `${hero.weapon.emoji} ${hero.weapon.name}` : equippedId}
                        </div>
                        <div className="bonus">
                          {slot === 'weapon' && hero.weapon
                            ? (hero.weapon.atk ? `+${hero.weapon.atk} ATK` : hero.weapon.mag ? `+${hero.weapon.mag} MAG` : '')
                            : ''}
                          {slot === 'offhand' && hero.offhand
                            ? `${hero.offhand.emoji} ${hero.offhand.name}`
                            : ''}
                        </div>
                      </div>
                      <button onClick={() => onUnequip?.(slot)}>RETIRER</button>
                    </>
                  ) : (
                    <div className="slot-item empty">{meta.empty}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- Inventaire équipable ---- */}
        <section>
          <div className="hd-section-title">INVENTAIRE</div>
          {equippableInInventory.length === 0 ? (
            <div className="equip-grid">
              <p style={{ opacity: 0.5, fontSize: '0.8rem', padding: '0.5rem 0' }}>
                Aucun équipement disponible.
              </p>
            </div>
          ) : (
            <div className="equip-grid">
              {equippableInInventory.map(entry => {
                const item = resolveItem(entry.itemId, allItems)!;
                return (
                  <div
                    key={entry.itemId}
                    className={`equip-item-card rarity rarity--${item.rarity}`}
                    onClick={() => onEquip?.(entry.itemId)}
                    style={{ cursor: onEquip ? 'pointer' : 'default' }}
                  >
                    <div className="rarity-bar" />
                    <div className="item-name">{item.emoji} {item.name}</div>
                    <div className="item-bonus">{item.stat}</div>
                    {entry.quantity > 1 && (
                      <div className="item-qty">×{entry.quantity}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
