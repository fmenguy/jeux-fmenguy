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
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { uploadSave, downloadSave } from '../auth/cloudSync';

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

  // --- Auth Firebase : écoute la connexion/déconnexion ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const authUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
        dispatch({ type: 'SET_AUTH_USER', user: authUser });

        // Charge le save cloud et l'applique s'il existe
        try {
          const cloudSave = await downloadSave(user.uid);
          // Nom par défaut = displayName Google si pas encore de pseudo personnalisé
          const defaultName = user.displayName?.split(' ')[0] ?? 'Aventurier';
          const playerName = cloudSave?.playerName && cloudSave.playerName !== 'Aventurier'
            ? cloudSave.playerName
            : defaultName;
          if (cloudSave) {
            dispatch({
              type: 'LOAD_STATE',
              state: {
                ...initialState,
                ...cloudSave,
                playerName,
                authUser,
                currentScreen: 'splash',
                combat: null,
                toast: null,
                lastPullResults: null,
              },
            });
          } else {
            // Première connexion : pas encore de save cloud, on prend juste le prénom
            dispatch({ type: 'SET_PLAYER_NAME', name: defaultName });
          }
        } catch (e) {
          console.warn('[aelindra] cloud load failed', e);
        }
      } else {
        dispatch({ type: 'SET_AUTH_USER', user: null });
      }
    });
    return unsub;
  }, []);

  // --- Sync cloud (debounced 2s) quand l'utilisateur est connecté ---
  const cloudSyncTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!state.authUser?.uid || state.combat) return;
    if (cloudSyncTimer.current !== null) clearTimeout(cloudSyncTimer.current);
    cloudSyncTimer.current = window.setTimeout(() => {
      uploadSave(state.authUser!.uid, {
        playerName: state.playerName,
        gold: state.gold,
        orbs: state.orbs,
        tutoFloor: state.tutoFloor,
        tutoComplete: state.tutoComplete,
        dungeonProgress: state.dungeonProgress,
        team: state.team,
        collection: state.collection,
        inventory: state.inventory,
        pity: state.pity,
        missionProgress: state.missionProgress,
      }).catch((e: unknown) => console.warn('[aelindra] cloud sync failed', e));
    }, 2000);
    return () => {
      if (cloudSyncTimer.current !== null) clearTimeout(cloudSyncTimer.current);
    };
  }, [state]);

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
