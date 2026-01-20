import { EventEmitter } from '../event/event-emitter';
import { DOMEvents, GameLoopEvents, GameMouseEvent } from '../event/event-factory';
import { Mouse } from '../event/mouse/mouse';

type UIEvents = {
    focusIn: undefined;
    focusOut: undefined;
    hoverIn: undefined;
    hoverOut: undefined;
    click: undefined;
};

export abstract class UIElement extends EventEmitter<DOMEvents & GameLoopEvents & UIEvents> {
    protected focused: boolean = false;
    protected hovered: boolean = false;

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

    private focus(on: boolean): void {
        this.childrenElements.forEach((childElement) => childElement.focus(on));

        if (this.focused === on) return;

        this.focused = on;

        if (on) {
            this.dispatch('focusIn');
        } else {
            this.dispatch('focusOut');
        }
    }

    private hover(on: boolean) {
        this.childrenElements.forEach((childElement) => childElement.hover(on));

        if (this.hovered === on) return;

        this.hovered = on;

        if (on) {
            this.dispatch('hoverIn');
        } else {
            this.dispatch('hoverOut');
        }
    }

    private onMouseDown(e: CustomEvent<GameMouseEvent>) {
        for (const childElement of this.childrenElements) {
            childElement.dispatch('mouseDown', e);

            if (e.detail.consumed) {
                return;
            }
        }

        if (e.detail.consumed) {
            this.focus(false);
            this.hover(false);

            return;
        }

        const intersects = this.intersects();

        if (e.detail.mouseEvent.button === 0 && intersects) {
            e.detail.consumed = true;
            this.focus(true);
        }
    }

    public onMouseUp(e: CustomEvent<GameMouseEvent>) {
        for (const childElement of this.childrenElements) {
            childElement.dispatch('mouseUp', e);

            if (e.detail.consumed) {
                return;
            }
        }

        if (e.detail.consumed) {
            return;
        }

        const intersects = this.intersects();

        if (intersects && this.focused) {
            e.detail.consumed = true;
            this.focus(false);

            this.dispatch('click');
        }
    }

    public onMouseMove(e: CustomEvent<GameMouseEvent>) {
        for (const childElement of this.childrenElements) {
            childElement.dispatch('mouseMove', e);

            if (e.detail.consumed) {
                return;
            }
        }

        if (e.detail.consumed) {
            this.focus(false);
            this.hover(false);

            return;
        }

        const intersects = this.intersects();
        this.hover(intersects);

        if (!intersects && this.focused) {
            this.focus(false);
        }

        if (intersects) {
            e.detail.consumed = true;
        }
    }

    public onMouseOut(e: CustomEvent<GameMouseEvent>): void {
        this.childrenElements.forEach((childElement) => childElement.dispatch('mouseOut', e));

        this.focus(false);
        this.hover(false);
    }
}
