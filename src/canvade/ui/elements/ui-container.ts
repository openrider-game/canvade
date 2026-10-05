import { UIBounds, UIElement, UIElementProperties } from '../ui-element';
import { UIProperty, UIResolvableProperty, UIResolvableUnit } from '../ui-property.type';

type UIContainerProperties = UIElementProperties & {
    backgroundColor?: UIProperty<string>;
    color?: UIProperty<string>;
    gap?: UIResolvableProperty<UIResolvableUnit>;
    padding?: UIResolvableProperty<UIResolvableUnit>;
    flexDirection?: UIProperty<'row' | 'column'>;
};

const defaultUIContainerProperties: UIContainerProperties = {
    backgroundColor: new UIProperty('transparent'),
    color: new UIProperty('black'),
    gap: new UIResolvableProperty('0px'),
    padding: new UIResolvableProperty('0px'),
    flexDirection: new UIProperty<'row' | 'column'>('column'),
};

export class UIContainer extends UIElement<UIContainerProperties> {
    constructor(classNames: string[] = [], properties: UIContainerProperties = {}) {
        super('container', classNames, { ...defaultUIContainerProperties, ...properties });
    }

    protected override resolveProperties(parentBounds: UIBounds): void {
        const referenceUnit =
            this.v('flexDirection') === 'row' ? parentBounds.width : parentBounds.height;

        this.p('gap').setValue(this.p('gap').getResolved(referenceUnit));
        this.p('padding').setValue(this.p('padding').getResolved(parentBounds.width));
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        const backgroundColor = this.v('backgroundColor');
        const color = this.v('color');

        if (backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(this.v('x'), this.v('y'), this.v('width'), this.v('height'));
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.v('x'), this.v('y'), this.v('width'), this.v('height'));
    }

    protected override renderChildren(ctx: CanvasRenderingContext2D, parentBounds: UIBounds): void {
        const padding = this.v('padding');
        const gap = this.v('gap');
        const direction = this.v('flexDirection');
        const contentX = parentBounds.x + padding;
        const contentY = parentBounds.y + padding;
        const contentWidth = Math.max(0, parentBounds.width - padding * 2);
        const contentHeight = Math.max(0, parentBounds.height - padding * 2);
        let currentX = contentX;
        let currentY = contentY;

        ctx.save();
        ctx.beginPath();
        ctx.rect(contentX, contentY, contentWidth, contentHeight);
        ctx.clip();
        try {
            for (const child of this.children) {
                if (!(child instanceof UIElement)) {
                    continue;
                }

                child.render(ctx, {
                    x: currentX,
                    y: currentY,
                    width: contentWidth,
                    height: contentHeight,
                });

                if (direction === 'row') {
                    currentX += child.getBounds().width + gap;
                } else {
                    currentY += child.getBounds().height + gap;
                }
            }
        } finally {
            ctx.restore();
        }
    }
}
