import { TERRAIN, BUILDING, UNIT_TYPE, JOB } from '../enums.js';
import { CONFIG } from '../config.js';
import { BUILDING_CONFIG } from '../data/buildings.js';
import { eventBus } from '../event-bus.js';

/**
 * BuildingPlanner - Decides WHAT to build and WHERE to place it.
 *
 * Scoring: each building type receives a score based on current priorities
 * and the faction's situation.  The highest-scoring affordable building wins.
 *
 * Placement: different building types prefer different locations:
 *   FARM        -> near water or existing farms
 *   TOWER/WALL  -> on the border facing the primary threat
 *   MARKET      -> near the town center / castle
 *   HOUSE       -> near existing buildings (cluster)
 *   BARRACKS    -> between our center and the enemy
 *   PORT        -> adjacent to deep water
 */
export class BuildingPlanner {

    constructor() {
        this._lastBuildTick = -999;
        this._buildCooldown = 60; // ticks between build orders
    }

    // ------------------------------------------------------------------ //
    //  Public API
    // ------------------------------------------------------------------ //

    update(faction, game, priorities) {
        const tick = CONFIG.currentTick || 0;
        if (tick - this._lastBuildTick < this._buildCooldown) return;

        const map = game.map || game.gameMap;
        if (!map) return;

        const situation = this._quickSituation(faction, map);

        // Score each candidate building type
        const candidates = this._scoreCandidates(faction, priorities, situation);

        // Sort by descending score and try the best one we can afford
        candidates.sort((a, b) => b.score - a.score);

        for (const candidate of candidates) {
            if (candidate.score <= 0) break;
            if (!this._canAfford(faction, candidate.type)) continue;

            const pos = this.findOptimalPlacement(faction, candidate.type, game, priorities);
            if (!pos) continue;

            // Deduct cost
            const cost = BUILDING_CONFIG[candidate.type].cost;
            for (const [res, amount] of Object.entries(cost)) {
                faction.resources[res] = (faction.resources[res] || 0) - amount;
            }

            // Place the building on the map
            map.buildings[pos.y][pos.x] = {
                type: candidate.type,
                faction: faction.id,
                health: BUILDING_CONFIG[candidate.type].health || 100,
                buildProgress: 0,
                maxBuildProgress: BUILDING_CONFIG[candidate.type].buildTime || 100
            };

            // Register in faction's building list
            faction.buildings.push({
                type: candidate.type,
                x: pos.x,
                y: pos.y,
                health: BUILDING_CONFIG[candidate.type].health || 100,
                buildProgress: 0,
                maxBuildProgress: BUILDING_CONFIG[candidate.type].buildTime || 100
            });

            this._lastBuildTick = tick;

            eventBus.emit('building-placed', {
                faction: faction.id,
                type: candidate.type,
                x: pos.x,
                y: pos.y
            });

            break; // one building per update
        }
    }

    // ------------------------------------------------------------------ //
    //  Scoring
    // ------------------------------------------------------------------ //

    _scoreCandidates(faction, priorities, situation) {
        const { foodSecurity, pop, housingCap, hasBarracks, hasFarms, hasMarket,
                hasGranary, hasForge, hasSawmill, hasMine, hasTemple, towerCount } = situation;

        const candidates = [];

        // FARM
        candidates.push({
            type: BUILDING.FARM,
            score: priorities.economy * 10 * (foodSecurity < 1 ? 3 : 1)
                   * (hasFarms < 2 ? 2 : 1)
        });

        // HOUSE - critical if at housing cap
        candidates.push({
            type: BUILDING.HOUSE,
            score: priorities.growth * 10 * (pop >= housingCap - 1 ? 5 : 0.5)
        });

        // BARRACKS
        candidates.push({
            type: BUILDING.BARRACKS,
            score: priorities.military * 10 * (!hasBarracks ? 3 : 0.5)
        });

        // ARCHERY_RANGE - especially valued by elves
        const factionConfig = faction.type || (faction.villagers[0] && faction.villagers[0].factionType);
        const isElf = factionConfig === 'elf';
        candidates.push({
            type: BUILDING.ARCHERY_RANGE,
            score: priorities.military * 8 * (isElf ? 2 : 1)
                   * (hasBarracks ? 1 : 0.2)
        });

        // TOWER - defensive
        candidates.push({
            type: BUILDING.TOWER,
            score: priorities.defend * 10 * (towerCount < 3 ? 2 : 0.5)
        });

        // WALL
        candidates.push({
            type: BUILDING.WALL,
            score: priorities.defend * 8
        });

        // WATCHTOWER - vision
        candidates.push({
            type: BUILDING.WATCHTOWER,
            score: priorities.defend * 6 * (towerCount < 2 ? 2 : 0.5)
        });

        // MARKET
        candidates.push({
            type: BUILDING.MARKET,
            score: priorities.economy * 6 * (!hasMarket ? 3 : 0)
        });

        // GRANARY
        candidates.push({
            type: BUILDING.GRANARY,
            score: priorities.economy * 7 * (!hasGranary ? 2 : 0)
                   * (foodSecurity < 1.5 ? 2 : 0.5)
        });

        // FORGE
        candidates.push({
            type: BUILDING.FORGE,
            score: priorities.military * 6 * (!hasForge ? 2 : 0)
        });

        // SAWMILL
        candidates.push({
            type: BUILDING.SAWMILL,
            score: priorities.economy * 5 * (!hasSawmill ? 2 : 0)
        });

        // MINE
        candidates.push({
            type: BUILDING.MINE,
            score: priorities.economy * 5 * (!hasMine ? 2 : 0)
        });

        // TEMPLE
        candidates.push({
            type: BUILDING.TEMPLE,
            score: priorities.research * 4 * (!hasTemple ? 2 : 0)
                   * (pop > 15 ? 1 : 0.2)
        });

        // PORT - only if water is nearby
        candidates.push({
            type: BUILDING.PORT,
            score: priorities.economy * 4
                   * (!faction.buildings.some(b => b.type === BUILDING.PORT) ? 2 : 0)
        });

        // COLONY - late game expansion
        candidates.push({
            type: BUILDING.COLONY,
            score: priorities.expand * 8
                   * (pop > 20 ? 1.5 : 0.1)
                   * (faction.buildings.filter(b => b.type === BUILDING.COLONY).length < CONFIG.colonyMaxCount ? 1 : 0)
        });

        // ROAD - low priority, nice to have
        candidates.push({
            type: BUILDING.ROAD,
            score: priorities.economy * 2
        });

        return candidates;
    }

