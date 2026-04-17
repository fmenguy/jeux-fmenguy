import { TERRAIN, BUILDING, UNIT_TYPE, JOB } from '../enums.js';
import { CONFIG } from '../config.js';
import { NAMES } from '../data/names.js';
import { FACTIONS } from '../data/factions.js';
import { COMBAT_STATS } from '../data/events.js';

export class Villager {
    constructor(factionId, factionType, x, y, parent1 = null, parent2 = null) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.factionId = factionId;
        this.factionType = factionType;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;

        this.gender = Math.random() < 0.5 ? 'male' : 'female';
        this.firstName = this._generateFirstName();
        this.lastName = parent1 ? parent1.lastName : this._generateLastName();
        this.age = parent1 ? 0 : 18 + Math.floor(Math.random() * 15);
        this.birthTick = CONFIG.currentTick - (this.age * CONFIG.ticksPerYear);

        this.parent1 = parent1;
        this.parent2 = parent2;
        this.spouse = null;
        this.children = [];

        // Unit type (default villager)
        this.unitType = UNIT_TYPE.VILLAGER;

        // Combat stats based on faction
        const factionConfig = this._getFactionConfig();
        this.combatStats = {
            attack: COMBAT_STATS[UNIT_TYPE.VILLAGER].attack,
            defense: COMBAT_STATS[UNIT_TYPE.VILLAGER].defense,
            range: COMBAT_STATS[UNIT_TYPE.VILLAGER].range,
            health: 100,
            maxHealth: 100
        };

        // Life state
        this.isAlive = true;
        this.hunger = 0;
        this.deathCause = null;

        // Skills with faction bonuses
        const isHuman = this.factionType === 'human';
        this.skills = {
            farming: 10 + Math.floor(Math.random() * 40),
            building: 10 + Math.floor(Math.random() * 40) + (isHuman ? 15 : 0),
            combat: 10 + Math.floor(Math.random() * 40) + (isHuman ? 10 : 0),
            crafting: 10 + Math.floor(Math.random() * 40),
            gathering: 10 + Math.floor(Math.random() * 40) + (isHuman ? 0 : 10),
            archery: 10 + Math.floor(Math.random() * 40) + (isHuman ? 0 : 20),
            research: 10 + Math.floor(Math.random() * 40) + (isHuman ? 0 : 15)
        };

        // Skill inheritance from parents
        if (parent1 && parent2) {
            Object.keys(this.skills).forEach(skill => {
                const inherited = (parent1.skills[skill] + parent2.skills[skill]) / 2;
                this.skills[skill] = Math.floor(inherited * 0.7 + Math.random() * 30);
            });
        }

        // Determine job based on skills
        this.job = this.determineJob();
        this.jobChangeTimer = 0;

        this.moveTimer = 0;
        this.moveInterval = 50 + Math.random() * 100;

