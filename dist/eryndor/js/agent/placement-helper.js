import { TERRAIN, BUILDING } from '../enums.js';
import { CONFIG } from '../config.js';

/**
 * Given a building type and an optional placement hint, find the best
 * tile within the faction's territory that satisfies the hint and is a
 * valid build location. Returns null if no tile qualifies.
 *
 * Supported hints:
 *   "near_water", "near_forest", "near_iron", "near_stone",
 *   "border", "center", "cluster", "between_me_and_enemy",
 *   null / undefined -> neutral scoring near the faction center.
 *
 * This is a pure scoring helper extracted from the former
 * BuildingPlanner. It does NOT mutate game state; the caller (the
 * action-executor) handles resource deduction and map updates.
 */
export function findPlacement(faction, buildingType, game, hint) {
    const map = game.map;
    if (!map) return null;

    if (buildingType === BUILDING.PORT) {
        return findPortLocation(faction, map);
    }

    const center = factionCenter(faction, map);
    const enemyCenter = enemyCenterOf(faction, game, map);

    let bestPos = null;
    let bestScore = -Infinity;
    const step = buildingType === BUILDING.ROAD ? 2 : 1;

    for (let y = 0; y < map.height; y += step) {
        for (let x = 0; x < map.width; x += step) {
            if (map.territory[y][x] !== faction.id) continue;
            if (!map.isValidBuildLocation(x, y)) continue;

            const score = scorePlacement(
                x, y, buildingType, hint, center, enemyCenter, faction, map
            );
            if (score > bestScore) {
                bestScore = score;
                bestPos = { x, y };
            }
        }
    }

    return bestPos;
}

function scorePlacement(x, y, type, hint, center, enemyCenter, faction, map) {
    const distToCenter = Math.sqrt((x - center.x) ** 2 + (y - center.y) ** 2);
    const distToEnemy = enemyCenter
        ? Math.sqrt((x - enemyCenter.x) ** 2 + (y - enemyCenter.y) ** 2)
        : 999;

    let score = typeDefaultScore(x, y, type, center, enemyCenter, faction, map,
                                  distToCenter, distToEnemy);

    if (hint) {
        score += hintBonus(x, y, hint, center, enemyCenter, faction, map,
                           distToCenter, distToEnemy);
    }

    score += Math.random() * 2;
    return score;
}

function typeDefaultScore(x, y, type, center, enemyCenter, faction, map,
                          distToCenter, distToEnemy) {
    switch (type) {
        case BUILDING.FARM: {
            const waterDist = distToNearestTerrain(x, y, TERRAIN.WATER, map, 8);
            let s = 20 - distToCenter * 0.5 - waterDist * 2;
            const nearFarm = faction.buildings.some(b =>
                b.type === BUILDING.FARM && Math.abs(b.x - x) + Math.abs(b.y - y) < 5
            );
            if (nearFarm) s += 5;
            return s;
        }
        case BUILDING.HOUSE: {
            let s = 30 - distToCenter * 1.0;
            const nearBuilding = faction.buildings.some(b =>
                Math.abs(b.x - x) + Math.abs(b.y - y) < 4
            );
            if (nearBuilding) s += 10;
            return s;
        }
        case BUILDING.BARRACKS:
        case BUILDING.ARCHERY_RANGE: {
            if (enemyCenter) {
                const midX = (center.x + enemyCenter.x) / 2;
                const midY = (center.y + enemyCenter.y) / 2;
                const distToMid = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2);
                return 20 - distToMid * 0.5 - distToCenter * 0.3;
            }
            return 20 - distToCenter * 0.5;
        }
        case BUILDING.TOWER:
        case BUILDING.WATCHTOWER: {
            const isBorder = isBorderTile(x, y, faction.id, map);
            let s = isBorder ? 30 : 5;
            s -= distToCenter * 0.2;
            if (enemyCenter) s -= distToEnemy * 0.1;
            const nearTower = faction.buildings.some(b =>
                (b.type === BUILDING.TOWER || b.type === BUILDING.WATCHTOWER) &&
                Math.abs(b.x - x) + Math.abs(b.y - y) < 6
            );
            if (nearTower) s -= 15;
            return s;
        }
        case BUILDING.WALL: {
            return isBorderTile(x, y, faction.id, map) ? 25 : 0;
        }
        case BUILDING.MARKET:
        case BUILDING.GRANARY:
        case BUILDING.TEMPLE: {
            return 30 - distToCenter * 1.5;
        }
        case BUILDING.FORGE:
        case BUILDING.MINE: {
            const ironDist = distToNearestTerrain(x, y, TERRAIN.IRON, map, 10);
            const stoneDist = distToNearestTerrain(x, y, TERRAIN.STONE, map, 10);
            return 20 - Math.min(ironDist, stoneDist) * 2 - distToCenter * 0.3;
        }
        case BUILDING.SAWMILL: {
            const forestDist = distToNearestTerrain(x, y, TERRAIN.FOREST, map, 10);
            return 20 - forestDist * 2 - distToCenter * 0.3;
        }
        case BUILDING.COLONY: {
            let s = distToCenter * 0.5 - Math.max(0, 15 - distToEnemy) * 2;
            const nearColony = faction.buildings.some(b =>
                b.type === BUILDING.COLONY &&
                Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2) < CONFIG.colonyMinDistance
            );
            if (nearColony) s = -999;
            return s;
        }
        case BUILDING.ROAD: {
            return 10 - distToCenter * 0.5;
        }
        default:
            return 15 - distToCenter * 0.5;
    }
}

