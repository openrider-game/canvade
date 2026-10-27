import { EventFactory } from '../../event/event-factory';
import { GameScrollEvent } from '../../event/types/ui-events';
import { ContainerGapRule, ContainerPaddingRule } from '../properties/ui-property-resolution';
import {
    mergeUIPropertyMap,
    UIProperty,
    UIResolvableProperty,
    UIResolvableUnit,
} from '../properties/ui-property.type';
import { UIBounds, UIElement, UIElementProperties } from '../ui-element';
import { UIScrollbar } from './ui-scrollbar';
import {
    UI_CONTAINER_TYPE,
    UI_DEFAULT_BORDER_WIDTH,
    UI_DEFAULT_COLOR,
    UI_DEFAULT_FLEX_DIRECTION,
    UI_DEFAULT_OFFSET,
    UI_DEFAULT_OVERFLOW,
    UI_SCROLLBAR_COLOR,
    UI_SCROLLBAR_TRACK_COLOR,
    UI_SCROLLBAR_WIDTH,
    UI_TRANSPARENT,
} from '../ui.constants';

/**
 * What a container does with children overflowing its height: `hidden` clips them, `scroll`
 * clips them and always shows a vertical scrollbar, `auto` shows the scrollbar only when they
 * overflow.
 */
export type UIOverflow = 'hidden' | 'scroll' | 'auto';

/**
 * Properties of a {@link UIContainer}.
 *
 * `color` is the border color and `borderWidth` its width in pixels, 0 for no border. `padding`
 * and `gap` accept `px` or `%` units, see {@link ContainerPaddingRule} and
 * {@link ContainerGapRule}. `scrollTop` is the scroll position, in pixels; `scrollbarWidth`,
 * `scrollbarColor` (the thumb) and `scrollbarTrackColor` style the scrollbar.
 */
type UIContainerProperties = UIElementProperties & {
    backgroundColor?: UIProperty<string>;
    color?: UIProperty<string>;
    borderWidth?: UIProperty<number>;
    gap?: UIResolvableProperty<UIResolvableUnit>;
    padding?: UIResolvableProperty<UIResolvableUnit>;
    flexDirection?: UIProperty<'row' | 'column'>;
    overflow?: UIProperty<UIOverflow>;
    scrollTop?: UIProperty<number>;
    scrollbarWidth?: UIProperty<number>;
    scrollbarColor?: UIProperty<string>;
    scrollbarTrackColor?: UIProperty<string>;
};

const defaultUIContainerProperties: UIContainerProperties = {
    backgroundColor: new UIProperty(UI_TRANSPARENT),
    color: new UIProperty(UI_DEFAULT_COLOR),
    borderWidth: new UIProperty(UI_DEFAULT_BORDER_WIDTH),
    gap: new UIResolvableProperty(UI_DEFAULT_OFFSET, new ContainerGapRule()),
    padding: new UIResolvableProperty(UI_DEFAULT_OFFSET, new ContainerPaddingRule()),
    flexDirection: new UIProperty<'row' | 'column'>(UI_DEFAULT_FLEX_DIRECTION),
    overflow: new UIProperty<UIOverflow>(UI_DEFAULT_OVERFLOW),
    scrollTop: new UIProperty(0),
    scrollbarWidth: new UIProperty(UI_SCROLLBAR_WIDTH),
    scrollbarColor: new UIProperty(UI_SCROLLBAR_COLOR),
    scrollbarTrackColor: new UIProperty(UI_SCROLLBAR_TRACK_COLOR),
};

/**
 * Bordered box laying out its children one after the other, of type `container`.
 *
 * The children are laid out in the content box (the container bounds minus the padding) and
 * clipped to it. Each child starts after the previous one plus the gap, along `flexDirection`
 * (`column` by default), without wrapping; its `%` sizes refer to the whole content box.
 * Children with `position: 'absolute'` are laid out in the content box without affecting the
 * others.
 *
 * A column container with `overflow: 'scroll'` or `'auto'` scrolls its children vertically: the
 * mouse wheel scrolls them, as well as a finger dragging them, and the scrollbar, on the right of
 * the content box, can be dragged or clicked. The children are then laid out beside the scrollbar. Each change of the scroll
 * position dispatches `scroll`.
 */
export class UIContainer extends UIElement<UIContainerProperties> {
    /** Scrollbar of the last layout, `null` when none is displayed. */
    private scrollbar: UIScrollbar | null = null;
    /** Content box of the last layout, the only area where the children can be hit. */
    private contentBox: UIBounds | null = null;
    /** Whether the children overflowed on the last layout, for `overflow: 'auto'`. */
    private overflowing = false;
    /** Offset from the top of the thumb to the mouse while dragging it, `null` otherwise. */
    private thumbGrab: number | null = null;

    constructor(classNames: string[] = [], properties: UIContainerProperties = {}) {
        super(
            UI_CONTAINER_TYPE,
            classNames,
            mergeUIPropertyMap(defaultUIContainerProperties, properties),
        );
    }

    /** Scroll position, in pixels from the top of the content. */
    public get scrollTop(): number {
        return this.v('scrollTop');
    }

