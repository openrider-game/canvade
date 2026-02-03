import { EventEmitter } from '../event/event-emitter';
import { EventFactory } from '../event/event-factory';
import { Mouse } from '../event/mouse/mouse';
import { DOMEvents, GameMouseEvent } from '../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent } from '../event/types/game-loop-events';
import { UIEvents } from '../event/types/ui-events';
import { UIBox, UIOperation } from './box/ui-box';
import { UIBoxSideLeft, UIBoxSideRight } from './box/ui-box-side';
import { property, UIProperty } from './property-rules/ui-property';
import { heightRule, widthRule } from './property-rules/ui-property-rules';

export type UINodeDefinition = {
    operation: UIOperation;
    magnitude: string;
};

export abstract class UINode extends EventEmitter<DOMEvents & GameLoopEvents & UIEvents> {
    public readonly magnitude: UIProperty<number>;
    private operation: UIOperation;

    public parent?: UINode;
    public readonly children: UINode[] = [];

    private box?: UIBox;

    public consumes: boolean = false;

    protected hovered: boolean = false;
    protected focused: boolean = false;

    constructor(definition: UINodeDefinition) {
        super();

        let sizeRule = heightRule;

        if (
            'side' in definition.operation &&
            [UIBoxSideLeft, UIBoxSideRight].includes(definition.operation.side)
        ) {
            sizeRule = widthRule;
        }

        this.magnitude = property(definition.magnitude, sizeRule);
        this.operation = definition.operation;

        this.defaultInit();
    }

    private defaultInit(): void {
        this.subscribe('mouseDown', this.onMouseDown);
        this.subscribe('mouseUp', this.onMouseUp);
        this.subscribe('mouseMove', this.onMouseMove);
        this.subscribe('mouseOut', this.onMouseOut);
        this.subscribe('renderTree', this.renderTree);
    }

    addChildren(...nodes: UINode[]): void {
        nodes.forEach((node) => {
            node.parent = this;
            this.children.push(node);
        });
    }

    getBox(): UIBox | undefined {
        return this.box;
    }

    protected computeProperties() {
        this.magnitude.compute(this.parent);
    }

    private computeBox(e: CustomEvent<GameRenderEvent>): void {
        if (!this.parent) {
            this.box = new UIBox(0, 0, e.detail.ctx.canvas.width, e.detail.ctx.canvas.height);
            return;
        }

        if (this.parent.box) {
            const magnitude = this.magnitude();

            if ('side' in this.operation) {
                this.box = this.parent.box[this.operation.type](this.operation.side, magnitude);
            } else {
                this.box = this.parent.box[this.operation.type](magnitude);
            }
        }
    }

    private renderTree(e: CustomEvent<GameRenderEvent>): void {
        this.computeBox(e);
        this.dispatch('render', e);

        this.children.forEach((child) => child.computeProperties());
        this.children.forEach((child) => child.dispatch('renderTree', e));
    }

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
        for (let i = this.children.length - 1; i >= 0; i--) {
            this.children[i].dispatch('mouseDown', e);
        }

        if (e.detail.consumed) {
            this.setFocus(false);
            this.setHover(false);

            return;
        }

        const intersects = this.intersects();

        if (e.detail.mouseEvent.button === 0 && intersects && this.consumes) {
            e.detail.consumed = true;
            this.setFocus(true);
        }
    }

    private onMouseUp(e: CustomEvent<GameMouseEvent>) {
        for (let i = this.children.length - 1; i >= 0; i--) {
            this.children[i].dispatch('mouseUp', e);
        }

        if (e.detail.consumed) {
            this.setFocus(false);
            this.setHover(false);

            return;
        }

        const intersects = this.intersects();

        if (intersects && this.consumes) {
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

    private onMouseMove(e: CustomEvent<GameMouseEvent>) {
        for (let i = this.children.length - 1; i >= 0; i--) {
            this.children[i].dispatch('mouseMove', e);
        }

        if (e.detail.consumed) {
            this.setHover(false);

            return;
        }

        const intersects = this.intersects();
        this.setHover(intersects);

        if (intersects && this.consumes) {
            e.detail.consumed = true;
        }
    }

    private onMouseOut(e: CustomEvent<GameMouseEvent>): void {
        for (let i = this.children.length - 1; i >= 0; i--) {
            this.children[i].dispatch('mouseOut', e);
        }

        this.setFocus(false);
        this.setHover(false);
    }
}
