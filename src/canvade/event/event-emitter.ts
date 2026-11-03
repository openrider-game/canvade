import { Emitter, EventKey, EventMap, EventReceiver } from './emitter.interface';

/** Last id given to a subscription, see {@link EventEmitter.subscribe}. */
let lastSubscriptionId = 0;

/**
 * Base {@link Emitter} implementation, extended by states, layers, UI managers and UI elements.
 *
 * Receivers are called with `this` bound to the emitter, so subclasses can subscribe their own
 * methods directly (`this.subscribe('render', this.onRender)`).
 */
export class EventEmitter<T extends EventMap> implements Emitter<T> {
    /** Receivers of each event, keyed by subscription id and kept in subscription order. */
    private readonly events: {
        [K in keyof T]?: Map<string, (p: T[K]) => void>;
    } = {};

    public subscribe<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): string {
        if (!this.events[eventName]) {
            this.events[eventName] = new Map();
        }

        // Unique among every emitter: a rebuilt UI subscribes thousands of receivers at once
        const id = String(++lastSubscriptionId);

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

    /** Whether an event has receivers, e.g. to skip building it on every frame without any. */
    public hasReceivers<K extends EventKey<T>>(eventName: K): boolean {
        return (this.events[eventName]?.size ?? 0) > 0;
    }

    /** Calls the receivers of an event synchronously, in subscription order. */
    public dispatch<K extends EventKey<T>>(eventName: K, params?: T[K]): void {
        if (!this.events[eventName]) {
            return;
        }

        this.events[eventName].forEach((event) => {
            return event.call(this, params as T[K]);
        });
    }
}
