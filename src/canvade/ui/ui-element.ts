import { EventEmitter } from '../event/event-emitter';
import { EventFactory } from '../event/event-factory';
import { Mouse } from '../event/mouse/mouse';
import { DOMEvents, GameMouseEvent } from '../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent } from '../event/types/game-loop-events';
import { UIEvents } from '../event/types/ui-events';
import { UIBox } from './box/ui-box';
import {
    UIBoxAnchor,
    UIBoxAnchorBottomLeft,
    UIBoxAnchorBottomRight,
    UIBoxAnchorTopLeft,
    UIBoxAnchorTopRight,
} from './box/ui-box-anchor';
import { property, UIProperty } from './property-rules/ui-property';
import { heightRule, widthRule } from './property-rules/ui-property-rules';

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type UIElementDefinition = {
    width?: string;
    height?: string;
} & XOR<{ left?: string }, { right?: string }> &
    XOR<{ top?: string }, { bottom?: string }>;

export abstract class UIElement extends EventEmitter<DOMEvents & GameLoopEvents & UIEvents> {
    private anchor: UIBoxAnchor;

    public readonly verticalOffset: UIProperty<number>;
    public readonly horizontalOffset: UIProperty<number>;
    public readonly width: UIProperty<number>;
    public readonly height: UIProperty<number>;

    public parentElement?: UIElement;
    public readonly childrenElements: UIElement[] = [];

    private box?: UIBox;

    protected hovered: boolean = false;
    protected focused: boolean = false;

    constructor(definition: UIElementDefinition) {
        super();

        this.anchor = this.getAnchor(definition);

        this.verticalOffset = property(definition.top || definition.bottom, heightRule);
        this.horizontalOffset = property(definition.left || definition.right, widthRule);
        this.width = property(definition.width, widthRule);
        this.height = property(definition.height, heightRule);

        this.defaultInit();
    }

    private getAnchor(definition: UIElementDefinition): UIBoxAnchor {
        if (definition.bottom) {
            if (definition.right) {
                return UIBoxAnchorBottomRight;
            }
            return UIBoxAnchorBottomLeft;
        }
        if (definition.right) {
            return UIBoxAnchorTopRight;
        }
        return UIBoxAnchorTopLeft;
    }

    private defaultInit(): void {
        this.subscribe('mouseDown', this.onMouseDown);
        this.subscribe('mouseUp', this.onMouseUp);
        this.subscribe('mouseMove', this.onMouseMove);
        this.subscribe('mouseOut', this.onMouseOut);
        this.subscribe('render', this.renderTree);
    }

    addChildrenElements(...elements: UIElement[]): void {
        elements.forEach((element) => {
            element.parentElement = this;
            this.childrenElements.push(element);
        });
    }

    getBox(): UIBox | undefined {
        return this.box;
    }

    computeBox(): void {
        if (!this.parentElement) {
            this.box = new UIBox(0, 0, this.width(), this.height());
            return;
        }

        if (this.parentElement.box) {
            const verticalOffset = this.verticalOffset(this.parentElement);
            const horizontalOffset = this.horizontalOffset(this.parentElement);
            const width = this.width(this.parentElement);
            const height = this.height(this.parentElement);

            const anchored = this.parentElement.box.clone();

            this.anchor.vertical.cut(anchored, verticalOffset);
            this.anchor.horizontal.cut(anchored, horizontalOffset);

            const boxOfHeight = this.anchor.vertical.get(anchored, height);
            this.box = this.anchor.horizontal.get(boxOfHeight, width);
        }
    }

    private renderTree(e: CustomEvent<GameRenderEvent>): void {
        this.computeBox();
        this.render(e);

        this.childrenElements.forEach((childElement) => childElement.dispatch('render', e));
    }

    protected abstract render(e: CustomEvent<GameRenderEvent>): void;

    private intersects(): boolean {
        if (!this.box) {
            return false;
        }

        return (
            Mouse.mousePos.x > this.box.x &&
            Mouse.mousePos.y > this.box.y &&
            Mouse.mousePos.x < this.box.x + this.box.width &&
            Mouse.mousePos.y < this.box.y + this.box.height
        );
    }

    private setHover(on: boolean) {
        this.childrenElements.forEach((childElement) => childElement.setHover(on));

        if (this.hovered === on) return;

        this.hovered = on;

        if (on) {
            this.dispatch('hoverIn');
        } else {
            this.dispatch('hoverOut');
        }
    }

    private setFocus(on: boolean): void {
        this.childrenElements.forEach((childElement) => childElement.setFocus(on));

        if (this.focused === on) return;

        this.focused = on;

        if (on) {
            this.dispatch('focusIn');
        } else {
            this.dispatch('focusOut');
        }
    }

    private onMouseDown(e: CustomEvent<GameMouseEvent>) {
        for (let i = this.childrenElements.length - 1; i >= 0; i--) {
            this.childrenElements[i].dispatch('mouseDown', e);
        }

        if (e.detail.consumed) {
            this.setFocus(false);
            this.setHover(false);

            return;
        }

        const intersects = this.intersects();

        if (e.detail.mouseEvent.button === 0 && intersects) {
            e.detail.consumed = true;
            this.setFocus(true);
        }
    }

    public onMouseUp(e: CustomEvent<GameMouseEvent>) {
        for (let i = this.childrenElements.length - 1; i >= 0; i--) {
            this.childrenElements[i].dispatch('mouseUp', e);
        }

        if (e.detail.consumed) {
            this.setFocus(false);
            this.setHover(false);

            return;
        }

        const intersects = this.intersects();

        if (intersects) {
            e.detail.consumed = true;

            if (this.focused) {
                const clickEvent = EventFactory.createGameEvent({
                    name: 'click',
                    consumed: false,
                    mouseEvent: e.detail.mouseEvent,
                    target: this,
                });
                this.dispatch('click', clickEvent);
            }
        }

        if (this.focused) {
            this.setFocus(false);
        }
    }

    public onMouseMove(e: CustomEvent<GameMouseEvent>) {
        for (let i = this.childrenElements.length - 1; i >= 0; i--) {
            this.childrenElements[i].dispatch('mouseMove', e);
        }

        if (e.detail.consumed) {
            this.setHover(false);

            return;
        }

        const intersects = this.intersects();
        this.setHover(intersects);

        if (intersects) {
            e.detail.consumed = true;
        }
    }

    public onMouseOut(e: CustomEvent<GameMouseEvent>): void {
        for (let i = this.childrenElements.length - 1; i >= 0; i--) {
            this.childrenElements[i].dispatch('mouseOut', e);
        }

        this.setFocus(false);
        this.setHover(false);
    }
}

export class UIRoot extends UIElement {
    protected override render(): void {
        // The root element does not render anything itself
    }
}
