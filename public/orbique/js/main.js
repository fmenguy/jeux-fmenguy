// ============================================================
// ORBIQUE - MAIN GAME
// ============================================================

// --- GAME STATE ---
const STATE = {
    started: false,
    difficulty: null,
    controlsInverted: { horizontal: false, vertical: false },
    unlockMode: false,
    comboInput: '',
    inventory: {
        keys: 0,
        plans: [],
        orbs: { whiteI: false, whiteII: false, blackI: false, blackII: false }
    },
    doorsUnlocked: [],
    roomsCompleted: [],
    currentZone: 'hub',
    totalPlans: 10,
    lastDirection: null,
    worldSeed: 0,
    corridorHistory: [],
    portalCooldown: false,
    // Mecanique "reculer pour reveler"
    backwardDiscovered: false,    // active des qu'utilisee dans le corridor
    visitedRooms: [],             // rooms ou le joueur est passe au moins une fois
    hubColorsRevealed: false,     // portails colores affiches dans le hub
    // Sauvegarde (debloquee par la clef de sauvegarde)
    canSave: false,               // joueur a trouve la clef de sauvegarde
    saveKeyClaimed: false,        // pour ne pas re-spawn la clef
    fellInWell: false,            // tombe dans un puit sans fond au moins une fois
    spawnPosition: { x: 0, y: 2, z: 0 }, // position initiale dans la room courante
    // Notes interactives (chaque note de la salle des boutons fait quelque chose)
    canJump: false,               // debloque par la note "avancer" si on recule devant
    notesActivated: {}            // suivi des notes deja declenchees
    currentChest: null,
    // Pick & throw
    carriedObject: null,
    // Tutorial
    tutorialActive: false,
    tutorialStep: 0,
    tutorialCompleted: false,
    // Tutorial puzzle
    tutoPillarSlots: [],   // {x, z} positions for the 3 slots
    tutoBarrier: null,      // the grid barrier mesh
    tutoBarrierOpen: false
};

// --- THREE.JS SETUP ---
let scene, camera, renderer, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let isPointerLocked = false;
let euler = new THREE.Euler(0, 0, 0, 'YXZ');
let worldObjects = [];
let interactables = [];
let pickables = [];
let currentRoom = null;

// Stickman hand
let handMesh = null;
let handCarryMesh = null; // the cube shown in hand when carrying

// Room definitions
const ROOMS = {
    tutorial: { color: 0xc8c8d4, wallColor: 0xb8b8cc, size: { w: 24, h: 6, d: 24 } },
    hub: { color: 0x111111, wallColor: 0x222222, size: { w: 30, h: 8, d: 30 } },
    corridor_infinite: { color: 0x0a0a0a, wallColor: 0x1a1a1a, size: { w: 6, h: 5, d: 200 } },
    room_doors: { color: 0x0d0d0d, wallColor: 0x1d1d1d, size: { w: 40, h: 8, d: 20 } },
    puzzle_1: { color: 0x222222, wallColor: 0x333333, size: { w: 20, h: 6, d: 20 } },
    puzzle_2: { color: 0x0a1a2a, wallColor: 0x102030, size: { w: 20, h: 6, d: 20 } },
    puzzle_3: { color: 0x050010, wallColor: 0x0a0020, size: { w: 22, h: 8, d: 22 } },
    puzzle_4: { color: 0x0a1a0a, wallColor: 0x152015, size: { w: 22, h: 6, d: 22 } },
    puzzle_5: { color: 0x1a0500, wallColor: 0x250a00, size: { w: 20, h: 6, d: 20 } },
    puzzle_6: { color: 0x0a0a1a, wallColor: 0x101020, size: { w: 25, h: 6, d: 25 } },
    puzzle_7: { color: 0x020202, wallColor: 0x080808, size: { w: 15, h: 14, d: 15 } },
    puzzle_8: { color: 0x2a1a0a, wallColor: 0x352010, size: { w: 30, h: 5, d: 10 } },
    puzzle_9: { color: 0x020008, wallColor: 0x050010, size: { w: 20, h: 6, d: 20 } },
    puzzle_10: { color: 0x000000, wallColor: 0x111111, size: { w: 20, h: 6, d: 20 } },
    labyrinth: { color: 0x050505, wallColor: 0x151515, size: { w: 60, h: 4, d: 60 } },
    orb_chamber: { color: 0xffffff, wallColor: 0xeeeeee, size: { w: 10, h: 10, d: 10 } },
    button_room: { color: 0x140020, wallColor: 0x200030, size: { w: 22, h: 7, d: 22 } },
    cube_room:   { color: 0x101820, wallColor: 0x182838, size: { w: 26, h: 8, d: 26 } },
    weight_room: { color: 0x1a1a10, wallColor: 0x252518, size: { w: 22, h: 6, d: 22 } }
};

