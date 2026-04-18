import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';
import { FACTIONS } from '../data/factions.js';

export class EventLog {
    constructor() {
        this.entries = [];
        this.maxEntries = 100;
        this.el = null;
        this.listEl = null;
        this.isExpanded = false;
        this.isVisible = true;
    }

    init() {
        this.el = document.getElementById('eventLog');
        if (!this.el) return;

        // Build internal structure
        this.el.innerHTML = `
            <div class="event-log-header" id="eventLogHeader">
                <span class="event-log-title">Evenements</span>
                <span class="event-log-count" id="eventLogCount">0</span>
                <button class="event-log-toggle" id="eventLogToggle">&#9650;</button>
            </div>
            <div class="event-log-list" id="eventLogList"></div>
        `;

        this.listEl = document.getElementById('eventLogList');
        const header = document.getElementById('eventLogHeader');
        const toggleBtn = document.getElementById('eventLogToggle');

        // Expand/collapse on header click
        if (header) {
            header.addEventListener('click', () => {
                this.isExpanded = !this.isExpanded;
                this.el.classList.toggle('expanded', this.isExpanded);
                if (toggleBtn) {
                    toggleBtn.innerHTML = this.isExpanded ? '&#9660;' : '&#9650;';
                }
            });
        }

        // Expand on hover
        this.el.addEventListener('mouseenter', () => {
            if (!this.isExpanded) {
                this.el.classList.add('hover-expanded');
            }
        });
        this.el.addEventListener('mouseleave', () => {
            this.el.classList.remove('hover-expanded');
        });

        // Apply base styles
        this._applyStyles();
    }

    addEntry({ type, message, tick, factionId, x, y }) {
        if (!this.listEl) return;

        const icon = this._iconForType(type);
        const color = this._colorForFaction(factionId);
        const timestamp = this._formatGameDate(tick);

        const entry = {
            type,
            message: message || this._defaultMessage(type),
            tick: tick || CONFIG.currentTick,
            factionId,
            x,
            y,
            icon,
            color,
            timestamp
        };

        this.entries.unshift(entry);

        // Trim excess entries
        while (this.entries.length > this.maxEntries) {
            this.entries.pop();
            if (this.listEl.lastChild) {
                this.listEl.removeChild(this.listEl.lastChild);
            }
        }

        // Create DOM element
        const el = document.createElement('div');
        el.className = 'event-entry';
        el.style.borderLeftColor = color;
        el.innerHTML = `
            <span class="event-icon">${icon}</span>
            <span class="event-time">${timestamp}</span>
            <span class="event-msg" style="color:${color};">${entry.message}</span>
        `;

        // Click to center camera on event location
        if (x !== undefined && y !== undefined) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                const worldX = x * CONFIG.cellSize + CONFIG.cellSize / 2;
                const worldY = y * CONFIG.cellSize + CONFIG.cellSize / 2;
                eventBus.emit('camera-goto', { x: worldX, y: worldY });
            });
        }

        // Prepend (newest first)
        this.listEl.prepend(el);

        // Update count badge
        const countEl = document.getElementById('eventLogCount');
        if (countEl) countEl.textContent = this.entries.length;

        // Auto-scroll to top (newest entry)
        this.listEl.scrollTop = 0;
    }

    // --- Helpers ---

    _iconForType(type) {
        const icons = {
            combat: '\u2694\uFE0F',
            diplomacy: '\uD83E\uDD1D',
            tech: '\uD83D\uDD2C',
            building: '\uD83C\uDFD7\uFE0F',
            event: '\u26A1',
            death: '\uD83D\uDC80',
            blessing: '\u2728',
            disaster: '\uD83C\uDF0B',
            plague: '\u2620\uFE0F',
            fertility: '\uD83C\uDF38'
        };
        return icons[type] || '\u26A1';
    }

    _colorForFaction(factionId) {
        if (factionId === 0) return FACTIONS[0].color; // amber
        if (factionId === 1) return FACTIONS[1].color; // emerald
        return '#94a3b8'; // neutral slate
    }

    _formatGameDate(tick) {
        const t = tick || CONFIG.currentTick;
        const year = Math.floor(t / CONFIG.ticksPerYear) + 1;
        const monthIdx = Math.floor((t % CONFIG.ticksPerYear) / CONFIG.ticksPerMonth) % 12;
        const monthName = CONFIG.monthNames[monthIdx] || 'Janvier';
        return `An ${year}, ${monthName}`;
    }

    _defaultMessage(type) {
        const messages = {
            combat: 'Un affrontement a eu lieu.',
            diplomacy: 'Les relations diplomatiques ont change.',
            tech: 'Une recherche a ete completee.',
            building: 'Un batiment a ete construit.',
            event: 'Un evenement est survenu.',
            death: 'Un villageois est mort.'
        };
        return messages[type] || 'Evenement.';
    }

    _applyStyles() {
        // Inject scoped styles if not already present
        if (document.getElementById('eventLogStyles')) return;

        const style = document.createElement('style');
        style.id = 'eventLogStyles';
        style.textContent = `
            #eventLog {
                position: fixed;
                bottom: 60px;
                left: 50%;
                transform: translateX(-50%);
                width: 600px;
                max-width: 90vw;
                max-height: 40px;
                overflow: hidden;
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(148, 163, 184, 0.15);
                border-radius: 12px 12px 0 0;
                z-index: 100;
                transition: max-height 0.3s ease;
                font-family: 'Segoe UI', system-ui, sans-serif;
                font-size: 12px;
            }
            #eventLog.hover-expanded,
            #eventLog.expanded {
                max-height: 300px;
            }
            .event-log-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 14px;
                cursor: pointer;
                user-select: none;
                border-bottom: 1px solid rgba(148, 163, 184, 0.1);
            }
            .event-log-title {
                color: #e2e8f0;
                font-weight: 600;
                flex: 1;
            }
            .event-log-count {
                background: rgba(148, 163, 184, 0.2);
                color: #94a3b8;
                padding: 1px 7px;
                border-radius: 8px;
                font-size: 11px;
            }
            .event-log-toggle {
                background: none;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                font-size: 10px;
                padding: 0 2px;
            }
            .event-log-list {
                overflow-y: auto;
                max-height: 255px;
                padding: 4px 0;
            }
            .event-entry {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 5px 14px;
                border-left: 3px solid transparent;
                transition: background 0.15s;
            }
            .event-entry:hover {
                background: rgba(148, 163, 184, 0.08);
            }
            .event-icon {
                font-size: 14px;
                flex-shrink: 0;
            }
            .event-time {
                color: #64748b;
                font-size: 10px;
                min-width: 90px;
                flex-shrink: 0;
            }
            .event-msg {
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `;
        document.head.appendChild(style);
    }
}
