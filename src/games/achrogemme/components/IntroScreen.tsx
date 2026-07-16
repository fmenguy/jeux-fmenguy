import { useMemo } from 'react';
import { CHAMPIONS, OPPONENT_ORDER, OPPONENT_UNLOCK_WINS } from '../data/champions';
import { getStats } from '../data/collection';

interface Props { onStart: (opponentId: string) => void; }

const GEMS = [
  { top: '12%', left: '8%',  delay: 0 },
  { top: '70%', left: '12%', delay: 1.2 },
  { top: '22%', left: '88%', delay: 2.4 },
  { top: '78%', left: '85%', delay: 0.8 },
  { top: '45%', left: '4%',  delay: 3.6 },
  { top: '55%', left: '94%', delay: 1.8 },
];

const OPPONENT_AVATAR: Record<string, string> = {
  sylvie: '🧝‍♀️',
  lilia: '🏹',
  skarn: '⚔',
};

const OPPONENT_DESC: Record<string, string> = {
  sylvie: 'Elle déploie le jeu que son père lui a appris. Douce, mais elle apprend vite.',
  lilia: 'La légende vivante presse l\'adversaire : ses flèches percent tout.',
  skarn: 'Le maître de l\'Achrogemme. Son jeu a toujours deux tours d\'avance.',
};

export function IntroScreen({ onStart }: Props) {
  const wins = useMemo(() => getStats().wins, []);

  return (
    <div className="ach-intro">
      <div className="ach-intro__deco" aria-hidden="true">
        {GEMS.map((g, i) => (
          <div
            key={i}
            className="ach-intro__deco-gem"
            style={{ top: g.top, left: g.left, animationDelay: `${g.delay}s` }}
          />
        ))}
      </div>

      <div className="ach-intro__inner">
        <div className="ach-intro__sup">Le jeu de cartes d'Achronia</div>
        <h1 className="ach-intro__title">
          <span className="ach-intro__title-orn">✦</span>
          Achrogemme
          <span className="ach-intro__title-orn">✦</span>
        </h1>
        <div className="ach-intro__subtitle">
          Trois Marches, des Gemmes, et la mémoire de Skarn.
        </div>

        <div className="ach-intro__lore">
          À bord de l'Éclatmaris, Sylvie déploie le jeu que son père lui a appris.
          La Sylvestre garde les forêts, l'Arcanique veille sur les plaines de runes,
          le Rempart tient les forteresses naines. Chaque Gemme captée alimente
          les pièces invoquées. Le monde du duel est tiré au sort : Achronia nourrit
          la magie, Terrania l'ignore, Sandara l'assèche.
        </div>

        <div className="ach-intro__opponents">
          {OPPONENT_ORDER.map((id) => {
            const champ = CHAMPIONS[id];
            const needed = OPPONENT_UNLOCK_WINS[id] ?? 0;
            const locked = wins < needed;
            return (
              <button
                key={id}
                type="button"
                className="ach-intro__opp"
                data-locked={locked ? '1' : '0'}
                data-tier={champ.difficulty}
                disabled={locked}
                onClick={() => onStart(id)}
                title={locked ? `Se débloque après ${needed} victoire${needed > 1 ? 's' : ''} (tu en as ${wins})` : `Affronter ${champ.name}`}
              >
                <span className="ach-intro__opp-avatar">{locked ? '🔒' : OPPONENT_AVATAR[id]}</span>
                <span className="ach-intro__opp-name">{champ.name}</span>
                <span className="ach-intro__opp-tier">{champ.difficulty}</span>
                <span className="ach-intro__opp-desc">
                  {locked
                    ? `Gagne ${needed} duel${needed > 1 ? 's' : ''} pour débloquer (${wins}/${needed}).`
                    : OPPONENT_DESC[id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ach-intro__footer">
          Tiré du roman <a href="https://elfes.fmenguy.fr/tome2" target="_blank" rel="noreferrer">Sylvie et la Fracture Galactique</a>.
        </div>
      </div>
    </div>
  );
}
