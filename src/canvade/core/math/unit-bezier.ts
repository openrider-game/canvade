export class UnitBezier {
    private static epsilon: number = 1e-5; // Precision

    private cx: number;
    private bx: number;
    private ax: number;
    private cy: number;
    private by: number;
    private ay: number;

    public constructor(p1: number, p2: number, p3: number, p4: number) {
        // pre-calculate the polynomial coefficients
        // First and last control points are implied to be (0,0) and (1.0, 1.0)
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

    private solveCurveX(progress: number) {
        let t0: number;
        let t1: number;
        let t2: number;
        let x2: number;
        let d2: number;
        let i: number;

        // First try a few iterations of Newton's method -- normally very fast.
        for (t2 = progress, i = 0; i < 32; i++) {
            x2 = this.sampleCurveX(t2) - progress;
            if (Math.abs(x2) < UnitBezier.epsilon) return t2;
            d2 = this.sampleCurveDerivativeX(t2);
            if (Math.abs(d2) < UnitBezier.epsilon) break;
            t2 = t2 - x2 / d2;
        }

        // No solution found - use bi-section
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

        // Give up
        return t2;
    }

    // Find new T as a function of Y along curve X
    public solve(progress: number): number {
        return this.sampleCurveY(this.solveCurveX(progress));
    }
}
