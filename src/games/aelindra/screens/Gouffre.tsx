/* ============================================
   AELINDRA · screens/Gouffre.tsx
   Écran 03 : Paliers du Gouffre des Origines
   ============================================ */

import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';

interface FloorEntry {
  num: string;
  depth: string;
  name: string;
  desc: string;
  gift: string | null;
  state: 'done' | 'current' | 'locked';
}

interface GouffreProps {
  floors?: FloorEntry[];
  onBack?: () => void;
  onEnterFloor?: (floorNum: string) => void;
}

export function Gouffre({ floors = [], onBack, onEnterFloor }: GouffreProps) {
  return (
    <div className="scr on" id="s-gouffre">
      <ScrHeader title="LE GOUFFRE DES ORIGINES" onBack={onBack} />
      <div
        style={{
          padding: '9px 14px 10px',
          borderBottom: '1px solid var(--b)',
          flexShrink: 0,
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          color: 'var(--dim)',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        5 paliers dans les profondeurs · un héros offert à chaque descente.
      </div>
      <div className="fw">
        {floors.map((f, i) => (
          <div
            key={i}
            className={`fc ${f.state === 'done' ? 'fc-dn' : ''} ${f.state === 'current' ? 'fc-cu' : ''} ${f.state === 'locked' ? 'fc-lock' : ''}`}
          >
            <div className="fc-depth">{f.depth}</div>
            <div className="fc-num">
              <span className="roman">{f.num}</span> · PALIER
            </div>
            <div className="fc-nm">{f.name}</div>
            <div className="fc-desc">{f.desc}</div>
            {f.gift && (
              <div className="fc-gift">
                <div className="fc-gift-ic">
                  <Icon id="gift" />
                </div>
                <div className="fc-gift-text">
                  <span className="lbl">HÉROS OFFERT</span>
                  {f.gift}
                </div>
                {f.state === 'current' && <span className="fc-new">NEW</span>}
              </div>
            )}
            {f.state === 'current' && (
              <button className="fc-enter-btn" onClick={() => onEnterFloor?.(f.num)}>
                ENTRER DANS LE PALIER
              </button>
            )}
            {f.state === 'locked' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: 'var(--dim2)',
                  fontFamily: 'var(--font-title)',
                  fontSize: 9,
                  letterSpacing: '.2em',
                  padding: 6,
                  marginTop: 4,
                }}
              >
                <Icon id="lock" className="ico" />
                VERROUILLÉ
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
