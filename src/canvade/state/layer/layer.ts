import { EventEmitter } from '../../event/event-emitter';
import {
    GameKeyboardEvent,
    GameMouseEvent,
    GameRenderEvent,
    GameUpdateEvent,
    GameWheelEvent,
} from '../../event/event-factory';

type LayerEvents = {
    enter: undefined;
    leave: undefined;
    mouseDown: CustomEvent<GameMouseEvent>;
    mouseUp: CustomEvent<GameMouseEvent>;
    mouseMove: CustomEvent<GameMouseEvent>;
    scroll: CustomEvent<GameWheelEvent>;
    mouseEnter: CustomEvent<GameMouseEvent>;
    mouseOut: CustomEvent<GameMouseEvent>;
    contextMenu: CustomEvent<GameMouseEvent>;
    visibilityChange: undefined;
    keyDown: CustomEvent<GameKeyboardEvent>;
    keyUp: CustomEvent<GameKeyboardEvent>;
    keyboardDown: CustomEvent<GameKeyboardEvent>;
    keyboardUp: CustomEvent<GameKeyboardEvent>;
    fixedUpdate: undefined;
    update: CustomEvent<GameUpdateEvent>;
    render: CustomEvent<GameRenderEvent>;
};

export abstract class Layer extends EventEmitter<LayerEvents> {
    constructor() {
        super();

        this.initLayer();
    }

    abstract initLayer(): void;
}
