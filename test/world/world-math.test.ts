import { describe, expect, test } from 'vitest';
import { Vector } from '../../src/canvade/core/math/vector';
import { World } from '../../src/canvade/world/world';
import { WorldVector } from '../../src/canvade/world/world-vector';

describe('World coordinates', () => {
    test('converts canvas coordinates into world coordinates', () => {
        const world = createWorld(new Vector(10, 20), 2);

        expect(WorldVector.toWorld(new Vector(120, 70), world, 200, 100)).toEqual(
            new Vector(20, 30),
        );
    });

    test('converts back and forth between canvas and world coordinates', () => {
        const world = createWorld(new Vector(-35, 12), 0.6);
        const pixel = new Vector(42, 17);

        const roundTrip = WorldVector.toPixel(
            WorldVector.toWorld(pixel, world, 700, 400),
            world,
            700,
            400,
        );

        expect(roundTrip.x).toBeCloseTo(pixel.x);
        expect(roundTrip.y).toBeCloseTo(pixel.y);
    });

    test('converts world coordinates to canvas pixels relative to the camera', () => {
        const world = createWorld(new Vector(5, 10), 2);

        expect(WorldVector.toPixel(new Vector(5, 10), world, 200, 100)).toEqual(
            new Vector(100, 50),
        );
    });

    test('zooms toward a world position within the configured bounds', () => {
        const world = createWorld();

        world.zoom(new Vector(40, 30), 1, 200, 100, 0.5, 2, 0.5);

        expect(world.zoomFactor).toBe(1.1);
        expect(world.camera.x).toBeCloseTo(18.1818181818);
        expect(world.camera.y).toBeCloseTo(13.6363636364);

        world.zoom(new Vector(40, 30), -1, 200, 100, 0.5, 2, 0.5);
        expect(world.zoomFactor).toBe(0.6);
    });
});

function createWorld(camera = new Vector(), zoomFactor = 0.6): World {
    return new (class extends World {})(camera, zoomFactor);
}
