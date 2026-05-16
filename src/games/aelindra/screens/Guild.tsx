/* ============================================
   AELINDRA · screens/Guild.tsx
   Écran 06 : Guilde des aventuriers (invocations)
   ============================================ */

import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';
import type { PullResult } from '../logic/gacha';

interface RosterSlot {
  i: string | null;
  r: string | null;
}

interface GuildProps {
  orbs?: number;
  pityCount?: number;
  pityMax?: number;
  rosterSlots?: RosterSlot[];
  rosterFilled?: number;
  rosterTotal?: number;
  lastPullResults?: PullResult[] | null;
  onBack?: () => void;
  onPull1?: () => void;
  onPull10?: () => void;
  onCloseResults?: () => void;
}

const RARITY_COLOR: Record<string, string> = {
  common:    'var(--r-common)',
  rare:      'var(--r-rare)',
  epic:      'var(--r-epic)',
  legendary: 'var(--r-legend)',
};

export function Guild({
  orbs = 0,
  pityCount = 0,
  pityMax = 50,
  rosterSlots = [],
  rosterFilled = 0,
  rosterTotal = 24,
  lastPullResults = null,
  onBack,
  onPull1,
  onPull10,
  onCloseResults,
}: GuildProps) {
  const pityPercent = Math.round((pityCount / pityMax) * 100);
  const showModal = lastPullResults !== null && lastPullResults.length > 0;

  // Complète jusqu'à rosterTotal slots
  const slots: RosterSlot[] = [
    ...rosterSlots,
    ...Array.from({ length: Math.max(0, rosterTotal - rosterSlots.length) }, () => ({ i: null, r: null })),
  ].slice(0, rosterTotal);

  return (
    <div className="scr on" id="s-guild" style={{ position: 'relative' }}>
      <ScrHeader title="GUILDE DES AVENTURIERS" orb={orbs} onBack={onBack} />
      <div className="guild-body">
        <div className="guild-info">
          <Icon id="orb" className="ico ic" />
          Les Orbes Runiques attirent des aventuriers depuis l'aube des âges. À 50 invocations
          sans Épique, un sort de garantie s'active.
        </div>

        <div className="guild-pull">
          <div className="guild-orb">
            <Icon id="orb" />
          </div>

          <div className="pity-wrap">
            <div className="pity-lbl">
              <span>SCEAU DE GARANTIE</span>
              <span className="pity-count">
                {pityCount} / {pityMax}
              </span>
            </div>
            <div className="pity-bg">
              <div className="pity-fill" style={{ width: `${pityPercent}%` }}></div>
            </div>
          </div>

          <div className="pull-btns">
            <button className="pb1" onClick={onPull1}>
              <span className="lbl">×1</span>
              <span className="price">10 ◆</span>
            </button>
            <button className="pb10" onClick={onPull10}>
              <span className="lbl">×10</span>
              <span className="price">90 ◆</span>
              <span className="bonus">+1 gratuit</span>
            </button>
          </div>

          <div className="rate-pills">
            <span className="rp rp-c">28% COMMUN</span>
            <span className="rp rp-r">54% RARE</span>
            <span className="rp rp-e">16% ÉPIQUE</span>
            <span className="rp rp-l">2% LÉGENDAIRE</span>
          </div>
        </div>

        <div className="guild-roster">
          <div className="roster-title">
            PANTHÉON · {rosterFilled} / {rosterTotal}
          </div>
          <div className="roster-grid">
            {slots.map((p, i) => (
              <div key={i} className="roster-hero">
                <div
                  className={`roster-port ${p.r ? `rarity rarity--${p.r}` : ''}`}
                  style={{
                    borderColor: p.r ? '' : 'var(--mute)',
                    opacity: p.r ? 1 : 0.3,
                  }}
                >
                  {p.i ? (
                    <Icon id={p.i} className="ico" style={{ width: 16, height: 16 }} />
                  ) : (
                    <Icon id="lock" className="ico" style={{ width: 12, height: 12, color: 'var(--dim2)' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal résultats d'invocation */}
      <div
        className={`result-modal${showModal ? ' on' : ''}`}
        onClick={onCloseResults}
      >
        <div className="result-title">INVOCATION</div>
        <div className="result-cards" onClick={e => e.stopPropagation()}>
          {lastPullResults?.map((r, i) => (
            <div
              key={i}
              className="result-card"
              style={{ borderColor: RARITY_COLOR[r.hero.rarity] ?? 'var(--b)' }}
            >
              <div
                className="result-card-img"
                style={{ ['--r' as string]: RARITY_COLOR[r.hero.rarity] ?? 'var(--gold)' }}
              >
                <span style={{ fontSize: 28 }}>{r.hero.emoji ?? '⚔️'}</span>
                {r.isNew && <span className="result-card-new">NOUVEAU</span>}
              </div>
              <div className="result-card-meta">
                {r.hero.name}
                <br />
                <span style={{ color: 'var(--dim)', fontSize: '0.9em' }}>{r.hero.class}</span>
              </div>
            </div>
          ))}
        </div>
        <button className="guild-modal-close" onClick={onCloseResults}>
          CONTINUER
        </button>
      </div>
    </div>
  );
}
