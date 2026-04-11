export class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0; this.y = 0; // world position (center of view)
        this.zoom = 1.0; // 0.3 to 4.0
        this.targetX = 0; this.targetY = 0;
        this.targetZoom = 1.0;
        this.lerp = 0.1; // smoothing
        this.isDragging = false;
        this.dragStartX = 0; this.dragStartY = 0;
        this.dragStartCamX = 0; this.dragStartCamY = 0;
        this.minZoom = 0.3; this.maxZoom = 4.0;
    }

    update() {
        this.x += (this.targetX - this.x) * this.lerp;
        this.y += (this.targetY - this.y) * this.lerp;
        this.zoom += (this.targetZoom - this.zoom) * this.lerp;
    }

    pan(dx, dy) {
        this.targetX += dx / this.zoom;
        this.targetY += dy / this.zoom;
    }

    zoomAt(factor, screenX, screenY) {
        const worldBefore = this.screenToWorld(screenX, screenY);
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * factor));
        // Adjust position so the point under cursor stays fixed
        const worldAfter = this.screenToWorld(screenX, screenY);
        this.targetX += worldBefore.x - worldAfter.x;
        this.targetY += worldBefore.y - worldAfter.y;
    }

    centerOn(worldX, worldY) {
        this.targetX = worldX;
        this.targetY = worldY;
    }

    worldToScreen(wx, wy) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        return {
            x: (wx - this.x) * this.zoom + cx,
            y: (wy - this.y) * this.zoom + cy
        };
    }

    screenToWorld(sx, sy) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        return {
            x: (sx - cx) / this.zoom + this.x,
            y: (sy - cy) / this.zoom + this.y
        };
    }

    // Get visible tile bounds for culling
    getVisibleBounds(mapWidth, mapHeight, cellSize) {
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
        return {
            minX: Math.max(0, Math.floor(topLeft.x / cellSize) - 1),
            minY: Math.max(0, Math.floor(topLeft.y / cellSize) - 1),
            maxX: Math.min(mapWidth - 1, Math.ceil(bottomRight.x / cellSize) + 1),
            maxY: Math.min(mapHeight - 1, Math.ceil(bottomRight.y / cellSize) + 1)
        };
    }

    // Start drag
    startDrag(screenX, screenY) {
        this.isDragging = true;
        this.dragStartX = screenX;
        this.dragStartY = screenY;
        this.dragStartCamX = this.targetX;
        this.dragStartCamY = this.targetY;
    }

    // Update drag
    drag(screenX, screenY) {
        if (!this.isDragging) return;
        const dx = (screenX - this.dragStartX) / this.zoom;
        const dy = (screenY - this.dragStartY) / this.zoom;
        this.targetX = this.dragStartCamX - dx;
        this.targetY = this.dragStartCamY - dy;
    }

    endDrag() { this.isDragging = false; }
}
