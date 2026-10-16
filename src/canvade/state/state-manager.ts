import { EventFactory } from '../event/event-factory';
import { State, StateClass } from './state';

/**
 * Registry of the named states of a game and stack of the active ones.
 *
 * Only the state on top of the stack (the current state) receives the game loop and input
 * events; the states below are paused until the states above them are popped.
 */
export class StateManager {
    private states: Map<string, State>;
    private stateStack: State[];

    /** Data shared between all the states, which reach it through `State.manager.shared`. */
    public readonly shared = new Map<string, unknown>();

    public constructor() {
        this.states = new Map<string, State>();
        this.stateStack = [];
    }

    /**
     * Pushes a registered state on top of the stack, making it the current state.
     *
     * The pushed state receives `enter` before the previous current state receives `leave`.
     * Unknown names are ignored. A state already in the stack can be pushed again: the same
     * instance is reused.
     */
    public push(name: string): void {
        const state = this.getState(name);

        if (state) {
            state.dispatch('enter');
            this.getCurrent()?.dispatch('leave');
            this.stateStack.push(state);
        }
    }

    /**
     * Pops the current state, which receives `leave`, then sends `enter` to the new current state.
     *
     * @returns The popped state, or `null` when the stack is empty.
     */
    public pop(): State | null | undefined {
        if (this.stateStack.length) {
            this.getCurrent()?.dispatch('leave');
            const poppedState = this.stateStack.pop();
            this.getCurrent()?.dispatch('enter');
            return poppedState;
        }

        return null;
    }

    /**
     * Instantiates a state, attaches it to this manager and registers it under a name.
     *
     * The state is created immediately, so its `initState` and `initLayers` hooks run before it
     * is attached: {@link State.manager} cannot be used from them.
     */
    public addState<T extends State>(stateClass: StateClass<T>, name: string): void {
        const state = new stateClass();
        state.attachManager(this);
        this.states.set(name, state);
    }

    public getState(name: string): State | undefined {
        return this.states.get(name);
    }

    /** Dispatches `fixedUpdate` to the current state. Called by the game loop. */
    public fixedUpdate(): void {
        if (this.stateStack.length) {
            this.getCurrent()?.dispatch('fixedUpdate');
        }
    }

    /**
     * Dispatches `update` to the current state. Called by the game loop once per frame.
     *
     * @param progress - Fraction of the next fixed update already elapsed, in [0, 1).
     * @param delta - Duration of the frame, in milliseconds.
     */
    public update(progress: number, delta: number): void {
        if (this.stateStack.length) {
            const updateEvent = EventFactory.createGameEvent({
                name: 'update',
                consumed: false,
                progress,
                delta,
            });

            this.getCurrent()?.dispatch('update', updateEvent);
        }
    }

    /** Dispatches `render` to the current state. Called by the game loop once per frame. */
    public render(ctx: CanvasRenderingContext2D): void {
        if (this.stateStack.length) {
            const renderEvent = EventFactory.createGameEvent({
                name: 'render',
                consumed: false,
                ctx,
            });

            this.getCurrent()?.dispatch('render', renderEvent);
        }
    }

    /** Returns the state on top of the stack, if any. */
    public getCurrent(): State | undefined {
        if (this.stateStack.length) {
            return this.stateStack[this.stateStack.length - 1];
        }

        return;
    }
}
