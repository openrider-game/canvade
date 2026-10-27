import { Vector } from '../core/math/vector';
import { StateManager } from '../state/state-manager';
import { WorldVector } from '../world/world-vector';
import { EventFactory } from './event-factory';
import { Keyboard, KeyboardEventPayload } from './keyboard/keyboard';
import { Mouse } from './mouse/mouse';
import { PointerBridge, toCanvasPosition } from './pointer/pointer-bridge';
import {
    GameClipboardEvent,
    GameControlEvent,
    GameKeyboardEvent,
    GameMouseEvent,
} from './types/dom-events';
import {
    CONTEXT_MENU_EVENT,
    COPY_EVENT,
    CUT_EVENT,
    KEY_DOWN_EVENT,
    KEY_UP_EVENT,
    KEYBOARD_DOWN_EVENT,
    KEYBOARD_UP_EVENT,
    BLUR_EVENT,
    PASTE_EVENT,
    VISIBILITY_CHANGE_EVENT,
    WHEEL_EVENT,
} from './event.constants';

/**
 * Bridges the DOM events to the current state of a {@link StateManager}, as `DOMEvents`.
 *
 * The pointers of the canvas (the mouse, the pen and the fingers) are bridged by a
 * {@link PointerBridge}. The positions of the primary pointer and of the mouse wheel are
 * converted to canvas pixels and stored in {@link Mouse}, along with the world position when the
 * current state has a `World`. Key events are forwarded only while the canvas has the focus, and
 * also feed {@link Keyboard}.
 *
 * The inputs held never stay stuck: a pointer pressed on the canvas is captured, released
 * wherever it is released, and when the canvas loses the focus (another element or window
 * focused, the page hidden, a dialog opened), every control and mouse button held is released,
 * as their keys and buttons could then be released unseen.
 */
export class EventManager {
    /** Bridge of the mouse, the pen and the fingers. */
    private readonly pointers: PointerBridge;

    constructor(private ctx: CanvasRenderingContext2D) {
        this.pointers = new PointerBridge(ctx.canvas, (e, stateManager, press) =>
            this.trackPrimary(e, stateManager, press),
        );
    }

    /**
     * Listens to the DOM events and forwards them to the current state of `stateManager`.
     *
     * Makes the canvas focusable and focuses it, so that it receives the key events.
     */
    bridgeDOMEvents(stateManager: StateManager): void {
        this.ctx.canvas.tabIndex = 0;
        this.ctx.canvas.focus();

        // The mouse, the pen and the fingers
        this.pointers.listen(stateManager);
        this.ctx.canvas.addEventListener(WHEEL_EVENT, (e) => this.onScroll(e, stateManager));

        this.ctx.canvas.addEventListener(CONTEXT_MENU_EVENT, (e) =>
            this.onContextMenu(e, stateManager),
        );

        document.addEventListener(VISIBILITY_CHANGE_EVENT, () =>
            this.onVisibilityChange(stateManager),
        );
        // The window losing the focus blurs the canvas too, but not in every browser
        this.ctx.canvas.addEventListener(BLUR_EVENT, () => this.releaseInputs(stateManager));
        window.addEventListener(BLUR_EVENT, () => this.releaseInputs(stateManager));

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

    /** Dispatches `contextMenu` instead of opening the browser context menu. */
    public onContextMenu(e: MouseEvent, stateManager: StateManager): boolean {
        e.preventDefault();
        stateManager.getCurrent()?.dispatch(
            'contextMenu',
            EventFactory.createGameEvent<GameMouseEvent>({
                name: 'contextMenu',
                consumed: false,
                mouseEvent: e,
                position: this.setMousePos(e, stateManager),
            }),
        );
        return true;
    }

    /** Bridges a pointer pressed on the canvas, see {@link PointerBridge.onPointerDown}. */
    public onPointerDown(e: PointerEvent, stateManager: StateManager): void {
        this.pointers.onPointerDown(e, stateManager);
    }

    /** Bridges a pointer moving, see {@link PointerBridge.onPointerMove}. */
    public onPointerMove(e: PointerEvent, stateManager: StateManager): void {
        this.pointers.onPointerMove(e, stateManager);
    }

    /** Bridges a pointer released, see {@link PointerBridge.onPointerUp}. */
    public onPointerUp(e: PointerEvent, stateManager: StateManager): void {
        this.pointers.onPointerUp(e, stateManager);
    }

    /** Bridges a pointer cancelled, see {@link PointerBridge.onPointerCancel}. */
    public onPointerCancel(e: PointerEvent, stateManager: StateManager): void {
        this.pointers.onPointerCancel(e, stateManager);
    }

    /** Dispatches `visibilityChange`, releasing the inputs held first when the page is hidden. */
    public onVisibilityChange(stateManager: StateManager): void {
        if (document.visibilityState === 'hidden') {
            this.releaseInputs(stateManager);
        }
        stateManager.getCurrent()?.dispatch('visibilityChange');
    }

    /**
     * Releases every input held, as when the canvas loses the focus: each control held (see
     * {@link Keyboard.releaseAll}), then each mouse button pressed on the canvas, dispatching
     * `pointerUp` (see {@link PointerBridge.releaseButtons}).
     */
    public releaseInputs(stateManager: StateManager): void {
        Keyboard.releaseAll();
        this.pointers.releaseButtons(stateManager);
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
     * Records the position of the primary pointer in {@link Mouse}, and its click positions when
     * it presses.
     *
     * @returns A copy of the position in canvas pixels.
     */
    private trackPrimary(e: MouseEvent, stateManager: StateManager, press: boolean): Vector {
        const position = this.setMousePos(e, stateManager);
        if (press) {
            Mouse.lastClick.set(position);
            if (stateManager.getCurrent()?.getWorld()) {
                Mouse.lastWorldClick.set(Mouse.worldPos);
            }
        }
        return position;
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
