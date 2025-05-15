let scene, camera, renderer, player;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isJumping = false;
let debugMode = false;
let debugInfo;
let velocityY = 0; // Vélocité verticale pour le saut
const moveSpeed = 0.1;
const jumpForce = 0.2; // Force du saut
const gravity = -0.01; // Gravité pour faire redescendre le joueur

// Configuration des touches pour AZERTY
const controlsConfig = {
    forward: 'z',  // Touche Z sur AZERTY
    backward: 's', // Touche S
    left: 'q',     // Touche Q
    right: 'd',    // Touche D
    jump: ' '      // Touche Espace pour sauter
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
    renderer.shadowMap.enabled = true; // Activer les ombres
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ombres douces
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
    const terrainSegments = 200; // Plus de segments pour plus de détails
    const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    
    // Ajuster les hauteurs avec du bruit
    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const height = noise.noise2D(x * 0.05, y * 0.05) * 3; // Hauteur plus variée
        vertices[i + 2] = height;
    }
    terrainGeometry.attributes.position.needsUpdate = true;
    terrainGeometry.computeVertexNormals();

    // Texture pour le terrain (style herbe)
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(10, 10); // Répéter la texture pour couvrir le terrain

    const terrainMaterial = new THREE.MeshPhongMaterial({
        map: grassTexture,
        shininess: 10
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true; // Le terrain reçoit des ombres
    scene.add(terrain);

    // Joueur (modèle simple avec texture)
    const playerGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const playerTexture = textureLoader.load('https://threejs.org/examples/textures/crate.gif'); // Texture simple pour le joueur
    const playerMaterial = new THREE.MeshPhongMaterial({
        map: playerTexture,
        shininess: 30
    });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 2, 0);
    player.rotation.y = 0;
    player.castShadow = true; // Le joueur projette une ombre
    player.receiveShadow = true;
    scene.add(player);

    // Éclairage
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Lumière ambiante douce
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

    // Créer un élément pour afficher les infos de debug (initialement caché)
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
                if (!isJumping) { // Sauter uniquement si le joueur est au sol
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

    // Contrôle de la caméra avec la souris
    document.addEventListener('mousemove', (e) => {
        const sensitivity = 0.002;
        player.rotation.y -= e.movementX * sensitivity;
        updateCameraPosition();
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
        velocityY += gravity; // Appliquer la gravité
        player.position.y += velocityY;
    }

    // Ajuster la hauteur du joueur en fonction du terrain
    const terrainHeight = noise.noise2D(player.position.x * 0.1, player.position.z * 0.1) * 3;
    if (player.position.y <= terrainHeight + 1) {
        player.position.y = terrainHeight + 1;
        velocityY = 0;
        isJumping = false; // Le joueur a atterri
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