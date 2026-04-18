import { TERRAIN, BUILDING } from '../enums.js';

export const FACTIONS = [
    {
        id: 0,
        name: 'Humains',
        color: '#f59e0b',
        lightColor: '#fbbf24',
        darkColor: '#92400e',
        emoji: '👑',
        type: 'human',
        startBias: 'west',
        traits: {
            buildSpeed: 1.3,
            researchSpeed: 0.9,
            combatBonus: 1.2,
            meleeBonus: 1.5,
            rangeBonus: 0.8,
            cavalryBonus: 1.4,
            defenseBonus: 1.3,
            preferredTerrain: TERRAIN.STONE,
            preferredBuildings: [BUILDING.WATCHTOWER, BUILDING.BARRACKS, BUILDING.FORGE]
        }
    },
    {
        id: 1,
        name: 'Elfes',
        color: '#10b981',
        lightColor: '#34d399',
        darkColor: '#065f46',
        emoji: '🧝',
        type: 'elf',
        startBias: 'east',
        traits: {
            buildSpeed: 0.9,
            researchSpeed: 1.4,
            combatBonus: 0.9,
            meleeBonus: 0.7,
            rangeBonus: 1.6,
            cavalryBonus: 0.8,
            defenseBonus: 0.9,
            preferredTerrain: TERRAIN.FOREST,
            preferredBuildings: [BUILDING.ARCHERY_RANGE, BUILDING.SAWMILL]
        }
    }
];
