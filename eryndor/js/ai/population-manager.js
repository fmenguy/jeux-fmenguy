import { UNIT_TYPE, JOB, BUILDING } from '../enums.js';
import { CONFIG } from '../config.js';
import { BUILDING_CONFIG } from '../data/buildings.js';
import { eventBus } from '../event-bus.js';

/**
 * PopulationManager - Controls job distribution, growth management,
 * and housing/food balance for the faction.
 *
 * Ideal ratios (adjusted by priorities):
 *   gatherers:   30-50%  (economy weight)
 *   farmers:     15-25%
 *   military:    10-30%  (military weight)
 *   builders:     5-15%  (more if construction queued)
 *   hunters:      5-10%
 *   fishers:      3-8%
 *   breeders:     auto   (children + elderly)
 *
 * The manager compares current distribution against ideal and reassigns
 * excess workers toward deficit roles.
 */
export class PopulationManager {

    constructor() {
        this._lastRebalanceTick = -999;
        this._rebalanceInterval = 60; // ticks between rebalances
    }

    // ------------------------------------------------------------------ //
    //  Public API
    // ------------------------------------------------------------------ //

    update(faction, game, priorities) {
        const tick = CONFIG.currentTick || 0;
        if (tick - this._lastRebalanceTick < this._rebalanceInterval) return;
        this._lastRebalanceTick = tick;

        const map = game.map || game.gameMap;

        this._rebalanceJobs(faction, priorities, map);
        this._manageGrowth(faction, game, priorities);
    }

    // ------------------------------------------------------------------ //
    //  Job rebalancing
    // ------------------------------------------------------------------ //

    _rebalanceJobs(faction, priorities, map) {
        const alive = faction.villagers.filter(v => v.isAlive);
        const workable = alive.filter(v => {
            const age = v.currentAge;
            const maxWorkAge = v.factionType === 'human' ? 55 : 700;
            return age >= 16 && age <= maxWorkAge;
        });

        const pop = workable.length;
        if (pop < 3) return; // too few to rebalance

        // Calculate ideal counts
        const ideal = this._calcIdealDistribution(pop, priorities, faction);

        // Current counts
        const current = {
            [JOB.GATHERER]: 0,
            [JOB.FARMER]:   0,
            [JOB.WARRIOR]:  0,
            [JOB.BUILDER]:  0,
            [JOB.HUNTER]:   0,
            [JOB.FISHER]:   0,
            [JOB.BREEDER]:  0
        };

        for (const v of workable) {
            if (current[v.job] !== undefined) {
                current[v.job]++;
            }
        }

        // Compute surplus/deficit for each role
        const deltas = {};
        for (const job of Object.keys(ideal)) {
            deltas[job] = current[job] - ideal[job];
        }

        // Find jobs with surplus and jobs with deficit
        const surplusJobs = Object.entries(deltas)
            .filter(([job, d]) => d > 0)
            .sort((a, b) => b[1] - a[1]); // biggest surplus first

        const deficitJobs = Object.entries(deltas)
            .filter(([job, d]) => d < 0)
            .sort((a, b) => a[1] - b[1]); // biggest deficit first

        if (deficitJobs.length === 0) return;

        // Reassign workers from surplus to deficit
        for (const [surplusJob, surplus] of surplusJobs) {
            let toReassign = Math.floor(surplus);
            if (toReassign <= 0) continue;

            // Find workers in this surplus job that can switch
            const candidates = workable.filter(v =>
                v.job === surplusJob &&
                v.unitType === UNIT_TYPE.VILLAGER &&
                v.currentTask !== 'combat' &&
                v.currentTask !== 'flee' &&
                v.currentTask !== 'research'
            );

            // Sort by lowest skill in current job (reassign the weakest first)
            candidates.sort((a, b) => {
                const aSkill = this._jobSkill(a, surplusJob);
                const bSkill = this._jobSkill(b, surplusJob);
                return aSkill - bSkill;
            });

            for (let i = 0; i < Math.min(toReassign, candidates.length); i++) {
                // Pick the deficit job with the biggest need
                const targetEntry = deficitJobs.find(([j, d]) => d < 0);
                if (!targetEntry) break;

                const [targetJob] = targetEntry;
                candidates[i].job = targetJob;
                candidates[i].currentTask = null;
                candidates[i].taskTarget = null;

                // Update tracking
                deltas[surplusJob]--;
                deltas[targetJob]++;
                targetEntry[1]++;
            }
        }
    }

