export class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const cbs = this.listeners.get(event);
        if (cbs) this.listeners.set(event, cbs.filter(cb => cb !== callback));
    }

    emit(event, data) {
        const cbs = this.listeners.get(event);
        if (cbs) cbs.forEach(cb => cb(data));
    }
}

export const eventBus = new EventBus();
