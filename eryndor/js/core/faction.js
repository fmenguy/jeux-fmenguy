import { TERRAIN, BUILDING, UNIT_TYPE } from '../enums.js';
import { CONFIG } from '../config.js';
import { BUILDING_CONFIG } from '../data/buildings.js';
import { TECH_TREE } from '../data/tech-tree.js';
import { FACTIONS } from '../data/factions.js';
import { COMBAT_STATS } from '../data/events.js';
import { Villager } from './villager.js';
import { Boat } from './boat.js';

/**
 * Helper: creates a building object for the map grid.
 */
function createBuilding(type, factionId) {
    const config = BUILDING_CONFIG[type];
    return {
        type: type,
        faction: factionId,
        health: config ? config.health : 100,
        maxHealth: config ? config.health : 100
    };
}

export class Faction {
    constructor(config, startX, startY) {
        this.id = config.id;
        this.name = config.name;
        this.color = config.color;
        this.lightColor = config.lightColor;
        this.darkColor = config.darkColor;
        this.emoji = config.emoji;
        this.type = config.type;
        this.traits = { ...config.traits };
        this.startX = startX;
        this.startY = startY;

        this.resources = { wood: 300, stone: 150, iron: 80, food: 2500, gold: 150, fish: 0 };
        this.population = 10;
        this.maxPopulation = 20;
        this.villagers = [];
        this.buildings = [];
        this.boats = [];
        this.territorySize = 0;
        this.completedTechs = [];
        this.currentResearch = null;
        this.researchProgress = 0;
        this.production = { wood: 1, stone: 0.5, iron: 0.3, food: 2, gold: 0.5 };

        // Periodic timers
        this.portCheckTimer = 0;
        this.colonyCheckTimer = 0;
        this.infrastructureTimer = 0;

        // Military system
        this.trainingQueue = [];
        this.militaryUnits = 0;

        // War system
        this.warState = {
            isAtWar: false,
            enemyId: null,
            warStartTick: 0
        };

        // Colony system
        this.colonies = [];
        this.maxColonies = CONFIG.colonyMaxCount;

        // Diplomacy system
        this.diplomacy = {
            relations: {},
            treaties: [],
            tributePaid: 0,
            lastInteraction: 0
        };

        // Stats for victory conditions
        this.stats = {
            totalKills: 0,
            totalDeaths: 0,
            buildingsConstructed: 0,
            techsResearched: 0,
            peakPopulation: 0,
            warsDeclared: 0,
            warsWon: 0
        };

        // Building bonuses
        this.buildingBonuses = {
            goldBonus: 1.0,
            foodStorage: 0,
            foodPreservation: 1.0,
            eventBonus: 1.0
        };
    }

    // ========================================
    // BUILDING BONUSES
    // ========================================

    calculateBuildingBonuses() {
        this.buildingBonuses = {
            goldBonus: 1.0,
            foodStorage: 0,
            foodPreservation: 1.0,
            eventBonus: 1.0
        };

        this.buildings.forEach(b => {
            const config = BUILDING_CONFIG[b.type];
            if (!config) return;

            if (config.goldBonus) this.buildingBonuses.goldBonus *= config.goldBonus;
            if (config.foodStorage) this.buildingBonuses.foodStorage += config.foodStorage;
            if (config.foodPreservation) this.buildingBonuses.foodPreservation *= config.foodPreservation;
            if (config.eventBonus) this.buildingBonuses.eventBonus *= config.eventBonus;
        });
    }

    // ========================================
    // COLONY SYSTEM
    // ========================================

    canFoundColony() {
        if (this.colonies.length >= this.maxColonies) return false;
        const cost = BUILDING_CONFIG[BUILDING.COLONY].cost;
        return this.resources.wood >= cost.wood &&
               this.resources.stone >= cost.stone &&
               this.resources.food >= cost.food &&
               this.villagers.filter(v => v.isAlive).length >= 15;
    }

