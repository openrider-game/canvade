import { UIElement, UIElementProperties } from '../ui-element';
import { UIProperty } from '../properties/ui-property.type';
import {
    UI_BUTTON_BACKGROUND_COLOR,
    UI_BUTTON_BORDER_RADIUS,
    UI_BUTTON_TEXT,
    UI_BUTTON_TYPE,
    UI_DEFAULT_BORDER_WIDTH,
    UI_DEFAULT_COLOR,
    UI_DEFAULT_FONT_SIZE,
    UI_FONT_FAMILY,
} from '../ui.constants';

/**
 * Properties of a {@link UIButton}.
 *
 * The hover, focus and active background colors fall back to `backgroundColor`. `color` is the
 * color of the border, and of the text unless `textColor` is set. `borderRadius` (0 for square
 * corners), `borderWidth` and `fontSize` are in pixels.
 */
type UIButtonProperties = UIElementProperties & {
    backgroundColor?: UIProperty<string>;
    hoverBackgroundColor?: UIProperty<string>;
    focusBackgroundColor?: UIProperty<string>;
    activeBackgroundColor?: UIProperty<string>;
    color?: UIProperty<string>;
    textColor?: UIProperty<string>;
    text?: UIProperty<string>;
    fontSize?: UIProperty<number>;
    borderRadius?: UIProperty<number>;
    borderWidth?: UIProperty<number>;
};

const defaultUIButtonProperties: UIButtonProperties = {
    backgroundColor: new UIProperty(UI_BUTTON_BACKGROUND_COLOR),
    color: new UIProperty(UI_DEFAULT_COLOR),
    text: new UIProperty(UI_BUTTON_TEXT),
    fontSize: new UIProperty(UI_DEFAULT_FONT_SIZE),
    borderRadius: new UIProperty(UI_BUTTON_BORDER_RADIUS),
    borderWidth: new UIProperty(UI_DEFAULT_BORDER_WIDTH),
};

/**
 * Button with a centered text, of type `button`, with rounded corners by default.
 *
 * Its background color reflects its interaction state, the active (pressed) state taking
 * precedence over the hovered state, itself over the focused state.
 */
export class UIButton extends UIElement<UIButtonProperties> {
    constructor(classNames: string[] = [], properties: UIButtonProperties = {}) {
        super(UI_BUTTON_TYPE, classNames, { ...defaultUIButtonProperties, ...properties });
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        // A clicked button keeps the focus: hovering it still shows the hover color
        const backgroundColor = this.isActive()
            ? this.v('activeBackgroundColor', 'backgroundColor')
            : this.isHovered()
              ? this.v('hoverBackgroundColor', 'backgroundColor')
              : this.isFocused()
                ? this.v('focusBackgroundColor', 'backgroundColor')
                : this.v('backgroundColor');
        const { x, y, width, height } = this.getBounds();
        const borderWidth = this.v('borderWidth');

        ctx.fillStyle = backgroundColor;
        this.tracePath(ctx, x, y, width, height);
        ctx.fill();

        if (borderWidth > 0) {
            ctx.strokeStyle = this.v('color');
            ctx.lineWidth = borderWidth;
            this.tracePath(ctx, x, y, width, height);
            ctx.stroke();
        }

        ctx.fillStyle = this.v('textColor', 'color');
        ctx.font = `${this.v('fontSize')}px ${UI_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.v('text'), x + width / 2, y + height / 2);
    }

    /** Traces the outline of the button, a rectangle when the border radius is 0. */
    private tracePath(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        // A radius larger than half a side would make the corners overlap
        const radius = Math.max(0, Math.min(this.v('borderRadius'), width / 2, height / 2));

        ctx.beginPath();
        if (radius === 0) {
            ctx.rect(x, y, width, height);
            return;
        }

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
