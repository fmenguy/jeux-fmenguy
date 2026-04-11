import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';

export class Toolbar {
    constructor(game) {
        this.game = game;
        this.toolbarEl = document.getElementById('toolbar');

        // Current state
        this.currentTool = 'select';   // select | terrain-grass | terrain-forest | terrain-stone | terrain-water | terrain-mountain | etc.
        this.brushSize = 1;
        this.selectionMode = 'villager'; // villager | building
        this.godAction = null;           // null | disaster | blessing | plague | fertility
        this.isPaused = CONFIG.isPaused;
    }

    init() {
        this._bindTerrainTools();
        this._bindBrushSize();
        this._bindSelectionMode();
        this._bindGodActions();
        this._bindSpeedControl();
        this._bindPause();
        this._bindSaveLoad();
    }

    // --- Terrain tool buttons ---
    _bindTerrainTools() {
        const buttons = this.toolbarEl
            ? this.toolbarEl.querySelectorAll('[data-tool]')
            : [];

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Clear god action when selecting a terrain tool
                this.godAction = null;
                this._clearGodHighlights();

                this.currentTool = btn.dataset.tool;
                this._highlightToolButton(btn, '[data-tool]');
                eventBus.emit('tool-changed', { tool: this.currentTool, brushSize: this.brushSize });
            });
        });
    }

    // --- Brush size slider ---
    _bindBrushSize() {
        const slider = this.toolbarEl
            ? this.toolbarEl.querySelector('#brushSize')
            : null;
        if (!slider) return;

        slider.min = 1;
        slider.max = 5;
        slider.value = this.brushSize;

        const label = this.toolbarEl.querySelector('#brushSizeLabel');

        slider.addEventListener('input', () => {
            this.brushSize = parseInt(slider.value, 10);
            if (label) label.textContent = this.brushSize;
            eventBus.emit('tool-changed', { tool: this.currentTool, brushSize: this.brushSize });
        });
    }

    // --- Selection mode (villager / building) ---
    _bindSelectionMode() {
        const buttons = this.toolbarEl
            ? this.toolbarEl.querySelectorAll('[data-select]')
            : [];

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectionMode = btn.dataset.select;
                this._highlightToolButton(btn, '[data-select]');
                eventBus.emit('selection-mode-changed', { mode: this.selectionMode });
            });
        });
    }

    // --- God actions ---
    _bindGodActions() {
        const actionMap = {
            'btn-disaster': { action: 'disaster', radius: 3, icon: '\uD83C\uDF0B' },
            'btn-blessing': { action: 'blessing', radius: 5, icon: '\u2728' },
            'btn-plague': { action: 'plague', radius: 4, icon: '\u2620\uFE0F' },
            'btn-fertility': { action: 'fertility', radius: 4, icon: '\uD83C\uDF38' }
        };

        Object.entries(actionMap).forEach(([id, cfg]) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            btn.addEventListener('click', () => {
                // Toggle: click again to cancel
                if (this.godAction === cfg.action) {
                    this.godAction = null;
                    btn.classList.remove('active');
                    eventBus.emit('god-action-cancel', {});
                    return;
                }

                this._clearGodHighlights();
                this.godAction = cfg.action;
                btn.classList.add('active');
                this.currentTool = 'god';

                eventBus.emit('god-action-selected', {
                    action: cfg.action,
                    radius: cfg.radius,
                    icon: cfg.icon
                });
            });
        });

        // Listen for map click to apply god action
        eventBus.on('map-click', ({ worldX, worldY }) => {
            if (!this.godAction) return;

            const cfg = {
                disaster: { radius: 3 },
                blessing: { radius: 5 },
                plague: { radius: 4 },
                fertility: { radius: 4 }
            }[this.godAction];

            eventBus.emit('god-action-apply', {
                action: this.godAction,
                x: worldX,
                y: worldY,
                radius: cfg.radius
            });

            // Reset god action after use
            this.godAction = null;
            this._clearGodHighlights();
        });
    }

    // --- Speed control ---
    _bindSpeedControl() {
        const slider = document.getElementById('speedSlider');
        if (!slider) return;

        slider.min = 1;
        slider.max = 50;
        slider.value = CONFIG.gameSpeed;

        const label = document.getElementById('speedLabel');

        slider.addEventListener('input', () => {
            const speed = parseInt(slider.value, 10);
            CONFIG.gameSpeed = speed;
            if (label) label.textContent = `x${speed}`;
            eventBus.emit('speed-changed', { speed });
        });
    }

    // --- Pause button ---
    _bindPause() {
        const btn = document.getElementById('btn-pause');
        if (!btn) return;

        btn.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            CONFIG.isPaused = this.isPaused;
            btn.classList.toggle('active', this.isPaused);
            btn.textContent = this.isPaused ? '\u25B6 Reprendre' : '\u23F8 Pause';
            eventBus.emit('pause-toggled', { isPaused: this.isPaused });
        });
    }

    // --- Save / Load ---
    _bindSaveLoad() {
        const saveBtn = document.getElementById('btn-save');
        const loadBtn = document.getElementById('btn-load');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                eventBus.emit('save-game', {});
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                eventBus.emit('load-game', {});
            });
        }
    }

    // --- Utility ---

    _highlightToolButton(activeBtn, selector) {
        const allBtns = this.toolbarEl
            ? this.toolbarEl.querySelectorAll(selector)
            : [];
        allBtns.forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    _clearGodHighlights() {
        ['btn-disaster', 'btn-blessing', 'btn-plague', 'btn-fertility'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
    }
}
