import Vector from '../core/math/vector';
import { World } from './world';

export abstract class WorldVector {
    public static normalizeToCanvas(
        ctx: CanvasRenderingContext2D,
        world: World,
        vec: Vector,
    ): Vector {
        return new Vector(
            (vec.x - ctx.canvas.width / 2) / world.zoomFactor + world.camera.x,
            (vec.y - ctx.canvas.height / 2) / world.zoomFactor + world.camera.y,
        );
    }

    public static toPixel(ctx: CanvasRenderingContext2D, world: World, vec: Vector): Vector {
        return new Vector(
            (vec.x - world.camera.x) * world.zoomFactor + ctx.canvas.width / 2,
            (vec.y - world.camera.y) * world.zoomFactor + ctx.canvas.height / 2,
        );
    }
}
