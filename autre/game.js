let scene, camera, renderer, player, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const moveSpeed = 0.1;

// Initialisation de Simplex Noise
const noise = new SimplexNoise();

function init() {
    // Scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Ciel bleu

    // Caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Rendu
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Générer un terrain procédural
    const terrainSize = 50; // Taille du terrain (50x50)
    const terrainSegments = 100; // Nombre de segments pour plus de détails
    const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    const terrainMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: false }); // Vert comme de l'herbe

    // Ajuster les hauteurs des vertices avec du bruit
    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];
        // Utiliser le bruit pour générer une hauteur
        const height = noise.noise2D(x * 0.1, y * 0.1) * 2; // Échelle et amplitude du bruit
        vertices[i + 2] = height; // Ajuster la hauteur (z)
    }
    terrainGeometry.attributes.position.needsUpdate = true;
    terrainGeometry.computeVertexNormals(); // Recalculer les normales pour un éclairage plus naturel

    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    scene.add(terrain);

    // Joueur (cube simple)
    const playerGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Rouge
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 2, 0); // Positionner au-dessus du terrain
    scene.add(player);

    // Caméra troisième personne
    camera.position.set(player.position.x, player.position.y + 2, player.position.z + 5);
    camera.lookAt(player.position);

    // Contrôles adaptés pour AZERTY (ZQSD)
    window.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyZ': moveForward = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyQ': moveLeft = true; break;
            case 'KeyD': moveRight = true; break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyZ': moveForward = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyQ': moveLeft = false; break;
            case 'KeyD': moveRight = false; break;
        }
    });

    // Contrôle de la caméra avec la souris
    document.addEventListener('mousemove', (e) => {
        const sensitivity = 0.002;
        player.rotation.y -= e.movementX * sensitivity;
        camera.position.x = player.position.x - Math.sin(player.rotation.y) * 5;
        camera.position.z = player.position.z - Math.cos(player.rotation.y) * 5;
        camera.position.y = player.position.y + 2;
        camera.lookAt(player.position);
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function animate() {
    requestAnimationFrame(animate);

    // Déplacement du joueur
    if (moveForward) {
        player.position.x -= Math.sin(player.rotation.y) * moveSpeed;
        player.position.z -= Math.cos(player.rotation.y) * moveSpeed;
    }
    if (moveBackward) {
        player.position.x += Math.sin(player.rotation.y) * moveSpeed;
        player.position.z += Math.cos(player.rotation.y) * moveSpeed;
    }
    if (moveLeft) {
        player.position.x -= Math.cos(player.rotation.y) * moveSpeed;
        player.position.z += Math.sin(player.rotation.y) * moveSpeed;
    }
    if (moveRight) {
        player.position.x += Math.cos(player.rotation.y) * moveSpeed;
        player.position.z -= Math.sin(player.rotation.y) * moveSpeed;
    }

    // Ajuster la hauteur du joueur en fonction du terrain
    const terrainHeight = noise.noise2D(player.position.x * 0.1, player.position.z * 0.1) * 2;
    player.position.y = terrainHeight + 1; // Garder le joueur au-dessus du terrain

    // Mettre à jour la caméra
    camera.position.x = player.position.x - Math.sin(player.rotation.y) * 5;
    camera.position.z = player.position.z - Math.cos(player.rotation.y) * 5;
    camera.position.y = player.position.y + 2;
    camera.lookAt(player.position);

    renderer.render(scene, camera);
}

init();
animate();