import { EventEmitter } from '../../event/event-emitter';
import { DOMEvents } from '../../event/types/dom-events';
import { GameLoopEvents } from '../../event/types/game-loop-events';
import { StateEvents } from '../../event/types/state-events';
import { UIManager } from '../../ui/ui-manager';

/** Events of a layer, and of its UI. */
type LayerEvents = DOMEvents & StateEvents & GameLoopEvents;

/** Input events given to the UI of a layer, unless a receiver of the layer consumed them. */
type UIInputEvent =
    | 'mouseDown'
    | 'mouseMove'
    | 'mouseUp'
    | 'touchStart'
    | 'touchMove'
    | 'touchEnd'
    | 'scroll'
    | 'keyDown'
    | 'copy'
    | 'cut'
    | 'paste';

/**
 * A layer of a `State`, receiving the events forwarded by its state.
 *
 * Subclasses subscribe to the events they need in {@link Layer.initLayer}. Each layer owns a
 * {@link UIManager}, which receives `update`, `render`, `mouseDown`, `mouseMove`, `mouseUp`,
 * `mouseOut`, the touch events, `scroll`, `keyDown`, `copy`, `cut` and `paste` after the
 * receivers subscribed in `initLayer`: the UI is drawn over the layer content, and a receiver can
 * set the `consumed` flag of an input event to hide it from the UI. When the UI handles an input
 * event, it consumes it, so the layers below do not receive it.
 */
export abstract class Layer extends EventEmitter<LayerEvents> {
    /** UI of the layer, set with {@link UIManager.setUI}. */
    public readonly uiRenderer = new UIManager();

    constructor() {
        super();

        this.initLayer();
        this.subscribe('update', (e) => this.uiRenderer.dispatch('update', e));
        this.subscribe('render', (e) => this.uiRenderer.dispatch('render', e));
        // Whether consumed or not: the mouse left the canvas for every layer
        this.subscribe('mouseOut', (e) => this.uiRenderer.dispatch('mouseOut', e));
        this.subscribe('mouseDown', (e) => this.forwardToUI('mouseDown', e));
        this.subscribe('mouseMove', (e) => this.forwardToUI('mouseMove', e));
        this.subscribe('mouseUp', (e) => this.forwardToUI('mouseUp', e));
        this.subscribe('touchStart', (e) => this.forwardToUI('touchStart', e));
        this.subscribe('touchMove', (e) => this.forwardToUI('touchMove', e));
        this.subscribe('touchEnd', (e) => this.forwardToUI('touchEnd', e));
        this.subscribe('scroll', (e) => this.forwardToUI('scroll', e));
        this.subscribe('keyDown', (e) => this.forwardToUI('keyDown', e));
        this.subscribe('copy', (e) => this.forwardToUI('copy', e));
        this.subscribe('cut', (e) => this.forwardToUI('cut', e));
        this.subscribe('paste', (e) => this.forwardToUI('paste', e));
    }

    /** Gives an input event to the UI, unless a receiver of the layer consumed it. */
    private forwardToUI<K extends UIInputEvent>(name: K, event: LayerEvents[K]): void {
        if (!event.detail.consumed) {
            this.uiRenderer.dispatch(name, event);
        }
    }

    /**
     * Initializes the layer and subscribes to its events.
     *
     * Called by the base constructor, so before the field initializers of the subclass run.
     */
    abstract initLayer(): void;
}
