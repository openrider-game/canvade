import { EventEmitter } from '../../event/event-emitter';
import { DOMEvents, GameMouseEvent } from '../../event/types/dom-events';
import {
    GameLoopEvents,
    GameRenderEvent,
    GameUpdateEvent,
} from '../../event/types/game-loop-events';
import { StateEvents } from '../../event/types/state-events';
import { UIManager } from '../../ui/ui-manager';

export abstract class Layer extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    public readonly uiRenderer = new UIManager();

    constructor() {
        super();

        this.initLayer();
        this.subscribe('update', this.updateUI);
        this.subscribe('render', this.renderUI);
        this.subscribe('mouseDown', this.mouseDownUI);
        this.subscribe('mouseMove', this.mouseMoveUI);
        this.subscribe('mouseUp', this.mouseUpUI);
    }

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
}
