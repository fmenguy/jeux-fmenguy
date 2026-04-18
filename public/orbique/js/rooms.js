// ============================================================
// ROOMS - Room content builders
// ============================================================

// --- TUTORIAL ---
function buildTutorial() {
    const room = ROOMS.tutorial;
    const hw = room.size.w / 2;
    const hd = room.size.d / 2;

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
        cube.userData = { pickable: true, type: 'pickable' };
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
}

// --- DOOR ROOM ---
function buildDoorRoom() {
    addBox(2, 3, 0.3, 0, 1.5, 9, 0x333333, {
        type: 'portal', target: 'hub',
        label: t('backToHub')
    });

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
function buildLabyrinth() {
    camera.position.set(0, 2, 28);

    const maze = generateMaze(15, 15);
    const cellSize = 4;
    const offsetX = -30;
    const offsetZ = -30;

    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === 1) {
                addBox(cellSize, 4, cellSize,
                    offsetX + x * cellSize, 2, offsetZ + y * cellSize,
                    0x151515);
            }
        }
    }

    if (STATE.inventory.plans.length >= STATE.totalPlans) {
        const orbColor = !STATE.inventory.orbs.whiteI ? 0xffffff : 0x000000;
        const orbId = !STATE.inventory.orbs.whiteI ? 'whiteI' :
                     !STATE.inventory.orbs.blackI ? 'blackI' :
                     !STATE.inventory.orbs.whiteII ? 'whiteII' : 'blackII';

        addSphere(0.5, offsetX + 14 * cellSize, 1.5, offsetZ + 14 * cellSize, orbColor, {
            type: 'orb',
            orbId: orbId,
            label: orbColor === 0xffffff ? t('orbWhite') : t('orbBlack')
        });
    }

    addBox(2, 3, 0.3, 0, 1.5, 29, 0x333333, {
        type: 'portal', target: 'hub',
        label: t('back')
    });
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
