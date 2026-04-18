// ============================================================
// WORLD - Room building & geometry helpers
// ============================================================

function clearWorld() {
    worldObjects.forEach(obj => {
        scene.remove(obj);
        // Dispose geometry
        if (obj.geometry) obj.geometry.dispose();
        // Dispose material(s)
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
    worldObjects = [];
    interactables = [];
    pickables = [];
    if (STATE.carriedObject) {
        STATE.carriedObject = null;
        hideCarryIndicator();
    }
    // Clear particles
    if (typeof clearParticles === 'function') clearParticles();
    // Clear animated texture refs (but NOT the cache)
    if (typeof ANIMATED_TEXTURES !== 'undefined') ANIMATED_TEXTURES.length = 0;
}

function loadRoom(roomId) {
    dbg('loadRoom:', roomId);
    clearWorld();
    currentRoom = roomId;
    STATE.currentZone = roomId;

    // Tracker les rooms visitees + reset du flag hub
    if (!STATE.visitedRooms.includes(roomId)) STATE.visitedRooms.push(roomId);
    if (roomId === 'hub') STATE.hubColorsRevealed = false;

    const roomDef = ROOMS[roomId];
    if (!roomDef) return;

    scene.background = new THREE.Color(roomDef.color);
    scene.fog = new THREE.Fog(roomDef.color, 1, roomId === 'labyrinth' ? 30 : 80);

    // Adjust base lights per room type
    const baseAmbient = scene.getObjectByName('baseAmbient');
    const basePoint = scene.getObjectByName('basePoint');
    if (roomId === 'tutorial' || roomId === 'orb_chamber') {
        if (baseAmbient) { baseAmbient.color.set(0xccccdd); baseAmbient.intensity = 0.6; }
        if (basePoint) { basePoint.intensity = 0.7; }
    } else {
        if (baseAmbient) { baseAmbient.color.set(0x404040); baseAmbient.intensity = 0.5; }
        if (basePoint) { basePoint.intensity = 0.8; }
    }

    // Apply room theme (fog, lighting, textures, particles)
    const theme = ROOM_THEMES ? ROOM_THEMES[roomId] : null;
    if (theme) {
        // Override fog
        scene.background = new THREE.Color(theme.fog.color);
        scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);

        // Override ambient light
        if (baseAmbient) {
            baseAmbient.color.set(theme.ambient.color);
            baseAmbient.intensity = theme.ambient.intensity;
        }
        // Dim base point light (theme provides its own)
        if (basePoint) basePoint.intensity = 0;

        // Add theme-specific lights
        for (const lightDef of theme.lights) {
            const light = new THREE.PointLight(lightDef.color, lightDef.intensity, lightDef.dist);
            light.position.set(lightDef.pos[0], lightDef.pos[1], lightDef.pos[2]);
            scene.add(light);
            worldObjects.push(light);
        }
    }

    const { w, h, d } = roomDef.size;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(w, d);
    let floorMat;
    if (theme) {
        const floorTex = getThemeFloorTexture(theme.name, w, d);
        floorMat = new THREE.MeshStandardMaterial({
            map: floorTex, side: THREE.DoubleSide, roughness: 0.8
        });
    } else {
        floorMat = new THREE.MeshStandardMaterial({
            color: roomDef.color, side: THREE.DoubleSide
        });
    }
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);
    worldObjects.push(floor);

    // Ceiling
    const ceiling = floor.clone();
    ceiling.position.y = h;
    scene.add(ceiling);
    worldObjects.push(ceiling);

    // Walls
    let wallMat;
    if (theme) {
        const wallTex = getThemeWallTexture(theme.name, w, h);
        wallMat = new THREE.MeshStandardMaterial({
            map: wallTex, side: THREE.DoubleSide, roughness: 0.7
        });
    } else {
        wallMat = new THREE.MeshStandardMaterial({
            color: roomDef.wallColor, side: THREE.DoubleSide
        });
    }
    addWall(w, h, 0, h/2, -d/2, 0, wallMat);
    addWall(w, h, 0, h/2, d/2, 0, wallMat);
    addWall(d, h, -w/2, h/2, 0, Math.PI/2, wallMat);
    addWall(d, h, w/2, h/2, 0, Math.PI/2, wallMat);

    // Position camera at room entrance
    camera.position.set(0, 2, d/2 - 3);
    // Memorise la position de spawn pour les puits sans fond
    STATE.spawnPosition = { x: 0, y: 2, z: d/2 - 3 };
    euler.set(0, 0, 0);
    camera.quaternion.setFromEuler(euler);

    dbg('Room loaded, bg:', roomDef.color.toString(16), 'cam:', camera.position.x.toFixed(1), camera.position.y.toFixed(1), camera.position.z.toFixed(1), 'objects:', worldObjects.length);

    switch(roomId) {
        case 'tutorial': dbg('Building tutorial...'); buildTutorial(); dbg('Tutorial built, objects:', worldObjects.length, 'pickables:', pickables.length); break;
        case 'hub': buildHub(); break;
        case 'room_doors': buildDoorRoom(); break;
        case 'corridor_infinite': buildInfiniteCorridor(); break;
        case 'labyrinth': buildLabyrinth(); break;
        case 'orb_chamber': buildOrbChamber(); break;
        case 'button_room': buildButtonRoom(); break;
        case 'cube_room': buildCubeRoom(); break;
        case 'weight_room': buildWeightRoom(); break;
        default:
            if (roomId.startsWith('puzzle_')) buildPuzzleRoom(roomId);
            break;
    }

    // Spawn room particles
    if (theme && theme.particles) {
        spawnRoomParticles(theme.particles, roomDef.size);
    }

    updateHUD();
}

