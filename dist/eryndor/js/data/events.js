import { UNIT_TYPE } from '../enums.js';

export const RANDOM_EVENTS = {
    // Positive events
    GOOD_HARVEST: {
        name: 'Récolte Abondante',
        icon: '🌾',
        type: 'success',
        description: 'Une récolte exceptionnelle!',
        chance: 0.15
    },
    GOLD_DISCOVERY: {
        name: 'Filon d\'Or',
        icon: '💰',
        type: 'success',
        description: 'Un filon d\'or a été découvert!',
        chance: 0.08
    },
    MIGRATION: {
        name: 'Vague de Migration',
        icon: '👥',
        type: 'success',
        description: 'Des réfugiés rejoignent votre royaume!',
        chance: 0.10
    },
    TECH_BREAKTHROUGH: {
        name: 'Percée Technologique',
        icon: '💡',
        type: 'success',
        description: 'Vos chercheurs ont fait une découverte!',
        chance: 0.10
    },
    BLESSING: {
        name: 'Bénédiction Divine',
        icon: '✨',
        type: 'success',
        description: 'Les dieux sourient à votre peuple!',
        chance: 0.05
    },

    // Negative events
    DROUGHT: {
        name: 'Sécheresse',
        icon: '🏜️',
        type: 'warning',
        description: 'Une sécheresse frappe vos terres!',
        chance: 0.12
    },
    EPIDEMIC: {
        name: 'Épidémie',
        icon: '🦠',
        type: 'danger',
        description: 'Une maladie se répand!',
        chance: 0.08
    },
    EARTHQUAKE: {
        name: 'Tremblement de Terre',
        icon: '🌋',
        type: 'danger',
        description: 'La terre tremble!',
        chance: 0.05
    },
    BANDIT_RAID: {
        name: 'Raid de Bandits',
        icon: '🗡️',
        type: 'warning',
        description: 'Des bandits pillent vos réserves!',
        chance: 0.10
    },
    FIRE: {
        name: 'Incendie',
        icon: '🔥',
        type: 'danger',
        description: 'Un incendie se déclare!',
        chance: 0.08
    },

    // Neutral / special events
    ANIMAL_MIGRATION: {
        name: 'Migration Animale',
        icon: '🦌',
        type: 'info',
        description: 'Des animaux arrivent dans la région!',
        chance: 0.12
    },
    RESOURCE_DISCOVERY: {
        name: 'Gisement Découvert',
        icon: '⛏️',
        type: 'info',
        description: 'Un nouveau gisement a été trouvé!',
        chance: 0.08
    },
    FACTION_REBIRTH: {
        name: 'Renaissance',
        icon: '🌅',
        type: 'event',
        description: 'Des survivants émergent des ruines!',
        chance: 1.0
    },

    // New v2 events
    SOLAR_ECLIPSE: {
        name: 'Éclipse Solaire',
        icon: '🌑',
        type: 'info',
        description: 'Le ciel s\'assombrit...',
        chance: 0.03
    },
    FOREIGN_TRADERS: {
        name: 'Marchands Étrangers',
        icon: '🏪',
        type: 'success',
        description: 'Des marchands apportent des biens rares!',
        chance: 0.08
    },
    HEROIC_BIRTH: {
        name: 'Naissance Héroïque',
        icon: '⭐',
        type: 'success',
        description: 'Un enfant aux talents exceptionnels est né!',
        chance: 0.04
    },
    VOLCANIC_ERUPTION: {
        name: 'Éruption Volcanique',
        icon: '🌋',
        type: 'danger',
        description: 'Un volcan entre en éruption!',
        chance: 0.02
    }
};

export const COMBAT_STATS = {
    [UNIT_TYPE.VILLAGER]: { attack: 5, defense: 5, range: 1, speed: 1 },
    [UNIT_TYPE.SOLDIER]: { attack: 15, defense: 12, range: 1, speed: 1 },
    [UNIT_TYPE.ARCHER]: { attack: 10, defense: 6, range: 5, speed: 1 },
    [UNIT_TYPE.CAVALRY]: { attack: 18, defense: 8, range: 1, speed: 2 },
    [UNIT_TYPE.SCOUT]: { attack: 6, defense: 4, range: 3, speed: 2.5 }
};

export const ANIMAL_TYPE = {
    SHEEP: { name: 'Mouton', icon: '🐑', food: 15, wool: 5, speed: 0.3, passive: true },
    COW: { name: 'Vache', icon: '🐄', food: 25, milk: 3, speed: 0.2, passive: true },
    CHICKEN: { name: 'Poule', icon: '🐔', food: 5, eggs: 2, speed: 0.4, passive: true },
    PIG: { name: 'Cochon', icon: '🐷', food: 20, speed: 0.25, passive: true },
    DEER: { name: 'Cerf', icon: '🦌', food: 18, speed: 0.5, passive: true, flees: true },
    FISH: { name: 'Poisson', icon: '🐟', food: 8, speed: 0.3, passive: true, aquatic: true }
};

export const TREATIES = {
    NON_AGGRESSION: {
        name: 'Pacte de Non-Agression',
        icon: '🕊️',
        duration: 5000,
        effect: 'Empêche les déclarations de guerre'
    },
    TRADE: {
        name: 'Accord Commercial',
        icon: '🤝',
        duration: 3000,
        effect: '+20% revenus or pour les deux factions'
    },
    ALLIANCE: {
        name: 'Alliance Défensive',
        icon: '⚔️',
        duration: 10000,
        effect: 'Défense mutuelle en cas d\'attaque'
    }
};
