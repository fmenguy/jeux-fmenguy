import { TERRAIN, BUILDING, JOB } from '../enums.js';
import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';
import { BUILDING_CONFIG } from '../data/buildings.js';

/**
 * Economy and trade system.
 * Manages resource production, upkeep, and trade value calculations.
 */
export class EconomySystem {
    constructor() {
        this.tradeHistory = new Map(); // factionId -> { totalProduced, totalConsumed }
    }

    /**
     * Update resource production for a faction based on buildings, workers, and season.
     * @param {Object} faction - The faction object with resources, buildings, villagers, traits.
     * @param {Object} seasonModifiers - { foodGrowth, movementSpeed, birthRate, combatModifier }
     */
    updateProduction(faction, seasonModifiers) {
        if (!faction || !faction.buildings || !faction.villagers) return;

        const aliveVillagers = faction.villagers.filter(v => v.isAlive);
        const modifiers = seasonModifiers || { foodGrowth: 1.0, movementSpeed: 1.0, birthRate: 1.0, combatModifier: 1.0 };

        // Count workers by job
        const workerCounts = {};
        for (const job of Object.values(JOB)) {
            workerCounts[job] = 0;
        }
        for (const v of aliveVillagers) {
            if (workerCounts[v.job] !== undefined) {
                workerCounts[v.job]++;
            }
        }

        // Average skills by job
        const avgSkills = this._getAverageSkills(aliveVillagers);

        // --- Farm production ---
        const farms = faction.buildings.filter(b => b.type === BUILDING.FARM);
        if (farms.length > 0) {
            const farmWorkers = workerCounts[JOB.FARMER] || 0;
            const farmSkill = avgSkills.farming || 10;
            const farmConfig = BUILDING_CONFIG[BUILDING.FARM];
            const baseProd = farmConfig ? farmConfig.foodProduction : 0.5;
            const techBonus = faction.traits ? (faction.traits.farmingBonus || 1) : 1;

            const foodProduced = farms.length * baseProd * (1 + farmWorkers * 0.2) *
                (1 + farmSkill / 100) * modifiers.foodGrowth * techBonus * CONFIG.gameSpeed * 0.1;

            faction.resources.food += foodProduced;
        }

        // --- Mine production (stone, iron, gold) ---
        const mines = faction.buildings.filter(b => b.type === BUILDING.MINE);
        if (mines.length > 0) {
            const mineWorkers = workerCounts[JOB.GATHERER] || 0;
            const gatherSkill = avgSkills.gathering || 10;
            const miningBonus = faction.traits ? (faction.traits.miningBonus || 1) : 1;
            const mineConfig = BUILDING_CONFIG[BUILDING.MINE];
            const miningMultiplier = mineConfig ? (mineConfig.miningBonus || 1.3) : 1.3;

            const stoneProduced = mines.length * 0.3 * (1 + mineWorkers * 0.15) *
                (1 + gatherSkill / 100) * miningBonus * miningMultiplier * CONFIG.gameSpeed * 0.1;
            const ironProduced = mines.length * 0.15 * (1 + mineWorkers * 0.1) *
                (1 + gatherSkill / 100) * miningBonus * miningMultiplier * CONFIG.gameSpeed * 0.1;
            const goldProduced = mines.length * 0.05 * (1 + mineWorkers * 0.1) *
                (1 + gatherSkill / 100) * miningBonus * CONFIG.gameSpeed * 0.1;

            faction.resources.stone += stoneProduced;
            faction.resources.iron = (faction.resources.iron || 0) + ironProduced;
            faction.resources.gold = (faction.resources.gold || 0) + goldProduced;
        }

        // --- Sawmill production (wood) ---
        const sawmills = faction.buildings.filter(b => b.type === BUILDING.SAWMILL);
        if (sawmills.length > 0) {
            const woodWorkers = workerCounts[JOB.GATHERER] || 0;
            const gatherSkill = avgSkills.gathering || 10;
            const sawmillConfig = BUILDING_CONFIG[BUILDING.SAWMILL];
            const woodBonus = sawmillConfig ? (sawmillConfig.woodBonus || 1.3) : 1.3;

            const woodProduced = sawmills.length * 0.4 * (1 + woodWorkers * 0.15) *
                (1 + gatherSkill / 100) * woodBonus * CONFIG.gameSpeed * 0.1;

            faction.resources.wood += woodProduced;
        }

        // --- Forge production (iron) ---
        const forges = faction.buildings.filter(b => b.type === BUILDING.FORGE);
        if (forges.length > 0) {
            const craftWorkers = workerCounts[JOB.BUILDER] || 0;
            const craftSkill = avgSkills.crafting || 10;
            const forgeConfig = BUILDING_CONFIG[BUILDING.FORGE];
            const ironProd = forgeConfig ? (forgeConfig.ironProduction || 0.3) : 0.3;

            const ironProduced = forges.length * ironProd * (1 + craftWorkers * 0.1) *
                (1 + craftSkill / 100) * CONFIG.gameSpeed * 0.1;

            faction.resources.iron = (faction.resources.iron || 0) + ironProduced;
        }

        // --- Market production (gold from trade) ---
        const markets = faction.buildings.filter(b => b.type === BUILDING.MARKET);
        if (markets.length > 0) {
            const marketConfig = BUILDING_CONFIG[BUILDING.MARKET];
            const goldBonus = marketConfig ? (marketConfig.goldBonus || 1.3) : 1.3;
            const tradeBonus = faction.traits ? (faction.traits.tradeBonus || 1) : 1;
            const tradeValue = this.calculateTradeValue(faction);

            const goldProduced = markets.length * 0.2 * goldBonus * tradeBonus *
                (1 + tradeValue * 0.01) * CONFIG.gameSpeed * 0.1;

            faction.resources.gold = (faction.resources.gold || 0) + goldProduced;
        }

        // --- Granary food preservation (reduce winter losses) ---
        const granaries = faction.buildings.filter(b => b.type === BUILDING.GRANARY);
        if (granaries.length > 0 && modifiers.foodGrowth < 1.0) {
            const granaryConfig = BUILDING_CONFIG[BUILDING.GRANARY];
            const preservation = granaryConfig ? (granaryConfig.foodPreservation || 0.9) : 0.9;
            // Reduce food decay in winter proportional to granary count
            const preservationBonus = Math.pow(preservation, granaries.length);
            const foodLoss = faction.resources.food * (1 - modifiers.foodGrowth) * 0.001 * CONFIG.gameSpeed;
            faction.resources.food += foodLoss * (1 - preservationBonus);
        }

        // Track production history
        if (!this.tradeHistory.has(faction.id)) {
            this.tradeHistory.set(faction.id, { totalProduced: 0, totalConsumed: 0 });
        }
    }

