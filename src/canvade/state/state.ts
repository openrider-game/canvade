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
import type { StateManager } from './state-manager';

/** Constructor of a {@link State}, instantiated by {@link StateManager.addState}. */
export type StateClass<T extends State> = new () => T;

/**
 * A screen of the game (menu, level, editor...), made of a stack of {@link Layer | layers}.
 *
 * The state receives the game loop, input and lifecycle events from the {@link StateManager}
 * while it is the current state, and forwards them to its layers:
 * - `render` clears the canvas, then renders the layers from the first one (bottom) to the last
 *   one (top);
 * - the input events ({@link DOMEvents}) go to the layers from the top one down, and stop at the
 *   first layer that sets the `consumed` flag of the event, so an overlay can capture the input;
 * - the other events (`enter`, `leave`, `visibilityChange`, `fixedUpdate`, `update`) go to all
 *   the layers, bottom to top.
 *
 * Subclasses override the protected `on*` handlers to react to an event, calling `super` to
 * keep forwarding it to the layers.
 */
export abstract class State extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    /** Layers of the state, by name, in the order returned by {@link State.initLayers}. */
    public layers: Map<string, Layer>;
    /** Layers ordered from bottom to top. */
    protected layerStack: Layer[];

    private world?: World;
    private stateManager?: StateManager;

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

    /**
     * Initializes the state, before {@link State.initLayers}.
     *
     * Called by the base constructor, so before the field initializers of the subclass run, and
     * before the state is attached to its manager.
     */
    protected abstract initState(): void;
    /**
     * Creates the layers of the state, ordered from bottom to top.
     *
     * Called by the base constructor, after {@link State.initState}.
     */
    protected abstract initLayers(): Map<string, Layer>;

    /**
     * Sets the world of the state, used to compute the world mouse positions of `Mouse`.
     */
    public setWorld(world: World): void {
        this.world = world;
    }

    public getWorld(): World | undefined {
        return this.world;
    }

    /** Attaches the state to its manager. Called by {@link StateManager.addState}. */
    public attachManager(manager: StateManager): void {
        this.stateManager = manager;
    }

    /**
     * Manager of the state, to push or pop states and to reach the data shared between states.
     *
     * @throws When the state is not attached to a manager yet, e.g. from `initState`.
     */
    public get manager(): StateManager {
        if (!this.stateManager) {
            throw new Error('State is not attached to a state manager');
        }

        return this.stateManager;
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

    /** Dispatches an input event from the top layer down, until a layer consumes it. */
    private dispatchInputToLayers(
        event: CustomEvent<GameEvent>,
        dispatch: (layer: Layer) => void,
    ): void {
        for (let i = this.layerStack.length - 1; i >= 0 && !event.detail.consumed; i--) {
            dispatch(this.layerStack[i]);
        }
    }
}
