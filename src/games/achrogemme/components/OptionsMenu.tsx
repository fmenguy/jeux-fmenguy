import { useEffect, useRef, useState } from 'react';
import { CHAMPIONS, OPPONENT_ORDER, OPPONENT_UNLOCK_WINS } from '../data/champions';
import { getStats } from '../data/collection';

interface Props {
  onShowTutorial: () => void;
  onShowCodex: () => void;
  onShowDeck: () => void;
  onToggleLore: () => void;
  onRestart: () => void;
  onSelectOpponent: (id: string) => void;
  currentOpponent: string;
  showLore: boolean;
}

export function OptionsMenu({
  onShowTutorial, onShowCodex, onShowDeck, onToggleLore,
  onRestart, onSelectOpponent, currentOpponent, showLore,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const wins = open ? getStats().wins : 0;

  return (
    <div className="ach-options" ref={rootRef}>
      {open && (
        <div className="ach-options__panel">
          <div className="ach-options__title">Options</div>
          <button className="ach-options__item" onClick={() => { onShowTutorial(); setOpen(false); }}>
            <span className="ach-options__icon">📖</span>
            <span className="ach-options__label">Relire le tutoriel</span>
            <kbd className="ach-options__kbd">H</kbd>
          </button>
          <button className="ach-options__item" onClick={() => { onShowCodex(); setOpen(false); }}>
            <span className="ach-options__icon">📜</span>
            <span className="ach-options__label">Codex / Personnages</span>
            <kbd className="ach-options__kbd">C</kbd>
          </button>
          <button className="ach-options__item" onClick={() => { onShowDeck(); setOpen(false); }}>
            <span className="ach-options__icon">🃏</span>
            <span className="ach-options__label">Collection & Deck</span>
            <kbd className="ach-options__kbd">D</kbd>
          </button>
          <button className="ach-options__item" onClick={() => { onToggleLore(); setOpen(false); }}>
            <span className="ach-options__icon">✦</span>
            <span className="ach-options__label">{showLore ? 'Détails carte off' : 'Détails carte on'}</span>
            <kbd className="ach-options__kbd">L</kbd>
          </button>
          <button className="ach-options__item" onClick={() => { onRestart(); setOpen(false); }}>
            <span className="ach-options__icon">↻</span>
            <span className="ach-options__label">Nouvelle partie</span>
            <kbd className="ach-options__kbd">N</kbd>
          </button>
          <div className="ach-options__sep">Adversaire</div>
          {OPPONENT_ORDER.map((id) => {
            const champ = CHAMPIONS[id];
            const needed = OPPONENT_UNLOCK_WINS[id] ?? 0;
            const locked = wins < needed;
            const isCurrent = id === currentOpponent;
            return (
              <button
                key={id}
                className={`ach-options__diff ${isCurrent ? 'is-active' : ''}`}
                type="button"
                disabled={locked}
                title={locked
                  ? `Se débloque après ${needed} victoire${needed > 1 ? 's' : ''} (${wins}/${needed})`
                  : `Nouvelle partie contre ${champ.name}`}
                onClick={() => {
                  if (locked || isCurrent) { setOpen(false); return; }
                  onSelectOpponent(id);
                  setOpen(false);
                }}
              >
                <span className="ach-options__diff-dot" data-tier={champ.difficulty} />
                <span className="ach-options__label">{champ.name} · {champ.difficulty}</span>
                <span className="ach-options__diff-state">
                  {isCurrent ? 'actif' : locked ? `🔒 ${wins}/${needed}` : 'jouer'}
                </span>
              </button>
            );
          })}
          <div className="ach-options__sep">Raccourcis</div>
          <div className="ach-options__shortcut">
            <span>Fin du tour</span>
            <kbd className="ach-options__kbd">Entrée</kbd>
          </div>
          <div className="ach-options__shortcut">
            <span>Annuler sélection</span>
            <kbd className="ach-options__kbd">Échap</kbd>
          </div>
          <a className="ach-options__item ach-options__item--link" href="/">
            <span className="ach-options__icon">←</span>
            <span className="ach-options__label">Retour Arcade FM</span>
          </a>
        </div>
      )}
      <button
        className="ach-options__fab"
        onClick={() => setOpen((v) => !v)}
        aria-label="Options"
        title="Options"
      >
        ⚙
      </button>
    </div>
  );
}
