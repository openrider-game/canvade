import { Display } from './core/display';
import { DebugLevel, DebugUtils } from './debug.utils';
import { EventManager } from './event/event-manager';
import { State, StateClass } from './state/state';
import { StateManager } from './state/state-manager';
import {
    CANVAS_CONTEXT_TYPE,
    CANVAS_ELEMENT,
    DEFAULT_FONT,
    DEFAULT_LINE_CAP,
    DEFAULT_LINE_JOIN,
    DEFAULT_UPDATES_PER_SECOND,
    RESIZE_EVENT,
    UNSUPPORTED_BROWSER_URL,
} from './game.constants';

/** Options of a {@link Game}. */
export type GameOptions = {
    /** Number of fixed updates (`fixedUpdate` events) per second, 50 by default. */
    updatesPerSecond: number;
    /** Global level of the {@link DebugUtils} logs, {@link DebugLevel.NONE} by default. */
    debugLevel: DebugLevel;
    /**
     * Fixed scale of the UI, in canvas pixels per UI pixel; by default the UI follows the pixel
     * ratio of the screen (see {@link Display}).
     */
    uiScale?: number;
    /** Color the canvas is filled with before each frame, white by default (see {@link Display}). */
    backgroundColor?: string;
};

const defaultOptions = {
    debugLevel: DebugLevel.NONE,
    updatesPerSecond: DEFAULT_UPDATES_PER_SECOND,
};

/**
 * Entry point of a canvade game: owns the canvas, bridges the DOM events and runs the game loop.
 *
 * The constructor creates an opaque canvas filling the host element, sized in device pixels and
 * resized with the window. Register the states with {@link Game.addStates}, push the first one with
 * {@link Game.pushState}, then start the loop with {@link Game.run}.
 *
 * Each frame of the loop, the current state of the {@link StateManager} receives:
 * - `fixedUpdate` zero or more times, so that it runs exactly
 *   {@link GameOptions.updatesPerSecond} times per second whatever the frame rate: put the game
 *   logic and physics there;
 * - `update` once, with the progress towards the next fixed update and the frame duration, to
 *   interpolate between fixed updates and run time-based animations;
 * - `render` once, with the canvas context.
 */
export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;

    /** Duration of a fixed update, in milliseconds. */
    public frameDuration: number;
    private lastTime: number;
    /** Number of fixed updates due but not run yet, its fractional part being sent to `update`. */
    private progress: number;

    private stateManager: StateManager;
    private eventManager: EventManager;

    /**
     * Creates the canvas in the host element and bridges the DOM events to the states.
     *
     * Redirects to an outdated browser page when the canvas is not supported.
     *
     * @param hostElement - Element the canvas is appended to and sized after.
     * @throws When the 2D context of the canvas cannot be retrieved.
     */
    public constructor(hostElement: HTMLElement, options: Partial<GameOptions> = defaultOptions) {
        if (!document.createElement(CANVAS_ELEMENT).getContext) {
            location.href = UNSUPPORTED_BROWSER_URL;
        }

        const canvas = document.createElement(CANVAS_ELEMENT);
        // Opaque: the browser composites the canvas faster without blending it with the page
        const ctx = canvas.getContext(CANVAS_CONTEXT_TYPE, { alpha: false });

        if (!ctx) {
            throw new Error('Cannot retrieve canvas context');
        }

        this.canvas = canvas;
        this.ctx = ctx;

        hostElement.appendChild(canvas);

        hostElement.addEventListener(RESIZE_EVENT, () => this.setCanvasSize());
        window.addEventListener(RESIZE_EVENT, () => this.setCanvasSize());
        this.setCanvasSize();

        const mergedOptions = { ...defaultOptions, ...options };
        Display.fixedUIScale = mergedOptions.uiScale ?? null;
        Display.backgroundColor = mergedOptions.backgroundColor ?? Display.backgroundColor;

        this.lastTime = performance.now();
        this.frameDuration = 1000 / mergedOptions.updatesPerSecond;
        this.progress = 0;

        this.stateManager = new StateManager();
        this.eventManager = new EventManager(ctx);

        this.eventManager.bridgeDOMEvents(this.stateManager);

        DebugUtils.setDebugLevel(mergedOptions.debugLevel);

        this.postInit(mergedOptions);
    }

    /** Sizes the canvas in device pixels, so that it stays sharp on high density screens. */
    private setCanvasSize() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        Display.pixelRatio = devicePixelRatio;

        this.canvas.width = this.canvas.parentElement!.clientWidth * devicePixelRatio;
        this.canvas.height = this.canvas.parentElement!.clientHeight * devicePixelRatio;

        this.setContextProperties(this.ctx);
    }

    private setContextProperties(ctx: CanvasRenderingContext2D) {
        ctx.lineCap = DEFAULT_LINE_CAP;
        ctx.lineJoin = DEFAULT_LINE_JOIN;
        ctx.font = DEFAULT_FONT;
    }

    /**
     * Hook called at the end of the constructor, once the canvas and the managers are ready.
     *
     * @param options - The given options merged with the default ones.
     */
    protected postInit(options: GameOptions): void {
        DebugUtils.trace(options);
    }

    /**
     * Instantiates and registers states, keyed by the name used to push them.
     *
     * The states are created immediately, so their `initState` and `initLayers` hooks run now.
     */
    public addStates(states: Map<string, StateClass<State>>): void {
        for (const [name, state] of states) {
            this.stateManager.addState(state, name);
        }
    }

    /** Pushes a registered state on top of the stack, see {@link StateManager.push}. */
    public pushState(name: string) {
        this.stateManager.push(name);
    }

    /** Data shared between all the states, see {@link StateManager.shared}. */
    public get shared(): Map<string, unknown> {
        return this.stateManager.shared;
    }

    /**
     * Starts the game loop, running one frame per animation frame of the browser.
     *
     * Call it once: each frame schedules the next one.
     */
    public run(): void {
        requestAnimationFrame(() => this.run());

        const now = performance.now();
        let delta = now - this.lastTime;

        // After a long pause (e.g. hidden tab), run a single fixed update instead of catching up
        if (delta > 1000) {
            delta = this.frameDuration;
        }

        this.progress += delta / this.frameDuration;
        this.lastTime = now;

        while (this.progress >= 1) {
            this.stateManager.fixedUpdate();
            this.progress--;
        }

        this.stateManager.update(this.progress, delta);
        this.stateManager.render(this.ctx);
    }
}
