/* ============================================
   AELINDRA · audio/useCombatFx.ts
   Hook qui detecte les changements du state de combat
   et declenche sons + animations (popups de degats, flash).
   ============================================ */

import { useEffect, useRef, useState } from 'react';
import type { CombatState, Unit } from '../logic/combat';
import {
  playHit, playSpell, playHeal, playDeath,
  playVictory, playDefeat, playSwing,
} from './sfx';

export interface DamagePopup {
  id: number;
  x: number;
  y: number;
  amount: number;
  kind: 'damage' | 'heal' | 'crit';
}

export interface UnitFxState {
  hitIds: Set<string>;     // instanceIds qui viennent d'etre touches (flash)
  movedIds: Set<string>;   // instanceIds qui viennent de bouger (bounce)
  dyingIds: Set<string>;   // instanceIds qui meurent (fadeout)
  critIds: Set<string>;    // instanceIds touches par un coup > 25% maxHp ou tues
}

interface FxOutput {
  popups: DamagePopup[];
  fx: UnitFxState;
}

let popupCounter = 0;

/**
 * Detecte les changements de combat et :
 * - joue les bons sons
 * - retourne les popups de degats actifs
 * - retourne les classes FX a appliquer aux unites
 */
export function useCombatFx(combat: CombatState | null): FxOutput {
  const prevUnits = useRef<Unit[]>([]);
  const prevWinner = useRef<'elf' | 'enemy' | null>(null);
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const [fx, setFx] = useState<UnitFxState>({
    hitIds: new Set(),
    movedIds: new Set(),
    dyingIds: new Set(),
    critIds: new Set(),
  });

  useEffect(() => {
    if (!combat) {
      prevUnits.current = [];
      return;
    }

    const prev = prevUnits.current;
    const newPopups: DamagePopup[] = [];
    const hitIds = new Set<string>();
    const movedIds = new Set<string>();
    const dyingIds = new Set<string>();
    const critIds = new Set<string>();
    let anyHit = false;
    let anyMove = false;
    let anyHeal = false;
    let anyDeath = false;

    combat.units.forEach(u => {
      const old = prev.find(p => p.instanceId === u.instanceId);
      if (!old) return;

      // Degats
      if (u.hp < old.hp) {
        const dmg = old.hp - u.hp;
        const isBig = old.maxHp > 0 && dmg >= old.maxHp * 0.25;
        newPopups.push({
          id: ++popupCounter,
          x: u.pos.x,
          y: u.pos.y,
          amount: dmg,
          kind: isBig ? 'crit' : 'damage',
        });
        hitIds.add(u.instanceId);
        if (isBig) critIds.add(u.instanceId);
        anyHit = true;
        // Mort
        if (u.hp <= 0 && old.hp > 0) {
          dyingIds.add(u.instanceId);
          critIds.add(u.instanceId); // kill = toujours cinematique
          anyDeath = true;
        }
      }

      // Soin
      if (u.hp > old.hp) {
        newPopups.push({
          id: ++popupCounter,
          x: u.pos.x,
          y: u.pos.y,
          amount: u.hp - old.hp,
          kind: 'heal',
        });
        anyHeal = true;
      }

      // Mouvement
      if (u.pos.x !== old.pos.x || u.pos.y !== old.pos.y) {
        movedIds.add(u.instanceId);
        anyMove = true;
      }
    });

    // Joue les sons (un seul par type meme si plusieurs unites concernees)
    if (anyDeath) playDeath();
    if (anyHit) playHit();
    if (anyHeal) playHeal();
    if (anyMove && !anyHit) playSwing(); // ne pas spammer si deja un hit

    // Mise a jour des popups (cumul)
    if (newPopups.length > 0) {
      setPopups(cur => [...cur, ...newPopups]);
      // Auto-cleanup apres 800ms (duree de l'anim CSS)
      newPopups.forEach(p => {
        setTimeout(() => {
          setPopups(cur => cur.filter(x => x.id !== p.id));
        }, 850);
      });
    }

    // Mise a jour des classes FX (reset apres l'animation)
    if (hitIds.size || movedIds.size || dyingIds.size) {
      setFx({ hitIds, movedIds, dyingIds, critIds });
      setTimeout(() => {
        setFx({ hitIds: new Set(), movedIds: new Set(), dyingIds: new Set(), critIds: new Set() });
      }, 400);
    }

    // Fin de combat
    if (combat.isOver && combat.winner !== prevWinner.current) {
      if (combat.winner === 'elf') playVictory();
      else if (combat.winner === 'enemy') playDefeat();
      prevWinner.current = combat.winner;
    }

    // Copie defensive pour le prochain diff
    prevUnits.current = combat.units.map(u => ({ ...u, pos: { ...u.pos } }));
  }, [combat]);

  // Un dummy pour eviter warning unused
  void playSpell;

  return { popups, fx };
}
