import { Vector } from '../../core/math/vector';
import { StateManager } from '../../state/state-manager';
import { EventFactory } from '../event-factory';
import {
    LOST_POINTER_CAPTURE_EVENT,
    POINTER_CANCEL_EVENT,
    POINTER_DOWN_EVENT,
    POINTER_ENTER_EVENT,
    POINTER_LEAVE_EVENT,
    POINTER_MOVE_EVENT,
    POINTER_UP_EVENT,
    TOUCH_START_EVENT,
} from '../event.constants';
import { TouchGestures, TouchPoint } from '../touch/touch-gestures';
import { GamePinchEvent, GamePointerEvent } from '../types/dom-events';

/**
 * Records the position of the primary pointer, e.g. in `Mouse`, and its click when it presses.
 *
 * @returns The position in canvas pixels.
 */
export type PrimaryPointerTracker = (
    e: MouseEvent,
    stateManager: StateManager,
    press: boolean,
) => Vector;

/** Names of the pointer events dispatched to the states. */
type PointerEventName =
    | 'pointerDown'
    | 'pointerMove'
    | 'pointerUp'
    | 'pointerEnter'
    | 'pointerLeave';

/** Bit of each mouse button in `MouseEvent.buttons`, by `MouseEvent.button`. */
const BUTTON_BITS = [1, 4, 2, 8, 16];

/**
 * Bridges the pointer events of the canvas to the current state of a {@link StateManager}, used
 * by the event manager.
 *
 * The mouse and the pen are always primary: each button pressed or released dispatches
 * `pointerDown` or `pointerUp`, and a pointer pressed on the canvas is captured, so that it is
 * released wherever it is released.
 *
 * Each finger dispatches `pointerDown`, `pointerMove` and `pointerUp`. A finger touching while no
 * other finger acts is primary, entering the canvas before its `pointerDown` and leaving it after
 * its `pointerUp`, unless a layer consumes its `pointerDown`: it then leaves right away. The
 * fingers no layer consumes are gestures (see {@link TouchGestures}): a second one ends the
 * primary finger and both pinch. The fingers neither scroll nor zoom the page
 * (`touch-action: none`), nor select it, nor open the menu of a long press.
 */
export class PointerBridge {
    /** Gestures of the fingers no layer took. */
    private readonly gestures: TouchGestures;
    /** State manager receiving the gestures, set when the pointers are bridged. */
    private gestureTarget: StateManager | null = null;
    /** Whether each finger touching the canvas is primary, by pointer id. */
    private readonly fingers = new Map<number, boolean>();
    /** Mouse buttons pressed on the canvas and not released yet, by `MouseEvent.button`. */
    private readonly heldButtons = new Set<number>();
    /** Last event of the mouse or the pen, the position the held buttons are released at. */
    private lastMouseEvent: PointerEvent | null = null;

