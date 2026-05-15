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

const MOCK_FLOORS: FloorEntry[] = [
  {
    num: 'I',
    depth: '0 m',
    name: 'Entrée',
    desc: 'Premiers pas dans le gouffre. Apprends les déplacements et le corps-à-corps.',
    gift: 'Daïn Piedlor · Guerrier Nain',
    state: 'done',
  },
  {
    num: 'II',
    depth: '-50 m',
    name: 'Galerie',
    desc: 'Une coursive étroite. La portée et le positionnement prennent leur sens.',
    gift: 'Aeris Ventpâle · Archère Elfe',
    state: 'done',
  },
  {
    num: 'III',
    depth: '-120 m',
    name: 'Caverne',
    desc: 'Cristaux runiques. Découvre la magie offensive et les résistances.',
    gift: 'Sylvara Brasier · Mage Offensif',
    state: 'done',
  },
  {
    num: 'IV',
    depth: '-200 m',
    name: 'Salle du Titan',
    desc: 'Une chambre voûtée. Apprends à tenir une ligne, à protéger.',
    gift: 'Borin Rempart · Protecteur',
    state: 'current',
  },
  {
    num: 'V',
    depth: '-300 m',
    name: 'Coeur',
    desc: 'Le palier final. Les quatre classes en synergie.',
    gift: null,
    state: 'locked',
  },
];

interface GouffreProps {
  floors?: FloorEntry[];
  onBack?: () => void;
  onEnterFloor?: (floorNum: string) => void;
}

export function Gouffre({ floors = MOCK_FLOORS, onBack, onEnterFloor }: GouffreProps) {
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
