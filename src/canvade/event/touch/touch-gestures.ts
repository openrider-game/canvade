/** Position of a touch on the page, in CSS pixels. */
export interface TouchPoint {
    clientX: number;
    clientY: number;
}

/** Events a {@link TouchGestures} turns the touches into. */
export interface TouchGestureOutput {
    /** Ends the finger acting alone, a second finger joining it to pinch, at its last event. */
    release(event: PointerEvent): void;
    /**
     * Pinches: `center` between the two fingers, `scale` their distance relative to the one at
     * the start of the pinch.
     */
    pinch(name: 'pinchStart' | 'pinchMove' | 'pinchEnd', center: TouchPoint, scale: number): void;
}

/**
 * State of the gesture: none yet, one finger acting alone, two fingers pinching, or over until
 * every finger is lifted, e.g. once a finger of a pinch was lifted.
 */
type Gesture = 'idle' | 'single' | 'pinch' | 'over';

/**
 * Follows the fingers no layer took, used by the pointer bridge: a single finger acts alone, as
 * the primary pointer, and two fingers pinch.
 *
 * A second finger ends the first one acting alone; lifting a finger of a pinch ends it, the
 * other finger doing nothing until lifted too. More fingers are ignored.
 */
export class TouchGestures {
    /** Last event of each finger of the gesture, by pointer id. */
    private readonly touches = new Map<number, PointerEvent>();
    private gesture: Gesture = 'idle';
    /** Distance between the fingers at the start of the pinch, in CSS pixels. */
    private startDistance = 1;

    public constructor(private readonly output: TouchGestureOutput) {}

    /** Whether no finger acts: a finger touching now acts alone, unless a layer takes it. */
    public get idle(): boolean {
        return this.gesture === 'idle';
    }

    /** Adds a finger touching the canvas, which no layer took. */
    public start(event: PointerEvent): void {
        // A third finger, or a finger once the gesture is over, is ignored
        if (this.gesture === 'pinch' || this.gesture === 'over') {
            return;
        }
        const single = [...this.touches.values()][0];
        this.touches.set(event.pointerId, event);
        if (this.gesture === 'idle') {
            this.gesture = 'single';
            return;
        }

        // A second finger: the first one stops acting alone, both pinch
        this.output.release(single);
        this.gesture = 'pinch';
        const points = [...this.touches.values()];
        this.startDistance = TouchGestures.distance(points);
        this.output.pinch('pinchStart', TouchGestures.center(points), 1);
    }

    /** Follows a finger of the gesture moving, ignoring the other fingers. */
    public move(event: PointerEvent): void {
        if (!this.touches.has(event.pointerId)) {
            return;
        }
        this.touches.set(event.pointerId, event);
        const points = [...this.touches.values()];

        if (this.gesture === 'pinch' && points.length >= 2) {
            this.output.pinch('pinchMove', TouchGestures.center(points), this.scale(points));
        }
    }

    /** Ends a finger of the gesture, ignoring the other fingers. */
    public end(event: PointerEvent): void {
        if (!this.touches.has(event.pointerId)) {
            return;
        }
        const points = [...this.touches.values()];

        if (this.gesture === 'single') {
            this.gesture = 'over';
        } else if (this.gesture === 'pinch' && points.length >= 2) {
            this.output.pinch('pinchEnd', TouchGestures.center(points), this.scale(points));
            this.gesture = 'over';
        }

        this.touches.delete(event.pointerId);
        if (this.touches.size === 0) {
            this.gesture = 'idle';
        }
    }

    private scale(points: TouchPoint[]): number {
        return TouchGestures.distance(points) / this.startDistance;
    }

    private static center([a, b]: TouchPoint[]): TouchPoint {
        return { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 };
    }

    /** Distance between the first two points, at least 1 pixel. */
    private static distance([a, b]: TouchPoint[]): number {
        return Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY));
    }
}
