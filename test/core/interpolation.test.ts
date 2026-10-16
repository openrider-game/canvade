import { describe, expect, test } from 'vitest';
import { Interpolation } from '../../src/canvade/core/math/interpolation';

const EASINGS = {
    easeIn: (progress: number) => Interpolation.easeIn(progress),
    easeOut: (progress: number) => Interpolation.easeOut(progress),
    easeInOut: (progress: number) => Interpolation.easeInOut(progress),
    easeInCubic: (progress: number) => Interpolation.easeInCubic(progress),
    easeOutCubic: (progress: number) => Interpolation.easeOutCubic(progress),
    easeInOutCubic: (progress: number) => Interpolation.easeInOutCubic(progress),
};

describe('Interpolation', () => {
    test('interpolates linearly between two values', () => {
        expect(Interpolation.linear(10, 30, 0)).toBe(10);
        expect(Interpolation.linear(10, 30, 0.25)).toBe(15);
        expect(Interpolation.linear(10, 30, 1)).toBe(30);
        expect(Interpolation.flip(0.25)).toBe(0.75);
    });

    test.each(Object.entries(EASINGS))('%s starts at 0 and ends at 1', (_name, easing) => {
        expect(easing(0)).toBeCloseTo(0);
        expect(easing(1)).toBeCloseTo(1);
    });

    test('eases in slowly and out quickly, or the other way around', () => {
        expect(Interpolation.easeIn(0.5)).toBe(0.25);
        expect(Interpolation.easeOut(0.5)).toBe(0.75);
        expect(Interpolation.easeInCubic(0.5)).toBe(0.125);
        expect(Interpolation.easeOutCubic(0.5)).toBe(0.875);
        // Symmetric easings go through the middle point
        expect(Interpolation.easeInOut(0.5)).toBe(0.5);
        expect(Interpolation.easeInOutCubic(0.5)).toBe(0.5);
        expect(Interpolation.easeInOut(0.25)).toBeLessThan(0.25);
        expect(Interpolation.easeInOut(0.75)).toBeGreaterThan(0.75);
    });

    test('solves cubic bezier curves like CSS timing functions', () => {
        // The linear curve
        expect(Interpolation.cubicBezier(0.3, 0, 0, 1, 1)).toBeCloseTo(0.3, 4);
        // CSS `ease-in-out` is symmetric around its middle
        const easeInOut = (progress: number) =>
            Interpolation.cubicBezier(progress, 0.42, 0, 0.58, 1);
        expect(easeInOut(0.5)).toBeCloseTo(0.5, 4);
        expect(easeInOut(0.2) + easeInOut(0.8)).toBeCloseTo(1, 4);
        // Curves going beyond 1 overshoot their target
        expect(Interpolation.cubicBezier(0.6, 0.34, 1.56, 0.64, 1)).toBeGreaterThan(1);
    });

    test('returns the same values for a cached curve', () => {
        const first = Interpolation.cubicBezier(0.4, 0.1, 0.7, 0.3, 0.9);
        const cached = Interpolation.cubicBezier(0.4, 0.1, 0.7, 0.3, 0.9);

        expect(cached).toBe(first);
    });
});
