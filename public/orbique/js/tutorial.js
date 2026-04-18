// ============================================================
// TUTORIAL - Progressive tutorial system
// ============================================================

// Steps:
// 0: Move + look around
// 1: Pick up a cube (right click)
// 2: Throw it (right click again)
// 3: Place 3 cubes on the slots to open barrier (no text hint - player discovers)
// 4: Press the button (left click)
// 5: Walk through portal

const TUTORIAL_STEPS = 6;
let tutoArrows = [];
let tutoCheckInterval = null;

function startTutorial() {
    STATE.tutorialActive = true;
    STATE.tutorialStep = 0;
    STATE._tutoMoved = false;
    STATE._tutoLooked = false;

    showTutorialStep(0);

    if (tutoCheckInterval) clearInterval(tutoCheckInterval);
    tutoCheckInterval = setInterval(checkTutorialProgress, 300);
}

function showTutorialStep(step) {
    const overlay = document.getElementById('tutorialOverlay');
    const msgEl = document.getElementById('tutoMessage');
    const progressEl = document.getElementById('tutoProgress');
    const progressBar = document.getElementById('tutoProgressBar');

    const k = getKeys();
    const keyDisplay = LANG.layout === 'azerty' ? 'Z Q S D' : 'W A S D';

    let icon = '';
    let msg = '';
    switch (step) {
        case 0:
            icon = '&#x1F3AE;';
            msg = t('tutoStep0', keyDisplay);
            break;
        case 1:
            icon = '&#x1F4E6;';
            msg = t('tutoStep1');
            break;
        case 2:
            icon = '&#x1F4A8;';
            msg = t('tutoStep2');
            break;
        case 3:
            icon = '&#x1F9E9;';
            msg = t('tutoStep3');
            break;
        case 4:
            icon = '&#x1F534;';
            msg = t('tutoStep4');
            break;
        case 5:
            icon = '&#x1F6AA;';
            msg = t('tutoStep5');
            break;
    }

    msgEl.innerHTML = `<span class="tuto-step-icon">${icon}</span>${msg}`;
    progressEl.textContent = t('tutoProgress', step + 1, TUTORIAL_STEPS);
    progressBar.style.width = ((step + 1) / TUTORIAL_STEPS * 100) + '%';

    overlay.classList.add('show');

    clearTutoArrows();
    createTutoArrows(step);
}

function createTutoArrows(step) {
    switch (step) {
        case 1:
        case 2:
            // Arrows above pickable cubes
            for (const cube of pickables) {
                tutoArrows.push(createArrowAbove(cube.position, 0x3b82f6));
            }
            break;
        case 3:
            // Arrows above the slot positions
            for (const slot of STATE.tutoPillarSlots) {
                tutoArrows.push(createArrowAbove(
                    new THREE.Vector3(slot.x, 0, slot.z), 0x44aaff
                ));
            }
            break;
        case 4:
            // Arrow above button
            const btn = interactables.find(o => o.userData && o.userData.type === 'button');
            if (btn) tutoArrows.push(createArrowAbove(btn.position, 0x44aaff));
            break;
        case 5:
            // Arrow above portal
            const portal = interactables.find(o => o.userData && o.userData.type === 'portal');
            if (portal) tutoArrows.push(createArrowAbove(portal.position, 0x22cc44));
            break;
    }
}

function createArrowAbove(position, color) {
    const geo = new THREE.ConeGeometry(0.2, 0.5, 8);
    const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.85
    });
    const arrow = new THREE.Mesh(geo, mat);
    arrow.position.set(position.x, position.y + 2, position.z);
    arrow.rotation.x = Math.PI;
    arrow.userData._tutoArrow = true;
    arrow.userData._baseY = position.y + 2;
    arrow.userData._time = Math.random() * Math.PI * 2;
    scene.add(arrow);
    worldObjects.push(arrow);
    return arrow;
}

function clearTutoArrows() {
    for (const arrow of tutoArrows) {
        scene.remove(arrow);
        worldObjects = worldObjects.filter(o => o !== arrow);
    }
    tutoArrows = [];
}

function updateTutoArrows() {
    for (const arrow of tutoArrows) {
        arrow.userData._time += 0.03;
        arrow.position.y = arrow.userData._baseY + Math.sin(arrow.userData._time) * 0.3;
        arrow.rotation.y += 0.02;
    }
}

function checkTutorialProgress() {
    if (!STATE.tutorialActive) {
        clearInterval(tutoCheckInterval);
        return;
    }

    switch (STATE.tutorialStep) {
        case 0:
            if (STATE._tutoMoved && STATE._tutoLooked) {
                advanceTutorial();
            }
            break;
        case 3:
            // Barrier puzzle checked in main loop via checkTutoPillarPuzzle
            if (STATE.tutoBarrierOpen) {
                advanceTutorial();
            }
            break;
    }
}

function advanceTutorial() {
    STATE.tutorialStep++;
    dbg('Tutorial step:', STATE.tutorialStep);

    if (STATE.tutorialStep >= TUTORIAL_STEPS) {
        endTutorial();
        return;
    }

    showTutorialStep(STATE.tutorialStep);
}

function endTutorial() {
    STATE.tutorialActive = false;
    STATE.tutorialCompleted = true;

    clearTutoArrows();
    if (tutoCheckInterval) clearInterval(tutoCheckInterval);

    document.getElementById('tutorialOverlay').classList.remove('show');
    dbg('Tutorial completed');
}

function isTutorialBlocking(target) {
    if (!STATE.tutorialActive || currentRoom !== 'tutorial') return false;

    // Step 5: player is allowed to go through the portal to hub
    if (STATE.tutorialStep >= 5 && target === 'hub') {
        endTutorial();
        return false;
    }

    notify(t('tutoMustComplete'));
    return true;
}
