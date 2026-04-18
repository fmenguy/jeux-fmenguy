// textures.js - Procedural texture generation for Orbique
// Uses Canvas2D → THREE.CanvasTexture (Three.js r128)

const TEXTURE_CACHE = {};
const ANIMATED_TEXTURES = [];

// ---------------------------------------------------------------------------
// Core utility
// ---------------------------------------------------------------------------

function getOrCreateTexture(key, generatorFn, width, height) {
    if (TEXTURE_CACHE[key]) return TEXTURE_CACHE[key];
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    generatorFn(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    TEXTURE_CACHE[key] = texture;
    return texture;
}

// ---------------------------------------------------------------------------
// Noise helpers
// ---------------------------------------------------------------------------

function fillNoise(ctx, w, h, r, g, b, alpha, density) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < density) {
            const variation = (Math.random() - 0.5) * 60;
            data[i]     = Math.min(255, Math.max(0, r + variation));
            data[i + 1] = Math.min(255, Math.max(0, g + variation));
            data[i + 2] = Math.min(255, Math.max(0, b + variation));
            data[i + 3] = Math.min(255, Math.max(0, alpha + (Math.random() - 0.5) * 40));
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function drawNoiseLayer(ctx, w, h, baseR, baseG, baseB, opacity, scale) {
    for (let y = 0; y < h; y += scale) {
        for (let x = 0; x < w; x += scale) {
            const v = Math.random() * 0.3;
            const cr = Math.floor(baseR + (Math.random() - 0.5) * 40);
            const cg = Math.floor(baseG + (Math.random() - 0.5) * 40);
            const cb = Math.floor(baseB + (Math.random() - 0.5) * 40);
            ctx.fillStyle = `rgba(${cr},${cg},${cb},${opacity * (0.5 + v)})`;
            ctx.fillRect(x, y, scale, scale);
        }
    }
}

// ---------------------------------------------------------------------------
// 1. Stone texture
// ---------------------------------------------------------------------------

function createStoneTexture() {
    return getOrCreateTexture('stone', (ctx, w, h) => {
        // Base gray fill
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(0, 0, w, h);

        // Multiple noise layers for roughness
        drawNoiseLayer(ctx, w, h, 110, 110, 110, 0.3, 2);
        drawNoiseLayer(ctx, w, h, 130, 125, 120, 0.15, 4);
        drawNoiseLayer(ctx, w, h, 90, 90, 95, 0.1, 1);

        // Mortar grid lines
        const blockW = 64;
        const blockH = 32;
        ctx.strokeStyle = 'rgba(50, 45, 40, 0.8)';
        ctx.lineWidth = 2;
        for (let row = 0; row < h / blockH; row++) {
            const y = row * blockH;
            const offset = (row % 2 === 0) ? 0 : blockW / 2;
            // Horizontal mortar
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
            // Vertical mortar
            for (let col = 0; col <= w / blockW + 1; col++) {
                const x = col * blockW + offset;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + blockH);
                ctx.stroke();
            }
        }

        // Mortar highlight (lighter line offset)
        ctx.strokeStyle = 'rgba(160, 155, 150, 0.3)';
        ctx.lineWidth = 1;
        for (let row = 0; row < h / blockH; row++) {
            const y = row * blockH + 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Per-block color variation
        for (let row = 0; row < h / blockH; row++) {
            const offset = (row % 2 === 0) ? 0 : blockW / 2;
            for (let col = -1; col <= w / blockW + 1; col++) {
                const x = col * blockW + offset;
                const y = row * blockH;
                const shade = Math.random() * 0.15;
                ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 0 : 60}, ${Math.random() > 0.5 ? 0 : 50}, ${Math.random() > 0.5 ? 0 : 45}, ${shade})`;
                ctx.fillRect(x + 2, y + 2, blockW - 4, blockH - 4);
            }
        }

        // Small cracks
        ctx.strokeStyle = 'rgba(40, 35, 30, 0.3)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 12; i++) {
            const sx = Math.random() * w;
            const sy = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            for (let s = 0; s < 4; s++) {
                ctx.lineTo(sx + (Math.random() - 0.5) * 20, sy + (Math.random() - 0.5) * 20);
            }
            ctx.stroke();
        }
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// 2. Crystal texture
// ---------------------------------------------------------------------------

function createCrystalTexture() {
    return getOrCreateTexture('crystal', (ctx, w, h) => {
        // Base gradient - ice blue
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#a0e0ff');
        grad.addColorStop(0.3, '#70c8f0');
        grad.addColorStop(0.6, '#90d8ff');
        grad.addColorStop(1, '#60b8e8');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Subtle noise
        drawNoiseLayer(ctx, w, h, 160, 220, 255, 0.08, 2);

        // Internal fracture lines
        ctx.lineWidth = 1;
        for (let i = 0; i < 25; i++) {
            const x1 = Math.random() * w;
            const y1 = Math.random() * h;
            const angle = Math.random() * Math.PI;
            const length = 30 + Math.random() * 80;
            const x2 = x1 + Math.cos(angle) * length;
            const y2 = y1 + Math.sin(angle) * length;

            ctx.strokeStyle = `rgba(200, 240, 255, ${0.3 + Math.random() * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            // Jagged fracture
            const steps = 3 + Math.floor(Math.random() * 4);
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                const mx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 15;
                const my = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 15;
                ctx.lineTo(mx, my);
            }
            ctx.stroke();
        }

        // Branch fractures
        ctx.strokeStyle = 'rgba(180, 230, 255, 0.2)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 25, y + (Math.random() - 0.5) * 25);
            ctx.stroke();
        }

        // Glossy highlights
        for (let i = 0; i < 8; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const r = 10 + Math.random() * 30;
            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            glow.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            glow.addColorStop(0.5, 'rgba(220, 245, 255, 0.15)');
            glow.addColorStop(1, 'rgba(200, 235, 255, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        }

        // Specular sparkles
        for (let i = 0; i < 15; i++) {
            const sx = Math.random() * w;
            const sy = Math.random() * h;
            const size = 1 + Math.random() * 2;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + Math.random() * 0.4})`;
            ctx.fillRect(sx, sy, size, size);
        }
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// 3. Starfield texture
// ---------------------------------------------------------------------------

function createStarfieldTexture() {
    return getOrCreateTexture('starfield', (ctx, w, h) => {
        // Deep black background
        ctx.fillStyle = '#020208';
        ctx.fillRect(0, 0, w, h);

        // Very faint nebula clouds
        for (let i = 0; i < 5; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const r = 40 + Math.random() * 80;
            const nebula = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            const hue = Math.random() > 0.5 ? '40, 20, 80' : '20, 10, 60';
            nebula.addColorStop(0, `rgba(${hue}, 0.06)`);
            nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = nebula;
            ctx.fillRect(0, 0, w, h);
        }

        // Distant tiny stars
        for (let i = 0; i < 300; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const brightness = 100 + Math.floor(Math.random() * 155);
            const size = 0.5 + Math.random() * 0.8;
            ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness + Math.floor(Math.random() * 30)}, ${0.4 + Math.random() * 0.5})`;
            ctx.fillRect(x, y, size, size);
        }

        // Medium stars
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = 1 + Math.random() * 1.5;
            const isBlue = Math.random() > 0.6;
            const r = isBlue ? 180 + Math.floor(Math.random() * 40) : 230 + Math.floor(Math.random() * 25);
            const g = isBlue ? 200 + Math.floor(Math.random() * 40) : 230 + Math.floor(Math.random() * 25);
            const b = isBlue ? 240 + Math.floor(Math.random() * 15) : 210 + Math.floor(Math.random() * 45);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bright stars with glow
        for (let i = 0; i < 12; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = 1.5 + Math.random() * 2;
            const isBlue = Math.random() > 0.5;

            // Glow
            const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
            if (isBlue) {
                glow.addColorStop(0, 'rgba(180, 210, 255, 0.3)');
            } else {
                glow.addColorStop(0, 'rgba(255, 240, 200, 0.25)');
            }
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);

            // Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// 4. Grass texture
// ---------------------------------------------------------------------------

function createGrassTexture() {
    return getOrCreateTexture('grass', (ctx, w, h) => {
        // Base dark green
        ctx.fillStyle = '#2a5c1e';
        ctx.fillRect(0, 0, w, h);

        // Earthy undertone
        drawNoiseLayer(ctx, w, h, 50, 70, 30, 0.2, 3);
        drawNoiseLayer(ctx, w, h, 35, 80, 25, 0.15, 2);

        // Moss patches
        for (let i = 0; i < 8; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const r = 15 + Math.random() * 35;
            const moss = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            moss.addColorStop(0, `rgba(${20 + Math.floor(Math.random() * 30)}, ${70 + Math.floor(Math.random() * 40)}, ${10 + Math.floor(Math.random() * 20)}, 0.4)`);
            moss.addColorStop(1, 'rgba(30, 60, 20, 0)');
            ctx.fillStyle = moss;
            ctx.fillRect(0, 0, w, h);
        }

        // Grass blades - multiple layers
        for (let layer = 0; layer < 3; layer++) {
            const count = 400 + layer * 200;
            for (let i = 0; i < count; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const bladeH = 4 + Math.random() * 10;
                const lean = (Math.random() - 0.5) * 4;
                const green = 50 + Math.floor(Math.random() * 80);
                const shade = layer * 15;
                ctx.strokeStyle = `rgba(${20 + shade}, ${green + shade}, ${10 + shade}, ${0.3 + Math.random() * 0.4})`;
                ctx.lineWidth = 0.5 + Math.random() * 0.8;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.quadraticCurveTo(x + lean * 0.5, y - bladeH * 0.6, x + lean, y - bladeH);
                ctx.stroke();
            }
        }

        // Tiny flowers / color spots
        for (let i = 0; i < 6; i++) {
            const fx = Math.random() * w;
            const fy = Math.random() * h;
            ctx.fillStyle = `rgba(${200 + Math.floor(Math.random() * 55)}, ${200 + Math.floor(Math.random() * 55)}, ${50 + Math.floor(Math.random() * 50)}, 0.5)`;
            ctx.beginPath();
            ctx.arc(fx, fy, 1 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }

        // Dark spots for depth
        drawNoiseLayer(ctx, w, h, 15, 40, 10, 0.06, 5);
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// 5. Bark texture
// ---------------------------------------------------------------------------

function createBarkTexture() {
    return getOrCreateTexture('bark', (ctx, w, h) => {
        // Base brown
        ctx.fillStyle = '#5a3a20';
        ctx.fillRect(0, 0, w, h);

        // Warm undertone variation
        drawNoiseLayer(ctx, w, h, 80, 50, 30, 0.25, 3);
        drawNoiseLayer(ctx, w, h, 60, 40, 25, 0.15, 1);

        // Horizontal grain lines (bark ridges)
        for (let y = 0; y < h; y += 2) {
            const wobble = Math.sin(y * 0.1) * 3;
            const thickness = 1 + Math.random() * 2;
            const shade = 40 + Math.floor(Math.random() * 60);
            ctx.strokeStyle = `rgba(${shade + 30}, ${shade}, ${shade - 15}, ${0.2 + Math.random() * 0.3})`;
            ctx.lineWidth = thickness;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x < w; x += 8) {
                ctx.lineTo(x, y + wobble + (Math.random() - 0.5) * 2);
            }
            ctx.stroke();
        }

        // Deep crevices
        ctx.strokeStyle = 'rgba(25, 15, 5, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 15; i++) {
            const y = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(0, y);
            let cx = 0;
            while (cx < w) {
                cx += 5 + Math.random() * 15;
                ctx.lineTo(cx, y + (Math.random() - 0.5) * 6);
            }
            ctx.stroke();
        }

        // Lighter ridges
        ctx.strokeStyle = 'rgba(120, 85, 55, 0.25)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            const y = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(0, y);
            let cx = 0;
            while (cx < w) {
                cx += 8 + Math.random() * 12;
                ctx.lineTo(cx, y + (Math.random() - 0.5) * 3);
            }
            ctx.stroke();
        }

        // Knot spots
        for (let i = 0; i < 3; i++) {
            const kx = Math.random() * w;
            const ky = Math.random() * h;
            const kr = 5 + Math.random() * 12;
            const knot = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
            knot.addColorStop(0, 'rgba(30, 18, 8, 0.6)');
            knot.addColorStop(0.6, 'rgba(60, 35, 18, 0.3)');
            knot.addColorStop(1, 'rgba(80, 50, 30, 0)');
            ctx.fillStyle = knot;
            ctx.beginPath();
            ctx.ellipse(kx, ky, kr, kr * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Top noise layer
        drawNoiseLayer(ctx, w, h, 70, 45, 25, 0.08, 1);
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// 6. Lava texture (ANIMATED)
// ---------------------------------------------------------------------------

function createLavaTexture() {
    const key = 'lava';
    if (TEXTURE_CACHE[key]) return TEXTURE_CACHE[key];

    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Initial draw
    _drawLava(ctx, 256, 256, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    TEXTURE_CACHE[key] = texture;

    // Register for animation
    ANIMATED_TEXTURES.push({
        canvas: canvas,
        ctx: ctx,
        texture: texture,
        updateFn: _drawLava,
        frameCount: 0
    });

    return texture;
}

function _drawLava(ctx, w, h, time) {
    // Black/dark red base
    ctx.fillStyle = '#1a0500';
    ctx.fillRect(0, 0, w, h);

    // Dark magma layer
    drawNoiseLayer(ctx, w, h, 40, 5, 0, 0.4, 4);
    drawNoiseLayer(ctx, w, h, 60, 10, 0, 0.2, 2);

    const t = time * 0.001 || 0;

    // Glowing crack network
    for (let i = 0; i < 30; i++) {
        const seed = i * 137.5;
        const x1 = ((Math.sin(seed + t * 0.3) * 0.5 + 0.5) * w) % w;
        const y1 = ((Math.cos(seed * 1.3 + t * 0.2) * 0.5 + 0.5) * h) % h;

        const crackLen = 30 + Math.sin(seed * 0.7 + t) * 20;
        const angle = seed * 0.1 + Math.sin(t * 0.5 + i) * 0.5;

        // Outer glow
        ctx.strokeStyle = `rgba(255, 60, 0, ${0.15 + Math.sin(t + i) * 0.08})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        let cx = x1, cy = y1;
        for (let s = 0; s < 5; s++) {
            const segAngle = angle + (Math.sin(seed * s + t * 0.7) - 0.5) * 1.2;
            cx += Math.cos(segAngle) * crackLen / 5;
            cy += Math.sin(segAngle) * crackLen / 5;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();

        // Bright core
        ctx.strokeStyle = `rgba(255, ${180 + Math.floor(Math.sin(t * 2 + i) * 50)}, 0, ${0.5 + Math.sin(t * 1.5 + i * 0.5) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        cx = x1; cy = y1;
        for (let s = 0; s < 5; s++) {
            const segAngle = angle + (Math.sin(seed * s + t * 0.7) - 0.5) * 1.2;
            cx += Math.cos(segAngle) * crackLen / 5;
            cy += Math.sin(segAngle) * crackLen / 5;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();

        // White-hot center
        ctx.strokeStyle = `rgba(255, 255, ${100 + Math.floor(Math.sin(t * 3 + i) * 80)}, ${0.2 + Math.sin(t * 2 + i) * 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        cx = x1; cy = y1;
        for (let s = 0; s < 5; s++) {
            const segAngle = angle + (Math.sin(seed * s + t * 0.7) - 0.5) * 1.2;
            cx += Math.cos(segAngle) * crackLen / 5;
            cy += Math.sin(segAngle) * crackLen / 5;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }

    // Ember glow spots
    for (let i = 0; i < 10; i++) {
        const ex = (Math.sin(i * 73.1 + t * 0.4) * 0.5 + 0.5) * w;
        const ey = (Math.cos(i * 91.7 + t * 0.3) * 0.5 + 0.5) * h;
        const er = 8 + Math.sin(t * 2 + i) * 5;
        const ember = ctx.createRadialGradient(ex, ey, 0, ex, ey, er);
        ember.addColorStop(0, `rgba(255, 150, 0, ${0.2 + Math.sin(t + i * 2) * 0.1})`);
        ember.addColorStop(0.5, 'rgba(200, 40, 0, 0.08)');
        ember.addColorStop(1, 'rgba(100, 0, 0, 0)');
        ctx.fillStyle = ember;
        ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
    }
}

// ---------------------------------------------------------------------------
// 7. Ice texture
// ---------------------------------------------------------------------------

function createIceTexture() {
    return getOrCreateTexture('ice', (ctx, w, h) => {
        // Pale blue-white base
        const grad = ctx.createLinearGradient(0, 0, w * 0.7, h);
        grad.addColorStop(0, '#dceeff');
        grad.addColorStop(0.4, '#c8e4f8');
        grad.addColorStop(0.7, '#e0f0ff');
        grad.addColorStop(1, '#d0e8fa');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Subtle color variation
        drawNoiseLayer(ctx, w, h, 210, 230, 250, 0.06, 2);

        // Smooth icy patches
        for (let i = 0; i < 6; i++) {
            const px = Math.random() * w;
            const py = Math.random() * h;
            const pr = 30 + Math.random() * 50;
            const patch = ctx.createRadialGradient(px, py, 0, px, py, pr);
            patch.addColorStop(0, 'rgba(230, 245, 255, 0.3)');
            patch.addColorStop(1, 'rgba(200, 230, 250, 0)');
            ctx.fillStyle = patch;
            ctx.fillRect(0, 0, w, h);
        }

        // Crystal fracture lines - thick
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 18; i++) {
            const sx = Math.random() * w;
            const sy = Math.random() * h;
            const angle = Math.random() * Math.PI;
            const len = 40 + Math.random() * 100;
            ctx.strokeStyle = `rgba(170, 210, 240, ${0.2 + Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            let cx = sx, cy = sy;
            const segs = 3 + Math.floor(Math.random() * 5);
            for (let s = 0; s < segs; s++) {
                const t = (s + 1) / segs;
                cx = sx + Math.cos(angle) * len * t + (Math.random() - 0.5) * 12;
                cy = sy + Math.sin(angle) * len * t + (Math.random() - 0.5) * 12;
                ctx.lineTo(cx, cy);

                // Branch
                if (Math.random() > 0.5) {
                    const bAngle = angle + (Math.random() - 0.5) * 1.5;
                    const bLen = 10 + Math.random() * 25;
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(bAngle) * bLen, cy + Math.sin(bAngle) * bLen);
                    ctx.moveTo(cx, cy);
                }
            }
            ctx.stroke();
        }

        // Fine fractures
        ctx.strokeStyle = 'rgba(190, 220, 245, 0.15)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 30; i++) {
            const fx = Math.random() * w;
            const fy = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(fx + (Math.random() - 0.5) * 30, fy + (Math.random() - 0.5) * 30);
            ctx.stroke();
        }

        // Bright highlights / reflections
        for (let i = 0; i < 12; i++) {
            const hx = Math.random() * w;
            const hy = Math.random() * h;
            const hr = 3 + Math.random() * 10;
            const highlight = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
            highlight.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = highlight;
            ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
        }

        // Specular dots
        for (let i = 0; i < 20; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
        }
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// 8. Abyss texture
// ---------------------------------------------------------------------------

function createAbyssTexture() {
    return getOrCreateTexture('abyss', (ctx, w, h) => {
        // Near-black fill
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);

        // Very faint noise layers
        drawNoiseLayer(ctx, w, h, 15, 15, 20, 0.08, 3);
        drawNoiseLayer(ctx, w, h, 10, 10, 15, 0.05, 1);

        // Barely visible darker patches
        for (let i = 0; i < 5; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const r = 30 + Math.random() * 60;
            const patch = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            patch.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
            patch.addColorStop(1, 'rgba(5, 5, 10, 0)');
            ctx.fillStyle = patch;
            ctx.fillRect(0, 0, w, h);
        }

        // Very faint gray wisps
        ctx.strokeStyle = 'rgba(30, 30, 40, 0.1)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const sx = Math.random() * w;
            const sy = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            for (let s = 0; s < 6; s++) {
                ctx.lineTo(
                    sx + (Math.random() - 0.5) * 80,
                    sy + (Math.random() - 0.5) * 80
                );
            }
            ctx.stroke();
        }

        // Tiny barely-visible motes
        for (let i = 0; i < 30; i++) {
            const mx = Math.random() * w;
            const my = Math.random() * h;
            ctx.fillStyle = `rgba(${20 + Math.floor(Math.random() * 15)}, ${20 + Math.floor(Math.random() * 15)}, ${25 + Math.floor(Math.random() * 15)}, ${0.1 + Math.random() * 0.1})`;
            ctx.fillRect(mx, my, 1, 1);
        }
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// 9. Sand texture
// ---------------------------------------------------------------------------

function createSandTexture() {
    return getOrCreateTexture('sand', (ctx, w, h) => {
        // Sandy base
        ctx.fillStyle = '#c2a86e';
        ctx.fillRect(0, 0, w, h);

        // Multi-layer noise for grain
        drawNoiseLayer(ctx, w, h, 195, 170, 110, 0.3, 1);
        drawNoiseLayer(ctx, w, h, 180, 160, 100, 0.2, 2);
        drawNoiseLayer(ctx, w, h, 210, 185, 130, 0.15, 3);

        // Wind streaks
        ctx.lineWidth = 1;
        for (let i = 0; i < 35; i++) {
            const y = Math.random() * h;
            const startX = Math.random() * w * 0.3;
            const len = 40 + Math.random() * 120;
            const shade = 160 + Math.floor(Math.random() * 50);
            ctx.strokeStyle = `rgba(${shade + 20}, ${shade}, ${shade - 50}, 0.12)`;
            ctx.beginPath();
            ctx.moveTo(startX, y);
            let cx = startX;
            while (cx < startX + len) {
                cx += 5 + Math.random() * 10;
                ctx.lineTo(cx, y + (Math.random() - 0.5) * 2);
            }
            ctx.stroke();
        }

        // Ripple patterns (wind dunes)
        for (let i = 0; i < 12; i++) {
            const ry = 20 + Math.random() * (h - 40);
            const amplitude = 1 + Math.random() * 3;
            const frequency = 0.02 + Math.random() * 0.03;
            const shade = Math.random() > 0.5 ? 'rgba(160, 140, 90, 0.12)' : 'rgba(220, 200, 150, 0.1)';
            ctx.strokeStyle = shade;
            ctx.lineWidth = 1 + Math.random();
            ctx.beginPath();
            ctx.moveTo(0, ry);
            for (let x = 0; x < w; x += 2) {
                ctx.lineTo(x, ry + Math.sin(x * frequency + i) * amplitude);
            }
            ctx.stroke();
        }

        // Darker grains / pebbles
        for (let i = 0; i < 40; i++) {
            const px = Math.random() * w;
            const py = Math.random() * h;
            const ps = 1 + Math.random() * 2;
            ctx.fillStyle = `rgba(${120 + Math.floor(Math.random() * 40)}, ${100 + Math.floor(Math.random() * 40)}, ${60 + Math.floor(Math.random() * 30)}, 0.25)`;
            ctx.beginPath();
            ctx.arc(px, py, ps, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lighter sparkle grains
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(240, 230, 200, ${0.15 + Math.random() * 0.2})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
        }
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// 10. Neon Grid texture
// ---------------------------------------------------------------------------

function createNeonGridTexture() {
    return getOrCreateTexture('neongrid', (ctx, w, h) => {
        // Black background
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, w, h);

        const gridSize = 32;

        // Faint sub-grid
        ctx.strokeStyle = 'rgba(0, 80, 100, 0.1)';
        ctx.lineWidth = 0.5;
        const subGrid = gridSize / 4;
        for (let x = 0; x <= w; x += subGrid) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y <= h; y += subGrid) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Main grid - outer glow (cyan)
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.15)';
        ctx.lineWidth = 4;
        for (let x = 0; x <= w; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y <= h; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Main grid - bright core (cyan)
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y <= h; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Magenta accent lines (every other major line)
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255, 0, 200, 0.12)';
        for (let x = 0; x <= w; x += gridSize * 2) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y <= h; y += gridSize * 2) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
        ctx.lineWidth = 0.8;
        for (let x = 0; x <= w; x += gridSize * 2) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y <= h; y += gridSize * 2) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Intersection glow nodes
        for (let x = 0; x <= w; x += gridSize) {
            for (let y = 0; y <= h; y += gridSize) {
                const isMajor = (x % (gridSize * 2) === 0) && (y % (gridSize * 2) === 0);
                const r = isMajor ? 6 : 3;
                const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
                if (isMajor) {
                    glow.addColorStop(0, 'rgba(255, 100, 255, 0.5)');
                    glow.addColorStop(1, 'rgba(255, 0, 200, 0)');
                } else {
                    glow.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
                    glow.addColorStop(1, 'rgba(0, 200, 255, 0)');
                }
                ctx.fillStyle = glow;
                ctx.fillRect(x - r, y - r, r * 2, r * 2);
            }
        }
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// 11. Void Checker texture
// ---------------------------------------------------------------------------

function createVoidCheckerTexture() {
    return getOrCreateTexture('voidchecker', (ctx, w, h) => {
        const tileSize = 32;

        for (let row = 0; row < h / tileSize; row++) {
            for (let col = 0; col < w / tileSize; col++) {
                const isWhite = (row + col) % 2 === 0;
                if (isWhite) {
                    ctx.fillStyle = `rgb(${230 + Math.floor(Math.random() * 20)}, ${230 + Math.floor(Math.random() * 20)}, ${230 + Math.floor(Math.random() * 20)})`;
                } else {
                    ctx.fillStyle = `rgb(${10 + Math.floor(Math.random() * 15)}, ${10 + Math.floor(Math.random() * 15)}, ${10 + Math.floor(Math.random() * 15)})`;
                }
                ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            }
        }

        // Subtle noise overlay
        drawNoiseLayer(ctx, w, h, 128, 128, 128, 0.03, 1);

        // Faint edge lines between tiles
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.15)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= w; x += tileSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y <= h; y += tileSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    }, 256, 256);
}

// ---------------------------------------------------------------------------
// Animated texture update (call each frame from game loop)
// ---------------------------------------------------------------------------

function updateAnimatedTextures(time) {
    for (const entry of ANIMATED_TEXTURES) {
        entry.frameCount++;
        if (entry.frameCount % 3 !== 0) continue;
        entry.updateFn(entry.ctx, entry.canvas.width, entry.canvas.height, time);
        entry.texture.needsUpdate = true;
    }
}
