import { EventFactory } from '../../event/event-factory';
import { GameValueEvent } from '../../event/types/ui-events';
import { UIProperty } from '../properties/ui-property.type';
import { UIElement, UIElementProperties } from '../ui-element';
import { TextLayout } from './text-layout';
import { TextSelection } from './text-selection';
import {
    UI_DEFAULT_BORDER_WIDTH,
    UI_DEFAULT_COLOR,
    UI_DEFAULT_FONT_SIZE,
    UI_FONT_FAMILY,
    UI_INPUT_BACKGROUND_COLOR,
    UI_INPUT_CARET_BLINK,
    UI_INPUT_FOCUS_COLOR,
    UI_INPUT_PADDING,
    UI_INPUT_PLACEHOLDER_COLOR,
    UI_INPUT_SELECTION_COLOR,
    UI_INPUT_TYPE,
} from '../ui.constants';

/**
 * Properties of a {@link UIInput}.
 *
 * `color` is the color of the text and of the border, `focusColor` the color of the border
 * while focused, the border being then 1 pixel wider than `borderWidth`. `selectionColor` is the
 * background of the selected text. `maxLength` limits the number of characters, 0 for no limit.
 */
type UIInputProperties = UIElementProperties & {
    value?: UIProperty<string>;
    placeholder?: UIProperty<string>;
    color?: UIProperty<string>;
    placeholderColor?: UIProperty<string>;
    backgroundColor?: UIProperty<string>;
    focusColor?: UIProperty<string>;
    selectionColor?: UIProperty<string>;
    borderWidth?: UIProperty<number>;
    fontSize?: UIProperty<number>;
    maxLength?: UIProperty<number>;
};

const defaultUIInputProperties: UIInputProperties = {
    value: new UIProperty(''),
    placeholder: new UIProperty(''),
    color: new UIProperty(UI_DEFAULT_COLOR),
    placeholderColor: new UIProperty(UI_INPUT_PLACEHOLDER_COLOR),
    backgroundColor: new UIProperty(UI_INPUT_BACKGROUND_COLOR),
    focusColor: new UIProperty(UI_INPUT_FOCUS_COLOR),
    selectionColor: new UIProperty(UI_INPUT_SELECTION_COLOR),
    borderWidth: new UIProperty(UI_DEFAULT_BORDER_WIDTH),
    fontSize: new UIProperty(UI_DEFAULT_FONT_SIZE),
    maxLength: new UIProperty(0),
};

/**
 * Single line text field drawn on the canvas, of type `input`.
 *
 * Pressing it focuses it and moves the caret under the mouse; dragging selects text, as does
 * pressing it with Shift. It then receives the keys typed while the canvas has the focus: the
 * printable characters, Backspace, Delete, the left and right arrows, Home and End, which select
 * text with Shift, and Ctrl+A (or Cmd+A) selecting everything. Enter dispatches `submit`, Escape
 * removes the focus, and each edit dispatches `change`. The keys it handles do not trigger the
 * `Keyboard` controls; the other keys pressed with Ctrl, Alt or Meta are left to them.
 *
 * Copying, cutting and pasting go through the clipboard events of the browser, fired by its usual
 * shortcuts: pasted text is inserted on one line, within `maxLength`.
 *
 * The value is the `value` property, which can be set from the styles or with
 * {@link UIInput.setValue}.
 */
export class UIInput extends UIElement<UIInputProperties> {
    private readonly selection = new TextSelection();
    private readonly layout = new TextLayout();
    /** Time since the caret last moved, in milliseconds, for the blinking. */
    private blinkTime = 0;

    constructor(classNames: string[] = [], properties: UIInputProperties = {}) {
        super(UI_INPUT_TYPE, classNames, { ...defaultUIInputProperties, ...properties });

        this.subscribe('focusIn', () => (this.blinkTime = 0));
    }

    /** Current value of the input. */
    public get value(): string {
        return this.v('value');
    }

    /** Position of the caret, in characters from the start of the value. */
    public get caret(): number {
        return this.selection.caret;
    }

    /** Start of the selection, in characters. */
    public get selectionStart(): number {
        return this.selection.start;
    }

    /** End of the selection, in characters, equal to its start when no text is selected. */
    public get selectionEnd(): number {
        return this.selection.end;
    }

    public get selectedText(): string {
        return this.selection.selectedText(this.value);
    }

    /** Replaces the value, moving the caret to its end, without dispatching `change`. */
    public setValue(value: string): void {
        this.p('value').setValue(value);
        this.selection.moveCaret(value.length, value.length);
    }

    /**
     * Selects a range of characters, the caret ending at `end`.
     *
     * @param start - Clamped to the value, like `end`.
     */
    public select(start: number, end: number): void {
        this.selection.select(start, end, this.value.length);
        this.blinkTime = 0;
    }

