let scene, camera, renderer, player;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isJumping = false;
let debugMode = false;
let debugInfo;
let velocityY = 0;
let heightMap = [];
const terrainSize = 50;
const terrainResolution = 1;
const moveSpeed = 0.1;
const jumpForce = 0.2;
const gravity = -0.01;
const playerHeight = 1; // Hauteur totale du joueur (cylindre)

// Configuration des touches pour AZERTY
const controlsConfig = {
    forward: 'z',
    backward: 's',
    left: 'q',
    right: 'd',
    jump: ' '
};

// Initialisation de Simplex Noise
const noise = new SimplexNoise();

function init() {
    console.log("Initialisation du jeu...");

    // Scène
    scene = new THREE.Scene();

    // Caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 5);

    // Rendu
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Ajouter un ciel (skybox)
    const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyboxMaterial = new THREE.MeshBasicMaterial({
        color: 0x87ceeb,
        side: THREE.BackSide
    });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);

    // Générer une grille de hauteurs pour le terrain
    const gridSize = Math.floor(terrainSize / terrainResolution);
    for (let x = 0; x <= gridSize; x++) {
        heightMap[x] = [];
        for (let z = 0; z <= gridSize; z++) {
            const worldX = (x - gridSize / 2) * terrainResolution;
            const worldZ = (z - gridSize / 2) * terrainResolution;
            heightMap[x][z] = noise.noise2D(worldX * 0.05, worldZ * 0.05) * 3;
        }
    }

    // Générer une surface cubique grise
    const cubeGeometry = new THREE.BoxGeometry(terrainResolution, 1, terrainResolution);
    const cubeMaterial = new THREE.MeshPhongMaterial({ color: 0x808080, shininess: 10 });
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            const worldX = (x - gridSize / 2) * terrainResolution;
            const worldZ = (z - gridSize / 2) * terrainResolution;
            const height = heightMap[x][z];
            cube.position.set(worldX + terrainResolution / 2, height, worldZ + terrainResolution / 2); // Position ajustée
            cube.receiveShadow = true;
            scene.add(cube);
        }
    }

    // Joueur (modèle humanoïde : cylindre pour le corps, sphère pour la tête)
    player = new THREE.Group();
    console.log("Création du joueur (cylindre + sphère)...");

    // Corps (cylindre)
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x1e90ff, shininess: 30 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    player.add(body);

    // Tête (sphère)
    const headGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 30 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.1;
    head.castShadow = true;
    head.receiveShadow = true;
    player.add(head);

    // Position initiale du joueur
    const initialTerrainHeight = heightMap[Math.floor(gridSize / 2)][Math.floor(gridSize / 2)];
    player.position.set(0, initialTerrainHeight + playerHeight, 0); // Touche le dessus des cubes
    player.rotation.y = 0;
    scene.add(player);
    console.log("Position initiale du joueur:", player.position.y);

    // Éclairage
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    // Positionner la caméra derrière le joueur
    updateCameraPosition();

    // Créer un élément pour afficher les infos de debug
    debugInfo = document.createElement('div');
    debugInfo.style.position = 'absolute';
    debugInfo.style.top = '50px';
    debugInfo.style.left = '10px';
    debugInfo.style.color = 'white';
    debugInfo.style.background = 'rgba(0, 0, 0, 0.5)';
    debugInfo.style.padding = '5px';
    debugInfo.style.display = 'none';
    document.body.appendChild(debugInfo);

    // Contrôles pour AZERTY
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        switch (key) {
            case controlsConfig.forward: moveForward = true; break;
            case controlsConfig.backward: moveBackward = true; break;
            case controlsConfig.left: moveLeft = true; break;
            case controlsConfig.right: moveRight = true; break;
            case controlsConfig.jump: 
                if (!isJumping) {
                    velocityY = jumpForce;
                    isJumping = true;
                    console.log("Saut déclenché");
                }
                break;
            case '$':
                debugMode = !debugMode;
                debugInfo.style.display = debugMode ? 'block' : 'none';
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        switch (key) {
            case controlsConfig.forward: moveForward = false; break;
            case controlsConfig.backward: moveBackward = false; break;
            case controlsConfig.left: moveLeft = false; break;
            case controlsConfig.right: moveRight = false; break;
        }
    });

    // Pointer Lock API pour verrouiller la souris
    let isLocked = false;
    document.addEventListener('click', () => {
        document.body.requestPointerLock();
        console.log("Demande de verrouillage de la souris...");
    });

    document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === document.body;
        console.log("État du verrouillage:", isLocked ? "Verrouillé" : "Déverrouillé");
    });

    document.addEventListener('mousemove', (e) => {
        if (isLocked) {
            const sensitivity = 0.002;
            player.rotation.y -= e.movementX * sensitivity;
            updateCameraPosition();
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function updateCameraPosition() {
    const distance = 5;
    camera.position.x = player.position.x + Math.sin(player.rotation.y) * distance;
    camera.position.z = player.position.z + Math.cos(player.rotation.y) * distance;
    camera.position.y = player.position.y + 2;
    camera.lookAt(player.position);
}

function getTerrainHeight(x, z) {
    // Convertir les coordonnées mondiales en indices de la grille
    const gridX = Math.floor((x + terrainSize / 2) / terrainResolution);
    const gridZ = Math.floor((z + terrainSize / 2) / terrainResolution);

    // Vérifier les limites de la grille
    if (gridX < 0 || gridX >= heightMap.length || gridZ < 0 || gridZ >= heightMap[0].length) {
        return 0;
    }

    // Retourner la hauteur directement (sans interpolation pour plus de précision)
    return heightMap[gridX][gridZ];
}

function animate() {
    requestAnimationFrame(animate);

    // Calculer les directions en fonction de l'orientation du joueur
    const forwardDirection = new THREE.Vector3(
        -Math.sin(player.rotation.y),
        0,
        -Math.cos(player.rotation.y)
    ).normalize();

    const rightDirection = new THREE.Vector3(
        Math.cos(player.rotation.y),
        0,
        -Math.sin(player.rotation.y)
    ).normalize();

    // Déplacement horizontal du joueur
    if (moveForward) {
        player.position.x += forwardDirection.x * moveSpeed;
        player.position.z += forwardDirection.z * moveSpeed;
    }
    if (moveBackward) {
        player.position.x -= forwardDirection.x * moveSpeed;
        player.position.z -= forwardDirection.z * moveSpeed;
    }
    if (moveLeft) {
        player.position.x -= rightDirection.x * moveSpeed;
        player.position.z -= rightDirection.z * moveSpeed;
    }
    if (moveRight) {
        player.position.x += rightDirection.x * moveSpeed;
        player.position.z += rightDirection.z * moveSpeed;
    }

    // Gestion du saut et de la gravité
    if (isJumping) {
        velocityY += gravity;
        player.position.y += velocityY;
    }

    // Ajuster la hauteur du joueur en fonction du terrain
    const terrainHeight = getTerrainHeight(player.position.x, player.position.z);
    if (player.position.y <= terrainHeight + playerHeight) {
        player.position.y = terrainHeight + playerHeight;
        velocityY = 0;
        isJumping = false;
    }

    // Mettre à jour la caméra
    updateCameraPosition();

    // Mettre à jour les infos de debug si le mode est activé
    if (debugMode) {
        debugInfo.innerHTML = `
            Touches actives:<br>
            Avancer (Z): ${moveForward}<br>
            Reculer (S): ${moveBackward}<br>
            Gauche (Q): ${moveLeft}<br>
            Droite (D): ${moveRight}<br>
            Saut (Espace): ${isJumping}<br>
            Rotation Y: ${player.rotation.y.toFixed(2)} rad<br>
            Direction Avant: x=${forwardDirection.x.toFixed(2)}, z=${forwardDirection.z.toFixed(2)}
        `;
    }

    renderer.render(scene, camera);
}

init();
animate();