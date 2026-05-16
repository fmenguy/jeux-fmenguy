/* ============================================
   AELINDRA · screens/Splash.tsx
   Écran 01 : Hub principal
   ============================================ */

import { Icon } from '../components/Icons';
import { TopBar } from '../components/TopBar';

interface HeroChip {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  lv: number;
}

interface SplashProps {
  heroes?: HeroChip[];
  onNavigate?: (screen: string) => void;
}

export function Splash({ heroes = [], onNavigate }: SplashProps) {
  return (
    <div className="scr on" id="s-splash">
      <TopBar />

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
          {heroes.length === 0 ? (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--dim)', fontStyle: 'italic' }}>
              Aucun héros — explore le Gouffre pour en recruter.
            </span>
          ) : (
            heroes.map(h => (
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
            ))
          )}
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
