import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';

/**
 * AgentScheduler - fires a strategic turn for every agent every
 * CONFIG.turnInterval ticks. Agents run in parallel; the simulation
 * continues uninterrupted during their think time.
 */
export class AgentScheduler {
    constructor({ agents, game }) {
        this.agents = agents;
        this.game = game;
        this.lastTurnTick = 0;
        this.enabled = true;
        this.turnCount = 0;
        this.pendingTurn = null;
    }

    stop() { this.enabled = false; }
    start() { this.enabled = true; }

    tick() {
        if (!this.enabled) return;
        if (this.pendingTurn) return;

        const currentTick = CONFIG.currentTick;
        if (currentTick - this.lastTurnTick < CONFIG.turnInterval) return;

        this.lastTurnTick = currentTick;
        this.turnCount++;

        const turnIndex = this.turnCount;
        this.pendingTurn = Promise.all(
            this.agents.map(agent =>
                agent.takeTurn().catch(err => ({ error: err.message || String(err) }))
            )
        ).then(results => {
            eventBus.emit('scheduler-turn-completed', {
                turn: turnIndex,
                tick: currentTick,
                results
            });
            this.pendingTurn = null;
        }).catch(err => {
            console.error('Scheduler turn failed:', err);
            this.pendingTurn = null;
        });
    }

    isIdle() { return !this.pendingTurn; }
}
