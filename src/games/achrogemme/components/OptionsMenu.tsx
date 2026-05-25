import { useEffect, useRef, useState } from 'react';

interface Props {
  onShowTutorial: () => void;
  onShowCodex: () => void;
  onShowDeck: () => void;
  onToggleLore: () => void;
  onRestart: () => void;
  showLore: boolean;
}

export function OptionsMenu({ onShowTutorial, onShowCodex, onShowDeck, onToggleLore, onRestart, showLore }: Props) {
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
          <div className="ach-options__sep">Difficulté</div>
          <button className="ach-options__diff is-active" type="button" disabled>
            <span className="ach-options__diff-dot" data-tier="facile" />
            <span className="ach-options__label">Sylvie · facile</span>
            <span className="ach-options__diff-state">actif</span>
          </button>
          <button className="ach-options__diff" type="button" disabled title="À venir au Lot 3">
            <span className="ach-options__diff-dot" data-tier="medium" />
            <span className="ach-options__label">Lilia · médium</span>
            <span className="ach-options__diff-state">à venir</span>
          </button>
          <button className="ach-options__diff" type="button" disabled title="À venir au Lot 4">
            <span className="ach-options__diff-dot" data-tier="difficile" />
            <span className="ach-options__label">Skarn · difficile</span>
            <span className="ach-options__diff-state">à venir</span>
          </button>
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
