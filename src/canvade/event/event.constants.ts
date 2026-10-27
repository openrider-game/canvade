/**
 * DOM events bridged by the event manager: mouse and touch events are listened to on the
 * canvas, visibility and key events on the document, the focus loss on the canvas and the
 * window.
 */
export const MOUSE_DOWN_EVENT = 'mousedown',
    MOUSE_UP_EVENT = 'mouseup',
    MOUSE_MOVE_EVENT = 'mousemove',
    WHEEL_EVENT = 'wheel',
    MOUSE_ENTER_EVENT = 'mouseenter',
    MOUSE_OUT_EVENT = 'mouseout',
    CONTEXT_MENU_EVENT = 'contextmenu',
    TOUCH_START_EVENT = 'touchstart',
    TOUCH_MOVE_EVENT = 'touchmove',
    TOUCH_END_EVENT = 'touchend',
    TOUCH_CANCEL_EVENT = 'touchcancel',
    VISIBILITY_CHANGE_EVENT = 'visibilitychange',
    BLUR_EVENT = 'blur',
    KEY_DOWN_EVENT = 'keydown',
    KEY_UP_EVENT = 'keyup',
    COPY_EVENT = 'copy',
    CUT_EVENT = 'cut',
    PASTE_EVENT = 'paste',
    /** Custom DOM event dispatched on the document by `Keyboard` when a control is pressed. */
    KEYBOARD_DOWN_EVENT = 'keyboarddown',
    /** Custom DOM event dispatched on the document by `Keyboard` when a control is released. */
    KEYBOARD_UP_EVENT = 'keyboardup';

/** `MouseEvent.button` of the main button, usually the left one. */
export const MOUSE_MAIN_BUTTON = 0;
