// particles.js - Lightweight particle systems using THREE.Points
// Uses globals: scene, worldObjects (from main.js/world.js)

let activeParticleSystems = [];

const PARTICLE_MAX_PER_ROOM = 500;

// ─── Core System ────────────────────────────────────────────────────────────

function createParticleSystem(config) {
    const count = Math.min(config.count || 100, PARTICLE_MAX_PER_ROOM);
    const spread = config.spread || { x: 10, y: 10, z: 10 };
    const speed = config.speed || 1.0;
    const direction = config.direction || { x: 0, y: 0, z: 0 };
    const opacity = config.opacity !== undefined ? config.opacity : 0.6;
    const size = config.size || 0.05;
    const color = config.color !== undefined ? config.color : 0xffffff;
    const sizeAttenuation = config.sizeAttenuation !== undefined ? config.sizeAttenuation : true;
    const type = config.type || 'default';

    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3]     = (Math.random() - 0.5) * spread.x;
        positions[i3 + 1] = (Math.random() - 0.5) * spread.y;
        positions[i3 + 2] = (Math.random() - 0.5) * spread.z;

        velocities[i3]     = direction.x * speed + (Math.random() - 0.5) * speed * 0.2;
        velocities[i3 + 1] = direction.y * speed + (Math.random() - 0.5) * speed * 0.2;
        velocities[i3 + 2] = direction.z * speed + (Math.random() - 0.5) * speed * 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: color,
        size: size,
        sizeAttenuation: sizeAttenuation,
        transparent: true,
        opacity: opacity,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);

    // Store metadata for updateParticles
    points.userData.particleConfig = {
        type: type,
        count: count,
        spread: spread,
        speed: speed,
        direction: direction,
        baseOpacity: opacity,
        velocities: velocities,
        frameCounter: 0,
        time: 0
    };

    scene.add(points);
    worldObjects.push(points);
    activeParticleSystems.push(points);

    return points;
}

