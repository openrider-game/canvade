import { UIElement, UIElementProperties } from '../ui-element';
import { UIProperty } from '../properties/ui-property.type';
import {
    UI_DEFAULT_COLOR,
    UI_DEFAULT_FONT_SIZE,
    UI_DEFAULT_LINE_HEIGHT,
    UI_FONT_FAMILY,
    UI_TEXT_TEXT,
    UI_TEXT_TYPE,
} from '../ui.constants';
import { wrapText } from './text-wrap';

/** Horizontal alignment of the lines of a {@link UIText} in its bounds. */
export type UITextAlign = 'left' | 'center' | 'right';
/** Wrapping of the lines of a {@link UIText}: none, or between words to fit its width. */
export type UITextWrap = 'none' | 'word';

/**
 * Properties of a {@link UIText}.
 *
 * `fontSize` is in pixels, and `lineHeight` the distance between two lines as a multiple of the
 * font size. `wrap: 'word'` breaks the lines that are wider than the element.
 */
type UITextProperties = UIElementProperties & {
    color?: UIProperty<string>;
    text?: UIProperty<string>;
    fontSize?: UIProperty<number>;
    lineHeight?: UIProperty<number>;
    wrap?: UIProperty<UITextWrap>;
    textAlign?: UIProperty<UITextAlign>;
};

const defaultUITextProperties: UITextProperties = {
    color: new UIProperty(UI_DEFAULT_COLOR),
    text: new UIProperty(UI_TEXT_TEXT),
    fontSize: new UIProperty(UI_DEFAULT_FONT_SIZE),
    lineHeight: new UIProperty(UI_DEFAULT_LINE_HEIGHT),
    wrap: new UIProperty<UITextWrap>('none'),
    textAlign: new UIProperty<UITextAlign>('left'),
};

/**
 * Text drawn from the top of its bounds, of type `text`.
 *
 * The text is split into lines at its line breaks, and, with `wrap: 'word'`, between words so
 * that every line fits in the width of the element. Each line is aligned in the element with
 * `textAlign`. The text is not clipped to the element bounds: lines exceeding its height are
 * drawn under it. An empty text draws nothing.
 */
export class UIText extends UIElement<UITextProperties> {
    /** Lines drawn on the last render. */
    public lines: string[] = [];

    constructor(classNames: string[] = [], properties: UITextProperties = {}) {
        super(UI_TEXT_TYPE, classNames, { ...defaultUITextProperties, ...properties });
    }

    /** Height of the lines drawn on the last render, in pixels. */
    public get textHeight(): number {
        return this.lines.length * this.v('fontSize') * this.v('lineHeight');
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        const text = this.v('text');
        const fontSize = this.v('fontSize');
        const { x, y, width } = this.getBounds();

        ctx.fillStyle = this.v('color');
        ctx.font = `${fontSize}px ${UI_FONT_FAMILY}`;
        ctx.textBaseline = 'top';
        const maxWidth = this.v('wrap') === 'word' ? width : null;
        this.lines = text ? wrapText(text, maxWidth, (part) => ctx.measureText(part).width) : [];

        const align = this.v('textAlign');
        ctx.textAlign = align;
        const lineX = align === 'center' ? x + width / 2 : align === 'right' ? x + width : x;
        const lineHeight = fontSize * this.v('lineHeight');
        this.lines.forEach((line, index) => {
            ctx.fillText(line, lineX, y + index * lineHeight);
        });
    }
}
