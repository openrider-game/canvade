import { LifeCycleFunctions } from '../../core/lifecycle-functions.interface';
import { DebugUtils } from '../../debug.utils';
import { EventEmitter } from '../../event/event-emitter';
import { State } from '../state';

type LayerEvents = {
    enter: undefined;
    leave: undefined;
    mouseDown: MouseEvent;
    mouseUp: MouseEvent;
    mouseMove: MouseEvent;
    scroll: WheelEvent;
    mouseEnter: MouseEvent;
    mouseOut: MouseEvent;
    contextMenu: MouseEvent;
    visibilityChange: undefined;
    keyDown: KeyboardEvent;
    keyUp: KeyboardEvent;
};

export abstract class Layer extends EventEmitter<LayerEvents> implements LifeCycleFunctions {
    public state: State;

    public targeted: boolean = false;

    public constructor(state: State) {
        super();

        this.state = state;

        this.subscribe('enter', this.onEnter);
        this.subscribe('leave', this.onLeave);
        this.subscribe('mouseDown', this.onMouseDown);
        this.subscribe('mouseUp', this.onMouseUp);
        this.subscribe('mouseMove', this.onMouseMove);
        this.subscribe('scroll', this.onScroll);
        this.subscribe('mouseEnter', this.onMouseEnter);
        this.subscribe('mouseOut', this.onMouseOut);
        this.subscribe('contextMenu', this.onContextMenu);
        this.subscribe('visibilityChange', this.onVisibilityChange);
        this.subscribe('keyDown', this.onKeyDown);
        this.subscribe('keyUp', this.onKeyUp);
    }

    private onEnter(): void {}
    private onLeave(): void {}

    private onMouseDown(e: MouseEvent): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    private onMouseUp(e: MouseEvent): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    private onMouseMove(e: MouseEvent): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    private onScroll(e: WheelEvent): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    private onMouseEnter(e: MouseEvent): void {
        DebugUtils.trace(e);
    }
    private onMouseOut(e: MouseEvent): void {
        DebugUtils.trace(e);
    }

    private onContextMenu(e: MouseEvent): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    private onVisibilityChange(): void {}

    private onKeyDown(e: KeyboardEvent): void {
        DebugUtils.trace(e);
    }

    private onKeyUp(e: KeyboardEvent): void {
        DebugUtils.trace(e);
    }

    private onKeyboardDown(e: CustomEventInit<string>): void {
        DebugUtils.trace(e);
    }

    private onKeyboardUp(e: CustomEventInit<string>): void {
        DebugUtils.trace(e);
    }

    public fixedUpdate() {}

    public update(progress: number, delta: number) {
        DebugUtils.trace(progress);
        DebugUtils.trace(delta);
    }

    public abstract render(ctx: CanvasRenderingContext2D): void;
}
