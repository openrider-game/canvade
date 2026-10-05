import { EventEmitter } from '../event/event-emitter';
import { GameEvent } from '../event/event-factory';
import {
    DOMEvents,
    GameKeyboardEvent,
    GameMouseEvent,
    GameWheelEvent,
} from '../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent, GameUpdateEvent } from '../event/types/game-loop-events';
import { StateEvents } from '../event/types/state-events';
import { World } from '../world/world';
import { Layer } from './layer/layer';

export type StateClass<T extends State> = new () => T;

export abstract class State extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    public layers: Map<string, Layer>;
    protected layerStack: Layer[];

    private world?: World;

    public constructor() {
        super();

        this.layerStack = [];

        this.defaultInit();
        this.initState();

        this.layers = this.initLayers();
        this.layerStack.push(...this.layers.values());
    }

    private defaultInit(): void {
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
        this.subscribe('fixedUpdate', this.onFixedUpdate);
        this.subscribe('update', this.onUpdate);
        this.subscribe('render', this.onRender);
    }

    protected abstract initState(): void;
    protected abstract initLayers(): Map<string, Layer>;

    public setWorld(world: World): void {
        this.world = world;
    }

    public getWorld(): World | undefined {
        return this.world;
    }

    protected onEnter(): void {
        this.layerStack.forEach((layer) => layer.dispatch('enter'));
    }

    protected onLeave(): void {
        this.layerStack.forEach((layer) => layer.dispatch('leave'));
    }

    protected onMouseDown(e: CustomEvent<GameMouseEvent>) {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('mouseDown', e));
    }

    protected onMouseUp(e: CustomEvent<GameMouseEvent>) {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('mouseUp', e));
    }

    protected onMouseMove(e: CustomEvent<GameMouseEvent>) {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('mouseMove', e));
    }

    protected onScroll(e: CustomEvent<GameWheelEvent>) {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('scroll', e));
    }

    protected onMouseEnter(e: CustomEvent<GameMouseEvent>): void {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('mouseEnter', e));
    }

    protected onMouseOut(e: CustomEvent<GameMouseEvent>): void {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('mouseOut', e));
    }

    protected onContextMenu(e: CustomEvent<GameMouseEvent>) {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('contextMenu', e));
    }

    protected onVisibilityChange(): void {
        this.layerStack.forEach((layer) => layer.dispatch('visibilityChange'));
    }

    protected onKeyDown(e: CustomEvent<GameKeyboardEvent>): void {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('keyDown', e));
    }

    protected onKeyUp(e: CustomEvent<GameKeyboardEvent>): void {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('keyUp', e));
    }

    protected onKeyboardDown(e: CustomEvent<GameKeyboardEvent>): void {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('keyboardDown', e));
    }

    protected onKeyboardUp(e: CustomEvent<GameKeyboardEvent>): void {
        this.dispatchInputToLayers(e, (layer) => layer.dispatch('keyboardUp', e));
    }

    private onFixedUpdate(): void {
        this.layerStack.forEach((layer) => layer.dispatch('fixedUpdate'));
    }

    private onUpdate(e: CustomEvent<GameUpdateEvent>): void {
        this.layerStack.forEach((layer) => layer.dispatch('update', e));
    }

    private onRender(e: CustomEvent<GameRenderEvent>): void {
        const ctx = e.detail.ctx;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        this.layerStack.forEach((layer) => layer.dispatch('render', e));
    }

    private dispatchInputToLayers(
        event: CustomEvent<GameEvent>,
        dispatch: (layer: Layer) => void,
    ): void {
        for (let i = this.layerStack.length - 1; i >= 0 && !event.detail.consumed; i--) {
            dispatch(this.layerStack[i]);
        }
    }
}
