import { EventEmitter } from '../../event/event-emitter';
import { DOMEvents, GameLoopEvents, StateEvents } from '../../event/event-factory';
export abstract class Layer extends EventEmitter<DOMEvents & StateEvents & GameLoopEvents> {
    constructor() {
        super();

        this.initLayer();
    }

    abstract initLayer(): void;
}
