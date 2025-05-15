let scene, camera, renderer, player;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isJumping = false;
let debugMode = false;
let debugInfo;
let velocityY = 0;
const moveSpeed = 0.1;
const jumpForce = 0.2;
const gravity = -0.01;

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

    // Générer un terrain procédural
    const terrainSize = 50;
    const terrainSegments = 200;
    const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    
    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const height = noise.noise2D(x * 0.05, y * 0.05) * 3;
        vertices[i + 2] = height;
    }
    terrainGeometry.attributes.position.needsUpdate = true;
    terrainGeometry.computeVertexNormals();

    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(10, 10);

    const terrainMaterial = new THREE.MeshPhongMaterial({
        map: grassTexture,
        shininess: 10
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Joueur (modèle humanoïde simple : cylindre pour le corps, sphère pour la tête)
    player = new THREE.Group(); // Utiliser un groupe pour combiner plusieurs formes

    // Corps (cylindre)
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x1e90ff, shininess: 30 }); // Bleu Dodger
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5; // Centré à mi-hauteur
    body.castShadow = true;
    body.receiveShadow = true;
    player.add(body);

    // Tête (sphère)
    const headGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 30 }); // Jaune Doré
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.1; // Au-dessus du corps
    head.castShadow = true;
    head.receiveShadow = true;
    player.add(head);

    // Position initiale du joueur
    const initialTerrainHeight = noise.noise2D(0 * 0.1, 0 * 0.1) * 3;
    player.position.set(0, initialTerrainHeight + 1, 0); // Touche le sol au démarrage
    player.rotation.y = 0;
    scene.add(player);

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
    });

    document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === document.body;
    });

    // Contrôle de la caméra avec la souris (seulement si verrouillé)
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
    const terrainHeight = noise.noise2D(player.position.x * 0.1, player.position.z * 0.1) * 3;
    if (player.position.y <= terrainHeight + 1) {
        player.position.y = terrainHeight + 1;
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