const ROOM_THEMES = {
    puzzle_1:  { name: 'training', fog: { color: 0x222222, near: 5, far: 40 }, ambient: { color: 0x999999, intensity: 0.6 }, lights: [{ color: 0xcccccc, intensity: 0.8, pos: [0,5,0], dist: 30 }], particles: 'dust' },
    puzzle_2:  { name: 'crystal', fog: { color: 0x0a1a2a, near: 3, far: 35 }, ambient: { color: 0x4488cc, intensity: 0.4 }, lights: [{ color: 0x88ccff, intensity: 0.7, pos: [0,5,0], dist: 25 }, { color: 0x4466aa, intensity: 0.4, pos: [-5,3,5], dist: 15 }], particles: null },
    puzzle_3:  { name: 'space', fog: { color: 0x050010, near: 10, far: 60 }, ambient: { color: 0x110022, intensity: 0.2 }, lights: [{ color: 0x8844cc, intensity: 0.5, pos: [0,8,0], dist: 40 }], particles: 'stars' },
    puzzle_4:  { name: 'forest', fog: { color: 0x0a1a0a, near: 5, far: 30 }, ambient: { color: 0x336633, intensity: 0.5 }, lights: [{ color: 0x88aa44, intensity: 0.6, pos: [0,6,0], dist: 25 }], particles: 'fireflies' },
    puzzle_5:  { name: 'lava', fog: { color: 0x1a0500, near: 3, far: 25 }, ambient: { color: 0x331100, intensity: 0.3 }, lights: [{ color: 0xff4400, intensity: 0.8, pos: [0,4,0], dist: 20 }, { color: 0xff8800, intensity: 0.5, pos: [5,2,-3], dist: 15 }], particles: 'embers' },
    puzzle_6:  { name: 'ice', fog: { color: 0x0a0a1a, near: 5, far: 35 }, ambient: { color: 0x4466aa, intensity: 0.5 }, lights: [{ color: 0xaaccff, intensity: 0.7, pos: [0,5,0], dist: 30 }], particles: 'snow' },
    puzzle_7:  { name: 'abyss', fog: { color: 0x020202, near: 2, far: 20 }, ambient: { color: 0x111111, intensity: 0.15 }, lights: [{ color: 0x444466, intensity: 0.3, pos: [0,9,0], dist: 15 }], particles: 'abyss' },
    puzzle_8:  { name: 'desert', fog: { color: 0x2a1a0a, near: 5, far: 35 }, ambient: { color: 0xaa8844, intensity: 0.5 }, lights: [{ color: 0xffaa44, intensity: 0.7, pos: [0,4,0], dist: 30 }], particles: 'dust' },
    puzzle_9:  { name: 'neon', fog: { color: 0x020008, near: 5, far: 40 }, ambient: { color: 0x110022, intensity: 0.15 }, lights: [{ color: 0xff00ff, intensity: 0.5, pos: [-4,3,0], dist: 15 }, { color: 0x00ffff, intensity: 0.5, pos: [4,3,0], dist: 15 }], particles: 'neon' },
    puzzle_10: { name: 'void', fog: { color: 0x000000, near: 3, far: 30 }, ambient: { color: 0x444444, intensity: 0.3 }, lights: [{ color: 0xffffff, intensity: 0.6, pos: [0,5,0], dist: 25 }], particles: 'void' },
    button_room: { name: 'absurde', fog: { color: 0x140020, near: 4, far: 30 }, ambient: { color: 0x442266, intensity: 0.4 }, lights: [{ color: 0xff44dd, intensity: 0.6, pos: [-5,5,0], dist: 18 }, { color: 0x44ddff, intensity: 0.6, pos: [5,5,0], dist: 18 }], particles: 'neon' },
    cube_room:   { name: 'sandbox', fog: { color: 0x101820, near: 8, far: 40 }, ambient: { color: 0x445566, intensity: 0.6 }, lights: [{ color: 0xffffff, intensity: 0.7, pos: [0,7,0], dist: 30 }], particles: 'dust' },
    weight_room: { name: 'logic',   fog: { color: 0x1a1a10, near: 5, far: 35 }, ambient: { color: 0x665544, intensity: 0.5 }, lights: [{ color: 0xffeecc, intensity: 0.7, pos: [0,5,0], dist: 25 }], particles: null }
};

