import { UIElement, UIElementProperties } from '../ui-element';
import { UIProperty } from '../properties/ui-property.type';
import {
    UI_DEFAULT_COLOR,
    UI_DEFAULT_FONT_SIZE,
    UI_FONT_FAMILY,
    UI_TEXT_TEXT,
    UI_TEXT_TYPE,
} from '../ui.constants';

/** Properties of a {@link UIText}, `fontSize` being in pixels. */
type UITextProperties = UIElementProperties & {
    color?: UIProperty<string>;
    text?: UIProperty<string>;
    fontSize?: UIProperty<number>;
};

const defaultUITextProperties: UITextProperties = {
    color: new UIProperty(UI_DEFAULT_COLOR),
    text: new UIProperty(UI_TEXT_TEXT),
    fontSize: new UIProperty(UI_DEFAULT_FONT_SIZE),
};

/**
 * Single line of text drawn from the top left corner of its bounds, of type `text`.
 *
 * The text is neither wrapped nor clipped to the element bounds; an empty text draws nothing.
 */
export class UIText extends UIElement<UITextProperties> {
    constructor(classNames: string[] = [], properties: UITextProperties = {}) {
        super(UI_TEXT_TYPE, classNames, { ...defaultUITextProperties, ...properties });
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        const text = this.v('text');
        const color = this.v('color');
        const fontSize = this.v('fontSize');

        if (!text) {
            return;
        }

        ctx.fillStyle = color;
        ctx.font = `${fontSize}px ${UI_FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, this.v('x'), this.v('y'));
    }
}
