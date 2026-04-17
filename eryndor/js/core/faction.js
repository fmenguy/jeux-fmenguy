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

    // Agent-triggered colony expansion is handled via the `found_colony` tool
    // using canFoundColony / findColonyLocation / foundColony directly.

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

    // ========================================
    // MAIN UPDATE LOOP (physics only)
    // ========================================
    //
    // Strategic decisions (what to build, what to research, when to train,
    // when to declare war, trade arbitrage, etc.) are now driven by the
    // agent controller in js/agent/. This method intentionally keeps only
    // the "physics" of the world: food, deaths, births, tower fire,
    // research progression, building bonuses, villager ticks.
    //
    update(gameMap, allFactions) {
        const seasonMods = Villager.getSeasonModifiers();
        const aliveVillagers = this.villagers.filter(v => v.isAlive);

        // Food consumption
        let foodNeeded = aliveVillagers.length * CONFIG.foodPerVillagerPerTick * CONFIG.gameSpeed;
        const currentSeason = Villager.getCurrentSeason();
        if (currentSeason === 3) foodNeeded *= 1.2;
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

        const famineResistance = this.traits.famineResistance || 1;
        aliveVillagers.forEach(v => {
            v.updateHunger(hasEnoughFood, famineResistance);
            v.checkNaturalDeath();
        });

        const deadVillagers = this.villagers.filter(v => !v.isAlive);
        if (deadVillagers.length > 0) {
            this.stats.totalDeaths += deadVillagers.length;
            this.villagers = this.villagers.filter(v => v.isAlive);
        }

        if (aliveVillagers.length > this.stats.peakPopulation) {
            this.stats.peakPopulation = aliveVillagers.length;
        }

        // Marriage + reproduction (physics)
        this.processMarriages();
        const foodPerVillager = aliveVillagers.length > 0 ? this.resources.food / aliveVillagers.length : 0;
        if (foodPerVillager > CONFIG.birthFoodThreshold && this.villagers.length < this.maxPopulation) {
            if (Math.random() < seasonMods.birthRate) {
                this.processReproduction(gameMap);
            }
        }

        // Research progression (only if the agent started something)
        if (this.currentResearch) {
            this.researchProgress += CONFIG.gameSpeed * this.traits.researchSpeed * 0.5;
            if (this.researchProgress >= this.currentResearch.duration) {
                this.completeTech();
                this.stats.techsResearched++;
            }
        }

        // Gradual territory expansion around buildings
        if (aliveVillagers.length > 0 && this.buildings.length > 0 && Math.random() < 0.02 * CONFIG.gameSpeed) {
            this.expandTerritoryFromBuildings(gameMap);
        }

        // Boats
        this.boats.forEach(boat => boat.update(gameMap, this));

        // Tower auto-defense (passive building effect)
        this.updateTowers(gameMap, allFactions);

        // Advance training queue (candidates are enqueued by the agent via startTraining)
        this.processTrainingProgress();

        // War end conditions (no auto-declaration anymore)
        this.processWarEndConditions(gameMap, allFactions);

        if (CONFIG.currentTick % 100 === 0) {
            this.calculateBuildingBonuses();
        }

        this.updateTerritoryCount(gameMap);
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

    processTrainingProgress() {
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
    }

    // ========================================
    // WAR
    // ========================================

    processWarEndConditions(gameMap, allFactions) {
        if (!this.warState.isAtWar) return;

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
    // AGENT ACTIONS (called by js/agent/action-executor.js)
    // ========================================
    //
    // These methods are the public surface the AI agents act through.
    // They enforce rules: resource cost, tech prerequisites, population
    // constraints, valid terrain. They return { ok, reason?, ... }.

    placeBuilding(gameMap, buildingType, pos) {
        const cfg = BUILDING_CONFIG[buildingType];
        if (!cfg) return { ok: false, reason: 'unknown_building_type' };

        for (const [res, amount] of Object.entries(cfg.cost || {})) {
            if ((this.resources[res] || 0) < amount) {
                return { ok: false, reason: `insufficient_${res}` };
            }
        }

        if (buildingType === BUILDING.WALL && !(this.traits.masonryUnlocked || CONFIG.currentTick > 25000)) {
            return { ok: false, reason: 'requires_masonry' };
        }
        if (buildingType === BUILDING.ARCHERY_RANGE && this.type === 'human' && !this.completedTechs.includes('archery')) {
            return { ok: false, reason: 'requires_archery_tech' };
        }

        if (!pos || !gameMap.isValidBuildLocation(pos.x, pos.y)) {
            return { ok: false, reason: 'invalid_location' };
        }
        if (gameMap.territory[pos.y][pos.x] !== this.id) {
            return { ok: false, reason: 'not_own_territory' };
        }

        gameMap.buildings[pos.y][pos.x] = createBuilding(buildingType, this.id);
        this.buildings.push({ type: buildingType, x: pos.x, y: pos.y });

        for (const [res, amount] of Object.entries(cfg.cost || {})) {
            this.resources[res] -= amount;
        }

        if (buildingType === BUILDING.HOUSE) this.maxPopulation += cfg.popBonus || 5;
        else if (buildingType === BUILDING.FARM) this.production.food += 0.8;
        else if (buildingType === BUILDING.FORGE) this.production.iron += 0.5;
        else if (buildingType === BUILDING.WATCHTOWER) {
            this.traits.defenseBonus = (this.traits.defenseBonus || 1) + 0.1;
        } else if (buildingType === BUILDING.ARCHERY_RANGE) {
            this.traits.rangeBonus = (this.traits.rangeBonus || 1) + 0.1;
        } else if (buildingType === BUILDING.TOWER) {
            this.traits.defenseBonus = (this.traits.defenseBonus || 1) + 0.15;
        } else if (buildingType === BUILDING.MARKET) {
            this.traits.tradeBonus = (this.traits.tradeBonus || 1) + 0.2;
        } else if (buildingType === BUILDING.GRANARY) {
            this.buildingBonuses.foodStorage += 200;
            this.buildingBonuses.foodPreservation *= 0.95;
        } else if (buildingType === BUILDING.BARRACKS) {
            this.traits.combatBonus = (this.traits.combatBonus || 1) + 0.1;
        } else if (buildingType === BUILDING.PORT) {
            const waterSpot = gameMap.findNearbyNavigableWater(pos.x, pos.y);
            if (waterSpot) {
                const boat = new Boat(this.id, waterSpot.x, waterSpot.y);
                boat.portX = pos.x;
                boat.portY = pos.y;
                this.boats.push(boat);
            }
        }

        this.stats.buildingsConstructed++;
        return { ok: true, x: pos.x, y: pos.y };
    }

    startResearchById(techId) {
        if (this.currentResearch) return { ok: false, reason: 'already_researching' };
        if (this.completedTechs.includes(techId)) return { ok: false, reason: 'already_completed' };

        let tech = null;
        Object.values(TECH_TREE).forEach(cat => {
            cat.techs.forEach(t => { if (t.id === techId) tech = t; });
        });
        if (!tech) return { ok: false, reason: 'unknown_tech' };

        for (const prereq of tech.prerequisites || []) {
            if (!this.completedTechs.includes(prereq)) {
                return { ok: false, reason: `missing_prereq_${prereq}` };
            }
        }

        const upfront = Math.floor(tech.cost * 0.3);
        if ((this.resources.gold || 0) < upfront) {
            return { ok: false, reason: 'insufficient_gold' };
        }

        this.resources.gold -= upfront;
        this.currentResearch = tech;
        this.researchProgress = 0;
        return { ok: true, techId: tech.id, duration: tech.duration };
    }

    reassignJobs(jobType, count) {
        const candidates = this.villagers.filter(v =>
            v.isAlive && v.job !== jobType && v.unitType === UNIT_TYPE.VILLAGER &&
            v.currentAge >= 16 && (this.type === 'human' ? v.currentAge <= 55 : v.currentAge <= 700)
        );

        const skillKeyByJob = {
            gatherer: 'gathering',
            farmer: 'farming',
            builder: 'building',
            warrior: 'combat',
            hunter: 'archery',
            fisher: 'gathering',
            breeder: 'farming'
        };
        const skillKey = skillKeyByJob[jobType];
        candidates.sort((a, b) => (b.skills[skillKey] || 0) - (a.skills[skillKey] || 0));

        const picked = candidates.slice(0, count);
        picked.forEach(v => {
            v.job = jobType;
            v.jobPinned = true;
            v.jobChangeTimer = 0;
            v.currentTask = null;
            v.taskTarget = null;
        });

        return { ok: true, reassigned: picked.length };
    }

    orderAttack(targetSpec, unitCount, game) {
        const enemy = game.factions.find(f => f.id !== this.id);
        if (!enemy) return { ok: false, reason: 'no_enemy' };

        const candidates = this.villagers.filter(v =>
            v.isAlive && v.unitType !== UNIT_TYPE.VILLAGER
        ).sort((a, b) => b.combatStats.health - a.combatStats.health);

        if (candidates.length === 0) {
            return { ok: false, reason: 'no_military_units' };
        }

        let target = null;
        if (targetSpec && typeof targetSpec === 'object' && targetSpec.x !== undefined) {
            target = { x: targetSpec.x, y: targetSpec.y };
        } else if (targetSpec === 'enemy_castle') {
            const castle = enemy.buildings.find(b => b.type === BUILDING.CASTLE);
            if (castle) target = { x: castle.x, y: castle.y };
        } else if (targetSpec === 'enemy_villagers') {
            const enemyAlive = enemy.villagers.filter(v => v.isAlive);
            if (enemyAlive.length > 0) {
                let sx = 0, sy = 0;
                enemyAlive.forEach(v => { sx += v.x; sy += v.y; });
                target = { x: sx / enemyAlive.length, y: sy / enemyAlive.length };
            }
        } else if (targetSpec === 'nearest_enemy' || !targetSpec) {
            const firstUnit = candidates[0];
            let nearest = null, nearestDist = Infinity;
            enemy.villagers.forEach(v => {
                if (!v.isAlive) return;
                const d = Math.hypot(v.x - firstUnit.x, v.y - firstUnit.y);
                if (d < nearestDist) { nearestDist = d; nearest = v; }
            });
            if (nearest) target = { x: nearest.x, y: nearest.y };
        }

        if (!target) return { ok: false, reason: 'no_target_found' };

        const picked = candidates.slice(0, Math.min(unitCount || candidates.length, candidates.length));
        picked.forEach(v => {
            v.currentTask = 'combat';
            v.taskTarget = target;
            v.targetX = target.x;
            v.targetY = target.y;
        });

        return { ok: true, ordered: picked.length, target };
    }

    tradeGoldFor(resource, amountGive, amountGet) {
        const hasMarket = this.buildings.some(b => b.type === BUILDING.MARKET);
        if (!hasMarket) return { ok: false, reason: 'requires_market' };
        if ((this.resources.gold || 0) < amountGive) {
            return { ok: false, reason: 'insufficient_gold' };
        }
        if (!['food', 'wood', 'stone', 'iron'].includes(resource)) {
            return { ok: false, reason: 'unsupported_resource' };
        }
        this.resources.gold -= amountGive;
        this.resources[resource] = (this.resources[resource] || 0) + amountGet;
        return { ok: true, paid: amountGive, received: amountGet, resource };
    }

    foundColonyAt(gameMap) {
        if (!this.canFoundColony()) {
            return { ok: false, reason: 'cannot_found_colony' };
        }
        const loc = this.findColonyLocation(gameMap);
        if (!loc) return { ok: false, reason: 'no_valid_location' };
        this.foundColony(gameMap, loc.x, loc.y);
        return { ok: true, x: loc.x, y: loc.y };
    }

    // ========================================
    // RESEARCH
    // ========================================

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
