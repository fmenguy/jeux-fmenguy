import { BUILDING, UNIT_TYPE, JOB, DIPLOMACY_STATUS } from '../enums.js';
import { CONFIG } from '../config.js';
import { BUILDING_CONFIG } from '../data/buildings.js';
import { COMBAT_STATS } from '../data/events.js';

/**
 * StrategicPlanner - Evaluates the faction's current situation and decides
 * priority weights that guide all other AI subsystems.
 *
 * The planner produces a situation snapshot and then converts it into
 * normalized priority weights (summing to ~1.0) that tell the rest of
 * the AI what matters most right now.
 */
export class StrategicPlanner {

    constructor() {
        // Smoothed priorities to avoid erratic swings between ticks
        this._smoothedPriorities = null;
        this._smoothingFactor = 0.3; // blend 30% new, 70% old
    }

    // ------------------------------------------------------------------ //
    //  Situation evaluation
    // ------------------------------------------------------------------ //

    /**
     * Build a snapshot of the faction's current strategic situation.
     * Every number is designed so that >1 is comfortable and <1 is stressed.
     */
    evaluate(faction, game) {
        const enemy = this._getPrimaryEnemy(faction, game);
        const aliveVillagers = faction.villagers.filter(v => v.isAlive);
        const enemyAlive = enemy ? enemy.villagers.filter(v => v.isAlive) : [];
        const pop = aliveVillagers.length;
        const enemyPop = enemyAlive.length || 1;

        const militaryPower = this._calcMilitaryPower(faction);
        const enemyMilitaryPower = enemy ? this._calcMilitaryPower(enemy) : 0;

        // Food security: how many ticks of food remain at current consumption
        const foodPerTick = pop * CONFIG.foodPerVillagerPerTick;
        const foodSecurity = foodPerTick > 0
            ? faction.resources.food / (foodPerTick * 300) // 300 ticks ~ comfortable buffer
            : 999;

        return {
            foodSecurity:       Math.min(foodSecurity, 5),
            militaryStrength:   militaryPower,
            enemyMilitary:      enemyMilitaryPower,
            militaryRatio:      enemyMilitaryPower > 0 ? militaryPower / enemyMilitaryPower : 2,
            economyScore:       this._calcEconomyScore(faction),
            territorySize:      this._getTerritorySize(faction, game),
            techLevel:          (faction.researchedTechs || []).length,
            enemyTechLevel:     enemy ? (enemy.researchedTechs || []).length : 0,
            populationRatio:    pop / enemyPop,
            population:         pop,
            housingCap:         this._getHousingCap(faction),
            underAttack:        this._isUnderAttack(faction, game),
            hasBarracks:        faction.buildings.some(b => b.type === BUILDING.BARRACKS),
            hasMarket:          faction.buildings.some(b => b.type === BUILDING.MARKET),
            hasFarms:           faction.buildings.filter(b => b.type === BUILDING.FARM).length,
            woodStock:          faction.resources.wood,
            stoneStock:         faction.resources.stone,
            ironStock:          faction.resources.iron,
            goldStock:          faction.resources.gold || 0
        };
    }

    // ------------------------------------------------------------------ //
    //  Priority decision
    // ------------------------------------------------------------------ //

