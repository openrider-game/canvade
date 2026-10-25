import { Vector } from '../../core/math/vector';
import { GameEvent } from '../event-factory';

/** Payload of the mouse events, `position` being in canvas pixels. */
export type GameMouseEvent = GameEvent & { mouseEvent: MouseEvent; position: Vector };
/**
 * Payload of the `scroll` event, with the mouse position and the canvas size in canvas pixels
 * (see `World.zoom`).
 */
export type GameWheelEvent = GameEvent & {
    wheelEvent: WheelEvent;
    position: Vector;
    viewWidth: number;
    viewHeight: number;
};
/**
 * Payload of the touch events, one for each touch starting, moving or ending: its `id`, unique
 * while it lasts, and its `position` in canvas pixels.
 */
export type GameTouchEvent = GameEvent & { touchEvent: TouchEvent; id: number; position: Vector };
/**
 * Payload of the pinch events, of two fingers on the canvas: the point between them in canvas
 * pixels, and their distance relative to the one at the start of the pinch, above 1 when they
 * move apart.
 */
export type GamePinchEvent = GameEvent & { center: Vector; scale: number };
/** Payload of the `copy`, `cut` and `paste` events, giving access to the clipboard data. */
export type GameClipboardEvent = GameEvent & { clipboardEvent: ClipboardEvent };
/** Payload of the raw key events. */
export type GameKeyboardEvent = GameEvent & { keyboardEvent: KeyboardEvent };
/**
 * Payload of the control events: `key` is the name of the control, and `keyboardEvent` the key
 * event that pressed or released it, null for a control held without a key (see
 * `Keyboard.press`).
 */
export type GameControlEvent = GameEvent & { key: string; keyboardEvent: KeyboardEvent | null };

/**
 * Input events bridged from the DOM to the current state, then to its layers.
 *
 * `keyDown` and `keyUp` are the raw key events, received only while the canvas has the focus;
 * `keyboardDown` and `keyboardUp` are fired when a control registered in `Keyboard` is pressed
 * or released. `copy`, `cut` and `paste` are the clipboard events, received only while the
 * canvas has the focus too.
 *
 * `touchStart`, `touchMove` and `touchEnd` follow each touch of the canvas. The touches no layer
 * consumes when they start are gestures: a single one acts as the mouse (`mouseDown`,
 * `mouseMove` and `mouseUp` with the main button), and two of them pinch (`pinchStart`,
 * `pinchMove` and `pinchEnd`).
 */
export type DOMEvents = {
    mouseDown: CustomEvent<GameMouseEvent>;
    mouseUp: CustomEvent<GameMouseEvent>;
    mouseMove: CustomEvent<GameMouseEvent>;
    scroll: CustomEvent<GameWheelEvent>;
    mouseEnter: CustomEvent<GameMouseEvent>;
    mouseOut: CustomEvent<GameMouseEvent>;
    contextMenu: CustomEvent<GameMouseEvent>;
    touchStart: CustomEvent<GameTouchEvent>;
    touchMove: CustomEvent<GameTouchEvent>;
    touchEnd: CustomEvent<GameTouchEvent>;
    pinchStart: CustomEvent<GamePinchEvent>;
    pinchMove: CustomEvent<GamePinchEvent>;
    pinchEnd: CustomEvent<GamePinchEvent>;
    visibilityChange: undefined;
    keyDown: CustomEvent<GameKeyboardEvent>;
    keyUp: CustomEvent<GameKeyboardEvent>;
    keyboardDown: CustomEvent<GameControlEvent>;
    keyboardUp: CustomEvent<GameControlEvent>;
    copy: CustomEvent<GameClipboardEvent>;
    cut: CustomEvent<GameClipboardEvent>;
    paste: CustomEvent<GameClipboardEvent>;
};
