import { EventEmitter } from '../../event/event-emitter';
import { DOMEvents, GameKeyboardEvent, GameMouseEvent } from '../../event/types/dom-events';
import {
    GameLoopEvents,
    GameRenderEvent,
    GameUpdateEvent,
} from '../../event/types/game-loop-events';
import { StateEvents } from '../../event/types/state-events';
import { UIManager } from '../../ui/ui-manager';

/**
 * A layer of a `State`, receiving the events forwarded by its state.
 *
 * Subclasses subscribe to the events they need in {@link Layer.initLayer}. Each layer owns a
 * {@link UIManager}, which receives `update`, `render`, `mouseDown`, `mouseMove`, `mouseUp` and
 * `keyDown` after the receivers subscribed in `initLayer`: the UI is drawn over the layer
 * content, and a receiver can set the `consumed` flag of an input event to hide it from the UI.
 * When the UI handles an input event, it consumes it, so the layers below do not receive it.
 */
export abstract class Layer extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    /** UI of the layer, set with {@link UIManager.setUI}. */
    public readonly uiRenderer = new UIManager();

    constructor() {
        super();

        this.initLayer();
        this.subscribe('update', this.updateUI);
        this.subscribe('render', this.renderUI);
        this.subscribe('mouseDown', this.mouseDownUI);
        this.subscribe('mouseMove', this.mouseMoveUI);
        this.subscribe('mouseUp', this.mouseUpUI);
        this.subscribe('keyDown', this.keyDownUI);
    }

    /**
     * Initializes the layer and subscribes to its events.
     *
     * Called by the base constructor, so before the field initializers of the subclass run.
     */
    abstract initLayer(): void;

    private renderUI(event: CustomEvent<GameRenderEvent>): void {
        this.uiRenderer.dispatch('render', event);
    }

    private updateUI(event: CustomEvent<GameUpdateEvent>): void {
        this.uiRenderer.dispatch('update', event);
    }

    private mouseUpUI(event: CustomEvent<GameMouseEvent>): void {
        if (!event.detail.consumed) {
            this.uiRenderer.dispatch('mouseUp', event);
        }
    }

    private mouseDownUI(event: CustomEvent<GameMouseEvent>): void {
        if (!event.detail.consumed) {
            this.uiRenderer.dispatch('mouseDown', event);
        }
    }

    private mouseMoveUI(event: CustomEvent<GameMouseEvent>): void {
        if (!event.detail.consumed) {
            this.uiRenderer.dispatch('mouseMove', event);
        }
    }

    private keyDownUI(event: CustomEvent<GameKeyboardEvent>): void {
        if (!event.detail.consumed) {
            this.uiRenderer.dispatch('keyDown', event);
        }
    }
}