    /**
     * Calculate the trade value of a faction based on surplus resources.
     * Higher surplus = more valuable trade.
     */
    calculateTradeValue(faction) {
        if (!faction || !faction.resources) return 0;

        const aliveCount = faction.villagers ? faction.villagers.filter(v => v.isAlive).length : 0;
        const minFood = aliveCount * 20; // Basic food reserve

        let value = 0;

        // Surplus food is tradeable
        const surplusFood = Math.max(0, (faction.resources.food || 0) - minFood);
        value += surplusFood * 0.5;

        // Raw materials surplus
        value += Math.max(0, (faction.resources.wood || 0) - 50) * 0.8;
        value += Math.max(0, (faction.resources.stone || 0) - 30) * 1.0;
        value += Math.max(0, (faction.resources.iron || 0) - 20) * 1.5;
        value += (faction.resources.gold || 0) * 2.0;

        // Markets boost trade value
        const marketCount = faction.buildings ? faction.buildings.filter(b => b.type === BUILDING.MARKET).length : 0;
        value *= 1 + marketCount * 0.2;

        return Math.round(value * 10) / 10;
    }

    /**
     * Process per-tick food consumption and upkeep for a faction.
     * @param {Object} faction - The faction object.
     * @returns {{ fed: number, starving: number }} Count of fed and starving villagers.
     */
    processUpkeep(faction) {
        if (!faction || !faction.villagers) return { fed: 0, starving: 0 };

        const aliveVillagers = faction.villagers.filter(v => v.isAlive);
        const foodPerVillager = CONFIG.foodPerVillagerPerTick * CONFIG.gameSpeed;
        const totalFoodNeeded = aliveVillagers.length * foodPerVillager;

        let fed = 0;
        let starving = 0;

        if (faction.resources.food >= totalFoodNeeded) {
            // Everyone eats
            faction.resources.food -= totalFoodNeeded;
            fed = aliveVillagers.length;
        } else {
            // Partial feeding: feed as many as possible
            const canFeed = Math.floor(faction.resources.food / foodPerVillager);
            faction.resources.food = Math.max(0, faction.resources.food - canFeed * foodPerVillager);
            fed = canFeed;
            starving = aliveVillagers.length - canFeed;
        }

        // Building upkeep: small resource drain per building
        const buildingCount = faction.buildings ? faction.buildings.length : 0;
        if (buildingCount > 0) {
            // Minimal wood/stone upkeep for buildings
            const woodUpkeep = buildingCount * 0.001 * CONFIG.gameSpeed;
            const stoneUpkeep = buildingCount * 0.0005 * CONFIG.gameSpeed;
            faction.resources.wood = Math.max(0, (faction.resources.wood || 0) - woodUpkeep);
            faction.resources.stone = Math.max(0, (faction.resources.stone || 0) - stoneUpkeep);
        }

        return { fed, starving };
    }

