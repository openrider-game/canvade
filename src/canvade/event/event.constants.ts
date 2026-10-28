/**
 * DOM events bridged by the event manager: pointer, wheel and context menu events are listened to
 * on the canvas, visibility and key events on the document, the focus loss on the canvas and the
 * window.
 */
export const WHEEL_EVENT = 'wheel',
    CONTEXT_MENU_EVENT = 'contextmenu',
    POINTER_DOWN_EVENT = 'pointerdown',
    POINTER_MOVE_EVENT = 'pointermove',
    POINTER_UP_EVENT = 'pointerup',
    POINTER_CANCEL_EVENT = 'pointercancel',
    POINTER_ENTER_EVENT = 'pointerenter',
    POINTER_LEAVE_EVENT = 'pointerleave',
    LOST_POINTER_CAPTURE_EVENT = 'lostpointercapture',
    /** Only to keep the long presses of iOS Safari off the canvas, see `PointerBridge.listen`. */
    TOUCH_START_EVENT = 'touchstart',
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
