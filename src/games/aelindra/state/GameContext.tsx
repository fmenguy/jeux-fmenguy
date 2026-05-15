/* ============================================
   AELINDRA · state/GameContext.tsx
   Provider React + hooks d'accès au store
   ============================================ */

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';

import type { GameState } from './types';
import type { GameAction } from './actions';
import { gameReducer } from './reducer';
import { initialState } from './initialState';
import { loadSavedState, saveState } from './persistence';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

const TOAST_DURATION_MS = 2400;

function lazyInit(): GameState {
  const saved = loadSavedState();
  if (!saved) return initialState;
  return { ...initialState, ...saved };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, lazyInit);

  // --- Auto-save : on évite de sauvegarder pendant un combat actif ---
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (state.combat) return; // pas de sauvegarde pendant combat
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      saveState(state);
    }, 200);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [state]);

  // --- Reset des missions daily au montage ---
  useEffect(() => {
    dispatch({ type: 'RESET_DAILY_MISSIONS' });
  }, []);

  // --- Auto-clear du toast après la durée ---
  useEffect(() => {
    if (!state.toast) return;
    const id = window.setTimeout(() => {
      dispatch({ type: 'HIDE_TOAST' });
    }, TOAST_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [state.toast?.ts]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame doit être appelé dans GameProvider');
  return ctx;
}

export function useGameState(): GameState {
  return useGame().state;
}

export function useDispatch(): Dispatch<GameAction> {
  return useGame().dispatch;
}
