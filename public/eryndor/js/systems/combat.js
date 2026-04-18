import { TERRAIN, BUILDING, UNIT_TYPE } from '../enums.js';
import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';
import { COMBAT_STATS } from '../data/events.js';

/**
 * Terrain defense bonuses: multiplier applied to defender's defense value.
 */
const TERRAIN_DEFENSE_BONUS = {
    [TERRAIN.FOREST]: 1.2,     // +20%
    [TERRAIN.MOUNTAIN]: 1.3,   // +30%
    [TERRAIN.STONE]: 1.1       // +10%
};

/**
 * Building defense bonuses.
 */
const BUILDING_DEFENSE_BONUS = {
    [BUILDING.WALL]: 1.5,       // +50%
    [BUILDING.TOWER]: 1.3,      // +30%
    [BUILDING.WATCHTOWER]: 1.2, // +20%
    [BUILDING.CASTLE]: 1.4      // +40%
};

/**
 * Combat resolution system.
 * Handles 1v1 and group combat between units with terrain,
 * equipment, formation, and morale modifiers.
 */
export class CombatSystem {
    constructor() {
        this.combatLog = [];
    }

    /**
     * Calculate the total combat power of a villager/unit.
     * Takes into account unit type stats, skills, faction bonuses, and equipment.
     */
    calculateUnitPower(villager) {
        if (!villager || !villager.isAlive) return 0;

        const baseStats = COMBAT_STATS[villager.unitType] || COMBAT_STATS[UNIT_TYPE.VILLAGER];
        const attack = villager.combatStats ? villager.combatStats.attack : baseStats.attack;
        const defense = villager.combatStats ? villager.combatStats.defense : baseStats.defense;
        const health = villager.combatStats ? villager.combatStats.health : 100;
        const maxHealth = villager.combatStats ? villager.combatStats.maxHealth : 100;

        // Skill bonus
        const combatSkill = villager.skills ? villager.skills.combat / 100 : 0;
        const archerySkill = villager.skills ? villager.skills.archery / 100 : 0;
        const relevantSkill = baseStats.range > 1 ? archerySkill : combatSkill;

        // Health ratio affects power
        const healthRatio = maxHealth > 0 ? health / maxHealth : 1;

        const power = (attack + defense * 0.5) * (1 + relevantSkill * 0.5) * healthRatio;
        return Math.round(power * 10) / 10;
    }

    /**
     * Resolve a 1v1 combat between attacker and defender.
     * @param {Object} attacker - The attacking villager/unit.
     * @param {Object} defender - The defending villager/unit.
     * @param {Object} seasonModifiers - Season modifiers (combatModifier).
     * @param {number} defenderTerrain - TERRAIN enum value at defender's position.
     * @param {number} defenderBuilding - BUILDING enum value at defender's position.
     * @returns {{ winner, loser, damage, attackerDamage, defenderDamage }}
     */
    resolveCombat(attacker, defender, seasonModifiers = null, defenderTerrain = TERRAIN.GRASS, defenderBuilding = BUILDING.NONE) {
        if (!attacker || !defender || !attacker.isAlive || !defender.isAlive) {
            return null;
        }

        const atkStats = attacker.combatStats || COMBAT_STATS[attacker.unitType || UNIT_TYPE.VILLAGER];
        const defStats = defender.combatStats || COMBAT_STATS[defender.unitType || UNIT_TYPE.VILLAGER];

        // Base attack and defense values
        let attackValue = atkStats.attack;
        let defenseValue = defStats.defense;

        // Skill bonuses
        if (attacker.skills) {
            const skill = atkStats.range > 1 ? attacker.skills.archery : attacker.skills.combat;
            attackValue *= 1 + (skill || 0) / 200;
        }
        if (defender.skills) {
            const skill = defStats.range > 1 ? defender.skills.archery : defender.skills.combat;
            defenseValue *= 1 + (skill || 0) / 200;
        }

        // Terrain defense bonus
        const terrainBonus = TERRAIN_DEFENSE_BONUS[defenderTerrain] || 1;
        defenseValue *= terrainBonus;

        // Building defense bonus
        const buildingBonus = BUILDING_DEFENSE_BONUS[defenderBuilding] || 1;
        defenseValue *= buildingBonus;

        // Season modifier
        const seasonMod = seasonModifiers ? (seasonModifiers.combatModifier || 1) : 1;
        attackValue *= seasonMod;

        // Random factor: +/- 15%
        const attackRandom = 0.85 + Math.random() * 0.30;
        const defendRandom = 0.85 + Math.random() * 0.30;

        attackValue *= attackRandom;
        const counterAttack = defenseValue * 0.3 * defendRandom;

        // Calculate damage dealt
        const damageToDefender = Math.max(1, attackValue - defenseValue * 0.5);
        const damageToAttacker = Math.max(0, counterAttack - atkStats.defense * 0.3);

        // Apply damage
        defender.takeDamage(damageToDefender, 'combat');
        if (damageToAttacker > 0) {
            attacker.takeDamage(damageToAttacker, 'combat');
        }

        // Determine winner (whoever is still alive, or who dealt more damage)
        let winner, loser;
        if (!defender.isAlive) {
            winner = attacker;
            loser = defender;
        } else if (!attacker.isAlive) {
            winner = defender;
            loser = attacker;
        } else {
            // Both alive: winner dealt more damage
            winner = damageToDefender >= damageToAttacker ? attacker : defender;
            loser = winner === attacker ? defender : attacker;
        }

        const result = {
            winner,
            loser,
            damage: damageToDefender,
            attackerDamage: damageToAttacker,
            defenderDamage: damageToDefender,
            attackerAlive: attacker.isAlive,
            defenderAlive: defender.isAlive
        };

        // Emit combat result event
        eventBus.emit('combat-result', {
            attacker: {
                name: attacker.fullName || 'Inconnu',
                factionId: attacker.factionId,
                unitType: attacker.unitType,
                alive: attacker.isAlive
            },
            defender: {
                name: defender.fullName || 'Inconnu',
                factionId: defender.factionId,
                unitType: defender.unitType,
                alive: defender.isAlive
            },
            damageToDefender,
            damageToAttacker,
            terrain: defenderTerrain
        });

        return result;
    }

