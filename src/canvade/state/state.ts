import { LifeCycleFunctions } from '../core/lifecycle-functions.interface';
import { EventEmitter } from '../event/event-emitter';
import { Layer } from './layer/layer';
import { StateManager } from './state-manager';

export type StateClass<T extends State> = new (manager: StateManager) => T;

type StateEvents = {
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

export abstract class State extends EventEmitter<StateEvents> implements LifeCycleFunctions {
    public manager: StateManager;
    public layers: Map<string, Layer>;
    protected layerStack: Layer[];

    public constructor(manager: StateManager) {
        super();

        this.manager = manager;

        this.layerStack = [];

        this.layers = this.initLayers();
        this.layerStack.push(...this.layers.values());

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

    protected abstract initLayers(): Map<string, Layer>;

    private onEnter(): void {
        this.layerStack.forEach((layer) => layer.dispatch('enter'));
    }

    private onLeave(): void {
        this.layerStack.forEach((layer) => layer.dispatch('leave'));
    }

    private onMouseDown(e: MouseEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            this.layerStack[i].targeted = false;

            this.layerStack[i].dispatch('mouseDown', e);

            if (this.layerStack[i].targeted) {
                break;
            }
        }

        return true;
    }

    private onMouseUp(e: MouseEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            this.layerStack[i].targeted = false;

            this.layerStack[i].dispatch('mouseUp', e);

            if (this.layerStack[i].targeted) {
                break;
            }
        }

        return true;
    }

    private onMouseMove(e: MouseEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            this.layerStack[i].targeted = false;

            this.layerStack[i].dispatch('mouseMove', e);

            if (this.layerStack[i].targeted) {
                break;
            }
        }

        return true;
    }

    private onScroll(e: WheelEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            this.layerStack[i].targeted = false;

            this.layerStack[i].dispatch('scroll', e);

            if (this.layerStack[i].targeted) {
                break;
            }
        }

        return true;
    }

    private onMouseEnter(e: MouseEvent): void {
        this.layerStack.forEach((layer) => layer.dispatch('mouseEnter', e));
    }

    private onMouseOut(e: MouseEvent): void {
        this.layerStack.forEach((layer) => layer.dispatch('mouseOut', e));
    }

    private onContextMenu(e: MouseEvent): boolean {
        for (let i = this.layerStack.length - 1; i >= 0; i--) {
            this.layerStack[i].targeted = false;

            this.layerStack[i].dispatch('contextMenu', e);

            if (this.layerStack[i].targeted) {
                break;
            }
        }

        return true;
    }

    private onVisibilityChange(): void {
        this.layerStack.forEach((layer) => layer.dispatch('visibilityChange'));
    }

    private onKeyDown(e: KeyboardEvent): void {
        this.layerStack.forEach((layer) => layer.dispatch('keyDown', e));
    }

    private onKeyUp(e: KeyboardEvent): void {
        this.layerStack.forEach((layer) => layer.dispatch('keyUp', e));
    }

    // private onKeyboardDown(e: CustomEventInit<string>): void {
    // this.layerStack.forEach((layer) => layer.dispatch('keyboardDown', (e));
    // }

    // private onKeyboardUp(e: CustomEventInit<string>): void {
    // this.layerStack.forEach((layer) => layer.dispatch('keyboardUp', (e));
    // }

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
