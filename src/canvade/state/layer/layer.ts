import { EventHandler } from "../../core/event-handler.interface";
import { LifeCycleFunctions } from "../../core/lifecycle-functions.interface";
import { DebugUtils } from "../../debug.utils";
import { State } from "../state";

export abstract class Layer implements LifeCycleFunctions, EventHandler {
    public state: State;

    public constructor(state: State) {
        this.state = state;
    }

    public onEnter(): void {}
    public onLeave(): void {}

    public onMouseDown(_e: MouseEvent): boolean {
        DebugUtils.debug(_e);
        return true;
    }

    public onMouseUp(_e: MouseEvent): boolean {
        DebugUtils.debug(_e);
        return true;
    }

    public onMouseMove(_e: MouseEvent): boolean {
        DebugUtils.debug(_e);
        return true;
    }

    public onScroll(_e: WheelEvent): boolean {
        DebugUtils.debug(_e);
        return true;
    }

    public onMouseEnter(_e: MouseEvent): void {
        DebugUtils.debug(_e);
    }
    public onMouseOut(_e: MouseEvent): void {
        DebugUtils.debug(_e);
    }

    public onContextMenu(_e: MouseEvent): boolean {
        DebugUtils.debug(_e);
        return true;
    }

    public onVisibilityChange(): void {}

    public onKeyDown(_e: KeyboardEvent): void {
        DebugUtils.debug(_e);
    }

    public onKeyUp(_e: KeyboardEvent): void {
        DebugUtils.debug(_e);
    }

    public onKeyboardDown(_e: CustomEventInit): void {
        DebugUtils.debug(_e);
    }

    public onKeyboardUp(_e: CustomEventInit): void {
        DebugUtils.debug(_e);
    }

    public fixedUpdate() {}

    public update(_progress: number, _delta: number) {
        DebugUtils.debug(_progress);
        DebugUtils.debug(_delta);
    }

    public abstract render(ctx: CanvasRenderingContext2D): void;
}
