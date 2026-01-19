export type GameEvent = { name: string; propagationStopped: boolean };
export type GameMouseEvent = GameEvent & { mouseEvent: MouseEvent };
export type GameWheelEvent = GameEvent & {
    wheelEvent: WheelEvent;
    viewWidth: number;
    viewHeight: number;
};
export type GameKeyboardEvent = GameEvent & { keyboardEvent: KeyboardEvent; key?: string };
export type GameUpdateEvent = GameEvent & { progress: number; delta: number };
export type GameRenderEvent = GameEvent & { ctx: CanvasRenderingContext2D };

export abstract class EventFactory {
    static createGameEvent<T extends GameEvent>(detail: T): CustomEvent<T> {
        return new CustomEvent<T>(detail.name, { detail });
    }
}
