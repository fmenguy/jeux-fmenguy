import type { CardInstance, ClasseId, FactionId } from '../state/types';
import { CARD_INDEX } from '../data/cards';
import { CLASSES } from '../data/classes';
import { FACTIONS } from '../data/factions';
import { IconSword, IconHeart, IconEntrelac, IconCorner } from './Icons';

type Frame = 'sobre' | 'vegetal' | 'runique';
type CardAnim = 'enter' | 'draw' | 'hit' | 'heal' | 'death' | 'guard' | null;

interface Props {
  card: CardInstance;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  showLore?: boolean;
  onClick?: () => void;
  onBoard?: boolean;
  interactive?: boolean;
  playable?: boolean;
  frame?: Frame;
  anim?: CardAnim;
  effectiveAtq?: number;
  effectivePvMax?: number;
}

const CLASSE_GLYPH: Record<ClasseId, string> = {
  sylvestre: '🏹',
  arcanique: '✨',
  rempart: '⚔',
};

const FACTION_GLYPH: Record<FactionId, string> = {
  elfe: '☘',
  nain: '⚒',
  humain: '🏰',
  neutre: '◇',
};

export function CardView({
  card, faceDown, selected, disabled, onClick,
  onBoard = false, interactive = true, playable = true,
  frame = 'runique', anim = null, showLore,
  effectiveAtq, effectivePvMax,
}: Props) {
  if (faceDown) {
    return (
      <div className="ach-card ach-card--back" data-onboard={onBoard ? '1' : '0'}>
        <div className="ach-card__back-rune">✦</div>
      </div>
    );
  }

  const def = CARD_INDEX[card.defId];
  if (!def) return null;

  const isSpell = def.kind === 'sortilege';
  const isLegendary = def.rarity === 'legendaire';
  const isElite = (def.tags ?? []).includes('elite');
  const factionLabel = def.faction ? FACTIONS[def.faction].name : null;
  const classeLabel = def.classe ? CLASSES[def.classe].name : null;
  const factionIcon = def.faction ? FACTION_GLYPH[def.faction] : '';
  const classeIcon = def.classe ? CLASSE_GLYPH[def.classe] : '✦';
  const atq = effectiveAtq ?? def.atq ?? 0;
  const pvCur = card.pv;
  const pvMax = effectivePvMax ?? def.pv ?? 0;
  const paBonus = def.paBonus ?? 0;
  const glyph = def.glyph ?? (isSpell ? '✦' : classeIcon);

  const hasRoyaute = (def.tags ?? []).includes('royaute');
  const factionData = hasRoyaute ? 'royal' : def.faction ?? '';

  return (
    <div
      className={`ach-card ${selected ? 'is-selected' : ''} ${isElite ? 'is-elite' : ''}`}
      data-rarity={def.rarity}
      data-elite={isElite ? '1' : '0'}
      data-class={def.classe ?? ''}
      data-frame={frame}
      data-type={isSpell ? 'sort' : 'unite'}
      data-saga={def.saga ?? ''}
      data-onboard={onBoard ? '1' : '0'}
      data-interactive={interactive && !disabled ? '1' : '0'}
      data-playable={playable && !disabled ? '1' : '0'}
      data-anim={anim ?? ''}
      onClick={disabled ? undefined : onClick}
      title={def.lore ?? def.text}
    >
      {isLegendary && <div className="ach-card__halo" />}
      {isLegendary && def.saga === 'tome2' && (
        <>
          <div className="ach-card__crystal-marker" />
          <div className="ach-card__crystal-marker" />
        </>
      )}
      {isElite && (
        <div className="ach-card__elite-badge" title="Carte Élite débloquée par une Trinité">★ Élite</div>
      )}

      <div className="ach-card__frame">
        {frame === 'vegetal' && !isLegendary && (
          <>
            <div className="ach-card__corner ach-card__corner--tl"><IconCorner /></div>
            <div className="ach-card__corner ach-card__corner--tr"><IconCorner /></div>
            <div className="ach-card__corner ach-card__corner--bl"><IconCorner /></div>
            <div className="ach-card__corner ach-card__corner--br"><IconCorner /></div>
          </>
        )}

        {isLegendary && (
          <>
            <div className="ach-card__entrelac ach-card__entrelac--tl"><IconEntrelac /></div>
            <div className="ach-card__entrelac ach-card__entrelac--tr"><IconEntrelac /></div>
            <div className="ach-card__entrelac ach-card__entrelac--bl"><IconEntrelac /></div>
            <div className="ach-card__entrelac ach-card__entrelac--br"><IconEntrelac /></div>
          </>
        )}

        <div className="ach-card__top">
          <div className="ach-card__cost" title="Coût en Gemmes">{def.cost}</div>
          <div />
          {!isSpell && (
            <div className="ach-card__stats">
              <div className="ach-card__atk" title="Attaque">
                <IconSword />
                <span>{atq}</span>
              </div>
              <div className="ach-card__hp" title="Points de vie">
                <IconHeart />
                <span>{onBoard ? `${pvCur}/${pvMax}` : pvMax}</span>
              </div>
            </div>
          )}
        </div>

        {paBonus !== 0 && (
          <div
            className="ach-card__gemmod"
            data-sign={paBonus > 0 ? '+' : '-'}
            title="Modifie le maximum de Gemmes"
          >
            {paBonus > 0 ? `+${paBonus}` : paBonus}
            <span className="ach-card__gemmod-label">Gemme max</span>
          </div>
        )}

        <div className="ach-card__art">
          <div className="ach-card__art-halo" />
          {def.art ? (
            <img className="ach-card__art-img" src={def.art} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className="ach-card__art-glyph">{glyph}</div>
          )}
          {!onBoard && !def.art && <div className="ach-card__art-placeholder">art : {def.id}</div>}
        </div>

        <div className="ach-card__name">
          {isLegendary && <span className="ach-card__crown">👑</span>}
          <span>{def.name}</span>
        </div>

        {!onBoard && (
          <div className="ach-card__text">
            <span>{def.text}</span>
          </div>
        )}

        {!onBoard && (
          <div className="ach-card__footer">
            <span>{factionIcon} {factionData === 'royal' ? 'Royal' : factionLabel}</span>
            <span className="ach-card__footer-dot" />
            <span>{classeIcon} {classeLabel ?? 'Sortilège'}</span>
          </div>
        )}

        {showLore && def.lore && !onBoard && (
          <div className="ach-card__lore">{def.lore}</div>
        )}
      </div>
    </div>
  );
}
