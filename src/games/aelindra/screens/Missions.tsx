/* ============================================
   AELINDRA · screens/Missions.tsx
   Écran 09 : Missions principales et quotidiennes
   ============================================ */

import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';

interface MissionEntry {
  name: string;
  reward: string;
  rewardBonus?: string;
  desc: string;
  progress: number;
  current: number;
  total: number;
  state: 'claimable' | 'claimed' | 'active';
}

const MOCK_MAIN_MISSIONS: MissionEntry[] = [
  {
    name: 'Première Victoire',
    reward: '+30',
    rewardBonus: '×3 bonus',
    desc: 'Remporte un combat dans le Gouffre.',
    progress: 1,
    current: 1,
    total: 1,
    state: 'claimable',
  },
  {
    name: 'Équipe Diversifiée',
    reward: '+50',
    rewardBonus: '×5 bonus',
    desc: 'Compose une équipe avec 3 classes différentes.',
    progress: 0.66,
    current: 2,
    total: 3,
    state: 'active',
  },
  {
    name: 'Héros Recruté',
    reward: '+20',
    rewardBonus: undefined,
    desc: 'Invoque ton premier aventurier à la guilde.',
    progress: 1,
    current: 1,
    total: 1,
    state: 'claimed',
  },
];

const MOCK_DAILY_MISSIONS: MissionEntry[] = [
  {
    name: 'Combat Quotidien',
    reward: '+8',
    rewardBonus: undefined,
    desc: "Termine un combat aujourd'hui.",
    progress: 0,
    current: 0,
    total: 1,
    state: 'active',
  },
  {
    name: 'Connexion',
    reward: '+5',
    rewardBonus: undefined,
    desc: 'Te connecter au royaume.',
    progress: 1,
    current: 1,
    total: 1,
    state: 'claimable',
  },
];

interface MissionsProps {
  mainMissions?: MissionEntry[];
  dailyMissions?: MissionEntry[];
  dailyResetLabel?: string;
  onBack?: () => void;
  onClaim?: (missionName: string) => void;
}

export function Missions({
  mainMissions = MOCK_MAIN_MISSIONS,
  dailyMissions = MOCK_DAILY_MISSIONS,
  dailyResetLabel = 'Reset dans 06h 23m',
  onBack,
  onClaim,
}: MissionsProps) {
  function renderMission(m: MissionEntry, i: number) {
    return (
      <div key={i} className={`mission-card ${m.state === 'claimable' ? 'claimable' : ''} ${m.state === 'claimed' ? 'claimed' : ''}`}>
        <div className="mission-header">
          <span className="mission-name">{m.name}</span>
          <span className="mission-reward">
            <Icon id="orb" className="ico" /> {m.reward}
            {m.rewardBonus && <span className="bonus"> {m.rewardBonus}</span>}
          </span>
        </div>
        <div className="mission-desc">{m.desc}</div>
        <div className="mission-progress-bar">
          <div style={{ width: `${m.progress * 100}%` }}></div>
        </div>
        <div className="mission-footer">
          <span className="progress-txt">
            {m.current} / {m.total}
          </span>
          {m.state === 'claimable' && (
            <button onClick={() => onClaim?.(m.name)}>RÉCLAMER</button>
          )}
          {m.state === 'claimed' && (
            <span className="mission-done-tag">
              <Icon id="check" className="ico" /> RÉCLAMÉ
            </span>
          )}
          {m.state === 'active' && (
            <span className="t-faint t-body" style={{ fontStyle: 'italic' }}>
              {m.progress === 0 ? '' : 'en cours…'}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="scr on" id="s-missions">
      <ScrHeader title="MISSIONS" onBack={onBack} />
      <div className="missions-body">
        <section>
          <h3 className="missions-section-title">QUÊTES PRINCIPALES</h3>
          <div>{mainMissions.map((m, i) => renderMission(m, i))}</div>
        </section>

        <section>
          <h3 className="missions-section-title">MISSIONS QUOTIDIENNES</h3>
          <p className="daily-reset-label">
            <Icon id="time" className="ico" style={{ marginRight: 4, color: 'var(--rune)' }} />
            {dailyResetLabel}
          </p>
          <div>{dailyMissions.map((m, i) => renderMission(m, i))}</div>
        </section>
      </div>
    </div>
  );
}
