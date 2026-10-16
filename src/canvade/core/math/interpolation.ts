import { UnitBezier } from './unit-bezier';

/**
 * Interpolation and easing functions.
 *
 * Easing functions map a progress in [0, 1] to an eased progress. They use `this` to call each
 * other, so they must be called on {@link Interpolation}, or with `call(Interpolation, ...)` when
 * passed around as callbacks.
 */
export class Interpolation {
    /** Curves created by {@link Interpolation.cubicBezier}, keyed by their control points. */
    private static bezierCache: Map<string, UnitBezier> = new Map<string, UnitBezier>();

    private constructor() {
        /* static class */
    }

    /** Linearly interpolates between two values, `progress` being in [0, 1]. */
    public static linear(startValue: number, endValue: number, progress: number): number {
        return startValue + (endValue - startValue) * progress;
    }

    /** Mirrors a progress in [0, 1], i.e. returns `1 - value`. */
    public static flip(value: number): number {
        return 1 - value;
    }

    /** Quadratic easing starting slowly. */
    public static easeIn(progress: number): number {
        return progress * progress;
    }

    /** Quadratic easing ending slowly. */
    public static easeOut(progress: number): number {
        return this.flip(this.easeIn(this.flip(progress)));
    }

    /**
     * Quadratic easing starting and ending slowly.
     *
     * Blends {@link Interpolation.easeIn} into {@link Interpolation.easeOut} as the progress
     * increases.
     */
    public static easeInOut(progress: number): number {
        return this.linear(this.easeIn(progress), this.easeOut(progress), progress);
    }

    /** Cubic easing starting slowly. */
    public static easeInCubic(progress: number): number {
        return progress * progress * progress;
    }

    /** Cubic easing ending slowly. */
    public static easeOutCubic(progress: number): number {
        return this.flip(this.easeInCubic(this.flip(progress)));
    }

    /** Cubic easing starting and ending slowly, see {@link Interpolation.easeInOut}. */
    public static easeInOutCubic(progress: number): number {
        return this.linear(this.easeInCubic(progress), this.easeOutCubic(progress), progress);
    }

    /**
     * Eases a progress along a cubic Bézier curve, like the CSS `cubic-bezier()` timing function.
     *
     * The curve starts at (0, 0) and ends at (1, 1). Curves are cached by control points, so
     * calling this function every frame with the same points is cheap.
     *
     * @param progress - Progress in [0, 1], read on the x axis of the curve.
     * @param p1 - X coordinate of the first control point.
     * @param p2 - Y coordinate of the first control point.
     * @param p3 - X coordinate of the second control point.
     * @param p4 - Y coordinate of the second control point.
     * @returns The y coordinate of the curve at the given progress.
     */
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