    /**
     * @param canvas - Canvas receiving the pointers.
     * @param trackPrimary - Records the position of the primary pointers.
     */
    public constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly trackPrimary: PrimaryPointerTracker,
    ) {
        this.gestures = new TouchGestures({
            release: (event) => this.releaseFinger(event),
            pinch: (name, center, scale) => this.dispatchPinch(name, center, scale),
        });
    }

    /** Listens to the pointers of the canvas and forwards them to the current state. */
    public listen(stateManager: StateManager): void {
        this.gestureTarget = stateManager;
        // The fingers neither scroll nor zoom the page, but reach the canvas
        // Nor select the page or the canvas, nor open the menu of the image, on a long press: a
        // finger held on a button would otherwise be cancelled by iOS Safari
        Object.assign(this.canvas.style, {
            touchAction: 'none',
            userSelect: 'none',
            webkitUserSelect: 'none',
            webkitTouchCallout: 'none',
        });
        // Which iOS Safari only honors once the touches are cancelled too: the canvas follows the
        // pointer events, not the touch events, nor the clicks Safari makes up from them
        this.canvas.addEventListener(TOUCH_START_EVENT, (e) => e.preventDefault(), {
            passive: false,
        });

        const listen = (name: string, listener: (e: PointerEvent) => void) =>
            this.canvas.addEventListener(name, (e) => listener(e as PointerEvent));
        listen(POINTER_DOWN_EVENT, (e) => this.onPointerDown(e, stateManager));
        listen(POINTER_MOVE_EVENT, (e) => this.onPointerMove(e, stateManager));
        listen(POINTER_UP_EVENT, (e) => this.onPointerUp(e, stateManager));
        listen(POINTER_CANCEL_EVENT, (e) => this.onPointerCancel(e, stateManager));
        // Released elsewhere without a pointer up, e.g. the capture taken by a dialog
        listen(LOST_POINTER_CAPTURE_EVENT, (e) => this.onPointerCancel(e, stateManager));
        listen(POINTER_ENTER_EVENT, (e) => this.onPointerEnter(e, stateManager));
        listen(POINTER_LEAVE_EVENT, (e) => this.onPointerLeave(e, stateManager));
    }

    /**
     * Presses a pointer, focusing the canvas: a mouse button, captured until released, or a
     * finger, the fingers no layer consumes starting a gesture.
     */
    public onPointerDown(e: PointerEvent, stateManager: StateManager): void {
        e.preventDefault();
        this.canvas.focus();
        if (!PointerBridge.isTouch(e)) {
            this.canvas.setPointerCapture?.(e.pointerId);
            this.pressButton(e, stateManager);
            return;
        }

        this.gestureTarget = stateManager;
        const primary = this.gestures.idle;
        this.fingers.set(e.pointerId, primary);
        if (primary) {
            this.dispatch('pointerEnter', e, stateManager, true);
        }
        if (!this.dispatch('pointerDown', e, stateManager, primary)) {
            this.gestures.start(e);
        } else if (primary) {
            // Taken by a layer, e.g. a button of the UI: the game does not act on it
            this.fingers.set(e.pointerId, false);
            this.dispatch('pointerLeave', e, stateManager, true);
        }
    }

    /**
     * Moves a pointer, or presses or releases another button of the mouse: a pointer only fires
     * a pointer down for its first button, the other ones changing its buttons on a move.
     */
    public onPointerMove(e: PointerEvent, stateManager: StateManager): void {
        if (PointerBridge.isTouch(e)) {
            const primary = this.fingers.get(e.pointerId);
            if (primary !== undefined) {
                this.dispatch('pointerMove', e, stateManager, primary);
                this.gestures.move(e);
            }
        } else if (e.button < 0) {
            this.lastMouseEvent = e;
            this.dispatch('pointerMove', e, stateManager, true);
        } else if ((e.buttons & (BUTTON_BITS[e.button] ?? 0)) !== 0) {
            this.pressButton(e, stateManager);
        } else {
            this.releaseButton(e, stateManager);
        }
    }

    /** Releases a pointer: the last mouse button held, or a finger. */
    public onPointerUp(e: PointerEvent, stateManager: StateManager): void {
        if (!PointerBridge.isTouch(e)) {
            this.releaseButton(e, stateManager);
            return;
        }

        const primary = this.fingers.get(e.pointerId);
        if (primary === undefined) {
            return;
        }
        this.fingers.delete(e.pointerId);
        this.dispatch('pointerUp', e, stateManager, primary);
        if (primary) {
            this.dispatch('pointerLeave', e, stateManager, true);
        }
        this.gestures.end(e);
    }

    /**
     * Ends a pointer cancelled, or no longer captured without being released: the mouse buttons
     * held are released, and a finger ends as when lifted.
     */
    public onPointerCancel(e: PointerEvent, stateManager: StateManager): void {
        if (!PointerBridge.isTouch(e)) {
            this.releaseButtons(stateManager);
        } else {
            this.onPointerUp(e, stateManager);
        }
    }

    /** The mouse or the pen entering the canvas; a finger enters it when touching it. */
    public onPointerEnter(e: PointerEvent, stateManager: StateManager): void {
        if (!PointerBridge.isTouch(e)) {
            this.dispatch('pointerEnter', e, stateManager, true);
        }
    }

    /** The mouse or the pen leaving the canvas; a finger leaves it when lifted. */
    public onPointerLeave(e: PointerEvent, stateManager: StateManager): void {
        if (!PointerBridge.isTouch(e)) {
            this.dispatch('pointerLeave', e, stateManager, true);
        }
    }

    /**
     * Releases each mouse button pressed on the canvas, dispatching `pointerUp` at the last
     * position of the mouse, e.g. when its pointer is cancelled or the canvas loses the focus.
     */
    public releaseButtons(stateManager: StateManager): void {
        const last = this.lastMouseEvent;
        for (const button of [...this.heldButtons]) {
            this.releaseButton(
                new PointerEvent(POINTER_UP_EVENT, {
                    pointerId: last?.pointerId ?? 1,
                    pointerType: last?.pointerType ?? 'mouse',
                    isPrimary: true,
                    button,
                    clientX: last?.clientX ?? 0,
                    clientY: last?.clientY ?? 0,
                }),
                stateManager,
            );
        }
    }

    /** Whether a pointer is a finger; the mouse and the pen are always primary. */
    private static isTouch(e: PointerEvent): boolean {
        return e.pointerType === 'touch';
    }

    private pressButton(e: PointerEvent, stateManager: StateManager): void {
        this.lastMouseEvent = e;
        this.heldButtons.add(e.button);
        this.dispatch('pointerDown', e, stateManager, true);
    }

    private releaseButton(e: PointerEvent, stateManager: StateManager): void {
        this.lastMouseEvent = e;
        this.heldButtons.delete(e.button);
        this.dispatch('pointerUp', e, stateManager, true);
    }

    /** Ends the primary finger, a second finger joining it to pinch, at its last event. */
    private releaseFinger(e: PointerEvent): void {
        const stateManager = this.gestureTarget;
        if (!stateManager || !this.fingers.get(e.pointerId)) {
            return;
        }
        this.fingers.set(e.pointerId, false);
        this.dispatch('pointerUp', e, stateManager, true);
        this.dispatch('pointerLeave', e, stateManager, true);
    }

    /**
     * Dispatches a pointer event to the current state, recording the position of a primary
     * pointer.
     *
     * @returns Whether a layer consumed it.
     */
    private dispatch(
        name: PointerEventName,
        pointerEvent: PointerEvent,
        stateManager: StateManager,
        primary: boolean,
    ): boolean {
        const position = primary
            ? this.trackPrimary(pointerEvent, stateManager, name === 'pointerDown')
            : toCanvasPosition(this.canvas, pointerEvent);
        const gamePointerEvent = EventFactory.createGameEvent<GamePointerEvent>({
            name,
            consumed: false,
            pointerEvent,
            position,
            primary,
        });
        stateManager.getCurrent()?.dispatch(name, gamePointerEvent);
        return gamePointerEvent.detail.consumed;
    }

    /** Dispatches a pinch event to the current state, its center in canvas pixels. */
    private dispatchPinch(
        name: 'pinchStart' | 'pinchMove' | 'pinchEnd',
        center: TouchPoint,
        scale: number,
    ): void {
        this.gestureTarget?.getCurrent()?.dispatch(
            name,
            EventFactory.createGameEvent<GamePinchEvent>({
                name,
                consumed: false,
                center: toCanvasPosition(this.canvas, center),
                scale,
            }),
        );
    }
}

/** Converts a position on the page, in CSS pixels, to canvas pixels. */
export function toCanvasPosition(
    canvas: HTMLCanvasElement,
    { clientX, clientY }: TouchPoint,
): Vector {
    // The canvas is sized in device pixels and may be scaled by CSS, convert from CSS pixels
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width === 0 ? 0 : canvas.width / canvasRect.width;
    const scaleY = canvasRect.height === 0 ? 0 : canvas.height / canvasRect.height;
    return new Vector((clientX - canvasRect.left) * scaleX, (clientY - canvasRect.top) * scaleY);
}
