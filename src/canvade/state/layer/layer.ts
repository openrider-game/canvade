import { EventEmitter } from '../../event/event-emitter';
import { DOMEvents } from '../../event/types/dom-events';
import { GameLoopEvents } from '../../event/types/game-loop-events';
import { StateEvents } from '../../event/types/state-events';
export abstract class Layer extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    constructor() {
        super();

        this.initLayer();
    }

    abstract initLayer(): void;
}
