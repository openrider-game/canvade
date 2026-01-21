import { GameEvent } from '../event-factory';

export type GameUpdateEvent = GameEvent & { progress: number; delta: number };
export type GameRenderEvent = GameEvent & { ctx: CanvasRenderingContext2D };

export type GameLoopEvents = {
    fixedUpdate: undefined;
    update: CustomEvent<GameUpdateEvent>;
    render: CustomEvent<GameRenderEvent>;
};
