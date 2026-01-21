import { UIElement } from '../../ui/ui-element';
import { GameEvent } from '../event-factory';

export type GameClickEvent = GameEvent & { mouseEvent: MouseEvent; target: UIElement };

export type UIEvents = {
    focusIn: undefined;
    focusOut: undefined;
    hoverIn: undefined;
    hoverOut: undefined;
    click: CustomEvent<GameClickEvent>;
};
