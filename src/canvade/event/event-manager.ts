import { Vector } from '../core/math/vector';
import { StateManager } from '../state/state-manager';
import { WorldVector } from '../world/world-vector';
import { EventFactory } from './event-factory';
import { Keyboard, KeyboardEventPayload } from './keyboard/keyboard';
import { Mouse } from './mouse/mouse';
import {
    CONTEXT_MENU_EVENT,
    KEY_DOWN_EVENT,
    KEY_UP_EVENT,
    KEYBOARD_DOWN_EVENT,
    KEYBOARD_UP_EVENT,
    MOUSE_DOWN_EVENT,
    MOUSE_ENTER_EVENT,
    MOUSE_MOVE_EVENT,
    MOUSE_OUT_EVENT,
    MOUSE_UP_EVENT,
    VISIBILITY_CHANGE_EVENT,
    WHEEL_EVENT,
} from './event.constants';

/**
 * Bridges the DOM events to the current state of a {@link StateManager}, as `DOMEvents`.
 *
 * Mouse positions are converted to canvas pixels and stored in {@link Mouse}, along with the
 * world position when the current state has a `World`. Key events are forwarded only while
 * the canvas has the focus, and also feed {@link Keyboard}.
 */
export class EventManager {
    constructor(private ctx: CanvasRenderingContext2D) {}

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

        document.addEventListener(VISIBILITY_CHANGE_EVENT, () =>
            this.onVisibilityChange(stateManager),
        );

        document.addEventListener(KEY_DOWN_EVENT, (e) => this.onKeyDown(e, stateManager));
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

        const position = this.setMousePos(e, stateManager);
        Mouse.lastClick.set(position);

        const world = stateManager.getCurrent()?.getWorld();

        if (world) {
            Mouse.lastWorldClick.set(Mouse.worldPos);
        }

        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseDown',
            consumed: false,
            mouseEvent: e,
            position,
        });
        stateManager.getCurrent()?.dispatch('mouseDown', gameMouseEvent);

        return true;
    }

    public onMouseUp(e: MouseEvent, stateManager: StateManager): boolean {
        const position = this.setMousePos(e, stateManager);
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseUp',
            consumed: false,
            mouseEvent: e,
            position,
        });
        stateManager.getCurrent()?.dispatch('mouseUp', gameMouseEvent);

        return true;
    }

    public onMouseMove(e: MouseEvent, stateManager: StateManager): boolean {
        const position = this.setMousePos(e, stateManager);

        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseMove',
            consumed: false,
            mouseEvent: e,
            position,
        });
        stateManager.getCurrent()?.dispatch('mouseMove', gameMouseEvent);

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
            viewWidth: this.ctx.canvas.width,
            viewHeight: this.ctx.canvas.height,
        });

        stateManager.getCurrent()?.dispatch('scroll', gameWheelEvent);

        return true;
    }

    public onMouseEnter(e: MouseEvent, stateManager: StateManager): void {
        const position = this.setMousePos(e, stateManager);
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseEnter',
            consumed: false,
            mouseEvent: e,
            position,
        });
        stateManager.getCurrent()?.dispatch('mouseEnter', gameMouseEvent);
    }

    public onMouseOut(e: MouseEvent, stateManager: StateManager): void {
        const position = this.setMousePos(e, stateManager);
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'mouseOut',
            consumed: false,
            mouseEvent: e,
            position,
        });
        stateManager.getCurrent()?.dispatch('mouseOut', gameMouseEvent);
    }

    /** Dispatches `contextMenu` instead of opening the browser context menu. */
    public onContextMenu(e: MouseEvent, stateManager: StateManager): boolean {
        e.preventDefault();

        const position = this.setMousePos(e, stateManager);
        const gameMouseEvent = EventFactory.createGameEvent({
            name: 'contextMenu',
            consumed: false,
            mouseEvent: e,
            position,
        });
        stateManager.getCurrent()?.dispatch('contextMenu', gameMouseEvent);

        return true;
    }

    public onVisibilityChange(stateManager: StateManager): void {
        stateManager.getCurrent()?.dispatch('visibilityChange');
    }

    /**
     * Dispatches the raw `keyDown` event, then lets {@link Keyboard} update its controls, which
     * may synchronously trigger `keyboardDown`. Ignored when the canvas does not have the focus.
     *
     * A key consumed by the state, e.g. typed in a UI input, does not trigger the controls.
     */
    public onKeyDown(e: KeyboardEvent, stateManager: StateManager): void {
        if (document.activeElement === this.ctx.canvas) {
            e.preventDefault();

            const gameKeyboardEvent = EventFactory.createGameEvent({
                name: 'keyDown',
                consumed: false,
                keyboardEvent: e,
            });
            stateManager.getCurrent()?.dispatch('keyDown', gameKeyboardEvent);
            if (!gameKeyboardEvent.detail.consumed) {
                Keyboard.onKeyDown(e);
            }
        }
    }

    /**
     * Dispatches the raw `keyUp` event, then lets {@link Keyboard} update its controls, which
     * may synchronously trigger `keyboardUp`. Ignored when the canvas does not have the focus.
     */
    public onKeyUp(e: KeyboardEvent, stateManager: StateManager): void {
        if (document.activeElement === this.ctx.canvas) {
            e.preventDefault();

            const gameKeyboardEvent = EventFactory.createGameEvent({
                name: 'keyUp',
                consumed: false,
                keyboardEvent: e,
            });
            stateManager.getCurrent()?.dispatch('keyUp', gameKeyboardEvent);
            Keyboard.onKeyUp(e);
        }
    }

    /** Dispatches `keyboardDown` when {@link Keyboard} reports a pressed control. */
    public onKeyboardDown(e: CustomEvent<KeyboardEventPayload>, stateManager: StateManager): void {
        const gameKeyboardEvent = EventFactory.createGameEvent({
            name: 'keyboardDown',
            consumed: false,
            keyboardEvent: e.detail.keyboardEvent,
            key: e.detail.key,
        });
        stateManager.getCurrent()?.dispatch('keyboardDown', gameKeyboardEvent);
    }

    /** Dispatches `keyboardUp` when {@link Keyboard} reports a released control. */
    public onKeyboardUp(e: CustomEvent<KeyboardEventPayload>, stateManager: StateManager): void {
        const gameKeyboardEvent = EventFactory.createGameEvent({
            name: 'keyboardUp',
            consumed: false,
            keyboardEvent: e.detail.keyboardEvent,
            key: e.detail.key,
        });
        stateManager.getCurrent()?.dispatch('keyboardUp', gameKeyboardEvent);
    }

    /**
     * Updates the mouse positions of {@link Mouse} from a DOM mouse event.
     *
     * @returns A copy of the position in canvas pixels.
     */
    private setMousePos(e: MouseEvent, stateManager: StateManager): Vector {
        // The canvas is sized in device pixels and may be scaled by CSS, convert from CSS pixels
        const canvasRect = this.ctx.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width === 0 ? 0 : this.ctx.canvas.width / canvasRect.width;
        const scaleY = canvasRect.height === 0 ? 0 : this.ctx.canvas.height / canvasRect.height;
        Mouse.mousePos.set(
            new Vector(
                (e.clientX - canvasRect.left) * scaleX,
                (e.clientY - canvasRect.top) * scaleY,
            ),
        );

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
