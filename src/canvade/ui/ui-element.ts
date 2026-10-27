import { Vector } from '../core/math/vector';
import { EventEmitter } from '../event/event-emitter';
import { EventFactory } from '../event/event-factory';
import { GameClickEvent, GamePressEvent, UIEvents } from '../event/types/ui-events';
import { UIAnimationOptions } from './animation/ui-animation';
import { UIAnimationController, UIAnimationTarget } from './animation/ui-animation-controller';
import { UIInteractionState, UIInteractionStateName } from './interaction/ui-interaction-state';
import {
    ParentDimensionRule,
    ParentPositionRule,
    UIHorizontalAlign,
    UIPointerEvents,
    UIPosition,
    UIVerticalAlign,
} from './properties/ui-property-resolution';
import { UIPropertyResolver } from './properties/ui-property-resolver';
import {
    UIProperty,
    UIPropertyMap,
    UIPropertyValue,
    UIResolvableProperty,
    UIResolvableUnit,
    cloneUIPropertyMap,
    mergeUIPropertyMap,
} from './properties/ui-property.type';
import { UIElementTree } from './tree/ui-element-tree';
import {
    UI_DEFAULT_HORIZONTAL_ALIGN,
    UI_DEFAULT_OFFSET,
    UI_DEFAULT_POINTER_EVENTS,
    UI_DEFAULT_POSITION,
    UI_DEFAULT_SIZE,
    UI_DEFAULT_VERTICAL_ALIGN,
} from './ui.constants';

/** Rectangle in canvas pixels. */
export interface UIBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Click callback of a UI element, receiving the click position in UI pixels. */
export type UIClickHandler = (x: number, y: number, target: UIElement) => void;
/** Callback of the `change` and `submit` events of an input, receiving its value. */
export type UIValueHandler = (value: string, target: UIElement) => void;
/** Callback of the `scroll` event of a container, receiving its scroll position in pixels. */
export type UIScrollHandler = (scrollTop: number, target: UIElement) => void;
/** Callback of the `press` and `release` events of an element. */
export type UIPressHandler = (target: UIElement) => void;

/**
 * Layout properties shared by all the UI elements.
 *
 * `x`, `y`, `width` and `height` are declared in `px` or in `%` of the parent bounds (width for
 * `x` and `width`, height for `y` and `height`). `x` and `y` are offsets from the parent edge
 * selected by `horizontalAlign` and `verticalAlign`: with `right` or `bottom` they move the
 * element away from the right or bottom edge, with `center` or `middle` away from the centered
 * position. `position: 'absolute'` takes the element out of the flow of its container.
 * `pointerEvents: 'none'` lets the mouse go through the element to what is under it, e.g. for a
 * container only laying out buttons.
 */
export type UIElementProperties = UIPropertyMap & {
    x?: UIResolvableProperty<UIResolvableUnit>;
    y?: UIResolvableProperty<UIResolvableUnit>;
    width?: UIResolvableProperty<UIResolvableUnit>;
    height?: UIResolvableProperty<UIResolvableUnit>;
    horizontalAlign?: UIProperty<UIHorizontalAlign>;
    verticalAlign?: UIProperty<UIVerticalAlign>;
    position?: UIProperty<UIPosition>;
    pointerEvents?: UIProperty<UIPointerEvents>;
};

const defaultElementProperties: UIElementProperties = {
    x: new UIResolvableProperty(UI_DEFAULT_OFFSET, new ParentPositionRule('x', 'width')),
    y: new UIResolvableProperty(UI_DEFAULT_OFFSET, new ParentPositionRule('y', 'height')),
    width: new UIResolvableProperty(UI_DEFAULT_SIZE, new ParentDimensionRule('width')),
    height: new UIResolvableProperty(UI_DEFAULT_SIZE, new ParentDimensionRule('height')),
    horizontalAlign: new UIProperty<UIHorizontalAlign>(UI_DEFAULT_HORIZONTAL_ALIGN),
    verticalAlign: new UIProperty<UIVerticalAlign>(UI_DEFAULT_VERTICAL_ALIGN),
    position: new UIProperty<UIPosition>(UI_DEFAULT_POSITION),
    pointerEvents: new UIProperty<UIPointerEvents>(UI_DEFAULT_POINTER_EVENTS),
};

