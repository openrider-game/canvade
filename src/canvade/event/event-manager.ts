import { Vector } from '../core/math/vector';
import { StateManager } from '../state/state-manager';
import { WorldVector } from '../world/world-vector';
import { EventFactory } from './event-factory';
import { Keyboard, KeyboardEventPayload } from './keyboard/keyboard';
import { Mouse } from './mouse/mouse';
import { TouchBridge, toCanvasPosition } from './touch/touch-bridge';
import { GameClipboardEvent, GameControlEvent, GameKeyboardEvent } from './types/dom-events';
import {
    CONTEXT_MENU_EVENT,
    COPY_EVENT,
    CUT_EVENT,
    KEY_DOWN_EVENT,
    KEY_UP_EVENT,
    KEYBOARD_DOWN_EVENT,
    KEYBOARD_UP_EVENT,
    MOUSE_DOWN_EVENT,
    MOUSE_ENTER_EVENT,
    MOUSE_MOVE_EVENT,
    MOUSE_OUT_EVENT,
    MOUSE_UP_EVENT,
    PASTE_EVENT,
    VISIBILITY_CHANGE_EVENT,
    WHEEL_EVENT,
} from './event.constants';

/**
 * Bridges the DOM events to the current state of a {@link StateManager}, as `DOMEvents`.
 *
 * Mouse positions are converted to canvas pixels and stored in {@link Mouse}, along with the
 * world position when the current state has a `World`. Key events are forwarded only while
 * the canvas has the focus, and also feed {@link Keyboard}.
 *
 * Each touch of the canvas is dispatched as `touchStart`, `touchMove` and `touchEnd` by a
 * {@link TouchBridge}; the touches no layer consumes when they start become gestures: a single
 * finger dispatches the mouse events of the main button, two fingers the pinch events. The
 * touches neither scroll nor zoom the page, and the browser does not turn them into mouse events.
 */
export class EventManager {
    /** Bridge of the touches, acting as the mouse through the mouse handlers. */
    private readonly touch: TouchBridge;

    constructor(private ctx: CanvasRenderingContext2D) {
        this.touch = new TouchBridge(ctx.canvas, this);
    }

    /**
     * Listens to the DOM events and forwards them to the current state of `stateManager`.
     *
     * Makes the canvas focusable and focuses it, so that it receives the key events.
     */
    bridgeDOMEvents(stateManager: StateManager): void {
        this.ctx.canvas.tabIndex = 0;
        this.ctx.canvas.focus();

        this.ctx.canvas.addEventListener(MOUSE_DOWN_EVENT, (e) =>
            this.onMouseDown(e, stateManager),
        );
        this.ctx.canvas.addEventListener(MOUSE_UP_EVENT, (e) => this.onMouseUp(e, stateManager));
        this.ctx.canvas.addEventListener(MOUSE_MOVE_EVENT, (e) =>
            this.onMouseMove(e, stateManager),
        );
        this.ctx.canvas.addEventListener(WHEEL_EVENT, (e) => this.onScroll(e, stateManager));

        this.ctx.canvas.addEventListener(MOUSE_ENTER_EVENT, (e) =>
            this.onMouseEnter(e, stateManager),
        );
        this.ctx.canvas.addEventListener(MOUSE_OUT_EVENT, (e) => this.onMouseOut(e, stateManager));

        this.ctx.canvas.addEventListener(CONTEXT_MENU_EVENT, (e) =>
            this.onContextMenu(e, stateManager),
        );

        this.touch.listen(stateManager);

        document.addEventListener(VISIBILITY_CHANGE_EVENT, () =>
            this.onVisibilityChange(stateManager),
        );

        document.addEventListener(KEY_DOWN_EVENT, (e) => this.onKeyDown(e, stateManager));
        for (const name of [COPY_EVENT, CUT_EVENT, PASTE_EVENT] as const) {
            document.addEventListener(name, (e) => this.onClipboard(name, e, stateManager));
        }
        document.addEventListener(KEY_UP_EVENT, (e) => this.onKeyUp(e, stateManager));
        document.addEventListener(KEYBOARD_DOWN_EVENT, (e) =>
            this.onKeyboardDown(e as CustomEvent<KeyboardEventPayload>, stateManager),
        );
        document.addEventListener(KEYBOARD_UP_EVENT, (e) =>
            this.onKeyboardUp(e as CustomEvent<KeyboardEventPayload>, stateManager),
        );
    }

