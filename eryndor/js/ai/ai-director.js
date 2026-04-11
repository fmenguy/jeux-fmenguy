import { CONFIG } from '../config.js';
import { StrategicPlanner } from './strategic-planner.js';
import { ThreatAssessor } from './threat-assessor.js';
import { BuildingPlanner } from './building-planner.js';
import { TechAdvisor } from './tech-advisor.js';
import { ResourceOptimizer } from './resource-optimizer.js';
import { MilitaryCommander } from './military-commander.js';
import { PopulationManager } from './population-manager.js';
import { DiplomacyBrain } from './diplomacy-brain.js';
import { eventBus } from '../event-bus.js';

/**
 * AIDirector - Main AI controller, one instance per faction.
 *
 * Runs every 30 ticks (not every frame) and orchestrates all sub-systems
 * in a fixed pipeline:
 *
 *   1. Evaluate situation   (StrategicPlanner)
 *   2. Scan threats          (ThreatAssessor)
 *   3. Decide priorities     (StrategicPlanner)
 *   4. Optimize resources    (ResourceOptimizer)
 *   5. Plan buildings        (BuildingPlanner)
 *   6. Advise tech           (TechAdvisor)
 *   7. Command military      (MilitaryCommander)
 *   8. Manage population     (PopulationManager)
 *   9. Handle diplomacy      (DiplomacyBrain)
 *
 * Each subsystem receives the same `priorities` weight object so all
 * decisions stay globally coherent.
 */
export class AIDirector {

    /**
     * @param {Object} faction - The faction state object this AI controls.
     * @param {Object} game    - The root game state (factions, map, diplomacy, etc.).
     */
    constructor(faction, game) {
        this.faction = faction;
        this.game = game;

        // Sub-systems
        this.strategicPlanner   = new StrategicPlanner();
        this.threatAssessor     = new ThreatAssessor();
        this.buildingPlanner    = new BuildingPlanner();
        this.techAdvisor        = new TechAdvisor();
        this.resourceOptimizer  = new ResourceOptimizer();
        this.militaryCommander  = new MilitaryCommander();
        this.populationManager  = new PopulationManager();
        this.diplomacyBrain     = new DiplomacyBrain();

        // Diagnostics (exposed so the UI can inspect AI thinking)
        this._lastSituation  = null;
        this._lastThreats    = null;
        this._lastPriorities = null;
    }

    // ------------------------------------------------------------------ //
    //  Main update loop
    // ------------------------------------------------------------------ //

    /**
     * Called every game tick.  Only performs work every 30 ticks.
     * @param {number} tick - The current game tick counter.
     */
    update(tick) {
        if (tick % 30 !== 0) return;

        // Guard: skip if faction has no living villagers
        const alive = this.faction.villagers.filter(v => v.isAlive);
        if (alive.length === 0) return;

        // 1. Evaluate the current situation
        const situation = this.strategicPlanner.evaluate(this.faction, this.game);
        this._lastSituation = situation;

        // 2. Scan for threats
        const threats = this.threatAssessor.scan(this.faction, this.game);
        this._lastThreats = threats;

        // 3. Decide priority weights
        const priorities = this.strategicPlanner.decidePriorities(situation, threats);
        this._lastPriorities = priorities;

        // 4. Resource optimization (assign gatherers efficiently)
        this.resourceOptimizer.update(this.faction, this.game, priorities);

        // 5. Building planning (decide what and where to build)
        this.buildingPlanner.update(this.faction, this.game, priorities);

        // 6. Technology research
        this.techAdvisor.update(this.faction, this.game, priorities);

        // 7. Military operations
        this.militaryCommander.update(this.faction, this.game, priorities, threats);

        // 8. Population / job management
        this.populationManager.update(this.faction, this.game, priorities);

        // 9. Diplomacy
        this.diplomacyBrain.update(this.faction, this.game, priorities, threats);

        // Emit diagnostic event for UI / debugging
        eventBus.emit('ai-tick', {
            factionId: this.faction.id,
            tick,
            situation,
            priorities,
            threats: {
                maxThreat: threats.maxThreat,
                primaryDirection: threats.primaryThreat ? threats.primaryThreat.direction : null
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  Diagnostic getters (for UI panels)
    // ------------------------------------------------------------------ //

    get situation()  { return this._lastSituation; }
    get threats()    { return this._lastThreats; }
    get priorities() { return this._lastPriorities; }
}
