import { EventHandler } from "../core/event-handler.interface";
import { LifeCycleFunctions } from "../core/lifecycle-functions.interface";
import { Layer } from "./layer/layer";
import { StateManager } from "./state-manager";

export abstract class State implements LifeCycleFunctions, EventHandler {
    public manager: StateManager;
    public layers: Map<string, Layer>;
    protected layerStack: Layer[];

    public constructor(manager: StateManager) {
        this.manager = manager;

        this.layerStack = [];

        this.layers = this.initLayers();
        this.layerStack.push(...this.layers.values());
    }

    protected abstract initLayers(): Map<string, Layer>;

    public onEnter(): void {
        this.layerStack.forEach((layer) => layer.onEnter());
    }

    public onLeave(): void {
        this.layerStack.forEach((layer) => layer.onLeave());
    }

    public onMouseDown(e: MouseEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            if (!this.layerStack[i].onMouseDown(e)) {
                break;
            }
        }

        return true;
    }

    public onMouseUp(e: MouseEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            if (!this.layerStack[i].onMouseUp(e)) {
                break;
            }
        }

        return true;
    }

    public onMouseMove(e: MouseEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            if (!this.layerStack[i].onMouseMove(e)) {
                break;
            }
        }

        return true;
    }

    public onScroll(e: WheelEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            if (!this.layerStack[i].onScroll(e)) {
                break;
            }
        }

        return true;
    }

    public onMouseEnter(e: MouseEvent): void {
        this.layerStack.forEach((layer) => layer.onMouseEnter(e));
    }

    public onMouseOut(e: MouseEvent): void {
        this.layerStack.forEach((layer) => layer.onMouseOut(e));
    }

    public onContextMenu(e: MouseEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            if (!this.layerStack[i].onContextMenu(e)) {
                break;
            }
        }

        return true;
    }

    public onVisibilityChange(): void {
        this.layerStack.forEach((layer) => layer.onVisibilityChange());
    }

    public onKeyDown(e: KeyboardEvent): void {
        this.layerStack.forEach((layer) => layer.onKeyDown(e));
    }

    public onKeyUp(e: KeyboardEvent): void {
        this.layerStack.forEach((layer) => layer.onKeyUp(e));
    }

    public onKeyboardDown(e: CustomEventInit): void {
        this.layerStack.forEach((layer) => layer.onKeyboardDown(e));
    }

    public onKeyboardUp(e: CustomEventInit): void {
        this.layerStack.forEach((layer) => layer.onKeyboardUp(e));
    }

    public fixedUpdate(): void {
        this.layerStack.forEach((layer) => layer.fixedUpdate());
    }

    public update(progress: number, delta: number): void {
        this.layerStack.forEach((layer) => layer.update(progress, delta));
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        this.layerStack.forEach((layer) => layer.render(ctx));
    }
}
