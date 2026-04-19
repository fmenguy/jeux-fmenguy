// ============================================================
// ROOMS - Room content builders
// ============================================================

// --- TUTORIAL ---
// --- HELPER : 4 puits sans fond aux coins ---
// Cube tres sombre + lumiere bleutee au fond. Pas de rebord physique : on marche dedans.
function addCornerWells(room, marginInset = 1.5) {
    const hw = room.size.w / 2 - marginInset;
    const hd = room.size.d / 2 - marginInset;
    const corners = [[-hw,-hd],[hw,-hd],[-hw,hd],[hw,hd]];
    const wellSize = 1.6;
    for (const [x, z] of corners) {
        // Juste un carré noir au sol, rien d'autre. Pas de bord = on peut marcher dedans.
        addBox(wellSize, 0.05, wellSize, x, 0.025, z, 0x000000, {
            type: 'well'
        });
        // Lueur bleutée au fond du puit (suggère la profondeur)
        const glow = new THREE.PointLight(0x4488ff, 0.5, 3.5);
        glow.position.set(x, -1.5, z);
        scene.add(glow);
        worldObjects.push(glow);
    }
}

function buildTutorial() {
    const room = ROOMS.tutorial;
    const hw = room.size.w / 2;
    const hd = room.size.d / 2;

    // 4 puits sans fond aux coins (decouverte mecanique : il faut SAUTER au-dessus pour tomber)
    addCornerWells(room, 1.8);

    // Panneau d'indice pres d'un puit (coin sud-est) : il faut revenir une fois le saut debloque
    addBox(2.6, 0.05, 1.0, 8, 0.03, 8, 0x442211, {
        type: 'sign',
        label: 'Reviens ici quand tu sauras sauter pour découvrir le vide.'
    });

    // Soft ambient light
    const tutoAmbient = new THREE.AmbientLight(0xccccdd, 0.5);
    scene.add(tutoAmbient);
    worldObjects.push(tutoAmbient);

    const tutoLight1 = new THREE.PointLight(0xddddef, 0.5, 30);
    tutoLight1.position.set(0, 5.5, 0);
    scene.add(tutoLight1);
    worldObjects.push(tutoLight1);

    const tutoLight2 = new THREE.PointLight(0xddddef, 0.3, 25);
    tutoLight2.position.set(-6, 4, 3);
    scene.add(tutoLight2);
    worldObjects.push(tutoLight2);

    const tutoLight3 = new THREE.PointLight(0xddddef, 0.3, 25);
    tutoLight3.position.set(6, 4, 3);
    scene.add(tutoLight3);
    worldObjects.push(tutoLight3);

    // Light behind barrier for the button zone
    const behindLight = new THREE.PointLight(0x88aaff, 0.4, 15);
    behindLight.position.set(0, 4, -8);
    scene.add(behindLight);
    worldObjects.push(behindLight);

    // Blue grid on floor
    const gridHelper = new THREE.GridHelper(room.size.w, 24, 0x4488cc, 0x3366aa);
    gridHelper.position.y = 0.01;
    if (Array.isArray(gridHelper.material)) {
        gridHelper.material.forEach(m => { m.opacity = 0.25; m.transparent = true; });
    } else {
        gridHelper.material.opacity = 0.25;
        gridHelper.material.transparent = true;
    }
    scene.add(gridHelper);
    worldObjects.push(gridHelper);

    // Blue grid on walls
    addWallGrid(-hw, 0, room.size.d, room.size.h, 'x');
    addWallGrid(hw, 0, room.size.d, room.size.h, 'x');
    addWallGrid(0, -hd, room.size.w, room.size.h, 'z');
    addWallGrid(0, hd, room.size.w, room.size.h, 'z');

    // ==========================================
    // ZONE A (z > -2): Player start + 3 cubes
    // ZONE B (z < -2): Button + portal (behind barrier)
    // ==========================================

    // --- 3 PILLAR SLOTS (markers on the ground) ---
    const slotPositions = [
        { x: -2, z: -1 },
        { x:  0, z: -1 },
        { x:  2, z: -1 }
    ];
    STATE.tutoPillarSlots = slotPositions;
    STATE.tutoBarrierOpen = false;

    for (const slot of slotPositions) {
        // Glowing square on floor to mark placement
        const markerGeo = new THREE.PlaneGeometry(1, 1);
        const markerMat = new THREE.MeshStandardMaterial({
            color: 0x3366cc,
            emissive: 0x2244aa,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(slot.x, 0.02, slot.z);
        scene.add(marker);
        worldObjects.push(marker);

        // Small corner posts to frame the slot
        const postColor = 0x5588cc;
        const postH = 0.15;
        for (let cx = -1; cx <= 1; cx += 2) {
            for (let cz = -1; cz <= 1; cz += 2) {
                const postGeo = new THREE.BoxGeometry(0.06, postH, 0.06);
                const postMat = new THREE.MeshStandardMaterial({
                    color: postColor,
                    emissive: postColor,
                    emissiveIntensity: 0.3
                });
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(slot.x + cx * 0.45, postH / 2, slot.z + cz * 0.45);
                scene.add(post);
                worldObjects.push(post);
            }
        }
    }

    // --- 3 PICKABLE CUBES (scattered in zone A) ---
    const cubeColor = 0x3366cc;
    const cubePositions = [
        { x: -4, z: 5 },
        { x:  3, z: 7 },
        { x:  1, z: 3 }
    ];
    for (const pos of cubePositions) {
        const size = 0.8;
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshStandardMaterial({
            color: cubeColor,
            roughness: 0.4,
            metalness: 0.05
        });
        const cube = new THREE.Mesh(geo, mat);
        cube.position.set(pos.x, size / 2, pos.z);
        scene.add(cube);
        worldObjects.push(cube);
        cube.userData = {
            pickable: true,
            type: 'pickable',
            originPos: { x: pos.x, y: size / 2, z: pos.z } // pour respawn si tombe dans puit
        };
        pickables.push(cube);
    }

    // --- GRID BARRIER WALL (at z = -2) ---
    const barrierGroup = new THREE.Group();

    // Main semi-transparent grid plane
    const barrierGeo = new THREE.PlaneGeometry(room.size.w, room.size.h);
    const barrierMat = new THREE.MeshStandardMaterial({
        color: 0x88bbee,
        emissive: 0x4488cc,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    const barrierPlane = new THREE.Mesh(barrierGeo, barrierMat);
    barrierPlane.position.set(0, room.size.h / 2, -2.5);
    barrierGroup.add(barrierPlane);

    // Grid lines on the barrier
    const gridLineMat = new THREE.LineBasicMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.4
    });
    // Horizontal lines
    for (let y = 0; y <= room.size.h; y += 1) {
        const pts = [
            new THREE.Vector3(-hw, y, -2.5),
            new THREE.Vector3(hw, y, -2.5)
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(lineGeo, gridLineMat.clone());
        barrierGroup.add(line);
    }
    // Vertical lines
    for (let x = -hw; x <= hw; x += 1) {
        const pts = [
            new THREE.Vector3(x, 0, -2.5),
            new THREE.Vector3(x, room.size.h, -2.5)
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(lineGeo, gridLineMat.clone());
        barrierGroup.add(line);
    }

    scene.add(barrierGroup);
    worldObjects.push(barrierGroup);
    STATE.tutoBarrier = barrierGroup;

    // --- BUTTON (behind barrier, in zone B) ---
    const pedestalGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.8, 16);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.5 });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, 0.4, -8);
    scene.add(pedestal);
    worldObjects.push(pedestal);

    const btnGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
    const btnMat = new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        emissive: 0x2266cc,
        emissiveIntensity: 0.5,
        roughness: 0.2
    });
    const btn = new THREE.Mesh(btnGeo, btnMat);
    btn.position.set(0, 0.88, -8);
    scene.add(btn);
    worldObjects.push(btn);
    btn.userData = {
        type: 'button',
        label: t('tutoButton'),
        onPress: (obj) => {
            obj.material.emissive = new THREE.Color(0x22cc44);
            obj.material.emissiveIntensity = 1;
            notify(t('tutoButtonPressed'));

            // Open exit portal on back wall
            setTimeout(() => {
                const portalGeo = new THREE.BoxGeometry(3, 4, 0.3);
                const portalMat = new THREE.MeshStandardMaterial({
                    color: 0x2255aa,
                    emissive: 0x1133aa,
                    emissiveIntensity: 0.8,
                    transparent: true,
                    opacity: 0.7
                });
                const portal = new THREE.Mesh(portalGeo, portalMat);
                portal.position.set(0, 2, -hd + 0.2);
                scene.add(portal);
                worldObjects.push(portal);
                portal.userData = {
                    type: 'portal',
                    target: 'hub',
                    label: t('tutoComplete')
                };
                interactables.push(portal);

                const portalLight = new THREE.PointLight(0x4488ff, 0.8, 10);
                portalLight.position.set(0, 2, -hd + 1);
                scene.add(portalLight);
                worldObjects.push(portalLight);
            }, 500);
        }
    };
    interactables.push(btn);

    // Si tutoriel deja termine OU mode debug : ouvrir la barriere et placer le portail de sortie
    if (STATE.tutorialCompleted || STATE.debugMode) {
        STATE.tutoBarrierOpen = true;
        if (STATE.tutoBarrier) {
            // Cacher la barriere visuellement
            STATE.tutoBarrier.visible = false;
        }
        // Spawn portail de sortie immediatement
        const portalGeo = new THREE.BoxGeometry(3, 4, 0.3);
        const portalMat = new THREE.MeshStandardMaterial({
            color: 0x2255aa, emissive: 0x1133aa, emissiveIntensity: 0.8,
            transparent: true, opacity: 0.7
        });
        const portal = new THREE.Mesh(portalGeo, portalMat);
        portal.position.set(0, 2, -hd + 0.2);
        scene.add(portal);
        worldObjects.push(portal);
        portal.userData = { type: 'portal', target: 'hub', label: 'Retour au hub' };
        interactables.push(portal);
        const portalLight = new THREE.PointLight(0x4488ff, 0.8, 10);
        portalLight.position.set(0, 2, -hd + 1);
        scene.add(portalLight);
        worldObjects.push(portalLight);
    }

    // Position camera in zone A
    camera.position.set(0, 2, 9);
}

