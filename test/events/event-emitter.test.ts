import { describe, expect, test, vi } from 'vitest';
import { EventEmitter } from '../../src/canvade/event/event-emitter';

type TestEvents = {
    ping: CustomEvent<string> | undefined;
    pulse: CustomEvent<number> | undefined;
};

describe('EventEmitter', () => {
    test('dispatches subscribed listeners with the event payload', () => {
        const emitter = new EventEmitter<TestEvents>();
        const listener = vi.fn();
        const payload = new CustomEvent('ping', { detail: 'hello world' });

        emitter.subscribe('ping', listener);
        emitter.dispatch('ping', payload);

        expect(listener).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenCalledWith(payload);
    });

    test('removes a listener by subscription id', () => {
        const emitter = new EventEmitter<TestEvents>();
        const listener = vi.fn();
        const id = emitter.subscribe('pulse', listener);

        emitter.dispatch('pulse', new CustomEvent('pulse', { detail: 1 }));
        expect(emitter.unsubscribe('pulse', id)).toBe(true);
        emitter.dispatch('pulse', new CustomEvent('pulse', { detail: 2 }));

        expect(listener).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ detail: 1 }));
        expect(emitter.unsubscribe('pulse', id)).toBe(false);
    });
});