// Puzzle combos
let COMBOS = {};

function buildCombos() {
    const k = getKeys();
    const f = k.forward.toUpperCase();
    const b = k.backward.toUpperCase();
    const l = k.left.toUpperCase();
    const r = k.right.toUpperCase();

    COMBOS = {};
    // 10 unique chest combos
    COMBOS[f+l+b+r] = 'chest_1';    // ZQSD
    COMBOS[r+b+f+l] = 'chest_2';    // DSZQ
    COMBOS[f+f+b+b] = 'chest_3';    // ZZSS
    COMBOS[l+r+l+r] = 'chest_4';    // QDQD
    COMBOS[f+r+b+l] = 'chest_5';    // ZDSQ
    COMBOS[b+f+r+l] = 'chest_6';    // SZDQ
    COMBOS[r+f+l+b] = 'chest_7';    // DZQS
    COMBOS[l+b+r+f] = 'chest_8';    // QSDZ
    COMBOS[f+l+f+r] = 'chest_9';    // ZQZD
    COMBOS[r+l+f+b] = 'chest_10';   // DQZS

    // Special actions (separate combos)
    COMBOS[b+l+f+r] = 'invert_h';       // SQZD
    COMBOS[r+l+b+f] = 'invert_v';       // DQSZ
    COMBOS[f+f+f+f] = 'reset_controls'; // ZZZZ
    COMBOS[b+b+f+f] = 'reveal_path';    // SSZZ
}

// Returns the combo key string for a given chest number (1-10)
function getChestCombo(num) {
    const target = 'chest_' + num;
    for (const [key, val] of Object.entries(COMBOS)) {
        if (val === target) return key;
    }
    // Fallback
    const k = getKeys();
    return (k.forward + k.left + k.backward + k.right).toUpperCase();
}

// --- DEBUG ---
const DEBUG = true;
function dbg(...args) { if (DEBUG) console.log('[ORBIQUE]', ...args); }

function init() {
    dbg('init() start');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 1, 80);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Base lights
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    ambient.name = 'baseAmbient';
    scene.add(ambient);

    const pointLight = new THREE.PointLight(0xffffff, 0.8, 50);
    pointLight.position.set(0, 5, 0);
    pointLight.name = 'basePoint';
    scene.add(pointLight);

    const playerLight = new THREE.PointLight(0xffffff, 0.3, 20);
    camera.add(playerLight);
    scene.add(camera);

    // Create stickman hand (attached to camera)
    createHand();

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('resize', onResize);

    dbg('init() done');
    animate();
}

// --- STICKMAN HAND ---
function createHand() {
    // Arm: thin cylinder
    const armGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.6, 8);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8 });
    const arm = new THREE.Mesh(armGeo, skinMat);
    arm.rotation.z = -0.3;
    arm.rotation.x = -0.4;
    arm.position.set(0.35, -0.32, -0.5);

    // Hand: small sphere
    const handGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.set(0, -0.3, 0);
    arm.add(hand);

    // Fingers: 3 small cylinders
    for (let i = 0; i < 3; i++) {
        const fingerGeo = new THREE.CylinderGeometry(0.015, 0.012, 0.08, 4);
        const finger = new THREE.Mesh(fingerGeo, skinMat);
        finger.position.set(-0.03 + i * 0.03, -0.34, 0.02);
        finger.rotation.x = 0.3;
        arm.add(finger);
    }

    handMesh = arm;
    camera.add(handMesh);

    // Carried cube placeholder (hidden by default)
    const carryGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const carryMat = new THREE.MeshStandardMaterial({ color: 0x3366cc, roughness: 0.4 });
    handCarryMesh = new THREE.Mesh(carryGeo, carryMat);
    handCarryMesh.position.set(0, -0.22, -0.02);
    handCarryMesh.visible = false;
    arm.add(handCarryMesh);
}

