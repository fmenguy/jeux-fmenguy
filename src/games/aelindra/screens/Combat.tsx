/* ============================================
   AELINDRA · screens/Combat.tsx
   Écran 04 : Grille de combat tactique
   ============================================ */

import React from 'react';
import { Icon } from '../components/Icons';

/* ---------- Types internes ---------- */

type CellKind = 'elf' | 'enemy';

interface UnitCell {
  kind: CellKind;
  cls: string;
  hp: number;
  sel?: boolean;
  targetable?: boolean;
}

type GridCell = UnitCell | 'reach' | 'preview' | null;

/* ---------- Helper : génération de la grille ---------- */

function makeCombatGrid(cols: number, rows: number): GridCell[][] {
  const grid: GridCell[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

  const elfClasses = ['archer', 'warrior', 'mage', 'guardian'];
  let elfPositions: [number, number][];

  if (cols >= 5) {
    elfPositions = [
      [1, rows - 1],
      [0, rows - 2],
      [cols - 2, rows - 1],
      [cols - 1, rows - 2],
    ];
  } else if (cols === 4) {
    elfPositions = [
      [0, rows - 1],
      [1, rows - 2],
      [3, rows - 1],
      [2, rows - 2],
    ];
  } else {
    elfPositions = [
      [0, rows - 1],
      [1, rows - 1],
      [2, rows - 1],
      [1, rows - 2],
    ];
  }

  elfPositions.forEach(([x, y], i) => {
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      grid[y][x] = { kind: 'elf', cls: elfClasses[i], hp: i === 1 ? 0.85 : 1, sel: i === 0 };
    }
  });

  const enemies: Omit<UnitCell, 'kind'>[] = [
    { cls: 'spy',      hp: 0.8 },
    { cls: 'warrior',  hp: 1 },
    { cls: 'guardian', hp: 0.95 },
  ];
  const cMid = Math.floor(cols / 2);
  const enemyPositions: [number, number][] = [
    [Math.max(0, cMid - 1), 0],
    [Math.min(cols - 1, cMid + 1), 0],
    [cMid, 1],
  ];

  enemyPositions.forEach(([x, y], i) => {
    if (x >= 0 && x < cols && y >= 0 && y < rows && !grid[y][x]) {
      grid[y][x] = { kind: 'enemy', ...enemies[i] };
    }
  });

  const [sx, sy] = elfPositions[0];
  const reach: [number, number][] = [
    [sx - 1, sy],
    [sx + 1, sy],
    [sx, sy - 1],
    [sx - 1, sy - 1],
    [sx + 1, sy - 1],
  ];
  reach.forEach(([x, y]) => {
    if (x >= 0 && x < cols && y >= 0 && y < rows && !grid[y][x]) {
      grid[y][x] = 'reach';
    }
  });

  const midY = Math.floor(rows * 0.45);
  if (midY >= 0 && midY < rows && sx >= 0 && sx < cols && !grid[midY][sx]) {
    grid[midY][sx] = 'preview';
  }
  if (midY - 1 >= 0 && sx >= 0 && sx < cols && !grid[midY - 1][sx]) {
    grid[midY - 1][sx] = 'preview';
  }

  const [ex, ey] = enemyPositions[0];
  const hitCell = grid[ey][ex];
  if (hitCell && typeof hitCell === 'object') {
    (hitCell as UnitCell).targetable = true;
  }

  return grid;
}

/* ---------- CombatTile ---------- */

interface CombatTileProps {
  cell: GridCell;
  x: number;
  y: number;
  rows: number;
}

function CombatTile({ cell, x, y, rows }: CombatTileProps) {
  const classes = ['tile'];
  let content: React.ReactNode = null;

  if (cell === 'reach') classes.push('reachable');
  if (cell === 'preview') classes.push('range-preview');

  if (y >= rows - 2) classes.push('zone-elf');

  if (cell && typeof cell === 'object') {
    classes.push('has-unit');
    const isElf = cell.kind === 'elf';
    classes.push(isElf ? `unit-${cell.cls}` : 'unit-enemy');
    if (cell.sel) classes.push('selected-unit');
    if (cell.targetable) classes.push('attackable');

    content = (
      <>
        {cell.sel && (
          <div className="ap-dots">
            <span className="ap-dot"></span>
            <span className="ap-dot"></span>
            <span className="ap-dot used"></span>
          </div>
        )}
        <div className="unit-glyph">
          <Icon id={cell.cls} />
        </div>
        <div className="tile-hp">
          <div
            style={{
              width: `${cell.hp * 100}%`,
              background: isElf ? 'var(--hp)' : 'var(--red)',
            }}
          ></div>
        </div>
      </>
    );
  }

  return <div className={classes.join(' ')}>{content}</div>;
}

/* ---------- ScrCombat ---------- */