function addWallGrid(offset, otherOffset, width, height, axis) {
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.15
    });

    const halfW = width / 2;
    const step = 1;

    for (let y = 0; y <= height; y += step) {
        const points = [];
        if (axis === 'x') {
            points.push(new THREE.Vector3(offset, y, -halfW));
            points.push(new THREE.Vector3(offset, y, halfW));
        } else {
            points.push(new THREE.Vector3(-halfW, y, offset));
            points.push(new THREE.Vector3(halfW, y, offset));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, lineMat);
        scene.add(line);
        worldObjects.push(line);
    }

    for (let i = -halfW; i <= halfW; i += step) {
        const points = [];
        if (axis === 'x') {
            points.push(new THREE.Vector3(offset, 0, i));
            points.push(new THREE.Vector3(offset, height, i));
        } else {
            points.push(new THREE.Vector3(i, 0, offset));
            points.push(new THREE.Vector3(i, height, offset));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, lineMat);
        scene.add(line);
        worldObjects.push(line);
    }
}

// --- HUB ---
function buildHub() {
    addBox(3, 4, 0.3, 0, 2, -13, 0x333333, {
        type: 'portal', target: 'room_doors',
        label: t('doorRoom')
    });

    addBox(3, 4, 0.3, -10, 2, 0, 0x222233, {
        type: 'portal', target: 'corridor_infinite',
        label: t('infiniteCorridor')
    });

    if (STATE.inventory.plans.length >= STATE.totalPlans) {
        addBox(3, 4, 0.3, 10, 2, 0, 0x333322, {
            type: 'portal', target: 'labyrinth',
            label: t('labyrinth')
        });
    }

    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 8;
        const z = Math.sin(angle) * 8;
        addBox(0.3, 3 + Math.random() * 3, 0.3, x, 2, z, 0x1a1a1a);
    }

    addBox(4, 0.1, 2, 0, 0.01, 5, 0x222222, {
        type: 'sign',
        label: t('welcome')
    });

    // Portail vers la Salle des Boutons (decouverte cachee : derriere le joueur au spawn)
    const btnPortal = addBox(2.5, 3, 0.3, 6, 1.5, -8, 0x6622aa, {
        type: 'portal', target: 'button_room',
        label: t('buttonRoom') || 'Salle des Boutons'
    });
    if (btnPortal && btnPortal.material) {
        btnPortal.material.emissive = new THREE.Color(0xff44ff);
        btnPortal.material.emissiveIntensity = 0.4;
    }

    // Portail vers la Salle des Cubes (sandbox fun, sud-est)
    const cubePortal = addBox(2.5, 3, 0.3, -6, 1.5, -8, 0x336688, {
        type: 'portal', target: 'cube_room',
        label: t('cubeRoom') || 'Salle des Cubes'
    });
    if (cubePortal && cubePortal.material) {
        cubePortal.material.emissive = new THREE.Color(0x66aaff);
        cubePortal.material.emissiveIntensity = 0.4;
    }

    // Portail vers la Salle des Pesees (puzzle logique, nord-est)
    const weightPortal = addBox(2.5, 3, 0.3, 6, 1.5, 8, 0xaa8833, {
        type: 'portal', target: 'weight_room',
        label: t('weightRoom') || 'Salle des Pesées'
    });
    if (weightPortal && weightPortal.material) {
        weightPortal.material.emissive = new THREE.Color(0xffcc44);
        weightPortal.material.emissiveIntensity = 0.4;
    }

    // Portail "retour au tutoriel" : visible uniquement apres avoir debloque le saut
    if (STATE.canJump) {
        const tutoPortal = addBox(2, 2.5, 0.3, -6, 1.25, 8, 0x4488cc, {
            type: 'portal', target: 'tutorial',
            label: 'Retour au tutoriel'
        });
        if (tutoPortal && tutoPortal.material) {
            tutoPortal.material.emissive = new THREE.Color(0x88ccff);
            tutoPortal.material.emissiveIntensity = 0.5;
        }
    }

    // === SURREALISME : cubes flottants a l'envers au plafond ===
    const ceilingY = 7.5;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + 0.3;
        const r = 5 + Math.random() * 4;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const size = 0.8 + Math.random() * 0.6;
        const cube = addBox(size, size, size, x, ceilingY, z, 0x2a1a3a);
        if (cube) {
            cube.userData.surrealRotate = true; // pour anim si besoin
            cube.rotation.set(Math.PI, Math.random() * Math.PI, 0);
        }
    }
    // Panneau "Le sol n'est pas en bas" pendu au plafond
    addBox(3, 0.05, 1, 0, ceilingY - 0.3, -2, 0x110022, {
        type: 'sign',
        label: t('ceilingSign') || "Le sol n'est pas toujours en bas..."
    });
}

