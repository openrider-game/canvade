import { Vector } from '../../core/math/vector';
import { UIElement } from '../../ui/ui-element';
import { GameEvent } from '../event-factory';
import { GameRenderEvent } from './game-loop-events';

/**
 * Payload of the `click` event of a UI element, `position` being in UI pixels, and
 * `inputEvent` the mouse or touch event releasing the element.
 */
export type GameClickEvent = GameEvent & {
    inputEvent: MouseEvent | TouchEvent;
    position: Vector;
    target: UIElement;
};

/** Payload of the `press` and `release` events of a UI element. */
export type GamePressEvent = GameEvent & { target: UIElement };

/** Payload of the `change` and `submit` events of an input, with its current value. */
export type GameValueEvent = GameEvent & {
    value: string;
    target: UIElement;
};

/** Payload of the `scroll` event of a container, with its new scroll position in pixels. */
export type GameScrollEvent = GameEvent & {
    scrollTop: number;
    target: UIElement;
};

/**
 * Events of a {@link UIElement}.
 *
 * `renderTree` is dispatched once the element and its children are rendered. The hover and
 * focus events are dispatched when the state changes, and `click` when the mouse or a touch is
 * pressed and released over the element. `press` is dispatched when the first pointer (the
 * mouse, or a finger) presses the element, and `release` when the last one leaves it: several
 * fingers can hold several elements at once, e.g. on-screen controls. Inputs dispatch `change` when their value is edited and
 * `submit` when Enter is pressed. Scrolling containers dispatch `scroll` when they scroll.
 */
export type UIEvents = {
    renderTree: CustomEvent<GameRenderEvent>;
    focusIn: undefined;
    focusOut: undefined;
    hoverIn: undefined;
    hoverOut: undefined;
    click: CustomEvent<GameClickEvent>;
    press: CustomEvent<GamePressEvent>;
    release: CustomEvent<GamePressEvent>;
    change: CustomEvent<GameValueEvent>;
    submit: CustomEvent<GameValueEvent>;
    scroll: CustomEvent<GameScrollEvent>;
};
