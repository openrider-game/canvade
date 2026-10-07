import { UIElement, UIElementProperties } from '../ui-element';
import { UIProperty } from '../properties/ui-property.type';

type UIButtonProperties = UIElementProperties & {
    backgroundColor?: UIProperty<string>;
    hoverBackgroundColor?: UIProperty<string>;
    focusBackgroundColor?: UIProperty<string>;
    activeBackgroundColor?: UIProperty<string>;
    color?: UIProperty<string>;
    text?: UIProperty<string>;
};

const defaultUIButtonProperties: UIButtonProperties = {
    backgroundColor: new UIProperty('#d0d0d0'),
    color: new UIProperty('black'),
    text: new UIProperty('Button'),
};

export class UIButton extends UIElement<UIButtonProperties> {
    constructor(classNames: string[] = [], properties: UIButtonProperties = {}) {
        super('button', classNames, { ...defaultUIButtonProperties, ...properties });
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
        this.drawRoundedRect(ctx, this.v('x'), this.v('y'), this.v('width'), this.v('height'), 8);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, this.v('x'), this.v('y'), this.v('width'), this.v('height'), 8);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = '14px Arial';
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
