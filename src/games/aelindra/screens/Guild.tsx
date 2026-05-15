/* ============================================
   AELINDRA · screens/Guild.tsx
   Écran 06 : Guilde des aventuriers (invocations)
   ============================================ */

import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';

interface RosterSlot {
  i: string | null;
  r: string | null;
}

const MOCK_ROSTER: RosterSlot[] = [
  { i: 'warrior',  r: 'rare' },
  { i: 'archer',   r: 'common' },
  { i: 'mage',     r: 'epic' },
  { i: 'guardian', r: 'rare' },
  { i: 'spy',      r: 'epic' },
  { i: 'healer',   r: 'rare' },
  { i: 'archer',   r: 'legendary' },
  { i: 'warrior',  r: 'common' },
  { i: 'mage',     r: 'epic' },
  { i: null, r: null },
  { i: null, r: null },
  { i: null, r: null },
];

interface GuildProps {
  orbs?: number;
  pityCount?: number;
  pityMax?: number;
  rosterSlots?: RosterSlot[];
  rosterFilled?: number;
  rosterTotal?: number;
  onBack?: () => void;
  onPull1?: () => void;
  onPull10?: () => void;
}

export function Guild({
  orbs = 64,
  pityCount = 23,
  pityMax = 50,
  rosterSlots = MOCK_ROSTER,
  rosterFilled = 9,
  rosterTotal = 24,
  onBack,
  onPull1,
  onPull10,
}: GuildProps) {
  const pityPercent = Math.round((pityCount / pityMax) * 100);

  return (
    <div className="scr on" id="s-guild">
      <ScrHeader title="GUILDE DES AVENTURIERS" orb={orbs} onBack={onBack} />
      <div className="guild-body">
        <div className="guild-info">
          <Icon id="orb" className="ico ic" />
          Les Orbes Runiques attirent des aventuriers depuis l'aube des âges. À 50 invocations
          sans Épique, un sort de garantie s'active.
        </div>

        <div className="guild-pull">
          <div className="guild-orb">
            <Icon id="orb" />
          </div>

          <div className="pity-wrap">
            <div className="pity-lbl">
              <span>SCEAU DE GARANTIE</span>
              <span className="pity-count">
                {pityCount} / {pityMax}
              </span>
            </div>
            <div className="pity-bg">
              <div className="pity-fill" style={{ width: `${pityPercent}%` }}></div>
            </div>
          </div>

          <div className="pull-btns">
            <button className="pb1" onClick={onPull1}>
              <span className="lbl">×1</span>
              <span className="price">10 ◆</span>
            </button>
            <button className="pb10" onClick={onPull10}>
              <span className="lbl">×10</span>
              <span className="price">90 ◆</span>
              <span className="bonus">+1 gratuit</span>
            </button>
          </div>

          <div className="rate-pills">
            <span className="rp rp-c">28% COMMUN</span>
            <span className="rp rp-r">54% RARE</span>
            <span className="rp rp-e">16% ÉPIQUE</span>
            <span className="rp rp-l">2% LÉGENDAIRE</span>
          </div>
        </div>

        <div className="guild-roster">
          <div className="roster-title">
            PANTHÉON · {rosterFilled} / {rosterTotal}
          </div>
          <div className="roster-grid">
            {rosterSlots.map((p, i) => (
              <div key={i} className="roster-hero">
                <div
                  className={`roster-port ${p.r ? `rarity rarity--${p.r}` : ''}`}
                  style={{
                    borderColor: p.r ? '' : 'var(--mute)',
                    opacity: p.r ? 1 : 0.3,
                  }}
                >
                  {p.i ? (
                    <Icon id={p.i} className="ico" style={{ width: 16, height: 16 }} />
                  ) : (
                    <Icon id="lock" className="ico" style={{ width: 12, height: 12, color: 'var(--dim2)' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
