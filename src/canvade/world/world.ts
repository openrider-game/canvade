import { Vector } from '../core/math/vector';
import { WorldVector } from './world-vector';

/**
 * A 2D world seen through a zoomable camera.
 *
 * `camera` is the world position displayed at the center of the canvas, and `zoomFactor` the
 * number of canvas pixels per world unit. Set it on a state with `State.setWorld` to get the
 * world mouse positions in `Mouse`.
 */
export abstract class World {
    constructor(
        public camera: Vector = new Vector(),
        public zoomFactor: number = 0.6,
    ) {}

    /**
     * Zooms by one step around a world position, which keeps its position on the canvas.
     *
     * The zoom factor is rounded to two decimals and clamped to [`min`, `max`].
     *
     * @param pos - World position to zoom around, typically the world mouse position.
     * @param direction - Positive to zoom in, negative to zoom out; multiplies `step`.
     * @param viewWidth - Width of the canvas, in pixels.
     * @param viewHeight - Height of the canvas, in pixels.
     */
    public zoom(
        pos: Vector,
        direction: number,
        viewWidth: number,
        viewHeight: number,
        min: number = 0.2,
        max: number = 4,
        step: number = 0.2,
    ) {
        const px = WorldVector.toPixel(pos, this, viewWidth, viewHeight);
        this.zoomFactor = Math.min(
            max,
            Math.max(min, Math.round((this.zoomFactor + step * direction) * 100) / 100),
        );
        this.camera.x = pos.x - (px.x - viewWidth / 2) / this.zoomFactor;
        this.camera.y = pos.y - (px.y - viewHeight / 2) / this.zoomFactor;
    }
}
