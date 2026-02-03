import { UINode } from '../../ui/ui-node';
import { GameEvent } from '../event-factory';
import { GameRenderEvent } from './game-loop-events';

export type GameClickEvent = GameEvent & {
    mouseEvent: MouseEvent;
    target: UINode;
};

export type UIEvents = {
    renderTree: CustomEvent<GameRenderEvent>;
    focusIn: undefined;
    focusOut: undefined;
    hoverIn: undefined;
    hoverOut: undefined;
    click: CustomEvent<GameClickEvent>;
};
