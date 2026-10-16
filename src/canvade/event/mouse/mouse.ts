import { Vector } from '../../core/math/vector';

/**
 * Last known mouse positions, updated by the event manager on every mouse event.
 *
 * Canvas positions are in canvas pixels. World positions are in world units and are only
 * updated while the current state has a world (see `State.setWorld`).
 */
export abstract class Mouse {
    public static worldPos: Vector = new Vector();
    public static mousePos: Vector = new Vector();
    /** World position of the last mouse down. */
    public static lastWorldClick: Vector = new Vector();
    /** Canvas position of the last mouse down. */
    public static lastClick: Vector = new Vector();
}
