import { describe, expect, test } from 'vitest';
import { Vector } from '../../src/canvade/core/math/vector';

describe('Vector', () => {
    test('supports arithmetic, mutation, and geometric operations', () => {
        const vector = new Vector(3, 4);
        const other = new Vector(1, 2);

        expect(vector.add(other)).toEqual(new Vector(4, 6));
        expect(vector.sub(other)).toEqual(new Vector(2, 2));
        expect(vector.scale(2)).toEqual(new Vector(6, 8));
        expect(vector.recipScale(2)).toEqual(new Vector(1.5, 2));
        expect(vector.dot(other)).toBe(11);
        expect(vector.getLength()).toBe(5);
        expect(vector.lengthSquared()).toBe(25);
        expect(vector.distanceTo(other)).toBeCloseTo(Math.sqrt(8));
        expect(vector.distanceToSquared(other)).toBe(8);

        vector.selfAdd(other).selfSub(new Vector(1, 1)).selfScale(2);
        expect(vector).toEqual(new Vector(6, 10));
    });

    test('clones independently and serializes rounded coordinates in base 32', () => {
        const vector = new Vector(6.2, 10.4);
        const clone = vector.clone();
        clone.x = 9;

        expect(vector).toEqual(new Vector(6.2, 10.4));
        expect(vector.toString()).toBe('6 a');
    });
});
