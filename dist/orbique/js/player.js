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
    else if (key === ' ') {
        e.preventDefault();
        if (STATE.canJump && !isJumping && Math.abs(camera.position.y - GROUND_Y) < 0.01) {
            isJumping = true;
            jumpVelY = 9;
        }
    }
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
        // Si le joueur a la clef de sauvegarde OU est en mode debug : ouvrir menu save
        if ((STATE.canSave || STATE.debugMode) && typeof openSaveMenu === 'function') {
            openSaveMenu();
        } else {
            notify(t('clickToResume'));
        }
    } else if (STATE.started && isPointerLocked) {
        // Re-locked : fermer le menu save si ouvert
        if (typeof closeSaveMenu === 'function') closeSaveMenu();
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

        case 'saveKey':
            STATE.canSave = true;
            STATE.saveKeyClaimed = true;
            scene.remove(obj);
            interactables = interactables.filter(i => i !== obj);
            notify(t('saveKeyTaken') || 'Clef de sauvegarde obtenue ! Appuie sur ÉCHAP pour sauvegarder.');
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
    // Corridor : comportement existant + memorisation de la decouverte
    if (currentRoom === 'corridor_infinite') {
        if (moveBackward && !moveForward) {
            if (STATE.lastDirection !== 'backward') {
                STATE.lastDirection = 'backward';
                STATE.worldSeed++;
                STATE.backwardDiscovered = true; // mecanique decouverte
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
        return;
    }

    // Hub : reveler les portails colores vers les puzzles deja visites
    if (currentRoom === 'hub' && STATE.backwardDiscovered && !STATE.hubColorsRevealed) {
        if (moveBackward && !moveForward) {
            if (STATE.lastDirection !== 'backward') {
                STATE.lastDirection = 'backward';
                revealHubColors();
            }
        } else if (moveForward) {
            STATE.lastDirection = 'forward';
        }
    }
}

// --- PUITS SANS FOND : detection chute (joueur + cubes) ---
// Cherche aussi dans worldObjects au cas ou le push interactables aurait foire.
function checkWells() {
    const wells = [];
    for (const obj of interactables) {
        if (obj.userData && obj.userData.type === 'well') wells.push(obj);
    }
    // Fallback : si rien trouve dans interactables, scan worldObjects
    if (wells.length === 0) {
        for (const obj of worldObjects) {
            if (obj.userData && obj.userData.type === 'well') wells.push(obj);
        }
    }
    if (wells.length === 0) return;

    // 1. Chute du joueur : il faut SAUTER au-dessus du puit pour y tomber
    // (le puit a une "surface invisible" en surface, seul un saut au-dessus revele le vide)
    const inAir = isJumping || camera.position.y > GROUND_Y + 0.05;
    const px = camera.position.x;
    const pz = camera.position.z;
    for (const well of wells) {
        const dx = px - well.position.x;
        const dz = pz - well.position.z;
        const planar = Math.sqrt(dx * dx + dz * dz);
        if (planar < 1.1 && inAir) {
            const spawn = STATE.spawnPosition || { x: 0, y: 2, z: 0 };
            camera.position.set(spawn.x, spawn.y, spawn.z);
            isJumping = false; jumpVelY = 0;
            const wasFirst = !STATE.fellInWell;
            STATE.fellInWell = true;
            notify(wasFirst
                ? (t('firstFall') || 'Tu es tombé dans le puits sans fond... et tu réapparais.')
                : (t('fallAgain') || 'Encore tombé.'));
            return;
        }
    }

    // 2. Chute des cubes : respawn a leur origine
    for (const cube of pickables) {
        if (cube === STATE.carriedObject) continue;
        for (const well of wells) {
            const dx = cube.position.x - well.position.x;
            const dz = cube.position.z - well.position.z;
            if (Math.sqrt(dx * dx + dz * dz) < 1.0) {
                const origin = cube.userData && cube.userData.originPos;
                if (origin) {
                    cube.position.set(origin.x, origin.y, origin.z);
                    cube.rotation.set(0, 0, 0);
                }
                break;
            }
        }
    }
}

// --- NOTES MURALES INTERACTIVES (button_room) ---
function checkWallNotes() {
    if (currentRoom !== 'button_room') return;
    if (!STATE.notesActivated) STATE.notesActivated = {};

    for (const obj of worldObjects) {
        if (!obj.userData || obj.userData.type !== 'wallNote') continue;
        const id = obj.userData.noteId;
        if (!id) continue;
        const dist = camera.position.distanceTo(obj.position);

        // 1. JUMP NOTE : "Si tu lis ceci, tu devrais avancer." -- recule devant pour debloquer le saut
        if (id === 'jumpNote' && !STATE.canJump) {
            if (dist < 4 && moveBackward && !moveForward) {
                STATE.canJump = true;
                notify('SAUT débloqué ! Appuie sur ESPACE pour sauter.');
            }
        }

        // 2. WALL SECRET : "Les murs ne mentent jamais. Sauf celui-là." -- coller au mur fait apparaitre une clef
        if (id === 'wallSecret' && !STATE.notesActivated.wallSecret) {
            // Le mur est en x=-10.8, on detecte la proximite reelle au mur (distance X courte)
            if (camera.position.x < -9.5 && dist < 3.5) {
                STATE.notesActivated.wallSecret = true;
                // Spawn une clef contre le mur, juste devant la note
                const keyGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
                const keyMat = new THREE.MeshStandardMaterial({
                    color: 0xaa44ff, emissive: 0xaa44ff, emissiveIntensity: 0.8
                });
                const key = new THREE.Mesh(keyGeo, keyMat);
                key.position.set(-9.8, 0.5, 0);
                key.userData = { type: 'key', label: 'Clef secrète du mur', unlocksRoom: 0 };
                scene.add(key);
                worldObjects.push(key);
                interactables.push(key);
                const lt = new THREE.PointLight(0xaa44ff, 1.4, 5);
                lt.position.set(-9.8, 1.3, 0);
                scene.add(lt); worldObjects.push(lt);
                notify("Le mur n'a pas menti. Quelque chose apparaît.");
            }
        }

        // 3. INVERT NOTE : "Si tu vois ce texte à l'envers : c'est normal." -- proximite inverse les controles V
        if (id === 'invertNote' && !STATE.notesActivated.invertNote) {
            if (dist < 2.5) {
                STATE.notesActivated.invertNote = true;
                STATE.controlsInverted.vertical = true;
                notify("Approche déstabilisante. Vertical inversé 5s.");
                setTimeout(() => {
                    STATE.controlsInverted.vertical = false;
                    STATE.notesActivated.invertNote = false;
                    notify("Vertical restauré.");
                }, 5000);
            }
        }
    }
}

// --- SALLE DES BOUTONS : effets temporaires + timer de proximite ---
function onSillyButton(action, obj) {
    if (!STATE.buttonRoom) STATE.buttonRoom = {};
    switch (action) {
        case 'pressMe': {
            STATE.buttonRoom.pressMeCount = (STATE.buttonRoom.pressMeCount || 0) + 1;
            const c = STATE.buttonRoom.pressMeCount;
            if (c < 7) {
                notify((t('pressMeProgress') || 'Encore...') + ' (' + c + '/7)');
            } else if (c === 7) {
                notify(t('pressMeReward') || 'OK ça suffit. Voilà une clef.');
                STATE.inventory.keys = (STATE.inventory.keys || 0) + 1;
                if (typeof updateHUD === 'function') updateHUD();
                // change la couleur du bouton pour signaler accomplissement
                if (obj && obj.material) obj.material.color.set(0x44ff44);
            } else {
                notify(t('pressMeEnough') || 'Tu insistes pour rien.');
            }
            break;
        }
        case 'dontPress': {
            // 1ere pression : retour au tutoriel. 2eme et + : message moqueur.
            STATE.buttonRoom.dontPressCount = (STATE.buttonRoom.dontPressCount || 0) + 1;
            if (STATE.buttonRoom.dontPressCount === 1) {
                notify(t('dontPressFirst') || 'Tu n\'as pas écouté. Retour au tutoriel.');
                setTimeout(() => loadRoom('tutorial'), 800);
            } else {
                notify(t('dontPressFail') || 'Tu vois, je t\'avais dit de ne pas appuyer.');
            }
            STATE.buttonRoom.dontPressTimer = 0;
            STATE.buttonRoom.dontPressRewarded = false;
            break;
        }
        case 'invertY': {
            STATE.controlsInverted.vertical = !STATE.controlsInverted.vertical;
            notify(t('invertVOn') || 'Vertical inversé pendant 8 secondes.');
            setTimeout(() => {
                STATE.controlsInverted.vertical = !STATE.controlsInverted.vertical;
                notify(t('invertVOff') || 'Vertical restauré.');
            }, 8000);
            break;
        }
        case 'teleport': {
            const dx = (Math.random() - 0.5) * 10;
            const dz = (Math.random() - 0.5) * 10;
            camera.position.x = Math.max(-9, Math.min(9, camera.position.x + dx));
            camera.position.z = Math.max(-9, Math.min(9, camera.position.z + dz));
            notify(t('teleported') || 'Pouf.');
            break;
        }
        case 'zoom': {
            const baseFov = camera.fov;
            let t0 = 0;
            const interval = setInterval(() => {
                t0 += 0.1;
                camera.fov = baseFov + Math.sin(t0 * 4) * 25;
                camera.updateProjectionMatrix();
                if (t0 > 5) {
                    clearInterval(interval);
                    camera.fov = baseFov;
                    camera.updateProjectionMatrix();
                }
            }, 100);
            notify(t('zoomEffect') || 'La perspective vacille...');
            break;
        }
        case 'aboutFace': {
            // Tourne le joueur de 180 degres (yaw)
            euler.y += Math.PI;
            camera.quaternion.setFromEuler(euler);
            notify(t('aboutFaceMsg') || 'Demi-tour.');
            break;
        }
        case 'hidden': {
            // Le bouton cache est le seul qui donne une vraie recompense
            notify(t('hiddenFound') || 'Tu as trouvé le seul bouton honnête.');
            STATE.inventory.keys = (STATE.inventory.keys || 0) + 1;
            if (typeof updateHUD === 'function') updateHUD();
            if (obj && obj.material) {
                obj.material.color.set(0xffffff);
                obj.material.emissive = new THREE.Color(0xffffff);
                obj.material.emissiveIntensity = 1.0;
            }
            break;
        }
    }
}

// --- SALLE DES CUBES : detection de touche sur la cible ---
function checkCubeTarget() {
    if (currentRoom !== 'cube_room') return;
    let target = null;
    for (const obj of interactables) {
        if (obj.userData && obj.userData.type === 'cubeTarget') { target = obj; break; }
    }
    if (!target || target.userData.destroyed) return;

    // Trouver tous les cubes pickables non portes a proximite de la cible
    const targetPos = target.position;
    for (const cube of pickables) {
        if (cube === STATE.carriedObject) continue;
        const d = cube.position.distanceTo(targetPos);
        if (d < 1.4 && !cube.userData._hitTarget) {
            cube.userData._hitTarget = true;
            target.userData.hits = (target.userData.hits || 0) + 1;
            // Effet visuel
            if (target.material) {
                target.material.color.set(0xffaa00);
                setTimeout(() => {
                    if (target.material && !target.userData.destroyed) target.material.color.set(0xff2222);
                }, 200);
            }
            const remaining = target.userData.required - target.userData.hits;
            if (target.userData.hits >= target.userData.required) {
                target.userData.destroyed = true;
                if (target.material) {
                    target.material.color.set(0x44ff44);
                    target.material.emissive = new THREE.Color(0x44ff44);
                }
                notify(t('cubeTargetDone') || 'Cible détruite ! Voilà une clef.');
                STATE.inventory.keys = (STATE.inventory.keys || 0) + 1;
                if (typeof updateHUD === 'function') updateHUD();
            } else {
                notify((t('cubeTargetHit') || 'Touché !') + ' ' + remaining + ' restants');
            }
        }
    }
}

// --- SALLE DES PESEES : detection de cubes sur les plaques ---
function checkWeightRoom() {
    if (currentRoom !== 'weight_room' || !STATE.weightRoom || STATE.weightRoom.solved) return;
    const plates = STATE.weightRoom.plates || [];
    if (plates.length === 0) return;

    let allCorrect = true;
    for (const plate of plates) {
        const wantColor = plate.userData.plateColor;
        // Cherche un cube non porte a +/- 1m sur la plaque (X/Z), Y ras du sol
        let found = null;
        for (const cube of pickables) {
            if (cube === STATE.carriedObject) continue;
            const dx = Math.abs(cube.position.x - plate.position.x);
            const dz = Math.abs(cube.position.z - plate.position.z);
            if (dx < 1.0 && dz < 1.0 && cube.position.y < 1.0) {
                if (cube.userData.cubeColor === wantColor) { found = cube; break; }
            }
        }
        const wasActive = plate.userData.active;
        plate.userData.active = !!found;
        if (plate.material) {
            plate.material.emissiveIntensity = found ? 0.8 : 0.15;
        }
        if (found && !wasActive) {
            notify(t('platePlaced') || 'Plaque activée.');
        }
        if (!found) allCorrect = false;
    }

    if (allCorrect) {
        STATE.weightRoom.solved = true;
        notify(t('weightSolved') || 'Toutes les plaques sont actives ! Une clef apparaît.');
        // Spawn une clef sur le pedestal
        const ped = STATE.weightRoom.pedestal;
        if (ped) {
            const keyGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
            const keyMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffcc44, emissiveIntensity: 0.6 });
            const key = new THREE.Mesh(keyGeo, keyMat);
            key.position.set(ped.position.x, ped.position.y + 0.7, ped.position.z);
            key.userData = { type: 'key', label: t('weightRoomKey') || 'Clef des Pesées', unlocksRoom: 0 };
            scene.add(key);
            worldObjects.push(key);
            interactables.push(key);
            // Lumiere sur la clef
            const lt = new THREE.PointLight(0xffcc44, 1.2, 6);
            lt.position.set(ped.position.x, ped.position.y + 1.5, ped.position.z);
            scene.add(lt);
            worldObjects.push(lt);
        }
    }
}

