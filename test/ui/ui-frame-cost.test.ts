import { describe, expect, test, vi } from 'vitest';
import { EventEmitter } from '../../src/canvade/event/event-emitter';
import { UIButton } from '../../src/canvade/ui/elements/ui-button';
import { resolveUIUnit } from '../../src/canvade/ui/properties/ui-property-resolution';
import { createCanvasMock } from '../helpers/canvas';

describe('UI frames', () => {
    test('give each subscription its own id, and tell whether an event has receivers', () => {
        const first = new EventEmitter<{ ping: number }>();
        const second = new EventEmitter<{ ping: number }>();
        expect(first.hasReceivers('ping')).toBe(false);

        const received: number[] = [];
        const id = first.subscribe('ping', (value) => received.push(value));
        const other = second.subscribe('ping', () => {});
        expect(id).not.toBe(other);
        expect(first.hasReceivers('ping')).toBe(true);
        first.dispatch('ping', 3);
        expect(received).toEqual([3]);

        expect(first.unsubscribe('ping', id)).toBe(true);
        expect(first.hasReceivers('ping')).toBe(false);
    });

    test('read each unit once, an invalid one refused every time', () => {
        expect(resolveUIUnit('25%', 200)).toBe(50);
        expect(resolveUIUnit('25%', 400)).toBe(100);
        expect(resolveUIUnit('12px', 400)).toBe(12);
        expect(() => resolveUIUnit('12pt' as never, 100)).toThrow('Invalid UI unit: 12pt');
        expect(() => resolveUIUnit('12pt' as never, 100)).toThrow('Invalid UI unit: 12pt');
    });

    test('clip around the children only, and build the renderTree event only when received', () => {
        const ctx = createCanvasMock().context;
        const leaf = new UIButton([], {});
        const bounds = { x: 0, y: 0, width: 100, height: 50 };

        leaf.render(ctx, bounds);
        // A leaf: nothing to clip
        expect(vi.mocked(ctx.clip)).not.toHaveBeenCalled();

        const parent = new UIButton([], {});
        parent.addChild(leaf);
        const rendered = vi.fn();
        parent.subscribe('renderTree', rendered);
        parent.render(ctx, bounds);
        expect(vi.mocked(ctx.clip)).toHaveBeenCalledOnce();
        expect(rendered).toHaveBeenCalledOnce();
    });
});
