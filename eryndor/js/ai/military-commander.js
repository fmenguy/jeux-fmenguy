import { UNIT_TYPE, JOB, BUILDING, DIPLOMACY_STATUS } from '../enums.js';
import { CONFIG } from '../config.js';
import { COMBAT_STATS } from '../data/events.js';
import { eventBus } from '../event-bus.js';

/**
 * MilitaryCommander - Manages all military operations for a faction:
 *   - Patrol: assigns guards to borders facing the primary threat
 *   - Attack: forms attack groups with formation when strong enough
 *   - Defend: rallies units to intercept intruders
 *   - Retreat: pulls back groups that are outmatched
 *   - Training: ensures new military units are produced when needed
 */
export class MilitaryCommander {

    constructor() {
        this._attackGroups = [];   // active attack formations
        this._defenseRally = null; // current defense rally point
        this._warTick = 0;         // tick when current war started
    }

    // ------------------------------------------------------------------ //
    //  Public API
    // ------------------------------------------------------------------ //

    update(faction, game, priorities, threats) {
        const map = game.map || game.gameMap;
        if (!map) return;

        // Manage training pipeline
        this._handleTraining(faction, game, priorities);

        // Detect intruders and decide stance
        const intruders = this._findIntruders(faction, game, map);
        const atWar = this._isAtWar(faction, game);

        if (intruders.length > 0) {
            this._defend(faction, game, map, intruders);
        } else if (atWar && this._shouldAttack(faction, game, threats)) {
            this._attack(faction, game, map, threats);
        } else {
            this._patrol(faction, game, map, threats);
        }

        // Update existing attack groups
        this._updateAttackGroups(faction, game, map);
    }

    // ------------------------------------------------------------------ //
    //  DEFEND
    // ------------------------------------------------------------------ //

    _defend(faction, game, map, intruders) {
        // Find the centroid of intruder positions as rally point
        let rx = 0, ry = 0;
        for (const i of intruders) { rx += i.x; ry += i.y; }
        rx /= intruders.length;
        ry /= intruders.length;

        this._defenseRally = { x: rx, y: ry };

        // Rally all military units to defense point
        const military = this._getMilitaryUnits(faction);
        for (const unit of military) {
            if (unit.currentTask === 'combat') continue; // already fighting
            unit.currentTask = 'patrol';
            unit.taskTarget = { x: rx + (Math.random() - 0.5) * 4, y: ry + (Math.random() - 0.5) * 4 };
        }

        // Also recruit brave villagers with high combat skill
        const braveVillagers = faction.villagers.filter(v =>
            v.isAlive &&
            v.unitType === UNIT_TYPE.VILLAGER &&
            v.skills.combat >= 50 &&
            v.currentTask !== 'flee' &&
            v.job !== JOB.BREEDER
        );

        for (const v of braveVillagers) {
            const dx = rx - v.x;
            const dy = ry - v.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 15) { // only nearby ones
                v.currentTask = 'patrol';
                v.taskTarget = { x: rx + (Math.random() - 0.5) * 3, y: ry + (Math.random() - 0.5) * 3 };
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  ATTACK
    // ------------------------------------------------------------------ //

    _attack(faction, game, map, threats) {
        if (this._attackGroups.length > 0) return; // already attacking

        const target = this._selectAttackTarget(faction, game, map, threats);
        if (!target) return;

        const group = this._formAttackGroup(faction, target);
        if (group.units.length < 3) return; // too few units

        this._attackGroups.push(group);

        eventBus.emit('attack-launched', {
            faction: faction.id,
            target: target,
            groupSize: group.units.length
        });
    }

    _selectAttackTarget(faction, game, map, threats) {
        if (!threats || !threats.primaryThreat) return null;

        const enemy = (game.factions || []).find(f => f.id === threats.primaryThreat.factionId);
        if (!enemy) return null;

        // Priority 1: nearest enemy building
        let nearestBuilding = null;
        let nearestDist = Infinity;
        const center = this._factionCenter(faction);

        for (const b of enemy.buildings) {
            const dx = b.x - center.x;
            const dy = b.y - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestBuilding = b;
            }
        }

        if (nearestBuilding) {
            return { x: nearestBuilding.x, y: nearestBuilding.y, type: 'building' };
        }

        // Priority 2: weakest enemy unit cluster
        const enemyAlive = enemy.villagers.filter(v => v.isAlive);
        if (enemyAlive.length > 0) {
            // Find the cluster centroid closest to us
            let closestEnemy = null;
            let closestDist = Infinity;
            for (const v of enemyAlive) {
                const dx = v.x - center.x;
                const dy = v.y - center.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = v;
                }
            }
            if (closestEnemy) {
                return { x: closestEnemy.x, y: closestEnemy.y, type: 'units' };
            }
        }

        // Fallback: enemy center
        if (threats.primaryThreat.enemyCenter) {
            return { ...threats.primaryThreat.enemyCenter, type: 'center' };
        }

        return null;
    }

