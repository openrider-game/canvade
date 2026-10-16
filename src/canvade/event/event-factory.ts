/**
 * Payload of the events dispatched by the engine.
 *
 * Input events are dispatched to the layers of a state from the top one down; a receiver sets
 * `consumed` to `true` to stop the event from reaching the layers below.
 */
export type GameEvent = { name: string; consumed: boolean };

/** Creates the events dispatched by the engine. */
export abstract class EventFactory {
    /** Wraps a payload in a `CustomEvent` whose type is the payload name. */
    static createGameEvent<T extends GameEvent>(detail: T): CustomEvent<T> {
        return new CustomEvent<T>(detail.name, { detail });
    }
}
