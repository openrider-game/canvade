import { Vector } from '../core/math/vector';
import { EventEmitter } from '../event/event-emitter';
import { EventFactory } from '../event/event-factory';
import { GameClickEvent, UIEvents } from '../event/types/ui-events';
import { UIAnimationOptions } from './animation/ui-animation';
import { UIAnimationController, UIAnimationTarget } from './animation/ui-animation-controller';
import { UIInteractionState, UIInteractionStateName } from './interaction/ui-interaction-state';
import { ParentDimensionRule, ParentPositionRule } from './properties/ui-property-resolution';
import { UIPropertyResolver } from './properties/ui-property-resolver';
import {
    UIPropertyMap,
    UIPropertyValue,
    UIResolvableProperty,
    UIResolvableUnit,
    cloneUIPropertyMap,
    mergeUIPropertyMap,
} from './properties/ui-property.type';
import { UIElementTree } from './tree/ui-element-tree';

export interface UIBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type UIClickHandler = (x: number, y: number, target: UIElement) => void;

export type UIElementProperties = UIPropertyMap & {
    x?: UIResolvableProperty<UIResolvableUnit>;
    y?: UIResolvableProperty<UIResolvableUnit>;
    width?: UIResolvableProperty<UIResolvableUnit>;
    height?: UIResolvableProperty<UIResolvableUnit>;
};

const defaultElementProperties: UIElementProperties = {
    x: new UIResolvableProperty('0px', new ParentPositionRule('x', 'width')),
    y: new UIResolvableProperty('0px', new ParentPositionRule('y', 'height')),
    width: new UIResolvableProperty('100px', new ParentDimensionRule('width')),
    height: new UIResolvableProperty('100px', new ParentDimensionRule('height')),
};

export abstract class UIElement<
    P extends UIElementProperties = UIElementProperties,
> extends EventEmitter<UIEvents> {
    public children: UIElement[] = [];
    public parent: UIElement | null = null;
    public readonly data: Record<string, unknown> = {};
    public isTreeRoot = false;
    private readonly interactionState = new UIInteractionState();
    private clickHandlerId: string | null = null;
    private readonly animationController: UIAnimationController<P>;
    private readonly propertyResolver: UIPropertyResolver<P>;
    protected layoutParentBounds?: UIBounds;

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

    protected abstract renderElement(ctx: CanvasRenderingContext2D): void;

    protected renderChildren(ctx: CanvasRenderingContext2D, parentBounds: UIBounds): void {
        UIElementTree.renderChildren(this.children, ctx, parentBounds);
    }

    public resolveLayout(parentBounds: UIBounds): void {
        this.layoutParentBounds = parentBounds;
        this.propertyResolver.resolve(parentBounds);
        this.animationController.update(0);
    }

    public getBounds(): UIBounds {
        return {
            x: this.v('x'),
            y: this.v('y'),
            width: this.v('width'),
            height: this.v('height'),
        };
    }

    public contains(px: number, py: number): boolean {
        return (
            px >= this.v('x') &&
            px <= this.v('x') + this.v('width') &&
            py >= this.v('y') &&
            py <= this.v('y') + this.v('height')
        );
    }

    public findElementAt(x: number, y: number): UIElement | null {
        return UIElementTree.findElementAt(this, x, y);
    }

    public setHoveredElement(target: UIElement | null): void {
        UIElementTree.updateInteraction(this, target, 'hovered');
    }

    public setFocusedElement(target: UIElement | null): void {
        UIElementTree.updateInteraction(this, target, 'focused');
    }

    public setActiveElement(target: UIElement | null): void {
        UIElementTree.updateInteraction(this, target, 'active');
    }

    public isHovered(): boolean {
        return this.interactionState.isHovered();
    }

    public isFocused(): boolean {
        return this.interactionState.isFocused();
    }

    public isActive(): boolean {
        return this.interactionState.isActive();
    }

    public handleClick(x: number, y: number, mouseEvent: MouseEvent): boolean {
        return UIElementTree.handleClick(this, x, y, (target) =>
            target.dispatchClick(x, y, mouseEvent),
        );
    }

    public updateInteractionState(state: UIInteractionStateName, value: boolean): void {
        const event = this.interactionState.update(state, value);
        if (event) {
            this.dispatch(event);
        }
    }

    public onClick(handler: UIClickHandler): void {
        if (this.clickHandlerId) {
            this.unsubscribe('click', this.clickHandlerId);
        }
        this.clickHandlerId = this.subscribe('click', (event) => {
            handler(event.detail.position.x, event.detail.position.y, event.detail.target);
        });
    }

    public removeClickHandler(): void {
        if (this.clickHandlerId) {
            this.unsubscribe('click', this.clickHandlerId);
            this.clickHandlerId = null;
        }
    }

    public p<K extends keyof P>(key: K): NonNullable<P[K]> {
        return this.getProperty(key);
    }

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

    public animate<K extends keyof P & string>(
        property: K,
        target: UIAnimationTarget<NonNullable<P[K]>>,
        options: UIAnimationOptions,
    ): void {
        this.animationController.animate(property, target, options);
    }

    public cancelAnimation<K extends keyof P & string>(property: K): void {
        this.animationController.cancel(property);
    }

    public updateAnimations(delta: number): void {
        this.animationController.update(delta);

        for (const child of this.children) {
            child.updateAnimations(delta);
        }
    }

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

    private dispatchClick(x: number, y: number, mouseEvent: MouseEvent): void {
        this.dispatch(
            'click',
            EventFactory.createGameEvent<GameClickEvent>({
                name: 'click',
                consumed: false,
                mouseEvent,
                position: new Vector(x, y),
                target: this,
            }),
        );
    }
}