// --- DOOR ROOM ---
function buildDoorRoom() {
    addBox(2, 3, 0.3, 0, 1.5, 9, 0x333333, {
        type: 'portal', target: 'hub',
        label: t('backToHub')
    });

    // Panneau "Marre de toujours recommencer ?"
    addBox(3, 0.05, 1.4, 0, 0.03, 7, 0x442211, {
        type: 'sign',
        label: t('saveHint') || 'Marre de toujours recommencer ? Trouve la clef de sauvegarde !'
    });

    // Clef de sauvegarde : visible si conditions remplies et pas encore prise
    const cond1 = STATE.roomsCompleted.includes('puzzle_1');
    const cond2 = STATE.roomsCompleted.includes('puzzle_2');
    const cond3 = STATE.fellInWell === true;
    if (cond1 && cond2 && cond3 && !STATE.saveKeyClaimed && !STATE.canSave) {
        // Pedestal au centre nord, sous la lumiere
        addBox(1.2, 0.6, 1.2, 0, 0.3, 4, 0x554433);
        const keyGeo = new THREE.BoxGeometry(0.5, 0.7, 0.2);
        const keyMat = new THREE.MeshStandardMaterial({
            color: 0x66ccff, emissive: 0x66ccff, emissiveIntensity: 0.8
        });
        const key = new THREE.Mesh(keyGeo, keyMat);
        key.position.set(0, 1.1, 4);
        key.userData = {
            type: 'saveKey',
            label: t('saveKeyLabel') || 'Clef de sauvegarde'
        };
        scene.add(key);
        worldObjects.push(key);
        interactables.push(key);
        // Halo
        const halo = new THREE.PointLight(0x66ccff, 1.4, 8);
        halo.position.set(0, 2, 4);
        scene.add(halo);
        worldObjects.push(halo);
    }

    for (let i = 0; i < 10; i++) {
        const x = -16 + (i % 5) * 8;
        const z = i < 5 ? -8 : -2;
        const completed = STATE.roomsCompleted.includes(`puzzle_${i+1}`);
        const unlocked = i === 0 || STATE.doorsUnlocked.includes(i+1);

        const color = completed ? 0x003300 : (unlocked ? 0x444444 : 0x220000);

        addBox(2, 3.5, 0.3, x, 1.75, z, color, {
            type: 'door',
            doorIndex: i + 1,
            roomTarget: `puzzle_${i+1}`,
            locked: !unlocked,
            completed: completed,
            label: t('door', i+1)
        });

        addBox(2.4, 0.2, 0.4, x, 3.6, z, 0x333333);
        addBox(0.2, 3.5, 0.4, x - 1.2, 1.75, z, 0x333333);
        addBox(0.2, 3.5, 0.4, x + 1.2, 1.75, z, 0x333333);
    }
}

// --- PUZZLE ROOMS ---

// Dispatcher
function buildPuzzleRoom(roomId) {
    const puzzleNum = parseInt(roomId.split('_')[1]);
    const roomDef = ROOMS[roomId];
    const theme = ROOM_THEMES ? ROOM_THEMES[roomId] : null;

    buildPuzzleRoomCommon(roomId, puzzleNum, roomDef);
    buildThemeDecoration(theme ? theme.name : 'training', roomDef);
    buildHintPillars(roomId, puzzleNum, roomDef, theme);
}

// Common elements: portal, chest, plan, key
function buildPuzzleRoomCommon(roomId, puzzleNum, roomDef) {
    const exitZ = roomDef.size.d / 2 - 1;

    // Exit portal
    addBox(2, 3, 0.3, 0, 1.5, exitZ, 0x333333, {
        type: 'portal', target: 'room_doors', label: t('back')
    });

    // Chest
    const chestOpened = STATE.roomsCompleted.includes(roomId);
    addBox(1.5, 1, 1, 0, 0.5, -roomDef.size.d/2 + 4, chestOpened ? 0x004400 : 0x443300, {
        type: 'chest', puzzleId: roomId, opened: chestOpened,
        comboRequired: getChestCombo(puzzleNum),
        label: chestOpened ? t('chestOpened') : t('chestLocked')
    });

    // Plan (if chest opened)
    if (chestOpened && !STATE.inventory.plans.includes(puzzleNum)) {
        addSphere(0.3, 0, 1.5, -roomDef.size.d/2 + 4, 0xffff00, {
            type: 'plan', planId: puzzleNum, label: t('plan', puzzleNum, STATE.totalPlans)
        });
    }

    // Key (if chest opened and next door needs unlocking)
    if (chestOpened && puzzleNum < 10 && !STATE.doorsUnlocked.includes(puzzleNum + 1)) {
        addBox(0.3, 0.15, 0.6, 3, 0.1, -roomDef.size.d/2 + 6, 0xffaa00, {
            type: 'key', unlocksRoom: puzzleNum + 1, label: t('keyFor', puzzleNum + 1)
        });
    }
}

// Theme-specific decorations
function buildThemeDecoration(themeName, roomDef) {
    const hw = roomDef.size.w / 2;
    const hd = roomDef.size.d / 2;

    switch (themeName) {
        case 'training': buildDecoTraining(hw, hd); break;
        case 'crystal':  buildDecoCrystal(hw, hd); break;
        case 'space':    buildDecoSpace(hw, hd); break;
        case 'forest':   buildDecoForest(hw, hd); break;
        case 'lava':     buildDecoLava(hw, hd); break;
        case 'ice':      buildDecoIce(hw, hd); break;
        case 'abyss':    buildDecoAbyss(hw, hd); break;
        case 'desert':   buildDecoDesert(hw, hd); break;
        case 'neon':     buildDecoNeon(hw, hd); break;
        case 'void':     buildDecoVoid(hw, hd); break;
    }
}