function updateParticles(delta) {
    for (let s = 0; s < activeParticleSystems.length; s++) {
        const points = activeParticleSystems[s];
        if (!points || !points.userData.particleConfig) continue;

        const cfg = points.userData.particleConfig;
        const positions = points.geometry.attributes.position.array;
        const velocities = cfg.velocities;
        const count = cfg.count;
        const spread = cfg.spread;
        const halfX = spread.x * 0.5;
        const halfY = spread.y * 0.5;
        const halfZ = spread.z * 0.5;

        cfg.frameCounter++;
        cfg.time += delta;

        switch (cfg.type) {

            case 'dust':
                // Slow random drift, wrap at room bounds
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    // Apply small random perturbation
                    velocities[i3]     += (Math.random() - 0.5) * 0.002;
                    velocities[i3 + 1] += (Math.random() - 0.5) * 0.002;
                    velocities[i3 + 2] += (Math.random() - 0.5) * 0.002;
                    // Dampen
                    velocities[i3]     *= 0.99;
                    velocities[i3 + 1] *= 0.99;
                    velocities[i3 + 2] *= 0.99;

                    positions[i3]     += velocities[i3] * delta;
                    positions[i3 + 1] += velocities[i3 + 1] * delta;
                    positions[i3 + 2] += velocities[i3 + 2] * delta;

                    // Wrap
                    if (positions[i3] > halfX) positions[i3] = -halfX;
                    else if (positions[i3] < -halfX) positions[i3] = halfX;
                    if (positions[i3 + 1] > halfY) positions[i3 + 1] = -halfY;
                    else if (positions[i3 + 1] < -halfY) positions[i3 + 1] = halfY;
                    if (positions[i3 + 2] > halfZ) positions[i3 + 2] = -halfZ;
                    else if (positions[i3 + 2] < -halfZ) positions[i3 + 2] = halfZ;
                }
                break;

            case 'firefly':
                // Random velocity changes every ~60 frames, sine-based opacity
                if (cfg.frameCounter % 60 === 0) {
                    for (let i = 0; i < count; i++) {
                        const i3 = i * 3;
                        velocities[i3]     = (Math.random() - 0.5) * cfg.speed * 2;
                        velocities[i3 + 1] = (Math.random() - 0.5) * cfg.speed * 2;
                        velocities[i3 + 2] = (Math.random() - 0.5) * cfg.speed * 2;
                    }
                }
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    positions[i3]     += velocities[i3] * delta;
                    positions[i3 + 1] += velocities[i3 + 1] * delta;
                    positions[i3 + 2] += velocities[i3 + 2] * delta;

                    // Wrap
                    if (positions[i3] > halfX) positions[i3] = -halfX;
                    else if (positions[i3] < -halfX) positions[i3] = halfX;
                    if (positions[i3 + 1] > halfY) positions[i3 + 1] = -halfY;
                    else if (positions[i3 + 1] < -halfY) positions[i3 + 1] = halfY;
                    if (positions[i3 + 2] > halfZ) positions[i3 + 2] = -halfZ;
                    else if (positions[i3 + 2] < -halfZ) positions[i3 + 2] = halfZ;
                }
                // Pulsing opacity
                points.material.opacity = cfg.baseOpacity * (0.5 + 0.5 * Math.sin(cfg.time * 3.0));
                break;

            case 'snow':
                // Constant downward + slight horizontal drift, respawn at top
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    positions[i3]     += Math.sin(cfg.time + i * 0.1) * 0.1 * delta;
                    positions[i3 + 1] -= cfg.speed * delta;
                    positions[i3 + 2] += Math.cos(cfg.time + i * 0.15) * 0.08 * delta;

                    // Respawn at top when hitting floor
                    if (positions[i3 + 1] < -halfY) {
                        positions[i3]     = (Math.random() - 0.5) * spread.x;
                        positions[i3 + 1] = halfY;
                        positions[i3 + 2] = (Math.random() - 0.5) * spread.z;
                    }
                    // Wrap horizontal
                    if (positions[i3] > halfX) positions[i3] = -halfX;
                    else if (positions[i3] < -halfX) positions[i3] = halfX;
                    if (positions[i3 + 2] > halfZ) positions[i3 + 2] = -halfZ;
                    else if (positions[i3 + 2] < -halfZ) positions[i3 + 2] = halfZ;
                }
                break;

            case 'ember':
                // Upward motion, fade opacity near ceiling, respawn at floor
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    positions[i3]     += (Math.random() - 0.5) * 0.05 * delta;
                    positions[i3 + 1] += cfg.speed * delta;
                    positions[i3 + 2] += (Math.random() - 0.5) * 0.05 * delta;

                    // Respawn at floor when reaching ceiling
                    if (positions[i3 + 1] > halfY) {
                        positions[i3]     = (Math.random() - 0.5) * spread.x;
                        positions[i3 + 1] = -halfY;
                        positions[i3 + 2] = (Math.random() - 0.5) * spread.z;
                    }
                }
                // Fade based on average height (approximation for global opacity)
                const heightRatio = (Math.sin(cfg.time * 1.5) * 0.3 + 0.7);
                points.material.opacity = cfg.baseOpacity * heightRatio;
                break;

            case 'star':
                // Stationary positions, only opacity changes (twinkling)
                points.material.opacity = cfg.baseOpacity * (0.6 + 0.4 * Math.sin(cfg.time * 2.5));
                break;

            case 'abyss':
                // Very slow upward, faint
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    positions[i3 + 1] += cfg.speed * delta * 0.3;

                    // Wrap vertically
                    if (positions[i3 + 1] > halfY) {
                        positions[i3 + 1] = -halfY;
                        positions[i3]     = (Math.random() - 0.5) * spread.x;
                        positions[i3 + 2] = (Math.random() - 0.5) * spread.z;
                    }
                }
                break;

            case 'neon':
                // Fast random motion, color cycling
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    velocities[i3]     += (Math.random() - 0.5) * 0.5;
                    velocities[i3 + 1] += (Math.random() - 0.5) * 0.5;
                    velocities[i3 + 2] += (Math.random() - 0.5) * 0.5;
                    velocities[i3]     *= 0.95;
                    velocities[i3 + 1] *= 0.95;
                    velocities[i3 + 2] *= 0.95;

                    positions[i3]     += velocities[i3] * delta;
                    positions[i3 + 1] += velocities[i3 + 1] * delta;
                    positions[i3 + 2] += velocities[i3 + 2] * delta;

                    // Wrap
                    if (positions[i3] > halfX) positions[i3] = -halfX;
                    else if (positions[i3] < -halfX) positions[i3] = halfX;
                    if (positions[i3 + 1] > halfY) positions[i3 + 1] = -halfY;
                    else if (positions[i3 + 1] < -halfY) positions[i3 + 1] = halfY;
                    if (positions[i3 + 2] > halfZ) positions[i3 + 2] = -halfZ;
                    else if (positions[i3 + 2] < -halfZ) positions[i3 + 2] = halfZ;
                }
                // Cycle through pink/cyan/yellow
                const hue = (cfg.time * 0.3) % 1.0;
                points.material.color.setHSL(hue, 1.0, 0.6);
                break;

            case 'void':
                // Flickering opacity between 0 and 1
                const flicker = Math.random() > 0.5 ? 1.0 : 0.0;
                points.material.opacity = flicker * cfg.baseOpacity;
                break;
        }

        points.geometry.attributes.position.needsUpdate = true;
    }
}

