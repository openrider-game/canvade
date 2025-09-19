import { EventHandler } from '../../core/event-handler.interface';
import { LifeCycleFunctions } from '../../core/lifecycle-functions.interface';
import { DebugUtils } from '../../debug.utils';
import { State } from '../state';

export abstract class Layer implements LifeCycleFunctions, EventHandler {
    public state: State;

    public constructor(state: State) {
        this.state = state;
    }

    public onEnter(): void {}
    public onLeave(): void {}

    public onMouseDown(e: MouseEvent): boolean {
        DebugUtils.trace(e);
        return true;
    }

    public onMouseUp(e: MouseEvent): boolean {
        DebugUtils.trace(e);
        return true;
    }

    public onMouseMove(e: MouseEvent): boolean {
        DebugUtils.trace(e);
        return true;
    }

    public onScroll(e: WheelEvent): boolean {
        DebugUtils.trace(e);
        return true;
    }

    public onMouseEnter(e: MouseEvent): void {
        DebugUtils.trace(e);
    }
    public onMouseOut(e: MouseEvent): void {
        DebugUtils.trace(e);
    }

    public onContextMenu(e: MouseEvent): boolean {
        DebugUtils.trace(e);
        return true;
    }

    public onVisibilityChange(): void {}

    public onKeyDown(e: KeyboardEvent): void {
        DebugUtils.trace(e);
    }

    public onKeyUp(e: KeyboardEvent): void {
        DebugUtils.trace(e);
    }

    public onKeyboardDown(e: CustomEventInit<string>): void {
        DebugUtils.trace(e);
    }

    public onKeyboardUp(e: CustomEventInit<string>): void {
        DebugUtils.trace(e);
    }

    public fixedUpdate() {}

    public update(progress: number, delta: number) {
        DebugUtils.trace(progress);
        DebugUtils.trace(delta);
    }

    public abstract render(ctx: CanvasRenderingContext2D): void;
}
