import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';
import { AnthropicClient } from './anthropic-client.js';
import { MockClient } from './mock-client.js';
import { ActionExecutor } from './action-executor.js';
import { buildAgentState } from './state-builder.js';
import { buildSystemPrompt } from './prompts.js';
import { TOOLS } from './tools.js';

/**
 * AgentController - orchestrates a single faction's strategic turn.
 *
 * It builds the state snapshot, fires a bounded tool-use loop against
 * the Anthropic API (or the mock client in tests), and applies each
 * tool call through the ActionExecutor.
 */
export class AgentController {
    constructor({ faction, game, model, client }) {
        this.faction = faction;
        this.game = game;
        this.model = model;
        this.client = client || (
            CONFIG.agentMockMode
                ? new MockClient({ faction: faction.type })
                : new AnthropicClient({ apiKey: CONFIG.apiKey })
        );
        this.turnNumber = 0;
        this.recentEvents = [];
        this.lastInvalidActions = [];
        this.totalTokens = { input: 0, output: 0 };
        this.isThinking = false;
        this.lastError = null;
        this.cooldownUntil = 0;

        // Post-game statistics
        this.actionCounts = {};
        this.highlights = []; // ex: { tick, name, detail }
        this.turnHistory = []; // ex: { turn, tick, reasoning, ok, fail }
    }

    addEvent(message) {
        this.recentEvents.push(message);
        if (this.recentEvents.length > 20) {
            this.recentEvents = this.recentEvents.slice(-20);
        }
    }

    async takeTurn() {
        if (this.isThinking) return { skipped: true, reason: 'already_thinking' };
        if (Date.now() < this.cooldownUntil) {
            return { skipped: true, reason: 'cooldown_active', secondsLeft: Math.ceil((this.cooldownUntil - Date.now()) / 1000) };
        }
        if (this.faction.villagers.filter(v => v.isAlive).length === 0) {
            return { skipped: true, reason: 'faction_extinct' };
        }

        this.isThinking = true;
        this.turnNumber++;

        const state = buildAgentState({
            faction: this.faction,
            game: this.game,
            turn: this.turnNumber,
            recentEvents: this.recentEvents,
            invalidLastTurn: this.lastInvalidActions
        });

        const executor = new ActionExecutor(this.faction, this.game);
        const budget = this.faction.type === 'human'
            ? CONFIG.agentDefaults.humans.maxToolCalls
            : CONFIG.agentDefaults.elves.maxToolCalls;
        const maxTokens = this.faction.type === 'human'
            ? CONFIG.agentDefaults.humans.maxTokens
            : CONFIG.agentDefaults.elves.maxTokens;
        const timeoutMs = this.faction.type === 'human'
            ? CONFIG.agentDefaults.humans.timeoutMs
            : CONFIG.agentDefaults.elves.timeoutMs;

        const userContent = [
            { type: 'text', text: `Tour ${this.turnNumber}. État du royaume :\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\nRaisonne brièvement puis joue tes actions, puis end_turn.` }
        ];

        let callsMade = 0;
        const invalidThisTurn = [];

        const onToolCall = async (name, input) => {
            callsMade++;
            const result = await executor.execute(name, input);
            if (result && result.error) {
                invalidThisTurn.push({ tool: name, input, error: result.error });
            }
            return result;
        };

        let loopResult;
        try {
            loopResult = await this.client.runToolLoop({
                model: this.model,
                system: buildSystemPrompt(this.faction.type),
                userContent,
                tools: TOOLS,
                onToolCall,
                maxIterations: budget + 1,
                maxTokens,
                timeoutMs
            });
            this.lastError = null;
        } catch (err) {
            this.lastError = err.message || String(err);
            this.isThinking = false;
            if (/HTTP 429/.test(this.lastError)) {
                this.cooldownUntil = Date.now() + 45000;
            }
            eventBus.emit('agent-error', { faction: this.faction.type, error: this.lastError });
            return { error: this.lastError, toolCalls: [], reasoning: null };
        }

        this.lastInvalidActions = invalidThisTurn;
        if (loopResult.usage) {
            this.totalTokens.input = loopResult.usage.inputTokens || this.totalTokens.input;
            this.totalTokens.output = loopResult.usage.outputTokens || this.totalTokens.output;
        }

        this.isThinking = false;

        eventBus.emit('agent-turn-completed', {
            faction: this.faction.type,
            model: this.model,
            turn: this.turnNumber,
            reasoning: loopResult.reasoning,
            toolCalls: loopResult.toolCalls,
            stopReason: loopResult.stopReason,
            tokens: {
                input: this.client.totalInputTokens || 0,
                output: this.client.totalOutputTokens || 0
            }
        });

        let okCount = 0;
        let failCount = 0;
        loopResult.toolCalls.forEach(tc => {
            if (tc.result && tc.result.ok) {
                this.addEvent(`${tc.name}(${JSON.stringify(tc.input)}) -> ok`);
                this.actionCounts[tc.name] = (this.actionCounts[tc.name] || 0) + 1;
                okCount++;

                if (tc.name === 'declare_war') {
                    this.highlights.push({ turn: this.turnNumber, tick: this.game && this.game.map ? undefined : undefined, name: 'declare_war', detail: 'Guerre déclarée' });
                } else if (tc.name === 'research' && tc.input && tc.input.tech_id) {
                    this.highlights.push({ turn: this.turnNumber, name: 'research', detail: `Lance ${tc.input.tech_id}` });
                } else if (tc.name === 'attack') {
                    this.highlights.push({ turn: this.turnNumber, name: 'attack', detail: `Attaque ${(tc.input && tc.input.target) || 'nearest_enemy'}` });
                } else if (tc.name === 'found_colony') {
                    this.highlights.push({ turn: this.turnNumber, name: 'found_colony', detail: 'Colonie fondée' });
                }
            } else if (tc.result && tc.result.error) {
                failCount++;
            }
        });

        this.turnHistory.push({
            turn: this.turnNumber,
            ok: okCount,
            fail: failCount,
            reasoning: loopResult.reasoning
        });

        return loopResult;
    }
}
