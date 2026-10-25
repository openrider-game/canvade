/** Position of a touch on the page, in CSS pixels. */
export interface TouchPoint {
    clientX: number;
    clientY: number;
}

/** Events a {@link TouchGestures} turns the touches into. */
export interface TouchGestureOutput {
    /** Acts as the mouse: pressing, moving or releasing its main button at a point. */
    mouse(type: 'mousedown' | 'mousemove' | 'mouseup', point: TouchPoint, event: TouchEvent): void;
    /**
     * Pinches: `center` between the two fingers, `scale` their distance relative to the one at
     * the start of the pinch.
     */
    pinch(name: 'pinchStart' | 'pinchMove' | 'pinchEnd', center: TouchPoint, scale: number): void;
}

/**
 * State of the gesture: none yet, one finger acting as the mouse, two fingers pinching, or over
 * until every finger is lifted, e.g. once a finger of a pinch was lifted.
 */
type Gesture = 'idle' | 'mouse' | 'pinch' | 'over';

/**
 * Turns the touches no layer took into gestures, used by the event manager: a single finger
 * acts as the mouse with its main button, so that a game made for the mouse works with the
 * fingers, and two fingers pinch.
 *
 * A second finger ends the mouse press of the first one; lifting a finger of a pinch ends it,
 * the other finger doing nothing until lifted too. More fingers are ignored.
 */
export class TouchGestures {
    /** Touches of the gesture, by id, with their last position. */
    private readonly touches = new Map<number, TouchPoint>();
    private gesture: Gesture = 'idle';
    /** Distance between the fingers at the start of the pinch, in CSS pixels. */
    private startDistance = 1;

    public constructor(private readonly output: TouchGestureOutput) {}

    /** Adds a touch starting, which no layer took. */
    public start(id: number, point: TouchPoint, event: TouchEvent): void {
        // A third finger, or a finger once the gesture is over, is ignored
        if (this.gesture === 'pinch' || this.gesture === 'over') {
            return;
        }
        this.touches.set(id, TouchGestures.copy(point));
        const points = [...this.touches.values()];

        if (this.gesture === 'idle' && points.length === 1) {
            this.gesture = 'mouse';
            this.output.mouse('mousedown', points[0], event);
        } else if ((this.gesture === 'idle' || this.gesture === 'mouse') && points.length >= 2) {
            if (this.gesture === 'mouse') {
                this.output.mouse('mouseup', points[0], event);
            }
            this.gesture = 'pinch';
            this.startDistance = TouchGestures.distance(points);
            this.output.pinch('pinchStart', TouchGestures.center(points), 1);
        }
    }

    /** Follows a touch of the gesture moving, ignoring the other touches. */
    public move(id: number, point: TouchPoint, event: TouchEvent): void {
        if (!this.touches.has(id)) {
            return;
        }
        this.touches.set(id, TouchGestures.copy(point));
        const points = [...this.touches.values()];

        if (this.gesture === 'mouse') {
            this.output.mouse('mousemove', points[0], event);
        } else if (this.gesture === 'pinch' && points.length >= 2) {
            this.output.pinch('pinchMove', TouchGestures.center(points), this.scale(points));
        }
    }

    /** Ends a touch of the gesture, ignoring the other touches. */
    public end(id: number, point: TouchPoint, event: TouchEvent): void {
        if (!this.touches.has(id)) {
            return;
        }
        const points = [...this.touches.values()];

        if (this.gesture === 'mouse') {
            this.output.mouse('mouseup', TouchGestures.copy(point), event);
            this.gesture = 'over';
        } else if (this.gesture === 'pinch' && points.length >= 2) {
            this.output.pinch('pinchEnd', TouchGestures.center(points), this.scale(points));
            this.gesture = 'over';
        }

        this.touches.delete(id);
        if (this.touches.size === 0) {
            this.gesture = 'idle';
        }
    }

    private scale(points: TouchPoint[]): number {
        return TouchGestures.distance(points) / this.startDistance;
    }

    private static copy({ clientX, clientY }: TouchPoint): TouchPoint {
        return { clientX, clientY };
    }

    private static center([a, b]: TouchPoint[]): TouchPoint {
        return { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 };
    }

    /** Distance between the first two points, at least 1 pixel. */
    private static distance([a, b]: TouchPoint[]): number {
        return Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY));
    }
}
