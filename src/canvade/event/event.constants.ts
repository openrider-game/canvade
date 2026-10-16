/**
 * DOM events bridged by the event manager: mouse events are listened to on the canvas,
 * visibility and key events on the document.
 */
export const MOUSE_DOWN_EVENT = 'mousedown',
    MOUSE_UP_EVENT = 'mouseup',
    MOUSE_MOVE_EVENT = 'mousemove',
    WHEEL_EVENT = 'wheel',
    MOUSE_ENTER_EVENT = 'mouseenter',
    MOUSE_OUT_EVENT = 'mouseout',
    CONTEXT_MENU_EVENT = 'contextmenu',
    VISIBILITY_CHANGE_EVENT = 'visibilitychange',
    KEY_DOWN_EVENT = 'keydown',
    KEY_UP_EVENT = 'keyup',
    /** Custom DOM event dispatched on the document by `Keyboard` when a control is pressed. */
    KEYBOARD_DOWN_EVENT = 'keyboarddown',
    /** Custom DOM event dispatched on the document by `Keyboard` when a control is released. */
    KEYBOARD_UP_EVENT = 'keyboardup';
