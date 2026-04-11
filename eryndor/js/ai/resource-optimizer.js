import { TERRAIN, BUILDING, JOB, UNIT_TYPE } from '../enums.js';
import { CONFIG } from '../config.js';
import { BUILDING_CONFIG } from '../data/buildings.js';

/**
 * ResourceOptimizer - Manages the assignment of gatherers to resource nodes.
 *
 * Key improvement over v1: each resource node gets at most ONE gatherer,
 * preventing the "pile-up" problem where many villagers crowd a single tile.
 * The optimizer also respects priority ordering so that critical shortages
 * (e.g. food) are addressed before luxury resources (e.g. gold).
 */
export class ResourceOptimizer {

    constructor() {
        this._assignmentMap = new Map(); // villagerId -> {x, y, resourceType}
        this._nodeOccupancy = new Map(); // "x,y" -> villagerId
        this._lastFullScan = -999;
        this._scanInterval = 90; // full rescan every 90 ticks
    }

    // ------------------------------------------------------------------ //
    //  Public API
    // ------------------------------------------------------------------ //

    update(faction, game, priorities) {
        const map = game.map || game.gameMap;
        if (!map) return;

        const tick = CONFIG.currentTick || 0;
        const fullRescan = (tick - this._lastFullScan >= this._scanInterval);

        if (fullRescan) {
            this._lastFullScan = tick;
            this._performFullAssignment(faction, map, priorities);
        } else {
            // Incremental: re-assign only idle gatherers
            this._reassignIdle(faction, map, priorities);
        }
    }

    // ------------------------------------------------------------------ //
    //  Full assignment pass
    // ------------------------------------------------------------------ //

    _performFullAssignment(faction, map, priorities) {
        // 1. Identify available gatherers
        const gatherers = faction.villagers.filter(v =>
            v.isAlive &&
            v.unitType === UNIT_TYPE.VILLAGER &&
            v.currentTask !== 'combat' &&
            v.currentTask !== 'flee' &&
            v.currentTask !== 'research' &&
            (v.job === JOB.GATHERER || v.job === JOB.FARMER || v.job === JOB.FISHER)
        );

        if (gatherers.length === 0) return;

        // 2. Scan territory for resource nodes
        const nodes = this._scanResourceNodes(faction, map);

        // 3. Determine need ordering
        const needOrder = this._determineResourcePriority(faction, priorities);

        // 4. Clear old assignments
        this._assignmentMap.clear();
        this._nodeOccupancy.clear();

        // 5. Assign gatherers to nodes, respecting 1-per-node and priority
        //    We iterate through resource types in priority order and greedily
        //    assign the nearest free gatherer to each unoccupied node.
        const assignedVillagers = new Set();

        for (const resourceType of needOrder) {
            const typeNodes = nodes.filter(n => n.terrainType === resourceType);
            if (typeNodes.length === 0) continue;

            for (const node of typeNodes) {
                const key = `${node.x},${node.y}`;
                if (this._nodeOccupancy.has(key)) continue;

                // Find nearest unassigned gatherer
                let bestV = null;
                let bestDist = Infinity;

                for (const v of gatherers) {
                    if (assignedVillagers.has(v.id)) continue;

                    // Prefer matching job: farmer for berries/farms, fisher for water-adjacent
                    const dx = v.x - node.x;
                    const dy = v.y - node.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);

                    // Bonus for job match
                    if (v.job === JOB.FARMER && (resourceType === TERRAIN.BERRIES)) dist *= 0.7;
                    if (v.job === JOB.GATHERER && (resourceType === TERRAIN.FOREST || resourceType === TERRAIN.STONE)) dist *= 0.8;

                    if (dist < bestDist) {
                        bestDist = dist;
                        bestV = v;
                    }
                }

                if (bestV && bestDist < 30) { // don't send villagers across the whole map
                    this._assignmentMap.set(bestV.id, { x: node.x, y: node.y, resourceType });
                    this._nodeOccupancy.set(key, bestV.id);
                    assignedVillagers.add(bestV.id);

                    // Actually update the villager's task
                    bestV.currentTask = 'gather';
                    bestV.taskTarget = { x: node.x + 0.5, y: node.y + 0.5 };
                }
            }
        }

