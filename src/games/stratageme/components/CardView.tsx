import type { CardInstance } from '../state/types';
import { CARD_INDEX } from '../data/cards';

interface Props {
  card: CardInstance;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  showLore?: boolean;
  onClick?: () => void;
  compact?: boolean;
  effectiveForce?: number;
}

export function CardView({ card, faceDown, selected, disabled, onClick, compact, effectiveForce, showLore }: Props) {
  if (faceDown) {
    return (
      <div className={`strat-card strat-card-back ${compact ? 'strat-card-compact' : ''}`}>
        <div className="strat-card-back-runes">✦</div>
      </div>
    );
  }
  const def = CARD_INDEX[card.defId];
  if (!def) return null;

  const isSort = def.kind === 'sortilege';
  const factionClass = def.faction ? `strat-card-${def.faction}` : 'strat-card-neutre';

  const classes = [
    'strat-card',
    factionClass,
    isSort ? 'strat-card-sort' : 'strat-card-perso',
    selected ? 'is-selected' : '',
    disabled ? 'is-disabled' : '',
    compact ? 'strat-card-compact' : '',
  ].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} onClick={onClick} disabled={disabled} title={def.lore ?? def.text}>
      <div className="strat-card-cost" aria-label="coût">{def.cost}</div>
      {!isSort && def.force !== undefined && (
        <div className="strat-card-force">
          <span className="strat-card-force-num">{effectiveForce ?? def.force}</span>
          <span className="strat-card-force-label">FOR</span>
        </div>
      )}
      <div className="strat-card-art">
        <span className="strat-card-glyph">{isSort ? '✦' : initial(def.name)}</span>
      </div>
      <div className="strat-card-name">{def.name}</div>
      {!compact && <div className="strat-card-text">{def.text}</div>}
      {showLore && def.lore && (
        <div className="strat-card-lore">{def.lore}</div>
      )}
    </button>
  );
}

function initial(name: string): string {
  return name.charAt(0).toUpperCase();
}
