/**
 * Eryndor - Duel d'agents IA
 * Deux agents Claude s'affrontent (Sonnet vs Haiku par défaut) comme chefs
 * respectifs des Humains et des Elfes. La simulation tourne en continu ;
 * tous les CONFIG.turnInterval ticks, les deux agents sont consultés en
 * parallèle pour leurs décisions stratégiques.
 */

import { CONFIG } from './config.js';
import { eventBus } from './event-bus.js';
import { Game } from './core/game.js';
import { Renderer } from './rendering/renderer.js';
import { AgentController } from './agent/agent-controller.js';
import { AgentScheduler } from './agent/agent-scheduler.js';
import { AnthropicClient } from './agent/anthropic-client.js';
import { MockClient } from './agent/mock-client.js';
import { AgentLog } from './ui/agent-log.js';
import * as SetupOverlay from './ui/setup-overlay.js';
import { showVictoryReport } from './ui/victory-report.js';
import { showHelp } from './ui/help-overlay.js';

async function loadOptional() {
    try {
        const mod = await import('./ui/ui-manager.js');
        return mod.UIManager;
    } catch (e) {
        console.warn('UI Manager absent :', e.message);
        return null;
    }
}

async function init() {
    const UIManager = await loadOptional();
    const setup = await SetupOverlay.show();

    CONFIG.apiKey = setup.apiKey;
    CONFIG.agentMockMode = !!setup.mock;
    CONFIG.turnInterval = setup.turnInterval;
    CONFIG.agentDefaults.humans.model = setup.humans;
    CONFIG.agentDefaults.elves.model = setup.elves;

    const game = new Game();
    game.init();

    const canvas = document.getElementById('gameCanvas');
    const minimapCanvas = document.getElementById('minimap');
    const renderer = new Renderer(canvas, minimapCanvas);
    game.renderer = renderer;

    if (UIManager) {
        const uiManager = new UIManager(game);
        uiManager.init();
        game.uiManager = uiManager;
    }

    new AgentLog('agentLog');

    const sharedHumanClient = CONFIG.agentMockMode
        ? new MockClient({ faction: 'human' })
        : new AnthropicClient({ apiKey: CONFIG.apiKey });
    const sharedElfClient = CONFIG.agentMockMode
        ? new MockClient({ faction: 'elf' })
        : new AnthropicClient({ apiKey: CONFIG.apiKey });

    const agents = game.factions.map(faction => new AgentController({
        faction,
        game,
        model: faction.type === 'human'
            ? CONFIG.agentDefaults.humans.model
            : CONFIG.agentDefaults.elves.model,
        client: faction.type === 'human' ? sharedHumanClient : sharedElfClient
    }));

    const scheduler = new AgentScheduler({ agents, game });

    setupControls(scheduler, game);
    eventBus.on('scheduler-turn-completed', refreshSideInfo);

    window.addEventListener('keydown', handleKeyboard);

    function renderLoop() {
        if (!CONFIG.isPaused) {
            const ticksThisFrame = Math.min(CONFIG.gameSpeed, 10);
            for (let i = 0; i < ticksThisFrame; i++) {
                CONFIG.currentTick++;
                updateDate();
                game.factions.forEach(f => f.update(game.map, game.factions));

                if (game.uiManager && game.uiManager.stats && CONFIG.currentTick % 60 === 0) {
                    game.uiManager.stats.recordSnapshot(game);
                }

                const winner = checkVictory(game);
                if (winner) {
                    announceVictory(winner);
                    showVictoryReport({ winner, game, agents });
                    CONFIG.isPaused = true;
                    scheduler.stop();
                    break;
                }
            }
            scheduler.tick();
        }

        renderer.draw(game.map, game.factions);
        if (game.uiManager) game.uiManager.update();

        requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);

    window.game = game;
    window.renderer = renderer;
    window.scheduler = scheduler;
    window.agents = agents;

    console.log('Eryndor — duel IA initialisé',
        CONFIG.agentMockMode ? '(mode MOCK)' : '(API Anthropic live)');
}

