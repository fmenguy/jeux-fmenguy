/* ============================================
   AELINDRA · screens/Combat.tsx
   Écran 04 : Grille de combat tactique
   Branché au store global via useGameState/useDispatch
   ============================================ */

import React from 'react';
import { Icon } from '../components/Icons';
import { specToIcon } from '../components/specToIcon';
import { useGameState, useDispatch } from '../state/GameContext';
import {
  getReachableTiles,
  getAttackableTargets,
  type CombatState,
  type Unit,
  type PendingAction,
} from '../logic/combat';
import { ABILITIES } from '../data/abilities';
import type { Ability } from '../data/types';
import { useCombatFx } from '../audio/useCombatFx';
import { isMuted, setMuted } from '../audio/sfx';

/* ============================================
   Props
   ============================================ */

interface CombatProps {
  cols?: number;
  rows?: number;
  tileSize?: number;
  onEnd?: () => void;
}

/* ============================================
   Helpers de rendu
   ============================================ */

function unitClassName(spec: string | undefined): string {
  // Classe CSS de coloration pour les héros (unit-warrior / unit-archer / unit-mage / unit-guardian)
  const icon = specToIcon(spec);
  switch (icon) {
    case 'warrior': return 'unit-warrior';
    case 'archer':  return 'unit-archer';
    case 'mage':    return 'unit-mage';
    case 'guardian':return 'unit-guardian';
    default:        return 'unit-warrior';
  }
}

function isAbilityUnlocked(ability: Ability, level: number): boolean {
  return ability.lvlReq <= level;
}

/* ============================================
   Composant principal
   ============================================ */