    /**
     * Get average skills across alive villagers.
     */
    _getAverageSkills(villagers) {
        if (!villagers || villagers.length === 0) {
            return { farming: 10, building: 10, combat: 10, crafting: 10, gathering: 10, archery: 10, research: 10 };
        }

        const totals = { farming: 0, building: 0, combat: 0, crafting: 0, gathering: 0, archery: 0, research: 0 };
        for (const v of villagers) {
            if (v.skills) {
                for (const skill of Object.keys(totals)) {
                    totals[skill] += v.skills[skill] || 0;
                }
            }
        }

        const count = villagers.length;
        const avg = {};
        for (const skill of Object.keys(totals)) {
            avg[skill] = totals[skill] / count;
        }
        return avg;
    }

    /**
     * Get a production summary for a faction (for UI display).
     */
    getProductionSummary(faction, seasonModifiers) {
        if (!faction) return null;

        const aliveCount = faction.villagers ? faction.villagers.filter(v => v.isAlive).length : 0;
        const modifiers = seasonModifiers || { foodGrowth: 1.0 };

        const farms = faction.buildings ? faction.buildings.filter(b => b.type === BUILDING.FARM).length : 0;
        const mines = faction.buildings ? faction.buildings.filter(b => b.type === BUILDING.MINE).length : 0;
        const sawmills = faction.buildings ? faction.buildings.filter(b => b.type === BUILDING.SAWMILL).length : 0;
        const markets = faction.buildings ? faction.buildings.filter(b => b.type === BUILDING.MARKET).length : 0;

        return {
            population: aliveCount,
            foodConsumption: aliveCount * CONFIG.foodPerVillagerPerTick,
            foodProduction: farms * 0.5 * modifiers.foodGrowth,
            woodProduction: sawmills * 0.4,
            stoneProduction: mines * 0.3,
            goldProduction: markets * 0.2,
            tradeValue: this.calculateTradeValue(faction),
            buildings: faction.buildings ? faction.buildings.length : 0
        };
    }
}

export const economySystem = new EconomySystem();
export default economySystem;