    /** Scrolls to a position, clamped to the content, dispatching `scroll` when it changes. */
    public scrollTo(scrollTop: number): void {
        const value = this.scrollbar?.clamp(scrollTop) ?? 0;
        if (value === this.scrollTop) {
            return;
        }

        this.p('scrollTop').setValue(value);
        this.dispatch(
            'scroll',
            EventFactory.createGameEvent<GameScrollEvent>({
                name: 'scroll',
                consumed: false,
                scrollTop: value,
                target: this,
            }),
        );
    }

    /** Whether the container scrolls its children, whether they overflow or not. */
    private isScrollable(): boolean {
        return this.v('overflow') !== 'hidden' && this.v('flexDirection') === 'column';
    }

    public override handleWheel(deltaY: number): boolean {
        if (!this.scrollbar) {
            return false;
        }

        this.scrollTo(this.scrollTop + deltaY);
        return true;
    }

    /** Grabs the thumb, or moves it under the mouse when the track is clicked. */
    public override handlePointerDown(x: number, y: number): void {
        const scrollbar = this.scrollbar;
        this.thumbGrab = null;
        if (!scrollbar?.contains(x, y)) {
            return;
        }

        this.thumbGrab = scrollbar.grabOffset(y);
        this.handlePointerDrag(x, y);
    }

    public override handlePointerDrag(_x: number, y: number): void {
        if (this.scrollbar && this.thumbGrab !== null) {
            this.scrollTo(this.scrollbar.scrollForThumbAt(y - this.thumbGrab));
        }
    }

    public override containsChildPoint(x: number, y: number): boolean {
        return !this.contentBox || UIScrollbar.inside(this.contentBox, x, y);
    }

    protected override renderElement(ctx: CanvasRenderingContext2D): void {
        const backgroundColor = this.v('backgroundColor');
        const color = this.v('color');

        if (backgroundColor !== UI_TRANSPARENT) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(this.v('x'), this.v('y'), this.v('width'), this.v('height'));
        }

        const borderWidth = this.v('borderWidth');
        if (borderWidth > 0 && color !== UI_TRANSPARENT) {
            ctx.strokeStyle = color;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(this.v('x'), this.v('y'), this.v('width'), this.v('height'));
        }
    }

    protected override renderChildren(ctx: CanvasRenderingContext2D, parentBounds: UIBounds): void {
        const padding = this.v('padding');
        const gap = this.v('gap');
        const direction = this.v('flexDirection');
        const contentX = parentBounds.x + padding;
        const contentY = parentBounds.y + padding;
        const contentWidth = Math.max(0, parentBounds.width - padding * 2);
        const contentHeight = Math.max(0, parentBounds.height - padding * 2);
        this.contentBox = { x: contentX, y: contentY, width: contentWidth, height: contentHeight };

        // The scrollbar is shown from the previous layout for `auto`, to lay the children out once
        const scrollable = this.isScrollable();
        const showScrollbar = scrollable && (this.v('overflow') === 'scroll' || this.overflowing);
        const scrollbarWidth = showScrollbar ? this.v('scrollbarWidth') : 0;
        const childWidth = Math.max(0, contentWidth - scrollbarWidth);
        const scrollTop = scrollable ? this.scrollTop : 0;
        let currentX = contentX;
        let currentY = contentY - scrollTop;
        let flowHeight = 0;

        ctx.save();
        ctx.beginPath();
        ctx.rect(contentX, contentY, contentWidth, contentHeight);
        ctx.clip();
        try {
            for (const child of this.children) {
                if (child.v('position') === 'absolute') {
                    child.render(ctx, {
                        x: contentX,
                        y: contentY,
                        width: childWidth,
                        height: contentHeight,
                    });
                    continue;
                }

                child.render(ctx, {
                    x: currentX,
                    y: currentY,
                    width: childWidth,
                    height: contentHeight,
                });

                if (direction === 'row') {
                    currentX += child.getBounds().width + gap;
                } else {
                    const height = child.getBounds().height;
                    flowHeight += (flowHeight > 0 ? gap : 0) + height;
                    currentY += height + gap;
                }
            }

            this.overflowing = scrollable && flowHeight > contentHeight;
            this.updateScrollbar(showScrollbar, flowHeight);
            this.scrollbar?.render(ctx, this.v('scrollbarTrackColor'), this.v('scrollbarColor'));
        } finally {
            ctx.restore();
        }
    }

    /** Creates the scrollbar of the layout, and clamps the scroll position to the content. */
    private updateScrollbar(shown: boolean, flowHeight: number): void {
        const box = this.contentBox;
        if (!shown || !box) {
            this.scrollbar = null;
            return;
        }

        const width = this.v('scrollbarWidth');
        const track = { x: box.x + box.width - width, y: box.y, width, height: box.height };
        this.scrollbar = new UIScrollbar(track, flowHeight, this.scrollTop);
        const scrollTop = this.scrollbar.clamp(this.scrollTop);
        if (scrollTop !== this.scrollTop) {
            this.p('scrollTop').setValue(scrollTop);
        }
    }
}
