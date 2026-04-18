import { CONFIG } from '../config.js';
import { BUILDING } from '../enums.js';

/**
 * VictoryReport - full-screen end-game summary once a faction wins.
 * Renders scoreboard, per-agent action breakdown, tokens/cost, and
 * highlights of notable choices.
 */

const BUILDING_LABEL = {
    [BUILDING.HOUSE]: 'Maisons', [BUILDING.FARM]: 'Fermes', [BUILDING.CASTLE]: 'Château',
    [BUILDING.BARRACKS]: 'Casernes', [BUILDING.FORGE]: 'Forges', [BUILDING.SAWMILL]: 'Scieries',
    [BUILDING.MINE]: 'Mines', [BUILDING.PORT]: 'Ports', [BUILDING.WATCHTOWER]: 'Tours de guet',
    [BUILDING.ARCHERY_RANGE]: "Camps d'archerie", [BUILDING.ROAD]: 'Routes', [BUILDING.WALL]: 'Murs',
    [BUILDING.TOWER]: 'Tours', [BUILDING.COLONY]: 'Colonies', [BUILDING.MARKET]: 'Marchés',
    [BUILDING.TEMPLE]: 'Temples', [BUILDING.GRANARY]: 'Greniers'
};

const TOOL_LABEL = {
    build: 'Construction',
    train: 'Entraînement',
    research: 'Recherche',
    set_jobs: 'Réassignation',
    attack: 'Attaque',
    declare_war: 'Guerre déclarée',
    offer_peace: 'Paix offerte',
    found_colony: 'Colonies fondées',
    trade: 'Commerce'
};