function buildDecoTraining(hw, hd) {
    // 4 stone pillars in corners
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.6, 4, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 });
    const corners = [[-hw+2, -hd+2], [hw-2, -hd+2], [-hw+2, hd-2], [hw-2, hd-2]];
    for (const [x, z] of corners) {
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(x, 2, z);
        scene.add(p); worldObjects.push(p);
    }
    // Small rubble on floor
    for (let i = 0; i < 6; i++) {
        const rx = (Math.random() - 0.5) * hw;
        const rz = (Math.random() - 0.5) * hd;
        const s = 0.2 + Math.random() * 0.3;
        const rubGeo = new THREE.BoxGeometry(s, s * 0.5, s);
        const rubMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
        const rub = new THREE.Mesh(rubGeo, rubMat);
        rub.position.set(rx, s * 0.25, rz);
        rub.rotation.y = Math.random() * Math.PI;
        scene.add(rub); worldObjects.push(rub);
    }
}

function buildDecoCrystal(hw, hd) {
    const crystalColors = [0x4488ff, 0x66aaff, 0x88ccff, 0x44aacc];
    for (let i = 0; i < 8; i++) {
        const geo = i % 2 === 0
            ? new THREE.OctahedronGeometry(0.4 + Math.random() * 0.6)
            : new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.5);
        const color = crystalColors[i % crystalColors.length];
        const mat = new THREE.MeshStandardMaterial({
            color: color, transparent: true, opacity: 0.6,
            roughness: 0.1, metalness: 0.3,
            emissive: 0x2244aa, emissiveIntensity: 0.4
        });
        const crystal = new THREE.Mesh(geo, mat);
        const angle = (i / 8) * Math.PI * 2;
        const r = 4 + Math.random() * (hw - 5);
        crystal.position.set(Math.cos(angle) * r, 0.5 + Math.random() * 2, Math.sin(angle) * r);
        crystal.rotation.set(Math.random(), Math.random(), Math.random());
        scene.add(crystal); worldObjects.push(crystal);
    }
}

function buildDecoSpace(hw, hd) {
    const asteroidGeo = new THREE.DodecahedronGeometry(1, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
    const count = 6;
    const mesh = new THREE.InstancedMesh(asteroidGeo, asteroidMat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * (hw * 1.5);
        const y = 1.5 + Math.random() * 4;
        const z = (Math.random() - 0.5) * (hd * 1.5);
        const s = 0.3 + Math.random() * 0.7;
        dummy.position.set(x, y, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh); worldObjects.push(mesh);
}

function buildDecoForest(hw, hd) {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 3, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
    const canopyGeo = new THREE.ConeGeometry(1.2, 2.5, 6);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2a6e2a, roughness: 0.8 });
    const treeCount = 10;
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const dummy = new THREE.Object3D();
    const positions = [];
    for (let i = 0; i < treeCount; i++) {
        let x, z;
        do {
            x = (Math.random() - 0.5) * (hw * 1.6);
            z = (Math.random() - 0.5) * (hd * 1.6);
        } while (Math.abs(x) < 3 && Math.abs(z) < 3);
        positions.push({ x, z });
        dummy.position.set(x, 1.5, z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(trunkMesh); worldObjects.push(trunkMesh);
    // Canopies (not instanced since same geo but unique enough)
    for (const pos of positions) {
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.set(pos.x, 4.2, pos.z);
        scene.add(canopy); worldObjects.push(canopy);
    }
}

function buildDecoLava(hw, hd) {
    // Rocky pillars
    const pillarGeo = new THREE.CylinderGeometry(0.6, 0.8, 3.5, 7);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x332222, roughness: 0.9 });
    const pillarPositions = [
        [-hw+3, -hd+3], [hw-3, -hd+3], [-hw+3, hd-3], [hw-3, hd-3], [0, hd-4]
    ];
    for (const [x, z] of pillarPositions) {
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(x, 1.75, z);
        scene.add(p); worldObjects.push(p);
    }
    // Faint emissive floor overlay
    const overlayGeo = new THREE.PlaneGeometry(hw * 1.8, hd * 1.8);
    const overlayMat = new THREE.MeshStandardMaterial({
        color: 0x220000, emissive: 0xff4400, emissiveIntensity: 0.15,
        transparent: true, opacity: 0.3, side: THREE.DoubleSide
    });
    const overlay = new THREE.Mesh(overlayGeo, overlayMat);
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = 0.02;
    scene.add(overlay); worldObjects.push(overlay);
}

