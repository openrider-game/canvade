import { ALT, Control, CTRL, NONE, SHIFT } from './control';
import { KEYBOARD_DOWN_EVENT, KEYBOARD_UP_EVENT } from '../event.constants';
import { LATIN_LETTER_PATTERN, LETTER_CODE_PATTERN } from './keyboard.constants';

/** Detail of the custom events dispatched by {@link Keyboard} when a control changes. */
export type KeyboardEventPayload = {
    /** Key event pressing or releasing the control, null without a key (see {@link Keyboard.press}). */
    keyboardEvent: KeyboardEvent | null;
    /** Name of the control, as registered with {@link Keyboard.registerControl}. */
    key: string;
};

/**
 * Global registry of named key bindings ({@link Control | controls}) and of their state.
 *
 * A control matching a key event follows the typed letter for letter key codes (so `KeyM` is
 * the M key of an AZERTY keyboard too) and the physical key position for the other codes. The
 * state can be polled with {@link Keyboard.isDown}, typically in `fixedUpdate`, or followed with
 * the `keyboardDown` and `keyboardUp` events of the states, whose `key` is the control name.
 *
 * The key events are fed by the event manager while the canvas has the focus. A control can also
 * be held without its key, e.g. by an on-screen button of a touch screen, with
 * {@link Keyboard.press} and {@link Keyboard.release}.
 */
export abstract class Keyboard {
    private static controls: Map<string, Control> = new Map<string, Control>();
    private static holding: Map<string, boolean> = new Map<string, boolean>();
    /** Fire-once controls already reported by `isDown` during the current key press. */
    private static firedOnce: Map<string, boolean> = new Map<string, boolean>();

    /**
     * Registers a control under a name, replacing the control previously registered with it,
     * e.g. to bind it to another key: a control held down is released first, its key being
     * replaced.
     */
    public static registerControl(name: string, control: Control): void {
        Keyboard.release(name);
        Keyboard.controls.set(name, control);
    }

    /** Control registered under a name, undefined without one. */
    public static getControl(name: string): Control | undefined {
        return Keyboard.controls.get(name);
    }

    /**
     * Returns whether a control is held down.
     *
     * For a {@link Control.fireOnce} control, only the first call during a key press returns
     * `true`: the call itself consumes the press.
     */
    public static isDown(name: string): boolean {
        const holding = !!Keyboard.holding.get(name);
        const fireOnce = Keyboard.controls.get(name)?.fireOnce;
        const firedOnce = !!Keyboard.firedOnce.get(name);

        if (fireOnce && !firedOnce && holding) {
            Keyboard.firedOnce.set(name, true);
            return true;
        }

        return holding && (!fireOnce || !firedOnce);
    }

    /**
     * Holds a registered control down without its key, as its key would, dispatching
     * {@link KEYBOARD_DOWN_EVENT} when newly held, e.g. while an on-screen button is touched.
     */
    public static press(name: string): void {
        if (!Keyboard.controls.has(name) || Keyboard.holding.get(name)) {
            return;
        }
        Keyboard.holding.set(name, true);
        Keyboard.dispatchControl(KEYBOARD_DOWN_EVENT, null, name);
    }

    /** Releases a control held down, dispatching {@link KEYBOARD_UP_EVENT}, as its key would. */
    public static release(name: string): void {
        if (!Keyboard.holding.get(name)) {
            return;
        }
        Keyboard.holding.set(name, false);
        Keyboard.firedOnce.set(name, false);
        Keyboard.dispatchControl(KEYBOARD_UP_EVENT, null, name);
    }

    /**
     * Releases every control held down, dispatching {@link KEYBOARD_UP_EVENT} for each one, e.g.
     * when the canvas loses the focus: their keys could be released elsewhere, unseen.
     */
    public static releaseAll(): void {
        Keyboard.holding.forEach((holding, name) => {
            if (holding) {
                Keyboard.release(name);
            }
        });
    }

    /** Dispatches the custom event of a control change on the document. */
    private static dispatchControl(
        type: typeof KEYBOARD_DOWN_EVENT | typeof KEYBOARD_UP_EVENT,
        keyboardEvent: KeyboardEvent | null,
        key: string,
    ): void {
        document.dispatchEvent(
            new CustomEvent<KeyboardEventPayload>(type, { detail: { keyboardEvent, key } }),
        );
    }

    /**
     * Letter codes match the letter typed with the current keyboard layout (e.g. `KeyM` is the
     * M key of an AZERTY keyboard too), other codes match the physical key position.
     */
    private static matchesCode(code: string, e: KeyboardEvent): boolean {
        const letter = LETTER_CODE_PATTERN.exec(code)?.[1];
        // Layouts typing no latin letter on this key fall back to the physical position
        if (letter && LATIN_LETTER_PATTERN.test(e.key ?? '')) {
            return e.key.toUpperCase() === letter;
        }

        return e.code === code;
    }

    private static matchesKey(control: Control, e: KeyboardEvent): boolean {
        return control.codes.some((code) => Keyboard.matchesCode(code, e));
    }

    /** Whether the modifiers required by the control are pressed. */
    private static hasRequiredModifiers(control: Control, e: KeyboardEvent): boolean {
        return (
            (!(control.modifiers & CTRL) || e.ctrlKey) &&
            (!(control.modifiers & ALT) || e.altKey) &&
            (!(control.modifiers & SHIFT) || e.shiftKey)
        );
    }

    /**
     * Whether a key down event presses the control: one of its keys with its modifiers, a
     * control without modifiers requiring that none is pressed.
     */
    private static test(control: Control, e: KeyboardEvent): boolean {
        if (!Keyboard.matchesKey(control, e)) {
            return false;
        }

        if (control.modifiers === NONE) {
            return !e.ctrlKey && !e.altKey && !e.shiftKey;
        }

        return Keyboard.hasRequiredModifiers(control, e);
    }

    /**
     * Marks the controls matching a key down event as held, dispatching
     * {@link KEYBOARD_DOWN_EVENT} on the document for each newly pressed one.
     *
     * Auto-repeated key down events do not dispatch the event again. Called by the event
     * manager.
     */
    public static onKeyDown(e: KeyboardEvent): void {
        Keyboard.controls.forEach((control, key) => {
            if (Keyboard.test(control, e)) {
                e.preventDefault();
                if (!Keyboard.holding.get(key)) {
                    Keyboard.holding.set(key, true);
                    Keyboard.dispatchControl(KEYBOARD_DOWN_EVENT, e, key);
                }
            }
        });
    }

    /**
     * Releases the held controls matching a key up event, dispatching
     * {@link KEYBOARD_UP_EVENT} on the document for each of them.
     *
     * A control is released by releasing one of its keys, whatever the modifiers still pressed,
     * or by releasing one of the modifiers it requires. Called by the event manager.
     */
    public static onKeyUp(e: KeyboardEvent): void {
        Keyboard.controls.forEach((control, key) => {
            const keyReleased = Keyboard.matchesKey(control, e);
            if (keyReleased) {
                e.preventDefault();
            }

            if (keyReleased || !Keyboard.hasRequiredModifiers(control, e)) {
                if (Keyboard.holding.get(key)) {
                    Keyboard.holding.set(key, false);
                    Keyboard.firedOnce.set(key, false);
                    Keyboard.dispatchControl(KEYBOARD_UP_EVENT, e, key);
                }
            }
        });
    }
}
