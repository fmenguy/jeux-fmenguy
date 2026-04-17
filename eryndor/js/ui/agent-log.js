import { eventBus } from '../event-bus.js';
import { CONFIG } from '../config.js';

/**
 * AgentLog - subscribes to agent-turn-completed events and renders the
 * reasoning + tool calls of each side in a two-column live feed.
 * Also tracks per-faction token usage and displays an estimated cost.
 */
export class AgentLog {
    constructor(containerId = 'agentLog') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`AgentLog: #${containerId} not found`);
            return;
        }
        this.stats = {
            human: { input: 0, output: 0, model: null },
            elf:   { input: 0, output: 0, model: null }
        };
        this._buildLayout();

        eventBus.on('agent-turn-completed', (data) => this.appendTurn(data));
        eventBus.on('agent-error', (data) => this.appendError(data));
        eventBus.on('scheduler-turn-completed', (data) => this.appendSeparator(data));
    }

    _buildLayout() {
        this.container.innerHTML = `
            <div class="agent-log-resize" title="Glisser pour redimensionner"></div>
            <div class="agent-log-header">
                <span class="agent-log-title">Journal des agents</span>
                <span class="agent-log-cost" id="agentCost">$0.0000</span>
                <span class="agent-log-actions">
                    <button class="agent-log-btn" data-size="small" title="Taille par défaut">▫</button>
                    <button class="agent-log-btn" data-size="medium" title="Agrandir">▭</button>
                    <button class="agent-log-btn" data-size="large" title="Maximiser">▬</button>
                </span>
            </div>
            <div class="agent-log-cols">
                <div class="agent-log-col agent-log-human" id="humanLog">
                    <div class="agent-log-colhead">
                        <span>Humains</span>
                        <span class="agent-log-model" id="humanModel"></span>
                    </div>
                    <div class="agent-log-usage" id="humanUsage">0 in / 0 out · $0.0000</div>
                </div>
                <div class="agent-log-col agent-log-elf" id="elfLog">
                    <div class="agent-log-colhead">
                        <span>Elfes</span>
                        <span class="agent-log-model" id="elfModel"></span>
                    </div>
                    <div class="agent-log-usage" id="elfUsage">0 in / 0 out · $0.0000</div>
                </div>
            </div>
        `;
        this.humanCol = this.container.querySelector('#humanLog');
        this.elfCol = this.container.querySelector('#elfLog');
        this.costEl = this.container.querySelector('#agentCost');
        this.humanUsageEl = this.container.querySelector('#humanUsage');
        this.elfUsageEl = this.container.querySelector('#elfUsage');
        this.humanModelEl = this.container.querySelector('#humanModel');
        this.elfModelEl = this.container.querySelector('#elfModel');

        this._initResize();
        this._initPresets();
    }

    _setHeight(px) {
        const clamped = Math.max(80, Math.min(Math.round(px), Math.round(window.innerHeight * 0.85)));
        document.documentElement.style.setProperty('--agent-log-height', clamped + 'px');
        try { localStorage.setItem('eryndor_log_height', String(clamped)); } catch {}
    }

    _initResize() {
        const saved = parseInt(localStorage.getItem('eryndor_log_height') || '', 10);
        if (!isNaN(saved)) this._setHeight(saved);

        const handle = this.container.querySelector('.agent-log-resize');
        if (!handle) return;

        let startY = 0;
        let startHeight = 0;

        const onMove = (e) => {
            const dy = startY - e.clientY;
            this._setHeight(startHeight + dy);
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.userSelect = '';
        };
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startY = e.clientY;
            startHeight = this.container.getBoundingClientRect().height;
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    _initPresets() {
        const presets = { small: 180, medium: 360, large: Math.round(window.innerHeight * 0.7) };
        this.container.querySelectorAll('.agent-log-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = btn.dataset.size;
                if (presets[size] != null) this._setHeight(presets[size]);
            });
        });
    }

    appendTurn({ faction, model, turn, reasoning, toolCalls, stopReason, tokens }) {
        const col = faction === 'human' ? this.humanCol : this.elfCol;
        if (!col) return;

        const entry = document.createElement('div');
        entry.className = 'agent-log-entry';

        const header = document.createElement('div');
        header.className = 'agent-log-entry-header';
        header.textContent = `Tour ${turn} — ${stopReason || 'ok'}`;
        entry.appendChild(header);

        if (reasoning) {
            const rz = document.createElement('div');
            rz.className = 'agent-log-reasoning';
            rz.textContent = reasoning.length > 600 ? reasoning.slice(0, 600) + '…' : reasoning;
            entry.appendChild(rz);
        }

        (toolCalls || []).forEach(tc => {
            const line = document.createElement('div');
            const ok = tc.result && tc.result.ok;
            const err = tc.result && tc.result.error;
            line.className = 'agent-log-call ' + (ok ? 'ok' : err ? 'err' : 'info');
            const inputStr = JSON.stringify(tc.input || {});
            const resStr = err ? err : (ok ? '✓' : JSON.stringify(tc.result));
            line.textContent = `${tc.name}(${inputStr}) → ${resStr}`;
            entry.appendChild(line);
        });

        col.appendChild(entry);
        col.scrollTop = col.scrollHeight;

        const key = faction === 'human' ? 'human' : 'elf';
        if (model) this.stats[key].model = model;
        if (tokens) {
            this.stats[key].input = tokens.input || 0;
            this.stats[key].output = tokens.output || 0;
        }
        this._renderUsage();
    }

    appendError({ faction, error }) {
        const col = faction === 'human' ? this.humanCol : this.elfCol;
        if (!col) return;
        const entry = document.createElement('div');
        entry.className = 'agent-log-entry agent-log-entry-error';
        entry.textContent = `⚠ ${error}`;
        col.appendChild(entry);
        col.scrollTop = col.scrollHeight;
    }

    appendSeparator({ turn, tick }) {
        const sep = document.createElement('div');
        sep.className = 'agent-log-sep';
        sep.textContent = `— tour ${turn} (tick ${tick}) —`;
        this.humanCol.appendChild(sep);
        this.elfCol.appendChild(sep.cloneNode(true));
    }

    _renderUsage() {
        const totalCost = this._costOf('human') + this._costOf('elf');

        if (this.humanUsageEl) {
            const s = this.stats.human;
            this.humanUsageEl.textContent =
                `${s.input} in / ${s.output} out · $${this._costOf('human').toFixed(4)}`;
        }
        if (this.elfUsageEl) {
            const s = this.stats.elf;
            this.elfUsageEl.textContent =
                `${s.input} in / ${s.output} out · $${this._costOf('elf').toFixed(4)}`;
        }
        if (this.humanModelEl) {
            this.humanModelEl.textContent = this._labelOf(this.stats.human.model);
        }
        if (this.elfModelEl) {
            this.elfModelEl.textContent = this._labelOf(this.stats.elf.model);
        }
        if (this.costEl) {
            this.costEl.textContent = `total estimé : $${totalCost.toFixed(4)}`;
        }
    }

    _costOf(key) {
        const s = this.stats[key];
        const p = s.model && CONFIG.modelPricing && CONFIG.modelPricing[s.model];
        if (!p) return 0;
        return (s.input / 1e6) * p.in + (s.output / 1e6) * p.out;
    }

    _labelOf(modelId) {
        if (!modelId) return '';
        const p = CONFIG.modelPricing && CONFIG.modelPricing[modelId];
        return p ? p.label : modelId;
    }
}
