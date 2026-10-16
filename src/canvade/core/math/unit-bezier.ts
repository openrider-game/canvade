/**
 * Cubic Bézier curve from (0, 0) to (1, 1), used as a timing function.
 *
 * The constructor takes the coordinates of the two control points, (`p1`, `p2`) and
 * (`p3`, `p4`), like the CSS `cubic-bezier()` function.
 */
export class UnitBezier {
    /** Precision of the solver. */
    private static epsilon: number = 1e-5;

    private cx: number;
    private bx: number;
    private ax: number;
    private cy: number;
    private by: number;
    private ay: number;

    public constructor(p1: number, p2: number, p3: number, p4: number) {
        // Polynomial coefficients, the first and last control points being (0, 0) and (1, 1)
        this.cx = 3.0 * p1;
        this.bx = 3.0 * (p3 - p1) - this.cx;
        this.ax = 1.0 - this.cx - this.bx;

        this.cy = 3.0 * p2;
        this.by = 3.0 * (p4 - p2) - this.cy;
        this.ay = 1.0 - this.cy - this.by;
    }

    private sampleCurveX(progress: number): number {
        return ((this.ax * progress + this.bx) * progress + this.cx) * progress;
    }

    private sampleCurveY(progress: number): number {
        return ((this.ay * progress + this.by) * progress + this.cy) * progress;
    }

    private sampleCurveDerivativeX(progress: number): number {
        return (3.0 * this.ax * progress + 2.0 * this.bx) * progress + this.cx;
    }

    /** Finds the curve parameter whose x coordinate is `progress`. */
    private solveCurveX(progress: number) {
        let t0: number;
        let t1: number;
        let t2: number;
        let x2: number;
        let d2: number;
        let i: number;

        // First try a few iterations of Newton's method, which normally converges very fast
        for (t2 = progress, i = 0; i < 32; i++) {
            x2 = this.sampleCurveX(t2) - progress;
            if (Math.abs(x2) < UnitBezier.epsilon) return t2;
            d2 = this.sampleCurveDerivativeX(t2);
            if (Math.abs(d2) < UnitBezier.epsilon) break;
            t2 = t2 - x2 / d2;
        }

        // No solution found, fall back to bisection
        t0 = 0.0;
        t1 = 1.0;
        t2 = progress;

        if (t2 < t0) return t0;
        if (t2 > t1) return t1;

        while (t0 < t1) {
            x2 = this.sampleCurveX(t2);
            if (Math.abs(x2 - progress) < UnitBezier.epsilon) return t2;
            if (progress > x2) t0 = t2;
            else t1 = t2;

            t2 = (t1 - t0) * 0.5 + t0;
        }

        // Give up and return the last estimate
        return t2;
    }

    /** Returns the y coordinate of the curve at the x coordinate `progress`, in [0, 1]. */
    public solve(progress: number): number {
        return this.sampleCurveY(this.solveCurveX(progress));
    }
}