    /**
     * Convert situation + threats into a weight object whose values sum to 1.
     * Keys: expand, defend, research, economy, military, growth
     */
    decidePriorities(situation, threats) {
        const raw = {
            expand:   0.15,
            defend:   0.10,
            research: 0.15,
            economy:  0.20,
            military: 0.15,
            growth:   0.25
        };

        // ---- Food crisis ------------------------------------------------
        if (situation.foodSecurity < 0.3) {
            raw.economy  += 0.50;
            raw.growth   -= 0.10;
            raw.military -= 0.05;
        } else if (situation.foodSecurity < 0.7) {
            raw.economy += 0.25;
        } else if (situation.foodSecurity < 1.0) {
            raw.economy += 0.10;
        }

        // ---- Under attack -----------------------------------------------
        if (situation.underAttack) {
            raw.defend   += 0.30;
            raw.military += 0.20;
            raw.expand   -= 0.10;
            raw.research -= 0.05;
        }

        // ---- Threat level -----------------------------------------------
        if (threats && threats.maxThreat > 0.7) {
            raw.military += 0.25;
            raw.defend   += 0.15;
        } else if (threats && threats.maxThreat > 0.4) {
            raw.military += 0.10;
            raw.defend   += 0.05;
        }

        // ---- Population pressure ----------------------------------------
        if (situation.populationRatio < 0.5) {
            raw.growth += 0.25;
            raw.economy += 0.10;
        } else if (situation.populationRatio < 0.8) {
            raw.growth += 0.15;
        }

        // ---- Housing cap reached ----------------------------------------
        if (situation.population >= situation.housingCap - 1) {
            raw.growth += 0.20;
        }

        // ---- Tech gap ---------------------------------------------------
        if (situation.techLevel < situation.enemyTechLevel) {
            raw.research += 0.20;
        } else if (situation.techLevel === 0) {
            raw.research += 0.10;
        }

        // ---- Military superiority -> expand ----------------------------
        if (situation.militaryRatio > 1.5 && situation.foodSecurity > 1.0) {
            raw.expand += 0.15;
            raw.military -= 0.05;
        }

        // ---- Low resources -> economy -----------------------------------
        if (situation.woodStock < 50 || situation.stoneStock < 30) {
            raw.economy += 0.15;
        }

        // ---- No military infrastructure ---------------------------------
        if (!situation.hasBarracks && situation.population > 8) {
            raw.military += 0.10;
        }

        // Clamp negatives
        for (const key of Object.keys(raw)) {
            if (raw[key] < 0.02) raw[key] = 0.02;
        }

        // Normalize to sum = 1
        const total = Object.values(raw).reduce((a, b) => a + b, 0);
        const priorities = {};
        for (const key of Object.keys(raw)) {
            priorities[key] = raw[key] / total;
        }

        // Smooth to avoid erratic oscillation
        if (this._smoothedPriorities) {
            const sf = this._smoothingFactor;
            for (const key of Object.keys(priorities)) {
                priorities[key] = sf * priorities[key] + (1 - sf) * (this._smoothedPriorities[key] || priorities[key]);
            }
        }
        this._smoothedPriorities = { ...priorities };

        return priorities;
    }

    // ------------------------------------------------------------------ //
    //  Internal helpers
    // ------------------------------------------------------------------ //

    _getPrimaryEnemy(faction, game) {
        if (!game.factions) return null;
        return game.factions.find(f => f.id !== faction.id) || null;
    }

    _calcMilitaryPower(faction) {
        let power = 0;
        for (const v of faction.villagers) {
            if (!v.isAlive) continue;
            if (v.unitType === UNIT_TYPE.SOLDIER) power += 3;
            else if (v.unitType === UNIT_TYPE.ARCHER) power += 2.5;
            else if (v.unitType === UNIT_TYPE.CAVALRY) power += 4;
            else if (v.unitType === UNIT_TYPE.SCOUT) power += 1.5;
            else if (v.job === JOB.WARRIOR) power += 1.5;
            else if (v.job === JOB.HUNTER) power += 1;
        }

        // Defensive buildings add passive power
        for (const b of faction.buildings) {
            if (b.type === BUILDING.TOWER) power += 5;
            if (b.type === BUILDING.WATCHTOWER) power += 2;
            if (b.type === BUILDING.WALL) power += 0.5;
            if (b.type === BUILDING.BARRACKS) power += 2;
        }

        return power;
    }

    _calcEconomyScore(faction) {
        const r = faction.resources;
        // Weighted sum normalized to a rough 0-100 scale
        return (
            (r.food  || 0) * 0.3 +
            (r.wood  || 0) * 0.2 +
            (r.stone || 0) * 0.2 +
            (r.iron  || 0) * 0.15 +
            (r.gold  || 0) * 0.15
        ) / 50;
    }

    _getTerritorySize(faction, game) {
        if (game.territory && typeof game.territory.getTerritorySize === 'function') {
            return game.territory.getTerritorySize(faction.id);
        }
        // Fallback: count tiles directly from game map
        const map = game.map || game.gameMap;
        if (!map || !map.territory) return 0;
        let count = 0;
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.territory[y][x] === faction.id) count++;
            }
        }
        return count;
    }

    _getHousingCap(faction) {
        let cap = 10; // base population from town center / castle
        for (const b of faction.buildings) {
            const cfg = BUILDING_CONFIG[b.type];
            if (cfg && cfg.popBonus) cap += cfg.popBonus;
        }
        return cap;
    }

    _isUnderAttack(faction, game) {
        const map = game.map || game.gameMap;
        if (!map) return false;
        const enemies = (game.factions || []).filter(f => f.id !== faction.id);
        for (const enemy of enemies) {
            for (const v of enemy.villagers) {
                if (!v.isAlive) continue;
                const tx = Math.floor(v.x);
                const ty = Math.floor(v.y);
                if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
                    if (map.territory[ty][tx] === faction.id) {
                        // Enemy unit inside our territory
                        if (v.unitType !== UNIT_TYPE.VILLAGER || v.job === JOB.WARRIOR) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}
