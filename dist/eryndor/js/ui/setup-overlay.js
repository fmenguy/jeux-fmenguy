import { CONFIG } from '../config.js';

/**
 * SetupOverlay - first screen shown on load. Collects BYOK Anthropic key
 * and model choice for each faction. Persists optionally to localStorage.
 *
 * Call show() and await the returned promise, which resolves once the
 * user clicks "Lancer le duel" with valid inputs.
 */

const DEFAULT_MODELS = [
    { id: 'claude-opus-4-7', label: 'Opus 4.7 (le plus fort, coût élevé)' },
    { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (équilibré)' },
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (rapide, économique)' }
];

const STORAGE_KEY = 'eryndor_duel_setup_v1';

export function show() {
    return new Promise((resolve) => {
        const overlay = document.getElementById('setupOverlay');
        if (!overlay) {
            console.warn('setupOverlay element missing');
            resolve({ apiKey: null, humans: CONFIG.agentDefaults.humans.model, elves: CONFIG.agentDefaults.elves.model, mock: true });
            return;
        }

        const saved = loadSaved();
        overlay.innerHTML = renderTemplate(saved);
        overlay.style.display = 'flex';

        const apiKeyInput = overlay.querySelector('#setupApiKey');
        const rememberCheckbox = overlay.querySelector('#setupRemember');
        const humanSelect = overlay.querySelector('#setupHumanModel');
        const elfSelect = overlay.querySelector('#setupElfModel');
        const mockCheckbox = overlay.querySelector('#setupMock');
        const turnIntervalInput = overlay.querySelector('#setupTurnInterval');
        const startBtn = overlay.querySelector('#setupStartBtn');
        const errorEl = overlay.querySelector('#setupError');

        startBtn.addEventListener('click', () => {
            const mock = mockCheckbox.checked;
            const apiKey = apiKeyInput.value.trim();

            if (!mock && !apiKey) {
                errorEl.textContent = 'Clé API requise (ou active le mode mock pour tester).';
                errorEl.style.display = 'block';
                return;
            }

            const config = {
                apiKey: apiKey || null,
                humans: humanSelect.value,
                elves: elfSelect.value,
                mock,
                turnInterval: parseInt(turnIntervalInput.value, 10) || CONFIG.turnInterval
            };

            if (rememberCheckbox.checked) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    apiKey: config.apiKey,
                    humans: config.humans,
                    elves: config.elves,
                    turnInterval: config.turnInterval
                }));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }

            overlay.style.display = 'none';
            resolve(config);
        });
    });
}

function loadSaved() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function renderTemplate(saved) {
    const modelOptions = (selected) => DEFAULT_MODELS.map(m =>
        `<option value="${m.id}"${m.id === selected ? ' selected' : ''}>${m.label}</option>`
    ).join('');

    const sv = saved || {};
    return `
    <div class="setup-card">
        <h2>Eryndor : Duel d'IA</h2>
        <p class="setup-intro">
            Deux agents Claude s'affrontent : Humains contre Elfes. Tu observes.
            Chaque tour (par défaut 300 ticks) chaque agent décide en parallèle.
        </p>

        <label class="setup-label">Clé API Anthropic (BYOK)</label>
        <input type="password" id="setupApiKey" placeholder="sk-ant-..." value="${sv.apiKey || ''}" />
        <div class="setup-hint">La clé reste dans ton navigateur. Génère-la sur console.anthropic.com.</div>

        <label class="setup-checkbox">
            <input type="checkbox" id="setupRemember" ${sv.apiKey ? 'checked' : ''} />
            Mémoriser la clé (localStorage)
        </label>

        <label class="setup-checkbox">
            <input type="checkbox" id="setupMock" />
            Mode mock (tests sans clé, actions scriptées)
        </label>

        <div class="setup-grid">
            <div>
                <label class="setup-label">Modèle Humains</label>
                <select id="setupHumanModel">
                    ${modelOptions(sv.humans || 'claude-sonnet-4-6')}
                </select>
            </div>
            <div>
                <label class="setup-label">Modèle Elfes</label>
                <select id="setupElfModel">
                    ${modelOptions(sv.elves || 'claude-haiku-4-5-20251001')}
                </select>
            </div>
        </div>

        <label class="setup-label">Intervalle entre les tours (cycles)</label>
        <input type="number" id="setupTurnInterval" min="100" max="1500" step="50" value="${sv.turnInterval || 300}" />

        <div id="setupError" class="setup-error" style="display:none"></div>

        <button class="btn setup-start" id="setupStartBtn">Lancer le duel</button>

        <div class="setup-hint setup-warning">
            Chaque tour consomme des tokens facturés par Anthropic. Surveille le compteur dans le panneau de log.
        </div>
    </div>`;
}
