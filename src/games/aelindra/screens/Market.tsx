/* ============================================
   AELINDRA · screens/Market.tsx
   Écran 05 : Marché (armes, armures, potions)
   ============================================ */

import { useState } from 'react';
import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';
import type { Item } from '../data/types';
import type { InventoryEntry } from '../state/types';

type TabId = 'armes' | 'armures' | 'potions';

interface MarketProps {
  gold?: number;
  items?: { armes: Item[]; armures: Item[]; potions: Item[] };
  inventory?: InventoryEntry[];
  onBack?: () => void;
  onBuy?: (itemId: string, tab: TabId) => void;
}

/** Mappe item.type (ex. "Corps · Mage") vers une icône Icon connue */
function itemTypeToIcon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('tête') || t.includes('tete') || t.includes('head')) return 'head';
  if (t.includes('bouclier') || t.includes('offhand')) return 'offhand';
  if (t.includes('corps') || t.includes('robe') || t.includes('cape') || t.includes('jamb')) return 'body';
  if (t.includes('consommable') || t.includes('potion') || t.includes('baume') || t.includes('élixir') || t.includes('elixir')) return 'potion';
  return 'weapon';
}

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'armes',   label: 'ARMES'   },
  { id: 'armures', label: 'ARMURES' },
  { id: 'potions', label: 'POTIONS' },
];

export function Market({
  gold = 0,
  items = { armes: [], armures: [], potions: [] },
  inventory = [],
  onBack,
  onBuy,
}: MarketProps) {
  const [currentTab, setCurrentTab] = useState<TabId>('armes');

  const currentItems = items[currentTab] ?? [];

  function ownedQty(itemId: string): number {
    return inventory.find(e => e.itemId === itemId)?.quantity ?? 0;
  }

  return (
    <div className="scr on" id="s-market">
      <ScrHeader title="MARCHÉ" gold={gold} onBack={onBack} />

      <div className="mkt-tabs">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            className={`mkt-tab${currentTab === id ? ' on' : ''}`}
            onClick={() => setCurrentTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mkt-body">
        <div className="gold-banner">
          <Icon id="coin" className="ico" />
          Tu disposes de{' '}
          <span style={{ color: 'var(--gold-hi)', margin: '0 4px' }}>{gold}</span>
          pièces d'or.
        </div>

        <div className="item-grid">
          {currentItems.map((item) => {
            const canAfford = gold >= item.price;
            const qty = ownedQty(item.id);
            const iconId = itemTypeToIcon(item.type);

            return (
              <div key={item.id} className={`item-card rarity rarity--${item.rarity}`}>
                <div className="rarity-bar" />
                <div className="item-img">
                  <Icon id={iconId} />
                  {qty > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 6,
                        fontFamily: 'var(--font-title)',
                        fontSize: '9px',
                        color: 'var(--gold-hi)',
                        background: 'rgba(0,0,0,.65)',
                        padding: '1px 4px',
                        borderRadius: 2,
                      }}
                    >
                      x{qty}
                    </span>
                  )}
                </div>
                <div className="item-body">
                  <div className="item-name">{item.name}</div>
                  <div className="item-type">{item.type}</div>
                  <div className="item-stat">{item.stat}</div>
                  <div className="item-price">
                    <Icon id="coin" className="ico" /> {item.price}
                  </div>
                  {canAfford ? (
                    <button className="buy-btn" onClick={() => onBuy?.(item.id, currentTab)}>
                      ACHETER
                    </button>
                  ) : (
                    <div className="buy-btn-disabled">INSUFFISANT</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