    /**
     * Resolve group combat between two groups of units.
     * @param {Array} attackers - Array of attacking villagers/units.
     * @param {Array} defenders - Array of defending villagers/units.
     * @param {number} terrain - TERRAIN enum at the combat location.
     * @param {Object} seasonModifiers - Season modifiers.
     * @returns {{ result, attackerCasualties, defenderCasualties, attackerRetreated, defenderRetreated }}
     */
    resolveGroupCombat(attackers, defenders, terrain = TERRAIN.GRASS, seasonModifiers = null) {
        if (!attackers || !defenders || attackers.length === 0 || defenders.length === 0) {
            return null;
        }

        const aliveAttackers = attackers.filter(u => u.isAlive);
        const aliveDefenders = defenders.filter(u => u.isAlive);

        if (aliveAttackers.length === 0 || aliveDefenders.length === 0) return null;

        const originalAttackerCount = aliveAttackers.length;
        const originalDefenderCount = aliveDefenders.length;

        let attackerCasualties = 0;
        let defenderCasualties = 0;

        // Formation bonus: mixed melee + ranged attackers get +15% damage
        const hasMelee = aliveAttackers.some(u => {
            const stats = COMBAT_STATS[u.unitType] || COMBAT_STATS[UNIT_TYPE.VILLAGER];
            return stats.range <= 1;
        });
        const hasRanged = aliveAttackers.some(u => {
            const stats = COMBAT_STATS[u.unitType] || COMBAT_STATS[UNIT_TYPE.VILLAGER];
            return stats.range > 1;
        });
        const formationBonus = (hasMelee && hasRanged) ? 1.15 : 1.0;

        // Flanking bonus: attackers outnumber defenders 2:1
        const flankingBonus = aliveAttackers.length >= aliveDefenders.length * 2 ? 1.2 : 1.0;

        // Resolve individual matchups
        const maxRounds = Math.max(aliveAttackers.length, aliveDefenders.length);

        for (let i = 0; i < maxRounds; i++) {
            // Pick combatants (cycle through if one side has fewer)
            const attacker = aliveAttackers[i % aliveAttackers.length];
            const defender = aliveDefenders[i % aliveDefenders.length];

            if (!attacker.isAlive || !defender.isAlive) continue;

            // Apply formation and flanking as temporary attack boost
            const originalAttack = attacker.combatStats ? attacker.combatStats.attack : 0;
            if (attacker.combatStats) {
                attacker.combatStats.attack *= formationBonus * flankingBonus;
            }

            this.resolveCombat(attacker, defender, seasonModifiers, terrain);

            // Restore original attack value
            if (attacker.combatStats) {
                attacker.combatStats.attack = originalAttack;
            }

            if (!attacker.isAlive) attackerCasualties++;
            if (!defender.isAlive) defenderCasualties++;

            // Morale check: retreat if group falls below 40% of original size
            const currentAttackerAlive = aliveAttackers.filter(u => u.isAlive).length;
            const currentDefenderAlive = aliveDefenders.filter(u => u.isAlive).length;

            if (currentAttackerAlive / originalAttackerCount < 0.4) {
                // Attackers retreat
                eventBus.emit('combat-result', {
                    type: 'group-retreat',
                    retreatingSide: 'attackers',
                    survivingAttackers: currentAttackerAlive,
                    survivingDefenders: currentDefenderAlive
                });
                return {
                    result: 'defender_victory',
                    attackerCasualties,
                    defenderCasualties,
                    attackerRetreated: true,
                    defenderRetreated: false
                };
            }

            if (currentDefenderAlive / originalDefenderCount < 0.4) {
                // Defenders retreat
                eventBus.emit('combat-result', {
                    type: 'group-retreat',
                    retreatingSide: 'defenders',
                    survivingAttackers: currentAttackerAlive,
                    survivingDefenders: currentDefenderAlive
                });
                return {
                    result: 'attacker_victory',
                    attackerCasualties,
                    defenderCasualties,
                    attackerRetreated: false,
                    defenderRetreated: true
                };
            }
        }

        // Determine overall result
        const finalAttackerAlive = aliveAttackers.filter(u => u.isAlive).length;
        const finalDefenderAlive = aliveDefenders.filter(u => u.isAlive).length;

        let result;
        if (finalDefenderAlive === 0) result = 'attacker_victory';
        else if (finalAttackerAlive === 0) result = 'defender_victory';
        else result = finalAttackerAlive >= finalDefenderAlive ? 'attacker_advantage' : 'defender_advantage';

        eventBus.emit('combat-result', {
            type: 'group-battle',
            result,
            attackerCasualties,
            defenderCasualties,
            survivingAttackers: finalAttackerAlive,
            survivingDefenders: finalDefenderAlive
        });

        return {
            result,
            attackerCasualties,
            defenderCasualties,
            attackerRetreated: false,
            defenderRetreated: false
        };
    }
}

export const combatSystem = new CombatSystem();
export default combatSystem;