function addWall(w, h, x, y, z, rotY, mat) {
    const geo = new THREE.PlaneGeometry(w, h);
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, y, z);
    wall.rotation.y = rotY;
    scene.add(wall);
    worldObjects.push(wall);
    return wall;
}

function addBox(w, h, d, x, y, z, color, interactive) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color });
    const box = new THREE.Mesh(geo, mat);
    box.position.set(x, y, z);
    scene.add(box);
    worldObjects.push(box);
    if (interactive) {
        box.userData = interactive;
        interactables.push(box);
    }
    return box;
}

function addSphere(radius, x, y, z, color, interactive) {
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.5
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(x, y, z);
    scene.add(sphere);
    worldObjects.push(sphere);
    if (interactive) {
        sphere.userData = interactive;
        interactables.push(sphere);
    }
    return sphere;
}

// --- COLLISION ---
const PLAYER_RADIUS = 0.4;

function checkCollision(newPos) {
    const room = ROOMS[currentRoom];
    if (!room) return newPos;

    const { w, d } = room.size;
    const margin = PLAYER_RADIUS + 0.1;

    // Wall boundaries
    newPos.x = Math.max(-w/2 + margin, Math.min(w/2 - margin, newPos.x));
    newPos.z = Math.max(-d/2 + margin, Math.min(d/2 - margin, newPos.z));

    // Tutorial barrier wall (blocks passage until puzzle solved)
    if (currentRoom === 'tutorial' && STATE.tutoBarrier && !STATE.tutoBarrierOpen) {
        const barrierZ = -2.5;
        if (newPos.z < barrierZ + margin) {
            newPos.z = barrierZ + margin;
        }
    }

    // Object collisions (cubes, boxes, etc.)

    // Object collisions - only with solid non-pickable objects (walls, pedestals, etc.)
    for (const obj of worldObjects) {
        if (!obj.isMesh || obj === STATE.carriedObject) continue;
        if (obj.userData && obj.userData.pickable) continue; // cubes don't block
        if (obj.userData && obj.userData._tutoArrow) continue; // arrows don't block
        if (!obj.geometry || !obj.geometry.parameters) continue;

        const p = obj.geometry.parameters;
        if (p.width === undefined) continue;

        // Skip thin planes (floors, walls, markers)
        if ((p.depth || 0) < 0.2 && (p.width || 0) > 5) continue;
        if ((p.width || 0) < 0.15) continue;

        const ohw = (p.width || 1) / 2;
        const ohd = (p.depth || 1) / 2;
        const ox = obj.position.x;
        const oz = obj.position.z;

        const closestX = Math.max(ox - ohw, Math.min(ox + ohw, newPos.x));
        const closestZ = Math.max(oz - ohd, Math.min(oz + ohd, newPos.z));
        const dx = newPos.x - closestX;
        const dz = newPos.z - closestZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < PLAYER_RADIUS && dist > 0) {
            const pushBack = PLAYER_RADIUS - dist;
            newPos.x += (dx / dist) * pushBack;
            newPos.z += (dz / dist) * pushBack;
        }
    }

    // Pickable cubes: gentle push when walking into them (no blocking)
    const allPickable = [...pickables];
    for (const obj of worldObjects) {
        if (obj.userData && obj.userData.pickable && !pickables.includes(obj) && obj !== STATE.carriedObject) {
            allPickable.push(obj);
        }
    }
    for (const obj of allPickable) {
        if (obj === STATE.carriedObject) continue;
        const dx = newPos.x - obj.position.x;
        const dz = newPos.z - obj.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const pushRadius = 0.8;

        if (dist < pushRadius && dist > 0.01) {
            const force = (pushRadius - dist) * 0.08;
            obj.position.x -= (dx / dist) * force;
            obj.position.z -= (dz / dist) * force;

            // Keep inside room
            const roomMargin = 0.5;
            obj.position.x = Math.max(-w/2 + roomMargin, Math.min(w/2 - roomMargin, obj.position.x));
            obj.position.z = Math.max(-d/2 + roomMargin, Math.min(d/2 - roomMargin, obj.position.z));
        }
    }

    return newPos;
}

// --- THEME HELPERS ---
function getThemeFloorTexture(themeName, w, d) {
    const texFns = {
        training: createStoneTexture,
        crystal: createCrystalTexture,
        space: createStarfieldTexture,
        forest: createGrassTexture,
        lava: createLavaTexture,
        ice: createIceTexture,
        abyss: createAbyssTexture,
        desert: createSandTexture,
        neon: createNeonGridTexture,
        void: createVoidCheckerTexture
    };
    const fn = texFns[themeName];
    if (!fn) return null;
    const tex = fn(256, 256);
    tex.repeat.set(w / 4, d / 4);
    return tex;
}

function getThemeWallTexture(themeName, w, h) {
    const texFns = {
        training: createStoneTexture,
        crystal: createCrystalTexture,
        space: createStarfieldTexture,
        forest: createBarkTexture,
        lava: createStoneTexture,
        ice: createIceTexture,
        abyss: createAbyssTexture,
        desert: createSandTexture,
        neon: createNeonGridTexture,
        void: createVoidCheckerTexture
    };
    const fn = texFns[themeName];
    if (!fn) return null;
    const tex = fn(256, 256);
    tex.repeat.set(w / 4, h / 4);
    return tex;
}

function spawnRoomParticles(type, roomSize) {
    const factories = {
        dust: createDustParticles,
        fireflies: createFireflyParticles,
        snow: createSnowParticles,
        embers: createEmberParticles,
        stars: createStarParticles,
        abyss: createAbyssParticles,
        neon: createNeonParticles,
        void: createVoidParticles
    };
    const fn = factories[type];
    if (fn) fn(roomSize);
}
