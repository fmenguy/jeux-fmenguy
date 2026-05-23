import type { CardEffect, CardInstance, EffectKind } from '../state/types';
import { CARD_INDEX } from '../data/cards';

export function defEffects(card: CardInstance): CardEffect[] {
  const def = CARD_INDEX[card.defId];
  return def?.effects ?? [];
}

export function hasPassive(card: CardInstance, kind: EffectKind['kind']): boolean {
  return defEffects(card).some(
    (e) => e.trigger === 'passive' && e.effect.kind === kind,
  );
}

export function passiveValue(card: CardInstance, kind: EffectKind['kind']): number {
  let total = 0;
  for (const e of defEffects(card)) {
    if (e.trigger !== 'passive') continue;
    if (e.effect.kind === kind && 'amount' in e.effect) {
      total += (e.effect as { amount: number }).amount;
    }
  }
  return total;
}

export function effectsByTrigger(card: CardInstance, trigger: CardEffect['trigger']): EffectKind[] {
  return defEffects(card)
    .filter((e) => e.trigger === trigger)
    .map((e) => e.effect);
}

export function hasTir(card: CardInstance): boolean {
  return hasPassive(card, 'tir');
}

export function hasGarde(card: CardInstance): boolean {
  return hasPassive(card, 'garde');
}

export function hasCharge(card: CardInstance): boolean {
  return hasPassive(card, 'charge');
}

export function hasRiposte(card: CardInstance): boolean {
  return hasPassive(card, 'riposte');
}

export function hasDoubleStrike(card: CardInstance): boolean {
  return hasPassive(card, 'double_strike');
}

export function pierceValue(card: CardInstance): number {
  return passiveValue(card, 'pierce');
}

export function paBonusOfBoard(cards: CardInstance[]): number {
  let total = 0;
  for (const c of cards) {
    total += passiveValue(c, 'pa_bonus_perm');
    total -= passiveValue(c, 'pa_malus_perm');
  }
  return total;
}