function buildDecoIce(hw, hd) {
    const stalGeo = new THREE.ConeGeometry(0.3, 2, 6);
    const stalMat = new THREE.MeshStandardMaterial({
        color: 0x88ccff, transparent: true, opacity: 0.5,
        roughness: 0.1, metalness: 0.2
    });
    const count = 10;
    const mesh = new THREE.InstancedMesh(stalGeo, stalMat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * (hw * 1.6);
        const z = (Math.random() - 0.5) * (hd * 1.6);
        const h = 1 + Math.random() * 1.5;
        dummy.position.set(x, 7 - h / 2, z);
        dummy.rotation.set(Math.PI, 0, 0); // inverted cone
        dummy.scale.set(0.8 + Math.random() * 0.5, h / 2, 0.8 + Math.random() * 0.5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh); worldObjects.push(mesh);
}

function buildDecoAbyss(hw, hd) {
    // 3 faint vertical light shafts
    const shaftPositions = [[-3, 0], [2, -4], [0, 5]];
    for (const [x, z] of shaftPositions) {
        const shaftGeo = new THREE.BoxGeometry(0.3, 8, 0.3);
        const shaftMat = new THREE.MeshStandardMaterial({
            color: 0x333355, emissive: 0x444466, emissiveIntensity: 0.4,
            transparent: true, opacity: 0.15
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.set(x, 4, z);
        scene.add(shaft); worldObjects.push(shaft);
    }
}

function buildDecoDesert(hw, hd) {
    // Low dunes
    const dunePositions = [[-5, -3], [4, 2], [-2, 6], [6, -5]];
    for (const [x, z] of dunePositions) {
        const w = 2 + Math.random() * 2;
        const d = 2 + Math.random() * 2;
        const duneGeo = new THREE.BoxGeometry(w, 0.6, d);
        const duneMat = new THREE.MeshStandardMaterial({ color: 0xaa8855, roughness: 0.9 });
        const dune = new THREE.Mesh(duneGeo, duneMat);
        dune.position.set(x, 0.3, z);
        scene.add(dune); worldObjects.push(dune);
    }
    // Broken columns
    const colGeo = new THREE.CylinderGeometry(0.4, 0.5, 2.5, 8);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.8 });
    const colPositions = [[-hw+3, -hd+5], [hw-4, hd-6], [0, -hd+8]];
    for (const [x, z] of colPositions) {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(x, 1.25, z);
        col.rotation.z = 0.1 + Math.random() * 0.2;
        scene.add(col); worldObjects.push(col);
    }
}

function buildDecoNeon(hw, hd) {
    const neonColors = [0xff00ff, 0x00ffff, 0xffff00, 0x00ff00];
    const count = 8;
    for (let i = 0; i < count; i++) {
        const isBox = i % 2 === 0;
        const geo = isBox
            ? new THREE.BoxGeometry(0.5, 0.5 + Math.random(), 0.5)
            : new THREE.CylinderGeometry(0.2, 0.2, 1 + Math.random(), 8);
        const color = neonColors[i % neonColors.length];
        const mat = new THREE.MeshStandardMaterial({
            color: color, emissive: color, emissiveIntensity: 0.8
        });
        const obj = new THREE.Mesh(geo, mat);
        const angle = (i / count) * Math.PI * 2;
        const r = 3 + Math.random() * (hw - 4);
        obj.position.set(Math.cos(angle) * r, 0.5 + Math.random() * 3, Math.sin(angle) * r);
        obj.rotation.set(Math.random() * 0.5, Math.random(), 0);
        scene.add(obj); worldObjects.push(obj);
    }
}

function buildDecoVoid(hw, hd) {
    const count = 6;
    const monoGeo = new THREE.BoxGeometry(0.8, 5, 0.4);
    for (let i = 0; i < count; i++) {
        const color = i % 2 === 0 ? 0x000000 : 0xffffff;
        const mat = new THREE.MeshStandardMaterial({
            color: color, roughness: 0.3, metalness: 0.1
        });
        const mono = new THREE.Mesh(monoGeo, mat);
        const angle = (i / count) * Math.PI * 2;
        const r = 4 + Math.random() * (hw - 5);
        mono.position.set(Math.cos(angle) * r, 2.5, Math.sin(angle) * r);
        mono.rotation.y = angle;
        scene.add(mono); worldObjects.push(mono);
    }
}

// Hint pillars (replaces old circular hint cubes)
function buildHintPillars(roomId, puzzleNum, roomDef, theme) {
    const chestOpened = STATE.roomsCompleted.includes(roomId);
    if (chestOpened) return;

    const comboKey = getChestCombo(puzzleNum);
    if (!comboKey) return;

    const hw = roomDef.size.w / 2;
    const hd = roomDef.size.d / 2;

    // 4 pillars along a path from entrance toward chest
    const pillarPositions = [
        { x: -3, z: hd - 5 },
        { x:  2, z: hd / 2 },
        { x: -2, z: 0 },
        { x:  3, z: -hd + 6 }
    ];

    const glowColor = theme ? getGlowColor(theme.name) : 0x4488ff;
    const pillarColor = theme ? getPillarColor(theme.name) : 0x888888;

    for (let i = 0; i < comboKey.length && i < 4; i++) {
        const pos = pillarPositions[i];

        // Pedestal base (cylinder)
        const baseGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.3, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: pillarColor, roughness: 0.6 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(pos.x, 0.15, pos.z);
        scene.add(base); worldObjects.push(base);

        // Column
        const colGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.5, 8);
        const colMat = new THREE.MeshStandardMaterial({ color: pillarColor, roughness: 0.5 });
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(pos.x, 1.05, pos.z);
        scene.add(col); worldObjects.push(col);

        // Number sphere (small, glowing, shows position)
        const numGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const numMat = new THREE.MeshStandardMaterial({
            color: glowColor, emissive: glowColor, emissiveIntensity: 0.8
        });
        const numSphere = new THREE.Mesh(numGeo, numMat);
        numSphere.position.set(pos.x + 0.35, 1.8, pos.z);
        scene.add(numSphere); worldObjects.push(numSphere);

        // Floating letter (interactive, rotating)
        const letterGeo = new THREE.BoxGeometry(0.4, 0.4, 0.1);
        const letterMat = new THREE.MeshStandardMaterial({
            color: glowColor, emissive: glowColor, emissiveIntensity: 0.6,
            transparent: true, opacity: 0.9
        });
        const letter = new THREE.Mesh(letterGeo, letterMat);
        letter.position.set(pos.x, 2.2, pos.z);
        letter.userData = {
            type: 'sign',
            label: t('hintNumbered', i + 1, comboKey[i]),
            _floatingHint: true,
            _baseY: 2.2,
            _time: i * 1.5
        };
        scene.add(letter); worldObjects.push(letter);
        interactables.push(letter);

        // Small light above pillar
        const pLight = new THREE.PointLight(glowColor, 0.3, 8);
        pLight.position.set(pos.x, 2.5, pos.z);
        scene.add(pLight); worldObjects.push(pLight);
    }

    // Glowing path on floor connecting pillars in order
    buildHintPath(pillarPositions, comboKey.length, glowColor);
}

// Glowing path connecting hint pillars
function buildHintPath(positions, count, color) {
    const points = [];
    for (let i = 0; i < count && i < positions.length; i++) {
        points.push(new THREE.Vector3(positions[i].x, 0.05, positions[i].z));
    }
    const pathGeo = new THREE.BufferGeometry().setFromPoints(points);
    const pathMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
    const pathLine = new THREE.Line(pathGeo, pathMat);
    scene.add(pathLine); worldObjects.push(pathLine);

    // Small dots along the path
    for (let i = 0; i < count - 1; i++) {
        const s = positions[i], e = positions[i + 1];
        for (let f = 0.2; f < 1; f += 0.2) {
            const dotGeo = new THREE.SphereGeometry(0.04, 4, 4);
            const dotMat = new THREE.MeshStandardMaterial({
                color, emissive: color, emissiveIntensity: 0.5
            });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(s.x + (e.x - s.x) * f, 0.05, s.z + (e.z - s.z) * f);
            scene.add(dot); worldObjects.push(dot);
        }
    }
}

// Color helpers for hint pillars
function getGlowColor(themeName) {
    const colors = {
        training: 0x4488ff, crystal: 0x88ccff, space: 0xaa66ff,
        forest: 0x66cc44, lava: 0xff6622, ice: 0x88ddff,
        abyss: 0x6666aa, desert: 0xffaa44, neon: 0xff00ff, void: 0xffffff
    };
    return colors[themeName] || 0x4488ff;
}

function getPillarColor(themeName) {
    const colors = {
        training: 0x888888, crystal: 0x334455, space: 0x222233,
        forest: 0x4a3520, lava: 0x442222, ice: 0x556688,
        abyss: 0x222222, desert: 0x887755, neon: 0x111111, void: 0x888888
    };
    return colors[themeName] || 0x888888;
}

// --- INFINITE CORRIDOR ---
let corridorSegments = [];
let lastCorridorZ = 0;

function buildInfiniteCorridor() {
    camera.position.set(0, 2, 0);
    generateCorridorSegments(0);

    addBox(1, 0.5, 0.1, 0, 2, -5, 0x333333, {
        type: 'sign',
        label: t('corridorSign')
    });
}