    /**
     * Focuses the canvas, records the click positions in {@link Mouse} and dispatches
     * `mouseDown`.
     */
    public onMouseDown(e: MouseEvent, stateManager: StateManager): boolean {
        e.preventDefault();
        this.ctx.canvas.focus();

        this.dispatchMouse('mouseDown', e, stateManager, (position) => {
            Mouse.lastClick.set(position);
            if (stateManager.getCurrent()?.getWorld()) {
                Mouse.lastWorldClick.set(Mouse.worldPos);
            }
        });
        return true;
    }

    public onMouseUp(e: MouseEvent, stateManager: StateManager): boolean {
        this.dispatchMouse('mouseUp', e, stateManager);
        return true;
    }

    public onMouseMove(e: MouseEvent, stateManager: StateManager): boolean {
        this.dispatchMouse('mouseMove', e, stateManager);
        return true;
    }

    /**
     * Dispatches a wheel event as `scroll`, with the canvas size needed to zoom around the
     * cursor (see `World.zoom`), and prevents the page from scrolling.
     */
    public onScroll(e: WheelEvent, stateManager: StateManager): boolean {
        e.preventDefault();

        const gameWheelEvent = EventFactory.createGameEvent({
            name: 'scroll',
            consumed: false,
            wheelEvent: e,
            position: this.setMousePos(e, stateManager),
            viewWidth: this.ctx.canvas.width,
            viewHeight: this.ctx.canvas.height,
        });

        stateManager.getCurrent()?.dispatch('scroll', gameWheelEvent);

        return true;
    }

    public onMouseEnter(e: MouseEvent, stateManager: StateManager): void {
        this.dispatchMouse('mouseEnter', e, stateManager);
    }

    public onMouseOut(e: MouseEvent, stateManager: StateManager): void {
        this.dispatchMouse('mouseOut', e, stateManager);
    }

    /** Dispatches `contextMenu` instead of opening the browser context menu. */
    public onContextMenu(e: MouseEvent, stateManager: StateManager): boolean {
        e.preventDefault();
        this.dispatchMouse('contextMenu', e, stateManager);
        return true;
    }

    /** Dispatches `touchStart` for each new touch (see {@link TouchBridge.onTouchStart}). */
    public onTouchStart(e: TouchEvent, stateManager: StateManager): void {
        this.touch.onTouchStart(e, stateManager);
    }

    /** Dispatches `touchMove` for each moving touch (see {@link TouchBridge.onTouchMove}). */
    public onTouchMove(e: TouchEvent, stateManager: StateManager): void {
        this.touch.onTouchMove(e, stateManager);
    }

    /** Dispatches `touchEnd` for each touch ending (see {@link TouchBridge.onTouchEnd}). */
    public onTouchEnd(e: TouchEvent, stateManager: StateManager): void {
        this.touch.onTouchEnd(e, stateManager);
    }

    public onVisibilityChange(stateManager: StateManager): void {
        stateManager.getCurrent()?.dispatch('visibilityChange');
    }

    /**
     * Dispatches the raw `keyDown` event, then lets {@link Keyboard} update its controls, which
     * may synchronously trigger `keyboardDown`. Ignored when the canvas does not have the focus.
     *
     * A key consumed by the state, e.g. typed in a UI input, does not trigger the controls. The
     * clipboard shortcuts keep their default action, so that the browser fires the clipboard
     * events.
     */
    public onKeyDown(e: KeyboardEvent, stateManager: StateManager): void {
        if (document.activeElement !== this.ctx.canvas) {
            return;
        }

        if (!EventManager.isClipboardShortcut(e)) {
            e.preventDefault();
        }
        if (!this.dispatchKey('keyDown', e, stateManager)) {
            Keyboard.onKeyDown(e);
        }
    }

    /**
     * Dispatches the raw `keyUp` event, then lets {@link Keyboard} update its controls, which
     * may synchronously trigger `keyboardUp`. Ignored when the canvas does not have the focus.
     */
    public onKeyUp(e: KeyboardEvent, stateManager: StateManager): void {
        if (document.activeElement !== this.ctx.canvas) {
            return;
        }

        e.preventDefault();
        this.dispatchKey('keyUp', e, stateManager);
        Keyboard.onKeyUp(e);
    }

