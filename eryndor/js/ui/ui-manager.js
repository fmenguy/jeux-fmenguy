import { eventBus } from '../event-bus.js';
import { Panels } from './panels.js';
import { Toolbar } from './toolbar.js';
import { Modals } from './modals.js';
import { EventLog } from './event-log.js';
import { StatsDashboard } from './stats-dashboard.js';
import { Tooltips } from './tooltips.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.panels = new Panels(game);
        this.toolbar = new Toolbar(game);
        this.modals = new Modals(game);
        this.eventLog = new EventLog();
        this.stats = new StatsDashboard(game);
        this.tooltips = new Tooltips(game);
    }

    init() {
        this.toolbar.init();
        this.modals.init();
        this.eventLog.init();
        this.tooltips.init();

        // Route game events to the event log
        eventBus.on('event-triggered', (data) => this.eventLog.addEntry(data));
        eventBus.on('combat-result', (data) => this.eventLog.addEntry({ type: 'combat', ...data }));
        eventBus.on('diplomacy-change', (data) => this.eventLog.addEntry({ type: 'diplomacy', ...data }));
        eventBus.on('tech-completed', (data) => this.eventLog.addEntry({ type: 'tech', ...data }));
        eventBus.on('building-built', (data) => this.eventLog.addEntry({ type: 'building', ...data }));

        // Record stats snapshot periodically
        eventBus.on('tick', () => {
            this.stats.recordSnapshot(this.game);
        });

        // Listen for camera-goto from event log clicks
        eventBus.on('camera-goto', ({ x, y }) => {
            if (this.game.renderer && this.game.renderer.camera) {
                this.game.renderer.camera.centerOn(x, y);
            }
        });
    }

    update() {
        this.panels.update();
        this.tooltips.update();
    }
}
