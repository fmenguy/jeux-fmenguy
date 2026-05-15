/* ============================================
   AELINDRA · screens/Market.tsx
   Écran 05 : Marché (armes, armures, potions)
   ============================================ */

import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';

interface MarketItem {
  name: string;
  type: string;
  icon: string;
  stat: string;
  price: number;
  rarity: string;
  soldOut?: boolean;
}

const MOCK_MARKET_ITEMS: MarketItem[] = [
  { name: "Hache d'argent",   type: 'Arme · 2 mains', icon: 'weapon', stat: '+18 ATK · portée 1',  price: 220, rarity: 'rare' },
  { name: 'Bâton de Cristal', type: 'Arme · 2 mains', icon: 'weapon', stat: '+22 MAG · portée 3',  price: 380, rarity: 'epic' },
  { name: 'Arc Elfique',      type: 'Arme · 2 mains', icon: 'weapon', stat: '+14 ATK · portée 4',  price: 160, rarity: 'common' },
  { name: 'Lame Stellaire',   type: 'Arme · 1 main',  icon: 'weapon', stat: '+30 ATK · crit +6%',  price: 540, rarity: 'epic' },
  { name: "Dague d'Ombre",    type: 'Arme · 1 main',  icon: 'weapon', stat: '+12 ATK · vit +8',    price: 140, rarity: 'common', soldOut: true },
  { name: 'Flamberge Royale', type: 'Arme · 2 mains', icon: 'weapon', stat: '+45 ATK · crit +10%', price: 980, rarity: 'legendary' },
];

interface MarketProps {
  items?: MarketItem[];
  gold?: number;
  onBack?: () => void;
  onBuy?: (itemName: string) => void;
}

export function Market({ items = MOCK_MARKET_ITEMS, gold = 320, onBack, onBuy }: MarketProps) {
  return (
    <div className="scr on" id="s-market">
      <ScrHeader title="MARCHÉ" gold={gold} onBack={onBack} />
      <div className="mkt-tabs">
        <button className="mkt-tab on">ARMES</button>
        <button className="mkt-tab">ARMURES</button>
        <button className="mkt-tab">POTIONS</button>
      </div>
      <div className="mkt-body">
        <div className="gold-banner">
          <Icon id="coin" className="ico" />
          Tu disposes de{' '}
          <span style={{ color: 'var(--gold-hi)', margin: '0 4px' }}>{gold}</span>
          pièces d'or à dépenser.
        </div>
        <div className="item-grid">
          {items.map((it, i) => (
            <div key={i} className={`item-card rarity rarity--${it.rarity}`}>
              <div className="rarity-bar"></div>
              <div className="item-img">
                <Icon id={it.icon} />
              </div>
              <div className="item-body">
                <div className="item-name">{it.name}</div>
                <div className="item-type">{it.type}</div>
                <div className="item-stat">{it.stat}</div>
                <div className="item-price">
                  <Icon id="coin" className="ico" /> {it.price}
                </div>
                {it.soldOut ? (
                  <div className="buy-btn-disabled">épuisé</div>
                ) : (
                  <button className="buy-btn" onClick={() => onBuy?.(it.name)}>
                    ACHETER
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
