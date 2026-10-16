import { Vector } from '../core/math/vector';
import { World } from './world';

/** Conversions between canvas pixels and world units, given the camera of a {@link World}. */
export abstract class WorldVector {
    /**
     * Converts a canvas position, in pixels, to a world position.
     *
     * @param viewWidth - Width of the canvas, in pixels.
     * @param viewHeight - Height of the canvas, in pixels.
     */
    public static toWorld(
        vec: Vector,
        world: World,
        viewWidth: number,
        viewHeight: number,
    ): Vector {
        return new Vector(
            (vec.x - viewWidth / 2) / world.zoomFactor + world.camera.x,
            (vec.y - viewHeight / 2) / world.zoomFactor + world.camera.y,
        );
    }

    /**
     * Converts a world position to a canvas position, in pixels.
     *
     * @param viewWidth - Width of the canvas, in pixels.
     * @param viewHeight - Height of the canvas, in pixels.
     */
    public static toPixel(
        vec: Vector,
        world: World,
        viewWidth: number,
        viewHeight: number,
    ): Vector {
        return new Vector(
            (vec.x - world.camera.x) * world.zoomFactor + viewWidth / 2,
            (vec.y - world.camera.y) * world.zoomFactor + viewHeight / 2,
        );
    }
}
