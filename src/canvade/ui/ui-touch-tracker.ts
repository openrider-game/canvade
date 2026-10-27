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
    /** Position the touch started at, in UI pixels. */
    origin: Vector;
    /**
     * Whether the touch drags its element (see `UIElement.handlePointerDrag`) rather than
     * sliding.
     */
    drags: boolean;
    /** Element the touch scrolls, once it moved along its scrolling direction. */
    scrolls: UIElement | null;
}

/**
 * Distance a touch moves vertically, in UI pixels, before it scrolls the element it started on,
 * rather than pressing it: a shorter move is still a tap.
 */
const SCROLL_THRESHOLD = 8;

/**
 * Tracks the fingers on the elements of a UI tree, used by the UI manager.
 *
 * A touch starting over an element focuses and presses it; each finger then presses the element
 * under it, sliding from an element to the next one, until it ends, clicking the element it
 * started on when released over it (a tap). A finger on an element following the pointer drags
 * it instead (see `UIElement.handlePointerDrag`). Several fingers press several elements at once.
 *
 * A finger moving vertically over a scrolling element, e.g. over the buttons of a scrolling list,
 * scrolls it like the mouse wheel would (see `UIElement.handleWheel`), the content following the
 * finger: it then releases its element without clicking it.
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
            touch.scrolls = null;
            touch.origin = touch.position;
        }
    }

    /**
     * Focuses and presses the element under a new touch.
     *
     * @returns Whether the touch started over an element, consuming it.
     */
    public start(id: number, position: Vector, pointerEvent: PointerEvent): boolean {
        const target = this.getRoot()?.findElementAt(position.x, position.y);
        if (!target) {
            return false;
        }

        this.claimFocus(target);
        target.handlePointerDown?.(position.x, position.y, pointerEvent);
        target.press();
        this.touches.set(id, {
            start: target,
            current: target,
            position,
            origin: position,
            drags: target.handlePointerDrag !== undefined,
            scrolls: null,
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

        const previous = touch.position;
        const { x, y } = (touch.position = position);
        if (touch.scrolls) {
            // The content follows the finger
            touch.scrolls.handleWheel?.(previous.y - y);
        } else if (touch.drags) {
            touch.start?.handlePointerDrag?.(x, y);
        } else if (!this.startScroll(touch)) {
            this.slide(touch, root.findElementAt(x, y));
        }
        return true;
    }

    /**
     * Scrolls the first element scrolling from the element the touch started on up to the root,
     * once the touch moved far enough, mostly vertically: the touch then scrolls it until it ends,
     * releasing its element without clicking it.
     *
     * @returns Whether the touch scrolls an element.
     */
    private startScroll(touch: UITouch): boolean {
        const dx = touch.position.x - touch.origin.x;
        const dy = touch.position.y - touch.origin.y;
        if (Math.abs(dy) < SCROLL_THRESHOLD || Math.abs(dy) < Math.abs(dx)) {
            return false;
        }

        for (let element = touch.start; element; element = element.parent) {
            if (element.handleWheel?.(-dy)) {
                touch.scrolls = element;
                touch.start = null;
                this.slide(touch, null);
                return true;
            }
        }
        return false;
    }

    /**
     * Releases the element of a touch, clicking it when released over the element it started on.
     *
     * @returns Whether the touch was tracked, consuming its end.
     */
    public end(id: number, position: Vector, pointerEvent: PointerEvent): boolean {
        const touch = this.touches.get(id);
        if (!touch) {
            return false;
        }

        this.touches.delete(id);
        const { x, y } = position;
        const target = this.getRoot()?.findElementAt(x, y) ?? null;
        touch.current?.release();
        if (touch.start && target === touch.start) {
            touch.start.handleClick(x, y, pointerEvent);
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