function hintBonus(x, y, hint, center, enemyCenter, faction, map, distToCenter, distToEnemy) {
    switch (hint) {
        case 'near_water':
            return 30 - distToNearestTerrain(x, y, TERRAIN.WATER, map, 10) * 3;
        case 'near_forest':
            return 30 - distToNearestTerrain(x, y, TERRAIN.FOREST, map, 10) * 3;
        case 'near_iron':
            return 30 - distToNearestTerrain(x, y, TERRAIN.IRON, map, 10) * 3;
        case 'near_stone':
            return 30 - distToNearestTerrain(x, y, TERRAIN.STONE, map, 10) * 3;
        case 'border':
            return isBorderTile(x, y, faction.id, map) ? 40 : -20;
        case 'center':
            return 40 - distToCenter * 2;
        case 'cluster': {
            const near = faction.buildings.some(b =>
                Math.abs(b.x - x) + Math.abs(b.y - y) < 4
            );
            return near ? 30 : -10;
        }
        case 'between_me_and_enemy': {
            if (!enemyCenter) return 0;
            const midX = (center.x + enemyCenter.x) / 2;
            const midY = (center.y + enemyCenter.y) / 2;
            const distToMid = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2);
            return 40 - distToMid * 2;
        }
        default:
            return 0;
    }
}

function factionCenter(faction, map) {
    const alive = faction.villagers.filter(v => v.isAlive);
    if (alive.length === 0) {
        return { x: faction.startX, y: faction.startY };
    }
    let sx = 0, sy = 0;
    for (const v of alive) { sx += v.x; sy += v.y; }
    return { x: sx / alive.length, y: sy / alive.length };
}

function enemyCenterOf(faction, game, map) {
    const enemy = (game.factions || []).find(f => f.id !== faction.id);
    if (!enemy) return null;
    return factionCenter(enemy, map);
}

function isBorderTile(x, y, factionId, map) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) return true;
        if (map.territory[ny][nx] !== factionId) return true;
    }
    return false;
}

function distToNearestTerrain(x, y, terrainType, map, radius) {
    let minDist = radius + 1;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
            if (map.terrain[ny][nx] === terrainType) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) minDist = dist;
            }
        }
    }
    return minDist;
}

function findPortLocation(faction, map) {
    let bestPos = null;
    let bestScore = -Infinity;
    const center = factionCenter(faction, map);

    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            if (!map.canBuildPort(x, y, faction.id)) continue;
            const dist = Math.sqrt((x - center.x) ** 2 + (y - center.y) ** 2);
            const score = 30 - dist * 0.5 + Math.random() * 5;
            if (score > bestScore) {
                bestScore = score;
                bestPos = { x, y };
            }
        }
    }
    return bestPos;
}
