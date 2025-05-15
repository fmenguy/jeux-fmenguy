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
    const terrainSize = 50;
    const terrainSegments = 100;
    const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    const terrainMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: false });

    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const height = noise.noise2D(x * 0.1, y * 0.1) * 2;
        vertices[i + 2] = height;
    }
    terrainGeometry.attributes.position.needsUpdate = true;
    terrainGeometry.computeVertexNormals();

    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    scene.add(terrain);

    // Joueur (cube simple)
    const playerGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 2, 0);
    scene.add(player);

    // Caméra troisième personne
    camera.position.set(player.position.x, player.position.y + 2, player.position.z + 5);
    camera.lookAt(player.position);

    // Contrôles adaptés pour AZERTY (ZQSD)
    window.addEventListener('keydown', (e) => {
        console.log('Touche pressée:', e.code); // Débogage
        switch (e.code) {
            case 'KeyZ': moveForward = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyQ': moveLeft = true; break;
            case 'KeyD': moveRight = true; break;
        }
    });

    window.addEventListener('keyup', (e) => {
        console.log('Touche relâchée:', e.code); // Débogage
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

    // Calculer les directions en fonction de l'orientation du joueur
    const forwardDirection = new THREE.Vector3(
        -Math.sin(player.rotation.y), // Direction devant
        0,
        -Math.cos(player.rotation.y)
    ).normalize();

    const rightDirection = new THREE.Vector3(
        Math.cos(player.rotation.y), // Direction à droite
        0,
        -Math.sin(player.rotation.y)
    ).normalize();

    // Déplacement du joueur
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

    // Ajuster la hauteur du joueur en fonction du terrain
    const terrainHeight = noise.noise2D(player.position.x * 0.1, player.position.z * 0.1) * 2;
    player.position.y = terrainHeight + 1;

    // Mettre à jour la caméra
    camera.position.x = player.position.x - Math.sin(player.rotation.y) * 5;
    camera.position.z = player.position.z - Math.cos(player.rotation.y) * 5;
    camera.position.y = player.position.y + 2;
    camera.lookAt(player.position);

    renderer.render(scene, camera);
}

init();
animate();