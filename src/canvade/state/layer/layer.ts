import { LifeCycleFunctions } from '../../core/lifecycle-functions.interface';
import { DebugUtils } from '../../debug.utils';
import { EventEmitter } from '../../event/event-emitter';
import { GameKeyboardEvent, GameMouseEvent } from '../../event/event-factory';
import { State } from '../state';

type LayerEvents = {
    enter: undefined;
    leave: undefined;
    mouseDown: CustomEvent<GameMouseEvent>;
    mouseUp: CustomEvent<GameMouseEvent>;
    mouseMove: CustomEvent<GameMouseEvent>;
    scroll: WheelEvent;
    mouseEnter: CustomEvent<GameMouseEvent>;
    mouseOut: CustomEvent<GameMouseEvent>;
    contextMenu: CustomEvent<GameMouseEvent>;
    visibilityChange: undefined;
    keyDown: CustomEvent<GameKeyboardEvent>;
    keyUp: CustomEvent<GameKeyboardEvent>;
    keyboardDown: CustomEvent<GameKeyboardEvent>;
    keyboardUp: CustomEvent<GameKeyboardEvent>;
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
        this.subscribe('keyboardDown', this.onKeyboardDown);
        this.subscribe('keyboardUp', this.onKeyboardUp);
    }

    protected onEnter(): void {}
    protected onLeave(): void {}

    protected onMouseDown(e: CustomEvent<GameMouseEvent>): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    protected onMouseUp(e: CustomEvent<GameMouseEvent>): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    protected onMouseMove(e: CustomEvent<GameMouseEvent>): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    protected onScroll(e: WheelEvent): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    protected onMouseEnter(e: CustomEvent<GameMouseEvent>): void {
        DebugUtils.trace(e);
    }
    protected onMouseOut(e: CustomEvent<GameMouseEvent>): void {
        DebugUtils.trace(e);
    }

    protected onContextMenu(e: CustomEvent<GameMouseEvent>): boolean {
        DebugUtils.trace(e);
        this.targeted = true;
        return true;
    }

    protected onVisibilityChange(): void {}

    protected onKeyDown(e: CustomEvent<GameKeyboardEvent>): void {
        DebugUtils.trace(e);
    }

    protected onKeyUp(e: CustomEvent<GameKeyboardEvent>): void {
        DebugUtils.trace(e);
    }

    protected onKeyboardDown(e: CustomEvent<GameKeyboardEvent>): void {
        DebugUtils.trace(e);
    }

    protected onKeyboardUp(e: CustomEvent<GameKeyboardEvent>): void {
        DebugUtils.trace(e);
    }

    public fixedUpdate() {}

    public update(progress: number, delta: number) {
        DebugUtils.trace(progress, delta);
    }

    public abstract render(ctx: CanvasRenderingContext2D): void;
}
