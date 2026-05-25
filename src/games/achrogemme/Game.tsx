import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CardInstance, GameState, LaneIndex, Side, SlotIndex } from './state/types';
import { CLASSES, LANE_TO_CLASSE } from './data/classes';
import { CARD_INDEX } from './data/cards';
import {
  allowedLane,
  beginAiTurn,
  createInitialState,
  effectiveAtq,
  effectivePvMax,
  endPlayerTurn,
  nextRound,
  playCharacter,
  playSortilege,
  resolveCombat,
} from './logic/engine';
import { runAiTurn } from './logic/ai/sylvie';
import { CardView } from './components/CardView';
import { ChampionView } from './components/ChampionView';
import { SynergyBar } from './components/SynergyBar';
import { IntroScreen } from './components/IntroScreen';
import { Tutorial } from './components/Tutorial';
import { OptionsMenu } from './components/OptionsMenu';
import { LoreScreen } from './components/LoreScreen';
import { DeckBuilder } from './components/DeckBuilder';
import { RewardScreen } from './components/RewardScreen';
import { recordResult } from './data/collection';

const TUTO_STORAGE_KEY = 'achrogemme_tutorial_seen_v1';
const PLAYER_NAME_STORAGE_KEY = 'achrogemme_player_name_v1';

function readStoredName(): string | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
  return v && v.trim().length > 0 ? v : null;
}

function applyPlayerName(state: GameState, name: string | null) {
  if (name) {
    state.player.champion = { ...state.player.champion, name };
  }
}

type Selection =
  | { kind: 'character'; instId: string; lane: LaneIndex }
  | { kind: 'sort_kill'; instId: string }
  | { kind: 'sort_damage_lane'; instId: string }
  | { kind: 'sort_buff_lane'; instId: string }
  | null;

const ROW_LABEL_BY_SLOT: Record<SlotIndex, string> = {
  0: 'avant',
  1: 'milieu',
  2: 'arrière',
};

const ROW_TAG_BY_SLOT: Record<SlotIndex, 'front' | 'middle' | 'back'> = {
  0: 'front',
  1: 'middle',
  2: 'back',
};

const CLASSES_ORDER: LaneIndex[] = [0, 1, 2];