function setupControls(scheduler, game) {
    const slider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const pauseBtn = document.getElementById('pauseBtn');
    const turnIntervalInput = document.getElementById('turnIntervalInput');
    const stopBtn = document.getElementById('stopDuelBtn');
    const techBtn = document.getElementById('techBtn');
    const statsBtn = document.getElementById('statsBtn');
    const helpBtn = document.getElementById('helpBtn');

    if (slider) {
        slider.addEventListener('input', (e) => {
            CONFIG.gameSpeed = parseInt(e.target.value, 10);
            if (speedValue) speedValue.textContent = `x${CONFIG.gameSpeed}`;
        });
    }
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            CONFIG.isPaused = !CONFIG.isPaused;
            pauseBtn.textContent = CONFIG.isPaused ? '▶' : '⏸';
            pauseBtn.classList.toggle('active', CONFIG.isPaused);
        });
    }
    if (turnIntervalInput) {
        turnIntervalInput.value = CONFIG.turnInterval;
        turnIntervalInput.addEventListener('change', (e) => {
            const v = parseInt(e.target.value, 10);
            if (v >= 50 && v <= 2000) CONFIG.turnInterval = v;
        });
    }
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            if (scheduler.enabled) {
                scheduler.stop();
                stopBtn.textContent = 'Reprendre le duel';
            } else {
                scheduler.start();
                stopBtn.textContent = 'Stopper le duel';
            }
        });
    }
    if (techBtn) {
        techBtn.addEventListener('click', () => {
            if (game && game.uiManager && game.uiManager.modals) {
                game.uiManager.modals.showTechTree(game.factions);
            }
        });
    }
    if (statsBtn) {
        statsBtn.addEventListener('click', () => {
            if (game && game.uiManager && game.uiManager.modals) {
                game.uiManager.modals.showStats(game);
            }
        });
    }
    if (helpBtn) {
        helpBtn.addEventListener('click', () => showHelp());
    }
}

function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
        case ' ':
            e.preventDefault();
            CONFIG.isPaused = !CONFIG.isPaused;
            break;
        case '1': CONFIG.gameSpeed = 1; updateSpeedDisplay(); break;
        case '2': CONFIG.gameSpeed = 2; updateSpeedDisplay(); break;
        case '3': CONFIG.gameSpeed = 5; updateSpeedDisplay(); break;
        case '4': CONFIG.gameSpeed = 10; updateSpeedDisplay(); break;
        case '5': CONFIG.gameSpeed = 20; updateSpeedDisplay(); break;
    }
}

function updateSpeedDisplay() {
    const slider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    if (slider) slider.value = CONFIG.gameSpeed;
    if (speedValue) speedValue.textContent = `x${CONFIG.gameSpeed}`;
}

function updateDate() {
    const newMonth = Math.floor(CONFIG.currentTick / CONFIG.ticksPerMonth) % 12;
    if (newMonth !== CONFIG.currentMonth) CONFIG.currentMonth = newMonth;
    const year = Math.floor(CONFIG.currentTick / CONFIG.ticksPerYear) + 1;
    const dateEl = document.getElementById('dateDisplay');
    if (dateEl) dateEl.textContent = `${CONFIG.monthNames[CONFIG.currentMonth]}, An ${year}`;
}

function checkVictory(game) {
    const map = game.map;
    const totalTiles = map.width * map.height;

    for (const f of game.factions) {
        const alive = f.villagers.filter(v => v.isAlive).length;
        if (alive === 0) continue;

        const otherLiving = game.factions.filter(o =>
            o.id !== f.id && o.villagers.some(v => v.isAlive)
        );
        if (otherLiving.length === 0) return f;

        const terr = countTerritory(f.id, map);
        const pct = (terr / totalTiles) * 100;
        if (pct >= CONFIG.victoryTerritoryPercent && alive >= CONFIG.victoryPopulation) {
            return f;
        }
    }
    return null;
}

function countTerritory(factionId, map) {
    let c = 0;
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            if (map.territory[y][x] === factionId) c++;
        }
    }
    return c;
}

function announceVictory(winner) {
    const banner = document.getElementById('victoryBanner');
    if (banner) {
        banner.textContent = `Victoire des ${winner.type === 'human' ? 'Humains' : 'Elfes'} !`;
        banner.style.display = 'flex';
    }
    console.log(`VICTORY: ${winner.type}`);
}

function refreshSideInfo() {
    // Hook for future live sidebar refresh if UIManager isn't running
}

document.addEventListener('DOMContentLoaded', init);
