import { CONFIG } from '../config.js';
import { TECH_TREE } from '../data/tech-tree.js';
import { JOB } from '../enums.js';
import { eventBus } from '../event-bus.js';

/**
 * TechAdvisor - Selects the next technology to research based on the current
 * priorities and faction situation.
 *
 * Scoring logic:
 *   - Agriculture / nature techs   -> weighted by economy priority (x3 if food crisis)
 *   - Military techs               -> weighted by military priority (x3 if threatened)
 *   - Economy techs (trade/mining) -> weighted by economy priority
 *   - Culture techs                -> weighted by growth + research priority
 *   - Navigation techs             -> weighted by expand priority
 *
 * Once a tech is chosen the advisor assigns idle or low-priority villagers
 * as researchers (up to a cap).
 */
export class TechAdvisor {

    constructor() {
        this._researchCooldown = 0;
    }

    // ------------------------------------------------------------------ //
    //  Public API
    // ------------------------------------------------------------------ //

    update(faction, game, priorities) {
        // If already researching, just make sure researchers are still assigned
        if (faction.currentResearch) {
            this._ensureResearchers(faction, priorities);
            this._advanceResearch(faction);
            return;
        }

        // Cooldown between finishing one tech and starting the next
        if (this._researchCooldown > 0) {
            this._researchCooldown--;
            return;
        }

        const available = this._getAvailableTechs(faction);
        if (available.length === 0) return;

        const situation = this._quickSituation(faction, game);
        const scored = available.map(tech => ({
            tech,
            score: this._scoreTech(tech, priorities, situation)
        }));

        scored.sort((a, b) => b.score - a.score);

        const chosen = scored[0];
        if (chosen.score <= 0) return;

        // Start research
        faction.currentResearch = {
            id: chosen.tech.id,
            category: chosen.tech._category,
            name: chosen.tech.name,
            remaining: chosen.tech.duration,
            total: chosen.tech.duration,
            cost: chosen.tech.cost
        };

        // Deduct research cost from gold (if faction tracks it)
        if (faction.resources.gold !== undefined && chosen.tech.cost) {
            faction.resources.gold = Math.max(0, faction.resources.gold - chosen.tech.cost * 0.1);
        }

        this._ensureResearchers(faction, priorities);

        eventBus.emit('research-started', {
            faction: faction.id,
            tech: chosen.tech.id,
            name: chosen.tech.name
        });
    }

    // ------------------------------------------------------------------ //
    //  Tech scoring
    // ------------------------------------------------------------------ //

    _scoreTech(tech, priorities, situation) {
        let score = 1; // base

        const cat = tech._category;

        switch (cat) {
            case 'economy':
                score = priorities.economy * 10;
                if (tech.id === 'agriculture') {
                    score *= situation.foodCrisis ? 3 : 1.2;
                }
                if (tech.id === 'trade') {
                    score *= priorities.economy * 1.5;
                }
                if (tech.id === 'mining') {
                    score *= (situation.lowStone || situation.lowIron) ? 2 : 1;
                }
                break;

            case 'military':
                score = priorities.military * 10;
                if (situation.threatened) score *= 3;
                if (tech.id === 'ironWorking') score *= 1.5; // foundational
                if (tech.id === 'archery' && situation.isElf) score *= 2;
                if (tech.id === 'cavalry' && !situation.isElf) score *= 1.5;
                break;

            case 'culture':
                score = (priorities.growth + priorities.research) * 5;
                if (tech.id === 'writing') score *= 1.8; // accelerates all research
                if (tech.id === 'masonry') score *= priorities.defend * 3;
                if (tech.id === 'philosophy') score *= (situation.population > 20 ? 1.5 : 0.5);
                break;

            case 'navigation':
                score = priorities.expand * 6;
                if (tech.id === 'shipbuilding') score *= situation.nearWater ? 2 : 0.3;
                if (tech.id === 'cartography') score *= 1.2;
                break;

            case 'nature':
                score = priorities.economy * 7;
                if (tech.id === 'herbalism') {
                    score *= situation.foodCrisis ? 3 : 1.2;
                    score *= situation.isElf ? 1.5 : 1; // elves love nature
                }
                if (tech.id === 'animalHusbandry') {
                    score *= situation.hasAnimals ? 2 : 0.5;
                }
                break;

            default:
                score = 1;
        }

        // Slight randomness to prevent identical choices every game
        score += Math.random() * 1.5;

        return score;
    }

    // ------------------------------------------------------------------ //
    //  Available tech list
    // ------------------------------------------------------------------ //

    _getAvailableTechs(faction) {
        const researched = new Set((faction.researchedTechs || []).map(t => typeof t === 'string' ? t : t.id));
        if (faction.currentResearch) return []; // already busy

        const available = [];

        for (const [category, catData] of Object.entries(TECH_TREE)) {
            for (const tech of catData.techs) {
                // Already researched
                if (researched.has(tech.id)) continue;

                // Prerequisites met?
                const prereqsMet = tech.prerequisites.every(p => researched.has(p));
                if (!prereqsMet) continue;

                // Annotate with category for scoring
                available.push({ ...tech, _category: category });
            }
        }

        return available;
    }

    // ------------------------------------------------------------------ //
    //  Researcher management
    // ------------------------------------------------------------------ //