function generateCorridorSegments(startZ) {
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a, side: THREE.DoubleSide
    });

    for (let i = 0; i < 20; i++) {
        const z = startZ - i * 10;

        const floorGeo = new THREE.PlaneGeometry(6, 10);
        const floorMat = new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? 0x0a0a0a : 0x0e0e0e, side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, z);
        scene.add(floor);
        worldObjects.push(floor);

        addWall(10, 5, -3, 2.5, z, Math.PI/2, wallMat);
        addWall(10, 5, 3, 2.5, z, Math.PI/2, wallMat);

        const ceil = floor.clone();
        ceil.position.y = 5;
        scene.add(ceil);
        worldObjects.push(ceil);

        if (i % 3 === 0) {
            const light = new THREE.PointLight(0x444466, 0.5, 15);
            light.position.set(0, 4, z);
            scene.add(light);
            worldObjects.push(light);
        }

        if (Math.random() > 0.7) {
            const itemType = Math.random();
            if (itemType > 0.8) {
                addBox(1, 3, 0.2, (Math.random() > 0.5 ? 1.5 : -1.5), 1.5, z,
                    0x333333, {
                        type: 'portal', target: 'hub',
                        label: t('secretPassage')
                    });
            } else if (itemType > 0.5) {
                addBox(0.5, 0.5, 0.5, 0, 0.25, z, 0x553300, {
                    type: 'sign',
                    label: t('corridorBack')
                });
            }
        }
    }
    lastCorridorZ = startZ - 200;
}

// --- LABYRINTH ---
// Maze 11x11 (DFS recursive backtracker). Cellules carved = indices IMPAIRS uniquement.
// Donc l'orbe et le spawn doivent etre sur des cellules impair-impair pour etre accessibles.
function buildLabyrinth() {
    const mazeW = 11, mazeH = 11;
    const cellSize = 4;
    const offsetX = -(mazeW * cellSize) / 2;
    const offsetZ = -(mazeH * cellSize) / 2;
    const maze = generateMaze(mazeW, mazeH);

    // Construction des murs
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === 1) {
                addBox(cellSize, 4, cellSize,
                    offsetX + x * cellSize, 2, offsetZ + y * cellSize,
                    0x151515);
            }
        }
    }

    // Spawn DANS la maze a la cellule (1,1) (toujours carved, premier carve)
    const spawnX = offsetX + 1 * cellSize;
    const spawnZ = offsetZ + 1 * cellSize;
    camera.position.set(spawnX, 2, spawnZ);
    STATE.spawnPosition = { x: spawnX, y: 2, z: spawnZ };
    // Caméra regarde vers le sud-est (loin de l'entree, vers l'interieur)
    if (typeof euler !== 'undefined') {
        euler.set(0, -Math.PI / 4, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);
    }

    // Portail de retour vers le hub : colle au spawn pour pouvoir ressortir facilement
    addBox(2, 3, 0.3, spawnX, 1.5, spawnZ - 1.6, 0x333333, {
        type: 'portal', target: 'hub',
        label: t('back')
    });
    // Petite lumiere sur le portail pour le reperer
    const backLt = new THREE.PointLight(0x88ccff, 0.8, 6);
    backLt.position.set(spawnX, 2.5, spawnZ - 1.6);
    scene.add(backLt); worldObjects.push(backLt);

    // Orbe : cellule (mazeW-2, mazeH-2) = (9, 9) garantie carved (toujours impaire)
    let orbCellX = mazeW - 2, orbCellY = mazeH - 2;
    if (STATE.inventory.plans.length >= STATE.totalPlans) {
        const orbColor = !STATE.inventory.orbs.whiteI ? 0xffffff : 0x000000;
        const orbId = !STATE.inventory.orbs.whiteI ? 'whiteI' :
                     !STATE.inventory.orbs.blackI ? 'blackI' :
                     !STATE.inventory.orbs.whiteII ? 'whiteII' : 'blackII';

        const orbX = offsetX + orbCellX * cellSize;
        const orbZ = offsetZ + orbCellY * cellSize;
        const orbMesh = addSphere(0.5, orbX, 1.5, orbZ, orbColor, {
            type: 'orb',
            orbId: orbId,
            pickable: true,
            label: orbColor === 0xffffff ? t('orbWhite') : t('orbBlack')
        });
        if (orbMesh) pickables.push(orbMesh);
        // Halo visible de loin
        const orbLt = new THREE.PointLight(orbColor === 0xffffff ? 0xffffff : 0x6688ff, 1.2, 8);
        orbLt.position.set(orbX, 2.2, orbZ);
        scene.add(orbLt); worldObjects.push(orbLt);

        // Mode debug : ligne de guidage rose au sol depuis spawn jusqu'a l'orbe
        if (STATE.debugMode) {
            const path = bfsMaze(maze, 1, 1, orbCellX, orbCellY);
            for (const [cx, cy] of path) {
                const wx = offsetX + cx * cellSize;
                const wz = offsetZ + cy * cellSize;
                const marker = addBox(cellSize * 0.4, 0.05, cellSize * 0.4, wx, 0.03, wz, 0xff44dd);
                if (marker && marker.material) {
                    marker.material.emissive = new THREE.Color(0xff44dd);
                    marker.material.emissiveIntensity = 0.8;
                }
            }
        }
    }
}

// BFS sur la grille du maze : trouve le plus court chemin entre 2 cellules carved
function bfsMaze(maze, sx, sy, ex, ey) {
    const w = maze[0].length, h = maze.length;
    const visited = Array.from({length: h}, () => Array(w).fill(false));
    const prev = Array.from({length: h}, () => Array(w).fill(null));
    const q = [[sx, sy]];
    visited[sy][sx] = true;
    while (q.length) {
        const [x, y] = q.shift();
        if (x === ex && y === ey) break;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            if (visited[ny][nx] || maze[ny][nx] === 1) continue;
            visited[ny][nx] = true;
            prev[ny][nx] = [x, y];
            q.push([nx, ny]);
        }
    }
    // Reconstruire le chemin
    const path = [];
    let cur = [ex, ey];
    while (cur) {
        path.push(cur);
        const p = prev[cur[1]][cur[0]];
        if (!p) break;
        cur = p;
    }
    return path.reverse();
}

function generateMaze(w, h) {
    const maze = Array.from({length: h}, () => Array(w).fill(1));

    function carve(x, y) {
        maze[y][x] = 0;
        const dirs = [[0,-2],[0,2],[-2,0],[2,0]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < w && ny > 0 && ny < h && maze[ny][nx] === 1) {
                maze[y + dy/2][x + dx/2] = 0;
                carve(nx, ny);
            }
        }
    }

    carve(1, 1);
    maze[1][0] = 0;
    maze[h-2][w-1] = 0;
    return maze;
}

