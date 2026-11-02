/** What a text field drawn on the canvas gives to the {@link SoftKeyboard}, e.g. a `UIInput`. */
export interface SoftKeyboardTarget {
    readonly value: string;
    readonly selectionStart: number;
    readonly selectionEnd: number;
    /** Number of characters at most, 0 for no limit. */
    readonly maxLength: number;
    /** Takes the text typed, with the selection of the hidden input. */
    typeText(value: string, selectionStart: number, selectionEnd: number): void;
    /** Submits the text, e.g. on the Enter key of the keyboard. */
    submit(): void;
    /** Removes the focus of the field, the keyboard being closed. */
    blur(): void;
}

/** Styles of the hidden input: invisible, untouchable, and large enough not to zoom on iOS. */
const HIDDEN_INPUT_STYLE: Partial<CSSStyleDeclaration> = {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    border: '0',
    padding: '0',
    pointerEvents: 'none',
    // Under 16px, iOS zooms the page in on focus
    fontSize: '16px',
};

/**
 * Keyboard of the touch screens for the text fields drawn on the canvas.
 *
 * A canvas never opens the keyboard of a phone or a tablet, only a text field of the page does.
 * A field drawn on the canvas opens it by focusing a hidden `<input>` of the page in the handler
 * of a touch (see {@link SoftKeyboard.open}): the browsers only open the keyboard for a focus
 * given during a gesture of the user. The text typed in the hidden input, with its selection, is
 * then copied to the field; Enter submits the field and closes the keyboard, and closing the
 * keyboard removes the focus of the field. The element focused before, e.g. the canvas, gets the
 * focus back once the field is done.
 *
 * The hidden input is added to the element in fullscreen if any, a page element outside of it not
 * being displayed, else to the body.
 */
export abstract class SoftKeyboard {
    private static input: HTMLInputElement | null = null;
    private static field: SoftKeyboardTarget | null = null;
    /** Element focused before the keyboard opened, focused again once it closes. */
    private static previous: HTMLElement | null = null;

    /** Field the keyboard types in, null while closed. */
    public static get target(): SoftKeyboardTarget | null {
        return SoftKeyboard.field;
    }

    /**
     * Opens the keyboard for a field, with its text and selection: to call in the handler of a
     * touch, as the browsers only open the keyboard during a gesture. Nothing happens without a
     * page, e.g. in Node.
     */
    public static open(field: SoftKeyboardTarget): void {
        const input = SoftKeyboard.element();
        if (!input) {
            return;
        }
        if (SoftKeyboard.field !== field) {
            const active = document.activeElement;
            SoftKeyboard.previous =
                active instanceof HTMLElement && active !== input ? active : SoftKeyboard.previous;
        }
        SoftKeyboard.field = field;

        input.value = field.value;
        input.maxLength = field.maxLength > 0 ? field.maxLength : 524288;
        const container = document.fullscreenElement ?? document.body;
        if (input.parentElement !== container) {
            container.appendChild(input);
        }
        input.focus({ preventScroll: true });
        input.setSelectionRange(field.selectionStart, field.selectionEnd);
    }

    /**
     * Closes the keyboard of a field, e.g. once it lost the focus, giving the focus back to the
     * element focused before. Nothing happens if the keyboard types in another field.
     */
    public static close(field: SoftKeyboardTarget): void {
        if (SoftKeyboard.field !== field) {
            return;
        }
        SoftKeyboard.field = null;
        const previous = SoftKeyboard.previous;
        SoftKeyboard.previous = null;
        // Focusing the element before blurs the hidden input, closing the keyboard
        if (previous?.isConnected) {
            previous.focus({ preventScroll: true });
        } else {
            SoftKeyboard.input?.blur();
        }
    }

    /** The hidden input, created on first use with its listeners, null without a page. */
    private static element(): HTMLInputElement | null {
        if (SoftKeyboard.input) {
            return SoftKeyboard.input;
        }
        if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') {
            return null;
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.autocomplete = 'off';
        input.setAttribute('autocapitalize', 'sentences');
        input.setAttribute('aria-hidden', 'true');
        input.tabIndex = -1;
        Object.assign(input.style, HIDDEN_INPUT_STYLE);

        input.addEventListener('input', () => {
            const length = input.value.length;
            SoftKeyboard.field?.typeText(
                input.value,
                input.selectionStart ?? length,
                input.selectionEnd ?? length,
            );
        });
        input.addEventListener('keydown', (e) => {
            const field = SoftKeyboard.field;
            if (!field || (e.key !== 'Enter' && e.key !== 'Escape')) {
                return;
            }
            e.preventDefault();
            // The focus going back to the canvas meanwhile, the key would reach its controls too
            e.stopPropagation();
            if (e.key === 'Enter') {
                field.submit();
            }
            field.blur();
        });
        // The keyboard closed by the user, or the focus given elsewhere
        input.addEventListener('blur', () => {
            const field = SoftKeyboard.field;
            SoftKeyboard.field = null;
            SoftKeyboard.previous = null;
            field?.blur();
        });

        SoftKeyboard.input = input;
        return input;
    }
}
