import Vector from '../core/math/vector';
import { WorldVector } from './world-vector';

export abstract class World {
    public camera: Vector;
    public zoomFactor: number;

    constructor() {
        this.camera = new Vector();
        this.zoomFactor = 1;
    }

    public zoom(
        ctx: CanvasRenderingContext2D,
        pos: Vector,
        direction: number,
        min: number,
        max: number,
    ) {
        const px = WorldVector.toPixel(ctx, this, pos);
        this.zoomFactor = Math.min(
            max,
            Math.max(min, Math.round((this.zoomFactor + 0.2 * direction) * 100) / 100),
        );
        this.camera.x = pos.x - (px.x - ctx.canvas.width / 2) / this.zoomFactor;
        this.camera.y = pos.y - (px.y - ctx.canvas.height / 2) / this.zoomFactor;
    }
}
