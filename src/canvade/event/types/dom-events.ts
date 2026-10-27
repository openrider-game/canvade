import { Vector } from '../../core/math/vector';
import { GameEvent } from '../event-factory';

/** Payload of `contextMenu`, `position` being in canvas pixels. */
export type GameMouseEvent = GameEvent & { mouseEvent: MouseEvent; position: Vector };
/**
 * Payload of the pointer events, of the mouse, a pen or a finger: its `pointerEvent`, giving its
 * `pointerId`, its `pointerType` and the `button` pressed or released, and its `position` in
 * canvas pixels.
 */
export type GamePointerEvent = GameEvent & {
    pointerEvent: PointerEvent;
    position: Vector;
    /**
     * Whether the game acts on the pointer, its position followed by `Mouse`: the mouse, the pen,
     * and a finger touching while no other finger acts, until lifted or until a second finger
     * pinches (see `DOMEvents`). The other fingers only reach the UI, e.g. on-screen buttons.
     */
    primary: boolean;
};
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
 * `pointerDown`, `pointerMove` and `pointerUp` follow the mouse, the pen and each finger: the
 * mouse dispatches `pointerDown` and `pointerUp` for each of its buttons. `pointerEnter` and
 * `pointerLeave` follow the mouse and the pen over the canvas, and a primary finger from its touch
 * to its end. A finger is primary (see {@link GamePointerEvent.primary}) when it touches while no
 * other finger acts, unless a layer consumes its `pointerDown`, e.g. a button of the UI; a second
 * finger no layer consumes ends it with `pointerUp`, and both pinch (`pinchStart`, `pinchMove`
 * and `pinchEnd`).
 */
export type DOMEvents = {
    pointerDown: CustomEvent<GamePointerEvent>;
    pointerMove: CustomEvent<GamePointerEvent>;
    pointerUp: CustomEvent<GamePointerEvent>;
    pointerEnter: CustomEvent<GamePointerEvent>;
    pointerLeave: CustomEvent<GamePointerEvent>;
    scroll: CustomEvent<GameWheelEvent>;
    contextMenu: CustomEvent<GameMouseEvent>;
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