export function Game() {
  const [state, setState] = useState<GameState | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [showLore, setShowLore] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [showDeck, setShowDeck] = useState(false);
  const [reward, setReward] = useState<{ victory: boolean } | null>(null);
  const [resultRecorded, setResultRecorded] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(readStoredName);

  const start = useCallback(() => {
    const initial = createInitialState('sylvie');
    applyPlayerName(initial, readStoredName());
    setState(initial);
    setSelection(null);
    if (typeof window !== 'undefined' && !localStorage.getItem(TUTO_STORAGE_KEY)) {
      setShowTutorial(true);
    }
  }, []);

  const closeTutorial = useCallback((name?: string) => {
    setShowTutorial(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TUTO_STORAGE_KEY, '1');
      if (name) {
        localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
        setPlayerName(name);
        setState((prev) => {
          if (!prev) return prev;
          const next = structuredClone(prev) as GameState;
          applyPlayerName(next, name);
          return next;
        });
      }
    }
  }, []);

  const openTutorial = useCallback(() => setShowTutorial(true), []);

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
        beginAiTurn(s);
        runAiTurn(s);
        resolveCombat(s);
        if (!s.winner) nextRound(s);
      });
    }, 700);
    return () => clearTimeout(t);
  }, [state, apply]);

  const handleEndTurn = useCallback(() => {
    if (!state || state.phase !== 'player' || state.winner) return;
    setSelection(null);
    apply((s) => endPlayerTurn(s));
  }, [state, apply]);

  const restart = useCallback(() => {
    const fresh = createInitialState('sylvie');
    applyPlayerName(fresh, playerName);
    setState(fresh);
    setSelection(null);
    setReward(null);
    setResultRecorded(false);
  }, [playerName]);

  useEffect(() => {
    if (!state || !state.winner || resultRecorded) return;
    const isVictory = state.winner === 'player';
    recordResult(isVictory);
    setResultRecorded(true);
    setReward({ victory: isVictory });
  }, [state, resultRecorded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showTutorial) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const key = e.key.toLowerCase();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEndTurn();
      } else if (e.key === 'Escape') {
        setSelection(null);
      } else if (key === 'h') {
        e.preventDefault();
        setShowTutorial(true);
      } else if (key === 'n') {
        e.preventDefault();
        restart();
      } else if (key === 'l') {
        e.preventDefault();
        setShowLore((v) => !v);
      } else if (key === 'c') {
        e.preventDefault();
        setShowCodex(true);
      } else if (key === 'd') {
        e.preventDefault();
        setShowDeck(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTutorial, handleEndTurn, restart]);

  if (!state) return <IntroScreen onStart={start} />;

  const handleHandClick = (card: CardInstance) => {
    if (state.phase !== 'player') return;
    const def = CARD_INDEX[card.defId];
    if (!def) return;
    if (state.player.pa < def.cost) return;

    if (def.kind === 'personnage') {
      const lane = allowedLane(def);
      if (lane === null) return;
      if (selection && 'instId' in selection && selection.instId === card.instId) {
        setSelection(null);
        return;
      }
      setSelection({ kind: 'character', instId: card.instId, lane });
      return;
    }

    const sort = def.sortilege;
    if (!sort) return;
    if (sort.kind === 'heal_champion') {
      apply((s) => { playSortilege(s, 'player', card.instId); });
      setSelection(null);
      return;
    }
    if (sort.kind === 'kill_target') {
      setSelection({ kind: 'sort_kill', instId: card.instId });
      return;
    }
    if (sort.kind === 'damage_lane') {
      setSelection({ kind: 'sort_damage_lane', instId: card.instId });
      return;
    }
    if (sort.kind === 'buff_atq_lane') {
      setSelection({ kind: 'sort_buff_lane', instId: card.instId });
      return;
    }
  };

  const handleSlotClick = (side: Side, lane: LaneIndex, slot: SlotIndex) => {
    if (state.phase !== 'player' || !selection) return;
    if (selection.kind === 'character' && side === 'player' && lane === selection.lane) {
      apply((s) => { playCharacter(s, 'player', selection.instId, slot); });
      setSelection(null);
      return;
    }
    if (selection.kind === 'sort_kill' && side === 'ai') {
      const target = state.ai.lanes[lane][slot];
      if (!target) return;
      apply((s) => { playSortilege(s, 'player', selection.instId, { kind: 'enemy_unit', lane, slot }); });
      setSelection(null);
      return;
    }
  };

  const handleLaneClick = (side: Side, lane: LaneIndex) => {
    if (state.phase !== 'player' || !selection) return;
    if (selection.kind === 'sort_damage_lane' && side === 'ai') {
      apply((s) => { playSortilege(s, 'player', selection.instId, { kind: 'enemy_lane', lane }); });
      setSelection(null);
      return;
    }
    if (selection.kind === 'sort_buff_lane' && side === 'player') {
      apply((s) => { playSortilege(s, 'player', selection.instId, { kind: 'own_lane', lane }); });
      setSelection(null);
      return;
    }
  };

  const renderSlot = (side: Side, lane: LaneIndex, slot: SlotIndex, gridRow: number, gridColumn: number) => {
    const u = state[side].lanes[lane][slot];

    const charSlotTargetable =
      side === 'player' &&
      selection?.kind === 'character' &&
      selection.lane === lane &&
      !u;
    const killTargetable = side === 'ai' && selection?.kind === 'sort_kill' && !!u;
    const laneSlotTargetable =
      (side === 'ai' && selection?.kind === 'sort_damage_lane') ||
      (side === 'player' && selection?.kind === 'sort_buff_lane');
    const popSide = gridColumn === 3 ? 'left' : 'right';

    return (
      <div
        key={`${side}-${lane}-${slot}`}
        className="ach-slot"
        data-row={ROW_TAG_BY_SLOT[slot]}
        data-row-label={ROW_LABEL_BY_SLOT[slot]}
        data-empty={u ? '0' : '1'}
        data-droptarget={charSlotTargetable || killTargetable || laneSlotTargetable ? '1' : '0'}
        style={{ gridRow, gridColumn }}
        onClick={(e) => {
          if (charSlotTargetable || killTargetable) {
            e.stopPropagation();
            handleSlotClick(side, lane, slot);
          } else if (laneSlotTargetable) {
            e.stopPropagation();
            handleLaneClick(side, lane);
          }
        }}
      >
        {u && (
          <>
            <CardView
              card={u}
              onBoard
              interactive={false}
              playable
              effectiveAtq={effectiveAtq(u, state[side])}
              effectivePvMax={effectivePvMax(u, state[side])}
              showLore={showLore}
            />
            <div className="ach-slot__popover" data-pop-side={popSide}>
              <CardView
                card={u}
                interactive={false}
                playable
                effectiveAtq={effectiveAtq(u, state[side])}
                effectivePvMax={effectivePvMax(u, state[side])}
                showLore={showLore}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const colHead = (lane: LaneIndex, gridColumn: number) => {
    const c = LANE_TO_CLASSE[lane];
    const label = `${{ sylvestre: '🏹', arcanique: '✨', rempart: '⚔' }[c]} ${CLASSES[c].name}`;
    return (
      <div
        key={`head-${lane}`}
        className="ach-board__col-head"
        data-class={c}
        style={{ gridRow: 3, gridColumn }}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="ach-root">
      <a className="ach-back-top" href="/" title="Retour Arcade FM">← Arcade FM</a>
      <div className="ach-board-stage">
        <div className="ach-board" style={{ ['--ach-anim-density' as string]: 1 }}>
          <div className="ach-board__playzone">
            <div className="ach-board__champion-row" style={{ gridRow: 1 }}>
              <ChampionView player={state.ai} side="ai" isActive={state.phase === 'ai'} accent="sylvestre" />
            </div>

            <div style={{ gridRow: 2, gridColumn: '1 / -1' }}>
              <SynergyBar state={state} side="ai" />
            </div>

            {CLASSES_ORDER.map((lane, idx) => {
              const c = LANE_TO_CLASSE[lane];
              const ownLaneTargetable = selection?.kind === 'sort_buff_lane';
              const enemyLaneTargetable = selection?.kind === 'sort_damage_lane';
              return (
                <div
                  key={`bg-${lane}`}
                  className={`ach-board__col-bg ${enemyLaneTargetable || ownLaneTargetable ? 'is-lane-target' : ''}`}
                  data-class={c}
                  style={{ ['--col' as string]: idx + 1, gridColumn: idx + 1 }}
                  onClick={() => {
                    if (enemyLaneTargetable) handleLaneClick('ai', lane);
                    else if (ownLaneTargetable) handleLaneClick('player', lane);
                  }}
                />
              );
            })}
            {CLASSES_ORDER.map((lane, idx) => colHead(lane, idx + 1))}

            {CLASSES_ORDER.map((lane, idx) => renderSlot('ai', lane, 2, 4, idx + 1))}
            {CLASSES_ORDER.map((lane, idx) => renderSlot('ai', lane, 1, 5, idx + 1))}
            {CLASSES_ORDER.map((lane, idx) => renderSlot('ai', lane, 0, 6, idx + 1))}

            <div className="ach-board__center-rule" style={{ gridRow: 7, gridColumn: '1 / -1' }} />

            {CLASSES_ORDER.map((lane, idx) => renderSlot('player', lane, 0, 8, idx + 1))}
            {CLASSES_ORDER.map((lane, idx) => renderSlot('player', lane, 1, 9, idx + 1))}
            {CLASSES_ORDER.map((lane, idx) => renderSlot('player', lane, 2, 10, idx + 1))}

            <div style={{ gridRow: 11, gridColumn: '1 / -1' }}>
              <SynergyBar state={state} side="player" />
            </div>

            <div className="ach-board__champion-row" style={{ gridRow: 12 }}>
              <ChampionView player={state.player} side="player" isActive={state.phase === 'player'} accent="rempart" />
            </div>

            <div className="ach-board__hand" style={{ gridRow: 13 }}>
              {state.player.hand.map((c) => {
                const def = CARD_INDEX[c.defId];
                const playable = state.phase === 'player' && def && state.player.pa >= def.cost;
                const isSelected = !!(selection && 'instId' in selection && selection.instId === c.instId);
                return (
                  <CardView
                    key={c.instId}
                    card={c}
                    interactive
                    playable={!!playable}
                    selected={isSelected}
                    disabled={!playable}
                    showLore={showLore}
                    onClick={() => handleHandClick(c)}
                  />
                );
              })}
              {state.player.hand.length === 0 && <div className="ach-empty-hand">Main vide.</div>}
            </div>
          </div>

          <div className="ach-board__side">
            <div className="ach-side__title">Achrogemme</div>

            <div className="ach-side__turn">
              <span>Tour</span>
              <b>{state.turn}</b>
            </div>

            <button
              className="ach-side__btn"
              onClick={handleEndTurn}
              disabled={state.phase !== 'player'}
            >
              Fin du tour
            </button>

            <button
              className="ach-side__btn ach-side__btn--ghost"
              onClick={restart}
              disabled={state.phase === 'ai' && !state.winner}
            >
              Nouvelle partie
            </button>

            {selection && (
              <div className="ach-side__hint">
                {selection.kind === 'character' && `Clique un slot vide en ${CLASSES[LANE_TO_CLASSE[selection.lane]].name}.`}
                {selection.kind === 'sort_kill' && 'Clique une unité adverse.'}
                {selection.kind === 'sort_damage_lane' && 'Clique une Marche adverse.'}
                {selection.kind === 'sort_buff_lane' && 'Clique une de tes Marches.'}
                <button className="ach-side__btn-ghost-mini" onClick={() => setSelection(null)}>annuler</button>
              </div>
            )}

            <LogPanel state={state} />
          </div>
        </div>
      </div>

      <OptionsMenu
        onShowTutorial={openTutorial}
        onShowCodex={() => setShowCodex(true)}
        onShowDeck={() => setShowDeck(true)}
        onToggleLore={() => setShowLore((v) => !v)}
        onRestart={restart}
        showLore={showLore}
      />

      {showTutorial && <Tutorial onClose={closeTutorial} />}
      {showCodex && <LoreScreen onClose={() => setShowCodex(false)} />}
      {showDeck && <DeckBuilder onClose={() => setShowDeck(false)} />}
      {reward && (
        <RewardScreen
          victory={reward.victory}
          onClose={() => setReward(null)}
        />
      )}

      {state.winner && !reward && <EndOverlay winner={state.winner} onRestart={restart} />}
    </div>
  );
}

function LogPanel({ state }: { state: GameState }) {
  const recent = useMemo(() => state.log.slice(-12).reverse(), [state.log]);
  return (
    <div className="ach-side__log">
      {recent.map((e, i) => (
        <div key={i} className={`ach-log-line ach-log-line--${e.phase ?? 'info'}`}>
          {e.phase && <span className="ach-log-phase-tag">{phaseTag(e.phase)}</span>}
          {e.text}
        </div>
      ))}
    </div>
  );
}

function phaseTag(p: string): string {
  if (p === 'tir') return '🏹';
  if (p === 'combat') return '⚔';
  if (p === 'magie') return '✨';
  if (p === 'mort') return '☠';
  if (p === 'sort') return '✦';
  if (p === 'pose') return '◆';
  if (p === 'debordement') return '➤';
  return '·';
}

function EndOverlay({ winner, onRestart }: { winner: 'player' | 'ai'; onRestart: () => void }) {
  return (
    <div className="ach-end-overlay">
      <div className="ach-end-card">
        <div className="ach-end-title">{winner === 'player' ? 'Victoire' : 'Défaite'}</div>
        <p className="ach-end-text">
          {winner === 'player'
            ? "Sylvie pose ses cartes en souriant. Skarn aurait été fier."
            : "Sylvie ramasse les cartes. Tu reprendras une partie."}
        </p>
        <button className="ach-side__btn" onClick={onRestart}>Rejouer</button>
      </div>
    </div>
  );
}
