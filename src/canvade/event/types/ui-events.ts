import { Vector } from '../../core/math/vector';
import { UIElement } from '../../ui/ui-element';
import { GameEvent } from '../event-factory';
import { GameRenderEvent } from './game-loop-events';

export type GameClickEvent = GameEvent & {
    mouseEvent: MouseEvent;
    position: Vector;
    target: UIElement;
};

export type UIEvents = {
    renderTree: CustomEvent<GameRenderEvent>;
    focusIn: undefined;
    focusOut: undefined;
    hoverIn: undefined;
    hoverOut: undefined;
    click: CustomEvent<GameClickEvent>;
};
