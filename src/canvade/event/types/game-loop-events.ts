import { GameEvent } from '../event-factory';

/**
 * Payload of the `update` event.
 *
 * `progress` is the fraction, in [0, 1), of the next fixed update already elapsed, to
 * interpolate between two fixed updates. `delta` is the duration of the frame in milliseconds.
 */
export type GameUpdateEvent = GameEvent & { progress: number; delta: number };
/** Payload of the `render` event. */
export type GameRenderEvent = GameEvent & { ctx: CanvasRenderingContext2D };

/**
 * Game loop events sent to the current state each frame, then to all its layers.
 *
 * `fixedUpdate` runs at the fixed rate of the game, `update` and `render` once per frame.
 */
export type GameLoopEvents = {
    fixedUpdate: undefined;
    update: CustomEvent<GameUpdateEvent>;
    render: CustomEvent<GameRenderEvent>;
};
