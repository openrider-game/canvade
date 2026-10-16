import { Interpolation } from '../../core/math/interpolation';

/**
 * Easing function mapping a progress in [0, 1] to an eased progress, called with `this` bound to
 * {@link Interpolation} so that its functions can be passed as is.
 */
export type UIAnimationEasing = (progress: number) => number;

/** Options of a UI animation. */
export interface UIAnimationOptions {
    /** Duration in milliseconds; 0 applies the target value immediately. */
    duration: number;
    /** Easing of the animation, {@link Interpolation.easeInOut} by default. */
    easing?: UIAnimationEasing;
}

/** Eased transition between two numbers over a duration, advanced manually. */
export class UIAnimation {
    private elapsed = 0;
    private readonly easing: UIAnimationEasing;

    /**
     * Creates an animation from `from` to `to`.
     *
     * @param duration - Duration in milliseconds.
     * @throws When a value is not finite or the duration is negative or not finite.
     */
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

    /**
     * Advances the animation and returns the current value.
     *
     * The endpoints can be given at each call, e.g. when they are re-resolved against a parent
     * size that may change; they default to the constructor ones.
     *
     * @param delta - Elapsed time since the previous call, in milliseconds.
     * @returns The current value, and whether the animation is complete; a complete animation
     * returns exactly `to`.
     * @throws When `delta` is negative or a value is not finite.
     */
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

        // The Interpolation easings call each other through `this`
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
