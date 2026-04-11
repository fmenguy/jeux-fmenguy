import { BUILDING } from '../enums.js';

export const BUILDING_CONFIG = {
    [BUILDING.HOUSE]: {
        name: 'Maison', icon: '🏠',
        cost: { wood: 30, stone: 10 },
        popBonus: 5,
        buildTime: 100,
        health: 100,
        description: 'Augmente la population maximale de 5 habitants.'
    },
    [BUILDING.FARM]: {
        name: 'Ferme', icon: '🌾',
        cost: { wood: 40, stone: 5 },
        foodProduction: 0.5,
        buildTime: 120,
        health: 80,
        description: 'Produit de la nourriture. Production affectée par les saisons.'
    },
    [BUILDING.CASTLE]: {
        name: 'Château', icon: '🏰',
        cost: { wood: 200, stone: 300, iron: 50 },
        territoryRadius: 8,
        buildTime: 500,
        health: 500,
        description: 'Centre de commandement. Étend le territoire et sert de point de ralliement.'
    },
    [BUILDING.BARRACKS]: {
        name: 'Caserne', icon: '⚔️',
        cost: { wood: 60, stone: 40, iron: 20 },
        buildTime: 150,
        health: 150,
        description: 'Permet de former des guerriers. Les humains y gagnent un bonus au corps à corps.'
    },
    [BUILDING.FORGE]: {
        name: 'Forge', icon: '🔥',
        cost: { wood: 50, stone: 30, iron: 10 },
        ironProduction: 0.3,
        buildTime: 130,
        health: 120,
        description: 'Produit du fer et améliore les armes des guerriers.'
    },
    [BUILDING.SAWMILL]: {
        name: 'Scierie', icon: '🪚',
        cost: { wood: 60, stone: 20 },
        woodBonus: 1.3,
        buildTime: 100,
        health: 80,
        description: 'Augmente la production de bois de 30%.'
    },
    [BUILDING.MINE]: {
        name: 'Mine', icon: '⛏️',
        cost: { wood: 80, stone: 40 },
        miningBonus: 1.3,
        buildTime: 150,
        health: 100,
        description: 'Augmente la production de pierre et de fer de 30%.'
    },
    [BUILDING.PORT]: {
        name: 'Port', icon: '⚓',
        cost: { wood: 150, stone: 100 },
        buildTime: 200,
        health: 120,
        description: 'Permet de construire des bateaux pour pêcher et explorer.'
    },
    [BUILDING.WATCHTOWER]: {
        name: 'Tour de Guet', icon: '🗼',
        cost: { wood: 40, stone: 60 },
        visionRadius: 8,
        defenseBonus: 1.1,
        buildTime: 120,
        health: 100,
        description: 'Augmente la vision et offre un bonus défensif aux unités proches.'
    },
    [BUILDING.ARCHERY_RANGE]: {
        name: 'Camp d\'Archerie', icon: '🎯',
        cost: { wood: 70, stone: 30 },
        buildTime: 140,
        health: 100,
        description: 'Forme des archers. Les elfes y gagnent une portée accrue.'
    },
    [BUILDING.ROAD]: {
        name: 'Route', icon: '🟫',
        cost: { stone: 5 },
        speedBonus: 1.8,
        buildTime: 20,
        health: 50,
        description: 'Augmente la vitesse de déplacement de 80%.'
    },
    [BUILDING.WALL]: {
        name: 'Mur', icon: '🧱',
        cost: { stone: 15 },
        defenseBonus: 1.5,
        buildTime: 40,
        health: 200,
        description: 'Bloque le passage des ennemis. Palissade puis mur de pierre avec Maçonnerie.'
    },
    [BUILDING.TOWER]: {
        name: 'Tour de Défense', icon: '🏛️',
        cost: { stone: 80, iron: 30 },
        attackRange: 6,
        attackDamage: 8,
        buildTime: 180,
        health: 250,
        attackRangeElf: 8,
        attackRangeHuman: 6,
        description: 'Tire des flèches sur les ennemis. Elfes: portée 8. Humains: portée 6 mais +50% dégâts.'
    },
    [BUILDING.COLONY]: {
        name: 'Colonie', icon: '🏕️',
        cost: { wood: 150, stone: 100, food: 200 },
        territoryRadius: 5,
        popBonus: 10,
        buildTime: 300,
        health: 150,
        description: 'Étend le territoire et augmente la population max de 10.'
    },
    [BUILDING.MARKET]: {
        name: 'Marché', icon: '🪙',
        cost: { wood: 80, stone: 40, gold: 30 },
        goldBonus: 1.3,
        buildTime: 150,
        health: 100,
        description: 'Augmente la production d\'or de 30%. Centre commercial.'
    },
    [BUILDING.TEMPLE]: {
        name: 'Temple', icon: '⛪',
        cost: { wood: 60, stone: 100, gold: 50 },
        eventBonus: 1.2,
        buildTime: 200,
        health: 120,
        description: 'Augmente de 20% les chances d\'événements positifs.'
    },
    [BUILDING.GRANARY]: {
        name: 'Grenier', icon: '📦',
        cost: { wood: 70, stone: 30 },
        foodStorage: 500,
        foodPreservation: 0.9,
        buildTime: 120,
        health: 80,
        description: 'Stocke +500 nourriture et réduit les pertes hivernales de 10%.'
    }
};