    // ------------------------------------------------------------------ //
    //  Placement
    // ------------------------------------------------------------------ //

    /**
     * Search territory tiles and score each position for this building type.
     * Returns best { x, y } or null if no valid spot.
     */
    findOptimalPlacement(faction, buildingType, game, priorities) {
        const map = game.map || game.gameMap;
        if (!map) return null;

        // Special case: PORT requires specific water adjacency
        if (buildingType === BUILDING.PORT) {
            return this._findPortLocation(faction, map);
        }

        const center = this._factionCenter(faction, map);
        const enemyCenter = this._enemyCenter(faction, game, map);

        let bestPos = null;
        let bestScore = -Infinity;

        // Scan only territory tiles (sampled for performance)
        const step = buildingType === BUILDING.ROAD ? 3 : 1;

        for (let y = 0; y < map.height; y += step) {
            for (let x = 0; x < map.width; x += step) {
                if (map.territory[y][x] !== faction.id) continue;
                if (!map.isValidBuildLocation(x, y)) continue;

                const score = this._scorePlacement(x, y, buildingType, center, enemyCenter, faction, map);
                if (score > bestScore) {
                    bestScore = score;
                    bestPos = { x, y };
                }
            }
        }

        return bestPos;
    }

    _scorePlacement(x, y, type, center, enemyCenter, faction, map) {
        const distToCenter = Math.sqrt((x - center.x) ** 2 + (y - center.y) ** 2);
        const distToEnemy  = enemyCenter
            ? Math.sqrt((x - enemyCenter.x) ** 2 + (y - enemyCenter.y) ** 2)
            : 999;

        let score = 0;

        switch (type) {
            case BUILDING.FARM: {
                // Prefer near water and near center
                const waterDist = this._distToNearestTerrain(x, y, TERRAIN.WATER, map, 8);
                score = 20 - distToCenter * 0.5 - waterDist * 2;
                // Cluster with other farms slightly
                const nearFarm = faction.buildings.some(b =>
                    b.type === BUILDING.FARM && Math.abs(b.x - x) + Math.abs(b.y - y) < 5
                );
                if (nearFarm) score += 5;
                break;
            }

            case BUILDING.HOUSE: {
                // Near existing buildings, close to center
                score = 30 - distToCenter * 1.0;
                const nearBuilding = faction.buildings.some(b =>
                    Math.abs(b.x - x) + Math.abs(b.y - y) < 4
                );
                if (nearBuilding) score += 10;
                break;
            }

            case BUILDING.BARRACKS:
            case BUILDING.ARCHERY_RANGE: {
                // Between center and enemy, not too far from center
                if (enemyCenter) {
                    const midX = (center.x + enemyCenter.x) / 2;
                    const midY = (center.y + enemyCenter.y) / 2;
                    const distToMid = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2);
                    score = 20 - distToMid * 0.5 - distToCenter * 0.3;
                } else {
                    score = 20 - distToCenter * 0.5;
                }
                break;
            }

            case BUILDING.TOWER:
            case BUILDING.WATCHTOWER: {
                // On border facing enemy
                const isBorder = this._isBorderTile(x, y, faction.id, map);
                score = isBorder ? 30 : 5;
                score -= distToCenter * 0.2;
                // Prefer direction toward enemy
                if (enemyCenter) {
                    const toEnemyDist = Math.sqrt((x - enemyCenter.x) ** 2 + (y - enemyCenter.y) ** 2);
                    score += (distToEnemy < distToCenter + 5) ? 10 : 0;
                    score -= toEnemyDist * 0.1;
                }
                // Spread towers apart
                const nearTower = faction.buildings.some(b =>
                    (b.type === BUILDING.TOWER || b.type === BUILDING.WATCHTOWER) &&
                    Math.abs(b.x - x) + Math.abs(b.y - y) < 6
                );
                if (nearTower) score -= 15;
                break;
            }

            case BUILDING.WALL: {
                // Border tiles
                const isBorder = this._isBorderTile(x, y, faction.id, map);
                score = isBorder ? 25 : 0;
                break;
            }

            case BUILDING.MARKET:
            case BUILDING.GRANARY:
            case BUILDING.TEMPLE: {
                // Near center
                score = 30 - distToCenter * 1.5;
                break;
            }

            case BUILDING.FORGE:
            case BUILDING.MINE: {
                // Near iron/stone deposits
                const ironDist = this._distToNearestTerrain(x, y, TERRAIN.IRON, map, 10);
                const stoneDist = this._distToNearestTerrain(x, y, TERRAIN.STONE, map, 10);
                score = 20 - Math.min(ironDist, stoneDist) * 2 - distToCenter * 0.3;
                break;
            }

            case BUILDING.SAWMILL: {
                // Near forests
                const forestDist = this._distToNearestTerrain(x, y, TERRAIN.FOREST, map, 10);
                score = 20 - forestDist * 2 - distToCenter * 0.3;
                break;
            }

            case BUILDING.COLONY: {
                // Far from center but not too close to enemy
                score = distToCenter * 0.5 - Math.max(0, 15 - distToEnemy) * 2;
                // Must be far from existing colonies
                const nearColony = faction.buildings.some(b =>
                    b.type === BUILDING.COLONY &&
                    Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2) < CONFIG.colonyMinDistance
                );
                if (nearColony) score = -999;
                break;
            }