function showHandCarrying(show, color) {
    if (!handCarryMesh) return;
    handCarryMesh.visible = show;
    if (show && color !== undefined) {
        handCarryMesh.material.color.set(color);
    }
    // Adjust fingers when carrying
    if (handMesh) {
        // Curl fingers slightly more when carrying
        handMesh.rotation.x = show ? -0.6 : -0.4;
    }
}

// Bouton plein ecran dans le menu
window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('fullscreenBtn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const el = document.documentElement;
            if (!document.fullscreenElement) {
                if (el.requestFullscreen) el.requestFullscreen();
                else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
    }
});

function startGame(difficulty) {
    dbg('startGame()', difficulty);
    STATE.difficulty = difficulty;
    STATE.started = true;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('inventoryPanel').style.display = 'block';

    renderer.domElement.requestPointerLock();

    if (!STATE.tutorialCompleted) {
        try {
            loadRoom('tutorial');
            startTutorial();
        } catch(e) {
            console.error('[ORBIQUE] Error loading tutorial:', e);
        }
    } else {
        loadRoom('hub');
    }
    notify(t('diffStart', difficulty));
}

// Override setLanguage
const _origSetLanguage = setLanguage;
setLanguage = function(lang) {
    _origSetLanguage(lang);
    buildCombos();
    document.getElementById('langSelect').style.display = 'none';
    document.getElementById('menu').style.display = 'flex';
    spawnParticles('menuParticles', 30);
};

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    if (!STATE.started) return;

    const delta = clock.getDelta();
    const speed = 8;

    velocity.x = 0;
    velocity.z = 0;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z = direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x = direction.x * speed * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const newPos = camera.position.clone();
    newPos.add(forward.multiplyScalar(velocity.z));
    newPos.add(right.multiplyScalar(velocity.x));
    newPos.y = 2;

    camera.position.copy(checkCollision(newPos));

    // Update carried object (the real 3D object follows in world space)
    if (STATE.carriedObject) {
        updateCarriedObject();
    }

    checkNonEuclidean();
    checkProximity();
    checkWells();
    checkButtonRoomTimers(delta);
    checkCubeTarget();
    checkWeightRoom();
    updateInteractHint();

    // Tutorial
    if (STATE.tutorialActive) {
        updateTutoArrows();
        checkTutoPillarPuzzle();
        if (STATE.tutorialStep === 0 && (moveForward || moveBackward || moveLeft || moveRight)) {
            STATE._tutoMoved = true;
        }
    }

    // Subtle hand sway
    if (handMesh) {
        const t2 = performance.now() * 0.001;
        handMesh.position.y = -0.32 + Math.sin(t2 * 2) * 0.005;
    }

    // Update particles
    if (typeof updateParticles === 'function') updateParticles(delta);

    // Update animated textures
    if (typeof updateAnimatedTextures === 'function') updateAnimatedTextures(performance.now());

    // Animate floating hint letters
    for (const obj of worldObjects) {
        if (obj.userData && obj.userData._floatingHint) {
            obj.userData._time += 0.02;
            obj.position.y = obj.userData._baseY + Math.sin(obj.userData._time) * 0.15;
            obj.rotation.y += 0.015;
        }
    }

    renderer.render(scene, camera);
}

// --- CARRY SYSTEM ---
function updateCarriedObject() {
    if (!STATE.carriedObject) return;
    const obj = STATE.carriedObject;

    // Position in front of camera, closer
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const targetPos = camera.position.clone().add(dir.multiplyScalar(1.8));
    targetPos.y = camera.position.y - 0.5;

    obj.position.lerp(targetPos, 0.2);
    // Slight rotation
    obj.rotation.y += 0.01;
}

function pickUpObject(obj) {
    dbg('pickUpObject', obj.userData);
    STATE.carriedObject = obj;
    interactables = interactables.filter(i => i !== obj);
    pickables = pickables.filter(p => p !== obj);

    // Show in hand
    const color = obj.material ? obj.material.color.getHex() : 0x3366cc;
    showHandCarrying(true, color);
    showCarryIndicator(t('carrying'));
}

