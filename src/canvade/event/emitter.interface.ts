export type EventMap = Record<string, Event | undefined>;

export type EventKey<T extends EventMap> = string & keyof T;
export type EventReceiver<T extends Event | undefined> = (params: T) => void;

export interface Emitter<T extends EventMap> {
    subscribe<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): string;
    unsubscribe<K extends EventKey<T>>(eventName: K, id: string): boolean;
    dispatch<K extends EventKey<T>>(eventName: K, params: T[K]): void;
}
