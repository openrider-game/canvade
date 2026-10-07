import { Interpolation } from '../../core/math/interpolation';

export type UIAnimationEasing = (progress: number) => number;

export interface UIAnimationOptions {
    /** Duration in milliseconds. */
    duration: number;
    easing?: UIAnimationEasing;
}

export class UIAnimation {
    private elapsed = 0;
    private readonly easing: UIAnimationEasing;

    constructor(
        private readonly from: number,
        private readonly to: number,
        private readonly duration: number,
        easing: UIAnimationEasing = Interpolation.easeInOut,
    ) {
        if (!Number.isFinite(from) || !Number.isFinite(to)) {
            throw new Error('UI animation values must be finite numbers');
        }
        if (!Number.isFinite(duration) || duration < 0) {
            throw new Error('UI animation duration must be a non-negative finite number');
        }

        this.easing = easing;
    }

    public update(
        delta: number,
        from: number = this.from,
        to: number = this.to,
    ): { value: number; complete: boolean } {
        if (!Number.isFinite(delta) || delta < 0) {
            throw new Error('UI animation delta must be a non-negative finite number');
        }
        if (!Number.isFinite(from) || !Number.isFinite(to)) {
            throw new Error('UI animation values must be finite numbers');
        }

        if (this.duration === 0) {
            return { value: to, complete: true };
        }

        this.elapsed = Math.min(this.duration, this.elapsed + delta);
        const progress = this.elapsed / this.duration;
        if (progress === 1) {
            return { value: to, complete: true };
        }

        const easedProgress = this.easing.call(Interpolation, progress);
        if (!Number.isFinite(easedProgress)) {
            throw new Error('UI animation easing must return a finite number');
        }

        return {
            value: Interpolation.linear(from, to, easedProgress),
            complete: false,
        };
    }
}
