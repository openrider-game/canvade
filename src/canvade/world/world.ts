import { Vector } from '../core/math/vector';
import { WorldVector } from './world-vector';

export abstract class World {
    constructor(
        public camera: Vector = new Vector(),
        public zoomFactor: number = 0.6,
    ) {}

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
