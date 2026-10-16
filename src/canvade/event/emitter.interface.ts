/** Maps event names to the payload passed to their receivers, `undefined` for no payload. */
export type EventMap = Record<string, Event | undefined>;

/** Name of an event of an {@link EventMap}. */
export type EventKey<T extends EventMap> = string & keyof T;
/** Callback receiving the payload of an event. */
export type EventReceiver<T extends Event | undefined> = (params: T) => void;

/** Typed publish/subscribe event emitter. */
export interface Emitter<T extends EventMap> {
    /**
     * Subscribes a receiver to an event.
     *
     * @returns The subscription id, to pass to {@link Emitter.unsubscribe}.
     */
    subscribe<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): string;
    /**
     * Removes a subscription.
     *
     * @returns Whether the subscription existed.
     */
    unsubscribe<K extends EventKey<T>>(eventName: K, id: string): boolean;
    /** Calls the receivers of an event synchronously, in subscription order. */
    dispatch<K extends EventKey<T>>(eventName: K, params: T[K]): void;
}