export function Combat({ cols, rows, tileSize = 72, onEnd }: CombatProps) {
  const state = useGameState();
  const dispatch = useDispatch();
  const combat = state.combat;

  // Détection des changements de combat pour anims + sons
  const { popups, fx } = useCombatFx(combat);
  const [audioOff, setAudioOff] = React.useState<boolean>(() => isMuted());

  // --- T2 : état visuel ---
  const [hoveredTile, setHoveredTile] = React.useState<{ x: number; y: number } | null>(null);
  const [phaseBanner, setPhaseBanner] = React.useState<{ label: string; team: 'elf' | 'enemy' } | null>(null);
  interface CombatParticle { id: number; left: string; top: string; dx: number; dy: number; variant: 'spark' }
  const [particles, setParticles] = React.useState<CombatParticle[]>([]);
  const [tooltip, setTooltip] = React.useState<string | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const prevPhaseRef = React.useRef<string | null>(null);
  const particleCounterRef = React.useRef(0);

  // Bandeau de phase
  React.useEffect(() => {
    if (!combat) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = combat.phase;
    if (prev !== null && prev !== combat.phase) {
      const label = combat.phase === 'elf' ? 'PHASE ELFES' : 'PHASE ENNEMIE';
      setPhaseBanner({ label, team: combat.phase });
      const t = setTimeout(() => setPhaseBanner(null), 900);
      return () => clearTimeout(t);
    }
  }, [combat?.phase]); // eslint-disable-line

  // Screen shake sur coup
  React.useEffect(() => {
    if (fx.hitIds.size === 0 || !wrapRef.current) return;
    const cls = fx.critIds.size > 0 ? 'is-shaking-big' : 'is-shaking';
    const el = wrapRef.current;
    el.classList.add(cls);
    const t = setTimeout(() => el.classList.remove(cls), 500);
    return () => clearTimeout(t);
  }, [fx.hitIds]); // eslint-disable-line

  // Cinématique zoom sur crit/kill
  React.useEffect(() => {
    if (fx.critIds.size === 0 || !gridRef.current || !combat) return;
    const grid = gridRef.current;
    const firstId = [...fx.critIds][0];
    const unit = combat.units.find(u => u.instanceId === firstId);
    if (unit) {
      const tw = 40;
      const cx = unit.pos.x * tw + tw / 2;
      const cy = unit.pos.y * tw + tw / 2;
      grid.style.setProperty('--cin-x', `${cx}px`);
      grid.style.setProperty('--cin-y', `${cy}px`);
    }
    grid.classList.add('is-cinematic');
    const t = setTimeout(() => grid.classList.remove('is-cinematic'), 650);
    return () => clearTimeout(t);
  }, [fx.critIds]); // eslint-disable-line

  // Particules sur impact
  React.useEffect(() => {
    if (fx.hitIds.size === 0 || !combat) return;
    const tw = tileSize + 2;
    const gw = gridCols * tw;
    const gh = gridRows * tw;
    const newP: CombatParticle[] = [];
    fx.hitIds.forEach(id => {
      const unit = combat.units.find(u => u.instanceId === id);
      if (!unit) return;
      const count = fx.critIds.has(id) ? 10 : 5;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + Math.random() * .5;
        const dist = 15 + Math.random() * 20;
        newP.push({
          id: ++particleCounterRef.current,
          left: `calc(50% - ${gw / 2}px + ${unit.pos.x * tw + tw / 2}px)`,
          top: `calc(50% - ${gh / 2}px + ${unit.pos.y * tw + tw / 2}px)`,
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist,
          variant: 'spark',
        });
      }
    });
    if (newP.length > 0) {
      setParticles(p => [...p, ...newP]);
      const ids = new Set(newP.map(x => x.id));
      setTimeout(() => setParticles(p => p.filter(x => !ids.has(x.id))), 850);
    }
  }, [fx.hitIds]); // eslint-disable-line
  // Dimensions de la grille (avant l'early return pour les closures useEffect)
  const gridCols = cols ?? combat?.gridCols ?? 3;
  const gridRows = rows ?? combat?.gridRows ?? 8;

  const toggleAudio = () => {
    const next = !audioOff;
    setMuted(next);
    setAudioOff(next);
  };

  // Cas : aucun combat en cours
  if (!combat) {
    return (
      <div className="scr on" id="s-combat">
        <div className="combat-topbar">
          <div className="combat-turn-info">
            <span className="turn-n">—</span> COMBAT
          </div>
          <div className="combat-phase">aucun combat en cours</div>
          <button className="bk" onClick={onEnd}>
            RETOUR <Icon id="back" className="ico" />
          </button>
        </div>
        <div className="combat-bottom">
          <Icon id="info" className="ico" style={{ color: 'var(--rune)' }} />
          Sélectionne un donjon pour démarrer un combat.
        </div>
      </div>
    );
  }

  // Construction tiles[y][x]
  const tilesByPos: (Unit | null)[][] = React.useMemo(() => {
    const grid: (Unit | null)[][] = Array.from({ length: gridRows }, () =>
      Array<Unit | null>(gridCols).fill(null),
    );
    for (const u of combat.units) {
      if (u.hp <= 0) continue;
      if (u.pos.y >= 0 && u.pos.y < gridRows && u.pos.x >= 0 && u.pos.x < gridCols) {
        grid[u.pos.y][u.pos.x] = u;
      }
    }
    return grid;
  }, [combat.units, gridCols, gridRows]);

  const selectedUnit: Unit | null = combat.selectedId
    ? combat.units.find(u => u.instanceId === combat.selectedId) ?? null
    : null;

  // Calcul des zones de portée (cases atteignables / cibles attaquables)
  const overlays = React.useMemo(() => {
    const reachableSet = new Set<string>();
    const attackableSet = new Set<string>(); // ennemis réellement attaquables
    const attackRangeSet = new Set<string>(); // toutes les cases à portée d'attaque
    const healSet = new Set<string>();        // alliés soignables
    const aoeSet = new Set<string>();         // preview AoE sur hover
    const ambientSet = new Set<string>();     // portée ambiente (pas d'action choisie)

    if (!selectedUnit) return { reachableSet, attackableSet, attackRangeSet, healSet, aoeSet, ambientSet };

    const addAttackRange = () => {
      for (let y = 0; y < combat.gridRows; y++) {
        for (let x = 0; x < combat.gridCols; x++) {
          const d = Math.abs(selectedUnit.pos.x - x) + Math.abs(selectedUnit.pos.y - y);
          if (d > 0 && d <= selectedUnit.range) attackRangeSet.add(`${x},${y}`);
        }
      }
    };

    if (!combat.pendingAction) {
      // Ambient : cases de déplacement en fond quand unité sélectionnée sans action
      for (const t of getReachableTiles(combat, selectedUnit)) {
        ambientSet.add(`${t.x},${t.y}`);
      }
      return { reachableSet, attackableSet, attackRangeSet, healSet, aoeSet, ambientSet };
    }

    const pa = combat.pendingAction;

    if (pa.type === 'move') {
      for (const t of getReachableTiles(combat, selectedUnit)) {
        reachableSet.add(`${t.x},${t.y}`);
      }
    } else if (pa.type === 'attack' || pa.type === 'spell') {
      addAttackRange();
      for (const t of getAttackableTargets(combat, selectedUnit)) {
        attackableSet.add(`${t.pos.x},${t.pos.y}`);
      }
    } else if (pa.type === 'ability') {
      const ability = ABILITIES[pa.abilityId];
      if (ability) {
        const tags = ability.tags ?? [];
        if (tags.includes('heal')) {
          for (const u of combat.units) {
            if (u.team === selectedUnit.team && u.hp > 0) {
              healSet.add(`${u.pos.x},${u.pos.y}`);
            }
          }
        } else if (tags.includes('mobility')) {
          for (const t of getReachableTiles(combat, selectedUnit, 5)) {
            reachableSet.add(`${t.x},${t.y}`);
          }
        } else if (tags.includes('buff_def')) {
          attackableSet.add(`${selectedUnit.pos.x},${selectedUnit.pos.y}`);
        } else if (tags.includes('aoe') || tags.includes('dmg')) {
          // Portée d'attaque + preview AoE sur la case survolée
          addAttackRange();
          if (hoveredTile) {
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= 2) {
                  const tx = hoveredTile.x + dx;
                  const ty = hoveredTile.y + dy;
                  if (tx >= 0 && tx < combat.gridCols && ty >= 0 && ty < combat.gridRows) {
                    aoeSet.add(`${tx},${ty}`);
                  }
                }
              }
            }
          }
          for (const t of getAttackableTargets(combat, selectedUnit)) {
            attackableSet.add(`${t.pos.x},${t.pos.y}`);
          }
        } else {
          addAttackRange();
          for (const t of getAttackableTargets(combat, selectedUnit)) {
            attackableSet.add(`${t.pos.x},${t.pos.y}`);
          }
        }
      }
    }
    return { reachableSet, attackableSet, attackRangeSet, healSet, aoeSet, ambientSet };
  }, [combat, selectedUnit, hoveredTile]);

  // ---- Handlers ----
  const handleTileClick = (x: number, y: number) => {
    if (combat.phase !== 'elf' || combat.isOver) return;
    dispatch({ type: 'COMBAT_TILE_CLICK', x, y });
  };

  const handleTileHover = (x: number, y: number) => {
    setHoveredTile({ x, y });
    // Tooltip de preview dégâts sur cible attaquable
    if (selectedUnit && overlays.attackableSet.has(`${x},${y}`)) {
      const target = combat.units.find(u => u.hp > 0 && u.pos.x === x && u.pos.y === y);
      if (target && selectedUnit.team !== target.team) {
        const kind = combat.pendingAction?.type === 'spell' ? 'spell' : 'attack';
        const raw = kind === 'spell' ? selectedUnit.mag : selectedUnit.atk;
        const resist = kind === 'spell' ? target.res : target.def;
        const preview = Math.max(1, Math.round(raw * (1 - resist / (resist + 100))));
        const critPct = selectedUnit.crit ?? 0;
        setTooltip(`~${preview} dmg · ${critPct}% crit`);
        return;
      }
    }
    setTooltip(null);
  };

  const handleTileLeave = () => {
    setHoveredTile(null);
    setTooltip(null);
  };

  const handleSetAction = (action: PendingAction | null) => {
    dispatch({ type: 'COMBAT_SET_ACTION', action });
    // Petit feedback sonore selon le type d'action choisi
    if (action?.type === 'spell' || action?.type === 'ability') {
      void import('../audio/sfx').then(m => m.playSpell());
    } else if (action?.type === 'attack') {
      void import('../audio/sfx').then(m => m.playSwing());
    }
  };

  const handleEndTurn = () => {
    dispatch({ type: 'COMBAT_END_TURN' });
  };

  const handleVictoryContinue = () => {
    if (combat.winner === 'elf') {
      dispatch({ type: 'COMBAT_GRANT_VICTORY' });
    }
    dispatch({ type: 'COMBAT_END' });
    if (onEnd) onEnd();
  };

  // ---- Top bar ----
  const aliveElves = combat.units.filter(u => u.team === 'elf' && u.hp > 0).length;
  const aliveEnemies = combat.units.filter(u => u.team === 'enemy' && u.hp > 0).length;
  const turnRoman = toRoman(combat.turn);
  const phaseLabel = combat.phase === 'elf' ? 'phase elfique' : 'phase ennemie';

  // ---- Queue (ordre du tour) ----
  const elfUnits = combat.units.filter(u => u.team === 'elf');
  const enemyUnits = combat.units.filter(u => u.team === 'enemy');

  // ---- Dock : actions et compétences pour l'unité sélectionnée ----
  const heroForSelected = selectedUnit
    ? state.team.find(h => `elf_${h.id}` === selectedUnit.instanceId) ?? null
    : null;
  const selectedLevel = heroForSelected?.level ?? 1;

  const unlockedAbilities: Array<{ id: string; ability: Ability }> = React.useMemo(() => {
    if (!selectedUnit || selectedUnit.team !== 'elf') return [];
    const ids = selectedUnit.abilities ?? [];
    return ids
      .map(id => ({ id, ability: ABILITIES[id] }))
      .filter((entry): entry is { id: string; ability: Ability } =>
        Boolean(entry.ability) && isAbilityUnlocked(entry.ability, selectedLevel),
      );
  }, [selectedUnit, selectedLevel]);

  const isPendingType = (t: PendingAction['type']): boolean =>
    combat.pendingAction?.type === t;

  const isPendingAbility = (id: string): boolean =>
    combat.pendingAction?.type === 'ability' && combat.pendingAction.abilityId === id;

  return (
    <div className="scr on" id="s-combat">
      {/* Top bar */}
      <div className="combat-topbar">
        <div className="combat-turn-info">
          TOUR <span className="turn-n">{turnRoman}</span>
        </div>
        <div className="combat-phase">{phaseLabel}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
            Elfes {aliveElves} · Ennemis {aliveEnemies}
          </span>
          <button
            className="bk"
            style={{ padding: '4px 7px', fontSize: 11, opacity: audioOff ? 0.5 : 1 }}
            onClick={toggleAudio}
            aria-label={audioOff ? 'Activer le son' : 'Couper le son'}
            title={audioOff ? 'Son coupé' : 'Son activé'}
          >
            {audioOff ? '🔇' : '🔊'}
          </button>
          <button
            className="bk"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={handleEndTurn}
            disabled={combat.phase !== 'elf' || combat.isOver}
          >
            FIN <Icon id="end" className="ico" />
          </button>
        </div>
      </div>

      {/* Queue (ordre) */}
      <div className="combat-queue">
        <span className="combat-queue-lbl">ORDRE</span>
        {elfUnits.map(u => {
          const active = selectedUnit?.instanceId === u.instanceId;
          const dead = u.hp <= 0;
          const cls = ['q-port'];
          if (active) cls.push('is-active');
          if (dead) cls.push('is-dead');
          return (
            <div
              key={u.instanceId}
              className={cls.join(' ')}
              style={{ color: 'var(--gold-hi)' }}
            >
              <Icon id={specToIcon(u.spec)} className="ico" style={{ width: 14, height: 14 }} />
            </div>
          );
        })}
        <div className="q-sep"></div>
        {enemyUnits.map(u => {
          const active = selectedUnit?.instanceId === u.instanceId;
          const dead = u.hp <= 0;
          const cls = ['q-port', 'is-enemy'];
          if (active) cls.push('is-active');
          if (dead) cls.push('is-dead');
          return (
            <div
              key={u.instanceId}
              className={cls.join(' ')}
              style={{ color: 'var(--red)' }}
            >
              <Icon id={specToIcon(u.spec) || 'attack'} className="ico" style={{ width: 14, height: 14 }} />
            </div>
          );
        })}
      </div>

      {/* Main : grille + dock */}
      <div className="combat-main">
        <div className="combat-grid-wrap" ref={wrapRef}>
          <div
            id="combat-grid"
            ref={gridRef}
            style={{ gridTemplateColumns: `repeat(${gridCols}, ${tileSize}px)` }}
          >
            {tilesByPos.flatMap((row, y) =>
              row.map((unit, x) => {
                const key = `${x},${y}`;
                const classes = ['tile'];
                if (y >= gridRows - 2) classes.push('zone-elf');

                const isReachable  = overlays.reachableSet.has(key);
                const isAttackable = overlays.attackableSet.has(key);
                const isAttackRange = overlays.attackRangeSet.has(key);
                const isHealRange  = overlays.healSet.has(key);
                const isAoE        = overlays.aoeSet.has(key);
                const isAmbient    = overlays.ambientSet.has(key);

                if (isReachable && !unit) classes.push('reachable');
                if (isAmbient && !unit)   classes.push('ambient-reach');
                if (isAttackRange && !unit) classes.push('attack-range');
                if (isHealRange)            classes.push('heal-range');
                if (isAoE)                  classes.push('aoe-preview');

                let content: React.ReactNode = null;
                if (unit) {
                  classes.push('has-unit');
                  const isElf = unit.team === 'elf';
                  if (isElf) {
                    classes.push(unitClassName(unit.spec));
                  } else {
                    classes.push('unit-enemy');
                  }
                  const isSelected = selectedUnit?.instanceId === unit.instanceId;
                  if (isSelected)    classes.push('selected-unit');
                  if (isAttackable)  classes.push('attackable');
                  if (fx.hitIds.has(unit.instanceId))   classes.push('is-hit');
                  if (fx.movedIds.has(unit.instanceId)) classes.push('is-moved');
                  if (fx.dyingIds.has(unit.instanceId)) classes.push('is-dying');

                  const hpRatio = unit.maxHp > 0 ? Math.max(0, unit.hp / unit.maxHp) : 0;

                  content = (
                    <>
                      {isSelected && <div className="unit-chevron" />}
                      {isSelected && (
                        <div className="ap-dots">
                          {Array.from({ length: unit.maxAp }).map((_, i) => (
                            <span
                              key={i}
                              className={`ap-dot${i >= unit.ap ? ' used' : ''}`}
                            ></span>
                          ))}
                        </div>
                      )}
                      <div
                        className="unit-glyph"
                        style={isElf && unit.imagePath ? {
                          backgroundImage: `url("${unit.imagePath}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center top',
                          width: '100%',
                          height: '100%',
                          margin: 0,
                          borderRadius: 'var(--radius-sm)',
                        } : undefined}
                      >
                        {!isElf && (
                          <span style={{ fontSize: 24 }}>{unit.emoji}</span>
                        )}
                        {isElf && !unit.imagePath && (
                          <Icon id={specToIcon(unit.spec)} />
                        )}
                      </div>
                      <div className="tile-hp">
                        <div
                          style={{
                            width: `${hpRatio * 100}%`,
                            background: isElf ? 'var(--hp)' : 'var(--red)',
                          }}
                        ></div>
                      </div>
                    </>
                  );
                }

                return (
                  <div
                    key={key}
                    className={classes.join(' ')}
                    onClick={() => handleTileClick(x, y)}
                    onMouseEnter={() => handleTileHover(x, y)}
                    onMouseLeave={handleTileLeave}
                    role="button"
                    tabIndex={0}
                  >
                    {content}
                  </div>
                );
              }),
            )}
          </div>
          {/* Popups de dégâts / soin flottants au-dessus de la grille */}
          {popups.map(p => {
            const gap = 2;
            const gridW = gridCols * tileSize + (gridCols - 1) * gap;
            const gridH = gridRows * tileSize + (gridRows - 1) * gap;
            const left = `calc(50% - ${gridW / 2}px + ${p.x * (tileSize + gap) + tileSize / 2}px)`;
            const top  = `calc(50% - ${gridH / 2}px + ${p.y * (tileSize + gap) + 6}px)`;
            const cls = p.kind === 'heal' ? 'dmg-heal'
                      : p.kind === 'crit' ? 'dmg-crit'
                      : 'dmg-enemy';
            const prefix = p.kind === 'heal' ? '+' : p.kind === 'crit' ? '✦ ' : '-';
            return (
              <span
                key={p.id}
                className={`dmg-number ${cls}`}
                style={{ left, top, transform: 'translate(-50%, 0)' }}
              >
                {prefix}{p.amount}
              </span>
            );
          })}
          {/* Particules de combat */}
          {particles.map(p => (
            <div
              key={p.id}
              className={`combat-particle ${p.variant}`}
              style={{
                left: p.left,
                top: p.top,
                ['--pdx' as string]: `${p.dx}px`,
                ['--pdy' as string]: `${p.dy}px`,
              }}
            />
          ))}
          {/* Tooltip preview dégâts */}
          {tooltip && hoveredTile && (
            <div style={{
              position: 'absolute',
              left: `calc(50% - ${(gridCols * (tileSize + 2)) / 2}px + ${hoveredTile.x * (tileSize + 2) + tileSize / 2}px)`,
              top: `calc(50% - ${(gridRows * (tileSize + 2)) / 2}px + ${hoveredTile.y * (tileSize + 2) - 18}px)`,
              transform: 'translateX(-50%)',
              background: 'rgba(8,6,20,0.92)',
              border: '1px solid color-mix(in oklab, var(--gold) 35%, transparent)',
              borderRadius: '3px',
              padding: '2px 6px',
              fontSize: 10,
              color: 'var(--ink)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 50,
            }}>
              {tooltip}
            </div>
          )}
          {/* Bandeau de phase */}
          {phaseBanner && (
            <div className="phase-banner">
              <div className={`phase-banner-inner ${phaseBanner.team}`}>
                {phaseBanner.label}
              </div>
            </div>
          )}
        </div>

        {/* Dock */}
        <div className="combat-dock">
          {selectedUnit ? (
            <SelectedUnitDock
              unit={selectedUnit}
              level={selectedLevel}
              imagePath={heroForSelected?.imagePath}
              pendingAction={combat.pendingAction}
              unlockedAbilities={unlockedAbilities}
              onSetAction={handleSetAction}
              isPendingType={isPendingType}
              isPendingAbility={isPendingAbility}
              logCount={combat.log.length}
            />
          ) : (
            <div className="dock-unit">
              <div className="dock-info">
                <div className="dock-name">Sélectionnez une unité</div>
                <div className="dock-meta">Cliquez sur un héros sur la grille.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bandeau bas */}
      <div className="combat-bottom">
        <Icon id="info" className="ico" style={{ color: 'var(--rune)' }} />
        {hintForState(combat)}
      </div>

      {/* Overlay fin de combat */}
      {combat.isOver && (
        <CombatEndOverlay
          combat={combat}
          onContinue={handleVictoryContinue}
        />
      )}
    </div>
  );
}

/* ============================================
   Sous-composants
   ============================================ */

interface SelectedUnitDockProps {
  unit: Unit;
  level: number;
  imagePath?: string;
  pendingAction: PendingAction | null;
  unlockedAbilities: Array<{ id: string; ability: Ability }>;
  onSetAction: (action: PendingAction | null) => void;
  isPendingType: (t: PendingAction['type']) => boolean;
  isPendingAbility: (id: string) => boolean;
  logCount: number;
}

function SelectedUnitDock({
  unit,
  level,
  imagePath,
  unlockedAbilities,
  onSetAction,
  isPendingType,
  isPendingAbility,
  logCount,
}: SelectedUnitDockProps) {
  const portraitImg = imagePath ?? (unit.team === 'elf' ? unit.imagePath : undefined);
  const hpPct = unit.maxHp > 0 ? Math.round((unit.hp / unit.maxHp) * 100) : 0;
  const mpPct = unit.maxMp > 0 ? Math.round((unit.mp / unit.maxMp) * 100) : 0;
  const klass = unit.spec ? labelForSpec(unit.spec) : 'Combattant';

  const canMove   = unit.ap >= 1;
  const canAttack = unit.ap >= 2;
  const canSpell  = unit.ap >= 2 && unit.mp >= 3;

  const toggle = (action: PendingAction): void => {
    const isCurrent =
      action.type === 'ability'
        ? isPendingAbility(action.abilityId)
        : isPendingType(action.type);
    onSetAction(isCurrent ? null : action);
  };

  return (
    <>
      <div className="dock-unit">
        <div className="dock-portrait is-active">
          {portraitImg ? (
            <img
              src={portraitImg}
              alt={unit.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ color: 'var(--gold-hi)' }}>
              <Icon id={specToIcon(unit.spec)} className="ico" style={{ width: 28, height: 28 }} />
            </div>
          )}
          <div className="class-badge">
            <Icon id={specToIcon(unit.spec)} />
          </div>
        </div>
        <div className="dock-info">
          <div className="dock-name">{unit.name}</div>
          <div className="dock-meta">
            Elfe<span className="sep">·</span>{klass}<span className="sep">·</span>Niv. {level}
          </div>
          <div className="dock-stats">
            <div className="bar-wrap">
              <span className="lbl lbl-hp">PV</span>
              <div className="bar bar--hp">
                <div className="fill" style={{ width: `${hpPct}%` }}></div>
              </div>
              <span className="val">{unit.hp} / {unit.maxHp}</span>
            </div>
            <div className="bar-wrap">
              <span className="lbl lbl-mp">PM</span>
              <div className="bar bar--mp">
                <div className="fill" style={{ width: `${mpPct}%` }}></div>
              </div>
              <span className="val">{unit.mp} / {unit.maxMp}</span>
            </div>
          </div>
          <div className="dock-ap-row">
            <span className="ap-lbl">PA</span>
            {Array.from({ length: unit.maxAp }).map((_, i) => (
              <span key={i} className={`ap-pip${i >= unit.ap ? ' used' : ''}`}></span>
            ))}
          </div>
        </div>
      </div>

      <div className="dock-actions">
        <button
          className={`act-btn${isPendingType('move') ? ' is-active' : ''}`}
          disabled={!canMove || unit.team !== 'elf'}
          onClick={() => toggle({ type: 'move' })}
        >
          <Icon id="move" className="ico" />
          Déplacer<span className="ap-cost">1</span>
        </button>
        <button
          className={`act-btn${isPendingType('attack') ? ' is-active' : ''}`}
          disabled={!canAttack || unit.team !== 'elf'}
          onClick={() => toggle({ type: 'attack' })}
        >
          <Icon id="attack" className="ico" />
          Attaquer<span className="ap-cost">2</span>
        </button>
        <button
          className={`act-btn${isPendingType('spell') ? ' is-active' : ''}`}
          disabled={!canSpell || unit.team !== 'elf'}
          onClick={() => toggle({ type: 'spell' })}
        >
          <Icon id="spell" className="ico" />
          Sort<span className="ap-cost">2</span>
        </button>

        {unlockedAbilities.map(({ id, ability }) => {
          const apCost = ability.apCost ?? 2;
          const mpCost = ability.mpCost ?? 0;
          const passive = (ability.tags ?? []).includes('passive');
          const disabled =
            passive ||
            unit.ap < apCost ||
            (mpCost > 0 && unit.mp < mpCost) ||
            unit.team !== 'elf';
          return (
            <button
              key={id}
              className={`act-btn${isPendingAbility(id) ? ' is-active' : ''}`}
              disabled={disabled}
              title={ability.desc}
              onClick={() => toggle({ type: 'ability', abilityId: id })}
            >
              <span style={{ fontSize: 14 }}>{ability.icon}</span>
              {ability.name}
              <span className="ap-cost">{apCost}</span>
            </button>
          );
        })}

        <button className="dock-log-btn">JOURNAL · {logCount}</button>
      </div>
    </>
  );
}

interface CombatEndOverlayProps {
  combat: CombatState;
  onContinue: () => void;
}

function CombatEndOverlay({ combat, onContinue }: CombatEndOverlayProps) {
  const victory = combat.winner === 'elf';
  const title = victory ? 'Victoire !' : 'Défaite...';
  const reward = combat.floorConfig.reward ?? {};
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(8, 6, 14, 0.78)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 50,
      }}
    >
      <div
        style={{
          fontSize: 28,
          color: victory ? 'var(--gold-hi)' : 'var(--red)',
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        {title}
      </div>
      {victory && (
        <div style={{ display: 'flex', gap: 18, color: 'var(--ink)' }}>
          {reward.gold ? (
            <span>
              <Icon id="coin" className="ico" /> +{reward.gold}
            </span>
          ) : null}
          {reward.orbs ? (
            <span>
              <Icon id="orb" className="ico" /> +{reward.orbs}
            </span>
          ) : null}
          {reward.xp ? <span>+{reward.xp} XP</span> : null}
        </div>
      )}
      {!victory && (
        <div style={{ color: 'var(--ink-dim)', maxWidth: 280, textAlign: 'center' }}>
          Les ténèbres ont eu raison de ton équipe. Renforce tes héros au marché ou à la guilde.
        </div>
      )}
      <button className="bk" onClick={onContinue}>
        Continuer
      </button>
    </div>
  );
}

/* ============================================
   Utilitaires
   ============================================ */

function labelForSpec(spec: string): string {
  switch (spec) {
    case 'guerrier':  return 'Guerrier';
    case 'archer':    return 'Archère';
    case 'explorer':  return 'Exploratrice';
    case 'offensive': return 'Mage';
    case 'guardian':  return 'Protecteur';
    case 'spy':       return 'Espion';
    case 'healer':    return 'Soigneur';
    case 'monk':      return 'Moine';
    case 'bard':      return 'Barde';
    case 'entrave':   return 'Entrave';
    default:          return 'Combattant';
  }
}

function toRoman(n: number): string {
  if (n <= 0) return '—';
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let rem = n;
  for (const [val, sym] of table) {
    while (rem >= val) {
      result += sym;
      rem -= val;
    }
  }
  return result;
}

function hintForState(combat: CombatState): string {
  if (combat.isOver) {
    return combat.winner === 'elf' ? 'Combat terminé : victoire.' : 'Combat terminé : défaite.';
  }
  if (combat.phase === 'enemy') return 'Phase ennemie : les ténèbres avancent.';
  if (!combat.selectedId) return 'Sélectionne un de tes héros sur la grille.';
  if (!combat.pendingAction) return 'Choisis une action dans le panneau du bas.';
  switch (combat.pendingAction.type) {
    case 'move':    return 'Choisis une case bleutée pour te déplacer.';
    case 'attack':  return 'Choisis un ennemi à portée pour attaquer.';
    case 'spell':   return 'Choisis un ennemi à portée pour ton sort.';
    case 'ability': return 'Choisis une cible pour ta compétence.';
  }
}

