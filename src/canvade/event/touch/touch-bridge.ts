import { Vector } from '../../core/math/vector';
import { StateManager } from '../../state/state-manager';
import { EventFactory } from '../event-factory';
import {
    MOUSE_DOWN_EVENT,
    MOUSE_ENTER_EVENT,
    MOUSE_MAIN_BUTTON,
    MOUSE_MOVE_EVENT,
    MOUSE_OUT_EVENT,
    MOUSE_UP_EVENT,
    TOUCH_CANCEL_EVENT,
    TOUCH_END_EVENT,
    TOUCH_MOVE_EVENT,
    TOUCH_START_EVENT,
} from '../event.constants';
import { GamePinchEvent, GameTouchEvent } from '../types/dom-events';
import { TouchGestures, TouchPoint } from './touch-gestures';

/** Mouse handlers of the event manager, through which a finger acts as the mouse. */
export interface TouchMouseHandlers {
    onMouseEnter(e: MouseEvent, stateManager: StateManager): void;
    onMouseMove(e: MouseEvent, stateManager: StateManager): void;
    onMouseDown(e: MouseEvent, stateManager: StateManager): void;
    onMouseUp(e: MouseEvent, stateManager: StateManager): void;
    onMouseOut(e: MouseEvent, stateManager: StateManager): void;
}

/**
 * Bridges the touches of the canvas to the current state of a {@link StateManager}, used by the
 * event manager.
 *
 * Each touch is dispatched as `touchStart`, `touchMove` and `touchEnd`; the touches no layer
 * consumes when they start become gestures (see {@link TouchGestures}): a single finger
 * dispatches the mouse events of the main button, through the mouse handlers, two fingers the
 * pinch events. The touches neither scroll nor zoom the page, and the browser does not turn them
 * into mouse events.
 */
export class TouchBridge {
    /** Gestures of the touches no layer took. */
    private readonly gestures: TouchGestures;
    /** State manager receiving the gestures, set when the touches are bridged. */
    private gestureTarget: StateManager | null = null;

    /**
     * @param canvas - Canvas receiving the touches.
     * @param mouse - Handlers dispatching the mouse events a finger acts as.
     */
    public constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly mouse: TouchMouseHandlers,
    ) {
        this.gestures = new TouchGestures({
            mouse: (type, point, event) => this.emulateMouse(type, point, event),
            pinch: (name, center, scale) => this.dispatchPinch(name, center, scale),
        });
    }

    /** Listens to the touches of the canvas and forwards them to the current state. */
    public listen(stateManager: StateManager): void {
        // Not passive: their default actions, scrolling and zooming the page, are prevented
        this.gestureTarget = stateManager;
        const touchOptions = { passive: false };
        this.canvas.addEventListener(
            TOUCH_START_EVENT,
            (e) => this.onTouchStart(e, stateManager),
            touchOptions,
        );
        this.canvas.addEventListener(
            TOUCH_MOVE_EVENT,
            (e) => this.onTouchMove(e, stateManager),
            touchOptions,
        );
        for (const name of [TOUCH_END_EVENT, TOUCH_CANCEL_EVENT]) {
            this.canvas.addEventListener(
                name,
                (e) => this.onTouchEnd(e as TouchEvent, stateManager),
                touchOptions,
            );
        }
    }

    /**
     * Focuses the canvas, then dispatches `touchStart` for each new touch, the ones no layer
     * consumes starting a gesture.
     */
    public onTouchStart(e: TouchEvent, stateManager: StateManager): void {
        e.preventDefault();
        this.canvas.focus();
        this.gestureTarget = stateManager;

        for (const touch of Array.from(e.changedTouches)) {
            if (!this.dispatchTouch('touchStart', e, touch, stateManager)) {
                this.gestures.start(touch.identifier, touch, e);
            }
        }
    }

    /** Dispatches `touchMove` for each moving touch, then follows the gesture. */
    public onTouchMove(e: TouchEvent, stateManager: StateManager): void {
        e.preventDefault();
        for (const touch of Array.from(e.changedTouches)) {
            this.dispatchTouch('touchMove', e, touch, stateManager);
            this.gestures.move(touch.identifier, touch, e);
        }
    }

    /** Dispatches `touchEnd` for each touch ending or cancelled, then follows the gesture. */
    public onTouchEnd(e: TouchEvent, stateManager: StateManager): void {
        e.preventDefault();
        for (const touch of Array.from(e.changedTouches)) {
            this.dispatchTouch('touchEnd', e, touch, stateManager);
            this.gestures.end(touch.identifier, touch, e);
        }
    }

    /**
     * Dispatches a touch event to the current state.
     *
     * @returns Whether a layer consumed it.
     */
    private dispatchTouch(
        name: 'touchStart' | 'touchMove' | 'touchEnd',
        touchEvent: TouchEvent,
        touch: Touch,
        stateManager: StateManager,
    ): boolean {
        const gameTouchEvent = EventFactory.createGameEvent<GameTouchEvent>({
            name,
            consumed: false,
            touchEvent,
            id: touch.identifier,
            position: toCanvasPosition(this.canvas, touch),
        });
        stateManager.getCurrent()?.dispatch(name, gameTouchEvent);
        return gameTouchEvent.detail.consumed;
    }

    /**
     * Acts as the mouse for a finger: entering the canvas and hovering before pressing, and
     * leaving it after releasing, as no pointer stays over the canvas.
     */
    private emulateMouse(
        type: 'mousedown' | 'mousemove' | 'mouseup',
        point: TouchPoint,
        touchEvent: TouchEvent,
    ): void {
        const stateManager = this.gestureTarget;
        if (!stateManager) {
            return;
        }

        const { shiftKey, ctrlKey, altKey, metaKey } = touchEvent;
        const mouseEvent = (name: string, buttons: number) =>
            new MouseEvent(name, {
                clientX: point.clientX,
                clientY: point.clientY,
                button: MOUSE_MAIN_BUTTON,
                buttons,
                shiftKey,
                ctrlKey,
                altKey,
                metaKey,
            });

        if (type === 'mousedown') {
            this.mouse.onMouseEnter(mouseEvent(MOUSE_ENTER_EVENT, 0), stateManager);
            this.mouse.onMouseMove(mouseEvent(MOUSE_MOVE_EVENT, 0), stateManager);
            this.mouse.onMouseDown(mouseEvent(MOUSE_DOWN_EVENT, 1), stateManager);
        } else if (type === 'mousemove') {
            this.mouse.onMouseMove(mouseEvent(MOUSE_MOVE_EVENT, 1), stateManager);
        } else {
            this.mouse.onMouseUp(mouseEvent(MOUSE_UP_EVENT, 0), stateManager);
            this.mouse.onMouseOut(mouseEvent(MOUSE_OUT_EVENT, 0), stateManager);
        }
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
