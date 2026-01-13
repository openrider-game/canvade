export type GameEvent = { name: string; canvas: HTMLCanvasElement };
export type GameMouseEvent = GameEvent & { mouseEvent: MouseEvent };
export type GameKeyboardEvent = GameEvent & { keyboardEvent: KeyboardEvent; key?: string };

export abstract class EventFactory {
    static createGameEvent<T extends GameEvent>(detail: T): CustomEvent<T> {
        return new CustomEvent<T>(detail.name, { detail });
    }
}
