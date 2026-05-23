import type { ThreatDef } from '../state/types';

export const THREATS: ThreatDef[] = [
  {
    id: 'hargrek',
    name: 'Hargrek',
    force: 6,
    reward: 3,
    lore: "Chef orc albinos. Sent la peur à dix lieues.",
  },
  {
    id: 'kazrak',
    name: 'Kazrak',
    force: 4,
    reward: 2,
    bonus: 'draw',
    lore: "Chef gobelin, rusé comme un rat dans une grange.",
  },
  {
    id: 'krotork',
    name: 'KrotorK',
    force: 8,
    reward: 5,
    lore: "Dragon dressable. Mauvaise idée de tutoyer.",
  },
  {
    id: 'creature_grottes',
    name: 'Créature des grottes',
    force: 5,
    reward: 3,
    lore: "Quelque chose de pâle qui garde les cristaux.",
  },
  {
    id: 'soldat_wulfric',
    name: 'Soldat de Wulfric',
    force: 5,
    reward: 2,
    bonus: 'energy',
    lore: "Discipline militaire de l'empire humain.",
  },
];

export const THREAT_INDEX: Record<string, ThreatDef> = Object.fromEntries(
  THREATS.map((t) => [t.id, t]),
);
