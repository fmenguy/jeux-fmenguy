/* ============================================
   AELINDRA · screens/Heroes.tsx
   Écran 07 : Équipe active + collection
   ============================================ */

import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';

interface HeroEntry {
  id: string;
  name: string;
  class: string;
  race: string;
  icon: string;
  rarity: string;
  lv: number;
  hp: { c: number; m: number };
  mp: { c: number; m: number };
}

interface HeroesProps {
  heroes?: HeroEntry[];
  collectionHeroes?: HeroEntry[];
  onBack?: () => void;
  onSelectHero?: (heroId: string) => void;
}

function HeroRow({ h, onSelectHero }: { h: HeroEntry; onSelectHero?: (id: string) => void }) {
  return (
    <div
      className={`hero-row rarity rarity--${h.rarity}`}
      onClick={() => onSelectHero?.(h.id)}
    >
      <div className="rarity-bar"></div>
      <div className={`hero-portrait hero-portrait--framed rarity--${h.rarity}`}>
        <div style={{ color: 'var(--gold-hi)' }}>
          <Icon id={h.icon} className="ico" style={{ width: 26, height: 26 }} />
        </div>
        <span className="hp-lv">LV.{h.lv}</span>
      </div>
      <div className="hr-info">
        <div className="hr-top">
          <span className="hr-name">{h.name}</span>
        </div>
        <div className="hr-class">
          <Icon id={h.icon} className="ico" /> {h.class} ·{' '}
          <span style={{ color: 'var(--dim)', fontStyle: 'italic', letterSpacing: '.05em' }}>
            {h.race}
          </span>
        </div>
        <div className="hr-bars">
          <div className="bar-wrap">
            <span className="lbl" style={{ color: 'var(--hp)' }}>PV</span>
            <div className="bar bar--hp">
              <div className="fill" style={{ width: `${(h.hp.c / h.hp.m) * 100}%` }}></div>
            </div>
            <span className="val">{h.hp.c}</span>
          </div>
          <div className="bar-wrap">
            <span className="lbl" style={{ color: 'var(--mp)' }}>PM</span>
            <div className="bar bar--mp">
              <div className="fill" style={{ width: `${(h.mp.c / h.mp.m) * 100}%` }}></div>
            </div>
            <span className="val">{h.mp.c}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Heroes({
  heroes = [],
  collectionHeroes = [],
  onBack,
  onSelectHero,
}: HeroesProps) {
  const hasTeam = heroes.length > 0;
  const hasCollection = collectionHeroes.length > 0;

  return (
    <div className="scr on" id="s-heroes">
      <ScrHeader title="TON ÉQUIPE" onBack={onBack} />
      <div className="heroes-list">
        {!hasTeam && !hasCollection && (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--dim)',
            fontStyle: 'italic',
            lineHeight: 1.6,
          }}>
            Aucun héros pour l'instant.<br />
            Explore le Gouffre ou invoque à la Guilde.
          </div>
        )}

        {hasTeam && (
          <>
            <div className="heroes-section-lbl">ÉQUIPE ACTIVE · {heroes.length} / 4</div>
            {heroes.map(h => (
              <HeroRow key={h.id} h={h} onSelectHero={onSelectHero} />
            ))}
          </>
        )}

        {hasCollection && (
          <>
            <div className="heroes-section-lbl" style={{ marginTop: hasTeam ? 10 : 0 }}>
              COLLECTION · {collectionHeroes.length}
            </div>
            {collectionHeroes.map(h => (
              <HeroRow key={h.id} h={h} onSelectHero={onSelectHero} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
