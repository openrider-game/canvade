/**
 * Canvade, a TypeScript engine for canvas browser games.
 *
 * A {@link Game} owns the canvas and runs the game loop. It drives a {@link StateManager}, a stack
 * of {@link State | states} (screens) whose top state receives the game loop and input events.
 * Each state is made of {@link Layer | layers}, which can host a declarative canvas UI through
 * their {@link UIManager}.
 *
 * @packageDocumentation
 */
export * from './canvade/debug.utils';

export * from './canvade/game';

export * from './canvade/core/cloneable.interface';
export * from './canvade/core/display';
export * from './canvade/core/serializable.interface';

export * from './canvade/core/math/interpolation';
export * from './canvade/core/math/vector';

export * from './canvade/event/event-emitter';
export * from './canvade/event/event-factory';

export * from './canvade/event/keyboard';
export * from './canvade/event/mouse';

export * from './canvade/event/types/dom-events';
export * from './canvade/event/types/game-loop-events';
export * from './canvade/event/types/state-events';
export * from './canvade/event/types/ui-events';

export * from './canvade/state/layer/layer';
export * from './canvade/state/state';
export * from './canvade/state/state-manager';

export * from './canvade/ui/ui-element';
export * from './canvade/ui/ui-element-factory';

export * from './canvade/ui/animation';
export * from './canvade/ui/elements';
export * from './canvade/ui/interaction';
export * from './canvade/ui/properties';
export * from './canvade/ui/tree';

export * from './canvade/ui/ui-manager';
export * from './canvade/ui/ui-parser';

export * from './canvade/world/world';
export * from './canvade/world/world-vector';
