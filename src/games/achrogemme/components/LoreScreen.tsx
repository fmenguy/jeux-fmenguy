import { useState } from 'react';
import { LORE } from '../data/lore';

interface Props { onClose: () => void; }

export function LoreScreen({ onClose }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const entry = LORE[selectedIdx];

  return (
    <div className="ach-lore-overlay" role="dialog" aria-modal="true">
      <div className="ach-lore-modal">
        <div className="ach-lore-head">
          <h2 className="ach-lore-title">Codex d'Achronia</h2>
          <button className="ach-lore-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="ach-lore-sub">
          Les figures de l'histoire des Sœurs Elfes, telles qu'elles apparaissent dans le jeu.
        </div>

        <div className="ach-lore-body">
          <div className="ach-lore-list">
            {LORE.map((e, i) => (
              <button
                key={e.cardId}
                className={`ach-lore-list-item ${i === selectedIdx ? 'is-active' : ''}`}
                onClick={() => setSelectedIdx(i)}
              >
                <span className="ach-lore-list-glyph">{e.glyph}</span>
                <span className="ach-lore-list-info">
                  <span className="ach-lore-list-name">{e.name}</span>
                  <span className="ach-lore-list-role">{e.role}</span>
                </span>
                <span className="ach-lore-list-saga">{e.saga}</span>
              </button>
            ))}
          </div>

          <div className="ach-lore-detail">
            <div className="ach-lore-portrait">
              <span className="ach-lore-portrait-glyph">{entry.glyph}</span>
            </div>
            <div className="ach-lore-detail-head">
              <h3 className="ach-lore-detail-name">{entry.name}</h3>
              <div className="ach-lore-detail-meta">
                <span className="ach-lore-pill" data-kind="faction">{entry.faction}</span>
                <span className="ach-lore-pill" data-kind="saga">{entry.saga}</span>
              </div>
              <div className="ach-lore-detail-role">{entry.role}</div>
            </div>
            <div className="ach-lore-detail-bio">
              {entry.bio.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {entry.link && (
              <a className="ach-lore-detail-link" href={entry.link.url} target="_blank" rel="noreferrer">
                Lire l'histoire : {entry.link.label} →
              </a>
            )}
          </div>
        </div>

        <div className="ach-lore-footer">
          <span className="ach-lore-step-count">{selectedIdx + 1} / {LORE.length}</span>
          <div className="ach-lore-actions">
            <button
              className="ach-side__btn ach-side__btn--ghost"
              onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
              disabled={selectedIdx === 0}
            >
              Précédent
            </button>
            <button
              className="ach-side__btn ach-side__btn--ghost"
              onClick={() => setSelectedIdx((i) => Math.min(LORE.length - 1, i + 1))}
              disabled={selectedIdx === LORE.length - 1}
            >
              Suivant
            </button>
            <button className="ach-side__btn" onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