// --- SALLE DES BOUTONS ABSURDES ---
// Boutons qui marchent, ne marchent pas, ou se moquent du joueur.
// Un bouton cache derriere le portail d'entree (joue sur "reculer").
function buildButtonRoom() {
    // Etat local de la salle (reset a chaque entree)
    if (!STATE.buttonRoom) STATE.buttonRoom = {};
    STATE.buttonRoom.pressMeCount = 0;
    STATE.buttonRoom.dontPressTimer = 0;
    STATE.buttonRoom.dontPressRewarded = false;

    // Portail de retour (vers hub) -- contre le mur sud, derriere le spawn (z=8)
    addBox(2, 3, 0.3, 0, 1.5, 10.6, 0x333333, {
        type: 'portal', target: 'hub',
        label: t('backToHub') || 'Retour au hub'
    });

    // Panneau d'introduction
    addBox(4, 0.05, 1.2, 0, 0.03, 5, 0x2a1144, {
        type: 'sign',
        label: t('absurdRoomIntro') || 'Bienvenue. Aucun bouton ne ment. (Sauf un. Ou plusieurs.)'
    });

    // Helper pour creer un bouton sur socle
    function makeBtn(x, z, color, action, label) {
        // Socle
        addBox(1.2, 0.5, 1.2, x, 0.25, z, 0x111111);
        // Bouton lui-meme
        const btn = addBox(0.8, 0.4, 0.8, x, 0.7, z, color, {
            type: 'button',
            label: label,
            action: action,
            onPress: function(obj) { onSillyButton(action, obj); }
        });
        if (btn && btn.material) {
            btn.material.emissive = new THREE.Color(color);
            btn.material.emissiveIntensity = 0.55;
        }
        // Mini lumiere pour glow
        const lt = new THREE.PointLight(color, 0.6, 4);
        lt.position.set(x, 1.5, z);
        scene.add(lt); worldObjects.push(lt);
        return btn;
    }

    // 1. APPUYE-MOI (rouge, central) : compte les pressions, reward apres 7
    makeBtn(0, -3, 0xff2244, 'pressMe', t('btnPressMe') || 'APPUYE-MOI');

    // 2. NE PAS APPUYER (jaune) : penalite si tu appuies, reward si tu attends
    makeBtn(-5, -1, 0xffdd22, 'dontPress', t('btnDontPress') || "SURTOUT N'APPUIE PAS");

    // 3. INVERSER (cyan) : flip controles verticaux 8s
    makeBtn(5, -1, 0x22ddff, 'invertY', t('btnInvert') || 'INVERSER');

    // 4. TELEPORTER (blanc) : teleporte de quelques metres au hasard
    makeBtn(-5, 3, 0xeeeeee, 'teleport', t('btnTeleport') || 'TÉLÉPORTER');

    // 5. ZOOM (violet) : oscille le FOV pendant 5s
    makeBtn(5, 3, 0xaa44ff, 'zoom', t('btnZoom') || 'ZOOM ÉTRANGE');

    // 6. SQRT(-1) (vert acide) : retourne le joueur de 180 degres immediatement
    makeBtn(0, 3, 0x44ff88, 'aboutFace', t('btnAboutFace') || 'PIVOT');

    // 7. CACHE : derriere le portail d'entree (z=10, le joueur arrive vers z=8)
    // Le joueur doit reculer/se retourner pour le voir
    const hidden = makeBtn(0, 10.5, 0x222222, 'hidden', t('btnHidden') || '?');
    if (hidden && hidden.material) {
        hidden.material.emissiveIntensity = 0.2;
    }

    // Cubes flottants surrealistes pour l'ambiance
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const r = 8;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = 4 + Math.random() * 2;
        addBox(0.4, 0.4, 0.4, x, y, z, 0xff44ff);
    }

    // === NOTES SUR LES MURS ===
    // Mur sud (z=10.8, regarde -z donc rotation PI)
    addWallNote("Si tu lis ceci, tu devrais avancer.", -7, 2.4, 10.8, Math.PI, { accent: '#ff44dd', id: 'jumpNote' });
    addWallNote("CECI N'EST PAS UNE NOTE.", 7, 2.4, 10.8, Math.PI, { accent: '#44ddff' });
    // Mur nord (z=-10.8, regarde +z donc rotation 0)
    addWallNote("Le bouton honnête n'est pas devant toi.", -6, 2.4, -10.8, 0, { accent: '#44ff88' });
    addWallNote("Tourne-toi parfois. Vraiment.", 6, 2.4, -10.8, 0, { accent: '#ffcc44' });
    // Mur ouest (x=-10.8, regarde +x donc rotation PI/2)
    addWallNote("Les murs ne mentent jamais. Sauf celui-là.", -10.8, 2.4, 0, Math.PI / 2, { accent: '#aa44ff', id: 'wallSecret' });
    addWallNote("Si tu vois ce texte à l'envers : c'est normal.", -10.8, 4.0, 5, Math.PI / 2, { accent: '#ff8844', height: 0.7, width: 1.8, upsideDown: true, id: 'invertNote' });
    // Mur est (x=10.8, regarde -x donc rotation -PI/2)
    addWallNote("Une clé se cache. Pas ici.", 10.8, 2.4, -3, -Math.PI / 2, { accent: '#44ffcc' });
    addWallNote("Le sol est solide. La vérité, moins.", 10.8, 2.4, 4, -Math.PI / 2, { accent: '#ff44dd' });

    // === MURS INTERNES LABYRINTHIQUES ===
    // Plusieurs panneaux verticaux qui creent des couloirs decales (pas un vrai labyrinthe, juste de la friction visuelle)
    // hauteur = 2.5 (mi-mur), largeur variable. Le joueur doit slalomer.
    const wallH = 2.5;
    const wallColor = 0x2a1845;
    // Bandes horizontales decalees
    addBox(6, wallH, 0.3, -3, wallH/2, -2,  wallColor); // mur en bas a gauche
    addBox(5, wallH, 0.3, 4,  wallH/2, 1,   wallColor); // mur central decale
    addBox(7, wallH, 0.3, -2, wallH/2, 6,   wallColor); // mur sud
    // Bandes verticales
    addBox(0.3, wallH, 4, -6, wallH/2, 0,   wallColor); // mur ouest
    addBox(0.3, wallH, 5, 7,  wallH/2, -4,  wallColor); // mur est
    // Liserés lumineux sur le haut des murs internes (ambiance)
    const stripColor = 0xff44dd;
    addBox(6, 0.08, 0.32, -3, wallH + 0.04, -2, stripColor);
    addBox(5, 0.08, 0.32, 4,  wallH + 0.04, 1,  stripColor);
    addBox(7, 0.08, 0.32, -2, wallH + 0.04, 6,  stripColor);
    addBox(0.32, 0.08, 4, -6, wallH + 0.04, 0,  stripColor);
    addBox(0.32, 0.08, 5, 7,  wallH + 0.04, -4, stripColor);
}