    /**
     * Form an attack group with formation:
     *   - Melee (soldiers) at the front
     *   - Ranged (archers) behind
     *   - Cavalry on flanks
     */
    _formAttackGroup(faction, target) {
        const military = this._getMilitaryUnits(faction).filter(u =>
            u.currentTask !== 'combat'
        );

        const melee = military.filter(u =>
            u.unitType === UNIT_TYPE.SOLDIER || (u.unitType === UNIT_TYPE.VILLAGER && u.job === JOB.WARRIOR)
        );
        const ranged = military.filter(u => u.unitType === UNIT_TYPE.ARCHER);
        const cavalry = military.filter(u => u.unitType === UNIT_TYPE.CAVALRY);
        const scouts = military.filter(u => u.unitType === UNIT_TYPE.SCOUT);

        const allUnits = [...melee, ...ranged, ...cavalry, ...scouts];

        // Assign formation offsets relative to target
        const center = this._factionCenter(faction);
        const dx = target.x - center.x;
        const dy = target.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const dirX = dx / dist;
        const dirY = dy / dist;

        // Perpendicular direction for flanks
        const perpX = -dirY;
        const perpY = dirX;

        // Position melee at front
        for (let i = 0; i < melee.length; i++) {
            const spread = (i - melee.length / 2) * 1.5;
            melee[i].currentTask = 'attack_move';
            melee[i].taskTarget = {
                x: target.x + perpX * spread,
                y: target.y + perpY * spread
            };
        }

        // Ranged behind
        for (let i = 0; i < ranged.length; i++) {
            const spread = (i - ranged.length / 2) * 1.5;
            ranged[i].currentTask = 'attack_move';
            ranged[i].taskTarget = {
                x: target.x - dirX * 3 + perpX * spread,
                y: target.y - dirY * 3 + perpY * spread
            };
        }

        // Cavalry on flanks
        for (let i = 0; i < cavalry.length; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            const offset = Math.floor(i / 2) + 1;
            cavalry[i].currentTask = 'attack_move';
            cavalry[i].taskTarget = {
                x: target.x + perpX * side * (3 + offset),
                y: target.y + perpY * side * (3 + offset)
            };
        }

        // Scouts slightly ahead for vision
        for (const s of scouts) {
            s.currentTask = 'attack_move';
            s.taskTarget = {
                x: target.x + dirX * 3,
                y: target.y + dirY * 3
            };
        }

        return {
            units: allUnits.map(u => u.id),
            target,
            createdTick: CONFIG.currentTick || 0
        };
    }

    _updateAttackGroups(faction, game, map) {
        this._attackGroups = this._attackGroups.filter(group => {
            // Check if group is still viable
            const alive = group.units.filter(id => {
                const v = faction.villagers.find(v => v.id === id);
                return v && v.isAlive;
            });

            if (alive.length === 0) return false;

            // Check if we should retreat
            const groupPower = this._groupPower(faction, alive);
            const nearbyEnemyPower = this._nearbyEnemyPower(faction, game, group.target, 10);

            if (groupPower < nearbyEnemyPower * 0.4) {
                // RETREAT
                this._retreat(faction, alive, map);
                eventBus.emit('retreat-ordered', { faction: faction.id });
                return false;
            }

            // Check if target reached or destroyed (group dissolves after timeout)
            const elapsed = (CONFIG.currentTick || 0) - group.createdTick;
            if (elapsed > 2000) return false; // stale group

            return true;
        });
    }

    // ------------------------------------------------------------------ //
    //  RETREAT
    // ------------------------------------------------------------------ //

    _retreat(faction, unitIds, map) {
        // Find nearest defensive structure or town center
        const rallyPoint = this._findRetreatPoint(faction, map);

        for (const id of unitIds) {
            const v = faction.villagers.find(v => v.id === id);
            if (!v || !v.isAlive) continue;

            v.currentTask = 'patrol';
            v.taskTarget = {
                x: rallyPoint.x + (Math.random() - 0.5) * 4,
                y: rallyPoint.y + (Math.random() - 0.5) * 4
            };
        }
    }