    public override handleKeyDown(keyboardEvent: KeyboardEvent): boolean {
        const key = keyboardEvent.key;
        if (keyboardEvent.ctrlKey || keyboardEvent.metaKey) {
            if (key.toLowerCase() === 'a') {
                this.select(0, this.value.length);
                return true;
            }
            // The clipboard shortcuts are handled by the clipboard events that follow them
            return ['c', 'x', 'v'].includes(key.toLowerCase());
        }
        if (keyboardEvent.altKey) {
            return false;
        }

        const extend = keyboardEvent.shiftKey;
        const { caret, start, end, collapsed } = this.selection;
        switch (key) {
            case 'Backspace':
            case 'Delete':
                // Without selection, the character before or after the caret
                if (collapsed) {
                    this.select(caret, caret + (key === 'Delete' ? 1 : -1));
                }
                this.replaceSelection('');
                break;
            case 'ArrowLeft':
                // Without Shift, a selection collapses to its start
                this.moveCaret(!collapsed && !extend ? start : caret - 1, extend);
                break;
            case 'ArrowRight':
                this.moveCaret(!collapsed && !extend ? end : caret + 1, extend);
                break;
            case 'Home':
                this.moveCaret(0, extend);
                break;
            case 'End':
                this.moveCaret(this.value.length, extend);
                break;
            case 'Enter':
                this.dispatchValueEvent('submit');
                break;
            case 'Escape':
                this.updateInteractionState('focused', false);
                break;
            default:
                // Printable characters have a one character name, other keys are not handled
                if ([...key].length !== 1) {
                    return false;
                }
                this.replaceSelection(key);
        }

        return true;
    }

    /**
     * Copies the selected text, cuts it, or pastes the text of the clipboard over it.
     *
     * @returns Whether the event was handled: copying or cutting needs a selection.
     */
    public override handleClipboard(clipboardEvent: ClipboardEvent): boolean {
        const data = clipboardEvent.clipboardData;
        if (!data) {
            return false;
        }

        if (clipboardEvent.type === 'paste') {
            // A single line input: line breaks become spaces
            this.replaceSelection(data.getData('text/plain').replace(/\r?\n|\r/g, ' '));
            return true;
        }

        const selected = this.selectedText;
        if (!selected) {
            return false;
        }

        data.setData('text/plain', selected);
        if (clipboardEvent.type === 'cut') {
            this.replaceSelection('');
        }
        return true;
    }

    /** Moves the caret under the mouse, extending the selection when Shift is held. */
    public override handlePointerDown(
        x: number,
        _y: number,
        inputEvent: MouseEvent | TouchEvent,
    ): void {
        this.moveCaret(this.indexAt(x), inputEvent.shiftKey);
    }

    /** Selects the text from where the mouse was pressed to where it is. */
    public override handlePointerDrag(x: number): void {
        this.moveCaret(this.indexAt(x), true);
    }

    public override updateAnimations(delta: number): void {
        super.updateAnimations(delta);
        this.blinkTime += delta;
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        const { x, y, width, height } = this.getBounds();
        const value = this.value;
        const focused = this.isFocused();
        const text = value || this.v('placeholder');
        const fontSize = this.v('fontSize');
        const layout = this.layout;

        ctx.save();
        ctx.fillStyle = this.v('backgroundColor');
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = focused ? this.v('focusColor') : this.v('color');
        ctx.lineWidth = this.v('borderWidth') + (focused ? 1 : 0);
        ctx.strokeRect(x, y, width, height);

        ctx.font = `${fontSize}px ${UI_FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        layout.measure(ctx, value);
        const caretOffset = layout.offsetOf(this.caret);
        layout.scrollTo(caretOffset, width - 2 * UI_INPUT_PADDING);

        // The text scrolls inside the padding box
        ctx.beginPath();
        ctx.rect(x + UI_INPUT_PADDING, y, Math.max(0, width - 2 * UI_INPUT_PADDING), height);
        ctx.clip();
        const textX = x + UI_INPUT_PADDING - layout.scroll;
        const lineY = y + (height - fontSize) / 2;

        if (focused && !this.selection.collapsed) {
            const start = layout.offsetOf(this.selectionStart);
            ctx.fillStyle = this.v('selectionColor');
            ctx.fillRect(
                textX + start,
                lineY,
                layout.offsetOf(this.selectionEnd) - start,
                fontSize,
            );
        }

        if (text) {
            ctx.fillStyle = value ? this.v('color') : this.v('placeholderColor');
            ctx.fillText(text, textX, y + height / 2);
        }

        if (focused && Math.floor(this.blinkTime / UI_INPUT_CARET_BLINK) % 2 === 0) {
            ctx.fillStyle = this.v('color');
            ctx.fillRect(textX + caretOffset, lineY, 1, fontSize);
        }
        ctx.restore();
    }

    /**
     * Replaces the selected text, or inserts at the caret, within `maxLength`, then dispatches
     * `change` if the value changed.
     */
    private replaceSelection(text: string): void {
        const value = this.value;
        const newValue = this.selection.replace(value, text, this.v('maxLength'));
        this.p('value').setValue(newValue);
        this.blinkTime = 0;
        if (newValue !== value) {
            this.dispatchValueEvent('change');
        }
    }

    /** Moves the caret, extending the selection or collapsing it, and restarts the blinking. */
    private moveCaret(caret: number, extend = false): void {
        this.selection.moveCaret(caret, this.value.length, extend);
        this.blinkTime = 0;
    }

    /** Character boundary closest to a position, in UI pixels. */
    private indexAt(x: number): number {
        return this.layout.indexAt(x - (this.v('x') + UI_INPUT_PADDING));
    }

    private dispatchValueEvent(name: 'change' | 'submit'): void {
        this.dispatch(
            name,
            EventFactory.createGameEvent<GameValueEvent>({
                name,
                consumed: false,
                value: this.value,
                target: this,
            }),
        );
    }
}
