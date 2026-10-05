import { afterEach, describe, expect, test, vi } from 'vitest';
import { Control, CTRL, SHIFT } from '../../src/canvade/event/keyboard/control';
import { Keyboard } from '../../src/canvade/event/keyboard/keyboard';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Keyboard controls', () => {
    test('reports a key as held and emits down/up events once per transition', () => {
        const dispatchEvent = vi.fn();
        vi.stubGlobal('document', { dispatchEvent });
        const event = createKeyboardEvent('Space');

        Keyboard.registerControl('jump-test', new Control('Space'));
        Keyboard.onKeyDown(event);

        expect(Keyboard.isDown('jump-test')).toBe(true);
        expect(Keyboard.isDown('jump-test')).toBe(true);
        expect(dispatchEvent).toHaveBeenCalledTimes(1);
        expect(event.preventDefault).toHaveBeenCalledOnce();

        Keyboard.onKeyUp(event);

        expect(Keyboard.isDown('jump-test')).toBe(false);
        expect(dispatchEvent).toHaveBeenCalledTimes(2);
    });

    test('matches modifiers and supports fire-once controls', () => {
        const dispatchEvent = vi.fn();
        vi.stubGlobal('document', { dispatchEvent });
        const event = createKeyboardEvent('KeyD', { ctrlKey: true, shiftKey: true });

        Keyboard.registerControl('dash-test', new Control('KeyD', CTRL | SHIFT, true));
        Keyboard.onKeyDown(event);

        expect(Keyboard.isDown('dash-test')).toBe(true);
        expect(Keyboard.isDown('dash-test')).toBe(false);

        Keyboard.onKeyUp(event);
        expect(Keyboard.isDown('dash-test')).toBe(false);
    });
});

function createKeyboardEvent(
    code: string,
    modifiers: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'shiftKey'>> = {},
): KeyboardEvent {
    return {
        code,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: vi.fn(),
        ...modifiers,
    } as unknown as KeyboardEvent;
}
