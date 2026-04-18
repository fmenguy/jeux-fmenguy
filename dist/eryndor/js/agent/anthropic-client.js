import { CONFIG } from '../config.js';

/**
 * Thin Anthropic Messages API client for browser use (BYOK).
 *
 * The user supplies their API key via the setup overlay. Keys live in
 * CONFIG.apiKey for the session (and optionally localStorage). Calls go
 * directly to api.anthropic.com with `anthropic-dangerous-direct-browser-access`.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicClient {
    constructor({ apiKey } = {}) {
        this.apiKey = apiKey || CONFIG.apiKey;
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    async messages({ model, system, messages, tools, maxTokens = 1400, temperature = 0.6, timeoutMs = 20000 }) {
        if (!this.apiKey) {
            throw new Error('Pas de clé API Anthropic configurée');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        let lastErr = null;
        const maxRetries = 4;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const resp = await fetch(API_URL, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': ANTHROPIC_VERSION,
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model,
                        max_tokens: maxTokens,
                        temperature,
                        system,
                        tools,
                        messages
                    })
                });

                if (resp.status === 429 || resp.status >= 500) {
                    lastErr = new Error(`HTTP ${resp.status}`);
                    const retryAfter = parseRetryAfter(resp.headers.get('retry-after'));
                    const backoff = retryAfter != null
                        ? Math.min(retryAfter * 1000, 30000)
                        : Math.min(1500 * Math.pow(2, attempt), 20000);
                    await sleep(backoff);
                    continue;
                }

                if (!resp.ok) {
                    const body = await resp.text();
                    clearTimeout(timeout);
                    throw new Error(`API error ${resp.status}: ${body.slice(0, 300)}`);
                }

                const data = await resp.json();
                clearTimeout(timeout);

                if (data.usage) {
                    this.totalInputTokens += data.usage.input_tokens || 0;
                    this.totalOutputTokens += data.usage.output_tokens || 0;
                }

                return data;
            } catch (err) {
                lastErr = err;
                if (err.name === 'AbortError') break;
                if (attempt === maxRetries) break;
                await sleep(500 * Math.pow(2, attempt));
            }
        }

        clearTimeout(timeout);
        throw lastErr || new Error('Unknown Anthropic API failure');
    }

    /**
     * Run a bounded tool-use loop. Each iteration: call the model, execute
     * any tool_use blocks via `onToolCall`, append results, loop until the
     * model stops calling tools or we hit maxIterations.
     *
     * Returns the final assistant message plus a log of every tool call.
     */
    async runToolLoop({ model, system, userContent, tools, onToolCall, maxIterations = 6, maxTokens = 1400, timeoutMs = 20000 }) {
        const messages = [
            { role: 'user', content: userContent }
        ];
        const toolCallLog = [];
        let reasoningSegments = [];
        let iterations = 0;
        let stopReason = null;

        while (iterations < maxIterations) {
            iterations++;

            const response = await this.messages({
                model, system, messages, tools, maxTokens, timeoutMs
            });

            stopReason = response.stop_reason;

            // Collect reasoning text blocks for the log
            const assistantBlocks = response.content || [];
            for (const block of assistantBlocks) {
                if (block.type === 'text' && block.text) {
                    reasoningSegments.push(block.text);
                }
            }

            messages.push({ role: 'assistant', content: assistantBlocks });

            if (response.stop_reason !== 'tool_use') break;

            const toolUses = assistantBlocks.filter(b => b.type === 'tool_use');
            if (toolUses.length === 0) break;

            const toolResults = [];
            for (const tu of toolUses) {
                let result;
                try {
                    result = await onToolCall(tu.name, tu.input || {});
                } catch (err) {
                    result = { error: String(err.message || err) };
                }
                toolCallLog.push({ name: tu.name, input: tu.input, result });

                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: tu.id,
                    content: JSON.stringify(result),
                    is_error: !!(result && result.error)
                });

                if (tu.name === 'end_turn') {
                    stopReason = 'end_turn_called';
                }
            }

            if (stopReason === 'end_turn_called') {
                // Let the loop exit without another round
                break;
            }

            messages.push({ role: 'user', content: toolResults });
        }

        return {
            reasoning: reasoningSegments.join('\n\n').trim(),
            toolCalls: toolCallLog,
            iterations,
            stopReason,
            usage: {
                inputTokens: this.totalInputTokens,
                outputTokens: this.totalOutputTokens
            }
        };
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function parseRetryAfter(header) {
    if (!header) return null;
    const asSeconds = parseFloat(header);
    if (!isNaN(asSeconds) && asSeconds >= 0) return asSeconds;
    const asDate = Date.parse(header);
    if (!isNaN(asDate)) {
        return Math.max(0, (asDate - Date.now()) / 1000);
    }
    return null;
}
