import { EventEmitter } from '../event/event-emitter';
import { EventFactory } from '../event/event-factory';
import { Mouse } from '../event/mouse/mouse';
import { DOMEvents, GameMouseEvent } from '../event/types/dom-events';
import { GameLoopEvents } from '../event/types/game-loop-events';
import { UIEvents } from '../event/types/ui-events';

export abstract class UIElement extends EventEmitter<DOMEvents & GameLoopEvents & UIEvents> {
    protected hovered: boolean = false;
    protected focused: boolean = false;

    public readonly childrenElements: UIElement[] = [];

    constructor(
        protected x: number = 0,
        protected y: number = 0,
        protected width: number = 0,
        protected height: number = 0,
        public readonly styleProperties: Record<string, string> = {},
    ) {
        super();

        this.defaultInit();
    }

    private defaultInit(): void {
        this.subscribe('mouseDown', this.onMouseDown);
        this.subscribe('mouseUp', this.onMouseUp);
        this.subscribe('mouseMove', this.onMouseMove);
        this.subscribe('mouseOut', this.onMouseOut);
    }

    private intersects(): boolean {
        return (
            Mouse.mousePos.x > this.x &&
            Mouse.mousePos.y > this.y &&
            Mouse.mousePos.x < this.x + this.width &&
            Mouse.mousePos.y < this.y + this.height
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
        for (const childElement of this.childrenElements) {
            childElement.dispatch('mouseDown', e);
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
        for (const childElement of this.childrenElements) {
            childElement.dispatch('mouseUp', e);
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
        for (const childElement of this.childrenElements) {
            childElement.dispatch('mouseMove', e);
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
        this.childrenElements.forEach((childElement) => childElement.dispatch('mouseOut', e));

        this.setFocus(false);
        this.setHover(false);
    }
}
