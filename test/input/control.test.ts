import { afterEach, describe, expect, test, vi } from 'vitest';
import { ALT, Control, CTRL, NONE, SHIFT } from '../../src/canvade/event/keyboard/control';
import {
    ARROWUP,
    DIGIT1,
    KEYA,
    KEYG,
    NUMPAD5,
    SPACE,
} from '../../src/canvade/event/keyboard/key-codes';
import { Keyboard } from '../../src/canvade/event/keyboard/keyboard';

/** Key event double, with the given key, code and modifiers. */
function keyEvent(key: string, code: string, modifiers: Partial<KeyboardEvent> = {}) {
    return {
        key,
        code,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        ...modifiers,
    } as KeyboardEvent;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Controls', () => {
    test('read as their modifiers then their key', () => {
        expect(new Control(KEYA, SHIFT).label).toBe('Shift+A');
        expect(new Control(KEYG, CTRL | SHIFT).label).toBe('Control+Shift+G');
        expect(new Control(ARROWUP).label).toBe('Up');
        expect(new Control(DIGIT1, ALT).label).toBe('Alt+1');
        expect(new Control(SPACE).label).toBe('Space');
        expect(new Control(NUMPAD5).label).toBe('Numpad 5');
        expect(new Control('Slash').label).toBe('/');
    });

    test('are made from a key pressed, with its modifiers', () => {
        // The letter typed, whatever the layout: Q on the A key of an AZERTY keyboard
        expect(Control.fromKeyboardEvent(keyEvent('q', 'KeyA'))?.toJSON()).toEqual({
            codes: ['KeyQ'],
            modifiers: NONE,
            fireOnce: false,
        });
        expect(Control.fromKeyboardEvent(keyEvent('G', 'KeyG', { shiftKey: true }))?.label).toBe(
            'Shift+G',
        );
        expect(Control.fromKeyboardEvent(keyEvent('ArrowUp', 'ArrowUp'), true)?.fireOnce).toBe(
            true,
        );
        // A modifier alone is not a control
        expect(Control.fromKeyboardEvent(keyEvent('Shift', 'ShiftLeft', { shiftKey: true }))).toBe(
            null,
        );
    });

    test('are written to and read from JSON, refusing anything else', () => {
        const control = new Control([KEYA, ARROWUP], CTRL, true);
        const read = Control.fromJSON(JSON.parse(JSON.stringify(control)));

        expect(read).toEqual(control);
        expect(Control.fromJSON(null)).toBeNull();
        expect(Control.fromJSON({ codes: [], modifiers: 0, fireOnce: false })).toBeNull();
        expect(Control.fromJSON({ codes: ['KeyA'], modifiers: 'x', fireOnce: false })).toBeNull();
    });

    test('overlap when a same key and the same modifiers trigger them', () => {
        const a = new Control([KEYA, ARROWUP]);

        expect(a.overlaps(new Control(ARROWUP))).toBe(true);
        expect(a.overlaps(new Control(ARROWUP, SHIFT))).toBe(false);
        expect(a.overlaps(new Control(KEYG))).toBe(false);
    });
});

describe('Keyboard controls bound again', () => {
    test('are released first, their key being replaced', () => {
        vi.stubGlobal('document', { dispatchEvent: vi.fn() });
        Keyboard.registerControl('Jump', new Control(SPACE));
        Keyboard.press('Jump');

        Keyboard.registerControl('Jump', new Control(KEYA));

        expect(Keyboard.isDown('Jump')).toBe(false);
        expect(Keyboard.getControl('Jump')?.label).toBe('A');
        expect(vi.mocked(document.dispatchEvent)).toHaveBeenCalledTimes(2);
    });
});
