import { BUILDING, UNIT_TYPE, JOB, DIPLOMACY_STATUS } from '../enums.js';
import { CONFIG } from '../config.js';
import { BUILDING_CONFIG } from '../data/buildings.js';

/**
 * Read-only analyzers used to summarize a faction's situation and the
 * threats it faces. These produce data consumed by the agent's state
 * snapshot; they do not take any action on the game state.
 *
 * Extracted from the former js/ai/strategic-planner.js (evaluate) and
 * js/ai/threat-assessor.js (scan), without the priority-weight deciders.
 */

export function evaluateSituation(faction, game) {
    const enemy = getPrimaryEnemy(faction, game);
    const aliveVillagers = faction.villagers.filter(v => v.isAlive);
    const enemyAlive = enemy ? enemy.villagers.filter(v => v.isAlive) : [];
    const pop = aliveVillagers.length;
    const enemyPop = enemyAlive.length || 1;

    const militaryPower = calcMilitaryPower(faction);
    const enemyMilitaryPower = enemy ? calcMilitaryPower(enemy) : 0;

    const foodPerTick = pop * CONFIG.foodPerVillagerPerTick;
    const foodSecurity = foodPerTick > 0
        ? faction.resources.food / (foodPerTick * 300)
        : 999;

    return {
        foodSecurity: Math.round(Math.min(foodSecurity, 5) * 100) / 100,
        militaryStrength: militaryPower,
        enemyMilitary: enemyMilitaryPower,
        militaryRatio: enemyMilitaryPower > 0
            ? Math.round((militaryPower / enemyMilitaryPower) * 100) / 100
            : 2,
        economyScore: Math.round(calcEconomyScore(faction) * 100) / 100,
        territorySize: getTerritorySize(faction, game),
        techLevel: (faction.completedTechs || []).length,
        enemyTechLevel: enemy ? (enemy.completedTechs || []).length : 0,
        populationRatio: Math.round((pop / enemyPop) * 100) / 100,
        population: pop,
        housingCap: getHousingCap(faction),
        underAttack: isUnderAttack(faction, game),
        hasBarracks: faction.buildings.some(b => b.type === BUILDING.BARRACKS),
        hasArcheryRange: faction.buildings.some(b => b.type === BUILDING.ARCHERY_RANGE),
        hasMarket: faction.buildings.some(b => b.type === BUILDING.MARKET),
        farms: faction.buildings.filter(b => b.type === BUILDING.FARM).length
    };
}

export function scanThreats(faction, game) {
    const map = game.map;
    const enemies = (game.factions || []).filter(f => f.id !== faction.id);

    if (enemies.length === 0 || !map) {
        return { threats: [], maxThreat: 0, primaryThreat: null };
    }

    const ourPower = calcMilitaryPower(faction);
    const ourCenter = factionCenter(faction, map);
    const threats = [];

    for (const enemy of enemies) {
        const enemyPower = calcMilitaryPower(enemy);
        const enemyCenter = factionCenter(enemy, map);

        const militaryRatio = ourPower > 0
            ? enemyPower / ourPower
            : (enemyPower > 0 ? 5 : 0);

        const dx = enemyCenter.x - ourCenter.x;
        const dy = enemyCenter.y - ourCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const proximityFactor = Math.max(0.1, 1 / (distance / 10));

        const borderPressure = calcBorderPressure(faction, enemy, map);
        const borderFactor = borderPressure / 10;

        const intrusionBonus = countIntruders(faction, enemy, map);

        let diplomacyMod = 1.0;
        if (faction.warState && faction.warState.isAtWar && faction.warState.enemyId === enemy.id) {
            diplomacyMod = 2.0;
        }

        const score = (
            militaryRatio * 0.35 +
            proximityFactor * 0.20 +
            borderFactor * 0.15 +
            intrusionBonus * 0.30
        ) * diplomacyMod;

        threats.push({
            factionId: enemy.id,
            score: Math.round(score * 100) / 100,
            direction: angleToCardinal(Math.atan2(dy, dx)),
            militaryRatio: Math.round(militaryRatio * 100) / 100,
            distance: Math.round(distance),
            borderPressure,
            intruders: Math.round(intrusionBonus * 10) / 10,
            enemyCenter: { x: Math.round(enemyCenter.x), y: Math.round(enemyCenter.y) }
        });
    }

    threats.sort((a, b) => b.score - a.score);

    return {
        threats,
        maxThreat: threats.length > 0 ? threats[0].score : 0,
        primaryThreat: threats.length > 0 ? threats[0] : null
    };
}

