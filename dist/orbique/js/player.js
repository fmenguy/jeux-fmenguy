// ============================================================
// PLAYER - Controls & input handling
// ============================================================

function onKeyDown(e) {
    if (!STATE.started) return;

    const k = getKeys();
    const comboKeys = getComboKeys();

    // Unlock mode
    if (STATE.unlockMode) {
        if (e.key === 'Escape') {
            closeUnlockMode();
            return;
        }
        const key = e.key.toUpperCase();
        if (comboKeys.includes(key)) {
            STATE.comboInput += key;
            document.getElementById('comboDisplay').textContent = STATE.comboInput;
            if (STATE.comboInput.length >= 4) {
                checkCombo();
            }
        }
        return;
    }

    const invertH = STATE.controlsInverted.horizontal;
    const invertV = STATE.controlsInverted.vertical;
    const key = e.key.toLowerCase();

    if (key === k.forward) { invertV ? (moveBackward = true) : (moveForward = true); }
    else if (key === k.backward) { invertV ? (moveForward = true) : (moveBackward = true); }
    else if (key === k.left) { invertH ? (moveRight = true) : (moveLeft = true); }
    else if (key === k.right) { invertH ? (moveLeft = true) : (moveRight = true); }
    else if (key === 'u') { if (!STATE.tutorialActive) openUnlockMode(); }
    else if (key === 'e') { interact(); }
    else if (key === 'm') { toggleMap(); }
    else if (key === 'tab') { e.preventDefault(); toggleInventoryDetail(); }
}

function onKeyUp(e) {
    if (STATE.unlockMode) return;

    const k = getKeys();
    const invertH = STATE.controlsInverted.horizontal;
    const invertV = STATE.controlsInverted.vertical;
    const key = e.key.toLowerCase();

    if (key === k.forward) { invertV ? (moveBackward = false) : (moveForward = false); }
    else if (key === k.backward) { invertV ? (moveForward = false) : (moveBackward = false); }
    else if (key === k.left) { invertH ? (moveRight = false) : (moveLeft = false); }
    else if (key === k.right) { invertH ? (moveLeft = false) : (moveRight = false); }
}

let _totalMouseMove = 0;
function onMouseMove(e) {
    if (!isPointerLocked || STATE.unlockMode) return;

    // Tutorial: track mouse look
    if (STATE.tutorialActive && STATE.tutorialStep === 0) {
        _totalMouseMove += Math.abs(e.movementX) + Math.abs(e.movementY);
        if (_totalMouseMove > 300) {
            STATE._tutoLooked = true;
        }
    }

    const sensitivity = 0.002;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= e.movementX * sensitivity;
    euler.x -= e.movementY * sensitivity;
    euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x));
    camera.quaternion.setFromEuler(euler);
}

// Unified mouse handler
function onMouseDown(e) {
    if (!STATE.started) return;

    if (!isPointerLocked) {
        renderer.domElement.requestPointerLock();
        return;
    }

    if (e.button === 0) {
        // Left click - interact
        interact();
    } else if (e.button === 2) {
        // Right click - pick up / throw
        e.preventDefault();
        dbg('rightClick, carrying:', !!STATE.carriedObject, 'pickables:', pickables.length);

        if (STATE.carriedObject) {
            throwObject();
        } else {
            tryPickUp();
        }
    }
}

function tryPickUp() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Check pickables
    const pickHits = raycaster.intersectObjects(pickables);
    dbg('tryPickUp: pickables hits:', pickHits.length, pickHits.length > 0 ? 'dist:' + pickHits[0].distance.toFixed(1) : '');

    if (pickHits.length > 0 && pickHits[0].distance < 5) {
        const obj = pickHits[0].object;
        pickables = pickables.filter(p => p !== obj);
        pickUpObject(obj);

        if (STATE.tutorialActive && STATE.tutorialStep === 1) {
            setTimeout(() => advanceTutorial(), 500);
        }
        return;
    }

    // Also check all world objects that are pickable (broader search)
    const allPickable = worldObjects.filter(o => o.userData && o.userData.pickable && o.isMesh);
    const allHits = raycaster.intersectObjects(allPickable);
    dbg('tryPickUp: broader search hits:', allHits.length, allHits.length > 0 ? 'dist:' + allHits[0].distance.toFixed(1) : '');

    if (allHits.length > 0 && allHits[0].distance < 5) {
        const obj = allHits[0].object;
        pickables = pickables.filter(p => p !== obj);
        worldObjects = worldObjects.filter(w => w !== obj);
        pickUpObject(obj);

        if (STATE.tutorialActive && STATE.tutorialStep === 1) {
            setTimeout(() => advanceTutorial(), 500);
        }
    }
}

