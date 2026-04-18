// ============================================================
// UI - HUD, notifications, map, particles
// ============================================================

// --- PARTICLES ---
function spawnParticles(containerId, count) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 15 + 's';
        p.style.animationDuration = (10 + Math.random() * 10) + 's';
        p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
        container.appendChild(p);
    }
}

// Init particles on load
spawnParticles('particles', 30);
spawnParticles('menuParticles', 30);

// --- HUD ---
function updateHUD() {
    document.getElementById('hudPlans').textContent =
        `${t('plans')}: ${STATE.inventory.plans.length}/${STATE.totalPlans}`;
    document.getElementById('hudKeys').textContent =
        `${t('keys')}: ${STATE.inventory.keys}`;
    document.getElementById('hudOrbs').textContent =
        `${t('orbs')}: ${Object.values(STATE.inventory.orbs).filter(v=>v).length}/4`;
    document.getElementById('hudRoom').textContent =
        `${t('zone')}: ${STATE.currentZone}`;

    if (STATE.controlsInverted.horizontal || STATE.controlsInverted.vertical) {
        document.getElementById('hudRoom').textContent += ` [${t('inverted')}]`;
    }
}

// --- NOTIFICATIONS ---
let notifyTimeout;
function notify(msg) {
    const el = document.getElementById('notification');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(notifyTimeout);
    notifyTimeout = setTimeout(() => el.classList.remove('show'), 3000);
}

// --- INTERACTION HINT ---
function showInteractHint(msg) {
    const el = document.getElementById('interactHint');
    el.textContent = msg;
    el.classList.add('show');
}

function hideInteractHint() {
    document.getElementById('interactHint').classList.remove('show');
}

// --- CARRY INDICATOR ---
function showCarryIndicator(msg) {
    const el = document.getElementById('carryIndicator');
    el.textContent = msg;
    el.classList.add('show');
}

function hideCarryIndicator() {
    document.getElementById('carryIndicator').classList.remove('show');
}

// --- MAP ---
function toggleMap() {
    const overlay = document.getElementById('mapOverlay');
    if (overlay.style.display === 'flex') {
        overlay.style.display = 'none';
        renderer.domElement.requestPointerLock();
    } else {
        overlay.style.display = 'flex';
        document.exitPointerLock();
        drawMap();
    }
}

function drawMap() {
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 600, 600);

    const cx = 300, cy = 300;

    // Hub
    ctx.strokeStyle = STATE.currentZone === 'hub' ? '#fff' : '#333';
    ctx.strokeRect(cx - 20, cy - 20, 40, 40);
    ctx.fillStyle = '#555';
    ctx.font = '10px "Space Grotesk", monospace';
    ctx.fillText(t('hub'), cx - 10, cy + 4);

    // Door room
    ctx.strokeStyle = '#333';
    ctx.strokeRect(cx - 15, cy - 80, 30, 20);
    ctx.fillText(t('doors'), cx - 18, cy - 66);
    ctx.beginPath(); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 60);
    ctx.strokeStyle = '#222'; ctx.stroke();

    // Corridor
    ctx.strokeRect(cx - 100, cy - 10, 30, 20);
    ctx.fillText('∞', cx - 90, cy + 5);
    ctx.beginPath(); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 70, cy);
    ctx.stroke();

    // Labyrinth
    if (STATE.inventory.plans.length >= STATE.totalPlans) {
        ctx.strokeStyle = '#553300';
        ctx.strokeRect(cx + 70, cy - 10, 30, 20);
        ctx.fillText(t('laby'), cx + 72, cy + 5);
        ctx.beginPath(); ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + 70, cy);
        ctx.stroke();
    }

    // Puzzle rooms
    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 - Math.PI/2;
        const r = 150;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        const completed = STATE.roomsCompleted.includes(`puzzle_${i+1}`);
        ctx.strokeStyle = completed ? '#22c55e' :
            STATE.doorsUnlocked.includes(i+1) || i === 0 ? '#444' : '#200';
        ctx.strokeRect(x - 12, y - 12, 24, 24);
        ctx.fillStyle = completed ? '#22c55e' : '#555';
        ctx.fillText(`${i+1}`, x - 4, y + 4);
    }

    // Stats
    ctx.fillStyle = '#888';
    ctx.font = '14px "Space Grotesk", monospace';
    ctx.fillText(`${t('plans')}: ${STATE.inventory.plans.length}/${STATE.totalPlans}`, 20, 30);
    ctx.fillText(`${t('keys')}: ${STATE.inventory.keys}`, 20, 50);
    ctx.fillText(`${t('orbs')}: ${Object.values(STATE.inventory.orbs).filter(v=>v).length}/4`, 20, 70);
    ctx.fillText(t('closeMap'), 200, 580);
}