// --------------------------------------------------------------------- //

function getPrimaryEnemy(faction, game) {
    if (!game.factions) return null;
    return game.factions.find(f => f.id !== faction.id) || null;
}

function calcMilitaryPower(faction) {
    let power = 0;
    for (const v of faction.villagers) {
        if (!v.isAlive) continue;
        if (v.unitType === UNIT_TYPE.SOLDIER) power += 3;
        else if (v.unitType === UNIT_TYPE.ARCHER) power += 2.5;
        else if (v.unitType === UNIT_TYPE.CAVALRY) power += 4;
        else if (v.unitType === UNIT_TYPE.SCOUT) power += 1.5;
        else if (v.job === JOB.WARRIOR) power += 1.5;
        else if (v.job === JOB.HUNTER) power += 1;
    }
    for (const b of faction.buildings) {
        if (b.type === BUILDING.TOWER) power += 5;
        else if (b.type === BUILDING.WATCHTOWER) power += 2;
        else if (b.type === BUILDING.WALL) power += 0.5;
        else if (b.type === BUILDING.BARRACKS) power += 2;
    }
    return Math.round(power * 10) / 10;
}

function calcEconomyScore(faction) {
    const r = faction.resources;
    return (
        (r.food || 0) * 0.3 +
        (r.wood || 0) * 0.2 +
        (r.stone || 0) * 0.2 +
        (r.iron || 0) * 0.15 +
        (r.gold || 0) * 0.15
    ) / 50;
}

function getTerritorySize(faction, game) {
    const map = game.map;
    if (!map || !map.territory) return 0;
    let count = 0;
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            if (map.territory[y][x] === faction.id) count++;
        }
    }
    return count;
}

function getHousingCap(faction) {
    let cap = 10;
    for (const b of faction.buildings) {
        const cfg = BUILDING_CONFIG[b.type];
        if (cfg && cfg.popBonus) cap += cfg.popBonus;
    }
    return cap;
}

function isUnderAttack(faction, game) {
    const map = game.map;
    if (!map) return false;
    const enemies = (game.factions || []).filter(f => f.id !== faction.id);
    for (const enemy of enemies) {
        for (const v of enemy.villagers) {
            if (!v.isAlive) continue;
            const tx = Math.floor(v.x);
            const ty = Math.floor(v.y);
            if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
                if (map.territory[ty][tx] === faction.id) {
                    if (v.unitType !== UNIT_TYPE.VILLAGER || v.job === JOB.WARRIOR) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function factionCenter(faction, map) {
    const alive = faction.villagers.filter(v => v.isAlive);
    if (alive.length === 0) {
        return { x: CONFIG.mapWidth / 2, y: CONFIG.mapHeight / 2 };
    }
    let sx = 0, sy = 0;
    for (const v of alive) { sx += v.x; sy += v.y; }
    return { x: sx / alive.length, y: sy / alive.length };
}

function calcBorderPressure(faction, enemy, map) {
    let pressure = 0;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let y = 0; y < map.height; y += 2) {
        for (let x = 0; x < map.width; x += 2) {
            if (map.territory[y][x] !== faction.id) continue;
            for (const [dx, dy] of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
                if (map.territory[ny][nx] === enemy.id) {
                    pressure++;
                    break;
                }
            }
        }
    }
    return pressure;
}

function countIntruders(faction, enemy, map) {
    let count = 0;
    for (const v of enemy.villagers) {
        if (!v.isAlive) continue;
        const tx = Math.floor(v.x);
        const ty = Math.floor(v.y);
        if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;
        if (map.territory[ty][tx] === faction.id) {
            if (v.unitType !== UNIT_TYPE.VILLAGER) count += 2;
            else if (v.job === JOB.WARRIOR || v.job === JOB.HUNTER) count += 1;
            else count += 0.3;
        }
    }
    return Math.min(count, 10);
}

function angleToCardinal(radians) {
    const deg = ((radians * 180 / Math.PI) + 360) % 360;
    if (deg < 22.5 || deg >= 337.5) return 'est';
    if (deg < 67.5) return 'sud-est';
    if (deg < 112.5) return 'sud';
    if (deg < 157.5) return 'sud-ouest';
    if (deg < 202.5) return 'ouest';
    if (deg < 247.5) return 'nord-ouest';
    if (deg < 292.5) return 'nord';
    return 'nord-est';
}
