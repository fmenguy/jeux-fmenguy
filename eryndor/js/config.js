export const CONFIG = {
    mapWidth: 80,
    mapHeight: 45,
    cellSize: 16,
    gameSpeed: 1,
    isPaused: false,
    ticksPerYear: 1200,
    ticksPerMonth: 100,
    currentTick: 0,
    foodPerVillagerPerTick: 0.008,
    maxAge: {
        human: { average: 75, min: 60, max: 110 },
        elf: { average: 1200, min: 800, max: 1500 }
    },
    starvationDamage: 3,
    birthFoodThreshold: 10,
    currentMonth: 0,
    monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    eventChance: 0.0003,
    lastEventTick: 0,
    eventCooldown: 1000,
    victoryTerritoryPercent: 75,
    victoryPopulation: 100,
    colonyMinDistance: 20,
    colonyMaxCount: 3,
    diplomacyEnabled: true
};