// --- TIMER DE PROXIMITE : recompense si on STAGNE pres du "NE PAS APPUYER" ---
function checkButtonRoomTimers(deltaSeconds) {
    if (currentRoom !== 'button_room' || !STATE.buttonRoom) return;
    if (STATE.buttonRoom.dontPressRewarded) return;

    // Trouver le bouton "dontPress" parmi les interactables
    let dontPressBtn = null;
    for (const obj of interactables) {
        if (obj.userData && obj.userData.action === 'dontPress') {
            dontPressBtn = obj; break;
        }
    }
    if (!dontPressBtn) return;
    const dist = camera.position.distanceTo(dontPressBtn.position);
    // Zone de "tentation" : entre 1.5 et 3 metres
    if (dist > 1.5 && dist < 3) {
        STATE.buttonRoom.dontPressTimer = (STATE.buttonRoom.dontPressTimer || 0) + deltaSeconds;
        if (STATE.buttonRoom.dontPressTimer > 5) {
            STATE.buttonRoom.dontPressRewarded = true;
            notify(t('dontPressReward') || 'Bravo, tu as résisté. Voilà une clef.');
            STATE.inventory.keys = (STATE.inventory.keys || 0) + 1;
            if (typeof updateHUD === 'function') updateHUD();
            // Eteindre/changer le bouton
            if (dontPressBtn.material) {
                dontPressBtn.material.color.set(0x44ff44);
                dontPressBtn.material.emissive = new THREE.Color(0x44ff44);
            }
        }
    } else {
        // Sortie de zone : reset doucement
        STATE.buttonRoom.dontPressTimer = Math.max(0, (STATE.buttonRoom.dontPressTimer || 0) - deltaSeconds * 2);
    }
}

