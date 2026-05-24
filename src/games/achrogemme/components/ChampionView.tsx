import type { PlayerState, Side } from '../state/types';

interface Props {
  player: PlayerState;
  side: Side;
  isActive: boolean;
  accent?: 'sylvestre' | 'arcanique' | 'rempart' | '';
}

const AVATAR_BY_CHAMPION: Record<string, string> = {
  joueur: '🛡️',
  sylvie: '🧝‍♀️',
  lilia: '🏹',
  skarn: '⚔',
};

const SUBTITLE_BY_CHAMPION: Record<string, string> = {
  joueur: 'Affinité libre',
  sylvie: 'Élue, Tome 2',
  lilia: 'Exploratrice elfe',
  skarn: 'Maître du jeu, Tome 2',
};

export function ChampionView({ player, side, isActive, accent = '' }: Props) {
  const pct = Math.max(0, Math.min(100, (player.hp / Math.max(1, player.hpMax)) * 100));
  const avatar = AVATAR_BY_CHAMPION[player.champion.id] ?? '🛡️';
  const subtitle = SUBTITLE_BY_CHAMPION[player.champion.id] ?? '';
  const dataSide = side === 'ai' ? 'ia' : 'joueur';
  const gemMax = player.paMax;
  const gemSpent = player.paMax - player.pa;
  const remaining = player.pa;

  return (
    <div className={`ach-champ ${isActive ? 'is-active' : ''}`} data-side={dataSide} data-accent={accent}>
      <div className="ach-champ__avatar">{avatar}</div>
      <div className="ach-champ__info">
        <h3 className="ach-champ__name">
          {player.champion.name}
          {subtitle && <small>{subtitle}</small>}
        </h3>
        <div className="ach-champ__hpbar">
          <div className="ach-champ__hpfill" style={{ width: `${pct}%` }} />
          <div className="ach-champ__hpvalue">{player.hp} / {player.hpMax}</div>
        </div>
      </div>
      {gemMax > 0 && (
        <div className="ach-champ__mana-block">
          <div className="ach-champ__mana-label" title="Réserve de Gemmes">💎 Gemmes</div>
          <div className="ach-champ__mana" title={`${remaining} Gemmes sur ${gemMax}`}>
            {Array.from({ length: gemMax }).map((_, i) => (
              <span
                key={i}
                className="ach-champ__mana-gem"
                data-spent={i < gemSpent ? '1' : '0'}
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
            <span className="ach-champ__mana-count">{remaining}<i className="ach-champ__mana-slash">/</i>{gemMax}</span>
          </div>
        </div>
      )}
    </div>
  );
}
