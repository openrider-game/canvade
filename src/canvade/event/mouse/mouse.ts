import { Vector } from '../../core/math/vector';

export abstract class Mouse {
    public static worldPos: Vector = new Vector();
    public static mousePos: Vector = new Vector();
    public static lastWorldClick: Vector = new Vector();
    public static lastClick: Vector = new Vector();
}