    _findRetreatPoint(faction, map) {
        // Prefer tower or castle
        for (const b of faction.buildings) {
            if (b.type === BUILDING.TOWER || b.type === BUILDING.CASTLE) {
                return { x: b.x, y: b.y };
            }
        }
        // Fallback to faction center
        return this._factionCenter(faction);
    }

    // ------------------------------------------------------------------ //
    //  PATROL
    // ------------------------------------------------------------------ //

    _patrol(faction, game, map, threats) {
        const military = this._getMilitaryUnits(faction);
        const idleMilitary = military.filter(u =>
            !u.currentTask || u.currentTask === 'idle' || u.currentTask === 'patrol'
        );

        if (idleMilitary.length === 0) return;

        // Determine patrol direction based on primary threat
        let patrolCenter;
        if (threats && threats.primaryThreat) {
            const center = this._factionCenter(faction);
            const enemyCenter = threats.primaryThreat.enemyCenter || center;
            // Patrol at 70% of the way between our center and the enemy
            patrolCenter = {
                x: center.x + (enemyCenter.x - center.x) * 0.5,
                y: center.y + (enemyCenter.y - center.y) * 0.5
            };
        } else {
            // Default: patrol border
            patrolCenter = this._findBorderCenter(faction, map);
        }

        for (const unit of idleMilitary) {
            // Assign patrol position with some scatter
            unit.currentTask = 'patrol';
            unit.taskTarget = {
                x: Math.max(0, Math.min(CONFIG.mapWidth - 1,
                    patrolCenter.x + (Math.random() - 0.5) * 10)),
                y: Math.max(0, Math.min(CONFIG.mapHeight - 1,
                    patrolCenter.y + (Math.random() - 0.5) * 10))
            };
        }
    }

    // ------------------------------------------------------------------ //
    //  TRAINING
    // ------------------------------------------------------------------ //

    _handleTraining(faction, game, priorities) {
        if (priorities.military < 0.15) return;

        const alive = faction.villagers.filter(v => v.isAlive);
        const pop = alive.length;
        const militaryCount = this._getMilitaryUnits(faction).length;

        // Target military ratio: 10-30% of population
        const targetRatio = 0.10 + priorities.military * 0.40; // scale with priority
        const targetCount = Math.floor(pop * targetRatio);

        if (militaryCount >= targetCount) return;

        // Find barracks or archery range
        const hasBarracks = faction.buildings.some(b => b.type === BUILDING.BARRACKS);
        const hasArcheryRange = faction.buildings.some(b => b.type === BUILDING.ARCHERY_RANGE);

        if (!hasBarracks && !hasArcheryRange) return;

        // Find best candidate villager to promote
        const candidates = alive.filter(v =>
            v.unitType === UNIT_TYPE.VILLAGER &&
            v.job !== JOB.BREEDER &&
            v.currentAge >= 16 &&
            v.currentTask !== 'research' &&
            v.currentTask !== 'combat'
        );

        if (candidates.length === 0) return;

        // Don't promote if population is too low (need workers)
        if (pop < 8) return;

        // Choose unit type based on faction and available buildings
        const factionType = faction.type || (alive[0] && alive[0].factionType);

        // Sort candidates by combat-relevant skills
        candidates.sort((a, b) => {
            const aScore = a.skills.combat + a.skills.archery;
            const bScore = b.skills.combat + b.skills.archery;
            return bScore - aScore;
        });

        const recruit = candidates[0];

        // Decide unit type
        let unitType;
        if (factionType === 'elf' && hasArcheryRange) {
            // Elves prefer archers
            unitType = recruit.skills.archery > recruit.skills.combat
                ? UNIT_TYPE.ARCHER
                : UNIT_TYPE.SOLDIER;
        } else if (hasBarracks) {
            // Humans prefer melee
            if (recruit.skills.combat > 60 && Math.random() < 0.3) {
                unitType = UNIT_TYPE.CAVALRY;
            } else {
                unitType = UNIT_TYPE.SOLDIER;
            }
        } else if (hasArcheryRange) {
            unitType = UNIT_TYPE.ARCHER;
        } else {
            return;
        }

        // Check iron cost for promotion
        const ironCost = unitType === UNIT_TYPE.CAVALRY ? 15 : (unitType === UNIT_TYPE.SOLDIER ? 10 : 5);
        if ((faction.resources.iron || 0) < ironCost) return;
        faction.resources.iron -= ironCost;

        recruit.promote(unitType);
        recruit.job = JOB.WARRIOR;

        eventBus.emit('unit-promoted', {
            faction: faction.id,
            unitType,
            villagerId: recruit.id,
            name: recruit.fullName
        });
    }