    _ensureResearchers(faction, priorities) {
        if (!faction.currentResearch) return;

        const alive = faction.villagers.filter(v => v.isAlive);
        const pop = alive.length;

        // Target researcher count: 5-10% of population, at least 1
        const targetCount = Math.max(1, Math.floor(pop * (0.05 + priorities.research * 0.1)));

        // Count current researchers
        const currentResearchers = alive.filter(v => v.currentTask === 'research');

        if (currentResearchers.length >= targetCount) return;

        // Recruit from idle or low-priority workers
        const recruitable = alive.filter(v =>
            v.currentTask !== 'research' &&
            v.currentTask !== 'combat' &&
            v.currentTask !== 'flee' &&
            v.job !== JOB.WARRIOR &&
            v.unitType === 0 // VILLAGER
        );

        // Sort by research skill (highest first)
        recruitable.sort((a, b) => (b.skills.research || 0) - (a.skills.research || 0));

        const needed = targetCount - currentResearchers.length;
        for (let i = 0; i < Math.min(needed, recruitable.length); i++) {
            recruitable[i].currentTask = 'research';
            recruitable[i].taskTarget = null;
        }
    }

    _advanceResearch(faction) {
        if (!faction.currentResearch) return;

        const researchers = faction.villagers.filter(v =>
            v.isAlive && v.currentTask === 'research'
        );

        if (researchers.length === 0) return;

        // Calculate research speed
        let speed = 0;
        for (const r of researchers) {
            const skillBonus = 1 + (r.skills.research || 10) / 100;
            speed += skillBonus;
            // Researchers gain experience
            r.skills.research = Math.min(100, (r.skills.research || 10) + 0.05);
        }

        // Faction trait bonus (elves research faster)
        const factionType = faction.type || (faction.villagers[0] && faction.villagers[0].factionType);
        if (factionType === 'elf') speed *= 1.4;
        else speed *= 0.9;

        // Writing tech bonus
        const hasWriting = (faction.researchedTechs || []).some(t =>
            (typeof t === 'string' ? t : t.id) === 'writing'
        );
        if (hasWriting) speed *= 1.3;

        faction.currentResearch.remaining -= speed * CONFIG.gameSpeed * 0.1;

        if (faction.currentResearch.remaining <= 0) {
            // Research complete
            const completed = faction.currentResearch;
            if (!faction.researchedTechs) faction.researchedTechs = [];
            faction.researchedTechs.push({
                id: completed.id,
                name: completed.name,
                category: completed.category,
                completedTick: CONFIG.currentTick
            });

            // Free researchers
            for (const r of researchers) {
                r.currentTask = null;
                r.taskTarget = null;
            }

            eventBus.emit('research-completed', {
                faction: faction.id,
                tech: completed.id,
                name: completed.name
            });

            faction.currentResearch = null;
            this._researchCooldown = 5; // small cooldown before next pick
        }
    }

    // ------------------------------------------------------------------ //
    //  Helpers
    // ------------------------------------------------------------------ //

    _quickSituation(faction, game) {
        const map = game.map || game.gameMap;
        const alive = faction.villagers.filter(v => v.isAlive);
        const pop = alive.length;
        const foodPerTick = pop * CONFIG.foodPerVillagerPerTick;
        const foodSecurity = foodPerTick > 0 ? faction.resources.food / (foodPerTick * 300) : 999;

        const factionType = faction.type || (alive[0] && alive[0].factionType);

        // Check if water is nearby (for navigation scoring)
        let nearWater = false;
        if (map) {
            const center = this._factionCenter(faction);
            const cx = Math.floor(center.x);
            const cy = Math.floor(center.y);
            const radius = 15;
            outer:
            for (let dy = -radius; dy <= radius; dy += 2) {
                for (let dx = -radius; dx <= radius; dx += 2) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
                        if (map.terrain[ny][nx] === 4) { // TERRAIN.WATER
                            nearWater = true;
                            break outer;
                        }
                    }
                }
            }
        }

        return {
            foodCrisis: foodSecurity < 0.5,
            lowStone: (faction.resources.stone || 0) < 30,
            lowIron: (faction.resources.iron || 0) < 20,
            threatened: this._isThreatened(faction, game),
            isElf: factionType === 'elf',
            population: pop,
            nearWater,
            hasAnimals: map && map.animals && map.animals.filter(a => a.isAlive).length > 5
        };
    }

    _isThreatened(faction, game) {
        const enemies = (game.factions || []).filter(f => f.id !== faction.id);
        for (const enemy of enemies) {
            const enemyMil = enemy.villagers.filter(v =>
                v.isAlive && (v.unitType !== 0 || v.job === JOB.WARRIOR)
            ).length;
            const ourMil = faction.villagers.filter(v =>
                v.isAlive && (v.unitType !== 0 || v.job === JOB.WARRIOR)
            ).length;
            if (enemyMil > ourMil * 1.3) return true;
        }
        return false;
    }

    _factionCenter(faction) {
        const alive = faction.villagers.filter(v => v.isAlive);
        if (alive.length === 0) return { x: CONFIG.mapWidth / 2, y: CONFIG.mapHeight / 2 };
        let sx = 0, sy = 0;
        for (const v of alive) { sx += v.x; sy += v.y; }
        return { x: sx / alive.length, y: sy / alive.length };
    }
}
