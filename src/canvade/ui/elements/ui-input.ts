import { EventFactory } from '../../event/event-factory';
import { GameValueEvent } from '../../event/types/ui-events';
import { UIProperty } from '../properties/ui-property.type';
import { UIElement, UIElementProperties } from '../ui-element';
import {
    UI_DEFAULT_COLOR,
    UI_DEFAULT_FONT_SIZE,
    UI_FONT_FAMILY,
    UI_INPUT_BACKGROUND_COLOR,
    UI_INPUT_CARET_BLINK,
    UI_INPUT_FOCUS_COLOR,
    UI_INPUT_PADDING,
    UI_INPUT_PLACEHOLDER_COLOR,
    UI_INPUT_TYPE,
} from '../ui.constants';

/**
 * Properties of a {@link UIInput}.
 *
 * `color` is the color of the text and of the border, `focusColor` the color of the border
 * while focused. `maxLength` limits the number of characters, 0 for no limit.
 */
type UIInputProperties = UIElementProperties & {
    value?: UIProperty<string>;
    placeholder?: UIProperty<string>;
    color?: UIProperty<string>;
    placeholderColor?: UIProperty<string>;
    backgroundColor?: UIProperty<string>;
    focusColor?: UIProperty<string>;
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
    fontSize: new UIProperty(UI_DEFAULT_FONT_SIZE),
    maxLength: new UIProperty(0),
};

/**
 * Single line text field drawn on the canvas, of type `input`.
 *
 * Clicking it focuses it and moves the caret under the mouse; it then receives the keys typed
 * while the canvas has the focus: the printable characters, Backspace, Delete, the left and
 * right arrows, Home and End. Enter dispatches `submit`, Escape removes the focus, and each edit
 * dispatches `change`. The keys it handles do not trigger the `Keyboard` controls. Keys pressed
 * with Ctrl, Alt or Meta are left to the controls; there is no selection nor clipboard support.
 *
 * The value is the `value` property, which can be set from the styles or with
 * {@link UIInput.setValue}.
 */
export class UIInput extends UIElement<UIInputProperties> {
    /** Position of the caret, in characters from the start of the value. */
    public caret = 0;
    /** Time since the caret last moved, in milliseconds, for the blinking. */
    private blinkTime = 0;
    /** Horizontal scroll of the text, in pixels, so that the caret stays visible. */
    private scroll = 0;
    /** Positions of the caret after each character, in pixels, measured on the last render. */
    private characterOffsets: number[] = [0];

    constructor(classNames: string[] = [], properties: UIInputProperties = {}) {
        super(UI_INPUT_TYPE, classNames, { ...defaultUIInputProperties, ...properties });

        this.subscribe('focusIn', () => (this.blinkTime = 0));
        this.subscribe('click', (event) => this.placeCaret(event.detail.position.x));
    }

    /** Current value of the input. */
    public get value(): string {
        return this.v('value');
    }

    /** Replaces the value, moving the caret to its end, without dispatching `change`. */
    public setValue(value: string): void {
        this.p('value').setValue(value);
        this.caret = value.length;
    }

    public override handleKeyDown(keyboardEvent: KeyboardEvent): boolean {
        if (keyboardEvent.ctrlKey || keyboardEvent.altKey || keyboardEvent.metaKey) {
            return false;
        }

        const value = this.value;
        const caret = Math.min(this.caret, value.length);
        switch (keyboardEvent.key) {
            case 'Backspace':
                if (caret > 0) {
                    this.edit(value.slice(0, caret - 1) + value.slice(caret), caret - 1);
                }
                break;
            case 'Delete':
                if (caret < value.length) {
                    this.edit(value.slice(0, caret) + value.slice(caret + 1), caret);
                }
                break;
            case 'ArrowLeft':
                this.moveCaret(caret - 1);
                break;
            case 'ArrowRight':
                this.moveCaret(caret + 1);
                break;
            case 'Home':
                this.moveCaret(0);
                break;
            case 'End':
                this.moveCaret(value.length);
                break;
            case 'Enter':
                this.dispatchValueEvent('submit');
                break;
            case 'Escape':
                this.updateInteractionState('focused', false);
                break;
            default: {
                // Printable characters have a one character name, other keys are not handled
                if ([...keyboardEvent.key].length !== 1) {
                    return false;
                }
                const maxLength = this.v('maxLength');
                if (maxLength <= 0 || value.length < maxLength) {
                    const newValue = value.slice(0, caret) + keyboardEvent.key + value.slice(caret);
                    this.edit(newValue, caret + keyboardEvent.key.length);
                }
            }
        }

        return true;
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

        ctx.save();
        ctx.fillStyle = this.v('backgroundColor');
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = focused ? this.v('focusColor') : this.v('color');
        ctx.lineWidth = focused ? 2 : 1;
        ctx.strokeRect(x, y, width, height);

        ctx.font = `${this.v('fontSize')}px ${UI_FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        this.measure(ctx, value);
        const caretOffset = this.characterOffsets[Math.min(this.caret, value.length)];
        this.updateScroll(caretOffset, width - 2 * UI_INPUT_PADDING);

        // The text scrolls inside the padding box
        ctx.beginPath();
        ctx.rect(x + UI_INPUT_PADDING, y, Math.max(0, width - 2 * UI_INPUT_PADDING), height);
        ctx.clip();
        const textX = x + UI_INPUT_PADDING - this.scroll;
        if (text) {
            ctx.fillStyle = value ? this.v('color') : this.v('placeholderColor');
            ctx.fillText(text, textX, y + height / 2);
        }

        if (focused && Math.floor(this.blinkTime / UI_INPUT_CARET_BLINK) % 2 === 0) {
            const caretHeight = this.v('fontSize');
            ctx.fillStyle = this.v('color');
            ctx.fillRect(textX + caretOffset, y + (height - caretHeight) / 2, 1, caretHeight);
        }
        ctx.restore();
    }

    private edit(value: string, caret: number): void {
        this.p('value').setValue(value);
        this.moveCaret(caret);
        this.dispatchValueEvent('change');
    }

    private moveCaret(caret: number): void {
        this.caret = Math.max(0, Math.min(caret, this.value.length));
        this.blinkTime = 0;
    }

    /** Moves the caret to the character boundary closest to a position, in UI pixels. */
    private placeCaret(x: number): void {
        const offset = x - (this.v('x') + UI_INPUT_PADDING - this.scroll);
        let caret = 0;
        this.characterOffsets.forEach((characterOffset, index) => {
            if (
                Math.abs(characterOffset - offset) < Math.abs(this.characterOffsets[caret] - offset)
            ) {
                caret = index;
            }
        });
        this.moveCaret(caret);
    }

    private measure(ctx: CanvasRenderingContext2D, value: string): void {
        this.characterOffsets = [0];
        for (let index = 1; index <= value.length; index++) {
            this.characterOffsets.push(ctx.measureText(value.slice(0, index)).width);
        }
    }

    /** Scrolls the text so that the caret stays inside the visible width. */
    private updateScroll(caretOffset: number, visibleWidth: number): void {
        if (caretOffset - this.scroll > visibleWidth) {
            this.scroll = caretOffset - visibleWidth;
        } else if (caretOffset < this.scroll) {
            this.scroll = caretOffset;
        }
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
