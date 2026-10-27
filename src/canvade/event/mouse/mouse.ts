import { Vector } from '../../core/math/vector';

/**
 * Last known positions of the primary pointer (see `GamePointerEvent.primary`): the mouse, the
 * pen, or the finger the game acts on, updated by the event manager on each of its pointer events,
 * and by the mouse wheel and the context menu.
 *
 * Canvas positions are in canvas pixels. World positions are in world units and are only
 * updated while the current state has a world (see `State.setWorld`).
 */
export abstract class Mouse {
    public static worldPos: Vector = new Vector();
    public static mousePos: Vector = new Vector();
    /** World position of the last `pointerDown` of the primary pointer. */
    public static lastWorldClick: Vector = new Vector();
    /** Canvas position of the last `pointerDown` of the primary pointer. */
    public static lastClick: Vector = new Vector();
}
