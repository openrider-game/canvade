import { Vector } from '../../core/math/vector';
import { GameEvent } from '../event-factory';

/** Payload of the mouse events, `position` being in canvas pixels. */
export type GameMouseEvent = GameEvent & { mouseEvent: MouseEvent; position: Vector };
/** Payload of the `scroll` event, with the canvas size in pixels (see `World.zoom`). */
export type GameWheelEvent = GameEvent & {
    wheelEvent: WheelEvent;
    viewWidth: number;
    viewHeight: number;
};
/**
 * Payload of the key events. `key` is the name of the control, set for `keyboardDown` and
 * `keyboardUp` only.
 */
export type GameKeyboardEvent = GameEvent & { keyboardEvent: KeyboardEvent; key?: string };

/**
 * Input events bridged from the DOM to the current state, then to its layers.
 *
 * `keyDown` and `keyUp` are the raw key events, received only while the canvas has the focus;
 * `keyboardDown` and `keyboardUp` are fired when a control registered in `Keyboard` is pressed
 * or released.
 */
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
