/**
 * Modifier flags of a {@link Control}, combined with `|` (e.g. `CTRL | SHIFT`).
 *
 * `NONE` means that the control matches only when no modifier is pressed.
 */
export const NONE = 0,
    CTRL = 1 << 0,
    ALT = 1 << 1,
    SHIFT = 1 << 2;

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
}