export function showVictoryReport({ winner, game, agents }) {
    const existing = document.getElementById('victoryReport');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'victoryReport';
    overlay.className = 'victory-report';
    overlay.innerHTML = buildHtml({ winner, game, agents });

    overlay.querySelector('.victory-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);

    const oldBanner = document.getElementById('victoryBanner');
    if (oldBanner) oldBanner.style.display = 'none';
}

function buildHtml({ winner, game, agents }) {
    const year = Math.floor(CONFIG.currentTick / CONFIG.ticksPerYear) + 1;
    const totalTicks = CONFIG.currentTick;
    const winnerName = winner.type === 'human' ? 'Humains' : 'Elfes';
    const loser = game.factions.find(f => f.id !== winner.id);
    const loserName = loser ? (loser.type === 'human' ? 'Humains' : 'Elfes') : 'adversaire';

    const humanAgent = agents.find(a => a.faction.type === 'human');
    const elfAgent = agents.find(a => a.faction.type === 'elf');

    const humanCost = costOf(humanAgent);
    const elfCost = costOf(elfAgent);

    return `
    <div class="victory-report-card">
        <div class="victory-report-head">
            <div>
                <div class="victory-tag">VICTOIRE</div>
                <div class="victory-winner-name">${winnerName}</div>
                <div class="victory-subtitle">triomphe des ${loserName} · An ${year} · ${totalTicks} cycles</div>
            </div>
            <button class="victory-close" title="Fermer">✕</button>
        </div>

        <div class="victory-grid">
            ${factionColumn(winner, humanAgent && winner.type === 'human' ? humanAgent : elfAgent, game, true)}
            ${factionColumn(loser, humanAgent && winner.type === 'human' ? elfAgent : humanAgent, game, false)}
        </div>

        <div class="victory-footer">
            <div class="victory-footer-cell">
                <div class="victory-footer-label">Coût total estimé</div>
                <div class="victory-footer-value">$${(humanCost + elfCost).toFixed(4)}</div>
            </div>
            <div class="victory-footer-cell">
                <div class="victory-footer-label">Tours stratégiques joués</div>
                <div class="victory-footer-value">H:${humanAgent ? humanAgent.turnNumber : 0} · E:${elfAgent ? elfAgent.turnNumber : 0}</div>
            </div>
            <div class="victory-footer-cell">
                <div class="victory-footer-label">Durée in-game</div>
                <div class="victory-footer-value">${year - 1} ans (${Math.floor(totalTicks / CONFIG.ticksPerMonth)} mois)</div>
            </div>
        </div>
    </div>`;
}

function factionColumn(faction, agent, game, isWinner) {
    if (!faction) return '<div class="victory-col"></div>';

    const alive = faction.villagers.filter(v => v.isAlive).length;
    const territory = countTerritory(faction, game.map);
    const territoryPct = Math.round((territory / (game.map.width * game.map.height)) * 1000) / 10;

    const buildings = {};
    faction.buildings.forEach(b => {
        buildings[b.type] = (buildings[b.type] || 0) + 1;
    });

    const buildingsList = Object.entries(buildings)
        .sort((a, b) => b[1] - a[1])
        .map(([t, c]) => `<li>${BUILDING_LABEL[t] || 'type ' + t} × ${c}</li>`)
        .join('');

    const actionsList = agent
        ? Object.entries(agent.actionCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => `<li>${TOOL_LABEL[name] || name} <span class="victory-count">${count}</span></li>`)
            .join('')
        : '';

    const techsList = (faction.completedTechs || [])
        .map(id => `<span class="victory-tech-chip">${id}</span>`)
        .join(' ');

    const highlights = agent && agent.highlights.length > 0
        ? agent.highlights.slice(-8).map(h => `<li>Tour ${h.turn} — ${h.detail}</li>`).join('')
        : '<li class="victory-muted">aucun événement notable</li>';

    const stats = faction.stats || {};
    const tokens = agent ? { input: agent.client.totalInputTokens || 0, output: agent.client.totalOutputTokens || 0 } : { input: 0, output: 0 };
    const cost = costOf(agent);

    const modelLabel = agent && CONFIG.modelPricing[agent.model]
        ? CONFIG.modelPricing[agent.model].label
        : (agent ? agent.model : '—');

    const factionColorClass = faction.type === 'human' ? 'victory-col-human' : 'victory-col-elf';
    const crown = isWinner ? '<span class="victory-crown">👑</span>' : '';

    return `
    <div class="victory-col ${factionColorClass} ${isWinner ? 'victory-col-winner' : 'victory-col-loser'}">
        <div class="victory-col-head">
            <span class="victory-faction-name">${faction.type === 'human' ? 'Humains' : 'Elfes'} ${crown}</span>
            <span class="victory-model-badge">${modelLabel}</span>
        </div>

        <div class="victory-metrics">
            <div><span class="victory-metric-label">Population</span><span class="victory-metric-val">${alive}</span></div>
            <div><span class="victory-metric-label">Pic</span><span class="victory-metric-val">${stats.peakPopulation || alive}</span></div>
            <div><span class="victory-metric-label">Territoire</span><span class="victory-metric-val">${territoryPct}%</span></div>
            <div><span class="victory-metric-label">Tués</span><span class="victory-metric-val">${stats.totalKills || 0}</span></div>
            <div><span class="victory-metric-label">Morts</span><span class="victory-metric-val">${stats.totalDeaths || 0}</span></div>
            <div><span class="victory-metric-label">Guerres</span><span class="victory-metric-val">${stats.warsDeclared || 0}</span></div>
        </div>

        <div class="victory-section">
            <div class="victory-section-title">Décisions IA</div>
            <ul class="victory-actions">${actionsList || '<li class="victory-muted">aucune</li>'}</ul>
        </div>

        <div class="victory-section">
            <div class="victory-section-title">Moments clés</div>
            <ul class="victory-highlights">${highlights}</ul>
        </div>

        <div class="victory-section">
            <div class="victory-section-title">Technologies</div>
            <div class="victory-techs">${techsList || '<span class="victory-muted">aucune recherche terminée</span>'}</div>
        </div>

        <div class="victory-section">
            <div class="victory-section-title">Bâtiments</div>
            <ul class="victory-buildings">${buildingsList}</ul>
        </div>

        <div class="victory-footer-row">
            <span>${tokens.input} tokens in</span>
            <span>${tokens.output} tokens out</span>
            <span class="victory-cost">$${cost.toFixed(4)}</span>
        </div>
    </div>`;
}

function countTerritory(faction, map) {
    let c = 0;
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            if (map.territory[y][x] === faction.id) c++;
        }
    }
    return c;
}

function costOf(agent) {
    if (!agent || !agent.client) return 0;
    const p = CONFIG.modelPricing && CONFIG.modelPricing[agent.model];
    if (!p) return 0;
    return (agent.client.totalInputTokens / 1e6) * p.in
         + (agent.client.totalOutputTokens / 1e6) * p.out;
}