            case BUILDING.ROAD: {
                // Between buildings
                score = 10 - distToCenter * 0.5;
                break;
            }

            default:
                score = 15 - distToCenter * 0.5;
                break;
        }

        // Small random jitter so placements feel natural
        score += Math.random() * 3;

        return score;
    }

    // ------------------------------------------------------------------ //
    //  Helpers
    // ------------------------------------------------------------------ //

    _quickSituation(faction, map) {
        const alive = faction.villagers.filter(v => v.isAlive);
        const pop = alive.length;
        let housingCap = 10;
        let hasFarms = 0, hasBarracks = false, hasMarket = false;
        let hasGranary = false, hasForge = false, hasSawmill = false;
        let hasMine = false, hasTemple = false, towerCount = 0;

        for (const b of faction.buildings) {
            const cfg = BUILDING_CONFIG[b.type];
            if (cfg && cfg.popBonus) housingCap += cfg.popBonus;
            if (b.type === BUILDING.FARM) hasFarms++;
            if (b.type === BUILDING.BARRACKS) hasBarracks = true;
            if (b.type === BUILDING.MARKET) hasMarket = true;
            if (b.type === BUILDING.GRANARY) hasGranary = true;
            if (b.type === BUILDING.FORGE) hasForge = true;
            if (b.type === BUILDING.SAWMILL) hasSawmill = true;
            if (b.type === BUILDING.MINE) hasMine = true;
            if (b.type === BUILDING.TEMPLE) hasTemple = true;
            if (b.type === BUILDING.TOWER || b.type === BUILDING.WATCHTOWER) towerCount++;
        }

        const foodPerTick = pop * CONFIG.foodPerVillagerPerTick;
        const foodSecurity = foodPerTick > 0
            ? faction.resources.food / (foodPerTick * 300)
            : 999;

        return {
            pop, housingCap, foodSecurity, hasFarms, hasBarracks, hasMarket,
            hasGranary, hasForge, hasSawmill, hasMine, hasTemple, towerCount
        };
    }

    _canAfford(faction, buildingType) {
        const cfg = BUILDING_CONFIG[buildingType];
        if (!cfg || !cfg.cost) return false;
        for (const [res, amount] of Object.entries(cfg.cost)) {
            if ((faction.resources[res] || 0) < amount) return false;
        }
        return true;
    }

    _factionCenter(faction, map) {
        const alive = faction.villagers.filter(v => v.isAlive);
        if (alive.length === 0) return { x: CONFIG.mapWidth / 2, y: CONFIG.mapHeight / 2 };
        let sx = 0, sy = 0;
        for (const v of alive) { sx += v.x; sy += v.y; }
        return { x: sx / alive.length, y: sy / alive.length };
    }

    _enemyCenter(faction, game, map) {
        const enemy = (game.factions || []).find(f => f.id !== faction.id);
        if (!enemy) return null;
        return this._factionCenter(enemy, map);
    }

    _isBorderTile(x, y, factionId, map) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) return true;
            if (map.territory[ny][nx] !== factionId) return true;
        }
        return false;
    }

    _distToNearestTerrain(x, y, terrainType, map, radius) {
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

    _findPortLocation(faction, map) {
        let bestPos = null;
        let bestScore = -Infinity;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (!map.canBuildPort(x, y, faction.id)) continue;

                const center = this._factionCenter(faction, map);
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
}
