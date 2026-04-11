export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 300;
    }

    emit(type, x, y, count = 5) {
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const p = {
                x, y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2 - 1,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02,
                size: 1 + Math.random() * 3,
                type
            };

            // Type-specific properties
            switch (type) {
                case 'smoke':
                    p.vy = -0.5 - Math.random();
                    p.vx *= 0.3;
                    p.color = `rgba(100,100,100,`;
                    p.size = 2 + Math.random() * 4;
                    p.decay = 0.008;
                    break;
                case 'fire':
                    p.vy = -1 - Math.random() * 2;
                    p.color = `rgba(255,${Math.floor(100 + Math.random()*100)},0,`;
                    p.decay = 0.03;
                    break;
                case 'sparkle':
                    p.vx = (Math.random() - 0.5) * 3;
                    p.vy = (Math.random() - 0.5) * 3;
                    p.color = `rgba(255,215,0,`;
                    p.size = 1 + Math.random() * 2;
                    p.decay = 0.02;
                    break;
                case 'blood':
                    p.vy = Math.random() * 2;
                    p.vx = (Math.random() - 0.5) * 2;
                    p.color = `rgba(200,0,0,`;
                    p.decay = 0.025;
                    break;
                case 'dust':
                    p.vy = -0.3 - Math.random() * 0.5;
                    p.color = `rgba(180,160,120,`;
                    p.size = 1 + Math.random() * 3;
                    p.decay = 0.015;
                    break;
            }
            this.particles.push(p);
        }
    }

    update() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            p.vx *= 0.98; // friction
            p.vy *= 0.98;
            return p.life > 0;
        });
    }

    draw(ctx, camera) {
        for (const p of this.particles) {
            const screen = camera.worldToScreen(p.x, p.y);
            const size = p.size * camera.zoom;
            if (size < 0.5) continue;
            ctx.fillStyle = p.color + (p.life * 0.8).toFixed(2) + ')';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
