export type GameEvent = { name: string; consumed: boolean };
export type GameMouseEvent = GameEvent & { mouseEvent: MouseEvent };
export type GameWheelEvent = GameEvent & {
    wheelEvent: WheelEvent;
    viewWidth: number;
    viewHeight: number;
};
export type GameKeyboardEvent = GameEvent & { keyboardEvent: KeyboardEvent; key?: string };
export type GameUpdateEvent = GameEvent & { progress: number; delta: number };
export type GameRenderEvent = GameEvent & { ctx: CanvasRenderingContext2D };

export type DOMEvents = {
    mouseDown: CustomEvent<GameMouseEvent>;
    mouseUp: CustomEvent<GameMouseEvent>;
    mouseMove: CustomEvent<GameMouseEvent>;
    scroll: CustomEvent<GameWheelEvent>;
    mouseEnter: CustomEvent<GameMouseEvent>;
    mouseOut: CustomEvent<GameMouseEvent>;
    contextMenu: CustomEvent<GameMouseEvent>;
    visibilityChange: undefined;
    keyDown: CustomEvent<GameKeyboardEvent>;
    keyUp: CustomEvent<GameKeyboardEvent>;
    keyboardDown: CustomEvent<GameKeyboardEvent>;
    keyboardUp: CustomEvent<GameKeyboardEvent>;
};

export type StateEvents = {
    enter: undefined;
    leave: undefined;
};

export type GameLoopEvents = {
    fixedUpdate: undefined;
    update: CustomEvent<GameUpdateEvent>;
    render: CustomEvent<GameRenderEvent>;
};

export abstract class EventFactory {
    static createGameEvent<T extends GameEvent>(detail: T): CustomEvent<T> {
        return new CustomEvent<T>(detail.name, { detail });
    }
}