    /**
     * Dispatches a `copy`, `cut` or `paste` event, ignored when the canvas does not have the
     * focus. Its default action is prevented when a state consumes it, e.g. a UI input setting or
     * reading the clipboard data.
     */
    public onClipboard(
        name: 'copy' | 'cut' | 'paste',
        e: ClipboardEvent,
        stateManager: StateManager,
    ): void {
        if (document.activeElement !== this.ctx.canvas) {
            return;
        }

        const gameClipboardEvent = EventFactory.createGameEvent<GameClipboardEvent>({
            name,
            consumed: false,
            clipboardEvent: e,
        });
        stateManager.getCurrent()?.dispatch(name, gameClipboardEvent);
        if (gameClipboardEvent.detail.consumed) {
            e.preventDefault();
        }
    }

    /** Whether a key event is a copy, cut or paste shortcut (Ctrl or Meta with C, X or V). */
    private static isClipboardShortcut(e: KeyboardEvent): boolean {
        return (e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key?.toLowerCase());
    }

    /** Dispatches `keyboardDown` when {@link Keyboard} reports a pressed control. */
    public onKeyboardDown(e: CustomEvent<KeyboardEventPayload>, stateManager: StateManager): void {
        this.dispatchControl('keyboardDown', e.detail, stateManager);
    }

    /** Dispatches `keyboardUp` when {@link Keyboard} reports a released control. */
    public onKeyboardUp(e: CustomEvent<KeyboardEventPayload>, stateManager: StateManager): void {
        this.dispatchControl('keyboardUp', e.detail, stateManager);
    }

    /**
     * Records the mouse position and dispatches a mouse event to the current state.
     *
     * @param beforeDispatch - Called with the position in canvas pixels before dispatching.
     */
    private dispatchMouse(
        name: 'mouseDown' | 'mouseUp' | 'mouseMove' | 'mouseEnter' | 'mouseOut' | 'contextMenu',
        e: MouseEvent,
        stateManager: StateManager,
        beforeDispatch?: (position: Vector) => void,
    ): void {
        const position = this.setMousePos(e, stateManager);
        beforeDispatch?.(position);
        stateManager
            .getCurrent()
            ?.dispatch(
                name,
                EventFactory.createGameEvent({ name, consumed: false, mouseEvent: e, position }),
            );
    }

    /**
     * Dispatches a raw key event to the current state.
     *
     * @returns Whether the state consumed the event.
     */
    private dispatchKey(
        name: 'keyDown' | 'keyUp',
        keyboardEvent: KeyboardEvent,
        stateManager: StateManager,
    ): boolean {
        const gameKeyboardEvent = EventFactory.createGameEvent<GameKeyboardEvent>({
            name,
            consumed: false,
            keyboardEvent,
        });
        stateManager.getCurrent()?.dispatch(name, gameKeyboardEvent);
        return gameKeyboardEvent.detail.consumed;
    }

    /** Dispatches a control event to the current state, with the key event if any. */
    private dispatchControl(
        name: 'keyboardDown' | 'keyboardUp',
        { keyboardEvent, key }: KeyboardEventPayload,
        stateManager: StateManager,
    ): void {
        stateManager.getCurrent()?.dispatch(
            name,
            EventFactory.createGameEvent<GameControlEvent>({
                name,
                consumed: false,
                key,
                keyboardEvent,
            }),
        );
    }

    /**
     * Updates the mouse positions of {@link Mouse} from a DOM mouse event.
     *
     * @returns A copy of the position in canvas pixels.
     */
    private setMousePos(e: MouseEvent, stateManager: StateManager): Vector {
        Mouse.mousePos.set(toCanvasPosition(this.ctx.canvas, e));

        const world = stateManager.getCurrent()?.getWorld();
        if (world) {
            Mouse.worldPos.set(
                WorldVector.toWorld(
                    Mouse.mousePos,
                    world,
                    this.ctx.canvas.width,
                    this.ctx.canvas.height,
                ),
            );
        }

        return Mouse.mousePos.clone();
    }
}
