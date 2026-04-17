/**
 * MockClient - same interface as AnthropicClient, but returns scripted
 * responses. Used when CONFIG.agentMockMode is true so the game loop can
 * be smoke-tested without network or an API key.
 *
 * Strategy: a rotating script of simple actions depending on the faction.
 */

const HUMAN_SCRIPT = [
    [{ name: 'build', input: { type: 'FARM', hint: 'near_water' } }, { name: 'end_turn', input: {} }],
    [{ name: 'research', input: { tech_id: 'agriculture' } }, { name: 'end_turn', input: {} }],
    [{ name: 'build', input: { type: 'HOUSE', hint: 'cluster' } }, { name: 'end_turn', input: {} }],
    [{ name: 'build', input: { type: 'BARRACKS', hint: 'between_me_and_enemy' } }, { name: 'end_turn', input: {} }],
    [{ name: 'train', input: { unit_type: 'SOLDIER', count: 2 } }, { name: 'end_turn', input: {} }],
    [{ name: 'research', input: { tech_id: 'ironWorking' } }, { name: 'end_turn', input: {} }],
    [{ name: 'build', input: { type: 'TOWER', hint: 'border' } }, { name: 'end_turn', input: {} }],
    [{ name: 'declare_war', input: {} }, { name: 'attack', input: { target: 'enemy_castle', unit_count: 5 } }, { name: 'end_turn', input: {} }]
];

const ELF_SCRIPT = [
    [{ name: 'build', input: { type: 'FARM', hint: 'near_forest' } }, { name: 'end_turn', input: {} }],
    [{ name: 'research', input: { tech_id: 'herbalism' } }, { name: 'end_turn', input: {} }],
    [{ name: 'build', input: { type: 'SAWMILL', hint: 'near_forest' } }, { name: 'end_turn', input: {} }],
    [{ name: 'build', input: { type: 'HOUSE', hint: 'cluster' } }, { name: 'end_turn', input: {} }],
    [{ name: 'research', input: { tech_id: 'archery' } }, { name: 'end_turn', input: {} }],
    [{ name: 'build', input: { type: 'ARCHERY_RANGE', hint: 'between_me_and_enemy' } }, { name: 'end_turn', input: {} }],
    [{ name: 'train', input: { unit_type: 'ARCHER', count: 3 } }, { name: 'end_turn', input: {} }],
    [{ name: 'build', input: { type: 'TOWER', hint: 'border' } }, { name: 'attack', input: { target: 'nearest_enemy', unit_count: 3 } }, { name: 'end_turn', input: {} }]
];

export class MockClient {
    constructor({ faction }) {
        this.faction = faction;
        this.turnIndex = 0;
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
    }

    async runToolLoop({ onToolCall }) {
        const script = this.faction === 'human' ? HUMAN_SCRIPT : ELF_SCRIPT;
        const plan = script[this.turnIndex % script.length];
        this.turnIndex++;

        const log = [];
        const reasoning = `[mock] Plan ${this.turnIndex}: ${plan.map(p => p.name).join(' -> ')}`;

        for (const call of plan) {
            const result = await onToolCall(call.name, call.input);
            log.push({ name: call.name, input: call.input, result });
            if (call.name === 'end_turn') break;
        }

        return {
            reasoning,
            toolCalls: log,
            iterations: 1,
            stopReason: 'mock_scripted',
            usage: { inputTokens: 0, outputTokens: 0 }
        };
    }
}