function clearParticles() {
    for (let i = activeParticleSystems.length - 1; i >= 0; i--) {
        const points = activeParticleSystems[i];
        if (points) {
            scene.remove(points);
            // Remove from worldObjects
            const idx = worldObjects.indexOf(points);
            if (idx !== -1) worldObjects.splice(idx, 1);
            // Dispose resources
            if (points.geometry) points.geometry.dispose();
            if (points.material) points.material.dispose();
        }
    }
    activeParticleSystems = [];
}

// ─── Factory Functions ──────────────────────────────────────────────────────

function createDustParticles(roomSize) {
    return createParticleSystem({
        type: 'dust',
        count: 200,
        color: 0xc8b89a,
        size: 0.03,
        spread: { x: roomSize, y: roomSize * 0.6, z: roomSize },
        speed: 0.15,
        direction: { x: 0, y: 0, z: 0 },
        opacity: 0.35,
        sizeAttenuation: true
    });
}

function createFireflyParticles(roomSize) {
    return createParticleSystem({
        type: 'firefly',
        count: 40,
        color: 0xaaff44,
        size: 0.08,
        spread: { x: roomSize * 0.8, y: roomSize * 0.5, z: roomSize * 0.8 },
        speed: 0.4,
        direction: { x: 0, y: 0, z: 0 },
        opacity: 0.7,
        sizeAttenuation: true
    });
}

function createSnowParticles(roomSize) {
    return createParticleSystem({
        type: 'snow',
        count: 300,
        color: 0xffffff,
        size: 0.04,
        spread: { x: roomSize, y: roomSize * 0.8, z: roomSize },
        speed: 0.5,
        direction: { x: 0, y: -1, z: 0 },
        opacity: 0.6,
        sizeAttenuation: true
    });
}

function createEmberParticles(roomSize) {
    return createParticleSystem({
        type: 'ember',
        count: 200,
        color: 0xff6622,
        size: 0.05,
        spread: { x: roomSize * 0.6, y: roomSize * 0.7, z: roomSize * 0.6 },
        speed: 0.6,
        direction: { x: 0, y: 1, z: 0 },
        opacity: 0.65,
        sizeAttenuation: true
    });
}

function createStarParticles(roomSize) {
    return createParticleSystem({
        type: 'star',
        count: 400,
        color: 0xccccff,
        size: 0.02,
        spread: { x: roomSize, y: roomSize * 0.8, z: roomSize },
        speed: 0,
        direction: { x: 0, y: 0, z: 0 },
        opacity: 0.8,
        sizeAttenuation: true
    });
}

function createAbyssParticles(roomSize) {
    return createParticleSystem({
        type: 'abyss',
        count: 100,
        color: 0x555555,
        size: 0.04,
        spread: { x: roomSize * 0.7, y: roomSize * 0.8, z: roomSize * 0.7 },
        speed: 0.2,
        direction: { x: 0, y: 1, z: 0 },
        opacity: 0.15,
        sizeAttenuation: true
    });
}

function createNeonParticles(roomSize) {
    return createParticleSystem({
        type: 'neon',
        count: 150,
        color: 0xff66cc,
        size: 0.06,
        spread: { x: roomSize * 0.8, y: roomSize * 0.6, z: roomSize * 0.8 },
        speed: 2.0,
        direction: { x: 0, y: 0, z: 0 },
        opacity: 0.8,
        sizeAttenuation: true
    });
}

function createVoidParticles(roomSize) {
    const system = createParticleSystem({
        type: 'void',
        count: 100,
        color: 0x888888,
        size: 0.05,
        spread: { x: roomSize * 0.7, y: roomSize * 0.7, z: roomSize * 0.7 },
        speed: 0.1,
        direction: { x: 0, y: 0, z: 0 },
        opacity: 0.9,
        sizeAttenuation: true
    });
    return system;
}
