import type { PlayerState, Side } from '../state/types';

interface Props {
  player: PlayerState;
  side: Side;
  isActive: boolean;
}

export function ChampionView({ player, side, isActive }: Props) {
  const hpPct = Math.max(0, Math.min(100, (player.hp / 25) * 100));
  return (
    <div className={`strat-champion strat-champion-${side} ${isActive ? 'is-active' : ''}`}>
      <div className="strat-champion-portrait">{player.champion.name.charAt(0)}</div>
      <div className="strat-champion-info">
        <div className="strat-champion-name">{player.champion.name}</div>
        <div className="strat-champion-hp-bar">
          <div className="strat-champion-hp-fill" style={{ width: `${hpPct}%` }} />
          <span className="strat-champion-hp-text">{player.hp} PV</span>
        </div>
      </div>
      <div className="strat-champion-energy" title="Énergie">
        <span className="strat-energy-num">{player.energy}</span>
        <span className="strat-energy-sep">/</span>
        <span className="strat-energy-max">{player.energyMax}</span>
      </div>
    </div>
  );
}
