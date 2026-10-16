import { UIElement, UIElementProperties } from '../ui-element';
import { UIProperty } from '../properties/ui-property.type';
import {
    UI_BUTTON_BACKGROUND_COLOR,
    UI_BUTTON_BORDER_RADIUS,
    UI_BUTTON_TEXT,
    UI_BUTTON_TYPE,
    UI_DEFAULT_COLOR,
    UI_DEFAULT_FONT_SIZE,
    UI_FONT_FAMILY,
} from '../ui.constants';

/**
 * Properties of a {@link UIButton}.
 *
 * The hover, focus and active background colors fall back to `backgroundColor`. `color` is the
 * color of the border and of the text.
 */
type UIButtonProperties = UIElementProperties & {
    backgroundColor?: UIProperty<string>;
    hoverBackgroundColor?: UIProperty<string>;
    focusBackgroundColor?: UIProperty<string>;
    activeBackgroundColor?: UIProperty<string>;
    color?: UIProperty<string>;
    text?: UIProperty<string>;
};

const defaultUIButtonProperties: UIButtonProperties = {
    backgroundColor: new UIProperty(UI_BUTTON_BACKGROUND_COLOR),
    color: new UIProperty(UI_DEFAULT_COLOR),
    text: new UIProperty(UI_BUTTON_TEXT),
};

/**
 * Rounded button with a centered text, of type `button`.
 *
 * Its background color reflects its interaction state, the active (pressed) state taking
 * precedence over the focused state, itself over the hovered state.
 */
export class UIButton extends UIElement<UIButtonProperties> {
    constructor(classNames: string[] = [], properties: UIButtonProperties = {}) {
        super(UI_BUTTON_TYPE, classNames, { ...defaultUIButtonProperties, ...properties });
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        const backgroundColor = this.isActive()
            ? this.v('activeBackgroundColor', 'backgroundColor')
            : this.isFocused()
              ? this.v('focusBackgroundColor', 'backgroundColor')
              : this.isHovered()
                ? this.v('hoverBackgroundColor', 'backgroundColor')
                : this.v('backgroundColor');
        const color = this.v('color');
        const text = this.v('text');

        ctx.fillStyle = backgroundColor;
        this.drawRoundedRect(
            ctx,
            this.v('x'),
            this.v('y'),
            this.v('width'),
            this.v('height'),
            UI_BUTTON_BORDER_RADIUS,
        );
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        this.drawRoundedRect(
            ctx,
            this.v('x'),
            this.v('y'),
            this.v('width'),
            this.v('height'),
            UI_BUTTON_BORDER_RADIUS,
        );
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = `${UI_DEFAULT_FONT_SIZE}px ${UI_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, this.v('x') + this.v('width') / 2, this.v('y') + this.v('height') / 2);
    }

    private drawRoundedRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
    ): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}
