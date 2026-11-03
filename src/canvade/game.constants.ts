/** Canvas setup and game loop defaults of `Game`. */
export const DEFAULT_UPDATES_PER_SECOND = 50,
    /**
     * Fixed updates run at most in a frame: past them, the time behind is dropped, the game
     * slowing down rather than running ever longer frames to catch up, e.g. on a slow device.
     */
    MAX_FIXED_UPDATES_PER_FRAME = 5,
    /** Page opened when the browser does not support the canvas. */
    UNSUPPORTED_BROWSER_URL = 'https://browsehappy.com/',
    CANVAS_ELEMENT = 'canvas',
    CANVAS_CONTEXT_TYPE = '2d',
    RESIZE_EVENT = 'resize',
    /**
     * Drawing properties applied to the context each time the canvas is resized, since resizing
     * a canvas resets its context.
     */
    DEFAULT_LINE_CAP: CanvasLineCap = 'round',
    DEFAULT_LINE_JOIN: CanvasLineJoin = 'round',
    DEFAULT_FONT = 'bold 15px monospace';