// --- HELPER : note collee a un mur (texture canvas avec texte) ---
// rotY : 0 = face -z (mur sud), Math.PI = face +z (mur nord), -PI/2 = face -x (mur ouest), PI/2 = face +x (mur est)
function addWallNote(text, x, y, z, rotY, opts) {
    opts = opts || {};
    const w = opts.width  || 2.4;
    const h = opts.height || 1.0;
    const bg = opts.bg || '#1a1a2a';
    const fg = opts.fg || '#cccccc';
    const accent = opts.accent || '#ff44dd';

    // Canvas texture
    const cvs = document.createElement('canvas');
    cvs.width = 512; cvs.height = 256;
    const ctx = cvs.getContext('2d');
    // Fond
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);
    // Bordure accent
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);
    // Coins decoratifs
    ctx.fillStyle = accent;
    ctx.fillRect(4, 4, 18, 18);
    ctx.fillRect(490, 4, 18, 18);
    ctx.fillRect(4, 234, 18, 18);
    ctx.fillRect(490, 234, 18, 18);
    // Texte (auto-wrap basique)
    ctx.fillStyle = fg;
    ctx.font = "bold 28px monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = wrapText(ctx, text, 460);
    const totalH = lines.length * 36;
    const startY = 128 - totalH / 2 + 18;
    if (opts.upsideDown) {
        // Pivot 180 autour du centre du canvas
        ctx.save();
        ctx.translate(256, 128);
        ctx.rotate(Math.PI);
        ctx.translate(-256, -128);
        lines.forEach((line, i) => ctx.fillText(line, 256, startY + i * 36));
        ctx.restore();
    } else {
        lines.forEach((line, i) => ctx.fillText(line, 256, startY + i * 36));
    }

    const tex = new THREE.CanvasTexture(cvs);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true });
    const geo = new THREE.PlaneGeometry(w, h);
    const note = new THREE.Mesh(geo, mat);
    note.position.set(x, y, z);
    note.rotation.y = rotY;
    scene.add(note);
    worldObjects.push(note);
    // Tag pour detection proximite (checkWallNotes dans player.js)
    note.userData = { type: 'wallNote', noteId: opts.id || null };
    return note;
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
}

// --- SALLE DES CUBES (sandbox fun) ---
// Sans objectif. Plein de cubes a lancer pour le plaisir, plus une cible bonus.
function buildCubeRoom() {
    // Portail retour -- contre le mur sud, derriere le spawn (z=10)
    addBox(2, 3, 0.3, 0, 1.5, 12.6, 0x333333, {
        type: 'portal', target: 'hub',
        label: t('backToHub') || 'Retour au hub'
    });

    addBox(4, 0.05, 1.2, 0, 0.03, 7, 0x223344, {
        type: 'sign',
        label: t('cubeRoomIntro') || 'Lance les cubes (clic droit). Détruis la cible pour une récompense.'
    });

    // Tas de cubes colores partout
    const colors = [0xff4444, 0x44ff44, 0x4488ff, 0xffcc22, 0xff44ff, 0x44ffff, 0xffaa44];
    for (let i = 0; i < 28; i++) {
        const x = (Math.random() - 0.5) * 20;
        const z = (Math.random() - 0.5) * 16 - 1;
        const size = 0.5 + Math.random() * 0.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
        const cube = new THREE.Mesh(geo, mat);
        // Empile parfois en piles desordonnees
        const stack = Math.random() < 0.3 ? Math.floor(Math.random() * 3) : 0;
        cube.position.set(x, size / 2 + stack * size, z);
        cube.rotation.y = Math.random() * Math.PI;
        scene.add(cube);
        worldObjects.push(cube);
        cube.userData = { pickable: true, type: 'pickable' };
        pickables.push(cube);
    }

    // Cible bonus : panneau rouge a abattre en lancant un cube dessus
    const target = addBox(1.6, 1.6, 0.3, 0, 1.8, -11, 0xff2222, {
        type: 'cubeTarget',
        hits: 0,
        required: 3,
        label: t('cubeTarget') || 'Cible (lance des cubes)'
    });
    if (target && target.material) {
        target.material.emissive = new THREE.Color(0xff2222);
        target.material.emissiveIntensity = 0.5;
    }
    // Anneau decoratif
    addBox(2.4, 0.2, 0.4, 0, 2.7, -11, 0x441111);
    addBox(2.4, 0.2, 0.4, 0, 0.9, -11, 0x441111);

    // Quelques plateformes pour empiler
    addBox(3, 0.3, 3, -7, 0.15, -5, 0x333333);
    addBox(3, 0.3, 3, 7, 0.15, -5, 0x333333);
}

// --- SALLE DES PESEES (puzzle logique) ---
// 3 plaques colorees au sol. 3 cubes colores. Place chaque cube sur sa plaque.
// Si tout match : un coffre / clef se revele.
function buildWeightRoom() {
    if (!STATE.weightRoom) STATE.weightRoom = {};
    STATE.weightRoom.solved = false;

    // Portail retour -- contre le mur sud, derriere le spawn (z=8)
    addBox(2, 3, 0.3, 0, 1.5, 10.6, 0x333333, {
        type: 'portal', target: 'hub',
        label: t('backToHub') || 'Retour au hub'
    });

    addBox(4, 0.05, 1.2, 0, 0.03, 5, 0x332211, {
        type: 'sign',
        label: t('weightRoomIntro') || 'Pose chaque cube coloré sur la plaque de sa couleur.'
    });

    // 3 plaques colorees au sol, alignees
    const plateData = [
        { color: 0xff3333, name: 'red',   x: -5, z: -2 },
        { color: 0x33ff33, name: 'green', x:  0, z: -2 },
        { color: 0x3399ff, name: 'blue',  x:  5, z: -2 },
    ];
    const plates = [];
    for (const pd of plateData) {
        const plate = addBox(2, 0.1, 2, pd.x, 0.05, pd.z, pd.color);
        if (plate && plate.material) {
            plate.material.emissive = new THREE.Color(pd.color);
            plate.material.emissiveIntensity = 0.15;
            plate.userData = { type: 'weightPlate', plateColor: pd.color, plateName: pd.name, active: false };
        }
        plates.push(plate);
    }
    STATE.weightRoom.plates = plates;

    // 3 cubes colores ranges contre le mur d'entree
    const cubeData = [
        { color: 0xff3333, x: -3, z: 4 },
        { color: 0x33ff33, x:  0, z: 4 },
        { color: 0x3399ff, x:  3, z: 4 },
    ];
    for (const cd of cubeData) {
        const size = 0.7;
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshStandardMaterial({ color: cd.color, roughness: 0.4 });
        const cube = new THREE.Mesh(geo, mat);
        cube.position.set(cd.x, size / 2, cd.z);
        scene.add(cube);
        worldObjects.push(cube);
        cube.userData = { pickable: true, type: 'pickable', cubeColor: cd.color };
        pickables.push(cube);
    }

    // Pedestal au fond (revele une clef si puzzle resolu)
    const pedestal = addBox(1.4, 0.6, 1.4, 0, 0.3, -8, 0x554433);
    pedestal.userData = { type: 'pedestal' };
    STATE.weightRoom.pedestal = pedestal;
}

// --- ORB CHAMBER ---
function buildOrbChamber() {
    const light1 = new THREE.PointLight(0xffffff, 1, 20);
    light1.position.set(0, 8, 0);
    scene.add(light1);
    worldObjects.push(light1);

    addBox(1, 0.5, 1, 0, 0.25, 0, 0xdddddd);

    const orbsCollected = Object.values(STATE.inventory.orbs).filter(v => v).length;
    if (orbsCollected >= 4) {
        notify(t('victory'));
        addSphere(1, 0, 3, 0, 0x888888, {
            type: 'sign',
            label: t('transcended')
        });
    }
}