    findColonyLocation(gameMap) {
        const validLocations = [];
        const minDist = CONFIG.colonyMinDistance;

        for (let y = 5; y < gameMap.height - 5; y++) {
            for (let x = 5; x < gameMap.width - 5; x++) {
                if (gameMap.terrain[y][x] !== TERRAIN.GRASS) continue;
                if (gameMap.buildings[y][x].type !== BUILDING.NONE) continue;
                if (gameMap.territory[y][x] >= 0) continue;

                const distFromCastle = Math.sqrt(
                    Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2)
                );
                if (distFromCastle < minDist) continue;

                const tooCloseToColony = this.colonies.some(c => {
                    const dist = Math.sqrt(Math.pow(x - c.x, 2) + Math.pow(y - c.y, 2));
                    return dist < minDist * 0.7;
                });
                if (tooCloseToColony) continue;

                let resourceScore = 0;
                for (let dy = -5; dy <= 5; dy++) {
                    for (let dx = -5; dx <= 5; dx++) {
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || nx >= gameMap.width || ny < 0 || ny >= gameMap.height) continue;
                        const terrain = gameMap.terrain[ny][nx];
                        if (terrain === TERRAIN.FOREST) resourceScore += 2;
                        if (terrain === TERRAIN.STONE) resourceScore += 3;
                        if (terrain === TERRAIN.IRON) resourceScore += 4;
                        if (terrain === TERRAIN.BERRIES) resourceScore += 5;
                        if (terrain === TERRAIN.WATER) resourceScore += 1;
                    }
                }

                if (resourceScore > 15) {
                    validLocations.push({ x, y, score: resourceScore });
                }
            }
        }

        if (validLocations.length === 0) return null;

        validLocations.sort((a, b) => b.score - a.score);
        return validLocations[0];
    }

    foundColony(gameMap, x, y) {
        const cost = BUILDING_CONFIG[BUILDING.COLONY].cost;

        this.resources.wood -= cost.wood;
        this.resources.stone -= cost.stone;
        this.resources.food -= cost.food;

        gameMap.buildings[y][x] = createBuilding(BUILDING.COLONY, this.id);
        this.buildings.push({ type: BUILDING.COLONY, x, y });

        this.colonies.push({
            x, y,
            foundedTick: CONFIG.currentTick,
            population: 0
        });

        // Expand territory around the colony
        const radius = BUILDING_CONFIG[BUILDING.COLONY].territoryRadius;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= gameMap.width || ny < 0 || ny >= gameMap.height) continue;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= radius && gameMap.territory[ny][nx] < 0) {
                    gameMap.territory[ny][nx] = this.id;
                }
            }
        }

        // Send settlers to the colony
        const settlers = this.villagers.filter(v => v.isAlive).slice(0, 3);
        settlers.forEach(v => {
            v.targetX = x + (Math.random() - 0.5) * 4;
            v.targetY = y + (Math.random() - 0.5) * 4;
        });

        this.maxPopulation += BUILDING_CONFIG[BUILDING.COLONY].popBonus;
        this.stats.buildingsConstructed++;
    }

    checkColonyExpansion(gameMap) {
        this.colonyCheckTimer += CONFIG.gameSpeed;
        if (this.colonyCheckTimer < 1000) return;
        this.colonyCheckTimer = 0;

        if (!this.canFoundColony()) return;

        const location = this.findColonyLocation(gameMap);
        if (location) {
            this.foundColony(gameMap, location.x, location.y);
        }
    }

    // ========================================
    // INFRASTRUCTURE
    // ========================================

    buildInfrastructure(gameMap) {
        this.infrastructureTimer += CONFIG.gameSpeed;
        if (this.infrastructureTimer < 80) return;
        this.infrastructureTimer = 0;

        const year = Math.floor(CONFIG.currentTick / CONFIG.ticksPerYear);

        if (this.resources.stone > 30 && Math.random() < 0.5) {
            this.buildRoadNetwork(gameMap);
        }

        const wallChance = this.warState.isAtWar ? 0.6 : (year > 20 ? 0.25 : 0.1);
        if (this.resources.stone > 60 && Math.random() < wallChance) {
            this.buildDefensiveWalls(gameMap);
        }

        if (this.resources.stone > 80 && this.resources.iron > 30 && Math.random() < 0.3) {
            this.buildDefensiveTower(gameMap);
        }
    }

    buildRoadNetwork(gameMap) {
        const castle = this.buildings.find(b => b.type === BUILDING.CASTLE);
        if (!castle) return;

        const importantBuildings = this.buildings.filter(b =>
            [BUILDING.FARM, BUILDING.MINE, BUILDING.FORGE, BUILDING.BARRACKS, BUILDING.MARKET, BUILDING.COLONY].includes(b.type)
        );

        if (importantBuildings.length === 0) return;

        const unconnected = importantBuildings.filter(b => {
            const neighbors = [[b.x - 1, b.y], [b.x + 1, b.y], [b.x, b.y - 1], [b.x, b.y + 1]];
            return !neighbors.some(([nx, ny]) => {
                if (nx < 0 || nx >= gameMap.width || ny < 0 || ny >= gameMap.height) return false;
                return gameMap.buildings[ny][nx].type === BUILDING.ROAD;
            });
        });

        const targetBuilding = unconnected.length > 0
            ? unconnected[0]
            : importantBuildings[Math.floor(Math.random() * importantBuildings.length)];

        this._buildRoadPath(gameMap, targetBuilding.x, targetBuilding.y, castle.x, castle.y);
    }

    _buildRoadPath(gameMap, x1, y1, x2, y2) {
        let roadsBuilt = 0;
        const maxRoads = 8;
        const roadCost = BUILDING_CONFIG[BUILDING.ROAD].cost.stone;

        // Horizontal first
        const dx = x2 > x1 ? 1 : -1;
        let x = x1;
        while (x !== x2 && roadsBuilt < maxRoads) {
            x += dx;
            if (this._canBuildRoadAt(gameMap, x, y1) && this.resources.stone >= roadCost) {
                gameMap.buildings[y1][x] = createBuilding(BUILDING.ROAD, this.id);
                this.buildings.push({ type: BUILDING.ROAD, x, y: y1 });
                this.resources.stone -= roadCost;
                roadsBuilt++;
            }
        }

        // Then vertical
        const dy = y2 > y1 ? 1 : -1;
        let y = y1;
        while (y !== y2 && roadsBuilt < maxRoads) {
            y += dy;
            if (this._canBuildRoadAt(gameMap, x2, y) && this.resources.stone >= roadCost) {
                gameMap.buildings[y][x2] = createBuilding(BUILDING.ROAD, this.id);
                this.buildings.push({ type: BUILDING.ROAD, x: x2, y });
                this.resources.stone -= roadCost;
                roadsBuilt++;
            }
        }
    }

    _canBuildRoadAt(gameMap, x, y) {
        if (x < 0 || x >= gameMap.width || y < 0 || y >= gameMap.height) return false;
        if (gameMap.terrain[y][x] !== TERRAIN.GRASS) return false;
        if (gameMap.buildings[y][x].type !== BUILDING.NONE) return false;
        if (gameMap.territory[y][x] !== this.id) return false;
        return true;
    }

    buildDefensiveWalls(gameMap) {
        const borderCells = [];
        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                if (gameMap.territory[y][x] !== this.id) continue;
                if (gameMap.terrain[y][x] !== TERRAIN.GRASS) continue;
                if (gameMap.buildings[y][x].type !== BUILDING.NONE) continue;

                const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                const isBorder = neighbors.some(([nx, ny]) => {
                    if (nx < 0 || nx >= gameMap.width || ny < 0 || ny >= gameMap.height) return true;
                    const neighborTerritory = gameMap.territory[ny][nx];
                    return neighborTerritory !== this.id && neighborTerritory >= 0;
                });

                if (isBorder) {
                    borderCells.push({ x, y });
                }
            }
        }

        let wallsBuilt = 0;
        const maxWalls = this.warState.isAtWar ? 8 : 5;
        for (const cell of borderCells) {
            if (wallsBuilt >= maxWalls) break;
            if (this.resources.stone < BUILDING_CONFIG[BUILDING.WALL].cost.stone) break;

            gameMap.buildings[cell.y][cell.x] = createBuilding(BUILDING.WALL, this.id);
            this.buildings.push({ type: BUILDING.WALL, x: cell.x, y: cell.y });
            this.resources.stone -= BUILDING_CONFIG[BUILDING.WALL].cost.stone;
            wallsBuilt++;
        }
    }

    buildDefensiveTower(gameMap) {
        const castle = this.buildings.find(b => b.type === BUILDING.CASTLE);
        if (!castle) return;

        for (let radius = 3; radius <= 8; radius++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const x = Math.floor(castle.x + Math.cos(angle) * radius);
                const y = Math.floor(castle.y + Math.sin(angle) * radius);

                if (x < 0 || x >= gameMap.width || y < 0 || y >= gameMap.height) continue;
                if (gameMap.territory[y][x] !== this.id) continue;
                if (gameMap.terrain[y][x] !== TERRAIN.GRASS) continue;
                if (gameMap.buildings[y][x].type !== BUILDING.NONE) continue;

                const tooClose = this.buildings.some(b => {
                    if (b.type !== BUILDING.TOWER && b.type !== BUILDING.WATCHTOWER) return false;
                    const dist = Math.sqrt(Math.pow(x - b.x, 2) + Math.pow(y - b.y, 2));
                    return dist < 5;
                });
                if (tooClose) continue;

                const cost = BUILDING_CONFIG[BUILDING.TOWER].cost;
                if (this.resources.stone >= cost.stone && this.resources.iron >= cost.iron) {
                    gameMap.buildings[y][x] = createBuilding(BUILDING.TOWER, this.id);
                    this.buildings.push({ type: BUILDING.TOWER, x, y });
                    this.resources.stone -= cost.stone;
                    this.resources.iron -= cost.iron;
                    this.stats.buildingsConstructed++;
                    return;
                }
            }
        }
    }

    // ========================================
    // FOOD AVAILABILITY CHECK
    // ========================================

    hasFoodAvailableOnMap(gameMap) {
        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                const isOurTerritory = gameMap.territory[y][x] === this.id;
                if (!isOurTerritory) continue;

                const terrain = gameMap.terrain[y][x];
                const resource = gameMap.resources[y][x];

                if (terrain === TERRAIN.BERRIES && resource.amount > 0) {
                    return true;
                }
            }
        }

        if (gameMap.animals && gameMap.animals.length > 0) {
            for (const animal of gameMap.animals) {
                if (!animal.isAlive || animal.typeData.aquatic) continue;
                const ax = Math.floor(animal.x);
                const ay = Math.floor(animal.y);
                if (ax >= 0 && ax < gameMap.width && ay >= 0 && ay < gameMap.height) {
                    if (gameMap.territory[ay][ax] === this.id) {
                        return true;
                    }
                }
            }
        }

        for (const building of this.buildings) {
            if (building.type === BUILDING.FARM) {
                return true;
            }
        }

        return false;
    }

    // ========================================
    // MAIN UPDATE LOOP
    // ========================================

    update(gameMap, allFactions) {
        const seasonMods = Villager.getSeasonModifiers();

        // Food consumption
        const aliveVillagers = this.villagers.filter(v => v.isAlive);
        let foodNeeded = aliveVillagers.length * CONFIG.foodPerVillagerPerTick * CONFIG.gameSpeed;

        // Winter: increased consumption
        const currentSeason = Villager.getCurrentSeason();
        if (currentSeason === 3) {
            foodNeeded *= 1.2;
        }

        // Apply granary preservation bonus
        foodNeeded *= this.buildingBonuses.foodPreservation;

        const hasStoredFood = this.resources.food >= foodNeeded;
        const hasFoodOnMap = this.hasFoodAvailableOnMap(gameMap);
        const hasEnoughFood = hasStoredFood || hasFoodOnMap;

        if (hasStoredFood) {
            this.resources.food -= foodNeeded;
        } else if (hasFoodOnMap) {
            this.resources.food = Math.max(0, this.resources.food - foodNeeded * 0.5);
        } else {
            this.resources.food = 0;
        }

        // Update hunger and natural death
        const famineResistance = this.traits.famineResistance || 1;
        aliveVillagers.forEach(v => {
            v.updateHunger(hasEnoughFood, famineResistance);
            v.checkNaturalDeath();
        });

        // Remove dead villagers and update stats
        const deadVillagers = this.villagers.filter(v => !v.isAlive);
        if (deadVillagers.length > 0) {
            this.stats.totalDeaths += deadVillagers.length;
            this.villagers = this.villagers.filter(v => v.isAlive);
        }

        // Update peak population
        if (aliveVillagers.length > this.stats.peakPopulation) {
            this.stats.peakPopulation = aliveVillagers.length;
        }

        // Marriage and reproduction
        this.processMarriages();
        const foodPerVillager = aliveVillagers.length > 0 ? this.resources.food / aliveVillagers.length : 0;
        const birthChanceMod = seasonMods.birthRate;

        if (foodPerVillager > CONFIG.birthFoodThreshold && this.villagers.length < this.maxPopulation) {
            if (Math.random() < birthChanceMod) {
                this.processReproduction(gameMap);
            }
        }

        // Research
        if (this.currentResearch) {
            this.researchProgress += CONFIG.gameSpeed * this.traits.researchSpeed * 0.5;
            if (this.researchProgress >= this.currentResearch.duration) {
                this.completeTech();
                this.stats.techsResearched++;
            }
        } else {
            this.startNewResearch();
        }

        // Territory expansion
        if (aliveVillagers.length > 0 && this.buildings.length > 0 && Math.random() < 0.02 * CONFIG.gameSpeed) {
            this.expandTerritoryFromBuildings(gameMap);
        }

        // Automatic building
        if (Math.random() < 0.03 * CONFIG.gameSpeed * this.traits.buildSpeed) {
            this.tryBuildSomething(gameMap);
        }

        // Port check
        this.portCheckTimer += CONFIG.gameSpeed;
        if (this.portCheckTimer > 500) {
            this.portCheckTimer = 0;
            this._tryBuildPort(gameMap);
        }

        // Update boats
        this.boats.forEach(boat => boat.update(gameMap, this));

        // Trade
        this.handleTrade();

        // Tower auto-attacks
        this.updateTowers(gameMap, allFactions);

        // Military training
        this.processTraining();

        // War state
        this.processWarState(gameMap, allFactions);

        // Building bonuses update
        if (CONFIG.currentTick % 100 === 0) {
            this.calculateBuildingBonuses();
        }

        // Colony expansion check
        this.checkColonyExpansion(gameMap);

        // Infrastructure (roads, walls, towers)
        this.buildInfrastructure(gameMap);

        // Territory count
        this.updateTerritoryCount(gameMap);

        // Update villagers
        this.villagers.forEach(v => v.update(gameMap, this, allFactions));
    }

    // ========================================
    // TERRITORY
    // ========================================

    updateTerritoryCount(gameMap) {
        let count = 0;
        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                if (gameMap.territory[y][x] === this.id) count++;
            }
        }
        this.territorySize = count;
    }

    expandTerritoryFromBuildings(gameMap) {
        const frontier = [];
        const buildingRadius = 3;

        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                if (gameMap.territory[y][x] === this.id) {
                    let nearBuilding = false;
                    for (const building of this.buildings) {
                        const dist = Math.abs(building.x - x) + Math.abs(building.y - y);
                        if (dist <= buildingRadius) {
                            nearBuilding = true;
                            break;
                        }
                    }

                    if (!nearBuilding) continue;

                    const neighbors = [
                        { x: x - 1, y }, { x: x + 1, y },
                        { x, y: y - 1 }, { x, y: y + 1 }
                    ];
                    neighbors.forEach(n => {
                        if (n.x >= 0 && n.x < gameMap.width && n.y >= 0 && n.y < gameMap.height) {
                            if (gameMap.territory[n.y][n.x] === -1 && gameMap.isWalkable(n.x, n.y)) {
                                frontier.push(n);
                            }
                        }
                    });
                }
            }
        }

        if (frontier.length > 0) {
            const cell = frontier[Math.floor(Math.random() * frontier.length)];
            gameMap.territory[cell.y][cell.x] = this.id;
            this.territorySize++;
        }
    }

    initializeTerritory(gameMap) {
        const radius = 6;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = this.startX + dx;
                const y = this.startY + dy;
                if (x >= 0 && x < gameMap.width && y >= 0 && y < gameMap.height) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= radius && gameMap.isWalkable(x, y)) {
                        gameMap.territory[y][x] = this.id;
                        this.territorySize++;
                    }
                }
            }
        }

        gameMap.buildings[this.startY][this.startX] = createBuilding(BUILDING.CASTLE, this.id);
        this.buildings.push({ type: BUILDING.CASTLE, x: this.startX, y: this.startY });

        // Add 2 initial farms next to castle
        const farmPositions = [
            { x: this.startX + 2, y: this.startY + 1 },
            { x: this.startX + 2, y: this.startY - 1 }
        ];
        farmPositions.forEach(pos => {
            if (gameMap.isWalkable(pos.x, pos.y)) {
                gameMap.buildings[pos.y][pos.x] = createBuilding(BUILDING.FARM, this.id);
                this.buildings.push({ type: BUILDING.FARM, x: pos.x, y: pos.y });
                this.production.food += 0.8;
            }
        });

        // Add 2 initial houses
        const housePositions = [
            { x: this.startX - 2, y: this.startY + 1 },
            { x: this.startX - 2, y: this.startY - 1 }
        ];
        housePositions.forEach(pos => {
            if (gameMap.isWalkable(pos.x, pos.y)) {
                gameMap.buildings[pos.y][pos.x] = createBuilding(BUILDING.HOUSE, this.id);
                this.buildings.push({ type: BUILDING.HOUSE, x: pos.x, y: pos.y });
                this.maxPopulation += 5;
            }
        });

        // Start with 12 villagers
        for (let i = 0; i < 12; i++) {
            this.createNewVillager(gameMap);
        }
    }

    // ========================================
    // TOWERS
    // ========================================

    updateTowers(gameMap, allFactions) {
        const towerRange = 6;
        const towerDamage = 8;

        this.buildings.forEach(building => {
            if (building.type !== BUILDING.TOWER && building.type !== BUILDING.WATCHTOWER) return;

            allFactions.forEach(enemyFaction => {
                if (enemyFaction.id === this.id) return;

                enemyFaction.villagers.forEach(enemy => {
                    if (!enemy.isAlive) return;

                    const dx = enemy.x - building.x;
                    const dy = enemy.y - building.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist <= towerRange) {
                        if (Math.random() < 0.02 * CONFIG.gameSpeed) {
                            const damage = towerDamage * (building.type === BUILDING.TOWER ? 1.5 : 1);
                            enemy.takeDamage(damage, 'tower');
                        }
                    }
                });
            });
        });
    }

    // ========================================
    // TRADE
    // ========================================

    handleTrade() {
        if (Math.random() > 0.005 * CONFIG.gameSpeed) return;

        const goldThreshold = 50;
        const tradeCost = 20;

        if (this.resources.gold < goldThreshold) return;

        const needs = [
            { resource: 'food', threshold: 30, amount: 25, priority: this.resources.food < 30 ? 3 : 0 },
            { resource: 'wood', threshold: 50, amount: 30, priority: this.resources.wood < 50 ? 2 : 0 },
            { resource: 'stone', threshold: 30, amount: 20, priority: this.resources.stone < 30 ? 1 : 0 },
            { resource: 'iron', threshold: 20, amount: 15, priority: this.resources.iron < 20 ? 1 : 0 }
        ];

        needs.sort((a, b) => b.priority - a.priority);

        const mostNeeded = needs[0];
        if (mostNeeded.priority > 0 && this.resources[mostNeeded.resource] < mostNeeded.threshold) {
            this.resources.gold -= tradeCost;
            this.resources[mostNeeded.resource] += mostNeeded.amount;
        }
        else if (this.currentResearch && this.resources.gold > 100) {
            this.resources.gold -= 10;
            this.researchProgress += 5 * CONFIG.gameSpeed;
        }
        else if (this.resources.gold > 150 && Math.random() < 0.3) {
            this.resources.gold -= 30;
            this.villagers.forEach(v => {
                if (v.isAlive) {
                    v.combatStats.attack += 0.5;
                    v.combatStats.defense += 0.3;
                }
            });
        }
    }

    // ========================================
    // PORT AND BOATS
    // ========================================

    _tryBuildPort(gameMap) {
        const hasPort = this.buildings.some(b => b.type === BUILDING.PORT);
        if (hasPort) {
            if (this.boats.length < 3 && this.resources.wood >= 80) {
                const port = this.buildings.find(b => b.type === BUILDING.PORT);
                if (port) {
                    const waterSpot = gameMap.findNearbyNavigableWater(port.x, port.y);
                    if (waterSpot) {
                        const boat = new Boat(this.id, waterSpot.x, waterSpot.y);
                        boat.portX = port.x;
                        boat.portY = port.y;
                        this.boats.push(boat);
                        this.resources.wood -= 80;
                    }
                }
            }
            return;
        }

        if (this.resources.wood < 150 || this.resources.stone < 100) return;

        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                if (gameMap.canBuildPort(x, y, this.id)) {
                    gameMap.buildings[y][x] = createBuilding(BUILDING.PORT, this.id);
                    this.buildings.push({ type: BUILDING.PORT, x, y });
                    this.resources.wood -= 150;
                    this.resources.stone -= 100;

                    const waterSpot = gameMap.findNearbyNavigableWater(x, y);
                    if (waterSpot) {
                        const boat = new Boat(this.id, waterSpot.x, waterSpot.y);
                        boat.portX = x;
                        boat.portY = y;
                        this.boats.push(boat);
                    }

                    return;
                }
            }
        }
    }

    // ========================================
    // POPULATION
    // ========================================

    createNewVillager(gameMap, parent1 = null, parent2 = null) {
        const validPos = [];
        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                if (gameMap.territory[y][x] === this.id && gameMap.isWalkable(x, y)) {
                    validPos.push({ x, y });
                }
            }
        }

        if (validPos.length > 0) {
            const pos = validPos[Math.floor(Math.random() * validPos.length)];
            const villager = new Villager(this.id, this.type, pos.x, pos.y, parent1, parent2);
            this.villagers.push(villager);
            if (parent1) parent1.children.push(villager);
            if (parent2) parent2.children.push(villager);
        }
    }

    processMarriages() {
        const minMarriageAge = this.type === 'human' ? 18 : 30;
        const maxMarriageAge = this.type === 'human' ? 50 : 100;

        const eligibleMales = this.villagers.filter(v =>
            v.isAlive && v.gender === 'male' && !v.spouse &&
            v.currentAge >= minMarriageAge && v.currentAge <= maxMarriageAge
        );
        const eligibleFemales = this.villagers.filter(v =>
            v.isAlive && v.gender === 'female' && !v.spouse &&
            v.currentAge >= minMarriageAge && v.currentAge <= maxMarriageAge
        );

        if (eligibleMales.length > 0 && eligibleFemales.length > 0) {
            if (Math.random() < 0.03 * CONFIG.gameSpeed) {
                const male = eligibleMales[Math.floor(Math.random() * eligibleMales.length)];
                const validFemales = eligibleFemales.filter(f => !this._areSiblings(male, f));

                if (validFemales.length > 0) {
                    const female = validFemales[Math.floor(Math.random() * validFemales.length)];
                    male.spouse = female;
                    female.spouse = male;
                    female.lastName = male.lastName;
                }
            }
        }
    }

    _areSiblings(v1, v2) {
        if (!v1.parent1 || !v2.parent1) return false;
        return (v1.parent1 === v2.parent1 || v1.parent1 === v2.parent2 ||
                v1.parent2 === v2.parent1 || v1.parent2 === v2.parent2);
    }

    processReproduction(gameMap) {
        const minBirthAge = this.type === 'human' ? 18 : 30;
        const maxBirthAge = this.type === 'human' ? 45 : 100;

        const fertileFemales = this.villagers.filter(v =>
            v.isAlive && v.gender === 'female' && v.spouse && v.spouse.isAlive &&
            v.currentAge >= minBirthAge && v.currentAge <= maxBirthAge
        );

        fertileFemales.forEach(female => {
            const childrenCount = female.children.filter(c => c.isAlive).length;
            const birthChance = Math.max(0.003, 0.015 - childrenCount * 0.002) * CONFIG.gameSpeed;

            if (Math.random() < birthChance) {
                const houseCount = this.buildings.filter(b => b.type === BUILDING.HOUSE).length;
                const housingCapacity = 10 + houseCount * 5;

                if (this.villagers.length < housingCapacity) {
                    this.createNewVillager(gameMap, female, female.spouse);
                }
            }
        });
    }

    // ========================================
    // MILITARY
    // ========================================

    getTrainingCost(unitType) {
        const costs = {
            [UNIT_TYPE.SOLDIER]: { food: 50, iron: 30, duration: 200 },
            [UNIT_TYPE.ARCHER]: { food: 40, wood: 20, duration: 180 },
            [UNIT_TYPE.CAVALRY]: { food: 100, iron: 50, gold: 20, duration: 300 },
            [UNIT_TYPE.SCOUT]: { food: 30, wood: 10, duration: 120 }
        };
        return costs[unitType] || { food: 30, duration: 100 };
    }

    canTrain(unitType) {
        if (unitType === UNIT_TYPE.ARCHER && !this.traits.archerUnlocked) return false;
        if (unitType === UNIT_TYPE.CAVALRY && !this.traits.cavalryUnlocked) return false;

        const hasBarracks = this.buildings.some(b => b.type === BUILDING.BARRACKS);
        const hasArcheryRange = this.buildings.some(b => b.type === BUILDING.ARCHERY_RANGE);

        if (unitType === UNIT_TYPE.SOLDIER || unitType === UNIT_TYPE.CAVALRY) {
            if (!hasBarracks) return false;
        }
        if (unitType === UNIT_TYPE.ARCHER || unitType === UNIT_TYPE.SCOUT) {
            if (!hasArcheryRange) return false;
        }

        const cost = this.getTrainingCost(unitType);
        for (const [resource, amount] of Object.entries(cost)) {
            if (resource === 'duration') continue;
            if ((this.resources[resource] || 0) < amount) return false;
        }

        return true;
    }

    startTraining(villager, unitType) {
        if (!this.canTrain(unitType)) return false;
        if (villager.unitType !== UNIT_TYPE.VILLAGER) return false;

        const cost = this.getTrainingCost(unitType);

        for (const [resource, amount] of Object.entries(cost)) {
            if (resource === 'duration') continue;
            this.resources[resource] -= amount;
        }

        this.trainingQueue.push({
            villagerId: villager.id,
            targetType: unitType,
            progress: 0,
            duration: cost.duration
        });

        villager.currentTask = 'training';
        return true;
    }

    processTraining() {
        this.trainingQueue = this.trainingQueue.filter(training => {
            training.progress += CONFIG.gameSpeed;

            if (training.progress >= training.duration) {
                const villager = this.villagers.find(v => v.id === training.villagerId);
                if (villager && villager.isAlive) {
                    villager.promote(training.targetType);
                    villager.currentTask = null;
                    this.militaryUnits++;
                }
                return false;
            }
            return true;
        });

        // AI: decide to train units automatically
        const aliveVillagers = this.villagers.filter(v => v.isAlive);
        const militaryRatio = this.militaryUnits / Math.max(1, aliveVillagers.length);

        const targetRatio = this.warState.isAtWar ? 0.4 : 0.2;

        if (militaryRatio < targetRatio && this.trainingQueue.length < 2) {
            const candidates = this.villagers.filter(v =>
                v.isAlive && v.unitType === UNIT_TYPE.VILLAGER &&
                v.currentAge >= 16 && v.currentAge <= 50 &&
                v.currentTask !== 'training'
            ).sort((a, b) => b.skills.combat - a.skills.combat);

            if (candidates.length > 0 && Math.random() < 0.01 * CONFIG.gameSpeed) {
                const candidate = candidates[0];

                let unitType;
                if (this.type === 'human') {
                    unitType = this.canTrain(UNIT_TYPE.CAVALRY) && Math.random() < 0.3
                        ? UNIT_TYPE.CAVALRY : UNIT_TYPE.SOLDIER;
                } else {
                    unitType = this.canTrain(UNIT_TYPE.ARCHER)
                        ? UNIT_TYPE.ARCHER : UNIT_TYPE.SCOUT;
                }

                this.startTraining(candidate, unitType);
            }
        }
    }

    // ========================================
    // WAR
    // ========================================

    processWarState(gameMap, allFactions) {
        const adjacentEnemies = new Set();

        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                if (gameMap.territory[y][x] !== this.id) continue;

                const neighbors = [{ x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 }];
                neighbors.forEach(n => {
                    if (n.x >= 0 && n.x < gameMap.width && n.y >= 0 && n.y < gameMap.height) {
                        const neighborTerritory = gameMap.territory[n.y][n.x];
                        if (neighborTerritory !== -1 && neighborTerritory !== this.id) {
                            adjacentEnemies.add(neighborTerritory);
                        }
                    }
                });
            }
        }

        if (!this.warState.isAtWar && adjacentEnemies.size > 0) {
            if (Math.random() < 0.0001 * CONFIG.gameSpeed) {
                const enemyId = Array.from(adjacentEnemies)[0];
                this.declareWar(enemyId, allFactions);
            }
        }

        if (this.warState.isAtWar) {
            const enemy = allFactions.find(f => f.id === this.warState.enemyId);
            if (!enemy) {
                this.endWar('victory');
                return;
            }

            const enemyVillagers = enemy.villagers.filter(v => v.isAlive);
            const enemyCastle = enemy.buildings.find(b => b.type === BUILDING.CASTLE);

            if (enemyVillagers.length === 0 || !enemyCastle) {
                this.endWar('victory');
                this.conquerTerritory(gameMap, enemy);
            }
        }
    }

    declareWar(enemyId, allFactions) {
        this.warState = {
            isAtWar: true,
            enemyId: enemyId,
            warStartTick: CONFIG.currentTick
        };

        const enemy = allFactions.find(f => f.id === enemyId);
        if (enemy) {
            enemy.warState = {
                isAtWar: true,
                enemyId: this.id,
                warStartTick: CONFIG.currentTick
            };
        }

        this.stats.warsDeclared++;
    }

    endWar(result) {
        if (result === 'victory') {
            this.stats.warsWon++;
        }
        this.warState = {
            isAtWar: false,
            enemyId: null,
            warStartTick: 0
        };
    }

    conquerTerritory(gameMap, enemy) {
        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                if (gameMap.territory[y][x] === enemy.id) {
                    gameMap.territory[y][x] = this.id;
                    this.territorySize++;

                    if (gameMap.buildings[y][x].faction === enemy.id) {
                        gameMap.buildings[y][x].faction = this.id;
                        const building = enemy.buildings.find(b => b.x === x && b.y === y);
                        if (building) {
                            this.buildings.push(building);
                            enemy.buildings = enemy.buildings.filter(b => b.x !== x || b.y !== y);
                        }
                    }
                }
            }
        }
    }

    // ========================================
    // BUILDING AI
    // ========================================

    tryBuildSomething(gameMap) {
        const validLocations = [];
        const frontierLocations = [];

        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                if (gameMap.territory[y][x] === this.id && gameMap.isValidBuildLocation(x, y)) {
                    validLocations.push({ x, y });

                    const neighbors = [
                        { x: x - 1, y }, { x: x + 1, y },
                        { x, y: y - 1 }, { x, y: y + 1 }
                    ];
                    const isFrontier = neighbors.some(n => {
                        if (n.x < 0 || n.x >= gameMap.width || n.y < 0 || n.y >= gameMap.height) return true;
                        const neighborTerritory = gameMap.territory[n.y][n.x];
                        return neighborTerritory !== -1 && neighborTerritory !== this.id;
                    });
                    if (isFrontier) {
                        frontierLocations.push({ x, y });
                    }
                }
            }
        }

        if (validLocations.length === 0) return;

        // Count existing buildings
        const houseCount = this.buildings.filter(b => b.type === BUILDING.HOUSE).length;
        const farmCount = this.buildings.filter(b => b.type === BUILDING.FARM).length;
        const watchtowerCount = this.buildings.filter(b => b.type === BUILDING.WATCHTOWER).length;
        const archeryCount = this.buildings.filter(b => b.type === BUILDING.ARCHERY_RANGE).length;
        const wallCount = this.buildings.filter(b => b.type === BUILDING.WALL).length;
        const towerCount = this.buildings.filter(b => b.type === BUILDING.TOWER).length;
        const roadCount = this.buildings.filter(b => b.type === BUILDING.ROAD).length;
        const barracksCount = this.buildings.filter(b => b.type === BUILDING.BARRACKS).length;
        const forgeCount = this.buildings.filter(b => b.type === BUILDING.FORGE).length;
        const marketCount = this.buildings.filter(b => b.type === BUILDING.MARKET).length;
        const granaryCount = this.buildings.filter(b => b.type === BUILDING.GRANARY).length;
        const aliveCount = this.villagers.filter(v => v.isAlive).length;

        // Decide what to build
        let buildType = BUILDING.HOUSE;
        let woodCost = 30;
        let stoneCost = 20;
        let ironCost = 0;
        let goldCost = 0;
        let loc = validLocations[Math.floor(Math.random() * validLocations.length)];

        // Priority 0: FARMS if food is critical
        if (this.resources.food < aliveCount * 20 && farmCount < houseCount && this.resources.wood >= 40) {
            buildType = BUILDING.FARM;
            woodCost = 40;
            stoneCost = 5;
        }
        // Priority 1: Roads to castle
        else if (roadCount < this.buildings.length * 0.4 && this.resources.stone >= 5 && Math.random() < 0.4) {
            const roadLoc = this._findRoadLocation(gameMap);
            if (roadLoc) {
                buildType = BUILDING.ROAD;
                woodCost = 2;
                stoneCost = 5;
                loc = roadLoc;
            }
        }
        // Priority 2: Walls at borders
        else if ((this.traits.masonryUnlocked || CONFIG.currentTick > 25000) && frontierLocations.length > 0 && wallCount < frontierLocations.length * 0.5 && this.resources.stone >= 15 && Math.random() < 0.35) {
            buildType = BUILDING.WALL;
            woodCost = 5;
            stoneCost = 15;
            loc = frontierLocations[Math.floor(Math.random() * frontierLocations.length)];
        }
        // Priority 3: Defense towers
        else if (towerCount < Math.max(3, wallCount / 3) && this.resources.stone >= 40 && this.resources.iron >= 10 && Math.random() < 0.25) {
            buildType = BUILDING.TOWER;
            woodCost = 10;
            stoneCost = 40;
            ironCost = 10;
            const nearWallOrFrontier = validLocations.find(l => {
                return this.buildings.some(b => b.type === BUILDING.WALL && Math.abs(b.x - l.x) <= 2 && Math.abs(b.y - l.y) <= 2);
            }) || frontierLocations[Math.floor(Math.random() * frontierLocations.length)];
            if (nearWallOrFrontier) loc = nearWallOrFrontier;
        }
        // Other buildings
        else if (this.resources.wood >= 40 && this.resources.stone >= 20) {
            const rand = Math.random();

            if (farmCount < Math.max(3, houseCount / 2) && rand < 0.25) {
                buildType = BUILDING.FARM;
                woodCost = 40;
                stoneCost = 5;
            }
            else if (granaryCount < farmCount / 2 && this.resources.wood >= 70 && rand < 0.15) {
                buildType = BUILDING.GRANARY;
                woodCost = 70;
                stoneCost = 30;
            }
            else if (forgeCount < 3 && this.completedTechs.includes('ironWorking') && rand < 0.2) {
                buildType = BUILDING.FORGE;
                woodCost = 50;
                stoneCost = 30;
                ironCost = 10;
            }
            else if (barracksCount < 4 && rand < 0.2) {
                buildType = BUILDING.BARRACKS;
                woodCost = 60;
                stoneCost = 40;
                ironCost = 20;
            }
            else if (marketCount < 2 && this.resources.gold >= 30 && rand < 0.15) {
                buildType = BUILDING.MARKET;
                woodCost = 80;
                stoneCost = 40;
                goldCost = 30;
            }
            else if (this.type === 'human' && watchtowerCount < 8 && rand < 0.35 && this.resources.stone >= 60) {
                buildType = BUILDING.WATCHTOWER;
                stoneCost = 60;
                woodCost = 40;
            }
            else if (this.type === 'elf' && archeryCount < 8 && rand < 0.35 && this.resources.wood >= 60) {
                buildType = BUILDING.ARCHERY_RANGE;
                woodCost = 70;
                stoneCost = 30;
            }
            else if (houseCount < aliveCount / 3 && rand < 0.3) {
                buildType = BUILDING.HOUSE;
                woodCost = 30;
                stoneCost = 10;
            }
        }

        // Check resources and build
        if (this.resources.wood >= woodCost && this.resources.stone >= stoneCost &&
            this.resources.iron >= ironCost && this.resources.gold >= goldCost) {
            gameMap.buildings[loc.y][loc.x] = createBuilding(buildType, this.id);
            this.buildings.push({ type: buildType, x: loc.x, y: loc.y });

            this.resources.wood -= woodCost;
            this.resources.stone -= stoneCost;
            this.resources.iron -= ironCost;
            this.resources.gold -= goldCost;

            // Building effects
            if (buildType === BUILDING.HOUSE) this.maxPopulation += 5;
            else if (buildType === BUILDING.FARM) this.production.food += 0.8;
            else if (buildType === BUILDING.FORGE) this.production.iron += 0.5;
            else if (buildType === BUILDING.WATCHTOWER) {
                this.traits.defenseBonus = (this.traits.defenseBonus || 1) + 0.1;
            } else if (buildType === BUILDING.ARCHERY_RANGE) {
                this.traits.rangeBonus = (this.traits.rangeBonus || 1) + 0.1;
            } else if (buildType === BUILDING.TOWER) {
                this.traits.defenseBonus = (this.traits.defenseBonus || 1) + 0.15;
            } else if (buildType === BUILDING.MARKET) {
                this.traits.tradeBonus = (this.traits.tradeBonus || 1) + 0.2;
            } else if (buildType === BUILDING.GRANARY) {
                this.buildingBonuses.foodStorage += 200;
                this.buildingBonuses.foodPreservation *= 0.95;
            } else if (buildType === BUILDING.BARRACKS) {
                this.traits.combatBonus = (this.traits.combatBonus || 1) + 0.1;
            }

            this.stats.buildingsConstructed++;
        }
    }

    _findRoadLocation(gameMap) {
        const castle = this.buildings.find(b => b.type === BUILDING.CASTLE);
        if (!castle) return null;

        const targetBuilding = this.buildings.find(b => {
            if (b.type === BUILDING.ROAD || b.type === BUILDING.CASTLE || b.type === BUILDING.WALL) return false;
            const dist = Math.abs(b.x - castle.x) + Math.abs(b.y - castle.y);
            return dist > 3;
        });

        if (!targetBuilding) return null;

        const dx = castle.x - targetBuilding.x;
        const dy = castle.y - targetBuilding.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps === 0) return null;

        for (let i = 1; i < steps; i++) {
            const x = Math.floor(targetBuilding.x + (dx / steps) * i);
            const y = Math.floor(targetBuilding.y + (dy / steps) * i);

            if (gameMap.territory[y] && gameMap.territory[y][x] === this.id &&
                gameMap.buildings[y][x].type === BUILDING.NONE &&
                gameMap.terrain[y][x] === TERRAIN.GRASS) {
                return { x, y };
            }
        }

        return null;
    }

    // ========================================
    // RESEARCH
    // ========================================

    startNewResearch() {
        const allTechs = [];
        Object.values(TECH_TREE).forEach(category => {
            category.techs.forEach(tech => {
                if (!this.completedTechs.includes(tech.id) && this.resources.gold >= tech.cost * 0.5) {
                    allTechs.push(tech);
                }
            });
        });

        if (allTechs.length > 0) {
            this.currentResearch = allTechs[Math.floor(Math.random() * allTechs.length)];
            this.researchProgress = 0;
            this.resources.gold -= this.currentResearch.cost * 0.3;
        }
    }

    completeTech() {
        if (!this.currentResearch) return;

        this.completedTechs.push(this.currentResearch.id);

        switch (this.currentResearch.id) {
            // Economy
            case 'agriculture':
                this.traits.farmingBonus = (this.traits.farmingBonus || 1) * 1.5;
                this.villagers.forEach(v => {
                    v.skills.farming = Math.min(100, v.skills.farming * 1.3);
                });
                break;
            case 'mining':
                this.traits.miningBonus = (this.traits.miningBonus || 1) * 1.5;
                this.villagers.forEach(v => {
                    v.skills.gathering = Math.min(100, v.skills.gathering * 1.3);
                });
                break;
            case 'trade':
                this.traits.tradeBonus = (this.traits.tradeBonus || 1) * 2;
                this.resources.gold += 50;
                break;

            // Military
            case 'ironWorking':
                this.villagers.forEach(v => {
                    v.combatStats.attack *= 1.2;
                    v.combatStats.defense *= 1.15;
                });
                this.traits.ironWorkingBonus = true;
                break;
            case 'archery':
                this.traits.rangeBonus = (this.traits.rangeBonus || 1) * 1.5;
                this.traits.archerUnlocked = true;
                this.villagers.forEach(v => {
                    v.skills.archery = Math.min(100, v.skills.archery * 1.3);
                });
                break;
            case 'cavalry':
                this.traits.cavalryBonus = (this.traits.cavalryBonus || 1) * 1.5;
                this.traits.cavalryUnlocked = true;
                break;

            // Culture
            case 'writing':
                this.traits.researchSpeed = (this.traits.researchSpeed || 1) * 1.3;
                break;
            case 'philosophy':
                this.traits.famineResistance = (this.traits.famineResistance || 1) * 1.2;
                this.traits.researchSpeed = (this.traits.researchSpeed || 1) * 1.2;
                break;
            case 'masonry':
                this.traits.buildSpeed = (this.traits.buildSpeed || 1) * 1.3;
                this.traits.defenseBonus = (this.traits.defenseBonus || 1) * 1.5;
                this.traits.masonryUnlocked = true;
                break;
        }

        this.currentResearch = null;
        this.researchProgress = 0;
    }
}