function onPointerLockChange() {
    const wasLocked = isPointerLocked;
    isPointerLocked = document.pointerLockElement === renderer.domElement;
    dbg('pointerLockChange:', wasLocked, '->', isPointerLocked, 'element:', document.pointerLockElement);
    if (STATE.started && !isPointerLocked) {
        notify(t('clickToResume'));
    }
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- INTERACTION HINT ---
function updateInteractHint() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Check pickables
    const pickHits = raycaster.intersectObjects(pickables);
    if (pickHits.length > 0 && pickHits[0].distance < 5) {
        showInteractHint(t('hintPickup'));
        return;
    }

    // Check interactables
    const allTargets = [...interactables];
    const hits = raycaster.intersectObjects(allTargets);
    if (hits.length > 0 && hits[0].distance < 5) {
        const data = hits[0].object.userData;
        if (data.pickable) {
            showInteractHint(t('hintPickup'));
        } else if (data.type === 'portal' || data.type === 'door') {
            showInteractHint(t('hintActivate'));
        } else if (data.type === 'chest') {
            showInteractHint(t('hintChest'));
        } else if (data.type === 'button') {
            showInteractHint(t('hintPress'));
        } else {
            hideInteractHint();
        }
        return;
    }

    if (STATE.carriedObject) {
        // No hint needed, carry indicator is shown
    }

    hideInteractHint();
}

// --- INTERACTION (left click / E) ---
function interact() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const hits = raycaster.intersectObjects(interactables);
    if (hits.length === 0 || hits[0].distance > 5) return;

    const obj = hits[0].object;
    const data = obj.userData;

    switch(data.type) {
        case 'portal':
            if (isTutorialBlocking(data.target)) return;
            loadRoom(data.target);
            notify(data.label);
            break;

        case 'door':
            if (data.locked) {
                if (STATE.inventory.keys > 0) {
                    STATE.inventory.keys--;
                    STATE.doorsUnlocked.push(data.doorIndex);
                    data.locked = false;
                    notify(t('doorUnlocked', data.doorIndex));
                    loadRoom('room_doors');
                } else {
                    notify(t('doorLocked'));
                }
            } else {
                loadRoom(data.roomTarget);
                notify(t('room', data.doorIndex));
            }
            break;

        case 'chest':
            if (data.opened) {
                notify(t('chestAlready'));
            } else {
                notify(t('chestPrompt'));
                STATE.currentChest = data;
            }
            break;

        case 'key':
            STATE.inventory.keys++;
            STATE.doorsUnlocked.push(data.unlocksRoom);
            scene.remove(obj);
            interactables = interactables.filter(i => i !== obj);
            notify(t('keyCollected', data.label));
            break;

        case 'plan':
            if (!STATE.inventory.plans.includes(data.planId)) {
                STATE.inventory.plans.push(data.planId);
                scene.remove(obj);
                interactables = interactables.filter(i => i !== obj);
                notify(t('planCollected', data.planId, STATE.totalPlans));
                if (STATE.inventory.plans.length >= STATE.totalPlans) {
                    notify(t('allPlans'));
                }
            }
            break;

        case 'orb':
            STATE.inventory.orbs[data.orbId] = true;
            scene.remove(obj);
            interactables = interactables.filter(i => i !== obj);
            notify(t('orbCollected', data.label));
            updateOrbDisplay();

            const orbCount = Object.values(STATE.inventory.orbs).filter(v => v).length;
            if (orbCount >= 4) {
                setTimeout(() => loadRoom('orb_chamber'), 2000);
            }
            break;

        case 'button':
            if (data.onPress) data.onPress(obj);
            break;

        case 'sign':
            notify(data.label);
            break;
    }

    updateHUD();

    // Tutorial: detect button press (step 4)
    if (STATE.tutorialActive && STATE.tutorialStep === 4 && data.type === 'button') {
        setTimeout(() => advanceTutorial(), 500);
    }
}

// --- NON-EUCLIDEAN MECHANICS ---
function checkNonEuclidean() {
    if (currentRoom !== 'corridor_infinite') return;

    if (moveBackward && !moveForward) {
        if (STATE.lastDirection !== 'backward') {
            STATE.lastDirection = 'backward';
            STATE.worldSeed++;
            if (Math.random() > 0.5) {
                const z = camera.position.z + 5;
                const side = Math.random() > 0.5 ? 3 : -3;
                addBox(2, 3, 0.3, side, 1.5, z, 0x442244, {
                    type: 'portal',
                    target: Math.random() > 0.5 ? 'hub' : `puzzle_${Math.ceil(Math.random()*10)}`,
                    label: t('secretPassage')
                });
            }
        }
    } else if (moveForward) {
        STATE.lastDirection = 'forward';
    }
}

// --- PROXIMITY ---
function checkProximity() {
    for (const obj of interactables) {
        const dist = camera.position.distanceTo(obj.position);
        if (dist < 2) {
            if (obj.userData.type === 'portal' && !STATE.portalCooldown) {
                if (isTutorialBlocking(obj.userData.target)) continue;
                STATE.portalCooldown = true;
                loadRoom(obj.userData.target);
                notify(obj.userData.label);
                setTimeout(() => STATE.portalCooldown = false, 1000);
                break;
            }
        }
        if (obj.material && dist < 5) {
            obj.material.emissive = new THREE.Color(0x222222);
            obj.material.emissiveIntensity = Math.max(0, 1 - dist/5);
        }
    }
}
