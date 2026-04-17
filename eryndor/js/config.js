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
    diplomacyEnabled: true,

    // Duel IA - scheduling & budgets
    turnInterval: 300,
    agentMockMode: false,
    apiKey: null,
    agentDefaults: {
        humans: { model: 'claude-sonnet-4-6', maxTokens: 1400, maxToolCalls: 6, timeoutMs: 20000 },
        elves:  { model: 'claude-haiku-4-5-20251001', maxTokens: 1400, maxToolCalls: 6, timeoutMs: 20000 }
    },

    // Tarifs Anthropic USD / million de tokens (mise à jour 2026-04).
    modelPricing: {
        'claude-opus-4-7':            { in: 15,  out: 75, label: 'Opus 4.7' },
        'claude-sonnet-4-6':          { in: 3,   out: 15, label: 'Sonnet 4.6' },
        'claude-haiku-4-5-20251001':  { in: 1,   out: 5,  label: 'Haiku 4.5' }
    }
};
