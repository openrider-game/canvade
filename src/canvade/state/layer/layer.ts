import { EventEmitter } from '../../event/event-emitter';
import { DOMEvents, GameMouseEvent } from '../../event/types/dom-events';
import { GameLoopEvents, GameRenderEvent } from '../../event/types/game-loop-events';
import { StateEvents } from '../../event/types/state-events';
import { UIManager } from '../../ui/ui-manager';

export abstract class Layer extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    public readonly uiRenderer = new UIManager();

    constructor() {
        super();

        this.initLayer();
        this.subscribe('render', this.forwardRenderToUI);
        this.subscribe('mouseDown', this.forwardMouseDownToUI);
        this.subscribe('mouseMove', this.forwardMouseMoveToUI);
        this.subscribe('mouseUp', this.forwardMouseUpToUI);
    }

    abstract initLayer(): void;

    private forwardRenderToUI(event: CustomEvent<GameRenderEvent>): void {
        this.uiRenderer.dispatch('render', event);
    }

    private forwardMouseUpToUI(event: CustomEvent<GameMouseEvent>): void {
        if (!event.detail.consumed) {
            this.uiRenderer.dispatch('mouseUp', event);
        }
    }

    private forwardMouseDownToUI(event: CustomEvent<GameMouseEvent>): void {
        if (!event.detail.consumed) {
            this.uiRenderer.dispatch('mouseDown', event);
        }
    }

    private forwardMouseMoveToUI(event: CustomEvent<GameMouseEvent>): void {
        if (!event.detail.consumed) {
            this.uiRenderer.dispatch('mouseMove', event);
        }
    }
}