    _calcIdealDistribution(pop, priorities, faction) {
        // Base ratios
        let gathererRatio = 0.30 + priorities.economy * 0.20;    // 30-50%
        let farmerRatio   = 0.15 + priorities.economy * 0.10;    // 15-25%
        let militaryRatio = 0.10 + priorities.military * 0.20;   // 10-30%
        let builderRatio  = 0.05 + priorities.expand * 0.10;     // 5-15%
        let hunterRatio   = 0.05 + priorities.economy * 0.05;    // 5-10%
        let fisherRatio   = 0.03 + priorities.economy * 0.05;    // 3-8%

        // Construction queued? boost builders
        const pendingBuilds = (faction.buildings || []).filter(b =>
            b.buildProgress !== undefined && b.buildProgress < (b.maxBuildProgress || 100)
        ).length;
        if (pendingBuilds > 0) {
            builderRatio += 0.05 * Math.min(pendingBuilds, 3);
        }

        // Normalize
        const total = gathererRatio + farmerRatio + militaryRatio + builderRatio + hunterRatio + fisherRatio;
        gathererRatio /= total;
        farmerRatio   /= total;
        militaryRatio /= total;
        builderRatio  /= total;
        hunterRatio   /= total;
        fisherRatio   /= total;

        return {
            [JOB.GATHERER]: Math.round(pop * gathererRatio),
            [JOB.FARMER]:   Math.round(pop * farmerRatio),
            [JOB.WARRIOR]:  Math.round(pop * militaryRatio),
            [JOB.BUILDER]:  Math.round(pop * builderRatio),
            [JOB.HUNTER]:   Math.round(pop * hunterRatio),
            [JOB.FISHER]:   Math.round(pop * fisherRatio)
        };
    }

    _jobSkill(villager, job) {
        switch (job) {
            case JOB.GATHERER: return villager.skills.gathering;
            case JOB.FARMER:   return villager.skills.farming;
            case JOB.WARRIOR:  return villager.skills.combat;
            case JOB.BUILDER:  return villager.skills.building;
            case JOB.HUNTER:   return villager.skills.archery;
            case JOB.FISHER:   return (villager.skills.farming + villager.skills.gathering) / 2;
            default:           return 50;
        }
    }

    // ------------------------------------------------------------------ //
    //  Growth management
    // ------------------------------------------------------------------ //

    _manageGrowth(faction, game, priorities) {
        const alive = faction.villagers.filter(v => v.isAlive);
        const pop = alive.length;
        const housingCap = this._getHousingCap(faction);

        // Flag housing shortage for the BuildingPlanner
        if (pop >= housingCap - 1 && priorities.growth > 0.15) {
            faction._needsHousing = true;
        } else {
            faction._needsHousing = false;
        }

        // Check if food can sustain growth
        const foodPerTick = pop * CONFIG.foodPerVillagerPerTick;
        const foodBuffer = foodPerTick > 0
            ? faction.resources.food / (foodPerTick * CONFIG.ticksPerYear)
            : 999;

        // If we have comfortable food (>1 year buffer) and room, encourage breeding
        if (foodBuffer > 1.0 && pop < housingCap) {
            faction._growthEnabled = true;
        } else if (foodBuffer < 0.3 || pop >= housingCap) {
            faction._growthEnabled = false;
        }

        // Track growth statistics for other subsystems
        faction._populationStats = {
            total: pop,
            housingCap,
            foodBuffer: Math.min(foodBuffer, 10),
            militaryCount: alive.filter(v =>
                v.unitType !== UNIT_TYPE.VILLAGER || v.job === JOB.WARRIOR
            ).length,
            workerCount: alive.filter(v =>
                v.unitType === UNIT_TYPE.VILLAGER && v.job !== JOB.BREEDER
            ).length,
            childCount: alive.filter(v => v.currentAge < 16).length,
            elderCount: alive.filter(v => {
                const maxAge = v.factionType === 'human' ? 55 : 700;
                return v.currentAge > maxAge;
            }).length
        };
    }

    _getHousingCap(faction) {
        let cap = 10; // base from town center
        for (const b of faction.buildings) {
            const cfg = BUILDING_CONFIG[b.type];
            if (cfg && cfg.popBonus) cap += cfg.popBonus;
        }
        return cap;
    }
}
