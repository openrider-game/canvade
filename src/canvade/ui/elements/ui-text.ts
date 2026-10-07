import { UIElement, UIElementProperties } from '../ui-element';
import { UIProperty } from '../properties/ui-property.type';

type UITextProperties = UIElementProperties & {
    color?: UIProperty<string>;
    text?: UIProperty<string>;
    fontSize?: UIProperty<number>;
};

const defaultUITextProperties: UITextProperties = {
    color: new UIProperty('black'),
    text: new UIProperty('Text'),
    fontSize: new UIProperty(14),
};

export class UIText extends UIElement<UITextProperties> {
    constructor(classNames: string[] = [], properties: UITextProperties = {}) {
        super('text', classNames, { ...defaultUITextProperties, ...properties });
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        const text = this.v('text');
        const color = this.v('color');
        const fontSize = this.v('fontSize');

        if (!text) {
            return;
        }

        ctx.fillStyle = color;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, this.v('x'), this.v('y'));
    }
}
