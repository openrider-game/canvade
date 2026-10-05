import Vector from '../core/math/vector';
import { EventEmitter } from '../event/event-emitter';
import { EventFactory } from '../event/event-factory';
import { GameClickEvent, UIEvents } from '../event/types/ui-events';
import {
    UIPropertyMap,
    UIPropertyValue,
    UIResolvableProperty,
    UIResolvableUnit,
    cloneUIPropertyMap,
} from './ui-property.type';

export interface UIBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type UIClickHandler = (x: number, y: number) => void;

export type UIElementProperties = UIPropertyMap & {
    x?: UIResolvableProperty<UIResolvableUnit>;
    y?: UIResolvableProperty<UIResolvableUnit>;
    width?: UIResolvableProperty<UIResolvableUnit>;
    height?: UIResolvableProperty<UIResolvableUnit>;
};

const defaultElementProperties: UIElementProperties = {
    x: new UIResolvableProperty('0px'),
    y: new UIResolvableProperty('0px'),
    width: new UIResolvableProperty('100px'),
    height: new UIResolvableProperty('100px'),
};

export abstract class UIElement<
    P extends UIElementProperties = UIElementProperties,
> extends EventEmitter<UIEvents> {
    public children: UIElement[] = [];
    public parent: UIElement | null = null;
    public isTreeRoot = false;
    private hovered = false;
    private focused = false;
    private active = false;
    private clickHandlerId: string | null = null;

    constructor(
        public readonly type: string,
        public readonly classNames: string[] = [],
        public readonly properties: P = defaultElementProperties as P,
    ) {
        super();
        this.properties = {
            ...cloneUIPropertyMap(defaultElementProperties),
            ...cloneUIPropertyMap(properties),
        } as P;
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
        ctx.save();
        ctx.beginPath();
        ctx.rect(parentBounds.x, parentBounds.y, parentBounds.width, parentBounds.height);
        ctx.clip();
        try {
            for (const child of this.children) {
                if (child instanceof UIElement) {
                    child.render(ctx, parentBounds);
                }
            }
        } finally {
            ctx.restore();
        }
    }

    public resolveLayout(parentBounds: UIBounds): void {
        this.p('x').setValue(parentBounds.x + this.p('x').getResolved(parentBounds.width));
        this.p('y').setValue(parentBounds.y + this.p('y').getResolved(parentBounds.height));
        this.p('width').setValue(this.p('width').getResolved(parentBounds.width));
        this.p('height').setValue(this.p('height').getResolved(parentBounds.height));
        this.resolveProperties(parentBounds);
    }

    protected resolveProperties(parentBounds: UIBounds): void {
        void parentBounds;
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
        if (!this.contains(x, y)) {
            return null;
        }

        for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child instanceof UIElement) {
                const match = child.findElementAt(x, y);
                if (match) {
                    return match;
                }
            }
        }

        return this.isTreeRoot ? null : this;
    }

    public setHoveredElement(target: UIElement | null): void {
        const hovered = this === target;
        if (this.hovered !== hovered) {
            this.hovered = hovered;
            this.dispatch(hovered ? 'hoverIn' : 'hoverOut');
        }

        for (const child of this.children) {
            if (child instanceof UIElement) {
                child.setHoveredElement(target);
            }
        }
    }

    public setFocusedElement(target: UIElement | null): void {
        const focused = this === target;
        if (this.focused !== focused) {
            this.focused = focused;
            this.dispatch(focused ? 'focusIn' : 'focusOut');
        }

        for (const child of this.children) {
            if (child instanceof UIElement) {
                child.setFocusedElement(target);
            }
        }
    }

    public setActiveElement(target: UIElement | null): void {
        this.active = this === target;

        for (const child of this.children) {
            if (child instanceof UIElement) {
                child.setActiveElement(target);
            }
        }
    }

    public isHovered(): boolean {
        return this.hovered;
    }

    public isFocused(): boolean {
        return this.focused;
    }

    public isActive(): boolean {
        return this.active;
    }

    public handleClick(x: number, y: number, mouseEvent: MouseEvent): boolean {
        if (!this.contains(x, y)) {
            return false;
        }

        for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child instanceof UIElement) {
                if (child.handleClick(x, y, mouseEvent)) {
                    return true;
                }
            }
        }

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
        return true;
    }

    public onClick(handler: UIClickHandler): void {
        if (this.clickHandlerId) {
            this.unsubscribe('click', this.clickHandlerId);
        }
        this.clickHandlerId = this.subscribe('click', (event) => {
            handler(event.detail.position.x, event.detail.position.y);
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
}
