import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CardInstance, GameState, LaneIndex, Side } from './state/types';
import { CARD_INDEX } from './data/cards';
import { THREAT_INDEX } from './data/threats';
import {
  createInitialState,
  effectiveForce,
  endPlayerTurn,
  nextRound,
  playCharacter,
  playSortilege,
  resolveCombat,
} from './logic/engine';
import { runAiTurn } from './logic/ai/sylvie';
import { CardView } from './components/CardView';
import { ChampionView } from './components/ChampionView';

type Selection =
  | { kind: 'character'; instId: string }
  | { kind: 'sort_buff'; instId: string }
  | { kind: 'sort_kill'; instId: string }
  | null;

export function Game() {
  const [state, setState] = useState<GameState | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [showLore, setShowLore] = useState(false);

  const start = useCallback(() => {
    setState(createInitialState());
    setSelection(null);
  }, []);

  const apply = useCallback((mutator: (s: GameState) => void) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev) as GameState;
      mutator(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    if (state.phase !== 'ai' || state.winner) return;
    const t = setTimeout(() => {
      apply((s) => {
        runAiTurn(s);
        resolveCombat(s);
        if (!s.winner) {
          nextRound(s);
        }
      });
    }, 700);
    return () => clearTimeout(t);
  }, [state, apply]);

  if (!state) return <IntroScreen onStart={start} />;

  const handleEndTurn = () => {
    setSelection(null);
    apply((s) => endPlayerTurn(s));
  };

  const handleHandClick = (card: CardInstance) => {
    if (state.phase !== 'player') return;
    const def = CARD_INDEX[card.defId];
    if (!def) return;
    if (state.player.energy < def.cost) return;

    if (def.kind === 'personnage') {
      setSelection({ kind: 'character', instId: card.instId });
      return;
    }
    if (def.effect?.type === 'heal') {
      apply((s) => { playSortilege(s, 'player', card.instId); });
      setSelection(null);
      return;
    }
    if (def.effect?.type === 'buff') {
      setSelection({ kind: 'sort_buff', instId: card.instId });
      return;
    }
    if (def.effect?.type === 'kill_weakest') {
      setSelection({ kind: 'sort_kill', instId: card.instId });
      return;
    }
  };

  const handleLaneClick = (side: Side, lane: LaneIndex) => {
    if (state.phase !== 'player' || !selection) return;

    if (selection.kind === 'character' && side === 'player') {
      apply((s) => { playCharacter(s, 'player', selection.instId, lane); });
      setSelection(null);
      return;
    }
    if (selection.kind === 'sort_kill' && side === 'ai') {
      apply((s) => { playSortilege(s, 'player', selection.instId, { kind: 'enemy_lane', lane }); });
      setSelection(null);
      return;
    }
  };

  const handleOwnCardClick = (instId: string) => {
    if (!selection || selection.kind !== 'sort_buff') return;
    apply((s) => { playSortilege(s, 'player', selection.instId, { kind: 'own_card', instId }); });
    setSelection(null);
  };

  const restart = () => { setState(createInitialState()); setSelection(null); };

  return (
    <div className="strat-root">
      <div className="strat-topbar">
        <a className="strat-back" href="/">← Arcade FM</a>
        <div className="strat-title">Stratagème</div>
        <div className="strat-actions">
          <button className="strat-btn-ghost" onClick={() => setShowLore((v) => !v)}>
            {showLore ? 'Masquer lore' : '📖 Lore'}
          </button>
          <button className="strat-btn-ghost" onClick={restart}>Recommencer</button>
        </div>
      </div>

      <div className="strat-board">
        <ChampionView player={state.ai} side="ai" isActive={state.phase === 'ai'} />

        <div className="strat-hand strat-hand-ai">
          {state.ai.hand.map((c) => (
            <CardView key={c.instId} card={c} faceDown compact />
          ))}
        </div>

        <Lanes
          state={state}
          selection={selection}
          showLore={showLore}
          onLaneClick={handleLaneClick}
          onOwnCardClick={handleOwnCardClick}
        />

        <div className="strat-hand strat-hand-player">
          {state.player.hand.map((c) => {
            const def = CARD_INDEX[c.defId];
            const playable = state.phase === 'player' && def && state.player.energy >= def.cost;
            const selected = selection && 'instId' in selection && selection.instId === c.instId;
            return (
              <CardView
                key={c.instId}
                card={c}
                disabled={!playable}
                selected={!!selected}
                showLore={showLore}
                onClick={() => handleHandClick(c)}
              />
            );
          })}
          {state.player.hand.length === 0 && <div className="strat-empty-hand">Main vide.</div>}
        </div>

        <ChampionView player={state.player} side="player" isActive={state.phase === 'player'} />

        <div className="strat-side-panel">
          <div className="strat-turn-badge">Tour {state.turn} · {state.phase === 'player' ? 'à toi' : state.phase === 'ai' ? 'Sylvie joue' : state.phase === 'over' ? 'fini' : 'résolution'}</div>
          <button
            className="strat-btn-primary"
            onClick={handleEndTurn}
            disabled={state.phase !== 'player'}
          >
            Fin du tour
          </button>
          {selection && (
            <div className="strat-hint">
              {selection.kind === 'character' && 'Clique une lane de ton côté.'}
              {selection.kind === 'sort_buff' && 'Clique un de tes personnages.'}
              {selection.kind === 'sort_kill' && 'Clique une lane adverse.'}
              <button className="strat-btn-mini" onClick={() => setSelection(null)}>Annuler</button>
            </div>
          )}
          <LogPanel state={state} />
        </div>
      </div>

      {state.winner && (
        <EndOverlay winner={state.winner} onRestart={restart} />
      )}
    </div>
  );
}

