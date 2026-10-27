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

    test('releases every control held at once, e.g. when the canvas loses the focus', () => {
        const dispatchEvent = vi.fn();
        vi.stubGlobal('document', { dispatchEvent });
        Keyboard.registerControl('left-test', new Control('ArrowLeft'));
        Keyboard.registerControl('right-test', new Control('ArrowRight'));
        Keyboard.onKeyDown(createKeyboardEvent('ArrowLeft'));
        Keyboard.press('right-test');
        dispatchEvent.mockClear();

        Keyboard.releaseAll();

        expect(Keyboard.isDown('left-test') || Keyboard.isDown('right-test')).toBe(false);
        const released = dispatchEvent.mock.calls.map(([e]) => [e.type, e.detail.key]);
        expect(released).toEqual([
            ['keyboardup', 'left-test'],
            ['keyboardup', 'right-test'],
        ]);
        Keyboard.releaseAll();
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

    test('matches letter controls with the typed letter, whatever the keyboard layout', () => {
        vi.stubGlobal('document', { dispatchEvent: vi.fn() });
        Keyboard.registerControl('undo-test', new Control('KeyM'));
        Keyboard.registerControl('line-test', new Control('KeyQ'));
        Keyboard.registerControl('brush-test', new Control('KeyA'));

        // the M key of an AZERTY keyboard is where the semicolon is on a QWERTY one
        const azertyM = createKeyboardEvent('Semicolon', {}, 'm');
        Keyboard.onKeyDown(azertyM);
        expect(Keyboard.isDown('undo-test')).toBe(true);
        Keyboard.onKeyUp(azertyM);
        expect(Keyboard.isDown('undo-test')).toBe(false);

        // the A key of an AZERTY keyboard is where the Q is on a QWERTY one
        const azertyA = createKeyboardEvent('KeyQ', {}, 'a');
        Keyboard.onKeyDown(azertyA);
        expect(Keyboard.isDown('brush-test')).toBe(true);
        expect(Keyboard.isDown('line-test')).toBe(false);
        Keyboard.onKeyUp(azertyA);

        // shifted letters still match
        const shiftedA = createKeyboardEvent('KeyQ', { shiftKey: true }, 'A');
        Keyboard.registerControl('shift-brush-test', new Control('KeyA', SHIFT));
        Keyboard.onKeyDown(shiftedA);
        expect(Keyboard.isDown('shift-brush-test')).toBe(true);
        Keyboard.onKeyUp(shiftedA);
    });

    test('releases a control whatever the modifiers pressed meanwhile', () => {
        const dispatchEvent = vi.fn();
        vi.stubGlobal('document', { dispatchEvent });
        Keyboard.registerControl('up-test', new Control('ArrowUp'));

        Keyboard.onKeyDown(createKeyboardEvent('ArrowUp', {}, 'ArrowUp'));
        expect(Keyboard.isDown('up-test')).toBe(true);

        Keyboard.onKeyUp(createKeyboardEvent('ArrowUp', { shiftKey: true }, 'ArrowUp'));
        expect(Keyboard.isDown('up-test')).toBe(false);
        expect(dispatchEvent).toHaveBeenCalledTimes(2);
    });

    test('releases a control when one of its modifiers is released first', () => {
        vi.stubGlobal('document', { dispatchEvent: vi.fn() });
        Keyboard.registerControl('save-test', new Control('KeyS', CTRL));

        Keyboard.onKeyDown(createKeyboardEvent('KeyS', { ctrlKey: true }, 's'));
        expect(Keyboard.isDown('save-test')).toBe(true);

        const controlUp = createKeyboardEvent('ControlLeft', {}, 'Control');
        Keyboard.onKeyUp(controlUp);
        expect(Keyboard.isDown('save-test')).toBe(false);
        // Only the released keys of the controls are prevented
        expect(controlUp.preventDefault).not.toHaveBeenCalled();
    });

    test('ignores keys matching no control', () => {
        const dispatchEvent = vi.fn();
        vi.stubGlobal('document', { dispatchEvent });
        Keyboard.registerControl('ignored-test', new Control('KeyK'));
        const event = createKeyboardEvent('KeyL', {}, 'l');

        Keyboard.onKeyDown(event);
        Keyboard.onKeyUp(event);

        expect(Keyboard.isDown('ignored-test')).toBe(false);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(dispatchEvent).not.toHaveBeenCalled();
    });

    test('falls back to the physical key when the typed key is not a latin letter', () => {
        vi.stubGlobal('document', { dispatchEvent: vi.fn() });
        Keyboard.registerControl('cyrillic-test', new Control('KeyM'));
        Keyboard.registerControl('digit-test', new Control('Digit1'));

        const cyrillic = createKeyboardEvent('KeyM', {}, 'ь');
        Keyboard.onKeyDown(cyrillic);
        expect(Keyboard.isDown('cyrillic-test')).toBe(true);
        Keyboard.onKeyUp(cyrillic);

        // the 1 of an AZERTY keyboard types & without shift
        const azertyDigit = createKeyboardEvent('Digit1', {}, '&');
        Keyboard.onKeyDown(azertyDigit);
        expect(Keyboard.isDown('digit-test')).toBe(true);
        Keyboard.onKeyUp(azertyDigit);
    });
});

function createKeyboardEvent(
    code: string,
    modifiers: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'shiftKey'>> = {},
    key = '',
): KeyboardEvent {
    return {
        code,
        key,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: vi.fn(),
        ...modifiers,
    } as unknown as KeyboardEvent;
}
