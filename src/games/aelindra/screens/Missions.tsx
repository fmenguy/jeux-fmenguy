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

interface MissionsProps {
  mainMissions?: MissionEntry[];
  dailyMissions?: MissionEntry[];
  dailyResetLabel?: string;
  onBack?: () => void;
  onClaim?: (missionName: string) => void;
}

export function Missions({
  mainMissions = [],
  dailyMissions = [],
  dailyResetLabel = '',
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
          {dailyResetLabel && (
            <p className="daily-reset-label">
              <Icon id="time" className="ico" style={{ marginRight: 4, color: 'var(--rune)' }} />
              {dailyResetLabel}
            </p>
          )}
          <div>{dailyMissions.map((m, i) => renderMission(m, i))}</div>
        </section>
      </div>
    </div>
  );
}
