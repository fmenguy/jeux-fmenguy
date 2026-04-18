import { CONFIG } from '../config.js';
import { BUILDING, JOB, UNIT_TYPE } from '../enums.js';
import { TECH_TREE } from '../data/tech-tree.js';
import { evaluateSituation, scanThreats } from './analyzers.js';

const BUILDING_NAME = {
    [BUILDING.HOUSE]: 'HOUSE', [BUILDING.FARM]: 'FARM', [BUILDING.CASTLE]: 'CASTLE',
    [BUILDING.BARRACKS]: 'BARRACKS', [BUILDING.FORGE]: 'FORGE', [BUILDING.SAWMILL]: 'SAWMILL',
    [BUILDING.MINE]: 'MINE', [BUILDING.PORT]: 'PORT', [BUILDING.WATCHTOWER]: 'WATCHTOWER',
    [BUILDING.ARCHERY_RANGE]: 'ARCHERY_RANGE', [BUILDING.ROAD]: 'ROAD', [BUILDING.WALL]: 'WALL',
    [BUILDING.TOWER]: 'TOWER', [BUILDING.COLONY]: 'COLONY', [BUILDING.MARKET]: 'MARKET',
    [BUILDING.TEMPLE]: 'TEMPLE', [BUILDING.GRANARY]: 'GRANARY'
};

const SEASON_NAMES = ['hiver', 'printemps', 'été', 'automne'];

/**
 * Build a compact JSON snapshot the agent consumes as the user message.
 * Aim: under ~2 kB, only strategically-relevant info, no raw arrays.
 */
export function buildAgentState({ faction, game, turn, recentEvents = [], invalidLastTurn = [] }) {
    const enemy = game.factions.find(f => f.id !== faction.id);
    const map = game.map;

    const situation = evaluateSituation(faction, game);
    const threatReport = scanThreats(faction, game);

    const totalTiles = map.width * map.height;
    const territoryPercent = Math.round((situation.territorySize / totalTiles) * 1000) / 10;

    const alive = faction.villagers.filter(v => v.isAlive);
    const jobBreakdown = {};
    for (const j of Object.values(JOB)) jobBreakdown[j] = 0;
    alive.forEach(v => { jobBreakdown[v.job] = (jobBreakdown[v.job] || 0) + 1; });

    const buildings = {};
    for (const b of faction.buildings) {
        const key = BUILDING_NAME[b.type] || `type_${b.type}`;
        buildings[key] = (buildings[key] || 0) + 1;
    }

    const enemyAlive = enemy ? enemy.villagers.filter(v => v.isAlive) : [];
    const enemyMilitary = enemyAlive.filter(v => v.unitType !== UNIT_TYPE.VILLAGER).length;

    const pendingTechs = listPendingTechs(faction);

    return {
        turn,
        tick: CONFIG.currentTick,
        year: Math.floor(CONFIG.currentTick / CONFIG.ticksPerYear) + 1,
        season: SEASON_NAMES[seasonOfMonth(CONFIG.currentMonth)],
        month: CONFIG.monthNames[CONFIG.currentMonth],

        me: {
            faction: faction.type,
            resources: roundResources(faction.resources),
            population: alive.length,
            housingCap: situation.housingCap,
            jobs: jobBreakdown,
            militaryUnits: faction.militaryUnits || alive.filter(v => v.unitType !== UNIT_TYPE.VILLAGER).length,
            buildings,
            researchedTechs: faction.completedTechs || [],
            currentResearch: faction.currentResearch
                ? {
                    id: faction.currentResearch.id,
                    progress: Math.round((faction.researchProgress / faction.currentResearch.duration) * 100) / 100
                }
                : null,
            availableTechs: pendingTechs,
            territorySize: situation.territorySize,
            territoryPercent,
            atWar: !!(faction.warState && faction.warState.isAtWar)
        },

        enemy: enemy ? {
            faction: enemy.type,
            approxPopulation: enemyAlive.length,
            approxMilitary: enemyMilitary,
            territorySize: countTerritory(enemy, map),
            knownTechs: (enemy.completedTechs || []).slice(-5),
            atWar: !!(enemy.warState && enemy.warState.isAtWar)
        } : null,

        situation: {
            foodSecurity: situation.foodSecurity,
            militaryRatio: situation.militaryRatio,
            economyScore: situation.economyScore,
            populationRatio: situation.populationRatio,
            underAttack: situation.underAttack,
            hasBarracks: situation.hasBarracks,
            hasArcheryRange: situation.hasArcheryRange,
            hasMarket: situation.hasMarket,
            farms: situation.farms
        },

        threats: {
            maxThreat: threatReport.maxThreat,
            primaryDirection: threatReport.primaryThreat ? threatReport.primaryThreat.direction : null,
            primaryIntruders: threatReport.primaryThreat ? threatReport.primaryThreat.intruders : 0
        },

        victoryProgress: {
            territoryPercent,
            population: alive.length,
            winThresholds: {
                territoryPercent: CONFIG.victoryTerritoryPercent,
                population: CONFIG.victoryPopulation
            }
        },

        recentEvents: recentEvents.slice(-8),
        invalidActionsLastTurn: invalidLastTurn
    };
}

function roundResources(r) {
    const out = {};
    for (const k of Object.keys(r)) {
        out[k] = Math.round(r[k] || 0);
    }
    return out;
}

function countTerritory(faction, map) {
    let c = 0;
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            if (map.territory[y][x] === faction.id) c++;
        }
    }
    return c;
}

function seasonOfMonth(month) {
    if (month >= 2 && month <= 4) return 1;
    if (month >= 5 && month <= 7) return 2;
    if (month >= 8 && month <= 10) return 3;
    return 0;
}

function listPendingTechs(faction) {
    const done = new Set(faction.completedTechs || []);
    const out = [];
    Object.values(TECH_TREE).forEach(cat => {
        cat.techs.forEach(t => {
            if (done.has(t.id)) return;
            const unmet = (t.prerequisites || []).filter(p => !done.has(p));
            out.push({
                id: t.id,
                cost: t.cost,
                duration: t.duration,
                prereqOk: unmet.length === 0,
                missing: unmet
            });
        });
    });
    return out;
}
