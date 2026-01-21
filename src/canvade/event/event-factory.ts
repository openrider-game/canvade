export type GameEvent = { name: string; consumed: boolean };

export abstract class EventFactory {
    static createGameEvent<T extends GameEvent>(detail: T): CustomEvent<T> {
        return new CustomEvent<T>(detail.name, { detail });
    }
}