        // 6. Handle excess gatherers with no node: send to farms or let them idle
        for (const v of gatherers) {
            if (assignedVillagers.has(v.id)) continue;

            // Try to assign to a farm building
            const farm = this._findNearestFarm(faction, v);
            if (farm) {
                v.currentTask = 'farm';
                v.taskTarget = { x: farm.x + 0.5, y: farm.y + 0.5 };
            }
            // Otherwise, leave them to their default villager behaviour
        }
    }

    // ------------------------------------------------------------------ //
    //  Incremental idle reassignment
    // ------------------------------------------------------------------ //

    _reassignIdle(faction, map, priorities) {
        const idleGatherers = faction.villagers.filter(v =>
            v.isAlive &&
            v.unitType === UNIT_TYPE.VILLAGER &&
            (!v.currentTask || v.currentTask === 'idle') &&
            (v.job === JOB.GATHERER || v.job === JOB.FARMER || v.job === JOB.FISHER)
        );

        if (idleGatherers.length === 0) return;

        const needOrder = this._determineResourcePriority(faction, priorities);

        for (const v of idleGatherers) {
            const node = this._findBestUnoccupiedNode(v, faction, map, needOrder);
            if (node) {
                const key = `${node.x},${node.y}`;
                this._assignmentMap.set(v.id, { x: node.x, y: node.y, resourceType: node.terrainType });
                this._nodeOccupancy.set(key, v.id);
                v.currentTask = 'gather';
                v.taskTarget = { x: node.x + 0.5, y: node.y + 0.5 };
            } else {
                // No nodes: try farm
                const farm = this._findNearestFarm(faction, v);
                if (farm) {
                    v.currentTask = 'farm';
                    v.taskTarget = { x: farm.x + 0.5, y: farm.y + 0.5 };
                }
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  Resource node scanning
    // ------------------------------------------------------------------ //

    _scanResourceNodes(faction, map) {
        const nodes = [];
        const harvestableTerrains = [
            TERRAIN.FOREST, TERRAIN.STONE, TERRAIN.IRON,
            TERRAIN.GOLD, TERRAIN.BERRIES
        ];

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.territory[y][x] !== faction.id) continue;

                const terrain = map.terrain[y][x];
                if (!harvestableTerrains.includes(terrain)) continue;

                const resource = map.resources[y][x];
                if (!resource || resource.amount <= 0) continue;

                nodes.push({
                    x, y,
                    terrainType: terrain,
                    amount: resource.amount
                });
            }
        }

        return nodes;
    }

    // ------------------------------------------------------------------ //
    //  Priority ordering
    // ------------------------------------------------------------------ //

    /**
     * Returns an ordered list of TERRAIN types, most-needed first.
     * The ordering adapts to the faction's current resource levels and
     * the priorities set by the strategic planner.
     */
    _determineResourcePriority(faction, priorities) {
        const r = faction.resources;
        const pop = faction.villagers.filter(v => v.isAlive).length;

        const scores = [];

        // Food (berries): critical if low
        const foodNeed = (pop * 10) / Math.max(r.food || 1, 1);
        scores.push({ terrain: TERRAIN.BERRIES, score: foodNeed * 5 + priorities.economy * 10 });

        // Wood
        const woodNeed = 100 / Math.max(r.wood || 1, 1);
        scores.push({ terrain: TERRAIN.FOREST, score: woodNeed * 4 + priorities.economy * 6 });

        // Stone
        const stoneNeed = 60 / Math.max(r.stone || 1, 1);
        scores.push({ terrain: TERRAIN.STONE, score: stoneNeed * 3 + priorities.economy * 4 });

        // Iron
        const ironNeed = 40 / Math.max(r.iron || 1, 1);
        scores.push({ terrain: TERRAIN.IRON, score: ironNeed * 3 + priorities.military * 5 });

        // Gold
        const goldNeed = 30 / Math.max(r.gold || 1, 1);
        scores.push({ terrain: TERRAIN.GOLD, score: goldNeed * 2 + priorities.economy * 3 });

        scores.sort((a, b) => b.score - a.score);
        return scores.map(s => s.terrain);
    }

    // ------------------------------------------------------------------ //
    //  Helpers
    // ------------------------------------------------------------------ //

    _findBestUnoccupiedNode(villager, faction, map, needOrder) {
        const searchRadius = 20;
        const vx = Math.floor(villager.x);
        const vy = Math.floor(villager.y);

        let bestNode = null;
        let bestScore = -Infinity;

        const harvestableTerrains = new Set(needOrder);

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const x = vx + dx;
                const y = vy + dy;
                if (x < 0 || x >= map.width || y < 0 || y >= map.height) continue;
                if (map.territory[y][x] !== faction.id) continue;

                const terrain = map.terrain[y][x];
                if (!harvestableTerrains.has(terrain)) continue;

                const resource = map.resources[y][x];
                if (!resource || resource.amount <= 0) continue;

                const key = `${x},${y}`;
                if (this._nodeOccupancy.has(key)) continue;

                const dist = Math.sqrt(dx * dx + dy * dy);
                // Score: prioritize by need order and proximity
                const priorityIdx = needOrder.indexOf(terrain);
                const priorityBonus = (needOrder.length - priorityIdx) * 5;
                const score = priorityBonus + resource.amount * 0.1 - dist * 1.5;

                if (score > bestScore) {
                    bestScore = score;
                    bestNode = { x, y, terrainType: terrain, amount: resource.amount };
                }
            }
        }

        return bestNode;
    }

    _findNearestFarm(faction, villager) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const b of faction.buildings) {
            if (b.type !== BUILDING.FARM) continue;
            const dx = b.x - villager.x;
            const dy = b.y - villager.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = b;
            }
        }

        return nearest;
    }
}
