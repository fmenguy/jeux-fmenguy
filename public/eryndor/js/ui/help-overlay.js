import { CONFIG } from '../config.js';

/**
 * HelpOverlay - page d'aide plein écran.
 * Met la simulation en pause à l'ouverture, restaure l'état au fermer.
 */

let savedPauseState = null;

export function showHelp() {
    const existing = document.getElementById('helpOverlay');
    if (existing) { close(); return; }

    savedPauseState = CONFIG.isPaused;
    CONFIG.isPaused = true;
    syncPauseBtn();

    const overlay = document.createElement('div');
    overlay.id = 'helpOverlay';
    overlay.className = 'help-overlay';
    overlay.innerHTML = buildHtml();

    overlay.querySelector('.help-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    document.addEventListener('keydown', escClose);

    document.body.appendChild(overlay);
}

function close() {
    const overlay = document.getElementById('helpOverlay');
    if (overlay) overlay.remove();
    if (savedPauseState !== null) {
        CONFIG.isPaused = savedPauseState;
        savedPauseState = null;
        syncPauseBtn();
    }
    document.removeEventListener('keydown', escClose);
}

function escClose(e) {
    if (e.key === 'Escape') close();
}

function syncPauseBtn() {
    const btn = document.getElementById('pauseBtn');
    if (btn) {
        btn.textContent = CONFIG.isPaused ? '▶' : '⏸';
        btn.classList.toggle('active', CONFIG.isPaused);
    }
}

function buildHtml() {
    return `
    <div class="help-card">
        <button class="help-close" title="Fermer (Esc)">✕</button>

        <h1>Eryndor : Duel d'IA</h1>
        <p class="help-lead">
            Deux agents Claude s'affrontent comme chefs des Humains et des Elfes.
            Tu es spectateur. La simulation continue en pause pendant que tu lis.
        </p>

        <section class="help-section">
            <h2>🎯 But de la simulation</h2>
            <p>
                Plutôt que de piloter une IA scriptée, Eryndor délègue toutes les décisions stratégiques
                (quoi construire, quelle recherche, quand déclarer la guerre, qui attaquer) à de vrais
                appels à l'API Anthropic. Chaque faction a son propre modèle (Sonnet 4.6 pour les Humains,
                Haiku 4.5 pour les Elfes par défaut). Les règles du jeu sont appliquées par le moteur :
                coûts en ressources, prérequis technologiques, plafonds de population, etc.
                Si une IA tente une action interdite, elle reçoit une erreur et doit se corriger.
            </p>
            <p>
                L'intérêt : voir émerger des stratégies différentes selon le modèle, observer des bluffs,
                des pactes rompus, des expansions agressives ou des jeux défensifs.
                Et comparer objectivement Sonnet contre Haiku sur la même tâche.
            </p>
        </section>

        <section class="help-section">
            <h2>🗺 Légende de la carte</h2>

            <h3>Territoires</h3>
            <div class="help-legend-row">
                <span class="help-swatch" style="background:#f59e0b"></span>
                <span><strong>Jaune doré</strong> — territoire des Humains</span>
            </div>
            <div class="help-legend-row">
                <span class="help-swatch" style="background:#10b981"></span>
                <span><strong>Vert</strong> — territoire des Elfes</span>
            </div>
            <div class="help-legend-row">
                <span class="help-swatch" style="background:#333"></span>
                <span><strong>Gris/neutre</strong> — terre inoccupée, à conquérir</span>
            </div>

            <h3>Terrains</h3>
            <div class="help-legend-grid">
                <div><span class="help-swatch" style="background:#4a7c3a"></span> Herbe (constructible)</div>
                <div><span class="help-swatch" style="background:#1f4a2c"></span> Forêt (bois)</div>
                <div><span class="help-swatch" style="background:#3a506b"></span> Eau (poisson, bateaux)</div>
                <div><span class="help-swatch" style="background:#6b6b6b"></span> Pierre (ressource)</div>
                <div><span class="help-swatch" style="background:#a08060"></span> Fer (ressource)</div>
                <div><span class="help-swatch" style="background:#d4a017"></span> Or (ressource)</div>
                <div><span class="help-swatch" style="background:#8b4a6b"></span> Baies (nourriture)</div>
                <div><span class="help-swatch" style="background:#555"></span> Montagne (infranchissable)</div>
            </div>

            <h3>Entités</h3>
            <div class="help-legend-row">
                <span class="help-dot"></span>
                <span><strong>Points colorés</strong> — villageois (plus gros = soldats/archers/cavaliers)</span>
            </div>
            <div class="help-legend-row">
                <span class="help-shape"></span>
                <span><strong>Formes géométriques</strong> — bâtiments (château, maison, ferme, caserne, tour…)
                      avec petite barre de vie si endommagés</span>
            </div>
            <div class="help-legend-row">
                <span class="help-swatch" style="background:#c4b088"></span>
                <span><strong>Points blancs/beiges</strong> — animaux sauvages (chassés pour la nourriture)</span>
            </div>
        </section>

        <section class="help-section">
            <h2>🎛 Contrôles de l'interface</h2>
            <ul class="help-controls">
                <li><code>⏸ / ▶</code> <strong>Pause</strong> (raccourci Espace) : gèle complètement la simulation.</li>
                <li><code>x1–x50</code> <strong>Vitesse</strong> (raccourcis 1–5) : accélère le temps in-game. À vitesse élevée, les tours IA s'enchaînent plus vite → plus de tokens consommés.</li>
                <li><code>Tour tous les X cycles</code> : intervalle entre deux décisions stratégiques. Baisse-le pour plus de réactivité, monte-le pour économiser des tokens.</li>
                <li><code>Stopper / Reprendre le duel</code> : gèle uniquement les appels à l'API Anthropic (plus de décisions IA) mais la simulation continue. Utile pour contrôler les coûts.</li>
                <li><code>🔬 Tech</code> : ouvre l'arbre technologique des deux factions.</li>
                <li><code>📊 Stats</code> : tableau de bord historique (population, production, combats).</li>
                <li><code>❔ Aide</code> : cette page.</li>
            </ul>
        </section>

        <section class="help-section">
            <h2>📝 Journal des agents</h2>
            <p>
                Le panneau du bas montre en direct ce que chaque IA décide. Pour chaque tour tu vois :
                le raisonnement en italique, puis les outils appelés avec leur résultat
                (<span style="color:#86efac">✓ ok</span> ou
                <span style="color:#fca5a5">erreur</span>), et en bas le compte de tokens + coût estimé.
            </p>
            <ul class="help-controls">
                <li>Glisse la barre au-dessus du journal pour le redimensionner.</li>
                <li>Les boutons <code>▫ ▭ ▬</code> donnent des tailles préréglées (petit, moyen, maxi).</li>
            </ul>
        </section>

        <section class="help-section">
            <h2>⚠ Coûts</h2>
            <p>
                Chaque tour consomme des tokens facturés par Anthropic directement sur ta clé API.
                Le compteur dans le journal affiche le coût estimé en temps réel.
                Sonnet coûte environ 5× plus cher que Haiku. Une partie de 15 minutes tourne en général
                autour de quelques centimes de dollars.
            </p>
        </section>

        <div class="help-footer">
            Appuie sur <kbd>Esc</kbd>, clique hors de la carte, ou le ✕ pour fermer.
        </div>
    </div>`;
}
