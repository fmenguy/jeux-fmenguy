/* ============================================
   AELINDRA · screens/DungeonFloors.tsx
   Écran des étages pour les donjons post-tutoriel
   (Forêt Maudite, Mines de Fer Noir, Tour des Ombres)
   ============================================ */

import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';
import type { Floor } from '../data/types';

// Helper numérotation romaine (I à X)
function toRoman(n: number): string {
  const vals = [10, 9, 5, 4, 1] as const;
  const syms = ['X', 'IX', 'V', 'IV', 'I'] as const;
  let result = '';
  let num = n;
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result;
}

// Icône selon l'id du donjon
function dungeonIcon(dungeonId?: string): string {
  if (!dungeonId) return '⚔️';
  if (dungeonId === 'foret') return '🌲';
  if (dungeonId === 'mines') return '⛏️';
  if (dungeonId === 'tour')  return '🗼';
  return '⚔️';
}

// Compte les ennemis dans un Floor
function enemyCount(floor: Floor): number {
  if (Array.isArray(floor.enemies)) return floor.enemies.length;
  // chaîne du type "2× Rat, 1× Gobelin"
  if (typeof floor.enemies === 'string') {
    const matches = floor.enemies.match(/(\d+)×/g);
    if (matches) return matches.reduce((sum, m) => sum + parseInt(m), 0);
    return floor.enemies.split(',').length;
  }
  return 0;
}

export interface DungeonFloorsProps {
  dungeonId?: string;
  dungeonName?: string;
  dungeonDescription?: string;
  dungeonDepth?: string;
  floors?: Floor[];
  cleared?: number;
  onBack?: () => void;
  onEnterFloor?: (floorIdx: number) => void;
}

export function DungeonFloors({
  dungeonId,
  dungeonName,
  dungeonDescription,
  dungeonDepth,
  floors = [],
  cleared = 0,
  onBack,
  onEnterFloor,
}: DungeonFloorsProps) {
  const icon = dungeonIcon(dungeonId);
  const title = dungeonName ? dungeonName.toUpperCase() : 'DONJON';

  return (
    <div className="scr on" id="s-dungeon-floors">
      <ScrHeader title={title} onBack={onBack} />

      {/* Sous-en-tête : icône + nom + profondeur + description */}
      <div
        style={{
          padding: '10px 14px 12px',
          borderBottom: '1px solid var(--b)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-title)',
                fontSize: 13,
                color: 'var(--fg)',
                letterSpacing: '.08em',
              }}
            >
              {dungeonName}
            </div>
            {dungeonDepth && (
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 9,
                  color: 'var(--dim)',
                  letterSpacing: '.1em',
                  marginTop: 1,
                }}
              >
                {dungeonDepth}
              </div>
            )}
          </div>
        </div>
        {dungeonDescription && (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: 'var(--dim)',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}
          >
            {dungeonDescription}
          </div>
        )}
      </div>

      {/* Liste des étages */}
      <div className="fw">
        {floors.map((floor, i) => {
          const floorState: 'done' | 'current' | 'locked' =
            i < cleared ? 'done' : i === cleared ? 'current' : 'locked';
          const roman = toRoman(i + 1);
          const count = enemyCount(floor);

          return (
            <div
              key={floor.id ?? i}
              className={[
                'fc',
                floorState === 'done'    ? 'fc-dn'   : '',
                floorState === 'current' ? 'fc-cu'   : '',
                floorState === 'locked'  ? 'fc-lock' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Profondeur */}
              <div className="fc-depth">{floor.depth}</div>

              {/* Numéro + label */}
              <div className="fc-num">
                <span className="roman">{roman}</span> · ÉTAGE
                {floor.isBoss && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontFamily: 'var(--font-title)',
                      fontSize: 8,
                      color: 'var(--accent)',
                      letterSpacing: '.15em',
                      background: 'rgba(var(--accent-rgb, 255,100,60), .12)',
                      padding: '1px 5px',
                      borderRadius: 2,
                    }}
                  >
                    BOSS
                  </span>
                )}
              </div>

              {/* Nom */}
              <div className="fc-nm">{floor.name}</div>

              {/* Nombre d'ennemis */}
              <div className="fc-desc">
                {count > 0 ? `${count} ennemi${count > 1 ? 's' : ''}` : 'Ennemis inconnus'}
              </div>

              {/* Récompenses */}
              {(floor.reward.gold || floor.reward.orbs || floor.reward.xp) && (
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginTop: 5,
                    flexWrap: 'wrap',
                  }}
                >
                  {floor.reward.gold != null && (
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 9,
                        color: 'var(--gold, #d4a017)',
                      }}
                    >
                      🪙 {floor.reward.gold}
                    </span>
                  )}
                  {floor.reward.orbs != null && (
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 9,
                        color: 'var(--orb, #8a6fcf)',
                      }}
                    >
                      🔮 {floor.reward.orbs}
                    </span>
                  )}
                  {floor.reward.xp != null && (
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 9,
                        color: 'var(--xp, #4caf50)',
                      }}
                    >
                      ✨ {floor.reward.xp} xp
                    </span>
                  )}
                </div>
              )}

              {/* Bouton entrée sur l'étage courant */}
              {floorState === 'current' && (
                <button
                  className="fc-enter-btn"
                  onClick={() => onEnterFloor?.(i)}
                >
                  ENTRER DANS L'ÉTAGE
                </button>
              )}

              {/* Verrou sur les étages verrouillés */}
              {floorState === 'locked' && (
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
          );
        })}
      </div>
    </div>
  );
}
