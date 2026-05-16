/* ============================================
   AELINDRA · screens/Guild.tsx
   Écran 06 : Guilde des aventuriers — composant smart
   Machine d'état : idle → charging → bursting → revealing
   ============================================ */

import { useRef, useState, useCallback, useMemo } from 'react';
import { useGameState, useDispatch } from '../state/GameContext';
import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';
import { specToIcon } from '../components/specToIcon';
import { playOrbCharge, playSummon } from '../audio/sfx';
import type { PullResult } from '../logic/gacha';

type AnimPhase = 'idle' | 'charging' | 'bursting' | 'revealing';

const RARITY_ORDER: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
const RARITY_COLORS: Record<string, string> = {
  common:    'var(--rarity-common)',
  rare:      'var(--rarity-rare)',
  epic:      'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
};

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Positions de sparks fixes calculées au chargement du module
const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * 2 * Math.PI + 0.3;
  const dist = 55 + (i % 3) * 20;
  return {
    sx: Math.round(Math.cos(angle) * dist),
    sy: Math.round(Math.sin(angle) * dist),
  };
});

interface GuildProps {
  onBack?: () => void;
}

export function Guild({ onBack }: GuildProps) {
  const state = useGameState();
  const dispatch = useDispatch();

  // stateRef permet de lire l'état frais dans les fonctions async
  const stateRef = useRef(state);
  stateRef.current = state;

  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [revealedResults, setRevealedResults] = useState<PullResult[] | null>(null);
  const [burstColor, setBurstColor] = useState('var(--rune)');

  const allHeroes = useMemo(
    () => [...state.team, ...state.collection],
    [state.team, state.collection],
  );

  const slots = useMemo(
    () => Array.from({ length: 24 }, (_, i) => {
      const h = allHeroes[i];
      return h ? { i: specToIcon(h.spec), r: h.rarity } : { i: null, r: null };
    }),
    [allHeroes],
  );

  const pityPercent = Math.round((state.pity / 50) * 100);
  const isBusy = phase === 'charging' || phase === 'bursting';

  const invoke = useCallback(async (count: 1 | 10) => {
    if (phase !== 'idle') return;
    const cost = count === 1 ? 10 : 90;
    if (stateRef.current.orbs < cost) return;

    // Phase 1 : charge (animation orbe + son)
    setPhase('charging');
    playOrbCharge();
    await delay(1200);

    // Phase 2 : dispatch et lecture des résultats
    dispatch({ type: 'PERFORM_PULLS', count });
    await delay(32); // une frame pour que React re-rende et mette stateRef à jour

    const results = stateRef.current.lastPullResults ?? [];
    const best = results.length > 0
      ? results.reduce(
          (b, r) => (RARITY_ORDER[r.hero.rarity] ?? 0) > (RARITY_ORDER[b.hero.rarity] ?? 0) ? r : b,
          results[0],
        )
      : null;
    const bestRarity = best?.hero.rarity ?? 'common';
    setBurstColor(RARITY_COLORS[bestRarity] ?? 'var(--rune)');

    // Phase 3 : burst (anneau + flash + shake + son)
    setPhase('bursting');
    playSummon(bestRarity as 'common' | 'rare' | 'epic' | 'legendary');
    await delay(550);

    // Phase 4 : révélation (modal + flip)
    setRevealedResults([...results]);
    setPhase('revealing');
  }, [phase, dispatch]);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLEAR_PULL_RESULTS' });
    setRevealedResults(null);
    setPhase('idle');
    setBurstColor('var(--rune)');
  }, [dispatch]);

  // Meilleur résultat pour la carte principale
  const bestResult = revealedResults?.length
    ? revealedResults.reduce(
        (b, r) => (RARITY_ORDER[r.hero.rarity] ?? 0) > (RARITY_ORDER[b.hero.rarity] ?? 0) ? r : b,
        revealedResults[0],
      )
    : null;
  const otherResults = bestResult
    ? (revealedResults ?? []).filter(r => r !== bestResult)
    : [];

  return (
    <div className="scr on" id="s-guild" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Burst ring — positionné absolument, couvre l'écran depuis le centre */}
      <div
        className={`guild-burst${phase === 'bursting' ? ' go' : ''}`}
        style={{ ['background' as string]: `radial-gradient(circle, ${burstColor} 0%, transparent 70%)` }}
      />
      {/* Flash blanc */}
      <div className={`guild-flash${phase === 'bursting' ? ' go' : ''}`} />

      <ScrHeader title="GUILDE DES AVENTURIERS" orb={state.orbs} onBack={onBack} />

      <div className="guild-body">
        <div className="guild-info">
          <Icon id="orb" className="ico ic" />
          Les Orbes Runiques attirent des aventuriers depuis l'aube des âges. À 50 invocations
          sans Épique, un sort de garantie s'active.
        </div>

        {/* guild-stage reçoit .shake pendant le burst */}
        <div className={`guild-stage${phase === 'bursting' ? ' shake' : ''}`}>
          <div className="guild-pull">
            {/* guild-orb-wrap reçoit .charging pour l'animation orbe */}
            <div className={`guild-orb-wrap${isBusy ? ' charging' : ''}`}>
              <div className="guild-orb">
                <Icon id="orb" />
              </div>
            </div>

            <div className="pity-wrap">
              <div className="pity-lbl">
                <span>SCEAU DE GARANTIE</span>
                <span className="pity-count">{state.pity} / 50</span>
              </div>
              <div className="pity-bg">
                <div className="pity-fill" style={{ width: `${pityPercent}%` }} />
              </div>
            </div>

            <div className="pull-btns">
              <button
                className="pb1"
                onClick={() => void invoke(1)}
                disabled={isBusy || state.orbs < 10}
              >
                <span className="lbl">×1</span>
                <span className="price">10 ◆</span>
              </button>
              <button
                className="pb10"
                onClick={() => void invoke(10)}
                disabled={isBusy || state.orbs < 90}
              >
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
        </div>

        <div className="guild-roster">
          <div className="roster-title">PANTHÉON · {allHeroes.length} / 24</div>
          <div className="roster-grid">
            {slots.map((p, i) => (
              <div key={i} className="roster-hero">
                <div
                  className={`roster-port${p.r ? ` rarity rarity--${p.r}` : ''}`}
                  style={{ borderColor: p.r ? '' : 'var(--mute)', opacity: p.r ? 1 : 0.3 }}
                >
                  {p.i
                    ? <Icon id={p.i} className="ico" style={{ width: 16, height: 16 }} />
                    : <Icon id="lock" className="ico" style={{ width: 12, height: 12, color: 'var(--dim2)' }} />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal cinématique — visible uniquement en phase 'revealing' */}
      {phase === 'revealing' && revealedResults && (
        <div className="result-modal on" onClick={closeModal}>
          <div className="result-title">INVOCATION</div>

          <div className="result-content" onClick={e => e.stopPropagation()}>
            {/* Carte principale (flip + halo + sparks) */}
            {bestResult && (
              <div className="result-headline result-card-anim flip">
                <div
                  className="result-card result-card--hero"
                  style={{ borderColor: RARITY_COLORS[bestResult.hero.rarity] ?? 'var(--b)' }}
                >
                  <div
                    className="card-halo"
                    style={{ ['background' as string]: `radial-gradient(circle, ${RARITY_COLORS[bestResult.hero.rarity] ?? 'transparent'} 0%, transparent 70%)` }}
                  />
                  <div
                    className="result-card-img"
                    style={{ ['--r' as string]: RARITY_COLORS[bestResult.hero.rarity] }}
                  >
                    <Icon id={specToIcon(bestResult.hero.spec)} className="ico" style={{ width: 48, height: 48 }} />
                    {bestResult.isNew && <span className="result-card-new">NOUVEAU</span>}
                    {bestResult.isDuplicate && (
                      <div className="dup-overlay">
                        <span className="dup-label">Déjà recruté</span>
                        <span className="dup-xp">+{bestResult.xpGained?.toLocaleString()} XP</span>
                        {bestResult.leveledUp && (
                          <span className="dup-levelup">LV.{bestResult.newLevel} ↑</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="result-card-meta">
                    {bestResult.hero.name}
                    <br />
                    <span style={{ color: 'var(--dim)', fontSize: '0.9em' }}>{bestResult.hero.class}</span>
                  </div>
                  {/* Sparks radiaux */}
                  {SPARKS.map((s, i) => (
                    <div
                      key={i}
                      className="card-spark"
                      style={{
                        background: RARITY_COLORS[bestResult.hero.rarity] ?? 'var(--gold)',
                        ['--sx' as string]: `${s.sx}px`,
                        ['--sy' as string]: `${s.sy}px`,
                        animationDelay: `${i * 0.07}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Mini cartes pour les autres résultats (×10) */}
            {otherResults.length > 0 && (
              <div className="mini-pulls">
                {otherResults.map((r, i) => (
                  <div
                    key={i}
                    className="mini-pull-card"
                    style={{
                      ['border-color' as string]: RARITY_COLORS[r.hero.rarity] ?? 'var(--b)',
                      animationDelay: `${0.15 + i * 0.06}s`,
                    }}
                  >
                    <Icon id={specToIcon(r.hero.spec)} className="ico" style={{ width: 20, height: 20 }} />
                    {r.isNew && <span className="mini-new">★</span>}
                    {r.isDuplicate && r.xpGained && (
                      <span className="mini-new" style={{ color: 'var(--gold-dim)', fontSize: 6 }}>
                        +XP
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="guild-modal-close" onClick={closeModal}>
            CONTINUER
          </button>
        </div>
      )}
    </div>
  );
}