// --- REVELATION HUB : portails colores vers puzzles visites ---
function revealHubColors() {
    // Recupere les puzzles deja visites (1 a 10)
    const visitedPuzzles = STATE.visitedRooms
        .filter(r => /^puzzle_\d+$/.test(r))
        .map(r => parseInt(r.split('_')[1], 10))
        .sort((a, b) => a - b);

    if (visitedPuzzles.length === 0) {
        notify(t('nothingRevealed') || 'Rien n\'apparaît... explore d\'abord les salles');
        STATE.hubColorsRevealed = true;
        return;
    }

    // Position : alignes au fond du hub (z positif), repartis sur l'axe X
    const totalWidth = Math.min(visitedPuzzles.length * 3, 18);
    const startX = -totalWidth / 2 + 1.5;

    visitedPuzzles.forEach((num, i) => {
        const themeName = ROOM_THEMES[`puzzle_${num}`]?.name || 'training';
        const color = getGlowColor(themeName);
        const x = startX + i * (totalWidth / Math.max(visitedPuzzles.length, 1));

        // Cube portail principal
        const portal = addBox(1.4, 2.4, 0.4, x, 1.5, 13, color, {
            type: 'portal',
            target: `puzzle_${num}`,
            label: (t('colorPortal') || 'Passage coloré') + ' #' + num
        });
        if (portal && portal.material) {
            portal.material.emissive = new THREE.Color(color);
            portal.material.emissiveIntensity = 0.7;
        }

        // Lumiere ponctuelle au-dessus pour le glow
        const light = new THREE.PointLight(color, 1.2, 8);
        light.position.set(x, 3.5, 13);
        scene.add(light);
        worldObjects.push(light);
    });

    STATE.hubColorsRevealed = true;
    notify(t('colorsRevealed') || 'Des couleurs s\'illuminent au fond...');
}

// --- PROXIMITY (juste le glow visuel, plus de trigger automatique des portails) ---
// Les portails s'activent uniquement par CLIC (interact() / E), pas par contact.
function checkProximity() {
    for (const obj of interactables) {
        if (!obj.material) continue;
        const dist = camera.position.distanceTo(obj.position);
        if (dist < 5) {
            obj.material.emissive = new THREE.Color(0x222222);
            obj.material.emissiveIntensity = Math.max(0, 1 - dist/5);
        }
    }
}
