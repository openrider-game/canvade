import { Emitter, EventKey, EventMap, EventReceiver } from './emitter.interface';

export class EventEmitter<T extends EventMap> implements Emitter<T> {
    private readonly events: {
        [K in keyof T]?: Map<string, (p: T[K]) => void>;
    } = {};

    public subscribe<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): string {
        if (!this.events[eventName]) {
            this.events[eventName] = new Map();
        }

        const id = crypto.randomUUID();

        this.events[eventName].set(id, fn);

        return id;
    }

    public unsubscribe<K extends EventKey<T>>(eventName: K, id: string): boolean {
        if (!this.events[eventName] || !this.events[eventName].has(id)) {
            return false;
        }

        this.events[eventName].delete(id);

        return true;
    }

    public dispatch<K extends EventKey<T>>(eventName: K, params?: T[K]): void {
        if (!this.events[eventName]) {
            return;
        }

        this.events[eventName].forEach((event) => {
            return event.call(this, params as T[K]);
        });
    }
}