function Lanes({
  state, selection, showLore, onLaneClick, onOwnCardClick,
}: {
  state: GameState;
  selection: Selection;
  showLore: boolean;
  onLaneClick: (side: Side, lane: LaneIndex) => void;
  onOwnCardClick: (instId: string) => void;
}) {
  const lanes: LaneIndex[] = [0, 1, 2];
  return (
    <div className="strat-lanes">
      {lanes.map((i) => {
        const enemyCard = state.ai.lanes[i][0];
        const ownCard = state.player.lanes[i][0];

        const enemyLaneActive = selection?.kind === 'sort_kill';
        const ownLaneActive = selection?.kind === 'character' && !ownCard;

        return (
          <div key={i} className="strat-lane">
            <button
              type="button"
              className={`strat-lane-slot strat-lane-slot-ai ${enemyLaneActive ? 'is-targetable' : ''}`}
              onClick={() => enemyLaneActive && onLaneClick('ai', i)}
              disabled={!enemyLaneActive}
            >
              {enemyCard ? (
                <CardView card={enemyCard} effectiveForce={effectiveForce(enemyCard, state.ai)} showLore={showLore} />
              ) : (
                <span className="strat-lane-empty">·</span>
              )}
            </button>

            <div className="strat-lane-center">
              <span className="strat-lane-num">Lane {i + 1}</span>
              {i === 1 && (
                <div className="strat-threats-strip">
                  {state.threats.map((t, idx) => t && (
                    <div key={idx} className="strat-threat-mini" title={THREAT_INDEX[t.defId]?.lore ?? ''}>
                      ⚔ {THREAT_INDEX[t.defId]?.name ?? '?'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className={`strat-lane-slot strat-lane-slot-player ${ownLaneActive ? 'is-targetable' : ''}`}
              onClick={() => {
                if (ownCard && selection?.kind === 'sort_buff') {
                  onOwnCardClick(ownCard.instId);
                } else if (ownLaneActive) {
                  onLaneClick('player', i);
                }
              }}
              disabled={!ownLaneActive && !(ownCard && selection?.kind === 'sort_buff')}
            >
              {ownCard ? (
                <CardView card={ownCard} effectiveForce={effectiveForce(ownCard, state.player)} showLore={showLore} />
              ) : (
                <span className="strat-lane-empty">·</span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function LogPanel({ state }: { state: GameState }) {
  const recent = useMemo(() => state.log.slice(-6).reverse(), [state.log]);
  return (
    <div className="strat-log">
      {recent.map((e, i) => (
        <div key={i} className="strat-log-line">{e.text}</div>
      ))}
    </div>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="strat-intro">
      <div className="strat-intro-card">
        <a className="strat-back" href="/">← Arcade FM</a>
        <h1 className="strat-intro-title">Stratagème</h1>
        <div className="strat-intro-sub">Duel d'Achronia · le jeu de cartes de Sylvie</div>
        <p className="strat-intro-text">
          À bord de l'Éclatmaris, Sylvie joue au Stratagème, le jeu de cartes que lui a appris son père Skarn.
          Trois lanes, deux Champions, un objectif : abattre l'autre.
        </p>
        <p className="strat-intro-text">
          Pose un personnage dans une lane, lance un sortilège, finis ton tour. Le plus fort de chaque lane
          inflige sa différence de Force au Champion adverse. Premier à 0 PV, perdu.
        </p>
        <button className="strat-btn-primary strat-btn-big" onClick={onStart}>Affronter Sylvie</button>
        <div className="strat-intro-lore">
          Tiré du roman <a href="https://elfes.fmenguy.fr/tome2" target="_blank" rel="noreferrer">Sylvie et la Fracture Galactique</a>.
        </div>
      </div>
    </div>
  );
}

function EndOverlay({ winner, onRestart }: { winner: 'player' | 'ai'; onRestart: () => void }) {
  return (
    <div className="strat-end-overlay">
      <div className="strat-end-card">
        <div className="strat-end-title">{winner === 'player' ? 'Victoire' : 'Défaite'}</div>
        <p className="strat-end-text">
          {winner === 'player'
            ? "Sylvie pose ses cartes en souriant. Skarn aurait été fier."
            : "Sylvie ramasse les cartes. Tu reprendras une partie."}
        </p>
        <button className="strat-btn-primary" onClick={onRestart}>Rejouer</button>
      </div>
    </div>
  );
}