interface CombatProps {
  cols?: number;
  rows?: number;
  tileSize?: number;
  onEnd?: () => void;
}

export function Combat({ cols = 3, rows = 8, tileSize = 72, onEnd }: CombatProps) {
  const grid = React.useMemo(() => makeCombatGrid(cols, rows), [cols, rows]);

  return (
    <div className="scr on" id="s-combat">
      <div className="combat-topbar">
        <div className="combat-turn-info">
          <span className="turn-n">III</span> TOUR
        </div>
        <div className="combat-phase">phase elfique</div>
        <button
          className="bk"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={onEnd}
        >
          FIN <Icon id="end" className="ico" />
        </button>
      </div>

      <div className="combat-queue">
        <span className="combat-queue-lbl">ORDRE</span>
        <div className="q-port is-active" style={{ color: 'var(--gold-hi)' }}>
          <Icon id="archer" className="ico" style={{ width: 14, height: 14 }} />
        </div>
        <div className="q-port">
          <Icon id="warrior" className="ico" style={{ width: 14, height: 14 }} />
        </div>
        <div className="q-port">
          <Icon id="mage" className="ico" style={{ width: 14, height: 14 }} />
        </div>
        <div className="q-port">
          <Icon id="guardian" className="ico" style={{ width: 14, height: 14 }} />
        </div>
        <div className="q-sep"></div>
        <div className="q-port is-enemy" style={{ color: 'var(--red)' }}>
          <Icon id="spy" className="ico" style={{ width: 14, height: 14 }} />
        </div>
        <div className="q-port is-enemy" style={{ color: 'var(--red)' }}>
          <Icon id="warrior" className="ico" style={{ width: 14, height: 14 }} />
        </div>
        <div className="q-port is-enemy is-dead" style={{ color: 'var(--red)' }}>
          <Icon id="guardian" className="ico" style={{ width: 14, height: 14 }} />
        </div>
      </div>

      <div className="combat-main">
        <div className="combat-grid-wrap">
          <div
            id="combat-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, ${tileSize}px)` }}
          >
            {grid.flatMap((row, y) =>
              row.map((cell, x) => (
                <CombatTile key={`${x}-${y}`} cell={cell} x={x} y={y} rows={rows} />
              ))
            )}
          </div>
          <div className="tip" style={{ top: 64, right: 12 }}>
            <div className="tip-title">RAT D'OMBRE · NIV. 2</div>
            <div className="tip-row">
              <span>Dégâts</span>
              <span className="v">18 – 24</span>
            </div>
            <div className="tip-row">
              <span>Critique</span>
              <span className="v v--crit">×1.75</span>
            </div>
            <div className="tip-row">
              <span>Portée</span>
              <span className="v">4 cases</span>
            </div>
          </div>
        </div>

        <div className="combat-dock">
          <div className="dock-unit">
            <div className="dock-portrait is-active">
              <div style={{ color: 'var(--gold-hi)' }}>
                <Icon id="archer" className="ico" style={{ width: 28, height: 28 }} />
              </div>
              <div className="class-badge">
                <Icon id="archer" />
              </div>
            </div>
            <div className="dock-info">
              <div className="dock-name">Aeris Ventpâle</div>
              <div className="dock-meta">
                Elfe<span className="sep">·</span>Archère<span className="sep">·</span>Niv. 3
              </div>
              <div className="dock-stats">
                <div className="bar-wrap">
                  <span className="lbl lbl-hp">PV</span>
                  <div className="bar bar--hp">
                    <div className="fill" style={{ width: '100%' }}></div>
                  </div>
                  <span className="val">101</span>
                </div>
                <div className="bar-wrap">
                  <span className="lbl lbl-mp">PM</span>
                  <div className="bar bar--mp">
                    <div className="fill" style={{ width: '82%' }}></div>
                  </div>
                  <span className="val">62</span>
                </div>
              </div>
              <div className="dock-ap-row">
                <span className="ap-lbl">PA</span>
                <span className="ap-pip"></span>
                <span className="ap-pip"></span>
                <span className="ap-pip used"></span>
              </div>
            </div>
          </div>

          <div className="dock-actions">
            <button className="act-btn is-active">
              <Icon id="move" className="ico" />
              Déplacer<span className="ap-cost">1</span>
            </button>
            <button className="act-btn">
              <Icon id="attack" className="ico" />
              Attaquer<span className="ap-cost">2</span>
            </button>
            <button className="act-btn">
              <Icon id="spell" className="ico" />
              Sort<span className="ap-cost">2</span>
            </button>
            <button className="dock-log-btn">JOURNAL · 12</button>
          </div>
        </div>
      </div>

      <div className="combat-bottom">
        <Icon id="info" className="ico" style={{ color: 'var(--rune)' }} />
        Choisis une case bleutée pour déplacer Aeris.
      </div>
    </div>
  );
}
