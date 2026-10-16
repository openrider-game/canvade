import { Vector } from '../../core/math/vector';
import { UIElement } from '../../ui/ui-element';
import { GameEvent } from '../event-factory';
import { GameRenderEvent } from './game-loop-events';

/** Payload of the `click` event of a UI element, `position` being in canvas pixels. */
export type GameClickEvent = GameEvent & {
    mouseEvent: MouseEvent;
    position: Vector;
    target: UIElement;
};

/** Payload of the `change` and `submit` events of an input, with its current value. */
export type GameValueEvent = GameEvent & {
    value: string;
    target: UIElement;
};

/**
 * Events of a {@link UIElement}.
 *
 * `renderTree` is dispatched once the element and its children are rendered. The hover and
 * focus events are dispatched when the state changes, and `click` when the mouse is pressed
 * and released over the element. Inputs dispatch `change` when their value is edited and
 * `submit` when Enter is pressed.
 */
export type UIEvents = {
    renderTree: CustomEvent<GameRenderEvent>;
    focusIn: undefined;
    focusOut: undefined;
    hoverIn: undefined;
    hoverOut: undefined;
    click: CustomEvent<GameClickEvent>;
    change: CustomEvent<GameValueEvent>;
    submit: CustomEvent<GameValueEvent>;
};
