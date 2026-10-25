import { LATIN_LETTER_PATTERN, LETTER_CODE_PATTERN } from './keyboard.constants';

/**
 * Modifier flags of a {@link Control}, combined with `|` (e.g. `CTRL | SHIFT`).
 *
 * `NONE` means that the control matches only when no modifier is pressed.
 */
export const NONE = 0,
    CTRL = 1 << 0,
    ALT = 1 << 1,
    SHIFT = 1 << 2;

/** Serializable form of a {@link Control}, see {@link Control.toJSON}. */
export interface ControlData {
    codes: string[];
    modifiers: number;
    fireOnce: boolean;
}

/** Codes of the modifier keys, which never make a control alone. */
const MODIFIER_CODES = new Set([
    'ShiftLeft',
    'ShiftRight',
    'ControlLeft',
    'ControlRight',
    'AltLeft',
    'AltRight',
    'MetaLeft',
    'MetaRight',
    'OSLeft',
    'OSRight',
]);

/** Names of the modifiers in the labels, in their order. */
const MODIFIER_LABELS: Array<[number, string]> = [
    [CTRL, 'Control'],
    [ALT, 'Alt'],
    [SHIFT, 'Shift'],
];

/** Labels of the keys whose code is not readable as it is. */
const KEY_LABELS: Record<string, string> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backquote: '`',
};

/** Key binding registered with `Keyboard.registerControl`. */
export class Control {
    /**
     * Key codes triggering the control, as `KeyboardEvent.code` values (see the key code
     * constants). Letter codes match the letter typed with the current keyboard layout, other
     * codes the physical key.
     */
    public codes: Array<string>;
    /**
     * Required modifiers, as a combination of `CTRL`, `ALT` and `SHIFT`; other modifiers may be
     * pressed too. With `NONE`, no modifier may be pressed.
     */
    public modifiers: number;
    /** Whether `Keyboard.isDown` reports the control as down only once per key press. */
    public fireOnce: boolean;

    public constructor(keyCodes: string | Array<string>, modifiers = NONE, fireOnce = false) {
        if (!Array.isArray(keyCodes)) {
            keyCodes = [keyCodes];
        }

        this.codes = keyCodes;
        this.modifiers = modifiers;
        this.fireOnce = fireOnce;
    }

    /**
     * Readable text of the control, to show to the player: its modifiers then its first key,
     * e.g. `Shift+A`, `Control+G` or `Up`.
     */
    public get label(): string {
        const modifiers = MODIFIER_LABELS.filter(([flag]) => this.modifiers & flag).map(
            ([, name]) => `${name}+`,
        );
        const code = this.codes[0] ?? '';
        const key =
            LETTER_CODE_PATTERN.exec(code)?.[1] ??
            /^Digit(\d)$/.exec(code)?.[1] ??
            KEY_LABELS[code] ??
            code.replace(/^Numpad/, 'Numpad ');
        return modifiers.join('') + key;
    }

    /** Whether the control and another one are triggered by a same key with the same modifiers. */
    public overlaps(other: Control): boolean {
        return (
            this.modifiers === other.modifiers &&
            this.codes.some((code) => other.codes.includes(code))
        );
    }

    public toJSON(): ControlData {
        return { codes: [...this.codes], modifiers: this.modifiers, fireOnce: this.fireOnce };
    }

    /** Reads a control written by {@link Control.toJSON}, null when the data is not one. */
    public static fromJSON(data: unknown): Control | null {
        const { codes, modifiers, fireOnce } = (data ?? {}) as Partial<ControlData>;
        const valid =
            Array.isArray(codes) &&
            codes.length > 0 &&
            codes.every((code) => typeof code === 'string') &&
            Number.isInteger(modifiers) &&
            typeof fireOnce === 'boolean';
        return valid ? new Control(codes, modifiers, fireOnce) : null;
    }

    /**
     * Control triggered by the key of a key event and its modifiers, e.g. to bind a control to
     * the next key pressed. A latin letter gives its letter code, matching the letter typed
     * whatever the keyboard layout (see `Keyboard`), the other keys their physical code.
     *
     * @returns The control, null for a modifier key alone.
     */
    public static fromKeyboardEvent(e: KeyboardEvent, fireOnce = false): Control | null {
        if (MODIFIER_CODES.has(e.code) || !e.code) {
            return null;
        }

        const code = LATIN_LETTER_PATTERN.test(e.key ?? '') ? `Key${e.key.toUpperCase()}` : e.code;
        const modifiers = (e.ctrlKey ? CTRL : 0) | (e.altKey ? ALT : 0) | (e.shiftKey ? SHIFT : 0);
        return new Control(code, modifiers, fireOnce);
    }
}
