import { ContainerGapRule, ContainerPaddingRule } from '../properties/ui-property-resolution';
import {
    mergeUIPropertyMap,
    UIProperty,
    UIResolvableProperty,
    UIResolvableUnit,
} from '../properties/ui-property.type';
import { UIBounds, UIElement, UIElementProperties } from '../ui-element';
import {
    UI_CONTAINER_TYPE,
    UI_DEFAULT_COLOR,
    UI_DEFAULT_FLEX_DIRECTION,
    UI_DEFAULT_OFFSET,
    UI_TRANSPARENT,
} from '../ui.constants';

/**
 * Properties of a {@link UIContainer}.
 *
 * `color` is the border color. `padding` and `gap` accept `px` or `%` units, see
 * {@link ContainerPaddingRule} and {@link ContainerGapRule}.
 */
type UIContainerProperties = UIElementProperties & {
    backgroundColor?: UIProperty<string>;
    color?: UIProperty<string>;
    gap?: UIResolvableProperty<UIResolvableUnit>;
    padding?: UIResolvableProperty<UIResolvableUnit>;
    flexDirection?: UIProperty<'row' | 'column'>;
};

const defaultUIContainerProperties: UIContainerProperties = {
    backgroundColor: new UIProperty(UI_TRANSPARENT),
    color: new UIProperty(UI_DEFAULT_COLOR),
    gap: new UIResolvableProperty(UI_DEFAULT_OFFSET, new ContainerGapRule()),
    padding: new UIResolvableProperty(UI_DEFAULT_OFFSET, new ContainerPaddingRule()),
    flexDirection: new UIProperty<'row' | 'column'>(UI_DEFAULT_FLEX_DIRECTION),
};

/**
 * Bordered box laying out its children one after the other, of type `container`.
 *
 * The children are laid out in the content box (the container bounds minus the padding) and
 * clipped to it. Each child starts after the previous one plus the gap, along `flexDirection`
 * (`column` by default), without wrapping; its `%` sizes refer to the whole content box.
 * Children with `position: 'absolute'` are laid out in the content box without affecting the
 * others.
 */
export class UIContainer extends UIElement<UIContainerProperties> {
    constructor(classNames: string[] = [], properties: UIContainerProperties = {}) {
        super(
            UI_CONTAINER_TYPE,
            classNames,
            mergeUIPropertyMap(defaultUIContainerProperties, properties),
        );
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        const backgroundColor = this.v('backgroundColor');
        const color = this.v('color');

        if (backgroundColor !== UI_TRANSPARENT) {
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

                if (child.v('position') === 'absolute') {
                    child.render(ctx, {
                        x: contentX,
                        y: contentY,
                        width: contentWidth,
                        height: contentHeight,
                    });
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
