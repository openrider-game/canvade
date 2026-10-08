import { Vector } from '../../core/math/vector';
import { GameEvent } from '../event-factory';

export type GameMouseEvent = GameEvent & { mouseEvent: MouseEvent; position: Vector };
export type GameWheelEvent = GameEvent & {
    wheelEvent: WheelEvent;
    viewWidth: number;
    viewHeight: number;
};
export type GameKeyboardEvent = GameEvent & { keyboardEvent: KeyboardEvent; key?: string };

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
