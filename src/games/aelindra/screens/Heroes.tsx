/* ============================================
   AELINDRA · screens/Heroes.tsx
   Écran 07 : Liste de l'équipe
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

const MOCK_HEROES: HeroEntry[] = [
  { id: 'dain',  name: 'Daïn Piedlor',    class: 'Guerrier',   race: 'Nain',   icon: 'warrior',  rarity: 'rare',   lv: 4, hp: { c: 158, m: 158 }, mp: { c: 32,  m: 32  } },
  { id: 'aeris', name: 'Aeris Ventpâle',  class: 'Archère',    race: 'Elfe',   icon: 'archer',   rarity: 'common', lv: 3, hp: { c: 101, m: 101 }, mp: { c: 75,  m: 75  } },
  { id: 'sylva', name: 'Sylvara Brasier', class: 'Mage',       race: 'Elfe',   icon: 'mage',     rarity: 'epic',   lv: 5, hp: { c: 85,  m: 85  }, mp: { c: 148, m: 148 } },
  { id: 'borin', name: 'Borin Rempart',   class: 'Protecteur', race: 'Humain', icon: 'guardian', rarity: 'rare',   lv: 4, hp: { c: 294, m: 294 }, mp: { c: 24,  m: 24  } },
];

interface HeroesProps {
  heroes?: HeroEntry[];
  onBack?: () => void;
  onSelectHero?: (heroId: string) => void;
}

export function Heroes({ heroes = MOCK_HEROES, onBack, onSelectHero }: HeroesProps) {
  return (
    <div className="scr on" id="s-heroes">
      <ScrHeader title="TON ÉQUIPE" onBack={onBack} />
      <div className="heroes-list">
        {heroes.map(h => (
          <div
            key={h.id}
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
        ))}
      </div>
    </div>
  );
}
