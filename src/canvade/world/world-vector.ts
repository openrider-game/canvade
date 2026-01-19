import Vector from '../core/math/vector';
import { World } from './world';

export abstract class WorldVector {
    public static normalizeToCanvas(
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