/**
 * Base class of the canvas UI elements, laid out and rendered as a tree.
 *
 * Each frame, an element resolves its `px` and `%` properties against the bounds given by its
 * parent (the whole canvas for a root), draws itself with {@link UIElement.renderElement}, then
 * renders its children inside its own bounds, clipped to them. Values are read with
 * {@link UIElement.v}. Numeric properties can be animated with {@link UIElement.animate}.
 *
 * Elements are usually built from structure and style definitions with
 * `UIManager.setUI`; custom element types are registered in `UIElementFactory`.
 *
 * @typeParam P - Properties of the element.
 */
export abstract class UIElement<
    P extends UIElementProperties = UIElementProperties,
> extends EventEmitter<UIEvents> {
    public children: UIElement[] = [];
    public parent: UIElement | null = null;
    /** Free data attached to the element, e.g. the `data` of its structure definition. */
    public readonly data: Record<string, unknown> = {};
    /**
     * Whether the element is the implicit root container of a UI tree, which is ignored by hit
     * tests so that the canvas around the UI stays reachable.
     */
    public isTreeRoot = false;
    private readonly interactionState = new UIInteractionState();
    /** Number of pointers pressing the element: the mouse and the fingers on it. */
    private pressCount = 0;
    private clickHandlerId: string | null = null;
    private readonly animationController: UIAnimationController<P>;
    private readonly propertyResolver: UIPropertyResolver<P>;
    /** Parent bounds of the last layout, used to resolve the `px` and `%` animation targets. */
    protected layoutParentBounds?: UIBounds;

    /**
     * Creates an element with the default layout properties overridden by the given ones.
     *
     * @param type - Element type, matched by the style selectors.
     * @param classNames - Class names, matched by the style selectors.
     * @param properties - Properties overriding the default layout properties. They are cloned,
     *   so property objects are never shared between elements.
     */
    constructor(
        public readonly type: string,
        public readonly classNames: string[] = [],
        public readonly properties: P = defaultElementProperties as P,
    ) {
        super();
        this.properties = cloneUIPropertyMap(
            mergeUIPropertyMap(defaultElementProperties, properties),
        ) as P;
        this.propertyResolver = new UIPropertyResolver(this.properties);
        this.animationController = new UIAnimationController(this.properties, (property, value) =>
            this.resolveAnimationEndpoint(property, value),
        );
    }

    /**
     * Lays out and renders the element and its children, then dispatches `renderTree`.
     *
     * @param parentBounds - Bounds the element is laid out in, the whole canvas by default.
     */
    public render(ctx: CanvasRenderingContext2D, parentBounds?: UIBounds): void {
        this.resolveLayout(
            parentBounds ?? { x: 0, y: 0, width: ctx.canvas.width, height: ctx.canvas.height },
        );
        this.renderElement(ctx);
        this.renderChildren(ctx, this.getBounds());
        this.dispatch(
            'renderTree',
            EventFactory.createGameEvent({
                name: 'renderTree',
                consumed: false,
                ctx,
            }),
        );
    }

    /** Draws the element itself, once its layout is resolved. */
    protected abstract renderElement(ctx: CanvasRenderingContext2D): void;

    /**
     * Renders the children, clipped to `parentBounds`.
     *
     * By default every child is laid out in the same bounds, so they overlap; containers
     * override it to lay them out one after the other.
     *
     * @param parentBounds - Bounds of this element.
     */
    protected renderChildren(ctx: CanvasRenderingContext2D, parentBounds: UIBounds): void {
        UIElementTree.renderChildren(this.children, ctx, parentBounds);
    }

    /**
     * Resolves the `px` and `%` properties against the parent bounds, then applies the values
     * of the running animations over them. The properties depending on an animated property use
     * its animated value, so that an element aligned right or bottom keeps its edge in place while
     * its size is animated.
     */
    public resolveLayout(parentBounds: UIBounds): void {
        this.layoutParentBounds = parentBounds;
        this.propertyResolver.resolve(parentBounds, (property) =>
            this.animationController.currentValue(property),
        );
        this.animationController.update(0);
    }

    /** Returns the bounds of the element in canvas pixels, as resolved by the last layout. */
    public getBounds(): UIBounds {
        return {
            x: this.v('x'),
            y: this.v('y'),
            width: this.v('width'),
            height: this.v('height'),
        };
    }

    /** Whether the element can be the target of the mouse, see `pointerEvents`. */
    public receivesPointer(): boolean {
        return !this.isTreeRoot && this.v('pointerEvents') !== 'none';
    }

    /**
     * Handles a key pressed while the element has the focus, implemented by the elements taking
     * keyboard input.
     *
     * @returns Whether the key was handled, the key event then being consumed.
     */
    public handleKeyDown?(keyboardEvent: KeyboardEvent): boolean;

    /**
     * Handles the clipboard events (`copy`, `cut` or `paste`) while the element has the focus,
     * implemented by the elements editing text.
     *
     * @returns Whether the event was handled, its default action being then prevented.
     */
    public handleClipboard?(clipboardEvent: ClipboardEvent): boolean;

    /**
     * Handles the mouse wheel over the element or its children, implemented by the scrolling
     * elements. Elements are asked from the deepest one under the mouse up to the root. Also
     * called for a finger dragging the element or its children vertically, see `UITouchTracker`.
     *
     * @param deltaY - Distance to scroll, in pixels, positive downwards.
     * @returns Whether the element scrolled, the wheel event being then consumed.
     */
    public handleWheel?(deltaY: number): boolean;

    /**
     * Handles the main mouse button, or a touch, pressed over the element, at a position in UI
     * pixels.
     */
    public handlePointerDown?(x: number, y: number, inputEvent: MouseEvent): void;

    /**
     * Handles the mouse, or the touch, moving while the element is pressed, wherever it is, e.g.
     * to drag a scrollbar thumb or to select text. A touch pressing an element handling it drags
     * the element instead of sliding to the other elements.
     */
    public handlePointerDrag?(x: number, y: number): void;

    /**
     * Whether the children of the element can be hit at a position inside the element, e.g. not
     * in the padding of a scrolling container, where its scrolled children are clipped.
     */
    public containsChildPoint?(x: number, y: number): boolean;

    /** Returns whether a canvas position is inside the element bounds, edges included. */
    public contains(px: number, py: number): boolean {
        return (
            px >= this.v('x') &&
            px <= this.v('x') + this.v('width') &&
            py >= this.v('y') &&
            py <= this.v('y') + this.v('height')
        );
    }

    /**
     * Returns the deepest element of this subtree at a canvas position, the last children
     * (drawn on top) being tested first.
     *
     * @returns The element, or `null` when the position is outside the subtree or only over
     * the tree root.
     */
    public findElementAt(x: number, y: number): UIElement | null {
        return UIElementTree.findElementAt(this, x, y);
    }

    /** Sets the hovered element of this subtree, `null` for none. Call it on the root. */
    public setHoveredElement(target: UIElement | null): void {
        UIElementTree.updateInteraction(this, target, 'hovered');
    }

    /** Sets the focused element of this subtree, `null` for none. Call it on the root. */
    public setFocusedElement(target: UIElement | null): void {
        UIElementTree.updateInteraction(this, target, 'focused');
    }

    /**
     * Sets the active (pressed) element of this subtree, `null` for none. Call it on the root.
     */
    public setActiveElement(target: UIElement | null): void {
        UIElementTree.updateInteraction(this, target, 'active');
    }

    public isHovered(): boolean {
        return this.interactionState.isHovered();
    }

    public isFocused(): boolean {
        return this.interactionState.isFocused();
    }

    /** Returns whether the element is pressed, between a mouse down and the next mouse up. */
    public isActive(): boolean {
        return this.interactionState.isActive();
    }

    /** Returns whether a pointer presses the element: the mouse, or a finger on it. */
    public isPressed(): boolean {
        return this.pressCount > 0;
    }

    /**
     * Counts a pointer pressing the element, dispatching `press` for the first one. Called by the
     * UI manager, for the mouse and for each finger.
     */
    public press(): void {
        this.pressCount++;
        if (this.pressCount === 1) {
            this.dispatchPress('press');
        }
    }

    /** Counts a pointer leaving the element, dispatching `release` for the last one. */
    public release(): void {
        if (this.pressCount === 0) {
            return;
        }
        this.pressCount--;
        if (this.pressCount === 0) {
            this.dispatchPress('release');
        }
    }

    /**
     * Dispatches `click` on the deepest element of this subtree at a canvas position.
     *
     * The event does not bubble up to the ancestors.
     *
     * @returns Whether the position is inside this element.
     */
    public handleClick(x: number, y: number, inputEvent: MouseEvent): boolean {
        return UIElementTree.handleClick(this, x, y, (target) =>
            target.dispatchClick(x, y, inputEvent),
        );
    }

    /**
     * Updates an interaction state of this element only, dispatching `hoverIn`, `hoverOut`,
     * `focusIn` or `focusOut` when it changes.
     */
    public updateInteractionState(state: UIInteractionStateName, value: boolean): void {
        const event = this.interactionState.update(state, value);
        if (event) {
            this.dispatch(event);
        }
    }

    /**
     * Sets the click handler of the element, replacing the one previously set with this method.
     *
     * Receivers subscribed directly to `click` are kept.
     */
    public onClick(handler: UIClickHandler): void {
        if (this.clickHandlerId) {
            this.unsubscribe('click', this.clickHandlerId);
        }
        this.clickHandlerId = this.subscribe('click', (event) => {
            handler(event.detail.position.x, event.detail.position.y, event.detail.target);
        });
    }

    /** Removes the click handler set with {@link UIElement.onClick}. */
    public removeClickHandler(): void {
        if (this.clickHandlerId) {
            this.unsubscribe('click', this.clickHandlerId);
            this.clickHandlerId = null;
        }
    }

    /** Returns a property object, shorthand for {@link UIElement.getProperty}. */
    public p<K extends keyof P>(key: K): NonNullable<P[K]> {
        return this.getProperty(key);
    }

    /**
     * Returns the value of the first given property that has one.
     *
     * Missing properties, unresolved `px`/`%` properties and `null` or `undefined` values are
     * skipped, so later keys act as fallbacks, e.g. `v('hoverColor', 'color')`.
     *
     * @throws When none of the properties has a value.
     */
    public v<K extends keyof P>(...keys: [K, ...K[]]): UIPropertyValue<NonNullable<P[K]>> {
        for (const key of keys) {
            const property = this.properties[key];
            if (!property) {
                continue;
            }

            if (property instanceof UIResolvableProperty && !property.isResolved()) {
                continue;
            }

            const value = property.getValue();
            if (value !== undefined && value !== null) {
                return value as UIPropertyValue<NonNullable<P[K]>>;
            }
        }

        throw new Error(`No value found for UI properties: ${keys.join(', ')}`);
    }

    public getProperty<K extends keyof P>(key: K): NonNullable<P[K]> {
        return this.properties[key];
    }

    /**
     * Animates a numeric property from its current value, see {@link UIAnimationController}.
     *
     * The element must have been laid out once to animate a `px`/`%` property.
     *
     * @param target - Target value: a number, or a `px`/`%` unit for a `px`/`%` property, where
     *   numbers are pixels.
     */
    public animate<K extends keyof P & string>(
        property: K,
        target: UIAnimationTarget<NonNullable<P[K]>>,
        options: UIAnimationOptions,
    ): void {
        this.animationController.animate(property, target, options);
    }

    /** Stops the animation of a property where it is, see {@link UIAnimationController.cancel}. */
    public cancelAnimation<K extends keyof P & string>(property: K): void {
        this.animationController.cancel(property);
    }

    /**
     * Advances the animations of this subtree. Called by the UI manager on `update`.
     *
     * @param delta - Elapsed time, in milliseconds.
     */
    public updateAnimations(delta: number): void {
        this.animationController.update(delta);

        for (const child of this.children) {
            child.updateAnimations(delta);
        }
    }

    /** Appends a child, drawn over the previous ones. */
    public addChild(child: UIElement): void {
        this.children.push(child);
        child.parent = this;
    }

    public removeChild(child: UIElement): void {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    private resolveAnimationEndpoint(property: string, endpoint: UIResolvableUnit): number {
        if (!this.layoutParentBounds) {
            throw new Error(`UI property "${property}" must be laid out before it can be animated`);
        }
        return this.propertyResolver.resolveValue(property, endpoint, this.layoutParentBounds);
    }

    private dispatchClick(x: number, y: number, inputEvent: MouseEvent): void {
        this.dispatch(
            'click',
            EventFactory.createGameEvent<GameClickEvent>({
                name: 'click',
                consumed: false,
                inputEvent,
                position: new Vector(x, y),
                target: this,
            }),
        );
    }

    private dispatchPress(name: 'press' | 'release'): void {
        this.dispatch(
            name,
            EventFactory.createGameEvent<GamePressEvent>({ name, consumed: false, target: this }),
        );
    }
}
