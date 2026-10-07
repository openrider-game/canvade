import { UnitBezier } from './unit-bezier';

export class Interpolation {
    private static bezierCache: Map<string, UnitBezier> = new Map<string, UnitBezier>();

    private constructor() {
        /* static class */
    }

    public static linear(startValue: number, endValue: number, progress: number): number {
        return startValue + (endValue - startValue) * progress;
    }

    public static flip(value: number): number {
        return 1 - value;
    }

    public static easeIn(progress: number): number {
        return progress * progress;
    }

    public static easeOut(progress: number): number {
        return this.flip(this.easeIn(this.flip(progress)));
    }

    public static easeInOut(progress: number): number {
        return this.linear(this.easeIn(progress), this.easeOut(progress), progress);
    }

    public static easeInCubic(progress: number): number {
        return progress * progress * progress;
    }

    public static easeOutCubic(progress: number): number {
        return this.flip(this.easeInCubic(this.flip(progress)));
    }

    public static easeInOutCubic(progress: number): number {
        return this.linear(this.easeInCubic(progress), this.easeOutCubic(progress), progress);
    }

    public static cubicBezier(
        progress: number,
        p1: number,
        p2: number,
        p3: number,
        p4: number,
    ): number {
        const bezierCacheKey = `${p1},${p2},${p3},${p4}`;
        let bezierCurve: UnitBezier;

        if (this.bezierCache.has(bezierCacheKey)) {
            bezierCurve = this.bezierCache.get(bezierCacheKey)!;
        } else {
            bezierCurve = new UnitBezier(p1, p2, p3, p4);
            this.bezierCache.set(bezierCacheKey, bezierCurve);
        }

        return bezierCurve.solve(progress);
    }
}
