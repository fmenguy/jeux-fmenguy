/* ============================================
   AELINDRA · components/PlayerModal.tsx
   Modal profil : changer pseudo + Google SSO
   ============================================ */

import { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useGameState, useDispatch } from '../state/GameContext';

interface PlayerModalProps {
  onClose: () => void;
}

export function PlayerModal({ onClose }: PlayerModalProps) {
  const state = useGameState();
  const dispatch = useDispatch();
  const { authUser, playerName } = state;

  const [pseudo, setPseudo] = useState(playerName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function savePseudo() {
    const name = pseudo.trim();
    if (!name) return;
    dispatch({ type: 'SET_PLAYER_NAME', name });
    onClose();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged dans GameContext prend le relais
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur de connexion';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut(auth);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pmodal-overlay" onClick={onClose}>
      <div className="pmodal" onClick={e => e.stopPropagation()}>
        <div className="pmodal-title">PROFIL</div>

        {/* Changement de pseudo */}
        <div className="pmodal-section">
          <label className="pmodal-lbl">Pseudo</label>
          <div className="pmodal-row">
            <input
              className="pmodal-input"
              value={pseudo}
              maxLength={24}
              onChange={e => setPseudo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && savePseudo()}
              autoFocus
            />
            <button className="pmodal-btn-sm" onClick={savePseudo}>
              OK
            </button>
          </div>
        </div>

        <div className="pmodal-sep" />

        {/* Auth Google */}
        {authUser ? (
          <div className="pmodal-section">
            <div className="pmodal-user">
              {authUser.photoURL && (
                <img
                  src={authUser.photoURL}
                  alt=""
                  className="pmodal-avatar"
                />
              )}
              <div>
                <div className="pmodal-user-name">{authUser.displayName ?? authUser.email}</div>
                <div className="pmodal-user-email">{authUser.email}</div>
                <div className="pmodal-sync-note">Sauvegarde cloud active ✓</div>
              </div>
            </div>
            <button
              className="pmodal-btn-ghost"
              onClick={handleSignOut}
              disabled={loading}
            >
              Se déconnecter
            </button>
          </div>
        ) : (
          <div className="pmodal-section">
            <p className="pmodal-hint">
              Connecte-toi pour retrouver ta progression sur tous tes appareils.
            </p>
            <button
              className="pmodal-btn-google"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" className="pmodal-google-ico" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Connexion…' : 'Continuer avec Google'}
            </button>
            {error && <div className="pmodal-error">{error}</div>}
          </div>
        )}

        <button className="pmodal-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}
