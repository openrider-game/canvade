import { EventEmitter } from '../event/event-emitter';
import { EventFactory, GameEvent } from '../event/event-factory';
import { Mouse } from '../event/mouse/mouse';
import { DOMEvents, GameMouseEvent } from '../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent } from '../event/types/game-loop-events';
import { UIEvents } from '../event/types/ui-events';
import { UIBox } from './box/ui-box';
import { UIBoxSide, UIBoxSideLeft, UIBoxSideRight } from './box/ui-box-side';
import { property, UIProperty } from './property-rules/ui-property';
import { heightRule, widthRule } from './property-rules/ui-property-rules';

export type UIElementDefinition = {
    size: string;
    boxSide: UIBoxSide;
};

export abstract class UIElement extends EventEmitter<DOMEvents & GameLoopEvents & UIEvents> {
    public readonly size: UIProperty<number>;
    private boxSide: UIBoxSide;

    public parentElement?: UIElement;
    public readonly childrenElements: UIElement[] = [];

    private box?: UIBox;

    protected hovered: boolean = false;
    protected focused: boolean = false;

    constructor(definition: UIElementDefinition = { boxSide: UIBoxSideLeft, size: '' }) {
        super();

        let sizeRule = heightRule;
        if ([UIBoxSideLeft, UIBoxSideRight].includes(definition.boxSide)) {
            sizeRule = widthRule;
        }

        this.size = property(definition.size, sizeRule);
        this.boxSide = definition.boxSide;

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

    protected computeProperties() {
        this.size.compute(this.parentElement);
    }

    private computeBox(e: CustomEvent<GameRenderEvent>): void {
        if (!this.parentElement) {
            this.box = new UIBox(0, 0, e.detail.ctx.canvas.width, e.detail.ctx.canvas.height);
            return;
        }

        if (this.parentElement.box) {
            const size = this.size();

            this.box = this.boxSide.cut(this.parentElement.box, size);
        }
    }

    private renderTree(e: CustomEvent<GameRenderEvent>): void {
        this.computeBox(e);
        this.render(e);

        this.childrenElements.forEach((childElement) => childElement.computeProperties());
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

    protected consumeEvent(e: CustomEvent<GameEvent>) {
        e.detail.consumed = true;
    }

    private setHover(on: boolean) {
        if (this.hovered === on) return;

        this.hovered = on;

        if (on) {
            this.dispatch('hoverIn');
        } else {
            this.dispatch('hoverOut');
        }
    }

    private setFocus(on: boolean): void {
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
            this.consumeEvent(e);
            this.setFocus(true);
        }
    }

    private onMouseUp(e: CustomEvent<GameMouseEvent>) {
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
            this.consumeEvent(e);

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

    private onMouseMove(e: CustomEvent<GameMouseEvent>) {
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
            this.consumeEvent(e);
        }
    }

    private onMouseOut(e: CustomEvent<GameMouseEvent>): void {
        for (let i = this.childrenElements.length - 1; i >= 0; i--) {
            this.childrenElements[i].dispatch('mouseOut', e);
        }

        this.setFocus(false);
        this.setHover(false);
    }
}

export class UIContainer extends UIElement {
    protected override render(): void {
        // Containers do not render anything
    }

    protected override consumeEvent(): void {
        // Containers don't consume events by default
    }
}