        // AI: current objective
        this.currentTask = null;
        this.taskTarget = null;
        this.huntTarget = null;
        this.gatherTimer = 0;
    }

    _getFactionConfig() {
        return FACTIONS.find(f => f.type === this.factionType) || FACTIONS[0];
    }

    _generateFirstName() {
        const names = NAMES[this.factionType][this.gender];
        return names[Math.floor(Math.random() * names.length)];
    }

    _generateLastName() {
        const surnames = NAMES[this.factionType].surnames;
        return surnames[Math.floor(Math.random() * surnames.length)];
    }

    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }

    get currentAge() {
        return Math.floor((CONFIG.currentTick - this.birthTick) / CONFIG.ticksPerYear);
    }

    // Determine job based on highest skills
    determineJob() {
        const skills = this.skills;
        const age = this.currentAge;

        const maxWorkAge = this.factionType === 'human' ? 55 : 700;
        if (age < 16 || age > maxWorkAge) {
            return JOB.BREEDER;
        }

        const jobScores = {
            [JOB.GATHERER]: skills.gathering * 1.5 + skills.crafting * 0.5,
            [JOB.FARMER]: skills.farming * 1.5 + skills.gathering * 0.3,
            [JOB.BUILDER]: skills.building * 1.5 + skills.crafting * 0.8,
            [JOB.WARRIOR]: skills.combat * 1.5 + skills.building * 0.3,
            [JOB.HUNTER]: skills.archery * 1.5 + skills.gathering * 0.5,
            [JOB.FISHER]: skills.farming * 0.8 + skills.gathering * 0.8 + Math.random() * 20,
            [JOB.BREEDER]: (100 - skills.combat) * 0.5 + Math.random() * 30
        };

        let bestJob = JOB.GATHERER;
        let bestScore = 0;
        Object.entries(jobScores).forEach(([job, score]) => {
            if (score > bestScore) {
                bestScore = score;
                bestJob = job;
            }
        });

        return bestJob;
    }

    getJobName() {
        const names = {
            [JOB.GATHERER]: 'Collecteur',
            [JOB.FARMER]: 'Fermier',
            [JOB.BUILDER]: 'Constructeur',
            [JOB.WARRIOR]: 'Guerrier',
            [JOB.HUNTER]: 'Chasseur',
            [JOB.FISHER]: 'Pecheur',
            [JOB.BREEDER]: this.currentAge < 16 ? 'Enfant' : 'Ancien'
        };
        return names[this.job] || 'Villageois';
    }

    // Promote to military unit
    promote(unitType) {
        this.unitType = unitType;
        const stats = COMBAT_STATS[unitType];
        const factionConfig = this._getFactionConfig();

        this.combatStats = {
            attack: stats.attack * (stats.range > 1 ? factionConfig.traits.rangeBonus : factionConfig.traits.meleeBonus),
            defense: stats.defense * factionConfig.traits.defenseBonus,
            range: stats.range * (this.factionType === 'elf' ? 1.3 : 1),
            health: 100 + (unitType === UNIT_TYPE.SOLDIER ? 50 : 0),
            maxHealth: 100 + (unitType === UNIT_TYPE.SOLDIER ? 50 : 0)
        };
    }

    takeDamage(amount, source = 'unknown') {
        if (!this.isAlive) return;
        this.combatStats.health -= amount;
        if (this.combatStats.health <= 0) {
            this.die(source);
        }
    }

    die(cause) {
        this.isAlive = false;
        this.deathCause = cause;
        if (this.spouse) {
            this.spouse.spouse = null;
        }
    }

    checkNaturalDeath() {
        if (!this.isAlive) return;
        const ageConfig = CONFIG.maxAge[this.factionType] || { average: 70, min: 55, max: 90 };
        const age = this.currentAge;

        if (age < ageConfig.min) return;

        if (age >= ageConfig.max) {
            this.die('vieillesse');
            return;
        }

        const progressToAverage = (age - ageConfig.min) / (ageConfig.average - ageConfig.min);
        const progressToMax = (age - ageConfig.average) / (ageConfig.max - ageConfig.average);

        let deathChance;
        if (age < ageConfig.average) {
            deathChance = 0.0001 + progressToAverage * 0.0009;
        } else {
            deathChance = 0.001 + progressToMax * 0.019;
        }

        deathChance *= CONFIG.gameSpeed;

        if (Math.random() < deathChance) {
            this.die('vieillesse');
        }
    }

    updateHunger(hasFood, famineResistance = 1) {
        if (!this.isAlive) return;
        if (!hasFood) {
            this.hunger += CONFIG.gameSpeed * 0.5 / famineResistance;
            if (this.hunger >= 100) {
                this.die('famine');
            } else if (this.hunger > 50) {
                this.takeDamage(CONFIG.starvationDamage * CONFIG.gameSpeed * 0.01 / famineResistance, 'famine');
            }
        } else {
            this.hunger = Math.max(0, this.hunger - CONFIG.gameSpeed * 0.3);
            if (this.hunger < 20 && this.combatStats.health < this.combatStats.maxHealth) {
                this.combatStats.health = Math.min(
                    this.combatStats.maxHealth,
                    this.combatStats.health + CONFIG.gameSpeed * 0.05
                );
            }
        }
    }

    findNearestEnemy(allFactions) {
        if (!this.isAlive) return null;
        let nearestEnemy = null;
        let nearestDist = Infinity;
        const detectionRange = this.unitType === UNIT_TYPE.VILLAGER ? 5 : 10;

        allFactions.forEach(faction => {
            if (faction.id === this.factionId) return;

            faction.villagers.forEach(enemy => {
                if (!enemy.isAlive) return;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < detectionRange && dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = enemy;
                }
            });
        });

        return nearestEnemy ? { enemy: nearestEnemy, distance: nearestDist } : null;
    }

    attack(target) {
        if (!this.isAlive || !target || !target.isAlive) return;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.combatStats.range + 1) return;

        const baseDamage = this.combatStats.attack;
        const defense = target.combatStats.defense;
        const damage = Math.max(1, baseDamage - defense * 0.5) * 0.1 * CONFIG.gameSpeed;

        target.takeDamage(damage, 'combat');

        if (this.combatStats.range > 1) {
            this.skills.archery = Math.min(100, this.skills.archery + 0.05);
        } else {
            this.skills.combat = Math.min(100, this.skills.combat + 0.05);
        }
    }

    handleCombat(allFactions, gameMap) {
        if (!this.isAlive) return false;

        const enemyInfo = this.findNearestEnemy(allFactions);
        if (!enemyInfo) return false;

        const { enemy, distance } = enemyInfo;

        if (this.unitType === UNIT_TYPE.VILLAGER) {
            if (this.skills.combat < 50) {
                const dx = this.x - enemy.x;
                const dy = this.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const fleeX = this.x + (dx / dist) * 3;
                    const fleeY = this.y + (dy / dist) * 3;
                    if (gameMap.isWalkable(Math.floor(fleeX), Math.floor(fleeY))) {
                        this.targetX = fleeX;
                        this.targetY = fleeY;
                    }
                }
                return true;
            }
        }

        // Soldiers or brave villagers: fight
        if (distance <= this.combatStats.range + 1) {
            this.attack(enemy);
        } else {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const moveSpeed = this.unitType === UNIT_TYPE.CAVALRY ? 3 : 2;
            const newX = this.x + (dx / dist) * moveSpeed;
            const newY = this.y + (dy / dist) * moveSpeed;
            if (gameMap.isWalkable(Math.floor(newX), Math.floor(newY))) {
                this.targetX = newX;
                this.targetY = newY;
            }
        }

        this.currentTask = 'combat';
        return true;
    }

    findPreferredResource(gameMap, faction) {
        const factionConfig = this._getFactionConfig();
        const preferredTerrain = factionConfig.traits.preferredTerrain;

        let bestTarget = null;
        let bestScore = -Infinity;

        const searchRadius = 15;
        const px = Math.floor(this.x);
        const py = Math.floor(this.y);

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const x = px + dx;
                const y = py + dy;

                if (x < 0 || x >= gameMap.width || y < 0 || y >= gameMap.height) continue;
                if (gameMap.territory[y][x] !== this.factionId) continue;
                if (!gameMap.isWalkable(x, y)) continue;

                const terrain = gameMap.terrain[y][x];
                const resource = gameMap.resources[y][x];

                if (resource.amount <= 0) continue;

                const dist = Math.sqrt(dx * dx + dy * dy);
                let score = resource.amount - dist * 2;

                if (terrain === preferredTerrain) {
                    score += 50;
                }

                if (this.factionType === 'elf' && terrain === TERRAIN.FOREST) {
                    score += 30;
                }

                if (this.factionType === 'human' && terrain === TERRAIN.IRON) {
                    score += 25;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = { x, y, terrain };
                }
            }
        }

        return bestTarget;
    }

    update(gameMap, faction, allFactions) {
        if (!this.isAlive) return;

        // Update job periodically (unless pinned by an agent action)
        this.jobChangeTimer += CONFIG.gameSpeed;
        if (!this.jobPinned && this.jobChangeTimer > 1000) {
            this.jobChangeTimer = 0;
            this.job = this.determineJob();
        }

        this.moveTimer += CONFIG.gameSpeed;

        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            this.moveInterval = 50 + Math.random() * 100;

            // Priority 1: Combat (except breeders who always flee)
            if (allFactions && this.job !== JOB.BREEDER) {
                if (this.handleCombat(allFactions, gameMap)) {
                    this.applyMovement(gameMap);
                    return;
                }
            } else if (allFactions && this.job === JOB.BREEDER) {
                const enemyInfo = this.findNearestEnemy(allFactions);
                if (enemyInfo && enemyInfo.distance < 8) {
                    this.fleeFrom(enemyInfo.enemy, gameMap);
                    this.applyMovement(gameMap);
                    return;
                }
            }

            // Behavior based on job
            this.executeJobBehavior(gameMap, faction);
        }

        this.applyMovement(gameMap);
    }

    applyMovement(gameMap) {
        const speedMultiplier = gameMap.getSpeedMultiplier(Math.floor(this.x), Math.floor(this.y));
        const speed = 0.02 * CONFIG.gameSpeed * speedMultiplier;
        this.x += (this.targetX - this.x) * speed;
        this.y += (this.targetY - this.y) * speed;
    }

    fleeFrom(enemy, gameMap) {
        const dx = this.x - enemy.x;
        const dy = this.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            const fleeX = Math.max(0, Math.min(CONFIG.mapWidth - 1, this.x + (dx / dist) * 4));
            const fleeY = Math.max(0, Math.min(CONFIG.mapHeight - 1, this.y + (dy / dist) * 4));
            if (gameMap.isWalkable(Math.floor(fleeX), Math.floor(fleeY))) {
                this.targetX = fleeX;
                this.targetY = fleeY;
            }
        }
        this.currentTask = 'flee';
    }

    executeJobBehavior(gameMap, faction) {
        let newX, newY;

        const aliveCount = faction.villagers.filter(v => v.isAlive).length;
        const criticalFood = faction.resources.food < aliveCount * 10;
        const lowFood = faction.resources.food < aliveCount * 30;

        // Survival priority: only food-related jobs forage
        const isFoodJob = [JOB.GATHERER, JOB.FARMER, JOB.HUNTER, JOB.FISHER].includes(this.job);

        if (criticalFood && this.currentTask !== 'forage' && isFoodJob && Math.random() < 0.4) {
            const berryTarget = this.findResourceOfType(gameMap, faction, [TERRAIN.BERRIES]);
            if (berryTarget) {
                this.currentTask = 'forage';
                this.taskTarget = berryTarget;
            }
        }

        // Forage mode (survival)
        if (this.currentTask === 'forage') {
            this._doGatherTask(gameMap, faction);
            if (faction.resources.food > aliveCount * 25) {
                this.currentTask = null;
                this.taskTarget = null;
            }
            return;
        }

        switch (this.job) {
            case JOB.GATHERER:
                if (!this.currentTask || this.currentTask === 'flee' || Math.random() < 0.05) {
                    let target;
                    if (lowFood) {
                        target = this.findResourceOfType(gameMap, faction, [TERRAIN.BERRIES]);
                    }
                    if (!target) {
                        target = this.findResourceOfType(gameMap, faction, [TERRAIN.FOREST, TERRAIN.STONE, TERRAIN.IRON, TERRAIN.GOLD, TERRAIN.BERRIES]);
                    }
                    if (target) {
                        this.currentTask = 'gather';
                        this.taskTarget = target;
                    }
                }
                this._doGatherTask(gameMap, faction);
                break;

            case JOB.FARMER:
                if (!this.currentTask || this.currentTask === 'flee' || Math.random() < 0.05) {
                    const farm = this.findNearestBuilding(faction, BUILDING.FARM);
                    if (farm) {
                        this.currentTask = 'farm';
                        this.taskTarget = farm;
                    } else {
                        const target = this.findResourceOfType(gameMap, faction, [TERRAIN.BERRIES, TERRAIN.FOREST]);
                        if (target) {
                            this.currentTask = 'gather';
                            this.taskTarget = target;
                        }
                    }
                }
                if (this.currentTask === 'farm') {
                    this._doFarmTask(gameMap, faction);
                } else {
                    this._doGatherTask(gameMap, faction);
                }
                break;

            case JOB.BUILDER:
                if (!this.currentTask || this.currentTask === 'flee' || Math.random() < 0.05) {
                    const needWood = faction.resources.wood < 100;
                    const needStone = faction.resources.stone < 50;

                    if (needWood || needStone) {
                        const terrains = needWood ? [TERRAIN.FOREST] : [TERRAIN.STONE];
                        const target = this.findResourceOfType(gameMap, faction, terrains);
                        if (target) {
                            this.currentTask = 'gather';
                            this.taskTarget = target;
                        }
                    } else {
                        const castle = this.findNearestBuilding(faction, BUILDING.CASTLE);
                        if (castle) {
                            this.currentTask = 'build';
                            this.taskTarget = castle;
                        }
                    }
                }
                if (this.currentTask === 'gather') {
                    this._doGatherTask(gameMap, faction);
                } else {
                    this._doBuildTask(gameMap, faction);
                }
                break;

            case JOB.WARRIOR:
                if (!this.currentTask || this.currentTask === 'flee' || Math.random() < 0.1) {
                    this.currentTask = 'patrol';
                    const borderPos = this.findBorderPosition(gameMap, faction);
                    if (borderPos) {
                        this.taskTarget = borderPos;
                    }
                }
                this._doPatrolTask(gameMap, faction);
                break;

            case JOB.HUNTER:
                if (!this.currentTask || this.currentTask === 'flee' || Math.random() < 0.08) {
                    const animal = this.findNearestAnimal(gameMap, faction);
                    if (animal) {
                        this.currentTask = 'hunt';
                        this.huntTarget = animal;
                    } else {
                        if (Math.random() < 0.5) {
                            const target = this.findResourceOfType(gameMap, faction, [TERRAIN.FOREST, TERRAIN.BERRIES]);
                            if (target) {
                                this.currentTask = 'gather';
                                this.taskTarget = target;
                            }
                        } else {
                            this.currentTask = 'patrol';
                            const borderPos = this.findBorderPosition(gameMap, faction);
                            if (borderPos) this.taskTarget = borderPos;
                        }
                    }
                }
                if (this.currentTask === 'hunt') {
                    this._doHuntTask(gameMap, faction);
                } else if (this.currentTask === 'patrol') {
                    this._doPatrolTask(gameMap, faction);
                } else {
                    this._doGatherTask(gameMap, faction);
                }
                break;

            case JOB.FISHER:
                if (!this.currentTask || this.currentTask === 'flee' || Math.random() < 0.05) {
                    const waterPos = this.findNearbyWater(gameMap, faction);
                    if (waterPos) {
                        this.currentTask = 'fish';
                        this.taskTarget = waterPos;
                    }
                }
                this._doFishTask(gameMap, faction);
                break;

            case JOB.BREEDER:
                if (!this.currentTask || this.currentTask === 'flee' || Math.random() < 0.05) {
                    const house = this.findNearestBuilding(faction, BUILDING.HOUSE);
                    const castle = this.findNearestBuilding(faction, BUILDING.CASTLE);
                    this.taskTarget = house || castle;
                    this.currentTask = 'socialize';
                }
                this._doSocializeTask(gameMap, faction);
                break;

            default:
                this.doRandomMovement(gameMap);
        }
    }

    // Find a resource of a specific type
    findResourceOfType(gameMap, faction, terrainTypes) {
        let bestTarget = null;
        let bestScore = -Infinity;
        const searchRadius = 20;

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const x = Math.floor(this.x) + dx;
                const y = Math.floor(this.y) + dy;
                if (x < 0 || x >= gameMap.width || y < 0 || y >= gameMap.height) continue;
                if (!gameMap.isWalkable(x, y)) continue;

                const terrain = gameMap.terrain[y][x];
                if (!terrainTypes.includes(terrain)) continue;

                const resource = gameMap.resources[y][x];
                if (resource.amount <= 0) continue;

                const dist = Math.sqrt(dx * dx + dy * dy);
                const score = resource.amount - dist * 2 + Math.random() * 15;

                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = { x: x + 0.5, y: y + 0.5 };
                }
            }
        }
        return bestTarget;
    }

    // Find the nearest building of a type
    findNearestBuilding(faction, buildingType) {
        let nearest = null;
        let nearestDist = Infinity;

        faction.buildings.forEach(b => {
            if (b.type === buildingType) {
                const dx = b.x - this.x;
                const dy = b.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = { x: b.x + 0.5, y: b.y + 0.5 };
                }
            }
        });
        return nearest;
    }

    // Find a position at the territory border
    findBorderPosition(gameMap, faction) {
        const candidates = [];
        for (let y = 0; y < gameMap.height; y++) {
            for (let x = 0; x < gameMap.width; x++) {
                if (gameMap.territory[y][x] !== faction.id) continue;
                const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                const isBorder = neighbors.some(([nx, ny]) => {
                    if (nx < 0 || nx >= gameMap.width || ny < 0 || ny >= gameMap.height) return true;
                    return gameMap.territory[ny][nx] !== faction.id;
                });
                if (isBorder && gameMap.isWalkable(x, y)) {
                    candidates.push({ x: x + 0.5, y: y + 0.5 });
                }
            }
        }
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Find nearby water
    findNearbyWater(gameMap, faction) {
        let nearest = null;
        let nearestDist = Infinity;

        for (let dy = -15; dy <= 15; dy++) {
            for (let dx = -15; dx <= 15; dx++) {
                const x = Math.floor(this.x) + dx;
                const y = Math.floor(this.y) + dy;
                if (x < 0 || x >= gameMap.width || y < 0 || y >= gameMap.height) continue;

                if (gameMap.terrain[y][x] === TERRAIN.WATER) {
                    const adjacent = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                    for (const [ax, ay] of adjacent) {
                        if (ax >= 0 && ax < gameMap.width && ay >= 0 && ay < gameMap.height) {
                            if (gameMap.isWalkable(ax, ay) && gameMap.terrain[ay][ax] !== TERRAIN.WATER) {
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < nearestDist) {
                                    nearestDist = dist;
                                    nearest = { x: ax + 0.5, y: ay + 0.5 };
                                }
                            }
                        }
                    }
                }
            }
        }
        return nearest;
    }

    // Find nearest animal in territory
    findNearestAnimal(gameMap, faction) {
        if (!gameMap.animals || gameMap.animals.length === 0) return null;

        let nearest = null;
        let nearestDist = Infinity;

        for (const animal of gameMap.animals) {
            if (!animal.isAlive || animal.typeData.aquatic) continue;

            const dx = animal.x - this.x;
            const dy = animal.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const ax = Math.floor(animal.x);
            const ay = Math.floor(animal.y);
            if (ax >= 0 && ax < gameMap.width && ay >= 0 && ay < gameMap.height) {
                const inTerritory = gameMap.territory[ay][ax] === faction.id;
                const closeEnough = dist < 15;

                if ((inTerritory || closeEnough) && dist < nearestDist) {
                    nearestDist = dist;
                    nearest = animal;
                }
            }
        }
        return nearest;
    }

    // Task: gather resources
    _doGatherTask(gameMap, faction) {
        if (!this.taskTarget) {
            this.doRandomMovement(gameMap);
            return;
        }

        const dx = this.taskTarget.x - this.x;
        const dy = this.taskTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1.5) {
            this.gatherTimer += CONFIG.gameSpeed;
            if (this.gatherTimer > 50) {
                this.gatherTimer = 0;
                const tx = Math.floor(this.taskTarget.x);
                const ty = Math.floor(this.taskTarget.y);
                const resource = gameMap.resources[ty][tx];
                const terrain = gameMap.terrain[ty][tx];

                if (resource && resource.amount > 0) {
                    const skillBonus = 1 + this.skills.gathering / 100;
                    const techBonus = (terrain === TERRAIN.STONE || terrain === TERRAIN.IRON)
                        ? (faction.traits.miningBonus || 1) : 1;
                    const gatherAmount = Math.min(5 * skillBonus * techBonus, resource.amount);
                    resource.amount -= gatherAmount;

                    if (terrain === TERRAIN.FOREST) faction.resources.wood += gatherAmount;
                    else if (terrain === TERRAIN.STONE) faction.resources.stone += gatherAmount;
                    else if (terrain === TERRAIN.IRON) faction.resources.iron += gatherAmount;
                    else if (terrain === TERRAIN.GOLD) faction.resources.gold += gatherAmount * (faction.traits.tradeBonus || 1);
                    else if (terrain === TERRAIN.BERRIES) faction.resources.food += gatherAmount * 1.5;

                    this.skills.gathering = Math.min(100, this.skills.gathering + 0.1);
                }

                if (!resource || resource.amount <= 0) {
                    this.currentTask = null;
                    this.taskTarget = null;
                }
            }
        } else {
            this.moveToward(this.taskTarget, gameMap, 2);
        }
    }

    // Task: farm - produce food near farms
    _doFarmTask(gameMap, faction) {
        if (!this.taskTarget) {
            this.doRandomMovement(gameMap);
            return;
        }

        const dx = this.taskTarget.x - this.x;
        const dy = this.taskTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 3) {
            this.gatherTimer += CONFIG.gameSpeed;
            if (this.gatherTimer > 25) {
                this.gatherTimer = 0;
                const skillBonus = 1 + this.skills.farming / 50;
                const techBonus = faction.traits.farmingBonus || 1;
                const seasonMods = Villager.getSeasonModifiers();
                faction.resources.food += 5 * skillBonus * techBonus * seasonMods.foodProduction * CONFIG.gameSpeed * 0.15;
                this.skills.farming = Math.min(100, this.skills.farming + 0.15);
            }
            if (Math.random() < 0.1) {
                const newX = this.taskTarget.x + (Math.random() - 0.5) * 4;
                const newY = this.taskTarget.y + (Math.random() - 0.5) * 4;
                if (gameMap.isWalkable(Math.floor(newX), Math.floor(newY))) {
                    this.targetX = newX;
                    this.targetY = newY;
                }
            }
        } else {
            this.moveToward(this.taskTarget, gameMap, 2);
        }
    }

    // Task: build
    _doBuildTask(gameMap, faction) {
        if (!this.taskTarget) {
            this.doRandomMovement(gameMap);
            return;
        }

        const dx = this.taskTarget.x - this.x;
        const dy = this.taskTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
            this.gatherTimer += CONFIG.gameSpeed;
            if (this.gatherTimer > 60) {
                this.gatherTimer = 0;
                this.skills.building = Math.min(100, this.skills.building + 0.1);
                faction.traits.buildSpeed = Math.min(2, (faction.traits.buildSpeed || 1) + 0.001);
            }
            if (Math.random() < 0.15) {
                const newX = this.taskTarget.x + (Math.random() - 0.5) * 6;
                const newY = this.taskTarget.y + (Math.random() - 0.5) * 6;
                if (gameMap.isWalkable(Math.floor(newX), Math.floor(newY))) {
                    this.targetX = newX;
                    this.targetY = newY;
                }
            }
        } else {
            this.moveToward(this.taskTarget, gameMap, 2);
        }
    }

    // Task: patrol
    _doPatrolTask(gameMap, faction) {
        if (!this.taskTarget) {
            this.doRandomMovement(gameMap);
            return;
        }

        const dx = this.taskTarget.x - this.x;
        const dy = this.taskTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            this.currentTask = null;
            this.taskTarget = null;
            this.skills.combat = Math.min(100, this.skills.combat + 0.05);
        } else {
            this.moveToward(this.taskTarget, gameMap, 2.5);
        }
    }

    // Task: fish
    _doFishTask(gameMap, faction) {
        if (!this.taskTarget) {
            this.doRandomMovement(gameMap);
            return;
        }

        const dx = this.taskTarget.x - this.x;
        const dy = this.taskTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            this.gatherTimer += CONFIG.gameSpeed;
            if (this.gatherTimer > 45) {
                this.gatherTimer = 0;
                const skillBonus = 1 + (this.skills.farming + this.skills.gathering) / 200;
                faction.resources.fish = (faction.resources.fish || 0) + 1.5 * skillBonus;
                faction.resources.food += 1 * skillBonus;
                this.skills.farming = Math.min(100, this.skills.farming + 0.05);
            }
            if (Math.random() < 0.08) {
                const newX = this.x + (Math.random() - 0.5) * 3;
                const newY = this.y + (Math.random() - 0.5) * 3;
                if (gameMap.isWalkable(Math.floor(newX), Math.floor(newY))) {
                    this.targetX = newX;
                    this.targetY = newY;
                }
            }
        } else {
            this.moveToward(this.taskTarget, gameMap, 1.5);
        }
    }

    // Task: hunt an animal
    _doHuntTask(gameMap, faction) {
        if (!this.huntTarget || !this.huntTarget.isAlive) {
            this.currentTask = null;
            this.huntTarget = null;
            return;
        }

        const dx = this.huntTarget.x - this.x;
        const dy = this.huntTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const attackRange = 2 + (this.skills.archery / 50);

        if (dist < attackRange) {
            this.gatherTimer += CONFIG.gameSpeed;
            if (this.gatherTimer > 30) {
                this.gatherTimer = 0;

                const damage = 10 + this.skills.archery * 0.3;
                this.huntTarget.health -= damage;

                this.skills.archery = Math.min(100, this.skills.archery + 0.1);
                this.skills.combat = Math.min(100, this.skills.combat + 0.05);

                if (this.huntTarget.health <= 0) {
                    this.huntTarget.isAlive = false;
                    const foodGained = this.huntTarget.typeData.food || 10;
                    faction.resources.food += foodGained;
                    this.huntTarget = null;
                    this.currentTask = null;
                }
            }
        } else {
            this.moveToward({ x: this.huntTarget.x, y: this.huntTarget.y }, gameMap, 2);
        }
    }

    // Task: socialize (for breeders)
    _doSocializeTask(gameMap, faction) {
        if (!this.taskTarget) {
            this.taskTarget = { x: this.x, y: this.y };
        }

        const dx = this.taskTarget.x - this.x;
        const dy = this.taskTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 4) {
            if (Math.random() < 0.1) {
                const newX = this.taskTarget.x + (Math.random() - 0.5) * 6;
                const newY = this.taskTarget.y + (Math.random() - 0.5) * 6;
                if (gameMap.isWalkable(Math.floor(newX), Math.floor(newY))) {
                    this.targetX = newX;
                    this.targetY = newY;
                }
            }
        } else {
            this.moveToward(this.taskTarget, gameMap, 1);
        }
    }

    // Random movement
    doRandomMovement(gameMap) {
        const dx = (Math.random() - 0.5) * 4;
        const dy = (Math.random() - 0.5) * 4;
        const newX = Math.max(0, Math.min(CONFIG.mapWidth - 1, this.x + dx));
        const newY = Math.max(0, Math.min(CONFIG.mapHeight - 1, this.y + dy));
        if (gameMap.isWalkable(Math.floor(newX), Math.floor(newY))) {
            this.targetX = newX;
            this.targetY = newY;
        }
    }

    // Move toward a target
    moveToward(target, gameMap, speed) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            const newX = Math.max(0, Math.min(CONFIG.mapWidth - 1, this.x + (dx / dist) * speed));
            const newY = Math.max(0, Math.min(CONFIG.mapHeight - 1, this.y + (dy / dist) * speed));
            if (gameMap.isWalkable(Math.floor(newX), Math.floor(newY))) {
                this.targetX = newX;
                this.targetY = newY;
            }
        }
    }

    // Static helper: season modifiers (ported from v1 getSeasonModifiers)
    static getCurrentSeason() {
        const month = CONFIG.currentMonth;
        if (month === 11 || month <= 1) return 3; // Winter
        if (month >= 2 && month <= 4) return 0;   // Spring
        if (month >= 5 && month <= 7) return 1;   // Summer
        return 2;                                   // Autumn
    }

    static getSeasonModifiers() {
        const season = Villager.getCurrentSeason();
        switch (season) {
            case 0: return { foodProduction: 1.2, birthRate: 1.3, movementSpeed: 1.0 };
            case 1: return { foodProduction: 1.5, birthRate: 1.0, movementSpeed: 1.1 };
            case 2: return { foodProduction: 1.3, birthRate: 0.8, movementSpeed: 1.0 };
            case 3: return { foodProduction: 0.5, birthRate: 0.5, movementSpeed: 0.8 };
            default: return { foodProduction: 1.0, birthRate: 1.0, movementSpeed: 1.0 };
        }
    }
}