    // ------------------------------------------------------------------ //
    //  Helpers
    // ------------------------------------------------------------------ //

    _getMilitaryUnits(faction) {
        return faction.villagers.filter(v =>
            v.isAlive && (
                v.unitType === UNIT_TYPE.SOLDIER ||
                v.unitType === UNIT_TYPE.ARCHER ||
                v.unitType === UNIT_TYPE.CAVALRY ||
                v.unitType === UNIT_TYPE.SCOUT ||
                v.job === JOB.WARRIOR
            )
        );
    }

    _findIntruders(faction, game, map) {
        const intruders = [];
        const enemies = (game.factions || []).filter(f => f.id !== faction.id);

        for (const enemy of enemies) {
            for (const v of enemy.villagers) {
                if (!v.isAlive) continue;
                const tx = Math.floor(v.x);
                const ty = Math.floor(v.y);
                if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;
                if (map.territory[ty][tx] === faction.id) {
                    intruders.push(v);
                }
            }
        }

        return intruders;
    }

    _isAtWar(faction, game) {
        if (!game.diplomacy) return false;
        const enemies = (game.factions || []).filter(f => f.id !== faction.id);
        for (const enemy of enemies) {
            const status = this._getDiplomacyStatus(faction.id, enemy.id, game);
            if (status === DIPLOMACY_STATUS.WAR) return true;
        }
        return false;
    }

    _shouldAttack(faction, game, threats) {
        if (!threats || !threats.primaryThreat) return false;

        // Only attack if we're stronger
        if (threats.primaryThreat.militaryRatio > 0.8) return false; // enemy isn't much weaker

        // Need decent food reserves
        const pop = faction.villagers.filter(v => v.isAlive).length;
        if (faction.resources.food < pop * 15) return false;

        // Need minimum military
        const milCount = this._getMilitaryUnits(faction).length;
        if (milCount < 4) return false;

        return true;
    }

    _groupPower(faction, unitIds) {
        let power = 0;
        for (const id of unitIds) {
            const v = faction.villagers.find(v => v.id === id);
            if (!v || !v.isAlive) continue;
            const stats = COMBAT_STATS[v.unitType] || COMBAT_STATS[UNIT_TYPE.VILLAGER];
            power += stats.attack + stats.defense * 0.5;
        }
        return power;
    }

    _nearbyEnemyPower(faction, game, pos, radius) {
        let power = 0;
        const enemies = (game.factions || []).filter(f => f.id !== faction.id);
        for (const enemy of enemies) {
            for (const v of enemy.villagers) {
                if (!v.isAlive) continue;
                const dx = v.x - pos.x;
                const dy = v.y - pos.y;
                if (Math.sqrt(dx * dx + dy * dy) <= radius) {
                    const stats = COMBAT_STATS[v.unitType] || COMBAT_STATS[UNIT_TYPE.VILLAGER];
                    power += stats.attack + stats.defense * 0.5;
                }
            }
        }
        return power;
    }

    _factionCenter(faction) {
        const alive = faction.villagers.filter(v => v.isAlive);
        if (alive.length === 0) return { x: CONFIG.mapWidth / 2, y: CONFIG.mapHeight / 2 };
        let sx = 0, sy = 0;
        for (const v of alive) { sx += v.x; sy += v.y; }
        return { x: sx / alive.length, y: sy / alive.length };
    }

    _findBorderCenter(faction, map) {
        const borderTiles = [];
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (let y = 0; y < map.height; y += 2) {
            for (let x = 0; x < map.width; x += 2) {
                if (map.territory[y][x] !== faction.id) continue;
                for (const [dx, dy] of dirs) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
                    if (map.territory[ny][nx] !== faction.id && map.territory[ny][nx] !== -1) {
                        borderTiles.push({ x, y });
                        break;
                    }
                }
            }
        }

        if (borderTiles.length === 0) return this._factionCenter(faction);

        let sx = 0, sy = 0;
        for (const t of borderTiles) { sx += t.x; sy += t.y; }
        return { x: sx / borderTiles.length, y: sy / borderTiles.length };
    }

    _getDiplomacyStatus(factionIdA, factionIdB, game) {
        if (!game.diplomacy) return DIPLOMACY_STATUS.NEUTRAL;
        if (typeof game.diplomacy.getStatus === 'function') {
            return game.diplomacy.getStatus(factionIdA, factionIdB);
        }
        const key = `${Math.min(factionIdA, factionIdB)}-${Math.max(factionIdA, factionIdB)}`;
        if (game.diplomacy[key]) return game.diplomacy[key];
        return DIPLOMACY_STATUS.NEUTRAL;
    }
}
