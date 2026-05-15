/* ============================================
   AELINDRA · state/index.ts
   Re-export central du store
   ============================================ */

export * from './types';
export * from './actions';
export { initialState } from './initialState';
export { gameReducer } from './reducer';
export { loadSavedState, saveState, clearSavedState, SAVE_KEY } from './persistence';
export {
  GameProvider,
  useGame,
  useGameState,
  useDispatch,
} from './GameContext';
