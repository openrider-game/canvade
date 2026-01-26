import { EventEmitter } from '../event/event-emitter';
import { EventFactory } from '../event/event-factory';
import { Mouse } from '../event/mouse/mouse';
import { DOMEvents, GameMouseEvent } from '../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent } from '../event/types/game-loop-events';
import { UIEvents } from '../event/types/ui-events';
import {
    UIElementHeightProperty,
    UIElementWidthProperty,
} from './property-types/ui-element-dimension-property';
import { UIBox } from './ui-box';
import { ComputedType, FormatMap, PropertyMap } from './ui-element-property';

export interface UIElementPropertyMap extends PropertyMap<ComputedType> {
    top?: UIElementHeightProperty;
    left?: UIElementWidthProperty;
    width?: UIElementWidthProperty;
    height?: UIElementHeightProperty;
}
export type UIElementPropertyFormatMap = FormatMap<UIElementPropertyMap>;

export abstract class UIElement extends EventEmitter<DOMEvents & GameLoopEvents & UIEvents> {
    public readonly properties: UIElementPropertyMap = {};

    private parentElement?: UIElement;
    public readonly childrenElements: UIElement[] = [];

    private box?: UIBox;

    protected hovered: boolean = false;
    protected focused: boolean = false;

    constructor(propertyDefinitions: UIElementPropertyFormatMap = {}) {
        super();

        this.properties.top = new UIElementHeightProperty(propertyDefinitions.top || '0px');
        this.properties.left = new UIElementWidthProperty(propertyDefinitions.left || '0px');
        this.properties.width = new UIElementWidthProperty(propertyDefinitions.width || '0px');
        this.properties.height = new UIElementHeightProperty(propertyDefinitions.height || '0px');

        this.defaultInit();
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
            const width = parseInt(this.properties.width?.displayValue || '0');
            const height = parseInt(this.properties.height?.displayValue || '0');

            this.box = new UIBox(0, 0, width, height);
            return;
        }

        const minX = this.properties.left?.getComputedValue(this.parentElement) || 0;
        const minY = this.properties.top?.getComputedValue(this.parentElement) || 0;
        const maxX = (this.properties.width?.getComputedValue(this.parentElement) || 0) + minX;
        const maxY = (this.properties.height?.getComputedValue(this.parentElement) || 0) + minY;

        this.box = new UIBox(minX, minY, maxX, maxY);
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
