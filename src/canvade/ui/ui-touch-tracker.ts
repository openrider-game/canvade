import { Vector } from '../core/math/vector';
import { UIElement } from './ui-element';

/** Touch on the elements of a manager. */
interface UITouch {
    /** Element the touch pressed when it started, clicked if released over it. */
    start: UIElement | null;
    /** Element under the touch, pressed by it. */
    current: UIElement | null;
    /** Last position of the touch, in UI pixels. */
    position: Vector;
    /**
     * Whether the touch drags its element (see `UIElement.handlePointerDrag`) rather than
     * sliding.
     */
    drags: boolean;
}

/**
 * Tracks the fingers on the elements of a UI tree, used by the UI manager.
 *
 * A touch starting over an element focuses and presses it; each finger then presses the element
 * under it, sliding from an element to the next one, until it ends, clicking the element it
 * started on when released over it (a tap). A finger on an element following the pointer drags
 * it instead (see `UIElement.handlePointerDrag`). Several fingers press several elements at once.
 *
 * The positions are in UI pixels.
 */
export class UITouchTracker {
    /** Touches on the elements of the tree, by id. */
    private readonly touches = new Map<number, UITouch>();
    /** Whether the touches must find their elements again once the new tree is laid out. */
    private pending = false;

    /**
     * @param getRoot - Gives the root of the current UI tree, if any.
     * @param claimFocus - Focuses an element pressed by a new touch.
     */
    public constructor(
        private readonly getRoot: () => UIElement | undefined,
        private readonly claimFocus: (target: UIElement) => void,
    ) {}

    /**
     * Marks the touches to find their elements again once the new tree is laid out: the elements
     * they pressed are only released then (see {@link UITouchTracker.rebindIfPending}).
     */
    public invalidate(): void {
        this.pending = this.touches.size > 0;
    }

    /**
     * Presses the elements of the new tree under the touches, releasing the ones of the previous
     * tree right before, in the same frame, if the touches were invalidated.
     */
    public rebindIfPending(): void {
        if (!this.pending) {
            return;
        }

        this.pending = false;
        for (const touch of this.touches.values()) {
            const target =
                this.getRoot()?.findElementAt(touch.position.x, touch.position.y) ?? null;
            this.slide(touch, target);
            touch.start = target;
            touch.drags = target?.handlePointerDrag !== undefined;
        }
    }

    /**
     * Focuses and presses the element under a new touch.
     *
     * @returns Whether the touch started over an element, consuming it.
     */
    public start(id: number, position: Vector, touchEvent: TouchEvent): boolean {
        const target = this.getRoot()?.findElementAt(position.x, position.y);
        if (!target) {
            return false;
        }

        this.claimFocus(target);
        target.handlePointerDown?.(position.x, position.y, touchEvent);
        target.press();
        this.touches.set(id, {
            start: target,
            current: target,
            position,
            drags: target.handlePointerDrag !== undefined,
        });
        return true;
    }

    /**
     * Lets a touch drag its element, or slide to the element under it.
     *
     * @returns Whether the touch is tracked, consuming its move.
     */
    public move(id: number, position: Vector): boolean {
        const touch = this.touches.get(id);
        const root = this.getRoot();
        if (!touch || !root) {
            return false;
        }

        const { x, y } = (touch.position = position);
        if (touch.drags) {
            touch.start?.handlePointerDrag?.(x, y);
        } else {
            this.slide(touch, root.findElementAt(x, y));
        }
        return true;
    }

    /**
     * Releases the element of a touch, clicking it when released over the element it started on.
     *
     * @returns Whether the touch was tracked, consuming its end.
     */
    public end(id: number, position: Vector, touchEvent: TouchEvent): boolean {
        const touch = this.touches.get(id);
        if (!touch) {
            return false;
        }

        this.touches.delete(id);
        const { x, y } = position;
        const target = this.getRoot()?.findElementAt(x, y) ?? null;
        touch.current?.release();
        if (touch.start && target === touch.start) {
            touch.start.handleClick(x, y, touchEvent);
        }
        return true;
    }

    /** Moves a touch onto another element, or off the elements with `null`. */
    private slide(touch: UITouch, target: UIElement | null): void {
        if (target === touch.current) {
            return;
        }
        touch.current?.release();
        target?.press();
        touch.current = target;
    }
}