function throwObject() {
    if (!STATE.carriedObject) return;
    const obj = STATE.carriedObject;
    dbg('throwObject');

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const throwForce = 8;
    const throwVel = dir.clone().multiplyScalar(throwForce);

    let vy = 2;
    const gravity = -15;
    let bounces = 0;
    const room = ROOMS[currentRoom];
    const hw = room ? room.size.w / 2 - 0.5 : 50;
    const hd = room ? room.size.d / 2 - 0.5 : 50;

    STATE.carriedObject = null;
    showHandCarrying(false);
    hideCarryIndicator();

    function throwAnim() {
        if (STATE.carriedObject === obj) return;

        obj.position.x += throwVel.x * 0.016;
        obj.position.z += throwVel.z * 0.016;
        vy += gravity * 0.016;
        obj.position.y += vy * 0.016;

        obj.rotation.x += 0.08;
        obj.rotation.z += 0.04;

        // Room bounds
        if (obj.position.x < -hw || obj.position.x > hw) { throwVel.x *= -0.5; obj.position.x = Math.max(-hw, Math.min(hw, obj.position.x)); }
        if (obj.position.z < -hd || obj.position.z > hd) { throwVel.z *= -0.5; obj.position.z = Math.max(-hd, Math.min(hd, obj.position.z)); }

        if (obj.position.y <= 0.4) {
            obj.position.y = 0.4;
            if (bounces < 2 && Math.abs(vy) > 1.5) {
                vy = -vy * 0.25;
                throwVel.multiplyScalar(0.4);
                bounces++;
                requestAnimationFrame(throwAnim);
            } else {
                // Settled
                vy = 0;
                obj.rotation.x = 0;
                obj.rotation.z = 0;
                pickables.push(obj);
            }
        } else {
            requestAnimationFrame(throwAnim);
        }
    }

    requestAnimationFrame(throwAnim);

    // Tutorial: detect throw
    if (STATE.tutorialActive && STATE.tutorialStep === 2) {
        setTimeout(() => advanceTutorial(), 500);
    }
}

// --- TUTORIAL PILLAR PUZZLE ---
function checkTutoPillarPuzzle() {
    if (STATE.tutoBarrierOpen || STATE.tutorialStep < 3) return;

    const slots = STATE.tutoPillarSlots;
    if (slots.length === 0) return;

    // Check if a cube is on each slot
    let filledSlots = 0;
    for (const slot of slots) {
        let cubeOnSlot = false;
        for (const p of pickables) {
            const dx = p.position.x - slot.x;
            const dz = p.position.z - slot.z;
            if (Math.sqrt(dx*dx + dz*dz) < 0.8 && p.position.y < 1.5) {
                cubeOnSlot = true;
                break;
            }
        }
        // Also check thrown cubes that settled
        if (!cubeOnSlot) {
            for (const obj of worldObjects) {
                if (obj.userData && obj.userData.pickable && obj !== STATE.carriedObject) {
                    const dx = obj.position.x - slot.x;
                    const dz = obj.position.z - slot.z;
                    if (Math.sqrt(dx*dx + dz*dz) < 0.8 && obj.position.y < 1.5) {
                        cubeOnSlot = true;
                        break;
                    }
                }
            }
        }
        if (cubeOnSlot) filledSlots++;
    }

    dbg('Pillar puzzle:', filledSlots, '/', slots.length);

    if (filledSlots >= slots.length) {
        // Open the barrier!
        STATE.tutoBarrierOpen = true;
        openTutoBarrier();
        notify(t('tutoBarrierOpen'));
    }
}

function openTutoBarrier() {
    if (!STATE.tutoBarrier) return;

    // Animate barrier dissolving
    const barrier = STATE.tutoBarrier;
    let opacity = 1;
    function dissolve() {
        opacity -= 0.03;
        if (barrier.material) {
            barrier.material.opacity = Math.max(0, opacity);
        }
        // Also dissolve children
        barrier.traverse(child => {
            if (child.material) child.material.opacity = Math.max(0, opacity);
        });
        if (opacity > 0) {
            requestAnimationFrame(dissolve);
        } else {
            scene.remove(barrier);
            worldObjects = worldObjects.filter(o => o !== barrier);
            STATE.tutoBarrier = null;
        }
    }
    requestAnimationFrame(dissolve);
}

// --- INIT ---
window.addEventListener('DOMContentLoaded', init);
