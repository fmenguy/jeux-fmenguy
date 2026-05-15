/* ============================================
   AELINDRA · screens/Splash.tsx
   Écran 01 : Hub principal
   ============================================ */

import { Icon } from '../components/Icons';
import { TopBar } from '../components/TopBar';

interface MockHero {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  lv: number;
}

const MOCK_HEROES: MockHero[] = [
  { id: 'dain',  name: 'Daïn Piedlor',    icon: 'warrior',  rarity: 'rare',   lv: 4 },
  { id: 'aeris', name: 'Aeris Ventpâle',  icon: 'archer',   rarity: 'common', lv: 3 },
  { id: 'sylva', name: 'Sylvara Brasier', icon: 'mage',     rarity: 'epic',   lv: 5 },
  { id: 'borin', name: 'Borin Rempart',   icon: 'guardian', rarity: 'rare',   lv: 4 },
];

interface SplashProps {
  heroes?: MockHero[];
  playerName?: string;
  playerInitial?: string;
  gold?: number;
  orbs?: number;
  onNavigate?: (screen: string) => void;
}

export function Splash({
  heroes = MOCK_HEROES,
  playerName = 'Aldwyn',
  playerInitial = 'A',
  gold = 320,
  orbs = 64,
  onNavigate,
}: SplashProps) {
  return (
    <div className="scr on" id="s-splash">
      <TopBar name={playerName} initial={playerInitial} gold={gold} orb={orbs} />

      <div className="logo-zone">
        <div className="logo-sigil">
          <Icon id="sigil" />
        </div>
        <div className="logo-ornament">
          <span className="line"></span>
          <span className="star">✦</span>
          <span className="line"></span>
        </div>
        <div className="logo-title">AELINDRA</div>
        <div className="logo-sub">CHRONIQUES DES PROFONDEURS</div>
      </div>

      <div className="team-strip">
        <div className="strip-lbl">ÉQUIPE ACTIVE</div>
        <div className="team-row">
          {heroes.map(h => (
            <div key={h.id} className={`hchip rarity--${h.rarity}`}>
              <div className={`hero-portrait hero-portrait--framed rarity--${h.rarity} hp`}>
                <div style={{ color: 'var(--gold-hi)' }}>
                  <Icon id={h.icon} className="ico" style={{ width: 18, height: 18 }} />
                </div>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="nm">{h.name.split(' ')[0]}</div>
                <div className="lv">LV.{h.lv}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hub-grid">
        <div className="hb hb-acc" onClick={() => onNavigate?.('dungeons')}>
          <div className="hb-icon"><Icon id="dungeon" /></div>
          <div className="hb-name">DONJONS</div>
          <div className="hb-desc">
            Missions et exploration<br />des profondeurs
          </div>
          <span className="hb-bdg badge-new">TUTO</span>
        </div>
        <div className="hb" onClick={() => onNavigate?.('guild')}>
          <div className="hb-icon"><Icon id="guild" /></div>
          <div className="hb-name">GUILDE</div>
          <div className="hb-desc">
            Invoquer de nouveaux<br />aventuriers
          </div>
        </div>
        <div className="hb" onClick={() => onNavigate?.('market')}>
          <div className="hb-icon"><Icon id="market" /></div>
          <div className="hb-name">MARCHÉ</div>
          <div className="hb-desc">
            Armes et armures<br />Or uniquement
          </div>
        </div>
        <div className="hb" onClick={() => onNavigate?.('heroes')}>
          <div className="hb-icon"><Icon id="team" /></div>
          <div className="hb-name">ÉQUIPE</div>
          <div className="hb-desc">
            Gérer et équiper<br />tes héros
          </div>
        </div>
        <div className="hb" onClick={() => onNavigate?.('missions')}>
          <div className="hb-icon"><Icon id="missions" /></div>
          <div className="hb-name">MISSIONS</div>
          <div className="hb-desc">
            Quêtes principales et défis quotidiens
          </div>
        </div>
      </div>
    </div>
  );
}
