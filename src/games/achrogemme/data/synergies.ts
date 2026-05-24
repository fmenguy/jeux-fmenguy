import type { SynergyDef } from '../state/types';

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'elfe',
    name: 'Peuple Elfe',
    on: { kind: 'faction', value: 'elfe' },
    description: "Les Elfes d'Achronia se renforcent en nombre.",
    thresholds: [
      { count: 2, text: '+1 ATQ aux Elfes', apply: { kind: 'atq_bonus_to_matching', amount: 1 } },
      { count: 4, text: '+1 PV aux Elfes', apply: { kind: 'pv_bonus_to_matching', amount: 1 } },
    ],
  },
  {
    id: 'nain',
    name: 'Clan Nain',
    on: { kind: 'faction', value: 'nain' },
    description: "Les Nains des montagnes serrent les rangs.",
    thresholds: [
      { count: 2, text: '+1 PV aux Nains', apply: { kind: 'pv_bonus_to_matching', amount: 1 } },
      { count: 4, text: 'Garde sur tous les Nains', apply: { kind: 'garde_to_matching' } },
    ],
  },
  {
    id: 'humain',
    name: 'Royaumes Humains',
    on: { kind: 'faction', value: 'humain' },
    description: "Les Humains adaptent leur stratégie au combat.",
    thresholds: [
      { count: 3, text: '+1 Gemme max', apply: { kind: 'pa_bonus', amount: 1 } },
    ],
  },
  {
    id: 'royaute',
    name: 'Couronnes d\'Achronia',
    on: { kind: 'tag', value: 'royaute' },
    description: "Les rois et reines réunis insufflent du courage.",
    thresholds: [
      { count: 3, text: '+5 PV max au Champion', apply: { kind: 'champion_pv_bonus', amount: 5 } },
    ],
  },
  {
    id: 'trinity_elfe',
    name: 'Trinité Elfe',
    on: { kind: 'trinity', value: 'elfe' },
    description: "Un Archer, un Mage et un Guerrier elfes réunis débloquent l'Éclair du Roi Elfe.",
    thresholds: [
      { count: 1, text: 'Débloque Éclair du Roi Elfe', apply: { kind: 'unlock_elite_card', cardId: 'elite_eclair_elfe' } },
    ],
  },
  {
    id: 'trinity_nain',
    name: 'Trinité Naine',
    on: { kind: 'trinity', value: 'nain' },
    description: "Un Archer, un Mage et un Guerrier nains réunis débloquent le Mortier des Forges.",
    thresholds: [
      { count: 1, text: 'Débloque Mortier des Forges', apply: { kind: 'unlock_elite_card', cardId: 'elite_mortier_nain' } },
    ],
  },
  {
    id: 'trinity_humain',
    name: 'Trinité Humaine',
    on: { kind: 'trinity', value: 'humain' },
    description: "Un Archer, un Mage et un Guerrier humains réunis débloquent la Charge de la Couronne.",
    thresholds: [
      { count: 1, text: 'Débloque Charge de la Couronne', apply: { kind: 'unlock_elite_card', cardId: 'elite_charge_humaine' } },
    ],
  },
];

export const SYNERGY_INDEX: Record<string, SynergyDef> = Object.fromEntries(
  SYNERGIES.map((s) => [s.id, s]),
);
